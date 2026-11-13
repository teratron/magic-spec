# Workflow Test Suite — plan

Cases of the area `plan` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T06 — Task New Plan from Stable Specs

- **Workflow:** `plan.md` (the decision) and `task.md` (its application) (Generating Tasks & Plan)
- **Synthetic State:**
  - 3 Stable specs: `auth.md` (L1) → `auth-impl.md` (L2, Implements: auth.md) → `api.md` (L1, unrelated)
  - No PLAN.md, no TASKS.md
  - RULES.md does not contain execution mode
- **Expected:**
  - [ ] All 3 specs read, dependency graph built
  - [ ] Phases proposed: auth.md (L1) → Phase 0/1, auth-impl.md (L2) → Phase 1/2, api.md (L1) → Phase 0/1
  - [ ] L2 spec scheduled AFTER its L1 parent
  - [ ] Execution mode defaults to Parallel (C3) — assumed silently, not saved to RULES.md
  - [ ] PLAN.md created from `skills/magicspec/templates/plan.md`
  - [ ] TASKS.md + phase-1.md created from `skills/magicspec/templates/tasks.md`
- **Guards tested:** Dependency ordering, layer respect, template usage, mode default assumption

### T07 — Plan Hard Dependency Cycle (Implements Chain)

- **Workflow:** `plan.md` (Generating the Plan)
- **Synthetic State:**
  - `auth.md` (Stable L2, Implements: api.md)
  - `api.md` (Stable L2, Implements: auth.md)
  - Hard circular dependency via Implements chain: auth → api → auth
- **Expected:**
  - [ ] Dependency graph construction detects hard-dependency cycle in `Implements:` chain
  - [ ] **HALT** — cycle flagged to user
  - [ ] Proposal: break cycle by downgrading one `Implements` link to `Related Specifications` or splitting spec
  - [ ] No PLAN.md written until cycle resolved
- **Guards tested:** Circular Guard (Semantic Split — hard dependency HALT)

### T08 — Task Phantom Specs with Done Tasks

- **Workflow:** `plan.md` (the decision) and `task.md` (its application) (Updating Tasks & Plan)
- **Synthetic State:**
  - INDEX.md: `auth.md` (Stable), `api.md` (Stable)
  - PLAN.md references `auth.md`, `api.md`, and `secrets.md` (phantom — not in INDEX.md)
  - TASKS.md: T-1A01 (secrets.md, Done), T-1A02 (secrets.md, In Progress), T-1B01 (auth.md, Todo)
- **Expected:**
  - [ ] `secrets.md` flagged as Phantom Spec
  - [ ] T-1A01 (Done) → preserved as Archived Orphan (history intact)
  - [ ] T-1A02 (In Progress, active) → marked `Blocked [!]` with reason: "Phantom Spec `secrets.md`"
  - [ ] T-1B01 (auth.md, Todo) → unaffected
  - [ ] Done work is NOT cancelled
- **Guards tested:** Phantom spec Done-task preservation

### T23 — Plan Selective Planning (C6) with Mixed Statuses

- **Workflow:** `plan.md` (Updating the Plan)
- **Synthetic State:**
  - INDEX.md: 10 specs total — 3 Draft (each fails MVC, so Pre-Planning Stabilization leaves it Draft), 4 RFC, 3 Stable
  - No existing PLAN.md
  - RULES.md §7: C6 active
- **Expected:**
  - [ ] 3 Draft specs → automatically moved to `## Backlog` in PLAN.md (no prompt — C6)
  - [ ] 4 RFC specs → automatically moved to `## Backlog` in PLAN.md (no prompt — C6)
  - [ ] 3 Stable specs → all automatically pulled into active plan phases (no user choice — C6)
  - [ ] PLAN.md contains phases covering all 3 Stable specs
  - [ ] All Draft and RFC in Backlog, not in active phases
  - [ ] No Draft/RFC spec enters active phases without explicit pull
- **Guards tested:** Selective Planning (C6), mixed status handling, zero-prompt automation

### T44 — Stability Downgrade Tracking

- **Workflow:** `plan.md` (the decision) and `task.md` (its application)
- **Synthetic State:**
  - Spec `api.md` was `Stable` and has active tasks (`Done` and `Pending`).
  - The spec receives heavy modifications and is downgraded to `RFC`.
- **Action:** User runs `/magicspec plan` to revalidate the plan, then `/magicspec task` to bring the tasks in line with it.
- **Expected:**
  - [ ] Agent moves `api.md` to Backlog in `PLAN.md` (Demoted Spec, `plan.md` Step 6).
  - [ ] Agent does NOT delete tasks: the `Done` ones keep their tracking entries verbatim; `INDEX.md` is not modified (the demotion was made by `spec.md`).
  - [ ] Then `/magicspec task` applies the decision (`task.md` Step 6): every other task is marked `Blocked [!]` with reason "Spec `api.md` is `RFC`"; C12.1 still lets a stabilizing task through.
- **Guards tested:** Demoted Spec (`plan.md` Step 6 decides, `task.md` Step 6 applies), Backlog Placement, Active Task Preservation, C12.1 bypass; release in T244.

### T53 — Task Quarantine Cascade (C12)

- **Workflow:** `plan.md` (the decision) and `task.md` (its application) (Updating Tasks & Plan)
- **Synthetic State:**
  - `auth-concept.md` (L1, status: RFC)
  - `auth-impl.md` (L2, status: Stable, Implements: auth-concept.md)
  - `PLAN.md` has `auth-impl.md` in Phase 1.
  - `TASKS.md` has task T-1A01 for `auth-impl.md` (Todo).
  - RULES.md v1.12.0 with C12.
- **Action:** Run `/magicspec plan`, then `/magicspec task`
- **Expected:**
  - [ ] Agent identifies that `auth-concept.md` (L1) is not Stable.
  - [ ] **Quarantine Cascade (C12)**: `auth-impl.md` is moved to `## Backlog` in `PLAN.md`.
  - [ ] Task T-1A01 for `auth-impl.md` (Todo) → marked `Blocked [!]` with reason: "L1 parent `auth-concept.md` is `RFC` (C12)" (`task.md` Step 6).
  - [ ] User is notified of the quarantine.
- **Guards tested:** Quarantine Cascade (C12) execution, Downgrade Policy.

### T62 — N-Level Hard Dependency Cycle (Implements Chain)

- **Workflow:** `plan.md`
- **Synthetic State:**
  - `auth.md` (Stable L2, Implements: api.md)
  - `api.md` (Stable L2, Implements: database.md)
  - `database.md` (Stable L2, Implements: auth.md)
  - Hard circular dependency via Implements chain at level 3: auth → api → database → auth
