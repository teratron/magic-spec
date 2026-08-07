# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-08-07 05:54
**Phase:** 18 — Engine Diagnostics Digest
**Status:** Active

## Current Position

- **Task:** T-14B02 Purge rules/MAGIC.md case drift from workflow wrappers; restore hardlinks
- **Spec:** l1-session-continuity.md (SC-1..SC-5) + l2-status-command.md (/magic.status)
- **Next Action:** Execute T-18A01 Collector core — record, read, drain, sink resolution, retention bound via /magic.run engine

## Progress

```
Phase 18: [0/12] ░░░░░░░░ 0%
Overall: [16/17] ████████ 94%
```

## Recent Decisions
- 2026-08-06 **Decision:** Phase 17 complete. Provides: shared scan-hygiene strip helper backing both compliant script scans; registry cross-reference SH-1/SH-4 fixed; link-integrity template exclusion; containment scan SH-1 precondition. Engine 2.1.65, harness 46/46. Plan complete.
- 2026-08-06 **Decision:** Phase 16 complete. Provides: init.md documentation parity on all three claim surfaces + cognitive suite; RC-12 scaffold-removal check in ventilation and ambient rules. Engine 2.1.64, harness 43/43. Plan complete.
- 2026-08-06 **Decision:** Phase 15 complete. Provides: two-level progress counters, narrative-safe fence merge, distinct line-cap exhaustion warning, Blocked-phase next-action guard, full changed-file visibility in finalize, generator containment. Engine 2.1.63, harness 43/43.
- 2026-08-06 **Decision:** Phase 14 complete. Provides: extension-aware skill projection; zero MAGIC.md case drift in shipped artifacts; docs/ covers graph+status; 0 orphaned conventions. Engine 2.1.62, harness 34/34.

- 2026-07-10 **Decision:** Plan re-synced to INDEX v1.15.2 + RULES v1.9.0 (PLAN 1.14.1, TASKS 1.17.3); no new scope — plan remains complete



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
