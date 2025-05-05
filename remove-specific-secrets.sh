#!/bin/bash

# This script removes sensitive API keys from specific commits without rewriting all history
# It's more targeted than the full history rewrite approach

# Commit IDs that contain secrets
COMMIT1="4a619517f8b93bd3f074eb2f105e61e5d9e5e043"
COMMIT2="1bc7f7ad30d575de08955588efbe2b276dfd9b24"

# Create a new branch for the clean history
git checkout -b fix-secrets

# First, create a new commit that removes the sensitive files from the current state
echo "Removing sensitive content from current state..."
git rm --cached .cursor/config.json
touch .cursor/config.json.placeholder
git add .cursor/config.json.placeholder
git commit -m "Replace sensitive config with placeholder"

# Now let's rewrite the specific commits that contained secrets
echo "Rewriting problematic commits..."

# To rewrite the specific commits and replace .cursor/config.json with a placeholder:
if command -v git-filter-repo >/dev/null 2>&1; then
  # Using git-filter-repo (recommended)
  echo "Using git-filter-repo..."
  
  # Create a simple Python script for git-filter-repo
  cat > filter-script.py << 'EOF'
import os
import sys
from git_filter_repo import FilteringOptions, RepoFilter

paths_to_replace = ['.cursor/config.json', 'test.mjs']

def replace_sensitive_files(commit, metadata):
    if commit.original_id in [b"4a619517f8b93bd3f074eb2f105e61e5d9e5e043", b"1bc7f7ad30d575de08955588efbe2b276dfd9b24"]:
        for file in commit.file_changes:
            if file.filename.decode() in paths_to_replace:
                file.blob_id = b"e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"  # Empty blob
                file.mode = b"100644"

filter = RepoFilter(callbacks={'commit': replace_sensitive_files})
filter.run()
EOF

  git-filter-repo --force --python-callback filter-script.py
else
  # Fallback to git filter-branch (less efficient but more widely available)
  echo "Using git filter-branch (git-filter-repo not found)..."
  
  git filter-branch --force --tree-filter '
    if [ "$GIT_COMMIT" = "4a619517f8b93bd3f074eb2f105e61e5d9e5e043" ] || [ "$GIT_COMMIT" = "1bc7f7ad30d575de08955588efbe2b276dfd9b24" ]; then
      if [ -f ".cursor/config.json" ]; then
        echo "{}" > .cursor/config.json
      fi
      if [ -f "test.mjs" ]; then
        # Replace API key in test.mjs with a placeholder
        sed -i "" "s/apiKey: \"sk-.*/apiKey: \"sk-***REMOVED***\"/g" test.mjs
      fi
    fi
  ' "$COMMIT1"^.."$COMMIT2"
fi

echo "Cleanup references..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now

echo "Done! You can now review the changes and then force push with:"
echo "git push origin fix-secrets --force"
echo ""
echo "WARNING: This rewrites history. Anyone working on this repository must fetch the new history." 