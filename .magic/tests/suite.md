# Workflow Test Suite

**Version:** 1.8.0
**Purpose:** Regression testing for Magic SDD engine workflows.
**Trigger:** `/magic.simulate test`

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
| :--- | :--- | :--- | :--- |
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
  - [ ] Post-init verification checks all 5 artifacts: `INDEX.md`, `RULES.md`, `specifications/`, `tasks/`, `archives/tasks/`
  - [ ] Brief report: "SDD initialized — {date}"
  - [ ] Calling workflow continues after init
- **Guards tested:** Engine Integrity check, post-init verification (5 artifacts)

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
  - [ ] Post-init verification confirms all 5 artifacts present
- **Guards tested:** Safe to Re-Run (idempotency), full verification

### T03 — Spec Dispatch Multi-Topic

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.design/` initialized with 2 existing specs: `architecture.md` (Stable), `api.md` (Draft)
  - `RULES.md` v1.2.0 with C1–C6
- **Input:** `"We need JWT auth with Redis sessions. Also, the API must use REST only. And we should use shadcn for the UI."`
- **Expected:**
  - [ ] Parse: 3 distinct topics identified
  - [ ] Map: JWT+Redis → `architecture.md`, REST → `architecture.md`, shadcn → new `ui-components.md`
  - [ ] Confirm: mapping shown to user before writing
  - [ ] New file `ui-components.md` created from `.magic/templates/specification.md`
  - [ ] INDEX.md updated with new entry
  - [ ] Post-Update Review runs on all modified files
- **Guards tested:** Multi-topic dispatch, new file creation with template, registry sync

### T04 — Spec Intra-Input Self-Contradiction

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.design/` initialized, `api.md` (Stable)
- **Input:** `"All APIs must use GraphQL. Also, REST is mandatory for mobile. And we plan to remove REST entirely in 2 months."`
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
  - [ ] Execution mode asked (since not in RULES.md §7)
  - [ ] Mode saved to RULES.md §7 on user answer
  - [ ] PLAN.md created from `.magic/templates/plan.md`
  - [ ] TASKS.md + phase-1.md created from `.magic/templates/tasks.md`
- **Guards tested:** Dependency ordering, layer respect, template usage, mode persistence

### T07 — Task Circular Dependency

- **Workflow:** `task.md` (Generating Tasks & Plan)
- **Synthetic State:**
  - `auth.md` (Stable, Related: api.md)
  - `api.md` (Stable, Related: auth.md)
  - Circular dependency: auth → api → auth
- **Expected:**
  - [ ] Dependency graph construction detects cycle
  - [ ] **HALT** — cycle flagged to user
  - [ ] Proposal: break cycle by removing one Related Specifications link or splitting spec
  - [ ] No PLAN.md written until cycle resolved
- **Guards tested:** Circular Dependency Guard

### T08 — Task Phantom Specs with Done Tasks

- **Workflow:** `task.md` (Updating Tasks & Plan)
- **Synthetic State:**
  - INDEX.md: `auth.md` (Stable), `api.md` (Stable)
  - PLAN.md references `auth.md`, `api.md`, and `secrets.md` (phantom — not in INDEX.md)
  - TASKS.md: T-1A01 (secrets.md, Done), T-1A02 (secrets.md, In Progress), T-1B01 (auth.md, Todo)
- **Expected:**
  - [ ] `secrets.md` flagged as Phantom Spec
  - [ ] T-1A01 (Done) → preserved as Archived Orphan (history intact)
  - [ ] T-1A02 (In Progress) → marked Cancelled
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
  - [ ] **HALT** — agent does NOT assume Sequential or Parallel
  - [ ] Message: "Execution mode is not defined. Please run `magic.task` first."
  - [ ] No task execution begins
- **Guards tested:** Mode Guard (HALT on missing mode)

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
- **Input:** `"Add rule: dates must follow ISO 8601."`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] RULES.md read in full
  - [ ] **Duplication Guard**: semantic overlap with C5 detected
  - [ ] Agent shows existing C5 and asks: "This overlaps with C5. Merge, replace, or add separately?"
  - [ ] No write occurs until user decides
