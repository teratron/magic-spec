# Engine Automation Specification

**Version:** 1.9.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Implementation details of the Magic SDD automation scripts.

## Motivation

Automate repetitive tasks like checksum generation, versioning, and environment resolution.

## Components

- **executor.js**: Cross-platform wrapper for JS and Shell/PowerShell scripts.
- **check-prerequisites.js**: Validates engine integrity and project state.
- **generate-checksums.js**: Maintains `.magic/.checksums`.
- **generate-context.js**: Regenerates `CONTEXT.md` from current project state.
- **init.js**: Scripted setup of the `.design/` directory.
- **analyze-coverage.js**: Confidence Taxonomy engine — classifies project files by spec coverage confidence (EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED, plus EXEMPT for SDD bookkeeping files — see §Coverage Denominator Scope) using Canonical References from specifications.
- **extract-rationale.js**: Rationale Extraction engine — scans source code for design rationale markers (NOTE/WHY/HACK/etc.) and identifies Shadow Logic (uncovered design decisions).
- **detect-communities.js**: Workspace boundary analysis — builds the dependency graph, detects communities, and scores Jaccard alignment against `workspace.json`. Honors `.gitignore` during the file walk (Invariant 7 parity).
- **check-bloat.js**: Context-economy advisory — flags oversized specs and task phases against configurable thresholds (see §Bloat Advisory Configuration).

## Logical Flows

### Zero-Prompt Resolution

1. Check `MAGIC_WORKSPACE` env.
2. Check `--workspace` flag.
3. Use `default` from `.design/workspace.json`.
4. Fallback to `.design/`.

### History Subsystem

Each workflow has a dedicated history file at `.magic/history/{workflow}.md`. The `update-engine-meta` command maintains these files under the **Smart History** rule:

- A new row is appended only when the engine version actually changes (i.e., a `.magic/` file was physically modified).
- **Redundant automated entries are skipped**: if the last history row was auto-generated for the same version range, no duplicate is written.
- Each history file records: version range (e.g., `1.4.9 – 1.4.108`), date, and change type.
- If a history file is missing when `update-engine-meta` runs, it is automatically created (**Auto-Heal**, C20).

### Engine Meta Update Flow (`update-engine-meta`)

1. Verify that a `.magic/` file was physically modified (checksum delta).
2. Increment patch version in `.magic/.version`.
3. Append row to `.magic/history/{workflow}.md` (Smart History dedup).
4. Regenerate `.magic/.checksums` across all tracked engine files.

### Scan Hygiene (Invariant 7 Parity)

Engine scripts that walk the project tree (e.g., `detect-communities.js`) MUST exclude paths ignored by `.gitignore`, in addition to the hardcoded `SKIP_DIRS` denylist. The script reads `.gitignore` at startup and derives two matcher classes:

- **Basename matchers** from directory patterns without a path separator — glob (`*tmp/` → any segment ending in `tmp`; `.*_cache/` → `.ruff_cache`, `.pytest_cache`) or plain (`node_modules/`).
- **Anchored prefixes** from glob-free directory patterns that contain a path separator (e.g., `.design/wiki/`, `.design/.graph-cache/`).

A directory is skipped when its basename matches a basename matcher, or its workspace-relative path falls under an anchored prefix. This prevents test fixtures and generated artifacts (e.g., `.tmp/`, `.design/wiki/`) from polluting community detection and boundary-alignment metrics. The hardcoded `SKIP_DIRS` remains as a gitignore-independent floor — the two are unioned, never mutually exclusive.

### Path Matching Contract (Scope & Canonical References)

Origin: downstream field report (engine 2.1.27), reproduced upstream at 2.1.30 — scope entries and spec references were matched by literal string comparison, so natural inputs (`docs/` with trailing slash, `src/**` globs) silently matched nothing: empty scans reported as clean, EXTRACTED files demoted to INFERRED, and false `shadow_specs` orphans emitted.

**Single Matcher Invariant.** Every engine script that filters or attributes project paths against user-supplied path sets (workspace `scope` arrays from `workspace.json`, Canonical References `Path` cells) MUST resolve matches through one shared matcher exported by `.magic/scripts/utils.js`. Per-script literal `startsWith` comparison is forbidden. Consumers: `analyze-coverage.js` (scope filter and reference classification), `extract-rationale.js`, `generate-context.js`, `build-spec-graph.js` (workspace attribution — see [l2-spec-graph-memory.md](l2-spec-graph-memory.md)).

