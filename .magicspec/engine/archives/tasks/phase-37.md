---
phase: 37
name: "Backlog Deployment — Status Reconciliation, Pause-Snapshot Retirement, Spec-Side Whitelist, Mutation Driver"
status: Done
subsystem: ".magic (finalize, update-state, resume-state, workflow bodies, templates), rules, docs, dev/scripts, dev/tests"
requires:
  - "computeNextAction() and its per-task screen (Phases 10, 15, 23): the ledger reads status reconciliation reuses"
  - "resume-state.js and the Task Start record (Phase 32): the resume predicate that loses its paused branch"
  - "lib/significance.js (Phases 19, 33): the whitelist the spec workflow extends"
  - "The negative-control procedure run by hand in Phases 33, 35 and 36: the behavior the driver automates"
provides:
  - "One plan-state classifier (classifyPlanState) under finalize: Next Action and Status now derive from one ledger read; Status reconciles Active <-> Blocked at every checkpoint, never overwrites a hand-set value, resets a stale Blocked on a complete plan; template vocabulary Active | Blocked"
  - "The pause snapshot retired end to end: workflow bodies, resume-state paused branch, update-state --handoff and the Handoff File field, pause.md and templates/handoff.json deleted, docs and harness follow; a repository-wide search finds no residue in shipped text"
  - "RULES.md counted in the magic.spec significance whitelist (and rules/magic.md section 3); a rules-only spec finalize is worded as a rules change, not a registry change"
  - "dev/scripts/mutation-check.js: the negative-control procedure as a driver with a self-test and a real use (the six Phase 35 mutations, all caught)"
  - "engine 2.1.113 -> 2.1.114; harness 143 -> 146"
key_files:
  created:
    - "dev/scripts/mutation-check.js"
  modified:
    - ".magic/scripts/finalize.js"
    - ".magic/scripts/resume-state.js"
    - ".magic/scripts/update-state.js"
    - ".magic/scripts/lib/significance.js"
    - ".magic/scripts/lib/commit-suggester.js"
    - ".magic/templates/state.md"
    - ".magic/context.md"
    - ".magic/run.md"
    - ".magic/status.md"
    - ".magic/analyze.md"
    - "rules/magic.md"
    - "docs/README.md"
    - "docs/run.md"
    - "docs/status.md"
    - "dev/tests/engine.js"
    - "dev/tests/suite.md"
  deleted:
    - ".magic/pause.md"
    - ".magic/templates/handoff.json"
patterns_established:
  - "Two fields that must agree are derived from one read of the source, and the derivation is a pure function of a classification, so it can be tested without the ledger."
  - "A mechanism retired on evidence is removed end to end and proven by a repository-wide search; the harness cases that pinned it are rewritten to pin its absence, not deleted."
  - "A negative control is a data list run by a driver, not a throwaway script; the driver is itself controlled by mutating it."
duration_minutes: ~
---

# Stage 37 Tasks — Backlog Deployment

**Phase:** 37
**Status:** Done
**Strategic Goal:** Deploy the four decisions the last `/magic.spec` pass took on evidence: reconcile `Status` between `Active` and `Blocked` at every checkpoint ([l1-session-continuity.md](../specifications/l1-session-continuity.md) SC-1.4, [l2-finalize-state-accuracy.md](../specifications/l2-finalize-state-accuracy.md) §16); retire the pause snapshot (SC-9(g), [l2-session-checkpoint.md](../specifications/l2-session-checkpoint.md) §5.8); count `RULES.md` in the spec workflow's significance whitelist ([l2-engine-finalization.md](../specifications/l2-engine-finalization.md) §10); and turn the by-hand negative-control procedure into `dev/scripts/mutation-check.js` ([l2-test-suite.md](../specifications/l2-test-suite.md) Mutation-Control Driver).

## Atomic Checklist

