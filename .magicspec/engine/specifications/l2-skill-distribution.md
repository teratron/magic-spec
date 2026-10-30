# Skill Distribution: Rule, Command Surface, Installation & Migration

**Version:** 2.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-skill-packaging.md

## Overview

How the single-skill engine reaches a project and is found by a host agent: the always-on rule that must live outside the skill, the one command surface — the router, invoked as `/magicspec <command>` (the generated host commands and the plugin channel are retired since 2.0.0) — installation, update, the release archive, the migration from the two-layer 2.x layout and the rename of the state folder. The folder tree, location resolution and delivery order are in `l2-skill-layout.md`.

## Related Specifications

- [l1-skill-packaging.md](l1-skill-packaging.md) - The ten packaging invariants this specification implements.
- [l2-skill-layout.md](l2-skill-layout.md) - Tree, resolvers, versioning and the five-step delivery order.
- [l2-release-pipeline.md](l2-release-pipeline.md) - The release workflow whose archive composition changes (§5.5).
- [l2-skill-wrappers.md](l2-skill-wrappers.md) - The frontmatter limits the router obeys and the router contract.
- [l1-command-surface.md](l1-command-surface.md) - The one command, its grammar, the interactive help and the argument intake that replace the per-command entries.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - The wrapper contract that the router replaces.
- [l2-agent-surface.md](l2-agent-surface.md) - The host-facing directories and the link inventory.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - The scaffold boundary: install and removal touch no product manifest.
- [l1-documentation-system.md](l1-documentation-system.md) - `docs/distribution.md` must carry the verified host table (C17).

## 1. Motivation

