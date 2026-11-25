---
phase: 78
name: "The Forward Gate, Run 4 (4.0 Step 2)"
status: Done
subsystem: "the documentation lab's run folder (runs/run-28-state), .magicspec/engine/simulations, .magicspec/engine/specifications"
requires:
  - "Phase 77: the stack's tools in every pack after the containment line, the templates of concept 1.3.0 (engine 3.0.174)"
  - "Phases 69, 74 and 76: runs 1 to 3, their plans and prompts (../sdd-lab/runs/run-25-state, run-26-state, run-27-state) and the record (simulations/forward-gate.md)"
  - "The specifications: l1-sdd-document-set 1.3.0 and l2-sdd-document-set-engine 1.3.1, Stable at registry 1.102.1, plan 1.90.1"
provides:
  - "Run 4 of the forward gate: Verdict FAIL (criterion 5; criteria 3 and 4 as written); criterion 6 holds under the owner's measure"
  - "The whole product built from packs as the first milestone and observed by running it (147 tests, 146 pass, 1 skipped; no retry, no repair)"
  - "simulations/forward-gate.md section Run 4; l1-sdd-document-set 1.3.1, l2-sdd-document-set-engine 1.3.2; registry 1.102.2; a Replan Directive with the owner's questions first"
  - "The lab run folder runs/run-28-state (inputs, prompts, every agent report, the built code, summary.md)"
key_files:
  created:
    - "../sdd-lab/runs/run-28-state/ (lab repository, uncommitted)"
  modified:
    - ".magicspec/engine/simulations/forward-gate.md"
    - ".magicspec/engine/specifications/ (the two document-set specifications), .magicspec/engine/INDEX.md, TASKS.md"
patterns_established:
  - "A criterion written before the format changed is measured as written and beside it on its intent, and its rewording is the owner's before the next run"
duration_minutes: 55
---

# Stage 78 Tasks — The Forward Gate, Run 4 (4.0 Step 2)

**Phase:** 78
**Status:** Done
**Strategic Goal:** The forward gate is run a fourth time on the idea and the stack of runs 1 to 3, unchanged, with concept 1.3.0 and engine 3.0.174, every stage from the spec stage on and the review repeated as in run 3; criterion 6 is measured as the owner decided before the run, the count under the earlier measure reported beside it; the verdict decides whether Phases 70 and 71 may start.

**Shared names (fixed here so no two tasks choose different spellings):**

- The run folder: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-28-state\`, the layout of `run-27-state` (`plan.md`, `prompts.md`, `inputs/`, `ws/`, `reports/`, `packs/`, `observe/`, `rounds.md`, `summary.md`). The workspace of the set is `ws/.magicspec/app/`; the engine in `ws` is a copy of this repository's `skills/magicspec/` at 3.0.174, at `ws/.agents/skills/magicspec/`.
- The inputs every documenting agent receives: `inputs/concept.md` (`l1-sdd-document-set.md` 1.3.0 with the record of earlier runs removed — the Document History; the sentences of §1 and C-3 and the bullet of §7 that report runs or the owner's decision about them, the paragraph of C-3 on the measure of criterion 6 included, since it is a rule of the gate that the orchestrator applies through `plan.md` and it names the runs; and the change markers — with §5 and §6 identical to the specification apart from the markers), `inputs/templates/` (the thirteen templates of `templates/set/`) and `inputs/neutral-writing.md`.
- The review rounds, as in run 3: reading `reports/review.md`; then for round {r} = 1, 2, 3, the rewrite `reports/review-fix-{r}.md` and the fresh reading `reports/review-{r+1}.md`. The review ends at the first reading that lists none of the leaks the readings before it listed, or after the third rewrite.
- **Criterion 6 under two measures.** The owner's measure (decided 2026-11-25, before this run): a loss attributed to the format counts against the gate only when it changed the built product's behaviour or what was written into it; a format item that changed neither is recorded and amended, and does not fail the gate. The earlier measure (runs 1 to 3): every item attributed to the format counts. The verdict uses the owner's measure; `summary.md` gives both counts.
- The model of every agent: Claude Sonnet 5.5, as in runs 1 to 3.
- The record: a section `## Run 4` appended to `.magicspec/engine/simulations/forward-gate.md`; the sections of runs 1 to 3 are not edited.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-78A01] Carry the idea, the stack and the criteria into run 4, criterion 6 under the owner's measure
- [x] [T-78A02] Prepare the run folder, the engine copy, the inputs of 1.3.0 and the prompts
- [x] [T-78D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea
- [x] [T-78D02] Review stage: rewrite and fresh reading repeated until no earlier leak is listed
- [x] [T-78D03] Stack stage: the documenter writes the stack layer
- [x] [T-78D04] Plan stage: the planner writes the milestones and adds each rule's `From`
- [x] [T-78D05] Tasks stage: the task writer writes the tasks of the first milestone
- [x] [T-78B01] Build stage: one clean builder per task of the first milestone, each from its pack
- [x] [T-78O01] Observe the first milestone by running the product
- [x] [T-78R01] Trace every loss, compare with runs 1 to 3 and give the verdict
- [x] [T-78R02] Append run 4 to the record
- [x] [T-78S01] The specifications record the result
- [x] [T-78T01] Validation: the record, the run set, the lab tools, the engine

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-78A01] Carry the idea, the stack and the criteria into run 4, criterion 6 under the owner's measure

