# Workflow Test Suite

**Version:** 1.1.0
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

| ID   | Workflow      | Scenario                  | Result |
| :--- | :---          | :---                      | :---   |
| T01  | init          | Fresh cold start           | ✅ PASS |
| T02  | init          | Partial corruption         | ❌ FAIL |
...

Total: {N} passed, {M} failed out of {T}
```

If any test fails, document the failure reason and propose a fix.

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-27 | Antigravity | Initial test suite — 16 scenarios covering 8 workflows |
| 1.1.0 | 2026-02-27 | Antigravity | Extended suite: added T17–T28 (12 scenarios) — T4 trigger, Explore Mode, amendment, parallel run, conclusion cascade, multi-phase, Level 2 retro, Selective Planning, core amendment, re-entry, consistency audit, end-to-end lifecycle. Total: 28 scenarios |
