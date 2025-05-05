# CheckMate

Plain‑English specs that live in Git and block "Done" until every box turns green.  
Built for Cursor AI, but handy on its own too.

---

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
* Creates a starter rules file in `.cursor/config.yaml`
* Sets up the directory structure for specs, logs and cache

You can start writing specs right away after initialization.

---

## Quick Start (one feature)

```bash
# write a single‑sentence spec
checkmate gen "A user can add a new todo with title and status"

# let Cursor (or you) build the code
# …

# run the checklist
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

### Quick Start — when you **clone a repo that already uses CheckMate**

1. **Clone and hop in**

   ```bash
   git clone <repo-url> my‑project
   cd my‑project
   ```

2. **Install deps**

   ```bash
   pnpm i        # or npm i / yarn
   ```

3. **Pop in your OpenAI key**

   ```bash
   echo "openai_key: sk-****" > .checkmate
   ```

   > If the repo already ships a `.checkmate.example`, copy it over and drop your key in.

4. **Smoke‑test the specs**

   ```bash
   checkmate run
   ```

   You should see every box turn green. If something fails, the spec shows exactly what broke.

5. **Start coding**

   Make a change, commit, and watch the Cursor rules kick off `checkmate affected` → `checkmate run`.
   Any red box stops the "Done" badge until you push a fix.

That's all—no extra setup, no hidden steps. You clone, install, add your key, and the watchdog is live.


---

## Using CheckMate in a **new** project

1. Run the `init` script.  
2. Describe your first feature with `checkmate gen "…"`.  
3. Build until the list shows √ for every line.  
4. Repeat for each new feature.

No existing paths, so the generator guesses file names (e.g. `src/routes/todos.ts`).  
When the code appears, future scans catch the real paths.

---

## Dropping CheckMate into an **existing** app

1. Run `init`.  
2. Write a spec for a feature that already works:  

   ```bash
   checkmate gen "List all todos"
   checkmate run   # everything should pass
   ```

3. Add more specs until you feel covered.  
4. From now on `checkmate affected` spots any spec touched by a change.

If the generator points at the wrong file, open the Markdown and fix the `files:` list.  
CheckMate warns when paths do not exist.

---

## AI Integration

CheckMate uses AI models through dedicated clients to:

1. **Generate Specs** - Convert plain English descriptions into detailed requirements
2. **Evaluate Requirements** - Test requirements against your code 

### Model Configuration

Two model tiers handle different tasks:

* **Reason** - For thoughtful spec generation (default: `gpt-4o` or `claude-3-7-sonnet`)
* **Quick** - For speedy requirement evaluation (default: `gpt-4o-mini`)

You can configure models in your `.checkmate` file:

```yaml
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini
```

Change model settings with the command:

```bash
checkmate model set quick gpt-3.5-turbo
```

### How AI Assistants Use CheckMate

When using Cursor or other AI coding assistants with CheckMate:

1. **AI-Driven Spec Creation**: AI assistants can automatically create specs based on tasks:
   ```bash
   # This is typically called by AI assistants, not typed by users
   checkmate create --agent --json '{"feature": "User authentication", "files": ["src/auth/**"]}'
   ```

2. **Spec Promotion**: AI can convert User Specs to Agent Specs with executable tests:
   ```bash
   checkmate promote --to-agent user-authentication
   ```

3. **Targeted Testing**: AI can run affected specs after making changes:
   ```bash
   checkmate affected --json  # Get affected specs as JSON
   checkmate run --target affected-spec-name
   ```

When an AI completes a task in Cursor, CheckMate automatically validates the changes against relevant specs, blocking the "Done" badge until all checks pass.

---

## Environment Variables

Add to your `.env` file or set directly in your shell:

```
OPENAI_API_KEY=sk-...your-key-here...
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

For convenience, CheckMate includes a `.checkmate.example` file that you can copy:

```bash
cp .checkmate.example .checkmate
# Then edit .checkmate to add your keys
```

Example `.checkmate` configuration:

```yaml
openai_key: sk-...your-key-here...
anthropic_key: sk-ant-...your-key-here...
models:
  reason: claude-3-7-sonnet-20250219
  quick: gpt-4o-mini
```

Direct key references are recommended over environment variable references for stability.

---

## Folder Layout

```
project-root
├── .checkmate        # YAML config (never committed)
├── checkmate/
│   ├── specs/        # one .md file per feature
│   │   └── agents/   # YAML spec files with runnable tests
│   ├── logs/         # JSONL history (optional)
│   └── cache/        # raw model chatter
└── src/              # your code
```

