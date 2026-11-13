# Workflow Test Suite — init

Cases of the area `init` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T01 — Fresh Init Cold Start

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.magicspec/` does not exist
  - `skills/magicspec/.checksums` is valid
  - No git repository (optional)
- **Action:** Calling workflow triggers init via `check-prerequisites → ok: false`
- **Expected:**
  - [ ] `node skills/magicspec/scripts/executor.js init` is called
  - [ ] Post-init verification checks the artifacts `init` actually creates: `INDEX.md`, `RULES.md`, `workspace.json`, `specifications/`, `tasks/`, `archives/tasks/` — **not** `STATE.md`, which is bootstrapped lazily on the first mutating command
  - [ ] Brief report: "SDD initialized — {date}"
  - [ ] Calling workflow continues after init
- **Guards tested:** Engine Integrity check, post-init verification (WI-10 documentation parity — the checked set must match `init.js`)

### T02 — Init Partial Corruption

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.magicspec/` exists
  - `RULES.md` exists, `INDEX.md` is missing
  - `specifications/` exists, `tasks/` is missing
- **Action:** check-prerequisites → `ok: false` (missing required files) → init triggered
- **Expected:**
  - [ ] Init script runs and creates only missing artifacts (INDEX.md, tasks/)
  - [ ] Existing RULES.md is NOT overwritten (idempotency)
  - [ ] Post-init verification confirms the init-created artifacts are present; `STATE.md` is not among them and its absence is not a failure
- **Guards tested:** Safe to Re-Run (idempotency), full verification

### T26 — End-to-End Lifecycle (Cross-Workflow Chain)

- **Workflow:** `init.md` → `spec.md` → `plan.md` and `task.md` → `run.md` → `retrospective.md`
- **Synthetic State:**
  - Clean project, no `.magicspec/` directory
- **Action:** User says: "I want to build a REST API for user management"
- **Expected:**
  - [ ] **init**: `.magicspec/` created, INDEX.md + RULES.md initialized
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

### T30 — Init Existing Codebase Hint

- **Workflow:** `init.md` (Existing Codebase Hint)
- **Test A — Project with code:**
  - **Synthetic State:**
    - `.magicspec/` does NOT exist
    - Project root has: `package.json`, `src/`, `README.md`, 20+ source files
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.magicspec/` created with all 6 artifacts
    - [ ] Post-init: codebase indicators scanned — `package.json` found
    - [ ] Hint appended: `💡 Existing codebase detected. To generate initial specifications from your code, say: "Analyze project"`
    - [ ] Calling workflow continues after hint
- **Test B — Empty project (no code):**
  - **Synthetic State:**
    - `.magicspec/` does NOT exist
    - Project root has only `.magic/` (freshly installed magic-spec, no user code)
  - **Action:** Any workflow triggers init
  - **Expected:**
    - [ ] Init runs: `.magicspec/` created with all 6 artifacts
    - [ ] Post-init: no codebase indicators found
    - [ ] **No hint** — analysis not suggested for empty projects
    - [ ] Calling workflow continues
- **Guards tested:** Codebase detection heuristic, hint presence/absence

### T45 — Automation Handoff Validation (Init)

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.magicspec/` directory is missing.
  - Engine `skills/magicspec/.checksums` exists.
  - User edited `skills/magicspec/scripts/init.js` manually.
  - `check-prerequisites` JSON output contains `"warnings": ["Engine Integrity: 'skills/magicspec/scripts/init.js' has been modified..."]`.
- **Action:** An arbitrary workflow calls `init.md` indirectly.
- **Expected:**
  - [ ] Agent reads the JSON output and detects the `Engine Integrity` warning.
  - [ ] Agent does **NOT** attempt to compute SHA256 hashes manually.
  - [ ] Agent HALTs initialization immediately and reports the mismatch.
- **Guards tested:** AOP Automation Delegation, Engine Integrity Guard.

### T58 — Init: Workspace Initialized

- **Workflow:** `init.md`
- **Synthetic State:**
  - `.magicspec/` (missing).
- **Action:** Trigger any workflow (e.g. `spec.md`).
- **Expected:**
  - [ ] `check-prerequisites` fails (missing artifacts).
  - [ ] `init` workflow executes `init.js`.
  - [ ] `.magicspec/workspace.json` is created with `default: main` (per WI-10 in `l1-workspace-intent-routing.md` — new projects bootstrap into `.magicspec/{default}/`, never directly under `.magicspec/`).
  - [ ] `.magicspec/RULES.md` and `INDEX.md` created.
  - [ ] `.magicspec/main/` directory created with `INDEX.md`, `specifications/`, `tasks/`, `archives/tasks/` (no `STATE.md` — it appears on the first mutating command, not at bootstrap).
- **Guards tested:** Core Artifact Initialization (WI-10 layout), Zero-Prompt baseline, default workspace naming.

### T77 — Init Migration: Existing Project Fallback

