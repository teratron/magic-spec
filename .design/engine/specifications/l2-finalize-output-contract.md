# Finalize Pipeline — Output Contract

**Version:** 2.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Defect record and required-fix contract for everything the finalize pipeline **emits**: the stdout artifact listing and the bullets written into the product's root `CHANGELOG.md`. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §7/§9 at that spec's v2.0.0 decomposition; its sibling [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) owns the `STATE.md` correctness surface, and the parent retains the pipeline contract itself. This spec previously also governed the suggested commit message; that output was retired 2026-08-27 by explicit user directive (SC-3 retirement, [l1-session-continuity.md](l1-session-continuity.md)) — see §3's retirement note.

The unifying property: everything here crosses a boundary the review gates do not watch. A CHANGELOG bullet is generated text written straight into a product file, and the stdout artifact listing is what the user reads to understand what the invocation actually changed. Neither passes a Coder or Code-reviewer diff.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) — RC-11 (Generator Self-Containment) binds §2's CHANGELOG-bullet output.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-3 (retired 2026-08-27); this spec's former commit-message clauses retired alongside it. §3's stdout-listing completeness requirement survives independently.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Parent spec: pipeline contract and module inventory.
- [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) — Sibling: the `STATE.md` correctness surface.
- [l2-test-suite.md](l2-test-suite.md) — Carries the regression-coverage mandate.

## 1. Motivation

Two of this pipeline's outputs land somewhere no human reviews before the fact:

- **CHANGELOG bullets** are composed by `commit-suggester.js` and inserted by `changelog-writer.js` directly into a product file. No Coder authors the text; no Code-reviewer sees it as a diff. The containment gates RC-5/RC-6 therefore never apply, which is why RC-11 binds the *generator* instead.
- **The stdout listing** is what the user reads to understand what the invocation changed. An omission there defeats the transparency the listing exists to provide.

Defects in this class are quiet by construction — they produce plausible-looking output that is wrong in a way only cross-checking against the real diff or the real file reveals.

## 2. Generator Containment (RC-11)

`buildChangelogBullet()` in `commit-suggester.js` is written straight to the product's root `CHANGELOG.md` via `changelog-writer.js`'s `appendBullet()` — no Coder authors this text, no Code-reviewer reviews a diff of it, so [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)'s **RC-5/RC-6 gates never see it**. RC-11 binds this generator exactly as RC-1/RC-2 bind hand-authored text: its output must never embed a spec's **artifact ID** — the identifier obtained by stripping the `l1-`/`l2-` prefix and `.md` extension from the spec's filename (`artifactId()` in this same module).

### 2.1 The Defect (field report, engine 2.1.49)

The `spec` case of `buildChangelogBullet()` had two branches keyed on `specs.length`:

- `specs.length > 1` → `` `${verb} ${specs.length} specifications (${workspace})` `` — generic, safe.
- `specs.length === 1` → `` `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})` `` — interpolates the artifact ID, **violating RC-11**.

The `run` case's own single-item branch (`` `Completed task (${workspace})` `` — no task ID interpolated) already demonstrated the correct shape; the `spec` case's single-item branch was the outlier, not the pattern.

At the time of this defect, `artifactId()` was also legitimately used elsewhere in this same module (`buildSummary()`, for the git commit-message header) — that usage was **not** a violation: commit messages are git metadata, exempt under RC-8. `buildSummary()`'s commit-message-header usage no longer exists — commit-message composition was retired 2026-08-27 (SC-3 retirement, [l1-session-continuity.md](l1-session-continuity.md)) — this paragraph is retained only as the historical record of why that usage was never itself a violation. The violation this section fixes was, and remains, specific to text that reaches a product file: `buildChangelogBullet()`'s return value only.

### 2.2 Required Fix

`buildChangelogBullet()`'s `spec` case, `specs.length === 1` branch, must drop the `artifactId()` interpolation and return a generic bullet — matching the shape its own multi-item branch and the `run` case's single-item branch already use:

```plaintext
BAD : `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})`
GOOD: `${verb} a specification (${workspace})`
```

No other branch of `buildChangelogBullet()` (`task`, `run`, `rule`) interpolates an SDD-layer identifier — this fix is scoped to the one outlier branch.

> The historical leaks this fix stopped are still visible in the repository's own `CHANGELOG.md` (`Updated specification \`engine-core\` (engine)`,`Completed task \`phase-9\` (engine)` and ~15 siblings). Those entries predate the fix and are left in place: rewriting shipped release notes to retrofit a containment rule would falsify the record. §4 addresses what happens to that accumulated section going forward.

