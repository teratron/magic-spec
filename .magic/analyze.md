---
description: Workflow for analyzing existing projects and generating initial specifications.
---

# Project Analysis Workflow

Reverse-engineers code into `.design/` spec proposals. Delegated from `spec.md`.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Auto-resolve workspace via `.design/workspace.json`. Route all logic to `.design/{workspace}/`. Never ask.
2. **Read-Only**: Proposals only. Never modify project code or `.design/` without user approval.
3. **Artifact-First**: Write proposals/reports to agent artifacts. Only dispatch to `.design/` after approval.
4. **Bootstrapping Exemption**: Approved specs from existing code can be created directly as **Stable** L1/L2.
5. **Depth Control (Safety)**: Before scanning:
    - **<50 files**: Auto-scan.
    - **50-500 files**: Ask: Full or Focused?
    - **>500 files**: Recommend Focused/Quick. HALT for user choice.
6. **Versioning (C14)**: If `.magic/` modified → `node .magic/scripts/executor.js update-engine-meta --workflow analyze` (Smart History: redundant automated entries are skipped).

## Operational Logic: Scan & Infer

### 1. Stack & Structure

Identify tech stack via config files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, etc.). Build a high-level map using `list_dir` (depth 2-3).

### 2. Architecture Inference

| Pattern | Indicators |
| :--- | :--- |
| **MVC** | `controllers/`, `models/`, `views/` |
| **Clean** | `domain/`, `application/`, `infrastructure/` |
| **Feature** | `features/`, `modules/` |
| **Monorepo** | `packages/`, `apps/`, workspace configs |
| **API** | `routes/`, `handlers/`, `middleware/` |
| **UI** | `components/`, `pages/`, `hooks/` |

### 3. Module & Convention detection

Group code by domain. Extract implicit rules from configs (`.eslintrc`, `tsconfig.json`, `ruff`, etc.) for `RULES.md §7`.

## Modes: Analysis vs. Re-Analysis

### [Mode A] First-Time Analysis

*Trigger: INDEX.md is empty.*

1. Build full project map.
2. Inferred stack + architecture style.
3. **Proposal**: Table of paired L1/L2 specs + RULES.md entries.
4. **Ghost Registry Guard**: If `specifications/` is NOT empty but `INDEX.md` is blank → Prioritize **Registry Repair** (Map files to registry) before proposing new content.

### [Mode B] Re-Analysis (Delta Mode)

*Trigger: INDEX.md has active specs.*

1. Read existing specs; extract currently described paths/logic.
2. Scan actual project; build delta.
3. **Gap Report**:
    - **Covered**: Specs match code.
    - **Uncovered**: Code found without spec coverage.
    - **Orphaned**: Spec refers to deleted code.
    - **Drifted**: Spec structure differs from code.
    - **RESCUE (AOP)**: Similarity >80% → Propose rename/sync instead of delete/create.

## Reporting & Dispatch

### Proposal Template (Artifact)

- **Stack/Arch**: Detected style + confidence.
- **Spec Matrix**: `# | Proposed Spec | Layer | Based On`.
- **Rules Matrix**: `# | Convention | Source`.

### Dispatch Logic (Approved)

1. **Specs**: Call `spec.md` "Creating a New Specification" (direct to Stable).
2. **Rules**: Apply via T4 protocol to `RULES.md §7`.
3. **Dispatch**:
    - Registry Sync: Update `INDEX.md`. Bump Registry version.
    - Post-Update Review: Run on all created specs before closing.
    - Context Regeneration: Run `node .magic/scripts/executor.js generate-context`.

## Task Completion Checklist

```
Analysis Checklist — {mode}
  ☐ Depth Control obeyed; size-assessed before scanning
  ☐ Stack/Arch inferred; modules identified
  ☐ Mode correct (Analysis vs Re-Analysis Gap Report)
  ☐ RESCUE logic applied for renamed directories
  ☐ Dispatch: approved items created as Stable; RULES.md §7 updated
  ☐ Engine Meta: C14 bump if .magic/ files modified
```
