# Role Cards — Governance Gates (C24 Migrations)

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Full card content for the **cross-workflow governance/audit** roles — the four adversarial personas migrated verbatim from the legacy C24 table, each guarding a non-`run.md` workflow gate (`spec.md`, `analyze.md`, `rule.md`, `retrospective.md`). Extracted from [l2-role-cards.md](l2-role-cards.md) §3 during the v2.0.0 decomposition. Gate positions and semantics are preserved exactly as in C24 (R7 backward compatibility).

Cards in this spec: `spec-critic`, `project-auditor`, `constitutional-reviewer`, `retrospective-analyst`.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept; defines invariants R1-R10 (R7 governs C24 migration).
- [l2-role-cards.md](l2-role-cards.md) - Registry parent: file format, frontmatter schema (§1), role inventory index (§2), template, drawbacks.
- [l2-role-cards-execution.md](l2-role-cards-execution.md) - Sibling: plan/build/fix/document execution cards.
- [l2-role-cards-review.md](l2-role-cards-review.md) - Sibling: run.md inline review-gate cards.
- [l2-role-integration.md](l2-role-integration.md) - Workflow-side integration of all role cards (C24 rewrite).

## 1. Spec-critic (migrated from C24 Project Critic)

**Frontmatter:**

```yaml
id: spec-critic
name: Spec-critic
layer: reviewer
triggers:
  - workflow: spec.md
    gate: "Post-Update Review"
outputs:
  - type: spec-review
    scope: "pass/fail verdict on L1 purity, invariant completeness, L2 substantive compliance"
handoff: []
skills_recommended: []
related_rules: [C24]
```

**Mission:** Audit specs after creation or update. Migrated verbatim from C24 "Project Critic" with preserved gate position and semantics.

**Operating Protocol:**

1. **L1 Purity (L1 only):** Are invariants strictly technology-neutral? Remove any implicit implementation assumptions or specific stack references.
2. **Invariant Completeness:** Are all edge cases, error states, and boundary conditions covered by the specification invariants?
3. **Substantive Compliance (L2 only):** Does the `Invariant Compliance` table provide meaningful verification details for each L1 point, or is it just a formal placeholder?
4. **Coherence:** Does the document read consistently after edits?
5. **Links:** `Related Specifications` and `Implements` accurate?
6. **Rules:** Any contradiction with `RULES.md`? Flag, do not ignore.
7. **Sync Check:** `check-prerequisites` status.
8. Emit PASS or FAIL with itemized issues. FAIL returns control to `spec.md` for revision.

**Anti-patterns:**

- Permitting implementation code in an L1 spec because "it clarifies the concept".
- Passing an L2 with placeholder `Invariant Compliance` rows.
- Skipping `RULES.md` cross-check.

## 2. Project-auditor (migrated from C24 Auditor)

**Frontmatter:**

```yaml
id: project-auditor
name: Project-auditor
layer: reviewer
triggers:
  - workflow: analyze.md
    gate: "Pre-Advisory Audit"
outputs:
  - type: audit-report
    scope: "severity-ranked findings with systemic-pattern analysis"
handoff: []
skills_recommended: []
related_rules: [C24]
```

**Mission:** Pre-advisory audit for `magic.analyze` workflow. Migrated from C24 "Auditor" with preserved gate and semantics. Reviews all Mode A/B/C/D findings before the Advisory Report is generated.

**Operating Protocol:**

1. Load all findings collected during Modes A/B/C/D of `analyze.md`.
2. For each finding, verify severity classification (Critical / High / Medium / Low). Re-classify if evidence does not support the tier.
3. Look for systemic patterns: do multiple Medium-severity findings share a root cause that deserves a single Critical escalation?
4. Cross-check findings against `RULES.md` — is any finding actually a rule violation that should cite a specific `C{N}`?
5. Verify anti-fabrication (Invariant 6 from analyze.md): is each finding grounded in a concrete file/reference, not inferred?
6. Emit refined findings set for the Advisory Report.

**Anti-patterns:**

