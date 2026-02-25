# 🪄 Magic Spec

[![NPM version](https://img.shields.io/npm/v/magic-spec)](https://www.npmjs.com/package/magic-spec)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/teratron/magic-spec/blob/main/LICENSE)

**Specification-Driven Development (SDD) workflow for AI coding agents.**

`magic-spec` installs a structured pipeline — *Thought → Spec → Task → Run → Code* — directly into your project.

## 🚀 Quick Start

Run in your project root:

```bash
npx magic-spec@latest
```

## 📁 What Gets Installed

```plaintext
your-project/
├── .agent/workflows/         # slash commands (magic.spec, magic.task, etc.)
├── .magic/                   # SDD Engine (workflow logic, read-only)
└── .design/                  # Project Design (INDEX.md, RULES.md, PLAN.md)
```

## ⚙️ CLI Options

| Option | Description |
| :--- | :--- |
| `--env <names>` | Install adapters (e.g., `--env cursor,windsurf`) |
| `--update` | Update `.magic/` engine only |
| `--check` | Check current version vs project |
| `--eject` | Remove `magic-spec` managed files |
| `--yes` | Skip confirmation prompts |
| `--help` | Show help |

## 🤝 Compatibility

- **Cursor**
- **Windsurf**
- **Claude (Projects)**
- **Gemini**
- **GitHub Copilot**

## 📄 License & Links

[MIT License](https://github.com/teratron/magic-spec/blob/main/LICENSE)

- [GitHub Repository](https://github.com/teratron/magic-spec)
- [PyPI Alternative](https://pypi.org/project/magic-spec/)
