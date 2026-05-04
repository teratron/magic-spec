# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.19] - 2026-05-04

### Changed

- **`rules/magic.md`**: Synchronized the **Completion Protocol (Mandatory Checklist)** with `AGENTS.md` and global rules. Added technical language policy (English), communication policy (Russian), formatting rules, and workflow-specific validation/versioning/synchronization steps.

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

## [1.5.207] - 2026-04-29

### Changed

- **README.md**: Added deprecation notice for npm/PyPI installer packages (last version: 1.5.206).

## [1.5.206] - 2026-04-28

### Meta

- **Engine Sync**: Final hygiene and version synchronization (C14) before global release.
- **Validation**: All 18 core tests passed on Windows environment.

## [1.5.204] - 2026-04-25

### Fixed

- **`sync-docs.js`**: Removed greedy global `vX.Y.Z` regex that overwrote unrelated version mentions. Removed `today's date` from `CONTRIBUTING.md` footer (now uses latest source mtime). `## Sync Note` only refreshes when the matching workflow source hash changes or the engine version actually bumps. Adds `.magic/.docs-state.json` for per-workflow content tracking.
- **`sync-manifests.js`**: Replaced greedy `(\(v?\d+\.\d+\.\d+\))/g` README sweep with anchored `**Active Development** (vX.Y.Z)` and an optional `<!-- engine-version -->...<!-- /engine-version -->` marker. Added `installers/python/magic_spec/__init__.py` to the manifest set.
- **`update-project-meta.js`**: Made idempotent via SHA-256 structural digest stored in `.magic/.project-meta-state.json` (volatile fields stripped before hashing). Bump + history append now happen only on real change. Added Smart-History dedup (same-day same-message rows collapse into a version range). Fixed history insertion to honor newest-first table convention by anchoring to the matched header's slice instead of the file's first divider.

### Added

