#!/usr/bin/env node

/**
 * Script to update the front-matter in all CheckMate rule files
 * This ensures all rule files have alwaysApply: true
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the correct paths in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory (parent of the scripts directory)
const projectRoot = path.resolve(__dirname, '..');

// Define the rules directory
const rulesDir = path.join(projectRoot, '.cursor', 'rules', 'checkmate');

console.log(`Project root: ${projectRoot}`);
console.log(`Rules directory: ${rulesDir}`);

// Create rules directory if it doesn't exist
if (!fs.existsSync(rulesDir)) {
  console.log(`Rules directory ${rulesDir} does not exist. Nothing to update.`);
  process.exit(0);
}

// Get all .mdc files in the rules directory
const ruleFiles = fs.readdirSync(rulesDir)
  .filter(file => file.endsWith('.mdc'));

if (ruleFiles.length === 0) {
  console.log(`No .mdc files found in ${rulesDir}. Nothing to update.`);
  process.exit(0);
}

console.log(`Found ${ruleFiles.length} rule files to update.`);

// Function to update frontmatter in a file
function updateFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file already has frontmatter
  if (!content.startsWith('---')) {
    // Add new frontmatter to the file
    const newContent = `---
description: CheckMate rule
type: "Agent Requested"
globs: 
alwaysApply: true
---
${content}`;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Added frontmatter to ${path.basename(filePath)}`);
    return;
  }
  
  // Extract existing frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.error(`Could not parse frontmatter in ${path.basename(filePath)}`);
    return;
  }
  
  const frontmatter = frontmatterMatch[1];
  const contentAfterFrontmatter = content.slice(frontmatterMatch[0].length);
  
  // Check if alwaysApply is already set to true
  if (frontmatter.includes('alwaysApply: true')) {
    console.log(`${path.basename(filePath)} already has alwaysApply: true`);
    return;
  }
  
  // Update or add alwaysApply: true
  let newFrontmatter;
  if (frontmatter.includes('alwaysApply:')) {
    newFrontmatter = frontmatter.replace(/alwaysApply:\s*(false|no|off)/i, 'alwaysApply: true');
  } else {
    newFrontmatter = `${frontmatter.trim()}\nalwaysApply: true`;
  }
  
  // Create new content with updated frontmatter
  const newContent = `---
${newFrontmatter}
---${contentAfterFrontmatter}`;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated frontmatter in ${path.basename(filePath)}`);
}

// Update frontmatter in all rule files
let updatedCount = 0;
for (const ruleFile of ruleFiles) {
  try {
    const rulePath = path.join(rulesDir, ruleFile);
    updateFrontmatter(rulePath);
    updatedCount++;
  } catch (err) {
    console.error(`Error updating ${ruleFile}:`, err);
  }
}

console.log(`✅ Successfully updated ${updatedCount} of ${ruleFiles.length} rule files.`); 