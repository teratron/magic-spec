---
phase: 80
name: "The Pipeline Bodies on a 4.0 Workspace (4.0 Step 3, Part 2)"
status: Done
subsystem: "skills/magicspec (workflows: spec, plan, task, run; roles: spec-critic, planner, coder), tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 70: mark-built, check-log and the 4.0 branches of check-prerequisites, resume-state and finalize (engine 3.0.186)"
  - "Phases 68 and 79: check-docs, pack and the templates of the set at concept 1.5.0"
  - "The specifications: l1-sdd-document-set 1.5.0, l2-sdd-document-set-engine 1.5.2, l1-plan-command 2.0.1, l2-role-cards-governance and l2-role-cards-execution, Stable at registry 1.104.2, plan 1.93.0"
provides:
  - "spec, plan, task and run each carry one section for a 4.0 workspace, before their finalization, their 3.x text byte-identical outside it; a change is recorded and placed by spec, planned by plan, tasked by task and built by run"
  - "The spec-critic, planner and coder cards end their protocol with their 4.0 line, their specifications with them"
  - "The pipeline scenario S-4 (idea to mark-built), traced on a set written from an idea"
  - "Repaired: the 4.0 next step follows the stage the set waits for; mark-built's map row takes no task address for a file"
  - "harness 504 (document-set 41); engine 3.0.191; specifications as built at registry 1.104.3"
key_files:
  created: []
  modified:
    - skills/magicspec/workflows/spec.md
    - skills/magicspec/workflows/plan.md
    - skills/magicspec/workflows/task.md
    - skills/magicspec/workflows/run.md
    - skills/magicspec/roles/spec-critic.md
    - skills/magicspec/roles/planner.md
    - skills/magicspec/roles/coder.md
    - skills/magicspec/scripts/finalize.js
    - skills/magicspec/scripts/lib/doc-set-state.js
    - skills/magicspec/scripts/lib/created-files.js
    - tests/engine/document-set.js
    - .magicspec/engine/simulations/pipeline.md
patterns_established:
  - "A 4.0 workflow section replaces the workflow steps of its body and names the 3.x mechanics that do not apply; everything else in the body stays in force"
duration_minutes: 30
---

# Stage 80 Tasks — The Pipeline Bodies on a 4.0 Workspace (4.0 Step 3, Part 2)

