# Workflow Test Suite

**Version:** 1.9.93
**Purpose:** Regression testing for Magic SDD engine workflows.
**Trigger:** `/magic.dev.simulate test`

## How to Run

The agent reads this file, simulates each test scenario against the target workflow's logic, and reports PASS/FAIL for each expected outcome. No real files are created — all state is synthetic.

### Pass Criteria

A test **passes** if the workflow logic (as written in `.magic/*.md`) would produce the expected outcome given the synthetic state. A test **fails** if:

- A required guard is missing or would not trigger.
- The workflow would produce an incorrect or undefined result.
- An edge case is silently ignored instead of flagged.

### Report Format

After all tests, present a summary table:

```
Workflow Test Suite — {date}

| ID | Workflow | Scenario | Result |
| --- | --- | --- | --- |
| T01 | init | Fresh cold start | ✅ PASS |
| T02 | init | Partial corruption | ❌ FAIL |
...

Total: {N} passed, {M} failed out of {T}
```

If any test fails, document the failure reason and propose a fix.

## Test Scenarios

### T01 — Fresh Init Cold Start

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.design/` does not exist
  - `.magic/.checksums` is valid
  - No git repository (optional)
- **Action:** Calling workflow triggers init via `check-prerequisites → ok: false`
- **Expected:**
  - [ ] `node .magic/scripts/executor.js init` is called
  - [ ] Post-init verification checks the artifacts `init` actually creates: `INDEX.md`, `RULES.md`, `workspace.json`, `specifications/`, `tasks/`, `archives/tasks/` — **not** `STATE.md`, which is bootstrapped lazily on the first mutating command
  - [ ] Brief report: "SDD initialized — {date}"
  - [ ] Calling workflow continues after init
- **Guards tested:** Engine Integrity check, post-init verification (WI-10 documentation parity — the checked set must match `init.js`)

### T02 — Init Partial Corruption

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.design/` exists
  - `RULES.md` exists, `INDEX.md` is missing
  - `specifications/` exists, `tasks/` is missing
- **Action:** check-prerequisites → `ok: false` (missing required files) → init triggered
- **Expected:**
  - [ ] Init script runs and creates only missing artifacts (INDEX.md, tasks/)
  - [ ] Existing RULES.md is NOT overwritten (idempotency)
  - [ ] Post-init verification confirms the init-created artifacts are present; `STATE.md` is not among them and its absence is not a failure
- **Guards tested:** Safe to Re-Run (idempotency), full verification

### T03 — Spec Dispatch Multi-Topic

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.design/` initialized with 2 existing specs: `architecture.md` (Stable), `api.md` (Draft)
  - `RULES.md` v1.2.0 with C1–C6
- **Action:** `"We need JWT auth with Redis sessions. Also, the API must use REST only. And we should use shadcn for the UI."`
- **Expected:**
  - [ ] Parse: 3 distinct topics identified
  - [ ] Map: JWT+Redis → `architecture.md`, REST → `architecture.md`, shadcn → new `ui-components.md`
  - [ ] Trust Mode (C9): No objective conflicts → mapping performed as "Notice of Intent", dispatch proceeds automatically without halt
  - [ ] New file `ui-components.md` created from `.magic/templates/spec.md`
  - [ ] INDEX.md updated with new entry
  - [ ] Post-Update Review runs on all modified files
  - [ ] Actionable Outcome shown: `[Auto-SDD] {Spec} promoted to Stable; updated registry.`
- **Guards tested:** Multi-topic dispatch, Trust Mode (C9) auto-confirm, new file creation with template, registry sync

### T04 — Spec Intra-Input Self-Contradiction

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.design/` initialized, `api.md` (Stable)
- **Action:** `"All APIs must use GraphQL. Also, REST is mandatory for mobile. And we plan to remove REST entirely in 2 months."`
- **Expected:**
  - [ ] Parse: 3 topics, all mapped to `api.md`
  - [ ] **Self-contradiction detected** before dispatch (GraphQL mandatory + REST mandatory + REST removal)
  - [ ] Agent flags all internal conflicts
  - [ ] Agent asks user to resolve before mapping — does NOT guess precedence
  - [ ] No writes occur until user resolves
- **Guards tested:** Intra-input self-contradiction edge case

### T05 — Spec Deprecation Cascade

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `architecture.md` (Stable L1), `api.md` (Stable L2, Implements: architecture.md)
  - `database.md` (Stable L1, Related Specifications: api.md)
  - `PLAN.md` Phase 2: 4 tasks referencing `api.md`
- **Action:** User says: "Deprecate api.md"
- **Expected:**
  - [ ] Status change: `api.md` → Deprecated
  - [ ] INDEX.md updated: api.md status = Deprecated
  - [ ] **Deprecation Cascade**: `database.md` flagged as containing stale `Related Specifications` link to `api.md`
  - [ ] Post-Update Review surfaces stale references
- **Guards tested:** Deprecation Cascade (scan Related Specs)

### T06 — Task New Plan from Stable Specs

- **Workflow:** `task.md` (Generating Tasks & Plan)
- **Synthetic State:**
  - 3 Stable specs: `auth.md` (L1) → `auth-impl.md` (L2, Implements: auth.md) → `api.md` (L1, unrelated)
  - No PLAN.md, no TASKS.md
  - RULES.md does not contain execution mode
- **Expected:**
  - [ ] All 3 specs read, dependency graph built
  - [ ] Phases proposed: auth.md (L1) → Phase 0/1, auth-impl.md (L2) → Phase 1/2, api.md (L1) → Phase 0/1
  - [ ] L2 spec scheduled AFTER its L1 parent
  - [ ] Execution mode defaults to Parallel (C3) — assumed silently, not saved to RULES.md
  - [ ] PLAN.md created from `.magic/templates/plan.md`
  - [ ] TASKS.md + phase-1.md created from `.magic/templates/tasks.md`
- **Guards tested:** Dependency ordering, layer respect, template usage, mode default assumption

### T07 — Task Hard Dependency Cycle (Implements Chain)

- **Workflow:** `task.md` (Generating Tasks & Plan)
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

- **Workflow:** `task.md` (Updating Tasks & Plan)
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

### T12 — Rule Add Duplicate Convention

- **Workflow:** `rule.md` (Adding a Convention)
- **Synthetic State:**
  - RULES.md §7 contains C5: "All dates use ISO 8601 format."
- **Action:** `"Add rule: dates must follow ISO 8601."`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] RULES.md read in full
  - [ ] **Duplication Guard**: semantic overlap with C5 detected
  - [ ] Trust Mode (C9) → Overlap reported as advisory; duplicates merged or ignored without halt
  - [ ] Actionable Outcome: summary of rule consolidation shown
- **Guards tested:** Duplication Guard (Non-blocking)

### T13 — Rule Remove with Workflow Dependency

- **Workflow:** `rule.md` (Removing a Convention)
- **Synthetic State:**
  - RULES.md §7 C3: "Parallel Task Execution Mode"
  - `run.md` references C3 via Mode Guard
- **Action:** `"Remove rule C3"`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] Target identified: C3 — Parallel Task Execution Mode
  - [ ] Removal asks one confirmation (destructive action, C9 gate 1); major version bump once confirmed
  - [ ] **Workflow Dependency Check**: C3 is referenced by `run.md` as Mode Guard
  - [ ] Warning: "This rule is used by run.md as Mode Guard. Removing it may break that workflow's logic."
  - [ ] Impact Analysis includes TASKS.md version staleness note
- **Guards tested:** Workflow Dependency Check, Impact Analysis

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
  - [ ] RETROSPECTIVE.md created from `.magic/templates/retrospective.md`
  - [ ] Snapshot row appended (Snapshots section only — no Session for Level 1)
  - [ ] No task or archival write: archival is owned by `finalize --workflow=run` / `archive-phases` (`retrospective.md` §7, C8)
- **Guards tested:** Template creation on missing file, signal calculation, archival delegation

### T15 — Simulate Checksums Mismatch HALT

- **Workflow:** `simulate.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `.magic/.checksums` exists
  - `spec.md` hash does not match stored checksum (file was modified without regeneration)
- **Action:** `/magic.dev.simulate spec`
- **Expected:**
  - [ ] check-prerequisites reports `checksums_mismatch` for `spec.md`
  - [ ] **HALT** — do NOT proceed with simulation
  - [ ] Report mismatched files to user
  - [ ] **Hint Provided**: Agent suggests `update-engine-meta` to restore integrity.
  - [ ] Options: confirm changes were intentional (sync meta) OR restore from origin.
  - [ ] Simulation resumes only after user response
- **Guards tested:** Checksums mismatch HALT (Step 0)

### T16 — Spec T4 Trigger (Auto Rule Capture)

- **Workflow:** `spec.md` (T4: Rule Extraction)
- **Synthetic State:**
  - `.design/` initialized, `api.md` (Stable)
  - RULES.md §7: C1–C6, no API convention
- **Action:** `"From now on, all APIs must use gRPC. Add this to the API spec."`
- **Expected:**
  - [ ] T4 trigger detected: "from now on" is a standing-rule signal
  - [ ] Agent writes spec changes AND proposes new §7 convention
  - [ ] Convention proposed: `C7 — gRPC-Only API Standard`
  - [ ] Trust Mode (C9) + T4 "Apply Immediately": the Operational Logic of `rule.md` runs (tier routing, admission — a user-stated rule is recorded at its stated strength — duplication check, constitutional guard, reviews); if all pass — RULES.md §7 updated and version bumped without a separate approval gate
  - [ ] `api.md` updated with gRPC requirement
  - [ ] Summary narrated: `[Auto-Rule] Applied: C7 → RULES.md §7 (via T4).`
- **Guards tested:** T4 standing-rule detection, dual write (spec + rule), C9 Apply-Immediately (no approval gate)

### T17 — Spec Explore Mode to Formal Spec

- **Workflow:** `spec.md` (Explore Mode → Formal Spec)
- **Synthetic State:**
  - `.design/` initialized, no existing specs
- **Action:** `"Let's brainstorm about authentication approaches"` → then `"OK, let's formalize the OAuth2 approach"`
- **Expected:**
  - [ ] Phase 1 (explore): agent outputs thoughts to chat or creates a temporary proposal in the agent's artifacts directory (never in `.design/`)
  - [ ] No INDEX.md entry during explore (safety)
  - [ ] No status lifecycle applied during explore
  - [ ] No `.design/specifications/`, `INDEX.md`, `PLAN.md`, or `TASKS.md` modifications during explore
  - [ ] Phase 2 (formalize): agent creates `.design/specifications/auth.md` from template
  - [ ] INDEX.md updated with auth.md (Draft)
- **Guards tested:** Explore Mode isolation (no `.design/` writes), transition to formal, template usage

### T18 — Spec Update Stable → RFC (Amendment Rule)

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth.md` (Stable, v2.0.0) with existing implementation tasks
  - User wants to add a major new section (2FA support)
- **Action:** `"Add two-factor authentication support to auth spec"`
- **Expected:**
  - [ ] Change scope assessed: new section → minor bump (v2.1.0)
  - [ ] Status reverts: Stable → RFC (amendment rule triggered)
  - [ ] INDEX.md updated: status = RFC, version = 2.1.0
  - [ ] Document History row appended
  - [ ] Post-Update Review runs
  - [ ] RULES.md triggers evaluated
- **Guards tested:** Amendment rule (Stable→RFC on substantive change), version bump

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

### T23 — Task Selective Planning (C6) with Mixed Statuses

- **Workflow:** `task.md` (Updating Tasks & Plan)
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

### T24 — Rule Amend Core Section (§1–6)

- **Workflow:** `rule.md` (Amending a Convention)
- **Synthetic State:**
  - RULES.md: §2 Status Rules contain `RFC → Stable: reviewed, approved, no open questions.`
- **Action:** `"Change rule: RFC specs can go Stable with one approval instead of full review"`
- **Expected:**
  - [ ] Agent identifies target: §2 (core section, not §7)
  - [ ] Agent informs: "This is a core section (§2). Amending requires explicit approval."
  - [ ] Constitutional implications surfaced: relaxing quality gate
  - [ ] User must explicitly confirm core amendment
  - [ ] If approved: §2 updated, RULES.md major version bump
- **Guards tested:** Core-Amendment Routing (target is in §1–6, not §7), core section amendment gate

### T25 — Spec Full Consistency Audit

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - INDEX.md: 6 specs registered
  - `.design/specifications/`: 7 files (1 unregistered: `orphan.md`)
  - `api.md` lists `Related: legacy.md` but `legacy.md` status = Deprecated
  - `auth-impl.md` (L2) has `Implements: auth.md`, but `auth.md` is Draft (not Stable)
  - `ui.md` version in file = 2.1.0, version in INDEX.md = 1.5.0
- **Expected:**
  - [ ] Orphaned file detected: `orphan.md` in filesystem but not in INDEX.md
  - [ ] Stale reference: `api.md` → `legacy.md` (Deprecated) flagged as `STALE_REFERENCE` (advisory — the Stale References row of the Consistency Check, T246)
  - [ ] Layer violation: `auth-impl.md` (L2) references non-Stable L1 parent (Layer Integrity requires an existing, `Stable` parent)
  - [ ] Version mismatch: `ui.md` file vs INDEX.md discrepancy flagged
  - [ ] Consistency Report generated with all 4 issues
  - [ ] No automatic fixes — all surfaced for user decision
- **Guards tested:** Orphan detection, stale refs, layer integrity, version sync

### T26 — End-to-End Lifecycle (Cross-Workflow Chain)

- **Workflow:** `init.md` → `spec.md` → `task.md` → `run.md` → `retrospective.md`
- **Synthetic State:**
  - Clean project, no `.design/` directory
- **Action:** User says: "I want to build a REST API for user management"
- **Expected:**
  - [ ] **init**: `.design/` created, INDEX.md + RULES.md initialized
  - [ ] **spec**: `user-management-api.md` created from template, registered in INDEX.md (Draft)
  - [ ] **spec update**: Status promoted Draft → RFC → Stable (Auto-Promotion via Trust Mode C9)
  - [ ] **task**: Dependency graph built (1 spec), PLAN.md created (1 phase), TASKS.md created
  - [ ] **task**: Execution mode assumed Parallel (C3 default) — NOT prompted or saved to RULES.md §7
  - [ ] **run**: Mode Guard passes, tasks executed sequentially
  - [ ] **run**: Phase completed, Level 1 retro fires
  - [ ] **run**: Plan completed, Level 2 retro fires
  - [ ] **retrospective**: RETROSPECTIVE.md created, snapshot + session appended
  - [ ] All files consistent: INDEX.md, PLAN.md, TASKS.md, RULES.md in sync
  - [ ] No orphaned specs, no stale references, no version mismatches
- **Guards tested:** Full chain integrity, all workflow handoffs, all guards in sequence

### T27 — Analyze First-Time on Existing Project

- **Workflow:** `analyze.md` (First-Time Analysis, delegated from `spec.md`)
- **Synthetic State:**
  - `.design/` initialized (INDEX.md exists, empty — 0 specs registered)
  - Project has: `package.json` (Next.js), `src/` with `components/`, `pages/`, `api/`, `lib/`
  - `.eslintrc.json`, `tsconfig.json`, `tailwind.config.js` exist
  - ~80 source files total
- **Action:** User says: "Analyze this project"
- **Expected:**
  - [ ] `spec.md` Explore Mode triggered → delegation rule fires → `analyze.md` read
  - [ ] INDEX.md empty → `/magic.analyze` runs Mode C first and narrates `[DR] Next: /magic.analyze first-time — the registry is empty. (Override: stop here)`; First-Time Analysis (Mode A) starts only on that explicit argument (Mode Precedence, T87)
  - [ ] Mode A Depth Control: ~80 files → Full scan, narrated `[DR] Full scan — 80 files. (Override: /magic.analyze "focus")` — no question
  - [ ] Step 1: Structure scan identifies `src/components/`, `src/pages/`, `src/api/`, `src/lib/`
  - [ ] Step 2: Stack detected — Next.js + TypeScript + Tailwind
  - [ ] Step 3: Architecture inferred — Frontend SPA (pages/ + components/) with API routes
  - [ ] Step 4: Conventions detected from `.eslintrc.json`, `tsconfig.json`
  - [ ] Step 5: Proposal (Spec Matrix + Observed Conventions) generated to **agent artifacts** (NOT `.design/`)
  - [ ] Proposal contains: ≥3 proposed L1 specs, ≥3 proposed L2 specs, ≥1 observed convention whose destination is the owning implementation-layer specification — never `RULES.md` (`analyze.md` Operational Logic §3, Mode A step 3)
  - [ ] Step 6: C9 Auto-Dispatch (Mode A step 3): spec stubs created without a separate approval prompt; agent narrates `[Auto-Analyze] Dispatched 6 specs (L1: 3, L2: 3). (Adjust: /magic.spec amend {name} | Revert: git restore .design/)`
  - [ ] Hard fork: if the agent finds architectural uncertainty, it resolves it by the Consequence Forecast (C9 gate 3, DA-10) and narrates a `[DR]`, the premise recorded in the dispatched spec — no options are presented before the write
- **Guards tested:** Delegation routing, Mode Precedence (Mode C before the explicit first-time run), read-only scan, C9 Auto-Dispatch, hard fork resolved by forecast (DA-10)

### T28 — Analyze Re-Analysis Gap Detection

- **Workflow:** `analyze.md` (Re-Analysis Mode, delegated from `spec.md`)
- **Synthetic State:**
  - `.design/INDEX.md`: 3 specs registered:
    - `architecture.md` (Stable L1) — describes `src/core/`, `src/api/`
    - `auth.md` (Stable L1) — describes `src/auth/`
    - `database.md` (Stable L1) — describes `src/db/`
  - **Actual project structure:**
    - `src/core/` → exists (covered ✅)
    - `src/auth/` → renamed to `src/authentication/` (drifted 🔄)
    - `src/db/` → deleted, replaced by `src/database/` (drifted 🔄)
    - `src/payments/` → new module, no spec (uncovered ⚠️)
    - `src/notifications/` → new module, no spec (uncovered ⚠️)
- **Action:** User says: "Re-analyze the project"
- **Expected:**
  - [ ] INDEX.md read → 3 active specs found → Re-Analysis Mode selected
  - [ ] Active specs read: paths and structures extracted
  - [ ] Project scanned: actual directories discovered
  - [ ] Delta computed:
    - `src/core/` → `architecture.md` ✅ Covered
    - `src/auth/` → `auth.md` 🔄 Drifted (renamed to `src/authentication/`)
    - `src/db/` → `database.md` 🔄 Drifted (renamed to `src/database/`)
    - `src/payments/` → ⚠️ Uncovered
    - `src/notifications/` → ⚠️ Uncovered
  - [ ] Gap Report generated to agent artifacts with L1/L2 paired Coverage Matrix
  - [ ] 2 new L1 specs proposed (`payments.md`, `notifications.md`) + 2 paired L2 specs
  - [ ] 2 spec updates proposed (path fixes in `auth.md`, `database.md`)
  - [ ] New specs (`payments.md`, `notifications.md` + paired L2) are auto-dispatched (C9, Invariant 4) with a narrated action log; the 2 changes to existing specs (path fixes in `auth.md`, `database.md`) wait for explicit approval (Invariant 3)
- **Guards tested:** Re-Analysis mode detection, delta comparison, drift detection, uncovered module detection

### T29 — Analyze Delegation Routing from spec.md

- **Workflow:** `spec.md` → `analyze.md` (Delegation)
- **Synthetic State:**
  - `.design/` initialized, INDEX.md has 2 specs registered
  - Project has existing code
- **Test A — Analysis trigger:**
  - **Action:** `"Scan the project for uncovered modules"`
  - **Expected:**
    - [ ] `spec.md` Explore Mode entered
    - [ ] Delegation rule matches: "Scan ... modules" → `analyze.md`
    - [ ] `analyze.md` read and Re-Analysis flow executed
- **Test B — Generic brainstorm (no delegation):**
  - **Action:** `"Let's brainstorm about caching strategies"`
  - **Expected:**
    - [ ] `spec.md` Explore Mode entered
    - [ ] Delegation rule does NOT match (no project analysis intent)
    - [ ] Standard Explore Mode proceeds (thinking partner, no live writes)
- **Guards tested:** Delegation trigger accuracy, non-matching triggers stay in Explore Mode

### T30 — Init Existing Codebase Hint

- **Workflow:** `init.md` (Existing Codebase Hint)
- **Test A — Project with code:**
  - **Synthetic State:**
    - `.design/` does NOT exist
    - Project root has: `package.json`, `src/`, `README.md`, 20+ source files
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.design/` created with all 6 artifacts
    - [ ] Post-init: codebase indicators scanned — `package.json` found
    - [ ] Hint appended: `💡 Existing codebase detected. To generate initial specifications from your code, say: "Analyze project"`
    - [ ] Calling workflow continues after hint
- **Test B — Empty project (no code):**
  - **Synthetic State:**
    - `.design/` does NOT exist
    - Project root has only `.magic/` (freshly installed magic-spec, no user code)
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.design/` created with all 6 artifacts
    - [ ] Post-init: no codebase indicators found
    - [ ] **No hint** — analysis not suggested for empty projects
    - [ ] Calling workflow continues
- **Guards tested:** Codebase detection heuristic, hint presence/absence

### T31 — Analyze Depth Control for Large Projects

- **Workflow:** `analyze.md` (Depth Control)
- **Action (all tests):** `/magic.analyze first-time` — Depth Control gates Modes A, B and D; plain `/magic.analyze` is Mode C, where size is noted and never gated (`analyze.md` Audit Policy)
- **Test A — Small project (<50 files):**
  - **Synthetic State:**
    - 30 source files, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Full scan starts automatically — no prompt
- **Test B — Medium project (50–500 files):**
  - **Synthetic State:**
    - 200 source files, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Agent scans Full without asking and narrates `[DR] Full scan — 200 files. (Override: /magic.analyze "focus")`
    - [ ] No question and no option menu are presented
- **Test C — Large project (>500 files):**
  - **Synthetic State:**
    - 1200 source files across 80 directories, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Agent does NOT start a Full scan of 1200 files
    - [ ] Agent chooses Focused or Quick by the Consequence Forecast (C9 gate 7, DA-10): the registry is empty, so the spec graph names no uncovered module, and no argument or workspace `scope` gives a focus under 500 files → Quick, narrated `[DR] Quick scan — 1200 files (DA-10); worst case if wrong: one re-run. (Override: /magic.analyze "{focus}")`
    - [ ] No question and no option menu; the scan proceeds
- **Guards tested:** Depth Control thresholds (<50 auto-scan, 50–500 narrated Full scan, >500 mode chosen by forecast)

### T32 — Simulate Missing Test Suite (Improv Mode Fallback)

- **Workflow:** `simulate.md` (Improv Mode)
- **Synthetic State:**
  - `dev/tests/suite.md` file is missing or inaccessible.
- **Action 1:** User runs `/magic.dev.simulate test`
- **Expected 1:**
  - [ ] Agent checks for `dev/tests/suite.md` and fails to find it.
  - [ ] Agent alerts user that test suite is missing, provides hint to restore file from origin, and falls back to **Improv Mode**.
  - [ ] Agent synthesizes a complex "Crisis Scenario" (e.g., INDEX.md desync).
  - [ ] Agent runs an end-to-end simulated lifecycle (Spec → Task → Run → Retro).
  - [ ] Agent outputs a Friction Audit report with identified "Rough Edges".
- **Action 2:** User runs `/magic.dev.simulate` (without target), user requests generic "live simulation"
- **Expected 2:**
  - [ ] Agent defaults to **Improv Mode**.
  - [ ] Executes the same synthesis and lifecycle end-to-end as Expected 1.
- **Guards tested:** Fallback trigger on missing tests, Improv Mode end-to-end execution, ambiguity handling

### T33 — Run Sequence Syncs to PLAN.md

- **Workflow:** `run.md` (Executing Tasks)
- **Synthetic State:**
  - `TASKS.md` Phase 1 has 2 tasks mapped to `auth.md`.
  - Both tasks are transition to marked `Done` after execution.
  - `PLAN.md` has `[ ] Implement Auth module` pointing to `auth.md` under Phase 1.
- **Action:** User says "Execute tasks"
- **Expected:**
  - [ ] Agent reads TASKS.md and identifies fully implemented spec (`auth.md`).
  - [ ] Agent modifies `.design/PLAN.md` to change `[ ]` to `[x]` for `auth.md`.
  - [ ] TASKS.md updated with `Done`.
- **Guards tested:** Plan Sync mechanism (Plan Amnesia fix)

### T34 — Run Task Blocked Handoff Collapses to /magic.task (Post-Task Replan)

- **Workflow:** `run.md` (Executing Tasks → Step 4 Handoff)
- **Synthetic State:**
  - `TASKS.md` Phase 2 has 1 active task mapped to `auth.md`.
  - Task execution encounters ambiguous or missing details in the specification.
- **Action:** User executes `/magic.run`
- **Expected:**
  - [ ] Agent records `Blocked [!]` status and the specific reason in `TASKS.md` Notes.
  - [ ] Per `rules/MAGIC.md §5` Post-Task Replan, agent recommends **exactly ONE** command: `/magic.task {workspace}`.
  - [ ] Agent does NOT proactively propose `/magic.analyze` or `/magic.spec` from `run.md` (per `run.md` Step 4 Handoff explicit prohibition).
  - [ ] `/magic.spec` recommendation surfaces ONLY inside `/magic.task` Pre-flight HALT when mechanical auto-fix cannot resolve the gap.
  - [ ] After spec resolution + re-run of `/magic.task`, dependencies are rebuilt before resuming execution.
- **Guards tested:** Post-Task Replan §5 collapse (run → task → optional HALT → spec → task → run); single user-facing command per HALT.

### T35 — Simulate Regression Sweep Post-Fix

- **Workflow:** `simulate.md` (Verification Step)
- **Synthetic State:**
  - Logic flaw found in a workflow definition (e.g. `init.md`).
  - Surgical fix applied.
  - Test case appended to `suite.md`.
- **Action:** User explicitly approves the "Corrective Proposal" changes.
- **Expected:**
  - [ ] Agent performs a spot-check of the modified lines in `init.md`.
  - [ ] Agent explicitly utilizes the *Run regression tests* handoff from `.agents/workflows/magic.dev.simulate.md` or directly triggers the `/magic.dev.simulate test` suite.
  - [ ] Full regression suite is executed sequentially to ensure core `init.md` modifications did not break adjacent workflows.
- **Guards tested:** Post-fix regression sweep enforcement.

### T36 — Workspace Context Resolution (Zero-Prompt)

- **Workflow:** Any (`task.md` used as example)
- **Synthetic State:**
  - `.design/workspace.json` exists with `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - No prompt provided by user about workspaces.
- **Action 1:** Workflow triggered with no environment variables or CLI flags.
- **Expected 1:**
  - [ ] Agent reads `.design/workspace.json`.
  - [ ] Agent uses `default` = `engine` without prompting and prints `Active workspace: engine.` (`context.md` Priority 3, multiple + default).
  - [ ] Agent uses `.design/engine/` for all file operations (reading `INDEX.md`, `RULES.md`, etc.).
  - [ ] User is NOT prompted to select a workspace.
- **Action 2:** Workflow triggered with `MAGIC_WORKSPACE=docs`
- **Expected 2:**
  - [ ] Agent silently uses `.design/docs/` (overriding default).
- **Action 3:** `.design/workspace.json` is deleted. Workflow triggered.
- **Expected 3:**
  - [ ] Fallback kicks in silently.
  - [ ] Per WI-10 (`context.md` Priority 4): root `.design/` is read transiently only; auto-init bootstraps `.design/{default}/` and resolution re-runs at Priority 3 — no artifacts are ever written to flat root `.design/`.
- **Guards tested:** Context Resolution Priority, Zero-Prompt Enforcement, Graceful Fallback.

### T37 — Retrospective Path and Template Resilience

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - Workspace `docs` is active (`MAGIC_DESIGN_DIR=.design/docs/`).
  - `.design/docs/` initialized and Phase 1 just completed.
  - `RETROSPECTIVE.md` does NOT exist in `.design/docs/`.
- **Action:** Retrospective Level 1 triggered
- **Expected:**
  - [ ] Agent creates `/docs/RETROSPECTIVE.md` from `.magic/templates/retrospective.md` exactly as is without removing the "Session" sections.
  - [ ] Agent appends a row to the Snapshots table.
  - [ ] Agent performs no archival (`retrospective.md` §7); any move `finalize` later performs is workspace-relative: `tasks/phase-1.md` → `archives/tasks/`
  - [ ] Agent writes `RETROSPECTIVE.md` only inside `.design/docs/`; the one root-level write is the derived `.design/graph-snapshot.json` (`retrospective.md` Step 2, Invariant 2)
- **Guards tested:** Workspace path adherence, Level 1 template fidelity.

### T38 — Analyze Auto-Init Guard and Markdown List Integrity

- **Workflow:** `analyze.md`
- **Synthetic State:** Fresh repository without `.design/` directory.
- **Action:** User prompts *"Analyze my codebase"* (triggers analyze).
- **Expected:**
  - [ ] Agent intercepts execution and triggers `.magic/init.md` pre-flight before scanning.
  - [ ] Agent processes the Mode C steps (1–15, including 6a) linearly without sequence restart.
- **Guards tested:** Auto-Init Delegation, Markdown List Continuity.

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

### T40 — Simulate Improv Mode Zero-Prompt Fallback

- **Workflow:** `simulate.md` (Wrapper & Engine)
- **Synthetic State:** Fresh design session, all files present.
- **Action:** User prompts `"/magic.dev.simulate"` without arguments.
- **Expected:**
  - [ ] Agent reads `.agents/workflows/magic.dev.simulate.md`.
  - [ ] Agent does NOT ask the user to "pick a workflow".
  - [ ] Agent explicitly engages Improv Mode (Live Simulation) through §1 Mode Selection ("Improv: Default if 0 args") and the §1a Crisis Template.
  - [ ] Agent invents a crisis scenario and proceeds autonomously.
- **Guards tested:** Zero-prompt fallback rule, prompt ambiguity block.

### T41 — Rule Batch Operations and ID Assignment

- **Workflow:** `rule.md`
- **Synthetic State:**
  - `RULES.md` §7 currently has rules up to C3.
- **Action:** User prompts *"Amend C2 to say X, and add two new rules: Y and Z"*.
- **Expected:**
  - [ ] **Batch**: When the user requests multiple rule changes (add + amend, or multiple adds) in §7, group all changes into a single atomic update. In **Trust Mode (C9)**, notify the user and apply immediately without additional confirmation. Only core amendments (§1–6) or conflicting §7 rules require explicit approval.
  - [ ] New rules are accurately assigned sequential IDs by calculating highest existing (`C4` and `C5`).
  - [ ] Agent performs a single final version bump.
- **Guards tested:** Batch operations spam prevention, Dynamic ID assignment.

### T42 — Run Version Bleed Guard

- **Workflow:** `run.md`
- **Synthetic State:**
  - Entire plan is completed (Phase 2 done).
  - Node.js project. `package.json` exists with version `"1.0.0"`.
  - Level 2 Changelog approved.
- **Action:** User prompts to finish execution. Agent updates version.
- **Expected:**
  - [ ] Agent bumps version inside `package.json`.
  - [ ] Agent does NOT attempt to modify `.magic/.version` in any way.
- **Guards tested:** Version Bleed Prevention.

### T43 — Spec Rename Retention

- **Workflow:** `spec.md` & `task.md`
- **Synthetic State:**
  - Spec `auth-draft.md` is registered and partially completed in `PLAN.md` / `TASKS.md`.
- **Action:** User requests to rename `auth-draft.md` to `authentication.md`.
- **Expected:**
  - [ ] Agent performs a global search-and-replace across the active `.design/` files (INDEX, PLAN, TASKS, active phase files, Related Specifications / Implements links); `archives/` and `RETROSPECTIVE.md` are excluded (T51).
  - [ ] Running `magic.task` after rename does NOT trigger a Phantom Spec reset.
  - [ ] Existing tasks in `TASKS.md` retain progress but point to the new spec name.
- **Guards tested:** Spec Renaming Protocol, Task Continuity.

### T44 — Stability Downgrade Tracking

- **Workflow:** `task.md`
- **Synthetic State:**
  - Spec `api.md` was `Stable` and has active tasks (`Done` and `Pending`).
  - The spec receives heavy modifications and is downgraded to `RFC`.
- **Action:** User runs `/magic.task` to update the plan.
- **Expected:**
  - [ ] Agent moves `api.md` to Backlog in `PLAN.md` (Demoted Spec, `task.md` Step 8).
  - [ ] Agent does NOT delete tasks: the `Done` ones keep their tracking entries verbatim; `INDEX.md` is not modified (the demotion was made by `spec.md`).
  - [ ] Every other task is marked `Blocked [!]` with reason "Spec `api.md` is `RFC`"; C12.1 still lets a stabilizing task through.
- **Guards tested:** Demoted Spec (`task.md` Step 8), Backlog Placement, Active Task Preservation, C12.1 bypass; release in T244.

### T45 — Automation Handoff Validation (Init)

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.design/` directory is missing.
  - Engine `.magic/.checksums` exists.
  - User edited `.magic/scripts/init.js` manually.
  - `check-prerequisites` JSON output contains `"warnings": ["Engine Integrity: '.magic/scripts/init.js' has been modified..."]`.
