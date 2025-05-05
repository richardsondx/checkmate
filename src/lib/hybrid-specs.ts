/**
 * Hybrid Specifications for CheckMate
 * 
 * Supports embedding CheckMate Test Script (cts) syntax within Markdown files
 * for a hybrid approach that keeps the readability of Markdown while
 * allowing the precision of agent specs.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMarkdown, MarkdownSpec } from './markdown-parser.js';
import { parseTestScript, executeTestScript } from './cts-parser.js';
import { Requirement } from './executor.js';

/**
 * Interface for extracted test blocks from a markdown file
 */
interface TestBlock {
  requirementId: string;
  requirement: string;
  testCode: string;
  lineNumber: number;
}

/**
 * Extract all checkmate test script blocks from a markdown file
 */
export function extractTestBlocksFromMarkdown(markdownContent: string): TestBlock[] {
  const testBlocks: TestBlock[] = [];
  
  // Match fenced code blocks with 'checkmate' language
  const codeBlockRegex = /^```\s*checkmate\s*\n([\s\S]*?)^```\s*$/gm;
  let match;
  
  while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    const testCode = match[1].trim();
    
    // Find the requirement this test block is associated with
    // Look for the nearest requirement line above the code block
    const contentBeforeBlock = markdownContent.substring(0, match.index);
    const lines = contentBeforeBlock.split('\n');
    let requirementLine = '';
    let lineNumber = 0;
    
    // Start from the end and go backwards to find the nearest requirement line
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Look for checkmate requirements (starts with - [ ] or - [x])
      if (line.match(/^-\s*\[[\sx]?\]\s*\S+/)) {
        requirementLine = line;
        lineNumber = i + 1; // 1-indexed line number
        break;
      }
    }
    
    if (requirementLine) {
      // Extract the requirement text from the requirement line
      // Remove the checkbox and any leading/trailing whitespace
      const requirement = requirementLine.replace(/^-\s*\[[\sx]?\]\s*/, '').trim();
      
      testBlocks.push({
        requirementId: `req-${Math.floor(Math.random() * 10000)}`, // Generate a random ID for now
        requirement,
        testCode,
        lineNumber
      });
    }
  }
  
  return testBlocks;
}

/**
 * Check if a markdown file contains embedded test blocks
 */
export function hasEmbeddedTests(markdownPath: string): boolean {
  try {
    if (!fs.existsSync(markdownPath)) {
      return false;
    }
    
    const content = fs.readFileSync(markdownPath, 'utf8');
    return content.includes('```checkmate');
  } catch (error) {
    console.error(`Error checking for embedded tests in ${markdownPath}:`, error);
    return false;
  }
}

/**
 * Execute embedded tests in a markdown file
 */
export async function executeEmbeddedTests(markdownPath: string): Promise<{ 
  results: { requirementId: string, requirement: string, success: boolean, message: string }[],
  allPassed: boolean
}> {
  try {
    if (!fs.existsSync(markdownPath)) {
      throw new Error(`File not found: ${markdownPath}`);
    }
    
    const content = fs.readFileSync(markdownPath, 'utf8');
    const testBlocks = extractTestBlocksFromMarkdown(content);
    
    if (testBlocks.length === 0) {
      return { results: [], allPassed: true };
    }
    
    // Execute each test block
    const results = [];
    let allPassed = true;
    
    for (const block of testBlocks) {
      try {
        console.log(`Executing test for requirement: ${block.requirement}`);
        const testResult = await executeTestScript(block.testCode);
        
        results.push({
          requirementId: block.requirementId,
          requirement: block.requirement,
          success: testResult.success,
          message: testResult.message
        });
        
        if (!testResult.success) {
          allPassed = false;
          console.log(`❌ Test failed: ${testResult.message}`);
        } else {
          console.log(`✅ Test passed`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          requirementId: block.requirementId,
          requirement: block.requirement,
          success: false,
          message: `Error executing test: ${errorMessage}`
        });
        allPassed = false;
      }
    }
    
    return { results, allPassed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing embedded tests in ${markdownPath}:`, errorMessage);
    return { 
      results: [{
        requirementId: 'error',
        requirement: 'Error executing tests',
        success: false,
        message: errorMessage
      }],
      allPassed: false
    };
  }
}

/**
 * Convert requirement state (passed/failed) back into the markdown file
 */
export function updateMarkdownWithTestResults(
  markdownPath: string, 
  results: { requirementId: string, requirement: string, success: boolean }[]
): boolean {
  try {
    if (!fs.existsSync(markdownPath)) {
      throw new Error(`File not found: ${markdownPath}`);
    }
    
    let content = fs.readFileSync(markdownPath, 'utf8');
    let updated = false;
    
    // For each result, find the corresponding requirement line and update its checkbox
    for (const result of results) {
      const requirementPattern = new RegExp(
        `^(\\s*-\\s*\\[)[ x](\\]\\s*${escapeRegExp(result.requirement)})`, 
        'gm'
      );
      
      const replacement = `$1${result.success ? 'x' : ' '}$2`;
      const newContent = content.replace(requirementPattern, replacement);
      
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(markdownPath, content, 'utf8');
    }
    
    return updated;
  } catch (error) {
    console.error(`Error updating markdown with test results:`, error);
    return false;
  }
}

/**
 * Helper function to escape special characters in a string for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate hybrid spec from a regular markdown spec
 */
export function addTestBlocksToMarkdown(markdownPath: string, requirements: Requirement[]): boolean {
  try {
    if (!fs.existsSync(markdownPath)) {
      throw new Error(`File not found: ${markdownPath}`);
    }
    
    let content = fs.readFileSync(markdownPath, 'utf8');
    
    // Check if there are already test blocks
    if (content.includes('```checkmate')) {
      console.log('Markdown file already contains test blocks.');
      return false;
    }
    
    // For each requirement, add a test block after it
    for (const req of requirements) {
      if (!req.require) continue;
      
      const requirementPattern = new RegExp(
        `^(\\s*-\\s*\\[[ x]\\]\\s*${escapeRegExp(req.require)})$`, 
        'gm'
      );
      
      // Template for the test block
      const testBlock = `
$1

\`\`\`checkmate
# Test for: ${req.require}
# Add your test code here using the CheckMate Test Script (cts) syntax
# Examples:
# http GET /api/resource => 200
# file ./path/to/file => contains "expected text"
# assert response.body.length > 0
\`\`\`
`;
      
      content = content.replace(requirementPattern, testBlock);
    }
    
    fs.writeFileSync(markdownPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error adding test blocks to markdown:`, error);
    return false;
  }
} 