# Plan Workflow

This document explains how Magic SDD turns stable specifications into a plan — which specifications are built in which phase, in what order, and what waits in the backlog — and how it replans.

## 1. Overview

The Plan Workflow sits between *Specification* (what to build) and *Task* (the atomic steps). It reads the registry, orders the specifications by their dependencies and writes `PLAN.md`. It is also the one command for replanning: reordering, postponing or splitting phases, and revalidating the plan after the registry or the rules change.

**Triggers:** *"Create plan"*, *"Generate plan"*, *"Update plan"*, *"Replan"*, *"Revalidate the plan"*, *"Reorder phases"*, *"Postpone phase"*, *"Move phase"*, *"Split phase"*.

**Slash command:** `/magicspec plan [arg]`

> **Full implementation:** `skills/magicspec/workflows/plan.md` — the engine reads this file before executing any steps.

Key Goals:

- **Dependency Awareness**: Specifications are planned in the order their dependencies require.
- **One Owner**: `plan` writes `PLAN.md` and nothing of the task layer; `/magicspec task` writes the ledger and the workbooks.
- **A Stage of Its Own**: planning ends by recording the plan and naming the next command, so you can switch to a different model before decomposing.

## 2. Argument Routing

| Input | Mode | Behavior |
| --- | --- | --- |
| *(empty)* | Revalidation | Resolve the workspace automatically and re-evaluate the whole plan against the current registry and rules |
| `{workspace}` | Scoped | The same, for the specifications registered in that workspace's `INDEX.md` |
| `"text"` | Guided | Interpret the text as an order or membership directive: "postpone phase 4", "move the auth specification before the API", "split phase 2", "only the new specifications" |
| `{workspace} "text"` | Scoped + Guided | The directive applied within the workspace |

```
/magicspec plan                              # Revalidate the plan for the resolved workspace
/magicspec plan {workspace}                  # Scoped to one workspace
/magicspec plan "postpone phase 4"           # Guided replanning
/magicspec plan {workspace} "only new specs" # Scoped + guided
```

> **Disambiguation**: If an unquoted word matches a workspace name, workspace takes priority. Wrap in quotes to force directive interpretation.
> **A directive about decomposition** ("decompose phase-2", "smaller tasks") belongs to `/magicspec task`; this workflow names that command and writes nothing.

## 3. What the Plan Records

`PLAN.md` is the strategic file. For each phase it names the specifications it holds, the order and the reason for it, and the dependencies the order rests on; for each backlog item, why it waits. Its header records the registry version and the constitution version it was written against. A plan whose recorded versions differ from the current ones, or in which a Stable specification is in neither a phase nor the backlog, is **stale**: `/magicspec task` stops on a stale plan and names `/magicspec plan` instead of decomposing it.

A task whose specification leaves the plan keeps its recorded state; `/magicspec task` blocks it with the reason the plan records.

## 4. Key Workflow Steps

### 4.1 Pre-flight

Validates project state before planning:

- **C15 Filter**: Checksums and registry integrity. In-scope issues → **HALT**.
- **File-Header Parity**: Spec file headers must match `INDEX.md` entries (status, version).
- **Cross-Workspace Parity**: Detects identically-named spec files across workspaces with version mismatches → **HALT**.
- **Stable-Spec Requirement**: A registry holding only Draft or RFC specs is not a HALT — Pre-Planning Stabilization and the Bootstrap Exception handle it. An empty registry is a **HALT** with one recommendation: `/magicspec spec`, or `/magicspec analyze first-time` when the project already has code. The report keeps your original request.

### 4.2 Pre-Planning Stabilization (Trust Mode Batch)

Before planning, the engine iterates all Draft specs and attempts auto-promotion to Stable:

- **L1 specs first**, then L2 specs (layer order is mandatory).
- Evaluates Trust Mode criteria: no RULES.md conflicts, no hard-dependency cycles, layer constraints satisfied, MVC (Minimum Viable Completeness) met.
- Reports: `[Pre-Plan] {N} specs promoted to Stable, {M} remain Draft.`
- **Field Normalization**: Auto-renames non-standard parent reference fields (e.g., `L1 Reference:` → `Implements:`).

### 4.3 Planning Audit

After drafting the plan, the engine activates the planner role to review it for:

- **Optimism Bias**: Have the phases been sized too small for the work their specifications hold?
- **Hidden Dependencies**: Are the phases truly independent where the plan says so?
- **Cascade Risk**: If a critical Phase 1 spec fails, which Phase 2 specifications are blocked?
- **Plan check**: The draft is compared with the other phases, with the plan of every other workspace and with what finished phases delivered, for work scheduled before what it depends on, contradictions, work planned twice and a consumer planned with no producer. Such a finding is resolved before the plan is written; work duplicated across workspaces is assigned to one of them. A finding that can only be resolved by changing a specification halts planning once with a single recommendation, `/magicspec spec`, quoting both sides — planning writes no specification. The check ends with one line: `[Coherence] {N} artifacts compared — {k} findings`.

### 4.4 Autonomous Selection & Quarantine Decisions

- **C6 Selection**: All `Stable` specs auto-pulled into `PLAN.md`. `Draft`/`RFC` moved to the Backlog.
- **C6 Bootstrap Exception**: If zero specs are Stable and no prior plan exists, Draft specs passing MVC are treated as plannable with a `[Bootstrap]` marker.
- **C12 Quarantine**: If an L1 parent drops from Stable, its dependent L2 specs move to the Backlog with the reason; `/magicspec task` then blocks their tasks.
- **Demoted Spec** and **Quarantine Release**: a spec that is no longer `Stable` moves to the Backlog; when it is `Stable` again it returns to the plan and `/magicspec task` releases the tasks it had blocked.
- **Stabilizing a spec (C12.1)**: a directive that asks to stabilize or fix a spec admits it whatever its status, marked `[Stabilize]` in the plan; only the tasks of a marked spec may bypass quarantine.
- **Phantom Guards**: A spec missing from disk goes to the Backlog; a missing L1 parent causes **HALT**.

## 5. Where the Stage Ends

Planning does not start decomposition. It writes `PLAN.md`, updates STATE.md and the context file, finalizes, and names `/magicspec task {workspace}` with the reasoning it takes, as a final line — `Next: /magicspec task {workspace} — standard reasoning`. You may type it at once, in a new session, or after switching to another model. The only things that continue past the end of a stage are the `goal` command and a request whose own words asked for the following stage too.

## 6. Plan Completion Checklist

After every planning session, the engine verifies:

- All registered specs read; no orphans/phantoms unaddressed
- Pre-Planning Stabilization applied (L1 → L2 order); field normalization done
- Circular Guard checked (hard-dependency cycles); soft reference cycles logged
- Selective Planning (C6) and Quarantine (C12) applied; Bootstrap Exception evaluated
- Planning audit by the planner role
- The plan records the registry and constitution versions
- Each phase names its specifications, order and reason; each backlog item its disposition
- Only `PLAN.md` was written of the plan and task files
- STATE.md updated; CONTEXT.md regenerated; the wiki refreshed
- The next command was named, not started

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.129).
