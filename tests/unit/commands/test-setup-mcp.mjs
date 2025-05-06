#!/usr/bin/env node
/**
 * Unit test for the setup-mcp command
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
const testDir = join(projectRoot, 'temp-test', 'setup-mcp-test');

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
  
  return { configPath };
}

// Mock the inquirer module
function mockInquirer() {
  // Create a mock module in the test directory
  const mockInquirerDir = join(testDir, 'node_modules', 'inquirer');
  fs.mkdirSync(mockInquirerDir, { recursive: true });
  
  const mockInquirerFile = join(mockInquirerDir, 'index.js');
  fs.writeFileSync(mockInquirerFile, `
    export default {
      prompt() {
        return Promise.resolve({ 
          port: 3050,
          confirm: true 
        });
      }
    };
  `);
  
  // Also create a package.json for the mock
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
    mockInquirer();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the setup-mcp module function
    const setupModule = await import('../../../dist/commands/setup-mcp.js');
    const { setupMCP } = setupModule;
    
    // Run the setup function directly with parameters to bypass interactive prompts
    await setupMCP(testDir, { 
      port: 3050, 
      yes: true 
    });
    
    // Verify MCP configuration was added to .checkmate config
    const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(updatedConfig.mcp, "MCP configuration should be added to config");
    assert.strictEqual(updatedConfig.mcp.port, 3050, "MCP port should be set correctly");
    
    // Check if the mcp directory was created
    assert.ok(fs.existsSync(join(testDir, 'mcp')), "MCP directory should be created");
    
    console.log('\n✅ PASS: All setup-mcp command tests passed');
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