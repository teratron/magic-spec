# Engine Automation Specification

**Version:** 1.16.0
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
- **generate-checksums.js**: Maintains `.magic/.checksums`. Honors `.gitignore` during the file walk (Invariant 7 parity).
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

**User-installation boundary (engine v2.1.98).** The flow above is the developer repository's C14: step 4 needs the manifest builder in `dev/scripts/`, which a release does not ship, so a user installation **cannot resolve engine drift** — and must say so rather than perform half of the flow. Until v2.1.98 the write branch bumped `.magic/.version` first and only then found no builder: it printed the "this is a user installation" warning block, then `✅ Engine metadata and version updated.`, and exited 0 — with `.checksums` untouched, so the drift it was run for was still there, and every retry bumped the version again (2.1.97 → 2.1.98 → 2.1.99 in a reproduced user-installation fixture; 2.1.95 → 2.1.96 in the reporting project's own session log, whose next pre-flight still reported both files). The version is the signal Engine Upgrade Detection (`rules/magic.md` §1) treats as an external engine replacement, so a local bump is indistinguishable from an upgrade to it, and the success line was false. Two emitters sent operators there: `check-prerequisites.js`'s `ENGINE_INTEGRITY` warning named `update-engine-meta` as the fix in every installation, and the `--check` failure line said the same. Fixed with one discriminator, `utils.hasEngineWriteTooling()` — the presence of `dev/scripts/generate-checksums.js`, the probe `runGenerateChecksums()` already used; a presence check, never a `require`, so L1 keeps running with no `dev/` — consulted at three sites:

1. Write mode refuses in a user installation **before touching anything** — no bump, no sync, no manifest rewrite — prints the existing user-installation guidance and exits 1.
2. `--check` names C14 as the remedy only where it exists; a user installation is told to restore `.magic/` from the release archive and not to regenerate `.checksums`, which would mask the change.
3. The `ENGINE_INTEGRITY` warning carries `fix: null` and the restore instruction in a user installation, and keeps the C14 command in the developer repository.

The pre-commit hook (`install-hooks.js`) already worded this correctly and is unchanged. The trigger was a downstream agent's side note that `ENGINE_INTEGRITY` fired for `.magic/spec.md` and `.magic/task.md`. The cause of *that* mismatch was not established, but the reporting project's session log narrows it: the pre-flight was clean, then reported exactly those two files about 40 minutes later in the same session; the copies the agent read in between were byte-identical to the release, no edit or shell command in the log writes under `.magic/` before the agent's own `update-engine-meta` run, and the installation was byte-identical to the release again when inspected afterwards — so the two files (or the manifest) were changed and restored by something outside the agent's session. The release itself is cleared: the latest archive and every manifest since v2.1.87 match their own blobs. Until v2.1.99 the engine could not describe the difference: `modified locally` was reported alike for an edit, a line-ending conversion and a manifest swap, and no hash was recorded — see **Diagnosable drift** below. What this section fixes is the remedy path the warning leads down: the same log shows the agent following the hint — the version moved 2.1.95 → 2.1.96, the output ended with a success line, and the next pre-flight still reported both files.

**Diagnosable drift (engine v2.1.99).** An integrity finding now says how a file differs, not only that it does. `utils.describeManifestDelta(filePath, expectedHash)` returns both hashes, the file's own line-ending style (`LF`, `CRLF`, `mixed`, `none`) and whether line endings are the *whole* difference — the bytes equal the recorded content once endings are normalised, in either direction (`expectedEol` names the style the manifest's bytes use). The decode is `latin1`, so the round trip is lossless for any content, multi-byte text included, and the helper is total: an unreadable file yields `null` and the caller omits the detail, since a diagnostic must never become a second failure. Two emitters use it. `check-prerequisites.js`'s `ENGINE_INTEGRITY` message always carries both hashes as 12-hex prefixes — `'.magic/x' has been modified locally (sha256 expected …, found …).` — and names a line-endings-only difference as such: `… has been modified locally: only its line endings differ (found CRLF, the release ships LF; sha256 expected …, found …).` `update-engine-meta`'s per-file `Detected change in:` line gains a dash-separated note, `only line endings differ (found CRLF, the release ships LF)`, for a manifested file in that case and is otherwise unchanged; the hashes stay out of it, because every C14 run in the developer repository prints that line for each file it has just edited. Verdicts, exit codes and remedies are untouched — only the wording of what is reported changed — and a file that differs in both content and endings is reported as content, the endings being incidental. The DG-10 recheck keys a finding on its `code`, never its message, so the extra text cannot desynchronise revalidation.

