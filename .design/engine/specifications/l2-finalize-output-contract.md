# Finalize Pipeline — Output Contract

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Defect record and required-fix contract for everything the finalize pipeline **emits**: the suggested commit message, the stdout artifact listing, and the bullets written into the product's root `CHANGELOG.md`. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §7/§9 at that spec's v2.0.0 decomposition; its sibling [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) owns the `STATE.md` correctness surface, and the parent retains the pipeline contract itself.

The unifying property: everything here crosses a boundary the review gates do not watch. A CHANGELOG bullet is generated text written straight into a product file; a commit message is what the user reads to decide what they are staging. Neither passes a Coder or Code-reviewer diff.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) — RC-11 (Generator Self-Containment) binds §2's CHANGELOG-bullet output.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-3/SC-3.1 (commit suggestion guarantee, message completeness) bind §3.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Parent spec: pipeline contract and module inventory.
- [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) — Sibling: the `STATE.md` correctness surface.
- [l2-test-suite.md](l2-test-suite.md) — Carries the regression-coverage mandate.

## 1. Motivation

Two of this pipeline's outputs land somewhere no human reviews before the fact:

- **CHANGELOG bullets** are composed by `commit-suggester.js` and inserted by `changelog-writer.js` directly into a product file. No Coder authors the text; no Code-reviewer sees it as a diff. The containment gates RC-5/RC-6 therefore never apply, which is why RC-11 binds the *generator* instead.
- **Commit messages and the stdout listing** are what the user reads to decide what to stage. An omission there defeats the review step the suggestion exists to support.

Defects in this class are quiet by construction — they produce plausible-looking output that is wrong in a way only cross-checking against the real diff or the real file reveals.

## 2. Generator Containment (RC-11)

`buildChangelogBullet()` in `commit-suggester.js` is written straight to the product's root `CHANGELOG.md` via `changelog-writer.js`'s `appendBullet()` — no Coder authors this text, no Code-reviewer reviews a diff of it, so [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)'s **RC-5/RC-6 gates never see it**. RC-11 binds this generator exactly as RC-1/RC-2 bind hand-authored text: its output must never embed a spec's **artifact ID** — the identifier obtained by stripping the `l1-`/`l2-` prefix and `.md` extension from the spec's filename (`artifactId()` in this same module).

### 2.1 The Defect (field report, engine 2.1.49)

The `spec` case of `buildChangelogBullet()` had two branches keyed on `specs.length`:

- `specs.length > 1` → `` `${verb} ${specs.length} specifications (${workspace})` `` — generic, safe.
- `specs.length === 1` → `` `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})` `` — interpolates the artifact ID, **violating RC-11**.

The `run` case's own single-item branch (`` `Completed task (${workspace})` `` — no task ID interpolated) already demonstrated the correct shape; the `spec` case's single-item branch was the outlier, not the pattern.

`artifactId()` is legitimately used elsewhere in this same module (`buildSummary()`, for the git commit-message header) — that usage is **not** a violation: commit messages are git metadata, exempt under RC-8. The violation is specific to text that reaches a product file: `buildChangelogBullet()`'s return value only.

### 2.2 Required Fix

`buildChangelogBullet()`'s `spec` case, `specs.length === 1` branch, must drop the `artifactId()` interpolation and return a generic bullet — matching the shape its own multi-item branch and the `run` case's single-item branch already use:

```plaintext
BAD : `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})`
GOOD: `${verb} a specification (${workspace})`
```

No other branch of `buildChangelogBullet()` (`task`, `run`, `rule`) interpolates an SDD-layer identifier — this fix is scoped to the one outlier branch.

> The historical leaks this fix stopped are still visible in the repository's own `CHANGELOG.md` (`Updated specification \`engine-core\` (engine)`, `Completed task \`phase-9\` (engine)` and ~15 siblings). Those entries predate the fix and are left in place: rewriting shipped release notes to retrofit a containment rule would falsify the record. §4 addresses what happens to that accumulated section going forward.

## 3. Non-Whitelisted File Visibility (SC-3.1)

### 3.1 The Defect

`main()`'s success branch built both the stdout `### Changed artifacts` listing (`emitSuccess()`) and the suggested commit message's `Modified files:` body (`buildCommitMessage()`) from `sig.files` alone — the same whitelist-filtered set `computeSignificance()` returns to decide whether a version bump is warranted. Significance and message completeness are two different questions collapsed onto one file set: "should this bump the version" (correctly scoped to `.design/{ws}/...`) and "what should the commit message tell the user they changed" (should reflect the real working-tree diff) are not the same question, and the whitelist only answers the first.

Reproduced against this repository's own history — no synthetic fixture needed, the defect is visible in a commit already on `master`. Commit `b96ce07` (`chore(engine): complete phase-14`, a `magic.run` finalize) suggested a commit body naming exactly two files, while `git show --stat b96ce07` shows the commit the user actually made spans **17** — including `.magic/` C14-sync files, root docs, and, the case that matters most in a consumer project, the task's own application-code deliverable (`dev/scripts/sync-skills.js`, `dev/tests/engine.js`). None of the 15 omitted files appeared anywhere in finalize's stdout either.

For `magic.run` this is the common case, not an edge case: its whitelist is pure SDD bookkeeping — the application code a task implements is, by construction, never inside it.

### 3.2 Required Fix

Two file sets already exist in the pipeline and were being collapsed into one where they should stay separate:

- `sig.files` (whitelist-filtered) — correctly drives `deriveType()`, `deriveScope()`, `buildSummary()`, and `deriveChangelogCategory()`/`buildChangelogBullet()`. These derive the *semantic* nature of the change and must stay scoped to SDD artifacts.
- The full working-tree diff — already computed, but originally only for the SC-3 non-bumping fallback path.

