---
description: Brings a project's derived state back in line with its sources — registry counts, the rule projection and host copies, the graph and wiki, live-memory progress, declared version anchors and registered documentation blocks — and reports what needs a judgement instead of settling it. Use when the user asks to sync, refresh or bring derived files up to date, after replacing the skill folder with a new release, or after editing specifications or documents outside the workflows.
---

# Sync Workflow

Recomputes every piece of state that is fully computed from other files and rewrites it only where it differs. A difference that needs a judgement is listed with the one command that resolves it and left as it is. A second run with nothing changed writes nothing. The pass is one script: this body runs it and relays its report; it computes nothing itself.

**Contents:**

- Entry
- Core Invariants (Mandatory)
- Steps
- Sync Completion Checklist
- Handoffs

## Entry

**Triggers:** *"Sync"*, *"Sync the project"*, *"Bring derived state up to date"*, *"Refresh the projections"*, *"Update the version anchors"*, *"Sync the docs"*.

**Trigger:** `/magicspec sync [argument]`. Arguments:

- *(empty)* — every area, every registered workspace
- `{area}` — that area only: `registry`, `state`, `projections`, `versions`, `docs` or `graph`
- `{workspace}` — every area, that workspace
- `--dry-run` — with any of the above: the same computation, every write listed, nothing written

Examples: `/magicspec sync`, `/magicspec sync projections`, `/magicspec sync {workspace}`, `/magicspec sync --dry-run`.

| Area | Source | Derived state written |
| --- | --- | --- |
| `registry` | specification files, workspace registries | the specification count of each workspace row of the global registry, and a row for a registered workspace the table lacks |
| `state` | task ledger, phase workbooks | live memory's progress counters |
| `projections` | the installed skill folder | the always-on rule projection and the managed block of each host |
| `versions` | the project's version file | the anchors the project declared in `workspace.json` |
| `docs` | the sources the project registered | the registered documentation blocks, between their markers only |
| `graph` | specifications, registries | the wiki of the specification graph, then the artifact index |

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; the usual arguments here are an area, a workspace or a flag, which are names and run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5).

## Core Invariants (Mandatory)

1. **Derived state only (SY-1)**: the script writes only what is fully computed from other files. It never writes a requirement, a specification's version or status, a rule, a task's state, a plan, a decision or the `**Engine Version:**` snapshot, and it never writes inside the skill folder.
2. **Disagreement is reported, not settled (SY-2)**: a specification header that differs from its registry row, a registered file missing from the disk, a registered block whose source is missing, a failed engine integrity check — each is listed with its place and the one command that resolves it. The run continues with the rest and changes nothing at that place.
3. **Idempotent and previewable (SY-3, SY-7)**: a value is rewritten only when its recomputed content differs, and `--dry-run` lists every write without making one.
4. **No deletion (SY-5)**: a derived file that no source produces any more is listed with the command that removes it; this workflow removes nothing.
5. **No finalization**: the pass bumps no project version and writes no changelog entry — what it wrote is its own report. Do not run `finalize`.
6. **Context**: apply [context.md](../references/context.md); when the invocation names a registered workspace, run `node scripts/executor.js resolve-workspace --command sync --workspace {name}` and print its `Narration:` line once. With no workspace named, every registered workspace is in scope and nothing is resolved.
7. **Auto-Init**: if `.magicspec/` is missing, there is nothing to synchronize: say so in one line and end.

## Steps

1. **Run**: `node scripts/executor.js sync [{area} | {workspace}] [--dry-run]`.
   - A word that is an area runs that area; a word that is a registered workspace limits the run to it; any other word exits 1 listing the areas and the workspaces. A workspace named like an area is reached with `--workspace {name}`.
   - The areas run in the order registry, state, projections, versions, docs, graph, so that the wiki and the index see what the others wrote.
   - A failed engine integrity check skips `projections` only and is listed with the restore command.
2. **Relay the report verbatim** in a fenced block: the counts line, one line per write, disagreement and stale file, and the `Next:` line the script prints. With nothing to write and nothing to report the report is one line.
3. **End at the report.** The next step is the one the report names: the command of the first disagreement or stale file, else the step live memory records. It is named, never started, and a disagreement is never settled by this workflow.

## Sync Completion Checklist

```
Sync Checklist
  ☐ The pass ran as one script call; the body computed nothing and wrote nothing itself
  ☐ The report was relayed verbatim, once; a clean run printed one line
  ☐ A disagreement or a stale file was reported with its command and left as it was; nothing was deleted
  ☐ No finalize, no project version bump, no changelog entry; the engine-version snapshot untouched
  ☐ Under --dry-run no byte of the project changed
  ☐ One stage: the next command was named with its reasoning demand and not started
  ☐ Engineer Posture (C25): no question was asked; Decision Autonomy (C27): forks resolved as [DR] one-liners
```

## Handoffs

Where this workflow may hand over, and when:

- **Reconcile a specification** → `/magicspec spec`: a specification header that disagrees with its registry row. Condition: `header_drift`.
- **Audit a registry** → `/magicspec analyze`: a registered file missing from the disk, a specification file no row registers, a registry that is missing. Condition: `registry_drift`.
- **Continue the work** → the step live memory records, when nothing needs a judgement.
