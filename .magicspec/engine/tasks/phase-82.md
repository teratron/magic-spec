---
phase: 82
name: "The Analysis on a 4.0 Workspace (4.0 Step 4, Part 3)"
status: Todo
subsystem: "skills/magicspec (scripts: analyze-coverage, lib/doc-set-coverage; workflows: analyze; references/rules/containment; roles/project-auditor), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 81: the bodies the reverse mode runs and the goal file (engine 3.0.213), with the maintenance Phase 84 (engine 3.0.217)"
  - "Phases 68, 70, 71 and 80: check-docs and pack, mark-built, analyze-coverage's 4.0 branch, the On a 4.0 Workspace sections of spec, plan, task and run"
  - "The specifications: l2-sdd-document-set-engine 1.6.1, l1-sdd-document-set 1.6.0, l1-sdd-reference-containment, l2-engine-automation, l2-role-cards-governance, Stable at registry 1.106.0, constitution 2.0.0, plan 1.97.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 82 Tasks — The Analysis on a 4.0 Workspace (4.0 Step 4, Part 3)

**Phase:** 82
**Status:** Todo
**Strategic Goal:** on a 4.0 workspace `analyze` audits the set against the code without writing a document, and writes a set from existing code by the lab's method, the code recorded built by replaying each task's `Observe` and `mark-built`; on a 3.x workspace every script prints and every body reads as it does today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The map comparison: `analyze-coverage` on a 4.0 workspace prints, after its requirement lines and before its summary line, one line per map row whose path is not in the project, `map:{key}: {path} is missing`, and one line per file of the scope that no map row's path equals or contains, `{file}: no map row`, in path order; the summary line gains `, {m} map path(s) missing, {u} file(s) with no map row`. The scope is the workspace's `scope` in `workspace.json`, or the whole project when it has none; the state folder, the skill folder, the host folders and gitignored files are never scope files, as in the 3.x branch. With no `memory/map.md` the comparison prints nothing and the summary keeps its form.
- The containment classes of a 4.0 workspace: the addresses of concept §5.2 that cannot be a word of the product's domain — `M{n}.T{k}`, `{key}.b{n}`, `map:{key}`, `term:{word}`, `asset:{path}` — and the paths of the set (`product.md`, `plan.md`, `changes.md`, `spec/`, `stack/`, `memory/`, beside every `.magicspec/` path) are always findings; the short forms `R{n}`, `S{n}`, `P{n}`, `X{n}`, `D{n}`, `C{n}`, `M{n}` and a bare requirement address `{key}.{n}` are findings only after the self-containment test, as prose phase designators are on 3.x; a component key used as a name where the bindings use it is no finding (I13).
- The section of the body: `## On a 4.0 Workspace` of `workflows/analyze.md`, immediately before `## Task Completion Checklist`, named in its `**Contents:**` list at the same place; its first paragraph word for word the one of Phases 80 and 81.
- The card line of `project-auditor`, closing its Operating Protocol and mirrored word for word in `l2-role-cards-governance.md`: `On a 4.0 workspace the audit reads units, the map and the code: the check-docs report, the map compared with the code by analyze-coverage, and the product scanned for the addresses and paths of the set.`
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`; `BODY_SECTIONS` gains `analyze`. The module held 1,826 lines at the start of the phase and stays under the layout bound of 2,500.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-82C01] `analyze-coverage` compares the map with the code on a 4.0 workspace
- [ ] [T-82R01] The containment classes and the auditor card of a 4.0 workspace
- [ ] [T-82W01] `analyze.md` on a 4.0 workspace: the audit
- [ ] [T-82W02] `analyze.md` on a 4.0 workspace: the reverse mode
- [ ] [T-82H01] Harness cases for the map comparison, the classes, the card and the section
- [ ] [T-82Y01] The `pipeline` and `quality` scenarios of the analysis
- [ ] [T-82S01] The specifications as built
- [ ] [T-82T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-82C01] `analyze-coverage` compares the map with the code on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze` (the map compared with the code), §5.2 (`analyze-coverage` on a 4.0 workspace); l1-sdd-document-set.md §5.7 (`map.md`)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture `analyze-coverage` prints no map line and the summary `…, 0 map path(s) missing, 0 file(s) with no map row` once `src/core.rs` exists and every other file of the scope lies under a map row; with `src/core.rs` removed it prints `map:core: src/core.rs is missing`; with `src/extra.rs` added it prints `src/extra.rs: no map row`; with no `memory/map.md` it prints no map line; files under the state folder, the skill folder and gitignored ones are never listed; on this repository's 3.x workspace its output is byte-identical to before (a comparison on a frozen copy); `update-engine-meta` run after the edit
- **Handoff:** T-82W01 names the command and its lines; T-82H01 pins them.
- **Notes:** The comparison lives in `lib/doc-set-coverage.js`, reading the map with the reader `mark-built` writes for (no second parser). A path a row names may be a file or a folder; a file is covered when it equals that path or lies under it. Reuse the 3.x branch's exclusion of the state, skill and host folders and of gitignored files instead of writing a second walk.

