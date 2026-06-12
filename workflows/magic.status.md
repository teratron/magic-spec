---
name: magic.status
description: Session resume briefing — current position, progress, blockers, and the one next command
handoffs:
  - label: "Continue execution"
    workflow: magic.run
    prompt: "Resume the active phase from the recommended next task."
    condition: "open_tasks"
  - label: "Replan"
    workflow: magic.task
    prompt: "Plan or revalidate the implementation plan."
    condition: "plan_gap_or_drift"
---

# Status Workflow

Read-only resume briefing: where the project stands, what was last done and decided, what blocks progress, and the one command to run next. Composed from live memory (`STATE.md`) and registries — performs zero writes.

**Triggers:** `/magic.status [arg]`, *"Where am I"*, *"What's next"*, *"Project status"*, *"Resume briefing"*.

**Trigger:** `/magic.status [arg]`. Arguments:

- *(empty)* — briefing for the resolved (default) workspace
- `{workspace}` — briefing for a specific workspace

Examples: `/magic.status`, `/magic.status engine`.

1. **Load**: read `.magic/status.md` and execute its steps.
2. **Brief**: render the seven-section briefing (Header → Position → Progress → Blockers & Constraints → Decisions → Engine → Next).
3. **Recommend**: end with exactly one next command (Decision Record format) — never a question.

> **Full implementation:** `.magic/status.md`. Read it before proceeding.
> **Read-only:** this workflow performs no writes, no finalization, no version bumps.
// turbo-all
