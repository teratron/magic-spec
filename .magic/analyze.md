---
description: Workflow for analyzing existing projects and generating initial specifications.
---

# Project Analysis & Ventilation Workflow

Audits project health, syncs registries, and reverse-engineers code into `.design/` spec proposals.

**Triggers**: `/magic.analyze [arg]`, "Ventilate", "Analyze project", "Scan project", "Re-analyze"
**Examples**: `/magic.analyze`, `/magic.analyze engine`, `/magic.analyze "check API coverage"`, `/magic.analyze installers "focus on tests"`

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Apply the full workspace resolution chain from [context.md](context.md) (Priority 1-4, Disambiguation, Scope Auto-Apply).
2. **Auto-Init**: If `.design/` or system files missing, silently execute `.magic/init.md` (do not prompt user).
3. **Read-Only**: Proposals only. Never modify project code or `.design/` without user approval.
4. **Artifact-First**: Write proposals/reports to agent artifacts. Only dispatch to `.design/` after approval.
5. **Bootstrapping Exemption**: Approved specs from existing code can be created directly as **Stable** L1/L2.
6. **Depth Control (Safety)**: Before scanning:
    - **<50 files**: Auto-scan.
    - **50-500 files**: Ask: Full or Focused?
    - **>500 files**: Recommend Focused/Quick. HALT for user choice.
7. **Gitignore Safety (Invariant 8)**: If `.gitignore` exists in the project root or active workspace, the agent MUST read and apply its patterns before any scan. Files and directories matching these patterns (e.g., `node_modules/`, `.venv/`, `dist/`) are strictly out-of-scope for all analysis modes (A-D) and Project Ventilation (Mode C).
8. **Engine Integrity (C14)**: If engine files (`.magic/`) modified → `node .magic/scripts/executor.js update-engine-meta --workflow analyze` (Smart History: redundant automated entries are skipped).

## Argument Routing

Parse the `[arg]` to determine the analysis mode:

| Input | Detection | Result |
| :--- | :--- | :--- |
| *(empty)* | No argument | **Full Analysis**: Resolve workspace via §Workspace Resolution, then Mode C → A/B |
| `engine` | Matches a workspace name in `workspace.json` | **Workspace Analysis**: Mode C (with Structural Integrity) → A/B scoped to that workspace |
| `"check API coverage"` | Quoted text or text that does NOT match any workspace name | **Focused Analysis**: Mode D — interpret text as focus directive |
| `engine "focus on tests"` | First token is workspace + remaining is quoted text | **Workspace + Focus**: Mode D scoped to workspace |

> **Disambiguation**: If the argument is a single unquoted word that matches both a workspace name and could be a focus keyword, workspace takes priority. To force focus interpretation, wrap in quotes: `/magic.analyze "engine"`.

## Workspace Resolution

> See [context.md](context.md) for the full resolution chain (Priority 1-4, Disambiguation, Scope Auto-Apply).
> After resolution, the workspace's `scope` array from `workspace.json` is applied as the scan boundary (equivalent to `MAGIC_WORKSPACE_SCOPE`). If the workspace has no `scope` field, scan the full project.

## Operational Logic: Scan & Infer

### 1. Stack & Structure

Identify tech stack via config files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, etc.). Build a high-level map using directory listing (depth 2 by default; extend to depth 3 only for monorepo root directories with nested `packages/` or `apps/`).
**Gitignore Filtering**: Apply Invariant 8 filters *before* building the map to ensure build artifacts and ignored dependencies do not leak into the architecture inference or coverage check.
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

## Confidence Taxonomy

Coverage classification uses a four-level confidence taxonomy (inspired by knowledge-graph confidence scoring) to provide a nuanced view of spec-to-code traceability:

| Level | Meaning | Source |
| :--- | :--- | :--- |
| **EXTRACTED** | File path is explicitly listed in a spec's `Canonical References` table | Direct reference |
| **INFERRED** | File is a sibling of explicitly referenced paths (same parent directory) | Structural proximity |
| **AMBIGUOUS** | File is in a scope-adjacent directory (same grandparent) but has no direct reference | Weak association |
| **UNCOVERED** | No specification references this file or its containing directory | No coverage |

