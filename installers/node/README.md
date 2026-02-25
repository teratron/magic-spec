# 🟩 magic-spec — Node.js Installer

The `magic-spec` Node.js installer provides a lightweight way to deploy the Specification-Driven Development (SDD) workflow using `npm` or `npx`. It is designed for speed, security, and zero-configuration setups.

---

## ⚡ Quick Start

Run in your project root to install or initialize:

```bash
npx magic-spec@latest
```

### Automation (CI/CD)

To skip prompts and use default settings:

```bash
npx magic-spec@latest --yes
```

---

## 🏗️ Architecture: Thin Client

This installer acts as a **Thin Client**. It does not bundle the entire SDD engine. Instead, it:

1. Downloads the specific versioned payload from GitHub releases.
2. Verifies the payload integrity and prevents path traversal.
3. Extracts the payload into your local directory.
4. Triggers the platform-specific initialization script (`.magic/scripts/init.sh` or `.ps1`).

---

## 🕹️ CLI Commands & Arguments

Manage your Magic Spec installation with these flags:

| Command | Description |
| :--- | :--- |
| `info` | Displays version info, installation paths, and detected environment. |
| `--update` | Pulls the latest engine components without touching your `.design/` folder. |
| `--check` | Checks GitHub for available updates. |
| `--list-envs` | Lists available IDE adapters (Cursor, Windsurf, Copilot, etc.). |
| `--env <id>` | Configures Magic Spec for a specific IDE (e.g., `--env cursor`). |
| `--doctor` | Checks for missing files or inconsistencies in your `.design/` workspace. |
| `--eject` | Uninstalls Magic Spec and removes the `.magic/` folder. |
| `--yes` | Non-interactive mode (auto-accepts all prompts). |
| `--fallback-main` | Downloads the payload from the `main` branch instead of a tagged release. |

---

## 📋 Requirements

| Prerequisite | Minimum Version |
| :--- | :--- |
| **Node.js** | 16.x or higher |
| **npm** | 7.x or higher |
| **tar** | System utility for extraction |

---

## 🔗 Links

- [GitHub Repository](https://github.com/teratron/magic-spec)
- [npm Package](https://www.npmjs.com/package/magic-spec)
- [Project Documentation](../../docs/README.md)
