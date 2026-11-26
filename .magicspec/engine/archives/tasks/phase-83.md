---
phase: 83
name: "4.0.0 (4.0 Step 4, Part 5)"
status: Done
subsystem: "skills/magicspec (scripts: build-spec-graph, export-wiki, the artifact index, lib/migrate-to-4, lib/sync-registry; .version), docs, README.md, SECURITY.md, CHANGELOG.md, tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications, the release script"
requires:
  - "Phase 85: migrate --to 4, the stop of a move in flight and the predicate moveInFlight (engine 3.0.229)"
  - "The specifications: l2-sdd-document-set-engine 1.7.2 §5.5, §5.6 step 4, l1-skill-packaging SP-10, l1-sync-command SY-1, l2-spec-graph-memory, l2-artifact-memory-store, l2-release-pipeline, Stable at registry 1.107.2, constitution 2.0.0, plan 1.100.0"
provides:
  - "The graph, the wiki and the artifact index leave out a workspace whose move to 4.0 is unfinished"
  - "The global registry row of a 4.0 workspace links no registry (the move and sync)"
  - "docs/document-set.md, the 3.x to 4.0 section of the migration page, SECURITY.md on 4.0.x, the version file at 4.0.0 and the [4.0.0] changelog section"
  - "A release plan with no blocker; nothing published (the owner deferred the release)"
key_files:
  created:
    - docs/document-set.md
    - tests/engine/artifact-search.js
    - tests/engine/finalize-state.js
  modified:
    - skills/magicspec/scripts/build-spec-graph.js
    - skills/magicspec/scripts/lib/memory-sections.js
    - skills/magicspec/scripts/lib/sync-registry.js
    - skills/magicspec/scripts/lib/migrate-to-4.js
    - skills/magicspec/scripts/check-docs.js
    - skills/magicspec/workflows/migrate.md
    - skills/magicspec/workflows/sync.md
    - tests/engine/migrate-to-4.js
    - docs/migration.md
patterns_established:
  - "A registry row that has no registry to link is written by one helper for every writer"
  - "A harness pin on the shape of a call reads it across lines, an absence pin included"
duration_minutes: ~
---

# Stage 83 Tasks — 4.0.0 (4.0 Step 4, Part 5)

**Phase:** 83
**Status:** Done
**Strategic Goal:** 4.0.0 ships with nothing reading a half-moved workspace, a global registry whose rows link only registries that exist, documents that say what a 4.0 workspace is and how to move to one, the version file at 4.0.0 and a release that publishes only on the owner's yes.

**Shared names (fixed here so no two tasks choose different spellings):**

- A workspace in flight is the one `lib/doc-set-state.js` `moveInFlight` names; the readers of `T-83G01` take it from there and from nothing else.
- The global row of a 4.0 workspace names it without a link: `| {name} | …`, the other cells as they are.
- The new page: `docs/document-set.md`, titled `# The 4.0 Document Set`; `docs/migration.md` gains `## From 3.x to 4.0`.
- The release section: `## [4.0.0] - {date}` in `CHANGELOG.md`, written by `release-changelog --version 4.0.0`; `SECURITY.md` gains the row `| \`4.0.x\` | Yes |` above `3.0.x`, which reads`No`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-83G01] The graph, the wiki and the artifact index leave out a workspace in flight
- [x] [T-83G02] The global registry row of a 4.0 workspace links no registry
- [x] [T-83H01] Harness cases for the two gaps
- [x] [T-83Y01] The variant of S-20
- [x] [T-83D01] `docs/document-set.md`
- [x] [T-83D02] The migration page, the README and the distribution page
- [x] [T-83S01] The specifications as built
- [x] [T-83T01] Validation: static checks, full harness, C14
- [x] [T-83V01] `SECURITY.md`, the version file at 4.0.0 and the `[4.0.0]` section
- [x] [T-83R01] The release plan and its one consent question

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-83G01] The graph, the wiki and the artifact index leave out a workspace in flight

