# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-10-06 09:23
**Phase:** 39 — Registry Text Contract & Question Routing Deployment
**Status:** Active

## Current Position

- **Task:** T-38T02 Validation: run the new cognitive cases against the shipped descriptions
- **Spec:** l2-engine-finalization.md §9.2 (significance read-failure) · l1-sdd-reference-containment.md RC-8 (confirmed leak cleanup)
- **Next Action:** Plan complete — nothing pending

## Progress

```
Overall: [38/38] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-10-06 **Decision:** Phase 39 complete. Provides: the registry Description form in spec.md (what and when, two sentences, rewritten never appended), the ledger overview rule in task.md, three template comments, docs lines, the content-versus-structure routing in rules/magic.md section 2, and this workspace rewritten once by its own rule (36 of 37 cells, ledger overview 27 KB to under 0.5 KB); harness 178, 20 mutations caught, cognitive suite T264-T266, engine 2.1.136. Lower-tier fresh-reader run left open.
- 2026-10-05 **Decision:** Phase 38 complete. Provides: generation-time validation of every skill wrapper (refuse, never write) with a C14 flow that finishes before failing; nine descriptions in the Selection Signal form; contents lists in six engine bodies and whole-module pointers to context.md; a reader tier in the simulation workflow; harness 167 to 174, cognitive suite T260-T263, 42 mutation controls caught; engine 2.1.134. Lower-tier fresh-reader run left open.
- 2026-10-05 **Decision:** Phase 38 planned (deployment of the 2026-10-05 skill-wrapper and body-navigation amendments, 12 tasks, 4 tracks): hardlink pairs restored first (all three groups drifted), descriptions rewritten before the generator refuses them, the C14 flow finishes before failing; PLAN v1.46.0 / TASKS v1.45.0 on registry v1.38.0, one C14 bump at T-38T01.
- 2026-09-30 **Decision:** Phase 37 planned (deployment of the four design-debt decisions, 15 tasks, 5 tracks): Status reconciliation from one shared ledger classification, pause-snapshot retirement with a residue search, RULES.md in the spec whitelist, mutation-check driver. PLAN v1.45.0 / TASKS v1.44.0 on registry v1.35.0; one C14 tagged magic.run magic.status magic.analyze.
- 2026-09-30 **Decision:** Phase 36 complete. Provides: registered-spec citations in shipped text 36 -> 0 (comment-only, pinned by a harness scan), CHANGELOG cleaned, tracked-files remedy, audits (Status: one stale transition + template conflict; pause snapshot: 0 uses in 7 projects). Engine 2.1.112->2.1.113, harness 143/143. Two more Backlog items opened for /magic.spec.

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing any file with an `.agents/` twin — the AGENTS-family anchor (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`CODEX.md`/`QWEN.md`), `rules/*.md`, or **`workflows/*.md`** — with write-replace tools breaks the hardlink, leaving a stale copy. This is the complete, closed set (`l2-agent-surface.md` §4); `skills/*/SKILL.md` is NOT in it (independently generated, not linked). The break is invisible at edit time — the write always reports success. After any such edit: run `node dev/scripts/validate-hardlinks.js` (now covers all three groups) to detect it, and if it reports drift, recreate the link (`Remove-Item` + `New-Item -ItemType HardLink`) before re-verifying.

## Session Continuity

**Handoff File:** none
**Bootstrap Mode:** false
