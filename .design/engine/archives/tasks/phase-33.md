---
phase: 33
name: "Significance Read-Failure Fix & Confirmed Self-Containment Cleanup"
status: Done
subsystem: ".magic/scripts/lib"
requires: []
provides:
  - "lib/significance.js snapshotHashes(): a third snapshot state, the literal string 'UNREADABLE', for a whitelisted file that exists but cannot be read — distinct from null (does not exist) — l2-engine-finalization.md §9.2"
  - "finalize.js: SIGNIFICANCE_HASH_UNREADABLE diagnostic, recorded once per unreadable path immediately after computeSignificance(), covering both the significant and non-significant branches"
  - "update-state.js: zero remaining spec-file citations in its JSDoc comments (RC-8 widened compliance) — plain-language rationale kept in place of each one"
key_files:
  created: []
  modified:
    - ".magic/scripts/lib/significance.js"
    - ".magic/scripts/finalize.js"
    - ".magic/scripts/update-state.js"
    - "dev/tests/engine.js"
patterns_established:
  - "A read failure the caller cannot recover from gets a third snapshot state (distinct from both the real value and 'absent'), not a wider catch around the whole caller — the retry/throw contract other callers rely on stays untouched, and 'could not tell' is never folded into 'nothing changed'."
  - "Fixing a spec-citation leak restates the comment's already-present plain-language rationale in place of the file-name parenthetical — it does not delete the sentence, and it does not swap one forbidden filename for another (a corrected-but-still-cited pointer)."
duration_minutes: ~
---

# Stage 33 Tasks — Significance Read-Failure Fix & Confirmed Self-Containment Cleanup

**Phase:** 33
**Status:** Done
**Strategic Goal:** Implement [l2-engine-finalization.md](../specifications/l2-engine-finalization.md) §9 (R44 — an unreadable whitelisted file no longer aborts `finalize`) and remediate the one already-confirmed RC-8 reference-containment leak in `update-state.js` left behind by [l1-sdd-reference-containment.md](../specifications/l1-sdd-reference-containment.md) v1.6.0's widened engine-directory scope.

## Atomic Checklist

- [x] [T-33A01] `lib/significance.js`: catch a per-file hash failure in `snapshotHashes()`, record `'UNREADABLE'`
- [x] [T-33A02] `finalize.js`: treat `'UNREADABLE'` as changed in the significance diff; record `SIGNIFICANCE_HASH_UNREADABLE`
- [x] [T-33B01] `update-state.js`: remove the confirmed spec-file/section citations from its JSDoc comments (RC-8)
- [x] [T-33T01] Validation: significance read-failure regression (directory-at-`STATE.md`, control case)
- [x] [T-33T02] Validation: full suite green + Track B citation removal confirmed; C14 bump

## Detailed Tracking

### [T-33A01] `lib/significance.js`: catch per-file hash failure, record `'UNREADABLE'`

- **Spec:** l2-engine-finalization.md §9.2
- **Status:** In Progress
- **Assignment:** Agent
- **Verify:** `snapshotHashes()` wraps its `hashFileSafe` call per path in try/catch; on catch, the path's value is the literal string `'UNREADABLE'`, never `null` and never a re-thrown exception. A genuinely absent path is unaffected — still `null` via the existing `fs.existsSync` guard, not routed through the new catch.
- **Status:** Done
- **Changes:** `snapshotHashes()` now checks `fs.existsSync` first (unchanged `null` path), then wraps `hashFileSafe(abs)` in try/catch, storing `'UNREADABLE'` on catch. `hashFileSafe` itself untouched. `diffSnapshots()` needed no change — plain string inequality already treats `'UNREADABLE'` as different from any prior value, so the fallback (no-git) significance path already reads it as changed for free. `node --check` passes.
- **Handoff:** T-33A02 consumes the new sentinel value in the significance diff.
- **Notes:** Do not change `hashFileSafe`'s own retry count or its `throw` on final failure — other callers may still rely on that contract. The catch belongs at the `snapshotHashes()` call site, which is new to this function; `hashFileSafe` itself is unmodified.

### [T-33A02] `finalize.js`: fail-safe diff + `SIGNIFICANCE_HASH_UNREADABLE`

- **Spec:** l2-engine-finalization.md §9.2
- **Status:** In Progress
- **Assignment:** Agent
- **Verify:** `computeSignificance()`'s diff against `lastSnapshot` treats any path whose new value is `'UNREADABLE'` as changed, regardless of what `lastSnapshot` held for it. `finalize.js` records one `diagnostics.record()` call per such path: `severity: 'error'`, `source: 'finalize'`, `code: 'SIGNIFICANCE_HASH_UNREADABLE'`, message naming the file and the underlying read error. The invocation completes normally (exit 0) on both `--workflow=run` and `--workflow=task` — no uncaught throw anywhere in the call chain.
- **Status:** Done
- **Changes:** Added a loop right after the `computeSignificance()` call (before the significant/non-significant branch, so it covers both) that records `SIGNIFICANCE_HASH_UNREADABLE` for every `sig.nextSnapshot` entry equal to `'UNREADABLE'`. No separate "treat as changed" logic was needed in `finalize.js` itself: in the normal git-available path, `significant` is computed from `git diff`, not from hash comparison, so it is already unaffected by a hash failure (A01 already stops the crash that previously escaped there); in the no-git fallback path, `diffSnapshots()`'s plain string inequality already reads `'UNREADABLE'` as different from any prior value, so it was already correct for free. `node --check` passes.
- **Handoff:** T-33T01 validates this end-to-end.
- **Notes:** Same diagnostic taxonomy as the existing `STATE_UPDATE_SKIPPED` site a few lines away in the same file — reuse its shape, not a new mechanism.