- [x] [T-37A01] `finalize.js`: one plan-state classifier under `Next Action`, behavior-preserving
- [x] [T-37A02] `finalize.js` and `templates/state.md`: reconcile `Status`; vocabulary `Active | Blocked`
- [x] [T-37A03] Validation: harness cases for reconciliation, with mutation controls
- [x] [T-37B01] Workflow bodies: `context.md`, `run.md`, `status.md`, `analyze.md` stop describing a paused snapshot
- [x] [T-37B02] `resume-state.js`: drop the paused branch
- [x] [T-37B03] `update-state.js` and `templates/state.md`: drop `--handoff` and the `Handoff File` field
- [x] [T-37B04] Delete `pause.md` and `templates/handoff.json`
- [x] [T-37B05] Docs: `README`, `run`, `status` pages follow
- [x] [T-37B06] Harness: retire the cases that pinned the snapshot, add the ones that pin its absence
- [x] [T-37B07] Verification: a repository-wide search for the removed names
- [x] [T-37C01] `significance.js` and `rules/magic.md`: `RULES.md` in the spec whitelist
- [x] [T-37C02] Validation: a harness case for spec-side rule capture, with its control
- [x] [T-37D01] `dev/scripts/mutation-check.js`: the driver
- [x] [T-37D02] Validation: the driver's self-test, and one real use
- [x] [T-37T01] Validation: harness, scans, hardlinks; single C14 bump

## Detailed Tracking

### [T-37A01] `finalize.js`: one plan-state classifier under `Next Action`, behavior-preserving

- **Spec:** l2-finalize-state-accuracy.md §16.2 (one read, two derivations); l1-session-continuity.md SC-1.4, SC-2.2
- **Status:** Done
- **Changes:** `finalize.js`: the ledger walk moved into `classifyPlanState(wsDir)` (kinds inline-open, blocked-phase, actionable, all-excluded, registry-open, complete, unreadable; never throws) and `synthesizeNextAction()` now only maps a kind to its existing string; exported for the harness. Evidence: `node --test dev/tests/engine.js` 143/143 before and after; old-vs-new `computeNextAction` over both real workspaces x four workflows identical (0 diffs).
- **Assignment:** Agent
- **Verify:** `synthesizeNextAction()`'s ledger walk (inline checkboxes → phase files with the Blocked-phase and per-task screens → registry row → complete) moves into one function that returns a classification — `{ kind: 'inline-open' | 'blocked-phase' | 'actionable' | 'all-excluded' | 'registry-open' | 'complete' | 'unreadable', … }` carrying what the strings need (task ID and title, phase number, first excluded task) — and `synthesizeNextAction()` only maps a classification to its existing string. Every string it produces is byte-identical to before: `node --test dev/tests/engine.js` passes with the same count, and the existing `computeNextAction` cases (plan-state-aware, reserved-command, all-excluded, title-preserving, unreadable-state) are untouched and green. The classifier does no I/O beyond what the walk already did and never throws (a read failure is the `unreadable` kind, which maps to the existing funnel string).
- **Handoff:** T-37A02 derives the status from the same classification.
- **Notes:** This is the "one read" the spec asks for: `Next Action` and `Status` must come from one ledger read so they cannot disagree. Behavior-preserving refactor of the function whose value every finalize persists — the harness is the guard; if any existing `Next Action` assertion changes, revert and record it in `Attempts`. The `spec` and `rule` early returns stay ahead of the walk, but the classifier is also callable for them (status reconciliation runs for every workflow).

### [T-37A02] `finalize.js` and `templates/state.md`: reconcile `Status`; vocabulary `Active | Blocked`

- **Spec:** l2-finalize-state-accuracy.md §16.2; l1-session-continuity.md SC-1.4, SC-1.1
- **Status:** Done
- **Changes:** `finalize.js`: `updateSessionState()` classifies the ledger once and feeds both fields — new `readTopStatus()` (through the shared quote-strip) and pure `reconcileStatus(plan, current)`: `Active`→`Blocked` on blocked-phase/all-excluded; stale `Blocked`→`Active` on actionable/inline-open/complete; nothing for registry-open, unreadable, a hand-set `Paused` or a missing field; the value rides the same single `updateState()` call as `nextAction`; the dry-run line names it. `computeNextAction`/`synthesizeNextAction` accept the pre-read classification (optional). `templates/state.md` Status vocabulary is now `{Active | Blocked}`. Evidence: decision table probed over 13 (kind, current) pairs as specified; harness 143/143.
- **Assignment:** Agent
- **Verify:** In `updateSessionState()`, after the classification and before the single `updateState()` call, a small pure function decides the status: `blocked` when the kind is `blocked-phase` or `all-excluded`; `actionable` when it is `actionable` or `inline-open`; with the current `Status` read from `STATE.md` it returns `Blocked` for (`blocked`, current `Active`), `Active` for (`actionable`, current `Blocked`), `Active` for (`complete`, current `Blocked`), and no change in every other case — in particular `registry-open` and `unreadable` change nothing, a plan-complete `Active` stays, and any current value outside `Active | Blocked` (a hand-set `Paused`) is never overwritten. When it returns a value it is passed as `status` in the same `updateState()` call that writes `nextAction`; no second write. `.magic/templates/state.md` line `**Status:** {Active | Paused | Blocked | Complete}` becomes `{Active | Blocked}`. `node --test dev/tests/engine.js` stays green; a direct run of the function over the six cases of T-37A03 returns the expected values.
- **Handoff:** T-37A03 pins it; T-37B03 edits the same template afterwards.
- **Notes:** The per-task `update-state` call in `run.md` is deliberately untouched (l2-finalize-state-accuracy.md §4): reconciliation belongs to the checkpoint, and that spec's own case (f) pins the per-task call as still leaving `Status` alone. Read the current value with the same field reader `update-state.js` uses if one is exported; otherwise a one-line anchored match on `^\*\*Status:\*\* (.+)$` at column 0 (SH-1: through the shared strip).

