---
phase: 4
name: "Prompt Quality Gate — prompt-engineer role deployment"
status: Todo
subsystem: ".magic (roles, workflows, templates)"
requires: [phase-3]
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 4 Tasks — Prompt Quality Gate

**Phase:** 4
**Status:** Todo
**Strategic Goal:** Deploy the `prompt-engineer` role (card #14) and wire its five gates into engine workflow bodies, implementing `l1-prompt-quality-gate.md` per the v2.1.0/v1.1.0 amendments of the role-system L2 specs.

## Atomic Checklist

- [ ] [T-4A01] Create `.magic/roles/prompt-engineer.md` card from governance spec §5
- [ ] [T-4A02] Extend `.magic/templates/rules.md` §C24 pointer table + opt-in list
- [ ] [T-4B01] Wire Instruction Quality Pass into `.magic/spec.md` Post-Update Review
- [ ] [T-4B02] Wire Task Instruction Review into `.magic/task.md` Plan Write-back
- [ ] [T-4B03] Wire Rule Wording Review into `.magic/rule.md` post-verdict flow
- [ ] [T-4C01] Insert conditional Step 3.4b Instruction Diff Review into `.magic/run.md`
- [ ] [T-4C02] Add Prompt Quality Audit dimension to `.magic/analyze.md` Mode C
- [ ] [T-4D01] C14 engine meta update (single bump for all `.magic/` edits)
- [ ] [T-4T01] Validation: role registry integrity 14/14
- [ ] [T-4T02] Validation: engine test harness green

## Detailed Tracking

### [T-4A01] Create `.magic/roles/prompt-engineer.md`

- **Spec:** l2-role-cards-governance.md §5; format per l2-role-cards.md §1
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** file exists; frontmatter parses with `layer: reviewer` and exactly 5 `workflow:` trigger entries; body contains `## Mission`, `## Operating Protocol`, `## Anti-patterns`
- **Handoff:** T-4D01 (checksums registration)
- **Notes:** Copy frontmatter + body verbatim from governance spec §5 (single source).

### [T-4A02] Extend `.magic/templates/rules.md` §C24

- **Spec:** l2-role-integration.md §4.2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -c prompt-engineer .magic/templates/rules.md` returns ≥5 (4 mandatory gate rows + 1 opt-in line)
- **Handoff:** T-4D01
- **Notes:** Template only — the project's own `.design/RULES.md` is user-side and governed by `magic.rule`, out of scope here.

### [T-4B01] `.magic/spec.md` — Instruction Quality Pass

- **Spec:** l2-role-integration.md §3.2 [ADDED v2.1.0]
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Instruction Quality Pass" .magic/spec.md` hits in Post-Update Review section; Task Completion Checklist gains `@role:prompt-engineer` line
- **Handoff:** T-4D01
- **Notes:** Stage runs after `@role:spec-critic` PASS only (PQ-7); FAIL blocks status promotion (PQ-6).

### [T-4B02] `.magic/task.md` — Task Instruction Review

- **Spec:** l2-role-integration.md §3.1 [ADDED v2.1.0]
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Task Instruction Review" .magic/task.md` hits between Planning Audit and Plan Write-back; checklist gains instruction-quality line
- **Handoff:** T-4D01
- **Notes:** Reviews task descriptions, `Verify` lines, phase notes — the instruction text run.md executors receive.

### [T-4B03] `.magic/rule.md` — Rule Wording Review

- **Spec:** l2-role-integration.md §3.4 [ADDED v2.1.0]
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Rule Wording Review" .magic/rule.md` hits after constitutional verdict step, before rule write
- **Handoff:** T-4D01
- **Notes:** constitutional-reviewer owns conflict-of-meaning; prompt-engineer owns clarity-of-wording (PQ-7, no overlap).

### [T-4C01] `.magic/run.md` — Step 3.4b conditional gate

- **Spec:** l2-role-integration.md §2.8a [ADDED v2.1.0]
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "3.4b" .magic/run.md` hits between Step 3.4 and Step 3.5; trigger condition references AI-facing artifact classes (PQ-1)
- **Handoff:** T-4D01
- **Notes:** Conditional — diffs touching only non-instruction code/data skip silently.

### [T-4C02] `.magic/analyze.md` — Prompt Quality Audit

- **Spec:** l2-role-integration.md §3.3 [ADDED v2.1.0]
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Prompt Quality Audit" .magic/analyze.md` hits inside Mode C; findings route into project-auditor pre-advisory pool
- **Handoff:** T-4D01
- **Notes:** Audit-mode is advisory only — no artifact rewrites during ventilation (Actionable Guard preserved).

### [T-4D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow spec,task,rule,run,analyze` exits 0; `.magic/.version` patch-bumped; `.magic/.checksums` includes `roles/prompt-engineer.md`
- **Handoff:** T-4T01
- **Notes:** Single serialized bump after ALL `.magic/` edits (shared-resource bottleneck by design). Skill wrappers auto-synced by the command.

### [T-4T01] Validation: Role Registry Integrity

- **Goal:** Verify card #14 resolves and all workflow references are wired.
- **Method:** `node .magic/scripts/executor.js check-prerequisites --json --workspace engine`
- **Verify:** `role_registry.total: 14`, `referenced: 14`, `dormant: 0`, `missing: []`, `dangling_handoffs: []`
- **Status:** Todo

### [T-4T02] Validation: Engine Test Harness

- **Goal:** Verify no regression in engine cognitive/structural tests after workflow-body edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions reported
- **Status:** Todo
