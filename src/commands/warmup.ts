/**
 * CheckMate Warmup Command
 * Scans a repository and automatically generates draft specs for existing code patterns
 */
import path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { printBanner } from '../ui/banner.js';
import { load as loadConfig } from '../lib/config.js';
import { buildContext } from '../lib/context.js';
import { analyzeCodebase } from '../lib/analyzer.js';
import { SpecDraft } from './draft.js';
import { execSync } from 'node:child_process';

interface WarmupOptions {
  output?: 'json' | 'table';
  topFiles?: number;
  modelName?: string;
}

/**
 * Warmup command handler
 * Scans a repository and generates draft specs without writing to disk
 */
export async function warmupCommand(options: WarmupOptions = {}): Promise<SpecDraft[]> {
  // Print welcome banner
  printBanner();
  
  console.log(chalk.cyan('\n🔍 Scanning repository and analyzing code patterns...'));
  
  const spinner = ora('Building repository context...').start();
  
  try {
    // Get project files
    const projectFiles = getProjectFiles();
    const contextMap: Record<string, string> = {};
    
    // Load file contents for the top N files
    const topN = options.topFiles || 100;
    const filesToProcess = projectFiles.slice(0, topN);
    
    spinner.text = `Loading content for ${filesToProcess.length} files...`;
    
    for (const file of filesToProcess) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        contextMap[file] = content;
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Warning: Could not read file ${file}`);
      }
    }
    
    spinner.succeed('Repository context built successfully');
    spinner.text = 'Analyzing codebase for feature patterns...';
    spinner.start();
    
    // Use the built context to analyze the codebase
    const drafts = await analyzeCodebase(contextMap);
    
    spinner.succeed(`Found ${drafts.length} potential feature specifications`);
    
    // Output in the requested format
    if (options.output === 'json' || !options.output) {
      console.log(JSON.stringify(drafts, null, 2));
    } else if (options.output === 'table') {
      console.log(chalk.bold('\nProposed Specifications:'));
      console.log(chalk.dim('────────────────────────────────────────────────────────'));
      
      drafts.forEach((draft: SpecDraft, index: number) => {
        console.log(chalk.cyan(`${index + 1}. ${draft.title}`));
        console.log(chalk.dim(`   Files: ${draft.files.join(', ')}`));
        console.log(chalk.dim(`   Checks: ${draft.checks.length}`));
        console.log(chalk.dim('────────────────────────────────────────────────────────'));
      });
    }
    
    console.log(chalk.green('\n✨ To save these specs, pipe the output to a file or use:'));
    console.log(chalk.white('   checkmate save --json \'<json-content>\''));
    
    return drafts;
  } catch (error: any) {
    spinner.fail('Error analyzing repository');
    console.error(chalk.red(`Error: ${error.message}`));
    throw error;
  }
}

/**
 * Get list of files in the project
 */
function getProjectFiles(): string[] {
  try {
    // Load config to get tree command
    const config = loadConfig();
    const treeCmd = config.tree_cmd || "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'";
    
    // Execute tree command
    const output = execSync(treeCmd, { encoding: 'utf8' });
    
    // Split output by lines and clean up
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.includes('node_modules'));
  } catch (error) {
    console.error('Error getting project files:', error);
    return [];
  }
}

/**
 * Parse command-line arguments for the warmup command
 */
export function parseWarmupArgs(args: any): WarmupOptions {
  return {
    output: args.output || 'json',
    topFiles: args.topFiles || 100,
    modelName: args.model
  };
} 