# magic-spec — Node.js Installer

The `magic-spec` installer for npm/npx. It sets up the Specification-Driven Development (SDD) workflow in any project.

---

## Quick Start

Run in your project root:

```bash
npx magic-spec@latest
# For non-interactive (CI/CD) use:
npx magic-spec@latest --yes
```

No additional installation required. `npx` will download the latest version and start the setup immediately.

---

## What the Installer Does

1. **Download**: Pulls the versioned payload from GitHub.
2. **Security Check**: Verifies the downloaded payload for path traversal vulnerabilities.
3. **Confirm Script Execution**: Unless `--yes` is provided, you will be prompted to confirm the execution of the initialization script.
4. **Extract**: Temp-extracts the payload.
5. **Copy**: Moves `.magic/` and `.agent/` workflows into your folder.
6. **Run Init**: Executes `.magic/scripts/init.sh` (or `.ps1` on Windows) to create the `.design/` workspace (`INDEX.md`, `RULES.md`).

---

## Command Line Arguments

- `--env <adapter>`: Install a specific environment adapter (e.g., `react`, `bevy`). Can be used multiple times.
- `--yes`, `-y`: Skip the security prompt for executing the initialization script.
- `--update`: Only update the `.magic/` engine, skipping workspace initialization.
- `--doctor`, `--check`: Validate the state of the `.design/` workspace (Requires previous initialization).
- `--fallback-main`: Force pull from the `main` branch instead of the packge version tag.

---

## Requirements

| Tool | Minimum Version |
| :--- | :--- |
| Node.js | >= 16 |
| npm | >= 7 |
| tar | (Required for extraction) |

---

## Credits & Links

- [Main Repository](https://github.com/teratron/magic-spec)
- [npm Package](https://www.npmjs.com/package/magic-spec)
