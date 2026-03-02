# Specification: Focused Workspace Scoping

**Version:** 1.0.0
**Status:** Stable
**Layer:** 1 (Concept)

## Overview

Defined boundaries for analysis within a project workspace to prevent token waste and improve scan accuracy.

## Motivation

In large repositories or monorepos, a global scan (`magic.analyze`) is often redundant. Scoping allows focusing on the relevant code for each workspace.

## Details

- `workspace.json` receives a new `scope` field (string array).
- If `scope` is present, `magic.analyze` only scans these paths.
- Default: If `scope` is missing, full repository is scanned.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-03-02 | Antigravity | Initial concept |
