# Node Installer Specification

## Overview

Node.js implementation of the Magic Spec installer.

## Motivation

Provide a native installation path for JS/TS environments via `npm`/`npx`.

## Implementation

- **Entry Point**: `installers/node/index.js`.
- **Package Manager**: npm.
- **Payload Handling**: Uses native `tar` or `node-tar` to extract the engine.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
