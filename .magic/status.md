---
description: Read-only resume briefing — where the project stands and the one command to run next.
---

# Status Workflow

Read-only resume briefing for returning users. Composes current position, progress, blockers, recent decisions, engine state, and exactly one recommended next command — all from existing artifacts.

> **Scope**: presentation only. No file writes, no version bumps, no finalization, no delegation to other workflows.
> **Executable projections:** [`workflows/magic.status.md`](../workflows/magic.status.md) · [`skills/magic-status/SKILL.md`](../skills/magic-status/SKILL.md)

## Core Invariants (Mandatory)

1. **Read-Only (SC-4)**: this workflow performs ZERO writes — no STATE.md update, no finalize call, no version bump, no graph refresh. About to write a file? **STOP** — that is a defect, not a feature.
2. **Context (Zero-Prompt)**: resolve the workspace via the resolution chain in [context.md](context.md) (Priority 1-4). Optional `{workspace}` argument overrides.
3. **One Next Step (DA-6)**: the briefing ends with exactly one recommended command, narrated as a Decision Record — never a question, never an option menu.
4. **Informational Drift**: engine-version drift is reported as a briefing line; never prompt, never auto-run another workflow. Status is exempt from the upgrade-detection prompt (same exemption class as analyze).
5. **Graceful Degradation**: each briefing section degrades independently — an unreadable source yields `{section}: unavailable ({reason})`, never a crash of the whole briefing.

## Steps

### 1. Resolve & Load

1. Resolve the workspace (context.md chain; `{workspace}` argument overrides).
2. Read `.design/{workspace}/STATE.md` (primary source), `.design/{workspace}/TASKS.md`, the `**Engine Version:**` field of `.design/INDEX.md`, and `.magic/.version`.
3. `STATE.md` missing → render the Bootstrap Briefing (Step 3) instead.

### 2. Render Briefing (fixed order)

1. **Header** — workspace, `Status`, `Phase`, `Updated` (from STATE.md).
2. **Position** — current/last task ID and title, active spec (STATE.md Current Position).
3. **Progress** — phase and overall progress bars, verbatim from STATE.md Progress.
4. **Blockers & Blocking Constraints** — both sections surfaced; constraints are mandatory reading before resuming work.
5. **Recent Decisions** — last 3 entries.
6. **Engine line** — compare `.magic/.version` against the `**Engine Version:**` snapshot in `.design/INDEX.md`:
   - Match → `Engine: {version} (in sync)`
   - Differ or unknown → `Engine: {local} (snapshot {snap} — drift; /magic.analyze revalidates)`
7. **Next** — exactly one recommended command:
   - STATE.md `Next Action` present → recommend it verbatim.
   - Otherwise compute by pipeline order: open `Todo` tasks → `/magic.run {workspace}`; registered specs without a plan → `/magic.task {workspace}`; empty registry → `/magic.spec`.
   - Format: `[DR] Next: {command} — {criterion}. (Override: any /magic.* command)`

### 3. Degraded States

- **STATE.md missing** (fresh or partially initialized project) → Bootstrap Briefing: registry summary from `INDEX.md` (workspaces, spec counts and statuses) plus the recommendation to run `/magic.task {workspace}` — its auto-init provisions STATE.md. NEVER create files from this workflow.
- **Paused session** (`**Status:** Paused` or `HANDOFF.json` present) → add a resume line: handoff `next_action` and `required_reading` (pause contract).
- **Multi-workspace, no argument** → render the resolved workspace; append footer `Other workspaces: {name} ({status}), ...` (one line).
- **Unreadable artifact** → per-section `{section}: unavailable ({reason})`; continue with remaining sections.

## Status Completion Checklist

```
Status Checklist
  ☐ Read-only honored: zero writes, no finalize, no version bump
  ☐ Briefing rendered in fixed section order (Header → Next)
  ☐ Blocking Constraints surfaced (mandatory reading)
  ☐ Engine line rendered: in-sync or informational drift (no prompt, no auto-analyze)
  ☐ Exactly one next command recommended as [DR] (DA-6)
  ☐ Degraded states handled (missing STATE.md → Bootstrap Briefing; Paused → resume line)
```
