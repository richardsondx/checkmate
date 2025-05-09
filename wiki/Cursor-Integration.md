# CheckMate Cursor Integration

CheckMate is designed for deep integration with AI coding assistants like Cursor. This document explains how to use CheckMate effectively with Cursor AI.

## Key Integration Rule

The primary integration happens through the `checkmate-feature-validation-workflow.mdc` rule, located in the `.cursor/rules/` directory. 

This rule is triggered when you ask Cursor to work on a feature using CheckMate. It orchestrates the TDD loop by:

1. Calling `checkmate list-checks` to provide Cursor with a checklist for the specified feature
2. Instructing Cursor to define success/failure conditions, verify/implement code, and report outcomes
3. Guiding Cursor to use `checkmate verify-llm-reasoning` to validate its assessments

## LLM-Driven TDD Workflow

Here's how the workflow unfolds in detail:

1. **Initiate the workflow:**
   Type in Cursor: `/@checkmate-tdd user-password-reset`

2. **CheckMate provides check items to Cursor:**
   ```
   📋 Retrieving check items from spec: checkmate/specs/user-password-reset.md
   🔍 Found check items to validate:
   🧪 Check #1: System generates a unique, single-use password reset token
   🧪 Check #2: User receives an email with a link containing the reset token
   🧪 Check #3: Clicking the link allows the user to set a new password
   🧪 Check #4: The reset token is invalidated after use or expiration
   ```

3. **CheckMate gives Cursor these instructions:**
   ```
   📝 INSTRUCTIONS FOR CURSOR:
   ---
   1. For each check item above, you must:
      a. Define explicit success and failure conditions
      b. Examine the codebase (or write it if it doesn't exist) to verify if it meets your conditions
      c. Report your findings as an outcome report
      d. Call `checkmate verify-llm-reasoning` to validate your reasoning
      
   2. Example usage:
      `checkmate verify-llm-reasoning --spec user-password-reset --check-id 1 \
         --success-condition "A cryptographically secure unique token is generated and stored with an expiry." \
         --failure-condition "Token is predictable, not unique, or has no expiry." \
         --outcome-report "Observed UUID v4 generation for token and a 1-hour expiry in token_service.js."`
         
   3. Continue until all checks have been verified
   ---
   ```

4. **Cursor implements/verifies code for each check**
   For each check item, Cursor will:
   - Define success and failure conditions
   - Examine or implement code
   - Report its findings
   - Call verify-llm-reasoning to validate its reasoning

5. **CheckMate responds to Cursor:**
   When a check passes:
   ```
   ✅ Logical verification PASSED for check "System generates a unique, single-use password reset token"
   ✅ Spec "user-password-reset.md" has been updated, check marked as [✓]
   ```

   If verification fails:
   ```
   ❌ Logical verification FAILED for check "Password is hashed using bcrypt"
   ❌ Reason: The outcome report states SHA256 was used, which does not meet the success condition of using bcrypt.
   ```

   Cursor uses this feedback to refine its implementation or assessment.

## Sample Cursor Prompts

Beyond the main workflow, you can use these prompts in Cursor:

### Get a list of features
```
What features are tracked by CheckMate?
```
(Cursor may run `checkmate features`)

### Create a new spec
```
Create a CheckMate spec for a feature that allows users to upload profile pictures.
```
(Cursor may run `checkmate gen "..."`)

### Get help for a failing check
```
The second check for 'profile-picture-upload' is unclear. Can CheckMate clarify it?
```
(Cursor may run `checkmate clarify profile-picture-upload --bullet 2`)

## Available Rules

CheckMate's Cursor integration includes several rules in the `.cursor/rules/` directory:

- `checkmate-feature-validation-workflow.mdc` - Primary TDD workflow
- `checkmate-spec-creator.mdc` - Helps create new specs
- `checkmate-spec-fixer.mdc` - Assists in fixing failing checks

## Command Reference for Cursor Integration

These commands are commonly used with Cursor:

| Command | Description |
|---------|-------------|
| `checkmate list-checks <spec>` | Lists all check items for a specification |
| `checkmate verify-llm-reasoning --spec <spec> --check-id <id> ...` | Validates an LLM's reasoning about a check item |
| `checkmate status <spec>` | Shows the current status of all checks for a spec |
| `checkmate clarify <spec> --bullet <id>` | Gets AI explanation for a failing/unclear check |

## Setting Up Cursor Integration

1. Install CheckMate in your project
2. Run `npx checkmate init` to create necessary rule files
3. Configure API keys in your `.checkmate` file
4. Start the TDD workflow with `/@checkmate-tdd <feature-slug>`

## Other Useful Commands via Cursor

You can ask Cursor to use other CheckMate commands:

-   **List Features**: `"What CheckMate features exist in this project?"` (LLM runs `checkmate features`)
-   **Create Spec**: `"Create a CheckMate spec for login rate limiting."` (LLM runs `checkmate gen "..."`)
-   **Get Status**: `"What's the current status of the 'login-rate-limiting' spec?"` (LLM runs `checkmate status --target login-rate-limiting`)
-   **Clarify Check**: `"Help me understand check #3 for 'login-rate-limiting'."` (LLM runs `checkmate clarify login-rate-limiting --bullet 3`)

## Customizing Cursor Rules

The `.cursor/rules/` directory contains the integration logic. You can customize these `.mdc` files, although the default `checkmate-feature-validation-workflow.mdc` provides the core TDD loop.

Other potential rules might automatically run `checkmate status` after certain commands, but the LLM-TDD workflow is the primary intended integration.

## Cursor Rules for Automation

When you initialize CheckMate with `checkmate init`, it automatically creates rule files in the `.cursor/rules/` directory that automate validation during your development workflow:

### Task Lifecycle Rules

* `pre-task.mdc` - Runs before coding to identify affected specs
* `post-task.mdc` - Verifies specs after coding is complete
* `post-push.mdc` - Runs regression tests before pushing to main

### Validation and Format Rules

* `checkmate-spec-drift.mdc` - Audits changed specs after commits
* `checkmate-spec-drift-on-save.mdc` - Checks for drift when saving code files
* `checkmate-spec-format.mdc` - Validates spec format on save
* `checkmate-non-interactive.mdc` - Ensures headless operation of commands

The main task lifecycle rules execute the following commands:

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
* During development, it validates specs and checks for drift to keep everything in sync

You can view and modify these rules in `.cursor/rules/` directory.

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

## Cursor Rules

CheckMate integrates with Cursor through several rule files that enhance and automate the workflow. These rules are created in the `.cursor/rules/` directory during initialization.

### Available Rules

| Rule File | Purpose |
|-----------|---------|
| `checkmate-non-interactive.mdc` | Makes CheckMate commands run in non-interactive mode when executed through Cursor |
| `checkmate-spec-format.mdc` | Ensures proper spec formatting |
| `checkmate-spec-drift.mdc` | Detects when specs drift from implementation |
| `checkmate-spec-drift-on-save.mdc` | Checks for spec drift when files are saved |
| `pre-task.mdc` | Runs before a task starts |
| `post-task.mdc` | Runs after a task completes |
| `post-push.mdc` | Runs after pushing changes |
| `audit-after-fix.md` | Runs audit after fixing code |

### Command Transformations

The `checkmate-non-interactive.mdc` rule automatically transforms CheckMate commands to run in non-interactive mode when executed by Cursor:

```
# Example transformations
checkmate gen "Feature description" → checkmate gen "Feature description" --yes --non-interactive --answer y
checkmate run → checkmate run --yes --non-interactive
```

This ensures that AI assistants can use CheckMate commands without getting stuck waiting for user input. 