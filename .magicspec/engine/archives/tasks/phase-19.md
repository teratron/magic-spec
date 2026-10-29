---
phase: 19
name: "Finalization Contract Fixes"
status: Done
subsystem: ".magic/scripts, .magic/scripts/lib, .magic, dev/tests"
requires: []
provides:
  - "phase-archiver.js rewrites self-labelling PLAN.md phase links atomically (label+target), leaving prose untouched"
  - "check-prerequisites.js DESIGN_DEBT_PENDING signal: Pre-flight can now HALT on a design-debt-only backlog"
  - "task.md documents the new Pre-flight branch and its single /magic.spec recommendation"
  - "CHANGELOG duplicate-heading anomaly root-caused: historical manual-edit artifact, not a live writer defect"
  - "addDecision structural coverage closed — the presence-only assertion that could not catch the class is replaced"
key_files:
  created: []
  modified:
    - .magic/scripts/lib/phase-archiver.js
    - .magic/scripts/check-prerequisites.js
    - .magic/task.md
    - dev/tests/engine.js
patterns_established:
  - "A generic target-only link rewrite plus a specific self-labelling rewrite, run in that order, handles both link shapes without a conditional branch — the specific pass consumes what it applies to, so the generic pass only ever sees what it should"
  - "A new Pre-flight signal is a warnings-array entry the calling workflow interprets into a HALT, not a change to check-prerequisites' own ok field — matches how File-Header Parity and Cross-Workspace Parity already work"
  - "A positive-marker check for an 'empty section' state is safer than an absence-of-pattern check — the latter defaults to true (fires) on any unrecognized content, the former defaults to false (does not fire) exactly when a HALT-capable signal should stay silent"
  - "git blame + git show on the exact heading line, not on the section, separates 'when was this text introduced' from 'what else did that commit touch' — the second question is what actually explains a historical anomaly"
duration_minutes: ~
---

# Stage 19 Tasks — Finalization Contract Fixes

**Phase:** 19
**Status:** Done
**Strategic Goal:** The four contracts authored 2026-08-07 become code. A phase link stops contradicting its own destination; the plan-complete funnel stops recommending the command that just produced nothing; the one defect shipped ahead of its spec gains the regression protection it never had; and the CHANGELOG anomaly gets root-caused instead of guessed at.

## Atomic Checklist

- [x] [T-19A01] Rewrite the self-labelling phase link in PLAN.md on archival
- [x] [T-19B01] Pre-flight signal for a design-debt-only backlog
- [x] [T-19C01] Root-cause the duplicate `### Changed` heading
- [x] [T-19D01] Harness — archival index rewrite
- [x] [T-19D02] Harness — decision-section structure (replaces a blind assertion)
- [x] [T-19D03] Harness — design-debt Pre-flight signal
- [x] [T-19T01] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-19A01] Rewrite the self-labelling phase link in PLAN.md on archival

- **Spec:** l2-engine-finalization.md §7.3
- **Status:** Done
- **Changes:** `updatePlanIndex()` in `phase-archiver.js` now runs two replacement passes per archived file: first the self-labelling form `[tasks/N.md](tasks/N.md)` → `[archives/tasks/N.md](archives/tasks/N.md)` (label and target rewritten as one atomic unit), then the pre-existing generic target-only pass for any remaining `(tasks/N.md)` occurrence with a non-path label.
- **Assignment:** Agent
- **Track:** A (archiver)
- **Files:** `.magic/scripts/lib/phase-archiver.js`
- **Verify:** Satisfied — smoke-tested through the public `archiveCompletedPhases()` API against a fixture combining a self-labelled link, a descriptively-labelled link, and a bare prose mention, all three of the same path: self-label moved atomically, descriptive label's target-only rewrite unaffected, prose byte-identical. Confirmed live against this repository's own `PLAN.md` at T-19T01 (Phase 19's own archival is the end-to-end check per this task's own Notes).
- **Handoff:** Gated T-19D01.
- **Notes:** Confirmed via `grep` before writing the fix that every "Tasks:" line in this project's own `PLAN.md` uses the self-labelling form exclusively (15 occurrences, Phases 4-19) — no descriptive-label variant exists in practice here, though the fix handles both.

