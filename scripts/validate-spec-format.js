#!/usr/bin/env node

/**
 * Script to validate spec format structure
 * Ensures specs follow the expected CheckMate format with proper sections and bullet formats
 * Usage:
 *   - node scripts/validate-spec-format.js [file_path] - Validates a single spec file
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Validate a single spec file
function validateSpecFile(filePath) {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check required sections
  const hasTitle = /^# .*/.test(content);
  const hasChecksSection = /^## Checks/m.test(content);
  const hasFilesSection = /^## Files/m.test(content);
  const hasCheckItems = content.includes('- [ ]') || content.includes('- [x]');
  const hasMeta = content.includes('<!-- meta:');
  
  // Optional sections
  const hasDescription = /^## Description/m.test(content); // Now optional
  
  // Advanced validation
  const checkItemsMatch = content.match(/- \[[ x]\] (.*)/g) || [];
  const hasBulletXFormat = checkItemsMatch.every(item => {
    const bulletText = item.replace(/- \[[ x]\] /, '').trim();
    // Verb + object pattern: simple check for verb at beginning (no conjunction)
    const verbObjectPattern = /^([a-z]+)\s([a-z0-9].*)$/;
    return verbObjectPattern.test(bulletText) && !bulletText.includes(' and ');
  });
  
  // Check file listings
  const fileItems = [];
  const filesSection = content.match(/## Files\s*\n([\s\S]*?)(?:\n##|\n<!-- meta:|\n$)/);
  if (filesSection && filesSection[1]) {
    const fileListText = filesSection[1];
    const fileMatches = fileListText.match(/- ([^\n]+)/g);
    if (fileMatches) {
      fileMatches.forEach(match => {
        fileItems.push(match.replace(/^- /, '').trim());
      });
    }
  }
  
  // Check meta section for files
  let metaFiles = [];
  try {
    const metaMatch = content.match(/<!-- meta:\s*\n([\s\S]*?)\n-->/);
    if (metaMatch && metaMatch[1]) {
      const metaJson = JSON.parse(metaMatch[1]);
      if (metaJson.files && Array.isArray(metaJson.files)) {
        metaFiles = metaJson.files;
      }
    }
  } catch (error) {
    // Meta parsing error will be reported below
  }
  
  // Check file hashes
  let hasFileHashes = false;
  try {
    const metaMatch = content.match(/<!-- meta:\s*\n([\s\S]*?)\n-->/);
    if (metaMatch && metaMatch[1]) {
      const metaJson = JSON.parse(metaMatch[1]);
      hasFileHashes = metaJson.file_hashes && Object.keys(metaJson.file_hashes).length > 0;
    }
  } catch (error) {
    // Meta parsing error will be reported below
  }
  
  // Generation note
  const hasGenerationNote = content.includes('<!-- generated via checkmate');
  
  const errors = [];
  
  if (!hasTitle) {
    errors.push('Missing title (should start with "# Title")');
  }
  
  if (!hasChecksSection) {
    errors.push('Missing "## Checks" section');
  }
  
  if (!hasFilesSection) {
    errors.push('Missing "## Files" section');
  }
  
  if (!hasCheckItems) {
    errors.push('Missing check items (should have "- [ ]" or "- [x]" lines)');
  }
  
  if (!hasBulletXFormat && checkItemsMatch.length > 0) {
    errors.push('Check items should follow "verb + object" format (e.g., "validate credentials")');
  }
  
  if (fileItems.length === 0) {
    errors.push('No files listed in the Files section');
  }
  
  if (!hasMeta) {
    errors.push('Missing meta section (should have "<!-- meta:" section)');
  } else {
    if (metaFiles.length === 0) {
      errors.push('Meta section missing "files" array');
    }
    
    if (!hasFileHashes) {
      errors.push('Meta section missing "file_hashes" object');
    }
  }
  
  if (!hasGenerationNote) {
    errors.push('Missing generation note (should include "<!-- generated via checkmate spec v..." -->"');
  }
  
  // Compare files section with meta files
  const filesDiff = fileItems.filter(file => !metaFiles.includes(file));
  const metaDiff = metaFiles.filter(file => !fileItems.includes(file));
  
  if (filesDiff.length > 0 || metaDiff.length > 0) {
    errors.push('Files in the Files section do not match files in the meta section');
  }
  
  // If running in fix mode, we would automatically correct issues here
  const fixMode = process.argv.includes('--fix');
  if (fixMode) {
    // Attempt to fix common issues
    let fixedContent = content;
    let fixedIssues = [];

    // 1. Fix missing files array in meta
    if (hasMeta && metaFiles.length === 0 && fileItems.length > 0) {
      try {
        const metaMatch = fixedContent.match(/<!-- meta:\s*\n([\s\S]*?)\n-->/);
        if (metaMatch && metaMatch[1]) {
          const metaJson = JSON.parse(metaMatch[1]);
          
          // Add files array if missing
          if (!metaJson.files) {
            metaJson.files = fileItems;
            fixedIssues.push('Added files array to meta section');
            
            // Replace the meta section
            const updatedMeta = JSON.stringify(metaJson, null, 2);
            fixedContent = fixedContent.replace(
              /<!-- meta:\s*\n([\s\S]*?)\n-->/,
              `<!-- meta:\n${updatedMeta}\n-->`
            );
          }
        }
      } catch (error) {
        console.error('Error fixing meta section:', error);
      }
    }

    // 2. Add generation note if missing
    if (!hasGenerationNote) {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      fixedContent += `\n\n<!-- generated via checkmate spec v0.5 on ${now} -->`;
      fixedIssues.push('Added generation note');
    }

    // 3. Check if file was fixed
    if (fixedIssues.length > 0) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(chalk.green('🔧 Fixed the following issues:'));
      fixedIssues.forEach(fix => console.log(`  • ${fix}`));
      return { fixed: true, fixedIssues, filePath };
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    filePath,
    warnings: {
      checkItems: checkItemsMatch.length,
      fileItems: fileItems.length,
      metaFiles: metaFiles.length
    }
  };
}

