# Migrating a 2.x Project to 3.0

3.0 ships the engine as one skill, `skills/magicspec/`, and renames the state folder from `.design/` to `.magicspec/`. A project on 2.x keeps working until it is migrated, and the migration is one resumable command.

## What changes

| 2.x | 3.0 |
| --- | --- |
| `.magic/` (engine, scripts, templates, roles) | the skill folder, in the host's skills folder |
| `workflows/magic.*.md`, `skills/magic-*`, `rules/magic.md` and copies under `.claude/`, `.agents/`, `.codex/`, `.qwen/` | the router `SKILL.md` and `AGENT-RULES.md`; no per-command entry |
| commands `/magic.spec`, `/magic.task`, ... | `/magicspec spec`, `/magicspec task`, ... (`/magicspec help` lists them) |
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
