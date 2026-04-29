# Installers Specifications Registry

**Version:** 1.2.0
**Status:** Deprecated

> [!WARNING]
> **Workspace Deprecated (v2.0.0)** — The installer layer has been removed.
> Distribution is now handled via GitHub Releases (see `rules/version-check.md`).
> These specifications are preserved for historical reference only.

## Overview

Central registry for Magic Spec thin-client installers and IDE adapter integration.
Archived as of v2.0.0 — superseded by GitHub manual distribution model.

## System Files

- [../RULES.md](../RULES.md) - Global project constitution.

## Domain Specifications

| File | Description | Status | Layer | Version |
| :--- | :--- | :--- | :--- | :--- |
| [l1-installer-architecture.md](specifications/l1-installer-architecture.md) | Thin-client delivery principles. | Deprecated | 1 | 1.0.0 |
| [l2-installer-node.md](specifications/l2-installer-node.md) | Node.js installer implementation. | Deprecated | 2 | 1.0.0 |
| [l2-installer-python.md](specifications/l2-installer-python.md) | Python installer implementation. | Deprecated | 2 | 1.0.0 |
| [l1-adapter-interop.md](specifications/l1-adapter-interop.md) | AI IDE/Agent integration standards. | Deprecated | 1 | 1.0.0 |
| [l2-release-workflow.md](specifications/l2-release-workflow.md) | Unified release process for Node and Python. | Deprecated | 2 | 1.0.0 |
| [l2-installer-test-suite.md](specifications/l2-installer-test-suite.md) | Testing architecture for installers (18 tests, 3 modules). | Deprecated | 2 | 1.0.0 |

## Meta Information

- **Maintainer**: Core Team
- **License**: Apache 2.0
- **Last Updated**: 2026-04-29
- **Archived**: v2.0.0 — GitHub distribution model supersedes this workspace