- **`validate-hardlinks.js`**: New script verifies `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, `CODEX.md` share the same inode as `AGENTS.md`. Tolerant by default; pass `--strict` to fail on missing siblings.
- **`sync.js`**: Hardlink validation wired in as a pipeline step. New flags: `--skip-links`, `--strict-links`.

### Changed

- **`magic.dev.sync.md` workflow**: Rewritten to describe the actual pipeline (was claiming a "Hardlink Validation" step that did not exist).
- **`update-engine-meta.js`**: `.docs-state.json` and `.project-meta-state.json` now ignored by drift detection (volatile state caches, not engine logic).

## [1.5.198] - 2026-04-24

### Fixed

- **Version Parity**: Synchronized metadata, documentation, and installers across the repository.
- **Hardlink Validation**: Verified agent link integrity.

## [1.5.171] - 2026-04-24

### Added

- **Spec Graph extraction cache** (`.magic/scripts/graph-cache.js`): Per-file SHA-256 cache of parsed spec metadata (refs, parent, conventions). Frontmatter-aware hashing for Markdown — metadata-only edits (`Version`, `Last Updated`, `Status`) do not invalidate cache. Cache lives at `$designDir/.graph-cache/` (gitignored). 100% hit rate on unchanged re-runs.
- **Spec Graph Wiki export** (`.magic/scripts/export-wiki.js`): Generates an agent-navigable Markdown wiki at `$designDir/wiki/` — `index.md` + one page per workspace + one article per spec, with Obsidian-style `[[wiki-links]]` between them. Surfaces god nodes, knowledge gaps, and implements chains. Usage: `node .magic/scripts/executor.js export-wiki [--from-file graph.json] [--out dir]`.
- **Token-budget truncation on MCP `query_graph`**: The `query_graph` tool in `serve-spec-graph.js` now accepts a `token_budget` argument (default 2000). Output is truncated at `chars = budget × 4` with an explicit sentinel, preventing unbounded responses as the graph grows.
- **Spec**: `.design/engine/specifications/l2-spec-graph-memory.md` — Layer 2 specification adapting three memory / token-economy mechanisms from the external project.

### Changed

- **`build-spec-graph.js`**: Integrated extraction cache via `graph-cache.js`. Added `--no-cache` flag. Summary now reports cache hits/misses.
- **`.design/engine/INDEX.md`**: Registered `l2-spec-graph-memory.md` (engine registry → v1.8.0).

### Meta

- **Engine version**: `1.5.195` → `1.5.197` (C14 auto-bump: initial scripts, then post-review fixes).
- **Package version**: `1.5.170` → `1.5.171`.

## [1.5.176] - 2026-04-23

### Added

- **Specification Knowledge Graph** (`build-spec-graph.js`): Full `extract → build → analyze → export` pipeline over `.design/` SDD artifacts. Produces workspace/spec/file/convention/phase nodes with edges. Outputs human-readable summary (default), `--json` for machine-readable, `--html` for interactive vis.js visualization. Includes God Nodes, orphaned files, missing Implements, bridge specs, and per-workspace coverage stats.
- **Community Detection** (`detect-communities.js`): Label Propagation algorithm (pure JS, no deps) on a multi-layer dependency graph (JS `require()`, Python imports, Markdown cross-references). Computes cohesion, modularity, and Jaccard alignment against `workspace.json`. Flags oversized communities with BFS-based split suggestions. Use `--include-md` for richer 8-community structure.
- **Incremental SHA256 Cache** (`cache-utils.js`): Shared cache module with atomic writes, frontmatter-stripped hashing for `.md` files, dead-entry pruning, and OS-agnostic path keys. Ready for use by any analyze script via `require('./cache-utils')`.
- **Graph Diff** (`diff-spec-graph.js`): Retrospective structural diff between two `build-spec-graph --json` snapshots. Surfaces node/edge additions and removals, degree changes, god node evolution, per-workspace coverage deltas, and orphan/convention drift.
- **MCP Server** (`serve-spec-graph.js`): stdio MCP server (JSON-RPC 2.0) exposing the SDD graph as 7 AI-agent tools: `query_graph`, `get_node`, `get_neighbors`, `find_gaps`, `shortest_path`, `get_coverage`, `god_nodes`. Builds the graph on startup via `build-spec-graph --json`.
- **Token Benchmark** (`benchmark.js`): Quantitative token efficiency measurement — raw corpus (238K tokens), spec layer (16K, 14.5× cheaper), BFS graph query (2.2K avg, 107.9× cheaper). Provides evidence of SDD's context economy.
- **Confidence Taxonomy** (`analyze-coverage.js`): Four-level file coverage classification (EXTRACTED / INFERRED / AMBIGUOUS / UNCOVERED) integrated into Mode B/C of `magic.analyze`.
- **Rationale Extraction** (`extract-rationale.js`): Scans source files for structured design markers (`NOTE`, `WHY`, `HACK`, `IMPORTANT`, `TODO`, etc.) and identifies Shadow Logic — design decisions not captured in any spec.

### Changed

- **`magic.analyze` Mode C** (Ventilation): Added steps 6 (Specification Knowledge Graph via `build-spec-graph`) and 7 (Workspace Boundary Analysis via `detect-communities --include-md`). Updated completion checklist with two new items.
- **`magic.retrospective`**: Added Graph Snapshot (`build-spec-graph --json`) and Graph Diff (`diff-spec-graph`) to the Collect step. Updated Retrospective Completion Checklist with two new items.

### Meta

- **Engine version**: bumped to `1.5.176` (eight new scripts auto-detected and checksummed by C14).

## [1.5.170] - 2026-04-19

### Fixed

- **Read-Only Invariant (sync orchestrator)**: `node .magic/scripts/executor.js sync --dry-run` previously performed real writes because `sync.js` silently ignored unknown flags and sub-scripts had no dry-run support. All sync sub-scripts (`sync-manifests`, `sync-docs`, `update-project-meta`, `update-engine-meta`, `generate-checksums`, `sync-skills`) now honor `MAGIC_DRY_RUN=1` via shared helpers in `utils.js` (`writeFileSafe`, `appendFileSafe`, `mkdirSafe`).
- **Strict CLI Contract**: `sync.js` now rejects unknown flags with exit code `2` and an explicit accepted-flags list, preventing silent-ignore regressions.

### Added

- **`utils.js` safe-writer helpers**: `isDryRun()`, `writeFileSafe()`, `appendFileSafe()`, `mkdirSafe()` — centralize the filesystem mutation gate so future scripts inherit dry-run support by default.

## [1.5.169] - 2026-04-18

### Added

- **Core Workflow Documentation**: Added documentation and metadata files to `.magic/` for all core workflows.
- **Engine Hardening**: Improved engine integrity checks and metadata synchronization robustness.

### Changed

- **Agent References**: Fixed typos and updated tool references in `.agents/` documentation.
- **Gitignore**: Added `.kilocode` to project ignore list.

### Meta

- **Engine Sync**: Full project hygiene sync; validated engine metadata (C14 parity).

## [1.5.160] - 2026-04-11

### Added

- **Hierarchical History**: Organized `.magic/history` into logical subfolders (`workflows`, `scripts`, `tests`, `skills`, `.agents/workflows`).
- **Engine Core Expansion**: Updated `update-engine-meta.js` and `generate-checksums.js` to scan and track all core engine directories, including root `workflows/` and `.agents/workflows/` (C14 parity).
- **Comprehensive Tracking**: All `.md` files and scripts within engine directories now have automated hierarchical history tracking.

### Meta

- **Engine Sync**: Performed project hygiene sync, organized history, and validated engine metadata (C14 parity).

## [1.5.159] - 2026-04-10

### Meta

- **Engine Sync**: Performed project hygiene sync, updated documentation, and validated engine metadata (C14 parity).

## [1.5.143] - 2026-04-09

### Added

- **Agent Memory (STATE.md)**: New live memory system — a ≤100-line project state digest read first in every workflow session. Tracks current position, recent decisions, blockers, and blocking constraints. Template: `.magic/templates/state.md`. Utility: `.magic/scripts/update-state.js`.
- **Session Continuity (HANDOFF.json)**: Structured cross-session handoff mechanism. Template: `.magic/templates/handoff.json`. Enables zero-prompt resume from exact position with required reading lists and constraint acknowledgment.
- **Pause Workflow (`pause.md`)**: New `/magic.pause` workflow that snapshots session state into `HANDOFF.json` and sets `STATE.md` status to `Paused`. Supports automatic trigger at POOR context tier.
- **Phase Frontmatter**: YAML dependency metadata block in `phase.md` template (`requires`, `provides`, `key_files`, `patterns_established`, `subsystem`, `duration_minutes`). Enables machine-readable inter-phase dependency tracking.
- **Canonical References**: New mandatory `## Canonical References` section in `spec.md` template. Forces downstream agents to bind to specific stable file paths instead of relying on memory. Audit checks added to `analyze.md` and `spec.md` checklists.
- **Context Quality Tiers**: Adaptive agent behaviour guidance (PEAK/GOOD/DEGRADING/POOR) based on context window utilization. Added to `task.md` workflow header.
- **Resume Detection**: Integrated into `context.md` Post-Resolution chain (Priority 3-4). Automatically detects paused sessions and resumes from recorded position.
- **Pause Propagation**: `run.md` Logic Guard that auto-saves state when all phase tasks are blocked.

