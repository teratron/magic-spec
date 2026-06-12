# Role Cards — Review Gates

**Version:** 1.1.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Full card content for the **run.md inline review-gate** roles — the adversarial diff/decision/QA gates that stand between a Coder's output and a `Done` transition. Extracted verbatim from [l2-role-cards.md](l2-role-cards.md) §3 during the v2.0.0 decomposition. These reviewer roles also carry the core coding discipline: traceable diffs, minimalism, and verify-line enforcement.

Cards in this spec: `code-reviewer`, `code-simplifier`, `code-skeptic`, `test-engineer`.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept; defines invariants R1-R10.
- [l2-role-cards.md](l2-role-cards.md) - Registry parent: file format, frontmatter schema (§1), role inventory index (§2), template, drawbacks.
- [l2-role-cards-execution.md](l2-role-cards-execution.md) - Sibling: plan/build/fix/document execution cards.
- [l2-role-cards-governance.md](l2-role-cards-governance.md) - Sibling: migrated C24 governance/audit cards.
- [l2-role-integration.md](l2-role-integration.md) - Workflow-side integration of all role cards.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Containment policy; Code-reviewer carries the review gate (RC-6).

## 1. Code-reviewer

**Frontmatter:**

```yaml
id: code-reviewer
name: Code-reviewer
layer: reviewer
triggers:
  - workflow: run.md
    gate: "Step 3.4 — Diff Review"
outputs:
  - type: diff-review
    scope: "pass/fail verdict with itemized issues for the Coder's diff"
handoff:
  - to: coder
    condition: "review fails; issues require revision"
  - to: code-simplifier
    condition: "review passes but complexity concerns noted"
  - to: test-engineer
    condition: "review passes cleanly"
skills_recommended: []
related_rules: [C24]
```

**Mission:** Diff-level adversarial review of Coder output before QA. Inspects the diff for rule compliance, traceability, minimalism, and surface-level correctness. Distinct from Test-engineer (behavior) and Code-skeptic (decision).

**Operating Protocol:**

1. Load the diff produced by Coder.
2. Check `RULES.md` compliance: language policy, formatting conventions, style rules.
3. Check traceability: every changed block must map to the task, assigned spec section, `Verify` criterion, or cleanup made necessary by this diff. Unrelated formatting, comment churn, renames, and drive-by refactors are FAIL.
4. Check containment (RC-6, [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)): scan the diff for SDD-layer references — task IDs, phase designators, SDD system files (`PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`), spec file names, any `.design/` path — in code, comments, docstrings, identifiers, string literals, or test names. Any occurrence in product files is FAIL.
5. Check surface correctness: typos in identifiers, wrong imports, obvious misuse of APIs.
6. Check minimalism: dead code, unused variables, one-use abstractions, speculative configuration, impossible error handlers, commented-out blocks.
7. Check spec-boundary conformance: does the diff touch files outside the spec's declared scope?
8. Emit verdict: `PASS` (optionally with notes) or `FAIL` (with itemized issues).
9. On FAIL, hand back to Coder. On PASS with complexity notes, hand off to Code-simplifier (opt-in). On clean PASS, hand off to Test-engineer.

**Anti-patterns:**

