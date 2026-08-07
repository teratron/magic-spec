---
phase: 18
name: "Engine Diagnostics Digest"
status: Todo
subsystem: ".magic/scripts, .magic/scripts/lib, rules"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 18 Tasks — Engine Diagnostics Digest

**Phase:** 18
**Status:** Todo
**Strategic Goal:** Every non-fatal finding the engine produces stops being written only to a channel the relay contract does not cover. Findings are recorded as they occur, accumulate across the separate processes of one workflow invocation, and are delivered once — deduplicated, capped, ordered by severity — immediately before a next step that finalization now prints instead of leaving the agent to re-derive.

## Atomic Checklist

- [ ] [T-18A01] Collector core — record, read, drain, sink resolution, retention bound
- [ ] [T-18A02] Digest formatter — dedup, severity order, cap, remedy lines
- [ ] [T-18B01] Extract the finalize tail emitter and add the next-step section
- [ ] [T-18B02] Wire drain and digest render into the tail emitter
- [ ] [T-18C01] `record-diagnostic` executor subcommand (agent channel)
- [ ] [T-18D01] Migrate the six finalize.js emitters
- [ ] [T-18D02] Migrate the five update-state.js emitters
- [ ] [T-18D03] Migrate the remaining four scripts
- [ ] [T-18E01] State the agent's recording obligation in the ambient rules
- [ ] [T-18T01] Harness coverage — collector contract
- [ ] [T-18T02] Harness coverage — output surface and ordering
- [ ] [T-18T03] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-18A01] Collector core — record, read, drain, sink resolution, retention bound

- **Spec:** l2-engine-diagnostics.md §4.2, §4.3, §4.4, §4.5
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (collector)
- **Files:** `.magic/scripts/lib/diagnostics.js` (new)
- **Verify:** `node -e` against a temp workspace: three `record()` calls of distinct severities followed by `drain()` returns three findings in append order; an immediately following `drain()` returns `[]` and the sink file no longer exists; `read()` on a populated sink leaves the file byte-identical (compare size + mtime).
- **Handoff:** Gates every other track.
- **Notes:** `drain()` is `read()` plus unlink — the split exists so DG-4.1's "a preview must not consume" is a choice of entry point, not a flag threaded through the parser. Validation is total and silent-by-degradation: a bad severity or a missing required field drops the entry with one warning and no throw, because a malformed diagnostic must never become a second defect. Message is truncated to a single line — an embedded newline breaks the JSONL invariant the whole format rests on. Sink path follows the same workspace chain `finalize.js` already resolves (`--workspace` → `MAGIC_WORKSPACE` → `MAGIC_DESIGN_DIR` → `workspace.json` default); reuse `mkdirSafe` rather than writing a new guard.

### [T-18A02] Digest formatter — dedup, severity order, cap, remedy lines

- **Spec:** l2-engine-diagnostics.md §4.6; l1-engine-diagnostics.md DG-4, DG-7
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (collector)
- **Files:** `.magic/scripts/lib/diagnostics.js`
- **Verify:** `formatDigest([])` returns `[]` (not a heading with no body); `formatDigest()` over 12 findings sharing one `(severity, source, code)` triple returns one entry ending `(×12)`; over 20 distinct findings returns 15 entries plus one omission line.
- **Handoff:** Required by T-18B02.
- **Notes:** The dedup key deliberately excludes `message` — the message carries the instance detail (a line count, a filename) that differs between otherwise identical occurrences, so including it would defeat the collapse entirely. Pure function, no I/O: that is what makes the cap and ordering testable without a sink.

### [T-18B01] Extract the finalize tail emitter and add the next-step section

- **Spec:** l2-engine-diagnostics.md §4.7; l2-engine-finalization.md §11; l1-engine-diagnostics.md DG-5, DG-6
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (finalize tail)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** `grep -n 'Auto-commit is' .magic/scripts/finalize.js` returns exactly one hit, inside `emitTail`; a finalize run on both the significant and the skip path ends with a `### Next step` section whose text equals the `Next Action` line written to `STATE.md` in the same run (`diff` the two strings).
- **Handoff:** Required by T-18B02 and T-18D01 (all three touch `finalize.js`).
- **Notes:** `updateSessionState()` already returns `{ updated, dryRun?, nextAction }` on every branch and `nextAction` is currently consumed by nobody — thread that value through. Do **not** call `computeNextAction()` a second time to obtain it: a recomputation satisfies the wording of DG-6 while restoring exactly the divergence it exists to close. The prohibition on `emitSkip()`/`emitSuccess()` rendering any part of the terminal block is the mechanism, not a style preference — it is what makes cross-path ordering assertable in T-18T02.

