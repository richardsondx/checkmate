#!/usr/bin/env node
/**
 * Unit test for the draft command
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
const testDir = join(projectRoot, 'temp-test', 'draft-test');

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
  
  // Create sample source files to analyze
  fs.mkdirSync(join(testDir, 'src'), { recursive: true });
  fs.mkdirSync(join(testDir, 'src', 'auth'), { recursive: true });
  
  fs.writeFileSync(join(testDir, 'src', 'auth', 'login.js'), `
// Login component
function login(username, password) {
  // Validate credentials
  if (username && password.length >= 8) {
    return { success: true };
  }
  return { success: false };
}

export default login;
`);
  
  return { configPath };
}

async function runTest() {
  try {
    // Setup test environment
    const { configPath } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { draftCommand } = await import('../../../dist/commands/draft.js');
    
    // Create a draft specification
    const featurePrompt = 'Create a login feature with username and password validation';
    const drafts = await draftCommand({
      description: featurePrompt,
      context: 50
    });
    
    // Verify drafts were created
    assert.ok(Array.isArray(drafts), "draftCommand should return an array of drafts");
    assert.ok(drafts.length > 0, "At least one draft spec should be created");
    
    // Check content of the first draft
    const firstDraft = drafts[0];
    assert.ok(firstDraft.title, "Draft should have a title");
    assert.ok(firstDraft.slug, "Draft should have a slug");
    assert.ok(Array.isArray(firstDraft.files), "Draft should have files array");
    assert.ok(Array.isArray(firstDraft.checks), "Draft should have checks array");
    
    // Verify content is related to login/authentication
    assert.ok(
      firstDraft.title.toLowerCase().includes('login') || 
      firstDraft.title.toLowerCase().includes('auth') ||
      firstDraft.description && firstDraft.description.toLowerCase().includes('login') ||
      firstDraft.checks.some(check => 
        check.toLowerCase().includes('login') || 
        check.toLowerCase().includes('auth')
      ),
      "Draft content should be related to the prompt"
    );
    
    console.log('\n✅ PASS: All draft command tests passed');
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