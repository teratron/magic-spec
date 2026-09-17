# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-09-17 16:02
**Phase:** 31 — Diagnostics Revalidation Before Render (DG-10)
**Status:** Active

## Current Position

- **Task:** T-28T02 C14 bump and engine integrity verification
- **Spec:** l2-agent-surface.md (linked-pair inventory, R25) · l2-skill-wrappers.md (regeneration trigger, R26)
- **Next Action:** Execute T-31A01 Self-reference suppression guard on `record()` via /magic.run engine

## Progress

```
Phase 31: [0/6] ░░░░░░░░ 0%
Overall: [29/30] ████████ 97%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-09-17 **Decision:** Phase 30 complete. Provides: checksum scanners join Invariant 7 gitignore parity; write-side git prohibition retired from every agent-facing surface; rules/magic.md Engine Upgrade Detection distinguishes fresh vs unknown.
- 2026-09-13 **Decision:** Phase 29 complete. Provides: l1-engine-core.md 1.7.1 (Concept-Only Classification, Required Fix re-targeted to .magic/analyze.md during Execute), l1-sdd-reference-containment.md 1.5.0 (provisional-boundary assumption), l2-engine-automation.md 1.12.0 (mis-targeted 1.11.0 addition reverted), .magic/analyze.md (Bare-L1-without-L2 advisory skips Concept-Only specs). Engine 2.1.84->2.1.86. Plan complete - Retro L2 run (Session 10), signal held 🟢.
- 2026-08-28 **Decision:** Phase 28 complete. Provides: l2-agent-surface.md 1.1.0 (SS4 closed 3-group linked-pair inventory), l2-skill-wrappers.md 1.4.0 (SS3.2 regeneration-trigger invariant), validate-hardlinks.js table-driven for rules/+workflows/, STATE.md [C-001] widened to all 3 groups, update-engine-meta.js syncSkillWrappers() called unconditionally on write path. Harness 69->72, all 3 negative-controlled against reverted/pre-fix code (incl. actual git-HEAD validate-hardlinks.js). Engine 2.1.79->2.1.80. Plan complete - Retro L2 run (Session 9), signal restored 🟡->🟢.
- 2026-08-28 **Decision:** Phase 27 complete. Provides: Idea Intake Gate (E6) deployed — .magic/spec.md Step 0.5 + three reconciled anti-question clauses; E6 registered across DA-2 table, .design/RULES.md 1.10.0, .magic/templates/rules.md, rules/magic.md; prompt-engineer conditional IK audit; docs/spec.md SS5.0; suite T209-T212 (v1.9.76); engine 2.1.79. Two engine defects found and recorded, not fixed: workflows/ hardlink pair is unguarded by validate-hardlinks.js and C-001, and update-engine-meta skips skill regeneration on a workflows-only change.
- 2026-08-28 **Decision:** Phase 27 planned. Idea Intake Gate (l1-idea-intake-gate.md v1.0.0, IK-1..IK-9) deployment across 7 tracks: E6 registration must land atomically in DA-2 table + .design/RULES.md + .magic/templates/rules.md + rules/magic.md. Planning surfaced a 3rd reconciliation site the spec's SS5 missed — the Mode Transition Auto-Transfer one-round cap contradicting IK-6.

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
