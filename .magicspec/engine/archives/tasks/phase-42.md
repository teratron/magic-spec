---
phase: 42
name: "Graph Artifacts Folder (Single-Skill Step 2)"
status: Done
subsystem: ".magic/scripts (graph scripts, utils), .magic workflow bodies, workflows, rules, docs, dev/tests"
requires:
  - "Phase 41: the state-folder constant and the project-root resolver, so the graph paths are built from one definition"
  - "The graph folder rule (l2-skill-layout 1.0.0 §5.7, §5.8 step 2) and the graph subsystem contract (l2-spec-graph-memory 1.2.0): Stable at registry 1.46.0"
provides:
  - "Graph folder: utils.js defines graphPaths (the extraction cache, the wiki, the page, the snapshot and the baseline under graph/) once; graph-cache, build-spec-graph and export-wiki use it; export-wiki retires the earlier cache, wiki and snapshot files and build-spec-graph --html the earlier page, each after its own write succeeded, moving the two snapshot files instead of deleting them"
  - "Shipped text and documentation name the graph folder (analyze, retrospective, spec, task, the graph wrapper, the always-on rules, README, .gitignore, docs/graph.md); five harness cases and 17 mutation entries, all caught; harness 211 -> 216; engine 2.1.145 -> 2.1.146 (one C14)"
  - "validate-hardlinks.js and its test read inodes as BigInt"
key_files:
  created: []
  modified:
    - ".magic/scripts/utils.js"
    - ".magic/scripts/graph-cache.js"
    - ".magic/scripts/build-spec-graph.js"
    - ".magic/scripts/export-wiki.js"
    - ".magic/scripts/diff-spec-graph.js"
    - ".magic/analyze.md"
    - ".magic/retrospective.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - "workflows/magic.graph.md"
    - "rules/magic.md"
    - "README.md"
    - ".gitignore"
    - "docs/graph.md"
    - "dev/scripts/validate-hardlinks.js"
    - "dev/tests/engine.js"
    - "dev/tests/suite.md"
patterns_established:
  - "A file that must keep its hardlink twin is rewritten with truncate-and-write from a script, not replaced by an editor tool"
  - "A retirement of derived files runs after the writer that replaces them has succeeded and touches exact names only; a file that carries a baseline is moved, not deleted"
  - "A fixture that cannot show a cache populated needs a specification file to extract"
duration_minutes: 150
---

# Stage 42 Tasks — Graph Artifacts Folder (Single-Skill Step 2)

**Phase:** 42
**Status:** Done
**Strategic Goal:** Gather everything the graph subsystem derives — the extraction cache, the wiki, the interactive page and the comparison snapshot — under one `graph/` folder inside the state folder, with the paths defined once ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.7 and §5.8 step 2). The artifacts are regenerated, so a project on the earlier paths loses nothing; the phase is compatible with installed projects and ships as a 2.x release.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-42A01] `utils.js`: the graph paths defined once
- [x] [T-42A02] Graph scripts read and write the new paths
- [x] [T-42A03] Legacy generated paths removed after the first successful write
- [x] [T-42B01] Shipped text: workflow bodies, the graph wrapper and `rules/magic.md` §2 name the new paths ([C-001])
- [x] [T-42B02] Documentation, README and suite scenarios name the new paths
- [x] [T-42T01] Validation: new-path, legacy-path and stale-wiki cases with mutation controls
- [x] [T-42T02] Validation: harness, mutation list, scans, hardlinks, skill sync, docs sync; single C14 bump
- [x] [T-42S01] Spec sync: `l2-spec-graph-memory.md`, `l2-engine-automation.md` and `l2-test-suite.md` carry the new paths

## Detailed Tracking

<!-- Optional entry field, created by /magic.run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-42A01] `utils.js`: the graph paths defined once

- **Spec:** l2-skill-layout.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a harness case imports the helper and asserts the four paths: `<state>/graph/.cache`, `<state>/graph/wiki`, `<state>/graph/graph.html`, `<state>/graph/before.json`; no other script defines a graph path (T-42T01 scan).
- **Handoff:** T-42A02.
- **Notes:** The general state cache (`<state>/.cache/`) is not graph-specific and keeps its place. The names inside `graph/` follow the owner's draft: `graph.html` for the page and `before.json` for the snapshot.
- **Changes:** utils.js gains graphPaths (the cache, wiki, page, snapshot and baseline under graph/, plus the five earlier names) and GRAPH_DIR_NAME. The snapshot pair is snapshot.json and before.json, as the retrospective already uses a snapshot and a rolling baseline.

### [T-42A02] Graph scripts read and write the new paths

- **Spec:** l2-skill-layout.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a fixture, `node .magic/scripts/executor.js export-wiki` followed by `build-spec-graph --html` leaves `graph/wiki/index.md`, `graph/graph.html` and a populated `graph/.cache`, and nothing at the old paths.
- **Handoff:** T-42A03.
- **Notes:** The scripts that name a path today: `graph-cache.js` (the cache folder), `build-spec-graph.js` (the page), `export-wiki.js` (the wiki folder, whose `--out` override stays), `diff-spec-graph.js` (the snapshot), `serve-spec-graph.js`, `detect-communities.js`. The wiki-staleness check in `/magic.analyze` reads the wiki index: find where it names the path (shipped text, T-42B01).
- **Changes:** graph-cache.js, build-spec-graph.js and export-wiki.js take their default locations from graphPaths; diff-spec-graph.js examples and the script headers name the new paths. detect-communities.js, serve-spec-graph.js and diff-spec-graph.js hold no graph path.

