---
phase: 82
name: "The Analysis on a 4.0 Workspace (4.0 Step 4, Part 3)"
status: Done
subsystem: "skills/magicspec (scripts: analyze-coverage, lib/doc-set-coverage; workflows: analyze; references/rules/containment; roles/project-auditor), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 81: the bodies the reverse mode runs and the goal file (engine 3.0.213), with the maintenance Phase 84 (engine 3.0.217)"
  - "Phases 68, 70, 71 and 80: check-docs and pack, mark-built, analyze-coverage's 4.0 branch, the On a 4.0 Workspace sections of spec, plan, task and run"
  - "The specifications: l2-sdd-document-set-engine 1.6.1, l1-sdd-document-set 1.6.0, l1-sdd-reference-containment, l2-engine-automation, l2-role-cards-governance, Stable at registry 1.106.0, constitution 2.0.0, plan 1.97.0"
provides:
  - "analyze-coverage on a 4.0 workspace compares memory/map.md with the files of the scope"
  - "analyze carries an On a 4.0 Workspace section: the audit and the reverse mode that writes a set from existing code"
  - "the containment classes of a 4.0 workspace in the reference rule; the project-auditor line and its mirror"
  - "scenarios S-18 and S-19; harness 523 (document-set 59); engine 3.0.220; specifications as built at registry 1.107.1"
key_files:
  created: []
  modified:
    - skills/magicspec/scripts/analyze-coverage.js
    - skills/magicspec/scripts/check-docs.js
    - skills/magicspec/scripts/lib/doc-set-coverage.js
    - skills/magicspec/workflows/analyze.md
    - skills/magicspec/references/rules/containment.md
    - skills/magicspec/roles/project-auditor.md
    - tests/engine/document-set.js
    - .magicspec/engine/simulations/pipeline.md
    - .magicspec/engine/simulations/quality.md
patterns_established:
  - "A rule class that an ordinary product word can match is judged by the self-containment test, never reported unconditionally"
duration_minutes: ~
---

# Stage 82 Tasks — The Analysis on a 4.0 Workspace (4.0 Step 4, Part 3)

