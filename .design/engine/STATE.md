# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-06-12 12:26
**Phase:** 4 — Prompt Quality Gate (prompt-engineer)
**Status:** Done

## Current Position

- **Task:** T-5T02 Validation: engine test harness
- **Spec:** l1-prompt-quality-gate.md (deployment via role card #14 + five workflow gates)
- **Next Action:** Plan complete — all phases Done; next: review release readiness (/magic.dev.release on demand)

## Progress

```
Phase 4:  [0/10]  ░░░░░░░░ 0%
Overall:  [4/6]   █████░░░ 67% (phases 2, 3, 6, 7 Done; 4, 5 Todo)
```

## Recent Decisions

- 2026-06-12 **Decision:** Phase 5 complete. Provides: C27 anchored in template + rules/magic.md; DA-6 in completion flows; 14 cards bound; engine 2.1.34
- 2026-06-12 **Decision:** Phase 4 complete. Provides: prompt-engineer card #14; five PQ gates wired; engine 2.1.33

<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->

- 2026-06-12 **Decision:** Phase 7 complete. Provides: shipped files free of engine-workspace refs (RC-9); engine 2.1.32
- 2026-06-12 **Decision:** Phase 6 complete. Provides: rules/magic.md §6 containment policy; Coder RC-5 gate; Code-reviewer RC-6 check; analyze.md SDD_REFERENCE_LEAK scan; engine 2.1.31
- 2026-06-12 **Pattern:** Shipped self-containment (RC-9) — governance pointers in shipped files use protocol names and stable labels (WI-n/DA-n/C{n}), never engine-workspace spec file names

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
