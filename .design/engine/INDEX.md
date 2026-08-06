# Engine Specifications Registry

**Version:** 1.15.12
**Status:** Active

## Overview

Central registry for the Magic SDD core engine and its automated subsystems.

## System Files

- [../RULES.md](../RULES.md) - Global project constitution.

## Domain Specifications

| File | Description | Status | Layer | Version |
| --- | --- | --- | --- | --- |
| [l1-engine-core.md](specifications/l1-engine-core.md) | Core logic, workflows, invariants (incl. C6/C10 traceability bindings), and runtime guards. | Stable | 1 | 1.1.4 |
| [l2-engine-automation.md](specifications/l2-engine-automation.md) | Automation scripts, history subsystem, and execution logic. | Stable | 2 | 1.6.0 |
| [l2-engine-finalization.md](specifications/l2-engine-finalization.md) | Finalization helper library (`scripts/lib/`): changelog, archival (eligibility precision §6, C8), git-utils, versioning, session-continuity step (SC-2/SC-3, merge-not-clobber progress recompute §5.1, SC-2.2 reserved-command screen), generator containment §7 (RC-11), STATE.md accuracy fixes §8 (SC-1.1, SC-2.1(a), SC-2.3, replacement-string injection §8.5), non-whitelisted file visibility §9 (SC-3.1). | Stable | 2 | 1.9.0 |
| [l2-test-suite.md](specifications/l2-test-suite.md) | Testing architecture, cognitive suite (206 tests, v1.9.74) + script-level harness with finalize-pipeline coverage mandate (C11 simulation, SC-2.2 matrix sweep, RC-2.1 shipped-text contract, RC-11 generator containment, SC-1.1/SC-2.1(a)/SC-2.3 STATE.md accuracy cases incl. replacement-string injection, SC-3.1 non-whitelisted file visibility). | Stable | 2 | 1.12.0 |
| [l1-documentation-system.md](specifications/l1-documentation-system.md) | Knowledge base structure, governance, and docs/ sync policy. | Stable | 1 | 1.2.2 |
| [l1-config-drift-guard.md](specifications/l1-config-drift-guard.md) | Detection of manual RULES.md changes outside workflow lifecycle. | Stable | 1 | 1.0.1 |
| [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) | User-facing workflow entry points in `workflows/`; wrapper-body parity invariant + WRAPPER_BODY_DRIFT check (§6). | Stable | 2 | 1.2.0 |
| [l2-skill-wrappers.md](specifications/l2-skill-wrappers.md) | Deployment-facing skill entry points in `skills/`. | Stable | 2 | 1.3.0 |
| [l2-engine-templates.md](specifications/l2-engine-templates.md) | Structural blueprints for specs, plans, tasks, and phases. | Stable | 2 | 1.1.0 |
| [l2-agent-surface.md](specifications/l2-agent-surface.md) | Adapter-facing surface definition (`.agents/`). | Stable | 2 | 1.0.1 |
| [l1-role-system.md](specifications/l1-role-system.md) | Unified role registry; supersedes scattered C24 persona mentions and adds code-writing stage roles. | Stable | 1 | 1.1.0 |
| [l1-prompt-quality-gate.md](specifications/l1-prompt-quality-gate.md) | Instruction-quality governance for AI-facing artifacts: PQ taxonomy, verdict semantics, universal gate policy. | Stable | 1 | 1.0.0 |
| [l2-role-cards.md](specifications/l2-role-cards.md) | Role card registry — file format, frontmatter schema, and 14-card inventory index. | Stable | 2 | 2.1.0 |
| [l2-role-cards-execution.md](specifications/l2-role-cards-execution.md) | Execution-pipeline card content (planner, orchestrator, coder, debugger, docs-specialist); Coder authoring gate carries RC-2.1 bare-form scan. | Stable | 2 | 1.2.0 |
| [l2-role-cards-review.md](specifications/l2-role-cards-review.md) | run.md review-gate card content (code-reviewer, code-simplifier, code-skeptic, test-engineer); RC-6 check bound to RC-2.1 patterns. | Stable | 2 | 1.2.0 |
| [l2-role-cards-governance.md](specifications/l2-role-cards-governance.md) | Governance card content (spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst, prompt-engineer). | Stable | 2 | 1.1.0 |
| [l2-role-integration.md](specifications/l2-role-integration.md) | Workflow-body integration of the role system: run/task/spec/analyze/rule/retro amendments + §C24 rewrite. | Stable | 2 | 2.1.0 |
| [l2-role-tooling.md](specifications/l2-role-tooling.md) | Role system engine tooling: check-prerequisites role_registry_integrity, update-engine-meta treatment, role template. | Stable | 2 | 1.0.0 |
| [l2-spec-graph-memory.md](specifications/l2-spec-graph-memory.md) | Spec Graph memory & token economy: extraction cache, wiki export, MCP token-budget, workflow integration triggers. | Stable | 2 | 1.1.1 |
| [l1-workspace-intent-routing.md](specifications/l1-workspace-intent-routing.md) | Pre-Resolution intent detection, ambiguity gate, atomic workspace creation, fit validation; WI-10 documentation-parity scope broadened to every init.md surface. | Stable | 1 | 1.1.0 |
| [l1-decision-autonomy.md](specifications/l1-decision-autonomy.md) | Autonomous Decision Protocol: escalation whitelist, deterministic selection, Decision Records, single-question format, declarative proposal & drift-revalidation surfaces (DA-9). | Stable | 1 | 1.2.0 |
| [l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) | One-way traceability boundary: product files never reference SDD artifacts; enforcement gates, notation-independent detection, remediation owner, shipped self-containment, generator self-containment (RC-1..RC-11). | Stable | 1 | 1.3.0 |
| [l1-session-continuity.md](specifications/l1-session-continuity.md) | Session continuity: STATE.md live-memory contract (Status field scope SC-1.1), universal post-command state updates (plan-state-aware next action SC-2.1 incl. Blocked-phase precedence SC-2.1(a), provenance-free field SC-2.2, progress granularity SC-2.3, structural-corruption is an SC-2 defect), commit suggestion guarantee incl. message completeness (SC-3.1), status briefing surface (SC-1..SC-5). | Stable | 1 | 1.6.0 |
| [l2-status-command.md](specifications/l2-status-command.md) | Read-only `/magic.status` briefing command: layout contract, degraded states, wrapper/skill surface (C2 exception). | Stable | 2 | 1.0.0 |
| [l2-release-pipeline.md](specifications/l2-release-pipeline.md) | GitHub Release CI: tag-driven build of the L1 archive, version source, publication/retry, engine-version tracking constraint (R8), adapter distribution reference (C17). | Stable | 2 | 1.0.1 |
| [l1-multi-angle-review.md](specifications/l1-multi-angle-review.md) | Multi-Angle Review & Decision Synthesis Protocol: 5 evaluation lenses, blind cross-evaluation, context auto-enrichment, and structured synthesis. | Stable | 1 | 1.0.0 |
| [l2-multi-angle-review.md](specifications/l2-multi-angle-review.md) | Multi-Angle Review & Decision Synthesis Implementation: prompt mappings, blind cross-review workflow, and role integrations. | Stable | 2 | 1.0.1 |

## Meta Information

- **Maintainer**: Core Team
- **License**: MIT
- **Last Updated**: 2026-08-06 (Non-whitelisted file visibility: l1-session-continuity 1.6.0 (new SC-3.1), l2-engine-finalization 1.9.0 (new §9), l2-test-suite 1.12.0 — finalize's suggested commit message and stdout listing reused the significance whitelist's filtered file set for the file *listing*, silently omitting every changed file outside `.design/{ws}/...`, including a `magic.run` task's own application-code deliverable — informal field report, confirmed by inspecting a real commit already on `master` where 15 of 17 changed files were invisible in finalize's own output)
