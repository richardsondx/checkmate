#!/usr/bin/env node
/**
 * Unit test for the fix-check-format script
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../utils/test-env.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');
const scriptPath = join(projectRoot, 'scripts/fix-check-format.js');

// Set up test environment
const testName = 'fix-check-format';
let testInfo;

// Mock specs with various checkbox formats
const mockSpecWithIncorrectCheckboxes = `# Test Feature with Incorrect Checkboxes

## Files
- src/index.ts
- src/lib/specs.ts

## Checks
- [x] This uses incorrect x format
- [✓] This uses incorrect check mark format
- [X] This uses capital X format
- [N] This uses incorrect N format for failed checks
- [ ] This is already correctly formatted
`;

const mockSpecWithCorrectCheckboxes = `# Test Feature with Correct Checkboxes

## Files
- src/index.ts
- src/lib/specs.ts

## Checks
- [🟩] This uses correct green square format
- [🟥] This uses correct red square format
- [ ] This is an empty checkbox
`;

async function runTest() {
  try {
    // Setup test environment with our utilities
    testInfo = setupTestEnvironment(testName);
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testInfo.testDir);
    
    try {
      // Create specs directory
      const specDir = path.join(testInfo.testDir, 'checkmate/specs');
      fs.mkdirSync(specDir, { recursive: true });
      
      // Test 1: Fix incorrect checkboxes
      const incorrectSpecPath = path.join(specDir, 'incorrect-checkboxes.md');
      fs.writeFileSync(incorrectSpecPath, mockSpecWithIncorrectCheckboxes, 'utf8');
      
      // Test 2: Verify correct checkboxes remain untouched
      const correctSpecPath = path.join(specDir, 'correct-checkboxes.md');
      fs.writeFileSync(correctSpecPath, mockSpecWithCorrectCheckboxes, 'utf8');
      
      // Run the fix-check-format script
      const { stdout } = await execAsync(`node "${scriptPath}"`);
      
      // Verify output indicates files were scanned
      assert.ok(stdout.includes('Files scanned:'), "Output should include file scan count");
      
      // Read the updated spec files
      const updatedIncorrectSpec = fs.readFileSync(incorrectSpecPath, 'utf8');
      const updatedCorrectSpec = fs.readFileSync(correctSpecPath, 'utf8');
      
      // Verify the incorrect checkboxes were fixed
      assert.ok(!updatedIncorrectSpec.includes('[x]'), "Lowercase x should be converted");
      assert.ok(!updatedIncorrectSpec.includes('[X]'), "Uppercase X should be converted");
      assert.ok(!updatedIncorrectSpec.includes('[✓]'), "Check mark should be converted");
      assert.ok(!updatedIncorrectSpec.includes('[N]'), "N should be converted");
      
      // Verify they were converted to the proper format
      assert.ok(updatedIncorrectSpec.includes('[🟩]'), "Passing checks should use green square");
      assert.ok(updatedIncorrectSpec.includes('[🟥]'), "Failing checks should use red square");
      
      // Verify the already correct checkboxes remain unchanged
      assert.strictEqual(updatedCorrectSpec, mockSpecWithCorrectCheckboxes, 
        "Correctly formatted checkboxes should remain unchanged");
      
      console.log('\n✅ PASS: All fix-check-format script tests passed');
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