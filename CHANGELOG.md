# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Engine token optimization — `.magic/pause.md`** (90 → 64 lines, ~29% reduction): rewrote the workflow under uniform compaction rules — STATE.md → HANDOFF.json field mappings tabularized, prose explanations tightened, decorative scaffolding removed. All invariants preserved verbatim: 4 Core Invariants, 5 Steps, both `update-state` executor invocations, all 6 STATE.md field extractions, `patterns_established` extraction from phase frontmatter, 5-step Resume Protocol, 3 error-handling cases. Pre-flight `ok: true` post-edit; engine version `2.1.3` → `2.1.4`.
- **Engine token optimization — `.magic/retrospective.md`** (~7% line reduction; structural improvements): L1/L2 levels promoted to a comparison table; 🟢/🟡/🔴 Signal thresholds restructured from prose bullets into a 3-row decision table; decorative section headers (`## Workflow: Feedback & Metrics`, `## Operational Logic (L1 & L2)`) collapsed into flat `## Steps`. All invariants preserved verbatim: 6 Core Invariants, 7 numbered Steps, all 3 executor invocations (`check-prerequisites`, `build-spec-graph`, `diff-spec-graph`), `@role:retrospective-analyst` activation, DORA metrics, Snapshot table format, all 11 checklist items. Engine version `2.1.4` → `2.1.5`.
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
