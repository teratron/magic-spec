---
phase: 46
name: "State Folder Rename, Migration, Archive & 3.0.0 (Single-Skill Step 5)"
status: Done
subsystem: "skills/magicspec, scripts, tests, .design (renamed), docs, README, CHANGELOG"
requires:
  - "Phase 45: the maintenance layout and the predicate in their final form; harness 227"
  - "The state folder rename, the migration, the archive and the packaging invariants (l2-skill-distribution 1.4.0 §5.5-§5.7; l2-skill-layout 1.5.0 §5.8 step 5; l1-skill-packaging 1.0.0 SP-1 to SP-10): Stable at registry 1.56.0"
provides:
  - "The state folder is .magicspec (one constant; the earlier name spelled once, as LEGACY_STATE_DIR_NAME); this repository's own workspace was renamed with 33 specifications swept and the constitution at 1.17.0"
  - "migrate: a resumable subcommand of the shipped folder that takes a 2.x project to the skill layout (dry run by default; backup, projections and hook, rename, removal last, verify); the executor stops every other command on an unmigrated project and names one path"
  - "scripts/archive-composition.js: one composition for the release archive, used by the builder and by the smoke check in the workflow"
  - "Engine 3.0.0 (manifest of 80 files), the 3.0.0 changelog entry, docs/migration.md; harness 236; SP-1 to SP-10 walked on the built composition"
key_files:
  created:
    - "skills/magicspec/scripts/migrate.js"
    - "scripts/archive-composition.js"
    - "docs/migration.md"
  modified:
    - "skills/magicspec/scripts/utils.js, executor.js; .github/workflows/release.yml; tests/engine.js; the whole workspace folder"
patterns_established:
  - "A guard that must stop everything but one command lists the exceptions in one set and tests that the set is not widened"
  - "A migration reads the filesystem, never a log: every step is idempotent and resumption needs no state of its own"
  - "The composition of a release is one function; the builder and the check share it, and a case plants strays to prove the check can fail"
  - "A fixture of a retired layout is generated in the harness and spells the old names, and the residue search names those places as its only exemptions"
duration_minutes: 300
---

# Stage 46 Tasks — State Folder Rename, Migration, Archive & 3.0.0 (Single-Skill Step 5)

**Phase:** 46
**Status:** Done
**Strategic Goal:** Finish the restructuring ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.8 step 5; [l2-skill-distribution.md](../specifications/l2-skill-distribution.md) §5.5-§5.7): the state folder is `.magicspec/`, a resumable `migrate` subcommand takes a 2.x project to the new layout without leaving it with neither engine, the release archive has one composition with a smoke check, and the version file reads 3.0.0 for the single release of Phases 41 to 46. The tag and the publication are the owner's act; nothing is pushed or tagged here.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-46A01] The state folder constant and every shipped and maintenance text behind a residue search
- [x] [T-46A02] This repository's own workspace renamed, its documents and specifications swept
- [x] [T-46B01] `migrate`: detect, plan, back up, project, rename, remove, verify; resumable; the both-folders stop
- [x] [T-46B02] Fixtures of every supported 2.x layout and the migration cases under mutation control
- [x] [T-46C01] The release archive: one composition, one smoke check
- [x] [T-46C02] Documentation: migration guide, README and CONTRIBUTING
- [x] [T-46D01] The version file at 3.0.0 and the release notes
- [x] [T-46E01] SP-1 to SP-10 verified end to end on the built archive
- [x] [T-46T01] Validation: harness, mutation lists, links, residue search
- [x] [T-46S01] Spec sync: the decisions taken in this phase

## Detailed Tracking

### [T-46A01] The state folder constant and every shipped and maintenance text behind a residue search

- **Spec:** l2-skill-distribution.md §5.7; l2-skill-layout.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `STATE_DIR_NAME` in `utils.js` is `.magicspec`; a residue search for `\.design` over `skills/`, `scripts/`, `tests/`, `docs/`, the guide, `README.md`, CI and the ignore files finds the old name only in the migration's own detection code, the harness fixtures of the 2.x layouts and history (CHANGELOG, archived workbooks, specification history rows).
- **Handoff:** T-46A02, T-46B01.
- **Notes:** one scripted pass, the method of the earlier steps; the migration module and its fixtures use the old name through one named constant so the residue search can exempt exactly those. An engine that finds both folders stops with one recommended path (finish or revert the migration) instead of choosing: the check lives in the resolver.
- **Changes:** STATE_DIR_NAME is .magicspec; one scripted pass moved the name in the skill folders, the maintenance scripts, the harness (360 places), documentation, the guide, the constitution and its template, CI and the ignore files; SP-8's scan and the one stale-env case now look for the new literal. The residue search finds the old name only in history rows, the changelogs, archived workbooks and the cache of a finished run.

