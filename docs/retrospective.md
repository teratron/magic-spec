# Retrospective & Feedback Workflow

This document explains the system's self-improvement mechanism and metrics collection process.

## 1. Overview

The Retrospective Workflow is the "heartbeat" of Magic SDD. It analyzes the usage history of the system (logs, metrics, task performance) and generates actionable recommendations for improving workflows, templates, and project rules.

Key Goals:

- **Continuous Improvement**: Identifying recurring bottlenecks and proposing fixes.
- **Data-Driven Governance**: Using actual metrics to decide when to add or remove project rules.
- **Transparency**: Providing a clear audit trail of development efficiency and "signal" quality.

## 2. The Two-Level System

To balance thoroughness with execution speed, retrospectives are divided into two levels:

| Level | Name | Trigger | Action |
| :--- | :--- | :--- | :--- |
| **Level 1** | Auto-snapshot | Phase Completion | Silently collects metrics and adds one row to the Snapshots table. |
| **Level 2** | Full Retro | Plan Completion / Manual | Deep analysis of trends, identification of "rough edges," and actionable recommendations. |

## 3. Metrics Collected

The system tracks several categories of data to assess project health:

- **Workflow Efficiency**: Transition counts (e.g., how many specs returned from RFC to Draft).
- **Dispatch Accuracy**: Orphaned vs. Planned specifications.
- **Task Execution Health**: Completion velocity and frequency of "Blocked" tasks.
- **Constitution Health**: Stability of `.design/RULES.md` and rule accumulation rate.

## 4. Automation & Workflows

### 4.1 Signal Calculation

The engine assigns a "Signal" (🟢, 🟡, 🔴) to each phase based on blocked tasks and planning coverage. This provides an immediate visual health check for the project.

### 4.2 Recommendation Engine

During a Level 2 retrospective, the engine generates concrete, implementable advice (e.g., "Add a 'Definition of Done' to the spec template to reduce RFC regressions").

### 4.3 Zero-Prompt Reporting

In line with the "Maximum Automation" principle, retrospective reports are saved silently to `.design/RETROSPECTIVE.md`, allowing the developer to review them when convenient without interrupting the flow of work.

## 5. The Feedback Loop

The output of this workflow is used to:

1. **Refine `.magic/` workflows**: Removing high-friction steps.
2. **Optimize `.agent/` instructions**: Improving prompt clarity.
3. **Evolve `.design/RULES.md`**: Formalizing patterns that work well into standing rules.

## 6. Safety & Scope

- **Read-Only**: The retrospective analyzes data but does NOT modify specs, plans, or code.
- **Evidence-Based**: Every observation must reference a specific file, timestamp, or event in the project history.