- **Spec:** l1-sdd-document-set.md C-3 (the measure of criterion 6, decided before run 4); l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `runs/run-28-state/plan.md` exists and its heading names run 28 and run 4 of the gate; its sections a (the idea) and b (the stack) are byte-identical to those of `runs/run-27-state/plan.md` (a `node` comparison prints `same` twice); in section d, the opening line, criteria 1 to 5 and 7, the reported-not-gated paragraph and the Verdict paragraph are byte-identical to run 27's, and criterion 6 states the owner's measure of the shared names with its date and says that the count under the earlier measure is reported beside it (a `node` comparison of section d with the criterion 6 item cut out of both prints `same`); section f lists every change from run 27 and nothing else
- **Handoff:** T-78A02 builds the inputs from it; T-78R01 applies the criteria as written.
- **Notes:** The changes of section f are the inputs (concept 1.3.0, engine 3.0.174), criterion 6's measure, and the reading of criterion 5 kept from run 3 (the second reading). The criteria other than 6 are not changed; criterion 2 (three to five tasks) is kept although a first milestone observed by running the product may need more (PLAN.md Phase 78, risk), and a failure on it is traced, format or content.
- **Changes:** runs/run-28-state/plan.md written before the run: sections a, b, c, e byte-identical to run 27's, section d identical apart from criterion 6 (node comparison: same five times), criterion 6 restated with the owner's measure and the earlier count beside it, section f with six changes. Section f item 5 fixes before the run that the prompts stay run 27's, including the tasks prompt's 'three to five tasks' and the plan prompt's 'observe by running a command'; this settles the note of T-78D05 ('the writer is not told the count'), which contradicted T-78A02's verify, in favour of the unchanged prompt: removing the count would have changed a second variable

### [T-78A02] Prepare the run folder, the engine copy, the inputs of 1.3.0 and the prompts

