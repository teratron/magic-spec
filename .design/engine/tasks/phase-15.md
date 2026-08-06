---
phase: 15
name: "Finalize-Pipeline Accuracy & Generator Containment"
status: Todo
subsystem: ".magic/scripts, .magic/scripts/lib, dev/tests"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 15 Tasks — Finalize-Pipeline Accuracy & Generator Containment

**Phase:** 15
**Status:** Todo
**Strategic Goal:** The SC-2 state-update step makes `STATE.md` more accurate after every run, never less; the finalize generator never writes an SDD identifier into a product file; and what finalize prints matches the diff the user is about to commit. Implements the eight `Required Fix` blocks in `l2-engine-finalization.md` §7-§10 — all authored across seven field-report cycles, all still reproducible in engine 2.1.62.

## Atomic Checklist

- [ ] [T-15A01] Phase-counter fallback to the two-level task layout (SC-2.3)
- [ ] [T-15A02] Narrow the Progress counter classifier to engine-owned labels (SC-2)
- [ ] [T-15A03] Function-form replacement for the Progress fence rewrite (SC-2)
- [ ] [T-15A04] Distinguish cap-exhausted from cap-restored in the line-cap guard (SC-1.2)
- [ ] [T-15B01] Blocked-phase precedence in the Next Action computation (SC-2.1(a))
- [ ] [T-15B02] Enumerate every changed file in the commit suggestion and stdout (SC-3.1)
- [ ] [T-15B03] Drop the artifact ID from the single-spec CHANGELOG bullet (RC-11)
- [ ] [T-15C01] Remove `--status=` from the per-task update-state call site (SC-1.1)
- [ ] [T-15T01] Harness coverage — `update-state.js` (five cases)
- [ ] [T-15T02] Harness coverage — `finalize.js` / `commit-suggester.js` (three cases)
- [ ] [T-15T03] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-15A01] Phase-counter fallback to the two-level task layout (SC-2.3)

- **Spec:** l2-engine-finalization.md §8.2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js` (`computeProgress()`, the `### Phase {n} Checklist` lookup around line 236)
- **Verify:** `node .magic/scripts/executor.js update-state --workspace=engine --auto-progress`, then read `.design/engine/STATE.md` — its `## Progress` fence MUST contain a `Phase {N}: [d/t]` line alongside `Overall:`. This repository is itself the fixture: it uses the two-level layout and its `STATE.md` has carried an `Overall`-only block for its entire history.
- **Handoff:** Gates T-15T01's SC-2.3 case.
- **Notes:** The inline `### Phase {n} Checklist` heading exists only in the legacy single-file layout, so `section` is always `null` on the canonical layout and the phase-line branch never fires — for every project on the modern format, not only Blocked ones. Add a fallback that reads `tasks/phase-{n}.md` directly and counts `- [x]`/`- [ ]` lines, mirroring the file lookup `synthesizeNextAction()`'s tier-2 already performs. Keep the inline-heading path: legacy-layout workspaces still depend on it. Do not reuse T-15A02's narrowed classifier here — that regex screens *existing* lines during the merge, this branch *produces* one.

### [T-15A02] Narrow the Progress counter classifier to engine-owned labels (SC-2)

