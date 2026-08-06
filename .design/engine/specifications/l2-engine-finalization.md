# Engine Finalization Library

**Version:** 1.7.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Internal helper library (`scripts/lib/`) that implements the finalization protocol — automatic version bumps, CHANGELOG entries, commit message suggestions, phase archival, and git utilities. These modules are invoked exclusively by `finalize.js` via `executor.js finalize`. The finalize pipeline is also the single choke point for the session-continuity guarantees SC-2 (post-workflow `STATE.md` update) and SC-3 (commit suggestion guarantee).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2/SC-3 invariants carried by the finalize pipeline (§5).
- [l2-engine-automation.md](l2-engine-automation.md) — Covers the top-level automation scripts that consume this library.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) — RC-11 (Generator Self-Containment) binds `commit-suggester.js`'s CHANGELOG-bullet output (§7).

## 1. Motivation

The finalization protocol (§3 of `rules/MAGIC.md`) requires several coordinated writes across version files, CHANGELOG, and phase archives. Rather than embedding this logic in `executor.js`, it is decomposed into focused single-responsibility modules in `scripts/lib/`.

## 2. Library Modules

| Module | Responsibility |
| --- | --- |
| `changelog-writer.js` | Appends a given bullet to root `CHANGELOG.md` in Keep-a-Changelog form — pure insertion, does not compose bullet text. |
| `commit-suggester.js` | Composes the Conventional Commits message **and** the CHANGELOG bullet text itself (`buildChangelogBullet`) — the two share the same file-classification logic, so `finalize.js` calls both from here before handing the bullet to `changelog-writer.js` for insertion. Bound by RC-11 (§7): its output is written straight to a product file with no human review step. |
| `git-utils.js` | Read-only git helpers: diff detection, staged-file enumeration, mtime queries. |
| `phase-archiver.js` | Detects `status: Done` phase files and moves them to `archives/tasks/`; rewrites `TASKS.md` link references. Eligibility predicate governed by §6. |
| `project-version.js` | Reads and writes `.design/.version`; computes next semver bump (major/minor/patch). |
| `significance.js` | Evaluates whether changed artifacts fall within the whitelist that triggers a version bump. |

## 3. Invocation Contract

All modules are internal — they export functions consumed only by `finalize.js`. No workflow or spec file should reference individual `lib/` modules directly. The public API is:

```plaintext
executor.js finalize --workflow=<spec|task|run|rule> [--dry-run] [--no-bump] [--no-changelog] [--no-commit-msg]
```

## 4. Opt-Out Mechanism

Controlled by `MAGIC_FINALIZE=0` (env) or `finalization.enabled: false` in `workspace.json`. When disabled, all `lib/` modules are skipped and `executor.js` exits with `⏭️ No significant changes detected`.

## 5. Session-Continuity Integration `[ADDED]`

Implements SC-2 and SC-3 of [l1-session-continuity.md](l1-session-continuity.md) for every `--workflow` value (`spec|task|run|rule`):

### 5.1 State Update Step (SC-2)

After significance evaluation and phase archival, the pipeline patches the active workspace's `STATE.md` via the `update-state` utility (`.magic/scripts/update-state.js`):

- `Updated` — invocation timestamp.
- `Status` — **not patched by this step.** `updateSessionState()` calls `updateState(wsDir, { nextAction }, { autoProgress: true })` — `status` is never a key of that patch, so the field keeps whatever value an earlier explicit `--status=` call (`task.md` plan write-back, `run.md` phase transitions) last set. This corrects a previous claim in this section that `Status` is "recomputed from plan/task state" here; no code path in this step does that. Left accurate only as long as those explicit call sites stay in sync — a latent gap, not fully closed by this amendment (see §8.6).
- Progress indicators — phase and overall counters, when `TASKS.md` is present. The recompute **merges, never clobbers**: only counter lines (`Label: [done/total] …`, including template `{filled}/{total}` placeholders) inside the `## Progress` fence are engine-owned and replaced; any other line is treated as hand-authored session narrative and preserved below the fresh counters. Silently discarding the operator's Progress notes on a routine finalize is an SC-2 defect — and so, per SC-2.3, is silently discarding the phase-level counter itself when the recompute can't locate it (§8.2).
- `Next Action` — the computed next step (pipeline order per DA-6, plan-complete resolution per SC-2.1, Blocked-phase precedence per SC-2.1(a) — §8.1). The synthesized value is screened at the computation's single exit against SC-2.2: exactly one command, never `/magic.spec` or `/magic.analyze`. A screened-out value degrades to the `/magic.task` funnel with a warning — finalize is non-blocking and never aborts over a recommendation string.

