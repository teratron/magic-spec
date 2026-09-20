---
phase: 32
name: "Automatic Session Checkpoints (SC-6..SC-9)"
status: Todo
subsystem: ".magic (scripts, workflow bodies, templates), rules, docs, dev/tests"
requires:
  - "lib/scan-hygiene.js stripQuoted (SH-1/SH-5): tracking entries are read through the one shared strip (Phase 17)"
  - "lib/diagnostics.js record(): resume-state records its one non-fatal condition through the shared collector, DG-1 (Phase 18)"
  - "finalize.js isTaskExcluded(): the private tracking-entry block reader that T-32A01 extracts (Phase 23)"
  - "lib/phase-files.js listPhaseFiles(): the single recognizer of live phase workbooks (l2-engine-finalization.md §6.1)"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 32 Tasks — Automatic Session Checkpoints (SC-6..SC-9)

**Phase:** 32
**Status:** Todo
**Strategic Goal:** A session can be ended at any checkpoint and resumed from persisted state alone, with no new command. Implements [l1-session-continuity.md](../specifications/l1-session-continuity.md) v2.3.0 (SC-1.3, SC-6..SC-9) through [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) v1.0.0: a Task Start record, the `Attempts` dead-end field, one shared read-only `resume-state` script, the checkpoint claim in finalize output, the Context Budget Guard's fill-percentage tiers replaced by post-compaction re-grounding, and the removal of the dead `Last Session Ended` field and of every advertisement of the non-command `/magic.pause`.

## Atomic Checklist

- [ ] [T-32A01] Extract the tracking-entry block reader from `finalize.js` into `lib/`
- [ ] [T-32A02] `resume-state.js` core: workspace scope, in-flight detection, one-line output
- [ ] [T-32A03] `resume-state.js`: working-tree file count, `--json`, the one recorded finding
- [ ] [T-32A04] `finalize.js` checkpoint claim on both exit paths
- [ ] [T-32B01] `run.md`: Task Start step, `Attempts` events, phantom-hint removal
- [ ] [T-32B02] `context.md`: Resume Detection rewrite and Budget Guard replacement
- [ ] [T-32B03] `pause.md`, `status.md`, `handoff.json`: defer to the shared predicate
- [ ] [T-32B04] `task.md`: retire the tier table, preserve tracking fields on regeneration
- [ ] [T-32B05] Templates: drop `Last Session Ended`, document the optional `Attempts`
- [ ] [T-32B06] `analyze.md` Mode C: `PHANTOM_COMMAND` advisory check
- [ ] [T-32C01] `rules/magic.md` §10 Session Resume Check (hardlinked pair)
- [ ] [T-32D01] Documentation parity: phantom hints, tier note, resume, checkpoint sentence
- [ ] [T-32D02] Remove the stale `Last Session Ended` line from this workspace's `STATE.md`
- [ ] [T-32T01] Harness: `resume-state` and parser-safety cases (H1–H7)
- [ ] [T-32T02] Harness: template writer map and checkpoint claim (H8, H9)
- [ ] [T-32T03] Harness: shipped-text contracts (H10)
- [ ] [T-32T04] Cognitive suite: cold start, re-grounding, dead end, claim honesty (T213–T217)
- [ ] [T-32T05] Verification and C14 closure

## Detailed Tracking

