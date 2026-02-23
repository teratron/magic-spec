---
description: Workflow for analyzing SDD usage and generating improvement recommendations.
handoffs:
  - label: "Update plan"
    workflow: magic.plan
    prompt: "Update the project plan based on retrospective findings."
    condition: null
---

# Retrospective Workflow

**Triggers:** *"Run retrospective"*, *"Analyze SDD"*, *"SDD health check"*
**Scope:** Collect statistics from `.design/` artifacts, generate observations and actionable recommendations.
Does not modify specs, plans, tasks, or RULES.md — only writes to `.design/RETROSPECTIVE.md`.

> **Full implementation:** `.magic/retrospective.md`
> Read that file before proceeding. Do not execute any steps until it is read.