A skill loads on demand; the engine also needs text that holds from the first turn of a session. A skill is registered under its own name; users also expect to type a command per workflow, with completion where the host offers it — since 2.0.0 one command and its argument meet that expectation, and the help offers the rest (the owner's decision of 2026-10-30, [l1-command-surface.md](l1-command-surface.md) 2.0.0). A new layout reaches users who already have the old one. Each of these needs a mechanism that the packaging invariants constrain: the rule must be a generated projection (SP-3, SP-4), the commands must resolve to one definition (SP-5), and the upgrade must not half-convert a project (SP-10).

## 2. Constraints & Assumptions

- Host behavior in §5.2 was verified on 2026-10-28 against each host's own documentation; the documentation changes, so the table is read again at the start of the deployment step and recorded in `docs/distribution.md` (C17). What the documentation does not state is listed under the table and is not relied on.
- The engine never invokes a write-side git command (existing hard rule); the migration moves files and prints the commit suggestion, nothing more.
- Engine files in a consumer project are normally untracked (`.gitignore` guidance in the README), so a deleted engine file is not recoverable from git; the migration keeps a backup.
- **Assumption (forecast):** the old dotted command names (`/magic.task`) are retired in 3.0.0 and the migration tells the user the new form. Override: the router reads the dotted spelling as text and maps it to the command (one line of its grammar). `[MODIFIED]`
- **Assumption (forecast):** `[ADDED]` the plugin channel is retired with the command entries, because a plugin namespaces every component under its own name (`/magicspec:<skill>`; Claude Code plugin reference, read 2026-10-30), which would bring back a second printed form beside `/magicspec <command>`. Runner-up: keep the plugin as a distribution channel carrying one skill. Override: `/magicspec spec amend l2-skill-distribution.md "keep the plugin channel"`.
- **Release cut (owner decision, 2026-10-28):** the whole restructuring is released once, as 3.0.0, from the development branch after step 5 of the delivery order; no 2.x release carries any part of it. The version file keeps its 2.1.x value until the release step sets 3.0.0.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| SP-1 One folder, one version | §5.5 archive is the folder; version source is the folder's `.version` |
| SP-2 Location independence | §5.2 linked installs are first-class fixtures; §5.3 the hook records a location written at install, never assumed |
| SP-3 Projections generated | §5.1-5.3 every projection is produced by `init`, regenerable, byte-compared with its source |
| SP-4 Always-on text outside | §5.1 |
| SP-5 One source per workflow | §5.2 one surface, the router, resolving every command to its `workflows/` file; retiring the other two removed no capability |
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
- **Staleness.** A projection that differs from its source — the rule copy or the pointer block — is a pre-flight warning (`PROJECTION_STALE`) with the remedy `init --host=<name>`; the pre-flight changes nothing. A command entry left by an earlier 3.0.x installation (it carries the command marker) is a pre-flight warning `PROJECTION_RETIRED` with the remedy `init`, which removes it. `[MODIFIED]` In the developer repository the projection is regenerated by the sync flow; the hardlink pair for this file is retired.
- **Consumer guard.** The read-only contract for engine directories stays in the source; the text names the skill folder and its projections instead of the four folders. In the developer repository the guard is read as `CLAUDE.md` §0 states, using the signal of `l2-skill-layout.md` §5.5, never an assumption.

### 5.2 Command Surfaces

Every surface resolves to a file in `workflows/` (SP-5).

| Surface | Mechanism | Generated by | Where it works |
| --- | --- | --- | --- |
| S1 Router | `SKILL.md` parses `/magicspec <command> [argument]` (the colon spelling typed as text is read, never printed), names the command table, runs the interactive help and the argument form ([l1-command-surface.md](l1-command-surface.md) CS-3, CS-9, CS-10), loads `workflows/<command>.md` | authored once | Every host that loads the skill |
| ~~S2 Host commands~~ — retired 2.0.0 | One entry per command in a `magicspec/` subfolder of the host's command folder, pointing at the router; seven per host, thirteen with the command set of `l1-command-surface.md` CS-1 (measured 2026-10-30) | — (`init` removes what an earlier install left) | — |
| ~~S3 Plugin~~ — retired 2.0.0 | A plugin carrying the skill folder and one skill per command; its namespace gave `/magicspec:<command>` | — | — |

Host table, verified 2026-10-28 against each host's own documentation (pages in Canonical References). It supersedes the wiring this repository carried before, which assumed paths the documentation does not give:

| Host | Skills (project) | Always-on rule | Command entries | Instruction file |
| --- | --- | --- | --- | --- |
| Claude Code | `.claude/skills/<name>/SKILL.md`; symbolic links to a folder are followed; only descriptions are listed until the skill is invoked (truncated at 1,536 characters); `${CLAUDE_SKILL_DIR}` names the skill's folder inside its text | `.claude/rules/*.md`, any depth; a file without `paths` loads unconditionally; symbolic links work, a target outside the project needs a one-time approval | `.claude/commands/<ns>/<cmd>.md` gives `/<ns>:<cmd>` (a subfolder is the namespace); a skill folder gives `/<name>`; a plugin skill gives `/<plugin>:<skill>` | `CLAUDE.md`; `AGENTS.md` is read only when no `CLAUDE.md` exists |
| Codex | `.agents/skills` in every folder from the working directory up to the repository root, and `$HOME/.agents/skills`; **not** `.codex/skills`; symbolic links followed; explicit use by `$name` or `/skills`; the list holds each skill's file path and description within a budget of 2% of the context or 8,000 characters | none documented | none per project: custom prompts are deprecated, live only under `~/.codex/prompts` and only at its top level | `AGENTS.md` chain, 32 KiB combined by default |
| Qwen Code | `.qwen/skills/<name>/SKILL.md` and `.agents/skills/<name>/SKILL.md` (the `.qwen` copy wins a clash); symbolic links followed; `/<name>` | `<project>/.qwen/rules/*.md`, any depth; a file without `paths` is part of the system prompt from the first request; project rules load when the workspace is trusted | `.qwen/commands/<ns>/<cmd>.md` gives `/<ns>:<cmd>`; Markdown, arguments by `{{args}}` | `QWEN.md` (`@path` imports) and `AGENTS.md`, both read |

What the table settles:

- **No per-command entry is needed.** `[MODIFIED]` A host invokes the skill by its name and hands it the rest of the line: Claude Code documents `/<name>` for a skill folder, with the text after it delivered as the skill's arguments (appended as `ARGUMENTS: …` when the skill declares no placeholder; read 2026-10-30); Codex invokes `$magicspec task`. Qwen Code documents `/<name>` for a skill; how it passes the text after the name is not documented on the pages read <!-- TBD: verify on Qwen Code whether the text after `/magicspec` reaches the skill; if it does not, its users reach every command through the interactive help, which needs no argument, and the release notes say so -->. The command-folder column above records what the hosts offer; the engine writes nothing there.
- **Choice forms for the interactive help.** `[ADDED]` Claude Code gives the agent a question form of two to four choices per question and up to four questions per form, always with a free-text choice (observed in the tool definition of a Claude Code session, 2026-10-30); the command picker therefore takes two steps there — a group, then a command ([l1-command-surface.md](l1-command-surface.md) CS-10). Codex and Qwen Code: no choice form is documented on the pages read; both get the numbered list in the chat.
- **One skill location serves two hosts.** `.agents/skills/magicspec` is read by Codex and Qwen Code; Claude Code needs `.claude/skills/magicspec`, a copy or a link to the same folder. The earlier `.codex/skills`, `.codex/prompts` and `.codex/rules` paths of this repository are read by no documented Codex feature, and `.agents/rules` and `.agents/workflows` by no host.
- **The router description carries the command names.** Every host lists skills by description before one is chosen; none lists a skill's other files. The router description names the commands.
- **Where the rule goes.** Claude Code and Qwen Code take the projection in their rules folder. Codex documents no rules folder, and its instruction budget is shared: the rule alone is about 25 KiB of the 32 KiB, so the AGENTS.md block holds one pointer line to the rule file inside the skill folder, not the rule itself.
- **Skill location in text.** Only Claude Code gives the skill's folder to its text (`${CLAUDE_SKILL_DIR}`); Codex lists each skill's file path. The skill-relative notation of `l2-skill-layout.md` §5.3 stays, and the router states it.
- **No host uses `<project>/skills/`.** The second half of the developer signal (`l2-skill-layout.md` §5.5) cannot be mistaken for a host install.

Not covered by the documentation read: whether Codex loads any rules folder (its AGENTS.md page names none), the size limit of `QWEN.md`, and the interaction of the Qwen workspace-trust gate with a project rule. The generator must not depend on any of them; each is recorded in the host table of `docs/distribution.md` when first measured.

**The plugin channel is retired** `[MODIFIED]` with the command entries (§2): its namespace is the second printed form the owner's decision removes. The location resolvers (`l2-skill-layout.md` §5.3) keep supporting a skill installed outside the project, which a shared or linked install still uses. `build-plugin` and its harness cases are removed in the same delivery.

### 5.3 Installation

1. Place the folder: copy, or link, `skills/magicspec/` from the archive into the host's skills directory (one copy may serve several hosts through the links of `l2-skill-layout.md` §5.6).
2. Run `init --host=<name>[,<name>]` from the project. It is idempotent and does, in order: create the state scaffold if absent (existing behavior); write the rule projection (§5.1); remove any command entry an earlier installation left (§5.1, `[MODIFIED]`); install the pre-commit hook with the executor's location for this project; print the `.gitignore` lines for the engine folder, the hosts' projections and the graph and cache folders, and — for a project that commits the engine instead — the `.gitattributes` line `/{engine folder}/** -text`, without which a checkout that converts line endings makes the integrity check fail (§5.4 of [l2-engine-automation.md](l2-engine-automation.md), Line endings). Each projection it writes carries a marker line that says what it is (`<!-- magicspec-rule -->`, the begin and end lines of the pointer block; `<!-- magicspec-command {name} -->` is the marker by which a retired entry is found), the way the hook already carries one, so that removal and the staleness check find it without a separate record (SP-6). The marker records no source file or version: staleness is a byte comparison with the source, and a version in the marker would make every engine bump rewrite every projection. When the installer of the hook does not install it (a hook of the project's own, a redirected hooks folder), `init` records the installer's own reason (`GIT_HOOKS_NOT_INSTALLED`), not the exit status of a child process. An unknown host name, or a router or rule source that cannot be read, stops the run before anything is written and lists the known names.
3. `remove` (with `--dry-run` to list without changing; `--help` prints its usage) refuses an unknown option, a malformed `--dry-run=…` and a stray argument before it touches anything ([l2-engine-automation.md](l2-engine-automation.md), Command Line Contract; before engine 3.0.1 it ignored them, so `remove --help` and `remove -n` removed the engine) and deletes the projections that carry a marker — the rule copies, any command entry an earlier installation left, the pointer block (the rest of the instruction file stays) and the skill links, as links — and the pre-commit hook when it carries the engine's marker (a hook of the project's own was never replaced, so there is nothing to restore), and leaves the state folder and every unmarked file. The engine folder goes last, and only when it lies inside the project and the project is not the engine's own repository; when the platform keeps the running folder locked, the command prints the one path to delete. Nothing in a product manifest is read or written by either command.

Installation remains drivable by an agent: the README's install prompt names the archive, the target folder per host and the `init` command; it is updated with the verified table.

**Agent-assisted installation contract** `[ADDED]`. The README's install prompt is the primary installation path (the owner's list of 2026-10-29: "installation for the user through a prompt for the AI"). It exists today with four steps; it does not check the runtime, does not look for an engine already installed, gives no fetch command, verifies nothing after placing the folder and has no failure path. The prompt therefore states, in this order:

