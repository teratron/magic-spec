# Engine Automation Specification

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

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.2.0 | 2026-03-20 | Agent | Added generate-context.js to Components; fixed engine file count reference. |
| 1.1.0 | 2026-03-04 | Agent | Added History Subsystem and Engine Meta Update Flow sections. |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing scripts). |