- **Guards tested:** Duplication Guard

### T13 — Rule Remove with Workflow Dependency

- **Workflow:** `rule.md` (Removing a Convention)
- **Synthetic State:**
  - RULES.md §7 C3: "Parallel Task Execution Mode"
  - `run.md` references C3 via Mode Guard
- **Input:** `"Remove rule C3"`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] Target identified: C3 — Parallel Task Execution Mode
  - [ ] Removal proposed with major version bump
  - [ ] **Workflow Dependency Check**: C3 is referenced by `run.md` as Mode Guard
  - [ ] Warning: "This rule is used by run.md as Mode Guard. Removing it may break that workflow's logic."
  - [ ] Impact Analysis includes TASKS.md version staleness note
- **Guards tested:** Workflow Dependency Check, Impact Analysis

### T14 — Onboard Production Collision

- **Workflow:** `onboard.md`
- **Synthetic State:**
  - `.design/` exists with 5 production specs (auth.md, api.md, etc.)
  - PLAN.md contains 3 phases of production tasks
  - TASKS.md with active tasks
- **Action:** User says: "Start onboarding"
- **Expected:**
  - [ ] Pre-flight: `.design/` exists, specs count = 5 > 0
  - [ ] **HALT** — production collision detected
  - [ ] Options presented: (A) Backup PLAN.md + TASKS.md first, (B) Cancel
  - [ ] Agent does NOT proceed without explicit user choice
  - [ ] If (A): PLAN.md → PLAN.md.bak, TASKS.md → TASKS.md.bak before tutorial
- **Guards tested:** Production collision HALT, backup/cancel guard

### T15 — Retrospective Level 1 Auto-Snapshot (RETRO Missing)

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
  - [ ] Phase file archived to `archives/tasks/`
- **Guards tested:** Template creation on missing file, signal calculation, archival

### T16 — Simulate Checksums Mismatch HALT

- **Workflow:** `simulate.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `.magic/.checksums` exists
  - `spec.md` hash does not match stored checksum (file was modified without regeneration)
- **Action:** `/magic.simulate spec`
- **Expected:**
  - [ ] check-prerequisites reports `checksums_mismatch` for `spec.md`
  - [ ] **HALT** — do NOT proceed with simulation
  - [ ] Report mismatched files to user
  - [ ] Options: confirm changes were intentional OR regenerate checksums
  - [ ] Simulation resumes only after user response
- **Guards tested:** Checksums mismatch HALT (Step 0)

### T17 — Spec T4 Trigger (Auto Rule Capture)

- **Workflow:** `spec.md` (T4: Rule Extraction)
- **Synthetic State:**
  - `.design/` initialized, `api.md` (Stable)
  - RULES.md §7: C1–C6, no API convention
- **Input:** `"From now on, all APIs must use gRPC. Add this to the API spec."`
- **Expected:**
  - [ ] T4 trigger detected: "from now on" is a standing-rule signal
  - [ ] Agent writes spec changes AND proposes new §7 convention
  - [ ] Convention proposed: `C7 — gRPC-Only API Standard`
  - [ ] User asked to approve the rule before writing to RULES.md
  - [ ] If approved: RULES.md §7 updated, version bumped
  - [ ] `api.md` updated with gRPC requirement
- **Guards tested:** T4 standing-rule detection, dual write (spec + rule)

### T18 — Spec Explore Mode to Formal Spec

- **Workflow:** `spec.md` (Explore Mode → Formal Spec)
- **Synthetic State:**
  - `.design/` initialized, no existing specs
- **Input:** `"Let's brainstorm about authentication approaches"` → then `"OK, let's formalize the OAuth2 approach"`
- **Expected:**
  - [ ] Phase 1 (explore): agent creates `.design/proposals/auth-exploration.md`
  - [ ] No INDEX.md entry during explore (safety)
  - [ ] No status lifecycle applied during explore
  - [ ] Phase 2 (formalize): agent creates `.design/specifications/auth.md` from template
  - [ ] INDEX.md updated with auth.md (Draft)
  - [ ] Proposal file remains as historical record
- **Guards tested:** Explore Mode isolation, transition to formal, template usage

### T19 — Spec Update Stable → RFC (Amendment Rule)

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth.md` (Stable, v2.0.0) with existing implementation tasks
  - User wants to add a major new section (2FA support)
