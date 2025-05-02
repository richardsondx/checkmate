### implementation-step.md

```md
# CheckMate — Implementation Plan  
Target release: 0.3.0  
Lead dev: ___  
Reviewers: ___  
```

---

## 0 · Scaffold

| Task                                                                                              | Owner | Notes |
| ------------------------------------------------------------------------------------------------- | ----- | ----- |
| `npm init -y` in repo root                                                                        |       |       |
| Add `tsconfig.json` (`ES2022`, `moduleResolution: node16`)                                        |       |       |
| Install deps: `ts-node`, `chalk`, `yargs`, `boxen`, `execa`, `inquirer`, `chokidar`, `simple-git` |       |       |
| Add scripts:<br>`"checkmate": "ts-node src/index.ts"`                                             |       |       |
| Commit `feat: project scaffold`                                                                   |       |       |

---

## 1 · Core folders

| Path               | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `src/`             | CLI source                                     |
| `src/commands/`    | One file per CLI verb                          |
| `src/lib/`         | Helper utils (tree scan, YAML IO, spec parser) |
| `checkmate/specs/` | Generated checklists                           |
| `checkmate/logs/`  | JSONL history                                  |
| `checkmate/cache/` | raw model calls                                |

Add `checkmate/**` and `.checkmate` to `.gitignore`.

---

## 2 · ASCII splash + welcome box

1. Create `src/ui/banner.ts`.
2. Build box with **boxen** and banner with hard‑coded ASCII art.
3. Expose `printBanner()`; call it first in `src/index.ts`.

---

## 3 · Config handling

1. File: `.checkmate` (YAML).
2. Interface in `src/lib/config.ts`

   * `load()` → defaults if file missing.
   * `save()` for model swaps.
3. Toggle for `log: on | off | optional`.

---

## 4 · Tree scanner

* Module `src/lib/tree.ts`
* Default command: `git ls-files`.
* Fallback: `find . -type f` when repo not yet git‑init.
* Return array of paths filtered by `.ts`, `.js`, `.tsx`, `.jsx`.

---

## 5 · Spec generator (`checkmate gen`)

| Step                                                           | Detail |
| -------------------------------------------------------------- | ------ |
| Parse sentence arg.                                            |        |
| Call tree scanner, feed list plus sentence to `models.reason`. |        |
| Receive front‑matter (`files:`) + bullet list.                 |        |
| Write Markdown to `checkmate/specs/<slug>.md`.                 |        |
| Launch `$EDITOR` if `$CHECKMATE_EDIT=1`.                       |        |

Edge cases:

* On path mismatch warn user and ask to edit before save.

---

## 6 · Runner (`checkmate run` + `next`)

* Parser: convert each bullet to `{text,status}`.
* Execution stub in `src/lib/executor.ts`

  * For now mark pass via `models.quick` dry‑run reasoning.
  * Future plug‑in for real code hooks.

Flow:

```
for each targeted spec
  for each unchecked bullet
    call executor → pass/fail
    rewrite line with [✔] or [✖]
    append JSONL if log active
on full green:
  if reset flag true → flip all boxes back to [ ]
```

Exit code `0` on full pass, `1` otherwise.

---

## 7 · Affected list (`checkmate affected`)

1. Run `git diff --name-only <diff_base>`.
2. Compare with each spec’s `files:` list.
3. Print unique spec names, comma‑separated.

Return empty string when none match.

---

## 8 · Live dashboard (`checkmate watch`)

1. Use **chokidar** to watch `checkmate/logs/run.log`.
2. Render ASCII table with **blessed** or plain console update.
3. Auto‑scroll on new lines.

---

## 9 · Model commands

* `checkmate model list` — print current slots.
* `checkmate model set <slot> <name>` — write to `.checkmate`.

---

## 10 · Cursor rules bootstrap (`init`)

* Locate or create `.cursor/config.yaml`.
* Inject three blocks: `cm_scope`, `cm_verify`, `cm_regress` (see PRD).
* Warn if file already contains older CheckMate rules.

---

## 11 · Unit tests

* Framework: `vitest`.
* Cover: spec parser, tree scan filter, path diff matcher, reset logic.

---

## 12 · CI

* GitHub Actions:

  * `pnpm install`
  * `pnpm test`
  * Run `checkmate gen` mock and check file write.

---

## 13 · Milestone schedule

| Week | Deliverable                         |
| ---- | ----------------------------------- |
| 1    | Scaffold, banner, config load/save  |
| 2    | Tree scan, generator MVP            |
| 3    | Runner pass/fail, reset logic       |
| 4    | Affected diff, Cursor rule injector |
| 5    | Watch dashboard + docs              |
| 6    | Polish, cross‑platform smoke test   |

---

## 14 · Done‑definition checklist

* [ ] `npx checkmate init` creates files without error.
* [ ] `checkmate gen "Add todo"` writes a spec with real paths.
* [ ] `checkmate run` flips boxes and resets on green.
* [ ] `checkmate affected` returns correct names on git diff.
* [ ] `checkmate watch` streams updates in a second terminal.
* [ ] `npm pack` ships ≤ 150 kB install footprint.

---

*Ping the lead when you hit blockers; small pull requests over huge drops.*
