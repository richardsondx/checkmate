#!/usr/bin/env node
/**
 * Unit test for the status command
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
const testDir = join(projectRoot, 'temp-test', 'status-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Markdown test content
const testSpecContent = `
# Test Feature

This is a test feature with checkpoints.

## Checkpoints

- [ ] Checkpoint 1
- [x] Checkpoint 2
- [ ] Checkpoint 3
`;

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create test spec files
  fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), testSpecContent);
  
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
    
    // Import the status module
    const statusModule = await import('../../../dist/commands/status.js');
    const { getSpecStatus, countCheckpoints } = statusModule;
    
    // Test getSpecStatus
    const status = await getSpecStatus('test-feature.md');
    assert.strictEqual(status.filename, 'test-feature.md', "Filename should match");
    assert.strictEqual(status.title, 'Test Feature', "Title should match");
    
    // Test countCheckpoints
    const counts = countCheckpoints(status.checkpoints);
    assert.strictEqual(counts.total, 3, "Total checkpoints should be 3");
    assert.strictEqual(counts.completed, 1, "Completed checkpoints should be 1");
    assert.strictEqual(counts.remaining, 2, "Remaining checkpoints should be 2");
    
    console.log('\n✅ PASS: All status command tests passed');
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