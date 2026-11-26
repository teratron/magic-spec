---
phase: 83
name: "4.0.0 (4.0 Step 4, Part 5)"
status: Todo
subsystem: "skills/magicspec (scripts: build-spec-graph, export-wiki, the artifact index, lib/migrate-to-4, lib/sync-registry; .version), docs, README.md, SECURITY.md, CHANGELOG.md, tests/engine, .magicspec/engine/simulations, .magicspec/engine/specifications, the release script"
requires:
  - "Phase 85: migrate --to 4, the stop of a move in flight and the predicate moveInFlight (engine 3.0.229)"
  - "The specifications: l2-sdd-document-set-engine 1.7.2 §5.5, §5.6 step 4, l1-skill-packaging SP-10, l1-sync-command SY-1, l2-spec-graph-memory, l2-artifact-memory-store, l2-release-pipeline, Stable at registry 1.107.2, constitution 2.0.0, plan 1.100.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 83 Tasks — 4.0.0 (4.0 Step 4, Part 5)

**Phase:** 83
**Status:** Todo
**Strategic Goal:** 4.0.0 ships with nothing reading a half-moved workspace, a global registry whose rows link only registries that exist, documents that say what a 4.0 workspace is and how to move to one, the version file at 4.0.0 and a release that publishes only on the owner's yes.

**Shared names (fixed here so no two tasks choose different spellings):**

- A workspace in flight is the one `lib/doc-set-state.js` `moveInFlight` names; the readers of `T-83G01` take it from there and from nothing else.
- The global row of a 4.0 workspace names it without a link: `| {name} | …`, the other cells as they are.
- The new page: `docs/document-set.md`, titled `# The 4.0 Document Set`; `docs/migration.md` gains `## From 3.x to 4.0`.
- The release section: `## [4.0.0] - {date}` in `CHANGELOG.md`, written by `release-changelog --version 4.0.0`; `SECURITY.md` gains the row `| \`4.0.x\` | Yes |` above `3.0.x`, which reads `No`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-83G01] The graph, the wiki and the artifact index leave out a workspace in flight
- [ ] [T-83G02] The global registry row of a 4.0 workspace links no registry
- [ ] [T-83H01] Harness cases for the two gaps
- [ ] [T-83Y01] The variant of S-20
- [ ] [T-83D01] `docs/document-set.md`
- [ ] [T-83D02] The migration page, the README and the distribution page
- [ ] [T-83S01] The specifications as built
- [ ] [T-83T01] Validation: static checks, full harness, C14
- [ ] [T-83V01] `SECURITY.md`, the version file at 4.0.0 and the `[4.0.0]` section
- [ ] [T-83R01] The release plan and its one consent question

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-83G01] The graph, the wiki and the artifact index leave out a workspace in flight

- **Spec:** l1-skill-packaging.md SP-10; l2-sdd-document-set-engine.md §5.5 (Resuming a move); l2-spec-graph-memory.md; l2-artifact-memory-store.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the move fixture with a second workspace registered as the default and `docs` in flight, `build-spec-graph --json --no-cache`, `export-wiki` (the pages of the wiki folder) and the artifact index (`listArtifacts` and `memory-query --json`) give the same output as on the same copy with `docs` removed from the registry and the disk; with the move finished `docs` is read again; their output on this repository is byte for byte the same as before; `update-engine-meta` run after the edit
- **Handoff:** T-83H01 pins it; T-83S01 records it.
- **Notes:** Every enumeration of the registered workspaces in these three readers is listed in `Changes`; the skip is the `moveInFlight` predicate, so a workspace in the 4.0 format with `archives/3x/` is read.

### [T-83G02] The global registry row of a 4.0 workspace links no registry

