---
phase: 35
name: "Nothing-Pending Next Action (SC-2.4 addendum)"
status: Done
subsystem: ".magic/scripts (lib, check-prerequisites, finalize), .magic/status.md, docs, dev/tests"
requires:
  - "check-prerequisites.js ORPHANED_SPEC, SYNC_GAP and DESIGN_DEBT_PENDING (Phases 19-22): the three signals that define pending work"
  - "finalize.js computeNextAction() with the single-exit screen (Phases 10, 15, 23): the value this phase changes"
  - "lib/scan-hygiene.js stripQuoted (Phase 17): both predicates read Markdown through the one shared strip"
provides:
  - "lib/pending-work.js: findPendingWork(designDir) — the one predicate for orphaned specs, a registry ahead of the plan, a complete plan and its open Backlog items, with registryEvaluated/backlogEvaluated flags; a missing input is not applicable, an unreadable one throws"
  - "check-prerequisites.js takes ORPHANED_SPEC, SYNC_GAP and DESIGN_DEBT_PENDING from that predicate; warnings byte-identical over four fixtures"
  - "finalize.js: plan-complete Next Action is 'Plan complete — nothing pending' (no command) only when both checks ran and came back empty; any pending signal, missing input or error keeps the /magic.task funnel, the error path recording PENDING_WORK_UNEVALUABLE"
  - "status.md and docs/status.md render the command-free statement instead of a recommendation"
  - "dev/tests/engine.js 140 -> 141 (seven sub-cases, six mutation controls) and dev/tests/suite.md T231 (1.9.83); engine 2.1.111 -> 2.1.112"
key_files:
  created:
    - ".magic/scripts/lib/pending-work.js"
  modified:
    - ".magic/scripts/check-prerequisites.js"
    - ".magic/scripts/finalize.js"
    - ".magic/status.md"
    - "docs/status.md"
    - "dev/tests/engine.js"
    - "dev/tests/suite.md"
patterns_established:
  - "A signal a gate raises and a line a workflow prints must come from one predicate, never two copies; the predicate returns evaluated-flags so a caller can refuse to conclude an empty result from a check that never ran."
  - "A refactor of a script every workflow runs is gated by a differential over fixtures, captured before the edit and compared after both the edit and the checksum bump."
duration_minutes: ~
---

# Stage 35 Tasks — Nothing-Pending Next Action (SC-2.4 addendum)

**Phase:** 35
**Status:** Done
**Strategic Goal:** Implement the Nothing-Pending Resolution of [l1-session-continuity.md](../specifications/l1-session-continuity.md) 2.4.0 (via [l2-engine-finalization.md](../specifications/l2-engine-finalization.md) 3.4.0 and [l2-status-command.md](../specifications/l2-status-command.md) 1.3.0): when the plan is complete and nothing is pending, the persisted and printed `Next Action` says so and names no command, so the engine stops inviting a `/magic.task` run that can only report no changes. *Pending* is decided by one predicate shared with Pre-flight, never a second copy, and an evaluation failure resolves to the funnel.

## Atomic Checklist

- [x] [T-35A01] `lib/pending-work.js`: the one pending-work predicate
- [x] [T-35A02] `check-prerequisites.js`: consume the predicate; warnings unchanged
- [x] [T-35A03] `finalize.js`: command-free plan-complete value when nothing is pending
- [x] [T-35B01] `status.md`: render the nothing-pending statement, never invent a command
- [x] [T-35B02] `docs/status.md`: the Direction goal follows
- [x] [T-35T01] Validation: harness cases for the two branches, the Parked control and the failure path
- [x] [T-35T02] Validation: cognitive scenario T231 for the briefing
- [x] [T-35T03] Validation: harness, leak scan, tracked-files invariant; single C14 bump

## Detailed Tracking

### [T-35A01] `lib/pending-work.js`: the one pending-work predicate

