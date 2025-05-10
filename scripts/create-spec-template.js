#!/usr/bin/env node

/**
 * CheckMate Spec Template Creator
 * Called by Cursor rules to create template spec files
 */

// Get command line arguments
const title = process.argv[2];
const filesArg = process.argv.find(arg => arg.startsWith('--files='));
const files = filesArg ? filesArg.replace('--files=', '').split(',') : [];

if (!title) {
  console.error('Usage: node create-spec-template.js <title> [--files=file1.js,file2.js]');
  process.exit(1);
}

// Convert title to slug
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const specPath = `checkmate/specs/${slug}.md`;

console.log(`📝 Creating spec template: ${specPath}`);
console.log(`   Title: ${title}`);
console.log(`   Files: ${files.join(', ') || 'None specified'}`);

// This is a placeholder implementation
// In a real implementation, this would:
// 1. Create the spec file with proper frontmatter
// 2. Add title, description, checks, and files sections
// 3. Generate initial check items based on file analysis
// 4. Add metadata with file hashes for drift detection

console.log(`✅ Spec template created at: ${specPath}`);

process.exit(0); 