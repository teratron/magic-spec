# Magic Spec Distribution: User vs Developer

This document describes which files and tools are included in Magic Spec for regular users versus engine developers.

## 1. User Bundle

The user bundle is one folder, `skills/magicspec/`, distributed through GitHub Releases. Download `magic-spec-vX.Y.Z.zip`, extract it, and copy the folder into your host's skills folder. The legacy npm and PyPI packages are frozen at `1.5.207` and are no longer part of the current distribution model.

### 1.1. The Skill Folder (`skills/magicspec/`)

| Path | Description |
| --- | --- |
| `SKILL.md` | The router: the command grammar `magicspec <command> [args]`, one selection line per command, and a pointer to the workflow body. |
| `AGENT-RULES.md` | The source of the always-on rule (engine upgrade detection, graph use, finalization, archival, replan, containment, decision posture, bug reporting, the cold-context resume check). |
| `workflows/` | One body per command: `spec`, `task`, `run`, `analyze`, `rule`, `status`, `graph`. |
| `references/` | Shared modules the bodies name: `context`, `init`, `retrospective`. |
| `roles/` | The role cards the workflows activate. |
| `templates/` | File scaffolds for the state folder. |
| `scripts/` | The executor and its subcommands (`executor.js`, `check-prerequisites.js`, `init.js`, `finalize.js`, and the rest). |
| `.version`, `.checksums` | The engine version and the integrity manifest of every other file in the folder. |

Every path in the folder is relative to the folder itself, so one copy works wherever a host puts it, and a link to it works the same as the folder.

### 1.2. What `init --host` Generates

Whatever must exist outside the folder for a host to find it is generated from it, by one command, and carries a marker line that says so:

| Generated file | For | Source |
| --- | --- | --- |
| `<host>/rules/magicspec.md` | Claude Code, Qwen Code | a byte copy of `AGENT-RULES.md` |
| a managed block in `AGENTS.md` | Codex | one line pointing at `AGENT-RULES.md` |
| `<host>/commands/magicspec/<command>.md` | Claude Code, Qwen Code | the router's command table |
| `<host>/skills/magicspec` | any host that needs its own skills folder | a link to the skill folder |

A generated file that differs from its source is reported as `PROJECTION_STALE`, with `init --host=<name>` as the remedy. A file at one of these paths that carries no marker belongs to you and is never overwritten. `remove` deletes exactly the marked files and the links, and leaves your `.magicspec/` workspace untouched.

## 2. Choosing Your Host

The host table was read from each host's own documentation and is the one place to correct if a host changes:

| Host | Skills (project) | Always-on rule | Command entries |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/magicspec` | `.claude/rules/magicspec.md` | `.claude/commands/magicspec/<command>.md` gives `/magicspec:<command>` |
| Codex | `.agents/skills/magicspec` | pointer block in `AGENTS.md` | none per project: use `$magicspec <command>` through the router |
| Qwen Code | `.agents/skills/magicspec` or `.qwen/skills/magicspec` | `.qwen/rules/magicspec.md` | `.qwen/commands/magicspec/<command>.md` gives `/magicspec:<command>` |

> [!NOTE]
> The command namespace needs no plugin: a subfolder of the command folder is the colon namespace. A Claude Code plugin is an optional distribution channel built from the same folder (`build-plugin --out <dir>`); it adds marketplace distribution and updates, not a second engine.

## 3. Dev Instruments

These files are kept in the main repository for maintainers. They are not part of the release archive.

### 3.1. Maintenance scripts (`scripts/`)

- `generate-checksums.js` — builds the folder's `.checksums`.
- `sync.js` — the lifecycle pipeline: engine metadata, version anchors, link validation, project metadata, documentation.
- `sync-docs.js`, `sync-manifests.js`, `sync-engine-snapshot.js`, `update-project-meta.js` — the steps of that pipeline.
- `validate-hardlinks.js` — checks the link inventory of the repository.
- `mutation-check.js` — proves that a harness case fails without the fix it guards.
- `tests/engine.js` — the script harness.

### 3.2. Service Workflows

- `magicspec-dev:test.md`, `magicspec-dev:sync.md` — maintenance commands, under `.agents/`.

## 4. Internal Repository Files (Maintainer)

These files are **never distributed** to end users. They exist only in the main `magic-spec` repository.

- `.magicspec/` — the engine's own SDD workspace (specifications, plan, tasks, rules).
- `scripts/`, `tests/`, `package.json`, `skills/magicspec-dev/` — maintenance scripts, the harness, the repository manifest and the maintenance workflows.
- `.agents/` — maintainer-facing development workflows and skills.

> [!TIP]
> This separation keeps user projects clean from the engine's "meta-logic", providing only the folder and what is generated from it.