**Usage**: Run `node .magic/scripts/executor.js analyze-coverage --json` for structured output. The agent should use this data to enrich Gap Report entries in Modes B/C with confidence labels instead of binary Covered/Uncovered classification.

**Coverage metric**: `coverage_percent = (EXTRACTED + INFERRED) / total * 100`. AMBIGUOUS files are explicitly excluded — they require human review to determine if a spec should cover them.

## Rationale Extraction

Source code often contains design rationale in structured comments that may not be captured in formal specifications. The Rationale Extraction system scans for these patterns and identifies "Shadow Logic" — design decisions documented only in code.

### Supported Markers

| Marker | Purpose |
| :--- | :--- |
| `NOTE` | General design notes |
| `WHY` | Explanation of a design choice |
| `HACK` | Known workaround or compromise |
| `IMPORTANT` | Critical implementation detail |
| `TODO` | Planned future work |
| `FIXME` | Known issue requiring attention |
| `SAFETY` | Security or safety consideration |
| `WARN` | Warning about side effects |
| `PERF` | Performance-related decision |

**Usage**: Run `node .magic/scripts/executor.js extract-rationale --json` for structured output. Comments are matched in Python (`# MARKER:`), JS/TS/Go/Rust/C (`// MARKER:`), Shell, and PowerShell files.

**Shadow Logic**: Rationale comments found in files NOT covered by any spec's Canonical References. These represent design decisions that should be formalized into specifications.

## Modes: Analysis vs. Re-Analysis

### [Mode A] First-Time Analysis

*Trigger: INDEX.md is empty.*

0. **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json`.
    - `ok: true` → proceed.
    - `ENGINE_INTEGRITY` or `GHOST_REGISTRY` warnings → **C15 Filter** (see `init.md` §1). If in-scope → **HALT**: "Registry/engine integrity failure. Run `magic.spec --audit` or `update-engine-meta` to resolve." If out-of-scope → proceed silently.
    - Missing `.design/` → silently execute `.magic/init.md` (do not prompt user), then resume.
    - Unrecognized failure (`ok: false` with no matching category above) → **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually."
    - Apply Depth Control (Invariant 6): count source files and HALT per thresholds before scanning.
1. Build full project map.
2. Inferred stack + architecture style.
3. **Proposal**: Table of paired L1/L2 specs + RULES.md entries. Present with explicit options: **(a) Approve all** — dispatch all proposed specs and rules, **(b) Select** — user picks individual items to approve, **(c) Adjust** — user requests modifications to the proposal, **(d) Cancel** — discard the proposal entirely. Wait for user choice before proceeding.
4. **Registry Healing Proposal**: If `INDEX.md` is blank/corrupted or mismatches `specifications/` (Ghost/Zombie entries) → Include **Registry Healing** (re-mapping disk files) as a mandatory part of the unified proposal in Step 3. Do NOT execute healing until the full proposal is approved.
5. **Advisory**: Generate Advisory Report (see §Advisory Report) for the analyzed scope.

### [Mode B] Re-Analysis (Delta Mode)

*Trigger: INDEX.md has active specs.*

0. **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json`.
    - `ok: true` → proceed.
    - `ENGINE_INTEGRITY` or `GHOST_REGISTRY` warnings → **C15 Filter** (see `init.md` §1). If in-scope → **HALT**: "Registry/engine integrity failure. Run `magic.spec --audit` or `update-engine-meta` to resolve." If out-of-scope → proceed silently.
    - Missing `.design/` → silently execute `.magic/init.md` (do not prompt user), then resume.
    - Unrecognized failure (`ok: false` with no matching category above) → **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually."
    - Apply Depth Control (Invariant 6): count source files and HALT per thresholds before scanning.
