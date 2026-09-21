# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-09-21 08:29
**Phase:** 32 — Automatic Session Checkpoints (SC-6..SC-9)
**Status:** Active

## Current Position

- **Task:** T-32T04 Cognitive suite: cold start, re-grounding, dead end, claim honesty (T220–T224)
- **Spec:** l1-engine-diagnostics.md (DG-10 Revalidation Before Render) · l2-engine-diagnostics.md (§4.10 implementation)
- **Next Action:** Plan complete — run /magic.task engine to plan new scope

## Progress

```
Overall: [31/31] ████████ 100%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-09-21 **Decision:** Phase 32 complete. Provides: resume-state (the shared read-only resume predicate, --workspace/--all/--json) and lib/tracking-entries.js; the Task Start record and the Attempts dead-end field in run.md; the checkpoint claim in finalize (only after a successful STATE.md update); Post-Compaction Re-grounding in place of the fill-percentage tiers; rules/magic.md §10; Last Session Ended and the phantom /magic.pause removed. Engine 2.1.102->2.1.103, harness 124->138, cognitive T220-T224. Plan complete.
- 2026-09-20 **Decision:** Spec pass 2026-09-20d (/magic.spec engine): automatic session checkpointing specified with no new command (user directive: everything under the hood). l1-session-continuity.md 2.3.0 adds SC-6 Cold-Start Sufficiency (+SC-6.1 Checkpoint Claim), SC-7 Observable Triggers (fill-percentage tiers and the automatic pause retired), SC-8 Dead-End Record (Attempts field), SC-9 Resume From Recorded State, SC-1.3 No Dead Fields. New l2-session-checkpoint.md 1.0.0 holds the contract, the H1-H10/C1-C5 coverage and a 13-row deployment inventory routed to /magic.task engine. The pause snapshot stays an optional path; its retirement is deferred pending usage evidence.
- 2026-09-20 **Decision:** Plan sync 2026-09-20b (no new phase): PLAN v1.39.0 / TASKS v1.38.0 re-baselined on INDEX v1.28.0 after the l2-finalize-state-accuracy.md decomposition; the two new specs (l2-update-state-structure.md, l2-update-state-values.md) registered in Completed (Baseline) as retrospec entries — relocated, already-implemented content. Backlog holds no open item; plan complete.
- 2026-09-20 **Decision:** Spec pass 2026-09-20 (/magic.spec engine): l2-finalize-state-accuracy.md decomposed at 552 lines (SPEC_DECOMPOSE) — the register (2.0.0) keeps the callers' defects (§2/§4/§9/§11); the update-state.js writer's defects moved verbatim to l2-update-state-structure.md and l2-update-state-values.md (1.0.0) under permanent defect numbers, so every §N cited from engine and harness comments still resolves. Backlog item closed; /magic.task engine registers the two new specs in the plan.
- 2026-09-20 **Decision:** Plan sync 2026-09-20 (no new phase): PLAN v1.38.0 / TASKS v1.37.0 re-baselined on INDEX v1.27.10 after eight direct-repair patch releases (engine 2.1.94 → 2.1.102). SPEC_BLOAT watch for l2-finalize-state-accuracy.md promoted from Parked to an open Backlog item (SPEC_DECOMPOSE, 552 lines vs 500) — the next /magic.task Pre-flight raises DESIGN_DEBT_PENDING and routes to /magic.spec engine.

## Blockers

<!-- Empty if none. Format: [severity] description -->

## Blocking Constraints

<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->
<!-- Agent MUST explicitly acknowledge each constraint before working. -->

- [C-001] **Hardlink Edit Breakage**: editing any file with an `.agents/` twin — the AGENTS-family anchor (`AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`CODEX.md`/`QWEN.md`), `rules/*.md`, or **`workflows/*.md`** — with write-replace tools breaks the hardlink, leaving a stale copy. This is the complete, closed set (`l2-agent-surface.md` §4); `skills/*/SKILL.md` is NOT in it (independently generated, not linked). The break is invisible at edit time — the write always reports success. After any such edit: run `node dev/scripts/validate-hardlinks.js` (now covers all three groups) to detect it, and if it reports drift, recreate the link (`Remove-Item` + `New-Item -ItemType HardLink`) before re-verifying.

## Session Continuity

**Handoff File:** none
**Bootstrap Mode:** false
