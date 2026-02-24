# magic-spec — Python Installer

The `magic-spec` installer for PyPI/uvx. It sets up the Specification-Driven Development (SDD) workflow in any project.

---

## Quick Start

### Via `uvx` (Recommended)

```bash
uvx magic-spec
```

`uvx` automatically downloads and runs the package in an isolated environment. Subsequent runs use the cache.

### Via `pip` / `pipx`

```bash
pip install magic-spec
# or
pipx install magic-spec

magic-spec
```

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
uvx magic-spec
```

Installs the `.magic/` engine and all `.agent/` entry points.

### Select Environment (Adapter)

To install adapters only for specific AI agents, use the `--env` flag:

```bash
# For Cursor only
uvx magic-spec --env cursor

# For multiple environments
uvx magic-spec --env cursor --env claude
```

### Update Engine

Updates the `.magic/` core logic to the latest version without touching your `.design/` data:

```bash
uvx magic-spec --update
```

### System Health Check (Doctor)

Validates the `.design/` structure, specification statuses, and registry consistency:

```bash
uvx magic-spec --doctor
```

---

## Requirements

| Tool | Minimum Version |
| :--- | :--- |
| Python | >= 3.8 |
| uv / pip / pipx | Any modern version |

---

## Credits & Links

- [Main Repository](https://github.com/teratron/magic-spec)
- [PyPI Package](https://pypi.org/project/magic-spec/)
