---
name: magic-dev-init
description: Initialize Magic Spec development environment with junctions and symlinks.
---

# Dev Init Workflow

Set up junctions, hardlinks, and symlinks so agent-facing directories mirror the canonical engine sources.

**Triggers:** *"Init dev env"*, *"Setup agent links"*, *"Rebuild junctions"*

## Arguments

```
/magic-dev-init [agents...]
```

| Mode | Effect |
| :--- | :--- |
| `/magic-dev-init` | Infrastructure only — no agents, only `.agents/` structure |
| `/magic-dev-init claude` | Targeted — only `CLAUDE.md` + `.claude/` |
| `/magic-dev-init claude qwen` | Targeted — only the named agents |

Valid agent names: `claude`, `gemini`, `qwen`, `codex`

> `.agents/workflows/`, `.agents/skills/`, and `.agents/rules/` are always initialized — agent directories depend on them.

## Agent Map

| Agent | Instruction File | Directory | Workflow Subdir |
| :--- | :--- | :--- | :--- |
| `claude` | `CLAUDE.md` | `.claude/` | `commands/` |
| `gemini` | `GEMINI.md` | `.gemini/` | `commands/` |
| `qwen` | `QWEN.md` | `.qwen/` | `commands/` |
| `codex` | `CODEX.md` | `.codex/` | `prompts/` |

## Steps

### 1. Detect OS

Windows → PowerShell script. Unix/macOS → Bash script.

### 2. Run Init Script

Must run from the repository root.

**Windows:**

```powershell
pwsh -NoProfile -File .agents/skills/magic-dev-init/scripts/setup_windows.ps1 [agents...]
```

**Unix:**

```bash
bash .agents/skills/magic-dev-init/scripts/setup_unix.sh [agents...]
```

Phases executed by the script:

1. **Sync wrappers** — `node .magic/scripts/sync-skills.js` (if present)
2. **Cleanup** — remove existing managed links (safe pre-condition for git index ops, see [Windows Junction Safety](#windows-junction-safety) below)
3. **Git index** — `git rm --cached --ignore-unmatch` on all managed paths
4. **Infrastructure** — create `.agents/{workflows,skills,rules}/`
5. **Workflow links** — `workflows/*.md` → `.agents/workflows/` (hardlinks on Windows, symlinks on Unix)
6. **Skill links** — `skills/*` → `.agents/skills/` (junctions on Windows, symlinks on Unix)
7. **Agent links** — `.{agent}/{subdir,skills,rules}` → `.agents/` (junctions on Windows, symlinks on Unix)
8. **Rules links** — `rules/*` → `.agents/rules/` (hardlinks on Windows, symlinks on Unix)
9. **Instruction links** — `{AGENT}.md` → `AGENTS.md` (hardlinks on Windows, symlinks on Unix)

### 3. Verify

The script prints link targets and runs a per-platform integrity check:

- **Windows** — `fsutil hardlink list AGENTS.md` (expect 1 + number of active agents)
- **Unix** — `ls -l {AGENT}.md` for each active agent (symlink target should be `AGENTS.md`)

## Resources

- [scripts/setup_windows.ps1](scripts/setup_windows.ps1)
- [scripts/setup_unix.sh](scripts/setup_unix.sh)

## Windows Junction Safety

When managing Windows junctions (`mklink /J`) and git index, follow this strict order to prevent data loss:

### The Problem

`git rm -r --cached <path>` on Windows **follows junctions** and physically deletes files in the junction target, even with `--cached`. Example: `git rm -r --cached .claude/commands` where `.claude/commands` is a junction to `workflows/` will **delete all files in `workflows/` from disk**.

### Safe Procedure

Always run `git rm --cached` **before** creating junctions, while the paths are empty or nonexistent:

1. `git rm --cached`   ← first, while no junctions exist yet
2. `mklink /J ...`     ← then create junctions

When removing from git index, list **specific file paths** rather than directories:

```bash
# Safe — specific files only
git rm --cached --ignore-unmatch workflows/magic.analyze.md

# Dangerous — git will traverse the junction into parent/source directories
git rm -r --cached .claude/commands
```
