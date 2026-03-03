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

## Invariants

- **C1**: Kernel integrity (checksums).
- **C14**: Automatic meta-updates on engine changes.
- **C21**: Project ventilation for consistency.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing core). |
