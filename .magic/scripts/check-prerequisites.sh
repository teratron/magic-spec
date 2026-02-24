#!/usr/bin/env bash
set -e

JSON_OUTPUT=0
REQ_PLAN=0
REQ_TASKS=0
REQ_SPECS=0

for arg in "$@"; do
    case $arg in
        --json) JSON_OUTPUT=1 ;;
        --require-plan) REQ_PLAN=1 ;;
        --require-tasks) REQ_TASKS=1 ;;
        --require-specs) REQ_SPECS=1 ;;
    esac
done

MISSING=()
WARNINGS=()

# Paths
INDEX_PATH=".design/INDEX.md"
RULES_PATH=".design/RULES.md"
PLAN_PATH=".design/PLAN.md"
TASKS_PATH=".design/TASKS.md"

[ -f "$INDEX_PATH" ] && INDEX_EXISTS="true" || INDEX_EXISTS="false"
[ -f "$RULES_PATH" ] && RULES_EXISTS="true" || RULES_EXISTS="false"
[ -f "$PLAN_PATH" ] && PLAN_EXISTS="true" || PLAN_EXISTS="false"
[ -f "$TASKS_PATH" ] && TASKS_EXISTS="true" || TASKS_EXISTS="false"

if [ "$INDEX_EXISTS" = "false" ]; then
    MISSING+=("INDEX.md")
fi
if [ "$RULES_EXISTS" = "false" ]; then
    MISSING+=("RULES.md")
fi

if [ "$REQ_PLAN" = "1" ] && [ "$PLAN_EXISTS" = "false" ]; then
    MISSING+=("PLAN.md")
fi

if [ "$REQ_TASKS" = "1" ] && [ "$TASKS_EXISTS" = "false" ]; then
    MISSING+=("TASKS.md")
fi

# Spec counts
SPEC_COUNT=0
STABLE_COUNT=0
DRAFT_COUNT=0
RFC_COUNT=0

if [ "$INDEX_EXISTS" = "true" ]; then
    STABLE_COUNT=$(grep -c "| Stable |" "$INDEX_PATH" || true)
    DRAFT_COUNT=$(grep -c "| Draft |" "$INDEX_PATH" || true)
    RFC_COUNT=$(grep -c "| RFC |" "$INDEX_PATH" || true)
    SPEC_COUNT=$((STABLE_COUNT + DRAFT_COUNT + RFC_COUNT))
fi

if [ "$REQ_SPECS" = "1" ] && [ "$STABLE_COUNT" -eq 0 ]; then
    if [ "$SPEC_COUNT" -eq 0 ]; then
        MISSING+=("Stable specs (0 specs found)")
    else
        MISSING+=("Stable specs (only Draft/RFC found)")
    fi
fi

if [ "$DRAFT_COUNT" -gt 0 ]; then
    WARNINGS+=("$DRAFT_COUNT specs are still in Draft status")
fi

if [ "$RFC_COUNT" -gt 0 ]; then
    WARNINGS+=("$RFC_COUNT specs are still in RFC status")
fi

if [ "$PLAN_EXISTS" = "true" ] && [ "$INDEX_EXISTS" = "true" ]; then
    # Extract spec filenames from INDEX.md
    INDEX_SPECS=$(grep -o "specifications/[^)]*\.md" "$INDEX_PATH" | sed 's|specifications/||' || true)
    
    # magic.task.md hint: "Generate or update the implementation plan and tasks based on ALL registered specifications."
    for spec in $INDEX_SPECS; do
        if ! grep -q "$spec" "$PLAN_PATH"; then
            WARNINGS+=("Orphaned specification: '$spec' is in INDEX.md but missing from PLAN.md")
        fi
    done
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    OK="false"
else
    OK="true"
fi

if [ "$JSON_OUTPUT" = "1" ]; then
    DATE=$(date +%Y-%m-%d)
    
    generate_json_array() {
        local arr=("$@")
        if [ ${#arr[@]} -eq 0 ]; then
            echo "[]"
        else
            local json="["
            for i in "${!arr[@]}"; do
                json="${json}\"${arr[$i]}\""
                if [ $i -lt $((${#arr[@]} - 1)) ]; then
                    json="${json}, "
                fi
            done
            json="${json}]"
            echo "$json"
        fi
    }
    
    MISSING_JSON=$(generate_json_array "${MISSING[@]}")
    WARNINGS_JSON=$(generate_json_array "${WARNINGS[@]}")
    
    cat <<EOF
{
  "ok": $OK,
  "checked_at": "$DATE",
  "design_dir": ".design",
  "artifacts": {
    "INDEX.md":  { "exists": $INDEX_EXISTS,  "path": "$INDEX_PATH" },
    "RULES.md":  { "exists": $RULES_EXISTS,  "path": "$RULES_PATH" },
    "PLAN.md":   { "exists": $PLAN_EXISTS, "path": "$PLAN_PATH"  },
    "TASKS.md":  { "exists": $TASKS_EXISTS, "path": "$TASKS_PATH" },
    "specs":     { "count": $SPEC_COUNT, "stable": $STABLE_COUNT, "draft": $DRAFT_COUNT }
  },
  "missing_required": $MISSING_JSON,
  "warnings": $WARNINGS_JSON
}
EOF
    exit 0
else
    if [ "$OK" = "true" ]; then
        exit 0
    else
        echo "Missing required artifacts: ${MISSING[@]}" >&2
        exit 1
    fi
fi
