---
phase: 81
name: "The Remaining Command Bodies on a 4.0 Workspace (4.0 Step 4, Part 2)"
status: Done
subsystem: "skills/magicspec (scripts: update-state, resume-state, lib/goal-block; workflows: goal, fix, simulate, status, rule, graph, sync, help), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 71: the scripts of the remaining commands on a 4.0 workspace (graph, wiki, index, coverage, sync, the three writers; engine 3.0.206)"
  - "Phase 80: the On a 4.0 Workspace sections of spec, plan, task and run, whose opening paragraph and placement these sections repeat"
  - "The specifications: l1-sdd-document-set 1.6.0, l2-sdd-document-set-engine 1.6.0, l1-session-continuity 2.6.3, l1-goal-mode, l1-fix-command, l1-product-simulation, l1-sync-command, Stable at registry 1.105.0, constitution 2.0.0, plan 1.95.0"
provides:
  - "update-state writes and removes memory/goal.md of a 4.0 workspace; resume-state reads it and spells milestone scopes"
  - "goal, fix, simulate, status, rule, graph, sync and help each carry an On a 4.0 Workspace section"
  - "scenarios S-16 (a goal of milestones) and S-17 (a defect becoming a change); the repeated scenario identifier renumbered to S-15"
  - "harness 519 (document-set 56); engine 3.0.213; specifications as built at registry 1.105.1"
key_files:
  created: []
  modified:
    - skills/magicspec/scripts/update-state.js
    - skills/magicspec/scripts/resume-state.js
    - skills/magicspec/scripts/lib/goal-block.js
    - skills/magicspec/workflows/goal.md
    - skills/magicspec/workflows/fix.md
    - skills/magicspec/workflows/simulate.md
    - skills/magicspec/workflows/status.md
    - skills/magicspec/workflows/rule.md
    - skills/magicspec/workflows/graph.md
    - skills/magicspec/workflows/sync.md
    - skills/magicspec/workflows/help.md
    - tests/engine/document-set.js
    - .magicspec/engine/simulations/pipeline.md
    - .magicspec/engine/simulations/routing.md
    - .magicspec/engine/simulations/quality.md
patterns_established:
  - "A goal record has one renderer and one parser: a 3.x STATE.md section and the 4.0 memory/goal.md hold the same text"
  - "A section added to a shipped body is checked against the 100-line contents-list rule"
duration_minutes: 27
---

# Stage 81 Tasks — The Remaining Command Bodies on a 4.0 Workspace (4.0 Step 4, Part 2)

**Phase:** 81
**Status:** Done
**Strategic Goal:** on a 4.0 workspace a goal is recorded in `memory/goal.md` and resumed from it, and `goal`, `fix`, `simulate`, `status`, `rule`, `graph`, `sync` and `help` each carry a section that tells the agent what to do there; on a 3.x workspace every body reads, word for word, as it does today and the goal section of `STATE.md` is written as before.

**Shared names (fixed here so no two tasks choose different spellings):**

