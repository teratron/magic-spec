# Engine Finalization Library

**Version:** 1.11.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Internal helper library (`scripts/lib/`) that implements the finalization protocol — automatic version bumps, CHANGELOG entries, commit message suggestions, phase archival, and git utilities. These modules are invoked exclusively by `finalize.js` via `executor.js finalize`. The finalize pipeline is also the single choke point for the session-continuity guarantees SC-2 (post-workflow `STATE.md` update) and SC-3 (commit suggestion guarantee).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2/SC-3 invariants carried by the finalize pipeline (§5).
- [l2-engine-automation.md](l2-engine-automation.md) — Covers the top-level automation scripts that consume this library.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) — RC-11 (Generator Self-Containment) binds `commit-suggester.js`'s CHANGELOG-bullet output (§7).
- [l2-engine-diagnostics.md](l2-engine-diagnostics.md) — Diagnostics digest that this pipeline drains and renders in its terminal block (§11).

## 1. Motivation

The finalization protocol (§3 of `rules/MAGIC.md`) requires several coordinated writes across version files, CHANGELOG, and phase archives. Rather than embedding this logic in `executor.js`, it is decomposed into focused single-responsibility modules in `scripts/lib/`.

## 2. Library Modules

| Module | Responsibility |
| --- | --- |
| `changelog-writer.js` | Appends a given bullet to root `CHANGELOG.md` in Keep-a-Changelog form — pure insertion, does not compose bullet text. |
| `commit-suggester.js` | Composes the Conventional Commits message **and** the CHANGELOG bullet text itself (`buildChangelogBullet`) — the two share the same file-classification logic, so `finalize.js` calls both from here before handing the bullet to `changelog-writer.js` for insertion. Bound by RC-11 (§7): its output is written straight to a product file with no human review step. |
| `git-utils.js` | Read-only git helpers: diff detection, staged-file enumeration, mtime queries. |
| `phase-archiver.js` | Detects `status: Done` phase files and moves them to `archives/tasks/`; rewrites `TASKS.md` link references. Eligibility predicate governed by §6. |
| `project-version.js` | Reads and writes `.design/.version`; computes next semver bump (major/minor/patch). |
| `significance.js` | Evaluates whether changed artifacts fall within the whitelist that triggers a version bump. |

## 3. Invocation Contract

All modules are internal — they export functions consumed only by `finalize.js`. No workflow or spec file should reference individual `lib/` modules directly. The public API is:

```plaintext
executor.js finalize --workflow=<spec|task|run|rule> [--dry-run] [--no-bump] [--no-changelog] [--no-commit-msg]
```

## 4. Opt-Out Mechanism

Controlled by `MAGIC_FINALIZE=0` (env) or `finalization.enabled: false` in `workspace.json`. When disabled, all `lib/` modules are skipped and `executor.js` exits with `⏭️ No significant changes detected`.

## 5. Session-Continuity Integration `[ADDED]`

Implements SC-2 and SC-3 of [l1-session-continuity.md](l1-session-continuity.md) for every `--workflow` value (`spec|task|run|rule`):

### 5.1 State Update Step (SC-2)

After significance evaluation and phase archival, the pipeline patches the active workspace's `STATE.md` via the `update-state` utility (`.magic/scripts/update-state.js`):

- `Updated` — invocation timestamp.
- `Status` — **not patched by this step.** `updateSessionState()` calls `updateState(wsDir, { nextAction }, { autoProgress: true })` — `status` is never a key of that patch, so the field keeps whatever value an earlier explicit `--status=` call (`task.md` plan write-back, `run.md` phase transitions) last set. This corrects a previous claim in this section that `Status` is "recomputed from plan/task state" here; no code path in this step does that. Left accurate only as long as those explicit call sites stay in sync — a latent gap, not fully closed by this amendment (see §8.7).
- Progress indicators — phase and overall counters, when `TASKS.md` is present. The recompute **merges, never clobbers**: only counter lines (`Label: [done/total] …`, including template `{filled}/{total}` placeholders) inside the `## Progress` fence are engine-owned and replaced; any other line is treated as hand-authored session narrative and preserved below the fresh counters. Silently discarding the operator's Progress notes on a routine finalize is an SC-2 defect — and so, per SC-2.3, is silently discarding the phase-level counter itself when the recompute can't locate it (§8.2).
- `Next Action` — the computed next step (pipeline order per DA-6, plan-complete resolution per SC-2.1, Blocked-phase precedence per SC-2.1(a) — §8.1). The synthesized value is screened at the computation's single exit against SC-2.2: exactly one command, never `/magic.spec` or `/magic.analyze`. A screened-out value degrades to the `/magic.task` funnel with a warning — finalize is non-blocking and never aborts over a recommendation string.

The step runs even when the significance whitelist does not hit — live memory must reflect every completed command, not only version-bumping ones. Failures are non-blocking: a warning is printed and finalize continues (live memory staleness is reported, never fatal).

### 5.2 Commit Suggestion Guarantee (SC-3)

`commit-suggester.js` gains a fallback mode: when the significance whitelist misses but the git working tree changed during the invocation, finalize still emits a suggested Conventional Commits message, labeled `(non-bumping)` — no version bump, no CHANGELOG entry, message only. The existing hard rule is unchanged: no write-side git operation is ever invoked; the user commits manually.

