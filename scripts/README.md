# CheckMate Scripts

This directory contains various utility scripts for CheckMate.

## Cursor Integration

The `cm-enforce.js` script serves as a critical wrapper for CheckMate to ensure accurate reporting of test results to Cursor IDE. It:

- Forwards stdio so you still see the banner/table
- Inspects the run status
- If status ≠ 0 → prints "[CM-FAIL] ..." and exits with code 1
- If status = 0 → prints "[CM-PASS] ..." and exits with code 0

### Usage in Cursor Rules

When creating Cursor rules, always use the wrapper script instead of calling CheckMate directly:

```yaml
Execute: node scripts/cm-enforce.js run --target "$CM_LIST" --fail-early
```

This ensures that Cursor can reliably detect when tests pass or fail.

### 🔍 Checking the Health of One Spec

You have two built-ins:

| What you want                                                                        | Command                                                      | What you'll see                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Quick glance** – pass / fail counts, no execution                                  | `checkmate status --spec cursor-integration`                 | `cursor-integration  ✔ 3 / ✖ 1`                                             |
| **Full re-run** – execute every bullet, prints CM-PASS/FAIL & exits with proper code | `node scripts/cm-enforce.js run --target cursor-integration` | Same coloured table the shim already shows, plus `[CM-PASS]` or `[CM-FAIL]` |

#### Flags you can add

```
--json            # machine-readable summary
--fail-early      # stop at first red bullet
--quiet           # suppress banner (good for CI logs)
```

Example:

```bash
node scripts/cm-enforce.js run --target cursor-integration --fail-early --json
```

returns

```json
{
  "status": "FAIL",
  "exitCode": 1
}
```

### 📋 When to Update a Spec Instead of the Code

*If the feature's behaviour really changed* → run:

```bash
checkmate edit cursor-integration   # opens $EDITOR
```

Save, then commit the spec **before** asking Cursor to modify code.
That keeps spec changes explicit and reviewable.

After editing a spec, update the snapshot:

```bash
node scripts/spec-snapshot.js create
```

## Safeguards for Spec Changes

To maintain the integrity of CheckMate specifications, implement these safeguards:

### 1. Protect Spec Directory During Code Tasks

- Specs should be treated as read-only during code implementation tasks
- Implement a pre-task rule that saves a hash of each spec file
- Implement a post-task rule that verifies no spec files were changed

### 2. Require Dedicated Tasks for Spec Updates

- Create a dedicated task type (e.g., `update-spec`) for modifying specs
- Follow a workflow: generate/update spec → run suite → begin new code implementation task

### 3. Prevent Trivial Test Bypassing

CheckMate now detects and warns about:
- Empty specs (zero checks)
- Trivial test assertions (just returning true)

This is configured in `.checkmate`:

```yaml
lint:
  empty_checks: error        # fail when a spec has no meaningful bullets
  trivial_assert: error      # fail when test block contains only literals
```

### 4. Implement Verification Mechanisms

The `spec-snapshot.js` script manages checksums of spec files:

```bash
# Create initial snapshot or update after intentional changes
node scripts/spec-snapshot.js create

# Verify no unauthorized changes have been made
node scripts/spec-snapshot.js verify

# Show which files changed from snapshot
node scripts/spec-snapshot.js diff
```

### TL;DR for Day-to-Day

1. **During a task:**
   Cursor calls `node scripts/cm-enforce.js run --target "$CM_LIST"` – it will tell you immediately if that spec still fails.

2. **Ad-hoc check:**
   `checkmate status --spec your-slug` → quick pass/fail counts.

3. **Need detail:**
   Re-run via the shim; scroll to the first red bullet; fix code; repeat until `[CM-PASS]`.

No more guesswork, and no more silently "passing" by neutering the spec.

## Anti-Patterns to Avoid

- **Never** create scripts that artificially mark tests as passing
- **Never** modify spec files to make tests pass instead of implementing required functionality
- **Never** override test functions to force passing results

Remember: The purpose of CheckMate is to verify actual implementation of requirements, not to tick boxes.

## Cursor Integration Scripts

### cursor-checkmate.js

A utility script for integrating CheckMate with Cursor's automation features.

### cursor-task-wrapper.js

A wrapper script for Cursor tasks that need to invoke CheckMate functionality.

## MCP Integration

CheckMate's MCP (Machine Communication Protocol) integration supports standard markers for success and failure states:

- `[CM-PASS]` - Indicates that all requirements have passed
- `[CM-FAIL]` - Indicates that one or more requirements have failed
- `[CM-WARN]` - Indicates a warning state that doesn't necessarily constitute failure

## Setting Up Cursor Integration

1. Configure Cursor to use the cm-enforce.js script:

   Add to your `.cursor/config.json`:
   ```json
   {
     "mcpServers": {
       "checkmate": {
         "command": "node",
         "args": [
           "dist/mcp/index.js"
         ],
         "env": {
           "CHECKMATE_MODEL_REASON": "your-model-here",
           "CHECKMATE_MODEL_QUICK": "your-model-here"
         }
       }
     }
   }
   ```

2. Use `--cursor` flag with commands to get machine-readable output:
   ```bash
   npx checkmate warmup --cursor
   ``` 