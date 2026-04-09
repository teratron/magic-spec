# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** {workspace-name}
**Updated:** {YYYY-MM-DD HH:MM}
**Phase:** {N} — {Phase Name}
**Status:** {Active | Paused | Blocked | Complete}

## Current Position

- **Task:** [{T-ID}] {Task Title}
- **Spec:** {spec-file.md} §{section}
- **Next Action:** {Concrete next action in one line}

## Progress

```
Phase {N}: [{filled}/{total}] ████░░░░ {pct}%
Overall:   [{done}/{all}]    ██░░░░░░ {pct}%
```

## Recent Decisions

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