- **Action:** An arbitrary workflow calls `init.md` indirectly.
- **Expected:**
  - [ ] Agent reads the JSON output and detects the `Engine Integrity` warning.
  - [ ] Agent does **NOT** attempt to compute SHA256 hashes manually.
  - [ ] Agent HALTs initialization immediately and reports the mismatch.
- **Guards tested:** AOP Automation Delegation, Engine Integrity Guard.

### T46 — Analysis Depth Control (Prioritization)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Project contains > 500 files.
  - No existing specs.
- **Action:** `/magic.analyze first-time` (plain `/magic.analyze` is Mode C: size is noted and never gated — `analyze.md` Audit Policy).
- **Expected:**
  - [ ] Agent executes Step 0 (Size Assessment) *before* Step 1.
  - [ ] Agent detects `> 500 files` using an optimal scanning command (`list_dir`, `find`, or OS equiv).
  - [ ] Agent does not start a deep Full scan of > 500 files.
  - [ ] Agent chooses the scope by the Consequence Forecast (DA-10) — Focused when a focus under 500 files can be derived, Quick otherwise — narrates the `[DR]` and proceeds; nothing is asked.
- **Guards tested:** Depth Control (Scan Protection), with the mode chosen by forecast.

### T47 — Manual Rename Rescue (Improv Mode)

- **Workflow:** `analyze.md` (Mode C — RESCUE) + `spec.md` (Spec Renaming Protocol)
- **Synthetic State:**
  - `INDEX.md` references `core-api.md`.
  - `core-api.md` is missing from the disk.
  - `core-auth.md` exists on disk but is not registered.
  - Both files share 90% content similarity (same title and structure).
- **Action:** User runs `/magic.analyze`, then applies the proposed registry sync through `/magic.spec`.
- **Expected:**
  - [ ] Agent detects the missing spec and the unregistered spec (Registry Audit, Ghost/Zombie check).
  - [ ] Agent compares the name, title or semantic content of the two specs.
  - [ ] Similarity >80% → one `RESCUE` finding (**Manual Rename**), not a separate Gap + Orphan pair. `spec.md` RESCUE alone would not match: its path-distance rule (≤20%) is exceeded by `core-api` → `core-auth` (distance 3).
  - [ ] Once the sync is applied, the Spec Renaming Protocol cascades the rename through `INDEX.md`, `PLAN.md`, `TASKS.md` and active phase files without deleting tasks.
- **Guards tested:** Manual Rename Rescue (AOP) in `analyze.md`, Spec Renaming Protocol.

### T48 — Analyze Smart Sync (AOP)

- **Workflow:** `analyze.md` (Re-Analysis Mode)
- **Synthetic State:**
  - `INDEX.md` references `auth.md`.
  - `auth.md` spec describes `src/auth/` (module deleted).
  - Directory `src/identity/` now exists (uncovered).
  - `auth.md` contains `# Title: Authentication System`.
- **Action:** User says "Re-analyze project"
- **Expected:**
  - [ ] Agent identifies `auth.md` as **Orphaned** and `src/identity/` as **Uncovered**.
  - [ ] Agent checks for title/content similarity (Smart Sync trigger).
  - [ ] Agent matches `Authentication System` title to `identity` module.
  - [ ] Re-Analysis report proposes `[RESCUE]` action instead of separate delete/create.
  - [ ] Gap Report status for `src/identity/` marked as `Manual Rename (Synced)`.
- **Guards tested:** Smart Sync (AOP) Rename detection, Gap Report RESCUE action.

### T49 — Spec Consistency Registry Integrity Missing File

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - `INDEX.md` references `data-model.md`.
  - `data-model.md` is deleted from disk (does not exist).
  - No unregistered spec exists (not a manual rename).
- **Action:** User says "Check specs"
- **Expected:**
  - [ ] Agent reads `INDEX.md` and identifies `data-model.md`.
  - [ ] Agent detects the file is completely missing from `.design/specifications/`.
  - [ ] Agent does NOT attempt to parse paths from the missing file (avoids crash).
  - [ ] Agent flags the **Registry Integrity** issue.
  - [ ] Consistency Report generated proposing to remove the orphaned entry from `INDEX.md` or restoring the file.
- **Guards tested:** Registry Integrity Guard, Missing File Exception Handling.

### T50 — Spec Deprecation Cascade with Implements Hierarchy

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth-concept.md` (Stable L1), `auth-impl.md` (Stable L2, Implements: auth-concept.md)
- **Action:** User says "Deprecate auth-concept.md"
- **Expected:**
  - [ ] Status change: `auth-concept.md` → Deprecated
  - [ ] INDEX.md updated
  - [ ] **Deprecation Cascade**: `auth-impl.md` flagged as containing stale `Implements` link to `auth-concept.md`
  - [ ] Post-Update Review surfaces layer isolation logic (L2 has no valid L1 parent).
- **Guards tested:** Deprecation Cascade on Implements clause, Layer Integrity.

### T51 — Spec Rename History Immutability

- **Workflow:** `spec.md` (Updating an Existing Specification -> Spec Renaming Protocol)
- **Synthetic State:**
  - `RETROSPECTIVE.md` exists and contains mentions of `old-api.md`.
  - `.design/archives/tasks/phase-1.md` exists and contains mentions of `old-api.md`.
- **Action:** User renames `old-api.md` to `new-api.md`.
- **Expected:**
  - [ ] Status/Renaming applied: Agent updates active files (`INDEX.md`, `PLAN.md`, `TASKS.md`, active phase files, and `Related Specs`/`Implements`).
  - [ ] Agent explicitly excludes `RETROSPECTIVE.md` and `.design/archives/` from the search-and-replace sweep.
  - [ ] Mentions of `old-api.md` in historical logs are left completely intact.
- **Guards tested:** Historical Immutability Guard, Spec Renaming Protocol scoping.

### T52 — Spec Quarantine Cascade Enforcement (C12)

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth-concept.md` (Stable L1)
  - `auth-impl.md` (Stable L2, Implements: auth-concept.md)
- **Action:** User says "Downgrade auth-concept.md to RFC"
- **Expected:**
  - [ ] Status change: `auth-concept.md` → RFC
  - [ ] Agent scans for dependencies and identifies `auth-impl.md` is a dependent L2 child.
  - [ ] **Quarantine Cascade**: Agent flags `auth-impl.md` during Post-Update Review.
  - [ ] **Status Drop Enforced**: Agent MUST drop status of `auth-impl.md` (L2) to RFC or Draft and update INDEX.md.
  - [ ] Agent reports: "C12 Cascade: 1 dependent quarantined: [auth-impl.md]." (`spec.md` Updating → Sync)
- **Guards tested:** Quarantine Cascade (C12) surfacing, Layer Integrity.

### T53 — Task Quarantine Cascade (C12)

- **Workflow:** `task.md` (Updating Tasks & Plan)
- **Synthetic State:**
  - `auth-concept.md` (L1, status: RFC)
  - `auth-impl.md` (L2, status: Stable, Implements: auth-concept.md)
  - `PLAN.md` has `auth-impl.md` in Phase 1.
  - `TASKS.md` has task T-1A01 for `auth-impl.md` (Todo).
  - RULES.md v1.12.0 with C12.
- **Action:** Run `/magic.task update`
- **Expected:**
  - [ ] Agent identifies that `auth-concept.md` (L1) is not Stable.
  - [ ] **Quarantine Cascade (C12)**: `auth-impl.md` is moved to `## Backlog` in `PLAN.md`.
  - [ ] Task T-1A01 for `auth-impl.md` (Todo) → marked `Blocked [!]` with reason: "L1 parent `auth-concept.md` is `RFC` (C12)" (`task.md` Step 8).
  - [ ] User is notified of the quarantine.
- **Guards tested:** Quarantine Cascade (C12) execution, Downgrade Policy.

### T54 — Parallel Mode Shared-Constraint Detection (Deep Scan)

- **Workflow:** `run.md` (Executing Tasks — Parallel Mode)
- **Synthetic State:**
  - Track A: T-1A01 "Update user module" (refs `user-module.md` §2).
  - Track B: T-1B01 "Add logging" (refs `logger.md` §4).
  - `user-module.md` §2 says "Modifies `src/lib/manager.js`".
  - `logger.md` §4 says "Updates logger middleware in `src/lib/manager.js`".
  - Task descriptions DO NOT mention `src/lib/manager.js`.
  - RULES.md §7 C3: Parallel mode.
- **Action:** Run `/magic.run`
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

- **Workflow:** `run.md`, `rule.md`, `simulate.md`, `spec.md` (Core Engine Update)
- **Synthetic State:**
  - Agent modifies `.agents/workflows/magic.dev.simulate.md` to add a new guideline.
  - `.magic/.version` is `1.4.11`.
- **Action:** Agent performs the edit.
- **Expected:**
  - [ ] Agent identifies that a core engine file was modified.
  - [ ] Agent executes: `node .magic/scripts/executor.js update-engine-meta`.
  - [ ] **Automated Verifications:**
    - [ ] `.magic/.version` bumped to `1.4.12`.
    - [ ] `.magic/.checksums` is recalculated.
  - [ ] Results documented in the task completion checklist.
- **Guards tested:** C1, C14, Engine Integrity Guard (via meta automation).

### T57 — Run Convention Sync Guard (Version Mismatch)

- **Workflow:** `run.md`
- **Synthetic State:**
  - `TASKS.md` header contains `Based on RULES: 1.4.6`.
  - `RULES.md` version is `1.4.7`.
  - Phase 1 has 3 Todo tasks.
- **Action:** Run `/magic.run`
- **Expected:**
  - [ ] Agent reads both versions before execution (Core Invariant 4, Sync guard).
  - [ ] **Mismatch Detected**: 1.4.6 vs 1.4.7.
  - [ ] Agent auto-runs `/magic.task {workspace} update` and narrates `[Auto-Sync] RULES drift resolved: TASKS.md updated to RULES v1.4.7. Proceeding with execution. (Revert: git restore .design/{ws}/TASKS.md)` — no question is asked (C25).
  - [ ] `TASKS.md` header now reads `Based on RULES: 1.4.7`; execution then begins without a prompt.
- **Guards tested:** Convention Sync Guard auto-resolution (`run.md` Core Invariant 4), Task-Rules parity, C25 (no inline approval).

### T58 — Init: Workspace Initialized

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.design/` (missing).
- **Action:** Trigger any workflow (e.g. `spec.md`).
- **Expected:**
  - [ ] `check-prerequisites` fails (missing artifacts).
  - [ ] `init` workflow executes `init.js`.
  - [ ] `.design/workspace.json` is created with `default: main` (per WI-10 in `l1-workspace-intent-routing.md` — new projects bootstrap into `.design/{default}/`, never directly under `.design/`).
  - [ ] `.design/RULES.md` and `INDEX.md` created.
  - [ ] `.design/main/` directory created with `INDEX.md`, `specifications/`, `tasks/`, `archives/tasks/` (no `STATE.md` — it appears on the first mutating command, not at bootstrap).
- **Guards tested:** Core Artifact Initialization (WI-10 layout), Zero-Prompt baseline, default workspace naming.

### T59 — Analyze: Depth Control (Threshold Enforcement)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Project A: 40 files.
  - Project B: 200 files.
  - Project C: 600 files.
- **Action:** Run `/magic.analyze first-time` on each (plain `/magic.analyze` is Mode C, which never gates on size).
- **Expected:**
  - [ ] **Project A**: Auto-scan (Step 1) starts without prompting.
  - [ ] **Project B**: Agent scans Full and narrates `[DR] Full scan — 200 files. (Override: /magic.analyze "focus")` — no question.
  - [ ] **Project C**: Agent chooses Focused or Quick by the Consequence Forecast (DA-10) and narrates the `[DR]` — no HALT, no question.
- **Guards tested:** Depth Control (Safety) thresholds.

### T60 — Retro: Snapshot Row, Archival Delegated to finalize (C8)

- **Workflow:** `retrospective.md` (Level 1 Snapshot)
- **Synthetic State:**
  - Workspace: `.design/api-v2/`
  - Current phase: Phase 3
  - File: `.design/api-v2/tasks/phase-3.md` exists.
  - `TASKS.md` has link to `tasks/phase-3.md`.
- **Action:** Phase 3 completes; `magic.run` triggers Retro L1.
- **Expected:**
  - [ ] `RETROSPECTIVE.md` (metadata) read or created.
  - [ ] Row appended to `RETROSPECTIVE.md` Snapshots table.
  - [ ] The retrospective moves nothing (`retrospective.md` §7); `finalize --workflow=run` later applies **Archival (C8)**: `phase-3.md` → `.design/api-v2/archives/tasks/phase-3.md`.
  - [ ] That same finalize step rewrites the `TASKS.md` link row to `[Phase 3](archives/tasks/phase-3.md)` (`Done (Archived)`).
- **Guards tested:** C8 Archival delegation (the retrospective writes no archive), Workspace-relative pathing logic.

### T61 — Spec Registry-Filesystem Desync

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `INDEX.md` lists `auth.md` (Stable).
  - `.design/specifications/auth.md` is **missing** from disk.
- **Action:** User says: "Update auth spec to include JWT."
- **Expected:**
  - [ ] `check-prerequisites` returns `GHOST_REGISTRY` for the missing file, with or without a `PLAN.md` (T240).
  - [ ] **Existence Guard** triggers.
  - [ ] **HALT** — Agent does not attempt to read `auth.md`.
  - [ ] Message: "Specification `auth.md` is registered in INDEX but missing from disk. Please restore or unregister before updating."
- **Guards tested:** Existence Guard (C1, Registry Drift).

### T62 — N-Level Hard Dependency Cycle (Implements Chain)

- **Workflow:** `task.md`
- **Synthetic State:**
  - `auth.md` (Stable L2, Implements: api.md)
  - `api.md` (Stable L2, Implements: database.md)
  - `database.md` (Stable L2, Implements: auth.md)
  - Hard circular dependency via Implements chain at level 3: auth → api → database → auth
- **Action:** Call `/magic.task` to generate a plan.
- **Expected:**
  - [ ] Dependency matrix construction detects hard-dependency cycle (auth -> api -> database -> auth) in `Implements:` chain.
  - [ ] **Circular Guard** detects cycle at level 3.
  - [ ] **HALT** — No PLAN.md is written.
  - [ ] Cycle Resolution: agent identifies the "weakest link" and suggests downgrading one `Implements` to `Related Specifications`.
- **Guards tested:** N-Level Circular Dependency (Semantic Split — hard dependency HALT).

### T63 — Simulation Cold Start Auto-Init

- **Workflow:** `simulate.md` (Step 0: Pre-flight)
- **Synthetic State:** Fresh repository, `.design/` (missing).
- **Action:** User runs `/magic.dev.simulate`.
- **Expected:**
  - [ ] `check-prerequisites` returns `ok: false` (missing `.design/`).
  - [ ] No `ENGINE_INTEGRITY` or `checksums_mismatch` warnings (checksums are valid).
  - [ ] Auto-run `.magic/init.md` to create `.design/` structure.
  - [ ] After init completes, simulation resumes from Mode Selection.
- **Guards tested:** Auto-Init on missing `.design/`, resume after init.

### T64 — Quarantine Cascade Enforcement

- **Workflow:** `run.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `TASKS.md` Phase 1 has 1 Todo task for `api-impl.md`.
  - `INDEX.md` registers `api-impl.md` (Level 2) pointing to `api-core.md` (Level 1).
  - `api-core.md` status in `INDEX.md` = `RFC` (Not `Stable`).
- **Action:** User runs `/magic.run`.
- **Expected:**
  - [ ] `check-prerequisites` returns warning: "Rule 57 Violation: L2 spec 'api-impl.md' is ..., but its L1 parent 'api-core.md' is RFC (Must be Stable)."
  - [ ] **Quarantine Guard (C12)** in `run.md` detects violation for active task.
  - [ ] **HALT** — Execution does not begin.
  - [ ] Message: "Quarantine Triggered: Specification `api-impl.md` has a non-Stable parent. Please run `magic.task` to update your plan."
- **Guards tested:** Rule 57 Enforcement (C12), Runtime Quarantine Check.

### T65 — Scoped Analysis Guard (C15)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - `workspace.json`: `engine` workspace with `scope: [".magic/", ".agents/"]`.
  - Project has `src/`, `lib/`, `.magic/`, and `.agents/`.
- **Action:** User runs `/magic.analyze`.
- **Expected:**
  - [ ] `executor.js` exports `MAGIC_WORKSPACE_SCOPE=".magic/,.agents/"`.
  - [ ] **Scoping Rule (C15)**: Agent ignores `src/` and `lib/` during structure scan.
  - [ ] Proposal only includes modules found within the scoped paths.
- **Guards tested:** Scoped Scanning (C15), Multi-Workspace Isolation.

### T66 — Task Primary Intent Propagation (Cold Start Memory)

- **Workflow:** `task.md` -> `init.md` (Intent Preservation, Stable-Spec Requirement)
- **Synthetic State:**
  - `.design/` missing.
  - Projects has code.
- **Action:** User prompts: "Plan feature X" (starting magic.task).
- **Expected:**
  - [ ] `task.md` triggers `init.md`; the original intent is memoized before the delegation and the run resumes with "Resuming: 'Plan feature X'" (Core Invariant 3).
  - [ ] The registry is empty after init: Pre-flight reports `Stable specs (0 specs found)` and HALTs (Stable-Spec Requirement) instead of planning an empty registry.
  - [ ] The project has code, so the single recommendation is `/magic.analyze first-time` (the `init.md` Step 4 indicators), not `/magic.spec`.
  - [ ] **Crucial**: the HALT report restates the request "Plan feature X", so the intent is NOT lost across the HALT.
- **Guards tested:** Context Continuity, Intent Preservation, Stable-Spec Requirement (T242).

### T68 — Ghost Registry Repair Priority (Non-Destructive Boot)

- **Workflow:** `analyze.md` (Mode C — Registry Audit + Auto-Repair)
- **Synthetic State:**
  - `.design/INDEX.md` is blank.
  - `.design/specifications/` has 3 files: `auth.md`, `db.md`, `api.md`.
- **Action:** User prompts: "Analyze project and suggest new specs".
- **Expected:**
  - [ ] "Analyze project" is `/magic.analyze` → Mode C; Mode A never starts in the same invocation (Mode Precedence), so "suggest new specs" is not acted on in this run.
  - [ ] Registry Audit finds 3 files on disk that the blank `INDEX.md` does not list (Ghost/Zombie check).
  - [ ] Auto-Repair maps the 3 files into `INDEX.md` and narrates `[Auto-Repair] Registry healed: 3 Ghost/Zombie entries resolved. (Revert: git restore .design/{ws}/INDEX.md)`.
  - [ ] No new-spec proposal is produced in this invocation; later analysis runs against the healed registry (a `first-time` run would take Mode B, since `INDEX.md` now lists specs — `analyze.md` Argument Routing).
- **Guards tested:** Registry healing before any dispatch, Mode Precedence (no same-invocation Mode A).

### T69 — Cross-Workspace Name Collision (Source of Truth Guard)

- **Workflow:** `task.md` / `spec.md`
- **Synthetic State:**
  - `.design/workspace.json`: `default: engine`, secondary: `app`.
  - `.design/engine/specifications/core.md` (Version: 2.0.0, Stable).
  - `.design/app/specifications/core.md` (Version: 1.5.0, Stable) — stale copy.
  - Active workspace: `app`.
- **Action:** User runs `/magic.task` in `app`.
- **Expected:**
  - [ ] Agent identifies name collision across workspaces.
  - [ ] **Parity Guard** triggers: Version mismatch detected (2.0.0 vs 1.5.0).
  - [ ] **HALT**: Agent warns about "Source of Truth Drift".
  - [ ] One recommended path, no option menu: run `/magic.spec` in `engine` (higher version) to reconcile, then re-run `/magic.task` (same state as T86).
- **Guards tested:** Cross-Workspace Parity Guard.

### T70 — Local Rule Constitutional Conflict (Hierarchy Guard)

- **Workflow:** `rule.md`
- **Synthetic State:**
  - Root `.design/RULES.md` §1 contains Core C1: "English only".
  - Active workspace: `.design/analytics/`.
- **Action:** User prompts in `analytics` workspace: "Add rule C8: Russian comments are allowed."
- **Expected:**
  - [ ] Agent identifies current workspace = `analytics`.
  - [ ] **Hierarchy Guard** scans ROOT RULES.md §1-6 (Constitution).
  - [ ] Agent detects that proposed C8 contradicts Root C1.
  - [ ] **HALT**: Agent refuses to add the rule.
  - [ ] Message: "Proposed local rule contradicts Global Constitution (§1 C1). Local conventions cannot override universal invariants."
- **Guards tested:** Cross-Workspace Constitutional Guard, Hierarchy Integrity.

### T71 — Quarantine Deadlock (Stabilization Exception)

- **Workflow:** `task.md` (Step 7 Stabilizing Tasks, Step 8 C12.1)
- **Synthetic State:**
  - Parent `core-l1.md` (RFC).
  - Child `core-l2.md` (RFC, Quarantined by C12).
  - All tasks for `core-l2.md` are in Backlog/Blocked.
- **Action A:** the user writes "stabilize core-l2.md — fix the implementation mismatches with its parent", then runs `/magic.task update`.
- **Expected A:**
  - [ ] The request explicitly asks to stabilize `core-l2.md`, so every task that targets it carries `stabilizes: core-l2.md` (Step 7).
  - [ ] **C12.1** applies to the flagged tasks only, and only for the spec the flag names: they are pulled into Phase 1 despite the non-Stable parent.
  - [ ] The flag is the trigger — not a task title and not the agent's reading of intent (C13).
- **Action B:** the user writes "add pagination to core-l2.md" (a new feature on the quarantined spec), then runs `/magic.task update`.
- **Expected B:**
  - [ ] The tasks carry no `stabilizes:` flag, so they stay quarantined (Backlog, `Blocked [!]` with the C12 reason); nothing is pulled in on the strength of a plausible-sounding title and no question is asked.
- **Guards tested:** C12.1 data trigger (C13), Context-Aware Planning. Planning side of an update only — the `run.md` guards that must let a flagged task through are T248, and the Guided Planning Filter's admission of a spec named by a quoted directive is T249.

### T72 — Spec Merge Refactor (Section Re-mapping)

- **Workflow:** `spec.md` + `task.md` (Structural Refactor)
- **Synthetic State:**
  - `INDEX.md`: `auth.md` (Stable), `session.md` (Stable)
  - `TASKS.md`: `T-1A01` (auth.md §2), `T-2B01` (session.md §5)
- **Action:** User merges `auth.md` and `session.md` into `security.md`. §2 moves to §security.md §3.
- **Expected:**
  - [ ] **Structural Refactor detected**: Merge action recognized.
  - [ ] **Refactoring Guard**: Agent updates `T-1A01` in `TASKS.md` to point to `security.md §3`.
  - [ ] Agent updates `T-2B01` mapping if necessary.
  - [ ] `INDEX.md` synced: `auth.md`, `session.md` removed; `security.md` added.
  - [ ] `PLAN.md` synced with new spec name.
- **Guards tested:** Structural Refactor (Section Re-mapping), Refactoring Guard.
- **Outcome:** Agent identifies the merge, updates T-1A01 to point to `security.md §3`, and syncs registry.

### T73 — Simulation: Corrupted Suite (Partial Content)

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - `dev/tests/suite.md` exists but contains only the header block (no `### T{N}` test scenarios).
  - File is readable but has zero parseable test cases.
- **Action:** User runs `/magic.dev.simulate test`
- **Expected:**
  - [ ] Agent reads `dev/tests/suite.md` successfully (file exists).
  - [ ] Suite Integrity check detects 0 valid test scenarios (no `### T{N} —` headers found).
  - [ ] Agent reports: "Suite contains 0 valid tests. Hint: restore file from origin."
  - [ ] Agent falls back to **Improv Mode** (same as missing suite — T32).
  - [ ] Crisis scenario synthesized and walkthrough executed.
- **Guards tested:** Suite Integrity (zero-test edge case), Improv Mode fallback on corrupted suite

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

### T75 — Rule: Rules Parity Sync Offer

- **Workflow:** `rule.md`
- **Synthetic State:**
  - `RULES.md` version 1.4.0.
  - `TASKS.md` header contains `Based on RULES: 1.4.0`.
- **Action:** User adds a new rule.
- **Expected:**
  - [ ] Agent proposes `RULES.md` update (version bump to 1.5.0).
  - [ ] Agent writes `RULES.md`.
  - [ ] **Rules Parity Check**: Agent detects `TASKS.md` is now stale.
  - [ ] Agent alerts user: "`TASKS.md` is based on rules v1.4.0 but project is now v1.5.0."
  - [ ] Agent narrates exactly one next command, `/magic.task {workspace} update`, to synchronize the plan.
- **Guards tested:** Rules Parity (Stale check), Sync Offer.

### T76 — Spec T4 Rule with Missing Target File (HALT Persistence)

- **Workflow:** `spec.md` (T4 + Existence Guard)
- **Synthetic State:**
  - `INDEX.md` contains `auth.md` (Stable).
  - `auth.md` is missing from disk.
  - `RULES.md` v1.0.0.
- **Action:** `"Add MFA to auth.md and remember that all MFA must use TOTP."`
- **Expected:**
  - [ ] T4 detected ("remember that...").
  - [ ] Existence Guard fails for `auth.md` -> **HALT**.
  - [ ] Agent reports missing file.
  - [ ] **Crucial**: Agent acknowledges the T4 rule and confirms it is "queued" pending the resolution of the missing file issue.
  - [ ] Rule `C15 — MFA TOTP Standard` is NOT written to `RULES.md` until the target spec is restored or remapped.
- **Guards tested:** T4 persistence during HALT, Atomic Write Integrity.

### T77 — Init Migration: Existing Project Fallback

- **Workflow:** `init.md` + `run.md`
- **Synthetic State:**
  - Project root has `.design/` with existing specs/plans.
  - `.design/workspace.json` is missing.
- **Action:** User runs `/magic.run`
- **Expected:**
  - [ ] Agent reads root `.design/` transiently only (`context.md` Priority 4), then auto-init bootstraps `workspace.json` and `.design/{default}/` without overwriting existing files — nothing is written to flat root `.design/` (WI-10).
  - [ ] Agent does not trigger an infinite loop of `init`: init is non-overwriting and idempotent, and resolution re-runs once at Priority 3.
- **Guards tested:** Workspace Fallback (missing workspace.json), Init Loop Prevention.

### T78 — Micro-spec Promotion Guard

- **Workflow:** `spec.md` (Update flow)
- **Synthetic State:** Spec `bug-x.md` using `micro-spec.md` template, currently 45 lines.
- **Action:** User expands logic; new content makes it 75 lines.
- **Expected:**
  - [ ] Agent detects 50+ line threshold.
  - [ ] Agent proposes converting to `spec.md` template (Standard).
  - [ ] **HALT** if agent attempts to keep 75 lines in a legacy micro-template.
- **Guards tested:** Micro-spec Promotion Guard (C16), Template Threshold (50 lines).

### T79 — Init Migration: Index Preservation

- **Workflow:** `init.md` (Migration Mode)
- **Synthetic State:** Project with old `.design/INDEX.md` but no `workspace.json`.
- **Action:** Auto-Init trigger (any `/magic.*` workflow; `init.md` is internal — there is no `/magic.init` command).
- **Expected:**
  - [ ] Agent creates `workspace.json`.
  - [ ] **Guard**: Agent DOES NOT overwrite existing `INDEX.md` with default template.
  - [ ] Existing specifications remain registered.
- **Guards tested:** Non-Overwriting Invariant, Index Preservation (Migration).

### T80 — Engine Integrity Mandatory HALT

- **Workflow:** `check-prerequisites.js`
- **Synthetic State:**
  - `.magic/spec.md` is modified manually (hash mismatch).
- **Action:** Call any workflow.
- **Expected:**
  - [ ] `ok: false` in JSON output.
  - [ ] `warnings` contain "Engine Integrity".
  - [ ] Workflow (e.g., `run.md`) triggers HALT and does NOT begin execution.
- **Guards tested:** Engine Integrity Mandatory HALT (C1).

### T81 — Spec Consistency Audit: Version Drift Detection

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - `INDEX.md`: `documentation-system.md` v1.0.0 (Stable)
  - `documentation-system.md` file header: `Version: 1.1.0` — user manually bumped the version in the file after adding a new section, but forgot to update `INDEX.md`
  - Amendment rule was NOT applied (INDEX.md still shows v1.0.0, status still Stable)
- **Action:** User says "Verify specs" or "Check specs"
- **Expected:**
  - [ ] Agent reads all spec file headers and compares `Version:` against `INDEX.md` entries
  - [ ] `documentation-system.md` header version (1.1.0) ≠ INDEX.md version (1.0.0) → version mismatch detected
  - [ ] `documentation-system.md` flagged as `VERSION_DRIFT` in the Consistency Report
  - [ ] Agent reports: "Version header out of sync with registry — external edit without lifecycle protocol detected"
  - [ ] No automatic fix — issue surfaced for user resolution (update INDEX.md to 1.1.0 and apply amendment rule, or roll back file header)
  - [ ] Consistency Report includes `VERSION_DRIFT` category alongside existing checks
- **Guards tested:** Version Drift detection (RE-1), header-vs-registry mismatch, Consistency Check extension

### T82 — Run Spec Stability Spot-Check (RE-2)

