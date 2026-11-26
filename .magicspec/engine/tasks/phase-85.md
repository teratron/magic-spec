---
phase: 85
name: "The Migration to 4.0 (4.0 Step 4, Part 4)"
status: Todo
subsystem: "skills/magicspec (scripts: migrate, a module for the move to 4.0, executor, the readers that walk a workspace folder; workflows: migrate, analyze; SKILL.md; CONSTITUTION.md), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 82: the reverse mode of analyze, which writes the set this phase moves into place (engine 3.0.220)"
  - "Phases 68 and 70: check-docs and its loader, mark-built"
  - "The specifications: l2-sdd-document-set-engine 1.7.1 §5.5, l1-command-surface 2.5.0 CS-6, CS-8, §5.1, §5.3, §6 item 12, l1-skill-packaging SP-10, l1-workspace-intent-routing WI-14, Stable at registry 1.107.1, constitution 2.0.0, plan 1.99.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 85 Tasks — The Migration to 4.0 (4.0 Step 4, Part 4)

**Phase:** 85
**Status:** Todo
**Strategic Goal:** a 3.x workspace moves to the 4.0 document set by `migrate --to 4`: a dry run that writes nothing, the set written by `analyze` into `next/`, one consent question, an apply step that moves the files only on a clean check and sets the format last, and resumes after an interruption; while a move is in flight no other command reads the workspace; the move from the 2.x layout and every 3.x workspace not being moved behave as today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The module: `skills/magicspec/scripts/lib/migrate-to-4.js`, called by `migrate.js` when it is given `--to 4`; `migrate.js` keeps the move from the 2.x layout and reads `--to` through the shared grammar. Any other value of `--to` is refused with exit 1 and the line `[migrate] --to takes 4.`. The workspace is the one the executor resolves (its `--workspace`, else the registry default).
- The dry run (`migrate --to 4`): prints `Migration to 4.0 of {workspace} (dry run — nothing changes without --apply):`, then one line per 3.x file or folder with its place (`{3.x path} → {4.0 place}`, the §5.1 table of `l2-sdd-document-set-engine.md`, `archives/3x/{path}` for a file that has no 4.0 place), one line per specification the reverse mode must split, `  split by the reverse mode: {file}`, one line per scenario whose `Verifies` names a 3.x specification, `  scenario to rewrite: simulations/{area}.md {S-n}`, and the state of `next/`: `next/: absent — write it with /magicspec analyze first-time`, or `next/: {n} findings` with the findings, or `next/: clean`. It writes nothing and exits 0.
- The apply step (`migrate --to 4 --apply`): with no `next/`, or a `next/` the checker reports findings on, it prints them, changes nothing and exits 1. On a clean `next/` it moves every file and folder of the workspace but `archives/`, `simulations/` and `next/` into `archives/3x/`, moves the contents of `next/` into the workspace, removes `next/`, then sets `"format": "4"` in `workspace.json` last, and prints `[migrate] {workspace} is a 4.0 workspace.`. A workspace already in the 4.0 format gets `[migrate] {workspace} is already a 4.0 workspace; nothing to do.` and exit 0.
- A move in flight: a workspace not in the 4.0 format whose `archives/3x/` holds a file. The executor stops every command but `migrate` on it, before the command runs, with exit 1 and the line `HALT: The move of {workspace} to 4.0 was started and not finished. Run \`/magicspec migrate --to 4\` (by script: \`{executor} migrate --to 4 --apply\`) to finish it.`
- The section of the migrate body: `## The Move to 4.0`, before `## Migrate Completion Checklist`, listed in its `**Contents:**`.
- The fixture: `tests/engine/fixtures/migrate-to-4/`, a 3.x workspace `docs` (registry, two specifications, a plan, a ledger, a phase workbook, `STATE.md`, `RULES.md`, an archived phase under `archives/tasks/`, one scenario file citing a specification) and `next/`, a copy of the `good` set of the document-set fixtures.
- The harness module: `tests/engine/migrate-to-4.js`, case names beginning `migrate to 4:`, registered in `tests/engine.js` after `migrate`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-85F01] The fixture: a 3.x workspace with a written `next/`
- [ ] [T-85M01] `migrate --to 4`: the dry run
- [ ] [T-85M02] `migrate --to 4 --apply`: the check, the moves, the format last, the resumption
- [ ] [T-85G01] The stop of a move in flight
- [ ] [T-85G02] No 3.x reader reads `next/`
- [ ] [T-85W01] `migrate.md`, the router row and the always-on rules
- [ ] [T-85W02] The reverse mode of `analyze.md` writes into `next/` during a move
- [ ] [T-85H01] Harness cases for the move to 4.0
- [ ] [T-85Y01] The `session` scenario of the move
- [ ] [T-85S01] The specifications as built
- [ ] [T-85T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-85F01] The fixture: a 3.x workspace with a written `next/`

