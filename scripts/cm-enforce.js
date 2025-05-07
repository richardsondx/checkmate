#!/usr/bin/env node

/**
 * CheckMate enforcement script for Cursor integration
 * 
 * This script runs CheckMate commands and ensures proper exit codes
 * and machine-readable output markers for Cursor integration.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
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
const failEarly = args.includes('--fail-early');

// Clean up the args we handle
const checkMateArgs = args.filter(arg => 
  arg !== '--strict-specs' && 
  arg !== '--quiet' && 
  arg !== '--json' &&
  arg !== '--fail-early'
);

// Max fix attempts - from env or config
function getMaxFixAttempts() {
  // Check environment variable first
  if (process.env.CM_MAX_FIXES) {
    return Number(process.env.CM_MAX_FIXES);
  }
  
  // Check .checkmate config file
  try {
    if (existsSync('.checkmate')) {
      const config = readFileSync('.checkmate', 'utf8');
      const autoFixMatch = config.match(/auto_fix:\s*\n\s*max_attempts:\s*(\d+)/);
      if (autoFixMatch && autoFixMatch[1]) {
        return Number(autoFixMatch[1]);
      }
    }
  } catch (e) {
    // Silently continue if config read fails
  }
  
  // Default value
  return 5;
}

// Get current fix count
function getFixCount() {
  try {
    if (existsSync('.cursor/cm_fix_count')) {
      return Number(readFileSync('.cursor/cm_fix_count', 'utf8'));
    }
  } catch (e) {
    // Silently continue if read fails
  }
  
  return 0;
}

// Update fix count
function updateFixCount(count) {
  try {
    writeFileSync('.cursor/cm_fix_count', String(count));
  } catch (e) {
    // Silently continue if write fails
    if (!quietMode) {
      console.error("Failed to update fix count:", e);
    }
  }
}

// Reset fix count
function resetFixCount() {
  try {
    if (existsSync('.cursor/cm_fix_count')) {
      unlinkSync('.cursor/cm_fix_count');
    }
  } catch (e) {
    // Silently continue if delete fails
  }
}

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

// Add --fail-early if requested
if (failEarly && !checkMateArgs.includes('--fail-early')) {
  finalArgs.push('--fail-early');
}

// Ensure we capture stdout if we need to parse it for emoji summary
const stdioOptions = jsonOutput ? 'pipe' : 'inherit';
const result = spawnSync('npx', ['checkmate', ...finalArgs], {
  stdio: stdioOptions,
  encoding: 'utf8'
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
  
  // Add emoji summary for passing specs
  try {
    if (result.stdout) {
      const r = JSON.parse(result.stdout);
      if (r.specs) {
        const rows = r.specs.map(s => `✅ ${s.slug}`).join("\n");
        console.log("\n" + rows);
        console.log(`\nSummary: ${r.total}/${r.total} pass`);
      }
    }
  } catch (e) {
    // Silently continue if parsing fails
  }
  
  // Reset fix count on success
  resetFixCount();
  process.exit(0);
} else {
  // Handle fix attempts counting
  const maxAttempts = getMaxFixAttempts();
  const currentCount = getFixCount();
  
  if (currentCount + 1 >= maxAttempts) {
    if (!quietMode) {
      console.error(`${CM_FAIL} Max automatic fix attempts (${maxAttempts}) reached`);
    }
    process.exit(2); // Special exit code for max attempts
  }
  
  // Increment the fix counter
  updateFixCount(currentCount + 1);
  
  if (jsonOutput) {
    console.log(JSON.stringify({
      status: 'FAIL',
      fixAttempt: currentCount + 1,
      maxAttempts: maxAttempts,
      exitCode: 1
    }));
  } else if (!quietMode) {
    console.error(`${CM_FAIL} CheckMate requirements failed (fix attempt ${currentCount + 1}/${maxAttempts})`);
  }
  
  // Add emoji summary for failing specs
  try {
    if (result.stdout) {
      const r = JSON.parse(result.stdout);
      if (r.specs) {
        const rows = r.specs.map(s =>
          `${s.pass ? "✅" : "❌"} ${s.slug}`).join("\n");
        console.log("\n" + rows);
        console.log(`\nSummary: ${r.totalPass}/${r.total} pass`);
      }
    }
  } catch (e) {
    // Silently continue if parsing fails
  }
  
  process.exit(1);
} 