### [T-18B02] Wire drain and digest render into the tail emitter

- **Spec:** l2-engine-diagnostics.md §4.7; l1-engine-diagnostics.md DG-4.1, DG-5, DG-7
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (finalize tail)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** With a pre-populated sink, a normal run prints `### Engine diagnostics` before `### Next step` and leaves no sink file; a `--dry-run` over the same fixture prints the identical digest and leaves the sink byte-identical; an empty sink produces stdout containing neither the digest heading nor a diagnostics summary-table row, while still printing `### Next step`.
- **Handoff:** Required T-18A02 and T-18B01.
- **Notes:** The drain call sits in `main()` immediately before `emitTail()` — after phase archival, the state update, and the CHANGELOG write — so findings those steps emit are in the sink before the digest is composed. Under `--dry-run` the call is `read()`, matching how `--dry-run` already previews the `STATE.md` patch without writing it. The summary-table row is conditional on a non-zero count for the same reason the section is (DG-7): a row that renders on every invocation is a row nobody reads.

### [T-18C01] `record-diagnostic` executor subcommand (agent channel)

- **Spec:** l2-engine-diagnostics.md §4.8; l1-engine-diagnostics.md DG-8
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (agent channel)
- **Files:** `.magic/scripts/record-diagnostic.js` (new)
- **Verify:** `executor.js record-diagnostic --severity=warning --code=TEST_CODE --message="probe"` exits 0 and the entry appears in the next `drain()`; the same call with `--severity=bogus` also exits 0 (prints a warning, records nothing).
- **Handoff:** Required T-18A01. Independent of Tracks B and D.
- **Notes:** Exit 0 on a dropped record is deliberate and is the one place where the usual "invalid input is an error" instinct is wrong: an agent must never see a non-zero exit from *reporting a complaint*, or the reporting path itself becomes something to route around. Flags parse via the shared `parseFlags` helper — no bespoke argument handling. `--source` defaults to `agent`. This is an executor subcommand, not a `/magic.*` workflow command, so C2 is not engaged and no exception is needed.

### [T-18D01] Migrate the six finalize.js emitters

- **Spec:** l2-engine-diagnostics.md §5.1
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/finalize.js`
- **Verify:** All six codes from §5.1 (`NEXT_ACTION_SUBSTITUTED`, `STATE_UPDATE_SKIPPED`, `CHANGELOG_FORMAT_NONSTANDARD`, `CHANGELOG_WRITE_FAILED`, `PHASE_ARCHIVE_SKIPPED`, `PHASE_ARCHIVE_FAILED`) appear in the file; each sits alongside its existing `console.warn` rather than replacing it. `grep -c 'console.warn' .magic/scripts/finalize.js` is unchanged from before this task.
- **Handoff:** Required T-18A01 and T-18B01 (shared file).
- **Notes:** Additive by contract (DG-1): the print stays so a run that crashes before the drain still leaves its stderr trail. `NEXT_ACTION_SUBSTITUTED` is the `fix`-class case that motivated the whole phase — the engine overwrites a computed value and writes the result to live memory, and today the only record is outside the relay contract.

### [T-18D02] Migrate the five update-state.js emitters

- **Spec:** l2-engine-diagnostics.md §5.2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/update-state.js`
- **Verify:** All five codes from §5.2 appear; a fixture driven past the line cap with `## Recent Decisions` at its floor produces `STATE_CAP_EXHAUSTED` in the sink, and repeated calls produce repeated entries (dedup happens at render, not at record).
- **Handoff:** Required T-18A01. File-independent of D01 and D03.
- **Notes:** This is the highest-frequency emitter in the engine — its guard fires on every `updateState()` call once the cap is crossed, which is precisely why DG-4 mandates render-time deduplication rather than record-time suppression. Recording every occurrence and collapsing at render keeps the count honest; suppressing at record would lose it.

### [T-18D03] Migrate the remaining four scripts

