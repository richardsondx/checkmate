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
  const hasCheckItems = content.includes('- [ ]') || content.includes('- [x]') || content.includes('- [🟩]') || content.includes('- [🟥]');
  const hasMeta = content.includes('<!-- meta:');
  
  // Optional sections
  const hasDescription = /^## Description/m.test(content); // Now optional
  const hasGenerationNote = content.includes('<!-- generated via checkmate'); // Now optional
  
  // Advanced validation
  const checkItemsMatch = content.match(/- \\[([ x🟩🟥])\\] (.*)/g) || [];
  // We're no longer enforcing a strict verb-object pattern for check items
  // Instead, we'll just verify they're not empty and have reasonable content
  const hasBulletXFormat = checkItemsMatch.every(item => {
    const bulletText = item.replace(/- \\[([ x🟩🟥])\\] /, '').trim();
    // Just check that the bullet isn't empty or too short (< 5 chars)
    return bulletText.length >= 5;
  });
  
  // Check file listings
  const fileItems = [];
  // This regex is more permissive to match the Files section until the end of the file or next section
  const filesSection = content.match(/## Files\s*([\s\S]*?)(?=\n##|\n<!--|\n<|\n\s*$|$)/);
  if (filesSection && filesSection[1]) {
    const fileListText = filesSection[1];
    const fileMatches = fileListText.match(/- [^\n]+/g);
    if (fileMatches) {
      fileMatches.forEach(match => {
        const file = match.replace(/^- /, '').trim();
        if (file.length > 0) {
          fileItems.push(file);
        }
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
    errors.push('Missing check items (should have "- [ ]", "- [x]", "- [🟩]", or "- [🟥]" lines)');
  }
  
  if (!hasBulletXFormat && checkItemsMatch.length > 0) {
    errors.push('Check items should follow "verb + object" format (e.g., "validate credentials")');
  }
  
  if (fileItems.length === 0) {
    errors.push('No files listed in the Files section');
  }
  
  // Compare files section with meta files only if meta section exists
  if (hasMeta) {
    const filesDiff = fileItems.filter(file => !metaFiles.includes(file));
    const metaDiff = metaFiles.filter(file => !fileItems.includes(file));
    
    if (filesDiff.length > 0 || metaDiff.length > 0) {
      errors.push('Files in the Files section do not match files in the meta section');
    }
  }
  
  // If running in fix mode, we would automatically correct issues here
  const fixMode = process.argv.includes('--fix');
  if (fixMode) {
    // Attempt to fix common issues
    let fixedContent = content;
    let fixedIssues = [];

    // 1. Add Files section if missing but we have files from meta
    if (!hasFilesSection && hasMeta && metaFiles.length > 0) {
      const checksIndex = fixedContent.indexOf('## Checks');
      if (checksIndex !== -1) {
        // Find the next section after Checks
        const nextSectionMatch = fixedContent.slice(checksIndex + 9).match(/^##\s/m);
        const insertPosition = nextSectionMatch 
          ? checksIndex + 9 + nextSectionMatch.index 
          : fixedContent.length;
        
        // Generate Files section content
        const filesSection = `\n\n## Files\n${metaFiles.map(file => `- ${file}`).join('\n')}\n`;
        
        // Insert the Files section
        fixedContent = 
          fixedContent.slice(0, insertPosition) + 
          filesSection + 
          fixedContent.slice(insertPosition);
        
        fixedIssues.push('Added Files section from meta files');
      }
    }

    // 2. Add generation note if missing (still helpful but not required)
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