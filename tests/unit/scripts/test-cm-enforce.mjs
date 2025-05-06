#!/usr/bin/env node
/**
 * Unit test for the cm-enforce script
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawn } from 'child_process';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testDir = join(projectRoot, 'temp-test', 'enforce-test');
const testSpecsDir = join(testDir, 'checkmate/specs');

// Markdown test content with incomplete checkpoints
const incompleteSpecContent = `
# Test Feature

This is a test feature with incomplete checkpoints.

## Checkpoints

- [ ] Checkpoint 1
- [x] Checkpoint 2
- [ ] Checkpoint 3
`;

// Markdown test content with complete checkpoints
const completeSpecContent = `
# Test Feature

This is a test feature with complete checkpoints.

## Checkpoints

- [x] Checkpoint 1
- [x] Checkpoint 2
- [x] Checkpoint 3
`;

// Create test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Run the enforce script
function runEnforceScript(specFile, expectedExitCode) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(projectRoot, 'scripts/cm-enforce.js');
    const enforceProcess = spawn('node', [scriptPath], { 
      cwd: testDir,
      env: {
        ...process.env,
        CHECKMATE_HOME: testDir
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    enforceProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    enforceProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    enforceProcess.on('close', (code) => {
      if (code === expectedExitCode) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Expected exit code ${expectedExitCode} but got ${code}`));
      }
    });
    
    enforceProcess.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Test case 1: Failing enforcement (incomplete checkpoints)
    fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), incompleteSpecContent);
    
    try {
      await runEnforceScript('test-feature.md', 1); // Should exit with code 1 for failure
      console.log('\n✅ PASS: Enforce correctly rejected incomplete checkpoints');
    } catch (err) {
      console.error('\n❌ FAIL: Enforce should reject incomplete checkpoints:', err);
      return false;
    }
    
    // Test case 2: Passing enforcement (complete checkpoints)
    fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), completeSpecContent);
    
    try {
      await runEnforceScript('test-feature.md', 0); // Should exit with code 0 for success
      console.log('\n✅ PASS: Enforce correctly accepted complete checkpoints');
    } catch (err) {
      console.error('\n❌ FAIL: Enforce should accept complete checkpoints:', err);
      return false;
    }
    
    console.log('\n✅ PASS: All enforcement script tests passed');
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
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