### Changed

- **`context.md`**: Extended Post-Resolution chain with STATE.md loading (Priority 3) and Resume Detection (Priority 4).
- **`init.md`**: STATE.md creation added to init steps, structure map, and completion checklist.
- **`run.md`**: Added Live Memory invariant (2.5), STATE Sync in Update step, Frontmatter Update in Phase Completion, and Pause Propagation guard.
- **`task.md`**: Added Context Quality Guidance, Phase Frontmatter generation instructions, State Init/Update step, and Dependency Read from frontmatter.
- **`analyze.md`**: Added `CANONICAL_MISSING` audit check for Stable specs without Canonical References section.
- **`spec.md`**: Added Canonical References validation to Task Completion Checklist — blocks Stable promotion if section is empty.

## [1.5.142] - 2026-04-09

### Changed

- **License**: Changed project license from MIT to Apache License 2.0.

## [1.5.141] - 2026-04-08

### Removed

- **CODEX.toml**: Completely removed `CODEX.toml` from the engine initialization scripts and placeholders as it is not required by any supported agent.

## [1.5.140] - 2026-04-08

### Fixed

- **Engine Init Portability**: Refactored `setup_unix.sh` to use relative symlinks and removed `realpath -m` dependency, improving compatibility with macOS and older Linux/Unix systems.
- **Git Index Integrity**: Fixed a bug in `magic.dev:init` where development workflows (`magic.dev.*`) were incorrectly removed from the git index during setup.