### [T-32A01] Extract the tracking-entry block reader from `finalize.js` into `lib/`

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.2 (parser safety: one shared block reader, SH-5) and §7 row 1; [l2-finalize-state-accuracy.md](../specifications/l2-finalize-state-accuracy.md) §9 (the SC-2.1(c) readers must stay behavior-identical)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` → 124/124, count unchanged, with the SC-2.1(c) case ("finalize.js computeNextAction skips a task whose own Detailed Tracking marks it Blocked or Assignment: User") passing without an edit. The tracking-entry heading regex is defined in exactly one module: searching `.magic/scripts/` for it returns the new `lib/` file only, and `finalize.js` imports that module. Negative control: break the new module's block-end lookahead in a scratch copy and confirm the SC-2.1(c) case goes red, then restore.
- **Handoff:** Gates T-32A02 (imports the reader), T-32A04 (same file, `finalize.js`) and T-32T01.
- **Notes:** Behavior-preserving refactor with the widest blast radius of the phase: it sits under `computeNextAction()`, whose value every finalize persists into `STATE.md`. The source already records two traps — the `$` under the `m` flag collapsing a lookahead to empty (use `(?![\s\S])`), and the requirement that the reader receive SH-1-stripped content, stripped once by the caller. Keep `isTaskExcluded()` in `finalize.js` as a thin wrapper so its callers see no change. The new module exports a single-block getter and a `listTrackingEntries()` returning id, title, status, assignment and attempt count; the latter is what T-32A02 consumes. **Engine Improvement** (writes `.magic/scripts/`).

### [T-32A02] `resume-state.js` core: workspace scope, in-flight detection, one-line output

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.3 (Resume Detection, SC-9(b), (d)–(f)), §2 (layer placement, read-only, fail-open) and §4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In a scratch fixture (two-level layout, `Status: Active`, pointer `none`) with one tracking entry reading `**Status:** In Progress`, `node .magic/scripts/executor.js resume-state --workspace=engine` prints exactly one line beginning `▶ Resume [engine]:` that names the task ID and title. With no such entry, and a stray `HANDOFF.json` sitting in the workspace, it prints nothing. With `Status: Paused` alone it prints the `paused snapshot` variant. Four in-flight tasks name three plus `+1 more`. The exit code is 0 in every case (`echo $?`). The full assertions land in T-32T01.
- **Handoff:** Gates T-32A03 (same file), T-32B02, T-32B03, T-32C01 (each calls the script) and T-32T01.
- **Notes:** **`--workspace` trap:** `executor.js` derives `MAGIC_DESIGN_DIR` from the default workspace even when the flag is omitted — the same shape as the workspace-scoping defect recorded for `finalize.js` in the state-accuracy register (§11). With no `--workspace` the script must enumerate `workspace.json` itself and ignore the derived variable; with `--workspace` it reads that workspace only (C15). Bounds: three tasks per workspace, three workspaces, then `+{n} more`. The legacy flat layout (entries in `TASKS.md`) is read by the same three-tier lookup `synthesizeNextAction()` already uses. Every workbook is read through `stripQuoted` (SH-1). An absent `STATE.md` is a fresh workspace: skip it silently. The script is L1 (named by `context.md`, `status.md` and `rules/magic.md`), lives in `.magic/scripts/` and requires nothing from `dev/`. **Engine Improvement**.

### [T-32A03] `resume-state.js`: working-tree file count, `--json`, the one recorded finding

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.3 (file count, `--json`) and §2 (`RESUME_STATE_UNREADABLE`, DG-1)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In a `git init` fixture with three modified product files and one edited `.design/` workbook, the line reports `3 file(s) modified` — the `.design/` entry is excluded. Outside any repository the count is omitted and the exit code is 0. `--json` returns `{in_flight, workspaces:[{workspace, source, tasks:[{id, title, attempts}], changed_files, next_action}]}` with `source` one of `in-progress`, `paused`, `both`. A fixture whose `STATE.md` path is a directory produces a stderr note and exactly one `RESUME_STATE_UNREADABLE` record in `.design/.cache/diagnostics.jsonl`, and writes nothing else; a clean run leaves `.design/.cache/` byte-identical.
- **Handoff:** Depends on T-32A02 (same file). Gates T-32T01.
- **Notes:** Reuse `lib/git-utils.js` (read-only helpers, never a write-side git call). `git diff --name-only HEAD` fails in a repository with no commits: treat that as "not available" (null), never as an error. The count excludes `.design/` because the line already reports that bookkeeping. Severity `warning`, code `RESUME_STATE_UNREADABLE`: `/magic.status` calls this script, and the diagnostics spec already treats the sink as runtime state, not an artifact. **Engine Improvement**.

### [T-32A04] `finalize.js` checkpoint claim on both exit paths

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.5 (Checkpoint Claim, SC-6.1); [l2-engine-finalization.md](../specifications/l2-engine-finalization.md) §5.1 (carrier of the claim) and §8 (the terminal block is unaffected)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In a fixture whose whitelist hits, `finalize --workflow=task` prints the summary row `| STATE.md | updated (SC-2) — checkpoint saved |`. In a fixture with no whitelist hit it prints exactly one line, `[state] STATE.md updated — checkpoint saved.` Under `--dry-run` the words `checkpoint saved` never appear. With a directory at the `STATE.md` path the update fails, the claim is absent and `STATE_UPDATE_SKIPPED` is recorded. In every case `### Next step` is still last and the digest still precedes it: the existing DG-5/DG-6 ordering cases stay green.
- **Handoff:** Depends on T-32A01 (same file, `finalize.js`). Gates T-32T02 and T-32D01.
- **Notes:** Together with T-32A01 this is the phase's highest user-visible blast radius: every workflow's finalize output gains one row or one line. No harness case pins the existing `updated (SC-2)` row text (checked at plan time), so the extension breaks nothing. The claim keys on `stateResult.updated`, which `updateSessionState()` already returns on every branch: do not recompute it. On the skip path `main()` calls `emitSkip()`, then `updateSessionState()`, then `emitTail()`, so the skip-path line must be printed by the code that follows the state update, not from inside `emitSkip()`. **Engine Improvement**.

