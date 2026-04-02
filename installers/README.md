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
3. **Engine Deployment**: Extract `.magic/` (engine) and `.agents/` (workflows) into your project root.
4. **Initialization**: Automatically run the project-level init script via `node .magic/scripts/executor.js init`.
5. **`.gitignore` Management**: Append `.magic/` and the adapter directory (e.g., `.agents/`, `.cursor/rules/`) to your project's `.gitignore`. These are installed dependencies and should not be committed. To vendor them, remove the entries from `.gitignore`.

## 🕹️ CLI Commands & Arguments

Manage your Magic Spec installation with these flags:

| Command | Description |
| :--- | :--- |
| `info` | Displays version info, installation paths, and detected environment. |
| `--update` | Pulls the latest engine and adapter components while preserving your `.design/` folder with smart conflict resolution. |
| `--dev` | **New!** Installs development-specific instruments (simulation workflows, testing suites, engine maintenance scripts). |
| `--check` | Checks GitHub/PyPI for available updates. |
| `--env <id>` | Specify adapter explicitly by ID (e.g. `cursor`, `copilot`). |
| `--<adapter>` | **New!** Shortcut flag for any adapter (e.g. `--cursor`, `--windsurf`). |
| `--list-envs` | Lists all available IDE adapters and their destination paths. |
| `--doctor` | Checks for missing files or inconsistencies in your workspace. |
| `--eject` | Uninstalls Magic Spec and removes the `.magic/` folder. |
| `--yes`, `-y` | Non-interactive mode (auto-accepts prompts; still shows engine initialization safety warning). |
| `--fallback-main` | Downloads from `main` branch instead of the latest stable tag. |

## 🧩 Adapter Shortcuts

Instead of the long `--env cursor` syntax, you can now use direct flags. This is particularly useful when you have multiple AI tools open in the same project:

```bash
# Install Cursor and Copilot support simultaneously
npx magic-spec --cursor --copilot
```

### Supported Shortcuts

`--cursor`, `--copilot`, `--claude`, `--gemini`, `--roo`, `--windsurf`, `--amp`, `--q`, `--kilocode`, `--qwen`, `--opencode`, `--shai`, `--bob`, `--codebuddy`, `--qoder`, `--codex`, `--augment`, `--antigravity`, `--lingma`.

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
