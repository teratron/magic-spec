---
phase: 41
name: "Project-Root & State-Folder Resolvers (Single-Skill Step 1)"
status: Todo
subsystem: ".magic/scripts (utils, executor, finalize, archive-phases, resume-state, check-bloat, lib/, graph scripts, installers), dev/tests"
requires:
  - "The project-root and state-folder resolvers, the notation rule and the delivery order (l2-skill-layout 1.0.0 §5.3, §5.8 step 1) and SP-2, SP-8, SP-9 (l1-skill-packaging 1.0.0): Stable at registry 1.46.0"
  - "The script harness and the mutation-control driver (l2-test-suite 1.30.0): every new assertion is controlled by a mutation that restores the defect"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 41 Tasks — Project-Root & State-Folder Resolvers (Single-Skill Step 1)

**Phase:** 41
**Status:** Todo
**Strategic Goal:** Make every shipped script find the project from the working context and spell the state folder from one definition, with no file moved ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.3 and §5.8 step 1). Five scripts derive the project root from their own depth in the tree and about a dozen read the working directory directly; both break once the engine folder moves or is linked, and the state folder name is spelled out in 22 scripts. This phase is compatible with installed projects and ships as a 2.x release.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-41A01] `utils.js`: the project-root resolver, the state-folder constant and the engine-folder locator
- [ ] [T-41A02] `executor.js`: resolve the root once, hand it to every child, read `workspace.json` from it
- [ ] [T-41B01] `finalize.js` and `archive-phases.js`: root from the resolver, not from depth
- [ ] [T-41B02] `resume-state.js` and `lib/diagnostics.js`: root and sink path from the resolver
- [ ] [T-41B03] `check-bloat.js`: root from the resolver
- [ ] [T-41C01] Graph scripts: `analyze-coverage`, `build-spec-graph`, `detect-communities`, `diff-spec-graph`, `export-wiki`, `serve-spec-graph` use the resolver
- [ ] [T-41C02] Installers and rotators: `install-hooks`, `release-changelog`, `create-workspace`, `init` use the resolver
- [ ] [T-41D01] State-folder constant in `update-state`, `generate-context`, `check-prerequisites`, `extract-rationale`
- [ ] [T-41D02] State-folder constant in `update-engine-meta` and `lib/` (`project-version`, `significance`, `commit-suggester`)
- [ ] [T-41T01] Validation: subdirectory and linked-engine cases over every script class, with mutation controls
- [ ] [T-41T02] Validation: residue scan for the spelled-out state folder, with a mutation control
- [ ] [T-41T03] Validation: harness, mutation list, scans, hardlinks, docs sync; single C14 bump
- [ ] [T-41S01] Spec sync: `l2-engine-automation.md` and `l2-test-suite.md` describe the resolvers and their coverage

## Detailed Tracking

<!-- Optional entry field, created by /magic.run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-41A01] `utils.js`: the project-root resolver, the state-folder constant and the engine-folder locator

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` passes the cases added in T-41T01 for the resolver: `--root` beats `MAGIC_ROOT`, `MAGIC_ROOT` beats the state-folder walk, the state-folder walk beats `.git`, `.git` beats the working directory, and a nonexistent `--root` stops with one line naming the path.
- **Handoff:** every B, C and D task imports these helpers; none starts before this one is Done.
- **Notes:** Add `resolveProjectRoot()` (the four-step order of §5.3), `STATE_DIR_NAME` (the one place the name is spelled) with a `statePath()` helper, and `engineRoot()` (the folder that holds `.version`, found from the calling script's own file). Compare paths by real path so a junction or a symbolic link does not defeat the ancestor walk. `hasEngineWriteTooling` is left alone: its replacement belongs to the maintenance-layout phase. Leave the filesystem helpers' behavior unchanged.

### [T-41A02] `executor.js`: resolve the root once, hand it to every child, read `workspace.json` from it

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** from `<fixture>/a/b`, `node <fixture>/.magic/scripts/executor.js check-prerequisites --json` reports the artifacts of `<fixture>/.design`, and the same command with `--root <fixture>` run from an unrelated directory reports the same result.
- **Handoff:** T-41B*, T-41C*, T-41D* may run in parallel once this and T-41A01 are Done.
- **Notes:** The two reads of `workspace.json` and the workspace directory in the executor use `process.cwd()` today. Resolve the root once, consume `--root` the way `--workspace` is consumed, and export `MAGIC_ROOT` to the child so it does not walk again; each child script still calls the resolver itself so that a direct invocation works.

### [T-41B01] `finalize.js` and `archive-phases.js`: root from the resolver, not from depth

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` stays green for the finalize and archival cases, and the T-41T01 subdirectory case runs `finalize --workflow=spec --dry-run` from `<fixture>/a/b` and prints the fixture's workspace.
- **Handoff:** T-41T01.
- **Notes:** Both compute the root as `path.resolve(__dirname, '..', '..')`. Existing harness cases that spawn them with a different working directory than the fixture root relied on that binding: pass the fixture root as the working directory in those spawns, and do not weaken an assertion to make a case pass.