**Phase:** 80
**Status:** Done
**Strategic Goal:** `spec`, `plan`, `task` and `run` each carry one section that tells the agent what to do on a 4.0 workspace, through the scripts of Phases 68 to 70 and the concept's own steps; the three role cards the realization names read units, milestones and packs; the `pipeline` scenario traces an idea to a built first milestone; on a 3.x workspace every body reads, word for word, as it does today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The section: `## On a 4.0 Workspace`, placed immediately before `## Finalization Protocol (Mandatory)` of each body, and named in the body's `**Contents:**` list at the same place. Its first paragraph is, word for word: `Taken when the resolved workspace's entry in \`workspace.json\` carries \`"format": "4"\`; the steps below replace the workflow steps above, and every other section of this body applies unchanged. On any other workspace this section is skipped.`
- What each section names (its row of `l2-sdd-document-set-engine.md` §5.4): `spec` — the input pass, the intake survey (E6) and the forecast as in 3.x; `product.md`, `rules.md`, `spec/{key}.md` from `templates/set/`; the cross-stack review (a reader who knows only another stack, `templates/set/neutral-writing.md`, rewrites until a reading repeats no earlier leak, at most three, a leak left as an `Open:` line); the stack layer when the stack is known; an input after the first version recorded as a change in the concept's three steps (record, place, build); `check-docs` after every step; `amend` becoming a change. `plan` — milestones from components, scope items and priorities, the first observed by running the product; `From` on every rule; a change's milestone appended at the end; `check-docs`. `task` — the task file `stack/{stack}/tasks/M{n}.md` of the next milestone from `templates/set/tasks.md`; a binding unit split before the tasks are written; `pack {task}` for every task, each within the budget; a task whose pack holds an `Open:` unit reported not ready; `check-docs`. `run` — the next ready task (the `Next` line `finalize` writes); the builder given the pack file of `pack {task}` and the workspace; the task's `Done when` observed; `memory/state.md` (`Now`, `Done`) and `memory/decisions.md` written; `mark-built {milestone}` when the milestone's tasks are done and its `Observed by` holds; `check-log` after a change is built.
- The card lines, each one sentence added at the end of the card's `## Stance` (or the section that holds the card's operating protocol, where it has no Stance), its specification carrying the same sentence verbatim: `spec-critic` — `On a 4.0 workspace the review reads units and changes: each unit against the concept's forms, each change against its three steps, and the checker's report before any lens.`; `planner` — `On a 4.0 workspace the plan is milestones and the decomposition is tasks: Needs justified, the first milestone observed by running the product, every task's pack within its budget.`; `coder` — `On a 4.0 workspace the builder reads its task's pack and the files of the workspace, and nothing of the documents beyond the pack.`
- The scenario: `.magicspec/engine/simulations/pipeline.md` gains `## S-{next}: An idea on a 4.0 workspace reaches a built first milestone`, each step tagged as printed by a script or composed by the agent and citing the section of a body or of `l2-sdd-document-set-engine.md` it is judged against.
- The harness modules: `tests/engine/document-set.js` (case names beginning `document set:`) for the bodies' sections; the existing card-mirror case of `tests/engine/artifact-index.js` for the cards.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-80W01] `spec.md` on a 4.0 workspace
- [x] [T-80W02] `plan.md` on a 4.0 workspace
- [x] [T-80W03] `task.md` on a 4.0 workspace
- [x] [T-80W04] `run.md` on a 4.0 workspace
- [x] [T-80R01] The `spec-critic` card and its specification
- [x] [T-80R02] The `planner` and `coder` cards and their specification
- [x] [T-80H01] Harness cases for the four sections and the 3.x text around them
- [x] [T-80H02] The card-mirror case gains the three lines
- [x] [T-80Y01] The `pipeline` scenario of a 4.0 workspace
- [x] [T-80S01] The specifications as built
- [x] [T-80T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-80W01] `spec.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `spec`; l1-sdd-document-set.md §5.1 to §5.3 (the documents, units, the neutral writing table and the review), §5.8 (changes in three steps), §5.9 (the checker)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/spec.md` holds the section of the shared names, its first paragraph word for word, naming every item of its row; the `**Contents:**` list names it; the text of the body outside the section is byte-identical to before (the body saved before the edit, the section cut out of the new text, the two compared); the instruction review (`prompt-engineer`, PQ-6) passes on the section; `update-engine-meta` run after the edit
- **Handoff:** T-80W02 to T-80W04 read what it writes; T-80H01 pins it.
- **Notes:** The section directs to the concept and the templates for the forms instead of restating them; at most about forty lines. The 3.x registry, status lifecycle and Post-Update Review do not apply on a 4.0 workspace, and the section says so in one line.
- **Changes:** `spec.md` gained `## On a 4.0 Workspace` (intake as in 3.x; first version: neutral layer, cross-stack review, stack layer; a later input as a change recorded and placed; `check-docs`; handoff), listed in Contents; the text outside it byte-identical to the saved body (compared); instruction review PASS-WITH-REWRITES applied inline; one C14 run for the four body edits, engine 3.0.187

