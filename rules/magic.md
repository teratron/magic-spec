# Magic Spec — Agent Rules

Consolidated operational rules for AI agents in projects using the magic-spec engine.
Sections are independent — apply each by its own trigger.

> [!CAUTION]
> **Engine directories are READ-ONLY for all standard workflows.**
> Never write to `.magic/`, `workflows/`, `skills/`, or `rules/` unless the task
> explicitly states **"Engine Improvement"**. These directories form the distributed
> SDD engine — unauthorized changes corrupt it for every user of this project.
> If you are about to edit any file in these directories: **STOP** and ask the user
> to confirm the task is an engine improvement.

## 1. Engine Upgrade Detection (Local ↔ Snapshot)

The user manually replaces engine folders (`.magic/`, `workflows/`, `skills/`,
`rules/`) when they want to upgrade. `.magic/.version` then changes locally while
the `**Engine Version:**` snapshot in `.design/INDEX.md` still points at the
previously analyzed value. This section detects that delta and offers to
re-validate the project. No network calls — purely local comparison.

### Procedure

Runs at the start of **every** `/magic.*` invocation except `/magic.analyze`
(would recurse). Trigger on **any** segment difference — `major`, `minor`,
**and `patch`**; patch releases routinely carry behavior-affecting changes.

1. Read `local_engine` from `.magic/.version`.
2. Read `snapshot_engine` from the `**Engine Version:**` field in `.design/INDEX.md`.
   Missing file (fresh project) or missing field → treat as `unknown`.
3. If `local_engine == snapshot_engine` → proceed silently.
4. On mismatch (including `unknown`), prompt the user interactively:

   > [!NOTE]
   > SDD engine version changed: `{snapshot_engine}` → `{local_engine}`.
   > Run `/magic.analyze` now to revalidate the project against the new engine? **[y/n]**
   > Recommended after any engine update — even patch releases may carry workflow-affecting changes.

5. On **y** (Enter = confirm):
   - Auto-execute `/magic.analyze` (full scope, no arguments).
   - On success it updates the `**Engine Version:**` snapshot in `.design/INDEX.md`
     to `local_engine` — this is the **only** path that updates the field;
     manual edits must not touch it.
   - Resume the originally requested workflow with its original arguments.

6. On **n**:
   - Skip analysis for this session only. Do **not** update the snapshot — it must
     stay stale so the next session re-prompts.
   - Emit one line: `⚠️ Engine drift unresolved — re-run /magic.analyze when ready.`
   - Resume the originally requested workflow.

### Exemptions

- `/magic.analyze` itself (would recurse).
- Unreadable `.magic/.version` → skip silently, do not block work.
- `MAGIC_DRIFT_CHECK=0` env var disables this rule entirely.

## 2. Specification Knowledge Graph

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

## 3. Finalization Protocol (Post-Workflow)

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
| --- | --- |
| `magic.spec` | `.design/{ws}/specifications/**/*.md`, `.design/{ws}/INDEX.md` |
| `magic.task` | `.design/{ws}/PLAN.md`, `TASKS.md`, `tasks/**/*.md` |
| `magic.run` | `.design/{ws}/TASKS.md` (status-line changes only), `STATE.md`, `archives/**`, `tasks/**/*.md` |
| `magic.rule` | `.design/RULES.md`, `.design/{ws}/RULES.md` |

### Channels

`.design/engine/CHANGELOG.md` is `magic.run`'s internal phase journal (not touched
here). Root `CHANGELOG.md` is user-facing release notes — written by this protocol.

## 4. Phase Archival Automation

Completed phase files are auto-archived as part of `magic.run`'s finalize, to keep
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
- Project-wide disable: `archival.enabled = false` in `.design/workspace.json`.

### On-demand

```bash
node .magic/scripts/executor.js archive-phases            # archive all eligible
node .magic/scripts/executor.js archive-phases --dry-run  # preview only
```

