# Workflow Test Suite — analyze

Cases of the area `analyze` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T27 — Analyze First-Time on Existing Project

- **Workflow:** `analyze.md` (First-Time Analysis, delegated from `spec.md`)
- **Synthetic State:**
  - `.magicspec/` initialized (INDEX.md exists, empty — 0 specs registered)
  - Project has: `package.json` (Next.js), `src/` with `components/`, `pages/`, `api/`, `lib/`
  - `.eslintrc.json`, `tsconfig.json`, `tailwind.config.js` exist
  - ~80 source files total
- **Action:** User says: "Analyze this project"
- **Expected:**
  - [ ] `spec.md` Explore Mode triggered → delegation rule fires → `analyze.md` read
  - [ ] INDEX.md empty → `/magicspec analyze` runs Mode C first and narrates `[DR] Next: /magicspec analyze first-time — the registry is empty. (Override: stop here)`; First-Time Analysis (Mode A) starts only on that explicit argument (Mode Precedence, T87)
  - [ ] Mode A Depth Control: ~80 files → Full scan, narrated `[DR] Full scan — 80 files. (Override: /magicspec analyze "focus")` — no question
  - [ ] Step 1: Structure scan identifies `src/components/`, `src/pages/`, `src/api/`, `src/lib/`
  - [ ] Step 2: Stack detected — Next.js + TypeScript + Tailwind
  - [ ] Step 3: Architecture inferred — Frontend SPA (pages/ + components/) with API routes
  - [ ] Step 4: Conventions detected from `.eslintrc.json`, `tsconfig.json`
  - [ ] Step 5: Proposal (Spec Matrix + Observed Conventions) generated to **agent artifacts** (NOT `.magicspec/`)
  - [ ] Proposal contains: ≥3 proposed L1 specs, ≥3 proposed L2 specs, ≥1 observed convention whose destination is the owning implementation-layer specification — never `RULES.md` (`analyze.md` Operational Logic §3, Mode A step 3)
  - [ ] Step 6: C9 Auto-Dispatch (Mode A step 3): spec stubs created without a separate approval prompt; agent narrates `[Auto-Analyze] Dispatched 6 specs (L1: 3, L2: 3). (Adjust: /magicspec spec amend {name} | Revert: git restore .magicspec/)`
  - [ ] Hard fork: if the agent finds architectural uncertainty, it resolves it by the Consequence Forecast (C9 gate 3, DA-10) and narrates a `[DR]`, the premise recorded in the dispatched spec — no options are presented before the write
- **Guards tested:** Delegation routing, Mode Precedence (Mode C before the explicit first-time run), read-only scan, C9 Auto-Dispatch, hard fork resolved by forecast (DA-10)

### T28 — Analyze Re-Analysis Gap Detection

- **Workflow:** `analyze.md` (Re-Analysis Mode, delegated from `spec.md`)
- **Synthetic State:**
  - `.magicspec/INDEX.md`: 3 specs registered:
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

### T31 — Analyze Depth Control for Large Projects

- **Workflow:** `analyze.md` (Depth Control)
- **Action (all tests):** `/magicspec analyze first-time` — Depth Control gates Modes A, B and D; plain `/magicspec analyze` is Mode C, where size is noted and never gated (`analyze.md` Audit Policy)
- **Test A — Small project (<50 files):**
  - **Synthetic State:**
    - 30 source files, `.magicspec/INDEX.md` empty
  - **Expected:**
    - [ ] Full scan starts automatically — no prompt
- **Test B — Medium project (50–500 files):**
  - **Synthetic State:**
    - 200 source files, `.magicspec/INDEX.md` empty
  - **Expected:**
    - [ ] Agent scans Full without asking and narrates `[DR] Full scan — 200 files. (Override: /magicspec analyze "focus")`
    - [ ] No question and no option menu are presented
- **Test C — Large project (>500 files):**
  - **Synthetic State:**
    - 1200 source files across 80 directories, `.magicspec/INDEX.md` empty
  - **Expected:**
    - [ ] Agent does NOT start a Full scan of 1200 files
    - [ ] Agent chooses Focused or Quick by the Consequence Forecast (C9 gate 7, DA-10): the registry is empty, so the spec graph names no uncovered module, and no argument or workspace `scope` gives a focus under 500 files → Quick, narrated `[DR] Quick scan — 1200 files (DA-10); worst case if wrong: one re-run. (Override: /magicspec analyze "{focus}")`
    - [ ] No question and no option menu; the scan proceeds
