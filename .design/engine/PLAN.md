# Implementation Plan

**Version:** 1.16.1
**Generated:** 2026-08-06
**Based on:** .design/engine/INDEX.md v1.15.15
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduced the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`. Phase 4 deploys the Prompt Quality Gate (`l1-prompt-quality-gate.md`): the `prompt-engineer` role card (#14) and its five workflow gates. Phase 5 deploys the Autonomous Decision Protocol (`l1-decision-autonomy.md`): C27 constitution anchoring, DA-6 session posture in workflow completion flows, and protocol binding across all role cards. Phase 6 deploys SDD Reference Containment (`l1-sdd-reference-containment.md`): the one-way traceability boundary keeping product code free of SDD-artifact references — field-priority fix, eligible for targeted execution. Phase 8 deploys Session Continuity (`l1-session-continuity.md`): the SC-2 universal post-command STATE.md update and SC-3 commit-suggestion guarantee carried by the finalize pipeline, plus the read-only `/magic.status` resume briefing command (`l2-status-command.md`, C2 exception SC-5). Phase 14 closes the 2026-08-06 ventilation findings: shipped artifacts carrying references that do not resolve on a case-sensitive filesystem, and a user-facing documentation set that under-reports the command surface it documents. Phases 15-16 close the implementation debt that accumulated behind seven consecutive spec-authoring cycles: Phase 15 implements the eight `Required Fix` blocks in [l2-engine-finalization.md](specifications/l2-engine-finalization.md) §7-§10 (the finalize/state pipeline making `STATE.md` less accurate after the update meant to refresh it, plus a generator writing a spec identifier into a product file); Phase 16 deploys the two surface-level amendments that need no code — WI-10's broadened documentation-parity scope and RC-12's scaffold-removal check.

## Completed (Baseline)

*Specifications already implemented and validated.*

- [x] **Universal Skill Wrappers** ([l2-skill-wrappers.md](specifications/l2-skill-wrappers.md)) [L2]
- [x] **Config Drift Guard** ([l1-config-drift-guard.md](specifications/l1-config-drift-guard.md)) [L1]
- [x] **Engine Core** ([l1-engine-core.md](specifications/l1-engine-core.md)) [L1]
- [x] **Engine Automation** ([l2-engine-automation.md](specifications/l2-engine-automation.md)) [L2]
- [x] **Engine Finalization Library** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md)) [L2] *(retrospec — scripts/lib/ existed before spec)*
- [x] **Test Suite** ([l2-test-suite.md](specifications/l2-test-suite.md)) [L2]
- [x] **Documentation System** ([l1-documentation-system.md](specifications/l1-documentation-system.md)) [L1]
- [x] **Workflow Wrappers** ([l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md)) [L2]
- [x] **Engine Templates** ([l2-engine-templates.md](specifications/l2-engine-templates.md)) [L2]
- [x] **Agent Surface Architecture** ([l2-agent-surface.md](specifications/l2-agent-surface.md)) [L2]
- [x] **Unified Role System (Concept)** ([l1-role-system.md](specifications/l1-role-system.md)) [L1] *(Phase 3 complete)*
- [x] **Role Card Registry** ([l2-role-cards.md](specifications/l2-role-cards.md)) [L2] *(Phase 3 complete; decomposed v2.0.0 — see child specs below)*
- [x] **Role Cards — Execution Pipeline** ([l2-role-cards-execution.md](specifications/l2-role-cards-execution.md)) [L2] *(retrospec — card content extracted from l2-role-cards v2.0.0; cards live on disk in `.magic/roles/`)*
- [x] **Role Cards — Review Gates** ([l2-role-cards-review.md](specifications/l2-role-cards-review.md)) [L2] *(retrospec — card content extracted from l2-role-cards v2.0.0)*
- [x] **Role Cards — Governance Gates** ([l2-role-cards-governance.md](specifications/l2-role-cards-governance.md)) [L2] *(retrospec — migrated-C24 card content extracted from l2-role-cards v2.0.0)*
- [x] **Role System Workflow Integration** ([l2-role-integration.md](specifications/l2-role-integration.md)) [L2] *(Phase 3 complete; scope narrowed v2.0.0 — tooling split out below)*
- [x] **Role System Engine Tooling** ([l2-role-tooling.md](specifications/l2-role-tooling.md)) [L2] *(retrospec — check-prerequisites integrity, update-engine-meta, role template extracted from l2-role-integration v2.0.0; mechanisms live in engine scripts)*
- [x] **Workspace Intent Routing** ([l1-workspace-intent-routing.md](specifications/l1-workspace-intent-routing.md)) [L1] *(retrospec — implemented in engine v2.1.2: `context.md` §Step 0, `create-workspace.js`, C26 in RULES v1.7.0; validated via the workspace-intent-routing simulation document)*
- [x] **Spec Graph Memory & Token Economy** ([l2-spec-graph-memory.md](specifications/l2-spec-graph-memory.md)) [L2] *(retrospec — promoted Stable 2026-06-10 after implementation review: `graph-cache.js`, `export-wiki.js`, `serve-spec-graph.js` token_budget, §4.4 triggers live in spec/task/analyze workflows)*
- [x] **Multi-Angle Review & Decision Synthesis (Concept)** ([l1-multi-angle-review.md](specifications/l1-multi-angle-review.md)) [L1] *(retrospec 2026-08-06 — MA-1..MA-5 verified live in engine bodies: MA-1 in `.magic/context.md` §Step 0.1, MA-2/MA-4/MA-5 in `.magic/spec.md`, MA-3 in `.magic/analyze.md` Mode C step 7; no execution needed)*
- [x] **Multi-Angle Review Implementation** ([l2-multi-angle-review.md](specifications/l2-multi-angle-review.md)) [L2] *(retrospec 2026-08-06 — lens prompts and blind cross-review flow live in the workflow bodies above; `## Canonical References` backfill scheduled as T-14D01)*
- [x] **Release Pipeline** ([l2-release-pipeline.md](specifications/l2-release-pipeline.md)) [L2] *(retrospec 2026-06-13 — `.github/workflows/release.yml` tag-driven build + publish of the L1 archive already exists and is stable; spec documents the contract + R8 engine-version tracking constraint; no execution needed)*