**Matching semantics** (one entry = one scope element or one `Path` cell):

| Input form | Interpretation |
| --- | --- |
| `dir` or `dir/` | The path itself and everything beneath it (trailing slash normalized away) |
| `file.ext` | Exact file match |
| `*` | Wildcard within a single path segment |
| `**` | Wildcard across any number of segments |

All matching is repo-root-relative, forward-slash normalized, case-sensitive, and anchored at the start of the entry.

**Zero-Match Guard (negative space).** A scope entry or pattern reference that matches zero existing files emits a non-blocking warning (`SCOPE_NO_MATCH` / `REF_NO_MATCH`). Silent empty result sets are forbidden — an empty scan must never be indistinguishable from a clean scan. Mirrors §Scan Hygiene: the boundary input, not the hardcoded assumption, is the source of truth.

**Pattern references in coverage.** A Canonical Reference containing glob metacharacters is a *pattern ref*: files it matches classify as EXTRACTED with spec attribution preserved. The shadow-spec orphan test for a pattern ref is "matches zero files on disk" — never a literal existence probe of the raw pattern string.

### Bloat Advisory Configuration

`check-bloat.js` thresholds are advisory defaults, not constants — legitimate spec style varies by project (downstream report: 42 specs legitimately above 300 lines produce permanent advisory noise). Defaults remain `spec 300/500` and `task 250/400` (soft/hard), overridable per project via `.design/workspace.json`. Configuration contract `[REFERENCE]`:

```json
{
  "bloat": {
    "spec": { "soft": 300, "hard": 500 },
    "task": { "soft": 250, "hard": 400 }
  }
}
```

- Omitted keys fall back to defaults; a threshold set to `0` disables that signal class.
- The spec scan walks `specifications/**` recursively — parity with the finalize significance whitelist; top-level-only scanning is a defect.

### Coverage Denominator Scope (EXEMPT classification)

**The defect** (ventilation, 2026-08-06): `analyze-coverage.js` classifies every scanned file — including `.design/`'s own bookkeeping output (`PLAN.md`, `TASKS.md`, `STATE.md`, `CONTEXT.md`, `CHANGELOG.md`, `RETROSPECTIVE.md`, and every archived phase journal under `archives/`) — through the same EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED pipeline as implementation source. None of these files are ever meant to appear in a spec's Canonical References — they are the SDD process's own state, not a coverage subject — so they land UNCOVERED by construction and drag the reported percentage down as project history accumulates. Reproduced on this repository's own `engine` workspace: 85.4% reported, 17 of 25 UNCOVERED files being archived phase journals alone.

**Required Fix**: introduce a fifth classification, `EXEMPT`, applied before the existing four-step `classifyFile()` pipeline runs. A file whose basename is one of `PLAN.md` / `TASKS.md` / `STATE.md` / `CONTEXT.md` / `CHANGELOG.md` / `RETROSPECTIVE.md` / `INDEX.md` / `RULES.md` under `.design/`, or whose path contains an `archives` segment under `.design/`, classifies `EXEMPT` and is excluded from `total`, `coveredCount`, and `coveragePercent` — but still appears in `--json` output (its own `coverage[]` entry, and a `summary.exempt` count) so the exclusion is auditable, not a silent drop.

```plaintext
BAD : total = extracted + inferred + ambiguous + uncovered
      // PLAN.md, archived phase journals, etc. inflate `uncovered`
GOOD: total = extracted + inferred + ambiguous + uncovered   // EXEMPT excluded entirely
      summary.exempt = counts.exempt                          // reported, not hidden
```

`.design/{ws}/specifications/*.md`, `workspace.json`, and active (non-archived) `tasks/*.md` remain **not** exempted — `specifications/` in particular still classifies mostly INFERRED/EXTRACTED, not UNCOVERED (32/32 specs matched on this repository's own `engine` workspace), so widening the exemption there remains unevidenced.

`INDEX.md` and `RULES.md` join the EXEMPT set as of this revision. The 1.7.0 text left them out on the same "not evidenced as needed" reasoning that scoped the original defect to the bookkeeping/journal set — but a follow-up ventilation pass (2026-08-07) reproduced `.design/engine/INDEX.md` itself landing `UNCOVERED` on this repository's own registry: the identical failure mode (a file that structurally can never appear in a spec's Canonical References counting against `coveragePercent`) the bookkeeping/journal exemption exists to prevent. `INDEX.md` and `RULES.md` are registry/constitution files, never a coverage subject any more than `PLAN.md` or `TASKS.md` are — the earlier exclusion undercounted the exemption's own scope rather than deliberately narrowing it.