- **Guards tested:** Depth Control thresholds (<50 auto-scan, 50–500 narrated Full scan, >500 mode chosen by forecast)

### T38 — Analyze Auto-Init Guard and Markdown List Integrity

- **Workflow:** `analyze.md`
- **Synthetic State:** Fresh repository without `.magicspec/` directory.
- **Action:** User prompts *"Analyze my codebase"* (triggers analyze).
- **Expected:**
  - [ ] Agent intercepts execution and triggers `skills/magicspec/references/init.md` pre-flight before scanning.
  - [ ] Agent processes the Mode C steps (1–15, including 6a) linearly without sequence restart.
- **Guards tested:** Auto-Init Delegation, Markdown List Continuity.

### T46 — Analysis Depth Control (Prioritization)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Project contains > 500 files.
  - No existing specs.
- **Action:** `/magicspec analyze first-time` (plain `/magicspec analyze` is Mode C: size is noted and never gated — `analyze.md` Audit Policy).
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
- **Action:** User runs `/magicspec analyze`, then applies the proposed registry sync through `/magicspec spec`.
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

### T59 — Analyze: Depth Control (Threshold Enforcement)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Project A: 40 files.
  - Project B: 200 files.
  - Project C: 600 files.
- **Action:** Run `/magicspec analyze first-time` on each (plain `/magicspec analyze` is Mode C, which never gates on size).
- **Expected:**
  - [ ] **Project A**: Auto-scan (Step 1) starts without prompting.
  - [ ] **Project B**: Agent scans Full and narrates `[DR] Full scan — 200 files. (Override: /magicspec analyze "focus")` — no question.
  - [ ] **Project C**: Agent chooses Focused or Quick by the Consequence Forecast (DA-10) and narrates the `[DR]` — no HALT, no question.
- **Guards tested:** Depth Control (Safety) thresholds.

### T65 — Scoped Analysis Guard (C15)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - `workspace.json`: `engine` workspace with `scope: [".magic/", ".agents/"]`.
  - Project has `src/`, `lib/`, `.magic/`, and `.agents/`.
- **Action:** User runs `/magicspec analyze`.
- **Expected:**
  - [ ] `executor.js` exports `MAGIC_WORKSPACE_SCOPE=".magic/,.agents/"`.
  - [ ] **Scoping Rule (C15)**: Agent ignores `src/` and `lib/` during structure scan.
  - [ ] Proposal only includes modules found within the scoped paths.
- **Guards tested:** Scoped Scanning (C15), Multi-Workspace Isolation.

### T68 — Ghost Registry Repair Priority (Non-Destructive Boot)

- **Workflow:** `analyze.md` (Mode C — Registry Audit + Auto-Repair)
- **Synthetic State:**
  - `.magicspec/INDEX.md` is blank.
  - `.magicspec/specifications/` has 3 files: `auth.md`, `db.md`, `api.md`.
- **Action:** User prompts: "Analyze project and suggest new specs".
- **Expected:**
  - [ ] "Analyze project" is `/magicspec analyze` → Mode C; Mode A never starts in the same invocation (Mode Precedence), so "suggest new specs" is not acted on in this run.
  - [ ] Registry Audit finds 3 files on disk that the blank `INDEX.md` does not list (Ghost/Zombie check).
  - [ ] Auto-Repair maps the 3 files into `INDEX.md` and narrates `[Auto-Repair] Registry healed: 3 Ghost/Zombie entries resolved. (Revert: git restore .magicspec/{ws}/INDEX.md)`.
  - [ ] No new-spec proposal is produced in this invocation; later analysis runs against the healed registry (a `first-time` run would take Mode B, since `INDEX.md` now lists specs — `analyze.md` Argument Routing).
- **Guards tested:** Registry healing before any dispatch, Mode Precedence (no same-invocation Mode A).

### T87 — Analyze Mode C with Empty INDEX.md (Precedence Guard)