- **Spec:** l1-session-continuity.md Nothing-Pending Resolution; l2-engine-finalization.md §5 (`Next Action`)
- **Status:** Done
- **Changes:** New lib/pending-work.js: findPendingWork(designDir) returns orphanedSpecs, syncGap, planComplete, openBacklogItems plus registryEvaluated/backlogEvaluated flags, built from the logic check-prerequisites holds inline (strip-before-match, filename grammar, Based-on vs Version, three-way plan-complete read, Parked exclusion); a missing input is not applicable, an unreadable one throws. Also exports SPEC_FILENAME_SRC. Loads with no side effects and no dev/ import; on this repo it reports planComplete false only because the phase is active, so the backlog count is checked in the harness fixtures.
- **Assignment:** Agent
- **Verify:** A new `.magic/scripts/lib/pending-work.js` exports `findPendingWork(designDir)` returning `{ orphanedSpecs, syncGap, openBacklogItems, planComplete }`, computed with exactly the logic `check-prerequisites.js` holds inline today: the filename grammar and the strip-before-match read (SH-1/SH-4) for `orphanedSpecs` (registered in `INDEX.md`, absent from `PLAN.md`); the `Based on` versus `Version` comparison for `syncGap` (`null` when equal or when either header is absent); the three-way positive recognition of a complete plan (marker, all-terminal rows, vacant section) for `planComplete`; and the top-level-bullet count excluding the trailing `*(Parked` marker for `openBacklogItems`. It throws — never returns a partial value — when a file it needs is unreadable. It has no side effect at require time and no import from `dev/`. `node -e "const m=require('./.magic/scripts/lib/pending-work.js'); console.log(JSON.stringify(m.findPendingWork('.design/engine')))"` prints the object with `openBacklogItems` an array of length 0 on this repository (its Backlog is fully parked) and `planComplete: true`.
- **Handoff:** T-35A02 makes `check-prerequisites.js` its second caller; T-35A03 its first new one.
- **Notes:** The point of a module is that Pre-flight and the next-step line can never disagree about what *pending* means — the exact two-copies-drift class the shared strip helper was extracted to end. Move `SPEC_FILENAME_SRC` with the logic if `check-prerequisites.js` is its only definition (verified: it is defined only there, line 21). Layer: `.magic/scripts/lib/` is L1; the module must load on a user install with no `dev/`.

### [T-35A02] `check-prerequisites.js`: consume the predicate; warnings unchanged

- **Spec:** l1-session-continuity.md Nothing-Pending Resolution (same predicate); l2-engine-automation.md §DESIGN_DEBT_PENDING
- **Status:** Done
- **Changes:** check-prerequisites.js now takes ORPHANED_SPEC, SYNC_GAP and DESIGN_DEBT_PENDING from one findPendingWork() call and imports the filename grammar from the module (27 insertions, 96 deletions); the inline Parked exclusion and plan-complete recognition are gone. Differential over four fixtures (orphan, sync gap plus debt with a Parked control, a mixed one keeping the interleaved ghost/naming/orphan order): warnings identical; repo fixture differs only by ENGINE_INTEGRITY from the edited engine files, rechecked after C14. Harness 140/140.
- **Assignment:** Agent
- **Verify:** `check-prerequisites.js` obtains `ORPHANED_SPEC`, `SYNC_GAP` and `DESIGN_DEBT_PENDING` from `findPendingWork()` and emits the same warning `type`, `message` and `fix` strings as before, at the same point in its sequence — the orphan warning still follows the ghost and naming warnings of the same spec inside the per-spec loop, so the warnings array keeps its order. The inline copies of the Parked exclusion and of the plan-complete recognition are gone (`grep -c "Parked" .magic/scripts/check-prerequisites.js` equals its count of mentions in comments only, and no second `isAllTerminal` remains). `node --test dev/tests/engine.js` passes with the same test count as before the edit, and a differential run over three fixtures (this repository, a fixture with an orphaned spec, one with an open unparked backlog item) prints identical `warnings` arrays before and after.
- **Handoff:** T-35T03 re-runs the differential after the C14 bump.
- **Notes:** Highest blast radius of the phase — every workflow's Pre-flight runs this script, and a changed warning breaks the digest, the `recheck` revalidation and the HALT gates at once. Behavior-preserving refactor only: no new warning, no reworded message. If the differential shows any change, revert the task and record it in `Attempts`.

### [T-35A03] `finalize.js`: command-free plan-complete value when nothing is pending

