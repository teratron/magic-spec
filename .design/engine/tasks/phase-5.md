---
phase: 5
name: "Decision Autonomy — C27 protocol deployment"
status: Todo
subsystem: ".magic (templates, workflows, roles) + rules/"
requires: [phase-4]
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 5 Tasks — Decision Autonomy (C27)

**Phase:** 5
**Status:** Todo
**Strategic Goal:** Deploy the Autonomous Decision Protocol (`l1-decision-autonomy.md`) across the engine surface: amend the shipped constitution template (C13 §3 → Bounded Ambiguity Resolution, add C27), propagate DA-6 session posture to workflow completion sections and user-side rules, and bind the protocol to all role cards — eliminating field-reported elective question surveys.

> **Serialization note (planner audit):** Phase 4 and Phase 5 amend the same workflow bodies (`spec.md`, `task.md`, `run.md`, `templates/rules.md`). Phase 5 MUST NOT start before Phase 4 reaches `Done`. Track A precedes Tracks B/C (the C27 text must exist in the template before workflows reference it). C14 bump is a single serialized step (T-5D01), mirroring the proven Phase 4 pattern.

## Atomic Checklist

- [ ] [T-5A01] Amend `.magic/templates/rules.md`: C13 §3 rewording + C27 section
- [ ] [T-5A02] Add C27 session-posture section to user-side `rules/magic.md`
- [ ] [T-5B01] Add `Decision Autonomy (C27)` line + DA-6 narration to `spec.md`/`task.md`/`run.md` completion flows
- [ ] [T-5C01] Bind C27 anti-pattern line into `.magic/templates/role.md` and all role cards
- [ ] [T-5D01] C14 engine meta update (single bump for all `.magic/` edits)
- [ ] [T-5T01] Validation: decision-autonomy simulation (DR vs question behavior)
- [ ] [T-5T02] Validation: engine test harness green

## Detailed Tracking

### [T-5A01] Amend `.magic/templates/rules.md`

- **Spec:** l1-decision-autonomy.md §4.4, §5.2; reference deployment in `.design/RULES.md` v1.8.0
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Bounded Ambiguity Resolution" .magic/templates/rules.md` hits; `grep -c "C27" .magic/templates/rules.md` ≥ 2; `grep "halt and ask" .magic/templates/rules.md` returns no matches
- **Handoff:** T-5B01, T-5C01 (C27 text must exist before references land)
- **Notes:** Mirror the wording already deployed in `.design/RULES.md` C13 §3 + C27 — single source of normative text is the L1 spec §4.4. **RC-9 guard** (l1-sdd-reference-containment.md v1.1.0): when mirroring, replace `Governed in full by l1-decision-autonomy.md` with a protocol-name phrase — shipped template must not cite engine-workspace spec files.

### [T-5A02] User-side `rules/magic.md` — session posture

- **Spec:** l1-decision-autonomy.md §3 DA-6, §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep "Autonomous Decision Protocol" rules/magic.md` hits; new section documents DA-6 (next step computed and narrated between workflows, never asked) and the DA-4 DR grammar
- **Handoff:** T-5D01
- **Notes:** Compact form — operational summary only; full protocol lives in the constitution template. Completion Protocol checklist in the same file gains a §C27 line. **RC-9 guard**: no engine-workspace spec citations in `rules/magic.md`; editing it breaks the `.agents/rules/` hardlink — revalidate via `node dev/scripts/validate-hardlinks.js` after the edit.

### [T-5B01] Workflow completion sections — DA-6 wiring

- **Spec:** l1-decision-autonomy.md §3 DA-6, §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -l "C27" .magic/spec.md .magic/task.md .magic/run.md` lists all 3 files; each Task Completion Checklist gains a `Decision Autonomy (C27)` line; completion flows state "next step is computed and narrated as [DR], never asked"
- **Handoff:** T-5D01
- **Notes:** Wrappers (`workflows/`, `skills/`) auto-synced by T-5D01's update-engine-meta run — do not hand-edit them.

### [T-5C01] Role template + cards — protocol binding

- **Spec:** l1-decision-autonomy.md §5.4; l1-role-system.md R5 (cards self-contained)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -l "C27" .magic/templates/role.md` hits; `grep -rl "C27" .magic/roles/` lists 14 files (incl. `prompt-engineer.md` delivered by Phase 4)
- **Handoff:** T-5D01
- **Notes:** One advisory line in each card's `Anti-patterns` section: "Elective questions outside C27 E1–E5 are a protocol violation." No new role card is created (l1-decision-autonomy.md §6.2 — dispatcher role rejected).

### [T-5D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow spec,task,run` exits 0; `.magic/.version` patch-bumped; `.magic/.checksums` regenerated; skill wrappers auto-synced
- **Handoff:** T-5T01
- **Notes:** Single serialized bump after ALL `.magic/` and `rules/` edits (shared-resource bottleneck by design).

### [T-5T01] Validation: Decision-Autonomy Simulation

- **Goal:** Verify the deployed protocol changes agent behavior at elective forks.
- **Method:** `/magic.dev.simulate` cognitive scenario "decision-autonomy": (a) feed an ambiguous multi-candidate fork — assert the transcript emits a `[DR]` line and zero elective questions; (b) feed an E1 destructive fork — assert exactly one question, ≤3 fixed options, recommended default marked (DA-5).
- **Verify:** simulation transcript recorded in the phase Notes; both assertions pass; no `Should I` / `Would you like` strings in transcript outside the E1 case
- **Status:** Todo

### [T-5T02] Validation: Engine Test Harness

- **Goal:** Verify no regression in engine cognitive/structural tests after template/workflow edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions reported
- **Status:** Todo
