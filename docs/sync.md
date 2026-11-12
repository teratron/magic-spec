# Sync — Bring Derived State up to Date

This document explains the Sync workflow, the command that brings everything computed from other files back in line with its sources, and tells you where it stops and a judgement begins.

## 1. Overview

Some of a project's state is never written by hand: the specification counts of the global registry, the copy of the always-on rules your coding agent loads, the specification graph and its wiki, the progress counters of live memory, a version written in more than one place, a block of documentation copied from another file. Each goes stale in a way no pipeline command repairs — after you replace the skill folder with a new release, after you edit a specification outside the workflows, after a workflow was interrupted between two writes. `sync` recomputes all of it and rewrites only what differs.

**Triggers:** *"Sync"*, *"Sync the project"*, *"Bring derived state up to date"*, *"Refresh the projections"*, *"Update the version anchors"*, *"Sync the docs"*.

**Slash command:** `/magicspec sync [area|workspace] [--dry-run]`

> **Full implementation:** `skills/magicspec/workflows/sync.md` — the engine reads this file before executing any steps.

Key Goals:

- **Derived only**: it writes what is fully computed from other files, and never a requirement, a specification's version or status, a rule, a task, a plan or a decision.
- **Honest about judgements**: where two sources disagree and a person must decide, it lists the place, the difference and the one command that resolves it, and changes nothing there.
- **Idempotent**: a second run with nothing changed writes nothing.
- **Previewable**: `--dry-run` lists every write it would make and writes nothing.
- **No deletion**: a derived file that no source produces any more is listed with the command that removes it.

## 2. The Six Areas

| Area | Source | What it writes |
| --- | --- | --- |
| `registry` | the specification files and each workspace registry | the specification count of each workspace row of the global registry, and a row for a registered workspace the table lacks. It writes no version line, no history row and no engine-version snapshot |
| `state` | the task ledger and the phase workbooks | the progress counters of live memory; a recorded goal and every hand-written section stay as they are |
| `projections` | the installed skill folder | the always-on rule copy and the managed block of each host. A failed engine integrity check skips this area only, and the report says to restore the folder from the release archive |
| `versions` | the project's version file | the anchors you declared, and nowhere else |
| `docs` | the files you registered as sources | the blocks you registered, between their markers only |
| `graph` | the specifications and the registries | the wiki, then the artifact index, and only when a page changed |

`sync` does not finalize: it bumps no project version and writes no changelog entry. What it wrote is its own report.

## 3. Arguments

| Input | Result |
| --- | --- |
| `/magicspec sync` | every area, every registered workspace |
| `/magicspec sync projections` | that area only |
| `/magicspec sync {workspace}` | every area, that workspace |
| `/magicspec sync --dry-run` | with any of the above: the same computation, no write |

A word that is an area name runs that area; a workspace named like an area is reached with `--workspace {name}`.

## 4. The Report

```plaintext
[Sync] {w} written · {u} in sync · {d} disagreements · {s} stale
  written     {area}: {file} — {what changed}
  disagree    {location} — {difference} → {the command that resolves it}
  stale       {file} — no source → {the command that removes it}
Next: /magicspec {command} — {demand} reasoning
```

With nothing to write and nothing to report it is one line: `[Sync] in sync — nothing to write, nothing to report.` Under `--dry-run` the counts line says `(dry run)` and each write reads `would write`.

A disagreement names `/magicspec spec` for a specification whose header differs from its registry row, `/magicspec analyze` for a registered file missing from the disk or a specification no row registers, and the release archive for a failed integrity check. `sync` never settles one by itself: picking a winner silently would bury an unreviewed edit.

## 5. Registering Version Anchors and Documentation Blocks

A version written in several places, and a block of documentation copied from another file, are registered in the `sync` section of `.magicspec/workspace.json`. Nothing is searched for: what is not registered is never touched.

```json
{
  "sync": {
    "versions": [
      { "file": "package.json", "json": "version" },
      { "file": "README.md", "marker": "version", "format": "v{version}" }
    ],
    "docs": [
      { "file": "docs/guide.md", "marker": "overview", "from": "docs/overview.md", "fromMarker": "overview" }
    ]
  }
}
```

- A `versions` entry names a `file` and either a `json` key path (the value is rewritten in place and the file's formatting is kept) or a `marker` (the text between the markers is replaced by `format`, `{version}` by default). The version is the one your project's version file holds.
- A `docs` entry fills the block `marker` of `file` from the project file `from`, whole, or from its own block `fromMarker`.
- A marker is a lowercase key of letters, digits and hyphens. In the file it reads `<!-- sync:version -->` … `<!-- /sync:version -->`; everything outside the pair is never touched.
- Generated content never carries a reference to the specification layer — a task identifier, a phase designator, a registry or specification file name, a path into the state folder. A source that does is reported and nothing is written.
- An entry that cannot be used (a missing file or marker, a key that is not a string or occurs twice, a path outside the project) is reported once, with its place, and the other entries still run.

## 6. In the Engine's Own Repository

The maintenance command of the same name runs this pass as its project-state step and adds the steps only that repository has: the engine metadata, the version anchor in the README, the link check and the documentation sync. See [development.md](development.md).

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.129).
