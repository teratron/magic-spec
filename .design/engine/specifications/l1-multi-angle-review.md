# Multi-Angle Review & Decision Synthesis Protocol

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

Defines the Layer 1 concept for multi-angle peer review, blind cross-evaluation, context auto-enrichment, and structured decision synthesis in the Magic Spec engine. Inspired by the LLM Council methodology, this specification establishes how SDD engine operations (specification review, post-update audits, project health checks, and complex decision points) leverage distinct evaluation lenses and anonymized peer review to eliminate single-perspective confirmation bias without creating friction for the user.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Core invariants, C9/C25 semantics, and Zero-Prompt execution.
- [l1-decision-autonomy.md](l1-decision-autonomy.md) - Autonomous Decision Protocol (DA-1..DA-9); provides the decision framework that this protocol extends with structured synthesis.
- [l1-prompt-quality-gate.md](l1-prompt-quality-gate.md) - Defines instruction quality review gates (`@role:prompt-engineer` / `@role:spec-critic`).

## 1. Motivation

### 1.1 Field Evidence

In complex SDD workflows, single-agent evaluation of specifications or system changes exhibits known failure modes:

- **Confirmation Bias**: A single role or evaluator tends to validate its own generated specification or task breakdown without questioning fundamental assumptions.
- **Unstated Assumptions**: Experts or agents deeply immersed in a task overlook implicit dependencies or terminology ambiguous to external consumers (the "curse of knowledge").
- **Unbalanced Trade-offs**: Individual reviews often focus solely on immediate correctness while missing long-term extensibility, edge cases, or practical execution friction.

### 1.2 Goal

Provide a technology-agnostic protocol that:

1. Pre-enriches execution context automatically before framing complex tasks.
2. Evaluates specifications and architectural choices through 5 distinct, contrasting lenses.
3. Employs anonymized peer review to cross-evaluate findings without persona or positional bias.
4. Synthesizes findings into a clear, actionable verdict with high-confidence consensus and explicit trade-off resolution.

## 2. Constraints & Assumptions

- **Zero-Prompt Compliance**: Multi-angle review must operate autonomously without interrupting the user with survey questions.
- **Layer 1 Purity**: Specifications remain technology-neutral. Multi-angle evaluation checks invariant completeness and domain boundaries rather than stack-specific implementations.
- **Performance Bounded**: Context enrichment and evaluation phases must execute within tight token and time bounds.

## 3. Core Invariants

### MA-1 — Context Auto-Enrichment

Before initiating multi-angle review, specification drafting, or complex task decomposition, the engine MUST perform targeted context auto-enrichment by reading:

1. Global and workspace constitutions (`.design/RULES.md` / `.design/{ws}/RULES.md`).
2. Current workspace registry and index (`.design/{ws}/INDEX.md`).
3. Recent retrospective logs (`RETROSPECTIVE.md`) to capture past friction.
4. Directly referenced or dependent L1/L2 specifications.

### MA-2 — Five Contrasting Evaluation Lenses

Multi-angle review evaluates target artifacts through 5 contrasting perspectives designed to create natural tension:

| # | Lens | Role & Focus |
| --- | --- | --- |
| 1 | **Safety & Boundary Critic** | *Contrarian*: Scans for failure modes, edge cases, missing error boundaries, and race conditions. |
| 2 | **Layer Purity Architect** | *First Principles*: Strips surface assumptions; verifies technology neutrality, layer isolation, and domain boundaries. |
| 3 | **Ecosystem & Extensibility Critic** | *Expansionist*: Identifies unexploited composability, cross-spec synergies, and future scalability. |
| 4 | **Execution & Testability Realist** | *Executor*: Focuses on practical feasibility, testability of `Invariant Compliance`, and scope control. |
| 5 | **Zero-Context Usability Auditor** | *Outsider*: Detects implicit assumptions, ambiguous terminology, and jargon unclear to external consumers. |

### MA-3 — Blind Cross-Evaluation

When running multi-angle review on high-stakes changes:

1. Outputs from individual evaluation lenses are collected and anonymized (e.g., Response A through E).
2. Evaluators review the anonymized takes blindly to answer:
   - Which perspective presents the strongest invariant or risk?
   - What critical blind spot exists in the proposed analysis?
   - What did all individual perspectives miss?

### MA-4 — Structured Decision Synthesis

Synthesis of multi-angle reviews MUST follow a structured verdict template:

```plaintext
## Council Verdict: {topic}

### Where the Council Agrees
[High-confidence signals & unanimous invariants]

### Where the Council Clashes
[Genuine trade-offs and architectural tensions]

### Blind Spots Caught
[Insights revealed exclusively through blind cross-review]

### The Recommendation
[Unambiguous, direct decision]

### The One Thing to Do First
[Single concrete immediate action step]
```

### MA-5 — Decision Record Integration

Autonomous decisions (DA-4 / DA-6) resulting from multi-angle synthesis MUST summarize the verdict as a single-line Decision Record (`[DR]`) in chat narration:

```plaintext
[DR] {Decision} — Consensus: {Agreed Point}; Clash: {Resolved Tradeoff}. (Override: {revert/command hint})
```

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[SPEC-ENGINE]` | `.magic/spec.md` | Specification authoring workflow incorporating multi-angle review. |
| `[ANALYZE-ENGINE]` | `.magic/analyze.md` | Audit workflow incorporating blind multi-angle review. |
| `[CONTEXT-ENGINE]` | `.magic/context.md` | Context resolution chain hosting MA-1 auto-enrichment. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-07-25 | Promoted to Stable: Initial definition of Multi-Angle Review & Decision Synthesis Protocol based on LLM Council methodology. |
