# Engine Integrity & Checksums

This document explains the purpose, implementation, and management of the checksum system within the Magic SDD engine.

## 1. Overview

The `.magic/.checksums` file acts as the "integrity passport" for the Magic SDD engine. It contains SHA256 hashes of all critical files within the `.magic/` directory.

The primary goals of this system are:

- **Tamper Detection**: Detecting unauthorized or accidental modifications to the core engine logic.
- **Update Safety**: Ensuring that local customizations are not silently overwritten during engine updates via the CLI installers (`npx` or `uvx`).
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

The `check-prerequisites` script (available as both `.ps1` and `.sh` in `.magic/scripts/`) automatically verifies these checksums. This check is integrated into the following core workflows:

- **`magic.task`**: Runs as a "Pre-flight Check" to ensure the implementation plan is built using a valid engine.
- **`magic.spec`**: Verifies that the specification management logic remains intact.

If a mismatch is detected, the workflow will surface a warning:
> `WARNING: Engine Integrity: '.magic/file.md' has been modified locally.`

### 3.2 CLI Safety

Installer features like the **Conflict Detector** use these checksums to identify if a project has customized its engine. If local changes are detected during an `--update` or `--install`, the CLI will prompt the user to decide whether to overwrite, skip, or backup the affected files.

## 4. Maintenance

When the engine logic is intentionally modified (e.g., during development or when adding new features), the checksums must be regenerated to reflect the new state.

### How to update checksums

Run the following command in the project root:

```bash
node .magic/scripts/executor.js generate-checksums
```

### When to update

- Before committing changes to the `.magic/` directory.
- Before publishing a new release (automated via the release checklist).
- After manually editing `.magic/` files to suppress integrity warnings.

## 5. Security Note

While checksums provide a strong defense against accidental changes and improve transparency, they are managed within the same repository. They serve as a coordination and safety mechanism for developers and AI agents, rather than a cryptographic security boundary against malicious actors with write access to the repository.
