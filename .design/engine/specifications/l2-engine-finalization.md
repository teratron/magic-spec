# Engine Finalization Library

**Version:** 2.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Internal helper library (`scripts/lib/`) that implements the finalization protocol — automatic version bumps, CHANGELOG entries, commit message suggestions, phase archival, and git utilities. These modules are invoked exclusively by `finalize.js` via `executor.js finalize`. The finalize pipeline is also the single choke point for the session-continuity guarantees SC-2 (post-workflow `STATE.md` update) and SC-3 (commit suggestion guarantee).

This spec owns the **pipeline contract**: module inventory, invocation surface, opt-out, archival, and the terminal output block. Its two accumulated defect registers were extracted at v2.0.0 into focused child specs — [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) (the `STATE.md` correctness surface) and [l2-finalize-output-contract.md](l2-finalize-output-contract.md) (commit messages, CHANGELOG bullets, stdout listings).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2/SC-3 invariants carried by this pipeline (§5).
- [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) — Child: STATE.md accuracy defects and their required fixes.
- [l2-finalize-output-contract.md](l2-finalize-output-contract.md) — Child: emitted-artifact defects (RC-11 containment, SC-3.1 completeness, CHANGELOG suppression).
- [l2-engine-automation.md](l2-engine-automation.md) — Covers the top-level automation scripts that consume this library.
- [l2-engine-diagnostics.md](l2-engine-diagnostics.md) — Diagnostics digest that this pipeline drains and renders in its terminal block (§8).

## 1. Motivation

The finalization protocol (§3 of `rules/magic.md`) requires several coordinated writes across version files, CHANGELOG, and phase archives. Rather than embedding this logic in `executor.js`, it is decomposed into focused single-responsibility modules in `scripts/lib/`.

## 2. Library Modules

| Module | Responsibility |
| --- | --- |
| `changelog-writer.js` | Appends a given bullet to root `CHANGELOG.md` in Keep-a-Changelog form — pure insertion, does not compose bullet text. Also exports the `[Unreleased]` rotation helper (currently uncalled — see child spec §4.2). |
| `commit-suggester.js` | Composes the Conventional Commits message **and** the CHANGELOG bullet text itself (`buildChangelogBullet`) — the two share the same file-classification logic, so `finalize.js` calls both from here before handing the bullet to `changelog-writer.js` for insertion. Output contract governed by [l2-finalize-output-contract.md](l2-finalize-output-contract.md). |
| `diagnostics.js` | Collects non-fatal engine findings and renders the digest drained by §8. Governed by [l2-engine-diagnostics.md](l2-engine-diagnostics.md). |
| `git-utils.js` | Read-only git helpers: diff detection, staged-file enumeration, mtime queries. |
| `phase-archiver.js` | Detects `status: Done` phase files, moves them to `archives/tasks/`, and rewrites link references in **both** `TASKS.md` and `PLAN.md`. Eligibility predicate governed by §6; index-rewrite contract by §7. |
| `project-version.js` | Reads and writes `.design/.version`; computes next semver bump (major/minor/patch). |
| `significance.js` | Evaluates whether changed artifacts fall within the whitelist that triggers a version bump. |

## 3. Invocation Contract

All modules are internal — they export functions consumed only by `finalize.js`. No workflow or spec file should reference individual `lib/` modules directly. The public API is:

```plaintext
executor.js finalize --workflow=<spec|task|run|rule> [--dry-run] [--no-bump] [--no-changelog] [--no-commit-msg]
```

## 4. Opt-Out Mechanism

Controlled by `MAGIC_FINALIZE=0` (env) or `finalization.enabled: false` in `workspace.json`. When disabled, all `lib/` modules are skipped and `executor.js` exits with `⏭️ No significant changes detected`.

## 5. Session-Continuity Integration

Implements SC-2 and SC-3 of [l1-session-continuity.md](l1-session-continuity.md) for every `--workflow` value (`spec|task|run|rule`):

### 5.1 State Update Step (SC-2)

After significance evaluation and phase archival, the pipeline patches the active workspace's `STATE.md` via the `update-state` utility (`.magic/scripts/update-state.js`):

