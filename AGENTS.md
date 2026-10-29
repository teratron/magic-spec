# Agent Rules

This document defines the core principles and structural hierarchy for AI agents working on the **Magic Spec** project.

## 0. Repository Identity: A Self-Hosting Engine (Read First)

This repository **is** the Magic Spec engine's source, and it builds itself: its own SDD workspace (`.magicspec/`) specifies the engine, and the engine's own `/magicspec:*` commands plan and execute the changes to the engine that runs them. What this repository ships — `skills/magicspec/` — is installed by *other* projects, and it is **those** projects that must never modify the engine.

Consequences for an agent working here:

1. **You are the engine's author, not its consumer.** `skills/magicspec/` and the maintenance tooling (`skills/magicspec-dev/`, `scripts/`, `tests/`) are the product under development. Changing them is the ordinary work of this repository, authorized by the request itself — no "Engine Improvement" keyword and no confirmation step beyond the ones every task already has (C27 E1: destructive or irreversible actions).
2. **The consumer guards do not apply here.** Shipped text written for the end user's project — the read-only `CAUTION` block at the top of `skills/magicspec/AGENT-RULES.md`, its §9 Bug Reporting protocol ("do not attempt to edit or fix it yourself") with the matching §8 checklist item, and the §1.1 user contract below — is loaded into this session too (`.agents/rules/magicspec.md` is its generated projection), but it describes a project that *installed* the engine. Here, a pasted `MAGIC-SPEC ENGINE BUG REPORT` is a work item to reproduce and fix, not a report to forward.
3. **Workflow write scopes are not repository permissions.** `/magicspec:spec` writes only under `.magicspec/` and `/magicspec:rule` only to `RULES.md`; those bounds describe what the workflow itself writes and hold here as everywhere. A request whose substance is the engine — a rule about engine code, a fix in a shipped file — is carried out as direct engine work in the same turn, not rerouted into `.magicspec/` because the invoked workflow cannot reach the target.
4. **Freedom of scope is not freedom from procedure.** Every engine change still follows C1 (read first, trace impact, update atomically), C14 (`update-engine-meta` after any change inside `skills/magicspec/`), the §1.3 layer classification, and `[C-001]` (recreate any hardlink an edit broke).
5. **Keep the consumer guard intact.** The read-only rules in shipped files are correct for their audience; when editing those files, do not weaken them to match this repository's freedom. A shipped script that must tell the two apart uses the existing signal — the presence of `scripts/generate-checksums.js` — never an assumption.

## 1. Project Anatomy

The project creates an SDD (Specification-Driven Development) engine. The repository is strictly divided into two primary layers comprising the core engine, plus a secondary maintenance component.

**AGENT DIRECTIVE**: Product work targets Layer 1 and Layer 2. The SDD workspace (`.magicspec/`) is read and updated as rules 2.2–2.3 require; other secondary components (`docs/`, drafts, generated files) are touched only when the request names them.

### 1.1. Layer 1: User Distribution (The Release Kernel)

This layer contains ONLY the resources the end-user will download and install. Nothing extra must be placed here.

- `skills/magicspec/` — **The most important directory!** The whole SDD engine as one skill: `SKILL.md` (the router), `workflows/` (one body per command), `references/`, `roles/`, `templates/`, `scripts/` (the executor and its subcommands), `AGENT-RULES.md` (the source of the always-on rule), `.version` and `.checksums`.

**User contract** — what the end user does with the release kernel:

- **Consumes** the skill folder (read-only — the user invokes its commands as `/magicspec:*`, never edits it).
- **Verifies** engine integrity through `update-engine-meta --check` (called by the pre-commit hook installed by `init.js`).
- **Never regenerates** the integrity manifest (`skills/magicspec/.checksums`), never bumps its `.version`, never modifies the folder's content. Drift is resolved by **restoring the folder from the release archive**, not by overwriting checksums (which would mask the corruption that triggered the drift).

**Constraints**:

- This folder ships to the user via GitHub Releases. Keep it strictly clean of dev-only artifacts.
- L1 code **must not `require`** anything from the maintenance folders (`scripts/`, `tests/`). The single tolerated exception is a **graceful-fallback `fs.existsSync` guard** (e.g., `update-engine-meta` → `scripts/sync-engine-snapshot.js` and `scripts/generate-checksums.js`): if the dev tree is absent (user installation), warn and continue, never crash.
- Changes to **anything inside `skills/magicspec/`** modify the engine itself and trigger **C14** (version bump + checksum regeneration + refresh of the host projections that exist). The manifest covers the whole folder, so every edit is a version event; the projections outside it (`.agents/rules/magicspec.md`, the command entries) are C14 **output**, regenerated from the folder, never hand-edited.

### 1.2. Layer 2: Auxiliary Core (`scripts/`, `tests/`, `skills/magicspec-dev/`)

