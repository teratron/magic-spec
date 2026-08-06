# Master Task Index (Registry)

**Version:** 1.18.0
**Generated:** 2026-08-06
**Based on PLAN:** .design/engine/PLAN.md v1.15.0
**Based on RULES:** .design/RULES.md v1.9.0
**Execution Mode:** Parallel
**Status:** Active

## Overview

Tactical registry of all phases and their statuses. Phases 2-13 are Done; 27 specs registered and Stable; engine at 2.1.61. Re-synced 2026-08-06 to INDEX v1.15.5: the two multi-angle-review specs were registered but absent from the plan — both are now Completed (Baseline) retrospecs, since MA-1..MA-5 were verified live in the engine bodies. Nine archived-phase links in PLAN.md were repaired (the archiver gained its PLAN.md rewrite after those phases had already moved, so the backfill was never applied). **Phase 14 opens new scope** from the 2026-08-06 ventilation: references inside shipped artifacts that do not resolve on a case-sensitive filesystem, and a documentation set that under-reports the command surface it documents. R8 documented (l2-release-pipeline §5.3); R9 (AGENTS hardlinks) operational — `/magic.dev.init`.

## Active Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase 14](tasks/phase-14.md) | Shipped Reference Hygiene & Documentation Sync — skill-projection extension guard, `rules/magic.md` case purge, docs sync, SDD-layer backfill | `Todo` |

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

## Backlog

*None — all other registered specs are implemented and Stable.*

## Meta Information

- **Last Updated**: 2026-08-06
- **Maintainer**: Core Team
