# Status — Session Resume Briefing

This document explains the Status workflow, the read-only command that tells you where a project stands and which single command to run next.

## 1. Overview

After a break — a new session, a context reset, a week away — the question is always the same: what was I doing, what blocks me, what do I run now. Answering it by hand means reading `STATE.md`, `TASKS.md`, `PLAN.md`, and `INDEX.md` and reconciling them. The Status workflow does that reconciliation and renders a single briefing.

**Triggers:** `/magic.status [arg]`, *"Where am I"*, *"What's next"*, *"Project status"*, *"Resume briefing"*.

**Slash command:** `/magic.status [workspace]`

> **Full implementation:** `.magic/status.md` — the engine reads this file before executing any steps.

Key Goals:

- **Position**: what was last done, which spec is active, what phase the plan is in.
- **Obstruction**: blockers and blocking constraints surfaced before you resume, not after you hit them.
- **Direction**: exactly one recommended next command, with the reason it was chosen.
- **Purity**: the command changes nothing — no writes, no version bump, no finalize.

## 2. Read-Only Guarantee

Status is the only workflow with no write path at all. It does not touch `.design/`, `.magic/`, or any project file; it suggests no commit; it never creates `STATE.md` even when one is missing.

Two consequences follow from that purity:

- Status is exempt from the engine upgrade-detection rule's prompt. Version drift is rendered as an informational line inside the briefing rather than a recommendation to stop and re-validate.
- Status is exempt from the post-workflow state update every other workflow performs. Running it never advances the session record.

## 3. Briefing Layout

The briefing always renders in this fixed order. A section whose source is unreadable degrades to `{section}: unavailable ({reason})` rather than aborting the briefing.

| # | Section | Source |
| ---: | --- | --- |
| 1 | **Header** — workspace, status, phase, last updated | `STATE.md` |
| 2 | **Position** — current or last task ID and title, active spec | `STATE.md` Current Position |
| 3 | **Progress** — phase and overall progress bars | `STATE.md` Progress |
| 4 | **Blockers & Blocking Constraints** — both surfaced; constraints are mandatory reading | `STATE.md` |
| 5 | **Recent Decisions** — last three entries | `STATE.md` |
| 6 | **Engine line** — local engine version against the registry snapshot | `.magic/.version`, `INDEX.md` |
| 7 | **Next** — one command with a one-line rationale | computed |

The final line follows the Decision Record format:

```
[DR] Next: {command} — {criterion}. (Override: any /magic.* command)
```

One command, never a menu. If you disagree, you run something else — the override hint says so explicitly.

## 4. Degraded and Special States

| State | Behavior |
| --- | --- |
| **`STATE.md` missing** | Bootstrap briefing: registry summary from `INDEX.md` (spec counts and statuses) plus a recommendation to run planning, whose auto-init provisions the missing file. Status still creates nothing. |
| **Paused session** | A paused status or a handoff file present surfaces the resume line — the recorded next action and its required reading. |
| **Engine drift** | `Engine: {local} (snapshot {snap} — drift; /magic.analyze revalidates)`. Informational; the briefing proceeds. |
| **Multiple workspaces** | The resolved workspace is rendered in full, followed by a one-line footer listing the others with their statuses. |

## 5. Workspace Targeting

With no argument the workspace resolves through the standard priority chain. Pass a name to override:

```
/magic.status                # Resolved workspace
/magic.status engine         # Explicit workspace
```

## 6. Relationship to Other Workflows

| Workflow | Relationship |
| --- | --- |
| **Run** (`run.md`) | Primary source — status reports the position `run` last wrote |
| **Task** (`task.md`) | Primary source — the active phase and its checklist |
| **Analyze** (`analyze.md`) | Referenced — the engine line points at analysis when the snapshot has drifted |
| **Pause** (`pause.md`) | Complement — `pause` writes the handoff, `status` reads it back |

## Sync Note

Synchronized with engine workflows on 2026-08-06 (v2.1.64).
