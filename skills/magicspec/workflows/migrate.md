---
description: Moves a project from an earlier engine layout to this skill folder — a dry run, one consent question, then the apply step.
---

# Migrate Workflow

Guides the move of a project from the 2.x layout (the engine folder, the command wrappers and the earlier state folder) to this skill folder: the plan as a dry run, one consent question, then the apply step. The work itself is the `migrate` subcommand of the executor; this workflow runs it in that order and reports.

**Contents:**

- Entry
- Core Invariants (Mandatory)
- Steps
- Migrate Completion Checklist
- Handoffs

## Entry

**Triggers:** `/magicspec migrate`, *"Migrate the project"*, *"Upgrade from 2.x"*, *"Move to the new layout"*, or the stop of any other command on an unmigrated project, which names this command.

**Trigger:** `/magicspec migrate`. No argument. The `--apply` step is never typed by the user: the workflow runs it after the consent question.

**Scope:** the executor's `migrate` subcommand reads the filesystem and never a log, so it can be run again after any interruption and picks up where the files stand. It backs up every file it removes, installs the new projections, renames the state folder, rewrites the earlier command and folder names in the SDD artifacts it may edit, and removes the old engine last, only the files the old manifest names.

## Core Invariants (Mandatory)

1. **Dry run first**: nothing changes until the user has said yes to the plan the dry run printed.
2. **One consent question (E1)**: removing and renaming files is a destructive action, and this is the single consent point. Exactly one question, at most three fixed options, the winner of the consequence forecast marked as the default with its one-line forecast. It is asked only when the plan removes or renames something; a project that is already migrated gets the finished message and nothing else.
3. **No project context**: this workflow runs before the project is on the new layout, so it does not load the context chain and does not initialize the project. Auto-Init would create the new state folder beside the old one, which is the very fault the migration removes. It is exempt from the engine-upgrade line of the always-on rules.
4. **Never finalizes**: neither the dry run nor the apply step calls `finalize`.
5. **The sweep edits only SDD artifacts**: the earlier command, state-folder and engine-folder names are rewritten in the specifications (patch version and a history row each, their registry row following), the plan, the task files, the registry and the live state. Document History and Recent Decisions sections, archives, retrospectives, changelogs and the constitution are never rewritten, and a product file that still uses the earlier names is reported, never edited.
6. **Files the user changed are kept**: a file of the old engine that differs from the old manifest is reported (`ENGINE_FILE_MODIFIED`) and left in place. Never delete it by hand to make the migration look complete.
7. **A stop is relayed, not worked around**: a non-zero exit prints one `HALT` line that names one recommended path. Show it verbatim and follow no other path; once the cause is fixed, `/magicspec migrate` resumes from the filesystem.

## Steps

### 1. Dry Run

Run `node scripts/executor.js migrate` and display its entire output verbatim in a fenced block.

### 2. Read the Result

- **Non-zero exit** → relay the `HALT` line as it stands and stop (Invariant 6).
- **`Nothing to migrate`** or **`Migration complete`** → the project needs nothing more. Say so in one line, relay the list of kept files when the output has one, and stop. No question is asked.
- **A printed plan** (it lists files to remove or a folder to rename) → Step 3.

### 3. Ask Once

Ask the consent question of Invariant 2 with the plan from Step 1 as its context: *apply this plan?*

- **Apply the plan (recommended)** — the files it removes are backed up first, and the command can be run again after an interruption.
- **Not now** — nothing changes; the plan stays on screen.

A host with a choice form uses it; a host without one gets the same two options in the chat. A dismissed form is *Not now*.

### 4. Apply

On a yes, run `node scripts/executor.js migrate --apply` and display its entire output verbatim in a fenced block. A non-zero exit → relay the `HALT` line and stop. On *Not now* → say in one line that nothing changed and that `/magicspec migrate` shows the plan again.

### 5. Report

End with the outcome in plain words: what was backed up and where, which projections were installed, that the state folder was renamed, which SDD artifacts were rewritten (with the revert hint the output gives), which were left (`Not rewritten`) and which product files still use the earlier names, what was removed, any file kept as `ENGINE_FILE_MODIFIED`, and the pre-flight result. Then the next step, narrated and not asked: `/magicspec help` lists the commands in their present form. The suggested commit in the output is a suggestion; do not run it.

## Migrate Completion Checklist

```
Migrate Checklist
  ☐ Dry run shown verbatim before anything changed
  ☐ A migrated project got the finished message and no question
  ☐ At most one consent question (E1), asked only for a plan that removes or renames; apply ran only on a yes
  ☐ No project initialized, no state folder created beside the old one, no finalize
  ☐ Sweep: rewritten artifacts listed with the revert hint; history, archives and the constitution untouched; product files reported, not edited
  ☐ Files that differ from the old manifest left in place and reported
  ☐ A stop relayed verbatim with its one recommended path
  ☐ Next step narrated: /magicspec help
```

## Handoffs

Where this workflow may hand over, and when:

- **Next step** → `/magicspec help`: after a successful apply, to list the commands in their present form.