1. **Ask only intent**: the hosts to configure, and stable release or current branch — the two choices only the person can make.
2. **Check the runtime**: `node --version` meets the stated floor; otherwise stop and say which version is needed.
3. **Look for an installed engine**: an existing skill folder of this engine → read its `.version`; a 3.x folder is an update (§5.4, replace the folder, keep the state); a 2.x layout (the earlier engine and state folders) → install the new folder beside it and run `/magicspec migrate` instead of `init` — the `migrate` subcommand where the host cannot invoke the skill (§5.6).
4. **Fetch**: the release asset's exact address pattern, with one command for a POSIX shell and one for PowerShell, and the current-branch alternative; extract into a temporary folder outside the project and copy only `skills/magicspec/`.
5. **Place and verify**: copy the folder to the first host's skills folder, then run `update-engine-meta --check` — a mismatch means a corrupt download, and the agent deletes the copy and fetches again once.
6. **Initialize**: `init --host=…`; any non-zero exit is reported verbatim and stops the prompt.
7. **Finish**: add the printed ignore lines, run `check-prerequisites`, and end with one line naming `/magicspec help` as the next step.

The prompt never edits the folder after placing it, never commits, and asks nothing beyond step 1.

### 5.4 Update

Replace the skill folder with the new release, then run `init` again. Replacing touches nothing in the state folder (SP-8). The upgrade-detection comparison reads the skill's `.version` against the registry snapshot, exactly as today. A projection older than its source is reported as stale (§5.1); `init` regenerates it.

