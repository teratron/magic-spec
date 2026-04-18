# L2 Specification: Universal Skill Wrappers

**Version:** 1.0.0
**Status:** Stable

## 1. Objective

To provide a seamless interface for disparate AI agents (Claude Code, Gemini, GitHub Copilot, etc.) by projecting Magic SDD Workflows into native "Skills" (Tool-based definitions).

## 2. Architecture

Magic Spec primarily uses Markdown-based workflows for task execution. However, some agents prioritize "Skills" (directories with `SKILL.md`) over slash-commands. This specification defines a projection mechanism to treat Workflows as the Source of Truth and Skills as the generated interface.

### 2.1. File System Projection

| Source Path (Workflow) | Target Path (Skill Wrapper) | Agent Interface |
| :--- | :--- | :--- |
| `workflows/*.md` | `skills/*/SKILL.md` | User-facing tools |
| `.agents/workflows/*.md` | `.agents/skills/*/SKILL.md` | Dev-facing tools |

### 2.2. Skill Format

Each generated `SKILL.md` must include standard YAML frontmatter derived from the workflow's content.

```markdown
---
name: magic.{command}
description: {short_description_from_workflow}
---

[Full Content of the Original Workflow]
```

## 3. Synchronization (Source of Truth)

The workflows remain the primary source of truth. Manual modifications to generated `SKILL.md` files are prohibited.

### 3.1. Automation (`sync-skills.js`)

A new automation script in `.magic/scripts/sync-skills.js` will:
1. Scan `workflows/` and `.agents/workflows/` for `.md` files.
2. Extract the description from the YAML header or the first paragraph of the workflow.
3. Generate/update the corresponding skill directories and `SKILL.md` files.
4. Clean up orphaned skills if the source workflow is deleted.

## 4. Integration & Deployment

### 4.1. Development Workspace

`magic-dev-init` will be updated to create junction/symlink points for the generated skill directories, ensuring the agent sees them as active tools.

### 4.2. End-User Installation

Installers (Node.js/Python) will run the synchronization logic upon deployment, ensuring that all available workflows are also exposed as skills.

## Canonical References

| Path | Role |
| :--- | :--- |
| `skills/magic.analyze/SKILL.md` | Generated skill wrapper for analyze |
| `skills/magic.rule/SKILL.md` | Generated skill wrapper for rule |
| `skills/magic.run/SKILL.md` | Generated skill wrapper for run |
| `skills/magic.spec/SKILL.md` | Generated skill wrapper for spec |
| `skills/magic.task/SKILL.md` | Generated skill wrapper for task |
| `.magic/scripts/sync-skills.js` | Projection automation script |

## 5. Invariants

- **Parity**: Content of `SKILL.md` (excluding frontmatter) must exactly match the source workflow.
- **Naming**: Skill names must be identical to workflow command names (e.g., `magic.analyze`).
- **Read-Only**: Generated skills are marked as read-only or contain a warning comment at the top.
