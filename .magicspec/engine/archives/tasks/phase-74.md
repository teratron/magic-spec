---
phase: 74
name: "The Forward Gate, Run 2 (4.0 Step 2)"
status: Done
subsystem: "the documentation lab's run folder (runs/run-26-state), .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 73: the templates of templates/set/ with the guidance of concept 1.1.0, templates/set/neutral-writing.md and the check-docs From finding (engine 3.0.168)"
  - "Phase 69: run 1, its plan and prompts (../sdd-lab/runs/run-25-state/plan.md, prompts.md) and its record (simulations/forward-gate.md)"
  - "The specifications: l1-sdd-document-set 1.1.0 and l2-sdd-document-set-engine 1.1.1, Stable at registry 1.100.1, plan 1.88.1"
provides:
  - "Run 2 of the forward gate: Verdict FAIL (criteria 5 and 6); criteria 1 to 4 and 7 hold; M1 (one component) built from packs, 103 tests, observed"
  - "Run 1's findings F1 to F8 did not recur in their stated form; twelve smaller format items, containment reaching no pack among them; six amendments named by unit and a Replan Directive in the ledger"
  - "simulations/forward-gate.md section Run 2; l1-sdd-document-set 1.1.1, l2-sdd-document-set-engine 1.1.2; registry 1.100.2"
  - "The lab run folder runs/run-26-state (inputs, prompts, every agent report, the built code, summary.md)"
key_files:
  created:
    - "../sdd-lab/runs/run-26-state/ (lab repository, uncommitted)"
  modified:
    - ".magicspec/engine/simulations/forward-gate.md"
    - ".magicspec/engine/specifications/ (the two document-set specifications), .magicspec/engine/INDEX.md, TASKS.md"
patterns_established:
  - "A forward-gate input copy of a specification carries no record of earlier runs: history, result sentences and change markers are removed, the requirement sections stay identical"
duration_minutes: 40
---

# Stage 74 Tasks — The Forward Gate, Run 2 (4.0 Step 2)

**Phase:** 74
**Status:** Done
**Strategic Goal:** The forward gate is run a second time on the idea, the stack and the seven criteria of run 1, unchanged, with the format of concept 1.1.0 and engine 3.0.168, every stage from the spec stage on; the verdict decides whether Phases 70 and 71 may start.

**Shared names (fixed here so no two tasks choose different spellings):**

- The run folder: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-26-state\` (`plan.md`, `prompts.md`, `inputs/`, `ws/`, `reports/`, `rounds.md`, `observe/`, `summary.md`), the same layout as run 1's `run-25-state`. The workspace of the set is `ws/.magicspec/app/`; the engine in `ws` is a copy of this repository's `skills/magicspec/` at engine 3.0.168, at `ws/.agents/skills/magicspec/`.
- The executor in `ws`: `node .agents/skills/magicspec/scripts/executor.js {check-docs | pack M1.T{k}}`, run from `ws`.
- The inputs every documenting agent receives: `inputs/concept.md` (a copy of `l1-sdd-document-set.md` 1.1.0), `inputs/templates/` (the thirteen templates of `templates/set/`) and `inputs/neutral-writing.md` (a copy of `templates/set/neutral-writing.md`); nothing else.
- The record: a section `## Run 2` appended to `.magicspec/engine/simulations/forward-gate.md`; run 1's sections are not edited.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-74A01] Carry the idea, the stack and the criteria of run 1 into run 2, unchanged
- [x] [T-74A02] Prepare the run folder, the engine copy, the inputs of 1.1.0 and the prompts
- [x] [T-74D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea
- [x] [T-74D02] Review stage: a reader of another stack lists the leaks of the neutral layer, and they are closed
- [x] [T-74D03] Stack stage: the documenter writes the stack layer
- [x] [T-74D04] Plan stage: the planner writes the milestones and adds each rule's `From`
- [x] [T-74D05] Tasks stage: the task writer writes the tasks of the first milestone
- [x] [T-74B01] Build stage: one clean builder per task of the first milestone, each from its pack
- [x] [T-74O01] Observe the first milestone on what the builders built
- [x] [T-74R01] Trace every loss, compare with run 1 and give the verdict
- [x] [T-74R02] Append run 2 to the record
- [x] [T-74S01] The specifications record the result
- [x] [T-74T01] Validation: the record, the run set, the lab tools, the engine

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-74A01] Carry the idea, the stack and the criteria of run 1 into run 2, unchanged

