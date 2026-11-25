---
phase: 73
name: "The Format Brought to the Amendments of the Forward Gate (4.0 Step 1, after Run 1)"
status: Done
subsystem: "skills/magicspec (scripts/check-docs.js, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 68: check-docs, pack, the thirteen templates of templates/set/ and the document-set harness module with its four fixture sets and golden.json"
  - "Phase 69: run 1 of the forward gate and its record, simulations/forward-gate.md (findings F1 to F8)"
  - "The specifications: l1-sdd-document-set 1.1.0 and l2-sdd-document-set-engine 1.1.0, Stable at registry 1.100.0, plan 1.88.0"
provides:
  - "templates/set/neutral-writing.md: the neutral writing table of concept 5.3 (18 rows) with its introducing and review paragraphs, word for word, pinned by a harness case"
  - "Five templates of the set (rules, stack-rules, profile, plan, tasks) state the guidance of concept 1.1.0; bind.md needs none"
  - "check-docs reports a rule without From, one line per rule address, only when plan.md defines a milestone"
  - "Harness 480 -> 484 (document-set 17 -> 21); engine 3.0.165 -> 3.0.168; l2-engine-templates 1.3.6, l2-test-suite 1.48.8, l2-sdd-document-set-engine 1.1.1; registry 1.100.1"
key_files:
  created:
    - "skills/magicspec/templates/set/neutral-writing.md"
  modified:
    - "skills/magicspec/scripts/check-docs.js"
    - "skills/magicspec/templates/set/ (rules, stack-rules, profile, plan, tasks)"
    - "tests/engine/document-set.js, tests/engine/fixtures/document-set/ (golden.json, sets/good/rules.md)"
    - ".magicspec/engine/specifications/ (three specifications), .magicspec/engine/INDEX.md"
    - "CHANGELOG.md"
patterns_established:
  - "A shipped copy of a table that a specification owns is generated from the specification and pinned by a harness case that reads both, so an amendment that misses the shipped file fails the suite"
duration_minutes: 20
---

# Stage 73 Tasks — The Format Brought to the Amendments of the Forward Gate (4.0 Step 1, after Run 1)

**Phase:** 73
**Status:** Done
**Strategic Goal:** What run 2 of the forward gate hands its agents follows concept 1.1.0: the templates of `templates/set/` carry the new guidance lines, `templates/set/neutral-writing.md` carries the neutral writing table word for word, and `check-docs` reports a rule without `From` once the plan defines a milestone and stays silent before; nothing a 3.x workspace reads or writes changes.

**Shared names (fixed here so no two tasks choose different spellings):**

- The new file: `skills/magicspec/templates/set/neutral-writing.md`, headed `# Writing the neutral layer`, then the one paragraph that introduces the table, the table of concept §5.3 (eighteen rows, the header `| Instead of | Write |`), and the review paragraph that follows it in the concept, all word for word; no field lines, no `{placeholder}`.
- The new finding of `check-docs`, one per rule, only when `plan.md` defines at least one milestone: `rules.md: {R address} has no From, while plan.md defines milestones`.
- The guidance lines, as concept 1.1.0 §5.3 and §5.5 state them: `rules.md` — `From` is added by the plan stage, a rule written before the plan has none; `stack-rules.md` — `Realizes: {R addresses, or — for a convention only this stack has}`, such a rule listed in the Context of every task it governs; `profile.md` — the profile reaches no pack, so a convention a builder must follow is a stack rule; `plan.md` — `Closes: {component keys}`, `Needs: —` when none, a backlog with nothing waiting as `- none`; `tasks.md` — `Produces: —` for work no later task of the milestone uses, `{file} (extends M{n}.T{k})` for a test file the task extends (the address is the task that created it, and the task is After it), the exit status in the expected result of a command.
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`; the fixtures under `tests/engine/fixtures/document-set/` (`sets/{good,bad,bad3,bad4}`, `golden.json`).

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-73F01] The neutral writing table in `templates/set/neutral-writing.md`
- [x] [T-73F02] The guidance lines of concept 1.1.0 in five templates of the set
- [x] [T-73C01] `check-docs` reports a rule without `From` once the plan defines a milestone
- [x] [T-73C02] The fixtures follow the new finding
- [x] [T-73H01] Harness cases for the `From` finding and `Realizes: —`
- [x] [T-73H02] Harness cases for the folder's contents and the table word for word
- [x] [T-73S01] The specifications as built
- [x] [T-73T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-73F01] The neutral writing table in `templates/set/neutral-writing.md`

- **Spec:** l1-sdd-document-set.md §5.3 (the neutral writing table and its review paragraph); l2-sdd-document-set-engine.md §5.3 (`neutral-writing.md`), §4 row I9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/templates/set/neutral-writing.md` exists; its table has eighteen data rows and its rows, the introducing paragraph and the review paragraph equal the concept's text (T-73H02 pins it); `grep -c "{" skills/magicspec/templates/set/neutral-writing.md` prints 0; `update-engine-meta` run after the write
- **Handoff:** T-73H02 compares it with the concept; T-73S01 records it in `l2-engine-templates.md`.
- **Notes:** Copied from the specification, not rewritten: the concept is the one place of the table and the file its shipped copy. Only the heading and the bold lead-in of the concept (`**The neutral writing table.**`, the `[ADDED]` marker) are left out. LF line endings, as every file of the folder.
- **Changes:** templates/set/neutral-writing.md generated from concept 5.3: the introducing paragraph, the 18-row table and the review paragraph word for word, LF, no placeholder; C14 3.0.165 -> 3.0.166

