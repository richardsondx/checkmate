/**
 * Integration test to simulate a package installation scenario
 * Verifies that path resolution works correctly when CheckMate is installed as a dependency
 */
import { strictEqual, ok } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { execSync } from 'node:child_process';

// Calculate paths for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const testTmpDir = path.join(projectRoot, 'tests', '.test-tmp', 'package-install-test');
const mockAppDir = path.join(testTmpDir, 'mock-app');
const mockNodeModulesDir = path.join(mockAppDir, 'node_modules');
const mockPackageDir = path.join(mockNodeModulesDir, 'checkmateai');
const mockSpecDir = path.join(mockAppDir, 'checkmate', 'specs');

// Import modules to test (using dynamic import for ESM)
let pathsModule;

describe('Package installation simulation', function() {
  this.timeout(10000); // Give more time for script execution
  
  // Set up test environment before each test
  beforeEach(async function() {
    // Import the paths module
    pathsModule = await import('../../dist/lib/paths.js');
    
    // Create directory structure to simulate an installed package
    if (!fs.existsSync(mockAppDir)) {
      fs.mkdirSync(mockAppDir, { recursive: true });
    }
    
    if (!fs.existsSync(mockNodeModulesDir)) {
      fs.mkdirSync(mockNodeModulesDir, { recursive: true });
    }
    
    if (!fs.existsSync(mockPackageDir)) {
      fs.mkdirSync(mockPackageDir, { recursive: true });
    }
    
    if (!fs.existsSync(mockSpecDir)) {
      fs.mkdirSync(mockSpecDir, { recursive: true });
    }
    
    // Create a simple package.json in the mock app
    const mockPackageJson = {
      name: "mock-app",
      version: "1.0.0",
      dependencies: {
        "checkmateai": "file:../../.."
      }
    };
    
    fs.writeFileSync(
      path.join(mockAppDir, 'package.json'), 
      JSON.stringify(mockPackageJson, null, 2)
    );
    
    // Create a simple test file that uses the paths module
    const testFileContent = `
import { getScriptPath, getPackagePath, PACKAGE_ROOT } from 'checkmateai/dist/lib/paths.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Handle ES modules not having __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log the paths for verification
console.log('PACKAGE_ROOT:', PACKAGE_ROOT);
console.log('Script path:', getScriptPath('fix-check-format.js'));
console.log('Package path:', getPackagePath('package.json'));

// Check if the files exist
const scriptExists = fs.existsSync(getScriptPath('fix-check-format.js'));
const packageJsonExists = fs.existsSync(getPackagePath('package.json'));

console.log('Script exists:', scriptExists);
console.log('Package.json exists:', packageJsonExists);

// Verify against expected values
const expectedRoot = path.resolve(__dirname, 'node_modules', 'checkmateai');
const correctRoot = PACKAGE_ROOT !== __dirname && PACKAGE_ROOT.includes('checkmateai');
const correctScriptPath = getScriptPath('fix-check-format.js').includes('scripts');
const correctPackagePath = getPackagePath('package.json').includes('package.json');

console.log('Root path points to package:', correctRoot);
console.log('Script path contains scripts directory:', correctScriptPath);
console.log('Package path contains package.json:', correctPackagePath);

// Exit with appropriate status
if (scriptExists && packageJsonExists && correctRoot && correctScriptPath && correctPackagePath) {
  console.log('SUCCESS: Path resolution works correctly');
  process.exit(0);
} else {
  console.error('FAILURE: Path resolution does not work correctly');
  process.exit(1);
}
`;
    
    fs.writeFileSync(path.join(mockAppDir, 'test-paths.mjs'), testFileContent);
    
    // Create a symbolic link from the mock package to the actual project
    // We simulate the package installation by creating these directory links
    try {
      // Link scripts directory
      fs.symlinkSync(
        path.join(projectRoot, 'scripts'), 
        path.join(mockPackageDir, 'scripts'),
        'dir'
      );
      
      // Link dist directory (for the compiled modules)
      fs.symlinkSync(
        path.join(projectRoot, 'dist'), 
        path.join(mockPackageDir, 'dist'),
        'dir'
      );
      
      // Copy package.json
      fs.copyFileSync(
        path.join(projectRoot, 'package.json'),
        path.join(mockPackageDir, 'package.json')
      );
    } catch (err) {
      console.warn('Warning: Error setting up symlinks:', err);
      // Continue test - we'll check for failures later
    }
  });

  // Clean up after each test
  afterEach(function() {
    // Clean up test files
    try {
      if (fs.existsSync(testTmpDir)) {
        // Recursive delete of test directory
        fs.rmSync(testTmpDir, { recursive: true });
      }
    } catch (err) {
      console.warn('Error cleaning up test directory:', err);
    }
  });
  
  it('should correctly resolve paths from an installed package', function() {
    // Skip if symlinks could not be created (Windows or permission issues)
    if (!fs.existsSync(path.join(mockPackageDir, 'scripts'))) {
      console.warn('Skipping test because symlinks could not be created');
      this.skip();
      return;
    }
    
    // Change to the mock app directory to simulate running from there
    const originalCwd = process.cwd();
    process.chdir(mockAppDir);
    
    try {
      // Execute the test script in the mock app
      const result = execSync('node test-paths.mjs', { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log('Test script output:', result);
      
      // Verify output indicates success
      ok(result.includes('SUCCESS: Path resolution works correctly'), 
         'Path resolution should work correctly in installed package');
      
      // Verify specific expectations
      ok(result.includes('Script exists: true'), 
         'Script path should resolve to an existing file');
      
      ok(result.includes('Package.json exists: true'), 
         'Package.json path should resolve to an existing file');
      
      ok(result.includes('Root path points to package: true'), 
         'Root path should point to the package directory');
         
      ok(result.includes('Script path contains scripts directory: true'), 
         'Script path should contain the scripts directory');
         
      ok(result.includes('Package path contains package.json: true'), 
         'Package path should contain package.json');
    } catch (err) {
      console.error('Error running test script:', err);
      throw err;
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
}); 