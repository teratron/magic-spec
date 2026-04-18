# Agent Surface Architecture

**Version:** 1.0.0
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
- **Mechanism:** Workflows specify `description`, `handoffs`, and step-by-step logic instructing the agent to utilize core engine mechanisms.
- **Rules:** Must not reimplement core processing logic; they are purely orchestration thin-clients pointing to `.magic/`.

### 2.2 Skills (`.agents/skills/`)

Agent toolkits and localized capabilities.

- **Purpose:** Extend the agent's capabilities beyond standard text generation, such as execution of specific build steps or environment initialization (e.g., `magic-dev-init`).
- **Mechanism:** Each skill folder must contain a `SKILL.md` (following the standard tool manifest layout) along with needed companion scripts or guides.

### 2.3 Rules (`.agents/rules/` - Reserved)

Reserved domain for agent-specific operational rules or prompts.

- **Purpose:** Distinct from the global `RULES.md` project constitution, covering LLM behavior, prompt adjustments, or context window management heuristics.

## 3. Integration & Guardrails

| Constraint | Enforcement |
| :--- | :--- |
| **Kernel Separation** | Modifying any file within `.agents/` does **not** trigger engine metadata version bumps (C14) because they are extensions, not core logic. |
| **VIO-1 Compliance** | `.agents/` is fully covered by this specification. Any new agent component MUST align with this defined structure. |
| **Universal Support** | Features in `.agents/` must avoid vendor lock-in (e.g., specific editor APIs) when possible, focusing on generic Markdown and shell invocations. |

## Canonical References

| Path | Role |
| :--- | :--- |
| `.agents/workflows/` | Agent-optimized workflow wrappers |
| `.agents/skills/` | Agent toolkit and localized capabilities |
| `AGENTS.md` | Root-level agent instructions (hardlinked) |
| `CLAUDE.md` | Claude Code adapter instructions |
| `QWEN.md` | Qwen adapter instructions |

## Document History

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | 2026-03-30 | Initial Stable version; formalizes .agents/ to resolve VIO-1 missing coverage. |
