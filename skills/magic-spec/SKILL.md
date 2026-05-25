---
name: magic-spec
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Generate tasks"
    workflow: magic-task
    prompt: "Proceed to task generation without interruption to maintain Zero-Prompt workflows (Rule C9)."
    condition: "registry_updated"
  - label: "Add a rule"
    workflow: magic-rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: workflows/magic.spec.md (relative to workspace root) -->

# Specification Workflow

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*.

**Write Permissions (Hard Limit)**: ONLY `.design/` subtree. Everything outside `.design/` is FORBIDDEN. About to write outside? **STOP.**

**Hints:**

- **Explore Mode**: safe brainstorming; transitions to writing AUTOMATICALLY on specific input or Anti-Stall (≥1 question asked without file creation).
- **Delta Edits**: use surgical search-and-replace for specs >200 lines.
- **T4 Capture**: input contains "remember that..." / "project rule:" → spec workflow applies Tier Routing + Duplication Check before writing (see `.magic/spec.md §T4 Inline Guards`).
- **Pipeline**: `magic-spec` → `magic-task` → `magic-run`.
- **Finalization**: after dispatch, run `node .magic/scripts/executor.js finalize --workflow=spec` and display output verbatim. Never auto-commit. See `.magic/spec.md §Finalization Protocol`.

> **Full implementation:** `.magic/spec.md` · Skill: `skills/magic-spec/SKILL.md`. Read `.magic/spec.md` before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.