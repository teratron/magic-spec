---
phase: 15
name: "Finalize-Pipeline Accuracy & Generator Containment"
status: Done
subsystem: ".magic/scripts, .magic/scripts/lib, dev/tests"
requires: []
provides:
  - "Phase-level progress counter works on the canonical two-level task layout"
  - "Progress fence merge preserves operator narrative, including `$`-digit text"
  - "Line-cap guard reports exhaustion distinctly from a successful prune"
  - "Next Action never dispatches into a phase recorded as Blocked"
  - "Finalize output enumerates the whole working tree, not the whitelist subset"
  - "Generated CHANGELOG bullets carry no spec identifiers"
key_files:
  created: []
  modified:
    - .magic/scripts/update-state.js
    - .magic/scripts/finalize.js
    - .magic/scripts/lib/commit-suggester.js
    - .magic/run.md
    - dev/tests/engine.js
patterns_established:
  - "Two file sets, two questions: significance drives the bump, the full diff drives what the user reviews"
  - "Function-form .replace() wherever the replacement carries uncontrolled text"
  - "A guard that cannot act must say so — never reuse the success message"
  - "Closed label sets must admit the template's placeholder form, not only its runtime form"
duration_minutes: ~
---

# Stage 15 Tasks — Finalize-Pipeline Accuracy & Generator Containment

**Phase:** 15
**Status:** Done
**Strategic Goal:** The SC-2 state-update step makes `STATE.md` more accurate after every run, never less; the finalize generator never writes an SDD identifier into a product file; and what finalize prints matches the diff the user is about to commit. Implements the eight `Required Fix` blocks in `l2-engine-finalization.md` §7-§10 — all authored across seven field-report cycles, all still reproducible in engine 2.1.62.

## Atomic Checklist

- [x] [T-15A01] Phase-counter fallback to the two-level task layout (SC-2.3)
- [x] [T-15A02] Narrow the Progress counter classifier to engine-owned labels (SC-2)
- [x] [T-15A03] Function-form replacement for the Progress fence rewrite (SC-2)
- [x] [T-15A04] Distinguish cap-exhausted from cap-restored in the line-cap guard (SC-1.2)
- [x] [T-15B01] Blocked-phase precedence in the Next Action computation (SC-2.1(a))
- [x] [T-15B02] Enumerate every changed file in the commit suggestion and stdout (SC-3.1)
- [x] [T-15B03] Drop the artifact ID from the single-spec CHANGELOG bullet (RC-11)
- [x] [T-15C01] Remove `--status=` from the per-task update-state call site (SC-1.1)
- [x] [T-15T01] Harness coverage — `update-state.js` (five cases)
- [x] [T-15T02] Harness coverage — `finalize.js` / `commit-suggester.js` (three cases)
- [x] [T-15T03] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-15A01] Phase-counter fallback to the two-level task layout (SC-2.3)

- **Spec:** l2-engine-finalization.md §8.2
- **Status:** Done
- **Changes:** Added `readPhaseChecklist()`; `computeProgress()` falls back to it when TASKS.md has no inline heading. Fenced blocks and code-spans are stripped before counting.
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** Satisfied — `update-state --workspace=engine --auto-progress` produced `Phase 15: [0/11]` in this repository's `STATE.md`, which had carried an `Overall`-only block for its entire history. Count of 11 matches the checklist exactly, confirming the code-span strip works (the phase file quotes `- [ ]` in two Notes).
- **Handoff:** Gated T-15T01's SC-2.3 case.
- **Notes:** The inline `### Phase {n} Checklist` heading exists only in the legacy single-file layout, so `section` was always `null` on the canonical layout and the phase-line branch never fired — for every project on the modern format, not only Blocked ones. The legacy path is kept: those workspaces still depend on it. Code-span stripping was not in the spec's stated fix but guards the same false-positive class that once suppressed archival eligibility; the two predicates ask different questions (counts vs. a boolean), so they are deliberately not shared.

### [T-15A02] Narrow the Progress counter classifier to engine-owned labels (SC-2)

