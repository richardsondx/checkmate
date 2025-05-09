# CheckMate

AI-powered specs verification that block bad code, see through hallucination, and prevent AI from breaking your code.

CheckMate is an AI Test Driven Development tool that challenges AI’s overconfidence with a  logical reasoning verification process using LLM.

It's built with Cursor AI in mind.


---

## How it Works

- You write specs
- AI implements
- AI must explain its success with evidence
- CheckMate uses another AI to verify this reasoning
- PASS/FAIL verdict shows if your requirements are truly met.


---

## Quick Start

```bash
# Install
npm install checkmateai

# Initialize
npx checkmate init

# Scan your repository and generate initial specs (optional)
checkmate warmup

# Create a spec for a new feature
checkmate gen "User can reset their password via email link"
```

### Using with Cursor AI

1. **Start TDD for a feature:**
   In Cursor, type: 
   ```
   /@checkmate-tdd user-password-reset
   ```

2. **CheckMate provides check items to Cursor:**
   - CheckMate lists all requirements from the spec
   - Cursor receives instructions for validating each check item

3. **Cursor works through each check:**
   - Defines success/failure conditions for each check
   - Implements or verifies code for each requirement
   - Reports findings and calls verify-llm-reasoning

4. **See the status of a spec:**
   ```bash
   checkmate status user-password-reset
   ```

   Output:
   ```
   Spec Status: User Password Reset
   ✅ System generates a unique, single-use password reset token
   ✅ User receives an email with a link containing the reset token
   ✅ Clicking the link allows the user to set a new password
   ✅ The reset token is invalidated after use or expiration
   ```

This LLM-driven TDD loop ensures systematic implementation of requirements with logical validation.

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
- [Development Guide](wiki/Development-Guide.md) - Development workflow and testing
- [Telemetry Guide](wiki/Telemetry-Guide.md) - Token usage tracking and statistics

---

## License

MIT

---

## PRD-Driven Workflow

CheckMate supports a PRD-driven workflow:

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