## 3. Stdout Listing Completeness (formerly SC-3.1; commit-message clause retired 2026-08-27)

### 3.1 The Defect

`main()`'s success branch built the stdout `### Changed artifacts` listing (`emitSuccess()`) from `sig.files` alone — the same whitelist-filtered set `computeSignificance()` returns to decide whether a version bump is warranted. Significance and listing completeness are two different questions collapsed onto one file set: "should this bump the version" (correctly scoped to `.design/{ws}/...`) and "what should the stdout tell the user actually changed" (should reflect the real working-tree diff) are not the same question, and the whitelist only answers the first.

Reproduced against this repository's own history — no synthetic fixture needed, the defect is visible in a commit already on `master`. Commit `b96ce07` (`chore(engine): complete phase-14`, a `magic.run` finalize) — from when this pipeline still also suggested a commit message — named exactly two files in both that suggestion and its stdout listing, while `git show --stat b96ce07` shows the commit the user actually made spans **17** — including `.magic/` C14-sync files, root docs, and, the case that matters most in a consumer project, the task's own application-code deliverable (`dev/scripts/sync-skills.js`, `dev/tests/engine.js`). None of the 15 omitted files appeared anywhere in finalize's stdout.

For `magic.run` this is the common case, not an edge case: its whitelist is pure SDD bookkeeping — the application code a task implements is, by construction, never inside it.

### 3.2 Required Fix

Two file sets already exist in the pipeline and were being collapsed into one where they should stay separate:

- `sig.files` (whitelist-filtered) — correctly drives `deriveType()`, `deriveScope()`, `buildSummary()`, and `deriveChangelogCategory()`/`buildChangelogBullet()`. These derive the *semantic* nature of the change and must stay scoped to SDD artifacts.
- The full working-tree diff — already computed for other pipeline purposes.

`emitSuccess()`'s stdout listing must read the full `gitChangedPaths(projectRoot)` result, capped at `MAX_FILES = 15`, with a `(+N more changed file(s))` suffix beyond the cap:

```plaintext
BAD : emitSuccess({ ..., files: sig.files })
      // stdout listing reads the whitelist subset
GOOD: emitSuccess({ ..., files: allChangedFiles, headerFiles: sig.files })
      // stdout listing enumerates every changed file; category/summary derivation still reads only the whitelist subset
```

The header-derivation functions keep their `sig.files`-only input; only the stdout listing widens.

**Note (2026-08-27):** this requirement previously bound the suggested commit message's `Modified files:` body equally with the stdout listing, via `buildCommitMessage()`. Commit-message composition — and `buildCommitMessage()` itself — was retired in full (SC-3 retirement, [l1-session-continuity.md](l1-session-continuity.md)); this fix is now scoped to the stdout listing alone.

## 4. CHANGELOG Entry Suppression (R11) `[ADDED]`

### 4.1 The Defect

`appendBullet()` is idempotent by design: `bulletExists()` compares whitespace-normalized, lowercased text within the target category body and returns the file unchanged on a match. `buildChangelogBullet()`, meanwhile, emits from a **closed and very small vocabulary** — verified by reading every branch:

| Workflow | Distinct bullets producible (per workspace) |
| --- | --- |
| `task` | 3 — plan+index, plan only, index only |
| `rule` | 2 — global rules, workspace rules |
| `run` | 3 — one task, N tasks, execution state |
| `spec` | 3 shapes × 2 verbs (`Added`/`Updated`), plus the registry fallback |

Each is parameterized only by workspace name and a count. Both behaviors are individually correct; together they mean that **once a shape has appeared in `[Unreleased]`, every later cycle producing that same shape writes nothing at all**. For `task` specifically, a single-workspace project exhausts its entire vocabulary in three planning cycles, after which `/magic.task` can never add a CHANGELOG entry again.

Observed live rather than inferred: three consecutive finalize invocations during the 2026-08-07 session each reported `CHANGELOG | skipped (duplicate)`, and the two bullets involved (`Updated task plan and task index (engine)`, `Updated 5 specifications (engine)`) were already present from earlier cycles.

### 4.2 The Compounding Cause — No Rotation

