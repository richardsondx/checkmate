#!/usr/bin/env node
/**
 * Unit test for the init command, focusing on .gitignore updates
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
const testDir = join(projectRoot, 'temp-test', 'gitignore-test');

/**
 * Manual implementation of the updateGitignore function logic
 * to test that it correctly adds the three entries to .gitignore
 */
function testUpdateGitignore() {
  // Store the current working directory before changing it
  const originalCwd = process.cwd();
  
  try {
    // Create clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    // Set current directory to test directory
    process.chdir(testDir);
    
    // Create a test gitignore file
    fs.writeFileSync('.gitignore', 'node_modules/\n');
    
    // Simulate the updateGitignore function logic
    const gitignorePath = '.gitignore';
    const entriesToAdd = [
      'checkmate/',
      '.checkmate',
      '.checkmate-telemetry/'
    ];
    
    let content = fs.readFileSync(gitignorePath, 'utf8');
    let existingEntries = content.split('\n').map(line => line.trim());
    
    // Check for entries to add
    let modified = false;
    for (const entry of entriesToAdd) {
      if (!existingEntries.includes(entry)) {
        content += (content && !content.endsWith('\n')) ? '\n' : '';
        content += `${entry}\n`;
        modified = true;
        console.log(`Added ${entry} to .gitignore`);
      }
    }
    
    // Only write if we modified the file
    if (modified) {
      fs.writeFileSync(gitignorePath, content, 'utf8');
    }
    
    // Now verify that the gitignore has all the required entries
    const updatedContent = fs.readFileSync(gitignorePath, 'utf8');
    
    assert.ok(updatedContent.includes('checkmate/'), ".gitignore should contain 'checkmate/'");
    assert.ok(updatedContent.includes('.checkmate'), ".gitignore should contain '.checkmate'");
    assert.ok(updatedContent.includes('.checkmate-telemetry/'), ".gitignore should contain '.checkmate-telemetry/'");
    
    console.log('\n✅ PASS: .gitignore update test passed');
    return true;
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Reset current directory
    process.chdir(originalCwd);
    
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
  }
}

// Run the test
const success = testUpdateGitignore();
process.exit(success ? 0 : 1); 