### 5.3 Exemptions

Read-only workflows (analyze, graph, status) never invoke finalize; they inherit no SC-2/SC-3 obligations. `--dry-run` previews the state patch without writing it.

## 6. Phase Archival Eligibility (Precision) `[ADDED]`

This section pins the eligibility predicate for the **C8 (Phase Archival)** convention — the move of a completed phase file from `tasks/` to `archives/tasks/`. `rules/MAGIC.md` §4 states a phase is archivable when its file has `status: Done` and "no remaining `- [ ]` items". The word *items* is normative and means **unchecked Atomic Checklist line items**, not any textual occurrence of the `- [ ]` sequence. The eligibility predicate MUST:

1. Match an unchecked item only as a **checklist line** — anchored at line start with optional indentation (e.g. `^\s*- \[ \]`), inside the phase file's checklist region.
2. **Ignore** `- [ ]` appearing in prose, task `Notes`, `Verify` lines, fenced code, or inline code-spans (backticks). A phase whose tasks merely *describe* checkbox syntax is still archivable when its real checklist is fully checked.

A substring scan (`content.includes('- [ ]')`) over the whole file is **non-conformant**: it false-positives on documentation of checkbox syntax and silently suppresses archival. This precision is the acceptance criterion for the `allChecked` helper in `phase-archiver.js`; its regression coverage belongs to the finalize-pipeline harness mandate ([l2-test-suite.md](l2-test-suite.md) §Script-Level Regression Harness).

## 7. Generator Containment (RC-11) `[ADDED]`

`buildChangelogBullet()` in `commit-suggester.js` is written straight to the product's root `CHANGELOG.md` via `changelog-writer.js`'s `appendBullet()` — no Coder authors this text, no Code-reviewer reviews a diff of it, so [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)'s **RC-5/RC-6 gates never see it**. RC-11 binds this generator exactly as RC-1/RC-2 bind hand-authored text: its output must never embed a spec's **artifact ID** — the identifier obtained by stripping the `l1-`/`l2-` prefix and `.md` extension from the spec's filename (`artifactId()` in this same module).

### 7.1 The Defect (field report, engine 2.1.49)

The `spec` case of `buildChangelogBullet()` has two branches keyed on `specs.length`:

- `specs.length > 1` → `` `${verb} ${specs.length} specifications (${workspace})` `` — generic, safe.
- `specs.length === 1` → `` `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})` `` — interpolates the artifact ID, **violating RC-11**.

The `run` case's own single-item branch (`` `Completed task (${workspace})` `` — no task ID interpolated) already demonstrates the correct shape; the `spec` case's single-item branch is the outlier, not the pattern.

`artifactId()` is legitimately used elsewhere in this same module (`buildSummary()`, for the git commit-message header) — that usage is **not** a violation: commit messages are git metadata, exempt under RC-8. The violation is specific to text that reaches a product file: `buildChangelogBullet()`'s return value only.

### 7.2 Required Fix

`buildChangelogBullet()`'s `spec` case, `specs.length === 1` branch, must drop the `artifactId()` interpolation and return a generic bullet — matching the shape its own multi-item branch and the `run` case's single-item branch already use:

```plaintext
BAD : `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})`
GOOD: `${verb} a specification (${workspace})`
```

No other branch of `buildChangelogBullet()` (`task`, `run`, `rule`) interpolates an SDD-layer identifier — this fix is scoped to the one outlier branch.

### 7.3 Regression Coverage (RC-11 enforcement)

Per RC-11, the enforcement surface for generator output is regression-test coverage, not a role-card gate. The finalize-pipeline harness ([l2-test-suite.md](l2-test-suite.md)) must add a case asserting `buildChangelogBullet('spec', workspace, [oneAddedSpecFile])` contains **no** spec-derived identifier — pinning the fixed shape so the single-item branch cannot regress back to interpolating `artifactId()`.

## 8. STATE.md Accuracy Fixes (SC-1.1, SC-2.1(a), SC-2.3) `[ADDED]`

All five defects below were found across three field reports against the same engine version (2.1.58) and share one root symptom: the SC-2 state-update step made `STATE.md` **less** accurate than before the update it was supposed to refresh.

### 8.1 The Next Action Defect

`synthesizeNextAction()` in `finalize.js`'s tier-2 lookup (phase files, canonical two-level format) reads each `tasks/phase-{N}.md` in order and returns its first open checklist match with no awareness of phase status:

```js
for (const file of phaseFiles) {
    const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    const openTask = content.match(openTaskRe);
    if (openTask) return `Execute ${openTask[1]} ${openTask[2]} via /magic.run ${workspace}`;
}
```

A phase recorded `status: Blocked` in its own frontmatter still has an open (`- [ ]`) checklist line for the blocked task — Blocked is not Done — so this loop returns it unconditionally. Verified by direct reproduction against engine 2.1.62: a phase file with `status: Blocked` frontmatter, a `TASKS.md` registry row reading `` `Blocked` ``, and one open checklist item yields `Execute T-1A01 {title} via /magic.run {ws}` byte-for-byte, while `STATE.md`'s own `**Status:** Blocked` and `## Blockers` entry are left untouched by the same call — the file becomes internally contradictory, not just stale.

