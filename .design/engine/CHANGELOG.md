# Engine Workspace Changelog

## Phase 5 — 2026-06-12 (Decision Autonomy)

- Amended `templates/rules.md`: C13 §3 rewritten from halt-and-ask "Zero Assumptions" to "Bounded Ambiguity Resolution" (resolve via C27, halt only at the Escalation Whitelist); appended the C27 section (DA-1..DA-8 operational summary, RC-9-compliant wording).
- Added §7 "Autonomous Decision Protocol (C27 Session Posture)" to user-side `rules/magic.md`: DA-6 session persistence (next step narrated, never asked), DA-4 Decision Record grammar, whitelist summary; Completion Protocol renumbered §7→§8 with a new §7 checklist item; hardlink recreated and validated.
- Wired `Decision Autonomy (C27)` line into the completion checklists of `spec.md`, `task.md`, and `run.md`.
- Bound the C27 anti-pattern line ("Elective questions outside the C27 escalation whitelist (E1-E5) are a protocol violation.") into `templates/role.md` and all 14 role cards.
- Engine version 2.1.33 → 2.1.34 (C14); checksums regenerated (64 files); skill wrappers re-projected.
- Validation: session-evidence simulation — [DR] resolution at elective forks, single-question format at the whitelist gate — both assertions PASS; engine test harness 12/12 green.

## Phase 4 — 2026-06-12 (Prompt Quality Gate)

- Created `.magic/roles/prompt-engineer.md` — role card #14 (reviewer): five workflow triggers, six-dimension PQ-3 protocol, PQ-6 verdict semantics (PASS / PASS-WITH-REWRITES / FAIL).
- Wired five gates into workflow bodies: `spec.md` Post-Update Review gains the Instruction Quality Pass (second stage after spec-critic PASS); `task.md` gains step 5a Task Instruction Review (after planner audit, before write-back); `rule.md` gains §5a Rule Wording Review (after APPROVE, before write); `run.md` gains conditional Step 3.4b Instruction Diff Review (fires only on diffs touching AI-facing instruction artifacts); `analyze.md` Mode C gains step 7 Prompt Quality Audit (advisory sweep feeding the pre-advisory pool; steps renumbered 8-15).
- Extended `templates/rules.md` §C24 pointer table: 4 mandatory prompt-engineer gate rows + opt-in 3.4b note; registry count 13 → 14.
- Engine version 2.1.32 → 2.1.33 (C14); checksums 63 → 64 files; skill wrappers re-projected.
- Validation: role registry integrity 14/14 (0 dormant, 0 missing, 0 dangling); engine test harness 12/12 green. Step 3.4b self-applied to this phase's own diff — verdict PASS.

## Phase 7 — 2026-06-12

- Purged all 15 references to the engine repository's own SDD workspace from shipped engine files per RC-9 (l1-sdd-reference-containment.md v1.1.0), in three classes:
  - **Dead spec links (5)**: `rule.md`, `analyze.md` (×2), `spec.md`, `task.md` — markdown links into `.design/engine/specifications/` replaced with the invalidation rule stated inline.
  - **Baked-in workspace name (3)**: `run.md`, `spec.md`, `rules/magic.md` — phase-journal path generalized to `.design/{ws}/CHANGELOG.md` (consumers do not have an `engine` workspace).
  - **Governance citations (6)**: `context.md`, `init.md` (×2), `spec.md`, `templates/rules.md` (×2) — spec file names replaced with protocol names; WI-labels preserved as stable in-text identifiers.
- Annotated Phase 5 tasks (constitution-template mirroring) with an RC-9 guard so the leak class is not reintroduced.
- Engine version 2.1.31 → 2.1.32 (C14); checksums regenerated, skill wrappers re-projected; `.agents/rules/magic.md` hardlink recreated after the rules edit.
- Validation: containment greps 0/0/0 across `.magic/`, `workflows/`, `skills/`, `rules/` (sole residual hit is the illustrative BAD example, exempt); engine test harness 12/12 green.

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
