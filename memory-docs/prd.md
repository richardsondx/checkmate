

**Clarifying PRD request**

The user wants an updated PRD which includes an Overview section and incorporates prior suggestions. They also want ASCII art for the term "Checkmate" displayed at the initialization of the CLI, similar to what was seen in a screenshot of Claude Code. The PRD should cover sections like Goals, User Personas, User Journey, Features, Architecture, CLI Commands, Configuration, Cursor Integration, Edge Cases, and Logging. I’ll need to ensure the document is structured properly and provide the ASCII art for "CHECKMATE."

Thought for 17 seconds

```
 ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗███╗   ███╗ █████╗ ████████╗███████╗
██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
██║     ███████║█████╗  ██║     █████╔╝ ██╔████╔██║███████║   ██║   █████╗
██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝
╚██████╗██║  ██║███████╗╚██████╗██║  ██╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
 ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
```

---

# CheckMate — Product Requirements Document

## 1 · Overview  
CheckMate turns plain‑English feature requests into git‑tracked acceptance checklists.  
Cursor or any code agent works through those boxes and only declares “Done” when every one turns green. After a full‑pass run, CheckMate resets the boxes so the list stays fresh for the next change.

---

## 2 · Problem Statement  
* AI agents often claim a fix even when a feature still fails.  
* Developers need a lightweight, persistent source of truth the agent can read and update.  
* Teams want instant feedback without wiring a full test suite first.

---

## 3 · Goals  

1. Create specs from a single sentence.  
2. Attach each spec to real file paths in the repo.  
3. Let agents mark pass/‑fail during a run, then reset when finished.  
4. Give devs a live ASCII dashboard plus an optional JSONL log.  
5. Work out of the box on macOS with zero manual config.

---

## 4 · Out of Scope  

* Browser‑automation UI tests.  
* Cloud service for result storage.  
* Windows shell quirks (possible later).

---

## 5 · Target Users  

| Persona | Need |
|---------|------|
| Solo hacker | Quick guardrails for side projects. |
| AI‑heavy team | Persistent acceptance checks without long test bootstraps. |
| Legacy maintainer | Bolt‑on spec files for an existing codebase. |

---

## 6 · Key Features  

| Feature | Notes |
|---------|-------|
| **Spec generator** | Runs `git ls-files` (or `tree`) and feeds list + sentence to model `reason` (o3). |
| **Runner** | Executes specs, flips boxes to ✔/✖, exits non‑zero on any fail. |
| **Watcher** | TUI with live feature grid; tails the log. |
| **Path diff** | `checkmate affected` compares git diff to `files:` blocks. |
| **Model slots** | Two roles: `reason` and `quick`. User swaps either in `.checkmate`. |
| **Reset policy** | After a green run the runner rewrites every `[✔]` back to `[ ]`. |
| **Optional log** | Toggle in config: `log: on | off | optional`. |

---

## 7 · Folder Structure  

```
project-root
├── .checkmate       # YAML config
├── checkmate/
│   ├── specs/       # Markdown checklists
│   ├── logs/        # JSONL history (if log ≠ off)
│   └── cache/       # streamed model responses
└── src/             # user code
```

---

## 8 · Config File  

```yaml
openai_key: "sk-***"
models:
  reason: o3
  quick:  gpt-4o-mini
tree_cmd: "git ls-files | grep -E '\\.(ts|js)$'"
log: optional      # off by default on CI
```

Developers switch models with `checkmate model set quick gpt-4-turbo`.

---

## 9 · CLI Commands  

| Command | Action |
|---------|--------|
| `checkmate gen "<sentence>"` | Generate a spec and open `$EDITOR` for tweaks. |
| `checkmate run` | Run suite for affected specs or full set if none specified. |
| `checkmate next` | Execute first unchecked bullet on current branch. |
| `checkmate affected` | List specs touched by current git diff. |
| `checkmate watch` | Show live dashboard. |
| `checkmate model set reason gpt-4o` | Swap model. |

---

## 10 · Cursor Integration  

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

*Pre* tags what might break. *Post* blocks “Done” on red boxes. *Post_push* keeps the repo clean on merge.

---

## 11 · User Journeys  

### Green‑field  
1. `npx checkmate init` adds folders and updates `.cursor/config.yaml`.  
2. `checkmate gen "User can add a todo"` makes `specs/add-todo.md`.  
3. Cursor builds the endpoint, post‑task run passes, boxes reset.  
4. Dev adds more specs and repeats.

### Existing Repo  
1. Run `init`.  
2. Write five specs that describe current behavior; they pass.  
3. Add a new feature; generator pulls full file tree so paths match.  
4. Runner catches regressions right away.

### Large Refactor  
* `git mv` triggers path mismatch; runner warns and asks to update `files:`.  
* Once updated, affected list runs again and confirms green.

---

## 12 · Report Formats  

### CLI Pass/Fail  

```
CheckMate 0.3.0  |  Branch: feature/todo-due-date

╭──────────────────────────────────────────────╮
│ Feature              Passed  Failed  Skipped │
├──────────────────────────────────────────────┤
│ add-todo                  3       0        0 │
│ list-todos                2       1        0 │
│ toggle-done               1       0        0 │
╰──────────────────────────────────────────────╯
✖  1 step failed
```

### Log Line  

```json
{"ts":"2025-05-02T19:14:11Z","spec":"list-todos","step":3,"result":"fail","msg":"sort order incorrect"}
```

---

## 13 · ASCII Splash  

Printed once on every CLI start (above). Color scheme comes from `chalk`:

```ts
import chalk from 'chalk';
console.log(chalk.hex('#FF6A3D')(asciiArt));
```

---

## 14 · Edge‑Case Handling  

| Case | Strategy |
|------|----------|
| Wrong file paths in spec | Runner prints diff of missing files, offers auto‑edit. |
| Conflicting steps across specs | Generator shows side‑by‑side view; user keeps both or merges. |
| Windows shell | Detect OS, fall back to `dir /b` for tree scan (future). |
| Log privacy | `log: off` skips writes completely. |

---

## 15 · Open Items  

1. Decide on inline code assertions vs plain text only.  
2. Add `checkmate prune` to drop stale specs once branches merge.  
3. Windows and Linux tree command defaults.  

---

CheckMate brings test‑driven discipline to AI‑first coding with almost no setup. Developers write a sentence, watch boxes go green, and ship with confidence.