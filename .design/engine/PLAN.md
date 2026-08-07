# Implementation Plan

**Version:** 1.22.0
**Generated:** 2026-08-07
**Based on:** .design/engine/INDEX.md v1.18.0
**Status:** Active

## Overview

Implementation plan for the Magic SDD engine workspace. Phase 3 introduced the unified role system defined by `l1-role-system.md`, `l2-role-cards.md`, and `l2-role-integration.md`. Phase 4 deploys the Prompt Quality Gate (`l1-prompt-quality-gate.md`): the `prompt-engineer` role card (#14) and its five workflow gates. Phase 5 deploys the Autonomous Decision Protocol (`l1-decision-autonomy.md`): C27 constitution anchoring, DA-6 session posture in workflow completion flows, and protocol binding across all role cards. Phase 6 deploys SDD Reference Containment (`l1-sdd-reference-containment.md`): the one-way traceability boundary keeping product code free of SDD-artifact references — field-priority fix, eligible for targeted execution. Phase 8 deploys Session Continuity (`l1-session-continuity.md`): the SC-2 universal post-command STATE.md update and SC-3 commit-suggestion guarantee carried by the finalize pipeline, plus the read-only `/magic.status` resume briefing command (`l2-status-command.md`, C2 exception SC-5). Phase 14 closes the 2026-08-06 ventilation findings: shipped artifacts carrying references that do not resolve on a case-sensitive filesystem, and a user-facing documentation set that under-reports the command surface it documents. Phases 15-16 close the implementation debt that accumulated behind seven consecutive spec-authoring cycles: Phase 15 implements the eight `Required Fix` blocks in [l2-engine-finalization.md](specifications/l2-engine-finalization.md) §7-§10 (the finalize/state pipeline making `STATE.md` less accurate after the update meant to refresh it, plus a generator writing a spec identifier into a product file); Phase 16 deploys the two surface-level amendments that need no code — WI-10's broadened documentation-parity scope and RC-12's scaffold-removal check. Phase 17 implements Scan Input Hygiene (`l1-scan-input-hygiene.md`): the mention/use boundary that four separate scans have each rediscovered and fixed locally, consolidated into one shared strip step and bound across the two script scans and two cognitive scans that need it. Phase 18 implements the Engine Diagnostics Digest (`l1-engine-diagnostics.md`, `l2-engine-diagnostics.md`): the engine's non-fatal findings stop being written only to a channel the relay contract does not cover, and are delivered once — collected across processes, deduplicated, severity-ordered — immediately before a next step finalization now prints instead of leaving the agent to re-derive. Phase 19 implements the four contracts authored 2026-08-07 alongside the finalization-spec decomposition: the archiver's self-labelling link rewrite, the Pre-flight signal that lets a design-debt backlog raise the HALT its own funnel justification assumes, the regression coverage for the one defect that shipped ahead of its spec, and the root-cause investigation the CHANGELOG contract bars any fix from preceding. Phase 20 implements the two backlog items whose design decisions closed in the `/magic.spec` pass that immediately followed Phase 19's own DESIGN_DEBT_PENDING signal: `release-changelog.js` (R11 remainder — explicit opt-in CHANGELOG rotation, since magic-spec cannot observe a downstream consumer's release event) and the `EXEMPT` coverage classification (SDD bookkeeping/journal files no longer count against `analyze-coverage.js`'s reported percentage).

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

### Phase 17 — Scan Input Hygiene (SH-1..SH-5)

- [x] **Scan Input Hygiene** ([l1-scan-input-hygiene.md](specifications/l1-scan-input-hygiene.md) v1.1.0) [L1] — implemented the mention/use boundary across the four scans that kept rediscovering it: extracted the strip step into one shared helper (SH-5, `scan-hygiene.js`), bound the registry cross-reference that read quoted paths out of `PLAN.md` prose (SH-1 + SH-4), excluded template sources from the link-integrity check (SH-3), and stated SH-1 once in the containment scan's match-class preamble in place of a fourth local carve-out. *(Phase 17 complete — engine 2.1.65, harness 46/46)*
  - **Two live duplicate strips already exist** — `phase-archiver.js` and `update-state.js` each carry their own copy of the same two-regex rule. The second was written during Phase 15, two phases before SH-5 named the pattern, which is precisely the drift the invariant describes: both copies pass their own tests while nothing keeps them equal.
  - **Track A gates Track B**: the registry fix imports the helper Track A extracts. Track A re-points two callers that already have regression coverage, so the helper is validated by existing tests before anything new depends on it.
  - Track C is prose (`.magic/analyze.md`) and file-independent of A and B; Track T validates the merged tree.
  - Line-count preservation (§5.1) is the one behavioral change the existing callers must tolerate. Neither cares — both count line-anchored patterns, and blank lines match nothing — but any future caller reporting `{file}:{line}` depends on it, so it goes in now rather than when it is first needed.
  - Tasks: [archives/tasks/phase-17.md](archives/tasks/phase-17.md) *(Done, archived)*

### Phase 18 — Engine Diagnostics Digest (DG-1..DG-9)

- [x] **Engine Diagnostics Digest** ([l1-engine-diagnostics.md](specifications/l1-engine-diagnostics.md)) [L1] — record non-fatal findings instead of only printing them, accumulate across the separate processes of one invocation, and deliver them once as a deduplicated, severity-ordered digest immediately before the next step. *(Phase 18 complete — engine 2.1.66, harness 55/55)*
- [x] **Diagnostics Implementation** ([l2-engine-diagnostics.md](specifications/l2-engine-diagnostics.md)) [L2] — `lib/diagnostics.js` collector, JSONL sink under the already-gitignored `.design/.cache/`, `record-diagnostic` executor subcommand, single `emitTail()` in `finalize.js`, and migration of all 17 non-fatal emitters across 6 scripts.
  - Amendment deployment covered by this phase: [l2-engine-finalization.md](specifications/l2-engine-finalization.md) v1.11.0 (§11 terminal block ownership), [l2-test-suite.md](specifications/l2-test-suite.md) v1.14.0 (cross-path ordering coverage), [l1-session-continuity.md](specifications/l1-session-continuity.md) v1.7.1 (DG-6 cross-link).
  - Root defect: `rules/magic.md` §3 binds the agent to relay **stdout**, while every non-fatal finding is written to **stderr** — the invisibility is contractual, not a per-script oversight. Three of the four `fix`-class findings are cases where the engine altered state (reserved-command substitution, `.version` auto-heal, template substitution) with no record inside the relay contract at all.
  - **Track A gates everything** (the collector is what every other track imports), then **B before D** — both write `finalize.js`, and sequencing removes the collision entirely rather than managing it. Tracks C and E are file-independent of all others.
  - Every track except E writes inside `.magic/` → all bump `.magic/.checksums`. C14 runs **once**, at T-18T03, after every engine edit lands; the tracks are file-independent but MUST execute serially in one session.
  - Track E (`rules/magic.md`) ships **without** a version bump — `rules/` sits outside C14 tracking. Blocking constraint **[C-001]** applies to it: the file is hardlinked to `.agents/rules/magic.md` and write-replace editors delink the twin silently.
  - Highest blast radius is T-18B01: it restructures the terminal block of every finalize invocation, so a regression is visible on the next run of any workflow — the same shape as Phase 15's T-15B02.
  - Tasks: [archives/tasks/phase-18.md](archives/tasks/phase-18.md) *(Done, archived)*

### Phase 19 — Finalization Contract Fixes (R10, R11, R12, R13)

- [x] **Archival Index Rewrite** ([l2-engine-finalization.md](specifications/l2-engine-finalization.md) §7) [L2] — `updatePlanIndex()` rewrites a phase link's target but not its self-labelling text, yielding a working link whose label asserts a location the file no longer occupies. Reproduced on five consecutive archivals (Phases 14-18), each corrected by hand. *(Phase 19 complete — engine 2.1.68)*
- [x] **Plan-Complete Disambiguation** ([l1-session-continuity.md](specifications/l1-session-continuity.md) SC-2.4) [L1] — Pre-flight tests mechanical drift only, so a plan-complete state blocked on design debt raises no HALT and the funnel recommends the command that just produced nothing.
- [x] **Decision-Section Coverage** ([l2-finalize-state-accuracy.md](specifications/l2-finalize-state-accuracy.md) §8, §9) [L2] — the code fix shipped at engine 2.1.67 ahead of its spec and remains unprotected; the existing assertion is structurally blind to the class.
- [x] **CHANGELOG Anomaly Root-Cause** ([l2-finalize-output-contract.md](specifications/l2-finalize-output-contract.md) §4.3) [L2] — investigation only; §4.4 bars any CHANGELOG fix until the duplicate `### Changed` heading is explained. **Found**: historical manual-edit artifact (two pre-automation direct edits to CHANGELOG.md, one week apart, 2026-05) — not a live defect in `insertIntoUnreleased()`. Diagnosis routed to `/magic.spec` for the §4.3 amendment.
  - **SC-2.2 ↔ SC-2.4 tension resolved at plan time**, recorded here because a cold implementer would stall on it: the truthful recommendation in the design-debt state is `/magic.spec`, which SC-2.2 forbids in `Next Action`. Resolution is to leave that field alone entirely and emit the signal from **Pre-flight**, where the HALT `rules/magic.md` §5 already sanctions surfaces spec authoring legitimately. `computeNextAction()` is not touched by this phase.
  - **Track D is a single-file queue** — D01/D02/D03 all write `dev/tests/engine.js` and must execute in order. A gates D01, B gates D03; D02 is independent of both (test-only, its code already shipped).
  - **Track C produces no code.** Its deliverable is a diagnosis routed back to `/magic.spec`; planning a CHANGELOG fix in this phase would violate the constraint its own spec states.
  - Every track except C writes inside `.magic/` → C14 runs once, at T-19T01.
  - The phase's own closing archival is the end-to-end check for T-19A01 — the fix either holds on the link it writes into `PLAN.md`, or it did not work.
  - Tasks: [archives/tasks/phase-19.md](archives/tasks/phase-19.md) *(Done, archived)*

### Phase 20 — Backlog Implementation (Release Rotation & Coverage Denominator)

- [x] **Release Rotation** ([l2-finalize-output-contract.md](specifications/l2-finalize-output-contract.md) v1.1.0 §4.4) [L2] — `release-changelog.js`, a new explicit opt-in executor subcommand wrapping the already-existing `releaseUnreleased()`, plus removal of `finalize.js`'s now-dead import. Closes the R11 remainder: rotation was barred until §4.3 was root-caused (Phase 19) and the "what constitutes a release" design question was answered (this session's `/magic.spec` pass) — magic-spec cannot observe a downstream consumer's release event, so the trigger is a deliberate user action, never an automatic finalize side effect. *(Phase 20 complete — engine 2.1.69)*
- [x] **Coverage Denominator Scope** ([l2-engine-automation.md](specifications/l2-engine-automation.md) v1.7.0 §Coverage Denominator Scope) [L2] — new `EXEMPT` classification in `analyze-coverage.js` for `.design/` bookkeeping/journal files (PLAN, TASKS, STATE, CONTEXT, CHANGELOG, RETROSPECTIVE, archived phase journals), excluded from the coverage percentage but still reported (`summary.exempt`); parallel doc fix in `.magic/analyze.md`'s Confidence Taxonomy table. Coverage on this repository's own `engine` workspace: 85.4% → 96.5%.
  - Both specs' fixes are file-independent (`release-changelog.js`/`finalize.js` vs. `analyze-coverage.js`/`analyze.md`) — parallel tracks. Track T (regression coverage) is a single-file queue on `dev/tests/engine.js`, same shape as every prior phase's validation track.
  - Both tracks write inside `.magic/` → C14 runs once, at T-20T03, tagged `magic.analyze` (the one workflow-doc body touched, by T-20B02).
  - Harness 57 → 62. Tasks: [archives/tasks/phase-20.md](archives/tasks/phase-20.md) *(Done, archived)*

