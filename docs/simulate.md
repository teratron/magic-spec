# Simulation & Engine Debugging

This document explains the workflow for validating and stress-testing the Magic SDD engine.

## 1. Overview

The Simulation Workflow acts as the "Debugger" for the Magic SDD engine itself. It runs synthetic "war games" against current workflow definitions to find logical gaps, contradictions, or friction points.

**Slash command:** `/magic.dev.simulate [target]`

> **Full implementation:** `.magic/simulate.md` — the engine reads this file before executing any steps.
> **Dev-only**: This workflow is installed only with the `--dev` flag.

Key Goals:

- **Logical Verification**: Stress-testing engine logic against hypothetical project states.
- **Workflow Optimization**: Identifying "rough edges" or redundant steps in the SDD process.
- **Regression Testing**: Running a predefined test suite to catch regressions after engine changes.
- **Transparency**: Ensuring all core scripts and automations are properly integrated.

## 2. Core Invariants

The engine enforces 6 mandatory invariants:

| # | Invariant | Summary |
| ---: | :--- | :--- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain |
| 2 | **Cognitive Execution ONLY** | Never write/run physical simulation scripts; evaluate logic internally (LLM task) |
| 3 | **Surgical Fix & Test** | If friction found → propose exact fix + write new regression test in `suite.md` |
| 4 | **Engine Integrity (C14)** | Checksums updated after `.magic/` modifications — blocking gate before reporting |
| 5 | **No Metrics** | Real-world history/logs are for `retrospective.md`, not simulation |
| 6 | **Anti-Fabrication** | `0 rough edges` is a valid outcome; every finding must include file, line, evidence, and verification command |

## 3. Modes of Operation

### 3.1 Direct Simulation

Simulate a specific workflow by name:

```
/magic.dev.simulate spec
/magic.dev.simulate task
/magic.dev.simulate run
```

The agent creates a synthetic scenario, "executes" the workflow logic step-by-step, and identifies rough edges. Also accepts file paths (e.g., `@/path/to/workflow.md`).

### 3.2 Improv Mode (Default)

Run an unpredictable, end-to-end stress test across all workflows:

```
/magic.dev.simulate
```

The agent synthesizes a crisis scenario following the **Crisis Template** and performs a Cognitive Walkthrough of the full SDD chain (Spec → Task → Run).

#### Crisis Template

Every synthesized crisis must satisfy all structural requirements:

| # | Requirement | Minimum |
| :--- | :--- | :--- |
| CR-1 | **Workflows affected** | >=2 distinct workflows |
| CR-2 | **Full chain walkthrough** | Trace through Spec → Task → Run in sequence |
| CR-3 | **Cross-workspace scope** | If >1 workspace, crisis must span >=2 |
| CR-4 | **Guard stress** | Attempt to bypass >=3 distinct guards (C1–C22) |
| CR-5 | **Drift vector** | Include >=1 out-of-band mutation (manual edit, missing file) |
| CR-6 | **Named scenario** | Assign a short descriptive name for traceability |

### 3.3 Test Suite

Run the full predefined regression test suite:

```
/magic.dev.simulate test
```

Reads `.magic/tests/suite.md` and executes all predefined scenarios. If missing, falls back to Improv Mode automatically.

## 4. Pre-flight (Mandatory — All Modes)

Engine integrity verified via `check-prerequisites`. If checksums mismatch in-scope → **HALT** — simulating tampered files produces unreliable results.

**Read-Before-Claim Gate**: All workflow files that will be evaluated are read and checksummed before any analysis begins. Any claim about a file not read in this step is automatically invalid.

## 5. Logic Audit & AOP

The engine scans target workflows for:

- **Logical Invariants**: Do §1–6 rules contradict any workflow steps?
- **Ambiguity (C13)**: Does the workflow rely on agent "judgment" rather than explicit data triggers?
- **Convergence**: Does every logic path lead to a defined Status or Next Step?
- **Context Economy**: Token waste in redundant calls or repeated loading.
- **Broken Loops**: Checklists that don't cover the work; steps in diagrams but missing from text.
- **Suite Integrity**: Validated in test/improv modes; skipped in direct mode.

## 6. Skeptic Persona Audit (C24)

After the Logic Audit, the engine adopts a **Skeptic** persona for a final pass:

- For each `PASS` result, asks: *"Would this guard actually fire if an agent were rushing in Trust Mode (C9)?"*
- A guard that exists in text but has no HALT keyword and relies solely on LLM compliance is reclassified as PARTIAL.
- Challenges results for "Context Bleed" bias — proves guards are robust even against intentional bypass.

## 7. Cognitive Coverage Metrics

Three quantified metrics are reported:

| Metric | Formula | What It Measures |
| :--- | :--- | :--- |
| **Instruction Density** (1–10) | `10 - (vague_count + dup_count)` | Unquantified qualifiers and divergent duplicates |
| **Guard Resilience** (1–10) | `Guards_Triggered / Guards_Expected × 10` | Mechanical (script-enforced) vs Instructional (LLM-text) guards |
| **Invariant Compliance** (1–10) | `Rules_Followed / Rules_Applicable × 10` | Workflow steps vs applicable Core Invariants |

**Vague terms** (closed list): "many", "often", "significant", "several", "various", "usually", "mostly", "reasonable", "appropriate", "high-confidence", "crystal clear", "strong/weak tier", "minimal", "substantial".

## 8. Rough Edge Correction

If simulation reveals a logical flaw:

1. Engine proposes a "surgical fix" (exact lines) for the affected `.magic/` file.
2. A new regression test is written into `.magic/tests/suite.md`.
3. Changes applied only after user approval.
4. **C14 Enforcement Gate**: Checksums must be regenerated **before** reporting (blocking step).
5. **Succession**: Run `/magic.dev.simulate test` post-fix. Max 2 rounds — if second pass still finds new failures, report remaining issues and stop.

> **Context Bleed Warning**: The LLM that just wrote fixes has inherent bias toward confirming they work. For unbiased verification, the engine recommends starting a new chat session and running `/magic.dev.simulate test` independently.

## 9. Maintenance

- **Post-Change Verification**: Simulation is mandatory after any significant `.magic/` modification.
- **Cross-Platform Check**: Every simulation verifies script calls use the universal `node executor.js` wrapper.
- **Regression Suite**: After major engine changes, run `/magic.dev.simulate test` to verify all scenarios pass.

## Sync Note

Synchronized with engine workflows on 2026-04-10 (v1.5.198).
