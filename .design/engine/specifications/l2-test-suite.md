# Test Suite Specification

**Version:** 1.4.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Architecture and scenarios for validating the Magic SDD engine.

## Motivation

Maintain high reliability of the engine core through automated and cognitive regression testing.

## Components

- **magic.simulate (Cognitive)**: The primary engine validation tool. Runs all scenarios in `.magic/tests/suite.md` as a purely cognitive task — no physical scripts are created. The agent evaluates each test scenario internally against the engine workflow logic and reports PASS/FAIL/ROUGH EDGE.

## Cognitive Test Suite

`.magic/tests/suite.md` is the canonical regression suite for the engine. As of sprint 1:

- **157 tests** (T01–T163) covering all core workflows, guards, and edge cases.
- **Suite version**: v1.9.45.
- Tests are organized as H3 sections with `Synthetic State`, `Action`, `Expected`, and `Guards tested` fields.
- Sprint 1 regression tests (T86–T91) cover Runtime Guards: RE-1, RE-2, RE-3, RE-T71, RE-T74, and the T4/VERSION_DRIFT interaction.
- Post-sprint expansions (T92–T163) cover T4 tier routing, duplication checks, constitutional guards, atomic intent with drift resolution, and C15 scope-isolated integrity checks.

## CI/CD

Cognitive engine tests are run via `/magic.simulate test`. Script-level checks are executed through `.magic/scripts/executor.js`.

## Canonical References

| Path | Role |
| --- | --- |
| `dev/tests/suite.md` | Cognitive regression test suite (157 tests, v1.9.45) |
| `.agents/skills/magic-dev-simulate/SKILL.md` | Simulation skill that runs cognitive tests |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.4.0 | 2026-05-07 | Agent | Added header fields (Version/Status/Layer/Implements). Updated canonical paths: .magic/tests/suite.md → dev/tests/suite.md; .magic/simulate.md → .agents/skills/magic-dev-simulate/SKILL.md. |
| 1.3.0 | 2026-04-29 | Agent | Removed legacy distribution test-suite references after GitHub distribution migration. |
| 1.2.0 | 2026-03-20 | Agent | Reality sync: 91→157 tests (T01–T163), suite version v1.9.18→v1.9.45, added post-sprint expansion coverage. |
| 1.1.0 | 2026-03-04 | Agent | Clarified cognitive simulation as primary tool; documented suite state (91 tests, v1.9.18, RE-1–RE-T74 coverage). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
