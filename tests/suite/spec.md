# Workflow Test Suite — spec

Cases of the area `spec` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T03 — Spec Dispatch Multi-Topic

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.magicspec/` initialized with 2 existing specs: `architecture.md` (Stable), `api.md` (Draft)
  - `RULES.md` v1.2.0 with C1–C6
- **Action:** `"We need JWT auth with Redis sessions. Also, the API must use REST only. And we should use shadcn for the UI."`
- **Expected:**
  - [ ] Parse: 3 distinct topics identified
  - [ ] Map: JWT+Redis → `architecture.md`, REST → `architecture.md`, shadcn → new `ui-components.md`
  - [ ] Trust Mode (C9): No objective conflicts → mapping performed as "Notice of Intent", dispatch proceeds automatically without halt
  - [ ] New file `ui-components.md` created from `skills/magicspec/templates/spec.md`
  - [ ] INDEX.md updated with new entry
  - [ ] Post-Update Review runs on all modified files
  - [ ] Actionable Outcome shown: `[Auto-SDD] {Spec} promoted to Stable; updated registry.`
- **Guards tested:** Multi-topic dispatch, Trust Mode (C9) auto-confirm, new file creation with template, registry sync

### T04 — Spec Intra-Input Self-Contradiction

- **Workflow:** `spec.md` (Dispatching from Raw Input)
- **Synthetic State:**
  - `.magicspec/` initialized, `api.md` (Stable)
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

### T16 — Spec T4 Trigger (Auto Rule Capture)

- **Workflow:** `spec.md` (T4: Rule Extraction)
- **Synthetic State:**
  - `.magicspec/` initialized, `api.md` (Stable)
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
  - `.magicspec/` initialized, no existing specs
- **Action:** `"Let's brainstorm about authentication approaches"` → then `"OK, let's formalize the OAuth2 approach"`
- **Expected:**
  - [ ] Phase 1 (explore): agent outputs thoughts to chat or creates a temporary proposal in the agent's artifacts directory (never in `.magicspec/`)
  - [ ] No INDEX.md entry during explore (safety)
  - [ ] No status lifecycle applied during explore
  - [ ] No `.magicspec/specifications/`, `INDEX.md`, `PLAN.md`, or `TASKS.md` modifications during explore
  - [ ] Phase 2 (formalize): agent creates `.magicspec/specifications/auth.md` from template
  - [ ] INDEX.md updated with auth.md (Draft)
- **Guards tested:** Explore Mode isolation (no `.magicspec/` writes), transition to formal, template usage

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

### T25 — Spec Full Consistency Audit

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - INDEX.md: 6 specs registered
  - `.magicspec/specifications/`: 7 files (1 unregistered: `orphan.md`)
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

### T29 — Analyze Delegation Routing from spec.md

- **Workflow:** `spec.md` → `analyze.md` (Delegation)
- **Synthetic State:**
  - `.magicspec/` initialized, INDEX.md has 2 specs registered
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

### T43 — Spec Rename Retention

- **Workflow:** `spec.md` & `plan.md` (the decision) and `task.md` (its application)
- **Synthetic State:**
  - Spec `auth-draft.md` is registered and partially completed in `PLAN.md` / `TASKS.md`.
- **Action:** User requests to rename `auth-draft.md` to `authentication.md`.
- **Expected:**
  - [ ] Agent performs a global search-and-replace across the active `.magicspec/` files (INDEX, PLAN, TASKS, active phase files, Related Specifications / Implements links); `archives/` and `RETROSPECTIVE.md` are excluded (T51).
  - [ ] Running `/magicspec plan` and `/magicspec task` after the rename does NOT trigger a Phantom Spec reset.
  - [ ] Existing tasks in `TASKS.md` retain progress but point to the new spec name.
- **Guards tested:** Spec Renaming Protocol, Task Continuity.

### T49 — Spec Consistency Registry Integrity Missing File

- **Workflow:** `spec.md` (Consistency Check & Audit Report)
- **Synthetic State:**
  - `INDEX.md` references `data-model.md`.
  - `data-model.md` is deleted from disk (does not exist).
  - No unregistered spec exists (not a manual rename).
- **Action:** User says "Check specs"
- **Expected:**
  - [ ] Agent reads `INDEX.md` and identifies `data-model.md`.
  - [ ] Agent detects the file is completely missing from `.magicspec/specifications/`.
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
  - `.magicspec/archives/tasks/phase-1.md` exists and contains mentions of `old-api.md`.
- **Action:** User renames `old-api.md` to `new-api.md`.
- **Expected:**
  - [ ] Status/Renaming applied: Agent updates active files (`INDEX.md`, `PLAN.md`, `TASKS.md`, active phase files, and `Related Specs`/`Implements`).
  - [ ] Agent explicitly excludes `RETROSPECTIVE.md` and `.magicspec/archives/` from the search-and-replace sweep.
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

### T61 — Spec Registry-Filesystem Desync

- **Workflow:** `spec.md` (Updating an Existing Specification)
- **Synthetic State:**
  - `INDEX.md` lists `auth.md` (Stable).
  - `.magicspec/specifications/auth.md` is **missing** from disk.
- **Action:** User says: "Update auth spec to include JWT."
- **Expected:**
  - [ ] `check-prerequisites` returns `GHOST_REGISTRY` for the missing file, with or without a `PLAN.md` (T240).
  - [ ] **Existence Guard** triggers.
  - [ ] **HALT** — Agent does not attempt to read `auth.md`.
  - [ ] Message: "Specification `auth.md` is registered in INDEX but missing from disk. Please restore or unregister before updating."
- **Guards tested:** Existence Guard (C1, Registry Drift).

### T72 — Spec Merge Refactor (Section Re-mapping)

- **Workflow:** `spec.md` + `plan.md` (Renames in `PLAN.md`) + `task.md` (Step 6 Structural Refactor)
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

### T78 — Micro-spec Promotion Guard

- **Workflow:** `spec.md` (Update flow)
- **Synthetic State:** Spec `bug-x.md` using `micro-spec.md` template, currently 45 lines.
- **Action:** User expands logic; new content makes it 75 lines.
- **Expected:**
  - [ ] Agent detects 50+ line threshold.
  - [ ] Agent proposes converting to `spec.md` template (Standard).
  - [ ] **HALT** if agent attempts to keep 75 lines in a legacy micro-template.
- **Guards tested:** Micro-spec Promotion Guard (C16), Template Threshold (50 lines).

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
  - [ ] Agent reports one resolution path, no option menu: "Version drift on `api-core.md`: file header v1.3.0 ≠ registry v1.2.0. Run `/magicspec spec` to reconcile — it will sync `INDEX.md` to the file header version and apply the amendment rule to capture the external change."
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
  - [ ] Report: "Source of Truth Drift: `auth.md` exists in `engine` (v2.0.0) and `app` (v1.5.0). Run `/magicspec spec` in `engine` (higher version) to reconcile, then re-run the update."
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

### T106 — Analyze Dispatch Cross-Workspace Name Collision on Create

- **Workflow:** `spec.md` (§Creating — Cross-Workspace Parity)
- **Synthetic State:**
  - `workspace.json`: `engine` (default), `app`.
  - `engine/l1-auth.md` — Stable, v2.0.0.
  - `app/` INDEX.md: empty (0 specs).
- **Action:** `/magicspec analyze app first-time` → Mode A proposes `l1-auth.md` for `app/` workspace → Auto-Dispatch (C9) calls `spec.md` §Creating for `l1-auth.md`
- **Expected:**
  - [ ] spec.md §Creating Pre-flight fires Cross-Workspace Parity check
  - [ ] Detects `l1-auth.md` already exists in `engine` (v2.0.0)
  - [ ] Does **not** HALT and presents no option menu — workspace-prefix naming is auto-applied
  - [ ] Narration: `[Auto-SDD] Name collision on 'l1-auth.md' (exists in 'engine'): creating as 'l1-app-auth.md'. (Override: /magicspec spec amend to rename)`
  - [ ] `app/l1-app-auth.md` is created; `engine/l1-auth.md` is untouched
  - [ ] The layer prefix stays first, so `check-prerequisites` raises no `NAMING_VIOLATION` for the new file (T106 harness case)
- **Guards tested:** RE-E1 (Cross-Workspace Parity in spec.md §Creating)

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
  - `.magicspec/` initialized, INDEX.md has 5 specs
  - User says "Ventilate" or "Check specs deeply"
- **Action:** Agent processes ventilation intent
- **Expected:**
  - [ ] Agent routes to `analyze.md` Mode C (not a phantom C21 convention)
  - [ ] `analyze.md` is read and its workflow followed
  - [ ] No reference to undefined convention ID in agent output
- **Guards tested:** Ventilation routing without phantom convention reference

### T128 — Spec Version Drift Guard Scans Dependency Chain

- **Workflow:** `spec.md`
- **Synthetic State:**
  - Target: `docs-node.md` (L2, Implements: docs-architecture.md)
  - `docs-node.md` header matches INDEX.md (no drift)
  - `docs-architecture.md` (L1 parent): file header `Version: 2.0.0`, INDEX.md says `Version: 1.0.0`
- **Action:** `/magicspec spec` update `docs-node.md` with "add plugin hooks"
- **Expected:**
  - [ ] Version Drift Guard scans dependency chain: `docs-node.md` → `docs-architecture.md`
  - [ ] Detects VERSION_DRIFT on parent `docs-architecture.md` (file=2.0.0 ≠ INDEX=1.0.0)
  - [ ] **HALT** before writing updates to `docs-node.md` (Cognitive Guard)
  - [ ] Report names the drifted dependency (not just the target)
  - [ ] User directed to resolve parent drift first
- **Guards tested:** Version Drift Guard (dependency chain scan, Cognitive Guard), Related Specifications traversal

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

### T136 — C12 Cascade: Spec Workflow Modifies INDEX, Plan and Task Workflows Do Not

- **Workflow:** `spec.md` + `plan.md` (the decision) and `task.md` (its application) (C12 interaction)
- **Synthetic State:**
  - `docs-architecture.md` (L1, Stable) demoted to RFC via `spec.md`
  - `docs-node.md` (L2, Implements: docs-architecture.md, Stable)
  - `TASKS.md` has active tasks for `docs-node.md`
- **Test 1 — spec.md C12 cascade:**
  - **Action:** Agent completes L1 status change in `spec.md`
  - **Expected:**
    1. **Pre-flight**: `node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
    - `ok: true` → proceed.
    - Any other result → branch per `init.md` §1: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **C15 Filter** (**HALT** only if in-scope); missing `.magicspec/` → auto-run `skills/magicspec/references/init.md`, then resume; unrecognized failure → **HALT**.
    - [ ] `INDEX.md` updated: `docs-node.md` status set to `RFC`
    - [ ] File header of `docs-node.md` updated to match
    - [ ] Report: "C12 Cascade: 1 dependent quarantined: [docs-node.md]."
