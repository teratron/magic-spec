# Project Specification Index

**Version:** 1.3.20
**Status:** Active
**Engine Version:** 2.1.37

## Overview

Aggregate registry of all workspace specifications.
Each workspace owns its detailed registry; this file provides cross-workspace navigation.

## Workspaces

| Workspace | Description | Specs | Registry |
| --- | --- | --- | --- |
| engine | Magic SDD core engine logic, workflows, rules, and history. | 25 | [engine/INDEX.md](engine/INDEX.md) |

## System Files

- [RULES.md](RULES.md) — Global project constitution.
- [workspace.json](workspace.json) — Workspace scope definitions.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
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
