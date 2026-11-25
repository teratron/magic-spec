---
phase: 75
name: "The Format Brought to the Amendments of Run 2 (4.0 Step 1, after Run 2)"
status: Done
subsystem: "skills/magicspec (scripts/pack.js, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 73: the templates of 1.1.0, templates/set/neutral-writing.md and its harness case, the check-docs From finding"
  - "Phase 74: run 2 of the forward gate and its record (simulations/forward-gate.md, section Run 2)"
  - "The specifications: l1-sdd-document-set 1.2.0 and l2-sdd-document-set-engine 1.2.0, Stable at registry 1.101.0, plan 1.89.0"
provides:
  - "pack opens every pack with the containment line, outside the computed units"
  - "Seven templates of the set carry the guidance of concept 1.2.0; neutral-writing.md carries the repeated review without the concept's section pointer"
  - "Harness 484 -> 486 (document-set 21 -> 23); engine 3.0.168 -> 3.0.172; l2-sdd-document-set-engine 1.2.1, l2-engine-templates 1.3.7, l2-test-suite 1.48.9; registry 1.101.1"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/pack.js"
    - "skills/magicspec/templates/set/ (tasks, plan, profile, deps, bind, product, spec, neutral-writing)"
    - "tests/engine/document-set.js"
    - ".magicspec/engine/specifications/ (three specifications), .magicspec/engine/INDEX.md"
    - "CHANGELOG.md"
patterns_established:
  - "A shipped copy of specification prose drops the specification's change markers and section pointers, and the harness case that compares the two strips exactly those"
duration_minutes: 12
---

# Stage 75 Tasks — The Format Brought to the Amendments of Run 2 (4.0 Step 1, after Run 2)

**Phase:** 75
**Status:** Done
**Strategic Goal:** What run 3 of the forward gate hands its agents follows concept 1.2.0: every pack opens with the line that keeps the documents out of the product, the templates of `templates/set/` carry the new guidance, and `neutral-writing.md` carries the repeated review; nothing a 3.x workspace reads or writes changes.

**Shared names (fixed here so no two tasks choose different spellings):**

- The containment line, the first line of every pack file, followed by one empty line and then `# Task {address}`: `No address or path of these documents is written into anything this task creates.` (l2-sdd-document-set-engine.md §5.2). It is not a computed unit: the printed `pack {n} / 10000 tokens` and the checker's pack sizes do not count it; the printed `file {n} tokens` does.
- The guidance of concept 1.2.0 per template: `tasks.md` (a file a later task extends, source or test, written `` `{file}` (extends M{n}.T{k}) ``, the path alone in the code span; After directly or not; `Context` lists the stack rules that govern the task and a neutral rule only where no stack rule realizes it); `plan.md` (`Observed by` in neutral words, the profile's `observe` row saying how it runs); `profile.md` (the `observe` row maps each milestone's observation; the runtime and its test runner in Tools with versions; `- none` when there are no stack-only components); `deps.md` (what is installed beside the runtime, a tool a task runs included, with version and checksum, or `- none`); `bind.md` (`Defines` lists bare names); `product.md` (a dependency marked `?` is one only an optional integration, a product item, needs); `spec.md` (a mark, `- Assumption: …` or `- Open: …`, is a list line after the unit's last field).
- The third paragraph of `neutral-writing.md`: the concept's paragraph after the review paragraph of §5.3, word for word, without its change marker.
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-75P01] `pack` opens every pack with the containment line
- [x] [T-75F01] The guidance of concept 1.2.0 in seven templates of the set
- [x] [T-75F02] The repeated review in `neutral-writing.md`
- [x] [T-75H01] Harness cases for the containment line and the pack cases that follow it
- [x] [T-75H02] Harness cases for `- none` and for the third paragraph of the table file
- [x] [T-75S01] The specifications as built
- [x] [T-75T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-75P01] `pack` opens every pack with the containment line

