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
   - **Circular Dependency Guard**: If the graph contains cycles (A→B→A), halt. Flag the cycle to the user and propose breaking it by removing one `Related Specifications` link or splitting the spec into independent parts.
3. **Propose Plan Structure**: Group specifications into Phases according to their layer and dependencies:
    - Layer 1 (concept) specifications must be grouped into early requirements phases (e.g., Phase 0 or Phase 1).
    - Layer 2 (implementation) specifications must be scheduled in execution phases that follow their Layer 1 parent, and can be grouped by technology track.
4. **Ask execution mode**: Skip if `RULES.md §7` already contains the execution mode convention (C3). Otherwise, ask:

    ```
    How should tasks be executed?
      A) Sequential — one agent works through tasks in order (default)
      B) Parallel   — Manager Agent + Developer Agents per track

    This choice will be saved to RULES.md §7.
    ```

5. **Decompose first execution phase**: Break down the first execution phase (typically Phase 1) into atomic tasks. Phase 0 (Requirements) items are tracked inline in PLAN.md as review checklists and do not generate separate task files. Extract user stories from `Implementation Notes`. Apply tracking IDs (e.g., `T-1A01`).
6. **Assign tracks**: Group tasks into Execution Tracks (A, B, C) based on task-level independence.
7. **Propose breakdown to user**: Show the Plan Phases and the Phase 1 Task Outline before writing. Wait for the user to approve changes.
8. **Write files**: Write `.design/PLAN.md` (from `.magic/templates/plan.md`), `.design/TASKS.md` and `.design/tasks/phase-1.md` (from `.magic/templates/tasks.md`) based on approval.
9. **Generate Context**: Silently run `node .magic/scripts/executor.js generate-context` to initialize `.design/CONTEXT.md`.

### Updating Tasks & Plan

**Trigger phrase**: *"Update tasks"*, *"Sync tasks"*, *"Update plan"*, *"Reprioritize"*

0. **Consistency Check & Engine Integrity**: Before updating, run:
   `node .magic/scripts/executor.js check-prerequisites --json --require-specs`
   - If `ok: false` → surface `missing_required`, halt.
   - If `warnings` non-empty → surface warnings to user before proceeding with the update.

1. **Registry Synchronization Check**:
    - **Identification**: List all specs in `INDEX.md` and check their presence in `PLAN.md`.
    - **Convention Synchronization**: Compare the RULES.md version against the version recorded in `TASKS.md` header (field `Based on RULES:`). If versions differ, review §7 changes and propose a compatibility review of all existing tasks against the new conventions. Update the `Based on RULES:` field after reconciliation.
    - **Selective Planning (C6)**:
        - **Draft Specs**: Automatically move to the `## Backlog` section of `PLAN.md`.
        - **RFC Specs**: Surface to user with a recommendation to backlog until Stable, unless user explicitly pulls into active plan.
        - **Stable Specs**: Ask the user which new `Stable` specs should be pulled into the active plan. All others move to the **Backlog**.
    - **Orphaned Specs**: Flag specs in `INDEX.md` missing from both active plan and backlog.
    - **Phantom Specs**: Flag specs referenced in `PLAN.md` but missing from `INDEX.md`. Propose: for tasks with status `Pending` or `In Progress` → Cancel; for `Done` tasks → mark as Archived Orphan (preserve history, remove from active planning). Do not cancel Done work.
    - **New Sections**: For existing planned specs, check for new sections added and propose additional tasks.
    - **Deprecated Specs**: Move to Archived in `PLAN.md`. For associated tasks: `Done` → preserve as-is (historical record); `Pending`/`In Progress` → mark `Cancelled` in `TASKS.md`.
2. Show diff to user before writing. Let user approve the reprioritization.

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
  ☐ All task IDs follow the format defined in RULES.md (default: T-{phase}{track}{seq})

Track Integrity
  ☐ Tasks in different tracks have no hidden shared dependencies
  ☐ Execution mode recorded in RULES.md §7

Data Integrity
  ☐ PLAN.md written and updated accurately
  ☐ TASKS.md updated to reflect current state
```

## Templates

> Templates for `PLAN.md`, `TASKS.md`, and `phase-{n}.md` are in `.magic/templates/`:
>
> - `.magic/templates/plan.md` — PLAN.md structure
> - `.magic/templates/tasks.md` — TASKS.md master index + per-phase task file

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Antigravity | Initial migration from workflow-enhancements.md |
| 1.1.0 | 2026-02-26 | Antigravity | Added pre-flight to Update path, RFC handling in C6, convention sync detection via Based on RULES field, phantom spec handling, Phase 0 clarification, execution mode guard, dynamic task ID format in checklist |
| 1.2.0 | 2026-02-27 | Antigravity | AOP: Extracted PLAN.md, TASKS.md, phase-{n}.md templates to templates/ |
| 1.3.0 | 2026-02-27 | Antigravity | Stress-test fix: Phantom spec handling — Done tasks archived, not cancelled |
| 1.4.0 | 2026-02-27 | Antigravity | Stress-test R2: Circular Dependency Guard, Deprecated Done-task preservation, Convention Sync wording fix |
