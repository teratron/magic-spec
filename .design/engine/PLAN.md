# Implementation Plan

**Version:** 1.3.0
**Generated:** 2026-04-23
**Based on:** .design/engine/INDEX.md v1.7.0
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduces the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`.

## Completed (Baseline)

*Specifications already implemented and validated.*

- [x] **Universal Skill Wrappers** ([l2-skill-wrappers.md](specifications/l2-skill-wrappers.md)) [L2]
- [x] **Config Drift Guard** ([l1-config-drift-guard.md](specifications/l1-config-drift-guard.md)) [L1]
- [x] **Engine Core** ([l1-engine-core.md](specifications/l1-engine-core.md)) [L1]
- [x] **Engine Automation** ([l2-engine-automation.md](specifications/l2-engine-automation.md)) [L2]
- [x] **Test Suite** ([l2-test-suite.md](specifications/l2-test-suite.md)) [L2]
- [x] **Documentation System** ([l1-documentation-system.md](specifications/l1-documentation-system.md)) [L1]
- [x] **Workflow Wrappers** ([l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md)) [L2]
- [x] **Engine Templates** ([l2-engine-templates.md](specifications/l2-engine-templates.md)) [L2]
- [x] **Agent Surface Architecture** ([l2-agent-surface.md](specifications/l2-agent-surface.md)) [L2]

## Active Phases

### Phase 3 — Unified Role System

**Specifications:**

- [x] **Unified Role System (Concept)** ([l1-role-system.md](specifications/l1-role-system.md)) [L1]
- [x] **Role Card Registry** ([l2-role-cards.md](specifications/l2-role-cards.md)) [L2]
- [x] **Role System Workflow Integration** ([l2-role-integration.md](specifications/l2-role-integration.md)) [L2]

**Strategic Goal:** Establish `.magic/roles/` as a first-class registry of 13 agent personas, migrate the C24 table in `RULES.md` to a pointer-table, and wire roles into `run.md`, `task.md`, `spec.md`, `analyze.md`, `rule.md`, `retrospective.md`.

**Tracks (Parallel):**

- **Track A — Role Cards**: Author 13 cards + role template.
- **Track B — run.md Amendments** (serialized): 9 gate updates per §2.
- **Track C — Other Workflow Amendments**: `task.md`, `spec.md`, `analyze.md`, `rule.md`, `retrospective.md` (each parallel).
- **Track D — Constitution**: Rewrite `rules.md` §C24.
- **Track E — Scripts**: Extend `check-prerequisites` and `update-engine-meta` (parallel; different files).
- **Track T — Validation**: Integrity check + full re-scan.

**Dependencies:**

- All Track B/C/D/T tasks depend on Track A cards existing (otherwise `@role:{id}` references break `role_registry_integrity`).
- Track T depends on all other tracks.
- Track E can proceed in parallel with A/B/C/D.

## Backlog

- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
