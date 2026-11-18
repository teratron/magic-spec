---
phase: 63
name: "Maintenance: A Stale Plan Is Revalidated Before Its Backlog Is Judged, and a Repaired Scenario Finding Is Re-Run"
status: Done
subsystem: "skills/magicspec/scripts (check-prerequisites.js), skills/magicspec/workflows (plan.md, goal.md, fix.md), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 21 and Phase 61: the DESIGN_DEBT_PENDING gate, its Parked exclusion and the planning funnel after a plan"
  - "Phase 52 and Phase 53: the Last run record, the findings reader and goal mode"
provides:
  - "check-prerequisites raises DESIGN_DEBT_PENDING only on a current plan; a plan the registry or the constitution moved past reports SYNC_GAP alone and plan revalidates it, recording each Backlog item's disposition; plan.md Step 1 says so; one harness case with its control, one caught mutation; the same repair on v2.1 (2.1.148, registry gap only, .magic/task.md Step 1)"
  - "goal.md Step 4 sends a scenario finding whose repair is Done, while the run it was found in is still the scenario's last, to simulate before fix; fix.md Step 6 records the scenario, the step and the Last run date of a simulation finding; one harness case, two caught mutations"
  - "l1-session-continuity 2.6.0, l2-engine-automation 1.32.2, l1-goal-mode 1.2.0, l1-fix-command 1.3.0; registry 1.87.0; engine 3.0.146; harness 456"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/check-prerequisites.js"
    - "skills/magicspec/workflows/plan.md"
    - "skills/magicspec/workflows/goal.md"
    - "skills/magicspec/workflows/fix.md"
    - "tests/engine/bloat-and-prerequisites.js"
    - "tests/engine/shipped-text-core.js"
    - ".magicspec/engine/specifications/"
patterns_established:
  - "A halt that sends the person to another workflow is checked against the record that workflow leaves: when the pass it names cannot write what would lift the halt, the halt waits for the workflow that can"
  - "A finding that one workflow repairs and another closes carries the record that tells a repaired finding from a new one"
duration_minutes: ~
---

# Stage 63 Tasks — Maintenance: A Stale Plan Is Revalidated Before Its Backlog Is Judged, and a Repaired Scenario Finding Is Re-Run

**Phase:** 63
**Status:** Done
**Strategic Goal:** A plan the registry or the constitution has moved past is revalidated before its Backlog can halt it, so a specification pass that answered a design item is followed by the plan that places it; and in goal mode a scenario finding whose repair is done is run again by `simulate`, which alone closes it, before `fix` is chosen for it a second time.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** for the feedback notes n3 and n4, recorded during `/magicspec plan engine` on 2026-11-18. No phase was active in the ledger (Phase 62 is planned and not yet decomposed): the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-63F01] A stale plan's Backlog raises DESIGN_DEBT_PENDING, so plan halts on an item the specification pass just answered
- [x] [T-63F02] Goal mode hands a repaired scenario finding to fix again instead of re-running its scenario

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-63F01] A stale plan's Backlog raises DESIGN_DEBT_PENDING, so plan halts on an item the specification pass just answered

