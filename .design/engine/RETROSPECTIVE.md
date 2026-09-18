# SDD Retrospective

**Last Full Run:** 2026-09-18
**Full Sessions:** 12
**Snapshots:** 25

## Snapshots

Auto-collected after each phase completion. Lightweight metrics only — no analysis.

| Date | Phase | Specs (D/R/S) | Tasks (Done/Blocked/Cancelled) | Rules | Signal |
| --- | --- | --- | --- | --- | --- |
| 2026-06-12 | Phase 6 | 0/0/22 | 7/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 7 | 0/0/22 | 6/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 4 | 0/0/22 | 10/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 5 | 0/0/22 | 7/0/0 | 24 | 🟢 |
| 2026-06-12 | Phase 8 | 0/0/24 | 6/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 9 | 0/0/24 | 4/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 10 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 11 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 12 | 0/0/24 | 2/0/0 | 24 | 🟢 |
| 2026-06-13 | Phase 13 | 0/0/24 | 3/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 14 | 0/0/27 | 11/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 15 | 0/0/27 | 11/0/0 | 24 | 🟢 |
| 2026-08-06 | Phase 16 | 0/0/27 | 5/0/0 | 24 | 🟢 |
| 2026-08-07 | Phase 17 | 0/0/28 | 7/0/0 | 24 | 🟢 |
| 2026-08-07 | Phase 2 | 0/0/32 | 3/0/0 | 24 | 🟢 |
| 2026-08-13 | Phase 22 | 0/0/32 | 5/0/0 | 24 | 🟢 |
| 2026-08-22 | Phase 23 | 0/0/32 | 7/0/0 | 24 | 🟢 |
| 2026-08-22 | Phase 24 | 0/0/32 | 7/0/0 | 24 | 🟢 |
| 2026-08-22 | Phase 25 | 0/0/32 | 3/0/0 | 24 | 🟢 |
| 2026-08-27 | Phase 26 | 0/0/32 | 5/0/0 | 24 | 🟢 |
| 2026-08-28 | Phase 27 | 0/0/33 | 10/0/0 | 24 | 🟢 |
| 2026-08-28 | Phase 28 | 0/0/33 | 7/0/0 | 24 | 🟢 |
| 2026-09-13 | Phase 29 | 0/0/33 | 4/0/2 | 24 | 🟢 |
| 2026-09-17 | Phase 30 | 0/0/33 | 5/0/0 | 24 | 🟢 |
| 2026-09-17 | Phase 31 | 0/0/33 | 6/0/0 | 24 | 🟢 |

## Session 1 — 2026-06-12

