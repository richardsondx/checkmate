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
  {
    name: 'checkmate-spec-creator.mdc',
    content: `# CheckMate · New Spec Creator

This rule captures when a user tries to manually create a spec file and helps them generate a proper template.

\`\`\`rule type=activation
activationTrigger:
  event: file_create
  path: "checkmate/specs/**.md"
  maxRuns: 1
\`\`\`

\`\`\`rule type=on_file_create
# If this is a new file, offer to generate a template
if [ ! -s "$FILEPATH" ]; then
  FILENAME=$(basename "$FILEPATH")
  TITLE=\${FILENAME%.md}
  
  # Display a notification
  echo "🧰 CheckMate Spec Creator" 
  echo "🔍 Detected new spec file: $FILEPATH"
  echo "📝 Do you want to generate a properly formatted spec template?"
  echo "   This will replace the current empty file with a template."
  echo ""
  echo "🔵 Run this command to create the spec:"
  echo "   node scripts/create-spec-template.js \\"$TITLE\\" --files=path/to/file1.js,path/to/file2.js"
  echo ""
  echo "✅ Or use warmup to generate specs automatically from your codebase:"
  echo "   checkmate warmup"
fi
\`\`\``
  },
  {
    name: 'checkmate-spec-fixer.mdc',
    content: `# CheckMate · Spec Format Auto-Fixer

This rule automatically fixes CheckMate spec files that don't meet format standards.

\`\`\`rule type=activation
activationTrigger:
  change:
    include: ["checkmate/specs/**.md"]
  maxRuns: 1
\`\`\`

\`\`\`rule type=on_change
# Auto-fix the spec format on save
if [[ "$FILEPATH" == *.md ]]; then
  # Check if file exists and is not empty
  if [ -s "$FILEPATH" ]; then
    echo "🔍 Validating and auto-fixing spec format: $FILEPATH"
    
    # Run the validator with the fix flag
    node scripts/validate-spec-format.js "$FILEPATH" --fix

    if [ $? -eq 0 ]; then
      echo "✅ Spec format is valid or has been fixed"
    else
      echo "⚠️ Could not automatically fix all issues in $FILEPATH"
      echo "   Some manual corrections may be needed"
    fi
  fi
fi
\`\`\``
  },
  {
    name: 'checkmate-feature-validation-workflow.mdc',
    content: `/*
# CheckMate Feature Validation Workflow

This rule enforces a standard workflow when asked to use CheckMate to validate that a feature is working correctly.
*/

const workflowRule = {
  name: "CheckMate Feature Validation Workflow",
  description: "Enforce a consistent process for validating features with CheckMate",
  run: async ({ cursor }) => {
    // Define the workflow steps in the ruleset
    const workflowSteps = [
      "1. Check if a spec exists for the feature being validated",
      "2. If no spec exists, suggest creating one and wait for user confirmation",
      "3. Create the spec in checkmate/specs/ directory (NOT in root)",
      "4. Use the audit command to verify implementation against spec",
      "5. If audit fails, attempt fixes until reaching max_attempts (from .checkmate)",
      "6. Report final status with detailed breakdown of passing and failing checks"
    ];

    // Feature spec location rules
    const specLocationRules = [
      "- All CheckMate specs MUST be stored in the checkmate/specs/ directory",
      "- Specs should use kebab-case for filenames (e.g., feature-name.md)",
      "- Agent specs should be placed in checkmate/specs/agents/ subdirectory"
    ];

    // Auto-fix enforcement rules
    const autoFixRules = [
      "- When a feature validation FAILS, ALWAYS continue fixing until max_attempts is reached",
      "- Track fix attempts with a counter and continue until max_attempts (5 by default)",
      "- Each fix attempt should address specific failing checks with targeted changes",
      "- After each fix attempt, rerun audit to check if all checks now pass",
      "- Only stop fixing when either all checks PASS or max_attempts is reached"
    ];

    console.log("Following CheckMate Feature Validation Workflow:");
    console.log(workflowSteps.join("\\n"));
    console.log("\\nSpec Location Rules:");
    console.log(specLocationRules.join("\\n"));
    console.log("\\nAuto-Fix Enforcement Rules:");
    console.log(autoFixRules.join("\\n"));

    return {
      success: true,
      message: "Remember to follow the CheckMate Feature Validation Workflow with continuous fix attempts"
    };
  }
};

export default workflowRule;`
  },
  {
    name: 'checkmate-auto-fix-enforce.mdc',
    content: `# CheckMate · Auto-Fix Enforcer

This rule ensures that when a feature validation fails, CheckMate continuously attempts fixes until it reaches max_attempts.

\`\`\`rule type=activation
activationTrigger:
  event: after_command
  pattern: "checkmate audit --spec"
  maxRuns: 5  # Match max_attempts from .checkmate
\`\`\`

\`\`\`rule type=on_activation
# Check if audit failed
if [ $? -ne 0 ]; then
  # Get current fix count from environment
  CURRENT_FIX_COUNT=\${CM_FIX_COUNT:-0}
  MAX_FIX_ATTEMPTS=$(grep -A 2 "auto_fix:" .checkmate | grep "max_attempts" | awk '{print $2}')
  MAX_FIX_ATTEMPTS=\${MAX_FIX_ATTEMPTS:-5}  # Default to 5
  
  # Extract spec name from command
  SPEC_NAME=$(echo "$CURSOR_COMMAND" | grep -o '\\--spec [^ ]*' | awk '{print $2}')
  
  # Increment counter
  NEXT_FIX_COUNT=$((CURRENT_FIX_COUNT + 1))
  
  if [ $NEXT_FIX_COUNT -le $MAX_FIX_ATTEMPTS ]; then
    echo "🔄 Feature validation failed for $SPEC_NAME. Auto-fix attempt $NEXT_FIX_COUNT/$MAX_FIX_ATTEMPTS..."
    
    # Set the new fix count
    export CM_FIX_COUNT=$NEXT_FIX_COUNT
    
    # Show explicit message about continuing
    echo "⚠️ MUST CONTINUE fixing until all checks pass or reach max attempts ($MAX_FIX_ATTEMPTS)"
    echo "📝 Analyzing failed checks and implementing targeted fixes..."
    
    # Rerun audit with auto-sync to try fixing
    node ./dist/index.js audit --spec $SPEC_NAME --auto-sync --force
    
    if [ $? -eq 0 ]; then
      echo "✅ Auto-fix successful on attempt $NEXT_FIX_COUNT!"
      exit 0
    else
      echo "⚠️ Auto-fix attempt $NEXT_FIX_COUNT failed. Will continue fixing until max attempts reached."
      # Note: The rule will be triggered again automatically on next command
    fi
  else
    echo "❌ Reached maximum fix attempts ($MAX_FIX_ATTEMPTS) for $SPEC_NAME"
    echo "👨‍💻 Manual intervention required to fix remaining issues."
  fi
fi
\`\`\``
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