- **Spec:** l2-sdd-document-set-engine.md §5.1 (the 3.x and 4.0 files), §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `tests/engine/fixtures/migrate-to-4/` holds the workspace of the shared names; `check-prerequisites --verify-headers` on a copy reports no drift; `check-docs` run on its `next/` as a workspace reports 0 findings; it holds `RULES.md` and `PLAN.md` beside `next/rules.md` and `next/plan.md`, the names that collide on a case-insensitive file system
- **Handoff:** T-85M01, T-85M02, T-85G01, T-85G02 and T-85H01 run on copies of it.
- **Notes:** The fixture is copied, never edited in place, by every case.

### [T-85M01] `migrate --to 4`: the dry run

- **Spec:** l2-sdd-document-set-engine.md §5.5 (the dry run); l1-command-surface.md CS-6, §5.1 row `migrate`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the fixture the dry run prints the lines of the shared names and writes nothing (a digest of the project before and after); on a copy without `next/` it prints the absent line; with a finding in `next/` it prints the finding; on a 4.0 workspace the finished line; `--to 5` is refused; `migrate` without `--to` behaves as before (the existing `migrate` cases pass unedited); `update-engine-meta` run after the edit
- **Handoff:** T-85M02 extends the module; T-85W01 relays its output.
- **Notes:** The mapping is read from one table in the module, so the dry run and the apply step cannot disagree about where a file goes.

### [T-85M02] `migrate --to 4 --apply`: the check, the moves, the format last, the resumption

- **Spec:** l2-sdd-document-set-engine.md §5.5 (the apply step, Resuming a move); l1-skill-packaging.md SP-10; l1-workspace-intent-routing.md WI-14
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the fixture the apply step leaves the 3.x files under `archives/3x/` (the earlier `archives/tasks/` and `simulations/` in place), the set in the workspace, no `next/`, `"format": "4"` in `workspace.json`, and `check-docs` reporting 0 findings; with no `next/` and with a finding in it nothing changes and the exit is 1; a run stopped after the first move (simulated by moving a part of the files by hand) and run again reaches the same tree; a second run prints the already line; the format is never set while a 3.x file is outside `archives/3x/`; `update-engine-meta` run after the edit
- **Handoff:** T-85G01 reads the in-flight state it can leave; T-85H01 pins it.
- **Notes:** Each move is read back from the files, never from a log. On a case-insensitive file system the 3.x files leave before the set arrives, so `RULES.md` never meets `rules.md`.

### [T-85G01] The stop of a move in flight

- **Spec:** l2-sdd-document-set-engine.md §5.5 (Resuming a move); l1-command-surface.md CS-8
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the fixture with part of the 3.x files in `archives/3x/` and the format not set, `check-prerequisites`, `finalize` and `resume-state` stop with the line of the shared names and exit 1 and write nothing, while `migrate --to 4` and `migrate --to 4 --apply` run; a workspace with `archives/3x/` and the format set runs every command; this repository's commands run as before; `update-engine-meta` run after the edit
- **Handoff:** T-85W01 names it; T-85H01 pins it.
- **Notes:** The stop sits beside the stop of an unmigrated project (`MIGRATION_SAFE`) and runs before any command.

### [T-85G02] No 3.x reader reads `next/`

