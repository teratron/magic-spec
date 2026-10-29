# Multi-Angle Review & Decision Synthesis Implementation

**Version:** 1.0.3
**Status:** Stable
**Layer:** implementation
**Implements:** l1-multi-angle-review.md

## Overview

Concrete implementation mapping of [l1-multi-angle-review.md](l1-multi-angle-review.md) to the Magic Spec workflow engine (`skills/magicspec/workflows/spec.md`, `skills/magicspec/workflows/analyze.md`, `skills/magicspec/references/context.md`). Defines the exact execution steps, evaluation lens prompts, anonymization procedures, and integration with the `@role:spec-critic` and `@role:prompt-engineer` review cards.

## Related Specifications

- [l1-multi-angle-review.md](l1-multi-angle-review.md) - Parent Layer 1 concept specification.
- [l2-role-cards.md](l2-role-cards.md) - Role card implementations for `@role:spec-critic` and `@role:prompt-engineer`.
- [l2-engine-finalization.md](l2-engine-finalization.md) - Finalization protocol.

## 1. Invariant Compliance

| L1 Invariant | Compliance Implementation |
| --- | --- |
| **MA-1 Context Auto-Enrichment** | Implemented in `skills/magicspec/references/context.md` §Step 0.1 Context Pre-flight: scans `.magicspec/RULES.md`, `.magicspec/{ws}/INDEX.md`, `RETROSPECTIVE.md`, and active L1/L2 specs before processing input. |
| **MA-2 Five Contrasting Evaluation Lenses** | Implemented in `skills/magicspec/workflows/spec.md` §Post-Update Review: `@role:spec-critic` evaluates changes across the 5 defined lenses (Safety, Purity, Ecosystem, Realism, Usability). |
| **MA-3 Blind Cross-Evaluation** | Implemented in `skills/magicspec/workflows/analyze.md` Mode C: anonymizes findings into unlabeled items (`Finding A..E`) before cross-review evaluation. |
| **MA-4 Structured Decision Synthesis** | Implemented in `skills/magicspec/workflows/spec.md` §Council Verdict: structured 5-section markdown output block. |
| **MA-5 Decision Record Integration** | Implemented in `skills/magicspec/workflows/spec.md` and `skills/magicspec/references/context.md`: formats autonomous DR narrations as `[DR] {Decision} — Consensus: ...; Clash: ...`. |

## 2. Detailed Design

### 2.1 Multi-Angle Evaluation Lens Prompts

When evaluating specifications, `@role:spec-critic` activates the 5 lenses using these internal evaluation criteria:

```markdown
1. Safety & Boundary Lens (Contrarian):
   - Are edge cases, error conditions, and recovery paths fully specified?
   - What breaks if inputs are malformed or execution halts unexpectedly?

2. Layer Purity Lens (First Principles):
   - Is Layer 1 free of implementation details, stack-specific calls, or explicit library names?
   - Does Layer 2 declare a valid `Implements:` reference to a Stable L1 parent?

3. Ecosystem & Extensibility Lens (Expansionist):
   - Does this specification compose smoothly with related specs in `Related Specifications`?
   - Can this concept be extended without breaking current invariants?

4. Execution & Testability Lens (Executor):
   - Are invariant compliance criteria concrete and verifiable by automated tests?
   - Is implementation scope tightly bounded to prevent bloat?

5. Zero-Context Usability Lens (Outsider):
   - Is terminology clear to a developer reading the spec for the first time?
   - Are there unstated assumptions or implicit project context?
```

### 2.2 Blind Cross-Review Flow

```mermaid
graph TD
    A[Spec Modification] --> B[Generate Lens Assessments]
    B --> C[Anonymize Assessments A..E]
    C --> D[Cross-Evaluate Blind Spot & Conflict Points]
    D --> E[Synthesize Council Verdict]
    E --> F[Emit DR & Update Registry]
```

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[SPEC-ENGINE]` | `skills/magicspec/workflows/spec.md` | Hosts the MA-2 lens activation in Post-Update Review, the MA-4 Council Verdict block, and MA-5 Decision Record narration. |
| `[ANALYZE-ENGINE]` | `skills/magicspec/workflows/analyze.md` | Hosts the MA-3 blind cross-evaluation pass in the ventilation audit. |
| `[CONTEXT-ENGINE]` | `skills/magicspec/references/context.md` | Hosts the MA-1 context pre-flight scan ahead of the resolution chain. |
| `[CRITIC-CARD]` | `skills/magicspec/roles/spec-critic.md` | Role card that carries the five evaluation lenses of §2.1. |
| `[PROMPT-CARD]` | `skills/magicspec/roles/prompt-engineer.md` | Role card invoked alongside the critic in the review gate. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.3 | 2026-10-28 | Reality sync for the state folder rename: the folder is `.magicspec/` in all engine, maintenance and workspace text. No requirement changed. |
| 1.0.2 | 2026-10-28 | Reality sync for the single-skill layout: engine paths and command names follow `skills/magicspec/` and the `/magicspec:` form. No requirement changed. |
| 1.0.1 | 2026-08-06 | Added the `## Canonical References` section — the only Stable spec that lacked one. No design change: the table records the files §1 already names as the implementation sites. |
| 1.0.0 | 2026-07-25 | Initial Stable release of L2 implementation mapping for Multi-Angle Review & Decision Synthesis. |
