---
name: magic.run
description: Executes the planned tasks of the active phase from the task list, in parallel tracks when they are independent. Use when the user asks to start, continue or resume the planned work, to run the next task of the plan, or to implement a named task or phase from TASKS.md.
handoffs:
  - label: "Replan"
    workflow: magic.task
    prompt: "Revalidate the plan against current specs. Pre-Planning Stabilization auto-fixes mechanical drift; HALT with a single /magic.spec recommendation only on substantive design gaps. Per `rules/magic.md §5`, this is the SOLE user-visible next step after a phase — never propose /magic.analyze or /magic.spec proactively."
    condition: null
---

# Run Workflow

**Triggers:** *"Start tasks"*, *"Next task"*, *"Continue"*, *"Start parallel execution"*, *"Launch agents"*, *"Implement"*, *"Apply"*, *"Run"*, *"Execute"*, *"Start work"*.

**Trigger:** `/magic.run [arg]`. Arguments:

- *(empty)* — full execution across all workspaces
- `{workspace}` — scoped execution within a workspace
- `"text"` — directed execution (task ID, phase, or focus)
- `{workspace} "text"` — scoped + directed execution

Examples: `/magic.run`, `/magic.run engine`, `/magic.run "T-1A01"`, `/magic.run "phase-2"`, `/magic.run docs "validation tasks only"`.

**Scope:** code execution, task state management, and changelog generation. Task generation/orchestration is handled by `magic.task`. Specification authoring by `magic.spec`. Health auditing by `magic.analyze`.

- **Rules Parity**: always check for version mismatch between `RULES.md` and `TASKS.md` before starting.
- **Pipeline**: `magic.spec` → `magic.task` → `magic.run`.
- **Finalization**: after task/phase completion, run `node .magic/scripts/executor.js finalize --workflow=run --workspace={active-workspace}` and display output verbatim. Never auto-commit. See `.magic/run.md §Finalization Protocol`.

> **Full implementation:** `.magic/run.md`. Read it before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.
