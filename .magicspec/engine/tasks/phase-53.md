---
phase: 53
name: "Goal Mode"
status: Todo
subsystem: "skills/magicspec (workflows/goal.md, SKILL.md, workflows/help.md, workflows/status.md, roles/prompt-engineer.md, templates/state.md, templates/rules.md, scripts/update-state.js, scripts/resume-state.js, scripts/lib/hosts.js, scripts/lib/commands.js, CONSTITUTION.md), .magicspec/RULES.md, docs, README, CONTRIBUTING, tests"
requires:
  - "Phase 49: the router's seven-column table read through one parser (lib/hosts.js, DEMANDS), the handoff line with its reasoning demand, the stage boundaries every step of the loop keeps (PS-1, PS-2, PS-5)"
  - "Phase 51: the fix command, the step of the loop that consumes findings; the quality & automation group the goal row joins"
  - "Phase 52: the simulate command, the step that checks user-facing criteria; the rule kernel at 15741 of 16384 bytes (643 left for this phase and Phase 55); constitution 1.22.0 (C2 keeps goal and sync as the exceptions to come); harness 377, suite 1.9.100, engine 3.0.95"
  - "The specification: l1-goal-mode 1.1.0 (GM-1 to GM-9), with l1-command-surface 2.2.2 (CS-1, the goal row), l1-pipeline-stages (PS-6), l1-input-prompt-pass (IP-6): Stable at registry 1.69.0, plan 1.59.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 53 Tasks — Goal Mode

**Phase:** 53
**Status:** Todo
**Strategic Goal:** `/magicspec goal` takes a goal statement, a phase or a number of tasks and drives the pipeline toward it without pausing between steps: each step is the one DA-6 computes, executed instead of narrated, ending at its own stage boundary (PS-6); consent is queued and asked only when the mode stops; the mode stops on exactly one of the closed conditions and reports once. The goal and its criteria live in `STATE.md`, so the resume line, the status briefing and a bare `goal` in a new session continue it. No guard is relaxed.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-53K01] The goal posture in §7 of the rule kernel, within the room left for this phase
- [x] [T-53A01] The constitution through `/magicspec rule`: C2 lists `goal` as shipped
- [x] [T-53M01] The goal block in live memory: the template, the writer, its bound
- [ ] [T-53M02] The resume line reports a recorded goal
- [ ] [T-53M03] The status briefing shows the goal and its criteria counts
- [ ] [T-53G01] The router's `goal` row: the demand `per step` in the one parser, the argument contract, help
- [ ] [T-53G02] The `goal` body: the scope forms, the intake, the iteration, consent, the stop conditions, the report
- [ ] [T-53G03] The `goal` body joins the Input Pass: card trigger, item 5 widened (IP-6), mirror, the harness table
- [ ] [T-53G04] Documentation: `docs/goal.md`, the README, the documentation index, the contribution guide's generated table
- [ ] [T-53E01] The cognitive suite: the seven goal scenarios the plan lists
- [ ] [T-53E02] The harness: the sweep of moved pins and the mutation entries
- [ ] [T-53T01] Validation: harness, mutation checks, the suite, C14, the projection, the budgets
- [ ] [T-53S01] Spec sync: as-built decisions, the supersessions declared, the registry

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-53K01] The goal posture in §7 of the rule kernel, within the room left for this phase

