/**
 * Test file for the Markdown command functionality
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Test the markdown generation command 'cursor test-markdown'
 * Confirms that the command executes successfully and produces valid Markdown
 */
export function testMarkdownGenerationCommand() {
  try {
    // Test the command execution with success exit code
    const output = execSync('node dist/index.js cursor test-markdown --validate=false').toString();
    
    // Verify that the output contains Markdown elements
    const hasHeadings = output.includes('# Sample Markdown Document');
    const hasLists = output.includes('- Item 1');
    const hasCodeBlocks = output.includes('```javascript');
    const hasTables = output.includes('| Header 1 |');
    
    // Check that all required elements are present
    if (!hasHeadings || !hasLists || !hasCodeBlocks || !hasTables) {
      console.error('Generated Markdown is missing required elements');
      return false;
    }
    
    // Test the --output flag
    const outputFile = path.join('temp-test', 'test-markdown-output.md');
    
    // Ensure directory exists
    if (!fs.existsSync('temp-test')) {
      fs.mkdirSync('temp-test', { recursive: true });
    }
    
    // Run command with output flag (no validation)
    execSync(`node dist/index.js cursor test-markdown --output ${outputFile} --validate=false`);
    
    // Verify file was created
    if (!fs.existsSync(outputFile)) {
      console.error('Output file was not created');
      return false;
    }
    
    // Cleanup
    fs.unlinkSync(outputFile);
    
    // All tests passed
    return true;
  } catch (error) {
    console.error('Error testing markdown generation command:', error);
    return false;
  }
}

/**
 * Test that the markdown validation works and fails appropriately
 */
export function testMarkdownValidation() {
  try {
    // Create an invalid markdown file for testing validation and error handling
    const invalidMarkdownFile = path.join('temp-test', 'invalid-markdown.md');
    
    // Ensure directory exists
    if (!fs.existsSync('temp-test')) {
      fs.mkdirSync('temp-test', { recursive: true });
    }
    
    // Write some invalid markdown to the file
    fs.writeFileSync(invalidMarkdownFile, `
# Bad heading
-no space
| Invalid | Table with no separator |
`, 'utf8');
    
    // Test error handling with invalid markdown (should return non-zero exit code)
    let errorHandlingWorks = false;
    try {
      execSync(`node dist/index.js cursor test-markdown --input ${invalidMarkdownFile} --validate --verbose`, { 
        stdio: 'pipe' 
      });
      // If we get here, validation didn't fail as expected
      console.error('Validation did not fail for invalid Markdown');
    } catch (error) {
      // This is expected, command should exit with non-zero code
      errorHandlingWorks = true;
      const errorOutput = error.stderr ? error.stderr.toString() : '';
      if (!errorOutput.includes('Error') && !errorOutput.includes('failed')) {
        console.error('Validation did not provide descriptive error messages');
        errorHandlingWorks = false;
      }
    }
    
    // Cleanup
    try {
      fs.unlinkSync(invalidMarkdownFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return errorHandlingWorks;
  } catch (error) {
    console.error('Error testing markdown validation:', error);
    return false;
  }
}

/**
 * Comprehensive test for 'cursor test-markdown' command
 */
export function testCursorTestMarkdownCommand() {
  console.log('Running comprehensive test for cursor test-markdown command...');
  
  try {
    // Test basic functionality
    console.log('1. Testing basic command execution');
    const result = execSync('node dist/index.js cursor test-markdown --validate=false', { stdio: 'pipe' }).toString();
    
    // Verify output contains expected Markdown elements
    console.log('2. Verifying Markdown elements');
    const markdownElements = [
      '# Sample Markdown Document',  // Heading
      '## Introduction',             // Subheading
      '- Item 1',                    // Unordered list
      '1. First item',               // Ordered list
      '```javascript',               // Code block
      '| Header 1 |',                // Table
      '[CheckMate Repository]',      // Link
      '> This is a blockquote'       // Blockquote
    ];
    
    for (const element of markdownElements) {
      if (!result.includes(element)) {
        console.error(`Missing Markdown element: ${element}`);
        return false;
      }
    }
    
    // Test --output flag
    console.log('3. Testing --output flag');
    const outputFile = path.join('temp-test', 'cursor-test-markdown.md');
    if (!fs.existsSync('temp-test')) {
      fs.mkdirSync('temp-test', { recursive: true });
    }
    
    execSync(`node dist/index.js cursor test-markdown --output ${outputFile} --validate=false`, { stdio: 'pipe' });
    if (!fs.existsSync(outputFile)) {
      console.error('Output file was not created');
      return false;
    }
    
    // Verify file content
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    if (!fileContent.includes('# Sample Markdown Document')) {
      console.error('Output file does not contain expected Markdown');
      return false;
    }
    
    // Create an invalid markdown file for testing validation and error handling
    console.log('4. Testing validation and error handling');
    const invalidMarkdownFile = path.join('temp-test', 'invalid-markdown.md');
    fs.writeFileSync(invalidMarkdownFile, `
# Bad heading
-no space
| Invalid | Table with no separator |
`, 'utf8');
    
    // Test error handling with invalid markdown (should return non-zero exit code)
    let errorHandlingWorks = false;
    try {
      execSync(`node dist/index.js cursor test-markdown --input ${invalidMarkdownFile} --validate`, { 
        stdio: 'pipe' 
      });
    } catch (error) {
      // This is expected, command should exit with non-zero code
      errorHandlingWorks = true;
    }
    
    if (!errorHandlingWorks) {
      console.error('Command did not properly handle validation errors');
      return false;
    }
    
    // Cleanup
    console.log('5. Cleanup');
    fs.unlinkSync(outputFile);
    fs.unlinkSync(invalidMarkdownFile);
    
    console.log('All tests passed for cursor test-markdown command');
    return true;
  } catch (error) {
    console.error('Error in comprehensive test:', error);
    return false;
  }
} 