- **Spec:** l2-engine-diagnostics.md §5.3, §5.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (emitter migration)
- **Files:** `.magic/scripts/update-engine-meta.js`, `.magic/scripts/lib/project-version.js`, `.magic/scripts/init.js`, `.magic/scripts/check-prerequisites.js`
- **Verify:** Codes `SKILL_SYNC_UNAVAILABLE`, `CHECKSUM_TOOLING_UNAVAILABLE`, `VERSION_FILE_HEALED`, `TEMPLATE_MISSING`, `GIT_HOOKS_NOT_INSTALLED` present; `check-prerequisites` forwards each warning's existing `w.type` as `code` and `fixHint` as `remedy` with no new literal codes introduced (`grep` for a hardcoded code string in its warning loop returns nothing).
- **Handoff:** Required T-18A01. Do `check-prerequisites.js` last (§7 note 5).
- **Notes:** `check-prerequisites.js` is a forwarding path, not a code-assignment site — it already emits `[{type}] {message}{fixHint}`, the shape DG-3 was generalized *from*. The two `update-engine-meta` cases are the sanctioned L1→L2 fallback guards: exactly the class a user installation hits and never sees today. `VERSION_FILE_HEALED` is a C20 auto-heal, one of the three `fix`-class findings where the engine altered state with no record inside the relay contract.

### [T-18E01] State the agent's recording obligation in the ambient rules

- **Spec:** l1-engine-diagnostics.md DG-8, §1.4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** E (ambient rules)
- **Files:** `rules/magic.md`, `.agents/rules/magic.md` (hardlink twin)
- **Verify:** `rules/magic.md` §9 names the recording step alongside the existing report block, and §3 notes that the relayed stdout now carries the digest and next step. `fsutil hardlink list rules\magic.md` shows both paths after the edit; `node dev/scripts/validate-hardlinks.js` passes.
- **Handoff:** Independent of all other tracks.
- **Notes:** §3 needs no change to its *relay instruction* — the digest rides inside stdout, so "display the entire stdout verbatim" already covers it, and that is a design property worth preserving rather than an oversight to correct. What genuinely must be added is DG-8: the agent's own findings only reach the digest if the agent is told to record them, and §9's existing one-shot chat block has no durable destination. **[C-001] applies**: `rules/magic.md` is hardlinked to `.agents/rules/magic.md` and write-replace editors delink the twin silently — recreate the link and re-verify in this task, not later. `rules/` sits outside C14 version/checksum tracking, so this track alone ships without a bump.

### [T-18T01] Harness coverage — collector contract

- **Spec:** l2-engine-diagnostics.md §6 cases 1, 5, 6, 7, 9
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with five new cases: drain round-trip and exactly-once; dedup-with-count and cap-with-omission; a sink whose middle line is truncated JSON draining to every other line's findings; `record()` against an unwritable path returning `false` without throwing; a `--dry-run` leaving the sink byte-identical while a following real run still reports the same findings.
- **Handoff:** Required T-18A01, T-18A02, T-18B02.
- **Notes:** Case 6 asserts the tail survives, not merely that no exception escapes — a drain that stops at the first bad line would pass a throw-only assertion while silently losing everything after it.

### [T-18T02] Harness coverage — output surface and ordering

- **Spec:** l2-engine-diagnostics.md §6 cases 2, 3, 4, 8; l2-test-suite.md §Script-Level Regression Harness
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with four new cases: digest-before-next-step with next-step last, asserted on the significant path **and** the skip path; printed next step byte-identical to the persisted `Next Action`; empty sink producing neither heading nor summary row while still printing the next step; `record-diagnostic` exiting 0 for both a valid and an invalid severity with only the valid one draining.
- **Handoff:** Required T-18B01, T-18B02, T-18C01.
- **Notes:** This is the first harness case in the suite whose subject is *ordering across two exit paths* rather than a value. Assert the index of each heading within stdout, not merely its presence — a presence-only assertion passes even if the digest lands after the next step, which is the single thing this contract exists to prevent. Asserting only the significant path is how the ordering would drift back, since the skip path is the one a reader is least likely to inspect.

### [T-18T03] Validation — C14 bump, full harness, meta parity

- **Spec:** l1-engine-diagnostics.md §3; l2-engine-diagnostics.md §6
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Four criteria, all required: `update-engine-meta` bumps 2.1.65 → 2.1.66 with checksums regenerated over the new file set; `node --test dev/tests/engine.js` fully green; `update-engine-meta --check` reports no drift; `check-prerequisites --verify-headers --workspace=engine` returns `"ok": true` with empty `warnings`.
- **Handoff:** Required every preceding task.
- **Notes:** C14 runs **once**, here, after every engine edit has landed — the tracks are file-independent but all write inside `.magic/`, so an early bump would be immediately stale. Run the real finalize at least once after the bump and read its own output: this phase changes what finalize prints, so its first post-implementation invocation is itself the end-to-end check, and a digest that fails to render there fails regardless of what the harness says.
