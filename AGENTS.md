# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 1. Project Anatomy

The project is divided into three primary logical layers:

### 1.1. Core Engine (`.magic/` & `.agent/workflows/`)

- **Path**: `/.magic/` (Internal Logic) and `/.agent/workflows/` (External Triggers)
- **Role**: This is the "Brain" of the SDD (Specification-Driven Development) workflow.
- **Constraints**:
  - These directories are **read-only** for standard tasks.
  - Any changes here modify the workflow engine itself.
  - These files are distributed via `magic-spec` package updates.

### 1.2. Installers (`installers/`)

- **Path**: `/installers/` (Node.js and Python)
- **Role**: Responsible for distributing the Core Engine to user projects.
- **Constraints**:
  - Thin-client architecture: Installers primarily download the engine from GitHub.
  - High reliability and minimal dependencies are required.

### 1.3. Design Workspace (`.design/`)

- **Path**: `/.design/`
- **Role**: This is the project's own implementation of the Magic SDD workflow.
- **Content**: Contains the specifications, implementation plans, and tasks for `magic-spec` itself.
- **Note**: This acts as a "testing ground" and live documentation for the engine's capabilities.

## 2. Agent Operational Rules

1. **SDD First**: Never write code for new features without first defining them in a Specification (`.design/specifications/`) and creating a Task breakdown.
2. **Context Awareness**: Always refer to `.design/INDEX.md` to understand the current state of specifications and `.design/RULES.md` for coding conventions.
3. **Engine Integrity**: Do not modify files in `.magic/` or `.agent/workflows/` unless the task specifically requires "Engine Improvement".
4. **Installer Isolation**: Python and Node.js installers should be kept as independent as possible. Shared logic (like `adapters.json`) lives in the `installers/` root.
5. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.
