---
phase: 19
name: "Finalization Contract Fixes"
status: Todo
subsystem: ".magic/scripts, .magic/scripts/lib, .magic, dev/tests"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 19 Tasks — Finalization Contract Fixes

**Phase:** 19
**Status:** Todo
**Strategic Goal:** The four contracts authored 2026-08-07 become code. A phase link stops contradicting its own destination; the plan-complete funnel stops recommending the command that just produced nothing; the one defect shipped ahead of its spec gains the regression protection it never had; and the CHANGELOG anomaly gets root-caused instead of guessed at.

## Atomic Checklist

- [ ] [T-19A01] Rewrite the self-labelling phase link in PLAN.md on archival
- [ ] [T-19B01] Pre-flight signal for a design-debt-only backlog
- [ ] [T-19C01] Root-cause the duplicate `### Changed` heading
- [ ] [T-19D01] Harness — archival index rewrite
- [ ] [T-19D02] Harness — decision-section structure (replaces a blind assertion)
- [ ] [T-19D03] Harness — design-debt Pre-flight signal
- [ ] [T-19T01] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-19A01] Rewrite the self-labelling phase link in PLAN.md on archival

- **Spec:** l2-engine-finalization.md §7.3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (archiver)
- **Files:** `.magic/scripts/lib/phase-archiver.js`
- **Verify:** Archive a fixture whose `PLAN.md` contains `[tasks/phase-3.md](tasks/phase-3.md)` and, separately, the bare string `tasks/phase-3.md` inside a prose sentence. After archival: the link reads `[archives/tasks/phase-3.md](archives/tasks/phase-3.md)`; the prose occurrence is byte-identical to before; `TASKS.md`'s `[Phase 3](...)` label is unchanged.
- **Handoff:** Gates T-19D01.
- **Notes:** Scope the rewrite to the exact `[{path}]({path})` self-labelling form — **not** a global replace of the path string. `PLAN.md` legitimately mentions phase paths in narrative (phase descriptions, Backlog entries citing prior work), and those mentions describe history; rewriting them would corrupt the record in the same way the current bug corrupts the link. `updateTasksIndex()` must not be touched: its label is a phase number, which stays true across the move, so it is structurally immune rather than accidentally correct. Five consecutive archivals (Phases 14-18) reproduced this; each was corrected by hand afterward.

### [T-19B01] Pre-flight signal for a design-debt-only backlog

- **Spec:** l1-session-continuity.md SC-2.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (plan-complete disambiguation)
- **Files:** `.magic/scripts/check-prerequisites.js`, `.magic/task.md`
- **Verify:** Against a fixture with all specs `Stable`, all phases `Done`, and a `PLAN.md` `## Backlog` holding at least one open item, `check-prerequisites --json` emits a typed warning naming the open-item count. Against the same fixture with an empty Backlog, it does not. `.magic/task.md` Pre-flight documents the branch and the single recommendation it raises.
- **Handoff:** Gates T-19D03.
- **Notes:** **Read this before writing code — there is an apparent contradiction with a clean resolution.** SC-2.4 requires the engine to say something true when the plan is complete but the backlog holds design work; SC-2.2 forbids `/magic.spec` in `Next Action` and requires exactly one command there. Those cannot both be satisfied *in that field* — the truthful recommendation is precisely the forbidden one. The resolution is to not touch that field at all: emit the signal from **Pre-flight**, and let it raise the HALT that `rules/magic.md` §5 already sanctions (`no → HALT: /magic.spec, then /magic.task`). `computeNextAction()` stays exactly as it is, SC-2.2 stays intact, and the funnel stops being circular because the HALT — not a hardcoded branch — is what surfaces spec authoring. Prefer `check-prerequisites.js` over a purely cognitive step in `task.md`: a typed warning is testable, and since the warning helper already forwards into the diagnostics sink, the signal reaches the digest for free. Distinguishing an *open* backlog item from prose in the same section is the real work here — anchor on list-item lines within the `## Backlog` section and apply the shared strip helper first, per the mention/use boundary.

### [T-19C01] Root-cause the duplicate `### Changed` heading