---

## Spec Types

| Type | File Format | Dashboard Label | Created By | Purpose |
|------|-------------|-----------------|------------|---------|
| **User Specs** | `.md` | USER | You or your team | Natural language requirements for humans to write and AI to evaluate |
| **Agent Specs** | `.yaml` | AGENT | AI assistants | Specifications that include executable test code |

### When to use each type

1. **Start with User Specs (Markdown)** for most features:
   ```bash
   checkmate gen "User can reset their password"
   ```
   These are simple to create, edit, and understand. CheckMate uses AI to evaluate if your code meets these requirements.

2. **Use Agent Specs (YAML)** when you need:
   - Executable tests for complex validations
   - Tests that can be run without AI (e.g., in CI pipelines)
   - More precise validation of database, API, or other integration points

### Converting between spec types

You can promote a User Spec (`.md`) to an Agent Spec (`.yaml`) using:

```bash
checkmate promote --to-agent user-password-reset
```

This converts your markdown requirements into an executable YAML spec, which you can then edit to add test code to each requirement.

### AI Integration

Most User Specs are created by humans, while Agent Specs are typically created by AI assistants like Cursor AI. When an AI assistant creates a spec, it often uses:

```bash
checkmate create --agent --json '{"feature": "Feature description", "files": ["path/to/files"]}'
```

This command is primarily called programmatically by AI assistants through Cursor, not typically typed by users.

CheckMate runs both spec types together, so you'll see results from both User (`.md`) and Agent (`.yaml`) specs in the dashboard.

---

## Core Commands

| Command | Description |
|---------|-------------|
| `checkmate warmup` | Scan repo, analyze code patterns, and suggest specs |
| `checkmate gen "<sentence>"` | Create a spec from plain text. |
| `checkmate gen -i "<sentence>"` | Interactive spec generation with approval workflow. |
| `checkmate draft "<sentence>"` | Generate spec drafts as JSON without writing to disk. |
| `checkmate save --json '<json>'` | Save approved spec drafts to disk. |
| `checkmate run` | Run every check, flip boxes, exit 1 on fail. |
| `checkmate next` | Run the first unchecked step in the current branch. |
| `checkmate affected` | Print spec names touched by the current diff. |
| `checkmate clarify <slug>` | Explain why a requirement is failing and suggest fixes. |
| `checkmate watch` | Live ASCII dashboard that updates in real-time as specs run. |
| `checkmate watch --filter todo` | Dashboard filtered to specs containing "todo". |
| `checkmate watch --spec user-auth --until-pass` | Watch a specific spec until it passes. |
| `checkmate model set quick gpt-4o-mini` | Swap the model in the config. |

---

## Quick Tips

Need to...? | Try this:
------------|----------
**Create a specification** | `checkmate gen "User can reset their password"`
**Run all checks** | `checkmate run`
**Focus on a specific spec** | `checkmate run --target user-password-reset`
**Monitor progress** | `checkmate watch` (in a separate terminal)
**Watch a specific feature** | `checkmate watch --spec user-auth --until-pass`
**Fix failing specs first** | `checkmate watch --status FAIL`
**See which specs changed** | `checkmate affected`

These commands cover 90% of your daily CheckMate workflow. For more options, use `--help` with any command.

---

## Configuration (`.checkmate`)

```yaml
openai_key: sk-****
models:
  reason: o3
  quick:  gpt-4o-mini
tree_cmd: "git ls-files | grep -E '\\.(ts|js|tsx)$'"
log: optional       # on | off | optional
```

Change model names any time and commit nothing sensitive.

---

## Cursor Rules (auto‑injected)

```yaml
pre_task:
  - name: cm_scope
    cmd: checkmate affected
    env: {CM_LIST: "$OUTPUT"}

post_task:
  - name: cm_verify
    cmd: checkmate run --target "$CM_LIST"

post_push:
  - name: cm_regress
    cmd: checkmate run
```

* `pre_task` limits the blast radius.  
* `post_task` blocks green checkmarks until boxes are green.  
* `post_push` keeps main clean.

## Visual Task Indicators in Cursor

CheckMate provides clear visual indicators when tasks are running in Cursor:

