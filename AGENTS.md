# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 1. Project Anatomy

The project is divided into three primary logical layers:

### 1.1. Core Engine (`.magic/`, `workflows/`, `skills/`, `rules/`)

- **Path**: `/.magic/` (Logic), `/workflows/` (Standard Workflows), `/skills/` (Compatibility API), `/rules/` (Rules).
- **Role**: This is the "Brain" of the SDD (Specification-Driven Development) workflow.
- **Constraints**:
  - These directories are **read-only** for standard tasks.
  - Any changes here modify the workflow engine itself.
  - These files are distributed via GitHub Releases (see `rules/magic.md`).

### 1.2. Design Workspace (`.design/`)

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
3. **Engine Integrity**: Do not modify files in `.magic/` or `workflows/` unless the task specifically requires "Engine Improvement".
   - **C14 Enforcement**: After ANY modification to content inside `.magic/` or `workflows/` directories, run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` **immediately** — before reporting results, running tests, or continuing to the next step. This command bumps the patch version, regenerates checksums, and **automatically synchronizes Skill wrappers**.
4. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.

## 3. Development Toolchain

The project uses a script-based execution model.

### 3.1 Script Execution

All development tasks (metadata sync, analysis, simulation) are handled via the engine's internal scripts:

```bash
# Update engine metadata and version (C14)
node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}

# Run project analysis
/magic.analyze
```

## 4. Python Coding Style

All Python source files must adhere to a premium and uniform visual style.

### 4.1 Documentation (Google Style)

- Use Google-style docstrings for all functions, methods, and classes.
- Include `Args:`, `Returns:`, and `Raises:` sections where applicable.
- Maintain `from __future__ import annotations` at the top of every file.

### 4.2 Navigation & Section Blocks

Use consistent Unicode-based separators to improve code readability:

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

## 5. JavaScript/Node.js Coding Style

Common guidelines for Node.js scripts.

### 5.1 Documentation (JSDoc)

- Use JSDoc for all functions, methods, and classes.
- Include `@param`, `@returns`, and `@throws` tags where applicable.

### 5.2 Navigation & Section Blocks

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

## 6. Windows Junction Safety

When managing Windows junctions (`mklink /J`) and git index, follow this strict order to prevent data loss:

### 6.1 The Problem

`git rm -r --cached <path>` on Windows **follows junctions** and physically deletes files in the junction target, even with `--cached`. Example: `git rm -r --cached .claude/commands` where `.claude/commands` is a junction to `workflows/` will **delete all files in `workflows/` from disk**.

### 6.2 Safe Procedure

Always run `git rm --cached` **before** creating junctions, while the paths are empty or nonexistent:

1. `git rm --cached`   ← first, while no junctions exist yet
2. `mklink /J ...`     ← then create junctions

When removing from git index, list **specific file paths** rather than directories:

```bash
# Safe — specific files only
git rm --cached --ignore-unmatch workflows/magic.analyze.md

# Dangerous — git will traverse the junction into parent/source directories
git rm -r --cached .claude/commands
```

## 7. File Interaction Protocol

To prevent accidental data loss or corruption in large documents, the agent MUST follow this protocol:

### 7.1 Pre-read Requirement

- **Mandatory**: Always call `read` on the target file BEFORE making any edits.
- **Scope**: Read the entire file if it's within tool limits (800 lines) to ensure full context.
- **Anti-Pattern**: DO NOT rely on cached or partial information from previous steps.

### 7.2 Post-verify Requirement

- **Verification**: Immediately after an edit, use `read` or `bash` (grep/dir) to verify the result.
- **Integrity**: Check that surrounding code or documentation blocks (like diagrams) were NOT affected by the edit.
- **Recovery**: If data was lost, restore it immediately before proceeding.

- [ ] **Validated**: All logic changes verified via simulation:
  - `/magic.dev.simulate`
- [ ] **Versioned**: Increment the patch version (e.g., `2.0.1` → `2.0.2`) in:
  - `.magic/.version`
  - `CHANGELOG.md`
  - **Engine**: If content in `.magic/` or `workflows/` was modified, follow **Rule 2.3 (C14)** to update engine meta and version.
- [ ] **Documented**:
  - Update `CHANGELOG.md` with a summary of changes.
  - Update `README.md` if public API or features were changed.
  - Update relevant `.design/` workspace index/specifications to reflect task completion.
- [ ] **Synchronized**: Run metadata sync to ensure integrity:
  - `node .magic/scripts/executor.js update-engine-meta`
  - **Hardlinks**: Verify integrity with `fsutil hardlink list AGENTS.md` (should show 5 files: AGENTS, GEMINI, CLAUDE, CODEX, QWEN). If broken, run `/magic.dev:init` to restore.
- [ ] **Preserved**: Verify that structural documents (like diagrams or `.design/INDEX.md`) haven't lost data during edits.
