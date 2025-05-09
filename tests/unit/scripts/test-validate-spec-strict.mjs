/**
 * Unit tests for validate-spec-strict script
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
const SPECS_DIR = path.join(TEST_DIR, 'checkmate/specs');
const SCRIPT_PATH = path.join(__dirname, '../../../scripts/validate-spec-strict.js');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(SPECS_DIR, { recursive: true });
  
  // Create test files
  
  // Valid spec file
  const validSpec = `# Test Feature

## Checks
- [ ] validate user input
- [ ] process data
- [x] display results

<!-- meta:
{
  "files": [],
  "file_hashes": {}
}
-->

<!-- generated via checkmate spec v0.5 on 2023-05-09 -->
`;

  // Invalid spec file (missing checks section)
  const invalidSpec = `# Test Feature

Some random content without proper sections.

- Item 1
- Item 2

<!-- meta:
{
  "files": [],
  "file_hashes": {}
}
-->
`;

  // Write test files
  await fs.writeFile(path.join(SPECS_DIR, 'valid-spec.md'), validSpec);
  await fs.writeFile(path.join(SPECS_DIR, 'invalid-spec.md'), invalidSpec);
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  // Return cleanup function
  return () => {
    process.cwd = originalCwd;
  };
}

/**
 * Test the script execution with a valid spec
 */
async function testValidSpec() {
  try {
    const { stdout, stderr } = await execAsync(`node ${SCRIPT_PATH} ${path.join(SPECS_DIR, 'valid-spec.md')}`);
    
    assert(stdout.includes('Spec format valid'), 'Output should indicate valid spec');
    assert(!stderr, 'No error output expected');
    
    console.log('✅ Valid spec test passed');
  } catch (error) {
    console.error('Valid spec test failed:', error);
    throw error;
  }
}

/**
 * Test the script execution with an invalid spec
 */
async function testInvalidSpec() {
  try {
    await execAsync(`node ${SCRIPT_PATH} ${path.join(SPECS_DIR, 'invalid-spec.md')}`);
    
    // Should not reach here because the script should exit with error
    assert.fail('Script should have exited with error for invalid spec');
  } catch (error) {
    // Expected to fail
    assert(error.stdout && error.stdout.includes('Spec format invalid'), 'Output should indicate invalid spec');
    assert(error.status === 1, 'Exit code should be 1');
    
    console.log('✅ Invalid spec test passed (script exited with error as expected)');
  }
}

/**
 * Test validation of all specs
 */
async function testAllSpecs() {
  try {
    // Should fail because one spec is invalid
    await execAsync(`node ${SCRIPT_PATH}`);
    
    // Should not reach here
    assert.fail('Script should have exited with error when validating all specs');
  } catch (error) {
    // Expected to fail
    assert(error.stdout && error.stdout.includes('Found 1 invalid specs'), 'Output should indicate number of invalid specs');
    assert(error.status === 1, 'Exit code should be 1');
    
    console.log('✅ All specs validation test passed (script exited with error as expected)');
  }
  
  // Create another valid spec to test the case where all specs are valid
  const anotherValidSpec = `# Another Valid Spec

## Checks
- [ ] check item one
- [x] check item two

<!-- meta:
{
  "files": [],
  "file_hashes": {}
}
-->
`;

  // Remove the invalid spec
  await fs.unlink(path.join(SPECS_DIR, 'invalid-spec.md'));
  
  // Add another valid spec
  await fs.writeFile(path.join(SPECS_DIR, 'another-valid-spec.md'), anotherValidSpec);
  
  try {
    const { stdout } = await execAsync(`node ${SCRIPT_PATH}`);
    
    assert(stdout.includes('All 2 specs are valid'), 'Output should indicate all specs are valid');
    
    console.log('✅ All valid specs test passed');
  } catch (error) {
    console.error('All valid specs test failed:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Test with valid spec
    await testValidSpec();
    
    // Test with invalid spec
    await testInvalidSpec();
    
    // Test with all specs
    await testAllSpecs();
    
    console.log('✅ PASS: All validate-spec-strict tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 