---
phase: 59
name: "Layout of the Suites (Harness by Domain, Cognitive Suite by Area)"
status: Done
subsystem: "tests (engine.js, engine/, suite.md, suite/), skills/magicspec-dev/workflows/test.md, .fallowrc.json"
requires:
  - "Phases 54 to 58: the harness it splits (445 cases) and the cognitive suite (cases up to T356, version 1.9.105)"
  - "Phase 56: Biome over every *.js, the non-strict type check over the files that carry // @ts-check, Fallow with the entry tests/*.js"
  - "The specification: l2-test-suite 1.47.0 §Layout of the Suites (HL-1 to HL-7, SL-1 to SL-5), Stable at registry 1.79.0, plan 1.68.0"
provides:
  - "tests/engine.js is a 43-line entry (shebang, one describe, 33 modules registered in the order their sections had) with the domain modules in tests/engine/ and two helper layers in tests/engine/lib/ (base: the root and 36 fixtures; sim: the consumer-simulation helpers and every helper two or more modules use); no case renamed, lost or reordered (445 names before, the same plus the two layout names after); 447 of 447 on the direct run and under node --test, 294 s serial against 305 s"
  - "tests/suite.md is a 4.7 KB index (how to run, pass criteria, the table of areas with identifiers, the closing line v1.9.107 Last T358) and tests/suite/ holds 17 area files, the largest 53 KB, 357 cases, identifiers unchanged; the stale closing line (v1.9.99, T277) is gone"
  - "/magicspec-dev:test {area} reads the index, one area file and the text its cases cite (about 20 KB for spec-intake, 57 KB for spec, against the 404 KB of the one file); a workflow name that is also an area keeps its direct walkthrough and adds the area's cases; docs/dev-test.md and the maintenance layout reference follow"
  - "Two layout cases (harness: modules registered once, none missing, no case in the entry, a line bound; suite: each identifier once, each index row exact, Last the greatest) under six mutation entries, all caught with the 20 of Phase 58"
  - "Fallow's entry tests/**/*.js, // @ts-check on 25 of the 36 harness files, Biome and Fallow clean; l2-test-suite 1.48.0 at registry 1.80.0"
key_files:
  created:
    - "tests/engine/ (33 modules)"
    - "tests/engine/lib/base.js"
    - "tests/engine/lib/sim.js"
    - "tests/suite/ (17 area files)"
  modified:
    - "tests/engine.js"
    - "tests/suite.md"
    - "skills/magicspec-dev/workflows/test.md"
    - "skills/magicspec-dev/references/maintenance-layout.md"
    - "docs/dev-test.md"
    - ".fallowrc.json"
    - ".magicspec/engine/specifications/"
patterns_established:
  - "A monolithic test file is split by script, never by hand, behind a facade that keeps its entry and its case names, and proved by the sorted case names and a full run, not by reading"
  - "A text transformation over code must not touch code that is generated inside a string: a blanket rename of __dirname broke a fixture script that embeds it, found only by the full run"
  - "A split checks itself: a case asserts that every module is registered once and every identifier appears once, and a mutation shows it fails when they are not"
  - "A suite read by an agent is read by area: the index says where, and a run costs what its area costs"
duration_minutes: ~
---

# Stage 59 Tasks — Layout of the Suites (Harness by Domain, Cognitive Suite by Area)

**Phase:** 59
**Status:** Done
**Strategic Goal:** The two oversized test files become a set a person or an agent can read, search and edit by part: the harness keeps its one entry, its case names and its serial run and registers one module per domain over two layers of shared helpers; the cognitive suite becomes an index and one file per area, and a run of one area reads one area.

**Phase notes:**

