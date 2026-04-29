# Magic Spec Distribution: User vs Developer

This document describes which files and tools are included in Magic Spec for regular users versus engine developers.

## 1. User Bundle

These files are distributed through GitHub Releases. Download `magic-spec-vX.Y.Z.zip`, extract it, and copy the release folders into the target project. The legacy npm and PyPI packages are frozen at `1.5.207` and are no longer part of the current distribution model.

### 1.1. Engine Core (`.magic/`)

| File | Description |
| :--- | :--- |
| `analyze.md` | Agent instructions for project health analysis. |
| `init.md` | Initial project initialization procedure. |
| `rule.md` | Logic for managing project rules and conventions. |
| `run.md` | Primary task executor from the implementation plan. |
| `spec.md` | Specification management and lifecycle control. |
| `task.md` | Task orchestrator and implementation plan generator. |
| `.version`, `.checksums` | Service files for version and file integrity control. |
| `scripts/executor.js` | Proxy script for running tools across different OS environments. |
| `scripts/check-prerequisites.js` | Environment verification before workflow execution. |
| `scripts/init.js` | File structure initialization script. |

### 1.2. Workflows (`workflows/`)

These are source workflow instructions that users copy into the target command directory for their AI agent.

- `magic.analyze.md` — launch a project audit.
- `magic.rule.md` — add or amend project rules.
- `magic.run.md` — execute the current task.
- `magic.spec.md` — create a new specification.
- `magic.task.md` — decompose specifications into tasks.

### 1.3. Compatibility Layer — Skills (`skills/`)

This directory contains workflow wrappers in the **Skills** format (each command in its own folder with a `SKILL.md`).

- Provide compatibility with various AI agents (e.g., Claude Code or Gemini CLI).
- Auto-generated from `.md` files in `workflows/`.
- Allow agents to discover available tools without parsing raw workflow files.

## 2. Dev Instruments

These files are kept in the main repository for maintainers. They are not part of the regular user release archive unless the release workflow explicitly includes them.

### 2.1. Additional files in `.magic/`

- `simulate.md` — instructions for engine logic "simulation" (debug mode).
- `tests/suite.md` — test scenario suite for regression checking.

### 2.2. Service Workflows

- `magic.dev.simulate.md` — command to launch simulations or tests.

## 3. Internal Repository Files (Engine Core / Maintainer)

These files are **never distributed** to end users. They exist only in the main `magic-spec` repository and are used by maintainers for building, publishing, and synchronization.

- `history/` — change archives for all workflows (organized by folder).
- `scripts/update-engine-meta.js` — automation for version and checksum updates (C14).
- `scripts/sync-docs.js` — documentation synchronization.
- `scripts/utils.js` — internal developer utilities.
- `.agents/` — maintainer-facing development workflows and skills.

> [!TIP]
> This separation keeps user projects clean from the engine's "meta-logic", providing only the tools necessary for development.
