#!/bin/bash

# Script to update all Cursor rule files with proper headers

# Function to update a rule file with proper header
update_rule_file() {
  local file="$1"
  local description="$2"
  local filename=$(basename "$file")
  local tempfile="${file}.tmp"
  
  # Check if file already has correct header format
  if grep -q '^type: "Agent Requested"' "$file"; then
    echo "✅ $filename already has proper header format."
    return
  fi
  
  # Create a new file with the proper header
  cat > "$tempfile" << EOF
---
description: $description
type: "Agent Requested"
globs: 
alwaysApply: false
---
EOF

  # Append the original content without any existing header
  if grep -q '^---' "$file"; then
    # Skip the existing header
    sed -n '/^---/,/^---/!p;//{/^---/!p}' "$file" | sed '1,/^---$/d' >> "$tempfile"
  else
    # File doesn't have header, just append the content
    cat "$file" >> "$tempfile"
  fi
  
  # Replace original file with the new one
  mv "$tempfile" "$file"
  echo "✅ Updated $filename with proper header format."
}

# Root directory for Cursor rules
RULES_DIR=".cursor/rules"

# Update each rule file with its description
update_rule_file "$RULES_DIR/checkmate-spec-creator.mdc" "Facilitates creation of CheckMate specification files from natural language descriptions. Use when asked to create specs for new features."
update_rule_file "$RULES_DIR/checkmate-spec-drift-on-save.mdc" "Monitors and reports on spec drift when files are saved. Use to maintain alignment between implementation and specifications automatically."
update_rule_file "$RULES_DIR/checkmate-spec-drift.mdc" "Detects divergence between code implementation and CheckMate specifications. Use when checking if code has changed without corresponding spec updates."
update_rule_file "$RULES_DIR/checkmate-spec-fixer.mdc" "Helps fix issues in CheckMate spec files, including formatting and content problems. Use when specs need correction or standardization."
update_rule_file "$RULES_DIR/checkmate-spec-format.mdc" "Enforces consistent formatting for CheckMate specification files. Use when creating or editing spec files to ensure they follow conventions."
update_rule_file "$RULES_DIR/checkmate-spec-naming-convention.mdc" "Ensures CheckMate spec files follow proper naming conventions with slugified names, lowercase letters, and hyphens. Use when creating new spec files."

echo "✨ All rule files have been updated with proper headers." 