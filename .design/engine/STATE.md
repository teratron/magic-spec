# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** {workspace-name}
**Updated:** 2026-06-12 11:30
**Phase:** 7 — Shipped Self-Containment (RC-9 purge)
**Status:** Done

## Current Position

- **Task:** T-7T02 Validation: engine test harness
- **Spec:** {spec-file.md} §{section}
- **Next Action:** Run /magic.run engine (Phase 4 is the next Todo phase)

## Progress

```
Phase {N}: [{filled}/{total}] ████░░░░ {pct}%
Overall:   [{done}/{all}]    ██░░░░░░ {pct}%
```

## Recent Decisions

- 2026-06-12 **Decision:** Phase 7 complete. Provides: shipped files free of engine-workspace refs (RC-9); engine 2.1.32

- 2026-06-12 **Decision:** Phase 6 complete. Provides: rules/magic.md §6 containment policy; Coder RC-5 gate; Code-reviewer RC-6 check; analyze.md SDD_REFERENCE_LEAK scan; engine 2.1.31

<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->

- {YYYY-MM-DD} **Decision:** {What was decided and why}
- {YYYY-MM-DD} **Pattern:** {Established pattern name} — {brief description}

## Blockers

<!-- Empty if none. Format: [severity] description -->

- [blocking] {Blocker description and what is needed to unblock}

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **{Constraint Title}**: {What must not be done and why}

## Session Continuity

**Last Session Ended:** {YYYY-MM-DD HH:MM}
**Handoff File:** {.design/{workspace}/HANDOFF.json | none}
**Bootstrap Mode:** {true | false}
