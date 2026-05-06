# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
