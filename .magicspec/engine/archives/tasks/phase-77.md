---
phase: 77
name: "The Format Brought to the Amendments of Run 3 (4.0 Step 1, after Run 3)"
status: Done
subsystem: "skills/magicspec (scripts/pack.js, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 75: the containment line in every pack, the templates of 1.2.0, the document-set harness module of 23 cases"
  - "Phase 76: run 3 of the forward gate and its record (simulations/forward-gate.md, section Run 3)"
  - "The specifications: l1-sdd-document-set 1.3.0 and l2-sdd-document-set-engine 1.3.0, Stable at registry 1.102.0, plan 1.90.0"
provides:
  - "pack writes the Tools section of the task's stack profile after the containment line, outside the computed units"
  - "templates/set: the guidance of concept 1.3.0 in bind, plan, tasks, product and profile"
  - "tests/engine/document-set.js: 26 cases (the tools in the pack, the binding's interface in the pack, vocabulary matching)"
  - "Specifications as built: l2-sdd-document-set-engine 1.3.1, l2-engine-templates 1.3.8, l2-test-suite 1.48.10; registry 1.102.1; engine 3.0.174"
key_files:
  created: []
  modified:
    - skills/magicspec/scripts/pack.js
    - skills/magicspec/scripts/check-docs.js
    - skills/magicspec/templates/set/bind.md
    - skills/magicspec/templates/set/plan.md
    - skills/magicspec/templates/set/tasks.md
    - skills/magicspec/templates/set/product.md
    - skills/magicspec/templates/set/profile.md
    - tests/engine/document-set.js
patterns_established:
  - "Template guidance never sits in a section the checker or the pack reads as data (Vocabulary, Tools)"
duration_minutes: 20
---

# Stage 77 Tasks — The Format Brought to the Amendments of Run 3 (4.0 Step 1, after Run 3)

**Phase:** 77
**Status:** Done
**Strategic Goal:** What run 4 of the forward gate hands its agents follows concept 1.3.0: every pack carries the stack's tools after its containment line, and the templates of `templates/set/` carry the guidance of 1.3.0; the checker's preamble and vocabulary behaviour, already the concept's, are pinned; nothing a 3.x workspace reads or writes changes.

**Shared names (fixed here so no two tasks choose different spellings):**

- The Tools section of a pack: after the containment line and one empty line, the heading `# Tools of the stack`, one empty line, the body of the `## Tools` section of `stack/{stack}/profile.md` of the task's stack verbatim (without its own heading), one empty line, then `# Task {address}`. A profile without a `## Tools` section, or a task whose stack has no profile, gives no Tools section and no line about it. It is not a computed unit: the printed `pack {n} / 10000 tokens` and the checker's pack sizes do not count it.
- The guidance of concept 1.3.0 per template: `bind.md` (`Realizes: —` for a unit that realizes nothing; one visibility per unit, a unit that would mix them split; a binding unit built by exactly one task; the stack's manifest pinned, path and content, by a unit of the component the first milestone closes); `plan.md` (the first milestone observed by running the product — a use of the product and its outcome — closing every component that use needs; Needs naming the milestones of direct dependencies only); `tasks.md` (one task per binding unit, a unit too large split before the tasks are written); `product.md` (an external need is what a stack may meet with a library; what every runtime offers — reading a file, the local date and time, writing to the outputs — is not listed); `profile.md` (a vocabulary word matches as a whole word, in any letter case, and a component key never).
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-77P01] `pack` writes the stack's tools after the containment line
- [x] [T-77F01] The guidance of concept 1.3.0 in five templates of the set
- [x] [T-77H01] Harness cases for the Tools section of a pack
- [x] [T-77H02] Harness cases for the binding's interface in the pack and for vocabulary matching
- [x] [T-77S01] The specifications as built
- [x] [T-77T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-77P01] `pack` writes the stack's tools after the containment line

