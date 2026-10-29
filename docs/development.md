# Developing the Engine

This repository is the engine's own source, and it builds itself: its SDD workspace (`.magicspec/`) specifies the engine, and the engine's commands plan and execute changes to it. This page is for someone who wants to change the engine; using it is in the [README](../README.md).

## What lives where

| Folder | What it is | Ships to users |
| --- | --- | --- |
| `skills/magicspec/` | The engine: router, workflows, references, roles, templates, scripts, the always-on rule, version and manifest | Yes |
| `scripts/`, `tests/`, `skills/magicspec-dev/` | Maintenance scripts, the regression harness, the maintenance skill | No |
| `.magicspec/` | The specifications and plan of the engine itself | No |

## First run

Node.js 18 or newer is required (development and CI use the current LTS). Nothing needs to be installed or linked to run the harness:

```bash
git clone https://github.com/teratron/magic-spec.git
cd magic-spec
npm test        # node --test tests/engine.js — about two minutes
```

To work with the engine's own commands in an agent session, create the host links and projections once (the Windows script makes junctions and hardlinks, the Unix script symbolic links; pass the hosts you use):

```bash
pwsh -NoProfile -File scripts/init/setup_windows.ps1 claude codex     # Windows
bash scripts/init/setup_unix.sh claude codex                          # Unix
```

## After any change inside `skills/magicspec/`

Run C14 before anything else; it bumps the patch version, regenerates the integrity manifest, refreshes the host projections that exist and the engine version snapshot in the registry:

```bash
node skills/magicspec/scripts/executor.js update-engine-meta
```

Then run the harness. A change to a shipped script that adds, renames or drops an option also changes its entry in `skills/magicspec/scripts/lib/commands.js` (the command table for the engine's scripts) or `scripts/cli-guard.js` (the table for the maintenance scripts); the harness compares each table with its scripts' source and fails when they differ.

## Commands

Every command takes `--help`, which prints its usage and writes nothing, and refuses an option it does not read before it touches anything:

```bash
node skills/magicspec/scripts/executor.js --help            # the list of commands
node skills/magicspec/scripts/executor.js remove --help
node scripts/sync.js --dry-run                              # preview the maintenance sync
```

## Releasing

`node scripts/release.js` prints the plan and what blocks it, and changes nothing. `node scripts/release.js --yes` publishes: the QA gate, C14 and the sync, one release commit of what they changed, the tag, and a push of the current branch and the tag. The tag push starts the public release workflow, so run it only when you mean to publish; the working tree must be clean and `CHANGELOG.md` must hold an entry for the version.