1. Read existing specs; extract currently described paths/logic.
2. Scan actual project; build delta.
3. **Gap Report** (enhanced with Confidence Taxonomy):
    - **Pre-scan**: Run `node .magic/scripts/executor.js analyze-coverage --json` to obtain per-file confidence data.
    - **Covered** (sub-classified by confidence):
      - *EXTRACTED*: File explicitly listed in spec's Canonical References — highest confidence.
      - *INFERRED*: File is a sibling of explicitly referenced paths — reasonable coverage.
      - *AMBIGUOUS*: File is scope-adjacent — needs human review to confirm coverage.
    - **Uncovered**: Code found without spec coverage (confidence = UNCOVERED).
    - **Orphaned**: Spec refers to deleted code (detected via `shadow_specs` in coverage output).
    - **Drifted**: Spec structure differs from code.
    - **RESCUE (AOP)**: Name, title, or semantic similarity >80% → Propose rename/sync. If structural similarity <50% despite path correlation → Treat as **Uncovered** (New Spec) + **Orphaned** (Delete Old Spec).
    - **Logic Evolution**: If code structure/logic inside covered directories has structurally drifted (e.g., >30% new sub-modules — defined as new directories or files containing logic exports; or API schema shift) → **Propose Reality Sync**: Generate a structured diff or a "New Draft" version of the specification that reflects the actual codebase implementation. If approved: dispatch via `spec.md` Amendment Rule (Stable → RFC). C12 cascade applies to all L2 dependents of the affected spec.
4. **Advisory**: Generate Advisory Report (see §Advisory Report) for the analyzed scope.

### [Mode C] Project Ventilation

*Trigger*: `/magic.analyze`, `/magic.analyze {workspace}`, "Ventilate", "Ventilate {workspace}"
*Examples*: `/magic.analyze`, `/magic.analyze engine`, "Ventilate installers"

> **Mode Precedence**: When `/magic.analyze` is triggered and `INDEX.md` is empty, run Mode C first (self-check + registry audit). After the Mode C report is delivered, offer to continue with Mode A (first-time analysis) to generate initial spec proposals. Do NOT auto-start Mode A — the user may only want the audit.
> **Audit Policy**: This mode collects ALL issues (Drift, Gaps, Violations) before reporting. Bypassed HALT conditions in this mode: `checksums_mismatch`, Existence Guard, `VERSION_DRIFT`, C12 Quarantine. Report-delivery is the only HALT point.

1. **Self-Check**: Compare `.magic/` vs `.checksums`. (Non-halting audit).
2. **Design Registry Audit**:
    - **Registry Health**: Cross-reference `INDEX.md` list vs actual files in `specifications/`.
    - **Ghost/Zombie Check**: Identify files on disk not in registry (Orphans) and registry entries with no file (Gaps).
    - **Case Sensitivity**: Flag case mismatches (e.g. `API-Routes.md` vs `api-routes.md`) as structural violations.
    - **Metadata Audit**: Verify `Version`, `Status`, and `Last Updated` parity between `INDEX.md` and document footers.
3. **Structural Integrity** (when workspace is specified):
    - Verify workspace folder exists at `.design/{workspace}/`.
    - Required contents: `INDEX.md`, `specifications/` directory.
    - Optional contents: `RULES.md` (workspace-scoped rules).
    - Cross-check `workspace.json` entry: `scope` paths exist on disk, `name` matches folder.
    - File naming: all spec files in `specifications/` follow kebab-case convention.
    - **Link Integrity**: Scan `.design/` files for broken relative links (404 targets).
    - **Report violations as `STRUCTURE` category**.
4. **Coverage Check**: Scan project directories *within the active workspace scope (C15)*. Identify folders with NO corresponding spec file (Gap Report).
    - **RESCUE (AOP)**: For each orphaned spec + uncovered directory pair, check name, path, title, or semantic similarity. If overall similarity >80%, classify as `RESCUE` (rename opportunity) instead of separate Gap + Orphan entries.
    - **Enhanced Coverage (Confidence Taxonomy)**: Run `node .magic/scripts/executor.js analyze-coverage --json`. Sub-classify all files by confidence level (EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED). Include confidence breakdown in the Coverage Check report section. Flag files with AMBIGUOUS confidence for human review.
