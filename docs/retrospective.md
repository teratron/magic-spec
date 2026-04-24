# Retrospective & Feedback Workflow

This document explains the system's self-improvement mechanism and metrics collection process.

## 1. Overview

The Retrospective Workflow is the "heartbeat" of Magic SDD. It analyzes usage history, task metrics, and registry health to generate actionable recommendations for improving workflows and project rules.

> **Full implementation:** `.magic/retrospective.md` — the engine reads this file before executing any steps.

Key Goals:

- **Continuous Improvement**: Identifying recurring bottlenecks and proposing concrete fixes.
- **Data-Driven Governance**: Using actual metrics to inform rule and workflow changes.
- **Transparency**: A clear audit trail of development efficiency and "signal" quality.

## 2. Core Invariants

The engine enforces 6 mandatory invariants:

| # | Invariant | Summary |
| ---: | :--- | :--- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Read-Only Analysis** | Gather data from `.design/`; write ONLY to `RETROSPECTIVE.md` |
| 3 | **Auto-Init** | Silently creates `.design/` structure if missing |
| 4 | **Actionable Output** | Recommendations must be concrete (e.g., "Add guard X", "Remove step Y") |
| 5 | **Level Separation** | L1 (Snapshot) is silent and fast; L2 (Full) is deep and analytical |
| 6 | **Engine Integrity (C14)** | Checksums validated and updated after any `.magic/` modification |

## 3. The Two-Level System

| Level | Name | Trigger | Action |
| :--- | :--- | :--- | :--- |
| **Level 1** | Auto-snapshot | Phase Completion | Silently collects metrics and adds one row to the Snapshots table |
| **Level 2** | Full Retro | Plan Completion / Manual | Deep analysis of trends, recommendations, and actionable advice |

> **Context Economy**: Retrospectives are "read-often, write-once" records. L1 snapshots are strictly metadata updates to minimize context window consumption.

## 4. Metrics Collected

Data is organized into four categories:

| Category | What It Tracks |
| :--- | :--- |
| **Inventory** | INDEX.md status counts (Draft/RFC/Stable) and spec count |
| **Health** | PLAN.md phase completion and TASKS.md metrics (Done/Blocked/Cancelled) |
| **Growth** | RULES.md §7 entry count and history scan |
| **Drift** | Cross-reference INDEX ↔ PLAN ↔ TASKS for orphans/phantoms |

**L2 additionally tracks:**

- **Efficiency**: Spec revisions-to-Stable ratio.
- **Friction**: Recurrent blocking reasons in phase notes.
- **Shadow Logic**: Cross-reference specifications with actual codebase — detect implemented logic without a Stable spec.
- **DORA Metrics**: Deployment Frequency and Change Failure Rate (manual input / external hook).

## 5. Independent Analyst Review (C24)

Before calculating the Signal, the engine adopts an **Independent Analyst** persona and re-examines collected data from a spec-quality lens:

- Do Blocked tasks cluster around specific specs? → Spec is likely underspecified.
- Does Shadow Logic exist? → Implementation outpaced specification; spec debt accumulating.
- Is Blocked/Total ratio low but Retro L2 sessions increasing? → False green — team compensating, not fixing root cause.

Signal must reflect the **health of the specification system**, not just delivery throughput.

## 6. Signal Calculation

The engine assigns a Signal based on quantified thresholds:

| Signal | Condition |
| :--- | :--- |
| 🟢 **Green** | `Blocked / Total < 0.1` AND 0 orphans/phantoms AND 0 shadow logic |
| 🟡 **Yellow** | `0.1 ≤ Blocked / Total ≤ 0.2` OR 1–2 non-critical drift items |
| 🔴 **Red** | `Blocked / Total > 0.2` OR any shadow logic OR critical registry inconsistency |

## 7. Snapshot (L1) Execution

Append row to Snapshots table: `| Date | Phase N | D/R/S | Done/Blk/Can | Rules | Signal |`

### Archival (C8)

As part of L1 completion, move `tasks/phase-N.md` → `archives/tasks/`. Update link in `TASKS.md` to use relative path.

## 8. The Feedback Loop

Retrospective output feeds back into the system:

1. **Refine `.magic/` workflows**: Remove high-friction steps.
2. **Optimize `.agents/` instructions**: Improve prompt clarity.
3. **Evolve `.design/RULES.md`**: Formalize patterns that work well into standing rules.

## 9. Safety & Scope

- **Read-Only**: Analyzes data but does NOT modify specs, plans, or code.
- **Evidence-Based**: Every observation must reference a specific file, timestamp, or event.
- **Zero-Prompt Reporting**: Reports are saved silently to `.design/RETROSPECTIVE.md`.

## Sync Note

Synchronized with engine workflows on 2026-04-10 (v1.5.198).
