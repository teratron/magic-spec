# Simulation Workflow

Debugs engine logic via synthetic "war games". Focus: logic gaps, friction, and AOP.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Apply the full workspace resolution chain from [context.md](context.md) (Priority 1-4, Disambiguation, Scope Auto-Apply).
2. **Cognitive Execution ONLY**: **GUARD**: Never write/run physical simulation scripts. Evaluate logic internally (LLM task) and report expected outcomes.
3. **Surgical Fix & Test**: If friction found → Propose fix (exact lines) + write new regression test in `.magic/tests/suite.md`. Show to user for Yes/No (C1).
4. **Engine Integrity (C14)**: If engine files (`.magic/`) modified → `node .magic/scripts/executor.js update-engine-meta --workflow simulate` (Smart History: redundant automated entries are skipped).
5. **No Metrics**: Real-world history/logs are for `retrospective.md`.
6. **Anti-Fabrication Rule**: `0 rough edges` is a VALID and expected outcome. If the Logic Audit finds no vague terms, no divergent duplicates, and all guards pass — report it as a clean result. DO NOT invent findings to fill the report structure. Every finding MUST include: `file` (exact filename), `line` (exact line number), `evidence` (verbatim quote copy-pasted from the file), and `verification` (the grep/read command used to confirm). Findings without evidence are INVALID and must be rejected by any reviewer.

## Workflow: Validation & Stress-Testing

```mermaid
graph TD
    A[Trigger: Simulate] --> B[Pre-flight: Pre-reqs & Engine Guard]
    B --> C{Select Mode}
    C -->|test| D[Execute suite.md Scenarios]
    C -->|target| E[Cognitive Walkthrough: workflow]
    C -->|empty| F[Improv Mode: Crisis Synthesis]
    D & E & F --> G[Identify Rough Edges & Ambiguity]
    G --> H[Propose Fix + Append Regression Test]
    H -->|Approve| I[C14 Enforcement Gate]
    I --> J{Succession: regression?}
    J -->|clean| K[Report & Complete]
    J -->|new issues, round ≤2| H
    J -->|round >2| K
```

### 0. Pre-flight (Mandatory — All Modes)

> **HALT**: Do NOT proceed past Pre-flight until `check-prerequisites` output is recorded in the report. If the command fails, is skipped, or its output is not included verbatim — the entire simulation is INVALID. This is a non-negotiable blocking gate.

1. Run `node .magic/scripts/executor.js check-prerequisites --json --workspace {active-workspace}`.
    - `ok: true` → proceed to Step 2.
    - `checksums_mismatch` or `ENGINE_INTEGRITY` → **C15 Filter** (see `init.md` §1). If in-scope → **HALT**. Report: "Engine integrity failure (In-Scope) — resolve before simulating. Hint: run `node .magic/scripts/executor.js update-engine-meta --workflow {mismatched_workflow}` to sync checksums, or restore files from origin." Do NOT fall through to any mode.
    - Missing `.design/` → silently execute `.magic/init.md` (do not prompt user), then resume.
2. Read `.design/workspace.json` → resolve active workspace(s) per Context invariant.
3. **Read-Before-Claim Gate** (Grounding Phase): Read ALL workflow files that will be evaluated in the Logic Audit. Record a checklist of files read with their line counts. This phase MUST complete before any analysis begins. Any claim about a file NOT read in this step is automatically INVALID.
    - `test` / `improv` mode: read ALL `.magic/*.md` files + `.magic/tests/suite.md`.
    - `direct` mode: read only the target workflow file(s).

### 1. Mode Selection

- **Test Suite**: `/magic.dev.simulate test`. Runs all scenarios in `.magic/tests/suite.md`. If missing: fallback to Improv Mode automatically; notify user with hint to restore the file from origin.
- **Direct**: `/magic.dev.simulate {workflow}` or `/magic.dev.simulate {workflow} {mode}` (e.g., `/magic.dev.simulate spec analyze`). Targets specific logic or sub-modes. Also accepts file paths (e.g., `@/path/to/workflow.md`) — extract the workflow name from the filename.
- **Improv**: Default if 0 args. Synthesize a crisis scenario following the **Crisis Template** (see below) and perform a **Cognitive Walkthrough** of the full SDD chain (Spec→Task→Run) on this imaginary state to find leaks.

### 1a. Crisis Template (Improv Mode Only)

Every synthesized crisis **must** satisfy all of the following structural requirements. If a requirement cannot be met (e.g., single-workspace project), document why it is skipped.

| # | Requirement | Minimum |
| :--- | :--- | :--- |
| CR-1 | **Workflows affected** | ≥2 distinct workflows from {spec, task, run, analyze, rule, init} |
| CR-2 | **Full chain walkthrough** | Trace the crisis through Spec→Task→Run in sequence; do not skip a link |
| CR-3 | **Cross-workspace scope** | If `workspace.json` has >1 workspace, crisis must span ≥2 workspaces |
| CR-4 | **Guard stress** | Crisis must attempt to bypass ≥3 distinct guards (C1–C22) |
| CR-5 | **Drift vector** | Include ≥1 out-of-band mutation (manual file edit, external tool, or missing file) |
| CR-6 | **Named scenario** | Assign a short descriptive name (e.g., "The Phantom Cascade") for traceability |

**Output format** (present before walkthrough):

```
Crisis: "{CR-6 name}"
  Affected workflows: {CR-1 list}
  Chain: Spec → Task → Run (CR-2)
  Workspaces: {CR-3 list or "single-workspace — CR-3 skipped"}
  Guards targeted: {CR-4 list of C{N} IDs}
  Drift vector: {CR-5 description}
```

