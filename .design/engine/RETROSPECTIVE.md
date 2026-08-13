# SDD Retrospective

**Last Full Run:** 2026-08-13
**Full Sessions:** 3
**Snapshots:** 16

## Snapshots

Auto-collected after each phase completion. Lightweight metrics only — no analysis.

| Date | Phase | Specs (D/R/S) | Tasks (Done/Blocked/Cancelled) | Rules | Signal |
| --- | --- | --- | --- | --- | --- |
| 2026-06-12 | Phase 6 | 0/0/22 | 7/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 7 | 0/0/22 | 6/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 4 | 0/0/22 | 10/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 5 | 0/0/22 | 7/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 8 | 0/0/24 | 6/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 9 | 0/0/24 | 4/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 10 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 11 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 12 | 0/0/24 | 2/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 13 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 14 | 0/0/27 | 11/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 15 | 0/0/27 | 11/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 16 | 0/0/27 | 5/0/0 | 24 | 🟢 |
| 2026-08-07 | Phase 17 | 0/0/28 | 7/0/0 | 24 | 🟢 |
| 2026-08-07 | Phase 2 | 0/0/32 | 3/0/0 | 24 | 🟢 |
| 2026-08-13 | Phase 22 | 0/0/32 | 5/0/0 | 24 | 🟢 |

## Session 1 — 2026-06-12