- **Spec:** l2-sdd-document-set-engine.md §5.5 ("No 3.x reader reads `next/`"); l2-artifact-memory-store.md (the folders the index skips)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** every script that walks a workspace folder is listed in `Changes` with what it reads; on a copy of the fixture the artifact index, `build-spec-graph`, `export-wiki`, `check-bloat`, `check-prerequisites` and `analyze-coverage` give the same output with `next/` as without it; their output on this repository is unchanged; `update-engine-meta` run after the edit
- **Handoff:** T-85H01 pins it.
- **Notes:** `lib/memory-sections.js` walks every folder but the ones it skips by name, so it reads `next/` today. A skip by name must not hide a folder named `next` inside a 4.0 set's own documents.

### [T-85W01] `migrate.md`, the router row and the always-on rules

- **Spec:** l1-command-surface.md CS-6, §5.1 row `migrate`, §5.3, §6 item 12
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/migrate.md` holds the section of the shared names: the dry run, the reverse mode writing `next/` (`/magicspec analyze first-time` during a move), one consent question before the moves (E1), the apply step, the report; its *Entry* and Core Invariant 3 say they hold for the move from the earlier layout and the section says how a move to 4.0 resolves its workspace; the router's `migrate` row in `SKILL.md` has the argument and missing cells of §5.1; `help` lists `migrate` with `[--to 4 …]` from the row (one parser); the reason `CONSTITUTION.md` §1 gives for exempting `migrate` from the drift line covers `--to 4`; the text outside the changed parts is unchanged; the instruction review passes; `update-engine-meta` run after the edit, the host projection refreshed
- **Handoff:** T-85H01 pins the row, the section and the rule line; T-85Y01 traces it.
- **Notes:** Never finalizes, as the body's Core Invariant 4 says for the other move.

### [T-85W02] The reverse mode of `analyze.md` writes into `next/` during a move

- **Spec:** l2-sdd-document-set-engine.md §5.5 (the reverse mode writes into `next/`), §5.4 row `analyze`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `analyze.md` §On a 4.0 Workspace, The Reverse Mode, says that during a move to 4.0 of a 3.x workspace it writes into `next/` of that workspace with the 3.x specifications as a source beside the code, runs `check-docs` on `next/`, and runs no `mark-built` there before the apply step has moved the set into place; the rest of the section unchanged; the instruction review passes; `update-engine-meta` run after the edit
- **Handoff:** T-85W01 names it; T-85H01 pins the sentence.
- **Notes:** The checker reads a folder through its loader, so `next/` is checked without being a registered workspace.

### [T-85H01] Harness cases for the move to 4.0

- **Spec:** l2-test-suite.md; the shared names
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="migrate to 4" tests/engine.js` passes with cases for the dry run, the refused value, the apply step on a clean, an absent and a failing `next/`, the resumption, the already line, the stop in flight and the commands it lets through, the readers that skip `next/`, the router row and `help`, the body's section and the rule line; each fails with its change removed (`scripts/mutation-check.js` CAUGHT); the existing `migrate` and layout cases pass unedited but for the module's registration
- **Handoff:** T-85T01.
- **Notes:** The module is a new domain of the harness, registered in its entry.

### [T-85Y01] The `session` scenario of the move

- **Spec:** l1-product-simulation.md SM-3, SM-4; the sections of T-85W01 and T-85W02
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/session.md` holds a scenario *`migrate --to 4` previews, asks once and moves a 3.x workspace, or leaves it on 3.x with the findings it cannot close*, numbered after the last scenario of the files, each step tagged and citing what it is judged against; a traced run holds every step, the scripts' steps checked against their real output on a copy of the fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-85S01.
- **Notes:** Traced, not live, as in the phases before.

### [T-85S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.7.1 (§5.5, §5.6 step 4); l1-command-surface.md 2.5.0 (§6 item 12); l1-engine-core.md (the workspace architecture the concept's §6 declares superseded); l2-skill-distribution.md §5.6; l2-artifact-memory-store.md; l2-engine-automation.md; l2-test-suite.md; l1-product-simulation.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the realization records the move to 4.0 as built; the command surface records its row and body as built; `l1-engine-core.md` states the 4.0 workspace beside the 3.x one, its 3.x architecture unchanged; `l2-skill-distribution.md` §5.6 names the move to 4.0 as the other mode of `migrate`; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-85T01.
- **Notes:** As-built patches of a declared supersession, as in the phases before.

### [T-85T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; every shipped body over 100 lines keeps its contents list; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec plan engine` for Phase 83
- **Handoff:** `/magicspec plan engine`.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