**Scope:** Plan completion (Phases 4-7 executed in one cycle; Phases 2-3 pre-existing)
**Specs in registry:** 22 (all Stable)
**Tasks total:** 30 this cycle (Done: 30, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 4 phases / session | Manual | Engine 2.1.30 → 2.1.34, one C14 bump per phase |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 12/12 green after every phase |

### 📊 Observations

| # | Severity | Area | Observation | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | ✨ Positive | Spec quality | 30/30 tasks executed without spec revision mid-run — specs were executable as written; Signal reflects spec precision, not just throughput | 0 Blocked, 0 amendment round-trips during run phases |
| 2 | 🟡 Medium | Engine meta | Per-phase C14 bumps caused 3 engine-snapshot drifts in one session; each required a focused-scan snapshot update | `.magic/.version` 2.1.31/32/33/34 vs `.design/INDEX.md` snapshot churn |
| 3 | 🟡 Medium | Tooling | Edit-tool write-replace breaks the `rules/` ↔ `.agents/rules/` hardlink on every edit; recovery is manual (recreate + validate) | 3 hardlink recreations this session; constraint recorded as STATE.md C-001 |
| 4 | ✨ Positive | Governance | RC-9 recursion catch: the containment policy applied to itself exposed 15 latent leaks in shipped engine files | Shipped self-containment phase inventory |

### 💡 Recommendations

| # | Refs Observation | Recommendation | Target File |
| --- | --- | --- | --- |
| R1 | #2 | Batch multiple phases per engine release cycle, or update the snapshot once per session tail rather than per phase | `.magic/analyze.md` (snapshot contract) |
| R2 | #3 | Add a hardlink-repair step to the sync pipeline so broken `rules/` links self-heal instead of warn-only | `dev/scripts/sync.js` |
| R3 | #4 | Add a containment grep to the engine test harness so leak regressions fail CI, not just ventilation | `dev/tests/engine.js` |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 21 | 22 | +1 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 2 — 2026-06-12

**Scope:** Plan completion (Phase 8 — Session Continuity & Status Command; single-phase cycle from field directive to deployment)
**Specs in registry:** 24 (all Stable)
**Tasks total:** 6 this cycle (Done: 6, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24

### 🚀 DORA Metrics (L2 Implementation)

Manual input / external hook still required — same gap as Session 1.

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | Bootstrapped inventory specs drift from disk truth: the wrapper spec claimed a `.magic/graph.md` body that never existed; survived from v1.0.0 until the Phase 8 inventory sync touched the same table. | l2-workflow-wrappers.md 1.1.1 factual fix |
| 2 | C-001 (hardlink breakage on `rules/*.md` edits) fired exactly as documented and was repaired by the recorded procedure — the Blocking Constraints section pays for itself. | validate-hardlinks pass after recreate |
| 3 | No shadow logic: SC-2/SC-3 and the status command were spec-first (Stable before implementation); registry clean (check-prerequisites: 0 warnings). | Phase 8 task `Changes` fields |
| 4 | Engine snapshot drift (2.1.34 → 2.1.37) is pending §1 ratification — known mechanism, not a registry inconsistency; status command now reports it informationally. | `.magic/.version` vs `.design/INDEX.md` |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R4 | #1 | Add a wrapper-inventory parity check (workflows/ directory listing vs wrapper-spec structure table) to ventilation so phantom mappings fail the audit | `.magic/analyze.md` (Mode C) |
| R5 | #3 | Extend the engine harness with a finalize skip-path test (SC-2 state patch + SC-3 non-bumping suggestion) — current 12 tests do not cover finalize | `dev/tests/engine.js` |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 22 | 24 | +2 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 3 — 2026-08-13

**Scope:** Plan completion (Phase 22 — field-report triage: `DESIGN_DEBT_PENDING` structural predicate, Mode C Depth Control bypass, Project-auditor citation; single-phase cycle from three externally-submitted bug reports to deployment via `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 32 (all Stable; 4 amended this cycle — l1-session-continuity.md, l2-engine-automation.md, l1-engine-core.md, l2-role-cards-governance.md)
**Tasks total:** 5 this cycle (Done: 5, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged — no new convention needed)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.71 → 2.1.72, single C14 bump for the whole phase (three file-independent-enough tracks batched under one tag) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 64 → 65, green throughout |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | The `DESIGN_DEBT_PENDING` gate's plan-complete predicate had a second, distinct failure mode beyond the one Phase 21 closed: literal-marker matching against `## Active Phases` can never succeed again after any archival under the canonical single-table `tasks.md` template, independent of the Backlog counting fix. Two defects sharing one symptom (`DESIGN_DEBT_PENDING` silent) were fixed two phases apart because they were only found two phases apart. | l2-engine-automation.md §DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate |
| 2 | This engine's own `TASKS.md` and its `dev/tests/engine.js` fixtures both encode a `## Completed Phases` split that no shipped script (template, archiver, or otherwise) has ever produced — regression coverage was unknowingly scoped to a shape the shipped contract doesn't generate, which is exactly why Finding 1 shipped unnoticed for 21 phases. | grep across `.magic/` for "Completed Phases": zero hits outside `.design/engine/TASKS.md` and the pre-existing test fixtures |
| 3 | A Core Invariant framed as "mandatory" (Depth Control) was in practice never wired into Mode C's step list at all — only into the Shared Pre-flight for Modes A/B. The ambiguity the field report flagged was real at the text level but the runtime behavior it worried about (Mode C HALTing) could not actually have occurred; the fix closed the textual contradiction, not a live behavioral bug. | `.magic/analyze.md` line 117 scoped to `### Shared Pre-flight (Modes A & B)`; Mode C's own step list starts at "1. Self-Check" |
| 4 | All three bug reports arrived pre-triaged with exact file/line citations and reproduction evidence (external field reports, not this session's own discovery) — investigation time went to confirming reproduction against current HEAD and designing the fix, not locating the defect. | Bug reports cited engine 2.1.71 line numbers that matched HEAD at investigation time for all three |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R14 | #2 | Reconcile this engine's own `TASKS.md` to the canonical single-table template (drop the undocumented `## Completed Phases` split) so the workspace's own regression posture matches what it ships to users — currently the fixed defect cannot be observed on this repo's own dogfood copy | `.design/engine/TASKS.md` (operational cleanup, not a spec change) |
| R15 | #1 | When a `Required Fix` closes one failure mode of a named symptom (e.g. `DESIGN_DEBT_PENDING` silent), the amending spec should explicitly state what the fix does *not* cover, to reduce the odds of a second field report against the same symptom being mistaken for a duplicate | `l1-session-continuity.md` / spec.md authoring convention |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 28 (last consistently-logged snapshot, Phase 17) | 32 | +4 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 4 — 2026-08-22

**Scope:** Plan completion (Phase 23 — Next-Action Task-Level Precedence & Decision-Prune Honesty; single-phase cycle from one externally-submitted bug report to deployment via `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 32 (all Stable; 2 amended this cycle — l1-session-continuity.md, l2-finalize-state-accuracy.md, the latter twice: once for the §9/§10 required-fix authorship, once more in-phase for the §12 stale-claim correction)
**Tasks total:** 7 this cycle (Done: 7, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged — no new convention needed)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.72 → 2.1.73, single C14 bump for both file-independent tracks (`finalize.js`, `update-state.js` + template) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 65 → 66, green at every checkpoint after the two implementation bugs below were caught and fixed pre-Done |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | A regex lookahead intended as "end of string or next heading" used bare `$` under the `m` flag — which matches before *any* newline, not only true end-of-string. The Detailed Tracking block-extraction regex hit this exactly: the section's own blank line right after the heading satisfied `$`, collapsing the non-greedy capture to empty on every call. First `repro-a.js` run against the newly-edited code showed the defect *unchanged* — the fix silently no-op'd rather than erroring, which is the more dangerous failure shape (a loud crash would have been caught immediately; a silent no-op required re-running the exact reproduction that motivated the spec to notice nothing had changed). | `.magic/scripts/finalize.js` `isTaskExcluded()`; fixed with `(?![\s\S])`, a flag-independent end-of-string assertion |
| 2 | A harness assertion realignment (T-23T02) introduced a plural-agreement typo ("is dropped" vs. the code's "entries **are** dropped") that was visually indistinguishable from correct on a side-by-side read — the surrounding text matched exactly, only the verb form differed. `RegExp.test()` correctly failed; a human skim of the diff would very plausibly not have. | `dev/tests/engine.js`; caught by running the harness immediately after the edit, not by re-reading the diff |
| 3 | Both bugs above were caught **because** every implementation step in this phase ran its own verification immediately (a standalone reproduction script or the full harness) rather than deferring all verification to the phase-end test track (T-23T01-T03). Had verification been batched to the end, both defects would have surfaced together, harder to attribute to a specific task. | Task-by-task `Changes` fields in `tasks/phase-23.md` each cite their own verification run, not a shared end-of-phase one |
| 4 | Fixing a defect can stale-date a spec's own status prose in the same motion: implementing §9/§10 immediately falsified the Overview's "not yet implemented" claim for both, and doing so surfaced that §12's "§8's coverage obligation is open" claim was *already* false before this phase started (Phase 19 had closed it, months earlier, and nothing had corrected the sentence). T-23C01 closed both in one factual-accuracy patch — but only because planning happened to route a spec-accuracy task through the same phase; nothing structural catches this class otherwise. | `l2-finalize-state-accuracy.md` 1.1.0 → 1.1.1, Document History row |
| 5 | The field report's own citation ("Blocked (C12)") named the wrong mechanism — C12 is spec-status quarantine, not task-level Blocked/Assignment — but the underlying technical claim was fully correct and reproduced on the first attempt. Imprecise field-report terminology did not cost investigation time here because the spec-authoring session verified the mechanism directly against source rather than trusting the citation. | `l2-finalize-state-accuracy.md` §9, "the report's parenthetical citation is imprecise" framing carried from spec authoring |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R16 | #1, #2 | When a spec's own `Required Fix` section includes a literal regex or string as part of the fix (not only as defect evidence), the authoring pass should test that literal against a real fixture before publishing — both bugs this phase were in code written *from* the spec's prose, not defects the spec described, and neither would have existed if the spec's own illustrative snippets had been execution-checked at authoring time | `spec.md` §Post-Update Review (add a fixture-check sub-step for specs whose `Required Fix` includes literal patterns) |
| R17 | #4 | Extend the Phase Completion checklist with an explicit "does this phase's fix falsify prose elsewhere in the same spec file (Overview, other sections' status claims)?" check, rather than relying on it being noticed incidentally | `run.md` Step 5 (Phase Completion) |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 32 | 32 | 0 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 5 — 2026-08-22

**Scope:** Plan completion (Phase 24 — Dev-Repo Engine-Version Snapshot Sync; single-phase cycle from a user-raised design observation to deployment via `/magic.spec` → `/magic.task` → `/magic.run`, plus an in-phase regression fix the phase's own planning run surfaced)
**Specs in registry:** 32 (all Stable; 1 amended this cycle — l1-engine-core.md, 1.5.0 → 1.6.0)
**Tasks total:** 7 this cycle (Done: 7, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged — `rules/magic.md` §1 amended, no new C-numbered convention)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.73 → 2.1.74, single C14 bump covering both `.magic/` tracks (A: `update-engine-meta.js`; C: `finalize.js`) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 66 → 68, green at every checkpoint after each in-flight bug was caught and fixed |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | This phase's own genesis was a user observation, not a field report or a HALT — the first time this session that planning began from "does this design still make sense" rather than a reproduced defect. The existing Parked backlog item (2026-06-12) supplied the prior art; the design work was confirming scope (dev-repo-only, consumer contract untouched) and picking an implementation shape, not discovering a problem. | User message: "логично мне кажется... для этого проекта... для проектов где используется наш sdd — всё по старому" |
| 2 | **A spec's own Required Fix was under-specified about *where* code should live**, and the gap was real: the spec named `update-engine-meta.js` as the call site (correct) but said nothing about the file write's own placement. Resolved at plan time by applying `AGENTS.md` §2.1's L1→L2 exception literally — delegation via a new dev script, not inlined L1 logic — the same reasoning that placed `generate-checksums.js` and `update-project-meta.js` in `dev/scripts/` earlier in this project's history. Worth a general note: Required Fix blocks name *what* changes and *why*; *where inside the layer boundary* is a plan-time judgment this project has now made consistently three times without it ever being written down as a rule. | l1-engine-core.md §Known Process Gaps Required Fix item 1; `AGENTS.md` §1.3 Classification Algorithm cited directly at plan time |
| 3 | **A live regression was found by the planning run's own tooling, not by review.** T-24A01's task title contained a backticked path; the very first `finalize --workflow=task` this phase ran printed it with the span blanked. The defect was in code this same session had written one phase earlier (Phase 23's SC-2.1(c) scan) — a hardening added for one reason (SH-1 quoted-text exposure) reached one step further than its own justification supported (using stripped text for *display*, not only *detection*). Folded into the same phase rather than deferred, on the grounds that it needed no design input and the phase already bumped C14. | Live `finalize` stdout: `Execute T-24A01 New  (L2 snapshot writer) via /magic.run engine`; root-caused and fixed same session |
| 4 | **Two more bugs surfaced in the *regression tests themselves*, not the fixed code**, both from stdout/stderr stream confusion: `console.warn` output (used for every "skipped, dev-only" diagnostic in this codebase) writes to stderr, and `execSync`'s return value is stdout only. A test asserting against that return value can silently miss the exact warning it was written to pin, passing or failing for the wrong reason depending on what else the assertion happens to check. Neither existing test in this suite that captures `execSync` output for a *successful* (exit-0) run had needed to see stderr before — the failure-path helper (test 5a) already merges `e.stdout + e.stderr`, but only reachable when the command throws. | `dev/tests/engine.js` — the new dev-repo/consumer test initially failed with the exact correct behavior already in place, diagnosed by comparing captured stdout against the real console.warn call site |
| 5 | **Every new engine change this phase was negative-controlled via `git stash`** on the single relevant source file — confirmed each new test actually fails against pre-fix code before restoring. This is now the fourth consecutive phase using this exact technique (Phase 19 R12 introduced it; Phase 23 and 24 both reused it without re-deriving it). Worth naming as an established practice rather than re-discovering per phase. | T-23T01/T-24C02/T-24T01, each with an explicit stash/run/pop sequence in their `Changes` fields |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R18 | #2 | Record the L1→L2 placement judgment as a named, reusable step in the planning workflow (`task.md` or the L1→L2 Classification Algorithm itself) rather than re-deriving it from first principles each time a Required Fix under-specifies file placement | `.magic/task.md` or `AGENTS.md` §1.3 |
| R19 | #4 | When a new harness case captures `execSync` output from a command expected to emit a diagnostic on a non-fatal branch, default to `2>&1` unless the assertion is specifically about stdout-only content — the stdout/stderr split is a recurring silent-failure shape, not a one-off | `dev/tests/engine.js` authoring convention (no code change; a note for future test authors) |
| R20 | #5 | Formalize the stash-negative-control technique as a named step in `run.md`'s QA Review (3.5), since it is now used consistently but only exists as inline practice across three phases' task files | `.magic/run.md` §3.5 |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 32 | 32 | 0 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 6 — 2026-08-22

**Scope:** Plan completion (Phase 25 — CHANGELOG Dedup Discoverability Hint; single-phase cycle from an externally-submitted bug report to deployment via `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 32 (all Stable; 1 amended this cycle — l2-finalize-output-contract.md, 1.1.0 → 1.2.0)
**Tasks total:** 3 this cycle (Done: 3, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.74 → 2.1.75, single C14 bump (`.magic/scripts/finalize.js` the only touched file) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 68 → 69, green at every checkpoint; the new test's own negative control failed correctly against pre-fix code |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **A field report can correctly diagnose the symptom while proposing a remedy this project has already ruled out.** The report reproduced the real §4.1 vocabulary-exhaustion defect accurately, but its suggested fix (interpolate a task/phase identifier into the bullet) is exactly what RC-11 and §4.4 constraint 1 already forbid — settled two spec versions earlier in this same file. Triage had to re-derive that prohibition from the spec's own text before accepting or rejecting the report's hypothesis, rather than implementing it as submitted. | l2-finalize-output-contract.md §2 (RC-11), §4.4 constraint 1, §4.5 |
| 2 | **A shipped remedy (`release-changelog.js`, Phase 20) had zero live-CLI regression coverage for four phases** — every existing CHANGELOG-related test either asserted `buildChangelogBullet()`'s return value directly or ran against `createFinalizeFixture()`'s default `autoChangelog: false`, so the actual write branch inside `finalize.js` (`if (config.autoChangelog...)`) had never been exercised through a real `execSync` invocation in this harness. The gap was invisible until a test needed to observe the *stdout row*, not just the *file write*. | `dev/tests/engine.js` — new §4.5 test is the first to pass `autoChangelog: true` to `createFinalizeFixture()` |
| 3 | **Smallest and fastest phase of this session's run** — a single literal-string replacement with no design fork, no [C-001]-class hardlink risk, no cross-workspace concerns. Confirms the pipeline's fixed overhead (spec dispatch, plan write-back, retro, C14) dominates cycle time for a fix this size, not the implementation itself. | 3 tasks total vs. 7 for each of Phases 23/24 |
| 4 | **Self-referential proof, one workflow stage earlier than usual.** Phase 24's regression was caught by its own `/magic.task` finalize output; this phase's *underlying defect* was caught by its own `/magic.spec` finalize output — the dispatch that authored §4.5 itself hit the exact deduped-without-hint condition live (`CHANGELOG \| skipped (duplicate)`, no remedy named), recorded via `record-diagnostic` before the fix existed. The engine's own operation is proving to be a reliable source of test cases for its own diagnostics-surface defects. | `record-diagnostic` call, code `CHANGELOG_DEDUP_HINT_MISSING`, emitted during this phase's own `/magic.spec` finalize |
| 5 | **Stash negative-control, fifth consecutive use.** Continues without re-derivation from Phase 19 R12's introduction through Phases 23, 24, and now 25 — confirms R20's premise that the technique is now load-bearing practice, not a one-off. | T-25T01's `Changes` field: stash/run/pop sequence, captured `actual` output from the pre-fix run |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R21 | #2 | When a test-fixture helper defaults a feature flag to off (e.g. `createFinalizeFixture()`'s `autoChangelog: false`), periodically grep for whether *any* test in the suite ever passes the true value — a spec's regression-coverage bullet can name a function correctly while the actual code branch it gates stays permanently unexercised | `dev/tests/engine.js` authoring convention / `l2-test-suite.md` coverage mandate |
| R22 | #1 | When triaging an externally-submitted bug report, check its proposed remedy against this project's own already-ratified constraints (RC-11, layer boundaries, prior `Required Fix` constraints in the same spec) before accepting it — the report's diagnosis of the symptom and its proposed fix are separate claims with independent evidence bars | `.magic/spec.md` dispatch guidance (informational; no code change) |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 32 | 32 | 0 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 7 — 2026-08-27

**Scope:** Plan completion (Phase 26 — Commit-Suggestion Feature Removal; single-phase cycle from explicit user directive to deployment via `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 32 (all Stable; 8 amended this cycle in the `/magic.spec` pass that preceded planning — l1-session-continuity.md 1.11.0 → 2.0.0, l2-engine-finalization.md 2.0.0 → 3.0.0, l2-finalize-output-contract.md 1.2.0 → 2.0.0, l2-finalize-state-accuracy.md 1.1.1 → 1.1.2, l2-status-command.md 1.0.0 → 1.1.0, l2-test-suite.md 1.14.0 → 1.15.0, l1-engine-diagnostics.md 1.0.0 → 1.0.1, l2-engine-diagnostics.md 1.0.0 → 1.1.0)
**Tasks total:** 5 this cycle (Done: 5, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.75 → 2.1.76, single C14 bump covering all three touched `.magic/` files |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness green at 68/68 after the phase; one spacing regression caught and fixed during T-26B01 implementation itself, before any Done transition — never reached a test run as a failure |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **First "retire a whole guarantee" phase in this plan's history, not a bug fix.** Every prior phase this session added or corrected behavior; this one deleted an entire invariant (SC-3) end-to-end — spec, code, config, and tests — with the design question already closed before planning began. The `/magic.spec`/`/magic.task`/`/magic.run` shape held unchanged for a removal, not only additions. | Full session arc: one `/magic.spec` retiring 8 specs, one `/magic.task` planning Phase 26, one `/magic.run` executing it |
| 2 | **The `DESIGN_DEBT_PENDING` graduation pattern (Phases 20/21/25) generalizes to code-removal work, not only new-remedy work.** The Backlog item this session's own `/magic.spec` pass authored ("no design decision remains") re-triggered the gate on the next `/magic.task`, and graduated straight into a phase exactly as the three prior precedents did — confirming the pattern is about *design-completeness*, not about the nature of the work being planned. | PLAN.md Backlog closure note; `[DR]` resolution recorded in the `/magic.task` turn |
| 3 | **A deletion is not always a pure subtraction — downstream formatting can be implicitly anchored to the removed block.** `finalize.js`'s `emitTail()` used the (now-retired) unconditional auto-commit notice as its de-facto blank-line spacing anchor for the diagnostics digest and next-step sections; a literal deletion of just the notice lines would have produced a double-blank-line regression between those two sections when both were present. Caught by reasoning through the join/blank-line arithmetic during implementation, not by a later harness failure — the existing test suite had no assertion pinning inter-section spacing at all. | `.magic/scripts/finalize.js` `emitTail()`, rewritten to join present blocks with single `\n\n` separators instead of per-block leading/trailing blanks |
| 4 | **First net-negative harness count in this plan's recorded history.** Every prior phase snapshot in this table grew the test count (or held flat); this phase went 69 → 68 because a whole capability's dedicated unit test (`buildCommitMessage`) was deleted along with the function it tested, not superseded by a replacement. A shrinking count is not itself a regression signal when it traces to a real capability removal — worth naming so a future retro does not read a headline drop as a coverage loss without checking why. | `dev/tests/engine.js`: `'buildCommitMessage derives the header...'` test removed in T-26T01, no replacement added |
| 5 | **Self-referential proof, third consecutive session.** Before T-26A01/B01 landed, this same phase's own `finalize --workflow=task --dry-run` printed a "Suggested commit message" block in its stdout; after, the identical command's output contained zero case-insensitive matches for "commit" outside the task's own title. The tool demonstrated its own retirement live, continuing the pattern Phase 24 (Finding 3) and Phase 25 (Finding 4) each independently established. | Dry-run smoke test in T-26B01's `Changes` field, before/after comparison |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R23 | #3 | When a task removes a block that other output-formatting logic (spacing, ordering, delimiters) implicitly depends on being unconditionally present, treat the removal as a redesign of the dependent logic, not a pure deletion — add a harness case pinning inter-section spacing/ordering wherever a shared terminal-block function like `emitTail()` composes multiple optional parts | `l2-test-suite.md` coverage mandate (a general authoring note, not a new invariant) |
| R24 | #4 | When a retro snapshot shows a harness count *decrease*, the retro should state the traced cause (capability removed vs. coverage regression) inline in the Snapshots-adjacent Finding, rather than leaving a bare number for a future reader to have to investigate | `retrospective.md` §6 (L1 Snapshot Execution), informational |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 32 | 32 | 0 |
| Blocked task rate | 0% | 0% | 0 |
| Signal | 🟢 | 🟢 | → |

## Session 8 — 2026-08-28

**Scope:** Plan completion (Phase 27 — Idea Intake Gate Deployment, E6; single-phase cycle from an explicit owner directive through `/magic.spec` → `/magic.task` → `/magic.run`)
**Specs in registry:** 33 (all Stable; 1 new — l1-idea-intake-gate.md 1.0.0 — and 3 amended: l1-decision-autonomy.md 1.2.0 → 1.3.0, l2-role-cards-governance.md 1.1.1 → 1.2.0, l2-test-suite.md 1.15.0 → 1.16.0)
**Tasks total:** 10 this cycle (Done: 10, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged count; C27 amended, RULES 1.9.0 → 1.10.0)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.78 → 2.1.79, one C14 bump over 70 files, `--workflow magic.spec` |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; harness 69/69; two engine defects surfaced during the bump and were repaired in-cycle before phase close, neither reaching a Done transition as a failure |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **First phase to widen a rule the engine was built to enforce, rather than fix or extend one.** C27 was authored from this same owner's complaint that the agent halts sessions with unanswerable surveys; this phase adds a sanctioned question channel to it. The two are consistent only because they address different fork classes — C27 forbids the agent to outsource *its own* decisions, while E6 recovers information that exists only in the requester's head — and the reconciliation had to be written into the constitution itself (the DA-1 containment paragraph) rather than left implicit. | `l1-decision-autonomy.md` 1.3.0 DA-2 containment note; `.design/RULES.md` 1.10.0 C27 narrowing blockquote |
| 2 | **The spec's own deployment table under-counted its reconciliation sites by one, and planning caught it.** §5 listed Core Invariant 12 and the Ambiguity constraint; a third contradicting clause sat at `.magic/spec.md` Mode Transition — `Auto-Transfer`'s *"never stall on a 2nd 'are you sure?' cycle"*, a hard one-round cap directly against IK-6's uncapped convergent dialogue. Spec authorship reasons about the concept; planning greps the surface. The Planning Audit is where that gap closes, and it closed here. | Phase 27 PLAN.md entry "Reconciliation, not addition"; T-27A02 `Changes` |
| 3 | **An uncapped dialogue needs a termination proof, and the first draft did not have one.** IK-6 originally read "a round is convergent if the reply removes at least one open question" — which admits a round closing one and opening two, i.e. a non-terminating loop. The Post-Update Review's Safety & Boundary lens caught it during authoring, and the rule was tightened to strict shrink of the open set, yielding a finiteness argument (bounded by the initial question count) without reintroducing the round counter the owner had explicitly rejected. A constraint the owner removes must be replaced by an equivalent guarantee, not simply dropped. | `l1-idea-intake-gate.md` 1.0.0 Document History; IK-6 clause 2 and its closing paragraph |
| 4 | **A hardlink pair the engine depends on for correctness is guarded by nothing.** `workflows/*.md` are per-file hardlinks to `.agents/workflows/*.md`, and `sync-skills` generates the shipped skill wrappers from the `.agents/` side — yet `validate-hardlinks.js` checks only the AGENTS family and `rules/`, and the `[C-001]` Blocking Constraint text names only `rules/*.md`. The T-27D01 wrapper edit delinked the pair, and C14 shipped a wrapper built from pre-edit content while every integrity check reported success. The `[C-001]` verification ritual worked perfectly where it was defined and was silent one directory over. | Generated `SOURCE:` header read `.agents/workflows/magic.spec.md`; `grep -c intake skills/magic-spec/SKILL.md` = 0 after a green C14 run; diagnostic `WORKFLOWS_HARDLINK_UNGUARDED` |
| 5 | **The obvious repair was itself blocked by a second defect.** Re-running `update-engine-meta` after restoring the link reported *"No changes detected in engine core"* and skipped skill regeneration entirely — its change detection reads `.magic/` checksums only, and the outstanding change lived in `workflows/`. The two defects compose into a silent-failure pair: the first ships stale output, the second refuses to re-ship correct output. Resolution required calling `sync-skills` directly, outside the C14 path. | Diagnostic `C14_SKIPS_WORKFLOWS_ONLY_CHANGE`; T-27T02 `Changes` |
| 6 | **A recorded metric had drifted unnoticed for a full cycle.** `l2-test-suite.md` claimed 206 tests at v1.9.74 while the suite file stood at v1.9.75 with T208 present — T208 shipped during the rule batch-precedence work without a spec sync. The drift surfaced only because this phase touched the same fields. Bookkeeping fields that no check validates decay silently between the phases that happen to read them. | `l2-test-suite.md` 1.16.0 history row; suite header v1.9.75 vs. spec's recorded v1.9.74 |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R25 | #4 | Extend `validate-hardlinks.js` with a third group covering `workflows/` ↔ `.agents/workflows/`, and widen the `[C-001]` Blocking Constraint text from "`rules/*.md` (or any AGENTS-family anchor)" to every linked pair the repository maintains — the constraint's value is entirely in naming the paths it protects | `dev/scripts/validate-hardlinks.js` + `STATE.md` `[C-001]`; route via `/magic.task engine` |
| R26 | #5 | Either include `workflows/` in `update-engine-meta`'s change-detection scope, or run `sync-skills` unconditionally on every bump — it is idempotent, so the checksum verdict buys nothing and costs a silent stale-wrapper release | `.magic/scripts/update-engine-meta.js`; route via `/magic.task engine` |
| R27 | #6 | When a spec records a count or version of an artifact it does not own (test totals, file counts, suite versions), the phase that changes that artifact should sync the recording spec in the same task — or the figure should be generated rather than transcribed | `l2-test-suite.md` authoring note; informational |
| R28 | #3 | When an owner decision removes a bound (a cap, a limit, a budget), the resolving spec must supply a replacement guarantee and state its termination or safety argument explicitly — "uncapped" is a requirement, not a design | `spec.md` Post-Update Review, Safety & Boundary lens; informational |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 32 | 33 | +1 |
| Cognitive suite tests | 207 (T208 present, unrecorded) | 211 | +4 |
| Script harness tests | 68 | 69 | +1 |
| Blocked task rate | 0% | 0% | 0 |
| Engine defects found in-cycle | 0 | 2 (both recorded, neither fixed) | +2 |
| Signal | 🟢 | 🟡 | ↓ |

> Signal downgraded to 🟡 on the two open engine defects (R25, R26), not on phase execution — Phase 27 itself closed clean at 10/10. Both are silent-failure class: the integrity tooling reported success while shipping stale output. They are the strongest candidate scope for the next phase.

## Session 9 — 2026-08-28

**Scope:** Plan completion (Phase 28 — Silent-Failure Pair: Link Coverage & Regeneration Trigger; single-phase cycle graduated directly from this retrospective's own R25/R26, no `/magic.spec` pass — both remedies were concrete at recording time)
**Specs in registry:** 33 (all Stable; unchanged count — 2 amended: `l2-agent-surface.md` 1.0.1 → 1.1.0, `l2-skill-wrappers.md` 1.3.0 → 1.4.0 — plus `l2-test-suite.md` 1.16.0 → 1.17.0 for harness coverage)
**Tasks total:** 7 this cycle (Done: 7, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged)
**Graph:** 194 → 200 nodes (+6), 384 → 401 edges (+17); engine-workspace coverage held at 100%; 0 orphaned files, 0 missing `Implements`, 0 convention orphans (`diff-spec-graph` against the Phase 27 baseline)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.79 → 2.1.80, single C14 bump (no `--workflow` tag — only `update-engine-meta.js` fell inside `.magic/`) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; a JS-comment syntax bug (see Finding 3) was caught by `node -c` before any task reached Done; all three new harness cases were negative-controlled — run against reverted/pre-fix code and confirmed to fail — before being confirmed green against the fix |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **A retrospective recommendation is a hypothesis, not a settled design — planning still has to check it against source.** R26 as recorded offered two options as equivalent ("widen checksum scope" vs. "decouple the trigger"); reading `update-engine-meta.js` during planning found an inline comment documenting that `workflows/`/`skills/`/`rules/` are excluded from the checksum manifest **on purpose**, to keep partial installations working. Widening it would have silently broken that contract to fix a reporting bug. The retrospective's own two-option framing would have let the executing agent pick either — this is the first phase where a retrospective-authored recommendation was narrowed by verifying against the code before execution, rather than implemented as recorded. | Phase 28 PLAN.md entry, `[DR]` "The fix binds the trigger, not the manifest"; `update-engine-meta.js` lines 58-60 |
| 2 | **DESIGN_DEBT_PENDING-free graduation now covers retrospective-sourced items, not only spec-authored ones.** Phases 20/21/25/26 established the pattern for Backlog items whose design question a preceding `/magic.spec` pass had already closed; this phase is the first to graduate directly from `RETROSPECTIVE.md` recommendations with **no** `/magic.spec` pass at all — both R25 and R26 were concrete enough at recording time that planning could write their governing spec sections itself. | Phase 28 PLAN.md entry, "Graduated directly from the retrospective (not via `/magic.spec`)" |
| 3 | **A doc-comment path example containing a literal `*/` silently truncates a JS block comment.** Writing `` `skills/*/SKILL.md` `` inside a `/** ... */` doc comment produces the character sequence `*/`, which JavaScript reads as the comment's own terminator — everything after it on that line becomes live code, and `node -c` failed with `SyntaxError: Unexpected identifier 'skills'`. Caught immediately (before any test ran, before the task was marked Done) by reflex-checking syntax after the edit; fixed by rewording to `skills/{name}/SKILL.md`. Worth naming as a class: any doc comment describing a path pattern with a bare `*` glob immediately before a `/` risks this, and the fix is always a wording change, never an escape sequence (JS comments have none). | `dev/scripts/validate-hardlinks.js`, T-28B01 `Changes` field |
| 4 | **`fs.writeFileSync()` does not reproduce a broken hardlink on Windows/NTFS — only unlink-then-write does.** Verified via a throwaway reproduction before writing any test fixture: overwriting a hardlinked file in place rewrites through the shared inode (both link paths show the new content, same inode), while deleting and recreating the file produces a genuinely different inode. Every negative-control fixture in this phase's three new harness cases uses unlink+write for exactly this reason — a fixture built on plain overwrite would have silently failed to test anything, passing under both old and new code alike. | Live reproduction in `/tmp/hltest` during T-28T01 authoring, cross-checked against the actual Phase 27 field incident |
| 5 | **Both of Phase 27's production defects were undetectable by every check that existed at the time.** `check-prerequisites`, `update-engine-meta --check`, and the pre-existing two-group `validate-hardlinks.js` all reported clean while a stale skill wrapper had already shipped — the defects surfaced only by a human-initiated `grep -c intake skills/magic-spec/SKILL.md` returning `0` where a reviewer expected a match. This retroactively validates the retrospective's own "silent-failure class" label from Session 8, and is precisely why this phase's harness cases carry a mandatory negative control rather than a plausibility argument: a check that has never been observed to fail is not yet evidence it can. | Retrospective Session 8, Findings 4-5; this session's T-28T01 negative-control method |
| 6 | **The retrospective's own bookkeeping had itself drifted, in exactly this phase's theme.** Preparing this entry found two stale figures: the Snapshots table was missing Phase 27's row entirely, and the `**Full Sessions:**` header still read 7 despite Session 8 already being written below it — both silently wrong since Phase 27's own retro, caught only because writing Phase 28's entry required touching the same counters. A meta-instance of the pattern this phase exists to fix: recorded state can drift from reality with every existing check reporting nothing wrong. Backfilled in the same edit (Snapshots row for Phase 27, header counters corrected) rather than left for a future session to rediscover. | `RETROSPECTIVE.md` header (`**Full Sessions:** 7` before this edit, `## Session 8` already present) and Snapshots table (20 rows, Phase 27 absent) |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R29 | #1 | When a retrospective Recommendation row offers more than one option as apparently equivalent, the next planning pass that consumes it should explicitly read the governing source before choosing — and narrow the PLAN.md entry to the one it verified, not both, so the choice is not silently re-deferred to whoever executes the task | `task.md` Planning Audit — informational, no invariant change (the behavior this session already did is the pattern being named) |
| R30 | #4 | Any harness fixture asserting drift/breakage on a hardlinked pair must use unlink-then-write, never a plain overwrite, to actually change the inode on Windows/NTFS — worth a one-line note near `createTempWorkspace`/`cleanup` in `dev/tests/engine.js` so a future fixture author does not have to rediscover this empirically | `dev/tests/engine.js`, informational comment near the top-level test helpers |
| R31 | #6 | After writing a retrospective entry, verify the Snapshots-table row count and the `**Full Sessions:**`/`**Snapshots:**` header counters match the number of `## Session` headings and phase-completion events actually in the file, before closing the retro step — a cheap `grep -c` check that would have caught this session's own backfill immediately rather than at the next session | `retrospective.md` Retrospective Completion Checklist, add a bookkeeping self-check line |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 33 | 33 | 0 |
| Cognitive suite tests | 211 | 211 | 0 |
| Script harness tests | 69 | 72 | +3 |
| Blocked task rate | 0% | 0% | 0 |
| Engine defects open (R25/R26) | 2 | 0 | -2 |
| Graph nodes / edges | 194 / 384 | 200 / 401 | +6 / +17 |
| Signal | 🟡 | 🟢 | ↑ |

> Signal restored to 🟢: the two open engine defects that downgraded Session 8's signal (R25, R26) are both closed, negative-controlled, and live-verified against the real tree — 0 Blocked tasks, 0 orphans, 0 shadow logic, 0 registry drift beyond the two `.design/` bookkeeping corrections this session made to its own past entry.

## Session 10 — 2026-09-13

**Scope:** Plan completion (Phase 29 — Concept-Only Spec Classification; single-phase cycle from a reference-mining pass through `/magic.spec` → `/magic.task` → `/magic.run`, with an in-flight spec correction discovered during Execute before any code was written)
**Specs in registry:** 33 (all Stable; unchanged count — 2 amended for content this cycle: `l1-engine-core.md` 1.6.0 → 1.7.1 (Concept-Only Classification added, then its Required Fix corrected mid-execution), `l1-sdd-reference-containment.md` 1.4.0 → 1.5.0 (provisional-boundary assumption); 1 amended then reverted: `l2-engine-automation.md` 1.9.0(registry)/1.10.0(file, drifted) → 1.11.0 (mis-targeted addition) → 1.12.0 (reverted, net content unchanged from pre-cycle); 3 registry-sync-only, no content change: `l2-engine-finalization.md` 3.0.0 → 3.1.0, `l2-finalize-state-accuracy.md` 1.2.0 → 1.4.0, `l1-session-continuity.md` 2.0.0 → 2.1.0)
**Tasks total:** 6 this cycle (Done: 4, Blocked: 0, Cancelled: 2 — T-29A01/A02, cancelled when their premise was found wrong before any code was written against it)
**RULES.md §7 entries:** 24 (unchanged)
**Graph:** 200 → 202 nodes (+2), 401 → 404 edges (+3); engine-workspace coverage held at 100%; 0 orphaned files, 0 missing `Implements`, 0 convention orphans (`diff-spec-graph` against the Phase 28 baseline)

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session | Manual | Engine 2.1.85 → 2.1.86 for Phase 29 itself (tagged `magic.analyze`, the one workflow body touched); 2.1.84 → 2.1.85 earlier the same session was an unrelated ad hoc user-directed fix (`generate-context.js`), outside this phase's scope |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; the mis-targeted spec (see Findings #1) never reached a `Done` code deployment — caught and corrected within the same planning-to-execution cycle, before any script was touched |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **A Required Fix routed by vocabulary analogy survived two full review gates before Execute caught it by reading source.** `l1-engine-core.md` 1.7.0 named `l2-engine-automation.md`'s `EXEMPT` classification (`analyze-coverage.js`) as the implementation target for excluding `concept-only` specs from a coverage advisory — reasoning that both concepts used the word "coverage." Neither `/magic.spec`'s Post-Update Review (`@role:spec-critic` + `@role:prompt-engineer`) nor `/magic.task`'s Planning Audit (`@role:planner` + `@role:prompt-engineer`) caught it, because both review the spec's internal coherence and instruction quality, not whether its named target file actually contains the described mechanism. Execute's mandatory pre-edit full read of `analyze-coverage.js` (465 lines) showed it classifies **project source files** against spec references — an axis with no "does this spec have a child spec" concept at all; a grep for the advisory's actual wording found it as a cognitive check in `.magic/analyze.md` §Advisory Report Categories, no script behind it. | `analyze-coverage.js` full read at Execute start (Pre-read Requirement); grep for "Bare L1 without L2" resolving to `.magic/analyze.md` line 317, not any `.magic/scripts/*.js` file |
| 2 | **Correcting the target collapsed the fix from a multi-part mechanism to one sentence.** The mis-targeted design required two script functions (exclusion + a "precedence guard" to handle a stale marker being overridden by a real L2 child), a new `summary.conceptOnly` JSON field, a doc-template line, and three harness cases. Once the real mechanism (a cognitive check in `.magic/analyze.md`) was identified, the "precedence guard" turned out to solve a problem that cannot occur: the advisory only ever fires in the branch where no L2 child already exists, so a marker is never at risk of overriding a real one — there is no state to guard. | `l1-engine-core.md` 1.7.1 Required Fix (one sentence, no persisted-state clearing step) vs. the withdrawn 1.7.0/`l2-engine-automation.md` 1.11.0 design |
| 3 | **Four VERSION_DRIFT instances surfaced across five specs in one session, on a registry that had stayed clean for 28 prior phases.** `l2-engine-automation.md`'s file header was one version ahead of the registry when this session's `/magic.spec engine` pass began (caught by its own pre-flight); `/magic.task engine`'s stricter `--verify-headers` pre-flight then caught three more, on entirely unrelated specs (`l2-engine-finalization.md`, `l2-finalize-state-accuracy.md`, `l1-session-continuity.md`). All four traced to a content change whose own Document History already recorded a passed Post-Update Review — registry-sync gaps, not unreviewed edits — but four in one session, after 28 phases with none reported, is a cluster worth investigating rather than four independent coincidences. | `check-prerequisites --json --verify-headers` output at both `/magic.spec engine` and `/magic.task engine` pre-flight, this session |
| 4 | **An ad hoc, user-directed engine fix landed mid-session with zero SDD-layer trace by design.** `generate-context.js`'s double-trailing-newline bug (a markdownlint MD012 finding) was fixed directly on explicit user instruction — no spec, no phase, no task, since the fix was a single redundant `+ '\n'` with an immediately obvious root cause and no design fork. This is a legitimate, bounded exception to SDD-First for the narrowest change class, but it means engine 2.1.84 → 2.1.85 in this session's own version history has no corresponding `.design/` entry — discoverable only via `git log` / `.magic/history/`, not via `PLAN.md`/`TASKS.md`. Named here so a future retro reading the version-history gap does not mistake it for an untracked-work gap. | `.magic/scripts/generate-context.js` (this session's diff); no `tasks/phase-*.md` references it |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R32 | #1 | Add a lightweight target-verification sub-step to `spec.md` §Post-Update Review (or `task.md`'s Planning Audit): before a Required Fix names a specific file/function as its implementation target, read or grep that target to confirm the described mechanism actually lives there — reviewing a spec's internal coherence does not catch a factually wrong target, only a self-consistent one | `.magic/spec.md` §Post-Update Review; informational until evidenced further |
| R33 | #2 | When a Required Fix proposes a new persisted marker with an explicit "clearing" step, check first whether the condition that would trigger clearing already makes the marker's check unreachable — a marker consulted only in a branch nothing else already resolves needs no separate invalidation logic | `spec.md` / `task.md` authoring convention; informational |
| R34 | #3 | Audit whether `update-engine-meta.js`'s C14 write path, or `spec.md`'s Batch Stabilization flow, has a code path that bumps a spec's `Version`/Document History without the matching `INDEX.md` sync `spec.md` §Updating normally performs — four drift instances in one session against a 28-phase clean baseline is a signal | `.magic/scripts/update-engine-meta.js` / `.magic/spec.md`; route via `/magic.task engine` |
| R35 | #4 | No code change: when a user directs an ad hoc engine fix outside any `/magic.*` workflow, the next retrospective snapshot should name it explicitly in surrounding prose (as this entry does), so its absence from `PLAN.md`/`TASKS.md` reads as a recognized, bounded exception rather than an audit gap | `retrospective.md` §6 (L1/L2 Execution); informational |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 33 | 33 | 0 |
| Specs with version churn this session | — | 6 | n/a (first time tracked; unusually high for a stable spec count) |
| Cognitive suite tests | 211 | 211 | 0 |
| Script harness tests | 72 | 72 | 0 (matches the Phase 16 precedent — a pure cognitive-instruction change to `.magic/analyze.md` needs no new harness case) |
| Blocked task rate | 0% | 0% | 0 |
| Graph nodes / edges | 200 / 401 | 202 / 404 | +2 / +3 |
| Signal | 🟢 | 🟢 | → |

> Signal held at 🟢: the session's four VERSION_DRIFT instances (Finding #3) and one mis-targeted spec (Finding #1) were both caught and fully resolved within the same session, before this snapshot — 0 Blocked tasks, 0 orphans, 0 shadow logic, 0 registry inconsistency remaining at close. Flagged in Recommendations (R32, R34) rather than the Signal score, since Score & Signal reflects current state, not mid-session friction already resolved.

## Session 11 — 2026-09-17

**Scope:** Plan completion (Phase 30 — Checksum Scan Hygiene, Git-Commit Scope Retirement, Fresh-Project Drift Silence; three independent Required Fixes, two executed as Engine Improvement ahead of formal planning, one planned and executed through the full `/magic.spec` → `/magic.task` → `/magic.run` cycle)
**Specs in registry:** 33 (all Stable; unchanged count — 4 amended for content this session: `l2-engine-automation.md` 1.12.0 → 1.13.0 (checksum-scanner Invariant 7 parity), `l1-session-continuity.md` 2.1.0 → 2.2.0 (§1.4 write-side git prohibition retired), `l2-engine-finalization.md` 3.1.0 → 3.2.0 (§5.2 same retirement, implementation surface), `l1-engine-core.md` 1.7.1 → 1.8.0 (§Known Process Gaps — Fresh-Project Snapshot Ambiguity))
**Tasks total:** 5 this cycle (Done: 5, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged)
**Graph:** 202 → 204 nodes (+2), 404 → 406 edges (+2); engine-workspace coverage held at 100%; 0 orphaned files, 0 missing `Implements`

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session, 3 engine-version bumps | Manual | Engine 2.1.86 → 2.1.87 (Track A, checksum scanners); 2.1.87 → 2.1.89 across two passes (Track B, git-commit retirement — the first pass reworded the rule permissively, the user corrected that a restatement still keeps the topic present, the second pass removed it outright); Track C (`rules/magic.md` §1) shipped with no version bump by design (`rules/` outside C14 tracking) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks; the one self-correction (Track B's permissive-vs-removed wording) was caught by the user mid-session and fixed in the same turn, before formal planning — no task was ever marked `Done` against the wrong version of the fix |
| **Rework Rate** | 1 correction / 3 tracks | Manual | Track B alone: an interrupted tool call surfaced the user's correction before the second `update-engine-meta` bump landed, so the rework cost was one extra edit pass across 6 files, not a reverted `Done` task |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **A permissive restatement of a retired rule is not the same as removing the rule, and the difference is invisible to every mechanical check this engine runs.** Track B's first pass replaced "agent MUST NOT commit" with "committing is outside this protocol's scope, [...] a matter for the user and their AI agent to agree on directly" — narrower in force but not narrower in *topic*: the paragraph still requires a reader to parse a git-commit-policy sentence on every invocation. `@role:spec-critic`, `@role:prompt-engineer`, and the full harness all passed this wording, because none of them check for topic presence, only for internal consistency and behavioral correctness — the same blind spot Session 10's Finding #1 named for a different axis (target-correctness vs. topic-presence). Caught only by the user re-reading the actual shipped sentence. | User correction mid-session, quoting the exact `rules/magic.md` step 4 sentence back; `dev/tests/engine.js` has no assertion that would have caught this either way, since "does this text still discuss git" is not a property the harness was ever built to check |
| 2 | **Two engine defects (checksum-scanner Invariant 7 gap, git-commit-policy scope) and one retired-topic correction all landed as direct Engine Improvement before any formal `/magic.task` plan existed for them — the third time this session-family has hit this shape (Session 10 Finding #4, Phase 24/26/29's own "graduated directly" pattern).** Unlike those precedents, this time the *spec* was authored first in every case (`/magic.spec` ran before the code change, per SDD-First) — the gap is between spec-authoring and formal task-planning, not between code and spec. `/magic.task engine` was run afterward specifically to close that gap retroactively (Phase 30 Tracks A/B), rather than the code change having zero SDD-layer trace at all. | `.design/engine/tasks/phase-30.md` T-30A01/T-30B01 `Notes` fields, both stating "Executed directly as Engine Improvement... ahead of this formal planning pass — recorded here per this workspace's retrospective-documentation precedent" |
| 3 | **A hardlink pair the engine's own tooling doesn't yet track as a group ([C-001]'s `rules/magic.md` ↔ `.agents/rules/magic.md`) delinked three separate times in one session-family, each time silently and each time caught only by manually re-running `validate-hardlinks.js`.** Every `Write`/`Edit`-tool pass over `rules/magic.md` (Tracks A, B, and C's own edit) broke the hardlink; none of the three were caught automatically — no hook, no pre-task check, re-verifies it. The task's own `Verify` line names re-checking as a manual step each time, which worked, but only because the executor remembered to run it. | `dev/scripts/validate-hardlinks.js` output immediately after each of the three `rules/magic.md` edits this session, each showing `❌ Drift` before the manual `mklink /H` re-link |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R36 | #1 | Extend `@role:prompt-engineer`'s PQ-3 six-dimension review (or add a PQ dimension) with an explicit "topic containment" check for any diff whose task description says a rule/feature is being *retired* or *removed*: the reviewer should flag a replacement sentence that still names the retired topic, not just check the replacement's internal clarity | `l1-prompt-quality-gate.md` / `l2-role-cards-governance.md` (`prompt-engineer` card content); route via `/magic.spec` |
| R37 | #2 | No code change: this is the accepted shape for a spec-first-but-plan-after workflow, not a defect — named so a future retro reading three same-session "graduated directly" entries in a row does not mistake a working pattern for drift | `retrospective.md` §6; informational |
| R38 | #3 | Add `rules/magic.md` ↔ `.agents/rules/magic.md` re-verification as an automatic post-edit check, not a manually-remembered `Verify` line — e.g. a lightweight hook or a `run.md` Step 4 addition that calls `validate-hardlinks.js` whenever a task's `key_files` includes `rules/magic.md`, so a forgotten manual re-link is caught before the next task starts rather than by chance | `.magic/run.md` §4 Update, or `dev/scripts/validate-hardlinks.js` invocation site; route via `/magic.task engine` |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 33 | 33 | 0 |
| Specs with version churn this session | 6 | 4 | -2 |
| Cognitive suite tests | 211 | 211 | 0 |
| Script harness tests | 84 | 85 | +1 |
| Blocked task rate | 0% | 0% | 0 |
| Graph nodes / edges | 202 / 404 | 204 / 406 | +2 / +2 |
| Signal | 🟢 | 🟢 | → |

> Signal held at 🟢: zero Blocked tasks, zero orphans, and the one mid-session correction (Finding #1) was resolved by the user before any task reached `Done` against the wrong wording — Track B's `Done` status reflects only the final, corrected state. [C-001]'s recurring hardlink drift (Finding #3) is flagged in Recommendations rather than the Signal score, matching Session 10's precedent for mid-session friction that was fully resolved before this snapshot.

## Session 12 — 2026-09-18

**Scope:** Plan completion (Phase 31 — Diagnostics Revalidation Before Render, DG-10; single phase, dispatched via `/magic.spec` → `/magic.task` → `/magic.run` from a field bug report)
**Specs in registry:** 33 (all Stable; unchanged count — 2 amended for content this session: `l1-engine-diagnostics.md` 1.0.1 → 1.1.0 (new DG-10 invariant + §1.6 Motivation), `l2-engine-diagnostics.md` 1.1.0 → 1.2.0 (§4.10 `revalidate()` implementation))
**Tasks total:** 6 this cycle (Done: 6, Blocked: 0, Cancelled: 0)
**RULES.md §7 entries:** 24 (unchanged)
**Graph:** 202 → 205 nodes (+3), 404 → 408 edges (+4); engine-workspace coverage held at 100%; 0 orphaned files, 0 missing `Implements` — see Finding #2: this diff spans both Phase 30 and Phase 31, not Phase 31 alone

### 🚀 DORA Metrics (L2 Implementation)

| Metric | Value | Source | Details |
| --- | --- | --- | --- |
| **Deployment Frequency** | 1 phase / session, 1 engine-version bump | Manual | Engine 2.1.93 → 2.1.94, single C14 bump after all four tracks (A/B/C/T) landed — no `--workflow` tag, matching the Phase 21 precedent (script-only change, no dotted workflow-doc body touched) |
| **Change Failure Rate** | 0% | Manual | 0 Blocked tasks. One implementation defect (Finding #3) was caught by a manual smoke test *before* the regression suite was even written, let alone before any task reached `Done` — no `Done` task was ever built on the broken intermediate state |
| **Rework Rate** | 1 correction / 6 tasks | Manual | `normalize()`'s missing `recheck` passthrough (Finding #3), caught inside T-31A02 itself via `node -e` inspection of the live sink, fixed in the same pass — no task was reopened after being marked `Done` |

### 🔍 Findings

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **The defect this phase fixes reproduced itself against its own author, twice, before the fix even existed — the strongest form of field evidence a bug report can get.** The originating report showed `finalize --workflow=task` rendering a stale `SYNC_GAP`; during this session's own `/magic.spec`/`/magic.task` Pre-flight calls against this repository's own `INDEX.md`/`PLAN.md` version pointers, the identical class fired twice more, independent of the downstream report. The eventual fix (T-31C01) was verified with a live, self-contained reproduction against this repository — not only a synthetic fixture — forcing the exact stale-pointer condition, observing it recorded with a `recheck`, resolving it, then confirming the digest no longer rendered it while a genuinely-still-open `ENGINE_INTEGRITY` correctly survived in the same run. | `tasks/phase-31.md` T-31C01 Verify line; this session's own two Pre-flight `SYNC_GAP` warnings, both citing `INDEX.md` versions this same session had already moved past by the time `finalize` drained them |
| 2 | **The retrospective's own rolling-baseline step (`retrospective.md` §2, "rename snapshot to graph-before.json after use") did not run at the close of Session 11** — `graph-before.json` still reflected pre-Phase-30 state, so this session's `diff-spec-graph` conflates two phases' worth of structural change (Phase 30's `l2-engine-automation.md`/checksum-scanner edge plus Phase 31's own two new phase nodes and two spec-version edges) into one diff with no way to attribute deltas to either phase individually from the diff alone. Not a design defect — the diff itself is accurate for the window it actually covers — but it silently widened that window without saying so. | `diff-spec-graph` output this session: `l2-engine-automation` shows `version: 1.12.0 → 1.14.0` (two versions, not one) and a new edge to `dev/scripts/generate-checksums.js` neither of which this session's own work touched — both are Phase 30 carryover |
| 3 | **A single-purpose field-allowlist function silently dropped a newly-added optional field, because the field's producer and its allowlist were edited in two different places and only one was updated first.** `check-prerequisites.js`'s `warn()` was given a `recheck` field to attach to every finding (T-31B01), but `lib/diagnostics.js`'s `normalize()` — which explicitly destructures only the fields it knows about before building the stored record — had no matching update, so `recheck` reached `record()` and was silently discarded before ever touching the sink. Caught by direct inspection of the sink's own JSONL content immediately after the first live test run, not by the type system or any static check (neither exists for this boundary). | Live `cat .design/.cache/diagnostics.jsonl` output showing two `ENGINE_INTEGRITY` entries with no `recheck` key, immediately after `check-prerequisites.js` was edited to attach one; `lib/diagnostics.js` `normalize()`'s pre-fix destructuring line, confirmed via `git show HEAD` to have listed only the original five DG-3 fields |

### 🛠 Recommendations

| # | From | Recommendation | Target |
| --- | --- | --- | --- |
| R39 | #2 | Add a cheap self-check to the retrospective's own Collect step: before running `diff-spec-graph`, compare `graph-before.json`'s embedded node/edge counts (or a stored phase-tag) against the *previous* Snapshots-table row rather than assuming the baseline is current: if they disagree, name the gap explicitly in the session's Scope line (as this session had to do manually for Finding #2) instead of presenting a multi-phase diff as if it were single-phase | `retrospective.md` §2 (Collect) / §7 rolling-baseline step; route via `/magic.task engine` |
| R40 | #3 | When a collector-style function enumerates the exact fields it forwards (`lib/diagnostics.js` `normalize()` is the concrete instance, but the shape recurs anywhere a "known fields only" allowlist exists), add one comment at the allowlist site itself naming it as the single point every new optional field must also touch — not a process change, a two-line comment that turns a silent-drop failure mode into a place a future editor is already looking when they add the field to its producer | `lib/diagnostics.js` `normalize()`, next time either function is touched; no standalone task warranted for a comment-only addition |

### 📈 Trends (from Snapshots)

| Metric | Previous Snapshot | Current | Δ |
| --- | --- | --- | --- |
| Specs in registry | 33 | 33 | 0 |
| Specs with version churn this session | 4 | 2 | -2 |
| Cognitive suite tests | 211 | 211 | 0 |
| Script harness tests | 86 | 92 | +6 |
| Blocked task rate | 0% | 0% | 0 |
| Graph nodes / edges | 202 / 404 | 205 / 408 | +3 / +4 (spans Phase 30+31 — Finding #2) |
| Signal | 🟢 | 🟢 | → |

> Signal held at 🟢: 0 Blocked tasks, 0 orphaned files, 0 missing `Implements`, 100% engine-workspace coverage held. The one implementation defect this session (Finding #3) was caught and fixed before any task reached `Done`, and the stale graph baseline (Finding #2) is a retrospective-tooling gap, not a registry-health signal — both routed to Recommendations rather than affecting the score.

> Signal held at 🟢: the session's four VERSION_DRIFT instances (Finding #3) and one mis-targeted spec (Finding #1) were both caught and fully resolved within the same session, before this snapshot — 0 Blocked tasks, 0 orphans, 0 shadow logic, 0 registry inconsistency remaining at close. Flagged in Recommendations (R32, R34) rather than the Signal score, since Score & Signal reflects current state, not mid-session friction already resolved.
