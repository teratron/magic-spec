# Engine Workspace Changelog

## Phase 6 — 2026-06-12

- Added §6 "SDD Reference Containment" to user-side `rules/magic.md`: one-way traceability rule (SDD artifacts reference code, never the reverse), forbidden reference classes, exemptions, BAD/GOOD example, enforcement map; Completion Protocol renumbered §6→§7 with a new containment checklist line; recreated the broken `.agents/rules/magic.md` hardlink.
- Coder card (`.magic/roles/coder.md`): containment authoring gate inserted as protocol step 6 + anti-pattern — no SDD-artifact references in code, comments, docstrings, identifiers, string literals, or test names.
- Code-reviewer card (`.magic/roles/code-reviewer.md`): containment check inserted as protocol step 4 + anti-pattern — any SDD-layer reference in a product-file diff is FAIL; internal minimalism cross-reference renumbered.
- Ventilation (`.magic/analyze.md`): Mode C gained step 6 "SDD Reference Containment Scan" emitting advisory `SDD_REFERENCE_LEAK {file}:{line}` findings; "SDD Leak" row added to the Findings Schema; both Mode C checklists extended.
- Engine version 2.1.30 → 2.1.31 (C14): checksums regenerated (63 files), skill wrappers re-projected.
- Validation: containment-gate simulation passed (authoring forbid + review FAIL + repo scan clean outside exempt zones); engine test harness 12/12 green.
- Follow-up surfaced (not fixed, out of phase scope): shipped `analyze.md`/`spec.md`/`task.md` link to `.design/engine/specifications/l2-spec-graph-memory.md` — dead on consumer installs; same violation class, needs its own task.

## Phase 4 — 2026-05-12

- Integrated coding discipline from the local reference into `.magic/roles/`: Coder now surfaces material assumptions and writes minimal diffs; Code-reviewer enforces traceability; Code-simplifier rejects speculative complexity; Code-skeptic classifies material assumptions; Test-engineer requires explicit `Verify` evidence.
- Added mandatory `Verify` criteria to `.magic/task.md` decomposition and `.magic/templates/phase.md` task blocks.
- Added explicit `Verify Criterion` guard to `.magic/run.md` QA Review so the execution workflow mirrors the role-card requirement directly.
- Updated engine specs `l2-role-cards.md`, `l2-role-integration.md`, and `l2-engine-templates.md`; registry versions synchronized in `.design/engine/INDEX.md`.

## Phase 3 — 2026-04-23

- Created `.magic/roles/` directory with 13 role cards: orchestrator, planner, coder, code-reviewer, code-simplifier, code-skeptic, test-engineer, debugger, docs-specialist, spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst
- Created `.magic/templates/role.md` authoring template with YAML frontmatter schema
- Amended `.magic/run.md`: rewrote Execution Setup table (Manager→Orchestrator, Developer→Track Owner Context), added gates 3.3/3.4/3.6, `@role:coder`, `@role:code-reviewer`, `@role:code-simplifier`, `@role:code-skeptic`, `@role:debugger`, `@role:docs-specialist`, `@role:test-engineer`, updated Run Completion Checklist; fixed "Developer track / Manager role" → "Track Owner / @role:orchestrator"
- Amended `.magic/task.md`: "Planning Skeptic persona" → `@role:planner`; updated Task Completion Checklist
- Amended `.magic/spec.md`: "Project Critic persona" → `@role:spec-critic`; updated Task Completion Checklist
- Amended `.magic/analyze.md`: "Auditor persona" → `@role:project-auditor`; updated Pre-Advisory Audit heading and both checklist lines
- Amended `.magic/rule.md`: "Constitutional Reviewer persona" → `@role:constitutional-reviewer`; updated section header and Post-Write checklist
- Amended `.magic/retrospective.md`: "Independent Analyst persona" → `@role:retrospective-analyst`; updated section header and Retro Checklist
- Rewrote `.magic/templates/rules.md` §C24 as role-registry pointer-table; bumped template to v1.3.0
- Extended `.magic/scripts/check-prerequisites.js` with `role_registry_integrity` block (ROLE_MISSING/ROLE_HANDOFF_DANGLING HALT; ROLE_DORMANT/ROLE_TRIGGER_UNRESOLVED WARN)
- Extended `.magic/scripts/update-engine-meta.js` with role-card history collapsing (`roles/*` → `roles` category)
- Engine version bumped: 1.5.182 → 1.5.183; all 13 role cards registered in `.checksums`
- `check-prerequisites` validation: `role_registry.total=13`, `missing=[]`, `dangling_handoffs=[]` ✓