### 5.5 Release Archive

The archive prefix is `magic-spec-v{version}/`; its contents are the skill folder, `README.md` and `LICENSE` (the plugin manifest and entries left with S3; the composition never carried them). The version is read from the skill's `.version`, the single source for the tag and the archive name. A smoke step in the release workflow lists the archive and fails when any path lies outside that set, closing the "no archive content test" gap recorded in `l2-release-pipeline.md`. The tag-driven trigger, the retry loop and the idempotent publication are unchanged. As built: one composition function (`scripts/archive-composition.js`) produces the list the workflow zips and checks the finished archive for paths outside the set and for missing required files (`SKILL.md`, `AGENT-RULES.md`, `.version`, `.checksums`, the executor).

### 5.6 Migration from the 2.x Layout

A project on 2.x installs the 3.0.0 skill folder (§5.3 step 1) and runs `migrate`, a subcommand of the skill's own executor. It is user-reachable, so it belongs to the shipped folder, not to the maintenance tools. It reads the filesystem, never a log, so it can be re-run after any interruption.

1. **Detect** the old layout: `.magic/`, engine-named files in `workflows/`, `skills/`, `rules/`, and the old state folder. Nothing found: print that and exit.
2. **Plan.** Default is a dry run that prints the plan; `--apply` executes it. The plan lists every file to be removed and every folder to be renamed. This is the single consent point (C27 E1): the agent presents the plan once with the dry-run result.
3. **Verify the old tree** against its own `.checksums`. Files that differ are reported (`ENGINE_FILE_MODIFIED`) and kept, never deleted; the old tree is engine content and is not edited in place, so a difference is evidence of a user change worth keeping.
4. **Back up** the engine files to be removed into a dated folder, outside the state folder.
5. **Install the new tree's projections** for each host found (or `--host`): rule, hook (§5.3 step 2); no command entry is written.
6. **Rename the state folder** (§5.7) when step 5 of the delivery order has shipped; before that it is skipped.
7. **Remove the old engine** last, and only the files the old manifest names; a folder the project also uses (`skills/`, `workflows/`, `rules/`) loses only those files and is removed only if left empty.
8. **Verify**: integrity check and the pre-flight run; print the result, the new command form (`/magicspec <command>`), and a commit suggestion (not executed).

