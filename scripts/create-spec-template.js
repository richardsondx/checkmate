#!/usr/bin/env node

/**
 * CheckMate Spec Template Generator
 * Creates a correctly formatted spec template with proper sections
 * 
 * Usage:
 *   node scripts/create-spec-template.js <title> [--files=file1.js,file2.js]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// The directory where specs are stored
const SPECS_DIR = 'checkmate/specs';

// Create a slug from a title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Generate a base64 hash of file content (or placeholder if file doesn't exist)
function generateFileHash(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      // Take first 100 chars for the hash to keep it manageable
      const hashSource = content.slice(0, 100);
      return Buffer.from(hashSource).toString('base64');
    }
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}`);
  }
  
  // Return placeholder hash
  return Buffer.from(`placeholder-hash-for-${filePath}`).toString('base64');
}

// Build a template spec file
function buildSpecTemplate(title, files = []) {
  const slug = createSlug(title);
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Generate file hashes
  const fileHashes = {};
  for (const file of files) {
    fileHashes[file] = generateFileHash(file);
  }
  
  // Create a meta section
  const meta = {
    files,
    file_hashes: fileHashes
  };
  
  // Format the template
  return `# ${title}

## Checks
- [ ] validate feature requirements
- [ ] implement core functionality
- [ ] handle error cases

## Files
${files.map(file => `- ${file}`).join('\n')}

<!-- meta:
${JSON.stringify(meta, null, 2)}
-->

<!-- generated via checkmate spec v0.5 on ${now} -->
`;
}

// Main function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Please provide a title for the spec');
    console.error('Usage: node scripts/create-spec-template.js "Feature Title" [--files=file1.js,file2.js]');
    process.exit(1);
  }
  
  const title = args[0];
  let files = [];
  
  // Look for --files argument
  const filesArg = args.find(arg => arg.startsWith('--files='));
  if (filesArg) {
    files = filesArg.replace('--files=', '').split(',');
  }
  
  // Generate the slug from the title
  const slug = createSlug(title);
  
  // Create the specs directory if it doesn't exist
  if (!fs.existsSync(SPECS_DIR)) {
    fs.mkdirSync(SPECS_DIR, { recursive: true });
  }
  
  // Create the output file path
  const outputPath = path.join(SPECS_DIR, `${slug}.md`);
  
  // Check if the file already exists
  if (fs.existsSync(outputPath)) {
    console.error(`Error: Spec file already exists at ${outputPath}`);
    process.exit(1);
  }
  
  // Build the template
  const template = buildSpecTemplate(title, files);
  
  // Write the template to the file
  fs.writeFileSync(outputPath, template, 'utf8');
  
  console.log(`✅ Created spec template: ${outputPath}`);
  console.log(`📝 Edit the file to add your specific requirements`);
  
  if (files.length > 0) {
    console.log(`📄 Included ${files.length} file${files.length === 1 ? '' : 's'} in the spec`);
  } else {
    console.log(`ℹ️ No files specified. You should add relevant files to the spec.`);
  }
}

// Run the main function
main().catch(error => {
  console.error('Error creating spec template:', error);
  process.exit(1);
}); 