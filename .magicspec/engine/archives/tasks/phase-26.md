---
phase: 26
name: "Commit-Suggestion Feature Removal"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "commit-suggester.js: composes only the CHANGELOG bullet (deriveChangelogCategory, buildChangelogBullet); commit-message composition removed"
  - "finalize.js: no --no-commit-msg flag, no suggestCommit config, no Suggested commit message block, no Auto-commit notice; emitTail() joins optional sections with single blank-line separators"
  - "workspace.json (project + template): finalization.suggestCommit key removed"
  - "dev/tests/engine.js: harness reflects the retirement — obsolete test deleted, two tests rewritten with doesNotMatch regression pins (69 -> 68)"
key_files:
  created: []
  modified:
    - ".magic/scripts/lib/commit-suggester.js"
    - ".magic/scripts/finalize.js"
    - ".design/workspace.json"
    - ".magic/templates/workspace.json"
    - "dev/tests/engine.js"
patterns_established:
  - "When deleting a block that other formatting logic (spacing, ordering) implicitly anchors on, redesign the dependent logic explicitly rather than performing a literal deletion — verify by reasoning through the join/separator arithmetic, not just by running existing tests (none pinned the spacing here)."
duration_minutes: ~
---

# Stage 26 Tasks — Commit-Suggestion Feature Removal

**Phase:** 26
**Status:** Done
**Strategic Goal:** By explicit user directive, the engine must stop composing and printing a suggested commit message on any finalize path — committing (timing, grouping, message) is left entirely to the user, with no engine involvement even at the suggestion level. The spec layer already reflects this (SC-3/SC-3.1 retired in `l1-session-continuity.md` v2.0.0, `l2-engine-finalization.md` v3.0.0 §5.2, `l2-finalize-output-contract.md` v2.0.0 §3), but the code still composes and prints the message. This phase closes that gap: `.magic/scripts/lib/commit-suggester.js`'s message-composition functions, `finalize.js`'s `--no-commit-msg` flag and `suggestCommit` config read, the `Suggested commit message` stdout block, and the `Auto-commit is disabled by design` notice all go away. The pre-existing hard rule — no write-side git operation is ever invoked — is unaffected; only the suggestion (and any stdout mention of "commit") is removed.

## Atomic Checklist

- [x] [T-26A01] Strip commit-message composition out of `commit-suggester.js`, keep CHANGELOG bullet composition
- [x] [T-26B01] Remove commit-suggestion machinery from `finalize.js`
- [x] [T-26C01] Drop the dead `suggestCommit` config key
- [x] [T-26T01] Update harness: remove obsolete commit-message tests, adjust the stdout-listing test, pin the notice's absence
- [x] [T-26T02] Full harness run + C14 sync

## Detailed Tracking

### [T-26A01] Strip commit-message composition out of `commit-suggester.js`, keep CHANGELOG bullet composition

- **Spec:** l2-engine-finalization.md v3.0.0 §2 module table; l2-finalize-output-contract.md v2.0.0 §2, Canonical References
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `.magic/scripts/lib/commit-suggester.js`, remove `deriveType()`, `deriveScope()`, `artifactId()`, `buildSummary()`, and `buildCommitMessage()` — every function whose sole purpose is composing the (now-retired) commit message. Keep `deriveChangelogCategory()` and `buildChangelogBullet()` untouched; they compose the CHANGELOG bullet, which is unaffected by this retirement. Update `module.exports` to export only `{ deriveChangelogCategory, buildChangelogBullet }`. Do not rename the file — the module keeps its existing name/path; only its exported surface shrinks.
- **Material assumptions:**
  - `artifactId()` has no callers outside the functions being removed (`buildSummary()` is its only caller) — confirmed by reading the file at plan time. Removing it is safe.
  - `buildChangelogBullet()`'s `spec` case does **not** call `artifactId()` — the RC-11 fix (already Stable) made that branch generic; nothing in the surviving code needs `artifactId()`.
  - The file's top banner comment (`// COMMIT MESSAGE SUGGESTER (Conventional Commits, Machine-Friendly)`) and the JSDoc block below it describe the whole file as a commit-message composer — update both to describe the surviving CHANGELOG-bullet-only scope (a short banner + JSDoc rewrite, not a design decision).
  - `finalize.js` (T-26B01) currently imports `buildCommitMessage` from this module — that import must be dropped there in the same phase. Do not let this task alone break `finalize.js`; sequence T-26B01 immediately after.
