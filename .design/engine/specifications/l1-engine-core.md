# Engine Core Specification

**Version:** 1.8.0
**Status:** Stable
**Layer:** concept

## Overview

Definition of the Magic SDD core engine logic, workflows, and invariants.

## Motivation

To ensure a stable and predictable environment for specification-driven development across any project.

## Architecture

The engine consists of Markdown-based workflows (`.magic/*.md`) and a supporting automation layer.

### Core Workflows

- **init**: Bootstrapping `.design/`.
- **spec**: Managing the specification registry and lifecycle.
- **task**: Phasing and task generation.
- **run**: Implementation coordination.
- **simulate**: Verification and regression testing.
- **analyze**: Project ventilation, gap detection, and registry repair.
- **rule**: Convention management in `RULES.md §7`.
- **retrospective**: Phase and plan-level analysis and snapshots.

### Templates Subsystem

`.magic/templates/` contains the canonical file scaffolds used when creating new artifacts:

- **spec.md**: Standard full-spec template (required for specs ≥50 lines).
- **micro-spec.md**: Lightweight template for simple features or bugfixes (<50 lines). Promoted to standard template when the 50-line threshold is exceeded (C16).
- **plan.md**: PLAN.md scaffold.
- **tasks.md**: TASKS.md scaffold.
- **retrospective.md**: RETROSPECTIVE.md scaffold.

Template governance: workflows must always instantiate new files from these templates — never from inline content.

## Invariants

- **C1**: Kernel integrity (checksums).
- **C6**: Autonomous selective planning — spec status alone decides plan membership; `Stable` is pulled into the active plan, `Draft`/`RFC` go to the backlog, and an orphan is a blocker. Carried by the planning workflow.
- **C10**: Task architecture and status truth — every planned spec carries an atomic checklist of `T-XXXX` units, and a unit's recorded status is the only claim of what is done. Carried by the planning and execution workflows.
- **C14**: Automatic meta-updates on engine changes.
- **C21**: Project ventilation for consistency.

## Runtime Guards (Sprint 1)

The following guards were added to the core workflows as part of the first reliability sprint:

- **RE-1 — Version Drift Detection** (`spec.md` Consistency Check; `check-prerequisites --verify-headers`): Compares each spec's `Version:` (and `Status:`) header against the `INDEX.md` entry. A mismatch — **or a header field absent from the spec file while `INDEX.md` declares a valid value** — raises a `VERSION_DRIFT` (or `STATUS_DRIFT`) flag in the Consistency Report, indicating an external edit bypassed the amendment protocol. An absent header field is drift, never a silent pass: the registry, not the file, is the source of truth for whether a field must exist.
- **RE-2 — Spec Stability Spot-Check** (`run.md` Pre-flight): Before execution begins, confirms every spec targeted by a `Todo` task in the current phase is still `Stable` in `INDEX.md`. Catches direct spec demotion that C12 cannot detect.
- **RE-3 — Version Drift Guard** (`spec.md` §Updating): When VERSION_DRIFT is detected on the target spec of an active update, the engine **HALTs** before writing. Prevents silent absorption of external edits and audit-trail corruption. T4 rules triggered during a VERSION_DRIFT HALT are queued, not written.
- **RE-T71 — Intent Preservation** (`task.md`): When `task.md` sub-delegates to `init.md` or `analyze.md`, the original user intent is memoized and restored after delegation resolves.
- **RE-T74 — Cross-Workspace Parity** (`task.md`): Pre-flight scans all registered workspaces for identically-named spec files. Version mismatch between copies triggers HALT with three resolution options.

## Known Process Gaps `[ADDED]`

### Concept/Implementation Debt Asymmetry

Authoring an L1 concept-layer invariant is comparatively cheap: `/magic.spec` writes only to `.design/`, requires no code changes, no test execution, and completes in one workflow pass. Closing the corresponding L2 implementation requires `/magic.task` → `/magic.run` under the Coder role — touching `.magic/` (or `dev/`), running the harness, passing Post-Update Review. Nothing currently bounds how far L1 authoring can run ahead of L2 closure.

