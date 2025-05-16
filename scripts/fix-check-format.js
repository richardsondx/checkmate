#!/usr/bin/env node

/**
 * Script to enforce proper checkbox format in CheckMate spec files
 * Converts all checkbox formats to use:
 * - [ ] (unchecked)
 * - [🟩] (passed)
 * - [🟥] (failed)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory containing spec files
const SPEC_DIR = path.join(process.cwd(), 'checkmate', 'specs');

// Regex patterns for different checkbox formats
const CHECKBOX_PATTERN = /- \[([^\]]*)\]/g;
const PASSING_SYMBOLS = ['x', 'X', '✓', '✔', '✅', 'Y', 'y', 'yes', 'Yes', 'YES', 'TRUE', 'true', 'True'];
const FAILING_SYMBOLS = ['✖', '❌', '×', '✗', 'N', 'n', 'no', 'No', 'NO', 'FALSE', 'false', 'False'];

// Correct format symbols
const UNCHECKED = ' ';
const PASSING = '🟩';
const FAILING = '🟥';

// Stats for reporting
let stats = {
  filesScanned: 0,
  filesChanged: 0,
  checkboxesFixed: 0,
  errors: 0
};

/**
 * Find all spec files in the given directory and subdirectories
 * @param {string} dir Directory to scan
 * @param {Array} fileList Accumulator for files found
 * @returns {Array} List of spec file paths
 */
function findSpecFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findSpecFiles(filePath, fileList);
      } else if (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  } catch (error) {
    console.error(chalk.red(`Error finding spec files: ${error.message}`));
    stats.errors++;
    return fileList;
  }
}

/**
 * Fix checkbox format in a file
 * @param {string} filePath Path to the spec file
 */
function fixCheckboxFormat(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let checkboxesFixed = 0;
    
    // Replace all checkbox formats with the correct format
    content = content.replace(CHECKBOX_PATTERN, (match, symbol) => {
      const trimmedSymbol = symbol.trim();
      
      if (trimmedSymbol === UNCHECKED || 
          trimmedSymbol === PASSING || 
          trimmedSymbol === FAILING) {
        // Already in correct format
        return match;
      }
      
      checkboxesFixed++;
      
      if (PASSING_SYMBOLS.includes(trimmedSymbol)) {
        return `- [${PASSING}]`;
      } else if (FAILING_SYMBOLS.includes(trimmedSymbol)) {
        return `- [${FAILING}]`;
      } else if (trimmedSymbol === '') {
        return `- [${UNCHECKED}]`;
      } else {
        // For any other symbol, default to unchecked
        console.log(chalk.yellow(`  Unknown checkbox symbol found: [${trimmedSymbol}], converting to unchecked`));
        return `- [${UNCHECKED}]`;
      }
    });
    
    // Only write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(chalk.green(`  Fixed ${checkboxesFixed} checkboxes in ${filePath}`));
      stats.filesChanged++;
      stats.checkboxesFixed += checkboxesFixed;
    }
    
    stats.filesScanned++;
  } catch (error) {
    console.error(chalk.red(`Error fixing checkbox format in ${filePath}: ${error.message}`));
    stats.errors++;
  }
}

/**
 * Main function to run the script
 */
function main() {
  console.log(chalk.blue('Enforcing proper checkbox format in CheckMate spec files...'));
  
  // Find all spec files
  const specFiles = findSpecFiles(SPEC_DIR);
  
  if (specFiles.length === 0) {
    console.log(chalk.yellow(`No spec files found in ${SPEC_DIR}`));
    return;
  }
  
  console.log(chalk.blue(`Found ${specFiles.length} spec files.`));
  
  // Process each spec file
  specFiles.forEach(filePath => {
    fixCheckboxFormat(filePath);
  });
  
  // Report results
  console.log(chalk.blue('\nResults:'));
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files changed: ${stats.filesChanged}`);
  console.log(`  Checkboxes fixed: ${stats.checkboxesFixed}`);
  
  if (stats.errors > 0) {
    console.log(chalk.red(`  Errors encountered: ${stats.errors}`));
    process.exit(1);
  } else if (stats.filesChanged > 0) {
    console.log(chalk.green('\nAll checkboxes are now in the correct format!'));
  } else {
    console.log(chalk.green('\nAll checkboxes were already in the correct format!'));
  }
}

// Run the script
main(); 