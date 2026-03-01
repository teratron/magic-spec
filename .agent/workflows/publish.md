---
description: Workflow for testing, building, and publishing the Magic Spec engine.
---

# Publish Workflow

This workflow handles the end-to-end process of validating, building, and publishing the `magic-spec` engine to package registries (NPM, PyPI). It ensures that the engine's documentation, versioning, and codebase remain synchronized.

> **Scope**: Testing, build artifacts, documentation synchronization, and registry publishing.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Test First**: Never attempt a build or publish without running the full test suite first.
2. **Docs Sync Check**: Always verify that the `README.md` and `docs/` reflect the current state of the engine (e.g., version numbers, feature list, directory structure) before publishing.
3. **Version Discipline**: Ensure `.magic/.version` and project manifests (`package.json`, etc.) are in sync.
4. **Dry Run**: Always perform a "dry run" publish (to a local folder or using `--dry-run` flags) and show the proposed changes/artifacts to the user before the final push.
5. **No Broken States**: If any test fails or a doc mismatch is found, **HALT** and report the discrepancy. Do not bypass errors.

## Workflow Steps

### 1. Pre-publish Validation (QA)

**Trigger phrase**: *"Check engine status"*, *"Validate for release"*

1. **Run Tests**: Execute the test suite for the entire engine.
   - Command: `npm test` (runs `python installers/scripts/run_tests.py`).
   - If tests fail, report the failure and HALT.
2. **Documentation & Script Audit**:
   - **Engine Sync**: Compare `.magic/` core logic and scripts (`.magic/scripts/`) with descriptions in `README.md` (root) and `docs/README.md`.
   - **Manifests Sync**: Ensure the version in `package.json` (Node.js) and `pyproject.toml` (Python) matches the engine version and documentation.
   - **Wrappers Sync**: Verify that each relevant `.magic/*.md` workflow has a corresponding entry point in `.agent/workflows/magic.*.md`.
   - **Docs Completeness**: Verify that all new engine features and scripts are documented in `docs/`.
   - **Patch & Checksums**:
     - Check if `.magic/.version` has been bumped per C14 protocol.
     - **Regenerate Checksums**: If any file in `.magic/` was modified, ensure `node .magic/scripts/generate-checksums.js` is run BEFORE building.
3. **Report Status**: Show a summary of QA results:

   ```plaintext
   QA Status:
   - Tests: [PASS/FAIL]
   - Version Sync: [Match/Mismatch] (e.g., Node: 1.4.3, Py: 1.4.3, Docs: 1.4.3)
   - Docs Alignment: [OK/Stale]
   ```

### 2. Building

**Trigger phrase**: *"Build engine"*, *"Prepare artifacts"*

1. **Run Build**: Execute `npm run build`.
   - This creates the `dist/` directory and packs the package.
2. **Verify Artifacts**: Check the contents of the generated `.tgz` file to ensure all required files (`installers/`, `package.json`, `pyproject.toml`, etc.) are included and no junk files are present.

### 3. Publishing

**Trigger phrase**: *"Publish engine"*, *"Release version"*

1. **Final Confirmation**: Present a release summary:

   ```plaintext
   Ready to publish v1.4.x:
   - Registry: NPM/PyPI
   - Changes: {summarize from CHANGELOG.md}
   - Documentation: Synchronized
   
   Confirm publish? (yes / cancel)
   ```

2. **Dry Run (Optional but recommended)**: `npm run publish:dry`.
3. **Execute Publish**: Perform the actual registry upload.
4. **Post-publish**:
   - Ensure `git tags` are created (if applicable).
   - Verify the package is live on registries.

## Publish Completion Checklist

**Must be shown at the end of every publish operation.**

```plaintext
Publish Workflow Checklist — {operation description}

Validation & QA
  ☐ Full test suite passed (`npm test`)
  ☐ .magic/ structure and scripts match README.md and docs/
  ☐ Agent entry points (.agent/workflows/magic.*.md) synced with core .magic/ workflows
  ☐ Engine version (.magic/.version) bumped (C14)
  ☐ **Checksums regenerated** (`.magic/.checksums` reflects current state)
  ☐ Engine version consistent with manifests (package.json, pyproject.toml)
  ☐ All README/Docs version references are updated

Build & Artifacts
  ☐ `npm run build` executed successfully
  ☐ Artifacts in `dist/` verified for completeness

Registry & Release
  ☐ Dry run performed and verified
  ☐ Final publish command executed
  ☐ Version bumped and documented in CHANGELOG.md
```
