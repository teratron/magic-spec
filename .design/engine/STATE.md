# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-08-06 10:55
**Phase:** 14 — Shipped Reference Hygiene & Documentation Sync
**Status:** Done

## Current Position

- **Task:** T-14B02 Purge rules/MAGIC.md case drift from workflow wrappers; restore hardlinks
- **Spec:** l1-session-continuity.md (SC-1..SC-5) + l2-status-command.md (/magic.status)
- **Next Action:** Plan complete — run /magic.task engine to plan new scope

## Progress

```
Overall: [13/13] ████████ 100%
```

## Recent Decisions
- 2026-08-06 **Decision:** Phase 14 complete. Provides: extension-aware skill projection; zero MAGIC.md case drift in shipped artifacts; docs/ covers graph+status; 0 orphaned conventions. Engine 2.1.62, harness 34/34.

- 2026-07-10 **Decision:** Plan re-synced to INDEX v1.15.2 + RULES v1.9.0 (PLAN 1.14.1, TASKS 1.17.3); no new scope — plan remains complete

- 2026-06-13 **Decision:** l2-release-pipeline.md registered as Completed Baseline (retrospec, no execution); R8 documented in §5.3; PLAN 1.14.0, TASKS 1.17.2
- 2026-06-13 **Decision:** Phase 13 complete. Provides: rules/magic.md §1 DA-8/DA-9-aligned (no [y/n]); README updated; engine 2.1.41 (rules-only, no bump). Findings R8/R9 to backlog
- 2026-06-13 **Decision:** Phase 13 planned: align rules/magic.md §1 with DA-8/DA-9 (remove [y/n]); README + hardlink; 3 tasks


<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing `rules/*.md` (or any AGENTS-family anchor) with write-replace tools breaks the `.agents/` hardlink, leaving a stale copy. After any such edit: recreate the link and run `node dev/scripts/validate-hardlinks.js`.

## Session Continuity

**Last Session Ended:** 2026-06-12 11:45
**Handoff File:** none
**Bootstrap Mode:** false
