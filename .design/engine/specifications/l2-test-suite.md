# Test Suite Specification

**Version:** 1.14.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Architecture and scenarios for validating the Magic SDD engine.

## Motivation

Maintain high reliability of the engine core through automated and cognitive regression testing.

## Components

- **magic.dev.simulate (Cognitive)**: The primary engine validation tool. Runs all scenarios in `dev/tests/suite.md` as a purely cognitive task — no physical scripts are created. The agent evaluates each test scenario internally against the engine workflow logic and reports PASS/FAIL/ROUGH EDGE.

## Cognitive Test Suite

`dev/tests/suite.md` is the canonical regression suite for the engine. Current state:

- **206 tests** (T01–T207; numbering gap at T67) covering all core workflows, guards, and edge cases.
- **Suite version**: v1.9.74.
- Tests are organized as H3 sections with `Synthetic State`, `Action`, `Expected`, and `Guards tested` fields.
- Sprint 1 regression tests (T86–T91) cover Runtime Guards: RE-1, RE-2, RE-3, RE-T71, RE-T74, and the T4/VERSION_DRIFT interaction.
- Post-sprint expansions (T92–T207) cover T4 tier routing, duplication checks, constitutional guards, atomic intent with drift resolution, C15 scope-isolated integrity checks, simulation-harness self-tests (T186–T192) — regression coverage for `magic.dev.simulate`, the developer-facing validation tool authorized under **C11 (Simulation Workflow, C2 exception)** — suite-to-workflow source-of-truth contracts (T203), diagram-text parity (T204–T205), and version-bleed / select-precedence wording parity (T206–T207).

## Script-Level Regression Harness

`dev/tests/engine.js` is the deterministic (non-cognitive) regression harness — Node's `node:test` runner exercising engine scripts against synthetic fixtures. It complements the cognitive suite: cognitive tests evaluate workflow *logic*, the harness pins script *behavior*.

**Finalize-pipeline coverage (mandatory):** because `scripts/finalize.js` is the single choke point for session-continuity (SC-2/SC-3 of `l1-session-continuity.md`), the harness MUST cover its non-trivial branches — any change to the finalize pipeline ships with a corresponding harness test:

- **SC-2 state patch** on both the significant path and the no-significant-change (skip) path — `STATE.md` is updated either way.
- **SC-2.1 plan-state-aware `Next Action`** — the plan-complete branch resolves to the `/magic.task` funnel, not "execute the active phase"; the open-tasks branch resolves to execution.
- **SC-2.1(a) Blocked-phase precedence** — a two-level-format phase fixture with `status: Blocked` frontmatter (or a `Blocked` `TASKS.md` registry row) and an open checklist item must not resolve to an execute-style `Next Action` naming the blocked task's ID. The regression that motivated this case had `Status: Blocked` and `## Blockers` populated in `STATE.md` while `Next Action` still recommended running straight into the blocker.
- **SC-2.2 provenance-free field** — the reserved-command screen is swept across the full *(workflow × plan state)* matrix, not one cell of it: no branch may emit `/magic.spec` or `/magic.analyze`, and every branch emits exactly one command. Pinning a single branch is what let the prior regression through.
- **SC-3 non-bumping commit suggestion** — significance miss + dirty tree emits exactly one labeled suggestion; no version bump, no CHANGELOG entry, no write-side git.
- **`update-state.js --auto-progress`** — the Progress block is recomputed from `TASKS.md`.
- **SC-2.3 progress granularity (two-level layout)** — `computeProgress()` against a `tasks/phase-{N}.md`-format fixture (no inline `### Phase {N} Checklist` in `TASKS.md`) must still produce a `Phase {N}: […]` counter line, not only the aggregate `Overall` line. The prior fixture set only ever exercised the legacy inline-heading format, so this gap was invisible to the existing coverage.
- **SC-1.1 Status field scope** — a per-task `update-state` call (`--task=`, no `--status=`) must leave the phase-level `Status` field unchanged. The regression that motivated this case passed `--status=Done` alongside `--task=` and the phase field became `Done` — a value outside its own documented vocabulary — after one task of a five-task phase completed.
- **Progress narrative preservation (over-classification)** — `computeProgress()`'s merge step, given a `## Progress` fence containing custom counter-shaped lines (e.g. `Specification: [3/3] complete`, `Plan: [1/1] complete`) alongside `Overall`/`Phase {N}`, must preserve the custom lines untouched and regenerate only `Overall`/`Phase {N}`. The prior fixture set never included a counter-shaped line under any label other than the two the engine itself emits, so a classifier matching on shape rather than exact label went unpinned.
- **Progress replacement-string injection** — `updateState()` with `autoProgress: true`, given a preserved narrative line containing a literal `$1`/`$2`/`$3` sequence (e.g. a dollar amount split across two lines), must leave that line byte-for-byte unchanged and must not change the fence's triple-backtick count. The prior fixture set never included a `$`-digit sequence in narrative content, so a string-form `.replace()` call silently splicing capture-group content into the narrative went unpinned — the most severe of the finalize-pipeline gaps found this session, since it corrupts markdown structure rather than only a value.
- **Non-whitelisted file visibility (SC-3.1)** — a `magic.run` fixture with one whitelist-matched change (`TASKS.md` status flip) plus one non-whitelisted change in the same working tree (e.g. a file under `dev/` or `.magic/`) must produce a suggested commit message and stdout `### Changed artifacts` section naming **both** files, while significance/version-bump/CHANGELOG category still key off the whitelist-matched file alone. The prior fixture set only ever varied files inside the whitelist, so `emitSuccess()`/`buildCommitMessage()` reusing the whitelist-filtered set for the file *listing* — instead of the full working-tree diff — went unpinned; confirmed against a real commit already on `master` where 15 of 17 actually-changed files were invisible in finalize's own output.
- **Line-cap guard exhaustion (SC-1.2)** — `updateState()` driven past 100 lines purely via repeated `addConstraint` calls, with `## Recent Decisions` pre-seeded at its 1-entry floor, must emit a warning distinguishable from the routine "one decision pruned" case — not the same log line reused when nothing was actually removed. The prior fixture set only ever grew `## Recent Decisions` toward the cap, so the guard's blind spot on unbounded `## Blocking Constraints` growth went unpinned; reproduced directly, a synthetic workspace with 60 accumulated constraints reached 110 lines with the guard reporting "pruning" on every call despite `## Recent Decisions` having nothing left to give.
- **RC-11 generator-containment contract** (`l1-sdd-reference-containment.md`) — `buildChangelogBullet('spec', …)`'s single-spec branch must not embed a spec's artifact ID in its return value; asserted directly against the function's output, not against the shipped CHANGELOG.md (which only a real invocation touches).
- **Diagnostics digest (DG-1..DG-9, `l1-engine-diagnostics.md`)** — the terminal block is the first finalize output whose *ordering across both exit paths* is itself the contract, so the mandate covers placement as well as content: `### Engine diagnostics` before `### Next step`, and `### Next step` last, on the significant path **and** the skip path; the printed next step byte-identical to the `Next Action` persisted in the same invocation; an empty sink rendering neither the digest heading nor its summary row while still printing the next step; drain returning each finding exactly once; identical findings collapsing with an occurrence count and a capped list stating its omissions; a truncated middle line in the sink costing only that line; and `record()` against an unwritable path returning without throwing. Full case list in [l2-engine-diagnostics.md](l2-engine-diagnostics.md) §6.

