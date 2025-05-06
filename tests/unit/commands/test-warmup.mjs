#!/usr/bin/env node
/**
 * Unit test for the warmup command
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
const testDir = join(projectRoot, 'temp-test', 'warmup-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs",
    models: {
      reason: "dummy-model",
      quick: "dummy-model"
    }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create checkmate specs directory
  fs.mkdirSync(join(testDir, 'checkmate', 'specs'), { recursive: true });
  
  // Create sample source files for analysis
  fs.mkdirSync(join(testDir, 'src'), { recursive: true });
  fs.mkdirSync(join(testDir, 'src', 'features'), { recursive: true });
  
  fs.writeFileSync(join(testDir, 'src', 'features', 'login.js'), `
// Login feature implementation
function login(username, password) {
  // Validate credentials
  if (!username || !password) {
    return { success: false, error: 'Missing credentials' };
  }
  
  if (password.length < 8) {
    return { success: false, error: 'Password too short' };
  }
  
  // In a real app, this would check against a database
  if (username === 'admin' && password === 'password123') {
    return { success: true, user: { id: 1, username, role: 'admin' } };
  }
  
  return { success: false, error: 'Invalid credentials' };
}

export default login;
`);
  
  return { configPath };
}

// Mock the AI client to avoid actual API calls during tests
async function mockModelRequests() {
  // Create a mock for the AI client module
  const mockModule = `
    /**
     * Mock AI client for testing
     */
    export async function callModel(slot, systemPrompt, userPrompt) {
      return "This is a mock response for testing purposes.";
    }
    
    export async function reason(prompt, systemInstructions) {
      return "This is a mock reason response.";
    }
    
    export async function quick(prompt, systemInstructions) {
      return "This is a mock quick response.";
    }
    
    export async function testModelIntegration() {
      return true;
    }
  `;
  
  // Create the mock file in the test directory
  const mockDir = join(testDir, 'lib');
  fs.mkdirSync(mockDir, { recursive: true });
  fs.writeFileSync(join(mockDir, 'models.js'), mockModule);
  
  // Create a package.json with a custom "imports" field to redirect imports
  fs.writeFileSync(join(testDir, 'package.json'), JSON.stringify({
    "name": "mock-test",
    "type": "module",
    "imports": {
      "../../../dist/lib/models.js": "./lib/models.js"
    }
  }, null, 2));
}

// Mock inquirer for non-interactive testing
function mockInquirer() {
  // Create a mock module in the test directory
  const mockInquirerDir = join(testDir, 'node_modules', 'inquirer');
  fs.mkdirSync(mockInquirerDir, { recursive: true });
  
  const mockInquirerFile = join(mockInquirerDir, 'index.js');
  fs.writeFileSync(mockInquirerFile, `
    export default {
      prompt() {
        return Promise.resolve({ 
          selectedIndices: [0],
          action: 'approve'
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
    const { configPath } = setupTestEnvironment();
    await mockModelRequests();
    mockInquirer();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { warmupCommand } = await import('../../../dist/commands/warmup.js');
    
    // Run the warmup command with non-interactive options
    const result = await warmupCommand({
      output: 'json',
      topFiles: 10,
      yes: true,
      interactive: false,
      quiet: true,
      debug: false,
      cursor: false
    });
    
    // Simple validation that the result exists and has expected structure
    assert.ok(result, "warmupCommand should return a result");
    
    console.log('\n✅ PASS: All warmup command tests passed');
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