- **Test 2 — plan.md and task.md react to INDEX.md state:**
  - **Action:** `/magicspec plan`, then `/magicspec task`, triggered after C12 cascade
  - **Expected:**
    - [ ] `plan.md` reads `INDEX.md`, sees `docs-node.md` = RFC
    - [ ] `docs-node.md` moved to `## Backlog` in `PLAN.md` by `plan.md`
    - [ ] Tasks for `docs-node.md` marked `Blocked [!]` by `task.md` with reason: "L1 parent `docs-architecture.md` is `RFC` (C12)"
    - [ ] Neither workflow modifies `INDEX.md` for a downward status change (read-only for it)
- **Guards tested:** C12 ownership (spec.md writes INDEX; plan.md decides the Backlog placement and task.md the blocks, reading INDEX only), cascade behavioral contract

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
  - [ ] Post-Update Review surfaces findings as actionable warnings with suggested commands (`→ /magicspec spec amend` or `→ /magicspec spec deprecate`)
  - [ ] Deprecation is NOT blocked by dependent specs — non-blocking cascade
- **Guards tested:** Deprecation Cascade (Implements + Related), non-blocking report via Post-Update Review

### T153 — Spec T4 Tier Routing: Workspace Signal Detected

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - Active workspace: `docs` (resolved via Zero-Prompt).
  - `.magicspec/RULES.md`: §7 has C1–C10.
  - `.magicspec/docs/RULES.md`: exists with WC1.
