---
description: Workflow for simulating and validating Magic SDD engine logic.
handoffs:
  - label: "Simulate workflow"
    workflow: magic.simulate
    prompt: "Pick a workflow to simulate (spec, task, run, rule, retrospective) and find logical bottlenecks."
---

# Simulation Workflow

**Triggers:** *"Simulate"*, *"Dry run"*, *"Test workflow"*, *"Check engine logic"*, *"Find rough edges"*
**Scope:**

- **Proactive Validation**: Runs before real-world application to ensure engine changes didn't introduce logical regressions.
- **Scenario Synthesis**: Generates synthetic project states to test edge cases in workflows.
- **Engine Refinement**: Identifies "rough edges" (шероховатости) in implementation files.

> **Full implementation:** `.magic/simulate.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
