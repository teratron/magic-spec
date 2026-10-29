---
phase: 23
name: "Next-Action Task-Level Precedence & Decision-Prune Honesty"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "finalize.js: isTaskExcluded() + per-item Detailed Tracking screen in synthesizeNextAction() tier-2 (SC-2.1(c))"
  - "finalize.js: terminal all-excluded-tasks branch (no plan-complete fallthrough, no executable-task leak)"
  - "update-state.js + templates/state.md: corrected decision-prune preamble (no false PLAN.md archival claim)"
  - "l2-finalize-state-accuracy.md 1.1.1: §9/§10 required fixes implemented; §12 stale claim corrected"
  - "dev/tests/engine.js: SC-2.1(c) 4-scenario regression case; realigned decision-preamble assertion (65 -> 66)"
key_files:
  created: []
  modified:
    - ".magic/scripts/finalize.js"
    - ".magic/scripts/update-state.js"
    - ".magic/templates/state.md"
    - "dev/tests/engine.js"
    - ".design/engine/specifications/l2-finalize-state-accuracy.md"
    - ".design/engine/INDEX.md"
patterns_established:
  - "Regex lookahead needing true end-of-string under the `m` flag must use `(?![\\s\\S])`, never bare `$` — `$` matches before any newline under `m`, not only end-of-string."
duration_minutes: ~
---

# Stage 23 Tasks — Next-Action Task-Level Precedence & Decision-Prune Honesty

**Phase:** 23
**Status:** Done
**Strategic Goal:** Close the two `Required Fix` blocks authored against engine 2.1.72 — `Next Action` must stop recommending a task the same phase file marks `Blocked` or `Assignment: User`, and the decision-prune step must stop asserting an archival it has never performed.

## Atomic Checklist

- [x] [T-23A01] Screen matched tasks against their Detailed Tracking entry
- [x] [T-23A02] Terminal branch when no open task is agent-actionable
- [x] [T-23B01] Replace the false archival claim in the decision-section preamble
- [x] [T-23C01] Correct the stale §12 Known-Gaps claim about §8 coverage
- [x] [T-23T01] Regression: task-level Blocked/Assignment precedence
- [x] [T-23T02] Regression: realign the assertion pinning the old comment text
- [x] [T-23T03] Full harness run + C14 sync

## Detailed Tracking

### [T-23A01] Screen matched tasks against their Detailed Tracking entry

- **Spec:** l2-finalize-state-accuracy.md §9 (concept: l1-session-continuity.md SC-2.1(c))
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `finalize.js`'s `synthesizeNextAction()` tier-2 phase-file loop, stop returning the first open checklist line unconditionally. Iterate every open `- [ ] [T-…]` item in the phase file, and for each read its own `### [{T-ID}] …` sub-block under `## Detailed Tracking`; skip the item when that block's `**Status:**` reads `Blocked` **or** its `**Assignment:**` reads `User`. Continue scanning within the same phase file first, then fall through to subsequent phase files — mirroring the existing phase-to-phase continuation.
- **Material assumptions:**
  - `openTaskRe` is currently un-flagged, so `.match()` yields only the first hit. Iterating requires a `g`-flagged clone or `matchAll` — do not mutate the shared const's flags in place (`lastIndex` state leaks across calls).
  - A task with **no** `**Assignment:**` field, or a value outside `Agent | User`, defaults to **agent-actionable**. This is load-bearing: the existing control case at `dev/tests/engine.js` (healthy phase, `Execute T-1A01` expected) uses a phase fixture with no `## Detailed Tracking` section at all, and must keep passing.
  - The phase-level `isPhaseBlocked()` check keeps running **first** and is unchanged — SC-2.1(a) still takes precedence over this task-level screen.
