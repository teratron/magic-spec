# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** {workspace-name}
**Updated:** {YYYY-MM-DD HH:MM}
**Phase:** {N} — {Phase Name}
**Status:** {Active | Blocked}

## Current Position

- **Task:** [{T-ID}] {Task Title}
- **Spec:** {spec-file.md} §{section}
- **Next Action:** {Concrete next action in one line}

## Goal

<!-- Present only while `/magicspec goal` has a goal recorded; written by update-state (--goal-file), never by hand, at most 28 lines. Layout:
  - **Goal:** {statement}
  - **Target phase:** {N}
  - **Task limit:** {N}
  - **Bound:** {a bound the goal states}
  - **Without progress:** {iterations in a row}
  - **Tasks done:** {n}
  - [open | met | blocked] {criterion} — {the check that verifies it}
  - [consent] {action} — {why it waits for consent}
-->

## Progress

```
Phase {N}: [{filled}/{total}] ████░░░░ {pct}%
Overall:   [{done}/{all}]     ██░░░░░░ {pct}%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- {YYYY-MM-DD} **Decision:** {What was decided and why}
- {YYYY-MM-DD} **Pattern:** {Established pattern name} — {brief description}

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->
<!-- Format: - [C-NNN] **Title**: what must not be done and why -->

## Session Continuity

**Bootstrap Mode:** {true | false}
