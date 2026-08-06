# Master Task Index (Registry)

**Version:** 1.19.1
**Generated:** 2026-08-06
**Based on PLAN:** .design/engine/PLAN.md v1.16.0
**Based on RULES:** .design/RULES.md v1.9.0
**Execution Mode:** Parallel
**Status:** Active

## Overview

Tactical registry of all phases and their statuses. Phases 2-15 are Done; 27 specs registered and Stable; engine at 2.1.63. Re-synced 2026-08-06 to INDEX v1.15.15, which carried nine spec amendments authored since PLAN v1.15.2 and never implemented — **Phases 15-16 are that implementation backlog**, not new scope. Phase 15 closed the eight `Required Fix` blocks in l2-engine-finalization 1.10.0 §7-§10 (SC-1.2, SC-2.1(a), SC-2.3, SC-3.1, RC-11), all re-verified present in engine 2.1.62 before execution; harness 34 → 43. Phase 16 remains: the two prose-only amendments (WI-10 documentation parity, RC-12 scaffold-removal check). The phases are file-independent but share `.magic/.checksums`, so they execute serially. R8 documented (l2-release-pipeline §5.3); R9 (AGENTS hardlinks) operational — `/magic.dev.init`; R10, the §8.7 known gap, and the pending debt-ceiling convention are tracked in PLAN.md Backlog with their routing.

## Active Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase 16](tasks/phase-16.md) | Documentation Parity & Scaffold Boundary — WI-10 init surfaces + RC-12 §4.4 check | `Todo` |

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

## Backlog

*None at phase level — all registered specs are Stable and either implemented or scheduled in Phases 15-16. Open non-phase items (R10, the §8.7 known gap, the pending debt-ceiling convention) are tracked in [PLAN.md](PLAN.md) Backlog.*

## Meta Information

- **Last Updated**: 2026-08-06
- **Maintainer**: Core Team
