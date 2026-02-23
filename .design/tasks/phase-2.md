# Phase 2: Core Engine Upgrades

**Status:** Completed
**Execution Mode:** Parallel
**Tracks:** A, B, C

## User Stories

### [P2] US-01 — As a user, I can set scope boundaries and prioritize my tasks

Tasks: T-2A01
Parallel-safe: T-2A01 [P]

### [P2] US-02 — As an agent, I receive auto-generated project context

Tasks: T-2A02, T-2B01
Parallel-safe: T-2A02, T-2B01

### [P2] US-03 — As an agent, I can safely brainstorm and use delta edits for large files

Tasks: T-2C01, T-2C02
Parallel-safe: none (sequential dependency)

---

## Track A — Task Engine (magic.task)

### [T-2A01] Integrate User Story rules and priority checking into task.md [P]

  Spec:     workflow-enhancements.md §3.2
  Story:    US-01
  Priority: P2
  Phase:    2 / Track A
  Depends:  —
  Status:   Done ✓
  Changes:  Updated `task.md` anatomy and generate task process to include User Stories and skipping priorities.
  Assignee: Agent
  Notes:    Integrate priority check into the `magic.task` workflow and update task generation template.

### [T-2A02] Hook `generate-context` into task.md and plan.md

  Spec:     workflow-enhancements.md §3.4
  Story:    US-02
  Priority: P2
  Phase:    2 / Track A
  Depends:  T-2B01
  Status:   Done ✓
  Changes:  Added generate-context hooks to `plan.md` and `task.md` diagrams and rules.
  Assignee: Agent
  Notes:    Hook generate-context functionality explicitly into plan and task workflows.

## Track B — Context Scripts (generate-context)

### [T-2B01] Write `generate-context.sh` and `generate-context.ps1` scripts [P]

  Spec:     workflow-enhancements.md §3.4
  Story:    US-02
  Priority: P2
  Phase:    2 / Track B
  Depends:  —
  Status:   Done ✓
  Changes:  Created `generate-context.sh` and `.ps1` to assemble `CONTEXT.md` from plan, workspace structure, and changelog.
  Assignee: Agent
  Notes:    Create the `generate-context` scripts to parse `PLAN.md`/`CHANGELOG.md` and manage `CONTEXT.md` generation.

## Track C — Specification Engine (magic.specification)

### [T-2C01] Update rules in `specification.md` for Explore Mode & Deltas

  Spec:     workflow-enhancements.md §3.5
  Story:    US-03
  Priority: P2
  Phase:    2 / Track C
  Depends:  —
  Status:   Done ✓
  Changes:  Added Explore Mode safety and Delta Editing constraint rules to `.magic/specification.md`.
  Assignee: Agent
  Notes:    Instruct the agent to prevent overriding files in explore mode, and add delta generation constraints in `.magic/specification.md`.

### [T-2C02] Update `magic.specification.md` workflow wrapper

  Spec:     workflow-enhancements.md §3.8
  Story:    US-03
  Priority: P2
  Phase:    2 / Track C
  Depends:  T-2C01
  Status:   Done ✓
  Changes:  Added Explore Mode and Delta hints to `.agent/workflows/magic.specification.md`.
  Assignee: Agent
  Notes:    Add Explore/Delta hints to `.agent/workflows/magic.specification.md`.
