# Contributing to MAGIC-SPEC

Thank you for your interest in contributing to MAGIC-SPEC.  
This document covers repository structure, naming conventions, and contribution guidelines for the SDD engine and its installers.

## 📂 Repository Structure (This Project)

```plaintext
magic-spec/                         # github.com/teratron/magic-spec
│
├── .magic/                         # 🔧 SDD ENGINE (Source of Truth)
│   ├── scripts/                    #    Engine logic: execution, checksums, etc.
│   ├── templates/                  #    Core blueprints: specs, plans, tasks.
│   ├── .version                    #    Version source of truth
│   └── .checksums                  #    Engine integrity hashes
│
├── workflows/                      # 🎯 TEMPLATE WORKFLOWS (User-facing)
│   ├── magic.spec.md               #    Specification workflow
│   ├── magic.task.md               #    Task & Plan workflow
│   ├── magic.run.md                #    Execution workflow
│   └── ...
│
├── installers/                     # 🚀 INSTALLERS (Distribution)
│   ├── node/                       #    Node.js (npx) thin client
│   ├── python/                     #    Python (uvx/pipx) thin client
│   ├── scripts/                    #    Build, Publish & Test automation
│   ├── adapters.json               #    IDE/Agent path mapping
│   └── config.json                 #    Logic for packaging & updates
│
├── .agents/                        # 🛠️ INTERNAL DEV WORKFLOWS & SKILLS
│   ├── rules/                      #    Internal dev constraints
│   ├── skills/                     #    Dev skills (skill-creator, etc.)
│   └── workflows/
│       ├── magic.dev.simulate.md   #    Engine simulation & debugging
│       └── magic.*.md              #    Hardlinks -> workflows/magic.*.md
│
├── .claude/                        # 🤖 Claude Desktop internal config
│   ├── commands/                   #    Junction -> .agents/workflows/
│   ├── skills/                     #    Junction -> .agents/skills/
│   └── rules/                      #    Junction -> .agents/rules/
│
├── .design/                        # 🏠 Self-referential SDD State
│
├── docs/                           # 📄 Documentation
│   ├── README.md                   #    Technical guides
│   └── simulate.md                 #    Engine testing manual
│
├── pyproject.toml                  # Build config & Python dependencies
├── package.json                    # Build config & Node.js dependencies
├── AGENTS.md                       # Agent rules (Canonical Source)
├── CLAUDE.md                       # Hardlink -> AGENTS.md
├── QWEN.md                         # Hardlink -> AGENTS.md
├── README.md                       # Quick Start (User-facing)
├── CONTRIBUTING.md                 # This file
├── CHANGELOG.md                    # Version history
└── LICENSE                         # MIT
```

## 🏗️ User Project Structure

When a user runs `magic-spec init` in their project, the following is created:

```plaintext
my-project/                        # Any existing user project
│
├── .magic/                        # ⚙️ SDD ENGINE (Read-only dependency)
│   ├── scripts/
│   ├── templates/
│   ├── .version
│   └── .checksums
│
├── .agents/                       # 🎯 AGENT WORKFLOWS (Active interface)
│   └── workflows/                 #    (Default location for non-MDC agents)
│       ├── magic.spec.md
│       ├── magic.task.md
│       ├── magic.run.md
│       ├── magic.rule.md
│       └── magic.analyze.md
│
├── .design/                       # 📦 DESIGN WORKSPACE (User artifacts)
│   ├── specifications/            #    Project-specific Specs
│   ├── INDEX.md                   #    Spec Registry
│   ├── RULES.md                   #    Project Constitution (The Rules)
│   ├── PLAN.md                    #    Phased Development Plan
│   └── TASKS.md                   #    Atomic Task List
│
├── .cursor/rules/                 # 🔗 (If Cursor) MDC Rules
│   └── magic.*.mdc                #    Linked from workflows
│
└── .gitignore                     # Automatically updated by installer:
                                   # + .magic/
                                   # + .agents/
```

### Flow via Adapters

The specific location of workflows in a user project is determined by the IDE/Agent adapter (defined in `installers/adapters.json`).

- **Cursor**: Uses `.cursor/rules/*.mdc`
- **Windsurf**: Uses `.windsurf/rules/*.md`
- **Claude Code**: Uses `.claude/commands/*.md`
- **Standard**: Defaults to `.agents/workflows/*.md`

## 🏷️ Naming Conventions

### File Naming

- Workflows: `magic.<workflow_name>.md` (kebab-case).
- Scripts: `snake_case.js` or `snake_case.py`.
- Documentation: `kebab-case.md`.

### Metadata numbering

- **C-series** (Constraints): `C10`, `C11`, etc. (e.g., C14 Enforcement).
- **R-series** (Rules): Used in `.design/RULES.md`.
- **T-series** (Tests): Used in test suites.

## 📝 Workflow Checklist

Before submitting a change to any engine workflow in `.magic/` or `workflows/`:

- [ ] **Checksummed**: Run `node .magic/scripts/executor.js update-engine-meta --workflow {name}`.
- [ ] **Simulated**: Run `/magic.dev.simulate` to ensure engine logic integrity.
- [ ] **Validated**: `uv run ruff check --fix && uv run ruff format`.
- [ ] **Linked**: Ensure the workflow is present in `installers/config.json`.
- [ ] **Documented**: Update relevant `.md` file in `docs/` if logic changed.

## 🤝 Contribution Types

| Type | Branch | Notes |
| --- | --- | --- |
| **Engine fix** | `fix/engine-<name>` | Must update `.checksums` and `.version` |
| **New Adapter** | `feat/adapter-<name>` | Update `installers/adapters.json` |
| **Installer fix** | `fix/installer-<name>` | Test both Node and Python versions |
| **Documentation** | `docs/<page>` | Keep `README.md` and `docs/README.md` in sync |

## 🌐 Language Policy

- **Code, identifiers, technical docs**: English ONLY.
- **Commit messages, PR descriptions**: English ONLY.
- **Discussions, planning, chat**: Russian.

## 📦 Build & Release

### Distribution Layers

1. **Core**: The raw `.magic/` and `workflows/` content.
2. **Installer**: CLI tools that download and deploy the Core.

### Testing Installers

```bash
# Test Node installer
node installers/node/index.js --info

# Test Python installer
python -m installers.python --info
```

### Release Process

1. Update `pyproject.toml`, `package.json`, and `.magic/.version`.
2. run `python installers/scripts/publish.py <old> <new>`.

---
*MAGIC-SPEC v1.4.2* — "Thought → Spec → Task → Run → Code"
