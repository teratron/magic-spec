---
description: Workflow for orchestrating tasks and generating the implementation plan.
handoffs:
  - label: "Generate plan"
    workflow: magic.task
    prompt: "Generate or update the implementation plan and tasks based on ALL registered specifications."
  - label: "Execute tasks"
    workflow: magic.run
    prompt: "MANDATORY HARD STOP: Ask the user 'Execute the unblocked tasks from the generated plan?' and WAIT for their explicit 'yes'."
    condition: "tasks_generated"
---

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*
**Scope:**

- **Rules Parity**: Version of `RULES.md` must be recorded in `TASKS.md` header.
- **Registry First**: Every plan update must synchronize with `INDEX.md`. Orphaned specs are critical blockers.
- Plan generation, task decomposition, and execution orchestration.
Execution is handled by `magic.run`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.
