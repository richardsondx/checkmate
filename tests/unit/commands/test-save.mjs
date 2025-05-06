#!/usr/bin/env node
/**
 * Unit test for the save command
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
const testDir = join(projectRoot, 'temp-test', 'save-test');

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
  
  // Create draft specs to save
  const drafts = [
    {
      title: "Temporary Feature",
      slug: "saved-feature",
      description: "This is a temporary feature that will be saved to the specs directory.",
      files: ["src/features/temp.js"],
      checks: [
        "The feature should be saved correctly",
        "The feature metadata should be updated"
      ],
      approved: true
    }
  ];
  
  return { drafts };
}

async function runTest() {
  try {
    // Setup test environment
    const { drafts } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { saveCommand } = await import('../../../dist/commands/save.js');
    
    // Convert drafts to JSON
    const jsonDrafts = JSON.stringify(drafts);
    
    // Run the save command
    const result = await saveCommand({ 
      json: jsonDrafts,
      format: 'md'
    });
    
    // Verify the result
    assert.ok(result.saved > 0, "At least one spec should be saved");
    assert.ok(Array.isArray(result.paths), "Result should include paths array");
    assert.ok(result.paths.length > 0, "At least one path should be returned");
    
    // Check the saved file exists
    const savedPath = result.paths[0];
    assert.ok(fs.existsSync(savedPath), "Saved spec file should exist");
    
    // Check content of the saved file
    const savedContent = fs.readFileSync(savedPath, 'utf8');
    assert.ok(savedContent.includes('Temporary Feature'), "Content should be preserved");
    
    console.log('\n✅ PASS: All save command tests passed');
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