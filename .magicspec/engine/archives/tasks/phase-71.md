---
phase: 71
name: "The Scripts of the Remaining Commands on a 4.0 Workspace (4.0 Step 4, Part 1)"
status: Done
subsystem: "skills/magicspec/scripts (build-spec-graph, export-wiki, memory index and query, analyze-coverage, sync, archive-phases, update-state, generate-context), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 68: check-docs and its loader (loadDocSet, computePack), the fixture sets of the document-set module"
  - "Phases 70 and 80: lib/doc-set-state.js (isDocSetWorkspace, nextReadyTask, withNextLine), the pipeline bodies on a 4.0 workspace (engine 3.0.191)"
  - "The specifications: l2-sdd-document-set-engine 1.5.3, l1-sdd-document-set 1.5.0, l2-spec-graph-memory, l1-artifact-memory, l2-artifact-memory-store, l1-sync-command, Stable at registry 1.104.3, constitution 2.0.0, plan 1.94.0"
provides:
  - "build-spec-graph and export-wiki read a 4.0 workspace's units and write an article per document; the artifact index gives the documents of a set their kinds"
  - "analyze-coverage counts requirements a task observes; sync recomputes the Next line and names each checker finding's owning command"
  - "archive-phases, update-state and generate-context write nothing on a 4.0 workspace"
  - "harness 510 (document-set 47); engine 3.0.206; specifications as built at registry 1.104.4"
key_files:
  created:
    - skills/magicspec/scripts/lib/doc-set-graph.js
    - skills/magicspec/scripts/lib/doc-set-wiki.js
    - skills/magicspec/scripts/lib/wiki-text.js
    - skills/magicspec/scripts/lib/doc-set-coverage.js
    - skills/magicspec/scripts/lib/doc-set-sync.js
  modified:
    - skills/magicspec/scripts/build-spec-graph.js
    - skills/magicspec/scripts/export-wiki.js
    - skills/magicspec/scripts/lib/memory-sections.js
    - skills/magicspec/scripts/analyze-coverage.js
    - skills/magicspec/scripts/sync.js
    - skills/magicspec/scripts/lib/sync-state.js
    - skills/magicspec/scripts/lib/sync-registry.js
    - skills/magicspec/scripts/archive-phases.js
    - skills/magicspec/scripts/update-state.js
    - skills/magicspec/scripts/generate-context.js
    - skills/magicspec/scripts/lib/doc-set-state.js
    - tests/engine/document-set.js
patterns_established:
  - "A script that reads a set asks the checker's loader and parses nothing itself; a 3.x run of it is compared before and after on a frozen copy of the repository"
duration_minutes: 25
---

# Stage 71 Tasks — The Scripts of the Remaining Commands on a 4.0 Workspace (4.0 Step 4, Part 1)