## Active Phases

### Phase 4 — Prompt Quality Gate (prompt-engineer role)

- [x] **Prompt Quality Gate** ([l1-prompt-quality-gate.md](specifications/l1-prompt-quality-gate.md)) [L1] — deployed via role card #14 + five workflow gates *(Phase 4 complete — engine 2.1.33)*
  - Amendment deployment covered by this phase: [l2-role-cards.md](specifications/l2-role-cards.md) v2.1.0 (inventory #14), [l2-role-cards-governance.md](specifications/l2-role-cards-governance.md) v1.1.0 (§5 card content), [l2-role-integration.md](specifications/l2-role-integration.md) v2.1.0 (§1/§2.8a/§3/§4.2 gate wiring), [l1-role-system.md](specifications/l1-role-system.md) v1.1.0 (§4.3 registry extension).
  - Tasks: [archives/tasks/phase-4.md](archives/tasks/phase-4.md) *(Done, archived)*

### Phase 5 — Decision Autonomy (C27 protocol)

- [x] **Autonomous Decision Protocol** ([l1-decision-autonomy.md](specifications/l1-decision-autonomy.md)) [L1] — deployed via constitution template amendment (C13 §3 + C27), workflow completion-flow DA-6 wiring, user-side `rules/magic.md` section, and role-card binding *(Phase 5 complete — engine 2.1.34)*
  - Reference deployment already live in this project's `.design/RULES.md` v1.8.0 (C27 added, C13 §3 amended).
  - Serialized after Phase 4 (shared workflow-body files — planner audit).
  - Tasks: [archives/tasks/phase-5.md](archives/tasks/phase-5.md) *(Done, archived)*

### Phase 6 — SDD Reference Containment (RC gates)

- [x] **SDD Reference Containment** ([l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md)) [L1] — deployed via ambient `rules/magic.md` section (RC-1..RC-4), Coder card authoring gate (RC-5), Code-reviewer containment check (RC-6), and ventilation leak scan (RC-7) *(Phase 6 complete — engine 2.1.31)*
  - Card amendments covered by this phase: [l2-role-cards-execution.md](specifications/l2-role-cards-execution.md) v1.1.0 (Coder step 5), [l2-role-cards-review.md](specifications/l2-role-cards-review.md) v1.1.0 (Code-reviewer step 4).
  - No hard dependency on Phases 4-5; MUST NOT run concurrently with them (shared files: role cards, `rules/magic.md`). Field-priority: targeted execution permitted before Phase 4.
  - Tasks: [archives/tasks/phase-6.md](archives/tasks/phase-6.md) *(Done, archived)*

### Phase 7 — Shipped Self-Containment (RC-9 purge)

- [x] **SDD Reference Containment — RC-9** ([l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) v1.1.0) [L1] — purged 15 engine-workspace references from shipped files: 5 dead spec links, 3 baked-in workspace names, 6 governance file-name citations *(Phase 7 complete — engine 2.1.32)*
  - No hard dependency on Phases 4-5; MUST NOT run concurrently with them (shared workflow-body files). Field-priority follow-up of Phase 6.
  - Tasks: [archives/tasks/phase-7.md](archives/tasks/phase-7.md) *(Done, archived)*

### Phase 8 — Session Continuity & Status Command

- [x] **Session Continuity & Status Surface** ([l1-session-continuity.md](specifications/l1-session-continuity.md)) [L1] — deployed via finalize-pipeline state update (SC-2), non-bumping commit-suggestion fallback (SC-3), and the status briefing surface (SC-4/SC-5) *(Phase 8 complete — engine 2.1.37)*
- [x] **Status Command** ([l2-status-command.md](specifications/l2-status-command.md)) [L2] — `.magic/status.md` body, `workflows/magic.status.md` wrapper, generated `skills/magic-status/SKILL.md`, upgrade-detection exemption, docs *(Phase 8 complete)*
  - Amendment deployment covered by this phase: [l2-engine-finalization.md](specifications/l2-engine-finalization.md) v1.1.0 (§5 session-continuity integration), [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) v1.1.0 (inventory + graph drift fix), [l2-skill-wrappers.md](specifications/l2-skill-wrappers.md) v1.3.0 (magic-status projection).
  - Tracks A (finalize) and B (status command) are file-independent but both bump `.magic/` meta (C14 checksums) — execute serially in one session (planner audit).
  - No dependency on Phases 4-7 (all Done); first runnable phase after plan-complete state.
  - Tasks: [archives/tasks/phase-8.md](archives/tasks/phase-8.md) *(Done, archived)*

### Phase 9 — DA-9 Engine Deployment (Proposal Surfaces)

- [x] **Decision Autonomy — DA-9 deployment** ([l1-decision-autonomy.md](specifications/l1-decision-autonomy.md) v1.1.0) [L1] — deploy DA-9 (Proposal Surfaces Are Declarative) into engine workflow bodies: rewrite pre-C27 proposal wording in `spec.md` (Blank Trigger / Creative Sparks, Mode Transition, Dispatch Notice) and `analyze.md` (post-analyze handoff) to the narrate-and-act `[DR]` form; verify `task.md` compliance. Firing gates WI-4 (E5) and T1-T3 (E4) preserved intact. *(Phase 9 complete — engine 2.1.38)*
  - Field evidence: a live non-whitelisted `AskUserQuestion` in a `/magic.spec` Blank Trigger (2026-06-13) exposed that §5.3 wired C27 only into completion sections, not proposal surfaces.
  - No hard dependency on Phases 4-8; first runnable phase after the session-continuity cycle.
  - Tasks: [archives/tasks/phase-9.md](archives/tasks/phase-9.md) *(Done, archived)*

### Phase 10 — Session-Continuity Hardening Deployment

- [x] **Session-Continuity Hardening** ([l1-session-continuity.md](specifications/l1-session-continuity.md) v1.1.0 SC-2.1 + [l2-test-suite.md](specifications/l2-test-suite.md) v1.5.0) [L1+L2] — deploy plan-state-aware `computeNextAction` in `finalize.js` (no more static "execute the active phase" against a complete plan) and add the first finalize-pipeline regression coverage to `dev/tests/engine.js`. *(Phase 10 complete — engine 2.1.39, harness 14/14)*
  - Field evidence: `computeNextAction` returned a stale run-recommendation across this session's plan-complete states (hand-corrected in STATE.md ×3).
  - Deploys the R5/R6 spec amendments authored 2026-06-13; no dependency on Phases 4-9.
  - Tasks: [archives/tasks/phase-10.md](archives/tasks/phase-10.md) *(Done, archived)*

### Phase 11 — Archiver Eligibility Fix (R7)

- [x] **Archiver Eligibility Fix** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md) v1.2.0 §6) [L2] — fix `phase-archiver.allChecked` to match anchored checklist line items only (not substring `- [ ]` in prose/code-spans), add regression coverage, and re-archive the pending phase-10. *(Phase 11 complete — engine 2.1.40, harness 15/15, phase-10 archived)*
  - Field evidence: phase-10 (Notes discuss `- [ ]` detection) was silently skipped by the auto-archiver.
  - Deploys the §6 amendment authored 2026-06-13; no dependency on Phases 4-10.
  - Tasks: [archives/tasks/phase-11.md](archives/tasks/phase-11.md) *(Done, archived)*

