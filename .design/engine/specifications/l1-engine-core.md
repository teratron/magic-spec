# Engine Core Specification

**Version:** 1.2.0
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

### Proposed Convention (pending `/magic.rule` ratification)

This specification records the finding and its evidence; it does **not** mint a new C-numbered convention. `.design/RULES.md` is the sole source of truth for the C-series — this spec only *binds* to conventions already defined there (per the 1.1.4 Document History entry below) — and constitutional amendments are `/magic.rule`'s write scope, not `/magic.spec`'s.

The shape recommended for ratification: a debt ceiling on `Required Fix` (or equivalent) blocks awaiting an L2 pass — once N are open against a workspace, `/magic.spec`'s Pre-flight surfaces a HALT recommending `/magic.task {ws}` before authoring further amendments, mirroring how RE-3's Version Drift Guard already HALTs `spec.md` on a different integrity condition. Enforcing that HALT is itself an L1 engine change (`.magic/spec.md` Pre-flight) and is out of scope here for the same reason every fix in §7–§10 of the companion spec is: `/magic.spec` documents, `/magic.run` implements.

This entry is itself an instance of the pattern it describes — writing it took one `/magic.spec` pass; closing it takes a `/magic.rule` pass to ratify the convention, then a `/magic.task`/`/magic.run` cycle to build the actual gate. Left explicit so the irony doesn't go unnoticed.

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
| `.design/RULES.md` | Global constitution — C-series convention source of truth; ratification target for the proposed debt-ceiling convention (Known Process Gaps) |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.2.0 | 2026-08-06 | Agent | New **Known Process Gaps** section: **Concept/Implementation Debt Asymmetry** — `/magic.spec` authoring is cheap (one workflow pass, `.design/`-only writes) while closing the corresponding L2 implementation is expensive (`/magic.task` → `/magic.run`, code + tests + review), and nothing bounds the gap between them. Quantified from this session: 7 consecutive field-report `/magic.spec` cycles with no interleaving implementation pass left 8 fully-specified `Required Fix` blocks in `l2-engine-finalization.md`, zero implemented. Records a proposed convention (a debt ceiling gating further spec authoring on unclosed L2 items) explicitly **pending `/magic.rule` ratification** — this spec does not mint new C-numbered conventions itself, and enforcement would itself be an L1 engine change out of this workflow's write scope. Canonical References gained `.design/RULES.md`. Reported informally as a self-observed process pattern, not a single reproducible defect. |
| 1.1.4 | 2026-08-06 | Agent | Cited C6 (Autonomous Selective Planning) and C10 (Task Architecture & Status Truth) in §Invariants. Both were implemented in the planning workflow but cited by no specification, so the graph classified them as orphaned conventions. Traceability binding only — no behavioral change. |
| 1.1.3 | 2026-06-10 | Agent | RE-1 clarification: an absent `Version:`/`Status:` header (while INDEX.md declares a valid value) is drift, not a silent pass. Registry is source of truth for field existence. Patch — no RFC revert. |
| 1.1.2 | 2026-06-10 | Agent | Restored missing Version/Status/Layer header fields (parity repair with INDEX.md registry). |
| 1.1.1 | 2026-03-20 | Agent | Fixed template naming: specification.md → spec.md to match disk. |
| 1.1.0 | 2026-03-04 | Agent | Added Templates subsystem, analyze/rule/onboard/retrospective workflow list, and Runtime Guards (RE-1 – RE-T74). |
| 1.0.0 | 2026-03-03 | Antigravity | Initial stable version (captured from existing core). |