- **Spec:** l1-sdd-document-set.md C-3 (run 2 on the same idea); l2-sdd-document-set-engine.md §5.6 step 2 (the same idea and the same criteria)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `runs/run-26-state/plan.md` exists in the lab; its sections a (the idea), b (the stack) and d (the criteria) are byte-identical to those of `runs/run-25-state/plan.md` (a `node` comparison of the three sections prints `same`); its heading names run 26 and run 2 of the gate, and one sentence says the criteria were written before run 1 and are not changed
- **Handoff:** T-74A02 builds the inputs from it; T-74R01 applies the criteria as written.
- **Notes:** Section c (the stages) and e (isolation) may be adjusted only where run 1 recorded a run defect (the stray stop after the checker command) and where the inputs changed (the table now comes from the engine); every such change is listed in a short section of the new `plan.md`. Nothing of the idea, the stack or the criteria is reworded.
- **Changes:** runs/run-26-state/plan.md written before the run: sections a, b and d byte-identical to run 25's (compared by a node check, three times same), c and e kept, a section f lists the six changes (inputs and engine copy from engine 3.0.168, the checker command without a stop, the plan stage adding From, the reviewer's table, every agent on Claude Sonnet 5.5 as in run 25); node v24.12.0 on this machine, as the stack section says

### [T-74A02] Prepare the run folder, the engine copy, the inputs of 1.1.0 and the prompts

- **Spec:** l2-sdd-document-set-engine.md §5.2, §5.3 (the templates and `neutral-writing.md`); run 1's `prompts.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.agents/skills/magicspec/.version` reads `3.0.168` and `ws/.agents/skills/magicspec/templates/set/` holds the fourteen files of this repository's folder, byte-identical; from `ws`, `check-docs` prints one finding per missing file of an empty set and no stack trace; `inputs/concept.md` equals this repository's `l1-sdd-document-set.md`, `inputs/templates/` the thirteen templates and `inputs/neutral-writing.md` the shipped table, byte for byte; `prompts.md` holds one prompt per stage (`spec`, `review`, `review-fix`, `stack`, `plan`, `tasks`, `build`) and differs from run 1's only in the lines this task lists in its `Changes`, among them the checker command written without a trailing stop and the plan prompt saying that the plan stage adds `From` to every rule
- **Handoff:** T-74D01 to T-74B01 hand `prompts.md` and `inputs/` to the agents.
- **Notes:** The engine copy is taken from this repository's `skills/magicspec/` as it is at engine 3.0.168, not from run 1's `ws`. No prompt names run 1, its findings or its reports, so no agent learns what the first run found; the format alone is what changed. Every documenting prompt keeps run 1's constraints: the agent knows only the idea and the files in `inputs/` and `ws/`, writes only under `ws/.magicspec/app/`, runs `check-docs` after every file and repairs until it reports nothing, at most five rounds, and reports the findings of the first run of each stage.
- **Changes:** runs/run-26-state set up: ws with the engine copy at 3.0.168 (templates/set byte-identical, fourteen files), workspace app in format 4; check-docs on the empty set prints 'product.md: missing' and no stack trace; inputs/templates (13) and inputs/neutral-writing.md byte-identical; inputs/concept.md is 1.1.0 with the record of run 1 removed (Document History, the sentences of sections 1 and C-3 and the bullet of section 7 about it, the eight change markers; sections 5 and 6 identical apart from the markers) — read against this task's note that no agent learns what run 1 found, instead of the byte-equality line (plan.md section f item 7); prompts.md differs from run 1's only in its title, the run folder paths, the two notes of run 1 replaced by one line on the model, and three lines of the planner prompt (it writes From)

### [T-74D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea

