# Pause Workflow

Saves session state and generates `HANDOFF.json` for cross-session continuity.
Trigger: `/magic.pause` OR POOR context tier detected mid-phase.

## Core Invariants

1. **Non-Destructive**: Never modify TASKS.md or PLAN.md. Pause is read-only for task state.
2. **Atomic Write**: HANDOFF.json and STATE.md write together. If either fails → report error; do not leave partial state. Existing HANDOFF.json is overwritten.
3. **Zero-Prompt (Trust Mode)**: All fields resolved from STATE.md / TASKS.md / phase files — no prompts.
4. **Engine Integrity (C14)**: This workflow does not modify `.magic/`. Skip `update-engine-meta` unless `.magic/` was accidentally touched.

## Steps

### Step 1: Context Resolution

Apply the workspace resolution chain from [context.md](context.md). Read STATE.md — required. If STATE.md missing → run `init.md` first.

### Step 2: Snapshot Current Position

Extract from STATE.md → HANDOFF.json (`schema_version: 1.1`):

| Source field | HANDOFF.json target |
| --- | --- |
| STATE.md `**Task:**` | `current_position.task_id`, `task_title` |
| STATE.md `**Phase:**` | `current_position.phase`, `phase_name` |
| STATE.md `**Spec:**` | `current_position.spec_file`, `spec_section` |
| STATE.md `**Next Action:**` | `next_action` |
| STATE.md `Blocking Constraints [C-NNN]` | `blocking_constraints[]` |
| STATE.md `Recent Decisions` | `context_snapshot.active_decisions[]` |
| TASKS.md phase checklist `[x]` items (active phase) | `context_snapshot.progress.done_in_phase[]` |
| TASKS.md `In Progress` task (active phase) | `context_snapshot.progress.in_progress` |
| TASKS.md `Blocked [!]` tasks (active phase) | `context_snapshot.progress.blocked[]` |
| `tasks/phase-{N}.md` frontmatter `patterns_established` | `context_snapshot.patterns_established[]` |
| `tasks/phase-{N}.md` frontmatter `key_files.{created,modified}` | `context_snapshot.relevant_files[]` (one entry per path) |

### Pre-Compress Snapshot

The extracted fields form the structured summary loaded on resume — Goal (from `current_position`) / Done / InProgress / Blocked / Decisions / Patterns / Files / NextStep. Capture only what survives across sessions; transient tool output is filtered through the Evidence Capsule (`context.md §Read Hygiene`) before any `relevant_files` note is written.

### Step 3: Build Required Reading List

Always include: `.design/{workspace}/STATE.md`, `.design/{workspace}/tasks/phase-{N}.md`.
Conditional: task's `spec_file` (if known); phase `requires` frontmatter (if present).

### Step 4: Write Handoff Artifacts

1. **HANDOFF.json**:
   - **Iterative Merge** — if `.design/{workspace}/HANDOFF.json` already exists from a prior pause, read it **before** templating. Merge with newly extracted values (dedupe by string equality):
     - `context_snapshot.active_decisions` ← union (old + new)
     - `context_snapshot.patterns_established` ← union (old + new)
     - `context_snapshot.progress.done_in_phase` ← union; any entry whose task is now `Done` is **promoted** from `in_progress` / `blocked` into `done_in_phase` (graduation rule)
     - `context_snapshot.relevant_files` ← union, last-write wins on duplicate path
     - All other fields → **replace** with current values (no merge: position, next_action, blocking_constraints reflect *now*, not history)
   - **Schema fallback** — prior HANDOFF with `schema_version: 1.0` lacks `progress` / `relevant_files`: treat missing fields as empty arrays, then write 1.1 schema atomically.
   - Copy `.magic/templates/handoff.json`, fill `{}` placeholders with merged values, write to `.design/{workspace}/HANDOFF.json`.
2. **STATE.md update**:

   ```
   node .magic/scripts/executor.js update-state
     --workspace={active-workspace}
     --status=Paused
     --handoff=.design/{workspace}/HANDOFF.json
   ```

### Step 5: Confirm

Display the pause summary:

```
⏸  Session paused.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task:       {T-ID} {Task Title}
Position:   Phase {N} — {Phase Name}
Next:       {next_action}
Handoff:    .design/{workspace}/HANDOFF.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resume by running /magic.run in a new session.
```

## Resume Protocol (reference)

When `/magic.run` is called in a new session, Resume Detection fires (context.md §4):

1. Detect `**Status:** Paused` in STATE.md OR presence of `HANDOFF.json`.
2. Load files listed in `required_reading` from HANDOFF.json.
3. Acknowledge each `blocking_constraints` entry explicitly.
4. Execute `next_action` with no user prompt.
5. Call `update-state --status=Active --handoff=none` after first successful task step.

## Error Handling

- **STATE.md missing** → run `init.md`, retry. Report if init also fails.
- **No active task** → set `current_position.task_id = none`; `next_action = "Run /magic.task to generate plan"`.
- **HANDOFF.json write fails** → report error; do NOT mark STATE.md `Paused`.
