#!/usr/bin/env bash

# ───────────────────────────────────────────────────────────────────────────────
# MAGIC-SPEC DEV INIT (UNIX)
# ───────────────────────────────────────────────────────────────────────────────

set -e

echo ">>> Initializing Unix/macOS Agent Environment..."

# 1. Configuration
echo ">>> Discovering workflows..."
userWorkflows=$(ls workflows/*.md 2>/dev/null | xargs -n 1 basename || true)
devWorkflows=$(ls .agents/workflows/*.md 2>/dev/null | xargs -n 1 basename || true)
agentFiles="CLAUDE.md GEMINI.md QWEN.md CODEX.md CODEX.toml"

# 2. Cleanup Function
remove_existing() {
    if [ -e "$1" ] || [ -L "$1" ]; then
        echo "  Removing: $1"
        rm -rf "$1"
    fi
}

# 3. Sync Skill Wrappers
if [ -f ".magic/scripts/sync-skills.js" ]; then
  echo "Synchronizing Skill Wrappers..."
  node .magic/scripts/sync-skills.js
fi

# 4. Git Index Maintenance
echo "Synchronizing git index (pre-link)..."
links=".claude/commands .claude/skills .claude/rules .qwen/commands .qwen/skills .qwen/rules .gemini/commands .gemini/skills .gemini/rules .codex/prompts .codex/skills .codex/rules"

for f in $userWorkflows; do
  links="$links .agents/workflows/$f"
  name="${f%.md}"
  links="$links .agents/skills/$name"
done

for f in $devWorkflows; do
  links="$links .agents/workflows/$f"
done

for f in $agentFiles; do
  links="$links $f"
done

git rm -r --cached --ignore-unmatch $links >/dev/null 2>&1 || true

# 5. Create agent symlinks (Core)
for agent in .claude .qwen .gemini .codex; do
  mkdir -p "$agent"
  remove_existing "$agent/commands"
  remove_existing "$agent/skills"
  remove_existing "$agent/rules"
  remove_existing "$agent/prompts"
  
  if [ "$agent" == ".codex" ]; then
    ln -s "../.agents/workflows" "$agent/prompts"
  else
    ln -s "../.agents/workflows" "$agent/commands"
  fi
  ln -s "../.agents/skills" "$agent/skills"
  ln -s "../.agents/rules" "$agent/rules"
done

# 6. Global Agent Instructions
echo "Linking agent instructions..."
for f in $agentFiles; do
  remove_existing "$f"
  if [[ "$f" == *.toml ]]; then
    touch "$f"
  else
    ln -s AGENTS.md "$f"
  fi
done

# 7. Setup .agents directories
mkdir -p .agents/skills .agents/workflows .agents/rules

# 8. Workflow symlinks
echo "Creating workflow symlinks..."
for f in $userWorkflows; do
  remove_existing ".agents/workflows/$f"
  ln -s "../../workflows/$f" ".agents/workflows/$f"
done

# 9. Skill symlinks (User-facing)
echo "Creating skill symlinks (User-facing)..."
for f in $userWorkflows; do
  name="${f%.md}"
  target="skills/$name"
  link=".agents/skills/$name"
  if [ -d "$target" ]; then
    remove_existing "$link"
    targetFull=$(realpath "$target")
    linkFull=$(realpath -m "$link")
    echo "  Linking: $link -> $target"
    ln -s "$targetFull" "$linkFull"
  fi
done

echo -e "\n>>> Verification:"
ls -ld .claude/commands .claude/skills .claude/rules .gemini/commands .gemini/skills .gemini/rules || true
ls -l .agents/skills || true

echo "✨ Unix Agent Environment Ready."
