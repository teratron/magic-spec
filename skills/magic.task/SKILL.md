---
name: magic:task
description: Workflow for orchestrating tasks and generating the implementation plan.
handoffs:
  - label: "Generate plan"
    workflow: magic.task
    prompt: "Generate or update the implementation plan and tasks based on ALL registered specifications."
  - label: "Execute tasks"
    workflow: magic.run
    prompt: "Proceed to task execution without interruption to maintain Zero-Prompt workflows (Rule C9)."
    condition: "tasks_generated"
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: workflows/magic.task.md (relative to workspace root) -->

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*

Trigger: `/magic.task [arg]`

Arguments:

- *(empty)* — full planning across all workspaces
- `{workspace}` — scoped planning for a specific workspace
- `"text"` — guided planning with focus or instructions
- `{workspace} "text"` — scoped + guided planning

Examples: `/magic.task`, `/magic.task engine`, `/magic.task "decompose phase-2 in more detail"`, `/magic.task installers "only new specs"`

**Scope:**

- **Rules Parity**: Version of `RULES.md` must be recorded in `TASKS.md` header.
- **Registry First**: Every plan update must synchronize with `INDEX.md`. Orphaned specs are critical blockers.
- Plan generation, task decomposition, and execution orchestration.
Execution is handled by `magic.run`.

> **Full implementation:** `.magic/task.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.