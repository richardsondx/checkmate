#!/usr/bin/env node

/**
 * CheckMate Spec Drift Detection Script
 * Integrates with Cursor rules to detect drift between specs and implementation
 */

import { exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The file being edited (if provided as an argument)
const targetFile = process.argv[2];

// Default spec to check (can be overridden with --spec)
const DEFAULT_SPEC = '';

// Function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Function to find spec that contains the file
async function findSpecForFile(filePath) {
  if (!filePath) return null;
  
  try {
    const result = await executeCommand(`cd "${process.cwd()}" && npx checkmate affected --json`);
    const specs = JSON.parse(result);
    
    if (specs && specs.length > 0) {
      return specs[0]; // Return the first affected spec
    }
    
    return null;
  } catch (error) {
    console.error('Error finding spec for file:', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Find which spec is associated with the file
    const specName = await findSpecForFile(targetFile) || DEFAULT_SPEC;
    
    if (!specName) {
      console.log('No associated spec found for this file. Use --spec to specify a spec.');
      process.exit(0);
    }
    
    console.log(`Checking for spec drift in ${specName}...`);
    
    // Run the outline command with diff to check for drift
    const command = `cd "${process.cwd()}" && npx checkmate outline --spec ${specName} --diff --quiet`;
    
    try {
      const result = await executeCommand(command);
      
      // Parse the result to check for conflicts
      if (result.includes('Conflicts/Missing') && result.match(/❌\s+Conflicts\/Missing:\s+(\d+)/)[1] !== '0') {
        console.error(`[CM-DRIFT] Spec drift detected in ${specName}. Implementation has diverged from the spec.`);
        
        // Print suggestion
        console.log('\n🔍 Run this command to see the detailed diff:');
        console.log(`npx checkmate outline --spec ${specName} --diff`);
        
        console.log('\n💡 Options:');
        console.log('1. Update the code to match the spec');
        console.log('2. Update the spec to match the implementation');
        
        process.exit(1);
      } else {
        console.log(`✅ No significant drift detected in ${specName}`);
        process.exit(0);
      }
    } catch (error) {
      console.error('Error running outline command:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 