- **Input:** `"Add two-factor authentication support to auth spec"`
- **Expected:**
  - [ ] Change scope assessed: new section → minor bump (v2.1.0)
  - [ ] Status reverts: Stable → RFC (amendment rule triggered)
  - [ ] INDEX.md updated: status = RFC, version = 2.1.0
  - [ ] Document History row appended
  - [ ] Post-Update Review runs
  - [ ] RULES.md triggers evaluated
- **Guards tested:** Amendment rule (Stable→RFC on substantive change), version bump

### T20 — Run Parallel Mode (2 Tracks, Shared Conflict)

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

### T21 — Run Full Plan Complete (Conclusion Cascade)

- **Workflow:** `run.md` + `retrospective.md` (Plan Completion)
- **Synthetic State:**
  - TASKS.md: Phase 1 Done (archived), Phase 2 Done (last phase)
  - All specs implemented, all tasks Done
  - RULES.md §7 C3: Sequential mode
- **Expected:**
  - [ ] Phase 2 completion detected → Level 1 retro auto-snapshot
  - [ ] **Full plan completion** detected → Level 2 retrospective triggered
  - [ ] Level 2 retro: structured analysis with metrics across all phases
  - [ ] Changelog Level 2 compiled (requires user approval before writing)
  - [ ] CONTEXT.md regenerated
  - [ ] TASKS.md summary updated
- **Guards tested:** Plan completion detection, Level 2 retro trigger, changelog approval gate

### T22 — Run Phase 1→2 Transition

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

### T23 — Retrospective Level 2 Full Analysis

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
  - [ ] User asked: "Generate external changelog?" (Level 2 approval gate)
- **Guards tested:** Multi-phase analysis, trend detection, approval gate for Level 2 changelog

### T24 — Task Selective Planning (C6) with Mixed Statuses

- **Workflow:** `task.md` (Updating Tasks & Plan)
- **Synthetic State:**
  - INDEX.md: 10 specs total — 3 Draft, 4 RFC, 3 Stable
  - No existing PLAN.md
  - RULES.md §7: C6 active
- **Expected:**
  - [ ] 3 Draft specs → automatically moved to `## Backlog` in PLAN.md
  - [ ] 4 RFC specs → surfaced to user with recommendation to backlog
  - [ ] 3 Stable specs → agent asks which to pull into active plan
  - [ ] User chooses 2 of 3 Stable → Phase 1 with 2 specs
  - [ ] Remaining 1 Stable → Backlog
  - [ ] All Draft and RFC in Backlog, not in active phases
  - [ ] No Draft/RFC spec enters active phases without explicit pull
- **Guards tested:** Selective Planning (C6), mixed status handling, user choice

### T25 — Rule Amend Core Section (§1–6)

- **Workflow:** `rule.md` (Amending a Convention)
- **Synthetic State:**
  - RULES.md: §2 Status Rules contain `RFC → Stable: reviewed, approved, no open questions.`
- **Input:** `"Change rule: RFC specs can go Stable with one approval instead of full review"`
- **Expected:**
  - [ ] Agent identifies target: §2 (core section, not §7)
  - [ ] Convention-not-found in §7 handler triggers
  - [ ] Agent informs: "This is a core section (§2). Amending requires explicit approval."
  - [ ] Constitutional implications surfaced: relaxing quality gate
  - [ ] User must explicitly confirm core amendment
  - [ ] If approved: §2 updated, RULES.md major version bump
- **Guards tested:** Convention-not-found handler, core section amendment gate

### T26 — Onboard Abandoned Re-entry with Production Data

