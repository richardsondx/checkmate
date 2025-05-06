#!/usr/bin/env node
/**
 * Unit test for the spec-snapshot script
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
const testDir = join(projectRoot, 'temp-test', 'snapshot-test');
const testSpecsDir = join(testDir, 'checkmate/specs');
const snapshotDir = join(testDir, '.checkmate-snapshots');

// Markdown test content
const testSpecContent = `
# Test Feature

This is a test feature with checkpoints.

## Checkpoints

- [ ] Checkpoint 1
- [x] Checkpoint 2
- [ ] Checkpoint 3
`;

// Updated test content
const updatedSpecContent = `
# Test Feature

This is a test feature with updated checkpoints.

## Checkpoints

- [x] Checkpoint 1
- [x] Checkpoint 2
- [ ] Checkpoint 3
`;

// Create test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create test spec file
  fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), testSpecContent);
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Run the snapshot script with an action
function runSnapshotScript(action) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(projectRoot, 'scripts/spec-snapshot.js');
    const snapshotProcess = spawn('node', [scriptPath, action], { 
      cwd: testDir,
      env: {
        ...process.env,
        CHECKMATE_HOME: testDir
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    snapshotProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    snapshotProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    snapshotProcess.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    snapshotProcess.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Test case 1: Create snapshot
    const createResult = await runSnapshotScript('create');
    assert.strictEqual(createResult.code, 0, "Create snapshot should succeed");
    assert.strictEqual(fs.existsSync(snapshotDir), true, "Snapshot directory should be created");
    
    // Check if snapshot file was created
    const snapshotFiles = fs.readdirSync(snapshotDir);
    assert.strictEqual(snapshotFiles.length > 0, true, "Snapshot file should be created");
    
    // Test case 2: Verify with no changes (should pass)
    const verifyResult = await runSnapshotScript('verify');
    assert.strictEqual(verifyResult.code, 0, "Verify with no changes should pass");
    
    // Test case 3: Update spec and verify (should fail)
    fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), updatedSpecContent);
    const failVerifyResult = await runSnapshotScript('verify');
    assert.strictEqual(failVerifyResult.code !== 0, true, "Verify with changes should fail");
    
    // Test case 4: Diff should show differences
    const diffResult = await runSnapshotScript('diff');
    assert.strictEqual(diffResult.stdout.includes('Checkpoint 1'), true, "Diff should show checkpoint changes");
    
    console.log('\n✅ PASS: All spec-snapshot script tests passed');
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