- **Workflow:** `analyze.md` (Mode C — Mode Precedence)
- **Synthetic State:**
  - `.magicspec/` initialized
  - `INDEX.md` exists but is empty (0 specs registered)
  - Project has source code
- **Action:** User runs `/magicspec analyze`
- **Expected:**
  - [ ] Mode C fires (trigger matches `/magicspec analyze`)
  - [ ] Mode A condition is also true (INDEX.md empty) — but Mode A does NOT auto-start
  - [ ] Mode C runs to completion: self-check, registry audit, coverage check, rule validation, report
  - [ ] Report delivered: "Registry empty — no specs registered. Coverage: 100% gap."
  - [ ] After report: agent narrates `[DR] Next: /magicspec analyze first-time — the registry is empty. (Override: stop here)` — no question
  - [ ] Mode A starts only when the user runs `/magicspec analyze first-time`
- **Guards tested:** Mode Precedence (RE-A1), Mode C completeness before the Mode A next-step recommendation

### T88 — Analyze Mode C Bypasses All Intermediate HALTs

- **Workflow:** `analyze.md` (Mode C — Audit Policy)
- **Synthetic State:**
  - `.magic/` checksum mismatch exists (`checksums_mismatch`)
  - `INDEX.md` has `api.md` registered but file is missing from disk (Existence Guard condition)
  - `auth.md` header `Version: 1.2.0`, INDEX.md entry `Version: 1.1.0` (VERSION_DRIFT)
  - L2 spec `api-impl.md` has non-Stable L1 parent (C12 Quarantine condition)
- **Action:** User runs `/magicspec analyze`
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
- **Action:** User runs `/magicspec analyze`
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
- **Action:** User runs `/magicspec analyze`
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

### T96 — Analyze with Explicit Workspace Argument

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 1)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`. Default: `engine`.
- **Action:** `/magicspec analyze docs`
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
- **Action:** `/magicspec analyze` (no argument)
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
- **Action:** `/magicspec analyze` (no argument)
- **Expected:**
  - [ ] Agent detects multiple workspaces with no default and no explicit arg
  - [ ] Quick-scan finds no scope covering ≥50% of the cwd's files → the agent chooses by the Consequence Forecast (`context.md` Workspace Disambiguation, step 4): every wrong pick costs the same later move, so the higher coverage wins, then the first in `workspace.json` order
  - [ ] Narrates `[DR] Selecting {workspace} — {criterion}. (Override: /magicspec analyze {other})` and proceeds — no question, no HALT
- **Guards tested:** Workspace Resolution Priority 3 (multiple workspaces, no default → forecast, not a question)

### T99 — Analyze with Invalid MAGIC_WORKSPACE Env Var

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 2 validation)
- **Synthetic State:**
  - `workspace.json` registers two workspaces: `engine`, `docs`.
  - `MAGIC_WORKSPACE=frontend` (not in `workspace.json`).
- **Action:** `/magicspec analyze` (no explicit arg)
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
- **Action:** `/magicspec analyze engine`
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
- **Action:** `/magicspec analyze docs`
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

### T107 — Mode B Logic Evolution Triggers Amendment Cascade

- **Workflow:** `analyze.md` (Mode B — Logic Evolution → dispatch)
- **Synthetic State:**
  - `app/auth.md` — L1, Stable, v1.0.0.
  - `app/auth-jwt.md` — L2, Stable, `Implements: auth.md`.
  - `app/src/auth/` — code has structurally drifted: 4 new sub-modules added (>30% threshold).
- **Action:** `/magicspec analyze app` → Mode B detects Logic Evolution in `auth.md` → user approves Reality Sync
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
  - `.magicspec/` initialized, `INDEX.md` empty (0 specs)
  - Project has 300 source files
- **Action:** `/magicspec analyze`, then `/magicspec analyze first-time`
- **Expected:**
  - [ ] Mode C runs first (Mode Precedence), then the user runs `/magicspec analyze first-time`
  - [ ] Mode A Step 0 fires: `check-prerequisites` called
  - [ ] Depth Control applied: 300 files → agent scans Full and narrates `[DR] Full scan — 300 files. (Override: /magicspec analyze "focus")`
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
  - `.magicspec/` does NOT exist
  - Project has source code
- **Action:** `/magicspec analyze` (direct trigger, NOT via `spec.md` delegation)
- **Expected:**
  - [ ] `analyze.md` Invariant 2 fires: `.magicspec/` missing detected
  - [ ] Auto-trigger `skills/magicspec/references/init.md` before any scanning
  - [ ] `.magicspec/` created with all 6 artifacts
  - [ ] Analysis resumes after init completes
- **Guards tested:** Auto-Init (Invariant 2) on direct analyze trigger

### T113 — Analyze Argument Routing: Workspace vs Focus Disambiguation

- **Workflow:** `analyze.md` (§Argument Routing)
- **Synthetic State:**
  - `workspace.json` registers: `engine`, `docs`.
- **Test A — Unquoted workspace name:**
  - **Action:** `/magicspec analyze engine`
  - **Expected:**
    - [ ] Argument matches workspace name → Workspace Analysis mode
    - [ ] Mode C (with Structural Integrity) → A/B scoped to `engine`
- **Test B — Quoted workspace name (force focus):**
  - **Action:** `/magicspec analyze "engine"`
  - **Expected:**
    - [ ] Argument is quoted → treated as focus text, NOT workspace
    - [ ] Mode D triggered: focus directive = "engine"
    - [ ] Agent searches for project areas matching keyword "engine"
- **Test C — Workspace + focus:**
  - **Action:** `/magicspec analyze docs "check tests"`
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
- **Action:** `/magicspec analyze app "check API coverage"`
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
- **Action:** `/magicspec analyze "blockchain integration"`
- **Expected:**
  - [ ] Focus directive parsed: intent = blockchain integration
  - [ ] Targeted scan: no folders, spec titles, or modules match "blockchain"
  - [ ] **HALT**: "Could not map focus 'blockchain integration' to any project area. Try narrowing with a workspace: `/magicspec analyze {workspace} \"blockchain integration\"`, or rephrase the focus."
  - [ ] No scan started, no report generated
