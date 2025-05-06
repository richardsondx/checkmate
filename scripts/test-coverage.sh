#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}=== CheckMate Test Runner and Coverage Analysis ===${NC}\n"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run tests.${NC}"
    exit 1
fi

# Run the coverage analysis
echo -e "${BLUE}Analyzing test coverage...${NC}"
node tests/run-coverage.mjs

# Ask user if they want to run tests
echo -e "\n${YELLOW}Do you want to run the tests? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "\n${BLUE}Running all tests...${NC}\n"
    npm test
    
    test_exit_code=$?
    
    if [ $test_exit_code -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed successfully!${NC}"
    else
        echo -e "\n${RED}Some tests failed. Please check the output above for details.${NC}"
    fi
    
    # Ask if user wants to create tests for uncovered commands
    echo -e "\n${YELLOW}Do you want to create tests for uncovered commands? (y/n)${NC}"
    read -r create_response
    
    if [[ "$create_response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "\n${BLUE}Which command or script do you want to create a test for?${NC}"
        read -r command_name
        
        if [ -z "$command_name" ]; then
            echo -e "${RED}No command name provided. Exiting.${NC}"
            exit 1
        fi
        
        # Check if it's a command or script
        if [ -f "src/commands/${command_name}.ts" ]; then
            # Create command test
            test_file="tests/unit/commands/test-${command_name}.mjs"
            
            if [ -f "$test_file" ]; then
                echo -e "${YELLOW}Test file already exists: ${test_file}${NC}"
            else
                echo -e "${GREEN}Creating test for command: ${command_name}${NC}"
                
                # Create test directory if it doesn't exist
                mkdir -p tests/unit/commands
                
                # Create a basic test template
                cat > "$test_file" << EOF
#!/usr/bin/env node
/**
 * Unit test for the ${command_name} command
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testDir = join(projectRoot, 'temp-test', '${command_name}-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create test spec directory
  const testSpecsDir = join(testDir, 'checkmate', 'specs');
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Add any test fixtures here if needed
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Set environment variables for testing
    process.env.CHECKMATE_HOME = testDir;
    process.env.TEST_ENV = 'true';
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    try {
      // Import the module
      const commandModule = await import('../../../dist/commands/${command_name}.js');
      
      // Test module exports - use named exports as appropriate
      // Uncomment and modify the assertions based on the command's exports
      // assert.strictEqual(typeof commandModule.someExportedFunction, 'function', "Export should be a function");
      
      // Mock any external commands that might be called
      // This prevents tests from triggering actual command execution
      
      // Add your tests here
      
      console.log('\n✅ PASS: All ${command_name} command tests passed');
      return true;
    } finally {
      // Reset to the original directory
      process.chdir(originalCwd);
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
});
EOF
                
                echo -e "${GREEN}Test file created: ${test_file}${NC}"
                echo -e "${YELLOW}Please edit the file to add specific tests for the ${command_name} command.${NC}"
            fi
        elif [ -f "scripts/${command_name}.js" ]; then
            # Create script test
            test_file="tests/unit/scripts/test-${command_name}.mjs"
            
            if [ -f "$test_file" ]; then
                echo -e "${YELLOW}Test file already exists: ${test_file}${NC}"
            else
                echo -e "${GREEN}Creating test for script: ${command_name}${NC}"
                
                # Create test directory if it doesn't exist
                mkdir -p tests/unit/scripts
                
                # Create a basic test template
                cat > "$test_file" << EOF
#!/usr/bin/env node
/**
 * Unit test for the ${command_name} script
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawn } from 'child_process';

// Get directory of this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

// Set up test environment
const testDir = join(projectRoot, 'temp-test', '${command_name}-test');

// Setup test environment
function setupTestEnvironment() {
  // Create directory structure
  fs.mkdirSync(testDir, { recursive: true });
  
  // Create .checkmate config
  const configPath = join(testDir, '.checkmate');
  const config = {
    spec_dir: "./checkmate/specs"
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Create test spec directory
  const testSpecsDir = join(testDir, 'checkmate', 'specs');
  fs.mkdirSync(testSpecsDir, { recursive: true });
  
  // Add any test fixtures here if needed
}

// Run the script
function runScript(args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(projectRoot, 'scripts/${command_name}.js');
    const process = spawn('node', [scriptPath, ...args], { 
      cwd: testDir,
      env: {
        ...process.env,
        CHECKMATE_HOME: testDir,
        TEST_ENV: 'true'
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTest() {
  try {
    // Setup test environment
    setupTestEnvironment();
    
    // Set environment variables for testing
    process.env.CHECKMATE_HOME = testDir;
    process.env.TEST_ENV = 'true';
    
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    try {
      // Add your tests here
      // Example: 
      // const result = await runScript(['--arg1', 'value1']);
      // assert.strictEqual(result.code, 0, "Script should exit with code 0");
      
      console.log('\n✅ PASS: All ${command_name} script tests passed');
      return true;
    } finally {
      // Reset to the original directory
      process.chdir(originalCwd);
    }
  } catch (error) {
    console.error('❌ FAIL:', error);
    return false;
  } finally {
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
});
EOF
                
                echo -e "${GREEN}Test file created: ${test_file}${NC}"
                echo -e "${YELLOW}Please edit the file to add specific tests for the ${command_name} script.${NC}"
            fi
        else
            echo -e "${RED}Could not find command or script: ${command_name}${NC}"
            echo -e "${YELLOW}Make sure the command exists in src/commands or scripts directory.${NC}"
        fi
    fi
else
    echo -e "\n${YELLOW}Skipping tests.${NC}"
fi

echo -e "\n${MAGENTA}Test runner complete!${NC}"
exit 0 