### Phase 12 — Wrapper-Body Parity Check Deployment (R4)

- [x] **Wrapper-Body Parity Check** ([l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md) v1.2.0 §6) [L2] — add the `WRAPPER_BODY_DRIFT` cognitive check to `magic.analyze` Mode C so phantom wrapper→body mappings fail the audit. Preventive (no active defect); first non-bugfix improvement after the R6→DA-9→R7 chain. *(Phase 12 complete — engine 2.1.41)*
  - Deploys the §6 amendment authored 2026-06-13; no dependency on prior phases.
  - Tasks: [archives/tasks/phase-12.md](archives/tasks/phase-12.md) *(Done, archived)*

### Phase 13 — Upgrade-Detection Decision-Autonomy Alignment

- [x] **Upgrade-Detection ↔ DA alignment** ([l1-decision-autonomy.md](specifications/l1-decision-autonomy.md) v1.2.0 §5.3c) [L1] — replace the `[y/n]` prompt in `rules/MAGIC.md` §1 with the DA-8/DA-9 single-path form (narrate drift + recommend `/magic.analyze`, proceed); update README; recreate the `.agents` hardlink. *(Phase 13 complete — rules/ + README; engine 2.1.41 unchanged — see R8)*
  - Field evidence: §1 was the recurring drift friction handled via `[DR]` every cycle this session — the DA-9 deployment tail Phase 9 missed.
  - Deploys the §5.3(c) amendment authored 2026-06-13; no dependency on prior phases.
  - Tasks: [archives/tasks/phase-13.md](archives/tasks/phase-13.md) *(Done, archived)*