![CheckMate Task Indicators](https://via.placeholder.com/600x100?text=CheckMate+Task+Indicators)

Each task type has a distinct visual style:

| Task Type  | Visual Indicator                       | Description                                   |
|------------|---------------------------------------|-----------------------------------------------|
| pre_task   | 🔍 **SCOPE ANALYSIS** (blue border)   | Analyzes which specs will be affected by changes |
| post_task  | ✓ **VERIFICATION** (green border)     | Verifies that affected specs pass after changes |
| post_push  | 🚀 **REGRESSION TEST** (red border)   | Ensures all specs pass before pushing to main |

These visual indicators make it immediately obvious when CheckMate is running tasks in Cursor, providing a seamless and integrated experience.

---

## 📜 Cursor Rule Files

In addition to the config-based rules, CheckMate creates `.mdc` rule files in the `.cursor/rules/` directory:

* `pre-task.mdc` - Runs scope analysis before coding
* `post-task.mdc` - Verifies affected specs after coding
* `post-push.mdc` - Runs the full test suite on pushes

These rule files improve Cursor's understanding of the CheckMate workflow and provide clear guidance about when and why commands are being executed. They follow Cursor's best practices with short, specific bullets and clear execution steps.

View them in `.cursor/rules/` to understand how CheckMate integrates with your development workflow.

---

## Live Dashboard

Run `checkmate watch` in a second terminal to see a real-time dashboard of your test results.

```
  CheckMate Live Dashboard

Time        Spec                                    Type    Total   Status    Pass      Fail    
────────────────────────────────────────────────────────────────────────────────────────────────
08:27:02 PM  test-feature                           USER    4       PASS      4         0       
08:26:56 PM  user-auth-validation                   USER    5       FAIL      2         3       
08:25:57 PM  api-endpoint-testing                   AGENT   6       PASS      6         0       
```

### Dashboard Features

The dashboard has several powerful features to help you focus on what matters:

- **Filter by name**: `checkmate watch --filter todo`
- **Filter by type**: `checkmate watch --type USER` or `--type AGENT`
- **Filter by status**: `checkmate watch --status PASS` or `--status FAIL`
- **Show more results**: `checkmate watch --limit 20` (default is 10)
- **Watch specific spec**: `checkmate watch --spec user-auth-validation`
- **Wait until passing**: `checkmate watch --spec api-test --until-pass`

You can combine multiple filters:

```bash
# Show only failing user specs with "auth" in the name
checkmate watch --filter auth --type USER --status FAIL
```

The dashboard updates automatically in real-time as you run tests, showing you exactly what's happening with your specs.

---

## Reset and Logs

* After a full‑pass run CheckMate rewrites every `[✔]` back to `[ ]`.  
* History lives in `checkmate/logs/run.log` unless `log: off`.

Logs stream nicely into your dashboard or CI summary.

---

## Contributing

PRs welcome. Keep each change small and include a spec that proves it works.

---

## Cursor Integration (MCP)

CheckMate can be used as a Middleware Control Protocol (MCP) server for Cursor AI, creating a seamless TDD experience directly in your editor.

### Setting Up MCP

The easiest way to set up CheckMate MCP is with the built-in setup command:

```bash
# Run the automated setup
npx checkmate setup-mcp
```

This will create or update your `.cursor/config.json` file with the necessary MCP configuration.

### Working with Cursor

You can integrate CheckMate directly into your Cursor workflow using several approaches:

#### Using the Cursor one-off spec helper

The simplest way to create a spec from Cursor is to use the included helper script:

```bash
node scripts/cursor-checkmate.js \
  "Search developers endpoint" \
  app/api/github/search/route.ts app/lead-finder/search/page.js
```

This creates a specification with the given feature description and explicitly lists the files that will be touched.

#### Using checkmate create directly

For more complex integrations, use the `create` command with JSON:

```bash
checkmate create --json '{"feature": "Add webhook support", "files": ["src/api/webhooks/**"]}'
```

#### Using affected specs

When you make changes to files, find all impacted specs with:

```bash
checkmate affected --json
```

This returns a JSON array of spec slugs that your current changes might impact.

### Manual MCP Setup

If you prefer to set up manually, add this to your `.cursor/config.json`:

```json
{
  "mcpServers": {
    "checkmate": {
      "command": "node",
      "args": [
        "dist/mcp/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "CHECKMATE_MODEL_REASON": "o3",
        "CHECKMATE_MODEL_QUICK": "gpt-4o-mini"
      }
    }
  }
}
```

### Using CheckMate with Cursor

Once set up, you can use natural language prompts to drive your TDD workflow:

Just type:

> **"Build a todo list app"**

The CheckMate MCP will:
- Generate a spec (`checkmate gen`)
- Let Cursor write code to implement it
- Run the checklist (`checkmate run`)
- Block "Done" if any line fails

### Testing Your MCP Setup

Verify your AI configuration with:

```bash
npx checkmate status
```

This will test your OpenAI API connection with both models and display the results.

---

## Development

If you want to contribute to CheckMate or debug issues, follow these steps:

### Setup Local Development Environment

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/checkmateai.git
   cd checkmateai
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the TypeScript files
   ```bash
   npm run build
   ```

4. Link the package locally
   ```bash
   npm link
   ```

This will make the `checkmate` command available globally, pointing to your local development version.

### Development Commands

- `npm run dev` - Run the CLI in development mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run checkmate -- <command>` - Run any checkmate command during development

### Debugging

If you encounter any issues with the display of terminal output:

1. Check the console debug logs which should show configurations and other diagnostic information
2. Try running with the raw TypeScript source: `NODE_OPTIONS="--loader ts-node/esm" ts-node src/index.ts <command>`
3. Review the logs in the `checkmate/logs` directory for execution details

### Testing AI Integration

Test the AI integration with our test scripts:

```bash
node test-ai.mjs  # Test direct OpenAI API calls
node test-config.mjs  # Test config file parsing
```

Make sure to set up your OpenAI API key in `.checkmate` file before testing.

---

## License

MIT

## New YAML Specification Format (Agent Specs)

Agent Specs use a structured YAML format that includes executable tests:

```yaml
title: Search Developers Feature
files:
  - src/lib/api/github-users.ts
  - src/components/lead-finder/DeveloperSearch.tsx
requirements:
  - id: req-1
    require: Function fetchDevelopers returns an array when called with a keyword
    test: |
      import { fetchDevelopers } from './src/lib/api/github-users';
      const data = await fetchDevelopers('react');
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('fetchDevelopers returned no results');
      }
