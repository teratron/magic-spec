# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [1.5.71] - 2026-03-26

### Added

- **Gitignore Safety (Invariant 8)** in `analyze.md`: The agent now MUST scan and apply `.gitignore` patterns before any project scan or architecture inference. This prevents `node_modules`, `dist`, `.venv`, and other build artifacts from leaking into the analysis reports or coverage checks.

### Changed

- **Stack & Structure**: Refined the initial scan step to build the high-level project map only *after* applying gitignore filters.

### Meta

- **Automated Update**: Engine version bumped to `1.5.71`, history updated, and checksums regenerated (C14).

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

- **Version Synchronization**: Unified project version to `1.5.71` across all manifests (`package.json`, `pyproject.toml`, and installer init files) and the `.magic/.version` engine core.
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
