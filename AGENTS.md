# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 1. Project Anatomy

The project creates an SDD (Specification-Driven Development) engine. The repository is strictly divided into two primary layers comprising the core engine, plus a secondary maintenance component.

**AGENT DIRECTIVE**: AI agents must clearly understand this separation. Unless explicitly told to work with the secondary maintenance parts, you must work ONLY with the core layers (Layer 1 and Layer 2).

### 1.1. Layer 1: User Distribution (The Release Kernel)

This layer contains ONLY the resources the end-user will download and install. Nothing extra must be placed here.

- `.magic/` — **The most important directory!** Contains the core logic and scripts of the SDD engine.
- `workflows/` — Workflow wrappers.
- `skills/` — Skill wrappers (Compatibility API).
- `rules/` — Rules for watching-processes on the user side.

**User contract — what the end user does with the release kernel**:

- **Consumes** workflows / skills / rules (read-only — the user invokes them via `/magic.*`, never edits them).
- **Verifies** engine integrity through `update-engine-meta --check` (called by the pre-commit hook installed by `init.js`).
- **Never regenerates** the integrity manifest (`.magic/.checksums`), never bumps `.magic/.version`, never modifies `.magic/` content. Drift is resolved by **restoring `.magic/` from the release archive**, not by overwriting checksums (which would mask the corruption that triggered the drift).

**Constraints**:

- These directories ship to the user via GitHub Releases. Keep them strictly clean of dev-only artifacts.
- L1 code **must not `require`** anything from `dev/`. The single tolerated exception is a **graceful-fallback `fs.existsSync` guard** (e.g., `update-engine-meta` → `dev/scripts/sync-skills.js` and `dev/scripts/generate-checksums.js`): if the dev tree is absent (user installation), warn and continue, never crash.
- Changes to **`.magic/` or `workflows/`** content modify the workflow engine itself and trigger **C14** (version bump + checksum regeneration + skill-wrapper sync). `skills/` wrappers are a C14 **output** (regenerated from workflows, never hand-edited); `rules/` currently fall outside C14's version/checksum tracking, so a `rules/`-only change ships without a version bump — account for this when editing them.

### 1.2. Layer 2: Auxiliary Core (`dev/`)

- **Path**: `/dev/`
- **Role**: The auxiliary part of the core engine. It contains development, testing, and operational logic that **must not** be distributed to the user side.
- **Developer contract — what lives here**:
  - **Manifest builders** that write to L1 artifacts (e.g., `dev/scripts/generate-checksums.js` writes `.magic/.checksums`).
  - **Project-meta updaters** (e.g., `dev/scripts/update-project-meta.js` writes `.design/INDEX.md`).
  - **Sync orchestrators** that coordinate cross-layer state (`dev/scripts/sync.js`, `sync-docs.js`, `sync-skills.js`, `sync-manifests.js`, `validate-hardlinks.js`).
  - **Tests** (`dev/tests/`).
- **Constraint**: anything that exists solely to **produce or maintain** L1 artifacts belongs here, even if the artifact it produces ships to users. The output is L1; the producer is L2.

### 1.3. Layer Classification Algorithm (mandatory before relocating any script)

When in doubt whether a script belongs in `.magic/scripts/` (L1) or `dev/scripts/` (L2), apply this algorithm. This is the same trace that uncovered the `generate-checksums.js` and `update-project-meta.js` mis-placements in v2.1.21–v2.1.22.

1. **Enumerate user-facing entry points** — every place where an end user (not a magic-spec developer) can invoke a script:
   - `workflows/*.md`
   - `skills/**/*.md`
   - `rules/*.md`
   - `.magic/*.md` (workflow bodies referenced by the shims above)
   - The hardcoded pre-commit hook content in `.magic/scripts/install-hooks.js`
2. **Grep these entry points** for `executor.js <name>` and `.magic/scripts/<name>.js`. The union is the **L1 root set** of subcommands.
3. **Compute transitive closure** — for each root script, follow its `require('./...')` and `require('../.../...')` chain. Every dependency that stays inside `.magic/` is L1; any cross to `dev/` is a **violation** to fix (move the consumer or extract a shim).
4. **Distinguish read paths from write paths**. A script is not «L1 because something in L1 calls it» — check **which branch** is reached. Example: `update-engine-meta.js` is L1 because its `--check` branch (verify) is invoked by the user's pre-commit hook. Its write branch (`runGenerateChecksums` → bump version → regenerate manifest) is reached only in **developer engine-improvement work**; that branch may reach into `dev/` via a graceful-fallback guard. The classification of the script is set by its **mandatory** user-reachable code path, not by all code paths.
5. **Anything not in the closure is L2**. Move it to `dev/scripts/`. If a `docs/` page or test references the old path, update those references in the same commit.

