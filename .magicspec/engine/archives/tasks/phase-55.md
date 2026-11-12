---
phase: 55
name: "Sync Command"
status: Done
subsystem: "skills/magicspec (scripts/sync.js, scripts/lib/sync-*.js, scripts/lib/commands.js, scripts/lib/hosts.js, scripts/export-wiki.js, scripts/clean-cache.js, workflows/sync.md, SKILL.md, CONSTITUTION.md, roles/prompt-engineer.md, templates/rules.md, templates/workspace.json), scripts/sync.js, scripts/update-project-meta.js, skills/magicspec-dev, .magicspec/RULES.md, docs, README.md, CONTRIBUTING.md, tests"
requires:
  - "Phase 48: the cache retention contract (every cache has an owner that prunes it; clean-cache.js rebuildableCaches lists .cache/project-meta-state.json) and the registered-folders rule for every writer"
  - "Phase 49: the router's demand column, the one parser (lib/hosts.js readCommands) and the handoff line `Next: /magicspec {command} — {demand} reasoning`"
  - "Phase 51: the Input Pass trigger pattern for a new body (card trigger, mirror, the harness placement table); the phantom-command lesson (a shipped `/magicspec {cmd}` fails until workflows/{cmd}.md exists)"
  - "Phase 53: the goal block of STATE.md written only by update-state; the rule kernel at 16021 of 16384 bytes, 363 left for this phase; constitution 1.23.0"
  - "Phase 54: export-wiki refreshes the artifact index as its last step and prunes and rewrites every wiki page; usesSqlite and runtimeFlags in the command table; engine 3.0.115, harness 419, the cognitive suite 1.9.102 (last case T341)"
  - "The specification: l1-sync-command 1.0.0 (SY-1 to SY-9), Stable at registry 1.71.0, plan 1.61.0 (Phase 55 notes 1 to 8)"
provides:
  - "sync: one command and nine libraries that recompute registry counts, live-memory counters, the rule projection and host copies, the wiki and the artifact index, declared version anchors and registered documentation blocks, writing only what differs; a judgement is reported with its place and command and left alone, a stale derived file is reported and kept, a second run writes nothing and a preview changes no byte"
  - "A sync section of workspace.json (version anchors by JSON key or marker, documentation blocks filled from a project file between neutral markers), refusing any source that carries an SDD reference"
  - "The sync body, router row, Input Pass trigger, the kernel's exemptions and caution, constitution 1.24.0 (C2); the maintenance pipeline runs the shipped pass and the updater that wrote registry versions and history rows is retired; the graph extraction cache honors MAGIC_DRY_RUN"
  - "A repair: a task title naming a command no longer decides the handoff line or the reserved-command guard of finalize"
  - "Six specifications patched or extended as built, registry 1.72.0, the cognitive suite 1.9.104 (T342-T352), the harness at 432 with 32 mutation entries all caught, engine 3.0.129, the rule kernel at 16263 bytes (121 left)"
key_files:
  created:
    - "skills/magicspec/scripts/sync.js"
    - "skills/magicspec/scripts/lib/sync-config.js"
    - "skills/magicspec/scripts/lib/sync-report.js"
    - "skills/magicspec/scripts/lib/sync-registry.js"
    - "skills/magicspec/scripts/lib/sync-state.js"
    - "skills/magicspec/scripts/lib/sync-projections.js"
    - "skills/magicspec/scripts/lib/sync-graph.js"
    - "skills/magicspec/scripts/lib/sync-versions.js"
    - "skills/magicspec/scripts/lib/sync-docs.js"
    - "skills/magicspec/scripts/lib/sync-markers.js"
    - "skills/magicspec/workflows/sync.md"
    - "docs/sync.md"
  modified:
    - "skills/magicspec/SKILL.md"
    - "skills/magicspec/CONSTITUTION.md"
    - "skills/magicspec/templates/rules.md"
    - "skills/magicspec/roles/prompt-engineer.md"
    - "skills/magicspec/scripts/lib/commands.js"
    - "skills/magicspec/scripts/graph-cache.js"
    - "skills/magicspec/scripts/clean-cache.js"
    - "skills/magicspec/scripts/finalize.js"
    - "scripts/sync.js"
    - "scripts/cli-guard.js"
    - "skills/magicspec-dev/workflows/sync.md"
    - "skills/magicspec-dev/SKILL.md"
    - ".magicspec/RULES.md"
    - "tests/engine.js"
    - "tests/suite.md"
    - "README.md"
    - "docs/README.md"
    - "docs/development.md"
    - "CONTRIBUTING.md"
patterns_established:
  - "An area of derived state computes, compares with what is stored and writes only the difference; a writer that rewrites or prunes everything on each run (the wiki export, the state stamp, the projection refresh) is reached through a compare-first path so that a second run writes nothing"
  - "A preview reaches every writer it triggers: the build that renders the wiki honors MAGIC_DRY_RUN in its own cache, so --dry-run is a property of the whole run and not of the last write"
  - "Generated text enters a product file only after the containment classes are checked, in the one place it is generated, with a neutral marker key and no SDD word in the file"
  - "A disagreement that needs a judgement is a record with a place, a difference and one command, and never an exception: the valid entries still run"
duration_minutes: ~
---

# Stage 55 Tasks — Sync Command

**Phase:** 55
**Status:** Done
**Strategic Goal:** `/magicspec sync` brings a project's derived state back in line with its sources: the registry's computed cells, the rule projection and host copies, the graph and wiki, live memory's progress lines, the declared version anchors and the registered documentation blocks. It writes only what needs no judgement. Every disagreement and every stale derived file is reported with the one command that resolves it. It deletes nothing, writes nothing on a second run, and `--dry-run` lists every write without making one. In this repository, `/magicspec-dev sync` runs the shipped pass as its project-meta stage and keeps only its engine-only stages.

**Phase notes:**