**Arguments and the state folders (engine 3.0.1).** `migrate` reads `--apply` and `--host` through the shared grammar (`--host=x` and `--host x`; a value-less `--host` is an error) and validates the host names at the plan, before anything is written (it used to validate after the backup, and ignored the space spelling). When both state folders exist, an **empty** new one counts as absent and is replaced by the rename; one that holds files is somebody's work, so the command stops, lists what it holds and names the one action that unblocks it — move the new folder aside (for example to `{state folder}-aside/`) and run `--apply` again; it never merges into or deletes a state folder (before the fix the recommended command, `--apply`, stopped with the same message, and emptying the folder did not help). When nothing is left to move, rename or remove, the run prints `Migration complete` and lists the old-engine files it kept because they differ from the old manifest, instead of presenting the plan again on every run.

Because the new tree is installed and verified before the old is removed, the project is never left with neither (SP-10). A step that fails stops the run and says which step; the next run resumes from the filesystem. Supported source: 2.x. Earlier layouts get a message naming the last release that migrates them. As built: `scripts/migrate.js` in the skill folder; until it has run, every other command of an unmigrated project stops with the same instruction, so no second, empty state folder is created beside the old one.

### 5.7 State Folder Rename

The name is the single constant of `l2-skill-layout.md` §5.3. At the rename step: the constant changes; the shipped text is edited in one pass guarded by a residue search that must find no occurrence of the old name outside the migration's own detection code and the history; `workspace.json` entries equal to the old name are rewritten by the migration; and an engine that finds both folders stops with one recommended path (finish or revert the migration) instead of choosing. The rename is a filesystem rename in the same volume, atomic per project.

## 6. Implementation Notes

1. Fixtures: an installation in a `.agents/skills` shape, in a `.claude/skills` shape, and as a linked skill folder outside the project; each runs `init`, a workflow subcommand from a subdirectory, and `remove`.
2. Migration fixtures are real snapshots of 2.x projects (a fresh init, a project with a modified engine file, one with its own `skills/` folder, one with an interrupted run); each fixture runs the migration twice and asserts the second run changes nothing.
3. The harness asserts router-to-folder parity, projection staleness detection in both directions, that `init` writes no command entry and removes a retired one, and that no shipped text prints the colon spelling.
4. Order: `init` projections and the rule rename first (they need no migration).
5. Declared supersessions (`l1-coherence-check.md` CH-9): the command-entry branch of `lib/hosts.js` and of `init`, `remove`, `migrate` and `refreshProjections`; `build-plugin` with its cases; the host table and the slash-command section of the README and `docs/distribution.md`; the `.gitignore` lines `init` prints, which drop the command folders. Also: the command-entry refresh named in the Engine Meta Update Flow of [l2-engine-automation.md](l2-engine-automation.md); the engine's entries under `.agents/workflows/magicspec/` in [l2-agent-surface.md](l2-agent-surface.md); the typed form `/magicspec:{command}` in [l2-workflow-wrappers.md](l2-workflow-wrappers.md). The engine's own repository keeps its maintenance entries (`skills/magicspec-dev/`) until a decision covers them.

## 7. Drawbacks & Alternatives

