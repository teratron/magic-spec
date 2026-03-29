# Init Workflow

Silent pre-flight check for `.design/` setup. Auto-called by Step 0 of all workflows.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Resolve target workspace via the priority chain below (§Workspace Resolution). Route all logic to `.design/{workspace}/`.
    - **Workspace Disambiguation**: If multiple workspaces exist and no default is set, the agent MUST perform a **Quick-scan** of the current directory/context (one-turn logic). Propose the most likely workspace based on path matches or project markers (e.g., `installers/` folder → `installers` workspace) and ASK for confirmation. Never ask to "pick from a list" without a prioritized recommendation.
2. **Engine Integrity**: HALT if `check-prerequisites --json` returns integrity warnings (Checksums/Ghost Registry).
3. **Silent Default**: Run autonomously. Report only brief status or fatal failure.
4. **Non-Overwriting**: Skips existing files. Never mutates user state.
5. **Versioning (C14)**:
    - **Engine Integrity (C14)**: If engine files (`.magic/`) modified → `node .magic/scripts/executor.js update-engine-meta --workflow init` (Smart History: redundant automated entries are skipped).
    - **Rules**: Initial `RULES.md` is versioned at 1.0.0.

## Workflow: Setup & Verification

```mermaid
graph TD
    A[Trigger: Any Workflow] --> B{Pre-reqs OK?}
    B -->|Yes| C[Proceed]
    B -->|No| D[Engine Integrity Match?]
    D -->|No| E[HALT: Tampered Engine]
    D -->|Yes| F[Run node .magic/scripts/executor.js init]
    F --> G[Verify Artifacts]
    G --> H[Check Existing Codebase?]
    H --> I[Suggest: magic.analyze]
```

### Steps

1. **Check**: `node .magic/scripts/executor.js check-prerequisites --json --workspace {active-workspace}`.
    - If `ok: true` → Skip silently. Return control to calling workflow.
    - If `ok: false` & contains `ENGINE_INTEGRITY` or `GHOST_REGISTRY` warnings:
        - **C15 Filter**: Cross-reference mismatched files against `workspace.json` scope for `{active-workspace}`.
        - If all mismatches are **out-of-scope** → **Proceed** silently (Log: "Integrity drift detected in out-of-scope files; ignoring per C15").
        - If any mismatch is **in-scope** → **HALT**. Report: "Engine integrity failure (In-Scope): {warning_type}. Run `node .magic/scripts/executor.js update-engine-meta` or restore from origin."
    - If `ok: false` & missing system files (no integrity warnings) → proceed to Step 2 (Init).
    - If `ok: false` & reason is unrecognized → **HALT**. Report: "Unexpected pre-flight failure: {raw output}. Investigate manually."
    - **Config Drift Advisory**: If output contains `CONFIG_DRIFT` warnings → display non-blocking warning: "RULES.md was modified outside workflow. (a) Show diff, (b) Proceed, (c) Restore from HEAD." This is advisory only — do NOT halt. User may proceed without action.
2. **Init**: `node .magic/scripts/executor.js init`.
    - Creates: `INDEX.md`, `RULES.md`, `specifications/`, `tasks/`, `archives/tasks/`.
3. **Verify**: Ensure all 5 artifacts exist. HALT on failure.
4. **Hint**: If `package.json`, `pyproject.toml`, `src/`, or `lib/` detected AND `INDEX.md` is empty/new → Suggest: *"Analyze project"*.

### Structure Created

```
.design/
├── INDEX.md (Registry)
├── RULES.md (Conventions C1-C22)
├── workspace.json (Context)
├── specifications/
├── tasks/
└── archives/tasks/
```

## Init Completion Checklist

```
Init Checklist
  ☐ .design/ structure, registry, and workspace.json validated
  ☐ Engine integrity verified (no checksum mismatch)
  ☐ RULES.md (C1-C22) & INDEX.md headers present; Smart History verified
  ☐ Existing codebase check performed; analyzer suggested if applicable
```
