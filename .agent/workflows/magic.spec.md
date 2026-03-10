---
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "MANDATORY HARD STOP: Ask the user 'Generate the implementation plan?' and WAIT for their explicit 'yes' before executing this handoff."
    condition: "registry_updated"
  - label: "Simulate engine change"
    workflow: magic.simulate
    prompt: "Simulate the updated engine logic after modifying .magic or RULES.md."
  - label: "Add a rule"
    workflow: magic.rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null
---

# Specification Workflow

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*
**Scope:** Architectural exploration and specification authoring — what exists and how it is structured.
**Hints:**

- **Explore Mode**: Do not modify live files during brainstorming until explicitly approved.
- **Delta Edits**: Use surgical search-and-replace tools for specs >200 lines to prevent corruption.
Orchestration and execution are handled by `magic.task` and `magic.run`.

> **Full implementation:** `.magic/spec.md`
> Read that file before proceeding. Do not execute any steps until it is read.
> **Executor:** Use `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** Do not invent or execute any ad-hoc physical scripts (e.g., custom `.js`, `.sh` test runners) for internal engine operations. Magic SDD workflow steps are intended to be evaluated cognitively by the LLM unless an executor script is explicitly provided.
