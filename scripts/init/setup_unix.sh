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

if [ ! -f "AGENTS.md" ] || [ ! -d "skills/magicspec" ]; then
    echo "ERROR: Must run from repo root (AGENTS.md and skills/magicspec required)." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_FILE="$SCRIPT_DIR/agents.json"

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
        jq -r --arg a "$agent" --arg f "$field" '.[$a][$f] | if type == "array" then join(" ") else (. // "") end' "$REGISTRY_FILE"
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

# The shipped engine is one folder; what hosts read from outside it (the rule copy, the
# command entries, the skill link) is projected by `init --host`, never linked file by file.
SUPPORTED_HOSTS=(claude codex)

# All paths this script manages. Built once, used for cleanup + git index.
cleanup_paths=()
for ag in "${ALL_AGENTS[@]}"; do
    ag_dir=$(get_agent_field "$ag" "dir")
    ag_workflows=$(get_agent_field "$ag" "workflows")
    ag_skills=$(get_agent_field "$ag" "skills")
    ag_rules=$(get_agent_field "$ag" "rules")
    ag_files=$(get_agent_field "$ag" "files")
    
    if [ -n "$ag_workflows" ]; then cleanup_paths+=("$ag_dir/$ag_workflows"); fi
    if [ -n "$ag_skills" ]; then cleanup_paths+=("$ag_dir/$ag_skills"); fi
    if [ -n "$ag_rules" ]; then cleanup_paths+=("$ag_dir/$ag_rules"); fi
    for f in $ag_files; do cleanup_paths+=("$f"); done
done
cleanup_paths+=(".agents/skills/magicspec" ".agents/skills/magicspec-dev" ".agents/workflows/magicspec" ".agents/workflows/magicspec-dev" ".agents/rules")

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

# 3.2. Cleanup (must precede git rm for parity with Windows)
echo "Removing existing managed links..."
for p in "${cleanup_paths[@]}"; do remove_link "$p"; done

# 3.3. Git index maintenance
echo "Synchronizing git index..."
git rm -r --cached --ignore-unmatch "${cleanup_paths[@]}" >/dev/null 2>&1 || true

# 3.4. .agents/ infrastructure
mkdir -p .agents/workflows .agents/skills .agents/rules

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

# 3.9. Projections: the skill link, the rule copy and the command entries are generated from
# the skill folder after the agent links exist. Qwen shares the rule file through its link;
# its command entries differ in the argument placeholder and are not projected here.
project_hosts=(codex)
for ag in "${ACTIVE_AGENTS[@]}"; do
    for h in "${SUPPORTED_HOSTS[@]}"; do
        if [ "$ag" = "$h" ] && [ "$ag" != "codex" ]; then project_hosts+=("$ag"); fi
    done
done
hosts_csv=$(IFS=,; echo "${project_hosts[*]}")
echo "Projecting the skill for: $hosts_csv"
node skills/magicspec/scripts/executor.js init --host="$hosts_csv"

# 3.10. The maintenance skill: its link and its command entries (not the engine generator's business).
echo "Projecting the maintenance skill..."
node scripts/init/project-dev-skill.js

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
