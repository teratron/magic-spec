# Rule Workflow

This document explains the management of the project's central constitution and conventions.

## 1. Overview

The Rule Workflow manages the `.design/RULES.md` file, which acts as the project's "Living Constitution." It governs all development decisions, architectural constraints, and workflow preferences.

**Triggers:** *"Add rule"*, *"Add convention"*, *"Amend rule"*, *"Remove rule"*

**Slash command:** `/magic.rule`

> **Full implementation:** `.magic/rule.md` — the engine reads this file before executing any steps.

Key Goals:

- **Governance**: Maintaining a single source of truth for project-specific constraints.
- **Safety**: Preventing accidental violations of core design principles.
- **Evolution**: Providing a structured way to add, amend, or remove rules as the project matures.

## 2. Core Invariants

The engine enforces 5 mandatory invariants during every rule operation:

| # | Invariant | Summary |
| ---: | --- | --- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Scope Guard** | Only modify §7; sections §1–6 are the Universal Constitution (amend only if explicitly targeted) |
| 3 | **No Silent Writes** | Always show proposed diff/statement before committing |
| 4 | **Auto-Init** | Silently creates `.design/` and workspace `RULES.md` if missing |
| 5 | **Versioning (C14)** | Engine integrity after `.magic/` changes; rules versioned Major/Minor/Patch |

> **C14 Exemption**: Modifying `.design/{workspace}/RULES.md` does NOT trigger a C14 engine bump — `.design/` modifications are project manifest bumps, not engine bumps.

## 3. The Constitutional Guard (§1–6)

The `RULES.md` file is divided into two major zones:

1. **Universal Constitution (§1–6)**: Core SDD invariants — **protected**. The agent **HALTs** if a proposed §7 rule contradicts the Constitution.
2. **Project Conventions (§7)**: Project-specific rules. Primary target for the Rule Workflow.

**Core-Amendment Routing**: If the user targets a section in §1–6 → route as a core amendment requiring explicit approval and Major version bump.

## 4. Two-Tier Workspace Routing

The Rule Workflow supports a two-tier rules system for multi-workspace projects:

- **Global tier** → `.design/RULES.md`: Universal Constitution (§1–6) + cross-workspace §7 conventions (C1, C2, ...).
- **Workspace tier** → `.design/{workspace}/RULES.md`: Workspace-local §7 conventions only (WC1, WC2, ...). Inherits all global rules; never overrides §1–6.

| Signal | Target |
| --- | --- |
| *"in engine"*, *"for docs"*, *"this workspace"* | Workspace `RULES.md` |
| Universal rule, no workspace context | Global `RULES.md` |
| Ambiguous | Engine asks: "Global or workspace-scoped?" |

Workspace `RULES.md` files are created on demand. Duplication checks scan **both tiers** to prevent redundancy.

## 5. Rule Actions

| Action | Logic | Version |
| --- | --- | --- |
| **Add** | Global: append after highest C{N} in §7. Workspace: append after highest WC{N}. | Minor |
| **Amend** | Match ID/keyword in target tier → replace in place. | Minor |
| **Remove** | Match ID/keyword → Dependency Scan → delete entry. | Major |
| **List** | Display all §7 entries from both tiers. | N/A |

### Remove — Dependency Scan

Before proposing deletion, the engine scans all `.magic/*.md` workflow files and `.design/` spec files for references to the target convention ID (e.g., `C3`, `WC1`). If references found → included in the proposal: *"Convention `{ID}` is referenced by: [{file}: {context}]. Removing it may break workflow logic or spec compliance."*

### Batch Operations (Trust Mode)

When the user requests multiple rule changes, all changes are grouped into a single atomic update. In Trust Mode (C9), the engine notifies the user and applies immediately. Only core amendments (§1–6) or conflicting §7 rules require explicit approval.

## 6. Constitutional Reviewer (C24)

Before committing the rule, the engine adopts a **Constitutional Reviewer** persona and evaluates:

- **Core Conflict**: Does this rule create a practical conflict with any existing logic (C1–C23)?
- **Cognitive Consistency**: Is the phrasing unquantified (hallucination risk) or redundant with a global rule?
- **Operational Friction**: Will this rule cause excessive HALT points in standard Parallel workflows (C3)?
- **Retroactive Impact**: If applied to the last 3 completed tasks, would any have halted or produced different output?

If a practical conflict is found → **HALT** before writing.

## 7. Post-Write Impact

After a rule is written to disk:

1. **Notify**: Detect if `TASKS.md` is now based on a stale version of the rules.
2. **Offer Sync**: Propose `magic.task update` to propagate the rule change.
3. **Compliance**: For critical rules, suggest `magic.spec audit` to verify existing specs comply.

## 8. Trigger Types

Rules are captured via multiple triggers:

- **T1**: Universally-scoped language ("always", "never").
- **T2**: Recurring patterns found across multiple specifications.
- **T4**: Explicit user declarations ("From now on, use..."). Also captured inline by the Spec Workflow (see [spec.md §6.5](spec.md#65-t4-rule-capture-with-tier-routing)).

## 9. Maintenance

- **Version Bumping**: Major for removals, Minor for additions/amendments, Patch for typos.
- **Document History**: Every change logged in the Document History table.
- **Engine Meta**: Modification to engine logic triggers C14 version bump.

## Sync Note

Synchronized with engine workflows on 2026-05-05 (v2.0.23).
