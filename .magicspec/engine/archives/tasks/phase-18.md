---
phase: 18
name: "Engine Diagnostics Digest"
status: Done
subsystem: ".magic/scripts, .magic/scripts/lib, rules"
requires: []
provides:
  - "lib/diagnostics.js collector: record/read/drain over a global JSONL sink, dedup+cap digest formatter"
  - "finalize.js emitTail(): one shared terminal block (notice → digest → next step) on both exit paths"
  - "record-diagnostic executor subcommand — the agent's own findings reach the same digest (DG-8)"
  - "All 17 pre-existing non-fatal emitters across 6 scripts now record alongside their existing print"
  - "rules/magic.md §9 obligates the agent to record what it previously only narrated in chat"
key_files:
  created:
    - .magic/scripts/lib/diagnostics.js
    - .magic/scripts/record-diagnostic.js
  modified:
    - .magic/scripts/finalize.js
    - .magic/scripts/update-state.js
    - .magic/scripts/update-engine-meta.js
    - .magic/scripts/lib/project-version.js
    - .magic/scripts/init.js
    - .magic/scripts/check-prerequisites.js
    - rules/magic.md
    - dev/tests/engine.js
patterns_established:
  - "Severity is decided by what happened to state (error/warning/fix), never by how alarming the message reads"
  - "Sink is drained, not appended — the sink means exactly 'not yet reported', findings that matter longer become a task or CHANGELOG entry"
  - "Preview reads, mutation drains — DG-4.1's non-consumption rule expressed as a choice of collector entry point, not a threaded flag"
  - "Terminal block owned by one shared emitter, never by the path-specific ones — the only way cross-path ordering stays checkable instead of aspirational"
duration_minutes: ~
---

# Stage 18 Tasks — Engine Diagnostics Digest

**Phase:** 18
**Status:** Done
**Strategic Goal:** Every non-fatal finding the engine produces stops being written only to a channel the relay contract does not cover. Findings are recorded as they occur, accumulate across the separate processes of one workflow invocation, and are delivered once — deduplicated, capped, ordered by severity — immediately before a next step that finalization now prints instead of leaving the agent to re-derive.

## Atomic Checklist

- [x] [T-18A01] Collector core — record, read, drain, sink resolution, retention bound
- [x] [T-18A02] Digest formatter — dedup, severity order, cap, remedy lines
- [x] [T-18B01] Extract the finalize tail emitter and add the next-step section
- [x] [T-18B02] Wire drain and digest render into the tail emitter
- [x] [T-18C01] `record-diagnostic` executor subcommand (agent channel)
- [x] [T-18D01] Migrate the six finalize.js emitters
- [x] [T-18D02] Migrate the five update-state.js emitters
- [x] [T-18D03] Migrate the remaining four scripts
- [x] [T-18E01] State the agent's recording obligation in the ambient rules
- [x] [T-18T01] Harness coverage — collector contract
- [x] [T-18T02] Harness coverage — output surface and ordering
- [x] [T-18T03] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-18A01] Collector core — record, read, drain, sink resolution, retention bound

