# SDD Retrospective

**Last Full Run:** 2026-08-22
**Full Sessions:** 6
**Snapshots:** 19

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
