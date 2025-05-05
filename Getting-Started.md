# Getting Started with CheckMate

This guide will help you install CheckMate and set up your first project.

## Installation

First, install the package:

```bash
npm install checkmateai
# or
pnpm add checkmateai
# or
yarn add checkmateai
```

Then initialize CheckMate in your project:

```bash
npx checkmate init
```

The init command:

* Creates a `.checkmate` config in the repo root  
* Adds `checkmate/` and `.checkmate` to `.gitignore`  
* Creates starter rule files in `.cursor/rules/`
* Sets up the directory structure for specs, logs and cache

## Folder Layout

After initialization, you'll have this structure:

```
project-root
├── .checkmate        # YAML config (never committed)
├── .cursor/
│   └── rules/        # Cursor rule files for automation
├── checkmate/
│   ├── specs/        # one .md file per feature
│   │   └── agents/   # YAML spec files with runnable tests
│   ├── logs/         # JSONL history (optional)
│   └── cache/        # raw model chatter
└── src/              # your code
```

## API Keys

CheckMate uses AI models for spec generation and validation. Add your API keys to `.checkmate`:

```yaml
openai_key: sk-...your-key-here...
anthropic_key: sk-ant-...your-key-here...
```

For convenience, CheckMate includes a `.checkmate.example` file that you can copy:

```bash
cp .checkmate.example .checkmate
# Then edit .checkmate to add your keys
```

You can also use environment variables:

```
OPENAI_API_KEY=sk-...your-key-here...
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

## Model Configuration

CheckMate uses two model tiers for different tasks:

* **Reason** - For thoughtful spec generation (default: `gpt-4o` or `claude-3-7-sonnet`)
* **Quick** - For speedy requirement evaluation (default: `gpt-4o-mini`)

Configure models in your `.checkmate` file:

```yaml
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini
```

Change model settings with the command:

```bash
checkmate model set quick gpt-3.5-turbo
```

## Next Steps

- [Quick Start Guide](Quick-Start-Guide.md) - Create your first spec
- [Command Reference](Command-Reference.md) - Learn all available commands
- [Configuration Guide](Configuration-Guide.md) - Detailed configuration options 