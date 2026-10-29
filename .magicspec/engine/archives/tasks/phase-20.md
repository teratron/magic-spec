---
phase: 20
name: "Backlog Implementation — Release Rotation & Coverage Denominator"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "release-changelog.js: explicit opt-in CHANGELOG [Unreleased] rotation (R11 remainder closed)"
  - "analyze-coverage.js EXEMPT classification: SDD bookkeeping/journal files excluded from the coverage denominator"
key_files:
  created:
    - ".magic/scripts/release-changelog.js"
  modified:
    - ".magic/scripts/finalize.js"
    - ".magic/scripts/analyze-coverage.js"
    - ".magic/analyze.md"
    - "dev/tests/engine.js"
patterns_established:
  - "Explicit opt-in executor subcommand for actions the engine cannot infer from any observable signal (mirrors record-diagnostic.js, Phase 18)"
duration_minutes: ~
---

# Stage 20 Tasks — Backlog Implementation

**Phase:** 20
**Status:** Done
**Strategic Goal:** Implement the two backlog items whose design decisions were closed this session and marked "Ready for /magic.task": R11's `release-changelog` rotation contract ([l2-finalize-output-contract.md](../specifications/l2-finalize-output-contract.md) v1.1.0 §4.4) and the coverage-metric `EXEMPT` classification ([l2-engine-automation.md](../specifications/l2-engine-automation.md) v1.7.0 §Coverage Denominator Scope). Both are file-independent (different scripts) and run as parallel tracks; a single Track T queues the shared-file regression coverage.

## Atomic Checklist

- [x] [T-20A01] Create `release-changelog.js` CLI (explicit opt-in CHANGELOG rotation)
- [x] [T-20A02] Remove dead `releaseUnreleased` import from `finalize.js`
- [x] [T-20B01] Implement `EXEMPT` classification in `analyze-coverage.js`
- [x] [T-20B02] Update `.magic/analyze.md` Confidence Taxonomy documentation
- [x] [T-20T01] Regression coverage — release-changelog rotation + distinguishability
- [x] [T-20T02] Regression coverage — EXEMPT classification
- [x] [T-20T03] Full harness run + C14 sync

## Detailed Tracking

### [T-20A01] Create `release-changelog.js` CLI

- **Spec:** l2-finalize-output-contract.md §4.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js release-changelog --version=9.9.9 --date=2026-01-01` against a scratch `CHANGELOG.md` fixture (populated `[Unreleased]`) renames it to `## [9.9.9] - 2026-01-01` and leaves a fresh empty `[Unreleased]` above it; confirmed live against a scratch fixture (both a populated and a since-emptied `[Unreleased]` — the second run also rotates, producing an empty dated section, matching `releaseUnreleased()`'s existing documented contract, not a new behavior).
- **Handoff:** T-20T01 pins this behavior in the harness.
- **Notes:** Mirrors `record-diagnostic.js`'s shape (Phase 18 precedent) — a thin CLI over an existing library function (`releaseUnreleased()` in `lib/changelog-writer.js`, unchanged). Defaults: `--version` from `.design/.version` (`project-version.js#readVersion`), `--date` from today (UTC, `YYYY-MM-DD`). No dry-run flag of its own — inherits `utils.isDryRun()` via `writeFileSafe()` the same way every other write in this pipeline does. Never called from `finalize.js` or any other workflow — purely opt-in, per the design decision that magic-spec cannot observe a downstream consumer's release event.
- **Changes:** Created `.magic/scripts/release-changelog.js` (54 lines).

### [T-20A02] Remove dead `releaseUnreleased` import from `finalize.js`

