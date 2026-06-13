---
name: magic-dev-sync
description: Project Sync & Hygiene — synchronizes versions, documentation, and engine metadata
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.dev.sync.md (relative to workspace root) -->

# Sync Workflow

Maintain project hygiene by synchronizing all metadata, documentation, and versioning across the repository. The pipeline is **idempotent** — re-running it without source changes produces no diff.

Pipeline (orchestrated by `dev/scripts/sync.js`):

1. **Engine Meta (C14)**: Detects drift in `.magic/`, `workflows/`, `skills/`. Bumps `.magic/.version`, regenerates checksums, projects Skill wrappers, appends per-workflow history.
2. **Manifest Parity**: Propagates the version into the anchored `**Active Development** (vX.Y.Z)` line in `README.md`. Other version mentions are not touched.
3. **Hardlink Validation**: Verifies that `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, `CODEX.md` share the same inode as `AGENTS.md`. Drift is reported (non-fatal by default; pass `--strict-links` to fail). Repair: `/magic-dev-init`.
4. **Project Meta (idempotent)**: Computes a structural digest of `.design/INDEX.md` (with version/date/history fields stripped). Bumps the index version and appends a history row **only when the digest actually changed** — no more "Automated metadata update" floods.
5. **Doc Sync (content, not stamps)**:
   - Regenerates `CONTRIBUTING.md` from `.magic/templates/contributing.md` using current sources (RULES.md, INDEX.md, workflows/). Footer date reflects the latest source mtime, not "today".
   - For each `docs/{name}.md` with a matching `workflows/magic.{name}.md`, propagates the `**Triggers:**` and `**Slash command:**` lines verbatim and refreshes the `## Sync Note` only when the workflow source hash changed or the engine version bumped.

Flags (forwarded to `sync.js`):

- `--dry-run` — no physical writes, log intended mutations.
- `--skip-meta` / `--skip-docs` / `--skip-links` — skip individual stages.
- `--strict-links` — fail when any agent rule sibling is missing.

State files (do not edit by hand):

- `.magic/.checksums` — engine drift baseline (Step 1).
- `.design/.cache/project-meta-state.json` — last structural digest of `.design/INDEX.md` (Step 4).
- `dev/.cache/.docs-state.json` — last hash + version per workflow (Step 5, dev-only).

// turbo
6. **Final Meta-Sync**: Wait for file system stability (≈1s) then run `node .magic/scripts/executor.js update-engine-meta --workflow sync`.

Trigger: `/magic-dev-sync`, "Sync project", "Hygiene check"