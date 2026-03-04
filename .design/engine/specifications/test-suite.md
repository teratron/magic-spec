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

- **91 tests** (T01–T91) covering all core workflows, guards, and edge cases.
- **Suite version**: v1.9.18.
- Tests are organized as H3 sections with `Synthetic State`, `Action`, `Expected`, and `Guards tested` fields.
- New regression tests (T86–T91) cover Runtime Guards: RE-1, RE-2, RE-3, RE-T71, RE-T74, and the T4/VERSION_DRIFT interaction.

## CI/CD

Automated installer tests are triggered via `python installers/scripts/run_tests.py` or `npm test`. Cognitive engine tests are run via `/magic.simulate test`.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.1.0 | 2026-03-04 | Agent | Clarified cognitive simulation as primary tool; documented suite state (91 tests, v1.9.18, RE-1–RE-T74 coverage). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