- **Workflow:** `run.md` (Pre-flight — Spec Stability Guard)
- **Synthetic State:**
  - `TASKS.md` Phase 1: T-1A01 (Todo, maps to `auth-impl.md`)
  - `INDEX.md` at plan generation: `auth-impl.md` (Stable L2)
  - Between plan generation and run, user demotes `auth-impl.md` → RFC externally in both its file header and `INDEX.md` (a one-sided edit would HALT earlier with STATUS_DRIFT — see T126)
  - `RULES.md §7` has C3: Parallel mode
  - No C12 violation (L1 parent `auth.md` is still Stable — this is NOT a parent-layer issue)
- **Action:** User runs `/magic.run`
- **Expected:**
  - [ ] **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json --require-tasks --verify-headers --workspace={active-workspace}`.
    - [ ] **C15 Filter**: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **HALT** ONLY if in-scope files are mismatched.
    - [ ] **Spec Stability Spot-Check**: Read `INDEX.md`. For each spec referenced by a `Todo` task in the current phase, confirm status = `Stable`. Any non-Stable spec → **HALT** before execution begins (see Logic Guard above).
  - [ ] Pre-flight: `check-prerequisites` passes (no engine mismatch)
  - [ ] **Spec Stability Spot-Check**: Agent reads `INDEX.md` for all Todo-task specs in current phase
  - [ ] `auth-impl.md` found with status `RFC` (not Stable)
  - [ ] **HALT** — execution does NOT begin
  - [ ] Message: "Spec `auth-impl.md` is no longer Stable (current: RFC). Run `/magic.task {workspace} update` to re-evaluate the plan."
  - [ ] C12 Quarantine guard does NOT fire (L1 parent is Stable — this is a different, complementary guard)
- **Guards tested:** Spec Stability Spot-Check (RE-2), direct spec demotion detection, guard independence from C12

### T83 — Version Drift Guard During Active Spec Update

- **Workflow:** `spec.md` (Updating an Existing Specification — Sync)
- **Synthetic State:**
  - `INDEX.md`: `api-core.md` v1.2.0 (Stable)
  - `api-core.md` file header: `Version: 1.3.0` — externally bumped by user; INDEX.md not updated
  - No active plan or tasks
- **Action:** User says "Update api-core.md to add a rate-limiting section"
- **Expected:**
  - [ ] Pre-flight Consistency Check runs: VERSION_DRIFT detected (`api-core.md` header 1.3.0 ≠ INDEX.md 1.2.0)
  - [ ] **Version Drift Guard fires → HALT** before any write to `api-core.md`
  - [ ] Agent reports one resolution path, no option menu: "Version drift on `api-core.md`: file header v1.3.0 ≠ registry v1.2.0. Run `/magic.spec` to reconcile — it will sync `INDEX.md` to the file header version and apply the amendment rule to capture the external change."
  - [ ] No changes written to `api-core.md` or `INDEX.md`
  - [ ] Execution resumes only after user resolves the drift
- **Guards tested:** Version Drift Guard (RE-3), update atomicity, HALT before write

### T84 — T4 Rule Queued on Version Drift HALT

- **Workflow:** `spec.md` (T4 + Version Drift Guard)
- **Synthetic State:**
  - `INDEX.md`: `api-core.md` v1.2.0 (Stable)
  - `api-core.md` file header: `Version: 1.3.0` (VERSION_DRIFT)
  - `RULES.md` v2.1.0, no rate-limiting rule
- **Action:** `"Update api-core.md to add a rate-limiting section, and remember that all API endpoints must include rate-limiting headers."`
- **Expected:**
  - [ ] T4 detected: "remember that all API endpoints must include rate-limiting headers"
  - [ ] Pre-flight Consistency Check: VERSION_DRIFT on `api-core.md` detected
  - [ ] **Version Drift Guard fires → HALT**
  - [ ] Agent acknowledges T4: "T4 rule detected — queued pending drift resolution. Rule will NOT be written to RULES.md until version drift on `api-core.md` is resolved."
  - [ ] No write to `RULES.md`, no write to `api-core.md`
  - [ ] After user resolves drift: T4 rule applied to `RULES.md`, spec update proceeds
- **Guards tested:** T4 queuing on VERSION_DRIFT HALT (RE-3 + RE-4), atomic write integrity, HALT persistence

### T85 — Intent Preservation Through Cold-Start Delegation Chain

- **Workflow:** `task.md` → `init.md` (Intent Preservation, Stable-Spec Requirement)
- **Synthetic State:**
  - `.design/` missing
  - Project has existing source code
- **Action:** User says "Plan the payment gateway feature" (starting `magic.task`)
- **Expected:**
  - [ ] `task.md` detects missing `.design/` → memos intent: "Plan the payment gateway feature"
  - [ ] Delegates to `init.md` → `.design/` created
  - [ ] After the delegation resolves: agent resumes explicitly: "Resuming: 'Plan the payment gateway feature'"
  - [ ] Pre-flight finds no registered spec (`Stable specs (0 specs found)`) → HALT with one recommendation: `/magic.analyze first-time` (existing codebase)
  - [ ] The HALT report restates the original request, so the intent is NOT lost
- **Guards tested:** Intent Preservation (RE-T66), Stable-Spec Requirement (T242), cross-workflow context continuity

### T86 — Cross-Workspace Name Collision Parity Guard

- **Workflow:** `task.md` (Pre-flight — Cross-Workspace Parity)
- **Synthetic State:**
  - `workspace.json`: `default: engine`, secondary workspace: `app`
  - `.design/engine/specifications/core.md` Version: 2.0.0 (Stable)
  - `.design/app/specifications/core.md` Version: 1.5.0 (Stable) — stale copy
  - Active workspace: `app`
- **Action:** User runs `/magic.task` in `app` workspace
- **Expected:**
  - [ ] Pre-flight reads `workspace.json` → detects >1 workspace
  - [ ] Agent scans both workspaces for identically-named spec files
  - [ ] `core.md` found in both: `engine` v2.0.0, `app` v1.5.0 → version mismatch
  - [ ] **Cross-Workspace Parity Guard → HALT**
  - [ ] Report: "Source of Truth Drift: `core.md` exists in `engine` (v2.0.0) and `app` (v1.5.0). Run `/magic.spec` in `engine` (higher version) to reconcile, then re-run `/magic.task`."
  - [ ] One recommended path — no option menu
  - [ ] No plan generated until user resolves
- **Guards tested:** Cross-Workspace Parity Guard (RE-T69), multi-workspace collision detection, HALT before planning

### T87 — Analyze Mode C with Empty INDEX.md (Precedence Guard)

- **Workflow:** `analyze.md` (Mode C — Mode Precedence)
- **Synthetic State:**
  - `.design/` initialized
  - `INDEX.md` exists but is empty (0 specs registered)
  - Project has source code
- **Action:** User runs `/magic.analyze`
- **Expected:**
  - [ ] Mode C fires (trigger matches `/magic.analyze`)
  - [ ] Mode A condition is also true (INDEX.md empty) — but Mode A does NOT auto-start
  - [ ] Mode C runs to completion: self-check, registry audit, coverage check, rule validation, report
  - [ ] Report delivered: "Registry empty — no specs registered. Coverage: 100% gap."
  - [ ] After report: agent narrates `[DR] Next: /magic.analyze first-time — the registry is empty. (Override: stop here)` — no question
  - [ ] Mode A starts only when the user runs `/magic.analyze first-time`
- **Guards tested:** Mode Precedence (RE-A1), Mode C completeness before the Mode A next-step recommendation

### T88 — Analyze Mode C Bypasses All Intermediate HALTs

- **Workflow:** `analyze.md` (Mode C — Audit Policy)
- **Synthetic State:**
  - `.magic/` checksum mismatch exists (`checksums_mismatch`)
  - `INDEX.md` has `api.md` registered but file is missing from disk (Existence Guard condition)
  - `auth.md` header `Version: 1.2.0`, INDEX.md entry `Version: 1.1.0` (VERSION_DRIFT)
  - L2 spec `api-impl.md` has non-Stable L1 parent (C12 Quarantine condition)
- **Action:** User runs `/magic.analyze`
- **Expected:**
  - [ ] `checksums_mismatch` detected — NOT halted, finding collected
  - [ ] `api.md` missing from disk — NOT halted (Existence Guard bypassed), finding collected
  - [ ] `auth.md` VERSION_DRIFT — NOT halted, finding collected
  - [ ] C12 Quarantine condition — NOT halted, finding collected
  - [ ] All 4 findings surfaced in the final consolidated report
  - [ ] Agent halts ONLY at report delivery (presents findings, awaits user action)
- **Guards tested:** Audit Policy HALT bypass (RE-A2), all 4 bypass categories

### T89 — Analyze Mode C Coverage Check with RESCUE AOP

- **Workflow:** `analyze.md` (Mode C — Coverage Check + RESCUE)
- **Synthetic State:**
  - `INDEX.md`: `auth.md` (Stable) — describes `src/auth/`
  - `src/auth/` deleted; `src/authentication/` exists (new uncovered directory)
  - `auth.md` title: "Authentication System"
  - Similarity between `auth.md` and `src/authentication/`: >80%
- **Action:** User runs `/magic.analyze`
- **Expected:**
  - [ ] Mode C Coverage Check runs within workspace scope
  - [ ] `src/auth/` → orphaned spec (`auth.md`)
  - [ ] `src/authentication/` → uncovered directory
  - [ ] RESCUE AOP: similarity >80% → classified as `RESCUE` (rename opportunity), NOT separate Gap + Orphan entries
  - [ ] Report: "RESCUE: `auth.md` likely renamed to `src/authentication/` — propose registry sync"
- **Guards tested:** RESCUE AOP in Mode C (RE-A3), rename detection, correct classification

### T90 — Analyze Mode C Scope Isolation (C15)

- **Workflow:** `analyze.md` (Mode C — Coverage Check Scope)
- **Synthetic State:**
  - Active workspace: `engine`; scope: `.magic/`, `docs/`
  - Project also has `src/`, `lib/` directories (out of scope)
  - `src/payments/` has no spec coverage
- **Action:** User runs `/magic.analyze`
- **Expected:**
  - [ ] Mode C Coverage Check reads workspace scope from `workspace.json`
  - [ ] Scan restricted to `.magic/` and `docs/` only
  - [ ] `src/payments/` NOT reported as a coverage gap (out of scope)
  - [ ] Only gaps within `.magic/` or `docs/` are reported
- **Guards tested:** C15 scope enforcement in Mode C Coverage Check (RE-A4)

### T91 — Analyze Mode C Checklist Completeness

- **Workflow:** `analyze.md` (Mode C — Task Completion)
- **Synthetic State:**
  - Clean engine workspace. Mode C runs successfully.
- **Action:** Mode C completes and agent presents checklist
- **Expected:**
  - [ ] Agent presents **Mode C: Ventilation** checklist (not Mode A/B checklist)
  - [ ] Every Mode C checklist item is evaluated — among them: self-check, registry audit, structural integrity (if workspace), coverage, rule validation, report delivery, advisory report, C14 not triggered
  - [ ] C14 not triggered (Mode C is read-only — C1 §7 confirmed)
  - [ ] No Mode A/B items (Depth Control, Stack/Arch, Dispatch) appear as pending items
- **Guards tested:** Mode C checklist separation (RE-A5), C14 exemption for read-only mode

### T92 — Spec Update Source of Truth Drift (Cross-Workspace Parity)

- **Workflow:** `spec.md` (§Updating → Sync — Cross-Workspace Parity)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `app`.
  - `engine/auth.md` — Status: Stable, Version: 2.0.0.
  - `app/auth.md` — Status: Stable, Version: 1.5.0.
  - Active workspace: `app`.
- **Action:** "Update auth spec to add OAuth2 support"
- **Expected:**
  - [ ] Pre-flight detects `auth.md` exists in both `engine` (v2.0.0) and `app` (v1.5.0) — version mismatch
  - [ ] Agent **HALTs** before writing any updates to `app/auth.md`
  - [ ] Report: "Source of Truth Drift: `auth.md` exists in `engine` (v2.0.0) and `app` (v1.5.0). Run `/magic.spec` in `engine` (higher version) to reconcile, then re-run the update."
  - [ ] One recommended path — no option menu
  - [ ] No spec content written until the drift is reconciled
- **Guards tested:** RE-A6 (Cross-Workspace Parity in `spec.md` Pre-flight)

### T93 — RE-3 Drift Resolution Validation (Registry-Only Bump Without Review)

- **Workflow:** `spec.md` (§Updating → Sync — Version Drift Guard → Resolution Validation)
- **Synthetic State:**
  - `engine/auth.md` — file header Version: 1.2.0, INDEX.md entry: 1.1.0 (VERSION_DRIFT).
  - User resolves by bumping INDEX.md to 1.2.0 without reviewing the external change.
- **Action:** User says "resolved" after bumping INDEX.md only
- **Expected:**
  - [ ] Agent detects resolution was registry-sync-only (no amendment review)
  - [ ] Agent flags: "External change to `auth.md` between v1.1.0 and v1.2.0 was not reviewed."
  - [ ] Two options presented: (a) Yes — continue, (b) No — revert file header first
  - [ ] After user confirms (a), agent re-evaluates ALL Sync guards from the top before writing
  - [ ] No spec content written until re-evaluation completes
- **Guards tested:** RE-B1 (Resolution Validation sub-rule of Version Drift Guard)

### T94 — C12 Full Registry Scan (Dependents Not Currently Open)

- **Workflow:** `spec.md` (§Updating → Sync — C12 Quarantine)
- **Synthetic State:**
  - `engine/auth.md` — L1, Status: Stable → drops to RFC via amendment.
  - `engine/auth-jwt.md` — L2, `Implements: auth.md`, Status: Stable. Not open/loaded.
  - `engine/auth-oauth.md` — L2, `Implements: auth.md`, Status: Stable. Not open/loaded.
  - INDEX.md lists all three files.
- **Action:** Agent updates `auth.md` status to RFC
- **Expected:**
  - [ ] C12 scans INDEX.md (full registry), NOT just open files
  - [ ] Both `auth-jwt.md` and `auth-oauth.md` discovered as L2 dependents
  - [ ] Both dropped to RFC status
  - [ ] Report: "C12 Cascade: 2 dependents quarantined: [auth-jwt.md, auth-oauth.md]."
- **Guards tested:** RE-B2 (C12 full registry scan strategy)

### T95 — C12 Recursive Depth (L1→L2→L3 Chain)

- **Workflow:** `spec.md` (§Updating → Sync — C12 Quarantine recursive scan)
- **Synthetic State:**
  - `engine/auth.md` — L1, Status: Stable → drops to RFC.
  - `engine/auth-jwt.md` — L2, `Implements: auth.md`, Status: Stable.
  - `engine/auth-jwt-refresh.md` — L3, `Implements: auth-jwt.md`, Status: Stable.
- **Action:** Agent updates `auth.md` status to RFC
- **Expected:**
  - [ ] C12 scan finds `auth-jwt.md` (L2 of auth.md)
  - [ ] Recursive scan finds `auth-jwt-refresh.md` (L3, `Implements: auth-jwt.md`)
  - [ ] Both L2 and L3 dropped to RFC
  - [ ] Report: "C12 Cascade: 2 dependents quarantined: [auth-jwt.md, auth-jwt-refresh.md]."
  - [ ] No L3 silently missed due to fixed-depth scan
- **Guards tested:** RE-B2 (C12 recursive depth — L1→L2→L3)

### T96 — Analyze with Explicit Workspace Argument

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 1)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. Default: `engine`.
- **Action:** `/magic.analyze docs`
- **Expected:**
  - [ ] Agent resolves workspace to `docs` (explicit arg overrides default)
  - [ ] Scan scope restricted to `docs/` paths as defined in `workspace.json`
  - [ ] No prompt to user; prints: "Active workspace: docs" or similar
  - [ ] `engine` workspace not scanned
- **Guards tested:** Workspace Resolution Priority 1 (explicit arg)

### T97 — Analyze Auto-Resolves Single Default Workspace

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 3, multiple + default)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. Default: `engine`.
- **Action:** `/magic.analyze` (no argument)
- **Expected:**
  - [ ] Agent resolves workspace to `engine` (default from `workspace.json`)
  - [ ] No prompt to user; prints: "Active workspace: engine."
  - [ ] Analysis scoped to `engine` workspace paths
- **Guards tested:** Workspace Resolution Priority 3 (multiple workspaces + default)

### T98 — Analyze Selects a Workspace by Forecast When Multiple Workspaces Have No Default

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 3, multiple + no default)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. **No default field.**
  - The current directory's files fall under neither workspace `scope` at ≥50% (`context.md` Workspace Disambiguation, step 4).
- **Action:** `/magic.analyze` (no argument)
- **Expected:**
  - [ ] Agent detects multiple workspaces with no default and no explicit arg
  - [ ] Quick-scan finds no scope covering ≥50% of the cwd's files → the agent chooses by the Consequence Forecast (`context.md` Workspace Disambiguation, step 4): every wrong pick costs the same later move, so the higher coverage wins, then the first in `workspace.json` order
  - [ ] Narrates `[DR] Selecting {workspace} — {criterion}. (Override: /magic.analyze {other})` and proceeds — no question, no HALT
- **Guards tested:** Workspace Resolution Priority 3 (multiple workspaces, no default → forecast, not a question)

### T99 — Analyze with Invalid MAGIC_WORKSPACE Env Var

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 2 validation)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`.
  - `MAGIC_WORKSPACE=frontend` (not in `workspace.json`).
- **Action:** `/magic.analyze` (no explicit arg)
- **Expected:**
  - [ ] Agent reads `MAGIC_WORKSPACE=frontend` (Priority 2)
  - [ ] Validates name against `workspace.json` — not found
  - [ ] **HALT**: "Unknown workspace 'frontend'. Available: [engine, docs]."
  - [ ] Does NOT silently fall through to Priority 3
- **Guards tested:** RE-C1 (MAGIC_WORKSPACE unknown-name validation)

### T100 — Explicit Arg Overrides MAGIC_WORKSPACE

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 1 override)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. Default: `engine`.
  - `MAGIC_WORKSPACE=docs`.
- **Action:** `/magic.analyze engine`
- **Expected:**
  - [ ] Agent uses explicit arg `engine` (Priority 1 overrides Priority 2)
  - [ ] `MAGIC_WORKSPACE=docs` is ignored
  - [ ] Analysis scoped to `engine` workspace
  - [ ] No HALT or conflict warning
- **Guards tested:** RE-C4 (explicit arg overrides env var)

### T101 — Workspace Scope Auto-Applied from workspace.json

- **Workflow:** `analyze.md` (§Workspace Resolution — Scope Auto-Apply)
- **Synthetic State:**
  - `workspace.json` registers `docs` with `scope: ["docs/", "package.json"]`.
  - `MAGIC_WORKSPACE_SCOPE` not set.
- **Action:** `/magic.analyze docs`
- **Expected:**
  - [ ] Workspace resolved to `docs`
  - [ ] Scan boundary auto-set to `["docs/", "package.json"]` from `workspace.json` scope
  - [ ] Files outside `docs/` and `package.json` are NOT scanned
  - [ ] Agent does NOT require separate `MAGIC_WORKSPACE_SCOPE` env var to restrict scope
- **Guards tested:** RE-C2 (workspace scope auto-apply)

### T102 — Mode C Triggered with Workspace Arg via Natural Language

- **Workflow:** `analyze.md` (§Mode C trigger + workspace arg)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. Default: `engine`.
- **Action:** "Ventilate docs"
- **Expected:**
  - [ ] Agent parses `docs` as the workspace argument from natural language
  - [ ] Mode C (Ventilation) triggered
  - [ ] Analysis scoped to `docs` workspace (not default `engine`)
  - [ ] Report covers `docs` scope only
- **Guards tested:** RE-C3 (Mode C trigger + workspace arg in natural language)

### T103 — Ghost Registry Critical HALT Barrier

- **Workflow:** `check-prerequisites.js`
- **Synthetic State:**
  - `cache-layer.md` registered in INDEX.md (Stable)
  - `cache-layer.md` is manually deleted from the `.design/specifications/` folder.
  - No `PLAN.md` exists yet (the first `/magic.task` is about to write it); the outcome is the same with a plan.
- **Action:** Any engine script/workflow triggered (e.g. `magic.task`)
- **Expected:**
  - [ ] `check-prerequisites.js` detects missing file while scanning `INDEX.md` — with or without a `PLAN.md` (T240).
  - [ ] `GHOST_REGISTRY` violation recorded.
  - [ ] **HALT** triggered: `ok: false` due to `GHOST_REGISTRY` failing `integrity_ok` check.
  - [ ] Workflow does not proceed to `view_file` or plan generation, preventing cascading hallucinations.
- **Guards tested:** Engine Integrity (Ghost Registry critical barrier)

### T104 — Mid-Run Spec Demotion Halts Track Before Done

- **Workflow:** `run.md` (§Execution Step 4 — Mid-Run Stability Check)
- **Synthetic State:**
  - Parallel mode active. Two tracks running:
    - Track A: executing `T-1A01` → target spec `auth.md` (L1, Stable at dispatch).
    - Track B: mid-execution, triggers `/magic.spec` amendment on `auth.md` → status drops to RFC.
  - Track A reaches Step 4 (Update) and attempts to commit `Done`.
- **Action:** Track A sets `T-1A01` → `Done`
- **Expected:**
  - [ ] Before committing `Done`, Track A re-reads `INDEX.md`
  - [ ] Detects `auth.md` is now RFC (demoted since dispatch)
  - [ ] **HALT**: "Spec `auth.md` demoted to RFC during execution of `T-1A01`. Task output suspended — run `/magic.task {workspace} update` to re-evaluate."
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
  - [ ] Suggests: run `/magic.task {workspace} update` to re-evaluate the plan
- **Guards tested:** RE-D2 (Manager INDEX.md re-read cadence between assignments)

### T106 — Analyze Dispatch Cross-Workspace Name Collision on Create

- **Workflow:** `spec.md` (§Creating — Cross-Workspace Parity)
- **Synthetic State:**
  - `workspace.json`: `engine` (default), `app`.
  - `engine/l1-auth.md` — Stable, v2.0.0.
  - `app/` INDEX.md: empty (0 specs).
- **Action:** `/magic.analyze app first-time` → Mode A proposes `l1-auth.md` for `app/` workspace → Auto-Dispatch (C9) calls `spec.md` §Creating for `l1-auth.md`
- **Expected:**
  - [ ] spec.md §Creating Pre-flight fires Cross-Workspace Parity check
  - [ ] Detects `l1-auth.md` already exists in `engine` (v2.0.0)
  - [ ] Does **not** HALT and presents no option menu — workspace-prefix naming is auto-applied
  - [ ] Narration: `[Auto-SDD] Name collision on 'l1-auth.md' (exists in 'engine'): creating as 'l1-app-auth.md'. (Override: /magic.spec amend to rename)`
  - [ ] `app/l1-app-auth.md` is created; `engine/l1-auth.md` is untouched
  - [ ] The layer prefix stays first, so `check-prerequisites` raises no `NAMING_VIOLATION` for the new file (T106 harness case)
- **Guards tested:** RE-E1 (Cross-Workspace Parity in spec.md §Creating)

### T107 — Mode B Logic Evolution Triggers Amendment Cascade

- **Workflow:** `analyze.md` (Mode B — Logic Evolution → dispatch)
- **Synthetic State:**
  - `app/auth.md` — L1, Stable, v1.0.0.
  - `app/auth-jwt.md` — L2, Stable, `Implements: auth.md`.
  - `app/src/auth/` — code has structurally drifted: 4 new sub-modules added (>30% threshold).
- **Action:** `/magic.analyze app` → Mode B detects Logic Evolution in `auth.md` → user approves Reality Sync
- **Expected:**
  - [ ] Logic Evolution detected: >30% new sub-modules in `src/auth/`
  - [ ] Reality Sync proposed: structured diff or "New Draft" of `auth.md`
  - [ ] User approves Reality Sync
  - [ ] Dispatch via `spec.md` Amendment Rule: `auth.md` status Stable → RFC
  - [ ] C12 cascade: `auth-jwt.md` (L2 dependent) status dropped to RFC
  - [ ] Report: "C12 Cascade: 1 dependent quarantined: [auth-jwt.md]."
  - [ ] No silent spec update — Amendment Rule and C12 both explicitly triggered
- **Guards tested:** RE-E2 (Logic Evolution amendment cascade + C12 in analyze.md Mode B)

### T108 — Analyze Mode A Pre-flight Step 0 Enforcement

- **Workflow:** `analyze.md` (Mode A — Step 0)
- **Synthetic State:**
  - `.design/` initialized, `INDEX.md` empty (0 specs)
  - Project has 300 source files
- **Action:** `/magic.analyze`, then `/magic.analyze first-time`
- **Expected:**
  - [ ] Mode C runs first (Mode Precedence), then the user runs `/magic.analyze first-time`
  - [ ] Mode A Step 0 fires: `check-prerequisites` called
  - [ ] Depth Control applied: 300 files → agent scans Full and narrates `[DR] Full scan — 300 files. (Override: /magic.analyze "focus")`
  - [ ] Agent builds the full project map without asking
- **Guards tested:** Mode A Step 0 Pre-flight, Depth Control enforcement in operational steps

### T109 — Analyze Mode B Pre-flight Step 0 Enforcement

- **Workflow:** `analyze.md` (Mode B — Step 0)
- **Synthetic State:**
  - `INDEX.md` has 5 active specs
  - Project has 800 source files
- **Action:** "Re-analyze project"
- **Expected:**
  - [ ] Mode B Step 0 fires: `check-prerequisites` called
  - [ ] Depth Control applied: 800 files → Focused or Quick chosen by the Consequence Forecast (DA-10); with 5 active specs the spec graph names the largest uncovered module, and if it holds fewer than 500 files the scan is Focused on it, narrated as a `[DR]`
  - [ ] No question: the scan proceeds after the narration
- **Guards tested:** Mode B Step 0 Pre-flight, Depth Control enforcement for large projects

### T110 — Analyze Direct Trigger Auto-Init

- **Workflow:** `analyze.md` (Auto-Init — Invariant 2)
- **Synthetic State:**
  - `.design/` does NOT exist
  - Project has source code
- **Action:** `/magic.analyze` (direct trigger, NOT via `spec.md` delegation)
- **Expected:**
  - [ ] `analyze.md` Invariant 2 fires: `.design/` missing detected
  - [ ] Auto-trigger `.magic/init.md` before any scanning
  - [ ] `.design/` created with all 6 artifacts
  - [ ] Analysis resumes after init completes
- **Guards tested:** Auto-Init (Invariant 2) on direct analyze trigger

### T111 — Spec Delta-Editing Enforcement (>200 Lines)

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth.md` (Stable, 250 lines)
  - User requests adding a new section
- **Action:** Agent updates `auth.md`
- **Expected:**
  - [ ] Pre-flight detects >200 lines → delta-editing mode activated (Invariant 9)
  - [ ] Agent uses search-replace operations instead of full file rewrite
  - [ ] Changed sections marked with `[ADDED]`, `[MODIFIED]`, or `[REMOVED]`
  - [ ] No content corruption from full-file replacement on large spec
- **Guards tested:** Delta-Editing (Invariant 9) in operational step

### T112 — Spec Ventilation Routing (No Phantom C21)

- **Workflow:** `spec.md` (Ventilation invariant)
- **Synthetic State:**
  - `.design/` initialized, INDEX.md has 5 specs
  - User says "Ventilate" or "Check specs deeply"
- **Action:** Agent processes ventilation intent
- **Expected:**
  - [ ] Agent routes to `analyze.md` Mode C (not a phantom C21 convention)
  - [ ] `analyze.md` is read and its workflow followed
  - [ ] No reference to undefined convention ID in agent output
- **Guards tested:** Ventilation routing without phantom convention reference

### T113 — Analyze Argument Routing: Workspace vs Focus Disambiguation

- **Workflow:** `analyze.md` (§Argument Routing)
- **Synthetic State:**
  - `workspace.json` registers: `engine`, `docs`.
- **Test A — Unquoted workspace name:**
  - **Action:** `/magic.analyze engine`
  - **Expected:**
    - [ ] Argument matches workspace name → Workspace Analysis mode
    - [ ] Mode C (with Structural Integrity) → A/B scoped to `engine`
- **Test B — Quoted workspace name (force focus):**
  - **Action:** `/magic.analyze "engine"`
  - **Expected:**
    - [ ] Argument is quoted → treated as focus text, NOT workspace
    - [ ] Mode D triggered: focus directive = "engine"
    - [ ] Agent searches for project areas matching keyword "engine"
- **Test C — Workspace + focus:**
  - **Action:** `/magic.analyze docs "check tests"`
  - **Expected:**
    - [ ] First token `docs` matches workspace → workspace resolved
    - [ ] Remaining `"check tests"` → focus directive
    - [ ] Mode D scoped to `docs` workspace
- **Guards tested:** Argument Routing disambiguation, quote-wrapping override

### T114 — Analyze Mode D: Focused Analysis on Specific Area

- **Workflow:** `analyze.md` (Mode D — Focused Analysis)
- **Synthetic State:**
  - `workspace.json`: `app` workspace, scope: `src/`
  - `INDEX.md` has 3 specs: `api.md` (covers `src/api/`), `auth.md` (covers `src/auth/`), `ui.md` (covers `src/components/`)
  - `src/api/` has 5 files, `src/auth/` has 3 files, `src/components/` has 20 files
  - `src/utils/` exists (no spec, 8 files)
- **Action:** `/magic.analyze app "check API coverage"`
- **Expected:**
  - [ ] Focus directive parsed: intent = API coverage check
  - [ ] Targeted scan: only `src/api/` and related API areas examined (not full project)
  - [ ] Focused Gap Report: `src/api/` → Covered by `api.md`
  - [ ] `src/utils/` NOT reported (out of focus scope)
  - [ ] Advisory Report included, scoped to API area
  - [ ] Depth Control exempt (targeted scan)
- **Guards tested:** Mode D focus parsing, targeted scan scope, Advisory inclusion

### T115 — Analyze Mode D: Focus Matches Nothing

- **Workflow:** `analyze.md` (Mode D — HALT on no match)
- **Synthetic State:**
  - `workspace.json`: `engine` workspace
  - Project has `src/core/`, `src/scripts/`, `docs/`
- **Action:** `/magic.analyze "blockchain integration"`
- **Expected:**
  - [ ] Focus directive parsed: intent = blockchain integration
  - [ ] Targeted scan: no folders, spec titles, or modules match "blockchain"
  - [ ] **HALT**: "Could not map focus 'blockchain integration' to any project area. Try narrowing with a workspace: `/magic.analyze {workspace} \"blockchain integration\"`, or rephrase the focus."
  - [ ] No scan started, no report generated
- **Guards tested:** Mode D HALT on empty match, improved HALT message

### T116 — Analyze Mode C: Structural Integrity Violations

- **Workflow:** `analyze.md` (Mode C — Structural Integrity step)
- **Synthetic State:**
  - `workspace.json` registers `api` workspace with scope `src/api/`, folder `.design/api/`
  - `.design/api/` exists but:
    - `INDEX.md` is missing
    - `specifications/` contains `My Spec.md` (not kebab-case)
    - `specifications/orphan-spec.md` exists but is NOT listed in workspace INDEX
  - `workspace.json` scope entry `src/legacy/` does NOT exist on disk
