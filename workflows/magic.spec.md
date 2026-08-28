---
name: magic.spec
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Generate tasks"
    workflow: magic.task
    prompt: "Proceed to task generation without interruption to maintain Zero-Prompt workflows (Rule C9)."
    condition: "registry_updated"
  - label: "Add a rule"
    workflow: magic.rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null
---

# Specification Workflow

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*.

**Write Permissions (Hard Limit)**: ONLY `.design/` subtree. Everything outside `.design/` is FORBIDDEN. About to write outside? **STOP.**

**Hints:**

- **Idea Intake Gate (E6)**: raw idea input passes a silent Step 0.5 check before dispatch. Clarify ONLY when the idea is self-contradictory or admits two readings yielding materially different specs — and only after exhausting the repository. Never ask technical questions (storage, library, naming, algorithm); phrase for a non-specialist; each round must close more than it opens or the gate ends. See `.magic/spec.md §Step 0.5`.
- **Explore Mode**: safe brainstorming; transitions to writing AUTOMATICALLY on specific input or Anti-Stall (≥1 question asked without file creation, suspended during an active intake dialogue).
- **Delta Edits**: use surgical search-and-replace for specs >200 lines.
- **T4 Capture**: input contains "remember that..." / "project rule:" → spec workflow applies Tier Routing + Duplication Check before writing (see `.magic/spec.md §T4 Inline Guards`).
- **Pipeline**: `magic.spec` → `magic.task` → `magic.run`.
- **Finalization**: after dispatch, run `node .magic/scripts/executor.js finalize --workflow=spec` and display output verbatim. Never auto-commit. See `.magic/spec.md §Finalization Protocol`.

> **Full implementation:** `.magic/spec.md` · Skill: `skills/magic.spec/SKILL.md`. Read `.magic/spec.md` before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.
