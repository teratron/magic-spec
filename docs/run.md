# Execution & Run Workflow

This document explains the process of carrying out implementation tasks within the Magic SDD engine.

## 1. Overview

The Run Workflow is the execution engine of Magic SDD. It reads the atomic tasks defined in `.design/TASKS.md` and coordinates their implementation while maintaining project state and a high-fidelity audit trail.

**Triggers:** *"Start tasks"*, *"Next task"*, *"Continue"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*, *"Start work"*

**Slash command:** `/magic.run [arg]`

> **Full implementation:** `.magic/run.md` — the engine reads this file before executing any steps.

Key Goals:

- **Scope Compliance**: Implementation strictly follows the approved specification.
- **Code Quality**: Enforces design principles (SOLID, DRY, KISS, YAGNI) and stack-specific standards.
- **Mandatory Testing**: All new or modified logic covered by automated tests.
- **State Integrity**: Task statuses in `TASKS.md` and `PLAN.md` synced after every operation.
- **Maximum Automation**: Post-implementation logic (changelogs, retrospectives, version bumps) runs autonomously.

## 2. Argument Routing

| Input | Mode | Behavior |
| :--- | :--- | :--- |
| *(empty)* | Full | Resolve workspace automatically, execute next available task(s) |
| `{workspace}` | Scoped | Execute tasks only from that workspace's `TASKS.md` |
| `"text"` | Directed | Interpret text as execution directive (task ID, phase, or focus) |
| `{workspace} "text"` | Scoped + Directed | Directive applied within workspace scope |

```
/magic.run                                 # Full execution across all workspaces
/magic.run engine                          # Scoped execution within a workspace
/magic.run "T-1A01"                        # Execute a specific task by ID
/magic.run "phase-2"                       # Execute all Todo tasks in a specific phase
/magic.run installers "validation only"    # Scoped + directed execution
```

> **Disambiguation**: If an unquoted word matches a workspace name, workspace takes priority. Wrap in quotes to force directive interpretation.
> **Handoff Propagation**: When re-planning is needed, the engine recommends `/magic.task {workspace}` to preserve scope.

## 3. Core Invariants

The engine enforces 6 mandatory invariants during every execution:

| # | Invariant | Summary |
| ---: | :--- | :--- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Rules First** | Read `RULES.md` before any code edit; adhere to project conventions |
| 2.5 | **Live Memory (STATE.md)** | Read STATE.md before execution; display blockers; update after every task transition |
| 3 | **Auto-Init** | Silently creates `.design/` structure if missing |
| 4 | **Logic Guards** | Dependency, Mode, Sync, Quarantine (C12), Spec Stability, Phantom Spec, Pause Propagation |
| 5 | **Zero-Prompt Automation (C9)** | Skip all routine confirmations; execute sequences autonomously |
| 6 | **Engine Integrity (C14)** | Checksums validated and updated after any `.magic/` modification |

### Live Memory (STATE.md)

STATE.md is a live project state digest read before every execution session:

- **Blockers**: If non-empty, displayed before proceeding.
- **Blocking Constraints**: Each `[C-NNN]` confirmed before execution.
- **Paused state**: Triggers Resume Detection for seamless session continuity.
- **Updates**: STATE.md is updated after every task transition (`Done` / `Blocked`) and phase completion.

## 4. Execution Modes

| Mode | Role | Process |
| :--- | :--- | :--- |
| **Sequential** | Mono-Agent | Picks next `Todo` → Executes → Updates `Done` → Repeats |
| **Parallel** | Manager | Reads tasks + associated spec sections → Detects shared-file conflicts → Assigns tracks → Syncs PLAN.md |
| **Parallel** | Developer | Track owner → Executes in order → Reports `Done/Blocked` → Waits for next assignment |

Default is **Parallel mode (C3)**. If mode is absent from `RULES.md §7`, Parallel is assumed.

> **Shared-Constraint Detection**: In Parallel mode, the Manager reads task descriptions *and* associated spec sections. If two tasks reference a shared file — even when only visible in the spec body — those tasks are serialized to prevent race conditions.

## 5. Key Workflow Steps