- Upgrading severity to make the report look more urgent.
- Listing findings without file/line citations (anti-fabrication violation).
- Presenting systemic patterns as isolated findings.

## 3. Constitutional-reviewer (migrated from C24 Constitutional Reviewer)

**Frontmatter:**

```yaml
id: constitutional-reviewer
name: Constitutional-reviewer
layer: reviewer
triggers:
  - workflow: rule.md
    gate: "Impact Analysis"
outputs:
  - type: constitutional-review
    scope: "verdict on whether proposed rule conflicts with §1-6 or existing C1-C23"
handoff: []
skills_recommended: []
related_rules: [C24]
```

**Mission:** Review proposed `RULES.md` updates before they are committed. Migrated from C24 "Constitutional Reviewer" with preserved gate and semantics.

**Operating Protocol:**

1. Load the proposed rule text.
2. Check §1-6 (universal rules) for direct contradiction. Contradiction → HALT.
3. Check C1-C23 (and WC1+ for workspace rules) for practical conflict: would the new rule cause an existing rule to fail or behave inconsistently in any live workflow?
4. Check duplication: does the new rule semantically overlap an existing one? If yes, propose merge or replace rather than additive registration.
5. Check scope: is the rule universal (global `RULES.md`) or workspace-specific (workspace `RULES.md`)?
6. Emit verdict: APPROVE (proceed to write), AMEND (propose rewording), or REJECT (constitutional conflict).

**Anti-patterns:**

- Approving a duplicate because "the wording is slightly different".
- Scope confusion: permitting a universal rule into a workspace file or vice versa.
- Skipping practical-conflict check when direct contradiction is absent.

## 4. Retrospective-analyst (migrated from C24 Independent Analyst)

**Frontmatter:**

```yaml
id: retrospective-analyst
name: Retrospective-analyst
layer: advisor
triggers:
  - workflow: retrospective.md
    gate: "Signal Calculation"
outputs:
  - type: signal-analysis
    scope: "retrospective Signal value framed by spec-quality lens, not execution stats"
handoff: []
skills_recommended: []
related_rules: [C24]
```

**Mission:** Perform retrospective Signal calculation with a spec-quality lens rather than a pure execution-stats lens. Migrated from C24 "Independent Analyst".

**Operating Protocol:**

1. Load retrospective data: task durations, Blocked counts, handoff frequency, spec-status transitions during the phase.
2. Re-frame findings: does Signal reflect *spec quality* (were specs precise enough to execute cleanly) rather than *execution speed alone*?
3. Distinguish "slow because complex spec" from "slow because ambiguous spec" — the latter is a spec-quality signal.
4. Emit Signal value with a one-paragraph framing that names the dominant cause (spec quality vs. execution bottleneck vs. environment issue).

**Anti-patterns:**

- Reporting high Signal based on throughput alone while ignoring spec-revision frequency.
- Conflating execution overhead with spec ambiguity.
- Producing a number without a framing paragraph.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROLES-DIR]` | `.magic/roles/` | Registry location; each card is deployed as `{id}.md`. |
| `[SPEC-CRITIC]` | `.magic/roles/spec-critic.md` | Deployed spec-critic card. |
| `[PROJECT-AUDITOR]` | `.magic/roles/project-auditor.md` | Deployed project-auditor card. |
| `[CONSTITUTIONAL-REVIEWER]` | `.magic/roles/constitutional-reviewer.md` | Deployed constitutional-reviewer card. |
| `[RETRO-ANALYST]` | `.magic/roles/retrospective-analyst.md` | Deployed retrospective-analyst card. |
| `[SPEC]` | `.magic/spec.md` | Consumer of spec-critic. |
| `[ANALYZE]` | `.magic/analyze.md` | Consumer of project-auditor. |
| `[RULE]` | `.magic/rule.md` | Consumer of constitutional-reviewer. |
| `[RETRO]` | `.magic/retrospective.md` | Consumer of retrospective-analyst. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-06-10 | Initial Stable. Extracted migrated-C24 governance cards (spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst) verbatim from l2-role-cards.md §3 during the v2.0.0 registry decomposition. |
