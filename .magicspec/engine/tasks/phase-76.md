---
phase: 76
name: "The Forward Gate, Run 3 (4.0 Step 2)"
status: Todo
subsystem: "the documentation lab's run folder (runs/run-27-state), .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 75: the containment line in every pack, the templates of concept 1.2.0, neutral-writing.md with the repeated review (engine 3.0.172)"
  - "Phases 69 and 74: runs 1 and 2, their plans and prompts (../sdd-lab/runs/run-25-state, run-26-state) and the record (simulations/forward-gate.md)"
  - "The specifications: l1-sdd-document-set 1.2.0 and l2-sdd-document-set-engine 1.2.1, Stable at registry 1.101.1, plan 1.89.1"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 76 Tasks — The Forward Gate, Run 3 (4.0 Step 2)

**Phase:** 76
**Status:** Todo
**Strategic Goal:** The forward gate is run a third time on the idea, the stack and the seven criteria of runs 1 and 2, unchanged, with concept 1.2.0 and engine 3.0.172, every stage from the spec stage on and the review stage repeated as the concept now says; the verdict decides whether Phases 70 and 71 may start.

**Shared names (fixed here so no two tasks choose different spellings):**

- The run folder: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-27-state\`, the layout of `run-26-state` (`plan.md`, `prompts.md`, `inputs/`, `ws/`, `reports/`, `packs/`, `observe/`, `rounds.md`, `summary.md`). The workspace of the set is `ws/.magicspec/app/`; the engine in `ws` is a copy of this repository's `skills/magicspec/` at 3.0.172, at `ws/.agents/skills/magicspec/`.
- The inputs every documenting agent receives: `inputs/concept.md` (`l1-sdd-document-set.md` 1.2.0 with the record of earlier runs removed — the Document History, the sentences of §1 and C-3 and the bullet of §7 that report them, and the change markers — and §5 and §6 identical apart from the markers), `inputs/templates/` (the thirteen templates of `templates/set/`) and `inputs/neutral-writing.md`.
- The review rounds: reading `reports/review.md`; then for round {r} = 1, 2, 3, the rewrite `reports/review-fix-{r}.md` and the fresh reading `reports/review-{r+1}.md`. The review ends at the first reading that lists none of the leaks the readings before it listed, or after the third rewrite.
- The model of every agent: Claude Sonnet 5.5, as in runs 1 and 2.
- The record: a section `## Run 3` appended to `.magicspec/engine/simulations/forward-gate.md`; the sections of runs 1 and 2 are not edited.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-76A01] Carry the idea, the stack and the criteria into run 3, unchanged
- [ ] [T-76A02] Prepare the run folder, the engine copy, the inputs of 1.2.0 and the prompts
- [ ] [T-76D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea
- [ ] [T-76D02] Review stage: rewrite and fresh reading repeated until no earlier leak is listed
- [ ] [T-76D03] Stack stage: the documenter writes the stack layer
- [ ] [T-76D04] Plan stage: the planner writes the milestones and adds each rule's `From`
- [ ] [T-76D05] Tasks stage: the task writer writes the tasks of the first milestone
- [ ] [T-76B01] Build stage: one clean builder per task of the first milestone, each from its pack
- [ ] [T-76O01] Observe the first milestone on what the builders built
- [ ] [T-76R01] Trace every loss, compare with runs 1 and 2 and give the verdict
- [ ] [T-76R02] Append run 3 to the record
- [ ] [T-76S01] The specifications record the result
- [ ] [T-76T01] Validation: the record, the run set, the lab tools, the engine

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-76A01] Carry the idea, the stack and the criteria into run 3, unchanged

- **Spec:** l1-sdd-document-set.md C-3 (a third run on the same idea); l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `runs/run-27-state/plan.md` exists; its sections a (the idea), b (the stack) and d (the criteria) are byte-identical to those of `runs/run-26-state/plan.md` and so of run 25 (a `node` comparison prints `same` three times); its heading names run 27 and run 3 of the gate; section f lists every change from run 26 and nothing else
- **Handoff:** T-76A02 builds the inputs from it; T-76R01 applies the criteria as written.
- **Notes:** The changes of section f are the inputs (concept 1.2.0, engine 3.0.172) and the review stage that loops (concept §5.3). Criterion 6 is applied as written (PLAN.md Phase 76, forecast assumption): an owner's change of it, given before this task, is written into section d with its date and the run is then not comparable on that criterion, which the summary says.

### [T-76A02] Prepare the run folder, the engine copy, the inputs of 1.2.0 and the prompts