- **Spec:** l1-sdd-document-set.md §5.6 (the stack's tools in the pack); l2-sdd-document-set-engine.md §5.2 (`pack`: the heading, the place, outside the budget)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable 4.0 project holding the `good` fixture, `pack M2.T1` writes the same file as before this change (the fixture has no profile) and prints the same counts; the same set given `stack/rust/profile.md` with a `## Tools` section writes the containment line, the Tools section of the shared names and then `# Task M2.T1`, with the printed computed-units count unchanged and the file count larger; the four fixtures give their recorded findings unchanged; biome, `pnpm run typecheck` and fallow report nothing on the file; `update-engine-meta` run after the edit
- **Handoff:** T-77H01 pins it.
- **Notes:** In `packFile` (or one small function it calls) of `skills/magicspec/scripts/pack.js`, reading the profile of the task's stack through the parsed set where it is already read, or through the same reading the checker uses; `computePack` and the token count of the computed units are unchanged.
- **Changes:** `DocSet.stackTools` (check-docs.js) reads the Tools section of the task's stack profile and `packFile` writes it under `# Tools of the stack` between the containment line and the task, outside the computed units; engine 3.0.173. Checked on a disposable project holding `good`: the pack is byte-identical with and without moving the task under `stack/rust` while no profile exists; with a CRLF profile the section follows the containment line, nothing after `## Notions` is shown, computed units 116 in all three runs, file 239 to 256 tokens, checker 0 findings. The fixture keeps its tasks outside any stack, so the check moved the task file under `stack/rust/tasks/`. 23 document-set cases pass; biome, typecheck, fallow dead-code and audit report nothing

### [T-77F01] The guidance of concept 1.3.0 in five templates of the set

- **Spec:** l1-sdd-document-set.md §5.1 (external needs, the manifest), §5.3 (binding unit), §5.5 (the first milestone, Needs), §5.9 (vocabulary matching); l2-sdd-document-set-engine.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `bind.md`, `plan.md`, `tasks.md`, `product.md` and `profile.md` of `templates/set/` each hold the guidance the shared names give them, in a comment or a field line's braces, in the concept's words and with no example content; the field lines the template case reads are all still there (the existing template case passes); the filled templates are read by `check-docs` without a file or heading finding; `update-engine-meta` run after the edit
- **Handoff:** T-77S01 records the templates.
- **Notes:** `plan.md`'s `Observed by` brace keeps its existing guidance and gains the first-milestone sentence in the comment; `bind.md`'s `Realizes` brace says `— for a unit that realizes nothing`. The other nine files of the folder are unchanged, `neutral-writing.md` included.
- **Changes:** Guidance of concept 1.3.0 added to `bind.md` (comment and the `Realizes` braces), `plan.md` (first milestone observed by running the product, direct `Needs`), `tasks.md` (one task per binding unit), `product.md` (what an external need is) and `profile.md` (vocabulary matching). The vocabulary guidance sits in the profile's top comment: the checker reads every line of the Vocabulary section as words, so a comment there would become vocabulary; the Tools section holds no comment either, since it goes into packs. The other nine files unchanged; 23 document-set cases pass, the template case included; engine 3.0.174

### [T-77H01] Harness cases for the Tools section of a pack

- **Spec:** l1-sdd-document-set.md §5.6; l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with a new case: a set whose profile has a `## Tools` section gives a pack whose first lines are the containment line, the empty line, `# Tools of the stack`, the section's body and then `# Task …`, with the computed-units count equal to the checker's largest pack; and the same set with the section removed gives no `# Tools of the stack` heading; the existing pack cases pass unchanged; the new case fails with the T-77P01 change reverted (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-77T01.
- **Notes:** The profile is written into a disposable copy of `good` (its stack is `rust`), never into the fixture.
- **Changes:** Case `a pack carries the tools of its stack after the first line, outside its computed units` in `tests/engine/document-set.js`, on a disposable copy of `good` with its task under `stack/rust`: the first nine lines, nothing of the next profile section, computed units equal to the checker's largest pack, and no section and no line when the profile has no Tools. 24 document-set cases pass; mutation control CAUGHT 2/2 (the pack without the tools, the section never found)

### [T-77H02] Harness cases for the binding's interface in the pack and for vocabulary matching

- **Spec:** l1-sdd-document-set.md §5.6 (the binding's Interface section in the component's preamble), §5.9 (a vocabulary word matches whole, in any case; a component key never); l2-sdd-document-set-engine.md §5.2, §5.3; PLAN.md Phase 77, planning-surfaced 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** new cases pass: the pack of a task of `good` holds the text of its component's binding before `## Units` (the Interface section); a neutral file holding a vocabulary word in other letter case is reported, the same word inside a longer word is not, and a component key that is also a vocabulary word is not; each new case fails when the behaviour it pins is changed in `check-docs.js` (mutation control CAUGHT); the checker is not changed by this task
- **Handoff:** T-77T01.
- **Notes:** If a case finds the checker does not behave as the concept states, that is a defect: it is repaired in this task with its C14 run and recorded in `Changes`.
- **Changes:** Cases `a pack holds the interface of the binding of the component it builds` and `a stack word matches whole and in any letter case, and a component key never`. The word is `crate`: the fixture's plan already holds `cargo`, which would have been a second, correct finding. The checker was not changed by this task: both behaviours were already the concept's. 26 document-set cases pass; mutation control CAUGHT 4/4 (binding preamble dropped, matching by case, matching inside a longer word, key not exempt)

### [T-77S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.3.0 (§5.2, §5.3, §5.6 step 1); l2-engine-templates.md (the templates of `set/`); l2-test-suite.md (the `document-set` module)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-engine-templates.md` names the guidance of 1.3.0 in the templates; `l2-test-suite.md` counts the module's cases after this phase; `l2-sdd-document-set-engine.md` records the phase as built (a patch, Stable retained, no requirement changed); `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-77T01.
- **Notes:** As-built patches only.
- **Changes:** `l2-sdd-document-set-engine.md` 1.3.1, `l2-engine-templates.md` 1.3.8 and `l2-test-suite.md` 1.48.10 record the phase as built (patches, Stable retained); registry 1.102.1. check-prerequisites --verify-headers reports no header drift, one expected SYNC_GAP (plan on registry 1.102.0); export-wiki run

### [T-77T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; `check-docs --workspace=engine` prints the 3.x line and exits 0
- **Handoff:** Phase 78 (the forward gate, run 4) is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** biome clean on the three changed scripts and tests; `pnpm run typecheck`, `fallow dead-code` and `pnpm run audit` report nothing (audit first reported a repeated block in the new pack cases, replaced by the helpers `largestPack` and `packTask`; mutation control then CAUGHT 7/7). Full harness 489 pass, 0 fail (355 s); `update-engine-meta --check` passes at 3.0.174; `check-docs --workspace=engine` prints the 3.x line and exits 0
