> [!WARNING]
> **Status: Deprecated** — Superseded by GitHub manual distribution (v2.0.0).
> This specification is preserved for historical reference only.

# Python Installer Specification

## Overview

Python implementation of the Magic Spec installer.

## Motivation

Provide a native installation path for Python/Data Science environments via `pip`, `uv`, or `pipx`.

## Implementation

- **Entry Point**: `installers/python/magic_spec/__main__.py`.
- **Build System**: Hatchling.
- **Distribution**: PyPI.

## Canonical References

| Path | Role |
| :--- | :--- |
| `installers/python/magic_spec/__main__.py` | Python installer entry point |
| `installers/python/magic_spec/__init__.py` | Package version declaration |
| `pyproject.toml` | Build configuration and version |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |