---
phase: 70
name: "The Scripts of the Pipeline on a 4.0 Workspace (4.0 Step 3, Part 1)"
status: Done
subsystem: "skills/magicspec (scripts: mark-built, check-log, check-prerequisites, resume-state, finalize; lib/commands.js), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 68: check-docs, pack and lib/count-tokens.js on the engine's resolvers; locateSet and loadDocSet exported by check-docs"
  - "Phase 79: step 1 at concept 1.5.0 (engine 3.0.179, harness 491)"
  - "Phase 78: the forward gate passed on run 4 under the owner's readings"
  - "The specifications: l1-sdd-document-set 1.5.0, l2-sdd-document-set-engine 1.5.1, l2-engine-finalization 3.10.0, l1-session-continuity 2.6.1, Stable at registry 1.104.1, plan 1.92.0"
provides:
  - "mark-built records a done milestone of a 4.0 workspace (state, map, changes, Was lines), a second run writing nothing"
  - "check-log reports a change whose statuses went back in the history of changes.md"
  - "check-prerequisites, resume-state and finalize take a 4.0 branch (DOC_SET findings; memory/state.md read; the next ready task written), their 3.x paths unchanged"
  - "lib/doc-set-state.js and lib/created-files.js shared; harness 496 (document-set 33); engine 3.0.186; specifications as built at registry 1.104.2"
key_files:
  created:
    - skills/magicspec/scripts/mark-built.js
    - skills/magicspec/scripts/check-log.js
    - skills/magicspec/scripts/lib/doc-set-state.js
    - skills/magicspec/scripts/lib/created-files.js
  modified:
    - skills/magicspec/scripts/check-prerequisites.js
    - skills/magicspec/scripts/resume-state.js
    - skills/magicspec/scripts/finalize.js
    - skills/magicspec/scripts/check-docs.js
    - skills/magicspec/scripts/pack.js
    - skills/magicspec/scripts/lib/git-utils.js
    - skills/magicspec/scripts/lib/commands.js
    - tests/engine/document-set.js
patterns_established:
  - "A 4.0 branch is taken once, by the shared format test, beside an unchanged 3.x path that is compared byte for byte before and after the change"
duration_minutes: 25
---

# Stage 70 Tasks — The Scripts of the Pipeline on a 4.0 Workspace (4.0 Step 3, Part 1)

**Phase:** 70
**Status:** Done
**Strategic Goal:** The subcommands the pipeline bodies will call work on a 4.0 workspace before any body calls them: `mark-built` records a done milestone and `check-log` checks the order of a change history, and `check-prerequisites`, `resume-state` and `finalize` take a 4.0 branch beside their 3.x one; on a 3.x workspace every one of them reads and writes exactly what it does today.

**Shared names (fixed here so no two tasks choose different spellings):**

