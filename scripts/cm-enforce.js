#!/usr/bin/env node

/**
 * CheckMate enforcement script for Cursor integration
 * 
 * This script runs CheckMate commands and ensures proper exit codes
 * and machine-readable output markers for Cursor integration.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Define visual markers for machine-readable output
const CM_PASS = '[CM-PASS]';
const CM_FAIL = '[CM-FAIL]';
const CM_SPEC_MODIFIED = '[CM-SPEC-MODIFIED]';

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const quietMode = args.includes('--quiet');
const jsonOutput = args.includes('--json');
const strictModeEnabled = args.includes('--strict-specs');

// Clean up the args we handle
const checkMateArgs = args.filter(arg => 
  arg !== '--strict-specs' && 
  arg !== '--quiet' && 
  arg !== '--json'
);

// Check for spec modifications if verification script exists
function checkSpecs() {
  const specVerifyScript = join(__dirname, 'spec-snapshot.js');
  
  // Skip if the spec verification script doesn't exist
  if (!existsSync(specVerifyScript)) {
    return true;
  }
  
  if (!quietMode) {
    console.log("⚠️ Checking for modifications to spec files...");
  }
  
  // First check if snapshot exists, and if not, create it
  if (!existsSync('checkmate/specs/spec-snapshot.json')) {
    if (!quietMode) {
      console.log("📸 Creating initial spec snapshot...");
    }
    const createResult = spawnSync('node', [specVerifyScript, 'create'], {
      stdio: quietMode ? 'ignore' : 'inherit'
    });
    
    if (createResult.status !== 0) {
      if (!quietMode) {
        console.error("❌ Failed to create spec snapshot");
      }
      return false;
    }
    
    if (!quietMode) {
      console.log("✅ Created spec snapshot. Future changes will be detected.");
    }
    return true;
  }
  
  const verifyResult = spawnSync('node', [specVerifyScript, 'verify'], {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  
  if (verifyResult.status !== 0) {
    if (!quietMode) {
      console.error("\n❌ WARNING: Spec files have been modified!");
      console.error("This could indicate an attempt to bypass test requirements.");
      console.error(verifyResult.stderr || verifyResult.stdout);
    }
    
    // Print machine-readable marker
    console.error(`${CM_SPEC_MODIFIED} Unauthorized spec modifications detected`);
    
    return false;
  }
  
  return true;
}

// Display header unless quiet mode or JSON output
if (!quietMode && !jsonOutput) {
  console.log("");
  console.log("╔═════════════════════════════════════════╗");
  console.log("║            CHECKMATE ENFORCER           ║");
  console.log("╚═════════════════════════════════════════╝");
  console.log("");
}

// Check for spec modifications if enabled in .checkmate
const specCheckPassed = checkSpecs();

// In strict mode, fail if spec check failed
if (!specCheckPassed && strictModeEnabled) {
  if (jsonOutput) {
    console.log(JSON.stringify({
      status: 'FAIL',
      reason: 'Spec files were modified',
      exitCode: 1
    }));
  } else {
    console.error(`${CM_FAIL} CheckMate requirements failed - Spec files were modified`);
  }
  process.exit(1);
}

// Forward the command to checkmate
// Add --json flag if jsonOutput is true and it wasn't already in the args
const finalArgs = [...checkMateArgs];
if (jsonOutput && !checkMateArgs.includes('--json')) {
  finalArgs.push('--json');
}

// Add --quiet flag if quietMode is true and it wasn't already in the args
if (quietMode && !checkMateArgs.includes('--quiet')) {
  finalArgs.push('--quiet');
}

const result = spawnSync('npx', ['checkmate', ...finalArgs], {
  stdio: 'inherit'
});

// Display footer unless quiet mode or JSON output
if (!quietMode && !jsonOutput) {
  console.log("");
  console.log("╔═════════════════════════════════════════╗");
  console.log("║           CHECKMATE COMPLETE            ║");
  console.log("╚═════════════════════════════════════════╝");
  console.log("");
}

// Set exit code and output appropriate marker
if (result.status === 0) {
  if (jsonOutput) {
    console.log(JSON.stringify({
      status: 'PASS',
      exitCode: 0
    }));
  } else if (!quietMode) {
    console.log(`${CM_PASS} CheckMate requirements passed`);
  }
  process.exit(0);
} else {
  if (jsonOutput) {
    console.log(JSON.stringify({
      status: 'FAIL',
      exitCode: 1
    }));
  } else if (!quietMode) {
    console.error(`${CM_FAIL} CheckMate requirements failed`);
  }
  process.exit(1);
} 