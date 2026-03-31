---
name: magic.dev:simulate
description: Workflow for simulating and validating Magic SDD engine logic.
---

# Simulation Workflow

**Triggers:** *"Simulate"*, *"Dry run"*, *"Test workflow"*, *"Check engine logic"*, *"Find rough edges"*, *"Run tests"*, *"test"*, *"improvise"*
**Scope:**

- **Proactive Validation**: Runs before real-world application to ensure engine changes didn't introduce logical regressions.
- **Scenario Synthesis**: Generates synthetic project states to test edge cases in workflows.
- **Engine Refinement**: Identifies "rough edges" in implementation files.
- **Live Simulation (Improv Mode)**: Full-cycle end-to-end stress test triggered automatically on generic calls.

> **Full implementation:** `.magic/simulate.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Simulation is a purely cognitive task for the AI. **DO NOT** create physical test scripts (like `simulate.js`, `simulate.ps1`, etc.). Evaluate test scenarios internally and report results directly to the chat.