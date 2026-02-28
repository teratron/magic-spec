---
description: Workflow for simulating and validating Magic SDD engine logic.
---

# Simulation Workflow

The Simulation Workflow is the "Debugger" of the Magic SDD engine. While the **Retrospective Workflow** (`retrospective.md`) looks backward at *actual history* (logs, metrics, and team performance), the **Simulation Workflow** looks at the *current definitions* and runs synthetic "war games" to find logical gaps, contradictions, or friction points in the workflows themselves.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Synthetic Context**: Create a hypothetical project state (spec counts, plan versions, folder structures) to test the workflow logic.
2. **Stress Test**: Specifically look for scenarios that might confuse a future agent or lead to "planning amnesia".
3. **Surgical Reporting**: If a "rough edge" is found in `.magic/` files, document the fix precisely — exact file, exact lines, exact proposed change. Present it to the user for a single yes/no approval before applying. This is the only non-silent step in the simulation workflow (C1 compliance).
4. **Non-Overlapping**: Do not collect metrics or analyze project history (that's for `retrospective.md`). Focus purely on the *logic and clarity* of the instructions.
5. **Universal Executor**: Always verify that scripts mentioned in the workflow are properly referenced via `node .magic/scripts/executor.js`.

## Workflow Steps

### 0. Pre-flight

Run `node .magic/scripts/executor.js check-prerequisites --json` to verify engine integrity.

- If `checksums_mismatch` warnings exist → **HALT**. Report the mismatched files to the user. Do not proceed until the user confirms the changes were intentional or checksums are regenerated via `node .magic/scripts/executor.js generate-checksums`. Simulating tampered or unverified files produces unreliable results.
- If `.design/` is missing → this is acceptable for simulate (it doesn't require project files, only engine files).

### 1. Target Selection

Identify which workflow (or set of workflows) needs validation. This is mandatory after any change to `.magic/` or `.agent/workflows/`.

- **Test Suite**: If the argument is `test` (e.g., `/magic.simulate test`):
  - Check for `.magic/tests/suite.md`.
  - If exists: Read and execute predefined scenarios sequentially. Skip Steps 2–5 — go directly to the report.
  - If missing: **Automatic Fallback** to **Improv Mode** (see below). Notify the user that the suite is missing and improvise the validation.
- **Direct Target**: If a workflow name was provided as an argument (e.g., `/magic.simulate task`), proceed with that workflow.
- **Ambiguous or Missing Target**: If no specific workflow was named, list all available workflows in `.agent/workflows/`, the **Test Suite** (if available), and the **Improv Mode** option. If the user doesn't specify, or specifically asks for "live simulation", default to **Improv Mode**.

### 1.5 Improv Mode (Live Simulation)

Use this mode when `suite.md` is missing or as an end-to-end engine stress test. Instead of following static scenarios, the agent must:

1. **Synthesize a "Crisis" Scenario**: Imagine a project in a messy state (e.g., "A developer manually edited files, breaking the parity between `INDEX.md` and the filesystem, while `PLAN.md` is stuck in an old version").
2. **Execute Lifecycle Flow**: Simulate the entire SDD chain in one pass:
   - **Spec**: Detect and resolve inconsistencies/drifts.
   - **Task**: Re-plan the project to reach a stable state.
   - **Run**: Generate logic for a complex fix.
   - **Retrospective**: Audit the "simulated work" for logical leaks or "ambiguity debt".
3. **Audit Friction**: Identify "Rough Edges" where workflow handoffs feel disjointed or require too much "AI intuition" to bridge.

### 2. Scenario Synthesis

Describe a synthetic project state that provides a "challenge" for the workflow.

- *Example for Spec Workflow*: "User input contains 3 different topics, one of which contradicts a Stable spec."
- *Example for Task Workflow*: "Plan is version 1.1, INDEX.md is version 1.5. Check if orphaned specs are detected."

### 3. Logic Simulation

"Execute" the workflow steps step-by-step against the synthetic scenario.

- Does any step feel ambiguous?
- Is there a missing check (e.g., pre-flight)?
- Does the "Task Completion Checklist" actually cover the work done?

### 4. Rough Edge Identification

Identify "rough edges":

- Unnecessary interactive prompts (violates C2/C4).
- Missing cross-platform execution hints (violates C7).
- Logical loops or dead ends.

### 5. AI Protocol Optimization (AOP)

Evaluate the target workflow for **AI-readability** and efficiency:

- **Instruction Density**: Are the instructions too bloated? Can we say it with fewer tokens without losing precision?
- **Prompt Ambiguity**: Could an agent interpret this step in multiple ways? (e.g., replace "fix issues" with "list issues then propose individual fixes").
- **Structure consistency**: Does the workflow use the same markdown patterns and terminology as the rest of the engine?
- **Context Economy**: Does the workflow minimize unnecessary `view_file` calls for large system files if only metadata is needed?

### 6. Corrective Proposal

Document any surgical fixes for affected `.magic/` or `.agent/workflows/` files. Ensure versioning rules (RULES.md §3) are followed. **Wait for user approval before applying changes (C1 compliance).**

> **Checksum Rule**: Run `node .magic/scripts/executor.js generate-checksums` only AFTER the user approves and changes are written. Regenerating before approval creates a mismatch between stored hashes and the actual files that will be modified.

### 7. Verification

Verify the applied fixes:

- **Spot-check**: Re-read the modified lines to confirm they match the proposed change.
- **Regression check**: Confirm the fix doesn't introduce contradictions with adjacent steps.
- **Full re-simulation**: Only if the rough edge was HIGH severity or involved structural changes. For LOW/MEDIUM fixes, spot-check is sufficient.

## Task Completion Checklist

```
Task Completion Checklist — Simulation

Logic Verification
  ☐ Synthetic scenario correctly challenges the target workflow
  ☐ No ambiguity found in the step-by-step logic
  ☐ Workflow handles edge cases (contradictions, gaps) gracefully

AI Optimization (AOP)
  ☐ Instructions are high-density and unambiguous for AI agents
  ☐ Prompts/templates are designed to yield high-quality outputs
  ☐ Terminology is consistent across workflows
  ☐ Context usage is optimized (minimized token waste)

Engine Integrity
  ☐ All script calls use node executor.js (C7)
  ☐ Rules compliance checked (C1-C11)
  ☐ No overlap with retrospective logic (metrics/history)

Cleanup
  ☐ Rough edges fixed in the source files
  ☐ Versions bumped in modified files
  ☐ Document History updated
```

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Antigravity | Initial migration from workflow-enhancements.md |
| 1.1.0 | 2026-02-25 | Antigravity | Added pre-flight check, archival clarification |
| 1.2.0 | 2026-02-26 | Antigravity | Added pre-flight Step 0, lighter Step 7 verification, fixed checklist indentation and C1-C11 reference |
| 1.3.0 | 2026-02-27 | Antigravity | Stress-test fix: checksums_mismatch upgraded to HALT; added Checksum Rule to Step 6 (generate after approval) |
| 1.4.0 | 2026-02-27 | Antigravity | Added Test Suite mode: `/magic.simulate test` runs predefined scenarios from `.magic/tests/suite.md` |
| 1.5.0 | 2026-02-28 | Antigravity | Added Improv Mode (Live Simulation) and fallback for missing test suite |
