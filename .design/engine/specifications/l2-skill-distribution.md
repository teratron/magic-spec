# Skill Distribution: Rule, Command Surfaces, Installation & Migration

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-skill-packaging.md

## Overview

How the single-skill engine reaches a project and is found by a host agent: the always-on rule that must live outside the skill, the three command surfaces (plain-text router, generated host commands, plugin channel), installation, update, the release archive, the migration from the two-layer 2.x layout and the rename of the state folder. The folder tree, location resolution and delivery order are in `l2-skill-layout.md`.

## Related Specifications

- [l1-skill-packaging.md](l1-skill-packaging.md) - The ten packaging invariants this specification implements.
- [l2-skill-layout.md](l2-skill-layout.md) - Tree, resolvers, versioning and the five-step delivery order.
- [l2-release-pipeline.md](l2-release-pipeline.md) - The release workflow whose archive composition changes (§5.5).
- [l2-skill-wrappers.md](l2-skill-wrappers.md) - The frontmatter limits that the router and every generated entry obey.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - The wrapper contract that the router replaces.
- [l2-agent-surface.md](l2-agent-surface.md) - The host-facing directories and the link inventory.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - The scaffold boundary: install and removal touch no product manifest.
- [l1-documentation-system.md](l1-documentation-system.md) - `docs/distribution.md` must carry the verified host table (C17).

## 1. Motivation

A skill loads on demand; the engine also needs text that holds from the first turn of a session. A skill is registered under its own name; users also expect to type a command per workflow, with completion where the host offers it. A new layout reaches users who already have the old one. Each of these needs a mechanism that the packaging invariants constrain: the rule must be a generated projection (SP-3, SP-4), the commands must resolve to one definition (SP-5), and the upgrade must not half-convert a project (SP-10).

## 2. Constraints & Assumptions

- Host behavior in §5.2 is **Unverified** until each row of the host table is checked against the host's own documentation and recorded in `docs/distribution.md`; the table below lists what this repository wires today, not what hosts guarantee.
- The engine never invokes a write-side git command (existing hard rule); the migration moves files and prints the commit suggestion, nothing more.
- Engine files in a consumer project are normally untracked (`.gitignore` guidance in the README), so a deleted engine file is not recoverable from git; the migration keeps a backup.
- **Assumption (forecast):** the old dotted command names (`/magic.task`) are retired in 3.0.0 and the migration tells the user the new names. Override: the generator emits alias entries under the old names (one more file per command from the same generator, no new logic).
- **Assumption (forecast):** releases are cut from the development branch once after step 5 of the delivery order; steps 1 and 2 may ship earlier as 2.x. Override: any other cut, provided SP-9 holds at the cut.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| SP-1 One folder, one version | §5.5 archive is the folder; version source is the folder's `.version` |
| SP-2 Location independence | §5.2 plugin cache and linked installs are first-class fixtures; §5.3 the hook and entries record a location written at install, never assumed |
| SP-3 Projections generated | §5.1-5.3 every projection is produced by `init`, regenerable, byte-compared with its source |
| SP-4 Always-on text outside | §5.1 |
| SP-5 One source per workflow | §5.2 three surfaces, one `workflows/` file each |
| SP-6 Removable without trace | §5.3 every projection carries a marker; `remove` deletes exactly the marked ones and the folder |
| SP-7 Maintenance not shipped | §5.5 archive smoke test excludes everything outside the folder and the allowed extras |
| SP-8 State is not engine | §5.4 update replaces the folder only; §5.7 rename ships with the migration |
| SP-9 Working engine at every step | `l2-skill-layout.md` §5.8; §5.6 resumable steps |
| SP-10 Explicit migration | §5.6 |

## 5. Detailed Design

### 5.1 The Always-On Rule

`AGENT-RULES.md` in the skill folder is the source of the rule that today ships as `rules/magic.md`: upgrade detection, graph use, finalization, archival, replan, containment, decision posture, the completion checklist, bug reporting and the cold-context resume check. It is renamed because `RULES.md` already names the project constitution and the two must not be confused.