- `Updated` — invocation timestamp.
- `Status` — **not patched by this step.** `updateSessionState()` calls `updateState(wsDir, { nextAction }, { autoProgress: true })` — `status` is never a key of that patch, so the field keeps whatever value an earlier explicit `--status=` call (`task.md` plan write-back, `run.md` phase transitions) last set. Left accurate only as long as those explicit call sites stay in sync — a latent gap tracked in [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) §10.
- Progress indicators — phase and overall counters, when `TASKS.md` is present. The recompute **merges, never clobbers**: only counter lines (`Label: [done/total] …`, including template `{filled}/{total}` placeholders) inside the `## Progress` fence are engine-owned and replaced; any other line is treated as hand-authored session narrative and preserved below the fresh counters. Silently discarding the operator's Progress notes on a routine finalize is an SC-2 defect — and so is silently discarding the phase-level counter itself when the recompute cannot locate it.
- `Next Action` — the computed next step (pipeline order per DA-6, plan-complete resolution per SC-2.1, Blocked-phase precedence per SC-2.1(a)). The synthesized value is screened at the computation's single exit against SC-2.2: exactly one command, never `/magic.spec` or `/magic.analyze`. A screened-out value degrades to the `/magic.task` funnel with a warning — finalize is non-blocking and never aborts over a recommendation string. SC-2.4 records the boundary condition where that funnel is itself unproductive.

The step runs even when the significance whitelist does not hit — live memory must reflect every completed command, not only version-bumping ones. Failures are non-blocking: a warning is printed and finalize continues.

Defects found against this step, with their required fixes, are catalogued in [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md).

### 5.2 Commit Suggestion Guarantee (SC-3)

`commit-suggester.js` gains a fallback mode: when the significance whitelist misses but the git working tree changed during the invocation, finalize still emits a suggested Conventional Commits message, labeled `(non-bumping)` — no version bump, no CHANGELOG entry, message only. The existing hard rule is unchanged: no write-side git operation is ever invoked; the user commits manually. Message completeness is governed by [l2-finalize-output-contract.md](l2-finalize-output-contract.md) §3.

### 5.3 Exemptions

Read-only workflows (analyze, graph, status) never invoke finalize; they inherit no SC-2/SC-3 obligations. `--dry-run` previews the state patch without writing it, and reads the diagnostics sink without draining it.

## 6. Phase Archival Eligibility (Precision)

This section pins the eligibility predicate for the **C8 (Phase Archival)** convention — the move of a completed phase file from `tasks/` to `archives/tasks/`. `rules/magic.md` §4 states a phase is archivable when its file has `status: Done` and "no remaining `- [ ]` items". The word *items* is normative and means **unchecked Atomic Checklist line items**, not any textual occurrence of the `- [ ]` sequence. The eligibility predicate MUST:

1. Match an unchecked item only as a **checklist line** — anchored at line start with optional indentation (e.g. `^\s*- \[ \]`), inside the phase file's checklist region.
2. **Ignore** `- [ ]` appearing in prose, task `Notes`, `Verify` lines, fenced code, or inline code-spans (backticks). A phase whose tasks merely *describe* checkbox syntax is still archivable when its real checklist is fully checked.

A substring scan (`content.includes('- [ ]')`) over the whole file is **non-conformant**: it false-positives on documentation of checkbox syntax and silently suppresses archival. This precision is the acceptance criterion for the `allChecked` helper in `phase-archiver.js`.

## 7. Archival Index Rewrite `[ADDED]`

### 7.1 Scope Gap in the Prior Contract

§2's module description previously stated that `phase-archiver.js` "rewrites `TASKS.md` link references" and said nothing about `PLAN.md`. The module has always rewritten both — `updateTasksIndex()` and `updatePlanIndex()` are separate exported steps of `archiveCompletedPhases()`. A second index was being mutated with no stated contract, which is why the defect below survived five consecutive archivals uncorrected: there was nothing to implement against, so nothing to test.

### 7.2 The Defect

Both rewriters replace the link **target** but only `updateTasksIndex()` also repairs the surrounding row. `updatePlanIndex()` is target-only:

```js
content = content.replace(
    new RegExp(`\\(tasks/${escaped}\\)`, 'g'),
    `(archives/tasks/${file})`
);
```

`PLAN.md` writes its phase-file reference as a markdown link whose **label is itself the path** — `[tasks/phase-N.md](tasks/phase-N.md)`. Rewriting the target alone yields `[tasks/phase-N.md](archives/tasks/phase-N.md)`: a link that resolves correctly while its visible text asserts a location the file no longer occupies.

`updateTasksIndex()` is structurally immune, not more careful — its label is a phase number (`[Phase 18](...)`), which stays true across the move. The asymmetry is a property of the two files' link conventions, not of the two functions' quality.

Confirmed on every archival since the behavior was first noticed: Phases 14, 15, 16, 17, and 18 — five for five, each corrected by hand afterward. The reason it never self-surfaced is that it produces no broken link, so a link-integrity sweep passes it; the contradiction is visible only to a reader comparing label against target.

### 7.3 Required Fix

`updatePlanIndex()` must rewrite the label alongside the target whenever the label is itself the pre-move path:

```plaintext
BAD : [tasks/phase-N.md](archives/tasks/phase-N.md)
GOOD: [archives/tasks/phase-N.md](archives/tasks/phase-N.md)
```

