# Engine Core Specification

**Version:** 1.5.0
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
| `.magic/templates/` | Canonical artifact scaffolds |
| `.magic/.version` | Engine version pin |
| `.magic/.checksums` | Kernel integrity manifest |
| `.design/RULES.md` | Global constitution — C-series convention source of truth |
| `.design/workspace.json` | Per-workspace `scope` array (C15 isolation boundary); `engine`'s scope corrected to include `dev` (Known Process Gaps) |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
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