The pre-commit hook issues a non-blocking notice if unarchived Done phases are
detected — reminds the user to run `/magic.run` or `archive-phases` directly.

## 5. Post-Task Replan

After `/magic.run` finishes a task or phase, drift signals may have surfaced new
gaps. The user-visible next step collapses to ONE command — `/magic.task`
(workspace propagated). Its Pre-Planning Stabilization auto-fixes mechanical
drift; Pre-flight HALTs once with a single `/magic.spec` recommendation only
when specs need substantive design work. `/magic.analyze` and `/magic.spec` are
NEVER proactively offered after `/magic.run`.

### Triggers (any one)

- **Spec ambiguity** — agent surfaced unclear / conflicting / missing spec content during execution
- **Phase complete** — full phase finished (new scope or edge cases may have emerged)
- **RULES drift** — `RULES.md` version > `TASKS.md` base detected mid-run
- **Header drift** — `STATUS_DRIFT` / `VERSION_DRIFT` reported by Pre-flight

### Procedure

1. Emit exactly one line:

   > [!NOTE]
   > Post-task drift detected. Run `/magic.task` to revalidate the plan.

2. Inside `/magic.task`, Pre-Planning Stabilization auto-fixes mechanical drift
   (promote `Draft → Stable`, normalize field names, move phantoms to Backlog).
   Pre-flight HALTs with one user-facing recommendation only on hard drift that
   needs human intent (header parity violations, missing L1 parents, structural
   conflicts):

   > Spec `{file}` requires design input: `{reason}`. Run `/magic.spec`, then
   > re-run `/magic.task`.

3. Clean `/magic.task` completion → handoff to `/magic.run`.

### Hard rules for the agent

- NEVER recommend `/magic.analyze` proactively after `/magic.run` — it stays on-demand.
- NEVER recommend `/magic.spec` proactively after `/magic.run` — it surfaces ONLY inside `/magic.task` on a real HALT.
- The user sees exactly ONE next step after a phase: `/magic.task` (on drift) or `/magic.run` (clean).

### Chain

```
task Done
  → drift signal?
      yes → /magic.task
              → auto-fix? → yes → replan → /magic.run
                          → no  → HALT: /magic.spec, then /magic.task
      no  → /magic.run (next task)
```

### Exemptions

- Targeted task execution with no drift → `/magic.run` next, no replan.
- Engine improvement tasks (explicit directive) — engine and spec layers are separate.
- `MAGIC_POST_TASK_REPLAN=0` env var disables this rule entirely.

## 6. Completion Protocol (Mandatory Checklist)

Before finishing any task that involved magic-spec workflows, verify §1–§5 were honored.

- [ ] **§1 Upgrade Detection** — compared `.magic/.version` to `**Engine Version:**`
      in `.design/INDEX.md` before any `/magic.*` (except `/magic.analyze`); on
      mismatch (or `unknown` snapshot) prompted the user and acted on their choice.
- [ ] **§2 Spec Graph** — ran `build-spec-graph` before architectural questions;
      navigated `.design/wiki/index.md` (if present) instead of raw spec files;
      ran `export-wiki` after any `.design/` change this session.
- [ ] **§3 Finalization** — after `/magic.spec|task|run|rule`, ran
      `executor.js finalize --workflow=<...>` and displayed its stdout **verbatim**;
      did **not** invoke any write-side `git` operation (`add`, `commit`, etc.).
- [ ] **§4 Phase Archival** — for `/magic.run`, confirmed `finalize` archived every
      phase with `status: Done` and no remaining `- [ ]`, and `TASKS.md` link
      references were rewritten to `archives/tasks/phase-{N}.md (Done (Archived))`.
- [ ] **§5 Post-Task Replan** — on any drift signal during `/magic.run`, the
      user-visible next step was exactly ONE command: `/magic.task` (with
      workspace context). NEVER proactively offered `/magic.spec` or
      `/magic.analyze` as a separate user-visible step — `/magic.spec` surfaces
      only inside `/magic.task` on a real HALT.