- **Verify:** `node -e "console.log(Object.keys(require('./.magic/scripts/lib/commit-suggester.js')))"` prints exactly `[ 'deriveChangelogCategory', 'buildChangelogBullet' ]`.
  - Confirmed: exact match. `path` import (unused after removal) also dropped.
- **Changes:** Removed `deriveType()`, `deriveScope()`, `artifactId()`, `buildSummary()`, `buildCommitMessage()` and the now-unused `path` require; rewrote the file banner/JSDoc to describe the surviving CHANGELOG-bullet-only scope; `module.exports` now `{ deriveChangelogCategory, buildChangelogBullet }`. `buildChangelogBullet()`/`deriveChangelogCategory()` bodies untouched.
- **Handoff:** T-26B01 (finalize.js's import of this module must be updated to match the new export surface).

### [T-26B01] Remove commit-suggestion machinery from `finalize.js`

- **Spec:** l2-engine-finalization.md v3.0.0 §3 (Invocation Contract), §5.2 (retirement), §8 (terminal block); l2-finalize-output-contract.md v2.0.0 §3 (Required Fix, stdout listing only)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `.magic/scripts/finalize.js`, remove every piece of the commit-suggestion feature:
  1. `parseArgs()`: drop `--no-commit-msg` from `boolFlags` and `noCommitMsg` from the returned options object and its JSDoc `@returns` block.
  2. `loadConfig()`: drop `suggestCommit: true` from `defaults` and from the JSDoc `@returns` block.
  3. Drop the `require('./lib/commit-suggester')` destructure of `buildCommitMessage` — keep `deriveChangelogCategory, buildChangelogBullet`.
  4. Remove `emitFallbackCommitSuggestion()` entirely (the whole "Non-Bumping Commit Suggestion (SC-3)" section), and its call site on the skip path (`if (config.suggestCommit && !opts.noCommitMsg) { emitFallbackCommitSuggestion(...) }`).
  5. Remove the `commitMsg` construction block in `main()`'s significant path (the `if (config.suggestCommit && !opts.noCommitMsg) { commitMsg = buildCommitMessage(...) ... }` block) and drop `commitMsg` from the object passed to `emitSuccess()`.
  6. In `emitSuccess()`: remove the `commitMsg` parameter (destructure) and the `if (!opts.noCommitMsg && commitMsg) { ... '### Suggested commit message' ... }` rendering block.
  7. In `emitTail()`: remove the `> [!IMPORTANT]` / `Auto-commit is disabled by design...` block — the whole notice, not just its wording. Nothing about commits is printed by finalize any longer.
  8. Rename the `// Changed-File Enumeration (SC-3.1)` section comment (the section stays — `collectChangedFiles()` still backs the stdout `### Changed artifacts` listing per l2-finalize-output-contract.md §3 — only the header's SC-3.1 label is stale).
- **Material assumptions:**
  - `collectChangedFiles()` and `MAX_LISTED_FILES` are **not** commit-suggestion code — they back the stdout `### Changed artifacts` listing, which l2-finalize-output-contract.md §3 keeps as a live requirement. Do not remove them; only the comment header naming SC-3.1 needs updating.
  - The file-header JSDoc's "Hard rule: this script NEVER invokes `git commit`..." comment stays — it documents an internal constraint on the implementation, not a user-facing "commit" mention, and the constraint itself is unaffected by this retirement.
  - `module.exports` at the bottom already lists `emitSuccess`, `emitTail`, etc. — no change needed there beyond what naturally falls out of removing `commitMsg`/`noCommitMsg` params.
- **Verify:** `grep -in commit .magic/scripts/finalize.js` returns only the two sanctioned survivors: the file-header "Hard rule" comment and (if kept) the `Detected changes` field's unrelated prose — no `Suggested commit message`, no `noCommitMsg`, no `suggestCommit`, no `emitFallbackCommitSuggestion`, no `Auto-commit`. Manual smoke: `node .magic/scripts/executor.js finalize --workflow=task --workspace=engine --dry-run` produces stdout with zero case-insensitive matches for `commit`.
  - Confirmed: `grep -in commit finalize.js` returns exactly 3 lines — the module import path (`./lib/commit-suggester`, file not renamed), the "Hard rule" comment, and one internal code comment explaining `emitTail()`'s spacing rationale (mentions the removed notice by name, not printed). Dry-run smoke test's only `commit` matches are the printed task title "Remove commit-suggestion machinery" — the work item's own name, not engine output about committing.
- **Changes:** Dropped `--no-commit-msg`/`noCommitMsg` (parseArgs + JSDoc), `suggestCommit` (loadConfig defaults + JSDoc), the `buildCommitMessage` import, `emitFallbackCommitSuggestion()` and its skip-path call, the `commitMsg` construction block and `emitSuccess()`'s `commitMsg`/`opts` params and its `### Suggested commit message` rendering, and `emitTail()`'s `Auto-commit is disabled` notice. `emitTail()` rewritten to join present blocks (digest, next step) with single blank-line separators instead of relying on the removed notice's unconditional leading/trailing blanks — avoids a double-blank-line regression. `collectChangedFiles()`/`MAX_LISTED_FILES` kept (stdout listing still required); section comment renamed off "SC-3.1".
- **Handoff:** T-26T01 (harness must stop asserting the removed output and start pinning its absence).

### [T-26C01] Drop the dead `suggestCommit` config key

- **Spec:** l2-engine-finalization.md v3.0.0 §5.2 (retirement); PLAN.md Backlog entry (Commit-suggestion feature removal)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Remove the `"suggestCommit": true,` line from the `finalization` block in both `.design/workspace.json` and `.magic/templates/workspace.json` (the bootstrap seed `init.js` copies for new projects). Leave `enabled`, `autoBump`, `autoChangelog`, `changelogPath`, `versionPath` untouched.
- **Material assumptions:**
  - Both files carry the identical key today (confirmed at plan time) — this is a same-shape edit in two places, not a design fork.
  - File-independent of T-26A01/T-26B01 (different files entirely) — may execute in parallel with those two, but must land before T-26T02's C14 sync since both are inside the checksum-tracked surface (`.magic/templates/workspace.json` is under `.magic/`; `.design/workspace.json` is not checksum-tracked but is the live project's own config and should not drift from the template it was seeded from).
- **Verify:** `grep -n suggestCommit .design/workspace.json .magic/templates/workspace.json` returns no matches (exit code 1 on both, or an empty grep result).
  - Confirmed: grep exit code 1 (no matches) on both files; both re-parsed as valid JSON after the edit.
- **Changes:** Removed the `"suggestCommit": true` line from the `finalization` block in both `.design/workspace.json` and `.magic/templates/workspace.json`. No other keys touched.
- **Handoff:** T-26T02 (C14 sync covers the template's checksum).

### [T-26T01] Update harness: remove obsolete commit-message tests, adjust the stdout-listing test, pin the notice's absence

- **Spec:** l2-test-suite.md v1.15.0 (finalize-pipeline coverage mandate, SC-3 case dropped)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `dev/tests/engine.js`:
  1. Delete the test `'buildCommitMessage derives the header from headerFiles but enumerates every file (SC-3.1)'` — it `require()`s `buildCommitMessage` from `commit-suggester.js`, which T-26A01 removes; the test cannot run.
  2. Rewrite `'finalize.js patches STATE.md and suggests a commit on the skip path (SC-2/SC-3)'`: rename to drop the SC-3 half (e.g. `'finalize.js patches STATE.md on the skip path (SC-2)'`); replace the `assert.match(out, /Suggested commit message/, ...)` line with `assert.doesNotMatch(out, /Suggested commit message/i, ...)` and add `assert.doesNotMatch(out, /Auto-commit/i, ...)` — both as regression pins against the feature being reintroduced, not just deletions.
  3. Fix `'finalize.js reports every changed file, not just whitelisted ones (SC-3.1)'`: it currently slices `out` between `'### Changed artifacts'` and `'### Suggested commit message'` (line ~1430) — the second marker no longer exists in the output. Run the CLI manually first to see the real post-change stdout shape, then change the slice's end-boundary to whatever stable marker now follows the artifacts list (candidate: `'### Next step'`, or `out.length` if nothing follows before EOF). Rename the test title to drop `(SC-3.1)` (e.g. `(stdout listing completeness)`), matching l2-finalize-output-contract.md v2.0.0 §3's renamed section.
  4. `createFinalizeFixture()`'s config fixture (~line 138) sets `suggestCommit: true,` — drop that key; it seeds a config field `finalize.js` no longer reads after T-26B01.
  5. Grep the whole file for `commit` (case-insensitive) after the above edits and resolve every remaining hit — either it is one of the two intentional regression pins from step 2, or it needs the same treatment as steps 1-4.
- **Material assumptions:**
  - Sequenced after T-26A01/T-26B01/T-26C01 land — this task tests their combined output shape, not each in isolation.
  - Shared-file queue with T-26T02 (both write `dev/tests/engine.js` / run it) — same pattern as every prior phase's validation track (e.g. Phase 25 T-25T01 → T-25T02).
- **Verify:** `node dev/tests/engine.js` — the rewritten and deleted tests behave as intended; run the suite once more after T-26T02's full pass for the final count.
  - Confirmed: 68/68 pass (69 → 68, net -1: the deleted `buildCommitMessage` test, both rewritten tests pass with the new assertions). No `commit`-related failures; grep sweep found only legitimate git-fixture helpers (`commitFixture()`, `git commit -m`), the unrelated `pre-commit` hook test, `commit-suggester.js` (module path, kept), and the new regression-pin comments/assertions.
- **Changes:** Deleted `'buildCommitMessage derives the header from headerFiles but enumerates every file (SC-3.1)'` (function removed in T-26A01). Renamed and rewrote `'finalize.js patches STATE.md and suggests a commit on the skip path (SC-2/SC-3)'` → `'finalize.js patches STATE.md on the skip path (SC-2)'` with `assert.doesNotMatch` regression pins replacing the removed `assert.match`. Renamed and rewrote `'finalize.js reports every changed file, not just whitelisted ones (SC-3.1)'` → `'... (stdout listing completeness)'`: dropped the commit-body assertion, fixed the `artifacts` slice to end at `'### Next step'` (the old `'### Suggested commit message'` marker no longer exists — the original code would have silently mis-sliced via `String.slice(x, -1)` rather than throwing), added the same two regression pins. Dropped `suggestCommit: true` from `createFinalizeFixture()`'s config fixture.
- **Handoff:** T-26T02 (full harness run).

### [T-26T02] Full harness run + C14 sync

- **Spec:** l2-test-suite.md (coverage mandate), RULES.md C14
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Run the complete harness, then perform the phase's single engine-metadata bump.
- **Material assumptions:**
  - No `.magic/*.md` or `workflows/*.md` body is touched this phase (only `.magic/scripts/lib/commit-suggester.js`, `.magic/scripts/finalize.js`, `.magic/templates/workspace.json`) → C14 runs once, here, with no `--workflow` tag — same shape as Phases 21, 23, 25.
  - Dev-repo Engine-Version snapshot sync (Phase 24) will patch `.design/INDEX.md`'s `**Engine Version:**` automatically on this same C14 run — do not hand-edit it.
- **Verify:** `node dev/tests/engine.js` zero failures; `node .magic/scripts/executor.js update-engine-meta` completes; `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` returns `ok: true` with no `checksums_mismatch`.
  - Confirmed live on this repo: harness 68/68 (69 → 68, net -1 from the deleted `buildCommitMessage` test). `update-engine-meta` detected changes in `scripts/finalize.js`, `scripts/lib/commit-suggester.js`, `templates/workspace.json`; bumped `2.1.75 → 2.1.76`; regenerated checksums for 70 files; synced skill wrappers; dev-repo Engine-Version snapshot synced to `2.1.76` automatically (Phase 24's guard fired correctly again, zero manual edits). `check-prerequisites` returns `ok: true`, `warnings: []`.
- **Changes:** No code changes — this task is the phase's own live proof, same pattern as T-25T02.
- **Handoff:** phase closure → `/magic.run` finalize archives this file.

## Notes

**No spec amendment expected.** The spec side of this retirement is already Stable (`l1-session-continuity.md` v2.0.0, `l2-engine-finalization.md` v3.0.0, `l2-finalize-output-contract.md` v2.0.0) — this phase is a direct implementation of an already-fully-specified removal. If execution surfaces a design gap the spec didn't anticipate, it routes back through `/magic.spec`, not a silent deviation here.

**Why this graduated straight from Backlog into a phase, bypassing `/magic.spec`**: `check-prerequisites`'s `DESIGN_DEBT_PENDING` gate fired on this exact item (plan complete, 1 open Backlog bullet), but the bullet's own text already stated there was no design decision left — matching the precedent Phases 20/21/25 each recorded (an item whose design question is already answered moves directly into a phase, per the SC-2.4 Backlog Disposition Convention's own stated remedy for "already has an answer, kept visible on purpose").

**Track shape.** A (`commit-suggester.js`) → B (`finalize.js`, same-module dependency) sequential; C (`workspace.json` × 2) file-independent, may run in parallel with A/B; T (harness) last, after A+B+C, itself a two-step same-file queue (T-26T01 → T-26T02) matching every prior phase's validation track.

**Blast radius.** `finalize.js`'s terminal block (`emitTail()`) runs on **every** `/magic.*` mutating workflow invocation — removing the auto-commit notice is visible on the very next finalize call after this phase lands, on any workflow.
