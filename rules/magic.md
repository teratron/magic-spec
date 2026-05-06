# Magic Spec — Agent Rules

Consolidated operational rules for AI agents in projects using the magic-spec engine.
Sections are independent — apply each by its own trigger.

## 1. Engine Version Check (Local ↔ Remote)

Run once at the start of the first session per day. Compares the local engine to the
upstream release.

### Procedure

1. Read local version from `.magic/.version`.
2. Fetch the remote version from
   `https://raw.githubusercontent.com/teratron/magic-spec/master/.magic/.version`
   (timeout ≤ 3 s; on failure proceed silently).
3. If `local < remote`, display:

   > [!TIP]
   > A newer magic-spec version is available.
   > Local: `{local_version}` | Latest: `{remote_version}`
   >
   > Download the latest release: <https://github.com/teratron/magic-spec/releases/latest>
   >
   > Manual update: replace `.magic/`, `workflows/`, `skills/`, `rules/` in your project
   > with the corresponding folders from the new release archive.

4. If versions match, proceed silently.

## 2. Engine Drift Auto-Analyze (Local ↔ Snapshot)

Re-run `/magic.analyze` whenever the local engine differs from the project's last
analyzed state. Complements §1: §1 compares local against the **remote** release;
§2 compares local against the **last analyzed** snapshot in this project.

### Procedure

Run at the start of **every** `/magic.*` invocation except `/magic.analyze` (would
recurse). Trigger on **any** segment difference — `major`, `minor`, **and `patch`**;
patch releases routinely carry behavior-affecting changes.

1. Read `local_engine` from `.magic/.version`.
2. Read `snapshot_engine` from the `**Engine Version:**` field in `.design/INDEX.md`
   (missing field → treat as `unknown` and trigger analysis).
3. If `local_engine == snapshot_engine` → proceed silently.
4. On mismatch, emit this notice **before** running anything else:

   > [!WARNING]
   > SDD engine version changed: `{snapshot_engine}` → `{local_engine}`.
   > Running `/magic.analyze` first to revalidate the project against the new engine.
   > **Strongly recommended after any engine update** — even patch releases may carry
   > workflow-affecting changes.
   > Interrupt now (Ctrl+C / cancel) if you must skip, then resume the original command.

5. Auto-execute `/magic.analyze` (full scope, no arguments). On success it updates
   the `**Engine Version:**` snapshot in `.design/INDEX.md` to `local_engine` —
   this is the **only** path that updates the field; manual edits must not touch it.
6. Resume the originally requested workflow with its original arguments.

### Exemptions

- `/magic.analyze` itself (would recurse).
- Engine bootstrap before `.design/` exists — `init.md` runs first; the snapshot is
  written by the first `/magic.analyze` invocation.
- Offline / unreadable `.magic/.version` — skip silently, do not block work.

## 3. Specification Knowledge Graph

The Specification Knowledge Graph is managed by `magic.graph`.

### Auto-Use

- Before architectural / cross-module / "how does X relate to Y" / "what covers Z"
  questions, run `node .magic/scripts/executor.js build-spec-graph` (add `--json`
  for structured traversal). Read its god nodes, communities, coverage stats.
- If `.design/wiki/index.md` exists, navigate it instead of raw spec files.
- After creating or modifying any file in `.design/` during this session, run
  `node .magic/scripts/executor.js export-wiki` to refresh the graph.

### On-Demand

- `/magic.graph` — full analysis: god nodes, orphans, missing Implements,
  community detection, advisory signal.
- `/magic.graph` + *"Visualize graph"* / *"Graph HTML"* → renders
  `.design/spec-graph.html` (interactive vis.js).

## 4. Finalization Protocol (Post-Workflow)

After `/magic.spec`, `/magic.task`, `/magic.run`, or `/magic.rule` complete their
main steps and **before** their Completion Checklist, run finalize. Skip for
`/magic.analyze`, `/magic.graph`, `/magic.dev.*` (read-only / system workflows).

### Procedure

1. Execute:

   ```bash
   node .magic/scripts/executor.js finalize --workflow=<spec|task|run|rule>
   ```

