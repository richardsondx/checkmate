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

// Mock data for a feature
const mockFeature = {
  title: "Test Feature",
  description: "This is a test feature for the gen command",
  slug: "test-feature" 
};

async function runTest() {
  try {
    // Setup test environment with our utilities
    testInfo = setupTestEnvironment(testName);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testInfo.testDir);
    
    try {
      // Import the gen module
      const genModule = await import('../../../dist/commands/gen.js');
      
      // Export validation
      assert.strictEqual(typeof genModule.genCommand, 'function', "genCommand should be exported as a function");
      
      // Test command with automatic answers enabled via TEST_ENV
      const result = await genModule.genCommand({
        name: "Auto Answer Test",
        description: "Testing --answer flag with TEST_ENV",
        answer: 'y'
      });
      
      // Verify the result
      assert.ok(result.path, "Result should contain a path property");
      assert.ok(result.content, "Result should contain a content property");
      assert.ok(fs.existsSync(result.path), "Spec file should exist at the returned path");
      
      // Read the content and verify it contains the correct title
      const specContent = fs.readFileSync(result.path, 'utf8');
      assert.ok(specContent.includes("Auto Answer Test"), "Generated spec should include the provided title");
      
      // Test generating a spec with a specific type in non-interactive mode
      const typeResult = await genModule.genCommand({
        name: "Type Test",
        description: "Testing type specifications",
        type: "regular",
        answer: 'y'
      });
      
      assert.ok(typeResult.path, "Result should contain a path property");
      assert.ok(fs.existsSync(typeResult.path), "Spec file should exist at the returned path");
      
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
    // Clean up
    cleanupTestEnvironment(testInfo.testDir);
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
}); 