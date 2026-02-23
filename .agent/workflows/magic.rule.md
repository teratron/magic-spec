---
description: Workflow for manually adding or amending project conventions in RULES.md.
handoffs:
  - label: "Create spec"
    workflow: magic.specification
    prompt: "Create a new specification document."
    condition: null
  - label: "Update plan"
    workflow: magic.plan
    prompt: "Update the project plan after amending standing rules."
    condition: null
---

# Rule Workflow

**Triggers:** *"Add rule"*, *"Add convention"*, *"Amend rule"*, *"Remove rule"*
**Scope:** Direct management of RULES.md §7 Project Conventions.
Automatic rule capture during spec work is handled by `magic.specification`.

> **Full implementation:** `.magic/rule.md`
> Read that file before proceeding. Do not execute any steps until it is read.
