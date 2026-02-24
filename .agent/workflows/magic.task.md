---
description: Workflow for orchestrating tasks and generating the implementation plan.
handoffs:
  - label: "Generate plan"
    workflow: magic.task
    prompt: "Generate or update the implementation plan and tasks based on ALL registered specifications."
  - label: "Execute tasks"
    workflow: magic.run
    prompt: "Execute the unblocked tasks from the generated plan."
    condition: "tasks_generated"
---

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*
**Scope:**

- **Registry First**: Every plan update must synchronize with `INDEX.md`. Orphaned specs are critical blockers.
- **Delta Edits**: Use surgical search-and-replace tools for specs >200 lines to prevent corruption.
- Plan generation, task decomposition, and execution orchestration.
Execution is handled by `magic.run`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
