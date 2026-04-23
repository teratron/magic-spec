---
phase: 3
name: "Unified Role System"
status: Done
subsystem: ".magic/roles, .magic/templates, .magic/scripts, .magic (workflows)"
requires:
  - l1-role-system.md
  - l2-role-cards.md
  - l2-role-integration.md
provides:
  - "13 role cards in .magic/roles/ (orchestrator, planner, coder, code-reviewer, code-simplifier, code-skeptic, test-engineer, debugger, docs-specialist, spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst)"
  - "role.md authoring template in .magic/templates/"
  - "@role:{id} references wired into run.md, task.md, spec.md, analyze.md, rule.md, retrospective.md"
  - "role_registry_integrity check in check-prerequisites.js (ROLE_MISSING / ROLE_HANDOFF_DANGLING / ROLE_DORMANT)"
  - "Role-card history collapse in update-engine-meta.js (roles/* → roles category)"
  - "C24 rewritten as role-registry pointer-table in templates/rules.md v1.3.0"
key_files:
  created:
    - .magic/roles/orchestrator.md
    - .magic/roles/planner.md
    - .magic/roles/coder.md
    - .magic/roles/code-reviewer.md
    - .magic/roles/code-simplifier.md
    - .magic/roles/code-skeptic.md
    - .magic/roles/test-engineer.md
    - .magic/roles/debugger.md
    - .magic/roles/docs-specialist.md
    - .magic/roles/spec-critic.md
    - .magic/roles/project-auditor.md
    - .magic/roles/constitutional-reviewer.md
    - .magic/roles/retrospective-analyst.md
    - .magic/templates/role.md
  modified:
    - .magic/run.md
    - .magic/task.md
    - .magic/spec.md
    - .magic/analyze.md
    - .magic/rule.md
    - .magic/retrospective.md
    - .magic/templates/rules.md
    - .magic/scripts/check-prerequisites.js
    - .magic/scripts/update-engine-meta.js
patterns_established:
  - "Flat role registry: .magic/roles/{id}.md as canonical persona cards with YAML frontmatter"
  - "@role:{id} activation syntax for workflow gate references"
  - "layer taxonomy: manager | executor | reviewer | advisor"
  - "Role ≠ Agent: one agent wears multiple roles sequentially as hats"
  - "role_registry_integrity pre-flight check: ROLE_MISSING and ROLE_HANDOFF_DANGLING are HALT-level errors"
  - "Role-card history collapsing: all roles/* entries collapse to single roles category in engine meta"
duration_minutes: ~
---

# Stage 3 Tasks — Unified Role System

**Phase:** 3
**Status:** Done
**Strategic Goal:** Ship `.magic/roles/` as the canonical registry of 13 agent personas, migrate C24 to a pointer-table, and wire `@role:{id}` references into all SDD workflows.

## Atomic Checklist

- [x] [T-3A01] Create `.magic/templates/role.md` authoring template
- [x] [T-3A02] Author 13 role cards under `.magic/roles/`
- [x] [T-3B01] Amend `.magic/run.md` (8 gate updates per integration §2)
- [x] [T-3C01] Amend `.magic/task.md` (Planning Skeptic → @role:planner)
- [x] [T-3C02] Amend `.magic/spec.md` (Project Critic → @role:spec-critic)
- [x] [T-3C03] Amend `.magic/analyze.md` (Auditor → @role:project-auditor)
- [x] [T-3C04] Amend `.magic/rule.md` (Constitutional Reviewer → @role:constitutional-reviewer)
- [x] [T-3C05] Amend `.magic/retrospective.md` (Independent Analyst → @role:retrospective-analyst)
- [x] [T-3D01] Rewrite `.magic/templates/rules.md` §C24 as role-registry pointer-table
- [x] [T-3E01] Extend `.magic/scripts/check-prerequisites.js` with `role_registry_integrity`
- [x] [T-3E02] Extend `.magic/scripts/update-engine-meta.js` with role-card checksum logic
- [x] [T-3T01] Validation — run update-engine-meta; verify `.checksums` registers all 13 cards
- [x] [T-3T02] Validation — run check-prerequisites; verify `role_registry_integrity` JSON block

## Detailed Tracking

### [T-3A01] Create role.md template

- **Spec:** l2-role-integration.md §7
- **Status:** Done
- **Assignment:** Agent
- **Handoff:** T-3A02 can reference structure.
- **Notes:** Content verbatim from integration spec §7. Frontmatter schema from l2-role-cards.md §1.2.

### [T-3A02] Author 13 role cards

