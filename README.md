# CheckMate

AI-powered specs that block bad code, See through hallucination, and prevent AI from breaking your code.

CheckMate is an AI‑Driven TDD tool that writes and runs specs for your code.

It lives in your repo, validates every change, and keeps specs in sync with your implementation.

Built with Cursor AI integration in mind.

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

# Create a spec for a new feature (or use 'checkmate warmup' for existing code)
checkmate gen "User can reset their password via email link"

# Let Cursor (or your LLM agent) drive the TDD process:
# 1. LLM: "Use CheckMate to TDD the 'user-password-reset' feature"
#    (This triggers the .cursor/rules/checkmate-feature-validation-workflow.mdc rule)

# 2. CheckMate (via rule) to LLM:
#    "📋 Retrieving check items from spec: checkmate/specs/user-password-reset.md"
#    "🔍 Found check items to validate:"
#    "🧪 Check #1: System generates a unique, single-use password reset token"
#    "🧪 Check #2: User receives an email with a link containing the reset token"
#    "🧪 Check #3: Clicking the link allows the user to set a new password"
#    "🧪 Check #4: The reset token is invalidated after use or expiration"
#    "📝 INSTRUCTIONS FOR CURSOR:"
#    "---"
#    "1. For each check item above, you must:"
#    "   a. Define explicit success and failure conditions"
#    "   b. Examine the codebase (or write it if it doesn't exist) to verify if it meets your conditions"
#    "   c. Report your findings as an outcome report"
#    "   d. Call \`checkmate verify-llm-reasoning\` to validate your reasoning"
#    "2. Example usage for Check #1:"
#    "   \`checkmate verify-llm-reasoning --spec user-password-reset --check-id 1 \\"
#    "      --success-condition \"A cryptographically secure unique token is generated and stored with an expiry.\" \\"
#    "      --failure-condition \"Token is predictable, not unique, or has no expiry.\" \\"
#    "      --outcome-report \"Observed UUID v4 generation for token and a 1-hour expiry in token_service.js.\"\`"
#    "3. Continue until all checks have been verified"
#    "---"

# 3. LLM implements/verifies code for Check #1, then calls:
#    checkmate verify-llm-reasoning --spec user-password-reset --check-id 1 ... (as above)

# 4. CheckMate to LLM:
#    "✅ Logical verification PASSED for check \"System generates a unique, single-use password reset token\""
#    "✅ Spec \"user-password-reset.md\" has been updated, check marked as [✓]"

# 5. LLM proceeds to Check #2, and so on.
#    If verify-llm-reasoning fails, the LLM uses the feedback to refine its conditions/outcome or fix the code.