- **Spec:** l1-sdd-document-set.md §5.6 (the line that states I13, first); l2-sdd-document-set-engine.md §5.2 (`pack`: its text, outside the budget)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable 4.0 project holding the `good` fixture, `pack M2.T1` writes a file whose first line is the containment line of the shared names, followed by an empty line and `# Task M2.T1`; the printed `pack {n} / 10000 tokens` equals the value printed before this change, and `file {n} tokens` grows by the line's tokens; `check-docs` on the four fixtures gives their recorded findings unchanged; biome, `pnpm run typecheck` and fallow report nothing on the file; `update-engine-meta` run after the edit
- **Handoff:** T-75H01 pins it and changes the pack cases with it.
- **Notes:** In `packFile` of `skills/magicspec/scripts/pack.js`, as one named constant beside the other fixed headings, so that no second spelling of the line exists. The line is added to the file the pack writes and to nothing the token count of the computed units reads (`computePack` in `check-docs.js` is unchanged).
- **Changes:** pack.js: every pack file opens with the containment line (one constant beside the fixed headings), an empty line, then the task heading; on the good fixture the computed units stay at 116 tokens and the file grows from 219 to 239; computePack unchanged and the four fixtures give their findings unchanged (4 cases pass); biome, typecheck, fallow clean; C14 3.0.168 -> 3.0.169; the pack case that asserts the old first line is changed in the harness task

### [T-75F01] The guidance of concept 1.2.0 in seven templates of the set