- **Spec:** l2-role-cards.md §3 (sub-sections 3.1–3.13)
- **Status:** Done
- **Assignment:** Agent
- **Handoff:** Required by T-3B01, T-3C01–T-3C05, T-3D01, T-3T02.
- **Notes:** 13 files in `.magic/roles/{id}.md`: orchestrator, planner, coder, code-reviewer, code-simplifier, code-skeptic, test-engineer, debugger, docs-specialist, spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst. Each card = frontmatter (per §1.2) + Mission + Operating Protocol + Anti-patterns (per §1.3). Body content copied verbatim from l2-role-cards.md §3.

### [T-3B01] Amend run.md

- **Spec:** l2-role-integration.md §2 (sub-sections 2.1–2.9)
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Handoff:** Required by T-3T02.
- **Notes:** 9 amendments to single file (serialized). §2.1 Execution Setup table rewrite, §2.2–2.9 step amendments + new gates 3.3/3.4/3.6/Post-Done Docs Sync + Blocked Branch role + Checklist additions.

### [T-3C01] Amend task.md

- **Spec:** l2-role-integration.md §3.1
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Replace "Planning Skeptic persona" wording with @role:planner. Update Task Completion Checklist line.

### [T-3C02] Amend spec.md

- **Spec:** l2-role-integration.md §3.2
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Replace "Project Critic persona" wording with @role:spec-critic. Update Task Completion Checklist line.

### [T-3C03] Amend analyze.md

- **Spec:** l2-role-integration.md §3.3
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Replace "Auditor persona" wording with @role:project-auditor. Update Pre-Advisory Audit checklist line (two occurrences).

### [T-3C04] Amend rule.md

- **Spec:** l2-role-integration.md §3.4
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Replace "Constitutional Reviewer persona" wording with @role:constitutional-reviewer.

### [T-3C05] Amend retrospective.md

- **Spec:** l2-role-integration.md §3.5
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Replace "Independent Analyst persona" wording with @role:retrospective-analyst.

### [T-3D01] Rewrite rules.md §C24

- **Spec:** l2-role-integration.md §4
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02
- **Notes:** Rewrite §C24 as role-registry pointer-table. Append v1.3.0 Document History entry per §4.3.

### [T-3E01] Extend check-prerequisites.js

- **Spec:** l2-role-integration.md §5
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** none (can run in parallel with A/B/C/D)
- **Notes:** Add `role_registry_integrity` check: enumerate `.magic/roles/*.md`, scan workflows for `@role:{id}` references, emit ROLE_MISSING/ROLE_HANDOFF_DANGLING halts, ROLE_DORMANT/ROLE_TRIGGER_UNRESOLVED warnings. JSON block per §5.1. Wire via `executor.js`.

### [T-3E02] Extend update-engine-meta.js

- **Spec:** l2-role-integration.md §6
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** none (parallel with A/B/C/D/E01)
- **Notes:** Hash `.magic/roles/*.md`, register under `roles:` section in `.checksums`. Accept `--workflow roles` argument. Include in patch-bump trigger.

### [T-3T01] Validation — .checksums integrity

- **Spec:** l2-role-integration.md §6.1 + l1-role-system.md R8
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A01, T-3A02, T-3E02
- **Method:** `node .magic/scripts/executor.js update-engine-meta --workflow roles`; then inspect `.magic/.checksums` to confirm all 13 role cards + `role.md` template are registered.
- **Handoff:** T-3T02 after PASS.

### [T-3T02] Validation — role_registry_integrity

- **Spec:** l2-role-integration.md §5 + l1-role-system.md R9
- **Status:** Done
- **Assignment:** Agent
- **Depends on:** T-3A02, T-3B01, T-3C01–T-3C05, T-3D01, T-3E01, T-3T01
- **Method:** `node .magic/scripts/executor.js check-prerequisites --json`; verify JSON output contains `role_registry` block with `missing: []`, `dangling_handoffs: []`, `total: 13`.
- **Handoff:** Phase complete — trigger Retro L1, CHANGELOG, version bump per run.md Step 5.

## Track Assignment (Parallel Mode)

| Track | Tasks | Rationale |
| :--- | :--- | :--- |
| A | T-3A01, T-3A02 | Role cards + template (different files; can parallelize sub-items but kept as one task each for atomicity) |
| B | T-3B01 | `run.md` — single large file; serialized |
| C1 | T-3C01 | `task.md` |
| C2 | T-3C02 | `spec.md` |
| C3 | T-3C03 | `analyze.md` |
| C4 | T-3C04 | `rule.md` |
| C5 | T-3C05 | `retrospective.md` |
| D | T-3D01 | `rules.md` template |
| E1 | T-3E01 | `check-prerequisites.js` (+ `executor.js` wiring) |
| E2 | T-3E02 | `update-engine-meta.js` |
| T | T-3T01, T-3T02 | Validation — sequential after all above |

## Shared-File Conflict Map

No two tasks modify the same file; all tracks are safely parallel once Track A completes.

Exception: `executor.js` is touched only by T-3E01 (dispatcher wiring for the new check) — no conflict with T-3E02.
