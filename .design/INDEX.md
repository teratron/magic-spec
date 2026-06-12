# Project Specification Index

**Version:** 1.3.9
**Status:** Active
**Engine Version:** 2.1.30

## Overview

Aggregate registry of all workspace specifications.
Each workspace owns its detailed registry; this file provides cross-workspace navigation.

## Workspaces

| Workspace | Description | Specs | Registry |
| --- | --- | --- | --- |
| engine | Magic SDD core engine logic, workflows, rules, and history. | 22 | [engine/INDEX.md](engine/INDEX.md) |

## System Files

- [RULES.md](RULES.md) — Global project constitution.
- [workspace.json](workspace.json) — Workspace scope definitions.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
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