- The goal file: `memory/goal.md` of a 4.0 workspace holds exactly the text `renderGoalSection` of `lib/goal-block.js` renders (the `## Goal` heading, its comment and its lines), followed by one newline, so `parseGoalSection` reads it as it reads `STATE.md`. It exists only while a goal is recorded. Its one writer is `update-state`.
- `update-state` on a 4.0 workspace: `--goal-file` writes the goal file and prints `[update-state] memory/goal.md written`; `--goal-clear` removes it and prints `[update-state] memory/goal.md removed` (or nothing to remove: `[update-state] memory/goal.md absent; nothing removed`); every other flag keeps the line of Phase 71, `[update-state] {workspace} is a 4.0 workspace: its state is memory/state.md; nothing written.`, printed once when any such flag is given. A goal that `normalizeGoal` refuses is refused as on 3.x, nothing written.
- A goal's milestones: the goal object keeps its `phase` and `phaseTo` numbers; on a 4.0 workspace they are milestone numbers, and the scope is spelled `M{n}` and `M{n}..M{m}` wherever it is shown (`describeScope` takes the format, the 3.x spelling `phase-{n}` unchanged).
- The section of each body: `## On a 4.0 Workspace`, placed immediately before `## Finalization Protocol (Mandatory)` where the body has one (`fix`, `simulate`, `rule`), and otherwise immediately before the body's completion checklist heading (`## Goal Completion Checklist`, `## Status Completion Checklist`, `## Graph Completion Checklist`, `## Sync Completion Checklist`, `## Help Completion Checklist`); named in the body's `**Contents:**` list at the same place where the body has one. Its first paragraph is, word for word, the one of Phase 80: `Taken when the resolved workspace's entry in \`workspace.json\` carries \`"format": "4"\`; the steps below replace the workflow steps above, and every other section of this body applies unchanged. On any other workspace this section is skipped.`
- What each section names (its row of `l2-sdd-document-set-engine.md` §5.4): `goal` — the arguments `M{n}`, `M{n}..M{m}`, `plan`, `{N} tasks` and a statement; the record through `update-state --goal-file` into `memory/goal.md`, removed with `--goal-clear`; each step the command the finalization names, the stop conditions unchanged. `fix` — a defect recorded in `changes.md` as a change of kind `fix` by the three steps of `workflows/spec.md` §On a 4.0 Workspace, or `satisfied` when the units and the code already answer it; the repair built by its milestone, the regression check its `Observe`; `check-docs`. `simulate` — scenarios in `simulations/{area}.md`, written from scope items and Accept lines, each naming its milestone; a failed step handed to `fix`. `status` — `resume-state` and `memory/state.md`, the goal from `memory/goal.md`, the checker's report through `check-docs`; read-only as on 3.x. `rule` — a workspace rule is a unit `R{n}` of `rules.md` (from `templates/set/rules.md`), with `From` written by the plan stage; the global constitution `.magicspec/RULES.md` unchanged. `graph` — `build-spec-graph` and `export-wiki` as Phase 71 built them, units and addresses as nodes. `sync` — the derived state of a set (the `Next` line, the checker's findings with their owning command); no registry area. `help` — the milestone forms of `goal`.
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`; the four bodies' table `BODY_SECTIONS` gains the eight bodies of this phase, each with the scripts its section runs and, where a role is named, the role. The module held 1,641 lines at the start of the phase and stays under the layout bound of 2,500.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-81M01] `update-state` writes and removes the goal file of a 4.0 workspace
- [x] [T-81M02] `resume-state` reads the goal file and spells milestone scopes
- [x] [T-81W01] `goal.md` on a 4.0 workspace
- [x] [T-81W02] `fix.md` and `simulate.md` on a 4.0 workspace
- [x] [T-81W03] `status.md`, `rule.md` and `help.md` on a 4.0 workspace
- [x] [T-81W04] `graph.md` and `sync.md` on a 4.0 workspace
- [x] [T-81H01] Harness cases for the goal file and the eight sections
- [x] [T-81Y01] The `routing` and `quality` scenarios of a 4.0 workspace
- [x] [T-81S01] The specifications as built
- [x] [T-81T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-81M01] `update-state` writes and removes the goal file of a 4.0 workspace

- **Spec:** l1-sdd-document-set.md §5.7 (`goal.md`); l2-sdd-document-set-engine.md §5.1, §5.3 (no template, the engine writes it); l1-goal-mode.md GM-3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `update-state --goal-file {json}` writes `memory/goal.md` with the text of the shared names and prints its line, `--goal-clear` removes it, a refused goal writes nothing and exits 1, any other flag prints the Phase 71 line and writes nothing; on this repository the goal section of `STATE.md` is written and removed exactly as before (a 3.x comparison on a frozen copy); `update-engine-meta` run after the edit
- **Handoff:** T-81M02 reads the file; T-81W01 names the command; T-81H01 pins it.
- **Notes:** `writesStateInto` of Phase 71 narrows to the flags that write `STATE.md`; the goal checks stay in `lib/goal-block.js`.
- **Changes:** `update-state` on a 4.0 workspace writes `memory/goal.md` (`--goal-file`) and removes it (`--goal-clear`) under the workspace's state lock, answers every other flag with the Phase 71 line, and refuses a goal as on 3.x; `lib/goal-block.js` names the path (`GOAL_FILE`). Probe on a copy of the `good` fixture held, a refused goal changed only the diagnostics sink; the same four writes on a frozen 3.x copy were identical to the pre-change engine. Engine 3.0.208.

### [T-81M02] `resume-state` reads the goal file and spells milestone scopes

- **Spec:** l1-session-continuity.md SC-1 (the goal file beside the state); l1-goal-mode.md GM-3 (a resume reports the goal)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture with a goal file of milestones 2 to 3, `resume-state` prints one line naming `goal M2..M3` with its criteria counts and `/magicspec goal` as the step when no task is in flight, and `--json` carries the goal; with no goal file the line of Phase 70 is unchanged; `describeScope` spells `phase-{n}` on 3.x; on this repository `resume-state --all` and `--json` are byte-identical to before; `update-engine-meta` run after the edit
- **Handoff:** T-81W01 and T-81W03 read what it prints; T-81H01 pins it.
- **Notes:** After T-81M01, which writes the file the cases read.
- **Changes:** `resume-state` reads `memory/goal.md` beside `memory/state.md` on a 4.0 workspace (a goal alone is reported even with no state file), names the goal beside a task being built and otherwise names `/magicspec goal` as the step; `describeScope` takes the format and spells `M{n}` and `M{n}..M{m}`, the 3.x spelling unchanged. Probes: a copy of the `good` fixture with a goal of M2..M3 held for a task in flight, nothing in flight, an open question and no state file; with no goal the line is the one of before; `resume-state --all` and `--json` byte-identical to the pre-change engine on this repository and on a frozen copy with a goal. Engine 3.0.209.

### [T-81W01] `goal.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `goal`; l1-sdd-document-set.md §6 (milestone arguments, the goal record); l1-goal-mode.md GM-1 to GM-11
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/goal.md` holds the section of the shared names before `## Goal Completion Checklist`, listed in `**Contents:**`, its first paragraph word for word, naming every item of its row; the text outside it is byte-identical to before (saved body, section cut out, compared); the instruction review (`prompt-engineer`, PQ-6) passes on the section; `update-engine-meta` run after the edit
- **Handoff:** T-81H01 pins it; T-81Y01 traces it.
- **Notes:** The stop conditions and the consent queue are unchanged; the section says only what a milestone, the record and the next step are on a 4.0 workspace.
- **Changes:** `workflows/goal.md` gains *On a 4.0 Workspace* before its checklist, named in Contents: milestone arguments, the active milestone as default, the record in `memory/goal.md` through `update-state --goal-file` and `--goal-clear`, one criterion per milestone goal, the next-step table (spec, simulate, fix, the finalization's step), a one-task `run` under a limit, progress, queued consent as an `Open` line, the report scope. The text outside the section is unchanged (compared with the body as it was). Instruction review: PASS-WITH-REWRITES, applied (statement criteria, consent queuing and the first `spec` run named). Engine 3.0.210.

### [T-81W02] `fix.md` and `simulate.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 rows `fix`, `simulate`; l1-sdd-document-set.md §5.8 (changes, kind `fix`, `satisfied`), §5.7 (scenarios in `simulations/`); l1-fix-command.md; l1-product-simulation.md SM-3, SM-4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-81W01, for both bodies, each section before `## Finalization Protocol (Mandatory)`
- **Handoff:** T-81H01 pins them; T-81Y01 traces `fix`.
- **Notes:** `fix` places the change through the steps `spec`'s section states and builds it through `plan`, `task` and `run`; it writes no unit itself beyond what those steps write.
- **Changes:** `workflows/fix.md` and `workflows/simulate.md` each gain *On a 4.0 Workspace* before their finalization, named in Contents: a defect is a change of kind `fix` recorded and placed by `spec`'s steps (`satisfied` when the units and the code answer it), its regression check the `Observe` of the task that builds it; scenarios cite units by address, name their milestone, and their failed steps go to `fix`. The text outside each section is unchanged. Instruction review: PASS. Engine 3.0.211.

### [T-81W03] `status.md`, `rule.md` and `help.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `rule, status, graph, sync, help`, §5.1 (the 3.x and 4.0 files); l1-session-continuity.md SC-4 (status is read-only)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-81W01, for the three bodies (`rule` before `## Finalization Protocol (Mandatory)`, the other two before their completion checklist)
- **Handoff:** T-81H01 pins them.
- **Notes:** `status` stays read-only: `check-docs` writes nothing.
- **Changes:** `workflows/status.md` (read-only: `check-docs`, `resume-state`, `memory/`, the goal line spelled `M{n}`, a closed Next table mirroring the finalization's order), `workflows/rule.md` (a workspace rule is a unit `R{n}`, a stack-only one `S{n}`, `From` left to the plan stage, a change after the first version) and `workflows/help.md` (live memory, the Next line, the milestone forms of `goal`) each gain *On a 4.0 Workspace* before their finalization or checklist; the text outside is unchanged. Instruction review: PASS-WITH-REWRITES, applied (the ready-task definition, the other-workspaces footer, the post-write review, which steps of `help` still apply). Engine 3.0.211.

### [T-81W04] `graph.md` and `sync.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `rule, status, graph, sync, help`, §5.2 (the graph and `sync` as built); l1-sync-command.md SY-1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-81W01, for both bodies, each section before its completion checklist
- **Handoff:** T-81H01 pins them.
- **Notes:** `graph.md` has no `**Contents:**` list; its section is only placed.
- **Changes:** `workflows/graph.md` (units as graph nodes and wiki articles through `build-spec-graph` and `export-wiki`, the 3.x coverage analyses not applying, per-workspace by format) and `workflows/sync.md` (a set's derived state is the `Next` line and the checker's findings with their owning command; no registry area, the map left to `mark-built`) each gain *On a 4.0 Workspace* before their checklist, `sync.md` naming it in Contents; the text outside is unchanged. Instruction review: PASS. Engine 3.0.211.

### [T-81H01] Harness cases for the goal file and the eight sections

- **Spec:** l2-sdd-document-set-engine.md §5.1, §5.4; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — the goal file written, read by `resume-state`, removed, and a refused goal writing nothing; the eight bodies in `BODY_SECTIONS`, each with its section once at its place, listed in Contents where the body has one, its first paragraph word for word, its scripts; each fails with its change removed (`scripts/mutation-check.js` CAUGHT); the existing goal and shipped-text cases pass unedited
- **Handoff:** T-81T01.
- **Notes:** The case of the four pipeline bodies checks a place before the finalization; the table records each body's place.
- **Changes:** `tests/engine/document-set.js`: a case for the goal file (refused whole, written, read by `resume-state` in its four states and in JSON, beside another flag, removed) and `BODY_SECTIONS` extended to the twelve bodies, each entry with the full script tails, the phrases its row of the realization names, its role and the heading it stands before; the four earlier case names are unchanged. `node --test --test-name-pattern="document set" tests/engine.js`: 56 of 56 pass. Mutation check: 15 of 15 CAUGHT. The module holds 1,826 lines.

### [T-81Y01] The `routing` and `quality` scenarios of a 4.0 workspace

- **Spec:** l1-product-simulation.md SM-3, SM-4; the sections of T-81W01 and T-81W02
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/routing.md` holds a scenario *`goal M3..M5` on a 4.0 workspace records its goal in `memory/goal.md` and stops when the milestones are built*, and `quality.md` *a defect on a 4.0 workspace becomes a change of kind `fix`, placed and built by its milestone*, numbered after the last scenario, each step tagged and citing what it is judged against; a traced run holds every step, the scripts' steps checked against their real output on a copy of the `good` fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-81S01.
- **Notes:** Traced, not live, as in Phase 80.
- **Changes:** `simulations/routing.md` gains S-16 (`goal M3..M5` on a 4.0 workspace) and `quality.md` S-17 (a defect becomes a change of kind `fix`). Traced run: every step held against the section and the specification it cites; the printed steps matched the real output on copies of the `good` fixture — `[update-state] memory/goal.md written`, `▶ Resume [docs]: goal M3..M5 — 0 met, 1 open, 0 blocked. Next: /magicspec goal`, `Next: /magicspec task docs`, `All milestones are done — nothing pending`; for the defect the two findings of a change without its milestone, `Next: /magicspec plan docs — deep reasoning`, only `changes.md` differing, 0 findings after the milestone and the task, `1 changes built`, and a `satisfied` fix accepted. `Last run` stays `never`: the run was traced, not live. Fixed in passing: the scenario Phase 80 added repeated the identifier S-4 of `intake.md`; it is S-15 now, identifiers being unique across the files. `node --test --test-name-pattern="simulation" tests/engine.js`: 1 of 1 passes.

### [T-81S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.6.0 (§5.4, §5.6 step 4); l1-goal-mode.md, l1-fix-command.md, l1-product-simulation.md (the 4.0 branch the concept's §6 declares); l1-session-continuity.md; l2-engine-automation.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the realization records the eight sections and the goal file as built; the three concept specifications each state their 4.0 branch, the 3.x contract unchanged; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-81T01.
- **Notes:** As-built patches of a declared supersession.
- **Changes:** Seven specifications patched, Stable retained, no requirement changed: `l2-sdd-document-set-engine.md` 1.6.1 (the goal file and the eight sections as built, step 4's bodies marked built), `l1-goal-mode.md` 1.4.2, `l1-fix-command.md` 1.3.2, `l1-product-simulation.md` 1.1.5 (their 4.0 branches, the 3.x contract unchanged), `l1-session-continuity.md` 2.6.4, `l2-engine-automation.md` 1.33.4, `l2-test-suite.md` 1.48.15; registry 1.105.1 with its entry. `check-prerequisites --verify-headers` reports no drift (the one warning is the plan behind the new registry version); `export-wiki` run.

### [T-81T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec plan engine` for Phase 82
- **Handoff:** `/magicspec plan engine`.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Attempts:**
  - `node --test tests/engine.js` → exit 1, 517 of 519: `graph.md` (107 lines) and `status.md` (115) passed 100 lines with their new section and had no contents list, which two shipped-text cases require; each gains one
- **Changes:** `biome check` on the changed scripts and the harness module, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing; `pnpm run audit` exits 0 with 0 dead code and 0 duplication, its two complexity warnings being inherited (`applyStateUpdate`, `runCli`) — the point this phase first added to `runCli` was taken back by choosing the writer by the workspace's format. The first full run was 517 of 519 (see Attempts); `graph.md` and `status.md` gained a contents list, the one change of this phase to text a 3.x workspace reads, and the full run then passed 519 of 519. `update-engine-meta --check` passes at engine 3.0.213. Next: `/magicspec plan engine` for Phase 82.