- **Tracks.** `S` the cognitive suite (text only, independent of the harness); `H` the harness (a queue: every task cuts from `tests/engine.js`); `E` the scenarios; `T` validation; `Y` the specification sync. `S` runs beside `H`; `H06` waits for `S01` because the suite's layout check is a harness case.
- **No engine code and no C14.** `tests/`, `scripts/` and `skills/magicspec-dev/` are outside the shipped manifest. No file of `skills/magicspec/` changes, so no task runs `update-engine-meta`.
- **The proof of every harness task** is the same two facts: the sorted list of case names printed by `node --test --test-reporter=tap tests/engine.js` equals the baseline taken in `H01` (HL-3), and the run is `ℹ pass` equal to the baseline count with `ℹ fail 0`. A task that changes either stops and repairs before the next cut.
- **Cut by script, not by hand.** A module is produced by a throwaway script that copies a line range of the file between two banner comments into a new module and deletes it from the source; the script and the baseline stay in the scratchpad, outside the repository.
- **Static checks** after each module: `node_modules/.bin/biome check {files}`, `pnpm run typecheck`, `pnpm run audit`. A module that passes the type check carries `// @ts-check` (Phase 56 note 12).
- **Task Instruction Review (PQ-6).** `@role:prompt-engineer` reviewed this workbook before it was written. Verdict: PASS-WITH-REWRITES. Three rewrites were applied inline: the baseline is defined in H01 and named in every later `Verify`; "domain" is closed by the map H01 records, not left to each task; H06 states what the entry holds when it is finished.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-59S01] The cognitive suite: the index and one file per area, identifiers unchanged, the closing line written from the highest identifier
- [x] [T-59S02] `/magicspec-dev:test {area}` reads the index, one area and the text its cases cite, and the harness pins of that workflow follow
- [x] [T-59H01] Baseline, the domain map, the two shared helper layers and the one root
- [x] [T-59H02] Domain modules, batch one: integrity and the manifest, the prerequisite check, init, executor and hooks, diagnostics, the scanners' ignore rules
- [x] [T-59H03] Domain modules, batch two: finalization, session state, the archiver, resume and the checkpoint contract
- [x] [T-59H04] Domain modules, batch three: the shipped-text contracts, by the workflow they read
- [x] [T-59H05] Domain modules, batch four: the skill layout and its release archive, the migration, hardening, routing, the caches, the community files
- [x] [T-59H06] Domain modules, batch five: the artifact index, the sync command, the toolchain; the entry reduced to registration; the two layout checks
- [x] [T-59H07] Tool scopes: Fallow's entry, `// @ts-check` on the modules that pass, Biome over every module
- [x] [T-59E01] The cognitive suite: the two scenarios the plan lists (T357 and T358)
- [x] [T-59T01] Validation: names equal, cases green, mutation entries caught, the serial time recorded, the static checks, an area run
- [x] [T-59Y01] Spec sync: the specification as built, the registry

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-59S01] The cognitive suite: the index and one file per area, identifiers unchanged, the closing line written from the highest identifier

