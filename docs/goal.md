# Goal Workflow

This document explains how Magic SDD works toward a goal without pausing between steps: a goal in words, a phase of the plan, or a number of tasks, pursued through the pipeline until it is met or a closed list of stop conditions is reached.

## 1. Overview

Every pipeline command performs one stage and names the next, and you type it. For work that spans several phases — "the import works end to end for all three file formats" — what you contribute between steps is retyping what the engine already computed. `/magicspec goal` takes those steps itself: it specifies what is missing, plans, decomposes, runs every phase, simulates, fixes what the simulation finds, and repeats.

It removes the pauses between workflows and nothing inside them. Every review, pre-flight check, containment rule and consent question of a step applies exactly as it does when you run that step yourself.

**Triggers:** *"Work toward this goal"*, *"Keep going until it works"*, *"Do all of it without stopping"*, *"Pursue this goal"*, *"Run the phase to the end"*, *"Do the next five tasks"*, *"Continue the goal"*, *"Goal"*.

**Slash command:** `/magicspec goal [scope]`

> **Full implementation:** `skills/magicspec/workflows/goal.md` — the engine reads this file before executing any steps.

Key Goals:

- **One intake, then no questions**: a goal in words is clarified once, at the start. After that the mode asks only the consent questions it queued, and only when it stops. A choice the engine cannot settle from your files is decided, noted as an assumption and listed in the report, never asked.
- **Verifiable**: the goal becomes acceptance criteria, each with a named check — a command, a test, a scenario, or a specification statement whose tasks are done.
- **Resumable**: the goal and each criterion's state live in the workspace's live memory, so a new session continues the same goal.
- **Guarded**: no gate is relaxed and nothing irreversible happens without your yes.

## 2. The Scope

The scope is optional.

| Input | Meaning |
| --- | --- |
| *(empty)* | Continue the recorded goal while one of its criteria is not met. With none, or with a finished one, run the active phase, and one line says which phase was taken. With no phase to take — the plan is complete, stale or missing, or the phase is blocked — nothing runs and one line says why |
| `"{statement}"` | A goal in words; the intake runs once |
| `phase-{N}` | That phase of the plan, run to done. A phase the plan does not hold is answered with one line listing the plan's phases, and nothing runs |
| `phase-{A}..{B}` | Those phases of the plan, in order, each run to done. A range that ends before it starts, or names a phase the plan does not hold, is answered like a missing phase |
| `plan` | Every phase the plan holds open, in order, as the plan stands when the goal is recorded. With no open phase one line says so and nothing runs |
| `{N} tasks` | A bound on the work, not a goal: follow the plan from its next runnable task and stop after that many tasks are done, at a task boundary |
| `phase-{N} {N} tasks`, `"{statement}" {N} tasks` | The count bounds the phase or the goal; a range and `plan` take it the same way |
| `{workspace} …` | Any of the above in a specific workspace |

A number with no unit, or a phrase that is none of these forms, is read as a goal in words. A phase, a range, the whole plan, a count and the empty argument are already specified and planned work, so they ask nothing at all.

```
/magicspec goal "the import works end to end for all three file formats"
/magicspec goal phase-3
/magicspec goal phase-3..5
/magicspec goal plan
/magicspec goal 5 tasks
/magicspec goal
```

A new scope given while a goal is recorded replaces it, and one line names the replaced goal so you can state it again; a goal that is already finished is replaced without a line. The work already done stays in your specifications, plan and tasks.

## 3. How a Run Goes

1. **Establish** the goal. A bare `goal` reports the recorded goal and its criteria counts and continues it while one of its criteria is not met, and otherwise takes the active phase.
2. **Intake** (a goal in words only): the same intake `/magicspec spec` runs on an idea. It is the one place the mode may ask; what it leaves open is decided and recorded as an assumption.
3. **Record the criteria** in the live memory, each with the check that verifies it. A range or the whole plan is one criterion: those phases are done.
4. **Choose the next step** from the files: criteria no stable specification states go to `spec` — the first run takes the whole brief and every such criterion as one run, a later run a single criterion; an open finding goes to `fix`; the recorded next action goes to `plan`, `task` or `run`; scenarios over an open criterion go to `simulate`.
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
Assumptions: 1
  JSON numbers are read as decimals — Override: /magicspec spec amend {file} "read as floats"
Next: /magicspec goal — per step reasoning
```

The `Assumptions` lines are the choices the engine had to make for you while it worked, each with the command that changes it. They are printed only when there are any.

Commit suggestions are text only. The engine never commits: every change stays uncommitted for you to review.

## 7. Resuming

The goal and its criteria are written to the workspace's live memory after every iteration. A new session reports the goal in its first resume line, `/magicspec status` shows it under the position, and `/magicspec goal` with no argument continues it while it is unfinished. The mode runs inside your session and schedules nothing outside it: a host that ends the turn ends the iteration, and nothing is lost.

## 8. Completion Checklist

- The scope read: a phase the plan lacks, or an inverted range, answered and nothing run; a new scope over a recorded goal narrated; the empty argument took the unfinished goal or the active phase
- One intake for a goal in words, none for a phase, a range, the plan, a count or no argument; the first run of `spec` takes the whole brief
- Choices the engine could not settle decided, noted and listed under `Assumptions`; nothing but the queued consents asked after the intake
- Criteria with named checks; the live memory updated after every iteration
- Every step run as its own workflow; no gate relaxed
- Consent queued, never performed or skipped silently; asked one at a time after the report
- A stop on exactly one condition; one report; nothing committed

## Sync Note

Synchronized with engine workflows on 2026-11-19 (v3.0.159).
