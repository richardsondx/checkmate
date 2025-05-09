/**
 * Unit tests for create-spec-template script
 */
import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '../../.test-tmp');
const SPECS_DIR = path.join(TEST_DIR, 'checkmate/specs');
const SCRIPT_PATH = path.join(__dirname, '../../../scripts/create-spec-template.js');

/**
 * Sets up test environment
 */
async function setupTest() {
  // Create test directories
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(SPECS_DIR, { recursive: true });
  
  // Create a test file for references
  const testFile = path.join(TEST_DIR, 'test-file.js');
  await fs.writeFile(testFile, '// This is a test file for spec template generation');
  
  // Mock process.cwd() to return the test directory
  const originalCwd = process.cwd;
  process.cwd = () => TEST_DIR;
  
  // Return cleanup function
  return () => {
    process.cwd = originalCwd;
  };
}

/**
 * Directly tests the functions from the create-spec-template script
 */
async function testFunctions() {
  // Import the script functions
  const scriptModule = await import('../../../scripts/create-spec-template.js');
  
  // Test createSlug function
  const createSlug = scriptModule.createSlug || scriptModule.default?.createSlug;
  if (createSlug) {
    const slug = createSlug('Test Feature with Spaces');
    assert.equal(slug, 'test-feature-with-spaces', 'Slug should be lowercase with hyphens');
  }
  
  // Test buildSpecTemplate function
  const buildSpecTemplate = scriptModule.buildSpecTemplate || scriptModule.default?.buildSpecTemplate;
  if (buildSpecTemplate) {
    const template = buildSpecTemplate('Test Feature', ['file1.js', 'file2.js']);
    
    // Check template structure
    assert(template.includes('# Test Feature'), 'Template should include title');
    assert(template.includes('## Checks'), 'Template should include Checks section');
    assert(template.includes('- [ ] validate'), 'Template should include check items');
    assert(template.includes('## Files'), 'Template should include Files section');
    assert(template.includes('- file1.js'), 'Template should list files');
    assert(template.includes('<!-- meta:'), 'Template should include meta section');
    assert(template.includes('"files": ['), 'Template should include files array in meta');
  }
}

/**
 * Tests the script by executing it
 */
async function testScriptExecution() {
  const title = 'Script Test Feature';
  const slug = 'script-test-feature';
  const specPath = path.join(SPECS_DIR, `${slug}.md`);
  
  // Run the script with a test title and file
  const command = `node ${SCRIPT_PATH} "${title}" --files=test-file.js`;
  
  try {
    const { stdout } = await execAsync(command);
    
    // Verify the output indicates success
    assert(stdout.includes('Created spec template'), 'Output should indicate successful creation');
    
    // Verify the file was created
    const fileExists = await fs.access(specPath).then(() => true).catch(() => false);
    assert(fileExists, 'Spec file should be created');
    
    // Check file content
    const content = await fs.readFile(specPath, 'utf8');
    assert(content.includes(`# ${title}`), 'File should contain the specified title');
    assert(content.includes('test-file.js'), 'File should reference the specified file');
    
    console.log('✅ Script execution test passed');
  } catch (error) {
    console.error('Script execution failed:', error);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  const cleanup = await setupTest();
  
  try {
    // Test the script functions directly if possible
    await testFunctions();
    
    // Test the script by executing it
    await testScriptExecution();
    
    console.log('✅ PASS: All create-spec-template tests passed');
  } catch (error) {
    console.error('❌ FAIL:', error);
    throw error;
  } finally {
    cleanup();
  }
}

// Run the test
runTest(); 