- **Action:** `"Add OAuth2 to auth spec. Remember that all docs packages must use semantic versioning."`
- **Expected:**
  - [ ] T4 trigger detected: "Remember that..."
  - [ ] **Tier Routing**: "docs packages" matches workspace signal → target = `.magicspec/docs/RULES.md`
  - [ ] **Duplication Check**: scans both global C1–C10 and workspace WC1 for overlap → none found
  - [ ] Rule written to `.magicspec/docs/RULES.md` as WC2 (NOT to global RULES.md)
  - [ ] Spec update and rule write grouped in single atomic proposal
- **Guards tested:** Rule-capture Tier Routing, workspace signal detection, atomic proposal

### T154 — Spec T4 Duplication Check Catches Overlap

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - Active workspace: `engine`.
  - `.magicspec/RULES.md` §7 has C7: "Universal Script Executor — all automation via `executor.js`."
- **Action:** `"Update engine-core spec. Remember that all scripts must go through executor.js."`
- **Expected:**
  - [ ] T4 trigger detected: "Remember that..."
  - [ ] **Tier Routing**: rule is universal (no workspace signal) → target = `.magicspec/RULES.md`
  - [ ] **Duplication Check**: proposed rule semantically overlaps with existing C7
  - [ ] Trust Mode (C9) → Overlap reported as non-blocking advisory; write proceeds via merge
  - [ ] Spec update proceeds atomically with rule synchronization
