# 🪄 Magic Spec

![GitHub Release](https://img.shields.io/github/v/release/teratron/magic-spec)
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

4. Integrate workflows or skills into your AI agent's environment (see [Integration](#-integration)).

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

Magic Spec includes a built-in version-check rule (`rules/magic.md`). Your AI agent compares `.magic/.version` against the upstream engine version at most once per project per 7 days, stores the result in `.design/.cache/magic-version-check.json`, skips the remote check in CI, and prompts you when an update is available.

To update manually:

1. Download the new release archive from [Releases](https://github.com/teratron/magic-spec/releases/latest).
2. Replace `.magic/`, `workflows/`, `skills/`, and `rules/` in your project.
3. Run `/magic.analyze` to verify synchronization.

## 🔗 Integration

Magic Spec is designed to be agent-agnostic. You can integrate the engine's capabilities by linking or copying files from `workflows/` or `skills/` to your agent's specific configuration directory.

- **Workflows (`workflows/`)**: Standard Markdown files for agents that support "slash commands" or prompt-based rules (e.g., Cursor, Windsurf, GitHub Copilot).
- **Skills (`skills/`)**: Structured tool directories for agents that support modular "tools" or "skills" (e.g., Claude Code, Antigravity).

> [!TIP]
> **Flexibility**: You can choose to use either directory or both, depending on your agent's requirements. For detailed integration patterns and directory mappings, see the [Distribution Guide](./docs/distribution.md).

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
| [**Distribution Guide**](./docs/distribution.md) | Integration patterns, manual install, and update instructions |
| [**Contributing**](./CONTRIBUTING.md) | How to develop, test, and extend the engine |

## 🛟 Support

If you encounter issues or have questions — open an [Issue](https://github.com/teratron/magic-spec/issues) on GitHub.

## 🗺️ Roadmap

- [x] Multi-agent integration system.
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

**Active Development** (v2.0.23). We are constantly refining the SDD engine based on real-world usage.
