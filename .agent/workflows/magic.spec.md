---
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "Generate the implementation plan and tasks based on finalized specifications."
    condition: "specs_stable"
  - label: "Add a rule"
    workflow: magic.rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null
---

# Specification Workflow

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Analyze"*, *"Audit specs"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*
**Scope:** Architectural exploration and specification authoring — what exists and how it is structured.
**Hints:**

- **Explore Mode**: Do not modify live files during brainstorming until explicitly approved.
- **Delta Edits**: Use surgical search-and-replace tools for specs >200 lines to prevent corruption.
Orchestration and execution are handled by `magic.task` and `magic.run`.

> **Full implementation:** `.magic/spec.md`
> Read that file before proceeding. Do not execute any steps until it is read.
