# Workflow Test Suite — run

Cases of the area `run` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T09 — Run Sequential Happy Path

- **Workflow:** `run.md` (Executing Tasks — Sequential Mode)
- **Synthetic State:**
  - TASKS.md: Phase 1, 3 tasks (T-1A01 Todo, T-1A02 Todo dep:T-1A01, T-1A03 Todo dep:T-1A02)
  - RULES.md §7 C3: Sequential mode
  - All spec files exist
- **Expected:**
  - [ ] Pre-flight: check-prerequisites → ok
  - [ ] Mode Guard: Sequential found in RULES.md §7 → proceed
  - [ ] T-1A01 picked (no deps), executed, marked Done
  - [ ] T-1A02 unblocked, picked next
  - [ ] On phase complete: retrospective Level 1 auto-snapshot
  - [ ] Changelog Level 1 compiled to CHANGELOG.md
  - [ ] Phase file archived to `archives/tasks/`
- **Guards tested:** Dependency chain, auto-snapshot, changelog, archival

### T10 — Run Mode Not in RULES.md

- **Workflow:** `run.md` (Executing Tasks)
- **Synthetic State:**
  - TASKS.md exists with Phase 1 tasks
  - RULES.md §7 does **not** contain execution mode convention
- **Expected:**
  - [ ] Pre-flight: check-prerequisites → ok
  - [ ] Mode Guard: execution mode NOT found in RULES.md §7
  - [ ] **Auto-recover (C3)**: Parallel mode assumed as default; proceeded without halt
  - [ ] No warning prompt and no question: Parallel is assumed per C3 (`run.md` Logic Guard: "assume Parallel (do not HALT)")
  - [ ] Task execution begins autonomously
- **Guards tested:** Mode Guard Auto-Recovery (C3)

### T11 — Run Full Deadlock (100% Blocked)

- **Workflow:** `run.md` (Executing Tasks — Sequential Mode)
- **Synthetic State:**
  - Phase 2: 4 tasks, all status = Blocked
  - Phase 1: all Done (archived)
  - RULES.md §7 C3: Sequential mode
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] Find next Todo task → none found
  - [ ] Stalled Phase detected: Blocked tasks remain but no Todo
  - [ ] Agent reports stall with summary of blocked items
  - [ ] Agent does NOT loop — escalates to user and waits
- **Guards tested:** Stalled Phase escalation, no infinite loop

### T19 — Run Parallel Mode (2 Tracks, Shared Conflict)

- **Workflow:** `run.md` (Executing Tasks — Parallel Mode)
- **Synthetic State:**
  - TASKS.md Phase 1: Track A (T-1A01 Todo, T-1A02 Todo) + Track B (T-1B01 Todo)
  - T-1A02 and T-1B01 both modify `shared-config.md`
  - RULES.md §7 C3: Parallel mode
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] Mode Guard: Parallel found → Manager Agent activated
  - [ ] T-1A01 and T-1B01 started in parallel (no shared constraints)
  - [ ] T-1A02 flagged: shared constraint with T-1B01 on `shared-config.md`
  - [ ] Manager serializes conflicting tasks (one waits for the other)
  - [ ] No data loss or race condition
- **Guards tested:** Parallel execution, shared-constraint detection, Manager serialization

### T20 — Run Full Plan Complete (Conclusion Cascade)

- **Workflow:** `run.md` + `retrospective.md` (Plan Completion)
- **Synthetic State:**
  - TASKS.md: Phase 1 Done (archived), Phase 2 Done (last phase)
  - All specs implemented, all tasks Done
  - RULES.md §7 C3: Sequential mode
- **Expected:**
  - [ ] Phase 2 completion detected → Level 1 retro auto-snapshot
  - [ ] **Full plan completion** detected → Level 2 retrospective triggered
  - [ ] Level 2 retro: structured analysis with metrics across all phases
  - [ ] Changelog Level 2 compiled and displayed verbatim; the user reviews it independently afterward (`run.md` Plan Completion §2) — no inline Yes/No prompt
  - [ ] CONTEXT.md regenerated
  - [ ] TASKS.md summary updated
- **Guards tested:** Plan completion detection, Level 2 retro trigger, Changelog L2 independent-review gate (C9 gate 9)

### T21 — Run Phase 1→2 Transition

- **Workflow:** `run.md` (Phase Transition)
- **Synthetic State:**
  - Phase 1: all tasks Done
  - Phase 2: 4 tasks Todo, not yet started
  - RULES.md §7 C3: Sequential mode
- **Expected:**
  - [ ] Phase 1 completion detected
  - [ ] Level 1 retro auto-snapshot fires
  - [ ] Phase 1 file archived: `tasks/ → archives/tasks/` (C8)
  - [ ] TASKS.md link updated to archive location
  - [ ] Agent transitions to Phase 2: reads `phase-2.md`
  - [ ] First Todo task in Phase 2 picked automatically
  - [ ] No user prompt between phases (C9: Zero-Prompt Automation)
- **Guards tested:** Phase archival (C8), seamless transition, Zero-Prompt (C9)

### T33 — Run Sequence Syncs to PLAN.md

- **Workflow:** `run.md` (Executing Tasks)
- **Synthetic State:**
  - `TASKS.md` Phase 1 has 2 tasks mapped to `auth.md`.
  - Both tasks are transition to marked `Done` after execution.
  - `PLAN.md` has `[ ] Implement Auth module` pointing to `auth.md` under Phase 1.
- **Action:** User says "Execute tasks"
- **Expected:**
  - [ ] Agent reads TASKS.md and identifies fully implemented spec (`auth.md`).
  - [ ] Agent modifies `.magicspec/PLAN.md` to change `[ ]` to `[x]` for `auth.md`.
  - [ ] TASKS.md updated with `Done`.
- **Guards tested:** Plan Sync mechanism (Plan Amnesia fix)

### T34 — Run Task Blocked Handoff Collapses to /magicspec plan (Post-Task Replan)

- **Workflow:** `run.md` (Executing Tasks → Step 4 Handoff)
- **Synthetic State:**
  - `TASKS.md` Phase 2 has 1 active task mapped to `auth.md`.
  - Task execution encounters ambiguous or missing details in the specification.
