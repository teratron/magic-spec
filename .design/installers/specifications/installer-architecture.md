# Installer Architecture Specification

## Overview

Thin-client architecture for delivering the Magic SDD engine to target projects.

## Motivation

Keep the core engine decoupled from installer logic and ensure secure, versioned delivery.

## Architecture

### Thin-Client Principles

1. **Payload Isolation**: The installer is a wrapper, the engine is a payload.
2. **Atomic Deployment**: All files are extracted or none.
3. **Smart Update**: Preserve `.design/` (project data) while updating `.magic/` (engine logic).

## Security

- Checksum verification of the downloaded tarball.
- Path traversal prevention during extraction.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing installers). |
