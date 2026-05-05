# Analyze — Project Analysis Workflow

This document explains the Project Analysis workflow for auditing project health and bootstrapping specifications from existing code.

## 1. Overview

The Analyze workflow bridges the gap between an existing project and the SDD system. It scans the codebase, generates specification proposals, and performs deep audits of registry integrity and spec-to-code coverage.

**Triggers:** *"Ventilate"*, *"Analyze project"*, *"Scan project"*, *"Re-analyze"*, *"What does this project do?"*, *"Generate specs from code"*

**Slash command:** `/magic.analyze [arg]`

> **Full implementation:** `.magic/analyze.md` — the engine reads this file before executing any steps.

Key Goals:

- **Discovery**: Automatically detect tech stack, architecture, and key modules from existing code.
- **Bootstrapping**: Generate initial Layer 1/L2 specification proposals based on actual project structure.
- **Re-Analysis**: Compare evolved code against existing specs to find coverage gaps and drift.
- **Ventilation**: Deep audit of registry integrity, structural consistency, and engine health.
- **Safety**: All analysis output is a proposal — no live `.design/` files are modified until explicitly approved.

## 2. Core Invariants

The engine enforces 8 mandatory invariants during every analysis:

| # | Invariant | Summary |
| ---: | :--- | :--- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Auto-Init** | Silently creates `.design/` structure if missing |
| 3 | **Read-Only** | Proposals only; never modify project code or `.design/` without user approval |
| 4 | **Artifact-First** | Write proposals/reports to agent artifacts; dispatch to `.design/` only after approval |
| 5 | **Bootstrapping Exemption** | Approved specs from existing code can be created directly as Stable L1/L2 |
| 6 | **Depth Control** | <50 files: auto-scan; 50–500: ask Full/Focused; >500: recommend Focused/Quick |
| 7 | **Gitignore Safety** | Read `.gitignore` before any scan; exclude matched paths from all analysis modes |
| 8 | **Engine Integrity (C14)** | Checksums validated and updated after any `.magic/` modification |

## 3. Argument Routing

| Input | Mode | Behavior |
| :--- | :--- | :--- |
| *(empty)* | Full | Mode C (Ventilation) → Mode A or B depending on INDEX.md state |
| `{workspace}` | Workspace | Mode C with Structural Integrity, scoped to workspace |
| `"text"` | Focused (D) | Targeted analysis on a specific area/concern |
| `{workspace} "text"` | Workspace + Focus | Mode D scoped to workspace |

```
/magic.analyze                             # Full project audit
/magic.analyze engine                      # Scoped to "engine" workspace
/magic.analyze "check API coverage"        # Focused analysis on APIs
/magic.analyze docs "focus on examples"    # Focused analysis within workspace
```

> **Disambiguation**: If an unquoted word matches a workspace name, workspace takes priority. Wrap in quotes to force focus interpretation.

## 4. Analysis Modes

### Mode A — First-Time Analysis

*Trigger: INDEX.md is empty or has no registered specifications.*

Scans the codebase and generates specification proposals:

| Area | Method | Output |
| :--- | :--- | :--- |
| **Project Structure** | Directory tree scan (depth 2–3) | Project map |
| **Tech Stack** | Config file detection (`package.json`, `pyproject.toml`, etc.) | Stack summary |
| **Architecture** | Directory pattern matching (`controllers/`, `models/`, etc.) | Architecture style + confidence |
| **Modules** | Entry point analysis, import patterns | Module list with dependencies |
| **Conventions** | Linter/formatter configs, test patterns | RULES.md proposals |

Output: a **Proposal Document** with detected stack, proposed L1/L2 specs, RULES.md entries, and coverage summary. User reviews and chooses: approve all, select specific items, adjust, or cancel.

**Registry Healing**: If `INDEX.md` mismatches `specifications/` (ghost/zombie entries), registry healing is included as a mandatory part of the proposal.

### Mode B — Re-Analysis (Delta Mode)

*Trigger: INDEX.md has active specifications.*

Compares current codebase against existing specs to produce a **Gap Report**:

