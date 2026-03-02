---
description: Rule for generating and editing Markdown files in the Magic Spec project.
globs: ["**/*.md", "**/*.mdc"]
---

# Markdown Generation Rule

To optimize file size and maximize context window efficiency, adhere to the following rules when creating or modifying Markdown documentation:

1. **No Horizontal Separators**: Do NOT use horizontal line separators (triple dashes `---`) between paragraphs, sections, or test cases.
   - **Exception**: YAML frontmatter delimiters at the start of a file (e.g., describing workflows or metadata) must be preserved.

2. **Clean Section Breaks**: Use standard Markdown headers (`#`, `##`, `###`) to define structure. Avoid using multiple empty lines or decorative dividers.

3. **Information Density**: Prioritize clarity and brevity. Avoid redundant formatting that adds byte weight without improving readability for the AI or user.
