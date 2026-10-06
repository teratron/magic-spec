# Master Task Index (Registry)

**Version:** 1.46.0
**Generated:** 2026-10-06
**Based on PLAN:** .design/engine/PLAN.md v1.47.0
**Based on RULES:** .design/RULES.md v1.15.0
**Execution Mode:** Parallel
**Status:** Active

## Overview

Tactical registry of all phases and their statuses: one row per phase, its status in the last column. The atomic checklist and the per-task tracking of a phase live in its workbook, `tasks/phase-{N}.md`, and in `archives/tasks/` once the phase is archived.

What a phase planned and produced is recorded in `PLAN.md`, in the workbook's `provides` frontmatter and in the workspace `CHANGELOG.md`. This section describes the ledger and tracks nothing.

## Active Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase 39](archives/tasks/phase-39.md) | Registry Text Contract & Question Routing Deployment — the routing clause in the always-on rules, the registry `Description` and ledger-overview form in `spec.md`, `task.md`, three templates and the docs, harness pins and cognitive cases, then a one-time rewrite of this workspace's registry and ledger | `Done (Archived)` |
| [Phase 38](archives/tasks/phase-38.md) | Skill-Wrapper Contract & Body Navigation Deployment — nine workflow descriptions in the Selection Signal form, generator validation and the C14 flow that finishes before failing, contents lists and whole-module pointers in the engine bodies, harness and cognitive coverage with a reader tier | `Done (Archived)` |
| [Phase 37](archives/tasks/phase-37.md) | Backlog Deployment — `Status` reconciliation from one shared ledger classification, pause-snapshot retirement (files, flag, field, resume branch) with a residue search, `RULES.md` in the spec whitelist, `dev/scripts/mutation-check.js` with self-test | `Done (Archived)` |

## Completed Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase 33](archives/tasks/phase-33.md) | Significance Read-Failure Fix (R44, `lib/significance.js`/`finalize.js`) & Confirmed Self-Containment Cleanup (`update-state.js`, RC-8) | `Done (Archived)` |
| [Phase 36](archives/tasks/phase-36.md) | Backlog Sweep — reference-containment cleanup (workflow bodies, scripts, library, product files) with a harness guard, tracked-files failure hint, audits of the `Status` writers and of the pause snapshot | `Done (Archived)` |
| [Phase 35](archives/tasks/phase-35.md) | Nothing-Pending Next Action — shared pending-work predicate (`lib/pending-work.js`), `check-prerequisites.js` and `finalize.js` consume it, `status.md` renders the command-free statement, harness cases and scenario T231 | `Done (Archived)` |
| [Phase 34](archives/tasks/phase-34.md) | Rule Admission Gate Deployment (RA-1..RA-9) — constitutional-reviewer admission step and DECLINE verdict, spec-critic Regulation Necessity, `rule.md` Admission step with review-before-write order, T1-T4 capture delegated to it, retirement findings in ventilation, wrappers and docs, cognitive scenarios T225-T230 | `Done (Archived)` |
| [Phase 32](archives/tasks/phase-32.md) | Automatic Session Checkpoints — Task Start record, `Attempts` dead-end field, one shared read-only `resume-state` script, checkpoint claim in finalize output, fill-percentage tiers replaced by post-compaction re-grounding, dead `Last Session Ended` field and phantom `/magic.pause` removed, cold-context rule in `rules/magic.md` §10 | `Done (Archived)` |
| [Phase 31](archives/tasks/phase-31.md) | Diagnostics Revalidation Before Render (DG-10) — condition findings (`check-prerequisites` warnings) carry a read-only `recheck`; the digest reruns it once per signature before every render and drops what no longer reproduces; self-reference guard prevents a recheck from re-queuing its own finding | `Done (Archived)` |
| [Phase 30](archives/tasks/phase-30.md) | Checksum Scan Hygiene, Git-Commit Scope Retirement, Fresh-Project Drift Silence — checksum scanners join Invariant 7 parity, write-side git prohibition retired from every agent-facing surface, `rules/magic.md` §1 fresh/unknown split | `Done (Archived)` |
| [Phase 29](archives/tasks/phase-29.md) | Concept-Only Spec Classification — `**Concept-Only:** true` header marker excludes a Stable L1 from `.magic/analyze.md`'s "Bare L1 without L2 children" advisory; planning mis-targeted `analyze-coverage.js`, corrected during Execute before any code was written | `Done (Archived)` |
| [Phase 28](archives/tasks/phase-28.md) | Silent-Failure Pair: Link Coverage & Regeneration Trigger — linked-pair inventory + table-driven validator covering `workflows/`, widened `[C-001]`, skill regeneration decoupled from the checksum verdict, harness negative controls | `Done (Archived)` |
| [Phase 27](archives/tasks/phase-27.md) | Idea Intake Gate Deployment (E6) — input-side clarification gate installed in `.magic/spec.md`, E6 registered across the DA-2 table + live constitution + distributed template + ambient rules, reviewer checks on the `prompt-engineer` card, user docs, cognitive suite coverage | `Done (Archived)` |
| [Phase 26](archives/tasks/phase-26.md) | Commit-Suggestion Feature Removal — strip message-composition from `commit-suggester.js`, flag/config/rendering machinery from `finalize.js`, dead config key from both `workspace.json` files | `Done (Archived)` |
| [Phase 25](archives/tasks/phase-25.md) | CHANGELOG Dedup Discoverability Hint — `finalize.js`'s deduped row names `release-changelog`; field-confirmed §4.5 fix, no bullet-content or dedup-logic change | `Done (Archived)` |
| [Phase 2](archives/tasks/phase-2.md) | Skill Projection & Agent Surface Implementation | `Done (Archived)` |
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
| [Phase 21](archives/tasks/phase-21.md) | check-prerequisites.js Registry-Scan Hygiene & Backlog Counter | `Done (Archived)` |
| [Phase 22](archives/tasks/phase-22.md) | Field-Report Triage — DESIGN_DEBT_PENDING Structural Predicate, Mode C Depth Control, Project-Auditor Citation | `Done (Archived)` |
| [Phase 23](archives/tasks/phase-23.md) | Next-Action Task-Level Precedence & Decision-Prune Honesty — Detailed Tracking `Status`/`Assignment` screen, terminal all-excluded branch, decision-prune claim correction | `Done (Archived)` |
| [Phase 24](archives/tasks/phase-24.md) | Dev-Repo Engine-Version Snapshot Sync — L2 snapshot writer, guarded L1 delegation, `rules/magic.md` §1 sole-writer carve-out; plus Track C, the Next Action title-stripping regression found by this phase's own planning run | `Done (Archived)` |

