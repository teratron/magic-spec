# Rule Workflow

This document explains the management of the project's central constitution and conventions.

## 1. Overview

The Rule Workflow manages the `.design/RULES.md` file, which acts as the project's "Living Constitution." It governs all development decisions, architectural constraints, and workflow preferences.

**Triggers:** *"Add rule"*, *"Add convention"*, *"Amend rule"*, *"Remove rule"*.

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
| 3 | **Narrate Writes (C25)** | Apply immediately and show the diff inline as the write happens; approval only at objective gates (core amendment, constitutional conflict, removal) |
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
| Ambiguous | Resolved autonomously: workspace tier when a workspace is active, else global; narrated as a Decision Record |

Workspace `RULES.md` files are created on demand. Duplication checks scan both tiers, the rules the engine ships in `rules/magic.md` and the regulations inside specifications.

## 5. Rule Actions

| Action | Logic | Version |
| --- | --- | --- |
| **Add** | Global: append after highest C{N} in §7. Workspace: append after highest WC{N}. | Minor |
| **Amend** | Match ID/keyword in target tier → replace in place. | Minor |
| **Remove** | Match ID/keyword → Dependency Scan → single confirmation → delete entry. | Major |
| **List** | Display all §7 entries from both tiers. | N/A |

### Remove — Dependency Scan

Before deleting, the engine scans all `.magic/*.md` workflow files and `.design/` spec files for references to the target convention ID (e.g., `C3`, `WC1`). If references found → shown in the single confirmation a Remove asks (deleting a rule is a destructive action, C9 gate 1): *"Convention `{ID}` is referenced by: [{file}: {context}]. Removing it may break workflow logic or spec compliance."*

### Batch Operations (Trust Mode)

When the user requests multiple rule changes, all changes are grouped into a single atomic update. In Trust Mode (C9), the engine notifies the user and applies immediately. Only core amendments (§1–6), conflicting §7 rules and rule removal require explicit approval.

## 6. Constitutional Reviewer (C24)

Before committing the rule, the engine adopts a **Constitutional Reviewer** persona and evaluates:

- **Core Conflict**: Does this rule create a practical conflict with any existing convention?
- **Cognitive Consistency**: Is the phrasing unquantified (hallucination risk) or redundant with a global rule?
- **Operational Friction**: Will this rule cause excessive HALT points in standard Parallel workflows (C3)?
- **Retroactive Impact**: If applied to the last 3 completed tasks, would any have halted or produced different output?

If a practical conflict is found → **HALT** before writing.

### 6.1 Admission Gate

Before the review, the reviewer decides whether the rule should exist at all — a rule that conflicts with nothing is not thereby needed.

- **Origin**: a rule the user wrote is recorded at the strength and scope they stated and is never declined; a rule the agent composed (T1–T3, analysis output, a clause added to the user's rule) must pass the tests below. An origin that cannot be established counts as agent-originated.
- **Evidence**: an observed occurrence of the harm — a file and line, a commit, or a failure reproduced in the session; two instances for a repeated pattern. A scenario that could happen is not evidence. Harm in the irreversible class is the one exception.
- **With/without comparison**: does the cause persist, what already catches it, is the harm reversible — and which hazards the rule itself opens (friction, deadlock, over-reach, cascade, conflict, opened hole).
- **Form and placement**: the lowest rung that covers the evidence (no artifact, a note in a specification, a regulation in a specification, a workspace convention, a global convention); soft by default, hard only for irreversible harm, after a cited violation, or when the user stated it.
- **Outcome**: an admitted rule is narrated as a short admission record; a declined one as a single Decision Record (`[DR] Not codified: …`) with an override, and nothing is written. A rule that belongs in a specification is redirected to `/magic.spec amend` instead of written to `RULES.md`.
- **Size and history**: a rule body is at most 10 non-empty lines, and its Document History row records the origin (`user-stated`, or `agent` with the evidence). During ventilation `/magic.analyze` reports rules whose cause is gone, that something else already covers, that deadlock the agent or that exceed the bound (`RULE_RETIRE_CANDIDATE`, `RULE_BLOAT`); it edits nothing.

## 7. Post-Write Impact

After a rule is written to disk:

1. **Notify**: Detect if `TASKS.md` is now based on a stale version of the rules.
2. **Next step**: exactly one narrated next command — `magic.task update` by default, `magic.spec audit` only when the rule changes verification or compliance obligations.

## 8. Trigger Types

Rules are captured via multiple triggers:

- **T1**: "Always/never" wording that governs how work is done (a statement about product behavior stays in the specification).
- **T2**: A repeated pattern with at least two cited instances.
- **T3**: An audit finding whose class recurs after being fixed where it occurred.
- **T4**: Explicit user declarations ("From now on, use..."). Also captured during Spec Workflow work, which hands it to this workflow (see [spec.md §6.5](spec.md#65-t4-rule-capture-with-tier-routing)).

## 9. Maintenance

- **Version Bumping**: Major for removals, Minor for additions/amendments, Patch for typos.
- **Document History**: Every change logged in the Document History table.
- **Engine Meta**: Modification to engine logic triggers C14 version bump.

## Sync Note

Synchronized with engine workflows on 2026-09-30 (v2.1.110).