### [T-42A03] Legacy generated paths removed after the first successful write

- **Spec:** l2-skill-layout.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a fixture that holds `<state>/wiki/`, `<state>/spec-graph.html`, `<state>/graph-before.json` and `<state>/.graph-cache/` ends `export-wiki` with only the new tree and one informational line naming what was removed; a fixture whose new write fails keeps the legacy files.
- **Handoff:** T-42T01.
- **Notes:** `[DR]` leaving the legacy folders in place would keep two navigable wikis, and an agent following the old path reads a stale one; the files are derived and regenerable, so removing them after the new ones exist is the lowest-cost end state. Only the four exact legacy names are removed, never a folder by pattern, and never before the new write has succeeded. Override: record a diagnostic instead and leave the removal to the user.
- **Changes:** utils.js retireLegacyGraph with two groups: export-wiki (default output only) retires the cache, the wiki and the two snapshot files after the wiki is written; build-spec-graph --html (default path only) retires the page. Decision: the cache, wiki and page are removed; the two snapshot files carry a baseline the next comparison needs, so they are moved into graph/ unless a file is already there. Five exact names, not four; one informational line each.

### [T-42B01] Shipped text names the new paths ([C-001])

- **Spec:** l2-skill-layout.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "\.design/wiki\|spec-graph\.html\|graph-before\|\.graph-cache" .magic workflows skills rules .agents` finds no hit outside the legacy-removal code and its tests; `node dev/scripts/validate-hardlinks.js` reports no drift.
- **Handoff:** T-42T02.
- **Notes:** Hits today: `.magic/analyze.md`, `.magic/retrospective.md`, `.magic/spec.md`, `.magic/task.md`, `workflows/magic.graph.md`, `rules/magic.md` §2. The last two are hardlinked pairs with `.agents/` (**[C-001]**): edit each once with all hunks in one write, then recreate the link and verify with the validator. Do not lengthen `rules/magic.md`. The skill wrappers are regenerated by the C14 step, never edited by hand.
- **Changes:** analyze.md, retrospective.md, spec.md, task.md, workflows/magic.graph.md and rules/magic.md name graph/wiki/index.md, graph/graph.html and graph/snapshot.json. The two hardlinked files were rewritten in place (truncate and write keeps the inode), so the validator stayed green without a relink; skills regenerated by the C14 step. rules/magic.md did not grow.

### [T-42B02] Documentation, README and suite scenarios name the new paths

- **Spec:** l2-skill-layout.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "\.design/wiki\|spec-graph\.html\|graph-before\|\.graph-cache" docs README.md dev/tests/suite.md` finds no hit.
- **Handoff:** T-42T02.
- **Notes:** `docs/graph.md`, `README.md`, `dev/tests/suite.md`. Check whether the README's `.gitignore` advice names a graph path and update it.
- **Changes:** README (both ignore blocks: /.design/graph/ and /.design/*cache*/, with a tip for projects that still list the earlier entries), .gitignore, docs/graph.md and two suite scenarios name the new paths.

### [T-42T01] Validation: new-path, legacy-path and stale-wiki cases with mutation controls

- **Goal:** prove the consolidation and that an upgraded project regenerates cleanly.
- **Method:** harness cases for: (a) the four new paths after a full graph run; (b) a legacy fixture ending with only the new tree; (c) a failed new write keeping the legacy files; (d) the staleness check reading the new wiki index; (e) the residue scan that no script outside `utils.js` defines a graph path. Each fails on the code before this phase; register them in the mutation list and run `node dev/scripts/mutation-check.js`.
- **Status:** Done
- **Changes:** Five cases (the paths and a full run, an installation on the earlier paths, a baseline already in place, the cases where nothing is retired, the residue scans over scripts and shipped text); 17 mutation entries over the paths, the retirement and eleven text surfaces, all caught. The SP-2 wiki assertion follows the new path.

### [T-42T02] Validation: harness, mutation list, scans, hardlinks, skill sync, docs sync; single C14 bump

- **Goal:** the phase ends releasable and self-hosting (SP-9); this repository's own graph artifacts move to the new folder.
- **Method:** `node --test dev/tests/engine.js` in the background; the mutation driver; `node dev/scripts/validate-hardlinks.js`; run `export-wiki` in this repository and confirm the old folders are gone and `graph/wiki/index.md` exists; one `node .magic/scripts/executor.js update-engine-meta`.
- **Status:** Done
- **Changes:** Harness 211 -> 216, all passing; one C14 bump (2.1.145 -> 2.1.146); sync.js regenerated the version-bearing docs; this repository now holds .design/graph/ and none of the earlier places. Found and fixed on the way: validate-hardlinks.js and its test compared inodes as Numbers, and Windows file ids exceed 2^53, so two different ids could round to one value (a delinked pair read as linked; one test failed once for that reason); both now read the ids as BigInt.

### [T-42S01] Spec sync: `l2-spec-graph-memory.md`, `l2-engine-automation.md` and `l2-test-suite.md` carry the new paths

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `/magic.spec amend` leaves the three files with a `Document History` row each and matching `INDEX.md` versions; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** Phase 43 (its workbook is created when this phase completes).
- **Notes:** The wiki paths appear in the memory specification's wiki-export and question-routing sections; use delta edits if a file exceeds 200 lines.
- **Changes:** l2-spec-graph-memory.md 1.3.0 (new section 4.6 Artifact Location), l2-engine-automation.md 1.23.0 and l2-test-suite.md 1.32.0 (Graph-Folder Coverage).