- **Action:** Call `/magicspec plan` to generate a plan.
- **Expected:**
  - [ ] Dependency matrix construction detects hard-dependency cycle (auth -> api -> database -> auth) in `Implements:` chain.
  - [ ] **Circular Guard** detects cycle at level 3.
  - [ ] **HALT** — No PLAN.md is written.
  - [ ] Cycle Resolution: agent identifies the "weakest link" and suggests downgrading one `Implements` to `Related Specifications`.
- **Guards tested:** N-Level Circular Dependency (Semantic Split — hard dependency HALT).

### T66 — Plan Primary Intent Propagation (Cold Start Memory)

- **Workflow:** `plan.md` -> `init.md` (Intent Preservation, Stable-Spec Requirement)
- **Synthetic State:**
  - `.magicspec/` missing.
  - Projects has code.
- **Action:** User prompts: "Plan feature X" (starting `/magicspec plan`).
- **Expected:**
  - [ ] `plan.md` triggers `init.md`; the original intent is memoized before the delegation and the run resumes with "Resuming: 'Plan feature X'" (Core Invariant 3).
  - [ ] The registry is empty after init: Pre-flight reports `Stable specs (0 specs found)` and HALTs (Stable-Spec Requirement) instead of planning an empty registry.
  - [ ] The project has code, so the single recommendation is `/magicspec analyze first-time` (the `init.md` Step 4 indicators), not `/magicspec spec`.
  - [ ] **Crucial**: the HALT report restates the request "Plan feature X", so the intent is NOT lost across the HALT.
- **Guards tested:** Context Continuity, Intent Preservation, Stable-Spec Requirement (T242).

### T69 — Cross-Workspace Name Collision (Source of Truth Guard)

- **Workflow:** `plan.md` / `spec.md`
- **Synthetic State:**
  - `.magicspec/workspace.json`: `default: engine`, secondary: `app`.
  - `.magicspec/engine/specifications/core.md` (Version: 2.0.0, Stable).
  - `.magicspec/app/specifications/core.md` (Version: 1.5.0, Stable) — stale copy.
  - Active workspace: `app`.
- **Action:** User runs `/magicspec plan` in `app`.
- **Expected:**
  - [ ] Agent identifies name collision across workspaces.
  - [ ] **Parity Guard** triggers: Version mismatch detected (2.0.0 vs 1.5.0).
  - [ ] **HALT**: Agent warns about "Source of Truth Drift".
  - [ ] One recommended path, no option menu: run `/magicspec spec` in `engine` (higher version) to reconcile, then re-run `/magicspec plan` (same state as T86).
- **Guards tested:** Cross-Workspace Parity Guard.

### T71 — Quarantine Deadlock (Stabilization Exception)

- **Workflow:** `plan.md` (the decision: Step 6 C12.1 Stabilization Exception, the `[Stabilize]` marker) and `task.md` (its application: Step 4 Stabilizing Tasks, Step 6 C12.1)
- **Synthetic State:**
  - Parent `core-l1.md` (RFC).
  - Child `core-l2.md` (RFC, Quarantined by C12).
  - All tasks for `core-l2.md` are in Backlog/Blocked.