- **Guards tested:** Mode D HALT on empty match, improved HALT message

### T116 — Analyze Mode C: Structural Integrity Violations

- **Workflow:** `analyze.md` (Mode C — Structural Integrity step)
- **Synthetic State:**
  - `workspace.json` registers `api` workspace with scope `src/api/`, folder `.magicspec/api/`
  - `.magicspec/api/` exists but:
    - `INDEX.md` is missing
    - `specifications/` contains `My Spec.md` (not kebab-case)
    - `specifications/orphan-spec.md` exists but is NOT listed in workspace INDEX
  - `workspace.json` scope entry `src/legacy/` does NOT exist on disk
- **Action:** `/magicspec analyze api`
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
    - [ ] Structural Improvements: 2 workspace rules duplicated by a higher tier → `RULE_RETIRE_CANDIDATE {id}: b` with `→ /magicspec rule remove {id}`
    - [ ] Each finding has concrete Action Proposal (`→ /magicspec spec ...` or `→ /magicspec rule ...`)
- **Test C — Mode C generates Advisory:**
  - **Action:** `/magicspec analyze app` → Mode C completes → Advisory step fires
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
  - **Action:** `/magicspec analyze "authorization"`
  - **Expected:**
    - [ ] Focus matches `src/auth/` (12 files) → Depth Control exempt
    - [ ] Targeted scan proceeds without prompting
- **Test B — Wide focus resolving to >500 files:**
  - **Action:** `/magicspec analyze "all components"`
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
- **Action:** `/magicspec analyze api`
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
- **Action:** `/magicspec analyze api`
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
  - **Action:** `/magicspec analyze "utils"`
  - **Expected:**
    - [ ] Mode D triggered, no workspace → project-wide scan
    - [ ] C15 scope NOT enforced (focus is the boundary)
    - [ ] `packages/shared/utils.js` found and included in Focused Gap Report
    - [ ] Directories outside all scopes are reachable
- **Test B — Focus with workspace:**
  - **Action:** `/magicspec analyze api "utils"`
  - **Expected:**
    - [ ] Mode D triggered, workspace `api` → C15 applied (scope: `packages/api/`)
    - [ ] `packages/shared/utils.js` NOT found (out of `api` scope)
    - [ ] Only `packages/api/` searched for "utils" matches
