---
name: magic-task
description: Workflow for orchestrating tasks and generating the implementation plan.
handoffs:
  - label: "Generate plan"
    workflow: magic-task
    prompt: "Generate or update the implementation plan and tasks based on ALL registered specifications."
  - label: "Execute tasks"
    workflow: magic-run
    prompt: "Proceed to task execution without interruption to maintain Zero-Prompt workflows (Rule C9)."
    condition: "tasks_generated"
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: workflows/magic.task.md (relative to workspace root) -->

# Task Workflow

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*.

**Trigger:** `/magic-task [arg]`. Arguments:

- *(empty)* — full planning across all workspaces
- `{workspace}` — scoped planning for a specific workspace
- `"text"` — guided planning with focus or instructions
- `{workspace} "text"` — scoped + guided planning

Examples: `/magic-task`, `/magic-task engine`, `/magic-task "decompose phase-2 in more detail"`, `/magic-task docs "only new specs"`.

**Scope:**

- **Rules Parity**: `RULES.md` version must be recorded in `TASKS.md` header.
- **Registry First**: every plan update must synchronize with `INDEX.md`. Orphaned specs are critical blockers.
- Plan generation, task decomposition, and execution orchestration. Execution is handled by `magic-run`. Specification authoring by `magic-spec`. Rule governance by `magic-rule`.
- **Pipeline**: `magic-spec` → `magic-task` → `magic-run`.
- **Post-Run Entry (`rules/magic.md §5`)**: when invoked after `/magic-run` for drift recovery, Pre-Planning Stabilization auto-fixes mechanical drift (Draft→Stable promotion, field normalization, phantom backlog moves); Pre-flight HALTs with a single `/magic-spec` recommendation only on substantive gaps requiring human design input.
- **Finalization**: after plan write, run `node .magic/scripts/executor.js finalize --workflow=task` and display output verbatim. Never auto-commit. See `.magic/task.md §Finalization Protocol`.

> **Full implementation:** `.magic/task.md`. Read it before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.