---
phase: 79
name: "The Format Brought to the Six Items of Run 4 (4.0 Step 1, after the Gate)"
status: Done
subsystem: "skills/magicspec (scripts/pack.js, scripts/check-docs.js, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 77: the stack's tools in every pack, the templates of 1.3.0, the document-set harness module of 26 cases"
  - "Phase 78: run 4 of the forward gate, its record (simulations/forward-gate.md, section Run 4) and the owner's decision that opened the gate"
  - "The specifications: l1-sdd-document-set 1.5.0 and l2-sdd-document-set-engine 1.5.0, Stable at registry 1.104.0, plan 1.91.0"
provides:
  - "Every pack states the component-key exception on its first line"
  - "check-docs reports an HTML comment left in a neutral file and reads no reference inside a code span"
  - "templates/set: every template says a document keeps none of its comments and carries the guidance of 1.5.0; neutral-writing.md holds the runtime row"
  - "tests/engine/document-set.js: 28 cases; specifications as built (l2-sdd-document-set-engine 1.5.1, l2-engine-templates 1.3.9, l2-test-suite 1.48.11); registry 1.104.1; engine 3.0.179"
key_files:
  created: []
  modified:
    - skills/magicspec/scripts/pack.js
    - skills/magicspec/scripts/check-docs.js
    - "skills/magicspec/templates/set/ (the thirteen templates and neutral-writing.md)"
    - tests/engine/document-set.js
patterns_established:
  - "A check reading the documents for references or comments strips code spans first, so data shaped like markup or an address stays data"
duration_minutes: 12
---

# Stage 79 Tasks — The Format Brought to the Six Items of Run 4 (4.0 Step 1, after the Gate)

**Phase:** 79
**Status:** Done
**Strategic Goal:** The scripts and templates of step 1 follow concept 1.5.0 before the pipeline is built on them: every pack states the component-key exception, the checker reports a comment left in a neutral file and reads no reference inside a code span, and the templates and the neutral writing table carry the six items of run 4; nothing a 3.x workspace reads or writes changes, and no run of the gate follows.

**Shared names (fixed here so no two tasks choose different spellings):**

- The containment line, word for word: `No address or path of these documents is written into anything this task creates; a component key is written only where the bindings use it as a name.`
- The comment finding, one per neutral file that holds an HTML comment (`<!--`): `{file}: a template comment left in a neutral document`. The neutral files are `product.md`, `rules.md`, `plan.md` and every `spec/{key}.md`.
- A code span: text between a pair of backticks on one line, the double-backtick form included. The reference scan (`inlineRefs`) reads the text with every code span removed; `checkObservedRefs` keeps reading the backticked component keys of an `Observed by`, unchanged.
- The table row the concept adds, word for word as in `l1-sdd-document-set.md` §5.3: `| "the runtime", "what the runtime offers", "the standard library" | what every stack provides by itself, named for the need ("reading a file, the local date of the machine, writing to the outputs") |`, placed before the row on dates.
- The template sentence, at the start of each template's first comment: `A document written from this template keeps none of its comments.`
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-79F01] The runtime row in `neutral-writing.md`
- [x] [T-79P01] The containment line with the component-key exception
- [x] [T-79C01] The checker reports a comment left in a neutral file
- [x] [T-79C02] The checker reads no reference inside a code span
- [x] [T-79F02] The guidance of concept 1.5.0 in the templates of the set
- [x] [T-79H01] Harness cases for the comment finding and the code-span literal
- [x] [T-79S01] The specifications as built
- [x] [T-79T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-79F01] The runtime row in `neutral-writing.md`

