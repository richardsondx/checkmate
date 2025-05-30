# Advanced Features

CheckMate includes several advanced features for power users that can enhance your workflow and make your specs more maintainable.

## Auto-File Discovery

Behind the scenes, every spec can keep a hidden `meta:` block that automatically tracks relevant files:

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

To enable auto-file discovery:

```bash
# For a specific spec
checkmate auto --spec user-auth

# For all specs
checkmate auto --all
```

## Warmup Command for Repository Analysis

The `warmup` command scans your entire codebase and suggests specs:

```bash
# Interactive Mode (default)
checkmate warmup

# Quick Mode (save all specs automatically)
checkmate warmup --yes
```

This command:
1. Analyzes all code files in your repository
2. Groups files by domain/functionality
3. Suggests feature specs for each group
4. Presents an interactive interface to select which specs to save
5. Automatically saves selected specs and copies slugs to clipboard

### Warmup Command Options

| Option | Description |
|--------|-------------|
| `--yes`, `-y` | Skip interactive mode and save all specs automatically |
| `--output yaml\|json\|table` | Choose output format (default: yaml) |
| `--quiet`, `-q` | Suppress banner and progress indicators |
| `--debug` | Show debug information including file hashes |
| `--top-files N` | Number of top files to include (default: 100) |
| `--model NAME` | Specify model to use for analysis |

## Ambiguity Resolution with Clarify

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

## Semantic Context Building

Context building uses embeddings for better file relevance, combining:
- 60% semantic similarity (embeddings)
- 40% keyword matching (TF-IDF style)

This greatly improves file selection in large repos.

## Automatic Rename Detection

The `snap` command handles file renames to prevent specs from turning red after refactoring:

```bash
# Detect renames
checkmate snap --detect

# Interactively repair specs
checkmate snap --repair

# Auto-repair all specs
checkmate snap --repair --auto
```

This works by comparing file content hashes and is especially helpful after major refactors.

## Interactive Mode for Spec Generation

Generate specs interactively with the `-i` flag:

```bash
# Generate a regular markdown spec interactively
checkmate gen -i "Find by Issues and by Repositories"

# Generate an agent spec (YAML) interactively
checkmate gen -i "Find by Issues and by Repositories" --agent
```

This opens an interactive workflow that:
1. Shows detected features and confidence levels
2. Displays relevant files
3. Lets you approve, edit, or delete each feature
4. Allows file selection for each feature

## Interactive Spec Generator (ISG)

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

## Outline Command

The `outline` command generates a high-level overview of functionality in your codebase:

```bash
# Generate outline for the whole project
checkmate outline

# Generate outline for specific files
checkmate outline --files src/components/auth/*
```

This provides immediate feedback about what your code does without having to read through it manually. It's especially useful when:

- You're new to a codebase and need to understand its structure
- You want to check if the implementation matches your mental model
- You need to create specs for existing functionality

## Token Usage Tracking and Statistics

CheckMate includes built-in telemetry to track token usage and associated costs across sessions. This helps you monitor AI model usage and estimate expenses.

### Viewing Token Usage Statistics

Use the `stats` command to display token usage information:

```bash
# Show stats for current session
checkmate stats

# Show stats for all sessions
checkmate stats --all

# Show stats for the last 24 hours
checkmate stats --since 24h

# Show stats for a specific session ID
checkmate stats --session <session-id>

# Get output in JSON format for scripting
checkmate stats --json
```

Example output:

```
📊 CheckMate Token Usage Statistics

Period: Current session

┌─────────────────────────┬──────────────┬───────────────┬──────────────┬───────────┐
│ Model                   │ Input Tokens │ Output Tokens │ Total Tokens │ Est. Cost │
├─────────────────────────┼──────────────┼───────────────┼──────────────┼───────────┤
│ openai/gpt-4o           │ 5,234        │ 1,267         │ 6,501        │ $0.0650   │
│ anthropic/claude-3-haiku│ 3,125        │ 876           │ 4,001        │ $0.0100   │
├─────────────────────────┼──────────────┼───────────────┼──────────────┼───────────┤
│ TOTAL                   │ 8,359        │ 2,143         │ 10,502       │ $0.0750   │
└─────────────────────────┴──────────────┴───────────────┴──────────────┴───────────┘

Total tokens: 10,502
Estimated cost: $0.0750
```

Time filter options for `--since`:
- Hours: `1h`, `24h`
- Days: `1d`, `7d`, `30d`
- Weeks: `1w`, `2w`
- Months: `1m`, `3m`

### Telemetry Data Storage

All telemetry data is stored locally in the `.checkmate-telemetry/` directory, which is automatically added to `.gitignore` during initialization.

## Utility Scripts Management

CheckMate includes several utility scripts that help with various tasks like enforcing spec checks, detecting drift, and managing spec formats. These scripts are located in the `scripts/` directory of the CheckMate installation.

### Running Utility Scripts

Instead of running these scripts directly with Node.js (which can lead to path resolution issues), CheckMate provides a dedicated command to execute them:

```bash
# General syntax
checkmate run-script <script-name> [arguments...]

# Examples:
checkmate run-script cm-enforce run --target my-feature
checkmate run-script validate-spec-format checkmate/specs/user-auth.md --fix
checkmate run-script cm-spec-drift path/to/changed/file.js
```

This command ensures that:
1. The correct script from the CheckMate package is found and executed
2. Proper paths are maintained regardless of where CheckMate is installed
3. Scripts run with consistent environment variables and context

### Key Utility Scripts

The most commonly used utility scripts include:

| Script Name | Purpose | Example |
|-------------|---------|---------|
| `cm-enforce.js` | Runs CheckMate checks with auto-fix capabilities | `checkmate run-script cm-enforce run --target user-auth` |
| `validate-spec-format.js` | Validates and fixes spec formatting | `checkmate run-script validate-spec-format my-spec.md --fix` |
| `cm-spec-drift.js` | Detects potential drift between code and specs | `checkmate run-script cm-spec-drift src/auth.js` |

### Benefits Over Direct Script Execution

Using `checkmate run-script` instead of direct `node scripts/...` calls provides several advantages:

1. **Path Independence**: Works regardless of where CheckMate is installed (global, local, or as a dependency)
2. **Version Consistency**: Always uses the correct script version matching your CheckMate installation
3. **Improved Error Handling**: Provides helpful error messages if scripts are missing or malformed
4. **Environment Setup**: Ensures scripts run with the proper CheckMate environment variables

This command is especially useful in CI/CD environments, in projects using CheckMate as a dependency, and when using Cursor rules that need to call CheckMate scripts.

## Next Steps

- [Command Reference](Command-Reference.md) - Learn all available commands
- [Spec Types](wiki/Spec-Types.md) - Understanding User Specs vs Agent Specs
- [Cursor Integration](wiki/Cursor-Integration.md) - Configure Cursor integration 