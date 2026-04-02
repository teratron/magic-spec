# Task & Planning Workflow

This document explains how Magic SDD converts stable specifications into actionable implementation plans and atomic tasks.

## 1. Overview

The Task Workflow is the bridge between *Design* (what to build) and *Execution* (how to build it). It analyzes the dependency graph of all stable specifications and produces an optimized execution roadmap.

Key Goals:

- **Dependency Awareness**: Ensuring components are built in the correct logical order.
- **Phased Execution**: Breaking down large projects into manageable implementation phases.
- **Atomicity**: Decomposing features into individual tasks that can be completed in a single agent session.

## 2. The Planning System

Magic uses two primary files to manage project state:

- **`.design/PLAN.md`**: The high-level roadmap showing Phases, assigned Specifications, and their current status.
- **`.design/TASKS.md`**: The master index of all atomic implementation tasks across all phases.

## 3. Automation & Workflows

### 3.1 Dependency Analysis

When running `magic.task`, the engine reads all files in `.design/INDEX.md`, builds a directed acyclic graph (DAG) of dependencies, and identifies the "Critical Path."

- **Circular Dependency Guard**: The engine performs an N-level deep scan of `Related Specifications`. If a circular dependency is detected (e.g., A → B → C → A), the planning process will **HALT** until the cycle is resolved.

### 3.2 Task Decomposition

The engine automatically breaks down each specification into 2-3 atomic tasks. Each task is assigned a unique ID (e.g., `[T-1A01]`) and mapped to a specific section of a spec file.

### 3.3 Autonomous Selective Planning (C6)

The engine automatically handles specification selection based on their status:

- **Stable Specs**: Automatically pulled into the active implementation plan.
- **Draft/RFC Specs**: Automatically moved to the Backlog.

This removes the need for manual selection prompts, ensuring that the plan always reflects the latest stable design without user intervention.

- **Quarantine Cascade (C12)**: If an active task's parent specification is no longer **Stable** (due to a downgrade or quarantine), the task is automatically marked as `Blocked [!]` and moved back to the Backlog.

## 4. Orchestration & Tracks

Tasks are organized into **Execution Tracks** (Track A, Track B, etc.).

- **Sequential Mode**: One agent works through tracks in order.
- **Parallel Mode**: Multiple agents work on independent tracks simultaneously, coordinated by a Manager Agent.

## 5. Argument Routing

The Task workflow accepts optional arguments to control scope and behavior:

```
/magic.task                              # Full planning across all workspaces
/magic.task engine                       # Scoped planning for a specific workspace
/magic.task "decompose phase-2"       # Guided planning with focus or instructions
/magic.task installers "only new ones"    # Scoped + guided planning
```

| Input | Mode | Behavior |
| :--- | :--- | :--- |
| *(empty)* | Full | Resolve workspace automatically, plan all specs |
| `{workspace}` | Scoped | Plan only specs registered in that workspace's `INDEX.md` |
| `"text"` | Guided | Interpret text as planning directive (focus, instruction, filter) |
| `{workspace} "text"` | Scoped + Guided | Directive applied within workspace scope |

When no workspace is specified, the engine resolves it via the standard priority chain (same as [Analyze §5.1](analyze.md#51-workspace-targeting)). Disambiguation: if an unquoted word matches a workspace name, workspace takes priority; wrap in quotes to force directive interpretation.

After planning, the handoff to `/magic.run` automatically propagates the workspace context (e.g., recommends `/magic.run engine` instead of `/magic.run`).

## 6. Maintenance

- **Plan Synchronization**: If specifications change, the plan and tasks must be updated via the "Sync tasks" command.
- **Archival (C8)**: Once a phase is completed, its detailed task file is moved to `.design/archives/tasks/` to keep the working area clean and efficient.

## 3.4 Intent Preservation

If the Task workflow needs to sub-delegate to `init.md` (cold start) or `analyze.md` (first-time analysis), the original user intent is memoized before delegation begins. After the sub-workflow resolves, the engine resumes explicitly: *"Resuming: '{original intent}'."* This prevents the user's initial goal from being silently lost across multi-workflow chains.

## 3.5 Session Isolation (Phase Gates - C17)

To ensure the implementation plan is executed with a clean context, the transition from **Task Planning** to **Execution (Run)** is protected by a **Hard Stop**.

1. **Planning Focus**: All task decomposition and roadmap building should occur in a single chat session to preserve the agent's understanding of the full dependency graph.
2. **Phase Completion**: Once the implementation plan (`PLAN.md`) and tasks (`TASKS.md`) are generated, the agent is mandated to halt.
3. **Session Reset**: You must physically open a **New Chat** (using the IDE's "New Chat" button) before running `/magic.run`. This forces the agent to read the newly generated tasks and the current code as the sole sources of truth, eliminating any "context bleed" from the planning phase.

## 7. Pre-flight Checks

The Task workflow triggers a **Consistency Check** before running to ensure the plan is based on an accurate view of the project's current filesystem and specification registry.

### 6.1 Cross-Workspace Parity

If `workspace.json` registers more than one workspace, the pre-flight scan checks for identically-named spec files across workspaces. A version mismatch between copies constitutes a **Source of Truth Drift** and causes a **HALT** before any planning begins. The user is offered three resolution paths: sync from the canonical workspace, rename to a unique name per workspace, or force-ignore with a documented reason.

### 8. Rules Parity

Tasks are generated based on the current set of project conventions. Every `TASKS.md` file records the version of `RULES.md` used during generation. If the project rules are updated, the engine will warn the user of a "Rules Drift" and offer to synchronize the plan to ensure compliance with the latest standards.

## Sync Note

Synchronized with engine workflows on 2026-03-31 (v1.5.116).
