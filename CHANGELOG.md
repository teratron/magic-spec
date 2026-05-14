# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Blocked-track next-step hardened** (engine v2.1.26 → v2.1.27): eliminated `/magic.spec` leaking into post-run blocked-track narration. Three changes in `run.md`:
  1. **Step 2 Stalled** — "HALT & report" replaced with explicit rule: list blocked tasks + their `[!]` reasons, recommend `/magic.task {workspace}` as the ONE next step; hard-forbids naming `/magic.spec` or `/magic.analyze` directly.
  2. **Logic Guards — Pause Propagation** — inform message rewritten: removed "fix blockers and run /magic.run" (which invited `/magic.spec` improvisation); now says "Run `/magic.task {workspace}` to revalidate"; same hard-forbid inline.
  3. **Run Completion Checklist** — "Blockers" item extended: next-step recommendation must be `/magic.task` only; `/magic.spec` never named directly.
  Root cause: the pattern `"HALT & report"` without specifying WHAT to recommend caused the AI to improvise `/magic.spec review` when a blocked track's reason referenced a spec-not-ready condition. All three insertion points now explicitly enforce `rules/magic.md §5` Post-Task Replan constraint.

- **Full automation enforcement** (engine v2.1.25 → v2.1.26): eliminated all option-menu patterns (A/B/C choices) from workflow prompts — replaced with deterministic auto-apply or single-path recommendations across four workflows:
  1. **`analyze.md` §Invariant 3** — scope of "read-only" clarified: spec content and project code remain protected; engine-config artifacts (`workspace.json`, `INDEX.md` registry fields, wiki) may now be auto-repaired for deterministic mechanical drift with a narration + `(Revert: git restore {file})` note.
  2. **`analyze.md` §Step 11** — renamed from "Auto-Repair suggest" → "Auto-Repair"; added explicit auto-apply rules for: workspace layout drift (update `workspace.json` to match actual spec location on disk), registry healing (auto-execute repair), wiki staleness (auto-run `export-wiki`). Shadow Logic and Task Sync emit one `→ /cmd` line each. Explicitly forbids option menus.
  3. **`spec.md` §Creating — Cross-Workspace Parity** — removed HALT + 3-option menu; auto-applies workspace-prefix naming (`{active-workspace}-{file}`) and proceeds with narration.
  4. **`spec.md` §Updating — Version Drift Guard** — removed 2-option menu `(a)/(b)`; states one resolution path: run `/magic.spec` to reconcile `INDEX.md` to file-header version.
  5. **`task.md` §Pre-flight — Cross-Workspace Parity** — removed 3-option menu `(a)/(b)/(c)`; single recommendation: run `/magic.spec` in the higher-version workspace, then re-run `/magic.task`.
  6. **`run.md` §Logic Guards — Sync** — removed "or confirm you want to proceed" gate; RULES/TASKS drift now auto-resolves via `magic.task update` with narration.
  Mode C Ventilation checklist updated: added "Auto-Repair applied; zero option menus" item. Engineer Posture (C25) annotation extended to explicitly forbid option menus.

### Added