- The 4.0 test: a workspace is 4.0 when its entry in `workspace.json` carries `"format": "4"` — `locateSet()` of `check-docs.js`, the one predicate every script of this phase uses. A 3.x workspace takes the 3.x path unchanged.
- `mark-built {milestone} [--workspace]`. For the milestone: (1) `memory/state.md` gains `- Done: M{n} — {its Works after it}` after the last `Done` line, once (a second run adds nothing); (2) each task of the milestone whose component has no row in `memory/map.md` gives one row `| map:{key} | {path} | {files} | {provides} |` from its Creates, and every row of a component the milestone closes, extends or revises gets its Provides rewritten — `{address}` at revision 1, `{address}@{n}` at revision n, a withdrawn unit left out; (3) every change it builds goes `placed` → `built` in `changes.md`; (4) every `- Was (rev {n}):` line of a unit now built at its revision is removed. It prints one line: `{milestone} built: map {k} rows, {c} changes built, {w} Was lines removed`. A milestone not in `plan.md` is an error, exit 1, nothing written.
- `check-log [--workspace]` reads the history of `changes.md` from git (`git log --follow -p`), and for each change address reports a status that came before one it should follow (`open` → `placed` → `built`, or `satisfied`, which no other status follows): `changes.md: C{n} was {later} before {earlier}`; exit 1 on a finding, 0 with the line `check-log: {k} changes, no status out of order`. Without git or without a history it prints one line and exits 0.
- The finding type `DOC_SET`: on a 4.0 workspace `check-prerequisites` runs the checker and reports each finding as `{ "type": "DOC_SET", "message": "{the finding}", "fix": "/magicspec spec {workspace}" }`; the registry findings (`SPEC_STATUS`, `ORPHANED_SPEC`, `SYNC_GAP`, header parity) are not computed there.
- The next ready task (concept §5.4): the first task, in file order, of the highest priority whose own address is not `Done` in `memory/state.md` and every task it is After is; `finalize` on a 4.0 workspace writes it as `- Next: {address}` (replacing the `Next` line, or adding one), and `- Next: none` when no task is ready. `Now`, `Done` and `Open` lines are left as they are; `STATE.md` is not written.
- The resume line on a 4.0 workspace: `▶ Resume [{workspace}]: Now {address} · Next {address} · Open {n}` — printed only when `Now` or `Open` holds something, silence otherwise.
- The harness module: `tests/engine/document-set.js`, case names beginning `document set:`.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-70M01] `mark-built` records a done milestone
- [x] [T-70M02] `check-log` checks the order of a change history
- [x] [T-70A01] `check-prerequisites` reports the checker's findings on a 4.0 workspace
- [x] [T-70A02] `resume-state` reads `memory/state.md` on a 4.0 workspace
- [x] [T-70A03] `finalize` writes the next ready task into `memory/state.md` on a 4.0 workspace
- [x] [T-70H01] Harness cases for `mark-built` and `check-log`
- [x] [T-70H02] Harness cases for the three 4.0 branches and their 3.x paths
- [x] [T-70S01] The specifications as built
- [x] [T-70T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-70M01] `mark-built` records a done milestone

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`mark-built`); l1-sdd-document-set.md §5.7 (memory, the map's revisions), §5.8 step 3 (built, `Was` removed)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/scripts/mark-built.js` exists, starts with `// @ts-check`, is registered in `lib/commands.js` (help line, `--workspace`), and on a disposable copy of the `good` fixture `mark-built M2` writes the `Done` line, the `map:hello` Provides and the counts line of the shared names, and a second run changes no byte (tree hash); on a 3.x workspace it prints the not-a-set line of `check-docs` and exits 0; an unknown milestone exits 1 and writes nothing; biome, `pnpm run typecheck` and fallow report nothing on the file; `update-engine-meta` run after the edit
- **Handoff:** T-70H01 pins it.
- **Notes:** Ported from the documentation lab's `tools/mark-built.js` onto `loadDocSet` and the engine's resolvers, as `check-docs` and `pack` were; the lab's outcome argument is replaced by the milestone's `Works after it`, and map rows are created from Creates where the lab only rewrote existing ones (concept §5.7: a task's Creates becomes the map entry). Reuses `fileNamesIn`/`mapFiles` of `pack.js` by moving them to a shared module if fallow reports a duplicate.
- **Changes:** skills/magicspec/scripts/mark-built.js (registered in lib/commands.js) records a milestone: the Done line with its Works after it, a map row per component it builds that has none (cells in the header's order, from the Creates of its tasks, test files left out of the API), Provides rewritten at each unit's revision, changes placed -> built, Was lines of units built at their revision removed; the file-name reader moved from pack.js to lib/created-files.js; check-docs exports revisionOf and parses Works after it. Verified on disposable good: Done line and map:hello row written, a second run byte-identical (tree hash), M9 exits 1 writing nothing, a revised unit gives hello.1@2 with its change built and its Was line removed, a 3.x workspace prints the not-a-set line; biome, typecheck, fallow dead-code clean; audit: no introduced issue (one inherited: validateEntry complexity in lib/commands.js); 52 related cases pass; engine 3.0.180

### [T-70M02] `check-log` checks the order of a change history

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`check-log`); l1-sdd-document-set.md §5.8 (the statuses)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/scripts/check-log.js` exists, starts with `// @ts-check`, is registered in `lib/commands.js`; in a disposable git repository holding a 4.0 set, a history of `changes.md` that goes `open`, `placed`, `built` gives the clean line and exit 0, one that goes `built` then `placed` gives the finding of the shared names and exit 1; without git it prints one line and exits 0; git is called by argument list, never through a shell string; biome, typecheck and fallow report nothing; `update-engine-meta` run after the edit
- **Handoff:** T-70H01 pins it.
- **Notes:** Not the lab's tool of the same name (PLAN.md Phase 70, planning-surfaced 3): it reads the history, it does not append to a log.
- **Changes:** skills/magicspec/scripts/check-log.js (registered) reads every committed version of changes.md oldest first plus the file as it stands, and reports a change whose statuses went back (open, placed, built; satisfied ends it); lib/git-utils.js gains fileVersions (git by argument list, no shell). Verified in a disposable git repository: no history prints one line and exits 0, open-placed-built gives the clean line and exit 0, built then placed gives 'changes.md: C1 was built before placed' and exit 1; biome, typecheck, fallow dead-code clean; audit no introduced issue; engine 3.0.181

### [T-70A01] `check-prerequisites` reports the checker's findings on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (existing subcommands adapt: `check-prerequisites`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a disposable 4.0 project holding `bad`, `check-prerequisites --json --workspace=docs` lists its findings as `DOC_SET` warnings (as many as `golden.json` records) and no `SYNC_GAP`, `ORPHANED_SPEC` or header-parity entry; on `good` it lists none; on this repository's 3.x workspace its JSON output is byte-identical to before the change (saved before, compared after); biome, typecheck and fallow report nothing; `update-engine-meta` run after the edit
- **Handoff:** T-70A03 (finalize reads it); T-70H02 pins it.
- **Notes:** The branch is taken once, where the workspace is resolved; the registry readers are not called on a 4.0 workspace.
- **Changes:** check-prerequisites gains a 4.0 branch before its verdict: on a workspace with format 4 it drops the registry, plan and ledger requirements and the registry finding types, and reports each checker finding as a DOC_SET warning (fix /magicspec spec {ws}) with a doc_set summary in the JSON. Verified: bad gives 3 DOC_SET warnings (golden 3) and no registry type, good none; this repository's 3.x JSON and text output byte-identical before and after for four flag sets; typecheck, fallow dead-code clean, audit no introduced issue; pre-flight cases pass; engine 3.0.183

### [T-70A02] `resume-state` reads `memory/state.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`resume-state`); l1-session-continuity.md SC-9 (resume from recorded state)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a disposable 4.0 project whose `memory/state.md` has a `Now` line, `resume-state --all` prints the resume line of the shared names; with neither `Now` nor `Open` it prints nothing; on this repository's 3.x workspace its output is unchanged; biome, typecheck and fallow report nothing; `update-engine-meta` run after the edit
- **Handoff:** T-70H02 pins it.
- **Notes:** `--all` reads every registered workspace and takes the branch per workspace.
- **Changes:** resume-state gains a 4.0 branch: a workspace with format 4 is read from memory/state.md and gives '▶ Resume [{ws}]: Now {a} · Next {a} · Open {n}' when Now or Open holds something, silence otherwise. Verified on disposable good: the line with Now M2.T1, silence without Now or Open; this repository's 3.x output unchanged apart from the count of modified files (the edited script itself); typecheck, fallow, audit clean; resume cases pass; engine 3.0.184

### [T-70A03] `finalize` writes the next ready task into `memory/state.md` on a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`finalize` updates `memory/state.md`; `changes.md` written by the workflows only); l1-sdd-document-set.md §5.4 (the next ready task); l2-engine-finalization.md §5.1 (the state update step)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** on a disposable 4.0 project holding `good` (task M2.T1, not done), `finalize --workflow=run --workspace=docs` writes `- Next: M2.T1` into `memory/state.md`, writes no `STATE.md`, archives nothing and leaves `changes.md` untouched; with `- Done: M2.T1 — …` in the state it writes `- Next: none`; its `Next step` names `/magicspec run docs` while a task is ready; on this repository's 3.x workspace a `finalize` dry comparison (the state, the archive and the changelog it would write) is unchanged; biome, typecheck and fallow report nothing; `update-engine-meta` run after the edit
- **Handoff:** T-70H02 pins it.
- **Notes:** The version bump and the root changelog step are the same on both formats; the steps that read `PLAN.md`, `TASKS.md` or the phase workbooks (archival, the ledger's next step) do not run on a 4.0 workspace. `finalize.js` is 1,364 lines: the branch is one function called at the state step, not edits spread through the file. Serialize after T-70A01 (finalize calls check-prerequisites).
- **Changes:** finalize gains a 4.0 branch: on a workspace with format 4 the state step writes the next ready task (lib/doc-set-state.js: not done, every After done, highest priority, file order) as the Next line of memory/state.md, archives nothing, writes no STATE.md, prints the memory/state.md row and names /magicspec run {ws} (or /magicspec task {ws} when no task is ready); resume-state shares the format test from the same module. Verified on disposable good: Next M2.T1 then Next none; this repository's 3.x dry run unchanged apart from the changed-file counts; typecheck clean; audit exit 0 — main of finalize.js lower in cyclomatic (31 to 30, archival choice moved to archivePhases), the line counts of main and classifyPlanState grew only by biome's reformatting of a file that had drifted from it (expand always); 95 finalize, resume and state cases pass; engine 3.0.186

### [T-70H01] Harness cases for `mark-built` and `check-log`

- **Spec:** l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with new cases — `mark-built` writes the state, map and changes of a set holding a revised unit with a `Was` line and a placed change, and a second run writes nothing; an unknown milestone writes nothing; `check-log` passes an ordered history and reports one out of order, in a disposable git repository; each fails with its behaviour reverted (`scripts/mutation-check.js` CAUGHT)
- **Handoff:** T-70T01.
- **Notes:** A set with `changes.md`, a revised unit and a `Was` line is built in the case from `good`, not added as a fifth fixture, unless the case grows past one screen.
- **Changes:** Cases 'mark-built records a milestone, revisions and changes, and a second run writes nothing' (Done line, map:hello at hello.1@2, change built, Was line removed, byte-identical second run, unknown milestone exits 1 writing nothing) and 'check-log passes a change history in order and reports one that goes back' (no history, ordered, built before placed; disposable git repository) in tests/engine/document-set.js; mutation control CAUGHT 4/4 (Done line, Was lines, map row, status order)

### [T-70H02] Harness cases for the three 4.0 branches and their 3.x paths

- **Spec:** l2-sdd-document-set-engine.md §5.2; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** new cases pass — `check-prerequisites` gives `DOC_SET` warnings on `bad` and none on `good`; `resume-state` prints the resume line and is silent without `Now` or `Open`; `finalize` writes `- Next: M2.T1`, then `- Next: none`, and no `STATE.md`; the existing 3.x cases of the three subcommands pass unchanged; each new case fails with its branch reverted (mutation control CAUGHT)
- **Handoff:** T-70T01.
- **Notes:** Disposable projects only; the 3.x path is pinned by the existing cases, which must not be edited to pass.
- **Changes:** Cases for the three 4.0 branches: check-prerequisites gives DOC_SET warnings equal to golden.json for bad and good with no registry type even beside a leftover INDEX.md with a Draft row; resume-state prints the memory line and is silent with nothing in flight; finalize writes Next M2.T1, then Next none, prints the memory/state.md row and no STATE.md; the existing 3.x cases of the three subcommands pass unedited (109 finalize, resume, state cases); 33 document-set cases pass; mutation control CAUGHT 4/4 (registry kept, findings not reported, resume and finalize branches removed)

### [T-70S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md 1.5.1 (§5.2, §6 items 2 and 3); l2-engine-finalization.md 3.10.0 (§5.1); l1-session-continuity.md 2.6.1 (SC-1, SC-9); l2-test-suite.md (the `document-set` module)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-sdd-document-set-engine.md` records the phase as built, the shared names' forms of `mark-built`, `check-log` and the three branches, and its §6 item 3 marker removed with the question settled as the concept states (whole files in Done before this task); `l2-engine-finalization.md` and `l1-session-continuity.md` state the 4.0 branch the concept's §6 declares (the state of a 4.0 workspace is `memory/state.md`), the 3.x contract unchanged; `l2-test-suite.md` counts the module's cases; each a patch with Stable retained and no requirement changed; `check-prerequisites --verify-headers` reports no drift; `export-wiki` run
- **Handoff:** T-70T01.
- **Notes:** As-built patches of a declared supersession, not new requirements. A specification that lists the executor's subcommands (for example `l2-engine-automation.md`) gains `mark-built` and `check-log` in the same pass if it lists `check-docs` and `pack`.
- **Changes:** l2-sdd-document-set-engine 1.5.2 (the built forms of mark-built, check-log and the three branches; section 6 item 3 settled as whole files, its TBD marker removed), l2-engine-finalization 3.10.1 and l1-session-continuity 2.6.2 (the 4.0 branch of the state their concept declares, 3.x unchanged), l2-engine-automation 1.33.1 (four new components), l2-test-suite 1.48.12 (33 cases), all patches with Stable retained; registry 1.104.2; verify-headers: no drift (the expected SYNC_GAP only); export-wiki run

### [T-70T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §2 (layer boundary, C14); the repository's static checks
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `*.js` file, `pnpm run typecheck`, `pnpm exec fallow dead-code` and `pnpm run audit` report nothing on code of this phase; `node --test tests/engine.js` passes in full (count recorded in `Changes`); `update-engine-meta --check` passes after the last C14 run; `check-prerequisites`, `resume-state --all` and `finalize` on this repository's own 3.x workspace behave as before (the workflow's own finalize at the end of the run is the evidence)
- **Handoff:** Phase 80 is decomposed when this phase is Done.
- **Notes:** The full harness runs in the background; read its `ℹ pass` / `ℹ fail` counters.
- **Changes:** biome clean on the twelve changed js files; typecheck clean; fallow dead-code no issues; pnpm run audit exit 0 (no introduced issue; the inherited complexity of validateEntry and of finalize's main, emitSuccess and classifyPlanState reported, their line counts grown only by biome's reformatting of the drifted finalize.js); full harness 496 pass, 0 fail (290 s); update-engine-meta --check passes at 3.0.186
