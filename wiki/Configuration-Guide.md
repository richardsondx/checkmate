# Configuration Guide

This page explains how to configure CheckMate for your specific needs.

## The `.checkmate` Configuration File

The main configuration file for CheckMate is `.checkmate` in your project root. This file uses YAML format and should never be committed to source control (it's automatically added to `.gitignore` during initialization).

Basic example:

```yaml
openai_key: sk-****
models:
  reason: o3
  quick: gpt-4o-mini
tree_cmd: "git ls-files | grep -E '\\.(ts|js|tsx)$'"
log: optional       # on | off | optional
```

## Configuration Options Reference

### API Keys

| Option | Description |
|--------|-------------|
| `openai_key` | Your OpenAI API key (or use OPENAI_API_KEY environment variable) |
| `anthropic_key` | Your Anthropic API key (or use ANTHROPIC_API_KEY environment variable) |

Example:

```yaml
# Direct key reference (recommended)
openai_key: sk-proj...
anthropic_key: sk-ant...
```

Direct key references are recommended over environment variable references for stability.

### Model Configuration

| Option | Description |
|--------|-------------|
| `models.reason` | Model used for spec generation and detailed reasoning |
| `models.quick` | Model used for quick requirement checks |

Example:

```yaml
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini
```

Available model options:
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`, etc.
- Anthropic: `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20240620`, etc.

You can use short aliases like `o3` for `gpt-4o`.

### File Discovery

| Option | Description |
|--------|-------------|
| `tree_cmd` | Command used to discover files in your project (bash command) |
| `context_top_n` | Number of most relevant files to include for context (default: 40) |

Example:

```yaml
# Find only TypeScript and JavaScript files
tree_cmd: "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'"
context_top_n: 40
```

### Logging

| Option | Description |
|--------|-------------|
| `log` | Logging behavior: "on" (always log), "off" (never log), "optional" (log only when useful) |
| `show_thinking` | Show AI thinking process in logs (true/false) |

Example:

```yaml
log: optional
show_thinking: true
```

### Spec Protection

| Option | Description |
|--------|-------------|
| `protect_specs` | Enable spec protection to detect tampering (true/false) |
| `spec_snapshot_path` | Path to store spec checksums (default: .checkmate/spec-snapshot.json) |

Example:

```yaml
protect_specs: true
spec_snapshot_path: .checkmate/spec-snapshot.json
```

### Auto-Fix Configuration

| Option | Description |
|--------|-------------|
| `auto_fix.max_attempts` | Maximum number of automatic fix attempts before requiring human intervention (default: 5) |

Example:

```yaml
auto_fix:
  max_attempts: 5  # Maximum number of automatic fix attempts
```

This setting is used by the `cm-enforce.js` script when running in Cursor to prevent infinite loops of failed verification attempts. When the maximum number of attempts is reached, the script will exit with a special code that forces Cursor to request human intervention.

### Lint Configuration

| Option | Description |
|--------|-------------|
| `lint.empty_checks` | Action when a spec has no requirements: "error" (fail), "warn" (warning only), "ignore" |
| `lint.trivial_assert` | Action when test contains trivial assertions: "error" (fail), "warn" (warning only), "ignore" |

Example:

```yaml
lint:
  empty_checks: error   # Fail when a spec has no meaningful requirements
  trivial_assert: error # Fail when test block contains only literals like 'return true'
```

### Telemetry Configuration

| Option | Description |
|--------|-------------|
| `telemetry.enabled` | Enable or disable telemetry collection (true/false) |
| `telemetry.retention` | Number of days to retain telemetry data (default: 30) |

Example:

```yaml
# Telemetry Settings
telemetry:
  enabled: true
  retention: 30
```

Telemetry data is stored in the `.checkmate-telemetry/` directory, which is automatically added to `.gitignore` during initialization. This data includes token usage and cost information for AI model interactions.

## Complete Configuration Example

Here's a complete example showing all configuration options:

```yaml
# API Keys
openai_key: sk-proj...
anthropic_key: sk-ant...

# Model Configuration
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini

# File Discovery
tree_cmd: "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'"
context_top_n: 40

# Logging
log: optional
show_thinking: true

# Spec Protection
protect_specs: true
spec_snapshot_path: .checkmate/spec-snapshot.json

# Auto-Fix Configuration
auto_fix:
  max_attempts: 5

# Lint Configuration
lint:
  empty_checks: error
  trivial_assert: error

# Telemetry Configuration
telemetry:
  enabled: true
  retention: 30
```

## Environment Variables

Instead of storing keys in the `.checkmate` file, you can use environment variables. Add these to your `.env` file or set directly in your shell:

```
OPENAI_API_KEY=sk-...your-key-here...
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

CheckMate will check for these environment variables if the corresponding keys are not found in the `.checkmate` file.

Additional environment variables:

```
CHECKMATE_MODEL_REASON=claude-3-7-sonnet-20250219
CHECKMATE_MODEL_QUICK=gpt-4o-mini
CHECKMATE_LOG=optional
```

## Setting Configuration via CLI

You can update your configuration using the `checkmate model` command:

```bash
# Set quick model
checkmate model set quick gpt-4o-mini

# Set reason model
checkmate model set reason claude-3-7-sonnet
```

## Next Steps

- [Command Reference](Command-Reference.md) - Explore all available commands
- [Cursor Integration](wiki/Cursor-Integration.md) - Configure Cursor integration
- [Advanced Features](wiki/Advanced-Features.md) - Learn about power user features 