- **Spec:** l2-engine-finalization.md §8.4
- **Status:** Done
- **Changes:** `counterRe` label class narrowed from any label to `Overall` / `Phase {N}`, admitting both the runtime (`Phase 15`) and template placeholder (`Phase {N}`) forms.
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** Satisfied — `node --test dev/tests/engine.js`: the new *"preserves counter-shaped lines under labels the engine never writes"* case passes, and the pre-existing *"replaces template placeholder counters without duplicating them"* case still passes.
- **Notes:** **Spec deviation, deliberate.** §8.4's literal GOOD regex is `^(?:Overall|Phase \d+):…`, which fails template bootstrap: `state.md` ships `Phase {N}: [{filled}/{total}]`, whose label is not `Phase \d+`. Applying the spec verbatim demoted that line to narrative, so the placeholder survived instead of being replaced — caught by an existing harness case, which is exactly what that case exists for. Implemented as `Phase (?:\d+|\{[^}]*\})`. The spec's own reasoning ("only the label portion narrows") is preserved; only its example regex was incomplete. Worth an amendment so the next reader does not re-apply the narrow form.

### [T-15A03] Function-form replacement for the Progress fence rewrite (SC-2)

- **Spec:** l2-engine-finalization.md §8.5
- **Status:** Done
- **Changes:** `content.replace(progressRe, …)` switched from a string-form replacement to a function returning the captured groups verbatim.
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** Satisfied — a fixture whose preserved narrative reads `spend is $1,200 of the` / `$3,000 sprint allocation` survives byte-for-byte with the fence count unchanged (harness case *"leaves `$`-digit sequences in narrative untouched"*).
- **Notes:** The most severe defect in §8 — the others misplace or lose values, this one corrupted markdown structure by splicing a captured fence fragment mid-narrative. Scope held to the single call site: §8.5 records that the rest of the pipeline was swept and no other `.replace()` combines capture groups with unconstrained input.

### [T-15A04] Distinguish cap-exhausted from cap-restored in the line-cap guard (SC-1.2)

- **Spec:** l2-engine-finalization.md §10.2
- **Status:** Done
- **Changes:** Guard now tracks whether a decision was actually removed and emits a distinct warning naming `## Blocking Constraints` when nothing could be pruned; the write still proceeds.
- **Assignment:** Agent
- **Track:** A (`update-state.js`)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** Satisfied — two fixtures over the cap (one with `## Recent Decisions` at its 1-entry floor, one with three entries) produce observably different warnings; only the exhausted one says nothing was pruned.
- **Notes:** Mirror-pruning `## Blocking Constraints` was rejected per the spec: a Decision is disposable narrative, a Constraint is safety-critical and the template marks it MANDATORY reading. Silently dropping one could remove the single warning that prevents an incident.

### [T-15B01] Blocked-phase precedence in the Next Action computation (SC-2.1(a))

- **Spec:** l2-engine-finalization.md §8.1
- **Status:** Done
- **Changes:** Added `isPhaseBlocked()` reading frontmatter `status:` and the TASKS.md registry row independently; the tier-2 loop redirects to blocker resolution instead of dispatching execution.
- **Assignment:** Agent
- **Track:** B (`finalize.js`)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** Satisfied — a Blocked fixture yields `Resolve blocker on T-1A01 (demo) — see STATE.md ## Blockers, then run /magic.run demo`; not execute-style, exactly one command. Harness sweeps all three signal combinations plus an unblocked control.
- **Handoff:** Gated T-15T02's Blocked-precedence case.
- **Notes:** Either signal alone is treated as sufficient: the two are written by different steps and are not atomic, so requiring agreement would wave a half-applied transition through. The control case matters as much as the positive ones — a guard that fires on every phase would be equally wrong and equally green against Blocked-only fixtures.

### [T-15B02] Enumerate every changed file in the commit suggestion and stdout (SC-3.1)

- **Spec:** l2-engine-finalization.md §9.2
- **Status:** Done
- **Changes:** Extracted `collectChangedFiles()` and hoisted `MAX_LISTED_FILES`; `buildCommitMessage()` gained `headerFiles` so the header keeps its whitelist input while the body enumerates the full tree. `emitSuccess()` lists the same set and names the omitted remainder.
- **Assignment:** Agent
- **Track:** B (`finalize.js` + `commit-suggester.js`)
- **Files:** `.magic/scripts/finalize.js`, `.magic/scripts/lib/commit-suggester.js`
- **Verify:** Satisfied — `finalize --workflow=run --dry-run` against a tree holding one whitelisted and four non-whitelisted changes listed all five in both places, while the header stayed `chore(engine): update STATE.md`, derived from the single whitelisted file.
- **Handoff:** Gated T-15T02's visibility case.
- **Notes:** The fallback path was refactored onto the same helper rather than keeping a second copy of the cap-and-map logic. The `Detected changes` cell now names both counts when they differ — the two numbers answer different questions and hiding one is what made the gap invisible. `emitSuccess` and `collectChangedFiles` are exported for the harness.