### [T-37A03] Validation: harness cases for reconciliation, with mutation controls

- **Goal:** Pin every branch of the reconciliation, in both directions, against the real scripts.
- **Method:** In `dev/tests/engine.js`, next to the `computeNextAction` cases, fixtures that carry `STATE.md`, `TASKS.md` and a phase workbook: (a) `Blocked` + non-Blocked phase with an open agent-actionable task → `Active` after a `finalize --workflow=run`; (b) `Active` + Blocked phase file with an open task → `Blocked`; (c) `Blocked` + every open item `Status: Blocked` or `Assignment: User` → stays `Blocked`; (d) plan complete: `Active` stays, a stale `Blocked` becomes `Active`; (e) a hand-set `Paused` unchanged in each of the ledger states above; (f) a per-task `update-state --task=… --next-action=…` with no `--status` leaves `Status` unchanged. Mutation-check each (revert the decision, expect red, restore by hash) — by hand until T-37D01 exists.
- **Status:** Done
- **Changes:** New harness case "finalize.js reconciles Status between Active and Blocked at the checkpoint, and only there (SC-1.4)" in `dev/tests/engine.js`: six ledger shapes (open agent task; Blocked phase; every open item Blocked; every open item User-assigned; plan complete; registry row not Done with no workbook) x start values Active/Blocked/Paused = 18 assertions on the real `updateSessionState`, plus Status/Next Action agreement, dry-run reports and writes nothing, and (f) a per-task `updateState` leaves a stale Blocked. Evidence: harness 143 -> 144, all green; 7 by-hand mutation controls (blocked write removed, stale reset removed, complete not workable, Paused overwritten, registry-open reconciled, status never passed, all-excluded not blocked) all CAUGHT, `finalize.js` restored by hash.
- **Notes:** Run after T-37A02. Record the case count before and after in `Changes`. The audit fixtures used to reproduce the defect (a real finalize run in a scratch project) are the template for (a) and (b).

### [T-37B01] Workflow bodies: `context.md`, `run.md`, `status.md`, `analyze.md` stop describing a paused snapshot

- **Spec:** l2-session-checkpoint.md §5.8, §5.3; l2-status-command.md §5.3; l1-session-continuity.md SC-9(b), SC-9(g)
- **Status:** Done
- **Changes:** `context.md` Resume Detection keeps the `resume-state` call and Memory Fence (now on STATE content, `Next Action`, `Blocking Constraints`) and loses the snapshot `required_reading` bullet, the consumption step and the Paused clause; Evidence Capsule line no longer lists `HANDOFF.json`. `run.md` Invariant 2.5 keys on `In Progress` only. `status.md` degraded-state bullet reads "In-flight session" (checklist line too). `analyze.md` no longer names `pause.md` in the two wrapper-parity lines (phantom-command example now `context.md`). Evidence: verify grep prints nothing; added-line citation grep prints nothing.
- **Assignment:** Agent
- **Verify:** `context.md` §4 Resume Detection keeps the `resume-state` call and the Memory Fence and loses the bullet that loads a snapshot's `required_reading`, the consumption step (`update-state --status=Active --handoff=none`) and the `**Status:** Paused` clause of the "prints nothing when…" bullet; its Evidence Capsule line no longer lists `HANDOFF.json`. `run.md` Invariant 2.5 drops "or `**Status:** Paused`". `status.md` degraded-state bullet reads "In-flight session" and names only a task recorded `In Progress`. `analyze.md` lines that list `pause.md` among internal bodies without a wrapper no longer name it. Check: `grep -nE "pause\.md|HANDOFF|Handoff File|Status:\*\* Paused" .magic/context.md .magic/run.md .magic/status.md .magic/analyze.md` prints nothing. `git diff -U0 -- <the four> | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+"` prints nothing.
- **Handoff:** T-37B04 deletes the module these stop pointing at.
- **Notes:** The prose must not lose the *in-flight* half: Resume Detection stays, keyed on `In Progress` alone — only the snapshot branch goes.

