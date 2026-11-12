# Goal Workflow

This document explains how Magic SDD works toward a goal without pausing between steps: a goal in words, a phase of the plan, or a number of tasks, pursued through the pipeline until it is met or a closed list of stop conditions is reached.

## 1. Overview

Every pipeline command performs one stage and names the next, and you type it. For work that spans several phases — "the import works end to end for all three file formats" — what you contribute between steps is retyping what the engine already computed. `/magicspec goal` takes those steps itself: it specifies what is missing, plans, decomposes, runs every phase, simulates, fixes what the simulation finds, and repeats.

It removes the pauses between workflows and nothing inside them. Every review, pre-flight check, containment rule and consent question of a step applies exactly as it does when you run that step yourself.

**Triggers:** *"Work toward this goal"*, *"Keep going until it works"*, *"Do all of it without stopping"*, *"Pursue this goal"*, *"Run the phase to the end"*, *"Do the next five tasks"*, *"Continue the goal"*, *"Goal"*.

**Slash command:** `/magicspec goal [scope]`

> **Full implementation:** `skills/magicspec/workflows/goal.md` — the engine reads this file before executing any steps.

Key Goals:

- **One intake, then no questions**: a goal in words is clarified once, at the start. After that the mode asks only the consent questions it queued, and only when it stops.
- **Verifiable**: the goal becomes acceptance criteria, each with a named check — a command, a test, a scenario, or a specification statement whose tasks are done.
- **Resumable**: the goal and each criterion's state live in the workspace's live memory, so a new session continues the same goal.
- **Guarded**: no gate is relaxed and nothing irreversible happens without your yes.

## 2. The Scope

The scope is required unless a goal is already recorded.

| Input | Meaning |
| --- | --- |
| *(empty)* | Continue the recorded goal. With none recorded, one line says so and the form asks for the scope |
| `"{statement}"` | A goal in words; the intake runs once |
| `phase-{N}` | That phase of the plan, run to done. A phase the plan does not hold is answered with one line listing the plan's phases, and nothing runs |
| `{N} tasks` | A bound on the work, not a goal: follow the plan from its next runnable task and stop after that many tasks are done, at a task boundary |
| `phase-{N} {N} tasks`, `"{statement}" {N} tasks` | The count bounds the phase or the goal |
| `{workspace} …` | Any of the above in a specific workspace |

A number with no unit, or a phrase that is neither a phase nor a count, is read as a goal in words. A phase and a count are already specified and planned work, so they ask nothing at all.

```
/magicspec goal "the import works end to end for all three file formats"
/magicspec goal phase-3
/magicspec goal 5 tasks
/magicspec goal
```

A new scope given while a goal is recorded replaces it, and one line names the replaced goal so you can state it again. The work already done stays in your specifications, plan and tasks.

## 3. How a Run Goes

1. **Establish** the goal. A bare `goal` reports the recorded goal and its criteria counts and continues.
2. **Intake** (a goal in words only): the same intake `/magicspec spec` runs on an idea. It is the one place the mode may ask; what it leaves open is decided and recorded as an assumption.
3. **Record the criteria** in the live memory, each with the check that verifies it.
4. **Choose the next step** from the files: a criterion no stable specification states goes to `spec`; an open finding goes to `fix`; the recorded next action goes to `plan`, `task` or `run`; scenarios over an open criterion go to `simulate`.
5. **Run the step** as its own workflow, with all its gates and its own finalization, then re-check the criteria and count progress.
6. **Stop** on the first condition that holds, or go back to step 4.

Each step ends at its own stage boundary and leaves the records the next one reads, so a goal interrupted anywhere resumes from the files.

## 4. Consent

An action that needs consent — a destructive or irreversible action, an external release artifact, a constitutional amendment — is never performed and never skipped silently. It is queued with its reason, the work that depends on it is blocked, and the mode carries on with work that does not. When nothing unblocked remains, the mode stops, prints its report and only then asks the queued questions, one at a time, each with at most three fixed options and the recommended one first.

## 5. When It Stops

The mode stops on exactly one of these:

- **Done**: every criterion is met.
- **Consent queued**: nothing unblocked remains and consents are waiting.
- **No progress**: three iterations in a row changed no recorded state (a criterion, a task's status, a specification's status, the plan, a finding closed) — or the number of rounds the goal itself states.
- **Integrity halt**: a checksum, drift or parity check fails.
- **A stated bound**: iterations, phases or time named in the goal, or the task count of the scope.
- **Interrupted**: you interrupt; the mode stops at the next step boundary.

## 6. The Report

The mode reports once, when it stops:

```
Goal: "the import works end to end for all three file formats"
Stopped: consent queued
Criteria:
  [met]     CSV import round-trips — scenario S-1 passes
  [open]    JSON import round-trips — scenario S-2 is not written
  [blocked] the old importer is removed — waiting for your yes
Work: Phase 3: the import commands and their checks — commit suggestion: Add the import commands
Queued consents: 1
Next: /magicspec goal — per step reasoning
```

Commit suggestions are text only. The engine never commits: every change stays uncommitted for you to review.

## 7. Resuming

The goal and its criteria are written to the workspace's live memory after every iteration. A new session reports the goal in its first resume line, `/magicspec status` shows it under the position, and `/magicspec goal` with no argument continues it. The mode runs inside your session and schedules nothing outside it: a host that ends the turn ends the iteration, and nothing is lost.

## 8. Completion Checklist

- The scope read: a phase the plan lacks answered and nothing run; a new scope over a recorded goal narrated
- One intake for a goal in words, none for a phase or a count
- Criteria with named checks; the live memory updated after every iteration
- Every step run as its own workflow; no gate relaxed
- Consent queued, never performed or skipped silently; asked one at a time after the report
- A stop on exactly one condition; one report; nothing committed

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.102).