- **Action:** `/magic.analyze api`
- **Expected:**
  - [ ] Structural Integrity fires (workspace specified)
  - [ ] STRUCTURE violation: `INDEX.md` missing (required)
  - [ ] STRUCTURE violation: `My Spec.md` — not kebab-case
  - [ ] Registry Audit (step 2, not step 3): `orphan-spec.md` — file exists but no INDEX entry → Orphan finding
  - [ ] STRUCTURE violation: scope path `src/legacy/` does not exist on disk
  - [ ] The step 3 violations (missing `INDEX.md`, non-kebab-case name, missing scope path) are reported under the `STRUCTURE` category, separate from Drift/Gap/Orphan
  - [ ] Mode C continues to subsequent steps (coverage, rules) after structural report
- **Guards tested:** Structural Integrity all 6 sub-checks, STRUCTURE category separation

### T117 — Analyze Advisory Report Generation Across Modes

- **Workflow:** `analyze.md` (§Advisory Report — all modes)
- **Synthetic State:**
  - `workspace.json`: `app` workspace
  - `INDEX.md` has 2 specs:
    - `core.md` — L1 Stable, 350 lines (oversized), no L2 children
    - `utils.md` — L2 Stable, no L1 parent
  - `src/tests/` directory: 15 files, no corresponding spec
  - `app/RULES.md` §7 repeats 2 conventions already in global `RULES.md` §6
- **Test A — Mode A generates Advisory:**
  - **Action:** INDEX.md empty → Mode A runs → Advisory step fires
  - **Expected:**
    - [ ] Advisory Report appended to Mode A output
- **Test B — Mode B generates Advisory:**
  - **Action:** INDEX.md has specs → Mode B runs → Advisory step fires
  - **Expected:**
    - [ ] Spec Quality: `core.md` flagged as oversized (>300 lines), split suggested
    - [ ] Spec Quality: `core.md` flagged as bare L1 (no L2 children)
    - [ ] Spec Quality: `utils.md` flagged as orphan L2 (no parent L1)
    - [ ] Coverage Strategy: `src/tests/` flagged (15 files, no spec) → suggest `test-suite.md`
    - [ ] Structural Improvements: 2 workspace rules duplicated by a higher tier → `RULE_RETIRE_CANDIDATE {id}: b` with `→ /magic.rule remove {id}`
    - [ ] Each finding has concrete Action Proposal (`→ /magic.spec ...` or `→ /magic.rule ...`)
- **Test C — Mode C generates Advisory:**
  - **Action:** `/magic.analyze app` → Mode C completes → Advisory step fires
  - **Expected:**
    - [ ] Advisory Report appended after Mode C report (step 15)
    - [ ] Same findings as Test B (spec quality + coverage + structural)
- **Guards tested:** Advisory generation in all modes (not just Mode D), Action Proposals format

### T118 — Analyze Mode D: Depth Control Fallback on Wide Focus

- **Workflow:** `analyze.md` (Mode D — Depth Control exemption + fallback)
- **Synthetic State:**
  - Large project: 800 source files
  - No workspace specified
- **Test A — Narrow focus:**
  - **Action:** `/magic.analyze "authorization"`
  - **Expected:**
    - [ ] Focus matches `src/auth/` (12 files) → Depth Control exempt
    - [ ] Targeted scan proceeds without prompting
- **Test B — Wide focus resolving to >500 files:**
  - **Action:** `/magic.analyze "all components"`
  - **Expected:**
    - [ ] Focus matches `src/` (600+ files)
    - [ ] Depth Control fallback triggers: the named focus itself covers 600+ files, so no focus under 500 can be derived → the forecast chooses Quick (DA-10) and narrates the `[DR]`
    - [ ] Agent does NOT deep-scan 600+ files, and asks nothing
- **Guards tested:** Mode D Depth Control exemption for narrow focus, fallback for wide focus (>500 files)

### T119 — Analyze Mode C: Scope Blind-Spot Detection

- **Workflow:** `analyze.md` (Mode C — Scope Blind-Spot Check)
- **Synthetic State:**
  - `workspace.json` registers: `api` (scope: `packages/api/`), `web` (scope: `packages/web/`)
  - Project also has `packages/shared/`, `infra/`, `scripts/` at top level
  - None of these extra directories are in any workspace scope
- **Action:** `/magic.analyze api`
- **Expected:**
  - [ ] Mode C step 11 fires: union of all workspace scopes = `packages/api/` + `packages/web/`
  - [ ] `packages/shared/`, `infra/`, `scripts/` detected as not in any scope
  - [ ] Report includes `UNSCOPED` warnings for each: "Directory 'packages/shared/' is not in any workspace scope — invisible to scoped analysis."
  - [ ] Warnings are non-halting (informational, included in consolidated report)
- **Guards tested:** Scope Blind-Spot Check, UNSCOPED category

### T120 — Analyze Registry Audit: Case Mismatch on Case-Insensitive FS

- **Workflow:** `analyze.md` (Mode C — Registry Audit exact match)
- **Synthetic State:**
  - OS: Windows (case-insensitive filesystem)
  - `INDEX.md` lists `api-routes.md`
  - Disk file is `specifications/API-Routes.md`
  - File is accessible via both names on Windows
- **Action:** `/magic.analyze api`
- **Expected:**
  - [ ] Registry Audit uses exact string match (not OS file-exists)
  - [ ] `api-routes.md` (INDEX) ≠ `API-Routes.md` (disk) → registry violation detected
  - [ ] Structural Integrity also flags `API-Routes.md` as non-kebab-case
  - [ ] Report includes both violations (registry mismatch + naming convention)
  - [ ] Agent does NOT report "file not found" — it recognizes the case mismatch
- **Guards tested:** Exact string match in Registry Audit, case-insensitive FS edge case

### T121 — Analyze Mode D: Project-Wide Focus Bypasses C15

- **Workflow:** `analyze.md` (Mode D — C15 exception)
- **Synthetic State:**
  - `workspace.json`: `api` (scope: `packages/api/`), `web` (scope: `packages/web/`)
  - `packages/shared/utils.js` exists (not in any workspace scope)
  - No workspace argument provided
- **Test A — Focus without workspace:**
  - **Action:** `/magic.analyze "utils"`
  - **Expected:**
    - [ ] Mode D triggered, no workspace → project-wide scan
    - [ ] C15 scope NOT enforced (focus is the boundary)
    - [ ] `packages/shared/utils.js` found and included in Focused Gap Report
    - [ ] Directories outside all scopes are reachable
- **Test B — Focus with workspace:**
  - **Action:** `/magic.analyze api "utils"`
  - **Expected:**
    - [ ] Mode D triggered, workspace `api` → C15 applied (scope: `packages/api/`)
    - [ ] `packages/shared/utils.js` NOT found (out of `api` scope)
    - [ ] Only `packages/api/` searched for "utils" matches
- **Guards tested:** Mode D C15 exception (project-wide), C15 enforcement (workspace-scoped)

### T122 — Simulate C14 Enforcement Gate Blocks Report

- **Workflow:** `simulate.md` (§Reporting & Fixes — C14 Enforcement Gate)
- **Synthetic State:**
  - Agent ran `/magic.dev.simulate spec` and found 2 ROUGH EDGEs
  - Agent applied surgical patches to `.magic/spec.md`
  - Agent is about to report results
- **Action:** Agent reaches Reporting step
- **Expected:**
  - [ ] C14 Enforcement Gate fires: "were any `.magic/` files modified during this `/magic.dev.simulate` invocation?"
  - [ ] Answer: yes (`spec.md` patched) → `update-engine-meta` runs
  - [ ] `.version` bumped, `.checksums` regenerated
  - [ ] Only AFTER checksums match does the agent present results
  - [ ] If agent skips Gate and reports first → **FAIL**
- **Guards tested:** C14 Enforcement Gate blocking semantics

### T123 — Simulate Succession Max 2-Round Guard

- **Workflow:** `simulate.md` (§Succession — max iterations)
- **Synthetic State:**
  - Round 1: `/magic.dev.simulate test` finds 1 FAIL → agent patches → C14 Gate → Succession
  - Round 2: `/magic.dev.simulate test` finds 1 new FAIL (introduced by Round 1 fix) → agent patches → C14 Gate → Succession
  - Round 3 would start
- **Action:** Agent reaches 3rd Succession attempt
- **Expected:**
  - [ ] Agent detects round >2
  - [ ] Agent does NOT start a 3rd fix cycle
  - [ ] Agent reports: "Max Succession rounds (2) reached. Remaining issues: [list]."
  - [ ] Simulation completes with open issues documented
- **Guards tested:** Succession max 2-round guard, infinite loop prevention

### T124 — Simulate File-Path Argument Routing

- **Workflow:** `simulate.md` (§Mode Selection — file-path support)
- **Synthetic State:**
  - All engine files present and valid
- **Test A — Workflow name:**
  - **Action:** `/magic.dev.simulate spec`
  - **Expected:**
    - [ ] Direct mode: cognitive walkthrough of `spec.md`
- **Test B — File path:**
  - **Action:** `/magic.dev.simulate @/path/to/magic.analyze.md`
  - **Expected:**
    - [ ] File path parsed: workflow name extracted as `analyze`
    - [ ] Direct mode: cognitive walkthrough of `analyze.md`
    - [ ] Same behavior as `/magic.dev.simulate analyze`
- **Guards tested:** File-path argument parsing, equivalence with workflow-name argument

### T125 — Checklist Consolidation Strategic/Tactical Split

- **Workflow:** `task.md` + `run.md`
- **Synthetic State:**
  - 2 Stable specs: `auth.md`, `api.md`
  - RULES.md v1.3.0 (contains C10 Checklist Consolidation)
  - templates/plan.md and templates/tasks.md updated
- **Action 1: Generate tasks (`task.md`)**
- **Expected 1:**
  - [ ] **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace={active-workspace}`.
    - [ ] **C15 Filter**: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **HALT** ONLY if in-scope files are mismatched.
    - [ ] **File-Header Parity**: For each spec in `INDEX.md`, read the actual file's `Status:` and `Version:` header fields. If either mismatches the corresponding `INDEX.md` entry → **HALT** with `STATUS_DRIFT` or `VERSION_DRIFT`. Report: "Header parity failure on `{file}`: file {field} `{file_val}` ≠ registry `{index_val}`. Run `/magic.spec` to reconcile spec headers, then re-run `/magic.task`." This catches manual edits that bypassed the spec workflow.
    - [ ] **Cross-Workspace Parity**: If `workspace.json` registers >1 workspace, scan for identically-named spec files across workspaces. If any name collision with version mismatch is found → **HALT**. Report: "Source of Truth Drift: `{file}` exists in `{ws-a}` (v{X}) and `{ws-b}` (v{Y}). Run `/magic.spec` in `{ws-a}` (higher version) to reconcile, then re-run `/magic.task`." One recommended path — no option menu.
  - [ ] `PLAN.md` created: contains high-level entries for `auth.md` and `api.md` with single `[ ]` checkboxes. **No nested atomic tasks.**
  - [ ] `TASKS.md` created: contains **Phase Checklist** with atomic items prefixed with `[T-XXXX]` (e.g., `[ ] [T-1A01] Implement auth login`).
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

### T126 — Run File-Header Parity Catches Manual Demotion

- **Workflow:** `run.md`
- **Synthetic State:**
  - `docs-architecture.md` (L1): file header `Status: Draft`, `Version: 2.0.0`
  - `INDEX.md` entry for `docs-architecture.md`: `Status: Stable`, `Version: 1.0.0`
  - Active phase-1 tasks reference `docs-node.md` (L2, Implements: docs-architecture.md)
- **Action:** `/magic.run` triggered to execute phase-1 tasks
- **Expected:**
  - [ ] Pre-flight File-Header Parity detects STATUS_DRIFT on `docs-architecture.md` (file=Draft ≠ INDEX=Stable)
  - [ ] Pre-flight File-Header Parity detects VERSION_DRIFT on `docs-architecture.md` (file=2.0.0 ≠ INDEX=1.0.0)
  - [ ] **HALT** before any task execution with drift report (Cognitive Guard)
  - [ ] C12 cascade is NOT triggered prematurely (drift must be resolved first)
  - [ ] User directed to resolve via `/magic.spec`, then re-run `/magic.task` (per `rules/MAGIC.md §5` Post-Task Replan — single user-facing recommendation, no `/magic.analyze` step)
- **Guards tested:** File-Header Parity (run.md, Cognitive Guard), STATUS_DRIFT, VERSION_DRIFT, C12 pre-condition ordering

### T127 — Task Pre-flight File-Header Parity Scan

- **Workflow:** `task.md`
- **Synthetic State:**
  - `engine/INDEX.md` lists `engine-core.md` as Stable v1.1.0
  - Actual file `engine-core.md` header: `Status: RFC`, `Version: 1.2.0` (manual edit)
  - `engine-automation.md` (L2, Implements: engine-core.md) listed as Stable
- **Action:** `/magic.task` triggered to generate plan
- **Expected:**
  - [ ] Pre-flight File-Header Parity detects STATUS_DRIFT on `engine-core.md` (file=RFC ≠ INDEX=Stable)
  - [ ] Pre-flight File-Header Parity detects VERSION_DRIFT on `engine-core.md` (file=1.2.0 ≠ INDEX=1.1.0)
  - [ ] **HALT** before plan generation (Cognitive Guard)
  - [ ] `engine-automation.md` is NOT moved to Backlog yet (drift must be resolved before C12 evaluates)
- **Guards tested:** File-Header Parity (task.md, Cognitive Guard), STATUS_DRIFT blocks C6/C12 evaluation

### T128 — Spec Version Drift Guard Scans Dependency Chain

- **Workflow:** `spec.md`
- **Synthetic State:**
  - Target: `docs-node.md` (L2, Implements: docs-architecture.md)
  - `docs-node.md` header matches INDEX.md (no drift)
  - `docs-architecture.md` (L1 parent): file header `Version: 2.0.0`, INDEX.md says `Version: 1.0.0`
- **Action:** `/magic.spec` update `docs-node.md` with "add plugin hooks"
- **Expected:**
  - [ ] Version Drift Guard scans dependency chain: `docs-node.md` → `docs-architecture.md`
  - [ ] Detects VERSION_DRIFT on parent `docs-architecture.md` (file=2.0.0 ≠ INDEX=1.0.0)
  - [ ] **HALT** before writing updates to `docs-node.md` (Cognitive Guard)
  - [ ] Report names the drifted dependency (not just the target)
  - [ ] User directed to resolve parent drift first
- **Guards tested:** Version Drift Guard (dependency chain scan, Cognitive Guard), Related Specifications traversal

### T129 — Simulate Pre-flight Blocks on Engine Integrity Failure

- **Workflow:** `simulate.md` (§0 Pre-flight)
- **Synthetic State:**
  - `.magic/.checksums` has been manually altered (hash mismatch)
  - `check-prerequisites --json` returns `checksums_mismatch: true`
- **Action:** `/magic.dev.simulate test` triggered
- **Expected:**
  - [ ] Pre-flight Step 0 runs `check-prerequisites --json`
  - [ ] Agent detects `checksums_mismatch` in output
  - [ ] **HALT** with report: "Engine integrity failure — resolve before simulating."
  - [ ] Agent does NOT fall through to Mode Selection or execute any test scenarios
  - [ ] No suite.md tests are evaluated
- **Guards tested:** Pre-flight engine integrity gate (Step 0), HALT-before-mode-selection enforcement

### T130 — Improv Mode Crisis Template Structural Validation

- **Workflow:** `simulate.md` (§1a Crisis Template)
- **Synthetic State:**
  - `workspace.json` has 2 workspaces: `engine`, `docs`
  - All engine files valid
- **Action:** `/magic.dev.simulate` (no args — Improv mode)
- **Expected:**
  - [ ] Agent synthesizes a crisis with a named scenario (CR-6)
  - [ ] Crisis header block presented before walkthrough with all CR-1 through CR-6 fields
  - [ ] CR-1: ≥2 workflows affected (listed explicitly)
  - [ ] CR-2: Full Spec→Task→Run chain traced (no link skipped)
  - [ ] CR-3: ≥2 workspaces involved (since `workspace.json` has >1)
  - [ ] CR-4: ≥3 distinct C{N} guards targeted (listed by ID)
  - [ ] CR-5: ≥1 out-of-band mutation described
  - [ ] If any CR requirement is not met and not documented as skipped → **FAIL**
- **Guards tested:** Crisis Template completeness, CR-1 through CR-6 enforcement

### T131 — Simulate Guard Resilience Reports Mechanical vs Instructional

- **Workflow:** `simulate.md` (§3 Cognitive Coverage Report — Guard Resilience)
- **Synthetic State:**
  - Target: `run.md`
  - Guards applicable: C12 (mechanical — INDEX.md check), C7 (instructional — no HALT keyword), C14 (mechanical — checksums), Spec Stability (instructional — explicit HALT in `run.md` Logic Guard)
- **Action:** Agent evaluates Guard Resilience metric for `run.md`
- **Expected:**
  - [ ] Each guard classified as **Mechanical** or **Instructional** before testing
  - [ ] Mechanical guards tested against script output behavior (PASS/FAIL)
  - [ ] Instructional guards tested for explicit HALT keyword presence (PASS/PARTIAL)
  - [ ] C7 scored as PARTIAL (instruction exists, no HALT keyword, relies on LLM compliance)
  - [ ] Spec Stability scored as PASS (explicit HALT in `run.md` Logic Guard: "Demoted (`Stable`→`RFC` or `Draft`) since plan generation → **HALT**")
  - [ ] Final report uses format: `"Mechanical: X/Y, Instructional: A/B (C partial)"`
  - [ ] Single combined score calculated but breakdown visible
- **Guards tested:** Guard Resilience metric decomposition, Mechanical vs Instructional classification

### T132 — Simulate Context Bleed Warning in Succession Report

- **Workflow:** `simulate.md` (§3 Succession — Context Bleed Warning)
- **Synthetic State:**
  - Agent ran `/magic.dev.simulate spec`, found 1 ROUGH EDGE, applied fix
  - C14 gate passed
  - Succession round 1: 0 regressions
- **Action:** Agent produces final simulation report
- **Expected:**
  - [ ] Report includes context bleed warning: `"⚠ Succession ran in-context. For unbiased verification, run /magic.dev.simulate test in a fresh session."`
  - [ ] Warning appears in final report text (not buried in checklist)
  - [ ] If warning is missing → **FAIL**
- **Guards tested:** Context Bleed Warning enforcement, wrapper-implementation sync

### T133 — Suite Integrity Timing: Test Mode Validates Before Execution

- **Workflow:** `simulate.md` (§2 Suite Integrity — timing rule)
- **Synthetic State:**
  - `dev/tests/suite.md` exists but T14 has a malformed header: `### T14: Missing Dash` (colon instead of dash)
  - suite.md has 20 valid tests + 1 malformed
- **Action:** `/magic.dev.simulate test` triggered
- **Expected:**
  - [ ] Suite Integrity check runs **before** scenario execution (timing: `test` mode)
  - [ ] Malformed T14 detected: header uses `:` instead of `—` (dash)
  - [ ] Agent reports structural violation before PASS/FAIL table
  - [ ] Agent either skips T14 with a note or halts for repair
  - [ ] Remaining 20 valid tests proceed normally
- **Guards tested:** Suite Integrity timing (pre-execution in test mode), structural format enforcement

### T134 — Context Resolution Consistency Across Workflows

- **Workflow:** All workflows (`spec.md`, `task.md`, `run.md`, `analyze.md`, `init.md`, `rule.md`, `simulate.md`)
- **Synthetic State:**
  - `workspace.json` has 2 workspaces: `engine` (default), `docs`
  - `MAGIC_WORKSPACE` env var is set to `docs`
  - User runs `/magic.spec` (no explicit workspace arg)
- **Expected:**
  - [ ] Agent resolves workspace using priority chain: explicit arg (none) > `MAGIC_WORKSPACE` (`docs`) → uses `docs`
  - [ ] Same resolution logic produces same result in `task.md`, `run.md`, `rule.md`, `simulate.md`, `init.md`
  - [ ] `analyze.md` full Workspace Resolution table produces identical result for same inputs
  - [ ] No workflow falls back to `workspace.json` default when `MAGIC_WORKSPACE` is set
- **Guards tested:** Context Resolution parity across all workflows, priority chain consistency

### T135 — Trust Mode Terminology Consistency

- **Workflow:** `spec.md` (Status Lifecycle, Dispatching, Actionable Outcome)
- **Synthetic State:**
  - Input: "Add JWT auth to the API"
  - No RULES.md conflicts, no circular dependencies, no VERSION_DRIFT
  - `auth.md` exists (Stable)
- **Action:** Agent processes raw input dispatch in Trust Mode
- **Expected:**
  - [ ] All references to autonomous operation cite "Trust Mode (C9)" — not "Autonomous Mode"
  - [ ] Auto-promotion to Stable requires all 4 conditions: (a) no RULES.md conflicts, (b) no circular deps, (c) layer constraints satisfied, (d) MVC satisfied (Overview + at least one substantive design section)
  - [ ] No vague qualifiers ("crystal clear", "high-confidence") used in decision logic
  - [ ] Summary appended: `[Auto-SDD] {Spec} promoted to Stable; updated registry.`
- **Guards tested:** Trust Mode (C9) terminology consistency, quantified promotion criteria

### T136 — C12 Cascade: Spec Workflow Modifies INDEX, Task Workflow Does Not

- **Workflow:** `spec.md` + `task.md` (C12 interaction)
- **Synthetic State:**
  - `docs-architecture.md` (L1, Stable) demoted to RFC via `spec.md`
  - `docs-node.md` (L2, Implements: docs-architecture.md, Stable)
  - `TASKS.md` has active tasks for `docs-node.md`
- **Test 1 — spec.md C12 cascade:**
  - **Action:** Agent completes L1 status change in `spec.md`
  - **Expected:**
    1. **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
    - `ok: true` → proceed.
    - Any other result → branch per `init.md` §1: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **C15 Filter** (**HALT** only if in-scope); missing `.design/` → auto-run `.magic/init.md`, then resume; unrecognized failure → **HALT**.
    - [ ] `INDEX.md` updated: `docs-node.md` status set to `RFC`
    - [ ] File header of `docs-node.md` updated to match
    - [ ] Report: "C12 Cascade: 1 dependent quarantined: [docs-node.md]."
- **Test 2 — task.md reacts to INDEX.md state:**
  - **Action:** `/magic.task update` triggered after C12 cascade
  - **Expected:**
    - [ ] `task.md` reads `INDEX.md`, sees `docs-node.md` = RFC
    - [ ] Tasks for `docs-node.md` marked `Blocked [!]` with reason: "L1 parent `docs-architecture.md` is `RFC` (C12)"
    - [ ] `docs-node.md` moved to `## Backlog` in `PLAN.md`
    - [ ] `task.md` does **NOT** modify `INDEX.md` (read-only for status)
- **Guards tested:** C12 ownership (spec.md writes INDEX, task.md reads only), cascade behavioral contract

### T137 — Rule Workflow Pre-flight HALT on Checksum Mismatch

- **Workflow:** `rule.md` (§Operational Logic — Pre-flight)
- **Synthetic State:**
  - `.magic/.checksums` has been manually altered (hash mismatch)
  - `check-prerequisites --json` returns `checksums_mismatch: true`
- **Action:** `/magic.rule add "New convention"` triggered
- **Expected:**
  1. **Check**: `node .magic/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
  - If `ok: true` → Skip silently. Return control to calling workflow.
  - If `ok: false` & contains `ENGINE_INTEGRITY` or `GHOST_REGISTRY` warnings:
    - **C15 Filter**: Cross-reference mismatched files against `workspace.json` scope for `{active-workspace}`.
    - If all mismatches are **out-of-scope** → **Proceed** silently (Log: "Integrity drift detected in out-of-scope files; ignoring per C15").
    - If any mismatch is **in-scope** → **HALT**. Report: "Engine integrity failure (In-Scope): {warning_type}. Run `node .magic/scripts/executor.js update-engine-meta` or restore from origin."
  - If `ok: false` & missing system files (no integrity warnings) → proceed to Step 2 (Init).
  - If `ok: false` & reason is unrecognized → **HALT**. Report: "Unexpected pre-flight failure: {raw output}. Investigate manually."
  - [ ] Pre-flight runs `check-prerequisites --json`
  - [ ] Agent detects `checksums_mismatch`
  - [ ] **HALT** with report: "Engine integrity failure. Run `update-engine-meta` or restore from origin."
  - [ ] No rule proposal is shown
  - [ ] No RULES.md modification occurs
- **Guards tested:** Rule pre-flight HALT condition, engine integrity gate

### T138 — Init Handles Unrecognized Pre-flight Failure

- **Workflow:** `init.md` (Step 1 — unrecognized failure branch)
- **Synthetic State:**
  - `check-prerequisites --json` returns `ok: false` with an unknown field: `{"ok": false, "unknown_error": "disk_full"}`
  - No `ENGINE_INTEGRITY`, no `GHOST_REGISTRY`, no missing system files
- **Action:** Calling workflow triggers init
- **Expected:**
  - [ ] Agent recognizes `ok: false` without matching any known failure category
  - [ ] **HALT** with report: "Unexpected pre-flight failure: {raw output}. Investigate manually."
  - [ ] Agent does NOT proceed to Step 2 (Init)
  - [ ] Agent does NOT silently ignore the failure
- **Guards tested:** Init else-branch for unrecognized failures, fail-safe HALT

### T139 — Spec Deprecation Cascade Flags Stale Implements Link

- **Workflow:** `spec.md` (Updating — Deprecation Cascade)
- **Synthetic State:**
  - `auth-concept.md` (Stable L1), `auth-impl.md` (Stable L2, Implements: auth-concept.md), `auth-tests.md` (Stable L2, Related Specifications: auth-concept.md)
- **Action:** User says "Deprecate auth-concept.md"
- **Expected:**
  - [ ] `auth-concept.md` status → Deprecated, INDEX.md updated — deprecation proceeds without blocking
  - [ ] Deprecation Cascade scans INDEX.md for `Implements: auth-concept.md` → finds `auth-impl.md`
  - [ ] Report: "L2 `auth-impl.md` has no valid L1 parent — `auth-concept.md` is Deprecated."
  - [ ] Deprecation Cascade scans for `Related Specifications` referencing `auth-concept.md` → finds `auth-tests.md`
  - [ ] Report: "`auth-tests.md` references Deprecated spec `auth-concept.md` in Related Specifications."
  - [ ] Post-Update Review surfaces findings as actionable warnings with suggested commands (`→ /magic.spec amend` or `→ /magic.spec deprecate`)
  - [ ] Deprecation is NOT blocked by dependent specs — non-blocking cascade
- **Guards tested:** Deprecation Cascade (Implements + Related), non-blocking report via Post-Update Review

### T140 — Rule Remove Dependency Scan Warns on Referenced Convention

- **Workflow:** `rule.md` (Remove — Dependency Scan)
- **Synthetic State:**
  - RULES.md §7 C5: "All specs must use kebab-case filenames"
  - `analyze.md` Mode C step 3 references "kebab-case convention" with C5 check
- **Action:** `"Remove rule C5"`
- **Expected:**
  1. Run `node .magic/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
  - `ok: true` → proceed.
  - Any other result → branch per `init.md` §1: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **C15 Filter** (**HALT** only if in-scope); missing `.design/` → auto-run `.magic/init.md`, then resume; unrecognized failure → **HALT**.
  - [ ] Before asking, agent scans `.magic/*.md` and `.design/` for `C5` references
  - [ ] Reference found in `analyze.md`
  - [ ] The confirmation includes the dependency warning: "Convention `C5` is referenced by: [analyze.md: Mode C Structural Integrity]. Removing it may break workflow logic or spec compliance."
  - [ ] Exactly one confirmation (DA-5 single question) showing the dependency list — no separate approval step
  - [ ] If confirmed → C5 deleted, Major version bump
- **Guards tested:** Remove Dependency Scan integrated into the single Remove confirmation (no extra gate)

### T141 — Run Handoff Collapses to /magic.task (Post-Task Replan)

- **Workflow:** `run.md` (Step 4 — Handoff)
- **Synthetic State:**
  - `TASKS.md` Phase 1 task `T-1A01` mapped to `auth.md`
  - During execution, spec is ambiguous → HALT triggered
- **Action:** Agent halts and recommends exactly ONE command — `/magic.task {workspace}` — per `rules/MAGIC.md §5` Post-Task Replan. Inside `/magic.task`, Pre-flight HALTs with a single `/magic.spec` recommendation; user runs `/magic.spec`, then re-runs `/magic.task`.
- **Expected:**
  - [ ] Agent records Blocked status with reason in TASKS.md
  - [ ] Agent recommends `/magic.task` (with workspace context); does NOT proactively propose `/magic.analyze` or `/magic.spec`
  - [ ] `/magic.task` Pre-flight surfaces the `/magic.spec` recommendation on substantive spec gap
  - [ ] After spec update + re-run of `/magic.task`, dependencies rebuilt and task validity re-verified before resuming execution
- **Guards tested:** Post-Task Replan collapse (run → task → optional HALT → spec → task → run); never two user-facing commands in sequence

### T142 — Simulate HALT Includes Recovery Hint

- **Workflow:** `simulate.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `.magic/.checksums` exists but `run.md` checksum mismatches (file was modified)
- **Action:** `/magic.dev.simulate run`
- **Expected:**
  - [ ] `check-prerequisites` reports `checksums_mismatch` for `run.md`
  - [ ] **HALT** — no simulation proceeds
  - [ ] Report includes recovery hint: `update-engine-meta` or restore from origin
  - [ ] Agent does NOT fall through to any mode
- **Guards tested:** Simulate pre-flight HALT with actionable recovery hint

### T143 — Rule Core-Amendment Routing Gate

- **Workflow:** `rule.md` (Guards — Core-Amendment Routing)
- **Synthetic State:**
  - RULES.md: §3 Layer Rules contain "L2 cannot enter RFC until L1 is Stable"
- **Action:** `"Change rule: L2 can enter RFC regardless of L1 status"`
- **Expected:**
  - [ ] Agent identifies target: §3 (core section)
  - [ ] Core-Amendment Routing activates: "This targets core section §3. Core amendments require explicit approval and trigger a Major version bump."
  - [ ] User must explicitly confirm
  - [ ] If denied → abort, no changes
  - [ ] If confirmed → §3 updated, RULES.md Major version bump
- **Guards tested:** Core-Amendment Routing gate, explicit approval requirement

### T144 — Analyze Mode A Auto-Dispatches, a Hard Fork Included

- **Workflow:** `analyze.md` (Mode A — Proposal step)
- **Synthetic State:**
  - `.design/INDEX.md` empty, project has `src/` with 30 files
- **Action:** `/magic.analyze` (Mode C, then `[DR] Next: /magic.analyze first-time`), then `/magic.analyze first-time` → Mode A generates a proposal with 4 L1 specs and 3 observed conventions
- **Expected:**
  - [ ] C9 Auto-Dispatch: 4 L1 spec stubs written without an inline approval prompt; the 3 observed conventions are recorded in the owning implementation-layer specifications (analysis never writes `RULES.md`)
  - [ ] Agent narrates the action log: `[Auto-Analyze] Dispatched N specs (L1: X, L2: Y). (Adjust: /magic.spec amend {name} | Revert: git restore .design/)`
  - [ ] Hard fork: if the agent finds structural ambiguity, the Consequence Forecast (C9 gate 3, DA-10) chooses — the hedge (dispatch what every structure shares, defer the divergent part behind a recorded premise) whenever deferral is possible — and the write proceeds with a `[DR]`; no (a)/(b)/(c) options
  - [ ] The premise sits in the dispatched spec's Constraints & Assumptions with its override; reverting everything is `git restore .design/`
- **Guards tested:** C9 Auto-Dispatch, hard fork resolved by forecast, no approval prompts

### T145 — Analyze Priority 1 Prints Workspace Confirmation

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 1)
- **Synthetic State:**
  - `workspace.json`: `engine` (default), `docs`. Both valid.
- **Action:** `/magic.analyze docs`
- **Expected:**
  - [ ] Workspace resolved to `docs` via Priority 1 (explicit arg)
  - [ ] Agent prints: "Active workspace: docs."
  - [ ] Default `engine` workspace is NOT used despite being set as default
  - [ ] Analysis scoped to `docs` workspace paths
- **Guards tested:** Priority 1 override, confirmation print

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

### T147 — Task Argument Routing: Scoped Planning (Mode B)

- **Workflow:** `task.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `engine/INDEX.md`: 3 Stable specs.
  - `docs/INDEX.md`: 2 Stable specs.