- **Action:** User executes `/magicspec run`
- **Expected:**
  - [ ] Agent records `Blocked [!]` status and the specific reason in `TASKS.md` Notes.
  - [ ] Per `CONSTITUTION.md §5` Post-Task Replan, agent records the finding as a Replan Directive in `TASKS.md` and recommends **exactly ONE** command: `/magicspec plan {workspace}`.
  - [ ] Agent does NOT proactively propose `/magicspec analyze` or `/magicspec spec` from `run.md` (per `run.md` Step 4 Handoff explicit prohibition).
  - [ ] `/magicspec spec` recommendation surfaces ONLY inside a `/magicspec plan` HALT — its Pre-flight — or in the Stalled Plan report of `/magicspec task` (T257), when mechanical auto-fix cannot resolve the gap.
  - [ ] After spec resolution + re-run of `/magicspec plan` and `/magicspec task`, dependencies are rebuilt before resuming execution.
- **Guards tested:** Post-Task Replan §5 collapse (run → plan → optional HALT → spec → plan → task → run); single user-facing command per HALT.

### T39 — Run Phase Completion with Cancelled Tasks Guard

- **Workflow:** `run.md` + `retrospective.md`
- **Synthetic State:**
  - `TASKS.md` summary table lists 3 `Done` and 1 `Cancelled` task.
  - Phase 1 has no `Todo` tasks and no `Blocked` tasks.
  - Entire plan only has Phase 1.
- **Action:** Agent marks the final available task as `Done`.
- **Expected:**
  - [ ] Agent recognizes Phase 1 is complete (condition: all `Done` or `Cancelled`).
  - [ ] Agent recognizes entirely plan is complete.
  - [ ] Retrospective and summary extract `Cancelled` metric successfully.
- **Guards tested:** Phase completion on Cancelled, Missing Cancelled Metric.

### T42 — Run Version Bleed Guard

- **Workflow:** `run.md`
- **Synthetic State:**
  - Entire plan is completed (Phase 2 done).
  - Node.js project. `package.json` exists with version `"1.0.0"`.
  - Level 2 Changelog approved.
- **Action:** User prompts to finish execution. Agent updates version.
- **Expected:**
  - [ ] Agent bumps version inside `package.json`.
  - [ ] Agent does NOT attempt to modify `skills/magicspec/.version` in any way.
- **Guards tested:** Version Bleed Prevention.

### T54 — Parallel Mode Shared-Constraint Detection (Deep Scan)

- **Workflow:** `run.md` (Executing Tasks — Parallel Mode)
- **Synthetic State:**
  - Track A: T-1A01 "Update user module" (refs `user-module.md` §2).
  - Track B: T-1B01 "Add logging" (refs `logger.md` §4).
  - `user-module.md` §2 says "Modifies `src/lib/manager.js`".
  - `logger.md` §4 says "Updates logger middleware in `src/lib/manager.js`".
  - Task descriptions DO NOT mention `src/lib/manager.js`.
  - RULES.md §7 C3: Parallel mode.
- **Action:** Run `/magicspec run`
- **Expected:**
  - [ ] Manager Agent reads both associated spec sections (§2 and §4).
  - [ ] **Shared-Constraint Detection**: Manager detects that BOTH tasks modify `src/lib/manager.js`.
  - [ ] Manager serializes the tasks (schedules T-1A01, then T-1B01 in sequence or same track).
  - [ ] Log entry recorded: "Serialization decision: T-1A01 and T-1B01 both modify `src/lib/manager.js`".
- **Guards tested:** Deep Shared-Constraint Detection (Spec Scan), Conflict Prevention.

### T55 — Run Rules-First Convention Enforcement

- **Workflow:** `run.md` (Executing Tasks)
- **Synthetic State:**
  - `TASKS.md` Phase 1 has 1 active task.
  - `RULES.md` §7 contains project-specific conventions (e.g., code quality guidelines, testing mandates).
- **Action:** Agent begins task execution.
- **Expected:**
  - [ ] Agent reads `RULES.md` before any code edit (Invariant 2: Rules First)
  - [ ] Agent applies all §7 conventions relevant to the task's technology stack
  - [ ] If `RULES.md` version > `TASKS.md` base version → Warn user of drift before executing
  - [ ] Task output adheres to conventions found in RULES.md (engine enforces reading, not specific convention content)
- **Guards tested:** Rules First invariant, convention sync guard.

### T56 — Engine Meta Automation Enforcement

- **Workflow:** `run.md`, `rule.md`, `test.md`, `spec.md` (Core Engine Update)
- **Synthetic State:**
  - Agent modifies `skills/magicspec-dev/workflows/test.md` to add a new guideline.
  - `skills/magicspec/.version` is `1.4.11`.
- **Action:** Agent performs the edit.
- **Expected:**
  - [ ] Agent identifies that a core engine file was modified.
  - [ ] Agent executes: `node skills/magicspec/scripts/executor.js update-engine-meta`.
  - [ ] **Automated Verifications:**
    - [ ] `skills/magicspec/.version` bumped to `1.4.12`.
    - [ ] `skills/magicspec/.checksums` is recalculated.
  - [ ] Results documented in the task completion checklist.
- **Guards tested:** C1, C14, Engine Integrity Guard (via meta automation).

### T57 — Run Convention Sync Guard (Version Mismatch)

- **Workflow:** `run.md`
- **Synthetic State:**
  - `TASKS.md` header contains `Based on RULES: 1.4.6`.
  - `RULES.md` version is `1.4.7`.
  - Phase 1 has 3 Todo tasks.