- **Workflow:** `onboard.md` (Re-entry)
- **Synthetic State:**
  - `.design/specifications/logger-module.md` exists (from previous abandoned tutorial)
  - `PLAN.md` contains 3 phases of PRODUCTION tasks (not tutorial)
  - `TASKS.md` with 12 active production tasks
  - INDEX.md has both `logger-module.md` and 5 production specs
- **Action:** User says: "Start onboarding"
- **Expected:**
  - [ ] Re-entry detected: `logger-module.md` found
  - [ ] Agent offers: resume or clean up
  - [ ] Before resuming: PLAN.md checked → contains non-tutorial data (>1 spec in phases)
  - [ ] **Production collision guard** triggered (backup/cancel)
  - [ ] Agent does NOT resume and overwrite production PLAN.md
  - [ ] Options: (A) Backup, (B) Cancel, (C) Clean up tutorial artifacts and keep production
- **Guards tested:** Re-entry + production collision guard, data preservation

### T27 — Spec Full Consistency Audit

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - INDEX.md: 6 specs registered
  - `.design/specifications/`: 7 files (1 unregistered: `orphan.md`)
  - `api.md` lists `Related: legacy.md` but `legacy.md` status = Deprecated
  - `auth-impl.md` (L2) has `Implements: auth.md`, but `auth.md` is Draft (not Stable)
  - `ui.md` version in file = 2.1.0, version in INDEX.md = 1.5.0
- **Expected:**
  - [ ] Orphaned file detected: `orphan.md` in filesystem but not in INDEX.md
  - [ ] Stale reference: `api.md` → `legacy.md` (Deprecated) flagged
  - [ ] Layer violation: `auth-impl.md` (L2) references non-Stable L1 parent
  - [ ] Version mismatch: `ui.md` file vs INDEX.md discrepancy flagged
  - [ ] Consistency Report generated with all 4 issues
  - [ ] No automatic fixes — all surfaced for user decision
- **Guards tested:** Orphan detection, stale refs, layer integrity, version sync

### T28 — End-to-End Lifecycle (Cross-Workflow Chain)

- **Workflow:** `init.md` → `spec.md` → `task.md` → `run.md` → `retrospective.md`
- **Synthetic State:**
  - Clean project, no `.design/` directory
- **Action:** User says: "I want to build a REST API for user management"
- **Expected:**
  - [ ] **init**: `.design/` created, INDEX.md + RULES.md initialized
  - [ ] **spec**: `user-management-api.md` created from template, registered in INDEX.md (Draft)
  - [ ] **spec update**: Status promoted Draft → RFC → Stable (with user confirmations)
  - [ ] **task**: Dependency graph built (1 spec), PLAN.md created (1 phase), TASKS.md created
  - [ ] **task**: Execution mode asked and saved to RULES.md §7
  - [ ] **run**: Mode Guard passes, tasks executed sequentially
  - [ ] **run**: Phase completed, Level 1 retro fires
  - [ ] **run**: Plan completed, Level 2 retro fires
  - [ ] **retrospective**: RETROSPECTIVE.md created, snapshot + session appended
  - [ ] All files consistent: INDEX.md, PLAN.md, TASKS.md, RULES.md in sync
  - [ ] No orphaned specs, no stale references, no version mismatches
- **Guards tested:** Full chain integrity, all workflow handoffs, all guards in sequence

### T29 — Analyze First-Time on Existing Project

- **Workflow:** `analyze.md` (First-Time Analysis, delegated from `spec.md`)
- **Synthetic State:**
  - `.design/` initialized (INDEX.md exists, empty — 0 specs registered)
  - Project has: `package.json` (Next.js), `src/` with `components/`, `pages/`, `api/`, `lib/`
  - `.eslintrc.json`, `tsconfig.json`, `tailwind.config.js` exist
  - ~80 source files total
