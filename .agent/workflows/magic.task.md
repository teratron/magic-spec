---
description: Workflow for orchestrating tasks and generating the implementation plan.
handoffs:
  - label: "Execute tasks"
    workflow: magic.run
    prompt: "Execute the unblocked tasks from the generated plan."
    condition: "tasks_generated"
---

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*
**Scope:** Plan generation, task decomposition, and execution orchestration.
Execution is handled by `magic.run`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
