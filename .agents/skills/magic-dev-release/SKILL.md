---
name: magic-dev-release
description: Workflow for validating, versioning, and triggering a GitHub Release of the Magic Spec engine.
---

# Release Workflow

This workflow automates the end-to-end process of validating, versioning, and releasing the `magic-spec` engine.
The core logic is handled by the `release` script, which enforces QA gates and triggers distribution via GitHub Actions.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **One-Command Release**: To initiate a release, simply run `node .agents/skills/magic-dev-release/scripts/release.js`.
2. **Prerequisites**: Ensure `.magic/.version` is incremented and `CHANGELOG.md` has a corresponding entry before running.
3. **QA Gate**: The script automatically runs tests and updates metadata. Do not attempt to bypass this.
4. **Automation**: Distribution is handled by the `Release` GitHub Action triggered by the tag push.

## Workflow Steps

### 1. Preparation

1. **Increment Version**: Update `.magic/.version` (e.g., `2.0.2` → `2.0.3`).
2. **Update Changelog**: Add version entry and notes to `CHANGELOG.md`.
3. **Commit Draft**: (Optional) Commit any feature changes before running the release command.

### 2. Execution

Run the automated release script:

```bash
node .agents/skills/magic-dev-release/scripts/release.js
```

### 3. Verification

1. **Check Action**: `gh run list --workflow release.yml --limit 1`
2. **Verify Release**: `gh release view vX.Y.Z`

## Release Completion Checklist

```plaintext
Release Workflow Checklist — vX.Y.Z

Preparation
  ☐ Version incremented in .magic/.version
  ☐ Entry exists in CHANGELOG.md

Execution
  ☐ Command 'node .agents/skills/magic-dev-release/scripts/release.js' executed
  ☐ Engine tests passed (automated)
  ☐ Metadata (C14) updated (automated)
  ☐ Git tag vX.Y.Z created and pushed (automated)

Verification
  ☐ GitHub Action 'Release' started
  ☐ Release archive correctly generated
```