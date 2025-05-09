// Script to update the CheckMate auto-fix enforce rule
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rule content with updated parameters
const ruleContent = `# CheckMate · Comprehensive Auto-Fix Enforcer

This rule ensures CheckMate keeps trying to fix failing specs until all checks pass or max attempts is reached.

\`\`\`rule type=activation
activationTrigger:
  event: after_command
  pattern: "checkmate run"
  maxRuns: 5  # Match max_attempts from .checkmate
\`\`\`

\`\`\`rule type=on_activation
# Check if spec execution failed
if [ $? -ne 0 ]; then
  # Get current fix count from environment
  CURRENT_FIX_COUNT=\${CM_FIX_COUNT:-0}
  MAX_FIX_ATTEMPTS=$(grep -A 2 "auto_fix:" .checkmate | grep "max_attempts" | awk '{print $2}')
  MAX_FIX_ATTEMPTS=\${MAX_FIX_ATTEMPTS:-5}  # Default to 5
  
  # Increment counter
  NEXT_FIX_COUNT=$((CURRENT_FIX_COUNT + 1))
  
  if [ $NEXT_FIX_COUNT -le $MAX_FIX_ATTEMPTS ]; then
    echo "🔄 Spec failures detected. Auto-fix attempt $NEXT_FIX_COUNT/$MAX_FIX_ATTEMPTS..."
    
    # Set the new fix count
    export CM_FIX_COUNT=$NEXT_FIX_COUNT
    
    # Show explicit message about continuing with fixes
    echo "⚠️ MUST CONTINUE fixing until all checks pass or reach max attempts ($MAX_FIX_ATTEMPTS)"
    
    # Step 1: Get information about the failing checks
    echo "📊 Understanding spec failures..."
    node ./dist/index.js clarify
    
    # Step 2: Analyze code implementation for required changes
    echo "🔍 Analyzing code implementation..."
    
    # Find failing specs from the most recent run
    FAILING_SPECS=$(cat .checkmate/.last-run 2>/dev/null | grep -E "^\s*❌" | awk '{print $2}' | tr '\\n' ' ')
    
    if [ -z "$FAILING_SPECS" ]; then
      # Fallback - use all specs
      FAILING_SPECS=$(find checkmate/specs -name "*.md" | xargs -n1 basename | sed 's/\\.md$//' | tr '\\n' ' ')
    fi
    
    for SPEC in $FAILING_SPECS; do
      echo "🛠️ Attempting to fix spec: $SPEC"
      
      # Step 3: Get implementation details for the spec
      IMPL_FILES=$(node ./dist/index.js status --spec $SPEC --json 2>/dev/null | grep -o '"files":\s*\\[[^]]*\\]' | grep -o '"[^"]*\\.[jt]s[x]\\?"' | tr -d '"' | tr '\\n' ' ')
      
      if [ -z "$IMPL_FILES" ]; then
        # Fallback - find files from the spec
        IMPL_FILES=$(grep -l "$SPEC" $(find src -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx") 2>/dev/null | tr '\\n' ' ')
      fi
      
      # If we have implementation files, fix them
      if [ -n "$IMPL_FILES" ]; then
        echo "📝 Identified implementation files: $IMPL_FILES"
        
        # Step 4: Attempt to fix the implementation - use CheckMate fix command
        echo "🔧 Applying fixes to implementation..."
        node ./dist/index.js fix --spec $SPEC --files $IMPL_FILES
      else
        echo "⚠️ Could not identify implementation files for $SPEC"
      fi
    done
    
    # Step 5: Run specs again to verify fixes
    echo "🧪 Testing if fixes resolved the issues..."
    node ./dist/index.js run
    
    if [ $? -eq 0 ]; then
      echo "✅ Auto-fix successful on attempt $NEXT_FIX_COUNT!"
      exit 0
    else
      echo "⚠️ Auto-fix attempt $NEXT_FIX_COUNT failed. Will continue with next attempt."
      
      # Analyze what's still failing
      node ./dist/index.js status
      
      # Note: The rule will be triggered again on the next command run
    fi
  else
    echo "❌ Reached maximum fix attempts ($MAX_FIX_ATTEMPTS)"
    echo "👨‍💻 Manual intervention required to fix remaining issues."
  fi
fi
\`\`\`

## How This Comprehensive Workflow Works

This rule implements a complete fix workflow that actually resolves spec failures:

1. It detects when \`checkmate run\` fails
2. For each failing spec:
   - Uses \`checkmate clarify\` to understand why it's failing
   - Identifies implementation files using status command
   - Applies real code fixes using the fix command
   - Re-runs specs to verify the fixes

This ensures CheckMate will ALWAYS:
- Make ACTUAL CODE CHANGES to fix failing specs
- Continue fixing until all checks pass or max_attempts is reached
- Apply meaningful fixes rather than just syncing bullets

The workflow treats each attempt as a complete cycle of:
- Understanding failures
- Making code changes
- Testing if the changes resolved the issues
`;

// Path to rule file
const rulePath = path.join('.cursor', 'rules', 'checkmate-auto-fix-enforce.mdc');

// Write the file
try {
  fs.writeFileSync(rulePath, ruleContent);
  console.log(`Successfully updated rule file: ${rulePath}`);
} catch (error) {
  console.error(`Error updating rule file: ${error}`);
} 