- **Spec:** l1-sync-command.md SY-1 (the global registry's workspace rows are derived); l2-sdd-document-set-engine.md §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a copy of the move fixture the apply step leaves the row of `docs` in `.magicspec/INDEX.md` as the shared names state and changes no other line; on a 4.0 workspace whose row still links `{name}/INDEX.md`, `sync` writes the bare name, reports it as one write of the `registry` area and writes nothing on a second run; a 3.x workspace's linked row is untouched; `update-engine-meta` run after the edit
- **Handoff:** T-83H01 pins it; T-83D01 names it.
- **Notes:** One helper renders the row's name cell for both writers, so they cannot disagree.

### [T-83H01] Harness cases for the two gaps

- **Spec:** l2-test-suite.md; the shared names
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="migrate to 4" tests/engine.js` passes with cases for the three readers with a move in flight and after it, the apply step's row and `sync`'s row on a 4.0 and a 3.x workspace; each fails with its change removed (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-83T01.
- **Notes:** The cases go into `tests/engine/migrate-to-4.js`, which stays under the module line bound.

### [T-83Y01] The variant of S-20

- **Spec:** l1-product-simulation.md SM-3, SM-4; T-83G01, T-83G02
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/engine/simulations/session.md` S-20 holds the variant *while a move is in flight, the graph built for another workspace leaves the moving one out, and after the move the global registry's row names the workspace without a link*, tagged; traced against the real output on a copy of the fixture (recorded in `Changes`); `node --test --test-name-pattern="simulation" tests/engine.js` passes
- **Handoff:** T-83S01.
- **Notes:** Traced, not live, as in the phases before.

### [T-83D01] `docs/document-set.md`

- **Spec:** l1-sdd-document-set.md (the concept); l2-sdd-document-set-engine.md §5.1 to §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the page exists with the title of the shared names and says, for a reader who has not seen the concept: what a 4.0 workspace holds (the tree of §5.1), which command writes which file and in which stage, what `check-docs`, `pack` and `mark-built` print and when they run, how a change after the first version moves (`open` → `placed` → `built`), how a workspace is started on 4.0 and how one is moved (pointing to the migration page); every command and line it quotes is the one the engine prints (checked on a copy of the `good` fixture, recorded in `Changes`); it names no address of this repository's own set and no specification file; `docs/README.md` lists it; the instruction review passes
- **Handoff:** T-83D02 points to it.
- **Notes:** A user document: no requirement identifiers, no history of the forward gate.

### [T-83D02] The migration page, the README and the distribution page

- **Spec:** l1-command-surface.md CS-6; l2-skill-distribution.md §5.6; the router's command table
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `docs/migration.md` holds `## From 3.x to 4.0`: when to move, the dry run, `/magicspec analyze first-time` writing `next/`, the one question, the apply step, an interrupted move, what stays where (`archives/3x/`, `archives/`, `simulations/`), the revert hint before a commit; the README says both layouts are read, links the new page and the migration section; `docs/distribution.md` names the fourteen workflow bodies of the router; `node scripts/sync-docs.js` run and `CONTRIBUTING.md` in line; the harness cases on these pages pass
- **Handoff:** T-83S01.
- **Notes:** The README row of `migrate` was changed in Phase 85 and stays.

### [T-83S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.7.2 (§5.5, §5.6 step 4); l1-sync-command.md; l2-spec-graph-memory.md; l2-artifact-memory-store.md; l2-test-suite.md; l1-product-simulation.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** §5.5 no longer states that the graph, the wiki and the index read a workspace in flight or that the global row's link stops resolving, and states what T-83G01 and T-83G02 built; §5.6 step 4 marks the documentation built; each of the other specifications records what this phase changed in what it describes, and one that describes nothing changed is not touched; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-83T01.
- **Notes:** The release itself is recorded after it happens, not here.

### [T-83T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; every list of mutation entries of the phase re-run against the final tree, all CAUGHT; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run
- **Handoff:** T-83V01.
- **Notes:** No file inside `skills/magicspec/` changes after this task except the version file of T-83V01.

### [T-83V01] `SECURITY.md`, the version file at 4.0.0 and the `[4.0.0]` section

- **Spec:** l2-release-pipeline.md (the supported-versions check, the changelog entry); l2-sdd-document-set-engine.md §5.6 step 4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `SECURITY.md` holds the rows of the shared names; `skills/magicspec/.version` reads `4.0.0`; `update-engine-meta` run once afterwards leaves it at `4.0.0` and regenerates the manifest (`update-engine-meta --check` passes); `node skills/magicspec/scripts/executor.js release-changelog --version 4.0.0` moves `[Unreleased]` into `## [4.0.0] - {date}`, which opens with a short summary of the line (one skill folder, the single command, the 4.0 document set beside the 3.x layout, `migrate --to 4`); `node --test tests/engine.js` passes in full on the result
- **Handoff:** T-83R01.
- **Notes:** `release-changelog` without `--version` takes the project version of `.magicspec/.version`, not the engine's, so the flag is required. The `[3.0.0]` section stays as history.

### [T-83R01] The release plan and its one consent question

- **Spec:** l2-release-pipeline.md; `skills/magicspec-dev/workflows/release.md`
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node scripts/release.js` (no option) is run and its plan shown verbatim; while it names a blocker (the working tree not clean, among others) nothing more is run and the blocker is reported with the one action that clears it; with no blocker one question is asked (publish / not now), and `node scripts/release.js --yes` runs only on publish; no commit, merge, branch switch or push is made by the agent outside that command
- **Handoff:** after publishing, `gh run list --workflow release.yml --limit 1` and `gh release view v4.0.0`; then `/magicspec plan engine` for the Backlog's migrations.
- **Notes:** E2 — an external release artifact. The release is cut from the branch checked out (premise of the plan); the task does not choose it.