- **Tracks.** `C` is the constitution. `A` builds the subcommand and its areas. `B` adds the body, the router row and the Input Pass. `K` edits the rule kernel. `M` changes the maintenance pipeline. `D` documents the command. `E` writes the suite scenarios and the harness cases. `T` validates. `S` records what was built.
- **Order (plan note 8, one point refined).** C01 comes first. Then the A tasks, so that the body names a subcommand that exists. B01 lands the body and the router row in one task. K01, D01 and B02 follow B01, because the phantom-command case (`tests/engine.js`, H10a) resolves every `/magicspec {cmd}` in shipped text and `docs/` against `skills/magicspec/workflows/{cmd}.md`, so a kernel line naming `/magicspec sync` fails until the body exists. Plan note 8 puts the kernel before the router row; it moves after the body for this reason. Its aim, both scans clean between tasks, is unchanged. M01 needs B01 and A01 to A04.
- **C14.** Every task that changes a file in `skills/magicspec/` runs `node skills/magicspec/scripts/executor.js update-engine-meta` right after the change, before its next step.
- **Fixture root (Phase 51 outcome).** Every harness case that calls a writing subcommand in process passes the fixture root, so that the call cannot find the real project from the working directory and write into it.
- **No deletion, no unconditional write (SY-3, SY-5).** Two writers the areas reuse break these rules if they are called as they are. `export-wiki` prunes every wiki page and rewrites them all on each run. `update-state` stamps `**Updated:**` on every write. `hosts.refreshProjections` deletes retired command entries. Each area computes first, compares with what is stored, writes only what differs, and never calls a path that removes a file. Caches that their owner prunes under the retention contract are not derived files in SY-5's sense: the graph extraction cache and the artifact index's rows for a vanished file. T-55S01 records this reading.
- **The rule kernel.** `CONSTITUTION.md` is 16021 bytes, and the harness requires it to stay below 16384. K01 adds at most 362 bytes. If the text does not fit without dropping a rule, the remedy is to move a section (Phase 52 note 3), which changes `l2-engine-automation.md` §Context-Economy Surfaces item 2. K01 then records it and names `/magicspec spec` as the next step.
- **Task Instruction Review (PQ-6).** `@role:prompt-engineer` reviewed this workbook before it was written. Verdict: PASS-WITH-REWRITES. Three rewrites were applied inline: "compares with what is stored" is defined per area in A02 to A04; the closed list of what B01's body may compute itself (nothing) is stated; M01 names the cache inventory entry that leaves with the updater.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-55C01] The constitution through `/magicspec rule`: C2 lists `sync` as shipped
- [x] [T-55A01] The registration form for version anchors and documentation blocks (the specification's TBD)
- [x] [T-55A02] The `sync` subcommand: arguments, the report, `--dry-run`, and the `registry` and `state` areas
- [x] [T-55A03] The `projections` and `graph` areas: integrity first, compare before write, nothing removed
- [x] [T-55A04] The `versions` and `docs` areas: declared anchors only, registered blocks between their markers, contained
- [x] [T-55B01] The `sync` body and its router row, in one task
- [x] [T-55B02] The `sync` body joins the Input Pass: card trigger, mirror, the harness table
- [x] [T-55K01] The rule kernel: `sync` in the §1 and §3 exemptions and the caution's regeneration sentence, within 362 bytes
- [x] [T-55M01] The maintenance pipeline runs the shipped pass as its project-meta stage
- [x] [T-55D01] Documentation: `docs/sync.md`, the README, the documentation index, the contribution guide's generated table
- [x] [T-55E01] The cognitive suite: the sync scenarios the plan lists
- [x] [T-55E02] The harness: the sweep of moved pins and the mutation entries
- [x] [T-55T01] Validation: harness, mutation checks, the suite, C14, idempotence on this repository, the kernel budget
- [x] [T-55S01] Spec sync: the TBD closed, the as-built decisions, the supersessions, the registry
- [x] [T-55F01] Fix: a task title that names a command no longer decides the handoff line or trips the reserved-command guard

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-55C01] The constitution through `/magicspec rule`: C2 lists `sync` as shipped