### Phase 14 — Shipped Reference Hygiene & Documentation Sync

- [x] **Shipped Reference Hygiene** ([l1-documentation-system.md](specifications/l1-documentation-system.md) · [l2-skill-wrappers.md](specifications/l2-skill-wrappers.md) · [l2-workflow-wrappers.md](specifications/l2-workflow-wrappers.md)) [L1+L2] — repair every reference inside a shipped artifact that fails to resolve on a case-sensitive filesystem, and close the documentation drift the 2026-08-06 ventilation surfaced. *(Phase 14 complete — engine 2.1.62, harness 34/34, 239 relative links / 0 broken)*
  - Field evidence: `skills/magic-run/SKILL.md` and `skills/magic-task/SKILL.md` ship `rules/MAGIC-md` — a doubly-broken target. The skill-projection body normalizer in `dev/scripts/sync-skills.js` destroys the `.md` extension of any `rules/magic.md` reference regardless of case, while the comment directly above it claims that case is avoided; the `.md`-preserving guard exists only in the frontmatter path. Independently, `.magic/analyze.md` carries a markdown link to `../rules/MAGIC.md` against an actual file named `rules/magic.md` — dangling on every Linux and macOS installation, invisible on the NTFS development host. `CHANGELOG.md` records an earlier repair of "a dangling `rules/MAGIC.md` reference"; these are the branches that repair missed.
  - **Track A gates Track B**: fixing the case in `workflows/` before the generator is fixed would emit `rules/magic-md` into the wrappers — worse than the current state. The generator is repaired and the projection re-verified first.
  - Tracks C (documentation) and D (SDD layer) are file-independent of A and B and of each other; Track T validates the merged tree.
  - Blocking constraint **[C-001]** applies to Track B: `.agents/workflows/` mirrors `workflows/` by hardlink, and write-replace editors delink the twin silently.
  - Tasks: [archives/tasks/phase-14.md](archives/tasks/phase-14.md) *(Done, archived)*

