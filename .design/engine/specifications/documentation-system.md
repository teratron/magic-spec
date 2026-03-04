# Documentation System Specification

## Overview

Structure and governance of the Magic Spec knowledge base.

## Motivation

Provide clear guidance for both engine developers and end-users.

## Structure

- **README.md**: Entry point and overview.
- **docs/**: Detailed guides for each workflow.
- **CHANGELOG.md**: History of meaningful changes.

## Maintenance

Documents in `docs/` must stay synchronized with the active workflows in `.magic/`. Synchronization is enforced by the Project Ventilation workflow (C21): when `/magic.analyze` is run, any `docs/` file whose last-modified timestamp predates the corresponding `.magic/` workflow file is flagged as a **VIO-2 (Documentation Drift)** violation.

### Sync Scope

Each `.magic/{workflow}.md` has a corresponding `docs/{workflow}.md` counterpart that describes the same workflow for human readers. When a guard, invariant, or behavioral rule is added to a `.magic/` workflow, the matching `docs/` file must be updated in the same repair cycle.

Files currently in scope: `spec.md`, `run.md`, `task.md`, `simulate.md`, `analyze.md`, `init.md`, `onboard.md`, `rule.md`, `retrospective.md`.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.1.0 | 2026-03-04 | Agent | Added sync enforcement rule (C21 VIO-2), sync scope table, and docs/ governance detail. |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