- **Watch (SH-1):** `finalize.js` does **not** import `stripQuoted` from `./lib/scan-hygiene`, unlike `update-state.js`'s `readPhaseChecklist()` and `phase-archiver.js`. Matching only the first item made quoted checkbox syntax in a Notes block statistically harmless; scanning **every** item raises that exposure. Either bind the scan to `stripQuoted()` (consistent with the other three scans, `l1-scan-input-hygiene.md` SH-5) or record explicitly why this scan is exempt — do not leave it unconsidered.
- **Verify:** `node -e` harness against a temp workspace: phase frontmatter `status: In Progress`, registry row non-Blocked, checklist `T-1A01` (Detailed Tracking `Status: Blocked`, `Assignment: User`) then `T-1A02` (`Status: Todo`, `Assignment: Agent`) → `computeNextAction('run', ws, dir)` returns a string matching `/^Execute T-1A02/` and NOT matching `/T-1A01/`. Confirmed: `RESULT: Execute T-1A02 Second actionable task via /magic.run testws`.
- **Changes:** Added `isTaskExcluded()` (finalize.js) and a `stripQuoted`-hygienic per-item scan (`matchAll` on a new `openTaskReGlobal`, tier-2 loop only) replacing the unconditional first-match return. **Deviation from Goal text**: implemented per the L2 spec exactly — `Status: Blocked` / `Assignment: User` only, dropping `Cancelled` (this task's own Goal wording named it, the spec did not; corrected to avoid scope creep past the assigned spec section). **Bug found during verification**: the Detailed Tracking block-extraction lookahead `(?=\n### |\n## |$)` used `$` under the `m` flag, which matches before *any* newline (e.g. the section's own blank line right after the heading) — not only end-of-string — collapsing the capture to empty and silently defeating the whole screen (first repro run showed the defect unchanged). Fixed with a flag-independent end anchor `(?![\s\S])`. Verified via a 4-scenario matrix (10 assertions) plus the pre-existing SC-2.1(a) blocked-phase cases; full harness 65/65, zero regressions.
- **Handoff:** T-23A02 (same function, terminal branch).

### [T-23A02] Terminal branch when no open task is agent-actionable

- **Spec:** l2-finalize-state-accuracy.md §9 (terminal case), l1-session-continuity.md SC-2.1(c), SC-2.2
- **Status:** Done
- **Assignment:** Agent
- **Goal:** When every open task across all phase files is excluded by T-23A01's screen, return a distinct recommendation instead of falling through. It MUST NOT reach the plan-complete branch (the plan is *not* complete — tasks remain), and MUST NOT name an excluded task as `/magic.run`-executable.
- **Material assumptions:**
  - SC-2.2 binds this new return value like every other: **exactly one** command named, and never `/magic.spec` or `/magic.analyze`. Follow the shape the SC-2.1(a) branch already uses (`Resolve blocker on … then run /magic.run {ws}` — one command, `/magic.run`).
  - The single-exit `RESERVED_COMMAND_RE` guard in `computeNextAction()` stays the enforcement point; do not add a branch-local screen (branch-local enforcement is the documented prior regression, SC-2.2).
- **Verify:** temp-workspace fixture where every open item is `Assignment: User` → returned string satisfies all three: `(next.match(/\/magic\.[a-z.]+/g) || []).length === 1`, `!/\/magic\.(spec|analyze)/.test(next)`, and `!/^Execute T-/.test(next)`. Confirmed: `T-1A01 and any other open tasks need user or blocker action — see STATE.md ## Blockers / the phase's ## Detailed Tracking, then run /magic.run testws` — all three checks pass.
- **Changes:** Implemented as `firstExcludedTask` tracked across the phase-files loop; returns a distinct message naming the first excluded task (not as executable) when the loop exhausts every open item without finding one agent-actionable. Falls through to tier-3/plan-complete unchanged when zero open tasks exist at all (genuinely complete phase). Verified together with T-23A01 (same test run, same commit).
- **Handoff:** T-23T01 (regression coverage for both A tasks).

### [T-23B01] Replace the false archival claim in the decision-section preamble

- **Spec:** l2-finalize-state-accuracy.md §10
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `update-state.js`'s `addDecision` rebuild, change the emitted preamble comment so it states what the code actually does. The current text — `<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->` — promises an archival no code path performs.
- **Material assumptions:**
  - Resolved as §10 option **(b)**, not (a) — see the phase note below. Do **not** implement a `PLAN.md` writer.
  - This string is emitted into every workspace's live `STATE.md` on every decision write, so the fix is a behavior change users see, not a comment-only edit in source.
  - The 5-entry cap and the `## Recent Decisions` prune in the line-cap guard are unchanged by this task.
- **Verify:** `node -e` against a temp workspace — after `--decision="…"`, `STATE.md` contains the new preamble text and `grep` for `archived to PLAN.md` returns no match. Confirmed: `Contains new claim: true` / `Contains old false claim: false`.
- **Changes:** Replaced the emitted preamble in `update-state.js`'s `addDecision` rebuild with `Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history.` Also fixed the same string in `.magic/templates/state.md` (the bootstrap seed a brand-new workspace copies verbatim before any `addDecision` call ever rebuilds the section) — not separately scoped in the spec, but the same false claim reaching the same live file via a second source; left this engine's own live `.design/engine/STATE.md` untouched, since Phase 23's own completion decision will self-heal it on the next `addDecision` call (same self-healing pattern as the §8 fix). Confirmed harness now fails exactly the predicted one case (`update-state.js should bootstrap, patch fields and append decision/constraint`, 64/65) — gates T-23T02.
- **Handoff:** T-23T02 (the existing harness assertion pins the old string and will fail until realigned).

