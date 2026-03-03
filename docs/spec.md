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

Before any implementation plan is generated, the `magic.spec` workflow verifies that all paths and structures described in specifications actually match the current project state on disk.

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
