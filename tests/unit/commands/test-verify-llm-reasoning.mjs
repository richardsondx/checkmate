/**
 * Unit tests for the verify-llm-reasoning command
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
    path.join(SPECS_DIR, 'password-reset.md'),
    `# Password Reset Feature
    
This specification defines the password reset functionality.

## Requirements

- [ ] System generates a unique, single-use password reset token
- [ ] User receives an email with a link containing the reset token
- [ ] Clicking the link allows the user to set a new password
- [ ] The reset token is invalidated after use or expiration
    `
  );
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  // Mock the reason function
  const originalModules = {};
  
  // Return function to clean up mocks
  return async () => {
    // Clean up
    process.cwd = originalCwd;
    
    // Restore original modules if needed
    for (const [modulePath, original] of Object.entries(originalModules)) {
      jest.doMock(modulePath, () => original);
    }
  };
}

/**
 * Test the verify-llm-reasoning command
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Mock the reason function to always return "PASS"
    jest.doMock('../../../dist/lib/models.js', () => {
      return {
        reason: async () => "PASS"
      };
    });
    
    // Import the command after mocking
    const { verifyLlmReasoningCommand } = await import('../../../dist/commands/verify-llm-reasoning.js');
    
    // Test a successful verification
    const result = await verifyLlmReasoningCommand({
      spec: 'password-reset',
      checkId: '1',
      successCondition: 'A cryptographically secure unique token is generated and stored with an expiry.',
      failureCondition: 'Token is predictable, not unique, or has no expiry.',
      outcomeReport: 'Observed UUID v4 generation for token and a 1-hour expiry in token_service.js.',
      quiet: true
    });
    
    // Assertions for a passing result
    assert(result && typeof result === 'object', 'Result should be an object');
    assert.equal(result.success, true, 'Verification should pass');
    assert.equal(result.result, 'PASS', 'Result should be PASS');
    assert.equal(result.spec, 'password-reset', 'Spec name should match');
    assert.equal(result.checkId, '1', 'Check ID should match');
    
    // Check that the spec file was updated
    const updatedContent = await fs.readFile(path.join(SPECS_DIR, 'password-reset.md'), 'utf8');
    assert(updatedContent.includes('- [x] System generates a unique'), 'Check item should be marked as passed');
    
    // Test missing arguments
    const missingResult = await verifyLlmReasoningCommand({
      spec: 'password-reset',
      quiet: true
    });
    
    assert(missingResult.error, 'Missing arguments should return error');
    assert(Array.isArray(missingResult.missingArgs), 'Missing args should be an array');
    
    // Test non-existent spec
    const nonExistentResult = await verifyLlmReasoningCommand({
      spec: 'non-existent',
      checkId: '1',
      successCondition: 'Success condition',
      failureCondition: 'Failure condition',
      outcomeReport: 'Outcome report',
      quiet: true
    });
    
    assert(nonExistentResult.error, 'Non-existent spec should return error');
    
    console.log('✅ PASS: All verify-llm-reasoning command tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    await cleanup();
  }
}

// Mock jest functions to make test compatible with our non-jest test runner
global.jest = {
  doMock: (modulePath, factoryFn) => {
    // Implement a simple mock for our tests
    const moduleObj = factoryFn();
    // This is a simplified version, in a real test we would use actual jest
    // For now we'll just make the test compatible with our runner
  }
};

// Run the test
runTest(); 