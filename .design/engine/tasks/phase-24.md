---
phase: 24
name: "Dev-Repo Engine-Version Snapshot Sync"
status: Todo
subsystem: "dev/scripts + .magic/scripts"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 24 Tasks — Dev-Repo Engine-Version Snapshot Sync

**Phase:** 24
**Status:** Todo
**Strategic Goal:** In this engine's own dev-repo — and nowhere else — a C14 bump also refreshes the `**Engine Version:**` snapshot in `.design/INDEX.md`, so the drift line that exists to catch an *external* engine replacement stops firing on first-party changes. Consumer projects keep the current contract byte for byte. Track C additionally repairs a live `Next Action` regression this phase's own planning run surfaced (see Notes).

## Atomic Checklist

- [ ] [T-24A01] New `dev/scripts/sync-engine-snapshot.js` (L2 snapshot writer)
- [ ] [T-24A02] Wire the guarded delegation into `update-engine-meta.js`
- [ ] [T-24B01] Carve out the dev-repo exception in the `rules/magic.md` §1 snapshot contract
- [ ] [T-24C01] Stop stripping inline code spans out of the Next Action task title
- [ ] [T-24C02] Regression: task titles containing code spans survive verbatim
- [ ] [T-24T01] Regression: dev-repo branch writes, consumer branch does not
- [ ] [T-24T02] Full harness run + C14 sync

## Detailed Tracking

### [T-24A01] New `dev/scripts/sync-engine-snapshot.js` (L2 snapshot writer)

- **Spec:** l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version Snapshot Sync, Required Fix item 1
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Create a single-purpose L2 script exporting one no-argument function that reads `.magic/.version` and rewrites the `**Engine Version:**` line in `.design/INDEX.md` to that value. Module shape mirrors `dev/scripts/sync-skills.js` exactly: `module.exports = fn`, no side effects on require.
- **Material assumptions:**
  - **Placement is L2, deliberately** — see the phase note below. Do not implement the file write inline in `.magic/scripts/update-engine-meta.js`.
  - Self-contained: reads `.magic/.version` itself rather than taking the version as an argument, so `bumpVersion()`'s signature is untouched. It runs *after* `bumpVersion()`, so the file already holds the new value.
  - Target is the **global aggregate** `.design/INDEX.md` only. Verified during planning: workspace-level `.design/{ws}/INDEX.md` carries `**Version:**`/`**Status:**` but no `**Engine Version:**` field, so there is no second file to patch. Do not invent one — but do not crash if the field is absent either.
  - **Non-blocking by contract**: a missing `.design/INDEX.md`, or a file with no `**Engine Version:**` line, warns and returns. It must never throw or `process.exit` — it runs inside a C14 bump that must complete. Note `dev/scripts/update-project-meta.js` does `process.exit(1)` in this situation; do **not** copy that behavior here.
  - Disjoint from `update-project-meta.js`, which owns `**Version:**` / `Last Updated` / history rows in the same file and never touches `**Engine Version:**` (confirmed during planning). Two L2 writers, non-overlapping fields — no coordination needed.
- **Verify:** `node -e` against a temp fixture: an `.design/INDEX.md` containing `**Engine Version:** 0.0.0` and a `.magic/.version` of `9.9.9` → after the call the field reads `9.9.9`; a second call against a fixture with the file absent returns normally (no throw, non-zero exit not produced).
- **Handoff:** T-24A02 (the L1 call site that delegates to this).

### [T-24A02] Wire the guarded delegation into `update-engine-meta.js`

