# Quick Start Guide

This guide provides practical examples to get you started with CheckMate quickly.

## One Feature Quick Start

```bash
# write a single‑sentence spec
checkmate gen "A user can add a new todo with title and status"

# for agent specs (YAML format)
checkmate gen "A user can add a new todo with title and status" --agent

# use interactive mode to review and edit specs before saving
checkmate gen -i "A user can add a new todo with title and status"

# interactive mode also works with agent specs
checkmate gen -i "A user can add a new todo with title and status" --agent

# let Cursor (or you) build the code
# …

# check the spec status
checkmate status --target add-todo
```

CLI output:

```
Spec Status: add-todo
✔ 2 / 3 requirements passed (66%)

Failing requirements:
1. Return 201 JSON payload
```

Fix the red line, run the status check again, get all green.  
CheckMate resets the boxes, logs the pass, and you move on.

## When You Clone a Repo Using CheckMate

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
   checkmate status
   ```

   You should see every spec status reported. If something fails, the spec shows exactly what broke.

5. **Start coding**

   Make a change, commit, and watch the Cursor rules kick off `checkmate affected` → `checkmate status`.
   Any failures stop the "Done" badge until you push a fix.

That's all—no extra setup, no hidden steps. You clone, install, add your key, and the watchdog is live.

## Using CheckMate in a New Project

1. Run the `init` script.  
2. Describe your first feature with `checkmate gen "…"`.  
3. Build until the status shows all requirements are passing.  
4. Repeat for each new feature.

No existing paths, so the generator guesses file names (e.g. `src/routes/todos.ts`).  
When the code appears, future scans catch the real paths.

## Dropping CheckMate into an Existing App

1. Run `init`.  
2. Write a spec for a feature that already works:  

   ```bash
   checkmate gen "List all todos"
   checkmate status --target list-all-todos  # everything should pass
   ```

3. Add more specs until you feel covered.  
4. From now on `checkmate affected` spots any spec touched by a change.

If the generator points at the wrong file, open the Markdown and fix the `files:` list.  
CheckMate warns when paths do not exist.

## First‑time Magic with Warmup

The `warmup` command is perfect for adding CheckMate to existing projects:

```bash
# scan repo, draft specs, open approval UI in Cursor
checkmate warmup
```

Approve or edit the suggestions, then check each spec:

```bash
checkmate status    # check baseline status for all specs
```

Now every Cursor task auto‑checks itself against those specs—no extra commands.

## Next Steps

- Try the [Live Dashboard](Command-Reference.md#live-dashboard) with `checkmate watch`
- Learn more about [Spec Types](wiki/Spec-Types.md)
- Set up [Cursor Integration](wiki/Cursor-Integration.md) for a seamless workflow 