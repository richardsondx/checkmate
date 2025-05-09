# Cursor Integration with CheckMate

CheckMate is designed for deep integration with AI coding assistants like Cursor, enabling a powerful LLM-driven Test-Driven Development (TDD) workflow.

## Core Concept: LLM-Driven TDD

Instead of CheckMate running tests itself, the LLM (Cursor) drives the verification process. CheckMate acts as a collaborator by:
1.  **Providing the Checklist**: Giving the LLM the specific requirements (checks) from a spec file.
2.  **Validating Reasoning**: Checking if the LLM's self-assessment of whether a check passes or fails is logically sound based on the LLM's own criteria and findings.

## Key Commands for Integration

-   `checkmate list-checks --spec <slug>`: Retrieves the checks for a feature, assigning positional IDs (1, 2, 3...). Crucial for feeding the LLM the list of tasks.
-   `checkmate verify-llm-reasoning --spec <slug> --check-id <id> ...`: The core validation step. The LLM provides its success/failure conditions and outcome report for a check, and CheckMate verifies the logic.

## The Primary Integration Rule: `checkmate-feature-validation-workflow.mdc`

This rule, automatically created in `.cursor/rules/` when you run `checkmate init`, orchestrates the TDD loop within Cursor.

### How it Works:

1.  **Trigger**: You initiate the workflow by telling Cursor to work on a feature using a specific command pattern, typically `/@checkmate-tdd <feature-slug>` or `/checkmate-tdd <feature-slug>`.

2.  **Rule Activation**: The pattern matches, and the `.mdc` rule script executes.

3.  **Check Retrieval**: The script calls `checkmate list-checks --spec <feature-slug> --format json --quiet` to get the checks for the specified feature.

4.  **LLM Instruction**: The script parses the JSON output and presents the list of checks (with their positional IDs) to the LLM (Cursor). It also provides detailed instructions on how the LLM should proceed:
    *   Iterate through each check ID.
    *   For each check:
        *   Define explicit **Success Conditions (SC)**.
        *   Define explicit **Failure Conditions (FC)**.
        *   Implement or verify the code related to the check.
        *   Formulate a concise **Outcome Report (OR)** summarizing the findings.
        *   Call `checkmate verify-llm-reasoning` with the spec slug, check ID, SC, FC, and OR.

5.  **LLM Execution Loop**: Cursor (the LLM) now takes over, following the instructions:
    *   It focuses on Check #1.
    *   Defines SC/FC.
    *   Writes/reviews code.
    *   Creates an OR.
    *   Invokes `checkmate verify-llm-reasoning --spec <slug> --check-id 1 --success-condition "..." ...`.

6.  **Reasoning Validation & Feedback**: CheckMate runs its AI validation:
    *   If the reasoning is **PASS**: CheckMate updates the spec file (marks check #1 as passed `[x]`) and informs the LLM. The LLM moves to Check #2.
    *   If the reasoning is **FAIL**: CheckMate updates the spec file (marks check #1 as failed `[✖]`), provides the failure reason from the validation model, and informs the LLM. The LLM uses this feedback to potentially revise its SC/FC, re-evaluate the code, update its OR, and call `verify-llm-reasoning` again for check #1.

7.  **Completion**: The loop continues until all checks for the feature spec have received a PASS from `verify-llm-reasoning`.

## Sample Cursor Prompts for TDD Workflow

**Initiate TDD:**

> `/@checkmate-tdd user-profile-editing`

*(Cursor will then execute the rule, call `list-checks`, and begin the iterative process)*

**Example Interaction (LLM calling CheckMate):**

*(After processing Check #2 for `user-profile-editing`)*
> ```bash
> checkmate verify-llm-reasoning --spec user-profile-editing --check-id 2 \
>   --success-condition "User can update their display name and it persists in the database" \
>   --failure-condition "Update fails or does not persist" \
>   --outcome-report "Modified user model save method; test confirmed database update via GET request"
> ```

**Example CheckMate Feedback to LLM (Failure):**

> `❌ Logical verification FAILED for check "User display name updates persist"`
> `❌ Reason: The outcome report confirms the save method was modified but does not explicitly confirm the *persistence* was checked via a subsequent read/GET request, only that the update *endpoint* was likely called.`

*(Cursor should now re-evaluate based on the feedback - perhaps by adding a specific database read to its verification step and updating the outcome report).* 

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