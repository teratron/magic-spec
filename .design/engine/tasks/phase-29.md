---
phase: 29
name: "Concept-Only Spec Classification"
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

# Stage 29 Tasks — Concept-Only Spec Classification

**Phase:** 29
**Status:** Todo
**Strategic Goal:** Implement the `concept-only` marker specified in [l1-engine-core.md](../specifications/l1-engine-core.md) v1.7.0 (§Known Process Gaps — Concept-Only Classification) and [l2-engine-automation.md](../specifications/l2-engine-automation.md) v1.11.0 (§Coverage Denominator Scope): a Stable L1 spec with no currently-planned L2 implementation can be excluded from the "Stable L1 without L2 child" coverage-gap advisory without blocking anything, so the advisory can distinguish a deliberate design-library entry from genuine neglect.

## Atomic Checklist

- [ ] [T-29A01] Concept-only exclusion in the coverage-gap advisory
- [ ] [T-29A02] Precedence guard — a resolvable L2 child always overrides a stale marker
- [ ] [T-29B01] Advisory Report template gains the concept-only narration line
- [ ] [T-29T01] Harness coverage with negative controls
- [ ] [T-29T02] C14 bump and engine integrity verification

## Detailed Tracking

### [T-29A01] Concept-only exclusion in the coverage-gap advisory

- **Spec:** l2-engine-automation.md §Coverage Denominator Scope — concept-only spec extension
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** A Stable L1 spec header carrying `**Concept-Only:** true` is excluded from `analyze-coverage.js`'s "Stable L1 without L2 child" gap count; the exclusion is reported via a new `summary.conceptOnly` count in `--json` output (auditable, not silently dropped — same pattern as `summary.exempt`). Run against a fixture pair: one marked Stable L1 with no L2 child (excluded, counted in `summary.conceptOnly`), one unmarked Stable L1 with no L2 child (still counts as a gap — see T-29T01's negative control).
- **Handoff:** Gates T-29T01.
- **Notes:** **[DR] Marker format: a `**Concept-Only:** true` header field**, parallel to the existing `Version:`/`Status:`/`Layer:` fields — `analyze-coverage.js` already parses those headers for RE-1, so this reuses the same parse path instead of introducing a second parser (a comment marker or a `PLAN.md`-only annotation) with its own source of truth. (Override: re-open via `/magic.task engine "use a different marker format"` before this task starts.)

### [T-29A02] Precedence guard — a resolvable L2 child always overrides a stale marker

- **Spec:** l1-engine-core.md §Known Process Gaps — Concept-Only Classification ("auto-reverts the instant an L2 spec declares `Implements:` against it")
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** A Stable L1 spec carrying `**Concept-Only:** true` that already has a resolvable `Implements:`-pointing L2 spec on disk is classified normally (NOT excluded from the gap denominator) regardless of the marker. Implemented as live precedence in the same classification pass, not as a separate write step that edits the marker away — there is no persisted "cleared" state to go stale.
- **Handoff:** Gates T-29T01.
- **Notes:** This is the "auto-revert" behavior from the spec, restated as a read-time precedence rule rather than a write-time mutation: the marker only matters when nothing already resolves the gap, so a real child spec always wins without anyone having to remember to clear a flag.

### [T-29B01] Advisory Report template gains the concept-only narration line

- **Spec:** l2-engine-automation.md §Coverage Denominator Scope — concept-only spec extension; l1-engine-core.md §Known Process Gaps ("a rising count of concept-only specs is itself a health signal worth narrating")
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md`'s Advisory Report template renders a `concept-only` line when `summary.conceptOnly > 0`, phrased as a narrated signal (not a warning/HALT) that calls out a *rising* count across ventilation runs as worth attention. `.magic/analyze.md` §Confidence Taxonomy table (already amended for `EXEMPT` per the parallel-doc-update note in l2-engine-automation.md) is checked for consistency in the same pass.
- **Handoff:** Independent of T-29A01/A02's code; both must land before T-29T02's C14 bump.
- **Notes:** Doc-only change inside `.magic/` — no script logic here, just the report template line and taxonomy-table parity.

### [T-29T01] Harness coverage with negative controls

- **Spec:** l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node dev/tests/engine.js` green with three new cases: (a) a marked Stable L1 with no L2 child is excluded from the gap count and appears in `summary.conceptOnly`; (b) a marked Stable L1 that already has a resolvable `Implements:` L2 child is NOT excluded (T-29A02's precedence); (c) an **unmarked** Stable L1 with no L2 child still counts as a gap — the negative control proving existing behavior survives unchanged. `l2-test-suite.md` version bumped with its INDEX row matching.
- **Handoff:** Precedes T-29T02.
- **Notes:** Case (c) is the load-bearing one, per this repository's own established convention (Phase 28's T-28T01, Phase 19's R12): a feature that only ever passes on marked fixtures could be vacuously correct. Case (b) exercises T-29A02 specifically — it must fail if precedence is implemented backwards (marker overriding a real child instead of the reverse).

### [T-29T02] C14 bump and engine integrity verification

- **Spec:** RULES.md C14
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze` completes (tagged, since `.magic/analyze.md` — a workflow body — changed in T-29B01); `update-engine-meta --check` exits 0 afterward; `node dev/tests/engine.js` green; `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` returns `ok: true`.
- **Handoff:** Phase close.
- **Notes:** Both A-track (script) and B-track (workflow doc) changes land inside `.magic/` in this phase, so one tagged C14 run covers both — no separate untagged bump is needed first.

## Validation Coverage

`T-29T01` is this phase's validation task. The feature is pure script/doc logic with no workflow-prose behavior change beyond the new Advisory Report line, so coverage lives in the script harness (`dev/tests/engine.js`); the cognitive suite is not extended.
