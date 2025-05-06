#!/usr/bin/env node
/**
 * Unit test for the cm-spec-drift script
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
const testDir = join(projectRoot, 'temp-test', 'spec-drift-test');
const testSpecsDir = join(testDir, 'checkmate/specs');

// Original spec content
const originalSpecContent = `
# Original Feature

This is the original feature description.

## Checkpoints

- [ ] Checkpoint 1
- [ ] Checkpoint 2
`;

// Drifted spec content
const driftedSpecContent = `
# Original Feature

This is the original feature description with some drift.

## Checkpoints

- [ ] Checkpoint 1
- [ ] Modified checkpoint 2
- [ ] New checkpoint 3
`;

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  fs.mkdirSync(join(testDir, '.checkmate-snapshots'), { recursive: true });
  
  // Create test spec file
  fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), originalSpecContent);
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Create snapshot
function createSnapshot() {
  return new Promise((resolve, reject) => {
    const snapshotPath = join(testDir, '.checkmate-snapshots', 'test-feature.md.snapshot');
    fs.writeFileSync(snapshotPath, originalSpecContent);
    resolve();
  });
}

// Run the spec drift script
function runSpecDriftScript() {
  return new Promise((resolve, reject) => {
    const scriptPath = join(projectRoot, 'scripts/cm-spec-drift.js');
    const driftProcess = spawn('node', [scriptPath], { 
      cwd: testDir,
      env: {
        ...process.env,
        CHECKMATE_HOME: testDir
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    driftProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    driftProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    driftProcess.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    driftProcess.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Create snapshot with original content
    await createSnapshot();
    
    // Test 1: No drift scenario
    let result = await runSpecDriftScript();
    assert.strictEqual(result.stdout.includes("No drift detected"), true, "Should not detect drift with identical content");
    
    // Test 2: With drift scenario
    // Update spec file with drifted content
    fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), driftedSpecContent);
    
    result = await runSpecDriftScript();
    assert.strictEqual(result.stdout.includes("Drift detected"), true, "Should detect drift with modified content");
    assert.strictEqual(result.stdout.includes("Modified checkpoint"), true, "Should mention modified checkpoints");
    
    console.log('\n✅ PASS: All spec drift script tests passed');
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