- **Plugin channel** — retired 2.0.0: it was the only way to a registered `/magicspec:<command>` namespace without project files, but that namespace is the second printed form the owner removed (§2). `[MODIFIED]`
- **Command entries kept opt-in** (`init --commands`) — rejected by the owner on 2026-10-30 in favour of removal.
- **Substituting the skill's location into the rule** would let a cold session run the executor without loading the skill. Rejected: it breaks SP-4's identical wording, makes the projection differ per install, and fails silently when the folder moves; the cost of loading the router on a cold start is one small file.
- **Migration inside the old engine** (shipping an upgrade script in 2.x) was rejected: users replace the engine by archive, so the script that runs is the new one.
- **Alias entries for the old names** are a one-line generator change if the assumption in §2 proves wrong.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[RULE-SRC]` | `rules/magic.md` | The present rule text the new source starts from |
| `[RELEASE]` | `.github/workflows/release.yml` | The workflow whose archive composition changes |
| `[DIST]` | `docs/distribution.md` | The user-facing host and install reference (C17) |
| `[HOSTDOCS]` | `code.claude.com/docs/en/{skills,memory,plugins,plugins-reference}` (skills and plugins-reference read again 2026-10-30); `learn.chatgpt.com/docs/{build-skills,custom-prompts,agent-configuration/agents-md}`; `qwenlm.github.io/qwen-code-docs/en/users/features/{skills,commands,rules,memory}` | The host documentation the verified table was read from (2026-10-28) |
| `[HOOKS]` | `.magic/scripts/install-hooks.js` | Present hook writer and its ownership rules |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 2.0.0 | 2026-10-30 | Agent | **One command surface** (origin `user-stated`: the owner's decision of 2026-10-30 to remove the wrappers): S2 (host command entries) and S3 (the plugin) are retired, S1 the router is the only surface; §5.2 records why no entry is needed per host and what choice form each host has for the interactive help; §5.1 reports an entry left by an earlier install as `PROJECTION_RETIRED`, and `init` removes it; §5.3, §5.5 and §5.6 write no entry; the forms printed are `/magicspec <command>`. Two forecasts: the plugin is retired with the entries; the dotted names stay retired. Amendment Rule: `Stable → RFC`, re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.7.0 | 2026-10-29 | Agent | **§5.3 Agent-assisted installation contract** (origin `user-stated`: the owner's list of 2026-10-29): the README install prompt checks the runtime, detects an installed engine and routes a 2.x layout to `/magicspec:migrate`, gives fetch commands for both shells, verifies the placed folder with `update-engine-meta --check`, stops on an `init` failure and ends on `/magicspec:help`. Amendment Rule: `Stable → RFC`, re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.6.0 | 2026-10-29 | Agent | Deployment of a simulation pass. **§5.3**: `init` prints the `.gitignore` lines and the vendoring `.gitattributes` line and records the hook installer's own reason; the marker wording matches what is built (a marker that names what the file is, no source file or version); `remove` refuses what it does not read before it touches anything. **§5.6**: the shared flag grammar and early host validation, the empty-or-occupied rule for a new state folder beside the old one with its one unblocking action, and a finished-migration message. Specification changed together with the code; cases named in [l2-test-suite.md](l2-test-suite.md). |
| 1.5.0 | 2026-10-28 | Agent | Recorded as built by step 5. **Migration** is the shipped subcommand `migrate` (dry run by default, `--apply` to execute): it reads the filesystem, backs up what it removes into a dated folder, installs the projections and the hook, renames the state folder and rewrites the `workspace.json` entries that name it, removes the old engine last, and verifies; a file the old manifest names that differs is reported `ENGINE_FILE_MODIFIED` and kept; without the old manifest no file of the engine folder is removed (`ENGINE_MANIFEST_MISSING`); a layout older than 2.x is refused with the way forward. **The unmigrated project**: the executor stops every other command on a project that still has the earlier state folder (judged by its `workspace.json` or `INDEX.md`, so design assets under that name do not count), and with both folders present it names one path; the earlier name is one constant, `LEGACY_STATE_DIR_NAME`. **The archive**: `scripts/archive-composition.js` lists what goes in and checks the finished archive from the same rule; the release workflow builds from the list and runs the check. Status reverted `Stable → RFC` (Amendment Rule, minor) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 1.4.0 | 2026-10-28 | Agent | Recorded as built: `refreshProjections` (the C14 write branch rewrites projections that exist and have fallen behind, removes an entry whose command left the router, creates none) and the rule that a file reached through two hosts' folders is one projection; the repository's own projections are written by `init --host=claude,codex`, the Codex pointer block sits in `AGENTS.md`, and the maintenance init scripts call `init --host` instead of linking files; the README carries the verified host table, the install prompt and the removal command. |
| 1.3.0 | 2026-10-28 | Agent | Decisions taken while building the projections: the staleness warning is `PROJECTION_STALE` and covers the rule copy, the pointer block and the command entries; `init --host` validates its sources before writing; `remove` has a dry run, deletes the hook only when marked, keeps the engine folder inside the engine's own repository and outside the project, and prints the path when the platform keeps it locked; the plugin build copies the engine folder in, keeps command skills out of the model's list and refuses a folder that is not its own. |
| 1.2.0 | 2026-10-28 | Agent | The host table is verified against the three hosts' documentation and rewritten from it: skill, rule and command locations, the colon namespace from a command subfolder (no plugin needed), `.agents/skills` serving Codex and Qwen Code, no per-project command entry for Codex, the pointer-line form of the rule for Codex (shared 32 KiB budget), and what the documentation does not state. Both `TBD` markers are resolved; the plugin is an optional channel. |
| 1.1.0 | 2026-10-28 | Agent | The release cut is an owner decision, no longer a forecast: one release, 3.0.0, for steps 1 to 5; nothing ships earlier as 2.x. |
| 1.0.0 | 2026-10-28 | Agent | Initial draft: always-on rule projection, three command surfaces and the host table, installation and removal, update, release archive, the resumable 2.x migration, the state-folder rename. Post-Update Review: spec-critic PASS, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
