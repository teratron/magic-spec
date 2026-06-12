# Engine Specifications Registry

**Version:** 1.12.0
**Status:** Active

## Overview

Central registry for the Magic SDD core engine and its automated subsystems.

## System Files

- [../RULES.md](../RULES.md) - Global project constitution.

## Domain Specifications

| File | Description | Status | Layer | Version |
| --- | --- | --- | --- | --- |
| [l1-engine-core.md](specifications/l1-engine-core.md) | Core logic, workflows, invariants, and runtime guards. | Stable | 1 | 1.1.3 |
| [l2-engine-automation.md](specifications/l2-engine-automation.md) | Automation scripts, history subsystem, and execution logic. | Stable | 2 | 1.5.0 |
| [l2-engine-finalization.md](specifications/l2-engine-finalization.md) | Finalization helper library (`scripts/lib/`): changelog, archival, git-utils, versioning. | Stable | 2 | 1.0.0 |
| [l2-test-suite.md](specifications/l2-test-suite.md) | Testing architecture, cognitive suite (157 tests, v1.9.45). | Stable | 2 | 1.4.0 |
| [l1-documentation-system.md](specifications/l1-documentation-system.md) | Knowledge base structure, governance, and docs/ sync policy. | Stable | 1 | 1.2.2 |
| [l1-config-drift-guard.md](specifications/l1-config-drift-guard.md) | Detection of manual RULES.md changes outside workflow lifecycle. | Stable | 1 | 1.0.1 |
| [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) | User-facing workflow entry points in `workflows/`. | Stable | 2 | 1.0.0 |
| [l2-skill-wrappers.md](specifications/l2-skill-wrappers.md) | Deployment-facing skill entry points in `skills/`. | Stable | 2 | 1.2.0 |
| [l2-engine-templates.md](specifications/l2-engine-templates.md) | Structural blueprints for specs, plans, tasks, and phases. | Stable | 2 | 1.1.0 |
| [l2-agent-surface.md](specifications/l2-agent-surface.md) | Adapter-facing surface definition (`.agents/`). | Stable | 2 | 1.0.1 |
| [l1-role-system.md](specifications/l1-role-system.md) | Unified role registry; supersedes scattered C24 persona mentions and adds code-writing stage roles. | Stable | 1 | 1.1.0 |
| [l1-prompt-quality-gate.md](specifications/l1-prompt-quality-gate.md) | Instruction-quality governance for AI-facing artifacts: PQ taxonomy, verdict semantics, universal gate policy. | Stable | 1 | 1.0.0 |
| [l2-role-cards.md](specifications/l2-role-cards.md) | Role card registry — file format, frontmatter schema, and 14-card inventory index. | Stable | 2 | 2.1.0 |
| [l2-role-cards-execution.md](specifications/l2-role-cards-execution.md) | Execution-pipeline card content (planner, orchestrator, coder, debugger, docs-specialist). | Stable | 2 | 1.0.0 |
| [l2-role-cards-review.md](specifications/l2-role-cards-review.md) | run.md review-gate card content (code-reviewer, code-simplifier, code-skeptic, test-engineer). | Stable | 2 | 1.0.0 |
| [l2-role-cards-governance.md](specifications/l2-role-cards-governance.md) | Governance card content (spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst, prompt-engineer). | Stable | 2 | 1.1.0 |
| [l2-role-integration.md](specifications/l2-role-integration.md) | Workflow-body integration of the role system: run/task/spec/analyze/rule/retro amendments + §C24 rewrite. | Stable | 2 | 2.1.0 |
| [l2-role-tooling.md](specifications/l2-role-tooling.md) | Role system engine tooling: check-prerequisites role_registry_integrity, update-engine-meta treatment, role template. | Stable | 2 | 1.0.0 |
| [l2-spec-graph-memory.md](specifications/l2-spec-graph-memory.md) | Spec Graph memory & token economy: extraction cache, wiki export, MCP token-budget, workflow integration triggers. | Stable | 2 | 1.1.1 |
| [l1-workspace-intent-routing.md](specifications/l1-workspace-intent-routing.md) | Pre-Resolution intent detection, ambiguity gate, atomic workspace creation, fit validation. | Stable | 1 | 1.0.0 |
| [l1-decision-autonomy.md](specifications/l1-decision-autonomy.md) | Autonomous Decision Protocol: escalation whitelist, deterministic selection, Decision Records, single-question format. | Stable | 1 | 1.0.0 |

## Meta Information

- **Maintainer**: Core Team
- **License**: MIT
- **Last Updated**: 2026-06-12 (Decision Autonomy: l1-decision-autonomy.md added; C27 anchored in RULES.md, C13 §3 amended to Bounded Ambiguity Resolution)
