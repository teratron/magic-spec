# Rule Module: Finalization and Phase Archival

Loaded on demand from `AGENT-RULES.md` (sections 3 and 4). Paths are relative to the `magicspec` skill folder.

## 3. Finalization Protocol (Post-Workflow)

After `/magicspec spec`, `/magicspec task`, `/magicspec run`, or `/magicspec rule` complete their
main steps and **before** their Completion Checklist, run finalize. Skip for
`/magicspec analyze`, `/magicspec graph`, `/magicspec-dev:*` (read-only / system workflows).

### Procedure

1. Execute:

   ```bash
   node scripts/executor.js finalize --workflow=<spec|task|run|rule> --workspace={active-workspace}
   ```

   `--workspace` names the workspace the workflow ran for. Without it the script
   finalizes the default workspace, so an explicit workspace argument would be
   lost: significance would be judged, and `STATE.md` written, for the wrong one.

2. The script detects significant changes to whitelisted artifacts. On hit, it
   bumps `.magicspec/.version` and appends a Keep-a-Changelog entry to root `CHANGELOG.md`.
   On no hit, prints `⏭️ No significant changes detected` and exits 0.

3. **Display the entire script stdout verbatim** to the user in a fenced block.

4. If the script exits non-zero → emit a WARNING but do not block the Completion Checklist.

### Opt-Out

`MAGIC_FINALIZE=0` (env, highest precedence) · `finalization.enabled = false` in
`.magicspec/workspace.json` (project-wide) · `--dry-run` (preview) · `--no-bump`,
`--no-changelog` (per-step disable).

### Significance Whitelist

| Workflow | Paths that count |
| --- | --- |
| `/magicspec spec` | `.magicspec/{ws}/specifications/**/*.md`, `.magicspec/{ws}/INDEX.md`, `.magicspec/RULES.md`, `.magicspec/{ws}/RULES.md` |
| `/magicspec task` | `.magicspec/{ws}/PLAN.md`, `TASKS.md`, `tasks/**/*.md` |
| `/magicspec run` | `.magicspec/{ws}/TASKS.md` (status-line changes only), `STATE.md`, `archives/**`, `tasks/**/*.md` |
| `/magicspec rule` | `.magicspec/RULES.md`, `.magicspec/{ws}/RULES.md` |

### Channels

`.magicspec/{ws}/CHANGELOG.md` is `/magicspec run`'s internal phase journal (not touched
here). Root `CHANGELOG.md` is user-facing release notes — written by this protocol.

## 4. Phase Archival Automation

Completed phase files are auto-archived as part of `/magicspec run`'s finalize, to keep
active context lean.

### How it triggers

Runs **automatically** when `finalize --workflow=run` invokes `archive-phases`
internally — no extra command. Conditions: `tasks/phase-{N}.md` has `status: Done`
in YAML frontmatter **and** no remaining `- [ ]` items. The phase file is then
**moved** (rename, not copy) to `archives/tasks/phase-{N}.md`, and `TASKS.md`
link references are rewritten with the row marked `Done (Archived)`.

### Exemptions

- Any remaining `- [ ]` items, or `status` ≠ `Done` → never archived.
- Already-archived files (under `archives/tasks/`) are skipped silently.
- Project-wide disable: `archival.enabled = false` in `.magicspec/workspace.json`.

### On-demand

```bash
node scripts/executor.js archive-phases            # archive all eligible
node scripts/executor.js archive-phases --dry-run  # preview only
```
