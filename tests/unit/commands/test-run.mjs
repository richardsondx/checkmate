#!/usr/bin/env node
/**
 * Unit test for the run command
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
const testDir = join(projectRoot, 'temp-test', 'run-test');
const testSpecsDir = join(testDir, 'checkmate', 'specs');

// Markdown test content with a script to run
const scriptSpecContent = `
# Test Script Execution

This spec tests the run command functionality.

## Script

\`\`\`bash
echo "Hello from test script"
exit 0
\`\`\`

## Checkpoints

- [ ] Script should execute successfully
- [ ] Script should return expected output
`;

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Create test spec file
  fs.writeFileSync(join(testSpecsDir, 'test-script.md'), scriptSpecContent);
  
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
    
    // Import the run module
    const runModule = await import('../../../dist/commands/run.js');
    
    // Test 1: extractCode
    const { extractCode } = runModule;
    const content = fs.readFileSync(join(testSpecsDir, 'test-script.md'), 'utf8');
    const code = await extractCode(content);
    
    assert.strictEqual(code.trim(), 'echo "Hello from test script"\nexit 0', "Code extraction should work");
    
    // Test 2: detectLanguage
    const { detectLanguage } = runModule;
    const language = detectLanguage("```bash\necho 'test'\n```");
    assert.strictEqual(language, "bash", "Language detection should work");
    
    const defaultLanguage = detectLanguage("```\necho 'test'\n```");
    assert.strictEqual(defaultLanguage, "shell", "Default language should be shell");
    
    // Test 3: writeScriptFile 
    const { writeScriptFile } = runModule;
    const scriptPath = await writeScriptFile("echo 'test'", "bash");
    
    assert.strictEqual(fs.existsSync(scriptPath), true, "Script file should be created");
    assert.strictEqual(fs.readFileSync(scriptPath, 'utf8').includes("echo 'test'"), true, "Script content should be correct");
    
    console.log('\n✅ PASS: All run command tests passed');
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