- **Spec:** l1-skill-packaging.md SP-10; l2-sdd-document-set-engine.md §5.5 (Resuming a move); l2-spec-graph-memory.md; l2-artifact-memory-store.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the move fixture with a second workspace registered as the default and `docs` in flight, `build-spec-graph --json --no-cache`, `export-wiki` (the pages of the wiki folder) and the artifact index (`listArtifacts` and `memory-query --json`) give the same output as on the same copy with `docs` removed from the registry and the disk; with the move finished `docs` is read again; their output on this repository is byte for byte the same as before; `update-engine-meta` run after the edit
- **Handoff:** T-83H01 pins it; T-83S01 records it.
- **Notes:** Every enumeration of the registered workspaces in these three readers is listed in `Changes`; the skip is the `moveInFlight` predicate, so a workspace in the 4.0 format with `archives/3x/` is read.
- **Changes:** Enumerations of the workspaces in the three readers: the graph's `extractWorkspaces` is the only one that reads the registry (`main` walks its keys) and now skips a workspace `moveInFlight` names; the wiki reads no registry (it renders the graph's nodes and prunes its pages first, so it follows); the index walks the state folder, and `listArtifacts`, through the new `isLeftOut`, skips a top-level folder the predicate names (`memory-refresh` and `memory-query` enumerate nothing). Probe on the move fixture with `web` as the default and `docs` in flight: before the change graph, wiki, `listArtifacts` and `memory-query --json` all differed from the copy without `docs`; after it all four are the same, and `docs` is read again once the move is applied. On this repository `diff -r` of the graph JSON, the wiki folder, `listArtifacts` and a query before and after: no difference. The harness case that held the memory modules to their siblings now also allows the move predicate and pins what that brings (Node and the shared utilities). Engine 3.0.230; 28 related cases pass.

### [T-83G02] The global registry row of a 4.0 workspace links no registry

