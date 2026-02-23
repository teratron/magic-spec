---
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Create plan"
    workflow: magic.plan
    prompt: "Create a plan based on the finalized specifications."
    condition: "specs_stable"
  - label: "Add a rule"
    workflow: magic.rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null
---

# Specification Workflow

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Analyze"*, *"Audit specs"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*
**Scope:** Architectural exploration and specification authoring — what exists and how it is structured.
Planning and execution are handled by `magic.plan` and `magic.task`.

> **Full implementation:** `.magic/specification.md`
> Read that file before proceeding. Do not execute any steps until it is read.