- **Spec:** l2-test-suite.md §Layout of the Suites (SL-1, SL-2, SL-3)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** A throwaway script splits `tests/suite.md` at its `### T{N} —` headers, groups each case by the first value of its `**Workflow:**` field into `tests/suite/{area}.md` (the areas of SL-2; an area over about 60 KB is split by sub-area and the index says so), keeps each case's text byte for byte and in its original relative order, and rewrites `tests/suite.md` as the index: the how-to-run and pass-criteria text of the old head unchanged, a table of areas (area, file, identifiers) and the closing line `**Test Suite Finalized** - v{X} (Last: T{N})` with N the greatest identifier (356 at the start) and X the suite's current version bumped one patch. Checked with a script over old and new: the multiset of case texts is identical (355 cases), every identifier appears in exactly one file, each index row lists exactly the identifiers of its file, no area file exceeds the bound, and the old file's text outside the cases is the index's head. The result of the check is pasted into `Changes`.
- **Handoff:** T-59S02 changes the workflow that reads the suite; T-59H06 pins the layout.
- **Notes:** The old closing line read `v1.9.99 (Last: T277)` against a header of 1.9.105 and a last case T356; the index states the truth. [DR] Cases whose `Workflow` names several targets go where the first one points (SL-2); a case with no `Workflow` field goes to `scripts`. (Override: `/magicspec task engine "place {id} in {area}"`.)
- **Changes:** A throwaway script (kept outside the repository) split `tests/suite.md` at its `### T{N} —` headers into `tests/suite/{area}.md` by the first value of each case's `Workflow` field: analyze, context, fix, goal, help, init, plan, retrospective, rule, run, simulate, task, test, spec (52 cases, 52 KB), `spec-intake` (the 8 cases of the idea-intake gate), `scripts` (25, the cases whose target is a script) and `engine-text` (32, the constitution, role cards, templates, references and the status, graph, migrate and sync workflows) — 17 files, the largest 53 KB. `tests/suite.md` is now the 4.7 KB index: the old how-to-run and pass-criteria text (with the area sentence added), the table of areas with each file's identifiers, and the closing line `**Test Suite Finalized** - v1.9.106 (Last: T356)`. Checked by script against the old file: 355 cases, the multiset of case texts identical (the stale closing line `v1.9.99 (Last: T277)` that sat inside T277's text was removed, leaving the case text as it was), every identifier in exactly one file, each index row listing exactly the identifiers and the count of its file, `Last` the greatest identifier. [DR] The specification names the areas of the workflow bodies and `scripts`; the split needed two more (`spec-intake` and `engine-text`) to keep every file under the bound and every area one kind of target, recorded in the index and in T-59Y01. (Override: `/magicspec task engine "merge spec-intake into spec"`.)

### [T-59S02] `/magicspec-dev:test {area}` reads the index, one area and the text its cases cite, and the harness pins of that workflow follow

- **Spec:** l2-test-suite.md §Layout of the Suites (SL-4); `skills/magicspec-dev/workflows/test.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec-dev/workflows/test.md` says: `test` runs every area (it reads the index and every area file, as it read the one file); `test {area}` runs one area and reads only the index, that area's file and the shipped text its cases cite; a missing index, or no `### T{N} —` header across the index and the area files, falls back to Improv Mode as the one file's absence did; a new case is written into the area file of its `Workflow` with the identifier after `Last` and the index updated in the same change (SL-3). Every sentence of that workflow that named `tests/suite.md` as the file of the cases now names the index and the area files. `node --test --test-name-pattern="magicspec-dev|reader tier|test workflow" tests/engine.js` passes; any pin that asserted the old sentence is moved to the new wording in the same task, and the diff of the harness shows only such lines.
- **Handoff:** T-59E01 writes the scenarios that read this text.
- **Notes:** `skills/magicspec-dev/` is not in the shipped manifest, so no `update-engine-meta`.
- **Changes:** `skills/magicspec-dev/workflows/test.md`: the command line, the Surgical Fix step (a new case goes to the area file of its `Workflow`, takes the identifier after `Last` and updates the index in the same run), the diagram node, the Grounding Phase (`test`/`improv` read the index and every area file; new `area` mode reads the index, that area's file, the workflow body it is named for and the cited text) and the Test Suite bullet (the index missing, or no `### T{N} —` header across the index and the area files, falls back to Improv Mode) follow the split; a new Area bullet defines `/magicspec-dev:test {area}`: it runs that area's cases and reads nothing else of the suite, a workflow name that is also an area keeps its Direct walkthrough and adds the area's cases, a new case goes to its area and no identifier is renumbered. [DR] The existing Direct mode (`test {workflow}`) already walks a workflow, so an area named like a workflow adds its cases to that walkthrough instead of replacing it; the specification's SL-4 is amended to say so in T-59Y01. (Override: `/magicspec spec amend l2-test-suite.md "an area run replaces the direct walkthrough"`.) `docs/dev-test.md` (the surgical-fix row, section 3.3 with an area example, the adjudication line) and `skills/magicspec-dev/references/maintenance-layout.md` (the `tests/` row) follow. 49 of 49 harness cases that read these files pass (the maintenance skill, the adjudication pins, the shipped-text and documentation cases); no pin asserted the old suite sentence, so none moved. No file of `skills/magicspec/` changed, so no C14.

### [T-59H01] Baseline, the domain map, the two shared helper layers and the one root

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-1, HL-3, HL-4, HL-6)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The baseline is taken before any change: `node --test --test-reporter=tap tests/engine.js` gives the count (445 at the start) and the sorted list of case names, stored in the scratchpad as the file every later task compares with. A map of the file records, for each banner section, its line range and its domain (the domains of HL-2; the two oversized ones split by sub-domain), and the helpers each domain uses, found by a script over the closure's declarations; the map is the closed list of modules the later tasks create. `tests/engine/lib/base.js` exports the base fixtures that two or more domains use (the temporary workspace, cleanup, the fixture require, the checksum and prerequisite runners, the copied state template, the committed fixture and the rest the map names) and the one root of the repository (HL-6); `tests/engine/lib/sim.js` exports the consumer-simulation helpers (the consumer project, the executor runner, the writer, the tree digest and equality, the shipped-text reader, the SQLite guard, the stub provider, the memory fixtures the map names). `tests/engine.js` imports both and no longer defines what they export; its 59 uses of `__dirname` read the root. The tap case list equals the baseline and the run has no failure.
- **Handoff:** T-59H02 to T-59H06 cut domains that import `lib/`.
- **Notes:** A helper used by one domain stays in that domain's module (HL-4); the map decides which, once, here.
- **Changes:** Baseline before any change: `node --test --test-reporter=tap tests/engine.js` → 445 tests, 445 pass, 0 fail, 305 s serial; the sorted case names (446 lines with the `describe`) kept in the scratchpad as the file every later run is compared with. The map: a throwaway cutter (kept outside the repository) lexes the harness (no JavaScript parser is installed: TypeScript 7 has no compiler API), finds the 672 top-level statements of the one `describe` (445 cases, 227 helpers and constants) and assigns them to 32 contiguous modules named from the map in the plan notes, in the file's own order. `tests/engine/lib/base.js` (488 lines): `ROOT`, `TESTS_DIR` and the 36 base fixtures declared before the first section (temporary workspace, cleanup, the fixture require, the checksum and prerequisite runners, the copied state template, the committed fixture, the registry and finalize fixtures, …). `tests/engine/lib/sim.js` (845 lines): the 9 consumer-simulation helpers and the 45 more that the script found used by two or more modules (the shipped-text reader, the tree digest, the tracking-entry writer, the root and skill fixtures, the routing fixtures, …), each moved with the helpers it needs. Every `__dirname` (59) now reads `TESTS_DIR`, except one that sits inside the string that generates a fixture script, where it must stay literal: the first full run failed five revalidation cases until it was restored.

### [T-59H02] Domain modules, batch one: integrity and the manifest, the prerequisite check, init, executor and hooks, diagnostics, the scanners' ignore rules

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-2, HL-3, HL-5)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The sections the map assigns to these five domains are moved by the cutting script into `tests/engine/{integrity,prerequisites,init-executor-hooks,diagnostics,scanners}.js`; each exports a function that registers its cases inside the entry's `describe` and requires only `lib/`; the entry registers them in the order their sections had. The tap case list equals the baseline and `ℹ pass` equals its count; each new file is under the bound; `biome check` on them reports nothing.
- **Handoff:** T-59H03.
- **Notes:** The entry's remaining sections stay where they are until their batch.
- **Changes:** Done in the one cutting run of T-59H01 (the script moves contiguous ranges, so the five batches were one pass; each module's proof is the same run). Batch one: `manifest` (checksums and the architecture invariants, 252 lines), `init-sync-context` (326), `engine-meta` (682), `skill-wrappers` (352), `registry-and-settings` (660), `bloat-and-prerequisites` (1,082), `executor-input-and-hooks` (428), `scanners-and-context` (825), `diagnostics` (714). Each exports a function that registers its cases inside the entry's `describe` and requires only `lib/`; the unused imports the cutter left (a name seen as a word in a string) were removed by Biome's report.

### [T-59H03] Domain modules, batch two: finalization, session state, the archiver, resume and the checkpoint contract

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-2, HL-3, HL-5)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The sections the map assigns to finalization (the pipeline, the session-continuity cases, the diagnostics block of its output, the release rotation), the session-state writer (including the goal block), the archiver (eligibility, names, links, line endings), resume and the checkpoint contract are moved into modules of the map's names, split by sub-domain so that none passes the bound; same registration order, same proof: the tap case list equals the baseline, `ℹ pass` equals its count, `biome check` reports nothing.
- **Handoff:** T-59H04.
- **Notes:** This batch is about a quarter of the file; the cutting script runs section by section and the proof runs after each module, so a failure names one module.
- **Changes:** Batch two, same run: `finalize-session` (2,313 lines: the pipeline and session-continuity cases), `archiver` (293), `state-progress` (1,527), `state-goal` (532, with the 37-line archiver line-ending case that sits between the goal block and the executor cases), `resume-and-checkpoint` (847), `release-changelog` (374), `analysis-scripts` (577). None passes the bound of 2,500 lines. The full run after the cut: 445 cases, the sorted names equal to the baseline.

