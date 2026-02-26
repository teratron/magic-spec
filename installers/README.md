# 📦 Magic Spec — Installers

Magic Spec provides native installers for multiple development environments. Both implement a **thin-client architecture**, ensuring your project remains lightweight while providing full access to the SDD engine and workflows.

---

## 🚀 Quick Start

### Node.js (Recommended for JS/TS projects)

Run in your project root using `npx`:

```bash
npx magic-spec@latest
```

### Python (Recommended for Python/Data Science)

Run in your project root using `uv` (recommended) or `pipx`:

```bash
uvx magic-spec
# OR
pipx run magic-spec
```

---

## 🏗️ Architecture: Thin Client

Both installers act as lightweight wrappers. They do not bundle the entire SDD engine. Instead, they:

1. **Payload Discovery**: Download the latest versioned tarball from GitHub releases.
2. **Security Verification**: Validate the payload to prevent path traversal and ensure safe extraction.
3. **Engine Deployment**: Extract `.magic/` (engine) and `.agent/` (workflows) into your project root.
4. **Initialization**: Automatically run the project-level init script (`.magic/scripts/init.sh` or `.ps1`).

---

## 🕹️ CLI Commands & Arguments

Manage your Magic Spec installation with these flags:

| Command | Description |
| :--- | :--- |
| `info` | Displays version info, installation paths, and detected environment. |
| `--update` | Pulls the latest engine components while preserving your `.design/` folder. |
| `--check` | Checks GitHub/PyPI for available updates. |
| `--list-envs` | Lists available IDE adapters (Cursor, Windsurf, etc.). |
| `--env <id>` | Configures Magic Spec for a specific IDE (e.g., `--env cursor`). |
| `--doctor` | Checks for missing files or inconsistencies in your workspace. |
| `--eject` | Uninstalls Magic Spec and removes the `.magic/` folder. |
| `--yes`, `-y` | Non-interactive mode (auto-accepts all prompts). |
| `--fallback-main` | Downloads the payload from the `main` branch instead of a release. |

---

## 🛠️ Internal Automation Scripts

These scripts are located in `installers/scripts/` and are used for engine development and releasing.

### Testing (`run_tests.py`)

Run all unit and integration tests found in the `tests/` directory.

```bash
python installers/scripts/run_tests.py
```

*Note: You can also use `npm test` which triggers this script.*

### Releasing (`publish.py`)

The unified release script for both Python (PyPI) and Node.js (npm).

```bash
python installers/scripts/publish.py <old_version> <new_version> [flags]
```

**Common Flags:**

- `--dry-run`: Simulation mode. No files are modified or published.
- `--skip-publish`: Bumps versions and creates git tags without pushing to registries.

---

## 📋 Requirements

| Requirement | Node.js Path | Python Path |
| :--- | :--- | :--- |
| **Runtime** | Node.js >= 16.x | Python >= 3.8 |
| **Tooling** | `npm` >= 7.x | `uv`, `pipx`, or standard `pip` |
| **Utilities** | `tar` (system utility) | `connectivity` (GitHub access) |

---

[Main README](../README.md) | [Project Documentation](../docs/README.md)
