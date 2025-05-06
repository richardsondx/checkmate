#!/usr/bin/env node
/**
 * Unit test for the scaffold command
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
const testDir = join(projectRoot, 'temp-test', 'scaffold-test');

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
  
  // Create checkmate specs directory
  fs.mkdirSync(join(testDir, 'checkmate', 'specs'), { recursive: true });
  
  // Create a spec file with file requirements
  const specPath = join(testDir, 'checkmate', 'specs', 'user-management.md');
  fs.writeFileSync(specPath, `# User Management Feature
  
This feature handles user management functionality.

## Files
- src/models/User.js: User data model
- src/controllers/UserController.js: Controller for user operations
- src/views/users/UserList.js: View for displaying users
- src/views/users/UserForm.js: Form for adding/editing users

## Requirements
- Users should be able to register
- Users should be able to update their profile
- Admins should be able to view all users
`);
  
  return { specPath };
}

async function runTest() {
  try {
    // Setup test environment
    const { specPath } = setupTestEnvironment();
    
    // Set environment variables
    process.env.CHECKMATE_HOME = testDir;
    
    // Import the module
    const { default: scaffoldSpec } = await import('../../../dist/commands/scaffold.js');
    
    // Run the scaffold command
    // Note: The module exports the function directly, not wrapped in an object
    await scaffoldSpec('user-management', {
      title: "User Management Feature",
      files: [
        "src/models/User.js",
        "src/controllers/UserController.js",
        "src/views/users/UserList.js",
        "src/views/users/UserForm.js"
      ],
      requirements: [
        "Users should be able to register",
        "Users should be able to update their profile",
        "Admins should be able to view all users"
      ]
    });
    
    // Verify the files were created based on the spec
    assert.ok(fs.existsSync(join(testDir, 'src', 'models', 'User.js')), 
              "User model should be created");
    assert.ok(fs.existsSync(join(testDir, 'src', 'controllers', 'UserController.js')), 
              "User controller should be created");
    assert.ok(fs.existsSync(join(testDir, 'src', 'views', 'users', 'UserList.js')), 
              "User list view should be created");
    assert.ok(fs.existsSync(join(testDir, 'src', 'views', 'users', 'UserForm.js')), 
              "User form view should be created");
    
    // Check file contents include relevant code
    const controllerContent = fs.readFileSync(join(testDir, 'src', 'controllers', 'UserController.js'), 'utf8');
    assert.ok(controllerContent.includes('User') || controllerContent.includes('user'), 
              "Controller should include user-related code");
    
    console.log('\n✅ PASS: All scaffold command tests passed');
    return true;
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