- **Action:** User says: "Analyze this project"
- **Expected:**
  - [ ] `spec.md` Explore Mode triggered → delegation rule fires → `analyze.md` read
  - [ ] INDEX.md empty → First-Time Analysis mode selected (not Re-Analysis)
  - [ ] Step 1: Structure scan identifies `src/components/`, `src/pages/`, `src/api/`, `src/lib/`
  - [ ] Step 2: Stack detected — Next.js + TypeScript + Tailwind
  - [ ] Step 3: Architecture inferred — Frontend SPA (pages/ + components/) with API routes
  - [ ] Step 4: Conventions detected from `.eslintrc.json`, `tsconfig.json`
  - [ ] Step 5: Proposal generated to **agent artifacts** (NOT `.design/`)
  - [ ] Proposal contains: ≥3 proposed L1 specs, ≥3 proposed L2 specs, ≥1 RULES.md §7 convention
  - [ ] Step 6: User prompted with options (Approve all / Select / Adjust / Cancel)
  - [ ] No `.design/specifications/` files created until approval
- **Guards tested:** Delegation routing, First-Time detection, read-only scan, Explore Mode safety (no live writes)

### T30 — Analyze Re-Analysis Gap Detection

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
  - [ ] User prompted before any live modifications
- **Guards tested:** Re-Analysis mode detection, delta comparison, drift detection, uncovered module detection

### T31 — Analyze Delegation Routing from spec.md

- **Workflow:** `spec.md` → `analyze.md` (Delegation)
- **Synthetic State:**
  - `.design/` initialized, INDEX.md has 2 specs registered
  - Project has existing code
- **Test A — Analysis trigger:**
  - **Input:** `"Scan the project for uncovered modules"`
  - **Expected:**
    - [ ] `spec.md` Explore Mode entered
    - [ ] Delegation rule matches: "Scan ... modules" → `analyze.md`
    - [ ] `analyze.md` read and Re-Analysis flow executed
- **Test B — Generic brainstorm (no delegation):**
  - **Input:** `"Let's brainstorm about caching strategies"`
  - **Expected:**
    - [ ] `spec.md` Explore Mode entered
    - [ ] Delegation rule does NOT match (no project analysis intent)
    - [ ] Standard Explore Mode proceeds (thinking partner, no live writes)
- **Guards tested:** Delegation trigger accuracy, non-matching triggers stay in Explore Mode

### T32 — Init Existing Codebase Hint

- **Workflow:** `init.md` (Existing Codebase Hint)
- **Test A — Project with code:**
  - **Synthetic State:**
    - `.design/` does NOT exist
    - Project root has: `package.json`, `src/`, `README.md`, 20+ source files
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.design/` created with all 5 artifacts
    - [ ] Post-init: codebase indicators scanned — `package.json` found
    - [ ] Hint appended: `💡 Existing codebase detected. To generate initial specifications from your code, say: "Analyze project"`
    - [ ] Calling workflow continues after hint
- **Test B — Empty project (no code):**
  - **Synthetic State:**
    - `.design/` does NOT exist
    - Project root has only `.magic/` (freshly installed magic-spec, no user code)
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.design/` created with all 5 artifacts
    - [ ] Post-init: no codebase indicators found
    - [ ] **No hint** — analysis not suggested for empty projects
    - [ ] Calling workflow continues
- **Guards tested:** Codebase detection heuristic, hint presence/absence

### T33 — Analyze Depth Control for Large Projects

- **Workflow:** `analyze.md` (Depth Control)
- **Test A — Small project (<50 files):**
  - **Synthetic State:**
    - 30 source files, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Full scan starts automatically — no prompt
- **Test B — Medium project (50–500 files):**
  - **Synthetic State:**
    - 200 source files, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Agent offers: Full scan or Focused scan
    - [ ] Proceeds only after user choice
- **Test C — Large project (>500 files):**
  - **Synthetic State:**
    - 1200 source files across 80 directories, `.design/INDEX.md` empty
  - **Expected:**
    - [ ] Agent recommends Focused or Quick scan
    - [ ] Full scan offered as option but not default
    - [ ] Agent does NOT auto-start full scan on large projects