A finalize-pipeline change merged without harness coverage of the touched branch is a test-suite gap.

**Shipped-text contract coverage:** some engine behavior has no code at all — the SDD containment scan is a cognitive grep whose match classes are stated in prose, so the shipped prose *is* the implementation and can regress silently. Where that holds, the harness asserts the contract over the shipped text itself:

- **RC-2.1 notation independence** — `rules/magic.md`, `.magic/analyze.md`, and both containment role cards must state the notation-independent task-ID and phase patterns. Pinning the bracketed literal `[T-XXXX]` or the `phase-{n}` file form matches only the SDD layer's internal spellings; a reference leaks by being quoted out of them. This narrowing went unnoticed until a consumer project had accumulated 121 leaks.
- **Executor-parsable `--workspace` forms** — no shipped workflow body passes a directory to a flag that accepts a bare name.

## Canonical References

| Path | Role |
| --- | --- |
| `dev/tests/suite.md` | Cognitive regression test suite (206 tests, v1.9.74) |
| `dev/tests/engine.js` | Script-level regression harness (node:test); finalize-pipeline coverage mandate |
| `.agents/skills/magic-dev-simulate/SKILL.md` | Simulation skill that runs cognitive tests |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.14.0 | 2026-08-07 | Agent | Finalize-pipeline coverage mandate gained an eighth case: the **diagnostics digest** (new `l1-engine-diagnostics.md` DG-1..DG-9). Unlike the seven before it, this one pins *ordering across exit paths* as a contract in its own right — the digest must precede the next step, and the next step must be last, on both the significant and the skip path — because the terminal block moves out of the two path-specific emitters into one shared emitter precisely so the order cannot drift, and only a test can hold that. Also pins next-step/`STATE.md` string identity, empty-sink silence, exactly-once drain, dedup-with-count and cap-with-omission, partial-sink tolerance, and never-throws recording. Full case list delegated to `l2-engine-diagnostics.md` §6 rather than restated. |
| 1.13.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate gained a seventh case: **line-cap guard exhaustion (SC-1.2)** — a fixture driven past 100 lines via `## Blocking Constraints` growth alone, with `## Recent Decisions` already at its 1-entry floor, must produce a warning distinguishable from the routine one-decision-pruned case. Root cause: the line-cap guard's only pruning target is `## Recent Decisions`; once exhausted it keeps logging the same "pruning" message while `## Blocking Constraints` grows unbounded — reproduced directly, 60 accumulated constraints reached 110 lines. |
| 1.12.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate gained a sixth case: **non-whitelisted file visibility (SC-3.1)** — a fixture combining one whitelist-matched change with one non-whitelisted change must produce a commit message and stdout listing naming both, while significance stays scoped to the whitelist-matched file alone. Root cause: `emitSuccess()`/`buildCommitMessage()` reused the significance whitelist's filtered file set for the file *listing* shown to the user, not only for the version-bump decision it was designed for — confirmed against a real commit on `master` where 15 of 17 changed files were invisible in finalize's own output. |
| 1.11.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate gained a third case from a third field report (engine 2.1.58, reported informally): **Progress replacement-string injection** — a preserved narrative line containing a `$`-digit sequence must survive `autoProgress` untouched, with the fence's triple-backtick count unchanged. Root cause: `update-state.js`'s Progress-fence rewrite used a string-form `.replace()` against a capture-group regex, letting JavaScript's special replacement patterns re-interpret `$`-digit sequences inside unconstrained narrative text. |
| 1.10.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate gained two more cases from a second field report (engine 2.1.58): **SC-1.1 Status field scope** — a per-task `update-state` call must not touch the phase-level `Status` field; and **Progress narrative preservation** — hand-authored counter-shaped lines under labels other than `Overall`/`Phase {N}` must survive `computeProgress()`'s merge step, not be silently deleted by an over-broad shape-based classifier. |
| 1.9.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate gained two cases from one field report (engine 2.1.58): **SC-2.1(a) Blocked-phase precedence** — a Blocked two-level-format phase with an open checklist item must not yield an execute-style `Next Action`; and **SC-2.3 progress granularity** — `computeProgress()` must produce a per-phase counter for the canonical two-level task layout, not only the legacy inline-heading format the existing fixtures exclusively exercised. |
| 1.8.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate extended with **RC-11 generator-containment**: `buildChangelogBullet()`'s single-spec branch interpolated a spec's artifact ID into text written to root `CHANGELOG.md`, undetected because no prior mandate covered a generator's own return value (as opposed to the shipped-text contracts above, which cover prose an agent authors). Field report against engine 2.1.49. |
| 1.7.0 | 2026-08-06 | Agent | Added the **shipped-text contract coverage** mandate: where engine behavior has no code (the SDD containment scan is a cognitive grep, so its prose statement is the implementation), the harness asserts the contract over the shipped text. Pins RC-2.1 notation independence across rules/magic.md, .magic/analyze.md, and both containment role cards, plus the existing executor-parsable --workspace contract. |
| 1.6.0 | 2026-08-06 | Agent | Finalize-pipeline coverage mandate extended with SC-2.2: the reserved-command screen must be swept across the full (workflow x plan state) matrix rather than pinned on one branch, and the SC-2.1 plan-complete expectation restated as the `/magic.task` funnel. Pinning a single branch is what let the prior /magic.spec regression through. |
| 1.5.2 | 2026-07-10 | Agent | Traceability: the simulation-harness self-test description now cites the **C11 (Simulation Workflow)** convention that authorizes `magic.dev.simulate`. No logic change (patch — Stable retained). |
| 1.5.1 | 2026-07-10 | Agent | Reality sync: 157→206 tests (T01–T207, gap at T67), suite v1.9.45→v1.9.74; fixed stale body paths .magic/tests/suite.md → dev/tests/suite.md (Canonical References were already correct since 1.4.0); extended coverage description with T186–T207 classes (harness self-tests, source-of-truth contract, diagram parity, version-bleed/select-precedence parity). |
| 1.5.0 | 2026-06-13 | Agent | Documented `dev/tests/engine.js` script-level harness and added the finalize-pipeline coverage mandate (SC-2 patch both paths, SC-2.1 plan-state next-action, SC-3 non-bumping fallback, update-state --auto-progress). Closes the gap where finalize.js shipped session-continuity logic with zero harness coverage. |
| 1.4.0 | 2026-05-07 | Agent | Added header fields (Version/Status/Layer/Implements). Updated canonical paths: .magic/tests/suite.md → dev/tests/suite.md; .magic/simulate.md → .agents/skills/magic-dev-simulate/SKILL.md. |
| 1.3.0 | 2026-04-29 | Agent | Removed legacy distribution test-suite references after GitHub distribution migration. |
| 1.2.0 | 2026-03-20 | Agent | Reality sync: 91→157 tests (T01–T163), suite version v1.9.18→v1.9.45, added post-sprint expansion coverage. |
| 1.1.0 | 2026-03-04 | Agent | Clarified cognitive simulation as primary tool; documented suite state (91 tests, v1.9.18, RE-1–RE-T74 coverage). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version. |
