# Prompt Quality Gate

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

Establishes instruction-quality governance for all AI-facing artifacts produced by SDD workflows. In this engine, every artifact — specifications, constitution rules, plan/task units, role cards, workflow bodies, templates — is ultimately a **prompt**: text loaded by an LLM agent as operating instructions at a later pipeline stage. This spec defines which artifacts count as AI-facing, the closed review taxonomy applied to them, the quality bar for findings, and the policy that every artifact-producing workflow routes its output through the `prompt-engineer` reviewer role before finalization. The role itself is registered in [l1-role-system.md](l1-role-system.md); this spec owns the *what and why* of the quality discipline the role enforces.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Role registry concept; `prompt-engineer` is registered there as reviewer #14.
- [l2-role-cards-governance.md](l2-role-cards-governance.md) - Card content implementing the review protocol defined here.
- [l2-role-integration.md](l2-role-integration.md) - Workflow-side wiring of the gates mandated by PQ-2.
- [l1-engine-core.md](l1-engine-core.md) - Core invariants; this spec extends the reviewer-gate family (C24 lineage).

## 1. Motivation

The engine already reviews artifacts for *domain correctness*: `spec-critic` checks L1 purity and invariant completeness, `planner` runs an adversarial pass on plans, `constitutional-reviewer` checks rule conflicts. No gate reviews artifacts for *instruction quality* — whether the text will steer a downstream LLM agent reliably. The two concerns are orthogonal: a spec can be domain-correct yet ambiguous ("handle errors appropriately"), self-contradictory across sections, cognitively overloaded (five nested conditions with no precedence), or in silent conflict with a linked rule it composes with at load time.

Unreviewed instruction-quality defects are a documented drift vector: ambiguous task lines produce divergent executor behavior, contradictions between a spec and `RULES.md` force agents to guess precedence, and overloaded workflow steps get silently truncated by agents under context pressure. A dedicated quality gate catches these defects at the moment of authoring — the cheapest point of repair.

## 2. Constraints & Assumptions

**Constraints:**

- The gate is a *reviewer-layer* concern. It plugs into the existing role system (R1–R10 of [l1-role-system.md](l1-role-system.md)) — no parallel review mechanism is introduced.
- The gate must be additive: no existing workflow loses a gate, and domain reviewers retain their authority. The prompt-engineer pass runs **after** the domain review of the same artifact.
- Review is cognitive (LLM reasoning pass), not scripted. No executor script performs the analysis; automation is limited to gate placement in workflow bodies.

**Assumptions:**

- Workflow bodies and role cards are authored in English; review operates on English instruction text.
- Historical artifacts (`archives/`, `RETROSPECTIVE.md`, history tables) are immutable and never re-reviewed.

## 3. Core Invariants

### PQ-1 — AI-Facing Artifact Classification

An artifact is **AI-facing** when an agent loads it as operating instructions rather than as data. The closed class list:

| Class | Examples | Consumed by |
| --- | --- | --- |
| Specifications | `specifications/*.md` | task planning, run execution |
| Constitution rules | `RULES.md` (global and workspace) | every workflow, every operation |
| Plan/task units | `PLAN.md`, `TASKS.md`, `tasks/phase-*.md` | run executors |
| Role cards | engine role registry | every gated reasoning pass |
| Workflow bodies | engine workflow files | every workflow invocation |
| Templates | engine template files | artifact authoring |
| Adapter instructions | agent rules and wrapper files | session bootstrap |

Aggregate registries (`INDEX.md`), changelogs, and archives are **not** AI-facing: they are navigational or historical data, exempt from the gate.

### PQ-2 — Universal Gate Coverage

Every workflow that creates or substantively amends an AI-facing artifact MUST route the new or changed instruction text through the `prompt-engineer` review before the artifact is finalized (status promotion, write-back, or registration). Read-only workflows (analysis without dispatch, graph queries, simulations that modify nothing) are exempt as producers — but the ventilation workflow additionally applies the same review lens to **existing** artifacts as an audit dimension. Typo-level patches (0.0.X with no semantic change) do not trigger the gate.

### PQ-3 — Closed Review Taxonomy

The review covers exactly six dimensions. No dimension may be skipped; no ad-hoc dimensions are added outside an amendment to this spec.