- **Spec:** l2-engine-diagnostics.md §4.2, §4.3, §4.4, §4.5
- **Status:** Done
- **Changes:** New `.magic/scripts/lib/diagnostics.js`: `record()`/`read()`/`drain()` over a single global JSONL sink at `.design/.cache/diagnostics.jsonl` (matching `finalize-state.json`'s own precedent — not per-workspace, resolved once from the module's own `__dirname` rather than any caller's). `record()` reuses `mkdirSafe`/`appendFileSafe` from `utils.js`, so it inherits `MAGIC_DRY_RUN` behavior for free instead of special-casing it. `MAX_SINK_ENTRIES = 200` with a single non-repeating overflow marker.
- **Assignment:** Agent
- **Track:** A (collector)
- **Files:** `.magic/scripts/lib/diagnostics.js` (new)
- **Verify:** Satisfied — smoke-tested directly (three `record()` calls of distinct severities, `drain()` returned them in append order, a second `drain()` returned `[]`, `read()` left the file untouched), then pinned by T-18T01's harness cases.
- **Handoff:** Gated every other track.
- **Notes:** The check-prerequisites.js `warn()` helper (T-18D03) calls into this module before that script's own `designDir` local is initialized at module scope — resolving the sink globally rather than per-workspace was what made that call site safe without reordering existing code. `drain()` is `read()` plus unlink specifically so DG-4.1 ("a preview must not consume") is a choice of entry point, not a flag threaded through the parser.

### [T-18A02] Digest formatter — dedup, severity order, cap, remedy lines

- **Spec:** l2-engine-diagnostics.md §4.6; l1-engine-diagnostics.md DG-4, DG-7
- **Status:** Done
- **Changes:** `dedupe()`/`summarize()`/`formatDigest()` added to the same module. `formatDigest()` returns the full section — heading, severity summary line, capped bullets with remedy sub-lines — as `[]` for empty input, so the caller renders "no section" by simply not pushing anything.
- **Assignment:** Agent
- **Track:** A (collector)
- **Files:** `.magic/scripts/lib/diagnostics.js`
- **Verify:** Satisfied — `formatDigest([])` → `[]`; 12 identical findings → one line ending `(×12)`; 20 distinct → 15 rendered + one omission line. Confirmed live against real `ENGINE_INTEGRITY` findings recorded during development (see T-18D03 Notes).
- **Handoff:** Required by T-18B02.
- **Notes:** Dedup key is `(severity, source, code)`, deliberately excluding `message` — the message carries per-occurrence detail (a line count, a filename) that would defeat the collapse if included in the key.

### [T-18B01] Extract the finalize tail emitter and add the next-step section

- **Spec:** l2-engine-diagnostics.md §4.7; l2-engine-finalization.md §11; l1-engine-diagnostics.md DG-5, DG-6
- **Status:** Done
- **Changes:** New `emitTail()` in `finalize.js`. Auto-commit notice moved out of `emitFallbackCommitSuggestion()` and the end of `emitSuccess()` into this one function; `main()` calls it once on each exit path with `stateResult.nextAction` (already computed by `updateSessionState()`, previously discarded — now threaded through instead of recomputed).
- **Assignment:** Agent
- **Track:** B (finalize tail)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** Satisfied — `grep -c 'Auto-commit is' .magic/scripts/finalize.js` = 1. Live `--dry-run` runs on both paths confirmed the next-step text matches the `STATE.md` preview line.
- **Handoff:** Required by T-18B02 and T-18D01 (all three touch `finalize.js`).
- **Notes:** First implementation pass revealed a spacing regression the task's own Verify line didn't anticipate: removing the notice's trailing blank-line element from `emitFallbackCommitSuggestion()`/`emitSuccess()` collapsed the blank-line separator `emitTail()`'s leading element depends on (two adjacent `process.stdout.write()` calls need the *first* to end in `\n` and the *second* to start with one, or the gap disappears). Caught by inspecting live `--dry-run` output before writing any harness assertions on it, fixed by restoring one trailing blank push to each of the two callers. Folded T-18B02's digest wiring into the same `emitTail()` definition rather than writing an intermediate diagnostics-unaware version and immediately rewriting it — the two tasks share one function and there was no value in a throwaway intermediate state.

### [T-18B02] Wire drain and digest render into the tail emitter

- **Spec:** l2-engine-diagnostics.md §4.7; l1-engine-diagnostics.md DG-4.1, DG-5, DG-7
- **Status:** Done
- **Changes:** `main()` computes `findings = opts.dryRun ? diagnostics.read() : diagnostics.drain()` once per exit path, immediately before that path's `emitTail()` call (after every mutating step). `emitSuccess()`'s summary table gains a conditional `| Diagnostics | … |` row (`diagnosticsCount = diagnostics.summarize(findings)`, rendered only when `total > 0`).
- **Assignment:** Agent
- **Track:** B (finalize tail)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** Satisfied — live-verified: pre-populated sink → digest before notice-then-next-step on both a forced-significant and a skip `--dry-run` run; `--dry-run` left the sink byte-identical (confirmed via `read()` before/after); empty sink produced no heading and no table row while still printing the next step. All four re-pinned by T-18T02.
- **Handoff:** Required T-18A02 and T-18B01.
- **Notes:** Implemented together with T-18B01 (see that entry's Notes) since both live in the same function and the same `main()` call sites.

### [T-18C01] `record-diagnostic` executor subcommand (agent channel)

- **Spec:** l2-engine-diagnostics.md §4.8; l1-engine-diagnostics.md DG-8
- **Status:** Done
- **Changes:** New `.magic/scripts/record-diagnostic.js`. Needs no dispatch-table registration — `executor.js` already proxies any `<name>.js` present in `.magic/scripts/` to `node <name>.js [args]`.
- **Assignment:** Agent
- **Track:** C (agent channel)
- **Files:** `.magic/scripts/record-diagnostic.js` (new)
- **Verify:** Satisfied — live-tested through the real executor: a valid finding recorded and exited 0; `--severity=bogus` also exited 0 and recorded nothing.
- **Handoff:** Required T-18A01. Independent of Tracks B and D — implemented before them.
- **Notes:** `executor.js` itself strips `--workspace` before dispatch (sets `MAGIC_DESIGN_DIR` for the child, doesn't forward the flag), and the sink is workspace-independent by design (T-18A01), so `--workspace` needed no handling inside this script at all — confirmed live, `--workspace=engine` on the CLI never reached the child's own argv.

### [T-18D01] Migrate the six finalize.js emitters

- **Spec:** l2-engine-diagnostics.md §5.1
- **Status:** Done
- **Changes:** All six codes added alongside their existing `console.warn`: `NEXT_ACTION_SUBSTITUTED` (fix), `STATE_UPDATE_SKIPPED` (error), `CHANGELOG_FORMAT_NONSTANDARD` (fix), `CHANGELOG_WRITE_FAILED` (error), `PHASE_ARCHIVE_SKIPPED` (warning), `PHASE_ARCHIVE_FAILED` (error).
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** Satisfied — `grep -c 'console.warn' .magic/scripts/finalize.js` = 6, unchanged from before the task; all six codes present.
- **Handoff:** Required T-18A01 and T-18B01 (shared file).
- **Notes:** None beyond the spec's own rationale.

### [T-18D02] Migrate the five update-state.js emitters

- **Spec:** l2-engine-diagnostics.md §5.2
- **Status:** Done
- **Changes:** `STATE_TEMPLATE_MISSING` (fix, on the pre-existing `console.error`, not a `console.warn`), `PROGRESS_RECOMPUTE_SKIPPED` (error), `STATE_DECISION_PRUNED` (fix), `STATE_CAP_EXHAUSTED` (warning), `UNKNOWN_ARGUMENT` (warning).
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** Satisfied — `console.warn` count unchanged (4) and `console.error` count unchanged (3); all five codes present.
- **Handoff:** Required T-18A01. File-independent of D01 and D03.
- **Notes:** One of the five codes attaches to a `console.error` call, not a `console.warn` — DG-2's classification is by what happened to state, not by which print function the original author chose, so `STATE_TEMPLATE_MISSING` is still `fix` (state was created, just from a fallback) despite the alarming-sounding original print.

### [T-18D03] Migrate the remaining four scripts

- **Spec:** l2-engine-diagnostics.md §5.3, §5.4
- **Status:** Done
- **Changes:** `SKILL_SYNC_UNAVAILABLE`, `CHECKSUM_TOOLING_UNAVAILABLE` (update-engine-meta.js); `VERSION_FILE_HEALED` (lib/project-version.js); `TEMPLATE_MISSING`, `GIT_HOOKS_NOT_INSTALLED` (init.js); `check-prerequisites.js`'s `warn()` helper now forwards every call's existing `type`/`fix` straight through as `code`/`remedy` — no new literal codes.
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/update-engine-meta.js`, `.magic/scripts/lib/project-version.js`, `.magic/scripts/init.js`, `.magic/scripts/check-prerequisites.js`
- **Verify:** Satisfied — all five new codes present; `check-prerequisites.js` forwarding confirmed live against this repository's own `ENGINE_INTEGRITY` findings (real drift present mid-implementation, from editing `.magic/` ahead of the T-18T03 bump) — the sink correctly accumulated one entry per warned file, matching the JSON `warnings` array exactly.
- **Handoff:** Required T-18A01. Did `check-prerequisites.js` last, per plan.
- **Notes:** The `warn()` forwarding site sits before `check-prerequisites.js`'s own `designDir` module-scope const is initialized (two `warn()` calls fire earlier, for the checksum-manifest check) — resolved by T-18A01's global (not per-workspace) sink design rather than by reordering the script's existing code.

### [T-18E01] State the agent's recording obligation in the ambient rules

- **Spec:** l1-engine-diagnostics.md DG-8, §1.4
- **Status:** Done
- **Changes:** New `### Recording (Diagnostics Digest)` subsection in `rules/magic.md` §9, between Action and Report Template; §8 Completion Checklist's §9 line extended to require the recording step. §3 left untouched, as planned — its existing "display stdout verbatim" instruction already covers the digest without modification.
- **Assignment:** Agent
- **Track:** E (ambient rules)
- **Files:** `rules/magic.md`, `.agents/rules/magic.md` (hardlink twin)
- **Verify:** Satisfied — §9 names the recording step; `fsutil hardlink list rules\magic.md` showed both paths after recreation; `node dev/scripts/validate-hardlinks.js` passed (1/1 rule file linked; the pre-existing, unrelated `GEMINI.md` warning is R9, already tracked in `PLAN.md` Backlog, untouched by this task).
- **Handoff:** Independent of all other tracks.
- **Notes:** **[C-001] fired exactly as expected**: the edit delinked `.agents/rules/magic.md` (`fsutil hardlink list` dropped to a single path immediately after the write). Recreated via `Remove-Item` + `New-Item -ItemType HardLink` and re-verified before moving on, per the constraint's own instruction. This track carries no C14 bump — `rules/` sits outside version/checksum tracking, confirmed by `update-engine-meta`'s scan zone covering only `.magic/`.

### [T-18T01] Harness coverage — collector contract

- **Spec:** l2-engine-diagnostics.md §6 cases 1, 5, 6, 7, 9
- **Status:** Done
- **Changes:** Five new cases in `dev/tests/engine.js` §16a: round-trip/exactly-once; never-throws against an unwritable sink (a regular file occupying `.design/.cache`, forcing the parent-directory create to fail); truncated-line tolerance; dedup-with-count and cap-with-omission; `--dry-run` non-consumption followed by a real run that still reports and then drains the same finding.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all five pass. The "unwritable sink" fixture was verified by direct `node -e` reproduction before being written into the harness: the actual failure point is `appendFileSafe`'s `fs.appendFileSync` (ENOENT, parent path occupied by a file), not `mkdirSafe` as first assumed — `mkdirSafe` short-circuits on its own `fs.existsSync` check, which is true for a file too. Contract (`record()` returns `false`, never throws) holds regardless of which internal call is the actual failure point.
- **Handoff:** Required T-18A01, T-18A02, T-18B02.
- **Notes:** An IDE lint hook flagged duplicated code blocks across the new tests (repeated `createFinalizeFixture` + plan-complete `TASKS.md` + `commitFixture` triplet). Factored into a local `commitPlanCompleteFixture(tempDir, wsDir)` helper used by three tests in this section — a genuine, low-risk reduction. A second, smaller residual overlap (the `createTempWorkspace(true)` + `createFinalizeFixture` opening shared by two tests) was left alone: that same four-line opening already repeats across dozens of pre-existing tests file-wide, so "fixing" it further would mean refactoring established suite-wide boilerplate for a cosmetic linter score, not a real duplication this task introduced.

### [T-18T02] Harness coverage — output surface and ordering

- **Spec:** l2-engine-diagnostics.md §6 cases 2, 3, 4, 8; l2-test-suite.md §Script-Level Regression Harness
- **Status:** Done
- **Changes:** Four new cases in `dev/tests/engine.js` §16b: cross-path ordering (digest before next step, next step last, on both the skip and significant paths); next-step string identity against the persisted `STATE.md` value; empty-sink silence (no heading, no table row, next step still prints) on both paths; `record-diagnostic` CLI exit-0 for both valid and invalid input, with only the valid finding reaching the sink.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all four pass on first run. The ordering assertion checks the *index* of each heading in stdout (`digestIdx < nextIdx`, and nothing else follows `### Next step`), not merely presence — a presence-only check would have passed even under the pre-fix bug this phase exists to close.
- **Handoff:** Required T-18B01, T-18B02, T-18C01.
- **Notes:** Implemented in the same pass as T-18T01 (both land in one `dev/tests/engine.js` edit, verified together with a single harness run) rather than as two separate edit/verify cycles — the file and fixtures are shared, and splitting the run would have added nothing but a second identical `node --test` invocation.

### [T-18T03] Validation — C14 bump, full harness, meta parity

- **Spec:** l1-engine-diagnostics.md §3; l2-engine-diagnostics.md §6
- **Status:** Done
- **Changes:** `update-engine-meta` run: engine 2.1.65 → 2.1.66, checksums regenerated over 69 files (8 detected as changed: `check-prerequisites.js`, `finalize.js`, `init.js`, `lib/diagnostics.js`, `lib/project-version.js`, `record-diagnostic.js`, `update-engine-meta.js`, `update-state.js`), skill wrappers re-projected (no content change — this phase touched no workflow body).
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Satisfied, all four: version bumped 2.1.65 → 2.1.66; `node --test dev/tests/engine.js` → 55/55 (46 pre-existing + 9 new), rerun clean after the bump too; `update-engine-meta --check` → `No changes detected`; `check-prerequisites --verify-headers --workspace=engine` → `"ok": true`, `"warnings": []`.
- **Handoff:** Required every preceding task.
- **Notes:** Before the bump, `check-prerequisites` correctly reported six live `ENGINE_INTEGRITY` warnings (the eight edited files, minus the two new ones which have no prior checksum to drift from) — used as an incidental, real (not synthetic) confirmation that T-18D03's `check-prerequisites.js` migration works end-to-end, since those findings landed in the real sink with the exact same content as the JSON `warnings` array. Sink cleared before and after this incidental check so it wouldn't pollute the phase's actual closing finalize run.