**Scope:** Plan completion (Phases 4-7 executed in one cycle; Phases 2-3 pre-existing)
**Specs in registry:** 22 (all Stable)
**Tasks total:** 30 this cycle (Done: 30, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 4 phases / session | Manual | Engine 2.1.30 → 2.1.34, one C14 bump per phase |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 12/12 green after every phase |

### 📊 Observations

| # | Severity | Area | Observation | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | ✨ Positive | Spec quality | 30/30 tasks executed without spec revision mid-run — specs were executable as written; Signal reflects spec precision, not just throughput | 0 Blocked, 0 amendment round-trips during run phases |
| 2 | 🟡 Medium | Engine meta | Per-phase C14 bumps caused 3 engine-snapshot drifts in one session; each required a focused-scan snapshot update | `.magic/.version` 2.1.31/32/33/34 vs `.design/INDEX.md` snapshot churn |
| 3 | 🟡 Medium | Tooling | Edit-tool write-replace breaks the `rules/` ↔ `.agents/rules/` hardlink on every edit; recovery is manual (recreate + validate) | 3 hardlink recreations this session; constraint recorded as STATE.md C-001 |
| 4 | ✨ Positive | Governance | RC-9 recursion catch: the containment policy applied to itself exposed 15 latent leaks in shipped engine files | Shipped self-containment phase inventory |

### 💡 Recommendations

| # | Refs Observation | Recommendation | Target File |
| --- | --- | --- | --- |
| R1 | #2 | Batch multiple phases per engine release cycle, or update the snapshot once per session tail rather than per phase | `.magic/analyze.md` (snapshot contract) |
| R2 | #3 | Add a hardlink-repair step to the sync pipeline so broken `rules/` links self-heal instead of warn-only | `dev/scripts/sync.js` |
| R3 | #4 | Add a containment grep to the engine test harness so leak regressions fail CI, not just ventilation | `dev/tests/engine.js` |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 21 | 22 | +1 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 2 — 2026-06-12

**Scope:** Plan completion (Phase 8 — Session Continuity & Status Command; single-phase cycle from field directive to deployment)
**Specs in registry:** 24 (all Stable)
**Tasks total:** 6 this cycle (Done: 6, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24

### 🚀 DORA Metrics (L2 Implementation)

Manual input / external hook still required — same gap as Session 1.

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | Bootstrapped inventory specs drift from disk truth: the wrapper spec claimed a `.magic/graph.md` body that never existed; survived from v1.0.0 until the Phase 8 inventory sync touched the same table. | l2-workflow-wrappers.md 1.1.1 factual fix |
| 2 | C-001 (hardlink breakage on `rules/*.md` edits) fired exactly as documented and was repaired by the recorded procedure — the Blocking Constraints section pays for itself. | validate-hardlinks pass after recreate |
| 3 | No shadow logic: SC-2/SC-3 and the status command were spec-first (Stable before implementation); registry clean (check-prerequisites: 0 warnings). | Phase 8 task `Changes` fields |
| 4 | Engine snapshot drift (2.1.34 → 2.1.37) is pending §1 ratification — known mechanism, not a registry inconsistency; status command now reports it informationally. | `.magic/.version` vs `.design/INDEX.md` |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R4 | #1 | Add a wrapper-inventory parity check (workflows/ directory listing vs wrapper-spec structure table) to ventilation so phantom mappings fail the audit | `.magic/analyze.md` (Mode C) |
| R5 | #3 | Extend the engine harness with a finalize skip-path test (SC-2 state patch + SC-3 non-bumping suggestion) — current 12 tests do not cover finalize | `dev/tests/engine.js` |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 22 | 24 | +2 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 3 — 2026-08-13

**Scope:** Plan completion (Phase 22 — field-report triage: `DESIGN_DEBT_PENDING` structural predicate, Mode C Depth Control bypass, Project-auditor citation; single-phase cycle from three externally-submitted bug reports to deployment via `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 32 (all Stable; 4 amended this cycle — l1-session-continuity.md, l2-engine-automation.md, l1-engine-core.md, l2-role-cards-governance.md)
**Tasks total:** 5 this cycle (Done: 5, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged — no new convention needed)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.71 → 2.1.72, single C14 bump for the whole phase (three file-independent-enough tracks batched under one tag) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 64 → 65, green throughout |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | The `DESIGN_DEBT_PENDING` gate's plan-complete predicate had a second, distinct failure mode beyond the one Phase 21 closed: literal-marker matching against `## Active Phases` can never succeed again after any archival under the canonical single-table `tasks.md` template, independent of the Backlog counting fix. Two defects sharing one symptom (`DESIGN_DEBT_PENDING` silent) were fixed two phases apart because they were only found two phases apart. | l2-engine-automation.md §DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate |
| 2 | This engine's own `TASKS.md` and its `dev/tests/engine.js` fixtures both encode a `## Completed Phases` split that no shipped script (template, archiver, or otherwise) has ever produced — regression coverage was unknowingly scoped to a shape the shipped contract doesn't generate, which is exactly why Finding 1 shipped unnoticed for 21 phases. | grep across `.magic/` for "Completed Phases": zero hits outside `.design/engine/TASKS.md` and the pre-existing test fixtures |
| 3 | A Core Invariant framed as "mandatory" (Depth Control) was in practice never wired into Mode C's step list at all — only into the Shared Pre-flight for Modes A/B. The ambiguity the field report flagged was real at the text level but the runtime behavior it worried about (Mode C HALTing) could not actually have occurred; the fix closed the textual contradiction, not a live behavioral bug. | `.magic/analyze.md` line 117 scoped to `### Shared Pre-flight (Modes A & B)`; Mode C's own step list starts at "1. Self-Check" |
| 4 | All three bug reports arrived pre-triaged with exact file/line citations and reproduction evidence (external field reports, not this session's own discovery) — investigation time went to confirming reproduction against current HEAD and designing the fix, not locating the defect. | Bug reports cited engine 2.1.71 line numbers that matched HEAD at investigation time for all three |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R14 | #2 | Reconcile this engine's own `TASKS.md` to the canonical single-table template (drop the undocumented `## Completed Phases` split) so the workspace's own regression posture matches what it ships to users — currently the fixed defect cannot be observed on this repo's own dogfood copy | `.design/engine/TASKS.md` (operational cleanup, not a spec change) |
| R15 | #1 | When a `Required Fix` closes one failure mode of a named symptom (e.g. `DESIGN_DEBT_PENDING` silent), the amending spec should explicitly state what the fix does *not* cover, to reduce the odds of a second field report against the same symptom being mistaken for a duplicate | `l1-session-continuity.md` / spec.md authoring convention |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 28 (last consistently-logged snapshot, Phase 17) | 32 | +4 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |
