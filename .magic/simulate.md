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

### 1. Target Selection

Identify which workflow (or set of workflows) needs validation. This is mandatory after any change to `.magic/` or `.agent/workflows/`.

- **Direct Target**: If a workflow name was provided as an argument (e.g., `/magic.simulate task`), proceed with that workflow.
- **Ambiguous or Missing Target**: If no specific workflow was named, list all available workflows in `.agent/workflows/` and ask the user to choose one, or offer to simulate **all workflows** as a suite.

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

### 7. Verification

Re-run the simulation of the *corrected* workflow to ensure the fix works.

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
   ☐ Rules compliance checked (especially C1-C10)
  ☐ No overlap with retrospective logic (metrics/history)

Cleanup
  ☐ Rough edges fixed in the source files
  ☐ Versions bumped in modified files
  ☐ Document History updated
```