```

### Key differences from User Specs (Markdown):

- **Executable Tests**: Each requirement can include real JS/TS code to validate functionality
- **Precise Validation**: No reliance on AI reasoning for pass/fail determination
- **Structured Format**: YAML structure enables programmatic creation by AI assistants
- **Clear Tracking**: Each requirement has a unique ID for status tracking

### Creating Agent Specs (YAML)

You have three ways to create Agent Specs:

1. **Convert from a User Spec**:
   ```bash
   checkmate promote --to-agent user-password-reset
   ```

2. **Using the generator with agent flag**:
   ```bash
   checkmate gen "Search developers feature" --agent
   ```

3. **Using the scaffold command** (for manual customization):
   ```bash
   checkmate scaffold search-feature \
     --title "Search Developers" \
     --file src/lib/api/search.ts \
     --require "Function returns valid results" \
     --require "Handles error cases properly"
   ```

### Running Agent Specs

Run your Agent Specs just like User Specs:

```bash
checkmate run                         # Run all specs (both User and Agent)
checkmate run --target search-feature # Run a specific spec
```

Tests in Agent Specs are executed in a sandbox with a 5-second timeout, and results are validated by running the actual code, not through AI evaluation.

### Example Dashboard with Both Spec Types

```
  CheckMate Live Dashboard

Time        Spec                                    Type    Status    Pass      Fail    
─────────────────────────────────────────────────────────────────────────────────
08:27:02 PM  test-feature                           USER    PASS      4         0       
08:26:56 PM  user-auth-validation                   USER    FAIL      2         3       
08:25:57 PM  api-endpoint-testing                   AGENT   PASS      6         0       
```

You can filter by type in the dashboard:
```bash
checkmate watch --type AGENT  # Show only Agent specs
checkmate watch --type USER   # Show only User specs
```

## New Features

### Auto-file discovery (no clutter in spec)

Behind the scenes, every spec can keep a hidden `meta:` block:

```yaml
meta:
  files_auto: true
  file_hashes:
    - src/lead-finder/IssuesSearch.tsx: "a1b2..."
    - app/api/github/searchIssues/route.js: "c3d4..."
