#!/usr/bin/env node

/**
 * Simple test runner for CheckMate tests
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));

// Test directories to run
const TEST_DIRS = ['unit', 'integration'];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Run a test file and return a promise that resolves when the test completes
 */
function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n${colors.blue}Running test: ${colors.cyan}${testFile}${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    
    // Clone current environment and add TEST_ENV
    const env = Object.assign({}, process.env);
    env.TEST_ENV = 'true';
    
    const testProcess = spawn('node', [testFile], { 
      stdio: 'inherit',
      env: env
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}✓ Test passed: ${testFile}${colors.reset}`);
        resolve(true);
      } else {
        console.log(`\n${colors.red}✗ Test failed: ${testFile}${colors.reset}`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (err) => {
      console.error(`\n${colors.red}Error running test: ${testFile}${colors.reset}`);
      console.error(err);
      resolve(false);
    });
  });
}

/**
 * Recursively find all test files in a directory
 */
function findTestFiles(dir) {
  let testFiles = [];
  
  if (!fs.existsSync(dir)) {
    return testFiles;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      testFiles = [...testFiles, ...findTestFiles(fullPath)];
    } else if (entry.isFile() && entry.name.startsWith('test-') && entry.name.endsWith('.mjs')) {
      testFiles.push(fullPath);
    }
  }
  
  return testFiles;
}

/**
 * Run all tests in the specified directories
 */
async function runTests() {
  console.log(`\n${colors.magenta}CheckMate Test Runner${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(30)}${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const dir of TEST_DIRS) {
    const testDir = join(__dirname, dir);
    
    if (!fs.existsSync(testDir)) {
      console.log(`${colors.yellow}Directory not found: ${testDir}${colors.reset}`);
      continue;
    }
    
    console.log(`\n${colors.magenta}Running tests in: ${colors.cyan}${dir}${colors.reset}`);
    console.log(`${colors.magenta}${'='.repeat(30)}${colors.reset}\n`);
    
    const testFiles = findTestFiles(testDir);
    
    for (const testFile of testFiles) {
      const result = await runTest(testFile);
      if (result) {
        passed++;
      } else {
        failed++;
      }
    }
  }
  
  // Print summary
  console.log(`\n${colors.magenta}Test Summary${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(30)}${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);
  console.log(`${colors.magenta}Total: ${passed + failed + skipped}${colors.reset}\n`);
  
  // Return exit code
  return failed === 0 ? 0 : 1;
}

// Run the tests and exit with appropriate code
runTests().then(exitCode => {
  process.exit(exitCode);
}); 