- **Spec:** l2-sdd-document-set-engine.md §5.2, §5.3; run 27's `prompts.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.agents/skills/magicspec/.version` reads `3.0.174` and its `templates/set/` is byte-identical to this repository's (fourteen files); from `ws`, `check-docs` on the empty set prints its missing-file finding and no stack trace; `inputs/templates/` and `inputs/neutral-writing.md` byte-identical to the shipped files; `inputs/concept.md` as the shared names say, with no match of `run 1`, `Run 2`, `Run 3`, `run 4`, `Runs 1 to 3`, `owner of the gate`, `2026-11-24`, `[ADDED]` or `[MODIFIED]`, and its §5 and §6 equal to the specification's apart from the markers (a `node` comparison); `prompts.md` differs from run 27's only in its title and the run folder paths, each difference listed in `Changes`
- **Handoff:** T-78D01 to T-78B01 hand `prompts.md` and `inputs/` to the agents.
- **Notes:** No prompt names an earlier run, its findings, its reports or the measure of criterion 6: the format is the variable, so the prompts stay those of run 3.
- **Changes:** runs/run-28-state set up: ws with the engine copy at 3.0.174 (templates/set byte-identical, fourteen files), workspace app in format 4; check-docs on the empty set prints 'product.md: missing' (1 finding, exit 1) and no stack trace; inputs/templates (13) and neutral-writing.md byte-identical; inputs/concept.md is 1.3.0 without the record of earlier runs, with no match of the shared names' patterns, its sections 5 and 6 equal apart from markers; prompts.md differs from run 27's in two lines, the title and the run folder paths of line 3; observe/scan.js copied from run 27

### [T-78D01] Spec stage: the documenter writes the product, the rules and the behaviour units from the idea