```

When `files_auto: true` is enabled, the file list is automatically refreshed on every run using:
- Embeddings-based similarity matching
- Import-map tracing 

This keeps your Markdown specs clean and focused on requirements:

```md
# Lead Finder – Find by Issues
- [ ] With keyword "openai" call GitHub Issues API
- [ ] Render title, state, url
```

No manual path copying or updates needed. The right files are automatically detected and tracked.

### Repository Warming (one-shot spec generation)

The `warmup` command scans your entire codebase and suggests specs:

```bash
# Scan repo and suggest specs
checkmate warmup
```

This command:
1. Analyzes all code files in your repository
2. Groups files by domain/functionality
3. Suggests feature specs for each group
4. Outputs JSON that can be reviewed and saved

Once you've reviewed the suggestions:

```bash
# Save the approved specs
checkmate save --json '<json-output>'
```

### Ambiguity Resolution with Clarify

When a requirement fails and you're not sure if you should fix the code or update the spec:

```bash
# Get AI analysis of why a requirement is failing
checkmate clarify user-auth --bullet 3
```

This command:
1. Analyzes the failing requirement
2. Determines if the issue is with code or spec
3. Suggests specific changes to make

The output indicates whether you should "edit-spec" or "fix-code" with a clear explanation.

### 🔥 First‑time magic

```bash
# scan repo, draft specs, open approval UI in Cursor
checkmate warmup
```

Approve or edit the suggestions, then run:

```bash
checkmate run    # green = baseline locked in
```

Now every Cursor task auto‑checks itself against those specs—no extra commands.

### CheckMate Test Script (cts) Mini-DSL

The new Mini-DSL for agent specs allows you to write tests in a much simpler syntax:

```
http GET /api/todos => 200 AS resp
assert resp.body.length >= 1
db todo.count => >= 1
```

**Verbs**

| Verb | Usage |
|------|-------|
| `http GET/POST` | Test endpoints (`WITH {json}` payload) |
| `db`            | Query DB helpers (`todo.count`, `todo.find`) |
| `file`          | File existence or content checks |
| `exec`          | Shell command check |
| `assert`        | Raw JS boolean expression |

Use `AS var` to capture a response for later assertions. The runner stops at first failure and surfaces the exact line.

### Hybrid Specifications

You can now embed test code directly inside Markdown specs for a hybrid approach that combines the readability of Markdown with the precision of executable tests.

```md
- [ ] User can create a new todo item

```checkmate
http POST /api/todos WITH {"title":"test todo"} => 201 AS resp
assert resp.body.title == "test todo"
```
```

Convert a regular Markdown spec to hybrid format:

```bash
checkmate hybridize --spec user-todo-list
```

### Interactive Mode for Spec Generation

Generate specs interactively with the `-i` flag:

```bash
checkmate gen -i "Find by Issues and by Repositories"
```

This opens an interactive workflow that:
1. Shows detected features and confidence levels
2. Displays relevant files
3. Lets you approve, edit, or delete each feature
4. Allows file selection for each feature

### Interactive Spec Generator (ISG)

For a more streamlined workflow, CheckMate offers a dedicated draft-review-save approach:

```bash
# Generate draft specs without writing to disk
checkmate draft "Lead Finder features" --context 50 --return md
```

This outputs JSON that can be reviewed and edited before saving:

```json
[
  {
    "slug": "lead-finder-issues",
    "title": "Lead Finder – Find by Issues",
    "files": ["components/lead-finder/IssuesSearch.tsx"],
    "checks": [
      "With keyword 'openai' call GitHub Issues API",
      "Render issue.title, state, url in table"
    ]
  }
]
```

Once you've reviewed and edited the drafts, save them with:

```bash
checkmate save --json '<edited-json>' --format md
```

This two-stage process (`draft` → `save`) is ideal for integration with Cursor, where:
1. **Draft**: CheckMate generates potential specs as JSON
2. **Review**: The user can accept, edit, or discard each spec
3. **Save**: Only approved specs are written to disk

Each saved file includes a footer showing it was generated via the interactive flow:
```md
<!-- generated via checkmate interactive v0.4 -->
```

### Semantic Context Building

Context building now uses embeddings for better file relevance, combining:
- 60% semantic similarity (embeddings)
- 40% keyword matching (TF-IDF style)

This greatly improves file selection in large repos.

### Automatic Rename Detection

The new `snap` command handles file renames to prevent specs from turning red after refactoring:

```bash
# Detect renames
checkmate snap --detect

# Interactively repair specs
checkmate snap --repair

# Auto-repair all specs
checkmate snap --repair --auto
```

This works by comparing file content hashes and is especially helpful after major refactors.
