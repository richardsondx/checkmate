/**
 * Cursor rule file management for CheckMate CLI
 * Handles creating and writing .mdc rule files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Constants
const CURSOR_RULES_DIR = '.cursor/rules';
const CHECKMATE_RULES_DIR = '.cursor/rules/checkmate';

// Frontmatter for Cursor rules
const RULE_FRONTMATTER = `---
description: 
globs: 
alwaysApply: true
---
`;

// Rule templates
const RULE_TEMPLATES = {
  'pre-task': `${RULE_FRONTMATTER}# CheckMate – Scope & Reset
- Scope analysis:
  - Execute: checkmate affected --json > .cursor/cm_list.json
- Reset automatic‑fix counter:
  - SetEnv: CM_FIX_COUNT=0`,

  'post-task': `${RULE_FRONTMATTER}# CheckMate – Verify & Auto‑Fix
- Execute: checkmate run-script cm-enforce run \\
           --target "$(jq -r '.[]' .cursor/cm_list.json)" \\
           --fail-early
- Env:
    CM_MAX_FIXES: 5
    CM_FIX_COUNT: $CM_FIX_COUNT`,

  'post-push': `${RULE_FRONTMATTER}# CheckMate – Full Suite on Push
- Execute: checkmate run-script cm-enforce run`
};

/**
 * Ensure the Cursor rules directory exists
 */
export function ensureCursorRulesDir(): void {
  // Ensure main rules directory exists
  if (!fs.existsSync(CURSOR_RULES_DIR)) {
    fs.mkdirSync(CURSOR_RULES_DIR, { recursive: true });
    console.log(`Created directory: ${CURSOR_RULES_DIR}`);
  }
  
  // Ensure checkmate subdirectory exists
  if (!fs.existsSync(CHECKMATE_RULES_DIR)) {
    fs.mkdirSync(CHECKMATE_RULES_DIR, { recursive: true });
    console.log(`Created directory: ${CHECKMATE_RULES_DIR}`);
  }
}

/**
 * Write a rule file if it doesn't exist or prompt for overwrite
 */
export function writeRule(name: string, content: string, force = false): boolean {
  ensureCursorRulesDir();
  
  // Use the checkmate subdirectory for all checkmate rules
  const rulePath = path.join(CHECKMATE_RULES_DIR, `${name}.mdc`);
  
  // Check if file already exists
  if (fs.existsSync(rulePath) && !force) {
    console.log(chalk.yellow(`Rule file ${name}.mdc already exists. Skipping.`));
    return false;
  }
  
  // Write the rule file
  fs.writeFileSync(rulePath, content, 'utf8');
  console.log(chalk.green(`Created Cursor rule file: ${rulePath}`));
  return true;
}

/**
 * Copy rule files directly from the installed checkmateai package
 * This ensures consistent rule templates across all projects
 */
