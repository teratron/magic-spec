# L2 Specification: Universal Skill Wrappers

**Version:** 1.4.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## 1. Objective

To provide a seamless interface for disparate AI agents (Claude Code, Gemini, GitHub Copilot, etc.) by projecting Magic SDD Workflows into native "Skills" (Tool-based definitions).

## 2. Architecture

Magic Spec primarily uses Markdown-based workflows for task execution. However, some agents prioritize "Skills" (directories with `SKILL.md`) over slash-commands. This specification defines a projection mechanism to treat Workflows as the Source of Truth and Skills as the generated interface.

### 2.1. File System Projection

| Source Path (Workflow) | Target Path (Skill Wrapper) | Agent Interface |
| --- | --- | --- |
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

### 3.1. Automation

The `executor.js update-engine-meta` command handles skill synchronization as part of engine meta updates:

1. Scan `workflows/` and `.agents/workflows/` for `.md` files.
2. Extract the description from the YAML header or the first paragraph of the workflow.
3. Generate/update the corresponding skill directories and `SKILL.md` files.
4. Clean up orphaned skills if the source workflow is deleted.

### 3.2. Regeneration Trigger (Independent of Checksum Manifest)

Step 1 above reads `workflows/` directly off disk — it does not consult `.magic/.checksums`. This is a deliberate asymmetry, and the two data sources must never be conflated:

| Mechanism | Reads | Purpose |
| --- | --- | --- |
| `.magic/.checksums` (C14 manifest) | `.magic/` only | Detects drift in the **engine core** the user must never hand-edit; deliberately excludes `workflows/`, `skills/`, `rules/` so those user-customizable wrapper layers stay editable without tripping engine-integrity HALTs. |
| Skill regeneration (this spec, §3.1) | `workflows/` + `.agents/workflows/` | Must fire whenever those source files differ from what was last projected — a concern the checksum manifest was never built to track and explicitly does not cover. |

**Invariant (mandatory)**: skill-wrapper regeneration runs on every `update-engine-meta` **write** invocation, unconditionally — never gated behind the `.magic/` checksum verdict. A write path that skips regeneration because "no changes detected in engine core" is reporting on the wrong data source: `workflows/` can hold real, un-synced changes while `.magic/.checksums` shows nothing, precisely because the manifest was designed to exclude that directory. `update-engine-meta --check` (the read-only mode invoked by the user's pre-commit hook) is exempt from this invariant — it must perform no write of any kind, including a skill regeneration, since it is a verification surface, not a synchronization one.

**Provenance**: written after a production gap. A `workflows/*.md` edit left `.magic/.checksums` untouched (by the design documented in the table above), so a subsequent `update-engine-meta` reported "No changes detected in engine core" and skipped Step 1 through Step 4 entirely — shipping a skill wrapper generated from pre-edit content while the command's own success message implied nothing was left to do.

## 4. Integration & Deployment

### 4.1. Development Workspace

`magic-dev-init` will be updated to create junction/symlink points for the generated skill directories, ensuring the agent sees them as active tools.

### 4.2. End-User Installation

GitHub Release archives include the generated `skills/` directory, ensuring that all available workflows are also exposed as skills for agents that support the Skills format.

## Canonical References

| Path | Role |
| --- | --- |
| `skills/magic-analyze/SKILL.md` | Generated skill wrapper for analyze |
| `skills/magic-graph/SKILL.md` | Generated skill wrapper for graph |
| `skills/magic-rule/SKILL.md` | Generated skill wrapper for rule |
| `skills/magic-run/SKILL.md` | Generated skill wrapper for run |
| `skills/magic-spec/SKILL.md` | Generated skill wrapper for spec |
| `skills/magic-status/SKILL.md` | Generated skill wrapper for status (implementation deliverable; produced by update-engine-meta sync from `workflows/magic.status.md`) |
| `skills/magic-task/SKILL.md` | Generated skill wrapper for task |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.4.0 | 2026-08-28 | Agent | Added §3.2 Regeneration Trigger — skill regeneration MUST run on every `update-engine-meta` write invocation, gated on the `workflows/` source it actually reads, never on the `.magic/` checksum manifest that deliberately excludes that directory for an unrelated reason (protecting user-customizable wrapper layers from engine-integrity HALTs). `--check` stays exempt and must perform no write. Authored after a production gap: a `workflows/`-only edit left the checksum manifest clean, so `update-engine-meta` reported "No changes detected" and silently skipped regeneration, shipping a stale skill wrapper. New §5 Trigger Independence invariant. |
| 1.2.0 | 2026-05-07 | Agent | Added Layer/Implements header fields. Updated skill dir names (magic.analyze → magic-analyze format). Added magic-graph. Removed stale sync-skills.js reference. |
| 1.1.0 | 2026-04-29 | Agent | Replaced legacy package deployment with GitHub Release archive distribution. |

## 5. Invariants

- **Parity**: Content of `SKILL.md` (excluding frontmatter) must exactly match the source workflow.
- **Naming**: Skill names must be identical to workflow command names (e.g., `magic.analyze`).
- **Read-Only**: Generated skills are marked as read-only or contain a warning comment at the top.
- **Trigger Independence** (§3.2): regeneration runs on every write invocation of `update-engine-meta`, gated on nothing narrower than the source files it actually reads (`workflows/`, `.agents/workflows/`) — never on the `.magic/` checksum manifest, which deliberately excludes that directory for an unrelated reason.
