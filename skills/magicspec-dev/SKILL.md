---
name: magicspec-dev
description: Maintains the Magic Spec engine repository, with `init` to rebuild the agent links and projections, `test` to validate the engine by simulation and the regression suite, `sync` to synchronize versions, metadata and documentation, and `release` to validate and trigger a release. Use when working in the engine's own repository to set up the development environment, to check the engine after a change, to bring the repository's generated files up to date, or to cut a release, and when the user types `magicspec-dev` followed by a command.
---

# Magic Spec Maintenance

One skill, four commands, for the developer repository only. It is not part of the engine archive. Every command is a workflow in `workflows/`; this file only routes to it, and the executable parts live in the repository's `scripts/` and `tests/`.

**Paths.** Paths in this skill are relative to the repository root unless they start with `workflows/` or `references/`, which are relative to this folder.

## Commands

The grammar is `magicspec-dev <command> [args]`, also typed `/magicspec-dev:<command>`.

| Command | What it does | Body |
| --- | --- | --- |
| `init` | Rebuilds the agent-facing links and the projections of the engine skill, per agent | `workflows/init.md` |
| `test` | Validates the engine by cognitive simulation and the regression suite | `workflows/test.md` |
| `sync` | Synchronizes engine metadata, version anchors, links, registry metadata and documentation | `workflows/sync.md` |
| `release` | Validates, versions and triggers a GitHub Release | `workflows/release.md` |

## Dispatch

1. Take the command from the first word after `magicspec-dev`; the rest is its argument.
2. Read `workflows/<command>.md` in full before doing anything else, and follow it.
3. Automation goes through the scripts the body names; do not invent scripts.