- **Guards tested:** Rule-capture Duplication Check, Zero-Prompt rule sync

### T155 — Spec T4 Constitutional Guard Blocks Contradicting Rule

- **Workflow:** `spec.md` (Dispatching from Raw Input → rule capture via the Operational Logic of `rule.md`)
- **Synthetic State:**
  - `.magicspec/RULES.md` §5: "No implementation code — pseudo-code only."
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

### T176 — Cross-Workspace Manual Renamed Parent (Ref: The Phantom Cascade)

- **Workflow:** `spec.md` (Update Mode)
- **Synthetic State:**
  - `workspace.json` registers `engine` and `docs`.
  - `engine` has `l1-identity.md` (Stable) — file physically renamed to `l1-auth-core.md` (Drift).
  - `docs` has `l2-auth.md` (RFC, Implements: l1-identity.md).
- **Action:** `/magicspec spec update docs/l2-auth.md`
- **Expected:**
  - [ ] Parent Existence Guard triggers during pre-flight.
  - [ ] **HALT** — report "L2 Orphan: Parent spec engine/l1-identity.md is missing from disk."
  - [ ] Suggested resolution: sync engine/INDEX.md or restore parent.

### T185 — Spec Explore Mode Write Isolation Enforcement

- **Workflow:** `spec.md`
- **Synthetic State:**
  - `.magicspec/` initialized, 3 specs registered in INDEX.md
  - PLAN.md and TASKS.md exist with active tasks
