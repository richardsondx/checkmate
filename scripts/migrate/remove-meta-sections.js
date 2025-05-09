#!/usr/bin/env node

/**
 * Migration script for CheckMate spec files
 * Removes meta sections and ensures Files sections are present
 * Usage:
 *   - node scripts/migrate/remove-meta-sections.js [dry-run]
 */

import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';
import chalk from 'chalk';

// Flag for dry run mode (no changes written)
const dryRun = process.argv.includes('--dry-run');

// Find all spec files
const specsPath = path.join(process.cwd(), 'checkmate/specs');
const specFiles = glob.sync('**/*.md', { cwd: specsPath });

console.log(chalk.blue(`Found ${specFiles.length} spec files to process`));

let migratedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Process each spec file
for (const specFile of specFiles) {
  const fullPath = path.join(specsPath, specFile);
  console.log(chalk.dim(`Processing ${specFile}...`));
  
  try {
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Extract meta section if it exists
    const metaRegex = /<!-- meta:\s*\n([\s\S]*?)\n-->/;
    const metaMatch = content.match(metaRegex);
    
    // Check for existing Files section
    const hasFilesSection = /^## Files/m.test(content);
    
    // If no meta section and already has Files section, skip
    if (!metaMatch && hasFilesSection) {
      console.log(chalk.dim(`  Skipping - already using new format`));
      skippedCount++;
      continue;
    }
    
    // Extract file paths from meta section
    let filePaths = [];
    if (metaMatch) {
      try {
        const metaJson = JSON.parse(metaMatch[1]);
        if (metaJson.file_hashes) {
          filePaths = Object.keys(metaJson.file_hashes);
        }
      } catch (error) {
        console.error(chalk.yellow(`  Error parsing meta section: ${error.message}`));
      }
    }
    
    // Create new content
    let newContent = content;
    
    // Remove meta section
    if (metaMatch) {
      newContent = newContent.replace(metaRegex, '');
    }
    
    // Add or update Files section
    if (!hasFilesSection && filePaths.length > 0) {
      // Find a good insertion point (after ## Checks section)
      const checksIndex = newContent.indexOf('## Checks');
      if (checksIndex !== -1) {
        // Find the next section after Checks
        const nextSectionMatch = newContent.slice(checksIndex + 9).match(/^##\s/m);
        const insertPosition = nextSectionMatch 
          ? checksIndex + 9 + nextSectionMatch.index 
          : newContent.length;
        
        // Generate Files section content
        const filesSection = `\n\n## Files\n${filePaths.map(file => `- ${file}`).join('\n')}\n`;
        
        // Insert the Files section
        newContent = 
          newContent.slice(0, insertPosition) + 
          filesSection + 
          newContent.slice(insertPosition);
      } else {
        // If no Checks section found, append to the end
        newContent += `\n\n## Files\n${filePaths.map(file => `- ${file}`).join('\n')}\n`;
      }
    } else if (hasFilesSection && filePaths.length > 0) {
      // Extract existing Files section
      const filesSectionRegex = /## Files\s*\n([\s\S]*?)(?:\n##|\n<!-- meta:|\n$)/;
      const filesSectionMatch = newContent.match(filesSectionRegex);
      
      if (filesSectionMatch) {
        const existingFiles = filesSectionMatch[1]
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace(/^- /, '').trim());
        
        // Merge with files from meta section
        const allFiles = [...new Set([...existingFiles, ...filePaths])];
        
        // Replace Files section
        const newFilesSection = `## Files\n${allFiles.map(file => `- ${file}`).join('\n')}\n`;
        newContent = newContent.replace(filesSectionRegex, newFilesSection);
      }
    }
    
    // Clean up extra blank lines
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    
    // Only write changes if content was modified
    if (newContent !== content) {
      if (!dryRun) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(chalk.green(`  Updated ${specFile}`));
      } else {
        console.log(chalk.yellow(`  Would update ${specFile} (dry run)`));
      }
      migratedCount++;
    } else {
      console.log(chalk.dim(`  No changes needed`));
      skippedCount++;
    }
  } catch (error) {
    console.error(chalk.red(`  Error processing ${specFile}: ${error.message}`));
    errorCount++;
  }
}

// Summary
console.log('\n' + chalk.bold('Migration Summary'));
console.log(chalk.green(`✅ ${migratedCount} files ${dryRun ? 'would be' : 'were'} migrated`));
console.log(chalk.blue(`ℹ️ ${skippedCount} files already in the correct format`));
console.log(chalk.red(`❌ ${errorCount} files had errors during processing`));

if (dryRun) {
  console.log(chalk.yellow('\nThis was a dry run. No files were modified.'));
  console.log(chalk.yellow('Run without --dry-run to apply changes.'));
} 