### Phase 15 — Finalize-Pipeline Accuracy & Generator Containment

- [x] **STATE.md Accuracy & Generator Containment** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md) v1.10.0 §7-§10) [L2] — implemented the eight `Required Fix` blocks authored across seven field-report cycles and never executed: the SC-2 state-update step made `STATE.md` *less* accurate than before the update it was supposed to refresh, and the finalize generator wrote a spec's own identifier into the product's root `CHANGELOG.md`. *(Phase 15 complete — engine 2.1.63, harness 43/43)*
  - Invariants deployed: [l1-session-continuity.md](specifications/l1-session-continuity.md) v1.7.0 (SC-1.2 line-cap enforcement, SC-2.1(a) Blocked-phase precedence, SC-2.3 progress granularity, SC-3.1 commit-message completeness) and [l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) v1.4.0 (RC-11 generator self-containment). Harness mandate: [l2-test-suite.md](specifications/l2-test-suite.md) v1.13.0.
  - All eight defects re-verified present in engine 2.1.62 before planning — none were closed incidentally by Phases 10-14.
  - **Track ordering A → B → T** (planner audit): every Track T case asserts behavior Tracks A and B introduce, so a slip in either blocks all of T. Track C is documentation-only and independent of both.
  - Every track writes inside `.magic/` → all bump `.magic/.checksums`. C14 runs **once**, at T-15T03, after every engine edit lands; the tracks are file-independent but MUST execute serially in one session.
  - Highest blast radius is T-15B02 (§9.2): it widens the file set every finalize prints, so its regression is user-visible on the next invocation of any workflow.
  - **Spec follow-up**: §8.4's literal `GOOD` regex (`^(?:Overall|Phase \d+):…`) is incomplete — the state template ships `Phase {N}: [{filled}/{total}]`, whose label is not `Phase \d+`, so applying the example verbatim demoted a template-owned line to narrative. Implemented as `Phase (?:\d+|\{[^}]*\})`; caught by an existing harness case. The spec's reasoning is sound, only its example is narrow.
  - Tasks: [archives/tasks/phase-15.md](archives/tasks/phase-15.md) *(Done, archived)*

### Phase 16 — Documentation Parity & Scaffold Boundary

- [x] **WI-10 Parity & RC-12 Scaffold Surfaces** ([l1-workspace-intent-routing.md](specifications/l1-workspace-intent-routing.md) v1.1.0 · [l1-sdd-reference-containment.md](specifications/l1-sdd-reference-containment.md) v1.4.0 §4.4) [L1] — corrected every `init.md` surface claiming `init.js` bootstraps `STATE.md` (it does not — verified against `initWorkspace()`, which creates `INDEX.md`, `specifications/`, `tasks/`, `archives/tasks/` only), including the three cognitive-suite scenarios that baked the same false claim into their expected outcomes; added RC-12's scaffold-removal check to ventilation and stated the scaffold framing in the ambient agent rules. *(Phase 16 complete — engine 2.1.64, harness 43/43)*
  - No code changes — both amendments land in prose that *is* the implementation (a cognitive check and a documented contract).
  - No hard dependency on Phase 15; MUST NOT run concurrently with it (both bump `.magic/` checksums).
  - Blocking constraint **[C-001]** applies to T-16B02: `rules/magic.md` is hardlinked to `.agents/rules/magic.md`, and write-replace editors delink the twin silently.
  - The suite correction is not optional polish: `magic.dev.simulate` evaluates T01/T02/T58 cognitively against the documented contract, so correcting `init.md` alone would leave the suite asserting a fact its own source of truth no longer supports.
  - Tasks: [archives/tasks/phase-16.md](archives/tasks/phase-16.md) *(Done, archived)*

