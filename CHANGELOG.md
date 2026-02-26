# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
