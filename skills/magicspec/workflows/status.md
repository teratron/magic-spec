---
description: Read-only resume briefing — where the project stands and the one command to run next.
---

# Status Workflow

Read-only resume briefing for returning users. Composes current position, progress, blockers, recent decisions, engine state, and exactly one recommended next command — or, when nothing is pending, a statement of that — all from existing artifacts.

> **Scope**: presentation only. No file writes, no version bumps, no finalization, no delegation to other workflows.

## Entry

Read-only resume briefing: where the project stands, what was last done and decided, what blocks progress, and the one command to run next. Composed from live memory (`STATE.md`) and registries — performs zero writes.

**Triggers:** `/magicspec status [arg]`, *"Where am I"*, *"What's next"*, *"Project status"*, *"Resume briefing"*.

**Trigger:** `/magicspec status [arg]`. Arguments:

- *(empty)* — briefing for the resolved workspace
- `{workspace}` — briefing for a specific workspace

Examples: `/magicspec status`, `/magicspec status {workspace}`.

1. **Load**: resolve the workspace and read its `STATE.md`, `TASKS.md` and the registry (Step 1 below).
2. **Brief**: render the seven-section briefing (Header → Position → Progress → Blockers & Constraints → Decisions → Engine → Next).
3. **Recommend**: end with exactly one next command (Decision Record format) — never a question.

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; arguments that are only names, flags or paths run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5).

## Core Invariants (Mandatory)

1. **Read-Only (SC-4)**: this workflow performs ZERO writes — no STATE.md update, no finalize call, no version bump, no graph refresh. About to write a file? **STOP** — that is a defect, not a feature. (A script this briefing calls — `resume-state` — may record a non-fatal finding to the runtime diagnostics sink under `.magicspec/.cache/`; the sink is not an artifact and that is not a write in this sense.)
2. **Context (Zero-Prompt)**: apply [context.md](../references/context.md) as a whole — every section applies unless it names other workflows. Choose the workspace first, by the engine's chain (`context.md` §Workspace Resolution Chain): run `node scripts/executor.js resolve-workspace --command status [--workspace {name}] --text "{request}"` (it writes nothing; `--workspace` only when the invocation names a registered workspace; `{request}` is the rest of the argument, and when it is empty `--text` is left out: the script refuses an empty value), take its `Workspace:` line as the active workspace and print its `Narration:` line once.
3. **One Next Step (DA-6)**: the briefing ends with exactly one recommended command, narrated as a Decision Record — never a question, never an option menu. When `Next Action` states that nothing is pending, or is a note that names no command, it ends with that statement or note and no command; the briefing never invents one.
4. **Informational Drift**: engine-version drift is reported as a briefing line; never prompt, never auto-run another workflow. Status is exempt from the upgrade-detection prompt (same exemption class as analyze).
5. **Graceful Degradation**: each briefing section degrades independently — an unreadable source yields `{section}: unavailable ({reason})`, never a crash of the whole briefing.

## Steps

### 1. Resolve & Load

1. Resolve the workspace with `resolve-workspace` (Core Invariant 2; a `{workspace}` argument wins).
2. Read `.magicspec/{workspace}/STATE.md` (primary source), `.magicspec/{workspace}/TASKS.md`, the `**Engine Version:**` field of `.magicspec/INDEX.md`, and `.version`.
3. `STATE.md` missing → render the Bootstrap Briefing (Step 3) instead.

### 2. Render Briefing (fixed order)

