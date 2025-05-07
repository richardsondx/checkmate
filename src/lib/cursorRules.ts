/**
 * Cursor rule file management for CheckMate CLI
 * Handles creating and writing .mdc rule files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { spawnSync } from 'node:child_process';

// Constants
const CURSOR_RULES_DIR = '.cursor/rules';

// Frontmatter for Cursor rules
const RULE_FRONTMATTER = `---
description: 
globs: 
alwaysApply: false
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
- Execute: node scripts/cm-enforce.js run \\
           --target "$(jq -r '.[]' .cursor/cm_list.json)" \\
           --fail-early
- Env:
    CM_MAX_FIXES: 5
    CM_FIX_COUNT: $CM_FIX_COUNT`,

  'post-push': `${RULE_FRONTMATTER}# CheckMate – Full Suite on Push
- Execute: node scripts/cm-enforce.js run`
};

/**
 * Ensure the Cursor rules directory exists
 */
export function ensureCursorRulesDir(): void {
  if (!fs.existsSync(CURSOR_RULES_DIR)) {
    fs.mkdirSync(CURSOR_RULES_DIR, { recursive: true });
    console.log(`Created directory: ${CURSOR_RULES_DIR}`);
  }
}

/**
 * Write a rule file if it doesn't exist or prompt for overwrite
 */
export function writeRule(name: string, content: string, force = false): boolean {
  ensureCursorRulesDir();
  
  const rulePath = path.join(CURSOR_RULES_DIR, `${name}.mdc`);
  
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
 * Generate all rule files
 */
export function generateAllRules(force = false): void {
  ensureCursorRulesDir();
  
  // Create each rule file
  Object.entries(RULE_TEMPLATES).forEach(([name, content]) => {
    writeRule(name, content, force);
  });
  
  // Create/update additional .mdc validation rules using our dedicated script
  createMdcRules(force);
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
  console.log(chalk.blue("Setting up CheckMate validation rules in .mdc format..."));
  
  try {
    // Run the create-cursor-mdc-rules script
    const result = spawnSync('node', ['scripts/create-cursor-mdc-rules.js'], {
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