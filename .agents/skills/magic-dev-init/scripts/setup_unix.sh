#!/usr/bin/env bash

# ───────────────────────────────────────────────────────────────────────────────
# MAGIC-SPEC DEV INIT (UNIX)
# ───────────────────────────────────────────────────────────────────────────────

set -e

echo ">>> Initializing Unix/macOS Agent Environment..."

# 1. Git Index Maintenance (MUST run BEFORE creating symlinks — see AGENTS.md §6)
echo "Synchronizing git index (pre-link)..."
agentFiles="CLAUDE.md GEMINI.md QWEN.md CODEX.md"
links=".claude/commands .claude/skills .claude/rules .qwen/commands .qwen/skills .qwen/rules .gemini/commands .gemini/skills .gemini/rules .codex/prompts .codex/skills .codex/rules"
for f in analyze rule run spec task; do
  links="$links .agents/workflows/magic.$f.md"
done
for f in $agentFiles; do
  links="$links $f"
done
git rm -r --cached --ignore-unmatch $links 2>/dev/null || true

# 2. Create agent symlinks (.claude, .qwen, .gemini, .codex)
for agent in .claude .qwen .gemini .codex; do
  mkdir -p $agent
  rm -rf $agent/commands $agent/skills $agent/rules $agent/prompts
  if [ "$agent" == ".codex" ]; then
    ln -s ../.agents/workflows $agent/prompts
  else
    ln -s ../.agents/workflows $agent/commands
  fi
  ln -s ../.agents/skills $agent/skills
  ln -s ../.agents/rules $agent/rules
done

# 3. Global Agent Instructions (Linking to AGENTS.md)
echo "Linking agent instruction files..."
for f in $agentFiles; do
  rm -f $f
  ln -s AGENTS.md $f
done

# 4. Setup .agents symlinks
mkdir -p .agents/skills .agents/workflows .agents/rules

# 5. Workflow symlinks
echo "Creating workflow symlinks..."
for f in analyze rule run spec task; do
  rm -f .agents/workflows/magic.$f.md
  ln -s ../../workflows/magic.$f.md .agents/workflows/magic.$f.md
done

echo -e "\n>>> Verification:"
verifyLinks=".claude/commands .claude/skills .claude/rules .qwen/commands .qwen/skills .qwen/rules .gemini/commands .gemini/skills .gemini/rules .codex/prompts .codex/skills .codex/rules"
for f in $agentFiles; do
  verifyLinks="$verifyLinks $f"
done
for f in analyze rule run spec task; do
  verifyLinks="$verifyLinks .agents/workflows/magic.$f.md"
done
ls -ld $verifyLinks
