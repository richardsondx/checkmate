# CheckMate

AI-powered specs that block bad code, and prevent AI from breaking your code.

CheckMate is an AI‑Driven TDD tool that writes and runs specs for your code.
It lives in your repo, validates every change, and keeps specs in sync with your implementation.

Built with Cursor AI integration in mind, but equally valuable as a standalone TDD tool.

---

## Key Benefits

- **Immediate feedback** when the spec no longer matches reality
- **Zero manual code reading** to see what changed
- **Encourages accurate specs** instead of "just tick the box"
- **Prevents silent regressions** when AI edits files outside the spec's awareness
- **Simplifies code reviews** with clear requirement tracking
- **Bridges communication gaps** between technical and non-technical team members
- **Maintains living documentation** that evolves with your codebase

---

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run a specific test
node tests/unit/test-splitter.mjs

# Check test coverage
npm run test:coverage

# Run tests and check coverage with interactive mode
npm run test:all
```

The test coverage script provides an overview of which commands and scripts have tests and identifies areas for improvement.

See `tests/README.md` for more details on the testing architecture.

### Adding New Tests

To add a new test for a command or script:

1. Run the interactive test coverage tool:
   ```bash
   npm run test:all
   ```

2. When prompted, choose to create tests for uncovered commands
3. Enter the name of the command or script you want to test
4. The tool will create a template test file that you can customize

Alternatively, manually create a test file in the appropriate directory:
- Command tests go in `tests/unit/commands/test-{command-name}.mjs`
- Script tests go in `tests/unit/scripts/test-{script-name}.mjs`

---

## Quick Start

```bash
# Install
npm install checkmateai

# Initialize
npx checkmate init

# Create a spec
checkmate gen "A user can add a new todo with title and status"

# Run the checks
checkmate run
```

CLI output:

```
Feature: add-todo
  ✔ Reject blank titles
  ✔ Insert row with done:false
  ✖ Return 201 JSON payload
```

Fix the red line, run again, get all green.  
CheckMate resets the boxes, logs the pass, and you move on.

---

## Common Workflows

| Want to...? | Do this |
|-------------|---------|
| **Create a new feature** | Tell Cursor: "Build a todo list app with CheckMate" |
| **Add a spec for existing code** | `checkmate gen "List all todos"` |
| **View all tracked features** | `checkmate features` |
| **Find only failing features** | `checkmate features --fail` |
| **Monitor test progress** | `checkmate watch` (in a separate terminal) |
| **See which specs your changes affect** | `checkmate affected` |
| **Fix a failing spec** | `checkmate clarify user-auth --bullet 3` |
| **Generate specs for entire repo** | `checkmate warmup` |
| **Focus on a specific spec** | `checkmate run --target user-auth` |
| **Watch until a spec passes** | `checkmate watch --spec user-auth --until-pass` |
| **Reset spec status** | `checkmate reset user-auth` |

---

## Environment Variables and Configuration

Add API keys to your `.checkmate` file:

```yaml
# Direct key reference (recommended)
openai_key: sk-...your-key-here...
anthropic_key: sk-ant-...your-key-here...

# Model Configuration
models:
  reason: claude-3-7-sonnet-20250219  # For spec generation
  quick: gpt-4o-mini                  # For quick requirement checks
```

Or use environment variables:

```
OPENAI_API_KEY=sk-...your-key-here...
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
CHECKMATE_MODEL_REASON=claude-3-7-sonnet
CHECKMATE_MODEL_QUICK=gpt-4o-mini
```

---

## Spec Types

| Type | File Format | Created By | Purpose |
|------|-------------|------------|---------|
| **User Specs** | `.md` | You or your team | Natural language requirements for humans to write and AI to evaluate |
| **Agent Specs** | `.yaml` | AI assistants | Specifications that include executable test code |

**When to use User Specs:**
- You're new to CheckMate
- Requirements are simple and easy to understand
- Non-technical stakeholders need to review specs

**When to use Agent Specs:**
- You need precise validation with executable tests
- You want tests that run without AI (e.g., in CI)
- You're validating complex functionality like API calls

Convert between types:
```bash
checkmate promote --to-agent user-auth
```

---

## Cursor Integration & Prompts

### Hardened Cursor Integration

CheckMate includes a robust enforcement mechanism to ensure specs truly pass before Cursor marks a task as complete:

```yaml
# Auto-Fix Configuration (in .checkmate file)
auto_fix:
  max_attempts: 5  # Maximum automatic fix attempts before human intervention