The step runs even when the significance whitelist does not hit — live memory must reflect every completed command, not only version-bumping ones. Failures are non-blocking: a warning is printed and finalize continues (live memory staleness is reported, never fatal).

### 5.2 Commit Suggestion Guarantee (SC-3)

`commit-suggester.js` gains a fallback mode: when the significance whitelist misses but the git working tree changed during the invocation, finalize still emits a suggested Conventional Commits message, labeled `(non-bumping)` — no version bump, no CHANGELOG entry, message only. The existing hard rule is unchanged: no write-side git operation is ever invoked; the user commits manually.

### 5.3 Exemptions

Read-only workflows (analyze, graph, status) never invoke finalize; they inherit no SC-2/SC-3 obligations. `--dry-run` previews the state patch without writing it.

## 6. Phase Archival Eligibility (Precision) `[ADDED]`

This section pins the eligibility predicate for the **C8 (Phase Archival)** convention — the move of a completed phase file from `tasks/` to `archives/tasks/`. `rules/MAGIC.md` §4 states a phase is archivable when its file has `status: Done` and "no remaining `- [ ]` items". The word *items* is normative and means **unchecked Atomic Checklist line items**, not any textual occurrence of the `- [ ]` sequence. The eligibility predicate MUST:

1. Match an unchecked item only as a **checklist line** — anchored at line start with optional indentation (e.g. `^\s*- \[ \]`), inside the phase file's checklist region.
2. **Ignore** `- [ ]` appearing in prose, task `Notes`, `Verify` lines, fenced code, or inline code-spans (backticks). A phase whose tasks merely *describe* checkbox syntax is still archivable when its real checklist is fully checked.

A substring scan (`content.includes('- [ ]')`) over the whole file is **non-conformant**: it false-positives on documentation of checkbox syntax and silently suppresses archival. This precision is the acceptance criterion for the `allChecked` helper in `phase-archiver.js`; its regression coverage belongs to the finalize-pipeline harness mandate ([l2-test-suite.md](l2-test-suite.md) §Script-Level Regression Harness).

## 7. Generator Containment (RC-11) `[ADDED]`

`buildChangelogBullet()` in `commit-suggester.js` is written straight to the product's root `CHANGELOG.md` via `changelog-writer.js`'s `appendBullet()` — no Coder authors this text, no Code-reviewer reviews a diff of it, so [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)'s **RC-5/RC-6 gates never see it**. RC-11 binds this generator exactly as RC-1/RC-2 bind hand-authored text: its output must never embed a spec's **artifact ID** — the identifier obtained by stripping the `l1-`/`l2-` prefix and `.md` extension from the spec's filename (`artifactId()` in this same module).

### 7.1 The Defect (field report, engine 2.1.49)

The `spec` case of `buildChangelogBullet()` has two branches keyed on `specs.length`:

- `specs.length > 1` → `` `${verb} ${specs.length} specifications (${workspace})` `` — generic, safe.
- `specs.length === 1` → `` `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})` `` — interpolates the artifact ID, **violating RC-11**.

The `run` case's own single-item branch (`` `Completed task (${workspace})` `` — no task ID interpolated) already demonstrates the correct shape; the `spec` case's single-item branch is the outlier, not the pattern.

`artifactId()` is legitimately used elsewhere in this same module (`buildSummary()`, for the git commit-message header) — that usage is **not** a violation: commit messages are git metadata, exempt under RC-8. The violation is specific to text that reaches a product file: `buildChangelogBullet()`'s return value only.

### 7.2 Required Fix

`buildChangelogBullet()`'s `spec` case, `specs.length === 1` branch, must drop the `artifactId()` interpolation and return a generic bullet — matching the shape its own multi-item branch and the `run` case's single-item branch already use:

```plaintext
BAD : `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})`
GOOD: `${verb} a specification (${workspace})`
```

No other branch of `buildChangelogBullet()` (`task`, `run`, `rule`) interpolates an SDD-layer identifier — this fix is scoped to the one outlier branch.

### 7.3 Regression Coverage (RC-11 enforcement)

