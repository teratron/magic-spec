# Unified Role System

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

Defines a unified, first-class registry of agent roles used across all SDD workflows. Roles are declarative cards that describe *which lens* an agent applies at a given workflow gate — distinct from orchestration context (*who owns the task by time*). The system replaces the scattered persona mentions in workflow bodies (C24 table, `run.md` Manager/Developer, ad-hoc "adopt a {X} persona" hints) with a single discoverable source at `<engine>/roles/`.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Core invariants and runtime guards; C24 Role-Switching Gate is superseded by this spec.
- [l2-agent-surface.md](l2-agent-surface.md) - Adapter-facing surface; role cards are part of the surface exposed to adapters.

## 1. Motivation

The current engine carries three parallel mechanisms that all describe "who is acting":

1. **C24 Role-Switching Gates** (`RULES.md` §C24) — 6 adversarial personas (Project Critic, Planning Skeptic, Tester, Independent Analyst, Auditor, Constitutional Reviewer) invoked inline inside workflow bodies.
2. **Operational roles** (`run.md` §Execution Setup) — Manager / Developer — assigned by orchestration mode (Sequential vs Parallel).
3. **Ad-hoc persona mentions** scattered through `spec.md`, `task.md`, `simulate.md`, `retrospective.md` (e.g., "adopt a Skeptic persona").

Consequences of this fragmentation:

- **No discoverability**: there is no single place an agent (or maintainer) can look to learn "what roles exist and when do they fire".
- **Code-writing stage is unnamed**: the actual act of writing code in `run.md` Step 3 has no role — while adversarial reviews do. This asymmetry biases the engine toward critique over production and leaves coding-stage concerns (diff-level review, simplification, debugging) uncodified.
- **No handoff model**: transitions between personas (e.g., "Planner finished; now Coder") happen implicitly inside a single workflow body, making parallel or external-agent execution awkward.
- **No skill linkage**: the `skills/` ecosystem (e.g., `/simplify`) is conceptually adjacent to reviewer roles but not connected.

This specification establishes a unified role system that (a) makes the full role surface explicit and browsable, (b) covers the code-writing stage with named roles, (c) formalizes handoff between roles, and (d) provides an advisory link to relevant skills.

## 2. Constraints & Assumptions

**Constraints:**

- Role cards are markdown files with YAML frontmatter, stored in the engine (`.magic/roles/` in the reference implementation). They are distributed with the engine package alongside workflow files.
- Role system is additive to existing workflows — no workflow can be broken by the migration. C24 semantics (adversarial gate before finalization) must be preserved in the new form.
- Role ≠ Agent. A single executing agent may sequentially adopt multiple roles within one task (e.g., Coder → Code-reviewer → Test-engineer). This is a *cognitive* switch, not a process boundary.
- Orchestration context (Sequential vs Parallel task ownership) is **not** modeled as a role. It is a property of the execution loop, orthogonal to the role axis.

**Assumptions:**

- The engine is authored in English-only identifiers (per global language policy), and role `id` fields follow kebab-case.
- The initial migration preserves behavior: no workflow loses a gate, no gate is silently dropped. New roles (Coder, Code-reviewer, Code-simplifier, Code-skeptic, Debugger, Docs-specialist) are *additions*, not replacements, except where a legacy persona is explicitly renamed (e.g., Tester → Test-engineer).
- Frontend-specialist and other domain-specific roles are deferred to backlog; the initial registry is domain-agnostic.

## 3. Core Invariants

The following invariants apply to any implementation of the role system. An L2 implementation spec cannot reach `RFC` status until every invariant is addressed in its `Invariant Compliance` table.

### R1 — Flat Registry with Layer Attribute

All roles live in a single flat directory at a well-known engine path. Each role card declares a `layer` attribute drawn from a closed vocabulary:

- `manager` — coordinates other roles within an orchestration context (e.g., assigns tracks, serializes shared-resource access).
- `executor` — produces artifacts (code, documentation, task outputs).
- `reviewer` — evaluates artifacts produced by executors or other roles; fires at workflow gates before finalization.
- `advisor` — produces analytical output (plans, retrospectives, audits) without modifying primary artifacts.

No other layer values are permitted. The taxonomy is the only hierarchy: there are no sub-directories, no nested role categories.

### R2 — Role ≠ Agent; Handoffs Are Declarative

A role card describes *a stance*, not *an actor*. A single executing agent may adopt multiple roles sequentially within one workflow step. Transitions between roles — whether inside one agent's mind or across agent boundaries — MUST be described by an explicit `handoff` list in the role's frontmatter. Each handoff entry declares:

- The target role `id`.
- The condition under which the handoff fires (e.g., "diff ready", "task status becomes Blocked").

Handoffs are declarative: the engine does not automate them. They serve as contract documentation for agents executing the role.

