# 📦 Magic Spec — Installers

Magic Spec provides native installers for multiple development environments. Both implement a **thin-client architecture**, ensuring your project remains lightweight while providing full access to the SDD engine and workflows.

## 🚀 Quick Start

### Node.js (Recommended for JS/TS projects)

Run in your project root using `npx`:

```bash
npx magic-spec@latest
```

Or to install the latest edge version directly from the GitHub `main` branch:

```bash
npx --yes github:teratron/magic-spec
```

### Python (Recommended for Python/Data Science)

Run in your project root using `uv` (recommended):

```bash
uvx magic-spec
```

Or using `pipx`:

```bash
pipx run magic-spec
```

Or to install the latest edge version directly from the GitHub `main` branch:

```bash
uvx --from git+https://github.com/teratron/magic-spec.git magic-spec
```

## 🏗️ Architecture: Thin Client

Both installers act as lightweight wrappers. They do not bundle the entire SDD engine. Instead, they:

1. **Payload Discovery**: Download the latest versioned tarball from GitHub releases.
2. **Security Verification**: Validate the payload to prevent path traversal and ensure safe extraction.
3. **Engine Deployment**: Extract `.magic/` (engine) and `.agent/` (workflows) into your project root.
4. **Initialization**: Automatically run the project-level init script (`.magic/scripts/init.sh` or `.ps1`).

## 🕹️ CLI Commands & Arguments

Manage your Magic Spec installation with these flags:

| Command | Description |
| :--- | :--- |
| `info` | Displays version info, installation paths, and detected environment. |
| `--update` | Pulls the latest engine components while preserving your `.design/` folder. |
| `--check` | Checks GitHub/PyPI for available updates. |
| `--list-envs` | Lists available IDE adapters (Cursor, Windsurf, etc.). |
| `--env <id>` | Supported adapters: cursor-agent, copilot, claude, gemini, roo, windsurf, amp, q, kilocode, qwen, opencode, shai, bob, codebuddy, qodercli, codex, auggie, agy. |
| `--doctor` | Checks for missing files or inconsistencies in your workspace. |
| `--eject` | Uninstalls Magic Spec and removes the `.magic/` folder. |
| `--yes`, `-y` | Non-interactive mode (auto-accepts prompts; still shows `init.sh` safety warning). |
| `--fallback-main` | Downloads from `main` branch (resolves and writes actual version to `.version`). |

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

## 📋 Requirements

| Requirement | Node.js Path | Python Path |
| :--- | :--- | :--- |
| **Runtime** | Node.js >= 16.x | Python >= 3.8 |
| **Tooling** | `npm` >= 7.x | `uv` or standard `pip` |
| **Utilities** | `tar` (system utility) | `connectivity` (GitHub access) |

[Main README](../README.md) | [Project Documentation](../docs/README.md)