- **Guards tested:** Depth Control thresholds (<50, 50–500, >500), auto-scan vs prompt

### T34 — Simulate Missing Test Suite (Improv Mode Fallback)

- **Workflow:** `simulate.md` (Improv Mode)
- **Synthetic State:**
  - `.magic/tests/suite.md` file is missing or inaccessible.
- **Action 1:** User runs `/magic.simulate test`
- **Expected 1:**
  - [ ] Agent checks for `.magic/tests/suite.md` and fails to find it.
  - [ ] Agent alerts user that test suite is missing and falls back to **Improv Mode**.
  - [ ] Agent synthesizes a complex "Crisis Scenario" (e.g., INDEX.md desync).
  - [ ] Agent runs an end-to-end simulated lifecycle (Spec → Task → Run → Retro).
  - [ ] Agent outputs a Friction Audit report with identified "Rough Edges".
- **Action 2:** User runs `/magic.simulate` (without target), user requests generic "live simulation"
- **Expected 2:**
  - [ ] Agent defaults to **Improv Mode**.
  - [ ] Executes the same synthesis and lifecycle end-to-end as Expected 1.
- **Guards tested:** Fallback trigger on missing tests, Improv Mode end-to-end execution, ambiguity handling

### T35 — Run Sequence Syncs to PLAN.md

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

### T36 — Run Task Blocked Handoff to spec.md

- **Workflow:** `run.md` (Executing Tasks)
- **Synthetic State:**
  - `TASKS.md` Phase 2 has 1 active task mapped to `auth.md`.
  - Task execution encounters ambiguous or missing details in the specification.
- **Action:** User executes `/magic.run`
- **Expected:**
  - [ ] Agent records `Blocked` status and the specific reason in `TASKS.md` Notes.
  - [ ] Agent utilizes the newly added `magic.spec` handoff in `.agent/workflows/magic.run.md`.
  - [ ] Agent delegates resolution to `magic.spec` workflow (Explore/Update Mode).
  - [ ] Once the specification is formally updated and unblocked, agent proceeds to `magic.task` to rebuild task dependencies.
- **Guards tested:** Cross-workflow handoff routing, blocked task escalation.

### T37 — Simulate Regression Sweep Post-Fix

- **Workflow:** `simulate.md` (Verification Step)
- **Synthetic State:**
  - Logic flaw found in a workflow definition (e.g. `init.md`).
  - Surgical fix applied.
  - Test case appended to `suite.md`.
- **Action:** User explicitly approves the "Corrective Proposal" changes.
- **Expected:**
  - [ ] Agent performs a spot-check of the modified lines in `init.md`.
  - [ ] Agent explicitly utilizes the *Run regression tests* handoff from `.agent/workflows/magic.simulate.md` or directly triggers the `/magic.simulate test` suite.
  - [ ] Full regression suite is executed sequentially to ensure core `init.md` modifications did not break adjacent workflows.
- **Guards tested:** Post-fix regression sweep enforcement.

### T38 — Workspace Context Resolution (Zero-Prompt)

- **Workflow:** Any (`task.md` used as example)
- **Synthetic State:**
  - `.design/workspace.json` exists with `{"default": "engine", "workspaces": {"engine": {}, "installers": {}}}`
  - No prompt provided by user about workspaces.
- **Action 1:** Workflow triggered with no environment variables or CLI flags.
- **Expected 1:**
  - [ ] Agent reads `.design/workspace.json`.
  - [ ] Agent silently identifies `default` = `engine`.
  - [ ] Agent uses `.design/engine/` for all file operations (reading `INDEX.md`, `RULES.md`, etc.).
  - [ ] User is NOT prompted to select a workspace.
- **Action 2:** Workflow triggered with `MAGIC_WORKSPACE=installers`
- **Expected 2:**
  - [ ] Agent silently uses `.design/installers/` (overriding default).
- **Action 3:** `.design/workspace.json` is deleted. Workflow triggered.
- **Expected 3:**
  - [ ] Fallback kicks in silently.
  - [ ] Agent uses root `.design/` for all operations.