The suppression is total rather than merely occasional because nothing ever clears `[Unreleased]`. `changelog-writer.js` exports `releaseUnreleased()` — which renames `[Unreleased]` to `[X.Y.Z] - {date}` and opens a fresh empty one, exactly the rotation that would restore the vocabulary — and `finalize.js` **imports it and never calls it**. Verified by grepping every engine script: the only occurrences are the import statement, the definition, and the module export.

The consequence is cumulative: this repository's `[Unreleased]` now spans 192 lines and covers engine 2.1.3 through 2.1.66 — every release since 2026-05-07 sits in a section whose name asserts it is unreleased.

### 4.3 Root Cause (resolved 2026-08-07)

Investigated by locating both `### Changed` headings inside the `[Unreleased]` block (root `CHANGELOG.md` lines 48 and 147, bounded above by line 8's `## [Unreleased]` and below by line 200's `## [2.1.3] - 2026-05-07`) and running `git blame`/`git show` against each heading line individually — not against a filtered/relative line range, which the first investigation pass used and which produces wrong line numbers against the real file.

Both headings trace to direct, human-authored commits, one week apart, neither touching any other engine file in the same commit:

| Heading (line) | Commit | Date | Author | Message |
| --- | --- | --- | --- | --- |
| 147 | `aea88015` | 2026-05-07 | Oleg Alexandrov | `fix(engine): patch run guards + sync stale test suite (v2.1.1)` |
| 48 | `07f2fb96` | 2026-05-14 | Oleg Alexandrov | `add documentation and metadata for project analysis and workflow orchestration` |

Neither commit carries the `Co-Authored-By: Claude` trailer this project's automated finalize commits use, and both predate this repository's earliest `insertIntoUnreleased()`-authored bullet in the `[Unreleased]` section. `insertIntoUnreleased()` itself cannot produce a second `### Changed` heading: `nextH3Index()` treats any `###`- or `##`-prefixed line as the end of the current category body, so a call that finds an existing `### Changed` heading always writes inside it, and a call that doesn't finds none anywhere in the block (there being only one at the time) and appends exactly one. The two-heading state is a **historical artifact of manual editing that predates automated CHANGELOG writing in this section**, not a live defect in the writer. Constraint 4 of §4.4 is satisfied — the accumulated file content itself may still warrant manual cleanup, but that edits data, not logic, and is out of this spec's scope.

### 4.4 Required Fix

The obvious remedy is barred: **making the bullets specific again would re-introduce the RC-11 leak §2 exists to prevent.** Genericness is not an accident or an oversight; it is the containment fix. Any resolution MUST satisfy all four constraints from the prior analysis:

1. **RC-11 holds.** No spec artifact ID, task ID, or phase designator may re-enter generated CHANGELOG text. *(Unaffected by this fix — no change to `buildChangelogBullet()`.)*
2. **Idempotence holds.** Re-running finalize without new work must not append a second identical entry.
3. **Real work produces a record.** Two cycles that changed different things must be distinguishable in release notes.
4. **The duplicate-heading anomaly is root-caused first** (§4.3) — done above.

**Design decision — what constitutes a release**: magic-spec cannot observe a downstream consumer project's release event (a pushed git tag, an `npm publish`, an App Store submission — the engine has no visibility into any of them), so rotation MUST NOT be inferred from any signal finalize can see on its own — not `.design/.version` (bumps on nearly every workflow invocation, per [l2-engine-finalization.md](l2-engine-finalization.md)), and not `.magic/.version` (bumps on `.magic/` content changes via C14, which correlates with engine-improvement work, not with a consumer's product release). The only owner who can name that event is the person triggering it. Rotation is therefore an **explicit, opt-in action**, never a side effect of `finalize`.

```plaintext
New: node .magic/scripts/executor.js release-changelog [--version=X.Y.Z] [--date=YYYY-MM-DD]
     - Defaults: --version from `.design/.version`; --date from today (UTC).
     - Calls releaseUnreleased(CHANGELOG.md, version, date) directly — the
       function already exists (§4.2) and is otherwise unchanged.
     - No dry-run flag of its own; inherits utils.isDryRun() the same way
       every other write in this pipeline does.

Changed: finalize.js drops its unused `releaseUnreleased` import (§4.2's
         "imported and never called" state is resolved by removing the
         import, not by adding a call finalize itself has no basis to make).
```

