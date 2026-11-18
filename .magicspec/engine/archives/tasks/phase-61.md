---
phase: 61
name: "Maintenance: The Step After a Complete Plan With an Open Design Item"
status: Done
subsystem: "skills/magicspec/scripts (finalize.js), tests/engine (finalize-session.js), .magicspec/engine/specifications"
requires:
  - "Phase 49: the stage handoffs, among them the re-sync of a ledger behind the plan after /magicspec plan"
  - "SC-2.1(d1) of l1-session-continuity 2.5.6 and PL-5 of l1-plan-command 2.0.1, Stable at registry 1.83.0"
provides:
  - "finalize names the planning funnel after a plan on a complete plan with an open design item, as after every other workflow, and no longer a task re-sync the Plan Gate refuses; the step after a plan keeps the undecomposed phase first and the re-sync where nothing is pending; one harness case with its Parked control, two mutation entries caught; engine 3.0.145"
  - "The 17 area files of tests/suite/ carry a ## Cases heading (markdownlint MD001 cleared), asserted by the layout case under one more mutation entry; SL-2 states the structure"
  - "l2-engine-finalization 3.9.1, l2-test-suite 1.48.2, l1-engine-diagnostics 1.1.4, l2-engine-diagnostics 1.4.4 patched as built; registry 1.85.0; harness 454"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/finalize.js"
    - "tests/engine/finalize-session.js"
    - "tests/engine/layout.js"
    - "tests/suite/ (17 area files)"
    - ".magicspec/engine/specifications/"
patterns_established:
  - "A next-step recommendation is checked against the gate of the command it names: a step the named command's own pre-flight refuses is a bounce, whatever the ledger says"
  - "A layout rule of a generated or split file set states its heading structure and the layout case asserts it, so an editor's linter and the harness agree"
duration_minutes: ~
---

# Stage 61 Tasks — Maintenance: The Step After a Complete Plan With an Open Design Item

**Phase:** 61
**Status:** Done
**Strategic Goal:** After `/magicspec plan` on a complete plan whose Backlog holds an open design item, the recorded next step is the one the plan state computes — the planning funnel, whose pre-flight is the door to the specification pass — and never a task re-sync that the task command's Plan Gate refuses on the same item.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reproduction** (read-only, on this workspace as it stood after the revalidation of 2026-11-18): `computeNextAction('plan', 'engine', …)` → `Run /magicspec task engine to bring the tasks in line with the plan`, while `computeNextAction('run' | 'task', …)` → `Plan complete — run /magicspec plan engine to plan new scope`; `findPendingWork` → plan complete, no undecomposed phase, ledger behind the plan, one open Backlog item. `check-prerequisites` reports `DESIGN_DEBT_PENDING`.
- **Release lines.** The 2.x line (`v2.1`) has no planning command of its own and no ledger-behind branch in its finalization (`git show v2.1:.magic/scripts/finalize.js` holds neither), so the defect is absent there.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-61F01] After a plan, a complete plan with an open design item names the planning funnel, not a task re-sync the Plan Gate refuses
- [x] [T-61F02] The 17 area files of the cognitive suite skip a heading level (MD001): a level-2 heading follows the title

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-61F01] After a plan, a complete plan with an open design item names the planning funnel, not a task re-sync the Plan Gate refuses