- **Guards tested:** Mode D C15 exception (project-wide), C15 enforcement (workspace-scoped)

### T144 — Analyze Mode A Auto-Dispatches, a Hard Fork Included

- **Workflow:** `analyze.md` (Mode A — Proposal step)
- **Synthetic State:**
  - `.magicspec/INDEX.md` empty, project has `src/` with 30 files
- **Action:** `/magicspec analyze` (Mode C, then `[DR] Next: /magicspec analyze first-time`), then `/magicspec analyze first-time` → Mode A generates a proposal with 4 L1 specs and 3 observed conventions
- **Expected:**
  - [ ] C9 Auto-Dispatch: 4 L1 spec stubs written without an inline approval prompt; the 3 observed conventions are recorded in the owning implementation-layer specifications (analysis never writes `RULES.md`)
  - [ ] Agent narrates the action log: `[Auto-Analyze] Dispatched N specs (L1: X, L2: Y). (Adjust: /magicspec spec amend {name} | Revert: git restore .magicspec/)`
  - [ ] Hard fork: if the agent finds structural ambiguity, the Consequence Forecast (C9 gate 3, DA-10) chooses — the hedge (dispatch what every structure shares, defer the divergent part behind a recorded premise) whenever deferral is possible — and the write proceeds with a `[DR]`; no (a)/(b)/(c) options
  - [ ] The premise sits in the dispatched spec's Constraints & Assumptions with its override; reverting everything is `git restore .magicspec/`
- **Guards tested:** C9 Auto-Dispatch, hard fork resolved by forecast, no approval prompts

### T145 — Analyze Priority 1 Prints Workspace Confirmation

- **Workflow:** `analyze.md` (§Workspace Resolution — Priority 1)
- **Synthetic State:**
  - `workspace.json`: `engine` (default), `docs`. Both valid.
- **Action:** `/magicspec analyze docs`
- **Expected:**
  - [ ] Workspace resolved to `docs` via Priority 1 (explicit arg)
  - [ ] Agent prints: "Active workspace: docs."
  - [ ] Default `engine` workspace is NOT used despite being set as default
  - [ ] Analysis scoped to `docs` workspace paths
- **Guards tested:** Priority 1 override, confirmation print

### T180 — Analyze Mode A GHOST_REGISTRY Triggers C15 Filter (RE-1 Regression)

- **Workflow:** `analyze.md` (Mode A — Step 0 Pre-flight)
- **Synthetic State:**
  - `.magicspec/INDEX.md` empty (0 specs) → Mode A eligible
  - `INDEX.md` in another workspace references `phantom.md` which is missing from disk
  - `check-prerequisites --json` returns `ok: false` with `GHOST_REGISTRY` warning for `phantom.md`
  - Active workspace: `engine` (in-scope)
- **Action:** `/magicspec analyze`
- **Expected:**
  - [ ] Pre-flight Step 0 runs `check-prerequisites --json`
  - [ ] `GHOST_REGISTRY` warning detected in output
  - [ ] **C15 Filter** applied: agent checks if `phantom.md` is in active workspace scope
  - [ ] If in-scope → **HALT**: "Registry/engine integrity failure. Run `/magicspec spec audit` or `update-engine-meta` to resolve."
  - [ ] Agent does NOT proceed to "Build full project map" (Step 1)
  - [ ] Agent does NOT attempt to read `phantom.md` from disk
- **Guards tested:** GHOST_REGISTRY in analyze.md Mode A (RE-1 fix), C15 Filter application, anti-hallucination

### T181 — Analyze Mode A Unrecognized Pre-flight Failure (RE-1 Regression)

- **Workflow:** `analyze.md` (Mode A — Step 0 Pre-flight)
- **Synthetic State:**
  - `check-prerequisites --json` returns `ok: false` with unknown field `{"ok": false, "unknown_error": "permission_denied"}`
  - No `ENGINE_INTEGRITY`, no `GHOST_REGISTRY`, no missing `.magicspec/`
