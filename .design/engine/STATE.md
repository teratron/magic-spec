# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-10-28 10:29
**Phase:** 41 — Project-Root & State-Folder Resolvers (Single-Skill Step 1)
**Status:** Active

## Current Position

- **Task:** T-40T02 Validation: run the new cognitive case against the shipped text
- **Spec:** l2-engine-finalization.md §9.2 (significance read-failure) · l1-sdd-reference-containment.md RC-8 (confirmed leak cleanup)
- **Next Action:** Execute T-41A01 `utils.js`: the project-root resolver, the state-folder constant and the engine-folder locator via /magic.run engine

## Progress

```
Phase 41: [0/13] ░░░░░░░░ 0%
Overall: [39/41] ████████ 95%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-10-28 **Decision:** Phase 41 and 42 planned in full (single-skill steps 1 and 2, 2.x releases); Phases 43-45 outlined, workbooks created as each predecessor completes; step 3 waits on the verified host table. PLAN v1.49.0 / TASKS v1.48.0 on registry v1.46.0.
- 2026-10-12 **Decision:** Phase 40 complete. Provides: the archival opt-out with its reader and a standing setting-parity check, an installer that owns only its own hook and a hook that disarms without .magic/, a pre-flight that reports a deleted engine file, a containment scan that reports code-quoted references in a consumer's markdown, and the bloat override reader; harness 178 to 197, 70 mutation entries all caught, cognitive case T267, engine 2.1.138 (two C14). Three stale specification statements and the lower-tier reader run left open.
- 2026-10-11 **Decision:** Phase 40 planned (deployment of the three 2026-10-11 reference-mining amendments, registry 1.40.0 to 1.43.0: setting parity with the archival opt-out, git hook lifecycle, deleted engine files in the pre-flight, quoted notation in the containment scan, the bloat reader; 18 tasks, 5 tracks plus closing): hook text follows the hook, harness follows the code, one C14 bump at T-40T01; PLAN v1.48.0 / TASKS v1.47.0.
- 2026-10-06 **Decision:** Phase 39 complete. Provides: the registry Description form in spec.md (what and when, two sentences, rewritten never appended), the ledger overview rule in task.md, three template comments, docs lines, the content-versus-structure routing in rules/magic.md section 2, and this workspace rewritten once by its own rule (36 of 37 cells, ledger overview 27 KB to under 0.5 KB); harness 178, 20 mutations caught, cognitive suite T264-T266, engine 2.1.136. Lower-tier fresh-reader run left open.
- 2026-10-05 **Decision:** Phase 38 complete. Provides: generation-time validation of every skill wrapper (refuse, never write) with a C14 flow that finishes before failing; nine descriptions in the Selection Signal form; contents lists in six engine bodies and whole-module pointers to context.md; a reader tier in the simulation workflow; harness 167 to 174, cognitive suite T260-T263, 42 mutation controls caught; engine 2.1.134. Lower-tier fresh-reader run left open.

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing any file with an `.agents/` twin — the AGENTS-family anchor (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`CODEX.md`/`QWEN.md`), `rules/*.md`, or **`workflows/*.md`** — with write-replace tools breaks the hardlink, leaving a stale copy. This is the complete, closed set (`l2-agent-surface.md` §4); `skills/*/SKILL.md` is NOT in it (independently generated, not linked). The break is invisible at edit time — the write always reports success. After any such edit: run `node dev/scripts/validate-hardlinks.js` (now covers all three groups) to detect it, and if it reports drift, recreate the link (`Remove-Item` + `New-Item -ItemType HardLink`) before re-verifying.

## Session Continuity

**Handoff File:** none
**Bootstrap Mode:** false
