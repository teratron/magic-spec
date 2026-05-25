---
name: magic-rule
description: Workflow for manually adding or amending project conventions in RULES.md.
handoffs:
  - label: "Create spec"
    workflow: magic-spec
    prompt: "Create a new specification document."
    condition: null
  - label: "Update tasks"
    workflow: magic-task
    prompt: "Update the project plan and tasks after amending standing rules."
    condition: null
  - label: "Audit specs"
    workflow: magic-spec
    prompt: "Audit specifications to ensure compliance with updated rules."
    condition: null
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: workflows/magic.rule.md (relative to workspace root) -->

# Rule Workflow

**Triggers:** *"Add rule"*, *"Add convention"*, *"Amend rule"*, *"Remove rule"*.

**Scope:** direct management of RULES.md §7 Project Conventions. Automatic rule capture during spec work is handled by `magic-spec`. Rule changes feed into `magic-task` (plan updates) and `magic-run` (execution).

**Pipeline context:** `magic-rule` governs conventions used across `magic-spec` → `magic-task` → `magic-run`.

- **Finalization**: after writing RULES.md, run `node .magic/scripts/executor.js finalize --workflow=rule` and display output verbatim. Never auto-commit. See `.magic/rule.md §Finalization Protocol`.

> **Full implementation:** `.magic/rule.md`. Read it before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.