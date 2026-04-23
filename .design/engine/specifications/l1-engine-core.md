# Engine Core Specification

## Overview

Definition of the Magic SDD core engine logic, workflows, and invariants.

## Motivation

To ensure a stable and predictable environment for specification-driven development across any project.

## Architecture

The engine consists of Markdown-based workflows (`.magic/*.md`) and a supporting automation layer.

### Core Workflows

- **init**: Bootstrapping `.design/`.
- **spec**: Managing the specification registry and lifecycle.
- **task**: Phasing and task generation.
- **run**: Implementation coordination.
- **simulate**: Verification and regression testing.
- **analyze**: Project ventilation, gap detection, and registry repair.
- **rule**: Convention management in `RULES.md §7`.
- **retrospective**: Phase and plan-level analysis and snapshots.

### Templates Subsystem

`.magic/templates/` contains the canonical file scaffolds used when creating new artifacts:

- **spec.md**: Standard full-spec template (required for specs ≥50 lines).
- **micro-spec.md**: Lightweight template for simple features or bugfixes (<50 lines). Promoted to standard template when the 50-line threshold is exceeded (C16).
- **plan.md**: PLAN.md scaffold.
- **tasks.md**: TASKS.md scaffold.
- **retrospective.md**: RETROSPECTIVE.md scaffold.

Template governance: workflows must always instantiate new files from these templates — never from inline content.

## Invariants

- **C1**: Kernel integrity (checksums).
- **C14**: Automatic meta-updates on engine changes.
- **C21**: Project ventilation for consistency.

## Runtime Guards (Sprint 1)

The following guards were added to the core workflows as part of the first reliability sprint:

- **RE-1 — Version Drift Detection** (`spec.md` Consistency Check): Compares each spec's `Version:` header against the `INDEX.md` entry. A mismatch raises a `VERSION_DRIFT` flag in the Consistency Report, indicating an external edit bypassed the amendment protocol.
- **RE-2 — Spec Stability Spot-Check** (`run.md` Pre-flight): Before execution begins, confirms every spec targeted by a `Todo` task in the current phase is still `Stable` in `INDEX.md`. Catches direct spec demotion that C12 cannot detect.
- **RE-3 — Version Drift Guard** (`spec.md` §Updating): When VERSION_DRIFT is detected on the target spec of an active update, the engine **HALTs** before writing. Prevents silent absorption of external edits and audit-trail corruption. T4 rules triggered during a VERSION_DRIFT HALT are queued, not written.
- **RE-T71 — Intent Preservation** (`task.md`): When `task.md` sub-delegates to `init.md` or `analyze.md`, the original user intent is memoized and restored after delegation resolves.
- **RE-T74 — Cross-Workspace Parity** (`task.md`): Pre-flight scans all registered workspaces for identically-named spec files. Version mismatch between copies triggers HALT with three resolution options.

## Canonical References

| Path | Role |
| :--- | :--- |
| `.magic/analyze.md` | Ventilation workflow |
| `.magic/spec.md` | Specification lifecycle workflow |
| `.magic/task.md` | Task orchestration workflow |
| `.magic/run.md` | Implementation execution workflow |
| `.magic/rule.md` | Convention management workflow |
| `.magic/init.md` | Bootstrap workflow |
| `.magic/context.md` | Workspace resolution logic |
| `.magic/scripts/executor.js` | Cross-platform script executor |
| `.magic/templates/` | Canonical artifact scaffolds |
| `.magic/.version` | Engine version pin |
| `.magic/.checksums` | Kernel integrity manifest |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.1.1 | 2026-03-20 | Agent | Fixed template naming: specification.md → spec.md to match disk. |
| 1.1.0 | 2026-03-04 | Agent | Added Templates subsystem, analyze/rule/onboard/retrospective workflow list, and Runtime Guards (RE-1 – RE-T74). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing core). |