This satisfies all four constraints: RC-11 is untouched (no bullet-shape change); idempotence holds within a rotation window exactly as it does today (`bulletExists()`'s dedup scope is unaffected); distinguishability is restored across windows (a fresh `[Unreleased]` reopens the closed vocabulary — the same real-work shape can appear once per release instead of once per project lifetime); and the maintainer decides when a "release" happens, which is the only place that decision can correctly live. For this project's own dev repo, the natural pairing is running `release-changelog` immediately before pushing the `v*` tag that [l2-release-pipeline.md](l2-release-pipeline.md) §5.1 triggers on.

### 4.5 Field Confirmation & Discoverability Gap (field report, engine 2.1.73)

A field report against a consumer workspace named `engine` reproduced exactly the §4.1 vocabulary-exhaustion defect through the `run` case's single-item branch: root `CHANGELOG.md` already held the literal bullet `Completed task (engine)` from an earlier completion; the next single-task-file `magic.run` finalize produced the identical string, `bulletExists()` correctly suppressed it, and finalize's own stdout reported only `CHANGELOG | skipped (duplicate)` — no further signal.

**Reported hypothesis (rejected)**: the report proposed differentiating the bullet with a phase name, task ID, or `Changes`-field summary. This is exactly what §2's RC-11 analysis and §4.4 constraint 1 already forbid — no spec artifact ID, task ID, or phase designator may re-enter generated CHANGELOG text. A specific bullet would re-open the leak §2 closed; not implemented.

**Actual gap**: §4.4's Required Fix already exists as `.magic/scripts/release-changelog.js`, reachable via `executor.js`'s generic `<script-name>.js` dispatch convention (confirmed — the executor resolves any script name to a same-named file with no case-statement wiring required, so `release-changelog` is already fully callable). But finalize never tells the operator the remedy exists. The `CHANGELOG | skipped (duplicate)` row is the only trace of the suppression event, and it does not name the tool that fixes it. A maintainer who has never read this spec has no way to discover `release-changelog` from the tool's own output — confirmed against this repository's own root `CHANGELOG.md`, whose `[Unreleased]` section (lines 8-201) has never been rotated despite the fix having landed 2026-08-07.

#### Required Fix

When `finalize.js`'s CHANGELOG row reports `deduped`, append an actionable hint naming the remedy:

```plaintext
BAD : | CHANGELOG | skipped (duplicate) |
GOOD: | CHANGELOG | skipped (duplicate — run 'release-changelog' to rotate [Unreleased]) |
```

This is a diagnostics-surface change only — `changelogResult.deduped`'s value, `bulletExists()`'s dedup logic, and `buildChangelogBullet()`'s output are all untouched. RC-11 is unaffected (§4.4 constraint 1 still holds: no bullet-shape change).

## 5. Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)):

- `buildChangelogBullet('spec', workspace, [oneAddedSpecFile])` must contain **no** spec-derived identifier — asserted against the function's return value directly, not against a written `CHANGELOG.md`, since only a real invocation touches that (§2).
- A `magic.run` fixture with one whitelist-matched file plus one non-whitelisted file changed in the same tree must assert: significance and version bump still key off the whitelist subset alone; the stdout listing names both files (§3).
- **§4 coverage** — two finalize-adjacent assertions, now unblocked by §4.3's root-cause:
  - `release-changelog`'s CLI, given a `CHANGELOG.md` fixture with bullets under `[Unreleased]`, must rotate them under a `## [X.Y.Z] - {date}` heading and leave a fresh empty `[Unreleased]` behind — asserted via `releaseUnreleased()` directly (it is not new logic, just newly invoked).
  - Two `appendBullet()` calls with identical bullet text separated by a `releaseUnreleased()` rotation must both land in the file (once in the now-released section, once in the fresh `[Unreleased]`) — the regression this fix targets: distinguishability restored across rotation windows.
  - `finalize.js` must not reference `releaseUnreleased` anywhere in its source (import removal, §4.4) — grep-based assertion, not a behavioral one.
- A `magic.run` fixture where the produced bullet already exists in `[Unreleased]` must assert the CHANGELOG stdout row names `release-changelog` (§4.5) — a string-content assertion on `emitSuccess()`'s output.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/lib/commit-suggester.js` | Composes the CHANGELOG bullet text (§2, §4.1); commit-message composition retired 2026-08-27 (SC-3 retirement) |
| `.magic/scripts/lib/changelog-writer.js` | `appendBullet()` dedup and `releaseUnreleased()` rotation (§4.1, §4.2, §4.4) |
| `.magic/scripts/release-changelog.js` | New (§4.4) — explicit, opt-in CLI invoking `releaseUnreleased()`; not called from `finalize.js` |
| `.magic/scripts/finalize.js` | Success-path file-set input (§3.2); no longer imports `releaseUnreleased` (§4.4); deduped-CHANGELOG hint surfacing (§4.5) |
| `.magic/scripts/lib/significance.js` | Whitelist evaluation — the set §3 must stop conflating with the full diff |
| `CHANGELOG.md` | The product file all of the above writes into; carries the §2 historical leaks and the §4.3 historical duplicate heading |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 2.0.0 | 2026-08-27 | Agent | **Commit-message composition retired** by explicit user directive, alongside SC-3/SC-3.1 in [l1-session-continuity.md](l1-session-continuity.md). Overview and §1 Motivation reworded to drop the suggested commit message from this spec's scope. §2's RC-11 defect record annotated: `buildSummary()`'s commit-message-header `artifactId()` usage no longer exists, retained as historical record only. §3 renamed from "Non-Whitelisted File Visibility (SC-3.1)" to "Stdout Listing Completeness"; its Required Fix rescoped to `emitSuccess()`'s stdout listing alone, dropping `buildCommitMessage()`. §5 Regression Coverage's §3 bullet dropped its commit-body assertion. Canonical References' `commit-suggester.js` row updated to CHANGELOG-bullet composition only. Status reverted `Stable → RFC` (Amendment Rule, major version); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.2.0 | 2026-08-22 | Agent | §4.5 added — a field report (engine 2.1.73) against a consumer workspace named `engine` confirmed the §4.1 vocabulary-exhaustion defect surfaces exactly as predicted, via the `run` case's single-item branch. The report's proposed fix (interpolate a phase/task differentiator into the bullet) was rejected as a direct RC-11 violation already barred by §4.4 constraint 1. The actual gap: §4.4's `release-changelog` remedy already exists and is reachable via `executor.js`'s generic dispatch convention, but finalize's `CHANGELOG \| skipped (duplicate)` stdout row never names it, leaving operators with no way to discover the fix from the tool's own output — confirmed against this repository's own unrotated `[Unreleased]` section (lines 8-201, unchanged since 2026-05-07). Required Fix: the deduped stdout row must append an actionable hint naming `release-changelog`; no change to bullet content, dedup logic, or RC-11 compliance. §5 gained the corresponding regression-coverage obligation. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.1.0 | 2026-08-07 | Agent | §4.3 root-caused: both `### Changed` headings inside `[Unreleased]` trace via `git blame`/`git show` to two direct, human-authored commits a week apart (`aea88015` 2026-05-07, `07f2fb96` 2026-05-14), predating any automated writer involvement in the section — not a live defect in `insertIntoUnreleased()`. §4.4 converted from stated constraints to a `Required Fix`: rotation MUST be an explicit, opt-in `release-changelog` executor subcommand rather than an automatic side effect of `finalize`, because magic-spec has no signal it can observe (`.design/.version`, `.magic/.version`) that reliably means "a downstream consumer released their product" — only the maintainer triggering a real release event knows that. `finalize.js` drops its now-dead `releaseUnreleased` import. §5 gained the corresponding regression-coverage obligations. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.0.0 | 2026-08-07 | Agent | Initial Stable version. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §7 (RC-11 generator containment) and §9 (SC-3.1 non-whitelisted file visibility) at that spec's v2.0.0 decomposition, triggered by `SPEC_BLOAT` at 367 lines against a 300 threshold. Content relocated verbatim apart from renumbering and cross-reference retargeting; §2.2 gained a note that the historical leaks remain in the shipped `CHANGELOG.md` deliberately. New §4 — **CHANGELOG Entry Suppression**: `buildChangelogBullet()`'s vocabulary is closed and tiny (3 producible strings for `task`, 2 for `rule`, 3 for `run`), and `appendBullet()` dedups on normalized text, so once a shape appears in `[Unreleased]` every later cycle emitting it writes nothing — observed live three times in one session. Compounding cause verified by grep: `releaseUnreleased()`, the rotation that would restore the vocabulary, is imported by `finalize.js` and called by nothing, so `[Unreleased]` has accumulated 192 lines spanning engine 2.1.3-2.1.66. §4.3 records a structural anomaly found during verification — two `### Changed` sections inside `[Unreleased]`, defeating dedup — as **observed but not root-caused**, with the leading truncation hypothesis explicitly tested and eliminated. §4.4 states constraints rather than a fix, because the obvious remedy (specific bullets) is exactly what RC-11 forbids, and because wiring in rotation first requires deciding what constitutes a release. |
