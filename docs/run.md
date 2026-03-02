# Execution & Run Workflow

This document explains the process of carrying out implementation tasks within the Magic SDD engine.

## 1. Overview

The Run Workflow is the execution engine of Magic SDD. It reads the atomic tasks defined in `.design/TASKS.md` and coordinates their implementation while maintaining project state and a high-fidelity audit trail.

Key Goals:

- **Scope Compliance**: Ensuring implementation code strictly follows the approved specification.
- **Code Quality & Engineering Standards**: Enforcing modern design principles (OOP, SOLID, DRY, KISS, YAGNI), Feature-Sliced Design, and stack-specific linters.
- **Mandatory Testing**: Ensuring all new or modified logic is covered by automated tests before completion.
- **State Integrity**: Automatically updating task statuses in `TASKS.md` and synchronously closing checkboxes (`[x]`) in `PLAN.md` after every operation (preventing "Plan Amnesia").
- **Maximum Automation**: Running post-implementation logic (changelogs, retrospectives, version bumps) with minimal user interruption.

## 2. Execution Modes

Magic supports two primary modes for implementation:

- **Sequential (Default)**: Optimized for solo developers. The agent processes tasks one-by-one, ensuring full focus on each atomic unit of work.
- **Parallel**: Optimized for multi-agent environments. A **Manager Agent** coordinates several **Developer Agents**, each owning a separate "track" to maximize throughput without conflicting on the same files.

The execution mode is defined as a Project Convention in `.design/RULES.md §7`.

- **Shared-Constraint Detection**: In Parallel mode, the **Manager Agent** scans the implementation notes of all active tasks. If two tasks modify the same file (e.g., a shared middleware or config), the manager automatically serializes them to prevent race conditions.

## 3. Automation & Workflows

### 3.1 Pre-flight: Consistency Check

Before starting any work, the `magic.run` workflow runs a mandatory check to ensure the tasks in `TASKS.md` are still valid and that the core engine logic (checksums) has not been tampered with.

- **Rules Parity**: The engine verifies that the `RULES.md` version matches the base version recorded in `TASKS.md`. If a mismatch is found, it warns the user of a potential convention drift.
- **Quarantine Check (C12)**: The engine verifies that every active task belongs to a **Stable** Layer 1 specification. If any task violates this (e.g., its concept has dropped to RFC), execution will **HALT** until the plan is re-synchronized.

### 3.2 Change Records & Changelog

The engine automatically extracts "Change Records" from completed tasks. When a phase is finished, these are compiled into a draft `CHANGELOG.md` entry for the current version.

### 3.3 Zero-Prompt Automation (C9)

Once a plan is approved, the engine is authorized to handle routine tasks (writing phase reports, snapshots, and updating context files) autonomously without asking for confirmation.

### 3.4 Blocked Task Escalation

If a task encounters ambiguous instructions or missing details during execution, the agent marks the task as `Blocked` in `TASKS.md` and halts execution. The agent utilizes a delegated handoff to jump back into the **Spec Workflow** (Explore Mode), where the specifications are formally updated before resuming the tasks.

## 4. Lifecycle & Conclusion

- **Phase Completion**: Triggers a **Level 1 (Auto-snapshot) Retrospective**.
- **Plan Completion**: Triggers a **Level 2 (Full) Retrospective** and a final version bump across the project's manifests (e.g., `package.json`).
- **Governance via Rules**: All logic is governed by a central rulebook (`.design/RULES.md`), which acts as the project's living constitution, and enforced by rigorous **Code Quality & Engineering Standards** (SOLID, DRY, KISS, etc.) during execution.

## 5. Maintenance

- **Archival**: Completed tasks are moved to the archive directory to keep the workspace lightweight.
- **Context Synthesis**: After any significant execution, the `CONTEXT.md` file is regenerated to summarize the latest architectural and design changes for the agent.

## 6. Run Completion Checklist

Every execution cycle ends with a mandatory checklist to verify that `TASKS.md` is updated, dependencies are respected, and no out-of-scope work was performed.