- **Spec:** l2-engine-finalization.md §8.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js` (`counterRe`, line ~154)
- **Verify:** `node -e "const re=require('fs').readFileSync('.magic/scripts/update-state.js','utf8').match(/const counterRe = (.+);/)[1]; const r=eval(re); console.log(r.test('Specification: [3/3] complete'), r.test('Overall: [2/5] x'), r.test('Phase 15: [0/4] y'), r.test('Overall: [{filled}/{total}] z'))"` MUST print `false true true true`.
- **Handoff:** Gates T-15T01's over-classification case.
- **Notes:** `[^:\n]+` accepts any label, but `computeProgress()` emits exactly two — `Overall` and `Phase {N}`. A hand-authored `Implementation: [1/5] in progress` matches, is excluded from `preserved`, and is never regenerated, so it is simply gone: the merge-not-clobber contract (§5.1) promises to preserve exactly that. Narrow the label portion to `(?:Overall|Phase \d+)`; keep the `{filled}/{total}` placeholder alternation intact — template bootstrap state depends on it. The classifier's job is to recognize what the engine itself writes, not to infer operator intent from formatting.

### [T-15A03] Function-form replacement for the Progress fence rewrite (SC-2)

- **Spec:** l2-engine-finalization.md §8.5
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js` (line ~161)
- **Verify:** `grep -n "replace(progressRe" .magic/scripts/update-state.js` MUST show a function-form callback and zero occurrences of the string form. Behavioral pin: T-15T01's injection case.
- **Notes:** The most severe defect in §8 — the other four misplace or lose *values*, this one corrupts *markdown structure*. `.replace(regex, replacementString)` scans the entire final replacement string for `$1`-`$9`, `` $` ``, `$'`, `$&`, `$$` — including inside `${body}`, which is built from arbitrary preserved narrative. A note containing `$1,200` splices capture group 1 (the fence opener) into the middle of the narrative and leaves the file's triple-backtick count unbalanced. Use `(_match, open, _oldBody, close) => \`${open}${body}${close}\`` — a function's return value is used verbatim. §8.5 records that the rest of the pipeline was swept and no other `.replace()` call site combines capture groups with unconstrained input; do not widen this fix beyond the one site.

### [T-15A04] Distinguish cap-exhausted from cap-restored in the line-cap guard (SC-1.2)

- **Spec:** l2-engine-finalization.md §10.2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js` (line-cap guard, lines ~174-181)
- **Verify:** `grep -n "Pruned oldest decision\|already at its floor" .magic/scripts/update-state.js` MUST return two distinct warning strings on two distinct branches, and the pruning message MUST sit inside the `decLines.length > 1` branch — not above it.
- **Handoff:** Gates T-15T01's exhaustion case.
- **Notes:** The guard's only pruning target is `## Recent Decisions`, which has its own 5-entry cap and a 1-entry floor; `## Blocking Constraints` is appended forever by design and never pruned. Once the floor is hit the file grows unbounded while the unconditional `console.warn` keeps reporting "Pruning oldest decision" — reproduced at 60 constraints / 110 lines. Do **not** mirror-prune `## Blocking Constraints`: a Decision is disposable narrative, a Constraint is safety-critical and the template marks it MANDATORY reading. The exhausted branch warns and directs the operator to archive stale constraints manually; the write still proceeds — `updateState()` must not become a HALT point over a line count.

### [T-15B01] Blocked-phase precedence in the Next Action computation (SC-2.1(a))

- **Spec:** l2-engine-finalization.md §8.1
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (`finalize.js`)
- **Files:** `.magic/scripts/finalize.js` (`synthesizeNextAction()` tier-2 loop, lines ~212-240)
- **Verify:** Build a scratch workspace with a `tasks/phase-1.md` carrying `status: Blocked` frontmatter, a `Blocked` `TASKS.md` registry row, and one open `- [ ]` item; call `require('./.magic/scripts/finalize.js').computeNextAction(...)` against it — the returned string MUST NOT match `/^Execute T-/` and MUST still name exactly one command.
- **Handoff:** Gates T-15T02's Blocked-precedence case.
- **Notes:** Blocked is not Done, so the blocked task's checklist line is legitimately open and the loop returns it unconditionally — while the same `STATE.md`'s `**Status:** Blocked` and populated `## Blockers` say the opposite. Treat **either** signal as sufficient on its own (frontmatter `status:` or the `TASKS.md` row): the two are not updated atomically, so requiring both lets a partially-applied transition through. Redirect the value (e.g. `Resolve blocker on {T-ID} ({ws}) — see STATE.md ## Blockers, then run /magic.run {ws}`) rather than falling through to the next phase, which would recommend a different, possibly out-of-order phase. The redirected string still passes the SC-2.2 single-exit screen unchanged — exactly one command, never `/magic.spec` or `/magic.analyze`.