- **Spec:** l2-finalize-output-contract.md §4.3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (investigation)
- **Files:** none (investigation; no production edit in this task)
- **Verify:** The mechanism that produced a second `### Changed` inside `[Unreleased]` is identified and stated with evidence — either reproduced against a fixture, or traced to a specific historical commit/logic that no longer exists. Finding recorded via `executor.js record-diagnostic`. If reproducible, a minimal failing fixture is captured for the follow-up fix.
- **Handoff:** Output routes to `/magic.spec` to amend §4.3 with the diagnosis; **no CHANGELOG fix may be planned or written before this completes** (§4.4 constraint 4).
- **Notes:** This is deliberately an investigation, not a fix — §4.4 states four constraints and explicitly declines to prescribe a `Required Fix`, because the obvious remedy (specific bullets) is exactly what RC-11 forbids, and because wiring in `releaseUnreleased()` first requires deciding what constitutes a release. The leading hypothesis is already **eliminated**: `nextH2Index()` truncating the Unreleased block would hide the first `### Changed` from the category probe, but no `## `-form line exists between the `[Unreleased]` heading and the next version heading — verified by direct inspection, do not re-test it. Start instead from `insertIntoUnreleased()`'s `else` branch (category-missing → append at end of block) and from whether the current insert logic predates the entries involved. Do not "fix" the live `CHANGELOG.md` by hand as part of this task: the duplicate is evidence until it is explained.

### [T-19D01] Harness — archival index rewrite

- **Spec:** l2-engine-finalization.md §7.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with a case asserting all three properties from T-19A01's Verify line in one fixture: link label and target both moved, prose mention untouched, `TASKS.md` phase-number label unchanged.
- **Handoff:** Required T-19A01.
- **Notes:** Asserting only the link would pass a naive global replace — which is the specific over-correction §7.3 rules out, so the prose-untouched assertion is the one carrying the contract. Three tasks in this track write the same file; execute D01 → D02 → D03 in order.

### [T-19D02] Harness — decision-section structure (replaces a blind assertion)

- **Spec:** l2-finalize-state-accuracy.md §8.4, §9 (open obligation)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with a case asserting the emitted `## Recent Decisions` **shape**: heading followed by a blank line, comment preamble above the entries rather than below them, no run of consecutive blank lines, and no `{YYYY-MM-DD}` template placeholder row surviving alongside a real entry. The pre-existing presence-only assertion is **removed**, not left beside it.
- **Handoff:** Required nothing — the code fix shipped at engine 2.1.67; this closes its coverage gap.
- **Notes:** The assertion being replaced is `/## Recent Decisions[\s\S]*{entry}/`, whose `[\s\S]*` matches any distance — it passed identically before and after the fix, so it is structurally incapable of catching this class. Leaving it in place alongside a new case would preserve a test that passes under the very defect the new case excludes, which is why §9 says *replace*, not *supplement*. This is the one defect in the state-accuracy spec currently shipped without regression protection.

### [T-19D03] Harness — design-debt Pre-flight signal

- **Spec:** l1-session-continuity.md SC-2.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with a case covering both directions: a plan-complete fixture **with** open backlog items emits the typed warning; the same fixture with an empty `## Backlog` does not. Assert the negative case explicitly — a signal that fires unconditionally is indistinguishable from one that works, and would make every clean plan-complete state raise a spurious HALT.
- **Handoff:** Required T-19B01.
- **Notes:** The negative assertion is the load-bearing half. SC-2.4's whole point is *distinguishing* two plan-complete states, so a test that only proves the signal can fire proves nothing about the distinction.

### [T-19T01] Validation — C14 bump, full harness, meta parity

- **Spec:** l2-engine-finalization.md §7; l1-session-continuity.md SC-2.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Four criteria, all required: `update-engine-meta` bumps 2.1.67 → 2.1.68 with checksums regenerated; `node --test dev/tests/engine.js` fully green; `update-engine-meta --check` reports no drift; `check-prerequisites --verify-headers --workspace=engine` returns `"ok": true`.
- **Handoff:** Required every preceding task except T-19C01, which produces no production edit.
- **Notes:** C14 runs **once**, here. Then run a real finalize and read its own output: this phase changes what the archiver writes into `PLAN.md` and what Pre-flight reports, so the phase's own closing archival is the end-to-end check for T-19A01 — if the link it writes still contradicts its label, the fix failed regardless of what the harness says. Expect the diagnostics digest to carry T-19B01's new warning if the backlog still holds open items at that moment; that is correct behavior, not a regression.
