# Implementation Plan

**Version:** 1.2.0
**Generated:** 2026-02-25
**Based on:** .design/INDEX.md v1.20.0
**Status:** Active

## Overview

Implementation plan derived from project specifications.
Specs are the source of truth. To update: *"Update plan"*.

## Dependency Graph

```mermaid
graph TD
    %% Phase 1
    architecture --> cli-installer
    architecture --> distribution-npm
    architecture --> distribution-pypi
    architecture --> agent-environments
    
    %% Phase 2
    cli-installer --> installer-features
    
    %% Phase 3
    workflow-enhancements-3.3 --> workflow-enhancements-3.7
    workflow-enhancements-3.1
    workflow-enhancements-3.2
    workflow-enhancements-3.4
    workflow-enhancements-3.5
    workflow-enhancements-3.6
    workflow-enhancements-3.8
```

## Critical Path

`workflow-enhancements.md §3.3` → `workflow-enhancements.md §3.7`

## Phase 1 — Foundation & Distribution

*Specs with no dependencies. Consolidation of root-as-source-of-truth.*
*(All tasks completed and archived)*

## Phase 2 — Multi-Environment & Advanced Features

*Workflow logic, agent adapters, and installer reliability.*
*(All tasks completed and archived)*

## Phase 3 — Release Readiness & Documentation

*Changelog automation and unified documentation strategy.*
*(All tasks completed and archived)*

## Backlog
<!-- Registered specifications waiting for prioritization -->
- *(None)*

## Archived

- **Root Architecture** ([architecture.md](specifications/architecture.md)) — `Stable ✓`
- **CLI Installer Core** ([cli-installer.md](specifications/cli-installer.md)) — `Stable ✓`
- **Distribution: npm** ([distribution-npm.md](specifications/distribution-npm.md)) — `Stable ✓`
- **Distribution: PyPI** ([distribution-pypi.md](specifications/distribution-pypi.md)) — `Stable ✓`
- **Agent Environment Adapters** ([agent-environments.md](specifications/agent-environments.md)) — `Stable ✓`
- **Installer Features** ([installer-features.md](specifications/installer-features.md)) — `Stable ✓`
- **Two-Level Changelog Generation** ([changelog.md](specifications/changelog.md)) — `Stable ✓`
- **README Content Strategy** ([readme-strategy.md](specifications/readme-strategy.md)) — `Stable ✓`
- **Secrets Management** ([secrets-management.md](specifications/secrets-management.md)) — `Deprecated`
- **Handoff integrations** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **CLI Prerequisite Validation Scripts** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **User Story Scope Boundaries** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **Auto-Generated Context File** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **Explore Mode & Delta Hints** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **CLI Doctor Command** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`
- **Interactive Onboarding Workflow** ([workflow-enhancements.md](specifications/workflow-enhancements.md)) — `Stable ✓`

## Plan History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Agent | Initial plan for workflow enhancements |
| 1.1.0 | 2026-02-25 | Agent | Synchronized with INDEX.md v1.19.0; added all RFC specifications |
| 1.1.1 | 2026-02-25 | Agent | Added secrets-management (Deprecated) to Archived to fix orphaned spec warning |
| 1.2.0 | 2026-02-25 | Agent | Moved all RFC specifications to Archived as Stable; bumped version to sync with INDEX v1.20 |
