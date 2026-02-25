# Master Task List

**Execution Mode:** Parallel

| Phase | Total | Todo | In Progress | Done | Blocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Phase 1 | 6 | 0 | 0 | 6 | 0 |
| Phase 2 | 7 | 5 | 0 | 2 | 0 |
| Phase 3 | 5 | 0 | 0 | 5 | 0 |

## Phase 1 — Foundation & Distribution

**Track A:** Node.js Installer & Distribution

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-1A02] | Create Node package.json with build/sync scripts | Done | Agent |
| [T-1A03] | Implement assembly logic in installers/node/ | Done | Agent |
| [T-1A04] | Audit and harden installers/node/index.js | Done | Agent |

**Track B:** Python Installer & Distribution

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-1B03] | Create pyproject.toml with shared-data config | In Progress | Agent |
| [T-1B04] | Implement sync scripts for Python installer | In Progress | Agent |

**Track C:** Architecture Audit

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-1C01] | Audit root structure vs architecture.md | Done | Agent |

## Phase 2 — Multi-Environment & Advanced Features

**Track A:** Adapters & Templates

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-2A03] | Implement template resolution in Node CLI | Done | Agent |
| [T-2A04] | Implement template resolution in Python CLI | Done | Agent |

**Track B:** Core Reliability

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-2B01] | Implement version tracking (.magic/.version) | Todo | Agent |
| [T-2B02] | Implement info and --check commands | Todo | Agent |
| [T-2B03] | Implement --list-envs command | Todo | Agent |

**Track C:** Safety & UX

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-2C01] | Implement --eject and backup logic | Todo | Agent |
| [T-2C02] | Implement .magicrc persistence & auto-detect | Todo | Agent |
| [T-2C03] | Implement conflict detector (.magic/.checksums) | Todo | Agent |

## Phase 3 — Release Readiness & Documentation

**Track A:** Changelog Automation

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-3A01] | Implement Level 1 Changelog (phase append) | Done | Agent |
| [T-3A02] | Implement Level 2 Changelog (release compile) | Done | Agent |

**Track B:** Unified Documentation

| ID | Title | Status | Assignee |
| :--- | :--- | :--- | :--- |
| [T-3B01] | Update repository root README.md | Done | Agent |
| [T-3B02] | Update Node installer README.md | Done | Agent |
| [T-3B03] | Update Python installer README.md | Done | Agent |