### [T-41B02] `resume-state.js` and `lib/diagnostics.js`: root and sink path from the resolver

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the T-41T01 case records a finding with `record-diagnostic` from `<fixture>/a/b` and finds it in `<fixture>/.design/.cache/diagnostics.jsonl`, not in `a/b`; `resume-state --all` run from a subdirectory prints the same line as from the root.
- **Handoff:** T-41T01.
- **Notes:** The diagnostics library computes its sink path when the module loads, before any argument is parsed. The resolver it calls there must not throw in a folder that has neither a state folder nor `.git` (the first-install case falls through to the working directory). The sink path is also what `finalize` drains, so B01 and B02 must agree on the root.

### [T-41B03] `check-bloat.js`: root from the resolver

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js check-bloat` run from `dev/` in this repository prints the same advisory as from the repository root.
- **Handoff:** T-41T01.
- **Notes:** The simplest of the five; it also reads the `bloat` override from the workspace configuration, which must come from the resolved root.

### [T-41C01] Graph scripts use the resolver

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `export-wiki` and `build-spec-graph --json` run from `docs/` in this repository write and read the same files as from the root (`git status` shows no new untracked folder under `docs/`).
- **Handoff:** T-41T01.
- **Notes:** `analyze-coverage`, `build-spec-graph`, `detect-communities`, `export-wiki` take `rootDir` from the working directory; `diff-spec-graph` and `serve-spec-graph` resolve relative paths against it. `serve-spec-graph` spawns the executor with `cwd` set: pass the resolved root. Output paths stay exactly where they are now; the graph folder is the next phase.

### [T-41C02] Installers and rotators use the resolver

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** in a throwaway repository, `install-hooks` run from a subdirectory writes `<root>/.git/hooks/pre-commit`, and `release-changelog` run from a subdirectory rotates `<root>/CHANGELOG.md` (T-41T01 cases).
- **Handoff:** T-41T01.
- **Notes:** `install-hooks.js` and `release-changelog.js` take the root from the working directory; `create-workspace.js` and `init.js` create the state tree and must create it at the resolved root, which in a project that has neither the state folder nor `.git` is the working directory. The hook text itself is not changed in this phase.

### [T-41D01] State-folder constant in `update-state`, `generate-context`, `check-prerequisites`, `extract-rationale`

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the T-41T02 residue scan reports no spelled-out state folder in these four files, and their existing harness cases still pass.
- **Handoff:** T-41T02.
- **Notes:** Replace the literal with `STATE_DIR_NAME` or `statePath()`. Keep user-facing messages that print a path unchanged in wording; only the construction of the path changes. A comment or message that names the folder for a human may keep the name when the scan's allow-list says so (decided in T-41T02).

### [T-41D02] State-folder constant in `update-engine-meta` and `lib/`

- **Spec:** l2-skill-layout.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the T-41T02 residue scan reports no spelled-out state folder in `update-engine-meta.js`, `lib/project-version.js`, `lib/significance.js` and `lib/commit-suggester.js`, and the finalization cases still pass.
- **Handoff:** T-41T02.
- **Notes:** `update-engine-meta.js` also joins `__dirname` with `..` for the engine folder and with `../../dev/...` for the maintenance scripts; the first becomes `engineRoot()`, the second is deliberately untouched here (graceful-fallback guard, replaced in the maintenance-layout phase). `lib/commit-suggester.js` belongs to a retired feature; if the scan shows it has no remaining caller, record that in `Notes` for the owner and leave removal to a separate decision.

### [T-41T01] Validation: subdirectory and linked-engine cases over every script class, with mutation controls

- **Goal:** prove SP-2 for the project-root half: the same result from the root and from a subdirectory, and from an engine folder reached through a link.
- **Method:** add harness cases in `dev/tests/engine.js`: (a) one case per script class (executor dispatch, depth-bound five, graph scripts, installers and rotators) run from `<fixture>/a/b`; (b) one case that runs the executor from a fixture whose `.magic` is a directory link to a copy outside the project; (c) the four priority cases of the resolver. Each case must fail on the code as it is before this phase, which is its control; then register the cases in the mutation list and run `node dev/scripts/mutation-check.js` on them.
- **Status:** Todo

### [T-41T02] Validation: residue scan for the spelled-out state folder, with a mutation control

- **Goal:** a standing check that no script outside the definition spells the state folder.
- **Method:** add a harness case that scans `.magic/scripts/` and fails on a quoted `.design` or `.design/` outside `utils.js` and an allow-list of human-facing message strings kept in one table in the case; register a mutation that reinserts a literal and confirm it is caught.
- **Status:** Todo

### [T-41T03] Validation: harness, mutation list, scans, hardlinks, docs sync; single C14 bump

- **Goal:** the phase ends releasable and self-hosting (SP-9).
- **Method:** run `node --test dev/tests/engine.js` in the background and read the `pass`/`fail` counters; run the mutation driver over the new entries; run `node dev/scripts/validate-hardlinks.js`; run the docs sync through `dev/scripts/sync.js --dry-run` first; then one `node .magic/scripts/executor.js update-engine-meta`. Document `--root` and `MAGIC_ROOT` in the user-facing docs that describe the executor.
- **Status:** Todo

### [T-41S01] Spec sync: `l2-engine-automation.md` and `l2-test-suite.md` describe the resolvers and their coverage

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `/magic.spec amend` leaves both files with a `Document History` row and a matching `INDEX.md` version, and `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** Phase 42.
- **Notes:** Done after T-41T03 so the specifications describe the engine that exists. The executor section gains the root resolver and the notation rule; the suite gains the case list of T-41T01 and T-41T02.