- **Spec:** l1-goal-mode.md GM-4, GM-5, GM-7; l2-engine-automation.md §Context-Economy Surfaces item 2 (the rule kernel); PLAN.md Phase 53 planning notes 2 and 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `wc -c skills/magicspec/CONSTITUTION.md` reports at most 16124 bytes (15741 before; at least 260 of the 643 left stay free for Phase 55); §7 `### Rule` gains one bullet stating that inside `/magicspec goal` the next step DA-6 computes is executed instead of narrated, each step ending at its own boundary, an action that needs consent is queued and asked only when the mode stops, and no gate is relaxed; the §8 item for §7 names the goal case in at most one clause; `git diff skills/magicspec/CONSTITUTION.md` shows no change inside the `> [!CAUTION]` block, §1 to §6, §9 or §10; `@role:prompt-engineer` reviews the added text (PQ-6 verdict recorded in `Changes`); the harness case `rule kernel: CONSTITUTION.md stays within its size budget…` passes; `node skills/magicspec/scripts/executor.js update-engine-meta` runs right after the edit and `.agents/rules/magicspec.md` is refreshed by it.
- **Handoff:** T-53G02 (the body states the same posture at length).
- **Notes:** [DR] §3 gains nothing: `goal` does not finalize as itself, each step it runs finalizes as its own workflow (GM-4), so the §3 list of finalizing workflows stays correct. (Override: `/magicspec task engine "list goal in AGENT-RULES §3"`.) If the bullet does not fit the budget, the remedy is Phase 52 note 3's (move a section, which changes the automation specification's item 2): record the shortfall in `Changes` and end the phase's run at this task with `/magicspec plan engine "the rule kernel needs a section moved to fit Phases 53 and 55"`.
- **Changes:** `CONSTITUTION.md` 15741 → 16020 bytes (279 added; the budget of the task was 16124, so 364 bytes stay free for Phase 55, which needs about 260). §7's DA-6 bullet gains the goal case: in `/magicspec goal` the computed step is executed, not narrated; each step ends at its own boundary and finalizes as itself; a consent action is queued and asked only when the mode stops; no gate or check is relaxed. The §8 item for §7 gains one clause (in goal mode a consent is queued until the mode stops). The statement sits in the DA-6 bullet it modifies and not in a new bullet — no section moved, no rule dropped, no heading changed; `git diff` shows hunks only in §7 and §8, none in the CAUTION block, §1 to §6, §9 or §10. `@role:prompt-engineer` review (PQ-6): PASS-WITH-REWRITES — the first draft said "it is executed instead", whose "it" could read as the narration; rewritten to "that step is executed, not narrated", applied inline. `update-engine-meta` ran right after the edit (3.0.95 → 3.0.96) and refreshed the projections; `.agents/rules/magicspec.md` is 16020 bytes, equal to the kernel. Harness `rule kernel: …` passes (`ℹ pass 2, fail 0` for the two kernel cases).

### [T-53A01] The constitution through `/magicspec rule`: C2 lists `goal` as shipped

