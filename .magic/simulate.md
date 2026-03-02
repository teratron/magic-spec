---
description: Workflow for simulating and validating Magic SDD engine logic.
---

# Simulation Workflow

The Simulation Workflow is the "Debugger" of the Magic SDD engine. While the **Retrospective Workflow** (`retrospective.md`) looks backward at *actual history* (logs, metrics, and team performance), the **Simulation Workflow** looks at the *current definitions* and runs synthetic "war games" to find logical gaps, contradictions, or friction points in the workflows themselves.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

0. **Context Resolution (Zero-Prompt)**: Always resolve the active workspace before operating on `.design/`. Check for `--workspace` flag, `MAGIC_WORKSPACE` env var, or the JSON `default` key in `.design/workspace.json`. Route all logic/files to `.design/{workspace}/` (e.g. `.design/engine/`). Default to root `.design/` only if JSON is missing. Never ask the user for workspace context.
1. **Synthetic Context (Cognitive Execution ONLY)**: Create a hypothetical project state (spec counts, plan versions, folder structures) to test the workflow logic. **CRITICAL GUARD: Do NOT write or execute any physical test scripts (e.g. `simulate.js`, `simulate.ps1`). The simulation is purely a cognitive LLM task. Evaluate the logic internally and report the expected outcome.**
2. **Stress Test**: Specifically look for scenarios that might confuse a future agent or lead to "planning amnesia".
3. **Surgical Reporting (Fix & Test)**: If a "rough edge" is found in `.magic/` files, document the fix precisely — exact file, exact lines, exact proposed change. You **must also write a new regression test** for the issue and append it to `.magic/tests/suite.md`. Present and ask the user for a single yes/no approval before applying any patches. This is the only non-silent step in the simulation workflow (C1 compliance).
4. **Non-Overlapping**: Do not collect metrics or analyze project history (that's for `retrospective.md`). Focus purely on the *logic and clarity* of the instructions.
5. **Universal Executor**: Always verify that scripts mentioned in the workflow are properly referenced via `node .magic/scripts/executor.js`.
6. **Engine Versioning (C14)**: If the current task involves modifying core engine files (anything inside `.magic/`), you MUST also increment the **patch** version in `.magic/.version`.

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
- **Empty Target (Default)**: If no specific workflow or `test` argument is provided, the agent MUST explicitly trigger **Improv Mode (Live Simulation)** by default. This ensures unpredictable, full-cycle endurance testing rather than relying solely on static predefined cases.

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

### 6. Corrective Proposal (Fix & Test)

1. **Surgical Fix**: Document any surgical fixes for affected `.magic/` or `.agent/workflows/` files.
2. **Regression Test Addition**: For every logical flaw identified and fixed, **you must automatically write a new regression test** targeting that specific edge case and append it to `.magic/tests/suite.md` so the flaw is covered explicitly in future tests.
3. Ensure versioning rules (RULES.md §3) are followed for all modified files.
4. **Wait for user approval before applying changes (C1 compliance).**

> **Checksum Rule**: Run `node .magic/scripts/executor.js generate-checksums` only AFTER the user approves and changes are written. Regenerating before approval creates a mismatch between stored hashes and the actual files that will be modified.

### 7. Verification (Regression Sweep)

Verify the applied fixes:

- **Spot-check**: Re-read the modified lines to confirm they match the proposed change.
- **Complete Test Run**: Once a fix is applied and its corresponding test is written, the agent must prompt the user or utilize a handoff to execute the full test suite (`/magic.simulate test`) to ensure the surgical fix didn't break existing core logic.

## 6. Standardized Reporting

To ensure consistency across all simulation methods (Direct Target, Drag-and-Drop, or Test Suite), always present the results using the following structures:

### 6.1 Individual Workflow Audit (Direct/Drag-and-Drop)

Use this table for single workflow simulations to report on logic and clarity:

```markdown
| Dimension | Finding | Outcome |
| :--- | :--- | :--- |
| **Logic** | [Description of logical gap or pass] | ✅ PASS / ❌ FAIL |
| **AOP** | [Ambiguity, density, or prompt friction] | ⚠️ ROUGH EDGE |
| **Integrity** | [Script calls, C7/C13 compliance] | ✅ OK |
```

### 6.2 Test Suite Report

Use the standard table format defined in `suite.md` for the `/magic.simulate test` output.

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
  ☐ New fallback/regression test added to .magic/tests/suite.md for each fix
  ☐ Full regression suite (/magic.simulate test) triggered post-fix
  ☐ Versions bumped in modified files
  ☐ Document History updated
```
