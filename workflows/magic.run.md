---
description: Workflow for executing tasks from the project plan.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "MANDATORY HARD STOP: Recommend starting a NEW chat session and running `/magic.task` to rebuild deps without context bleed (Rule C17)."
    condition: null
  - label: "Update specifications"
    workflow: magic.spec
    prompt: "MANDATORY HARD STOP: Recommend starting a NEW chat session and running `/magic.spec` to architect solutions for Blocked tasks (Rule C17)."
    condition: null
---

# Run Workflow

**Triggers:** *"Start tasks"*, *"Next task"*, *"Continue"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*, *"Start work"*

Trigger: `/magic.run [arg]`

Arguments:

- *(empty)* — full execution across all workspaces
- `{workspace}` — scoped execution within a workspace
- `"text"` — directed execution (task ID, phase, or focus)
- `{workspace} "text"` — scoped + directed execution

Examples: `/magic.run`, `/magic.run engine`, `/magic.run "T-1A01"`, `/magic.run "phase-2"`, `/magic.run installers "только валидационные задачи"`

- **Rules Parity**: Always check for version mismatch between `RULES.md` and `TASKS.md` before starting.
**Scope:** Code execution, task state management, and changelog generation.
Task generation and orchestration are handled by `magic.task`.

> **Full implementation:** `.magic/run.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.
