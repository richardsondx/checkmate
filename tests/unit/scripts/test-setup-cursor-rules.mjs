/**
 * Unit tests for setup-cursor-rules script
 */
import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '../../.test-tmp');
const RULES_DIR = path.join(TEST_DIR, '.cursor/rules');
const SCRIPTS_DIR = path.join(TEST_DIR, 'scripts');
const SCRIPT_PATH = path.join(__dirname, '../../../scripts/setup-cursor-rules.js');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, '.cursor'), { recursive: true });
  await fs.mkdir(SCRIPTS_DIR, { recursive: true });
  
  // Create required validation scripts to avoid errors
  await fs.writeFile(
    path.join(SCRIPTS_DIR, 'validate-spec-format.js'),
    '// Mock validation script'
  );
  
  await fs.writeFile(
    path.join(SCRIPTS_DIR, 'validate-spec-strict.js'),
    '// Mock validation script'
  );
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  // Mock process.exit to avoid test termination
  const originalExit = process.exit;
  process.exit = (code) => {
    console.log(`Exiting with code: ${code}`);
    return code;
  };
  
  // Return cleanup function
  return () => {
    process.cwd = originalCwd;
    process.exit = originalExit;
  };
}

/**
 * Test the script execution
 */
async function testScriptExecution() {
  // Import the child_process module for execSync
  const { execSync } = await import('node:child_process');
  
  try {
    // Execute the script
    const output = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8' });
    
    // Verify the output indicates success
    assert(output.includes('Cursor rules setup complete'), 'Output should indicate successful setup');
    
    // Check if expected rules were created
    const expectedRules = [
      'checkmate-spec-format.json',
      'checkmate-verify-fail-fast.json',
      'checkmate-non-interactive.json',
      'checkmate-spec-drift.json'
    ];
    
    for (const ruleName of expectedRules) {
      const rulePath = path.join(RULES_DIR, ruleName);
      
      // Check if rule file exists
      const fileExists = await fs.access(rulePath).then(() => true).catch(() => false);
      assert(fileExists, `Rule file ${ruleName} should be created`);
      
      if (fileExists) {
        // Verify file content is valid JSON
        const content = await fs.readFile(rulePath, 'utf8');
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          assert.fail(`Rule file ${ruleName} should contain valid JSON`);
        }
        
        // Verify rule has required properties
        assert(parsed.name, `Rule ${ruleName} should have a name property`);
        assert(parsed.triggers, `Rule ${ruleName} should have triggers defined`);
        assert(parsed.actions, `Rule ${ruleName} should have actions defined`);
      }
    }
    
    console.log('✅ Script execution test passed');
  } catch (error) {
    console.error('Script execution failed:', error);
    throw error;
  }
}

/**
 * Test error handling when validation scripts are missing
 */
async function testMissingScripts() {
  // Delete the validation scripts
  await fs.unlink(path.join(SCRIPTS_DIR, 'validate-spec-format.js'));
  await fs.unlink(path.join(SCRIPTS_DIR, 'validate-spec-strict.js'));
  
  // Create a custom exit handler to capture the exit code
  let exitCode = 0;
  process.exit = (code) => {
    exitCode = code;
    console.log(`Exiting with code: ${code}`);
    return code;
  };
  
  try {
    // Import the child_process module for execSync
    const { execSync } = await import('node:child_process');
    
    // Execute the script, expecting it to find missing scripts
    const output = execSync(`node ${SCRIPT_PATH}`, { encoding: 'utf8', stdio: 'pipe' });
    
    // Check that it found missing scripts
    assert(output.includes('missing') || exitCode !== 0, 'Script should detect missing validation scripts');
    
    console.log('✅ Missing scripts test passed');
  } catch (error) {
    // execSync will throw an error if the script exits with non-zero status
    // This is actually expected behavior for this test
    if (error.stdout && error.stdout.includes('missing')) {
      console.log('✅ Missing scripts test passed (script exited with error as expected)');
    } else {
      console.error('Missing scripts test failed:', error);
      throw error;
    }
  }
}

/**
 * Main test function
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Test the script execution with all required scripts
    await testScriptExecution();
    
    // Test error handling with missing scripts
    await testMissingScripts();
    
    console.log('✅ PASS: All setup-cursor-rules tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 