- **Spec:** l2-engine-finalization.md §5 (`Next Action`); l1-session-continuity.md SC-2.1(d), SC-2.2
- **Status:** Done
- **Changes:** finalize.js: the plan-complete branch calls a new planCompleteNextAction() — findPendingWork() with registry, backlog and plan-complete all evaluated and empty gives "Plan complete — nothing pending" (no command); any pending signal, a missing input or an exception gives the /magic.task funnel, the exception path recording PENDING_WORK_UNEVALUABLE (warning). spec/rule branches and every tier above untouched. Fixture run: orphan, debt and mixed resolve to the funnel, the clean fixture (in sync, Parked-only backlog) to the command-free value, a fixture without a plan to the funnel.
- **Assignment:** Agent
- **Verify:** In `synthesizeNextAction()`'s plan-complete branch (the last return before the catch), `findPendingWork()` is called on the workspace design directory: `orphanedSpecs.length === 0`, `syncGap === null` and `openBacklogItems.length === 0` → the value is `Plan complete — nothing pending`, containing no `/magic.` token; any pending signal, or any exception from the call → the existing value `Plan complete — run /magic.task {ws} to plan new scope`, with a recorded diagnostic on the exception path (severity `warning`, source `finalize`, code `PENDING_WORK_UNEVALUABLE`) so the fail-toward-the-funnel choice is visible. The `spec` and `rule` early returns and every tier above are untouched. `computeNextAction()`'s screen at the single exit still rejects `/magic.spec` and `/magic.analyze` and now also accepts a value that names no command (it only ever tested for reserved names). `node .magic/scripts/executor.js finalize --workflow=run --dry-run` on this repository prints a `Next step` line without `/magic.` when its plan is complete and in sync.
- **Handoff:** T-35T01 pins both branches and the failure path; `resume-state` and `/magic.status` replay the value verbatim.
- **Notes:** The value must stay a single line — `STATE.md`'s `Next Action` is read by column-0 field readers (SC-1). Do not add a second field for "nothing pending"; the absence of a command in the one field is the signal. `PENDING_WORK_UNEVALUABLE` is a new diagnostic code: record it in the diagnostics inventory wherever the other finalize codes are listed if such a list exists (grep `SIGNIFICANCE_HASH_UNREADABLE` for the places).

### [T-35B01] `status.md`: render the nothing-pending statement, never invent a command

- **Spec:** l2-status-command.md §5.2 item 7, SC-4 row
- **Status:** Done
- **Changes:** status.md: purpose paragraph, the One Next Step invariant and item 7 (Next) now render "Next: nothing pending — {statement}" with no command when Next Action states nothing is pending; the pipeline-order fallback applies only when Next Action is absent; no leak tokens in the diff.
- **Assignment:** Agent
- **Verify:** In `.magic/status.md`: the purpose paragraph and the *One Next Step (DA-6)* invariant say exactly one recommended command **or**, when `Next Action` states that nothing is pending, that statement; item 7 (**Next**) keeps the `[DR] Next: {command} — {criterion}` form for a recommendation and adds the alternative `Next: nothing pending — {the statement}` with no command, and the fallback computation (open `Todo` → `/magic.run`; specs without a plan → `/magic.task`; empty registry → `/magic.spec`) applies only when `Next Action` is absent. `grep -n "nothing pending" .magic/status.md` matches the three places. No `[DR]` line is required for the nothing-pending case. `git diff -U0 -- .magic/status.md | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+|phase-[0-9]+"` prints nothing.
- **Handoff:** T-35B02 mirrors it for readers; T-35T02 asserts it.
- **Notes:** `status.md` is a workflow body → it is the one C14 tag this phase needs (`magic.status`).

### [T-35B02] `docs/status.md`: the Direction goal follows

- **Spec:** l1-documentation-system.md (docs counterpart stays in sync with its workflow)
- **Status:** Done
- **Changes:** docs/status.md Direction goal extended with the nothing-pending alternative; links resolve, Sync Note untouched.
- **Assignment:** Agent
- **Verify:** `docs/status.md` line "**Direction**: exactly one recommended next command, with the reason it was chosen." reads that it is exactly one recommended command with its reason, or a one-clause statement that nothing is pending when the plan is complete and no work is waiting; every relative link in the file resolves; the `Sync Note` line is not edited (`dev/scripts/sync-docs.js` owns it).
- **Handoff:** none.
- **Notes:** One sentence.

### [T-35T01] Validation: harness cases for the two branches, the Parked control and the failure path

