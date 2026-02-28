---
description: Workflow for simulating and validating Magic SDD engine logic.
handoffs:
  - label: "Simulate workflow"
    workflow: magic.simulate
    prompt: "Pick a workflow to simulate or use Improv Mode (Live Simulation) for end-to-end stress testing."
  - label: "Apply fixes"
    workflow: magic.rule
    prompt: "If simulation found convention issues, use the Rule workflow to amend RULES.md."
  - label: "Run regression tests"
    workflow: magic.simulate
    prompt: "Run the full test suite (`test` target) to ensure engine modifications didn't introduce regressions."
---

# Simulation Workflow

**Triggers:** *"Simulate"*, *"Dry run"*, *"Test workflow"*, *"Check engine logic"*, *"Find rough edges"*, *"Run tests"*, *"test"*, *"improvise"*
**Scope:**

- **Proactive Validation**: Runs before real-world application to ensure engine changes didn't introduce logical regressions.
- **Scenario Synthesis**: Generates synthetic project states to test edge cases in workflows.
- **Engine Refinement**: Identifies "rough edges" in implementation files.

> **Full implementation:** `.magic/simulate.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
