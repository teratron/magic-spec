# Role Card Registry (Implementation)

**Version:** 2.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Concrete implementation of the role system defined by [l1-role-system.md](l1-role-system.md). Specifies the on-disk location of the registry (`.magic/roles/`), the role card file format (YAML frontmatter + body), and the **inventory index** of all 13 role cards. As of v2.0.0 the full per-card authoring content lives in three focused child specs (token-economy decomposition); this spec is the format/schema authority and the navigation index. Executor/reviewer roles also define the core coding discipline: material assumptions are surfaced, diffs remain traceable to task/spec/verify scope, speculative complexity is rejected, and completion requires explicit verification evidence.

## Card Content Specs

The full canonical authoring source for each card (frontmatter + Mission + Operating Protocol + Anti-patterns) is split by functional cluster:

| Child Spec | Cluster | Cards |
| --- | --- | --- |
| [l2-role-cards-execution.md](l2-role-cards-execution.md) | Plan → coordinate → build → fix → document | `planner`, `orchestrator`, `coder`, `debugger`, `docs-specialist` |
| [l2-role-cards-review.md](l2-role-cards-review.md) | `run.md` inline review gates | `code-reviewer`, `code-simplifier`, `code-skeptic`, `test-engineer` |
| [l2-role-cards-governance.md](l2-role-cards-governance.md) | Cross-workflow governance (migrated C24) | `spec-critic`, `project-auditor`, `constitutional-reviewer`, `retrospective-analyst` |

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept; defines invariants R1-R10.
- [l2-role-cards-execution.md](l2-role-cards-execution.md) - Child: execution-pipeline card content.
- [l2-role-cards-review.md](l2-role-cards-review.md) - Child: run.md review-gate card content.
- [l2-role-cards-governance.md](l2-role-cards-governance.md) - Child: migrated-C24 governance card content.
- [l2-role-integration.md](l2-role-integration.md) - Sibling spec covering workflow-side integration (`run.md`, `task.md`, `RULES.md §C24`, etc.).
- [l2-engine-automation.md](l2-engine-automation.md) - Engine scripts (checksums, update-engine-meta) that govern role card distribution.

## Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| **R1 — Flat Registry with Layer Attribute** | All role cards placed under `.magic/roles/{id}.md`. No subdirectories. Each card declares `layer:` in frontmatter from closed set `{manager, executor, reviewer, advisor}`. |
| **R2 — Role ≠ Agent; Declarative Handoffs** | Each card has a `handoff:` list of `{to, condition}` entries. Engine does not automate transitions — agents read handoff as contract documentation. |
| **R3 — Explicit Triggers** | Each card has a `triggers:` list of `{workflow, gate}` entries referencing `.magic/*.md` files and named gates. Cards without triggers are rejected by the `check-prerequisites` role audit (see l2-role-tooling.md §1). |
| **R4 — Orchestration Context Is Not a Role** | Only `orchestrator` is `layer: manager` and activates in Parallel mode. No `developer` card exists. `run.md` Execution Setup table renames Manager→Orchestrator and removes Developer row (replaced by "Track Owner Context" prose). |
| **R5 — Self-Contained Contract** | Every card contains sections `## Mission`, `## Operating Protocol`, `## Anti-patterns`. The child Card Content Specs hold the full per-card content. |
| **R6 — Skills Linkage Advisory Only** | `skills_recommended:` frontmatter field lists skill names as strings. Engine never invokes skills automatically based on role activation. Workflow bodies may suggest the skill as a hint. |
| **R7 — C24 Backward Compatibility** | 4 legacy personas migrated to cards: `spec-critic`, `project-auditor`, `constitutional-reviewer`, `retrospective-analyst`. Gate positions preserved. `Tester` renamed to `test-engineer`. `Planning Skeptic` absorbed into `planner`. |
| **R8 — Versioned via Engine** | `.magic/roles/*.md` files are registered in `.magic/.checksums` by `update-engine-meta`. Any card edit bumps the engine patch version. |
| **R9 — No Silent Dropout** | `check-prerequisites` gains a `role_registry_integrity` check that enumerates triggers referenced by workflows and verifies each `@role:{id}` resolves. Unresolved → `ROLE_MISSING` HALT. |
| **R10 — Read-Only from Projects** | Cards live under `.magic/` (read-only from user projects per `CLAUDE.md §1.1`). No opt-in extension mechanism in this version; future L2 may define `.design/{ws}/roles/` overlay. |

## 1. File Format

### 1.1 Location and Naming

- **Directory**: `.magic/roles/` (flat; no subdirectories).
- **Filename**: `{id}.md` where `id` is kebab-case ASCII.
- **Encoding**: UTF-8, LF line endings (per engine convention).

### 1.2 Frontmatter Schema