Scope the rewrite to the exact `[{path}]({path})` self-labelling form rather than replacing every occurrence of the path string in the file. `PLAN.md` prose legitimately mentions phase paths in narrative (phase descriptions, Backlog entries citing prior work), and those mentions describe history — rewriting them would corrupt the record the same way the current bug corrupts the link.

The status annotation beside the link (`*(Done, archived)*`) is authored by the workflow, not the archiver, and is out of scope here.

### 7.4 Regression Coverage

A harness case must archive a fixture whose `PLAN.md` contains both a self-labelled link (`[tasks/phase-N.md](tasks/phase-N.md)`) and a prose mention of the same path, then assert: the link's label and target both moved; the prose mention is untouched; and `TASKS.md`'s phase-number label is unchanged. Asserting only the link would pass a naive global replace, which is the specific over-correction §7.3 rules out.

## 8. Terminal Block Ownership (Diagnostics Digest)

The pipeline's stdout carries two sections at its end — an engine diagnostics digest and the next step — governed by [l1-engine-diagnostics.md](l1-engine-diagnostics.md) (DG-5, DG-6) and implemented per [l2-engine-diagnostics.md](l2-engine-diagnostics.md) §4.7. This section records only what changes **for this pipeline**; the digest's collection, taxonomy, and rendering rules are not restated here.

Two structural consequences for `finalize.js`:

1. **The terminal block leaves the path-specific emitters.** The auto-commit notice was previously assembled twice — once inside `emitFallbackCommitSuggestion()` on the non-significant path, once inside `emitSuccess()` on the significant one. It moves into a single `emitTail()` that `main()` calls once on both paths, together with the digest and the next step. Neither `emitSkip()` nor `emitSuccess()` may render any part of the terminal block; that prohibition is what makes DG-5's "same order on every path" checkable rather than aspirational.

2. **`updateSessionState()`'s return value becomes load-bearing.** It already returns `{ updated, dryRun?, nextAction }` on every branch, but `nextAction` was consumed by nobody. `emitTail()` prints that exact value (DG-6). The pipeline must not call `computeNextAction()` a second time to obtain it: the guarantee is that the string shown to the user and the string persisted to `STATE.md` are the same one, and a recomputation satisfies the wording while restoring the divergence the invariant exists to close.

