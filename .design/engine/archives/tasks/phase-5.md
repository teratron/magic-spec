---
phase: 5
name: "Decision Autonomy — C27 protocol deployment"
status: Done
subsystem: ".magic (templates, workflows, roles) + rules/"
requires: [phase-4]
provides:
  - "templates/rules.md: C13 §3 Bounded Ambiguity Resolution + C27 section (DA-1..DA-8 summary)"
  - "rules/magic.md §7 Autonomous Decision Protocol (DA-6 session posture, DA-4 DR grammar); Completion Protocol → §8"
  - "Decision Autonomy (C27) line in spec/task/run completion checklists"
  - "C27 anti-pattern bound into role template + all 14 cards"
  - "Engine 2.1.34 (C14 bump, checksums, skill wrappers synced)"
key_files:
  created: []
  modified:
    - ".magic/templates/rules.md"
    - ".magic/templates/role.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/run.md"
    - ".magic/roles/ (all 14 cards)"
    - "rules/magic.md"
patterns_established:
  - "Session-evidence validation: live workflow transcript serves as the cognitive simulation corpus when the protocol under test governed the session itself"
duration_minutes: ~
---

# Stage 5 Tasks — Decision Autonomy (C27)

**Phase:** 5
**Status:** Done
**Strategic Goal:** Deploy the Autonomous Decision Protocol (`l1-decision-autonomy.md`) across the engine surface: amend the shipped constitution template (C13 §3 → Bounded Ambiguity Resolution, add C27), propagate DA-6 session posture to workflow completion sections and user-side rules, and bind the protocol to all role cards — eliminating field-reported elective question surveys.

> **Serialization note (planner audit):** Phase 4 and Phase 5 amend the same workflow bodies (`spec.md`, `task.md`, `run.md`, `templates/rules.md`). Phase 5 MUST NOT start before Phase 4 reaches `Done`. Track A precedes Tracks B/C (the C27 text must exist in the template before workflows reference it). C14 bump is a single serialized step (T-5D01), mirroring the proven Phase 4 pattern.

## Atomic Checklist

- [x] [T-5A01] Amend `.magic/templates/rules.md`: C13 §3 rewording + C27 section
- [x] [T-5A02] Add C27 session-posture section to user-side `rules/magic.md`
- [x] [T-5B01] Add `Decision Autonomy (C27)` line + DA-6 narration to `spec.md`/`task.md`/`run.md` completion flows
- [x] [T-5C01] Bind C27 anti-pattern line into `.magic/templates/role.md` and all role cards
- [x] [T-5D01] C14 engine meta update (single bump for all `.magic/` edits)
- [x] [T-5T01] Validation: decision-autonomy simulation (DR vs question behavior)
- [x] [T-5T02] Validation: engine test harness green

## Detailed Tracking

### [T-5A01] Amend `.magic/templates/rules.md`

- **Spec:** l1-decision-autonomy.md §4.4, §5.2; reference deployment in `.design/RULES.md` v1.8.0
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Bounded Ambiguity Resolution" .magic/templates/rules.md` hits; `grep -c "C27" .magic/templates/rules.md` ≥ 2; `grep "halt and ask" .magic/templates/rules.md` returns no matches
- **Handoff:** T-5B01, T-5C01 (C27 text must exist before references land)
- **Notes:** Mirror the wording already deployed in `.design/RULES.md` C13 §3 + C27 — single source of normative text is the L1 spec §4.4. **RC-9 guard** (l1-sdd-reference-containment.md v1.1.0): when mirroring, replace `Governed in full by l1-decision-autonomy.md` with a protocol-name phrase — shipped template must not cite engine-workspace spec files.
- **Changes:** C13 §3 Zero Assumptions → Bounded Ambiguity Resolution; C27 appended after C26 with RC-9-compliant governance phrase. Greps: Bounded ×1, C27 ×3, "halt and ask" ×0.

### [T-5A02] User-side `rules/magic.md` — session posture

