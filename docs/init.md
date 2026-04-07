# Init — Automatic Pre-flight Check

This document explains the automatic initialization process for the Magic SDD engine.

## 1. Overview

The Init workflow is an internal, non-user-facing process that ensures the `.design/` directory and its core system files are correctly set up and present.

Key Goals:

- **Reliability**: Ensuring all workflows have a valid environment to operate in.
- **Automation**: Automatically creating missing structures without user intervention.
- **Standardization**: Providing a consistent initial state for every Magic-powered project.
- **Engine Integrity**: Validating the core workflow files against SHA256 checksums to prevent execution of tampered or corrupted logic.

## 2. Directory Structure Created

The initialization script sets up the following core hierarchy:

```plaintext
.design/
├── INDEX.md         # The Specification Registry
├── RULES.md         # The Project Constitution
├── specifications/  # Directory for requirement documents
├── tasks/           # Directory for per-phase task files
└── archives/        # Directory for completed/archived tasks
```

Note: `PLAN.md`, `TASKS.md`, and `RETROSPECTIVE.md` are created later by their respective active workflows.

## 3. Automation & Workflows

### 3.1 Silent Execution

The Init check is embedded as **Step 0** in every other workflow. If the environment is already initialized, it skips silently. If not, it runs and continues with the original command.

### 3.2 Engine Integrity Guard

Before any initialization or workflow execution, the engine runs `check-prerequisites.js`.

- **Checksum Mismatch**: If any core engine file (`.magic/*.md`) has been modified without updating the metadata, the process will **HALT** immediately.
- **Recovery**: Users are guided to restore integrity via the `update-engine-meta` command (if changes were intentional) or by reverting manual edits.

### 3.2 Safe-to-Re-Run

The initialization process is idempotent. It will only create missing files and will never overwrite existing production data in `.design/`.

### 3.4 Cross-Platform Wrapper

Initialization is triggered via the universal `node .magic/scripts/executor.js init` command, ensuring it works identically on Windows (PowerShell/CMD) and Unix (Bash/Zsh).

## 4. Maintenance

- **First-Run Suggestion**: After a fresh initialization, the engine will typically suggest running the **Spec Workflow** to create the project's first specification.
- **Engine Integrity**: The `INDEX.md` and `RULES.md` templates are maintained within the core engine to ensure consistent formatting across all projects.
- **Multi-Workspace Pathing**: Init ensures that `workspace.json` correctly routes artifacts to their respective sub-directories (e.g., `.design/core/`) when advanced routing is enabled.

## 5. Security Note

Initialization involves writing systemic files to the local directory. While the process is safe, it is managed by the core engine logic to prevent accidental corruption of the project's design artifacts.

## Sync Note

Synchronized with engine workflows on 2026-03-31 (v1.5.136).
