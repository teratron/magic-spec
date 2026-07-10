# Test Suite Specification

**Version:** 1.5.2
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Architecture and scenarios for validating the Magic SDD engine.

## Motivation

Maintain high reliability of the engine core through automated and cognitive regression testing.

## Components

- **magic.dev.simulate (Cognitive)**: The primary engine validation tool. Runs all scenarios in `dev/tests/suite.md` as a purely cognitive task — no physical scripts are created. The agent evaluates each test scenario internally against the engine workflow logic and reports PASS/FAIL/ROUGH EDGE.

## Cognitive Test Suite

`dev/tests/suite.md` is the canonical regression suite for the engine. Current state:

- **206 tests** (T01–T207; numbering gap at T67) covering all core workflows, guards, and edge cases.
- **Suite version**: v1.9.74.
- Tests are organized as H3 sections with `Synthetic State`, `Action`, `Expected`, and `Guards tested` fields.
- Sprint 1 regression tests (T86–T91) cover Runtime Guards: RE-1, RE-2, RE-3, RE-T71, RE-T74, and the T4/VERSION_DRIFT interaction.
- Post-sprint expansions (T92–T207) cover T4 tier routing, duplication checks, constitutional guards, atomic intent with drift resolution, C15 scope-isolated integrity checks, simulation-harness self-tests (T186–T192) — regression coverage for `magic.dev.simulate`, the developer-facing validation tool authorized under **C11 (Simulation Workflow, C2 exception)** — suite-to-workflow source-of-truth contracts (T203), diagram-text parity (T204–T205), and version-bleed / select-precedence wording parity (T206–T207).

## Script-Level Regression Harness

`dev/tests/engine.js` is the deterministic (non-cognitive) regression harness — Node's `node:test` runner exercising engine scripts against synthetic fixtures. It complements the cognitive suite: cognitive tests evaluate workflow *logic*, the harness pins script *behavior*.

**Finalize-pipeline coverage (mandatory):** because `scripts/finalize.js` is the single choke point for session-continuity (SC-2/SC-3 of `l1-session-continuity.md`), the harness MUST cover its non-trivial branches — any change to the finalize pipeline ships with a corresponding harness test:

- **SC-2 state patch** on both the significant path and the no-significant-change (skip) path — `STATE.md` is updated either way.
- **SC-2.1 plan-state-aware `Next Action`** — the plan-complete branch resolves to new-scope authoring, not "execute the active phase"; the open-tasks branch resolves to execution.
- **SC-3 non-bumping commit suggestion** — significance miss + dirty tree emits exactly one labeled suggestion; no version bump, no CHANGELOG entry, no write-side git.
- **`update-state.js --auto-progress`** — the Progress block is recomputed from `TASKS.md`.

A finalize-pipeline change merged without harness coverage of the touched branch is a test-suite gap.

## Canonical References

| Path | Role |
| --- | --- |
| `dev/tests/suite.md` | Cognitive regression test suite (206 tests, v1.9.74) |
| `dev/tests/engine.js` | Script-level regression harness (node:test); finalize-pipeline coverage mandate |
| `.agents/skills/magic-dev-simulate/SKILL.md` | Simulation skill that runs cognitive tests |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.5.2 | 2026-07-10 | Agent | Traceability: the simulation-harness self-test description now cites the **C11 (Simulation Workflow)** convention that authorizes `magic.dev.simulate`. No logic change (patch — Stable retained). |
| 1.5.1 | 2026-07-10 | Agent | Reality sync: 157→206 tests (T01–T207, gap at T67), suite v1.9.45→v1.9.74; fixed stale body paths .magic/tests/suite.md → dev/tests/suite.md (Canonical References were already correct since 1.4.0); extended coverage description with T186–T207 classes (harness self-tests, source-of-truth contract, diagram parity, version-bleed/select-precedence parity). |
| 1.5.0 | 2026-06-13 | Agent | Documented `dev/tests/engine.js` script-level harness and added the finalize-pipeline coverage mandate (SC-2 patch both paths, SC-2.1 plan-state next-action, SC-3 non-bumping fallback, update-state --auto-progress). Closes the gap where finalize.js shipped session-continuity logic with zero harness coverage. |
| 1.4.0 | 2026-05-07 | Agent | Added header fields (Version/Status/Layer/Implements). Updated canonical paths: .magic/tests/suite.md → dev/tests/suite.md; .magic/simulate.md → .agents/skills/magic-dev-simulate/SKILL.md. |
| 1.3.0 | 2026-04-29 | Agent | Removed legacy distribution test-suite references after GitHub distribution migration. |
| 1.2.0 | 2026-03-20 | Agent | Reality sync: 91→157 tests (T01–T163), suite version v1.9.18→v1.9.45, added post-sprint expansion coverage. |
| 1.1.0 | 2026-03-04 | Agent | Clarified cognitive simulation as primary tool; documented suite state (91 tests, v1.9.18, RE-1–RE-T74 coverage). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
