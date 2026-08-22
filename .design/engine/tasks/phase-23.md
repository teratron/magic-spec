---
phase: 23
name: "Next-Action Task-Level Precedence & Decision-Prune Honesty"
status: Todo
subsystem: ".magic/scripts"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 23 Tasks — Next-Action Task-Level Precedence & Decision-Prune Honesty

**Phase:** 23
**Status:** Todo
**Strategic Goal:** Close the two `Required Fix` blocks authored against engine 2.1.72 — `Next Action` must stop recommending a task the same phase file marks `Blocked` or `Assignment: User`, and the decision-prune step must stop asserting an archival it has never performed.

## Atomic Checklist

- [ ] [T-23A01] Screen matched tasks against their Detailed Tracking entry
- [ ] [T-23A02] Terminal branch when no open task is agent-actionable
- [ ] [T-23B01] Replace the false archival claim in the decision-section preamble
- [ ] [T-23C01] Correct the stale §12 Known-Gaps claim about §8 coverage
- [ ] [T-23T01] Regression: task-level Blocked/Assignment precedence
- [ ] [T-23T02] Regression: realign the assertion pinning the old comment text
- [ ] [T-23T03] Full harness run + C14 sync

## Detailed Tracking

### [T-23A01] Screen matched tasks against their Detailed Tracking entry

- **Spec:** l2-finalize-state-accuracy.md §9 (concept: l1-session-continuity.md SC-2.1(c))
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** In `finalize.js`'s `synthesizeNextAction()` tier-2 phase-file loop, stop returning the first open checklist line unconditionally. Iterate every open `- [ ] [T-…]` item in the phase file, and for each read its own `### [{T-ID}] …` sub-block under `## Detailed Tracking`; skip the item when that block's `**Status:**` reads `Blocked`/`Cancelled` **or** its `**Assignment:**` reads `User`. Continue scanning within the same phase file first, then fall through to subsequent phase files — mirroring the existing phase-to-phase continuation.
- **Material assumptions:**
  - `openTaskRe` is currently un-flagged, so `.match()` yields only the first hit. Iterating requires a `g`-flagged clone or `matchAll` — do not mutate the shared const's flags in place (`lastIndex` state leaks across calls).
  - A task with **no** `**Assignment:**` field, or a value outside `Agent | User`, defaults to **agent-actionable**. This is load-bearing: the existing control case at `dev/tests/engine.js` (healthy phase, `Execute T-1A01` expected) uses a phase fixture with no `## Detailed Tracking` section at all, and must keep passing.
  - The phase-level `isPhaseBlocked()` check keeps running **first** and is unchanged — SC-2.1(a) still takes precedence over this task-level screen.
- **Watch (SH-1):** `finalize.js` does **not** import `stripQuoted` from `./lib/scan-hygiene`, unlike `update-state.js`'s `readPhaseChecklist()` and `phase-archiver.js`. Matching only the first item made quoted checkbox syntax in a Notes block statistically harmless; scanning **every** item raises that exposure. Either bind the scan to `stripQuoted()` (consistent with the other three scans, `l1-scan-input-hygiene.md` SH-5) or record explicitly why this scan is exempt — do not leave it unconsidered.
- **Verify:** `node -e` harness against a temp workspace: phase frontmatter `status: In Progress`, registry row non-Blocked, checklist `T-23X01` (Detailed Tracking `Status: Blocked`, `Assignment: User`) then `T-23X02` (`Status: Todo`, `Assignment: Agent`) → `computeNextAction('run', ws, dir)` returns a string matching `/^Execute T-23X02/` and NOT matching `/T-23X01/`.
- **Handoff:** T-23A02 (same function, terminal branch).

### [T-23A02] Terminal branch when no open task is agent-actionable

