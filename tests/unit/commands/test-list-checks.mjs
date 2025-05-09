/**
 * Unit tests for the list-checks command
 */
import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '../../.test-tmp');
const SPECS_DIR = path.join(TEST_DIR, 'checkmate/specs');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(SPECS_DIR, { recursive: true });
  
  // Create test spec file with check items
  await fs.writeFile(
    path.join(SPECS_DIR, 'test-feature.md'),
    `# Test Feature
    
This is a test feature specification.

## Requirements

- [ ] First check item that is unchecked
- [x] Second check item that is checked
- [/] Third check item that is failing
    `
  );
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  return () => {
    // Clean up
    process.cwd = originalCwd;
  };
}

/**
 * Test the list-checks command
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    const { listChecksCommand } = await import('../../../dist/commands/list-checks.js');
    
    // Test with valid spec
    const result = await listChecksCommand({
      spec: 'test-feature',
      format: 'json',
      quiet: true
    });
    
    // Assertions
    assert(result && typeof result === 'object', 'Result should be an object');
    assert.equal(result.title, 'Test Feature', 'Title should match');
    assert.equal(result.spec, 'test-feature', 'Spec name should match');
    assert(Array.isArray(result.checks), 'Checks should be an array');
    
    // Check array content
    assert(result.checks.length >= 3, 'Should have at least 3 check items');
    
    // Check formatting for first item (unchecked)
    assert.equal(result.checks[0].id, '1', 'First check should have ID 1');
    assert(result.checks[0].text.includes('First check'), 'First check text should match');
    
    // Test with non-existent spec
    const errorResult = await listChecksCommand({
      spec: 'nonexistent-spec',
      quiet: true
    });
    
    assert(errorResult.error, 'Non-existent spec should return error');
    
    // Test with no spec
    const noSpecResult = await listChecksCommand({
      quiet: true
    });
    
    assert(noSpecResult.error, 'No spec should return error');
    
    console.log('✅ PASS: All list-checks command tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 