- **Action A:** the user types `/magicspec plan "stabilize core-l2.md — fix the implementation mismatches with its parent"`, then `/magicspec task`.
- **Expected A:**
  - [ ] The directive explicitly asks to stabilize `core-l2.md`, so the plan marks it `[Stabilize]` and every task that targets it carries `stabilizes: core-l2.md` (`task.md` Step 4, from the plan's `[Stabilize]` marker).
  - [ ] **C12.1** applies to the flagged tasks only, and only for the spec the flag names: they are pulled into Phase 1 despite the non-Stable parent.
  - [ ] The flag is the trigger — not a task title and not the agent's reading of intent (C13).
- **Action B:** the user writes "add pagination to core-l2.md" (a new feature on the quarantined spec), then runs `/magicspec plan` and `/magicspec task`.
- **Expected B:**
  - [ ] The plan carries no `[Stabilize]` marker for the spec, so its tasks carry no `stabilizes:` flag and stay quarantined (Backlog, `Blocked [!]` with the C12 reason); nothing is pulled in on the strength of a plausible-sounding title and no question is asked.
- **Guards tested:** C12.1 data trigger (C13), Context-Aware Planning. Planning side of an update only — the `run.md` guards that must let a flagged task through are T248, and the Guided Planning Filter's admission of a spec named by a quoted directive is T249.

### T85 — Intent Preservation Through Cold-Start Delegation Chain

- **Workflow:** `plan.md` → `init.md` (Intent Preservation, Stable-Spec Requirement)
- **Synthetic State:**
  - `.magicspec/` missing
  - Project has existing source code
- **Action:** User says "Plan the payment gateway feature" (starting `/magicspec plan`)
- **Expected:**
  - [ ] `plan.md` detects missing `.magicspec/` → memos intent: "Plan the payment gateway feature"
  - [ ] Delegates to `init.md` → `.magicspec/` created
  - [ ] After the delegation resolves: agent resumes explicitly: "Resuming: 'Plan the payment gateway feature'"
  - [ ] Pre-flight finds no registered spec (`Stable specs (0 specs found)`) → HALT with one recommendation: `/magicspec analyze first-time` (existing codebase)
  - [ ] The HALT report restates the original request, so the intent is NOT lost
- **Guards tested:** Intent Preservation (RE-T66), Stable-Spec Requirement (T242), cross-workflow context continuity

### T86 — Cross-Workspace Name Collision Parity Guard

- **Workflow:** `plan.md` (Pre-flight — Cross-Workspace Parity)
- **Synthetic State:**
  - `workspace.json`: `default: engine`, secondary workspace: `app`
  - `.magicspec/engine/specifications/core.md` Version: 2.0.0 (Stable)
  - `.magicspec/app/specifications/core.md` Version: 1.5.0 (Stable) — stale copy
  - Active workspace: `app`
- **Action:** User runs `/magicspec plan` in `app` workspace
- **Expected:**
  - [ ] Pre-flight reads `workspace.json` → detects >1 workspace
  - [ ] Agent scans both workspaces for identically-named spec files
  - [ ] `core.md` found in both: `engine` v2.0.0, `app` v1.5.0 → version mismatch
  - [ ] **Cross-Workspace Parity Guard → HALT**
  - [ ] Report: "Source of Truth Drift: `core.md` exists in `engine` (v2.0.0) and `app` (v1.5.0). Run `/magicspec spec` in `engine` (higher version) to reconcile, then re-run `/magicspec plan`."
  - [ ] One recommended path — no option menu
  - [ ] No plan generated until user resolves
- **Guards tested:** Cross-Workspace Parity Guard (RE-T69), multi-workspace collision detection, HALT before planning

### T125 — Checklist Consolidation Strategic/Tactical Split

- **Workflow:** `plan.md` + `task.md` + `run.md`
- **Synthetic State:**
  - 2 Stable specs: `auth.md`, `api.md`
  - RULES.md v1.3.0 (contains C10 Checklist Consolidation)
  - templates/plan.md and templates/tasks.md updated
- **Action 1: Generate the plan and the tasks (`plan.md`, then `task.md`)**
- **Expected 1:**
  - [ ] **Pre-flight** (`plan.md`): `node skills/magicspec/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace={active-workspace}`.
    - [ ] **C15 Filter**: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **HALT** ONLY if in-scope files are mismatched.
    - [ ] **File-Header Parity**: For each spec in `INDEX.md`, read the actual file's `Status:` and `Version:` header fields. If either mismatches the corresponding `INDEX.md` entry → **HALT** with `STATUS_DRIFT` or `VERSION_DRIFT`. Report: "Header parity failure on `{file}`: file {field} `{file_val}` ≠ registry `{index_val}`. Run `/magicspec spec` to reconcile spec headers, then re-run `/magicspec plan`." This catches manual edits that bypassed the spec workflow.
    - [ ] **Cross-Workspace Parity**: If `workspace.json` registers >1 workspace, scan for identically-named spec files across workspaces. If any name collision with version mismatch is found → **HALT**. Report: "Source of Truth Drift: `{file}` exists in `{ws-a}` (v{X}) and `{ws-b}` (v{Y}). Run `/magicspec spec` in `{ws-a}` (higher version) to reconcile, then re-run `/magicspec plan`." One recommended path — no option menu.
  - [ ] `PLAN.md` created by `plan.md`: contains high-level entries for `auth.md` and `api.md` with single `[ ]` checkboxes. **No nested atomic tasks.**
  - [ ] `TASKS.md` created by `task.md`: contains **Phase Checklist** with atomic items prefixed with `[T-XXXX]` (e.g., `[ ] [T-1A01] Implement auth login`).
  - [ ] `TASKS.md` details section contains full task blocks.
- **Action 2: Execute task T-1A01 (`run.md`)**
- **Expected 2:**
  - [ ] T-1A01 implementation complete.
  - [ ] **`TASKS.md` Phase Checklist** updated: `[ ]` → `[x]` for T-1A01.
  - [ ] **`PLAN.md` remains unchanged** (since only one task of two for `auth.md` is done).
- **Action 3: Execute final task for auth.md**
- **Expected 3:**
  - [ ] All tasks for `auth.md` marked `[x]` in `TASKS.md`.
  - [ ] Agent recognizes `auth.md` completion.
  - [ ] **`PLAN.md` updated**: `[ ]` → `[x]` for `auth.md` specification.
- **Guards tested:** C10 Strategic/Tactical split, status sync isolation (atomic in TASKS, spec-level in PLAN).

### T127 — Plan Pre-flight File-Header Parity Scan

- **Workflow:** `plan.md`
- **Synthetic State:**
  - `engine/INDEX.md` lists `engine-core.md` as Stable v1.1.0
  - Actual file `engine-core.md` header: `Status: RFC`, `Version: 1.2.0` (manual edit)
  - `engine-automation.md` (L2, Implements: engine-core.md) listed as Stable
- **Action:** `/magicspec plan` triggered to generate plan
- **Expected:**
  - [ ] Pre-flight File-Header Parity detects STATUS_DRIFT on `engine-core.md` (file=RFC ≠ INDEX=Stable)
  - [ ] Pre-flight File-Header Parity detects VERSION_DRIFT on `engine-core.md` (file=1.2.0 ≠ INDEX=1.1.0)
  - [ ] **HALT** before plan generation (Cognitive Guard)
  - [ ] `engine-automation.md` is NOT moved to Backlog yet (drift must be resolved before C12 evaluates)
- **Guards tested:** File-Header Parity (plan.md, Cognitive Guard), STATUS_DRIFT blocks C6/C12 evaluation

### T147 — Plan Argument Routing: Scoped Planning (Mode B)

- **Workflow:** `plan.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `engine/INDEX.md`: 3 Stable specs.
  - `docs/INDEX.md`: 2 Stable specs.
- **Action:** User runs `/magicspec plan docs`
- **Expected:**
  - [ ] Argument parsed: `docs` matches workspace name → **Scoped Planning** (Mode B)
  - [ ] Only `docs/INDEX.md` is read for planning (not engine)
  - [ ] PLAN.md and TASKS.md written to `.magicspec/docs/`
  - [ ] Engine workspace specs are NOT included in the plan
  - [ ] Handoff recommends `/magicspec run docs` (workspace propagated)
- **Guards tested:** Argument Routing (Mode B), Workspace Scope Isolation (C15), Handoff Propagation

### T148 — Plan Argument Routing: Guided Planning with Workspace Fallback (Mode C)

- **Workflow:** `plan.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `engine/INDEX.md`: 3 Stable specs (2 API-related, 1 unrelated).
  - No `MAGIC_WORKSPACE` env var set.
- **Action:** User runs `/magicspec plan "only API specs"`
- **Expected:**
  - [ ] Argument parsed: text does not match any workspace → **Guided Planning** (Mode C)
  - [ ] **Workspace Fallback**: No workspace in arg, no env var → `workspace.json` default = `engine` used
  - [ ] Workspace resolved silently via Core Invariant #1 (Zero-Prompt)
  - [ ] Planning directive "only API specs" applied as filter within `engine` workspace
  - [ ] User is NOT prompted to select a workspace
- **Guards tested:** Argument Routing (Mode C), Workspace Fallback, Zero-Prompt Resolution

### T149 — Plan Argument Routing: Disambiguation (Quoted Workspace Name)

- **Workflow:** `plan.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
- **Action:** User runs `/magicspec plan "engine"`
- **Expected:**
  - [ ] Argument parsed: quoted text → forced directive interpretation (NOT workspace selection)
  - [ ] Workspace resolved via default (`engine`) from `workspace.json`
  - [ ] Text "engine" treated as planning directive, not workspace selector
  - [ ] Agent interprets "engine" as focus/filter term for planning
- **Guards tested:** Disambiguation Rule (quotes override workspace match)

### T161 — Task Cross-Workspace C12 Quarantine

- **Workflow:** `plan.md` (the decision) and `task.md` (its application) (C12 Quarantine)
- **Synthetic State:**
  - Active workspace `docs`. `docs/INDEX.md` references `cli.md` (L2).
  - `cli.md` has `Implements: ../engine/core.md`.
  - `engine/INDEX.md` lists `core.md` (L1) as `Draft`.
- **Action:** Agent runs `/magicspec plan docs`, then `/magicspec task docs`.
- **Expected:**
  - [ ] Agent reads `docs/INDEX.md` AND cross-references `engine/INDEX.md` for the parent.
  - [ ] Agent detects `core.md` is NOT `Stable` in `engine/INDEX.md`.
  - [ ] C12 Quarantine triggered: `cli.md` tasks moved to Backlog.
  - [ ] `cli.md` tasks marked `Blocked [!]` with C12 reason.
- **Guards tested:** Cross-Workspace C12 Quarantine, multi-INDEX lookup.

### T165 — Circular Guard Semantic Split: Soft References Non-Blocking

- **Workflow:** `plan.md` (Core Invariant 7, Circular Guard)
- **Synthetic State:**
  - Two L1 specs: `world-system.md` and `entity-system.md`, each listing the other in `Related Specifications`.
  - No `Implements:` chains between them.
- **Expected:**
  - [ ] No HALT produced — mutual `Related Specifications` references are soft references.
  - [ ] Log contains: `[Cycle-Info] {N} mutual references detected in Related Specifications (non-blocking).`
  - [ ] Planning proceeds to Step 3 (Analyze).
- **Guards tested:** Circular Guard Semantic Split.

### T166 — Circular Guard Semantic Split: Hard Dependency Cycle HALT

- **Workflow:** `plan.md` (Core Invariant 7, Circular Guard)
- **Synthetic State:**
  - L2 spec `a-go.md` with `Implements: b.md`.
  - L2 spec `b-go.md` with `Implements: a.md` (erroneous cycle).
- **Expected:**
  - [ ] HALT produced — hard-dependency cycle detected in `Implements:` chain.
  - [ ] Cycle Resolution suggestion identifies the "weakest link" edge.
- **Guards tested:** Circular Guard Semantic Split (Hard Dependencies).

### T167 — Pre-Planning Stabilization: L1 Before L2 Order

- **Workflow:** `plan.md` (Step 2, Pre-Planning Stabilization)
- **Synthetic State:**
  - L1 `world-system.md` (Draft, has Overview + Core Invariants).
  - L2 `world-system-go.md` (Draft, `Implements: world-system.md`, has Overview + design content).
- **Expected:**
  - [ ] L1 `world-system.md` promoted to Stable first.
  - [ ] L2 `world-system-go.md` promoted to Stable after L1 parent is Stable.
  - [ ] Report: `[Pre-Plan] 2 specs promoted to Stable, 0 remain Draft.`
- **Guards tested:** Pre-Planning Stabilization, MVC, Layer Order.

### T168 — Pre-Planning Stabilization: MVC Failure Keeps Draft

- **Workflow:** `plan.md` (Step 2, Pre-Planning Stabilization)
- **Synthetic State:**
  - L1 `empty-spec.md` (Draft, has only title — no Overview, no design sections).
- **Expected:**
  - [ ] Spec remains Draft.
  - [ ] Report: `[Batch-Skip] empty-spec.md: MVC failed — missing Overview.`
- **Guards tested:** MVC.

### T169 — Pre-Planning Stabilization: Non-Standard Layer MVC

- **Workflow:** `plan.md` (Step 2, Pre-Planning Stabilization) + `spec.md` (MVC definition)
- **Synthetic State:**
  - `benchmark-spec.md` (Layer: test, Draft, has Overview + `## 1. Benchmark Categories` with content).
- **Expected:**
  - [ ] Spec promoted to Stable — non-standard layer MVC satisfied (Overview + one numbered section).
  - [ ] No error about missing `Core Invariants` or `Invariant Compliance`.
- **Guards tested:** MVC (non-standard layer handling).

### T170 — C6 Bootstrap Exception Activation

- **Workflow:** `plan.md` (C6 Bootstrap Exception)
- **Synthetic State:**
  - All specs Draft, Pre-Planning Stabilization promoted 0 (all fail MVC).
  - No prior `PLAN.md` exists.
  - 5 specs pass MVC (Overview + design section) but remain Draft due to RULES conflict.
- **Expected:**
  - [ ] Bootstrap Mode activated.
  - [ ] Draft specs passing MVC are planned with `[Bootstrap]` marker.
  - [ ] Report: `[Bootstrap Plan] 5 Draft specs planned tentatively.`
- **Guards tested:** C6 Bootstrap Exception.

### T171 — C6 Bootstrap Exception Not Triggered When Stable Exists

- **Workflow:** `plan.md` (C6 Bootstrap Exception)
- **Synthetic State:**
  - 1 spec Stable (promoted by Pre-Planning Stabilization), 10 Draft.
  - Prior `PLAN.md` exists.
- **Expected:**
  - [ ] Bootstrap Mode NOT activated (≥1 spec is Stable).
  - [ ] Normal C6 flow: 1 Stable → active plan, 10 Draft → Backlog.
- **Guards tested:** C6, Bootstrap Exception deactivation.

### T172 — Field Normalization: L1 Reference to Implements

- **Workflow:** `plan.md` (Step 2, Field Normalization)
- **Synthetic State:**
  - L2 `example-go.md` with header field `**L1 Reference:** example.md` instead of `**Implements:**`.
- **Expected:**
  - [ ] Field auto-renamed to `**Implements:** example.md`.
  - [ ] Log: `[Normalize] example-go.md: 'L1 Reference' → 'Implements'.`
- **Guards tested:** Field Normalization.

### T173 — Cross-Workspace Batch Stabilization Order

- **Workflow:** `plan.md` (Step 2, workspace order)
- **Synthetic State:**
  - `workspace.json` with default=`main`, second workspace=`editor`.
  - Editor L1 spec references main L1 spec via `Related Specifications` (soft — non-blocking).
  - Both specs are Draft, both pass MVC.
- **Expected:**
  - [ ] `main` workspace processed first (default).
  - [ ] `editor` workspace processed second.
  - [ ] Both promoted — soft cross-workspace references don't block.
- **Guards tested:** Workspace processing order, cross-workspace soft references.

### T177 — Plan Cross-Workspace Parent Header Parity

- **Workflow:** `plan.md` (Step 1 — Pre-flight, Cross-Workspace parity)
- **Synthetic State:**
  - Workspace `docs` active. `docs/INDEX.md` has `cli.md` (L2, Implements: engine/l1-core.md).
  - `engine/INDEX.md` says `l1-core.md` is `Stable` (v1.0.0).
  - File `engine/specifications/l1-core.md` has header `Status: Draft` or `Version: v1.1.0` (Local Drift).
- **Action:** `/magicspec plan docs`
- **Expected:**
  - [ ] Agent builds dependency graph, identifies `engine/l1-core.md` as parent.
  - [ ] Agent reads `engine/INDEX.md` AND `engine/specifications/l1-core.md` header.
  - [ ] Agent detects `STATUS_DRIFT` or `VERSION_DRIFT` in the parent spec.
  - [ ] **HALT** with report: "Header parity failure on parent spec `engine/l1-core.md`... Run `/magicspec spec` to reconcile, then re-run `/magicspec plan`."
- **Guards tested:** Cross-Workspace Header Parity, multi-workspace pre-flight integrity.

### T178 — Plan Soft-Reference Cycle Does Not Block Planning (RE-4 Regression)

- **Workflow:** `plan.md` (Generating the Plan)
- **Synthetic State:**
  - `auth.md` (Stable L1, Related Specifications: api.md)
  - `api.md` (Stable L1, Related Specifications: auth.md)
  - Mutual soft reference cycle: auth ↔ api (via `Related Specifications` only, no `Implements:` chain)
- **Action:** Call `/magicspec plan` to generate a plan.
- **Expected:**
  - [ ] Dependency graph construction detects mutual references in `Related Specifications`
  - [ ] **No HALT** — soft reference cycles are non-blocking per Semantic Split
  - [ ] Log contains: `[Cycle-Info] 1 mutual references detected in Related Specifications (non-blocking).`
  - [ ] Planning proceeds normally: both specs placed into active phases
  - [ ] PLAN.md written successfully
- **Guards tested:** Circular Guard Semantic Split — soft references non-blocking (regression for T07/T62 fix)

### T182 — Plan and Task CONTEXT.md Regeneration Step Executed (RE-2 Regression)

- **Workflow:** `plan.md` (the decision) and `task.md` (its application) (Context Regeneration step)
- **Synthetic State:**
  - 2 Stable specs in `engine` workspace
  - No existing PLAN.md or TASKS.md
- **Action:** `/magicspec plan engine`, then `/magicspec task engine`
- **Expected:**
  - [ ] Plan Write-back: PLAN.md written by `plan`; TASKS.md and the phase file by `task`
  - [ ] **Context Regeneration**: `node skills/magicspec/scripts/executor.js generate-context --workspace=engine` executed after each write
  - [ ] CONTEXT.md file created or updated in `.magicspec/engine/`
  - [ ] Completion Checklist item "CONTEXT.md regenerated" verifiable
- **Guards tested:** Context Regeneration as explicit workflow step (RE-2 fix), diagram-text parity

### T183 — C6 No Tier-Based Behavior Divergence (RE-3 Regression)

- **Workflow:** `plan.md` (C6 — Autonomous Selective Planning)
- **Synthetic State:**
  - `RULES.md` v1.4.0+ (C6 without "Strong/Weak Tier" qualifier)
  - 3 Stable specs, 2 Draft specs (each fails MVC, so Pre-Planning Stabilization leaves it Draft)
- **Action:** `/magicspec plan`
- **Expected:**
  - [ ] C6 applied: 3 Stable → active plan, 2 Draft → Backlog
  - [ ] Agent does NOT reference "Strong Tier" or "Weak Tier" in its reasoning
  - [ ] Agent does NOT modify guard behavior based on self-assessed model capability
  - [ ] All structural validation guards (check-prerequisites, File-Header Parity) run identically
- **Guards tested:** C6 deterministic behavior (RE-3 fix), no tier-based divergence

### T194 — Suite Test T06 Expects Mode Assumed Not Saved (Regression)

- **Workflow:** `plan.md` (Generating the Plan)
- **Synthetic State:**
  - Same as T06: 3 Stable specs, no PLAN.md, RULES.md without execution mode
- **Action:** `/magicspec plan`
- **Expected:**
  - [ ] Execution mode defaults to Parallel (C3) — assumed silently per `plan.md` §6
  - [ ] Agent does NOT write mode to RULES.md §7 (no "mode persistence" behavior)
  - [ ] Planning proceeds without prompting about mode
- **Guards tested:** Mode assumption semantics (simulate fix v1.5.146), plan.md §6 compliance

### T200 — Plan T4 Queued on Cross-Workspace Pre-flight HALT

- **Workflow:** `plan.md` (Step 1 — Pre-flight, Cross-Workspace Parent Header Parity + T4 Queue)
- **Synthetic State:**
  - Active workspace: `docs`. `docs/INDEX.md` has `cli.md` (L2, `Implements: engine/l1-core.md`).
  - `engine/INDEX.md` says `l1-core.md` is `Stable v1.0.0`.
  - `engine/specifications/l1-core.md` file header: `Status: Draft`, `Version: 1.1.0` (manual external edit — STATUS_DRIFT + VERSION_DRIFT).
  - `RULES.md` v1.4.0, no plugin lifecycle rule.
- **Action:** `/magicspec plan docs "add plugin hooks. Remember that all docs plugins must register lifecycle via manifest."`
- **Expected:**
  - [ ] Pre-flight Cross-Workspace Parent Header Parity detects STATUS_DRIFT + VERSION_DRIFT on `engine/l1-core.md`
  - [ ] **HALT** before plan generation
  - [ ] T4 trigger detected in directive arg ("Remember that...")
  - [ ] Agent acknowledges T4: "T4 rule detected — queued pending cross-workspace parent drift resolution. Will be handed to the Operational Logic of `rule.md` after resolution."
  - [ ] No write to `RULES.md`, no plan generation
  - [ ] After user resolves drift via `/magicspec spec`: rule applied, plan generation re-attempted on subsequent `/magicspec plan` invocation
- **Guards tested:** T4 Queue (Cross-Workflow), Cross-Workspace Parent Header Parity, atomic HALT preserves embedded T4

### T213 — Plan Guided Planning Directive Filter Enforcement

- **Workflow:** `plan.md` (Guided Planning — directive-to-selection wiring)
- **Synthetic State:**
  - `engine` workspace has 5 `Stable` specs: `auth.md`, `payments.md`, `ui-theme.md`, `logging.md`, `metrics.md`.
  - No `PLAN.md` exists yet.
- **Action:** `/magicspec plan "only payments and auth"`
- **Expected:**
  - [ ] Argument Routing detects Guided Planning (Mode C) — text matches no workspace name.
  - [ ] **Guided Planning Filter** restricts C6 selection to `Stable` specs matching the directive: `auth.md`, `payments.md` selected.
  - [ ] `ui-theme.md`, `logging.md`, `metrics.md` — `Stable` but non-matching — are left untouched in their current placement, NOT force-moved to Backlog and NOT silently included.
  - [ ] `PLAN.md` is written containing phases for `auth.md` and `payments.md` only.
- **Guards tested:** Guided Planning Filter (previously undocumented / unimplemented in Steps 1–8; regression for T148/T149 gap found in Improv Mode simulation 2026-09-17, "The Discarded Directive").

### T214 — Plan Guided Planning Directive Matches Zero Specs

- **Workflow:** `plan.md` (Guided Planning — zero-match HALT)
- **Synthetic State:**
  - `engine` workspace has 3 `Stable` specs, none related to "mobile".
- **Action:** `/magicspec plan "plan the new mobile-client offline sync"`
- **Expected:**
  - [ ] Directive parsed and matched against all registered spec titles/filenames/content → 0 matches.
  - [ ] **HALT**: `"Could not map planning directive 'plan the new mobile-client offline sync' to any registered spec. Run /magicspec plan {workspace} for full planning, or author it first with /magicspec spec."`
  - [ ] Agent does NOT silently fall back to full C6 Autonomous Selection (would discard user intent silently).
  - [ ] No `PLAN.md`/`TASKS.md` written from this invocation.
- **Guards tested:** Guided Planning zero-match fallback (mirrors `analyze.md` Mode D's existing "Could not map focus" HALT pattern); regression for T148/T149 gap.

### T217 — Guided Planning Filter Applies to Bootstrap Mode

- **Workflow:** `plan.md` (Guided Planning Filter × C6 Bootstrap Exception interaction)
- **Synthetic State:**
  - `engine` workspace: 4 specs, ALL `Draft`, all pass MVC (Overview + design section) — none reach `Stable` after Pre-Planning Stabilization (e.g. all blocked by a shared `RULES.md` conflict).
  - No prior `PLAN.md` exists (Bootstrap Mode eligible).
  - Specs: `auth.md`, `payments.md`, `ui-theme.md`, `logging.md`.
- **Action:** `/magicspec plan "only payments and auth"`
- **Expected:**
  - [ ] Pre-Planning Stabilization promotes 0 specs to Stable (all remain Draft) → C6 Bootstrap Exception activates.
  - [ ] **Guided Planning Filter** applies to the Bootstrap Draft-spec pull: only `payments.md` and `auth.md` (directive matches) are planned with `[Bootstrap]` marker.
  - [ ] `ui-theme.md` and `logging.md` — Draft, MVC-passing, but non-matching — are NOT included in the Bootstrap plan.
  - [ ] `PLAN.md` (`[Bootstrap Plan]`) contains phases for `auth.md` and `payments.md` only.
- **Guards tested:** Guided Planning Filter × C6 Bootstrap Exception interaction (regression for the gap found in `/magicspec-dev:test test`, 2026-09-17 — "The Filter That Forgot Bootstrap").

### T218 — Template C6 Wording Matches plan.md Autonomous Behavior (Constitution/Engine Parity)

- **Workflow:** `plan.md` (§7 Architectural Logic — Autonomous Selection C6) vs `skills/magicspec/templates/rules.md` (§7 C6)
- **Synthetic State:** Fresh project just ran `init` — `.magicspec/RULES.md` seeded from `skills/magicspec/templates/rules.md`.
- **Action:** Static scan comparing the shipped C6 template wording against `plan.md`'s actual C6 implementation.
- **Expected:**
  - [ ] Template C6 text does NOT contain "agent asks which ones to pull" or any phrase implying a user prompt for Stable specs.
  - [ ] Template C6 text does NOT contain "surfaced to user" for RFC specs.
  - [ ] Template C6 text states Draft AND RFC specs both move to Backlog without user input, matching `plan.md`'s "Move Draft/RFC to Backlog. No user prompt...".
  - [ ] Template C6 text states Stable specs are auto-pulled into the active plan, matching `plan.md`'s "auto-pull ALL Stable specs...No user prompt unless a priority conflict is detected."
- **Guards tested:** Constitution/Engine parity (shipped template must not misdescribe actual autonomous behavior to new users); regression for the "Stale Selective Planning" drift found via `/magicspec-dev:test test`, 2026-09-17.

### T232 — A Verb the Engine Tells the User to Run Resolves to a Declared Argument Form (The Undeclared Verb)

- **Workflow:** `plan.md` and `task.md` (Argument Routing) + `run.md` (Core Invariant 4 Sync, Spec Stability, Mid-Run Stability Check) + `check-prerequisites.js` (`remedy` strings)
- **Synthetic State (Test A — routing):**
  - `workspace.json` registers `engine` (default) and `docs`. `engine` holds 5 `Stable` specs; none has a filename or title naming an update; a plan exists.
  - `RULES.md` is v1.4.7; `TASKS.md` records `Based on RULES: 1.4.6`.
- **Action A:** `/magicspec run engine` — the Sync guard ends the run naming `/magicspec plan engine`; the user types it, then `/magicspec task engine`.
- **Expected A:**
  - [ ] The named command carries only a workspace name, a declared form of `plan` (Scoped revalidation): the mode is not Guided Planning.
  - [ ] No directive filter runs — no `Could not map planning directive` HALT, and no narrowing of the pass to specs matching a word.
  - [ ] All 5 `Stable` specs are re-evaluated (C12 quarantine, phantom specs); `PLAN.md` records `Based on RULES: 1.4.7`; `task` decomposes from that plan and `TASKS.md` records `Based on RULES: 1.4.7`; `/magicspec run` proceeds.
- **Synthetic State (Test B — scope and quoting):** the same project.
- **Action B:** `/magicspec task docs update`, then `/magicspec task "update"`, then `/magicspec plan "update"`.
- **Expected B:**
  - [ ] `docs update` is the Plan alias scoped to `docs` (workspace token first, keyword second): it runs `/magicspec plan docs` and says so; `engine` is untouched.
  - [ ] The quoted `task "update"` is a decomposition directive — the quote forces directive interpretation — so no plan revalidation runs.
  - [ ] `plan "update"` is a Guided Planning directive and, matching no spec, ends in the zero-match HALT.
- **Synthetic State (Test C — static scan):** shipped text and script output.
- **Action C:** scan `skills/magicspec/workflows/*.md`, `skills/magicspec/references/rules/*.md` and `docs/*.md`, and the `remedy` strings in `skills/magicspec/scripts/check-prerequisites.js`, for `/magicspec plan {word}` and `/magicspec task {word}` forms.
- **Expected C:**
  - [ ] Every `{word}` is a declared argument form: none, a workspace name, `update` (of `task` alone), or a quoted directive. No undeclared unquoted word (`amend`, `sync`, …) is advertised.
  - [ ] The routing tables of `workflows/plan.md` and `workflows/task.md` and the pages `docs/plan.md` and `docs/task.md` list the same argument forms.
- **Guards tested:** Argument Routing reserved keyword (same pattern as `first-time` in `analyze.md`); Guided Planning Filter reach; verb-to-interface parity between the engine's own remedies and its declared arguments; C13 (no reliance on agent judgment for an undeclared token).
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — once the Guided Planning Filter was wired into routing (T213/T214), the remedy the engine itself names for a stale plan (`magic.task update`: three `run.md` lines, one `rule.md` line, three script remedies) became a directive that matches no spec — a zero-match HALT on the recovery path; `(Adjust: /magicspec task amend)` in the auto-plan narration was the same defect.

### T242 — Pre-flight Treats a Draft-Only Registry as Plannable and an Empty One as a Single-Recommendation HALT (Stable-Spec Requirement)

- **Workflow:** `plan.md` (Step 1 — `--require-specs`, Step 2, Core Invariant 7 C6 Bootstrap Exception), `check-prerequisites.js`
- **Synthetic State (Test A — Draft-only):**
  - 4 specs, all `Draft`, all passing MVC; no prior `PLAN.md`.
- **Action A:** `/magicspec plan`
- **Expected A:**
  - [ ] `check-prerequisites --require-specs` reports `missing_required: ["Stable specs (only Draft/RFC found)"]` and `ok: false` — and this is **not** a HALT.
  - [ ] Step 2 runs: the specs that pass the Trust Mode criteria are promoted; if none reach `Stable`, the C6 Bootstrap Exception plans them with `[Bootstrap]` (T170).
- **Synthetic State (Test B — empty registry, greenfield):**
  - `INDEX.md` lists no spec; the project has no `package.json`, `pyproject.toml`, `src/` or `lib/`.
- **Action B:** `/magicspec plan "plan the billing module"`
- **Expected B:**
  - [ ] `Stable specs (0 specs found)` → **HALT** with "No specifications are registered. Run `/magicspec spec` to author the first one, then re-run `/magicspec plan`." — exactly one recommended command.
  - [ ] The report restates the request ("plan the billing module").
  - [ ] No `PLAN.md` or `TASKS.md` is written.
- **Synthetic State (Test C — empty registry, existing codebase):** as Test B, but the project has `package.json` and `src/`.
- **Expected C:**
  - [ ] The same HALT with the single recommendation `/magicspec analyze first-time`; `/magicspec spec` is not named.
- **Guards tested:** the Stable-Spec Requirement branch of Pre-flight; DA-8 (one recommended path per HALT); Intent Preservation across a HALT.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — Step 1 asked for `Stable specs` before Step 2 could create any and defined no branch for the answer, so Draft-only registries (the Bootstrap case by construction) and empty ones had no defined outcome.

### T244 — A Demoted Spec Is Backlogged With Its Open Tasks Blocked, and a Re-Stabilized One Gets Them Back (Demoted Spec, Quarantine Release)

- **Workflow:** `plan.md` (the decision: Step 6 — Demoted Spec, Quarantine Release) and `task.md` (its application: Step 6 — blocking and releasing; Plan Write-back), `run.md` (Step 2 Select)
- **Synthetic State:**
  - `payments.md` (Stable) is planned in Phase 1: `T-1A01` `Done`, `T-1A02` `Todo`, `T-1A03` `Blocked [!]` for an unrelated reason ("waiting for a vendor key"). `payments.md` is then amended to `RFC` through `spec.md`.
- **Action 1:** `/magicspec plan`, then `/magicspec task`
- **Expected 1:**
  - [ ] `plan` moves `payments.md` to `## Backlog`; `INDEX.md` is not modified.
  - [ ] `T-1A01` keeps its `Done` entry, `Changes` and `Attempts` verbatim.
  - [ ] `T-1A02` becomes `Blocked [!]` with reason "Spec `payments.md` is `RFC`"; `T-1A03` keeps its own reason.
- **Action 2:** `payments.md` is amended and returns to `Stable`; `/magicspec plan` and `/magicspec task` run again.
- **Expected 2:**
  - [ ] `plan` returns `payments.md` to the active plan under C6.
  - [ ] `task` returns `T-1A02` to `Todo` (only the quarantine reason releases); `T-1A03` stays `Blocked [!]`.
  - [ ] Nothing else in a surviving entry changes: other statuses, `Changes` and `Attempts` stay verbatim.
  - [ ] `/magicspec run` then selects `T-1A02` instead of halting in the *Stalled* branch for good.
- **Guards tested:** Demoted Spec; Quarantine Release as the way back out of a Step 6 block (`task.md` lists it beside C12, Demoted Spec and Phantom Specs as the only status transitions of a surviving entry); the Select *Stalled* branch is not a dead end.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — `task.md` handled a demoted parent (C12) but not a demoted spec itself, and nothing ever released a quarantined task, so a spec that regained `Stable` kept its tasks `Blocked` and `/magicspec run` halted on them for good.

### T249 — The Guided Planning Filter Admits a Spec Named for Stabilization Whatever Its Status

- **Workflow:** `plan.md` (Core Invariant 7 — Autonomous Selection, Guided Planning Filter, Stabilization interaction; Step 6 C12.1) and `task.md` (Step 4 Stabilizing Tasks)
- **Synthetic State:**
  - `engine` workspace: `auth-l2.md` (Stable, in Phase 1 of `PLAN.md`) and `core-l2.md` (RFC, in `## Backlog`), both registered in `INDEX.md`; `PLAN.md` exists, so Bootstrap is not eligible.
- **Action A:** `/magicspec plan engine "stabilize core-l2.md — fix its mismatches with the parent"`.
- **Expected A:**
  - [ ] The directive is the explicit request to stabilize `core-l2.md` (the `[Stabilize]` marker), so the filter admits that spec although it is `RFC`: no "Could not map planning directive" HALT.
  - [ ] The tasks planned for `core-l2.md` carry `stabilizes: core-l2.md`; `auth-l2.md` does not match the directive and stays untouched in its Phase 1 placement.
- **Action B (control — not a stabilization request):** `/magicspec plan engine "add pagination to core-l2.md"`.
- **Expected B:**
  - [ ] The directive names `core-l2.md` but does not ask to stabilize or fix it, so no status is overridden: the filter matches `Stable` specs only, finds none, and **HALT**s with "Could not map planning directive 'add pagination to core-l2.md' to any registered spec." A spec's name in a directive never admits it on its own (C13).
- **Action C (control — unregistered spec):** `/magicspec plan engine "stabilize ghost.md"` — `ghost.md` is in no `INDEX.md`.
- **Expected C:**
  - [ ] Admission waives the status, not registration: zero matches → the same **HALT**.
- **Guards tested:** Stabilization interaction (C12.1) of the Guided Planning Filter; the zero-match HALT stays for non-stabilization directives and unregistered specs; C13 (the flag trigger is an explicit request, never a title or a filename match).
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the filter matched `Stable` specs only, so a directive naming a non-Stable spec to stabilize hit the zero-match HALT before any flagged task could be planned.

### T251 — The Sync Step Leaves a `[Bootstrap]` Task Alone While Its Spec Is Draft

- **Workflow:** `plan.md` (the decision: Step 6 — Bootstrap Plan, C12 Quarantine, Demoted Spec) and `task.md` (its application: Step 6 — Bootstrap exemption, the blocks)
- **Synthetic State:**
  - A Bootstrap plan exists: `core-l1.md` (Draft) and `core-l2.md` (Draft, `Implements: core-l1.md`), their Phase 1 tasks carrying the `[Bootstrap]` marker; no spec is `Stable`.
- **Action A:** `/magicspec plan`, then `/magicspec task`.
- **Expected A:**
  - [ ] Pre-Planning Stabilization evaluates the Draft specs as usual (Trust Mode criteria).
  - [ ] `plan.md` Step 6 does not apply C12 Quarantine to the tasks of `core-l2.md` (its parent is `Draft`, the tasks carry the marker) and does not apply Demoted Spec: they stay `Todo` in Phase 1, nothing moves to `## Backlog`, nothing is set `Blocked [!]`.
- **Action B (control — the spec leaves Draft):** an amendment moves `core-l2.md` to `RFC`.
- **Expected B:**
  - [ ] Demoted Spec applies: `core-l2.md` moves to `## Backlog` and its tasks not already blocked become `Blocked [!]` ("Spec `core-l2.md` is `RFC`") — the exception ended when the spec left `Draft`.
- **Action C (control — no marker):** a plan that is not a Bootstrap plan (another spec is `Stable`); a `core-l2.md` task without the marker has the `Draft` parent `core-l1.md`.
- **Expected C:**
  - [ ] C12 Quarantine applies as before: Backlog, `Blocked [!]` with "L1 parent `core-l1.md` is `Draft` (C12)".
- **Guards tested:** the Bootstrap exemption in Step 6 of both bodies placed before the rules it limits; C12 Quarantine and Demoted Spec unchanged for tasks without the marker; the exception ends with `Draft`.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the old `task.md` Step 8 read "L1 parent is not `Stable`", which by the letter matches every L2 spec of a Bootstrap plan, so `/magicspec task update` would have returned the tentative plan's L2 tasks to Backlog as blocked.

### T284 — `plan` Ends at Its Boundary: It Writes the Plan Only and Names `task`

- **Workflow:** `plan.md` (Plan Write-back, Handoffs, Finalization Protocol)
- **Synthetic State:** workspace `engine` holds three `Stable` specifications; `PLAN.md` is missing; `TASKS.md` and `tasks/` do not exist.
- **Action:** `/magicspec plan engine`.
- **Expected:**
  - [ ] `PLAN.md` is written with its phases, the order and the reason for it, and the header records the registry version and the constitution version it was written against.
  - [ ] `TASKS.md`, the phase workbooks and every tracking entry are not created or touched (PL-1); no atomic checklist item is written into `PLAN.md`.
  - [ ] The run ends with `Next: /magicspec task engine — standard reasoning` and starts no decomposition.
- **Control:** a revalidation that changes nothing the active or next phase holds: `plan` does not name `/magicspec task` by default; it names the step the plan state computes (PL-5).
- **Guards tested:** PL-1 one owner of `PLAN.md`; PL-9 the plan is complete for the next stage and records its versions; PL-5 the handoff condition; PS-1.
- **Regression for:** none yet — new with the plan stage.

### T295 — A Plan Finding That Needs a Specification Change Halts Once With `/magicspec spec`

- **Workflow:** `plan.md` (Planning Audit, Plan check) with `roles/planner.md` (step 6)
- **Synthetic State:** two registered workspaces. The draft plan of workspace `app` schedules the specification of a shared sign-in mechanic in Phase 2; workspace `api`'s plan already delivers it in an archived phase, but the two specifications define the session lifetime differently (30 minutes in one, 24 hours in the other).
- **Action:** `/magicspec plan app`.
- **Expected:**
  - [ ] The check compares the draft with the other phases of the plan, the plan of `api` and the archived deliveries; it reads only the matching entries.
  - [ ] The duplicated work is a `duplicate definition` and is assigned to one workspace and referenced from the other inside the plan, with no halt.
  - [ ] The differing session lifetimes are a `contradiction` whose resolution changes a specification; the planner does not resolve it (the plan writes no specification): `plan` halts once, before `PLAN.md` is written, with *"Plan check: {file-a} §{x} ↔ {file-b} §{y} — contradiction; resolving it changes a specification. Run `/magicspec spec`, then re-run `/magicspec plan`."*, both sides quoted.
  - [ ] Exactly one recommendation is printed, `/magicspec spec`; neither `analyze` nor a menu is offered, and `PLAN.md` is unchanged.
- **Control:** the finding is an ordering conflict inside the draft (a consumer scheduled before its producer): it is resolved by reordering, with no halt.
- **Guards tested:** CH-5 plan check before write-back; PL-1 the plan workflow writes no specification; one recommended path.
- **Regression for:** none yet — new with the coherence check.

### T323 — Planning Lists the Scenarios a Phase Writes and Decomposition Writes Them

- **Workflow:** `plan.md` (Step 5, Scenario list), `task.md` (Step 4) with `roles/planner.md` (step 7)
- **Synthetic State:** a phase that adds a checkout flow; a second phase that only renames an internal module.
- **Action A:** `/magicspec plan`.
- **Expected A:**
  - [ ] The checkout phase's entry carries `- Scenarios: {area} — {titles}` written with `@role:simulator-tester`; the rename phase lists none and records no finding.
  - [ ] A checkout phase without the list is a planning finding resolved before the plan is written.
- **Action B:** `/magicspec task`.
- **Expected B:**
  - [ ] The checkout track's validation task writes the listed scenarios and names the scenario file in its `Verify` line; the rename phase gets no scenario task.
- **Control:** a phase with user-facing behaviour whose plan entry lists no scenario is a decomposition finding that goes back to `plan` (Findings Go Back), and the other phases are still decomposed.
- **Guards tested:** SM-3; PL-1; PL-8.
- **Regression for:** none yet — new with the simulate command.

### T328 — Finalization Names the Workflow in the Printed Form on Both Outcomes

- **Workflow:** `plan.md` and `rule.md` (Finalization Protocol) with `scripts/finalize.js`
- **Synthetic State:** a workspace with no change since the last snapshot; then one with a changed constitution.
- **Action A:** `/magicspec plan`, whose finalization finds nothing significant.
- **Expected A:**
  - [ ] The skip line reads `No significant changes detected for /magicspec plan on workspace '{workspace}'`; the retired dotted name `magic.plan` appears nowhere in the output.
- **Action B:** `/magicspec rule`, whose finalization counts the constitution change.
- **Expected B:**
  - [ ] The result table's workflow row reads `/magicspec rule`, never `magic.rule`.
- **Control:** the whitelist keys the script matches internally keep their form; only the text the user reads changes.
- **Guards tested:** CS-2 (one command, one printed form).
- **Regression for:** the finalization output named the command by the pre-3.0 dotted form.