```yaml
---
id: {kebab-case-id}                    # Required. Matches filename without .md
name: {Human-Readable Name}            # Required. Title Case
layer: {manager|executor|reviewer|advisor}  # Required. Closed vocabulary (R1)
triggers:                              # Required. At least one entry (R3)
  - workflow: {workflow-file.md}       # Path relative to .magic/
    gate: "{named gate or step}"       # Free-form string identifying the gate
outputs:                               # Required. At least one entry
  - type: {code|diff-review|qa-report|plan|docs|fix|audit-report|...}
    scope: "{what the output covers}"
handoff:                               # Required. May be empty list for terminal roles
  - to: {target-role-id}
    condition: "{condition that triggers handoff}"
skills_recommended:                    # Optional. Advisory (R6)
  - {skill-name}
related_rules:                         # Optional. Rule IDs (C1-C24, WC1+) the role relates to
  - C{N}
deprecated: false                      # Optional. Defaults to false
---
```

### 1.3 Body Sections

Every role card MUST contain, in order:

1. **`# {Name}`** — h1 heading matching frontmatter `name`.
2. **`## Mission`** — one paragraph (3-5 sentences) stating the role's purpose and when it is active.
3. **`## Operating Protocol`** — ordered list or numbered subsections describing what the role does step-by-step while active.
4. **`## Anti-patterns`** — unordered list of behaviors the role MUST NOT exhibit.

Cards MAY include additional sections after these four (e.g., `## Examples`, `## Handoff Examples`), but the four above are mandatory.

## 2. Role Inventory (Card Index)

| id | layer | Triggers (workflow → gate) | Content Spec |
| --- | --- | --- | --- |
| `orchestrator` | manager | `run.md` → Parallel Mode Dispatch | execution |
| `planner` | advisor | `task.md` → Plan Write-back | execution |
| `coder` | executor | `run.md` → Step 3 Execute | execution |
| `code-reviewer` | reviewer | `run.md` → Step 3.4 Diff Review (new) | review |
| `code-simplifier` | reviewer | `run.md` → Step 3.6 Simplify Pass (new, opt-in) | review |
| `code-skeptic` | reviewer | `run.md` → Step 3.3 Decision Review (new, opt-in) | review |
| `test-engineer` | reviewer | `run.md` → Step 3.5 QA Review (renamed from C24 Tester) | review |
| `debugger` | executor | `run.md` → Blocked Branch (new) | execution |
| `docs-specialist` | executor | `run.md` → Post-Done Docs Sync (new) | execution |
| `spec-critic` | reviewer | `spec.md` → Post-Update Review (migrated C24) | governance |
| `project-auditor` | reviewer | `analyze.md` → Pre-Advisory Audit (migrated C24) | governance |
| `constitutional-reviewer` | reviewer | `rule.md` → Impact Analysis (migrated C24) | governance |
| `retrospective-analyst` | advisor | `retrospective.md` → Signal Calculation (migrated C24) | governance |

> The **Content Spec** column names the child spec (`l2-role-cards-{cluster}.md`) holding each card's full authoring source. Implementation (L2 integration — see l2-role-integration.md) copies each card section verbatim into `.magic/roles/{id}.md`, combining the frontmatter block (§1.2) with the body (§1.3).

## 3. Template

A ready-to-copy template for future role card additions is provided at `.magic/templates/role.md`. The template mirrors §1.2 and §1.3 structure. New cards are authored into the appropriate Card Content Spec (or a new child if a new cluster emerges) and registered in §2.

## 4. Drawbacks & Alternatives

### 4.1 Drawback: 13 Files at Launch

Adding 13 role cards is a one-shot expansion of the engine surface. Mitigation: the expansion replaces inline prose in 6+ workflow files; net browsable surface decreases. See l1-role-system.md §6.1.

### 4.2 Alternative: Single `.magic/roles.md` Aggregated File

Packing all 13 cards into one file. Rejected: violates R1 (flat registry) cannot scale past ~20 roles, and frustrates grep-by-id lookup. One-card-per-file matches existing `.magic/*.md` convention.

### 4.3 Alternative: Single Monolithic Spec

The original v1.x kept all card content in this one spec (~656 lines), which tripped the `SPEC_DECOMPOSE` bloat threshold (>500). Rejected at v2.0.0 in favor of the three-cluster split (execution/review/governance), each focused spec staying well under the bloat threshold while this parent retains the format and index.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROLES-DIR]` | `.magic/roles/` | Registry location; each card is a file `{id}.md`. |
| `[ROLE-TEMPLATE]` | `.magic/templates/role.md` | Template for new role cards; created by integration task. |
| `[RULES-C24]` | `.magic/templates/rules.md` | Source of C24 pointer-table to be regenerated with role IDs. |
| `[CHECKSUMS]` | `.magic/.checksums` | Engine integrity manifest; role cards register here. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 2.0.0 | 2026-06-10 | Structural decomposition (SPEC_DECOMPOSE fix): §3 full card content extracted verbatim into three focused child specs (l2-role-cards-execution/review/governance). This spec retains the file format (§1), role inventory index (§2, with new Content Spec column), template, and drawbacks. Stable retained via Trust Mode re-review (C9). |
| 1.1.0 | 2026-05-12 | Integrated coding discipline into executor/reviewer cards: material assumptions, diff traceability, minimal implementation, and verify-line enforcement. |
| 1.0.0 | 2026-04-23 | Initial Stable. Defines file format, frontmatter schema, body structure, and full content for all 13 initial role cards. |