### [T-73F02] The guidance lines of concept 1.1.0 in five templates of the set

- **Spec:** l1-sdd-document-set.md §5.3 (Rule `From` and `Realizes`, Milestone `Closes` and `Needs`, Task `Produces`, `Creates`, `Done when`), §5.5 (the empty backlog), §5.6 (a rule reaches a pack only through Context); l2-sdd-document-set-engine.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `rules.md` names the plan stage in its comment and its `From` field line; `stack-rules.md` has the field line `- Realizes: {R addresses, or — for a convention only this stack has}` and names Context in its comment; `profile.md` has a comment saying the profile reaches no pack; `plan.md` has `- Closes: {component keys}`, `Needs: —` in its comment or field line and `- none` under its Backlog guidance; `tasks.md` names `Produces: —`, `(extends M{n}.T{k})` and the exit status; each changed template filled with one placeholder unit is read by `check-docs` without a parse error (the existing template case passes); `update-engine-meta` run after the edit
- **Handoff:** T-73H02 runs the existing template case over them.
- **Notes:** Five files: `rules.md`, `stack-rules.md`, `profile.md`, `plan.md`, `tasks.md`. The plan's estimate named six templates; no line of concept 1.1.0 belongs to `bind.md`, so it is unchanged. Guidance goes into the existing `<!-- … -->` comment of each file and into the field lines' braces, in the concept's words; no example content (l2 §5.3). The field line `- From:` stays in `rules.md`, its brace saying it is added by the plan stage.
- **Changes:** guidance lines added to rules.md, stack-rules.md, profile.md, plan.md and tasks.md (bind.md unchanged: no line of concept 1.1.0 belongs to it); every template filled with one placeholder unit is read to the summary line with no file or heading finding (scratch fill run: 13 addresses, 1 task, only unfilled-placeholder findings; the harness template case is updated with the folder contents later in this phase); C14 3.0.166 -> 3.0.167

### [T-73C01] `check-docs` reports a rule without `From` once the plan defines a milestone

