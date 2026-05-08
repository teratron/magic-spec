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

Extract from STATE.md → HANDOFF.json:

| STATE.md field | HANDOFF.json target |
| :--- | :--- |
| `**Task:**` | `current_position.task_id`, `task_title` |
| `**Phase:**` | `current_position.phase`, `phase_name` |
| `**Spec:**` | `current_position.spec_file`, `spec_section` |
| `**Next Action:**` | `next_action` |
| `Blocking Constraints [C-NNN]` | `blocking_constraints[]` |
| `Recent Decisions` | `context_snapshot.active_decisions[]` |

From `tasks/phase-{N}.md` YAML frontmatter: `patterns_established` → `context_snapshot.patterns_established[]`.

### Step 3: Build Required Reading List

Always include: `.design/{workspace}/STATE.md`, `.design/{workspace}/tasks/phase-{N}.md`.
Conditional: task's `spec_file` (if known); phase `requires` frontmatter (if present).

### Step 4: Write Handoff Artifacts

1. **HANDOFF.json**: copy `.magic/templates/handoff.json`, fill `{}` placeholders, write to `.design/{workspace}/HANDOFF.json`.
2. **STATE.md update**:

   ```
   node .magic/scripts/executor.js update-state
     --workspace={active-workspace-dir}
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