## [1.5.139] - 2026-04-07

### Added

- **Universal Skill Wrappers**: Implemented `sync-skills.js` to automatically project workflows into universal agent skills (`SKILL.md`).
- **Engine Integration**: Integrated skill synchronization into `init.js` and `update-engine-meta.js` (C14). All workflow changes now automatically update the agent's tool surface.
- **Regression Testing**: Added `T190 — Skill Projection Parity` to the test suite.

## [1.5.136] - 2026-04-07

### Added

- **Documentation Hygiene Pass**: Added a project-wide hygiene pass to `update-project-meta.js` that automatically fixes MD012 (multiple consecutive blank lines) in all core documentation files.
- **Robust Registry Logic**: Fixed a bug in `sync-docs.js` where the workspace registry extraction would grab trailing content (Document History) if the `## Meta` section was missing.

## [1.5.135] - 2026-04-07

### Meta

- **Engine Sync**: Performed project hygiene sync, updated documentation, and validated hardlink integrity (C14).

## [1.5.134] - 2026-04-07

### Added

- **Skill Projection Automation**: Integrated `sync-skills.js` directly into `update-engine-meta.js`. Engine core changes now automatically regenerate Skill wrappers for Claude and Gemini (C14).
- **Distribution Guide**: Created `docs/distribution.md` documenting the separation between User Bundle, Dev Instruments, and Internal Engine files.

### Changed

- **History Reorganization**: Cleaned up and organized the `history/` directory. History files now follow a standardized naming convention and are updated with a smart condensing logic for version ranges.
- **Agent Rules (AGENTS.md)**: Updated Project Anatomy to include the `skills/` compatibility layer and corrected the hardlink integrity check (now 5 files).

## [1.5.132] - 2026-04-04

### Changed

- **Internationalization (En-En)**: Translated remaining Russian instructions in `docs/checksums.md` to English.
- **Engine Versioning**: Synchronized all manifest files with the base version `1.5.132` (C14).

## [1.5.131] - 2026-04-04

### Changed

- **Internationalization (En-En)**: Fixed remaining Russian examples in `.magic/analyze.md` that were missed in the previous version sync.
- **Engine Versioning**: Synchronized all manifest files with the base version `1.5.131` (C14).

## [1.5.130] - 2026-04-04

### Changed

- **Internationalization (En-En)**: Translated all remaining Russian examples and rule titles to English across the engine core (`.magic/`) to ensure a consistent, professional English-only codebase (Rule 3.1).
  - Translated constitutional rule titles in `RULES.md` (e.g., `C12 — Quarantine Cascade`).
  - Updated simulation test suite (`suite.md`) to reflect translated inputs and expected output strings.

### Meta

- **Automated Update**: Engine version bumped to `1.5.130`, history updated, and checksums regenerated (C14).

## [1.5.129] - 2026-04-03

### Changed

