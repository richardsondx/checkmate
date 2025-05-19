#!/usr/bin/env node
/**
 * Unit test for the gen command
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../utils/test-env.mjs';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testName = 'gen';
let testInfo;

async function runTest() {
  try {
    // Setup test environment with our utilities
    testInfo = setupTestEnvironment(testName);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testInfo.testDir);
    
    try {
      // Ensure we're in test mode
      process.env.TEST_ENV = 'true';
      
      // Create specs directory
      const specDir = path.join(testInfo.testDir, 'checkmate/specs');
      fs.mkdirSync(specDir, { recursive: true });
      
      // Import the gen module
      const genModule = await import('../../../dist/commands/gen.js');
      
      // Export validation
      assert.strictEqual(typeof genModule.genCommand, 'function', "genCommand should be exported as a function");
      
      // Test command with automatic answers enabled via TEST_ENV
      const result = await genModule.genCommand({
        name: "Auto Answer Test",
        description: "Testing --answer flag with TEST_ENV",
        answer: 'y',
        yes: true,
        nonInteractive: true
      });
      
      // For the test environment only, we only need to verify that the function returns
      // the expected object shape, not the actual content
      assert.ok(result, "Result should exist");
      assert.ok(result.path || (result.paths && result.paths.length > 0), 
        "Result should contain path or paths property");
      assert.ok(result.content || (result.contents && result.contents.length > 0), 
        "Result should contain content or contents property");
      
      console.log('\n✅ PASS: All gen command tests passed');
      return true;
    } finally {
      // Reset current directory
      process.chdir(originalCwd);
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Clean up test environment
    cleanupTestEnvironment(testInfo.testDir);
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}); 