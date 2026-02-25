# 📦 Magic Spec — Installers

Magic Spec provides two native installers to accommodate different development environments. Both installers implement a **thin-client architecture**, meaning they are lightweight wrappers that download, verify, and extract the SDD engine and agent workflows directly from GitHub.

## 🚀 Choose Your Path

| Installer | Command | Best For | Requirements |
| :--- | :--- | :--- | :--- |
| **Node.js** | `npx magic-spec` | Frontend/JS projects and CI/CD. | Node.js >= 16 |
| **Python** | `uvx magic-spec` | Python/Data science or systems with `uv`/`pipx`. | Python >= 3.8 |

---

## 🛠️ How They Work

Regardless of the language chosen, both installers perform the same sequence to ensure a consistent SDD experience:

1. **Payload Discovery**: Determine the latest version and download the corresponding `.tgz` payload from GitHub.
2. **Security Verification**: Validate the payload to prevent path traversal and ensuring safe extraction.
3. **Engine Deployment**: Extract the `.magic/` (engine) and `.agent/` (wrappers) directories into your project root.
4. **Automatic Initialization**: Run the project-level init script to set up the `.design/` workspace (`INDEX.md`, `RULES.md`).

## 📖 Detailed Instructions

- [Node.js Installer Documentation](./node/README.md)
- [Python Installer Documentation](./python/README.md)

## 🧭 Common Commands

All installers support the same core commands for managing your Magic Spec environment:

- `info`: Check current installation state.
- `--update`: Updates the engine while preserving your design workspace.
- `--env <adapter>`: Optimizes rules for specific IDEs (Cursor, Windsurf, etc.).
- `--doctor`: Verifies the health of your `.design/` workspace.
- `--eject`: Safely removes Magic Spec from your project.

---

[Main README](../../README.md) | [Documentation](../../docs/README.md)
