#!/usr/bin/env node
/**
 * Unit test for the outline command
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
const testDir = join(projectRoot, 'temp-test', 'outline-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Mock feature description
const mockFeatureDescription = "Create a user authentication system with login and registration";

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
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
    
    // Import the outline module
    const outlineModule = await import('../../../dist/commands/outline.js');
    
    // Mock the AI response for generating checkpoints
    const mockCheckpoints = [
      "Implement user registration form with email and password fields",
      "Add form validation for registration fields",
      "Implement user login functionality",
      "Add authentication middleware",
      "Create user profile page"
    ];
    
    // Test 1: transformCheckpointsToMarkdown
    const { transformCheckpointsToMarkdown } = outlineModule;
    const markdown = transformCheckpointsToMarkdown(mockCheckpoints);
    
    // Check that the markdown contains all checkpoints
    let allCheckpointsIncluded = true;
    for (const checkpoint of mockCheckpoints) {
      if (!markdown.includes(`- [ ] ${checkpoint}`)) {
        allCheckpointsIncluded = false;
        break;
      }
    }
    
    assert.strictEqual(allCheckpointsIncluded, true, "All checkpoints should be included in markdown");
    
    // Test 2: slugify
    if (outlineModule.slugify) {
      const { slugify } = outlineModule;
      const slug = slugify("User Authentication System");
      assert.strictEqual(slug, "user-authentication-system", "Slugify should convert to lowercase with hyphens");
    }
    
    // Test 3: generateFeatureTitle
    if (outlineModule.generateFeatureTitle) {
      const { generateFeatureTitle } = outlineModule;
      const mockInput = "Authentication system with login";
      const title = await generateFeatureTitle(mockInput);
      
      assert.strictEqual(typeof title, "string", "Feature title should be a string");
      assert.strictEqual(title.length > 0, true, "Feature title should not be empty");
    }
    
    console.log('\n✅ PASS: All outline command tests passed');
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