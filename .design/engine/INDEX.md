# Engine Specifications Registry

**Version:** 1.3.0
**Status:** Active

## Overview

Central registry for the Magic SDD core engine and its automated subsystems.

## System Files

- [../RULES.md](../RULES.md) - Global project constitution.

## Domain Specifications

| File | Description | Status | Layer | Version |
| :--- | :--- | :--- | :--- | :--- |
| [l1-engine-core.md](specifications/l1-engine-core.md) | Core logic, workflows, invariants, and runtime guards. | Stable | 1 | 1.1.1 |
| [l2-engine-automation.md](specifications/l2-engine-automation.md) | Automation scripts, history subsystem, and execution logic. | Stable | 2 | 1.2.0 |
| [l2-test-suite.md](specifications/l2-test-suite.md) | Testing architecture, cognitive suite (157 tests, v1.9.45). | Stable | 2 | 1.2.0 |
| [l1-documentation-system.md](specifications/l1-documentation-system.md) | Knowledge base structure, governance, and docs/ sync policy. | Stable | 1 | 1.2.0 |
| [l1-config-drift-guard.md](specifications/l1-config-drift-guard.md) | Detection of manual RULES.md changes outside workflow lifecycle. | Stable | 1 | 1.0.0 |
| [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) | User-facing workflow entry points in `workflows/`. | Stable | 2 | 1.0.0 |
| [l2-engine-templates.md](specifications/l2-engine-templates.md) | Structural blueprints for specs, plans, tasks, and phases. | Stable | 2 | 1.0.0 |

## Meta Information

- **Maintainer**: Core Team
- **License**: MIT
- **Last Updated**: 2026-03-29