- **Projection.** `init --host=<name>` writes the rule where the host loads rules unconditionally (`<host>/rules/magicspec.md`). A host with no rules directory gets a managed block in its instruction file, delimited by a begin and an end marker and holding one pointer line; `init` replaces the block's content and nothing else in the file.
- **Identical wording (SP-4).** The projection is a byte copy of the source; no per-install substitution. Engine resources are named relative to the skill (`scripts/executor.js`); a cold-context rule that needs the executor first loads the skill, whose router gives the base location. A rule step that cannot resolve the executor fails open and says nothing, as the resume check already does.
- **Staleness.** A projection that differs from its source is a recorded diagnostic (`RULE_PROJECTION_STALE`) with the remedy `init`. In the developer repository the projection is regenerated by the sync flow; the hardlink pair for this file is retired.
- **Consumer guard.** The read-only contract for engine directories stays in the source; the text names the skill folder and its projections instead of the four folders. In the developer repository the guard is read as `CLAUDE.md` §0 states, using the signal of `l2-skill-layout.md` §5.5, never an assumption.

### 5.2 Command Surfaces

Every surface resolves to a file in `workflows/` (SP-5).

| Surface | Mechanism | Generated by | Where it works |
| --- | --- | --- | --- |
| S1 Router | `SKILL.md` parses `magicspec <command> [args]` (also `magicspec:<command>` typed as text), names the command table, loads `workflows/<command>.md` | authored once | Every host that loads the skill |
| S2 Host commands | One entry per command in the host's command or prompt folder, 2-3 lines pointing at the router with the command | `init --host=<name>` | Hosts with a command folder |
| S3 Plugin | A plugin whose single content source is the skill folder; manifest and one entry per command generated; the plugin name `magicspec` gives `/magicspec:<command>` | the projection generator, shipped in the archive | Claude Code plugin mechanism |

Host table (to be completed and verified before step 3 ships):

| Host | Skills | Rules | Commands | Wired today | Verified against host documentation |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `.claude/skills` | `.claude/rules` | `.claude/commands`, plugin | yes (links to `.agents/`) | no |
| Codex | `.codex/skills` | `.codex/rules` | `.codex/prompts` | yes (links to `.agents/`) | no |
| Qwen | `.qwen/skills` | `.qwen/rules` | `.qwen/commands` | yes (links to `.agents/`) | no |
| Generic | `.agents/skills` | `.agents/rules` | `.agents/workflows` | yes | no |

<!-- TBD: Does the host list a skill's files, or only its name and description, before the skill is chosen? Decides whether S1 needs the command names in the router description. -->
<!-- TBD: Exact entry file naming per host that yields a colon-namespaced command without a colon in the file name (the Windows file-name constraint). -->

The plugin is a distribution channel, not a second engine: it carries the same folder, and a plugin install keeps the skill outside the project (a cache), which the location resolvers (`l2-skill-layout.md` §5.3) exist to support. Its manifest version equals the skill's `.version`; a mismatch is a release-blocking harness failure.

### 5.3 Installation

1. Place the folder: copy, or link, `skills/magicspec/` from the archive into the host's skills directory (one copy may serve several hosts through the links of `l2-skill-layout.md` §5.6).
2. Run `init --host=<name>[,<name>]` from the project. It is idempotent and does, in order: create the state scaffold if absent (existing behavior); write the rule projection (§5.1); write the host command entries (S2); install the pre-commit hook with the executor's location for this project; print the `.gitignore` guidance for the host paths. Each projection it writes carries a generated-by marker line (source file and engine version), the way the hook already carries one, so that removal and the staleness check find it without a separate record (SP-6). An unknown host name stops the run before anything is written and lists the known names.
3. `remove` deletes the projections that carry the marker and the folder, restores the hook to its prior content where it was saved, and leaves the state folder. Nothing in a product manifest is read or written by either command.

Installation remains drivable by an agent: the README's install prompt names the archive, the target folder per host and the `init` command; it is updated with the verified table.

### 5.4 Update

Replace the skill folder with the new release, then run `init` again. Replacing touches nothing in the state folder (SP-8). The upgrade-detection comparison reads the skill's `.version` against the registry snapshot, exactly as today. A projection older than its source is reported as stale (§5.1); `init` regenerates it.

### 5.5 Release Archive

The archive prefix is `magic-spec-v{version}/`; its contents are the skill folder, `README.md`, `LICENSE` and the plugin manifest and entries (S3). The version is read from the skill's `.version`, the single source for the tag and the archive name. A smoke step in the release workflow lists the archive and fails when any path lies outside that set, closing the "no archive content test" gap recorded in `l2-release-pipeline.md`. The tag-driven trigger, the retry loop and the idempotent publication are unchanged.

