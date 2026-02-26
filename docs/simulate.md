# Simulation & Engine Debugging

This document explains the workflow for validating and stress-testing the Magic SDD engine.

## 1. Overview

The Simulation Workflow acts as the "Debugger" for the Magic SDD engine itself. It runs synthetic "war games" against current workflow definitions to find logical gaps, contradictions, or friction points.

Key Goals:

- **Logical Verification**: Stress-testing engine logic against hypothetical project states.
- **Workflow Optimization**: Identifying "rough edges" or redundant steps in the SDD process.
- **Transparency**: Ensuring all core scripts and automations (e.g., `executor.js`) are properly integrated.

## 2. Simulation Scenarios

Unlike the **Retrospective Workflow** (which looks at real project history), simulation uses **Synthetic Scenarios** to challenge the engine:

- *Planning Challenge*: "A new spec is added that contradicts an existing Stable spec."
- *Dependency Challenge*: "A project has multiple orphaned specs. Does the engine detect them?"
- *Execution Challenge*: "Change a task's status to Blocked. Does the manager agent react correctly?"

## 3. Automation & Workflows

### 3.1 Step-by-Step Logic Validation

The engine "executes" workflow steps against a synthetic scenario to see if any point feels ambiguous or leads to "planning amnesia."

### 3.2 AI Protocol Optimization (AOP)

Simulation specifically analyzes the **AI-readability** of instructions. It aims to minimize token waste and ensure prompts produce high-quality, predictable outputs.

### 3.4 Rough Edge Correction

If simulation reveals a logical flaw, the engine proposes a "surgical fix" (a precise search-and-replace) for the affected `.magic/` workflow file.

## 4. Maintenance

- **Post-Change Verification**: A simulation is mandatory after any significant modification to `.magic/` or `.agent/workflows/`.
- **Cross-Platform Check**: Every simulation verifies that script calls use the universal `node executor.js` wrapper to maintain Windows/Unix compatibility.

## 5. Security & Scope

- **Isolated from Reality**: Simulation does not modify live specs, plans, or project code.
- **Verification Loop**: After a fix is applied, the simulation is re-run to ensure the fix resolved the identified issue without introducing new ones.