- **Guards tested:** Context Resolution Priority, Zero-Prompt Enforcement, Graceful Fallback.

### T39 — Retrospective Path and Template Resilience

- **Workflow:** `retrospective.md`
- **Synthetic State:**
  - Workspace `installers` is active (`MAGIC_DESIGN_DIR=.design/installers/`).
  - `.design/installers/` initialized and Phase 1 just completed.
  - `RETROSPECTIVE.md` does NOT exist in `.design/installers/`.
- **Action:** Retrospective Level 1 triggered
- **Expected:**
  - [ ] Agent creates `/installers/RETROSPECTIVE.md` from `.magic/templates/retrospective.md` exactly as is without removing the "Session" sections.
  - [ ] Agent appends a row to the Snapshots table.
  - [ ] Agent archives the phase file purely relatively: `tasks/phase-1.md` → `archives/tasks/`
  - [ ] Agent does NOT write anything to `.design/` root.
- **Guards tested:** Workspace path adherence, Level 1 template fidelity.

### T40 — Analyze Auto-Init Guard and Markdown List Integrity

- **Workflow:** `analyze.md`
- **Synthetic State:** Fresh repository without `.design/` directory.
- **Action:** User prompts *"Analyze my codebase"* (triggers analyze).
- **Expected:**
  - [ ] Agent intercepts execution and triggers `.magic/init.md` pre-flight before scanning.
  - [ ] Agent processes all 7 Re-Analysis steps linearly without sequence restart.
- **Guards tested:** Auto-Init Delegation, Markdown List Continuity.

### T41 — Run Phase Completion with Cancelled Tasks Guard

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

### T42 — Simulate Improv Mode Zero-Prompt Fallback

- **Workflow:** `simulate.md` (Wrapper & Engine)
- **Synthetic State:** Fresh design session, all files present.
- **Action:** User prompts `"/magic.simulate"` without arguments.
- **Expected:**
  - [ ] Agent reads `.agent/workflows/magic.simulate.md`.
  - [ ] Agent does NOT ask the user to "pick a workflow".
  - [ ] Agent explicitly engages Step 1.5 "Improv Mode (Live Simulation)".
  - [ ] Agent invents a crisis scenario and proceeds autonomously.
- **Guards tested:** Zero-prompt fallback rule, prompt ambiguity block.

### T43 — Rule Batch Operations and ID Assignment

- **Workflow:** `rule.md`
- **Synthetic State:**
  - `RULES.md` §7 currently has rules up to C3.
- **Action:** User prompts *"Amend C2 to say X, and add two new rules: Y and Z"*.
- **Expected:**
  - [ ] Agent groups the amendment and two additions into a SINGLE proposal block.
  - [ ] Agent asks for a single "Apply all?" confirmation.
  - [ ] New rules are accurately assigned sequential IDs by calculating highest existing (`C4` and `C5`).
  - [ ] Agent performs a single final version bump.
- **Guards tested:** Batch operations spam prevention, Dynamic ID assignment.

### T44 — Onboard Cleanup Protocol Identity

- **Workflow:** `onboard.md`
- **Synthetic State:**
  - Abandoned tutorial session. `.design/specifications/logger-module.md` exists.
  - User added their own `PRODUCTION-SPEC.md` to INDEX and PLAN.
- **Action:** User prompts `"/magic.onboard"`, agent attempts Re-entry wipe protocol.
- **Expected:**
  - [ ] Agent detects `PLAN.md` contains non-tutorial production data.
  - [ ] Agent triggers HALT and applies backup/cancel guard.
  - [ ] Agent does not wipe `.design/` blindly.
- **Guards tested:** Safe Cleanup Protocol, Wipe Identity Guard.

### T45 — Run Version Bleed Guard

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

### T46 — Spec Rename Retention

- **Workflow:** `spec.md` & `task.md`
- **Synthetic State:**
  - Spec `auth-draft.md` is registered and partially completed in `PLAN.md` / `TASKS.md`.
