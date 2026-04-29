> [!WARNING]
> **Status: Deprecated** — Superseded by GitHub manual distribution (v2.0.0).
> This specification is preserved for historical reference only.

# Installer Test Suite

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-installer-architecture.md

## Overview

Testing architecture for the Magic Spec thin-client installers. Validates installation logic, adapter flag handling, and release publishing across Node.js and Python implementations.

## Related Specifications

- [l1-installer-architecture.md](l1-installer-architecture.md) — Parent L1: delivery principles under test.
- [l2-installer-node.md](l2-installer-node.md) — Node.js installer implementation.
- [l2-installer-python.md](l2-installer-python.md) — Python installer implementation.
- [l1-adapter-interop.md](l1-adapter-interop.md) — Adapter integration standards verified by flag tests.
- [l2-release-workflow.md](l2-release-workflow.md) — Publish flow validated by publish tests.

## 1. Motivation

The installers are the primary distribution mechanism for the Magic SDD engine. Test coverage ensures that installation, adapter detection, and release publishing behave consistently across environments and prevent regressions during rapid iteration (66 commits in the last 30 days).

## 2. Constraints & Assumptions

- All tests run via `pytest` (invoked through `uv run pytest` or `python installers/scripts/run_tests.py`).
- Tests use temporary directories with sandbox isolation — no side effects on the real filesystem.
- `installers/config.json` is the single source of truth for engine paths and directory names used in test fixtures.

## 5. Detailed Design

### 5.1 Integration Tests (`test_integration.py`)

**14 test cases** (546 lines). End-to-end validation of the installer pipeline:

- Engine directory creation and payload extraction.
- Workflow file deployment to correct adapter paths.
- `config.json` field resolution (`engineDir`, `agentDir`, `workflowsDir`, `defaultExt`).
- Idempotent re-installation (update mode).
- Cleanup and rollback on partial failure.

### 5.2 Adapter Flag Tests (`test_adapter_flags.py`)

**2 test cases** (119 lines). Verifies IDE adapter detection and flag routing:

- Mock adapter registry against `adapters.json` structure.
- Correct `marker`, `dest`, and `ext` resolution per adapter entry (C17).

### 5.3 Publish Tests (`test_publish.py`)

**2 test cases** (55 lines). Validates the release publishing helpers:

- `update_python_version()` correctly patches `pyproject.toml` and `__init__.py`.
- Version string propagation across all expected files.

### 5.4 Test Runner

`installers/scripts/run_tests.py` — unified entry point. Also reachable via `npm test` (C19 parity).

## Canonical References

| Path | Role |
| :--- | :--- |
| `installers/tests/test_integration.py` | 14 integration tests for installer pipeline |
| `installers/tests/test_adapter_flags.py` | 2 adapter flag detection tests |
| `installers/tests/test_publish.py` | 2 release publishing tests |
| `installers/scripts/run_tests.py` | Unified test runner entry point |

## Document History

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | 2026-03-20 | Initial stable version. 18 tests across 3 modules. |