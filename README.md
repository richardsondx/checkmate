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

Plain‑English specs that live in Git and block “Done” until every box turns green.  
Built for Cursor AI, but handy on its own too.

---

## Installation

```bash
npx ts-node -e "import('checkmate').then(m => m.init())"
```

The script:

* Drops a `.checkmate` config in the repo root  
* Adds `checkmate/` and `.checkmate` to `.gitignore`  
* Creates a starter rules file in `.cursor/config.yaml`

You can start writing specs right away.

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

**Updating README with Quick Start**

The user wants me to add a "Quick Start for a cloned repository" section to the README for someone cloning a repo that includes CheckMate. I'll update the README.md with steps like:

1. Clone the repo.
2. Install dependencies (using pnpm or npm install).
3. Run `npx checkmate init` if the `.checkmate` file is absent.
4. Run `checkmate run` to verify the baseline, etc.

This should help guide users who are starting from an existing CheckMate setup.


Thought for 7 seconds


### Quick Start — when you **clone a repo that already uses CheckMate**

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
   Any red box stops the “Done” badge until you push a fix.

That’s all—no extra setup, no hidden steps. You clone, install, add your key, and the watchdog is live.


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

## License

MIT
