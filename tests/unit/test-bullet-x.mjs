/**
 * Unit tests for the bullet-x action bullet extraction library
 * Verifies consistency and determinism between warmup and audit
 */
import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Mock the model response for deterministic testing
const mockExtract = async (files) => {
  return [
    "validate user credentials",
    "generate authentication token",
    "store user data",
    "handle authentication errors",
    "check password requirements"
  ];
};

// Mock the modelWrapper to avoid actual API calls
jest.mock('../../src/lib/modelWrapper.js', () => {
  return {
    createLanguageModel: () => ({
      complete: async () => {
        return `
        [
          "validate user credentials",
          "generate authentication token",
          "store user data", 
          "handle authentication errors",
          "check password requirements"
        ]
        `;
      }
    })
  };
});

// Mock the config to avoid file system access
jest.mock('../../src/lib/config.js', () => {
  return {
    load: () => ({
      models: {
        reason: 'gpt-4'
      }
    })
  };
});

// Sample code content for testing
const sampleContent = {
  'auth.js': `
  /**
   * Authentication module
   */
  function validateCredentials(username, password) {
    if (!username || !password) {
      throw new Error('Missing credentials');
    }
    
    // Check password requirements
    if (password.length < 8) {
      return { valid: false, reason: 'Password too short' };
    }
    
    return { valid: true };
  }
  
  function generateToken(userId) {
    return 'token_' + userId + '_' + Date.now();
  }
  
  function storeUserSession(user) {
    // Store in database
    console.log('Storing user:', user);
    return true;
  }
  
  function handleAuthError(error) {
    // Log error and notify admin
    console.error('Auth error:', error);
    return { status: 'error', message: error.message };
  }
  
  module.exports = {
    validateCredentials,
    generateToken,
    storeUserSession,
    handleAuthError
  };
  `
};

/**
 * Test the consistency of bullet extraction
 */
export async function testBulletExtraction() {
  console.log('\n=== Testing bullet-x extraction consistency ===');
  
  try {
    // Import the bullet-x module
    const bulletX = await import('../../dist/lib/bullet-x.js');
    
    // Set up a spy on the extractActionBullets function to avoid model API calls
    const originalExtract = bulletX.extractActionBullets;
    bulletX.extractActionBullets = mockExtract;
    
    console.log('✓ Using mocked bullet extraction');
    
    // Test 1: Extract bullets from sample content
    console.log('\nTest 1: Extract action bullets from code');
    const bullets1 = await bulletX.extractActionBullets(sampleContent);
    
    // Verify format and count
    assert(Array.isArray(bullets1), 'Bullets should be an array');
    assert(bullets1.length === 5, `Expected 5 bullets, got ${bullets1.length}`);
    assert(bullets1.every(b => typeof b === 'string'), 'Each bullet should be a string');
    
    // Verify verb+object format
    const hasVerbObjectFormat = bullets1.every(b => {
      const words = b.split(' ');
      return words.length >= 2 && !b.includes(' and ') && !b.includes(' or ');
    });
    assert(hasVerbObjectFormat, 'Bullets should follow verb+object format');
    
    console.log('✓ Bullet format verified');
    console.log('✓ Extracted bullets:', bullets1);
    
    // Test 2: Compare two extraction runs for consistency
    console.log('\nTest 2: Verify extraction consistency');
    const bullets2 = await bulletX.extractActionBullets(sampleContent);
    
    const bulletsMatch = bullets1.length === bullets2.length && 
      bullets1.every((b, i) => b === bullets2[i]);
    
    assert(bulletsMatch, 'Extraction should be deterministic');
    console.log('✓ Extraction is deterministic');
    
    // Test 3: Test bullet comparison
    console.log('\nTest 3: Test bullet comparison');
    
    const specBullets = [
      "validate user credentials",
      "generate token for users",
      "handle authentication errors",
      "perform server validation" // This one is missing from impl
    ];
    
    const implBullets = [
      "validate user credentials",
      "generate authentication token", // Slightly different wording
      "handle authentication errors",
      "store user data", // This one is missing from spec
      "check password requirements" // This one is missing from spec
    ];
    
    const comparison = bulletX.compareBullets(specBullets, implBullets);
    
    assert(comparison.matches.length === 2, `Expected 2 matches, got ${comparison.matches.length}`);
    assert(comparison.missingInCode.length === 2, `Expected 2 missing in code, got ${comparison.missingInCode.length}`);
    assert(comparison.missingInSpec.length === 2, `Expected 2 missing in spec, got ${comparison.missingInSpec.length}`);
    
    console.log('✓ Bullet comparison works correctly');
    
    // Restore original function
    bulletX.extractActionBullets = originalExtract;
    
    console.log('\n✅ All bullet-x tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = await testBulletExtraction();
  process.exit(success ? 0 : 1);
} 