**Parallel doc update required**: `.magic/analyze.md` §Confidence Taxonomy documents the same four-level enum and states `coverage_percent = (EXTRACTED + INFERRED) / total * 100` verbatim — an L1 engine file, out of this spec's write scope but stale the moment `EXEMPT` ships. The implementing task MUST add the `EXEMPT` row to that table and note it is excluded from `total` entirely (not merely from the numerator, unlike AMBIGUOUS), alongside the code change (C14 applies — `.magic/` content changed).

### DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate `[ADDED]`

**The defect** (field report, engine 2.1.71; concept authority [l1-session-continuity.md](l1-session-continuity.md) §Terminal-Row Recognition): `check-prerequisites.js`'s `DESIGN_DEBT_PENDING` gate only evaluates the Backlog once a `planComplete` pre-check passes, and that check currently requires the `## Active Phases` section of `TASKS.md` to reduce, verbatim, to the empty-marker line `*None ...*`:

```js
const planComplete = Boolean(activePhasesMatch) && /^\*None\b/m.test(activePhasesMatch[1].trim());
```

`phase-archiver.js` (`updateTasksIndex()`, governed by [l2-engine-finalization.md](l2-engine-finalization.md) §2) rewrites a finished phase row's status to `` `Done (Archived)` `` in place — it never relocates the row out of whatever section it already occupies. The canonical `tasks.md` template defines exactly one phase table, under `## Active Phases`, with no second "completed" section for rows to move into. So under the shipped template, once a single phase has ever been archived, `## Active Phases` permanently contains a table row instead of the literal empty marker, and `planComplete` can never evaluate `true` again for the remaining life of the workspace — `DESIGN_DEBT_PENDING` is structurally unreachable regardless of Backlog content.

**Required Fix**: recognize completion by row status, not by literal section text — every row in `## Active Phases` carries a terminal status (`Done`, `Done (Archived)`, `Cancelled`) and none carries a non-terminal one (`Todo`, `In Progress`, `Blocked`); the empty-marker form remains one valid terminal case (zero rows), not the only one.

```plaintext
BAD : planComplete = section trims to literal `*None ...*`
GOOD: planComplete = section has zero rows, OR every row's `Status` cell is one of
      Done / Done (Archived) / Cancelled, with no Todo / In Progress / Blocked row present
```

**Regression coverage**: the existing `DESIGN_DEBT_PENDING` fixtures in the test harness assume a hand-split `## Active Phases` (empty) + `## Completed Phases` (archived rows) layout that no shipped script produces — that structure is a local, undocumented convention in this engine's own workspace, not the canonical single-table `tasks.md` shape. The fixtures must gain a case built against the canonical single-table layout (one `## Active Phases` table whose only rows are `Done (Archived)`) alongside the existing two-section case, so the suite exercises the structure the shipped template actually generates.

## Related Specifications