- **Spec:** l1-session-continuity.md §SC-2.4 (gains the stale-plan statement); l1-plan-command.md PL-4 (restored: a stale plan is revalidated); l2-engine-automation.md §DESIGN_DEBT_PENDING (the predicate as built)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** A harness case in `tests/engine/bloat-and-prerequisites.js`, written first and seen to fail: on a complete plan whose Backlog holds one open item, `check-prerequisites` reports `DESIGN_DEBT_PENDING` when the plan's recorded registry and constitution versions are current (the control), and does not report it — reporting `SYNC_GAP` instead — when the registry or the constitution has moved past the plan; `scripts/mutation-check.js` reports the entry that reverts the condition `CAUGHT`.
- **Handoff:** `finalize --workflow=fix` archives the phase when both tasks are `Done`.
- **Notes:** Reported as feedback note n3. Reproduced on this workspace on 2026-11-18: after `/magicspec spec amend l1-fix-command.md` answered the one open Backlog item, `check-prerequisites --workspace=engine` still reported `DESIGN_DEBT_PENDING` beside `SYNC_GAP` (plan 1.83.0, registry 1.86.0), so `plan` Step 1 would have halted and named the specification pass again. Confirmed cause: the gate in `check-prerequisites.js` reads `planComplete` and the open Backlog items of `findPendingWork` and ignores `syncGap` and `rulesGap` the same call returns; only `plan` may write a Backlog disposition (PL-1), and its halt comes before its write. The 2.x line has the same gate (`v2.1:.magic/scripts/check-prerequisites.js`, `.magic/task.md` Step 1), and the plan of this workspace records the same halt there a second time "with nothing left to design" (Phase 21).
- **Changes:** Repaired in `skills/magicspec/scripts/check-prerequisites.js`: the gate requires a current plan (no `syncGap`, no `rulesGap` from the same `findPendingWork` call); `workflows/plan.md` Step 1 states it. Reproduction before: the new case failed on its second assertion (a plan behind the registry still raised the signal), the control passing; after: green. `scripts/mutation-check.js` → 1 CAUGHT. Sibling sites: the Next Action computation in `finalize.js` reads the same predicate and needs no change (a stale plan already resolves to the planning funnel); `ledgerAfterPlan` runs after a plan write, when no gap is left. Spec: `l1-session-continuity.md` 2.6.0 (Stale-Plan Precedence), `l2-engine-automation.md` 1.32.2. Lines: develop repaired (engine 3.0.146); v2.1 ported (2.1.148: `.magic/scripts/check-prerequisites.js` with the registry gap, the line having no constitution gap; `.magic/task.md` Step 1; the case in `dev/tests/engine.js`, seen red without the code).

### [T-63F02] Goal mode hands a repaired scenario finding to fix again instead of re-running its scenario

- **Spec:** l1-goal-mode.md §3 GM-4 (gains the order for a repaired scenario finding); l1-fix-command.md FX-7 (the repair of a scenario finding records the run it repaired)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** A harness case in `tests/engine/shipped-text-core.js`, written first and seen to fail: `workflows/goal.md` Step 4 has the row that sends a scenario finding whose repair is `Done` — the run it was found in still the scenario's last — to `simulate` for its area, before the row that sends an open finding to `fix`; `workflows/fix.md` Step 6 records, for a simulation finding, the date of the `Last run` it was found in; `scripts/mutation-check.js` reports the entries that remove the row and the record `CAUGHT`.
- **Handoff:** `finalize --workflow=fix` archives the phase when both tasks are `Done`.
- **Notes:** Reported as feedback note n4. Reproduced by reading `workflows/goal.md` Step 4: the row *An open finding: a failed or inconclusive step in a scenario's `Last run`* precedes *Scenarios verify an open criterion and none has run since the behaviour last changed → `simulate`*, and only `simulate` rewrites `Last run` (SM-7, `simulate.md` Ownership), so after a repair the line still reads `fail` and the next iteration chooses `fix`; FX-1 answers it as fixed, nothing changes, and three such iterations stop the goal on no progress. Confirmed cause: GM-4 names both steps with no order between them, and the body's order puts the finding first. The 2.x line has no goal mode, so the defect is absent there.
- **Changes:** `skills/magicspec/workflows/goal.md` Step 4 gains the row that sends a scenario finding whose repair is `Done` — a task names it in its `Verify` line and the `Last run` it was found in is still the scenario's last — to `simulate` for its area, ahead of the `fix` row, which now takes an open finding that no such repair names; `workflows/fix.md` Step 6 records, for a simulation finding, the scenario, the step and the date of the `Last run` it was found in. Reproduction before: the new case failed (no re-run row); after: green. `scripts/mutation-check.js` → 2 CAUGHT (the row removed, the record removed). Sibling sites: `finalize` names `fix` only after `simulate` (`synthesizeNextAction`), never after a repair, so it does not loop; the status briefing recommends `goal` and reads no finding. Spec: `l1-goal-mode.md` 1.2.0 (GM-4), `l1-fix-command.md` 1.3.0 (FX-7). Lines: develop repaired; v2.1 absent (no goal mode).
