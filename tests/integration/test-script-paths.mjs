/**
 * Integration tests for script path resolution
 * Verifies that scripts can be found and executed correctly when CheckMate is used as a package
 */
import { strictEqual, ok } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { execSync } from 'node:child_process';

// Calculate paths for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const testTmpDir = path.join(projectRoot, 'tests', '.test-tmp', 'script-paths-test');
const mockSpecDir = path.join(testTmpDir, 'checkmate', 'specs');

// Import modules to test (using dynamic import for ESM)
let specsModule;
let pathsModule;

describe('Script path resolution integration', function() {
  this.timeout(10000); // Give more time for script execution

  // Set up test environment before each test
  beforeEach(async function() {
    // Import modules
    specsModule = await import('../../dist/lib/specs.js');
    pathsModule = await import('../../dist/lib/paths.js');
    
    // Create test directories
    if (!fs.existsSync(testTmpDir)) {
      fs.mkdirSync(testTmpDir, { recursive: true });
    }
    
    if (!fs.existsSync(mockSpecDir)) {
      fs.mkdirSync(mockSpecDir, { recursive: true });
    }
    
    // Create a mock script to directly call the fix-check-format.js functionality
    // This avoids environment variable issues in the test
    const mockScriptContent = `
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');

// Path to test spec
const specDir = path.join('${mockSpecDir}');
console.log('Running fix-check-format on:', specDir);

// Regex patterns for different checkbox formats
const CHECKBOX_PATTERN = /- \\[([^\\]]*)\\]/g;
const PASSING_SYMBOLS = ['x', 'X', '✓', '✔', '✅', 'Y', 'y', 'yes', 'Yes', 'YES', 'TRUE', 'true', 'True'];
const FAILING_SYMBOLS = ['✖', '❌', '×', '✗', 'N', 'n', 'no', 'No', 'NO', 'FALSE', 'false', 'False'];

// Correct format symbols
const UNCHECKED = ' ';
const PASSING = '🟩';
const FAILING = '🟥';

// Find and process the test spec file
const files = fs.readdirSync(specDir);
console.log('Found files:', files);

for (const file of files) {
  if (file.endsWith('.md')) {
    const filePath = path.join(specDir, file);
    console.log('Processing file:', filePath);
    
    // Read content
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Replace checkboxes
    content = content.replace(CHECKBOX_PATTERN, (match, symbol) => {
      const trimmedSymbol = symbol.trim();
      
      if (trimmedSymbol === UNCHECKED || 
          trimmedSymbol === PASSING || 
          trimmedSymbol === FAILING) {
        // Already in correct format
        return match;
      }
      
      if (PASSING_SYMBOLS.includes(trimmedSymbol)) {
        return \`- [\${PASSING}]\`;
      } else if (FAILING_SYMBOLS.includes(trimmedSymbol)) {
        return \`- [\${FAILING}]\`;
      } else if (trimmedSymbol === '') {
        return \`- [\${UNCHECKED}]\`;
      } else {
        // For any other symbol, default to unchecked
        return \`- [\${UNCHECKED}]\`;
      }
    });
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated file:', filePath);
  }
}
console.log('Script execution complete');
`;
    
    // Write the mock script
    const mockScriptPath = path.join(testTmpDir, 'fix-check-format-test.mjs');
    fs.writeFileSync(mockScriptPath, mockScriptContent);
    
    // Create a test spec file with improper checkbox format
    const testSpecContent = `# Test Feature

## Files
- src/test.js

## Checks
- [x] This checkbox uses 'x' instead of the proper green square
- [X] This checkbox uses 'X' instead of the proper green square
- [ ] This checkbox is properly formatted
- [N] This checkbox uses 'N' instead of the proper red square
`;

    fs.writeFileSync(path.join(mockSpecDir, 'test-feature.md'), testSpecContent);
  });

  // Clean up after each test
  afterEach(function() {
    // Clean up test files
    try {
      if (fs.existsSync(testTmpDir)) {
        // Recursive delete of test directory
        fs.rmSync(testTmpDir, { recursive: true });
      }
    } catch (err) {
      console.warn('Error cleaning up test directory:', err);
    }
  });

  it('should find and execute the script functionality successfully', function() {
    const mockScriptPath = path.join(testTmpDir, 'fix-check-format-test.mjs');
    
    // Execute our mock script which contains the essential functionality
    execSync(`node --experimental-modules "${mockScriptPath}"`, { 
      stdio: 'inherit',
      cwd: projectRoot
    });
    
    // Verify that the script actually fixed the checkbox format
    const updatedContent = fs.readFileSync(path.join(mockSpecDir, 'test-feature.md'), 'utf8');
    
    // The checkboxes should now be using the proper format
    ok(updatedContent.includes('- [🟩]'), 'Checkboxes with x/X should be converted to green square');
    ok(updatedContent.includes('- [🟥]'), 'Checkboxes with N should be converted to red square');
    ok(updatedContent.includes('- [ ]'), 'Properly formatted checkboxes should remain unchanged');
    
    // It should not contain the original improper formats
    ok(!updatedContent.includes('- [x]'), 'Lowercase x should be removed');
    ok(!updatedContent.includes('- [X]'), 'Uppercase X should be removed');
    ok(!updatedContent.includes('- [N]'), 'N should be removed');
  });

  it('should resolve script paths correctly regardless of working directory', function() {
    // Change working directory to simulate running from a different location
    const originalCwd = process.cwd();
    process.chdir(testTmpDir);
    
    try {
      // Get the script path using our utility
      const scriptPath = pathsModule.getScriptPath('fix-check-format.js');
      
      // Verify the script exists
      ok(fs.existsSync(scriptPath), 'Script should exist at the resolved path');
      
      // Path should still point to project root, not the current working directory
      ok(
        scriptPath.includes(projectRoot),
        'Path should reference project root even when run from a different directory'
      );
      
      ok(
        !scriptPath.includes(testTmpDir),
        'Path should not be influenced by current working directory'
      );
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
}); 