### 5.6 Migration from the 2.x Layout

A project on 2.x installs the 3.0.0 skill folder (§5.3 step 1) and runs `migrate`, a subcommand of the skill's own executor. It is user-reachable, so it belongs to the shipped folder, not to the maintenance tools. It reads the filesystem, never a log, so it can be re-run after any interruption.

1. **Detect** the old layout: `.magic/`, engine-named files in `workflows/`, `skills/`, `rules/`, and the old state folder. Nothing found: print that and exit.
2. **Plan.** Default is a dry run that prints the plan; `--apply` executes it. The plan lists every file to be removed and every folder to be renamed. This is the single consent point (C27 E1): the agent presents the plan once with the dry-run result.
3. **Verify the old tree** against its own `.checksums`. Files that differ are reported (`ENGINE_FILE_MODIFIED`) and kept, never deleted; the old tree is engine content and is not edited in place, so a difference is evidence of a user change worth keeping.
4. **Back up** the engine files to be removed into a dated folder, outside the state folder.
5. **Install the new tree's projections** for each host found (or `--host`): rule, commands, hook (§5.3 step 2).
6. **Rename the state folder** (§5.7) when step 5 of the delivery order has shipped; before that it is skipped.
7. **Remove the old engine** last, and only the files the old manifest names; a folder the project also uses (`skills/`, `workflows/`, `rules/`) loses only those files and is removed only if left empty.
8. **Verify**: integrity check and the pre-flight run; print the result, the new command names, and a commit suggestion (not executed).

Because the new tree is installed and verified before the old is removed, the project is never left with neither (SP-10). A step that fails stops the run and says which step; the next run resumes from the filesystem. Supported source: 2.x. Earlier layouts get a message naming the last release that migrates them.

### 5.7 State Folder Rename

The name is the single constant of `l2-skill-layout.md` §5.3. At the rename step: the constant changes; the shipped text is edited in one pass guarded by a residue search that must find no occurrence of the old name outside the migration's own detection code and the history; `workspace.json` entries equal to the old name are rewritten by the migration; and an engine that finds both folders stops with one recommended path (finish or revert the migration) instead of choosing. The rename is a filesystem rename in the same volume, atomic per project.

## 6. Implementation Notes

1. Fixtures: an installation in a `.agents/skills` shape, in a `.claude/skills` shape, as a linked skill folder outside the project, and as a plugin-cache copy; each runs `init`, a workflow subcommand from a subdirectory, and `remove`.
2. Migration fixtures are real snapshots of 2.x projects (a fresh init, a project with a modified engine file, one with its own `skills/` folder, one with an interrupted run); each fixture runs the migration twice and asserts the second run changes nothing.
3. The harness asserts router-to-folder parity, projection staleness detection in both directions, and the manifest-version equality of the plugin.
4. Order: `init` projections and the rule rename first (they need no migration), the plugin last (the only unverified host assumption).

## 7. Drawbacks & Alternatives

- **Plugin channel** adds a second release artifact and a version-equality check; it is the only way to a registered `/magicspec:<command>` namespace in the one host that has it, so it is kept as an optional channel and gated by the verified host table.
- **Substituting the skill's location into the rule** would let a cold session run the executor without loading the skill. Rejected: it breaks SP-4's identical wording, makes the projection differ per install, and fails silently when the folder moves; the cost of loading the router on a cold start is one small file.
- **Migration inside the old engine** (shipping an upgrade script in 2.x) was rejected: users replace the engine by archive, so the script that runs is the new one.
- **Alias entries for the old names** are a one-line generator change if the assumption in §2 proves wrong.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[RULE-SRC]` | `rules/magic.md` | The present rule text the new source starts from |
| `[RELEASE]` | `.github/workflows/release.yml` | The workflow whose archive composition changes |
| `[DIST]` | `docs/distribution.md` | The user-facing host and install reference (C17) |
| `[HOOKS]` | `.magic/scripts/install-hooks.js` | Present hook writer and its ownership rules |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-28 | Agent | Initial draft: always-on rule projection, three command surfaces and the host table, installation and removal, update, release archive, the resumable 2.x migration, the state-folder rename. Post-Update Review: spec-critic PASS, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
