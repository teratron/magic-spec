# Engine Automation Specification

**Version:** 1.4.1
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Implementation details of the Magic SDD automation scripts.

## Motivation

Automate repetitive tasks like checksum generation, versioning, and environment resolution.

## Components

- **executor.js**: Cross-platform wrapper for JS and Shell/PowerShell scripts.
- **check-prerequisites.js**: Validates engine integrity and project state.
- **generate-checksums.js**: Maintains `.magic/.checksums`.
- **generate-context.js**: Regenerates `CONTEXT.md` from current project state.
- **init.js**: Scripted setup of the `.design/` directory.
- **analyze-coverage.js**: Confidence Taxonomy engine — classifies project files by spec coverage confidence (EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED) using Canonical References from specifications.
- **extract-rationale.js**: Rationale Extraction engine — scans source code for design rationale markers (NOTE/WHY/HACK/etc.) and identifies Shadow Logic (uncovered design decisions).

## Logical Flows

### Zero-Prompt Resolution

1. Check `MAGIC_WORKSPACE` env.
2. Check `--workspace` flag.
3. Use `default` from `.design/workspace.json`.
4. Fallback to `.design/`.

### History Subsystem

Each workflow has a dedicated history file at `.magic/history/{workflow}.md`. The `update-engine-meta` command maintains these files under the **Smart History** rule:

- A new row is appended only when the engine version actually changes (i.e., a `.magic/` file was physically modified).
- **Redundant automated entries are skipped**: if the last history row was auto-generated for the same version range, no duplicate is written.
- Each history file records: version range (e.g., `1.4.9 – 1.4.108`), date, and change type.
- If a history file is missing when `update-engine-meta` runs, it is automatically created (**Auto-Heal**, C20).

### Engine Meta Update Flow (`update-engine-meta`)

1. Verify that a `.magic/` file was physically modified (checksum delta).
2. Increment patch version in `.magic/.version`.
3. Append row to `.magic/history/{workflow}.md` (Smart History dedup).
4. Regenerate `.magic/.checksums` across all tracked engine files.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/executor.js` | Cross-platform entry point for all automation |
| `.magic/scripts/check-prerequisites.js` | Pre-flight validation |
| `.magic/scripts/generate-context.js` | CONTEXT.md regeneration |
| `.magic/scripts/init.js` | `.design/` scaffold setup |
| `.magic/scripts/update-engine-meta.js` | Engine versioning and history update |
| `dev/scripts/update-project-meta.js` | Project metadata hygiene (dev-side, relocated from `.magic/scripts/` in engine v2.1.21) |
| `.magic/scripts/analyze-coverage.js` | Confidence Taxonomy coverage classification |
| `.magic/scripts/extract-rationale.js` | Rationale Extraction and Shadow Logic detection |
| `.magic/scripts/lib/` | Finalization helpers: changelog-writer, commit-suggester, git-utils, phase-archiver, project-version, significance |
| `.magic/.checksums` | Checksum manifest |
| `.magic/.version` | Current engine version |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.4.1 | 2026-06-10 | Agent | Fixed orphaned Canonical Reference: update-project-meta.js path updated to dev/scripts/ (script relocated in engine v2.1.21). |
| 1.4.0 | 2026-05-07 | Agent | Added header fields (Version/Status/Layer/Implements). Removed stale generate-checksums.js and .magic/history/ refs; replaced with .magic/scripts/lib/ coverage. |
| 1.3.0 | 2026-04-22 | Agent | Added analyze-coverage.js (Confidence Taxonomy) and extract-rationale.js (Rationale Extraction) to Components and Canonical References. |
| 1.2.0 | 2026-03-20 | Agent | Added generate-context.js to Components; fixed engine file count reference. |
| 1.1.0 | 2026-03-04 | Agent | Added History Subsystem and Engine Meta Update Flow sections. |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing scripts). |