### [T-32B01] `run.md`: Task Start step, `Attempts` events, phantom-hint removal

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.1 (Task Start), §5.2 (`Attempts` events), §5.7 (phantom hint) and §7 row 3; SC-8 and SC-9(a) of [l1-session-continuity.md](../specifications/l1-session-continuity.md)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magic/run.md` reads, in order: Step 2 Select → **Task Start** (sets the selected entry's `Status` to `In Progress`; an entry already `In Progress` is being resumed and is left unchanged; reads its `Attempts` and `Handoff`) → Step 3. The three closed `Attempts` events are named at 3.4, 3.4b and 3.5, with the one-line shape, the five-entry cap, the `retry: {difference}` rule and the discard/revert event. Core Invariant 2.5's Paused line points at Resume Detection instead of stating a rule of its own. The Pause Propagation notice no longer contains `/magic.pause`: `grep -n "magic.pause" .magic/run.md` returns nothing, and `grep -c "Attempts" .magic/run.md` is at least 4. The text states that the checklist line stays `- [ ]` during flight.
- **Handoff:** File-independent of the other Track B tasks. Gates T-32D01, T-32T03 and T-32T04.
- **Notes:** No `[/]` checklist marker: no shipped workbook uses one, and both the `Next Action` computation and the archiver key on `- [ ]`, so an in-flight marker there would hide the very task a resuming session must find. C10 names `[/]` as an example, not a requirement, and SC-1.1 already makes the tracking entry's `Status` authoritative beside the checklist. In Parallel mode several entries can read `In Progress` at once; Task Start writes are edits to the shared workbook and fall under the existing Parallel Constraint. The step lands mid-phase, so every later task of this phase runs under it — the first live dogfooding. **Engine Improvement**.

### [T-32B02] `context.md`: Resume Detection rewrite and Budget Guard replacement

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.3 (the `context.md` call-site row), §5.6 (Budget Guard Rewrite) and §7 row 4; SC-7 and SC-9(b), (c)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** Resume Detection now runs `resume-state --workspace={ws}`, relays its line, loads `required_reading` only when `Status` is `Paused` and the pointer is set, keeps the Memory Fence, consumes a snapshot at load (`update-state --status=Active --handoff=none` after `required_reading` is read, before the recorded `Next Action` runs) and treats a missing or failing script as silence. In the Budget Guard, `grep -n "PEAK\|NORMAL\|DEGRADED\|POOR\|\[Budget\]\|magic.pause" .magic/context.md` returns nothing; the `Context Budget Guard` heading, the `Read Hygiene` subsection (Stale tool output, Evidence Capsule, Cache-Prefix Invariant) and the Post-Resolution cross-reference to `Read Hygiene → Cache-Prefix Invariant` all still resolve; a **Post-Compaction Re-grounding** subsection exists.
- **Handoff:** Depends on T-32A02 (the script it calls must exist). Gates T-32B03 (wording anchor), T-32C01, T-32D01 and T-32T03.
- **Notes:** `run.md`, `pause.md` and `spec.md` cite `context.md §Read Hygiene` and `§Context Budget Guard → Read Hygiene → Cache-Prefix Invariant` by name, so those headings must survive the rewrite. A usage figure may be quoted only when the host supplied it. **Engine Improvement**.

### [T-32B03] `pause.md`, `status.md`, `handoff.json`: defer to the shared predicate

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.3 (the `pause.md` and `status.md` rows), §5.7 and §7 row 5; [l2-status-command.md](../specifications/l2-status-command.md) v1.2.0 §5.3 and §2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In `pause.md` the Trigger line names an explicit user statement that the session is ending or being cleared (no POOR tier, no slash command), and Resume Protocol states no detection rule of its own and defers to `context.md` §4. In `status.md` the Paused bullet becomes the in-flight/paused branch calling `resume-state`; Core Invariant 1 states that a script the briefing calls may record a non-fatal finding to the runtime diagnostics sink, which is not an artifact write; the checklist line matches. `handoff.json`'s `description` no longer names a command and still parses: `node -e "JSON.parse(require('fs').readFileSync('.magic/templates/handoff.json','utf8'))"` exits 0. `grep -n "magic.pause" .magic/pause.md .magic/status.md .magic/templates/handoff.json` returns nothing.
- **Handoff:** Depends on T-32A02 and T-32B02. Gates T-32D01 and T-32T03.
- **Notes:** The pause snapshot itself (Iterative Merge, schema 1.1, `Status: Paused`) is unchanged and remains a valid optional path; its retirement is deferred in the L1's §5 and is recorded in the Backlog as Parked. Do not touch its content. **Engine Improvement**.

### [T-32B04] `task.md`: retire the tier table, preserve tracking fields on regeneration

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.6 (tier mentions in `task.md`), §5.2 (Preservation) and §7 row 6
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magic/task.md`'s Context Quality Guidance section no longer carries a percentage table or a `/magic.pause` instruction: `grep -n "PEAK\|GOOD\|DEGRAD\|POOR\|magic.pause" .magic/task.md` returns nothing, and no `N–N%` range remains. It states read economy in observable terms (read `STATE.md` `Next Action` and phase `provides` before broad scans; cite line ranges instead of full bodies once a context begins with a summary). Plan Write-back gains the preservation clause: when a phase workbook is regenerated or updated, every surviving task ID keeps its tracking entry's `Status`, `Changes` and `Attempts` verbatim, and only new tasks receive template entries.
- **Handoff:** File-independent of the other Track B tasks. Gates T-32D01 and T-32T03.
- **Notes:** **Planning-surfaced scope.** The spec's §5.6 and §7 row 6 name only the `DEGRADING/POOR` *note*, but `task.md` carries its own four-row percentage table (0–30 / 30–50 / 50–70 / 70%+) whose thresholds differ from `context.md`'s (0–40 / 40–60 / 60–75 / 75%+): a second, drifted copy of the very construct SC-7 retires. Both go; the spec's wording should be corrected on the next `/magic.spec` pass (one line). The preservation clause is the "verify, and amend if it rewrites" item of §7 row 6: the update path in `task.md` says nothing about carrying tracking fields over, so the amendment is required, not conditional. **Engine Improvement**.