Quantified from this session alone, across seven consecutive `/magic.spec` field-report cycles processed with no interleaving `/magic.task`/`/magic.run` pass: **8 fully-specified `Required Fix` blocks** now sit in [l2-engine-finalization.md](l2-engine-finalization.md) (§7.2, §8.1–§8.5, §9.2, §10.2) — each with exact BAD/GOOD code, exact file/line, exact regex — with **zero** implemented in `.magic/` code. Every cycle ended with a Decision Record recommending `/magic.task engine`; none had executed by the time the eighth report arrived. The backlog is not stalled by ambiguity — each fix is precise enough for direct implementation — it is stalled because nothing forces a stop.

Reported informally, as a self-observed pattern rather than a single reproducible defect: concept specs proliferate because L1 authoring is cheap and pleasant while L2 implementation is expensive; without a budget limiter — L1 authoring blocked while N L2 items are unclosed — the gap only grows.

### Proposed Convention (rejected 2026-08-07)

This specification recorded the finding and its evidence without minting a new C-numbered convention — `.design/RULES.md` is the sole source of truth for the C-series, and constitutional amendments are `/magic.rule`'s write scope, not `/magic.spec`'s. The shape considered for ratification: a debt ceiling on `Required Fix` (or equivalent) blocks awaiting an L2 pass — once N are open against a workspace, `/magic.spec`'s Pre-flight surfaces a HALT recommending `/magic.task {ws}` before authoring further amendments.