- **Action:** User requests to rename `auth-draft.md` to `authentication.md`.
- **Expected:**
  - [ ] Agent performs a global search-and-replace across all `.design/` files.
  - [ ] Running `magic.task` after rename does NOT trigger a Phantom Spec reset.
  - [ ] Existing tasks in `TASKS.md` retain progress but point to the new spec name.
- **Guards tested:** Spec Renaming Protocol, Task Continuity.

### T54 — Spec Rename History Immutability

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

### T57 — Parallel Mode Shared-Constraint Detection (Deep Scan)

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

### T47 — Stability Downgrade Tracking

- **Workflow:** `task.md`
- **Synthetic State:**
  - Spec `api.md` was `Stable` and has active tasks (`Done` and `Pending`).
  - The spec receives heavy modifications and is downgraded to `RFC`.
- **Action:** User runs `/magic.task` to update the plan.
- **Expected:**
  - [ ] Agent moves `api.md` to Backlog in `PLAN.md`.
  - [ ] Agent does NOT delete active tasks.
  - [ ] Pending tasks are marked `Blocked [!]` with "Awaiting spec stabilization".

### T48 — Automation Handoff Validation (Init)

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

### T49 — Analysis Depth Control (Prioritization)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Project contains > 600 files.
  - No existing specs.
- **Action:** User runs command to analyze project.
- **Expected:**
  - [ ] Agent executes Step 0 (Size Assessment) *before* Step 1.
  - [ ] Agent detects `> 500 files` using an optimal scanning command (`list_dir`, `find`, or OS equiv).
  - [ ] Agent halts and asks the user for scanning scope (Full, Focused, or Quick).
  - [ ] Agent does not proceed to deep scan until scope is clarified.
- **Guards tested:** Depth Control (Scan Protection).

### T50 — Manual Rename Rescue (Improv Mode)

- **Workflow:** `spec.md`
- **Synthetic State:**
  - `INDEX.md` references `core-api.md`.
  - `core-api.md` is missing from the disk.
  - `core-auth.md` exists on disk but is not registered.
  - Both files share 90% content similarity (same title and structure).
- **Action:** User runs command to sync specs or update the active plan.
- **Expected:**
  - [ ] Agent detects the missing spec and the unregistered spec.
  - [ ] Agent compares the content/title of the two specs.
  - [ ] Agent determines it is a **Manual Rename** (>80% similarity).
  - [ ] Agent successfully cascades the rename in `INDEX.md`, `PLAN.md`, and `TASKS.md` via the Spec Renaming Protocol without deleting tasks.
- **Guards tested:** Manual Rename Rescue (AOP), Spec Renaming Protocol.

### T51 — Analyze Smart Sync (AOP)

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

### T52 — Spec Consistency Registry Integrity Missing File

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

### T53 — Spec Deprecation Cascade with Implements Hierarchy

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

### T54 — Spec Rename History Immutability

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

### T55 — Spec Quarantine Cascade Enforcement (C12)

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `auth-concept.md` (Stable L1)
  - `auth-impl.md` (Stable L2, Implements: auth-concept.md)
- **Action:** User says "Downgrade auth-concept.md to RFC"
- **Expected:**
  - [ ] Status change: `auth-concept.md` → RFC
  - [ ] Agent scans for dependencies and identifies `auth-impl.md` is a dependent L2 child.
  - [ ] **Quarantine Cascade**: Agent flags `auth-impl.md` during Post-Update Review.
  - [ ] Agent alerts user: "L1 parent `auth-concept.md` is no longer Stable. `auth-impl.md` (L2) should also be demoted or quarantined."
- **Guards tested:** Quarantine Cascade (C12) surfacing, Layer Integrity.

### T56 — Task Quarantine Cascade (C12)

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
  - [ ] Task T-1A01 in `TASKS.md` is marked `Blocked [!]` with note: "Awaiting spec stabilization".
  - [ ] User is notified of the quarantine.
- **Guards tested:** Quarantine Cascade (C12) execution, Downgrade Policy.
