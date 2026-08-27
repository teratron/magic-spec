# Project Context

**Generated:** 2026-08-27

## Active Technologies

- Unknown (no manifest detected)

## Core Project Structure

```plaintext
.
├── .agents/
│   ├── rules/
│   ├── skills/
│   └── workflows/
├── .design/
│   ├── .version
│   ├── CONTEXT.md
│   ├── INDEX.md
│   ├── RULES.md
│   ├── engine/
│   └── workspace.json
├── .github/
│   └── workflows/
├── .magic/
│   ├── .checksums
│   ├── .version
│   ├── analyze.md
│   ├── context.md
│   ├── init.md
│   ├── pause.md
│   ├── retrospective.md
│   ├── roles/
│   ├── rule.md
│   ├── run.md
│   ├── scripts/
│   ├── spec.md
│   ├── status.md
│   ├── task.md
│   └── templates/
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── README.md
├── dev/
│   ├── scripts/
│   └── tests/
├── docs/
│   ├── README.md
│   ├── analyze.md
│   ├── checksums.md
│   ├── conception.md
│   ├── distribution.md
│   ├── graph.md
│   ├── init.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── run.md
│   ├── simulate.md
│   ├── spec.md
│   ├── status.md
│   └── task.md
├── rules/
│   └── magic.md
├── skills/
│   ├── magic-analyze/
│   ├── magic-graph/
│   ├── magic-rule/
│   ├── magic-run/
│   ├── magic-spec/
│   ├── magic-status/
│   └── magic-task/
└── workflows/
    ├── magic.analyze.md
    ├── magic.graph.md
    ├── magic.rule.md
    ├── magic.run.md
    ├── magic.spec.md
    ├── magic.status.md
    └── magic.task.md
```

## Recent Changes

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
