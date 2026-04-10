# Magic Spec Distribution: User vs Developer

This document describes which files and tools are included in Magic Spec for regular users versus engine developers.

## 1. User Bundle

These files are installed by running `npx magic-spec@latest` or `uvx magic-spec`. They provide the full SDD workflow for use in any project.

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

### 1.2. Workflows (`.agents/workflows/` → deployed to project root)

These are instructions ("workflows") that users invoke via `/magic:*` in the AI agent chat.

- `magic.analyze.md` — launch a project audit.
- `magic.rule.md` — add or amend project rules.
- `magic.run.md` — execute the current task.
- `magic.spec.md` — create a new specification.
- `magic.task.md` — decompose specifications into tasks.

### 1.3. Compatibility Layer — Skills (`skills/` and `.agents/skills/`)

These directories contain workflow wrappers in the **Skills** format (each command in its own folder with a `SKILL.md`).

- Provide compatibility with various AI agents (e.g., Claude Code or Gemini CLI).
- Auto-generated from `.md` files in the `workflows` directories.
- Allow agents to discover available tools without parsing raw workflow files.

## 2. Dev Instruments

These files are only installed when using the `--dev` flag: `npx magic-spec --dev`. They are intended for testing and modifying the Magic Spec engine itself.

### 2.1. Additional files in `.magic/`

- `simulate.md` — instructions for engine logic "simulation" (debug mode).
- `tests/suite.md` — test scenario suite for regression checking.

### 2.2. Service Workflows

- `magic.dev.simulate.md` — command to launch simulations or tests.

## 3. Internal Repository Files (Engine Core / Maintainer)

These files are **never distributed** to end users. They exist only in the main `magic-spec` repository and are used by maintainers for building, publishing, and synchronization.

- `history/` — change archives for all workflows (organized by folder).
- `installers/` — installer code (Node.js/Python) that downloads the engine core.
- `scripts/update-engine-meta.js` — automation for version and checksum updates (C14).
- `scripts/sync-docs.js` — documentation synchronization.
- `scripts/utils.js` — internal developer utilities.
- `workflows/` — source workflow templates before conversion by the installer.

> [!TIP]
> This separation keeps user projects clean from the engine's "meta-logic", providing only the tools necessary for development.
