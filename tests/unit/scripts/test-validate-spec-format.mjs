/**
 * Unit tests for validate-spec-format script
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
const SCRIPT_PATH = path.join(__dirname, '../../../scripts/validate-spec-format.js');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  
  // Create test files
  
  // Valid spec file
  const validSpec = `# Test Feature

## Description
This is a test feature description.

## Checks
- [ ] validate user input
- [ ] process data
- [x] display results

## Files
- src/test-file.js
- src/another-file.js

<!-- meta:
{
  "files": [
    "src/test-file.js",
    "src/another-file.js"
  ],
  "file_hashes": {
    "src/test-file.js": "SGFzaCBvZiB0ZXN0IGZpbGU=",
    "src/another-file.js": "SGFzaCBvZiBhbm90aGVyIGZpbGU="
  }
}
-->

<!-- generated via checkmate spec v0.5 on 2023-05-09 -->
`;

  // Invalid spec file (missing sections)
  const invalidSpec = `# Test Feature

Some random content without proper sections.

- Item 1
- Item 2
`;

  // Fixable spec file (missing generation note)
  const fixableSpec = `# Test Feature

## Description
This is a test feature description.

## Checks
- [ ] validate user input
- [ ] process data
- [x] display results

## Files
- src/test-file.js
- src/another-file.js

<!-- meta:
{
  "files": [
    "src/test-file.js",
    "src/another-file.js"
  ],
  "file_hashes": {
    "src/test-file.js": "SGFzaCBvZiB0ZXN0IGZpbGU=",
    "src/another-file.js": "SGFzaCBvZiBhbm90aGVyIGZpbGU="
  }
}
-->
`;

  // Write test files
  await fs.writeFile(path.join(TEST_DIR, 'valid-spec.md'), validSpec);
  await fs.writeFile(path.join(TEST_DIR, 'invalid-spec.md'), invalidSpec);
  await fs.writeFile(path.join(TEST_DIR, 'fixable-spec.md'), fixableSpec);
  
  // Return cleanup function
  return () => {
    // No cleanup needed for this test
  };
}

/**
 * Test the script execution with a valid spec
 */
async function testValidSpec() {
  try {
    const { stdout, stderr } = await execAsync(`node ${SCRIPT_PATH} ${path.join(TEST_DIR, 'valid-spec.md')}`);
    
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
    await execAsync(`node ${SCRIPT_PATH} ${path.join(TEST_DIR, 'invalid-spec.md')}`);
    
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
 * Test the script execution with a fixable spec
 */
async function testFixableSpec() {
  try {
    // Run with --fix flag
    await execAsync(`node ${SCRIPT_PATH} ${path.join(TEST_DIR, 'fixable-spec.md')} --fix`);
    
    // Read the fixed file
    const fixedContent = await fs.readFile(path.join(TEST_DIR, 'fixable-spec.md'), 'utf8');
    
    // Check if missing generation note was added
    assert(fixedContent.includes('generated via checkmate spec'), 'Generation note should be added');
    
    console.log('✅ Fixable spec test passed');
  } catch (error) {
    console.error('Fixable spec test failed:', error);
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
    
    // Test with fixable spec
    await testFixableSpec();
    
    console.log('✅ PASS: All validate-spec-format tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 