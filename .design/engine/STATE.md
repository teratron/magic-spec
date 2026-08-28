# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-08-28 09:24
**Phase:** 28 — Silent-Failure Pair: Link Coverage & Regeneration Trigger
**Status:** Active

## Current Position

- **Task:** T-28T02 C14 bump and engine integrity verification
- **Spec:** l2-agent-surface.md (linked-pair inventory, R25) · l2-skill-wrappers.md (regeneration trigger, R26)
- **Next Action:** Plan complete — run /magic.task engine to plan new scope

## Progress

```
Overall: [27/27] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-08-28 **Decision:** Phase 28 complete. Provides: l2-agent-surface.md 1.1.0 (SS4 closed 3-group linked-pair inventory), l2-skill-wrappers.md 1.4.0 (SS3.2 regeneration-trigger invariant), validate-hardlinks.js table-driven for rules/+workflows/, STATE.md [C-001] widened to all 3 groups, update-engine-meta.js syncSkillWrappers() called unconditionally on write path. Harness 69->72, all 3 negative-controlled against reverted/pre-fix code (incl. actual git-HEAD validate-hardlinks.js). Engine 2.1.79->2.1.80. Plan complete - Retro L2 run (Session 9), signal restored 🟡->🟢.
- 2026-08-28 **Decision:** Phase 27 complete. Provides: Idea Intake Gate (E6) deployed — .magic/spec.md Step 0.5 + three reconciled anti-question clauses; E6 registered across DA-2 table, .design/RULES.md 1.10.0, .magic/templates/rules.md, rules/magic.md; prompt-engineer conditional IK audit; docs/spec.md SS5.0; suite T209-T212 (v1.9.76); engine 2.1.79. Two engine defects found and recorded, not fixed: workflows/ hardlink pair is unguarded by validate-hardlinks.js and C-001, and update-engine-meta skips skill regeneration on a workflows-only change.
- 2026-08-28 **Decision:** Phase 27 planned. Idea Intake Gate (l1-idea-intake-gate.md v1.0.0, IK-1..IK-9) deployment across 7 tracks: E6 registration must land atomically in DA-2 table + .design/RULES.md + .magic/templates/rules.md + rules/magic.md. Planning surfaced a 3rd reconciliation site the spec's SS5 missed — the Mode Transition Auto-Transfer one-round cap contradicting IK-6.
- 2026-08-27 **Decision:** Phase 26 complete. Provides: commit-suggestion feature fully removed from finalize.js/commit-suggester.js/workspace.json configs; harness updated (69 -> 68 tests, capability removed not regressed).
- 2026-08-22 **Decision:** Phase 25 complete. Provides: finalize.js deduped CHANGELOG stdout row now names the release-changelog remedy (SS4.5), no bullet-content or dedup-logic change; dev/tests/engine.js first live-CLI regression coverage for the CHANGELOG-write branch (autoChangelog: true), 68 -> 69. Field report (engine 2.1.73) proposed a fix that would have violated RC-11; rejected in favor of the discoverability fix.

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing any file with an `.agents/` twin — the AGENTS-family anchor (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`CODEX.md`/`QWEN.md`), `rules/*.md`, or **`workflows/*.md`** — with write-replace tools breaks the hardlink, leaving a stale copy. This is the complete, closed set (`l2-agent-surface.md` §4); `skills/*/SKILL.md` is NOT in it (independently generated, not linked). The break is invisible at edit time — the write always reports success. After any such edit: run `node dev/scripts/validate-hardlinks.js` (now covers all three groups) to detect it, and if it reports drift, recreate the link (`Remove-Item` + `New-Item -ItemType HardLink`) before re-verifying.

## Session Continuity

**Last Session Ended:** 2026-06-12 11:45
**Handoff File:** none
**Bootstrap Mode:** false
