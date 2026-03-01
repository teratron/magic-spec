---
description: Automatic pre-flight check for .design/ directory initialization.
---

# Init — Automatic Pre-Flight Check

Verifies that `.design/` exists and contains all required system files. If anything is missing — creates it automatically.

> **This is NOT a user-facing workflow.** It is called automatically by every other workflow on first invocation. No manual command needed.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

0. **Context Resolution (Zero-Prompt)**: Always resolve the active workspace before operating on `.design/`. Check for `--workspace` flag, `MAGIC_WORKSPACE` env var, or the JSON `default` key in `.design/workspace.json`. Route all logic/files to `.design/{workspace}/` (e.g. `.design/engine/`). Default to root `.design/` only if JSON is missing. Never ask the user for workspace context.
1. **Silent by Default**: When called automatically by another workflow, do not interrupt the user. Report init results briefly and continue with the original workflow.
2. **Safe to Re-Run**: Skips files that already exist. Never overwrites existing `.design/` content.
3. **First Run Only**: After successful initialization, suggest running the Spec Workflow to create the first specification.

## When It Runs

This check is invoked when **`check-prerequisites`** (called as Step 0 by every workflow) detects that `.design/` or its required files are missing. The calling workflow runs `node .magic/scripts/executor.js check-prerequisites --json`. If `ok: false` due to missing `.design/`, the workflow calls init automatically before proceeding.

```mermaid
graph TD
    A["Any workflow triggered"] --> B{".design/ exists?"}
    B -->|Yes| C{"INDEX.md + RULES.md exist?"}
    B -->|No| D["Run init scripts"]
    C -->|Yes| E["Continue with workflow"]
    C -->|No| D
    D --> F["Report: SDD initialized"]
    F --> E
```

## Workflow Steps

1. **Check `.design/`**: Verify directory exists.
   - **Engine Integrity Check**: Before running any `init` commands, verify that `check-prerequisites --json` did not return any `"Engine Integrity"` warnings in its output. If an integrity mismatch warning is detected, report the mismatch to the user and **HALT**. Do not initialize `.design/` with tampered engine scripts.
2. **Check system files**: Verify `INDEX.md` and `RULES.md` exist inside `.design/`.
3. **If anything missing**: Detect OS and run the appropriate script:

    | OS | Script | Run with |
    | :--- | :--- | :--- |
    | Universal | `.magic/scripts/init` | `node .magic/scripts/executor.js init` |

4. **Verify**: After running the script, confirm that all expected artifacts exist: `INDEX.md`, `RULES.md`, `specifications/`, `tasks/`, `archives/tasks/`. If any are missing, report the failure and halt — do not continue with the calling workflow.
5. **Report result** (brief, inline with the calling workflow):

    ```
    SDD initialized — {YYYY-MM-DD}
    Created: .design/INDEX.md, .design/RULES.md, .design/specifications/, .design/tasks/, .design/archives/tasks/
    Continuing with {workflow name}...
    ```

6. **Existing Codebase Hint**: After successful initialization, check if the project already contains source code by scanning for indicators (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `src/`, `lib/`, `app/`, or 5+ source files at root). If detected, append to the report:

    ```
    💡 Existing codebase detected.
       To generate initial specifications from your code, say: "Analyze project"
    ```

    > This hint delegates to `.magic/analyze.md` via the Spec Workflow.

7. **If already initialized**: Skip silently. No output needed.

## Directory Structure Created

```plaintext
.design/
├── INDEX.md         # Spec registry
├── RULES.md         # Project constitution
├── specifications/  # Spec files go here
├── tasks/           # Task files go here
└── archives/        # Archived tasks go here
    └── tasks/
```

`PLAN.md`, `TASKS.md`, and `RETROSPECTIVE.md` are created by their respective workflows — not by init.

> **Maintainer Note**: `init.js` contains a hardcoded `RULES.md` template with all conventions (C1–C11). When adding new conventions to the engine, the script MUST be updated.

## Init Completion Checklist

```
Init Checklist
  ☐ .design/ directory exists
  ☐ INDEX.md exists and contains valid header
  ☐ RULES.md exists and contains valid header
  ☐ specifications/ directory exists
  ☐ tasks/ directory exists
  ☐ archives/tasks/ directory exists
```

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Antigravity | Initial migration from workflow-enhancements.md |
| 1.1.0 | 2026-02-26 | Antigravity | Documented check-prerequisites call chain, added engine integrity check, post-init verification step, completion checklist |
| 1.2.0 | 2026-02-27 | Antigravity | Simulation fix: expanded verification to all 5 artifacts, added Maintainer Note for hardcoded RULES.md sync |
| 1.3.0 | 2026-02-27 | Antigravity | Existing codebase hint: after init, suggest "Analyze project" if source code detected |
