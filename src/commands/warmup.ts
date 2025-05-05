/**
 * CheckMate Warmup Command
 * Scans a repository and automatically generates draft specs for existing code patterns
 */
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'js-yaml';
import clipboardy from 'clipboardy';
import { printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { buildContext } from '../lib/context.js';
// Use @ts-ignore to avoid the analyzer import error
// @ts-ignore
import { analyzeCodebase } from '../lib/analyzer.js';
import { SpecDraft } from './draft.js';
import { execSync } from 'node:child_process';
// Use the save command functions
import { saveCommand } from './save.js';

interface WarmupOptions {
  output?: 'json' | 'yaml' | 'table';
  topFiles?: number;
  modelName?: string;
  interactive?: boolean;
  yes?: boolean;
  quiet?: boolean;
  debug?: boolean;
  cursor?: boolean; // Flag for Cursor integration
}

// Format for Cursor integration
const CM_PASS = '[CM-PASS]';
const CM_FAIL = '[CM-FAIL]';

/**
 * Warmup command handler
 * Scans a repository and generates draft specs without writing to disk
 */
export async function warmupCommand(options: WarmupOptions = {}): Promise<SpecDraft[]> {
  // Set defaults
  options.interactive = options.interactive !== false && !options.yes;
  options.output = options.output || 'yaml';
  
  // Print welcome banner if not quiet
  if (!options.quiet) {
    printBanner();
  console.log(chalk.cyan('\n🔍 Scanning repository and analyzing code patterns...'));
  }
  
  const spinner = options.quiet ? null : ora('Building repository context...').start();
  
  try {
    // Get project files
    const projectFiles = getProjectFiles();
    const contextMap: Record<string, string> = {};
    
    if (projectFiles.length === 0) {
      if (spinner) spinner.fail('No source files found in this directory');
      
      if (options.cursor) {
        console.log(`${CM_FAIL} No source files were found in this directory. Make sure you're in a code repository.`);
      } else {
        console.log(chalk.red('No source files were found in this directory.'));
        console.log(chalk.yellow('Make sure you\'re in a code repository with .js, .ts, .jsx, or .tsx files.'));
      }
      
      return [];
    }
    
    // Load file contents for the top N files
    const topN = options.topFiles || 100;
    const filesToProcess = projectFiles.slice(0, topN);
    
    if (spinner) spinner.text = `Loading content for ${filesToProcess.length} files...`;
    
    for (const file of filesToProcess) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        contextMap[file] = content;
      } catch (error) {
        // Skip files that can't be read
        if (!options.quiet) console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    if (spinner) spinner.succeed('Repository context built successfully');
    if (spinner) {
    spinner.text = 'Analyzing codebase for feature patterns...';
    spinner.start();
    }
    
    // Use the built context to analyze the codebase
    let drafts = await analyzeCodebase(contextMap);
    
    if (spinner) spinner.succeed(`Found ${drafts.length} potential feature specifications`);
    
    // If no drafts found, return empty array
    if (drafts.length === 0) {
      if (options.cursor) {
        console.log(`${CM_FAIL} No potential specifications found in this codebase.`);
      } else {
        console.log(chalk.yellow('No potential specifications found in this codebase.'));
      }
      return [];
    }
    
    // If using --yes, save all drafts immediately
    if (options.yes) {
      console.log(chalk.green(`Saving all ${drafts.length} specifications automatically...`));
      
      // Using saveCommand to save the drafts
      const saveResult = await saveCommand({
        json: JSON.stringify(drafts),
        force: true
      });
      
      if (options.cursor) {
        console.log(`${CM_PASS} Saved ${saveResult.saved} specs to checkmate/specs`);
      } else {
        console.log(chalk.green(`✅ Saved ${saveResult.saved} specs to checkmate/specs`));
      }
      
      // Copy slugs to clipboard
      const slugs = drafts.map((draft: SpecDraft) => draft.slug);
      await clipboardy.write(slugs.join('\n'));
      console.log(chalk.cyan(`📎 Copied spec list to clipboard (${slugs.length} slugs)`));
      
      return drafts;
    }
    
    // For interactive mode
    if (options.interactive) {
      return await handleInteractiveMode(drafts, options);
    }
    
    // Output in the requested format for non-interactive mode
    outputDrafts(drafts, options);
    
    return drafts;
  } catch (error: any) {
    if (spinner) spinner.fail('Error analyzing repository');
    
    if (options.cursor) {
      console.error(`${CM_FAIL} Error: ${error.message}`);
    } else {
    console.error(chalk.red(`Error: ${error.message}`));
    }
    
    throw error;
  }
}

/**
 * Handle interactive mode with TUI
 * 
 * For now, we use a simpler format for the TUI (non-interactive).
 * We'll display all specs in a table and ask the user to confirm.
 */
async function handleInteractiveMode(drafts: SpecDraft[], options: WarmupOptions): Promise<SpecDraft[]> {
  console.log(chalk.bold(`\nCheckMate Warm-up • ${drafts.length} specs detected\n`));
  
  // Display specs in a table format
  drafts.forEach((draft, index) => {
    console.log(chalk.cyan(`[${index + 1}] ${draft.title} (${draft.checks.length} checks, ${draft.files.length} files)`));
  });
  
  console.log('\n' + chalk.yellow('Interactive selection mode is not yet available in this build.'));
  console.log(chalk.yellow('Use --yes to save all specs automatically or ctrl+C to cancel.\n'));
  
  // Ask for confirmation
  console.log(chalk.cyan('Do you want to save all specs? (y/n)'));
  
  // Listen for keypress
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  return new Promise((resolve) => {
    process.stdin.once('data', async (data) => {
      const key = data.toString().toLowerCase();
      
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      if (key === 'y' || key === 'Y' || key === '\r' || key === '\n') {
        console.log(chalk.green(`\nSaving all ${drafts.length} specifications...`));
        
        // Using saveCommand to save the drafts
        const saveResult = await saveCommand({
          json: JSON.stringify(drafts),
          force: true
        });
        
        if (options.cursor) {
          console.log(`${CM_PASS} Saved ${saveResult.saved} specs to checkmate/specs`);
        } else {
          console.log(chalk.green(`✅ Saved ${saveResult.saved} specs to checkmate/specs`));
        }
        
        // Copy slugs to clipboard
        const slugs = drafts.map((draft: SpecDraft) => draft.slug);
        await clipboardy.write(slugs.join('\n'));
        console.log(chalk.cyan(`📎 Copied spec list to clipboard (${slugs.length} slugs)`));
        
        resolve(drafts);
      } else {
        if (options.cursor) {
          console.log(`${CM_FAIL} Operation cancelled. No specs were saved.`);
        } else {
          console.log(chalk.yellow('\nOperation cancelled. No specs were saved.'));
        }
        resolve([]);
      }
    });
  });
}

/**
 * Output drafts in the specified format
 */
function outputDrafts(drafts: SpecDraft[], options: WarmupOptions) {
  // Clean up drafts for output if not in debug mode
  if (!options.debug) {
    drafts = drafts.map(draft => {
      // Create a shallow copy without meta
      const { meta, ...cleanDraft } = draft as any;
      return cleanDraft as SpecDraft;
    });
  }
  
  if (options.output === 'json') {
    console.log(JSON.stringify(drafts, null, 2));
  } else if (options.output === 'yaml') {
    console.log(yaml.dump(drafts));
  } else if (options.output === 'table') {
    console.log(chalk.bold('\nProposed Specifications:'));
    console.log(chalk.dim('────────────────────────────────────────────────────────'));
    
    drafts.forEach((draft: SpecDraft, index: number) => {
      console.log(chalk.cyan(`${index + 1}. ${draft.title}`));
      console.log(chalk.dim(`   Files: ${draft.files.length} files`));
      console.log(chalk.dim(`   Checks: ${draft.checks.length}`));
      console.log(chalk.dim('────────────────────────────────────────────────────────'));
    });
  }
  
  if (options.cursor) {
    console.log(`${CM_PASS} Found ${drafts.length} potential specifications.`);
  }
  
  console.log(chalk.green('\n✨ To save these specs:'));
  console.log(chalk.white('   checkmate warmup --yes  # save all automatically'));
  console.log(chalk.white('   checkmate warmup        # pick interactively'));
}

/**
 * Get list of files in the project
 */
function getProjectFiles(): string[] {
  try {
    // Load config to get tree command
    const config = loadConfig();
    const treeCmd = config.tree_cmd || "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'";
    
    try {
    // Execute tree command
    const output = execSync(treeCmd, { encoding: 'utf8' });
    
    // Split output by lines and clean up
      const files = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.includes('node_modules'));
      
      if (files.length > 0) {
        return files;
      } else {
        // Fall back to filesystem search if no files found via git
        console.log('No files found via git, falling back to filesystem search...');
        return findFilesRecursive();
      }
    } catch (error) {
      if ((error as any).stderr?.includes('not a git repository')) {
        console.log('Not in a git repository, using filesystem search instead...');
      } else {
        console.error('Error running git command:', error);
        console.log('Falling back to filesystem search...');
      }
      return findFilesRecursive();
    }
  } catch (error) {
    console.error('Error getting project files:', error);
    console.log('Falling back to filesystem search...');
    return findFilesRecursive();
  }
}

/**
 * Fallback method to find files recursively using the filesystem
 */
function findFilesRecursive(dir = '.', fileList: string[] = []): string[] {
  try {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
      // Skip node_modules, .git, and other common non-source directories
      if (filePath.includes('node_modules') || 
          filePath.includes('.git') || 
          filePath.includes('dist') || 
          filePath.includes('build')) {
      return;
    }
    
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
      findFilesRecursive(filePath, fileList);
    } else if (/\.(ts|js|tsx|jsx)$/.test(filePath)) {
      fileList.push(filePath);
        }
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Warning: Could not access ${filePath}`);
    }
  });
  
  return fileList;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return fileList;
  }
}

/**
 * Parse command-line arguments for the warmup command
 */
export function parseWarmupArgs(args: any): WarmupOptions {
  return {
    output: args.output || 'yaml',
    topFiles: args.topFiles || 100,
    modelName: args.model,
    interactive: args.interactive !== false && !args.yes,
    yes: args.yes || false,
    quiet: args.quiet || false,
    debug: args.debug || false,
    cursor: args.cursor || false
  };
} 