- **Spec:** l2-finalize-state-accuracy.md §9 (terminal case), l1-session-continuity.md SC-2.1(c), SC-2.2
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** When every open task across all phase files is excluded by T-23A01's screen, return a distinct recommendation instead of falling through. It MUST NOT reach the plan-complete branch (the plan is *not* complete — tasks remain), and MUST NOT name an excluded task as `/magic.run`-executable.
- **Material assumptions:**
  - SC-2.2 binds this new return value like every other: **exactly one** command named, and never `/magic.spec` or `/magic.analyze`. Follow the shape the SC-2.1(a) branch already uses (`Resolve blocker on … then run /magic.run {ws}` — one command, `/magic.run`).
  - The single-exit `RESERVED_COMMAND_RE` guard in `computeNextAction()` stays the enforcement point; do not add a branch-local screen (branch-local enforcement is the documented prior regression, SC-2.2).
- **Verify:** temp-workspace fixture where every open item is `Assignment: User` → returned string satisfies all three: `(next.match(/\/magic\.[a-z.]+/g) || []).length === 1`, `!/\/magic\.(spec|analyze)/.test(next)`, and `!/^Execute T-/.test(next)`.
- **Handoff:** T-23T01 (regression coverage for both A tasks).

### [T-23B01] Replace the false archival claim in the decision-section preamble

- **Spec:** l2-finalize-state-accuracy.md §10
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** In `update-state.js`'s `addDecision` rebuild, change the emitted preamble comment so it states what the code actually does. The current text — `<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->` — promises an archival no code path performs.
- **Material assumptions:**
  - Resolved as §10 option **(b)**, not (a) — see the phase note below. Do **not** implement a `PLAN.md` writer.
  - This string is emitted into every workspace's live `STATE.md` on every decision write, so the fix is a behavior change users see, not a comment-only edit in source.
  - The 5-entry cap and the `## Recent Decisions` prune in the line-cap guard are unchanged by this task.
- **Verify:** `node -e` against a temp workspace — after `--decision="…"`, `STATE.md` contains the new preamble text and `grep` for `archived to PLAN.md` returns no match.
- **Handoff:** T-23T02 (the existing harness assertion pins the old string and will fail until realigned).

### [T-23C01] Correct the stale §12 Known-Gaps claim about §8 coverage

- **Spec:** l2-finalize-state-accuracy.md §12 (Known Gaps Not Closed Here)
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** §12 asserts "**§8's coverage obligation is open**, not merely pending: the fix shipped at 2.1.67 without it, so the defect is currently unprotected against regression." That is false as of Phase 19 (R12), which added the structural assertions. Correct the entry to record it as closed, naming the covering assertions.
- **Material assumptions:**
  - Evidence: `dev/tests/engine.js` carries three structural assertions plus a placeholder-absence assertion in the `update-state.js` decision case — heading-then-blank-line, entry-after-preamble, no consecutive-blank run, no surviving `{YYYY-MM-DD}` row.
  - This is a factual-accuracy patch with no design content — `RULES.md` §3 patch tier (`clarifications, no structural change`), so no status transition and no `/magic.spec` design pass is required. Bump `l2-finalize-state-accuracy.md` to the next patch version and add a `Document History` row.
  - `INDEX.md`'s row version for this spec must be updated in the same edit (registry parity — Pre-flight `--verify-headers` HALTs on drift).