- **Test 1 — During explore:**
  - **Action:** User says: "Let's think about adding WebSocket support"
  - **Expected:**
    - [ ] Agent provides analysis in chat or agent artifacts
    - [ ] Agent does NOT create any file in `.magicspec/specifications/`
    - [ ] Agent does NOT modify `INDEX.md`, `PLAN.md`, or `TASKS.md`
    - [ ] No status lifecycle applied
- **Test 2 — Transition trigger:**
  - **Action:** User says: "OK, create the spec"
  - **Expected:**
    - [ ] Agent transitions to Dispatch mode
    - [ ] `websocket-support.md` created from template
    - [ ] INDEX.md updated
- **Guards tested:** Explore Mode write isolation (instructional-only guard)

### T202 — Spec RE-3 Re-evaluation Scoped to Amendment Target

- **Workflow:** `spec.md` (Updating — Resolution Validation, RE-3)
- **Synthetic State:**
  - `l1-engine-core.md` (Stable, v1.5.0 in INDEX.md and file header) — amendment target.
  - `l2-role-cards.md` (Implements: l1-engine-core.md): file header `v1.4.0`, INDEX.md `v1.3.0` → VERSION_DRIFT.
  - No other workspaces.
- **Action:** `/magicspec spec amend l1-engine-core.md` → Version Drift Guard fires on `l2-role-cards.md` (in dependency chain) → HALT. User resolves by updating INDEX.md to `v1.4.0`. User selects "Yes, continue." → RE-3 re-evaluation triggered.
- **Expected:**
  - [ ] RE-3 re-evaluation scoped to amendment target (`l1-engine-core.md`): checks RE-3, Cross-Workspace Parity, Existence Guard, and C12 Quarantine for `l1-engine-core.md`'s own chain.
  - [ ] C12 Quarantine check targets `l1-engine-core.md`'s L1 parent (if any) — NOT `l2-role-cards.md` (the drift-resolved file).
  - [ ] `l2-role-cards.md` is NOT incorrectly quarantined during RE-3 re-evaluation.
  - [ ] Amendment to `l1-engine-core.md` proceeds after RE-3 passes.
  - [ ] C12 Cascade fires correctly AFTER the amendment (l1-engine-core.md → RFC → quarantine all Implements children including l2-role-cards.md).
- **Guards tested:** RE-3 scope isolation (spec.md Resolution Validation, clarified by Fix 2); C12 ordering vs. RE-3 re-evaluation.
- **Regression for:** "The Split Amendment" crisis — incorrect C12 on drift-resolved file during RE-3.

### T204 — Spec Dispatch Diagram Reflects C9 Non-Blocking (Diagram-Text Parity)

- **Workflow:** `spec.md` (Dispatching from Raw Input — workflow diagram)
- **Synthetic State:**
  - `.magicspec/engine/` initialized; raw input maps to 1 domain with no objective conflicts (no RULES.md contradiction, no circular dependency, no VERSION_DRIFT).
  - Trust Mode (C9) active.
- **Action:** User provides unstructured spec input; agent enters Dispatching from Raw Input.
- **Expected:**
  - [ ] Dispatch proceeds to write files immediately (Dispatch Notice Non-Blocking) — no approval prompt.
  - [ ] The workflow diagram decision node is an **objective-conflict** gate (`RULES / cycle / drift`), NOT a human `Approved? Yes/No` loop.
  - [ ] No `AskUserQuestion` / option menu is surfaced on the conflict-free happy path (DA-9 declarative proposal surface).
  - [ ] Conflict branch (`Yes: RULES / cycle / drift`) routes to Flag & HALT — matching the Conflict constraint in prose.
- **Guards tested:** Diagram-Text parity for C9/DA-9 zero-prompt dispatch; C24 confirmation-bias prevention (diagram cannot reintroduce an approval gate the prose forbids).
- **Regression for:** "The Silent Approval" crisis (Improv Mode 2026-06-13); stale `{Approved?}` diagram node predating DA-9 hardening.

