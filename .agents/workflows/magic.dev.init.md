---
description: Initialize MAGIC-SPEC development environment — link workflows from project roots to agents.
---

# /magic.dev.init (Initialize Developer Environment)

This workflow initializes the developer environment by linking canonical user-facing workflows (in `workflows/`) to agent-facing interfaces (`.claude/` and `.agents/workflows/`).

It leverages the **magic-dev-init** skill to perform the platform-specific linking procedures.

## Steps

### 1. Identify Environment

Identify the operating system (Windows vs. Unix) and project root directory.

### 2. Load Magic Dev Init Skill

Activate the `.agents/skills/magic-dev-init/` skill. Ensure the following scripts are available:

- `scripts/setup_windows.ps1` (for Windows)
- `scripts/setup_unix.sh` (for Linux/macOS)

### 3. Execute Initialization

// turbo
Follow the platform-appropriate command sequence from the skill to establish junctions, hardlinks, and symlinks.

**Windows Tasks:**

- Create `.claude` junctions (commands, skills, rules).
- Link `CLAUDE.md` and `QWEN.md` to `AGENTS.md`.
- Create workflow hardlinks from `workflows/` into `.agents/workflows/`.
- Run git index maintenance.

**Unix Tasks:**

- Create `.claude` symlinks (commands, skills, rules).
- Link `CLAUDE.md` and `QWEN.md` to `AGENTS.md`.
- Create workflow symlinks from `workflows/` into `.agents/workflows/`.
- Run git index maintenance.

### 4. Verify Active Links

Run verification commands from the skill and ensure all targets point correctly to project local files.

---

> [!TIP]
> After running this, Claude and other AI agents will see all workflows, skills, and global rules as if they were in the root or `.claude/` directory, while development on project-specific workflows happens safely in `workflows/`.