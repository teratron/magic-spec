#!/usr/bin/env bash

# ───────────────────────────────────────────────────────────────────────────────
# MAGIC-SPEC DEV INIT (UNIX)
# ───────────────────────────────────────────────────────────────────────────────

set -e

echo ">>> Initializing Unix/macOS Agent Environment..."

# 1. Git Index Maintenance (MUST run BEFORE creating symlinks — see AGENTS.md §6)
echo "Synchronizing git index (pre-link)..."
agentFiles="CLAUDE.md GEMINI.md QWEN.md"
links=".claude/commands .claude/skills .claude/rules .qwen/commands .qwen/skills .qwen/rules"
for f in analyze rule run spec task; do
  links="$links .agents/workflows/magic.$f.md"
done
for f in $agentFiles; do
  links="$links $f"
done
git rm -r --cached --ignore-unmatch $links 2>/dev/null || true

# 2. Create agent symlinks (.claude, .qwen)
mkdir -p .claude .qwen

# .claude
rm -rf .claude/commands .claude/skills .claude/rules
ln -s ../.agents/workflows .claude/commands
ln -s ../.agents/skills .claude/skills
ln -s ../.agents/rules .claude/rules

# .qwen
rm -rf .qwen/commands .qwen/skills .qwen/rules
ln -s ../.agents/workflows .qwen/commands
ln -s ../.agents/skills .qwen/skills
ln -s ../.agents/rules .qwen/rules

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
verifyLinks=".claude/commands .claude/skills .claude/rules .qwen/commands .qwen/skills .qwen/rules"
for f in $agentFiles; do
  verifyLinks="$verifyLinks $f"
done
for f in analyze rule run spec task; do
  verifyLinks="$verifyLinks .agents/workflows/magic.$f.md"
done
ls -ld $verifyLinks
