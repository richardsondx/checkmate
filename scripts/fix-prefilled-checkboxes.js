#!/usr/bin/env node

/**
 * CheckMate Pre-filled Checkbox Fixer
 * 
 * This script scans all CheckMate specification files and ensures that
 * all checkboxes are properly formatted. Specifically, it converts any
 * pre-filled checkboxes (with 🟩 or 🟥) to empty checkboxes [ ] if the file
 * was recently created or modified (within the last 5 minutes).
 * 
 * Usage: node scripts/fix-prefilled-checkboxes.js [--force] [--test-file=/path/to/file]
 *   --force: Fix all specs regardless of modification time
 *   --test-file=path: Test on a specific file (useful for testing)
 */

import fs from 'node:fs';
import path from 'node:path';
import glob from 'fast-glob';
import { fileURLToPath } from 'node:url';

// Get the correct paths in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up paths
const projectRoot = path.resolve(__dirname, '..');
const SPECS_DIR = path.join(projectRoot, 'checkmate/specs');

// Check for command line arguments
const forceMode = process.argv.includes('--force');
const testFileArg = process.argv.find(arg => arg.startsWith('--test-file='));
const testFile = testFileArg ? testFileArg.replace('--test-file=', '') : null;

// Function to fix a single file
async function fixFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if this file has the pre-filled checkbox issue
    if (content.includes('- [🟩]') || content.includes('- [🟥]')) {
      // Fix the pre-filled checkboxes
      const fixedContent = content
        .replace(/- \[🟩\]/g, '- [ ]')
        .replace(/- \[🟥\]/g, '- [ ]');
      
      // Write the fixed content back
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Fixed pre-filled checkboxes in: ${path.relative(projectRoot, filePath)}`);
      return true;
    } else {
      console.log(`✓ No pre-filled checkboxes in: ${path.relative(projectRoot, filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Scanning for CheckMate specs with pre-filled checkboxes...');
  
  let specFiles = [];
  
  // If a test file is specified, only process that file
  if (testFile) {
    console.log(`🧪 Test mode: Only processing ${testFile}`);
    specFiles = [testFile];
  } else {
    // Find all spec files
    specFiles = await glob.glob(`${SPECS_DIR}/**/*.{md,markdown,yaml,yml}`);
  
    if (specFiles.length === 0) {
      console.log('❌ No spec files found.');
      process.exit(0);
    }
  
    console.log(`Found ${specFiles.length} spec files to check.`);
  }
  
  let fixedFiles = 0;
  let skippedFiles = 0;
  
  for (const specFile of specFiles) {
    try {
      // For test mode or force mode, process all files
      if (testFile || forceMode) {
        const fixed = await fixFile(specFile);
        if (fixed) fixedFiles++;
      } else {
        // For normal mode, only process recent files
        const stats = fs.statSync(specFile);
        const fileModifiedTime = stats.mtime;
        const currentTime = new Date();
        const timeDiffMinutes = (currentTime.getTime() - fileModifiedTime.getTime()) / (1000 * 60);
        
        // Only process recently created/modified files (< 5 minutes)
        if (timeDiffMinutes < 5) {
          const fixed = await fixFile(specFile);
          if (fixed) fixedFiles++;
        } else {
          skippedFiles++;
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${specFile}: ${error.message}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Total spec files: ${specFiles.length}`);
  console.log(`- Files fixed: ${fixedFiles}`);
  if (!testFile) {
    console.log(`- Files skipped (older than 5 minutes): ${skippedFiles}`);
  }
  console.log(`- Files without issues: ${specFiles.length - fixedFiles - skippedFiles}`);
  
  if (skippedFiles > 0 && !forceMode) {
    console.log('\n💡 Tip: Use --force flag to process all files regardless of modification time.');
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
}); 