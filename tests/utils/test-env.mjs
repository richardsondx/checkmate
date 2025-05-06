/**
 * Test environment utilities
 * 
 * This module provides helper functions for setting up test environments
 * and mocking dependencies in checkmateai tests.
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

// Get the project root directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

/**
 * Sets up a fresh test environment with the necessary directory structure
 * 
 * @param {string} testName - Name of the test, used for directory naming
 * @param {object} options - Additional options
 * @param {boolean} options.createSpecs - Whether to create specs directory
 * @returns {object} Test environment info
 */
export function setupTestEnvironment(testName, options = {}) {
  // Default options
  const opts = {
    createSpecs: true,
    ...options
  };

  // Create test directory
  const testDir = join(projectRoot, 'temp-test', `${testName}-test`);
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs",
    models: {
      quick: "gpt-3.5-turbo",
      reason: "gpt-4o"
    }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create specs directory if needed
  const specsDir = join(testDir, 'checkmate', 'specs');
  if (opts.createSpecs) {
    fs.mkdirSync(specsDir, { recursive: true });
  }
  
  // Set environment variables
  process.env.CHECKMATE_HOME = testDir;
  process.env.TEST_ENV = 'true';
  
  return {
    testDir,
    specsDir,
    configPath
  };
}

/**
 * Creates a test spec file with the given content
 * 
 * @param {string} specsDir - Path to the specs directory
 * @param {string} name - Name of the spec file (without extension)
 * @param {string} content - Content of the spec file
 * @returns {string} Path to the created spec file
 */
export function createTestSpec(specsDir, name, content) {
  const specPath = join(specsDir, `${name}.md`);
  fs.writeFileSync(specPath, content);
  return specPath;
}

/**
 * Cleans up the test environment
 * 
 * @param {string} testDir - Path to the test directory
 */
export function cleanupTestEnvironment(testDir) {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Error cleaning up test directory:', err);
  }
}

/**
 * Returns a mock for AI model functions to avoid actual API calls in tests
 */
export function getMockModelFunctions() {
  return {
    reason: async (prompt, system) => {
      return JSON.stringify({
        suggestion: "This is a mock suggestion for testing",
        next_action: "fix-code",
        reason: "This is a mock reason for testing"
      });
    },
    quick: async (prompt, system) => {
      return "pass This test passed in the mock environment";
    },
    callModel: async (slot, system, prompt) => {
      return slot === 'quick' 
        ? "pass This is a quick model mock response"
        : JSON.stringify({
            suggestion: "This is a mock suggestion",
            next_action: "fix-code",
            reason: "This is a mock reason"
          });
    }
  };
} 