```

Features:
- **Fail-Fast Mode** - Tests stop at first failure for targeted fixes
- **Automatic Retry** - System tracks fix attempts to prevent infinite loops
- **Configurable Retry Budget** - Set max attempts in the `.checkmate` file
- **Human Intervention** - When max attempts are reached, forces human review

### Setting Up MCP

```bash
npx checkmate setup-mcp
```

### Sample Cursor Prompts

Generate a spec and implement:
> "Create a user authentication system with login and registration using CheckMate"

Run tests on affected specs:
> "Implement the user login API and make sure it passes all the CheckMate specs"

Fix a failing spec:
> "The login form spec is failing, fix the code to make it pass"

Convert user stories to specs:
> "Convert these user stories into CheckMate specs and implement them"

### Using CheckMate in Cursor

When you save code changes, Cursor automatically:
1. Identifies which specs are affected (`checkmate affected`)
2. Runs those specs to verify your changes (`checkmate run --target "$specs"`)
3. Blocks the "Done" badge until all specs pass

---

## Detailed Command Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `checkmate warmup` | Scan repo, analyze code patterns, and suggest specs |
| `checkmate gen "<sentence>"` | Create a spec from plain text |
| `checkmate gen -i "<sentence>"` | Interactive spec generation with approval workflow |
| `checkmate draft "<sentence>"` | Generate spec drafts without writing to disk |
| `checkmate save --json '<json>'` | Save approved spec drafts to disk |
| `checkmate features` | List all features tracked by CheckMate |
| `checkmate run` | Run every check, exit 1 on fail |
| `checkmate run --target <slug>` | Run a specific spec |
| `checkmate next` | Run the first unchecked step in the current branch |
| `checkmate affected` | Print spec names touched by the current diff |
| `checkmate clarify <slug>` | Explain why a requirement is failing and suggest fixes |
| `checkmate audit <slug>` | Compare spec against implementation using action bullets |
| `checkmate reset <spec-slug>` | Reset the status of a spec back to unchecked state |
| `checkmate reset --all` | Reset all specs back to unchecked state |
| `checkmate watch` | Live ASCII dashboard that updates in real-time as specs run |
| `checkmate model set <tier> <model>` | Swap the model in the config |
| `checkmate stats` | Display token usage statistics for the current session |

### Advanced Commands

| Command | Options | Description |
|---------|---------|-------------|
| `checkmate features` | `--json` | Machine-readable features list |
| | `--search <term>` | Filter features by title/slug |
| | `--type USER\|AGENT` | Filter by spec type |
| | `--status PASS\|FAIL\|STALE` | Filter by status |
| | `--interactive` | Interactive selection mode |
| `checkmate watch` | `--filter todo` | Dashboard filtered to specs containing "todo" |
| | `--spec user-auth` | Focus on a specific spec |
| | `--status FAIL` | Show only failing specs |
| | `--until-pass` | Watch until spec passes |
| `checkmate audit` | `--warn-only` | Only warn on differences, don't fail |
| | `--json` | Output in machine-readable format |
| | `--debug` | Show metadata and file hashes |
| | `--force` | Force regeneration of action bullets |
| `checkmate warmup` | `--yes` | Skip interactive mode |
| | `--output yaml\|json` | Choose output format |
| `checkmate gen` | `--agent` | Create YAML spec with executable tests |
| | `--files path/to/file` | Specify files to include |
| `checkmate promote` | `--to-agent <slug>` | Convert User Spec to Agent Spec |
| `checkmate auto` | `--spec <slug>` | Enable auto-file discovery |
| `checkmate snap` | `--detect` | Find file renames |
| | `--repair` | Fix specs after refactoring |
| `checkmate stats` | `--all` | Show stats for all sessions |
| | `--since <time>` | Show stats for a specific time period (e.g., 24h, 7d) |
| | `--session <id>` | Show stats for a specific session |
| | `--json` | Output in JSON format |

---

## Installation

```bash
npm install checkmateai
# or
pnpm add checkmateai
# or
yarn add checkmateai
```

Then initialize CheckMate:

```bash
npx checkmate init
```

The init command:
* Creates a `.checkmate` config in the repo root  
* Adds `checkmate/` and `.checkmate` to `.gitignore`  
* Creates rule files in `.cursor/rules/`
* Sets up the directory structure for specs, logs and cache

---

## When You Clone a Repo Using CheckMate

1. **Clone and hop in**
   ```bash
   git clone <repo-url> my‑project
   cd my‑project
   ```

2. **Install deps**
   ```bash
   npm install
   ```

3. **Pop in your OpenAI key**
   ```bash
   echo "openai_key: sk-****" > .checkmate
   ```

4. **Smoke‑test the specs**
   ```bash
   checkmate run
   ```

5. **Start coding**
   Make changes and let Cursor automatically validate them.

---

## Folder Layout

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

---

## Live Dashboard

Run `checkmate watch` to see a live dashboard of your test results:

```
  CheckMate Live Dashboard

Time        Spec                      Type    Total   Status    Pass   Fail    
────────────────────────────────────────────────────────────────────────────
08:27:02 PM  test-feature             USER    4       PASS      4      0       
08:26:56 PM  user-auth-validation     USER    5       FAIL      2      3       
```

---

## Documentation

For more detailed information about CheckMate, check out these guides:

- [Getting Started](wiki/Getting-Started.md) - Installation and setup
- [Quick Start Guide](wiki/Quick-Start-Guide.md) - Create your first spec
- [Configuration Guide](wiki/Configuration-Guide.md) - Configure CheckMate
- [Cursor Integration](wiki/Cursor-Integration.md) - Use CheckMate with Cursor
- [Advanced Features](wiki/Advanced-Features.md) - Power user features
- [Spec Types](wiki/Spec-Types.md) - User Specs vs Agent Specs
- [Developer Guide](wiki/Developer-Guide.md) - Contribute to CheckMate
- [Telemetry Guide](wiki/Telemetry-Guide.md) - Token usage tracking and statistics

---

## License

MIT

---

## New: Action Bullets and Audit

The `checkmate audit` command replaces the older `outline` command with a simpler, more focused approach:

### What It Does

- Extracts action bullets (verb + object) from both spec and code
- Uses the same language format on both sides for meaningful diffs
- Shows only real gaps between spec and implementation
- Enables interactive prompts to update spec from code findings

```
Spec: user-auth
────────────
✅ validate credentials
✅ hash password with bcrypt
❌ create JWT token         <- missing in code
⚠️ log login attempt       <- code has, spec missing
```

### Why It's Better

- **Same language on both sides** → diff is meaningful
- **One command (`audit`)** → discoverable and memorable
- **Interactive add-to-spec** keeps specs alive without hand-editing
- **No meta spam** keeps output readable
- Works for non-devs: they read plain bullets, press y/n, never touch test code