- **Spec:** l1-sdd-document-set.md §5.1–§5.3 (product.md, rules.md, spec/{key}.md; a rule written before the plan has no `From`; the neutral writing table)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/` holds `product.md`, `rules.md` and at least one `spec/{key}.md`, written by the documenter agent (`reports/spec.md` is its report and states its first `check-docs` output); `check-docs` from `ws` exits 0; `rounds.md` lists the findings of every round of this stage; every requirement has an `Accept:` line; no rule of `rules.md` carries a `From` line
- **Handoff:** T-74D02 reviews the neutral layer.
- **Notes:** A fresh agent with a clean context, given the idea (section a of `plan.md`) and `inputs/`, and nothing else. The orchestrator edits none of its files. The first checker output after the first draft is the measure of the format's guidance and is recorded verbatim in `rounds.md`.
- **Changes:** spec stage by one fresh agent (reports/spec.md): product.md, rules.md, spec/{due,list,cli}.md; first check 53 addresses 0 findings, no repair round; check-docs exit 0; 29 requirements, each with Accept; no rule carries From; one process note (the agent listed its two folders once with the shell)

### [T-74D02] Review stage: a reader of another stack lists the leaks of the neutral layer, and they are closed

- **Spec:** l1-sdd-document-set.md I9, §5.3 (the neutral writing table and the cross-stack review); l2-sdd-document-set-engine.md §4 row I9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `reports/review.md` is the reader's list, one line per concept of its stack that the neutral layer assumes, with the unit address; after the rewrite of a fresh documenter (`reports/review-fix.md`) `check-docs` from `ws` exits 0, and a second reading by a fresh reader of the same stack (`reports/review-2.md`) lists none of the leaks of the first; the counts before and after are in `rounds.md`
- **Handoff:** T-74D03 writes the stack layer under the neutral layer as it stands.
- **Notes:** The reader knows only the stack of run 1's reader (Go) and is given `product.md`, `rules.md`, `spec/` and `inputs/neutral-writing.md`. A leak that no row of the table covers is a format finding for T-74R01; a leak a row covers and the unit ignored is a content finding.
- **Changes:** review by a fresh Go reader (3 leaks: cli.3, cli.5, R3), rewrite by a fresh documenter (all three, 0 repair rounds), second fresh reader (2 items); check-docs exit 0; counts in rounds.md. The second reading lists one item in the template's comment kept in product.md and one in cli.3 on the argument's text form, whose relation to the first cli.3 leak is judged as criterion 5 in the summary, not here

### [T-74D03] Stack stage: the documenter writes the stack layer

- **Spec:** l1-sdd-document-set.md §5.1 (stack/{stack}/…), §5.3 (binding units; a stack rule with `Realizes: —` for a convention only the stack has; the profile reaches no pack)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/` holds `profile.md`, `rules.md`, `deps.md` and one `bind/{key}.md` for every component of the product that is code; `check-docs` from `ws` exits 0; `reports/stack.md` states the first `check-docs` output; the Vocabulary section of `profile.md` is non-empty and the checker reports no vocabulary finding; every convention every source file follows is a stack rule, not a line of the profile (`reports/stack.md` lists them)
- **Handoff:** T-74D04 plans from the neutral layer and the stack profile.
- **Notes:** A fresh agent given the neutral layer as it stands after T-74D02, the idea, `inputs/` and the stack of `plan.md`; it does not see the earlier reports.
- **Changes:** stack stage by one fresh documenter (reports/stack.md): profile, rules S1-S5, deps, bindings due.b1-b4, list.b1-b3, cli.b1-b5; first check 70 addresses 0 findings; check-docs exit 0; Vocabulary non-empty and no vocabulary finding; the every-file conventions are stack rules S1 and S5 with Realizes dash; the neutral layer unchanged; the agent also read the checker's source in ws for two forms (recorded in rounds.md)

### [T-74D04] Plan stage: the planner writes the milestones and adds each rule's `From`

