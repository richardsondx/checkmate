/**
 * Config-related commands for CheckMate CLI
 */
import { printBox } from '../ui/banner.js';
import { load, save, ensureConfigExists, updateModel, setLogMode as configSetLogMode } from '../lib/config.js';
import * as cursor from '../lib/cursor.js';
import * as cursorRules from '../lib/cursorRules.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

/**
 * Check if any Cursor rule files exist
 */
export function hasCursorRuleFiles(): boolean {
  const CURSOR_RULES_DIR = '.cursor/rules';
  if (!fs.existsSync(CURSOR_RULES_DIR)) {
    return false;
  }
  
  const ruleFiles = ['pre-task.mdc', 'post-task.mdc', 'post-push.mdc'];
  return ruleFiles.some(file => fs.existsSync(path.join(CURSOR_RULES_DIR, file)));
}

/**
 * Initialize configuration
 */
export function init(): void {
  // Ensure CheckMate config exists
  ensureConfigExists();
  
  // Create checkmate folders
  const checkmateDirs = [
    'checkmate',
    'checkmate/specs',
    'checkmate/logs',
    'checkmate/cache'
  ];
  
  // Actually create the directories
  for (const dir of checkmateDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
  
  // Update .gitignore if needed
  updateGitignore();
  
  // Process Cursor config rules
  let cursorConfigMessage = '';
  
  if (cursor.hasCheckMateRules()) {
    cursorConfigMessage = 'Cursor config rules already exist and were updated.';
    
    // Update the rules
    cursor.injectCheckMateRules();
  } else {
    const result = cursor.injectCheckMateRules();
    if (result.created) {
      cursorConfigMessage = 'Created new Cursor config rules in .cursor/config.yaml.';
    } else {
      cursorConfigMessage = 'Added CheckMate rules to existing Cursor config.';
    }
  }
  
  // Generate Cursor .mdc rule files
  let cursorRulesMessage = '';
  if (hasCursorRuleFiles()) {
    // Force regeneration of rule files to ensure they have correct content
    cursorRules.generateAllRules(true);
    cursorRulesMessage = 'Updated Cursor rule files (.mdc) in .cursor/rules/';
  } else {
    cursorRules.generateAllRules(true);
    cursorRulesMessage = 'Added Cursor rule files (.mdc) in .cursor/rules/';
  }
  
  // Run the script to generate additional MDC rules
  try {
    console.log('Creating additional Cursor MDC rules...');
    const { execSync } = require('node:child_process');
    execSync('node scripts/create-cursor-mdc-rules.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error creating Cursor MDC rules:', error);
  }
  
  // Display confirmation
  printBox(`
CheckMate initialized! 

- Config file created at .checkmate
- ${cursorConfigMessage}
- ${cursorRulesMessage}
- Added checkmate/* to .gitignore
- Created directory structure for specs

Your specs will live in checkmate/specs/
  `);
}

/**
 * Ensure that checkmate directories are added to .gitignore
 */
function updateGitignore(): void {
  const gitignorePath = '.gitignore';
  const entriesToAdd = [
    'checkmate/',
    '.checkmate'
  ];
  
  let content = '';
  let existingEntries: string[] = [];
  
  // Read existing .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
    existingEntries = content.split('\n').map(line => line.trim());
  }
  
  // Check for entries to add
  let modified = false;
  for (const entry of entriesToAdd) {
    if (!existingEntries.includes(entry)) {
      content += (content && !content.endsWith('\n')) ? '\n' : '';
      content += `${entry}\n`;
      modified = true;
      console.log(`Added ${entry} to .gitignore`);
    }
  }
  
  // Only write if we modified the file
  if (modified) {
    fs.writeFileSync(gitignorePath, content, 'utf8');
  }
}

/**
 * Show current configuration
 */
export function show(): void {
  const configuration = load();
  
  // Check for API keys
  const openaiKeyStatus = configuration.openai_key ? 
    chalk.green('✅ Set') : 
    chalk.yellow('⚠️ Not set');
  
  const anthropicKeyStatus = configuration.anthropic_key ? 
    chalk.green('✅ Set') : 
    chalk.yellow('⚠️ Not set');
  
  // Format model names
  const reasonModel = configuration.models.reason;
  const quickModel = configuration.models.quick;
  
  console.log('\nCheckMate Configuration:');
  console.log('------------------------');
  console.log(`OpenAI API Key: ${openaiKeyStatus}`);
  console.log(`Anthropic API Key: ${anthropicKeyStatus}`);
  console.log(`Models:`);
  console.log(`  reason: ${reasonModel}`);
  console.log(`  quick: ${quickModel}`);
  console.log(`Log mode: ${configuration.log}`);
  console.log(`Context top N: ${configuration.context_top_n}`);
  console.log(`Show thinking: ${configuration.show_thinking ? 'true' : 'false'}`);
  
  // Provide instructions
  console.log('\nTo update configuration:');
  console.log(`  OpenAI API key: Edit .checkmate file directly`);
  console.log(`  Anthropic API key: Edit .checkmate file directly or run 'checkmate config set-anthropic-key <key>'`);
  console.log(`  Model: checkmate model set <slot> <name>`);
  console.log(`  Log mode: checkmate log <mode>`);
}

/**
 * Set model for a specific slot
 */
export function setModel(slot: 'reason' | 'quick', modelName: string): void {
  try {
    updateModel(slot, modelName);
    console.log(`Model ${chalk.cyan(slot)} set to ${chalk.green(modelName)}`);
  } catch (error) {
    console.error(`Error setting model: ${error}`);
  }
}

/**
 * Set log mode
 */
export function setLogMode(mode: 'on' | 'off' | 'optional'): void {
  try {
    configSetLogMode(mode);
    console.log(`Log mode set to ${chalk.green(mode)}`);
  } catch (error) {
    console.error(`Error setting log mode: ${error}`);
  }
}

/**
 * Set Anthropic API key
 */
export function setAnthropicKey(key: string): void {
  try {
    const configuration = load();
    configuration.anthropic_key = key;
    save(configuration);
    console.log(`Anthropic API key ${chalk.green('set successfully')}`);
  } catch (error) {
    console.error(`Error setting Anthropic API key: ${error}`);
  }
} 