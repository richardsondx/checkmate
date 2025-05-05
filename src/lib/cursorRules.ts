/**
 * Cursor rule file management for CheckMate CLI
 * Handles creating and writing .mdc rule files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

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
  'pre-task': `${RULE_FRONTMATTER}# CheckMate – Pre‑Task Rules
- Run **scope analysis** before coding.
- Execute: \`checkmate affected\`
- Store output as \`$CM_LIST\` for later steps.
- If the command errors, surface the message and halt.`,

  'post-task': `${RULE_FRONTMATTER}# CheckMate – Post‑Task Verification
- After coding, verify all affected specs.
- Execute: \`checkmate run --target "$CM_LIST"\`
- If any bullet fails, continue fixing until all pass.
- When all pass, reset boxes (CheckMate handles this internally).`,

  'post-push': `${RULE_FRONTMATTER}# CheckMate – Full Suite on Push
- On pushes or merges to main, run the entire test suite.
- Execute: \`checkmate run\`
- Fail the CI step if any spec fails.`
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
} 