- **Path**: `/scripts/`, `/tests/`, `/skills/magicspec-dev/` (workflows only) and `/package.json`
- **Role**: The auxiliary part of the core engine. It contains development, testing, and operational logic that **must not** be distributed to the user side.
- **Developer contract — what lives here**:
  - **Manifest builders** that write to L1 artifacts (e.g., `scripts/generate-checksums.js` writes `skills/magicspec/.checksums`).
  - **Project-meta updaters** (e.g., `scripts/update-project-meta.js` writes `.magicspec/INDEX.md`).
  - **Sync orchestrators** that coordinate cross-layer state (`scripts/sync.js`, `sync-docs.js`, `sync-manifests.js`, `validate-hardlinks.js`).
  - **Tests** (`tests/`).
- **Constraint**: anything that exists solely to **produce or maintain** L1 artifacts belongs here, even if the artifact it produces ships to users. The output is L1; the producer is L2.

### 1.3. Layer Classification Algorithm (mandatory before relocating any script)

When in doubt whether a script belongs in `skills/magicspec/scripts/` (L1) or `scripts/` (L2), apply this algorithm. This is the same trace that uncovered the `generate-checksums.js` and `update-project-meta.js` mis-placements in v2.1.21–v2.1.22.

1. **Enumerate user-facing entry points** — every place where an end user (not a magic-spec developer) can invoke a script:
   - `skills/magicspec/SKILL.md` (the router) and `skills/magicspec/workflows/*.md`
   - `skills/magicspec/AGENT-RULES.md`
   - `skills/magicspec/references/*.md` (modules the bodies name)
   - The hardcoded pre-commit hook content in `skills/magicspec/scripts/install-hooks.js`
2. **Grep these entry points** for `executor.js <name>` and `skills/magicspec/scripts/<name>.js`. The union is the **L1 root set** of subcommands.
3. **Compute transitive closure** — for each root script, follow its `require('./...')` and `require('../.../...')` chain. Every dependency that stays inside `skills/magicspec/` is L1; any cross to the maintenance folders is a **violation** to fix (move the consumer or extract a shim).
4. **Distinguish read paths from write paths**. A script is not «L1 because something in L1 calls it» — check **which branch** is reached. Example: `update-engine-meta.js` is L1 because its `--check` branch (verify) is invoked by the user's pre-commit hook. Its write branch (`runGenerateChecksums` → bump version → regenerate manifest) is reached only in **developer engine-improvement work**; that branch may reach into `scripts/` via a graceful-fallback guard. The classification of the script is set by its **mandatory** user-reachable code path, not by all code paths.
5. **Anything not in the closure is L2**. Move it to `scripts/`. If a `docs/` page or test references the old path, update those references in the same commit.

### 1.4. Canonical case studies (do not regress these)

- **`generate-checksums.js` → `scripts/`** (v2.1.21 → v2.1.22). It is a manifest **builder**. The user contract is verify-only; users never regenerate `.checksums`. Caller `update-engine-meta.js` reaches it **only on the write branch**, which is itself reachable only by developer engine-improvement tasks. Placing the builder in L1 would force `update-engine-meta` to either (a) violate L1→L2 isolation or (b) crash on user installs where `dev/` is absent. Both are wrong; relocation is the fix.
- **`update-project-meta.js` → `scripts/`** (v2.1.20 → v2.1.21). Writes `.magicspec/INDEX.md` for the magic-spec repo itself. Called only from `scripts/sync.js`. Zero references from L1 entry points. Pure L2.
- **`update-engine-meta.js` stays in `skills/magicspec/scripts/`**. Its `--check` mode is in the user's pre-commit hook (hardcoded in `install-hooks.js`); that is a direct L1 entry point. The write mode falls through to a graceful warning when `scripts/generate-checksums.js` is absent — this is the **only** sanctioned L1→L2 fallback pattern.
- **`install-hooks.js` stays in `skills/magicspec/scripts/`**. Called from L1 `init.js` during user project bootstrap. Its output (the pre-commit hook content) is itself a piece of the L1 contract.

### 1.5. Secondary / Maintenance Components

- **Role**: Everything else in the repository is secondary and serves solely to maintain, document, or test the core engine.
- **Example (`.magicspec/`)**: This is the project's own implementation of the Magic SDD workflow (a "testing ground"). It contains specifications and tasks for `magic-spec` itself.
  - `.magicspec/INDEX.md` — Global aggregate registry linking all workspace indexes.
  - `.magicspec/RULES.md` — Global constitution.
  - `.magicspec/{workspace}/INDEX.md` — Workspace-specific specification registry.

## 2. Agent Operational Rules

1. **Strict Layer Boundary**: Always respect the boundary between Layer 1 (Release Kernel) and Layer 2 (Auxiliary Core). Concrete rules:
   - **No `require` from L1 into L2** at module top level — L1 must load and run on a user install with no `scripts/` folder present.
   - **The one sanctioned exception**: a runtime `fs.existsSync` guard around an `execFileSync` / lazy `require` of a dev script, with a graceful warning on absence (pattern in `update-engine-meta.js` → `sync-engine-snapshot.js` / `generate-checksums.js`). The L1 caller must complete its mandatory user-reachable code path **before** reaching the guard.
   - **Before relocating any script** between layers, run the §1.3 Classification Algorithm and document the result (read vs. write path, user entry points, transitive closure). Do not relocate on intuition.
