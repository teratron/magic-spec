# Engine Finalization Library

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Internal helper library (`scripts/lib/`) that implements the finalization protocol — automatic version bumps, CHANGELOG entries, commit message suggestions, phase archival, and git utilities. These modules are invoked exclusively by `finalize.js` via `executor.js finalize`.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent concept defining core engine architecture.
- [l2-engine-automation.md](l2-engine-automation.md) — Covers the top-level automation scripts that consume this library.

## 1. Motivation

The finalization protocol (§3 of `rules/MAGIC.md`) requires several coordinated writes across version files, CHANGELOG, and phase archives. Rather than embedding this logic in `executor.js`, it is decomposed into focused single-responsibility modules in `scripts/lib/`.

## 2. Library Modules

| Module | Responsibility |
| :--- | :--- |
| `changelog-writer.js` | Appends Keep-a-Changelog entries to root `CHANGELOG.md`. |
| `commit-suggester.js` | Generates Conventional Commits message from finalization context. |
| `git-utils.js` | Read-only git helpers: diff detection, staged-file enumeration, mtime queries. |
| `phase-archiver.js` | Detects `status: Done` phase files and moves them to `archives/tasks/`; rewrites `TASKS.md` link references. |
| `project-version.js` | Reads and writes `.design/.version`; computes next semver bump (major/minor/patch). |
| `significance.js` | Evaluates whether changed artifacts fall within the whitelist that triggers a version bump. |

## 3. Invocation Contract

All modules are internal — they export functions consumed only by `finalize.js`. No workflow or spec file should reference individual `lib/` modules directly. The public API is:

```plaintext
executor.js finalize --workflow=<spec|task|run|rule> [--dry-run] [--no-bump] [--no-changelog] [--no-commit-msg]
```

## 4. Opt-Out Mechanism

Controlled by `MAGIC_FINALIZE=0` (env) or `finalization.enabled: false` in `workspace.json`. When disabled, all `lib/` modules are skipped and `executor.js` exits with `⏭️ No significant changes detected`.

## Canonical References

| Path | Role |
| :--- | :--- |
| `.magic/scripts/lib/changelog-writer.js` | CHANGELOG append logic |
| `.magic/scripts/lib/commit-suggester.js` | Commit message generation |
| `.magic/scripts/lib/git-utils.js` | Read-only git helpers |
| `.magic/scripts/lib/phase-archiver.js` | Phase archival and TASKS.md rewrite |
| `.magic/scripts/lib/project-version.js` | `.design/.version` semver management |
| `.magic/scripts/lib/significance.js` | Significance whitelist evaluation |

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-05-07 | Agent | Initial Stable version. Covers the scripts/lib/ finalization helper library introduced in v2.1.0. |
