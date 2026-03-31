---
name: magic.dev:publish
description: Workflow for testing, building, and publishing the Magic Spec engine.
---

# Publish Workflow

This workflow handles the end-to-end process of validating, building, and publishing the `magic-spec` engine to package registries (NPM, PyPI). It ensures that the engine's documentation, versioning, and codebase remain synchronized.

> **Scope**: Testing, build artifacts, documentation synchronization, and registry publishing.
> **Automation**: The primary tool is `python installers/scripts/publish.py [old_version] [new_version] [--dry-run] [--skip-publish]`. It atomically bumps versions, updates docs, commits, tags, and publishes to both registries.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Test First**: Never attempt a build or publish without running the full test suite first.
2. **Docs Sync Check**: Always verify that the `README.md` and `docs/` reflect the current state of the engine (e.g., version numbers, feature list, directory structure) before publishing.
3. **Version Discipline**: `.magic/.version` is the **source of truth** for the engine version. All manifests (`package.json`, `pyproject.toml`, `installers/python/magic_spec/__init__.py`) are synchronized via `publish.py` using the list in `installers/config.json` → `publish.versionFiles`.
4. **Dry Run**: Always perform a dry run first: `python installers/scripts/publish.py [old] [new] --dry-run` and show the proposed changes/artifacts to the user before the final push.
5. **No Broken States**: If any test fails or a doc mismatch is found, **HALT** and report the discrepancy. Do not bypass errors.
6. **C14 Enforcement**: Before publishing, ensure checksums are current. If any `.magic/` file was modified, run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` **immediately** — this is a blocking gate.
7. **Clean State Protocol**: Ensure any non-versioning changes (e.g., specific README edits, manually updated documentation) are committed **BEFORE** running `publish.py`. The script is responsible for bumping versions and adding those specific modified files; all other changes must be in a clean git state to avoid drift.

## Workflow Steps

### 1. Pre-publish Validation (QA)

**Trigger phrase**: *"Check engine status"*, *"Validate for release"*

1. **Run Tests**: Execute the test suite for the entire engine.
   - Command: `npm test` (runs `python installers/scripts/run_tests.py`).
   - If tests fail, report the failure and HALT.
2. **Documentation & Script Audit**:
   - **Engine Sync**: Compare `.magic/` core logic and scripts (`.magic/scripts/`) with descriptions in `README.md` (root) and `docs/README.md`.
   - **Manifests Sync**: Verify that all files listed in `installers/config.json` → `publish.versionFiles` contain the same version as `.magic/.version`.
   - **Wrappers Sync**: Verify that each **user-facing** workflow listed in `installers/config.json` → `workflows` has a corresponding entry point in `.agents/workflows/magic.*.md`. Internal engine files (`init.md`, `retrospective.md`) do not require wrappers.
   - **Docs Completeness**: Verify that all engine features and workflows documented in `.magic/` have corresponding entries in `docs/`. Check `docs/` files listed in `installers/config.json` → `publish.docsTargets` and `publish.docsDir`.
   - **C14 Gate (Checksums)**:
     - If any file in `.magic/` was modified, run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` BEFORE building. This is a **blocking gate** — do not proceed until checksums match.
   - **Git Cleanliness**: Run `git status` to ensure all non-manifest changes are committed. If any custom edits or metadata updates exist, stage and commit them now: `git add . && git commit -m "docs: pre-release synchronization"`.
3. **Report Status**: Show a summary of QA results:

   ```plaintext
   QA Status:
   - Tests: [PASS/FAIL]
   - Version Sync: [Match/Mismatch] (Source: .magic/.version = X.Y.Z)
     - package.json: [Match/Mismatch]
     - pyproject.toml: [Match/Mismatch]
     - __init__.py: [Match/Mismatch]
   - Docs Alignment: [OK/Stale]
   - Checksums: [Current/Stale]
   ```

### 2. Building

**Trigger phrase**: *"Build engine"*, *"Prepare artifacts"*

1. **Run Build**:
   - **Node.js**: `npm run build` — creates `dist/` and packs `magic-spec-{version}.tgz`.
   - **Python**: `uv build` (or `python -m build`) — creates `dist/*.whl` and `dist/*.tar.gz`.
2. **Verify Artifacts**: Check the contents of the generated packages to ensure all required files (`installers/`, `package.json`, `pyproject.toml`, `config.json`, etc.) are included and no junk files are present.

### 3. Publishing

**Trigger phrase**: *"Publish engine"*, *"Release version"*

1. **Final Confirmation**: Present a release summary:

   ```plaintext
   Ready to publish v{version}:
   - Registries: NPM + PyPI
   - Changes: {summarize from CHANGELOG.md and .magic/history/}
   - Documentation: Synchronized

   Confirm publish? (yes / cancel)
   ```

2. **Dry Run**: `python installers/scripts/publish.py [old] [new] --dry-run`.
3. **Execute Publish**: `python installers/scripts/publish.py [old] [new]` — performs the actual registry upload to both NPM and PyPI.
4. **Post-publish**:
   - Verify git tag `v{version}` was created by `publish.py`.
   - Verify the package is live on both registries (`npm view magic-spec version`, `pip index versions magic-spec`).

## Publish Completion Checklist

**Must be shown at the end of every publish operation.**

```plaintext
Publish Workflow Checklist — {operation description}

Validation & QA
  ☐ Full test suite passed (`npm test`)
  ☐ .magic/ structure and scripts match README.md and docs/
  ☐ Wrappers synced: user-facing workflows (config.json → workflows) have .agents/ entry points
  ☐ C14 Enforcement Gate: checksums current BEFORE build (blocking)
  ☐ Version source of truth: .magic/.version = {version}
  ☐ All manifests synced (config.json → publish.versionFiles)
  ☐ All README/Docs version references updated (config.json → publish.docsTargets)

Build & Artifacts
  ☐ Node.js: `npm run build` → dist/*.tgz verified
  ☐ Python: `uv build` → dist/*.whl + dist/*.tar.gz verified

Registry & Release
  ☐ Dry run: `publish.py --dry-run` performed and verified
  ☐ Final publish: `publish.py` executed (NPM + PyPI)
  ☐ Git tag `v{version}` created
  ☐ CHANGELOG.md updated
```