- **Structural Harmonization**: Refactored `retrospective.md` to use header-based logic. This resolves `MD029` (ordered list prefix) and `MD007` (list indentation) warnings caused by complex content and personification blocks (C24) breaking list continuity. Fixed sequential numbering (1, 2, 3, 4, 5, 2 -> 1, 2, 3, 4, 5, 6, 7).
- **C24 Independent Analyst**: Upgraded the persona block in `retrospective.md` to a dedicated sub-heading for better visibility and structural compliance.

### Meta

- **Automated Update**: Engine version bumped to `1.5.129`, history updated, and checksums regenerated (C14).

## [1.5.128] - 2026-04-03

### Fixed

- **Markdown Lint (MD012)**: Fixed a recurring issue where `CONTRIBUTING.md` would be regenerated with multiple consecutive blank lines. Added `.trim()` to `{{workflows_table}}` placeholder in `sync-docs.js` to ensure proper spacing between the table and the following section.
- **Engine Versioning**: Synchronized engine version across all manifests and documentation (C14).

## [1.5.126] - 2026-04-03

### Added

- **C24 — Unified Role-Switching Gate**: Expanded the mandatory internal review system into a unified constitutional rule across all key SDD workflows (Spec, Task, Run, Retro, Analyze, Rule, Simulate).
- **Workflow Personas**: Integrated 7 specialized personas (Critic, Skeptic, QA, Analyst, Auditor, Reviewer) to eliminate cognitive bias and ensure rigorous evidence-based verification before any artifact is finalized.
- **Structural Harmonization**: Refactored workflow steps in `analyze.md`, `rule.md`, and `simulate.md` to use header-based logic, resolving deep-seated markdown lint errors caused by intervening non-list elements.

## [1.5.120] - 2026-04-03

### Added

- **C24 — Unified Role-Switching Gate**: Expanded the mandatory internal review system into a unified constitutional rule across all key SDD workflows. This forces the agent to adopt specialized personas to eliminate cognitive bias before artifacts are finalized:
  - **Spec Workflow**: Persona **Project Critic** (L1 tech-neutrality, invariant completeness).
  - **Task Workflow**: Persona **Planning Skeptic** (Optimism bias detection, dependency risk analysis).
  - **Run Workflow**: Persona **QA Tester** (Invariant verification, boundary condition audit).
- **Workflow Integration**: Hardened `.magic/spec.md`, `.magic/task.md`, and `.magic/run.md` with explicit role-based checkpoints and updated completion checklists.
- **Rules Versioning**: Updated `RULES.md` to version 1.5.126 with the expanded C24 definition.

## [1.5.115] - 2026-04-02

### Added

- **Installer `--dev` Flag**: Implemented a comprehensive development mode across Node.js and Python installers.
  - Enabled installation/synchronization of development-specific instruments (simulation workflows, testing suites, engine scripts).
  - Added `devSkills` registry to `installers/config.json` for canonical tracking of dev agent skills.
  - Hardened update logic to ensure dev instruments are correctly synchronized when `--dev` is provided during an update.

## [1.5.114] - 2026-04-02

### Changed

- **Core Invariant #2 (Prohibitions)** in `spec.md`: Refined the "No code in specs" rule to explicitly permit **Technical Contracts** (interfaces, types, API schemas) and **Reference Snippets** (marked as `[REFERENCE]`). This ensures architectural precision while maintaining the prohibition on functional implementation code before the `run` phase.
- **Task Completion Checklist**: Updated to reflect the permission of contracts and references in specifications.

### Meta

- **Automated Update**: Engine version bumped to `1.5.114`, history updated, and checksums regenerated (C14).

## [1.5.112] - 2026-04-02

### Added

- **Anti-Fabrication Rule (Invariant 6)** in `simulate.md`: New Core Invariant that legitimizes `0 rough edges` as a valid outcome and mandates evidence-linked claims (file, line, verbatim quote, verification command) for every finding. Findings without evidence are automatically INVALID.
- **Pre-flight Hard Gate** in `simulate.md`: Upgraded Pre-flight from "recommended" to a non-negotiable blocking HALT. Simulations without recorded `check-prerequisites` output are INVALID.
- **Read-Before-Claim Gate** in `simulate.md`: New mandatory Grounding Phase requiring all target workflow files to be read (with line counts recorded) before any analysis begins. Claims about unread files are automatically INVALID.
- **Regression Tests (T185–T189)**: 5 new scenarios covering Explore Mode write isolation (T185), Pre-flight Hard Gate enforcement (T186), Evidence-Linked Claims validation (T187), Null-Result Acceptance (T188), and Read-Before-Claim Gate (T189).