### R3 — Explicit Triggers Bind Roles to Workflow Gates

Each role card declares a `triggers` list identifying the workflow file and gate name at which the role activates. A role with no triggers is invalid (it cannot be reached). Triggers are the inverse index of C24: given a workflow gate, there is a unique set of roles that fire there, and the mapping is readable from the role side.

Workflows reference roles by `id` (e.g., `@role:coder`); they do not inline the role's prompt or operating protocol.

### R4 — Orchestration Context Is Not a Role

Sequential vs Parallel task ownership is a property of the execution loop (`run.md`), not a role. The role `orchestrator` (layer: manager) is only activated when the loop is in Parallel mode; Sequential mode runs without a manager-layer role. The concept of "track owner" in Parallel mode is an orchestration context that *hosts* executor/reviewer roles — it is not itself a role.

This invariant forbids modeling "Developer" as a role. An agent that is a track owner adopts executor roles (Coder) and reviewer roles (Code-reviewer, Test-engineer) in sequence; its "Developer"-ness is its position in the orchestration graph, not a persona it wears.

### R5 — Role Cards Are Self-Contained Contracts

Each role card MUST contain, at minimum:

- Frontmatter: `id`, `name`, `layer`, `triggers`, `outputs`, `handoff`, `skills_recommended`, `related_rules`.
- Body sections: `Mission` (one-paragraph purpose), `Operating Protocol` (what the role does step-by-step when active), `Anti-patterns` (what the role must NOT do).

A workflow referencing a role card MUST be understandable without opening the card — i.e., the workflow describes *when* the role fires and *what output it expects*, and the card describes *how* the role operates. This separation allows workflows to remain concise while role details are browsable in one place.

### R6 — Skills Linkage Is Advisory Only

A role card MAY list recommended skills in `skills_recommended`. These are **advisory hints** — they inform agents that a named skill may help while operating in the role. The engine does NOT automatically invoke skills based on role activation. This preserves skill autonomy (skills may be replaced, renamed, or uninstalled without breaking roles) and avoids coupling the role system to skill discovery logic.

### R7 — Backward Compatibility with C24

All legacy C24 personas (`Project Critic`, `Planning Skeptic`, `Tester`, `Independent Analyst`, `Auditor`, `Constitutional Reviewer`) MUST be migrated to role cards with preserved semantics:

- Gate position (workflow + step) is preserved.
- Adversarial questioning semantics are preserved in the role's `Operating Protocol`.
- The C24 table in `RULES.md` is rewritten as a pointer-table: each row points to a role card by `id` rather than inlining persona descriptions.

After migration, no workflow retains inline persona descriptions. "Adopt a {X} persona" phrases in workflow bodies are replaced with `Activate @role:{id}` (or equivalent reference syntax).

### R8 — Role Registry Is Versioned via Engine Version

The set of role cards is part of the engine. Additions, removals, or semantic changes to role cards constitute engine changes and MUST trigger `update-engine-meta` (per C14). Role cards are checksummed alongside workflows.

### R9 — No Silent Role Dropout at Workflow Gates

If a workflow gate references a role `id` that does not resolve to a card in the registry, execution MUST halt with a clear error (`ROLE_MISSING`). Silent skip is forbidden. This mirrors the existing registry-integrity guards for specs and workflows.

### R10 — Role Cards Are Read-Only from User Projects

Role cards distributed with the engine are part of the engine surface and are NOT modified by user projects. Project-specific role extensions (if supported by a future L2 spec) MUST use a separate, clearly-scoped registry location and MUST NOT override engine-shipped cards without explicit opt-in. This is symmetrical to the existing engine/design separation.

## 4. Role Inventory (Initial Registry)

This spec defines *which roles exist* at the concept level. Concrete card content (Mission, Operating Protocol, Anti-patterns, full trigger wiring) is an L2 concern. The initial registry, covering both new roles and C24 migrations, contains **13 roles**:

### 4.1 New Roles (Code-Writing Coverage)

| id | layer | Purpose |
| :--- | :--- | :--- |
| `orchestrator` | manager | Parallel-mode task dispatch and shared-resource serialization. Replaces `run.md` "Manager" row. |
| `planner` | advisor | Owns plan construction and planning-time skeptical review. Consolidates existing Planning Skeptic semantics in `task.md`. |
| `coder` | executor | Active role during the write-code step of task execution. Currently unnamed in `run.md` Step 3. |
| `code-reviewer` | reviewer | Diff-level review gate before QA. Fires after `coder` produces a diff, before `test-engineer`. |
| `code-simplifier` | reviewer | Opt-in review gate targeting minimalism, dead code, unnecessary abstraction. Links to the `simplify` skill. |
| `code-skeptic` | reviewer | Opt-in adversarial review of code-level decisions (equivalent of Planning Skeptic applied to diffs, not plans). |
| `test-engineer` | reviewer | QA gate before marking a task `Done`. Migrated from C24 `Tester` persona. |
| `debugger` | executor | Active role on the `Blocked [!]` branch of `run.md`. Currently absent. |
| `docs-specialist` | executor | Active role when public API changes require documentation updates, triggered from `run.md` post-Done flow. |

