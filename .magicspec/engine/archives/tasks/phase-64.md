---
phase: 64
name: "Maintenance: A Finished Ledger Is Not Re-Synced After a Plan"
status: Done
subsystem: "skills/magicspec/scripts (finalize.js), tests/engine (finalize-session.js), .magicspec/engine/specifications"
requires:
  - "Phase 49: the stage handoffs, among them the re-sync of a ledger behind the plan after /magicspec plan"
  - "Phase 61: the step after a plan on a complete plan with an open design item"
  - "PL-5 of l1-plan-command 2.0.1 and SC-2.1(d) of l1-session-continuity 2.6.1, Stable at registry 1.89.0"
provides:
  - "finalize names the task command after a plan only when it has something to apply: the undecomposed phase first, then a ledger behind the plan while a phase of it is still open; a ledger whose every phase is terminal leaves the step to the plan state (the funnel when work is pending, no step when nothing is), so a revalidation that only recorded a finished phase no longer ends on a re-sync of one header line; two arms in the harness cases of the step after a plan, four mutation entries caught; engine 3.0.149"
  - "l2-engine-finalization 3.10.0 (amended: PL-5 restored in §5.1) and l2-test-suite 1.48.4 (the coverage restated); registry 1.90.0; harness 457"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/finalize.js"
    - "tests/engine/finalize-session.js"
    - ".magicspec/engine/specifications/"
patterns_established:
  - "A next-step recommendation is checked against what the command it names would change: a step that can only rewrite a version header is no step, and the plan state decides"
  - "A pinned control is read against the requirement it was written for: the control of Phase 61 that kept the re-sync was right for its question (an open design item) and wrong for the one it also fixed (a finished ledger), and the owner's question found the second"
duration_minutes: ~
---

# Stage 64 Tasks — Maintenance: A Finished Ledger Is Not Re-Synced After a Plan

**Phase:** 64
**Status:** Done
**Strategic Goal:** After `/magicspec plan` the recorded next step names the task command only when it has something to apply — an undecomposed phase, or a ledger behind the plan with a phase still open — and otherwise is the step the plan state computes, so a revalidation that only recorded a finished phase no longer ends on a re-sync that rewrites one header line.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active in the ledger: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reported by the owner** after `/magicspec plan engine` recorded Phase 62: `finalize` named `/magicspec task engine` because the ledger header recorded plan 1.75.0 against 1.76.0, with every phase of the ledger finished.
- **Release lines.** The 2.x line (`v2.1`) has no ledger-behind branch in its finalization (`git show v2.1:.magic/scripts/finalize.js` holds none of `ledgerBehind`, `ledgerAfterPlan` or the re-sync step), so the defect is absent there.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-64F01] After a plan, a finished ledger behind the plan is handed to a task re-sync that has nothing to apply

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-64F01] After a plan, a finished ledger behind the plan is handed to a task re-sync that has nothing to apply

- **Spec:** l2-engine-finalization.md §5.1 (amended, 3.10.0); l1-plan-command.md §3 PL-5 (restored); l1-session-continuity.md §3 SC-2.1(d) (the plan state decides the step); l2-test-suite.md (the SC-2.1 coverage, 1.48.4 as built)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** Two arms of the cases in `tests/engine/finalize-session.js`, written first and seen to fail: after a plan, a ledger behind the plan whose every phase is terminal names no re-sync (`Plan complete — run /magicspec plan engine to plan new scope` in the fixture without a registry; `Plan complete — nothing pending` with a current registry and a Parked Backlog), and a ledger behind the plan with a phase still `In Progress` still names `Run /magicspec task engine to bring the tasks in line with the plan`; `scripts/mutation-check.js` reports the four entries (the finished-ledger guard removed in each of two cases, the open-phase re-sync never named, a ledger in step re-synced) `CAUGHT`; the full harness run alone passes.
- **Handoff:** `finalize --workflow=fix` archives the phase when the task is `Done`; with every phase terminal and the registry current, nothing is pending.
- **Notes:** Reported by the owner after the revalidation of 2026-11-18 (Phase 62 recorded): `/magicspec plan engine` ended with `Next: /magicspec task engine — standard reasoning`, and the task command would only have rewritten `Based on PLAN` in `TASKS.md`. Reproduced on this workspace (`finalize --workflow=plan` printed the re-sync; the ledger held no phase that was not `Done (Archived)`) and in the harness fixture. Confirmed cause: `ledgerAfterPlan` in `skills/magicspec/scripts/finalize.js` compared only the plan version the ledger records with the plan's own, and excepted only a complete plan with an open design item; it did not ask whether the ledger holds a phase the task command could act on, which is what PL-5 conditions the step on ("the active or next phase"). The task command's Sync step (`workflows/task.md` Step 6) blocks, releases or cancels only tasks that are not Done, and a revalidation changes the ledger's tasks only through it, so a ledger with every phase terminal has nothing to apply. Class: specification defect — `l2-engine-finalization.md` §5.1 prescribed the re-sync for every ledger behind the plan, against PL-5; amended under the Amendment Rule (3.10.0), then the code. The reporter's own cause (the header lags because the plan and task commands write different files) is right and unchanged (PL-1): the header lag is harmless, since the Plan Gate reads the versions the plan records, not the ledger's.
- **Changes:** Repaired in `ledgerAfterPlan` (`skills/magicspec/scripts/finalize.js`): the re-sync of a ledger behind the plan is named only while the ledger holds a phase that is not terminal (`pending.planComplete` false); the undecomposed phase stays first; a finished ledger leaves the step to the plan state, which also takes over the case of an open design item that the guard of Phase 61 excepted, so the two conditions became one. The cases were written and seen red first and the code followed; the specification amendment, which the rule for a specification defect puts before the code, was made in the same task right after it, under the Amendment Rule: `l2-engine-finalization.md` 3.10.0 (§5.1) with the coverage bullet of `l2-test-suite.md` 1.48.4. Reproduction before: `computeNextAction('plan', …)` and `finalize --workflow=plan` named the re-sync on a ledger of `Done (Archived)` rows; the two arms written first failed (the open-phase arm, the control, passed); after: green, with the two assertions of earlier cases that pinned the old behaviour restated (the finished ledger of the first case now names the funnel, the Parked control of Phase 61 now names no step). `scripts/mutation-check.js` → 4 CAUGHT. Sibling sites: `planCompleteNextAction` already reads the same predicate and needs no change; `status.md` Step 2 item 7 and `help.md` Step 1 compute by pipeline order and never named the re-sync; `workflows/plan.md` Handoffs and `task.md` already state PL-5 and its Plan Gate. Lines: develop repaired (engine 3.0.149); v2.1 absent. Checks: full harness 457 of 457 run alone, `biome lint` clean, the formatter aligned on the lines written (inherited drift left), `pnpm run typecheck` and `pnpm run audit` report nothing new. The header lag of `Based on PLAN` in the ledger stays by design (PL-1): the plan and task commands write different files, the Plan Gate reads the versions the plan records, so the lag is harmless once nothing names it as a step.
