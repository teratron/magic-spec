# Pause Workflow

Saves session state and generates a structured `HANDOFF.json` for cross-session continuity.
Trigger: User runs `/magic.pause` OR agent detects POOR context tier mid-phase.

## Core Invariants

1. **Non-Destructive**: Never modify TASKS.md or PLAN.md. Pause is read-only for task state.
2. **Atomic Write**: HANDOFF.json and STATE.md are written together. If either fails → report error,
   do not leave partial state. Existing HANDOFF.json is overwritten.
3. **Zero-Prompt (Trust Mode)**: All fields resolved from existing STATE.md, TASKS.md, and phase files — no prompts.
4. **Engine Integrity (C14)**: This workflow does NOT modify `.magic/` engine files.
   Skip `update-engine-meta` unless `.magic/` was accidentally touched.

## Execution Steps

### Step 1: Context Resolution

Apply full workspace resolution chain from [context.md](context.md).
Read STATE.md — required. If STATE.md missing → run `init.md` first.

### Step 2: Snapshot Current Position

From STATE.md, extract:

- `**Task:**` → `current_position.task_id` + `current_position.task_title`
- `**Phase:**` → `current_position.phase` + `current_position.phase_name`
- `**Spec:**` → `current_position.spec_file` + `current_position.spec_section`
- `**Next Action:**` → `next_action`
- All `Blocking Constraints [C-NNN]` entries → `blocking_constraints[]`
- All `Recent Decisions` entries → `context_snapshot.active_decisions[]`

From `tasks/phase-{N}.md` YAML frontmatter, extract:

- `patterns_established` → `context_snapshot.patterns_established[]`

### Step 3: Build Required Reading List

Minimum always includes:

- `.design/{workspace}/STATE.md`
- `.design/{workspace}/tasks/phase-{N}.md`

If task's `spec_file` is known → add to list.
If phase has `requires` frontmatter → add those phase files too.

### Step 4: Write Handoff Artifacts

1. **HANDOFF.json**: Copy `.magic/templates/handoff.json`. Fill all `{}` placeholders with
   extracted values. Write to `.design/{workspace}/HANDOFF.json`.

2. **STATE.md update**:

   ```
   node .magic/scripts/executor.js update-state
     --workspace={active-workspace-dir}
     --status=Paused
     --handoff=.design/{workspace}/HANDOFF.json
   ```

### Step 5: Confirm

Display pause summary to user:

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

## Resume Protocol (for reference)

When `/magic.run` is called in a new session, Resume Detection fires (context.md §4):

1. Detect `**Status:** Paused` in STATE.md OR presence of `HANDOFF.json`.
2. Read `required_reading` list from HANDOFF.json and load those files.
3. Acknowledge each `blocking_constraints` entry explicitly.
4. Execute `next_action` without any user prompt.
5. Call `update-state --status=Active --handoff=none` after first successful task step.

## Error Handling

- **STATE.md missing**: Run `init.md` then retry. Report if init also fails.
- **No active task**: Set `current_position.task_id` to `none`; `next_action` to `"Run /magic.task to generate plan"`.
- **HANDOFF.json write fails**: Report error. Do not update STATE.md status to Paused.