- **Goal:** Pin the new branch in both directions, and pin that it can never raise a false "nothing pending".
- **Method:** In `dev/tests/engine.js`, next to the existing `computeNextAction` cases, add fixtures that carry `INDEX.md`, `PLAN.md` and `TASKS.md` (the existing plan-complete fixture has none, so it keeps resolving to the funnel through the failure path — leave its assertions as they are): (1) complete plan, in-sync registry, empty or fully Parked Backlog → `Plan complete — nothing pending`, and `assert.doesNotMatch(next, /\/magic\./)`; (2) an open, unparked Backlog bullet → the `/magic.task` funnel value; (3) the same fixture with the trailing `*(Parked — …)*` marker added → nothing pending (the Parked control); (4) a spec registered in `INDEX.md` but absent from `PLAN.md` → funnel; (5) `PLAN.md` based on an older registry version → funnel; (6) `PLAN.md` unreadable (a directory at its path) → funnel plus the `PENDING_WORK_UNEVALUABLE` diagnostic; (7) `findPendingWork()` itself: the returned object for each of the above. Each new case is mutation-checked against the unfixed logic (revert the branch, expect red, restore, verify by hash).
- **Status:** Done
- **Changes:** dev/tests/engine.js: one new case with seven sub-cases (nothing pending gives the command-free value with no /magic. token; open backlog, orphaned spec, older registry version and an unreadable plan each give the funnel, the last recording PENDING_WORK_UNEVALUABLE; the Parked bullet control; findPendingWork checked directly incl. not-evaluated flags). Six mutations (always funnel, ignore backlog, failure says nothing pending, drop Parked exclusion, ignore sync gap, ignore orphans) each turned it red and were restored by hash. Harness 140 to 141.
- **Notes:** Run after T-35A03. The count rises by the number of `it` cases added; record the before/after in `Changes`.

### [T-35T02] Validation: cognitive scenario T231 for the briefing

- **Goal:** Pin the status-briefing rendering the harness cannot see — `status.md` is prose.
- **Method:** Append **T231** to `dev/tests/suite.md` before the closing line, in the Test A / Test B (control) form: Test A — `STATE.md` `Next Action: Plan complete — nothing pending`, no blockers, plan in sync → `/magic.status` renders `Next: nothing pending — Plan complete — nothing pending` (or the statement in the same clause), recommends no command, emits no `[DR] Next:` line; Test B (control) — `Next Action: Execute T-2A01 … via /magic.run engine` → the `[DR] Next: /magic.run engine — …` form is unchanged. `Guards tested` and `Regression for` lines as in T230. Bump the suite header and closing line: `1.9.82` → `1.9.83`, `Last: T230` → `Last: T231`.
- **Status:** Done
- **Changes:** suite.md: T231 appended (Test A nothing-pending rendered as a statement with no command and no fallthrough, Test B control unchanged for a command-bearing Next Action); header 1.9.82 to 1.9.83, closing line Last T231.
- **Notes:** Cognitive-only, like every `status.md` case.

### [T-35T03] Validation: harness, leak scan, tracked-files invariant; single C14 bump

- **Goal:** Prove the tree is consistent, then close the phase's one C14 bump.
- **Method:** (1) Stage the one new engine file so the tracked-files invariant holds when checksums are regenerated: `git add .magic/scripts/lib/pending-work.js` (staging only — no commit); without it the post-bump harness fails `every .magic/.checksums entry must be a git-tracked file`, as it did in an earlier phase. (2) `node --test dev/tests/engine.js` → all green, count = previous 140 + the cases T-35T01 added. (3) Leak scan: `git diff -U0 -- .magic | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+|phase-[0-9]+"` prints nothing (the new module's comments must restate rationale in plain language, not cite specifications). (4) The T-35A02 differential over three fixtures shows identical warnings. (5) `node .magic/scripts/executor.js update-engine-meta --workflow magic.status` → engine 2.1.111 → 2.1.112, one C14, dev-repo snapshot synced. (6) Post-bump: repeat (2); `check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`; `finalize --workflow=run --dry-run` prints a `Next step` line with no `/magic.` token; every relative link under `docs/` resolves.
- **Status:** Done
- **Changes:** Staged lib/pending-work.js (staging only). Harness 141/141 before and after C14 (one transient red on validate-hardlinks in the first full run, green alone and on two reruns, not reproduced); leak scans clean; differential over four fixtures identical after C14, repo fixture back to no warnings. C14 once: engine 2.1.111 to 2.1.112, 74 files checksummed, snapshot synced. check-prerequisites ok, hardlinks valid, docs links 0 broken.
- **Notes:** Every task writes `.magic/`, `docs/` or `dev/tests/` → C14 runs exactly once, here. `rules/magic.md`, the constitution and its template are deliberately not edited: the change is to a computed value, not to a rule.