### [T-15B02] Enumerate every changed file in the commit suggestion and stdout (SC-3.1)

- **Spec:** l2-engine-finalization.md §9.2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (`finalize.js` + `commit-suggester.js`)
- **Files:** `.magic/scripts/finalize.js` (`emitSuccess()` line ~387; call sites lines ~581, ~590), `.magic/scripts/lib/commit-suggester.js` (`buildCommitMessage()` line ~161)
- **Verify:** With a working tree holding one whitelist-matched change and one change under `dev/`, run `node .magic/scripts/executor.js finalize --workflow=run --dry-run` — the `### Changed artifacts` section and the suggested message's `Modified files:` body MUST both name the `dev/` file, while the derived `type(scope): summary` header stays keyed off the whitelist subset alone.
- **Handoff:** Gates T-15T02's visibility case. Highest blast radius in the phase — it changes what every finalize prints.
- **Notes:** Significance ("should this bump the version") and message completeness ("what is the user about to stage") are two questions collapsed onto one file set. `gitChangedPaths(projectRoot)` is already computed in the pipeline, but only on the SC-3 fallback path; the success path never calls it. Widen **only** the body enumeration — `deriveType`, `deriveScope`, `buildSummary`, `deriveChangelogCategory`, `buildChangelogBullet` keep their `sig.files` input, since they derive the *semantic* nature of the change and are not the defect. Reuse the fallback path's `MAX_FILES = 15` cap with a `(+N more changed file(s))` suffix. For `magic.run` this is the common case: its whitelist is pure SDD bookkeeping, so the task's own source-code deliverable is never in scope — commit `b96ce07` suggested 2 files against an actual 17. `emitSuccess()` is not currently exported; if T-15T02 asserts its stdout directly, export it rather than asserting on a subprocess's captured output.

### [T-15B03] Drop the artifact ID from the single-spec CHANGELOG bullet (RC-11)

- **Spec:** l2-engine-finalization.md §7.2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (`commit-suggester.js`)
- **Files:** `.magic/scripts/lib/commit-suggester.js` (`buildChangelogBullet()`, `spec` case, line ~222)
- **Verify:** `node -e "const {buildChangelogBullet}=require('./.magic/scripts/lib/commit-suggester');console.log(buildChangelogBullet('spec','engine',[{path:'.design/engine/specifications/l1-model-runtime.md',status:'modified'}]))"` MUST NOT contain `model-runtime`.
- **Handoff:** Gates T-15T02's RC-11 case.
- **Notes:** This text is written straight into the product's root `CHANGELOG.md` with no Coder authoring it and no Code-reviewer reviewing a diff, so RC-5/RC-6 never see it — regression coverage is RC-11's only enforcement surface. Scope is the `specs.length === 1` branch alone: the multi-item branch and the `run` case's single-item branch already use the correct generic shape. `artifactId()` stays in use in `buildSummary()` — commit messages are git metadata and exempt under RC-8. Do not remove the helper.

### [T-15C01] Remove `--status=` from the per-task update-state call site (SC-1.1)

- **Spec:** l2-engine-finalization.md §8.3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (documentation, independent of A and B)
- **Files:** `.magic/run.md` §2.5 (line ~31)
- **Verify:** `grep -n "update-state" .magic/run.md` — the per-task invocation MUST carry `--task=` and `--next-action=` and no `--status=`; the phase-start (`--status=Active`) and Pause Propagation (`--status=Blocked`) call sites MUST remain untouched.
- **Notes:** `update-state.js` has exactly one `status` handler, mapped to the top-level `**Status:**` field — there is no task-status field for the documented per-task form to target, so `--status=Done` writes `Done` into a field whose vocabulary is `Active | Blocked | Paused`. A task's completion state is already authoritative in its checklist line and Detailed Tracking entry; `STATE.md` needs no copy. Pause Propagation's `--status=Blocked` is *not* the same defect — it fires on phase-wide exhaustion, a phase-scoped assessment, and stays. No script change: the call site is the documentation.

