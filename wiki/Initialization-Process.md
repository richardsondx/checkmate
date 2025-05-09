# Initialization Process Explained

This guide explains what the `checkmate init` command does behind the scenes and how to perform each step manually if needed.

## What `checkmate init` Does Automatically

When you run `npx checkmateai init` or `checkmate init`, the following actions occur:

1. Creates directory structure for specs and logs
2. Generates a `.checkmate` configuration file if it doesn't exist
3. Adds appropriate entries to `.gitignore`
4. Sets up Cursor integration by generating rule files
5. Performs basic verification of the setup

## Manual Initialization Steps

If you encounter issues with the automatic initialization, you can follow these manual steps:

### 1. Create Directory Structure

Create the necessary directories for CheckMate to store specifications, logs, and cache:

```bash
# Create the main checkmate directory
mkdir -p checkmate/specs
mkdir -p checkmate/logs
mkdir -p checkmate/cache

# Create the agent specs directory (for YAML specs)
mkdir -p checkmate/specs/agents
```

### 2. Create Configuration File

Create a `.checkmate` file in your project root with your API keys:

```bash
# Create .checkmate file with basic configuration
cat > .checkmate << EOF
openai_key: sk-****      # Replace with your OpenAI API key
anthropic_key: sk-ant-**** # Replace with your Anthropic API key
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini
tree_cmd: "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'"
log: optional
EOF
```

### 3. Update `.gitignore`

Ensure that sensitive files are not committed to your repository:

```bash
# Add CheckMate entries to .gitignore
cat >> .gitignore << EOF

# CheckMate
.checkmate
checkmate/logs/
checkmate/cache/
.checkmate-telemetry/
EOF
```

### 4. Setup Cursor Integration

To manually set up Cursor integration:

```bash
# Create Cursor rules directory if it doesn't exist
mkdir -p .cursor/rules

# Generate Cursor rule files
npx checkmateai setup-mcp
```

### 5. Create a Test Specification

Create a simple test specification to verify your setup:

```bash
# Create a simple test spec
cat > checkmate/specs/test-spec.md << EOF
# Test Specification

files:
  - README.md

- [ ] Repository has a README.md file
EOF

# Run CheckMate to verify
npx checkmateai status --target test-spec
```

## Common Issues and Solutions

### API Key Configuration

If you encounter issues with API keys:

- Ensure your API keys are correctly formatted in the `.checkmate` file
- Alternatively, set them as environment variables:
  ```bash
  export OPENAI_API_KEY=sk-...your-key-here...
  export ANTHROPIC_API_KEY=sk-ant-...your-key-here...
  ```

### Permission Issues

If you encounter permission issues:

```bash
# Ensure directories have correct permissions
chmod -R 755 checkmate
chmod 600 .checkmate  # Secure your API keys
```

### Cursor Integration Issues

If Cursor rules aren't being applied:

1. Check that the `.cursor/rules` directory exists and contains rule files
2. Verify the `mcpServers` section in `.cursor/config.json`:
   ```bash
   cat .cursor/config.json
   ```
3. Manually run the MCP setup:
   ```bash
   npx checkmateai setup-mcp
   ```

## Verification Process

To verify that your CheckMate setup is working correctly:

```bash
# Check your API connections
npx checkmateai status

# Create a simple spec
npx checkmateai gen "Test feature"

# Verify the spec status
npx checkmateai status --target test-feature
```

If all steps complete successfully, your CheckMate installation is working properly.

## Next Steps

Once initialization is complete:

- [Quick Start Guide](wiki/Quick-Start-Guide.md) - Get started with CheckMate
- [Configuration Guide](wiki/Configuration-Guide.md) - Learn about configuration options
- [Spec Types](wiki/Spec-Types.md) - Understand the different types of specifications 