// Main function
async function main() {
  const filePath = process.argv[2];
  const fixMode = process.argv.includes('--fix');
  
  if (!filePath) {
    console.error('Please provide a file path to validate');
    process.exit(1);
  }
  
  try {
    // Validate the file
    const result = validateSpecFile(filePath);
    
    // Check if fixes were applied
    if (result.fixed) {
      console.log(chalk.blue(`🔄 Fixed issues in: ${result.filePath}`));
      console.log(chalk.yellow('Running validation again...'));
      
      // Validate again after fixing
      const newResult = validateSpecFile(filePath);
      if (newResult.valid) {
        console.log(chalk.green(`✅ Spec format now valid: ${newResult.filePath}`));
        process.exit(0);
      } else {
        console.error(chalk.yellow(`⚠️ Some issues remain in: ${newResult.filePath}`));
        newResult.errors.forEach(error => {
          console.error(`  • ${error}`);
        });
        console.error(chalk.blue('Run validate-spec-format.js with --fix again to attempt further fixes'));
        process.exit(1);
      }
      return;
    }
    
    if (result.valid) {
      console.log(chalk.green(`✅ Spec format valid: ${result.filePath}`));
      if (result.warnings) {
        console.log(`  • ${result.warnings.checkItems} check item(s)`);
        console.log(`  • ${result.warnings.fileItems} file(s) in Files section`);
        console.log(`  • ${result.warnings.metaFiles} file(s) in meta section`);
      }
      process.exit(0);
    } else {
      console.error(chalk.red(`❌ Spec format invalid: ${result.filePath}`));
      result.errors.forEach(error => {
        console.error(`  • ${error}`);
      });
      
      if (fixMode) {
        console.log(chalk.yellow('No automatic fixes were applied. Some issues require manual correction:'));
        result.errors.forEach(error => {
          console.log(`  • ${error}`);
        });
      } else {
        console.log(chalk.blue('Try running with --fix to attempt automatic corrections:'));
        console.log(`  node scripts/validate-spec-format.js "${filePath}" --fix`);
      }
      
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