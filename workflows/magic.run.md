---
name: magic.run
description: Workflow for executing tasks from the project plan.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "Proceed to rebuild dependencies and tasks seamlessly."
    condition: null
  - label: "Diagnose drift"
    workflow: magic.analyze
    prompt: "Run post-task drift diagnostics to detect spec gaps before replanning or spec updates."
    condition: "drift_suspected"
  - label: "Update specifications"
    workflow: magic.spec
    prompt: "Transition to architecting solutions for confirmed spec gaps or Blocked tasks."
    condition: "gaps_confirmed"
---

# Run Workflow

**Triggers:** *"Start tasks"*, *"Next task"*, *"Continue"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*, *"Start work"*

Trigger: `/magic.run [arg]`

Arguments:

- *(empty)* — full execution across all workspaces
- `{workspace}` — scoped execution within a workspace
- `"text"` — directed execution (task ID, phase, or focus)
- `{workspace} "text"` — scoped + directed execution

Examples: `/magic.run`, `/magic.run engine`, `/magic.run "T-1A01"`, `/magic.run "phase-2"`, `/magic.run docs "validation tasks only"`

- **Rules Parity**: Always check for version mismatch between `RULES.md` and `TASKS.md` before starting.
- **Finalization**: After task/phase completion, run `node .magic/scripts/executor.js finalize --workflow=run` and display output verbatim. Never auto-commit. See `.magic/run.md §Finalization Protocol`.
**Scope:** Code execution, task state management, and changelog generation.
Task generation and orchestration are handled by `magic.task`. Specification authoring is handled by `magic.spec`. Health auditing via `magic.analyze`.
Pipeline: `magic.spec` → `magic.task` → `magic.run`

> **Full implementation:** `.magic/run.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.
