# 🪄 Magic Spec

[![npm version](https://img.shields.io/npm/v/magic-spec)](https://www.npmjs.com/package/magic-spec)
[![PyPI version](https://img.shields.io/pypi/v/magic-spec)](https://pypi.org/project/magic-spec/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Specification-Driven Development (SDD) workflow for AI coding agents.**

Stop your AI from writing code before it understands the problem.  
`magic-spec` installs a structured pipeline — *Thought → Spec → Plan → Task → Code* — directly into any project, regardless of stack.

## ✨ What is Magic Spec?

`magic-spec` is a set of **markdown-based workflow instructions** for AI coding agents (Cursor, Claude, Gemini, Copilot, etc.). It acts as an operating system for agentic development, enforcing a rigorous, structured pipeline:

```
💡 Idea  →  📋 Specification  →  🗺️ Plan  →  ⚡ Task  →  🚀 Code  →  🔍 Retrospective
```

Once installed, your AI agent will automatically:

- Convert raw thoughts into structured specification files.
- Build a phased implementation plan from approved specs.
- Decompose the plan into atomic, trackable tasks.
- Analyze its own workflow and suggest improvements.

**No code is written until a specification exists. No spec is implemented without a plan.**

## 🚀 Quick Start

Works with **any project** — Rust, Go, Python, JavaScript, or anything else.  
No runtime lock-in. Requires only Node.js *or* Python to install.

### Option A — Node.js (npx)

```bash
npx magic-spec@latest
```

### Option B — Python (uvx)

```bash
uvx magic-spec
```

Both commands do exactly the same thing:

1. Copy `.magic/` (the SDD engine) into your project.
2. Copy `.agent/workflows/magic.*.md` (agent trigger wrappers) into your project.
3. Run the init script — creates your `.design/` workspace with `INDEX.md` and `RULES.md`.

## 🧭 Core Philosophy

| Principle | Description |
| :--- | :--- |
| **Specs First, Code Later** | The agent is forbidden from writing code from raw input. All ideas become specs first. |
| **Deterministic Process** | A strict pipeline is enforced: *Thought → Spec → Plan → Task → Code*. |
| **Constitution-Driven** | All project decisions live in `.design/RULES.md` — the project's living constitution. |
| **Self-Improving** | The Retrospective workflow analyzes real usage and generates improvement recommendations. |

## 📁 What Gets Installed

After running `npx magic-spec@latest` in your project root:

```plaintext
your-project/
│
├── .agent/workflows/               # Agent entry points (slash commands)
│   ├── magic.plan.md
│   ├── magic.retrospective.md
│   ├── magic.rule.md
│   ├── magic.specification.md
│   └── magic.task.md
│
├── .magic/                     # SDD Engine (workflow logic, read-only)
│   ├── init.md
│   ├── plan.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── specification.md
│   ├── task.md
│   └── scripts/
│       ├── init.sh             # Init for macOS / Linux
│       └── init.ps1            # Init for Windows
│
└── .design/                    # Your project workspace (generated)
    ├── INDEX.md                # Spec registry
    ├── RULES.md                # Project constitution
    ├── PLAN.md                 # Implementation plan
    ├── specifications/         # Your specification files
    └── tasks/                  # Task breakdowns per phase
```

## 🔗 The Workflow Pipeline

```mermaid
graph TD
    IDEA["💡 Idea"] --> INIT{"🏗️ Auto-Init"}
    INIT -->|.design/ exists| SPEC
    INIT -->|.design/ missing| CREATE["Create .design/ structure"] --> SPEC
    SPEC["📋 Specification"] <--> RULE["📜 Rule"]
    SPEC --> PLAN["🗺️ Plan"]
    PLAN --> TASK["⚡ Task"]
    TASK --> CODE["🚀 Code"]
    CODE --> RETRO["🔍 Retrospective"]
    RETRO -.->|Feedback loop| SPEC
```

### Core Workflows

| # | Workflow | Purpose |
| :--- | :--- | :--- |
| 1 | **Specification** | Converts raw thoughts into structured specs. Manages statuses: `Draft → RFC → Stable → Deprecated`. |
| 2 | **Plan** | Reads Stable specs, builds a dependency graph, and produces a phased `PLAN.md`. |
| 3 | **Task** | Decomposes the plan into atomic tasks with sequential and parallel execution tracks. |

### Auxiliary Workflows

| Workflow | Purpose |
| :--- | :--- |
| **Rule** | Manages the project constitution (`RULES.md §7`). Add, amend, or remove conventions. |
| **Retrospective** | Analyzes SDD usage, collects metrics, and generates improvement recommendations. |

## 💬 How to Use (with any AI agent)

Just talk to your AI agent naturally. Initialization is **automatic** — no setup command required.

```plaintext
"Dispatch this thought into specs: I want a user auth system with JWT and Redis..."
→ Runs Specification workflow

"Create an implementation plan"
→ Runs Plan workflow

"Generate tasks for Phase 1"
→ Runs Task workflow

"Execute the next task"
→ Runs Task workflow (execution mode)

"Add rule: always use snake_case for file names"
→ Runs Rule workflow

"Run retrospective"
→ Runs Retrospective workflow
```

The AI reads the corresponding `.magic/*.md` workflow file and executes the request within the bounds of the SDD system. **No code escapes the pipeline.** ✨

## 🔄 Updating

Pull the latest engine improvements without touching your project data:

```bash
# Node.js
npx magic-spec@latest --update

# Python
uvx magic-spec --update
```

The update overwrites `.magic/` (the engine) but **never touches** `.design/` (your specs, plans, and tasks).

## 🤝 Compatibility

Works with any AI coding agent that can read markdown workflow files:

- [Cursor](https://cursor.sh) (`.cursorrules` + Agent mode)
- [Claude](https://claude.ai) (Projects)
- [Gemini](https://gemini.google.com) (via Gemini Code)
- [GitHub Copilot](https://github.com/features/copilot) (Agent mode)
- Any terminal-based or API-driven agent

## 📄 License

[MIT](./LICENSE) © 2026 Oleg Alexandrov
