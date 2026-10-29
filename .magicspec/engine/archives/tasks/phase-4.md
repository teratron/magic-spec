---
phase: 4
name: "Prompt Quality Gate — prompt-engineer role deployment"
status: Done
subsystem: ".magic (roles, workflows, templates)"
requires: [phase-3]
provides:
  - "prompt-engineer role card #14 (.magic/roles/prompt-engineer.md, 5 workflow triggers)"
  - "Five PQ gates wired: spec.md Instruction Quality Pass, task.md 5a Task Instruction Review, rule.md 5a Rule Wording Review, run.md 3.4b Instruction Diff Review, analyze.md Mode C step 7 Prompt Quality Audit"
  - "templates/rules.md C24 pointer table extended (4 gate rows + opt-in note, registry count 14)"
  - "Engine 2.1.33 (C14 bump, 64-file checksums, skill wrappers synced)"
key_files:
  created:
    - ".magic/roles/prompt-engineer.md"
  modified:
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/rule.md"
    - ".magic/run.md"
    - ".magic/analyze.md"
    - ".magic/templates/rules.md"
patterns_established:
  - "Fractional step IDs (5a, 3.4b) for gate insertion without renumbering cross-referenced integer steps"
duration_minutes: ~
---

# Stage 4 Tasks — Prompt Quality Gate

