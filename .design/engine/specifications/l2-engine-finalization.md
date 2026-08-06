# Engine Finalization Library

**Version:** 1.4.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Internal helper library (`scripts/lib/`) that implements the finalization protocol — automatic version bumps, CHANGELOG entries, commit message suggestions, phase archival, and git utilities. These modules are invoked exclusively by `finalize.js` via `executor.js finalize`. The finalize pipeline is also the single choke point for the session-continuity guarantees SC-2 (post-workflow `STATE.md` update) and SC-3 (commit suggestion guarantee).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l1-session-continuity.md](l1-session-continuity.md) — SC-2/SC-3 invariants carried by the finalize pipeline (§5).
- [l2-engine-automation.md](l2-engine-automation.md) — Covers the top-level automation scripts that consume this library.

## 1. Motivation

The finalization protocol (§3 of `rules/MAGIC.md`) requires several coordinated writes across version files, CHANGELOG, and phase archives. Rather than embedding this logic in `executor.js`, it is decomposed into focused single-responsibility modules in `scripts/lib/`.

## 2. Library Modules

| Module | Responsibility |
| --- | --- |
| `changelog-writer.js` | Appends Keep-a-Changelog entries to root `CHANGELOG.md`. |
| `commit-suggester.js` | Generates Conventional Commits message from finalization context. |
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
- `Status` — recomputed from plan/task state (`Active | Blocked | Complete`).
- Progress indicators — phase and overall counters, when `TASKS.md` is present. The recompute **merges, never clobbers**: only counter lines (`Label: [done/total] …`, including template `{filled}/{total}` placeholders) inside the `## Progress` fence are engine-owned and replaced; any other line is treated as hand-authored session narrative and preserved below the fresh counters. Silently discarding the operator's Progress notes on a routine finalize is an SC-2 defect.
- `Next Action` — the computed next step (pipeline order per DA-6, plan-complete resolution per SC-2.1). The synthesized value is screened at the computation's single exit against SC-2.2: exactly one command, never `/magic.spec` or `/magic.analyze`. A screened-out value degrades to the `/magic.task` funnel with a warning — finalize is non-blocking and never aborts over a recommendation string.

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

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/lib/changelog-writer.js` | CHANGELOG append logic |
| `.magic/scripts/lib/commit-suggester.js` | Commit message generation |
| `.magic/scripts/lib/git-utils.js` | Read-only git helpers |
| `.magic/scripts/lib/phase-archiver.js` | Phase archival and TASKS.md rewrite |
| `.magic/scripts/lib/project-version.js` | `.design/.version` semver management |
| `.magic/scripts/lib/significance.js` | Significance whitelist evaluation |
| `.magic/scripts/update-state.js` | STATE.md patch utility invoked by the state update step (§5.1) |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.4.0 | 2026-08-06 | Agent | §5.1 `Next Action` bullet realigned to SC-2.2: the synthesized value is screened at the computation single exit (exactly one command; never `/magic.spec` or `/magic.analyze`), degrading to the `/magic.task` funnel with a warning rather than aborting. Supersedes the 1.3.0 wording that cited SC-2.1 workflow-sensitive rule, withdrawn in l1-session-continuity 1.3.0. |
| 1.3.0 | 2026-07-18 | Agent | §5.1 progress recompute contract hardened: counter lines are recomputed in place, non-counter lines inside the `## Progress` fence are preserved as hand-authored narrative (merge, never clobber). Field evidence: unconditional wholesale replacement destroyed an operator's Progress notes twice in one session (field report, engine 2.1.49). Next Action bullet now cites SC-2.1's workflow-sensitive plan-complete rule. |
| 1.2.1 | 2026-07-10 | Agent | Traceability: §6 now cites the **C8 (Phase Archival)** convention it implements. No logic change (patch — Stable retained). |
| 1.2.0 | 2026-06-13 | Agent | Added §6 Phase Archival Eligibility (Precision): `allChecked` must match anchored checklist line items, not substring `- [ ]` in prose/code-spans. Field evidence: phase-10 (whose Notes discuss `- [ ]` detection) was silently skipped by the archiver (R7). |
| 1.1.0 | 2026-06-12 | Agent | Added §5 Session-Continuity Integration: SC-2 state update step (always-run, non-blocking) and SC-3 non-bumping commit suggestion fallback. |
| 1.0.0 | 2026-05-07 | Agent | Initial Stable version. Covers the scripts/lib/ finalization helper library introduced in v2.1.0. |