### 5.1 Pre-flight

Validates project state before execution:

- **C15 Filter**: Checksums and registry integrity. In-scope issues → **HALT**.
- **Bootstrap Detection**: If `PLAN.md` contains `[Bootstrap]` markers, warns that specs are not yet Stable.
- **Spec Stability Spot-Check**: For each spec referenced by a `Todo` task, confirms status = `Stable` in `INDEX.md`.
- **File-Header Parity**: Spec file headers must match `INDEX.md` (status, version). For L2 specs, verification includes L1 parent headers (including cross-workspace parents).

### 5.2 Execute & QA Review (C24 — Tester Persona)

After implementation and before marking work as `Done`, the engine adopts a **Tester Persona** to review:

- **Spec Boundary**: Does the implementation stay within the assigned spec section?
- **Edge Cases**: Are error states, boundary inputs, and null/empty conditions handled?
- **Side Effects**: Does the change affect files or state outside the spec's declared scope?
- **Regression Risk**: Could this break any already-`Done` tasks in the current phase?

If any check fails → task status set to `Blocked [!]` with reason. Execution does not proceed to Update.

### 5.3 Mid-Run Stability Check

Before committing any task as `Done`, the engine re-verifies the target spec is still `Stable` in `INDEX.md` and confirms file header parity. This also recursively includes the spec's L1 parent. Demotion or drift → **HALT** that track.

### 5.4 Update

After each task completes:

- **STATE Sync**: STATE.md updated via executor script before touching TASKS.md.
- **Task Status**: `In Progress` → `Done` (or `Blocked [!]`) in TASKS.md Phase Checklist.
- **Plan Sync**: Completed specs/phases → `[x]` in `PLAN.md`.
- **Change Record**: 1-line summary in the task's `Changes` field.
- **Handoff**: If spec is ambiguous → **HALT** and delegate to `magic.spec` for update.

### 5.5 Blocked Task Escalation

If a task encounters ambiguous instructions or missing details, the agent marks it `Blocked` and halts. A delegated handoff jumps to the Spec Workflow (Explore Mode) where specifications are formally updated before resuming.

**Pause Propagation**: When a task becomes `Blocked [!]` and no `Todo` tasks remain in the current phase, STATE.md is automatically updated to `Blocked` status with a suggestion to run `/magic.pause` for full handoff.

## 6. Lifecycle & Conclusion

### Phase Completion

- **Retro L1**: Auto-run Level 1 (snapshot) retrospective.
- **Changelog L1**: Append phase changelog entry extracted from Done task `Changes` fields.
- **Frontmatter Update**: Update `phase-{N}.md` YAML: set `status: Done`, fill `provides`, `key_files`, `patterns_established`, `duration_minutes`.
- **STATE.md Update**: Advance to next phase.

### Plan Completion

- **Retro L2**: Auto-run Level 2 (Full) retrospective.
- **Changelog L2**: Present compiled release entry. **Only manual step: Yes/No approval.**
- **Version Bump**: Bump manifests (`package.json`, `pyproject.toml`, etc.) per changelog (Major/Minor/Patch).
- **Finalize**: Regenerate `CONTEXT.md`.

## 7. Session Isolation (Phase Gates — C17)

Major transitions within or out of the Run Workflow are protected by a **Hard Stop**. You must physically open a **New Chat** before starting a new phase or returning to Specification/Planning to eliminate context bleed-over.

## 8. Run Completion Checklist

After every execution cycle, the engine verifies:

- Spec Stability: all active-phase specs confirmed Stable before execution
- Rules Parity: current RULES.md version matches TASKS.md base
- TASKS.md read first; execution bound to spec section
- C24 QA Review: internal "Tester" audit performed before marking tasks Done
- Parallel: Manager role enforced; shared files serialized
- Status: TASKS.md / phase files / PLAN.md `[x]` synced
- Blockers: all Blocked tasks have notes explaining handoff
- Conclusion: Retro L1/L2 run, Changelog L1/L2 written, manifests bumped, CONTEXT.md updated

## Sync Note

Synchronized with engine workflows on 2026-04-26 (v1.5.207).
