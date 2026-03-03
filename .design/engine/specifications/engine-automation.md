# Engine Automation Specification

## Overview

Implementation details of the Magic SDD automation scripts.

## Motivation

Automate repetitive tasks like checksum generation, versioning, and environment resolution.

## Components

- **executor.js**: Cross-platform wrapper for JS and Shell/PowerShell scripts.
- **check-prerequisites.js**: Validates engine integrity and project state.
- **generate-checksums.js**: Maintains `.magic/.checksums`.
- **init.js**: Scripted setup of the `.design/` directory.

## Logical Flows

### Zero-Prompt Resolution

1. Check `MAGIC_WORKSPACE` env.
2. Check `--workspace` flag.
3. Use `default` from `.design/workspace.json`.
4. Fallback to `.design/`.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing scripts). |
