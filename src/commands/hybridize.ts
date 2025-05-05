/**
 * CheckMate Hybridize Command
 * Converts a regular Markdown spec to a hybrid spec with embedded test blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { parseSpec } from '../lib/specs.js';
import { printBanner } from '../ui/banner.js';
import { addTestBlocksToMarkdown } from '../lib/hybrid-specs.js';

interface HybridizeOptions {
  spec: string;
  force?: boolean;
}

/**
 * Hybridize command handler
 */
export async function hybridizeCommand(options: HybridizeOptions): Promise<void> {
  // Print welcome banner
  printBanner();
  
  console.log(chalk.cyan(`\n🔄 Converting markdown spec to hybrid format: ${options.spec}`));
  
  // Get the spec path
  const specPath = getSpecPath(options.spec);
  
  if (!specPath) {
    console.log(chalk.red(`\n❌ Spec not found: ${options.spec}`));
    console.log(chalk.yellow(`Specs must be in the checkmate/specs directory`));
    process.exit(1);
  }
  
  // Check if it's a markdown file
  if (!specPath.endsWith('.md')) {
    console.log(chalk.red(`\n❌ Only Markdown (.md) specs can be hybridized, got: ${specPath}`));
    process.exit(1);
  }
  
  // Parse the spec to get requirements
  const spec = parseSpec(specPath);
  
  if (!spec || !spec.requirements || spec.requirements.length === 0) {
    console.log(chalk.red(`\n❌ No requirements found in spec: ${specPath}`));
    process.exit(1);
  }
  
  console.log(chalk.cyan(`\nFound ${spec.requirements.length} requirements in ${path.basename(specPath)}`));
  
  // Check if the file already has embedded tests
  const fileContent = fs.readFileSync(specPath, 'utf8');
  
  if (fileContent.includes('```checkmate') && !options.force) {
    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'This file already contains embedded tests. Do you want to add more anyway?',
      default: false
    });
    
    if (!confirm) {
      console.log(chalk.yellow(`\nOperation canceled by user.`));
      process.exit(0);
    }
  }
  
  // Add test blocks to the markdown
  const result = addTestBlocksToMarkdown(specPath, spec.requirements);
  
  if (result) {
    console.log(chalk.green(`\n✅ Successfully converted ${path.basename(specPath)} to hybrid format.`));
    console.log(chalk.yellow(`Edit the test blocks in the file to add your test code.`));
  } else {
    console.log(chalk.red(`\n❌ Failed to convert ${path.basename(specPath)} to hybrid format.`));
  }
}

/**
 * Get the full path to a spec from its name or path
 */
function getSpecPath(specNameOrPath: string): string | null {
  // If it's a full path and exists, return it
  if (fs.existsSync(specNameOrPath)) {
    return specNameOrPath;
  }
  
  // Check if it's in the specs directory
  const specsDir = 'checkmate/specs';
  
  // Try with .md extension
  const mdPath = path.join(specsDir, `${specNameOrPath}.md`);
  if (fs.existsSync(mdPath)) {
    return mdPath;
  }
  
  // Try with .yaml extension
  const yamlPath = path.join(specsDir, `${specNameOrPath}.yaml`);
  if (fs.existsSync(yamlPath)) {
    return yamlPath;
  }
  
  // Try with .yml extension
  const ymlPath = path.join(specsDir, `${specNameOrPath}.yml`);
  if (fs.existsSync(ymlPath)) {
    return ymlPath;
  }
  
  // Try with agents/ subdirectory
  const agentPath = path.join(specsDir, 'agents', `${specNameOrPath}.yaml`);
  if (fs.existsSync(agentPath)) {
    return agentPath;
  }
  
  // Try finding by exact name match
  const files = fs.readdirSync(specsDir);
  for (const file of files) {
    if (file === specNameOrPath || file.startsWith(`${specNameOrPath}.`)) {
      return path.join(specsDir, file);
    }
  }
  
  // Try finding by fuzzy name match
  for (const file of files) {
    const baseName = path.basename(file, path.extname(file));
    if (baseName === specNameOrPath || baseName.includes(specNameOrPath)) {
      return path.join(specsDir, file);
    }
  }
  
  return null;
} 