### [T-19B01] Pre-flight signal for a design-debt-only backlog

- **Spec:** l1-session-continuity.md SC-2.4
- **Status:** Done
- **Changes:** `check-prerequisites.js` gained a `DESIGN_DEBT_PENDING` check: when `TASKS.md`'s `## Active Phases` section positively matches the engine's own `*None — ...*` empty-state marker (not merely "no phase-row pattern found" — that absence-only reading would fire on any malformed content too) **and** `PLAN.md`'s `## Backlog` section has ≥1 top-level bullet after `stripQuoted()`, it warns with the open-item count and `magic.spec {ws}` as the remedy. `.magic/task.md` Pre-flight (Step 1) gained a bullet documenting the HALT and its single-recommendation report, positioned alongside the other typed-warning branches.
- **Assignment:** Agent
- **Track:** B (plan-complete disambiguation)
- **Files:** `.magic/scripts/check-prerequisites.js`, `.magic/task.md`
- **Verify:** Satisfied — five scripted scenarios (fires on plan-complete + open backlog; silent on empty backlog; silent with an active phase; silent on ambiguous/malformed Active Phases content) all passed, plus a live check against this repository's own state (Phase 19 active — correctly did not fire).
- **Handoff:** Gated T-19D03.
- **Notes:** The apparent SC-2.2 ↔ SC-2.4 contradiction flagged in this task's own planning Notes resolved exactly as anticipated: the signal lives in Pre-flight's `warnings` array, `computeNextAction()` in `finalize.js` was not touched at all. First implementation pass used an absence-of-phase-row check for "plan complete" and a hardcoded exclusion for this project's own `frontend-specialist` Backlog line; both were wrong and caught by direct scripted testing before being written into the harness — the absence check fired on genuinely ambiguous content (case 4 of the scenario matrix), and the hardcoded exclusion was project-specific logic with no place in generic engine code. Both corrected: the marker check requires the positive `*None` text: the exclusion was removed entirely, since the Backlog has no markup distinguishing "open" from "deferred/rejected" and guessing from wording would be its own project-specific heuristic.

### [T-19C01] Root-cause the duplicate `### Changed` heading

- **Spec:** l2-finalize-output-contract.md §4.3
- **Status:** Done
- **Changes:** None (investigation-only, per spec). Root-caused via `git blame`/`git show` on the exact heading lines rather than further reasoning about `insertIntoUnreleased()`'s current logic (already traced and cleared in the parent spec). Finding recorded via `record-diagnostic`.
- **Assignment:** Agent
- **Track:** C (investigation)
- **Files:** none
- **Verify:** Satisfied — traced to two specific historical commits with direct diff evidence, not inferred.
- **Handoff:** Routes to `/magic.spec engine` to amend §4.3 with this diagnosis. No CHANGELOG fix was planned or written, per the spec's own constraint 4.
- **Notes:** **Finding**: the duplicate is a historical artifact of two manual, pre-automation edits to `CHANGELOG.md` — not a live defect in `insertIntoUnreleased()`. Commit `aea88015` (2026-05-07) created `## [Unreleased]` and its first `### Changed` section with content matching `buildChangelogBullet()`'s exact vocabulary ("Updated 5 specifications (engine)"), consistent with a genuine automated write. Commit `07f2fb96` (2026-05-14, one week later) directly inserted a **second** `### Changed` section immediately after `## [Unreleased]`, containing rich, multi-paragraph, hand-composed prose (numbered sub-lists, specific version citations) that `buildChangelogBullet()`'s tiny closed vocabulary cannot produce — alongside a broader diff touching four workflow bodies and a C14 checksum/version bump, the signature of a manually-composed Engine Improvement entry that bypassed `appendBullet()` entirely and never checked whether a `### Changed` category already existed further down the same block. `insertIntoUnreleased()`'s own category lookup (`catRe.match()`, non-global, position-independent) cannot itself produce two headings for one category from a clean write path — confirmed by re-tracing the logic before concluding this was historical rather than live. An initial hypothesis (block truncation via `nextH2Index()` misreading a stray `##`-form line) was tested and eliminated in the prior spec-authoring session; this task did not need to revisit it.