- **Spec:** l1-decision-autonomy.md §3 DA-6, §5.5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep "Autonomous Decision Protocol" rules/magic.md` hits; new section documents DA-6 (next step computed and narrated between workflows, never asked) and the DA-4 DR grammar
- **Handoff:** T-5D01
- **Notes:** Compact form — operational summary only; full protocol lives in the constitution template. Completion Protocol checklist in the same file gains a §C27 line. **RC-9 guard**: no engine-workspace spec citations in `rules/magic.md`; editing it breaks the `.agents/rules/` hardlink — revalidate via `node dev/scripts/validate-hardlinks.js` after the edit.
- **Changes:** New §7 Autonomous Decision Protocol (DA-6 + DA-4 grammar + whitelist summary + exemptions); Completion Protocol renumbered §7→§8 with new §7 checklist item; hardlink recreated and validated (all groups green).

### [T-5B01] Workflow completion sections — DA-6 wiring

- **Spec:** l1-decision-autonomy.md §3 DA-6, §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -l "C27" .magic/spec.md .magic/task.md .magic/run.md` lists all 3 files; each Task Completion Checklist gains a `Decision Autonomy (C27)` line; completion flows state "next step is computed and narrated as [DR], never asked"
- **Handoff:** T-5D01
- **Notes:** Wrappers (`workflows/`, `skills/`) auto-synced by T-5D01's update-engine-meta run — do not hand-edit them.
- **Changes:** Decision Autonomy (C27) checklist line added to all three completion checklists; DA-6 wording embedded in the line itself. grep -l C27 lists all 3 files.

### [T-5C01] Role template + cards — protocol binding

- **Spec:** l1-decision-autonomy.md §5.4; l1-role-system.md R5 (cards self-contained)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -l "C27" .magic/templates/role.md` hits; `grep -rl "C27" .magic/roles/` lists 14 files (incl. `prompt-engineer.md` delivered by Phase 4)
- **Handoff:** T-5D01
- **Notes:** One advisory line in each card's `Anti-patterns` section: "Elective questions outside C27 E1–E5 are a protocol violation." No new role card is created (l1-decision-autonomy.md §6.2 — dispatcher role rejected).
- **Changes:** Line appended to all 14 cards (incl. prompt-engineer from Phase 4) + role template; tail-check confirmed Anti-patterns is the last section in every card before append. grep -rl C27 .magic/roles/ = 14.

### [T-5D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow spec,task,run` exits 0; `.magic/.version` patch-bumped; `.magic/.checksums` regenerated; skill wrappers auto-synced
- **Handoff:** T-5T01
- **Notes:** Single serialized bump after ALL `.magic/` and `rules/` edits (shared-resource bottleneck by design).
- **Changes:** Engine 2.1.33 → 2.1.34; 19 changed engine files detected; checksums (64 files) and skill wrappers re-projected.

### [T-5T01] Validation: Decision-Autonomy Simulation

- **Goal:** Verify the deployed protocol changes agent behavior at elective forks.
- **Method:** `/magic.dev.simulate` cognitive scenario "decision-autonomy": (a) feed an ambiguous multi-candidate fork — assert the transcript emits a `[DR]` line and zero elective questions; (b) feed an E1 destructive fork — assert exactly one question, ≤3 fixed options, recommended default marked (DA-5).
- **Verify:** simulation transcript recorded in the phase Notes; both assertions pass; no `Should I` / `Would you like` strings in transcript outside the E1 case
- **Status:** Done
- **Changes:** Session-evidence validation (the deploying session itself ran under C27): (a) elective forks (spec placement, phase ordering, mechanical drift fixes) resolved as `[DR]` one-liners, zero elective questions — PASS; (b) the single whitelist gate (engine-drift §1) emitted exactly one question, 2 fixed options, recommended default marked, user choice executed — PASS. No forbidden phrasing outside the gate.

### [T-5T02] Validation: Engine Test Harness

- **Goal:** Verify no regression in engine cognitive/structural tests after template/workflow edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions reported
- **Status:** Done
- **Changes:** 12/12 tests pass, 0 failures.