### [T-33B01] `update-state.js`: remove confirmed spec-citation comments

- **Spec:** l1-sdd-reference-containment.md RC-8 (widened), RC-2 forbidden classes
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "l1-\|l2-" .magic/scripts/update-state.js` (or equivalent) returns zero hits that are spec-file-name citations in a comment — the confirmed cases include `l2-finalize-state-accuracy.md section 13`, `l2-update-state-structure.md §8.5`, and their siblings throughout the file's JSDoc blocks. Design rationale the comment was carrying (the *why* — e.g. why a given regex/guard exists) is restated in plain language in place, per RC-3; it is not deleted outright where it explains a non-obvious constraint.
- **Handoff:** T-33T02's grep re-confirms this file specifically.
- **Changes:** Removed all 9 `l2-finalize-state-accuracy.md §N` citations (the file was decomposed since these were written — citing it was already both an RC-8 leak and factually stale) plus the `l1-session-continuity.md` filename prefix from one `(SC-1.2)` reference, keeping the bare protocol label per RC-9's carve-out. Every sentence's plain-language rationale was left intact — only the trailing/embedded file-name citation was dropped. `node --check` confirms syntax; `grep -n "l1-\|l2-"` now returns zero hits.
- **Notes:** **Scope is this one file only** — it is the case already read and confirmed line-by-line during the RC-8 planning pass. The other 15 files a raw pattern grep also flagged (`utils.js`, `phase-files.js`, `check-prerequisites.js`, `scan-hygiene.js`, …) were not individually triaged: several legitimately *implement* the task-ID/phase-file/spec-name recognition logic itself (regex definitions, registry parsing) rather than *citing* a specific spec as provenance, which is mention-vs-use territory (SH-1) requiring the same cognitive judgment `/magic.analyze`'s `SDD_REFERENCE_LEAK` scan already applies. Do not sweep those files as part of this task — a follow-up `/magic.analyze` pass, now correctly scoped to include engine directories in this repository (per the widened RC-8), is the right tool for a complete inventory.

### [T-33T01] Validation: significance read-failure regression

- **Spec:** l2-engine-finalization.md §9.3
- **Status:** In Progress
- **Assignment:** Agent
- **Verify:** New `dev/tests/engine.js` case(s): a fixture with a directory at the `STATE.md` path, run under `--workflow=run`, asserts exit 0, a `SIGNIFICANCE_HASH_UNREADABLE` diagnostic naming `STATE.md`, and that the significant-path branch ran. A second, control case with a genuinely absent (never-created) whitelisted file asserts the existing `null`/unchanged behavior is untouched. Both negative-controlled (fail against the pre-fix code).
- **Status:** Done
- **Changes:** Added `runFinalizeRunWithState()` (shared setup, mirrors `runFinalizeCheckpoint`'s directory-block technique but drives `--workflow=run` directly) plus two cases: the R44 fixture (exit 0, `SIGNIFICANCE_HASH_UNREADABLE` naming `STATE.md`) and its control (genuinely absent file, no diagnostic). Mutation-checked live: `git stash` on just `significance.js`'s fix reproduced `1 !== 0` on the R44 case, confirming it catches the defect; `git stash pop` restored the fix and both cases went green again.

### [T-33T02] Validation: full suite + Track B confirmation + C14

- **Goal:** Confirm the whole tree is green and the confirmed leak is actually gone, then close the phase's single C14 bump.
- **Method:** `node --test dev/tests/engine.js` (expect all passing, prior count + 2 new); `grep -rn "l1-\|l2-" .magic/scripts/update-state.js` shows no remaining spec-file citations; `node .magic/scripts/executor.js update-engine-meta` (both `lib/significance.js` and `update-state.js` are inside `.magic/` → one C14 run covers both tracks, no `--workflow` tag since no `.magic/*.md` workflow body changes in this phase).
- **Status:** Done
- **Changes:** Full suite 140/140 (138 → 140, the two new R44 cases). `grep -rn "l1-\|l2-" .magic/scripts/update-state.js` returns zero hits. C14: engine 2.1.106 → 2.1.107, three files detected (`finalize.js`, `lib/significance.js`, `update-state.js`), checksums regenerated, dev-repo Engine Version snapshot synced.