**Required fix** (SC-2.1(a)): before returning a phase's open-task match, check that phase's `status:` frontmatter (already available in `content`) and its `TASKS.md` registry row. Either reading `Blocked` MUST redirect the return value away from an execute-style recommendation — e.g. `` `Resolve blocker on ${openTask[1]} (${workspace}) — see STATE.md ## Blockers, then run /magic.run ${workspace}` `` — rather than either silently falling through to the next phase (which would recommend a *different*, possibly out-of-order phase) or leaving the field untouched (which would go stale the next time the blocker's own detail changes). The redirected value still passes through the SC-2.2 single-exit screen unchanged.

### 8.2 The Progress-Granularity Defect

`computeProgress()` in `update-state.js` derives the active phase's counter line from an inline heading inside `TASKS.md` itself:

```js
const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
if (section) { /* only path that produces a Phase-N line */ }
```

That heading exists only in the legacy single-file task layout. The canonical two-level layout (`tasks/phase-{N}.md`, the format this engine's own workspace uses) never contains it, so `section` is always `null` and the phase-line branch never fires — for **every** project on the modern layout, not only Blocked ones. Verified by direct reproduction: a healthy, non-Blocked, 2-of-5-done phase in two-level format loses its `Phase 1: [2/5] …` counter on the very next `autoProgress` recompute, leaving only the aggregate `Overall: [0/1]` (phase-count, not task-count) line. This engine's own `.design/engine/STATE.md` has carried an `Overall`-only `## Progress` block for its entire history as a silent instance of the same gap.

**Required fix** (SC-2.3): `computeProgress()`'s phase-line branch must fall back to reading `tasks/{active-phase-file}.md` directly — mirroring the file lookup `synthesizeNextAction()`'s tier-2 already performs — and count `- [x]`/`- [ ]` lines across that file, when no inline `### Phase {N} Checklist` section is found in `TASKS.md`. The two-level lookup is the common case and should not depend on locating an inline heading that layout never has.

### 8.3 The Status Field Collision (SC-1.1)

`run.md` §2.5 documents two call sites for `--status=`, and they disagree about what the flag means:

```plaintext
# Per-task transition:
update-state --workspace={ws} --task="{T-ID} {Title}" --status={Done|Blocked} --next-action="..."

# Phase-start transition:
update-state --workspace={ws} --phase="{N+1} — {Phase Name}" --status=Active
```

`update-state.js` has exactly one `status` handler (`fieldMap.status`, mapped to the top-level `**Status:**` field) — there is no separate task-status field in the `STATE.md` schema for the first call site to target. Verified by direct reproduction against engine 2.1.62: invoking the documented per-task form (`--task="T-1A01 Scaffold the app" --status=Done`) against a `STATE.md` with `**Phase:** 1` / `**Status:** Active` produces `**Status:** Done` — a value the field's own confirmed vocabulary (`Active | Blocked | Paused`, SC-1.1) does not even contain — after exactly one task of a five-task phase completed. `run.md`'s *own* Pause Propagation logic (a different call site, firing only when the whole phase stalls) already scopes `--status=Blocked` correctly to the phase; §2.5's per-task call is the outlier.

**Required fix**: drop `--status={Done|Blocked}` from the per-task update-state invocation entirely. A single task's completion is already tracked authoritatively by its checklist line and Detailed Tracking entry in `tasks/phase-{N}.md` — `STATE.md` needs no redundant, and here actively harmful, copy of it. The per-task call becomes `update-state --workspace={ws} --task="{T-ID} {Title}" --next-action="..."`; the phase-level `Status` field changes only at its own documented transition points (phase start, Pause Propagation, phase completion).

### 8.4 The Progress Over-Classification Defect (SC-2)

`update-state.js`'s merge-not-clobber classifier (`counterRe`, referenced in §5.1) is:

```js
const counterRe = /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/;
```

`[^:\n]+` accepts **any** label, but `computeProgress()` only ever emits two: `Overall` and `Phase {N}`. A hand-authored line using the same `{Label}: [n/m]` shape for a different purpose — the field report used `Specification: [3/3] complete`, `Plan: [1/1] complete`, `Implementation: [1/5] in progress — see notes below` — matches `counterRe`, is excluded from `preserved`, and is never regenerated (`computeProgress()` doesn't know those labels), so it is simply gone. Verified by direct reproduction: a `## Progress` fence with those three custom lines plus `Phase 1: […]` and `Overall: […]` was recomputed down to `Overall: […]` alone — four of five lines lost, three of them lines the "merge, never clobbers" contract (§5.1) explicitly promises to preserve as narrative.

**Required fix**: narrow `counterRe` to the exact label set `computeProgress()` currently produces, rather than an open label class:

```plaintext
BAD : /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
GOOD: /^(?:Overall|Phase (?:\d+|\{[^}]*\})):\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
```

The placeholder alternation is needed in **both** halves, and for the same reason. The value half (`{filled}/{total}`) is the familiar one. The label half is easy to miss: the state template ships its phase counter as `Phase {N}: …`, so a label pattern of `Phase \d+` alone does not match a freshly bootstrapped `STATE.md` — the line is demoted to narrative and the placeholder survives the recompute that exists to replace it. Both forms are engine-owned; only the runtime form has a digit. `[MODIFIED]`

Any line whose label is not `Overall` or a phase counter in either form is narrative by definition, however counter-shaped it looks — the classifier's job is to recognize what the engine itself writes, not to guess at operator intent from formatting.

### 8.5 The Progress Replacement-String Injection Defect (SC-2)

The fence rewrite itself, independent of §8.4's classification bug, is:

```js
content = content.replace(progressRe, `$1${body}$3`);
```

`progressRe` has three capture groups (opening fence, fence body, closing fence). `.replace(regex, replacementString)` scans the **entire final replacement string** for JavaScript's special patterns (`$1`-`$9`, `` $` ``, `$'`, `$&`, `$$`) — including inside `${body}`, which is built from arbitrary, engine-uncontrolled narrative text (§5.1's preserved hand-authored lines). A narrative line containing a literal `$` followed by a digit is therefore re-interpreted as a capture-group backreference, splicing a **fragment of the surrounding STATE.md structure into the middle of the narrative**, not merely corrupting the counter it was never near.

Verified by direct reproduction against engine 2.1.62: a preserved two-line narrative note —

```plaintext
Budget check: spend is $1,200 of the
$3,000 sprint allocation — on track.
```

— recomputed to (note this block uses four backticks so the injected triple-backtick below renders as literal text, not a fence break):

````plaintext
Overall: [0/1] ░░░░░░░░ 0%
Budget check: spend is ## Progress

```
,200 of the

```,000 sprint allocation — on track.
````

`$1` was replaced with capture group 1 (`## Progress\n` + the fence opener) and `$3` with capture group 3 (the fence closer), **injecting a spurious closing fence mid-document** — the file's triple-backtick count goes from balanced (2) to unbalanced (3), so every section after the injection point is at the mercy of the renderer's fence-recovery behavior. This is more severe than the other four defects in this section: §8.1-§8.4 misplace or lose *values*; this one corrupts *markdown structure*, and the visible symptom — a two-line entry that reads as torn, its first line truncated mid-word — is exactly what a `$`-digit sequence anywhere in a multi-line narrative note produces, not only in a dollar-amount example.

**Required fix**: replace the string-form replacement with a function-form replacement. A function's return value is used verbatim by `.replace()` — none of `$1`/`$3`'s content is re-scanned for special patterns, because the function *receives* the captured groups as arguments instead of the engine writing them as `$`-syntax into a string the interpreter re-parses:

```plaintext
BAD : content.replace(progressRe, `$1${body}$3`);
GOOD: content.replace(progressRe, (_match, open, _oldBody, close) => `${open}${body}${close}`);
```

No other `.replace()` call site in `update-state.js`, `changelog-writer.js`, or `phase-archiver.js` shares this vulnerability — verified by sweeping every `.replace()` call in the finalize/update-state pipeline: the other capture-group-bearing calls either interpolate engine-controlled values only (semver strings, ISO dates, generated filenames) or use regexes with no capture groups at all, so `$`-digit sequences in their inputs have no group to bind to and pass through as literal text. This fix is scoped to the one call site that combines capture groups with unconstrained narrative content.

### 8.6 Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), all five fixes above need harness cases:

- `synthesizeNextAction()`/`computeNextAction()` called against a Blocked two-level-format fixture must not return an execute-style recommendation naming the blocked task's ID (§8.1).
- `computeProgress()` called against a healthy two-level-format fixture must produce a `Phase {N}: […]` line, not aggregate-only (§8.2).
- A per-task `update-state` call (`--task=`, no `--status=`) must leave the phase-level `Status` field unchanged (§8.3).
- `computeProgress()`'s merge step, given a fence containing `Specification:`/`Plan:`/`Implementation:`-style custom counter-shaped lines alongside `Overall`/`Phase {N}`, must preserve the custom lines and regenerate only `Overall`/`Phase {N}` (§8.4).
- `updateState()` with `autoProgress: true` against a preserved narrative line containing a literal `$1`/`$2`/`$3` sequence must leave that line byte-for-byte unchanged and must not alter the fence's triple-backtick count (§8.5).

### 8.7 Known Gap Not Closed Here

§5.1's `Status` bullet (corrected above) documents that no code path in the SC-2 step actually recomputes `Status` — it is only ever set by explicit `--status=` calls elsewhere in `task.md`/`run.md`. §8.3 fixes one of those call sites (the per-task one, which should not touch `Status` at all); the broader claim that `Status` is ever holistically "recomputed" from plan/task state remains false after this amendment, and is not addressed here — noted so it is not mistaken for closed.

## 9. Non-Whitelisted File Visibility (SC-3.1) `[ADDED]`

### 9.1 The Defect

`main()`'s success branch builds both the stdout `### Changed artifacts` listing (`emitSuccess()`, iterating `ctx.files`) and the suggested commit message's `Modified files:` body (`buildCommitMessage()`) from `sig.files` alone — the same whitelist-filtered set `computeSignificance()` returns to decide whether a version bump is warranted. Significance and message completeness are two different questions collapsed onto one file set: "should this bump the version" (correctly scoped to `.design/{ws}/...` per §significance.js's `WHITELIST`) and "what should the commit message tell the user they changed" (should reflect the real working-tree diff) are not the same question, and only the first one the whitelist actually answers.

Reproduced directly against this repository's own history — no synthetic fixture needed, the defect is visible in a commit already on `master`. Commit `b96ce07` (`chore(engine): complete phase-14`, a `magic.run` finalize) suggested a commit body naming exactly two files:

```plaintext
Modified files:
- .design/engine/STATE.md (+5 -5)
- .design/engine/tasks/phase-14.md (+60 -28)
```

`git show --stat b96ce07` shows the commit the user actually made spans **17 files**, including `.magic/analyze.md`, `.magic/run.md`, `.magic/.checksums`, `.magic/.version` (a C14 engine-metadata sync riding the same working tree), `README.md`, `CONTRIBUTING.md`, and — the case that matters most in a consumer project — `dev/scripts/sync-skills.js` and `dev/tests/engine.js`, both hand-authored by the Coder role as the task's actual deliverable (confirmed via `git log --follow` against both paths). None of the 15 omitted files appear anywhere in finalize's own stdout output either; a user relying on `### Changed artifacts` to review what a `/magic.run` finalize touched has no way to learn these files exist.

For `magic.run` this is the common case, not an edge case: its whitelist (`.design/{ws}/TASKS.md`, `STATE.md`, `archives/**/*`, `tasks/**/*.md`) is pure SDD bookkeeping — the actual application/product code a task implements is, by construction, never inside it. Every `magic.run` finalize whose task produced real source changes reproduces this gap; `b96ce07` is simply the instance this session happened to inspect closely enough to notice. Reported informally, without reproduction steps, as "finalize does not see new application files outside `.design/`" — confirmed by inspecting the repository's own commit history rather than a live repro, since the report gave a symptom, not a test case.

### 9.2 Required Fix

Two file sets already exist in the pipeline and are being collapsed into one where they should stay separate:

- `sig.files` (whitelist-filtered) — correctly drives `deriveType()`, `deriveScope()`, `buildSummary()`, and `deriveChangelogCategory()`/`buildChangelogBullet()`. These derive the *semantic* nature of the change (added a spec, completed a task) and should stay scoped to SDD artifacts — this part is not the defect and must not change.
- The full working-tree diff — already computed once, but only for the SC-3 non-bumping fallback path (`emitFallbackCommitSuggestion()` calls `gitChangedPaths(projectRoot)` directly, capped at `MAX_FILES = 15`). The success path never calls it.

`buildCommitMessage()`'s `Modified files:` body enumeration, and `emitSuccess()`'s `### Changed artifacts` stdout listing, must switch from `sig.files` to the full `gitChangedPaths(projectRoot)` result — capped at the same `MAX_FILES = 15` the fallback path already uses, with a `(+N more changed file(s))` suffix beyond the cap:

```plaintext
BAD : buildCommitMessage({ ..., files: sig.files })
      // header derivation AND body enumeration both read the whitelist subset
GOOD: buildCommitMessage({ ..., files: allChangedFiles, headerFiles: sig.files })
      // body enumerates every changed file; header derivation still reads only the whitelist subset
```

The header-derivation functions (`deriveType`, `deriveScope`, `buildSummary`) keep their existing `sig.files`-only input; only the body-enumeration input widens to the full changed-file set. `emitSuccess()`'s `files` parameter changes the same way, so the stdout the agent relays to the user matches the diff the user is about to commit.

### 9.3 Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), a harness case must add a `magic.run` fixture with one whitelist-matched file (`TASKS.md`, a status flip) plus one non-whitelisted file changed in the same working tree (e.g. a file under `dev/` or `.magic/`), and assert: (a) significance and version bump still key off the whitelist subset alone — unchanged; (b) the suggested commit message's `Modified files:` body names both files; (c) `emitSuccess()`'s stdout `### Changed artifacts` section names both files. This is the inverse of the existing SC-3 fallback tests, which already exercise the no-significant-change path against the full changed-set — this closes the equivalent gap on the significant-change path.

## 10. Line-Cap Guard Defeat by Unbounded Blocking Constraints (SC-1.2) `[ADDED]`

### 10.1 The Defect

`update-state.js`'s line-count guard runs unconditionally at the end of `updateState()`:

```js
const lines = content.split('\n');
if (lines.length > 100) {
    console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruning oldest decision.`);
    // ... removes exactly one `## Recent Decisions` line, only if decLines.length > 1
}
```

This is the file's **only** line-cap enforcement, and it targets exactly one section: `## Recent Decisions`, which already has its own independent 5-entry cap enforced at insert time (`addDecision`'s own prune-to-5 step). `## Blocking Constraints` is structurally different — the template marks it "MANDATORY reading", every discovered anti-pattern is appended with an auto-incrementing `[C-NNN]` ID, and nothing in `update-state.js` ever removes an entry from it. The guard was written as if `## Recent Decisions` were the file's dominant growth source; `## Blocking Constraints` is the one section explicitly designed to grow monotonically over a workspace's lifetime.

Reproduced directly (synthetic workspace, `updateState()` called in a loop with `{ addConstraint: true }`):

| Constraints added | Total lines | `## Recent Decisions` entries remaining | Guard engaged? |
| --- | --- | --- | --- |
| 20 | 74 | n/a (below threshold) | No — never crossed 100 |
| 60 | **110** | 1 (its floor — cannot go lower) | Yes, every call — but nothing left to remove |

At 60 accumulated constraints the file sits **10 lines over the documented ceiling**, `## Recent Decisions` is already pruned down to its 1-entry floor, and every further `addConstraint` call grows the file further while the guard's `console.warn` — unconditional on `lines.length > 100`, not on whether a line was actually removed — keeps printing "Pruning oldest decision" as if the cap were being restored. There is no code path that reports "cap exceeded and nothing left to prune" differently from "cap exceeded, pruned successfully". Reported informally as an operator note that `STATE.md` had reached 94 of 100 lines with a same-cycle suggestion to trim the oldest `## Recent Decisions` entries; the reproduction shows that specific remedy has a hard ceiling of its own (5 entries, floor of 1) and cannot hold the 100-line cap once `## Blocking Constraints` — which this repository's own `STATE.md` already carries one entry of, with clear precedent for accumulating more as new anti-patterns are discovered — becomes the dominant growth vector.

### 10.2 Required Fix

Silently auto-pruning `## Blocking Constraints` the way `## Recent Decisions` is pruned is **not** an acceptable mirror-fix: a Decision is disposable narrative (the template already says older ones "archived to PLAN.md"), but a Blocking Constraint exists specifically because it is safety-critical — deleting the oldest one to make room could silently remove the one anti-pattern warning that prevents a future incident, with the operator never told which entry vanished or why.

The guard must instead distinguish two states it currently reports identically:

1. **Cap restored** — `## Recent Decisions` had an entry above its floor to remove; the file is now ≤ 100 lines (or closer). Current behavior and message are correct here.
2. **Cap exhausted** — `## Recent Decisions` is already at its 1-entry floor and the file remains over 100 lines. This state MUST emit a distinct, non-silent warning (not the reused "Pruning oldest decision" line) directing the operator to manually review and archive stale `## Blocking Constraints` entries — mirroring the archival convention the template's own `## Recent Decisions` comment already establishes for that section, extended in prose to name `## Blocking Constraints` as well. The write still proceeds (`updateState()` must not become a HALT point over a line count), but the operator is told the cap is not actually being held, rather than being told a prune happened when none did.

```plaintext
BAD : console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruning oldest decision.`);
      // fires identically whether or not decLines.length > 1, i.e. whether or not anything was pruned
GOOD: if (decLines.length > 1) {
          console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruned oldest decision.`);
          // ... remove as today
      } else {
          console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}) and ## Recent Decisions ` +
              `is already at its floor — nothing was pruned. Review ## Blocking Constraints for entries to archive.`);
      }
