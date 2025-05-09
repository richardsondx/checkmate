# CheckMate ⬜️⬛️⬜️ | [![Star on GitHub](https://img.shields.io/github/stars/checkmateai/checkmate?style=social)](https://github.com/checkmateai/checkmate/stargazers)

By [@Richardsondx](https://x.com/richardsondx)

[![CheckMate Demo](https://img.youtube.com/vi/A2sqyblVxZk/0.jpg)](https://youtu.be/A2sqyblVxZk)


AI-powered specs verification that block bad code, see through hallucination, and prevent AI from breaking your code.

CheckMate is an AI Test Driven Development tool that challenges AI's overconfidence with a logical reasoning verification process using LLM.

It's built with Cursor AI in mind.

## Requirements

CheckMate works best with both API keys:

- **OpenAI API Key**: Required for GPT models (default `quick` verifier)
- **Anthropic API Key**: Required for Claude models (default `reason` generator)

While you can run with just one key, the recommended configuration uses both:

```yaml
# In .checkmate file (automatically added to .gitignore)
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

Additional configuration options include:

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

### AI Integration and Token Usage

CheckMate supports both User Specs (Markdown) and Agent Specs (YAML) that work together to validate your code. Learn more about when to use each in the [Spec Types Guide](wiki/Spec-Types.md).

#### AI Operations and Token Usage

CheckMate strategically uses AI for specific operations to balance quality and cost:

| Operation | Model Used | Token Usage | When It Happens |
|-----------|------------|-------------|-----------------|
| **Spec Generation** | `reason` (claude-3-sonnet) | High | Only when you run `gen`, `draft`, or `warmup` commands |
| **Requirement Verification** | `quick` (gpt-4o-mini) | Medium | During `run` and `verify` operations |
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
| `checkmate run` | Run every check, flip boxes, exit 1 on fail. |
| `checkmate next` | Run the first unchecked step in the current branch. |
| `checkmate affected` | Print spec names touched by the current diff. |
| `checkmate clarify <slug>` | Explain why a requirement is failing and suggest fixes. |
| `checkmate watch` | Live ASCII dashboard that updates in real-time as specs run. |
| `checkmate watch --filter todo` | Dashboard filtered to specs containing "todo". |
| `checkmate watch --spec user-auth --until-pass` | Watch a specific spec until it passes. |
| `checkmate model set quick gpt-4o-mini` | Swap the model in the config. |
| `checkmate stats` | Display token usage and estimated costs. |

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

In addition to the config-based rules, CheckMate creates `.mdc` rule files in the `.cursor/rules/` directory:


These rule files improve Cursor's understanding of the CheckMate workflow and provide clear guidance about when and why commands are being executed. They follow Cursor's best practices with short, specific bullets and clear execution steps.

View them in `.cursor/rules/` to understand how CheckMate integrates with your development workflow.



## Cursor Rules (auto‑injected)

CheckMate automatically injects several rule files into your `.cursor/rules/` directory during initialization:

* `pre_task.mdc` - Analyzes scope and potential impacts before coding begins
* `post_task.mdc` - Verifies all affected specs and blocks completion until passing
* `post_push.mdc` - Runs full test suite on pushes to prevent regressions
* `feature_validation.mdc` - Guides Cursor through the TDD workflow
* `spec_generation.mdc` - Helps Cursor create and validate new specs
* `code_review.mdc` - Analyzes changes against existing specs
* `debug_assist.mdc` - Provides context-aware debugging guidance
* `refactor_safety.mdc` - Ensures refactoring preserves spec compliance




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

