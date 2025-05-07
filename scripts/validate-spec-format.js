#!/usr/bin/env node

/**
 * Script to validate spec format structure
 * Ensures specs follow the expected CheckMate format with proper sections
 * Usage:
 *   - node scripts/validate-spec-format.js [file_path] - Validates a single spec file
 */

import fs from 'fs';
import path from 'path';

// Validate a single spec file
function validateSpecFile(filePath) {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check required sections
  const hasTitle = /^# .*/.test(content);
  const hasChecksSection = /^## Checks/.test(content);
  const hasCheckItems = content.includes('- [ ]') || content.includes('- [x]');
  const hasMeta = content.includes('<!-- meta:');
  
  const errors = [];
  
  if (!hasTitle) {
    errors.push('Missing title (should start with "# Title")');
  }
  
  if (!hasChecksSection) {
    errors.push('Missing "## Checks" section');
  }
  
  if (!hasCheckItems) {
    errors.push('Missing check items (should have "- [ ]" or "- [x]" lines)');
  }
  
  if (!hasMeta) {
    errors.push('Missing meta section (should have "<!-- meta:" section)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    filePath
  };
}

// Main function
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide a file path to validate');
    process.exit(1);
  }
  
  try {
    // Validate the file
    const result = validateSpecFile(filePath);
    
    if (result.valid) {
      console.log(`✅ Spec format valid: ${result.filePath}`);
      process.exit(0);
    } else {
      console.error(`❌ Spec format invalid: ${result.filePath}`);
      result.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('Error validating spec:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 