# Test Suite Specification

## Overview

Architecture and scenarios for validating the Magic SDD engine.

## Motivation

Maintain high reliability of the engine core and installers through automated regression testing.

## Components

- **installers/tests/test_integration.py**: End-to-end testing of installer logic.
- **installers/tests/test_adapter_flags.py**: Verification of IDE adapter logic.
- **magic.simulate (Cognitive)**: The primary engine validation tool. Runs all scenarios in `.magic/tests/suite.md` as a purely cognitive task — no physical scripts are created. The agent evaluates each test scenario internally against the engine workflow logic and reports PASS/FAIL/ROUGH EDGE.

## Cognitive Test Suite

`.magic/tests/suite.md` is the canonical regression suite for the engine. As of sprint 1:

- **157 tests** (T01–T163) covering all core workflows, guards, and edge cases.
- **Suite version**: v1.9.45.
- Tests are organized as H3 sections with `Synthetic State`, `Action`, `Expected`, and `Guards tested` fields.
- Sprint 1 regression tests (T86–T91) cover Runtime Guards: RE-1, RE-2, RE-3, RE-T71, RE-T74, and the T4/VERSION_DRIFT interaction.
- Post-sprint expansions (T92–T163) cover T4 tier routing, duplication checks, constitutional guards, atomic intent with drift resolution, and C15 scope-isolated integrity checks.

## CI/CD

Automated installer tests are triggered via `python installers/scripts/run_tests.py` or `npm test`. Cognitive engine tests are run via `/magic.simulate test`.

## Canonical References

| Path | Role |
| :--- | :--- |
| `.magic/tests/suite.md` | Cognitive regression test suite (157 tests, v1.9.45) |
| `.magic/simulate.md` | Simulation workflow that runs cognitive tests |
| `installers/tests/test_integration.py` | Integration tests for installer pipeline |
| `installers/tests/test_adapter_flags.py` | Adapter flag detection tests |
| `installers/scripts/run_tests.py` | Unified test runner |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.2.0 | 2026-03-20 | Agent | Reality sync: 91→157 tests (T01–T163), suite version v1.9.18→v1.9.45, added post-sprint expansion coverage. |
| 1.1.0 | 2026-03-04 | Agent | Clarified cognitive simulation as primary tool; documented suite state (91 tests, v1.9.18, RE-1–RE-T74 coverage). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
