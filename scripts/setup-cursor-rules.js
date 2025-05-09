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
  // Spec format MDC file
  {
    name: 'checkmate-spec-format.mdc',
    content: "# CheckMate · Spec‑Format Linter\n- On file save in checkmate/specs/, validate format\n  - Execute: node scripts/validate-spec-format.js \"$FILEPATH\"",
    isJson: false
  },
  // Non-interactive MDC rule
  {
    name: 'checkmate-non-interactive.mdc',
    content: "# CheckMate · Non‑Interactive Transform\n- CommandTransform:\n    Pattern: '(checkmate\\s+\\w+)(\\s|$)'\n    Replacement: '$1 --yes --non-interactive$2'\n    Explanation: Ensure every CheckMate command runs headless",
    isJson: false
  },
  // Spec drift MDC rule
  {
    name: 'checkmate-spec-drift.mdc',
    content: "# CheckMate · Spec‑vs‑Code Drift Audit\n- After each commit, audit changed specs\n  - Execute: checkmate audit --target \"$CM_LIST\" --quiet --audit",
    isJson: false
  },
  // Spec drift on save MDC rule
  {
    name: 'checkmate-spec-drift-on-save.mdc',
    content: "  - ErrorMessage: ⚠️ Possible spec drift detected. Implementation has diverged from spec.",
    isJson: false
  },
  // Spec creator MDC rule
  {
    name: 'checkmate-spec-creator.mdc',
    content: "activationTrigger:\n  event: file_create\n  path: \"checkmate/specs/**.md\"\n  maxRuns: 1\n\n```rule type=on_file_create\n# If this is a new file, offer to generate a template\nif [ ! -s \"$FILEPATH\" ]; then\n  FILENAME=$(basename \"$FILEPATH\")\n  TITLE=${FILENAME%.md}\n  \n  # Display a notification\n  echo \"🧰 CheckMate Spec Creator\" \n  echo \"🔍 Detected new spec file: $FILEPATH\"\n  echo \"📝 Do you want to generate a properly formatted spec template?\"\n  echo \"   This will replace the current empty file with a template.\"\n  echo \"\"\n  echo \"🔵 Run this command to create the spec:\"\n  echo \"   node scripts/create-spec-template.js \\\"$TITLE\\\" --files=path/to/file1.js,path/to/file2.js\"\n  echo \"\"\n  echo \"✅ Or use warmup to generate specs automatically from your codebase:\"\n  echo \"   checkmate warmup\"\nfi\n```",
    isJson: false
  },
  // Spec fixer MDC rule
  {
    name: 'checkmate-spec-fixer.mdc',
    content: "# CheckMate · Spec Format Auto-Fixer\n\nThis rule automatically fixes CheckMate spec files that don't meet format standards.\n\n```rule type=activation\nactivationTrigger:\n  change:\n    include: [\"checkmate/specs/**.md\"]\n  maxRuns: 1\n```\n\n```rule type=on_change\n# Auto-fix the spec format on save\nif [[ \"$FILEPATH\" == *.md ]]; then\n  # Check if file exists and is not empty\n  if [ -s \"$FILEPATH\" ]; then\n    echo \"🔍 Validating and auto-fixing spec format: $FILEPATH\"\n    \n    # Run the validator with the fix flag\n    node scripts/validate-spec-format.js \"$FILEPATH\" --fix\n\n    if [ $? -eq 0 ]; then\n      echo \"✅ Spec format is valid or has been fixed\"\n    else\n      echo \"⚠️ Could not automatically fix all issues in $FILEPATH\"\n      echo \"   Some manual corrections may be needed\"\n    fi\n  fi\nfi\n```",
    isJson: false
  },
  // Auto fix enforce MDC rule
  {
    name: 'checkmate-auto-fix-enforce.mdc',
    content: "activationTrigger:\n  event: after_command\n  pattern: \"checkmate audit --spec\"\n  maxRuns: 5  # Match max_attempts from .checkmate\n\n```rule type=on_activation\n# Check if audit failed\nif [ $? -ne 0 ]; then\n  # Get current fix count from environment\n  CURRENT_FIX_COUNT=${CM_FIX_COUNT:-0}\n  MAX_FIX_ATTEMPTS=$(grep -A 2 \"auto_fix:\" .checkmate | grep \"max_attempts\" | awk '{print $2}')\n  MAX_FIX_ATTEMPTS=${MAX_FIX_ATTEMPTS:-5}  # Default to 5\n  \n  # Extract spec name from command\n  SPEC_NAME=$(echo \"$CURSOR_COMMAND\" | grep -o '\\--spec [^ ]*' | awk '{print $2}')\n  \n  # Increment counter\n  NEXT_FIX_COUNT=$((CURRENT_FIX_COUNT + 1))\n  \n  if [ $NEXT_FIX_COUNT -le $MAX_FIX_ATTEMPTS ]; then\n    echo \"🔄 Feature validation failed for $SPEC_NAME. Auto-fix attempt $NEXT_FIX_COUNT/$MAX_FIX_ATTEMPTS...\"\n    \n    # Set the new fix count\n    export CM_FIX_COUNT=$NEXT_FIX_COUNT\n    \n    # Show explicit message about continuing\n    echo \"⚠️ MUST CONTINUE fixing until all checks pass or reach max attempts ($MAX_FIX_ATTEMPTS)\"\n    echo \"📝 Analyzing failed checks and implementing targeted fixes...\"\n    \n    # Rerun audit with auto-sync to try fixing\n    node ./dist/index.js audit --spec $SPEC_NAME --auto-sync --force\n    \n    if [ $? -eq 0 ]; then\n      echo \"✅ Auto-fix successful on attempt $NEXT_FIX_COUNT!\"\n      exit 0\n    else\n      echo \"⚠️ Auto-fix attempt $NEXT_FIX_COUNT failed. Will continue fixing until max attempts reached.\"\n      # Note: The rule will be triggered again automatically on next command\n    fi\n  else\n    echo \"❌ Reached maximum fix attempts ($MAX_FIX_ATTEMPTS) for $SPEC_NAME\"\n    echo \"👨‍💻 Manual intervention required to fix remaining issues.\"\n  fi\nfi\n```",
    isJson: false
  },
  // Feature validation workflow MDC rule
  {
    name: 'checkmate-feature-validation-workflow.mdc',
    content: "const workflowRule = {\n  name: \"CheckMate Feature Validation Workflow\",\n  description: \"Enforce a consistent process for validating features with CheckMate\",\n  run: async ({ cursor }) => {\n    // Define the workflow steps in the ruleset\n    const workflowSteps = [\n      \"1. Check if a spec exists for the feature being validated\",\n      \"2. If no spec exists, suggest creating one and wait for user confirmation\",\n      \"3. Create the spec in checkmate/specs/ directory (NOT in root)\",\n      \"4. Use the audit command to verify implementation against spec\",\n      \"5. If audit fails, attempt fixes until reaching max_attempts (from .checkmate)\",\n      \"6. Report final status with detailed breakdown of passing and failing checks\"\n    ];\n\n    // Feature spec location rules\n    const specLocationRules = [\n      \"- All CheckMate specs MUST be stored in the checkmate/specs/ directory\",\n      \"- Specs should use kebab-case for filenames (e.g., feature-name.md)\",\n      \"- Agent specs should be placed in checkmate/specs/agents/ subdirectory\"\n    ];\n\n    // Auto-fix enforcement rules\n    const autoFixRules = [\n      \"- When a feature validation FAILS, ALWAYS continue fixing until max_attempts is reached\",\n      \"- Track fix attempts with a counter and continue until max_attempts (5 by default)\",\n      \"- Each fix attempt should address specific failing checks with targeted changes\",\n      \"- After each fix attempt, rerun audit to check if all checks now pass\",\n      \"- Only stop fixing when either all checks PASS or max_attempts is reached\"\n    ];\n\n    console.log(\"Following CheckMate Feature Validation Workflow:\");\n    console.log(workflowSteps.join(\"\\n\"));\n    console.log(\"\\nSpec Location Rules:\");\n    console.log(specLocationRules.join(\"\\n\"));\n    console.log(\"\\nAuto-Fix Enforcement Rules:\");\n    console.log(autoFixRules.join(\"\\n\"));\n\n    return {\n      success: true,\n      message: \"Remember to follow the CheckMate Feature Validation Workflow with continuous fix attempts\"\n    };\n  }\n};\n\nexport default workflowRule;",
    isJson: false
  },
  // Spec naming convention MDC rule
  {
    name: 'checkmate-spec-naming-convention.mdc',
    content: "# CheckMate · Spec Naming Convention\n\nThis rule ensures that all spec files in the checkmate/specs directory follow proper naming conventions:\n- Slugified from feature titles\n- All lowercase\n- Hyphens instead of spaces\n- No numbers at beginning (unless part of feature name)\n- No special characters\n\n```rule type=activation\nactivationTrigger:\n  change:\n    include: [\"checkmate/specs/**.md\"]\n  maxRuns: 1\n```\n\n```rule type=on_change\n# Check if the filename follows proper naming conventions\nFILENAME=$(basename \"$FILEPATH\" .md)\n\n# Check if the filename starts with a number followed by a dash\nif [[ $FILENAME =~ ^[0-9]+- ]]; then\n  echo \"⚠️ Warning: Spec filename should be derived from feature title, not document section numbers.\"\n  echo \"   Use 'user-login.md' instead of '1-user-login.md'\"\nfi\n\n# Check if the filename is properly slugified (lowercase, hyphens, no special chars)\nif [[ ! $FILENAME =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then\n  echo \"⚠️ Warning: Spec filename should be properly slugified:\"\n  echo \"   - Use lowercase letters\"\n  echo \"   - Use hyphens instead of spaces\"\n  echo \"   - No special characters\"\n  echo \"   Example: 'user-login.md' not 'User Login.md'\"\nfi\n\n# Check the first line of the file to ensure it starts with a proper heading\nif ! head -n 1 \"$FILEPATH\" | grep -q \"^# \"; then\n  echo \"⚠️ Warning: Spec file should start with a level 1 heading (# Feature Title)\"\nfi\n\n# Check that a \"## Checks\" section exists\nif ! grep -q \"^## Checks\" \"$FILEPATH\"; then\n  echo \"⚠️ Warning: Spec file must contain a '## Checks' section with acceptance criteria\"\nfi\n```",
    isJson: false
  }
];

// Install each rule
for (const rule of rules) {
  const rulePath = path.join(rulesDir, rule.name);
  
  // Write the content directly for .mdc files, or stringify for JSON files
  if (rule.isJson === false) {
    fs.writeFileSync(rulePath, rule.content);
  } else {
    fs.writeFileSync(rulePath, JSON.stringify(rule.content, null, 2));
  }
  
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