**Explicit user ratification decision (Escalation Whitelist E4)**: rejected. The datapoint the proposal itself named as its test arrived: Phases 15-20 closed the exact `Required Fix` backlog that motivated it — 8 blocks in [l2-engine-finalization.md](l2-engine-finalization.md) alone — through normal `/magic.task`/`/magic.run` planning cycles, with no hard ceiling ever existing to force the stop. The asymmetry this section names is real (spec authoring is cheap, L2 closure is expensive), but the evidence shows the existing pipeline already closes the gap without a dedicated numeric gate; a related-but-distinct mechanism (SC-2.4's `DESIGN_DEBT_PENDING` Backlog gate, [l1-session-continuity.md](l1-session-continuity.md)) already HALTs `/magic.task` when a workspace reaches plan-complete with undone design work, covering the adjacent case a debt ceiling was also reaching for. No `/magic.rule` amendment follows from this section.

### Concept-Only Classification (proposed 2026-09-13) `[ADDED]`

Reference-mining against a downstream consumer project's own constitution surfaced a different resolution to the same asymmetry this section documents — not a gate, a classification. That project's global constitution lets an author tag a `Stable` L1 spec `concept-only` in `PLAN.md` when no L2 implementation is currently planned: the tag declares the spec a durable design-library entry rather than stalled work, excludes it from the "Bare L1 without L2 children" advisory category (`.magic/analyze.md` §Advisory Report Categories, Spec Quality), and is consulted only in the one branch where it matters — the advisory never fires at all once a real L2 child exists, so there is no separate "auto-revert" step to implement.

This does not reopen the 2026-08-07 rejection above — that decision concerned *blocking* authoring on a numeric ceiling, and the evidence for rejecting it stands unchanged. What neither the rejected ceiling nor SC-2.4's `DESIGN_DEBT_PENDING` gate addresses is the advisory's own signal quality: a spec the author never intended to close soon (a deliberate reference document) and a spec that is genuinely neglected both render identically today, so a rising "bare L1" count cannot distinguish intent from neglect and trains the reader to discount it. A classification changes what gets flagged; it does not touch whether authoring may continue.

**Required Fix** (Engine Improvement, out of this spec's write scope): `.magic/analyze.md` §Advisory Report Categories — Spec Quality's "Bare L1 without L2 children" line gains an explicit skip for a spec whose header declares `**Concept-Only:** true`. This is a cognitive advisory check performed while reading `INDEX.md`/spec headers during `/magic.analyze`, not a scripted `analyze-coverage.js` metric — that script computes an unrelated axis (project source-file coverage against spec Canonical References via its own `EXEMPT` classification). An earlier revision of this entry mis-routed the fix to `l2-engine-automation.md` on that false analogy; corrected here during implementation, once the actual mechanism was traced. Whether the `PLAN.md`-facing tagging behavior itself warrants a new C-numbered convention (mirroring how the source project codified it) is left to `/magic.rule` — the mechanism specified here is complete without one.

### Workspace Scope Completeness (resolved 2026-08-07)

Ventilation (2026-08-06) found `dev/` absent from the `engine` workspace's `scope` array in `.design/workspace.json`, while six or more of this workspace's own L2 specs cite `dev/tests/engine.js` and `dev/scripts/*.js` in their Canonical References — inside the traceability boundary (specs point at the files) but outside the scan boundary (`analyze-coverage.js` and the other `MAGIC_WORKSPACE_SCOPE`-consuming scripts never walked them, so they were invisible to coverage/ventilation, not merely UNCOVERED).

`.design/RULES.md` C15 (Workspace Scope Isolation) states scope exists "to ensure logical isolation and prevent context leakage or accidental modification of **unrelated** modules." `dev/` is not unrelated — it is Layer 2 Auxiliary Core for this same engine (per this project's own `CLAUDE.md` layer contract), and it is the file set several of this workspace's Stable specs already declare as their own implementation. Its exclusion was inconsistent with C15's stated intent from the start, not a deliberate isolation boundary — applying C15 correctly means including it, not amending it. No `/magic.rule` ratification is needed (unlike the debt-ceiling item above): this is a corrective application of an existing convention, not a new one.

**Resolution**: `dev` added to the `engine` workspace's `scope` array. `dev/.cache/` (the one noisy subtree) is already gitignored and excluded from every scope-respecting scan via the existing `.gitignore` check, independent of `scope` filtering — no new exclusion logic needed.

### Mode C Depth Control Bypass Ambiguity (resolved 2026-08-13)

Field report (engine 2.1.71): `.magic/analyze.md`'s Core Invariant 6 "Depth Control (Safety)" states, without mode qualification, that scanning a project with >500 files HALTs for user choice — framed among the Core Invariants as mandatory for the whole workflow. Mode C's own "Audit Policy" note, immediately above its step list, states "Report-delivery is the only HALT point" and names four HALT conditions it deliberately bypasses (`checksums_mismatch`, Existence Guard, `VERSION_DRIFT`, C12 Quarantine) — Depth Control is absent from that list. The asymmetry repeats structurally: the Mode A/B Completion Checklist carries a `Depth Control obeyed` line; the parallel Mode C Checklist has no such line at all. A large-repo ventilation run (this repository: 763 tracked files) has no textual basis to determine whether it must HALT before scanning or may proceed straight to report delivery.

**Resolution**: Mode C does not HALT on Depth Control. Three of the four HALTs Mode C already bypasses (`checksums_mismatch`, `VERSION_DRIFT`, C12 Quarantine) are integrity guards more severe than a pre-scan file-count sizing question, and the mode's own stated design — read-only (Core Invariant 3), collect-everything-before-reporting — already treats "stop and ask before proceeding" as the wrong shape for ventilation. Extending the existing bypass to Depth Control is consistent with that design, not a new relaxation of it; the omission reads as an oversight in the bypass list rather than a deliberate carve-out.

**Required Fix** (both in `.magic/analyze.md`, Engine Improvement — out of this spec's write scope):

1. Add `Depth Control` to the Mode C "Audit Policy" bypass list alongside the four existing entries.
2. Add a non-halting, advisory line to the Mode C Completion Checklist for parity with Mode A/B — e.g. `Depth Control noted (advisory only; Mode C never HALTs on file count)` — phrased so it does not re-imply the HALT the resolution above removes.

### Dev-Repo Engine-Version Snapshot Sync (resolved 2026-08-22)

Observation (first recorded 2026-06-12 as a Parked backlog item — *"revisit only if the drift recurrence itself becomes a problem in practice"*; now revisited by explicit user request). Engine Upgrade Detection (`rules/magic.md` §1) compares `.magic/.version` against the `**Engine Version:**` snapshot in `.design/INDEX.md`, narrating one drift line and proceeding whenever they diverge. The mechanism exists to catch an **external** engine replacement: a project consuming this engine downloads a new release archive, `.magic/.version` changes under it, and the drift line tells the returning session to re-validate via `/magic.analyze`. The snapshot contract enforces this by naming `/magic.analyze` the field's sole writer — every other workflow only reads it.

In this engine's own dev-repo, the distinction the mechanism is built to detect does not exist: every `.magic/.version` bump is a first-party change made by the same session that is simultaneously editing `.design/`, not a replacement discovered later. The snapshot going stale here is not a signal worth catching — it is self-inflicted noise, re-narrated on every subsequent `/magic.*` invocation until a `/magic.analyze` happens to run. Confirmed live during this session's own Phase 23: immediately after a C14 bump moved `.magic/.version` to `2.1.73`, `.design/INDEX.md`'s snapshot still read `2.1.72`.

**Resolution**: a dev-repo-only exemption, not a change to the general contract. `update-engine-meta.js` already distinguishes "this checkout is the engine's own dev-repo" from "this is a consumer installation" via `fs.existsSync(dev/scripts/generate-checksums.js)` — the exact guard its own checksum-regeneration and skill-sync steps already use (§`runGenerateChecksums`, `dev/scripts/sync-skills.js`). When that guard is true, the C14 write branch additionally patches `.design/INDEX.md`'s `**Engine Version:**` field to the freshly-bumped version, atomically with the rest of the C14 write. When the guard is false — every consumer project — nothing changes: the snapshot stays `/magic.analyze`-only, and the drift-detection signal for a genuine external upgrade is untouched.

**Required Fix** (Engine Improvement, out of this spec's write scope):

1. `.magic/scripts/update-engine-meta.js`: in the C14 write branch, when the `dev/scripts/generate-checksums.js` guard is true, read `.design/INDEX.md` and replace its `**Engine Version:**` line with the newly-bumped version — same call site as the existing skill-sync step, same guard reused, not a second detection mechanism.
2. `rules/magic.md` §1's "Snapshot contract" sentence amended to carve out the exception: *"...the sole writer, except in this engine's own dev-repo, where `update-engine-meta` patches it directly on every C14 bump (detected via the same `dev/scripts/` presence guard `generate-checksums`/`sync-skills` already use)."* The external-drift-detection contract for every consumer project is otherwise unchanged, word for word.
3. Regression: a `dev/tests/engine.js` case with a dev-repo fixture (`dev/scripts/generate-checksums.js` present) confirms `.design/INDEX.md`'s `**Engine Version:**` updates after `update-engine-meta`; a consumer-fixture case (`dev/` absent) confirms it does not.

### Fresh-Project Snapshot Ambiguity (resolved 2026-09-17) `[ADDED]`

User-reported gap, not a field report. Engine Upgrade Detection (`rules/magic.md` §1) step 2 explicitly collapses two distinct causes into one `unknown` bucket — *"Missing file (fresh project) or missing field → treat as `unknown`."* Step 4 then fires identically on **every** `unknown`, narrating *"SDD engine drift: `unknown` → `{local_engine}`. Recommend `/magic.analyze` to revalidate against the new engine — even patch releases may carry workflow-affecting changes."* — including on the very first `/magic.*` invocation a downstream project ever makes, before `.design/` exists and before any workflow has ever run.

§1's own opening paragraph states a narrower purpose than what it fires on: catching a project that **was previously analyzed** and then had its engine folders replaced by a newer release, so a real prior snapshot now disagrees with `.magic/.version`. A project with no `.design/INDEX.md` at all was never analyzed — there is no prior snapshot to have drifted from, only the absence of one. Framing that absence as "drift" and recommending revalidation "against the **new** engine" presupposes an **old**, validated engine state that never existed. It also stands in tension with every workflow's own **Auto-Init** invariant (`spec.md` Core Invariant 3 and its siblings in `task.md`/`run.md`/`analyze.md`: *"If `.design/` or system files missing, silently execute `.magic/init.md` (do not prompt user)"*) — the engine already treats a missing `.design/` as something to bootstrap silently everywhere except this one check, which currently narrates a drift recommendation first and lets Auto-Init run after.

The two causes §1 step 2 collapses together are not equivalent in what they imply:

- **`.design/INDEX.md` itself is absent** (or `.design/` doesn't exist) — genuinely fresh/uninitialized project. Nothing has ever been analyzed; Auto-Init is about to create the registry from scratch. No drift exists to report.
- **`.design/INDEX.md` exists but lacks the `**Engine Version:**` field** — a registry that predates the field, or one edited outside the lifecycle protocol. A real project history exists here; recommending `/magic.analyze` is still the right call.

**Resolution**: split step 2's single `unknown` outcome into two named outcomes — `fresh` (no registry file at all) and `unknown` (registry present, field absent) — and make step 4's narration conditional on which one fired. `fresh` joins the silent-proceed branch (step 3) instead of the narrate branch; the workflow's own Auto-Init creates `.design/INDEX.md` with a correctly-seeded snapshot on its own, leaving nothing for this check to narrate. `unknown` keeps firing exactly as today — a registry that exists without the field is still worth flagging.

**Required Fix** (Engine Improvement, out of this spec's write scope), `rules/magic.md` §1:

1. Step 2 becomes: *"Missing `.design/INDEX.md` → treat as `fresh` (no prior analysis exists). File present but the `**Engine Version:**` field missing → treat as `unknown` (a registry exists without the snapshot)."*
2. Step 3 becomes: *"If `local_engine == snapshot_engine`, or the result is `fresh` → proceed silently."*
3. Step 4's firing condition narrows from *"On mismatch (including `unknown`)"* to *"On mismatch, or `unknown`"* — unchanged for a real version mismatch or a present-but-fieldless registry; simply no longer reachable via `fresh`.
4. Regression: `dev/tests/engine.js` gains a fixture asserting the drift line is **absent** on a project with no `.design/` at all (first-ever invocation), alongside existing-shape coverage for a real mismatch and for a present-but-fieldless registry (both continue to narrate).

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/analyze.md` | Ventilation workflow |
| `.magic/spec.md` | Specification lifecycle workflow |
| `.magic/task.md` | Task orchestration workflow |
| `.magic/run.md` | Implementation execution workflow |
| `.magic/rule.md` | Convention management workflow |
| `.magic/init.md` | Bootstrap workflow |
| `.magic/context.md` | Workspace resolution logic |
| `.magic/scripts/executor.js` | Cross-platform script executor |
| `.magic/scripts/update-engine-meta.js` | C14 write branch; dev-repo detection guard (`dev/scripts/generate-checksums.js`) reused for the Engine-Version snapshot sync |
| `.magic/templates/` | Canonical artifact scaffolds |
| `.magic/.version` | Engine version pin |
| `.magic/.checksums` | Kernel integrity manifest |
| `rules/magic.md` | User-side ambient rules; §1 Engine Upgrade Detection snapshot contract |
| `.design/INDEX.md` | Global aggregate registry; carries the `**Engine Version:**` snapshot field |
| `.design/RULES.md` | Global constitution — C-series convention source of truth |
| `.design/workspace.json` | Per-workspace `scope` array (C15 isolation boundary); `engine`'s scope corrected to include `dev` (Known Process Gaps) |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.8.0 | 2026-09-17 | Agent | New **Fresh-Project Snapshot Ambiguity** entry under Known Process Gaps, user-reported (not a field report): Engine Upgrade Detection's step 2 collapses "no `.design/INDEX.md` at all" and "registry present, field missing" into one `unknown` outcome, and step 4 narrates the same "SDD engine drift" recommendation for both — including on a downstream project's very first `/magic.*` invocation, before `.design/` exists or anything has ever been analyzed. §1's own stated purpose (catch a *previously analyzed* project whose engine was since replaced) doesn't apply when no prior analysis ever happened, and the narration contradicts every workflow's own silent Auto-Init invariant (`spec.md` Core Invariant 3 and siblings) for the identical missing-`.design/` condition. Resolved by splitting `unknown` into `fresh` (no registry file — joins the silent-proceed branch) and `unknown` (registry present, field absent — keeps narrating). Required Fix routed to `rules/magic.md` §1 (Engine Improvement, out of this spec's write scope) — steps 2-4 reworded, plus a `dev/tests/engine.js` regression pinning silence on a truly fresh project alongside the two cases that must keep narrating. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) and Instruction Quality Pass found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation — no persisting C12 cascade to the ten L2 `Implements` dependents. |
| 1.7.1 | 2026-09-13 | Agent | **Concept-Only Classification** Required Fix re-targeted during `/magic.task engine` → `/magic.run engine` implementation: the 1.7.0 entry routed the fix to `l2-engine-automation.md`'s `analyze-coverage.js`-backed `EXEMPT` mechanism, by false analogy to that spec's Coverage Denominator Scope section — tracing the actual "Bare L1 without L2 children" advisory found it is a cognitive check in `.magic/analyze.md` §Advisory Report Categories (Spec Quality), not a scripted `analyze-coverage.js` output; that script computes an unrelated axis (project source-file coverage). Corrected to target `.magic/analyze.md` directly; the erroneous `l2-engine-automation.md` addition is reverted in the same pass. Also simplifies the mechanism itself: since the advisory only ever fires when no L2 child exists, the marker needs no persisted "clear" step — Coder-discovered during Phase 29's Execute step, before any code was written against the wrong target. Patch — no change to the underlying invariant (concept-only specs are excluded from the advisory), only to which artifact implements it. |
| 1.7.0 | 2026-09-13 | Agent | New **Concept-Only Classification** entry under Known Process Gaps, surfaced via reference-mining against a downstream consumer project's own constitution: an alternate, non-blocking resolution to the Concept/Implementation Debt Asymmetry — tagging a Stable L1 spec `concept-only` in `PLAN.md` when no L2 is currently planned, excluding it from the coverage-gap advisory (mirroring the existing `EXEMPT` mechanism) and auto-reverting once an `Implements:` L2 is authored. Does not reopen the 2026-08-07 debt-ceiling rejection — that concerned blocking authoring, this concerns the advisory's signal quality (a rising gap count cannot currently distinguish deliberate concept-library entries from neglect). Required Fix routed to [l2-engine-automation.md](l2-engine-automation.md) §Coverage Denominator Scope; whether the `PLAN.md`-tagging behavior itself needs a new C-numbered convention is left to `/magic.rule`. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) and Instruction Quality Pass found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.6.0 | 2026-08-22 | Agent | New **Dev-Repo Engine-Version Snapshot Sync** entry under Known Process Gaps: revisits the Parked backlog item (2026-06-12) "Engine dev-repo snapshot drift" at explicit user request. Engine Upgrade Detection's snapshot contract (`rules/magic.md` §1, `/magic.analyze` sole writer) exists to catch *external* engine replacement in consumer projects; in this engine's own dev-repo that distinction does not apply — every version bump is first-party, so the snapshot going stale is self-inflicted noise, confirmed live this session (Phase 23's own C14 bump left the snapshot one version behind). Resolved as a dev-repo-only exemption, not a change to the general contract: reuses `update-engine-meta.js`'s existing `dev/scripts/generate-checksums.js` presence guard (already used for the checksum-regeneration and skill-sync steps) to detect dev-repo vs. consumer install, and patches `.design/INDEX.md`'s `**Engine Version:**` field atomically with the C14 write only when that guard is true. Consumer-project behavior is unchanged. Required Fix (Engine Improvement, out of this spec's write scope) targets `update-engine-meta.js` and `rules/magic.md` §1's snapshot-contract sentence, plus regression coverage for both the dev-repo and consumer-fixture branches. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation — no persisting C12 cascade to the ten L2 `Implements` dependents. |
| 1.5.0 | 2026-08-13 | Agent | New **Mode C Depth Control Bypass Ambiguity** entry under Known Process Gaps: `.magic/analyze.md`'s Core Invariant 6 (Depth Control, mandatory HALT >500 files) is absent from Mode C's own "Audit Policy" bypass list, which otherwise states "Report-delivery is the only HALT point" and names four other bypassed HALTs; the Mode A/B Completion Checklist carries a Depth Control line the parallel Mode C checklist lacks (field report, engine 2.1.71, reproduced on this repository's own 763-file tree). Resolved: Mode C does not HALT on Depth Control — consistent with its existing bypass of three more severe integrity HALTs and its read-only, collect-everything design. Required Fix (Engine Improvement, out of this spec's write scope): add Depth Control to the Mode C bypass list; add a non-halting advisory checklist line for A/B parity. |
| 1.4.0 | 2026-08-07 | Agent | **Debt-ceiling convention rejected**: routed to the user per Escalation Whitelist E4 (constitutional-tier, `/magic.task`'s `DESIGN_DEBT_PENDING` HALT triggered this pass' `/magic.spec engine` invocation). Decision: reject — Phases 15-20 closed the exact `Required Fix` backlog that motivated the proposal through normal planning cycles, with no hard ceiling ever existing, and SC-2.4's `DESIGN_DEBT_PENDING` gate already covers the adjacent plan-complete-with-open-debt case. §Known Process Gaps' "Proposed Convention" subsection rewritten from pending-ratification to rejected-with-rationale; no `/magic.rule` amendment follows. Canonical Reference for `.design/RULES.md` no longer describes it as a ratification target. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation — no C12 cascade to the ten L2 `Implements` dependents as a result. |
| 1.3.0 | 2026-08-07 | Agent | New **Workspace Scope Completeness** entry under Known Process Gaps: the `engine` workspace's `scope` array omitted `dev` despite several of the workspace's own L2 specs citing `dev/tests/engine.js` / `dev/scripts/*.js` in their Canonical References, leaving those files outside every scope-respecting scan. Read C15's own stated rationale ("prevent... accidental modification of unrelated modules") and found `dev/` is not unrelated — it is this engine's own Layer 2 Auxiliary Core — so the omission was an inconsistent application of C15, not a deliberate boundary; no `/magic.rule` amendment needed. Resolved directly: `dev` added to `workspace.json`'s `engine.scope`; `dev/.cache/` stays excluded via the pre-existing `.gitignore` check. Canonical References gained `.design/workspace.json`. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.2.0 | 2026-08-06 | Agent | New **Known Process Gaps** section: **Concept/Implementation Debt Asymmetry** — `/magic.spec` authoring is cheap (one workflow pass, `.design/`-only writes) while closing the corresponding L2 implementation is expensive (`/magic.task` → `/magic.run`, code + tests + review), and nothing bounds the gap between them. Quantified from this session: 7 consecutive field-report `/magic.spec` cycles with no interleaving implementation pass left 8 fully-specified `Required Fix` blocks in `l2-engine-finalization.md`, zero implemented. Records a proposed convention (a debt ceiling gating further spec authoring on unclosed L2 items) explicitly **pending `/magic.rule` ratification** — this spec does not mint new C-numbered conventions itself, and enforcement would itself be an L1 engine change out of this workflow's write scope. Canonical References gained `.design/RULES.md`. Reported informally as a self-observed process pattern, not a single reproducible defect. |
| 1.1.4 | 2026-08-06 | Agent | Cited C6 (Autonomous Selective Planning) and C10 (Task Architecture & Status Truth) in §Invariants. Both were implemented in the planning workflow but cited by no specification, so the graph classified them as orphaned conventions. Traceability binding only — no behavioral change. |
| 1.1.3 | 2026-06-10 | Agent | RE-1 clarification: an absent `Version:`/`Status:` header (while INDEX.md declares a valid value) is drift, not a silent pass. Registry is source of truth for field existence. Patch — no RFC revert. |
| 1.1.2 | 2026-06-10 | Agent | Restored missing Version/Status/Layer header fields (parity repair with INDEX.md registry). |
| 1.1.1 | 2026-03-20 | Agent | Fixed template naming: specification.md → spec.md to match disk. |
| 1.1.0 | 2026-03-04 | Agent | Added Templates subsystem, analyze/rule/onboard/retrospective workflow list, and Runtime Guards (RE-1 – RE-T74). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing core). |
