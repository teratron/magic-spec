#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════════════════
# MAGIC SPEC DEV INIT (UNIX)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Creates symlinks mapping agent-facing paths to the canonical engine sources.
#
# Usage (run from repo root):
#   bash setup_unix.sh              # full init
#   bash setup_unix.sh claude       # only Claude
#   bash setup_unix.sh claude qwen  # Claude + Qwen

set -e
shopt -s nullglob

# ───────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ───────────────────────────────────────────────────────────────────────────────

if [ ! -f "AGENTS.md" ] || [ ! -d "workflows" ]; then
    echo "ERROR: Must run from repo root (AGENTS.md and workflows/ required)." >&2
    exit 1
fi

# Agent config: name|dir|file|subdir
ALL_AGENTS=(
    "claude|.claude|CLAUDE.md|commands"
    "gemini|.gemini|GEMINI.md|commands"
    "qwen|.qwen|QWEN.md|commands"
    "codex|.codex|CODEX.md|prompts"
)

ACTIVE_AGENTS=()
if [ $# -gt 0 ]; then
    for entry in "${ALL_AGENTS[@]}"; do
        name="${entry%%|*}"
        for arg in "$@"; do
            if [ "$(echo "$arg" | tr '[:upper:]' '[:lower:]')" = "$name" ]; then
                ACTIVE_AGENTS+=("$entry")
                break
            fi
        done
    done
    if [ ${#ACTIVE_AGENTS[@]} -eq 0 ]; then
        echo "ERROR: No matching agents for '$*'. Valid: claude, gemini, qwen, codex" >&2
        exit 1
    fi
    INIT_MODE="targeted ($*)"
else
    ACTIVE_AGENTS=("${ALL_AGENTS[@]}")
    INIT_MODE="full"
fi

# Collect workflow basenames via glob (no ls parsing)
user_workflows=()
for f in workflows/*.md; do
    user_workflows+=("$(basename "$f")")
done

# All paths this script manages. Built once, used for cleanup + git index.
managed_paths=()
for entry in "${ACTIVE_AGENTS[@]}"; do
    IFS='|' read -r _ ag_dir ag_file ag_sub <<< "$entry"
    managed_paths+=("$ag_dir/$ag_sub" "$ag_dir/skills" "$ag_dir/rules" "$ag_file")
done
for f in "${user_workflows[@]}"; do
    managed_paths+=(".agents/workflows/$f" ".agents/skills/${f%.md}")
done

# ───────────────────────────────────────────────────────────────────────────────
# 2. Helpers
# ───────────────────────────────────────────────────────────────────────────────

remove_link() {
    if [ -e "$1" ] || [ -L "$1" ]; then
        rm -rf "$1"
    fi
}

# ───────────────────────────────────────────────────────────────────────────────
# 3. Execution
# ───────────────────────────────────────────────────────────────────────────────

echo ">>> Initializing Unix/macOS Agent Environment ($INIT_MODE)"

# 3.1. Sync Skill wrappers
if [ -f ".magic/scripts/sync-skills.js" ]; then
    echo "Synchronizing Skill wrappers..."
    node .magic/scripts/sync-skills.js
fi

# 3.2. Cleanup (must precede git rm for parity with Windows; see AGENTS.md §8)
echo "Removing existing managed links..."
for p in "${managed_paths[@]}"; do remove_link "$p"; done

# 3.3. Git index maintenance
echo "Synchronizing git index..."
git rm -r --cached --ignore-unmatch "${managed_paths[@]}" >/dev/null 2>&1 || true

# 3.4. .agents/ infrastructure
mkdir -p .agents/workflows .agents/skills .agents/rules

# 3.5. Workflow symlinks
echo "Creating workflow symlinks..."
for f in "${user_workflows[@]}"; do
    ln -s "../../workflows/$f" ".agents/workflows/$f"
    echo "  .agents/workflows/$f"
done

# 3.6. Skill symlinks
echo "Creating skill symlinks..."
for f in "${user_workflows[@]}"; do
    name="${f%.md}"
    if [ -d "skills/$name" ]; then
        ln -s "../../skills/$name" ".agents/skills/$name"
        echo "  .agents/skills/$name"
    fi
done

# 3.7. Agent symlinks
echo "Creating agent symlinks..."
for entry in "${ACTIVE_AGENTS[@]}"; do
    IFS='|' read -r ag_name ag_dir ag_file ag_sub <<< "$entry"
    mkdir -p "$ag_dir"
    ln -s "../.agents/workflows" "$ag_dir/$ag_sub"
    ln -s "../.agents/skills"    "$ag_dir/skills"
    ln -s "../.agents/rules"     "$ag_dir/rules"
    echo "  $ag_dir ($ag_name)"
done

# 3.8. Instruction symlinks
echo "Creating instruction symlinks..."
for entry in "${ACTIVE_AGENTS[@]}"; do
    IFS='|' read -r _ _ ag_file _ <<< "$entry"
    ln -s AGENTS.md "$ag_file"
    echo "  $ag_file"
done

# ───────────────────────────────────────────────────────────────────────────────
# 4. Verification
# ───────────────────────────────────────────────────────────────────────────────

echo ""
echo ">>> Verification:"
for entry in "${ACTIVE_AGENTS[@]}"; do
    IFS='|' read -r _ ag_dir ag_file ag_sub <<< "$entry"
    ls -ld "$ag_dir/$ag_sub" "$ag_dir/skills" "$ag_dir/rules" "$ag_file" 2>/dev/null || true
done

echo ""
echo "Unix Agent Environment Ready."