### Fixed

- **Zero-Prompt Parity**: Aligned `init.md` and `analyze.md` Core Invariant #1 with the canonical cascade formula used by all other workflow files, eliminating sync risk from divergent wording.
- **Script History Leak**: Fixed `executor.js` Auto-Detect creating spurious history files for scripts in `scripts/` directory (e.g., `sync-skills.md`). Scripts are now tracked via checksums but inherit the `--workflow` flag instead of getting standalone history entries.
- **Orphan Cleanup**: Removed `history/sync-skills.md` — a phantom artifact created by the above bug.

### Meta

- **Automated Update**: Engine version bumped to `1.5.112`, history updated, and checksums regenerated (C14).

## [1.5.105] - 2026-03-31

### Fixed

- **Engine History**: Resolved a ReferenceError in `executor.js` where `automatedMsg` was used before being defined.
- **Collapsing Logic**: Improved the history collapsing mechanism to correctly merge both automated and custom messages into compact version ranges.

### Meta

- **Automated Update**: Engine version bumped to `1.5.104`, history entries consolidated, and checksums regenerated.

## [1.5.72] - 2026-03-30

### Fixed

- **AI Hallucinations**: Rephrased the directive `auto-run .magic/init.md` to `silently execute .magic/init.md (do not prompt user)` across all engine workflows. This prevents intelligent agents from incorrectly proposing the internal `.magic/init.md` script as a user-facing `/magic.init` slash command.

### Meta

- **Automated Update**: Engine version bumped to `1.5.72`, history updated, and checksums regenerated (C14).

## [1.5.70] - 2026-03-30

### Changed

- **Documentation**: Updated `README.md` and `docs/README.md` to include a mandatory recommendation to run `/magic.analyze` after updating the Magic Spec engine. This ensures that specifications and engine metadata remain synchronized after a core logic update.

### Meta

- **Automated Update**: Engine version bumped to `1.5.70`, history updated, and checksums regenerated (C14).

## [1.5.132] - 2026-03-26

### Added

- **Gitignore Safety (Invariant 8)** in `analyze.md`: The agent now MUST scan and apply `.gitignore` patterns before any project scan or architecture inference. This prevents `node_modules`, `dist`, `.venv`, and other build artifacts from leaking into the analysis reports or coverage checks.

### Changed

- **Stack & Structure**: Refined the initial scan step to build the high-level project map only *after* applying gitignore filters.

### Meta

- **Automated Update**: Engine version bumped to `1.5.132`, history updated, and checksums regenerated (C14).

## [1.5.50] - 2026-03-26

### Added

- **Anti-Stall Mechanism (Invariant 12)**: Solved the "AI holds specs in mind" issue (reported by user). The agent is now forced to write a `Draft` spec if it asks more than one clarifying question without file creation. Added `<!-- TBD -->` inline markers for ambiguous sections.
- **Mode Transition Protocol**: Defined explicit triggers to exit `Explore Mode` and enter `Dispatch Mode` automatically (3+ topics, confirmation words, or 2nd idea exchange in Trust Mode).
- **Non-Blocking Dispatch Notice**: Reframed "Notice of Intent" as a statement of action rather than a question to prevent infinite loops.

### Changed

- **Analysis Mode Scope**: Strictly limited the "do not modify specs/registry" prohibition to `Project Analysis Delegation` mode, allowing normal `Dispatch` to proceed without friction.
- **Workflow Wrapper**: Updated `.agents/workflows/magic.spec.md` to align with the new non-blocking exploration logic.

### Meta