- **Spec:** l1-command-surface.md CS-1 ("the constitution's C2 records the command set"); l1-goal-mode.md §1; PLAN.md Phase 53 planning note 2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** one run of the Operational Logic of `rule.md` (origin `user-stated`: the owner's list of 2026-10-29, which asks for `/magicspec goal`; a §7 amendment, so no core-amendment gate) amends `.magicspec/RULES.md` and `skills/magicspec/templates/rules.md` together: C2's sentence lists `goal` among the commands as it ships and keeps `sync` alone as the exception still to come, word for word in both files; `.magicspec/RULES.md` moves 1.22.0 → 1.23.0 with a history row naming the origin, the admission (RA-1) and the constitutional review; `node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace=engine` reports no `CONFIG_DRIFT`; `update-engine-meta` runs after the template edit.
- **Handoff:** T-53G01 (the router row ships behind the constitution).
- **Notes:** the constitution leads the body by a few tasks inside this phase, as in Phase 52 (T-52A02); T-53T01 checks the end state and no release falls between them. The amendment moves `PLAN.md`'s `Based on RULES` behind: that is expected, and `/magicspec plan engine` after the phase revalidates it (Phase 52's outcome). If the rule pass fails review, G01 to G04 wait; K01, M01 to M03 do not.
- **Changes:** Through the Operational Logic of `rule.md` (origin `user-stated`: the owner's lists of 2026-10-29 and 2026-11-11, which ask for `/magicspec goal` with a phase and a number of tasks as its arguments; a §7 amendment, so no core-amendment gate; tier: global). Admission, soft form, recorded at its stated strength — without the change the constitution calls a command pending while its body, router row and documentation ship in this phase. Constitutional review (pre and post write): APPROVE, no practical conflict with C9 or C27; rule wording review: PASS. `.magicspec/RULES.md` 1.22.0 → 1.23.0 with its history row; C2's sentence lists `goal` after `simulate` (the router's order) and keeps `sync` alone as the exception still to come, in the singular ("`sync` is an authorized C2 exception that joins with its own delivery, one workflow body"); `skills/magicspec/templates/rules.md` carries the same sentence word for word (its own version, 1.4.0, has no history and stays). `update-engine-meta` ran after the template edit (3.0.96 → 3.0.97). Rules Parity: the ledger header `Based on RULES` moved 1.22.0 → 1.23.0, because the harness case `the constitution and its shipped template say the same about the four stages` pins the ledger to the current constitution version and the amendment changes one word of C2 that no task depends on; `PLAN.md` stays at 1.22.0, so the plan is stale by this one amendment and `/magicspec plan engine` revalidates it after the phase (the same consequence as Phase 52). The pin of that case moved with the wording (the command list and the singular `sync` sentence; the template-equals-constitution assertion is unchanged). Pre-flight reports `CONFIG_DRIFT` for `RULES.md` (uncommitted, written by this workflow: advisory, nothing is committed) and `SYNC_GAP` for the plan (as above). The constitution leads the router row by a few tasks; T-53T01 checks the end state.

### [T-53M01] The goal block in live memory: the template, the writer, its bound

- **Spec:** l1-goal-mode.md GM-3, GM-6 (the progress counter), GM-9 (a phase or a count recorded like a statement), §6 item 1; l1-session-continuity.md (live-memory layout, declared superseded)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/templates/state.md` gains a `## Goal` section between `## Current Position` and `## Progress` (an HTML comment says it is empty when no goal is recorded) holding the scope form (statement, phase or count, with a stated bound), each criterion as one line `- [{open|met|blocked}] {criterion} — {check}`, the iterations without progress, the tasks done against a count, and the queued consents; `SECTION_ORDER` in `scripts/update-state.js` lists `## Goal` in the same slot; the writer sets and clears the block through options registered in `scripts/lib/commands.js` (the harness's option-drift case passes); every other update leaves the block byte for byte; the 100-line guard never prunes the block and refuses a block longer than its bound with a recorded diagnostic instead of writing it; new harness cases, each seen to fail before the change: an update with a goal recorded keeps it, a cleared goal leaves no section, a block over the bound is refused, a file with no `## Goal` gains none from an ordinary update.
- **Handoff:** T-53M02, T-53M03, T-53G02 (the body writes the block through this writer only).
- **Notes:** [DR] the block is written by `update-state`, never hand-edited by the body — `STATE.md` is script-managed and the writer already owns sections, order and the line cap. (Override: `/magicspec task engine "the goal body edits STATE.md directly"`.) The form of the options (a JSON file path or flat flags) is decided in the task and recorded in `Changes`; the bound (criteria lines plus the fixed fields) is chosen so that a full file stays within 100 lines with the decisions section at its floor, and stated in `Changes`. No `.magicspec/` path or task identifier is written into the template (`CONSTITUTION.md` §6).
- **Changes:** The block is one module and one writer. `scripts/lib/goal-block.js` (new, the only place the layout lives) checks a goal object against a closed schema (`statement`, `phase`, `taskLimit`, `bound`, `withoutProgress`, `tasksDone`, `criteria` as `{state: open|met|blocked, text, check}`, `consents` as `{action, reason}`; at least one of statement, phase and task limit; any other field is refused), renders the `## Goal` section, parses it back tolerantly (a line it does not know is skipped; a section that names no goal reads as none) and describes it for the readers. `update-state.js` gains the flags `--goal-file <json>` (records the block, replacing any earlier one) and `--goal-clear` (removes the section and the blank line that set it off), both registered in `lib/commands.js`; `patch.goal` (an object, or `null` to clear) is the in-process form. `SECTION_ORDER` lists `## Goal` between Current Position and Progress. The form of the options is decided here ([DR] a JSON file, not flat flags — a criterion list does not fit a repeatable flag the shared flag parser keeps one value of, and an inline JSON argument does not survive the shells of both platforms; Override: `/magicspec task engine "flat goal flags"`). The bound is 28 lines for the whole section, heading and comment included (4 fixed lines, up to 6 field lines, so about 16 criteria and consents together); a file with the template's other sections and 5 decisions is about 47 lines, so a full block leaves it near 75, inside the 100-line cap without pruning anything, and the cap's prune still touches only Recent Decisions. A goal that fails the schema or the bound is refused before any write: one `HALT: the goal was refused — …` line, exit 1, the diagnostic `STATE_GOAL_REFUSED` (error) recorded, STATE.md byte for byte as it was, the other flags of the same call included; `--goal-file` and `--goal-clear` together, an unreadable file and a file that is not JSON are refused the same way. Every other update leaves the block byte for byte (it is its own section, written only here); a STATE.md that records no goal gains no section from an ordinary update; a fresh file instantiated from the template carries none (the template shows the layout in an indented comment, which keeps the case that matches template fields to writers exact). Texts are one line each, at most 300 characters, and the separator the criterion and consent lines use (` — `) is replaced by ` - ` inside a text so a line splits back at its first separator. Four harness cases, each seen to fail before the change (the round-trip case guards the new module and was green on arrival): the block is recorded, sits between Current Position and Progress, survives every other writer and a cleared goal leaves no section and no double blank line; a goal over its bound, with an unknown field, with a bad criterion state or naming nothing is refused with the diagnostic and writes nothing, as are the two flags together and an unreadable file; an ordinary update and a fresh file carry no goal section; render and parse give back the same object. `STATE_GOAL_REFUSED` joins the finding inventory of the diagnostics specification in T-53S01. `update-engine-meta` ran after the edits; biome clean on `goal-block.js` and `update-state.js`, fallow reports no issue in the changed files.

### [T-53M02] The resume line reports a recorded goal

- **Spec:** l1-goal-mode.md GM-3, §6 item 2; l2-session-checkpoint.md (the resume line, declared superseded)
- **Status:** In Progress
- **Assignment:** Agent
- **Verify:** `scripts/resume-state.js` reads the `## Goal` block of each workspace it reads and, when a goal is recorded, prints it in its one line (`▶ Resume [{workspace}]: …`) — the scope form, the criteria counts by state, and `/magicspec goal` as the way to continue; with no goal and no task in flight it stays silent, and with both it prints one line, not two; harness cases, each seen to fail before the change: a goal alone prints the goal line, a goal with a task in flight prints one line naming both, a workspace with an empty block prints nothing, an unreadable `STATE.md` stays a recorded diagnostic and silence.
- **Handoff:** T-53G02 (the body's resume step reads the same block).
- **Notes:** the script stays read-only and never exits non-zero (its own contract). `--all` reads every workspace as before. This script is the block's only parser; the status briefing (T-53M03) is a body and reads the block by the layout the template documents.

### [T-53M03] The status briefing shows the goal and its criteria counts

- **Spec:** l1-goal-mode.md §6 item 3; l2-status-command.md (the briefing layout, declared superseded)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/status.md` gains, in its layout, a goal line shown only when `STATE.md` records one — the scope form and the counts `{met}/{open}/{blocked}` with the queued consents — and its recommended next step is `/magicspec goal` while a goal is recorded and open; the briefing stays read-only (it writes nothing and runs no step); `docs/status.md` shows the same layout; a harness case pins the line in the body and the condition under which it appears.
- **Handoff:** T-53G04.
- **Notes:** the briefing does not re-check criteria: it shows what the block records. A recorded goal whose every criterion is `met` is shown as done, and the next step is the plan-state step, not `goal`.

### [T-53G01] The router's `goal` row: the demand `per step` in the one parser, the argument contract, help

- **Spec:** l1-command-surface.md CS-1, the command table row `goal` (group `quality & automation`, argument "a goal statement · a phase · a number of tasks (GM-9)", missing "required unless a goal is recorded", demand "per step"); l1-pipeline-stages.md ("`goal` has no demand of its own"); l1-goal-mode.md GM-3, GM-9
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/SKILL.md` has the `goal` row after `simulate` with the cells the specification's table gives and body `workflows/goal.md`; `scripts/lib/hosts.js` accepts `per step` as a demand cell (today `DEMANDS` admits only `deep`, `standard`, `light` and a row with any other value is dropped as `null`) and the handoff line never prints `per step`: a next step that is `goal` is printed with the demand of the step it would run, or with no demand clause — the choice recorded in `Changes`; the router's Dispatch states that for `goal` with no argument the body decides between continuing the recorded goal and the argument form (GM-3), so the form is shown only when no goal is recorded; `workflows/help.md` lists `goal` in its group and explains its three forms; a harness case parses the router and finds thirteen rows (twelve today; `sync` joins in Phase 55), the `goal` row with demand `per step`, and the help listing that matches it.
- **Handoff:** T-53G02 (back to back: until the body exists the pre-flight and the router's body check report the row's body missing), T-53G04 (the generated table).
- **Notes:** this is the hidden dependency of the phase: added without the parser change, the row would vanish from every reader of the table (help, the picker, the handoff demand, the contribution guide), silently. Phase 52's outcome applies: the router's row count, the demand table, the Input Pass body count and the generated contribution table pin the command set and fail together on the first full run after the row lands; they move in T-53E02, not by weakening an assertion.

### [T-53G02] The `goal` body: the scope forms, the intake, the iteration, consent, the stop conditions, the report

- **Spec:** l1-goal-mode.md GM-1 to GM-9, §5.1, §5.2; l1-pipeline-stages.md PS-6; l1-decision-autonomy.md DA-6 (E1, E2, E4 stay questions); l1-workspace-intent-routing.md WI-11 (a workspace is created only through the `spec` step)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/goal.md` exists in the body shape of the other workflows (frontmatter `description`, title, `**Contents:**`, Entry with triggers and the argument forms, Argument Routing, Core Invariants, the loop, the report, Completion Checklist, Handoffs) and states: the three scope forms and how an argument is read as one (GM-9: a phase that is not in the plan answers with one line listing the plan's phases and runs nothing; a number with no unit is a statement); the intake once, through the `spec` step, for a statement only (GM-1); the criteria and their checks (GM-2); the block written through `update-state` after every iteration (GM-3, T-53M01); the iteration as DA-6 computes it, each step read from its own body and ending at its own boundary with its own finalization (GM-4, PS-6); the consent queue (GM-5); the six stop conditions as a closed list with the definition of progress (GM-6); every gate and pre-flight unchanged (GM-7); the report in the §5.2 layout, once (GM-8); workspace routing through `resolve-workspace --command goal`; no commit, ever. `check-prerequisites --json --workspace=engine` reports no `ROLE_TRIGGER_UNRESOLVED` and no missing body; `@role:prompt-engineer` reviews the body (PQ-6 verdict in `Changes`); `update-engine-meta` runs after it.
- **Handoff:** T-53G03, T-53G04, T-53E01.
- **Notes:** the body orchestrates; it re-implements no step. It reads the step's body each time it runs one, so a change to `run.md` reaches goal mode with no edit here. A `Next:` handoff line printed by a step's finalization is the step goal mode takes next unless a stop condition fired — the line is not printed a second time by the body. The scenarios of the plan entry (T-53E01) are written against this body's statements; a statement the scenarios need and the specification lacks is a coverage gap for T-53S01, not an invention.

### [T-53G03] The `goal` body joins the Input Pass: card trigger, item 5 widened (IP-6), mirror, the harness table

- **Spec:** l1-input-prompt-pass.md IP-1, IP-6; l2-role-cards-governance.md (the `prompt-engineer` mirror); PLAN.md Phase 53 planning note 1
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `workflows/goal.md` carries the one Input Pass line right after its argument parsing, in the wording every body uses, adding that a phase or a count is names only and runs no pass; `roles/prompt-engineer.md` gains the trigger `workflow: goal.md`, gate `Input Pass`; item 5 of its `## Input Pass` section says the intake gate's comprehension check is performed in this stance in `spec` and in `goal`, which starts with it (IP-6), and is otherwise unchanged; `l2-role-cards-governance.md` carries both changes word for word; the harness case `the input pass is defined once in the prompt-engineer card…` passes with `goal` among the triggered bodies.
- **Handoff:** T-53E02.
- **Notes:** the mirror is generated from the card where Phase 52 made it so (`patterns_established`: "a second copy … is generated from it"); regenerate it rather than editing it by hand, and say which in `Changes`.

### [T-53G04] Documentation: `docs/goal.md`, the README, the documentation index, the contribution guide's generated table

- **Spec:** l1-documentation-system.md (docs in step with the engine); l1-command-surface.md CS-2 (one printed form)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `docs/goal.md` exists and explains the three forms, the stop conditions, the consent queue, the report and resuming in a new session, naming every command as `/magicspec <command>`; `docs/README.md` lists it in its workflow table; `README.md` names `goal` among the commands; the generated command table of `CONTRIBUTING.md` is refreshed by the generator that writes it, not by hand; `docs/status.md` carries the goal line of T-53M03; the harness case `the documentation … no page names a command the router lacks` passes.
- **Handoff:** T-53T01.
- **Notes:** documentation is a product file: no task identifier, phase, registry name or `.magicspec/` path in it (`CONSTITUTION.md` §6). The page does not promise unattended scheduling: the mode runs inside the session (§2 of the specification).

### [T-53E01] The cognitive suite: the seven goal scenarios the plan lists

- **Spec:** l1-goal-mode.md GM-1 to GM-9, §6 item 4; l1-product-simulation.md §2 (the cognitive suite stands for this repository's scenario files); PLAN.md Phase 53 `Scenarios`
- **Status:** Todo
- **Assignment:** Agent (`@role:simulator-tester`)
- **Verify:** `tests/suite.md` gains, after T328, one case per scenario of the plan entry — a goal statement passes one intake and then runs to its criteria without a question (GM-1, GM-2, GM-4); an action that needs consent is queued and asked only when nothing unblocked remains (GM-5); three iterations without progress stop the mode with one report (GM-6, GM-8); no review gate or pre-flight check is relaxed in goal mode (GM-7); `goal` with no argument continues the recorded goal in a new session (GM-3); `goal phase-N` runs that phase to `Done`, and a phase not in the plan lists the plan's phases and runs nothing (GM-9 item 2); `goal 5 tasks` stops at a task boundary after five tasks reach `Done` (GM-9 item 3) — each in the suite's case form (`Workflow`, `Synthetic State`, `Action`, `Expected`, `Control`, `Guards tested`, `Regression for`), each expectation citing the GM statement it verifies; the suite's version moves 1.9.100 → 1.9.101; `grep -c "^### T3" tests/suite.md` grows by seven.
- **Handoff:** T-53T01.
- **Notes:** an expectation no statement of the specification or the body states is not written: it is a coverage gap, recorded for T-53S01 (SM-2). The remaining stop conditions (an integrity halt, a stated bound, an interruption) are covered by the Control lines of the stop-condition case, not by cases of their own — the plan lists seven.

### [T-53E02] The harness: the sweep of moved pins and the mutation entries

- **Spec:** l2-test-suite.md (the harness, the Mutation-Control Driver)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the full run `node --test tests/engine.js` reports `fail 0`; every case that pinned the twelve-command set, the router's row count, the demand values, the Input Pass body count or the generated contribution table is updated to the new set with the reason in `Changes` (none weakened to pass); each new case of this phase (M01, M02, M03, G01, G03) has at least one entry in a mutation list run by `node scripts/mutation-check.js {list.json}` that reports every entry `CAUGHT`, the list kept in the scratchpad and its count recorded in `Changes`.
- **Handoff:** T-53T01.
- **Notes:** write each new case before the change it guards and run it red, as `/magicspec-dev fix` requires of a repair. Run the mutation driver against a disposable copy (`--root`) while another harness run uses the repository, so the two never race on a mutated file.

### [T-53T01] Validation: harness, mutation checks, the suite, C14, the projection, the budgets

- **Spec:** l1-goal-mode.md (all); l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` reports `fail 0`; the mutation list of T-53E02 reports every entry `CAUGHT`; the cognitive suite's goal cases (T329 to T335) are simulated against `workflows/goal.md` and pass, with the result recorded per case; `node skills/magicspec/scripts/executor.js update-engine-meta --check` reports no drift; `.agents/rules/magicspec.md` equals the rule kernel's projection; `wc -c skills/magicspec/CONSTITUTION.md` is at most 16124; `check-prerequisites --json --workspace=engine` reports no warning this phase introduced; `node scripts/validate-hardlinks.js` passes; `node_modules/.bin/biome check` on every changed `*.js` and `*.json` and `pnpm run audit` report no finding on code written in this phase.
- **Handoff:** T-53S01.
- **Notes:** a failing case is fixed in the task that owns its subject, not here; this task records results.

### [T-53S01] Spec sync: as-built decisions, the supersessions declared, the registry

- **Spec:** l1-goal-mode.md §6 item 5 (declared supersessions); l1-session-continuity.md, l2-session-checkpoint.md, l2-status-command.md, l1-command-surface.md, l2-role-cards-governance.md, l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** each specification the phase built against gains a reality-sync patch with Stable retained and a history row: `l1-goal-mode.md` records the as-built decisions (the writer's options and the block's bound from M01, the handoff demand of a `goal` next step from G01, coverage gaps from E01 if any); `l1-session-continuity.md` the `## Goal` section in the live-memory layout; `l2-session-checkpoint.md` the goal in the resume line; `l2-status-command.md` the goal line of the briefing; `l1-command-surface.md` the `goal` row as built and the parser's demand value; `l2-test-suite.md` the harness count and the suite's version; every changed specification's header version equals its `.magicspec/engine/INDEX.md` row and the registry version moves 1.69.0 → 1.70.0; `check-prerequisites --json --verify-headers --workspace=engine` reports no `STATUS_DRIFT` or `VERSION_DRIFT`; `export-wiki` runs after the edits.
- **Handoff:** `/magicspec plan engine` after the phase (the registry and the constitution move, so the plan revalidates).
- **Notes:** a decision that changes a requirement is not a reality sync: it goes back as a finding, and the specification is amended through `/magicspec spec`, not here.