## Backlog

*The **§8.4 example regex** item was removed 2026-08-07 — already resolved in l2-engine-finalization 1.10.1, gone stale in this list. **R10**, **R12**, and **R13** closed 2026-08-07 by Phase 19 (R10 confirmed live: the phase's own PLAN.md archival entry rewrote correctly, ending a run of five consecutive hand-corrections). **UNSCOPED dev/** closed 2026-08-07 (this pass): `dev` added directly to `workspace.json`'s `engine.scope` — a corrective application of C15's own stated rationale (isolate *unrelated* modules; `dev/` is this engine's own Layer 2), not a new convention, so no `/magic.rule` step was needed. **R11 (remainder)** and the **coverage-metric denominator** item both moved out of Backlog into **Phase 20** (Active Phases, above) once their design decisions were made this same pass.*

- **`Status` is never holistically recomputed** ([l2-finalize-state-accuracy.md](specifications/l2-finalize-state-accuracy.md) §10, declared open by the spec itself): Phase 15 fixed the one call site that wrote `Status` from a task-scoped event, but no code path recomputes the field from plan/task state, and the pipeline spec's §5.1 now says so plainly. Whether the field *should* be recomputed (and by which step) is a design question, not a bug — route through `/magic.spec` if the explicit call sites are found to drift in practice.
- **Debt-ceiling convention** ([l1-engine-core.md](specifications/l1-engine-core.md) v1.2.0 Known Process Gaps, pending ratification): a cap on open `Required Fix` blocks awaiting implementation, above which `/magic.spec`'s Pre-flight HALTs and recommends `/magic.task {ws}`. The spec deliberately mints no C-number — `.design/RULES.md` is the sole source of truth for the C-series and constitutional amendments are `/magic.rule`'s write scope. Path: `/magic.rule` to ratify, then `/magic.task` → `/magic.run` to build the Pre-flight gate in `.magic/spec.md`. Phases 15-16 are the first datapoint on whether the ceiling is needed — they close the exact backlog that motivated it.
- **Engine dev-repo snapshot drift** (observation, 2026-06-13): the engine's own repo perpetually drifts (`**Engine Version:**` snapshot updates only via `/magic.analyze`, but C14 bumps every phase). Candidate refinement: snapshot-on-C14 in the engine repo, or a dev-repo exemption in upgrade-detection. (Phase 13 removes the *prompt* friction; the drift recurrence itself remains a separate refinement.)
- **R8 — `rules/` + `skills/` outside C14 tracking** — DOCUMENTED (not fixed): captured as the engine-version tracking constraint in [l2-release-pipeline.md](specifications/l2-release-pipeline.md) §5.3 + §7. Broadening the checksum manifest was deferred (load-bearing, churn risk); the operating rule is "deliberate L1-only releases bump the version explicitly." Revisit only if an isolated `rules/`/`skills/` release is needed.
- **R9 — AGENTS-family hardlink partially delinked** (found 2026-06-13, re-measured 2026-08-06): the anchor now reports `nlink=4` with CLAUDE, QWEN, and CODEX linked and **only `GEMINI.md` missing** — improved from the original `nlink=2`. Non-strict (validate-hardlinks passes) but real. Restore via `/magic.dev.init`; `/magic.dev.sync` validates the links but never repairs them.
- **`SPEC_BLOAT` watch — two specs near or over threshold** (threshold 300): `l2-engine-diagnostics.md` at 302 lines and `l2-finalize-state-accuracy.md` at ~250, both authored this week. Neither warrants a split — each is internally coherent and neither has accumulated the multi-cycle amendment sediment that drove `l2-engine-finalization.md` to 367 before its 2026-08-07 decomposition. Recorded because both sit where that file sat two months ago, and the metric's value is as an early signal rather than a threshold to cross. *(The `l2-engine-finalization.md` entry itself is resolved — decomposed into the two child specs, parent now ~190 lines.)*
- `frontend-specialist` role card (deferred; domain-specific).
- Skill/role auto-invocation (rejected in v1.0.0 per R6; potential future spec).
