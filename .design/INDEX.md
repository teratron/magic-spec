# Specifications Registry

**Version:** 1.11.0
**Status:** Active

## Overview

Central registry of all project specifications and their current state.

## System Files

- [RULES.md](RULES.md) - Project constitution and standing conventions.

## Domain Specifications

| File | Description | Status | Version |
| :--- | :--- | :--- | :--- |
| [architecture.md](specifications/architecture.md) | Two-layer repository structure: root (source of truth) + installers/ | Draft | 1.0.0 |
| [cli-installer.md](specifications/cli-installer.md) | CLI behavior for npx and uvx commands | Draft | 0.2.1 |
| [distribution-npm.md](specifications/distribution-npm.md) | npm package structure and publish process (npx) | Draft | 0.1.1 |
| [distribution-pypi.md](specifications/distribution-pypi.md) | PyPI package structure and publish process via uv (uvx) | Draft | 0.1.1 |
| [secrets-management.md](specifications/secrets-management.md) | .env-based credentials management for npm and PyPI publish scripts | Draft | 0.1.1 |
| [agent-environments.md](specifications/agent-environments.md) | Multi-environment adapter support: Cursor, GitHub Copilot, Kilo Code, Windsurf | Draft | 0.1.1 |
| [installer-features.md](specifications/installer-features.md) | Advanced CLI features: version tracking, info/check/eject, backup, .magicrc, auto-detect | Draft | 0.1.0 |
| [changelog.md](specifications/changelog.md) | Two-level Changelog generation: phase draft accumulation → plan-completion compile to CHANGELOG.md | Draft | 0.2.0 |
| [readme-strategy.md](specifications/readme-strategy.md) | Content strategy for 3 README variants: GitHub root, npm package, PyPI package | Draft | 0.1.0 |

## Meta Information

- **Maintainer**: Oleg Alexandrov
- **License**: MIT
- **Last Updated**: 2026-02-21

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-20 | Agent | Initial registry created by init script |
| 1.1.0 | 2026-02-20 | Agent | Added 4 initial specifications |
| 1.2.0 | 2026-02-20 | Agent | Added secrets-management.md |
| 1.3.0 | 2026-02-20 | Agent | Added Script Reference to distribution-npm and distribution-pypi |
| 1.4.0 | 2026-02-20 | Agent | Added agent-environments.md |
| 1.5.0 | 2026-02-20 | Agent | Eliminated core/; root is source of truth; updated architecture.md to v1.0.0 |
| 1.6.0 | 2026-02-20 | Agent | Clarified --env replaces .agent/; updated cli-installer v0.2.0, agent-environments v0.1.1 |
| 1.7.0 | 2026-02-20 | Agent | Added installer-features.md (8 advanced features); updated cli-installer to v0.2.1 |
| 1.8.0 | 2026-02-20 | Agent | Added changelog.md (two-level draft/compile strategy) |
| 1.9.0 | 2026-02-20 | Agent | changelog.md v0.2.0: added Task Change Record §3.2 (Created/Modified/Decided fields) |
| 1.10.0 | 2026-02-21 | Agent | Updated distribution-pypi.md to v0.1.2 (uv migration + registration checklist) |
| 1.11.0 | 2026-02-21 | Agent | Added readme-strategy.md (3-variant README content strategy) |
