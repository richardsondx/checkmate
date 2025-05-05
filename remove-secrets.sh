#!/bin/bash

# Make sure we're working in a clean state
git checkout -b clean-secrets

# Use git filter-branch to remove API keys from the repository history
git filter-branch --force --index-filter \
  "git ls-files -z '.cursor/config.json' 'test.mjs' | xargs -0 git update-index --pathname-rewrite-to=NULLIFIED" \
  --prune-empty --tag-name-filter cat -- --all

# Remove the original refs to allow garbage collection of dangling commits
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Aggressive garbage collection to remove the unreferenced data
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Repository cleaned. You'll need to force push with:"
echo "git push origin clean-secrets --force"
echo ""
echo "WARNING: This rewrites history. Anyone working on this repository must fetch the new history." 