`buildCommitMessage()`'s body enumeration and `emitSuccess()`'s stdout listing must read the full `gitChangedPaths(projectRoot)` result, capped at the same `MAX_FILES = 15` the fallback path uses, with a `(+N more changed file(s))` suffix beyond the cap:

```plaintext
BAD : buildCommitMessage({ ..., files: sig.files })
      // header derivation AND body enumeration both read the whitelist subset
GOOD: buildCommitMessage({ ..., files: allChangedFiles, headerFiles: sig.files })
      // body enumerates every changed file; header derivation still reads only the whitelist subset
```

The header-derivation functions keep their `sig.files`-only input; only body enumeration widens.

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

### 4.3 An Unexplained Structural Anomaly

While verifying the above, `[Unreleased]` was found to contain **two separate `### Changed` sections**, with the duplicate bullets appearing once in each. Since `bulletExists()` scopes its check to one category body, a second heading defeats dedup for every bullet in the first — which is the immediate reason duplicates exist in a file whose writer is idempotent.

The mechanism that produced the second heading is **not diagnosed**. The leading hypothesis was tested and eliminated: `insertIntoUnreleased()` bounds the Unreleased block with `nextH2Index()`, so a stray `## `-form line inside the section would truncate the block and hide the first `### Changed` from the category probe — but no such line exists between the `[Unreleased]` heading and the next version heading. Recorded as observed-but-unexplained rather than guessed at; the implementer must root-cause it before fixing, since the correct fix differs depending on whether the duplicate is a live writer bug or a historical artifact predating the current insert logic.

### 4.4 Required Fix — Constraints, Not a Recipe

The obvious remedy is barred: **making the bullets specific again would re-introduce the RC-11 leak §2 exists to prevent.** Genericness is not an accident or an oversight; it is the containment fix. Any resolution MUST satisfy all four:

1. **RC-11 holds.** No spec artifact ID, task ID, or phase designator may re-enter generated CHANGELOG text.
2. **Idempotence holds.** Re-running finalize without new work must not append a second identical entry — the dedup exists for a real reason and removing it trades one defect for another.
3. **Real work produces a record.** Two cycles that changed different things must be distinguishable in release notes, or the CHANGELOG stops being a record of what happened.
4. **The duplicate-heading anomaly is root-caused first** (§4.3), since a fix layered over an unexplained structural bug inherits it.

Rotation (§4.2) is the most promising direction — it makes the vocabulary reusable per release rather than per project lifetime, and the function already exists — but wiring `releaseUnreleased()` into finalize raises its own question this spec does not settle: **what event constitutes a release** in a project whose `.design/.version` patch-bumps on nearly every workflow invocation. Answering that is a design decision, not an implementation detail, and it is the reason this section states constraints rather than a `Required Fix` block.

## 5. Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)):

- `buildChangelogBullet('spec', workspace, [oneAddedSpecFile])` must contain **no** spec-derived identifier — asserted against the function's return value directly, not against a written `CHANGELOG.md`, since only a real invocation touches that (§2).
- A `magic.run` fixture with one whitelist-matched file plus one non-whitelisted file changed in the same tree must assert: significance and version bump still key off the whitelist subset alone; the commit body names both files; the stdout listing names both files (§3).
- **Open obligation (§4):** no coverage exists for entry suppression, and none should be written before §4.3 is root-caused — a test pinning current behavior would pin the anomaly along with it. Once resolved, coverage must assert that two finalize invocations representing *different* real work produce two distinguishable CHANGELOG records, which is the property §4.1 shows is currently violated.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/lib/commit-suggester.js` | Composes the commit message and the CHANGELOG bullet (§2, §3, §4.1) |
| `.magic/scripts/lib/changelog-writer.js` | `appendBullet()` dedup and `releaseUnreleased()` rotation (§4.1, §4.2) |
| `.magic/scripts/finalize.js` | Success-path file-set input (§3.2); imports `releaseUnreleased` without calling it (§4.2) |
| `.magic/scripts/lib/significance.js` | Whitelist evaluation — the set §3 must stop conflating with the full diff |
| `CHANGELOG.md` | The product file all of the above writes into; carries the §2 historical leaks and the §4.3 anomaly |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-08-07 | Agent | Initial Stable version. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §7 (RC-11 generator containment) and §9 (SC-3.1 non-whitelisted file visibility) at that spec's v2.0.0 decomposition, triggered by `SPEC_BLOAT` at 367 lines against a 300 threshold. Content relocated verbatim apart from renumbering and cross-reference retargeting; §2.2 gained a note that the historical leaks remain in the shipped `CHANGELOG.md` deliberately. New §4 — **CHANGELOG Entry Suppression**: `buildChangelogBullet()`'s vocabulary is closed and tiny (3 producible strings for `task`, 2 for `rule`, 3 for `run`), and `appendBullet()` dedups on normalized text, so once a shape appears in `[Unreleased]` every later cycle emitting it writes nothing — observed live three times in one session. Compounding cause verified by grep: `releaseUnreleased()`, the rotation that would restore the vocabulary, is imported by `finalize.js` and called by nothing, so `[Unreleased]` has accumulated 192 lines spanning engine 2.1.3-2.1.66. §4.3 records a structural anomaly found during verification — two `### Changed` sections inside `[Unreleased]`, defeating dedup — as **observed but not root-caused**, with the leading truncation hypothesis explicitly tested and eliminated. §4.4 states constraints rather than a fix, because the obvious remedy (specific bullets) is exactly what RC-11 forbids, and because wiring in rotation first requires deciding what constitutes a release. |