- **Spec:** l1-sdd-document-set.md §5.1 (external needs), §5.2, §5.3, §5.8 (where a mark sits)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/` holds `product.md`, `rules.md` and at least one `spec/{key}.md`, written by the documenter (`reports/spec.md`, its report saved verbatim); `check-docs` from `ws` exits 0; `rounds.md` records the first check; every requirement has an `Accept:` line; no rule carries a `From` line; `product.md`'s external needs list nothing every runtime offers (reading a file, the local date and time, writing to the outputs) — the orchestrator's check, written under the report
- **Handoff:** T-78D02.
- **Notes:** A fresh agent given the idea (section a) and `inputs/`, nothing else; the orchestrator edits none of its files.
- **Changes:** spec stage by one fresh agent (reports/spec.md): product.md, rules.md, spec/{date,list,due,cli}.md; first check 46 addresses 1 finding (a byte value C3 in an Accept line read as a change address), 1 repair round, then 0 findings; 25 requirements each with Accept; no rule carries From; external needs '- none'

### [T-78D02] Review stage: rewrite and fresh reading repeated until no earlier leak is listed

- **Spec:** l1-sdd-document-set.md I9, §5.3 (the neutral writing table, the review and its repetition)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `reports/review.md` is the first reader's list; for each round the rewrite's report and the next reading are saved under the names of the shared names; the stage ended at a reading that lists none of the leaks the earlier readings listed, or after the third rewrite with every leak still listed carried as an `Open:` line on its unit; `check-docs` from `ws` exits 0 after the last rewrite; `rounds.md` holds the count of every reading and which earlier leaks each repeated
- **Handoff:** T-78D03.
- **Notes:** As in run 3: every reader is a fresh agent that knows only Go and is given `product.md`, `rules.md`, `spec/` and `inputs/neutral-writing.md`; every rewriter is a fresh documenter. Whether a later reading's item repeats an earlier leak is judged by the orchestrator, by unit and concept, and written in `rounds.md` with the reading it rests on. A reading that lists no leak at all ends the stage too.
- **Changes:** review: first reading 7 leaks, rewrite 1 (reports/review-fix-1.md), second reading 5 (two repeat earlier leaks: the ? comment of product.md and arguments as decoded text now in cli.1), rewrite 2 (cli.1), third reading empty, so the stage ended after two rewrites with no Open line; check-docs exit 0 after each rewrite; criterion 5 (second reading) does not hold; counts in rounds.md

### [T-78D03] Stack stage: the documenter writes the stack layer

- **Spec:** l1-sdd-document-set.md §5.1 (empty lists, the runtime in the profile, the manifest's owner), §5.3 (binding units: `Realizes: —`, one visibility, bare names in `Defines`; stack rules with `Realizes: —`), §5.9 (vocabulary)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/` holds `profile.md` (with a section headed exactly `## Tools` that names the runtime and its test runner with their versions), `rules.md`, `deps.md` and one `bind/{key}.md` per component that is code; `check-docs` from `ws` exits 0; `reports/stack.md` states the first check; the Vocabulary is non-empty and no vocabulary finding is reported; every convention every source file follows is a stack rule; a binding unit that realizes nothing writes `Realizes: —` and no unit mixes interface and internal names (the orchestrator's check, written under the report)
- **Handoff:** T-78D04.
- **Notes:** A fresh agent given the neutral layer as it stands after T-78D02, the idea, `inputs/` and the stack of `plan.md`. Whether the stack has a manifest that needs a unit (section b installs no package) is the documenter's reading: the orchestrator records it and does not correct it.
- **Changes:** stack stage by one fresh documenter (reports/stack.md): profile with ## Tools, rules S1-S5, deps '- none', bindings date.b1-b4, list.b1-b4, due.b1-b2, cli.b1-b4; first check 65 addresses 0 findings; check-docs exit 0; Vocabulary non-empty and no vocabulary finding; manifest pinned by cli.b1 (the documenter assumed the first milestone closes cli, no plan existing yet), the two units realizing nothing write Realizes: dash, one visibility per unit; the neutral layer unchanged

### [T-78D04] Plan stage: the planner writes the milestones and adds each rule's `From`

- **Spec:** l1-sdd-document-set.md §5.3 (`From` by the plan stage; `Closes`; `Needs: —`; a neutral `Observed by`), §5.4, §5.5 (the first milestone observed by running the product; `Needs` naming direct dependencies only)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/plan.md` holds at least one milestone with every required field, every component closed by exactly one; every rule of `rules.md` has a `From` line added by the planner; `check-docs` from `ws` exits 0; `reports/plan.md` states the first check and the first milestone's `Observed by`; that `Observed by` is a use of the product and its outcome (the program run on an input, not only its components' checks) and the milestone closes, or closes in part, every component that use needs — the orchestrator's judgement, written under the report; a failure of it is recorded as a loss for T-78R01 and not corrected
- **Handoff:** T-78D05.
- **Notes:** A fresh agent given the neutral layer, the stack profile and `inputs/`. The count of milestones and the scope of the first are the planner's.
- **Changes:** plan stage by one fresh planner (reports/plan.md): one milestone M1 closing all four components, observed by two runs of the command (a use of the product with its outputs and exit statuses), Needs dash, Backlog '- none', From M1 on every rule; first check 66 addresses 0 findings; check-docs exit 0; judged: Observed by is a use of the product and M1 closes every component that use needs

### [T-78D05] Tasks stage: the task writer writes the tasks of the first milestone

- **Spec:** l1-sdd-document-set.md §5.3 (task; one task per binding unit; an extended file of any kind; which rules `Context` lists), §5.6 (the pack: the containment line, the stack's tools, the binding's Interface section), I5, I6, I7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ws/.magicspec/app/stack/node/tasks/M1.md` holds the tasks of the first milestone, each with every field of the template and an `Observe:` clause naming a command, and their count is recorded for criterion 2; `check-docs` from `ws` exits 0; `pack M1.T{k}` exits 0 for every task, each computed size at most 10000, each pack file opening with the containment line followed by `# Tools of the stack` (a pack without that section is a finding, traced before T-78B01 starts); no binding unit is produced by two tasks; no `Creates` repeats the containment line or a rule's text, and every file a task extends is marked (`reports/tasks.md` says how this was checked)
- **Handoff:** T-78B01.
- **Notes:** A fresh agent given the whole set and `inputs/`. A task over the budget is split by the writer; the writer is not told the count of criterion 2.
- **Changes:** tasks stage by one fresh writer (reports/tasks.md): five tasks M1.T1-M1.T5 (criterion 2 count: 5), each with every field and Observe commands; first check 0 findings, no repair round; packs 684, 2258, 4819, 4940, 8288 of 10000, each with the containment line and then '# Tools of the stack'; each binding unit built by one task; extended file marked; no Creates repeating the containment line or a rule's text

### [T-78B01] Build stage: one clean builder per task of the first milestone, each from its pack

- **Spec:** l1-sdd-document-set.md I1, I6, I7, I8, I13, §5.6; l2-sdd-document-set-engine.md §5.2 (`pack`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** for each task of M1 in After order: the orchestrator ran `pack` (its line in `reports/build.md`, the pack copied to `packs/`), a fresh builder read that pack and the workspace and wrote the task's files and tests, and the task's `Observe:` command run by the orchestrator from `ws` exits 0; each builder's report is saved verbatim on arrival; `reports/build.md` has one row per task (pack tokens, done before, files written, Observe result, places reported); a scan of every file the builders wrote finds no address of the set (`M{n}.T{k}`, a unit address, a `.magicspec` path), recorded in `reports/build.md`
- **Handoff:** T-78O01.
- **Notes:** As in run 3: one after another; no repair by the orchestrator, no retry; a request for information is answered by a unit's address verbatim or refused, and recorded with its size. Whether a builder still reports the runtime or its version as missing measures the Tools section of 1.3.0.
- **Changes:** five tasks built in order by five fresh builders, one pack each (reports/build.md and the verbatim reports): Observe test commands exit 0 after each builder (1, 14, 88, 19, 25 of 26 with 1 skipped; full node --test 146 of 147 with 1 skipped), no retry, no repair, no request for information; builder places 7, 7, 11, 6, 10; one of M1.T5's Observe commands is a product run expected to exit 1 and does (criterion 3 reading judged in R01); containment scan of the 11 built files finds no address or document path

### [T-78O01] Observe the first milestone by running the product

- **Spec:** l1-sdd-document-set.md §5.3 (`Observed by` and the profile's `observe` row), §5.4, §5.5 (the first milestone observed by running the product)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the observation the first milestone's `Observed by` names is run from `ws` as the profile's `observe` row says, the program itself run on its input, its output and exit codes saved in `reports/observed.md`; it holds as `Works after it` says; the stack's full test command passes; an orchestrator's own check of the milestone's Accept lines (`observe/observe.js`) holds
- **Handoff:** T-78R01.
- **Notes:** An `Observed by` the profile's `observe` row cannot run, or one that runs no use of the product, is a loss, recorded with the substitution and attributed in T-78R01.
- **Changes:** M1's Observed by run as the observe row says (observe/observed-by.js): use 1 exit 1 with both outputs as stated, use 2 exit 0 with 'stretch'; full node --test exit 0 (146 of 147, 1 skipped); the orchestrator's own check of every behaviour requirement's Accept lines holds, 70 of 70 (observe/observe.js, reports/observed.md); the byte FF argument case and the no-network part not run

### [T-78R01] Trace every loss, compare with runs 1 to 3 and give the verdict

- **Spec:** the lab protocol (loss classes, attribution format / content / run / env); l1-sdd-document-set.md C-3 (the measure of criterion 6); runs 25 to 27 `summary.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `runs/run-28-state/summary.md` holds the tables of run 27's summary for this run; for every item attributed to the format, whether it changed the built product's behaviour or what was written into it, with the file or test that shows it; criterion 6 stated under both measures (the owner's, which decides; the earlier, reported); a table of run 1's F1 to F8, run 2's twelve format items and run 3's nine with whether each recurred; the seven criteria restated with their measured values; the last line is `Verdict: PASS` or `Verdict: FAIL`, and a FAIL names each amendment by the unit it changes
- **Handoff:** T-78R02; on FAIL, T-78S01 records the directive and Phases 70 and 71 stay closed.
- **Notes:** The criteria are not changed here. A defect of the checker, the pack or a template is repaired as an extra task before the verdict, with its C14 run. A format item that changed nothing built is still listed with its amendment: on PASS it is an input for the pipeline work of Phase 70, not dropped.
- **Changes:** runs/run-28-state/summary.md: criteria 1, 2, 7 hold; 5 does not (the second reading repeated the optional-dependency comment and the decoded-argument leak); 3 and 4 hold on the expected status and not as written (a product use expects exit 1); 6 holds under the owner's measure (9 format items, 0 judged to change the product, F5 borderline; content behaviour-changing per task 0, 0, 0, 0, 1) and fails under the earlier one; no earlier finding recurred in its stated form (table of 29); Verdict: FAIL with six amendments by unit and the owner's questions on the wording of criteria 3, 4 and 5 stated, not applied

### [T-78R02] Append run 4 to the record

- **Spec:** l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/forward-gate.md` ends with a section `## Run 4` (date, engine 3.0.174, concept 1.3.0, the seven criteria with their values, criterion 6 under both measures, the verdict, the fate of the earlier runs' findings, this run's format findings, the lab path); the sections of runs 1 to 3 byte-identical to before; no `## S-` heading and no `- Step {n}: fail` or `inconclusive` line; `node --test --test-name-pattern="simulation" tests/engine.js` passes; no third-party product named
- **Handoff:** T-78S01.
- **Notes:** At most about 30 lines for the new section; the detail stays in the lab.
- **Changes:** simulations/forward-gate.md gains the section Run 4 (24 lines); runs 1 to 3 byte-identical; no scenario heading and no step line; the simulation case passes

### [T-78S01] The specifications record the result

- **Spec:** l1-sdd-document-set.md C-3, §1, §7; l2-sdd-document-set-engine.md §5.6 step 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on PASS, `l1-sdd-document-set.md` C-3 states that run 4 passed, with its date and the record, and `l2-sdd-document-set-engine.md` §5.6 step 2 that steps 3 and 4 may begin; on FAIL, both state the result and the ledger gains a `## Replan Directive` naming the amendments of `summary.md`; in both cases patches with Stable retained, the registry rows and its last-updated entry agree, `check-prerequisites --verify-headers` reports no drift, and `export-wiki` runs
- **Handoff:** T-78T01.
- **Notes:** A result changes no requirement; an amendment the verdict calls for goes through `/magicspec spec amend`, routed by the plan. On PASS the ledger gains no directive: `/magicspec plan engine` opens Phase 70 by the plan's gate.
- **Changes:** l1-sdd-document-set 1.3.1 (sections 1, C-3, 7) and l2-sdd-document-set-engine 1.3.2 (section 5.6 step 2) record that run 4 failed and the gate stays closed, Stable retained, no requirement changed; registry 1.102.2; TASKS.md gains the Replan Directive for plan 1.90.1 (the owner's questions on criteria 3, 4, 5 and on opening Phases 70 and 71, then the six amendments); verify-headers: no drift (the expected SYNC_GAP only); export-wiki run

### [T-78T01] Validation: the record, the run set, the lab tools, the engine

- **Spec:** CLAUDE.md §3.2 and C14; the lab's tests
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `update-engine-meta --check` reports no change of `skills/magicspec/` (or a recorded C14 run and a full harness pass when a defect was repaired); from the lab repository `node tools/test-tools.js` passes; `check-docs` from `ws` exits 0 on the final set; `git status --short` in this repository lists only the phase's own files and nothing of the run folder
- **Handoff:** Phases 70 and 71 open on PASS through `/magicspec plan engine`; on FAIL, `/magicspec plan engine` reads the replan directive.
- **Notes:** The lab's repository receives the run folder and is left uncommitted.
- **Changes:** update-engine-meta --check: no change of the skill folder (engine 3.0.174, no defect repaired, no C14, harness untouched); lab tools 9 of 9 pass; check-docs from ws exit 0 (71 addresses, 0 findings); the unstaged changes of this repository are the phase's own seven files and nothing of the run folder (the earlier phase's files were already staged), the run folder left uncommitted in the lab
