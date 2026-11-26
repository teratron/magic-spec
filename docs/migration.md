# Migrating a 2.x Project to 3.0

3.0 ships the engine as one skill, `skills/magicspec/`, and renames the state folder from `.design/` to `.magicspec/`. A project on 2.x keeps working until it is migrated, and the migration is one resumable command.

This page has a second, separate move: a workspace of a 3.x project to the 4.0 document set, in [From 3.x to 4.0](#from-3x-to-40). A 2.x project makes the first move before it.

## What changes

| 2.x | 3.0 |
| --- | --- |
| `.magic/` (engine, scripts, templates, roles) | the skill folder, in the host's skills folder |
| `workflows/magic.*.md`, `skills/magic-*`, `rules/magic.md` and copies under `.claude/`, `.agents/`, `.codex/`, `.qwen/` | the router `SKILL.md` and `CONSTITUTION.md`; no per-command entry |
| commands `/magic.spec`, `/magic.task`, ... | `/magicspec spec`, `/magicspec plan`, `/magicspec task`, ... (`/magicspec help` lists them) |
| state folder `.design/` | `.magicspec/` (its contents are unchanged) |

Your specifications, plan, tasks, rules and state keep their content. The migration updates the entries of `workspace.json` that equal the old folder name and rewrites the earlier command and folder names (`/magic.spec`, `.design/`, `.magic/`) in your SDD artifacts, as described below.

## Steps

1. Install the 3.0 skill folder into your host's skills folder (see the README). Do not delete anything yet.
2. Type `/magicspec migrate`. It shows the plan (nothing changes yet), asks one question — apply it? — and on a yes runs the apply step.

   Where the host cannot invoke the skill, run the same two steps by script. See the plan first:

   ```bash
   node <skills folder>/magicspec/scripts/executor.js migrate
   ```

   then apply it:

   ```bash
   node <skills folder>/magicspec/scripts/executor.js migrate --apply
   ```

   Add `--host=claude,codex,qwen` to project for specific hosts; without it the hosts found in the project are used.

Until the migration is applied, every other command stops with the same instruction and creates nothing, so a half-installed project cannot grow a second, empty state folder.

## What `--apply` does

In this order, each step reading the filesystem and never a log:

1. Verifies the old engine against its own manifest. A file that differs is reported as `ENGINE_FILE_MODIFIED` and kept: it is your change.
2. Backs up every file it is about to remove into `magicspec-migration-backup-<date>/`.
3. Installs the new projections for each host (the rule and the skill link; no command entry is written) and the pre-commit hook.
4. Renames `.design/` to `.magicspec/`.
5. Rewrites the earlier vocabulary in your SDD artifacts: `/magic.<command>` becomes `/magicspec <command>`, `.design/` becomes `.magicspec/` and `.magic/` becomes the engine folder's present path. A rewritten specification gets a patch version and a history row, and its registry row follows. Document History and Recent Decisions sections, archives, retrospectives and changelogs are history and stay as they are; the constitution is reported, not rewritten (amend it with `/magicspec rule`); a product file that still uses the earlier names is listed and not edited. Every changed file is backed up first and listed with a revert hint.
6. Removes the old engine last: only the files the old manifest names and the wrappers by their names. Folders you also use (`workflows/`, `skills/`, `rules/`) lose only those files and are removed only if left empty; your own files there stay.
7. Runs the pre-flight and prints the result, the new command form and a commit suggestion. Nothing is committed for you.

Because the new engine is installed and checked before the old one is removed, the project is never left with neither.

## Interruption and re-running

The command is safe to run again after any interruption: it detects what is already done. A second run on a finished project prints that there is nothing to migrate.

If both `.design/` and `.magicspec/` exist, the command looks at `.magicspec/`. An empty one is treated as absent and is replaced by the rename. One that holds files is somebody's work: the command stops, lists what it holds and names the one action that unblocks the run — move `.magicspec/` aside (for example rename it to `.magicspec-aside/`), then run `--apply` again. It never merges into or deletes a state folder, and it never deletes the old one.

When nothing is left to move, rename or remove, a run prints `Migration complete` and lists the old-engine files it kept because they differ from the old manifest (you changed them); delete `.magic/` yourself once you have reviewed them.

## Not supported

Only the 2.x layout is migrated. A project on 1.x must first be brought to the last 2.x release.

## After the migration

- Add `magicspec-migration-backup-*/` to `.gitignore`, or delete the backup once you have checked the result.
- Update any script, CI step or note of your own that names `.design/`, `.magic/` or a `/magic.*` command.

## From 3.x to 4.0

The [4.0 document set](document-set.md) is a second layout of a workspace. The engine reads both, so the move is optional and made one workspace at a time; the other workspaces and the global constitution stay as they are. Move a workspace when you want each task's reading computed from addressed units instead of chosen by the builder.

Commit your work first: until the next commit, git is the way back.

### 1. See what would move

Type `/magicspec migrate --to 4` (add the workspace name when it is not the one the engine would choose). The first thing it does is a dry run, which writes nothing: each file of the workspace with its place in the new layout, the specifications that have to be split by judgement, the scenarios that have to be rewritten, and the state of `next/`, the folder the new documents are written into.

```plaintext
Migration to 4.0 of docs (dry run — nothing changes without --apply):
  INDEX.md → archives/3x/INDEX.md
  PLAN.md → plan.md
  RULES.md → rules.md
  STATE.md → memory/state.md, memory/goal.md
  TASKS.md → stack/{stack}/tasks/M{n}.md
  simulations/greeting.md → simulations/greeting.md (stays)
  specifications/l1-greeting.md → spec/{key}.md, product.md
  specifications/l2-greeting-cli.md → stack/{stack}/bind/{key}.md, profile.md, deps.md
  tasks/phase-2.md → stack/{stack}/tasks/M{n}.md
  archives/ → archives/ (stays)
  split by the reverse mode: l1-greeting.md
  split by the reverse mode: l2-greeting-cli.md
  scenario to rewrite: simulations/greeting.md S-1
next/: clean
```

By script, where the host cannot invoke the skill:

```bash
node <skills folder>/magicspec/scripts/executor.js migrate --to 4 --workspace <name>
```

### 2. Write the new documents

The new set is not produced by transforming text. When `next/` is absent or the checker has findings in it, the run creates the folder, ends there and names `/magicspec analyze first-time {workspace}`. That command writes the set into `next/` from your code, with the 3.x specifications as a source beside it. A requirement it cannot observe becomes an `- Open:` line: answer it, or correct the finding by hand, until the dry run reports `next/: clean`.

### 3. Answer the one question and apply

Run `/magicspec migrate --to 4` again. With a clean `next/` it asks once: move this workspace, or not now. On *not now* nothing changes and both trees stay. On a yes it applies the move, which by script is the command above with `--apply` added:

1. the 3.x files go to `archives/3x/` of the workspace;
2. the new documents move out of `next/` into the workspace, and the empty `next/` goes;
3. the workspace's row in `.magicspec/INDEX.md` stops linking a registry the workspace no longer has;
4. `"format": "4"` is set on the workspace in `workspace.json`, last.

The workflow then records as built each milestone whose observation holds on your code, lists the scenarios to rewrite and names `/magicspec status` as the next step.

### What stays where

| Part | After the move |
| --- | --- |
| `archives/` of the workspace | unchanged; the 3.x files join it under `archives/3x/` |
| `simulations/` | unchanged; a scenario that cites a 3.x specification is listed to be rewritten |
| the other workspaces, `.magicspec/RULES.md` | unchanged |
| your code | unchanged |

### An interrupted move

The apply step reads where the files stand, so running it again finishes the same move. Until it is finished, every other command on the workspace stops and writes nothing:

```plaintext
HALT: The move of docs to 4.0 was started and not finished. Run `/magicspec migrate --to 4` (by script: `node .agents/skills/magicspec/scripts/executor.js migrate --to 4 --apply`) to finish it.
```

The graph, the wiki and the search over your design documents leave such a workspace out until then.

### Going back

Before you commit the result:

1. `git restore` on the workspace folder, `.magicspec/workspace.json` and `.magicspec/INDEX.md` brings the 3.x files back.
2. Delete the workspace's `archives/3x/`. Its copies are untracked and `git restore` leaves them; while the folder holds a file and the format is not set, every command reads the move as unfinished and stops.
3. The files of the new set stay untracked beside the 3.x files, for you to keep or delete.
