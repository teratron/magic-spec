# Task Workflow

This document explains how Magic SDD decomposes a planned phase into atomic tasks, and how it keeps their recorded state in step with the plan.

## 1. Overview

The Task Workflow is the bridge between *Planning* (which specifications are built when) and *Execution* (the steps that build them). It reads the plan's active phase and produces the ledger and the workbooks `/magicspec run` executes. The plan itself — phases, order, backlog, replanning — is `/magicspec plan` ([Plan Workflow](plan.md)).

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Decompose phase"*, *"Break down the phase"*, *"Smaller tasks"*.

**Slash command:** `/magicspec task [arg]`

> **Full implementation:** `skills/magicspec/workflows/task.md` — the engine reads this file before executing any steps.

Key Goals:

- **Atomicity**: Features decomposed into individual tasks completable in a single session.
- **Verifiable Tasks**: Every task names the specification section it implements and a `Verify` line.
- **Honest Handoffs**: a plan that cannot be decomposed as it stands is handed back to `/magicspec plan` with the reason, never repaired here.

## 2. Argument Routing

| Input | Mode | Behavior |
| --- | --- | --- |
| *(empty)* | Active phase | Resolve the workspace automatically and decompose its active phase |
| `{workspace}` | Scoped | Decompose the active phase of that workspace |
| `update` | Plan alias | Reserved keyword (also `{workspace} update`): the plan's revalidation, kept for habit — it runs `/magicspec plan` and says so |
| `"text"` | Guided | Interpret text as a decomposition directive (focus, instruction, filter) |
| `{workspace} "text"` | Scoped + Guided | Directive applied within workspace scope |

```
/magicspec task                              # Decompose the active phase of the resolved workspace
/magicspec task {workspace}                  # Scoped to one workspace
/magicspec task "decompose phase-2"          # Guided decomposition of a phase
/magicspec task docs "validation tasks only" # Scoped + guided
```

> **Disambiguation**: If an unquoted word matches a workspace name, workspace takes priority. Wrap in quotes to force directive interpretation (this also turns `update` into a directive).
> **A directive about order or membership** ("postpone", "move before", "split phase") belongs to `/magicspec plan`; this workflow names that command and writes nothing.
> **Handoff Propagation**: After decomposition, the engine names `/magicspec run {workspace}` — when the current phase holds a task to run; a phase with only blocked tasks ends with the Stalled Plan report instead (§6.4).

## 3. Core Invariants

The engine enforces mandatory invariants during every task operation:

| # | Invariant | Summary |
| ---: | --- | --- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Plan Integrity** | Account for every specification the active phase holds before decomposing |
| 3 | **Auto-Init** | Silently creates `.magicspec/` structure if missing; preserves user intent across sub-delegation |
| 4 | **Logic Guards** | Plan Gate, Atomic Tasks (C10), Auto-Decompose (C9), One Stage, Findings Go Back, T4 Capture |
| 5 | **Rules Parity** | Record current `RULES.md` version in `TASKS.md`; detect and notify on drift |
| 6 | **Engine Integrity (C14)** | Checksums validated and updated after any `skills/magicspec/` modification |

## 4. Context Quality Guidance

Read economy is guidance, not a measurement: the agent has no reliable reading of its own context-window fill, so no tier or percentage is used.

- Prefer the wiki, `INDEX.md`, STATE.md `Next Action` and the phase files' `provides` frontmatter before broad scans; read the relevant spec sections rather than whole files.
- Once a context begins with a summary standing in for earlier turns, re-ground on STATE.md and the phase files rather than on the summary.

## 5. The Task Layer

Magic uses three file levels to manage project state; this workflow owns the last two:

- **`PLAN.md`**: Strategic overview — Phases, assigned Specifications, order and backlog. Written by `/magicspec plan`.
- **`TASKS.md`**: Master Phase Index — phase registry and status tracking. Its Overview describes the file and tracks nothing; status lives in the phase table. It records the plan version and the constitution version the tasks were decomposed from.
- **`tasks/phase-{N}.md`**: Tactical execution workbooks — atomic checklists with `T-XXXX` IDs.

When the tasks are updated, a task that survives keeps its recorded state (`Status`, `Changes`, `Attempts`) verbatim — regeneration never resets work already done or attempted. Only the explicit transitions of §6.4 (blocking, cancellation, release) change a surviving task's status.

### Task ID Format

Each task receives a unique ID: `T-{phase}{track}{seq}` (e.g., `T-1A01`).

- **Phase**: Numeric (1, 2, 3...).
- **Track**: Alphabetic (A, B...) — groups tasks by file independence.
- **Seq**: Sequential number within the track.

When specs are split, the original ID is preserved for the first sub-task; others receive `.N` suffixes (e.g., `T-1A01.1`, `T-1A01.2`).

### Phase Frontmatter

Each `phase-{N}.md` includes YAML frontmatter with: `phase`, `name`, `status`, `subsystem`, `requires`. Fields `provides`, `key_files`, `patterns_established`, and `duration_minutes` are filled by `run.md` upon phase completion.

