---
description: Moves a project from an earlier engine layout to this skill folder, or one 3.x workspace to the 4.0 document set — a dry run, one consent question, then the apply step.
---

# Migrate Workflow

Guides the move of a project from the 2.x layout (the engine folder, the command wrappers and the earlier state folder) to this skill folder: the plan as a dry run, one consent question, then the apply step. The work itself is the `migrate` subcommand of the executor; this workflow runs it in that order and reports. With `--to 4` it moves one 3.x workspace to the 4.0 document set instead (§The Move to 4.0).

**Contents:**

- Entry
- Core Invariants (Mandatory)
- Steps
- The Move to 4.0
- Migrate Completion Checklist
- Handoffs

## Entry

**Triggers:** `/magicspec migrate`, *"Migrate the project"*, *"Upgrade from 2.x"*, *"Move to the new layout"*, or the stop of any other command on an unmigrated project, which names this command.

**Trigger:** `/magicspec migrate` for the move from the earlier layout, which takes no argument; `/magicspec migrate --to 4 [workspace]` for the move of one workspace to 4.0 (§The Move to 4.0). The `--apply` step is never typed by the user: the workflow runs it after the consent question.

**Scope:** the executor's `migrate` subcommand reads the filesystem and never a log, so it can be run again after any interruption and picks up where the files stand. It backs up every file it removes, installs the new projections, renames the state folder, rewrites the earlier command and folder names in the SDD artifacts it may edit, and removes the old engine last, only the files the old manifest names.

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; arguments that are only names, flags or paths run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5).

## Core Invariants (Mandatory)

1. **Dry run first**: nothing changes until the user has said yes to the plan the dry run printed.
2. **One consent question (E1)**: removing and renaming files is a destructive action, and this is the single consent point. Exactly one question, at most three fixed options, the winner of the consequence forecast marked as the default with its one-line forecast. It is asked only when the plan removes or renames something; a project that is already migrated gets the finished message and nothing else.
3. **No project context**: this workflow runs before the project is on the new layout, so it does not load the context chain and does not initialize the project. Auto-Init would create the new state folder beside the old one, which is the very fault the migration removes. It is exempt from the engine-upgrade line of the always-on rules. This invariant holds for the move from the earlier layout: a move to 4.0 runs on a project the engine already reads and chooses its workspace as §The Move to 4.0 states.
4. **Never finalizes**: neither the dry run nor the apply step calls `finalize`.
5. **The sweep edits only SDD artifacts**: the earlier command, state-folder and engine-folder names are rewritten in the specifications (patch version and a history row each, their registry row following), the plan, the task files, the registry and the live state. Document History and Recent Decisions sections, archives, retrospectives, changelogs and the constitution are never rewritten, and a product file that still uses the earlier names is reported, never edited.
6. **Files the user changed are kept**: a file of the old engine that differs from the old manifest is reported (`ENGINE_FILE_MODIFIED`) and left in place. Never delete it by hand to make the migration look complete.
7. **A stop is relayed, not worked around**: a non-zero exit prints one `HALT` line that names one recommended path. Show it verbatim and follow no other path; once the cause is fixed, `/magicspec migrate` resumes from the filesystem.

## Steps

### 1. Dry Run

Run `node scripts/executor.js migrate` and display its entire output verbatim in a fenced block.

### 2. Read the Result

- **Non-zero exit** → relay the `HALT` line as it stands and stop (Invariant 7).
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

## The Move to 4.0

Taken when the argument is `--to 4`, with or without a workspace after it; the steps below replace Steps 1 to 5. Invariants 1, 2, 4 and 7 apply, the resuming command of Invariant 7 being `/magicspec migrate --to 4 {workspace}`; Invariants 3, 5 and 6 belong to the move from the earlier layout: this move rewrites no vocabulary and removes no engine file. Invariant 1 reads here as: no 3.x file is moved before the yes; `next/` only adds files beside them. No file of the product is changed.