### 2. Logic Audit & AOP

Scan the target workflow(s) for:

- **Logical Invariants**: Do the rules in §1-6 contradict any workflow steps in `.magic/*.md`?
- **Ambiguity (C13)**: Does the workflow text rely on agent "judgment" rather than explicit data triggers?
- **Convergence**: Does every logic path lead to a defined `Status` or `Next Step`?
- **Confirmation Bias Check (C24)**: Adopt a **Skeptic** persona for the final pass of the Logic Audit. For each `PASS` result, ask: *"Would this guard actually fire if an agent were rushing to complete a task in Trust Mode (C9)?"* A guard that exists in text but has no HALT keyword and relies solely on LLM compliance is a PARTIAL at best — re-classify if needed.
- **Context Economy**: Token waste in redundant calls or repeated loading.
- **Broken Loops**: Checklists that don't cover the work; steps referenced in diagrams but missing from text.
- **Suite Integrity**: Validated (test/improv modes) or skipped (direct mode).

### 3. Skeptic Persona Audit (C24)

- **C24 Gate (Skeptic Persona)**: Challenge `PASS` results for "Context Bleed" bias; prove that guards are robust even against intentional bypass attempts.
- **System Signal**: Return 🟢/🟡/🔴 based on finding severity.

### 4. Next Steps

- Propose fixes if failing.
- If logic is sound, explicitly state: "Simulation confirms core guards are robust (Skeptic Persona approved)."

### 5. Reporting & Fixes

- **Individual Audit**: Table with `Dimension | Finding | Outcome (PASS/FAIL/ROUGH EDGE)`.
- **Cognitive Coverage Report**:
  - **Instruction Density** (1-10): Score = `10 - (vague_count + dup_count)`. Minimum 1.
    - **Vague term** (closed list): any of these unquantified qualifiers found in workflow instructions: `"many"`, `"often"`, `"significant"`, `"several"`, `"various"`, `"usually"`, `"mostly"`, `"reasonable"`, `"appropriate"`, `"high-confidence"`, `"crystal clear"`, `"strong/weak tier"`, `"minimal"`, `"substantial"`. Count each unique occurrence per file (not per line).
    - **Duplicate**: same guard or logic rule stated **verbatim or near-verbatim** in two different `.md` files within `.magic/` (e.g., C14 phrasing in both `spec.md` and `run.md`). Intentional invariant reinforcement (same rule restated in each workflow's "Core Invariants" header) counts as **1 duplicate total** regardless of how many files repeat it — this is by design. Count as duplicate only when the **body text diverges** between copies (sync risk).
  - **Guard Resilience** (1-10): Score = `Guards_Triggered / Guards_Expected × 10`. Classify each guard before testing:
    - **Mechanical guard**: Enforced by `executor.js` or filesystem checks (e.g., `check-prerequisites` catches `checksums_mismatch`). Test: would the script output block the workflow? Score: PASS if yes.
    - **Instructional guard**: Enforced only by LLM instruction text (e.g., C7 "Direct calls to `.sh` not permitted"). Test: does the workflow text contain an explicit **HALT** keyword with a concrete condition? Score: PASS if the HALT condition is unambiguous and testable. Score: PARTIAL if the instruction exists but has no HALT and relies on LLM compliance alone.
    - Report both categories separately: `"Mechanical: {X}/{Y}, Instructional: {A}/{B} ({C} partial)"`.
  - **Invariant Compliance** (1-10): Score = `Rules_Followed / Rules_Applicable × 10`. Cross-check workflow steps against all applicable Core Invariants from the target `.md` file.
- **Logic Refinement**: Propose fixes for any `FAIL` or `ROUGH EDGE` outcomes.
- **Surgical Patch**: Apply precisely after approval.
- **C14 Enforcement Gate**: After all patches are applied, verify: were any `.magic/` files modified during this `/magic.dev.simulate` invocation? If yes → run `node .magic/scripts/executor.js update-engine-meta --workflow {modified_workflows}` **immediately**, before reporting results. Do NOT defer to end-of-conversation. This is a blocking step — simulation is not complete until checksums match.
- **Succession**: Run `/magic.dev.simulate test` post-fix to ensure 0 regressions. **Max 2 rounds**: if a second Succession pass still finds new failures, report remaining issues and stop — do not loop indefinitely.
  - **Context Bleed Warning**: The LLM that just wrote fixes has inherent bias toward confirming they work. For strictly unbiased results, recommend the user start a **new chat session** and run `/magic.dev.simulate test` independently. Always append this note to the final report: `"⚠ Succession ran in-context. For unbiased verification, run /magic.dev.simulate test in a fresh session."`

## Simulation Completion Checklist

```
Simulation Checklist — {target}
  ☐ Pre-flight: check-prerequisites passed (engine integrity, workspace resolved)
  ☐ Inventory: Instruction density and context economy mapped
  ☐ Consistency: Rules-to-Workflow logical invariants strictly verified
  ☐ Step coverage: All diagrams matched to text; zero undocumented outcomes
  ☐ Confirmation Bias (C24): Skeptic persona applied to re-verify all PASS results
  ☐ Cog-only: Only logic report; no scripts written or executed
  ☐ Cognitive Coverage: Density, Resilience (Mechanical + Instructional), and Compliance metrics reported
  ☐ Suite Integrity: validated (test/improv modes); or skipped (direct mode)
  ☐ C14 Enforcement Gate: checksums regenerated BEFORE reporting (blocking)
  ☐ Succession: ≤2 rounds, 0 regressions on final pass
  ☐ Context Bleed note appended to report
```
