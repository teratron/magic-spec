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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_FILE="$(dirname "$SCRIPT_DIR")/agents.json"

if [ ! -f "$REGISTRY_FILE" ]; then
    echo "ERROR: Registry not found: $REGISTRY_FILE" >&2
    exit 1
fi

get_agent_field() {
    local agent="$1" field="$2"
    if command -v python3 &>/dev/null; then
        python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
val = data.get(sys.argv[2], {}).get(sys.argv[3])
if val is None: print('')
elif isinstance(val, list): print(' '.join(val))
else: print(val)
" "$REGISTRY_FILE" "$agent" "$field"
    elif command -v jq &>/dev/null; then
        if [ "$field" = "files" ]; then
            jq -r \".\\\"\$agent\\\".\\\"\$field\\\" | if type == \\\"array\\\" then join(\\\" \\\") else \\\"\\\" end\" "$REGISTRY_FILE"
        else
            jq -r \".\\\"\$agent\\\".\\\"\$field\\\" | if . == null then \\\"\\\" else . end\" "$REGISTRY_FILE"
        fi
    else
        echo "ERROR: python3 or jq required to parse agents.json" >&2
        exit 1
    fi
}

ALL_AGENTS=$(
    if command -v python3 &>/dev/null; then
        python3 -c "import json, sys; print(' '.join(sorted(json.load(open(sys.argv[1])).keys())))" "$REGISTRY_FILE"
    else
        jq -r "keys_unsorted | join(\" \")" "$REGISTRY_FILE"
    fi
)

ACTIVE_AGENTS=()
if [ $# -gt 0 ]; then
    for arg in "$@"; do
        arg_lower=$(echo "$arg" | tr '[:upper:]' '[:lower:]')
        found=0
        for ag in $ALL_AGENTS; do
            if [ "$ag" = "$arg_lower" ]; then
                ACTIVE_AGENTS+=("$ag")
                found=1
                break
            fi
        done
        if [ $found -eq 0 ]; then
            echo "ERROR: Unknown agent '$arg'. Supported: $ALL_AGENTS" >&2
            exit 1
        fi
    done
    INIT_MODE="targeted ($*)"
else
    ACTIVE_AGENTS=()
    INIT_MODE="infrastructure only"
fi

# Collect workflow basenames via glob (no ls parsing)
user_workflows=()
for f in workflows/*.md; do
    user_workflows+=("$(basename "$f")")
done

user_rules=()
if [ -d "rules" ]; then
    for f in rules/*; do
        if [ -f "$f" ]; then
            user_rules+=("$(basename "$f")")
        fi
    done
fi

# All paths this script manages. Built once, used for cleanup + git index.
managed_paths=()
for ag in "${ACTIVE_AGENTS[@]}"; do
    ag_dir=$(get_agent_field "$ag" "dir")
    ag_workflows=$(get_agent_field "$ag" "workflows")
    ag_skills=$(get_agent_field "$ag" "skills")
    ag_rules=$(get_agent_field "$ag" "rules")
    ag_files=$(get_agent_field "$ag" "files")
    
    if [ -n "$ag_workflows" ]; then managed_paths+=("$ag_dir/$ag_workflows"); fi
    if [ -n "$ag_skills" ]; then managed_paths+=("$ag_dir/$ag_skills"); fi
    if [ -n "$ag_rules" ]; then managed_paths+=("$ag_dir/$ag_rules"); fi
    for f in $ag_files; do managed_paths+=("$f"); done
done
for f in "${user_workflows[@]}"; do
    name="${f%.md}"
    skill_name="${name//./-}"
    managed_paths+=(".agents/workflows/$f" ".agents/skills/$skill_name")
done
for f in "${user_rules[@]}"; do
    managed_paths+=(".agents/rules/$f")
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

echo "Creating rules symlinks..."
for f in "${user_rules[@]}"; do
    ln -s "../../rules/$f" ".agents/rules/$f"
    echo "  .agents/rules/$f"
done

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
    skill_name="${name//./-}" # Handle magic.rule -> magic-rule
    if [ -d "skills/$skill_name" ]; then
        ln -s "../../skills/$skill_name" ".agents/skills/$skill_name"
        echo "  .agents/skills/$skill_name"
    fi
done

# 3.7. Agent symlinks
echo "Creating agent symlinks..."
for ag in "${ACTIVE_AGENTS[@]}"; do
    ag_dir=$(get_agent_field "$ag" "dir")
    ag_workflows=$(get_agent_field "$ag" "workflows")
    ag_skills=$(get_agent_field "$ag" "skills")
    ag_rules=$(get_agent_field "$ag" "rules")
    
    mkdir -p "$ag_dir"
    if [ -n "$ag_workflows" ]; then ln -s "../.agents/workflows" "$ag_dir/$ag_workflows"; fi
    if [ -n "$ag_skills" ]; then ln -s "../.agents/skills" "$ag_dir/$ag_skills"; fi
    if [ -n "$ag_rules" ]; then ln -s "../.agents/rules" "$ag_dir/$ag_rules"; fi
    echo "  $ag_dir ($ag)"
done

# 3.8. Instruction symlinks
echo "Creating instruction symlinks..."
for ag in "${ACTIVE_AGENTS[@]}"; do
    ag_files=$(get_agent_field "$ag" "files")
    for f in $ag_files; do
        ln -s AGENTS.md "$f"
        echo "  $f"
    done
done

# ───────────────────────────────────────────────────────────────────────────────
# 4. Verification
# ───────────────────────────────────────────────────────────────────────────────

echo ""
echo ">>> Verification:"
for ag in "${ACTIVE_AGENTS[@]}"; do
    ag_dir=$(get_agent_field "$ag" "dir")
    ag_workflows=$(get_agent_field "$ag" "workflows")
    ag_skills=$(get_agent_field "$ag" "skills")
    ag_rules=$(get_agent_field "$ag" "rules")
    
    check_paths=()
    if [ -n "$ag_workflows" ]; then check_paths+=("$ag_dir/$ag_workflows"); fi
    if [ -n "$ag_skills" ]; then check_paths+=("$ag_dir/$ag_skills"); fi
    if [ -n "$ag_rules" ]; then check_paths+=("$ag_dir/$ag_rules"); fi
    
    if [ ${#check_paths[@]} -gt 0 ]; then
        ls -ld "${check_paths[@]}" 2>/dev/null || true
    fi
done

echo ""
echo "Unix Agent Environment Ready."