1. **Contradictions** — instructions within the artifact that directly conflict; the finding must explain *why* they conflict and what wrong behavior an agent would exhibit.
2. **Ambiguity** — text a model could interpret in multiple ways, classified as quantifier ("a few", "recent"), reference (unclear antecedent), term (undefined or overloaded word), or scope (unclear applicability boundary).
3. **Persona & Tone Consistency** — conflicting stance, register, or role expectations within one artifact (relevant for role cards, workflow bodies, adapter instructions).
4. **Cognitive Load** — structures hard for a model to follow reliably: deeply nested conditions, competing priorities without precedence, deep decision trees, constraint overload. Each finding names the structural pattern and the likely failure mode.
5. **Semantic Coverage** — scenarios or edge cases the instruction leaves an agent to guess, including missing error/exception paths for operations the artifact mandates.
6. **Composition Coherence** — conflicts between the artifact and documents it composes with at load time: its `Implements:` parent, `Related Specifications`, the constitution tier above it, and any workflow that references it. Behavioral, format, and priority conflicts all count.

### PQ-4 — Precision Over Recall

Only high-confidence, materially harmful findings are reported. Speculative, stylistic, or low-impact observations are suppressed. An empty finding set is a valid and expected outcome for a strong artifact. Findings are never forced to fill taxonomy categories. Every finding cites the exact artifact text where the issue occurs.

### PQ-5 — Actionable Rewrites Only

Every finding carries a concrete rewrite or addition that resolves it — never abstract advice ("could be clearer", "consider specifying"). A finding without a proposed replacement text is invalid and must be dropped or completed before the review is emitted.

### PQ-6 — Verdict Semantics

The review emits one of three verdicts:

- **PASS** — no findings; finalization proceeds.
- **PASS-WITH-REWRITES** — findings limited to ambiguity, cognitive load, or coverage; the producing role applies the proposed rewrites within the same workflow invocation, then finalization proceeds without a re-review cycle.
- **FAIL** — at least one contradiction or composition conflict; control returns to the producing role, and the gate re-runs after revision.

The prompt-engineer proposes; the producing role disposes. The reviewer never rewrites the artifact directly outside this loop, mirroring the authority model of all other reviewer gates.

### PQ-7 — Layered After Domain Review

The prompt-engineer pass fires strictly **after** the artifact's domain reviewer (spec-critic for specs, planner's adversarial pass for plans, constitutional-reviewer for rules) and never duplicates domain checks. Domain review answers "is this correct?"; the quality gate answers "will an agent execute this as intended?". A FAIL from the domain reviewer short-circuits the pipeline — the quality gate does not run on domain-rejected artifacts.

## 4. Gate Topology

Concept-level placement of the gate across the workflow surface. Exact step numbering and amendment text are an L2 concern ([l2-role-integration.md](l2-role-integration.md)).

| Workflow | Position | Reviewed text |
| --- | --- | --- |
| spec authoring | after spec-critic PASS, before status promotion | created/amended spec sections |
| task planning | after planner adversarial pass, before plan write-back | task descriptions, verify lines, phase notes |
| rule governance | after constitutional-reviewer APPROVE, before rule write | proposed rule wording in composition with existing tiers |
| ventilation (analyze) | audit dimension feeding the pre-advisory audit | existing AI-facing artifacts (PQ-1 classes) |
| task execution | conditional gate when the diff touches AI-facing engine artifacts, before QA review | changed instruction text in the diff |

## 5. Drawbacks & Alternatives

### 5.1 Drawback: Added Latency per Dispatch

Every artifact write gains one reasoning pass. Mitigation: PQ-4 keeps the pass cheap (precision bar suppresses nit-hunting), PQ-6 PASS-WITH-REWRITES avoids re-review cycles for non-blocking findings, and typo-level patches are exempt (PQ-2).

### 5.2 Alternative Considered: Fold Checks into Each Domain Reviewer

Extending spec-critic, planner, and constitutional-reviewer protocols with instruction-quality checks. Rejected: duplicates the taxonomy across four cards (violating single-source discipline), entangles domain authority with quality authority, and leaves artifact classes without a domain reviewer (templates, role cards) uncovered.

### 5.3 Alternative Considered: Scripted Linting

A static analyzer for instruction text. Rejected for the primary mechanism: ambiguity, persona drift, and composition conflicts are semantic judgments beyond lexical tooling. A future L2 may add heuristic pre-checks, but the authoritative gate remains a reasoning pass.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROLE-SYSTEM]` | `.design/engine/specifications/l1-role-system.md` | Registry concept the prompt-engineer role plugs into. |
| `[GOV-CARDS]` | `.design/engine/specifications/l2-role-cards-governance.md` | Card content implementing the PQ-3 protocol. |
| `[INTEGRATION]` | `.design/engine/specifications/l2-role-integration.md` | Gate wiring mandated by PQ-2 and §4. |
| `[RULES]` | `.design/RULES.md` | Constitution tier participating in PQ-3 composition checks. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-06-11 | Initial Stable. Defines PQ-1–PQ-7 invariants, AI-facing artifact classes, six-dimension review taxonomy, verdict semantics, and gate topology. Promoted via Trust Mode (C9): MVC satisfied, no RULES.md conflicts, no circular dependencies. |
