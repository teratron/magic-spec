# Implementation Plan

**Version:** 1.4.0
**Generated:** 2026-05-07
**Based on:** .design/engine/INDEX.md v1.9.0
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduces the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`.

## Completed (Baseline)

*Specifications already implemented and validated.*

- [x] **Universal Skill Wrappers** ([l2-skill-wrappers.md](specifications/l2-skill-wrappers.md)) [L2]
- [x] **Config Drift Guard** ([l1-config-drift-guard.md](specifications/l1-config-drift-guard.md)) [L1]
- [x] **Engine Core** ([l1-engine-core.md](specifications/l1-engine-core.md)) [L1]
- [x] **Engine Automation** ([l2-engine-automation.md](specifications/l2-engine-automation.md)) [L2]
- [x] **Engine Finalization Library** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md)) [L2] *(retrospec — scripts/lib/ existed before spec)*
- [x] **Test Suite** ([l2-test-suite.md](specifications/l2-test-suite.md)) [L2]
- [x] **Documentation System** ([l1-documentation-system.md](specifications/l1-documentation-system.md)) [L1]
- [x] **Workflow Wrappers** ([l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md)) [L2]
- [x] **Engine Templates** ([l2-engine-templates.md](specifications/l2-engine-templates.md)) [L2]
- [x] **Agent Surface Architecture** ([l2-agent-surface.md](specifications/l2-agent-surface.md)) [L2]
- [x] **Unified Role System (Concept)** ([l1-role-system.md](specifications/l1-role-system.md)) [L1] *(Phase 3 complete)*
- [x] **Role Card Registry** ([l2-role-cards.md](specifications/l2-role-cards.md)) [L2] *(Phase 3 complete)*
- [x] **Role System Workflow Integration** ([l2-role-integration.md](specifications/l2-role-integration.md)) [L2] *(Phase 3 complete)*

## Active Phases

*No active phases — all Stable specs are implemented. See Backlog for pending work.*

## Backlog

- **Spec Graph Memory** ([l2-spec-graph-memory.md](specifications/l2-spec-graph-memory.md)) [L2, RFC] — awaiting promotion to Stable before planning.
- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
