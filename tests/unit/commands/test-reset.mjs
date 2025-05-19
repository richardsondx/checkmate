#!/usr/bin/env node
/**
 * Unit test for the reset command
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
const testName = 'reset';
let testInfo;

// Mock data for a spec with filled checkboxes
const mockSpecContent = `# Test Feature

## Files
- src/index.ts
- src/commands/reset.ts

## Checks
- [🟩] Check 1 that should be reset
- [🟥] Check 2 that should be reset
- [ ] This check is already empty
`;

async function runTest() {
  try {
    // Setup test environment with our utilities
    testInfo = setupTestEnvironment(testName);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testInfo.testDir);
    
    try {
      // Create a test spec file with filled checkboxes
      const specDir = path.join(testInfo.testDir, 'checkmate/specs');
      fs.mkdirSync(specDir, { recursive: true });
      
      const specFile = path.join(specDir, 'test-feature.md');
      fs.writeFileSync(specFile, mockSpecContent, 'utf8');
      
      // Import the reset module
      const resetModule = await import('../../../dist/commands/reset.js');
      
      // Verify module exports
      assert.strictEqual(typeof resetModule.resetCommand, 'function', "resetCommand should be exported as a function");
      
      // Run the reset command on the test spec
      const result = await resetModule.resetCommand({
        specName: 'test-feature',
        quiet: true
      });
      
      // Verify the result
      assert.ok(result.success, "Result should indicate success");
      
      // Read the updated spec file
      const updatedContent = fs.readFileSync(specFile, 'utf8');
      
      // Verify that all checkboxes are now empty
      assert.ok(!updatedContent.includes('[🟩]'), "Green checkboxes should be reset");
      assert.ok(!updatedContent.includes('[🟥]'), "Red checkboxes should be reset");
      assert.ok(updatedContent.includes('- [ ] Check 1'), "Checkboxes should be reset to empty");
      assert.ok(updatedContent.includes('- [ ] Check 2'), "Checkboxes should be reset to empty");
      
      console.log('\n✅ PASS: All reset command tests passed');
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