- **Spec:** l1-sdd-document-set.md §5.3 (the neutral writing table); l2-sdd-document-set-engine.md §5.3 (`neutral-writing.md` word for word)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/templates/set/neutral-writing.md` holds the row of the shared names before the row on dates; the table case (`document set: the shipped neutral writing table is the one of the concept`) passes, its row count changed from twenty lines to twenty-one (a header, a separator and nineteen rows); `update-engine-meta` run after the edit
- **Handoff:** the harness is green again for the module; T-79S01 records it.
- **Notes:** The case is red since concept 1.5.0 added the row (PLAN.md Phase 79, planning-surfaced 1); this task comes first. The count in the case is the only harness change here.
- **Changes:** The runtime row added to templates/set/neutral-writing.md word for word before the row on dates; the table case counts 21 lines (nineteen rows); 26 document-set cases pass, the table case green again; engine 3.0.175

### [T-79P01] The containment line with the component-key exception

- **Spec:** l1-sdd-document-set.md I13, §5.6; l2-sdd-document-set-engine.md §5.2 (`pack`, the line's text)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `CONTAINMENT_LINE` in `skills/magicspec/scripts/pack.js` and the constant `CONTAINMENT` in `tests/engine/document-set.js` are the line of the shared names; the pack cases pass (the line first, written once, outside the computed units); biome, `pnpm run typecheck` and fallow report nothing on the file; `update-engine-meta` run after the edit
- **Handoff:** T-79T01.
- **Notes:** The case compares the pack's first lines with the constant, so the two change together; a mutation of the line is caught by the existing containment case.
- **Changes:** CONTAINMENT_LINE in pack.js and the harness constant CONTAINMENT carry the component-key exception, word for word as the shared names; 26 document-set cases pass; typecheck, fallow dead-code and audit report nothing; engine 3.0.176

### [T-79C01] The checker reports a comment left in a neutral file

- **Spec:** l1-sdd-document-set.md §5.1 (a document keeps no template comment), §5.9; l2-sdd-document-set-engine.md §5.2 (`check-docs`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable project holding the `good` fixture, an HTML comment added to `spec/hello.md` gives exactly the finding of the shared names and exit 1, and two comments in the same file give it once; a comment in a stack file gives none; the four fixtures give their recorded findings unchanged; biome, typecheck and fallow report nothing on `check-docs.js`; `update-engine-meta` run after the edit
- **Handoff:** T-79H01 pins it.
- **Notes:** One small function called from `checkDocSet`, beside `checkVocabulary`, reading the same neutral files. The template case's filled set now gets these findings; it asserts no file or heading finding and needs no change (PLAN.md Phase 79, planning-surfaced 3).
- **Changes:** check-docs gains checkComments (an HTML comment outside a code span in product.md, rules.md, plan.md or spec/ is one finding per file) with neutralFiles shared with the vocabulary check and the helper withoutCodeSpans; verified on a disposable good project: two comments give the one finding and exit 1, an opener inside a code span and a comment in a stack file give none; 26 cases pass, the four fixtures' findings unchanged; typecheck, fallow and audit report nothing; engine 3.0.177

### [T-79C02] The checker reads no reference inside a code span

- **Spec:** l1-sdd-document-set.md §5.2 (a value shaped like an address inside a code span is a literal), §5.9; l2-sdd-document-set-engine.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable `good` project, a requirement's text holding `` `C3` `` and `` `M1` `` gives no finding, the same tokens bare give the unresolved-reference findings they give today, and an `Observed by` naming a component key in backticks is still checked; the packs of the fixtures are unchanged (the printed sizes of `pack` on `good` equal the ones before the change); the four fixtures give their recorded findings unchanged; biome, typecheck and fallow report nothing; `update-engine-meta` run after the edit
- **Handoff:** T-79H01 pins it.
- **Notes:** In `inlineRefs` (`DocSet`), the text has its code spans removed before the two address patterns run; `checkObservedRefs` does not use `inlineRefs` for its backticked keys, and that is verified before the change, not assumed.
- **Changes:** inlineRefs reads a text without its code spans; verified on a disposable good project: byte and road values in single- and double-backtick spans resolve nothing and are no finding, the same values bare give the two unresolved findings as before, the backticked key of an Observed by is still checked, the pack of good is unchanged (116 computed tokens, file 257); 26 cases pass, fixtures' findings unchanged; typecheck, fallow and audit report nothing; engine 3.0.178

### [T-79F02] The guidance of concept 1.5.0 in the templates of the set

- **Spec:** l1-sdd-document-set.md §5.1, §5.2, §5.3; l2-sdd-document-set-engine.md §5.3 (the guidance of 1.5.0)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** each of the thirteen templates begins its first comment with the template sentence of the shared names; `product.md` says "what every stack provides by itself" where it said "what every runtime offers" and that no external need is `- none`; `bind.md` has `Defines: {…, or — for a unit that defines no name}` and the manifest pinned by a unit of the component the first milestone's use of the product enters through; `tasks.md` says the task stage splits a unit the milestone needs in part or one too large (the first part keeping the address) and that `Produces` names every consuming task, a unit with no name produced only to a task that extends its file; `spec.md` says a value shaped like an address is written inside a code span; the template case passes; `update-engine-meta` run after the edit
- **Handoff:** T-79S01.
- **Notes:** Guidance goes into comments and field braces only, never into a section the checker or the pack reads as data (Vocabulary, Tools; Phase 77's pattern).
- **Changes:** All thirteen templates' first comment opens with 'A document written from this template keeps none of its comments.'; product.md says what every stack provides by itself and '- none' for no external need; bind.md has 'Defines: {…, or — for a unit that defines no name}' and the manifest on the component the first milestone's use enters through; tasks.md has the task stage splitting units and Produces naming every consuming task; spec.md says a value shaped like an address goes inside a code span; 26 cases pass, the template case included; engine 3.0.179

### [T-79H01] Harness cases for the comment finding and the code-span literal

- **Spec:** l1-sdd-document-set.md §5.2, §5.9; l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with two new cases — a comment in a neutral file is one finding per file and none in a stack file; a value shaped like an address in a code span is no reference while the same value bare is, and a backticked key of an `Observed by` is still checked; each fails with its T-79C change reverted (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-79T01.
- **Notes:** Disposable copies of `good` only, never the fixture.
- **Changes:** Two cases in tests/engine/document-set.js — a comment left in a neutral file (two comments one finding; an opener in a code span and a stack file's comment none) and an address-shaped value (literal in single- and double-backtick spans, reference when bare, a backticked key of an Observed by still checked), on disposable copies of good; 28 document-set cases pass; mutation control CAUGHT 2/2

### [T-79S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.5.0 (§5.2, §5.3, §5.6 step 3); l2-engine-templates.md (the templates of `set/`); l2-test-suite.md (the `document-set` module)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-engine-templates.md` names the guidance of 1.5.0; `l2-test-suite.md` counts the module's cases after this phase; `l2-sdd-document-set-engine.md` records the phase as built and that step 3 may now begin (a patch, Stable retained, no requirement changed); `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-79T01.
- **Notes:** As-built patches only.
- **Changes:** l2-sdd-document-set-engine 1.5.1, l2-engine-templates 1.3.9 and l2-test-suite 1.48.11 record the phase as built (patches, Stable retained, no requirement changed; step 3 may begin); registry 1.104.1; verify-headers: no header drift, one expected SYNC_GAP (plan on registry 1.104.0); export-wiki run

### [T-79T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; `check-docs --workspace=engine` prints the 3.x line and exits 0
- **Handoff:** Phase 70 is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** biome clean on the three changed js files; typecheck, fallow dead-code and pnpm run audit report nothing; full harness 491 pass, 0 fail (390 s); update-engine-meta --check passes at 3.0.179; check-docs --workspace=engine prints the 3.x line and exits 0