1. **Header** — workspace, `Status`, `Phase`, `Updated` (from STATE.md).
2. **Position** — current/last task ID and title, active spec (STATE.md Current Position). When `STATE.md` has a `## Goal` section that names a goal (the layout `templates/state.md` documents), one more line follows: `Goal: {scope} — {met} met, {open} open, {blocked} blocked`, with `, {k} consent(s) queued` appended when consents wait, or `Goal: {scope} — done` when every criterion is `met`. The scope is spelled as the commands spell it (`"{statement}"`, `phase-3`, `5 tasks`). The briefing shows what the block records and re-checks nothing; a section that names no goal adds no line.
3. **Progress** — phase and overall progress bars, verbatim from STATE.md Progress.
4. **Blockers & Blocking Constraints** — both sections surfaced; constraints are mandatory reading before resuming work.
5. **Recent Decisions** — last 3 entries.
6. **Engine line** — compare `.version` against the `**Engine Version:**` snapshot in `.magicspec/INDEX.md`:
   - Match → `Engine: {version} (in sync)`
   - Differ or unknown → `Engine: {local} (snapshot {snap} — drift; /magicspec analyze revalidates)`
7. **Next** — exactly one recommended command, or the nothing-pending statement:
   - A goal is recorded and not every criterion is `met` (a goal with no criteria yet counts as not met) → `/magicspec goal`, which continues it; this comes before every line below. A goal whose criteria are all `met` is done and is passed over.
   - STATE.md `Next Action` states that nothing is pending (it names no command) → render `Next: nothing pending — {the statement}` and recommend no command.
   - STATE.md `Next Action` present and names a command → recommend it verbatim.
   - STATE.md `Next Action` present, names no `/magicspec <command>` command and does not say nothing is pending (a note in the owner's words, for example a manual step to take first) → render `Next: {the text, verbatim}`, recommend no command of your own, and leave the note unrewritten.
   - Absent → compute by pipeline order: an empty registry → `/magicspec spec`; registered specs the plan does not hold, or a plan older than the registry or the constitution → `/magicspec plan {workspace}`; a phase the plan holds with no tasks yet → `/magicspec task {workspace}`; open `Todo` tasks → `/magicspec run {workspace}`.
   - Format: `[DR] Next: {command} — {criterion}. (Override: any /magicspec <command> command)`

### 3. Degraded States

- **STATE.md missing** (fresh or partially initialized project) → Bootstrap Briefing: registry summary from `INDEX.md` (workspaces, spec counts and statuses) plus the recommendation to run `/magicspec plan {workspace}` — its auto-init provisions STATE.md. NEVER create files from this workflow.
- **In-flight session** → add the resume line printed by `node scripts/executor.js resume-state --workspace={workspace}`: a task recorded `In Progress`, a recorded goal, or both in one line. A missing or failing script adds no line.
- **Multi-workspace, no argument** → render the resolved workspace; append footer `Other workspaces: {name} ({status}), ...` (one line).
- **Unreadable artifact** → per-section `{section}: unavailable ({reason})`; continue with remaining sections.

## Status Completion Checklist

```
Status Checklist
  ☐ Workspace Routing: `resolve-workspace` chose the workspace before any workspace file was read; with more than one workspace registered its line `[Workspace] {name} — {signal}. (Override: /magicspec {command} {other} …)` was printed once
  ☐ Read-only honored: zero writes, no finalize, no version bump
  ☐ Briefing rendered in fixed section order (Header → Next)
  ☐ Blocking Constraints surfaced (mandatory reading)
  ☐ Engine line rendered: in-sync or informational drift (no prompt, no auto-analyze)
  ☐ A recorded goal shown as one `Goal:` line under Position, none when no goal is named; `/magicspec goal` recommended first while a criterion is not `met`
  ☐ Exactly one next command recommended as [DR] (DA-6)
  ☐ Degraded states handled (missing STATE.md → Bootstrap Briefing; in-flight → resume line)
```

## Handoffs

Where this workflow may hand over, and when:

- **Continue a goal** → `/magicspec goal`: Continue the recorded goal in a new session. Condition: `goal_open`.
- **Continue execution** → `/magicspec run`: Resume the active phase from the recommended next task. Condition: `open_tasks`.
- **Replan** → `/magicspec plan`: Plan or revalidate the implementation plan. Condition: `plan_gap_or_drift`.
