# Execution & Run Workflow

This document explains the process of carrying out implementation tasks within the Magic SDD engine.

## 1. Overview

The Run Workflow is the execution engine of Magic SDD. It reads the atomic tasks defined in `.design/TASKS.md` and coordinates their implementation while maintaining project state and a high-fidelity audit trail.

Key Goals:

- **Scope Compliance**: Ensuring implementation code strictly follows the approved specification.
- **Code Quality & Engineering Standards**: Enforcing modern design principles (OOP, SOLID, DRY, KISS, YAGNI), Feature-Sliced Design, and stack-specific linters.
- **Mandatory Testing**: Ensuring all new or modified logic is covered by automated tests before completion.
- **State Integrity**: Automatically updating task statuses in `TASKS.md` and synchronously closing checkboxes (`[x]`) in `PLAN.md` after every operation (preventing "Plan Amnesia").
- **Single Execution Gate**: Concentrating all manual approvals into one high-level "Go" confirm before implementation begins, following the **Trust Mode** philosophy.
- **Maximum Automation**: Running post-implementation logic (changelogs, retrospectives, version bumps) with minimal user interruption.

## 2. Execution Modes

Magic supports two primary modes for implementation:

- **Sequential (Default)**: Optimized for solo developers. The agent processes tasks one-by-one, ensuring full focus on each atomic unit of work.
- **Parallel**: Optimized for multi-agent environments. A **Manager Agent** coordinates several **Developer Agents**, each owning a separate "track" to maximize throughput without conflicting on the same files.

The execution mode is defined as a Project Convention in `.design/RULES.md §7`.

- **Shared-Constraint Detection (Deep Scan)**: In Parallel mode, the **Manager Agent** reads the task descriptions *and* the associated spec sections for each active task. If two tasks reference a shared file — even when the task descriptions don't mention it explicitly (constraint visible only in spec body) — the manager automatically serializes those tasks to prevent race conditions.

## 3. Automation & Workflows

### 3.1 Pre-flight: Consistency Check

Before starting any work, the `magic.run` workflow runs a mandatory check to ensure the tasks in `TASKS.md` are still valid and that the core engine logic (checksums) has not been tampered with.

- **Rules Parity**: The engine verifies that the `RULES.md` version matches the base version recorded in `TASKS.md`. If a mismatch is found, it warns the user of a potential convention drift.
- **Quarantine Check (C12)**: The engine verifies that every active task belongs to a **Stable** Layer 1 specification. If any task violates this (e.g., its concept has dropped to RFC), execution will **HALT** until the plan is re-synchronized.
- **Spec Stability Spot-Check (RE-2)**: Independently of C12, the engine reads `INDEX.md` and confirms that every spec targeted by a `Todo` task in the current phase is still `Stable`. If any spec has been directly demoted since plan generation (e.g., Stable → RFC via an external edit), execution **HALTs** immediately: *"Spec `{file}` is no longer Stable (current: RFC). Run `magic.task update` to re-evaluate the plan."* This guard catches direct demotion that C12 alone cannot detect (C12 requires a non-Stable L1 parent; this guard catches direct demotion of the target spec itself).

### 3.2 Change Records & Changelog

The engine automatically extracts "Change Records" from completed tasks. When a phase is finished, these are compiled into a draft `CHANGELOG.md` entry for the current version.

### 3.3 Zero-Prompt Automation (C9)

Once a plan is approved, the engine is authorized to handle routine tasks (writing phase reports, snapshots, and updating context files) autonomously without asking for confirmation.

### 3.4 Blocked Task Escalation

If a task encounters ambiguous instructions or missing details during execution, the agent marks the task as `Blocked` in `TASKS.md` and halts execution. The agent utilizes a delegated handoff to jump back into the **Spec Workflow** (Explore Mode), where the specifications are formally updated before resuming the tasks.

### 3.5 Session Isolation (Phase Gates - C17)

To prevent code corruption and architectural drift, major transitions within or out of the **Run Workflow** are protected by a **Hard Stop**.

1. **Execution Focus**: All coding and task completion should occur in a single, continuous chat session to maintain the agent's understanding of the files currently being modified.
2. **Phase Completion**: Once a phase is finished, the agent is mandated to halt.
3. **Session Reset**: You must physically open a **New Chat** (using the IDE's "New Chat" button) before starting a new phase or returning to **Specification/Planning** (e.g., if a task is Blocked). This ensures the agent reads the committed code as the sole source of truth, eliminating any "context bleed" from the previous execution session.

## 4. Lifecycle & Conclusion

- **Phase Completion**: Triggers a **Level 1 (Auto-snapshot) Retrospective**.
- **Plan Completion**: Triggers a **Level 2 (Full) Retrospective** and a final version bump across the project's manifests (e.g., `package.json`).
- **Governance via Rules**: All logic is governed by a central rulebook (`.design/RULES.md`), which acts as the project's living constitution, and enforced by rigorous **Code Quality & Engineering Standards** (SOLID, DRY, KISS, etc.) during execution.

## 5. Maintenance

- **Archival**: Completed tasks are moved to the archive directory to keep the workspace lightweight.
- **Context Synthesis**: After any significant execution, the `CONTEXT.md` file is regenerated to summarize the latest architectural and design changes for the agent.

## 6. Run Completion Checklist

Every execution cycle ends with a mandatory checklist to verify that `TASKS.md` is updated, dependencies are respected, and no out-of-scope work was performed.
