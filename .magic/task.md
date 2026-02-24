---
description: Workflow for generating the implementation plan and orchestrating tasks.
---

# Task Workflow

This workflow reads finalized specifications and produces a structured implementation plan (`.design/PLAN.md`), and immediately decomposes it into atomic, executable tasks (`.design/tasks/TASKS.md`).
It operates **after** the Spec Workflow — specifications are its input, not its concern.

> **Scope**: Prioritization, phasing, dependency analysis, task generation, and orchestration.
> Specification authoring → Spec Workflow. Execution → Run Workflow.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Specs First**: Never generate a plan or tasks without reading all spec files listed in `INDEX.md`.
2. **Auto-Init**: If `.design/` or its system files are missing, automatically trigger the Init pre-flight check (`.magic/init.md`) before proceeding.
3. **Confirm Before Commit**: Always show the proposed phase structure and task breakdown to the user before writing `PLAN.md` and `TASKS.md`.
4. **Atomic Tasks**: Each task must map to exactly one section of one spec file. A task that touches two specs is two tasks.
5. **No Duplication**: PLAN.md summarizes specs — it does not copy their content. Use references, not reproduction.
6. **Checklist Before Done**: Every workflow operation must end with the *Task Completion Checklist*.

## Directory Structure

```plaintext
.design/
├── INDEX.md # Input: registry of all specs
├── RULES.md # Input: project conventions
├── PLAN.md # Output: implementation plan 
├── specifications/ # Input: spec files 
│   └── *.md
└── tasks/ # Output: task files 
    ├── TASKS.md
    └── phase-{n}.md
```

## Workflow Steps

### Initializing Plan & Tasks

Use when `.design/PLAN.md` or `.design/tasks/TASKS.md` do not exist.

**Trigger phrase**: *"Create plan"*, *"Generate plan"*, *"Create tasks"*, *"Generate tasks"*

```mermaid
graph TD
    A[Trigger: Generate Tasks] --> Z["Pre-flight: Consistency Check\n(spec.md)"]
    Z --> B[Read INDEX.md + RULES.md + spec files]
    B --> C[Extract dependency graph & critical path]
    C --> D[Propose phase structure in PLAN.md]
    D --> E[Ask execution mode (Sequential/Parallel)]
    E --> F[Decompose Phase 1 into tasks & assign tracks]
    F --> G[Propose task breakdown to user]
    G -->|Approved| H[Write PLAN.md, TASKS.md, phase files]
    G -->|Adjusted| F
    H --> I[Generate CONTEXT.md]
    I --> J[Task Completion Checklist]
```

0. **Consistency Check**: Before running, check `INDEX.md` against the file system by running:
   - **bash**: `bash .magic/scripts/check-prerequisites.sh --json --require-specs`
   - **Windows**: `pwsh .magic/scripts/check-prerequisites.ps1 -json -require_specs`
1. **Read all spec files**: For each spec in `.design/specifications/`, extract:
    - `Related Specifications` — direct dependencies
    - `Implementation Notes` — if present, surface them in the plan/tasks
2. **Build dependency graph**: Map which specs depend on which. Identify the critical path.
3. **Propose Plan Structure**: Group specifications into Phases (e.g. Phase 1 - Foundation, Phase 2 - Services) based on their dependencies.
4. **Ask execution mode** (first run only):

    ```
    How should tasks be executed?
      A) Sequential — one agent works through tasks in order (default)
      B) Parallel   — Manager Agent + Developer Agents per track

    This choice will be saved to RULES.md §7.
    ```

5. **Decompose Phase 1**: Break down Phase 1 specifications into atomic tasks. Extract user stories from `Implementation Notes`. Apply tracking IDs (e.g., `T-1A01`).
6. **Assign tracks**: Group tasks into Execution Tracks (A, B, C) based on task-level independence.
7. **Propose breakdown to user**: Show the Plan Phases and the Phase 1 Task Outline before writing. Wait for the user to approve changes.
8. **Write files**: Write `.design/PLAN.md`, `.design/tasks/TASKS.md`, and `.design/tasks/phase-1.md` based on approval.
9. **Generate Context**: Silently run `bash .magic/scripts/generate-context.sh` (or `.ps1` on Windows) to initialize `.design/CONTEXT.md`.

### Updating Tasks & Plan

**Trigger phrase**: *"Update tasks"*, *"Sync tasks"*, *"Update plan"*, *"Reprioritize"*

1. Read current `TASKS.md` and `PLAN.md` and compare against `INDEX.md`.
2. Detect changes:
    - New spec added to `INDEX.md` → propose assigned phase and new tasks
    - Spec updated (new section) → propose additional tasks
    - Spec deprecated → move to Archived in `PLAN.md`, mark related tasks `Cancelled` in `TASKS.md`.
3. Show diff to user before writing. Let user approve the reprioritization.

### Task Completion Checklist

**Must be shown at the end of every task workflow operation.**

```
Task Workflow Checklist — {operation description}

Input Integrity
  ☐ All spec files in INDEX.md were read before plan was written
  ☐ No content copied from specs — only references used

Plan & Task Structure
  ☐ No spec assigned to a phase earlier than its dependencies allow
  ☐ Each task maps to exactly one spec section (no cross-spec bundling)
  ☐ All task IDs follow the T-{phase}{track}{seq} format

Track Integrity
  ☐ Tasks in different tracks have no hidden shared dependencies
  ☐ Execution mode recorded in RULES.md §7

Data Integrity
  ☐ PLAN.md written and updated accurately
  ☐ TASKS.md updated to reflect current state
```

## Templates

### PLAN.md Template

```markdown
# Implementation Plan

**Version:** {X.Y.Z}
**Generated:** {YYYY-MM-DD}
**Based on:** .design/INDEX.md v{X.Y.Z}
**Status:** Active

## Overview
...
```

### TASKS.md — Master Index

```markdown
# Task Index

**Version:** {X.Y.Z}
**Generated:** {YYYY-MM-DD}
**Based on:** .design/PLAN.md v{X.Y.Z}
**Execution Mode:** {Sequential | Parallel}
**Status:** Active

## Summary
...
```

### phase-{n}.md — Per-Phase Task File

```markdown
# Phase {N} — {Phase Name}

**Status:** {Active | Completed}
...
```