- **Action:** User runs `/magic.task docs`
- **Expected:**
  - [ ] Argument parsed: `docs` matches workspace name → **Scoped Planning** (Mode B)
  - [ ] Only `docs/INDEX.md` is read for planning (not engine)
  - [ ] PLAN.md and TASKS.md written to `.design/docs/`
  - [ ] Engine workspace specs are NOT included in the plan
  - [ ] Handoff recommends `/magic.run docs` (workspace propagated)
- **Guards tested:** Argument Routing (Mode B), Workspace Scope Isolation (C15), Handoff Propagation

### T148 — Task Argument Routing: Guided Planning with Workspace Fallback (Mode C)

- **Workflow:** `task.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `engine/INDEX.md`: 3 Stable specs (2 API-related, 1 unrelated).
  - No `MAGIC_WORKSPACE` env var set.
- **Action:** User runs `/magic.task "only API specs"`
- **Expected:**
  - [ ] Argument parsed: text does not match any workspace → **Guided Planning** (Mode C)
  - [ ] **Workspace Fallback**: No workspace in arg, no env var → `workspace.json` default = `engine` used
  - [ ] Workspace resolved silently via Core Invariant #1 (Zero-Prompt)
  - [ ] Planning directive "only API specs" applied as filter within `engine` workspace
  - [ ] User is NOT prompted to select a workspace
- **Guards tested:** Argument Routing (Mode C), Workspace Fallback, Zero-Prompt Resolution

### T149 — Task Argument Routing: Disambiguation (Quoted Workspace Name)

- **Workflow:** `task.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
- **Action:** User runs `/magic.task "engine"`
- **Expected:**
  - [ ] Argument parsed: quoted text → forced directive interpretation (NOT workspace selection)
  - [ ] Workspace resolved via default (`engine`) from `workspace.json`
  - [ ] Text "engine" treated as planning directive, not workspace selector
  - [ ] Agent interprets "engine" as focus/filter term for planning
- **Guards tested:** Disambiguation Rule (quotes override workspace match)

### T150 — Run Argument Routing: Targeted Task by ID (Mode C — T-XXXX)

- **Workflow:** `run.md` (Argument Routing)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}}}`
  - `engine/TASKS.md`: Phase 1 with T-1A01 (Todo), T-1A02 (Todo, dep: T-1A01), T-1B01 (Todo).
  - RULES.md §7 C3: Sequential mode.
- **Action:** User runs `/magic.run T-1A01` (unquoted, not a workspace name)
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
- **Action:** User runs `/magic.run docs "phase-2"`
- **Expected:**
  - [ ] Argument parsed: `docs` = workspace, `"phase-2"` = directed text → **Scoped + Directed** (Mode D)
  - [ ] Only `docs/TASKS.md` is read
  - [ ] Only Phase 2 tasks are targeted (Phase 1 skipped — already Done)
  - [ ] Manager Agent activated (Parallel mode) for Phase 2 tasks
  - [ ] Handoff (if re-planning needed) recommends `/magic.task docs`
- **Guards tested:** Argument Routing (Mode D), Phase targeting, Workspace scoping, Handoff Propagation

### T152 — Cross-Workflow Handoff Propagation with Scoped Argument

- **Workflow:** `task.md` → `run.md` (Handoff chain)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - User completed `/magic.task docs` (Mode B — scoped planning).
  - Planning is done, handoff to run triggered.
- **Expected:**
  - [ ] task.md Zero-Prompt Transition (C9) fires
  - [ ] Handoff message: `/magic.run docs` is invoked automatically
  - [ ] Workspace `docs` context preserved across workflow boundary
- **Guards tested:** Handoff Propagation (task→run), Workspace context preservation, Zero-Prompt automation

### T153 — Spec T4 Tier Routing: Workspace Signal Detected

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - Active workspace: `docs` (resolved via Zero-Prompt).
  - `.design/RULES.md`: §7 has C1–C10.
  - `.design/docs/RULES.md`: exists with WC1.
- **Action:** `"Add OAuth2 to auth spec. Remember that all docs packages must use semantic versioning."`
- **Expected:**
  - [ ] T4 trigger detected: "Remember that..."
  - [ ] **Tier Routing**: "docs packages" matches workspace signal → target = `.design/docs/RULES.md`
  - [ ] **Duplication Check**: scans both global C1–C10 and workspace WC1 for overlap → none found
  - [ ] Rule written to `.design/docs/RULES.md` as WC2 (NOT to global RULES.md)
  - [ ] Spec update and rule write grouped in single atomic proposal
- **Guards tested:** Rule-capture Tier Routing, workspace signal detection, atomic proposal

### T154 — Spec T4 Duplication Check Catches Overlap

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - Active workspace: `engine`.
  - `.design/RULES.md` §7 has C7: "Universal Script Executor — all automation via `executor.js`."
- **Action:** `"Update engine-core spec. Remember that all scripts must go through executor.js."`
- **Expected:**
  - [ ] T4 trigger detected: "Remember that..."
  - [ ] **Tier Routing**: rule is universal (no workspace signal) → target = `.design/RULES.md`
  - [ ] **Duplication Check**: proposed rule semantically overlaps with existing C7
  - [ ] Trust Mode (C9) → Overlap reported as non-blocking advisory; write proceeds via merge
  - [ ] Spec update proceeds atomically with rule synchronization
- **Guards tested:** Rule-capture Duplication Check, Zero-Prompt rule sync

### T155 — Spec T4 Constitutional Guard Blocks Contradicting Rule

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - `.design/RULES.md` §5: "No implementation code — pseudo-code only."
- **Action:** `"Add Python examples to database spec. Remember that all specs must include runnable code samples."`
- **Expected:**
  - [ ] T4 trigger detected: "Remember that..."
  - [ ] **Constitutional Guard**: proposed rule ("runnable code samples") contradicts §5 ("No implementation code")
  - [ ] **HALT** on rule write: "Proposed rule contradicts §5 (Content Rules). Cannot apply."
  - [ ] Spec update (adding Python examples) also flagged as §5 violation
  - [ ] Neither rule nor spec change written
- **Guards tested:** Rule-capture Constitutional Guard, §1–6 protection

### T156 — Spec T4 Atomic Intent with Drift Resolution

- **Workflow:** `spec.md` (T4 + Version Drift Guard)
- **Synthetic State:** `INDEX.md` (v1.0), File Header (v1.1). VERSION_DRIFT active.
- **Action:** "Update spec X. Remember that Y."
- **Expected:**
  - [ ] T4 detected; RE-3 detected.
  - [ ] **HALT** before any write.
  - [ ] Intent "Remember that Y" is queued.
  - [ ] Rule is NOT written to RULES.md until drift is resolved.
  - [ ] After drift fix: rule and spec update applied atomically.
- **Guards tested:** T4 Queuing, RE-3 Atomicity.

### T157 — Simulate Scope-Isolated Integrity Check (C15 Filter)

- **Workflow:** `simulate.md`, `init.md`
- **Synthetic State:**
  - Workspace `docs` active (`scope: docs/, package.json` — excludes `.magic`).
  - `.magic/run.md` modified locally (hash mismatch) — a file outside the active workspace's scope.
  - Every other `.magic/` file matches its checksum.
- **Action:** Run `/magic.dev.simulate`
- **Expected:**
  - [ ] check-prerequisites called with `--workspace=docs`.
  - [ ] Check returns `ok: false`, warning `ENGINE_INTEGRITY` for `.magic/run.md` (the manifest lists `.magic/` files only, so no other path can be flagged).
  - [ ] **C15 Filter** applied: agent recognizes mismatch is out-of-scope.
  - [ ] Agent logs drift but does NOT HALT.
  - [ ] Simulation proceeds to Mode Selection.
- **Guards tested:** C15 (Workspace Scope Isolation) in Pre-flight, out-of-scope drift bypass.

### T158 — Dispatch Conflict Branch Triggers HALT

- **Workflow:** `spec.md` (§Dispatching from Raw Input, Step 2)
- **Synthetic State:**
  - Active workspace `engine`. RULES.md contains "C7 — no direct .sh calls".
  - Raw input: "Add a build step that runs deploy.sh directly".
- **Action:** Agent parses input and evaluates Auto-Confirm (Trust Mode, C9).
- **Expected:**
  - [ ] Conflict detected: input contradicts RULES.md C7.
  - [ ] Agent does NOT proceed to Dispatch.
  - [ ] **HALT** with conflict report presented to user.
  - [ ] Agent waits for user resolution before dispatching.
- **Guards tested:** Trust Mode (C9) conflict branch, explicit HALT on objective conflict.

### T159 — Delta-Editing Enforcement for Large Specs

- **Workflow:** `spec.md` (§Updating an Existing Specification, Step 1)
- **Synthetic State:**
  - Target spec `engine-core.md` is 280 lines. Agent attempts a full rewrite.
- **Action:** Agent receives update request for a >200 line spec.
- **Expected:**
  - [ ] Agent identifies file is >200 lines (Invariant 9).
  - [ ] Agent uses search-replace (delta-editing), NOT full rewrite.
  - [ ] Full rewrite is rejected per "NOT permitted" clause.
- **Guards tested:** Delta-Editing (Invariant 9), large file protection.

### T160 — RESCUE AOP Uses Levenshtein Distance

- **Workflow:** `spec.md` (§Updating — RESCUE AOP)
- **Synthetic State:**
  - `INDEX.md` references `specifications/auth-service.md`.
  - Directory was renamed to `specifications/auth-svc.md` (external edit).
  - Existence Guard fires: file missing from disk.
- **Action:** Agent triggers RESCUE before halting.
- **Expected:**
  - [ ] Agent scans directory for similar paths.
  - [ ] Levenshtein comparison: `auth-service` vs `auth-svc` — distance 4, length 12, ratio 33% > 20% threshold.
  - [ ] No match suggested (exceeds threshold).
  - [ ] Existence Guard HALT proceeds normally.
  - **Test 2:** Rename to `auth-servce.md` (typo, distance 1, ratio 8% ≤ 20%).
  - [ ] Match found: agent suggests "Did you mean `auth-servce.md`? Registry sync recommended."
- **Guards tested:** RESCUE (AOP) with quantified Levenshtein threshold.

### T161 — Task Cross-Workspace C12 Quarantine

- **Workflow:** `task.md` (C12 Quarantine)
- **Synthetic State:**
  - Active workspace `docs`. `docs/INDEX.md` references `cli.md` (L2).
  - `cli.md` has `Implements: ../engine/core.md`.
  - `engine/INDEX.md` lists `core.md` (L1) as `Draft`.
- **Action:** Agent runs `magic.task` for `docs` workspace.
- **Expected:**
  - [ ] Agent reads `docs/INDEX.md` AND cross-references `engine/INDEX.md` for the parent.
  - [ ] Agent detects `core.md` is NOT `Stable` in `engine/INDEX.md`.
  - [ ] C12 Quarantine triggered: `cli.md` tasks moved to Backlog.
  - [ ] `cli.md` tasks marked `Blocked [!]` with C12 reason.
- **Guards tested:** Cross-Workspace C12 Quarantine, multi-INDEX lookup.

### T162 — Config Drift Detection (Git Available, Drift Present)

- **Workflow:** `init.md` (Pre-flight, Config Drift Advisory)
- **Synthetic State:**
  - `.design/RULES.md` exists and is tracked by git.
  - Git repo is initialized. `git diff HEAD -- .design/RULES.md` returns non-empty output (§7 C3 was manually deleted).
- **Action:** `check-prerequisites --json --workspace=engine`
- **Expected:**
  - [ ] `CONFIG_DRIFT` warning present in JSON output for `.design/RULES.md`.
  - [ ] Warning message includes file path and "modified outside workflow".
  - [ ] Warning is non-blocking: `ok` field is NOT affected by CONFIG_DRIFT alone.
  - [ ] Agent logs the non-blocking advisory "RULES.md was modified outside workflow." and auto-proceeds — no halt, no prompt, no option menu (`init.md` Step 1).
- **Guards tested:** Config Drift Guard, non-blocking advisory pattern.

### T163 — Config Drift Detection (No Git)

- **Workflow:** `init.md` (Pre-flight, Config Drift Advisory)
- **Synthetic State:**
  - `.design/RULES.md` exists.
  - No git repository (`.git/` missing or `git` not in PATH).
- **Action:** `check-prerequisites --json --workspace=engine`
- **Expected:**
  - [ ] No `CONFIG_DRIFT` warning in output.
  - [ ] No error or crash from git absence.
  - [ ] All other checks (ENGINE_INTEGRITY, specs) function normally.
- **Guards tested:** Config Drift Guard graceful degradation.

### T164 — Config Drift Detection (Workspace-Specific RULES.md, C22)

- **Workflow:** `init.md` (Pre-flight, Config Drift Advisory)
- **Synthetic State:**
  - `.design/RULES.md` (global) exists, no uncommitted changes.
  - `.design/engine/RULES.md` (workspace-specific) exists with uncommitted changes.
  - Git repo is initialized.
- **Action:** `check-prerequisites --json --workspace=engine`
- **Expected:**
  - [ ] `CONFIG_DRIFT` warning present for `.design/engine/RULES.md` only.
  - [ ] No warning for `.design/RULES.md` (unchanged).
  - [ ] C22 workspace rule inheritance respected in drift check scope.
- **Guards tested:** Config Drift Guard, C22 Workspace Rule Inheritance.

### T165 — Circular Guard Semantic Split: Soft References Non-Blocking

- **Workflow:** `task.md` (Step 2, Circular Guard)
- **Synthetic State:**
  - Two L1 specs: `world-system.md` and `entity-system.md`, each listing the other in `Related Specifications`.
  - No `Implements:` chains between them.
- **Expected:**
  - [ ] No HALT produced — mutual `Related Specifications` references are soft references.
  - [ ] Log contains: `[Cycle-Info] {N} mutual references detected in Related Specifications (non-blocking).`
  - [ ] Planning proceeds to Step 3 (Analyze).
- **Guards tested:** Circular Guard Semantic Split.

### T166 — Circular Guard Semantic Split: Hard Dependency Cycle HALT

- **Workflow:** `task.md` (Step 2, Circular Guard)
- **Synthetic State:**
  - L2 spec `a-go.md` with `Implements: b.md`.
  - L2 spec `b-go.md` with `Implements: a.md` (erroneous cycle).
- **Expected:**
  - [ ] HALT produced — hard-dependency cycle detected in `Implements:` chain.
  - [ ] Cycle Resolution suggestion identifies the "weakest link" edge.
- **Guards tested:** Circular Guard Semantic Split (Hard Dependencies).

### T167 — Pre-Planning Stabilization: L1 Before L2 Order

- **Workflow:** `task.md` (Step 2, Pre-Planning Stabilization)
- **Synthetic State:**
  - L1 `world-system.md` (Draft, has Overview + Core Invariants).
  - L2 `world-system-go.md` (Draft, `Implements: world-system.md`, has Overview + design content).
- **Expected:**
  - [ ] L1 `world-system.md` promoted to Stable first.
  - [ ] L2 `world-system-go.md` promoted to Stable after L1 parent is Stable.
  - [ ] Report: `[Pre-Plan] 2 specs promoted to Stable, 0 remain Draft.`
- **Guards tested:** Pre-Planning Stabilization, MVC, Layer Order.

### T168 — Pre-Planning Stabilization: MVC Failure Keeps Draft

- **Workflow:** `task.md` (Step 2, Pre-Planning Stabilization)
- **Synthetic State:**
  - L1 `empty-spec.md` (Draft, has only title — no Overview, no design sections).
- **Expected:**
  - [ ] Spec remains Draft.
  - [ ] Report: `[Batch-Skip] empty-spec.md: MVC failed — missing Overview.`
- **Guards tested:** MVC.

### T169 — Pre-Planning Stabilization: Non-Standard Layer MVC

- **Workflow:** `task.md` (Step 2, Pre-Planning Stabilization) + `spec.md` (MVC definition)
- **Synthetic State:**
  - `benchmark-spec.md` (Layer: test, Draft, has Overview + `## 1. Benchmark Categories` with content).
- **Expected:**
  - [ ] Spec promoted to Stable — non-standard layer MVC satisfied (Overview + one numbered section).
  - [ ] No error about missing `Core Invariants` or `Invariant Compliance`.
- **Guards tested:** MVC (non-standard layer handling).

### T170 — C6 Bootstrap Exception Activation

- **Workflow:** `task.md` (C6 Bootstrap Exception)
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

- **Workflow:** `task.md` (C6 Bootstrap Exception)
- **Synthetic State:**
  - 1 spec Stable (promoted by Pre-Planning Stabilization), 10 Draft.
  - Prior `PLAN.md` exists.
- **Expected:**
  - [ ] Bootstrap Mode NOT activated (≥1 spec is Stable).
  - [ ] Normal C6 flow: 1 Stable → active plan, 10 Draft → Backlog.
- **Guards tested:** C6, Bootstrap Exception deactivation.

### T172 — Field Normalization: L1 Reference to Implements

- **Workflow:** `task.md` (Step 2, Field Normalization)
- **Synthetic State:**
  - L2 `example-go.md` with header field `**L1 Reference:** example.md` instead of `**Implements:**`.
- **Expected:**
  - [ ] Field auto-renamed to `**Implements:** example.md`.
  - [ ] Log: `[Normalize] example-go.md: 'L1 Reference' → 'Implements'.`
- **Guards tested:** Field Normalization.

### T173 — Cross-Workspace Batch Stabilization Order

- **Workflow:** `task.md` (Step 2, workspace order)
- **Synthetic State:**
  - `workspace.json` with default=`main`, second workspace=`editor`.
  - Editor L1 spec references main L1 spec via `Related Specifications` (soft — non-blocking).
  - Both specs are Draft, both pass MVC.
- **Expected:**
  - [ ] `main` workspace processed first (default).
  - [ ] `editor` workspace processed second.
  - [ ] Both promoted — soft cross-workspace references don't block.
