# Role System Engine Tooling

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Engine-side tooling that supports the role registry: the `role_registry_integrity` pre-flight check added to `check-prerequisites`, the `update-engine-meta` checksum/versioning treatment of role cards, and the `role.md` authoring template shipped with the engine. Extracted verbatim from [l2-role-integration.md](l2-role-integration.md) §5–§7 during the v2.0.0 decomposition so the parent stays focused on workflow-body wiring while this spec owns the validation/versioning/scaffolding mechanism.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept; this spec implements R8 (Engine Versioning) and R9 (No Silent Dropout).
- [l2-role-integration.md](l2-role-integration.md) - Sibling: how roles wire into workflow bodies and the `RULES.md §C24` constitution.
- [l2-role-cards.md](l2-role-cards.md) - Role card content and frontmatter format (the cards this tooling validates and versions).
- [l2-engine-automation.md](l2-engine-automation.md) - Host spec for `check-prerequisites`, `update-engine-meta`, and checksum logic.

## Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| **R8 — Engine Versioning** | `update-engine-meta` (§2) includes `.magic/roles/*.md` in checksum computation and patch-bump logic. |
| **R9 — No Silent Dropout** | `check-prerequisites` gains the `role_registry_integrity` check (§1) that enumerates role references and HALTs on unresolved IDs. |

## 1. `check-prerequisites` Addition

### 1.1 New Check: `role_registry_integrity`

Added to the pre-flight script (`.magic/scripts/check-prerequisites.js` via `executor.js` dispatcher).

**Algorithm:**

1. Enumerate all files under `.magic/roles/` matching `*.md`. Parse frontmatter; extract `id` field. Build role-ID set `R`.
2. For each workflow file in `.magic/*.md`, grep for `@role:{id}` references. Collect the set of referenced IDs `W`.
3. Compute `W \ R` (referenced but not registered). Emit each as `ROLE_MISSING` with workflow file and role ID.
4. Emit warnings (not halts) for `R \ W` (registered but unreferenced) — these are dormant roles, not errors. Format: `ROLE_DORMANT: {id}`.
5. Parse each card's `handoff.to` field. Any `to:` target not in `R` → `ROLE_HANDOFF_DANGLING` HALT.

**JSON output addition:**

```json
{
  "role_registry": {
    "total": 13,
    "referenced": 13,
    "dormant": 0,
    "missing": [],
    "dangling_handoffs": []
  }
}
```

### 1.2 Failure Modes

| Code | Severity | Meaning |
| --- | --- | --- |
| `ROLE_MISSING` | HALT | Workflow references `@role:{id}` but card file does not exist. |
| `ROLE_HANDOFF_DANGLING` | HALT | Card's `handoff.to` points at an id not present in the registry. |
| `ROLE_DORMANT` | WARN | Card exists but no workflow references it. |
| `ROLE_TRIGGER_UNRESOLVED` | WARN | Card declares `triggers.workflow` that does not exist under `.magic/`. |

## 2. `update-engine-meta` Treatment

### 2.1 Checksum Coverage

`.magic/scripts/update-engine-meta.js` is extended:

1. `.magic/roles/*.md` files are hashed and registered in `.magic/.checksums` under a new `roles:` section.
2. Any modification to a role card triggers the same patch-version bump as modification to workflow files.
3. The `--workflow` argument gains a `roles` value: `node .magic/scripts/executor.js update-engine-meta --workflow roles` runs when role cards change (synonym-acceptable with `run`/`spec`/etc.).

### 2.2 Smart History Classification

Role card additions, renames, and semantic changes are recorded in `.magic/history/` with category `roles`. Smart-history deduplication (redundant automated entries skipped) applies as for workflows.

## 3. Template File

New file `.magic/templates/role.md` distributed with the engine. Content:

```markdown
---
id: {kebab-case-id}
name: {Human-Readable Name}
layer: {manager|executor|reviewer|advisor}
triggers:
  - workflow: {workflow-file.md}
    gate: "{named gate}"
outputs:
  - type: {output-type}
    scope: "{what the output covers}"
handoff:
  - to: {target-role-id}
    condition: "{condition}"
skills_recommended: []
related_rules: []
deprecated: false
---

# {Name}

## Mission

{3-5 sentences stating purpose and when active.}

## Operating Protocol

1. {Step 1 — what the role does first.}
2. {Step 2 — ...}
3. {Step 3 — ...}

## Anti-patterns

- {What the role MUST NOT do.}
- {Another anti-pattern.}
```

## 4. Drawbacks & Alternatives

### 4.1 Drawback: New `check-prerequisites` Surface

Adding `role_registry_integrity` expands the pre-flight surface. Mitigation: the check is O(workflows × cards) on a small constant (≤20 workflows, ≤20 cards) — negligible runtime.

### 4.2 Alternative: Hard-Coded Role Index

Maintaining a single JSON manifest of role IDs (e.g., `.magic/roles/index.json`) instead of auto-discovery via directory scan. Rejected: directory scan matches the existing `.magic/*.md` discovery pattern (workflows themselves are discovered by scanning, not indexed). Adding a manifest creates a drift-prone duplicate source of truth.

### 4.3 Alternative: Auto-Wire Skills on Role Activation

Automatically invoking `skills_recommended` when a role activates. Rejected: violates R6 (advisory only), couples role system to skill discovery, and risks silent behavior change if a skill is updated.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CHECK-PREREQ]` | `.magic/scripts/check-prerequisites.js` | Recipient of the `role_registry_integrity` check. |
| `[UPDATE-META]` | `.magic/scripts/update-engine-meta.js` | Recipient of role-card checksum / patch-bump logic. |
| `[ROLE-TPL]` | `.magic/templates/role.md` | Role card authoring template shipped with the engine. |
| `[ROLES-DIR]` | `.magic/roles/` | Registry scanned by the integrity check. |
| `[CHECKSUMS]` | `.magic/.checksums` | Manifest where role-card hashes are registered. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-06-10 | Initial Stable. Extracted engine-tooling content (check-prerequisites `role_registry_integrity`, update-engine-meta treatment, role template, tooling drawbacks) verbatim from l2-role-integration.md §5–§7/§9 during the v2.0.0 decomposition. |