**Phase:** 71
**Status:** Done
**Strategic Goal:** the subcommands that `fix`, `simulate`, `goal`, `analyze`, `rule`, `status`, `graph`, `sync` and `help` call give a 4.0 workspace's own answer — the graph, the wiki and the artifact index read units by address, coverage counts observed requirements, `sync` recomputes a set's derived state — and the scripts that write 3.x files write nothing there; on a 3.x workspace every one of them prints and writes exactly what it does today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The 4.0 test is `isDocSetWorkspace(dir, name)` of `scripts/lib/doc-set-state.js`; the set is read once with `loadDocSet(dir)` of `check-docs.js` (its `units`, `milestones`, `tasks`, `changes` and the reference sites it records), and a task's pack with `computePack(set, task)`. No task parses a set file by itself.
- The 3.x comparison: before a task edits a script, its output on this repository's `engine` workspace (stdout, and the files it writes, by hash) is saved in the scratchpad; after the edit the same command gives the same bytes. The task's `Changes` line names the command compared.
- The line of a script that writes nothing on a 4.0 workspace: `[{tag}] {workspace} is a 4.0 workspace: {what takes its place}; nothing written.` — `archive-phases`: tag `Archive`, `done milestones stay in plan.md`; `update-state`: tag `update-state`, `its state is memory/state.md`; `generate-context`: tag `generate-context`, `its documents are the set itself`. Exit 0.
- The graph of a set: one node per unit, id `unit:{workspace}:{address}`, label `{address}`, type `unit`, with `form` naming its address form of concept §5.2 (`requirement`, `binding`, `rule`, `stack-rule`, `component`, `milestone`, `task`, `change`, …) and `layer` as the loader records it; one `contains` edge from `ws:{workspace}` to each; one `references` edge per resolved reference site; a component key is a node `unit:{workspace}:{key}` like any unit.
- The artifact index of a set: a section per unit, its heading path ending in `{address} — {title}`; kinds — `spec` for `product.md`, `spec/` and `bind/`, `rules` for both `rules.md`, `plan` for `plan.md` and `changes.md`, `tasks` for `tasks/M{n}.md`, `state` for `memory/`. `KINDS` gains no entry.
- Coverage of a set: a behaviour requirement `{key}.{n}` is `covered` when it has an `Accept:` line and the pack of at least one task holds it, `unobserved` when it has an Accept and no pack holds it, `unchecked` when it has none; one line per requirement that is not covered, then `{c} of {n} requirements covered`.
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`; it held 1,465 lines at the start of the phase and stays under the layout bound of 2,500.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-71G01] `build-spec-graph` on a 4.0 workspace
- [x] [T-71G02] `export-wiki` on a 4.0 workspace
- [x] [T-71M01] The artifact index reads units by address
- [x] [T-71C01] `analyze-coverage` counts observed requirements
- [x] [T-71Y01] `sync` recomputes the derived state of a set
- [x] [T-71A01] `archive-phases`, `update-state` and `generate-context` write nothing on a 4.0 workspace
- [x] [T-71H01] Harness cases for the six subcommands
- [x] [T-71S01] The specifications as built
- [x] [T-71T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-71G01] `build-spec-graph` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`build-spec-graph` takes units and addresses as nodes); l2-spec-graph-memory.md (the graph, its JSON and summary); l1-sdd-document-set.md §5.2 (addresses)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `build-spec-graph --json --out` writes one node per unit of the set with the id, label and type of the shared names and one `references` edge per resolved reference; the summary counts them; on this repository the `--json` output is byte-identical to before (the 3.x comparison); `update-engine-meta` run after the edit
- **Handoff:** T-71G02 reads the nodes it writes; T-71H01 pins it.
- **Notes:** God nodes, orphans and communities are computed over the new nodes as over specifications; the coverage block of the summary is the 3.x one and is skipped for a set (T-71C01 owns coverage).
- **Changes:** `build-spec-graph` reads a 4.0 workspace through `lib/doc-set-graph.js`: one `unit:{ws}:{address}` node per unit with its form and layer, a `contains` edge each, one `references` edge per resolved pair — both the fields that name addresses and the addresses written in unit text, the two places the checker resolves (read from "reference site"); coverage, orphan files and the 3.x passes skip a set; a `Units` row and count appear only when there are units. 3.x comparison SAME for `--json` and the summary on this repository; `build-spec-graph.js` had drifted from Biome and was formatted whole

### [T-71G02] `export-wiki` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`export-wiki` takes units and addresses); l2-spec-graph-memory.md (the wiki)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `export-wiki` writes the workspace article and one article per document of the set, each listing its units by address with the references each makes and receives, and the index names the documents; its summary line counts documents and units; on this repository the wiki it writes is byte-identical to before; `update-engine-meta` run after the edit
- **Handoff:** T-71H01 pins it.
- **Notes:** After T-71G01 (it reads the graph that task writes).
- **Changes:** `export-wiki` writes, for each document of a 4.0 workspace, an article listing its units by address with the references made and received, a workspace article listing the documents and index entries counting them (`lib/doc-set-wiki.js`; `slugify` and `joinMarkdown` moved to `lib/wiki-text.js`); the summary line counts documents and units; 3.x comparison SAME for the default and `--out` runs; `export-wiki.js` formatted whole

### [T-71M01] The artifact index reads units by address

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`memory-query` indexes units by address); l1-artifact-memory.md; l2-artifact-memory-store.md (sections, kinds, citations)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `memory-query "greeting"` cites the unit that states it as `{address} — {title}` with its file and lines, and `--kind plan` returns milestones; the kinds of the shared names, `KINDS` unchanged; on this repository a fixed query prints byte-identical output before and after; `update-engine-meta` run after the edit
- **Handoff:** T-71H01 pins it.
- **Notes:** The section split of a set file is by unit heading (`## {address} — …`, `### {address} — …`); a file of the set with no unit heading (the profile's tool table) keeps the split it has today.
- **Changes:** `lib/memory-sections.js` gives the documents of a 4.0 set their kinds (`product.md`, `spec/`, the stack's `profile.md`, `deps.md`, `bind/` → `spec`; both `rules.md` → `rules`; `plan.md`, `changes.md` → `plan`; `memory/` → `state`; task files already `tasks`); the split by unit heading was already there, so `memory-query` cites `{address} — {title}` sections with file and lines, `--kind plan` returns milestones, `KINDS` unchanged; `profile.md` and `deps.md`, which the shared names did not list, are `spec`; 3.x comparison SAME for two queries and `memory-index`; the file formatted whole

### [T-71C01] `analyze-coverage` counts observed requirements

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`analyze-coverage` measures requirements with an Accept that a task observes); l1-sdd-document-set.md §5.3 (behaviour requirement, Accept), §5.6 (the pack)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `analyze-coverage` prints the lines and the total of the shared names, and `--json` the same counts; a requirement whose Accept is removed is `unchecked`, one no pack holds is `unobserved`; on this repository the output is byte-identical to before; `update-engine-meta` run after the edit
- **Handoff:** T-71H01 pins it.
- **Notes:** The 3.x taxonomy (EXTRACTED, INFERRED, AMBIGUOUS, UNCOVERED) classifies code files against Canonical References, which a set does not have; the 4.0 branch replaces it and does not walk the code.
- **Changes:** `analyze-coverage` takes a 4.0 branch before any file walk (`lib/doc-set-coverage.js`): a requirement is covered when it has an Accept and a task's pack holds it, unobserved with an Accept no pack holds, unchecked without one, a withdrawn one not counted; one line per requirement not covered, then the total, and `--json` the same; on the fixture with two requirements added the lines read `hello.2: unobserved`, `hello.3: unchecked`, `1 of 3 requirements covered`; 3.x comparison SAME (text and JSON); the file formatted whole

