---
description: Workflow for generating and executing implementation tasks.
handoffs:
  - label: "Update plan"
    workflow: magic.plan
    prompt: "Update the project plan based on task progress."
    condition: null
  - label: "Run retrospective"
    workflow: magic.retrospective
    prompt: "Run an SDD retrospective to analyze phase metrics."
    condition: "phase_complete"
---

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Start tasks"*, *"Next task"*, *"Continue"*, *"Update tasks"*, *"Sync tasks"*, *"Start parallel execution"*, *"Launch agents"*
**Scope:** Task generation, execution tracking, parallelism, and agent coordination.
Planning is handled by `magic.plan`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