- **Guards tested:** Workspace processing order, cross-workspace soft references.

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
- **Guards tested:** Bootstrap Detection in run.md, Spec Stability Bootstrap Exception. Pre-flight only — the guards that follow it (Quarantine C12, Spec Stability, the Mid-Run check, the orchestrator's re-read) are T250, and the Sync step of `/magic.task update` is T251.

### T175 — Retrospective Context Resolution Full Priority Chain

- **Workflow:** `retrospective.md` (Core Invariant #1)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - `MAGIC_WORKSPACE=docs` env var set
  - Phase 1 just completed in `docs` workspace
- **Action:** Retrospective Level 1 triggered (no explicit workspace arg)
- **Expected:**
  - [ ] Agent reads `MAGIC_WORKSPACE=docs` (Priority 2 in chain)
  - [ ] Agent uses `.design/docs/` for RETROSPECTIVE.md operations
  - [ ] Agent does NOT fall back to `workspace.json` default (`engine`) when env var is set
  - [ ] Snapshot appended to `.design/docs/RETROSPECTIVE.md`
  - [ ] Same behavior as all other workflows under identical inputs (T134 parity)
- **Guards tested:** Context Resolution full priority chain in retrospective.md, env var override of default workspace

### T176 — Cross-Workspace Manual Renamed Parent (Ref: The Phantom Cascade)

- **Workflow:** `spec.md` (Update Mode)
- **Synthetic State:**
  - `workspace.json` registers `engine` and `docs`.
  - `engine` has `l1-identity.md` (Stable) — file physically renamed to `l1-auth-core.md` (Drift).
  - `docs` has `l2-auth.md` (RFC, Implements: l1-identity.md).
- **Action:** `/magic.spec update docs/l2-auth.md`
- **Expected:**
  - [ ] Parent Existence Guard triggers during pre-flight.
  - [ ] **HALT** — report "L2 Orphan: Parent spec engine/l1-identity.md is missing from disk."
  - [ ] Suggested resolution: sync engine/INDEX.md or restore parent.

### T177 — Task Cross-Workspace Parent Header Parity

- **Workflow:** `task.md` (Step 1 — Pre-flight, Cross-Workspace parity)
- **Synthetic State:**
  - Workspace `docs` active. `docs/INDEX.md` has `cli.md` (L2, Implements: engine/l1-core.md).
  - `engine/INDEX.md` says `l1-core.md` is `Stable` (v1.0.0).
  - File `engine/specifications/l1-core.md` has header `Status: Draft` or `Version: v1.1.0` (Local Drift).
- **Action:** `/magic.task docs`
- **Expected:**
  - [ ] Agent builds dependency graph, identifies `engine/l1-core.md` as parent.
  - [ ] Agent reads `engine/INDEX.md` AND `engine/specifications/l1-core.md` header.
  - [ ] Agent detects `STATUS_DRIFT` or `VERSION_DRIFT` in the parent spec.
  - [ ] **HALT** with report: "Header parity failure on parent spec `engine/l1-core.md`... Run `/magic.spec` to reconcile, then re-run `/magic.task`."
- **Guards tested:** Cross-Workspace Header Parity, multi-workspace pre-flight integrity.

### T178 — Task Soft-Reference Cycle Does Not Block Planning (RE-4 Regression)

- **Workflow:** `task.md` (Generating Tasks & Plan)
- **Synthetic State:**
  - `auth.md` (Stable L1, Related Specifications: api.md)
  - `api.md` (Stable L1, Related Specifications: auth.md)
  - Mutual soft reference cycle: auth ↔ api (via `Related Specifications` only, no `Implements:` chain)
- **Action:** Call `/magic.task` to generate a plan.
- **Expected:**
  - [ ] Dependency graph construction detects mutual references in `Related Specifications`
  - [ ] **No HALT** — soft reference cycles are non-blocking per Semantic Split
  - [ ] Log contains: `[Cycle-Info] 1 mutual references detected in Related Specifications (non-blocking).`
  - [ ] Planning proceeds normally: both specs placed into active phases
  - [ ] PLAN.md written successfully
- **Guards tested:** Circular Guard Semantic Split — soft references non-blocking (regression for T07/T62 fix)

### T179 — Simulate Suite Corruption Fallback (RE-5 Regression)

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - `dev/tests/suite.md` exists but contains only metadata header (no test scenarios).
  - File size > 0 bytes, readable.
- **Action:** User runs `/magic.dev.simulate test`
- **Expected:**
  - [ ] Agent opens and reads `suite.md` — file access succeeds (no "missing" error)
  - [ ] Suite Integrity detects 0 valid `### T{N} —` headers
  - [ ] Agent does NOT attempt to execute 0 tests and report "all passed"
  - [ ] Agent falls back to Improv Mode with notification
  - [ ] Improv Mode produces a Crisis scenario and walkthrough
- **Guards tested:** Suite Integrity zero-test detection, distinct from missing-file fallback (T32)

### T180 — Analyze Mode A GHOST_REGISTRY Triggers C15 Filter (RE-1 Regression)

- **Workflow:** `analyze.md` (Mode A — Step 0 Pre-flight)
- **Synthetic State:**
  - `.design/INDEX.md` empty (0 specs) → Mode A eligible
  - `INDEX.md` in another workspace references `phantom.md` which is missing from disk
  - `check-prerequisites --json` returns `ok: false` with `GHOST_REGISTRY` warning for `phantom.md`
  - Active workspace: `engine` (in-scope)
- **Action:** `/magic.analyze`
- **Expected:**
  - [ ] Pre-flight Step 0 runs `check-prerequisites --json`
  - [ ] `GHOST_REGISTRY` warning detected in output
  - [ ] **C15 Filter** applied: agent checks if `phantom.md` is in active workspace scope
  - [ ] If in-scope → **HALT**: "Registry/engine integrity failure. Run `/magic.spec audit` or `update-engine-meta` to resolve."
  - [ ] Agent does NOT proceed to "Build full project map" (Step 1)
  - [ ] Agent does NOT attempt to read `phantom.md` from disk
- **Guards tested:** GHOST_REGISTRY in analyze.md Mode A (RE-1 fix), C15 Filter application, anti-hallucination

### T181 — Analyze Mode A Unrecognized Pre-flight Failure (RE-1 Regression)

- **Workflow:** `analyze.md` (Mode A — Step 0 Pre-flight)
- **Synthetic State:**
  - `check-prerequisites --json` returns `ok: false` with unknown field `{"ok": false, "unknown_error": "permission_denied"}`
  - No `ENGINE_INTEGRITY`, no `GHOST_REGISTRY`, no missing `.design/`
- **Action:** `/magic.analyze`
- **Expected:**
  - [ ] Pre-flight Step 0 detects `ok: false` with no matching category
  - [ ] **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually."
  - [ ] Agent does NOT silently proceed to scanning
  - [ ] Agent does NOT fall through to Depth Control
- **Guards tested:** Unrecognized failure HALT in analyze.md (RE-1 fix), fail-safe branch

### T182 — Task CONTEXT.md Regeneration Step Executed (RE-2 Regression)

- **Workflow:** `task.md` (Context Regeneration step)
- **Synthetic State:**
  - 2 Stable specs in `engine` workspace
  - No existing PLAN.md or TASKS.md
- **Action:** `/magic.task engine`
- **Expected:**
  - [ ] Plan Write-back: PLAN.md, TASKS.md, and phase file written
  - [ ] **Context Regeneration**: `node .magic/scripts/executor.js generate-context --workspace=engine` executed
  - [ ] CONTEXT.md file created or updated in `.design/engine/`
  - [ ] Completion Checklist item "CONTEXT.md regenerated" verifiable
- **Guards tested:** Context Regeneration as explicit workflow step (RE-2 fix), diagram-text parity

### T183 — C6 No Tier-Based Behavior Divergence (RE-3 Regression)

- **Workflow:** `task.md` (C6 — Autonomous Selective Planning)
- **Synthetic State:**
  - `RULES.md` v1.4.0+ (C6 without "Strong/Weak Tier" qualifier)
  - 3 Stable specs, 2 Draft specs (each fails MVC, so Pre-Planning Stabilization leaves it Draft)
- **Action:** `/magic.task`
- **Expected:**
  - [ ] C6 applied: 3 Stable → active plan, 2 Draft → Backlog
  - [ ] Agent does NOT reference "Strong Tier" or "Weak Tier" in its reasoning
  - [ ] Agent does NOT modify guard behavior based on self-assessed model capability
  - [ ] All structural validation guards (check-prerequisites, File-Header Parity) run identically
- **Guards tested:** C6 deterministic behavior (RE-3 fix), no tier-based divergence

### T184 — Workspace Disambiguation Uses Quantified Threshold (RE-6 Regression)

- **Workflow:** Any (task.md used as example)
- **Synthetic State:**
  - `workspace.json`: two workspaces, NO default field
    - `api` with scope: `["packages/api/", "packages/shared/"]`
    - `web` with scope: `["packages/web/", "packages/shared/"]`
  - Current directory contains 10 files: 6 in `packages/api/`, 2 in `packages/web/`, 2 in `packages/shared/`
- **Action:** `/magic.task` (no workspace argument, no env var)
- **Expected:**
  - [ ] Quick-scan runs: checks file overlap with each workspace's `scope` array
  - [ ] `api` scope covers 8/10 files (80%) — meets ≥50% threshold
  - [ ] `web` scope covers 4/10 files (40%) — below threshold
  - [ ] Agent selects `api` workspace and NOTIFIES user: "Found api scope match — selecting api. Proceeding..."
  - [ ] Agent does NOT halt to ask (quantified threshold met)
- **Test B — No workspace meets threshold:**
  - **Synthetic State:** Current directory has 10 files, 3 in `packages/api/` scope, 3 in `packages/web/` scope, 4 outside both
  - **Expected:**
    - [ ] `api` covers 30%, `web` covers 30% — both below ≥50%
    - [ ] The Consequence Forecast decides (`context.md` Workspace Disambiguation, step 4): every wrong pick costs the same later move and coverage ties, so the first in `workspace.json` order wins — `[DR] Selecting api — coverage tie, first in workspace.json order (DA-10). (Override: /magic.task web)`; nothing is asked
- **Guards tested:** Quantified disambiguation threshold (RE-6 fix); deterministic selection above the threshold, deterministic forecast below it

### T185 — Spec Explore Mode Write Isolation Enforcement

- **Workflow:** `spec.md`
- **Synthetic State:**
  - `.design/` initialized, 3 specs registered in INDEX.md
  - PLAN.md and TASKS.md exist with active tasks
- **Test 1 — During explore:**
  - **Action:** User says: "Let's think about adding WebSocket support"
  - **Expected:**
    - [ ] Agent provides analysis in chat or agent artifacts
    - [ ] Agent does NOT create any file in `.design/specifications/`
    - [ ] Agent does NOT modify `INDEX.md`, `PLAN.md`, or `TASKS.md`
    - [ ] No status lifecycle applied
- **Test 2 — Transition trigger:**
  - **Action:** User says: "OK, create the spec"
  - **Expected:**
    - [ ] Agent transitions to Dispatch mode
    - [ ] `websocket-support.md` created from template
    - [ ] INDEX.md updated
- **Guards tested:** Explore Mode write isolation (instructional-only guard)

### T186 — Simulate Pre-flight Hard Gate Enforcement

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - `.design/` initialized, engine checksums valid
  - Agent begins simulation without running `check-prerequisites`
- **Action:** Agent attempts to skip Pre-flight and jump to Mode Selection
- **Expected:**
  - [ ] Simulation is flagged as INVALID by any reviewer
  - [ ] No findings from the skipped simulation are accepted
  - [ ] Agent MUST re-run with Pre-flight output recorded verbatim in report
- **Guards tested:** Pre-flight Hard Gate (HALT), simulate.md §0

### T187 — Simulate Evidence-Linked Claims Validation

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - Agent produces a simulation report with 3 findings:
    - Finding A: includes `file`, `line`, `evidence` (verbatim quote), `verification` (grep command)
    - Finding B: includes `file` and `line` but no `evidence` (paraphrased instead of quoted)
    - Finding C: no `file` or `line` reference at all
- **Action:** Reviewer evaluates the report against Anti-Fabrication Rule (Invariant 6)
- **Expected:**
  - [ ] Finding A: VALID — all required fields present
  - [ ] Finding B: INVALID — missing verbatim evidence
  - [ ] Finding C: INVALID — missing file and line references
  - [ ] Report is returned for correction with specific rejection reasons
- **Guards tested:** Anti-Fabrication Rule (Invariant 6), Evidence-Linked Claims

### T188 — Simulate Null-Result Acceptance

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - All workflow files have 0 vague terms (grep confirms)
  - No divergent duplicates (all C14/Zero-Prompt text identical across files)
  - All guards have explicit HALT conditions
  - Suite Integrity passes
- **Action:** Agent runs Improv Mode simulation
- **Expected:**
  - [ ] Agent reports `0 rough edges found` as the result
  - [ ] Agent does NOT fabricate findings to fill the report structure
  - [ ] Cognitive Coverage scores: Density 10/10, Guard Resilience max, Compliance max
  - [ ] Report explicitly states: "No rough edges found — engine is clean"
- **Guards tested:** Anti-Fabrication Rule (Invariant 6), Null-Result Acceptance

### T189 — Simulate Read-Before-Claim Gate

- **Workflow:** `simulate.md`
- **Synthetic State:**
  - Agent runs Improv Mode simulation
  - Agent reads 5 of 8 workflow files in Grounding Phase (skips `rule.md`, `retrospective.md`, `simulate.md`)
  - Agent then claims a rough edge in `rule.md` Line 42
- **Action:** Reviewer cross-references the claim against the Grounding Phase file checklist
- **Expected:**
  - [ ] Grounding Phase checklist shows `rule.md` was NOT read
  - [ ] Claim about `rule.md` is automatically INVALID per Read-Before-Claim Gate
  - [ ] Agent must re-read `rule.md` and re-evaluate the claim before it can be accepted
  - [ ] Only claims about files listed in the Grounding Phase checklist are valid
- **Guards tested:** Read-Before-Claim Gate (simulate.md §0 Step 3)

### T190 — Skill Projection Parity

- **Workflow:** `sync-skills.js`
- **Synthetic State:**
  - `workflows/magic.test.md` exists with frontmatter and body.
  - Body contains instructions.
  - `skills/magic-test/SKILL.md` exists (generated).
- **Expected:**
  - [ ] `SKILL.md` frontmatter `name` = `magic-test` (filename-based default, hyphenated).
  - [ ] `SKILL.md` body contains the verbatim body of `magic.test.md`.
  - [ ] `SKILL.md` includes the read-only warning comment with correct source path.
  - [ ] If `magic.test.md` is deleted, `skills/magic-test/` directory is removed (Orphan Cleanup).
- **Guards tested:** Parity (exact match), Orphan cleanup, Metadata extraction.

### T191 — Mechanical File-Header Parity (--verify-headers)

- **Workflow:** `check-prerequisites.js` + `task.md` / `run.md`
- **Synthetic State:**
  - `INDEX.md`: `auth.md` — Status: Stable, Version: 1.0.0
  - `auth.md` file header: `**Version:** 1.1.0`, `**Status:** Stable`
  - Engine checksums valid (no ENGINE_INTEGRITY warning)
- **Action:** Run `node .magic/scripts/executor.js check-prerequisites --json --verify-headers`
- **Expected:**
  - [ ] Script reads each spec file header and compares `Version:` / `Status:` against INDEX.md
  - [ ] `VERSION_DRIFT` warning emitted: `'auth.md' file header Version (1.1.0) ≠ INDEX.md (1.0.0)`
  - [ ] `ok: false` due to `VERSION_DRIFT` in `integrity_ok` check
  - [ ] Workflow (task.md / run.md) HALTs mechanically — no LLM compliance required
  - [ ] Without `--verify-headers` flag, no header check is performed (backward compatibility)
- **Guards tested:** Mechanical File-Header Parity (Mechanical Guard, RE-2 simulation fix), VERSION_DRIFT/STATUS_DRIFT blocking

### T192 — Vague Term Elimination in rules.md Template

- **Workflow:** `simulate.md` (Logic Audit — Ambiguity C13)
- **Synthetic State:**
  - `templates/rules.md` contains quantified terms replacing former vague qualifiers
- **Action:** Scan `templates/rules.md` for vague terms from the closed list
- **Expected:**
  - [ ] "significant revision" replaced with "revision affecting ≥1 core section" (line 21)
  - [ ] "appropriate implementation" replaced with "platform-matching implementation" (line 89)
  - [ ] "significant time" replaced with ">5 minutes" quantified threshold (line 194)
  - [ ] Zero vague terms from the closed list remain in `templates/rules.md`
- **Guards tested:** C13 Ambiguity elimination, Instruction Density improvement

### T193 — Auto-Init Trigger Condition Parity (Regression)

- **Workflow:** All workflows with Auto-Init invariant
- **Synthetic State:**
  - 6 workflow files: `spec.md`, `analyze.md`, `run.md`, `task.md`, `retrospective.md`, `rule.md`
  - All contain Auto-Init as a Core Invariant
- **Action:** Scan all 6 files for Auto-Init trigger wording
- **Expected:**
  - [ ] All 6 files use identical trigger: `"If .design/ or system files missing"`
  - [ ] No file uses the shorter `"If .design/ missing"` formulation (pre-fix divergence)
  - [ ] `rule.md` additionally includes workspace RULES.md auto-create clause (acceptable extension, not divergence)
- **Guards tested:** Auto-Init trigger parity across all workflows (simulate fix v1.5.146)

### T194 — Suite Test T06 Expects Mode Assumed Not Saved (Regression)

- **Workflow:** `task.md` (Generating Tasks & Plan)
- **Synthetic State:**
  - Same as T06: 3 Stable specs, no PLAN.md, RULES.md without execution mode
- **Action:** `/magic.task`
- **Expected:**
  - [ ] Execution mode defaults to Parallel (C3) — assumed silently per `task.md` §6
  - [ ] Agent does NOT write mode to RULES.md §7 (no "mode persistence" behavior)
  - [ ] Planning proceeds without prompting about mode
- **Guards tested:** Mode assumption semantics (simulate fix v1.5.146), task.md §6 compliance

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

### T196 — Pre-Advisory Audit Execution (C24)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Workspace contains minor unused dependencies and an outdated architectural pattern.
- **Action:** `/magic.analyze` (Mode C)
- **Expected:**
  - [ ] Agent pauses to perform Pre-Advisory Audit (Auditor Persona) before outputting the Advisory Report.
  - [ ] Agent limits severity inflation; trivial issues are mapped to Low severity or discarded.
  - [ ] Agent cross-correlates findings to prevent duplicate issue generation.
- **Guards tested:** C24 Independent Analyst Objectivity, Advisory Filter.

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

### T200 — Task T4 Queued on Cross-Workspace Pre-flight HALT

- **Workflow:** `task.md` (Step 1 — Pre-flight, Cross-Workspace Parent Header Parity + T4 Queue)
- **Synthetic State:**
  - Active workspace: `docs`. `docs/INDEX.md` has `cli.md` (L2, `Implements: engine/l1-core.md`).
  - `engine/INDEX.md` says `l1-core.md` is `Stable v1.0.0`.
  - `engine/specifications/l1-core.md` file header: `Status: Draft`, `Version: 1.1.0` (manual external edit — STATUS_DRIFT + VERSION_DRIFT).
  - `RULES.md` v1.4.0, no plugin lifecycle rule.
- **Action:** `/magic.task docs "add plugin hooks. Remember that all docs plugins must register lifecycle via manifest."`
- **Expected:**
  - [ ] Pre-flight Cross-Workspace Parent Header Parity detects STATUS_DRIFT + VERSION_DRIFT on `engine/l1-core.md`
  - [ ] **HALT** before plan generation
  - [ ] T4 trigger detected in directive arg ("Remember that...")
  - [ ] Agent acknowledges T4: "T4 rule detected — queued pending cross-workspace parent drift resolution. Will be handed to the Operational Logic of `rule.md` after resolution."
  - [ ] No write to `RULES.md`, no plan generation
  - [ ] After user resolves drift via `/magic.spec`: rule applied, plan generation re-attempted on subsequent `/magic.task` invocation
- **Guards tested:** T4 Queue (Cross-Workflow), Cross-Workspace Parent Header Parity, atomic HALT preserves embedded T4

### T201 — Run Backlog-Only State Guard

- **Workflow:** `run.md` (Step 2 — Select)
- **Synthetic State:**
  - `.design/engine/TASKS.md` has `## Backlog` section with 5 spec entries.
  - No active phase checklist (task.md generated 0 active phase tasks; all specs are RFC).
  - TASKS.md active phase section: empty (no Todo, InProgress, Done, Blocked entries).
  - STATE.md: `**Status:** Active`, `**Phase:** 1 — Pending`.
- **Action:** `/magic.run` invoked; Pre-flight passes (`ok: true`); Select step finds 0 Todo tasks.
- **Expected:**
  - [ ] Select: 0 Todo AND 0 InProgress AND 0 Done AND 0 Blocked detected.
  - [ ] *Backlog-Only* guard fires before *Complete* check.
  - [ ] **HALT** emitted: "Active phase has no started tasks — all work is in `## Backlog`. Run `/magic.task` to activate a phase, then re-run `/magic.run`."
  - [ ] Phase Completion (Retro L1 + Changelog + Archive) is **NOT** triggered.
  - [ ] Agent does NOT archive any phases or write a Changelog entry.
- **Guards tested:** Backlog-Only guard (run.md Step 2 Select, added Fix 1)
- **Regression for:** "The Split Amendment" crisis (Improv Mode 2026-05-14); prevents false Phase Completion on empty active phase.

### T202 — Spec RE-3 Re-evaluation Scoped to Amendment Target

- **Workflow:** `spec.md` (Updating — Resolution Validation, RE-3)
- **Synthetic State:**
  - `l1-engine-core.md` (Stable, v1.5.0 in INDEX.md and file header) — amendment target.
  - `l2-role-cards.md` (Implements: l1-engine-core.md): file header `v1.4.0`, INDEX.md `v1.3.0` → VERSION_DRIFT.
  - No other workspaces.
- **Action:** `/magic.spec amend l1-engine-core.md` → Version Drift Guard fires on `l2-role-cards.md` (in dependency chain) → HALT. User resolves by updating INDEX.md to `v1.4.0`. User selects "Yes, continue." → RE-3 re-evaluation triggered.
- **Expected:**
  - [ ] RE-3 re-evaluation scoped to amendment target (`l1-engine-core.md`): checks RE-3, Cross-Workspace Parity, Existence Guard, and C12 Quarantine for `l1-engine-core.md`'s own chain.
  - [ ] C12 Quarantine check targets `l1-engine-core.md`'s L1 parent (if any) — NOT `l2-role-cards.md` (the drift-resolved file).
  - [ ] `l2-role-cards.md` is NOT incorrectly quarantined during RE-3 re-evaluation.
  - [ ] Amendment to `l1-engine-core.md` proceeds after RE-3 passes.
  - [ ] C12 Cascade fires correctly AFTER the amendment (l1-engine-core.md → RFC → quarantine all Implements children including l2-role-cards.md).
- **Guards tested:** RE-3 scope isolation (spec.md Resolution Validation, clarified by Fix 2); C12 ordering vs. RE-3 re-evaluation.
- **Regression for:** "The Split Amendment" crisis — incorrect C12 on drift-resolved file during RE-3.

### T203 — Source-of-Truth Contract: §5 Replan, WI-10 Bootstrap, C25 Posture (Regression Trinity)

- **Workflow:** `run.md` + `init.md` + `run.md` Run Completion Checklist (cross-workflow)
- **Synthetic State:**
  - Active engine version ≥ 2.1.25.
  - Six known suite drifts previously corrected (T34, T58, T195 — v2.1.25; T36, T190, simulate-rename — v2.1.55) must not re-regress.
- **Action:** Static scan of `dev/tests/suite.md` against workflow source of truth.
- **Expected:**
  - [ ] T34 expectation cites `rules/MAGIC.md §5` Post-Task Replan collapse to `/magic.task` — does NOT claim direct `run.md → /magic.spec` handoff.
  - [ ] T58 expectation reads `default: main` — does NOT contain the literal string `default: root` (WI-10 contract).
  - [ ] T195 expectation requires verbatim changelog display + independent post-hoc review — does NOT contain the phrase `Yes/No` as an inline approval gate.
  - [ ] T36 expectation describes the WI-10 bootstrap fallback (auto-init provisions `.design/{default}/`; root `.design/` read transiently) — does NOT claim root `.design/` is used "for all operations".
  - [ ] T190 expectation uses the hyphenated skill projection convention (`skills/magic-test/`, `name: magic-test`) — does NOT contain a dotted `skills/magic.test/` path.
  - [ ] Simulate scenarios invoke `/magic.dev.simulate` and reference `.agents/workflows/magic.dev.simulate.md` — no scenario uses the legacy pre-rename command form.
  - [ ] All corrected expectations cite their workflow source-of-truth lines (e.g., `run.md` line 104, `init.md` WI-10, `run.md` C25 checklist).
- **Guards tested:** Suite-to-workflow contract integrity (post-correction); guards that the simulation harness itself does not silently re-introduce outdated assertions.

### T204 — Spec Dispatch Diagram Reflects C9 Non-Blocking (Diagram-Text Parity)

- **Workflow:** `spec.md` (Dispatching from Raw Input — workflow diagram)
- **Synthetic State:**
  - `.design/engine/` initialized; raw input maps to 1 domain with no objective conflicts (no RULES.md contradiction, no circular dependency, no VERSION_DRIFT).
  - Trust Mode (C9) active.
- **Action:** User provides unstructured spec input; agent enters Dispatching from Raw Input.
- **Expected:**
  - [ ] Dispatch proceeds to write files immediately (Dispatch Notice Non-Blocking) — no approval prompt.
  - [ ] The workflow diagram decision node is an **objective-conflict** gate (`RULES / cycle / drift`), NOT a human `Approved? Yes/No` loop.
  - [ ] No `AskUserQuestion` / option menu is surfaced on the conflict-free happy path (DA-9 declarative proposal surface).
  - [ ] Conflict branch (`Yes: RULES / cycle / drift`) routes to Flag & HALT — matching the Conflict constraint in prose.
- **Guards tested:** Diagram-Text parity for C9/DA-9 zero-prompt dispatch; C24 confirmation-bias prevention (diagram cannot reintroduce an approval gate the prose forbids).
- **Regression for:** "The Silent Approval" crisis (Improv Mode 2026-06-13); stale `{Approved?}` diagram node predating DA-9 hardening.

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
  - [ ] Checklist Conclusion line says the **project** version is bumped (project release file only — never `.magic/.version`).
  - [ ] Checklist does NOT contain the phrase `engine version bumped`.
  - [ ] Plan Completion Step 3 retains the prohibition: `Do NOT modify .magic/.version`.
  - [ ] An agent literally executing the checklist bumps `package.json`, never `.magic/.version` (consistent with T42).
- **Guards tested:** Version Bleed Prevention (checklist-body parity); regression for "The Tampered Twin" crisis (Improv Mode 2026-07-10).

### T207 — Run Select Branch Precedence (Stalled Before Complete)

- **Workflow:** `run.md` (Step 2 — Select)
- **Synthetic State:**
  - TASKS.md Phase 2: 3 tasks `Done`, 1 task `Blocked [!]` (reason recorded), 0 `Todo`, 0 `In Progress`.
  - STATE.md: `**Status:** Active`.
- **Action:** `/magic.run` invoked; Pre-flight passes.
- **Expected:**
  - [ ] Select evaluates branches strictly in listed order: *Stalled* → *Backlog-Only* → *Complete*.
  - [ ] *Stalled* fires first (0 `Todo`, `Blocked` exist) → **HALT** listing the blocked task with its recorded reason.
  - [ ] *Complete* branch is NOT reached — Phase Completion (Retro L1 + Changelog L1 + Archive) is NOT triggered despite `0 Todo AND 0 In Progress`.
  - [ ] Exactly ONE next step recommended: `/magic.task {workspace}`.
- **Guards tested:** Select branch precedence (explicit evaluation order); regression for "The Tampered Twin" crisis (Improv Mode 2026-07-10); complements T11 (all-Blocked stall) and T201 (Backlog-Only before Complete).

### T208 — Rule Batch Mixed-Type Version Precedence and Guard Failure

- **Workflow:** `rule.md` (§Operational Logic — Apply, Batch)
- **Synthetic State (Test A — version precedence):**
  - `RULES.md` §7 has C3 ("Parallel Task Execution Mode", referenced by `run.md` as Mode Guard) and C5 ("All dates use ISO 8601 format").
  - No Core-Amendment or Constitutional conflicts present.
- **Action A:** `"Remove rule C3, and add a new rule: all API responses must include a request-id header."`
- **Expected A:**
  - [ ] Dependency Scan on C3 removal surfaces the `run.md` Mode Guard reference in the Remove confirmation (per T13).
  - [ ] Batch groups both changes into a single atomic update (per existing Batch clause).
  - [ ] **Batch Version Precedence** fires: Remove = Major, Add = Minor → single bump applied is **Major** (highest precedence), not two sequential bumps and not Minor.
  - [ ] Document History records exactly one version row for the combined change.
- **Synthetic State (Test B — guard failure):**
  - `RULES.md` §7 has C4 ("No inline SQL — use query builder").
  - `RULES.md` §5 (core, Content Rules): "No implementation code — pseudo-code only."
- **Action B:** `"Remove rule C4, and add a new rule: all specs must include runnable Python code samples."`
- **Expected B:**
  - [ ] C4 removal passes Guards cleanly (no core conflict, dependency scan clean).
  - [ ] The new rule ("runnable code samples") fails the **Constitutional Guard** — contradicts core §5.
  - [ ] **Batch Guard Failure** fires: the entire atomic batch **HALTs** — C4 is NOT removed despite passing its own guards individually.
  - [ ] Report names both the blocking item (contradicts §5) and that the clean item (C4 removal) is held pending resolution, not silently applied.
  - [ ] After the user drops or revises the offending item, the full batch (including C4 removal) is re-run as one atomic update — not auto-split.
- **Guards tested:** Batch Version Precedence, Batch Guard Failure (no partial atomic application); regression for "The Recursive Quarantine" crisis (Improv Mode 2026-08-07).

### T209 — Idea Intake Gate Stays Silent on a Coherent Idea (IK-1/IK-4)

- **Workflow:** `spec.md` (Step 0.5 Idea Intake Gate)
- **Synthetic State:**
  - `.design/engine/` initialized; source tree already contains a settings page and a theme token system.
  - Trust Mode (C9) active; `MAGIC_DECISION_AUTONOMY` unset.
- **Action:** User runs `/magic.spec add a dark theme to the settings page`.
- **Expected:**
  - [ ] IK-2 investigation runs (specs, `INDEX.md`, source tree read) before any gate evaluation.
  - [ ] F1 does not hold (idea is coherent); F2 does not hold — every reading yields the same one-sentence Overview.
  - [ ] **Zero questions asked.** Dispatch proceeds in the same turn.
  - [ ] No narration announcing that the gate ran or passed (IK-1 silence).
  - [ ] Residual detail-level uncertainty (token naming, preference storage) is recorded as `<!-- TBD: … -->`, never asked.
- **Guards tested:** IK-1 silent-by-default evaluation; IK-4 closed firing conditions; the materiality test discriminating detail-level from essence-level ambiguity.
- **Regression for:** intake gate degenerating into a mandatory user-visible stage on every invocation.

### T210 — The Comprehension Gate Opens One Survey Round: Forecast Options, the Hedge Recommended, an "Other" (IK-3/IK-4/IK-5)

- **Workflow:** `spec.md` (Step 0.5 Idea Intake Gate)
- **Synthetic State:**
  - `.design/engine/` initialized; **no** notification subsystem and no saving behaviour exist in specs, `RULES.md`, or source.
- **Action A (essence ambiguity, F2):** User runs `/magic.spec users should be notified about important changes`.
- **Expected A:**
  - [ ] IK-2 investigation runs first and finds no precedent — the ambiguity is not resolvable from the repository.
  - [ ] Gate 1 fires on F2: "in-app badge" and "email digest" produce different one-sentence Overviews.
  - [ ] At intake, asking costs one turn — the cheapest worst case in the forecast (the hedge's is a multi-file revert) — so one survey round opens instead of a premise (DA-10).
  - [ ] ≤3 questions; each question's options are the forecast's candidates — inside the app only, by email as well, and the hedge (inside the app now, email later) — with the hedge marked recommended, each option's consequence stated, and a free-text **Other: …** last (IK-5).
  - [ ] Question text is outcome-framed ("see these inside the app" / "get a message when the app is closed") and free of jargon.
  - [ ] **No technical question is asked** — storage format, queue technology, template engine, and schema never reach the user (IK-3).
  - [ ] Question asks what the user wants **built**, never what the agent **should do** — `"Should I build the email version?"` is a C25 violation even at a fired gate.
  - [ ] No Draft is written while the round is open: Anti-Stall is suspended during a convergent dialogue (IK-9).
- **Action B (contradiction, F1):** `/magic.spec save everything instantly, and always ask before saving`.
- **Expected B:**
  - [ ] Gate 1 fires on F1 — the two requirements cannot both hold, and the repository has no precedent for which one wins.
  - [ ] One question asks which behaviour matters more. Its options are the forecast's: the hedge — keep every change at once as a draft and ask before it replaces the saved version — marked recommended (no work is lost either way); *save instantly, never ask* (an accidental edit can overwrite good data); *ask first, save nothing until confirmed* (unconfirmed work is lost if the browser closes); then **Other: …**.
- **Guards tested:** IK-3 intent-only question domain; IK-4 F1 and the F2 materiality test; IK-5 forecast-written options, the winner marked, "Other"; DA-10 intake cost; C25 form prohibition surviving inside an objective gate.
- **Regression for:** the C27 §1.1 failure mode — surveys a non-specialist cannot answer — and a forecast-only intake that wrote down a guess about what the requester meant instead of asking them (owner correction, 2026-10-01).

### T211 — Replies Converge or End the Gate: an Option Closes, "Other" Is Re-checked, "You Decide" Hands the Rest to the Forecast (IK-6/IK-7/IK-9)

- **Workflow:** `spec.md` (Step 0.5 Idea Intake Gate + Core Invariant 12 Anti-Stall)
- **Synthetic State:**
  - A gate fired with three open intent questions, each offered with forecast options, the winner marked, and **Other: …**.
- **Action (Test A — delegation):** User replies `"you decide"`.
- **Expected A:**
  - [ ] Gate terminates on that turn — **no second round is composed**.
  - [ ] Each open question takes the forecast's winner — the option marked recommended — and is recorded in the Draft's Constraints & Assumptions as `- **Assumption (forecast):** {premise}. Runner-up: {other reading}. Override: /magic.spec amend {file} "{runner-up}"` (IK-7).
  - [ ] `[Intake] Understood as: …` is narrated once and the Draft is written on that same turn — Anti-Stall resumes at full force (IK-9).
  - [ ] Delegation is treated as a first-class reply, not an error or a re-prompt.
- **Action (Test B — set fails to shrink):** User answers one question under **Other**, and that free text opens two consequent questions.
- **Expected B:**
  - [ ] The **Other** text goes back through Gates 1 and 2 before it closes anything — it is new human text, not the agent's own option.
  - [ ] Round is **not** convergent — the open set did not get strictly smaller (closing one while opening two fails IK-6).
  - [ ] Gate terminates; the questions still open are answered by the forecast and recorded as premises; dispatch proceeds.
- **Action (Test C — convergent round):** User picks an option for two questions and answers the third under **Other** with text the re-check finds coherent and grounded.
- **Expected C:**
  - [ ] The set is empty — the gate ends by convergence. Nothing was delegated, so no `Assumption (forecast)` bullet is written: the answers appear in the spec's own voice, with no trace of the questions (IK-7).
- **Action (Test D — more than three delegated points):** the gate opened with five intent questions — three asked in the first round, two waiting — and the user replies `"you decide"`.
- **Expected D:**
  - [ ] At most three `Assumption (forecast)` bullets; the remaining two points are marked `<!-- TBD: … -->` (IK-7) — never a fourth premise, never a second round.
- **Guards tested:** IK-6 strict-shrink termination and the **Other** re-check; IK-7 premise residency, the three-premise cap and its TBD overflow; IK-9 Anti-Stall reconciliation; Mode Transition Auto-Transfer rebound to non-convergence rather than a round count.
- **Regression for:** an uncapped dialogue with a "closes ≥1 question" test that admits a non-terminating loop — the defect caught by the spec's own Post-Update Review before promotion — and a delegated essence question left as a bare TBD while the surrounding prose silently committed to one reading.

### T212 — Technical Fork Never Reaches the User Channel (IK-3/DA-9)

- **Workflow:** `spec.md` (Step 0.5 Idea Intake Gate) + `l1-decision-autonomy.md` DA-2/DA-9
- **Synthetic State:**
  - `.design/engine/` initialized; idea is coherent and single-reading, but its realization admits several defensible technical paths.
- **Action:** User runs `/magic.spec store user drafts so they survive a page reload`.
- **Expected:**
  - [ ] Gate 1 passes — one coherent reading, one Overview sentence. Gate 2 passes — every anchor is grounded: it is for the people writing drafts, it must keep them across a reload, and it stops there (keeping them across devices is not the default any engineer would assume, so it is not invented). Gate stays silent.
  - [ ] Storage mechanism, serialization format, eviction policy, and key naming are resolved by the agent via DA-3, recorded as `[DR]` or TBD — **never** surfaced as questions.
  - [ ] No `AskUserQuestion` and no inline option menu appears at any point.
  - [ ] Whitelist reasoning is explicit: no consent entry (E1, E2, E4) fires and no F1–F3 condition holds, so DA-1 decide-by-default governs.
  - [ ] A `Clarifications` section, a brief file or an `Assumption (forecast)` bullet is **not** created anywhere (IK-7) — a silent gate records nothing.
- **Guards tested:** IK-3 boundary test (derivable from repository or ordinary engineering judgment → never asked, never a premise); IK-4 grounding test for F3; IK-8 scope containment keeping E6 off Selection/Sequencing forks; IK-7 premise residency.
- **Regression for:** E6 widening from an intent gate back into a general clarification channel.

### T213 — Task Guided Planning Directive Filter Enforcement

- **Workflow:** `task.md` (Guided Planning — directive-to-selection wiring)
- **Synthetic State:**
  - `engine` workspace has 5 `Stable` specs: `auth.md`, `payments.md`, `ui-theme.md`, `logging.md`, `metrics.md`.
  - No `PLAN.md` exists yet.
- **Action:** `/magic.task "only payments and auth"`
- **Expected:**
  - [ ] Argument Routing detects Guided Planning (Mode C) — text matches no workspace name.
  - [ ] **Guided Planning Filter** restricts C6 selection to `Stable` specs matching the directive: `auth.md`, `payments.md` selected.
  - [ ] `ui-theme.md`, `logging.md`, `metrics.md` — `Stable` but non-matching — are left untouched in their current placement, NOT force-moved to Backlog and NOT silently included.
  - [ ] `PLAN.md` is written containing phases for `auth.md` and `payments.md` only.
- **Guards tested:** Guided Planning Filter (previously undocumented / unimplemented in Steps 1–8; regression for T148/T149 gap found in Improv Mode simulation 2026-09-17, "The Discarded Directive").

### T214 — Task Guided Planning Directive Matches Zero Specs

- **Workflow:** `task.md` (Guided Planning — zero-match HALT)
- **Synthetic State:**
  - `engine` workspace has 3 `Stable` specs, none related to "mobile".
- **Action:** `/magic.task "plan the new mobile-client offline sync"`
- **Expected:**
  - [ ] Directive parsed and matched against all registered spec titles/filenames/content → 0 matches.
  - [ ] **HALT**: `"Could not map planning directive 'plan the new mobile-client offline sync' to any registered spec. Run /magic.task {workspace} for full planning, or author it first with /magic.spec."`
  - [ ] Agent does NOT silently fall back to full C6 Autonomous Selection (would discard user intent silently).
  - [ ] No `PLAN.md`/`TASKS.md` written from this invocation.
- **Guards tested:** Guided Planning zero-match fallback (mirrors `analyze.md` Mode D's existing "Could not map focus" HALT pattern); regression for T148/T149 gap.

### T215 — Context Step 0 Scope Claim Matches Implementation

- **Workflow:** `context.md` (§Step 0 scope) vs. `task.md` / `rule.md`
- **Synthetic State:** static text scan (no runtime state).
- **Action:** review `context.md` Step 0 preamble against `task.md` and `rule.md` bodies.
- **Expected:**
  - [ ] `context.md` Step 0 explicitly states it governs `magic.spec` — the sole workflow authoring new topical spec content requiring workspace-creation routing.
  - [ ] `context.md` explicitly names `task.md`/`rule.md` as exempt, with the one-line reason that they operate only on already-registered specs/rules and never introduce a new domain topic.
  - [ ] `task.md` and `rule.md` contain zero references to "Workspace Intent", "WI-", or "Step 0" (they never claim to perform detection they don't implement).
- **Guards tested:** Contract/implementation parity (regression for the Step-0 scope-claim drift found in Improv Mode simulation 2026-09-17, "The Discarded Directive").

### T216 — C14 Trigger Condition Parity (Regression, sibling to T193)

- **Workflow:** All workflows with an Engine Integrity (C14) Core Invariant
- **Synthetic State:**
  - 7 files declare a C14 Engine Integrity/Versioning invariant: `retrospective.md`, `init.md`, `analyze.md`, `spec.md`, `task.md`, `rule.md`, `run.md`.
- **Action:** scan all 7 files for the C14 trigger condition wording.
- **Expected:**
  - [ ] All 7 files' trigger condition covers BOTH paths — `.magic/` AND `workflows/` — substantively; exact prose may vary (e.g. `retrospective.md`'s "engine files (`.magic/` or `workflows/`)" wrapper is an acceptable restatement, not a divergence — same precedent as T193's rule.md extension).
  - [ ] No file's trigger condition names `.magic/` alone, omitting `workflows/` (pre-fix `analyze.md` divergence — a real narrowing, not a wording variant).
- **Guards tested:** C14 trigger-condition substantive parity (both paths present in every file), sibling regression to T193's Auto-Init parity check; found in Improv Mode simulation 2026-09-17.

### T217 — Guided Planning Filter Applies to Bootstrap Mode

- **Workflow:** `task.md` (Guided Planning Filter × C6 Bootstrap Exception interaction)
- **Synthetic State:**
  - `engine` workspace: 4 specs, ALL `Draft`, all pass MVC (Overview + design section) — none reach `Stable` after Pre-Planning Stabilization (e.g. all blocked by a shared `RULES.md` conflict).
  - No prior `PLAN.md` exists (Bootstrap Mode eligible).
  - Specs: `auth.md`, `payments.md`, `ui-theme.md`, `logging.md`.
- **Action:** `/magic.task "only payments and auth"`
- **Expected:**
  - [ ] Pre-Planning Stabilization promotes 0 specs to Stable (all remain Draft) → C6 Bootstrap Exception activates.
  - [ ] **Guided Planning Filter** applies to the Bootstrap Draft-spec pull: only `payments.md` and `auth.md` (directive matches) are planned with `[Bootstrap]` marker.
  - [ ] `ui-theme.md` and `logging.md` — Draft, MVC-passing, but non-matching — are NOT included in the Bootstrap plan.
  - [ ] `PLAN.md` (`[Bootstrap Plan]`) contains phases for `auth.md` and `payments.md` only.
- **Guards tested:** Guided Planning Filter × C6 Bootstrap Exception interaction (regression for the gap found in `/magic.dev.simulate test`, 2026-09-17 — "The Filter That Forgot Bootstrap").

### T218 — Template C6 Wording Matches task.md Autonomous Behavior (Constitution/Engine Parity)

- **Workflow:** `task.md` (§7 Architectural Logic — Autonomous Selection C6) vs `.magic/templates/rules.md` (§7 C6)
- **Synthetic State:** Fresh project just ran `init` — `.design/RULES.md` seeded from `.magic/templates/rules.md`.
- **Action:** Static scan comparing the shipped C6 template wording against `task.md`'s actual C6 implementation.
- **Expected:**
  - [ ] Template C6 text does NOT contain "agent asks which ones to pull" or any phrase implying a user prompt for Stable specs.
  - [ ] Template C6 text does NOT contain "surfaced to user" for RFC specs.
  - [ ] Template C6 text states Draft AND RFC specs both move to Backlog without user input, matching `task.md`'s "Move Draft/RFC to Backlog. No user prompt...".
  - [ ] Template C6 text states Stable specs are auto-pulled into the active plan, matching `task.md`'s "auto-pull ALL Stable specs...No user prompt unless a priority conflict is detected."
- **Guards tested:** Constitution/Engine parity (shipped template must not misdescribe actual autonomous behavior to new users); regression for the "Stale Selective Planning" drift found via `/magic.dev.simulate test`, 2026-09-17.

### T219 — Wholesale-Gitignored `.magic/` Must Not Fail `--check` (Invariant 7 Boundary, Regression)

- **Workflow:** `update-engine-meta.js --check` (pre-commit hook, consumer install)
- **Synthetic State:**
  - Consumer project (e.g. `metaquant`) installs the engine from a release archive and follows the documented L1 contract: its own `.gitignore` contains `.magic/` (engine is "installed from a release archive, not committed").
  - `.magic/.checksums` lists all shipped engine files, unmodified on disk.
- **Action:** run `node .magic/scripts/executor.js update-engine-meta --check` (as the pre-commit hook does).
- **Expected:**
  - [ ] Every file listed in `.checksums` is still verified against disk, regardless of the consumer's own `.gitignore` — a manifested path is never treated as "disowned."
  - [ ] `--check` exits 0 with "No changes detected" when the shipped files are unmodified.
  - [ ] The Invariant 7 gitignore exclusion still applies to paths **not yet in the manifest** (stray dev-machine cruft, e.g. `.foreign-cache/`), preserving the original protection (see `generate-checksums.js` / `update-engine-meta.js` gitignore-parity tests in `dev/tests/engine.js`).
- **Guards tested:** Invariant 7 scope boundary — gitignore-based exclusion must be scoped to *new/unmanifested* paths only, never to paths already in `.checksums`. Found live in `metaquant` (a real consumer project): its pre-commit hook failed on every commit because `isGitignored` was applied unconditionally in `update-engine-meta.js`'s on-disk scan, causing all 71 manifested files to read as "missing" the instant the consumer's `.gitignore` disowned `.magic/` — the exact convention this engine mandates. Fixed engine v2.1.93 by gating the exclusion on `!isManifested`.

### T220 — Cold Start With an Unrelated First Message Surfaces the Resume Line and Keeps the Request (SC-6/SC-8/SC-9)

- **Workflow:** `rules/magic.md` §10 (Session Resume Check) + `resume-state` (via `executor.js`) + `run.md` Task Start
- **Synthetic State:**
  - A new session: the context holds no `STATE.md`. `.design/engine/` initialized, `MAGIC_RESUME_CHECK` unset.
  - `tasks/phase-3.md`: task `T-3A02` "Extract the parser" has its tracking entry `**Status:** In Progress`; its checklist line still reads `- [ ]`. Its `Attempts` field holds two indented lines: `tried a global regex → it swallowed the next entry` and `tried a line scan → it split on CRLF`.
  - Three product files are modified in the working tree (outside `.design/`).
  - `STATE.md`: `Status: Active`, `Next Action: Execute T-3A02 Extract the parser via /magic.run engine`.
- **Action:** The first user message has nothing to do with the recorded work: `"rename the constant MAX_RETRIES to RETRY_LIMIT in src/net.js"`.
- **Expected:**
  - [ ] Before its first tool call the agent — holding no `STATE.md` — runs `node .magic/scripts/executor.js resume-state --all` once (§10), not a wider read of the design tree.
  - [ ] The printed line is relayed **verbatim**, as one informational line naming `T-3A02`, `2 dead end(s) recorded`, `3 file(s) modified` and the recorded next action — never a prompt, never a menu.
  - [ ] The user's request is executed in the same turn. The recorded `Next Action` does not override it (Memory Fence); any divergence is narrated in one line.
  - [ ] The agent does not start `T-3A02` uninvited and does not ask whether to "continue the previous work".
  - [ ] The check is not repeated on the next message of the same context.
  - [ ] When `T-3A02` is later resumed, neither recorded approach is retried unless the new `Attempts` entry carries one line `retry: {what is different this time}`.
- **Guards tested:** SC-6 cold-start sufficiency (position, dead ends and modified files come from recorded state alone); SC-9 resume predicate consumed by the session-start rule; SC-8 dead-end record honored at Task Start; Memory Fence (the request outranks the recorded action); C25 (no question); the once-per-cold-context condition.
- **Regression for:** a resume mechanism that stays silent until the user types a `/magic.*` command, or one that hijacks an unrelated request.

### T221 — A Bare "continue" Executes the Recorded Next Action Without a Question, Past a Stale Snapshot (SC-9/C25)

- **Workflow:** `rules/magic.md` §10 + `context.md` Post-Resolution step 4 + `run.md` Task Start (resume branch)
- **Synthetic State:**
  - The state of T220 (`T-3A02` `In Progress`, two dead ends).
  - A leftover `.design/engine/HANDOFF.json` from a retired snapshot mechanism, whose `next_action` names a different task, `T-2B05`.
- **Action:** The user types only `continue`.
- **Expected:**
  - [ ] Resume detection runs **exactly once** in the turn — through the run workflow's context load, not again from the session-start rule (§10: a `/magic.*` invocation performs the check itself).
  - [ ] The printed line names `T-3A02`. The leftover file is **not** a trigger: nothing reads it, so it is neither consumed nor mentioned as pending work (SC-9(b), SC-9(g)).
  - [ ] `continue` is taken as "execute the recorded `Next Action`": the agent starts the run workflow on `T-3A02` in the same turn.
  - [ ] Task Start finds the entry already `In Progress` and treats it as **resumed**: it leaves the status unchanged, and reads `Attempts` and `Handoff` before an approach is chosen.
  - [ ] The checklist line stays `- [ ]` until the task is `Done`.
  - [ ] **No question** ("which task?") and no option menu appears; the next step was computed and narrated, not asked (C25, DA-6).
- **Guards tested:** SC-9(b) file presence is not a trigger; SC-9(d) resume from the recorded `Next Action`; Task Start's resumed-versus-started distinction; C25 and DA-6.
- **Regression for:** a "continue" that asks which task, or that follows a stale snapshot into work abandoned long ago.

### T222 — A Context That Begins With a Summary Is Re-grounded From Files, Never From the Summary or a Percentage (SC-7)

- **Workflow:** `context.md` §Context Budget Guard → Post-Compaction Re-grounding + `rules/magic.md` §10
- **Synthetic State:**
  - The conversation was compacted: its first message is a summary stating that the current task is `T-3A02`, that the global-regex approach worked, and that no constraints apply.
  - On disk: `STATE.md` carries the Blocking Constraint `[C-004]` ("do not edit the checksum manifest by hand"); `T-3A02`'s `Attempts` records the global-regex approach as **failed**. The host supplies no usage figure.
- **Action:** The user writes `carry on`.
- **Expected:**
  - [ ] The agent treats the context as **cold**: it runs resume detection and re-reads `STATE.md` and the active task's tracking entry before making any edit.
  - [ ] Constraints, dead ends and position are taken from those files: `[C-004]` is acknowledged before the first action, and the global-regex approach is not retried (or a one-line `retry:` states what differs) — although the summary says it worked.
  - [ ] Where the summary and the files disagree, the files are followed.
  - [ ] **No fill percentage is cited or acted on** ("context at 63%") and no tier is narrated.
- **Guards tested:** SC-7 observable triggers — a visible compaction is an event, a fill percentage is not measurable; Post-Compaction Re-grounding; the retired Budget Guard tiers stay retired; SC-6 (recorded state outranks recollection).
- **Regression for:** the retired POOR auto-pause that fired on a guessed percentage, and a summary that silently drops the constraints and dead ends a resuming session most needs.

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

### T224 — Finalize With an Unwritable `STATE.md`: the Agent Never Tells the User It Is Safe to Clear (SC-6.1)

- **Workflow:** `rules/magic.md` §3 (Finalization Protocol) + the `finalize.js` checkpoint claim
- **Synthetic State (Test A — update fails):**
  - `/magic.task engine` has just written its plan. `STATE.md` cannot be updated, so `finalize --workflow=task` prints `⚠ STATE.md update skipped (non-blocking): …`, its summary row reads `STATE.md | skipped (warning above)`, and its digest lists `STATE_UPDATE_SKIPPED`. The words `checkpoint saved` do not appear anywhere in the output.
- **Action A:** The agent relays the output and writes its closing message; the user then asks, `can I clear the context now?`
- **Expected A:**
  - [ ] The finalize output is displayed **verbatim**, warning and digest included (§3.3).
  - [ ] The skipped update is relayed as a warning and does not block the Completion Checklist (§3.4: non-blocking).
  - [ ] The agent does **not** say that the checkpoint is saved, that the session can be cleared, or that nothing will be lost. It names the consequence in one line: the recorded position (`Next Action`, `Status`) may be stale, while the plan and workbooks on disk are unaffected.
  - [ ] The words `checkpoint saved` appear nowhere in the agent's own message.
- **Synthetic State (Test B — control):**
  - The same run with a writable `STATE.md`: the summary row reads `updated (SC-2) — checkpoint saved`.
- **Action B:** The user asks the same question.
- **Expected B:**
  - [ ] The agent may answer that ending or clearing the session loses nothing — a claim made **only** because the script printed `checkpoint saved`.
- **Guards tested:** SC-6.1 claim honesty (the guarantee is no stronger than the script's output); verbatim relay of finalize output; non-blocking semantics of a `STATE.md` failure.
- **Regression for:** a comforting "all saved, you can clear" said over a failed write, after which the next cold context resumes from stale state.

### T225 — An Agent-Originated Rule With No Cited Occurrence Is Declined; With Evidence It Is Admitted Soft (RA-2/RA-8)

- **Workflow:** `rule.md` (Operational Logic → Admission)
- **Synthetic State (Test A — no evidence):**
  - `.design/RULES.md` §7 holds C1–C9. During spec work the agent itself proposes a convention: "all specs must list at least three alternatives in Drawbacks". No file, commit or session failure is cited; nothing has gone wrong.
- **Action A:** `/magic.rule add "all specs must list at least three alternatives in Drawbacks"`, composed by the agent (origin: agent-originated).
- **Expected A:**
  - [ ] Origin is classified agent-originated; the evidence test finds no cited occurrence and the candidate is not an irreversible-class harm.
  - [ ] Exactly one line is narrated: `[DR] Not codified: … — no evidence. (Override: /magic.rule add "…")`.
  - [ ] `RULES.md` is not written, its version is not bumped, and no question is asked.
- **Synthetic State (Test B — control):**
  - The same candidate, now with a cited occurrence: two Stable specs in the workspace (file and line named) were promoted with a single alternative and a downstream task was planned against the weaker one; nothing in the constitution, the shipped rules or a workflow gate catches it; the harm is reversible (an amend).
- **Action B:** the same `/magic.rule add`.
- **Expected B:**
  - [ ] The candidate passes the without-rule questions (cause persists, uncovered, reversible) and no disqualifying hazard remains after rewording to the evidence scope.
  - [ ] It is admitted at the workspace rung as a **soft** convention; the admission record is at most seven lines.
  - [ ] It reaches the user through the E4 proposal, whose at most three options include "do not adopt".
- **Guards tested:** RA-2 evidence anchor; RA-8 one-line Decision Record; no question outside the whitelist; the gate is not a blanket refusal.
- **Regression for:** a non-conflicting rule approved only because nothing conflicts with it — the exact path that produced rules the agent later had to obey.

### T226 — A Candidate an Existing Rule Already Covers Is Declined Naming It (RA-3)

- **Workflow:** `rule.md` (Operational Logic → Admission, without-rule coverage question)
- **Synthetic State (Test A):**
  - The shipped rules already forbid writing task IDs, phase designators and spec file names into product files, and ventilation already reports `SDD_REFERENCE_LEAK`. The agent proposes a convention: "never write task IDs into source comments", citing one comment that does so.
- **Action A:** `/magic.rule add` for that convention, agent-originated.
- **Expected A:**
  - [ ] The coverage question finds the shipped containment rule and the ventilation advisory.
  - [ ] One Decision Record: `[DR] Not codified: … — covered by {that rule}. (Override: /magic.rule add "…")`, naming the covering rule.
  - [ ] Nothing is written; the one cited comment is a finding to fix where it occurs, not a rule.
- **Synthetic State (Test B — control):**
  - A candidate about a different concern that no shipped rule, convention, workflow gate, specification regulation, test or hook covers.
- **Expected B:**
  - [ ] The coverage question finds nothing; the candidate is not declined on that ground.
- **Guards tested:** RA-3 existing-coverage check reaching the engine's shipped rules, not only the two `RULES.md` tiers; duplication reach.
- **Regression for:** a duplicate of an engine rule registered because the check compared only the project's own tiers.

### T227 — A User-Stated Rule Is Written as Stated; Unstated Strengthenings Are Not Added (RA-5/RA-6)

- **Workflow:** `rule.md` (Operational Logic → Admission, user-stated branch) via `/magic.spec` T4 capture
- **Synthetic State (Test A):**
  - Active workspace with a Stable spec. No convention about verification exists.
- **Action A:** `"Remember that every artifact of kind K is checked on every configuration the platform offers."`
- **Expected A:**
  - [ ] Origin is user-stated; the rule is not declined on necessity grounds.
  - [ ] It is written with scope *artifacts of kind K* and strength *checked*; the body is at most 10 non-empty lines and carries no Decision Record text.
  - [ ] Each unstated strengthening — a promotion block, a repeat for every artifact composing K, a retroactive trigger — is narrated as one "not added" Decision Record and is not written.
  - [ ] The deadlock hazard (the check needs a running platform the agent may not reach) is reported as an advisory beside the write, not as a question.
  - [ ] The Document History row records the origin `user-stated`.
- **Synthetic State (Test B — control):**
  - The user states the blocking form: `"Remember that a kind-K artifact must not be promoted until it passes on every configuration."`
- **Expected B:**
  - [ ] The blocking form is written as stated; nothing further is added or removed.
- **Guards tested:** RA-5 fidelity; RA-6 body bound and history origin; advisory instead of question.
- **Regression for:** a one-sentence operator rule inflated into a fail-closed gate with an enumeration, a cascade and a retroactive trigger.

### T228 — A Hard Form for Reversible Harm Is Admitted Soft (RA-4)

- **Workflow:** `rule.md` (Operational Logic → Admission, form and placement)
- **Synthetic State (Test A):**
  - The agent proposes a convention with a cited, persisting, uncovered occurrence whose harm is reversible (a mis-formatted table caught and fixed in the next commit), and drafts it as a blocking gate: "no task may be marked Done until every table passes a formatter".
- **Action A:** `/magic.rule add` for the blocking gate, agent-originated.
- **Expected A:**
  - [ ] The harm class is reversible, the soft form has never been violated, and the user did not state the hard form: the hard form is not admissible.
  - [ ] The rule is admitted only as a **soft** convention (a violation is an advisory finding); the blocking condition is dropped, and the deadlock hazard is named as the reason.
- **Synthetic State (Test B — control):**
  - The harm is in the irreversible class (a release artifact published with a wrong file).
- **Expected B:**
  - [ ] The hard form may be admitted for that class.
- **Guards tested:** RA-4 soft-by-default form; the three conditions that admit the hard form.
- **Regression for:** blocking gates written for problems a later commit fixes, which then stop the agent's own work.

### T229 — Ventilation Reports a Rule Whose Cause Is Gone and Edits Nothing (RA-7)

- **Workflow:** `analyze.md` (Mode C step 12 → Rule Retirement)
- **Synthetic State (Test A):**
  - Workspace `RULES.md` holds WC1, agent-originated, whose Document History row cites `scripts/legacy/export.sh` as its evidence; that file no longer exists.
- **Action A:** `/magic.analyze {workspace}`
- **Expected A:**
  - [ ] `RULE_RETIRE_CANDIDATE WC1: a` with the next step `→ /magic.rule remove WC1`.
  - [ ] No rule is edited or removed; Remove would still ask its single confirmation.
- **Synthetic State (Test B — controls):**
  - WC2 is user-stated and cites a missing file; C7 is an engine-owned convention (its heading matches the shipped template).
- **Expected B:**
  - [ ] WC2 is not flagged as cause-gone (only agent-originated rules carry cited evidence); it is still checked for superseded, deadlock and size.
  - [ ] C7 is never flagged.
- **Guards tested:** RA-7 kinds (a)–(d) and their exclusions; ventilation stays read-only.
- **Regression for:** a rule set that only ever grows because nothing proposes a removal.

### T230 — A Specification-Placed Outcome From `/magic.rule` Is Redirected, Not Written (RA-8)

- **Workflow:** `rule.md` (Operational Logic → Admission, write reach) as `/magic.rule` and on behalf of `/magic.spec`
- **Synthetic State (Test A):**
  - An agent-originated candidate with a cited, persisting, uncovered, reversible occurrence whose lowest sufficient placement is a regulation inside one specification (it binds only work on that specification).
- **Action A:** `/magic.rule add …` for it.
- **Expected A:**
  - [ ] One Decision Record: `[DR] Not codified: … — placed at rung 2. (Override: /magic.spec amend {spec})`, naming the governing specification.
  - [ ] `RULES.md` is not written; no question is asked. The same holds for a rung-1 note.
- **Synthetic State (Test B — control):**
  - The same candidate arises while `/magic.spec` edits that specification.
- **Expected B:**
  - [ ] The regulation is written into the specification under edit and narrated as an admission record; `RULES.md` is untouched.
- **Guards tested:** RA-8 write reach; the rule workflow never exceeds its write scope.
- **Regression for:** a spec-scoped regulation promoted into the global constitution because the rule workflow could not place it anywhere else.

### T231 — The Status Briefing Renders "Nothing Pending" as a Statement, Never as a Recommended Command (SC-2.4 addendum)

- **Workflow:** `status.md` (Step 7 — Next)
- **Synthetic State (Test A — nothing pending):**
  - `STATE.md` reads `Next Action: Plan complete — nothing pending`, `Blockers` is empty, the plan is complete and in sync with the registry, and the Backlog holds only Parked items.
- **Action A:** `/magic.status`
- **Expected A:**
  - [ ] The Next section reads `Next: nothing pending — Plan complete — nothing pending` (or the same statement in one clause) and recommends **no command**.
  - [ ] No `[DR] Next: /magic.…` line is emitted, and the briefing does not fall through to the pipeline-order fallback (which would name `/magic.task` or `/magic.spec`).
  - [ ] The briefing stays read-only and asks no question.
- **Synthetic State (Test B — control):**
  - `Next Action: Execute T-2A01 Wire the exporter via /magic.run engine`.
- **Expected B:**
  - [ ] The `[DR] Next: /magic.run engine — …` form is rendered exactly as before; only a `Next Action` that names no command changes the rendering.
- **Guards tested:** the nothing-pending rendering; the fallback applies only when `Next Action` is absent; the recommendation form is untouched for every value that names a command.
- **Regression for:** the briefing replaying a command-free `Next Action` as a recommendation — reformatting the statement back into `/magic.task …` and inviting a run that can only report no changes.

### T232 — A Verb the Engine Tells the User to Run Resolves to a Declared Argument Form (The Undeclared Verb)

- **Workflow:** `task.md` (Argument Routing) + `run.md` (Core Invariant 4 Sync, Spec Stability, Mid-Run Stability Check) + `check-prerequisites.js` (`remedy` strings)
- **Synthetic State (Test A — routing):**
  - `workspace.json` registers `engine` (default) and `docs`. `engine` holds 5 `Stable` specs; none has a filename or title naming an update; a plan exists.
  - `RULES.md` is v1.4.7; `TASKS.md` records `Based on RULES: 1.4.6`.
- **Action A:** `/magic.run engine` — the Sync guard auto-runs `/magic.task {workspace} update`.
- **Expected A:**
  - [ ] `update` is matched by the reserved-keyword row of Argument Routing, which precedes the Guided Planning row: the mode is **Plan Update**, not Guided Planning.
  - [ ] No directive filter runs — no `Could not map planning directive 'update'` HALT, and no narrowing of the pass to specs matching the word.
  - [ ] All 5 `Stable` specs are re-evaluated (C12 quarantine, phantom specs, Rules Parity); `TASKS.md` records `Based on RULES: 1.4.7`; `/magic.run` proceeds.
- **Synthetic State (Test B — scope and quoting):** the same project.
- **Action B:** `/magic.task docs update`, then `/magic.task "update"`.
- **Expected B:**
  - [ ] `docs update` is Plan Update scoped to `docs` (workspace token first, keyword second); `engine` is untouched.
  - [ ] The quoted `"update"` is a Guided Planning directive — the quote forces directive interpretation — and, matching no spec, ends in the zero-match HALT.
- **Synthetic State (Test C — static scan):** shipped text and script output.
- **Action C:** scan `.magic/*.md`, `workflows/*.md`, `rules/*.md` and `docs/*.md`, and the `remedy` strings in `.magic/scripts/check-prerequisites.js`, for `/magic.task {word}` and `magic.task {word}` forms.
- **Expected C:**
  - [ ] Every `{word}` is a declared argument form: none, a workspace name, `update`, or a quoted directive. No undeclared unquoted word (`amend`, `sync`, …) is advertised.
  - [ ] The `task.md` routing table, `workflows/magic.task.md` and `docs/task.md` list the same argument forms.
- **Guards tested:** Argument Routing reserved keyword (same pattern as `first-time` in `analyze.md`); Guided Planning Filter reach; verb-to-interface parity between the engine's own remedies and its declared arguments; C13 (no reliance on agent judgment for an undeclared token).
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — once the Guided Planning Filter was wired into routing (T213/T214), the remedy the engine itself names for a stale plan (`magic.task update`: three `run.md` lines, one `rule.md` line, three script remedies) became a directive that matches no spec — a zero-match HALT on the recovery path; `(Adjust: /magic.task amend)` in the auto-plan narration was the same defect.

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

### T234 — Shipped Workflow Text Stays Structurally Sound: Section References Resolve, List Items Keep Their Own Lines, Every Ventilation Finding Code Has a Checklist Line

- **Workflow:** `context.md`, `task.md`, `run.md`, `analyze.md` (static scan)
- **Synthetic State:** static text scan of `.magic/*.md` (no runtime state).
- **Action:** review named-section references, list structure and the Mode C Completion Checklist.
- **Expected:**
  - [ ] Every `§{Section}` reference names a heading that exists in the file it points to: `task.md` and `run.md` send workspace resolution to `context.md` §Workspace Resolution Chain, not to a `§Workspace Resolution` heading they do not own (`analyze.md` owns one); a list item is cited by its section and step (`context.md §Post-Resolution` step 4), never as a bare `§4` that no heading carries.
  - [ ] No list item shares a physical line with another: `context.md` Post-Resolution step 4 renders two bullets.
  - [ ] Every Mode C step that defines its own finding code has a line in the Mode C Completion Checklist — including the three that once lacked one: `PHANTOM_COMMAND` (step 2), `DOC_SYNC` (step 10), `UNSCOPED` (step 11).
- **Guards tested:** Broken Loops — a checklist that does not cover the work; dangling cross-references; list integrity.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30).

### T235 — `checksums_mismatch` Names the `ENGINE_INTEGRITY` Warning: the Script Prints No Separate Token

- **Workflow:** `init.md` §1 (C15 Filter) + `task.md` and `run.md` Pre-flight (they branch on `ENGINE_INTEGRITY`) + the constitution's C9 gate 6 and C23 §3 (they still say `checksums_mismatch`)
- **Synthetic State:**
  - `.magic/run.md` is modified locally (hash mismatch). `check-prerequisites --json` returns `ok: false` with a warning `{"type": "ENGINE_INTEGRITY", …}` and no field or value named `checksums_mismatch`.
  - Workspace `engine` scope covers `.magic`.
- **Action:** `/magic.task` and `/magic.run` reach their Pre-flight.
- **Expected:**
  - [ ] The pre-flight of `task.md` and `run.md` matches the `ENGINE_INTEGRITY` warning literally and applies the C15 Filter; reading C9 gate 6 or C23 §3, the agent maps `checksums_mismatch` to that same warning (declared in `init.md` §1).
  - [ ] The mismatch is in scope → **HALT** with the `update-engine-meta` / restore-from-origin hint; an out-of-scope mismatch would proceed silently.
  - [ ] The agent does not conclude "no checksum mismatch" from the absence of a literal `checksums_mismatch` token in the JSON.
- **Guards tested:** Primary Source Principle (C13 §1) — a branch named in workflow text must be reachable from the script's actual vocabulary; C15 Filter.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — ten lines of workflow, constitution and template text branch on a token `check-prerequisites.js` never prints.

### T236 — A Completed Phase Continues Into the Next Phase When It Has Todo Tasks, and Otherwise Ends With One `/magic.task` Recommendation

- **Workflow:** `run.md` (Step 4 Handoff, Step 5 Phase Completion, Step 2 Select) + `rules/magic.md` §5
- **Synthetic State (Test A — next phase is ready):**
  - Phase 1: its last task is marked `Done`. Phase 2 holds 3 `Todo` tasks whose parents are `Done`. No drift signal, no spec ambiguity.
- **Expected A:**
  - [ ] Step 5 runs in the same invocation: Retro L1, Changelog L1, frontmatter update.
  - [ ] "Phase complete" is not a HALT: the Handoff bullet lists only spec ambiguity and drift signals.
  - [ ] Select picks the first `Todo` task of Phase 2 without a question; `[Auto-Run] Phase 1 complete. …` is narrated.
  - [ ] No "Post-task drift detected" note is emitted; the closing next step names exactly one command, `/magic.run {workspace}`.
- **Synthetic State (Test B — nothing decomposed behind the phase):**
  - Phase 1 is complete; the plan's next phase has no `Todo` task (its work sits in `## Backlog`).
- **Expected B:**
  - [ ] Phase Completion runs; Select reaches *Backlog-Only* and halts.
  - [ ] Exactly one command is recommended: `/magic.task {workspace}` (the `rules/magic.md` §5 trigger "phase complete with nothing to run next").
- **Synthetic State (Test C — control):** during the run `RULES.md` moves ahead of the `TASKS.md` base.
- **Expected C:**
  - [ ] HALT as before, with the single recommendation `/magic.task {workspace}`; the drift list in the Handoff bullet is unchanged for `STATUS_DRIFT`, `VERSION_DRIFT` and `RULES > TASKS base`.
- **Guards tested:** Handoff HALT list limited to ambiguity and drift; one recommended command per stop; diagram edge J→C reachable; agreement of `run.md`, `rules/magic.md` §5, T21 and T205.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — the Handoff bullet listed "phase complete" as a halt while the diagram and T21/T205 continued into the next phase.

### T237 — `spec.md` and `rule.md` Pre-flight Branch Through `init.md` §1, the Single Source

- **Workflow:** `spec.md` (Creating, Updating), `rule.md` (Operational Logic 1), `init.md` §1
- **Synthetic State (Test A — ghost entry):**
  - `check-prerequisites --json` returns `ok: false` with a `GHOST_REGISTRY` warning for an in-scope spec other than the target.
- **Action A:** `/magic.spec` amends a different spec; then `/magic.rule add "…"`.
- **Expected A:**
  - [ ] Both workflows branch per `init.md` §1: `GHOST_REGISTRY` → C15 Filter → in scope → **HALT** before any write.
  - [ ] No branch is left undefined because the workflow text lists fewer cases than `init.md`.
- **Synthetic State (Test B — unrecognized failure):** `{"ok": false, "unknown_error": "disk_full"}`.
- **Expected B:**
  - [ ] **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually." — the same outcome as T138, reached from `spec.md` and `rule.md`.
- **Guards tested:** single-source branching; parity of the Pre-flight failure cases across `init.md`, `spec.md`, `rule.md`, `task.md`, `run.md`, `analyze.md`.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — two workflows enumerated 3 branches while four others knew 5.

### T238 — A Stale-Plan Remedy Names the Workspace It Reported On, and Audit Has One Spelling

- **Workflow:** `check-prerequisites.js` (remedy strings) + `run.md` (Spec Stability, Mid-Run Stability) + `rule.md` (Next step) + `analyze.md` (Pre-flight)
- **Synthetic State:**
  - `workspace.json` registers `engine` (default) and `docs`. The `docs` plan is based on an older registry version (`SYNC_GAP`); a `docs` spec is listed in `INDEX.md` but absent from `PLAN.md` (`ORPHANED_SPEC`).
- **Action A:** `MAGIC_DESIGN_DIR=.design/docs node .magic/scripts/executor.js check-prerequisites --json`.
- **Expected A:**
  - [ ] The `SYNC_GAP`, `ORPHANED_SPEC` and `RULE_57_VIOLATION` remedies read `/magic.task docs update`, not a bare `magic.task update` that would re-plan `engine`.
  - [ ] With the flat legacy layout (`MAGIC_DESIGN_DIR` unset, `.design/`) the remedy is `/magic.task update` — no workspace is invented.
  - [ ] The `REGISTRY_MISMATCH` remedy reads `/magic.spec audit`.
- **Action B:** static scan of `run.md`, `rule.md`, `analyze.md`, `docs/rule.md`.
- **Expected B:**
  - [ ] Every halt message and next step that sends the user to re-plan reads `/magic.task {workspace} update`.
  - [ ] The audit command is spelled `/magic.spec audit` everywhere; `--audit` appears nowhere.
- **Guards tested:** Handoff Propagation (`run.md` Argument Routing note), verb-to-interface parity, one spelling per command.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — a remedy without a workspace re-planned the default workspace in a multi-workspace project.

### T239 — Every Pre-flight Names the Workspace It Runs For (an Explicit Workspace Argument Is Not Silently Replaced by the Default)

- **Workflow:** `analyze.md` (Shared Pre-flight), `retrospective.md` (Step 1), `executor.js` (workspace resolution)
- **Synthetic State (Test A — behavior):**
  - `workspace.json` registers `engine` (default) and `docs`; `MAGIC_WORKSPACE` is unset. `docs` holds specs and a plan; `engine` is clean.
- **Action A:** `/magic.analyze docs` reaches the Mode B Shared Pre-flight; later `/magic.run docs` finishes a phase and Retro L1 reaches its Step 1.
- **Expected A:**
  - [ ] The command run is `check-prerequisites --json --workspace=docs`; `executor.js` lets the explicit flag outrank the default, so every finding concerns `.design/docs/` and the C15 Filter reads the `docs` scope.
  - [ ] A defect that exists only in `docs` (a `GHOST_REGISTRY` entry for a `docs` spec) is not hidden by the clean `engine` workspace.
- **Synthetic State (Test B — static scan):** shipped text.
- **Action B:** list every `executor.js check-prerequisites` invocation in `.magic/*.md`.
- **Expected B:**
  - [ ] All eight invocations (`init.md`, `spec.md` ×2, `rule.md`, `task.md`, `run.md`, `analyze.md`, `retrospective.md`) carry `--workspace={active-workspace}`.
- **Guards tested:** Context resolution reaching the script (Core Invariant 1 of every workflow); flag-over-default precedence in `executor.js`; parity of the Pre-flight command across workflows.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — two of the eight Pre-flight commands omitted the flag, so in a multi-workspace project the default workspace was validated in place of the one the user named.

### T240 — The Registry-vs-Disk Scan Needs No Plan: a Deleted or Misnamed Spec Is Reported Between the First Spec and the First Plan

- **Workflow:** `check-prerequisites.js` (registry scan), `task.md` / `spec.md` Pre-flight
- **Synthetic State:**
  - `INDEX.md` registers `l1-real.md`, `l1-missing.md` and `legacy.md`, all `Stable`; only `l1-real.md` exists on disk.
  - No `PLAN.md` exists yet (the first `/magic.task` has not run).
- **Action A:** `check-prerequisites --json --require-specs`.
- **Expected A:**
  - [ ] `GHOST_REGISTRY` is reported for `l1-missing.md` and `legacy.md`; `NAMING_VIOLATION` for `legacy.md`.
  - [ ] `ok: false` — the C15 Filter then decides (in scope → **HALT** before any planning).
  - [ ] No plan-dependent finding (`ORPHANED_SPEC`, `REGISTRY_MISMATCH`, `SYNC_GAP`, `RULE_57_VIOLATION`) appears: each compares against a plan that does not exist.
- **Action B:** the same state with a `PLAN.md` that lists only `l1-real.md`.
- **Expected B:**
  - [ ] The same `GHOST_REGISTRY` and `NAMING_VIOLATION` findings: a plan changes nothing about what the registry-vs-disk scan reports.
- **Guards tested:** Mechanical registry guard independence from the plan; `--verify-headers` can rely on `GHOST_REGISTRY` to cover a spec file that is missing.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the ghost scan sat inside the plan-dependent block of `check-prerequisites.js`, so a spec deleted before the first plan raised nothing, and header parity skipped the missing file on the strength of a finding that could not fire.

### T241 — Every Finalize Command Names the Workspace the Workflow Ran For

- **Workflow:** `spec.md`, `task.md`, `run.md`, `rule.md` (Finalization Protocol), their `workflows/` wrappers, `rules/magic.md` §3, `executor.js` and `finalize.js` (workspace resolution)
- **Synthetic State (Test A — behavior):**
  - `workspace.json` registers `engine` (default) and `docs`; `MAGIC_WORKSPACE` is unset. `/magic.task docs` has just written the `docs` plan.
- **Action A:** the agent runs the Finalization Protocol.
- **Expected A:**
  - [ ] The command is `finalize --workflow=task --workspace=docs`: `executor.js` consumes the flag and exports `MAGIC_DESIGN_DIR=.design/docs`, so `finalize.js` judges significance against the `docs` whitelist and writes the `docs` `STATE.md`.
  - [ ] The `engine` workspace's `STATE.md` is untouched; a bare command would have finalized `engine` and reported "No significant changes" for the `docs` plan.
- **Synthetic State (Test B — static scan):** shipped text.
- **Action B:** list every `executor.js finalize` command in `.magic/*.md`, `workflows/*.md` and `rules/*.md`.
- **Expected B:**
  - [ ] All ten (four bodies, four wrappers, two lines of `rules/magic.md`) carry `--workspace={active-workspace}`.
- **Guards tested:** Context resolution reaching the script (Core Invariant 1 of every workflow); the explicit flag outranking the default in `executor.js`; parity of the finalize command across bodies, wrappers and rules.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — no finalize command passed the flag, so after `/magic.task docs` (or any explicit workspace argument) the default workspace was finalized instead.

### T242 — Pre-flight Treats a Draft-Only Registry as Plannable and an Empty One as a Single-Recommendation HALT (Stable-Spec Requirement)

- **Workflow:** `task.md` (Step 1 — `--require-specs`, Step 2, C6 Bootstrap Exception), `check-prerequisites.js`
- **Synthetic State (Test A — Draft-only):**
  - 4 specs, all `Draft`, all passing MVC; no prior `PLAN.md`.
- **Action A:** `/magic.task`
- **Expected A:**
  - [ ] `check-prerequisites --require-specs` reports `missing_required: ["Stable specs (only Draft/RFC found)"]` and `ok: false` — and this is **not** a HALT.
  - [ ] Step 2 runs: the specs that pass the Trust Mode criteria are promoted; if none reach `Stable`, the C6 Bootstrap Exception plans them with `[Bootstrap]` (T170).
- **Synthetic State (Test B — empty registry, greenfield):**
  - `INDEX.md` lists no spec; the project has no `package.json`, `pyproject.toml`, `src/` or `lib/`.
- **Action B:** `/magic.task "plan the billing module"`
- **Expected B:**
  - [ ] `Stable specs (0 specs found)` → **HALT** with "No specifications are registered. Run `/magic.spec` to author the first one, then re-run `/magic.task`." — exactly one recommended command.
  - [ ] The report restates the request ("plan the billing module").
  - [ ] No `PLAN.md` or `TASKS.md` is written.
- **Synthetic State (Test C — empty registry, existing codebase):** as Test B, but the project has `package.json` and `src/`.
- **Expected C:**
  - [ ] The same HALT with the single recommendation `/magic.analyze first-time`; `/magic.spec` is not named.
- **Guards tested:** the Stable-Spec Requirement branch of Pre-flight; DA-8 (one recommended path per HALT); Intent Preservation across a HALT.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — Step 1 asked for `Stable specs` before Step 2 could create any and defined no branch for the answer, so Draft-only registries (the Bootstrap case by construction) and empty ones had no defined outcome.

### T243 — Config Drift Watches the Global Constitution Beside a Workspace One

- **Workflow:** `check-prerequisites.js` (CONFIG_DRIFT), `init.md` Step 1
- **Synthetic State:**
  - A git repository. `.design/RULES.md` (global) and `.design/docs/RULES.md` (workspace, C22) are both committed. `MAGIC_DESIGN_DIR=.design/docs`.
- **Action:** edit the global file by hand and run `check-prerequisites --json`; edit the workspace file too and run it again; restore the global file and run it a third time.
- **Expected:**
  - [ ] Global edit only → one `CONFIG_DRIFT` finding, for `.design/RULES.md`.
  - [ ] Both edited → two findings (`.design/RULES.md`, `.design/docs/RULES.md`).
  - [ ] Workspace edit only → one finding, for `.design/docs/RULES.md`.
  - [ ] Every finding is non-blocking (`ok` is unaffected); the workflow logs the advisory and proceeds without a prompt (`init.md` Step 1).
- **Guards tested:** Config Drift scope — the global and every workspace `RULES.md` (C22); advisory, never a HALT.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the workspace `RULES.md` replaced the global one in the watch list, so hand edits to the project constitution went unreported in any project that has a workspace-level rules file.

### T244 — A Demoted Spec Is Backlogged With Its Open Tasks Blocked, and a Re-Stabilized One Gets Them Back (Demoted Spec, Quarantine Release)

- **Workflow:** `task.md` (Step 8 — Demoted Spec, Quarantine Release; Plan Write-back), `run.md` (Step 2 Select)
- **Synthetic State:**
  - `payments.md` (Stable) is planned in Phase 1: `T-1A01` `Done`, `T-1A02` `Todo`, `T-1A03` `Blocked [!]` for an unrelated reason ("waiting for a vendor key"). `payments.md` is then amended to `RFC` through `spec.md`.
- **Action 1:** `/magic.task update`
- **Expected 1:**
  - [ ] `payments.md` moves to `## Backlog`; `INDEX.md` is not modified.
  - [ ] `T-1A01` keeps its `Done` entry, `Changes` and `Attempts` verbatim.
  - [ ] `T-1A02` becomes `Blocked [!]` with reason "Spec `payments.md` is `RFC`"; `T-1A03` keeps its own reason.
- **Action 2:** `payments.md` is amended and returns to `Stable`; `/magic.task update` runs again.
- **Expected 2:**
  - [ ] `payments.md` returns to the active plan under C6.
  - [ ] `T-1A02` returns to `Todo` (only the quarantine reason releases); `T-1A03` stays `Blocked [!]`.
  - [ ] Nothing else in a surviving entry changes: other statuses, `Changes` and `Attempts` stay verbatim.
  - [ ] `/magic.run` then selects `T-1A02` instead of halting in the *Stalled* branch for good.
- **Guards tested:** Demoted Spec; Quarantine Release as the way back out of a Step 8 block (`task.md` lists it beside C12, Demoted Spec and Phantom Specs as the only status transitions of a surviving entry); the Select *Stalled* branch is not a dead end.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — `task.md` handled a demoted parent (C12) but not a demoted spec itself, and nothing ever released a quarantined task, so a spec that regained `Stable` kept its tasks `Blocked` and `/magic.run` halted on them for good.

### T245 — A T4 Rule Is Queued Behind Every HALT of the Update Sync Step, Through One Rule

- **Workflow:** `spec.md` (Updating an Existing Specification — Sync: T4 Queue, Version Drift Guard, Cross-Workspace Parity, Existence Guard)
- **Synthetic State:**
  - `workspace.json` registers `engine` and `app` (active); `RULES.md` has no rate-limiting convention.
- **Action A (parity):** "Update core.md to add a rate-limit section, and remember that all endpoints must send rate-limit headers." — `core.md` exists in `engine` (v2.0.0) and in `app` (v1.5.0).
- **Expected A:**
  - [ ] Cross-Workspace Parity → **HALT** with the single-path report (T92).
  - [ ] The agent acknowledges the T4 rule: "T4 rule detected — queued pending parity resolution."
  - [ ] Nothing is written to `RULES.md` or `core.md`.
  - [ ] Once the copies are reconciled and the update re-run, the queued rule is handed to the Operational Logic of `rule.md` — not silently dropped.
- **Action B (file):** the same input, with `core.md` registered in `INDEX.md` but missing from disk.
- **Expected B:**
  - [ ] Existence Guard → **HALT**; the acknowledgment reads "… queued pending file resolution." (T76); the rule is written only after the file (and its parent) is restored or remapped.
- **Action C (drift — control):** `core.md` header v1.3.0 against registry v1.2.0.
- **Expected C:**
  - [ ] Version Drift Guard → **HALT**; the acknowledgment reads "… queued pending drift resolution." (T84); the rule is handed over after the Resolution Validation re-evaluation.
- **Guards tested:** the single T4 Queue rule covering all three HALTs, with no per-guard copy to drift apart; atomic write integrity.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the T4 Queue note sat under two guards only, so a standing rule given together with an update that hit the parity HALT had no stated fate.

### T246 — The Consistency Check Reports a Reference to a Deprecated Spec as an Advisory

- **Workflow:** `spec.md` (Consistency Check — Stale References row), Deprecation Cascade
- **Synthetic State:**
  - `legacy.md` is `Deprecated`. `api.md` (Stable) lists it under `Related Specifications`; `auth-impl.md` (L2) has `Implements: legacy.md`. Both references predate the deprecation, or the deprecation was an external edit that skipped the cascade. `billing.md` lists the `Stable` `auth.md` under `Related Specifications` (control).
- **Action:** "Verify specs".
- **Expected:**
  - [ ] `api.md` and `auth-impl.md` are reported as `STALE_REFERENCE` with `→ /magic.spec amend {file}` (for `auth-impl.md`, Layer Integrity also reports that its parent is not `Stable`).
  - [ ] The report is advisory: no HALT, no automatic edit of either file, no status change.
  - [ ] `billing.md` is not reported.
- **Guards tested:** Stale References row; parity with the Deprecation Cascade report (non-blocking); Layer Integrity requires an existing, `Stable` parent.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — T25 expected the finding, but no audit step named it; the Deprecation Cascade reports it only at the moment of deprecation.

### T247 — Retro L2 Is Fired by Plan Completion; No Engine Body Promises a Manual Command It Has No Wrapper For

- **Workflow:** `retrospective.md` (Levels), `run.md` (Plan Completion), `analyze.md` (Mode C step 2 — PHANTOM_COMMAND, Wrapper-Body Parity)
- **Synthetic State:** static text scan of `.magic/*.md` and `workflows/`.
- **Action:** read the Levels table of `retrospective.md` and search the engine bodies for a trigger the user is told they can invoke by hand.
- **Expected:**
  - [ ] The L2 trigger reads "Plan Complete (`run.md` Plan Completion)": the step that fires it is named.
  - [ ] No engine body says "manual command"; `retrospective.md` stays a wrapper-less internal module (no `workflows/magic.retrospective.md`, no `/magic.retrospective` mention), as `analyze.md` Mode C step 2 requires.
  - [ ] T197–T199 reach Retro L2 through Plan Completion, not through a command.
- **Guards tested:** no advertised trigger without a wrapper (the PHANTOM_COMMAND rule's spirit); C2 (no new command without an explicit exception).
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the Levels table promised a "manual command" for Retro L2 that no wrapper provides.

### T248 — A Stabilizing Task Runs Past the Guards That Demand a Stable Spec; Parity and Phantom Checks Still Apply

- **Workflow:** `run.md` (Logic Guards — Stabilizing exception, Step 1 Spec Stability Spot-Check and File-Header Parity, Step 4 Mid-Run Stability Check)
- **Synthetic State:**
  - `core-l1.md` (Stable); `core-l2.md` (RFC, `Implements: core-l1.md`), demoted by an amendment after its plan was written. Both file headers equal their `INDEX.md` entries.
  - Phase 1 holds one `Todo` task, `T-1A01`, targeting `core-l2.md` and carrying `stabilizes: core-l2.md` (planned by T71 Action A).
- **Action A:** `/magic.run`.
- **Expected A:**
  - [ ] Quarantine (C12), Spec Stability and the Step 1 Spot-Check do not halt `T-1A01`, though `core-l2.md` is `RFC`: the flag names that spec.
  - [ ] File-Header Parity is still evaluated, and passes.
  - [ ] `T-1A01` is selected and executed; at Step 4 the Mid-Run check takes the status at Task Start (`RFC`) as its baseline, finds it unchanged, and the task goes `Done`. The spec reaching `Stable` during the task would not halt it either.
- **Action B (control — no flag):** the same state, but `T-1A01` carries no `stabilizes:` flag.
- **Expected B:**
  - [ ] The Step 1 Spot-Check → **HALT** before execution: "Spec `core-l2.md` is no longer `Stable`. Run `/magic.task {workspace} update` to re-evaluate the plan." The exception follows the flag, not the spec.
- **Action C (control — parity):** `T-1A01` carries the flag, but the `core-l2.md` header reads `Status: Draft` while `INDEX.md` reads `RFC`.
- **Expected C:**
  - [ ] File-Header Parity → **HALT** with `STATUS_DRIFT`; the exception does not reach registry integrity.
- **Action D (control — drift mid-run):** as Action A, but an external edit sets `core-l2.md` to `Deprecated` while `T-1A01` executes.
- **Expected D:**
  - [ ] Step 4 Mid-Run check → **HALT** that track: any change since Task Start other than reaching `Stable` halts. Report: "Spec `core-l2.md` (or its parent) demoted or drifted since task began. Task output suspended — run `/magic.task {workspace} update` to re-evaluate." `T-1A01` is not set `Done`.
- **Action E (Parallel mode — the default):** as Action A, with `@role:orchestrator` dispatching tracks.
- **Expected E:**
  - [ ] The orchestrator's between-dispatch re-read of `INDEX.md` holds `core-l2.md` to its status at the dispatch of `T-1A01` (`RFC`) instead of `Stable`: the track is dispatched, with no `SPEC_DEMOTED` notification.
  - [ ] A dispatch of an unflagged task on a spec that is not `Stable` still halts its track with `SPEC_DEMOTED`.
- **Guards tested:** Stabilizing exception (C12.1) on the execution side, per task and per named spec; File-Header Parity and Phantom Spec stay in force; Mid-Run baseline for a flagged task; the orchestrator's re-read follows the same exception (Parallel is the default mode).
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the `stabilizes:` flag bypassed C12 only while planning; `run.md` then halted the flagged task on its own Quarantine, Spec Stability, Spot-Check and Mid-Run guards, and the orchestrator card's re-read did the same in Parallel mode, so a stabilizing task could be planned but never executed.

### T249 — The Guided Planning Filter Admits a Spec Named for Stabilization Whatever Its Status

- **Workflow:** `task.md` (Step 1 Autonomous Selection — Guided Planning Filter, Stabilization interaction; Step 7 Stabilizing Tasks)
- **Synthetic State:**
  - `engine` workspace: `auth-l2.md` (Stable, in Phase 1 of `PLAN.md`) and `core-l2.md` (RFC, in `## Backlog`), both registered in `INDEX.md`; `PLAN.md` exists, so Bootstrap is not eligible.
- **Action A:** `/magic.task engine "stabilize core-l2.md — fix its mismatches with the parent"`.
- **Expected A:**
  - [ ] The directive is the explicit request to stabilize `core-l2.md` (Step 7), so the filter admits that spec although it is `RFC`: no "Could not map planning directive" HALT.
  - [ ] The tasks planned for `core-l2.md` carry `stabilizes: core-l2.md`; `auth-l2.md` does not match the directive and stays untouched in its Phase 1 placement.
- **Action B (control — not a stabilization request):** `/magic.task engine "add pagination to core-l2.md"`.
- **Expected B:**
  - [ ] The directive names `core-l2.md` but does not ask to stabilize or fix it, so no status is overridden: the filter matches `Stable` specs only, finds none, and **HALT**s with "Could not map planning directive 'add pagination to core-l2.md' to any registered spec." A spec's name in a directive never admits it on its own (C13).
- **Action C (control — unregistered spec):** `/magic.task engine "stabilize ghost.md"` — `ghost.md` is in no `INDEX.md`.
- **Expected C:**
  - [ ] Admission waives the status, not registration: zero matches → the same **HALT**.
- **Guards tested:** Stabilization interaction (C12.1) of the Guided Planning Filter; the zero-match HALT stays for non-stabilization directives and unregistered specs; C13 (the flag trigger is an explicit request, never a title or a filename match).
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the filter matched `Stable` specs only, so a directive naming a non-Stable spec to stabilize hit the zero-match HALT before any flagged task could be planned.

### T250 — A `[Bootstrap]` Task Runs Past the Guards That Demand a Stable Spec; Drift and Missing Marker Still Halt

- **Workflow:** `run.md` (Logic Guards — Bootstrap exception, Quarantine C12, Spec Stability; Step 1 Spot-Check; Step 4 Mid-Run Stability Check), `roles/orchestrator.md` (Operating Protocol 5)
- **Synthetic State:**
  - Bootstrap plan, no spec `Stable`: `core-l1.md` (Draft) and `core-l2.md` (Draft, `Implements: core-l1.md`); both file headers equal their `INDEX.md` entries.
  - Phase 1 holds one `Todo` task, `T-1A01`, targeting `core-l2.md` and carrying the `[Bootstrap]` marker; its dependencies are `Done`.
- **Action A:** `/magic.run`.
- **Expected A:**
  - [ ] The Bootstrap Detection warning is emitted and execution continues (T174).
  - [ ] Quarantine (C12) and Spec Stability do not halt `T-1A01`, although its L1 parent `core-l1.md` is not `Stable`: the task is held to the status the spec and its parent had at Task Start (`Draft`).
  - [ ] At Step 4 the Mid-Run check finds both statuses unchanged and the task goes `Done`; generated artifacts carry the `[Bootstrap]` suffix.
- **Action B (control — no marker):** the same state, but `T-1A01` carries no `[Bootstrap]` marker.
- **Expected B:**
  - [ ] Quarantine (C12) → **HALT** (the parent is not `Stable`); the Step 1 Spot-Check halts it too. The exception follows the marker, not the spec's status.
- **Action C (control — drift mid-run):** as Action A, but an external edit moves `core-l1.md` from `Draft` to `RFC` while `T-1A01` executes.
- **Expected C:**
  - [ ] Mid-Run check → **HALT** that track: any change since Task Start other than reaching `Stable` halts. Report: "Spec `core-l2.md` (or its parent) demoted or drifted since task began. Task output suspended — run `/magic.task {workspace} update` to re-evaluate." `T-1A01` is not set `Done`.
- **Action D (Parallel mode — the default):** as Action A, with `@role:orchestrator` dispatching tracks.
- **Expected D:**
  - [ ] The orchestrator's between-dispatch re-read holds `core-l2.md` to its status at the dispatch of `T-1A01` (`Draft`): the track is dispatched, with no `SPEC_DEMOTED` notification.
  - [ ] A dispatch of a task without the marker on a spec that is not `Stable` still halts its track with `SPEC_DEMOTED`.
- **Guards tested:** Bootstrap exception on the execution side, per task and by marker; File-Header Parity and Phantom Spec stay in force; Mid-Run baseline; the orchestrator's re-read follows the same exception.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — the Bootstrap Exception was stated only in the Step 1 Spot-Check, so an L2 `[Bootstrap]` task was halted by the Quarantine (C12) guard (its `Draft` L1 parent is not `Stable`), and the Mid-Run check and the orchestrator's re-read demanded "still `Stable`" of a spec that never was; T174 passed because it exercised Pre-flight only.

### T251 — The Sync Step Leaves a `[Bootstrap]` Task Alone While Its Spec Is Draft

- **Workflow:** `task.md` (Step 8 — Bootstrap Tasks, C12 Quarantine, Demoted Spec)
- **Synthetic State:**
  - A Bootstrap plan exists: `core-l1.md` (Draft) and `core-l2.md` (Draft, `Implements: core-l1.md`), their Phase 1 tasks carrying the `[Bootstrap]` marker; no spec is `Stable`.
- **Action A:** `/magic.task update`.
- **Expected A:**
  - [ ] Pre-Planning Stabilization evaluates the Draft specs as usual (Trust Mode criteria).
  - [ ] Step 8 does not apply C12 Quarantine to the tasks of `core-l2.md` (its parent is `Draft`, the tasks carry the marker) and does not apply Demoted Spec: they stay `Todo` in Phase 1, nothing moves to `## Backlog`, nothing is set `Blocked [!]`.
- **Action B (control — the spec leaves Draft):** an amendment moves `core-l2.md` to `RFC`.
- **Expected B:**
  - [ ] Demoted Spec applies: `core-l2.md` moves to `## Backlog` and its tasks not already blocked become `Blocked [!]` ("Spec `core-l2.md` is `RFC`") — the exception ended when the spec left `Draft`.
- **Action C (control — no marker):** a plan that is not a Bootstrap plan (another spec is `Stable`); a `core-l2.md` task without the marker has the `Draft` parent `core-l1.md`.
- **Expected C:**
  - [ ] C12 Quarantine applies as before: Backlog, `Blocked [!]` with "L1 parent `core-l1.md` is `Draft` (C12)".
- **Guards tested:** Bootstrap Tasks in Step 8 placed before the rule it limits; C12 Quarantine and Demoted Spec unchanged for tasks without the marker; the exception ends with `Draft`.
- **Regression for:** `/magic.dev.simulate test` (2026-10-01) — Step 8 read "L1 parent is not `Stable`", which by the letter matches every L2 spec of a Bootstrap plan, so `/magic.task update` would have returned the tentative plan's L2 tasks to Backlog as blocked.

### T252 — A Simulation Finding Is Adjudicated and Fixed in the Same Run; No Approval Prompt

- **Workflow:** `magic.dev.simulate` (Core Invariant 3; §5 Adjudication, Fix Selection, Surgical Patch, Decision Record, Escalation)
- **Synthetic State:**
  - A `test`-mode run has read the engine bodies and reached §5 with three findings: (1) `run.md` halts a task the plan itself produced — a guard demands a `Stable` spec for a task whose purpose is to stabilize it; (2) a sentence whose literal text and whose specified intent resolve to the same action; (3) two §7 conventions conflict and resolving it would need a change to a core rule (§1–6).
- **Action:** the run adjudicates the three findings.
- **Expected:**
  - [ ] Finding 1: rung 2 (*Dead end*) is conclusive → **DEFECT**. The candidates (no change, the smallest wording patch, a structural rule) are ranked by the fixed criteria and exactly one wins; the exact guard phrase is searched across the engine bodies, role cards, documentation pages and specifications first; the winner is applied in the same run with its regression test, the reproducing case fails before it and passes after it, and one `[DR]` line reports it. No Yes/No prompt and no "shall I apply it?".
  - [ ] Finding 2: rung 4 (*Reading test*) — the literal reading and the intended reading predict the same action → **NOT A DEFECT**: no edit, one `[DR]` line.
  - [ ] Finding 3: the fix needs an amendment of the core constitution (§1–6) → E4: reported with its one recommended wording and not applied; it is the only question-worthy item, and it is asked as a single question.
  - [ ] The report carries the Context Bleed note, and the C14 gate runs before it when `.magic/` was edited.
- **Control — no candidate passes:** every fix candidate for finding 1 fails the harness → the defect is reported with the failing evidence and the tree is left unchanged.
- **Guards tested:** Core Invariant 3 without an approval gate (C9, C28, DA-9); the first-conclusive-rung rule; the single outcome of Fix Selection; Escalation limited to E1 and E4.
- **Regression for:** owner feedback (2026-10-01) — the workflow told the agent to show each fix for approval and apply it afterwards, so findings reached the owner as proposals and every poll was answered with the marked default.

### T253 — An Unsettled Fork Is Decided by the Consequence Forecast; Only Consent and the Intake Survey Ask (DA-10, DA-2)

- **Workflow:** `l1-decision-autonomy.md` DA-10 (C27 item 8) as `spec.md` applies it to a hard fork (C9 gate 3); the deletion consent (E1)
- **Synthetic State:**
  - One workspace `web` with Stable specs for the public site; nothing in the repository says how administration is delivered.
- **Action A (hard fork):** `/magic.spec add an admin area`.
- **Expected A:**
  - [ ] The Idea Intake Gate stays silent: who it is for (administrators of this site) and what it must do (manage what the public-site specs define) are grounded, and where the admin screens live is realization, not intent (IK-3) — so nothing reaches the intake survey.
  - [ ] A separate admin application versus a section inside the main application is a hard fork (E3) with no DA-3 tiebreaker — resolved by the forecast, never by a question.
  - [ ] Candidates: separate app (primary), section of the main app (alternative), the status quo (ask), and the hedge — the admin capabilities (who may do what) specified now, the delivery surface deferred behind a premise.
  - [ ] Worst cases across the five scenarios: either surface → re-plan (*Wrong premise*: the other one was meant); status quo → stall; hedge → multi-file revert. No Blocker anywhere → the hedge wins on the lowest worst case.
  - [ ] One `[DR]` line with the worst case and the runner-up; the spec's Constraints & Assumptions records the premise in outcome terms ("administrators work inside the main application for now"), runner-up named, one-command override.
- **Action B (consent — control):** the requester later says "remove the old notifications spec".
- **Expected B:**
  - [ ] Deleting a spec is E1: exactly one DA-5 question asks for consent — at most three options, the forecast's winner marked as the default with its one-line forecast.
- **Action C (cost scale — control):** a fork met mid-pipeline — while planning or executing, long after the idea was supplied — whose every non-question candidate has a re-plan as its worst case.
- **Expected C:**
  - [ ] The status quo (asking) does not win: a stall ranks above every reversible cost. A question wins only when every other candidate's worst case is irreversible or outward — which is what the consent entries describe.
  - [ ] Control: the same fork about intent, met at intake (Step 0.5, the requester present, nothing built) — asking costs one turn and ranks with one revert, so the intake survey opens (T210).
- **Guards tested:** DA-10 candidates (incl. the hedge), scenarios and decision order; the cost scale placing a stall between re-plan and irreversible, and the intake question beside one revert; DA-2 consent plus the intake survey; DA-5 consent format.
- **Regression for:** owner directive (2026-10-01) — six consecutive polls were each answered with the marked default, and the hard-fork and routing forks (E3, E5) still escalated as questions.

### T254 — A Workspace Route Is Forecast, Not Asked (WI-4, WI-7, C26)

- **Workflow:** `context.md` §Ambiguity Gate (WI-4) and §Workspace Fit Validation (WI-7); `spec.md` Step 0
- **Synthetic State:**
  - `workspace.json`: `engine` (default) and `docs`; `docs` owns `l1-doc-dashboard.md`, a spec about a dashboard of documentation statistics.
- **Action A (overlap, no explicit creation):** "Spec out a dashboard of documentation page views." — class 3 signal `dashboard`, overlapping the `docs` lexicon (`doc-dashboard`) by ≥30%; no explicit creation token.
- **Expected A:**
  - [ ] `ambiguous` → forecast; the probe reads `l1-doc-dashboard.md` and finds the same subject — a real overlap, not a name collision.
  - [ ] `existing:docs` wins: moving a misrouted spec later is one rename and two registry rows, while undoing a workspace removes a directory — a deletion that needs consent (E1).
  - [ ] `[DR] Routed 'documentation page views' to 'docs' — lowest worst case (DA-10); worst case if wrong: multi-file revert; runner-up: create:dashboard. (Override: …)`; the routing premise is recorded in the dispatched spec. No menu.
- **Action B (explicit creation, no name):** "Let's add a separate workspace for this."
- **Expected B:**
  - [ ] `existing:*` contradicts the explicit request — a Blocker — so `create` wins, under a name inferred from the topic being dispatched, else `workspace-3`; the name is the recorded premise, a rename its override. No question.
- **Action C (second contour):** a request with no signal class whose fit is below 0.30 against `engine` and 0.20 against `docs`.
- **Expected C:**
  - [ ] The fit warning is narrated and the WI-4 forecast re-entered over the existing workspaces: `docs` fits no better, so `engine` stays; no creation without a creation signal; the premise is recorded. No question.
- **Guards tested:** WI-4 forecast defaults (existing by default, create on an explicit request, a name-collision probe turning D2 into D1); WI-7 re-entry of the forecast; WI-5 narration instead of a menu; the DA-10 tie-break by *Expected* between existing workspaces.
- **Regression for:** owner directive (2026-10-01) — the WI-4 three-option menu, whose marked default was the answer every time.

### T255 — Thin Input Fires the Sufficiency Gate Only for the Anchors That Would Be Invented (IK-4 F3, IK-5)

- **Workflow:** `spec.md` (Step 0.5 Idea Intake Gate, Gate 2)
- **Synthetic State:**
  - An empty repository: `.design/` freshly initialized, no specs, no source tree.
- **Action A (thin input):** `/magic.spec make a CRM`.
- **Expected A:**
  - [ ] IK-2 investigation runs first and finds nothing to ground the idea on.
  - [ ] Gate 1 passes — the idea is understood (a system for keeping track of customers); no F1, no F2.
  - [ ] Gate 2 tests each anchor by writing the Draft's sentence for it: *what it must do* is grounded by convention (contacts, deals, a sales pipeline — the default any engineer would assume); *who it is for* and *where it stops* would be invented (a sales team or a support desk? contacts and deals only, or invoices and email as well?).
  - [ ] F3 fires twice: one round asks exactly those **two** questions — never a third about what is already grounded — each with the forecast's options, the least-commitment one marked recommended, and **Other: …**.
  - [ ] Storage, framework, hosting and data model are never asked (IK-3).
- **Action B (grounded control):** `/magic.spec make a CRM for our three-person sales team: contacts, deals and a pipeline board; no invoicing`.
- **Expected B:**
  - [ ] All three anchors can be quoted from the input — Gate 2 passes, the gate stays silent, and dispatch proceeds in the same turn with no narration (IK-1).
- **Guards tested:** IK-4 F3 and its grounding test; the comprehension-before-sufficiency order; one question per failed anchor (IK-5); IK-1 silence when every anchor is grounded.
- **Regression for:** owner correction (2026-10-01) — intake had no sufficiency check, so a thin idea was specified on invented users and boundaries; the owner's intake flowchart asks "is the input enough?" as a separate step after "understood?".

```
**Test Suite Finalized** - v1.9.93 (Last: T255)
```
