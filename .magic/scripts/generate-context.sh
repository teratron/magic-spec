#!/usr/bin/env bash
set -e

DESIGN_DIR=".design"
PLAN_FILE="$DESIGN_DIR/PLAN.md"
CHANGELOG_FILE="$DESIGN_DIR/CHANGELOG.md"
INDEX_FILE="$DESIGN_DIR/INDEX.md"
CONTEXT_FILE="$DESIGN_DIR/CONTEXT.md"

if [ ! -d "$DESIGN_DIR" ]; then
    echo "Error: $DESIGN_DIR directory not found" >&2
    exit 1
fi

echo "# Project Context" > "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"
echo "**Generated:** $(date +%Y-%m-%d)" >> "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"

echo "## Active Technologies" >> "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"

TECH_LIST=""
[ -f "package.json" ] && TECH_LIST="$TECH_LIST - Node.js\n"
[ -f "pyproject.toml" ] && TECH_LIST="$TECH_LIST - Python (uv/poetry/hatch)\n"
[ -f "requirements.txt" ] && TECH_LIST="$TECH_LIST - Python\n"
[ -f "Cargo.toml" ] && TECH_LIST="$TECH_LIST - Rust\n"
[ -f "go.mod" ] && TECH_LIST="$TECH_LIST - Go\n"
[ -f "Makefile" ] && TECH_LIST="$TECH_LIST - Make\n"

if [ -z "$TECH_LIST" ]; then
    echo "- Unknown (no manifest detected)" >> "$CONTEXT_FILE"
else
    echo -e "$TECH_LIST" >> "$CONTEXT_FILE"
fi
echo "" >> "$CONTEXT_FILE"

echo "## Core Project Structure" >> "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"
echo "\`\`\`plaintext" >> "$CONTEXT_FILE"
# Check if a tree command or some known logic can be used. Just output a basic one for now.
# Realistically, this could run `tree -L 2 -I 'node_modules|target|.git'`
if command -v tree &> /dev/null; then
    tree -L 2 -I 'node_modules|target|.git|.venv|__pycache__' || echo "Tree structured here" >> "$CONTEXT_FILE"
else
    echo "- Project root" >> "$CONTEXT_FILE"
    echo "  - .design/" >> "$CONTEXT_FILE"
    echo "  - .magic/"  >> "$CONTEXT_FILE"
fi
echo "\`\`\`" >> "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"

echo "## Recent Changes" >> "$CONTEXT_FILE"
echo "" >> "$CONTEXT_FILE"
if [ -f "$CHANGELOG_FILE" ]; then
    # Grab the last 15 lines of CHANGELOG_DRAFT as recent changes
    tail -n 15 "$CHANGELOG_FILE" >> "$CONTEXT_FILE"
else
    echo "No recent changelog found." >> "$CONTEXT_FILE"
fi
echo "" >> "$CONTEXT_FILE"