### Scan Hygiene (Invariant 7 Parity)

Engine scripts that walk the project tree (e.g., `detect-communities.js`) MUST exclude paths ignored by `.gitignore`, in addition to the hardcoded `SKIP_DIRS` denylist. The script reads `.gitignore` at startup and derives two matcher classes:

- **Basename matchers** from directory patterns without a path separator — glob (`*tmp/` → any segment ending in `tmp`; `.*_cache/` → `.ruff_cache`, `.pytest_cache`) or plain (`node_modules/`).
- **Anchored prefixes** from glob-free directory patterns that contain a path separator (e.g., `.design/wiki/`, `.design/.graph-cache/`).

A directory is skipped when its basename matches a basename matcher, or its workspace-relative path falls under an anchored prefix. This prevents test fixtures and generated artifacts (e.g., `.tmp/`, `.design/wiki/`) from polluting community detection and boundary-alignment metrics. The hardcoded `SKIP_DIRS` remains as a gitignore-independent floor — the two are unioned, never mutually exclusive.

**Checksum scanners (engine v2.1.87).** `generate-checksums.js` and `update-engine-meta.js` walk `.magic/` itself and were the last two tree-walking scripts not honoring this Invariant — the gap that let a stray, `.gitignore`d third-party-tool cache directory created inside `.magic/` on a developer machine (`.fallow/`) get baked into the committed `.checksums` manifest. Since the release archive is built by walking a fresh CI checkout (`.github/workflows/release.yml`), a gitignored/untracked path baked into the manifest can never be satisfied by any consumer install, and `update-engine-meta --check` (the pre-commit hook) failed unconditionally on the very first commit, with no self-heal path (`dev/scripts/generate-checksums.js` — the only tool that can regenerate the manifest — is absent by design on consumer installs). Both scripts now union their existing `VOLATILE_STATE_FILES` / `history`-directory excludes with `utils.loadGitignore()` and `utils.BUILD_NOISE_DIRS`, the same shared floor every other scanner in this section already uses.

**Manifested-path boundary (engine v2.1.93).** The gitignore union above is authored against the *source* repo's `.gitignore` (where `.magic/` itself is git-tracked, never ignored — only stray cruft matches). `update-engine-meta.js --check` instead runs inside a **consumer's** installed repo, where `.gitignore` carries the opposite, equally legitimate meaning: the L1 contract requires every consumer to gitignore `.magic/` wholesale, since it is "installed from a release archive, not committed" (`l1-engine-core.md` §Distribution). Applying the same unconditional exclusion there matched *every* file the manifest listed, emptied the on-disk set, and reported all shipped engine files as missing — failing `--check` on every commit for any project following the documented convention (reproduced against a real consumer project). `update-engine-meta.js`'s gitignore exclusion now applies **only to a path absent from `.checksums`** — a manifested path is always checked against disk regardless of the consumer's own `.gitignore`, while an unmanifested, gitignored stray file (the original `.fallow/`-shaped case) is still excluded from triggering a false "new engine file" detection. `generate-checksums.js` needs no equivalent change: it always builds the manifest from scratch in the source repo, where this asymmetry does not arise.

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

#### Zero-Row Vacancy — the branch the normative line specified and the implementation did not build `[AMENDED]`