5. **Rationale Audit**: Run `node .magic/scripts/executor.js extract-rationale --json`. Identify Shadow Logic — design rationale in code not captured by any specification.
    - For each Shadow Logic file: report the count of rationale markers, their types, and the uncovered file path.
    - If `shadow_files > 0`: Include a `SHADOW_LOGIC` advisory section recommending spec creation for files with ≥3 rationale comments.
    - Report marker distribution (NOTE/WHY/HACK/etc.) as a project health indicator. High HACK/FIXME counts signal technical debt.
6. **Specification Knowledge Graph**: Run `node .magic/scripts/executor.js build-spec-graph`.
    - Report God Nodes (top 5 by degree) — architectural hotspots requiring prioritized spec coverage. Flag god nodes with `status ≠ Stable` as `PRIORITY_SPEC` advisory.
    - Report Orphaned files (workspace-scoped but uncovered) and Missing Implements (L2 specs without parent link).
    - Report Bridge Specs (specs referencing files across multiple workspaces) as candidates for cross-workspace spec or workspace boundary adjustment.
    - **Optional HTML**: If user requests a visual map, run with `--html` flag → outputs `.design/spec-graph.html` (self-contained vis.js visualization).
7. **Workspace Boundary Analysis**: Run `node .magic/scripts/executor.js detect-communities --include-md`.
    - Compare detected communities against `workspace.json` boundaries (Jaccard alignment score).
    - If any community Jaccard score < 0.3 → include `BOUNDARY_DRIFT` warning: community members are misaligned with their declared workspace.
    - If any community exceeds the oversized threshold (>25% of graph) and BFS partitioning reveals sub-clusters → suggest workspace split with proposed names.
8. **Documentation & Version Audit**:
    - Check if `CONTRIBUTING.md` exists and contains all active workflows from `.agents/workflows/`.
    - Verify `README.md` version badge matches `.magic/.version`.
    - Check for version parity across `package.json`, `pyproject.toml`, and installer init files.
    - Report drift as `DOC_SYNC` warning: "Documentation/version drift detected. Recommend running `/magic.dev.sync`."
9. **Scope Blind-Spot Check** (multi-workspace projects): Compare the union of all workspace `scope` arrays against top-level project directories. Report any directories not covered by any workspace as `UNSCOPED` warnings.
10. **Rule Validation**: Check `RULES.md §7` compliance (e.g., C15 adapter registry check).
11. **Auto-Repair suggest**: Suggest commands for missing specs, registry cleanup, or **Task Sync**.
    - If registry healing is needed (Registry Gaps/Orphans) → Propose `magic.spec --audit --fix`.
    - If Shadow Logic detected → Suggest `magic.spec create {module}` for files with ≥3 uncovered rationale comments.
12. **Report**: Consolidated list of errors, warnings, and suggested repairs.
13. **Advisory**: Generate Advisory Report (see §Advisory Report) for the audited scope.

### [Mode D] Focused Analysis

*Trigger: Text argument provided (quoted string or non-workspace token).*

> **Scope**: If a workspace is also specified, focus is applied within that workspace's scope. Otherwise, focus applies **project-wide** (C15 scope not enforced — the focus directive itself acts as the scan boundary).
> **Depth Control**: Exempt — targeted scan is narrow by definition. If focus resolves to >500 matched files, fall back to Invariant 6 thresholds.

1. **Parse Focus Directive**: Extract the intent from the text argument (area, layer, concern).
2. **Targeted Scan**: Instead of full project scan, narrow to directories/files relevant to the focus:
    - Match focus keywords against folder names, spec titles, module names, config sections.
    - If no matches found → **HALT**: "Could not map focus '{text}' to any project area. Try narrowing with a workspace: `/magic.analyze {workspace} \"{text}\"`, or rephrase the focus."
