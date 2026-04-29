---
name: magic-dev-publish
description: Workflow for validating, versioning, and publishing a GitHub Release of the Magic Spec engine.
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.dev.publish.md (relative to workspace root) -->

# Publish Workflow

This workflow handles the end-to-end process of validating, versioning, and publishing the
`magic-spec` engine as a GitHub Release. Distribution is via GitHub Releases only — npm and
PyPI packages are deprecated as of v1.5.207.

> **Scope**: Engine integrity, version sync, CHANGELOG update, release archive creation, and GitHub Release.
> **Automation**: Use `node .magic/scripts/executor.js sync` for version sync and checksums.
> Use `gh release create` for the GitHub Release.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Test First**: Run the engine test suite before building or releasing.
2. **C14 Gate**: If any `.magic/` or `workflows/` file was modified, run
   `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` BEFORE
   building. This is a **blocking gate** — do not proceed until checksums match.
3. **Version Sync**: `.magic/.version` is the single source of truth. Run
   `node .magic/scripts/executor.js sync` to propagate it to `package.json` and `pyproject.toml`.
4. **CHANGELOG Required**: Every release must have a CHANGELOG entry. Do not release without one.
5. **Clean Git State**: All changes must be committed before tagging. No dirty working tree.
6. **Archive Contents**: The release zip must contain only user-facing files:
   `.magic/` (without `history/` and `tests/`), `workflows/`, `skills/`, `rules/`.

## Workflow Steps

### 1. Pre-release Validation (QA)

1. **Run Engine Tests**: `node .magic/tests/engine.js`
   - If tests fail, report and HALT.
2. **C14 Enforcement**: If engine files were modified, run update-engine-meta (blocking gate).
3. **Version Sync**:
   - Read `.magic/.version` — this is the canonical version.
   - Run `node .magic/scripts/executor.js sync` to propagate to `package.json`, `pyproject.toml`, `README.md`.
4. **Git Cleanliness**: Run `git status`. All changes must be staged and committed before tagging.
5. **Report QA Status**:

   ```plaintext
   QA Status:
   - Engine tests:   [PASS/FAIL]
   - C14 checksums:  [Current/Stale]
   - Version sync:   .magic/.version = X.Y.Z → package.json, pyproject.toml, README.md [Match/Mismatch]
   - Git state:      [Clean/Dirty]
   - CHANGELOG:      [Has entry for X.Y.Z / Missing]
   ```

### 2. Version Bump (if needed)

If releasing a new version (not re-releasing existing):

1. Update `.magic/.version` to the new version.
2. Run `node .magic/scripts/executor.js sync` to propagate.
3. Update `CHANGELOG.md` with the new version section.
4. Commit: `git commit -m "Release vX.Y.Z"`.

### 3. Build Release Archive

Build the zip archive containing only user-facing files:

```bash
# Create temp staging directory
mkdir -p _release_tmp/magic-spec-vX.Y.Z

# Copy user-facing engine files (exclude history/ and tests/)
cp -r .magic _release_tmp/magic-spec-vX.Y.Z/.magic
rm -rf _release_tmp/magic-spec-vX.Y.Z/.magic/history
rm -rf _release_tmp/magic-spec-vX.Y.Z/.magic/tests

# Copy workflows, skills, rules
cp -r workflows _release_tmp/magic-spec-vX.Y.Z/
cp -r skills _release_tmp/magic-spec-vX.Y.Z/
cp -r rules _release_tmp/magic-spec-vX.Y.Z/

# Create zip
cd _release_tmp && zip -r ../magic-spec-vX.Y.Z.zip magic-spec-vX.Y.Z/ && cd ..
rm -rf _release_tmp
```

**Verify the archive**: list contents and confirm no `history/` or `tests/` are included,
and that `.magic/`, `workflows/`, `skills/`, `rules/` are all present.

### 4. Create GitHub Release

1. **Create git tag**:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z: {brief description}"
   git push origin master --tags
   ```

2. **Final Confirmation**: Present a release summary:

   ```plaintext
   Ready to release vX.Y.Z:
   - Archive:   magic-spec-vX.Y.Z.zip ({size})
   - Tag:       vX.Y.Z
   - Changes:   {summary from CHANGELOG.md}

   Confirm release? (yes / cancel)
   ```

3. **Create GitHub Release**:

   ```bash
   gh release create vX.Y.Z magic-spec-vX.Y.Z.zip \
     --title "vX.Y.Z — {brief description}" \
     --notes "$(cat <<'EOF'
   ## What's Changed
   {excerpt from CHANGELOG.md}

   ## Installation
   Download `magic-spec-vX.Y.Z.zip` and copy `.magic/`, `workflows/`, `skills/`, `rules/`
   into your project root. See [README.md](https://github.com/teratron/magic-spec#-installation)
   for full instructions.
   EOF
   )"
   ```

4. **Post-release**:
   - Verify the release is visible: `gh release view vX.Y.Z`
   - Confirm the zip asset is downloadable.

## Release Completion Checklist

```plaintext
Release Workflow Checklist — vX.Y.Z

Validation & QA
  ☐ Engine tests passed (node .magic/tests/engine.js)
  ☐ C14 Gate: checksums current BEFORE build (blocking)
  ☐ Version source of truth: .magic/.version = X.Y.Z
  ☐ All manifests synced (package.json, pyproject.toml, README.md)
  ☐ CHANGELOG.md has entry for vX.Y.Z
  ☐ Git state: clean, all changes committed

Build & Archive
  ☐ Release zip created: magic-spec-vX.Y.Z.zip
  ☐ Archive verified: .magic/ (no history/, no tests/), workflows/, skills/, rules/

GitHub Release
  ☐ Git tag vX.Y.Z created and pushed
  ☐ GitHub Release created with zip artifact
  ☐ Release visible: gh release view vX.Y.Z
```