#!/usr/bin/env node

/**
 * CheckMate Feature Auto-Fix Helper
 * 
 * This script enforces continuous fix attempts for CheckMate feature validation
 * until max_attempts as specified in .checkmate is reached or all checks pass.
 */

import fs from 'fs';
import { execSync, spawn } from 'child_process';
import path from 'path';

// Configuration
const DEFAULT_MAX_ATTEMPTS = 5;
const CHECK_FILE = '.checkmate';

// Utility functions
function readMaxAttemptsFromConfig() {
  try {
    if (fs.existsSync(CHECK_FILE)) {
      const config = fs.readFileSync(CHECK_FILE, 'utf8');
      const maxAttemptsMatch = config.match(/auto_fix:\s*\n\s*max_attempts:\s*(\d+)/);
      if (maxAttemptsMatch && maxAttemptsMatch[1]) {
        return parseInt(maxAttemptsMatch[1], 10);
      }
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
  return DEFAULT_MAX_ATTEMPTS;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    let output = '';
    const proc = spawn(command, args, { 
      stdio: ['inherit', 'pipe', 'inherit'] // Capture stdout for analysis
    });
    
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      // Echo to console so user can see progress
      process.stdout.write(chunk);
    });
    
    proc.on('close', (code) => {
      // Check if the audit actually succeeded by examining the output
      // Look for failure markers in the output
      const hasMissingSpecChecks = output.includes('spec-only bullet');
      const hasExplicitFailMessage = output.includes('Audit failed');
      
      if (hasMissingSpecChecks || hasExplicitFailMessage) {
        // If there are still failing checks, consider this a failure
        console.log('\n⚠️ Detected failing checks in the audit output');
        resolve(false);
      } else {
        // All checks are passing
        resolve(code === 0);
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main function to handle continuous fix attempts
 */
async function enforceFeatureFixing(specName, initialAttempt = 0) {
  const maxAttempts = readMaxAttemptsFromConfig();
  let currentAttempt = initialAttempt;
  let success = false;
  
  console.log(`
┌─────────────────────────────────────────┐
│    CHECKMATE FEATURE VALIDATION FIX     │
│     For feature spec: ${specName.padEnd(16)}    │
└─────────────────────────────────────────┘
`);
  
  console.log(`ℹ️ Max fix attempts allowed: ${maxAttempts} (from .checkmate)`);
  console.log(`🔍 Starting continuous fix workflow...\n`);
  
  // Main fixing loop
  while (currentAttempt < maxAttempts) {
    currentAttempt++;
    
    console.log(`\n🔄 Fix attempt ${currentAttempt}/${maxAttempts} for "${specName}"`);
    console.log(`───────────────────────────────────────────`);
    
    try {
      // Run audit with auto-sync to try fixing issues
      success = await runCommand('node', [
        './dist/index.js', 
        'audit', 
        '--spec', 
        specName, 
        '--auto-sync', 
        '--force'
      ]);
      
      if (success) {
        console.log(`\n✅ SUCCESS! All checks for "${specName}" now pass!`);
        console.log(`🎉 Fixed successfully on attempt ${currentAttempt}/${maxAttempts}`);
        break;
      } else {
        if (currentAttempt < maxAttempts) {
          console.log(`\n⚠️ Fix attempt ${currentAttempt} failed. Automatically trying again...`);
          console.log(`⏳ Attempts remaining: ${maxAttempts - currentAttempt}`);
          console.log(`❗ MUST CONTINUE fixing until all checks pass or max attempts reached`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error during fix attempt ${currentAttempt}:`, error);
    }
  }
  
  if (!success) {
    console.log(`\n❌ Failed to fix all checks after ${maxAttempts} attempts`);
    console.log(`👨‍💻 Manual intervention required to fix remaining checks.`);
    process.exit(1);
  }
  
  return success;
}

// Parse command line arguments
const args = process.argv.slice(2);
const specNameArg = args[0];

if (!specNameArg) {
  console.error(`
❌ Error: No spec name provided
Usage: node scripts/cm-feature-fix.js <spec-name> [initial-attempt]
Example: node scripts/cm-feature-fix.js warmup
`);
  process.exit(1);
}

// Get initial attempt count if provided
const initialAttempt = args[1] ? parseInt(args[1], 10) : 0;

// Run the fixing workflow
enforceFeatureFixing(specNameArg, initialAttempt)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 