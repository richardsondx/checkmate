#!/usr/bin/env node

/**
 * Setup Cursor rules for CheckMate
 * This script installs the necessary Cursor rules for CheckMate integration
 * It is intended to be called during `checkmate init`
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

// Define the rules to install
const rules = [
  // Spec format validation rule
  {
    name: 'checkmate-spec-format.json',
    content: {
      name: "CheckMate Spec Format Validation",
      description: "Ensures any spec file follows the CheckMate format requirements",
      priority: 5,
      triggers: ["onSave"],
      condition: {
        filePatterns: ["checkmate/specs/**/*.md"]
      },
      actions: [
        {
          name: "validateSpecFormat",
          type: "shell",
          command: "cd $WORKSPACE_DIR && node scripts/validate-spec-format.js $FILE_PATH",
          runningMessage: "Validating spec format...",
          finishedMessage: "Spec format validation complete",
          errorMessage: "⚠️ Spec format validation failed! Please fix the format issues before continuing."
        }
      ],
      config: {
        runType: "auto",
        continueOnError: false
      }
    }
  },
  // Verify fail-fast rule
  {
    name: 'checkmate-verify-fail-fast.json',
    content: {
      name: "CheckMate Verify Fail-Fast",
      description: "Ensures verify script always runs with fail-early options",
      priority: 6,
      triggers: ["onCommand"],
      condition: {
        commandPatterns: [
          ".*checkmate.*verify.*",
          ".*spec-verify.*",
          ".*npm.*run.*verify.*"
        ]
      },
      actions: [
        {
          name: "validateSpecsStrict",
          type: "shell",
          command: "cd $WORKSPACE_DIR && node scripts/validate-spec-strict.js",
          runningMessage: "Validating all specs with strict checks...",
          finishedMessage: "Strict spec validation complete",
          errorMessage: "⚠️ Strict spec validation failed! All specs must follow the CheckMate format."
        }
      ],
      config: {
        runType: "auto",
        continueOnError: false
      }
    }
  },
  // Non-interactive mode rule
  {
    name: 'checkmate-non-interactive.json',
    content: {
      name: "CheckMate Non-Interactive Mode",
      description: "Ensures Checkmate commands always run in non-interactive mode to prevent hanging",
      priority: 7,
      triggers: ["onCommand"],
      condition: {
        commandPatterns: [
          ".*checkmate.*",
          ".*npx.*checkmate.*"
        ]
      },
      actions: [
        {
          name: "modifyCommand",
          type: "transform",
          pattern: "(.*checkmate\\s+\\w+)(\\s+.*|$)",
          replacement: "$1 --yes --non-interactive$2",
          explanation: "Adding non-interactive flags to prevent command from waiting for user input"
        }
      ],
      config: {
        runType: "auto",
        continueOnError: true
      }
    }
  },
  // Existing spec drift rule - we'll rewrite it to ensure it's up to date
  {
    name: 'checkmate-spec-drift.json',
    content: {
      name: "CheckMate Spec Drift Detection",
      description: "Check for drift between implementation and spec after code changes",
      priority: 4,
      triggers: ["onSaveAll"],
      condition: {
        filePatterns: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]
      },
      actions: [
        {
          name: "checkForDrift",
          type: "shell",
          command: "cd $WORKSPACE_DIR && node scripts/cm-spec-drift.js $FILE_PATH",
          runningMessage: "Checking for spec drift...",
          finishedMessage: "Spec drift check completed",
          errorMessage: "⚠️ Possible spec drift detected. Implementation has diverged from spec."
        }
      ],
      config: {
        runType: "manual",
        continueOnError: true
      }
    }
  }
];

// Install each rule
for (const rule of rules) {
  const rulePath = path.join(rulesDir, rule.name);
  fs.writeFileSync(rulePath, JSON.stringify(rule.content, null, 2));
  console.log(`Installed rule: ${rule.name}`);
}

console.log('Cursor rules setup complete');

// Check if the validation scripts exist
const specFormatScript = path.join(projectRoot, 'scripts', 'validate-spec-format.js');
const specStrictScript = path.join(projectRoot, 'scripts', 'validate-spec-strict.js');

let missingScripts = [];

if (!fs.existsSync(specFormatScript)) {
  missingScripts.push('validate-spec-format.js');
}

if (!fs.existsSync(specStrictScript)) {
  missingScripts.push('validate-spec-strict.js');
}

// Alert if any required scripts are missing
if (missingScripts.length > 0) {
  console.error('⚠️ The following required scripts are missing:');
  missingScripts.forEach(script => console.error(`  - scripts/${script}`));
  console.error('Please ensure these scripts are created for the rules to work properly.');
  process.exit(1);
}

console.log('✅ All cursor rules and scripts are properly set up'); 