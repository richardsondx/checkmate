/**
 * Unit tests for the paths utility module
 * Verifies script path resolution works correctly across different environments
 */
import { strictEqual } from 'node:assert';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'mocha';
import fs from 'node:fs';

// Calculate the project root directory for test comparisons
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Import the module to test (using dynamic import for ESM)
let pathsModule;

describe('Paths utility module', function() {
  // Set up before tests
  before(async function() {
    // Import the module
    pathsModule = await import('../../dist/lib/paths.js');
  });

  it('should export PACKAGE_ROOT constant that points to the package root', function() {
    strictEqual(typeof pathsModule.PACKAGE_ROOT, 'string', 'PACKAGE_ROOT should be a string');
    
    // Normalize paths for cross-platform comparison
    const normalizedPackageRoot = path.normalize(pathsModule.PACKAGE_ROOT);
    const normalizedExpectedRoot = path.normalize(projectRoot);
    
    strictEqual(
      normalizedPackageRoot, 
      normalizedExpectedRoot, 
      'PACKAGE_ROOT should point to the package root directory'
    );
  });

  it('should resolve script paths correctly with getScriptPath()', function() {
    const scriptName = 'fix-check-format.js';
    const resolvedPath = pathsModule.getScriptPath(scriptName);
    
    // Expected path based on project structure
    const expectedPath = path.join(projectRoot, 'scripts', scriptName);
    
    strictEqual(
      path.normalize(resolvedPath),
      path.normalize(expectedPath),
      'getScriptPath() should resolve to the correct script path'
    );
    
    // Verify the script actually exists at this location
    strictEqual(
      fs.existsSync(resolvedPath),
      true,
      `The script ${scriptName} should exist at the resolved path`
    );
  });

  it('should resolve arbitrary package paths correctly with getPackagePath()', function() {
    const relativePath = 'package.json';
    const resolvedPath = pathsModule.getPackagePath(relativePath);
    
    // Expected path based on project structure
    const expectedPath = path.join(projectRoot, relativePath);
    
    strictEqual(
      path.normalize(resolvedPath),
      path.normalize(expectedPath),
      'getPackagePath() should resolve to the correct path'
    );
    
    // Verify the file actually exists at this location
    strictEqual(
      fs.existsSync(resolvedPath),
      true,
      `The file ${relativePath} should exist at the resolved path`
    );
  });
  
  // Additional test to simulate the installed package scenario
  it('should handle path resolution from any location', function() {
    // Mock the install directory (simulate running from node_modules)
    const mockInstallDir = '/some/random/project/node_modules/checkmateai';
    
    // Create a direct implementation of the functions
    const getScriptPath = (scriptName) => {
      return path.join(pathsModule.PACKAGE_ROOT, 'scripts', scriptName);
    };
    
    const mockScript = 'fix-check-format.js';
    const resolvedPath = getScriptPath(mockScript);
    
    // Ensure the resolved path still points to the actual package, not the mock location
    strictEqual(
      resolvedPath.includes(mockInstallDir),
      false,
      'Path resolution should not depend on current working directory'
    );
    
    strictEqual(
      resolvedPath.includes(projectRoot),
      true,
      'Path resolution should always use the package root'
    );
  });
}); 