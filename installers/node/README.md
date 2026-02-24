# magic-spec — Node.js Installer

The `magic-spec` installer for npm/npx. It sets up the Specification-Driven Development (SDD) workflow in any project.

---

## Quick Start

Run in your project root:

```bash
npx magic-spec@latest
```

No additional installation required. `npx` will download the latest version and start the setup immediately.

---

## What the Installer Does

After execution, the following structure will be created in your project:

```plaintext
your-project/
│
├── .magic/                     # SDD Engine (read-only)
│   ├── onboard.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── run.md
│   ├── spec.md
│   ├── task.md
│   └── scripts/
│       ├── check-prerequisites.* # System health checks
│       ├── generate-context.*    # CONTEXT.md compilation
│       ├── init.sh               # Init script (macOS/Linux)
│       └── init.ps1              # Init script (Windows)
│
├── .agent/workflows/             # AI Agent Entry Points (Cursor, Claude, etc.)
│   ├── magic.onboard.md
│   ├── magic.rule.md
│   ├── magic.run.md
│   ├── magic.spec.md
│   └── magic.task.md
│
└── .design/                    # Project Workspace (created on init)
    ├── INDEX.md                # Specification registry
    ├── RULES.md                # Project constitution
    └── specifications/         # Your technical specifications
```

---

## Command Line Arguments

### Engine Installation (Default)

```bash
npx magic-spec@latest
```

Installs the `.magic/` engine and all `.agent/` entry points.

### Select Environment (Adapter)

To install adapters only for specific AI agents, use the `--env` flag:

Supported adapters: `cursor`, `github`, `kilocode`, `windsurf`.

```bash
# For Cursor only
npx magic-spec@latest --env cursor

# For GitHub workflows only
npx magic-spec@latest --env github

# For multiple environments
npx magic-spec@latest --env cursor --env windsurf
```

### Update Engine

Updates the `.magic/` core logic to the latest version without touching your `.design/` data:

```bash
npx magic-spec@latest --update
```

### System Health Check (Doctor)

Validates the `.design/` structure, specification statuses, and registry consistency:

```bash
npx magic-spec@latest --doctor
```

---

## Requirements

| Tool | Minimum Version |
| :--- | :--- |
| Node.js | >= 16 |
| npm | >= 7 |

---

## Credits & Links

- [Main Repository](https://github.com/teratron/magic-spec)
- [npm Package](https://www.npmjs.com/package/magic-spec)
