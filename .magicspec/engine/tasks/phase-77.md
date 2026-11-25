---
phase: 77
name: "The Format Brought to the Amendments of Run 3 (4.0 Step 1, after Run 3)"
status: Todo
subsystem: "skills/magicspec (scripts/pack.js, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 75: the containment line in every pack, the templates of 1.2.0, the document-set harness module of 23 cases"
  - "Phase 76: run 3 of the forward gate and its record (simulations/forward-gate.md, section Run 3)"
  - "The specifications: l1-sdd-document-set 1.3.0 and l2-sdd-document-set-engine 1.3.0, Stable at registry 1.102.0, plan 1.90.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 77 Tasks — The Format Brought to the Amendments of Run 3 (4.0 Step 1, after Run 3)

**Phase:** 77
**Status:** Todo
**Strategic Goal:** What run 4 of the forward gate hands its agents follows concept 1.3.0: every pack carries the stack's tools after its containment line, and the templates of `templates/set/` carry the guidance of 1.3.0; the checker's preamble and vocabulary behaviour, already the concept's, are pinned; nothing a 3.x workspace reads or writes changes.

**Shared names (fixed here so no two tasks choose different spellings):**

- The Tools section of a pack: after the containment line and one empty line, the heading `# Tools of the stack`, one empty line, the body of the `## Tools` section of `stack/{stack}/profile.md` of the task's stack verbatim (without its own heading), one empty line, then `# Task {address}`. A profile without a `## Tools` section, or a task whose stack has no profile, gives no Tools section and no line about it. It is not a computed unit: the printed `pack {n} / 10000 tokens` and the checker's pack sizes do not count it.
- The guidance of concept 1.3.0 per template: `bind.md` (`Realizes: —` for a unit that realizes nothing; one visibility per unit, a unit that would mix them split; a binding unit built by exactly one task; the stack's manifest pinned, path and content, by a unit of the component the first milestone closes); `plan.md` (the first milestone observed by running the product — a use of the product and its outcome — closing every component that use needs; Needs naming the milestones of direct dependencies only); `tasks.md` (one task per binding unit, a unit too large split before the tasks are written); `product.md` (an external need is what a stack may meet with a library; what every runtime offers — reading a file, the local date and time, writing to the outputs — is not listed); `profile.md` (a vocabulary word matches as a whole word, in any letter case, and a component key never).
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-77P01] `pack` writes the stack's tools after the containment line
- [ ] [T-77F01] The guidance of concept 1.3.0 in five templates of the set
- [ ] [T-77H01] Harness cases for the Tools section of a pack
- [ ] [T-77H02] Harness cases for the binding's interface in the pack and for vocabulary matching
- [ ] [T-77S01] The specifications as built
- [ ] [T-77T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-77P01] `pack` writes the stack's tools after the containment line

- **Spec:** l1-sdd-document-set.md §5.6 (the stack's tools in the pack); l2-sdd-document-set-engine.md §5.2 (`pack`: the heading, the place, outside the budget)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** in a disposable 4.0 project holding the `good` fixture, `pack M2.T1` writes the same file as before this change (the fixture has no profile) and prints the same counts; the same set given `stack/rust/profile.md` with a `## Tools` section writes the containment line, the Tools section of the shared names and then `# Task M2.T1`, with the printed computed-units count unchanged and the file count larger; the four fixtures give their recorded findings unchanged; biome, `pnpm run typecheck` and fallow report nothing on the file; `update-engine-meta` run after the edit
- **Handoff:** T-77H01 pins it.
- **Notes:** In `packFile` (or one small function it calls) of `skills/magicspec/scripts/pack.js`, reading the profile of the task's stack through the parsed set where it is already read, or through the same reading the checker uses; `computePack` and the token count of the computed units are unchanged.

### [T-77F01] The guidance of concept 1.3.0 in five templates of the set

- **Spec:** l1-sdd-document-set.md §5.1 (external needs, the manifest), §5.3 (binding unit), §5.5 (the first milestone, Needs), §5.9 (vocabulary matching); l2-sdd-document-set-engine.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `bind.md`, `plan.md`, `tasks.md`, `product.md` and `profile.md` of `templates/set/` each hold the guidance the shared names give them, in a comment or a field line's braces, in the concept's words and with no example content; the field lines the template case reads are all still there (the existing template case passes); the filled templates are read by `check-docs` without a file or heading finding; `update-engine-meta` run after the edit
- **Handoff:** T-77S01 records the templates.
- **Notes:** `plan.md`'s `Observed by` brace keeps its existing guidance and gains the first-milestone sentence in the comment; `bind.md`'s `Realizes` brace says `— for a unit that realizes nothing`. The other nine files of the folder are unchanged, `neutral-writing.md` included.

### [T-77H01] Harness cases for the Tools section of a pack

- **Spec:** l1-sdd-document-set.md §5.6; l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with a new case: a set whose profile has a `## Tools` section gives a pack whose first lines are the containment line, the empty line, `# Tools of the stack`, the section's body and then `# Task …`, with the computed-units count equal to the checker's largest pack; and the same set with the section removed gives no `# Tools of the stack` heading; the existing pack cases pass unchanged; the new case fails with the T-77P01 change reverted (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-77T01.
- **Notes:** The profile is written into a disposable copy of `good` (its stack is `rust`), never into the fixture.

### [T-77H02] Harness cases for the binding's interface in the pack and for vocabulary matching

- **Spec:** l1-sdd-document-set.md §5.6 (the binding's Interface section in the component's preamble), §5.9 (a vocabulary word matches whole, in any case; a component key never); l2-sdd-document-set-engine.md §5.2, §5.3; PLAN.md Phase 77, planning-surfaced 2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** new cases pass: the pack of a task of `good` holds the text of its component's binding before `## Units` (the Interface section); a neutral file holding a vocabulary word in other letter case is reported, the same word inside a longer word is not, and a component key that is also a vocabulary word is not; each new case fails when the behaviour it pins is changed in `check-docs.js` (mutation control CAUGHT); the checker is not changed by this task
- **Handoff:** T-77T01.
- **Notes:** If a case finds the checker does not behave as the concept states, that is a defect: it is repaired in this task with its C14 run and recorded in `Changes`.

### [T-77S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.3.0 (§5.2, §5.3, §5.6 step 1); l2-engine-templates.md (the templates of `set/`); l2-test-suite.md (the `document-set` module)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `l2-engine-templates.md` names the guidance of 1.3.0 in the templates; `l2-test-suite.md` counts the module's cases after this phase; `l2-sdd-document-set-engine.md` records the phase as built (a patch, Stable retained, no requirement changed); `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-77T01.
- **Notes:** As-built patches only.

### [T-77T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; `check-docs --workspace=engine` prints the 3.x line and exits 0
- **Handoff:** Phase 78 (the forward gate, run 4) is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