# 6. Finally, check the status:
checkmate status --target user-password-reset
```

CLI output after all checks pass:

```
Spec Status: User Password Reset
✔ 4 / 4 requirements passed (100%)
```

This LLM-driven TDD loop ensures your AI assistant systematically works through requirements and self-corrects based on logical validation.

---

## Common Workflows

### Cursor Integration Commands (Use inside Cursor AI)
| Want to...? | Tell Cursor this |
|-------------|------------------|
| **Start TDD for a new/existing feature** | `/@checkmate-tdd <feature-slug>` or `/checkmate-tdd <feature-slug>` |
| **Run CheckMate against open code** | `/runCheckmate` or `/run-checkmate` |
| **Get help for a failing requirement** | `/fix-checkmate` |

### CLI Commands (Run in terminal)
| Want to...? | Run this command |
|-------------|------------------|
| **Add a spec for existing code** | `checkmate gen "Description of existing feature"` |
| **Generate specs from a PRD** | `checkmate warmup docs/PRD.md` |
| **View all tracked features** | `checkmate features` |
| **Find specs based on content** | `checkmate find "description of what you're looking for"` |
| **List checks for a specific feature** | `checkmate list-checks <feature-slug>` |
| **Manually verify LLM reasoning** | `checkmate verify-llm-reasoning --spec <spec> --check-id <id> --success-condition "..." --failure-condition "..." --outcome-report "..."` |
| **See which specs your changes affect** | `checkmate affected` |
| **Get AI help on a failing/unclear check** | `checkmate clarify <spec> --bullet <check-id-or-number>` |
| **Generate specs for entire repo** | `checkmate warmup` |
| **View overall status of a spec** | `checkmate status <spec>` |
| **Reset spec status** | `checkmate reset <spec>` |

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

CheckMate is designed for deep integration with AI coding assistants like Cursor. The primary interaction is through the LLM-driven TDD workflow.

### Key Integration Rule: `checkmate-feature-validation-workflow.mdc`

This rule, located in `.cursor/rules/`, is triggered when you ask Cursor to work on a feature using CheckMate (e.g., `/@checkmate-tdd user-login`). It orchestrates the TDD loop:
1. Calls `checkmate list-checks` to provide the LLM with the checklist for the specified feature.
2. Instructs the LLM to define success/failure conditions, verify/implement code, and report outcomes for each check.
3. Guides the LLM to use `checkmate verify-llm-reasoning` after each check to validate its assessment.

### Sample Cursor Prompts for the TDD Workflow

Initiate TDD for a feature:
> `/@checkmate-tdd user-authentication`
> (Cursor will then follow the workflow defined in the rule, interacting with `list-checks` and `verify-llm-reasoning`)

If a `verify-llm-reasoning` step fails, Cursor might receive feedback like:
> `❌ Logical verification FAILED for check "Password is hashed using bcrypt"`
> `❌ Reason: The outcome report states SHA256 was used, which does not meet the success condition of using bcrypt.`

Cursor should then use this feedback to correct the implementation or its assessment.

### Other Useful Prompts

Get a list of features:
> "What features are tracked by CheckMate?" (LLM might run `checkmate features`)

Create a new spec:
> "Create a CheckMate spec for a feature that allows users to upload profile pictures." (LLM might run `checkmate gen "..."`)

Clarify a check:
> "The second check for 'profile-picture-upload' is unclear. Can CheckMate clarify it?" (LLM might run `checkmate clarify profile-picture-upload --bullet 2`)

### Using CheckMate in Cursor (Beyond the TDD Rule)

While the TDD rule provides the primary workflow, you can still invoke other CheckMate commands directly or ask the LLM to use them. The `.cursor/rules/` directory contains other rules that might trigger on events like `after_command` (e.g., running `checkmate status` automatically).

---

## Detailed Command Reference

### Core TDD Workflow Commands

| Command | Description |
|---------|-------------|
| `checkmate list-checks <spec>` | Lists all check items for a given specification, providing IDs for each. |
| `checkmate verify-llm-reasoning --spec <spec> --check-id <id> ...` | Validates an LLM's reasoning about a specific check item. Requires success/failure conditions and an outcome report. |
| `checkmate gen "<description>"` | Creates a new spec from a plain text description of a feature. |
| `checkmate warmup [prd-file]` | Scans a repository (or PRD) and suggests/creates specs for existing code or documented features. |

### Supporting & Utility Commands

| Command | Description |
|---------|-------------|
| `checkmate features` | Lists all features tracked by CheckMate, with their status. |
| `checkmate status <spec>` | Shows the current pass/fail status of all checks for a specific spec. |
| `checkmate clarify <spec> --bullet <id>` | Asks an AI model to explain why a requirement might be failing or how to implement it, based on the spec and (optionally) relevant code. |
| `checkmate affected` | Prints spec names touched by the current Git diff (or file snapshot changes). |
| `checkmate reset <spec>` | Resets the status of all checks in a spec back to unchecked. |
| `checkmate model set <tier> <model>` | Configures the AI model for a specific tier (e.g., `reason`, `quick`). |
| `checkmate stats` | Displays token usage statistics for AI model interactions. |

### Advanced & Maintenance Commands

| Command | Options | Description |
|---------|---------|-------------|
| `checkmate warmup` | `--prd <file>` | Generate specs from a PRD markdown file |
| | `--yes` | Skip interactive mode |
| | `--output yaml\|json` | Choose output format |
| `checkmate features` | `--json` | Machine-readable features list |
| | `--search <term>` | Filter features by title/slug |
| | `--type USER\|AGENT` | Filter by spec type |
| | `--status PASS\|FAIL\|STALE` | Filter by status |
| | `--interactive` | Interactive selection mode |
| `checkmate audit` | `--warn-only` | Only warn on differences, don't fail |
| | `--json` | Output in machine-readable format |
| | `--debug` | Show metadata and file hashes |
| | `--force` | Force regeneration of action bullets |
| `checkmate watch` | `--filter todo` | Dashboard filtered to specs containing "todo" |
| | `--spec user-auth` | Focus on a specific spec |
| | `--status FAIL` | Show only failing specs |
| | `--until-pass` | Watch until spec passes |
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
   checkmate status
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

---

## PRD-Driven Workflow

CheckMate now supports a PRD-driven workflow:

1. **Warmup** reads a PRD file and bootstraps base specs:
   ```bash
   checkmate warmup docs/PRD.md
   ```

2. **Features** lists the features discovered during that Warmup:
   ```bash
   checkmate features
   ```

3. **Audit** compares an existing spec against the real code to catch drift:
   ```bash
   checkmate audit user-login-flow
   ```

This workflow enables:
- Direct spec creation from PRD documents
- Tracking which features from the PRD are implemented
- Verifying implementation matches the spec with action bullets

```
Spec: user-login-flow
──────────────────────────
✅ validate user credentials
✅ create user session
❌ implement password reset  <- spec-only bullet
⚠️ generate auth token      <- code-only bullet
```
