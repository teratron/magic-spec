---
description: Workflow for generating the implementation plan and orchestrating tasks.
---

# Task Workflow

This workflow reads finalized specifications and produces a structured implementation plan (`.design/PLAN.md`), and immediately decomposes it into atomic, executable tasks (`.design/TASKS.md`).
It operates **after** the Spec Workflow — specifications are its input, not its concern.

> **Scope**: Prioritization, phasing, dependency analysis, task generation, and orchestration.
> Specification authoring → Spec Workflow. Execution → Run Workflow.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Registry Integrity**: Never generate a plan or tasks without reading all spec files listed in `INDEX.md`.
2. **Auto-Init**: If `.design/` or its system files are missing, automatically trigger the Init pre-flight check (`.magic/init.md`) before proceeding.
3. **No Orphans**: Every spec in `INDEX.md` must be assigned to a phase in `PLAN.md`. Any spec found in `INDEX.md` but missing from `PLAN.md` must be flagged as "Orphaned" and addressed immediately.
4. **Confirm Before Commit**: Always show the proposed phase structure and task breakdown to the user before writing `PLAN.md` and `TASKS.md`.
5. **Atomic Tasks**: Each task must map to exactly one section of one spec file. A task that touches two specs is two tasks.
6. **Nested Phase Architecture (C10)**: Implementation plans in `PLAN.md` must follow a nested hierarchy: **Phase -> Specification -> Atomic Tasks**. Always decompose each specification into 2-3 atomic checklist items. Use the standardized checklist notation: `[ ]` (Todo), `[/]` (In Progress), `[x]` (Done), `[~]` (Cancelled), `[!]` (Blocked).
7. **No Duplication**: PLAN.md summarizes specs — it does not copy their content. Use references, not reproduction.
8. **Checklist Before Done**: Every workflow operation must end with the *Task Completion Checklist*.
9. **Maximum Automation (Zero-Prompt)**: Once PLAN.md and TASKS.md are approved by the user, the agent is authorized to proceed directly to execution (`magic.run`) and conclusion workflows without further confirmation. Save reports and update changelogs silently. Skip conversational overhead.

## Directory Structure

```plaintext
.design/
├── INDEX.md # Input: registry of all specs
├── RULES.md # Input: project conventions
├── PLAN.md # Output: implementation plan 
├── TASKS.md # Output: master task index
├── specifications/ # Input: spec files 
│   └── *.md
└── tasks/ # Output: phase task files 
    └── phase-{n}.md
```

## Workflow Steps

### Initializing Plan & Tasks

Use when `.design/PLAN.md` or `.design/TASKS.md` do not exist.

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

0. **Consistency Check & Engine Integrity**: Before running, verify specification consistency and engine file integrity by running:
   - `node .magic/scripts/executor.js check-prerequisites --json --require-specs`
   - **Action**: If any "Engine Integrity" warnings appear, the agent must inform the user and recommend regenerating checksums if the changes were intentional.
1. **Read all spec files**: For each spec in `.design/specifications/`, extract:
    - `Related Specifications` — direct dependencies
    - `Implementation Notes` — if present, surface them in the plan/tasks
2. **Build dependency graph**: Map which specs depend on which. Identify the critical path.
3. **Propose Plan Structure**: Group specifications into Phases according to their layer and dependencies:
    - Layer 1 (concept) specifications must be grouped into early requirements phases (e.g., Phase 0 or Phase 1).
    - Layer 2 (implementation) specifications must be scheduled in execution phases that follow their Layer 1 parent, and can be grouped by technology track.
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
8. **Write files**: Write `.design/PLAN.md`, `.design/TASKS.md`, and `.design/tasks/phase-1.md` based on approval.
9. **Generate Context**: Silently run `node .magic/scripts/executor.js generate-context` to initialize `.design/CONTEXT.md`.

### Updating Tasks & Plan

**Trigger phrase**: *"Update tasks"*, *"Sync tasks"*, *"Update plan"*, *"Reprioritize"*

1. Read current `TASKS.md` and `PLAN.md` and compare against `INDEX.md`.
2. **Detect changes (Registry Synchronization Check)**:
    - **Identification**: List all specs in `INDEX.md` and check their presence in `PLAN.md`.
    - **Selective Planning (C6)**:
        - **Draft Specs**: Automatically move to the `## Backlog` section of `PLAN.md`.
        - **Stable Specs**: Ask the user which new `Stable` specs should be pulled into the active plan. All others move to the **Backlog**.
    - **Orphaned Specs**: Flag specs in `INDEX.md` missing from both active plan and backlog.
    - **New Sections**: For existing planned specs, check for new sections added and propose additional tasks.
    - **Deprecated Specs**: Move to Archived in `PLAN.md`, mark related tasks `Cancelled` in `TASKS.md`.
3. Show diff to user before writing. Let user approve the reprioritization.

### Task Completion Checklist

**Must be shown at the end of every task workflow operation.**

```
Task Workflow Checklist — {operation description}

Input Integrity
  ☐ All spec files in INDEX.md were read before plan was written
  ☐ Every spec in INDEX.md is assigned to a phase (no orphaned specs)
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

## Phase 1 — {Name}

- **{Spec Name}** ([{spec.md}](specifications/{spec.md}))
  - [ ] {Task 1: Summary}
  - [ ] {Task 2: Summary}
  - [ ] {Task 3: (Optional)}

## Backlog

<!-- Registered specifications waiting for prioritization (Draft or non-critical Stable) -->
- [specification.md](specifications/specification.md)
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

## [T-N{Track}{Seq}] {Task Title}

- **Spec:** {spec.md} §{section}
- **Status:** {Todo | In Progress | Done | Blocked}
- **Changes:**
  - Created: {files}
  - Modified: {files}
- **Assignee:** {Agent | User}
- **Notes:** (optional)
```
