# CheckMate

AI-powered specs verification that block bad code, see through hallucination, and prevent AI from breaking your code.

CheckMate is an AI Test Driven Development tool that challenges AI's overconfidence with a logical reasoning verification process using LLM.

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

1. **Install CheckMate:**
   ```bash
   npm install @checkmate/cli
   ```

2. **Initialize with sample spec:**
   ```bash
   npx checkmate init
   ```

3. **Create specs from existing requirements**
   If you have an existing PRD or requirements document:
   ```bash
   npx checkmate warmup docs/requirements.md
   ```
   
   Or create a spec for a new feature:
   ```bash
   npx checkmate gen "Feature that allows users to reset their password"
   ```

4. **Start building with Cursor AI:**
   
   Just tell Cursor:
   ```
   "Let's use CheckMate to build the password reset feature"
   ```

5. **Let the AI-driven TDD flow guide development:**
   
   - Cursor will analyze each requirement
   - For each one, it will implement code and provide evidence
   - CheckMate verifies the reasoning is sound
   - You get feature implementation with built-in validation

6. **Check status at any time:**
   ```bash
   npx checkmate status user-password-reset
   ```

For more details, see the [Command Reference](#command-reference) below.

### Using with Cursor AI

When working with Cursor AI, you can use natural language to interact with CheckMate:

1. **Start the TDD process for a feature:**
   
   Just tell Cursor:
   ```
   "Let's use CheckMate to build the password reset feature"
   ```

2. **What happens next:**
   
   CheckMate will show Cursor what needs to be implemented:
   
   "I need to verify these requirements for the password reset feature:
   
   1. System generates a unique, single-use token
   2. User receives an email with the reset link
   3. Clicking the link lets them set a new password
   4. The token is invalidated after use"

3. **Cursor works through each requirement:**
   
   For each requirement, Cursor will:
   - Think about what success and failure look like
   - Write or check code to meet the requirement
   - Show you the evidence it found
   - Ask CheckMate to verify its reasoning

4. **You can check progress anytime:**
   
   Ask Cursor:
   ```
   "What's the status of the password reset feature?"
   ```
   
   Or run directly:
   ```bash
   checkmate status user-password-reset
   ```

This conversational TDD workflow ensures Cursor systematically addresses each requirement with logical validation.

---

## Common Workflows

### Talking to Cursor AI
| What you want | What to say to Cursor |
|---------------|----------------------|
| **Start TDD for a feature** | "Let's build the password reset feature with CheckMate" |
| **Check existing code against specs** | "Does this code pass all CheckMate specs?" |
| **Get help with a failing requirement** | "Why is this requirement failing in CheckMate?" |
| **Create a spec for a new feature** | "Create a CheckMate spec for a login rate limiter" |
| **See which specs are affected by my changes** | "What CheckMate specs are affected by these changes?" |
| **Verify a feature meets its requirements** | "Can you verify the user authentication feature meets all CheckMate requirements?" |
| **Run specific specs for a feature** | "Test the password reset feature against its CheckMate specs" |
| **Fix a bug without breaking requirements** | "Fix this bug in the login feature while ensuring all CheckMate specs still pass" |
| **Create specs for existing code** | "Create CheckMate specs for this existing user profile code" |
| **Make an enhancement safely** | "Add email notifications to the account feature but make sure all existing CheckMate specs still pass" |
| **Get help understanding specs** | "Explain what the third requirement in the authentication spec means" |
| **Review code against specs** | "Does this pull request satisfy all the CheckMate specs for account management?" |

### Using CLI Commands
| What you want | Command to run |
|---------------|----------------|
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
