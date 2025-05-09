/**
 * Unit tests for the find command
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
  
  // Create test specs
  await fs.writeFile(
    path.join(SPECS_DIR, 'user-auth.md'),
    '# User Authentication\n\nThis spec describes user authentication functionality.\n\n- [ ] Verify user credentials\n- [ ] Generate JWT token\n- [ ] Store refresh token in database'
  );
  
  await fs.writeFile(
    path.join(SPECS_DIR, 'user-profile.md'),
    '# User Profile\n\nThis spec describes user profile management.\n\n- [ ] Update user details\n- [ ] Upload profile picture\n- [ ] Change password'
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
 * Test the find command
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    const { findCommand } = await import('../../../dist/commands/find.js');
    
    // Test finding specs with query
    const result = await findCommand({
      query: 'authentication',
      quiet: true,
      json: true
    });
    
    // Assertions
    assert(result && typeof result === 'object', 'Result should be an object');
    assert(Array.isArray(result.matches), 'Result should have matches array');
    
    // Check if the mocked AI model returned matches
    if (result.matches.length > 0) {
      const authMatch = result.matches.find(match => 
        path.basename(match.path) === 'user-auth.md'
      );
      
      assert(authMatch, 'Should find the user-auth.md spec');
      assert(typeof authMatch.relevance === 'number', 'Relevance should be a number');
      assert(authMatch.relevance >= 0 && authMatch.relevance <= 1, 'Relevance should be between 0 and 1');
    }
    
    // Test with empty query
    const emptyResult = await findCommand({
      query: '',
      quiet: true
    });
    
    assert(emptyResult.error, 'Empty query should return error');
    
    console.log('✅ PASS: All find command tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 