### [T-37B02] `resume-state.js`: drop the paused branch

- **Spec:** l2-session-checkpoint.md §5.3 (pseudo-code, variants, `--json` `source`), §5.8; l1-session-continuity.md SC-9(b)
- **Status:** Done
- **Changes:** `resume-state.js`: no longer reads `Status`; `paused` removed from the summary; `source` always `in-progress`; the paused suffix and body removed from `formatLine`; header comment states the tracking-entry rule only. Diagnostic for an unreadable STATE.md, exit-0 contract and `nextAction` read unchanged. Evidence: `grep -nE "paused|Paused|snapshot|handoff"` on the file prints nothing; live run prints the in-flight line; harness 142/144 — only the two cases T-37B06 rewrites are red (H1 stale-handoff silence, H3/H4 paused-marking).
- **Assignment:** Agent
- **Verify:** `resume-state.js` no longer reads `Status: Paused`: `paused` is gone from the summary object, the `source` is always `in-progress`, the `(paused snapshot)` suffix and the `paused snapshot` body are gone, and a workspace with nothing `In Progress` is silent whatever `STATE.md` says. The header comment states the rule as *a task's tracking entry reads `Status: In Progress`* only, with no mention of a handoff file. The script still never exits non-zero and still records its one diagnostic for an unreadable `STATE.md`. `grep -nE "paused|Paused|snapshot|handoff" .magic/scripts/resume-state.js` prints nothing except a comment, if any, that a hand-set `Paused` is inert. `node --test dev/tests/engine.js` fails only in the cases T-37B06 rewrites, and nowhere else.
- **Handoff:** T-37B06 rewrites the cases this makes red.
- **Notes:** Expect the paused control case and the H-cases that assert `source: "paused"` to go red — that is the point; do not weaken them here, T-37B06 replaces them with cases that pin the new behavior.

### [T-37B03] `update-state.js` and `templates/state.md`: drop `--handoff` and the `Handoff File` field

- **Spec:** l2-session-checkpoint.md §5.8; l1-session-continuity.md SC-1.3 (no dead fields), SC-9(g)
- **Status:** Done
- **Changes:** `update-state.js`: `handoff` removed from FIELD_MAP, from the Session Continuity container, from the flag table, usage string and argument parsing (comment at the field-adding site updated); `--handoff=x` now goes down the ordinary unknown-argument path (`Unknown argument: --handoff=x`, ignored, same as any other). `templates/state.md` drops the `Handoff File` line (Bootstrap Mode stays). Evidence: grep for handoff in both files prints nothing; probe on a STATE.md carrying `**Handoff File:** none` — the line survives an update byte-for-byte, only Updated and Next Action changed.
- **Assignment:** Agent
- **Verify:** `update-state.js` no longer defines the `handoff` entry of its field map, no longer lists `--handoff` in its flag table or usage string, and no longer parses it; passing `--handoff=x` is refused exactly as any other unknown flag is (same message, same exit). An existing `STATE.md` that still carries a `**Handoff File:**` line is left byte-for-byte untouched by every update (it is neither patched nor removed). `.magic/templates/state.md` drops the `**Handoff File:**` line; `**Bootstrap Mode:**` stays. The comment at the flag-acceptance site that lists `--handoff` is updated. `grep -nE "handoff|Handoff" .magic/scripts/update-state.js .magic/templates/state.md` prints nothing.
- **Handoff:** T-37B06.
- **Notes:** Same file as T-37A02's template edit — this task runs after it. Removing a flag is a public-surface change for anything that shells out to `update-state`; the audit found no project that ever used the snapshot, so the flag has no caller, and the refusal is the same as for any typo, which is the intended signal.