**Phase:** 82
**Status:** Done
**Strategic Goal:** on a 4.0 workspace `analyze` audits the set against the code without writing a document, and writes a set from existing code by the lab's method, the code recorded built by replaying each task's `Observe` and `mark-built`; on a 3.x workspace every script prints and every body reads as it does today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The map comparison: `analyze-coverage` on a 4.0 workspace prints, after its requirement lines and before its summary line, one line per map row whose path is not in the project, `map:{key}: {path} is missing`, and one line per file of the scope that no map row's path equals or contains, `{file}: no map row`, in path order; the summary line gains `, {m} map path(s) missing, {u} file(s) with no map row`. The scope is the workspace's `scope` in `workspace.json`, or the whole project when it has none; the state folder, the skill folder, the host folders and gitignored files are never scope files, as in the 3.x branch. With no `memory/map.md` the comparison prints nothing and the summary keeps its form.
- The containment classes of a 4.0 workspace: the addresses of concept §5.2 that cannot be a word of the product's domain — `M{n}.T{k}`, `{key}.b{n}`, `map:{key}`, `term:{word}`, `asset:{path}` — and the paths of the set (`product.md`, `plan.md`, `changes.md`, `spec/`, `stack/`, `memory/`, beside every `.magicspec/` path) are always findings; the short forms `R{n}`, `S{n}`, `P{n}`, `X{n}`, `D{n}`, `C{n}`, `M{n}` and a bare requirement address `{key}.{n}` are findings only after the self-containment test, as prose phase designators are on 3.x; a component key used as a name where the bindings use it is no finding (I13).
- The section of the body: `## On a 4.0 Workspace` of `workflows/analyze.md`, immediately before `## Task Completion Checklist`, named in its `**Contents:**` list at the same place; its first paragraph word for word the one of Phases 80 and 81.
- The card line of `project-auditor`, closing its Operating Protocol and mirrored word for word in `l2-role-cards-governance.md`: `On a 4.0 workspace the audit reads units, the map and the code: the check-docs report, the map compared with the code by analyze-coverage, and the product scanned for the addresses and paths of the set.`
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`; `BODY_SECTIONS` gains `analyze`. The module held 1,826 lines at the start of the phase and stays under the layout bound of 2,500.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-82C01] `analyze-coverage` compares the map with the code on a 4.0 workspace
- [x] [T-82R01] The containment classes and the auditor card of a 4.0 workspace
- [x] [T-82W01] `analyze.md` on a 4.0 workspace: the audit
- [x] [T-82W02] `analyze.md` on a 4.0 workspace: the reverse mode
- [x] [T-82H01] Harness cases for the map comparison, the classes, the card and the section
- [x] [T-82Y01] The `pipeline` and `quality` scenarios of the analysis
- [x] [T-82S01] The specifications as built
- [x] [T-82T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-82C01] `analyze-coverage` compares the map with the code on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze` (the map compared with the code), §5.2 (`analyze-coverage` on a 4.0 workspace); l1-sdd-document-set.md §5.7 (`map.md`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture `analyze-coverage` prints no map line and the summary `…, 0 map path(s) missing, 0 file(s) with no map row` once `src/core.rs` exists and every other file of the scope lies under a map row; with `src/core.rs` removed it prints `map:core: src/core.rs is missing`; with `src/extra.rs` added it prints `src/extra.rs: no map row`; with no `memory/map.md` it prints no map line; files under the state folder, the skill folder and gitignored ones are never listed; on this repository's 3.x workspace its output is byte-identical to before (a comparison on a frozen copy); `update-engine-meta` run after the edit
- **Handoff:** T-82W01 names the command and its lines; T-82H01 pins them.
- **Notes:** The comparison lives in `lib/doc-set-coverage.js`, reading the map with the reader `mark-built` writes for (no second parser). A path a row names may be a file or a folder; a file is covered when it equals that path or lies under it. Reuse the 3.x branch's exclusion of the state, skill and host folders and of gitignored files instead of writing a second walk.
- **Changes:** `check-docs` reads `memory/map.md` in one function (`parseMap`) that also keeps each row's `Where` path; `lib/doc-set-coverage.js` compares the rows with the files of the scope that `analyze-coverage` already walks (build noise and gitignored files out, and beside them the state folder, the engine folder inside the project and the host folders) and prints `map:{key}: {path} is missing`, `{file}: no map row` and the two counts in the summary; with no map the output is as before, and `--json` gains a `map` key only when there is one. Probes on a copy of the `good` fixture held (missing path, uncovered file, ignored and host files, folder and dash rows, no map, a scope); the 3.x output and JSON on a frozen copy of this repository are identical to the engine before. Finding on the workbook: the shared names say the 3.x branch excludes the skill and host folders, which it does not (it classifies the skill folder as source), so the exclusion is the 4.0 branch's own. A row whose path is `.` holds every file, as the shared names state. Engine updated by C14.

### [T-82R01] The containment classes and the auditor card of a 4.0 workspace

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-2.1, RC-7 (the classes the concept's §6 declares superseded on a 4.0 workspace); l1-sdd-document-set.md §5.2, I13; l2-role-cards-governance.md `project-auditor`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/references/rules/containment.md` states the classes of the shared names for a 4.0 workspace, the 3.x classes unchanged; `skills/magicspec/roles/project-auditor.md` ends its Operating Protocol with the card line of the shared names and `l2-role-cards-governance.md` holds it word for word at the same place; the instruction review (`prompt-engineer`, PQ-6) passes on the changed text; `update-engine-meta` run after the edit
- **Handoff:** T-82W01 names the classes; T-82H01 pins the line and the classes.
- **Notes:** The card and its mirror are one site: both change in this task. The mirror's version and history row are T-82S01's.
- **Changes:** `references/rules/containment.md` states the classes a project with a 4.0 workspace adds (a task `M{n}.T{k}`, a binding unit of a component, `map:`, `term:` and `asset:` always; the short addresses, a requirement address and the set's file and folder names after the self-containment test; a component key used as a name never), the 3.x classes unchanged; the `project-auditor` card ends its Operating Protocol with its 4.0 line and `l2-role-cards-governance.md` holds it word for word. Departure from the shared names, decided at the Decision Review: the set's file and folder names written without the state folder are judged by the self-containment test, not unconditional, because `spec/` is a test folder in many products and `plan.md` or `product.md` an ordinary document; every `.magicspec/` path stays unconditional. Instruction review: PASS-WITH-REWRITES, applied (the component `{key}` is a component of the set). Engine updated by C14.

### [T-82W01] `analyze.md` on a 4.0 workspace: the audit

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze`; l1-sdd-reference-containment.md RC-7, RC-10; the C21 ventilation the constitution names
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/analyze.md` holds the section of the shared names before `## Task Completion Checklist`, listed in `**Contents:**`, its first paragraph word for word; for the audit (Mode C, and Modes B and D scoped by their argument) it names `node scripts/executor.js check-docs --workspace={active-workspace}` and `node scripts/executor.js analyze-coverage --workspace={active-workspace}` with the lines of T-82C01, the containment classes of T-82R01, the rule units of `rules.md` in place of `RULES.md` §7, the engine integrity check and the engine snapshot unchanged, `@role:project-auditor`, and that the audit writes no document of the set; each finding names the stage that owns it; the text outside the section is byte-identical to before (saved body, section cut out, compared); the instruction review passes; `update-engine-meta` run after the edit
- **Handoff:** T-82W02 adds the reverse mode to the same section; T-82H01 pins it.
- **Notes:** The section is placed before the checklist because the body has no finalization section. A 3.x registry repair has no 4.0 counterpart: a set has no registry.
- **Changes:** `workflows/analyze.md` gains *On a 4.0 Workspace* before its checklist, named in Contents: the audit runs the Mode C steps that read no registry as written (self-check, router, phantom-command, setting and link checks, containment, scaffold boundary, prompt quality, coherence, graph, communities, documentation, blind spots, wiki), `check-docs` and `analyze-coverage` with each finding's owning stage, the containment classes of a set, the set's rule units in place of a workspace `RULES.md` beside the global constitution, `@role:project-auditor`, the engine snapshot, and writes no document of the set. The text outside the section is unchanged. Instruction review: PASS-WITH-REWRITES, applied (the link-integrity and parity checks of Mode C named, the rationale audit declared not applying). Engine updated by C14.

### [T-82W02] `analyze.md` on a 4.0 workspace: the reverse mode

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `analyze` (the reverse mode, the lab's method), §5.5 (the migration's split relies on it); l1-sdd-document-set.md §5.5, §5.7, §5.8
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the section of T-82W01 gains the reverse mode (Mode A on a 4.0 workspace with code and no `product.md`): the neutral layer, its cross-stack review and the stack layer written by the steps of `workflows/spec.md` §On a 4.0 Workspace with the code as the source; the milestones and tasks by those of `plan.md` and `task.md`; then the replay in place of a build — each task's `Observe` run against the existing code and the task recorded done in `memory/state.md` only when it holds, each milestone recorded by `node scripts/executor.js mark-built M{n} --workspace={active-workspace}` once its `Observed by` holds; a failing observation written as an `- Open:` line on the unit it concerns, never a change of the code; `check-docs` after each layer; a workspace that already holds `product.md` is not reverse-written; the text outside the section unchanged; the instruction review passes; `update-engine-meta` run after the edit
- **Handoff:** T-82H01 pins it; T-82Y01 traces it.
- **Notes:** The reverse mode writes no map row itself: `mark-built` stays the map's one writer.
- **Changes:** The same section holds the reverse mode (`analyze first-time` on a workspace with code and no `product.md`): the neutral layer, review and stack layer by `spec`'s step 2 from the code; the memory files from their templates before anything records into them; milestones by `plan`'s section and the tasks of every milestone by `task`'s, each packed; the replay of each `Observe` against the existing code, done only when all hold, else an `Open` line; `mark-built` per milestone, the map's one writer; the checker after each layer; a workspace with `product.md` or no code is left to `spec`. Instruction review: PASS. Engine updated by C14.

### [T-82H01] Harness cases for the map comparison, the classes, the card and the section

- **Spec:** l2-test-suite.md; l2-sdd-document-set-engine.md §5.2, §5.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — the map comparison's missing path, uncovered file, absent map and excluded folders on copies of the `good` fixture; `analyze` in `BODY_SECTIONS` with `check-docs`, `analyze-coverage` and `mark-built M{n}`, the role `project-auditor`, the place `Task Completion Checklist` and the phrases of its row; the auditor card in the role-card case; the 4.0 classes in `containment.md`; each fails with its change removed (`scripts/mutation-check.js` CAUGHT); the existing `analyze-coverage` and containment cases pass unedited
- **Handoff:** T-82T01.
- **Notes:** The body is named `analyze`, so `checklist('Task')` gives its place.
- **Changes:** `tests/engine/document-set.js`: `analyze` in `BODY_SECTIONS` with its four calls, six phrases, the `project-auditor` role and the place before its checklist; the auditor line and its mirror in the role-card case, renamed from three cards to the role cards; a case for the containment section; a case for the map comparison (missing path, uncovered file, JSON key, engine, host and gitignored files, a folder row, a row with no path, a scope, no map). The earlier 4.0 coverage case is edited, because its fixture's map names a file the project lacks; the 3.x cases are unedited. `node --test --test-name-pattern="document set" tests/engine.js`: 59 of 59 pass. Mutation check: 8 of 8 CAUGHT. The module holds 1,944 lines.

### [T-82Y01] The `pipeline` and `quality` scenarios of the analysis

- **Spec:** l1-product-simulation.md SM-3, SM-4; the section of T-82W01 and T-82W02
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/pipeline.md` holds a scenario *an existing project with no documents on a 4.0 workspace gets a set written from its code, every task observed on that code and every milestone recorded built*, and `quality.md` *an audit of a 4.0 workspace reports a map row whose path is gone, a file no map row covers and a product file that names a task address, and writes nothing*, numbered after the last scenario of the files, each step tagged and citing what it is judged against; a traced run holds every step, the scripts' steps checked against their real output on a copy of the `good` fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-82S01.
- **Notes:** Traced, not live, as in Phases 80 and 81.
- **Changes:** `simulations/pipeline.md` gains S-18 (a set written from existing code) and `quality.md` S-19 (an audit of a 4.0 workspace). Traced run: each step held against the section it cites; the script steps matched real output on copies of the `good` fixture — `check-docs` 0 findings, the pack within budget, `M2 built: map 1 rows` with the new row `map:hello | src | hello.rs`, no product file changed, and for the audit `map:core: src/core.rs is missing`, `src/extra.rs: no map row`, the two counts, nothing written by either script. `Last run` stays `never`: traced, not live. Finding recorded for the specifications: `mark-built` writes a component's `Where` as the common folder of its files, so a file added under that folder is held by the row and never reported (in the trace `src/extra.rs` under the `src` row went unreported). `node --test --test-name-pattern="simulation" tests/engine.js` passes.

### [T-82S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.6.1 (§5.2, §5.4, §5.6 step 4); l1-sdd-reference-containment.md (the 4.0 branch the concept's §6 declares); l2-engine-automation.md; l2-role-cards-governance.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the realization records the map comparison, the analysis section and the reverse mode as built; the containment specification states its 4.0 classes, the 3.x contract unchanged; the card mirror's version and history row follow T-82R01; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-82T01.
- **Notes:** As-built patches of a declared supersession, as in Phase 81.
- **Changes:** Six specifications patched, Stable retained, no requirement changed: `l2-sdd-document-set-engine.md` 1.7.1 (the map comparison with its blind spot, the `analyze` section as built, step 4 marked built), `l1-sdd-reference-containment.md` 1.8.4 (the 4.0 classes, the 3.x contract unchanged), `l2-role-cards-governance.md` 1.4.12, `l2-engine-automation.md` 1.33.5, `l2-test-suite.md` 1.48.16 and, beyond the entry's list because the scenario count went stale, `l1-product-simulation.md` 1.1.6; registry 1.107.1 with its entry. `check-prerequisites --verify-headers` reports no drift (the one warning is the plan behind the new registry version); `export-wiki` run.

### [T-82T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; every shipped body over 100 lines keeps its contents list; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec spec engine` for the two findings Phase 85 waits on
- **Handoff:** `/magicspec spec engine`.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** `biome check` on the changed scripts and the harness module, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing; `pnpm run audit` exits 0 with 0 dead code and 0 duplication, its one complexity warning inherited (`detectShadowSpecs`, untouched). `analyze.md` keeps its contents list and lists the new section. `node --test tests/engine.js` passes 523 of 523 (a slow run, 25 minutes against about 6 before, every case slower alike, the unchanged ones included, under system load). `update-engine-meta --check` passes at engine 3.0.220. Next: `/magicspec plan engine`, the plan behind registry 1.107.1.
