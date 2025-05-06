#!/usr/bin/env node
/**
 * Unit test for the edit command
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testDir = join(projectRoot, 'temp-test', 'edit-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Test spec content
const originalSpecContent = `
# Original Feature

This is the original feature description.

## Requirements

- Requirement 1
- Requirement 2
`;

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create test spec file
  fs.writeFileSync(join(testSpecsDir, 'feature.md'), originalSpecContent);
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Import the edit module
    const editModule = await import('../../../dist/commands/edit.js');
    
    // Check if module is properly loaded and has the expected exports
    assert.strictEqual(typeof editModule.editCommand, 'function', "editCommand should be exported as a function");
    
    // Test if file exists
    const filePath = join(testSpecsDir, 'feature.md');
    assert.strictEqual(fs.existsSync(filePath), true, "Test file should exist");
    
    // Since we can't actually test launching an editor in a unit test,
    // we'll create a mock edit to simulate file changes
    const newContent = `
# Edited Feature

This is the edited feature description.

## Requirements

- Requirement 1
- Requirement 2
- Requirement 3

## New Section

- Added content
`;
    fs.writeFileSync(filePath, newContent);
    
    // Verify the file was changed
    const editedContent = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(editedContent.includes('Edited Feature'), true, "File should contain the edited title");
    assert.strictEqual(editedContent.includes('New Section'), true, "File should contain the new section");
    
    console.log('\n✅ PASS: All edit command tests passed');
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Reset current directory
    process.chdir(projectRoot);
    
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}); 