## 6. Key Workflow Steps

### 6.1 The Plan Gate

Before any decomposition, the engine checks the plan. A plan that is **missing or stale** — its recorded registry or constitution version differs from the current one, or a Stable specification is in neither a phase nor the backlog — is not decomposed: nothing is written and the run ends with `/magicspec plan {workspace}` as the next step, naming why. The plan's own pre-flight findings (header drift, orphaned specifications, an engine integrity finding) are judged by `/magicspec plan`, so seeing one ends the run the same way.

### 6.2 Decomposition

The engine splits each spec of the active phase into 2–3 atomic tasks per track. Every feature track includes at least one **Validation Task** (e.g., `T-1T01`) to verify implementation against the spec. Every task carries a concrete `Verify` line; "works" and "covered by tests" are not criteria.

### 6.3 Task Instruction Review

Before the write-back, the task text — descriptions, `Verify` lines and phase notes, the instructions `/magicspec run` executes — is reviewed by the prompt-engineer role.

### 6.4 Applying the Plan's Decisions

- **Quarantine**: A spec the plan moved to the Backlog because its L1 parent is no longer `Stable` has its open tasks marked `Blocked [!]` with that reason.
- **Bootstrap Tasks**: A task marked `[Bootstrap]` is exempt from the blocks while its spec is `Draft` — a Bootstrap plan is tentative, so a spec and its `Draft` L1 parent are decomposed together. Once the spec leaves `Draft`, both rules judge its tasks like any other.
- **Demoted Spec**: Its `Done` tasks keep their entries and every other task not already blocked becomes `Blocked [!]` ("Spec `{file}` is `{status}`").
- **Release**: When the plan returns a spec it had held, the tasks blocked by that quarantine return to `Todo`. Tasks blocked for any other reason are untouched.
- **Stalled Plan**: If, after those rules, the current phase has no `Todo` or `In Progress` task but at least one `Blocked [!]` task, the ledger is still written, then the engine **HALTs** instead of handing off to `/magicspec run` — it would only stall. It reports each blocked task with its reason and exactly one next step: `/magicspec spec` when the first blocked task's reason is a specification gap, otherwise the resolution the task's notes name. A block `/magicspec task` does not own is lifted by setting the task's `Status` to `Todo` once its cause is resolved.
- **Stabilizing Tasks (C12.1)**: Only a task flagged `stabilizes: {spec-file}` may bypass a block, and only for the spec the flag names. The flag comes from the plan's `[Stabilize]` marker on that spec — never from the conversation, never inferred from a title. It holds through the whole run: `/magicspec run` lets the flagged task past its own Quarantine and Spec Stability guards.
- **Missing specifications**: Specs missing from disk cause task cancellation.

### 6.5 Findings Go Back

When a phase cannot be decomposed as planned — a specification too large for one phase, a dependency the plan does not state, an order the tasks contradict, a task with no verifiable outcome — the engine changes nothing in the plan. It decomposes what the finding does not touch, writes the finding into the ledger as a **Replan Directive** (the plan's version and the finding in plain words) and ends with `/magicspec plan {workspace} "{directive}"` as the next step. The directive stays pending only while the plan's version is the one it records; a rewritten plan retires it.

## 7. Orchestration & Tracks

Tasks are organized into Execution Tracks (Track A, Track B, etc.):

- **Sequential Mode**: One agent works through tracks in order.
- **Parallel Mode** (default per C3): Multiple agents work on independent tracks simultaneously, coordinated by a Manager Agent.

## 8. Maintenance

- **Plan Synchronization**: When specifications change, run `/magicspec plan` to update the plan, then `/magicspec task` to bring the tasks in line with it.
- **Archival (C8)**: Completed phases are moved to `.magicspec/archives/tasks/`. Set `archival.enabled` to `false` in `workspace.json` to keep finished phases in `tasks/`; the explicit `archive-phases` command still archives them.
- **STATE.md Update**: After the write-back, STATE.md is updated with the phase and next action.
- **Context Regeneration**: `CONTEXT.md` is regenerated after every ledger write.

## 9. Session Isolation (Phase Gates — C17)

The transition from Task Decomposition to Execution is protected by a **Hard Stop**. You must physically open a **New Chat** before running `/magicspec run` to ensure the agent reads the generated tasks as the sole source of truth. Each stage ends by naming the next command and how much reasoning it takes, so the new chat may also use a different model.

## 10. Task Completion Checklist

After every task session, the engine verifies:

- A missing or stale plan ended the run with `/magicspec plan` named and nothing written
- Every specification of the active phase has tasks; none from the backlog was decomposed
- Validation tasks included for all new features; every task has a `Verify` line
- Rules Parity: current RULES.md version recorded in TASKS.md
- Task units reviewed by the prompt-engineer role
- Phase Frontmatter populated in `phase-*.md` files
- Only the ledger and the workbooks were written; `PLAN.md` was not
- STATE.md updated; CONTEXT.md regenerated
- The next command was named, not started

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.102).
