# 🪄 Magic Spec

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
> **Magic Workspaces**: Multiple isolated design environments within a single repo (e.g., `.design/engine/`, `.design/web/`). See [SDD Philosophy](./docs/conception.md) for details.

## 📦 Installation

Works with **any project** — Rust, Go, Python, JavaScript, C++, or anything else. No runtime lock-in.

### Option A: Download from GitHub Releases (Recommended)

1. Go to [Releases](https://github.com/teratron/magic-spec/releases/latest).
2. Download `magic-spec-vX.Y.Z.zip`.
3. Extract and copy the following folders into your project root:

   ```plaintext
   your-project/
   ├── .magic/       ← copy from the release archive
   ├── workflows/    ← copy from the release archive
   ├── skills/       ← copy from the release archive
   └── rules/        ← copy from the release archive
   ```

4. Place the workflow files in your AI agent's commands directory (see [Adapter Paths](#️-adapter-paths)).

### Option B: Manual Clone

```bash
# Clone just the needed folders
git clone --depth 1 https://github.com/teratron/magic-spec.git _magic_tmp
cp -r _magic_tmp/.magic _magic_tmp/workflows _magic_tmp/skills _magic_tmp/rules ./
rm -rf _magic_tmp
```

### Post-Install: `.gitignore`

Add these entries to your `.gitignore` — the engine files are installed dependencies, like `node_modules/`:

```
.magic/
skills/
.agents/
```

> [!TIP]
> **Vendoring**: To commit the engine into your repo (so teammates get it without reinstalling), simply omit these entries from `.gitignore`.

## 🔄 Updating

Magic Spec includes a built-in version-check rule (`rules/version-check.md`). Your AI agent will automatically compare `.magic/.version` against the latest GitHub release at the start of each session and prompt you when an update is available.

To update manually:

1. Download the new release archive from [Releases](https://github.com/teratron/magic-spec/releases/latest).
2. Replace `.magic/`, `workflows/`, `skills/`, and `rules/` in your project.
3. Run `/magic.analyze` to verify synchronization.

## 🗂️ Adapter Paths

Copy the workflow files from `workflows/` to your AI agent's commands directory:

| AI Agent / IDE | Target Directory | File Extension |
| :--- | :--- | :--- |
| [**Cursor**](https://cursor.com) | `.cursor/rules/` | `.mdc` |
| [**Windsurf**](https://codeium.com/windsurf) | `.windsurf/rules/` | `.md` |
| [**Claude Code**](https://claude.ai/code) | `.claude/commands/` | `.md` |
| [**Gemini CLI**](https://gemini.google.com) | `.gemini/commands/` | `.toml` |
| [**GitHub Copilot**](https://github.com/features/copilot) | `.github/prompts/` | `.prompt.md` |
| **Roo Code** | `.roo/commands/` | `.mdc` |
| **Amp** | `.agents/commands/` | `.md` |
| **Amazon Q Developer** | `.amazonq/prompts/` | `.md` |
| **Kilo Code** | `.kilocode/workflows/` | `.md` |
| **Qwen Code** | `.qwen/commands/` | `.md` |
| **OpenCode** | `.opencode/commands/` | `.md` |
| **SHAI (OVHcloud)** | `.shai/commands/` | `.md` |
| **IBM Bob** | `.bob/commands/` | `.md` |
| **CodeBuddy** | `.codebuddy/commands/` | `.md` |
| **Qoder IDE** | `.qoder/commands/` | `.md` |
| **Codex CLI** | `.codex/prompts/` | `.md` |
| **Auggie CLI** | `.augment/commands/` | `.md` |
| **Antigravity IDE** | `.agents/workflows/` | `.md` |
| **Lingma IDE** | `.lingma/commands/` | `.md` |

For detailed adapter notes, see [docs/distribution.md](./docs/distribution.md).

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
/magic.analyze engine                  # Analyze only the "engine" workspace

# With directive (quoted text)
/magic.task "decompose phase-2"        # Guided planning with focus
/magic.run "T-1A01"                    # Execute a specific task by ID
/magic.run "phase-2"                   # Execute all tasks in a phase
/magic.analyze "check API coverage"    # Focused analysis on a specific area

# Workspace + directive
/magic.run engine "phase-1"            # Execute phase 1 in "engine" workspace
/magic.task engine "only new specs"    # Plan only new specs in "engine" workspace
```

> [!NOTE]
> **For AI IDE users (Cursor, Windsurf, Claude Code, etc.):** When you type `/` in the chat, a dropdown list of available commands appears and selecting one immediately executes it **without arguments**. If you need to pass arguments (workspace name, task ID, directive), **type the full command manually** instead of selecting from the dropdown.

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| [**Main Documentation**](./docs/README.md) | Workflows, architecture, and advanced features |
| [**SDD Philosophy**](./docs/conception.md) | Two-Layer Model, Integrity by Design, Self-Improving Feedback Loop |
| [**Distribution Guide**](./docs/distribution.md) | Adapter paths, manual install, and update instructions |
| [**Contributing**](./CONTRIBUTING.md) | How to develop, test, and extend the engine |

## 🛟 Support

If you encounter issues or have questions — open an [Issue](https://github.com/teratron/magic-spec/issues) on GitHub.

## 🗺️ Roadmap

- [x] Multi-agent adapter system.
- [x] Phased implementation planning.
- [x] GitHub-based manual distribution.
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

**Active Development** (v2.0.4). We are constantly refining the SDD engine based on real-world usage.