- **Spec:** l1-sdd-document-set.md §5.3 (`From` written by the plan stage; `Closes` keys only; `Needs: —`), §5.4, §5.5 (the empty backlog); l2-sdd-document-set-engine.md §5.4 row `plan`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/plan.md` holds at least one milestone with Priority, Works after it, Observed by, Needs and Closes, and every component of the product is closed by exactly one; every rule of `rules.md` now has a `From` line, added by the planner; `check-docs` from `ws` exits 0; `reports/plan.md` states the first `check-docs` output and names the first milestone's `Observed by` command
- **Handoff:** T-74D05 writes the tasks of the first milestone.
- **Notes:** A fresh agent given the neutral layer, the stack profile and `inputs/`. The first milestone must be observable by a command that runs on this machine (the profile's `observe` row). Run 1's plan had one milestone; the count is the planner's, not a target.
- **Changes:** plan stage by one fresh planner (reports/plan.md): three milestones, M1 closes due, M2 list, M3 cli, each with Priority, Works after it, Observed by, Needs and Closes; every rule got From: M1; first check 73 addresses 0 findings; check-docs exit 0; M1 is observed by the tests of due, which the neutral plan states without the stack's command (node --test test/due.test.js on this stack)

### [T-74D05] Tasks stage: the task writer writes the tasks of the first milestone

- **Spec:** l1-sdd-document-set.md §5.3 (task; `Produces: —`; an extended test file; the exit status), §5.6 (the pack; a rule reaches it only through Context), I5, I6, I7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/tasks/M1.md` holds three to five tasks, each with every field of the task template and an `Observe:` clause naming a command; `check-docs` from `ws` exits 0; `pack M1.T{k}` exits 0 for every task and each printed size is at most 10000; every stack rule with `Realizes: —` is in the `Context` of the tasks it governs and no task's `Creates` repeats a rule's text (`reports/tasks.md` says how this was checked); `reports/tasks.md` states the first `check-docs` output and the number of repair rounds
- **Handoff:** T-74B01 builds each task from its pack.
- **Notes:** A fresh agent given the whole set as it stands and `inputs/`. A task over the budget is split by the writer, not by the orchestrator. The seam unit of a component split across two tasks and the size of Done before this task stay as in run 1 (PLAN.md Phase 74: run 2 measures the same pack).
- **Changes:** tasks stage by one fresh writer (reports/tasks.md): M1.T1 to M1.T3 with every field and an Observe command; first check 0 findings, no repair round; packs 1620, 1884, 2549 of 10000; the two stack rules with Realizes dash (S1, S5) are in every task's Context and no Creates repeats a rule's text (orchestrator's check recorded under the report)

### [T-74B01] Build stage: one clean builder per task of the first milestone, each from its pack

- **Spec:** l1-sdd-document-set.md I1, I6, I7, I8, §5.6; l2-sdd-document-set-engine.md §5.2 (`pack`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** for each task of M1 in After order (ties in the order of the file): the orchestrator ran `pack` (its printed line is in `reports/build.md`), a fresh builder read that pack and the workspace and wrote the task's files and tests under `ws/`, and the task's `Observe:` command, run by the orchestrator from `ws` after the builder returned, exits 0; `reports/build-M1.T{k}.md` holds each builder's report verbatim; `reports/build.md` has one row per task with the pack tokens, the done-before tokens, the files written, the Observe result and the number of places the builder reports the pack silent, ambiguous or in need of a decision
- **Handoff:** T-74O01 observes the milestone.
- **Notes:** As in run 1: tasks are built one after another; a builder that cannot make its tests pass reports why and stops, and the orchestrator does not repair the code (the task is a loss for T-74R01, not a retry); a request for information the pack lacks is answered only by a unit's address, verbatim, or refused, and every answer is recorded with its size. Every builder report is saved to its file the moment it arrives.
- **Changes:** three tasks of M1 built in order by three fresh builders, one pack each; Observe exit 0 after each (26, 55, 103 tests, all pass), no retry, no repair, no request for information; reports/build.md and the verbatim reports; builder places reported silent, ambiguous or decided: 7, 5, 6

### [T-74O01] Observe the first milestone on what the builders built

- **Spec:** l1-sdd-document-set.md §5.4 (a milestone is done when its Observed by holds)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the observations the first milestone's `Observed by` names are run from `ws` by the orchestrator (a script under `observe/` when there are several), and their output and exit codes are saved in `reports/observed.md`; each exits as the milestone says and the output states what `Works after it` says; the stack's full test command run from `ws` passes, and its counts are saved
- **Handoff:** T-74R01 evaluates.
- **Notes:** An `Observed by` that names a command the stack does not have is a content loss of the plan, recorded in `reports/observed.md`, and the milestone is observed by the nearest command of the profile's `observe` row, with the substitution written down.
- **Changes:** M1's Observed by run from ws: node --test test/due.test.js exit 0, 103 of 103 (the stack command taken from the profile's observe row, the neutral plan naming none); full node --test exit 0; the orchestrator's own 17 checks of the Accept lines of due.1 to due.8 all hold (observe/observe.js, reports/observed.md)

### [T-74R01] Trace every loss, compare with run 1 and give the verdict

- **Spec:** the lab protocol (loss classes, attribution format / content / run / env); l1-sdd-document-set.md C-3; run 1's `summary.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `runs/run-26-state/summary.md` holds the tables of run 1's summary (first-check findings per stage, the reader's leaks, the items the agents reported silent, ambiguous or decided, each classed and attributed with the unit address); a table of run 1's eight format findings F1 to F8 with, for each, whether run 2 met it again; the seven criteria restated with their measured values; the last line is `Verdict: PASS` or `Verdict: FAIL`, and a FAIL names each amendment of the concept it needs, by the unit it changes
- **Handoff:** T-74R02 records; on FAIL, T-74S01 names the amendment path and Phases 70 and 71 stay closed.
- **Notes:** The criteria are not changed here, and a criterion met only by changing what it measures is not met. A finding about the checker, the pack or a template (a false report, a missed one, a template that contradicts the concept) is a defect: record it, and repair it as an extra task of this phase before the verdict, with its C14 run.
- **Changes:** runs/run-26-state/summary.md: criteria 1, 2, 3, 4 and 7 hold; 5 fails (the cli.3 leak recurs through the rewrite's wording, judged by the concept's review paragraph and run 25's reading, the other reading stated) and 6 fails (12 items attributed to the format, 0 behaviour-changing content items per task); F1 to F8 did not recur in their stated form; Verdict: FAIL with six amendments by unit

### [T-74R02] Append run 2 to the record

- **Spec:** l2-sdd-document-set-engine.md §5.6 step 2 (recorded under `.magicspec/engine/simulations/`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/forward-gate.md` ends with a section `## Run 2` that names the date, the engine version (3.0.168), the concept version (1.1.0), the measured values of the seven criteria, the verdict, the fate of F1 to F8 and the lab path of the run folder; run 1's sections are byte-identical to before; the file has no `## S-` heading and no `- Step {n}: fail` or `- Step {n}: inconclusive` line, so `node --test --test-name-pattern="simulation" tests/engine.js` reports no failure; it names no third-party product
- **Handoff:** T-74S01.
- **Notes:** At most about 60 lines for the new section; the detail stays in the lab.
- **Changes:** simulations/forward-gate.md gains the section Run 2 (25 lines: date, engine 3.0.168, concept 1.1.0, the seven criteria with values, verdict FAIL, the fate of run 1's findings, this run's format findings, the lab path); run 1's text byte-identical; no scenario heading or step line; the simulation harness case passes

### [T-74S01] The specifications record the result

- **Spec:** l1-sdd-document-set.md C-3, §1, §7; l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on PASS, `l1-sdd-document-set.md` C-3 states that run 2 passed, with its date and the record's path, and `l2-sdd-document-set-engine.md` §5.6 step 2 states the same and that steps 3 and 4 may begin; both have a Document History row naming Phase 74 and a patch version, Stable retained; on FAIL, no requirement is changed here — the ledger gains a `## Replan Directive` that names the amendments `summary.md` lists, and the specifications record only the result as a patch; in both cases `check-prerequisites --json --require-specs --verify-headers --workspace=engine` reports no drift and the registry rows and its last-updated entry agree; `export-wiki` run
- **Handoff:** T-74T01.
- **Notes:** A result changes no requirement, so both cases are patches. An amendment the verdict calls for goes through `/magicspec spec amend`, routed by the plan, never written here.
- **Changes:** l1-sdd-document-set 1.1.1 (sections 1, C-3, 7) and l2-sdd-document-set-engine 1.1.2 (section 5.6 step 2) record that run 2 failed criteria 5 and 6 and the gate stays closed, Stable retained, no requirement changed; registry 1.100.2; TASKS.md gains the Replan Directive for plan 1.88.1 naming the six amendments and the owner's question on criterion 6; verify-headers: no drift (the expected SYNC_GAP only); export-wiki run

### [T-74T01] Validation: the record, the run set, the lab tools, the engine

- **Spec:** CLAUDE.md §3.2 and C14; the lab's tests
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js update-engine-meta --check` from the repository root reports no change of `skills/magicspec/` (or, when a defect was repaired in the phase, its C14 run is recorded and `node --test tests/engine.js` passes in full, the counters saved); from the lab repository `node tools/test-tools.js` passes; `check-docs` from `ws` exits 0 on the final set; `git status --short` in this repository lists only the phase's own files (the specifications, the registry, `.magicspec/engine/` files and `simulations/forward-gate.md`) and nothing of the run folder
- **Handoff:** Phases 70 and 71 open on PASS; on FAIL, `/magicspec plan engine` reads the replan directive.
- **Notes:** The lab's repository receives the run folder and is left uncommitted; committing there is the owner's call.
- **Changes:** update-engine-meta --check: no change of the skill folder (engine 3.0.168, no defect repaired, no C14); lab tools 9 of 9 pass; check-docs from ws exit 0 on the final set (76 addresses, 0 findings); git status lists only the phase's files (two specifications, the registry, TASKS.md, the workbook, forward-gate.md) and nothing of the run folder, which stays uncommitted in the lab
