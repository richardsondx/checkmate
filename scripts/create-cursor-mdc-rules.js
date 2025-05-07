#!/usr/bin/env node

/**
 * Script to create Cursor .mdc rule files
 * This ensures proper formatting with frontmatter and content
 */

import fs from 'fs';
import path from 'path';

// Get the project root directory
const projectRoot = process.cwd();

// Define the rules directory
const rulesDir = path.join(projectRoot, '.cursor', 'rules');

// Create rules directory if it doesn't exist
if (!fs.existsSync(rulesDir)) {
  fs.mkdirSync(rulesDir, { recursive: true });
  console.log('Created .cursor/rules directory');
}

// Define the rules to create in proper .mdc format
const mdcRules = [
  {
    name: 'pre-task.mdc',
    content: `# CheckMate – Scope & Reset
- Scope analysis  
  - Execute: checkmate affected --json > .cursor/cm_list.json
- Reset automatic‑fix counter  
  - SetEnv: CM_FIX_COUNT=0`
  },
  {
    name: 'post-task.mdc',
    content: `# CheckMate – Verify & Auto‑Fix
- Execute: node scripts/cm-enforce.js run \\
           --target "$(jq -r '.[]' .cursor/cm_list.json)" \\
           --fail-early
- Env:
    CM_MAX_FIXES: 5
    CM_FIX_COUNT: $CM_FIX_COUNT`
  },
  {
    name: 'post-push.mdc',
    content: `# CheckMate – Full Suite on Push
- Execute: node scripts/cm-enforce.js run`
  },
  {
    name: 'checkmate-non-interactive.mdc',
    content: `# CheckMate · Non‑Interactive Transform
- CommandTransform:
    Pattern: '(checkmate\\s+\\w+)(\\s|$)'
    Replacement: '$1 --yes --non-interactive$2'
    Explanation: Ensure every CheckMate command runs headless`
  },
  {
    name: 'checkmate-spec-format.mdc',
    content: `# CheckMate · Spec‑Format Linter
- On file save in checkmate/specs/, validate format
  - Execute: node scripts/validate-spec-format.js "$FILEPATH"`
  },
  {
    name: 'checkmate-spec-drift.mdc',
    content: `# CheckMate · Spec‑vs‑Code Drift Audit
- After each commit, audit changed specs
  - Execute: checkmate audit --target "$CM_LIST" --quiet --audit`
  },
  {
    name: 'checkmate-spec-drift-on-save.mdc',
    content: `# CheckMate · Spec‑vs‑Code Drift on Save
- On file save in **/*.ts, **/*.js, **/*.tsx, **/*.jsx
  - Execute: cd $WORKSPACE_DIR && node scripts/cm-spec-drift.js $FILE_PATH
  - RunningMessage: Checking for spec drift...
  - FinishedMessage: Spec drift check completed
  - ErrorMessage: ⚠️ Possible spec drift detected. Implementation has diverged from spec.`
  },
];

// Remove existing JSON rules
const jsonRulesToRemove = [
  'checkmate-non-interactive.json',
  'checkmate-spec-format.json',
  'checkmate-verify-fail-fast.json',
  'checkmate-spec-drift.json'
];

for (const jsonRule of jsonRulesToRemove) {
  const jsonPath = path.join(rulesDir, jsonRule);
  if (fs.existsSync(jsonPath)) {
    try {
      fs.unlinkSync(jsonPath);
      console.log(`Removed JSON rule: ${jsonRule}`);
    } catch (err) {
      console.error(`Error removing ${jsonRule}:`, err);
    }
  }
}

// Write each .mdc rule file
for (const rule of mdcRules) {
  const rulePath = path.join(rulesDir, rule.name);
  try {
    fs.writeFileSync(rulePath, rule.content, 'utf8');
    console.log(`Created/updated MDC rule file: ${rule.name}`);
  } catch (err) {
    console.error(`Error creating ${rule.name}:`, err);
  }
}

console.log('✅ Cursor MDC rules setup complete'); 