### T237 — `spec.md` and `rule.md` Pre-flight Branch Through `init.md` §1, the Single Source

- **Workflow:** `spec.md` (Creating, Updating), `rule.md` (Operational Logic 1), `init.md` §1
- **Synthetic State (Test A — ghost entry):**
  - `check-prerequisites --json` returns `ok: false` with a `GHOST_REGISTRY` warning for an in-scope spec other than the target.
- **Action A:** `/magicspec spec` amends a different spec; then `/magicspec rule add "…"`.
- **Expected A:**
  - [ ] Both workflows branch per `init.md` §1: `GHOST_REGISTRY` → C15 Filter → in scope → **HALT** before any write.
  - [ ] No branch is left undefined because the workflow text lists fewer cases than `init.md`.
- **Synthetic State (Test B — unrecognized failure):** `{"ok": false, "unknown_error": "disk_full"}`.
- **Expected B:**
  - [ ] **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually." — the same outcome as T138, reached from `spec.md` and `rule.md`.
- **Guards tested:** single-source branching; parity of the Pre-flight failure cases across `init.md`, `spec.md`, `rule.md`, `task.md`, `run.md`, `analyze.md`.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — two workflows enumerated 3 branches while four others knew 5.

### T241 — Every Finalize Command Names the Workspace the Workflow Ran For

- **Workflow:** `spec.md`, `plan.md`, `task.md`, `run.md`, `rule.md` (Finalization Protocol), `CONSTITUTION.md` §3, `references/rules/finalization.md`, `executor.js` and `finalize.js` (workspace resolution)
- **Synthetic State (Test A — behavior):**
  - `workspace.json` registers `engine` (default) and `docs`; `MAGIC_WORKSPACE` is unset. `/magicspec plan docs` has just written the `docs` plan.
- **Action A:** the agent runs the Finalization Protocol.
- **Expected A:**
  - [ ] The command is `finalize --workflow=plan --workspace=docs`: `executor.js` consumes the flag and exports `MAGIC_DESIGN_DIR=.magicspec/docs`, so `finalize.js` judges significance against the `docs` whitelist and writes the `docs` `STATE.md`.
  - [ ] The `engine` workspace's `STATE.md` is untouched; a bare command would have finalized `engine` and reported "No significant changes" for the `docs` plan.
- **Synthetic State (Test B — static scan):** shipped text.
- **Action B:** list every `executor.js finalize` command in `skills/magicspec/workflows/*.md`, `CONSTITUTION.md` and `references/rules/*.md`.
- **Expected B:**
  - [ ] All thirteen (five bodies with two lines each, two lines of `CONSTITUTION.md`, one line of `references/rules/finalization.md`) carry `--workspace={active-workspace}`.
- **Guards tested:** Context resolution reaching the script (Core Invariant 1 of every workflow); the explicit flag outranking the default in `executor.js`; parity of the finalize command across bodies, wrappers and rules.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — no finalize command passed the flag, so after `/magicspec plan docs` (or any explicit workspace argument) the default workspace was finalized instead.

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
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the T4 Queue note sat under two guards only, so a standing rule given together with an update that hit the parity HALT had no stated fate.

### T246 — The Consistency Check Reports a Reference to a Deprecated Spec as an Advisory

- **Workflow:** `spec.md` (Consistency Check — Stale References row), Deprecation Cascade
- **Synthetic State:**
  - `legacy.md` is `Deprecated`. `api.md` (Stable) lists it under `Related Specifications`; `auth-impl.md` (L2) has `Implements: legacy.md`. Both references predate the deprecation, or the deprecation was an external edit that skipped the cascade. `billing.md` lists the `Stable` `auth.md` under `Related Specifications` (control).
- **Action:** "Verify specs".
- **Expected:**
  - [ ] `api.md` and `auth-impl.md` are reported as `STALE_REFERENCE` with `→ /magicspec spec amend {file}` (for `auth-impl.md`, Layer Integrity also reports that its parent is not `Stable`).
  - [ ] The report is advisory: no HALT, no automatic edit of either file, no status change.
  - [ ] `billing.md` is not reported.
