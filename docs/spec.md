# Specification Workflow

This document explains the lifecycle, structure, and management of project specifications within the Magic SDD engine.

## 1. Overview

The Specification Workflow is the entry point of the Magic SDD process. It converts raw ideas, requirements, and feedback into structured, versions, and immutable documents located in `.design/specifications/`.

Key Goals:

- **No Code in Specs**: Ensuring technical requirements are defined before implementation begins.
- **Traceability**: Linking every requirement to its implementation layer.
- **Agreement**: Providing a formal "contract" for AI agents and developers to follow.

## 2. Specification Layers

To bridge the gap between abstract ideas and concrete implementation, Magic uses a two-level layering system:

- **Layer 1 (Concept)**: Abstract, technology-agnostic requirements and business logic.
- **Layer 2 (Implementation)**: Concrete realization of a Layer 1 concept in a specific technology stack (e.g., Node.js, Python). Layer 2 specs must reference their parent via the `Implements:` field.

> **Layer Respect**: To maintain logical integrity, a Layer 2 (Implementation) specification cannot transition to **Stable** status unless its parent Layer 1 (Concept) specification is also **Stable**.

## 3. Status Lifecycle (Encapsulated)

Specifications move through a lifecycle to ensure logical maturity, but in **Trust Mode**, these transitions are hidden from the user to minimize friction:

1. **Draft**: Initial exploration and mapping.
2. **RFC (Request for Comments)**: Completed design, open for feedback. In Trust Mode, this is a transient state.
3. **Stable**: Approved/Finalized design. **Auto-Stabilization** occurs if the logic is high-confidence and non-conflicting.
4. **Deprecated**: Superseded or removed functionality.

> **Autonomous Mode**: The engine may auto-promote statuses (`Draft -> Stable`) silently if it identifies no architectural risks or contradictions with `RULES.md`.

## 4. Automation & Workflows

### 4.1 Dispatching from Raw Input

The engine automatically parses unstructured user chat ("I want a login page") and maps it to specific domains (UI, API, Architecture).

- **Multi-topic Dispatch**: A single user prompt can trigger the creation or update of multiple specifications across different domains simultaneously.
- **Conflict Guard**: If a user input contains internally contradictory requirements (e.g., "All APIs must be GraphQL" vs "Mobile must use REST"), the agent is mandated to **HALT** and ask for clarification before writing any files.

### 4.2 Consistency Check (Pre-flight)

Before any implementation plan is generated, the `magic.spec` workflow verifies that all paths and structures described in specifications actually match the current project state on disk. The check includes:

- **Path Validity**: Target spec file exists on disk.
- **Layer Integrity**: L2 spec's L1 parent is Stable.
- **Registry Sync**: Spec is registered in `INDEX.md`.
- **Version Drift (RE-1)**: The spec's `Version:` header matches the version recorded in `INDEX.md`. If they differ, a `VERSION_DRIFT` flag is raised in the Consistency Report. This detects external edits made outside the amendment lifecycle.
- **Engine Integrity**: `.magic/` checksums are valid.

### 4.5 Version Drift Guard (RE-3)

If a `VERSION_DRIFT` is detected for the **target spec of an active update**, the engine escalates from a warning to a **HALT** before writing any changes:

> *"Version drift on `{file}`: file header v{X} ≠ registry v{Y}. Resolve drift first: (a) sync INDEX.md and apply the amendment rule to the external change, or (b) revert the file header."*

This prevents the engine from silently absorbing untracked external edits into the next amendment, which would corrupt the audit trail. If the triggering input also contains a T4 rule capture ("remember that..."), the rule is **queued** and not written to `RULES.md` until the drift is resolved.

### 4.6 Session Isolation (Phase Gates - C17)

To maintain maximum architectural integrity, the transition from **Specification** to **Task Planning** is protected by a **Hard Stop**.

1. **Brainstorming Focus**: All brainstorming and specification generation should occur in a single, continuous chat session to preserve the agent's understanding of the evolving idea.
2. **Phase Completion**: Once specifications are marked **Stable**, the agent is mandated to halt.
3. **Session Reset**: You must physically open a **New Chat** (using the IDE's "New Chat" button) before running `/magic.task`. This ensures the agent reads the committed specifications as the sole source of truth, without any "context bleed" from the previous brainstorming session.

### 4.7 T4 Rule Capture with Tier Routing

When user input during spec work contains a standing-rule signal ("remember that...", "project rule:", "from now on..."), the Spec workflow captures it as a T4 trigger and writes a new convention to `RULES.md`. Before writing, the engine applies three inline guards:

1. **Tier Routing**: Determines the correct target file — if the rule text contains workspace signal words ("in engine", "for installers") or the current workspace context is specific, the rule is written to `.design/{workspace}/RULES.md`. Universal rules go to `.design/RULES.md`. If ambiguous, the engine asks.
2. **Duplication Check**: Reads both global and workspace `RULES.md` files. If the proposed rule semantically overlaps with any existing convention, the engine surfaces the overlap and asks: merge, replace, or add separately.
3. **Constitutional Guard**: If the proposed rule contradicts §1–6 of the Constitution → **HALT**.

These guards match the safety level of the dedicated [Rule Workflow](rule.md) while preserving T4's "Apply Immediately" semantics — the rule and spec update are grouped in a single atomic proposal.

### 4.3 Periodic Audit

The engine proactively suggests "Registry Audits" to identify dead links, duplicated requirements across files, or "stale" specs.

### 4.4 Quarantine Cascade (C12)

This is a critical safety mechanism:

- If a **Layer 1 (Concept)** specification drops its status (e.g., from *Stable* to *RFC*), all dependent **Layer 2 (Implementation)** specifications are automatically **Quarantined** (downgraded).
- This ensures that implementation plans are never built on top of shifting conceptual foundations.

## 5. Directory Structure & Registries

- `.design/specifications/*.md`: The individual specification files.
- `.design/INDEX.md`: The central registry tracking versions, statuses, and layers of all specs.
- `.design/RULES.md`: The project constitution that governs how specifications are written and updated.

## 6. Maintenance

- **Version Bumping**: Specs use Semantic Versioning (Major.Minor.Patch). Minor bumps for requirement additions; Major for breaking architectural changes; Patch for typos.
- **Document History**: Every change must be recorded in the file's internal history table.
- **Delta Edits**: Large specs are updated surgically to minimize context overhead.
- **Structural Refactor**: When merging or splitting specifications, the agent performs a **Refactoring Sweep**, updating all task mappings (T-IDs) in `TASKS.md` to ensure no work is lost.

## Sync Note

Synchronized with engine workflows on 2026-03-31 (v1.5.134).
