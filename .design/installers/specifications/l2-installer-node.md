> [!WARNING]
> **Status: Deprecated** — Superseded by GitHub manual distribution (v2.0.0).
> This specification is preserved for historical reference only.

# Node Installer Specification

## Overview

Node.js implementation of the Magic Spec installer.

## Motivation

Provide a native installation path for JS/TS environments via `npm`/`npx`.

## Implementation

- **Entry Point**: `installers/node/index.js`.
- **Package Manager**: npm.
- **Payload Handling**: Uses native `tar` or `node-tar` to extract the engine.

## Canonical References

| Path | Role |
| :--- | :--- |
| `installers/node/index.js` | Node.js installer implementation |
| `package.json` | npm package manifest and version |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |