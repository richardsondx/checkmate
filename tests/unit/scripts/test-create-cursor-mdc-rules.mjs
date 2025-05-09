/**
 * Unit tests for create-cursor-mdc-rules script
 */
import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '../../.test-tmp');
const RULES_DIR = path.join(TEST_DIR, '.cursor/rules');
const SCRIPT_PATH = path.join(__dirname, '../../../scripts/create-cursor-mdc-rules.js');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(path.join(TEST_DIR, '.cursor'), { recursive: true });
  
  // Add some old JSON rules to be removed
  const oldRulesDir = path.join(TEST_DIR, '.cursor/rules');
  await fs.mkdir(oldRulesDir, { recursive: true });
  await fs.writeFile(
    path.join(oldRulesDir, 'checkmate-non-interactive.json'),
    '{"name": "old-rule"}'
  );
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  // Return cleanup function
  return () => {
    process.cwd = originalCwd;
  };
}

/**
 * Test the script execution
 */
async function testScriptExecution() {
  // Run the script to create the rules
  try {
    const { stdout } = await execAsync(`node ${SCRIPT_PATH}`);
    
    // Verify the output indicates success
    assert(stdout.includes('rules setup complete'), 'Output should indicate successful creation');
    
    // Check if expected MDC rule files were created
    const expectedMdcRules = [
      'pre-task.mdc',
      'post-task.mdc',
      'post-push.mdc',
      'checkmate-non-interactive.mdc',
      'checkmate-spec-format.mdc',
      'checkmate-spec-drift.mdc',
      'checkmate-spec-drift-on-save.mdc',
      'checkmate-spec-creator.mdc',
      'checkmate-spec-fixer.mdc',
      'checkmate-feature-validation-workflow.mdc',
      'checkmate-auto-fix-enforce.mdc'
    ];
    
    for (const ruleName of expectedMdcRules) {
      const ruleExists = await fs.access(path.join(RULES_DIR, ruleName))
        .then(() => true)
        .catch(() => false);
      
      assert(ruleExists, `Rule file ${ruleName} should be created`);
      
      if (ruleExists) {
        // Verify file content
        const content = await fs.readFile(path.join(RULES_DIR, ruleName), 'utf8');
        assert(content.length > 0, `Rule file ${ruleName} should have content`);
      }
    }
    
    // Check that old JSON rules were removed
    const oldJsonRuleExists = await fs.access(path.join(RULES_DIR, 'checkmate-non-interactive.json'))
      .then(() => true)
      .catch(() => false);
    
    assert(!oldJsonRuleExists, 'Old JSON rule should be removed');
    
    console.log('✅ Script execution test passed');
  } catch (error) {
    console.error('Script execution failed:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Test the script by executing it
    await testScriptExecution();
    
    console.log('✅ PASS: All create-cursor-mdc-rules tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 