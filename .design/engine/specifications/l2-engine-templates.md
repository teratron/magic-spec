# Engine Templates

**Version:** 1.1.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Template files in `.magic/templates/` that define the structural blueprints for specifications, plans, tasks, phases, and retrospectives. These templates are consumed by engine workflows during artifact creation. Phase task entries include an explicit `Verify` line so execution has a concrete completion criterion before `Done`.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core engine logic.
- [l2-engine-automation.md](l2-engine-automation.md) - Scripts that instantiate templates.

## 1. Motivation

Templates are the structural DNA of every `.design/` artifact. Changes to templates silently propagate to all future specifications, plans, and tasks. Without explicit coverage, template drift or inconsistency goes undetected.

## 2. Constraints & Assumptions

- Templates must not contain project-specific content — only structural placeholders.
- Placeholder syntax: `{placeholder_name}` for substitution points.
- All templates reside in `.magic/templates/` (flat directory, no nesting).

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| Engine Safety (C1) | Templates are engine files — C14 meta-sync applies on modification |
| Content Rules (RULES.md §5) | Templates enforce required sections (Overview, Motivation, Document History) |
| Micro-spec Convention (C16) | `micro-spec.md` template provides lightweight alternative under 50 lines |
| Verifiable Execution | `phase.md` requires a `Verify` field for every atomic task; vague success criteria are rejected by `task.md` decomposition |

## 5. Detailed Design

### 5.1 Template Inventory

```plaintext
.magic/templates/
  spec.md            — Full specification (L1/L2)
  micro-spec.md      — Lightweight spec for minor changes (<50 lines)
  plan.md            — Implementation plan
  tasks.md           — Task breakdown ledger
  phase.md           — Phase definition
  retrospective.md   — Phase retrospective
```

### 5.2 Template Contracts

Each template guarantees:

- Required metadata header (`Version`, `Status`, `Layer`).
- Required sections per RULES.md §5 (Overview, Motivation, Document History).
- Placeholder markers for automation substitution.
- For `phase.md`, each atomic task block includes `Verify:` with a concrete command, check, or evidence source required before `Done`.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/templates/spec.md` | Full specification scaffold |
| `.magic/templates/micro-spec.md` | Lightweight spec scaffold |
| `.magic/templates/plan.md` | Implementation plan scaffold |
| `.magic/templates/tasks.md` | Task ledger scaffold |
| `.magic/templates/phase.md` | Phase definition scaffold |
| `.magic/templates/retrospective.md` | Phase retrospective scaffold |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.1.0 | 2026-05-12 | Added mandatory `Verify` field to phase task entries and documented verifiable execution contract. |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