### 4.2 Migrated Roles (C24 → Registry)

| id | layer | Migrated From |
| :--- | :--- | :--- |
| `spec-critic` | reviewer | C24 `Project Critic` (spec.md Post-Update Review) |
| `project-auditor` | reviewer | C24 `Auditor` (analyze.md Pre-Advisory) |
| `constitutional-reviewer` | reviewer | C24 `Constitutional Reviewer` (rule.md Impact Analysis) |
| `retrospective-analyst` | advisor | C24 `Independent Analyst` (retrospective.md Signal calc) |

Note: the C24 `Planning Skeptic` is absorbed into `planner` (advisor layer carries its own skeptical review step); the C24 `Tester` is renamed to `test-engineer` without semantic change.

## 5. Lifecycle & Governance

### 5.1 Adding a Role

Adding a new role requires:

1. A new role card in the registry.
2. At least one workflow `triggers` entry pointing at the role.
3. C14 `update-engine-meta` execution (checksum refresh).
4. If the role is adversarial (layer: reviewer) and fires at a previously-unprotected workflow gate, the addition MUST be accompanied by a corresponding workflow update.

### 5.2 Removing or Renaming a Role

Removal or rename requires a sweep of all workflow references to the role `id`. If any reference remains unresolved after the change, R9 (`ROLE_MISSING`) halts execution. This mirrors `spec.md` Refactoring Guard for spec renames.

### 5.3 Deprecating a Role

A role card MAY carry a `deprecated: true` frontmatter flag. Deprecated roles remain resolvable but emit a warning when triggered. Full removal follows the standard rename/removal sweep rule.

## 6. Drawbacks & Alternatives

### 6.1 Drawback: Extra File Count

The initial migration adds 13 files to the engine. Mitigation: the files replace inline persona prose scattered across 5+ workflow files, so net reading surface for agents is smaller (they load one card on demand rather than re-reading persona hints embedded in long workflow bodies).

### 6.2 Drawback: Indirection at Gates

Workflows now reference roles by `id` rather than inlining the persona. An agent reading `run.md` Step 3.5 must follow a reference to the `test-engineer` card. Mitigation: workflows retain gate descriptions ("fire before marking Done"); only the persona *content* is externalized. The trade-off favors discoverability over inline brevity.

### 6.3 Alternative Considered: Extend C24 Table In Place

Adding new personas (Coder, Code-reviewer, Code-simplifier) directly to the C24 table in `RULES.md` without creating `.magic/roles/`. Rejected because:

- C24 is tuned for *adversarial review gates*, not executor roles like Coder. Adding executors would blur the gate's purpose.
- No handoff model would emerge; persona transitions would remain implicit.
- Skill linkage would have nowhere to live.

### 6.4 Alternative Considered: Roles as Subdirectories by Layer

Placing roles in `.magic/roles/{layer}/` (e.g., `.magic/roles/executor/coder.md`). Rejected: the layer attribute is already in frontmatter, and a flat directory makes the full registry visible in a single listing. Subdirectories would complicate cross-layer handoff references without semantic benefit.

## Canonical References

| Alias | Path | Purpose |
| :--- | :--- | :--- |
| `[RULES]` | `.magic/templates/rules.md` | Source of C24 table to be rewritten as pointer-table after migration. |
| `[RUN]` | `.magic/run.md` | Host of Orchestrator / Coder / Code-reviewer / Test-engineer / Debugger triggers. |
| `[TASK]` | `.magic/task.md` | Host of Planner trigger. |
| `[SPEC]` | `.magic/spec.md` | Host of Spec-critic trigger (Post-Update Review). |
| `[ANALYZE]` | `.magic/analyze.md` | Host of Project-auditor trigger. |
| `[RULE]` | `.magic/rule.md` | Host of Constitutional-reviewer trigger. |
| `[RETRO]` | `.magic/retrospective.md` | Host of Retrospective-analyst trigger. |
| `[ENGINE-CORE]` | `.design/engine/specifications/l1-engine-core.md` | C24 semantics superseded by this spec; cross-reference required. |

## Document History

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | 2026-04-23 | Promoted to Stable. MVC satisfied (Overview + Core Invariants); no RULES.md conflicts; no circular dependencies. |
| 0.1.0 | 2026-04-23 | Initial Draft. Defines R1–R10 invariants, 13-role initial inventory (9 new + 4 C24 migrations), and lifecycle rules. Frontend-specialist and further domain roles deferred to backlog. |