- **Workflow:** `init.md` + `run.md`
- **Synthetic State:**
  - Project root has `.magicspec/` with existing specs/plans.
  - `.magicspec/workspace.json` is missing.
- **Action:** User runs `/magicspec run`
- **Expected:**
  - [ ] Agent reads root `.magicspec/` transiently only (`context.md` Priority 4), then auto-init bootstraps `workspace.json` and `.magicspec/{default}/` without overwriting existing files — nothing is written to flat root `.magicspec/` (WI-10).
  - [ ] Agent does not trigger an infinite loop of `init`: init is non-overwriting and idempotent, and resolution re-runs once at Priority 3.
- **Guards tested:** Workspace Fallback (missing workspace.json), Init Loop Prevention.

### T79 — Init Migration: Index Preservation

- **Workflow:** `init.md` (Migration Mode)
- **Synthetic State:** Project with old `.magicspec/INDEX.md` but no `workspace.json`.
- **Action:** Auto-Init trigger (any `/magicspec <command>` workflow; `init.md` is internal — there is no `/magicspec init` command).
- **Expected:**
  - [ ] Agent creates `workspace.json`.
  - [ ] **Guard**: Agent DOES NOT overwrite existing `INDEX.md` with default template.
  - [ ] Existing specifications remain registered.
- **Guards tested:** Non-Overwriting Invariant, Index Preservation (Migration).

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

### T162 — Config Drift Detection (Git Available, Drift Present)

- **Workflow:** `init.md` (Pre-flight, Config Drift Advisory)
- **Synthetic State:**
  - `.magicspec/RULES.md` exists and is tracked by git.
  - Git repo is initialized. `git diff HEAD -- .magicspec/RULES.md` returns non-empty output (§7 C3 was manually deleted).
- **Action:** `check-prerequisites --json --workspace=engine`
- **Expected:**
  - [ ] `CONFIG_DRIFT` warning present in JSON output for `.magicspec/RULES.md`.
  - [ ] Warning message includes file path and "modified outside workflow".
  - [ ] Warning is non-blocking: `ok` field is NOT affected by CONFIG_DRIFT alone.
  - [ ] Agent logs the non-blocking advisory "RULES.md was modified outside workflow." and auto-proceeds — no halt, no prompt, no option menu (`init.md` Step 1).
- **Guards tested:** Config Drift Guard, non-blocking advisory pattern.

### T163 — Config Drift Detection (No Git)

- **Workflow:** `init.md` (Pre-flight, Config Drift Advisory)
- **Synthetic State:**
  - `.magicspec/RULES.md` exists.
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
  - `.magicspec/RULES.md` (global) exists, no uncommitted changes.
  - `.magicspec/engine/RULES.md` (workspace-specific) exists with uncommitted changes.
  - Git repo is initialized.
- **Action:** `check-prerequisites --json --workspace=engine`
- **Expected:**
  - [ ] `CONFIG_DRIFT` warning present for `.magicspec/engine/RULES.md` only.
  - [ ] No warning for `.magicspec/RULES.md` (unchanged).
  - [ ] C22 workspace rule inheritance respected in drift check scope.
- **Guards tested:** Config Drift Guard, C22 Workspace Rule Inheritance.

### T235 — `checksums_mismatch` Names the `ENGINE_INTEGRITY` Warning: the Script Prints No Separate Token

- **Workflow:** `init.md` §1 (C15 Filter) + `plan.md` Pre-flight, the `task.md` Plan Gate and `run.md` Pre-flight (they branch on `ENGINE_INTEGRITY`) + the constitution's C9 gate 6 and C23 §3 (they still say `checksums_mismatch`)
- **Synthetic State:**
  - `skills/magicspec/workflows/run.md` is modified locally (hash mismatch). `check-prerequisites --json` returns `ok: false` with a warning `{"type": "ENGINE_INTEGRITY", …}` and no field or value named `checksums_mismatch`.
  - Workspace `engine` scope covers `.magic`.
- **Action:** `/magicspec plan`, `/magicspec task` and `/magicspec run` reach their Pre-flight.
- **Expected:**
  - [ ] The pre-flight of `plan.md`, the Plan Gate of `task.md` and the pre-flight of `run.md` match the `ENGINE_INTEGRITY` warning literally and applies the C15 Filter; reading C9 gate 6 or C23 §3, the agent maps `checksums_mismatch` to that same warning (declared in `init.md` §1).
  - [ ] The mismatch is in scope → **HALT** with the `update-engine-meta` / restore-from-origin hint; an out-of-scope mismatch would proceed silently.
  - [ ] The agent does not conclude "no checksum mismatch" from the absence of a literal `checksums_mismatch` token in the JSON.
- **Guards tested:** Primary Source Principle (C13 §1) — a branch named in workflow text must be reachable from the script's actual vocabulary; C15 Filter.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — ten lines of workflow, constitution and template text branch on a token `check-prerequisites.js` never prints.
