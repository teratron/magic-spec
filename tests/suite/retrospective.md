# Workflow Test Suite — retrospective

Cases of the area `retrospective` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T14 — Retrospective Level 1 Auto-Snapshot (RETRO Missing)

- **Workflow:** `retrospective.md` (Level 1: Auto-Snapshot)
- **Synthetic State:**
  - Phase 1 just completed (all tasks Done)
  - INDEX.md: 3 specs (1 Draft, 1 RFC, 1 Stable)
  - TASKS.md: 5 Done, 0 Blocked
  - RULES.md §7: 4 entries
  - `RETROSPECTIVE.md` does NOT exist
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] INDEX.md read: D/R/S = 1/1/1
  - [ ] TASKS.md summary: 5 Done, 0 Blocked
  - [ ] RULES.md §7: 4 entries counted
  - [ ] Signal: 🟢 (0 Blocked, 100% coverage)
  - [ ] RETROSPECTIVE.md created from `skills/magicspec/templates/retrospective.md`
  - [ ] Snapshot row appended (Snapshots section only — no Session for Level 1)
  - [ ] No task or archival write: archival is owned by `finalize --workflow=run` / `archive-phases` (`retrospective.md` §7, C8)
- **Guards tested:** Template creation on missing file, signal calculation, archival delegation

### T22 — Retrospective Level 2 Full Analysis

- **Workflow:** `retrospective.md` (Level 2: Full Retrospective)
- **Synthetic State:**
  - 3 phases completed (all archived)
  - Phase 1: 5 tasks (4 Done, 1 Cancelled), bottleneck: external API delay
  - Phase 2: 8 tasks (7 Done, 1 Blocked→Done), slow track B
  - Phase 3: 3 tasks (all Done), smooth execution
  - RETROSPECTIVE.md exists with 3 Level 1 snapshots
- **Expected:**
  - [ ] All 3 snapshots read and analyzed
  - [ ] Cross-phase metrics: completion rates, bottleneck patterns
  - [ ] Trends: improving velocity Phase 1→3
  - [ ] Recommendations section generated
  - [ ] Session entry appended to RETROSPECTIVE.md (not snapshot)
- **Guards tested:** Multi-phase analysis, trend detection (the Level 2 changelog belongs to `run.md` Plan Completion — see T20, T195)

### T37 — Retrospective Path and Template Resilience

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - Workspace `docs` is active (`MAGIC_DESIGN_DIR=.magicspec/docs/`).
  - `.magicspec/docs/` initialized and Phase 1 just completed.
  - `RETROSPECTIVE.md` does NOT exist in `.magicspec/docs/`.
- **Action:** Retrospective Level 1 triggered
- **Expected:**
  - [ ] Agent creates `/docs/RETROSPECTIVE.md` from `skills/magicspec/templates/retrospective.md` exactly as is without removing the "Session" sections.
  - [ ] Agent appends a row to the Snapshots table.
  - [ ] Agent performs no archival (`retrospective.md` §7); any move `finalize` later performs is workspace-relative: `tasks/phase-1.md` → `archives/tasks/`
  - [ ] Agent writes `RETROSPECTIVE.md` only inside `.magicspec/docs/`; the one root-level write is the derived `.magicspec/graph/snapshot.json` (`retrospective.md` Step 2, Invariant 2)
- **Guards tested:** Workspace path adherence, Level 1 template fidelity.

### T60 — Retro: Snapshot Row, Archival Delegated to finalize (C8)

- **Workflow:** `retrospective.md` (Level 1 Snapshot)
- **Synthetic State:**
  - Workspace: `.magicspec/api-v2/`
  - Current phase: Phase 3
  - File: `.magicspec/api-v2/tasks/phase-3.md` exists.
  - `TASKS.md` has link to `tasks/phase-3.md`.
- **Action:** Phase 3 completes; `magic.run` triggers Retro L1.
- **Expected:**
  - [ ] `RETROSPECTIVE.md` (metadata) read or created.
  - [ ] Row appended to `RETROSPECTIVE.md` Snapshots table.
  - [ ] The retrospective moves nothing (`retrospective.md` §7); `finalize --workflow=run` later applies **Archival (C8)**: `phase-3.md` → `.magicspec/api-v2/archives/tasks/phase-3.md`.
  - [ ] That same finalize step rewrites the `TASKS.md` link row to `[Phase 3](archives/tasks/phase-3.md)` (`Done (Archived)`).
