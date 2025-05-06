#!/usr/bin/env node
/**
 * Unit test for the promote command
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
const testDir = join(projectRoot, 'temp-test', 'promote-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create checkmate specs directory and agents subdirectory
  fs.mkdirSync(join(testDir, 'checkmate', 'specs', 'agents'), { recursive: true });
  
  // Create a draft agent spec
  const draftSpecPath = join(testDir, 'checkmate', 'specs', 'agents', 'draft-feature.yaml');
  fs.writeFileSync(draftSpecPath, `
name: "Draft Feature"
description: "This is a draft feature for testing promote command"
status: draft
version: 0.1.0
tasks:
  - id: task1
    description: "Implement the feature"
    requirements:
      - "The feature should be implemented"
  `);
  
  return { draftSpecPath };
}

async function runTest() {
  try {
    // Setup test environment
    const { draftSpecPath } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { promoteCommand } = await import('../../../dist/commands/promote.js');
    
    // Run the promote command on the draft spec
    await promoteCommand({
      path: draftSpecPath
    });
    
    // Read the updated spec file
    const specContent = fs.readFileSync(draftSpecPath, 'utf8');
    
    // Verify that the status has been updated
    assert.ok(specContent.includes('status: active'), 
              "Status should be updated from draft to active");
    
    // Verify version has been updated
    assert.ok(specContent.includes('version: 1.0.0'), 
              "Version should be updated to 1.0.0");
    
    console.log('\n✅ PASS: All promote command tests passed');
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