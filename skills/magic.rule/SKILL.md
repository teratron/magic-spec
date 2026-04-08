---
name: magic:rule
description: Workflow for manually adding or amending project conventions in RULES.md.
handoffs:
  - label: "Create spec"
    workflow: magic.spec
    prompt: "Create a new specification document."
    condition: null
  - label: "Update tasks"
    workflow: magic.task
    prompt: "Update the project plan and tasks after amending standing rules."
    condition: null
  - label: "Audit specs"
    workflow: magic.spec
    prompt: "Audit specifications to ensure compliance with updated rules."
    condition: null
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.rule.md (relative to workspace root) -->

# Rule Workflow

**Triggers:** *"Add rule"*, *"Add convention"*, *"Amend rule"*, *"Remove rule"*
**Scope:** Direct management of RULES.md §7 Project Conventions.
Automatic rule capture during spec work is handled by `magic.spec`.

> **Full implementation:** `.magic/rule.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.