---
name: magic-dev-init
description: Initialize Magic Spec development environment with junctions and symlinks.
handoffs:
---

# Magic Spec Dev Init Skill

This skill provides the logic and commands to set up the mapping between project-level directories and agent-level interfaces. It ensures that hardlinks and symlinks correctly point to canonical workflows and skills.

## Procedures

### 1. Identify Environment

Identify the operating system (Windows vs. Unix/macOS).

### 2. Execute Initialization Script

Establish all links using the platform-specific script. Key tasks include:

- Linking `.claude/`, `.qwen/`, `.gemini/`, and `.codex/` commands, skills, and rules to `.agents/`.
- Linking root `CLAUDE.md`, `QWEN.md`, `GEMINI.md`, and `CODEX.md` to `AGENTS.md` for agent instructions.
- Linking user-facing workflows from `workflows/` to `.agents/workflows/` so development agents can access them safely.
- Maintaining the git index by removing linked paths.

**On Windows (PowerShell):**

```powershell
pwsh -NoProfile -File .agents/skills/magic-dev-init/scripts/setup_windows.ps1
```

**On Unix (Bash):**

```bash
bash .agents/skills/magic-dev-init/scripts/setup_unix.sh
```

### 3. Verification

Confirm that all links are active and point to correct targets inside the project. Junctions should resolve to absolute paths at the time of creation.

## Resources

- [scripts/setup_windows.ps1](scripts/setup_windows.ps1) - Exact PowerShell/CMD command sequence for Windows.
- [scripts/setup_unix.sh](scripts/setup_unix.sh) - Exact Bash command sequence for Linux/macOS.