### [T-82R01] The containment classes and the auditor card of a 4.0 workspace

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-2.1, RC-7 (the classes the concept's §6 declares superseded on a 4.0 workspace); l1-sdd-document-set.md §5.2, I13; l2-role-cards-governance.md `project-auditor`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/references/rules/containment.md` states the classes of the shared names for a 4.0 workspace, the 3.x classes unchanged; `skills/magicspec/roles/project-auditor.md` ends its Operating Protocol with the card line of the shared names and `l2-role-cards-governance.md` holds it word for word at the same place; the instruction review (`prompt-engineer`, PQ-6) passes on the changed text; `update-engine-meta` run after the edit
- **Handoff:** T-82W01 names the classes; T-82H01 pins the line and the classes.
- **Notes:** The card and its mirror are one site: both change in this task. The mirror's version and history row are T-82S01's.

### [T-82W01] `analyze.md` on a 4.0 workspace: the audit

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze`; l1-sdd-reference-containment.md RC-7, RC-10; the C21 ventilation the constitution names
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/analyze.md` holds the section of the shared names before `## Task Completion Checklist`, listed in `**Contents:**`, its first paragraph word for word; for the audit (Mode C, and Modes B and D scoped by their argument) it names `node scripts/executor.js check-docs --workspace={active-workspace}` and `node scripts/executor.js analyze-coverage --workspace={active-workspace}` with the lines of T-82C01, the containment classes of T-82R01, the rule units of `rules.md` in place of `RULES.md` §7, the engine integrity check and the engine snapshot unchanged, `@role:project-auditor`, and that the audit writes no document of the set; each finding names the stage that owns it; the text outside the section is byte-identical to before (saved body, section cut out, compared); the instruction review passes; `update-engine-meta` run after the edit
- **Handoff:** T-82W02 adds the reverse mode to the same section; T-82H01 pins it.
- **Notes:** The section is placed before the checklist because the body has no finalization section. A 3.x registry repair has no 4.0 counterpart: a set has no registry.

### [T-82W02] `analyze.md` on a 4.0 workspace: the reverse mode

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze` (the reverse mode, the lab's method), §5.5 (the migration's split relies on it); l1-sdd-document-set.md §5.5, §5.7, §5.8
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the section of T-82W01 gains the reverse mode (Mode A on a 4.0 workspace with code and no `product.md`): the neutral layer, its cross-stack review and the stack layer written by the steps of `workflows/spec.md` §On a 4.0 Workspace with the code as the source; the milestones and tasks by those of `plan.md` and `task.md`; then the replay in place of a build — each task's `Observe` run against the existing code and the task recorded done in `memory/state.md` only when it holds, each milestone recorded by `node scripts/executor.js mark-built M{n} --workspace={active-workspace}` once its `Observed by` holds; a failing observation written as an `- Open:` line on the unit it concerns, never a change of the code; `check-docs` after each layer; a workspace that already holds `product.md` is not reverse-written; the text outside the section unchanged; the instruction review passes; `update-engine-meta` run after the edit
- **Handoff:** T-82H01 pins it; T-82Y01 traces it.
- **Notes:** The reverse mode writes no map row itself: `mark-built` stays the map's one writer.

### [T-82H01] Harness cases for the map comparison, the classes, the card and the section

- **Spec:** l2-test-suite.md; l2-sdd-document-set-engine.md §5.2, §5.4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — the map comparison's missing path, uncovered file, absent map and excluded folders on copies of the `good` fixture; `analyze` in `BODY_SECTIONS` with `check-docs`, `analyze-coverage` and `mark-built M{n}`, the role `project-auditor`, the place `Task Completion Checklist` and the phrases of its row; the auditor card in the role-card case; the 4.0 classes in `containment.md`; each fails with its change removed (`scripts/mutation-check.js` CAUGHT); the existing `analyze-coverage` and containment cases pass unedited
- **Handoff:** T-82T01.
- **Notes:** The body is named `analyze`, so `checklist('Task')` gives its place.

### [T-82Y01] The `pipeline` and `quality` scenarios of the analysis

- **Spec:** l1-product-simulation.md SM-3, SM-4; the section of T-82W01 and T-82W02
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/pipeline.md` holds a scenario *an existing project with no documents on a 4.0 workspace gets a set written from its code, every task observed on that code and every milestone recorded built*, and `quality.md` *an audit of a 4.0 workspace reports a map row whose path is gone, a file no map row covers and a product file that names a task address, and writes nothing*, numbered after the last scenario of the files, each step tagged and citing what it is judged against; a traced run holds every step, the scripts' steps checked against their real output on a copy of the `good` fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-82S01.
- **Notes:** Traced, not live, as in Phases 80 and 81.

### [T-82S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.6.1 (§5.2, §5.4, §5.6 step 4); l1-sdd-reference-containment.md (the 4.0 branch the concept's §6 declares); l2-engine-automation.md; l2-role-cards-governance.md; l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the realization records the map comparison, the analysis section and the reverse mode as built; the containment specification states its 4.0 classes, the 3.x contract unchanged; the card mirror's version and history row follow T-82R01; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-82T01.
- **Notes:** As-built patches of a declared supersession, as in Phase 81.

### [T-82T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; every shipped body over 100 lines keeps its contents list; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec spec engine` for the two findings Phase 85 waits on
- **Handoff:** `/magicspec spec engine`.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