## Backlog

- **R10 — phase archiver rewrites the link target but not its label** (found 2026-08-06): `updatePlanIndex()` in `phase-archiver.js` replaces `(tasks/phase-N.md)` with `(archives/tasks/phase-N.md)` and leaves the `[tasks/phase-N.md]` label untouched, yielding a working link whose text contradicts its destination. Cosmetic, not a broken link, so it never surfaces in a link sweep — which is why it survived. Fix is a one-line companion replacement; hand-normalized for Phases 14 and 15 — it reproduced again on Phase 15's archival, so the manual step is now a standing tax on every phase close. `updateTasksIndex()` is unaffected (its label is a phase number, not a path). **Not pulled into Phase 15** despite sharing the subsystem: no specification states this contract, so implementing it would require a `/magic.spec` amendment first — and adding spec work is the opposite of what the debt asymmetry recorded in `l1-engine-core.md` v1.2.0 calls for while eight authored fixes sit unimplemented. Revisit after Phase 15 closes.
- **§8.7 — `Status` is never holistically recomputed** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md) §8.7, declared open by the spec itself): Phase 15's T-15C01 fixes the one call site that writes `Status` from a task-scoped event, but no code path recomputes the field from plan/task state, and §5.1's corrected wording now says so plainly. Whether the field *should* be recomputed (and by which step) is a design question, not a bug — route through `/magic.spec` if the explicit call sites are found to drift in practice.
- **Debt-ceiling convention** ([l1-engine-core.md](specifications/l1-engine-core.md) v1.2.0 Known Process Gaps, pending ratification): a cap on open `Required Fix` blocks awaiting implementation, above which `/magic.spec`'s Pre-flight HALTs and recommends `/magic.task {ws}`. The spec deliberately mints no C-number — `.design/RULES.md` is the sole source of truth for the C-series and constitutional amendments are `/magic.rule`'s write scope. Path: `/magic.rule` to ratify, then `/magic.task` → `/magic.run` to build the Pre-flight gate in `.magic/spec.md`. Phases 15-16 are the first datapoint on whether the ceiling is needed — they close the exact backlog that motivated it.
- **Engine dev-repo snapshot drift** (observation, 2026-06-13): the engine's own repo perpetually drifts (`**Engine Version:**` snapshot updates only via `/magic.analyze`, but C14 bumps every phase). Candidate refinement: snapshot-on-C14 in the engine repo, or a dev-repo exemption in upgrade-detection. (Phase 13 removes the *prompt* friction; the drift recurrence itself remains a separate refinement.)
- **R8 — `rules/` + `skills/` outside C14 tracking** — DOCUMENTED (not fixed): captured as the engine-version tracking constraint in [l2-release-pipeline.md](specifications/l2-release-pipeline.md) §5.3 + §7. Broadening the checksum manifest was deferred (load-bearing, churn risk); the operating rule is "deliberate L1-only releases bump the version explicitly." Revisit only if an isolated `rules/`/`skills/` release is needed.
- **R9 — AGENTS-family hardlinks delinked** (found 2026-06-13): the root agent rule cards (`AGENTS.md` ↔ `CLAUDE/GEMINI/QWEN/CODEX.md`) show `nlink=2` (only CLAUDE linked); GEMINI/QWEN/CODEX dropped during the session. Non-strict (validate-hardlinks passes) but real. Restore via `/magic.dev.init`.
- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
