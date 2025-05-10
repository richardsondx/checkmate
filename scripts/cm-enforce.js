#!/usr/bin/env node

/**
 * CheckMate Enforce Script
 * Called by Cursor rules to run CheckMate checks and enforce auto-fixing
 * 
 * This is a simplified script that forwards commands to the CheckMate CLI
 */

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node cm-enforce.js <command> [options]');
  process.exit(1);
}

// Check which command to run
const command = args[0];

// Process options
const options = args.slice(1);

// Simply forward to the CheckMate CLI
const { spawnSync } = require('child_process');

console.log(`🔍 Running CheckMate ${command} with options: ${options.join(' ')}`);

// Run the CheckMate command
const result = spawnSync('npx', ['checkmate', command, ...options], {
  stdio: 'inherit',
  encoding: 'utf-8'
});

// Forward the exit code
process.exit(result.status || 0); 