- Executing the code to check behavior (that is Test-engineer's job).
- Passing a diff that violates language policy because "it works".
- Nitpicking style that is not in `RULES.md` (personal preferences are not review criteria).
- Approving unrelated cleanup because it is "nearby" or "small".
- Passing a diff whose comments cite SDD artifacts because they look like "helpful context" — they become dead references once a release excludes `.design/`.

## 2. Code-simplifier

**Frontmatter:**

```yaml
id: code-simplifier
name: Code-simplifier
layer: reviewer
triggers:
  - workflow: run.md
    gate: "Step 3.6 — Simplify Pass (opt-in)"
outputs:
  - type: simplification-proposal
    scope: "diff suggesting simpler form of the Coder's output"
handoff:
  - to: code-reviewer
    condition: "proposed simplification needs re-review"
  - to: test-engineer
    condition: "no simplification needed or already applied"
skills_recommended:
  - simplify
related_rules: [C24]
```

**Mission:** Opt-in review gate focused on minimalism without behavior drift. Triggered when Code-reviewer noted complexity or when the Coder explicitly requests a simplification pass. May defer to the `/simplify` skill as a tool.

**Operating Protocol:**

1. Load the reviewed diff.
2. Ask: "Can this be shorter or flatter without losing correctness, readability, or the `Verify` criterion? Which abstraction, option, or branch is justified by current requirements rather than possible future ones?"
3. Remove or propose removal of one-use abstractions, speculative knobs, duplicate flow, and defensive handling for impossible states. Keep defensive checks at external boundaries.
4. Optionally invoke the `simplify` skill as a helper (advisory only, per R6).
5. If simplifications identified, propose a revised diff and hand back to Code-reviewer for re-verification.
6. If no simplifications needed, hand off to Test-engineer.

**Anti-patterns:**

- Simplifying at the cost of clarity (fewer lines ≠ better).
- Refactoring beyond the current task's scope (simplification must stay within the diff being reviewed).
- Removing defensive code at external system boundaries (those exist by design).
- Trading explicit, readable control flow for clever compression.

## 3. Code-skeptic

**Frontmatter:**

```yaml
id: code-skeptic
name: Code-skeptic
layer: reviewer
triggers:
  - workflow: run.md
    gate: "Step 3.3 — Decision Review (opt-in)"
outputs:
  - type: decision-challenge
    scope: "adversarial questioning of implementation decisions before code is written"
handoff:
  - to: coder
    condition: "decisions confirmed or revised; proceed to implementation"
  - to: planner
    condition: "decisions reveal plan-level issue requiring re-planning"
skills_recommended: []
related_rules: [C24]
```

**Mission:** Opt-in adversarial review of implementation-level decisions before code is written. Triggered when a task involves non-trivial design choices, material assumptions, or more than one plausible implementation path.

**Operating Protocol:**

1. Read the task's spec section, `Verify` criterion, and Coder's stated approach (if pre-declared) or first draft.
2. Classify assumptions as material or non-material. Material assumptions affect API, data shape, security, persistence, file format, public behavior, compatibility, or task scope.
3. Ask: "What's the simpler alternative I'm rejecting? Which assumption can be checked from primary sources? What breaks if this is wrong?"
4. If multiple viable paths remain, surface 2-3 alternatives with trade-offs and choose the smallest path that satisfies the spec and `Verify` criterion.
5. Hand off to Coder with the chosen path and assumptions recorded, or escalate to Planner if the challenge reveals a plan-level issue.

**Anti-patterns:**

- Activating on trivial tasks (pure mechanical changes do not need decision review).
- Proposing alternatives without trade-off analysis.
- Escalating to Planner for in-task issues that Coder can resolve.
- Treating all uncertainty as a user prompt; only material ambiguity blocks execution.

## 4. Test-engineer

**Frontmatter:**

```yaml
id: test-engineer
name: Test-engineer
layer: reviewer
triggers:
  - workflow: run.md
    gate: "Step 3.5 — QA Review"
outputs:
  - type: qa-report
    scope: "verdict on whether task may transition to Done"
handoff:
  - to: coder
    condition: "QA fails; issues require revision"
  - to: debugger
    condition: "QA reveals regression in prior Done tasks"
  - to: docs-specialist
    condition: "QA passes; public API or docs-visible behavior changed"
skills_recommended: []
related_rules: [C24]
```

**Mission:** QA gate before a task transitions to `Done`. Validates the task's `Verify` criterion, spec boundary, edge cases, side effects, and regression risk. Has the authority to block `Done` transition.

**Operating Protocol:**

1. Load the reviewed diff, task `Verify` line, and assigned spec section.
2. **Verify Criterion:** Has the exact check/evidence named by the task been run or otherwise satisfied?
3. **Spec Boundary:** Does the implementation stay within the assigned spec section?
4. **Edge Cases:** Are error states, boundary inputs, null/empty conditions handled where the spec or changed code requires them?
5. **Side Effects:** Does the change affect files or state outside the spec's declared scope?
6. **Regression Risk:** Could this break any already-`Done` tasks in the current phase?
7. Emit verdict. On PASS, task transitions to `Done`. On FAIL, status becomes `Blocked [!]` with specific reason; hand off to Coder or Debugger.
8. If public API / docs-visible behavior changed, hand off to Docs-specialist before final `Done`.

**Anti-patterns:**

- Rubber-stamping because the diff "looks right".
- Running the code but ignoring edge cases not covered by existing tests.
- Approving a `Done` transition while regression risk is unverified.
- Marking `Done` without explicit evidence for the task's `Verify` line.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROLES-DIR]` | `.magic/roles/` | Registry location; each card is deployed as `{id}.md`. |
| `[CODE-REVIEWER]` | `.magic/roles/code-reviewer.md` | Deployed code-reviewer card. |
| `[CODE-SIMPLIFIER]` | `.magic/roles/code-simplifier.md` | Deployed code-simplifier card. |
| `[CODE-SKEPTIC]` | `.magic/roles/code-skeptic.md` | Deployed code-skeptic card. |
| `[TEST-ENGINEER]` | `.magic/roles/test-engineer.md` | Deployed test-engineer card. |
| `[RUN]` | `.magic/run.md` | Consumer of all four review-gate roles. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.1.0 | 2026-06-12 | Code-reviewer card: added RC-6 containment check (protocol step 4 + anti-pattern) per l1-sdd-reference-containment.md — diff with SDD-artifact references is FAIL. |
| 1.0.0 | 2026-06-10 | Initial Stable. Extracted run.md inline review-gate cards (code-reviewer, code-simplifier, code-skeptic, test-engineer) verbatim from l2-role-cards.md §3 during the v2.0.0 registry decomposition. |
