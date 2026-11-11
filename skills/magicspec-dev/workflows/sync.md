# Sync Workflow

**Command:** `/magicspec-dev:sync` — synchronizes metadata, documentation and versions of the repository in one idempotent pass (`scripts/sync.js`).

Maintain project hygiene by synchronizing all metadata, documentation, and versioning across the repository. The pipeline is **idempotent** — re-running it without source changes produces no diff.

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `skills/magicspec/roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; arguments that are only names, flags or paths run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5).

Pipeline (orchestrated by `scripts/sync.js`):

1. **Engine Meta (C14)**: Detects drift in `skills/magicspec/`. Bumps `skills/magicspec/.version`, regenerates checksums, and refreshes the host projections that exist.
2. **Manifest Parity**: Propagates the version into the anchored `**Active Development** (vX.Y.Z)` line in `README.md`. Other version mentions are not touched.
3. **Hardlink Validation**: Verifies that `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, `CODEX.md` share the same inode as `AGENTS.md`. Drift is reported (non-fatal by default; pass `--strict-links` to fail). Repair: `/magicspec-dev:init`.
4. **Project Meta (idempotent)**: Computes a structural digest of `.magicspec/INDEX.md` (with version/date/history fields stripped). Bumps the index version and appends a history row **only when the digest actually changed** — no more "Automated metadata update" floods.
5. **Doc Sync (content, not stamps)**:
   - Refills the marked blocks of the hand-written `CONTRIBUTING.md` (the command table from the router, the workspace table from the registry, the engine version) and writes nothing outside the markers. A guide without markers receives them once; a repository with no guide is seeded from `scripts/templates/contributing.md`.
   - For each `docs/{name}.md` with a matching `skills/magicspec/workflows/{name}.md`, propagates the `**Triggers:**` and `**Slash command:**` lines verbatim and refreshes the `## Sync Note` only when the workflow source hash changed or the engine version bumped.

Flags (forwarded to `sync.js`):

- `--dry-run` — no physical writes, log intended mutations.
- `--skip-meta` / `--skip-docs` / `--skip-links` — skip individual stages.
- `--strict-links` — fail when any agent rule sibling is missing.

State files (do not edit by hand):

- `skills/magicspec/.checksums` — engine drift baseline (Step 1).
- `.magicspec/.cache/project-meta-state.json` — last structural digest of `.magicspec/INDEX.md` (Step 4).
- `.cache/.docs-state.json` — last hash + version per workflow (Step 5, dev-only).

// turbo
6. **Final Meta-Sync**: Wait for file system stability (≈1s) then run `node skills/magicspec/scripts/executor.js update-engine-meta`.

Trigger: `/magicspec-dev:sync`, "Sync project", "Hygiene check"