- **Spec:** l2-sdd-document-set-engine.md §5.2, §5.3; run 26's `prompts.md`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `ws/.agents/skills/magicspec/.version` reads `3.0.172` and its `templates/set/` is byte-identical to this repository's (fourteen files); from `ws`, `check-docs` on the empty set prints its missing-file finding and no stack trace; `inputs/templates/` and `inputs/neutral-writing.md` byte-identical to the shipped files; `inputs/concept.md` as the shared names say, with no match of `run 1`, `Run 2`, `2026-11-24`, `[ADDED]` or `[MODIFIED]`, and its §5 and §6 equal to the specification's apart from the markers (a `node` comparison); `prompts.md` differs from run 26's only in its title, the run folder paths and the review-stage prompts for the rounds (the rewrite prompt naming the reading it answers, the reader prompt naming its report), each difference listed in `Changes`
- **Handoff:** T-76D01 to T-76B01 hand `prompts.md` and `inputs/` to the agents.
- **Notes:** No prompt names an earlier run, its findings or its reports. The rewrite prompt of round {r} gives the agent every earlier reading, so that it rewrites what any reading listed and still stands.

### [T-76D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea

- **Spec:** l1-sdd-document-set.md §5.1–§5.3, §5.8 (where a mark sits)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/` holds `product.md`, `rules.md` and at least one `spec/{key}.md`, written by the documenter (`reports/spec.md`, its report saved verbatim); `check-docs` from `ws` exits 0; `rounds.md` records the first check; every requirement has an `Accept:` line; no rule carries a `From` line
- **Handoff:** T-76D02.
- **Notes:** A fresh agent given the idea (section a) and `inputs/`, nothing else; the orchestrator edits none of its files.

### [T-76D02] Review stage: rewrite and fresh reading repeated until no earlier leak is listed

- **Spec:** l1-sdd-document-set.md I9, §5.3 (the neutral writing table, the review and its repetition)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `reports/review.md` is the first reader's list; for each round the rewrite's report and the next reading are saved under the names of the shared names; the stage ended at a reading that lists none of the leaks the earlier readings listed, or after the third rewrite with every leak still listed carried as an `Open:` line on its unit; `check-docs` from `ws` exits 0 after the last rewrite; `rounds.md` holds the count of every reading and which earlier leaks each repeated
- **Handoff:** T-76D03.
- **Notes:** Every reader is a fresh agent that knows only Go and is given `product.md`, `rules.md`, `spec/` and `inputs/neutral-writing.md`; every rewriter is a fresh documenter. Whether a later reading's item repeats an earlier leak is judged by the orchestrator, by unit and concept, and the judgement is written in `rounds.md` with the reading it rests on. A reading that lists no leak at all ends the stage too.

### [T-76D03] Stack stage: the documenter writes the stack layer

- **Spec:** l1-sdd-document-set.md §5.1 (empty lists, the runtime in the profile, what `deps.md` pins), §5.3 (binding units, bare names in `Defines`, stack rules with `Realizes: —`)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/` holds `profile.md`, `rules.md`, `deps.md` and one `bind/{key}.md` per component that is code; `check-docs` from `ws` exits 0; `reports/stack.md` states the first check; the Vocabulary is non-empty and no vocabulary finding is reported; every convention every source file follows is a stack rule
- **Handoff:** T-76D04.
- **Notes:** A fresh agent given the neutral layer as it stands after T-76D02, the idea, `inputs/` and the stack of `plan.md`.

### [T-76D04] Plan stage: the planner writes the milestones and adds each rule's `From`

- **Spec:** l1-sdd-document-set.md §5.3 (`From` by the plan stage; `Closes`; `Needs: —`; a neutral `Observed by`), §5.4, §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/plan.md` holds at least one milestone with every required field, every component closed by exactly one; every rule of `rules.md` has a `From` line added by the planner; `check-docs` from `ws` exits 0; `reports/plan.md` states the first check and the first milestone's `Observed by`
- **Handoff:** T-76D05.
- **Notes:** A fresh agent given the neutral layer, the stack profile and `inputs/`. The count of milestones and the scope of the first are the planner's.

### [T-76D05] Tasks stage: the task writer writes the tasks of the first milestone

- **Spec:** l1-sdd-document-set.md §5.3 (task; an extended file of any kind; which rules `Context` lists), §5.6 (the pack, its containment line), I5, I6, I7
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/tasks/M1.md` holds three to five tasks, each with every field of the template and an `Observe:` clause naming a command; `check-docs` from `ws` exits 0; `pack M1.T{k}` exits 0 for every task, each computed size at most 10000 and each pack file opening with the containment line; no `Creates` repeats the containment line or a rule's text, and every file a task extends is marked (`reports/tasks.md` says how this was checked)
- **Handoff:** T-76B01.
- **Notes:** A fresh agent given the whole set and `inputs/`. A task over the budget is split by the writer.