### [T-46A02] This repository's own workspace renamed, its documents and specifications swept

- **Spec:** l2-skill-distribution.md §5.7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.design/` no longer exists and `.magicspec/` holds the workspace; `check-prerequisites --verify-headers` reports `ok: true`; every specification that named the folder carries a patch bump, a history row and a matching registry version (history rows themselves are not rewritten); `.gitignore` and CI name the new graph path.
- **Handoff:** T-46T01.
- **Notes:** the repository builds itself, so this is done in one step with the constant: sweep, rename the folder, then run the engine from the new place. Documents of the workspace that record history (the changelog, the retrospective, archived workbooks) keep the old name where they describe the past.
- **Changes:** The workspace was copied aside, then swept and renamed in one step: .design/ is .magicspec/, 33 specifications got a patch bump and a history row (history untouched), the constitution is 1.17.0 (user-stated, admission recorded), the registry is 1.57.0 and the engine ran from the renamed folder immediately (2.1.151, harness 227).

### [T-46B01] `migrate`: detect, plan, back up, project, rename, remove, verify; resumable; the both-folders stop

- **Spec:** l2-skill-distribution.md §5.6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `executor.js migrate` in a 2.x fixture prints the plan and changes nothing; `--apply` backs up, installs the projections, renames the state folder, removes only the files the old manifest names and verifies; run twice it is a no-op; interrupted after any step it resumes from the filesystem; modified old engine files are reported `ENGINE_FILE_MODIFIED` and kept; a project with both state folders is stopped with one recommended path; a layout older than 2.x names the last release that migrates it.
- **Handoff:** T-46B02.
- **Notes:** a subcommand of the shipped folder (it is user-reachable), reading the filesystem and never a log. The plan is the single consent point; the agent presents it once with the dry-run result. The old name of the state folder and of the old engine folders is a named constant in the module.
- **Changes:** skills/magicspec/scripts/migrate.js: detect (engine, state, wrappers by name under the root folders and the host folders, hosts found), plan (the dry run is the default), classify against the old manifest (a changed file is kept and reported), back up into a dated folder, install the projections and the hook, rename the state folder and rewrite the workspace.json entries that name it, remove the old engine last, verify with the pre-flight; a step that fails says which. The executor stops every other command on a project that still has the earlier state folder and names one path when both exist; the earlier name is the single constant LEGACY_STATE_DIR_NAME.

### [T-46B02] Fixtures of every supported 2.x layout and the migration cases under mutation control

- **Spec:** l2-test-suite.md; l2-skill-distribution.md §5.6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** fixture builders for the 2.x layouts (engine only; engine with `workflows/`, `skills/magic-*` and `rules/magic.md`; host links; a hook of the old shape; a modified old file; a half-migrated project; both folders; a pre-2.x layout) and one case per property above; a mutation list over the migration steps reports every entry CAUGHT.
- **Handoff:** T-46E01.
- **Notes:** the fixtures are generated in the harness, not shipped; they copy nothing from the repository's own old tree (it is gone).
- **Changes:** Seven cases against a generated 2.x fixture (manifest, wrappers, host copies, own files beside them, state with entries naming the old folder): the dry run, the apply with idempotence, a changed old file, resumption from two half-done states, both state folders, the guard on an unmigrated project (and design assets that are not a state folder), and the refused older layout, unknown host and missing manifest. 19 mutation entries, all CAUGHT; one survivor found a redundant branch, which was removed instead of pinned.

### [T-46C01] The release archive: one composition, one smoke check

- **Spec:** l2-skill-distribution.md §5.5; l2-release-pipeline.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `scripts/archive-composition.js` lists exactly the files of `skills/magicspec`, `README.md`, `LICENSE`; the release workflow builds from it and a smoke step fails when any path lies outside the set; a harness case plants a stray path and sees the smoke fail.
- **Handoff:** T-46E01.
- **Notes:** the composition is one function used by the builder and the smoke check so they cannot disagree. The archive keeps the prefix `magic-spec-v{version}/`; the tag trigger, the retry loop and the idempotent publication are unchanged.
- **Changes:** scripts/archive-composition.js: list (the files the workflow zips) and check (the finished archive against the same rule, plus the required files); release.yml builds from the list and runs the check; a case plants strays (a workspace, a script, the harness, the manifest, the maintenance skill, a foreign prefix) and a missing required file, and pins the two workflow lines; 4 mutation entries CAUGHT.

### [T-46C02] Documentation: migration guide, README and CONTRIBUTING

- **Spec:** l2-skill-distribution.md §5.6; l1-documentation-system.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `docs/migration.md` states what the migration does, how to run the dry run and `--apply`, what is kept and how to resume; the README's update section points to it; `sync-docs` leaves `docs/` and CONTRIBUTING consistent.
- **Handoff:** T-46D01.
- **Notes:** no horizontal rules in Markdown.
- **Changes:** docs/migration.md (what changes, the steps, what --apply does in order, interruption and re-running, what is not supported, after the migration); the README gains a pointer in its updating section and a documentation row.

### [T-46D01] The version file at 3.0.0 and the release notes

- **Spec:** l2-skill-layout.md §5.8
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/.version` reads 3.0.0, the manifest is regenerated, the Engine Version snapshot and the README anchor read 3.0.0; the root CHANGELOG holds a `[3.0.0]` entry for Phases 41 to 46 (rotated from `[Unreleased]`); `update-engine-meta --check` is quiet.
- **Handoff:** T-46T01.
- **Notes:** the version file is set by hand (the patch step of the engine-meta update cannot make a major) and the manifest rebuilt by the builder. Tagging and publishing are not done here.
- **Changes:** skills/magicspec/.version reads 3.0.0, the manifest is rebuilt (80 files), the Engine Version snapshot and the README anchor read 3.0.0, the root CHANGELOG rotated [Unreleased] into [3.0.0] - 2026-10-28 with the release narrative (Breaking, Added, Fixed, Removed, Notes); update-engine-meta --check is quiet. Nothing is tagged or pushed.