Per RC-11, the enforcement surface for generator output is regression-test coverage, not a role-card gate. The finalize-pipeline harness ([l2-test-suite.md](l2-test-suite.md)) must add a case asserting `buildChangelogBullet('spec', workspace, [oneAddedSpecFile])` contains **no** spec-derived identifier — pinning the fixed shape so the single-item branch cannot regress back to interpolating `artifactId()`.

## 8. STATE.md Accuracy Fixes (SC-1.1, SC-2.1(a), SC-2.3) `[ADDED]`

All four defects below were found across two field reports against the same engine version (2.1.58) and share one root symptom: the SC-2 state-update step made `STATE.md` **less** accurate than before the update it was supposed to refresh.

### 8.1 The Next Action Defect

`synthesizeNextAction()` in `finalize.js`'s tier-2 lookup (phase files, canonical two-level format) reads each `tasks/phase-{N}.md` in order and returns its first open checklist match with no awareness of phase status:

```js
for (const file of phaseFiles) {
    const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    const openTask = content.match(openTaskRe);
    if (openTask) return `Execute ${openTask[1]} ${openTask[2]} via /magic.run ${workspace}`;
}
```

A phase recorded `status: Blocked` in its own frontmatter still has an open (`- [ ]`) checklist line for the blocked task — Blocked is not Done — so this loop returns it unconditionally. Verified by direct reproduction against engine 2.1.62: a phase file with `status: Blocked` frontmatter, a `TASKS.md` registry row reading `` `Blocked` ``, and one open checklist item yields `Execute T-1A01 {title} via /magic.run {ws}` byte-for-byte, while `STATE.md`'s own `**Status:** Blocked` and `## Blockers` entry are left untouched by the same call — the file becomes internally contradictory, not just stale.

