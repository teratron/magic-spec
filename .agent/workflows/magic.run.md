---
description: Workflow for executing tasks from the project plan.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "Update the project plan and generate new tasks based on spec changes."
    condition: null
---

# Run Workflow

**Triggers:** *"Start tasks"*, *"Next task"*, *"Continue"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*, *"Start work"*
**Scope:** Code execution, task state management, and changelog generation.
Task generation and orchestration are handled by `magic.task`.

> **Full implementation:** `.magic/run.md`
> Read that file before proceeding. Do not execute any steps until it is read.
