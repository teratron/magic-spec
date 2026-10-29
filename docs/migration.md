# Migrating a 2.x Project to 3.0

3.0 ships the engine as one skill, `skills/magicspec/`, and renames the state folder from `.design/` to `.magicspec/`. A project on 2.x keeps working until it is migrated, and the migration is one resumable command.

## What changes

| 2.x | 3.0 |
| --- | --- |
| `.magic/` (engine, scripts, templates, roles) | the skill folder, in the host's skills folder |
| `workflows/magic.*.md`, `skills/magic-*`, `rules/magic.md` and copies under `.claude/`, `.agents/`, `.codex/`, `.qwen/` | the router `SKILL.md`, `AGENT-RULES.md` and generated entries (`/magicspec:<command>`) |
| commands `/magic.spec`, `/magic.task`, ... | `/magicspec:spec`, `/magicspec:task`, ... |
| state folder `.design/` | `.magicspec/` (its contents are unchanged) |

Your specifications, plan, tasks, rules and state are not rewritten. Only the entries of `workspace.json` that equal the old folder name are updated.

## Steps

1. Install the 3.0 skill folder into your host's skills folder (see the README). Do not delete anything yet.
2. See the plan. Nothing changes:

   ```bash
   node <skills folder>/magicspec/scripts/executor.js migrate
   ```

3. Apply it:

   ```bash
   node <skills folder>/magicspec/scripts/executor.js migrate --apply
   ```

   Add `--host=claude,codex,qwen` to project for specific hosts; without it the hosts found in the project are used.

Until step 3 is done, every other command stops with the same instruction and creates nothing, so a half-installed project cannot grow a second, empty state folder.

## What `--apply` does

In this order, each step reading the filesystem and never a log:

1. Verifies the old engine against its own manifest. A file that differs is reported as `ENGINE_FILE_MODIFIED` and kept: it is your change.
2. Backs up every file it is about to remove into `magicspec-migration-backup-<date>/`.
3. Installs the new projections for each host (the rule, the command entries, the skill link) and the pre-commit hook.
4. Renames `.design/` to `.magicspec/`.
5. Removes the old engine last: only the files the old manifest names and the wrappers by their names. Folders you also use (`workflows/`, `skills/`, `rules/`) lose only those files and are removed only if left empty; your own files there stay.
6. Runs the pre-flight and prints the result, the new command names and a commit suggestion. Nothing is committed for you.

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