### [T-80W02] `plan.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `plan`; l1-sdd-document-set.md §5.3 (`From`, milestone fields), §5.4, §5.5 (plan rules, the first milestone observed by running the product), §5.8 step 2 (a change's milestone)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-80W01, for `skills/magicspec/workflows/plan.md` and its row
- **Handoff:** T-80H01 pins it.
- **Notes:** The section names `plan.md` of the workspace and `templates/set/plan.md`; the phase plan, its backlog dispositions and the registry's Based-on lines are 3.x only.
- **Changes:** `plan.md` gained the section (pre-flight on `check-docs`, first plan, replan appending a change's milestone, planner review, handoff), listed in Contents; the text outside it byte-identical to the saved body (compared); instruction review PASS-WITH-REWRITES applied inline; one C14 run for the four body edits, engine 3.0.187

### [T-80W03] `task.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `task`; l1-sdd-document-set.md §5.3 (task, the split of a binding unit, `Produces`), §5.6 (the pack and its budget), §5.8 (`Open:` marks)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-80W01, for `skills/magicspec/workflows/task.md` and its row
- **Handoff:** T-80H01 pins it.
- **Notes:** Carries the seam observation of run 1 as the split of concept 1.5.0 §5.3 (PLAN.md Phase 80, planning-surfaced 4).
- **Changes:** `task.md` gained the section (gate, selection including placed changes' milestones, split, task file, pack per task, open questions not ready, handoff), listed in Contents; the text outside it byte-identical to the saved body (compared); instruction review PASS-WITH-REWRITES applied inline; one C14 run for the four body edits, engine 3.0.187

### [T-80W04] `run.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.4 row `run`, §5.2 (`pack`, `mark-built`, `check-log`, `finalize`); l1-sdd-document-set.md §5.4 (the next ready task), §5.6 (the pack, Done before this task as whole files), §5.7 (memory), §5.8 step 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** as T-80W01, for `skills/magicspec/workflows/run.md` and its row; the section says the builder receives the pack file and the workspace and nothing else of the documents
- **Handoff:** T-80H01 pins it.
- **Notes:** The phase workbooks, the ledger, archival and the retrospective's phase snapshot are 3.x only; the section names what takes their place (`memory/state.md`, `mark-built`).
- **Changes:** `run.md` gained the section (pre-flight, next ready task, `pack`, builder given pack file and workspace only, observation, `memory/`, `mark-built` and `check-log` at a milestone's end), listed in Contents; the text outside it byte-identical to the saved body (compared); instruction review PASS-WITH-REWRITES applied inline; one C14 run for the four body edits, engine 3.0.187

### [T-80R01] The `spec-critic` card and its specification

- **Spec:** l2-sdd-document-set-engine.md §5.4 (the roles); l2-role-cards-governance.md (the `spec-critic` card, mirrored verbatim)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/roles/spec-critic.md` ends its Stance (or protocol) section with the card line of the shared names, and `l2-role-cards-governance.md` holds the same sentence in its `spec-critic` card; the role-registry check of `check-prerequisites` reports nothing; `update-engine-meta` run after the edit
- **Handoff:** T-80H02 pins it.
- **Notes:** The plan cites `l2-role-cards-review.md`; the `spec-critic` card is mirrored in `l2-role-cards-governance.md` (checked), which is the file this task changes.
- **Changes:** the `spec-critic` card and `l2-role-cards-governance.md` end the Operating Protocol with the same 4.0 line; instruction review rewrote it ("the concept's forms" and "any lens" name nothing a user install holds) and added the review step the `spec` section had left uncalled; role-registry check reports nothing; `update-engine-meta` run

### [T-80R02] The `planner` and `coder` cards and their specification

- **Spec:** l2-sdd-document-set-engine.md §5.4 (the roles); l2-role-cards-execution.md (the `planner` and `coder` cards, mirrored verbatim)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/roles/planner.md` and `skills/magicspec/roles/coder.md` each carry their card line of the shared names, and `l2-role-cards-execution.md` holds both sentences in its cards; the role-registry check reports nothing; `update-engine-meta` run after the edit
- **Handoff:** T-80H02 pins it.
- **Notes:** One task for both cards, because they share one specification file.
- **Changes:** the `planner` and `coder` cards and `l2-role-cards-execution.md` carry their lines word for word at the end of the Operating Protocol; role-registry check reports nothing; `update-engine-meta` run (engine 3.0.188 with the cards)

### [T-80H01] Harness cases for the four sections and the 3.x text around them

- **Spec:** l2-sdd-document-set-engine.md §5.4; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — each of the four bodies holds the section of the shared names once, before its Finalization Protocol, listed in its Contents, with its first paragraph word for word, naming the scripts of its row (`check-docs`; `pack` in `task` and `run`; `mark-built` and `check-log` in `run`); each case fails with its section removed or misplaced (`scripts/mutation-check.js` CAUGHT); the existing shipped-text cases of the four bodies pass unedited
- **Handoff:** T-80T01.
- **Notes:** The 3.x text is pinned by the existing cases; no new case reads it.
- **Changes:** `document-set` gained five cases (one per body: the section once, right before the finalization, listed in Contents, its first paragraph word for word, its script calls and its role; one for the builder's inputs in `run`); mutation controls 11 of 11 CAUGHT

### [T-80H02] The card-mirror case gains the three lines

- **Spec:** l2-role-cards-governance.md, l2-role-cards-execution.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the card-mirror case of `tests/engine/artifact-index.js` (or a new case beside it) asserts that each of the three cards and its specification hold the card line of the shared names; it fails with a line removed from a card (mutation control CAUGHT)
- **Handoff:** T-80T01.
- **Notes:** —
- **Changes:** a `document set:` case asserts each of the three cards ends its protocol with its line and its specification holds it; card-line mutations CAUGHT. Placed in `document-set.js`, not beside the card-mirror case: `artifact-index.js` has drifted from Biome and, formatted as the repository requires of a changed file, held 3,436 lines against the 2,500 of the layout bound (found by the full run, the file restored); its split is inherited work

### [T-80Y01] The `pipeline` scenario of a 4.0 workspace

- **Spec:** l1-product-simulation.md SM-3, SM-4 (scenarios written and kept with the behaviour); the four sections of T-80W01 to T-80W04
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/pipeline.md` holds the scenario of the shared names, its steps from an idea to `mark-built`, each tagged as printed by a script or composed by the agent and citing the section it is judged against; a traced run of it holds every step (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-80S01.
- **Notes:** Traced, not live: a live run of the pipeline on a 4.0 workspace is the forward gate's method (PLAN.md Phase 80, planning-surfaced 1); the scripts' steps are checked against their real output on a disposable copy of the `good` fixture.
- **Changes:** `pipeline.md` gained S-4 (idea to `mark-built`, six steps and two variants); traced on a disposable copy of a set written from an idea (the lab's run-28 set brought back to each stage boundary): `check-docs` 0 findings at every boundary, five packs within budget, `mark-built` records M1, a placed change gives exactly the three findings the `spec` section names, `finalize` names plan, task, run and plan again at those boundaries. The trace found two defects in the scripts of Phase 70, fixed here with a case and mutation control each: the map row listed the task address of an extends marker as a file (`lib/created-files.js`), and the 4.0 next step ignored the stage the set waited for, naming `task` after the spec stage and after the last milestone (`lib/doc-set-state.js`, `finalize.js`); `simulation` cases pass; engine 3.0.191

### [T-80S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.5.2 (§5.4, §6 item 2, step 3); l1-plan-command.md 2.0.1 (the 4.0 branch its supersession declares); l2-role-cards-governance.md, l2-role-cards-execution.md; l2-test-suite.md (the `document-set` module)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-sdd-document-set-engine.md` records step 3 as built (the four sections and the cards); `l1-plan-command.md` states the 4.0 branch of planning as the concept's §6 declares, the 3.x contract unchanged; the two card specifications record their lines in their history; `l2-test-suite.md` counts the module's cases; each a patch with Stable retained and no requirement changed; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-80T01.
- **Notes:** As-built patches of a declared supersession and of the roles §5.4 already names.
- **Changes:** eight specifications patched as built (`l2-sdd-document-set-engine` 1.5.3, `l1-plan-command` 2.0.2, `l2-engine-finalization` 3.10.2 with the next-step repair, `l2-engine-automation` 1.33.2, `l2-role-cards-governance` 1.4.11, `l2-role-cards-execution` 1.3.4, `l2-test-suite` 1.48.13), registry 1.104.3; `check-prerequisites --verify-headers` reports no drift, only the expected `SYNC_GAP` for the next plan; `export-wiki` run

### [T-80T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is the owner's narrowing of the lifecycle rule through `/magicspec rule` (PLAN.md Phase 80, handoff)
- **Handoff:** `/magicspec rule` (the owner's consent), then Phase 71.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** Biome, typecheck and `fallow dead-code` report nothing on the changed files; `pnpm run audit` exits 0 with inherited complexity findings only (`finalize.js` `main` and `classifyPlanState`, `commands.js` `validateEntry`); the full harness 504 of 504 on the second run (the first failed one layout case, repaired under T-80H02); `update-engine-meta --check` passes at engine 3.0.191 (six C14 runs, the four body edits sharing the first); next step after this phase: `/magicspec plan` for the registry the plan is behind, then the owner's `/magicspec rule`