**Required fix** (SC-2.1(a)): before returning a phase's open-task match, check that phase's `status:` frontmatter (already available in `content`) and its `TASKS.md` registry row. Either reading `Blocked` MUST redirect the return value away from an execute-style recommendation — e.g. `` `Resolve blocker on ${openTask[1]} (${workspace}) — see STATE.md ## Blockers, then run /magic.run ${workspace}` `` — rather than either silently falling through to the next phase (which would recommend a *different*, possibly out-of-order phase) or leaving the field untouched (which would go stale the next time the blocker's own detail changes). The redirected value still passes through the SC-2.2 single-exit screen unchanged.

### 8.2 The Progress-Granularity Defect

`computeProgress()` in `update-state.js` derives the active phase's counter line from an inline heading inside `TASKS.md` itself:

```js
const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
if (section) { /* only path that produces a Phase-N line */ }
```

That heading exists only in the legacy single-file task layout. The canonical two-level layout (`tasks/phase-{N}.md`, the format this engine's own workspace uses) never contains it, so `section` is always `null` and the phase-line branch never fires — for **every** project on the modern layout, not only Blocked ones. Verified by direct reproduction: a healthy, non-Blocked, 2-of-5-done phase in two-level format loses its `Phase 1: [2/5] …` counter on the very next `autoProgress` recompute, leaving only the aggregate `Overall: [0/1]` (phase-count, not task-count) line. This engine's own `.design/engine/STATE.md` has carried an `Overall`-only `## Progress` block for its entire history as a silent instance of the same gap.

**Required fix** (SC-2.3): `computeProgress()`'s phase-line branch must fall back to reading `tasks/{active-phase-file}.md` directly — mirroring the file lookup `synthesizeNextAction()`'s tier-2 already performs — and count `- [x]`/`- [ ]` lines across that file, when no inline `### Phase {N} Checklist` section is found in `TASKS.md`. The two-level lookup is the common case and should not depend on locating an inline heading that layout never has.

### 8.3 The Status Field Collision (SC-1.1)

`run.md` §2.5 documents two call sites for `--status=`, and they disagree about what the flag means:

```plaintext
# Per-task transition:
update-state --workspace={ws} --task="{T-ID} {Title}" --status={Done|Blocked} --next-action="..."

# Phase-start transition:
update-state --workspace={ws} --phase="{N+1} — {Phase Name}" --status=Active
```

`update-state.js` has exactly one `status` handler (`fieldMap.status`, mapped to the top-level `**Status:**` field) — there is no separate task-status field in the `STATE.md` schema for the first call site to target. Verified by direct reproduction against engine 2.1.62: invoking the documented per-task form (`--task="T-1A01 Scaffold the app" --status=Done`) against a `STATE.md` with `**Phase:** 1` / `**Status:** Active` produces `**Status:** Done` — a value the field's own confirmed vocabulary (`Active | Blocked | Paused`, SC-1.1) does not even contain — after exactly one task of a five-task phase completed. `run.md`'s *own* Pause Propagation logic (a different call site, firing only when the whole phase stalls) already scopes `--status=Blocked` correctly to the phase; §2.5's per-task call is the outlier.

**Required fix**: drop `--status={Done|Blocked}` from the per-task update-state invocation entirely. A single task's completion is already tracked authoritatively by its checklist line and Detailed Tracking entry in `tasks/phase-{N}.md` — `STATE.md` needs no redundant, and here actively harmful, copy of it. The per-task call becomes `update-state --workspace={ws} --task="{T-ID} {Title}" --next-action="..."`; the phase-level `Status` field changes only at its own documented transition points (phase start, Pause Propagation, phase completion).

### 8.4 The Progress Over-Classification Defect (SC-2)

`update-state.js`'s merge-not-clobber classifier (`counterRe`, referenced in §5.1) is:

```js
const counterRe = /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/;
```

`[^:\n]+` accepts **any** label, but `computeProgress()` only ever emits two: `Overall` and `Phase {N}`. A hand-authored line using the same `{Label}: [n/m]` shape for a different purpose — the field report used `Specification: [3/3] complete`, `Plan: [1/1] complete`, `Implementation: [1/5] in progress — see notes below` — matches `counterRe`, is excluded from `preserved`, and is never regenerated (`computeProgress()` doesn't know those labels), so it is simply gone. Verified by direct reproduction: a `## Progress` fence with those three custom lines plus `Phase 1: […]` and `Overall: […]` was recomputed down to `Overall: […]` alone — four of five lines lost, three of them lines the "merge, never clobbers" contract (§5.1) explicitly promises to preserve as narrative.

**Required fix**: narrow `counterRe` to the exact label set `computeProgress()` currently produces, rather than an open label class:

```plaintext
BAD : /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
GOOD: /^(?:Overall|Phase \d+):\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
```

The placeholder-value alternation (`{filled}/{total}`, for template bootstrap state) stays; only the label portion narrows. Any line whose label is not exactly `Overall` or `Phase {N}` is narrative by definition, however counter-shaped it looks — the classifier's job is to recognize what the engine itself writes, not to guess at operator intent from formatting.

### 8.5 Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), all four fixes above need harness cases:

- `synthesizeNextAction()`/`computeNextAction()` called against a Blocked two-level-format fixture must not return an execute-style recommendation naming the blocked task's ID (§8.1).
- `computeProgress()` called against a healthy two-level-format fixture must produce a `Phase {N}: […]` line, not aggregate-only (§8.2).
- A per-task `update-state` call (`--task=`, no `--status=`) must leave the phase-level `Status` field unchanged (§8.3).
- `computeProgress()`'s merge step, given a fence containing `Specification:`/`Plan:`/`Implementation:`-style custom counter-shaped lines alongside `Overall`/`Phase {N}`, must preserve the custom lines and regenerate only `Overall`/`Phase {N}` (§8.4).

### 8.6 Known Gap Not Closed Here

§5.1's `Status` bullet (corrected above) documents that no code path in the SC-2 step actually recomputes `Status` — it is only ever set by explicit `--status=` calls elsewhere in `task.md`/`run.md`. §8.3 fixes one of those call sites (the per-task one, which should not touch `Status` at all); the broader claim that `Status` is ever holistically "recomputed" from plan/task state remains false after this amendment, and is not addressed here — noted so it is not mistaken for closed.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/lib/changelog-writer.js` | CHANGELOG append logic |
| `.magic/scripts/lib/commit-suggester.js` | Commit message generation and CHANGELOG bullet composition (RC-11, §7) |
| `.magic/scripts/lib/git-utils.js` | Read-only git helpers |
| `.magic/scripts/lib/phase-archiver.js` | Phase archival and TASKS.md rewrite |
| `.magic/scripts/lib/project-version.js` | `.design/.version` semver management |
| `.magic/scripts/lib/significance.js` | Significance whitelist evaluation |
| `.magic/scripts/update-state.js` | STATE.md patch utility invoked by the state update step (§5.1) |
| `.magic/run.md` | Hosts the per-task and phase-transition `update-state` call sites corrected by §8.3 |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.7.0 | 2026-08-06 | Agent | §8 gained two more defects (same day, one further field report) and was reordered: defects now group as §8.1-§8.4, followed by consolidated §8.5 Regression Coverage and §8.6 Known Gap. New §8.3 — `run.md` §2.5's per-task `update-state` call pairs `--task=` with `--status={Done\|Blocked}`, but `update-state.js` has one `status` handler, mapped to the phase-level field; reproduced directly (one task done → phase `Status` becomes `Done`, a value outside SC-1.1's own vocabulary, new this version). Fix: drop `--status=` from the per-task call — task completion is already authoritative in the phase file's checklist. New §8.4 — the merge-not-clobber classifier's `counterRe` matches any `{label}: [n/m]`-shaped line, not only the two labels (`Overall`, `Phase {N}`) `computeProgress()` actually emits, so hand-authored counter-shaped narrative (`Specification:`, `Plan:`, `Implementation:` in the field report) is misclassified as engine-owned and deleted rather than preserved — directly contradicting §5.1's own "merge, never clobbers" promise. Fix: narrow the label alternation to the exact emitted set. Canonical References gained `.magic/run.md`. Field report against engine 2.1.58. |
| 1.6.0 | 2026-08-06 | Agent | Added §8: two independent SC-2 defects sharing one root symptom (the state update makes `STATE.md` less accurate, not more). §8.1 — `synthesizeNextAction()`'s phase-file tier ignores `status: Blocked`, recommending execution of the very task the recorded blocker prevents (SC-2.1(a)); reproduced directly against engine 2.1.62. §8.2 — `computeProgress()`'s phase-counter branch only recognizes the legacy inline `### Phase {N} Checklist` heading, so it silently drops to an aggregate-only line for every project on the canonical two-level `tasks/phase-{N}.md` layout, Blocked or not — including this engine's own workspace, confirmed carrying the gap for its entire history (SC-2.3, new invariant). §5.1's `Status` bullet corrected: no code path in this step recomputes `Status`, contrary to what it previously claimed — §8.4 records this as a known, separate gap. Field report against engine 2.1.58. |
| 1.5.0 | 2026-08-06 | Agent | Added §7 Generator Containment (RC-11): `buildChangelogBullet()`'s `spec` case, single-spec branch, interpolates the spec's artifact ID (`artifactId()`, prefix/extension stripped) into text written straight to root `CHANGELOG.md` — no Coder or Code-reviewer gate mediates generator output, so the leak reached a shipped product file undetected. The multi-spec branch and the `run` case's own single-item branch already use safe generic wording; only this one branch is the outlier. §7.2 states the required fix, §7.3 the regression-coverage obligation. Library Modules table corrected: `commit-suggester.js`, not `changelog-writer.js`, composes the bullet text; `changelog-writer.js` only inserts it. Related Specifications gained `l1-sdd-reference-containment.md`. Field report against engine 2.1.49. |
| 1.4.0 | 2026-08-06 | Agent | §5.1 `Next Action` bullet realigned to SC-2.2: the synthesized value is screened at the computation single exit (exactly one command; never `/magic.spec` or `/magic.analyze`), degrading to the `/magic.task` funnel with a warning rather than aborting. Supersedes the 1.3.0 wording that cited SC-2.1 workflow-sensitive rule, withdrawn in l1-session-continuity 1.3.0. |
| 1.3.0 | 2026-07-18 | Agent | §5.1 progress recompute contract hardened: counter lines are recomputed in place, non-counter lines inside the `## Progress` fence are preserved as hand-authored narrative (merge, never clobber). Field evidence: unconditional wholesale replacement destroyed an operator's Progress notes twice in one session (field report, engine 2.1.49). Next Action bullet now cites SC-2.1's workflow-sensitive plan-complete rule. |
| 1.2.1 | 2026-07-10 | Agent | Traceability: §6 now cites the **C8 (Phase Archival)** convention it implements. No logic change (patch — Stable retained). |
| 1.2.0 | 2026-06-13 | Agent | Added §6 Phase Archival Eligibility (Precision): `allChecked` must match anchored checklist line items, not substring `- [ ]` in prose/code-spans. Field evidence: phase-10 (whose Notes discuss `- [ ]` detection) was silently skipped by the archiver (R7). |
| 1.1.0 | 2026-06-12 | Agent | Added §5 Session-Continuity Integration: SC-2 state update step (always-run, non-blocking) and SC-3 non-bumping commit suggestion fallback. |
| 1.0.0 | 2026-05-07 | Agent | Initial Stable version. Covers the scripts/lib/ finalization helper library introduced in v2.1.0. |