### [T-37B04] Delete `pause.md` and `templates/handoff.json`

- **Spec:** l2-session-checkpoint.md §5.8
- **Status:** Done
- **Changes:** Deleted `.magic/pause.md` and `.magic/templates/handoff.json` (git status: two deletions, restore is `git checkout`). Nothing under `.magic/`, `workflows/`, `skills/`, `rules/`, `.agents/` linked to either after B01–B03 (the only remaining names are in `docs/` — T-37B05 — and the manifest, regenerated by the closing C14). `check-prerequisites` reports no PHANTOM_COMMAND or broken-link finding; its only warning is the expected integrity drift from this phase’s uncommitted engine edits, resolved by T-37T01.
- **Assignment:** Agent
- **Verify:** `.magic/pause.md` and `.magic/templates/handoff.json` do not exist; no file under `.magic/`, `workflows/`, `skills/` or `rules/` links to either (`node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` reports no broken-link or `PHANTOM_COMMAND` finding, and a Link Integrity read of those directories finds no target named `pause.md`). Neither file is in `.magic/.checksums` after the closing C14. `git status` shows two deletions and nothing else this task.
- **Handoff:** T-37B05 and T-37B07.
- **Notes:** Runs after T-37B01–T-37B03 so nothing points at the files when they go. Restore is `git checkout` — the deletion is reversible. `pause.md` is an internal module with no wrapper, so no `workflows/` or `skills/` file changes.

### [T-37B05] Docs: `README`, `run`, `status` pages follow

- **Spec:** l1-documentation-system.md (docs stay in step with their workflow)
- **Status:** Done
- **Changes:** `docs/README.md`: Pause module row removed; Agent Memory line loses the handoff sentence. `docs/run.md`: work-in-flight line names `In Progress` only (the Pause Propagation guard row and paragraph — a Blocked status write — kept). `docs/status.md`: in-flight row reworded, Pause relationship row removed. Sync Note lines untouched. Evidence: `grep -nE "pause\.md|HANDOFF|paused session|paused status" docs/*.md README.md` prints nothing; the wider repo grep prints nothing outside the manifest.
- **Assignment:** Agent
- **Verify:** `docs/README.md` no longer lists the Pause module row and its Agent Memory line no longer describes a handoff; `docs/run.md` line describing a paused session is reworded to in-flight work only (the Pause Propagation guard — a phase-blocked status — stays: it is a different mechanism); `docs/status.md`'s in-flight row and its "Pause (`pause.md`)" relationship row are removed or reworded. `grep -nE "pause\.md|HANDOFF|paused session|paused status" docs/*.md README.md` prints nothing; every relative link in the touched pages resolves; the pages' `Sync Note` lines are not edited.
- **Handoff:** T-37B07.
- **Notes:** "Pause Propagation" in `run.md` is the Blocked-status write and survives; only the snapshot vocabulary goes. Keep that distinction in the docs edit.

### [T-37B06] Harness: retire the cases that pinned the snapshot, add the ones that pin its absence

- **Goal:** Leave the suite asserting the new contract, not silently missing coverage.
- **Method:** In `dev/tests/engine.js`: remove the case `--handoff on a file without Session Continuity creates the section and the field…`; rewrite the resume-state cases that asserted `source: "paused"`, the `(paused snapshot)` suffix or the paused control so that H4 now reads (a) `Status: Paused` alone → silent, (b) a stale `HANDOFF.json` with pointer `none` and nothing in flight → silent (its existing negative control stays), (c) `Active` with a task `In Progress` → the in-progress line unchanged; add (d) `update-state --handoff=x` is refused like an unknown flag, and (e) an existing `**Handoff File:** none` line survives an update byte-for-byte. Update the field-to-flag table that maps template labels to update-state flags so it no longer lists `Handoff File`. The fixtures that write `**Handoff File:** none` into a synthetic `STATE.md` stay — they now double as the "old file still tolerated" evidence. Record the case count before and after.
- **Status:** Done
- **Changes:** `dev/tests/engine.js`: removed the `--handoff` field-creation case; added "update-state no longer knows the handoff pointer…" ((e) an existing `**Handoff File:** none` line survives updates and a `handoff` patch key writes nothing; (d) `--handoff=x` gets the same unknown-argument message and exit as a made-up flag, no line created on a fresh file); H1 now pins (a) hand-set `Paused` alone → silent and (b) stale `HANDOFF.json` + nothing in flight → silent, with an In Progress control; H3/H4 pins that a hand-set `Paused` adds no marker and does not change the line; `Handoff File` row dropped from the template-field writer table. `dev/tests/suite.md` T220–T222 lose the `Handoff File` and `/magic.pause` clauses. Evidence: harness 144 before and after (one retired, one added, two rewritten in place), 144/144 green; 4 by-hand mutation controls (handoff writer reinstated, flag reinstated, paused-only speaks again, paused marker returns) all CAUGHT, files restored by hash. Kept `**Handoff File:** none` fixtures at engine.js 4401/4795/4805/4887/4910/7519 (old file tolerated), `HANDOFF.json` at 7565/7623 (stale file inert), synthetic detector samples `/magic.pause` at 8379-8434; suite.md 3429 leftover HANDOFF.json scenario.
- **Notes:** Run after T-37B02 and T-37B03. The `/magic.pause` strings in the phantom-command detector cases are synthetic sample text for that detector, not references to the module — leave them.

