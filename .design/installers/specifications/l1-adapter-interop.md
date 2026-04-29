> [!WARNING]
> **Status: Deprecated** — Superseded by GitHub manual distribution (v2.0.0).
> This specification is preserved for historical reference only.

# Adapter Interoperability Specification

## Overview

Standards for integrating Magic SDD with various AI IDEs and agents.

## Motivation

Enable seamless workflow support across different tools (Cursor, Copilot, etc.) using a unified registry.

## Registry

- **File**: `installers/adapters.json`.
- **Fields**:
  - `marker`: Path to identify the IDE presence.
  - `dest`: Target directory for rule deployment.
  - `ext`: File extension (e.g., `.mdc`, `.md`).

## Protocols

- **C15**: All new adapters must be registered in the JSON registry.
- **Atomic Deployment**: Adapters are deployed during initial installation or update.

## Canonical References

| Path | Role |
| :--- | :--- |
| `installers/adapters.json` | IDE adapter registry (single source of truth) |
| `installers/node/index.js` | Adapter detection and deployment logic |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing adapters). |