export function copyRulesFromPackage(force = false): boolean {
  console.log(chalk.blue("Copying rule templates from checkmateai package..."));
  
  try {
    ensureCursorRulesDir();
    
    // First try locating ourselves directly
    const currentFilePath = fileURLToPath(import.meta.url);
    console.log(chalk.blue(`Current file path: ${currentFilePath}`));

    // We need to figure out if we're running from source or from an installed package
    // Strategy 1: Direct derivation from current path
    let packageDir = path.resolve(currentFilePath, '..', '..', '..'); 
    
    // Alternative strategy: Use the project's root directory (where we're running from)
    const projectRoot = process.cwd();
    console.log(chalk.blue(`Project root: ${projectRoot}`));
    
    // First check if we're running from within the package itself
    if (projectRoot.endsWith('/checkmateai')) {
      console.log(chalk.blue('Running from within the checkmateai package'));
      packageDir = projectRoot;
    }
    
    console.log(chalk.blue(`Package directory: ${packageDir}`));
    
    // Check several possible locations for the rule templates
    const possibleRulesDirs = [
      path.join(packageDir, '.cursor', 'rules', 'checkmate'),                      // Direct package (checkmate subdir)
      path.join(packageDir, '.cursor', 'rules'),                                   // Direct package (main rules dir)
      path.join(projectRoot, '.cursor', 'rules', 'checkmate'),                     // Project root (checkmate subdir)
      path.join(projectRoot, '.cursor', 'rules'),                                  // Project root (main rules dir)
      path.join(projectRoot, 'node_modules', 'checkmateai', '.cursor', 'rules', 'checkmate'), // node_modules (checkmate subdir)
      path.join(projectRoot, 'node_modules', 'checkmateai', '.cursor', 'rules')    // node_modules (main rules dir)
    ];
    
    let packageRulesDir: string | null = null;
    
    // Find the first directory that exists and contains .mdc files
    for (const dir of possibleRulesDirs) {
      console.log(chalk.blue(`Checking for rule templates in: ${dir}`));
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          if (files.some(file => file.endsWith('.mdc'))) {
            packageRulesDir = dir;
            console.log(chalk.green(`Found rule templates in: ${dir}`));
            break;
          }
        } catch (err) {
          console.error(chalk.yellow(`Error reading directory ${dir}: ${err}`));
        }
      }
    }
    
    if (!packageRulesDir) {
      console.error(chalk.yellow('No rule templates directory found'));
      return false;
    }
    
    // Get list of all .mdc files in the package rules directory
    let ruleFiles: string[] = [];
    try {
      ruleFiles = fs.readdirSync(packageRulesDir)
        .filter(file => file.endsWith('.mdc'));
    } catch (err) {
      console.error(chalk.red(`Error reading package rules directory: ${err}`));
      return false;
    }
    
    if (ruleFiles.length === 0) {
      console.error(chalk.yellow('No .mdc rule files found in package'));
      return false;
    }
    
    // Copy each rule file to the CHECKMATE_RULES_DIR directory
    let successCount = 0;
    for (const ruleFile of ruleFiles) {
      const sourcePath = path.join(packageRulesDir, ruleFile);
      const destPath = path.join(CHECKMATE_RULES_DIR, ruleFile);
      
      // Check if destination file already exists
      if (fs.existsSync(destPath) && !force) {
        console.log(chalk.yellow(`Rule file ${ruleFile} already exists. Skipping.`));
        continue;
      }
      
      try {
        // Copy the file
        fs.copyFileSync(sourcePath, destPath);
        console.log(chalk.green(`Copied rule file to checkmate subdirectory: ${ruleFile}`));
        successCount++;
      } catch (err) {
        console.error(chalk.red(`Error copying ${ruleFile}: ${err}`));
      }
    }
    
    if (successCount > 0) {
      console.log(chalk.green(`Successfully copied ${successCount} rule files from package to checkmate subdirectory`));
      
      // Create a marker file to indicate we've imported from the package
      // This will be used by create-cursor-mdc-rules.js to know it can skip template-based creation
      try {
        const markerPath = path.join(CHECKMATE_RULES_DIR, '.package-imported');
        fs.writeFileSync(markerPath, new Date().toISOString(), 'utf8');
        console.log(chalk.green('Created package import marker file in checkmate subdirectory'));
      } catch (err) {
        console.error(chalk.yellow(`Warning: Could not create marker file: ${err}`));
      }
      
      return true;
    } else {
      console.error(chalk.yellow('No rule files were copied from package'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red("Failed to copy rules from package:"), error);
    return false;
  }
}

/**
 * Generate all rule files
 */
export function generateAllRules(force = false): void {
  ensureCursorRulesDir();
  
  // Try to copy rules from package first
  const packageCopySuccess = copyRulesFromPackage(force);
  
  // If package copy failed, fall back to legacy method
  if (!packageCopySuccess) {
    console.log(chalk.blue("Falling back to template-based rule generation..."));
    
    // Create each rule file from templates
    Object.entries(RULE_TEMPLATES).forEach(([name, content]) => {
      writeRule(name, content, force);
    });
    
    // Create/update additional .mdc validation rules using our dedicated script
    createMdcRules(force);
  }
}

/**
 * Set up the JSON rule files for spec validation
 * @deprecated Use createMdcRules instead
 */
export function setupJsonRules(force = false): void {
  console.log(chalk.yellow("Warning: setupJsonRules is deprecated. Using createMdcRules instead."));
  createMdcRules(force);
}

/**
 * Set up all the .mdc rule files for CheckMate validation
 */
export function createMdcRules(force = false): void {
  // Try to copy rules from package first
  const packageCopySuccess = copyRulesFromPackage(force);
  
  // If package copy was successful, we're done
  if (packageCopySuccess) {
    return;
  }
  
  // Otherwise fall back to using the script
  console.log(chalk.blue("Setting up CheckMate validation rules in .mdc format..."));
  
  try {
    // Find the script relative to the CheckMate package using ES module compatible approach
    // Note: import.meta.url isn't available in this context since this code will be compiled
    // Let's use a different approach with process.cwd()
    const packageDir = process.cwd();
    const scriptPath = path.join(packageDir, 'scripts', 'create-cursor-mdc-rules.js');
    
    console.log(chalk.blue(`Looking for script at: ${scriptPath}`));
    
    // Check if the script exists at the resolved path
    if (!fs.existsSync(scriptPath)) {
      console.error(chalk.yellow(`Warning: Script not found at resolved path: ${scriptPath}`));
      console.error(chalk.yellow('Falling back to direct creation of rule files'));
      return;
    }
    
    // Run the create-cursor-mdc-rules script with the resolved path and pass the --use-checkmate-dir flag
    const result = spawnSync('node', [scriptPath, '--use-checkmate-dir'], {
      stdio: 'inherit'
    });
    
    if (result.error) {
      console.error(chalk.red("Error setting up CheckMate .mdc rules:"), result.error);
    } else if (result.status !== 0) {
      console.error(chalk.red(`MDC setup script exited with code ${result.status}`));
    } else {
      console.log(chalk.green("Successfully set up CheckMate .mdc validation rules"));
    }
  } catch (error) {
    console.error(chalk.red("Failed to run MDC setup script:"), error);
  }
} 