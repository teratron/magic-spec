---
name: magicspec-dev
description: Maintains the Magic Spec engine repository, with `init` to rebuild the agent links and projections, `test` to validate the engine by simulation and the regression suite, `sync` to synchronize versions, metadata and documentation, `release` to validate and trigger a release, and `fix` to carry error feedback about the engine to a verified repair. Use when working in the engine's own repository to set up the development environment, to check the engine after a change, to bring the repository's generated files up to date, to cut a release, or to work through an engine bug report or a pending feedback note, and when the user types `magicspec-dev` followed by a command.
---

# Magic Spec Maintenance

One skill, five commands, for the developer repository only. It is not part of the engine archive. Every command is a workflow in `workflows/`; this file only routes to it, and the executable parts live in the repository's `scripts/` and `tests/`.

**Paths.** Paths in this skill are relative to the repository root unless they start with `workflows/` or `references/`, which are relative to this folder.

## Commands

The grammar is `/magicspec-dev <command> [argument]`. The colon spelling `/magicspec-dev:<command>`, typed as text, is read as that command too and is never printed by this router.

| Command | What it does | Body |
| --- | --- | --- |
| `init` | Rebuilds the agent-facing links and the projections of the engine skill, per agent | `workflows/init.md` |
| `test` | Validates the engine by cognitive simulation and the regression suite | `workflows/test.md` |
| `sync` | Runs `/magicspec sync`, then the engine-only stages: engine metadata, version anchors, links and documentation | `workflows/sync.md` |
| `release` | Validates, versions and triggers a GitHub Release | `workflows/release.md` |
| `fix` | Carries error feedback about the engine — a pasted engine bug report, a pending feedback note, a failing harness case — to a verified repair | `workflows/fix.md` |

## Dispatch

1. Take the command from the first word after `magicspec-dev` (or `/magicspec-dev`); the rest is its argument.
2. Read `workflows/<command>.md` in full before doing anything else, and follow it.
3. Automation goes through the scripts the body names; do not invent scripts.