### [T-15B03] Drop the artifact ID from the single-spec CHANGELOG bullet (RC-11)

- **Spec:** l2-engine-finalization.md §7.2
- **Status:** Done
- **Changes:** `buildChangelogBullet()`'s single-spec branch returns `{verb} a specification ({workspace})`; the identifier interpolation is gone.
- **Assignment:** Agent
- **Track:** B (`commit-suggester.js`)
- **Files:** `.magic/scripts/lib/commit-suggester.js`
- **Verify:** Satisfied — the function returns `Updated a specification (engine)` for a single-spec input; no identifier appears.
- **Notes:** Scope held to the one outlier branch. `artifactId()` remains in use for the commit-message header, which is git metadata and exempt. The harness also pins the multi-spec and task-execution branches so neither regresses into interpolating an identifier.

### [T-15C01] Remove `--status=` from the per-task update-state call site (SC-1.1)

- **Spec:** l2-engine-finalization.md §8.3
- **Status:** Done
- **Changes:** The per-task invocation in `.magic/run.md` §2.5 now carries `--task=` and `--next-action=` only, with an inline note on why the flag is phase-scoped.
- **Assignment:** Agent
- **Track:** C (documentation, independent of A and B)
- **Files:** `.magic/run.md`
- **Verify:** Satisfied — the per-task call carries no `--status=`; the phase-start and Pause Propagation call sites are unchanged.
- **Notes:** No script change: the call site *was* the defect. `update-state.js` has one `status` handler mapped to the top-level field, so the documented per-task form wrote `Done` into a field whose vocabulary is `Active | Blocked | Paused`.

### [T-15T01] Harness coverage — `update-state.js` (five cases)

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l2-engine-finalization.md §8.6, §10.3
- **Status:** Done
- **Changes:** Five cases added covering SC-2.3, over-classification, `$`-digit injection, SC-1.2 exhaustion, and SC-1.1 field scope.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all five pass in `node --test dev/tests/engine.js`.
- **Notes:** The SC-1.1 case pins behavior that was already correct in the script; the defect lived in the call site, which has no code to test. It is pinned anyway — the invariant is that the field is never written from a task-scoped event, and a future call-site regression is what it catches. The injection case asserts byte-level survival and an unchanged fence count, since the failure mode is structural rather than a wrong value.

### [T-15T02] Harness coverage — `finalize.js` / `commit-suggester.js` (three cases)

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l2-engine-finalization.md §7.3, §8.6, §9.3
- **Status:** Done
- **Changes:** Four cases added (SC-2.1(a) with a control, SC-3.1 end-to-end, `buildCommitMessage` header/body split as a unit, RC-11 bullet shape). Shared git-fixture setup extracted into `createFinalizeFixture()` / `commitFixture()`.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all pass; suite is 43 tests, up from 34.
- **Notes:** Split into four rather than the planned three: the end-to-end SC-3.1 run proves the listing widened, but a unit test on `buildCommitMessage` with deliberately disjoint `files`/`headerFiles` is what actually proves the two sets stayed separate — the e2e assertion alone would pass even if the header had silently widened too. Nine tests were added overall, one more than planned.

### [T-15T03] Validation — C14 bump, full harness, meta parity

- **Spec:** l2-engine-finalization.md §7-§10
- **Status:** Done
- **Changes:** Engine 2.1.62 → 2.1.63; checksums regenerated over 66 files; skill wrappers re-synced.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Satisfied — all four criteria: `update-engine-meta` bumped to 2.1.63; harness 43/43; `update-engine-meta --check` reports no drift; `check-prerequisites` returns `"ok": true` with an empty `warnings` array (the `SYNC_GAP` that opened this cycle is closed).
- **Notes:** C14 ran once, after every engine edit landed. No `rules/` or `workflows/` file was touched, so no hardlink restore was needed. No write-side git command was invoked.
