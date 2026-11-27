---
description: Continues interrupted work — the command a crash or an exhausted session cut off, from its last checkpoint, a task left in flight or a recorded goal.
---

# Resume Workflow

Continues what a session left unfinished: the host crashed, the tokens ran out or the person stopped it. It finds the work the engine recorded, re-enters it where it stopped and lets that command finish. It acts on the resume check every cold context already runs, so nothing depends on typing it.

**Contents:**

- Entry
- Core Invariants (Mandatory)
- Workflow: Resume
- On a 4.0 Workspace
- Resume Completion Checklist
- Handoffs

## Entry

**Triggers:** *"Resume"*, *"Continue where you stopped"*, *"Recover the session"*, *"Pick up after the crash"*, *"The tokens ran out, go on"*.

**Trigger:** `/magicspec resume [workspace]`. Arguments:

- *(empty)* — the resolved workspace; with nothing to resume there, every registered one
- `{workspace}` — that workspace

Examples: `/magicspec resume`, `/magicspec resume {workspace}`.

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; arguments that are only names, flags or paths run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5). A workspace name is a name and runs none.

**Finalization**: this workflow does not finalize as itself. The command it continues finalizes as it always does.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Apply [context.md](../references/context.md) as a whole — every section applies unless it names other workflows. Choose the workspace first, by the engine's chain (`context.md` §Workspace Resolution Chain): run `node scripts/executor.js resolve-workspace --command resume [--workspace {name}] --text "{request}"` (`--workspace` only when the invocation names a registered workspace; `{request}` is the rest of the argument, and when it is empty `--text` is left out: the script refuses an empty value), take its `Workspace:` line as the active workspace and print its `Narration:` line once.
2. **Continue, never start**: only recorded work is continued. With none, nothing runs: starting a stage is the next command's job, or `goal`'s.
3. **Writes nothing of its own**: the one write is removing a stale record. Every other file is written by the command it continues, under that command's rules.
4. **Consent is never carried over**: a consent question the interrupted command reached, waited on or passed (E1, E2, E4) is asked again before the action it guards.

## Workflow: Resume

1. **Read**: `node scripts/executor.js resume-state --workspace={active-workspace} --json`; when the invocation named no workspace and this one holds nothing, `resume-state --all --json`. Take the first workspace with work and, within it, the first of: an `invocation`, a task in flight, a `goal`. Other workspaces with work are named in one line. A `HALT` naming a move to 4.0 → relay it and stop: the move is the one way forward.
2. **An interrupted invocation**: read its record, `.magicspec/.cache/invocation/{workspace}.json`.
   - **Stale**: the recorded argument names a file, a specification or a task that no longer exists → say so in one line, `node scripts/executor.js checkpoint --workspace={workspace} --clear`, and stop; nothing runs.
   - **Where to start**: the step after the last recorded checkpoint whose files are all there and unchanged since the checkpoint's time. A file a step lists that is missing, or was changed after that time, moves the start back to that step.
   - **Narrate** `[Resume] /magicspec {command} {argument} — from {step} (interrupted {age} ago)`, read `workflows/{command}.md` in full and follow it with the recorded argument. The steps before the start are not redone. The recorded answers and decisions are given: no question the record answers is asked again. The record stays open: the continued command starts no new one, and its own finalization removes it.
3. **A task in flight**, with no interrupted invocation → `workflows/run.md` with that task's identifier. **A recorded goal** → `workflows/goal.md` with no argument.
4. **Nothing recorded**: print `Nothing to resume.` and, when live memory records one, `Next: {Next Action}`. Run nothing and finalize nothing.

## On a 4.0 Workspace

Taken when the resolved workspace's entry in `workspace.json` carries `"format": "4"`; the steps below replace the workflow steps above, and every other section of this body applies unchanged. On any other workspace this section is skipped.

`memory/state.md` takes the place of `STATE.md`: the task in flight is its `- Now:` line, a recorded goal is `memory/goal.md`, and the invocation record is the same.

1. **Read** as Step 1 above does.
2. **An interrupted invocation** is continued as Step 2 above states, by the command's section for a 4.0 workspace.
3. **A task in flight** → `workflows/run.md` with the task of the `- Now:` line; **a recorded goal** → `workflows/goal.md` with no argument.
4. **Nothing recorded** → Step 4 above, `Next` being the `- Next:` line.

## Resume Completion Checklist

```
Resume Checklist
  ☐ Workspace Routing: `resolve-workspace` chose the workspace before any workspace file was read; with more than one workspace registered its line `[Workspace] {name} — {signal}. (Override: /magicspec {command} {other} …)` was printed once
  ☐ Order: an interrupted invocation first, then a task in flight, then a recorded goal
  ☐ An invocation was re-entered from the step after its last holding checkpoint; its record was reused; recorded answers were not asked again; consent was asked again
  ☐ A stale record was reported in one line and cleared, and nothing ran
  ☐ Nothing recorded: one line and the recorded next step; nothing ran, nothing finalized
  ☐ The continued command's own gates, finalization and checklist ran
```

## Handoffs

Where this workflow may hand over, and when:

- **Continue the work** → the command the record names: re-entered from its last checkpoint.
- **A task or goal** → `/magicspec run` or `/magicspec goal`: with the task, or with no argument.
- **Nothing to resume** → name the command live memory records; start nothing.
