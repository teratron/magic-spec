# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 1. Project Anatomy

The project is divided into three primary logical layers:

### 1.1. Core Engine (`.magic/` & `.agent/workflows/magic.*.md`)

- **Path**: `/.magic/` (Internal Logic) and `/.agent/workflows/magic.*.md` (External Triggers)
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
- **Content**: Contains specifications, implementation plans, and tasks for `magic-spec` itself, organized into workspaces defined by `.design/workspace.json`.
- **Structure**:
  - `.design/INDEX.md` — Global aggregate registry linking all workspace indexes.
  - `.design/RULES.md` — Global constitution (§1–6 universal rules + cross-workspace §7 conventions).
  - `.design/{workspace}/INDEX.md` — Workspace-specific specification registry.
  - `.design/{workspace}/RULES.md` — Workspace-specific §7 conventions (created on demand, inherits global rules; see C22).
- **Note**: This acts as a "testing ground" and live documentation for the engine's capabilities.

## 2. Agent Operational Rules

1. **SDD First**: Never write code for new features without first defining them in a Specification (`.design/specifications/`) and creating a Task breakdown.
2. **Context Awareness**: Always refer to `.design/INDEX.md` (global aggregate) and `.design/{workspace}/INDEX.md` (workspace registry) to understand the current state of specifications. For conventions, load `.design/RULES.md` (global) and `.design/{workspace}/RULES.md` (workspace-specific, if it exists).
3. **Engine Integrity**: Do not modify files in `.magic/` or `.agent/workflows/magic.*.md` unless the task specifically requires "Engine Improvement".
   - **C14 Enforcement**: After ANY modification to content inside `.magic/` (workflows, scripts, templates, tests, or config), run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` **immediately** — before reporting results, running tests, or continuing to the next step. This command bumps the patch version in `.magic/.version` and regenerates `.magic/.checksums`. This is a blocking gate, not a deferred task.
4. **Installer Isolation**: Python and Node.js installers should be kept as independent as possible. Shared logic (like `adapters.json`) lives in the `installers/` root.
5. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.

## 3. Language Preferences

### Brief overview

This set of guidelines outlines language preferences for the project, ensuring consistency in code and communication.

### Code and documentation language

- All code, comments, documentation, variable names, function names, class names, method names, attribute names, and technical terms must be in English
- Maintain English as the primary language for all technical elements including error messages, log entries, configuration keys, and API responses to ensure readability and maintainability
- Technical documentation, inline comments, docstrings, and README files must be written in English
- All commit messages, pull request descriptions, and issue titles related to code changes should be in English

### Communication style

- Explanations and discussions in the chat interface should be in Russian
- Use Russian for conversational responses, clarifications, project planning, and non-technical interactions
- Project management communications, feature discussions, and strategic decisions should be conducted in Russian
- Code review comments and technical discussions during development can be in Russian unless collaborating with English-speaking developers

## 4. Development Toolchain

The project strictly adheres to **uv-first** philosophy.

### 4.1 Virtual Environment

Always initialize and activate the environment before execution:

```bash
# Initialization
uv sync

# Activation (Windows)
.venv\Scripts\activate

# Activation (Linux)
source .venv/bin/activate
```

```bash
# Linting & Formatting
uv run ruff check --fix
uv run ruff format

# Static Analysis
uv run pyrefly check

# Verification
uv run pytest
```

## 5. Python Coding Style

All Python source files must adhere to a premium and uniform visual style.

### 5.1 Documentation (Google Style)

- Use Google-style docstrings for all functions, methods, and classes.
- Include `Args:`, `Returns:`, and `Raises:` sections where applicable.
- Maintain `from __future__ import annotations` at the top of every file.

### 5.2 Navigation & Section Blocks

Use consistent Unicode-based separators to improve code readablity:

- **Major Sections** (File-level, Classes, Public API):

    ```python
    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION NAME (ALL CAPS)
    # ═══════════════════════════════════════════════════════════════════════════
    ```

- **Minor Sections** (Internal logic groups, Utility functions):

    ```python
    # ───────────────────────────────────────────────────────────────────────────
    # Sub-section Name (Title Case)
    # ───────────────────────────────────────────────────────────────────────────
    ```

- Avoid standard standard PEP8 horizontal lines or excessive whitespace. Use Unicode box characters to create a clean, modern look.
