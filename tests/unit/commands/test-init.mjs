#!/usr/bin/env node
/**
 * Unit test for the init command
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
const testDir = join(projectRoot, 'temp-test', 'init-test');

async function runTest() {
  try {
    // Create clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    // Set current directory to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Import the init module
    const initModule = await import('../../../dist/commands/init.js');
    const { initializeProject } = initModule;
    
    // Run init
    await initializeProject();
    
    // Check if .checkmate file was created
    assert.strictEqual(fs.existsSync(join(testDir, '.checkmate')), true, ".checkmate file should exist");
    
    // Check if the right directories were created
    const configData = JSON.parse(fs.readFileSync(join(testDir, '.checkmate'), 'utf8'));
    
    const specDir = join(testDir, configData.spec_dir || 'checkmate/specs');
    assert.strictEqual(fs.existsSync(specDir), true, "Spec directory should exist");
    
    const cacheDir = join(testDir, configData.cache_dir || 'checkmate/cache');
    assert.strictEqual(fs.existsSync(cacheDir), true, "Cache directory should exist");
    
    const logDir = join(testDir, configData.log_dir || 'checkmate/logs');
    assert.strictEqual(fs.existsSync(logDir), true, "Log directory should exist");
    
    console.log('\n✅ PASS: All init command tests passed');
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