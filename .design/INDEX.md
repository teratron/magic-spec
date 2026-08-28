# Project Specification Index

**Version:** 1.9.0
**Status:** Active
**Engine Version:** 2.1.80

## Overview

Aggregate registry of all workspace specifications.
Each workspace owns its detailed registry; this file provides cross-workspace navigation.

## Workspaces

| Workspace | Description | Specs | Registry |
| --- | --- | --- | --- |
| engine | Magic SDD core engine logic, workflows, rules, and history. | 33 | [engine/INDEX.md](engine/INDEX.md) |

## System Files

- [RULES.md](RULES.md) — Global project constitution.
- [workspace.json](workspace.json) — Workspace scope definitions.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.9.0 | 2026-08-28 | Agent | Engine workspace spec count 32 → 33: added l1-idea-intake-gate.md 1.0.0 (IK-1..IK-9). Owner directive — `/magic.spec {idea}` must refine an under-determined idea through clarification before generating specifications, while the agent resolves technical questions itself and phrases any question for a non-specialist. The gate is the input-side twin of l1-prompt-quality-gate.md: the engine routes every prompt it *writes* through `prompt-engineer`, and nothing at all reviews the prompt it *receives*, though the idea is the first prompt in the chain and its defects are amplified by every later stage. Registered as C27 Escalation Whitelist entry E6 without loosening DA-1/DA-3/DA-9 — Selection, Sequencing, and proposal surfaces stay declarative — and IK-3 permanently bars technical-realization questions from the user channel, since routing them to a non-specialist is the exact failure mode C27 §1.1 documents. Firing is closed to F1 (incoherent idea) and F2 (two coherent readings yielding materially different specs, decided by the one-sentence-Overview test); everything else still falls to a TBD marker. Owner chose an uncapped dialogue over a three-question budget, so termination rests on IK-6's strict-shrink rule — the open set must be smaller at each round's end, making the gate provably finite without a counter; "you decide" is a first-class non-convergent reply that ends it at once. Post-Update Review found two defects, both fixed before promotion: IK-6's original "closes at least one question" test did not actually terminate, and C25's phrasing ban needed an explicit reconciliation with IK-5. Deployment §5 routes seven engine touch-points (DA-2 table, `.design/RULES.md` + `.magic/templates/rules.md` C27 parity, `rules/magic.md` §7, `.magic/spec.md`, wrapper, role card, tests) to `/magic.task engine` — all outside `/magic.spec`'s write scope. |
| 1.8.0 | 2026-08-27 | Agent | User directive: retire the commit-message suggestion feature entirely — the engine no longer composes or prints a suggested commit message on any finalize path; committing (timing, grouping, message) is left entirely to the user. No spec-count change (32/32). Retired SC-3/SC-3.1 in l1-session-continuity.md (1.11.0 → 2.0.0) and propagated through l2-engine-finalization.md (2.0.0 → 3.0.0), l2-finalize-output-contract.md (1.2.0 → 2.0.0), l2-finalize-state-accuracy.md (1.1.1 → 1.1.2), l2-status-command.md (1.0.0 → 1.1.0), l2-test-suite.md (1.14.0 → 1.15.0), l1-engine-diagnostics.md (1.0.0 → 1.0.1), l2-engine-diagnostics.md (1.0.0 → 1.1.0). The pre-existing hard rule (no write-side git operation is ever invoked) is unaffected. Actual code removal in `.magic/scripts/lib/commit-suggester.js`/`finalize.js` and the `finalization.suggestCommit` config flag are out of `/magic.spec`'s write scope — routed to `/magic.task engine`. Post-Update Review (5-lens) and Instruction Quality Pass found no blocking issues across all eight specs. |
| 1.7.1 | 2026-08-07 | Agent | Ventilation: engine snapshot ratified 2.1.64 → 2.1.70 (Batch Version Precedence + Batch Guard Failure clauses added to rule.md; T208 regression test). Registry: 32/32 Stable, 0 ghost/zombie, 0 containment leaks, 0 shadow logic, coverage 97% (2 uncovered, 3 ambiguous). Findings: `specifications/simulations/workspace-intent-routing.md` is an unregistered non-spec artifact nested outside the documented `specifications/` contract (routed to `/magic.task engine` for a containment decision); `l2-spec-graph-memory.md` uses `Layer: 2` instead of the project's `Layer: implementation` convention (cosmetic, all other L2 specs consistent); `l2-engine-diagnostics.md` crossed the 300-line SPEC_BLOAT threshold (303 lines, advisory); `.design/engine/INDEX.md` itself lands UNCOVERED in the coverage denominator — live evidence against `l2-engine-automation.md` §Coverage Denominator Scope's prior "not evidenced as needed" call on exempting INDEX.md/RULES.md. Auto-repaired: wiki was stale (PLAN.md newer than `wiki/index.md`) — refreshed via export-wiki. |
| 1.7.0 | 2026-08-07 | Agent | DESIGN_DEBT_PENDING-triggered pass over the post-Phase-19 Backlog (no spec-count change, three amended): l2-finalize-output-contract.md 1.0.0 → 1.1.0 (R11 remainder closed — §4.3 root-caused to two 2026-05 manual commits via `git blame`, not a live writer defect; §4.4 design decision — CHANGELOG rotation becomes an explicit opt-in `release-changelog` executor subcommand, never inferred from any signal finalize can see, since magic-spec cannot observe a downstream consumer's release event). l1-engine-core.md 1.2.0 → 1.3.0 (UNSCOPED dev/ resolved — `engine` workspace's own C15 rationale excludes only *unrelated* modules, and `dev/` is this engine's own Layer 2, so `workspace.json`'s `engine.scope` gained `dev` directly, no `/magic.rule` needed). l2-engine-automation.md 1.6.0 → 1.7.0 (coverage-metric denominator fix — new `EXEMPT` classification excludes `.design/` bookkeeping/journal files from `analyze-coverage.js`'s percentage math while keeping them visible in JSON output; `.magic/analyze.md`'s taxonomy doc flagged as a required parallel update for the implementing task). Remaining Backlog after this pass: R11 implementation itself (script + finalize.js import removal), the coverage EXEMPT implementation, debt-ceiling ratification, dev-repo snapshot drift, R8/R9 (documented-not-fixed), SPEC_BLOAT watch, two deferred/rejected items — routed to `/magic.task engine`. |
| 1.6.0 | 2026-08-07 | Agent | Engine workspace spec count 30 → 32: l2-engine-finalization.md decomposed at 367 lines against the 300 SPEC_BLOAT threshold, following the l2-role-cards precedent — its two accumulated defect registers extracted to l2-finalize-state-accuracy.md (STATE.md correctness: seven defects incl. the new §8 retrospec of a fix that shipped at engine 2.1.67 ahead of its spec) and l2-finalize-output-contract.md (emitted artifacts: RC-11 containment, SC-3.1 completeness, and new §4 CHANGELOG entry suppression). Parent slimmed to the pipeline contract at 2.0.0, gaining §7 Archival Index Rewrite — a five-for-five reproduced defect that had persisted precisely because the module table never documented that the archiver rewrites PLAN.md at all. l1-session-continuity.md 1.7.1 → 1.8.0 (new SC-2.4: SC-2.2's funnel justification assumes Pre-flight can HALT, but Pre-flight tests mechanical drift only, so a plan-complete state blocked on design debt routes back to the command that just produced nothing — observed end-to-end, including one finalize whose digest and next-step line disagreed with each other). Five backlog entries closed, one of them stale since 1.10.1. |
| 1.5.0 | 2026-08-07 | Agent | Engine workspace spec count 28 → 30: added l1-engine-diagnostics.md (DG-1..DG-9 — non-fatal engine findings are recorded rather than only printed, aggregated across processes, and delivered as one digest immediately before the next step) and l2-engine-diagnostics.md (collector, JSONL sink, agent-facing recorder, single tail emitter, 17-site migration inventory). Root defect established during authoring: `rules/magic.md` §3 binds the agent to relay **stdout**, while every non-fatal finding is written to **stderr** — the invisibility is contractual, not incidental, and the class of engine-applied corrections had no name or destination at all. l2-engine-finalization.md 1.10.1 → 1.11.0 (§11 terminal block ownership), l2-test-suite.md 1.13.0 → 1.14.0 (cross-path output ordering as a pinned contract), l1-session-continuity.md 1.7.0 → 1.7.1 (cross-link). |
| 1.4.0 | 2026-08-06 | Agent | Engine workspace spec count 27 → 28: added l1-scan-input-hygiene.md (SH-1..SH-5 — the mention/use boundary for text scans, plus template sources exempt from resolution checks). Authored after the same root cause surfaced a fourth time, in `check-prerequisites`' registry cross-reference, which read a quoted placeholder path out of PLAN.md prose and reported a nonexistent specification. l2-engine-finalization.md 1.10.0 → 1.10.1 (§8.4 worked regex corrected). |
| 1.3.24 | 2026-08-06 | Agent | Ventilation: engine snapshot ratified 2.1.61 → 2.1.64 (finalize/state accuracy fixes and the scaffold-boundary + documentation-parity deployment). Registry clean: 27/27 Stable, 0 ghost/zombie, 0 orphaned conventions, 0 containment leaks. First run of the scaffold-removal check — clean baseline, verified against the release pipeline, which packages the four engine directories and never `.design/`. |
| 1.3.23 | 2026-08-06 | Agent | Ventilation: engine snapshot ratified 2.1.55 → 2.1.61 (v2.1.56–2.1.61 finalization/containment fixes). |
| 1.3.21 | 2026-07-25 | Agent | Engine workspace spec count 25 → 27: added l1-multi-angle-review.md and l2-multi-angle-review.md (LLM Council multi-angle review & decision synthesis protocol). |
| 1.3.20 | 2026-06-13 | Agent | Engine workspace spec count 24 → 25: added l2-release-pipeline.md (retrospec of the GitHub Release CI; documents engine-version tracking constraint, consolidating R8). No code change — documents existing stable CI. |
| 1.3.19 | 2026-06-13 | Agent | l1-decision-autonomy.md 1.2.0: DA-9 extended to drift-revalidation offers (Engine Upgrade Detection §1 binds DA-8/DA-9 — one path, no `[y/n]`). Engine deployment (rules/magic.md §1 + README) queued for /magic.task → /magic.run. |
| 1.3.18 | 2026-06-13 | Agent | l2-workflow-wrappers.md 1.2.0 §6 Wrapper-Body Parity Invariant + WRAPPER_BODY_DRIFT check (R4 preventive). Engine deployment (analyze Mode C check + test) queued for /magic.task → /magic.run. |
| 1.3.17 | 2026-06-13 | Agent | l2-engine-finalization.md 1.2.0 §6 Phase Archival Eligibility Precision (R7): allChecked must match anchored checklist line items, not substring `- [ ]` in prose. Engine deployment (regex fix + test + re-archive phase-10) queued for /magic.task → /magic.run. |
| 1.3.16 | 2026-06-13 | Agent | Session-Continuity Hardening: l1-session-continuity.md 1.1.0 (SC-2.1 plan-state-aware next-action) + l2-test-suite.md 1.5.0 (finalize-pipeline harness coverage mandate). Engine deployment (finalize computeNextAction fix + engine.js finalize test) queued for /magic.task → /magic.run. |
| 1.3.15 | 2026-06-13 | Agent | l1-decision-autonomy.md 1.0.0 → 1.1.0: added DA-9 (Proposal Surfaces Are Declarative) closing the deployment gap that permitted a non-whitelisted Blank-Trigger question. Engine deployment (spec.md wording) queued for /magic.task → /magic.run. |
| 1.3.13 | 2026-06-12 | Agent | Engine snapshot ratified 2.1.34 → 2.1.37 via /magic.analyze (Phase 8: session continuity SC-2/SC-3 + /magic.status). |
| 1.3.12 | 2026-06-12 | Agent | Engine workspace spec count 22 → 24: added l1-session-continuity.md (SC-1..SC-5) and l2-status-command.md (/magic.status, C2 exception); finalization 1.1.0, workflow-wrappers 1.1.0, skill-wrappers 1.3.0 amendments. |
| 1.3.11 | 2026-06-12 | Agent | Sync: engine snapshot 2.1.32; README badge 2.1.28 → 2.1.32; CONTRIBUTING.md and docs/ regenerated. |
| 1.3.10 | 2026-06-12 | Agent | l1-sdd-reference-containment.md 1.0.0 → 1.1.0: RC-9 Shipped Self-Containment (engine→`.design/engine/` leaks no longer masked by RC-8 exemption). |
| 1.3.9 | 2026-06-12 | Agent | Engine workspace spec count 21 → 22: added l1-sdd-reference-containment.md (one-way SDD traceability boundary); coder/code-reviewer cards 1.1.0 (RC-5/RC-6 gates). |
| 1.3.8 | 2026-06-12 | Agent | Engine workspace spec count 20 → 21: added l1-decision-autonomy.md (Autonomous Decision Protocol); RULES.md 1.7.0 → 1.8.0 (C27 added, C13 §3 amended). |
| 1.3.7 | 2026-06-11 | Agent | Engine workspace spec count 19 → 20: added l1-prompt-quality-gate.md; prompt-engineer role registered (14th card) across l1-role-system, l2-role-cards, l2-role-cards-governance, l2-role-integration. |
| 1.3.6 | 2026-06-10 | Agent | Engine workspace spec count 18 → 19: l2-role-integration tooling extracted to l2-role-tooling (Engine Improvement #4, SPEC_BLOAT fix). |
| 1.3.5 | 2026-06-10 | Agent | Engine workspace spec count 15 → 18: l2-role-cards decomposed into execution/review/governance child specs (Engine Improvement #3). |
| 1.3.4 | 2026-06-10 | Agent | Engine Improvements #1–#2 (RE-1 absent-header drift, detect-communities gitignore-aware scan); engine 2.1.28 → 2.1.30. |
| 1.3.3 | 2026-05-12 | Agent | Added explicit Run QA `Verify Criterion` guard to align execution workflow with task verify lines and Test-engineer role card. Engine 2.1.15 → 2.1.16. |
| 1.3.2 | 2026-05-12 | Agent | Integrated coding discipline into engine role cards and phase task template: material assumptions, diff traceability, minimal implementation, and mandatory `Verify` criteria. Engine 2.1.14 → 2.1.15. |
| 1.3.1 | 2026-05-07 | Agent | Internationalisation: removed all Cyrillic tokens from engine/spec files; backported C25 + added C26 to project RULES.md (1.6.1 → 1.7.0); fixed dev/tests/engine.js harness (11/11 tests now pass). Engine 2.1.2 → 2.1.3. |
| 1.3.0 | 2026-05-07 | Agent | Engine improvement: Workspace Intent Routing (l1-workspace-intent-routing.md). Engine 2.1.1 → 2.1.2. |
| 1.2.2 | 2026-05-04 | Agent | Automated metadata update |
| 1.2.1 | 2026-04-29 | Agent | Automated metadata update |
| 1.2.0 | 2026-04-29 | Agent | Removed archived legacy distribution workspace after GitHub distribution migration |
| 1.1.1 | 2026-04-29 | Agent | Automated metadata update |
| 1.1.0 | 2026-04-29 | Agent | Archived legacy distribution workspace; add rules/ to engine scope (v2.0.0) |
| 1.0.18 - 1.0.20 | 2026-04-25 | Agent | Automated metadata update |
| 1.0.16 | 2026-04-22 | Agent | Automated metadata update |
| 1.0.15 | 2026-04-18 | Agent | Sync: engine count 8→9, version parity 1.5.169 |
| 1.0.14 | 2026-04-09 | Agent | Automated metadata update |
| 1.0.13 | 2026-04-07 | Agent | Automated metadata update |
| 1.0.12 | 2026-04-07 | Agent | Automated metadata update |
| 1.0.11 | 2026-04-07 | Agent | Automated metadata update |
| 1.0.10 | 2026-04-07 | Agent | Automated metadata update |
| 1.0.9 | 2026-04-07 | Agent | Automated metadata update |
| 1.0.8 | 2026-04-03 | Agent | Automated metadata update |
| 1.0.7 | 2026-04-03 | Agent | Automated metadata update |
| 1.0.6 | 2026-04-03 | Agent | Automated metadata update |
| 1.0.5 | 2026-04-03 | Agent | Automated metadata update |
| 1.0.4 | 2026-04-02 | Agent | Automated metadata update |
| 1.0.3 | 2026-04-02 | Agent | Automated metadata update |
| 1.0.2 | 2026-04-02 | Agent | Automated metadata update |
| 1.0.1 | 2026-03-31 | Agent | Corrected engine workspace spec count (7 -> 8). |
| 1.0.0 | 2026-03-05 | Agent | Initial global aggregate index. |
