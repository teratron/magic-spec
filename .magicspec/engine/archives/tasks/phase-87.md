---
phase: 87
name: "Maintenance: The Design-Debt Halt Waits for a Pending Replan Directive"
status: Done
subsystem: "skills/magicspec (check-prerequisites, workflows/plan), tests/engine"
requires:
  - "l1-session-continuity 2.7.0 §Pending-Directive Precedence, l2-engine-automation 1.34.1"
provides:
  - "No DESIGN_DEBT_PENDING while a replan directive is pending; 544 cases; engine 4.0.0"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/check-prerequisites.js"
    - "skills/magicspec/workflows/plan.md"
    - "tests/engine/bloat-and-prerequisites.js"
patterns_established:
  - "A halt that sends the person to another command is held back while the recorded next step is the one it would halt"
duration_minutes: ~
---

# Stage 87 Tasks — Maintenance: The Design-Debt Halt Waits for a Pending Replan Directive

**Phase:** 87
**Status:** Done
**Strategic Goal:** The planning run that a pending replan directive names is never halted by the design-debt gate.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active in the ledger: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reported by** the planning run of 2026-11-27 on this workspace: its pre-flight raised the halt on two waiting Backlog items, and the run went on against its own body.
- **Release lines:** `develop` repaired. `v2.1` — absent: the 2.x line has no replan directive.
- **Order of record:** the case was written and seen to fail before the repair; these entries were written after it.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-87F01] The design-debt halt waits for a pending replan directive

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-87F01] The design-debt halt waits for a pending replan directive

- **Spec:** l1-session-continuity.md §Pending-Directive Precedence (SC-2.4 addendum)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *check-prerequisites.js holds the design-debt halt while a replan directive is pending*, written first and seen to fail on the pending directive; `scripts/mutation-check.js` reports the entry reverting the script and the entry removing the sentence of the body both `CAUGHT`.
- **Handoff:** none.
- **Notes:** Reproduced on a disposable project: a complete, current plan with one open Backlog item and a pending directive gave `DESIGN_DEBT_PENDING` with the fix `/magicspec spec`, while the next step named `/magicspec plan` with the directive. Confirmed cause: the gate's current-plan condition read the registry and constitution gaps and not `replanDirective`, which the same `findPendingWork` call returns. Class: specification gap. Sibling sites: every reader of the pending directive and of the gate — the next-step computation already puts the directive first, and `task` hands pre-flight findings to `plan`; no other site halts on the gate.
- **Changes:** `check-prerequisites` holds the signal while a directive is pending; `workflows/plan.md` Step 1 states the condition.