### [T-46E01] SP-1 to SP-10 verified end to end on the built archive

- **Spec:** l1-skill-packaging.md SP-1 to SP-10
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a harness case builds the archive composition into a folder, installs it into a throwaway project (copy, `init --host`), runs the pre-flight, updates it with a second copy, removes it, and migrates a 2.x fixture with it; each of the ten invariants has a named assertion in that case or a case it points to.
- **Handoff:** T-46T01.
- **Notes:** SP-1 one folder, SP-2 any working directory, SP-3 any host, SP-4 identical wording, SP-5 every surface resolves, SP-6 markers, SP-7 the predicate, SP-8 an update touches no state, SP-9 each step ships working, SP-10 migration never leaves the project with neither engine.
- **Changes:** One case builds the composition into a folder and walks the ten invariants on it: SP-1 the copy is complete, SP-9 it verifies against its own manifest, SP-3 and SP-4 every host is projected with the same rule bytes, SP-5 every router row and command entry resolves, SP-6 every generated file is marked and removal leaves state alone, SP-2 a subdirectory and a link give the same project, SP-7 the write branch is refused in an installation, SP-8 an update leaves state as it was, SP-10 a 2.x project is migrated with the archived folder and has an engine at every moment.

### [T-46T01] Validation: harness, mutation lists, links, residue search

- **Goal:** the restructuring is complete and nothing names the earlier layout or the earlier state folder.
- **Method:** the full harness; the mutation lists; `node scripts/validate-hardlinks.js`; the integrity check from the root, a subdirectory and through the link; residue searches for `.design`, `.magic/`, `dev/` and the dotted names outside history and the migration's own constants; `finalize` and `export-wiki` from the new place.
- **Status:** Done
- **Changes:** Harness 236 of 236; mutation lists re-run against the renamed folder and the new paths: the lists of the earlier steps plus the migration and archive lists, every entry CAUGHT (four after their needles were re-pointed at the renamed folder, one meaningless entry dropped); validate-hardlinks passes (two link rows, the AGENTS family); the integrity check is quiet from the root, from skills/ and through .agents/skills/magicspec; a residue search for the earlier state folder, engine folder, maintenance folder and dotted names finds them only in the migration guide, the migration module and its fixtures, the three specifications that describe the move, history rows, the changelogs and archived workbooks.

### [T-46S01] Spec sync: the decisions taken in this phase

- **Spec:** l2-skill-distribution.md; l2-skill-layout.md; l2-release-pipeline.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the specifications describe the engine as built; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** the owner: tag and publish 3.0.0.
- **Notes:** record only what execution decided and the specifications do not yet say.
- **Changes:** l2-skill-distribution 1.5.0, l2-skill-layout 1.6.0, l2-release-pipeline 2.2.0, l2-test-suite 1.36.0 record the migration, the guard, the composition and the version as built; registry 1.58.0, header parity ok.
