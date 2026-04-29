# Task & Planning Workflow

This document explains how Magic SDD converts stable specifications into actionable implementation plans and atomic tasks.

## 1. Overview

The Task Workflow is the bridge between *Design* (what to build) and *Execution* (how to build it). It analyzes the dependency graph of all stable specifications and produces an optimized execution roadmap.

**Triggers:** *"Generate tasks"*, *"Create tasks"*, *"Update tasks"*, *"Sync tasks"*, *"Create plan"*, *"Generate plan"*, *"Update plan"*

**Slash command:** `/magic.task [arg]`

> **Full implementation:** `.magic/task.md` — the engine reads this file before executing any steps.

Key Goals:

- **Dependency Awareness**: Components built in the correct logical order.
- **Phased Execution**: Large projects broken into manageable implementation phases.
- **Atomicity**: Features decomposed into individual tasks completable in a single session.

## 2. Argument Routing

| Input | Mode | Behavior |
| :--- | :--- | :--- |
| *(empty)* | Full | Resolve workspace automatically, plan all specs |
| `{workspace}` | Scoped | Plan only specs registered in that workspace's `INDEX.md` |
| `"text"` | Guided | Interpret text as planning directive (focus, instruction, filter) |
| `{workspace} "text"` | Scoped + Guided | Directive applied within workspace scope |

```
/magic.task                              # Full planning across all workspaces
/magic.task engine                       # Scoped planning for "engine" workspace
/magic.task "decompose phase-2"          # Guided planning with focus
/magic.task docs "only new specs"        # Scoped + guided planning
```

> **Disambiguation**: If an unquoted word matches a workspace name, workspace takes priority. Wrap in quotes to force directive interpretation.
> **Handoff Propagation**: After planning, the engine recommends `/magic.run {workspace}` to preserve scope.

## 3. Core Invariants

The engine enforces 7 mandatory invariants during every task operation:

| # | Invariant | Summary |
| ---: | :--- | :--- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Registry Integrity** | Read ALL specs in `INDEX.md` before planning — no exceptions |
| 3 | **Auto-Init** | Silently creates `.design/` structure if missing; preserves user intent across sub-delegation |
| 4 | **Logic Guards** | No Orphans, Atomic Tasks (C10), User Gate (C9), Zero-Prompt handoff |
| 5 | **Rules Parity** | Record current `RULES.md` version in `TASKS.md`; detect and notify on drift |
| 6 | **Engine Integrity (C14)** | Checksums validated and updated after any `.magic/` modification |
| 7 | **Architectural Logic** | Circular Guard, Layer Respect, Autonomous Selection (C6), Bootstrap Exception, Parent Header Parity |

## 4. Context Quality Guidance

The agent adapts operation depth based on context window utilization:

| Tier | Context Used | Behavior |
| :--- | :--- | :--- |
| **PEAK** | 0–30% | Full reads: complete specs, full TASKS.md, full STATE.md |
| **GOOD** | 30–50% | Normal operation; prefer summaries over full-file reads |
| **DEGRADING** | 50–70% | Read only relevant spec sections; use frontmatter summaries |
| **POOR** | 70%+ | Read STATE.md + phase frontmatter only; trigger `/magic.pause` if needed |

## 5. The Planning System

Magic uses three file levels to manage project state:

- **`PLAN.md`**: Strategic overview — Phases, assigned Specifications, and their current status.
- **`TASKS.md`**: Master Phase Index — phase registry and status tracking.
- **`tasks/phase-{N}.md`**: Tactical execution workbooks — atomic checklists with `T-XXXX` IDs.

### Task ID Format

Each task receives a unique ID: `T-{phase}{track}{seq}` (e.g., `T-1A01`).

- **Phase**: Numeric (1, 2, 3...).
- **Track**: Alphabetic (A, B...) — groups tasks by file independence.
- **Seq**: Sequential number within the track.

When specs are split, the original ID is preserved for the first sub-task; others receive `.N` suffixes (e.g., `T-1A01.1`, `T-1A01.2`).

### Phase Frontmatter