```

### 10.3 Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), a harness case must drive a fixture past 100 lines purely via repeated `addConstraint` calls (no `## Recent Decisions` growth), with `## Recent Decisions` pre-seeded at its 1-entry floor, and assert the guard's stdout output differs from the routine-prune case — i.e. that "cap exhausted, nothing pruned" is observably distinguishable from "cap restored, one entry pruned", not the same log line in both cases.

## 11. Terminal Block Ownership (Diagnostics Digest) `[ADDED]`

The pipeline's stdout gains two sections at its end — an engine diagnostics digest and the next step — governed by [l1-engine-diagnostics.md](l1-engine-diagnostics.md) (DG-5, DG-6) and implemented per [l2-engine-diagnostics.md](l2-engine-diagnostics.md) §4.7. This section records only what changes **for this pipeline**; the digest's collection, taxonomy, and rendering rules are not restated here.

Two structural consequences for `finalize.js`:

1. **The terminal block leaves the path-specific emitters.** Today the auto-commit notice is assembled twice — once inside `emitFallbackCommitSuggestion()` on the non-significant path, once inside `emitSuccess()` on the significant one. It moves into a single `emitTail()` that `main()` calls once on both paths, together with the digest and the next step. Neither `emitSkip()` nor `emitSuccess()` may render any part of the terminal block after this change; that prohibition is what makes DG-5's "same order on every path" checkable rather than aspirational.

