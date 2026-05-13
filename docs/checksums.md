# Engine Integrity & Checksums

This document explains the purpose, implementation, and management of the checksum system within the Magic SDD engine.

## 1. Overview

The `.magic/.checksums` file acts as the "integrity passport" for the Magic SDD engine. It contains SHA256 hashes of all critical files within the `.magic/` directory.

The primary goals of this system are:

- **Tamper Detection**: Detecting unauthorized or accidental modifications to the core engine logic.
- **Update Safety**: Ensuring that local customizations are not silently overwritten during manual GitHub Release updates.
- **Standardization**: Providing a consistent way to verify the engine state across different development environments.

## 2. The `.checksums` File

The file is located at `.magic/.checksums` and uses a flat JSON structure:

```json
{
  "spec.md": "sha256-hash-of-file",
  "task.md": "sha256-hash-of-file",
  "scripts/executor.js": "sha256-hash-of-file"
}
```

- **Keys**: Relative paths of files within the `.magic/` directory.
- **Values**: SHA256 hashes represented as lowercase hexadecimal strings.
- **Exclusion**: The `.checksums` file itself is excluded from hashing to avoid circular dependencies.

## 3. Automation & Workflows

### 3.1 Prerequisite Validation

The `check-prerequisites.js` script (executed via the universal `node .magic/scripts/executor.js check-prerequisites` wrapper) automatically verifies these checksums. This check is integrated as **Step 0** into ALL Magic SDD workflows.

If a mismatch is detected, the workflow will **HALT** and surface an error:
> `WARNING: Engine Integrity: '.magic/file.md' has been modified locally.`

### 3.2 Update Safety

Before replacing `.magic/` from a new release archive, compare local files against `.magic/.checksums`. If local changes are detected, back them up or intentionally vendor them before copying the new engine files.

## 4. Maintenance

When the engine logic is intentionally modified (e.g., during development or when adding new features), the checksums must be regenerated to reflect the new state.

### How to update checksums (C14)

For **full synchronization** (including automatic version bump in `.magic/.version` and updates to history files):

```bash
node .magic/scripts/executor.js update-engine-meta --workflow {current_workflow}
```

For **manual checksum update only** (without version or history changes, developer install only):

```bash
node dev/scripts/generate-checksums.js
```

> The manifest builder lives in `dev/scripts/` — it is a developer tool that ships pre-generated `.magic/.checksums` to end users. User installations only verify the manifest via `update-engine-meta --check` (pre-commit hook) and never regenerate it.

### When to update

- Whenever an engine file (`.magic/*.md`) or history file is intentionally modified.
- Before committing changes to the project repository.
- After manually editing `.magic/` artifacts to resolve integrity errors or `MD012` lint warnings.
- After a global project synchronization (`/magic.dev.sync`).

## 5. Security Note

While checksums provide a strong defense against accidental changes and improve transparency, they are managed within the same repository. They serve as a coordination and safety mechanism for developers and AI agents, rather than a cryptographic security boundary against malicious actors with write access to the repository.
