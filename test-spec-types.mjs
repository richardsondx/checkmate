/**
 * Test suite for spec type features
 * Tests for both Markdown and YAML specs in both locations
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';

const exec = promisify(child_process.exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Test constants
const SPECS_DIR = path.join(__dirname, 'checkmate/specs');
const AGENTS_DIR = path.join(SPECS_DIR, 'agents');
const MD_TEST_SPEC = 'test-markdown-spec';
const YAML_TEST_SPEC = 'test-yaml-spec';

// Clean up test files from previous runs
async function cleanTestFiles() {
  console.log('Cleaning up test files...');
  
  try {
    // Delete test files if they exist
    const filesToDelete = [
      path.join(SPECS_DIR, `${MD_TEST_SPEC}.md`),
      path.join(AGENTS_DIR, `${YAML_TEST_SPEC}.yaml`),
      path.join(SPECS_DIR, `${MD_TEST_SPEC}-promoted.yaml`),
      path.join(AGENTS_DIR, `${MD_TEST_SPEC}.yaml`)
    ];
    
    for (const file of filesToDelete) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Deleted ${file}`);
      }
    }
    
    // Create directories if they don't exist
    if (!fs.existsSync(SPECS_DIR)) {
      fs.mkdirSync(SPECS_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(AGENTS_DIR)) {
      fs.mkdirSync(AGENTS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error cleaning test files:', error);
  }
}

// Test that the gen command creates a Markdown spec
async function testMarkdownGeneration() {
  console.log('\n📝 Testing Markdown spec generation...');
  
  try {
    const command = `node ./dist/index.js gen "Test Markdown Spec Feature" --dry-run`;
    const { stdout } = await exec(command);
    
    console.log('Command output:', stdout);
    
    // Check for any indication of a successful spec generation
    if (!stdout.includes('Generating specification') && 
        !stdout.includes('Generated spec') && 
        !stdout.includes('YAML Output')) {
      throw new Error('Failed to generate Markdown spec');
    }
    
    console.log('✅ Markdown spec generation test passed');
    return true;
  } catch (error) {
    console.error('❌ Markdown spec generation test failed:', error);
    return false;
  }
}

// Test that the gen command with --agent creates a YAML spec in the agents folder
async function testAgentGeneration() {
  console.log('\n📝 Testing YAML agent spec generation...');
  
  try {
    const command = `node ./dist/index.js gen "Test YAML Spec Feature" --agent`;
    const { stdout } = await exec(command);
    
    console.log('Command output:', stdout);
    
    // Get the file path from the output
    const pathMatch = stdout.match(/Path: (.*?)\.yaml/);
    if (!pathMatch) {
      throw new Error('Could not find the path to the generated spec in the output');
    }
    
    const outputPath = `${pathMatch[1]}.yaml`;
    
    // Verify the file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Agent spec file not found at ${outputPath}`);
    }
    
    // Read the file and verify it has the right content
    const content = fs.readFileSync(outputPath, 'utf8');
    const yamlData = parseYaml(content);
    
    if (!yamlData.title.includes('YAML') && !yamlData.title.includes('Test')) {
      throw new Error(`YAML spec has incorrect title: ${yamlData.title}`);
    }
    
    console.log('✅ YAML agent spec generation test passed');
    return true;
  } catch (error) {
    console.error('❌ YAML agent spec generation test failed:', error);
    return false;
  }
}

// Test that the promote command converts a Markdown spec to a YAML agent spec
async function testPromoteCommand() {
  console.log('\n📝 Testing promote command...');
  
  try {
    // Create a simple Markdown spec file directly
    const specContent = `# Test Promotion Feature

## Files
- src/lib/specs.ts
- src/commands/promote.ts

## Requirements
- [ ] Parse Markdown specs correctly
- [ ] Convert to YAML format
- [ ] Save in the agents folder
`;
    
    const testSpecPath = path.join(SPECS_DIR, `${MD_TEST_SPEC}.md`);
    fs.writeFileSync(testSpecPath, specContent, 'utf8');
    
    console.log(`Created test spec at: ${testSpecPath}`);
    
    // Now promote it
    const promoteCommand = `node ./dist/index.js promote --to-agent ${MD_TEST_SPEC}`;
    const { stdout: promoteOutput } = await exec(promoteCommand);
    
    console.log('Promote command output:', promoteOutput);
    
    // Check if the YAML file was created
    const agentSpecPath = path.join(AGENTS_DIR, `${MD_TEST_SPEC}.yaml`);
    
    if (!fs.existsSync(agentSpecPath)) {
      throw new Error(`Promoted agent spec file not found at ${agentSpecPath}`);
    }
    
    // Read the YAML file to verify content
    const yamlContent = fs.readFileSync(agentSpecPath, 'utf8');
    const yamlData = parseYaml(yamlContent);
    
    // Verify title was preserved
    if (!yamlData.title || !yamlData.title.includes('Test Promotion')) {
      throw new Error(`YAML spec has incorrect title: ${yamlData.title}`);
    }
    
    // Verify requirements were converted
    if (!yamlData.requirements || yamlData.requirements.length !== 3) {
      throw new Error(`YAML spec doesn't have the expected requirements count`);
    }
    
    console.log('✅ Promote command test passed');
    return true;
  } catch (error) {
    console.error('❌ Promote command test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting spec type tests...');
  
  // Clean up files from previous test runs
  await cleanTestFiles();
  
  // Run all tests
  const testResults = [
    await testMarkdownGeneration(),
    await testAgentGeneration(),
    await testPromoteCommand()
  ];
  
  // Print final results
  console.log('\n📊 Test Results:');
  const passedCount = testResults.filter(r => r).length;
  console.log(`Passed: ${passedCount}/${testResults.length}`);
  
  if (passedCount === testResults.length) {
    console.log('✅ All spec type tests passed!');
    return 0;
  } else {
    console.log('❌ Some tests failed');
    return 1;
  }
}

// Run the tests and exit with the appropriate code
runTests().then(exitCode => {
  process.exit(exitCode);
}); 