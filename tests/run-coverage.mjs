#!/usr/bin/env node

/**
 * Test coverage analyzer for CheckMate
 * This script analyzes the codebase and reports on test coverage
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

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

// Source code directories to analyze
const SOURCE_DIRS = ['src/commands', 'scripts'];

// Test directories
const TEST_DIRS = ['tests/unit', 'tests/integration'];

/**
 * Get all files in a directory recursively
 */
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      fileList = getFiles(filePath, fileList);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mjs')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Get all source files that should be tested
 */
function getSourceFiles() {
  let allFiles = [];
  
  SOURCE_DIRS.forEach(dir => {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      allFiles = [...allFiles, ...getFiles(fullDir)];
    }
  });
  
  return allFiles;
}

/**
 * Get all test files
 */
function getTestFiles() {
  let allFiles = [];
  
  TEST_DIRS.forEach(dir => {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      allFiles = [...allFiles, ...getFiles(fullDir)];
    }
  });
  
  return allFiles;
}

/**
 * Analyze file coverage
 */
function analyzeFileCoverage() {
  const sourceFiles = getSourceFiles();
  const testFiles = getTestFiles();
  
  console.log(`\n${colors.magenta}CheckMate Test Coverage Analysis${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(40)}${colors.reset}\n`);
  
  console.log(`${colors.blue}Source files: ${sourceFiles.length}${colors.reset}`);
  console.log(`${colors.blue}Test files: ${testFiles.length}${colors.reset}`);
  
  // Check for command files without corresponding test files
  const commandFiles = sourceFiles.filter(file => file.includes('src/commands'));
  const scriptFiles = sourceFiles.filter(file => file.includes('scripts'));
  
  // Map command files to test file patterns
  const commandTests = new Map();
  const scriptTests = new Map();
  
  commandFiles.forEach(file => {
    const baseName = path.basename(file, path.extname(file));
    const testPattern = `test-${baseName}`;
    commandTests.set(baseName, {
      sourceFile: file,
      hasTest: testFiles.some(tf => path.basename(tf).includes(testPattern)),
      testFiles: testFiles.filter(tf => path.basename(tf).includes(testPattern))
    });
  });
  
  scriptFiles.forEach(file => {
    const baseName = path.basename(file, path.extname(file));
    const testPattern = `test-${baseName}`;
    scriptTests.set(baseName, {
      sourceFile: file,
      hasTest: testFiles.some(tf => path.basename(tf).includes(testPattern)),
      testFiles: testFiles.filter(tf => path.basename(tf).includes(testPattern))
    });
  });
  
  // Report command test coverage
  console.log(`\n${colors.magenta}Command Test Coverage${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(40)}${colors.reset}\n`);
  
  let coveredCommands = 0;
  
  for (const [command, data] of commandTests.entries()) {
    if (data.hasTest) {
      console.log(`${colors.green}✓ ${command}${colors.reset} - ${data.testFiles.length} test file(s)`);
      coveredCommands++;
    } else {
      console.log(`${colors.red}✗ ${command}${colors.reset} - No test file found`);
    }
  }
  
  const commandCoverage = (coveredCommands / commandTests.size) * 100;
  console.log(`\n${colors.blue}Command Test Coverage: ${commandCoverage.toFixed(2)}% (${coveredCommands}/${commandTests.size})${colors.reset}`);
  
  // Report script test coverage
  console.log(`\n${colors.magenta}Script Test Coverage${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(40)}${colors.reset}\n`);
  
  let coveredScripts = 0;
  
  for (const [script, data] of scriptTests.entries()) {
    if (data.hasTest) {
      console.log(`${colors.green}✓ ${script}${colors.reset} - ${data.testFiles.length} test file(s)`);
      coveredScripts++;
    } else {
      console.log(`${colors.red}✗ ${script}${colors.reset} - No test file found`);
    }
  }
  
  const scriptCoverage = (coveredScripts / scriptTests.size) * 100;
  console.log(`\n${colors.blue}Script Test Coverage: ${scriptCoverage.toFixed(2)}% (${coveredScripts}/${scriptTests.size})${colors.reset}`);
  
  // Overall coverage
  const totalCoverage = ((coveredCommands + coveredScripts) / (commandTests.size + scriptTests.size)) * 100;
  console.log(`\n${colors.magenta}Overall Test Coverage: ${totalCoverage.toFixed(2)}%${colors.reset}\n`);
  
  return {
    commandTests,
    scriptTests,
    commandCoverage,
    scriptCoverage,
    totalCoverage
  };
}

// Run the analysis
const coverage = analyzeFileCoverage();

// Export for use in other scripts
export { coverage }; 