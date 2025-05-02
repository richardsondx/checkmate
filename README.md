**Writing README.md guidelines**

I need to create a README.md for CheckMate with an overview, installation instructions, requirements, workflow, examples, and configuration details. I also need to compare the old and new versions of the app. Since the user prefers a specific writing style, I'll avoid certain phrases like "ensure," "is key," or "is essential." I'll also avoid participial phrases and constructions like ", which." It'll be conversational yet clear, with direct sentences, code blocks, and bullet points. I'll make sure the tone stays friendly and approachable.

Thought for 13 seconds

```markdown
╭──────────────────────────────────────────────────────────╮
│    ✦ Welcome to the CheckMate CLI — AI‑Driven TDD ✦     │
│     Keeping your features honest, one ✅ at a time.      │
╰──────────────────────────────────────────────────────────╯

```
```
 ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗███╗   ███╗ █████╗ ████████╗███████╗
██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
██║     ███████║█████╗  ██║     █████╔╝ ██╔████╔██║███████║   ██║   █████╗
██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝
╚██████╗██║  ██║███████╗╚██████╗██║  ██╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
 ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
```

---

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

CheckMate uses OpenAI models through a dedicated client to:

1. **Generate Specs** - Convert plain English descriptions into detailed requirements
2. **Evaluate Requirements** - Test requirements against your code 

Two model tiers handle different tasks:

* **Reason** - For thoughtful spec generation (`gpt-4o` by default)
* **Quick** - For speedy requirement evaluation (`gpt-4o-mini` by default)

Swapping models takes one line:

```bash
checkmate model set quick gpt-3.5-turbo
```

---

## Environment Variables

Add to your `.env` file or set directly in your shell:

```
OPENAI_API_KEY=sk-...your-key-here...
```

You can reference this in `.checkmate` with the `env:` prefix:

```yaml
openai_key: env:OPENAI_API_KEY
```

This keeps sensitive keys out of your repo.

---

## Folder Layout

```
project-root
├── .checkmate        # YAML config (never committed)
├── checkmate/
│   ├── specs/        # one .md file per feature
│   ├── logs/         # JSONL history (optional)
│   └── cache/        # raw model chatter
└── src/              # your code
```

---

## Core Commands

| Command | Description |
|---------|-------------|
| `checkmate gen "<sentence>"` | Create a spec from plain text. |
| `checkmate run`             | Run every check, flip boxes, exit 1 on fail. |
| `checkmate next`            | Run the first unchecked step in the current branch. |
| `checkmate affected`        | Print spec names touched by the current diff. |
| `checkmate watch`           | Live ASCII dashboard that tails the log. |
| `checkmate model set quick gpt-4o-mini` | Swap the model in the config. |

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

---

## Live Dashboard

Run `checkmate watch` in a second terminal.  
You get a table that updates the moment a step flips.

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
