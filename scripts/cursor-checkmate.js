#!/usr/bin/env node
/**
 * Helper script for integrating CheckMate with Cursor
 * Allows easy invocation from Cursor tasks
 * 
 * Usage:
 *   node scripts/cursor-checkmate.js "Feature description" file1.js file2.js
 * 
 * The first argument is the feature description, all remaining arguments are files
 */
import { spawnSync } from 'node:child_process';

// Get command line arguments
const [featureDesc, ...files] = process.argv.slice(2);

if (!featureDesc) {
  console.error('Error: Feature description is required');
  console.error('Usage: node scripts/cursor-checkmate.js "Feature description" [file1.js file2.js ...]');
  process.exit(1);
}

// Create the payload
const payload = {
  feature: featureDesc,
  files: files.length > 0 ? files : undefined
};

// Call checkmate create command
try {
  console.log(`Creating spec for: "${featureDesc}" with ${files.length} files`);
  
  const result = spawnSync('npx', ['checkmate', 'create', '--json', JSON.stringify(payload)], {
    stdio: 'inherit',
    shell: true
  });
  
  if (result.error) {
    console.error('Error executing checkmate command:', result.error);
    process.exit(1);
  }
  
  process.exit(result.status || 0);
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} 