- [l2-spec-graph-memory.md](l2-spec-graph-memory.md) — `build-spec-graph.js` workspace attribution consumes the shared path matcher defined in §Path Matching Contract.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2.4 Terminal-Row Recognition: concept-level requirement this Required Fix implements.
- [l2-engine-finalization.md](l2-engine-finalization.md) — `phase-archiver.js`'s in-place row rewrite is the write side of this contract; this spec covers the `check-prerequisites.js` read side.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/executor.js` | Cross-platform entry point for all automation |
| `.magic/scripts/check-prerequisites.js` | Pre-flight validation |
| `.magic/scripts/generate-context.js` | CONTEXT.md regeneration |
| `.magic/scripts/init.js` | `.design/` scaffold setup |
| `.magic/scripts/update-engine-meta.js` | Engine versioning and history update |
| `dev/scripts/update-project-meta.js` | Project metadata hygiene (dev-side, relocated from `.magic/scripts/` in engine v2.1.21) |
| `.magic/scripts/analyze-coverage.js` | Confidence Taxonomy coverage classification |
| `.magic/analyze.md` | Documents the Confidence Taxonomy table and `coverage_percent` formula consumed by `analyze-coverage.js` — must stay in sync with the EXEMPT classification (§Coverage Denominator Scope) |
| `.magic/scripts/extract-rationale.js` | Rationale Extraction and Shadow Logic detection |
| `.magic/scripts/detect-communities.js` | Workspace boundary / community detection (gitignore-aware scan, Invariant 7) |
| `.magic/scripts/check-bloat.js` | Bloat advisory (configurable thresholds, recursive spec scan) |
| `.magic/scripts/utils.js` | Shared helpers — canonical path matcher (§Path Matching Contract) |
| `.magic/scripts/lib/` | Finalization helpers: changelog-writer, commit-suggester, git-utils, phase-archiver, project-version, significance |
| `.magic/.checksums` | Checksum manifest |
| `.magic/.version` | Current engine version |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.9.0 | 2026-08-13 | Agent | New **DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate** Required Fix: `check-prerequisites.js`'s `planComplete` pre-check requires `## Active Phases` to reduce to the literal `*None ...*` marker, but `phase-archiver.js` rewrites a finished row's status in place under the canonical single-table `tasks.md` template — no separate "completed" section exists to move rows into — so the predicate can never be true again once any phase has ever been archived (field report, engine 2.1.71). Fix: recognize completion by row status (all terminal, none non-terminal), not by literal section text. Notes the existing regression fixtures were built against an undocumented two-section layout no shipped script produces, and requires a canonical single-table case added alongside. Implements [l1-session-continuity.md](l1-session-continuity.md) §Terminal-Row Recognition. Related Specifications gained the two cross-references. Post-Update Review (5-lens) found no blocking issues; Stable retained via Trust Mode (C9). |
| 1.8.0 | 2026-08-07 | Agent | **Coverage Denominator Scope** amended: `INDEX.md` and `RULES.md` join the `EXEMPT` set. 1.7.0 left them out on "not evidenced as needed" — a same-day follow-up ventilation reproduced `.design/engine/INDEX.md` itself landing `UNCOVERED` on this repository's own registry, direct evidence against that premise. `specifications/*.md`, `workspace.json`, and active `tasks/*.md` remain not exempted (still classify mostly EXTRACTED/INFERRED, 32/32 specs matched — no evidence of the same failure mode there). Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.7.0 | 2026-08-07 | Agent | New **Coverage Denominator Scope** section (`EXEMPT` classification): `analyze-coverage.js` counted `.design/`'s own bookkeeping output (PLAN, TASKS, STATE, CONTEXT, CHANGELOG, RETROSPECTIVE, archived phase journals) in the same denominator as implementation source, so reported coverage fell as SDD history accumulated — 85.4% against the graph's 100% on this repository's own `engine` workspace, 17 of 25 UNCOVERED files being archived phase journals alone (ventilation, 2026-08-06). Required Fix: a fifth classification, `EXEMPT`, applied before the existing four-step pipeline, excluded from `total`/`coveragePercent` but still reported (`summary.exempt`) for auditability. Scope deliberately excludes `specifications/`, `INDEX.md`, `RULES.md`, `workspace.json`, and active `tasks/*.md` — the finding was specific to the bookkeeping/journal set, not the whole `.design/` tree. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.6.0 | 2026-06-12 | Agent | Added Path Matching Contract (shared scope/glob matcher in utils.js, zero-match guard, pattern refs) and Bloat Advisory Configuration (workspace.json threshold overrides, recursive scan) — upstream fix design for downstream glob-scope coverage report (engine 2.1.27, reproduced at 2.1.30). Documented check-bloat.js in Components. Stable retained via Trust Mode re-review (C9). |
| 1.5.0 | 2026-06-10 | Agent | Documented detect-communities.js (closed INFERRED coverage gap) and added Scan Hygiene section: graph-walk scripts honor .gitignore (Invariant 7 parity), unioned with SKIP_DIRS floor. Stable retained via Trust Mode re-review (C9). |
| 1.4.1 | 2026-06-10 | Agent | Fixed orphaned Canonical Reference: update-project-meta.js path updated to dev/scripts/ (script relocated in engine v2.1.21). |
| 1.4.0 | 2026-05-07 | Agent | Added header fields (Version/Status/Layer/Implements). Removed stale generate-checksums.js and .magic/history/ refs; replaced with .magic/scripts/lib/ coverage. |
| 1.3.0 | 2026-04-22 | Agent | Added analyze-coverage.js (Confidence Taxonomy) and extract-rationale.js (Rationale Extraction) to Components and Canonical References. |
| 1.2.0 | 2026-03-20 | Agent | Added generate-context.js to Components; fixed engine file count reference. |
| 1.1.0 | 2026-03-04 | Agent | Added History Subsystem and Engine Meta Update Flow sections. |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing scripts). |