### 1.4. Canonical case studies (do not regress these)

- **`generate-checksums.js` → `dev/scripts/`** (v2.1.21 → v2.1.22). It is a manifest **builder**. The user contract is verify-only; users never regenerate `.checksums`. Caller `update-engine-meta.js` reaches it **only on the write branch**, which is itself reachable only by developer engine-improvement tasks. Placing the builder in L1 would force `update-engine-meta` to either (a) violate L1→L2 isolation or (b) crash on user installs where `dev/` is absent. Both are wrong; relocation is the fix.
- **`update-project-meta.js` → `dev/scripts/`** (v2.1.20 → v2.1.21). Writes `.design/INDEX.md` for the magic-spec repo itself. Called only from `dev/scripts/sync.js`. Zero references from L1 entry points. Pure L2.
- **`update-engine-meta.js` stays in `.magic/scripts/`**. Its `--check` mode is in the user's pre-commit hook (hardcoded in `install-hooks.js`); that is a direct L1 entry point. The write mode falls through to a graceful warning when `dev/scripts/generate-checksums.js` is absent — this is the **only** sanctioned L1→L2 fallback pattern.
- **`install-hooks.js` stays in `.magic/scripts/`**. Called from L1 `init.js` during user project bootstrap. Its output (the pre-commit hook content) is itself a piece of the L1 contract.

### 1.5. Secondary / Maintenance Components

- **Role**: Everything else in the repository is secondary and serves solely to maintain, document, or test the core engine.
- **Example (`.design/`)**: This is the project's own implementation of the Magic SDD workflow (a "testing ground"). It contains specifications and tasks for `magic-spec` itself.
  - `.design/INDEX.md` — Global aggregate registry linking all workspace indexes.
  - `.design/RULES.md` — Global constitution.
  - `.design/{workspace}/INDEX.md` — Workspace-specific specification registry.

## 2. Agent Operational Rules

1. **Strict Layer Boundary**: Always respect the boundary between Layer 1 (Release Kernel) and Layer 2 (Auxiliary Core). Concrete rules:
   - **No `require` from L1 into L2** at module top level — L1 must load and run on a user install with no `dev/` directory present.
   - **The one sanctioned exception**: a runtime `fs.existsSync` guard around an `execFileSync` / lazy `require` of a dev script, with a graceful warning on absence (pattern in `update-engine-meta.js` → `sync-skills.js` / `generate-checksums.js`). The L1 caller must complete its mandatory user-reachable code path **before** reaching the guard.
   - **Before relocating any script** between layers, run the §1.3 Classification Algorithm and document the result (read vs. write path, user entry points, transitive closure). Do not relocate on intuition.
2. **SDD First**: Never write code for new features without first defining them in a Specification (`.design/specifications/`) and creating a Task breakdown.
3. **Context Awareness**: Always refer to `.design/INDEX.md` (global aggregate) and `.design/{workspace}/INDEX.md` (workspace registry) to understand the current state of specifications. For conventions, load `.design/RULES.md` (global) and `.design/{workspace}/RULES.md` (workspace-specific, if it exists).
4. **Engine Integrity**: Do not modify files in `.magic/` or `workflows/` unless the task specifically requires "Engine Improvement".
   - **C14 Enforcement**: After ANY modification to content inside `.magic/` or `workflows/` directories, run `node .magic/scripts/executor.js update-engine-meta --workflow {changed_workflows}` **immediately** — before reporting results, running tests, or continuing to the next step. This command bumps the patch version, regenerates checksums, and **automatically synchronizes Skill wrappers**.
5. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.

## 3. Development Toolchain

The project uses a script-based execution model.

### 3.1 Script Execution

All development tasks (metadata sync, analysis, simulation) are handled via the engine's internal scripts:

```bash
# Update engine metadata and version (C14)
# {changed_workflows}: space-separated dotted workflow names, no .md extension (e.g. magic.spec magic.task)
node .magic/scripts/executor.js update-engine-meta --workflow magic.spec magic.task

# Run project analysis
/magic.analyze
```

## 4. Python Coding Style

All Python source files must adhere to a premium and uniform visual style.

### 4.1 Documentation (Google Style)

- Use Google-style docstrings for all functions, methods, and classes.
- Include `Args:`, `Returns:`, and `Raises:` sections where applicable.
- Maintain `from __future__ import annotations` at the top of every file.

