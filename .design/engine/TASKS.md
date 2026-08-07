# Master Task Index (Registry)

**Version:** 1.24.0
**Generated:** 2026-08-07
**Based on PLAN:** .design/engine/PLAN.md v1.22.0
**Based on RULES:** .design/RULES.md v1.9.0
**Execution Mode:** Parallel
**Status:** Active

## Overview

Tactical registry of all phases and their statuses. **Plan complete**: all 19 phases (2-20) are Done; 32 specs registered and Stable (INDEX v1.18.0); engine at 2.1.69. Phase 20 implemented the two backlog items closed by the `/magic.spec` pass that followed Phase 19's own first-ever `DESIGN_DEBT_PENDING` firing: `release-changelog.js` (R11 remainder — explicit opt-in CHANGELOG rotation, since magic-spec cannot observe a downstream consumer's release event) and the `EXEMPT` coverage classification (`.design/` bookkeeping/journal files no longer count against `analyze-coverage.js`'s reported percentage — 85.4% → 96.5% on this workspace). Harness 57 → 62. Phase 19 implemented the four contracts authored by the 2026-08-07 spec pass that also decomposed `l2-engine-finalization.md` at 367 lines: R10 closed (archival index rewrite — confirmed live on the phase's own PLAN.md entry, ending a run of five consecutive hand-corrections); R13 closed (`DESIGN_DEBT_PENDING` Pre-flight signal, `l1-session-continuity.md` SC-2.4 — the SC-2.2 ↔ SC-2.4 tension resolved by routing the signal through Pre-flight's HALT rather than touching `computeNextAction()`, exactly as recorded in PLAN.md before implementation); R12 closed (structural harness coverage for the `addDecision` fix that had shipped ahead of its spec, negative-controlled against the reconstructed pre-fix logic); R11 advanced but not closed (the duplicate-`### Changed`-heading anomaly root-caused via `git blame`/`git show` to two 2026-05 manual edits predating the automated writer — no CHANGELOG fix was written, per the investigation's own governing constraint; routes to `/magic.spec` for the follow-up). Harness 55 → 57. Phase 18 implemented the Engine Diagnostics Digest (`l1-engine-diagnostics.md` DG-1..DG-9, `l2-engine-diagnostics.md`): non-fatal engine findings are now recorded to a sink and delivered as one digest immediately before the next step, closing a defect found during authoring — the Finalization Protocol binds the agent to relay **stdout**, while all 17 non-fatal findings across 6 scripts were written only to **stderr**, invisible by contract rather than by any one script's oversight. Twelve tasks across five tracks (A gated all; B preceded D on shared `finalize.js`; E — the sole track outside C14 tracking, carrying **[C-001]** — was file-independent of the rest); harness 46 → 55. INDEX v1.15.15 carried nine spec amendments authored since PLAN v1.15.2 and never implemented — Phases 15-16 were that implementation backlog, not new scope, and it is now closed. Phase 15 implemented the eight `Required Fix` blocks in l2-engine-finalization 1.10.0 §7-§10 (SC-1.2, SC-2.1(a), SC-2.3, SC-3.1, RC-11), all re-verified present in engine 2.1.62 before execution; harness 34 → 43. Phase 16 deployed the two prose-only amendments (WI-10 documentation parity across all three `init.md` claim surfaces plus the cognitive suite, RC-12 scaffold-removal check in ventilation and ambient rules). R8 documented (l2-release-pipeline §5.3); R9 (AGENTS hardlinks) operational — `/magic.dev.init`; R10, R11 (new this phase — CHANGELOG dedup suppresses genuine entries), the §8.7 known gap, and the pending debt-ceiling convention are tracked in PLAN.md Backlog with their routing.

## Active Phases

*None — plan complete. New scope enters via `/magic.task`.*

