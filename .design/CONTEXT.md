# Project Context

**Generated:** 2026-02-23

## Active Technologies

Refer to Architecture and Plan for the technology stack. Extracted from PLAN.md.

## Core Project Structure

```plaintext
  - .agent/
  - .design/
  - .magic/
  - docs/
  - installers/
    - workflows/
    - specifications/
    - tasks/
    - scripts/
    - node/
    - python/
```

## Recent Changes

**Status:** Accumulating

## Phase 1 — Foundation

- Added Handoff Integrations schema and fields to workflow templates (`magic.specification`, `magic.plan`, `magic.task`, `magic.rule`).
- Created `check-prerequisites.sh` parsing `INDEX.md` and returning valid JSON results.
- Created `check-prerequisites.ps1` functionally identical parity script returning JSON.

## Phase 2 — Core Engine Upgrades

- **Task Engine Enhancement:** Integrated User Stories generation parsing into `.magic/task.md` and suppressed user priority prompts using `RULES.md C4`.
- **System Automation Hooks:** Added `generate-context` script hooks into `plan.md` and `task.md` post-write triggers.
- **Context Automation Script:** Created `generate-context.sh` and `generate-context.ps1` to assemble `CONTEXT.md` from PLAN, workspace trees, and changelogs.
- **Spec Engine Protections:** Added strict Explore Mode Safety rules and Delta Editing constraints for spec updates over 200 lines to `.magic/specification.md`.
- **Explore Hints:** Updated `.agent/workflows/magic.specification.md` UI wrapper with tips to use Delta Constraints and strict read-only explore mode.