- **Action:** `/magicspec analyze`
- **Expected:**
  - [ ] Pre-flight Step 0 detects `ok: false` with no matching category
  - [ ] **HALT**: "Unexpected pre-flight failure: {raw output}. Investigate manually."
  - [ ] Agent does NOT silently proceed to scanning
  - [ ] Agent does NOT fall through to Depth Control
- **Guards tested:** Unrecognized failure HALT in analyze.md (RE-1 fix), fail-safe branch

### T196 — Pre-Advisory Audit Execution (C24)

- **Workflow:** `analyze.md`
- **Synthetic State:**
  - Workspace contains minor unused dependencies and an outdated architectural pattern.
- **Action:** `/magicspec analyze` (Mode C)
- **Expected:**
  - [ ] Agent pauses to perform Pre-Advisory Audit (Auditor Persona) before outputting the Advisory Report.
  - [ ] Agent limits severity inflation; trivial issues are mapped to Low severity or discarded.
  - [ ] Agent cross-correlates findings to prevent duplicate issue generation.
- **Guards tested:** C24 Independent Analyst Objectivity, Advisory Filter.

### T229 — Ventilation Reports a Rule Whose Cause Is Gone and Edits Nothing (RA-7)

- **Workflow:** `analyze.md` (Mode C step 12 → Rule Retirement)
- **Synthetic State (Test A):**
  - Workspace `RULES.md` holds WC1, agent-originated, whose Document History row cites `scripts/legacy/export.sh` as its evidence; that file no longer exists.
- **Action A:** `/magicspec analyze {workspace}`
- **Expected A:**
  - [ ] `RULE_RETIRE_CANDIDATE WC1: a` with the next step `→ /magicspec rule remove WC1`.
  - [ ] No rule is edited or removed; Remove would still ask its single confirmation.
- **Synthetic State (Test B — controls):**
  - WC2 is user-stated and cites a missing file; C7 is an engine-owned convention (its heading matches the shipped template).
- **Expected B:**
  - [ ] WC2 is not flagged as cause-gone (only agent-originated rules carry cited evidence); it is still checked for superseded, deadlock and size.
  - [ ] C7 is never flagged.
- **Guards tested:** RA-7 kinds (a)–(d) and their exclusions; ventilation stays read-only.
- **Regression for:** a rule set that only ever grows because nothing proposes a removal.

### T239 — Every Pre-flight Names the Workspace It Runs For (an Explicit Workspace Argument Is Not Silently Replaced by the Default)

- **Workflow:** `analyze.md` (Shared Pre-flight), `retrospective.md` (Step 1), `plan.md` and `task.md` (Pre-flight and Plan Gate), `executor.js` (workspace resolution)
- **Synthetic State (Test A — behavior):**
  - `workspace.json` registers `engine` (default) and `docs`; `MAGIC_WORKSPACE` is unset. `docs` holds specs and a plan; `engine` is clean.
- **Action A:** `/magicspec analyze docs` reaches the Mode B Shared Pre-flight; later `/magicspec run docs` finishes a phase and Retro L1 reaches its Step 1.
- **Expected A:**
  - [ ] The command run is `check-prerequisites --json --workspace=docs`; `executor.js` lets the explicit flag outrank the default, so every finding concerns `.magicspec/docs/` and the C15 Filter reads the `docs` scope.
  - [ ] A defect that exists only in `docs` (a `GHOST_REGISTRY` entry for a `docs` spec) is not hidden by the clean `engine` workspace.
- **Synthetic State (Test B — static scan):** shipped text.
- **Action B:** list every `executor.js check-prerequisites` invocation in `skills/magicspec/workflows/*.md` and `skills/magicspec/references/*.md`.
- **Expected B:**
  - [ ] All nine invocations (`init.md`, `spec.md` ×2, `rule.md`, `plan.md`, `task.md`, `run.md`, `analyze.md`, `retrospective.md`) carry `--workspace={active-workspace}`.
- **Guards tested:** Context resolution reaching the script (Core Invariant 1 of every workflow); flag-over-default precedence in `executor.js`; parity of the Pre-flight command across workflows.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — two of the eight Pre-flight commands omitted the flag, so in a multi-workspace project the default workspace was validated in place of the one the user named.