### [T-71Y01] `sync` recomputes the derived state of a set

- **Spec:** l1-sync-command.md SY-1; l1-sdd-document-set.md §6 (the registry cells do not exist; the derived state is the map, the state file and the checker's report); l2-sdd-document-set-engine.md §5.2 (`finalize`, the next ready task)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture, `sync --dry-run` reports no missing registry; with the `Next` line of `memory/state.md` wrong it reports the line to write and `sync` writes it (`withNextLine` with `nextReadyTask`); each `check-docs` finding is one disagreement naming the command that owns it (`/magicspec spec`, `/magicspec plan` or `/magicspec task`, as the bodies' 4.0 sections assign it); on this repository `sync --dry-run` prints byte-identical output; `update-engine-meta` run after the edit
- **Handoff:** T-71H01 pins it.
- **Notes:** The map is written by `mark-built` only; a map behind the units is the checker's stale-unit finding and reaches the report through it.
- **Changes:** `sync` on a 4.0 workspace skips the registry area (a missing global row links no registry), and its state area recomputes the `Next` line of `memory/state.md` and reports each checker finding as a disagreement owned by `spec`, `plan` or `task` as the bodies' sections assign them (`lib/doc-set-sync.js`, `ownerOf`); the next line follows the recorded state (`nextStep`); on a broken fixture a plan finding named `/magicspec plan`, an open question `/magicspec spec`, and the wrong `Next` was recomputed; 3.x comparison SAME; the three touched files formatted whole

