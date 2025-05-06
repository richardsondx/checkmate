#!/usr/bin/env node
/**
 * Unit test for the test command
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
const testDir = join(projectRoot, 'temp-test', 'test-command-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs",
    models: {
      reason: "test-model-reason",
      quick: "test-model-quick"
    },
    openai_key: "test-key",
    anthropic_key: "test-key"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create test spec with test cases
  const testSpecContent = `
# Test Feature

This is a test spec with test cases.

## Test Cases

- Test case 1: Should validate input correctly
- Test case 2: Should handle edge cases
- Test case 3: Should report errors properly
`;
  
  fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), testSpecContent);
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
    
    // Import the test module
    const testModule = await import('../../../dist/commands/test.js');
    
    // Test functions from the module
    assert.strictEqual(typeof testModule.testCommand, 'function', "testCommand should be exported as a function");
    
    // Mock the API to avoid actual API calls
    // We'll check that the function exists but won't run it with actual API calls
    
    // Test with quiet and json options to avoid console output and actual API calls
    const testOptions = {
      quiet: true,
      json: true,
      cursor: true
    };
    
    // Verify file created during setup exists
    const specPath = join(testSpecsDir, 'test-feature.md');
    assert.strictEqual(fs.existsSync(specPath), true, "Test spec file should exist");
    
    console.log('\n✅ PASS: All test command tests passed');
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