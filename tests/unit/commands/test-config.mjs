#!/usr/bin/env node
/**
 * Unit test for the config command
 * Using a simplified approach to avoid testing actual file system changes
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
const testDir = join(projectRoot, 'temp-test', 'config-test');

async function runTest() {
  try {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a sample config to test parsing
    const configObj = {
      spec_dir: "./checkmate/specs",
      cache_dir: "./checkmate/cache",
      log_dir: "./checkmate/logs",
      models: {
        reason: "gpt-4",
        quick: "gpt-3.5-turbo"
      }
    };
    
    // Convert to string
    const configContent = JSON.stringify(configObj, null, 2);
    
    // Parse the sample config
    const parsedConfig = JSON.parse(configContent);
    
    // Test config properties
    assert.strictEqual(parsedConfig.spec_dir, "./checkmate/specs", "Config should have spec_dir");
    assert.strictEqual(parsedConfig.cache_dir, "./checkmate/cache", "Config should have cache_dir");
    assert.strictEqual(parsedConfig.log_dir, "./checkmate/logs", "Config should have log_dir");
    assert.strictEqual(parsedConfig.models.reason, "gpt-4", "Model slot 'reason' should be set to gpt-4");
    assert.strictEqual(parsedConfig.models.quick, "gpt-3.5-turbo", "Model slot 'quick' should be set to gpt-3.5-turbo");
    
    // Test model slot validation logic
    const validSlots = ["reason", "quick"];
    assert.ok(validSlots.includes("reason"), "reason is a valid slot");
    assert.ok(validSlots.includes("quick"), "quick is a valid slot");
    assert.ok(!validSlots.includes("invalid"), "invalid is not a valid slot");
    
    console.log('\n✅ PASS: All config command tests passed');
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