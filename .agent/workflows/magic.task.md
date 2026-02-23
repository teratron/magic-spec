---
description: Workflow for generating and executing implementation tasks.
handoffs:
  - label: "Update plan"
    workflow: magic.plan
    prompt: "Update the project plan based on task progress."
    condition: null
---

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Start tasks"*, *"Next task"*, *"Continue"*, *"Update tasks"*, *"Sync tasks"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*
**Scope:** Task generation, execution tracking, parallelism, implementation, and agent coordination.
Planning is handled by `magic.plan`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
