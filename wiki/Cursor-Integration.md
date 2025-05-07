# Cursor Integration

CheckMate integrates seamlessly with Cursor to provide automated validation during your development workflow. This guide explains how to set up and use CheckMate with Cursor.

## Cursor Rules for Automation

When you initialize CheckMate with `checkmate init`, it automatically creates rule files in the `.cursor/rules/` directory that automate validation during your development workflow:

* `pre-task.mdc` - Runs before coding to identify affected specs
* `post-task.mdc` - Verifies specs after coding is complete
* `post-push.mdc` - Runs regression tests before pushing to main

These rules execute the following commands:

```yaml
pre-task:
  # CheckMate – Scope & Reset
  - Scope analysis:
    - Execute: checkmate affected --json > .cursor/cm_list.json
  - Reset automatic‑fix counter:
    - SetEnv: CM_FIX_COUNT=0

post-task:
  # CheckMate – Verify & Auto‑Fix
  - Execute: node scripts/cm-enforce.js run \
             --target "$(jq -r '.[]' .cursor/cm_list.json)" \
             --fail-early
  - Env:
      CM_MAX_FIXES: 5
      CM_FIX_COUNT: $CM_FIX_COUNT

post-push:
  # CheckMate – Full Suite on Push
  - Execute: node scripts/cm-enforce.js run
```

This creates an automated workflow:
* Before a task, CheckMate identifies which specs might be affected
* After a task, it verifies those specs pass with retry capability
* Before pushing code, it ensures all specs pass

You can view and modify these rules in `.cursor/rules/` or in `.cursor/config.yaml` if you prefer YAML format.

## Hardened Enforcement

CheckMate uses a robust enforcement mechanism to ensure specs truly pass before Cursor marks a task as complete:

### Key Features

1. **Bulletproof Exit Codes** - The `cm-enforce.js` script ensures non-zero exit codes for any failures, which forces Cursor to stay in the "fixing" state.

2. **Fail-Early Mode** - The `--fail-early` flag makes tests stop at the first failure, allowing the AI to focus on fixing one issue at a time.

3. **Automatic Fix Attempts** - The system tracks fix attempts with the `CM_FIX_COUNT` environment variable, preventing infinite loops.

4. **Configurable Retry Budget** - You can configure maximum automatic fix attempts in your `.checkmate` file:
   ```yaml
   auto_fix:
     max_attempts: 5  # Default value
   ```

5. **Machine-Readable Markers** - Special markers like `[CM-PASS]` and `[CM-FAIL]` provide clear signals to Cursor.

### How It Works

1. Before tasks begin, the `pre-task.mdc` rule resets the fix counter to zero.
2. When running validations, the `cm-enforce.js` script:
   - Runs CheckMate with your specified options 
   - On success, resets the fix counter and exits with code 0
   - On failure, increments the fix counter and exits with code 1
   - When max attempts are reached, exits with code 2 to indicate human intervention is needed

This system guarantees that Cursor cannot mark a task as "Done" until all specs pass or the system explicitly asks for human help.

## Visual Task Indicators

CheckMate provides clear visual indicators when tasks are running in Cursor:

Each task type has a distinct visual style:

| Task Type  | Visual Indicator                       | Description                                   |
|------------|---------------------------------------|-----------------------------------------------|
| pre_task   | 🔍 **SCOPE ANALYSIS** (blue border)   | Analyzes which specs will be affected by changes |
| post_task  | ✓ **VERIFICATION** (green border)     | Verifies that affected specs pass after changes |
| post_push  | 🚀 **REGRESSION TEST** (red border)   | Ensures all specs pass before pushing to main |

These visual indicators make it immediately obvious when CheckMate is running tasks in Cursor.

## MCP Integration (Middleware Control Protocol)

For deeper integration with Cursor AI, CheckMate can be used as a Middleware Control Protocol (MCP) server, creating a seamless TDD experience directly in your editor.

### Setting Up MCP

The easiest way to set up CheckMate MCP is with the built-in setup command:

```bash
# Run the automated setup
npx checkmate setup-mcp
```

This will create or update your `.cursor/config.json` file with the necessary MCP configuration.

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

### Using CheckMate with Cursor AI

Once set up, you can use natural language prompts to drive your TDD workflow:

Just type a task description in Cursor AI like:

> **"Build a todo list app"**

The CheckMate MCP will:
- Generate a spec (`checkmate gen`)
- Let Cursor write code to implement it
- Run the checklist (`checkmate run`)
- Block "Done" if any line fails

### Creating Specs from Cursor

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

### Testing Your MCP Setup

Verify your AI configuration with:

```bash
npx checkmate status
```

This will test your OpenAI API connection with both models and display the results.

## Workflow Example

Here's a typical workflow using CheckMate with Cursor:

1. Tell Cursor what you want to build:
   > "Create a user profile page with edit functionality"

2. Cursor uses CheckMate to generate a spec:
   ```
   Feature: user-profile-edit
     [ ] Display current user data in form
     [ ] Validate email format
     [ ] Save changes to API
     [ ] Show success message
   ```

3. Cursor implements the code based on the spec

4. When you finish, CheckMate runs verification automatically:
   ```
   Feature: user-profile-edit
     ✓ Display current user data in form
     ✓ Validate email format
     ✓ Save changes to API
     ✓ Show success message
   ```

5. Cursor marks the task as "Done" since all checks passed

If any check fails, you'll see:
- Which requirement failed
- Why it failed
- Suggestions to fix it

## Next Steps

- [Command Reference](Command-Reference.md) - Learn all available commands
- [Advanced Features](wiki/Advanced-Features.md) - Learn about power user features
- [Spec Types](wiki/Spec-Types.md) - Understanding User Specs vs Agent Specs 