- **Spec:** l1-sync-command.md SY-1 (the global registry's workspace rows are derived); l2-sdd-document-set-engine.md §5.5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the move fixture the apply step leaves the row of `docs` in `.magicspec/INDEX.md` as the shared names state and changes no other line; on a 4.0 workspace whose row still links `{name}/INDEX.md`, `sync` writes the bare name, reports it as one write of the `registry` area and writes nothing on a second run; a 3.x workspace's linked row is untouched; `update-engine-meta` run after the edit
- **Handoff:** T-83H01 pins it; T-83D01 names it.
- **Notes:** One helper renders the row's name cell for both writers, so they cannot disagree.
- **Changes:** One helper, `withoutRegistryLinks` in `lib/sync-registry.js`, writes the row of a workspace that has no registry, for both writers: the name cell becomes the bare name, a cell that only links that registry (the `Registry` column) is emptied, every other cell stays as written. The apply step calls it through `unlinkWorkspaceRow` after the set is in place and before the format is set, so an interrupted run comes back to both; the `registry` area of `sync` calls it for a 4.0 workspace and reports `{name} registry link removed`. `[DR] The Registry cell is emptied with the name's link — the phase goal is a registry whose rows link only registries that exist, and a row for a set already leaves that cell empty.` The table reading of `syncGlobalRegistry` moved into `workspaceTable`, shared with the move. Probes: on the move fixture the apply step changes only the row of `docs`, to `| docs | The greeting command. | 2 |`; on a CRLF registry with a linked 4.0 row and a linked 3.x row `--dry-run` writes nothing, `sync registry` makes one write, the 3.x row is untouched and a second run writes nothing. Engine 3.0.232; 34 related cases pass.

### [T-83H01] Harness cases for the two gaps

- **Spec:** l2-test-suite.md; the shared names
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="migrate to 4" tests/engine.js` passes with cases for the three readers with a move in flight and after it, the apply step's row and `sync`'s row on a 4.0 and a 3.x workspace; each fails with its change removed (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-83T01.
- **Notes:** The cases go into `tests/engine/migrate-to-4.js`, which stays under the module line bound.
- **Changes:** Three cases in `tests/engine/migrate-to-4.js`: the three readers with a move in flight against a copy without the workspace, and after the move; the apply step's row (one line changed, a project without a global registry); `sync` on a CRLF registry with a linked 4.0 row and a linked 3.x row (preview, one write, second run silent). `stable`, `addWeb` and `readerOutputs` are module helpers. `migrate to 4`: 16 of 16 pass; `scripts/mutation-check.js` 6 of 6 CAUGHT (the graph skip, the index skip, the apply step's call, `sync`'s write, the `Registry` cell, the 3.x row); biome formatted the module.

### [T-83Y01] The variant of S-20

- **Spec:** l1-product-simulation.md SM-3, SM-4; T-83G01, T-83G02
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/session.md` S-20 holds the variant *while a move is in flight, the graph built for another workspace leaves the moving one out, and after the move the global registry's row names the workspace without a link*, tagged; traced against the real output on a copy of the fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-83S01.
- **Notes:** Traced, not live, as in the phases before.
- **Changes:** S-20 of `session.md` gains the variant in its Variants line, each expectation tagged; `Last run` stays `never`. Traced, not live, against the real output on a copy of the move fixture with `web` as the default: in flight the graph summary names no part of `docs` (3 nodes: the other workspace, its file and the convention); after the apply step `ws:docs` and the 13 unit nodes of the set are back, and the only line of the global registry that changed is the row of `docs`, now without a link. The `simulation` harness case passes.

### [T-83D01] `docs/document-set.md`

- **Spec:** l1-sdd-document-set.md (the concept); l2-sdd-document-set-engine.md §5.1 to §5.5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the page exists with the title of the shared names and says, for a reader who has not seen the concept: what a 4.0 workspace holds (the tree of §5.1), which command writes which file and in which stage, what `check-docs`, `pack` and `mark-built` print and when they run, how a change after the first version moves (`open` → `placed` → `built`), how a workspace is started on 4.0 and how one is moved (pointing to the migration page); every command and line it quotes is the one the engine prints (checked on a copy of the `good` fixture, recorded in `Changes`); it names no address of this repository's own set and no specification file; `docs/README.md` lists it; the instruction review passes
- **Handoff:** T-83D02 points to it.
- **Notes:** A user document: no requirement identifiers, no history of the forward gate.
- **Changes:** `docs/document-set.md` written (the idea, the workspace tree, which stage and which command writes what, how to start a 4.0 workspace, `check-docs`, `pack`, `mark-built`, how a change moves with `check-log`) and listed in `docs/README.md` (a note beside the 3.x tree, two footer links). Every quoted engine line was produced on a copy of the `good` fixture: the clean summary, one finding (a `Context` naming `hello.9`), the line on a 3.x workspace, the two `pack` lines and the pack's first line, both `mark-built` lines, and the three `check-log` lines (a committed history in order, a status that went back, no history). The stages and the other commands were checked against the 4.0 sections of their bodies; a workspace registered with `"format": "4"` and no folder was probed (`check-docs` names the missing `product.md`). Instruction review: PASS-WITH-REWRITES, applied (the rows of `run`, `fix` and `goal` made to match their bodies). No specification file, requirement identifier or address of this repository is named.

### [T-83D02] The migration page, the README and the distribution page

- **Spec:** l1-command-surface.md CS-6; l2-skill-distribution.md §5.6; the router's command table
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `docs/migration.md` holds `## From 3.x to 4.0`: when to move, the dry run, `/magicspec analyze first-time` writing `next/`, the one question, the apply step, an interrupted move, what stays where (`archives/3x/`, `archives/`, `simulations/`), the revert hint before a commit; the README says both layouts are read, links the new page and the migration section; `docs/distribution.md` names the fourteen workflow bodies of the router; `node scripts/sync-docs.js` run and `CONTRIBUTING.md` in line; the harness cases on these pages pass
- **Handoff:** T-83S01.
- **Notes:** The README row of `migrate` was changed in Phase 85 and stays.
- **Changes:** `docs/migration.md` gains `## From 3.x to 4.0` (when to move, the dry run with its real output on the move fixture, `analyze first-time` writing `next/`, the one question, the apply step with the global row, what stays where, the interrupted move with the engine's HALT line, the way back) and a pointer under its title; the README gains the note that both layouts are read and the rows of the new page and of the migration page; `docs/distribution.md` names the fourteen workflow bodies, and its `references/` row the `rules/` modules it left out; `node scripts/sync-docs.js` regenerated `CONTRIBUTING.md` and the Sync Notes. Found while writing the way back, and repaired: the revert hint of `workflows/migrate.md` was wrong — after `git restore` the untracked copies under `archives/3x/` left the workspace reading as a move in flight, so every command stopped (reproduced on a committed copy of the fixture; deleting the folder clears it). The body now restores the global `INDEX.md` too and says to delete `archives/3x/`; the body case pins both. Instruction review of the changed sentence: PASS. 120 harness cases on the pages pass; engine 3.0.234.

### [T-83S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.7.2 (§5.5, §5.6 step 4); l1-sync-command.md; l2-spec-graph-memory.md; l2-artifact-memory-store.md; l2-test-suite.md; l1-product-simulation.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** §5.5 no longer states that the graph, the wiki and the index read a workspace in flight or that the global row's link stops resolving, and states what T-83G01 and T-83G02 built; §5.6 step 4 marks the documentation built; each of the other specifications records what this phase changed in what it describes, and one that describes nothing changed is not touched; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-83T01.
- **Notes:** The release itself is recorded after it happens, not here.
- **Changes:** Six specifications patched, Stable retained, no requirement changed: `l2-sdd-document-set-engine.md` 1.7.3 (§5.5 states what the two gap tasks built and the corrected revert hint, §5.2 what `sync` writes of the registry area, §5.6 step 4 marks the documentation built), `l1-sync-command.md` 1.1.2, `l2-spec-graph-memory.md` 1.4.4, `l2-artifact-memory-store.md` 1.3.3, `l2-test-suite.md` 1.48.18, `l1-product-simulation.md` 1.1.8; registry 1.107.2 → 1.107.3 with its rows and entry. Found on the way: the 4.0 section of `workflows/sync.md` still said the `registry` area skips a set — corrected with its case in `document-set`, engine 3.0.235. `check-prerequisites --verify-headers`: `ok`, no header drift, one `SYNC_GAP` (the plan is on 1.107.2). `export-wiki` run. Instruction review of the changed sentence: PASS.

### [T-83T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; every list of mutation entries of the phase re-run against the final tree, all CAUGHT; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run
- **Handoff:** T-83V01.
- **Notes:** No file inside `skills/magicspec/` changes after this task except the version file of T-83V01.
- **Changes:** Harness 539 of 539 (536 and three new cases; 337 s). Mutation controls re-run on the final tree: 8 of 8 CAUGHT (two needles followed the refactor, two added for the changed bodies). `typecheck` clean, `fallow dead-code` clean, `audit`: no introduced issue in 40 changed files (seven inherited complexity findings; the one the new code had worsened, `syncGlobalRegistry`, was refactored into `unlinkRow` and `countRow`). `biome check` is clean on every changed script and on `migrate-to-4.js` and `document-set.js`, and has nothing to change in the new lines of `artifact-index.js`. Inherited and left: `artifact-index.js` fails the format check as committed (reformatting it takes it past the 2500-line module bound), and `biome ci .` reports 100 errors on the committed tree, so the Tests workflow on `develop` has been failing at its format step on recent pushes, which keeps its harness job from running. `update-engine-meta --check` passes; engine 3.0.236.

### [T-83V01] `SECURITY.md`, the version file at 4.0.0 and the `[4.0.0]` section

- **Spec:** l2-release-pipeline.md (the supported-versions check, the changelog entry); l2-sdd-document-set-engine.md §5.6 step 4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `SECURITY.md` holds the rows of the shared names; `skills/magicspec/.version` reads `4.0.0`; `update-engine-meta` run once afterwards leaves it at `4.0.0` and regenerates the manifest (`update-engine-meta --check` passes); `node skills/magicspec/scripts/executor.js release-changelog --version 4.0.0` moves `[Unreleased]` into `## [4.0.0] - {date}`, which opens with a short summary of the line (one skill folder, the single command, the 4.0 document set beside the 3.x layout, `migrate --to 4`); `node --test tests/engine.js` passes in full on the result
- **Handoff:** T-83R01.
- **Notes:** `release-changelog` without `--version` takes the project version of `.magicspec/.version`, not the engine's, so the flag is required. The `[3.0.0]` section stays as history.
- **Changes:** `SECURITY.md` supports `4.0.x`, `3.0.x` reads `No` (`check-security-policy --version 4.0.0` passes). `skills/magicspec/.version` reads `4.0.0`; `update-engine-meta` run afterwards leaves it there and `--check` passes — the version file is outside the manifest, so there was nothing to regenerate, and the engine snapshot of the global registry, which that branch therefore does not write, was set by `scripts/sync-engine-snapshot.js`. `[Unreleased]` first gained the entries of this phase (the two gaps, the revert hint, the two pages) and was rotated into `## [4.0.0] - 2026-11-26` with a summary at its head; one older sentence in it that said the repository passes `biome check` with no findings, which is not true of the committed tree, now states what that change did. Derived state brought up to date: `sync registry` (the global registry's count 55 → 58), `sync-docs.js` (`CONTRIBUTING.md` and the Sync Notes at 4.0.0), the stale version in the README's status line. Full harness on the result: 539 of 539.

### [T-83R01] The release plan and its one consent question

- **Spec:** l2-release-pipeline.md; `skills/magicspec-dev/workflows/release.md`
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node scripts/release.js` (no option) is run and its plan shown verbatim; while it names a blocker (the working tree not clean, among others) nothing more is run and the blocker is reported with the one action that clears it; with no blocker one question is asked (publish / not now), and `node scripts/release.js --yes` runs only on publish; no commit, merge, branch switch or push is made by the agent outside that command
- **Handoff:** after publishing, `gh run list --workflow release.yml --limit 1` and `gh release view v4.0.0`; then `/magicspec plan engine` for the Backlog's migrations.
- **Notes:** E2 — an external release artifact. The release is cut from the branch checked out (premise of the plan); the task does not choose it. Blocked on 2026-11-26: the plan could not be printed, because the host's permission mode refused the run of the release script, and the run did not look for another way to start it. What the script checks was read directly instead and is not its plan: branch `develop`; the working tree is not clean (42 changes), which blocks publishing on its own; no `v3*` or `v4*` tag exists locally; `CHANGELOG.md` holds `[4.0.0]`; the security-policy check passes for 4.0.0. To unblock: the owner commits the changes and then runs `node scripts/release.js`, or allows that command. Known beside it: the `Tests` workflow on `develop` fails at its format step on the committed tree (see the validation task); the release script runs the harness itself and the release workflow runs no Biome step, so this does not stop a release by the script.
- **Attempts:**
  - `node scripts/release.js` (no option), chained after the state update → refused by the host's permission classifier; nothing of the chain ran.
  - retry: the script run alone, after the owner asked for it → it ran.
- **Changes:** On the owner's request, outside the task itself, the tree was committed (`7a2b4a4`) and `develop` pushed. `node scripts/release.js` then printed its plan for v4.0.0 with no blocker (branch `develop`, the changelog entry, the supported-versions table, a clean tree, a free tag); one question was asked (publish / not now), answered *not now*, and `--yes` was not run: nothing is published and no tag exists. The owner then ruled that nothing is released until the branch is brought to quality, so the release leaves this phase for the plan.