## Completed Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase 2](tasks/phase-2.md) | Skill Projection & Agent Surface Implementation | `Done` |
| [Phase 3](archives/tasks/phase-3.md) | Unified Role System — `.magic/roles/` + workflow integration | `Done (Archived)` |
| [Phase 4](archives/tasks/phase-4.md) | Prompt Quality Gate — `prompt-engineer` card #14 + five workflow gates | `Done (Archived)` |
| [Phase 5](archives/tasks/phase-5.md) | Decision Autonomy — C27 constitution anchoring + DA-6 posture + role binding | `Done (Archived)` |
| [Phase 6](archives/tasks/phase-6.md) | SDD Reference Containment — ambient rules + RC-5/RC-6 card gates + RC-7 leak scan | `Done (Archived)` |
| [Phase 7](archives/tasks/phase-7.md) | Shipped Self-Containment — RC-9 purge of 15 engine-workspace references | `Done (Archived)` |
| [Phase 8](archives/tasks/phase-8.md) | Session Continuity & Status Command — finalize SC-2/SC-3 wiring + `/magic.status` surface | `Done (Archived)` |
| [Phase 9](archives/tasks/phase-9.md) | DA-9 Engine Deployment — proposal surfaces (spec.md / analyze.md / task.md) to narrate-and-act form | `Done (Archived)` |
| [Phase 10](archives/tasks/phase-10.md) | Session-Continuity Hardening — plan-state-aware next-action + finalize test coverage | `Done (Archived)` |
| [Phase 11](archives/tasks/phase-11.md) | Archiver Eligibility Fix (R7) — anchored checklist match + re-archive phase-10 | `Done (Archived)` |
| [Phase 12](archives/tasks/phase-12.md) | Wrapper-Body Parity Check (R4) — WRAPPER_BODY_DRIFT in analyze Mode C | `Done (Archived)` |
| [Phase 13](archives/tasks/phase-13.md) | Upgrade-Detection DA Alignment — §1 `[y/n]` → single-path narration | `Done (Archived)` |
| [Phase 14](archives/tasks/phase-14.md) | Shipped Reference Hygiene & Documentation Sync — skill-projection extension guard, `rules/magic.md` case purge, docs sync, SDD-layer backfill | `Done (Archived)` |
| [Phase 15](archives/tasks/phase-15.md) | Finalize-Pipeline Accuracy & Generator Containment — §7-§10 fixes + 9 harness cases | `Done (Archived)` |
| [Phase 16](archives/tasks/phase-16.md) | Documentation Parity & Scaffold Boundary — WI-10 init surfaces + RC-12 §4.4 check | `Done (Archived)` |
| [Phase 17](archives/tasks/phase-17.md) | Scan Input Hygiene — shared strip helper + SH-1/SH-3/SH-4 bindings across four scans | `Done (Archived)` |
| [Phase 18](archives/tasks/phase-18.md) | Engine Diagnostics Digest — collector + JSONL sink, finalize tail emitter (digest → next step), agent channel, 17-emitter migration | `Done (Archived)` |
| [Phase 19](archives/tasks/phase-19.md) | Finalization Contract Fixes — archival index rewrite, plan-complete Pre-flight signal, decision-section coverage, CHANGELOG anomaly root-cause | `Done (Archived)` |
| [Phase 20](archives/tasks/phase-20.md) | Backlog Implementation — Release Rotation (R11 remainder) & Coverage Denominator Scope (EXEMPT) | `Done (Archived)` |

## Backlog

*None at phase level — R11 (remainder) and the coverage-metric denominator moved from [PLAN.md](PLAN.md) Backlog into Phase 20's scope once their design decisions closed this session; `UNSCOPED dev/` closed directly (no code, `workspace.json` edit only). What remains in Backlog is genuine design work with no forced ordering — the `Status`-recompute question, the debt-ceiling convention (`/magic.rule` ratification), the dev-repo snapshot drift, and R8/R9 which are documented-not-fixed by decision. One `SPEC_BLOAT` watch item and two permanently-settled entries (deferred/rejected), no longer actionable.*

## Meta Information

- **Last Updated**: 2026-08-07
- **Maintainer**: Core Team
