## CheckMate – working doc

*Plain language. No abstract fluff.*

---

### 1\. Why a dev grabs CheckMate

- They hate when an AI agent says “fixed” yet the feature still fails.
- They want a to-do list of pass/fail checks that lives in Git, not the model’s short-term memory.
- They want those checks to reset once everything passes, so the list is always for the next run.

---

### 2\. Quick summary of moving parts

| Piece | Job |
| --- | --- |
| **`.checkmate`** | API keys, model names, toggles (`log: off`). Lives in root. In `.gitignore`. |
| **`checkmate/specs/*.md`** | One file per feature. Empty boxes at start of any run. |
| **`checkmate/logs/run.log`** | Optional JSONL history. |
| **CLI** | Generates specs, runs them, streams a dashboard. |
| **Cursor rules** | Kick off `pre`, `post`, and `suite` steps. |
| **Tree scanner** | Gives the model a snapshot of real paths so spec bullets point at the right files. |

---

### 3\. Folder tree after `npx checkmate init`

```
project-root
├── .checkmate
├── .gitignore      # now hides .checkmate and /checkmate/logs
├── checkmate/
│   ├── specs/
│   ├── logs/
│   └── cache/
└── src/            # user code
```

---

### 4\. Config file sample

```
openai_key: sk-****
models:
  reason:  o3
  quick:   gpt-4o-mini
tree_cmd: "git ls-files | grep -E '\\.(ts|js)$'"
log:  optional      # on | off | optional
```

The dev flips models with `checkmate model set reason gpt-4o`.

---

### 5\. Spec generation with real context

1. CLI runs `tree_cmd` (defaults to `tree -I node_modules` on macOS).
2. Pipes the file list to the **o3** prompt as system context.
3. Model picks likely paths (`src/routes/todos.ts`, etc.).
4. User can hit `↑` to regenerate or edit the YAML front-matter if the guess missed.

---

### 6\. Core commands

```
checkmate gen "<plain sentence>"        # make a spec
checkmate run                           # run affected & suite checks
checkmate next                          # run first open box of current branch
checkmate affected                      # print spec names touched by git diff
checkmate watch                         # live ASCII dashboard
checkmate model set quick gpt-4-turbo   # change a slot
```

---

### 7\. Cursor glue

`.cursor/config.yaml` gets three helpers:

```
pre_task:
  - name: cm_scope
    cmd: checkmate affected
    env: {CM_TARGET: "$OUTPUT"}     # list goes to NEXT step

post_task:
  - name: cm_verify_current
    cmd: checkmate run --target "$CM_TARGET"

post_push:
  - name: cm_suite
    cmd: checkmate run             # full regression
```

*Pre* tags what will break. *Post* refuses “Done” until every box in that tag goes green. The nightly `post_push` guards the whole codebase.

---

### 8\. Run lifecycle

1. **Start.** All spec boxes `- [ ]`.
2. Agent edits code.
3. `checkmate run` flips each bullet to ✔ or ✖ and streams an ASCII table:
```
┌────────────────────┬────────┬───────┐
│ Feature            │ Passed │ Failed│
├────────────────────┼────────┼───────┤
│ add-todo           │   3    │   0   │
│ list-todos         │   2    │   1   │  ← red row
└────────────────────┴────────┴───────┘
```
4. Agent sees red, patches code, re-runs.
5. When every row is green, CLI writes **run.log** (if `log` not off), then rewrites every spec back to unchecked. History lives only in `run.log`.

---

### 9\. Watching it live

`checkmate watch` tails `run.log`, pipes updates to an ncurses-style grid. A dev keeps this in one pane while Cursor chat scrolls in another.

---

### 10\. How it handles existing projects vs green-field

- **Existing repo**: scanner feeds full path list to the model. If paths in the spec don’t exist, CLI warns and opens `$EDITOR` for a quick fix.
- **Brand-new**: paths folder may not exist yet; spec just lists guessed folders. First run will create them when the AI writes code.
- **Large monorepo**: user narrows scope with `tree_cmd` override (`packages/api/**.ts`).

---

### 11\. Detecting contradictions

When `checkmate gen` creates a spec, CLI compares new bullet text against bullets in older specs that point at the same path. If it finds a direct conflict, it prints both lines side-by-side and asks “keep both, replace old, or abort?”.

---

### 12\. User journeys

#### A. Brand-new todo list

1. `init`, then `gen "User can add a todo"`.
2. Cursor implements, `post_task` loop passes; file resets.
3. Dev adds more sentences; cycle repeats.

#### B. Mature API with failing endpoint

1. Pull CheckMate, run `init`.
2. `gen` five sentences describing current behavior. They pass, giving a baseline.
3. Change hits database layer. `cm_scope` flags two specs. One fails. Cursor patches. Green again.

#### C. Feature enhancement

1. Dev says in chat: “Add due dates to todos.”
2. Cursor calls `checkmate gen --current-task`, writes a temporary spec under `specs/_run/`.
3. On success, CLI asks: “Promote temp spec to permanent?” Dev hits `y` to keep regression coverage.

---

### 13\. Open questions to settle before code freeze

- Best default for `tree_cmd` on Windows?
- Should bullet lines allow inline JS snippets for assert checks?
- Need a `checkmate prune` command to drop stale specs?