3. **Focused Gap Report**: Same categories as Mode B (Covered/Uncovered/Orphaned/Drifted) but only for the matched area.

### Pre-Advisory Audit (C24)

Before generating recommendations, adopt an **Auditor** persona. Review all findings collected in Modes A/B/C/D and ask:

- **Severity Calibration**: Is each finding classified at the correct severity, or has familiarity with the project lowered the bar?
- **Systemic Pattern**: Do multiple Gap/Drift/Orphan findings point to a single root cause (e.g., a workspace scope misconfiguration, a naming convention drift) rather than isolated issues?
- **Blind Spots**: Are there directories or specs that were NOT flagged but should have been — e.g., high-churn paths with suspiciously clean coverage?

Only after this pass, proceed to generate the Advisory Report categories below.

## Advisory Report

| Category | Logic |
| :--- | :--- |
| **Covered** | Files explicitly mapped to a `Stable` spec (sub-classified: EXTRACTED / INFERRED / AMBIGUOUS). |
| **Uncovered** | Orphan files without spec mapping (confidence = UNCOVERED). |
| **Gaps** | `RFC` or `Draft` specs with no corresponding implementation. |
| **Drift** | `Stable` specs where `git diff` shows manual modification of logic blocks without a version bump. |
| **Shadow Logic** | Files containing rationale comments (NOTE/WHY/HACK/etc.) not captured by any specification. |

### Advisory Report Criteria

- **Signal**: Final report starts with 🟢/🟡/🔴 icon. 🟢 = <5% uncovered/drift AND <3 shadow logic files. 🟡 = AMBIGUOUS files >15% of total OR shadow files with ≥3 HACK/FIXME markers. 🔴 = any core engine drift or >25% project drift.
- **Actionable**: Each Uncovered/Drift item must have a "Sync Path" (e.g. `magic:spec auto-spec`). Shadow Logic items get `→ /magic.spec create {module}`.
- **Engine Bias**: If engine files (`.magic/`) are drifting → priority = `BLOCKER`.
- **Confidence Breakdown**: Include a summary line: `Coverage: {extracted}% EXTRACTED, {inferred}% INFERRED, {ambiguous}% AMBIGUOUS, {uncovered}% UNCOVERED`.

## Analysis Completion Checklist

```
Mode A/B Checklist — {scope}
  ☐ Pre-flight check passed (no invalid registry/meta drift)
  ☐ Multi-Pass Scan complete (Mode A meta -> Mode B structure)
  ☐ Coverage: all files mapped to spec status; Drift detection run
  ☐ Advisory Report generated with Signal and Sync Paths

Mode C Checklist — Ventilation
  ☐ Self-check + Registry audit completed
  ☐ Coverage Check: analyze-coverage.js executed, confidence breakdown included
  ☐ Rationale Audit: extract-rationale.js executed, Shadow Logic section included
  ☐ Pre-Advisory Audit (C24): Auditor persona applied; severity and patterns reviewed
  ☐ Canonical References: All `Stable` specs checked for `## Canonical References` section.
     Flag `CANONICAL_MISSING` for any `Stable` spec lacking this section. Advisory: promote to Stable only after filling it.
  ☐ Advisory Report includes Confidence Breakdown and Shadow Logic advisory