- **Action:** Run `/magicspec run`
- **Expected:**
  - [ ] Agent reads both versions before execution (Core Invariant 4, Sync guard).
  - [ ] **Mismatch Detected**: 1.4.6 vs 1.4.7.
  - [ ] The Sync guard HALTs: the plan is stale and is not repaired inside a run. Agent records a `## Replan Directive` in `TASKS.md` (the plan's version and "The constitution moved from v1.4.6 to v1.4.7: revalidate the plan against it"), narrates `[Replan] RULES drift: the plan is revalidated by /magicspec plan. (Revert: remove the section from .magicspec/{ws}/TASKS.md)` and ends the run with `/magicspec plan {workspace}` as the one next step — no question is asked (C25).
  - [ ] After `/magicspec plan` and `/magicspec task`, `TASKS.md` reads `Based on RULES: 1.4.7`; `/magicspec run` then begins without a prompt.
- **Guards tested:** Convention Sync Guard halt with a recorded directive (`run.md` Core Invariant 4), Task-Rules parity, C25 (no inline approval).

### T64 — Quarantine Cascade Enforcement

- **Workflow:** `run.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `TASKS.md` Phase 1 has 1 Todo task for `api-impl.md`.
  - `INDEX.md` registers `api-impl.md` (Level 2) pointing to `api-core.md` (Level 1).
  - `api-core.md` status in `INDEX.md` = `RFC` (Not `Stable`).
- **Action:** User runs `/magicspec run`.
- **Expected:**
  - [ ] `check-prerequisites` returns warning: "Rule 57 Violation: L2 spec 'api-impl.md' is ..., but its L1 parent 'api-core.md' is RFC (Must be Stable)."
  - [ ] **Quarantine Guard (C12)** in `run.md` detects violation for active task.
  - [ ] **HALT** — Execution does not begin.
  - [ ] Message: "Quarantine Triggered: Specification `api-impl.md` has a non-Stable parent. Run `/magicspec plan {workspace}`: the plan decides the quarantine and `/magicspec task` applies it."
- **Guards tested:** Rule 57 Enforcement (C12), Runtime Quarantine Check.

### T74 — Run: Changelog Precision (Filter Blocked)

- **Workflow:** `run.md`
- **Synthetic State:**
  - Phase 1: `T-101` (Done, Changes: "Added A"), `T-102` (Blocked, Changes: "Started B"), `T-103` (Done, Changes: "Added C").
- **Action:** Phase 1 completes. Agent triggers Changelog L1.
- **Expected:**
  - [ ] Agent reads Phase 1 tasks.
  - [ ] **Filtering applied**: Only `T-101` and `T-103` selected.
  - [ ] `CHANGELOG.md` updated with:
    - Added A
    - Added C
  - [ ] "Started B" is **NOT** present in the changelog.
- **Guards tested:** Changelog Filtering (Precision), Reporting Integrity.

### T82 — Run Spec Stability Spot-Check (RE-2)

- **Workflow:** `run.md` (Pre-flight — Spec Stability Guard)
- **Synthetic State:**
  - `TASKS.md` Phase 1: T-1A01 (Todo, maps to `auth-impl.md`)
  - `INDEX.md` at plan generation: `auth-impl.md` (Stable L2)
  - Between plan generation and run, user demotes `auth-impl.md` → RFC externally in both its file header and `INDEX.md` (a one-sided edit would HALT earlier with STATUS_DRIFT — see T126)
  - `RULES.md §7` has C3: Parallel mode
  - No C12 violation (L1 parent `auth.md` is still Stable — this is NOT a parent-layer issue)
- **Action:** User runs `/magicspec run`
- **Expected:**
  - [ ] **Pre-flight**: `node skills/magicspec/scripts/executor.js check-prerequisites --json --require-tasks --verify-headers --workspace={active-workspace}`.
    - [ ] **C15 Filter**: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **HALT** ONLY if in-scope files are mismatched.
    - [ ] **Spec Stability Spot-Check**: Read `INDEX.md`. For each spec referenced by a `Todo` task in the current phase, confirm status = `Stable`. Any non-Stable spec → **HALT** before execution begins (see Logic Guard above).
  - [ ] Pre-flight: `check-prerequisites` passes (no engine mismatch)
  - [ ] **Spec Stability Spot-Check**: Agent reads `INDEX.md` for all Todo-task specs in current phase
  - [ ] `auth-impl.md` found with status `RFC` (not Stable)
  - [ ] **HALT** — execution does NOT begin
  - [ ] Message: "Spec `auth-impl.md` is no longer Stable (current: RFC). Run `/magicspec plan {workspace}` to re-evaluate the plan."
  - [ ] C12 Quarantine guard does NOT fire (L1 parent is Stable — this is a different, complementary guard)
- **Guards tested:** Spec Stability Spot-Check (RE-2), direct spec demotion detection, guard independence from C12

### T104 — Mid-Run Spec Demotion Halts Track Before Done

- **Workflow:** `run.md` (§Execution Step 4 — Mid-Run Stability Check)
- **Synthetic State:**
  - Parallel mode active. Two tracks running:
    - Track A: executing `T-1A01` → target spec `auth.md` (L1, Stable at dispatch).
    - Track B: mid-execution, triggers `/magicspec spec` amendment on `auth.md` → status drops to RFC.
  - Track A reaches Step 4 (Update) and attempts to commit `Done`.
- **Action:** Track A sets `T-1A01` → `Done`
- **Expected:**
  - [ ] Before committing `Done`, Track A re-reads `INDEX.md`
  - [ ] Detects `auth.md` is now RFC (demoted since dispatch)
  - [ ] **HALT**: "Spec `auth.md` demoted to RFC during execution of `T-1A01`. Task output suspended — run `/magicspec plan {workspace}` to re-evaluate."
  - [ ] `T-1A01` NOT marked Done; left as In Progress
  - [ ] Manager notified of suspension
- **Guards tested:** RE-D1 (Mid-Run Stability Check before committing Done)

### T105 — Manager Re-Reads INDEX.md Before Next Assignment

- **Workflow:** `run.md` (§Execution Setup — Manager role)
- **Synthetic State:**
  - Parallel mode. Track A completes `T-1A01` (Done). Track B has demoted `auth.md` to RFC since Manager's last assignment.
  - Manager is about to assign next task `T-1A02` (also targets `auth.md`).
- **Action:** Manager proceeds to assign `T-1A02`
- **Expected:**
  - [ ] Manager re-reads `INDEX.md` before assigning `T-1A02`
  - [ ] Detects `auth.md` is RFC — not Stable
  - [ ] Does NOT assign `T-1A02`
  - [ ] Reports: "Spec `auth.md` is no longer Stable. Halting new assignments for dependent tasks."
  - [ ] Suggests: run `/magicspec plan {workspace}` to re-evaluate the plan
- **Guards tested:** RE-D2 (Manager INDEX.md re-read cadence between assignments)

### T126 — Run File-Header Parity Catches Manual Demotion

- **Workflow:** `run.md`
- **Synthetic State:**
  - `docs-architecture.md` (L1): file header `Status: Draft`, `Version: 2.0.0`
  - `INDEX.md` entry for `docs-architecture.md`: `Status: Stable`, `Version: 1.0.0`
  - Active phase-1 tasks reference `docs-node.md` (L2, Implements: docs-architecture.md)
- **Action:** `/magicspec run` triggered to execute phase-1 tasks
- **Expected:**
  - [ ] Pre-flight File-Header Parity detects STATUS_DRIFT on `docs-architecture.md` (file=Draft ≠ INDEX=Stable)
  - [ ] Pre-flight File-Header Parity detects VERSION_DRIFT on `docs-architecture.md` (file=2.0.0 ≠ INDEX=1.0.0)
  - [ ] **HALT** before any task execution with drift report (Cognitive Guard)
  - [ ] C12 cascade is NOT triggered prematurely (drift must be resolved first)
  - [ ] User directed to resolve via `/magicspec spec`, then re-run `/magicspec plan` (per `CONSTITUTION.md §5` Post-Task Replan — single user-facing recommendation, no `/magicspec analyze` step)
- **Guards tested:** File-Header Parity (run.md, Cognitive Guard), STATUS_DRIFT, VERSION_DRIFT, C12 pre-condition ordering

### T141 — Run Handoff Collapses to /magicspec plan (Post-Task Replan)

- **Workflow:** `run.md` (Step 4 — Handoff)
- **Synthetic State:**
  - `TASKS.md` Phase 1 task `T-1A01` mapped to `auth.md`
  - During execution, spec is ambiguous → HALT triggered
- **Action:** Agent halts and recommends exactly ONE command — `/magicspec plan {workspace}` — per `CONSTITUTION.md §5` Post-Task Replan. Inside `/magicspec plan`, a HALT of its Pre-flight carries a single `/magicspec spec` recommendation (the Stalled Plan report of `/magicspec task` — T257 — is the only other door); user runs `/magicspec spec`, then re-runs `/magicspec plan`.
- **Expected:**
  - [ ] Agent records Blocked status with reason in TASKS.md, and the finding as a Replan Directive
  - [ ] Agent recommends `/magicspec plan` (with workspace context); does NOT proactively propose `/magicspec analyze` or `/magicspec spec`
  - [ ] `/magicspec plan` surfaces the `/magicspec spec` recommendation on a substantive spec gap at its Pre-flight
  - [ ] After spec update + re-run of `/magicspec plan` and `/magicspec task`, dependencies rebuilt and task validity re-verified before resuming execution
- **Guards tested:** Post-Task Replan collapse (run → plan → optional HALT → spec → plan → task → run); never two user-facing commands in sequence

### T146 — Run Mid-Run HALT Notifies Manager in Parallel Mode

- **Workflow:** `run.md` (Step 4 — Mid-Run Stability Check, Parallel mode)
- **Synthetic State:**
  - Parallel mode. Track A executing `T-1A01` for `auth.md` (Stable at dispatch).
  - Track B triggers spec amendment → `auth.md` drops to RFC mid-execution.
  - Track A reaches Step 4 and attempts to commit Done.
- **Expected:**
  - [ ] Track A re-reads INDEX.md, detects `auth.md` is now RFC
  - [ ] **HALT** on Track A: "Spec `auth.md` demoted to RFC during execution of `T-1A01`."
  - [ ] `T-1A01` left as In Progress (NOT Done)
  - [ ] Developer Track A notifies Manager role of suspension
  - [ ] Manager halts further assignments for specs affected by `auth.md` demotion
- **Guards tested:** Mid-Run HALT, Manager notification in Parallel mode

### T150 — Run Argument Routing: Targeted Task by ID (Mode C — T-XXXX)

- **Workflow:** `run.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}}}`
  - `engine/TASKS.md`: Phase 1 with T-1A01 (Todo), T-1A02 (Todo, dep: T-1A01), T-1B01 (Todo).
  - RULES.md §7 C3: Sequential mode.
- **Action:** User runs `/magicspec run T-1A01` (unquoted, not a workspace name)
- **Expected:**
  - [ ] Argument parsed: `T-1A01` does not match any workspace → non-workspace token
  - [ ] Pattern matches `T-XXXX` → **Targeted Task** execution
  - [ ] Workspace resolved via default (`engine`) — Workspace Fallback applied
  - [ ] Only T-1A01 is executed (not the full phase)
  - [ ] Dependency check: T-1A01 has no deps → proceeds
- **Guards tested:** Argument Routing (Targeted Task), Non-workspace token detection, Workspace Fallback

### T151 — Run Argument Routing: Scoped + Directed Phase (Mode D)

- **Workflow:** `run.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `docs/TASKS.md`: Phase 1 (all Done), Phase 2 (3 Todo tasks).
  - RULES.md §7 C3: Parallel mode.
