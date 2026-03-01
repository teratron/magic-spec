# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.5] - 2026-03-01

### Added

- **Engine Versioning Protocol (C14)**: Established a mandatory convention requiring a patch version bump in `.magic/.version` whenever core engine files are modified. Integrated checkpoints into all primary workflows (`run.md`, `spec.md`, `rule.md`).
- **History Refactoring**: Extracted "Document History" from core workflow markdown files into a dedicated `.magic/history/` directory. This significantly reduces token consumption during agentic operations while preserving audit trials.
- **Node.js Script Transition**: Fully replaced legacy `.sh` and `.ps1` initialization and utility scripts with cross-platform Node.js implementations (`init.js`, `generate-context.js`, etc.).

### Changed

- **Installer Configuration**: Optimized `installers/config.json` to exclude history files from distribution and prioritize Node.js scripts.
- **Engine Security**: `generate-checksums.js` and `executor.js` now explicitly skip history files to prevent non-functional changes from triggering integrity warnings.
- **Template System**: `init.js` now automatically injects the new C14 protocol into target project constitution files (`RULES.md`).

### Fixed

- **Syntax Hygiene**: Cleaned up redundant markdown artifacts (terminal backticks) in core workflow files.
- **Workflow Integrity**: Fixed accidental history duplication in `spec.md`.

## [1.4.3] - 2026-03-01

### Added

- **Smart Adapter Updates**: Both Python and Node.js installers now seamlessly verify and update adapter `.mdc`/`.toml` wrapper files during `--update`.
- **Smart Update Conflict Resolution**: When users manually modify `.cursor/rules/*` wrapper files in their project, the `--update` command now detects the modifications. Users can intelligently choose to skip updates for specific conflicting adapter files, preserving their changes while updating the core `.magic` engine logic.

### Fixed

- **Updater Integrity**: Modified files that are bypassed during an update via `[s] Skip modified files` now persist their original hashes so they don't get silently overwritten in subsequent updates.
- **Testing Logic**: Fixed an issue in the `run_tests.py` exhaustive test suite section where failures during adapter testing cycles were mistakenly swallowed, reporting a false "All tests completed successfully".

## [1.4.1] - 2026-03-01

### Fixed

- **Localization**: Translated remaining Russian text in `README.md` Mermaid diagrams to English.

## [1.4.0] - 2026-03-01

### Added

- **Smart Sync Optimization (AOP)** in `analyze.md`: Automated detection of manual renames during project re-analysis. If an orphaned specification matches a new uncovered directory (>80% similarity or title match), it triggers a `[RESCUE]` action instead of delete/create cycle.
- **Manual Rename Rescue** in `spec.md`: Protocol to globally update references (INDEX, PLAN, TASKS) when a specification file is moved/renamed, preserving task progress.
- **Regression Tests (T48–T51)**: Added coverage for Engine Integrity guards, Analysis Depth Control, and Smart Sync mechanisms.

### Changed

- **Test Suite Synchronization**: The `suite.md` version is now synchronized with the core engine version to prevent metadata confusion.

## [1.3.2] - 2026-02-28

### Added

- **Project Analysis Workflow** (`.magic/analyze.md`): Powerful reverse-engineering tool. Delegated automatically from `spec.md` or directly via `/magic.analyze`. Supports scanning existing source code to generate structured proposals with paired Layer 1 (Concept) and Layer 2 (Implementation) specifications. Features Depth Control for massive codebases.
- **Bootstrapping Exemption**: Special rules added to bypass standard Draft/RFC phases and create "Stable" specs directly when adopting existing working code into the SDD system.
- **Improv Mode (Live Simulation)** in `simulate.md`: Added ability for the simulation workflow to synthesize "crisis scenarios" (e.g., INDEX.md desync) and perform full SDK lifecycle stress tests end-to-end on its own, functioning as a fallback if the static test suite is missing.

### Changed

- Expanded Test Suite (`.magic/tests/suite.md`) from 28 to 34 scenarios (+6), fully covering Analyze gap detection, L1/L2 generation asserts, depth control limits, and the missing test suite fallback.

## [1.3.1] - 2026-02-27### Added

