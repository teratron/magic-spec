# Init — Automatic Pre-flight Check

This document explains the automatic initialization process for the Magic SDD engine.

## 1. Overview

The Init workflow is an internal, non-user-facing process that ensures the `.design/` directory and its core system files are correctly set up before any workflow executes.

> **Full implementation:** `.magic/init.md` — auto-called by Step 0 of all workflows.

Key Goals:

- **Reliability**: Ensuring all workflows have a valid environment to operate in.
- **Automation**: Automatically creating missing structures without user intervention.
- **Standardization**: Providing a consistent initial state for every Magic-powered project.
- **Engine Integrity**: Validating core workflow files against SHA256 checksums.

## 2. Core Invariants

The engine enforces 5 mandatory invariants:

| # | Invariant | Summary |
| ---: | --- | --- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Engine Integrity** | HALT if `check-prerequisites` returns integrity warnings (checksums/ghost registry) |
| 3 | **Silent Default** | Run autonomously; report only brief status or fatal failure |
| 4 | **Non-Overwriting** | Skips existing files; never mutates user state |
| 5 | **Versioning (C14)** | Engine checksums updated after `.magic/` modifications; initial `RULES.md` at v1.5.198 |

## 3. Workflow Steps

### Step 1 — Check Prerequisites

`node .magic/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`

| Result | Action |
| --- | --- |
| `ok: true` | Skip silently; return control to calling workflow |
| `ENGINE_INTEGRITY` / `GHOST_REGISTRY` (in-scope) | **HALT** — engine integrity failure |
| `ENGINE_INTEGRITY` / `GHOST_REGISTRY` (out-of-scope) | Proceed silently (C15 Filter) |
| Missing system files (no integrity warnings) | Proceed to Step 2 (Init) |
| `CONFIG_DRIFT` | Non-blocking advisory: log warning, auto-proceed |
| Unrecognized failure | **HALT** — investigate manually |

**C15 Filter**: Cross-reference mismatched files against `workspace.json` scope. Out-of-scope mismatches are ignored; in-scope mismatches trigger HALT.

### Step 2 — Init

`node .magic/scripts/executor.js init`

Creates the following structure:

```plaintext
.design/
├── INDEX.md          # Specification Registry
├── RULES.md          # Project Constitution (v1.5.198)
├── STATE.md          # Live memory — session continuity
├── workspace.json    # Workspace configuration
├── specifications/   # Directory for requirement documents
├── tasks/            # Directory for per-phase task files
└── archives/tasks/   # Directory for completed/archived tasks
```

**STATE.md**: Copied from `.magic/templates/state.md`. Workspace name and timestamp are filled in automatically. Set to `Status: Active`, `Phase: 0 — Not Started`, `Next Action: Run /magic.task`. **Never overwrites** existing STATE.md.

### Step 3 — Verify

Ensure all artifacts exist (including STATE.md). HALT on failure.

### Step 4 — Hint

If `package.json`, `pyproject.toml`, `src/`, or `lib/` detected AND `INDEX.md` is empty/new → suggest: *"Analyze project"* (triggers the Analyze workflow, not the Spec workflow).

## 4. Key Properties

- **Silent Execution**: Embedded as Step 0 in every workflow. Skips silently if already initialized.
- **Idempotent**: Only creates missing files; never overwrites existing production data.
- **Cross-Platform**: Triggered via `node .magic/scripts/executor.js init` — works identically on Windows and Unix.

## 5. Security Note

Initialization involves writing systemic files to the local directory. The process is managed by core engine logic to prevent accidental corruption of design artifacts.

## Sync Note

Synchronized with engine workflows on 2026-04-10 (v1.5.198).
