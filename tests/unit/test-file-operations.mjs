/**
 * Basic unit tests for file, string and array operations
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert';

/**
 * Test function that performs actual tests
 */
export function runTest() {
  try {
    // 1. Test file operations
    const tempFilePath = path.join(process.cwd(), 'checkmate', 'test-temp.txt');
    
    // Write test data
    fs.writeFileSync(tempFilePath, 'Test data for verification', 'utf8');
    
    // Read and verify data
    const readData = fs.readFileSync(tempFilePath, 'utf8');
    assert.strictEqual(readData, 'Test data for verification', 'Data verification failed');
    
    // Clean up
    fs.unlinkSync(tempFilePath);
    
    // 2. Test string operations
    const testString = 'CheckMate Test';
    const lowercased = testString.toLowerCase();
    assert.strictEqual(lowercased, 'checkmate test', 'String lowercase test failed');
    
    // 3. Test array operations
    const testArray = [1, 2, 3, 4, 5];
    const sum = testArray.reduce((acc, val) => acc + val, 0);
    assert.strictEqual(sum, 15, 'Array sum test failed');
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

/**
 * Test function that validates input
 */
export function validateTest(input) {
  // Validate different types of input
  if (input === null || input === undefined) {
    return false;
  }
  
  if (typeof input === 'string' && input.trim() === '') {
    return false;
  }
  
  if (Array.isArray(input) && input.length === 0) {
    return false;
  }
  
  if (typeof input === 'object' && Object.keys(input).length === 0) {
    return false;
  }
  
  return true;
} 