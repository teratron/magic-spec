---
description: Workflow for creating and managing the implementation plan.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "Generate implementation tasks for the current plan."
    condition: "plan_exists"
---

# Plan Workflow

**Triggers:** *"Create plan"*, *"Generate plan"*, *"Update plan"*, *"Reprioritize"*
**Scope:** Prioritization, phasing, dependency analysis, and implementation order.
Specification authoring is handled by `magic.specification`.

> **Full implementation:** `.magic/plan.md`
> Read that file before proceeding. Do not execute any steps until it is read.