The `GOOD` line above reads *"planComplete = section has **zero rows**, OR every row's `Status` cell is ... terminal"*. The shipped predicate built the second disjunct and, for the first, substituted the literal marker: zero rows counted as complete **only when spelled `*None ...*`**. A section left genuinely vacant matched neither branch and fell through to "cannot determine", so `DESIGN_DEBT_PENDING` never reached its Backlog evaluation. Two shapes reach that state in practice — the hand-split `## Active Phases` + `## Completed Phases` layout (this engine's own workspace convention) once every row has moved across, and a table cleared outright.

The implementation recorded the narrowing as deliberate, in a code comment: *"absence of a recognizable row or marker still resolves to cannot determine"*. The rule it states is sound and worth keeping — but it had no counterpart in either spec, so code and contract disagreed with no surface on which to notice it. That is the reusable lesson here: a guard that narrows a specified predicate is itself a specification change, and a comment is not where it lives.

**Required Fix**: recognize a **vacant** section — zero phase rows, with nothing remaining but table scaffolding (header/separator rows) or whitespace — as a third positive terminal case alongside the marker and the all-terminal table. Vacancy MUST stay narrower than "nothing matched": content present but unrecognized continues to resolve to "cannot determine", because this predicate gates a check that raises a HALT.

```plaintext
BAD : zero rows counts only when spelled `*None ...*`; a cleared section is "cannot determine"
GOOD: zero rows counts however it is spelled — marker, vacant section, or header-only table;
      only content the predicate could not parse is "cannot determine"
```

**Regression coverage**: one harness case pinning all three halves together — a vacant section under a populated `## Completed Phases` fires; a header-only table (same zero-row state, scaffolding left behind) fires; and unrecognized prose in the section still does **not** fire. The third assertion is the load-bearing one: without it the fix is indistinguishable from deleting the guard.

## Related Specifications

- [l2-spec-graph-memory.md](l2-spec-graph-memory.md) — `build-spec-graph.js` workspace attribution consumes the shared path matcher defined in §Path Matching Contract.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2.4 Terminal-Row Recognition: concept-level requirement this Required Fix implements.
- [l2-engine-finalization.md](l2-engine-finalization.md) — `phase-archiver.js`'s in-place row rewrite is the write side of this contract; this spec covers the `check-prerequisites.js` read side.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/executor.js` | Cross-platform entry point for all automation |
| `.magic/scripts/check-prerequisites.js` | Pre-flight validation; its `ENGINE_INTEGRITY` remedy depends on the installation kind (§Engine Meta Update Flow) |
| `.magic/scripts/generate-context.js` | CONTEXT.md regeneration |
| `.magic/scripts/init.js` | `.design/` scaffold setup |
| `.magic/scripts/update-engine-meta.js` | Engine versioning and history update (gitignore-aware scan, Invariant 7); write mode refused in a user installation (§Engine Meta Update Flow) |
| `dev/scripts/generate-checksums.js` | Checksum manifest builder — developer-only, gitignore-aware scan (Invariant 7) |
| `dev/scripts/update-project-meta.js` | Project metadata hygiene (dev-side, relocated from `.magic/scripts/` in engine v2.1.21) |
| `.magic/scripts/analyze-coverage.js` | Confidence Taxonomy coverage classification |
| `.magic/analyze.md` | Documents the Confidence Taxonomy table and `coverage_percent` formula consumed by `analyze-coverage.js` — must stay in sync with the EXEMPT classification (§Coverage Denominator Scope) |
| `.magic/scripts/extract-rationale.js` | Rationale Extraction and Shadow Logic detection |
| `.magic/scripts/detect-communities.js` | Workspace boundary / community detection (gitignore-aware scan, Invariant 7) |
| `.magic/scripts/check-bloat.js` | Bloat advisory (configurable thresholds, recursive spec scan) |
| `.magic/scripts/utils.js` | Shared helpers — canonical path matcher (§Path Matching Contract); `hasEngineWriteTooling()`, the developer-repo / user-installation discriminator, and `describeManifestDelta()`, the how-does-it-differ classifier behind integrity findings (§Engine Meta Update Flow) |
| `.magic/scripts/lib/` | Finalization helpers: changelog-writer, commit-suggester, git-utils, phase-archiver, project-version, significance |
| `.magic/.checksums` | Checksum manifest |
| `.magic/.version` | Current engine version |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.16.0 | 2026-09-19 | Agent | **Diagnosable drift** (engine v2.1.98 → v2.1.99), the open item 1.15.1 recorded: an `ENGINE_INTEGRITY` warning printed `modified locally` alike for an edit, a line-ending conversion and a swapped manifest and recorded no hash, so a flagged pair of files later found byte-identical to the release could not be explained. New `utils.describeManifestDelta()` — both hashes, the file's own line-ending style, and whether line endings are the whole difference, in either direction (`latin1` round trip; total). `check-prerequisites.js` messages now carry both 12-hex hash prefixes and name a line-endings-only difference; `update-engine-meta`'s `Detected change in:` line names it too, without hashes (every developer C14 run prints that line). No change to verdicts, exit codes or remedies. New **Diagnosable drift** paragraph in §Engine Meta Update Flow; the sentence that called this "not done here" rewritten; Canonical References `utils.js` row extended. Three new `dev/tests/engine.js` cases, mutation-checked (11 of 11 weakenings caught), 102 → 105; `docs/checksums.md` §3.1 updated to the new message shapes. No status transition — `Stable` retained. |
| 1.15.1 | 2026-09-19 | Agent | Evidence and wording correction to §Engine Meta Update Flow, no behavior change. The reporting project's own session log — located after 1.15.0 shipped — confirms the defect on real data (following the hint moved its engine version 2.1.95 → 2.1.96 with a success line and an unchanged warning, six recorded occurrences by the end of the day) and narrows the original mismatch without explaining it (clean pre-flight, then exactly `spec.md`/`task.md` about 40 minutes later in the same session; the copies read in between byte-identical to the release; no write under `.magic/` in the log; identical to the release again when inspected afterwards). 1.15.0's claim that the local bump "produced phantom upgrade drift" was mechanism-only — no drift narration appears in the log — and now reads "indistinguishable from an upgrade". The diagnosability gap (one `modified locally` message for an edit, a line-ending conversion and a manifest swap, with no hash recorded) is written into the section as an open, deliberately unaddressed item. No status transition — `Stable` retained. |
| 1.15.0 | 2026-09-19 | Agent | **User-installation boundary** for the C14 write branch (engine v2.1.97 → v2.1.98): a downstream agent reported `ENGINE_INTEGRITY` for `.magic/spec.md` and `.magic/task.md`. The cause of that mismatch could not be established (the latest release and every manifest since v2.1.87 match their own blobs; inspected consumer installs pass and are byte-identical to upstream for those files), but reproducing the scenario in a user-installation fixture exposed the remedy path as defective: `update-engine-meta` — named as the fix by both `check-prerequisites.js` and its own `--check` failure line — bumped `.magic/.version` on every run, could not regenerate the manifest (builder absent), printed `Engine metadata and version updated`, and exited 0; the warning persisted and the version ratcheted 2.1.97 → 2.1.98 → 2.1.99, which Engine Upgrade Detection reads as a phantom external upgrade. Fixed with `utils.hasEngineWriteTooling()`: write mode is refused (no bump, no sync, no rewrite, exit 1) in a user installation, and `--check` and the `ENGINE_INTEGRITY` warning name a restore from the release archive there while keeping C14 in the developer repository. New **User-installation boundary** paragraph in §Engine Meta Update Flow; three Canonical References rows annotated. Three new `dev/tests/engine.js` cases, mutation-checked (8 of 8 weakenings caught), 99 → 102; the pre-existing consumer-style snapshot case's comments corrected — it withholds only the snapshot script, so it was never a true user installation. No status transition — `Stable` retained. |
| 1.14.0 | 2026-09-17 | Agent | **Manifested-path boundary** for the Invariant 7 checksum-scanner union (engine v2.1.92 → v2.1.93): `update-engine-meta.js`'s gitignore exclusion was unioned against the *consumer's own* `.gitignore` at `--check` time, but every consumer install is required by the L1 contract to gitignore `.magic/` wholesale — so the exclusion matched every manifested file, emptied the on-disk set, and reported all 71 shipped engine files as missing, failing the pre-commit hook on every commit for any project following the documented convention. Reproduced against a real consumer project (`metaquant`). The 1.13.0 fix addressed only the source-repo authoring case (stray untracked cruft inside `.magic/`); this asymmetry between source-repo and consumer-repo `.gitignore` semantics was not yet in scope. Fixed by scoping the exclusion to paths absent from `.checksums` (`!isManifested`) — a manifested path is always verified against disk; an unmanifested gitignored stray file is still excluded, preserving the 1.13.0 protection. New regression: `dev/tests/engine.js` (manifested-file verification under a wholesale-gitignored `.magic/`) and `dev/tests/suite.md` T219. Post-Update Review (5-lens) found no blocking issues; Stable retained via Trust Mode (C9). |
| 1.13.0 | 2026-09-16 | Agent | **Checksum scanners join Invariant 7 Parity** (engine v2.1.86 → v2.1.87): `.magic/.checksums` carried four entries under `.fallow/` referencing a stray, `.gitignore`d, untracked directory (`git ls-files` confirmed zero tracked files) that the unrelated `fallow` CLI had created inside `.magic/` on a developer machine — `generate-checksums.js` walked the full `.magic/` tree with no gitignore awareness and baked its hashes into the tracked manifest. Since `.github/workflows/release.yml` builds every release archive from a fresh `actions/checkout@v4` (untracked paths never present), the shipped manifest referenced files that could never exist on a fresh install: reproduced directly by removing `.magic/.fallow/` and observing `update-engine-meta --check` fail unconditionally (`missingFiles` branch, exit 1) — no trigger condition needed, since every consumer install starts in exactly that state, with no self-heal path (`dev/scripts/generate-checksums.js` absent by design). This was the Scan Hygiene section's own gap: the section already required gitignore-awareness of "engine scripts that walk the project tree" generically, but the two checksum scanners were never migrated while `detect-communities.js`, `extract-rationale.js`, `analyze-coverage.js`, and `generate-context.js` all were. Fixed by unioning both scanners' walk with `utils.loadGitignore()` + `utils.BUILD_NOISE_DIRS`, purging the stray directory, and regenerating the manifest (75 → 71 tracked entries). New **Checksum scanners** paragraph in §Scan Hygiene; `generate-checksums.js` re-added to Canonical References (removed as "stale" in 1.4.0 — now genuinely gitignore-aware); `update-engine-meta.js` row annotated. Three new engine regressions: every `.checksums` entry must be git-tracked (real-repo invariant), and both scanners exclude a synthetic gitignored fixture directory; `dev/tests/engine.js` 81 → 84. Post-Update Review (5-lens) found no blocking issues; Stable retained via Trust Mode (C9). |
| 1.12.0 | 2026-09-13 | Agent | Reverted the 1.11.0 **concept-only spec extension**: discovered during `/magic.run engine` Phase 29 Execute that "Stable L1 without L2 children" is a cognitive advisory in `.magic/analyze.md` §Advisory Report Categories, never a scripted `analyze-coverage.js` metric — that script's `EXEMPT` mechanism (this section) computes an unrelated axis, project source-file coverage against spec Canonical References. 1.11.0 routed the fix here on a false analogy between the two "coverage" concepts. Concept authority [l1-engine-core.md](l1-engine-core.md) 1.7.1 now points the Required Fix directly at `.magic/analyze.md`; nothing in this spec implements it. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) and Instruction Quality Pass found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.11.0 | 2026-09-13 | Agent | **Concept-only spec extension** to Coverage Denominator Scope: a Stable L1 spec may carry a `concept-only` marker (surfaced via reference-mining against a downstream consumer project's own constitution) excluding it from the "Stable L1 without L2 child" coverage-gap advisory, mirroring the existing `EXEMPT` mechanism; the marker auto-clears the moment a child L2 declares `Implements:`. Concept authority: [l1-engine-core.md](l1-engine-core.md) 1.7.0 §Known Process Gaps — Concept-Only Classification. Required Fix (Engine Improvement, out of this spec's write scope) targets `analyze-coverage.js`'s gap pass and the parent-clearing write path; `.magic/analyze.md`'s Advisory Report template gains a narration line. Registry note: this revision also reconciles a pre-existing VERSION_DRIFT — `.design/engine/INDEX.md` had not been synced past 1.9.0 following the 1.10.0 Zero-Row Vacancy amendment; reconciled in the same pass per RE-3. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) and Instruction Quality Pass found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.10.0 | 2026-09-11 | Agent | **Zero-Row Vacancy** amendment to the DESIGN_DEBT_PENDING predicate: 1.9.0's own normative line specified `planComplete = section has zero rows, OR every row terminal`, but the shipped code built only the second disjunct and substituted the literal `*None ...*` marker for the first — so a vacant `## Active Phases` section (hand-split `## Completed Phases` layout with every row moved across, or a table cleared outright) fell through to "cannot determine" and the gate never evaluated its Backlog. Opposite end of the same predicate from 1.9.0. The narrowing was recorded only in an implementation comment, never in either spec, so code and contract disagreed with no surface on which to notice it. Required Fix: vacancy (zero rows, nothing but table scaffolding or whitespace) is a third positive terminal case, while unrecognized content still resolves to "cannot determine" — the predicate gates a HALT. Regression must pin all three halves, the negative included. Concept authority [l1-session-continuity.md](l1-session-continuity.md) 2.1.0 §Zero-Row Vacancy. Status reverted `Stable → RFC` (Amendment Rule, minor); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
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