- **Guards tested:** Stale References row; parity with the Deprecation Cascade report (non-blocking); Layer Integrity requires an existing, `Stable` parent.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — T25 expected the finding, but no audit step named it; the Deprecation Cascade reports it only at the moment of deprecation.

### T283 — `spec` Ends at Its Boundary: It Names `plan` With Its Demand and Starts Nothing

- **Workflow:** `spec.md` (Handoff, Finalization Protocol) with the router `SKILL.md` (Demand column) and `finalize.js` (the handoff line)
- **Synthetic State:** workspace `engine` has no `PLAN.md`; a request `/magicspec spec "an offline export of the report"` authored one specification, promoted to `Stable`, registry updated.
- **Action:** the agent finishes the dispatch and runs the Finalization Protocol.
- **Expected:**
  - [ ] No planning step runs in this invocation: no `PLAN.md` is written, no `/magicspec plan` or `/magicspec task` is invoked, nothing waits for an answer (PS-1, PS-7).
  - [ ] The finalize output ends with the one handoff line `Next: /magicspec plan engine — deep reasoning`: the command, the workspace and the demand of `plan` read from the router table.
  - [ ] The registry, the specification and `STATE.md` (its `Next Action`) already carry everything `plan` needs (PS-2): a new session can type the named command.
- **Control:** the request itself asks for the next stage too ("write the spec and plan it"): the following stage runs only because the request's own words asked for it; it is the exception, not the default.
- **Guards tested:** PS-1 one stage per invocation; PS-4 demand named, not enforced; PS-7 the boundary is not a pause.
- **Regression for:** none yet — new with the four stages.

### T291 — A Contradiction With an Undeclared Neighbour Blocks Promotion, and the Check Finds the Neighbour by Name

- **Workflow:** `spec.md` (Post-Update Review, Coherence check) with `roles/spec-critic.md` (step 1)
- **Synthetic State:** one workspace, a Stable specification A stating that the planning workflow is the only writer of `PLAN.md`. A new specification B (Draft) states that the task workflow writes `PLAN.md`. B's `Related Specifications` list neither A nor anything that mentions `PLAN.md`.
- **Action:** `/magicspec spec "write the task decomposition specification"` creates B and enters the Post-Update Review.
- **Expected:**
  - [ ] Before any lens, the check lists the names B introduces or uses (`PLAN.md`, the command names), searches the specification text of every registered workspace for each, and finds A although B does not list it; only the matching sections of A are read; archives and history tables are not searched.
  - [ ] The finding is a `contradiction`, quoting both sides with file and section (`{B} §{x} ↔ {A} §{y}`); a suspicion that cannot be quoted on both sides would have been dropped.
  - [ ] B is not promoted to `Stable` while the finding stands. It is resolved in this invocation by one of: amending A (version bump and history row), revising B, or — when neither text settles which statement wins — the Consequence Forecast with the premise recorded as `Assumption (forecast)` in the specification that yields. No question is asked.
  - [ ] After the resolution the check runs again, and the invocation prints `[Coherence] {N} artifacts compared — 0 findings` before the lenses continue.
- **Control:** B lists A in `Related Specifications`: the finding and the block are identical — the declaration was never the boundary.
- **Guards tested:** CH-1 scope by mechanic, not by declaration; CH-3 both sides quoted; CH-4 specification check before promotion; CH-6 the check is a step of the `spec-critic` card.
- **Regression for:** none yet — new with the coherence check.

### T292 — A Declared Supersession Is Reported as `superseded` and Does Not Block

