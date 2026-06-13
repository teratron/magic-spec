# Implementation Plan

**Version:** 1.13.3
**Generated:** 2026-06-13
**Based on:** .design/engine/INDEX.md v1.14.3
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduced the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`. Phase 4 deploys the Prompt Quality Gate (`l1-prompt-quality-gate.md`): the `prompt-engineer` role card (#14) and its five workflow gates. Phase 5 deploys the Autonomous Decision Protocol (`l1-decision-autonomy.md`): C27 constitution anchoring, DA-6 session posture in workflow completion flows, and protocol binding across all role cards. Phase 6 deploys SDD Reference Containment (`l1-sdd-reference-containment.md`): the one-way traceability boundary keeping product code free of SDD-artifact references — field-priority fix, eligible for targeted execution. Phase 8 deploys Session Continuity (`l1-session-continuity.md`): the SC-2 universal post-command STATE.md update and SC-3 commit-suggestion guarantee carried by the finalize pipeline, plus the read-only `/magic.status` resume briefing command (`l2-status-command.md`, C2 exception SC-5).

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

### Phase 8 — Session Continuity & Status Command

- [x] **Session Continuity & Status Surface** ([l1-session-continuity.md](specifications/l1-session-continuity.md)) [L1] — deployed via finalize-pipeline state update (SC-2), non-bumping commit-suggestion fallback (SC-3), and the status briefing surface (SC-4/SC-5) *(Phase 8 complete — engine 2.1.37)*
- [x] **Status Command** ([l2-status-command.md](specifications/l2-status-command.md)) [L2] — `.magic/status.md` body, `workflows/magic.status.md` wrapper, generated `skills/magic-status/SKILL.md`, upgrade-detection exemption, docs *(Phase 8 complete)*
  - Amendment deployment covered by this phase: [l2-engine-finalization.md](specifications/l2-engine-finalization.md) v1.1.0 (§5 session-continuity integration), [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) v1.1.0 (inventory + graph drift fix), [l2-skill-wrappers.md](specifications/l2-skill-wrappers.md) v1.3.0 (magic-status projection).
  - Tracks A (finalize) and B (status command) are file-independent but both bump `.magic/` meta (C14 checksums) — execute serially in one session (planner audit).
  - No dependency on Phases 4-7 (all Done); first runnable phase after plan-complete state.
  - Tasks: [tasks/phase-8.md](tasks/phase-8.md)

### Phase 9 — DA-9 Engine Deployment (Proposal Surfaces)

- [x] **Decision Autonomy — DA-9 deployment** ([l1-decision-autonomy.md](specifications/l1-decision-autonomy.md) v1.1.0) [L1] — deploy DA-9 (Proposal Surfaces Are Declarative) into engine workflow bodies: rewrite pre-C27 proposal wording in `spec.md` (Blank Trigger / Creative Sparks, Mode Transition, Dispatch Notice) and `analyze.md` (post-analyze handoff) to the narrate-and-act `[DR]` form; verify `task.md` compliance. Firing gates WI-4 (E5) and T1-T3 (E4) preserved intact. *(Phase 9 complete — engine 2.1.38)*
  - Field evidence: a live non-whitelisted `AskUserQuestion` in a `/magic.spec` Blank Trigger (2026-06-13) exposed that §5.3 wired C27 only into completion sections, not proposal surfaces.
  - No hard dependency on Phases 4-8; first runnable phase after the session-continuity cycle.
  - Tasks: [tasks/phase-9.md](tasks/phase-9.md)

### Phase 10 — Session-Continuity Hardening Deployment

- [x] **Session-Continuity Hardening** ([l1-session-continuity.md](specifications/l1-session-continuity.md) v1.1.0 SC-2.1 + [l2-test-suite.md](specifications/l2-test-suite.md) v1.5.0) [L1+L2] — deploy plan-state-aware `computeNextAction` in `finalize.js` (no more static "execute the active phase" against a complete plan) and add the first finalize-pipeline regression coverage to `dev/tests/engine.js`. *(Phase 10 complete — engine 2.1.39, harness 14/14)*
  - Field evidence: `computeNextAction` returned a stale run-recommendation across this session's plan-complete states (hand-corrected in STATE.md ×3).
  - Deploys the R5/R6 spec amendments authored 2026-06-13; no dependency on Phases 4-9.
  - Tasks: [tasks/phase-10.md](tasks/phase-10.md)

## Backlog

- **Archiver `allChecked` false-positive** (R7, found 2026-06-13 in Phase 10): `phase-archiver.allChecked` does `!content.includes('- [ ]')` over the whole file, so a phase whose prose/code-spans mention `- [ ]` (like phase-10's task Notes) never auto-archives. Fix: match checklist line items only (e.g. `^\s*- \[ \]` anchored, or scope to the Atomic Checklist section). Re-archives phase-10 once fixed.
- **Wrapper-Body Parity Invariant** (standing candidate, R4): analyze Mode C check that every wrapper maps 1:1 to a `.magic/` body or is explicitly self-contained.
- **Release Pipeline Spec** (standing candidate): L2 spec for `.github/workflows/release.yml` (currently UNCOVERED).
- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
