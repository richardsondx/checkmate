/**
 * Config-related commands for CheckMate CLI
 */
import { printBox } from '../ui/banner.js';
import * as config from '../lib/config.js';
import * as cursor from '../lib/cursor.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Initialize configuration
 */
export function init(): void {
  // Ensure CheckMate config exists
  config.ensureConfigExists();
  
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
  
  // Process Cursor rules
  let cursorMessage = '';
  
  if (cursor.hasCheckMateRules()) {
    cursorMessage = 'Cursor rules already exist and were updated.';
    
    // Update the rules
    cursor.injectCheckMateRules();
  } else {
    const result = cursor.injectCheckMateRules();
    if (result.created) {
      cursorMessage = 'Created new Cursor rules in .cursor/config.yaml.';
    } else {
      cursorMessage = 'Added CheckMate rules to existing Cursor config.';
    }
  }
  
  // Display confirmation
  printBox(`
CheckMate initialized! 

- Config file created at .checkmate
- ${cursorMessage}
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
  const currentConfig = config.load();
  console.log('Current configuration:');
  console.log(JSON.stringify(currentConfig, null, 2));
}

/**
 * Set model for a specific slot
 */
export function setModel(slot: 'reason' | 'quick', modelName: string): void {
  config.updateModel(slot, modelName);
  printBox(`Model for ${slot} set to ${modelName}`);
}

/**
 * Set log mode
 */
export function setLogMode(mode: 'on' | 'off' | 'optional'): void {
  config.setLogMode(mode);
  printBox(`Log mode set to ${mode}`);
} 