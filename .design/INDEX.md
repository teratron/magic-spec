# Specifications Registry

**Version:** 1.22.0
**Status:** Active

## Overview

Central registry of all project specifications and their current state.

## System Files

- [RULES.md](RULES.md) - Project constitution and standing conventions.

## Domain Specifications

| File | Description | Status | Layer | Version |
| :--- | :--- | :--- | :--- | :--- |
| [architecture.md](specifications/architecture.md) | Two-layer repository structure: root (source of truth) + installers/ | Stable | implementation | 1.2.0 |
| [cli-installer.md](specifications/cli-installer.md) | CLI behavior for npx and uvx commands | Stable | implementation | 1.0.0 |
| [distribution-npm.md](specifications/distribution-npm.md) | npm package structure and publish process (npx) | Stable | implementation | 1.0.0 |
| [distribution-pypi.md](specifications/distribution-pypi.md) | PyPI package structure and publish process via uv (uvx) | Stable | implementation | 1.0.0 |
| [secrets-management.md](specifications/secrets-management.md) | ~~.env-based credentials management~~ — Deprecated | Deprecated | implementation | 0.2.0 |
| [agent-environments.md](specifications/agent-environments.md) | Multi-environment adapter support via abstract templates (Markdown/TOML) for major IDEs and CLIs | Stable | implementation | 1.0.0 |
| [installer-features.md](specifications/installer-features.md) | Advanced CLI features: version tracking, info/check/eject, backup, .magicrc, auto-detect | Stable | implementation | 1.0.0 |
| [changelog.md](specifications/changelog.md) | Two-level Changelog generation: phase draft accumulation → plan-completion compile to CHANGELOG.md | Stable | implementation | 1.0.0 |
| [readme-strategy.md](specifications/readme-strategy.md) | Content strategy for the unified Single README variant (GitHub root, npm, PyPI) | Stable | implementation | 1.0.0 |
| [workflow-enhancements.md](specifications/workflow-enhancements.md) | Eight targeted improvements: handoffs, user stories, prerequisite validation, CONTEXT.md, explore mode, onboarding, CLI doctor, and delta hints | Stable | implementation | 1.2.0 |

## Meta Information

- **Maintainer**: Oleg Alexandrov
- **License**: MIT
- **Last Updated**: 2026-02-26

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
| 1.12.0 | 2026-02-21 | Agent | Major spec refactor: synced 7 specs to current structure; deprecated secrets-management |
| 1.13.0 | 2026-02-23 | Agent | Handled workflow-enhancements.md |
| 1.14.0 | 2026-02-23 | Agent | Updated agent-environments (v0.3.0) and cli-installer (v0.4.0) to support abstract templates |
| 1.15.0 | 2026-02-23 | Agent | Updated workflow-enhancements to v0.2.0 (added CONTEXT.md feature) |
| 1.16.0 | 2026-02-23 | Agent | Updated workflow-enhancements to v0.3.0 |
| 1.17.0 | 2026-02-23 | Agent | Updated workflow-enhancements to v0.5.0 and marked as Stable |
| 1.18.0 | 2026-02-23 | Agent | Bumped workflow-enhancements to v1.1.0 for release alignment |
| 1.19.0 | 2026-02-25 | Agent | Synchronized all specs with SDD standard metadata (Layer, RFC status update) |
| 1.20.0 | 2026-02-25 | Agent | Updated all installer specs to Stable and matched them to current Thin Client architecture |
| 1.21.0 | 2026-02-25 | Agent | Added Layer column to Domain Specifications table |
| 1.22.0 | 2026-02-26 | Agent | Engine Hardening: Added bidirectional sync and Rule 57 validation |
