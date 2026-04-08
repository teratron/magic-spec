---
name: magic.dev:sync
description: Project Sync & Hygiene — synchronizes versions, documentation, and engine metadata
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.dev.sync.md (relative to workspace root) -->

# Sync Workflow

Maintain project hygiene by synchronizing all metadata, documentation, and versioning across the repository.

1. **Version Parity**: Read `.magic/.version` and ensure it matches `package.json`, `pyproject.toml`, and installer init files.
2. **Doc Sync**:
   - Regenerate `CONTRIBUTING.md` from `.magic/templates/contributing.md` using current project state (workflows, rules).
   - Verify `README.md` structure and update version-references.
3. **Hardlink Validation**: Ensure `CLAUDE.md` and `QWEN.md` are correctly linked to `AGENTS.md`.
// turbo
4.  **Final Meta-Sync**: Wait for file system stability (≈1s) then run `node .magic/scripts/executor.js update-engine-meta --workflow sync`. 

Trigger: `/magic.dev.sync`, "Sync project", "Hygiene check"