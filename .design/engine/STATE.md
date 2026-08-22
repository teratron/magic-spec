# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-08-22 11:26
**Phase:** 25 — CHANGELOG Dedup Discoverability Hint
**Status:** Active

## Current Position

- **Task:** T-25T01 Regression: deduped row names release-changelog; non-deduped rows are unaffected
- **Spec:** l2-finalize-state-accuracy.md §9/§10 (concept: l1-session-continuity.md SC-2.1(c), SC-1.2)
- **Next Action:** Plan complete — run /magic.task engine to plan new scope

## Progress

```
Overall: [24/24] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-08-22 **Decision:** Phase 25 complete. Provides: finalize.js deduped CHANGELOG stdout row now names the release-changelog remedy (SS4.5), no bullet-content or dedup-logic change; dev/tests/engine.js first live-CLI regression coverage for the CHANGELOG-write branch (autoChangelog: true), 68 -> 69. Field report (engine 2.1.73) proposed a fix that would have violated RC-11; rejected in favor of the discoverability fix.
- 2026-08-22 **Decision:** Phase 24 complete. Provides: dev/scripts/sync-engine-snapshot.js (L2 writer) + guarded update-engine-meta.js delegation, dev-repo-only .design/INDEX.md Engine Version sync (consumer projects unchanged); rules/magic.md SS1 sole-writer carve-out; finalize.js Next Action title-stripping regression fixed (found by this phase's own planning run). Harness 66 -> 68, engine 2.1.73 -> 2.1.74, snapshot 2.1.72 -> 2.1.74 live-verified.
- 2026-08-22 **Decision:** Phase 23 complete. Provides: finalize.js task-level Blocked/Assignment precedence (isTaskExcluded + terminal branch, SC-2.1(c)); update-state.js + templates/state.md decision-prune preamble honesty; l2-finalize-state-accuracy.md 1.1.1 (both required fixes implemented, stale §12 claim corrected); harness 65 -> 66.
- 2026-08-13 **Decision:** Phase 22 complete. Provides: check-prerequisites.js terminal-row plan-complete predicate, analyze.md Mode C Depth Control bypass parity, project-auditor.md citation fix.
- 2026-08-07 **Decision:** Phase 21 complete. Provides: check-prerequisites.js INDEX.md-side registry-scan sites bound to stripQuoted() + filename-grammar pattern (SH-1/SH-4 completion), DESIGN_DEBT_PENDING openItems excludes Parked-marked bullets (SC-2.4 addendum). Engine 2.1.70 -> 2.1.71, harness 62/64. Plan complete.

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