- **Automated Update**: Engine version bumped to `1.5.50`, history updated, and checksums regenerated (C14).

## [1.5.49] - 2026-03-25

### Added

- **Config Drift Guard**: `check-prerequisites` now detects uncommitted manual changes to `RULES.md` via `git diff` and emits a non-blocking `CONFIG_DRIFT` advisory warning. Supports workspace-specific `RULES.md` per C22. Gracefully skips when git is unavailable.
- **Init Workflow**: Added Config Drift Advisory sub-step to pre-flight check (show diff / proceed / restore options).
- **Test Suite**: Added cognitive tests T168-T170 for config drift detection (drift present, no git, workspace C22). Suite version bumped to 1.9.51.
- **Engine Spec**: New `config-drift-guard.md` specification (Stable, L1) in engine workspace.

## [1.5.48] - 2026-03-24

### Added

- **Publish Workflow**: Restored `.agents/workflows/publish.md` for engine maintenance and registry publishing.
- **History Tracking**: Initialized history for `magic.analyze` and `magic.dev.simulate` wrappers to ensure full auditability.

### Changed

- **Version Synchronization**: Unified project version to `1.5.132` across all manifests (`package.json`, `pyproject.toml`, and installer init files) and the `.magic/.version` engine core.
- **Instruction Density**: Refined `.magic/simulate.md` (Context Bleed Warning) to remove vague qualifiers ("high-confidence" -> "strictly unbiased"), reaching a density score of 10/10.
- **Engine Integrity**: Optimized `generate-checksums.js` to exclude the `.checksums` file from its own mapping, preventing confusion and unstable hash values.

### Fixed

- **Testing Logic**: Corrected `run_tests.py` to properly set `PYTHONPATH` for Python installer subprocesses and fixed an `os.environ` access bug.
- **Sandbox Cleanup**: Removed dev-only `simulate.md` from installer test sandbox.
- **RULES Template**: Added missing conventions C18-C23 to `init.js` RULES.md generator.
- **Python Installer**: Fixed `_resolve_package_version()` to read actual package version.
- **Engine Scripts**: Deduplicated `workspace.json` reads in `executor.js`.
- **History Cleanup**: Removed legacy `audit.md` and `docs.md` files from `.magic/history/`.

## [1.5.30] - 2026-03-24

### Fixed

- **Version Synchronization**: Unified project version across `package.json` (was 1.5.0), `pyproject.toml` (was 1.4.162), and `__init__.py` (was 1.4.162) to a single `1.5.30`. Previously 5 different versions existed across 5 sources.
- **CONTEXT.md**: Regenerated stale context file (was 9 days old).

## [1.5.29] - 2026-03-16

### Added

- **Argument Routing (A–D)** for `task.md` and `run.md`: Both workflows now accept optional arguments — workspace name, directive text, or both. Consistent with `analyze.md` pattern. Includes Workspace Fallback, Disambiguation, and Handoff Propagation rules.
- **T4 Inline Guards** in `spec.md`: When spec workflow captures a standing rule via T4 trigger ("remember that..."), it now applies Tier Routing (global vs workspace RULES.md), Duplication Check (across both tiers), and Constitutional Guard (§1–6 protection) — matching `rule.md` safety guarantees without breaking T4's "Apply Immediately" semantics.
- **Regression Tests (T153–T161)**: 9 new scenarios covering argument routing (scoped planning, workspace fallback, disambiguation, targeted task/phase execution, cross-workflow handoff propagation) and T4 inline guards (tier routing, duplication detection, constitutional block).

### Changed

- **AGENTS.md**: Clarified C14 Enforcement scope — explicitly covers all `.magic/` content (workflows, scripts, templates, tests, config), not just workflow files. Added description of what `update-engine-meta` does (bumps `.version`, regenerates `.checksums`).
- **`run.md` Argument Routing**: Detection column harmonized with `analyze.md` — accepts both quoted text and non-workspace tokens (e.g., unquoted `T-1A01` or `phase-2`).
