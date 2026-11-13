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

## The toolchain

Four tools check the code. They are development dependencies of this repository (`pnpm install`); none ships, and an installed engine needs nothing but the runtime.

| Command | What it checks |
| --- | --- |
| `pnpm run lint` | Biome: formatting and lint of every `*.js` and `*.json` (Markdown and YAML are out of its scope). `pnpm run lint:fix` writes the fixes |
| `pnpm run typecheck` | The TypeScript check over the JSDoc, not strict, of the files that begin with `// @ts-check`; it changes nothing and compiles nothing. The sources stay JavaScript |
| `pnpm run audit` | Fallow on the files a change touched: dead code, duplication, complexity. The whole project: `pnpm exec fallow dead-code` |
| `npm test` | The regression harness, `node --test tests/engine.js` |

Continuous integration runs two jobs, because the tools need a recent Node (Fallow declares Node 22 or later, the root manifest Node 24 or later) while the engine's stated floor is Node 18 and the harness installs nothing: `toolchain` runs the frozen install, `biome ci`, the type check and Fallow on the current LTS line, and `harness` runs `node --test tests/engine.js` on Ubuntu and Windows on the floor and on the LTS line once `toolchain` has passed. A step is advisory (it reports and does not fail the job) until the work that makes it pass is done, and gating afterwards; Only the harness's floor entries are advisory today, the rest gate. The type check covers a set of files that only grows: a script that passes gains `// @ts-check` when you touch it, a new script starts with it, and the pragma is never removed to make a check pass.

## Commands

Every command takes `--help`, which prints its usage and writes nothing, and refuses an option it does not read before it touches anything:

```bash
node skills/magicspec/scripts/executor.js --help            # the list of commands
node skills/magicspec/scripts/executor.js remove --help
node scripts/sync.js --dry-run                              # preview the maintenance sync
```

## Maintenance commands

The repository has a second command, `/magicspec-dev <command> [argument]` (the colon spelling `/magicspec-dev:<command>` is read as text too). It is not part of the engine archive and the engine's `help` never lists it.

| Command | What it does |
| --- | --- |
| `init` | Rebuilds the agent-facing links and the projections of the engine skill, per agent. Name every agent you use: a bare run removes the managed links it does not recreate |
| `test` | Validates the engine by cognitive simulation and the regression suite |
| `sync` | Runs `/magicspec sync`, then the engine-only stages: engine metadata, version anchors, links and documentation |
| `release` | Validates, versions and triggers a GitHub Release |
| `fix` | Carries error feedback about the engine — a pasted engine bug report, a pending feedback note, a failing harness case — from report to a verified repair: the shipped `fix` triage with the engine as the product, a harness case shown to fail without the repair, C14, and every maintained release line |

## Releasing

`node scripts/release.js` prints the plan and what blocks it, and changes nothing. `node scripts/release.js --yes` publishes: the QA gate, C14 and the sync, one release commit of what they changed, the tag, and a push of the current branch and the tag. The tag push starts the public release workflow, so run it only when you mean to publish; the working tree must be clean and `CHANGELOG.md` must hold an entry for the version.
