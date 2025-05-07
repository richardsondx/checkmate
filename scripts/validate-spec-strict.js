#!/usr/bin/env node

/**
 * Script to strictly validate specs with fail-fast behavior
 * Used by Cursor rules to enforce proper spec format during generation and verification
 * Usage:
 *   - node scripts/validate-spec-strict.js [file_path] - Validates a spec and fails on any issue
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const SPECS_GLOB = 'checkmate/specs/**/*.md';

// Validate a single spec file
function validateSpecFile(filePath) {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check required sections and format
  const hasTitle = /^# .*/.test(content);
  const hasChecksSection = /^## Checks/.test(content);
  const hasCheckItems = content.includes('- [ ]') || content.includes('- [x]');
  const hasMeta = content.includes('<!-- meta:');
  
  // Check that format follows our example structure
  const hasProperChecksFormat = /## Checks\r?\n- \[[ x]\]/.test(content);
  
  const errors = [];
  
  if (!hasTitle) {
    errors.push('Missing title (must start with "# Title")');
  }
  
  if (!hasChecksSection) {
    errors.push('Missing "## Checks" section (must be exactly "## Checks")');
  }
  
  if (!hasCheckItems) {
    errors.push('Missing check items (must have "- [ ]" or "- [x]" lines)');
  }
  
  if (!hasMeta) {
    errors.push('Missing meta section (must have "<!-- meta:" section)');
  }
  
  if (!hasProperChecksFormat) {
    errors.push('Improper checks format (must be "## Checks" followed by checklist items)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    filePath
  };
}

// Validate all spec files
async function validateAllSpecs() {
  const specFiles = await glob(SPECS_GLOB);
  
  const results = [];
  let hasErrors = false;
  
  for (const file of specFiles) {
    const result = validateSpecFile(file);
    
    if (!result.valid) {
      hasErrors = true;
    }
    
    results.push(result);
  }
  
  return {
    hasErrors,
    results,
    totalFiles: specFiles.length,
    invalidFiles: results.filter(r => !r.valid).length
  };
}

// Main function
async function main() {
  try {
    const filePath = process.argv[2];
    
    // If a specific file is provided, validate only that file
    if (filePath) {
      const result = validateSpecFile(filePath);
      
      if (result.valid) {
        console.log(`✅ Spec format valid: ${result.filePath}`);
        process.exit(0);
      } else {
        console.error(`❌ Spec format invalid: ${result.filePath}`);
        result.errors.forEach(error => {
          console.error(`  - ${error}`);
        });
        process.exit(1); // Fail fast
      }
    } 
    // Otherwise validate all specs
    else {
      const { hasErrors, results, totalFiles, invalidFiles } = await validateAllSpecs();
      
      if (hasErrors) {
        console.error(`❌ Found ${invalidFiles} invalid specs out of ${totalFiles} total specs`);
        
        // Print details for each invalid file
        results
          .filter(r => !r.valid)
          .forEach(result => {
            console.error(`\n❌ Invalid spec: ${result.filePath}`);
            result.errors.forEach(error => {
              console.error(`  - ${error}`);
            });
          });
        
        process.exit(1); // Fail fast
      } else {
        console.log(`✅ All ${totalFiles} specs are valid`);
        process.exit(0);
      }
    }
  } catch (error) {
    console.error('Error validating specs:', error);
    process.exit(1); // Fail fast
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1); // Fail fast
}); 