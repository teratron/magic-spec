# Simulation & Engine Debugging

This document explains the workflow for validating and stress-testing the Magic SDD engine.

## 1. Overview

The Simulation Workflow acts as the "Debugger" for the Magic SDD engine itself. It runs synthetic "war games" against current workflow definitions to find logical gaps, contradictions, or friction points.

Key Goals:

- **Logical Verification**: Stress-testing engine logic against hypothetical project states.
- **Workflow Optimization**: Identifying "rough edges" or redundant steps in the SDD process.
- **Regression Testing**: Running a predefined test suite to catch regressions after engine changes.
- **Transparency**: Ensuring all core scripts and automations (e.g., `executor.js`) are properly integrated.

## 2. Modes of Operation

### 2.1 Direct Simulation

Simulate a specific workflow by name:

```
/magic.simulate spec
/magic.simulate task
/magic.simulate run
```

The agent creates a synthetic scenario, "executes" the workflow logic step-by-step, and identifies rough edges.

### 2.2 Stress Test

Run adversarial scenarios designed to break workflow logic:

```
/magic.simulate стресс-тест
```

The agent generates hostile synthetic states (circular dependencies, contradictory inputs, registry corruption) and verifies that guards catch every edge case.

### 2.3 Test Suite

Run the full predefined regression test suite:

```
/magic.simulate test
```

This reads `.magic/tests/suite.md` and executes all 16 predefined test scenarios covering all 8 workflows. Results are reported as a PASS/FAIL table.

**Test Coverage:**

| Workflow | Tests | Scenarios |
| :--- | :--- | :--- |
| init.md | 2 | Fresh cold start, partial corruption |
| spec.md | 3 | Multi-topic dispatch, self-contradiction, deprecation cascade |
| task.md | 3 | New plan, circular dependency, phantom specs with Done tasks |
| run.md | 3 | Sequential happy path, mode amnesia, full deadlock |
| rule.md | 2 | Duplicate convention, remove with workflow dependency |
| onboard.md | 1 | Production collision |
| retrospective.md | 1 | Level 1 auto-snapshot with missing RETRO file |
| simulate.md | 1 | Checksums mismatch HALT |

## 3. Simulation Steps

### 3.1 Pre-flight

Engine integrity is verified via `node .magic/scripts/executor.js check-prerequisites --json`. If checksums mismatch is detected, the simulation **halts** — simulating tampered files produces unreliable results.

### 3.2 Logic Validation

The engine "executes" workflow steps against a synthetic scenario to see if any point feels ambiguous or leads to "planning amnesia."

### 3.3 AI Protocol Optimization (AOP)

Simulation analyzes the **AI-readability** of instructions: token density, prompt ambiguity, structure consistency, and context economy.

### 3.4 Rough Edge Correction

If simulation reveals a logical flaw, the engine proposes a "surgical fix" (a precise search-and-replace) for the affected `.magic/` workflow file. Changes are applied only after user approval.

> **Checksum Rule**: `generate-checksums` is run only AFTER the user approves and changes are written. Regenerating before approval creates a mismatch between stored hashes and the actual files.

## 4. Maintenance

- **Post-Change Verification**: A simulation is mandatory after any significant modification to `.magic/` or `.agent/workflows/`.
- **Cross-Platform Check**: Every simulation verifies that script calls use the universal `node executor.js` wrapper to maintain Windows/Unix compatibility.
- **Regression Suite**: After major engine changes, run `/magic.simulate test` to verify all 16 scenarios still pass.

## 5. Security & Scope

- **Isolated from Reality**: Simulation does not modify live specs, plans, or project code.
- **Verification Loop**: After a fix is applied, the simulation is re-run to ensure the fix resolved the identified issue without introducing new ones.
- **Checksums HALT**: If `.magic/.checksums` mismatch is detected, simulation refuses to proceed until integrity is restored.