This pipeline is also the diagnostics inventory's largest emitter block — six non-fatal findings across `main()`, `updateSessionState()`, and the CHANGELOG and phase-archival steps. The drain runs once in `main()`, after every other step, so findings produced by those steps are in the sink before the digest is composed.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/finalize.js` | Pipeline orchestrator; host of the §8 terminal block |
| `.magic/scripts/lib/diagnostics.js` | Diagnostics collector drained by the §8 terminal block |
| `.magic/scripts/lib/changelog-writer.js` | CHANGELOG append logic |
| `.magic/scripts/lib/commit-suggester.js` | Commit message generation and CHANGELOG bullet composition |
| `.magic/scripts/lib/git-utils.js` | Read-only git helpers |
| `.magic/scripts/lib/phase-archiver.js` | Phase archival (§6) and the `TASKS.md`/`PLAN.md` index rewrites (§7) |
| `.magic/scripts/lib/project-version.js` | `.design/.version` semver management |
| `.magic/scripts/lib/significance.js` | Significance whitelist evaluation |
| `.magic/scripts/update-state.js` | STATE.md patch utility invoked by §5.1 |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 2.0.0 | 2026-08-07 | Agent | **Decomposed** at 367 lines against the 300-line `SPEC_BLOAT` threshold, following the `l2-role-cards` precedent (parent retains the contract, children carry accumulated content). §8 (five STATE.md accuracy defects) and §10 (line-cap guard defeat) → new [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md); §7 (RC-11 generator containment) and §9 (SC-3.1 file visibility) → new [l2-finalize-output-contract.md](l2-finalize-output-contract.md). Surviving sections renumbered: old §11 Terminal Block → §8. New **§7 Archival Index Rewrite**, closing a five-for-five reproduced defect (Phases 14-18) that had no stated contract to fix against: `updatePlanIndex()` rewrites a phase link's target but not its label, and `PLAN.md`'s links are self-labelling (`[tasks/phase-N.md](tasks/phase-N.md)`), so archival yields a working link whose text contradicts its destination. §2's module row corrected — the archiver has always rewritten `PLAN.md` as well as `TASKS.md`, and the omission is why the gap persisted. §7.3 explicitly scopes the fix to the self-labelling form so prose mentions of historical paths are not corrupted; §7.4 requires the harness to pin that distinction. Module table gained `diagnostics.js`. |
| 1.11.0 | 2026-08-07 | Agent | New §11 (Terminal Block Ownership): the pipeline's stdout gains a diagnostics digest and a next-step section at its end, per the new [l1-engine-diagnostics.md](l1-engine-diagnostics.md) DG-5/DG-6. Records the two structural consequences for this pipeline — the auto-commit notice moves into a single `emitTail()` called once from `main()` on both exit paths, and `updateSessionState()`'s hitherto-unconsumed `nextAction` return value becomes the printed string, threaded rather than recomputed. Canonical References gained `lib/diagnostics.js`. |
| 1.10.1 | 2026-08-06 | Agent | §8.4's `GOOD` replacement regex corrected: it narrowed the label class to `Phase \d+`, which does not match the state template's own `Phase {N}: [{filled}/{total}]` bootstrap line — applying the example verbatim demotes an engine-owned line to narrative and leaves the placeholder in place, caught by an existing harness case during implementation. Now `Phase (?:\d+\|\{[^}]*\})`. Correction of a worked example; reasoning and required behavior unchanged, so patch and no status transition. *(Section since relocated to the state-accuracy child spec.)* |
| 1.10.0 | 2026-08-06 | Agent | New §10 (SC-1.2) — Line-Cap Guard Defeat by Unbounded Blocking Constraints: the 100-line guard prunes only `## Recent Decisions`, which already has its own 5-entry cap, while `## Blocking Constraints` grows unbounded by design; once Recent Decisions hits its 1-entry floor the guard has nothing to remove yet still reports a prune. Reproduced at 60 constraints → 110 lines. Companion invariant: `l1-session-continuity.md` 1.7.0 (SC-1.2). *(Section since relocated.)* |
| 1.9.0 | 2026-08-06 | Agent | New §9 (SC-3.1) — Non-Whitelisted File Visibility: `emitSuccess()` and `buildCommitMessage()` both built their file listings from the significance whitelist subset, conflating "should this bump the version" with "what should the message tell the user they changed". Reproduced against commit `b96ce07`, which suggested 2 files against an actual 17. Companion invariant: `l1-session-continuity.md` 1.6.0 (SC-3.1). *(Section since relocated.)* |
| 1.8.0 | 2026-08-06 | Agent | New §8.5 (renumbering 8.5→8.6, 8.6→8.7) — Progress Replacement-String Injection: a string-form `.replace()` against a 3-capture-group regex re-scans the replacement for `$1`-`$9`, so a `$`-digit sequence in preserved narrative splices fence markup mid-document. The most severe §8 defect — corrupts structure, not just values. *(Section since relocated.)* |
| 1.7.0 | 2026-08-06 | Agent | §8 gained two defects and was reordered. New §8.3 — per-task `update-state` paired `--task=` with `--status=`, writing a task-scoped value into the phase-level field. New §8.4 — the merge classifier matched any `{label}: [n/m]` line, deleting hand-authored counter-shaped narrative. Canonical References gained `.magic/run.md`. *(Sections since relocated.)* |
| 1.6.0 | 2026-08-06 | Agent | Added §8: two SC-2 defects sharing one root symptom (the state update makes `STATE.md` less accurate, not more). §8.1 Blocked-phase next-action; §8.2 progress granularity on the two-level layout. §5.1's `Status` bullet corrected — no code path in this step recomputes `Status`. *(Sections since relocated.)* |
| 1.5.0 | 2026-08-06 | Agent | Added §7 Generator Containment (RC-11): `buildChangelogBullet()`'s single-spec branch interpolated a spec's artifact ID into text written straight to root `CHANGELOG.md`, where no Coder or Code-reviewer gate mediates it. Library Modules table corrected: `commit-suggester.js`, not `changelog-writer.js`, composes bullet text. *(Section since relocated.)* |
| 1.4.0 | 2026-08-06 | Agent | §5.1 `Next Action` bullet realigned to SC-2.2: screened at the computation's single exit, degrading to the `/magic.task` funnel with a warning rather than aborting. |
| 1.3.0 | 2026-07-18 | Agent | §5.1 progress recompute contract hardened: counter lines recomputed in place, non-counter lines preserved as hand-authored narrative (merge, never clobber). Field evidence: unconditional replacement destroyed an operator's Progress notes twice in one session. |
| 1.2.1 | 2026-07-10 | Agent | Traceability: §6 now cites the **C8 (Phase Archival)** convention it implements. No logic change. |
| 1.2.0 | 2026-06-13 | Agent | Added §6 Phase Archival Eligibility (Precision): `allChecked` must match anchored checklist line items, not substring `- [ ]` in prose/code-spans. Field evidence: phase-10 was silently skipped by the auto-archiver. |
| 1.1.0 | 2026-06-12 | Agent | Added §5 Session-Continuity Integration: SC-2 state update step (always-run, non-blocking) and SC-3 non-bumping commit suggestion fallback. |
| 1.0.0 | 2026-05-07 | Agent | Initial Stable version. Covers the scripts/lib/ finalization helper library introduced in v2.1.0. |
