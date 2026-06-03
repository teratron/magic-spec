# Retrospective Workflow

Feedback loop for SDD engine health. Diagnoses bottlenecks without altering core design files.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Apply the workspace resolution chain from [context.md](context.md) (Priority 1-4, Disambiguation, Scope Auto-Apply).
2. **Read-only Analysis**: Gather data from `.design/` artifacts. NEVER modify specs, plans, or tasks. Write ONLY to `RETROSPECTIVE.md`.
3. **Auto-Init**: If `.design/` or system files missing, silently execute `.magic/init.md` (do not prompt user).
4. **Actionable Output**: Recommendations must be concrete (e.g., "Add guard X", "Remove step Y"). No abstract advice.
5. **Level Separation**: L1 (Snapshot) is silent and fast. L2 (Full) is deep and analytical.
6. **Engine Integrity (C14)**: If engine files (`.magic/`) modified → `node .magic/scripts/executor.js update-engine-meta`.

## Levels

| Level | Goal | Trigger | Output |
| --- | --- | --- | --- |
| **L1** | Mini-snapshot | Phase Complete (all tasks Done) | Snapshots table row + Archival (C8) |
| **L2** | Full audit | Plan Complete or manual command | Deep analysis + recommendations |

## Steps (L1 & L2)

### 1. Pre-flight

`node .magic/scripts/executor.js check-prerequisites --json`.

### 2. Collect

- **Inventory**: INDEX.md status counts (D/R/S) and spec count.
- **Health**: PLAN.md phase completion + TASKS.md metrics (Done/Blocked/Cancelled).
- **Growth**: RULES.md §7 entry count and history scan.
- **Drift**: cross-reference INDEX ↔ PLAN ↔ TASKS for orphans/phantoms.
- **Graph Snapshot**: `node .magic/scripts/executor.js build-spec-graph --json > .design/graph-snapshot.json`. If `.design/graph-before.json` exists, run `node .magic/scripts/executor.js diff-spec-graph .design/graph-before.json .design/graph-snapshot.json` to surface structural deltas (new/removed nodes, coverage shifts, god-node evolution). Rename snapshot to `graph-before.json` after use (rolling baseline).

### 3. Analyze (L2 only)

- **Efficiency**: spec revisions-to-Stable ratio.
- **Friction**: recurrent blocking reasons in phase notes.
- **Deep Registry Audit**:
  - **Shadow Logic**: cross-reference `.design/specifications/` with actual codebase. Trace implemented logic back to a `Stable` spec.
  - **Integrity**: check that `INDEX.md` statuses match file content (e.g., file says `Draft` but is fully implemented).

#### Signal Calculation

Before scoring, activate `@role:retrospective-analyst`. Re-examine collected data through a spec-quality lens, not an execution lens:

- Blocked tasks cluster around specific specs? → spec is likely underspecified.
- Shadow Logic exists? → implementation outpaced specification; spec debt accumulating.
- Blocked/Total ratio low but Retro L2 sessions increasing? → false green — team is compensating, not fixing root cause.

Signal must reflect the **health of the specification system**, not just delivery throughput.

### 4. Score & Signal

| Signal | Condition |
| --- | --- |
| 🟢 **Green** | `Blocked / Total < 0.1` AND 0 orphans/phantoms AND 0 shadow logic |
| 🟡 **Yellow** | `0.1 ≤ Blocked / Total ≤ 0.2` OR 1-2 non-critical drift items (stale refs, minor version mismatches) |
| 🔴 **Red** | `Blocked / Total > 0.2` OR any shadow logic OR any critical registry inconsistency |

**DORA Metrics**: collect `Deployment Frequency` and `Change Failure Rate` (manual input / external hook required).

### 5. Report

Append to `RETROSPECTIVE.md` (create from `.magic/templates/retrospective.md` if missing).

## L1 Snapshot Execution

### 6. Append Row

Append to Snapshots table: `| Date | Phase N | D/R/S | Done/Blk/Can | Rules | Signal |`.

### 7. Archival (C8)

Move `tasks/phase-N.md` → `archives/tasks/`. Update link in `TASKS.md` to use a **relative** path.

## Retrospective Completion Checklist

```
Retro Checklist — {Level}
  ☐ Context: Zero-Prompt resolution; only RETROSPECTIVE.md modified
  ☐ Data: INDEX (statuses), PLAN (coverage), TASKS (metrics) analyzed
  ☐ Graph Snapshot: build-spec-graph --json saved to .design/graph-snapshot.json
  ☐ Graph Diff: diff-spec-graph executed if graph-before.json exists; structural deltas noted
  ☐ DORA Metrics: Delivery performance (DF/CFR) recorded for L2
  ☐ Deep Audit: Shadow logic and Logic-to-Spec parity verified
  ☐ Signal Calculation: `@role:retrospective-analyst` activated; Signal reviewed through spec-quality lens
  ☐ L1: Snapshot row appended; Phase N archived to archives/tasks/ (C8)
  ☐ L2: Actionable recommendations mapped to evidence; trends calculated
  ☐ Integrity: No speculative claims; all findings reference specific files
  ☐ Engine Meta: C14 bump if .magic/ files modified
```
