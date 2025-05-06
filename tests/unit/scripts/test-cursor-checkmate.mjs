#!/usr/bin/env node
/**
 * Unit test for the cursor-checkmate script
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
const testDir = join(projectRoot, 'temp-test', 'cursor-checkmate-test');

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
  
This is a test feature for cursor integration.

## Requirements
- The system shall integrate with Cursor
- The system shall provide actions in Cursor

## Implementation
The integration is done through cursor-checkmate.js script.
`);

  // Create a sample project file for testing cursor integration
  const srcDir = join(testDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(join(srcDir, 'test-file.js'), `// Test file for cursor integration
function testFunction() {
  return "This is a test function for cursor integration";
}
`);
  
  return { specPath };
}

async function runTest() {
  try {
    // Setup test environment
    const { specPath } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Create a mock test for the cursor script
    // Since the cursor-checkmate script is primarily for integration with Cursor editor,
    // we'll just test that it can be loaded without errors
    
    const testFile = join(testDir, 'cursor-test.mjs');
    fs.writeFileSync(testFile, `
      // Test importing the cursor-checkmate script
      import { fileURLToPath } from 'url';
      import { dirname, join } from 'path';
      import * as path from 'path';
      
      // Get the project root directory
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const projectRoot = join(__dirname, '..');
      
      try {
        // Try to import the script module
        const cursorScriptPath = ${JSON.stringify(join(projectRoot, 'scripts', 'cursor-checkmate.js'))};
        
        // Check if the file exists
        const fs = await import('fs');
        if (fs.existsSync(cursorScriptPath)) {
          console.log('PASS: cursor-checkmate.js exists');
        } else {
          console.log('FAIL: cursor-checkmate.js not found');
          process.exit(1);
        }
        
        // Import the script to test if it has syntax errors
        await import(cursorScriptPath);
        console.log('PASS: cursor-checkmate.js loaded successfully');
        
        process.exit(0);
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    `);
    
    // Run the test
    const result = await new Promise((resolve, reject) => {
      const process = spawn('node', [testFile], {
        cwd: testDir,
        env: {
          ...process.env,
          CHECKMATE_HOME: testDir
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr
        });
      });
      
      process.on('error', (err) => {
        reject(err);
      });
    });
    
    // Verify results
    if (result.code === 0) {
      assert.ok(result.stdout.includes('PASS:'), "Test should output PASS message");
      console.log('\n✅ PASS: All cursor-checkmate script tests passed');
      return true;
    } else {
      console.error('Test failed with code:', result.code);
      console.error('stdout:', result.stdout);
      console.error('stderr:', result.stderr);
      return false;
    }
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