1. **Workspace**: choose it by the engine's chain (`references/context.md` §Workspace Resolution Chain): `node scripts/executor.js resolve-workspace --command migrate [--workspace {name}] --text "{request}"` (`--workspace` only when the invocation names a registered workspace; `{request}` is the rest of the argument, and when it is empty `--text` is left out), take its `Workspace:` line as the active workspace and print its `Narration:` line once.
2. **Dry run**: `node scripts/executor.js migrate --to 4 --workspace={active-workspace}`; display its output verbatim in a fenced block. A `HALT` line → relay it and stop. `already a 4.0 workspace` → say so in one line and stop; no question.
3. **The new set**: when the dry run reports `next/` absent or with findings, the set is not ready to move into place. Create the folder `next/` in the workspace folder when it is not there (it marks the move for the analysis), say what the dry run reported, and end the run naming `/magicspec analyze first-time {workspace}`, which writes the set into `next/`, with its demand (deep). When findings remain after that analysis, the same step applies to what is left; a finding that cannot be closed leaves the workspace on 3.x with both trees in place. When the output says a move is under way, the analysis cannot run on the workspace: report the findings, to be put right in `next/` by hand, and end the run naming this command again. In this step no question is asked and no 3.x file is moved.
4. **Ask once**: when the dry run reports `next/: clean`, or a move partly done, ask the consent question of Invariant 2 with that output as its context: *move this workspace to 4.0?*
   - **Move it (recommended)** — the 3.x files are kept under `archives/3x/` of the workspace, and a run that is interrupted continues where the files stand.
   - **Not now** — nothing changes; both trees stay.
5. **Apply**: on a yes, `node scripts/executor.js migrate --to 4 --apply --workspace={active-workspace}`; display its output verbatim. A non-zero exit → relay it and stop. While the move is unfinished every other command on the workspace stops and names it. Before it, record the move: `node scripts/executor.js checkpoint --workspace={active-workspace} --start --command=migrate --argument="--to 4"`; the apply step resumes by itself, so the record keeps only the argument, and the move from the earlier layout records nothing — its state folder does not exist yet.
6. **Record the built milestones**: for each milestone of `plan.md` whose `must` and `should` tasks have a `- Done:` line in `memory/state.md`, run its `Observed by` against the code and, only when it holds, `node scripts/executor.js mark-built M{n} --workspace={active-workspace}`; one that does not hold is an `- Open:` line there and is reported. Then `node scripts/executor.js check-docs --workspace={active-workspace}`.
7. **Report**: what moved and where the 3.x files are (`archives/3x/`, the earlier `archives/` and the scenarios of `simulations/` staying in place), the milestones recorded built and what is open, the scenarios the dry run listed to rewrite, and the revert hint: before a commit, `git restore` on the workspace folder, `workspace.json` and the global `INDEX.md` (the apply step takes the registry link out of the workspace's row) brings the 3.x files back; then delete the workspace's `archives/3x/`, whose copies stay untracked: while it holds a file and no format is set, every command reads the move as unfinished. The files of the set stay untracked beside the 3.x files. Then the next step, narrated and not asked: `/magicspec status {workspace}`. Then end the record: `checkpoint --workspace={active-workspace} --clear` — on a `HALT` before this step too.

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
  ☐ Workspace Routing: (the move to 4.0) `resolve-workspace` chose the workspace before any workspace file was read; with more than one workspace registered its line `[Workspace] {name} — {signal}. (Override: /magicspec {command} {other} …)` was printed once
  ☐ Move to 4.0 (instead of the lines above): workspace chosen by the chain; dry run verbatim; a set not ready ends the run naming the analysis, nothing moved; one question before the moves, apply only on a yes; built milestones recorded after it; next step narrated
```

## Handoffs

Where this workflow may hand over, and when:

- **Next step** → `/magicspec help`: after a successful apply, to list the commands in their present form.
- **The new set** → `/magicspec analyze first-time {workspace}`: during a move to 4.0, when `next/` is absent or has findings.
- **After the move to 4.0** → `/magicspec status {workspace}`.