- **Workflow Test Suite** (`.magic/tests/suite.md`): 16 predefined regression test scenarios covering all 8 engine workflows. Run via `/magic.simulate test`.
- **Test Suite mode** in `simulate.md`: reads `suite.md` and reports PASS/FAIL for each scenario.
- **Template directory** (`.magic/templates/`): extracted inline templates from core workflow files:
  - `specification.md` — Specification Template (from `spec.md`)
  - `plan.md` — PLAN.md Template (from `task.md`)
  - `tasks.md` — TASKS.md + phase-{n}.md Templates (from `task.md`)
  - `retrospective.md` — RETROSPECTIVE.md Template (from `retrospective.md`)

### Changed

- **AOP Optimization**: Compressed verbose prose in `spec.md` (Post-Update Review, Audit/Consistency Reports). ~17% token reduction across core workflows.
- **Stress-test hardening** across all workflows:
  - `spec.md`: Intra-input self-contradiction guard, Deprecation Cascade (scan Related Specs for stale refs)
  - `task.md`: Circular Dependency Guard, Phantom Done-task preservation (Archive not Cancel), Deprecated Done-task preservation, Convention Sync wording fix
  - `run.md`: Mode Guard — HALT if execution mode not in RULES.md §7
  - `rule.md`: Duplication Guard, convention-not-found handler, Workflow Dependency Check in Remove Impact Analysis
  - `simulate.md`: Checksums mismatch upgraded to HALT, Checksum Rule (generate after approval only)
  - `onboard.md`: Production collision HALT with backup/cancel, re-entry checks production PLAN.md
  - `init.md`: Expanded post-init verification to all 5 artifacts, Maintainer Note for hardcoded RULES.md sync

### Fixed

- Template references now explicitly point to `.magic/templates/*.md` in creation steps of `spec.md`, `task.md`, `retrospective.md`, and `onboard.md`.

## [1.3.0] - 2026-02-25

### Added

- **Full support for abstract environment templates** with automatic resolution (`{ARGUMENTS}`) across all CLIs.
- **Introduced `.magicrc`** for persistence of selected environments and their auto-detection.
- **Two-level automatic Changelog generation** (by accumulating `Changes` blocks within tasks).
- **Added new CLI commands:** `info`, `--check`, `--list-envs`, and `--eject`.
- **Introduced core version tracking** within the project via the `.magic/.version` file.

### Changed

- **Architecture:** Restructured the repository into a two-level model (root = source of truth + installers), and removed the `core/` folder to eliminate duplication.
- **Node Installer:** Completely overhauled the installation mechanism (it now uses compiled files from NPM instead of downloading them from GitHub, eliminating Path Traversal vulnerabilities).
- **Python Installer:** Implemented an isolated package based on `hatchling` (via shared-data) without external dependencies on GitHub.
- **Documentation:** Separated `README.md` strategies (different focuses for GitHub, NPM package, and PyPI package).
- **Update Logic:** Improved `.magic` update logic to be safer (old folders are now moved to `.magic/archives/` rather than simply deleted).

## [1.3.0] - 2026-02-23

### Added

- **Handoff integrations** (`magic.*.md`): Introduced explicit handoff blocks across all agent workflow wrappers to guide next-steps effortlessly.
- **Task Engine Enhancement:** Integrated User Stories generation parsing into `.magic/task.md` and suppressed user priority prompts using `RULES.md C4`.
- **System Automation Hooks:** Added `generate-context` script hooks into `task.md` and `run.md` post-write triggers.
- **Context Automation Script:** Created `generate-context.sh` and `generate-context.ps1` to assemble `CONTEXT.md` from PLAN, workspace trees, and changelogs.
- **Spec Engine Protections:** Added strict Explore Mode Safety rules and Delta Editing constraints for spec updates over 200 lines to `.magic/spec.md`.
- **Explore Hints:** Updated `.agent/workflows/magic.spec.md` UI wrapper with tips to use Delta Constraints and strict read-only explore mode.
- **CLI Doctor Command (Node/Python):** Implemented `--doctor` and `--check` parsing in installers, executing the prerequisite script and outputting a formatted terminal validation report.
- **Interactive Onboarding Script:** Created `.magic/onboard.md` to guide new developers through building a toy "console logger" specification.
- **Onboarding Wrapper:** Added `.agent/workflows/magic.onboard.md` to trigger the interactive onboarding tutorial seamlessly.
- **Prerequisite Validation:** Created `check-prerequisites.sh` and `check-prerequisites.ps1` parsing `INDEX.md` and returning valid JSON results.
