---
description: Workflow for analyzing existing projects and generating initial specifications.
---

# Project Analysis & Ventilation Workflow

Audits project health, syncs registries, and reverse-engineers code into `.design/` spec proposals.

**Triggers**: `/magic.analyze [workspace]`, "Ventilate", "Analyze project", "Scan project", "Re-analyze"
**Examples**: `/magic.analyze`, `/magic.analyze engine`, `/magic.analyze installers`

## Core Invariants (Mandatory)

1. **Context**: Resolve target workspace via the priority chain below. Route all logic to `.design/{workspace}/`.
2. **Read-Only**: Proposals only. Never modify project code or `.design/` without user approval.
3. **Artifact-First**: Write proposals/reports to agent artifacts. Only dispatch to `.design/` after approval.
4. **Bootstrapping Exemption**: Approved specs from existing code can be created directly as **Stable** L1/L2.
5. **Depth Control (Safety)**: Before scanning:
    - **<50 files**: Auto-scan.
    - **50-500 files**: Ask: Full or Focused?
    - **>500 files**: Recommend Focused/Quick. HALT for user choice.
6. **Versioning (C14)**: If `.magic/` modified → `node .magic/scripts/executor.js update-engine-meta --workflow analyze` (Smart History: redundant automated entries are skipped).

## Workspace Resolution

| Priority | Source | Condition | Action |
| :---: | :--- | :--- | :--- |
| 1 | **Explicit arg** | `/magic.analyze {workspace}` | Use it. Overrides `MAGIC_WORKSPACE` if both set. If name not in `workspace.json` → **HALT**: "Unknown workspace '{x}'. Available: [{list}]." |
| 2 | **`MAGIC_WORKSPACE`** | Env var set | Use it. If value not in `workspace.json` → **HALT**: "Unknown workspace '{x}'. Available: [{list}]." |
| 3 | **`workspace.json`** | Single workspace | Use it silently. |
| 3 | **`workspace.json`** | Multiple + `default` set | Use default. Print: "Active workspace: {default}." |
| 3 | **`workspace.json`** | Multiple + no `default` | **Ask**: "Which workspace to analyze? [{list}]" |
| 4 | **No `workspace.json`** | — | Use root `.design/`. Log: "No workspace config found — scanning root .design/." |

> **Scope Auto-Apply**: After workspace is resolved, apply its `scope` array from `workspace.json` as the scan boundary (equivalent to `MAGIC_WORKSPACE_SCOPE`). If the workspace has no `scope` field, scan the full project.

## Operational Logic: Scan & Infer

### 1. Stack & Structure

Identify tech stack via config files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, etc.). Build a high-level map using `list_dir` (depth 2-3).
**Isolation (C15)**: If `MAGIC_WORKSPACE_SCOPE` is defined, restrict scanning strictly to the specified directory paths.

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
4. **Registry Healing Guard**: If `INDEX.md` is blank/corrupted or mismatches the content of `specifications/` (Ghost/Zombie entries) → Prioritize **Registry Healing**: automatically re-map disk files to the registry and fix orphan paths before proposing new content.

### [Mode B] Re-Analysis (Delta Mode)

*Trigger: INDEX.md has active specs.*

1. Read existing specs; extract currently described paths/logic.
2. Scan actual project; build delta.
3. **Gap Report**:
    - **Covered**: Specs match code.
    - **Uncovered**: Code found without spec coverage.
    - **Orphaned**: Spec refers to deleted code.
    - **Drifted**: Spec structure differs from code.
    - **RESCUE (AOP)**: Similarity >80% → Propose rename/sync. If similarity <50% despite path correlation → Treat as **Uncovered** (New Spec) + **Orphaned** (Delete Old Spec).
    - **Logic Evolution**: If code structure/logic inside covered directories has significantly changed (e.g., new sub-modules, API schema shift) → **Propose Reality Sync**: Generate a structured diff or a "New Draft" version of the specification that reflects the actual codebase implementation.

### [Mode C] Project Ventilation

*Trigger*: `/magic.analyze [workspace]`, "Ventilate [workspace]"
*Examples*: `/magic.analyze`, `/magic.analyze installers`, "Ventilate installers"

> **Mode Precedence**: When `/magic.analyze` is triggered and `INDEX.md` is empty, run Mode C first (self-check + registry audit). After the Mode C report is delivered, offer to continue with Mode A (first-time analysis) to generate initial spec proposals. Do NOT auto-start Mode A — the user may only want the audit.
> **Audit Policy**: This mode collects ALL issues (Drift, Gaps, Violations) before reporting. Bypassed HALT conditions in this mode: `checksums_mismatch`, Existence Guard, `VERSION_DRIFT`, C12 Quarantine. Report-delivery is the only HALT point.

1. **Self-Check**: Compare `.magic/` vs `.checksums`. (Non-halting audit).
2. **Registry Audit**: Cross-reference `INDEX.md` list vs actual files in `specifications/`.
3. **Coverage Check**: Scan project directories *within the active workspace scope (C15)*. Identify folders with NO corresponding spec file (Gap Report).
    - **RESCUE (AOP)**: For each orphaned spec + uncovered directory pair, check name/path similarity. If >80%, classify as `RESCUE` (rename opportunity) instead of separate Gap + Orphan entries.
4. **Rule Validation**: Check `RULES.md §7` compliance (e.g., C15 adapter registry check).
5. **Auto-Repair suggest**: Suggest commands for missing specs, registry cleanup, or **Task Sync** (if C12 quarantine is triggered).
6. **Report**: Consolidated list of errors, warnings, and suggested repairs.

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
    - **Actionable Outcome**: After silent dispatch, show: `[Auto-Analyze] {N} specs proposed and created as Stable.`

## Task Completion Checklist

```
Analysis Checklist — Mode A/B
  ☐ Depth Control obeyed; size-assessed before scanning
  ☐ Stack/Arch inferred; modules identified
  ☐ Mode correct (Analysis vs Re-Analysis Gap Report)
  ☐ RESCUE logic applied for renamed directories
  ☐ Dispatch: approved items created as Stable; RULES.md §7 updated
  ☐ Engine Meta: C14 bump if .magic/ files modified

Analysis Checklist — Mode C: Ventilation
  ☐ Self-check complete: engine integrity status noted (non-halting)
  ☐ Registry audit: orphans and unregistered files identified
  ☐ Coverage check: gaps and RESCUE opportunities reported (scope-bounded by C15)
  ☐ Rule validation: RULES.md §7 compliance checked
  ☐ Report delivered: all findings consolidated before any HALT
  ☐ Engine Meta: C14 not triggered (Mode C is read-only — C1 §7)
```
