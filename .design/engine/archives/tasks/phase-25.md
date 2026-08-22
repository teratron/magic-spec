---
phase: 25
name: "CHANGELOG Dedup Discoverability Hint"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "finalize.js: deduped CHANGELOG stdout row names the release-changelog remedy (§4.5), no bullet-content or dedup-logic change"
  - "dev/tests/engine.js: first live-CLI regression coverage for the CHANGELOG-write branch (autoChangelog: true), 68 -> 69"
key_files:
  created: []
  modified:
    - ".magic/scripts/finalize.js"
    - "dev/tests/engine.js"
patterns_established:
  - "createFinalizeFixture() defaults autoChangelog: false — any test needing the real CHANGELOG-write path must pass { autoChangelog: true } explicitly; grep for existing autoChangelog: true usage before assuming a code branch already has live-CLI coverage."
duration_minutes: ~
---

# Stage 25 Tasks — CHANGELOG Dedup Discoverability Hint

**Phase:** 25
**Status:** Done
**Strategic Goal:** A field report (engine 2.1.73, consumer workspace `engine`) reproduced the already-documented §4.1 CHANGELOG vocabulary-exhaustion defect through the `run` case, and proposed a fix that would violate RC-11 (interpolating a task/phase identifier into the bullet). The actual gap, confirmed at plan time: §4.4's remedy (`release-changelog`, an opt-in rotation CLI) already exists and is already fully reachable through `executor.js`'s generic dispatch — but `finalize.js`'s own stdout never tells the operator it exists. This phase closes that discoverability gap with a one-line diagnostic-surface change, no behavioral change to bullet content or dedup logic.

## Atomic Checklist

- [x] [T-25A01] Surface a `release-changelog` hint in the deduped CHANGELOG stdout row
- [x] [T-25T01] Regression: deduped row names `release-changelog`; non-deduped rows are unaffected
- [x] [T-25T02] Full harness run + C14 sync

## Detailed Tracking

### [T-25A01] Surface a `release-changelog` hint in the deduped CHANGELOG stdout row

- **Spec:** l2-finalize-output-contract.md v1.2.0 §4.5, Required Fix
- **Status:** Done
- **Assignment:** Agent
- **Goal:** In `emitSuccess()` (`.magic/scripts/finalize.js`, the `CHANGELOG` row builder around line 579-585), change the `changelogResult.deduped` branch's literal string from `'skipped (duplicate)'` to a string that also names the remedy.
- **Material assumptions:**
  - **Exact replacement**, per the spec's own BAD/GOOD block:

    ```plaintext
    BAD : 'skipped (duplicate)'
    GOOD: "skipped (duplicate — run 'release-changelog' to rotate [Unreleased])"
    ```

  - **Scope is exactly this one ternary branch.** Do not touch `changelogResult.formatWarning`'s branch, the `appended to [Unreleased] § ${category}` branch, `bulletExists()`, `buildChangelogBullet()`, or `appendBullet()` — the spec's constraint (§4.4 constraint 1, restated in §4.5) is that RC-11 and bullet content stay untouched. This is a stdout-string change only.
  - `emitSuccess()` is directly exported (`module.exports` at the bottom of `finalize.js` already includes it) — callable and testable in isolation, but the established convention in this suite for CHANGELOG-row assertions is a full CLI invocation via `execSync` against a temp fixture (see T-25T01), not calling `emitSuccess()` with a hand-built `ctx`. Match that convention, do not introduce a new testing style for this one row.
- **Verify:** `node -e` smoke check — `require('finalize.js').emitSuccess({...minimal ctx, changelogResult: { deduped: true, category: 'Changed', bullet: 'x' }, files: [], gitAvailable: true, opts: {}})`, capture `process.stdout.write` temporarily, assert the captured string contains `release-changelog`. Full behavioral proof deferred to T-25T01's real-fixture CLI run.
  - Confirmed: captured row reads `| CHANGELOG | skipped (duplicate — run 'release-changelog' to rotate [Unreleased]) |`.
- **Changes:** `emitSuccess()`'s `changelogResult.deduped` ternary branch changed from `'skipped (duplicate)'` to `` `skipped (duplicate — run 'release-changelog' to rotate [Unreleased])` `` — the only edit in `.magic/scripts/finalize.js`. `formatWarning` and `appended` branches untouched.
- **Handoff:** T-25T01 (regression test pinning this exact string).

### [T-25T01] Regression: deduped row names `release-changelog`; non-deduped rows are unaffected

