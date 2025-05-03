/**
 * Spec generator command for CheckMate CLI
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import ora from 'ora';
import chalk from 'chalk';
import * as treeCommands from './tree.js';
import { printBox } from '../ui/banner.js';
import { splitFeature } from '../lib/splitter.js';
import { buildContext } from '../lib/context.js';
import { authorSpec } from '../lib/specAuthor.js';
import { load as loadConfig } from '../lib/config.js';

const execAsync = promisify(exec);

/**
 * Generate specifications from a feature description
 * This may produce multiple specs if the feature needs to be split
 */
export async function generateSpec(featureDesc: string, options?: {
  allFiles?: boolean,
  notes?: string,
  files?: string[]
}): Promise<void> {
  try {
    const config = loadConfig();
    const spinner = ora('Analyzing feature...').start();
    
    // Step 1: Split the feature into distinct features
    spinner.text = 'Splitting feature into distinct components...';
    const features = await splitFeature(featureDesc);
    
    spinner.succeed(`Identified ${features.length} feature${features.length !== 1 ? 's' : ''}:`);
    features.forEach((feature, index) => {
      console.log(`${index + 1}. ${chalk.bold(feature.title)}: ${feature.description}`);
    });
    
    // Generate specs for each feature
    const results = [];
    
    for (const feature of features) {
      spinner.start(`Building context for ${chalk.bold(feature.title)}...`);
      
      // Step 2: Build context with relevant files
      let contextFiles;
      if (options?.files && options.files.length > 0) {
        // Use provided files if available
        spinner.text = `Using ${options.files.length} provided files...`;
        contextFiles = options.files.map(file => ({ path: file, relevance: 1 }));
      } else {
        // Scan project for relevant files
        spinner.text = `Scanning project for files relevant to ${chalk.bold(feature.title)}...`;
        contextFiles = await buildContext(feature, options?.allFiles);
      }
      
      spinner.text = `Found ${contextFiles.length} relevant files`;
      
      // Step 3: Author the specification
      const thinkingSpinner = ora();
      
      if (config.show_thinking) {
        spinner.stop();
        thinkingSpinner.start(chalk.dim('<reasoning...>'));
      } else {
        spinner.text = `Generating specification for ${chalk.bold(feature.title)}...`;
      }
      
      const result = await authorSpec(feature, contextFiles, options?.notes);
      
      if (config.show_thinking) {
        thinkingSpinner.stop();
      }
      
      spinner.succeed(`${chalk.green('✓')} Created spec: ${chalk.bold(feature.title)}`);
      console.log(`  ${chalk.gray('Path:')} ${result.path}`);
      
      if (result.needsMoreContext) {
        console.log(`  ${chalk.yellow('⚠️')} This spec may benefit from more context information`);
      }
      
      results.push(result);
    }
    
    // Final summary
    printBox(`Generated ${results.length} specification${results.length !== 1 ? 's' : ''}\n` +
             `Use 'checkmate run' to verify implementation against these specs`);
    
    // Check if the user wants to edit the specs
    const shouldEdit = process.env.CHECKMATE_EDIT === '1';
    if (shouldEdit && results.length > 0) {
      await openEditor(results[0].path); // Open the first spec
    }
    
  } catch (error) {
    console.error('Error generating spec:', error);
  }
}

/**
 * Create specs from a PRD markdown file
 */
export async function generateFromPRD(prdPath: string): Promise<void> {
  try {
    if (!fs.existsSync(prdPath)) {
      console.error(`PRD file not found: ${prdPath}`);
      return;
    }
    
    const content = fs.readFileSync(prdPath, 'utf8');
    console.log(`Reading PRD from ${prdPath} (${content.length} bytes)`);
    
    // Extract feature descriptions from the PRD
    const featureMatches = content.match(/## (.*?)(?=\n## |$)/gs);
    
    if (!featureMatches || featureMatches.length === 0) {
      console.error('No features found in the PRD. Looking for "## Feature name" sections.');
      return;
    }
    
    // For each feature section, generate a spec
    for (const section of featureMatches) {
      const titleMatch = section.match(/## (.*?)(?=\n|$)/);
      if (titleMatch && titleMatch[1]) {
        // Use the section title and content as feature input
        const featureTitle = titleMatch[1].trim();
        console.log(`\nGenerating spec for feature: ${featureTitle}`);
        await generateSpec(featureTitle, { notes: section });
      }
    }
    
  } catch (error) {
    console.error('Error generating specs from PRD:', error);
  }
}

/**
 * Open a file in the user's default editor
 */
async function openEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || 'vi'; // Default to vi if no editor is specified
  
  try {
    console.log(`Opening ${filePath} with ${editor}...`);
    
    // For macOS, we use open -e for TextEdit or directly use the editor command
    if (process.platform === 'darwin' && editor === 'open') {
      await execAsync(`open -e "${filePath}"`);
    } else {
      await execAsync(`${editor} "${filePath}"`);
    }
    
    console.log('File edited successfully.');
  } catch (error) {
    console.error(`Error opening editor: ${error}`);
    console.log(`You can manually edit the file at: ${filePath}`);
  }
}

/**
 * List all spec files
 */
export function listSpecs(): void {
  const specsDir = 'checkmate/specs';
  
  if (!fs.existsSync(specsDir)) {
    console.log('No spec files found. Generate one with "checkmate gen".');
    return;
  }
  
  try {
    const specFiles = fs.readdirSync(specsDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(specsDir, file));
    
    if (specFiles.length === 0) {
      console.log('No spec files found. Generate one with "checkmate gen".');
      return;
    }
    
    console.log(`Found ${specFiles.length} spec files:`);
    specFiles.forEach(file => console.log(`- ${file}`));
  } catch (error) {
    console.error('Error listing specs:', error);
  }
} 