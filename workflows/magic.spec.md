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

- **Idea Intake Gate (E6)**: raw idea input passes a silent Step 0.5 check before dispatch. Ask ONLY when the idea is self-contradictory, admits two readings yielding materially different specs, or leaves who it is for, what it must do or where it stops to be invented — and only after exhausting the repository. One survey round at a time: plain words, the forecast's options with its winner marked, a free-text Other; never technical questions; each round must close more than it opens, and whatever is delegated the forecast answers. See `.magic/spec.md §Step 0.5`.
- **Explore Mode**: safe brainstorming; transitions to writing AUTOMATICALLY on specific input or Anti-Stall (≥1 question asked without file creation, suspended during an active intake dialogue).
- **Delta Edits**: use surgical search-and-replace for specs >200 lines.
- **T4 Capture**: input contains "remember that..." / "project rule:" → the rule is handed to `rule.md`'s Operational Logic, which records a user-stated rule at the strength stated and admits an agent-originated one only on evidence (see `.magic/spec.md §Updating RULES.md`).
- **Pipeline**: `magic.spec` → `magic.task` → `magic.run`.
- **Finalization**: after dispatch, run `node .magic/scripts/executor.js finalize --workflow=spec --workspace={active-workspace}` and display output verbatim. Never auto-commit. See `.magic/spec.md §Finalization Protocol`.

> **Full implementation:** `.magic/spec.md` · Skill: `skills/magic-spec/SKILL.md`. Read `.magic/spec.md` before proceeding.
> **Executor:** `node .magic/scripts/executor.js <script>` for all automation.
> **Anti-Hallucination Guard:** do not invent ad-hoc scripts (`.js`, `.sh`, etc.) for internal engine operations. Magic SDD steps are evaluated cognitively unless an executor script is explicitly provided.
