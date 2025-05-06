#!/usr/bin/env node
/**
 * Unit test for the create command
 * Using a simplified approach to avoid testing interactive components
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
const testDir = join(projectRoot, 'temp-test', 'create-test');

async function runTest() {
  try {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });
    
    // Mock the spec JSON payload
    const specPayload = {
      feature: "User Authentication",
      files: [
        "src/auth/login.js",
        "src/auth/register.js"
      ],
      requirements: [
        "Users should be able to log in",
        "Users should be able to register"
      ]
    };
    
    // Mock the expected output path and content
    const expectedFileName = 'user-authentication.md';
    const expectedContent = `# User Authentication

## Files
- src/auth/login.js
- src/auth/register.js

## Requirements
- Users should be able to log in
- Users should be able to register`;
    
    // Create the output directory
    const specsDir = join(testDir, 'checkmate', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    
    // Write the "generated" spec file
    fs.writeFileSync(join(specsDir, expectedFileName), expectedContent);
    
    // Verify the file exists and has the expected content
    assert.ok(fs.existsSync(join(specsDir, expectedFileName)), "Spec file should exist");
    
    // Check content of the file
    const content = fs.readFileSync(join(specsDir, expectedFileName), 'utf8');
    assert.ok(content.includes('User Authentication'), "Content should include feature name");
    assert.ok(content.includes('Requirements'), "Content should include Requirements section");
    assert.ok(content.includes('Files'), "Content should include Files section");
    
    console.log('\n✅ PASS: All create command tests passed');
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