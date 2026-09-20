# Project State

<!-- STATE.md — live project memory. Read FIRST in every workflow session. -->
<!-- Maximum 100 lines. Agent updates AFTER each completed action. -->

**Workspace:** engine
**Updated:** 2026-09-20 15:33
**Phase:** 32 — Automatic Session Checkpoints (SC-6..SC-9)
**Status:** Active

## Current Position

- **Task:** T-31T02 Verification
- **Spec:** l1-engine-diagnostics.md (DG-10 Revalidation Before Render) · l2-engine-diagnostics.md (§4.10 implementation)
- **Next Action:** Execute T-32A01 Extract the tracking-entry block reader from `finalize.js` into `lib/` via /magic.run engine

## Progress

```
Phase 32: [0/18] ░░░░░░░░ 0%
Overall: [30/31] ████████ 97%
```

## Recent Decisions

<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->

- 2026-09-20 **Decision:** Spec pass 2026-09-20d (/magic.spec engine): automatic session checkpointing specified with no new command (user directive: everything under the hood). l1-session-continuity.md 2.3.0 adds SC-6 Cold-Start Sufficiency (+SC-6.1 Checkpoint Claim), SC-7 Observable Triggers (fill-percentage tiers and the automatic pause retired), SC-8 Dead-End Record (Attempts field), SC-9 Resume From Recorded State, SC-1.3 No Dead Fields. New l2-session-checkpoint.md 1.0.0 holds the contract, the H1-H10/C1-C5 coverage and a 13-row deployment inventory routed to /magic.task engine. The pause snapshot stays an optional path; its retirement is deferred pending usage evidence.
- 2026-09-20 **Decision:** Plan sync 2026-09-20b (no new phase): PLAN v1.39.0 / TASKS v1.38.0 re-baselined on INDEX v1.28.0 after the l2-finalize-state-accuracy.md decomposition; the two new specs (l2-update-state-structure.md, l2-update-state-values.md) registered in Completed (Baseline) as retrospec entries — relocated, already-implemented content. Backlog holds no open item; plan complete.
- 2026-09-20 **Decision:** Spec pass 2026-09-20 (/magic.spec engine): l2-finalize-state-accuracy.md decomposed at 552 lines (SPEC_DECOMPOSE) — the register (2.0.0) keeps the callers' defects (§2/§4/§9/§11); the update-state.js writer's defects moved verbatim to l2-update-state-structure.md and l2-update-state-values.md (1.0.0) under permanent defect numbers, so every §N cited from engine and harness comments still resolves. Backlog item closed; /magic.task engine registers the two new specs in the plan.
- 2026-09-20 **Decision:** Plan sync 2026-09-20 (no new phase): PLAN v1.38.0 / TASKS v1.37.0 re-baselined on INDEX v1.27.10 after eight direct-repair patch releases (engine 2.1.94 → 2.1.102). SPEC_BLOAT watch for l2-finalize-state-accuracy.md promoted from Parked to an open Backlog item (SPEC_DECOMPOSE, 552 lines vs 500) — the next /magic.task Pre-flight raises DESIGN_DEBT_PENDING and routes to /magic.spec engine.
- 2026-09-18 **Decision:** Phase 31 complete. Provides: lib/diagnostics.js gains revalidate() (DG-10) — a condition finding's recheck is rerun once per signature immediately before every render, dropping what no longer reproduces; self-reference guard (MAGIC_DIAGNOSTICS_SUPPRESS) prevents a recheck from re-queuing its own finding. check-prerequisites.js attaches recheck to every finding. finalize.js wires revalidate() on both exit paths. Live-reproduced and fixed the field-reported stale-SYNC_GAP defect. Engine 2.1.93->2.1.94, harness 86->92.

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