### [T-76B01] Build stage: one clean builder per task of the first milestone, each from its pack

- **Spec:** l1-sdd-document-set.md I1, I6, I7, I8, I13, §5.6; l2-sdd-document-set-engine.md §5.2 (`pack`)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** for each task of M1 in After order: the orchestrator ran `pack` (its line in `reports/build.md`, the pack copied to `packs/`), a fresh builder read that pack and the workspace and wrote the task's files and tests, and the task's `Observe:` command run by the orchestrator from `ws` exits 0; each builder's report is saved verbatim on arrival; `reports/build.md` has one row per task (pack tokens, done before, files written, Observe result, places reported); a scan of every file the builders wrote finds no address of the set (`M{n}.T{k}`, a unit address, a `.magicspec` path) — recorded in `reports/build.md`
- **Handoff:** T-76O01.
- **Notes:** As in run 2: one after another; no repair by the orchestrator, no retry; a request for information is answered by a unit's address verbatim or refused, and recorded with its size. The containment scan measures the amendment of 1.2.0 on what was built.

### [T-76O01] Observe the first milestone on what the builders built

- **Spec:** l1-sdd-document-set.md §5.3 (`Observed by` and the profile's `observe` row), §5.4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the observation the first milestone's `Observed by` names is run from `ws` as the profile's `observe` row says, its output and exit codes saved in `reports/observed.md`; it holds as `Works after it` says; the stack's full test command passes; an orchestrator's own check of the milestone's Accept lines (`observe/observe.js`) holds
- **Handoff:** T-76R01.
- **Notes:** An `Observed by` the profile's `observe` row cannot run is a content loss, recorded with the substitution.

### [T-76R01] Trace every loss, compare with runs 1 and 2 and give the verdict

- **Spec:** the lab protocol (loss classes, attribution format / content / run / env); l1-sdd-document-set.md C-3; runs 25 and 26 `summary.md`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `runs/run-27-state/summary.md` holds the tables of run 26's summary for this run; a table of run 1's F1 to F8 and run 2's twelve format items with whether each recurred; the seven criteria restated with their measured values; the last line is `Verdict: PASS` or `Verdict: FAIL`, and a FAIL names each amendment by the unit it changes
- **Handoff:** T-76R02; on FAIL, T-76S01 records the directive and Phases 70 and 71 stay closed.
- **Notes:** The criteria are not changed here. A defect of the checker, the pack or a template is repaired as an extra task before the verdict, with its C14 run.

### [T-76R02] Append run 3 to the record

- **Spec:** l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/forward-gate.md` ends with a section `## Run 3` (date, engine 3.0.172, concept 1.2.0, the seven criteria with their values, the verdict, the fate of the earlier runs' findings, this run's format findings, the lab path); the sections of runs 1 and 2 byte-identical to before; no `## S-` heading and no `- Step {n}: fail` or `inconclusive` line; `node --test --test-name-pattern="simulation" tests/engine.js` passes; no third-party product named
- **Handoff:** T-76S01.
- **Notes:** At most about 30 lines for the new section; the detail stays in the lab.

### [T-76S01] The specifications record the result

- **Spec:** l1-sdd-document-set.md C-3, §1, §7; l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on PASS, `l1-sdd-document-set.md` C-3 states that run 3 passed, with its date and the record, and `l2-sdd-document-set-engine.md` §5.6 step 2 that steps 3 and 4 may begin; on FAIL, both state the result and the ledger gains a `## Replan Directive` naming the amendments of `summary.md`; in both cases patches with Stable retained, the registry rows and its last-updated entry agree, `check-prerequisites --verify-headers` reports no drift, and `export-wiki` runs
- **Handoff:** T-76T01.
- **Notes:** A result changes no requirement; an amendment the verdict calls for goes through `/magicspec spec amend`, routed by the plan.

### [T-76T01] Validation: the record, the run set, the lab tools, the engine

- **Spec:** CLAUDE.md §3.2 and C14; the lab's tests
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `update-engine-meta --check` reports no change of `skills/magicspec/` (or a recorded C14 run and a full harness pass when a defect was repaired); from the lab repository `node tools/test-tools.js` passes; `check-docs` from `ws` exits 0 on the final set; `git status --short` in this repository lists only the phase's own files and nothing of the run folder
- **Handoff:** Phases 70 and 71 open on PASS; on FAIL, `/magicspec plan engine` reads the replan directive.
- **Notes:** The lab's repository receives the run folder and is left uncommitted.