### [T-32B05] Templates: drop `Last Session Ended`, document the optional `Attempts`

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.7 (template cleanup), §5.2 (documented without a live line) and §7 row 7; SC-1.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -c "Last Session Ended" .magic/templates/state.md` prints 0, and the template's remaining `**Label:**` lines are exactly the keys of `update-state.js`'s field map (`workspace`, `updated`, `phase`, `status`, `task`, `spec`, `nextAction`, `handoff`, `bootstrap`). `.magic/templates/phase.md` documents the optional `Attempts` (created by `/magic.run` on the first dead end) and contains no line beginning `- **Attempts:**`: the documentation form is a single HTML comment under `## Detailed Tracking`, so generated entries carry no empty field.
- **Handoff:** File-independent. Gates T-32D02 (the live file follows the template) and T-32T02 (H8).
- **Notes:** An existing `STATE.md` keeps its stale line until its next structural rewrite; nothing reads it. The comment must not sit inside the sample entry, or it would be copied into every generated entry. Confirm that the phase-file readers ignore the comment; H7 pins the field itself. **Engine Improvement**.

### [T-32B06] `analyze.md` Mode C: `PHANTOM_COMMAND` advisory check

- **Spec:** [l2-workflow-wrappers.md](../specifications/l2-workflow-wrappers.md) v1.3.0 §6 item 3 and §6.1; [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §7 row 9
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md` Mode C's Design Registry Audit carries a `PHANTOM_COMMAND` bullet next to `WRAPPER_BODY_DRIFT`: scan `.magic/`, `docs/`, `workflows/`, `rules/` and `README.md` for own-word `/magic.{cmd}` tokens (preceded by whitespace, a backtick or an opening quote, so `rules/magic.md` is never read as a command), assert that each resolves to `workflows/magic.{cmd}.md`, exempt `magic.dev.*`, and report `PHANTOM_COMMAND {file}:{line} → /magic.{cmd} has no wrapper` as advisory. `grep -c "PHANTOM_COMMAND" .magic/analyze.md` finds the bullet and its governing cross-reference. Applied by hand to the post-phase tree the scan finds nothing.
- **Handoff:** File-independent. The zero-hit result on the finished tree is asserted by T-32T03.
- **Notes:** A cognitive check with no script and no harness case of its own, the same shape as the `WRAPPER_BODY_DRIFT` deployment; the shipped-text scan in T-32T03 is its deterministic twin. A workflow body is touched, so C14 is tagged `magic.analyze`. **Engine Improvement**.

### [T-32C01] `rules/magic.md` §10 Session Resume Check (hardlinked pair)

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.4 (Session-Start Rule, SC-9(c)) and §7 row 10; SC-9(c), (d)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `rules/magic.md` gains `## 10. Session Resume Check`, shaped like §1: the trigger is the agent's first tool call while it holds no `STATE.md` for the workspace in its current context (new session, cleared, compaction), once per cold context, with a `/magic.*` invocation not repeating it; the action is `resume-state` without `--workspace`, a printed line relayed verbatim as one informational line, the user's request carried on, silence otherwise, a missing or failing script counting as silence; the exemption is `MAGIC_RESUME_CHECK=0`. §8's Completion Protocol counts §1–§10 and gains the matching checklist item. **[C-001]:** after the edit run `node dev/scripts/validate-hardlinks.js` (the pair must be reported intact), or recreate the link and rerun it; `fsutil hardlink list rules/magic.md` lists both paths.
- **Handoff:** Depends on T-32A02 and T-32B02. Gates T-32D01, T-32T03 and T-32T04.
- **Notes:** **[C-001] fires on every edit of this file**: both `Write` and `Edit` replace the inode and the write always reports success. `rules/` is outside C14 tracking, so this task bumps nothing. The rule ships to every consumer session, so it must stay silent when nothing is in flight (SC-9(d)) and must fail open. **Engine Improvement**.

### [T-32D01] Documentation parity: phantom hints, tier note, resume, checkpoint sentence

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.5 (the docs sentence), §5.6, §5.7 and §7 row 11; [l1-documentation-system.md](../specifications/l1-documentation-system.md) (documentation parity)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -rn "magic.pause" docs README.md` returns nothing (sites: `docs/run.md`'s Pause Propagation paragraph, `docs/task.md`'s tier table row, and wording near `docs/README.md`'s Pause row). `docs/task.md`'s percentage table is replaced by read-economy guidance matching `.magic/task.md`. `docs/status.md`'s paused bullet states the in-flight/paused rule, including that a stray handoff file is not a paused session. `docs/README.md` gains one sentence saying that once a workflow reports `checkpoint saved`, ending the session loses nothing, and one line each on the Task Start marker and `Attempts` in the run section. Re-running `node dev/scripts/sync-docs.js` leaves `git diff --stat docs/` unchanged. No task IDs, phase designators, spec file names or `.design/` paths appear in any edited doc (reference containment).
- **Handoff:** Depends on T-32A04 and T-32B01 through T-32B04. Gates T-32T03.
- **Notes:** `dev/scripts/sync-docs.js` refreshes only the anchored Triggers, Slash command and Sync Note lines from `workflows/`, so the affected sections are hand-authored: edit them directly. `docs/` is user-facing documentation and therefore a product file for containment purposes, even though the engine ships it. It is not an engine directory (no C14).

### [T-32D02] Remove the stale `Last Session Ended` line from this workspace's `STATE.md`

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.7 (last sentence of the first bullet) and §7 row 13; SC-1.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -c "Last Session Ended" .design/engine/STATE.md` prints 0. `node .magic/scripts/executor.js update-state --workspace=engine --auto-progress` exits 0, and the file still has its `## Session Continuity` section with the `Handoff File` and `Bootstrap Mode` lines intact.
- **Handoff:** Depends on T-32B05 (the template and the live file must agree).
- **Notes:** `STATE.md` is otherwise written by `update-state`, which has no removal operation, so this is a one-line hand edit. Do it last among the Track D edits so no `update-state` call races it. This repository's own file only; consumer files are untouched by design.

### [T-32T01] Harness: `resume-state` and parser-safety cases (H1–H7)

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §6 (H1–H7)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="resume-state" dev/tests/engine.js` passes every new case, and the full `node --test dev/tests/engine.js` stays green at 124 plus the new cases. Negative controls, each confirmed red before green: (1) restore the shipped presence trigger in a scratch copy of the predicate → H1 (stale `HANDOFF.json`, pointer `none`) fails; (2) drop the SH-1 strip → H7 (an attempt quoting `**Status:** Blocked`) fails; (3) count `.design/` files → H2's file count fails.
- **Handoff:** Depends on T-32A01 through T-32A03. Gates T-32T02 (same file, `dev/tests/engine.js`).
- **Notes:** Fixtures are temp dirs outside the repository (`os.tmpdir()`), which also supplies the not-a-repository case (H5); the repository cases need a `git init` plus one commit inside the temp dir. The LF and CRLF variants of one fixture must produce identical output — the CRLF class of defect has recurred in this file's history. Every case runs the real script through `executor.js`, never a re-implementation.

### [T-32T02] Harness: template writer map and checkpoint claim (H8, H9)

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §6 (H8, H9); [l2-test-suite.md](../specifications/l2-test-suite.md) v1.18.0 (the coverage mandate)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="checkpoint|SC-1.3" dev/tests/engine.js` passes. H8 asserts that every `**Label:**` in `.magic/templates/state.md` maps to a key of `update-state`'s field map and that `Last Session Ended` is absent (negative control: re-add the line to a scratch copy → red). H9 asserts `checkpoint saved` on both finalize exit paths after a successful update and its absence under `--dry-run` and with a directory at the `STATE.md` path (negative control: emit the claim unconditionally → red).
- **Handoff:** Depends on T-32A04, T-32B05 and T-32T01 (same file).
- **Notes:** `FIELD_MAP` in `update-state.js` is module-private: the case may derive the map from behavior (patch each label and observe) or the implementer may export the table; record the choice in `Changes`. Do not pin the row text of any other finalize field.

### [T-32T03] Harness: shipped-text contracts (H10)

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §6 (H10 a–d)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="shipped text|phantom" dev/tests/engine.js` passes. (a) No shipped text (`.magic/`, `docs/`, `workflows/`, `rules/`, `README.md`) names `/magic.pause` as a command, under the own-word rule `PHANTOM_COMMAND` uses. (b) No engine body under `.magic/*.md` carries a percentage tier table or an `at {n}%` narration (ranges such as `0–40%`, open ends such as `75%+`) — widened from `context.md` alone to every engine body. (c) `run.md` contains the Task Start step and all three `Attempts` events. (d) `rules/magic.md` contains §10 and `MAGIC_RESUME_CHECK=0`. Each assertion is negative-controlled by reinstating one offending line in a scratch copy.
- **Handoff:** Depends on T-32B01 through T-32B04, T-32B06, T-32C01, T-32D01 and T-32T02 (same file).
- **Notes:** Shipped-text contract coverage is this workspace's established pattern for behavior that is prose (RC-2.1 notation independence, the executor-parsable `--workspace` forms). H10(b)'s widened scope is a planning-time extension of the spec's list: a narrower assertion would have passed while `task.md` still shipped a tier table.

### [T-32T04] Cognitive suite: cold start, re-grounding, dead end, claim honesty (T213–T217)

- **Spec:** [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §6 (C1–C5); [l2-test-suite.md](../specifications/l2-test-suite.md) v1.18.0 (cognitive coverage)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/suite.md` gains T213–T217 in the existing shape (`Synthetic State`, `Action`, `Expected`, `Guards tested`): a cold start whose first message is unrelated; a cold start with "continue"; a context that begins with a summary; a Step 3.5 failure that records one `Attempts` line and honors the five-entry cap; a finalize with an unwritable `STATE.md`. The header test count and suite version are updated (211 → 216) and no existing test is renumbered: `grep -c "^### T[0-9]" dev/tests/suite.md` prints 216.
- **Handoff:** Depends on T-32B01 through T-32B03 and T-32C01 (the behavior it asserts). File-independent of T-32T01 through T-32T03.
- **Notes:** Cognitive-only by design — a cold-start behavior has no deterministic output for a script to pin, the same rationale as the Idea Intake Gate's T209–T212. The recorded counts in `l2-test-suite.md` (harness 124, cognitive 211) go stale when these land; that is a `/magic.spec` reality-sync item, not a blocker.

### [T-32T05] Verification and C14 closure

- **Spec:** l2-test-suite.md; C14
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.run magic.task magic.status magic.analyze` → engine `2.1.102 → 2.1.103`, files checksummed, dev-repo `.design/INDEX.md` Engine Version snapshot synced (Phase 24 exemption). `node --test dev/tests/engine.js` (post-C14) → all green. `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`, no `ENGINE_INTEGRITY`. `node dev/scripts/validate-hardlinks.js` → intact. `node .magic/scripts/executor.js check-bloat` → no new finding (the parked `l2-engine-diagnostics.md` watch unchanged). Live dogfood: in a fixture, a task set `In Progress` produces the resume line through `executor.js`; the real workspace is silent at phase close.
- **Handoff:** Depends on every other task of the phase. Phase close.
- **Notes:** C14 runs once, here, after every engine edit — the one-bump-per-phase convention. It is tagged `magic.run magic.task magic.status magic.analyze` because those four workflow bodies changed; no `workflows/` wrapper was edited, so no skill regeneration is expected (confirm that `git status` shows no `skills/` change). `.magic/` edits leave `.checksums` stale until this task, so the pre-commit hook's `--check` would fail a commit made mid-phase: commit after the bump. Follow-ups for the next `/magic.spec` pass, none blocking: correct §5.6 and §7 row 6 of the checkpoint spec to name `task.md`'s table, and sync `l2-test-suite.md`'s recorded counts.

## Validation Coverage

Track A: T-32A01 is a behavior-preserving extraction, covered by the existing SC-2.1(c) case with no new case; T-32A02 and T-32A03 by H1–H7 (T-32T01); T-32A04 by H9 (T-32T02). Track B: T-32B05 by H8; T-32B01 through T-32B04 and T-32B06 by the shipped-text contracts of H10 (T-32T03); T-32B06 additionally by hand application of the scan to the finished tree. Track C: H10(d) and the cognitive cases T213–T217. Track D: H10(a) and the `sync-docs.js` idempotency check in T-32D01. Harness 124 → at least 138 (H1–H10 as roughly fourteen cases); cognitive suite 211 → 216; engine 2.1.102 → 2.1.103.
