# Engine Specifications Registry

**Version:** 1.18.0
**Status:** Active

## Overview

Central registry for the Magic SDD core engine and its automated subsystems.

## System Files

- [../RULES.md](../RULES.md) - Global project constitution.

## Domain Specifications

| File | Description | Status | Layer | Version |
| --- | --- | --- | --- | --- |
| [l1-engine-core.md](specifications/l1-engine-core.md) | Core logic, workflows, invariants (incl. C6/C10 traceability bindings), runtime guards, and Known Process Gaps (concept/implementation debt asymmetry, pending /magic.rule ratification). | Stable | 1 | 1.2.0 |
| [l2-engine-automation.md](specifications/l2-engine-automation.md) | Automation scripts, history subsystem, and execution logic. | Stable | 2 | 1.6.0 |
| [l2-engine-finalization.md](specifications/l2-engine-finalization.md) | Finalization pipeline contract (`scripts/lib/`): module inventory, invocation surface, opt-out, session-continuity step §5 (SC-2/SC-3, merge-not-clobber recompute, SC-2.2 screen), archival eligibility §6 (C8), archival index rewrite §7 (self-labelling PLAN.md links), terminal block ownership §8 (DG-5/DG-6). Decomposed at v2.0.0 — defect registers extracted to the two child specs below. | Stable | 2 | 2.0.0 |
| [l2-finalize-state-accuracy.md](specifications/l2-finalize-state-accuracy.md) | Child of l2-engine-finalization: every SC-1/SC-2 defect in the STATE.md update step — Blocked-phase next action, progress granularity, Status field collision, progress over-classification, replacement-string injection, line-cap exhaustion, and the decision-section structural defect (retrospec, engine 2.1.67). | Stable | 2 | 1.0.0 |
| [l2-finalize-output-contract.md](specifications/l2-finalize-output-contract.md) | Child of l2-engine-finalization: the emitted-artifact surface — RC-11 generator containment, SC-3.1 commit-message completeness, and CHANGELOG entry suppression (closed bullet vocabulary × idempotent append, with rotation never invoked). | Stable | 2 | 1.0.0 |
| [l2-test-suite.md](specifications/l2-test-suite.md) | Testing architecture, cognitive suite (206 tests, v1.9.74) + script-level harness with finalize-pipeline coverage mandate (C11 simulation, SC-2.2 matrix sweep, RC-2.1 shipped-text contract, RC-11 generator containment, SC-1.1/SC-2.1(a)/SC-2.3 STATE.md accuracy cases incl. replacement-string injection, SC-3.1 non-whitelisted file visibility, SC-1.2 line-cap guard exhaustion, DG-1..DG-9 diagnostics digest incl. cross-path output ordering). | Stable | 2 | 1.14.0 |
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
| [l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) | SDD↔product boundary in two dimensions: reference containment (product files never reference SDD artifacts — enforcement gates, notation-independent detection, remediation owner, shipped and generator self-containment) plus structural containment (RC-12 scaffold boundary + removal test, §4.4 check). RC-1..RC-12. | Stable | 1 | 1.4.0 |
| [l1-session-continuity.md](specifications/l1-session-continuity.md) | Session continuity: STATE.md live-memory contract (Status field scope SC-1.1, line-cap enforcement SC-1.2), universal post-command state updates (plan-state-aware next action SC-2.1 incl. Blocked-phase precedence SC-2.1(a), provenance-free field SC-2.2, progress granularity SC-2.3, structural-corruption is an SC-2 defect), commit suggestion guarantee incl. message completeness (SC-3.1), status briefing surface (SC-1..SC-5), plan-complete disambiguation (SC-2.4). | Stable | 1 | 1.8.0 |
| [l2-status-command.md](specifications/l2-status-command.md) | Read-only `/magic.status` briefing command: layout contract, degraded states, wrapper/skill surface (C2 exception). | Stable | 2 | 1.0.0 |
| [l2-release-pipeline.md](specifications/l2-release-pipeline.md) | GitHub Release CI: tag-driven build of the L1 archive, version source, publication/retry, engine-version tracking constraint (R8), adapter distribution reference (C17). | Stable | 2 | 1.0.1 |
| [l1-multi-angle-review.md](specifications/l1-multi-angle-review.md) | Multi-Angle Review & Decision Synthesis Protocol: 5 evaluation lenses, blind cross-evaluation, context auto-enrichment, and structured synthesis. | Stable | 1 | 1.0.0 |
| [l2-multi-angle-review.md](specifications/l2-multi-angle-review.md) | Multi-Angle Review & Decision Synthesis Implementation: prompt mappings, blind cross-review workflow, and role integrations. | Stable | 2 | 1.0.1 |
| [l1-scan-input-hygiene.md](specifications/l1-scan-input-hygiene.md) | Text-scan input preparation: mention/use boundary (SH-1), strip-before-match ordering (SH-2), template sources exempt from resolution (SH-3), bounded token capture (SH-4), one shared strip implementation (SH-5). Enforcement-surface table with per-scan compliance state. | Stable | 1 | 1.1.0 |
| [l1-engine-diagnostics.md](specifications/l1-engine-diagnostics.md) | Engine diagnostics digest: non-fatal findings (errors that did not abort, warnings, engine-applied corrections) are recorded rather than only printed, aggregated across processes, and rendered once immediately before the next step. DG-1..DG-9, incl. severity taxonomy, finding shape, exactly-once drain, empty-state silence, and the agent-side channel. | Stable | 1 | 1.0.0 |
| [l2-engine-diagnostics.md](specifications/l2-engine-diagnostics.md) | Diagnostics implementation: `lib/diagnostics.js` collector, JSONL sink under `.design/.cache/`, `record-diagnostic` executor subcommand, single `emitTail()` in finalize, and the migration inventory of all 17 non-fatal emitters with assigned severities and codes. | Stable | 2 | 1.0.0 |

## Meta Information

- **Maintainer**: Core Team
- **License**: MIT
- **Last Updated**: 2026-08-07 (Spec count 30 → 32: **l2-engine-finalization.md decomposed** at 367 lines against the 300 `SPEC_BLOAT` threshold — its two accumulated defect registers extracted to **l2-finalize-state-accuracy.md** and **l2-finalize-output-contract.md**, parent slimmed to the pipeline contract and bumped to 2.0.0. Four backlog items closed in the same pass: R10 archival index rewrite (five-for-five reproduced, previously blocked on having no stated contract), R11 CHANGELOG entry suppression (closed bullet vocabulary × idempotent append, rotation helper imported but never called), R12 `addDecision` retrospec (shipped at 2.1.67 ahead of its spec), R13 plan-complete disambiguation (`l1-session-continuity.md` 1.8.0, new SC-2.4 — Pre-flight tests mechanical drift only, so a design-debt backlog cannot raise the HALT the funnel's own justification depends on).)
- **Previous**: 2026-08-07 (Spec count 28 → 30: added **l1-engine-diagnostics.md** + **l2-engine-diagnostics.md** — the engine collects its own non-fatal findings and delivers them as one digest immediately before the next step, instead of printing them to a channel the relay contract does not cover. Root defect found while authoring: `rules/magic.md` §3 binds the agent to relay **stdout**, while all 17 non-fatal findings are written to **stderr** — the invisibility is contractual. `l2-engine-finalization.md` → 1.11.0 (§11 terminal block), `l2-test-suite.md` → 1.14.0 (cross-path ordering coverage), `l1-session-continuity.md` → 1.7.1 (cross-link).)
