# 🪄 Magic Spec

[![NPM version](https://img.shields.io/npm/v/magic-spec?color=green&label=npm)](https://www.npmjs.com/package/magic-spec)
[![PyPI version](https://img.shields.io/pypi/v/magic-spec?color=blue&label=pypi)](https://pypi.org/project/magic-spec/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

## 📖 Description

**The Specification-Driven Development (SDD) Operating System for AI Coding Agents.**

`magic-spec` installs a structured pipeline — *Thought → Spec → Task → Run → Code* — directly into any project, regardless of the tech stack. It acts as a set of **markdown-based workflow instructions** for AI coding agents (Cursor, Windsurf, Claude Code, Gemini CLI, and others), enforcing a deterministic process that ensures the AI fully understands the problem before writing code.

```plaintext
💡 Idea  →  📋 Specification  →  🗺️ Task & Plan  →  ⚡ Run  →  🚀 Code
```

### What Gets Installed

```plaintext
your-project/
├── .agents/workflows/   # Slash commands (magic.spec, magic.task, magic.run, ...)
├── .magic/              # SDD Engine (workflow logic and scripts — read-only)
└── .design/             # Your Design Workspace (INDEX.md, RULES.md, PLAN.md)
```

> [!TIP]
> **Magic Workspaces**: Multiple isolated design environments within a single repo (e.g., `.design/engine/`, `.design/web/`). See [workspaces.md](./workspaces.md) for details.

## ⚙️ Requirements

| Requirement | Details |
| :--- | :--- |
| **Node.js** | Version `16.x` or higher (for `npx` method) |
| **Python** | Version `3.8` or higher (for `uvx` or `pipx` methods) |
| **Git** | Required for installing edge versions directly from GitHub |
| **Terminal** | `tar` utility (pre-installed on Windows/Linux/macOS) |

## 📦 Installation

Works with **any project** — Rust, Go, Python, JavaScript, C++, or anything else. No runtime lock-in.

### Option A: Node.js (`npx`)

**Stable Release:**

```bash
# Basic installation (defaults to .agents/ folder)
npx magic-spec@latest

# Targeted installation for a specific AI agent
npx magic-spec@latest --cursor
npx magic-spec@latest --claude
npx magic-spec@latest --windsurf
```

**Edge Version (GitHub):**

```bash
npx --yes github:teratron/magic-spec
```

### Option B: Python (`uvx`)

**Stable Release:**

```bash
# Basic installation
uvx magic-spec

# Targeted installation
uvx magic-spec --windsurf
```

**Edge Version (GitHub):**

```bash
uvx --from git+https://github.com/teratron/magic-spec.git magic-spec
```

### Option C: Python (`pipx`)

```bash
pipx run magic-spec
```

### Option D: Multi-Adapter Installation

Install support for multiple adapters at once:

```bash
npx magic-spec@latest --cursor --copilot --windsurf
```

### Option E: Manual Installation

1. Download `.magic/` and [`workflows/`](https://github.com/teratron/magic-spec/tree/main/workflows) from the [GitHub repository](https://github.com/teratron/magic-spec).
2. Place files into your AI agent's instruction directory (e.g., `.cursor/commands`).

### Post-Install: `.gitignore`

The installer automatically adds `.magic/` and the adapter directory (e.g., `.agents/`) to `.gitignore`. These are **installed dependencies** (like `node_modules/`) — reinstall via `npx magic-spec@latest` rather than committing.

> [!TIP]
> **Vendoring**: To commit the engine into your repo (so teammates get it without running the installer), remove the `.magic/` and `.agents/` entries from `.gitignore`.

## 🔄 Updating

```bash
# Check if update is available
npx magic-spec@latest --check

# Perform the update
npx magic-spec@latest --update
```

> [!TIP]
> The update preserves your `.design/` workspace and creates backups of `.magic/` and `.agents/`. After updating, run `/magic.analyze` to ensure synchronization.

## 💬 Usage

### Natural Language

Talk to your AI agent naturally — it will route to the correct workflow:

- *"Create a spec for user authentication"* → **Specification** workflow
- *"Build an implementation plan"* → **Task & Plan** workflow
- *"Execute the next task"* → **Run** workflow
- *"Add a rule: always use Inter font"* → **Rule** workflow
- *"Run a project audit"* → **Analyze** workflow

### Slash Commands

All core workflows are available as slash commands with optional arguments:

| Command | Purpose |
| :--- | :--- |
| `/magic.spec` | Create or update specifications |
| `/magic.task` | Generate implementation plan and tasks |
| `/magic.run` | Execute tasks from the plan |
| `/magic.rule` | Add or amend project conventions |
| `/magic.analyze` | Audit project health and detect drift |

#### Commands with Arguments

Each command accepts optional arguments to scope the operation to a specific **workspace** or provide a **directive**:

```bash
# No arguments — operates across all workspaces
/magic.spec
/magic.task
/magic.run

# Workspace-scoped
/magic.task engine                     # Plan only for the "engine" workspace
/magic.run installers                  # Execute tasks in "installers" workspace
/magic.analyze engine                  # Analyze only the "engine" workspace

# With directive (quoted text)
/magic.task "decompose phase-2"        # Guided planning with focus
/magic.run "T-1A01"                    # Execute a specific task by ID
/magic.run "phase-2"                   # Execute all tasks in a phase
/magic.analyze "check API coverage"    # Focused analysis on a specific area

# Workspace + directive
/magic.run installers "phase-1"        # Execute phase 1 in "installers" workspace
/magic.task engine "only new specs"    # Plan only new specs in "engine" workspace
```

> [!NOTE]
> **For AI IDE users (Cursor, Windsurf, Claude Code, etc.):** When you type `/` in the chat, a dropdown list of available commands appears and selecting one immediately executes it **without arguments**. If you need to pass arguments (workspace name, task ID, directive), **type the full command manually** instead of selecting from the dropdown. For example, type `/magic.run "phase-2"` directly rather than clicking `/magic.run` from the list.

## 🤝 Compatibility

Magic Spec provides native workflow generation for all major AI development environments.

Install with a shortcut flag (e.g., `--cursor`) or the environment flag (e.g., `--env cursor`).

| AI Agent / IDE | Shortcut Flag | Env Flag |
| :--- | :--- | :--- |
| [**Cursor**](https://cursor.com) (Agent Mode) | `--cursor` | `--env cursor` |
| [**Windsurf**](https://codeium.com/windsurf) (Cascade) | `--windsurf` | `--env windsurf` |
| [**Claude Code**](https://claude.ai/code) | `--claude` | `--env claude` |
| [**Gemini CLI**](https://gemini.google.com) | `--gemini` | `--env gemini` |
| [**GitHub Copilot**](https://github.com/features/copilot) | `--copilot` | `--env copilot` |
| **Roo Code** | `--roo` | `--env roo` |
| **Amp** | `--amp` | `--env amp` |
| **Amazon Q Developer** | `--q` | `--env q` |
| **Kilo Code** | `--kilocode` | `--env kilocode` |
| **Qwen Code** | `--qwen` | `--env qwen` |
| **OpenCode** | `--opencode` | `--env opencode` |
| **SHAI (OVHcloud)** | `--shai` | `--env shai` |
| **IBM Bob** | `--bob` | `--env bob` |
| **CodeBuddy** | `--codebuddy` | `--env codebuddy` |
| **Qoder IDE** | `--qoder` | `--env qoder` |
| **Codex CLI** | `--codex` | `--env codex` |
| **Auggie CLI** | `--augment` | `--env augment` |
| **Antigravity IDE** | `--antigravity` | `--env antigravity` |
| **Lingma IDE** | `--lingma` | `--env lingma` |

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| [**Main Documentation**](./docs/README.md) | Workflows, architecture, and advanced features |
| [**SDD Philosophy**](./docs/conception.md) | Two-Layer Model, Integrity by Design, Self-Improving Feedback Loop |
| [**Installers Guide**](./installers/README.md) | Advanced CLI options and platform specifics |
| [**Contributing**](./CONTRIBUTING.md) | How to develop, test, and extend the engine |

## 🛟 Support

If you encounter issues or have questions — open an [Issue](https://github.com/teratron/magic-spec/issues) on GitHub.

## 🗺️ Roadmap

- [x] Multi-agent adapter system.
- [x] Phased implementation planning.
- [ ] Extended support for local-first LLM agents.
- [ ] Advanced visual dashboard for project health.
- [ ] Integration with CI/CD for automated spec validation.

## 🏗️ Contributing

We welcome contributions! See the [**Contributing Guide**](./CONTRIBUTING.md) for details.

## 👥 Authors and Acknowledgments

- **Oleg Alexandrov** — Creator and Lead Maintainer.
- Special thanks to the AI agent community for inspiration and testing.

## 📄 License

Distributed under the [Apache License 2.0](./LICENSE).

## 📊 Project Status

**Active Development** (v1.5.169). We are constantly refining the SDD engine based on real-world usage.