### [T-37B07] Verification: a repository-wide search for the removed names

- **Spec:** l2-session-checkpoint.md §5.8 (deployment verified by search)
- **Status:** Done
- **Changes:** Search `grep -rnE "pause\.md|HANDOFF\.json|--handoff|Handoff File|handoff\.json|/magic\.pause" .magic workflows skills rules docs README.md CONTRIBUTING.md .agents dev/scripts` prints nothing (only the manifest, regenerated at T-37T01, names the two deleted files). Over `dev/tests`, the residue is exactly the listed exceptions: engine.js `**Handoff File:** none` fixtures 4401, 4795, 4805, 4887, 4910, 7519; the new (d)/(e) case 5153-5194 (names the removed flag and line on purpose); stale `HANDOFF.json` fixture 7565 and precondition 7623; synthetic phantom-command detector samples `/magic.pause` 8379, 8385, 8392, 8395, 8432, 8434; suite.md 3429 (leftover-file scenario, retitled as a retired-mechanism file).
- **Assignment:** Agent
- **Verify:** `grep -rnE "pause\.md|HANDOFF\.json|--handoff|Handoff File|handoff\.json|/magic\.pause" .magic workflows skills rules docs README.md CONTRIBUTING.md .agents dev/scripts` prints nothing (skill and workflow twins under `.agents/` included), and the same search over `dev/tests/engine.js` and `dev/tests/suite.md` prints only the synthetic detector samples and the "old file still tolerated" fixtures named in T-37B06, each listed in `Changes` with its line. The `.design/` specification history is out of scope for the search (it records the retirement).
- **Handoff:** T-37T01.
- **Notes:** This is the deletion's proof — a residue reference is a dead pointer on every consumer install after the next release.

### [T-37C01] `significance.js` and `rules/magic.md`: `RULES.md` in the spec whitelist

- **Spec:** l2-engine-finalization.md §10.2
- **Status:** Done
- **Changes:** `significance.js`: `WHITELIST['magic.spec']` gains `.design/RULES.md` and `.design/{ws}/RULES.md` (`magic.rule` unchanged); dedup confirmed by reading `computeSignificance` — candidates are filtered from the unique probe paths of one workflow’s patterns, so a path counts once. `rules/magic.md` §3 row for `magic.spec` lists the same two paths, written in place: `validate-hardlinks.js` passes and `fsutil hardlink list rules/magic.md` shows both `rules/magic.md` and `.agents/rules/magic.md`. Evidence: added-line citation grep over `.magic rules` prints nothing; `rules/` is outside C14 tracking.
- **Assignment:** Agent
- **Verify:** `WHITELIST['magic.spec']` in `.magic/scripts/lib/significance.js` gains `.design/RULES.md` and `.design/{ws}/RULES.md`; `magic.rule`'s entry is unchanged; a path present in both workflows' lists counts once per invocation (the existing per-invocation dedup, confirmed by reading it, not assumed). `rules/magic.md` §3's whitelist table row for `magic.spec` lists the same two paths. **[C-001]:** `rules/magic.md` is hardlinked to `.agents/rules/magic.md`; after the edit `node dev/scripts/validate-hardlinks.js` passes and `fsutil hardlink list rules/magic.md` shows both paths. `git diff -U0 -- .magic rules | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+"` prints nothing.
- **Handoff:** T-37C02.
- **Notes:** `rules/` is outside C14 tracking — the `rules/magic.md` change ships without a version bump, as the layer contract says. Prefer an in-place write for the linked file (it kept the twins linked in earlier phases) and verify either way.