### [T-23C01] Correct the stale §12 Known-Gaps claim about §8 coverage

- **Spec:** l2-finalize-state-accuracy.md §12 (Known Gaps Not Closed Here)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** §12 asserts "**§8's coverage obligation is open**, not merely pending: the fix shipped at 2.1.67 without it, so the defect is currently unprotected against regression." That is false as of Phase 19 (R12), which added the structural assertions. Correct the entry to record it as closed, naming the covering assertions.
- **Material assumptions:**
  - Evidence: `dev/tests/engine.js` carries three structural assertions plus a placeholder-absence assertion in the `update-state.js` decision case — heading-then-blank-line, entry-after-preamble, no consecutive-blank run, no surviving `{YYYY-MM-DD}` row.
  - This is a factual-accuracy patch with no design content — `RULES.md` §3 patch tier (`clarifications, no structural change`), so no status transition and no `/magic.spec` design pass is required. Bump `l2-finalize-state-accuracy.md` to the next patch version and add a `Document History` row.
  - `INDEX.md`'s row version for this spec must be updated in the same edit (registry parity — Pre-flight `--verify-headers` HALTs on drift).
- **Verify:** `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `ok: true` with no `VERSION_DRIFT`. Confirmed: no `VERSION_DRIFT`/`STATUS_DRIFT` on any spec; `ok: false` only from expected `ENGINE_INTEGRITY` checksum warnings on the still-unsynced A/B track edits (resolved by T-23T03).
- **Changes:** l2-finalize-state-accuracy.md 1.1.0 → 1.1.1 — corrected §12's stale "§8's coverage obligation is open" claim (closed by Phase 19/R12) and the Overview's "not yet implemented" claim for §9/§10 (both landed this same phase). INDEX.md row synced. Scope note: also corrected the Overview line, one sentence beyond the task's original Goal text — the claim went stale as a direct consequence of T-23A01/A02/B01 landing within this same phase, so leaving it uncorrected would reintroduce exactly the class of defect this spec exists to record.
- **Handoff:** independent — no downstream task depends on this.

### [T-23T01] Regression: task-level Blocked/Assignment precedence

- **Spec:** l2-finalize-state-accuracy.md §11 (Open obligation §9)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Add a harness case to `dev/tests/engine.js` pinning T-23A01 and T-23A02. Cover: (i) first open item `Status: Blocked` → later actionable item named; (ii) first open item `Assignment: User` → later actionable item named; (iii) all open items excluded → terminal branch, one command, no `Execute T-` prefix; (iv) negative control — a phase whose Detailed Tracking marks everything `Todo`/`Agent` still dispatches normally.
- **Material assumptions:**
  - The existing SC-2.1(a) Blocked-phase case and its control must keep passing untouched — if either needs editing, the fix changed phase-level behavior it was not supposed to touch.
  - Negative-control the new case against the pre-fix logic (the Phase 19 R12 pattern): confirm the case actually fails without T-23A01's change, so it is not a test that passes under the defect.
- **Verify:** `node dev/tests/engine.js` — new cases pass; total count increases by the number added; zero pre-existing failures. Confirmed: 65 → 66 tests, new case `ok`, all 4 sub-scenarios (i-iv) asserted inline within one test.
- **Changes:** Added one test covering all four required scenarios, inserted directly after the existing SC-2.1(a) test. Reused that test's fixture style (`registry()`/phase-file closures). Negative control (iv) and the pre-fix failure of (i)/(ii) were confirmed manually during T-23A01 authoring (first `repro-a.js` run against unfixed code named the Blocked/User task unconditionally).
- **Handoff:** T-23T02 (same file, sequential).

### [T-23T02] Regression: realign the assertion pinning the old comment text

- **Spec:** l2-finalize-state-accuracy.md §11 (Open obligation §10)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** The existing `update-state.js` decision case asserts `/Older entries → archived to PLAN\.md -->\r?\n\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\*/` — it pins the exact false-promise string T-23B01 removes, so the suite fails until this is realigned. Update the assertion to the new preamble text, preserving what it was actually testing (entry sits *after* the comment preamble, not before it), and add an assertion that the old claim is absent.
- **Material assumptions:**
  - Do not weaken the assertion to `[\s\S]*` while realigning — that is precisely the presence-only shape §8.4 records as structurally incapable of catching the defect class.
  - This task is **gated by T-23B01**: running it first leaves the suite red against a string the code still emits.
- **Verify:** `node dev/tests/engine.js` — the decision case passes and still fails if the entry is moved above the preamble (verify by temporarily reverting T-23B01's insertion order, then restoring).
- **Changes:** Realigned the presence assertion to the new preamble text and added a `doesNotMatch` assertion pinning the absence of the old `archived to PLAN.md` claim. **Bug found while realigning**: first attempt used "is dropped" against code that emits "entries **are** dropped" (plural-subject agreement) — a plain grammar typo — which failed with `test result: false` even though the surrounding text was otherwise byte-identical; caught immediately by running the harness rather than trusting the edit. Confirmed: 65 → 66 tests, full suite 66/66 (this case plus T-23T01's new case).
- **Handoff:** T-23T03 (same file, sequential).

### [T-23T03] Full harness run + C14 sync

- **Spec:** l2-test-suite.md (finalize-pipeline coverage mandate), RULES.md C14
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Run the complete harness, then perform the single engine-metadata bump for the phase.
- **Material assumptions:**
  - Tracks A and B both write inside `.magic/` → both bump `.magic/.checksums`. C14 runs **once**, here, after every engine edit has landed.
  - No `.magic/*.md` or `workflows/*.md` workflow body is touched this phase (only `scripts/`), so the bump carries **no** `--workflow` tag — same as Phase 21.
  - T-23C01 writes `.design/` only and is outside C14 scope entirely.
- **Verify:** `node dev/tests/engine.js` reports zero failures, then `node .magic/scripts/executor.js update-engine-meta` completes and `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` returns `ok: true` with no `checksums_mismatch`. Confirmed: harness 66/66; `update-engine-meta` bumped engine 2.1.72 → 2.1.73, regenerated 7 skill wrappers and `.magic/.checksums` (70 files); final `check-prerequisites` returns `ok: true`, `warnings: []`.
- **Changes:** Single C14 sync for the phase, no `--workflow` tag (only `scripts/`/`templates/` touched, no workflow-doc body).
- **Handoff:** phase closure → `/magic.run` finalize archives this file.

### [T-23T04] Validation Task — end-to-end field-report replay

- **Goal:** Verify both original field-report symptoms are gone by replaying the reporter's exact scenario, not only the unit fixtures.
- **Method:** Rebuild the reproduction used during spec authoring — a phase with a blocked, user-assigned task ahead of an actionable one, and a `STATE.md` driven past 100 lines with 5 decisions — then run `finalize --workflow=task --dry-run` against it. Confirm the printed `Next Action` names the actionable task (not the blocked one), and that a real (non-dry-run) prune emits the corrected preamble with no `archived to PLAN.md` claim.
- **Status:** Done
- **Evidence:** Real `finalize.js` CLI (not the exported functions) against a full git-backed fixture. Dry-run `Next Action`: `Execute T-1A02 Actionable task via /magic.run main` — names the actionable task, excludes `T-1A01`. Real run: guard fired (`Pruned oldest decision`), resulting `STATE.md` contains the new preamble, contains no `archived to PLAN.md`, and no `PLAN.md` was created anywhere in the workspace.

## Notes

**§10 design fork resolved at plan time.** The spec offers two acceptable fixes: (a) implement the promised `PLAN.md` archival, or (b) correct the comment to state actual behavior. Resolved as **(b)**. Two objective grounds: the pruned entries are phase-completion summaries already duplicated in `.design/{ws}/CHANGELOG.md` (the internal phase journal) and in `PLAN.md`'s own phase entries, so (b) is not data loss — the comment is simply wrong about where the history lives; and a `STATE.md` key-value patch utility gaining a `PLAN.md` writer crosses the C10 ownership boundary, where `PLAN.md` is the strategic document owned by the task workflow. Recorded here because a cold implementer reading only §10 would otherwise re-litigate the fork.

**The existing harness asserts the defect.** T-23T02 is not optional cleanup — `dev/tests/engine.js` pins the exact false-promise string, so T-23B01 turns the suite red on its own. Same shape as the pattern this repository has hit before: a regression survives because the test encodes it.

**§9 is the larger of the two fixes.** It changes a single-match lookup into an iteration with a per-item structured screen, adds a new terminal branch, and touches a function whose output is user-visible on every finalize invocation. Highest blast radius in the phase; sequence it before the test track rather than in parallel.

**Track ordering.** A (`finalize.js`) and B (`update-state.js`) are file-independent and may run in either order, but both bump `.magic/.checksums`, so they execute serially in one session. T is a single-file queue on `dev/tests/engine.js` (T01 → T02 → T03) and is gated by both: T01 by A, T02 by B. C (`.design/` spec accuracy) is file-independent of everything and carries no C14 impact.
