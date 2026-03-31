# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 1. Project Anatomy

The project is divided into three primary logical layers:

### 1.1. Core Engine (`.magic/`, `workflows/`, `.agents/workflows/`)

- **Path**: `/.magic/` (Internal Logic), `/workflows/magic.*.md` (User Workflows), and `/.agents/workflows/` (Dev Workflows)
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
3. **Engine Integrity**: Do not modify files in `.magic/`, `workflows/`, or `.agents/workflows/` unless the task specifically requires "Engine Improvement".
   - **C14 Enforcement**: After ANY modification to content inside `.magic/` or workflow directories, run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` **immediately** — before reporting results, running tests, or continuing to the next step. This command bumps the patch version in `.magic/.version` and regenerates `.magic/.checksums`. This is a blocking gate, not a deferred task.
4. **Installer Isolation**: Python and Node.js installers should be kept as independent as possible. Shared logic (like `adapters.json`) lives in the `installers/` root.
5. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.

## 3. Language Policy

Consistency in communication and code is paramount.

### 3.1 Technical Content (English ONLY)

- **Codebase**: All identifiers (variables, functions, classes), comments, and docstrings.
- **Documentation**: Technical guides, READMEs, and implementation notes.
- **Process**: Commit messages, PR descriptions, and issue titles.
- **Environment**: Error messages, logs, and API definitions.

### 3.2 Communication (Russian)

- **Chat Interaction**: Discussions, explanations, and project planning.
- **Decision Making**: Strategic choices and high-level feature discussions.
- **Reviews**: Conversational feedback during pair programming.

## 4. Markdown Guidelines

- **Separators**: Avoid horizontal rules (`---`). Use them only in the footer if absolutely necessary.
- **Links**: No hardcoded absolute links (e.g., `file:///C:/...`). Use relative paths or just backticks for filenames (e.g., `pyproject.toml`).

## 5. Development Toolchain

The project strictly adheres to **uv-first** philosophy.

### 5.1 Virtual Environment

Always initialize and activate the environment before execution:

```bash
# Activation (Windows)
.venv\Scripts\activate

# Activation (Linux)
source .venv/bin/activate

# Initialization
uv sync
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

## 6. Python Coding Style

All Python source files must adhere to a premium and uniform visual style.

### 6.1 Documentation (Google Style)

- Use Google-style docstrings for all functions, methods, and classes.
- Include `Args:`, `Returns:`, and `Raises:` sections where applicable.
- Maintain `from __future__ import annotations` at the top of every file.

### 6.2 Navigation & Section Blocks

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

## 7. JavaScript/Node.js Coding Style

Common guidelines for Node.js scripts and installers.

### 7.1 Documentation (JSDoc)

- Use JSDoc for all functions, methods, and classes.
- Include `@param`, `@returns`, and `@throws` tags where applicable.

### 7.2 Navigation & Section Blocks

Use consistent Unicode-based separators to improve code readability:

- **Major Sections** (Modules, Main logic):

    ```javascript
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION NAME (ALL CAPS)
    // ═══════════════════════════════════════════════════════════════════════════
    ```

- **Minor Sections** (Internal logic groups, Utility functions):

    ```javascript
    // ───────────────────────────────────────────────────────────────────────────
    // Sub-section Name (Title Case)
    // ───────────────────────────────────────────────────────────────────────────
    ```

## 8. Windows Junction Safety

When managing Windows junctions (`mklink /J`) and git index, follow this strict order to prevent data loss:

### 8.1 The Problem

`git rm -r --cached <path>` on Windows **follows junctions** and physically deletes files in the junction target, even with `--cached`. Example: `git rm -r --cached .claude/commands` where `.claude/commands` is a junction to `.agents/workflows/` will **delete all files in `.agents/workflows/` from disk**.

### 8.2 Safe Procedure

Always run `git rm --cached` **before** creating junctions, while the paths are empty or nonexistent:

1. `git rm --cached`   ← first, while no junctions exist yet
2. `mklink /J ...`     ← then create junctions

When removing from git index, list **specific file paths** rather than directories:

```bash
# Safe — specific files only
git rm --cached --ignore-unmatch .agents/workflows/magic.analyze.md

# Dangerous — git will traverse the junction into parent/source directories
git rm -r --cached .claude/commands
```

## 9. File Interaction Protocol

To prevent accidental data loss or corruption in large documents, the agent MUST follow this protocol:

### 9.1 Pre-read Requirement

- **Mandatory**: Always call `view_file` on the target file BEFORE making any edits.
- **Scope**: Read the entire file if it's within tool limits (800 lines) to ensure full context.
- **Anti-Pattern**: DO NOT rely on cached or partial information from previous steps.

### 9.2 Post-verify Requirement

- **Verification**: Immediately after an edit, use `view_file` or `run_command` (grep/dir) to verify the result.
- **Integrity**: Check that surrounding code or documentation blocks (like diagrams) were NOT affected by the edit.
- **Recovery**: If data was lost, restore it immediately before proceeding.

## 10. Completion Protocol

Follow this checklist before declaring a task finished:

- [ ] **Validated**: All quality checks pass with zero warnings:
  - `uv run ruff check --fix` & `uv run ruff format`
  - `uv run pyrefly check`
  - `uv run pytest`
- [ ] **Versioned**: Increment the patch version (e.g., `1.4.1` → `1.4.2`) in:
  - `pyproject.toml`
  - `package.json`
  - `installers/python/magic_spec/__init__.py`
  - `CHANGELOG.md`
  - **Engine**: If content in `.magic/`, `workflows/`, or `.agents/workflows/` was modified, follow **Rule 2.3 (C14)** to update engine meta and version.
- [ ] **Documented**:
  - Update `CHANGELOG.md` with a summary of changes.
  - Update `README.md` if public API or features were changed.
  - Update relevant `.design/` workspace index/specifications to reflect task completion.
- [ ] **Synchronized**: Run `uv sync` to ensure `uv.lock` is up to date after `pyproject.toml` changes.
  - **Hardlinks**: Verify integrity with `fsutil hardlink list AGENTS.md` (should show 3 files). If broken, run `/magic.dev:init` to restore.
- [ ] **Preserved**: Verify that structural documents (like diagrams or `.design/INDEX.md`) haven't lost data during edits.
