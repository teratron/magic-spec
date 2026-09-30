# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-09-30 17:21
**Phase:** 37 — Backlog Deployment
**Status:** Active

## Current Position

- **Task:** T-37T01 Validation: harness, scans, hardlinks; single C14 bump
- **Spec:** l2-engine-finalization.md §9.2 (significance read-failure) · l1-sdd-reference-containment.md RC-8 (confirmed leak cleanup)
- **Next Action:** Run /magic.task engine to update the plan

## Progress

```
Overall: [36/36] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-09-30 **Decision:** Phase 37 planned (deployment of the four design-debt decisions, 15 tasks, 5 tracks): Status reconciliation from one shared ledger classification, pause-snapshot retirement with a residue search, RULES.md in the spec whitelist, mutation-check driver. PLAN v1.45.0 / TASKS v1.44.0 on registry v1.35.0; one C14 tagged magic.run magic.status magic.analyze.
- 2026-09-30 **Decision:** Phase 36 complete. Provides: registered-spec citations in shipped text 36 -> 0 (comment-only, pinned by a harness scan), CHANGELOG cleaned, tracked-files remedy, audits (Status: one stale transition + template conflict; pause snapshot: 0 uses in 7 projects). Engine 2.1.112->2.1.113, harness 143/143. Two more Backlog items opened for /magic.spec.
- 2026-09-30 **Decision:** Phase 36 planned (whole-Backlog request, 10 tasks, 4 tracks): 3 items graduate (reference-containment cleanup with a harness guard — 36 confirmed spec-file citations in 16 shipped files; the SDD_REFERENCE_LEAK inventory; tracked-files hint), 2 become evidence audits (Status writers, pause snapshot), 2 opened for /magic.spec (mutation driver — its trigger fired; T4 finalize gap), 2 kept Parked (SPEC_BLOAT watch, frontend-specialist). PLAN v1.44.0 / TASKS v1.43.0.
- 2026-09-30 **Decision:** Phase 35 complete. Provides: nothing-pending Next Action — lib/pending-work.js shared predicate, check-prerequisites refactor (identical warnings), finalize plan-complete value without a command, status.md/docs follow. Engine 2.1.111->2.1.112, harness 141/141.
- 2026-09-30 **Decision:** Phase 35 planned (nothing-pending Next Action, 8 tasks, 3 tracks): PLAN v1.43.0 / TASKS v1.42.0 on registry v1.34.0; shared pending-work predicate, one C14 tagged magic.status; planning found status.md would reformat the new value back into a recommendation (carried by l2-status-command 1.3.0).

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing any file with an `.agents/` twin — the AGENTS-family anchor (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`CODEX.md`/`QWEN.md`), `rules/*.md`, or **`workflows/*.md`** — with write-replace tools breaks the hardlink, leaving a stale copy. This is the complete, closed set (`l2-agent-surface.md` §4); `skills/*/SKILL.md` is NOT in it (independently generated, not linked). The break is invisible at edit time — the write always reports success. After any such edit: run `node dev/scripts/validate-hardlinks.js` (now covers all three groups) to detect it, and if it reports drift, recreate the link (`Remove-Item` + `New-Item -ItemType HardLink`) before re-verifying.

## Session Continuity

**Handoff File:** none
**Bootstrap Mode:** false