### [T-15T01] Harness coverage — `update-state.js` (five cases)

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l2-engine-finalization.md §8.6, §10.3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with five new cases: (1) SC-2.3 — `computeProgress()` on a two-level fixture emits a `Phase {N}:` line; (2) over-classification — a fence with `Specification:`/`Plan:`/`Implementation:` lines alongside `Overall`/`Phase {N}` keeps the custom lines and regenerates only the two engine labels; (3) injection — a preserved narrative line containing `$1` survives `autoProgress` byte-for-byte and the fence's backtick count is unchanged; (4) SC-1.2 — a fixture driven past 100 lines by `addConstraint` alone, `## Recent Decisions` pre-seeded at its 1-entry floor, emits a warning distinguishable from the routine prune; (5) SC-1.1 — a per-task call (`--task=`, no `--status=`) leaves the phase-level `Status` unchanged.
- **Handoff:** Requires T-15A01..T-15A04 merged.
- **Notes:** Case 5 pins behavior that is already correct in `update-state.js` — the defect it guards is T-15C01's call site, which has no code to test. Pin it here anyway: the mandate is that the *field* is never written from a task-scoped event, and a future call-site regression is what this catches. Case 4 asserts on the two warnings being observably different, not on their exact wording. Drive the fixtures through the public exports (`updateState`, `computeProgress`) — case 3's byte-for-byte assertion is the whole point, so compare the narrative line with `assert.strictEqual`, not a regex match.

### [T-15T02] Harness coverage — `finalize.js` / `commit-suggester.js` (three cases)

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l2-engine-finalization.md §7.3, §8.6, §9.3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with three new cases: (1) SC-2.1(a) — `computeNextAction()` against a Blocked two-level fixture returns no execute-style recommendation naming the blocked task's ID, and still emits exactly one command; (2) SC-3.1 — a `magic.run` fixture with one whitelist-matched and one non-whitelisted change produces a commit body and `### Changed artifacts` listing naming **both**, while significance, version bump, and CHANGELOG category still key off the whitelist file alone; (3) RC-11 — `buildChangelogBullet('spec', ws, [oneSpec])` embeds no spec-derived identifier.
- **Handoff:** Requires T-15B01..T-15B03 merged. Gates T-15T03.
- **Notes:** Case 2 is the inverse of the existing SC-3 fallback tests, which already exercise the full changed-set on the *non*-significant path — this closes the equivalent gap on the significant path, so assert both halves (listing widened **and** significance unchanged) or the test passes for the wrong reason. Case 3 asserts against the function's return value, not against a written `CHANGELOG.md` — only a real invocation touches that file. Existing count is 34; expect 42 after T-15T01 and this task.

### [T-15T03] Validation — C14 bump, full harness, meta parity

- **Spec:** l2-engine-finalization.md §7-§10; AGENTS.md §2.4 (C14)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** All four MUST pass — `node .magic/scripts/executor.js update-engine-meta` (bumps the patch version and regenerates checksums); `node --test dev/tests/engine.js` green at 42; `node .magic/scripts/executor.js update-engine-meta --check` reports no drift; `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `"ok": true` with no `SYNC_GAP`.
- **Notes:** C14 runs **once**, here, after every engine edit in Tracks A-C has landed — the tracks are file-independent but all write inside `.magic/`, so per-track bumps would produce a version per task for one logical change. No `rules/` or `workflows/` file is touched by this phase, so no hardlink restore is needed ([C-001] does not apply); Phase 16 is where it does. Do not invoke any write-side git command — the commit is the user's.