- **Action:** User runs `/magicspec run docs "phase-2"`
- **Expected:**
  - [ ] Argument parsed: `docs` = workspace, `"phase-2"` = directed text → **Scoped + Directed** (Mode D)
  - [ ] Only `docs/TASKS.md` is read
  - [ ] Only Phase 2 tasks are targeted (Phase 1 skipped — already Done)
  - [ ] Manager Agent activated (Parallel mode) for Phase 2 tasks
  - [ ] Handoff (if re-planning needed) recommends `/magicspec plan docs`
- **Guards tested:** Argument Routing (Mode D), Phase targeting, Workspace scoping, Handoff Propagation

### T174 — Bootstrap Detection in run.md

- **Workflow:** `run.md` (Pre-flight, Bootstrap Detection)
- **Synthetic State:**
  - `PLAN.md` contains entries with `[Bootstrap]` markers.
  - `TASKS.md` has tasks from Bootstrap plan.
  - Target spec status = Draft.
- **Expected:**
  - [ ] Warning emitted: `"⚠ Bootstrap Plan detected — specs are not yet Stable."`
  - [ ] Execution proceeds (no HALT for Draft specs with Bootstrap marker).
  - [ ] Generated artifacts include `[Bootstrap]` suffix.
- **Guards tested:** Bootstrap Detection in run.md, Spec Stability Bootstrap Exception. Pre-flight only — the guards that follow it (Quarantine C12, Spec Stability, the Mid-Run check, the orchestrator's re-read) are T250, and the Sync steps of `plan` and `task` are T251.

### T195 — Run Changelog L2 Is Reviewed Independently, Not Through an Inline Yes/No (C25)

- **Workflow:** `run.md` (Plan Completion — Conclusion Cascade)
- **Synthetic State:**
  - Same as T20: all phases Done, full plan complete
- **Action:** Plan completion detected
- **Expected:**
  - [ ] Changelog Level 2 compiled and **displayed verbatim** in the agent's output.
  - [ ] Agent does NOT issue an inline Yes/No approval prompt for the changelog (per C25 Engineer Posture in `run.md` Run Completion Checklist: *"no Yes/No approval prompts inline (user reviews release artifacts independently afterward)"*).
  - [ ] The release artifact is reviewed by the user independently afterward (`run.md` Plan Completion §2); the agent adds no gate of its own.
  - [ ] The C9 gate 9 release-artifact gate is preserved through that independent review, not through inline interaction.
- **Guards tested:** C25 Engineer Posture (no inline release prompts), independent post-hoc review as the release gate, `run.md` Plan Completion §2 compliance.

### T201 — Run Backlog-Only State Guard

- **Workflow:** `run.md` (Step 2 — Select)
- **Synthetic State:**
  - `.magicspec/engine/TASKS.md` has `## Backlog` section with 5 spec entries.
  - No active phase checklist (task.md generated 0 active phase tasks; all specs are RFC).
  - TASKS.md active phase section: empty (no Todo, InProgress, Done, Blocked entries).
  - STATE.md: `**Status:** Active`, `**Phase:** 1 — Pending`.
- **Action:** `/magicspec run` invoked; Pre-flight passes (`ok: true`); Select step finds 0 Todo tasks.
- **Expected:**
  - [ ] Select: 0 Todo AND 0 InProgress AND 0 Done AND 0 Blocked detected.
  - [ ] *Backlog-Only* guard fires before *Complete* check.
  - [ ] **HALT** emitted: "Active phase has no started tasks — all work is in `## Backlog`. Run `/magicspec plan` to activate a phase, then re-run `/magicspec run`."
  - [ ] Phase Completion (Retro L1 + Changelog + Archive) is **NOT** triggered.
  - [ ] Agent does NOT archive any phases or write a Changelog entry.
- **Guards tested:** Backlog-Only guard (run.md Step 2 Select, added Fix 1)
- **Regression for:** "The Split Amendment" crisis (Improv Mode 2026-05-14); prevents false Phase Completion on empty active phase.

### T203 — Source-of-Truth Contract: §5 Replan, WI-10 Bootstrap, C25 Posture (Regression Trinity)

- **Workflow:** `run.md` + `init.md` + `run.md` Run Completion Checklist (cross-workflow)
- **Synthetic State:**
  - Active engine version ≥ 2.1.25.
  - Six known suite drifts previously corrected (T34, T58, T195 — v2.1.25; T36, T190, simulate-rename — v2.1.55) must not re-regress.
- **Action:** Static scan of `tests/suite.md` against workflow source of truth.
- **Expected:**
  - [ ] T34 expectation cites `CONSTITUTION.md §5` Post-Task Replan collapse to `/magicspec plan` — does NOT claim direct `run.md → /magicspec spec` handoff.
  - [ ] T58 expectation reads `default: main` — does NOT contain the literal string `default: root` (WI-10 contract).
  - [ ] T195 expectation requires verbatim changelog display + independent post-hoc review — does NOT contain the phrase `Yes/No` as an inline approval gate.
  - [ ] T36 expectation describes the WI-10 bootstrap fallback (auto-init provisions `.magicspec/{default}/`; root `.magicspec/` read transiently) — does NOT claim root `.magicspec/` is used "for all operations".
  - [ ] T190 expectation uses the hyphenated skill projection convention (`skills/magic-test/`, `name: magic-test`) — does NOT contain a dotted `skills/magic.test/` path.
  - [ ] Simulate scenarios invoke `/magicspec-dev:test` and reference `skills/magicspec-dev/workflows/test.md` — no scenario uses the legacy pre-rename command form.
  - [ ] All corrected expectations cite their workflow source-of-truth lines (e.g., `run.md` line 104, `init.md` WI-10, `run.md` C25 checklist).
- **Guards tested:** Suite-to-workflow contract integrity (post-correction); guards that the simulation harness itself does not silently re-introduce outdated assertions.

### T205 — Run Diagram Phase-to-Phase Convergence (Plan Not Complete)

- **Workflow:** `run.md` (workflow diagram — convergence)
- **Synthetic State:**
  - Phase 1: all tasks Done. Phase 2: ≥1 Todo task remaining. Plan is NOT complete.
  - RULES.md §7 C3: Sequential mode.
- **Action:** Final Phase 1 task marked Done → Phase Completion (Retro L1 + Changelog L1 + Archive) runs → `Plan Complete?` evaluated.
- **Expected:**
  - [ ] `Plan Complete?` resolves **No**.
  - [ ] Control returns to "Find next Todo task" (next phase) via an explicit `J -->|No| C` diagram edge.
  - [ ] No undefined or terminal state on the phase→phase transition (matches Step 5 Phase Completion + T21).
  - [ ] Phase 2 first Todo task is picked automatically (Zero-Prompt, C9).
- **Guards tested:** Workflow convergence completeness — every decision node (`Plan Complete?`) has all branches defined; no dead-end on incomplete plan.
- **Regression for:** "The Silent Approval" crisis (Improv Mode 2026-06-13); missing `J -->|No|` edge in run.md diagram.

### T206 — Run Checklist Version-Bump Wording Parity

- **Workflow:** `run.md` (Run Completion Checklist ↔ Plan Completion §3)
- **Synthetic State:**
  - Full plan complete; Node.js project with `package.json` version `1.2.0`.
  - Agent reaches the Run Completion Checklist after Plan Completion.
- **Action:** Static scan of `run.md`: compare the Conclusion checklist line against Plan Completion Step 3 (Version Bump).
- **Expected:**
  - [ ] Checklist Conclusion line says the **project** version is bumped (project release file only — never `skills/magicspec/.version`).
  - [ ] Checklist does NOT contain the phrase `engine version bumped`.
  - [ ] Plan Completion Step 3 retains the prohibition: `Do NOT modify skills/magicspec/.version`.
  - [ ] An agent literally executing the checklist bumps `package.json`, never `skills/magicspec/.version` (consistent with T42).
- **Guards tested:** Version Bleed Prevention (checklist-body parity); regression for "The Tampered Twin" crisis (Improv Mode 2026-07-10).

### T207 — Run Select Branch Precedence (Stalled Before Complete)

- **Workflow:** `run.md` (Step 2 — Select)
- **Synthetic State:**
  - TASKS.md Phase 2: 3 tasks `Done`, 1 task `Blocked [!]` (reason recorded), 0 `Todo`, 0 `In Progress`.
  - STATE.md: `**Status:** Active`.
- **Action:** `/magicspec run` invoked; Pre-flight passes.
- **Expected:**
  - [ ] Select evaluates branches strictly in listed order: *Stalled* → *Backlog-Only* → *Complete*.
  - [ ] *Stalled* fires first (0 `Todo`, `Blocked` exist) → **HALT** listing the blocked task with its recorded reason.
  - [ ] *Complete* branch is NOT reached — Phase Completion (Retro L1 + Changelog L1 + Archive) is NOT triggered despite `0 Todo AND 0 In Progress`.
  - [ ] Exactly ONE next step recommended: `/magicspec plan {workspace}`.
- **Guards tested:** Select branch precedence (explicit evaluation order); regression for "The Tampered Twin" crisis (Improv Mode 2026-07-10); complements T11 (all-Blocked stall) and T201 (Backlog-Only before Complete).

### T223 — A QA Failure Records One `Attempts` Line Before `Blocked [!]`, and the Fifth-Entry Cap Drops the Oldest (SC-8)

- **Workflow:** `run.md` (Step 3.5 QA Review, Dead-End Record)
- **Synthetic State:**
  - `T-3A02` is `In Progress`. Its `Verify` command exits 1 with the single finding `expected 4 got 3`.
  - Its tracking entry already holds five `Attempts` items, `a1` (oldest) through `a5`, recorded by earlier sessions.
- **Action:** Step 3.5 runs the `Verify` check, and it fails.
- **Expected:**
  - [ ] **Before** the task is set `Blocked [!]`, exactly one line is added to the entry's `Attempts`, in the required shape: one list item `- {what was tried} → {why it failed}` indented under the field label, a single physical line, carrying the command, its exit status and at most three findings — no raw tool output.
  - [ ] The list then holds **five** items: `a1` is dropped, `a2`–`a5` remain in order, the new item is last (the newest failures are the ones a resuming session is most likely to re-enter).
  - [ ] The field label `- **Attempts:**` stays at column 0 and its items stay indented, so the column-0 readers of `Status` and `Assignment` cannot mistake an item for a field — even an item that quotes one.
  - [ ] Apart from `Attempts`, the `Blocked [!]` transition with its reason and the same reason in `Notes` (as before), nothing in the entry is rewritten — `Assignment`, `Verify` and `Changes` are untouched.
  - [ ] `@role:debugger` is activated on the Blocked Branch **after** the record, not before.
  - [ ] The failure is promoted to `Blocking Constraints` **only** if it would bite unrelated future work; an ordinary episode stays in `Attempts`.
- **Guards tested:** SC-8 dead ends recorded at the moment they occur; the five-entry cap; column-0 field readers safe from indented items; Step 3.5 ordering (record, then block); deliberate promotion to `Blocking Constraints`.
- **Regression for:** a dead end reconstructed later — or never — so a fresh session repeats the failed approach, and an unbounded `Attempts` list bloating the workbook.

### T233 — Steps 3.4, 3.6 and 3.4b Route Every Trigger: a Flagged Task Reaches the Simplify Pass After a Clean Review, and the Simplify Pass Does Not Skip the Instruction Review

- **Workflow:** `run.md` (Steps 3.4, 3.4b, 3.6)
- **Synthetic State (Test A — flag after a clean review):**
  - The selected task is flagged `requires-simplify: true`. Step 3.4 Diff Review returns a clean PASS (no complexity notes). The diff touches only product code.
- **Expected A:**
  - [ ] Step 3.4 routes to 3.6 because of the flag, although the review emitted no complexity notes.
  - [ ] `@role:code-simplifier` runs; a revised diff returns to 3.4.
  - [ ] With no simplification needed the flow continues to 3.4b — whose gate skips a diff with no instruction artifact silently — and then to 3.5.
- **Synthetic State (Test B — complexity notes on an instruction diff):**
  - The diff changes a workflow body (an AI-facing instruction artifact). Step 3.4 returns PASS with complexity notes; Step 3.6 finds nothing to simplify.
- **Expected B:**
  - [ ] After 3.6 the flow passes through 3.4b before 3.5: `@role:prompt-engineer` reviews the changed instruction text.
  - [ ] A FAIL at 3.4b records one `Attempts` line and returns to Step 3.
- **Synthetic State (Test C — control):** an unflagged task, a clean PASS, an instruction-artifact diff.
- **Expected C:**
  - [ ] The flow is 3.4 → 3.4b → 3.5, as before; Step 3.6 is not entered.
- **Guards tested:** routing convergence — every trigger named at Step 3.6 has an inbound edge, and no path reaches 3.5 past a conditional gate the diff qualifies for.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — `requires-simplify` had no inbound edge from a clean PASS, and the complexity-notes path skipped 3.4b.

### T236 — A Completed Phase Continues Into the Next Phase When It Has Todo Tasks, and Otherwise Ends With One `/magicspec plan` Recommendation

- **Workflow:** `run.md` (Step 4 Handoff, Step 5 Phase Completion, Step 2 Select) + `CONSTITUTION.md` §5
- **Synthetic State (Test A — next phase is ready):**
  - Phase 1: its last task is marked `Done`. Phase 2 holds 3 `Todo` tasks whose parents are `Done`. No drift signal, no spec ambiguity.
- **Expected A:**
  - [ ] Step 5 runs in the same invocation: Retro L1, Changelog L1, frontmatter update.
  - [ ] "Phase complete" is not a HALT: the Handoff bullet lists only spec ambiguity and drift signals.
  - [ ] Select picks the first `Todo` task of Phase 2 without a question; `[Auto-Run] Phase 1 complete. …` is narrated.
  - [ ] No "Post-task drift detected" note is emitted; the closing next step names exactly one command, `/magicspec run {workspace}`.
- **Synthetic State (Test B — nothing decomposed behind the phase):**
  - Phase 1 is complete; the plan's next phase has no `Todo` task (its work sits in `## Backlog`).
- **Expected B:**
  - [ ] Phase Completion runs; Select reaches *Backlog-Only* and halts.
  - [ ] Exactly one command is recommended: `/magicspec plan {workspace}` (the `CONSTITUTION.md` §5 trigger "phase complete with nothing to run next").
- **Synthetic State (Test C — control):** during the run `RULES.md` moves ahead of the `TASKS.md` base.
- **Expected C:**
  - [ ] HALT as before, with the single recommendation `/magicspec plan {workspace}`; the drift list in the Handoff bullet is unchanged for `STATUS_DRIFT`, `VERSION_DRIFT` and `RULES > TASKS base`.
- **Guards tested:** Handoff HALT list limited to ambiguity and drift; one recommended command per stop; diagram edge J→C reachable; agreement of `run.md`, `CONSTITUTION.md` §5, T21 and T205.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — the Handoff bullet listed "phase complete" as a halt while the diagram and T21/T205 continued into the next phase.

### T248 — A Stabilizing Task Runs Past the Guards That Demand a Stable Spec; Parity and Phantom Checks Still Apply

- **Workflow:** `run.md` (Logic Guards — Stabilizing exception, Step 1 Spec Stability Spot-Check and File-Header Parity, Step 4 Mid-Run Stability Check)
- **Synthetic State:**
  - `core-l1.md` (Stable); `core-l2.md` (RFC, `Implements: core-l1.md`), demoted by an amendment after its plan was written. Both file headers equal their `INDEX.md` entries.
  - Phase 1 holds one `Todo` task, `T-1A01`, targeting `core-l2.md` and carrying `stabilizes: core-l2.md` (planned by T71 Action A).
- **Action A:** `/magicspec run`.
- **Expected A:**
  - [ ] Quarantine (C12), Spec Stability and the Step 1 Spot-Check do not halt `T-1A01`, though `core-l2.md` is `RFC`: the flag names that spec.
  - [ ] File-Header Parity is still evaluated, and passes.
  - [ ] `T-1A01` is selected and executed; at Step 4 the Mid-Run check takes the status at Task Start (`RFC`) as its baseline, finds it unchanged, and the task goes `Done`. The spec reaching `Stable` during the task would not halt it either.
- **Action B (control — no flag):** the same state, but `T-1A01` carries no `stabilizes:` flag.
- **Expected B:**
  - [ ] The Step 1 Spot-Check → **HALT** before execution: "Spec `core-l2.md` is no longer `Stable`. Run `/magicspec plan {workspace}` to re-evaluate the plan." The exception follows the flag, not the spec.
- **Action C (control — parity):** `T-1A01` carries the flag, but the `core-l2.md` header reads `Status: Draft` while `INDEX.md` reads `RFC`.
- **Expected C:**
  - [ ] File-Header Parity → **HALT** with `STATUS_DRIFT`; the exception does not reach registry integrity.
- **Action D (control — drift mid-run):** as Action A, but an external edit sets `core-l2.md` to `Deprecated` while `T-1A01` executes.
- **Expected D:**
  - [ ] Step 4 Mid-Run check → **HALT** that track: any change since Task Start other than reaching `Stable` halts. Report: "Spec `core-l2.md` (or its parent) demoted or drifted since task began. Task output suspended — run `/magicspec plan {workspace}` to re-evaluate." `T-1A01` is not set `Done`.
- **Action E (Parallel mode — the default):** as Action A, with `@role:orchestrator` dispatching tracks.
- **Expected E:**
  - [ ] The orchestrator's between-dispatch re-read of `INDEX.md` holds `core-l2.md` to its status at the dispatch of `T-1A01` (`RFC`) instead of `Stable`: the track is dispatched, with no `SPEC_DEMOTED` notification.
  - [ ] A dispatch of an unflagged task on a spec that is not `Stable` still halts its track with `SPEC_DEMOTED`.
- **Guards tested:** Stabilizing exception (C12.1) on the execution side, per task and per named spec; File-Header Parity and Phantom Spec stay in force; Mid-Run baseline for a flagged task; the orchestrator's re-read follows the same exception (Parallel is the default mode).
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the `stabilizes:` flag bypassed C12 only while planning; `run.md` then halted the flagged task on its own Quarantine, Spec Stability, Spot-Check and Mid-Run guards, and the orchestrator card's re-read did the same in Parallel mode, so a stabilizing task could be planned but never executed.

### T250 — A `[Bootstrap]` Task Runs Past the Guards That Demand a Stable Spec; Drift and Missing Marker Still Halt

- **Workflow:** `run.md` (Logic Guards — Bootstrap exception, Quarantine C12, Spec Stability; Step 1 Spot-Check; Step 4 Mid-Run Stability Check), `roles/orchestrator.md` (Operating Protocol 5)
- **Synthetic State:**
  - Bootstrap plan, no spec `Stable`: `core-l1.md` (Draft) and `core-l2.md` (Draft, `Implements: core-l1.md`); both file headers equal their `INDEX.md` entries.
  - Phase 1 holds one `Todo` task, `T-1A01`, targeting `core-l2.md` and carrying the `[Bootstrap]` marker; its dependencies are `Done`.
- **Action A:** `/magicspec run`.
- **Expected A:**
  - [ ] The Bootstrap Detection warning is emitted and execution continues (T174).
  - [ ] Quarantine (C12) and Spec Stability do not halt `T-1A01`, although its L1 parent `core-l1.md` is not `Stable`: the task is held to the status the spec and its parent had at Task Start (`Draft`).
  - [ ] At Step 4 the Mid-Run check finds both statuses unchanged and the task goes `Done`; generated artifacts carry the `[Bootstrap]` suffix.
- **Action B (control — no marker):** the same state, but `T-1A01` carries no `[Bootstrap]` marker.
- **Expected B:**
  - [ ] Quarantine (C12) → **HALT** (the parent is not `Stable`); the Step 1 Spot-Check halts it too. The exception follows the marker, not the spec's status.
- **Action C (control — drift mid-run):** as Action A, but an external edit moves `core-l1.md` from `Draft` to `RFC` while `T-1A01` executes.
- **Expected C:**
  - [ ] Mid-Run check → **HALT** that track: any change since Task Start other than reaching `Stable` halts. Report: "Spec `core-l2.md` (or its parent) demoted or drifted since task began. Task output suspended — run `/magicspec plan {workspace}` to re-evaluate." `T-1A01` is not set `Done`.
- **Action D (Parallel mode — the default):** as Action A, with `@role:orchestrator` dispatching tracks.
- **Expected D:**
  - [ ] The orchestrator's between-dispatch re-read holds `core-l2.md` to its status at the dispatch of `T-1A01` (`Draft`): the track is dispatched, with no `SPEC_DEMOTED` notification.
  - [ ] A dispatch of a task without the marker on a spec that is not `Stable` still halts its track with `SPEC_DEMOTED`.
- **Guards tested:** Bootstrap exception on the execution side, per task and by marker; File-Header Parity and Phantom Spec stay in force; Mid-Run baseline; the orchestrator's re-read follows the same exception.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the Bootstrap Exception was stated only in the Step 1 Spot-Check, so an L2 `[Bootstrap]` task was halted by the Quarantine (C12) guard (its `Draft` L1 parent is not `Stable`), and the Mid-Run check and the orchestrator's re-read demanded "still `Stable`" of a spec that never was; T174 passed because it exercised Pre-flight only.

### T256 — Select Takes a Task Left `In Progress` by an Earlier Session Before Any `Todo` Task (Resume Order)

- **Workflow:** `run.md` (Step 2 Select, Step 2b Task Start) + `context.md` §Post-Resolution step 4 (Resume Detection)
- **Synthetic State (Test A — an independent `Todo` task beside the in-flight one):**
  - Phase 2: `T-2A02` has its tracking entry `**Status:** In Progress`, its checklist line `- [ ]` and one `Attempts` line, left by a session that ended mid-task. `T-2B01` is `Todo`, with no parent, in another track.
  - `STATE.md` `Next Action` names `T-2A02`; `resume-state` printed its resume line at the context load. No track of this invocation is running.
- **Action A:** `/magicspec run`.
- **Expected A:**
  - [ ] Select takes `T-2A02`, the task left in flight, before the `Todo` task `T-2B01`: the task the run starts is the task the resume line named.
  - [ ] Task Start finds the entry already `In Progress` and treats it as **resumed**: the status is unchanged, the checklist line stays `- [ ]`, and `Attempts` and `Handoff` are read before an approach is chosen.
  - [ ] `T-2B01` is not started before `T-2A02` is `Done` or `Blocked [!]`.
- **Synthetic State (Test B — nothing else is left):** the phase's last open task is `T-2A02` (`In Progress`); `T-2A03` is `Todo` with parent `T-2A02`; nothing is `Blocked`.
- **Expected B:**
  - [ ] Select takes `T-2A02`: no branch — *Stalled*, *Backlog-Only* or *Complete* — is evaluated, Phase Completion does not run, and nothing halts.
- **Synthetic State (Test C — control, a live track):** Parallel mode (C3); `T-2A02` was started a moment ago by a track of this invocation (`In Progress`) and `@role:orchestrator` looks for the next task.
- **Expected C:**
  - [ ] Select does not take `T-2A02` a second time: only a task no track of this invocation is executing counts as left in flight, so the orchestrator locates a `Todo` task as before.
- **Action D (control — targeted):** `/magicspec run "T-2B01"` in the state of Test A.
- **Expected D:**
  - [ ] The invocation executes `T-2B01`: the in-flight `T-2A02` lies outside the scope the invocation selects, so it is not taken ahead of the named task.
- **Guards tested:** Select order (resume before fresh work) agreeing with SC-9(a)/(d), T221 and the Task Start step; the live-track exclusion in Parallel mode; the scope of targeted execution.
- **Regression for:** "The Stranded Child" crisis (Improv Mode 2026-10-01) — Select located only a `Todo` task, so a run that started beside an independent `Todo` task passed over the very task the resume line had just named, and a phase whose last open task was the in-flight one matched no Select branch.

### T258 — A Spec Ambiguity Found During a Run Ends at Step 4 With the Single `/magicspec plan` Recommendation: No Card, Page or Step Routes the Run to `/magicspec spec`

- **Workflow:** `run.md` (Step 3.5, Step 4 Handoff) + `roles/debugger.md` (Operating Protocol 4) + `docs/run.md` §5.4–5.5 + `CONSTITUTION.md` §5 + `l2-role-cards-execution.md` (the card's mirror)
- **Synthetic State:**
  - `T-1A01` failed its QA review because the spec section it implements is ambiguous. It is set `Blocked [!]` and `@role:debugger` is activated on the Blocked Branch.
- **Action:** the debugger classifies the blocker as (b), a spec ambiguity.
- **Expected:**
  - [ ] The debugger records the ambiguity in the task's `Notes` and stops: it does not hand the session off to the specification workflow.
  - [ ] `run.md` Step 4 ends the run with exactly **one** command, `/magicspec plan {workspace}`; `/magicspec spec` is not named by the run, by the card or by the run documentation page — it appears only inside a `/magicspec plan` HALT (its Pre-flight) or the Stalled Plan report of `/magicspec task` (T257).
  - [ ] The deployed card and its mirror in `l2-role-cards-execution.md` carry the same step 4, word for word.
- **Control (an implementation bug):** the debugger classifies (a): it produces a fix diff and hands it to the test engineer, as before.
- **Guards tested:** card ↔ workflow body ↔ ambient rules ↔ documentation agreement on the one route a spec ambiguity takes; verbatim parity between a deployed card and its mirror.
- **Regression for:** "The Stranded Child" crisis (Improv Mode 2026-10-01) — the debugger card and the run page said "hand off to `spec.md`" / "delegate to `magic.spec`" while `run.md` Step 4, `CONSTITUTION.md` §5 and T34/T141 allow the run only the single `/magicspec task` recommendation.

### T299 — A Finding in a Workflow Other Than `spec` Is Resolved by the Forecast as One `[DR]` Line, Never Asked

- **Workflow:** `run.md` (Input Pass line) with `roles/prompt-engineer.md` (`## Input Pass`, item 5)
- **Synthetic State:** an active phase with two open tasks; the user types `/magicspec run "do the first one, or whichever is the biggest — just the tests"`.
- **Action:** the invocation of `run`.
- **Expected:**
  - [ ] The pass records the ambiguity ("the first one" and "the biggest" can name different tasks; "just the tests" can mean the validation task or the test files) as a finding tagged ambiguity, citing the input words.
  - [ ] It is resolved by the Consequence Forecast, the candidate with the lowest worst-case cost winning, and narrated as one line, `[DR] {decision} — {criterion}. (Override: {command})`; the executed task follows from it.
  - [ ] No question is asked: the invocation neither opens an intake survey (that is `spec` alone) nor waits for an answer.
- **Control:** a `spec` invocation whose idea is incoherent: the finding feeds the intake gate and may open the survey, the one place the engine asks about intent.
- **Guards tested:** IP-5 resolution of findings outside `spec`; C27 questions only for consent, the intake survey and the command intake.
- **Regression for:** none yet — new with the input pass.

### T324 — A Task That Changes Behaviour Updates Its Scenarios; a Stale One Is a Finding

- **Workflow:** `run.md` (Step 3.2, Scenario Upkeep; Step 3.5)
- **Synthetic State:** a task that changes the order of two checkout steps; a scenario still expects the old order, and cites a specification statement that now states the new one.
- **Action:** `/magicspec run`.
- **Expected:**
  - [ ] The scenario is updated in the same task; the finding `scenario out of date` is recorded in the task's `Notes`.
  - [ ] The QA review asks for the updated scenarios before `Done`.
- **Control:** when the specification does not settle the new expectation, the task halts with the spec-ambiguity handoff and the scenario is not guessed.
- **Guards tested:** SM-4; Core Invariant 4 (Handoff).
- **Regression for:** none yet — new with the simulate command.

### T327 — The Simulator-Tester and the Test-Engineer Do Not Replace Each Other

- **Workflow:** `run.md` (Steps 3.2 and 3.5) with `roles/simulator-tester.md` and `roles/test-engineer.md`
- **Synthetic State:** a task whose `Verify` line passes while a scenario that crosses it fails; a second task whose scenarios all pass while its `Verify` line fails.
- **Action:** `/magicspec run` on both tasks, then `/magicspec simulate`.
- **Expected:**
  - [ ] The first task can be `Done` by its `Verify` line; the failing scenario is a finding of `simulate`, not a reason the QA gate blocked.
  - [ ] The second task is `Blocked [!]` by the QA gate whatever its scenarios say.
- **Control:** an interface task is implemented in the designer's stance, but the `coder` card still owns the diff and the review gates stay as they were.
- **Guards tested:** SM-8; UI-7.
- **Regression for:** none yet — new with the simulate command.
