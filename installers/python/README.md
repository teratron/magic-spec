# 🟦 magic-spec — Python Installer

The `magic-spec` Python installer offers a robust way to deploy the Specification-Driven Development (SDD) workflow using `uv` or `pipx`. It is built for developers who prefer Python-native tooling and environments.

---

## ⚡ Quick Start

Run in your project root using `uv` (recommended):

```bash
uvx magic-spec
```

### Automation (CI/CD)

To skip prompts and use default settings:

```bash
uvx magic-spec --yes
```

> **Note:** Also works with `pipx run magic-spec` or dynamic execution via `python -m magic_spec`.

---

## 🏗️ Architecture: Thin Client

Like the Node.js counterpart, this installer is a **Thin Client**. It ensures your project remains light while providing access to the latest SDD engine features:

1. Downloads the specific versioned tarball from GitHub.
2. Performs safe extraction using Python's `tarfile` module (hardened against path traversal).
3. Deploys `.magic/` (engine) and `.agent/` (workflows) to your project.
4. Executes the initialization script (`.magic/scripts/init.sh` or `.ps1`).

---

## 🕹️ CLI Commands & Arguments

| Command | Description |
| :--- | :--- |
| `info` | Displays version info, installation paths, and active environment adapter. |
| `--update` | Updates engine components while preserving your `.design/` workspace. |
| `--check` | Verifies if a newer version is available on GitHub/PyPI. |
| `--list-envs` | Enumerates supported IDE adapters (Cursor, Windsurf, etc.). |
| `--env <id>` | Switches the active environment adapter. |
| `--doctor` | Runs health checks on the `.design/` workspace. |
| `--eject` | Removes the Magic Spec engine and configuration from the project. |
| `--yes`, `-y` | Enables non-interactive mode. |
| `--fallback-main` | Forces download from the `main` branch. |

---

## 📋 Requirements

| Prerequisite | Minimum Version |
| :--- | :--- |
| **Python** | 3.8 or higher |
| **Tooling** | `uv`, `pipx`, or standard `pip` |
| **Connectivity** | GitHub access for payload download |

---

## 🔗 Links

- [GitHub Repository](https://github.com/teratron/magic-spec)
- [PyPI Package](https://pypi.org/project/magic-spec/)
- [Project Documentation](../../docs/README.md)
