# Rule Workflow

This document explains the management of the project's central constitution and conventions.

## 1. Overview

The Rule Workflow manages the `.design/RULES.md` file, which acts as the project's "Living Constitution." It governs all development decisions, architectural constraints, and workflow preferences.

- **Governance via Rules**: All logic is governed by a central rulebook (`.design/RULES.md`), which acts as the project's living constitution.
- **Rules Parity**: The system ensures that all implementation tasks are based on the latest version of the rules.

Key Goals:

- **Governance**: Maintaining a single source of truth for project-specific constraints.
- **Safety**: Preventing accidental violations of core design principles.
- **Evolution**: Providing a structured way to add, amend, or remove rules as the project matures.

## 2. The Constitutional Guard (§1-6)

The `RULES.md` file is divided into two major zones:

1. **The Universal Constitution (§1-6)**: Contains the core invariants of Magic SDD (e.g., English language, atomic tasks, spec-first). These are **protected**; the agent will **HALT** if a proposed new rule contradicts the Constitution.
2. **Project Conventions (§7)**: Contains project-specific rules (e.g., directory structure, naming conventions). This is the primary target for the Rule Workflow.

## 3. Automation & Workflows

### 3.1 Direct Management

The workflow is triggered by natural language commands like "Add rule..." or "Amend convention...". The agent parses user intent into a numbered C{N} convention and assigns the next available ID.

- **Duplication Guard**: If a proposed rule semantically overlaps with an existing convention, the agent proposes a merge or refinement instead of creating a duplicate.
- **Constitutional Bridge**: If the user desires to change a core invariant (§1-6), the agent requires an explicit "constitutional amendment" confirmation.

### 3.2 Trigger Types

Rules are added when the engine identifies:

- **T1**: Universally-scoped language ("always", "never").
- **T2**: Recurring patterns found across multiple specifications.
- **T4**: Explicit user declarations ("From now on, use...").

## 4. Two-Tier Workspace Routing

The Rule Workflow supports a two-tier rules system for multi-workspace projects:

- **Global tier** → `.design/RULES.md`: Universal Constitution (§1–6) + cross-workspace §7 conventions (C1, C2, …).
- **Workspace tier** → `.design/{workspace}/RULES.md`: Workspace-local §7 conventions only (WC1, WC2, …). Inherits all global rules; never overrides §1–6.

When a rule is added or amended, the engine determines the target tier by analyzing signal words in the request:

| Signal | Target |
| :--- | :--- |
| "in engine", "for installers", "this workspace" | Workspace `RULES.md` |
| Universal rule, no workspace context | Global `RULES.md` |
| Ambiguous | Engine asks: "Global or workspace-scoped?" |

Workspace `RULES.md` files are created on demand when the first workspace-scoped rule is requested. Duplication checks scan **both tiers** to prevent redundancy.

This same tier routing is also applied by the **Spec Workflow** when capturing T4 rules inline (see [spec.md §4.7](spec.md#47-t4-rule-capture-with-tier-routing)).

## 5. Impact Analysis & Sync

After a rule is written to disk:

1. **Notify**: The engine detects if `TASKS.md` is now based on a stale version of the rules.
2. **Offer Sync**: The user is offered to run `magic.task update` to propagate the new standards into the implementation plan.
3. **Audit**: If the rule is critical, the engine may suggest a `magic.spec audit` to ensure existing specs comply.

## 6. Maintenance

- **Version Bumping**: Rules use Semantic Versioning (Major for removals, Minor for additions/amendments, Patch for typos).
- **Document History**: Every change is logged in the Document History table.
- **Engine Meta**: Any modification to the rule engine logic triggers an automatic C14 version bump.

## Sync Note

Synchronized with engine workflows on 2026-03-31 (v1.5.109).
