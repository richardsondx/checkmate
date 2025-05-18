# CheckMate ⬜️⬛️⬜️ | [![Star on GitHub](https://img.shields.io/github/stars/richardsondx/checkmate?style=social)](https://github.com/richardsondx/checkmate/stargazers)

By [@Richardsondx](https://x.com/richardsondx)

[![CheckMate Demo](https://img.youtube.com/vi/A2sqyblVxZk/0.jpg)](https://youtu.be/A2sqyblVxZk)


AI-powered specs verification that block bad code, see through hallucination, and prevent AI from breaking your code.

CheckMate is an AI Test Driven Development tool that challenges AI's overconfidence with a logical reasoning verification process using LLM.

It's built with Cursor AI in mind.

## Requirements

CheckMate works best with both API keys:

- **OpenAI API Key**: Required for GPT models (default `quick` verifier)
- **Anthropic API Key**: Required for Claude models (default `reason` generator)

## Quick Setup

```bash
# Install globally
npm install -g checkmateai

# Initialize in your project
npx checkmateai init
```

That's it! `checkmate init` takes care of everything - creating directories, config files, and setting up Cursor integration.

It will setup your app and generate a checkmate rules folder with all the necessary rules:
   These rules will include:
   - pre-task.mdc - Runs before each task
   - post-task.mdc - Runs after each task
   - post-push.mdc - Runs after each push
   - spec-assistant.mdc - Helps with spec creation and format guidance
   - spec-linter.mdc - Automated linting and fixing of spec files
   - verification-trigger.mdc - Triggers feature verification workflow
   - autofix-enforcer.mdc - Enforces auto-fix attempts on failures
   - drift-detector.mdc - Detects spec-vs-code drift
   - non-interactive-mode.mdc - For headless CheckMate runs
   - ai-feature-validation-guidelines.mdc - Instructional guide for AI validation
   - ai-verify-llm-reasoning-workflow-docs.mdc - Documentation for LLM reasoning workflow


After initialization, add your API keys to the auto-generated `.checkmate` file:

```yaml
openai_key: sk-****      # Your OpenAI API key 
anthropic_key: sk-ant-**** # Your Anthropic API key
```

For detailed explanations of what happens during initialization or for manual setup instructions, see the [Initialization Process](wiki/Initialization-Process.md) guide.

## MCP Integration

CheckMate can be set up as a Middleware Control Protocol (MCP) server for deep Cursor AI integration, enabling a seamless TDD experience directly in your editor:

```bash
# Set up the MCP integration automatically
npx checkmate setup-mcp
```

This creates or updates your `.cursor/config.json` file with the necessary MCP configuration:

```json
{
  "mcpServers": {
    "checkmate": {
      "command": "node",
      "args": [
        "dist/mcp/index.js"
      ],
      "env": {}
    }
  }
}
```

The MCP server automatically reads configuration values (including API keys and model preferences) directly from your `.checkmate` file, eliminating redundant configuration and potential inconsistencies.

With MCP integration:
- Simply describe what you want to build in Cursor ("Build a login form")
- CheckMate automatically generates specs and runs checks
- Cursor implements the code against the generated requirements
- Checks are verified to ensure the implementation matches the specification

For detailed MCP configuration options, see the [Cursor Integration Guide](wiki/Cursor-Integration.md).

## Configuration

CheckMate uses your local `.checkmate` file for configuration. This file is never committed to version control (it's automatically added to `.gitignore`).

While you can run with just one key, the recommended configuration uses both:

```yaml
# In .checkmate file
openai_key: sk-****      # Your OpenAI API key 
anthropic_key: sk-ant-**** # Your Anthropic API key
```

CheckMate uses each model for different purposes:
- **Claude models** (Anthropic): Primarily used for spec generation and detailed reasoning (`reason`)
- **GPT models** (OpenAI): Primarily used for quick requirement verification (`quick`)

This dual-model approach ensures:
1. Higher quality spec generation (Claude excels at reasoning)
2. Faster verification cycles (GPT models are typically quicker)
3. Cost optimization (using the right model for each task)

### Additional Configuration Options

```yaml
# Model selection
models:
  reason: claude-3-7-sonnet-20250219  # For spec generation (complex reasoning)
  quick: gpt-4o-mini                  # For requirement verification (faster)

# File discovery
tree_cmd: "git ls-files | grep -E '\\.(ts|js|tsx|jsx)$'"
context_top_n: 40  # Top relevant files to include

# Behavior settings
protect_specs: true  # Detect spec tampering
auto_fix:
  max_attempts: 5    # Auto-fix attempts before human intervention

# See wiki/Configuration-Guide.md for complete options
```

For full configuration details, see the [Configuration Guide](wiki/Configuration-Guide.md).

### Environment Variables

Instead of storing API keys in the `.checkmate` file, you can use environment variables:

```bash
# Add to your .env file or set in your shell
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

CheckMate will automatically detect and use these environment variables if present.

### AI Integration and Token Usage

CheckMate supports both User Specs (Markdown) and Agent Specs (YAML) that work together to validate your code. Learn more about when to use each in the [Spec Types Guide](wiki/Spec-Types.md).

#### AI Operations and Token Usage

CheckMate strategically uses AI for specific operations to balance quality and cost:

| Operation | Model Used | Token Usage | When It Happens |
|-----------|------------|-------------|-----------------|
| **Spec Generation** | `reason` (claude-3-sonnet) | High | Only when you run `gen`, `draft`, or `warmup` commands |
| **Requirement Verification** | `quick` (gpt-4o-mini) | Medium | During `status` and `verify` operations |
| **Clarification** | `reason` (claude-3-sonnet) | Medium-High | Only when explicitly using `clarify` command |

#### Cost Optimization Features

CheckMate includes several features to minimize API costs:

- **Smart Caching**: Results are cached in `.checkmate/cache/` to avoid redundant API calls
- **File Hashing**: Only re-verifies requirements when files actually change
- **Selective Execution**: Commands like `affected` only check specs related to changed files
- **Token Usage Tracking**: Run `checkmate stats` to monitor your API usage and costs

You can also swap models to control costs:
```bash
# Use a cheaper model for quick verifications
checkmate model set quick gpt-3.5-turbo

# Use a more powerful model for spec generation
checkmate model set reason claude-3-haiku
```

---

## Core Commands

| Command | Description |
|---------|-------------|
| `checkmate warmup` | Scan repo, analyze code patterns, and suggest specs |
| `checkmate gen "<sentence>"` | Create a spec from plain text. |
| `checkmate gen -i "<sentence>"` | Interactive spec generation with approval workflow. |
| `checkmate draft "<sentence>"` | Generate spec drafts as JSON without writing to disk. |
| `checkmate save --json '<json>'` | Save approved spec drafts to disk. |
| `checkmate status --target <spec>` | Check spec status, report passes/failures. |
| `checkmate next` | Run the first unchecked step in the current branch. |
| `checkmate affected` | Print spec names touched by the current diff. |
| `checkmate clarify <slug>` | Explain why a requirement is failing and suggest fixes. |
| `checkmate watch` | Live ASCII dashboard that updates in real-time as specs run. |
| `checkmate watch --filter todo` | Dashboard filtered to specs containing "todo". |
| `checkmate watch --spec user-auth --until-pass` | Watch a specific spec until it passes. |
| `checkmate model set quick gpt-4o-mini` | Swap the model in the config. |
| `checkmate stats` | Display token usage and estimated costs. |
| `checkmate run-script <script-name> [...args]` | Run internal CheckMate utility scripts with proper paths. |

---

## Quick Tips

Need to...? | Try this:
------------|----------
**Create a specification** | `checkmate gen "User can reset their password"`
**Check spec status** | `checkmate status --target user-password-reset`
**Focus on a specific spec** | `checkmate status --target user-password-reset`
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

## Visual Task Indicators in Cursor

CheckMate provides clear visual indicators when tasks are running in Cursor:

![CheckMate Task Indicators](https://via.placeholder.com/600x100?text=CheckMate+Task+Indicators)

Each task type has a distinct visual style:

| Task Type  | Visual Indicator                       | Description                       |
|------------|---------------------------------------|----------------------------------|
| pre_task   | 🔍 **SCOPE ANALYSIS** (blue border)   | Analyzes which specs will be affected by changes |
| post_task  | ✓ **VERIFICATION** (green border)     | Verifies that affected specs pass after changes |
| post_push  | 🚀 **REGRESSION TEST** (red border)   | Ensures all specs pass before pushing to main |

These visual indicators make it immediately obvious when CheckMate is running tasks in Cursor, providing a seamless and integrated experience.

---

## 📜 Cursor Rule Files

CheckMate automatically injects several `.mdc` rule files into your `.cursor/rules/checkmate/` directory during initialization. These rules improve Cursor's understanding of the CheckMate workflow and provide clear guidance about when and why commands are being executed.

The rules include:

* `pre-task.mdc` - Analyzes scope and determines which specs are affected by changes
* `post-task.mdc` - Verifies affected specs and applies auto-fixes as needed
* `post-push.mdc` - Runs full test suite on pushes to prevent regressions
* `spec-assistant.mdc` - Helps with spec creation and format guidance
* `spec-linter.mdc` - Automated linting and fixing of spec files
* `verification-trigger.mdc` - Triggers feature verification workflow
* `autofix-enforcer.mdc` - Enforces auto-fix attempts on failures
* `drift-detector.mdc` - Detects spec-vs-code drift
* `non-interactive-mode.mdc` - For CI/CD or headless CheckMate runs
* `ai-feature-validation-guidelines.mdc` - Instructional guide for AI validation
* `ai-verify-llm-reasoning-workflow-docs.mdc` - Documentation for LLM reasoning workflow

These rules follow Cursor's best practices with short, specific bullets and clear execution steps. View them in `.cursor/rules/checkmate/` to understand how CheckMate integrates with your development workflow.




## Reset and Logs

* After a full‑pass run CheckMate rewrites every `[🟩]` or `[🟥]` back to `[ ]`.  
* History lives in `checkmate/logs/run.log` unless `log: off`.

Logs stream nicely into your dashboard or CI summary.

## Contributors

<a href="https://github.com/richardsondx/checkmate/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=richardsondx/checkmate" alt="CheckMate project contributors" />
</a>


## Contributing

PRs welcome. Keep each change small and include a spec that proves it works.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.


## License

MIT
See [LICENSE.md](LICENSE.md) for details.