### [T-37C02] Validation: a harness case for spec-side rule capture, with its control

- **Goal:** Prove a rule-only capture is now counted under the spec workflow, and only there.
- **Method:** In `dev/tests/engine.js`, a fixture whose only change since the last snapshot is `.design/RULES.md` (or the workspace `RULES.md`): `finalize --workflow=spec` → significant, project version bumped, changelog entry written; control — the identical change under `--workflow=task` → not significant (the `⏭️ No significant changes` path). Mutation-check: revert the whitelist entry, expect the first assertion red, restore by hash. Record the count before and after.
- **Status:** Done
- **Changes:** New harness case "finalize.js counts a RULES.md-only change as significant under magic.spec and not under magic.task" (both `.design/RULES.md` and `.design/main/RULES.md`, real finalize CLI in a git fixture): task → `No significant changes`, version 0.1.0; spec → `Finalization complete`, 0.1.1, changelog entry. Found in passing and fixed in-task: `commit-suggester.js` would have worded a rules-only spec finalize as "Updated spec registry"; it now says "Updated global project rules"/"Updated workspace rules" (same words as the rule workflow), pinned by the same case. Evidence: harness 145 (144 + 1); 5 by-hand mutation controls (both paths dropped, global only, workspace only, task wrongly counts RULES.md, bullet falls back) all CAUGHT, files restored by hash.
- **Notes:** Follows the shape of the existing significance and finalize CLI cases; reuse their fixture helpers rather than building a new one.

### [T-37D01] `dev/scripts/mutation-check.js`: the driver

- **Spec:** l2-test-suite.md Mutation-Control Driver
- **Status:** Done
- **Changes:** New `dev/scripts/mutation-check.js` (Layer 2, Node built-ins only): reads a JSON list of `{name,file,needle,replacement,test}`; per entry refuses unless the needle occurs exactly once, the file is under the root and not under `.design/`, and the pattern matches at least one case; applies the replacement in place with the function form of `replace`; runs only `--test-name-pattern=<test>`; `CAUGHT`/`SURVIVED`; restores original bytes and verifies by SHA-256 (`RESTORE FAILED`); restore runs on a throwing run (injectable `run`), on SIGINT/SIGTERM and on process exit. One line per entry plus a summary; exit 1 unless every entry was CAUGHT (an empty list also fails). `--harness` and `--root` override the defaults. JSDoc on every function, section blocks in the neighbouring style. Evidence: run over the five C02 controls printed 5 CAUGHT, exit 0, sources clean afterwards.
- **Assignment:** Agent
- **Verify:** `node dev/scripts/mutation-check.js <spec.json>` reads a list of `{ name, file, needle, replacement, test }` and, per entry: refuses (`REFUSED`) unless `needle` occurs exactly once in `file`; applies the replacement; runs only the harness case matching `test` (`node --test --test-name-pattern=<test> <harness>`); expects a failure (`CAUGHT`; a pass is `SURVIVED`); restores the original bytes and verifies the restore by hash (`RESTORE FAILED` if it differs). The restore also runs when the run throws and on SIGINT/SIGTERM. Output is one line per entry plus a summary; the exit code is non-zero if any entry survived, was refused or failed to restore. The harness path and repository root default to this repository and are overridable (`--harness`, `--root`) so a self-test can point it at a fixture. It refuses a `file` outside the root or under `.design/` (it never edits a specification). Layer 2: it lives in `dev/scripts/`, imports nothing from `.magic/` beyond Node built-ins, and is not listed in any shipped manifest. JSDoc on every function; the section-block style of the neighbouring dev scripts.
- **Handoff:** T-37D02.
- **Notes:** The procedure is already known — three phases ran it through a scratch script, and the last one's is the model: read the file, split on the needle, require one occurrence, write, run, compare, restore, hash. Keep the replacement passed through a function form (`replace(needle, () => repl)`) so a `$` in a replacement is not interpreted. No new dependency.

### [T-37D02] Validation: the driver's self-test, and one real use

