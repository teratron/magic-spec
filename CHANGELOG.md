# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Engine token optimization — `.magic/pause.md`** (90 → 64 lines, ~29% reduction): rewrote the workflow under uniform compaction rules — STATE.md → HANDOFF.json field mappings tabularized, prose explanations tightened, decorative scaffolding removed. All invariants preserved verbatim: 4 Core Invariants, 5 Steps, both `update-state` executor invocations, all 6 STATE.md field extractions, `patterns_established` extraction from phase frontmatter, 5-step Resume Protocol, 3 error-handling cases. Pre-flight `ok: true` post-edit; engine version `2.1.3` → `2.1.4`.
- **Engine token optimization — `.magic/retrospective.md`** (~7% line reduction; structural improvements): L1/L2 levels promoted to a comparison table; 🟢/🟡/🔴 Signal thresholds restructured from prose bullets into a 3-row decision table; decorative section headers (`## Workflow: Feedback & Metrics`, `## Operational Logic (L1 & L2)`) collapsed into flat `## Steps`. All invariants preserved verbatim: 6 Core Invariants, 7 numbered Steps, all 3 executor invocations (`check-prerequisites`, `build-spec-graph`, `diff-spec-graph`), `@role:retrospective-analyst` activation, DORA metrics, Snapshot table format, all 11 checklist items. Engine version `2.1.4` → `2.1.5`.
- **Engine token optimization — `.magic/init.md`** (104 → 97 lines, ~7% line reduction; significant structural clarity gain): Step 1 (the canonical `init.md §1` referenced by every other workflow) restructured — pre-flight branches consolidated into a flat bulleted decision list, **C15 Filter** promoted to its own clearly-named subsection so weak-model agents can locate the procedure without inferring from nested context. WI-10 quote and Workspace Creation section reflowed for density. All invariants preserved verbatim: 5 Core Invariants, 4 Steps, mermaid diagram, all 3 executor invocations (`check-prerequisites`, `init`, `update-engine-meta`, `create-workspace`), all 5 pre-flight branches (`ok:true`, `ENGINE_INTEGRITY`/`GHOST_REGISTRY`, missing system files, unrecognized, `CONFIG_DRIFT`), C15 Filter 3-step procedure, all HALT message templates, Structure Created diagram, all 5 checklist items. Engine version `2.1.5` → `2.1.7`.
- **Engine token optimization — `.magic/context.md`** (155 → 119 lines, ~23% reduction): the canonical workspace-resolution chain referenced by Core Invariant #1 of every workflow. Verbose narrative paragraphs across Signal Classes (WI-2), Ambiguity Gate (WI-4), Skip Conditions, Outcome Routing, Resolution Chain, Workspace Disambiguation, Workspace Fit Validation (WI-7), and Post-Resolution all tightened — same fields, same branches, denser phrasing. All invariants preserved verbatim: §Step 0 with 3 outcomes (`existing/create/ambiguous`), Signal Classes 1-3 with all reference anchors, lexicon definition, WI-4 3-condition gate + 3-option menu, 4 Skip Conditions, Outcome Routing 3-row table, Resolution Chain 6-row priority table, all HALT templates, Workspace Disambiguation 4 steps, WI-7 Second Contour 4-step validation with score thresholds, 4 Post-Resolution items (item 4 = Resume Detection, preserving the `context.md §4` reference used by `pause.md` and `rules/magic.md`). Engine version `2.1.7` → `2.1.8`.
- **Engine token optimization — `workflows/` shim batch** (6 files, 278 → 268 lines, ~3% reduction): final batch of the engine-wide compaction pass. Six shim files (`magic.spec.md`, `magic.task.md`, `magic.run.md`, `magic.analyze.md`, `magic.rule.md`, `magic.graph.md`) brought to a uniform pattern — frontmatter (name, description, handoffs) + Triggers + scope/hints + Pipeline + Finalization pointer + `> **Full implementation: .magic/X.md** Read it before proceeding.` + `> **Executor:** ...` + `> **Anti-Hallucination Guard:** ...` (kept inline in every shim, not centralized — safer for weak-model agents that may not follow indirect references). `magic.analyze.md` shim received the `"Full implementation"` pointer it was missing, bringing it in line with the other shims (+3 lines for that consistency, offset by reductions elsewhere). `magic.graph.md` (93 lines) preserved structurally per user directive — only prose density improved. All `skills/*/SKILL.md` files automatically regenerated from updated workflows via `dev/scripts/sync-skills.js`. Engine version unchanged (workflows/ changes don't trigger C14 — only `.magic/` does).
- **Engine simulation fixes — `.magic/spec.md`** (2 surgical patches, v2.1.13 → v2.1.14): surfaced by `/magic.dev.simulate` improv-mode Logic Audit. Fix 1 (`spec.md:185`): added `C12 Quarantine` to the "re-evaluate all Sync guards" parenthetical in Resolution Validation — weak models could previously read the existing list `(RE-3, Cross-Workspace Parity, Existence Guard)` as exhaustive and skip C12 re-evaluation after a VERSION_DRIFT resolution, allowing a demoted L1 parent to go un-quarantined. Fix 2 (`spec.md §Post-Update Review`): added failure routing after item 7 — spec-critic findings previously had no explicit next-step path, allowing a C9 Trust Mode agent to present findings and close the task without blocking status promotion. Now: any Post-Update Review failure blocks promotion and retains current status (`Draft`/`RFC`). Both rough edges were pre-existing (not regressions from the token-optimization pass); all other guards confirmed PASS under Skeptic Persona (C24). Engine version `2.1.13` → `2.1.14`.
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