- **Workflow:** `spec.md` (Post-Update Review, Coherence check) with `roles/spec-critic.md` (step 1) and `templates/spec.md` (§6)
- **Synthetic State:** as T291, except that B's `Implementation Notes` state that B supersedes A §{y}: the planning workflow stops being the only writer of `PLAN.md` when B is deployed, and A is amended in that delivery.
- **Action:** the Post-Update Review of B.
- **Expected:**
  - [ ] The contradiction with A is reported on its own line as `superseded`, with both sides quoted, and does not block promotion; B may reach `Stable`.
  - [ ] The result line counts it among the findings (`[Coherence] {N} artifacts compared — {k} findings`) and names the resolution as "amend A when B is deployed".
  - [ ] A second contradiction, with a specification C that B does not name in its notes, is not covered by the declaration: it blocks as in T291.
- **Control:** the notes name A but not the section: the declaration covers only what it names, so the section left out blocks.
- **Guards tested:** CH-9 declared supersession is not a contradiction; an undeclared contradiction still blocks.
- **Regression for:** none yet — new with the coherence check.

### T293 — A Duplicate Definition Becomes a Link With No Decision

- **Workflow:** `spec.md` (Post-Update Review, Coherence check) with `roles/spec-critic.md` (step 1)
- **Synthetic State:** a new specification B defines the term "stale plan" in full in its §3; a Stable specification A already defines it, equivalent in meaning, in its §2.
- **Action:** the Post-Update Review of B.
- **Expected:**
  - [ ] The finding is a `duplicate definition` quoting both definitions.
  - [ ] It is resolved by replacing one copy with a link to the other; no forecast, no premise and no precedence decision are recorded, because the fix is mechanical.
  - [ ] The result line counts the finding and the review continues to the lenses in the same invocation.
- **Control:** the two definitions differ in meaning: the finding is a `contradiction` and follows T291.
- **Guards tested:** CH-2 closed classes; CH-4 a duplicate is resolved by a link; constitution §6 (no cross-file duplication).
- **Regression for:** none yet — new with the coherence check.

### T294 — A Specification That Shares No Mechanic Costs One Search and Prints One Line

- **Workflow:** `spec.md` (Post-Update Review, Coherence check) with `roles/spec-critic.md` (step 1)
- **Synthetic State:** a new specification about a feature whose names (headings, tokens, file paths, invariant identifiers) appear in no other specification and are no neighbour of anything in the graph. Also an amendment that fixes a typo in a Stable specification (patch bump).
- **Action:** the Post-Update Review of each.
- **Expected:**
  - [ ] For the new specification, the search finds nothing, and the only output of the check is `[Coherence] 0 artifacts compared — 0 findings`; no per-finding line is printed and no other specification is read.
  - [ ] For the typo fix, the check prints the same first line with zero artifacts and ends: a patch-level change introduces no mechanic.
  - [ ] The review goes on to the lenses and the Instruction Quality Pass without delay or a question.
- **Control:** the new specification names a command that another specification defines: the set is no longer empty and the check reads that section.
- **Guards tested:** CH-7 one result line, zero findings only the first line; cost bounded by CH-1's stop rule.
- **Regression for:** none yet — new with the coherence check.

### T325 — An Interface Specification With No Design Context Says Where Its Choices Come From

- **Workflow:** `spec.md` (Creation, Interface) with `roles/ui-ux-designer.md` and `templates/spec.md`, `templates/design-system.md`
- **Synthetic State:** a new product with a web interface; no design-system specification, no brand material, no existing interface.
- **Action:** `/magicspec spec "an order tracking page"`.
- **Expected:**
  - [ ] The specification's interface section says that none of the three exists and states where its choices come from; a design-system specification is created from the template, and the page specification references it and defines no token.
  - [ ] Every view states its normal state and the empty, loading, error, partial, disabled and long-content states that apply, and the accessibility requirements as verifiable statements.
- **Control:** a product with a design-system specification cites it first and the section adds no token.
- **Guards tested:** UI-1; UI-2; UI-3; UI-4.
- **Regression for:** none yet — new with the interface design.
