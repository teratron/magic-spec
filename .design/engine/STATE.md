# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-08-13 13:27
**Phase:** 22 — Field-Report Triage
**Status:** Active

## Current Position

- **Task:** T-22T01 Full harness run + C14 sync
- **Spec:** l1-session-continuity.md (SC-1..SC-5) + l2-status-command.md (/magic.status)
- **Next Action:** Plan complete — run /magic.task engine to plan new scope

## Progress

```
Overall: [21/21] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->

- 2026-08-13 **Decision:** Phase 22 complete. Provides: check-prerequisites.js terminal-row plan-complete predicate, analyze.md Mode C Depth Control bypass parity, project-auditor.md citation fix.
- 2026-08-07 **Decision:** Phase 21 complete. Provides: check-prerequisites.js INDEX.md-side registry-scan sites bound to stripQuoted() + filename-grammar pattern (SH-1/SH-4 completion), DESIGN_DEBT_PENDING openItems excludes Parked-marked bullets (SC-2.4 addendum). Engine 2.1.70 -> 2.1.71, harness 62/64. Plan complete.
- 2026-08-07 **Decision:** Phase 2 complete (belated closure). Provides: sync-skills.js projection validated by dev/tests/suite.md T190 (retrospec); tasks/phase-2.md frontmatter added and archived via standard C8 mechanism, closing the only Done-but-unarchived phase gap in the registry.
- 2026-08-07 **Decision:** magic.task engine: registry re-synced to INDEX.md v1.19.0 after 3 spec amendments; PLAN.md Backlog reviewed \u2014 R8 closed (already-decided), DESIGN_DEBT_PENDING gate-gap recorded as new backlog item + diagnostic, debt-ceiling convention left open pending user ratification via /magic.rule. Plan remains complete, no new active phase (all 32 specs deployed).
- 2026-08-07 **Decision:** Phase 20 complete. Provides: release-changelog.js (explicit opt-in CHANGELOG rotation, R11 remainder closed) and analyze-coverage.js EXEMPT classification (coverage 85.4% -> 96.5% on this workspace, 24 SDD bookkeeping/journal files no longer counted as UNCOVERED). Engine 2.1.69, harness 62/62. Plan complete.

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