```

## Advisory Report

*Appended to Mode A/B/C/D reports. Chat-only output — never written to files.*

> **Purpose**: Actionable recommendations beyond fix/repair. Helps the user improve spec quality, coverage strategy, and project structure.

### Advisory Report Categories

1. **Spec Quality**
    - Oversized specs (>300 lines) → suggest splitting into L1 + L2s.
    - Bare L1 without L2 children → suggest adding detail specs.
    - L2 specs with no parent L1 → suggest grouping under an umbrella.
    - Specs with empty or stub sections → flag as incomplete.

2. **Coverage Strategy**
    - High-churn directories (≥10 commits in the last 30 days) without specs → prioritize coverage.
    - Test directories without corresponding test-suite spec → suggest `test-suite.md`.
    - Config-heavy areas (CI/CD, infra) without operational specs → suggest ops specs.

3. **Structural Improvements**
    - Workspace candidates: independent subdirectories that could benefit from their own workspace.
    - Rule consolidation: repeated patterns across workspace RULES.md → suggest promoting to global §6.
    - Naming inconsistencies: spec filenames that don't match their title or covered module.

4. **Action Proposals**
    - Each advisory item ends with a concrete next step:
      - `→ /magic.spec create {name}` for missing specs.
      - `→ /magic.spec amend {name}` for outdated specs.
      - `→ /magic.rule add "{convention}"` for uncodified patterns.
      - `→ /magic.analyze {workspace}` for deeper focused checks.
    - User approves/rejects each proposal individually. Approved items dispatch immediately.

### Output Format (Chat)

```
## 📋 Advisory Report

### Spec Quality
- ⚠ `engine-core.md` (342 lines) — consider splitting into focused L2 specs
  → /magic.spec create engine-core-lifecycle
  → /magic.spec create engine-core-invariants

### Coverage Strategy
- 💡 `scripts/` has 12 files, 47 recent commits, no spec coverage
  → /magic.spec create engine-scripts

### Structural Improvements
- 🔧 Workspace `installers` RULES.md repeats 3 rules from global §6
  → /magic.rule promote "C15 scope isolation"

### No Action Needed
- ✅ All L1 specs have L2 children
- ✅ Naming conventions consistent across workspaces
```

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
    - **Zero-Prompt Handoff (C9)**: If logic is clear and non-conflicting (Trust Mode), automatically proceed to task generation (`/magic.task`) without halting. If ambiguity exists, present **Actionable Outcome**: "[Auto-Analyze] {N} specs proposed and created as Stable. Proceed to Plan/Run?" and wait for reply.

## Task Completion Checklist

```
Analysis Checklist — Mode A/B
  ☐ Depth Control obeyed; size-assessed before scanning
  ☐ Stack/Arch inferred; modules identified
  ☐ Mode correct (Analysis vs Re-Analysis Gap Report)
  ☐ RESCUE logic applied for renamed directories
  ☐ Dispatch: approved items created as Stable; RULES.md §7 updated
  ☐ Advisory Report appended to output
  ☐ Engine Meta: C14 bump if .magic/ files modified

Analysis Checklist — Mode C: Ventilation
  ☐ Self-check complete: engine integrity status noted (non-halting)
  ☐ Registry audit: orphans and unregistered files identified
  ☐ Structural Integrity checked (if workspace specified)
  ☐ Coverage check: gaps and RESCUE opportunities reported (scope-bounded by C15)
  ☐ Confidence Taxonomy: analyze-coverage.js executed; EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED breakdown included
  ☐ Rationale Audit: extract-rationale.js executed; Shadow Logic files identified
  ☐ Spec Knowledge Graph: build-spec-graph.js executed; God Nodes and Orphaned files reported
  ☐ Workspace Boundary Analysis: detect-communities.js --include-md executed; Jaccard alignment and split suggestions reported
  ☐ Rule validation: RULES.md §7 compliance checked
  ☐ Pre-Advisory Audit (C24): Auditor persona applied; severity and patterns reviewed
  ☐ Report delivered: all findings consolidated before any HALT
  ☐ Advisory Report appended to output (with Confidence Breakdown + Shadow Logic + Graph Insights)
  ☐ Engine Meta: C14 not triggered (Mode C is read-only — C1 §7)

Analysis Checklist — Mode D: Focused
  ☐ Focus directive parsed and matched to project area
  ☐ Targeted scan completed (not full project)
  ☐ Focused Gap Report generated for matched area only
  ☐ Advisory Report scoped to focus area
  ☐ Engine Meta: C14 not triggered (Mode D is read-only)
```

*Examples*: `/magic.analyze "check API coverage"`, `/magic.analyze engine "focus on tests"`