| Category | Description |
| :--- | :--- |
| **Covered** | Modules with matching specs |
| **Uncovered** | Code modules with no corresponding spec |
| **Orphaned** | Specs referencing code that no longer exists |
| **Drifted** | Specs whose described structure doesn't match current code |
| **Logic Evolution** | API/internal logic structurally drifted >30% from spec |

**RESCUE (AOP)**: Name or semantic similarity >80% → propose rename/sync instead of separate Gap + Orphan entries. Structural similarity <50% despite path correlation → treat as Uncovered + Orphaned.

### Mode C — Project Ventilation (Deep Audit)

*Trigger: `/magic.analyze`, `/magic.analyze {workspace}`, "Ventilate"*

A deep audit treating the codebase as source of truth:

1. **Self-Check**: Compare `.magic/` vs `.checksums` (non-halting audit).
2. **Registry Audit**: Cross-reference `INDEX.md` vs files on disk. Detect ghosts, zombies, case-sensitivity issues, metadata parity.
3. **Structural Integrity** (when workspace specified): Verify workspace folder, required contents, `workspace.json` entry, file naming, link integrity.
4. **Coverage Check**: Scan project directories within active workspace scope (C15). Identify folders with no corresponding spec.
5. **Documentation & Version Audit**: Check `CONTRIBUTING.md`, `README.md` version badge, version parity across manifests.
6. **Scope Blind-Spot Check** (multi-workspace): Report directories not covered by any workspace scope.
7. **Rule Validation**: Check `RULES.md §7` compliance.
8. **Report**: Consolidated list of errors, warnings, and suggested repairs.

> **Mode Precedence**: When `/magic.analyze` is triggered and INDEX.md is empty, Mode C runs first (audit), then offers to continue with Mode A (spec generation). Mode A is not auto-started.

### Mode D — Focused Analysis

*Trigger: Text argument provided (quoted string or non-workspace token).*

Narrow analysis targeted at a specific area:

1. Parse focus directive — extract intent (area, layer, concern).
2. Targeted scan — match keywords against folder names, spec titles, module names.
3. Focused Gap Report — same categories as Mode B but only for the matched area.

If no matches found → **HALT** with suggestion to narrow with a workspace or rephrase.

## 5. Pre-Advisory Audit (C24 — Auditor Persona)

Before generating recommendations, the engine adopts an **Auditor** persona to review all findings:

- **Severity Calibration**: Is each finding classified at the correct severity?
- **Systemic Pattern**: Do multiple findings point to a single root cause?
- **Blind Spots**: Are there directories that should have been flagged but weren't?

## 6. Advisory Report

Appended to every analysis report (Modes A–D). Chat-only output with actionable recommendations:

- **Spec Quality**: Oversized specs for splitting, incomplete stubs, bare L1 without L2 children.
- **Coverage Strategy**: High-churn directories without specs, test areas without suite specs.
- **Structural Improvements**: Workspace candidates, rule consolidation, naming inconsistencies.
- **Action Proposals**: Direct commands (e.g., `→ /magic.spec create {name}`) for immediate execution.

**Signal**: 🟢 = <5% uncovered/drift. 🔴 = any core engine drift or >25% project drift.

## 7. Workspace Targeting

Pass a workspace name as an argument to scope analysis. If no argument given, the workspace is resolved automatically via the standard priority chain.

**Workspace Scoping (C15)**: In multi-workspace environments, analysis strictly respects `scope` from `workspace.json`, ignoring files outside the defined scope.

## 8. Relationship to Other Workflows

| Workflow | Relationship |
| :--- | :--- |
| **Spec** (`spec.md`) | Partner — analysis results are dispatched via the Spec workflow |
| **Init** (`init.md`) | Predecessor — suggests analysis after first initialization |
| **Task** (`task.md`) | Successor — once specs are created, tasks can be planned |
| **Rule** (`rule.md`) | Consumer — detected conventions are proposed for RULES.md |

## Sync Note

Synchronized with engine workflows on 2026-05-05 (v2.0.23).