- **Spec:** l1-sdd-document-set.md §5.9 (rules without `From` on a set whose plan defines a milestone), §5.3 (`From` written by the plan stage); l2-sdd-document-set-engine.md §5.2 (`check-docs`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable 4.0 project, a set whose `rules.md` holds a rule without `From` and whose `plan.md` defines no milestone gives no finding for it; the same set with one milestone gives exactly the finding of the shared names, once per such rule; a rule with `From` gives none; `node skills/magicspec/scripts/executor.js check-docs --workspace=engine` still prints the 3.x line and exits 0; biome, `pnpm run typecheck` and fallow report nothing on the file
- **Handoff:** T-73C02 updates the fixtures; T-73H01 pins the behaviour.
- **Notes:** In `parseRulesAndMemory` (the loop over `R{n}` units, which today skips a rule with no `From`), or in a small function it calls, so no function crosses the complexity thresholds; whether the plan defines a milestone is known from `set.milestones` once `parsePlan` has run, so the check runs where both are parsed. Stack rules are untouched: `Realizes: —` is already filtered by `addressList` and must stay so (T-73H01 pins it). The lab checker is not changed: the engine's checker is the reference from this phase on (PLAN.md, Phase 73, planning-surfaced 2).
- **Changes:** check-docs.js: a rule without From is recorded and reported once per address, one line each, only when plan.md defines a milestone (checkPlan returns early without one); header comment names the finding; verified on the good set: no From with milestones -> the finding, From M1 -> none, no milestone -> none; the 3.x line unchanged; biome (format applied), typecheck, fallow dead-code and audit report no issue; C14 3.0.167 -> 3.0.168

### [T-73C02] The fixtures follow the new finding

- **Spec:** l2-sdd-document-set-engine.md §5.6 step 1 (`good` gains its `From` line; the recorded findings of `bad` and `bad4` gain one finding per rule without it)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `sets/good/rules.md` has `- From: M1` and `check-docs` on `good` reports nothing; `golden.json` records for `bad` and `bad4` the output `check-docs` now gives, which differs from the Phase 68 record only by the new `From` lines; `bad3` (its three rules carry `From`) is unchanged
- **Handoff:** T-73H01 runs the fixture cases against the new record.
- **Notes:** `bad` holds two units headed `R1` (a duplicate address the set already reports): record what the checker prints for them, and say in this entry's `Changes` whether it is one line or two, so the record is a measured output and not a guess. `good` takes `M1`, its first milestone; its rule's `Checked by` names no component in backticks, so no rule-check finding follows.
- **Changes:** sets/good/rules.md gains From: M1 (good: 0 findings); golden.json gains one line for bad (its two units headed R1 give one line, the address once) and one for bad4, kept lines in their order, bad3 unchanged (10 findings); biome clean

### [T-73H01] Harness cases for the `From` finding and `Realizes: —`

- **Spec:** l1-sdd-document-set.md §5.3, §5.9; l2-test-suite.md (the harness by domain); l2-sdd-document-set-engine.md §5.6 step 1 (each case written with the code it pins)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with three new cases — a rule without `From` before any milestone gives no finding, the same rule beside a milestone gives the finding of the shared names, a stack rule with `Realizes: —` gives no finding — and with the four fixture cases against the updated `golden.json`; each new case fails with the T-73C01 change reverted (`scripts/mutation-check.js` CAUGHT, or the revert run by hand and recorded in `Changes`)
- **Handoff:** T-73T01 runs the full harness.
- **Notes:** Variants are built from the `good` fixture in a disposable project, as the existing cases do, never against this repository's `.magicspec/`. Case names begin `document set:`.
- **Changes:** three cases added to the document-set module (no From before a milestone; one finding per rule beside milestones, two rules; a stack rule with Realizes: — needs no neutral rule, with a missing-address control); the four fixture cases pass against the new golden; mutation controls 3/3 CAUGHT (finding dropped, finding before a plan, the dash read as an address); document-set run 20 cases, 19 pass, the one failure being the folder-contents assertion that the next task changes; biome clean

### [T-73H02] Harness cases for the folder's contents and the table word for word

- **Spec:** l2-sdd-document-set-engine.md §5.3 (`neutral-writing.md` beside the thirteen templates); l1-sdd-document-set.md §5.3 (the table); PLAN.md Phase 73, planning-surfaced 1 and 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the case that asserts the contents of `templates/set/` expects the thirteen templates and `neutral-writing.md`, and no other file; a new case reads the table rows of `.magicspec/engine/specifications/l1-sdd-document-set.md` §5.3 and of `neutral-writing.md` and finds them equal, and fails when one row of either is changed; the template case reads every template but `neutral-writing.md`, which has no field lines; `node --test --test-name-pattern="document set" tests/engine.js` passes
- **Handoff:** T-73T01.
- **Notes:** The comparison reads the specification from this repository: it is a harness case of the engine's own repository, which ships nothing of `.magicspec/` (the layer boundary holds — `tests/` is maintenance, not the skill folder). Compare the table rows and the two paragraphs after normalizing nothing but trailing spaces.
- **Changes:** the folder-contents case expects the thirteen templates and neutral-writing.md and no other file; a new case compares the shipped table with the concept section 5.3 (header, separator and eighteen rows, the introducing and the review paragraph); the template case reads the thirteen templates only; document-set 21 of 21; mutation: a changed shipped row CAUGHT, a changed row of the specification fails the case (restored byte for byte); biome clean

### [T-73S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.1.0 (§5.2, §5.3, §5.6 step 1, §6 item 2); l2-engine-templates.md (the inventory of `templates/set/`); l2-test-suite.md (the `document-set` module's cases)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-engine-templates.md` names `neutral-writing.md` beside the thirteen templates of `set/`; `l2-test-suite.md` counts the module's new cases; `l2-sdd-document-set-engine.md` records the phase as built (a patch, Stable retained, no requirement changed); each file's header and `INDEX.md` row agree (`check-prerequisites --verify-headers` reports no drift); `export-wiki` run
- **Handoff:** T-73T01.
- **Notes:** As-built patches only; a requirement found wrong while building goes back as a replan directive, not into these patches.
- **Changes:** as built: l2-engine-templates 1.3.6 (the fourteenth file and the five templates' guidance), l2-test-suite 1.48.8 (document-set 17 -> 21 cases), l2-sdd-document-set-engine 1.1.1 (step 1 built, section 6 item 2 done); registry 1.100.1; verify-headers: no drift (only the expected SYNC_GAP against the plan's 1.100.0); export-wiki run

### [T-73T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck` and `pnpm exec fallow dead-code` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `node skills/magicspec/scripts/executor.js update-engine-meta --check` passes after the last C14 run; `check-docs --workspace=engine` prints the 3.x line and exits 0
- **Handoff:** Phase 74 (the forward gate, run 2) is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background (several minutes); read its `ℹ pass` / `ℹ fail` counters. An inherited finding on code this phase did not touch is reported and left.
- **Changes:** biome clean on the changed JS and JSON files; typecheck, fallow dead-code and audit report no issue on this phase's files; full harness 484 of 484 pass (was 480); update-engine-meta --check: no changes (engine 3.0.168); check-docs on this workspace prints the 3.x line and exits 0; fallow prints one inherited configuration warning (an entry glob that matches one folder level), left as it is
