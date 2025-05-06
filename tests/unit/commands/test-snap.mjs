#!/usr/bin/env node
/**
 * Unit test for the snap command
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
const testDir = join(projectRoot, 'temp-test', 'snap-test');

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
  
  // Create checkmate specs directory
  fs.mkdirSync(join(testDir, 'checkmate', 'specs'), { recursive: true });
  
  // Create a sample spec file
  const specPath = join(testDir, 'checkmate', 'specs', 'test-feature.md');
  fs.writeFileSync(specPath, `# Test Feature
  
This is a test feature for snapshot testing.

## Requirements
- The system shall create snapshots
- The system shall version control specifications
`);
  
  return { specPath };
}

// Mock the inquirer module for non-interactive testing
function mockInquirer() {
  // Create a mock module in the test directory
  const mockInquirerDir = join(testDir, 'node_modules', 'inquirer');
  fs.mkdirSync(mockInquirerDir, { recursive: true });
  
  const mockInquirerFile = join(mockInquirerDir, 'index.js');
  fs.writeFileSync(mockInquirerFile, `
    export default {
      prompt() {
        return Promise.resolve({ 
          shouldApply: true
        });
      }
    };
  `);
  
  // Create a package.json for the mock
  fs.writeFileSync(join(mockInquirerDir, 'package.json'), JSON.stringify({
    name: 'inquirer',
    version: '1.0.0',
    main: 'index.js',
    type: 'module'
  }));
}

async function runTest() {
  try {
    // Setup test environment
    const { specPath } = setupTestEnvironment();
    mockInquirer();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { snapCommand } = await import('../../../dist/commands/snap.js');
    
    // Run the snap command
    await snapCommand({
      detect: false,
      repair: false,
      auto: true
    });
    
    // Verify snapshot was created
    const snapshotPath = join(testDir, 'checkmate', 'specs', 'spec-snapshot.json');
    assert.ok(fs.existsSync(snapshotPath), "Snapshot file should be created");
    
    // Validate snapshot content
    const snapshotContent = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    assert.ok(snapshotContent.specs, "Snapshot should contain specs object");
    assert.ok(snapshotContent.specs['test-feature.md'], "Snapshot should include test feature");
    
    console.log('\n✅ PASS: All snap command tests passed');
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