- **Goal:** Prove the driver catches and reports correctly, restores in every case, and is usable on this repository's own suite.
- **Method:** In `dev/tests/engine.js`, a case that builds a throwaway fixture (one source file, one tiny `node:test` file asserting on it) and drives `mutation-check.js` over it with `--root`/`--harness`: one mutation the case catches → `CAUGHT`, one it does not → `SURVIVED` (exit non-zero), one whose needle occurs twice → `REFUSED`, and a run made to throw mid-mutation → file byte-identical afterwards; every original hash equals its post-run hash. Then one real use recorded in `Changes`: a JSON spec of the six mutations of the Phase 35 nothing-pending branch run against this repository's own case, all `CAUGHT`, tree clean by `git status` after.
- **Status:** Done
- **Changes:** New harness case "mutation-check.js reports CAUGHT, SURVIVED and REFUSED correctly and always restores the mutated file" on a throwaway fixture (one source file, one tiny node:test file), driven through the real CLI with --root/--harness: 1 CAUGHT, 1 SURVIVED (exit 1), 6 REFUSED (needle twice, needle absent, no matching case, file outside the root, a specification under .design/, malformed entry), summary line asserted, all-caught list exits 0, source/outside/specification files byte-identical by SHA-256, and an injected throwing run restored byte for byte with the replacement applied verbatim (`$&` literal). Driver refined while writing it: a pattern that matches nothing still prints one line for the harness file, so "a case ran" is decided from named results, not the tests count; NODE_TEST_CONTEXT is dropped for the nested run. Driver self-controls (through the driver itself): 8 mutations (verdict inverted, restore skipped, needle count loosened, replacement read as a pattern, specifications allowed, outside-root allowed, throwing run swallowed, no-match check off) all CAUGHT. Real use: the six Phase 35 nothing-pending mutations as a JSON list against this repository own case — 6 CAUGHT, 0 RESTORE FAILED, tree unchanged (git status shows only the new script). Harness 145 -> 146.
- **Notes:** The real use is the acceptance test — the driver reproduces what the scratch script did.

### [T-37T01] Validation: harness, scans, hardlinks; single C14 bump

- **Goal:** Prove the tree is consistent, then close the phase's one C14 bump.
- **Method:** (1) `node --test dev/tests/engine.js` → all green (previous 143 − retired + added; record the exact count). (2) `node dev/scripts/mutation-check.js` over the T-37A03 and T-37C02 mutation specs → all `CAUGHT`. (3) T-37B07's search prints only the listed synthetic samples. (4) `git diff -U0 -- .magic rules workflows | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+"` prints nothing; the registered-name harness scan passes. (5) `node dev/scripts/validate-hardlinks.js` passes. (6) `node .magic/scripts/executor.js update-engine-meta --workflow magic.run magic.status magic.analyze` → engine 2.1.113 → 2.1.114, two files gone from the manifest, one C14. (7) Post-bump: repeat (1); `check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`; `finalize --workflow=run --dry-run` prints a `Next step`; docs links resolve.
- **Status:** Done
- **Changes:** (1) harness 146/146 (143 -> 144 A03 -> 145 C02 -> 146 D02; B06 net 0), again 146/146 after the bump. (2) `mutation-check.js` over the by-hand series: A03 7/7, B06 4/4, C02 5/5 CAUGHT, 0 RESTORE FAILED. (3) residue search prints nothing outside the manifest, `dev/tests` residue exactly the B06/B07 list. (4) added-line citation grep over `.magic rules workflows` (against HEAD) prints nothing; the registered-name harness scan is part of the 146. (5) `validate-hardlinks.js` passes (rules/magic.md and workflow pairs linked). (6) `update-engine-meta --workflow magic.run magic.status magic.analyze`: engine 2.1.113 -> 2.1.114, 72 files in the manifest, `pause.md` and `templates/handoff.json` gone from it, skills regenerated, one C14. (7) `check-prerequisites --json --verify-headers` ok:true, no warnings; `finalize --workflow=run --dry-run` prints a Next step. Non-blocking: the dry-run digest carries one UNKNOWN_ARGUMENT (--handoff=x) finding left in the sink by this phase’s own probe of the retired flag.
- **Notes:** `dev/scripts/mutation-check.js` is L2 and outside C14; `rules/magic.md` is outside C14 too. No file is *created* under `.magic/`, so the tracked-files invariant is not at risk; two are deleted, so the manifest shrinks — expected, not drift.
