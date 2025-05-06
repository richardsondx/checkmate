#!/usr/bin/env node

/**
 * Test script for Cursor rule files functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

// Constants
const CURSOR_RULES_DIR = '.cursor/rules';
const RULE_FILES = ['pre-task.mdc', 'post-task.mdc', 'post-push.mdc'];

// Clean up the test directory
function cleanup() {
  console.log(chalk.yellow('Cleaning up test directory...'));
  
  if (fs.existsSync(CURSOR_RULES_DIR)) {
    for (const file of RULE_FILES) {
      const filePath = path.join(CURSOR_RULES_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  Removed ${file}`);
      }
    }
    
    // Try to remove directory if empty
    try {
      fs.rmdirSync(CURSOR_RULES_DIR);
      console.log(`  Removed ${CURSOR_RULES_DIR}`);
    } catch (error) {
      console.log(`  Note: ${CURSOR_RULES_DIR} not removed as it contains other files`);
    }
  }
}

// Test rule file generation
function testRuleFileGeneration() {
  console.log(chalk.cyan('\n=== Testing Cursor rule file generation ==='));
  
  // Clean up before test
  cleanup();
  
  console.log(chalk.yellow('\nRunning init command...'));
  execSync('NODE_OPTIONS="--loader ts-node/esm" ts-node ../../src/index.ts init', { stdio: 'inherit' });
  
  console.log(chalk.yellow('\nVerifying rule files...'));
  let success = true;
  
  // Check if all expected files exist
  for (const file of RULE_FILES) {
    const filePath = path.join(CURSOR_RULES_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(chalk.green(`  ✓ ${file} exists`));
      
      // Check file content
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('CheckMate') && content.includes('Execute:')) {
        console.log(chalk.green(`  ✓ ${file} has correct content`));
      } else {
        console.log(chalk.red(`  ✗ ${file} content is incorrect`));
        success = false;
      }
    } else {
      console.log(chalk.red(`  ✗ ${file} does not exist`));
      success = false;
    }
  }
  
  // Test idempotence
  console.log(chalk.yellow('\nTesting idempotence (running init again)...'));
  
  // Modify one file to check if it gets overwritten
  const testFile = path.join(CURSOR_RULES_DIR, RULE_FILES[0]);
  const originalContent = fs.readFileSync(testFile, 'utf8');
  const modifiedContent = originalContent + '\n- Custom user addition';
  fs.writeFileSync(testFile, modifiedContent, 'utf8');
  console.log(chalk.yellow(`  Modified ${RULE_FILES[0]} with custom content`));
  
  // Run init again
  execSync('NODE_OPTIONS="--loader ts-node/esm" ts-node ../../src/index.ts init', { stdio: 'inherit' });
  
  // Check if file was preserved
  const afterContent = fs.readFileSync(testFile, 'utf8');
  if (afterContent === modifiedContent) {
    console.log(chalk.green(`  ✓ ${RULE_FILES[0]} was preserved (idempotence works)`));
  } else {
    console.log(chalk.red(`  ✗ ${RULE_FILES[0]} was overwritten (idempotence failed)`));
    success = false;
  }
  
  return success;
}

// Run the test
try {
  const success = testRuleFileGeneration();
  
  console.log('\n=== Test summary ===');
  if (success) {
    console.log(chalk.green('All tests passed!'));
    process.exit(0);
  } else {
    console.log(chalk.red('Some tests failed. Check the log above.'));
    process.exit(1);
  }
} catch (error) {
  console.error(chalk.red('Error running tests:'), error);
  process.exit(1);
} 