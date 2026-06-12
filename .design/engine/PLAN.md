# Implementation Plan

**Version:** 1.12.0
**Generated:** 2026-06-12
**Based on:** .design/engine/INDEX.md v1.13.2
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduced the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`. Phase 4 deploys the Prompt Quality Gate (`l1-prompt-quality-gate.md`): the `prompt-engineer` role card (#14) and its five workflow gates. Phase 5 deploys the Autonomous Decision Protocol (`l1-decision-autonomy.md`): C27 constitution anchoring, DA-6 session posture in workflow completion flows, and protocol binding across all role cards. Phase 6 deploys SDD Reference Containment (`l1-sdd-reference-containment.md`): the one-way traceability boundary keeping product code free of SDD-artifact references — field-priority fix, eligible for targeted execution.

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
- [x] **Role Card Registry** ([l2-role-cards.md](specifications/l2-role-cards.md)) [L2] *(Phase 3 complete; decomposed v2.0.0 — see child specs below)*
- [x] **Role Cards — Execution Pipeline** ([l2-role-cards-execution.md](specifications/l2-role-cards-execution.md)) [L2] *(retrospec — card content extracted from l2-role-cards v2.0.0; cards live on disk in `.magic/roles/`)*
- [x] **Role Cards — Review Gates** ([l2-role-cards-review.md](specifications/l2-role-cards-review.md)) [L2] *(retrospec — card content extracted from l2-role-cards v2.0.0)*
- [x] **Role Cards — Governance Gates** ([l2-role-cards-governance.md](specifications/l2-role-cards-governance.md)) [L2] *(retrospec — migrated-C24 card content extracted from l2-role-cards v2.0.0)*
- [x] **Role System Workflow Integration** ([l2-role-integration.md](specifications/l2-role-integration.md)) [L2] *(Phase 3 complete; scope narrowed v2.0.0 — tooling split out below)*
- [x] **Role System Engine Tooling** ([l2-role-tooling.md](specifications/l2-role-tooling.md)) [L2] *(retrospec — check-prerequisites integrity, update-engine-meta, role template extracted from l2-role-integration v2.0.0; mechanisms live in engine scripts)*
- [x] **Workspace Intent Routing** ([l1-workspace-intent-routing.md](specifications/l1-workspace-intent-routing.md)) [L1] *(retrospec — implemented in engine v2.1.2: `context.md` §Step 0, `create-workspace.js`, C26 in RULES v1.7.0; validated via the workspace-intent-routing simulation document)*
- [x] **Spec Graph Memory & Token Economy** ([l2-spec-graph-memory.md](specifications/l2-spec-graph-memory.md)) [L2] *(retrospec — promoted Stable 2026-06-10 after implementation review: `graph-cache.js`, `export-wiki.js`, `serve-spec-graph.js` token_budget, §4.4 triggers live in spec/task/analyze workflows)*

## Active Phases

### Phase 4 — Prompt Quality Gate (prompt-engineer role)

- [x] **Prompt Quality Gate** ([l1-prompt-quality-gate.md](specifications/l1-prompt-quality-gate.md)) [L1] — deployed via role card #14 + five workflow gates *(Phase 4 complete — engine 2.1.33)*
  - Amendment deployment covered by this phase: [l2-role-cards.md](specifications/l2-role-cards.md) v2.1.0 (inventory #14), [l2-role-cards-governance.md](specifications/l2-role-cards-governance.md) v1.1.0 (§5 card content), [l2-role-integration.md](specifications/l2-role-integration.md) v2.1.0 (§1/§2.8a/§3/§4.2 gate wiring), [l1-role-system.md](specifications/l1-role-system.md) v1.1.0 (§4.3 registry extension).
  - Tasks: [tasks/phase-4.md](tasks/phase-4.md)

### Phase 5 — Decision Autonomy (C27 protocol)

- [x] **Autonomous Decision Protocol** ([l1-decision-autonomy.md](specifications/l1-decision-autonomy.md)) [L1] — deployed via constitution template amendment (C13 §3 + C27), workflow completion-flow DA-6 wiring, user-side `rules/magic.md` section, and role-card binding *(Phase 5 complete — engine 2.1.34)*
  - Reference deployment already live in this project's `.design/RULES.md` v1.8.0 (C27 added, C13 §3 amended).
  - Serialized after Phase 4 (shared workflow-body files — planner audit).
  - Tasks: [tasks/phase-5.md](tasks/phase-5.md)

### Phase 6 — SDD Reference Containment (RC gates)

- [x] **SDD Reference Containment** ([l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md)) [L1] — deployed via ambient `rules/magic.md` section (RC-1..RC-4), Coder card authoring gate (RC-5), Code-reviewer containment check (RC-6), and ventilation leak scan (RC-7) *(Phase 6 complete — engine 2.1.31)*
  - Card amendments covered by this phase: [l2-role-cards-execution.md](specifications/l2-role-cards-execution.md) v1.1.0 (Coder step 5), [l2-role-cards-review.md](specifications/l2-role-cards-review.md) v1.1.0 (Code-reviewer step 4).
  - No hard dependency on Phases 4-5; MUST NOT run concurrently with them (shared files: role cards, `rules/magic.md`). Field-priority: targeted execution permitted before Phase 4.
  - Tasks: [archives/tasks/phase-6.md](archives/tasks/phase-6.md) *(Done, archived)*

### Phase 7 — Shipped Self-Containment (RC-9 purge)

- [x] **SDD Reference Containment — RC-9** ([l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) v1.1.0) [L1] — purged 15 engine-workspace references from shipped files: 5 dead spec links, 3 baked-in workspace names, 6 governance file-name citations *(Phase 7 complete — engine 2.1.32)*
  - No hard dependency on Phases 4-5; MUST NOT run concurrently with them (shared workflow-body files). Field-priority follow-up of Phase 6.
  - Tasks: [tasks/phase-7.md](tasks/phase-7.md)

## Backlog

- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