Each `phase-{N}.md` includes YAML frontmatter with: `phase`, `name`, `status`, `subsystem`, `requires`. Fields `provides`, `key_files`, `patterns_established`, and `duration_minutes` are filled by `run.md` upon phase completion.

## 6. Key Workflow Steps

### 6.1 Pre-flight

Validates project state before planning:

- **C15 Filter**: Checksums and registry integrity. In-scope issues → **HALT**.
- **File-Header Parity**: Spec file headers must match `INDEX.md` entries (status, version).
- **Cross-Workspace Parity**: Detects identically-named spec files across workspaces with version mismatches → **HALT**.

### 6.2 Pre-Planning Stabilization (Trust Mode Batch)

Before planning, the engine iterates all Draft specs and attempts auto-promotion to Stable:

- **L1 specs first**, then L2 specs (layer order is mandatory).
- Evaluates Trust Mode criteria: no RULES.md conflicts, no hard-dependency cycles, layer constraints satisfied, MVC (Minimum Viable Completeness) met.
- Reports: `[Pre-Plan] {N} specs promoted to Stable, {M} remain Draft.`
- **Field Normalization**: Auto-renames non-standard parent reference fields (e.g., `L1 Reference:` → `Implements:`).

### 6.3 Planning Audit (C24 — Skeptic Persona)

After drafting the plan, the engine adopts a **Planning Skeptic** persona to review for:

- **Optimism Bias**: Have task sizes been underestimated?
- **Hidden Dependencies**: Are parallel tracks truly independent?
- **Cascade Risk**: If a critical Phase 1 spec fails, how many Phase 2 tasks are blocked?

### 6.4 Autonomous Selection & Quarantine

- **C6 Selection**: All `Stable` specs auto-pulled into `PLAN.md`. `Draft`/`RFC` moved to Backlog.
- **C6 Bootstrap Exception**: If zero specs are Stable and no prior plan exists, Draft specs passing MVC are treated as plannable with a `[Bootstrap]` marker.
- **C12 Quarantine**: If an L1 parent drops from Stable, dependent L2 tasks are marked `Blocked [!]` and moved to Backlog.
- **Phantom Guards**: Missing-from-disk specs cause task cancellation; missing L1 parents cause **HALT**.

### 6.5 Decomposition

The engine splits each spec into 2–3 atomic tasks per track. Every feature track includes at least one **Validation Task** (e.g., `T-1T01`) to verify implementation against the spec.

## 7. Orchestration & Tracks

Tasks are organized into Execution Tracks (Track A, Track B, etc.):

- **Sequential Mode**: One agent works through tracks in order.
- **Parallel Mode** (default per C3): Multiple agents work on independent tracks simultaneously, coordinated by a Manager Agent.

## 8. Maintenance

- **Plan Synchronization**: When specifications change, the plan and tasks are updated via the "Sync tasks" command.
- **Archival (C8)**: Completed phases are moved to `.design/archives/tasks/`.
- **STATE.md Update**: After plan write-back, STATE.md is updated with the new phase and next action.
- **Context Regeneration**: `CONTEXT.md` is regenerated after every plan write.

## 9. Session Isolation (Phase Gates — C17)

The transition from Task Planning to Execution is protected by a **Hard Stop**. You must physically open a **New Chat** before running `/magic.run` to ensure the agent reads generated tasks as the sole source of truth.

## 10. Task Completion Checklist

After every task planning session, the engine verifies:

- All registered specs read; no orphans/phantoms unaddressed
- Pre-Planning Stabilization applied (L1 → L2 order); field normalization done
- Circular Guard checked (hard-dependency cycles); soft reference cycles logged
- Selective Planning (C6) and Quarantine (C12) applied; Bootstrap Exception evaluated
- Validation tasks included for all new features
- Rules Parity: current RULES.md version recorded in TASKS.md
- Role-Switching (C24): draft plan audited in Skeptic Persona
- Phase Frontmatter populated in `phase-*.md` files
- STATE.md updated with new phase and next action
- PLAN.md / TASKS.md written; CONTEXT.md regenerated

## Sync Note

Synchronized with engine workflows on 2026-04-29 (v2.0.8).