- **Spec:** l1-session-continuity.md §3 SC-2.1(d1) (restored); l1-plan-command.md §3 PL-5 (restored); l2-engine-finalization.md §5.1 (patched as built, with the sibling statements of `l1-engine-diagnostics.md`, `l2-engine-diagnostics.md` and `l2-test-suite.md`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** A harness case in `tests/engine/finalize-session.js`, written first and seen to fail: on a complete plan whose ledger is behind it and whose Backlog holds one open design item, `computeNextAction('plan', …)` returns the planning funnel and equals what `task`, `run`, `fix` and `simulate` return; the control — the same plan with the item Parked, nothing pending — still names the re-sync of the tasks; the existing case that pins the re-sync after a plan keeps passing. `node scripts/mutation-check.js` reports the entry that reverts the guard `CAUGHT`; `node --test tests/engine.js` passes in full, run alone; `biome check` and `pnpm run audit` report nothing on the changed code; `update-engine-meta` run after the edit inside the skill folder and `update-engine-meta --check` clean.
- **Handoff:** `finalize --workflow=fix` archives the phase when the task is `Done`; the plan's revalidation then records it as built.
- **Notes:** Confirmed cause: `synthesizeNextAction` takes the ledger-behind branch for the plan workflow (`ledgerAfterPlan`) before the plan-complete resolution, and that branch looks only at the ledger's recorded plan version. On a complete plan with an open design item it names `task`, whose Plan Gate treats `DESIGN_DEBT_PENDING` as a finding the plan owns and ends naming `/magicspec plan`, whose pre-flight then halts and names the specification pass — the recommended step is a bounce. Class: implementation defect — SC-2.1(d1) already states the funnel for that state uniformly for every originating workflow, and PL-5 names `task` after a plan only when the plan changed what the active or next phase holds. The repair keeps the re-sync where nothing is pending (the case that pins it stays green) and gives way only to the open design item, which is the one finding of the task command's Plan Gate that can hold right after a plan has written.
- **Changes:** Repaired in `skills/magicspec/scripts/finalize.js` (`ledgerAfterPlan`): the undecomposed phase is named first, and a ledger behind the plan is re-synced by `task` only when the plan is not complete with an open design item; that state keeps the planning funnel of SC-2.1(d1) for every originating workflow. Reproduction before: `computeNextAction('plan', …)` → the re-sync while `run`/`task` → the funnel. Case added in `tests/engine/finalize-session.js`, seen red (actual re-sync, expected funnel) and green after; control with the item Parked keeps the re-sync. `scripts/mutation-check.js` → 2 CAUGHT, 0 SURVIVED. C14: engine 3.0.144 → 3.0.145, `update-engine-meta --check` clean. Biome clean on the repair; `pnpm run audit` no finding on the changed code (4 inherited complexity findings excluded by the gate). Specifications patched as built: `l2-engine-finalization` 3.9.1, `l2-test-suite` 1.48.1, `l1-engine-diagnostics` 1.1.4, `l2-engine-diagnostics` 1.4.4 (the funnel is `/magicspec plan`, stale since Phase 49). Siblings: `finalize.js` holds the only other `/magicspec task` recommendation (the undecomposed phase, correct); the shipped bodies hold none. Lines: 3.x repaired; 2.x absent (no planning command, no ledger-behind branch).

### [T-61F02] The 17 area files of the cognitive suite skip a heading level (MD001): a level-2 heading follows the title

- **Spec:** l2-test-suite.md §Layout of the Suites SL-2 (patched as built)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `markdownlint-cli2` over `tests/**/*.md` reports no MD001 (17 findings before); the layout case asserts the first two headings of each area file are `#` and `##`, seen red on the unrepaired files and green after; `scripts/mutation-check.js` reports the entry that removes one `## Cases` heading `CAUGHT`; the full harness passes run alone.
- **Handoff:** `finalize --workflow=fix` archives the phase.
- **Notes:** Reported by the editor's markdownlint on the area files open in it; reproduced over the whole folder: all 17 files (Phase 59 layout: a level-1 title, an introductory line, then `###` case headings). Confirmed cause: the layout of Phase 59 has no level-2 heading between the title and the cases. Class: implementation defect of a Stable layout that states no heading structure (SL-2 gains it). The case headers `### T{N} — {name}` are pinned by the harness and the maintenance workflow, so the repair adds one `## Cases` heading to each file and leaves every header alone. Release lines: the 2.x line has no area files (absent). Other markdownlint findings in the repository (the Phase 53 archive, seven specification tables, generated host projections) predate this work and are left.
- **Changes:** Added a `## Cases` heading between the introductory line and the first case in all 17 files of `tests/suite/`; no case header or identifier changed. The layout case in `tests/engine/layout.js` now asserts the first two headings of each area file are `#` and `##` — seen red before the files were repaired, green after; `scripts/mutation-check.js` → 1 CAUGHT (one file without its `## Cases`). `markdownlint-cli2` (v0.18.1): MD001 on 17 files before, none after on `tests/`, the scenario files, the phase workbooks and `docs/dev-test.md`. SL-2 states the structure (`l2-test-suite` 1.48.2, registry 1.85.0). Left, as found before this work: 9 MD012 in the Phase 53 archive, 7 MD056 in specification history tables, MD036/MD041 in generated host copies and the third-party `simulation-qa` skill. Lines: 2.x absent.