### [T-59H04] Domain modules, batch three: the shipped-text contracts, by the workflow they read

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-2, HL-3, HL-5)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The shipped-text section (the contracts of behaviour that is prose, about 5,600 lines) is divided by the workflow or module each case reads and moved into modules of the map's names, none passing the bound, together with the registry-text, body-navigation, setting-parity and containment-quoting sections the map assigns here; the helper that reads a shipped file stays in `lib/sim.js`. Same registration order, same proof: the tap case list equals the baseline, `ℹ pass` equals its count, `biome check` reports nothing.
- **Handoff:** T-59H05.
- **Notes:** Cases that cite one pin from two workflows go to the module of the workflow named first in their title.
- **Changes:** Batch three, same run: the shipped-text contracts (about 4,460 lines in one section) became `shipped-text-core` (1,385 lines), `input-pass` (552), `feedback` (796) and `routing-and-constitution` (1,656) by the topic each run of cases covers, cut at case boundaries (the section had a banner at its start only, so the starts are cases, not banners). The helper that reads a shipped file lives in `lib/sim.js`.

### [T-59H05] Domain modules, batch four: the skill layout and its release archive, the migration, hardening, routing, the caches, the community files

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-2, HL-3, HL-5)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The sections for project-root resolution, the graph folder, the skill folder, hardening, the migration, the release archive, the simulation pass, workspace routing, registered folders, cache retention, clean-cache, the contribution guide and the issue forms are moved into modules of the map's names (the simulation pass divided by what each case exercises), none passing the bound. Same registration order, same proof: the tap case list equals the baseline, `ℹ pass` equals its count, `biome check` reports nothing.
- **Handoff:** T-59H06.
- **Changes:** Batch four, same run: `project-root-and-graph-folder` (781 lines), `skill-folder` (1,073), `hardening` (224), `migrate` (575), `release-archive` (262), `command-line-contract` (1,239, the simulation pass of 2026-10-29 without its helpers), `workspace-routing` (410), `registered-folders-and-caches` (1,174), `community-files` (1,122). [DR] The plan's note named domains such as "skill layout and its release archive" as one; they are cut at the section the file already had, so the skill folder, the migration and the release archive are three modules. (Override: `/magicspec task engine "merge hardening and migrate"`.)

