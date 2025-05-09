#!/usr/bin/env node
/**
 * Unit test for the warmup command
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import test from 'ava';
import sinon from 'sinon';

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

// Mock dependencies
const mockClipboard = { write: sinon.stub().resolves() };
const mockOra = sinon.stub().returns({
  start: sinon.stub().returnsThis(),
  succeed: sinon.stub().returnsThis(),
  fail: sinon.stub().returnsThis(),
  stop: sinon.stub().returnsThis(),
  text: ''
});

// Mock models
const modelStub = {
  complete: sinon.stub().resolves(`# User Authentication Flow

## Checks
- [ ] Implement user signup with email and password
- [ ] Validate user login credentials
- [ ] Generate password reset tokens and links
- [ ] Support OAuth authentication providers
- [ ] Persist user sessions securely`)
};

const mockSpecAuthor = {
  authorSpec: sinon.stub().resolves({ path: 'some/path', slug: 'test-slug' })
};

test.beforeEach(t => {
  // Create the test sandbox
  t.context.sandbox = sinon.createSandbox();
  
  // Mock fs.existsSync
  t.context.existsSync = t.context.sandbox.stub(fs, 'existsSync').returns(true);
  
  // Mock fs.mkdirSync
  t.context.mkdirSync = t.context.sandbox.stub(fs, 'mkdirSync').returns(undefined);
  
  // Mock fs.readFileSync
  t.context.readFileSync = t.context.sandbox.stub(fs, 'readFileSync').returns(`# Sample Feature

## Some content

* Bullet point 1
* Bullet point 2
`);
  
  // Mock fs.writeFileSync
  t.context.writeFileSync = t.context.sandbox.stub(fs, 'writeFileSync').returns(undefined);
  
  // Mock fs.readdirSync
  t.context.readdirSync = t.context.sandbox.stub(fs, 'readdirSync').returns(['file1.md', 'file2.md']);
  
  // Mock execSync
  t.context.execSync = t.context.sandbox.stub().returns('file1.js\nfile2.js');
  
  // Set up process.stdout.write
  t.context.stdout = t.context.sandbox.stub(process.stdout, 'write');
});

test.afterEach(t => {
  t.context.sandbox.restore();
});

test('Warmup command should handle repository scanning', async t => {
  // Import the module to test, but with mocked dependencies
  const { warmupCommand } = await import('../../../src/commands/warmup.js');
  
  // Run warmup command with quiet option
  const result = await warmupCommand({ quiet: true });
  
  // Verify behavior
  t.true(t.context.existsSync.called, 'Should check for files');
  t.true(Array.isArray(result), 'Should return an array');
});

test('Warmup command should handle PRD file processing', async t => {
  // Import the module to test, but with mocked dependencies
  const warmupModule = await import('../../../src/commands/warmup.js');
  
  // Mock the parseMarkdown function to return a valid AST
  const mockAst = {
    valid: true,
    ast: {
      children: [
        { type: 'paragraph', children: [] },
        { 
          type: 'heading', 
          depth: 2, 
          children: [{ type: 'text', value: 'User Authentication Flow' }] 
        },
        {
          type: 'list',
          children: [
            { 
              type: 'listItem', 
              children: [
                { 
                  type: 'paragraph', 
                  children: [{ type: 'text', value: 'Allow users to sign up with email and password' }] 
                }
              ] 
            },
            { 
              type: 'listItem', 
              children: [
                { 
                  type: 'paragraph', 
                  children: [{ type: 'text', value: 'Support existing user login with validation' }] 
                }
              ] 
            }
          ]
        },
        { 
          type: 'heading', 
          depth: 2, 
          children: [{ type: 'text', value: 'Task Management' }] 
        },
        {
          type: 'list',
          children: [
            { 
              type: 'listItem', 
              children: [
                { 
                  type: 'paragraph', 
                  children: [{ type: 'text', value: 'Display tasks in a list' }] 
                }
              ] 
            }
          ]
        }
      ]
    }
  };
  
  const markdownParserStub = {
    parseMarkdown: sinon.stub().returns(mockAst)
  };
  
  // Override the imports in the warmup module
  warmupModule.default = {
    ...warmupModule.default,
    parseMarkdown: markdownParserStub.parseMarkdown,
    reason: sinon.stub().resolves(`# User Authentication Flow

## Checks
- [ ] Implement user signup with email and password
- [ ] Validate user login credentials
- [ ] Generate password reset tokens and links`)
  };
  
  // Run warmup command with PRD file option
  const result = await warmupModule.warmupCommand({
    quiet: true,
    prdFile: 'examples/docs/sample-prd.md'
  });
  
  // Verify behavior
  t.true(t.context.readFileSync.called, 'Should read PRD file');
  t.true(t.context.writeFileSync.called, 'Should write spec files');
  t.true(Array.isArray(result), 'Should return an array of specs');
});

test('Warmup should create last-warmup.json when processing PRD', async t => {
  // Import the module to test, but with mocked dependencies
  const warmupModule = await import('../../../src/commands/warmup.js');
  
  // Mock the parseMarkdown function to return a valid AST
  const mockAst = {
    valid: true,
    ast: {
      children: [
        { 
          type: 'heading', 
          depth: 2, 
          children: [{ type: 'text', value: 'Feature One' }] 
        },
        { 
          type: 'heading', 
          depth: 2, 
          children: [{ type: 'text', value: 'Feature Two' }] 
        }
      ]
    }
  };
  
  const markdownParserStub = {
    parseMarkdown: sinon.stub().returns(mockAst)
  };
  
  // Override the imports in the warmup module
  warmupModule.default = {
    ...warmupModule.default,
    parseMarkdown: markdownParserStub.parseMarkdown,
    reason: sinon.stub().resolves(`# Feature
## Checks
- [ ] First check
- [ ] Second check`)
  };
  
  // Run warmup command with PRD file option
  await warmupModule.warmupCommand({
    quiet: true,
    prdFile: 'examples/docs/sample-prd.md'
  });
  
  // Find the call that wrote to .checkmate/last-warmup.json
  const writeCall = t.context.writeFileSync.getCalls().find(call => 
    call.args[0] === '.checkmate/last-warmup.json' || 
    call.args[0].endsWith('/last-warmup.json')
  );
  
  t.truthy(writeCall, 'Should write last-warmup.json file');
  
  if (writeCall) {
    const jsonContent = writeCall.args[1];
    t.true(jsonContent.includes('"features":'), 'Should include features array');
    t.true(jsonContent.includes('"slug":'), 'Should include feature slugs');
    t.true(jsonContent.includes('"title":'), 'Should include feature titles');
  }
}); 