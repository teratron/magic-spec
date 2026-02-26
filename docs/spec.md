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

## 3. Status Lifecycle

Specifications move through a strict lifecycle to ensure quality and maturity:

1. **Draft**: Initial exploration and drafting.
2. **RFC (Request for Comments)**: Completed design ready for team/user review.
3. **Stable**: Approved design; implementation can now be planned.
4. **Deprecated**: Superseded or removed functionality, kept for history.

## 4. Automation & Workflows

### 4.1 Dispatching from Raw Input

The engine automatically parses unstructured user chat ("I want a login page") and maps it to specific domains (UI, API, Architecture) before suggesting updates to existing or new spec files.

### 4.2 Consistency Check (Pre-flight)

Before any implementation plan is generated, the `magic.spec` workflow verifies that all paths and structures described in specifications actually match the current project state on disk.

### 4.3 Periodic Audit

The engine proactively suggests "Registry Audits" to identify dead links, duplicated requirements across files, or "stale" specs that haven't been updated in a long time.

## 5. Directory Structure & Registries

- `.design/specifications/*.md`: The individual specification files.
- `.design/INDEX.md`: The central registry tracking versions, statuses, and layers of all specs.
- `.design/RULES.md`: The project constitution that governs how specifications are written and updated.

## 6. Maintenance

- **Version Bumping**: Specs use Semantic Versioning (Major.Minor.Patch).
- **Document History**: Every change must be recorded in the file's internal history table.
- **Delta Edits**: Large specs are updated surgically to minimize context overhead.