### [T-59H06] Domain modules, batch five: the artifact index, the sync command, the toolchain; the entry reduced to registration; the two layout checks

- **Spec:** l2-test-suite.md §Layout of the Suites (HL-1, HL-2, HL-7, SL-5)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The artifact-index sections (the index, its query coverage, its consumers), the sync sections and the toolchain and runtime sections are moved into modules; `tests/engine.js` then holds the shebang, the one `describe('Magic Engine Scripts')`, the import of `lib/` and the ordered registration of every module, and no case of its own. Two cases are added in a module of their own (`tests/engine/layout.js`): HL-7 asserts that every `tests/engine/*.js` (not `lib/`) is registered by the entry exactly once and that every registered module exists; SL-5 asserts that each `### T{N} —` appears once across `tests/suite.md` and `tests/suite/*.md`, that each index row lists exactly the identifiers of its file, that no area file is missing from the index and that `Last` is the greatest identifier. Both fail under a mutation (a module left unregistered, an identifier duplicated, a wrong `Last`), checked with `scripts/mutation-check.js`. The tap case list equals the baseline plus these two names, and `ℹ pass` equals the baseline count plus two. `node --test tests/engine.js` and `node tests/engine.js` both run the whole harness.
- **Handoff:** T-59H07.
- **Notes:** Depends on T-59S01 (SL-5 reads the new layout).
- **Changes:** Batch five and the entry: `artifact-index` (2,266 lines: the index, its query coverage and its consumers), `sync-command` (831), `toolchain-and-runtime` (297). `tests/engine.js` is 43 lines: the shebang, the one `describe('Magic Engine Scripts')` and the ordered registration of 33 modules, no case of its own; it runs both as `node --test tests/engine.js` and as `node tests/engine.js` (the release gate's form): 447 of 447 on the direct run. `tests/engine/layout.js` holds the two layout cases: the entry registers each module on disk once, none missing or left out, no case in the entry, one `describe`, the shebang kept, no module over 2,500 lines; and each `### T{N} —` appears once across the area files, every header is well formed, each index row lists exactly the identifiers and the count of its file, every area file is listed, no area file passes 60 KB, `Last` is the greatest identifier and the closing line carries the suite version. Six mutations (a module unregistered, registered twice, a case in the entry, a wrong `Last`, a repeated identifier, a wrong count) are all CAUGHT.

### [T-59H07] Tool scopes: Fallow's entry, `// @ts-check` on the modules that pass, Biome over every module

- **Spec:** l2-test-suite.md §Layout of the Suites ("Checks follow the files"); l2-engine-toolchain.md §5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.fallowrc.json` lists the entry `tests/**/*.js`; `node_modules/.bin/biome check tests` reports nothing; for each module `pnpm run typecheck` is run with the pragma added, and a module that passes keeps `// @ts-check` while one that fails is left without it (the pragma is never added to be removed again, and never left on a failing file); `pnpm run audit` reports no finding on the files this phase changed that was not already reported before it (the giant `describe` finding is gone); `pnpm exec fallow dead-code` reports nothing new.
- **Handoff:** T-59T01.
- **Changes:** `.fallowrc.json` lists the entry `tests/**/*.js`. `// @ts-check` was added to all 36 harness files and the type check run: 25 pass and keep it (the entry, both helper layers, the layout module and 22 domain modules); 11 fail with 22 errors in all (`archiver`, `artifact-index`, `command-line-contract`, `community-files`, `engine-meta`, `input-pass`, `migrate`, `registered-folders-and-caches`, `release-changelog`, `skill-folder`, `workspace-routing`) and were left without it, so the pragma stays only where `pnpm run typecheck` is clean (clean at the end). `biome check tests` reports nothing; `pnpm run audit` reports no finding on the changed files that was not reported before (the one `describe` of 27,370 lines is gone from the large-function list; the three test-file complexity warnings are the ones the harness already had, now located in their modules and not gated); `pnpm exec fallow dead-code` reports no issue.

### [T-59E01] The cognitive suite: the two scenarios the plan lists (T357 and T358)

- **Spec:** PLAN.md Phase 59 Scenarios; l2-test-suite.md §Layout of the Suites (SL-3, SL-4)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The area file for the maintenance simulation holds T357 (`/magicspec-dev:test {area}` reads the index, that area's file and the shipped text its cases cite, and not the other areas; the control is `test`, which reads every area) and T358 (a new case is written into the file of its `Workflow` with the identifier after `Last` and the index updated in the same change; the control is a case whose `Workflow` names two targets and goes where the first points), each with Synthetic State, Action, Expected, Control, Guards tested and Regression for; the index lists both and `Last` is T358; the SL-5 case of T-59H06 passes.
- **Handoff:** T-59T01.
- **Changes:** `tests/suite/test.md` gains T357 (an area run reads the index, one area and the cited text and not the rest, with the `test` run and the `spec` area-and-workflow control) and T358 (a new case goes to the file of its first `Workflow` value with the next identifier and the index updated; the control is a case put in the index or with a repeated identifier); the index lists both (the `test` area: 28 cases, 26 KB), the suite is 1.9.107 with `Last: T358` (357 cases in 17 files). The layout case of T-59H06 passes on the result.

### [T-59T01] Validation: names equal, cases green, mutation entries caught, the serial time recorded, the static checks, an area run

- **Spec:** l2-test-suite.md §Layout of the Suites
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` and `node tests/engine.js` pass (`ℹ pass` and `ℹ fail` pasted: the baseline count plus two, no failure); the sorted tap case list equals the baseline plus the two layout names; the 20 mutation entries of Phase 58 and the two layout mutations are rerun and all CAUGHT; the serial duration before (from H01's baseline) and after is recorded in `Changes`; `biome check`, `pnpm run typecheck` and `pnpm run audit` report nothing new; `/magicspec-dev:test` is run once as `test {area}` for one area and its read is the index, that file and the cited text only; `update-engine-meta --check` is clean and no file of `skills/magicspec/` changed (`git status`).
- **Handoff:** T-59Y01.
- **Changes:** Validation on Node 24.12. `node --test --test-reporter=tap tests/engine.js` → `# tests 447, # pass 447, # fail 0` (294 s serial against 305 s before the split); `node tests/engine.js` (the release gate's form) → `ℹ tests 447, ℹ pass 447, ℹ fail 0`. The sorted case names differ from the baseline by exactly the two layout names (`harness layout: …`, `suite layout: …`): no case lost, renamed or added otherwise (HL-3). Mutation control: the 18 + 2 entries of Phase 58 and the 6 layout entries, 26 CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED (one needle of the layout list was refreshed for the suite's new `Last`). Static: `biome check tests .fallowrc.json` clean; `pnpm run typecheck` clean with `// @ts-check` on 25 of the 36 harness files; `pnpm run audit` no finding on the changed files that was not reported before; `pnpm exec fallow dead-code` no issue. Read cost of an area run, measured on the files: the index 4.7 KB plus `spec-intake` 15 KB (about 20 KB) or `spec` 52 KB (about 57 KB), against the 404 KB of the one file before; a full `test` run reads all 17 files as it read the one. `update-engine-meta --check` clean and no file of `skills/magicspec/` was changed by this phase (the changes shown there are Phase 58's, uncommitted). Result sizes: `tests/engine.js` 1,278,206 bytes / 27,384 lines → 43 lines plus 33 modules (the largest 2,313 lines) and two helper layers; `tests/suite.md` 404 KB → a 4.7 KB index plus 17 area files (the largest 53 KB). The cognitive read of the area mode is T357 (the Area bullet and the Grounding Phase of the workflow state it; the area files and the index exist as they say).

### [T-59Y01] Spec sync: the specification as built, the registry

- **Spec:** l2-test-suite.md; INDEX.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-test-suite.md` records what the build decided (the module list and the two helper layers, the bound and the two split domains, the area list and any area split, the suite's version and last identifier, the serial time before and after, the pins that moved) with a patch or minor bump and a history row; the registry rows and versions match every file header (`check-prerequisites --verify-headers` clean); no requirement changed, so the specification stays Stable.
- **Handoff:** `/magicspec run` ends the phase with `finalize --workflow=run`, which archives the workbook.
- **Changes:** `l2-test-suite.md` 1.47.0 → 1.48.0: §Layout of the Suites gains an "As built (Phase 59)" paragraph (the entry, the 33 modules by name, the two helper layers, contiguity keeping the registration order, the suite's index and 17 files, the proof by case names and a full run, the 26 mutation entries, the type-check pragma on 25 of 36 files, parallel execution still unspecified); SL-2 and SL-4 are made exact (the areas as built, including `spec-intake` and `engine-text`, and an area that is also a workflow name keeping its direct walkthrough); a history row. Registry row 1.48.0, engine registry 1.79.0 → 1.80.0 with its Last Updated entry, global registry 1.51.0 → 1.52.0. `check-prerequisites --verify-headers` reports no header drift; its one warning is the plan's `SYNC_GAP` against the new registry, recorded as the replan directive. No requirement changed; the specification stays Stable.