2. **`updateSessionState()`'s return value becomes load-bearing.** It already returns `{ updated, dryRun?, nextAction }` on every branch, but `nextAction` is currently consumed by nobody. `emitTail()` prints that exact value (DG-6). The pipeline must not call `computeNextAction()` a second time to obtain it: the guarantee is that the string shown to the user and the string persisted to `STATE.md` are the same one, and a recomputation satisfies the wording while restoring the divergence the invariant exists to close.

This pipeline is also the inventory's largest emitter block — six non-fatal findings across `main()`, `updateSessionState()`, and the CHANGELOG and phase-archival steps ([l2-engine-diagnostics.md](l2-engine-diagnostics.md) §5.1). The drain runs once in `main()`, after every other step, so findings produced by those steps are in the sink before the digest is composed.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/finalize.js` | Pipeline orchestrator; `main()`'s success branch is the site corrected by §9 (`buildCommitMessage`/`emitSuccess` file-set input), and the host of the §11 terminal block |
| `.magic/scripts/lib/diagnostics.js` | Diagnostics collector drained by the §11 terminal block |
| `.magic/scripts/lib/changelog-writer.js` | CHANGELOG append logic |
| `.magic/scripts/lib/commit-suggester.js` | Commit message generation and CHANGELOG bullet composition (RC-11, §7) |
| `.magic/scripts/lib/git-utils.js` | Read-only git helpers |
| `.magic/scripts/lib/phase-archiver.js` | Phase archival and TASKS.md rewrite |
| `.magic/scripts/lib/project-version.js` | `.design/.version` semver management |
| `.magic/scripts/lib/significance.js` | Significance whitelist evaluation |
| `.magic/scripts/update-state.js` | STATE.md patch utility invoked by the state update step (§5.1); hosts the line-cap guard corrected by §10 |
| `.magic/run.md` | Hosts the per-task and phase-transition `update-state` call sites corrected by §8.3 |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.11.0 | 2026-08-07 | Agent | New §11 (Terminal Block Ownership): the pipeline's stdout gains a diagnostics digest and a next-step section at its end, per the new [l1-engine-diagnostics.md](l1-engine-diagnostics.md) DG-5/DG-6. Records only the two structural consequences for this pipeline — the auto-commit notice moves out of `emitFallbackCommitSuggestion()` and `emitSuccess()` into a single `emitTail()` called once from `main()` on both exit paths (the prohibition on path-local rendering is what makes the ordering invariant checkable), and `updateSessionState()`'s hitherto-unconsumed `nextAction` return value becomes the printed string, threaded rather than recomputed. Collection, taxonomy, and rendering rules live in the new specs and are deliberately not restated. Canonical References gained `lib/diagnostics.js`. |
| 1.10.1 | 2026-08-06 | Agent | §8.4's `GOOD` replacement regex corrected: it narrowed the label class to `Phase \d+`, which does not match the state template's own `Phase {N}: [{filled}/{total}]` bootstrap line — applying the example verbatim demotes an engine-owned line to narrative and leaves the placeholder in place, caught by an existing harness case during implementation. Now `Phase (?:\d+\|\{[^}]*\})`, with the placeholder alternation stated for both halves of the pattern rather than the value half alone. Correction of a worked example; the section's reasoning and required behavior are unchanged, so patch and no status transition. |
| 1.10.0 | 2026-08-06 | Agent | New §10 (SC-1.2) — **Line-Cap Guard Defeat by Unbounded Blocking Constraints**: the 100-line guard prunes only `## Recent Decisions`, which already has its own independent 5-entry cap; `## Blocking Constraints` has no cap and no pruning at all, by design (marked "MANDATORY reading" in the template — unlike a Decision, an entry can't be silently deleted without risking loss of safety-critical knowledge). Once Recent Decisions hits its 1-entry floor, the guard has nothing left to remove, yet its `console.warn` fires the same "Pruning oldest decision" message regardless of whether anything was pruned — reproduced directly: 60 accumulated constraints drove a synthetic workspace to 110 lines, 10 over the documented ceiling, with Recent Decisions already exhausted. Fix: the guard must distinguish "cap restored" from "cap exhausted, nothing pruned" with a genuinely different warning in the latter case, directing the operator to manually archive stale Blocking Constraints entries rather than claiming an action that didn't happen. Reported informally as an operator note that `STATE.md` reached 94/100 lines with a same-cycle "trim oldest decisions" suggestion; investigated and reproduced independently, since decision-pruning alone cannot hold the cap once Blocking Constraints dominates growth. Companion invariant: `l1-session-continuity.md` 1.6.0 → 1.7.0 (new **SC-1.2 Line-Cap Enforcement**; §2 Constraints' cap description corrected). |
| 1.9.0 | 2026-08-06 | Agent | New §9 (SC-3.1) — **Non-Whitelisted File Visibility**: `emitSuccess()`'s `### Changed artifacts` listing and `buildCommitMessage()`'s `Modified files:` body are both built from `sig.files`, the significance whitelist's `.design/{ws}/...`-scoped subset — conflating "should this bump the version" with "what should the message tell the user they changed". Reproduced against a real commit already on `master` rather than a synthetic fixture: `b96ce07` (a `magic.run` finalize) suggested a message naming 2 files while the actual commit spanned 17, including `.magic/*` C14-sync files, root docs, and — the case that matters most for a consumer project — the task's own application-code deliverable (`dev/scripts/sync-skills.js`, `dev/tests/engine.js`), which sits outside `.design/` by construction for every `magic.run` task. Fix: widen the body-enumeration/stdout-listing input to the full `gitChangedPaths()` result (already computed for the SC-3 fallback path, now reused on the success path too), capped at the existing `MAX_FILES = 15`; header-derivation (`deriveType`/`deriveScope`/`buildSummary`) keeps reading `sig.files` only — that scoping is intentional and not the defect. Canonical References gained `.magic/scripts/finalize.js`. Reported informally ("finalize does not see new application files outside `.design/`", no reproduction steps) — confirmed by inspecting the repository's own commit history. Companion invariant added: `l1-session-continuity.md` 1.5.1 → 1.6.0 (new **SC-3.1 Commit Message Completeness**). |
| 1.8.0 | 2026-08-06 | Agent | New §8.5 (defects renumber: old 8.5 Regression Coverage → 8.6, old 8.6 Known Gap → 8.7) — **The Progress Replacement-String Injection Defect**: `` content.replace(progressRe, `$1${body}$3`) `` uses a string-form replacement against a 3-capture-group regex, so JavaScript re-scans the *entire* resulting string for `$1`-`$9` patterns — including inside `${body}`, built from unconstrained narrative text. A preserved line containing a literal `$` followed by a digit (a dollar amount, in the reproduction) gets that sequence replaced with the *actual* capture-group content, splicing fragments of the surrounding `## Progress` fence markup into the middle of the narrative and unbalancing the file's triple-backtick count. The most severe of the five §8 defects: the others misplace or lose values, this one corrupts markdown structure. Fix: swap the string replacement for a function replacement, whose return value is used verbatim (§8.5's own text). Swept every `.replace()` call across `update-state.js`/`changelog-writer.js`/`phase-archiver.js`: this is the only site combining capture groups with unconstrained content. Reported informally (no reproduction steps, no version) as "STATE.md's ## Progress tore a two-line entry, truncating the first line" after two prior manual restorations; investigated and reproduced independently against engine 2.1.62 rather than taken at face value, since the report gave nothing to verify directly against. |
| 1.7.0 | 2026-08-06 | Agent | §8 gained two more defects (same day, one further field report) and was reordered: defects now group as §8.1-§8.4, followed by consolidated §8.5 Regression Coverage and §8.6 Known Gap. New §8.3 — `run.md` §2.5's per-task `update-state` call pairs `--task=` with `--status={Done\|Blocked}`, but `update-state.js` has one `status` handler, mapped to the phase-level field; reproduced directly (one task done → phase `Status` becomes `Done`, a value outside SC-1.1's own vocabulary, new this version). Fix: drop `--status=` from the per-task call — task completion is already authoritative in the phase file's checklist. New §8.4 — the merge-not-clobber classifier's `counterRe` matches any `{label}: [n/m]`-shaped line, not only the two labels (`Overall`, `Phase {N}`) `computeProgress()` actually emits, so hand-authored counter-shaped narrative (`Specification:`, `Plan:`, `Implementation:` in the field report) is misclassified as engine-owned and deleted rather than preserved — directly contradicting §5.1's own "merge, never clobbers" promise. Fix: narrow the label alternation to the exact emitted set. Canonical References gained `.magic/run.md`. Field report against engine 2.1.58. |
| 1.6.0 | 2026-08-06 | Agent | Added §8: two independent SC-2 defects sharing one root symptom (the state update makes `STATE.md` less accurate, not more). §8.1 — `synthesizeNextAction()`'s phase-file tier ignores `status: Blocked`, recommending execution of the very task the recorded blocker prevents (SC-2.1(a)); reproduced directly against engine 2.1.62. §8.2 — `computeProgress()`'s phase-counter branch only recognizes the legacy inline `### Phase {N} Checklist` heading, so it silently drops to an aggregate-only line for every project on the canonical two-level `tasks/phase-{N}.md` layout, Blocked or not — including this engine's own workspace, confirmed carrying the gap for its entire history (SC-2.3, new invariant). §5.1's `Status` bullet corrected: no code path in this step recomputes `Status`, contrary to what it previously claimed — §8.4 records this as a known, separate gap. Field report against engine 2.1.58. |
| 1.5.0 | 2026-08-06 | Agent | Added §7 Generator Containment (RC-11): `buildChangelogBullet()`'s `spec` case, single-spec branch, interpolates the spec's artifact ID (`artifactId()`, prefix/extension stripped) into text written straight to root `CHANGELOG.md` — no Coder or Code-reviewer gate mediates generator output, so the leak reached a shipped product file undetected. The multi-spec branch and the `run` case's own single-item branch already use safe generic wording; only this one branch is the outlier. §7.2 states the required fix, §7.3 the regression-coverage obligation. Library Modules table corrected: `commit-suggester.js`, not `changelog-writer.js`, composes the bullet text; `changelog-writer.js` only inserts it. Related Specifications gained `l1-sdd-reference-containment.md`. Field report against engine 2.1.49. |
| 1.4.0 | 2026-08-06 | Agent | §5.1 `Next Action` bullet realigned to SC-2.2: the synthesized value is screened at the computation single exit (exactly one command; never `/magic.spec` or `/magic.analyze`), degrading to the `/magic.task` funnel with a warning rather than aborting. Supersedes the 1.3.0 wording that cited SC-2.1 workflow-sensitive rule, withdrawn in l1-session-continuity 1.3.0. |
| 1.3.0 | 2026-07-18 | Agent | §5.1 progress recompute contract hardened: counter lines are recomputed in place, non-counter lines inside the `## Progress` fence are preserved as hand-authored narrative (merge, never clobber). Field evidence: unconditional wholesale replacement destroyed an operator's Progress notes twice in one session (field report, engine 2.1.49). Next Action bullet now cites SC-2.1's workflow-sensitive plan-complete rule. |
| 1.2.1 | 2026-07-10 | Agent | Traceability: §6 now cites the **C8 (Phase Archival)** convention it implements. No logic change (patch — Stable retained). |
| 1.2.0 | 2026-06-13 | Agent | Added §6 Phase Archival Eligibility (Precision): `allChecked` must match anchored checklist line items, not substring `- [ ]` in prose/code-spans. Field evidence: phase-10 (whose Notes discuss `- [ ]` detection) was silently skipped by the archiver (R7). |
| 1.1.0 | 2026-06-12 | Agent | Added §5 Session-Continuity Integration: SC-2 state update step (always-run, non-blocking) and SC-3 non-bumping commit suggestion fallback. |
| 1.0.0 | 2026-05-07 | Agent | Initial Stable version. Covers the scripts/lib/ finalization helper library introduced in v2.1.0. |
