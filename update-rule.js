// Script to update the CheckMate feature validation workflow rule
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rule content with updated parameters
const ruleContent = `# CheckMate · Feature Validation Workflow

This rule implements a complete workflow for validating that CheckMate features are working correctly.

\`\`\`rule type=activation
activationTrigger:
  event: command_match
  pattern: "use checkmate to (validate|verify|check|test) (that|if) .* (feature|working)"
  maxRuns: 1
\`\`\`

\`\`\`rule type=on_activation
# Extract feature name from command
FEATURE=$(echo "$CURSOR_COMMAND" | grep -o -E "(validate|verify|check|test) (that|if) [^ ]+ (feature|working)" | grep -o -E "[^ ]+ (feature|working)" | awk '{print $1}')

# Clean up feature name
FEATURE=$(echo "$FEATURE" | tr -d "\\\"'")

echo "🧪 Starting CheckMate feature validation for: $FEATURE"

# Find spec file
SPEC_PATH=$(find checkmate/specs -name "$FEATURE*.md" -o -name "*-$FEATURE*.md" | head -1)

if [ -z "$SPEC_PATH" ]; then
  echo "❓ No spec found for feature: $FEATURE"
  echo "📝 Using warmup to generate spec..."
  node ./dist/index.js warmup --analyze --search "$FEATURE"
  SPEC_PATH=$(find checkmate/specs -name "$FEATURE*.md" -o -name "*-$FEATURE*.md" | head -1)
fi

if [ -z "$SPEC_PATH" ]; then
  echo "❌ Could not generate spec for $FEATURE"
  exit 1
fi

# Get spec name without extension
SPEC_NAME=$(basename "$SPEC_PATH" .md)
echo "✅ Using spec: $SPEC_NAME"

# Reset fix attempts counter
export CM_FIX_COUNT=0
MAX_FIX_ATTEMPTS=5
FIX_SUCCESSFUL=false

# Run spec to check if it's working
echo "🧪 Running spec: $SPEC_NAME"
node ./dist/index.js run --target "$SPEC_NAME"

# If failed, try to fix
if [ $? -ne 0 ]; then
  echo "❌ Spec failed, starting fix cycle..."
  
  # Fix loop - try multiple times
  for ((attempt=1; attempt<=MAX_FIX_ATTEMPTS; attempt++)); do
    echo "🔄 Fix attempt $attempt/$MAX_FIX_ATTEMPTS"
    
    # First understand what's wrong
    node ./dist/index.js clarify --spec "$SPEC_NAME"
    
    # Find implementation files
    IMPL_FILES=$(grep -l "$FEATURE" $(find src -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx") | tr '\\n' ' ')
    
    if [ -n "$IMPL_FILES" ]; then
      echo "🔧 Fixing implementation files: $IMPL_FILES"
      node ./dist/index.js fix --spec "$SPEC_NAME" --files $IMPL_FILES
      
      # Check if fixes worked
      echo "🧪 Testing if fixes resolved the issues..."
      node ./dist/index.js run --target "$SPEC_NAME"
      
      if [ $? -eq 0 ]; then
        echo "✅ Fix successful! All checks now pass."
        FIX_SUCCESSFUL=true
        break
      else
        echo "⚠️ Fixes didn't resolve all issues, continuing..."
      fi
    else
      echo "❌ Could not find implementation files"
      break
    fi
  done
  
  # Final status
  if [ "$FIX_SUCCESSFUL" = true ]; then
    echo "✅ Feature validation successful after fixes!"
  else
    echo "❌ Feature validation failed after $MAX_FIX_ATTEMPTS attempts"
    echo "👉 Manual intervention required"
  fi
else
  echo "✅ Feature validation successful! All checks passed on first try."
fi

# Show final status
node ./dist/index.js status --spec "$SPEC_NAME"
\`\`\`
`;

// Path to rule file
const rulePath = path.join('.cursor', 'rules', 'checkmate-feature-validation-workflow.mdc');

// Write the file
try {
  fs.writeFileSync(rulePath, ruleContent);
  console.log(`Successfully updated rule file: ${rulePath}`);
} catch (error) {
  console.error(`Error updating rule file: ${error}`);
} 