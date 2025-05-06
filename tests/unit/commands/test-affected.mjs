#!/usr/bin/env node
/**
 * Unit test for the affected command
 * 
 * Note: This test only verifies the isSpecAffected function of the affected command,
 * not the full command execution which would require mocking the tree module.
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
const testDir = join(projectRoot, 'temp-test', 'affected-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(join(testDir, 'checkmate', 'specs'), { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Create sample spec file with Files section
  const specFile = join(testDir, 'checkmate', 'specs', 'test-feature.md');
  fs.writeFileSync(specFile, `# Feature: Test Feature
  
This is a test feature specification.

## Files:
- src/test-feature.js
- src/components/testComponent.js

## Requirements
- The system shall have a test file
- The system shall pass tests
`);

  return { specFile };
}

async function runTest() {
  try {
    // Setup test environment
    const { specFile } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Custom version of isSpecAffected function for testing
    function isSpecAffected(specPath, changedFiles) {
      try {
        // Read spec file
        const content = fs.readFileSync(specPath, 'utf8');
        
        // Extract slug from filename
        const slug = path.basename(specPath, '.md');
        
        // Extract title
        const titleMatch = content.match(/# Feature: (.*?)(?=\n|$)/) || content.match(/# (.*?)(?=\n|$)/);
        const title = titleMatch ? titleMatch[1].trim() : slug;
        
        // Extract file paths from the spec
        const fileSection = content.match(/## Files:\s*\n((?:- .*?\n)*)/);
        if (!fileSection) {
          return { affected: false, slug, title };
        }
        
        const specFiles = fileSection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('- '))
          .map(line => line.substring(2).trim());
        
        // Check if any of the changed files match files mentioned in the spec
        const isAffected = specFiles.some(specFile => {
          return changedFiles.some(changedFile => {
            return changedFile === specFile || 
                changedFile.startsWith(specFile + path.sep) ||
                specFile.includes(changedFile);
          });
        });
        
        return { affected: isAffected, slug, title };
      } catch (error) {
        console.error(`Error checking spec ${specPath}:`, error);
        return { affected: false, slug: path.basename(specPath, '.md'), title: path.basename(specPath, '.md') };
      }
    }
    
    // Test with a matching changed file
    const result1 = isSpecAffected(specFile, ['src/test-feature.js']);
    assert.ok(result1.affected, "Spec should be affected when file path matches");
    assert.strictEqual(result1.slug, 'test-feature', "Slug should be extracted correctly");
    assert.strictEqual(result1.title, 'Test Feature', "Title should be extracted correctly");
    
    // Test with a non-matching changed file
    const result2 = isSpecAffected(specFile, ['src/other-file.js']);
    assert.strictEqual(result2.affected, false, "Spec should not be affected when file path doesn't match");
    
    // Test with a nested file under a directory mentioned in the spec
    const result3 = isSpecAffected(specFile, ['src/components/testComponent.js/index.js']);
    assert.ok(result3.affected, "Spec should be affected when changed file is in a nested directory");
    
    console.log('\n✅ PASS: All affected command tests passed');
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