- **Spec:** l2-finalize-output-contract.md §4.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "releaseUnreleased" .magic/scripts/finalize.js` returns no matches.
- **Handoff:** T-20T01's grep-based assertion pins this.
- **Notes:** The import was the concrete evidence cited in §4.2 ("imported and never called"); removing it closes that specific finding now that rotation lives in T-20A01 instead.
- **Changes:** Removed the unused `releaseUnreleased` named import from `.magic/scripts/finalize.js` (1 line).

### [T-20B01] Implement `EXEMPT` classification in `analyze-coverage.js`

- **Spec:** l2-engine-automation.md §Coverage Denominator Scope
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js analyze-coverage --json --workspace=engine` reports `summary.exempt: 24` (18 archived phase journals incl. phase-19 + PLAN/TASKS/STATE/CONTEXT/CHANGELOG/RETROSPECTIVE for this workspace, plus the global `.design/CONTEXT.md`), `summary.coverage_percent` rose 85.4% → 96.5% (24 fewer files diluting the denominator, `uncovered` dropped 25 → 2), and `.design/engine/archives/tasks/phase-19.md`'s `coverage[]` entry shows `confidence: "EXEMPT"` — confirmed live.
- **Handoff:** T-20T02 pins this; T-20B02 keeps the doc in sync.
- **Notes:** Basename match set (case-sensitive, under `.design/`): `PLAN.md`, `TASKS.md`, `STATE.md`, `CONTEXT.md`, `CHANGELOG.md`, `RETROSPECTIVE.md`. Path match: any segment named `archives` under `.design/`. Check runs before the existing 4-step `classifyFile()` pipeline (§2 exact-match / §3 dir-ref / sibling / grandparent), short-circuiting it. `specifications/`, `INDEX.md`, `RULES.md`, `workspace.json`, and active `tasks/*.md` are explicitly NOT in the match set (spec-scoped decision, §Coverage Denominator Scope).
- **Changes:** Added `EXEMPT` to `TAXONOMY`, `EXEMPT_BASENAMES` set, `isExemptFile()`, and the pre-check short-circuit in the main classification loop of `.magic/scripts/analyze-coverage.js`; `total` now sums the four non-exempt buckets explicitly; JSON `summary.exempt` and a human-readable EXEMPT row added.

### [T-20B02] Update `.magic/analyze.md` Confidence Taxonomy documentation

- **Spec:** l2-engine-automation.md §Coverage Denominator Scope
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md` §Confidence Taxonomy table has an `EXEMPT` row, and the `coverage_percent` formula line states EXEMPT is excluded from `total` entirely (not merely from the numerator, contrasting with how AMBIGUOUS is described).
- **Handoff:** C14 (T-20T03) — `.magic/` content changed.
- **Notes:** Engine Improvement (per project CLAUDE.md — `.magic/` write requires this classification). The parallel-doc-update requirement is stated explicitly in the governing spec so this task isn't missed by an implementer reading only the code-level Required Fix.
- **Changes:** `.magic/analyze.md` §Confidence Taxonomy: table gained the `EXEMPT` row (five-level taxonomy), `coverage_percent` formula note now states `total` explicitly and clarifies EXEMPT is excluded from it entirely, unlike AMBIGUOUS.

### [T-20T01] Regression coverage — release-changelog rotation + distinguishability

- **Goal:** Verify T-20A01/T-20A02 against l2-finalize-output-contract.md §5.
- **Method:** `node --test dev/tests/engine.js` — new cases: (1) `release-changelog` CLI rotates a fixture `[Unreleased]` correctly (per T-20A01's Verify); (2) two `appendBullet()` calls with identical bullet text separated by a `releaseUnreleased()` call both persist (once pre-rotation, once post-rotation) — the specific regression this fix targets; (3) `finalize.js` source contains no `releaseUnreleased` reference (grep-based, per T-20A02).
- **Status:** Done — 3 new cases (§17), all pass.

### [T-20T02] Regression coverage — EXEMPT classification

- **Goal:** Verify T-20B01 against l2-engine-automation.md §Coverage Denominator Scope.
- **Method:** `node --test dev/tests/engine.js` — new cases: (1) a fixture `PLAN.md`/`STATE.md`/archived phase file under `.design/{ws}/` classifies `EXEMPT`; (2) `summary.total`/`summary.coverage_percent` exclude EXEMPT files (construct a fixture where an EXEMPT file's presence/absence would change the percentage if wrongly counted, assert it doesn't); (3) `specifications/*.md` and `INDEX.md` are unaffected (still classify via the existing four-step pipeline).
- **Status:** Done — 2 new cases (§18), all pass.

### [T-20T03] Full harness run + C14 sync

- **Goal:** Confirm no regressions across the full suite and sync engine metadata.
- **Method:** `node --test dev/tests/engine.js` (expect prior count + 6 new ≥ passing); `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze`; `node .magic/scripts/executor.js update-engine-meta --check` (confirm no drift after).
- **Status:** Done — harness 57 → 62 (5 new: 3 from §17, 2 from §18 — one fewer than the 6 estimated at planning time; §17's third case and §18's two cases collapsed the originally-separate "specifications/ unaffected" assertion into an inline check inside the first §18 test rather than a standalone test). Engine 2.1.68 → 2.1.69 (`analyze.md`, `analyze-coverage.js`, `finalize.js`, `release-changelog.js`). Post-sync `update-engine-meta --check`: no drift.