- **Verify:** `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `ok: true` with no `VERSION_DRIFT`.
- **Handoff:** independent — no downstream task depends on this.

### [T-23T01] Regression: task-level Blocked/Assignment precedence

- **Spec:** l2-finalize-state-accuracy.md §11 (Open obligation §9)
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Add a harness case to `dev/tests/engine.js` pinning T-23A01 and T-23A02. Cover: (i) first open item `Status: Blocked` → later actionable item named; (ii) first open item `Assignment: User` → later actionable item named; (iii) all open items excluded → terminal branch, one command, no `Execute T-` prefix; (iv) negative control — a phase whose Detailed Tracking marks everything `Todo`/`Agent` still dispatches normally.
- **Material assumptions:**
  - The existing SC-2.1(a) Blocked-phase case and its control must keep passing untouched — if either needs editing, the fix changed phase-level behavior it was not supposed to touch.
  - Negative-control the new case against the pre-fix logic (the Phase 19 R12 pattern): confirm the case actually fails without T-23A01's change, so it is not a test that passes under the defect.
- **Verify:** `node dev/tests/engine.js` — new cases pass; total count increases by the number added; zero pre-existing failures.
- **Handoff:** T-23T02 (same file, sequential).

### [T-23T02] Regression: realign the assertion pinning the old comment text

- **Spec:** l2-finalize-state-accuracy.md §11 (Open obligation §10)
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** The existing `update-state.js` decision case asserts `/Older entries → archived to PLAN\.md -->\r?\n\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\*/` — it pins the exact false-promise string T-23B01 removes, so the suite fails until this is realigned. Update the assertion to the new preamble text, preserving what it was actually testing (entry sits *after* the comment preamble, not before it), and add an assertion that the old claim is absent.
- **Material assumptions:**
  - Do not weaken the assertion to `[\s\S]*` while realigning — that is precisely the presence-only shape §8.4 records as structurally incapable of catching the defect class.
  - This task is **gated by T-23B01**: running it first leaves the suite red against a string the code still emits.
- **Verify:** `node dev/tests/engine.js` — the decision case passes and still fails if the entry is moved above the preamble (verify by temporarily reverting T-23B01's insertion order, then restoring).
- **Handoff:** T-23T03 (same file, sequential).

### [T-23T03] Full harness run + C14 sync

- **Spec:** l2-test-suite.md (finalize-pipeline coverage mandate), RULES.md C14
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Run the complete harness, then perform the single engine-metadata bump for the phase.
- **Material assumptions:**
  - Tracks A and B both write inside `.magic/` → both bump `.magic/.checksums`. C14 runs **once**, here, after every engine edit has landed.
  - No `.magic/*.md` or `workflows/*.md` workflow body is touched this phase (only `scripts/`), so the bump carries **no** `--workflow` tag — same as Phase 21.
  - T-23C01 writes `.design/` only and is outside C14 scope entirely.
- **Verify:** `node dev/tests/engine.js` reports zero failures, then `node .magic/scripts/executor.js update-engine-meta` completes and `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` returns `ok: true` with no `checksums_mismatch`.
- **Handoff:** phase closure → `/magic.run` finalize archives this file.

### [T-23T04] Validation Task — end-to-end field-report replay

- **Goal:** Verify both original field-report symptoms are gone by replaying the reporter's exact scenario, not only the unit fixtures.
- **Method:** Rebuild the reproduction used during spec authoring — a phase with a blocked, user-assigned task ahead of an actionable one, and a `STATE.md` driven past 100 lines with 5 decisions — then run `finalize --workflow=task --dry-run` against it. Confirm the printed `Next Action` names the actionable task (not the blocked one), and that a real (non-dry-run) prune emits the corrected preamble with no `archived to PLAN.md` claim.
- **Status:** Todo

## Notes

**§10 design fork resolved at plan time.** The spec offers two acceptable fixes: (a) implement the promised `PLAN.md` archival, or (b) correct the comment to state actual behavior. Resolved as **(b)**. Two objective grounds: the pruned entries are phase-completion summaries already duplicated in `.design/{ws}/CHANGELOG.md` (the internal phase journal) and in `PLAN.md`'s own phase entries, so (b) is not data loss — the comment is simply wrong about where the history lives; and a `STATE.md` key-value patch utility gaining a `PLAN.md` writer crosses the C10 ownership boundary, where `PLAN.md` is the strategic document owned by the task workflow. Recorded here because a cold implementer reading only §10 would otherwise re-litigate the fork.

**The existing harness asserts the defect.** T-23T02 is not optional cleanup — `dev/tests/engine.js` pins the exact false-promise string, so T-23B01 turns the suite red on its own. Same shape as the pattern this repository has hit before: a regression survives because the test encodes it.

**§9 is the larger of the two fixes.** It changes a single-match lookup into an iteration with a per-item structured screen, adds a new terminal branch, and touches a function whose output is user-visible on every finalize invocation. Highest blast radius in the phase; sequence it before the test track rather than in parallel.

**Track ordering.** A (`finalize.js`) and B (`update-state.js`) are file-independent and may run in either order, but both bump `.magic/.checksums`, so they execute serially in one session. T is a single-file queue on `dev/tests/engine.js` (T01 → T02 → T03) and is gated by both: T01 by A, T02 by B. C (`.design/` spec accuracy) is file-independent of everything and carries no C14 impact.