- **Spec:** l2-finalize-output-contract.md v1.2.0 §5 (new bullet, §4.5 coverage)
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Add a harness case to `dev/tests/engine.js` that seeds a root `CHANGELOG.md` with the exact bullet a `run`-workflow single-task-file completion produces, then runs `finalize.js --workflow=run` for real against a fixture with a whitelist-significant `tasks/` change — reproducing the field report's exact scenario — and asserts the printed `CHANGELOG` row contains `release-changelog`. Pair it with a negative control: a first run against a fresh `CHANGELOG.md` (nothing to dedupe) must produce the unchanged `appended to [Unreleased] § Changed` row, with no `release-changelog` text anywhere in that row.
- **Material assumptions:**
  - **`createFinalizeFixture()` defaults `autoChangelog: false`.** This scenario needs the real write path, so pass `{ workspace: 'main', autoChangelog: true }` explicitly — no existing test in this suite has exercised the CHANGELOG-write branch through a live CLI run before now; this is new ground, not a variant of an existing case.
  - **Seed the pre-existing bullet using the writer itself, not hand-authored markdown.** `require()` `.magic/scripts/lib/changelog-writer.js` in the temp copy (same pattern already used for `diagnostics.js` at line ~2715), call `createIfMissing(changelogPath)` then `appendBullet(changelogPath, 'Changed', 'Completed task (main)')` directly — guarantees exact Keep-a-Changelog formatting so the second (real CLI) call's `insertIntoUnreleased()` dedup match is genuine, not an artifact of a hand-typed fixture drifting from the writer's own output shape.
  - **Bullet shape**: `buildChangelogBullet('run', 'main', files)`'s `tasks.length === 1` branch fires only when a changed file's path `includes('/tasks/')` — a `TASKS.md` change alone (as the existing SC-3.1 test at line ~1406 uses) does **not** qualify. Create `wsDir/tasks/phase-1.md`, commit as baseline, then modify it before the real run — mirrors this file's own fixture, not the TASKS.md-only SC-3.1 fixture.
  - **Negative control matters more than the positive case**: it is the assertion that would catch a future edit accidentally widening the hint into the `appended`/`formatWarning` branches, which would misinform an operator whose write actually succeeded.
  - `dev/tests/engine.js` is a shared single-file queue this phase: T-25T01 → T-25T02.
- **Verify:** `node dev/tests/engine.js` — the new case passes; negative-control it against pre-T-25A01 code (`git stash` on `finalize.js` alone) to confirm it actually fails there before restoring.
  - Confirmed: 69/69 with the fix; negative control (`git stash push -- .magic/scripts/finalize.js`) reproduced `actual: '| CHANGELOG | skipped (duplicate) |'` against pre-fix code — test genuinely exercises the fix, not a tautology. Stash popped, fix restored.
- **Changes:** New test in `dev/tests/engine.js`, inserted after the R11 §4.4 `releaseUnreleased`-absence test (§4's existing block). Uses `createFinalizeFixture(tempDir, { workspace: 'main', autoChangelog: true })` — the first live CLI exercise of the CHANGELOG-write branch in this harness (every prior test either asserted `buildChangelogBullet()` directly or ran with the default `autoChangelog: false`). Two sequential real `finalize.js --workflow=run` invocations against a `tasks/phase-1.md` fixture: first run appends normally (control — no hint), second run (same single-`/tasks/`-file shape, same bullet) dedupes and the row names `release-changelog`.
- **Handoff:** T-25T02 (same file, sequential).

### [T-25T02] Full harness run + C14 sync

- **Spec:** l2-test-suite.md (coverage mandate), RULES.md C14
- **Status:** Done
- **Assignment:** Agent
- **Goal:** Run the complete harness, then perform the phase's single engine-metadata bump.
- **Material assumptions:**
  - `finalize.js` is the only `.magic/` file this phase touches → C14 runs once, here, with no `--workflow` tag (no `.magic/*.md` or `workflows/*.md` body touched) — same shape as Phases 21, 23, 24.
  - Dev-repo Engine-Version snapshot sync (Phase 24) will patch `.design/INDEX.md`'s `**Engine Version:**` automatically on this same C14 run — do not hand-edit it.
- **Verify:** `node dev/tests/engine.js` zero failures; `node .magic/scripts/executor.js update-engine-meta` completes; `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` returns `ok: true` with no `checksums_mismatch`.
  - Confirmed live on this repo: harness 69/69; `update-engine-meta` bumped `2.1.74 → 2.1.75` and printed `✅ Engine Version snapshot synced: 2.1.75`; `.design/INDEX.md` now reads `**Engine Version:** 2.1.75`, matching `.magic/.version` exactly, with zero manual edits (Phase 24's dev-repo sync fired correctly again); `check-prerequisites` returns `ok: true`, `warnings: []`.
- **Changes:** No code changes — this task is the phase's own live proof, same pattern as T-24T02.
- **Handoff:** phase closure → `/magic.run` finalize archives this file.

## Notes

**No spec amendment expected.** §4.5's Required Fix is a single literal-string change scoped to one branch — implementation matches the spec's own BAD/GOOD block verbatim, so no design gap should surface during execution. If one does, it routes back through `/magic.spec`, not a silent deviation here.

**Why this is a full phase and not a `/magic.spec`-adjacent tweak**: the fix touches `.magic/scripts/finalize.js`, inside the checksum manifest — any change there requires the standard C14 cycle (version bump, checksum regen, skill-wrapper sync), which only `/magic.run` performs.

**Relationship to Phase 20's `release-changelog.js`**: that phase built the remedy; this phase makes it discoverable. Neither phase touches the other's code — Phase 20's CLI is referenced here only as a string literal in a diagnostic message.

**Track ordering.** Single track: T-25A01 → T-25T01 → T-25T02, strictly sequential (T-25T01 tests T-25A01's exact output string; `dev/tests/engine.js` is a shared-file queue with T-25T02 next). No parallel tracks — one file changed in the fix itself, one test file for coverage.
