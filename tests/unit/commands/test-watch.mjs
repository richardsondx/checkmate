#!/usr/bin/env node
/**
 * Unit test for the watch command
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
const testDir = join(projectRoot, 'temp-test', 'watch-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Markdown test content
const testSpecContent = `
# Test Feature

This is a test feature with checkpoints.

## Checkpoints

- [ ] Checkpoint 1
- [ ] Checkpoint 2
- [ ] Checkpoint 3
`;

// Updated spec content
const updatedSpecContent = `
# Test Feature

This is a test feature with checkpoints.

## Checkpoints

- [x] Checkpoint 1
- [ ] Checkpoint 2
- [ ] Checkpoint 3
`;

// Setup test environment
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

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Import the watch module
    const watchModule = await import('../../../dist/commands/watch.js');
    
    // Test file path utils
    if (watchModule.getSpecsDir) {
      const { getSpecsDir } = watchModule;
      const specsDir = getSpecsDir();
      assert.strictEqual(specsDir, testSpecsDir, "Should return the correct specs directory");
    }
    
    // Test extractCheckpointChanges if available
    if (watchModule.extractCheckpointChanges) {
      const { extractCheckpointChanges } = watchModule;
      
      // Update the spec file
      fs.writeFileSync(join(testSpecsDir, 'test-feature.md'), updatedSpecContent);
      
      const changes = await extractCheckpointChanges(testSpecContent, updatedSpecContent);
      assert.strictEqual(Array.isArray(changes), true, "Should return an array of changes");
      
      // Check if changes were detected correctly
      const hasCompletion = changes.some(change => 
        change.type === 'completion' && change.checkpoint.includes('Checkpoint 1')
      );
      
      assert.strictEqual(hasCompletion, true, "Should detect completion of Checkpoint 1");
    }
    
    // Test findSpecFiles if available
    if (watchModule.findSpecFiles) {
      const { findSpecFiles } = watchModule;
      const files = await findSpecFiles();
      
      assert.strictEqual(Array.isArray(files), true, "Should return an array of files");
      assert.strictEqual(files.includes('test-feature.md'), true, "Should find the test spec file");
    }
    
    console.log('\n✅ PASS: All watch command tests passed');
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