2. The script detects significant changes to whitelisted artifacts. On hit, it
   bumps `.design/.version`, appends a Keep-a-Changelog entry to root `CHANGELOG.md`,
   and prints a Conventional Commits message. On no hit, prints
   `⏭️ No significant changes detected` and exits 0.

3. **Display the entire script stdout verbatim** to the user in a fenced block.

4. **HARD RULE**: The agent MUST NOT call `git commit`, `git add`, or any write-side
   git operation. The commit is always the user's decision.

5. If the script exits non-zero → emit a WARNING but do not block the Completion Checklist.

### Opt-Out

`MAGIC_FINALIZE=0` (env, highest precedence) · `finalization.enabled = false` in
`.design/workspace.json` (project-wide) · `--dry-run` (preview) · `--no-bump`,
`--no-changelog`, `--no-commit-msg` (per-step disable).

### Significance Whitelist

| Workflow | Paths that count |
| :--- | :--- |
| `magic.spec` | `.design/{ws}/specifications/**/*.md`, `.design/{ws}/INDEX.md` |
| `magic.task` | `.design/{ws}/PLAN.md`, `TASKS.md`, `tasks/**/*.md` |
| `magic.run` | `.design/{ws}/TASKS.md` (status-line changes only), `STATE.md`, `archives/**`, `tasks/**/*.md` |
| `magic.rule` | `.design/RULES.md`, `.design/{ws}/RULES.md` |

### Channels

`.design/engine/CHANGELOG.md` is `magic.run`'s internal phase journal (not touched
here). Root `CHANGELOG.md` is user-facing release notes — written by this protocol.

## 5. Phase Archival Automation

Completed phase files are auto-archived as part of `magic.run`'s finalize, to keep
active context lean.

### How it triggers

Archival runs **automatically** when `finalize --workflow=run` invokes `archive-phases`
internally — no extra command. Conditions: `tasks/phase-{N}.md` has `status: Done`
in YAML frontmatter **and** no remaining `- [ ]` items. The phase file is then
**moved** (rename, not copy) to `archives/tasks/phase-{N}.md`, and `TASKS.md`
link references are rewritten with the row marked `Done (Archived)`.

### Exemptions

- Any remaining `- [ ]` items, or `status` ≠ `Done` → never archived.
- Already-archived files (under `archives/tasks/`) are skipped silently.
- Project-wide disable: `archival.enabled = false` in `.design/workspace.json`.

### On-demand

```bash
node .magic/scripts/executor.js archive-phases            # archive all eligible
node .magic/scripts/executor.js archive-phases --dry-run  # preview only
```

### Note

The pre-commit hook issues a non-blocking notice if unarchived Done phases are
detected — reminds the user to run `/magic.run` or `archive-phases` directly.

## 6. Completion Protocol (Mandatory Checklist)

Before finishing any task that involved magic-spec workflows, verify §1–§5 were honored.

- [ ] **§1 Version Check** — verified `.magic/.version` against the remote release
      (once per day, first session); displayed the upgrade notice on `local < remote`.
- [ ] **§2 Drift** — compared local `.magic/.version` to the `**Engine Version:**`
      snapshot in `.design/INDEX.md` before any `/magic.*` (except `/magic.analyze`);
      auto-ran `/magic.analyze` on mismatch, then resumed the original workflow.
- [ ] **§3 Spec Graph** — ran `build-spec-graph` before architectural questions;
      navigated `.design/wiki/index.md` (if present) instead of raw spec files;
      ran `export-wiki` after any `.design/` change this session.
- [ ] **§4 Finalization** — after `/magic.spec|task|run|rule`, ran
      `executor.js finalize --workflow=<...>` and displayed its stdout **verbatim**;
      did **not** invoke any write-side `git` operation (`add`, `commit`, etc.).
- [ ] **§5 Phase Archival** — for `/magic.run`, confirmed `finalize` archived every
      phase with `status: Done` and no remaining `- [ ]`, and `TASKS.md` link
      references were rewritten to `archives/tasks/phase-{N}.md (Done (Archived))`.