- **Guards tested:** C8 Archival delegation (the retrospective writes no archive), Workspace-relative pathing logic.

### T175 — Retrospective Context Resolution Full Priority Chain

- **Workflow:** `retrospective.md` (Core Invariant #1)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `MAGIC_WORKSPACE=docs` env var set
  - Phase 1 just completed in `docs` workspace
- **Action:** Retrospective Level 1 triggered (no explicit workspace arg)
- **Expected:**
  - [ ] Agent reads `MAGIC_WORKSPACE=docs` (Priority 2 in chain)
  - [ ] Agent uses `.magicspec/docs/` for RETROSPECTIVE.md operations
  - [ ] Agent does NOT fall back to `workspace.json` default (`engine`) when env var is set
  - [ ] Snapshot appended to `.magicspec/docs/RETROSPECTIVE.md`
  - [ ] Same behavior as all other workflows under identical inputs (T134 parity)
- **Guards tested:** Context Resolution full priority chain in retrospective.md, env var override of default workspace

### T197 — Retrospective Executes Level 2 Deep State

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - A sprint has concluded with several task files closed.
- **Action:** Retro Level 2 runs (`run.md` Plan Completion step 1; `retrospective.md` has no wrapper command)
- **Expected:**
  - [ ] Agent executes Level 2 (Deep State) retrospective, analyzing SDD integrity.
  - [ ] Agent analyzes `RULES.md` drifts and spec modifications, not just mechanical file diffs.
- **Guards tested:** Retrospective Level 2 (Deep State) methodology adherence.

### T198 — Shadow Logic Detection (L2)

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - Source code contains a newly added authentication handler that is NOT documented in `auth.md` or any spec in `INDEX.md`.
- **Action:** Retro Level 2 runs (`run.md` Plan Completion step 1; `retrospective.md` has no wrapper command)
- **Expected:**
  - [ ] Agent identifies the undocumented authentication handler as "Shadow Logic".
  - [ ] Agent highlights the specific file and logic block as an SDD invariant violation.
  - [ ] Agent suggests creating a specification update task to document the shadow logic.
- **Guards tested:** Shadow Logic detection (Retrospective L2), SDD invariant.

### T199 — Spec-to-Code Drift Identification (L2)

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - A component implemented recently has drifted from its `Stable` spec due to a bypassed code edit.
- **Action:** Retro Level 2 runs (`run.md` Plan Completion step 1; `retrospective.md` has no wrapper command)
- **Expected:**
  - [ ] Agent spots the gap between the implemented code and the canonical spec.
  - [ ] Anomaly is registered in the retrospective structural analysis.
  - [ ] Output recommends a sync task (either update spec or revert code).
- **Guards tested:** Spec-to-Code parity evaluation, Anomaly escalation.

### T247 — Retro L2 Is Fired by Plan Completion; No Engine Body Promises a Manual Command It Has No Wrapper For

- **Workflow:** `retrospective.md` (Levels), `run.md` (Plan Completion), `analyze.md` (Mode C step 2 — PHANTOM_COMMAND, Wrapper-Body Parity)
- **Synthetic State:** static text scan of `skills/magicspec/workflows/*.md` and `workflows/`.
- **Action:** read the Levels table of `retrospective.md` and search the engine bodies for a trigger the user is told they can invoke by hand.
- **Expected:**
  - [ ] The L2 trigger reads "Plan Complete (`run.md` Plan Completion)": the step that fires it is named.
  - [ ] No engine body says "manual command"; `retrospective.md` stays a wrapper-less internal module (no `workflows/retrospective.md`, no `/magicspec retrospective` mention), as `analyze.md` Mode C step 2 requires.
  - [ ] T197–T199 reach Retro L2 through Plan Completion, not through a command.
- **Guards tested:** no advertised trigger without a wrapper (the PHANTOM_COMMAND rule's spirit); C2 (no new command without an explicit exception).
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the Levels table promised a "manual command" for Retro L2 that no wrapper provides.