### 4.2 Navigation & Section Blocks

Use consistent Unicode-based separators to improve code readability:

- **Major Sections** (File-level, Classes, Public API):

    ```python
    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION NAME (ALL CAPS)
    # ═══════════════════════════════════════════════════════════════════════════
    ```

- **Minor Sections** (Internal logic groups, Utility functions):

    ```python
    # ───────────────────────────────────────────────────────────────────────────
    # Sub-section Name (Title Case)
    # ───────────────────────────────────────────────────────────────────────────
    ```

- Avoid standard standard PEP8 horizontal lines or excessive whitespace. Use Unicode box characters to create a clean, modern look.

## 5. JavaScript/Node.js Coding Style

Common guidelines for Node.js scripts.

### 5.1 Documentation (JSDoc)

- Use JSDoc for all functions, methods, and classes.
- Include `@param`, `@returns`, and `@throws` tags where applicable.

### 5.2 Navigation & Section Blocks

Use consistent Unicode-based separators to improve code readability:

- **Major Sections** (Modules, Main logic):

    ```javascript
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION NAME (ALL CAPS)
    // ═══════════════════════════════════════════════════════════════════════════
    ```

- **Minor Sections** (Internal logic groups, Utility functions):

    ```javascript
    // ───────────────────────────────────────────────────────────────────────────
    // Sub-section Name (Title Case)
    // ───────────────────────────────────────────────────────────────────────────
    ```

## 6. Windows Junction Safety

When managing Windows junctions (`mklink /J`) and git index, follow this strict order to prevent data loss:

### 6.1 The Problem

`git rm -r --cached <path>` on Windows **follows junctions** and physically deletes files in the junction target, even with `--cached`. Example: `git rm -r --cached .claude/commands` where `.claude/commands` is a junction to `workflows/` will **delete all files in `workflows/` from disk**.

### 6.2 Safe Procedure

Always run `git rm --cached` **before** creating junctions, while the paths are empty or nonexistent:

1. `git rm --cached`   ← first, while no junctions exist yet
2. `mklink /J ...`     ← then create junctions

When removing from git index, list **specific file paths** rather than directories:

```bash
# Safe — specific files only
git rm --cached --ignore-unmatch workflows/magic.analyze.md

# Dangerous — git will traverse the junction into parent/source directories
git rm -r --cached .claude/commands
```

## 7. File Interaction Protocol

To prevent accidental data loss or corruption in large documents, the agent MUST follow this protocol:

### 7.1 Pre-read Requirement

- **Mandatory**: Always call `read` on the target file BEFORE making any edits.
- **Scope**: Read the entire file if it's within tool limits (800 lines) to ensure full context.
- **Anti-Pattern**: DO NOT rely on cached or partial information from previous steps.

### 7.2 Post-verify Requirement

- **Verification**: Immediately after an edit, use `read` or `bash` (grep/dir) to verify the result.
- **Integrity**: Check that surrounding code or documentation blocks (like diagrams) were NOT affected by the edit.
- **Recovery**: If data was lost, restore it immediately before proceeding.

- [ ] **Validated**: All logic changes verified via simulation:
  - `/magic.dev.simulate`
- [ ] **Versioned**: Increment the patch version (e.g., `2.0.1` → `2.0.2`) in:
  - `.magic/.version`
  - `CHANGELOG.md`
  - **Engine**: If content in `.magic/` or `workflows/` was modified, follow **Rule 2.3 (C14)** to update engine meta and version.
- [ ] **Documented**:
  - Update `CHANGELOG.md` with a summary of changes.
  - Update `README.md` if public API or features were changed.
  - Update relevant `.design/` workspace index/specifications to reflect task completion.
- [ ] **Synchronized**: Run metadata sync to ensure integrity:
  - `node .magic/scripts/executor.js update-engine-meta`
  - **Hardlinks**: Verify integrity with `fsutil hardlink list AGENTS.md` (should show 5 files: AGENTS, GEMINI, CLAUDE, CODEX, QWEN). If broken, run `/magic.dev.init` to restore.
  - ⚠️ **Editing breaks links**: writing to any of the 5 agent files with an inode-replacing editor (most `write`/`edit` tools) silently delinks that file — the twins keep the old content. After editing one, re-run `/magic.dev.init` (or recreate the hardlinks) and re-verify with `fsutil hardlink list`.
- [ ] **Preserved**: Verify that structural documents (like diagrams or `.design/INDEX.md`) haven't lost data during edits.
