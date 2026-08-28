# Agent Surface Architecture

**Version:** 1.1.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Definition and structural governance of the adapter-facing surface for AI agents (`.agents/` directory). This specification explicitly covers agent workflows, skills, and behavior rules that interface with the core Magic SDD engine.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core engine architecture.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - Covers the user-facing wrappers in the generic `workflows/` directory.

## 1. Motivation

The `.agents/` directory provides essential capabilities tailored specifically for AI pair programming adapters. However, without a dedicated specification in the `engine` workspace, changes to this directory are flagged as VIO-1 (Missing Coverage) during a Project Ventilation scan. This document resolves that gap and establishes clear architectural boundaries between the engine kernel and the agent extension layer.

## 2. Directory Structure & Components

The `.agents/` surface consists of three primary domains:

### 2.1 Workflows (`.agents/workflows/`)

Agent-optimized workflow wrappers that delegate to `.magic/*.md`.

- **Purpose:** Provide IDE-independent entry points for agent-driven execution (e.g., handling `/magic.task`, `/magic.run`).
- **Mechanism:** Workflows specify `description`, `handoffs`, and step-by-step logic instructing the agent to utilize core engine mechanisms. Each file is hardlinked to its `workflows/*.md` counterpart, not a separate authored copy — see §4 Linked-Pair Inventory.
- **Rules:** Must not reimplement core processing logic; they are purely orchestration thin-clients pointing to `.magic/`.

### 2.2 Skills (`.agents/skills/`)

Agent toolkits and localized capabilities.

- **Purpose:** Extend the agent's capabilities beyond standard text generation, such as execution of specific build steps or environment initialization (e.g., `magic-dev-init`).
- **Mechanism:** Each skill folder must contain a `SKILL.md` (following the standard tool manifest layout) along with needed companion scripts or guides. **Not a linked pair**: `skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` are two independently generated outputs of `dev/scripts/sync-skills.js`, projected from the same `workflows/*.md` source — see §4. Neither copy is a hardlink of the other; do not add `skills/` to any hardlink validation routine.

### 2.3 Rules (`.agents/rules/`)

Agent-facing projection of the watching-process rules authored in `rules/*.md` (e.g., `rules/magic.md`) — the session-level conventions a host agent inherits automatically, distinct from the global `RULES.md` project constitution (which governs spec authoring, not agent runtime posture).

- **Purpose:** Gives adapters a stable `.agents/rules/` path to read regardless of which top-level convention the host tool recognizes natively.
- **Mechanism:** Hardlinked to `rules/*.md`, not a separate authored copy — see §4 Linked-Pair Inventory. No content is authored directly under `.agents/rules/`.

## 3. Integration & Guardrails

| Constraint | Enforcement |
| --- | --- |
| **Kernel Separation** | Modifying any file within `.agents/` does **not** trigger engine metadata version bumps (C14) because they are extensions, not core logic. |
| **VIO-1 Compliance** | `.agents/` is fully covered by this specification. Any new agent component MUST align with this defined structure. |
| **Universal Support** | Features in `.agents/` must avoid vendor lock-in (e.g., specific editor APIs) when possible, focusing on generic Markdown and shell invocations. |

## 4. Linked-Pair Inventory & Validation Invariant

Several `.agents/` paths are not independently authored content — they are hardlinks (shared inode) to a canonical file that lives elsewhere in the repository. Editing either side with an inode-replacing tool (most `write`/`edit` operations) silently delinks the pair: the edit always appears to succeed, and only the un-edited twin still shows the old content.

**Complete inventory — three linked-pair groups, no more, no fewer:**

| # | Group | Anchor / canonical side | Linked side | Shape |
| --- | --- | --- | --- | --- |
| 1 | AGENTS family | `AGENTS.md` | `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `QWEN.md` | One anchor, N siblings sharing its inode |
| 2 | Rules | `rules/*.md` | `.agents/rules/*.md` | Per-file pair, same directory shape on both sides |
| 3 | Workflows | `workflows/*.md` | `.agents/workflows/*.md` | Per-file pair, same directory shape on both sides |

**Invariant (mandatory)**: every group in this table MUST be covered by `dev/scripts/validate-hardlinks.js`, and the `[C-001]` Blocking Constraint in every workspace's `STATE.md` MUST name every group by path pattern. No linked pair may exist in this repository that is absent from both. Adding a fourth group to this table without updating the validator and `[C-001]` in the same change is a spec-compliance gap, not a deferrable follow-up.

**Explicitly excluded — `skills/` is not a linked pair.** `skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` are independently generated by `dev/scripts/sync-skills.js` from the same `workflows/*.md` source; verified live — `skills/magic-spec/SKILL.md` reports exactly one hardlink (itself), not two. Treating it as a fourth pair and adding it to the validator would report false breaks on every normal regeneration, since the two sides are expected to differ in header rewrite (name/handoff casing) even when both are current.

**Provenance**: this inventory was authored after a real production gap — `workflows/*.md` existed as a hardlinked pair with neither the validator nor `[C-001]` naming it, so an edit delinked it silently and the downstream skill generator (which reads the `.agents/` side) shipped a stale artifact while every integrity check reported success. The fix is this inventory plus its enforcement, not a patch to one call site — the next unlisted pair must fail loudly by construction, not by luck.

## Canonical References

| Path | Role |
| --- | --- |
| `.agents/workflows/` | Agent-optimized workflow wrappers (hardlinked to `workflows/`, §4 Group 3) |
| `.agents/skills/` | Agent toolkit and localized capabilities (independently generated, NOT hardlinked, §2.2) |
| `.agents/rules/` | Watching-process rules projection (hardlinked to `rules/`, §4 Group 2) |
| `AGENTS.md` | Root-level agent instructions (hardlinked, §4 Group 1) |
| `CLAUDE.md` | Claude Code adapter instructions (hardlinked, §4 Group 1) |
| `dev/scripts/validate-hardlinks.js` | Enforces the §4 linked-pair invariant |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.1.0 | 2026-08-28 | Added §4 Linked-Pair Inventory & Validation Invariant — the complete, closed list of three hardlink groups (AGENTS family, `rules/`, `workflows/`) that `validate-hardlinks.js` and `[C-001]` must both cover, plus the explicit exclusion of `skills/` (independently generated, not a hardlink). Authored after a production gap: the `workflows/` group existed unguarded by either enforcement surface, so an edit delinked it silently and the skill generator shipped a stale artifact while every integrity check passed. Corrected §2.1 and §2.3, which had described the `.agents/workflows/` and `.agents/rules/` mechanism imprecisely (§2.3 called `.agents/rules/` "Reserved" though it has been an active hardlink target since before this spec's 1.0.0). Canonical References table cross-referenced to §4. |
| 1.0.1 | 2026-05-07 | Removed stale QWEN.md canonical reference (file no longer exists in project). |
| 1.0.0 | 2026-03-30 | Initial Stable version; formalizes .agents/ to resolve VIO-1 missing coverage. |
