# Phase 1 — Foundation & Distribution

**Status:** Active

## Track A: Node.js Installer & Distribution

### [T-1A02] Create Node package.json with build/sync scripts

- **Spec:** distribution-npm.md §3.2, §3.6
- **Status:** Done
- **Assignee:** Agent

### [T-1A03] Implement assembly logic in installers/node/

- **Spec:** distribution-npm.md §3.1
- **Status:** Done
- **Assignee:** Agent

### [T-1A04] Audit and harden installers/node/index.js

- **Spec:** cli-installer.md
- **Status:** Done
- **Assignee:** Agent

## Track B: Python Installer & Distribution

### [T-1B03] Create pyproject.toml with shared-data config

- **Spec:** distribution-pypi.md §3.2
- **Status:** In Progress
- **Assignee:** Agent

### [T-1B04] Implement sync scripts for Python installer

- **Spec:** distribution-pypi.md §3.1, §3.8
- **Status:** In Progress
- **Assignee:** Agent

## Track C: Architecture Audit

### [T-1C01] Audit root structure vs architecture.md

- **Spec:** architecture.md
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Audit complete. Discrepancies found: `adapters/` missing, `package.json`/`pyproject.toml` in root instead of `installers/`. Fixes planned in T-1A02, T-1B03. Created `adapters/` folder.
