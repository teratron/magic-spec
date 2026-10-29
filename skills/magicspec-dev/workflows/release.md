# Release Workflow

**Command:** `/magicspec-dev:release` — validates, versions and triggers a GitHub Release of the engine.

This workflow automates the end-to-end process of validating, versioning, and releasing the `magic-spec` engine.
The core logic is handled by the `release` script, which enforces QA gates and triggers distribution via GitHub Actions.
Publishing is an external, irreversible act (a pushed tag starts the public release workflow), so the script prints its plan by default and publishes only with `--yes`.

## Agent Guidelines

**Agent guidelines:**

1. **Plan first**: run `node scripts/release.js` (no option). It prints the version, the branch, the tag and what blocks the release, and changes nothing. Show the plan to the user.
2. **Consent before publishing**: ask once, with one question and at most three fixed options (publish / not now / other), the recommended one marked. Run `node scripts/release.js --yes` only after the user chose to publish.
3. **Prerequisites**: `skills/magicspec/.version` is incremented, `CHANGELOG.md` has a corresponding entry, and the working tree is clean (the release commit holds only what the release steps change).
4. **QA Gate**: the script runs the tests and updates metadata. Do not attempt to bypass this.
5. **Automation**: distribution is handled by the `Release` GitHub Action triggered by the tag push.

## Workflow Steps

### 1. Preparation

1. **Increment Version**: Update `skills/magicspec/.version` (e.g., `2.0.2` → `2.0.3`).
2. **Update Changelog**: Add version entry and notes to `CHANGELOG.md`.
3. **Commit**: Commit your changes; the release needs a clean working tree.

### 2. Plan

```bash
node scripts/release.js
```

### 3. Execution

After the user agreed to publish:

```bash
node scripts/release.js --yes
```

The script pushes the current branch and the tag, and stops without publishing when the tag already exists.

### 4. Verification

1. **Check Action**: `gh run list --workflow release.yml --limit 1`
2. **Verify Release**: `gh release view vX.Y.Z`

## Release Completion Checklist

```plaintext
Release Workflow Checklist — vX.Y.Z

Preparation
  ☐ Version incremented in skills/magicspec/.version
  ☐ Entry exists in CHANGELOG.md
  ☐ Working tree clean

Plan and consent
  ☐ Plan printed by 'node scripts/release.js' and shown to the user
  ☐ The user chose to publish (one consent question)

Execution
  ☐ Command 'node scripts/release.js --yes' executed
  ☐ Engine tests passed (automated)
  ☐ Metadata (C14) updated (automated)
  ☐ Git tag vX.Y.Z created and pushed (automated)

Verification
  ☐ GitHub Action 'Release' started
  ☐ Release archive correctly generated
```