## Backlog

*As of 2026-09-20 the Backlog briefly held one open item awaiting design input — the decomposition of `l2-finalize-state-accuracy.md` (`SPEC_DECOMPOSE`, 552 lines), promoted from the Parked `SPEC_BLOAT` watch when its trigger fired — and a `/magic.spec engine` pass closed it the same day (the register plus [l2-update-state-structure.md](specifications/l2-update-state-structure.md) and [l2-update-state-values.md](specifications/l2-update-state-values.md)). What remains in [PLAN.md](PLAN.md) Backlog is Parked (the `Status`-recompute question, the `l2-engine-diagnostics.md` `SPEC_BLOAT` watch) or deferred (`frontend-specialist`), with no phase-level item; the narrative below is the 2026-09-13 state. None at phase level — Phase 29 came from the `/magic.spec` pass that immediately preceded this planning invocation, not the Backlog: the reference-mining finding was fully specified with no remaining design work (the one open fork — a new C-numbered convention for the `PLAN.md`-tagging behavior — was explicitly routed to `/magic.rule` as a separate, non-blocking follow-up, not left as a blocker here). Pre-flight returned `ok: true` after this pass's own drift reconciliation, with only the expected `SYNC_GAP` warning — no `DESIGN_DEBT_PENDING`. Phase 28 came from this retrospective's own R25/R26 recommendations, not the Backlog: both remedies were concrete enough at recording time that planning wrote their governing spec sections directly, with no `/magic.spec` pass and no item ever queued. Pre-flight returned `ok: true` with no warnings at plan time — no `DESIGN_DEBT_PENDING`. Phase 27 came through the normal design-then-plan handoff, not the Backlog: the `/magic.spec` pass that preceded it authored [l1-idea-intake-gate.md](specifications/l1-idea-intake-gate.md) from a live owner directive and closed every fork inside it, so no item ever queued. Pre-flight returned `ok: true` with only the two expected warnings (`ORPHANED_SPEC` for the new spec, `SYNC_GAP` on the registry version) — no `DESIGN_DEBT_PENDING`. Phase 26 absorbed the commit-suggestion feature-removal item, which left the Backlog when a second `DESIGN_DEBT_PENDING` HALT on an already-answered design question confirmed no design work remained (same pattern as Phases 20/21/25). Phase 24 absorbs the dev-repo Engine-Version snapshot exemption, which left the Backlog when its design question was answered at explicit user request (the item had sat Parked since 2026-06-12). What remains in [PLAN.md](PLAN.md) Backlog is entirely Parked (the `Status`-recompute question, the `SPEC_BLOAT` watch — now naming `l2-finalize-state-accuracy.md` at 313 lines) or genuinely deferred (`frontend-specialist` role card), none of it forcing ordering against Phase 24. Historical note — the `check-prerequisites.js` registry-scan hygiene fix and the `DESIGN_DEBT_PENDING` counter's Parked-marker support moved from [PLAN.md](PLAN.md) Backlog into Phase 21's scope once a second same-session `DESIGN_DEBT_PENDING` HALT confirmed no design work remained, and the user authorized Engine Improvement directly. The debt-ceiling convention closed by explicit user rejection (Escalation Whitelist E4) this same session — Phases 15-20 already closed the backlog it was meant to gate, with no hard ceiling ever existing. What remains in [PLAN.md](PLAN.md) Backlog is now Parked (the `Status`-recompute question, the dev-repo snapshot drift, the `SPEC_BLOAT` watch) or genuinely deferred (`frontend-specialist` role card) — none of it forces ordering against Phase 21.*

## Meta Information

- **Last Updated**: 2026-10-05
- **Maintainer**: Core Team