**Phase:** 4
**Status:** Done
**Strategic Goal:** Deploy the `prompt-engineer` role (card #14) and wire its five gates into engine workflow bodies, implementing `l1-prompt-quality-gate.md` per the v2.1.0/v1.1.0 amendments of the role-system L2 specs.

## Atomic Checklist

- [x] [T-4A01] Create `.magic/roles/prompt-engineer.md` card from governance spec §5
- [x] [T-4A02] Extend `.magic/templates/rules.md` §C24 pointer table + opt-in list
- [x] [T-4B01] Wire Instruction Quality Pass into `.magic/spec.md` Post-Update Review
- [x] [T-4B02] Wire Task Instruction Review into `.magic/task.md` Plan Write-back
- [x] [T-4B03] Wire Rule Wording Review into `.magic/rule.md` post-verdict flow
- [x] [T-4C01] Insert conditional Step 3.4b Instruction Diff Review into `.magic/run.md`
- [x] [T-4C02] Add Prompt Quality Audit dimension to `.magic/analyze.md` Mode C
- [x] [T-4D01] C14 engine meta update (single bump for all `.magic/` edits)
- [x] [T-4T01] Validation: role registry integrity 14/14
- [x] [T-4T02] Validation: engine test harness green

## Detailed Tracking

### [T-4A01] Create `.magic/roles/prompt-engineer.md`

- **Spec:** l2-role-cards-governance.md §5; format per l2-role-cards.md §1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** file exists; frontmatter parses with `layer: reviewer` and exactly 5 `workflow:` trigger entries; body contains `## Mission`, `## Operating Protocol`, `## Anti-patterns`
- **Handoff:** T-4D01 (checksums registration)
- **Notes:** Copy frontmatter + body verbatim from governance spec §5 (single source).
- **Changes:** Card created verbatim from spec §5 + `deprecated: false` registry field; 5 triggers, Mission/Protocol/Anti-patterns sections; RC-9 clean (PQ-labels only).

### [T-4A02] Extend `.magic/templates/rules.md` §C24

- **Spec:** l2-role-integration.md §4.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -c prompt-engineer .magic/templates/rules.md` returns ≥5 (4 mandatory gate rows + 1 opt-in line)
- **Handoff:** T-4D01
- **Notes:** Template only — the project's own `.design/RULES.md` is user-side and governed by `magic.rule`, out of scope here.
- **Changes:** 4 mandatory gate rows + opt-in 3.4b note added to C24 table; registry count 13 → 14; grep count 9 (≥5).

### [T-4B01] `.magic/spec.md` — Instruction Quality Pass

- **Spec:** l2-role-integration.md §3.2 [ADDED v2.1.0]
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Instruction Quality Pass" .magic/spec.md` hits in Post-Update Review section; Task Completion Checklist gains `@role:prompt-engineer` line
- **Handoff:** T-4D01
- **Notes:** Stage runs after `@role:spec-critic` PASS only (PQ-7); FAIL blocks status promotion (PQ-6).
- **Changes:** Instruction Quality Pass paragraph appended to Post-Update Review; checklist line added.

### [T-4B02] `.magic/task.md` — Task Instruction Review

- **Spec:** l2-role-integration.md §3.1 [ADDED v2.1.0]
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Task Instruction Review" .magic/task.md` hits between Planning Audit and Plan Write-back; checklist gains instruction-quality line
- **Handoff:** T-4D01
- **Notes:** Reviews task descriptions, `Verify` lines, phase notes — the instruction text run.md executors receive.
- **Changes:** Inserted as step 5a (fractional ID — integer steps are cross-referenced elsewhere in the file); checklist line added.

### [T-4B03] `.magic/rule.md` — Rule Wording Review

- **Spec:** l2-role-integration.md §3.4 [ADDED v2.1.0]
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Rule Wording Review" .magic/rule.md` hits after constitutional verdict step, before rule write
- **Handoff:** T-4D01
- **Notes:** constitutional-reviewer owns conflict-of-meaning; prompt-engineer owns clarity-of-wording (PQ-7, no overlap).
- **Changes:** Inserted as §5a between Constitutional Review (§5) and Write & Sync (§6).

### [T-4C01] `.magic/run.md` — Step 3.4b conditional gate

- **Spec:** l2-role-integration.md §2.8a [ADDED v2.1.0]
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "3.4b" .magic/run.md` hits between Step 3.4 and Step 3.5; trigger condition references AI-facing artifact classes (PQ-1)
- **Handoff:** T-4D01
- **Notes:** Conditional — diffs touching only non-instruction code/data skip silently.
- **Changes:** Step 3.4b inserted; 3.4 routing updated (clean PASS → 3.4b); gate self-applied to this phase's diff — verdict PASS.

### [T-4C02] `.magic/analyze.md` — Prompt Quality Audit

- **Spec:** l2-role-integration.md §3.3 [ADDED v2.1.0]
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Prompt Quality Audit" .magic/analyze.md` hits inside Mode C; findings route into project-auditor pre-advisory pool
- **Handoff:** T-4D01
- **Notes:** Audit-mode is advisory only — no artifact rewrites during ventilation (Actionable Guard preserved).
- **Changes:** Inserted as Mode C step 7; steps 7-14 renumbered 8-15; both Mode C checklists gained a Prompt Quality Audit line.

### [T-4D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow spec,task,rule,run,analyze` exits 0; `.magic/.version` patch-bumped; `.magic/.checksums` includes `roles/prompt-engineer.md`
- **Handoff:** T-4T01
- **Notes:** Single serialized bump after ALL `.magic/` edits (shared-resource bottleneck by design). Skill wrappers auto-synced by the command.
- **Changes:** Engine 2.1.32 → 2.1.33; checksums 63 → 64 files (prompt-engineer.md registered); wrappers re-projected.

### [T-4T01] Validation: Role Registry Integrity

- **Goal:** Verify card #14 resolves and all workflow references are wired.
- **Method:** `node .magic/scripts/executor.js check-prerequisites --json --workspace engine`
- **Verify:** `role_registry.total: 14`, `referenced: 14`, `dormant: 0`, `missing: []`, `dangling_handoffs: []`
- **Status:** Done
- **Changes:** check-prerequisites: total 14, referenced 14, dormant 0, missing [], dangling_handoffs [] — exact match.

### [T-4T02] Validation: Engine Test Harness

- **Goal:** Verify no regression in engine cognitive/structural tests after workflow-body edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions reported
- **Status:** Done
- **Changes:** 12/12 tests pass, 0 failures.