- **Spec:** l1-sync-command.md §6 item 5; l1-command-surface.md CS-1
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Text.** In `.magicspec/RULES.md` C2, the sentence on the command set as it ships lists `sync` after `migrate` and before `help`, in router order. The clause naming `sync` as the exception still to come is gone, and so is "with its own delivery, one workflow body". `skills/magicspec/templates/rules.md` carries the same C2 sentence word for word (`diff` of the two C2 paragraphs prints nothing).
  - **Gate.** The rule workflow ran its Admission step (RA-1, origin `user-stated`: the owner's list of 2026-11-11), the constitutional-reviewer verdict (APPROVE expected: C2 itself authorizes the exception) and the rule wording review. Both verdicts are in the 1.24.0 history row.
  - **Harness.** `node --test tests/engine.js` passes the cases that compare the constitution with its template.
- **Handoff:** B01 needs this task. If the review fails, B01 waits and the A tasks do not.
- **Notes:** This is a §7 amendment, so no core-amendment gate applies. The C2 text names each command in backticks with no `/magicspec` before it, so the phantom-command case is not affected. The template edit is a C14 event.
- **Changes:** `.magicspec/RULES.md` 1.23.0 → 1.24.0: C2's sentence on the command set as it ships lists `sync` after `migrate` and no exception is left to come; the history row records origin `user-stated`, admission, the constitutional review (APPROVE) and the wording review (PASS). `skills/magicspec/templates/rules.md` carries the same C2 word for word (the two C2 paragraphs diff identical). `tests/engine.js`: the C2 pin in the four-stages case now asserts the new list and that no exception is left. C14 run. Harness: the 22 constitution and template cases pass; the one that asserts `TASKS.md` records the current constitution version fails until `/magicspec plan` and `/magicspec task` re-baseline the ledger (the Phase 52 and 53 consequence: the plan and the ledger record 1.23.0). The Sync guard of `run` reads the constitution at the start of an invocation, so this run continues; the phase ends with a replan directive.

### [T-55A01] The registration form for version anchors and documentation blocks (the specification's TBD)

- **Spec:** l1-sync-command.md §2 (the TBD), SY-4, SY-6; l2-engine-automation.md §Setting Parity
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Decision.** One `[DR]` line in Changes names the form chosen by the Consequence Forecast, the runner-up and the override. The candidate the plan expects to win is a `sync` section in `.magicspec/workspace.json`, beside `finalization`, holding `versions` (anchors) and `docs` (blocks). In that candidate, an anchor is a file plus either a marker key (`<!-- generated:{key} -->…<!-- /generated:{key} -->`, the marker form the contribution guide already uses) or a JSON key path. A block is a file, a neutral key, and a source: a project file read whole, or a marked block of one.
  - **Reader.** One library (`skills/magicspec/scripts/lib/sync-config.js`) reads and validates the section. An absent section means nothing is declared. A malformed entry becomes a disagreement record (location, difference, the command that resolves it) and never an exception. A key the reader does not know is reported as a disagreement too. Every key the documentation names has this reader, so ventilation's Setting Parity check (`PHANTOM_SETTING`, `workflows/analyze.md`) finds none without a reader.
  - **Version source.** The version comes from `finalization.versionPath` of `workspace.json` (default `.magicspec/.version`). The form never names a file pattern, so SY-4 holds: nothing is searched for.
  - **Harness.** New cases, each seen to fail before the change: an absent section declares nothing; a malformed entry yields one disagreement and no throw; an unknown key is reported; a valid anchor and block are returned with their resolved paths. `skills/magicspec/templates/workspace.json` gains no `sync` section (opt-in), or gains an empty one; Changes records which and why.
- **Handoff:** A04 consumes the reader.
- **Notes:** The markers in a product file carry only the neutral key (SY-6). No task identifier, specification name or state-folder path appears in them. The registration lives in the state folder, so a product file gets nothing but its markers.
- **Changes:** [DR] The registration is a `sync` section of `.magicspec/workspace.json` beside `finalization` — the file every engine setting already lives in, read by the project's own configuration path rules; criterion: lowest worst-case cost of being wrong (a later move of two keys), no new file or reader for the person to learn; runner-up: a separate `.magicspec/sync.json` (one more file, one more owner); override: `/magicspec spec amend l1-sync-command.md "sync registers in its own file"`. `lib/sync-config.js` (`readSyncConfig(root)`): `versions` anchors are `{file, json}` (a key path) or `{file, marker, format}` (`format` holds `{version}`, default `{version}`); `docs` blocks are `{file, marker, from, fromMarker?}` (the block is filled from a project file, whole or from the marked block of that file); a marker is a neutral key and the product file carries `<!-- sync:{key} -->…<!-- /sync:{key} -->`. Every path goes through `resolveInsideProject`; an absent file or section declares nothing; a malformed, unknown or escaping entry is one problem record (location, difference, the fix) and never an exception, and the valid entries still come back. The version itself comes from `finalization.versionPath` (default `.magicspec/.version`), so nothing is searched for (SY-4). `templates/workspace.json` gains no `sync` section: the feature is opt-in, an absent section declares nothing, and the template's non-registry keys are settings every project gets by default. The reader reads `versions` and `docs` by those names, so the Setting Parity check finds a reader for every key the documentation will name. Two harness cases (`sync-config: …`): the absent, valid and resolved-path cases; the malformed, unknown, escaping, non-object and unreadable cases. `biome check` clean on the new file. C14 run.

### [T-55A02] The `sync` subcommand: arguments, the report, `--dry-run`, and the `registry` and `state` areas

- **Spec:** l1-sync-command.md SY-1, SY-2, SY-3, SY-7, SY-8, §5.1, §5.2, §5.3; l1-session-continuity.md (live memory's engine-owned progress lines); l1-goal-mode.md §6 item 6; l2-engine-automation.md §Command Table, §Registered Folders Only
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Wiring.** `skills/magicspec/scripts/sync.js` calls `guardArgv`. It accepts `[area | workspace] [--dry-run]`: `registry`, `projections`, `graph`, `state`, `versions` or `docs`, or a registered workspace name; with no argument it runs every area on every workspace. It has an entry in `scripts/lib/commands.js`. The entry carries `provisions` only if the script creates a workspace folder, and it never should. The entry carries `usesSqlite` only if the script opens the index in its own process (plan note 6). The option-drift and help cases pass.
  - **Report.** The output follows §5.3. The first line is `[Sync] {w} written · {u} in sync · {d} disagreements · {s} stale`. Then come `written`, `disagree` and `stale` lines, and last the `Next: /magicspec {command} — {demand} reasoning` line, whose demand is read from the router through `lib/hosts.js` `readCommands`. With nothing to write and nothing to report, the output is one line saying the project is in sync (SY-8). `--dry-run` prints the same report with every `written` line marked as a write it would make, and changes no byte on disk: a harness case hashes the fixture tree before and after.
  - **`registry` area.** It writes only cells fully computed from files. These are the specification count of each workspace row in the global registry, where that column exists, and a row for a workspace that `workspace.json` registers and the table lacks. A hand-written cell that differs from its source is reported, never overwritten. A row for a workspace that is not registered is stale and reported. A specification header whose `Status` or `Version` differs from its registry row is reported with `/magicspec spec` (SY-2). It never writes a specification's version or status, a registry's own `**Version:**` line, a history row or the `**Engine Version:**` snapshot (SY-1).
  - **`state` area.** It recomputes the progress block with the function `update-state.js` exports (`computeProgress`; `finalize.js` already requires that script). It compares the result with the stored block and runs `update-state --auto-progress` only when the two differ, because `update-state` stamps `**Updated:**` on every write and an unconditional call breaks SY-3. The goal block and every hand-written section come out byte for byte (plan note 5).
  - **Idempotence.** A second run on an unchanged fixture writes nothing and prints the one-line in-sync report (SY-3).
  - **Harness.** New cases, each seen to fail before the change: a stale specification count is rewritten, and the second run writes nothing; a header that disagrees with its row is reported with `/magicspec spec` and both files are left unchanged; a recorded goal block survives the `state` area; `--dry-run` writes nothing; `sync registry` touches no other area; an unknown area or workspace exits 1 with the list of valid ones.
- **Handoff:** A03 and A04 add their areas to the same script. B01's body runs it.
- **Notes:** Areas run in the order `registry`, `state`, `projections`, `versions`, `docs`, `graph`, so that the graph area sees what the others wrote (plan note 6). `sync` does not finalize (§2): it bumps no project version and writes no changelog entry. Changes records the measured run time on this repository.
- **Changes:** `skills/magicspec/scripts/sync.js` with an entry in `lib/commands.js` (`positional: [area|workspace]`, `--dry-run`; no `provisions`, no `usesSqlite`; the command-table and option-drift cases pass). Areas run in the order registry, state (projections, versions, docs, graph come with A03 and A04); a word that is an area runs that area, a registered workspace limits the run to it, anything else exits 1 listing the valid ones. Libraries: `lib/sync-report.js` (the collected report; `writeIfChanged` writes only when the recomputed content differs, so a second run writes nothing; the layout of §5.3, one line when there is nothing to write or report, `(dry run)` and `would write` under `--dry-run`), `lib/sync-registry.js` (the Specs cell of each workspace row of the global registry and a row for a registered workspace the table lacks, built from the table's own header; reports a header Status or Version that differs from its row with `/magicspec spec`, a registered file missing from the disk and a specification file no row registers with `/magicspec analyze`, and a row of an unregistered workspace as stale and kept; writes no version line, history row or snapshot), `lib/sync-state.js` (compares the recomputed counters with the stored block and runs `update-state --auto-progress` only when they differ, in a child process so its output stays out of the report; a goal block and hand-written sections come out byte for byte). The Next line is the first router command a disagreement names, else the step live memory records, through `finalize`'s handoff reader. Measured on this repository: a dry run 1.0 s. Four harness cases (`sync: …`) over a one-workspace consumer, plus nine mutation entries, all CAUGHT. `biome check` clean on the new files. C14 run.

### [T-55A03] The `projections` and `graph` areas: integrity first, compare before write, nothing removed

- **Spec:** l1-sync-command.md SY-1, SY-2, SY-3, SY-5, SY-7, §5.4, §6 item 2; l1-skill-packaging.md (generated projections); l2-spec-graph-memory.md §4.2, §4.4; l2-artifact-memory-store.md §6 item 3; plan notes 1 and 6
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Integrity first.** The `projections` area runs the engine integrity check (the read-only branch of `update-engine-meta`, `--check`) before anything else. On a failure it writes no projection and reports one disagreement whose command is to restore the skill folder from the release archive. The other areas still run (§5.4).
  - **Projections.** The area reads `hosts.findProjections`. It rewrites in place a `rule` or `block` projection whose content differs from the source, through the generator's own writers. It reports every retired command entry (`kind: 'command'`) as stale with the command that removes it (the projection step of `init` for that host), and it never deletes one. That means it does not call `refreshProjections`, which deletes them (SY-5). A projection that is current counts as in sync.
  - **Graph.** The area renders the graph and the wiki without pruning and compares each page with the stored one. It writes only the pages that differ or are missing. It reports a stored page that no current specification produces as stale, with `export-wiki` as the command that removes it. It refreshes the artifact index only when it wrote a page, through `memory-index` started by the executor, so the warning flag applies (plan note 6). Under `--dry-run` it lists the pages and the index refresh it would make and runs nothing that writes. If rendering needs a change to `export-wiki.js` (an exported render function, or a no-prune mode), the change keeps the current behaviour of `export-wiki` with no flag byte for byte, and an existing harness case proves it.
  - **Harness.** New cases, each seen to fail before the change: a corrupted manifest skips `projections` and the other areas run; a stale rule projection is rewritten and a second run writes nothing; a retired command entry is reported and still on disk afterwards; a wiki page of a removed specification is reported and still on disk; an unchanged graph writes no page and does not refresh the index; `--dry-run` writes neither pages nor index.
- **Handoff:** B01's body describes these outcomes; E01 has a scenario for each.
- **Notes:** In this repository the C14 write branch also refreshes the projections. The area must agree with it: after `update-engine-meta`, `sync projections` reports in sync. The graph extraction cache prunes its own entries after a build. That is the cache owner's bound, not a deletion by `sync` (phase notes).
- **Changes:** `lib/sync-projections.js`: runs the read-only integrity check (`update-engine-meta --check`) first; on a failure it writes no projection and reports one disagreement whose command is to restore the folder from the release archive, and the other areas still run. Otherwise it reads `hosts.findProjections` and rewrites a stale `rule` or `block` projection in place through the compare-before-write helper; a retired command entry is reported as stale with `node {executor} init --host {host}` and is never deleted (`refreshProjections`, which deletes, is not called); a current projection counts as in sync. `lib/sync-graph.js`: renders the wiki into a scratch folder outside the project with `export-wiki --out` (so no legacy artifact is retired and no index refreshed), copies only the pages whose bytes differ, reports a stored page no specification produces as stale with `export-wiki` as the remover, and refreshes the artifact index through the executor only after a page was written; under `--dry-run` it lists the pages and the index refresh and writes nothing. `export-wiki.js` is unchanged (its no-flag behaviour is byte for byte the same). One change outside the plan's list: `graph-cache.js` now honors `MAGIC_DRY_RUN` (no folder created, no entry saved, no entry pruned), because the build that renders the wiki wrote its extraction cache into the project even for a preview, which broke SY-7; the preview sets the variable for that build, and a real run is unchanged. Measured on this repository: `sync graph` wrote one page (the wiki index, stale since the specification edits of the phase) and the second run printed the one-line report; `sync projections` reports in sync after `update-engine-meta`; a full dry run 2.2 s. Harness: four cases (`sync projections: …` ×2, `sync graph: …`, `graph-cache: under MAGIC_DRY_RUN …`) and eight mutation entries, all CAUGHT. `biome check` clean on the new files. C14 run.

### [T-55A04] The `versions` and `docs` areas: declared anchors only, registered blocks between their markers, contained

- **Spec:** l1-sync-command.md SY-2, SY-4, SY-6, §5.1; l1-sdd-reference-containment.md (what a product file may never contain)
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Versions.** The area reads the version file and writes it into each anchor that A01's reader returns, and nowhere else. An anchor whose marker or key is missing from its file is reported as a disagreement with the file and the marker (SY-2). No search of the project for version-like strings exists in the code: a harness case plants a version-like string outside any anchor and asserts that it is unchanged.
  - **Docs.** The area rewrites only the content between a registered block's markers. A harness case asserts that the bytes outside the markers are identical before and after. A block whose source is missing is reported and left as it is. The generated content is checked against the classes `references/rules/containment.md` lists. No script implements that check today: ventilation runs it as a cognitive scan, so it is written once in the `sync` library and covered by its own case. Content that would carry a task identifier, phase designator, registry or specification file name, or a state-folder path is not written and is reported as a disagreement (SY-6).
  - **Idempotence and preview.** A second run writes nothing. `--dry-run` writes nothing (the shared tree-hash case of A02 covers both areas).
  - **Harness.** New cases, each seen to fail before the change: an anchor is updated; a version-like string outside the anchors is untouched; a missing marker is reported; a block is rewritten between its markers only; a source carrying a specification file name is refused and reported.
- **Handoff:** D01 documents the registration form.
- **Notes:** This repository declares no anchor and no block. Its README version line stays with the maintenance pipeline's manifest-anchor stage (SY-9), so the shipped pass changes nothing in this repository's product files.
- **Changes:** `lib/sync-versions.js`: reads the registered anchors through `readSyncConfig` and the version from `finalization.versionPath` (default the state folder's `.version`); a JSON anchor is rewritten in place at the one `"key": "old"` pair (formatting kept; an absent key, a non-string value or a pair that occurs more than once is reported and the file left as it is), a marker anchor replaces the content between its markers with `format` (default `{version}`); no code searches for a version-like string (a case plants one outside the anchors and asserts it unchanged). `lib/sync-docs.js`: fills a registered block from a project file (whole, or the block of the same key kind in it) between its markers only, in the file's own line endings, trimmed so a second run writes nothing; a missing source, missing markers or missing file is reported and nothing written. `lib/sync-markers.js`: the neutral markers `<!-- sync:{key} -->` and the containment check, written once here because no script implemented the reference rule (ventilation runs it as a cognitive scan): a task identifier, a phase designator (the file form and prose `Phase N`, refused conservatively because the generated text cannot apply the judgement the rule asks for), an SDD system file, a specification file name and a state-folder path refuse the write and are reported. `sync.js` reads the registration once and lists its problems once whichever of the two areas runs, and the area order is registry, state, projections, versions, docs, graph. Harness: three cases (`sync versions: …` ×2, `sync docs: …`) and seven mutation entries, all CAUGHT. This repository declares no anchor and no block, so the shipped pass changes nothing in its product files (its README version line stays with the maintenance pipeline, SY-9). `biome check` clean on the new files. C14 run.

### [T-55B01] The `sync` body and its router row, in one task

- **Spec:** l1-sync-command.md §5.1 to §5.4, §6 item 1; l1-command-surface.md CS-1, §5.1 (the `sync` row), §5.2 (the listing line); l1-pipeline-stages.md PS-4 (`light`); l2-skill-wrappers.md §2.1, §2.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Body.** `skills/magicspec/workflows/sync.md` has the Entry (triggers and the argument grammar of §5.2) and the standard Input Pass line. Its steps are: resolve the workspace when one is named (`resolve-workspace --command sync`); run `node scripts/executor.js sync [arg] [--dry-run]`; relay the report verbatim. It has its checklist and its handoffs. The body computes nothing the script computes and adds no step of its own between the script and the report. It runs no `finalize` and says why (§2).
  - **Row.** `skills/magicspec/SKILL.md` has the row the specification states: `sync`, group `maintenance`, "Bring derived state up to date: registries, projections, graph, versions, registered documentation blocks", argument `an area · a workspace · --dry-run`, *optional — every area, every workspace*, demand `light`, body `workflows/sync.md`. It sits after `migrate` and before `help`. `help` lists it from the table with no edit to `help.md`. The pipeline paragraph of the router names `sync` beside `migrate` in one clause.
  - **Scans.** `node --test tests/engine.js` passes the phantom-command case (H10a), "the router … lists exactly the workflows of the folder (skill folder)", and "the router table has a demand for every command …". The contribution guide's generated command table is refreshed by the maintenance sync's doc stage in D01, not by hand.
- **Handoff:** B02, K01 and D01 follow.
- **Notes:** The row and the body land together because each half fails a harness case without the other. Phase 52's outcome applies: the router's row, the demand table, the Input Pass body count and the guide's generated table pin the command set and fail together on the first full run, so fix them in this task.
- **Changes:** `skills/magicspec/workflows/sync.md` (the Selection-Signal description, Contents, Entry with the six areas and the argument grammar, the Input Pass line, seven invariants SY-1 to SY-7 as the body can state them, one step that runs the script and relays its report verbatim, the checklist, the handoffs): it computes nothing, runs no `finalize` and says why. `skills/magicspec/SKILL.md`: the row the specification states, after `migrate` and before `help` (group `maintenance`, argument an area, a workspace or `--dry-run`, optional, demand `light`), `sync` named in the router's description (1020 of 1024 characters) and in its pipeline sentence; `help` lists it from the table with no edit to `help.md`. Pins moved with the row, as Phase 52 predicted: the router's count of rows and bodies (13 → 14) and its demand table, the Input Pass body count (the card trigger is B02), and two scans that the new files tripped — `sync-*` spelled the state folder literally (SP-8: now built from `STATE_DIR_NAME`) and the cache-inventory scan found `graphPaths(` in `lib/sync-graph.js` (listed as a non-owner of the wiki with its reason: it copies what `export-wiki --out` rendered and reports stale pages, so the wiki keeps its one owner). The contribution guide's generated table is refreshed by the maintenance documentation stage in the documentation task, once, after the engine version stops moving (that stage restamps every page's sync note on each version bump); its case stays red until then. Harness: the router, phantom-command, demand, SP-8 and cache-inventory cases pass. C14 run.

### [T-55B02] The `sync` body joins the Input Pass: card trigger, mirror, the harness table

- **Spec:** l1-input-prompt-pass.md IP-1; l2-role-cards-governance.md (the prompt-engineer card mirror); plan note 4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/roles/prompt-engineer.md` frontmatter has `- workflow: sync.md` with `gate: "Input Pass"`. The mirror in `l2-role-cards-governance.md` lists it the same way. The harness case that compares the card's Input Pass triggers with the shipped bodies passes (`tests/engine.js`: "every shipped body, and no other, is an Input Pass trigger").
- **Handoff:** T-55S01 records the mirror's patch.
- **Notes:** The usual arguments of `sync` are names and flags, so the pass runs only when prose comes with the command, as the standard line already says.
- **Changes:** `skills/magicspec/roles/prompt-engineer.md`: `- workflow: sync.md` with `gate: "Input Pass"` after the `goal.md` trigger; the mirror in `l2-role-cards-governance.md` carries the same two lines (its version and history row move in the specification-sync task, as in Phases 52 to 54). The body's Input Pass line already says that the usual arguments are names and flags and run no pass (plan note 4). The Input Pass case ("every shipped body, and no other, is an Input Pass trigger") passes with fourteen bodies, and the card, mirror and role-integration cases pass (13 of 13). C14 run.

### [T-55K01] The rule kernel: `sync` in the §1 and §3 exemptions and the caution's regeneration sentence, within 362 bytes

- **Spec:** l1-sync-command.md §6 items 4 and 6; RULES.md C28 item 5; l2-engine-automation.md §Context-Economy Surfaces item 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **§1.** The Exemptions list has `/magicspec sync`, with one reason clause: the report already covers what a drift line would announce.
  - **§3.** The skip list of the finalization protocol names `/magicspec sync` beside `help` and `migrate`.
  - **Caution.** The read-only caution gains one sentence saying that regenerating the host copies through the shipped generator (`init`, `sync`) is the engine's own act. The prohibition of hand edits stays word for word: `git diff` of the CAUTION block shows only the added sentence.
  - **Budget.** `wc -c skills/magicspec/CONSTITUTION.md` is below 16384, because the harness asserts `<`. That leaves 362 bytes over today's 16021, one fewer than the plan's figure of 363. Changes records the size. The harness's kernel-size case passes. `@role:prompt-engineer` reviewed the added text, and the verdict is in Changes.
  - **Projection.** C14 refreshes `.agents/rules/magicspec.md`. `update-engine-meta --check` reports no drift, and the rule copy equals the kernel byte for byte.
- **Handoff:** If the text does not fit, record the measured overflow and name `/magicspec spec` as the next step (phase notes).
- **Notes:** The §8 checklist's §3 item lists the finalizing workflows, and `sync` is not one of them, so it is unchanged.
- **Changes:** `skills/magicspec/CONSTITUTION.md` (the rule kernel), three additions and nothing removed: §1 Exemptions gain `/magicspec sync` with one reason clause (its report already lists a stale projection or a failed integrity check); §3's skip list names `/magicspec sync` beside `help` and `migrate`; the read-only caution gains one sentence after its last line — regenerating those host copies through the shipped generator (`init`, `sync`) is the engine's own act, not a write by hand. The prohibition above it is word for word (a case pins every line of the caution, and the `git diff` of the block shows only the added line). Size 16021 → 16263 bytes (242 added; 121 left under the harness's 16384). Review by `@role:prompt-engineer` over the three changed lines: PASS — each is one clause, widens no rule and names the same two commands the specification names. The always-on rule copy of this repository equals the kernel byte for byte after C14 (`cmp` and a case). The `§8` checklist needed no change (its §3 item lists the finalizing workflows only). Harness: one case plus three mutation entries, all CAUGHT. C14 run.

### [T-55M01] The maintenance pipeline runs the shipped pass as its project-meta stage

- **Spec:** l1-sync-command.md SY-9, §6 item 3; l1-command-surface.md CS-15 (the maintenance `sync` row); plan notes 3 and 7; CLAUDE.md §1.3 (layer classification)
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Pipeline.** Stage 4 of `scripts/sync.js` runs `node skills/magicspec/scripts/executor.js sync` (forwarding `--dry-run`). Stages 1, 2, 3 and 5 are unchanged. A run on this repository writes `.magicspec/INDEX.md` at most once, and a second run writes nothing to it (the harness pin of plan note 3).
  - **The updater.** `scripts/update-project-meta.js` no longer bumps a registry's `**Version:**` line or appends a history row (plan note 7). The §1.3 trace is recorded in Changes: entry points, readers, the read and write paths. If the trace leaves no caller and no purpose, the file is removed. In that case `.cache/project-meta-state.json` leaves `clean-cache.js` `rebuildableCaches` and the harness's cache inventory in the same task, because a cache with no writer has no owner. That edit is a C14 event.
  - **Bodies.** `skills/magicspec-dev/workflows/sync.md` step 4 describes the shipped pass, and its state-file list drops what is retired. The `sync` row of `skills/magicspec-dev/SKILL.md` reads that it runs `/magicspec sync`, then the engine-only stages (CS-15 §5.5).
  - **Harness.** The pins of the old stage move with it. A case asserts that the maintenance pipeline's dry run lists the shipped pass's report and writes nothing.
- **Handoff:** D01 updates `docs/development.md` for the new stage.
- **Notes:** The call goes from L2 to L1, the sanctioned direction (§6 item 3). No shipped file names the maintenance tooling.
- **Changes:** Stage 4 of `scripts/sync.js` now runs the shipped pass (`skills/magicspec/scripts/sync.js`, the command a user runs as `/magicspec sync`; L2 calling L1, the sanctioned direction) and forwards `--dry-run`; stages 1, 2, 3 and 5 are unchanged. The §1.3 trace of `scripts/update-project-meta.js`: entry points — none (no router row, no workflow body, no hook names it); callers — `scripts/sync.js` stage 4 only, now replaced; read path — it read `.magicspec/INDEX.md` and a digest cache; write path — the registry's `**Version:**` line, the `Last Updated` stamp, a history row and `.cache/project-meta-state.json`, all of it the version and history journals SY-1 does not allow `sync` to write (its summary promised spec counts, which it never wrote; the registry area now writes them). No caller and no purpose remained, so the file is removed (`git rm`) with what existed only for it: its entry in `scripts/cli-guard.js`; three unit cases and the `makeDesignDir` helper of the harness; the cache-inventory row and the project-meta part of the cache-state case and of the two `clean-cache` cases; the cache's entry in `clean-cache.js` (an owner-less file of an earlier run stays, gitignored and inert); its lines in `l2-engine-automation.md` (the command-guard list, the cache table row, the script inventory row, the sentence that kept its history rule) and `l2-engine-diagnostics.md`; the example in `AGENTS.md` (edited in place, the link family intact; the two v2.1.x case-study paragraphs about the earlier relocation stay as history) and `docs/distribution.md`. `skills/magicspec-dev/workflows/sync.md` step 4 and the `sync` row of `skills/magicspec-dev/SKILL.md` now say what the stage runs. New harness case: the pipeline's dry run prints the shipped report and writes nothing; a real run changes only the registry count (no version bump, no `Last Updated`, no history row) and a second run writes nothing to it. The registry journals are authored with the specifications from now on, so this repository's global registry no longer grows by itself. C14 run (clean-cache).

### [T-55D01] Documentation: `docs/sync.md`, the README, the documentation index, the contribution guide's generated table

- **Spec:** l1-documentation-system.md (documentation parity); l1-sync-command.md §5, §2
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Pages.** `docs/sync.md` exists, with the `**Triggers:**` and `**Slash command:**` lines the maintenance doc stage propagates from the body, the six areas, the argument grammar, the report layout, the registration form of A01 with one example of an anchor and one of a block, and what `sync` never does (judge, delete, finalize). `README.md`'s command table has the `sync` row. `docs/README.md` links the page. `docs/development.md` describes the maintenance stage 4 as M01 left it.
  - **Generated.** `node scripts/sync.js` refreshes the command table of `CONTRIBUTING.md` between its markers, and a second run writes nothing.
  - **Checks.** The phantom-command case passes over `docs/`. Every relative link in `docs/sync.md` and in the edited pages resolves to a file on disk; Changes records how that was checked.
- **Handoff:** E01 writes the scenarios against these pages and the body.
- **Notes:** The examples use a neutral workspace placeholder (`docs`), never this repository's workspace name.
- **Changes:** `docs/sync.md` (the `**Triggers:**` and `**Slash command:**` lines the maintenance stage propagates from the body, the six areas, the argument grammar, the report layout, the registration form with one anchor and one block as JSON, what `sync` never does, the engine repository's extension); `README.md` command table gains the `sync` row after `migrate`; `docs/README.md` lists the page among the auxiliary workflows; `docs/development.md` describes the maintenance `sync` as running the shipped pass first (its pipeline sentence in `docs/distribution.md` follows). The maintenance documentation stage ran once (`node scripts/sync.js --skip-meta --skip-links`): the contribution guide's generated command table now lists `sync` between `migrate` and `help`, every page's sync note was restamped to the engine version, and the stage's own project-state step, the shipped pass, wrote live memory's counters and the wiki page that had gone stale (an observation, not an effect of the docs). Examples use neutral names. Checks: every relative link of `docs/sync.md`, `docs/README.md` and `README.md` resolves to a file (a script over the three files); the phantom-command, router-parity and guide cases pass (34 of 34 documentation cases).

### [T-55E01] The cognitive suite: the sync scenarios the plan lists

- **Spec:** l1-product-simulation.md §2 (the cognitive suite stands for this repository's scenario files); l1-sync-command.md SY-1 to SY-9; the Scenarios line of the Phase 55 plan entry
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `tests/suite.md` gains T343 onward, one case per scenario in the plan's list: derived state only, the snapshot untouched, a second run writes nothing; the one-line report; `sync {area}`; the goal block survives; a header disagreement reported; versions only at the declared anchors; a stale file reported and kept; a block rewritten between its markers and contained; `--dry-run` writing nothing, wiki and index included; an integrity failure skipping `projections`; the maintenance pipeline running the shipped pass and bumping no registry version. Each case names its guards and its control. The suite version moves 1.9.103 → 1.9.104 (T342 and 1.9.103 belong to the repair T-55F01). Run by `@role:simulator-tester`.
- **Handoff:** T01 simulates the cases against the body and the script as built.
- **Notes:** The cases follow the T336 to T341 shape: the steps, the expected outcome quoted from the specification, the guards tested, the control.
- **Changes:** `tests/suite.md` 1.9.103 → 1.9.104: ten cases T343 to T352, one per scenario of the plan's list, each with its synthetic state, action, checkable expectations, a control, the guards tested and the regression line. T343 derived state only, the snapshot untouched, a second run writes nothing and the one-line report (SY-1, SY-3, SY-8); T344 an area or a workspace narrows the run (§5.2); T345 a recorded goal survives (plan note 5); T346 a header disagreement, a missing file and an unregistered file reported with their command and left alone (SY-2); T347 a version only at the declared anchors (SY-4); T348 a stale derived file reported and kept (SY-5); T349 a registered block between its markers only and contained (SY-6); T350 a preview writes nothing, wiki and index included (SY-7); T351 a failed integrity check skips projections only (plan note 1); T352 the maintenance sync runs the shipped pass and bumps no registry version (SY-9, plan note 7). The numbering starts after T342, which the repair T-55F01 took; the suite's own harness cases pass. Run by `@role:simulator-tester` against the body and the scripts as built in the validation task.

### [T-55E02] The harness: the sweep of moved pins and the mutation entries

- **Spec:** l2-test-suite.md (the harness and the mutation-control driver)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** Every case added by A01 to M01 is in `tests/engine.js`, and each fails with its change reverted. The mutation list gains one entry per new guard. `node scripts/mutation-check.js` reports every new entry `CAUGHT`, or an equivalent mutant named as such in Changes. The cache inventory case matches `rebuildableCaches` after M01.
- **Handoff:** T01 runs the whole harness.
- **Notes:** Each task writes the cases for its own change. This task is the sweep that catches the pins those tasks moved, as D02 was in Phase 49.
- **Changes:** Every case of A01 to M01 is in `tests/engine.js` (the harness went 419 → 432: `sync-config` ×2, `sync` ×4, `sync projections` ×2, `sync graph`, `sync versions` ×2, `sync docs`, `graph-cache` under `MAGIC_DRY_RUN`, the maintenance pipeline, the rule kernel, and the repair T-55F01's case). The sweep of pins the phase moved: the C2 list in the constitution case, the router's row and body count (13 → 14) and its demand table, the Input Pass body count, the SP-8 scan (state-folder spelling in the new libraries), the cache-inventory scan (`lib/sync-graph.js` as a non-owner of the wiki, with its reason) and, with the updater's retirement, its three unit cases, its inventory row and its part of the cache-state and `clean-cache` cases. Mutation: 32 entries over the phase's guards (the repair 3, the configuration reader 2, the report and the registry and state areas 7, projections and graph 6, the extraction cache's dry-run guard 3, versions and docs 7, the kernel 3, the pipeline stage 2), all CAUGHT after the final edits (one needle moved when the containment class list was rewritten for SP-8 and was corrected). Two duplicated fixture blocks that fallow found in the new cases were replaced by one `syncIO` helper and the existing writer; `pnpm run audit` reports no duplication. The one case that still fails is the ledger-version pin of the four-stages case (the constitution is 1.24.0, the plan and ledger record 1.23.0), which only `/magicspec plan` and `/magicspec task` can move (PL-1): the Phase 52 and 53 consequence, recorded as a replan directive at the end of the phase.

### [T-55T01] Validation: harness, mutation checks, the suite, C14, idempotence on this repository, the kernel budget

- **Goal:** Verify T-55C01 to T-55E02 against l1-sync-command.md SY-1 to SY-9 and the plan's notes 1 to 8.
- **Spec:** l1-sync-command.md §3, §5
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **Harness.** `node --test tests/engine.js` (in the background; read the `pass`/`fail` counters) reports `fail 0`. The mutation entries of E02 report `CAUGHT`.
  - **Suite.** The E01 cases are simulated against the body and the script as built, and each passes; the result is recorded per case.
  - **Live.** On this repository, `node skills/magicspec/scripts/executor.js sync --dry-run` prints the report and changes nothing (`git status --porcelain` is the same before and after). Then `sync` runs, and a second `sync` prints the one-line in-sync report and writes nothing.
  - **Engine and kernel.** `node skills/magicspec/scripts/executor.js update-engine-meta --check` reports no drift. `wc -c skills/magicspec/CONSTITUTION.md` is below 16384.
  - **Repository checks.** `check-prerequisites --json --workspace=engine` reports no warning this phase introduced. `node scripts/validate-hardlinks.js` passes.
  - **Static checks.** `node_modules/.bin/biome check` on every changed `*.js` and `*.json` file and `pnpm run audit` report no finding on code written in this phase.
- **Handoff:** S01.
- **Notes:** A finding here is fixed in the task that owns the file, and that task's Changes records it.
- **Changes:** Harness: `node --test tests/engine.js` 432 tests, 431 pass, 1 fail (the ledger-version pin, expected: see T-55E02); the subset of 14 cases that the later test refactor touched passes again. Mutation: 32 of 32 CAUGHT (the entries of the repair and of every task, run again against the final code). Suite, each case simulated against the body and the scripts as built and checked against the harness case or the live run that exercises it — T343 pass (harness `sync: it rewrites…`, live: the second run printed the one-line report); T344 pass (`sync: a workspace the global table lacks…`, unknown word exits 1); T345 pass (the goal section survives, `update-state` runs only when the counters differ; live: the first real run wrote the counters, the second wrote nothing); T346 pass (`sync: a header that disagrees…`); T347 pass (`sync versions` ×2); T348 pass (projections, graph and registry stale lines, files kept); T349 pass (`sync docs`, five reference classes); T350 pass (`sync graph`, `sync --dry-run`, `graph-cache` guard; live: a dry run left `git status` byte for byte the same); T351 pass (`sync projections: a failed engine integrity check…`); T352 pass (the pipeline case). Live on this repository: `sync --dry-run` listed one write and changed nothing; `sync` wrote the live-memory counters; the next `sync` printed `[Sync] in sync — nothing to write, nothing to report.` (62 areas' units in sync, 2.3 s). Engine and kernel: `update-engine-meta --check` reports no drift; the kernel is 16263 bytes, below 16384; the rule copy equals it. Repository: `check-prerequisites` reports two warnings, both consequences of this phase's constitution amendment and not defects — `SYNC_GAP` (the plan records constitution 1.23.0) and `CONFIG_DRIFT` (the amended `RULES.md` is uncommitted); `validate-hardlinks.js` passes. Static: `biome check` reports no finding on code written in this phase (the format findings in `finalize.js`, `commands.js`, `clean-cache.js` and `cli-guard.js` are on lines this phase did not touch and are left); `pnpm run audit`: no issue in 59 changed files, no duplication.

### [T-55S01] Spec sync: the TBD closed, the as-built decisions, the supersessions, the registry

- **Spec:** l1-sync-command.md §2, §6; l1-command-surface.md §5.1; l2-engine-automation.md §Command Table, §Components, §Cache Retention; l2-role-cards-governance.md; l2-test-suite.md; l2-spec-graph-memory.md §4.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:**
  - **The concept specification.** In `l1-sync-command.md`, the TBD marker of §2 is replaced by the form A01 built, with its `Assumption (forecast)` and override. §6 records as built the area order, compare-before-write for the three reused writers, the reading of SY-5 for owner-pruned caches, and the retirement of the updater's version bump and history row. The version is patched or bumped minor by the Amendment Rule, with a history row.
  - **Siblings.** These carry what was built: `l1-command-surface.md` (the row as built); `l2-engine-automation.md` (the subcommand, the config reader, the cache inventory if M01 changed it); `l2-role-cards-governance.md` (the mirror); `l2-test-suite.md` (cases, mutation entries, T342 for the repair T-55F01 and T343 onward).
  - **Registry.** The workspace registry's rows and `Last Updated` follow, and `check-prerequisites --verify-headers --workspace=engine` reports no drift.
- **Handoff:** `/magicspec plan engine` revalidates the plan against the new registry and constitution versions.
- **Notes:** A decision that changes a requirement goes through the Amendment Rule of the specification workflow and is not patched in silence.
- **Changes:** `l1-sync-command.md` 1.0.0 → 1.1.0: the TBD of §2 replaced by an `Assumption (forecast)` — the registration is a `sync` section of `workspace.json`, runner-up a file of its own, with its override — the new §5.5 Registration with the entry grammar, and §6 items 7 to 10 (the area order and compare-before-write for the three writers that would otherwise write on every run, the reading of SY-5 for caches their owner prunes, the preview reaching the graph build's extraction cache, the containment check written once, the retirement of the updater's version and history writes); Amendment Rule round trip `Stable → RFC → Stable` after the Post-Update Review (spec-critic: the coherence check against the command surface, session-continuity and reference-containment specifications found no ordering conflict, contradiction, duplicate definition or interaction gap; prompt-engineer: PASS). Siblings, as built: `l1-command-surface.md` 2.2.5 (the row), `l2-engine-automation.md` 1.32.0 (the script and libraries, the folder-write row, the dry-run guard, the updater retired from three lists and one sentence), `l2-test-suite.md` 1.43.0 (coverage, 32 mutation entries, T342 to T352), `l2-role-cards-governance.md` 1.4.8 (the card mirror; the trigger was already in place from the Input Pass task), `l2-engine-diagnostics.md` 1.4.3 (the retired state file). Registry 1.71.0 → 1.72.0 with its rows and `Last Updated`; the global registry 1.43.0 → 1.44.0 with its history row (authored, since no script writes it now). `check-prerequisites --verify-headers` reports no drift, and the shipped `sync registry` reports the registries in sync with the files. No decision here changes a requirement without the Amendment Rule; the one that does (the registration form) went through it.

### [T-55F01] Fix: a task title that names a command no longer decides the handoff line or trips the reserved-command guard

- **Spec:** l1-pipeline-stages.md §5.4 (the handoff line carries the command and argument the `Next Action` records); CONSTITUTION.md §5 (reserved commands)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="a task title that names a command" tests/engine.js` passes, and fails with the repair reverted (`scripts/mutation-check.js`: 3 entries CAUGHT).
- **Handoff:** `/magicspec run engine` starts with T-55C01.
- **Notes:** Implementation defect (feedback note n1), found by this workbook's own finalize: the first open task title, "The constitution through `/magicspec rule`: …", made the handoff line read `Next: /magicspec rule` instead of `/magicspec run engine`. Confirmed cause: `handoffLine` and the reserved-command guard of `computeNextAction` searched the whole `Next Action`, and the `Execute {id} {title} via /magicspec run {ws}` step embeds the raw title. The reported cause was right; the guard was a second site the report did not name (a title naming `/magicspec spec` would have replaced the step with the planning funnel). Specification: none changes (the stated behaviour is restored).
- **Changes:** `scripts/finalize.js`: new `stepOf()` (an `Execute` step without its title, cut at the last ` via /magicspec `), read by `handoffLine` and by the guard in `computeNextAction`. `tests/engine.js`: one case with three title spellings for the handoff line, the guard on a real fixture and a control that a step naming a reserved command is still checked; red before, green after; three mutation entries CAUGHT. `tests/suite.md` 1.9.103: T342. C14 run (engine 3.0.116). biome: no finding on the code written (two format findings at lines 922 and 1056 are inherited); `pnpm run audit`: no issue in the changed files.