- **Spec:** l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version Snapshot Sync, Required Fix item 1
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** In `update-engine-meta.js`'s C14 **write** branch, add an `fs.existsSync` guard around a lazy `require` of `dev/scripts/sync-engine-snapshot.js` and call it — placed immediately after the existing `sync-skills.js` block so the two dev-delegated syncs sit together. On absence: `console.warn` + `diagnostics.record` (severity `warning`), mirroring the `SKILL_SYNC_UNAVAILABLE` shape already there.
- **Material assumptions:**
  - **This is the sanctioned L1→L2 exception and must take its exact shape** (`AGENTS.md` §2.1): `fs.existsSync` guard around a lazy `require` of a dev script, graceful warning on absence. Per-script guarding — the guard tests `sync-engine-snapshot.js`'s own presence, exactly as the neighbouring block guards `sync-skills.js`. This is the same dev-tree detection mechanism the file already uses twice, not a second one.
  - **Critical — must not run in `--check` mode.** `checkOnly` `process.exit(1)`s at `update-engine-meta.js:113`, before `bumpVersion()` at :116. The new call goes *after* `bumpVersion()`, inside the same non-check path. The `--check` branch is what the user's pre-commit hook invokes; a hook that mutates `.design/INDEX.md` would be a serious contract violation.
  - Call order within the write branch: `bumpVersion()` → `syncSkills()` → **new call** → `runGenerateChecksums()`. `.design/INDEX.md` is outside `.magic/`, so it does not participate in the checksum manifest and the position relative to `runGenerateChecksums()` is not load-bearing — but keep it before, so a single reading of the block shows all syncs preceding the manifest rebuild.
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --check` against a tree with a deliberately stale `**Engine Version:**` → the field is **unchanged** afterward (`git diff --exit-code -- .design/INDEX.md` clean), proving check mode still writes nothing.
- **Handoff:** T-24T01 (regression covering both branches).

### [T-24B01] Carve out the dev-repo exception in the `rules/magic.md` §1 snapshot contract

- **Spec:** l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version Snapshot Sync, Required Fix item 2
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Amend §1's "Snapshot contract" sentence — currently *"the `**Engine Version:**` field updates **only** when `/magic.analyze` runs (the sole writer; manual edits must not touch it)"* — so the sole-writer claim carries the dev-repo exception. Everything else in §1, including the whole external-drift-detection rationale and the drift-line wording, stays untouched.
- **Material assumptions:**
  - **Blocking Constraint [C-001] applies.** `rules/magic.md` is hardlinked to `.agents/rules/magic.md` (verified at plan time: link count 2, both paths live). Both `Write` and `Edit` create a new inode here and silently delink the twin, leaving `.agents/` on the old content. After editing: restore the link and verify **both** that `fsutil hardlink list rules/magic.md` lists both paths and that the two files' hashes match.
  - `rules/` sits outside C14 checksum tracking, so this task alone triggers no version bump — it rides the phase's single C14 run in T-24T02.
  - `.magic/analyze.md` needs **no** amendment: its own wording ("update the field to match the current value of `.magic/.version`") stays true with a second writer present, and it makes no sole-writer claim. Checked at plan time across all 7 of its `Engine Version` mentions; `.magic/status.md` only reads the field. Do not edit either.
  - The new writer is idempotent against `analyze.md`'s: both set the field to `.magic/.version`. They cannot disagree, so the exception is a documentation correction, not a conflict-resolution rule.
- **Verify:** `rules/magic.md` §1 states the exception; `fsutil hardlink list rules/magic.md` lists both paths; `Get-FileHash` of `rules/magic.md` and `.agents/rules/magic.md` return identical hashes.
- **Handoff:** independent of Track A — no downstream task depends on it.

### [T-24C01] Stop stripping inline code spans out of the Next Action task title

- **Spec:** l2-finalize-state-accuracy.md §9 (implementation defect in its tier-2 loop; the §9 contract itself is unchanged), l1-session-continuity.md SC-2.1/SC-2.2
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** `synthesizeNextAction()`'s tier-2 loop reads the phase file through `stripQuoted()` and then captures **both** the task ID and the display title from that stripped text. Stripping is correct for deciding *which* checklist lines are real tasks (SH-1 — a quoted `- [ ]` inside a Notes block must not count), but wrong for extracting text meant to be shown: a task title routinely contains a backticked file name, and that span is blanked. Fix: keep the stripped text as the detector, recover the title from the raw source.
- **Material assumptions:**
  - **This is a regression introduced by Phase 23's own T-23A01**, not a pre-existing defect — the SH-1 binding was added there as a plan-time hardening and over-applied. `l2-finalize-state-accuracy.md` §9's written contract says only "skip the item… continue the scan"; it never asked for the title to be stripped, so **no spec amendment is required** — the spec is right and the implementation over-reached.
  - `stripQuoted()` preserves **line count but not intra-line offsets** (it deletes the quoted characters rather than replacing them with spaces — verified directly: `` New `x` (y) `` → `New  (y)`). So a character-offset mapping between stripped and raw is **not** available; a **line-index** mapping is. Recover the title by locating the match's line index in the stripped text and re-matching the regex against that same line index in the raw text.
  - The phase-level `isPhaseBlocked()` and per-task `isTaskExcluded()` screens must keep reading **stripped** content — they are detectors, and this fix must not weaken them back into SH-1 exposure.
- **Verify:** `node -e` against a temp workspace whose checklist contains ``- [ ] [T-1A01] New `dev/scripts/x.js` (thing)`` → `computeNextAction('run', ws, dir)` returns a string containing `` `dev/scripts/x.js` `` verbatim, backticks included, and containing no double-space artifact.
- **Handoff:** T-24C02 (its regression case).

### [T-24C02] Regression: task titles containing code spans survive verbatim

- **Spec:** l2-finalize-state-accuracy.md §11 (extends the §9 coverage obligation T-23T01 opened)
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Add a harness case to `dev/tests/engine.js` pinning T-24C01: a phase whose first open task title contains an inline code span yields a `Next Action` reproducing that title byte-for-byte. Pair it with a case proving the detector still works — a Notes block quoting `- [ ] [T-9Z99] Not a real task` must still not be picked up.
- **Material assumptions:**
  - The second half is the part that matters most: it is the assertion that stops a future "fix" from reverting to reading raw content wholesale and silently reopening the SH-1 hole this strip was added to close. Both halves belong in one case so they cannot drift apart.
  - `dev/tests/engine.js` is a shared single-file queue this phase: **T-24C02 → T-24T01 → T-24T02**.
- **Verify:** `node dev/tests/engine.js` — the new case passes; negative-control it against the pre-T-24C01 code to confirm it actually fails there.
- **Handoff:** T-24T01 (same file, next in queue).

### [T-24T01] Regression: dev-repo branch writes, consumer branch does not

- **Spec:** l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version Snapshot Sync, Required Fix item 3
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Add harness coverage to `dev/tests/engine.js` pinning both branches: (i) dev-repo fixture (`dev/scripts/sync-engine-snapshot.js` present) → after `update-engine-meta`, `.design/INDEX.md`'s `**Engine Version:**` equals the bumped `.magic/.version`; (ii) consumer fixture (that script absent) → the field is **unchanged**, and the run still completes rather than erroring.
- **Material assumptions:**
  - Sequenced after T-24C02 in the shared `dev/tests/engine.js` queue.
  - `createTempWorkspace()` copies all of `dev/scripts/` into the fixture, so the guard is **true by default** — the consumer case must explicitly delete `dev/scripts/sync-engine-snapshot.js` from the temp tree to simulate a user installation. This mirrors how the fixture already withholds `generate-checksums.js` from `.magic/scripts/` to exercise the user-install fallback honestly.
  - Temp fixtures do not create a global `.design/INDEX.md` (only `.design/{ws}/`), so the dev-repo case must write one with a deliberately stale `**Engine Version:**` before invoking. The absent-file path is T-24A01's own Verify, not this task's.
  - Negative-control the dev-repo case: confirm it fails against the unwired code (Phase 19 R12 pattern), so the test is not one that passes under the defect.
- **Verify:** `node dev/tests/engine.js` — new cases pass, total count rises by the number added, zero pre-existing failures.
- **Handoff:** T-24T02 (same file, sequential).

### [T-24T02] Full harness run + C14 sync

- **Spec:** l2-test-suite.md (coverage mandate), RULES.md C14
- **Status:** Todo
- **Assignment:** Agent
- **Goal:** Run the complete harness, then perform the phase's single engine-metadata bump.
- **Material assumptions:**
  - Two `.magic/` files are inside the C14 manifest this phase — `scripts/update-engine-meta.js` (Track A) and `scripts/finalize.js` (Track C); `dev/scripts/` is L2 and `rules/` is outside checksum tracking. C14 runs **once**, here, with **no** `--workflow` tag, since no `.magic/*.md` or `workflows/*.md` body is touched. Same shape as Phases 21 and 23.
  - **This run is the phase's own end-to-end proof.** With T-24A01/A02 landed, the bump itself patches `.design/INDEX.md`. Expect the snapshot to jump `2.1.72` → the new version directly, skipping `2.1.73` — that is correct: the field records the current version, not a log, and `2.1.73` was the pre-fix state this phase exists to stop producing.
- **Verify:** `node dev/tests/engine.js` zero failures; then `update-engine-meta` completes and `.design/INDEX.md`'s `**Engine Version:**` matches `.magic/.version` **without any manual edit**; then `check-prerequisites --json --workspace=engine` returns `ok: true` with no `checksums_mismatch`.
- **Handoff:** phase closure → `/magic.run` finalize archives this file.

### [T-24T03] Validation Task — consumer-install contract unchanged

- **Goal:** Prove the change is genuinely scoped to this repo: a consumer installation's drift-detection behavior must be bit-for-bit what it was before this phase.
- **Method:** Build a temp fixture shaped like a user install (four L1 folders, `.design/` with a global `INDEX.md`, **no** `dev/` tree), run `update-engine-meta` after touching a `.magic/` file, and confirm: the version bumps, the `**Engine Version:**` snapshot is untouched, a `warning`-severity diagnostic records the skipped sync, and the process exits 0. Then confirm `/magic.status`'s engine line still reports the resulting drift, i.e. the signal the exemption preserves for consumers is intact.
- **Status:** Todo

## Notes

**Placement resolved at plan time — the write lives in L2, not L1.** The spec's Required Fix names `update-engine-meta.js` as the call site, which is correct, but is under-specified about where the actual file write belongs. Resolved: a new `dev/scripts/sync-engine-snapshot.js`, invoked through the guard. Three objective grounds, recorded so a cold implementer does not re-litigate: (a) `AGENTS.md` §2.1 defines the one sanctioned L1→L2 exception as *"a runtime `fs.existsSync` guard around an `execFileSync` / lazy `require` of a dev script"* — delegation, not dev-only logic inlined into L1; (b) `AGENTS.md` §1.2 assigns project-meta writes to `.design/INDEX.md` to L2 explicitly; (c) L2 placement means the logic never enters the release archive at all, which is a stronger guarantee for consumers than a runtime `if` shipped inert in the kernel. Extending the existing `dev/scripts/update-project-meta.js` was considered and rejected: it self-executes on `require` with no `module.exports`, so wiring it in would require refactoring a working script's module shape for no gain.

**The phase validates itself.** T-24T02's C14 bump is the first live execution of the new path — if the snapshot does not update on that run, the fix did not work. No separate staging step is needed or wanted.

**Two writers, one field, no conflict.** `/magic.analyze` keeps writing the snapshot per `.magic/analyze.md`; the new sync writes it too. Both set it to `.magic/.version`, so they are idempotent with respect to each other. Only the *sole-writer sentence* in `rules/magic.md` §1 becomes inaccurate, which is exactly what T-24B01 corrects — no arbitration logic is required, and none should be added.

**Consumer behavior is the invariant under test, not a side note.** The entire value of the change is that it is invisible outside this repo. T-24T01(ii) and T-24T03 exist to pin that; if either has to be weakened to make the phase pass, the design is wrong, not the test.

**Track C is a scope extension, deliberately taken.** It was not in the spec's Required Fix — it was found by *this planning run's own finalize output*, which printed `Execute T-24A01 New  (L2 snapshot writer)` with the backticked path blanked out of the title. Reproduced immediately and root-caused to Phase 23's T-23A01: the tier-2 loop now reads the phase file through `stripQuoted()` and takes the display title from that stripped text. Folded into this phase rather than parked, on three grounds: it is **live on every finalize invocation** for any task whose title carries a code span (this repo's own titles routinely do); the fix needs **no design input**, so parking it would queue a decision nobody has to make; and Phase 24 already performs a C14 bump touching `.magic/`, so a second engine fix rides along at zero marginal C14 cost. Carrying two independent engine fixes in one phase is established practice here — Phase 22 carried three unrelated field reports, Phase 20 carried two unrelated backlog items.

**No spec amendment follows from Track C.** `l2-finalize-state-accuracy.md` §9's written contract asks only that an excluded task be skipped and the scan continue; it never asked for the title to be stripped. The `stripQuoted()` binding was a plan-time hardening added in T-23A01's own task text (the "Watch (SH-1)" note), and the implementation applied it one step too far. The spec is correct as written and the defect is purely implementation-side — so this is Engine Improvement work, not a `/magic.spec` round-trip. Worth a one-line note in that spec's defect register on the next `/magic.spec` pass for the record, but nothing is blocked on it.

**Track ordering.** A01 → A02 (A02 requires the module A01 creates). Track B is file-independent of A and carries [C-001]. Track C is file-independent of A and B (`finalize.js` vs. `update-engine-meta.js`/`dev/scripts/`/`rules/`). `dev/tests/engine.js` is a shared single-file queue: **T-24C02 → T-24T01 → T-24T02**. C14 runs once at T-24T02, after every `.magic/` edit from Tracks A and C has landed.