- **Spec:** l1-sdd-document-set.md §5.1 (empty lists, `?`, the runtime and the pinned tools), §5.3 (Rule `Context`, `Defines`, `Observed by`, the extended file), §5.6 (After directly or not), §5.8 (where a mark sits); l2-sdd-document-set-engine.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `tasks.md`, `plan.md`, `profile.md`, `deps.md`, `bind.md`, `product.md` and `spec.md` of `templates/set/` each hold the guidance the shared names give them, in a comment or a field line's braces and in the concept's words, and no example content; the field lines the template case reads are all still there (the existing template case passes); every filled template is read by `check-docs` without a file or heading finding; `update-engine-meta` run after the edit
- **Handoff:** T-75H02 pins `- none`; T-75S01 records the templates.
- **Notes:** `tasks.md` replaces its sentence on extended test files by the one on any extended file; `profile.md` keeps its table of stack-only components and says in its comment that a profile with none writes `- none` in place of the table; `deps.md` keeps its `- X{n}` line. `rules.md` and `stack-rules.md` need no line of 1.2.0 (which rules a task lists is the task template's guidance). The other five templates are unchanged.
- **Changes:** guidance of concept 1.2.0 in tasks.md (an extended file of any kind with the path alone in the code span, After directly or not, which rules Context lists), plan.md (a neutral Observed by mapped by the observe row), profile.md (runtime in Tools, observe row, - none for no stack components), deps.md, bind.md (bare names), product.md (the optional-integration mark, the comment the second reader flagged reworded), spec.md (where a mark sits; written without a line-start Open: so no preamble reads as an open unit); template cases pass, the filled-template run gives the same 13 addresses and 54 placeholder findings as before; C14 3.0.169 -> 3.0.170

### [T-75F02] The repeated review in `neutral-writing.md`

- **Spec:** l1-sdd-document-set.md §5.3 (the paragraph after the review paragraph); l2-sdd-document-set-engine.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `templates/set/neutral-writing.md` ends with the third paragraph of the shared names, word for word; the introducing paragraph, the eighteen rows and the review paragraph are unchanged; `update-engine-meta` run after the edit
- **Handoff:** T-75H02 compares the three paragraphs with the concept.
- **Notes:** Copied from the specification, as in Phase 73, without the `[ADDED]` marker.
- **Changes:** neutral-writing.md gains the concept's paragraph on the repeated review, the other two paragraphs and the table unchanged; read against the containment rule rather than word for word in one point: the concept's closing section pointer is left out of the shipped file, since a shipped file points to no section of a specification (the harness case strips the pointer when it compares); C14 3.0.170 -> 3.0.172 (the add and the pointer)

### [T-75H01] Harness cases for the containment line and the pack cases that follow it

- **Spec:** l1-sdd-document-set.md §5.6; l2-sdd-document-set-engine.md §5.2, §6 item 2 (the pack cases follow the line); l2-test-suite.md (the harness by domain)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with the pack cases changed to the containment line (the order case asserts the line, the empty line and `# Task` at the start instead of `# Task` alone) and one new case asserting that the line opens the pack of every task of `good` and that the printed computed-units count is the same with and without it; the new case fails with the T-75P01 change reverted (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-75T01.
- **Notes:** The over-budget case must keep its threshold: the line is outside the computed units. Case names begin `document set:`.
- **Changes:** document-set module: the order case asserts the containment line, the empty line and the task heading first; a new case asserts the line opens the pack once, with the printed computed-units count equal to the checker's largest pack and the file larger; the pack cases pass (4 of 4 matched); mutation control CAUGHT with the line removed from pack.js; the over-budget case unchanged; biome clean

### [T-75H02] Harness cases for `- none` and for the third paragraph of the table file

- **Spec:** l1-sdd-document-set.md §5.1 (an empty list is `- none`), §5.3 (the repeated review); l2-sdd-document-set-engine.md §5.3 (the checker's reading of `- none` pinned); PLAN.md Phase 75, planning-surfaced 1 and 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a new case gives the `good` set a stack `generic` whose `deps.md` is `- none` and whose profile has `- none` under Components and finds no finding for them, with a control that a `- X1 …` line naming a product item that does not exist is reported; the table case compares the three paragraphs and the eighteen rows of the concept with the shipped file, and fails when the third paragraph of either differs; `node --test --test-name-pattern="document set" tests/engine.js` passes
- **Handoff:** T-75T01.
- **Notes:** The checker is not changed in this phase; if the `- none` case finds a finding, that is a defect of the checker and is repaired in this task, with its C14 run, and recorded in `Changes`.
- **Changes:** a new case reads - none in deps.md and in the profile's Components as empty, with a control that a library naming a missing product item is reported (the checker needed no change); the table case compares the eighteen rows and every paragraph after the table, stripping the concept's change marker and section pointer; document-set 23 of 23; the third paragraph changed in the shipped file CAUGHT by the driver and changed in the concept fails the case (restored byte for byte); biome clean

### [T-75S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.2.0 (§5.2, §5.3, §5.6 step 1, §6 item 2); l2-engine-templates.md (the templates of `set/`); l2-test-suite.md (the `document-set` module's cases)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-engine-templates.md` names the guidance of 1.2.0 in the templates and the third paragraph of `neutral-writing.md`; `l2-test-suite.md` counts the module's cases after this phase; `l2-sdd-document-set-engine.md` records the phase as built (a patch, Stable retained, no requirement changed); `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-75T01.
- **Notes:** As-built patches only; a requirement found wrong while building goes back as a replan directive.
- **Changes:** as built: l2-sdd-document-set-engine 1.2.1, l2-engine-templates 1.3.7, l2-test-suite 1.48.9 (document-set 21 -> 23); registry 1.101.1; verify-headers: no drift (the expected SYNC_GAP only); export-wiki run

### [T-75T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; `check-docs --workspace=engine` prints the 3.x line and exits 0
- **Handoff:** Phase 76 (the forward gate, run 3) is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters. An inherited finding on code this phase did not touch is reported and left.
- **Changes:** biome clean on the changed JavaScript; typecheck, fallow dead-code and audit report no issue; the full harness 486 of 486 (was 484); update-engine-meta --check: no change (engine 3.0.172); check-docs on this workspace prints the 3.x line and exits 0
