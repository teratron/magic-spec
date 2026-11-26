---
phase: 81
name: "The Remaining Command Bodies on a 4.0 Workspace (4.0 Step 4, Part 2)"
status: Todo
subsystem: "skills/magicspec (scripts: update-state, resume-state, lib/goal-block; workflows: goal, fix, simulate, status, rule, graph, sync, help), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 71: the scripts of the remaining commands on a 4.0 workspace (graph, wiki, index, coverage, sync, the three writers; engine 3.0.206)"
  - "Phase 80: the On a 4.0 Workspace sections of spec, plan, task and run, whose opening paragraph and placement these sections repeat"
  - "The specifications: l1-sdd-document-set 1.6.0, l2-sdd-document-set-engine 1.6.0, l1-session-continuity 2.6.3, l1-goal-mode, l1-fix-command, l1-product-simulation, l1-sync-command, Stable at registry 1.105.0, constitution 2.0.0, plan 1.95.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 81 Tasks — The Remaining Command Bodies on a 4.0 Workspace (4.0 Step 4, Part 2)

**Phase:** 81
**Status:** Todo
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

- [ ] [T-81M01] `update-state` writes and removes the goal file of a 4.0 workspace
- [ ] [T-81M02] `resume-state` reads the goal file and spells milestone scopes
- [ ] [T-81W01] `goal.md` on a 4.0 workspace
- [ ] [T-81W02] `fix.md` and `simulate.md` on a 4.0 workspace
- [ ] [T-81W03] `status.md`, `rule.md` and `help.md` on a 4.0 workspace
- [ ] [T-81W04] `graph.md` and `sync.md` on a 4.0 workspace
- [ ] [T-81H01] Harness cases for the goal file and the eight sections
- [ ] [T-81Y01] The `routing` and `quality` scenarios of a 4.0 workspace
- [ ] [T-81S01] The specifications as built
- [ ] [T-81T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-81M01] `update-state` writes and removes the goal file of a 4.0 workspace

- **Spec:** l1-sdd-document-set.md §5.7 (`goal.md`); l2-sdd-document-set-engine.md §5.1, §5.3 (no template, the engine writes it); l1-goal-mode.md GM-3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `update-state --goal-file {json}` writes `memory/goal.md` with the text of the shared names and prints its line, `--goal-clear` removes it, a refused goal writes nothing and exits 1, any other flag prints the Phase 71 line and writes nothing; on this repository the goal section of `STATE.md` is written and removed exactly as before (a 3.x comparison on a frozen copy); `update-engine-meta` run after the edit
- **Handoff:** T-81M02 reads the file; T-81W01 names the command; T-81H01 pins it.
- **Notes:** `writesStateInto` of Phase 71 narrows to the flags that write `STATE.md`; the goal checks stay in `lib/goal-block.js`.

### [T-81M02] `resume-state` reads the goal file and spells milestone scopes

- **Spec:** l1-session-continuity.md SC-1 (the goal file beside the state); l1-goal-mode.md GM-3 (a resume reports the goal)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture with a goal file of milestones 2 to 3, `resume-state` prints one line naming `goal M2..M3` with its criteria counts and `/magicspec goal` as the step when no task is in flight, and `--json` carries the goal; with no goal file the line of Phase 70 is unchanged; `describeScope` spells `phase-{n}` on 3.x; on this repository `resume-state --all` and `--json` are byte-identical to before; `update-engine-meta` run after the edit
- **Handoff:** T-81W01 and T-81W03 read what it prints; T-81H01 pins it.
- **Notes:** After T-81M01, which writes the file the cases read.

### [T-81W01] `goal.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `goal`; l1-sdd-document-set.md §6 (milestone arguments, the goal record); l1-goal-mode.md GM-1 to GM-11
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/goal.md` holds the section of the shared names before `## Goal Completion Checklist`, listed in `**Contents:**`, its first paragraph word for word, naming every item of its row; the text outside it is byte-identical to before (saved body, section cut out, compared); the instruction review (`prompt-engineer`, PQ-6) passes on the section; `update-engine-meta` run after the edit
- **Handoff:** T-81H01 pins it; T-81Y01 traces it.
- **Notes:** The stop conditions and the consent queue are unchanged; the section says only what a milestone, the record and the next step are on a 4.0 workspace.

### [T-81W02] `fix.md` and `simulate.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 rows `fix`, `simulate`; l1-sdd-document-set.md §5.8 (changes, kind `fix`, `satisfied`), §5.7 (scenarios in `simulations/`); l1-fix-command.md; l1-product-simulation.md SM-3, SM-4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** as T-81W01, for both bodies, each section before `## Finalization Protocol (Mandatory)`
- **Handoff:** T-81H01 pins them; T-81Y01 traces `fix`.
- **Notes:** `fix` places the change through the steps `spec`'s section states and builds it through `plan`, `task` and `run`; it writes no unit itself beyond what those steps write.

### [T-81W03] `status.md`, `rule.md` and `help.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `rule, status, graph, sync, help`, §5.1 (the 3.x and 4.0 files); l1-session-continuity.md SC-4 (status is read-only)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** as T-81W01, for the three bodies (`rule` before `## Finalization Protocol (Mandatory)`, the other two before their completion checklist)
- **Handoff:** T-81H01 pins them.
- **Notes:** `status` stays read-only: `check-docs` writes nothing.

### [T-81W04] `graph.md` and `sync.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `rule, status, graph, sync, help`, §5.2 (the graph and `sync` as built); l1-sync-command.md SY-1
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** as T-81W01, for both bodies, each section before its completion checklist
- **Handoff:** T-81H01 pins them.
- **Notes:** `graph.md` has no `**Contents:**` list; its section is only placed.

### [T-81H01] Harness cases for the goal file and the eight sections

- **Spec:** l2-sdd-document-set-engine.md §5.1, §5.4; l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — the goal file written, read by `resume-state`, removed, and a refused goal writing nothing; the eight bodies in `BODY_SECTIONS`, each with its section once at its place, listed in Contents where the body has one, its first paragraph word for word, its scripts; each fails with its change removed (`scripts/mutation-check.js` CAUGHT); the existing goal and shipped-text cases pass unedited
- **Handoff:** T-81T01.
- **Notes:** The case of the four pipeline bodies checks a place before the finalization; the table records each body's place.

### [T-81Y01] The `routing` and `quality` scenarios of a 4.0 workspace

- **Spec:** l1-product-simulation.md SM-3, SM-4; the sections of T-81W01 and T-81W02
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/routing.md` holds a scenario *`goal M3..M5` on a 4.0 workspace records its goal in `memory/goal.md` and stops when the milestones are built*, and `quality.md` *a defect on a 4.0 workspace becomes a change of kind `fix`, placed and built by its milestone*, numbered after the last scenario, each step tagged and citing what it is judged against; a traced run holds every step, the scripts' steps checked against their real output on a copy of the `good` fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-81S01.
- **Notes:** Traced, not live, as in Phase 80.

### [T-81S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.6.0 (§5.4, §5.6 step 4); l1-goal-mode.md, l1-fix-command.md, l1-product-simulation.md (the 4.0 branch the concept's §6 declares); l1-session-continuity.md; l2-engine-automation.md; l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the realization records the eight sections and the goal file as built; the three concept specifications each state their 4.0 branch, the 3.x contract unchanged; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-81T01.
- **Notes:** As-built patches of a declared supersession.

### [T-81T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec plan engine` for Phase 82
- **Handoff:** `/magicspec plan engine`.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