### [T-19D01] Harness — archival index rewrite

- **Spec:** l2-engine-finalization.md §7.4
- **Status:** Done
- **Changes:** New case in `dev/tests/engine.js` §7d, extending the existing PLAN.md/TASKS.md archival-rewrite test with a self-labelling-link fixture. Factored a shared `makeDoneShippingPhaseFixture()` helper for the phase-file + TASKS.md setup both tests in this section now share.
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — asserts all three properties in one fixture: self-labelled link's label and target both moved, a bare prose mention of the same path untouched, `TASKS.md`'s phase-number label unchanged.
- **Handoff:** Required T-19A01.
- **Notes:** An IDE duplication lint flagged the 31-line setup shared with the pre-existing adjacent test; factored into `makeDoneShippingPhaseFixture(tasksDir, wsDir)`, reducing both tests' openings to one call. A residual ~19-line flag remains on the two tests' shared `test(...) { try { ... } finally { cleanup } }` skeleton — left alone, matching the Phase 18 precedent: that skeleton repeats across dozens of pre-existing tests file-wide and is not a duplication either task introduced.

### [T-19D02] Harness — decision-section structure (replaces a blind assertion)

- **Spec:** l2-finalize-state-accuracy.md §8.4, §9 (open obligation)
- **Status:** Done
- **Changes:** The pre-existing `/## Recent Decisions[\s\S]*Adopt SDD workflow/` presence-only assertion in the `update-state.js` bootstrap test is replaced with four structural assertions: heading-then-blank-then-comment, entry-after-preamble (not before), no run of ≥2 consecutive blank lines anywhere in the file, and no surviving `{YYYY-MM-DD}` template placeholder row.
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — passes against the current (fixed) code. **Negative control performed**: reconstructed the pre-fix insertion logic exactly (the old `/^[^<]/m`-based offset search) against the real template, ran the new structural assertions against that reconstructed buggy output directly, confirmed all three content-bearing assertions fail against it. This is direct evidence the new test catches the class the old one could not, not an assumption.
- **Handoff:** None — the code fix shipped at engine 2.1.67; this closes its coverage gap.
- **Notes:** The old assertion is removed, not left beside the new ones — per the spec's own instruction, supplementing rather than replacing would leave a test that still passes under the excluded defect shape.

### [T-19D03] Harness — design-debt Pre-flight signal

- **Spec:** l1-session-continuity.md SC-2.4
- **Status:** Done
- **Changes:** New case in `dev/tests/engine.js` §6b2, covering four scenarios in one test: fires with the correct count on plan-complete + open Backlog; silent on plan-complete + empty Backlog; silent with an active phase regardless of Backlog content; silent on ambiguous Active Phases content.
- **Assignment:** Agent
- **Track:** D (harness)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all four scenarios pass in isolation and as part of the full suite.
- **Handoff:** Required T-19B01.
- **Notes:** The negative cases are the load-bearing half, matching this task's own planning Notes — a signal that fires unconditionally would be indistinguishable from a working one, and SC-2.4's entire point is the distinction.

### [T-19T01] Validation — C14 bump, full harness, meta parity

- **Spec:** l2-engine-finalization.md §7; l1-session-continuity.md SC-2.4
- **Status:** Done
- **Changes:** `update-engine-meta` run: engine 2.1.67 → 2.1.68, checksums regenerated over 69 files (3 detected as changed: `check-prerequisites.js`, `lib/phase-archiver.js`, `task.md` — exactly the three files this phase modified, no more).
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Satisfied, all four: version bumped 2.1.67 → 2.1.68; `node --test dev/tests/engine.js` → 57/57 (55 pre-existing + 2 net new — T-19D01 added a test, T-19D02 replaced assertions in an existing one, T-19D03 added a test); `update-engine-meta --check` → no drift; `check-prerequisites --verify-headers --workspace=engine` → `"ok": true`, `"warnings": []`.
- **Handoff:** Required every preceding task except T-19C01 (produced no code).
- **Notes:** The diagnostics sink held T-19C01's recorded finding at this point, correctly not yet drained — this phase's own closing `finalize --workflow=run` is what drains and renders it, per DG-4's "after every other step" ordering, so it was left in place rather than cleared early.