### [T-71A01] `archive-phases`, `update-state` and `generate-context` write nothing on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`archive-phases` retired for 4.0 workspaces); l1-sdd-document-set.md §6 (the recorded state is `memory/state.md`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a copy of the `good` fixture each of the three prints its line of the shared names, exits 0 and leaves the tree unchanged (by hash); on this repository each writes exactly what it wrote before (`archive-phases --dry-run`, `update-state` and `generate-context` on a disposable copy of the `engine` workspace); `update-engine-meta` run after the edit
- **Handoff:** T-71H01 pins it.
- **Notes:** `finalize` already skips archival and `STATE.md` on a 4.0 workspace (Phase 70); this closes the direct calls.
- **Changes:** `archive-phases`, `update-state` and `generate-context` print their one line on a 4.0 workspace (`nothingWritten` in `lib/doc-set-state.js`) and leave the tree as it was; `archive-phases --check`, run by the pre-commit hook, stays silent, since nothing is ever pending; 3.x comparison SAME for `archive-phases --dry-run`, `generate-context` and `update-state` (their written files included); two drifted files formatted whole

### [T-71H01] Harness cases for the six subcommands

- **Spec:** l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with one case per task G01 to A01 on the `good` fixture; each fails with its 4.0 branch removed (`scripts/mutation-check.js` CAUGHT); the existing cases of these subcommands pass unedited; `tests/engine/document-set.js` stays under 2,500 lines
- **Handoff:** T-71T01.
- **Notes:** The 3.x paths are pinned by their existing cases; the byte comparisons of each task are evidence of the run, not cases.
- **Changes:** `document-set` gained six cases (graph, wiki, index, coverage, sync, the three writers) on the `good` set; mutation controls 10 of 10 CAUGHT after the graph case gained a reference that only a mention gives (it survived first) — the first rerun reported CAUGHT on a test file broken by an escape, repaired and rerun clean; the module holds 47 cases, under the layout bound

### [T-71S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.5.3 (§5.2, §5.6 step 4); l2-spec-graph-memory.md; l2-artifact-memory-store.md; l1-sync-command.md (SY-1, the derived state the supersession declares); l2-engine-automation.md; l2-test-suite.md (the `document-set` module)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-sdd-document-set-engine.md` §5.2 states the forms built (the graph's nodes and edges, the index's citations, coverage's three states, `sync`'s derived state, the three lines) and step 4's first part as built; each other specification records its 4.0 branch, the 3.x contract unchanged; each a patch with Stable retained and no requirement changed, the registry rows and entry with them; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-71T01.
- **Notes:** `l1-sync-command.md` is amended here for the script; the `sync` body's 4.0 section is Phase 81's.
- **Changes:** six specifications patched as built (`l2-sdd-document-set-engine` 1.5.4, `l2-spec-graph-memory` 1.4.3, `l2-artifact-memory-store` 1.3.1, `l1-sync-command` 1.1.1, `l2-engine-automation` 1.33.3, `l2-test-suite` 1.48.14), registry 1.104.4; `check-prerequisites --verify-headers` reports no drift (the expected `SYNC_GAP` for the next plan only); `export-wiki` run

### [T-71T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; the next step named at the end is `/magicspec plan engine` (CONSTITUTION §5), whose revalidation names the specification amendment Phase 81 needs: where `goal` keeps its record on a 4.0 workspace (PLAN.md Phase 71, plan check)
- **Handoff:** `/magicspec plan engine`, which names the specification amendment Phase 81 needs.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** Biome, typecheck and `fallow dead-code` report nothing on the changed files; `pnpm run audit` exits 0 after the branches the phase added were moved out of the measured functions (it first exited 1 on `syncState`, `renderIndex` and `printSummary`), the three remaining notes being lines grown by the formatter in `update-state.js` `applyStateUpdate` and `build-spec-graph.js` `extractSpecRegistry` and `findBridgeSpecs`; the 3.x comparisons rerun after that refactor caught a lost blank line in the graph summary, restored; the full harness 510 of 510; `update-engine-meta --check` passes at engine 3.0.206; next step: `/magicspec plan engine`, which names the specification amendment Phase 81 needs