2. **SDD First**: Never write code for new features without first defining them in a Specification (`.magicspec/{workspace}/specifications/`) and creating a Task breakdown.
3. **Context Awareness**: Always refer to `.magicspec/INDEX.md` (global aggregate) and `.magicspec/{workspace}/INDEX.md` (workspace registry) to understand the current state of specifications. For conventions, load `.magicspec/RULES.md` (global) and `.magicspec/{workspace}/RULES.md` (workspace-specific, if it exists).
4. **Engine Integrity**: Engine changes are this repository's ordinary work (§0) — make them when the request calls for them, following C1's read-first/trace-impact/atomic-update discipline.
   - **C14 Enforcement**: After ANY modification to content inside `skills/magicspec/`, run `node skills/magicspec/scripts/executor.js update-engine-meta` **immediately** — before reporting results, running tests, or continuing to the next step. This command bumps the patch version, regenerates checksums, and **refreshes the host projections that exist**.
5. **Clean Builds**: Ensure that build artifacts (`dist/`, `__pycache__`, etc.) never escape their respective local scopes or get committed.

## 3. Development Toolchain

The project uses a script-based execution model.

### 3.1 Script Execution

All development tasks (metadata sync, analysis, simulation) are handled via the engine's internal scripts:

```bash
# Update engine metadata and version (C14)
node skills/magicspec/scripts/executor.js update-engine-meta

# Run project analysis
/magicspec:analyze
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

- Avoid standard PEP8 horizontal lines or excessive whitespace. Use Unicode box characters to create a clean, modern look.

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

`git rm -r --cached <path>` on Windows **follows junctions** and physically deletes files in the junction target, even with `--cached`. Example: `git rm -r --cached .claude/skills` where `.claude/skills` is a link to `.agents/skills/` and `.agents/skills/magicspec` is a junction to `skills/magicspec/` will **delete the files of `skills/magicspec/` from disk**.

### 6.2 Safe Procedure

Always run `git rm --cached` **before** creating junctions, while the paths are empty or nonexistent:

1. `git rm --cached`   ← first, while no junctions exist yet
2. `mklink /J ...`     ← then create junctions

When removing from git index, list **specific file paths** rather than directories:

```bash
# Safe — specific files only
git rm --cached --ignore-unmatch skills/magicspec-dev/workflows/sync.md

# Dangerous — git will traverse the junction into parent/source directories
git rm -r --cached .claude/commands
```

## 7. File Interaction Protocol

To prevent accidental data loss or corruption in large documents, the agent MUST follow this protocol:

### 7.1 Pre-read Requirement

- **Mandatory**: Always call `read` on the target file BEFORE making any edits.
- **Scope**: Read the entire file if it's within the tool's read limit, to ensure full context.
- **Anti-Pattern**: DO NOT rely on cached or partial information from previous steps.

### 7.2 Post-verify Requirement

- **Verification**: Immediately after an edit, use `read` or `bash` (grep/dir) to verify the result.
- **Integrity**: Check that surrounding code or documentation blocks (like diagrams) were NOT affected by the edit.
- **Recovery**: If data was lost, restore it immediately before proceeding.

## 8. Completion Protocol (Mandatory Checklist)

Before finishing any task, verify:

- [ ] **Validated**: All logic changes verified via simulation:
  - `/magicspec-dev:test`
- [ ] **Versioned**: Increment the patch version (e.g., `2.0.1` → `2.0.2`) in:
  - `skills/magicspec/.version`
  - `CHANGELOG.md`
  - **Engine**: If content inside `skills/magicspec/` was modified, follow **Rule 2.4 (C14)** to update engine meta and version.
- [ ] **Documented**:
  - Update `CHANGELOG.md` with a summary of changes.
  - Update `README.md` if public API or features were changed.
  - Update relevant `.magicspec/` workspace index/specifications to reflect task completion.
- [ ] **Synchronized**: Run metadata sync to ensure integrity:
  - `node skills/magicspec/scripts/executor.js update-engine-meta`
  - **Hardlinks**: Verify integrity with `fsutil hardlink list AGENTS.md` (should show 5 files: AGENTS, GEMINI, CLAUDE, CODEX, QWEN). If broken, run `/magicspec-dev:init` to restore.
  - ⚠️ **Editing breaks links**: writing to any of the 5 agent files with an inode-replacing editor (most `write`/`edit` tools) silently delinks that file — the twins keep the old content. After editing one, re-run `/magicspec-dev:init` (or recreate the hardlinks) and re-verify with `fsutil hardlink list`.
- [ ] **Preserved**: Verify that structural documents (like diagrams or `.magicspec/INDEX.md`) haven't lost data during edits.

<!-- magicspec:begin -->
Before any work in this project, read `skills/magicspec/AGENT-RULES.md` and follow it for the whole session.
<!-- magicspec:end -->