- **Role-protocol tighten** (engine v2.1.18 → v2.1.19): three behavioral gaps closed via surgical role-card edits — no new roles, no new files. Five files touched:
  1. **Bug Reproduction First — `.magic/roles/test-engineer.md`** (new §2 in Operating Protocol, renumbered §3-§9; new anti-pattern bullet): tasks whose title / spec describes a bug, defect, or regression now require a reproducing test that FAILED on baseline (pre-Coder code) and PASSES post-fix; missing reproduction evidence → `Blocked [!]` with reason `reproduction missing`. Skipped for pure feature, refactor, or scaffolding tasks where no broken behavior is claimed. Symmetric anti-pattern added: «approving bug-fix `Done` without seeing reproducing test FAIL on baseline».
  2. **Overcomplication escalation — `.magic/roles/code-reviewer.md`** (new §6 in Operating Protocol, renumbered §7-§9): objective counting rule — two or more complexity signals (one-use abstractions, speculative configuration, branches / options not demanded by the task's `Verify` criterion) → emit *complexity notes* in PASS verdict, which routes to Code-simplifier via `run.md §3.4` PASS-with-notes branch. Isolated single signals → mention in notes but do not block. Phrased as counting, not subjective taste — avoids conflict with the existing «no style nitpicking» anti-pattern.
  3. **Multiple-interpretations auto-trigger — `.magic/roles/coder.md`** (new §4 in Operating Protocol, renumbered §5-§8): when the task / spec admits 2+ valid implementations with materially different trade-offs (response time vs throughput, in-memory vs persistent, per-request vs batched), Coder enumerates them as a one-line trade-off list and **mandatorily** hands off to Code-skeptic before editing. This is auto-trigger, not opt-in — strengthens P1 (Think Before Coding) at the workflow-entry point.
  4. **Code-skeptic trigger expansion — `.magic/roles/code-skeptic.md`** (frontmatter `gate` + Mission rewrite): activation path is now explicit three-branch — `(a)` spec flag `requires-decision-review: true` (opt-in), `(b)` Coder identifies non-trivial design choices (opt-in), `(c)` Coder surfaces 2+ valid interpretations (auto-trigger). Old Mission said «Opt-in» absolutely; now (c) is auto and labeled as such.
  5. **Workflow gate update — `.magic/run.md`** (§3.3 rewrite): the «Decision Review» gate name changed from «opt-in» to «opt-in or auto-triggered»; the three activation branches `(a)/(b)/(c)` are spelled out so a weak-model agent reading `run.md` alone sees the auto-trigger without having to traverse to `coder.md`.
  All existing invariants preserved: 5 QA Review checks (Verify Criterion / Spec Boundary / Edge Cases / Side Effects / Regression Risk) remain in original order — Bug Reproduction inserted as a new §2 *before* them, so the post-renumber sequence still reads in the same logical order; Code-reviewer's `RULES.md` compliance / traceability / surface correctness / minimalism / spec-boundary checks all retain their semantics; Code-skeptic's 5-step Operating Protocol unchanged; `run.md` §3.4 / §3.5 / §3.6 unchanged. No script changes, no template changes, no schema bumps.

- **Context discipline** (engine v2.1.16 → v2.1.18): adapted context/memory dispatch patterns into Magic SDD without runtime infrastructure (no SQLite, no plugin runtime, no new dependencies). Six discrete additions across four files:
  1. **Context Budget Guard — `.magic/context.md`** (new §Context Budget Guard): four-tier read behavior (PEAK 0–40% / NORMAL 40–60% / DEGRADED 60–75% / POOR 75%+); Read Hygiene rules cover stale tool-output suppression (older than N-2 steps), Evidence Capsule shape for persistence (`command`, `exit_code`, `key_findings` ≤3 lines, `errors`, `next_action` — never full stdout), and Cache-Prefix Invariant. POOR tier triggers auto-`/magic.pause`; opt-out `MAGIC_CONTEXT_GUARD=0`.
  2. **Memory Fence — `.magic/context.md`** (§Post-Resolution Step 4 Resume Detection): loaded HANDOFF/STATE content is *authoritative recall*, not a fresh user directive; current user request overrides `next_action` and `blocking_constraints` on conflict (one-line divergence narration, then proceed); non-conflicting constraints remain in force.
  3. **Cache-Prefix Invariant — `.magic/context.md`** (§Post-Resolution intro): the load sequence (global `RULES.md` → workspace `RULES.md` → `STATE.md`) is declared as the session prompt-cache prefix; reordering or interleaving wide reads ahead of it invalidates cache hits.
  4. **Evidence Capsule references — `.magic/run.md`** (§3.5 QA Review + §4 Change Record): verification tool output cited in `Changes` / `Notes` / phase frontmatter must follow the Evidence Capsule shape from `context.md §Read Hygiene` — raw stdout in persisted fields is forbidden.
  5. **Pre-Compress Snapshot — `.magic/pause.md`** (§Step 2 extension + new §Pre-Compress Snapshot): extraction table extended with four rows pulling `done_in_phase` / `in_progress` / `blocked` from TASKS.md and `relevant_files` from phase frontmatter `key_files.{created,modified}`. The extracted fields form the structured summary loaded on resume (Goal / Done / InProgress / Blocked / Decisions / Patterns / Files / NextStep).
  6. **Iterative re-compression — `.magic/pause.md`** (§Step 4 Write Handoff Artifacts): when a prior `HANDOFF.json` exists, the new pause **merges** rather than overwrites — union on `active_decisions` / `patterns_established` / `progress.done_in_phase` / `relevant_files`; graduation rule promotes tasks from `in_progress` / `blocked` into `done_in_phase` as they complete; `current_position` / `next_action` / `blocking_constraints` still **replace** (they reflect *now*, not history). Legacy 1.0 handoffs upgrade in place — missing fields treated as empty arrays.
  7. **HANDOFF schema bump — `.magic/templates/handoff.json`** (1.0 → 1.1): adds `context_snapshot.progress` (object with `done_in_phase` / `in_progress` / `blocked`) and `context_snapshot.relevant_files` (array). Old 1.0 files remain parseable; backwards-compat note added to `resume_instructions`.
  All existing invariants preserved: Resolution Chain priority order, Workspace Fit Validation (WI-7), Resume Detection auto-resume, Zero-Prompt Trust Mode, atomic-write guarantee in pause Step 4, QA Review 5-check list (Verify / Spec Boundary / Edge Cases / Side Effects / Regression Risk), Phase Completion 4-step succession, Finalization Protocol. No script changes; pure documentation/process rules + one template schema bump.

### Changed

- **Post-Task Replan collapse — user-visible cycle reduced to ONE command** (engine v2.1.22 → v2.1.23): the agent-facing rule for what to recommend after `/magic.run` finishes a phase or surfaces a drift signal previously prescribed a 3-command chain (`/magic.analyze` → `/magic.spec` → `/magic.task update` → `/magic.run`). Real-world UX: the user had to mentally chain three commands before re-execution, and `/magic.spec` was proactively proposed even for purely mechanical drift that `/magic.task` Pre-Planning Stabilization already auto-fixes (Draft→Stable promotion, field normalization, phantom backlog moves). Eight files touched, no logic changes to drift detection itself — only the recommendation tone and HALT message texts.
  - **`rules/magic.md` §5 (renamed `Post-Task Drift Auto-Analyze` → `Post-Task Replan`)** — full rewrite with denser prose. New chain: `task Done → drift? → /magic.task → (auto-fix? yes → replan → /magic.run | no → HALT: /magic.spec, then /magic.task)`. Adds explicit "Hard rules for the agent" subsection forbidding proactive `/magic.analyze` or `/magic.spec` recommendations after `/magic.run`. Env-var renamed `MAGIC_POST_TASK_ANALYZE` → `MAGIC_POST_TASK_REPLAN` (documentation-only — env was never read by JS code).
  - **`rules/magic.md` §6 Completion Protocol checklist** — the `§5 Post-Task Drift` bullet rewritten to assert the new invariant: exactly ONE user-visible next step (`/magic.task`); `/magic.spec` surfaces only inside `/magic.task` on a real HALT.
  - **`workflows/magic.run.md` frontmatter handoffs** — collapsed from 3 entries (`magic.task`, `magic.analyze` "Diagnose drift", `magic.spec` "Update specifications") to 1 entry ("Replan" → `magic.task`). The remaining prompt references `rules/magic.md §5` and explicitly forbids proactive proposals.
  - **`workflows/magic.task.md` Scope** — new "Post-Run Entry" bullet documents the auto-fix-vs-HALT contract for drift-recovery invocations, so weak-model agents reading the shim alone see the responsibility without traversing to `.magic/task.md`.
  - **`.magic/run.md`** — three HALT messages rewritten: Phantom Spec hint (line 41) now points at `/magic.task` (which surfaces `/magic.spec` only on real HALT) instead of dual `magic.spec --audit` / `magic.analyze`; Pre-flight File-Header Parity HALT (line 82) rewritten as single `/magic.spec` → re-run `/magic.task` path; Step 4 Handoff text now references `rules/magic.md §5` (not the old §5 number) and explicitly forbids `magic.analyze` / `magic.spec` proposals at the recommendation layer.
  - **`.magic/task.md`** — three Pre-flight HALT messages aligned to the single-recommendation pattern: File-Header Parity (line 76), Cross-Workspace Parent Header Parity (line 78), Phantom Parent Guard (line 106 — previously had no actionable hint; now ends with `Run /magic.spec to author the missing parent, then re-run /magic.task`).
  - **`.magic/scripts/check-prerequisites.js` lines 261-273** — the actual *source* of the user-visible HALT hint for `STATUS_DRIFT` / `VERSION_DRIFT`. Changed from `"magic.spec or magic.analyze"` to `"Run /magic.spec to reconcile, then re-run /magic.task"`. Without this script change, the rule rewrite would be cosmetic — the script emits the canonical message that propagates to user terminals via `executor.js check-prerequisites`.
  - **`dev/tests/suite.md`** — five test-contract updates to match the new HALT texts and agent behavior: T126 expected HALT report (line 2000), T126 user-direction assertion (line 2030 — now explicitly requires the single-command pattern with cross-reference to `rules/magic.md §5`), T141 renamed and rewritten to assert *collapse* (was: `Run Handoff Succession Returns to Task Update`; is: `Run Handoff Collapses to /magic.task`), T177 Cross-Workspace Parent HALT (line 2771).
  - **Hardlink topology**: `.agents/rules/magic.md` was split from `rules/magic.md` by an earlier Edit (Write/Edit break NTFS hardlinks per project memory). Re-established as a hardlink after this pass; verified via `fsutil hardlink list` + `Get-FileHash` parity.
  - **Argument note**: `/magic.task` does NOT gain a new argument for this use case — its existing argument routing (`(empty)` / `{workspace}` / `"text"` / `{workspace} "text"`) is sufficient, with `Handoff Propagation` already specified in `.magic/run.md` to attach the workspace context automatically.

- **Release kernel hygiene — `generate-checksums.js` reclassified as developer tool** (engine v2.1.21 → v2.1.22): re-traced the L1 release surface from user-facing entry points (`workflows/`, `skills/`, `rules/`, `.magic/*.md`, and the hardcoded pre-commit hook in `install-hooks.js`) to confirm exactly what each end user needs. Findings: every release-side caller of `generate-checksums.js` is **write-mode** (`update-engine-meta` after detected drift, or initial-bootstrap branch when `.checksums` is missing) — both are developer operations. The user contract is read-only: pre-commit hook runs `update-engine-meta --check`, which only **verifies** the shipped manifest. End users should never regenerate `.checksums` — corruption is resolved by restoring `.magic/` from the release archive, not by overwriting the integrity manifest. Five files touched:
  - **`.magic/scripts/generate-checksums.js` → `dev/scripts/generate-checksums.js`** (`git mv`, history preserved): reverses the move done in v2.1.20 → v2.1.21 (which itself relied on a flawed assumption — the v2.1.21 CHANGELOG entry incorrectly justified `.magic/scripts/` placement on grounds the file was «required by release-side `update-engine-meta`»; in fact only the **write** path needs it, and the write path is dev-only). Internal paths updated: `MAGIC_DIR` resolves to `path.join(__dirname, '../../.magic')`, `utils` require resolves to `../../.magic/scripts/utils`.
  - **`.magic/scripts/update-engine-meta.js`** — three behavior changes around the missing-script and missing-manifest cases:
    - `runGenerateChecksums()` now resolves `../../dev/scripts/generate-checksums.js` and **fails gracefully** when the dev/ tree is absent (user installation): emits a 3-line warning explaining that engine writes are a developer operation and pointing users at «restore from origin», then returns without bumping version. Previously a missing script would crash the user's pre-commit hook with `ENOENT`.
    - `--check` mode + missing `.checksums`: now exits 1 with `❌ .magic/.checksums missing. Restore .magic/ from origin.` instead of silently auto-generating (which would mask the same corruption that deleted the manifest).
    - Write mode + missing `.checksums`: still attempts bootstrap via the dev script, falls through to the same graceful warning if dev/ is absent.
  - **`.magic/scripts/install-hooks.js`** — pre-commit hook content rewritten. Old message advised users to `Run 'node .magic/scripts/executor.js update-engine-meta' to bump version and refresh checksums` — misleading because that write path won't work on a user install (no `dev/scripts/generate-checksums.js`) and shouldn't be invoked by end users anyway (it masks drift instead of fixing it). New message splits the two audiences: «If unintended: restore `.magic/` from the release archive» (user case, the common case) / «If engine-improvement task: run update-engine-meta (developer install only)».
  - **`docs/checksums.md`** — manual-update example path corrected to `dev/scripts/generate-checksums.js`; added a callout clarifying that the manifest builder is a developer tool shipped pre-generated to end users.
  - **`dev/tests/engine.js`** — three test-fixture path references updated to `tempDir/dev/scripts/generate-checksums.js` (tests 1, 5, 6). Added an explicit skip in the compatibility shim: `generate-checksums.js` is now in a `DEV_ONLY_NEVER_MIRROR` set so it is **never** copied into `tempDir/.magic/scripts/`. This makes the fixture match the actual user-install layout and lets the new graceful-fallback path in `update-engine-meta` be exercised honestly (rather than masked by a copy). Test suite: **10/10 pass** post-migration.
  - **`.magic/.checksums` regenerated**: 64 → 63 entries (`scripts/generate-checksums.js` removed from the manifest, as it is no longer part of the engine kernel). Hashes for `install-hooks.js` and `update-engine-meta.js` reflect their new content.

- **Layer separation cleanup — release kernel hygiene** (engine v2.1.20 → v2.1.21): tightened the boundary between the user-distributable kernel (`.magic/`, `workflows/`, `skills/`, `rules/`) and dev tooling (`dev/`). Two scripts relocated; one L1→L2 dependency violation in `.magic/scripts/update-engine-meta.js` removed; one script hardened against shell-injection. No external API changes — every `node .magic/scripts/executor.js <name>` call site still resolves correctly.
  - **`.magic/scripts/update-project-meta.js` → `dev/scripts/update-project-meta.js`** (`git mv`, history preserved): only used by `dev/scripts/sync.js` to refresh `.design/INDEX.md` metadata in the magic-spec repo itself; not referenced by any release-side workflow, skill, rule, or `.magic/*.md` file. Belongs in dev. Require path adjusted (`./utils` → `../../.magic/scripts/utils`).
  - **`dev/scripts/generate-checksums.js` → `.magic/scripts/generate-checksums.js`** (`git mv`, history preserved): required by the release-side `update-engine-meta.js`, which itself is invoked from the user's pre-commit hook installed by `init.js`. Previous location forced `update-engine-meta` to reach into `dev/` — a cross-layer dependency that would break on a user side with no `dev/` directory. `dev/tests/engine.js` and `docs/checksums.md` already expected it in `.magic/scripts/`; this finally aligns code with the existing expectation. Internal paths updated (`MAGIC_DIR` now `path.join(__dirname, '..')`; require `./utils`).
  - **`.magic/scripts/update-engine-meta.js` hardening**: `runGenerateChecksums()` now resolves the sibling script (`./generate-checksums.js`) instead of the cross-layer `../../dev/scripts/generate-checksums.js`. Internal `execSync` (with a template-literal command) replaced by `execFileSync(process.execPath, [scriptPath])` — argv-array form avoids shell parsing, so spaces/quotes in `__dirname` cannot break the call (also closes a latent shell-injection class). The error hint corrected to the user-facing path `.magic/scripts/executor.js update-engine-meta`. The graceful-fallback path for `dev/scripts/sync-skills.js` was retained — on the user side it simply skips with a warning, on the dev side it still projects workflows into skill wrappers.
  - **`dev/scripts/sync.js`**: routing for step 4 (`update-project-meta`) switched from `magicScriptsDir` to `devScriptsDir`; pipeline comment header reflects the new home.
  - **`dev/tests/engine.js`**: compatibility-shim comment updated — `generate-checksums.js` is no longer described as a dev-namespace import; the shim still mirrors the remaining genuine dev-only scripts (`sync.js`, `sync-docs.js`, `validate-hardlinks.js`, etc.) into the test fixture's `.magic/scripts/`.
  - **`.magic/.checksums` regenerated**: 64 entries (no net file count change — one in, one out). Hashes for `generate-checksums.js` and `update-engine-meta.js` reflect their new content.

- **Dev state cache relocation — `.docs-state.json` out of `.magic/`** (engine v2.1.19 → v2.1.20): the sync-docs hash cache was a dev-only artifact (written and read by `dev/scripts/sync-docs.js`) but lived inside the distributable engine kernel, leaking into every release zip. Moved to `dev/.cache/.docs-state.json`. `.magic/scripts/utils.js` `VOLATILE_STATE_FILES` cleaned up (`.docs-state.json` entry removed — file no longer in `.magic/` so no defensive filter needed). `.agents/workflows/magic.dev.sync.md` updated to point at the new path; `magic-dev-sync` skill wrapper regenerated. `.design/engine/CONTEXT.md` tree pruned of three obsolete state-file rows (`.docs-state.json`, `.finalize-state.json`, `.project-meta-state.json` — all relocated outside `.magic/` in earlier passes). `.gitignore` adds `dev/.cache/` and a defensive `.magic/.docs-state.json` entry.
- **Release workflow hygiene — `.github/workflows/release.yml`**: removed three obsolete exclude entries (`.magic/history`, `.magic/tests` — directories that no longer exist; `.magic/.docs-state.json` — file relocated and additionally never excluded correctly because the prior filter only matched directories, not individual files). Walk simplified to a plain `os.walk` since the engine kernel is now clean of dev/runtime artifacts. `timeout-minutes` raised `90 → 120` so the 4-attempt rate-limit retry backoff (15 + 30 + 45 = 90 min worst-case waits) has headroom beyond the job timeout.
- **Engine regression tests — `dev/tests/engine.js`**: removed obsolete tests 1a/1b that pre-seeded `.magic/.docs-state.json` and `.magic/.project-meta-state.json` to verify checksum exclusion — both files are now architecturally absent from `.magic/`, making the regression scenario impossible. Replaced with a single architecture-invariant test that asserts none of the three relocated state files exist inside `.magic/`. Test suite: **10/10 pass** (was 9 pass + 2 pre-existing failures from the prior `4323556` cleanup that left tests out of sync with the updated `VOLATILE_STATE_FILES`).
- **Agent version-check throttling — `rules/magic.md`**: remote engine version checks now use a persistent `.design/.cache/magic-version-check.json` marker, run at most once per project per 7 days, skip in CI, and fall back silently on network failures. `README.md` now documents the cached behavior instead of implying an uncached check on every agent session, and `.gitignore` excludes the runtime cache directory.
- **Engine token optimization — `.magic/pause.md`** (90 → 64 lines, ~29% reduction): rewrote the workflow under uniform compaction rules — STATE.md → HANDOFF.json field mappings tabularized, prose explanations tightened, decorative scaffolding removed. All invariants preserved verbatim: 4 Core Invariants, 5 Steps, both `update-state` executor invocations, all 6 STATE.md field extractions, `patterns_established` extraction from phase frontmatter, 5-step Resume Protocol, 3 error-handling cases. Pre-flight `ok: true` post-edit; engine version `2.1.3` → `2.1.4`.
- **Engine token optimization — `.magic/retrospective.md`** (~7% line reduction; structural improvements): L1/L2 levels promoted to a comparison table; 🟢/🟡/🔴 Signal thresholds restructured from prose bullets into a 3-row decision table; decorative section headers (`## Workflow: Feedback & Metrics`, `## Operational Logic (L1 & L2)`) collapsed into flat `## Steps`. All invariants preserved verbatim: 6 Core Invariants, 7 numbered Steps, all 3 executor invocations (`check-prerequisites`, `build-spec-graph`, `diff-spec-graph`), `@role:retrospective-analyst` activation, DORA metrics, Snapshot table format, all 11 checklist items. Engine version `2.1.4` → `2.1.5`.
- **Engine token optimization — `.magic/init.md`** (104 → 97 lines, ~7% line reduction; significant structural clarity gain): Step 1 (the canonical `init.md §1` referenced by every other workflow) restructured — pre-flight branches consolidated into a flat bulleted decision list, **C15 Filter** promoted to its own clearly-named subsection so weak-model agents can locate the procedure without inferring from nested context. WI-10 quote and Workspace Creation section reflowed for density. All invariants preserved verbatim: 5 Core Invariants, 4 Steps, mermaid diagram, all 3 executor invocations (`check-prerequisites`, `init`, `update-engine-meta`, `create-workspace`), all 5 pre-flight branches (`ok:true`, `ENGINE_INTEGRITY`/`GHOST_REGISTRY`, missing system files, unrecognized, `CONFIG_DRIFT`), C15 Filter 3-step procedure, all HALT message templates, Structure Created diagram, all 5 checklist items. Engine version `2.1.5` → `2.1.7`.
- **Engine token optimization — `.magic/context.md`** (155 → 119 lines, ~23% reduction): the canonical workspace-resolution chain referenced by Core Invariant #1 of every workflow. Verbose narrative paragraphs across Signal Classes (WI-2), Ambiguity Gate (WI-4), Skip Conditions, Outcome Routing, Resolution Chain, Workspace Disambiguation, Workspace Fit Validation (WI-7), and Post-Resolution all tightened — same fields, same branches, denser phrasing. All invariants preserved verbatim: §Step 0 with 3 outcomes (`existing/create/ambiguous`), Signal Classes 1-3 with all reference anchors, lexicon definition, WI-4 3-condition gate + 3-option menu, 4 Skip Conditions, Outcome Routing 3-row table, Resolution Chain 6-row priority table, all HALT templates, Workspace Disambiguation 4 steps, WI-7 Second Contour 4-step validation with score thresholds, 4 Post-Resolution items (item 4 = Resume Detection, preserving the `context.md §4` reference used by `pause.md` and `rules/magic.md`). Engine version `2.1.7` → `2.1.8`.
- **Engine token optimization — `workflows/` shim batch** (6 files, 278 → 268 lines, ~3% reduction): final batch of the engine-wide compaction pass. Six shim files (`magic.spec.md`, `magic.task.md`, `magic.run.md`, `magic.analyze.md`, `magic.rule.md`, `magic.graph.md`) brought to a uniform pattern — frontmatter (name, description, handoffs) + Triggers + scope/hints + Pipeline + Finalization pointer + `> **Full implementation: .magic/X.md** Read it before proceeding.` + `> **Executor:** ...` + `> **Anti-Hallucination Guard:** ...` (kept inline in every shim, not centralized — safer for weak-model agents that may not follow indirect references). `magic.analyze.md` shim received the `"Full implementation"` pointer it was missing, bringing it in line with the other shims (+3 lines for that consistency, offset by reductions elsewhere). `magic.graph.md` (93 lines) preserved structurally per user directive — only prose density improved. All `skills/*/SKILL.md` files automatically regenerated from updated workflows via `dev/scripts/sync-skills.js`. Engine version unchanged (workflows/ changes don't trigger C14 — only `.magic/` does).
- **Engine simulation fixes — `.magic/spec.md`** (2 surgical patches, v2.1.13 → v2.1.14): surfaced by `/magic.dev.simulate` improv-mode Logic Audit. Fix 1 (`spec.md:185`): added `C12 Quarantine` to the "re-evaluate all Sync guards" parenthetical in Resolution Validation — weak models could previously read the existing list `(RE-3, Cross-Workspace Parity, Existence Guard)` as exhaustive and skip C12 re-evaluation after a VERSION_DRIFT resolution, allowing a demoted L1 parent to go un-quarantined. Fix 2 (`spec.md §Post-Update Review`): added failure routing after item 7 — spec-critic findings previously had no explicit next-step path, allowing a C9 Trust Mode agent to present findings and close the task without blocking status promotion. Now: any Post-Update Review failure blocks promotion and retains current status (`Draft`/`RFC`). Both rough edges were pre-existing (not regressions from the token-optimization pass); all other guards confirmed PASS under Skeptic Persona (C24). Engine version `2.1.13` → `2.1.14`.
- **Engine coding discipline integration — roles + task/run templates**: folded the useful parts of the local Karpathy-style reference into the existing SDD role system instead of adding a separate skill. Coder now surfaces material assumptions and writes minimal diffs; Code-reviewer enforces changed-block traceability; Code-simplifier rejects speculative complexity; Code-skeptic classifies material assumptions; Test-engineer requires explicit `Verify` evidence. `.magic/task.md`, `.magic/run.md`, and `.magic/templates/phase.md` now require concrete `Verify` criteria before `Done`. Engine version `2.1.14` → `2.1.16`.
- **Engine token optimization — `.magic/analyze.md`** (397 → 395 lines, minimal reduction; structural clarity wins): consolidated Mode A and Mode B pre-flight blocks (previously near-verbatim duplicates) into a single **Shared Pre-flight (Modes A & B)** section that both modes reference via *"see Shared Pre-flight above"*. Disambiguated the two distinct sections previously both titled `## Advisory Report` — now `## Advisory Report — Findings Schema` (the 5-row Covered/Uncovered/Gaps/Drift/Shadow Logic categorization) and `## Advisory Report — Recommendations Format` (the 4-category Spec Quality / Coverage Strategy / Structural Improvements / Action Proposals recommendation structure with chat output example). Gitignore Safety renumbered from "Invariant 8" cross-reference to consistent Invariant 7 reference. All invariants preserved verbatim: 8 Core Invariants, Argument Routing 4 rows, Workspace Resolution pointer, Operational Logic 3 sub-sections (Stack & Structure, Architecture Inference 6-row pattern table, Module Detection), Confidence Taxonomy 4-level table + Coverage metric formula, Rationale Extraction 9-marker table + Shadow Logic, all 4 Modes (A: 5 steps, B: 4 steps + Gap Report sub-categories with Logic Evolution, C: 13 steps with all sub-bullets, D: 3 steps with HALT condition), Pre-Advisory Audit `@role:project-auditor` 3 hooks, Engine Snapshot Update, Reporting & Dispatch (Proposal Template + Dispatch Logic 3-step), all 3 mode-specific completion checklists (Mode A/B 10 items, Mode C 17 items, Mode D 7 items). Engine version `2.1.12` → `2.1.13`.
- **Engine token optimization — `.magic/spec.md`** (354 → 329 lines, ~7% reduction): largest L1 workflow file; primarily procedural so reduction came from compact Finalization Protocol pattern, tightened Specification Layers / Status Lifecycle / Trust Mode / MVC / Amendment Rule prose blocks, condensed Pre-flight branches in Creating and Updating sections, and reflowed Sync sub-bullets. All HALT conditions in §Updating preserved verbatim: Version Drift Guard + Resolution Validation + T4 Queue, Cross-Workspace Parity, Existence Guard, Parent Existence Guard + T4 Queue, RESCUE (AOP), C12 Quarantine cascade (4 steps recursive scan), Deprecation Cascade (3 steps), Renaming/Merging/Splitting + Refactoring Guard. All invariants preserved verbatim: 12 Core Invariants, Directory Structure diagram + table, Status Lifecycle mermaid + Trust Mode (C9) + MVC + Amendment rule, all Workflow Steps (Step 0 Workspace Intent Detection, Explore Mode, Mode Transition, Project Analysis Delegation, Dispatching from Raw Input + 4-step + Constraints, Creating + Updating + Batch Stabilization 6 steps, Post-Update Review 7 hooks via `@role:spec-critic`, Graph Refresh, Updating RULES.md with T4 Inline Guards 3 steps, Periodic Registry Audit, Consistency Check 6-row table), Templates pointer, all 10 checklist items. Engine version `2.1.11` → `2.1.12`.
- **Engine token optimization — `.magic/task.md`** (189 → 172 lines, ~9% reduction): applied the compact Finalization Protocol pattern, tightened Pre-flight branches (5 sub-conditions: C15 Filter, File-Header Parity, Cross-Workspace Parity, Cross-Workspace Parent Header Parity, T4 Queue), Pre-Planning Stabilization criteria, and Sync (Update Mode) sub-bullets. All invariants preserved verbatim: Context Quality Guidance 4-tier table (PEAK/GOOD/DEGRADING/POOR), Argument Routing 4 rows, 7 Core Invariants (incl. Architectural Logic with Circular Guard Semantic Split, C6 Bootstrap Exception, Cross-Workspace Parent Header Parity), Mermaid diagram, 8 Steps incl. Pre-Planning Stabilization with MVC criteria (a-d) and Field Normalization, `@role:planner` Planning Audit hooks (Optimism Bias, Hidden Dependencies, Cascade Risk), Plan Write-back + State Init/Update + Context Regeneration + Graph Refresh sections, Read-side wiki tip, all 13 checklist items. Engine version `2.1.10` → `2.1.11`.
- **Engine token optimization — `.magic/run.md`** (165 → 153 lines, ~7% reduction): applied the compact Finalization Protocol pattern (17 → 7 lines, -10), tightened Logic Guards prose, condensed Pre-flight branches, reflowed Step 4 (Update) sub-bullets. All invariants preserved verbatim: 6 Argument Routing rows, 6 Core Invariants (incl. Invariant #2.5 Live Memory STATE.md), 7 Logic Guards (Dependency, Mode, Sync, Quarantine C12, Spec Stability, Phantom Spec, Pause Propagation) with all HALT message templates, Execution Setup table (Sequential/Parallel), Mermaid diagram, all 5 Steps + sub-steps 3.3/3.4/3.5/3.6, all role activations (`@role:coder`, `@role:code-skeptic`, `@role:code-reviewer`, `@role:test-engineer`, `@role:code-simplifier`, `@role:debugger`, `@role:docs-specialist`, `@role:orchestrator`, `@role:planner`), 4-step Plan Completion Succession Loop, all 11 checklist items. Engine version `2.1.9` → `2.1.10`.
- **Engine token optimization — `.magic/rule.md`** (152 → 144 lines, ~5% reduction): primarily establishes the **compact Finalization Protocol pattern** (17 → 7 lines) that will be reused across `run.md`, `task.md`, and `spec.md` in subsequent commits. Operational Logic step branches and Post-Write Impact prose tightened. Both Constitutional Reviews preserved (pre-commitment §5 with hooks `Core Conflict / Cognitive Consistency / Operational Friction`; post-write §7 with distinct hooks `practical conflict / vague qualifiers / retroactive application`). All invariants preserved verbatim: 5 Core Invariants, Rule Tier Routing 3 cases, Mermaid diagram, 5 Operational Logic steps, Actions table 5 rows, Dependency Scan, Workspace RULES.md template, §6 Write & Sync, §7 Graph Refresh + Constitutional Review (post-write) + Notify/Offer Sync/Compliance, C24 HALT message, all 10 checklist items. Engine version `2.1.8` → `2.1.9`.
- Updated 5 specifications (engine)
- Updated task plan and task index (engine)
- Added 2 specifications (engine)

## [2.1.3] - 2026-05-07

### Changed

- **Internationalisation pass**: removed all Cyrillic tokens from engine and spec files (`.magic/context.md`, `l1-workspace-intent-routing.md`, simulation matrix). Detection of creation intent is now declared as **semantic** — the agent recognises equivalent phrasings in any natural language it understands without a hardcoded language token table. The English exemplars in WI-2.1 are reference anchors, not an exhaustive list. The project codebase, specifications, and technical documentation are English-only; non-English content is reserved for chat with the maintainer or explicit user request.
- **`.design/RULES.md` (1.6.1 → 1.7.0)**: backported §C25 Engineer Posture from `.magic/templates/rules.md` (was missing in the project constitution despite being referenced by every workflow checklist), and added §C26 Workspace Intent Routing covering pre-resolution detection, auto-create-on-clear-signal, ambiguity gate, second-contour fit validation, atomic creation, doc/code parity invariant, and executor auto-mkdir.

### Fixed

- **`dev/tests/engine.js` test harness**: previous `createTempWorkspace()` only mirrored `.magic/scripts/` into the temp dir, but tests reference dev-only scripts (`generate-checksums.js`, `sync.js`) at `.magic/scripts/` paths — their canonical home is `dev/scripts/`. Test harness now mirrors both directories and applies a non-overwriting compatibility shim: dev scripts are copied to `tempDir/.magic/scripts/` only when no production counterpart exists, preventing the dev `executor.js` (which intentionally lacks workspace validation) from overwriting the production one. Result: **11/11 tests pass** (was 0/11 — every test failed at setup).

### Notes

- **Engine version**: `2.1.2` → `2.1.3` (patch — internationalisation + test harness fix; no logic changes to the routing chain itself).
- **Engineer Posture parity**: project `.design/RULES.md` now contains C25 and C26 inline, matching the template (`.magic/templates/rules.md`). The pre-existing template/project drift around C25 is closed; future projects bootstrapped from the template are unchanged.

## [2.1.2] - 2026-05-07

### Added

- **`l1-workspace-intent-routing.md`** (new L1 spec, `.design/engine/specifications/`): formalises Workspace Intent Detection (WI-1 through WI-10) — a pre-resolution stage that classifies user input into `existing:{name}` / `create:{name}` / `ambiguous` before the existing Workspace Resolution Chain. Defines signal classes (creation token, stack/platform delta, domain delta), lexicon definition, ambiguity gate (overlap ≥30% threshold), atomic creation contract, and second-contour fit validation. Twelve canonical interaction outcomes (A1–F2) constitute the simulation matrix.
- **`.magic/scripts/create-workspace.js`** (new executor script): atomically registers a workspace in `workspace.json` and provisions `.design/{name}/{specifications,tasks,archives/tasks,INDEX.md}`. Validates name regex, halts on duplicate registration or existing-but-unregistered directory, rolls back on partial failure. Supports `--name=`, `--description="..."`, `--default`, `--dry-run`. Invoked automatically by `magic.spec` Step 0 on `create:{name}` outcome.
- **`.magic/context.md` §Workspace Fit Validation**: second contour after resolution — match score below 0.30 in multi-workspace projects re-enters the WI-4 menu; single-workspace projects emit informational narration only.
- **`.magic/spec.md` §Step 0 Workspace Intent Detection (Mandatory Pre-Step)**: integration point between the workflow and the new chain. Detection result is recorded for the duration of the invocation.
- **§C26 Workspace Intent Routing** (`.magic/templates/rules.md`): new convention codifying the routing protocol, auto-create contract, ambiguity gate, fit validation, atomic creation, doc/code parity invariant, and executor auto-mkdir.

### Changed

- **`.magic/scripts/executor.js`**: replaced silent fallback to `.design/` root with WI-9 auto-mkdir. When a workspace registered in `workspace.json` has no directory on disk, the executor now provisions the standard subtree (`specifications/`, `tasks/`, `archives/tasks/`) before dispatching the script — preventing field-observed accumulation of artifacts at the global registry level.
- **`.magic/init.md` §Structure Created**: corrected diagram now shows the per-workspace layout that `init.js` actually produces (with `INDEX.md`, `RULES.md`, `workspace.json` at root and the `{workspace}/` subtree containing `INDEX.md`, `STATE.md`, `specifications/`, `tasks/`, `archives/tasks/`). The previous diagram showed a flat root layout that contradicted the code, causing agents to write spec files into `.design/` root.
- **`.magic/init.md`**: added §Workspace Creation (Post-Bootstrap) documenting the `create-workspace` executor script for adding workspaces to existing projects.
- **`.design/engine/INDEX.md`**: registered `l1-workspace-intent-routing.md` as Stable v1.0.0; spec count 14 → 15; registry version 1.9.0 → 1.10.0.
- **`.design/INDEX.md`**: project version 1.2.2 → 1.3.0; engine version snapshot 2.1.0 → 2.1.2.

### Fixed

- **Field-bug-1 (spec files in `.design/` root)**: doc/code divergence in `init.md` plus silent fallback in `executor.js` jointly caused spec writes to land at `.design/` root in single-workspace projects when the workspace directory was missing on disk. Both root causes addressed (WI-9, WI-10).
- **Field-bug-2 (new-workspace intent ignored)**: the resolution chain had no detection stage — Priority 3 silently picked the default workspace even when user input clearly named a new domain or stack. New §Step 0 detects intent before resolution and either auto-creates or asks a single multi-choice question (WI-1, WI-2, WI-4).

### Notes

- **Engine version**: `2.1.1` → `2.1.2` (patch — additive automation; no HALT logic or HARD gates altered).
- **C25 scope adjustment**: the WI-4 ambiguity question is the single Engineer Posture exception during specification authoring. Justified in C26 by the high cost of silent mis-routing relative to one prompt.
- **Backwards compatibility**: existing workflows continue to function unchanged when no creation signal is present (outcomes A2/A3/A4 preserve current behaviour). Projects that never trigger the new detection paths see no behavioural difference.

## [2.1.0] - 2026-05-07

### Changed

- **C9 redefined as Default Autonomous Execution** (`.magic/templates/rules.md`): the agent now executes the full SDD lifecycle (Draft → RFC → Stable → Plan → Task → Run) autonomously by default. User input is solicited **only** at a closed list of 11 objective gates (Destructive Actions, Core-Amendment §1–6, Architectural Hard Fork, Cross-Workspace Parity Collision, VERSION_DRIFT/STATUS_DRIFT, Engine Integrity Failure, Depth Control >500 files, Pause/STATE.md ack, Changelog L2 release artifacts, Constitutional Guard, Hard-Dependency Cycle). Outside these gates, asking for confirmation, presenting choice menus, or hesitating is forbidden.
- **`.magic/rule.md`**: replaced **No Silent Writes** invariant with **Narrate Writes (C25)** — changes are applied immediately and the diff is shown inline as the write happens. Approval gate now applies ONLY to Core-Amendment (§1–6) and Constitutional Guard. Mermaid graph updated: `Apply Change → Update History` replaces `Propose → Approve → Write`. Trust Mode is no longer batch-only — it is the universal §7 default.
- **`.magic/spec.md`**: Explore Mode now auto-picks highest-coverage gap if user does not provide concrete direction next turn. Mode Transition triggers on first concrete-input message (no 2nd-exchange wait). Zero-Prompt Handoff invokes `/magic.task` automatically post-dispatch. **Ambiguity** constraint replaced — open questions are recorded as `<!-- TBD: {question} -->` inline, agent never asks clarifying questions.
- **`.magic/analyze.md`**: Mode A Step 3 — replaced the `(a) Approve all / (b) Select / (c) Adjust / (d) Cancel` menu with auto-dispatch + action log. Mode B Step 3 — per-item approval replaced with batch auto-dispatch; advisory items surfaced as actionable `→` next-step links rather than approval prompts.
- **`.magic/task.md`**: User Gate wording updated — Auto-Plan narrates inline as the work happens; no "Go" confirm.
- **`.magic/run.md`**: Changelog L2 — release-artifact gate is now the standard git commit step (per Finalization Protocol), not an inline Yes/No prompt.

### Added

- **§C25 — Engineer Posture (Narrate-and-Act)** (`.magic/templates/rules.md`): forbids tentative phrasing (`"Should I…"`, `"Do you want me to…"`, `"Would you like…"`, `"How should we proceed?"`, choice menus of the form `(a)…/(b)…/(c)…`) outside C9 objective gates. Mandates declarative narration (`"Writing X."`, `"Promoted Y to Stable."`, `"[Auto-SDD] …"`). Includes a revert-hint convention for non-trivial auto-actions.
- **Completion Checklist line** added to `.magic/{rule,spec,task,run,analyze}.md`: `☐ Engineer Posture (C25): no clarifying prompts outside C9 objective gates`.

### Removed

- **8 SOFT prompts**: 4-option menu in `magic.analyze` Mode A Step 3 · "ask user for direction" in `magic.spec` Explore Mode · 2nd-exchange Auto-Transfer gate in Mode Transition · "Proceed to Plan/Run?" wait in Zero-Prompt Handoff · "Ask one clarifying question" constraint · batch-only Trust Mode caveat in `magic.rule` · Propose/Approve gate in `magic.rule` mermaid + Step 5 · per-item approval in `magic.analyze` Mode B advisory.

### Notes

- **Engine version**: `2.0.29` → `2.1.0` (minor — behaviorally additive automation; HARD gates and HALT conditions are preserved verbatim).
- **User projects** pick up new C9 semantics on their next `/magic.analyze` engine drift check (per `.agents/rules/magic.md §2 Engine Drift Auto-Analyze`).
- **Worst-case revert**: `git restore .design/INDEX.md` (or any single file) — engine writes are narrated inline (not silent), so all auto-actions are visible and reversible via standard git.

## [2.0.26] - 2026-05-06

### Added

- **Finalization Protocol**: New post-workflow automation for `/magic.spec`, `/magic.task`, `/magic.run`, `/magic.rule`. After each significant workflow invocation the engine now automatically (a) bumps the user project's patch version in `.design/.version`, (b) appends an entry to the root `CHANGELOG.md` in Keep-a-Changelog format, and (c) prints a Conventional Commits suggested message to the agent for relay to the user. The agent never auto-commits — the commit is always the user's decision.
- **`finalize.js`** — new executor script (`node .magic/scripts/executor.js finalize --workflow=<spec|task|run|rule>`). Supports `--dry-run`, `--no-bump`, `--no-changelog`, `--no-commit-msg`, `--force`. Kill-switch via `MAGIC_FINALIZE=0` env var.
- **`lib/project-version.js`** — read/parse/bump/write `.design/.version` (SemVer patch, initial `0.1.0`).
- **`lib/significance.js`** — hard-whitelist artifact detector: uses `git diff` (fallback: SHA snapshot) to determine whether changes are significant enough to trigger finalization. Per-workflow artifact whitelists; `magic.run` also checks TASKS.md status-line diffs.
- **`lib/changelog-writer.js`** — idempotent Keep-a-Changelog mutator. Creates missing CHANGELOG, inserts bullets under `[Unreleased]`, renames to `[X.Y.Z] - YYYY-MM-DD` on version bump. Falls back to prepend-with-marker for non-standard CHANGELOG files.
- **`lib/commit-suggester.js`** — template-based Conventional Commits generator from git diff context. Machine-readable body optimised for AI agent `git log` consumption.
- **`lib/git-utils.js`** — read-only git wrappers (`changedPaths`, `fileNumstat`, `fileStatus`, `headSha`). Never calls write-side git commands.
- **`rules/magic.md §4 Finalization Protocol`** — agent rules covering trigger scope, procedure, opt-out knobs, significance whitelist, and separation of concerns (root CHANGELOG vs internal phase journal).
- **`finalization` config block in `.design/workspace.json`** — per-project opt-out and path overrides.

### Changed

- **`.magic/spec.md`, `.magic/task.md`, `.magic/run.md`, `.magic/rule.md`**: Added `## Finalization Protocol (Mandatory)` section before each workflow's Completion Checklist.
- **`workflows/magic.{spec,task,run,rule}.md`**: Added `Finalization` hint bullet to wrapper files; skills auto-synced via C14.
- **`scripts/utils.js`**: Added `.finalize-state.json` to `VOLATILE_STATE_FILES` so it is excluded from engine checksums.
- **Engine version**: `2.0.25` → `2.0.26`.

## [2.0.19] - 2026-05-04

### Changed

- **`rules/magic.md`**: Synchronized the **Completion Protocol (Mandatory Checklist)** with `AGENTS.md` and global rules.

## [2.0.18] - 2026-05-02

### Added

- **Consolidated Agent Rules**: New unified rule file `rules/magic.md` merges the previous three rule files into a single document with three sections: §1 Engine Version Check (local ↔ remote), §2 Engine Drift Auto-Analyze (local ↔ snapshot), §3 Specification Knowledge Graph.
- **Engine Drift Auto-Analyze** (`rules/magic.md` §2): At the start of any `/magic.*` workflow (except `/magic.analyze` itself), the agent compares `.magic/.version` against the `**Engine Version:**` snapshot in `.design/INDEX.md`. On any difference (including patch), it emits a WARNING and auto-runs `/magic.analyze` to revalidate the project against the new engine. The user can interrupt and skip.
- **Engine Version Snapshot**: `.design/INDEX.md` now records the engine version under which the project was last analyzed (`**Engine Version:**` field). Updated automatically by `/magic.analyze` in all modes (A/B/C/D).

### Changed

- **`.magic/analyze.md`**: Added "Engine Snapshot Update" mandatory step and corresponding checklist entries in Mode A/B, Mode C, and Mode D checklists. Snapshot writes are `.design/`-only and do not trigger C14.
- **`.gitignore`**: Updated `.agents/rules/magic-*.md` pattern to `.agents/rules/magic*.md` to also cover the new consolidated `magic.md` junction target.

### Removed

- `rules/magic-version-check.md`, `rules/magic-engine-drift.md`, `rules/magic-graph.md` — content folded into `rules/magic.md` (single source of truth).

## [2.0.8] - 2026-04-29

### Fixed

- Completed the GitHub-only distribution cleanup by removing the archived `.design/installers` workspace.
- Restored the README legacy package freeze notice for npm and PyPI users.
- Removed active installer-era references from workflows, skills, docs, engine scripts, tests, and design metadata.
- Updated release archive generation to include README.md and exclude volatile engine state caches.

## [2.0.3] - 2026-04-29

### Added

- **Automated Release Workflow**: New `magic.dev.release` workflow and `.agents/skills/magic-dev-release/scripts/release.js` script to handle validation, tagging, and pushing in a single command.
- **Universal Release Command**: `node .magic/scripts/executor.js release` now triggers the full release sequence.

## [2.0.2] - 2026-04-29

### Changed

- **Testing Infrastructure**: Updated engine tests to align with manifest removal and script-based versioning.
- **Project Sync**: Improved `sync-manifests.js` robustness and README anchoring.

## [2.0.1] - 2026-04-29

### Fixed

- **Sync Logic**: Resolved syntax errors in `sync-manifests.js` and `update-engine-meta.js` following the v2.0.0 transition.

## [2.0.0] - 2026-04-29

### Breaking Changes

- **Removed installer layer**: `installers/` directory deleted entirely. `npx magic-spec` (npm) and `uvx magic-spec` (PyPI) packages will no longer receive updates (last version: 1.5.207).
- **Distribution model changed**: Engine is now distributed via GitHub Releases. Download `.magic/`, `workflows/`, `skills/`, and `rules/` directly from the [Releases page](https://github.com/teratron/magic-spec/releases/latest).
- **Deleted `package.json` & `pyproject.toml`**: Removed all traces of Node/Python package manifests to achieve a weightless, script-based engine.
- **Deleted `.agents/workflows/magic.dev.publish.md`**: Legacy publish workflow removed in favor of direct GitHub Actions automation.
- **Added `rules/` directory**: New top-level directory for AI agent rule documents distributed with the engine.
- **Added `rules/version-check.md`**: AI agent rule that detects when a newer magic-spec version is available by comparing `.magic/.version` against GitHub master. Runs once per day at session start.
- **Added `.github/workflows/release.yml`**: Automated GitHub Release creation on `v*` tags.

### Changed

- **README.md**: Complete rewrite. Installation section now describes GitHub Releases download and manual clone. New Adapter Paths table lists 19 AI agents with target directories and file extensions. Removed npm/PyPI badges and Requirements section.
- **AGENTS.md** (+ CLAUDE.md, CODEX.md, GEMINI.md): Removed Section 1.2 "Installers", renumbered sections, removed Rule 2.4 "Installer Isolation". Distribution note updated to reference `rules/version-check.md`.
- **`.design/workspace.json`**: Removed `installers` workspace. Added `rules/`, `package.json`, `pyproject.toml`, `uv.lock` to engine scope.
- **`.magic/analyze.md`**: Updated installer references to engine examples.

### Deprecated

- **v1.5.x branch** (`v1.5`): Preserved as static archive of the last installer-based release. npm and PyPI packages frozen at v1.5.207.
