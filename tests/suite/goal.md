# Workflow Test Suite — goal

Cases of the area `goal` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

## Cases

### T329 — A Goal Statement Passes One Intake and Then Runs to Its Criteria Without a Question

- **Workflow:** `goal.md` (Steps 1 to 5) with `spec.md` (the Idea Intake Gate)
- **Synthetic State:** a workspace with no goal recorded; one Stable specification that states the CSV import and nothing else.
- **Action:** `/magicspec goal "the import works end to end for all three file formats"`.
- **Expected:**
  - [ ] The Input Pass and the Idea Intake Gate run once, before anything is written; the survey, when it fires, is the only question asked, and whatever it leaves open is recorded as an `Assumption (forecast)` (GM-1).
  - [ ] The goal block records the statement and criteria that each name a check (a command, a test, a scenario or a specification statement whose tasks are `Done`); a criterion with no possible check is rewritten or recorded as an assumption (GM-2).
  - [ ] The JSON and XML criteria, which no Stable specification states, go to `spec` first with no second survey; `plan`, `task` and `run` follow, each read from its own body, ending at its own boundary and finalizing as its own workflow (GM-4).
  - [ ] After the intake nothing is asked until the mode stops.
- **Control:** `goal phase-3` and `goal 5 tasks` ask nothing at all, not even a survey.
- **Guards tested:** GM-1; GM-2; GM-4.
- **Regression for:** none yet — new with the goal command.

### T330 — A Consent Is Queued and Asked Only When Nothing Unblocked Remains

- **Workflow:** `goal.md` (Core Invariant 4, the Report) with `run.md`
- **Synthetic State:** a phase of two tasks; one removes the old importer (a destructive action, E1), the other is independent of it.
- **Action:** `/magicspec goal phase-2`.
- **Expected:**
  - [ ] The removal is neither performed nor silently skipped: it is queued in the goal block with its reason, and its task is `Blocked [!]` with the reason `waiting for consent: {action}`.
  - [ ] The independent task runs to `Done`; no question is asked while it runs (GM-5).
  - [ ] The mode stops with `Stopped: consent queued`, prints its one report, and only then asks the queued question: one question, at most three fixed options, the forecast's winner marked as the default.
  - [ ] A yes carries out that one action and nothing else; a no drops it; either way the report stands.
- **Control:** a consent question never appears in the middle of a step, and a queued action is never performed on a silence.
- **Guards tested:** GM-5; GM-6 (condition 2); GM-8.
- **Regression for:** none yet — new with the goal command.

### T331 — Three Iterations Without Progress Stop the Mode With One Report

- **Workflow:** `goal.md` (Step 5 progress, Step 6, the Report)
- **Synthetic State:** a criterion whose check fails the same way after each repair; no iteration changes a criterion's state, a task's status, a specification's status, the plan or a finding.
- **Action:** `/magicspec goal "the importer rejects malformed files"`, run until it stops.
- **Expected:**
  - [ ] The goal block's `Without progress` reads 1, 2, 3 after the successive iterations; the mode stops after the third with `Stopped: no progress` (GM-6).
  - [ ] One report is printed, with each criterion's state and evidence, and its `Next:` is the one command the last HALT or finalization named (GM-8).
- **Control:** an iteration that closes a finding resets the counter to 0; a goal that states "give up after 5 rounds without progress" stops after five, not three; repeating a step on unchanged input with an unchanged outcome counts as no progress.
- **Guards tested:** GM-6 (condition 3 and the definition of progress); GM-8.
- **Regression for:** none yet — new with the goal command.

### T332 — No Review Gate or Pre-flight Check Is Relaxed in Goal Mode

- **Workflow:** `goal.md` (Core Invariant 4) with `run.md` (Steps 1 and 3.4 to 3.5)
- **Synthetic State:** a task of the goal's phase whose diff changes an instruction text; a second case in which a specification header disagrees with its registry row.
- **Action:** `/magicspec goal phase-4`, in both states.
- **Expected:**
  - [ ] The first task passes the `code-reviewer`, `prompt-engineer` and `test-engineer` gates exactly as `/magicspec run` applies them; no gate is skipped to save a step (GM-7).
  - [ ] The header mismatch is the Pre-flight HALT `STATUS_DRIFT` or `VERSION_DRIFT`; the mode ends with `Stopped: integrity halt` and does not continue past it (GM-6 condition 4).
- **Control:** a specification demoted since the plan was written halts `run` with `/magicspec plan` as its step, and the iteration takes that step (it is a recorded next step, not an integrity halt).
- **Guards tested:** GM-7; GM-6 (condition 4).
- **Regression for:** none yet — new with the goal command.

### T333 — `goal` With No Argument Continues the Recorded Goal in a New Session

- **Workflow:** `goal.md` (Step 1, Core Invariant 1) with `scripts/resume-state.js`
- **Synthetic State:** a workspace whose `STATE.md` records a goal with one criterion `met` and two `open`; a second workspace records none; a new session.
- **Action:** the session starts, then `/magicspec goal`.
- **Expected:**
  - [ ] The resume line names the goal and its counts — `goal "{statement}" — 1 met, 2 open, 0 blocked` — and `Next: /magicspec goal` (GM-3).
  - [ ] A bare `goal` finds the workspace that records a goal even though the resolved one does not, prints `Continuing: goal {scope} — …`, re-checks the criteria and continues from the choice of the next step; no intake runs again and nothing is asked.
- **Control:** a goal recorded in another workspace with a criterion not `met` is continued before any default applies; with none unfinished anywhere, the default of T367 runs and nothing is asked. A new scope given over a recorded goal replaces it with one `[DR]` naming the replaced goal.
- **Guards tested:** GM-3; GM-1.
- **Regression for:** none yet — new with the goal command.

### T334 — `goal phase-N` Runs That Phase to Done, and a Phase Not in the Plan Lists the Plan's Phases and Runs Nothing

- **Workflow:** `goal.md` (Argument Routing, Step 3) with `task.md` and `run.md`
- **Synthetic State:** a plan holding phases 1 to 3; phase 3 is not decomposed yet.
- **Action A:** `/magicspec goal phase-3`.
- **Expected A:**
  - [ ] No intake runs and nothing is asked; the mode runs `task` for the phase, then `run` while it has a runnable task, and stops with `Stopped: done` when the phase's status is `Done` (GM-9 item 2).
  - [ ] The goal block holds the one criterion `phase 3 is Done`, `met` at the end.
- **Action B:** `/magicspec goal phase-9`.
- **Expected B:**
  - [ ] One line lists the plan's phases; nothing runs and nothing is written.
- **Control:** `/magicspec goal 3` — a number with no unit — is read as a goal statement and the intake runs.
- **Guards tested:** GM-9 (item 2 and the unit-less number); GM-1.
- **Regression for:** none yet — new with the goal command.

### T335 — `goal 5 tasks` Stops at a Task Boundary After Five Tasks Reach Done

- **Workflow:** `goal.md` (Step 4 task limit, Step 6 condition 5) with `run.md`
- **Synthetic State:** an active phase with eight runnable tasks and no goal recorded.
- **Action:** `/magicspec goal 5 tasks`.
- **Expected:**
  - [ ] `run` is invoked for one task at a time, the next runnable one; the block's `Tasks done` counts the tasks that reach `Done`.
  - [ ] After the fifth the mode stops with `Stopped: bound reached`; no task is `In Progress` and none is cut off in the middle (GM-9 item 3).
  - [ ] The report lists the five tasks' work per phase with a commit suggestion as text, and `Next: /magicspec goal — per step reasoning`.
- **Control:** `/magicspec goal phase-3 5 tasks` stops at the end of the phase or after five tasks, whichever comes first; a task that ends `Blocked [!]` does not count toward the five.
- **Guards tested:** GM-9 (item 3); GM-6 (condition 5).
- **Regression for:** none yet — new with the goal command.

### T365 — A Step's Finalization Ends With Its Handoff Line and the Iteration Goes On in the Same Turn

- **Workflow:** `goal.md` (Core Invariant 4, Step 5 and Step 6) with the finalization output of the step it ran
- **Synthetic State:** a goal recorded with two criteria `open`; the step just run is `task`, and its finalization output ends with `Next: /magicspec run {workspace} — standard reasoning`; no condition of Step 6 holds.
- **Action:** the finalization output of the step is displayed.
- **Expected:**
  - [ ] The same turn goes on: the criteria are re-checked, the block is recorded and the next iteration starts with the step the files compute — the handoff line is the input of the next iteration, not the end of the turn (GM-10).
  - [ ] The message that ends the step holds no summary that closes by announcing the next step, no offer to continue, no list of decisions that block nothing and no pause because the turn has been long or a phase is done; a progress note, when there is one, is in the same message as the next action.
  - [ ] A decision that blocks none of the remaining work is decided and narrated as a `[DR]`; one that needs consent is queued with its reason (GM-5).
  - [ ] The turn ends only for a round of the intake survey at the start (GM-1) or for the report of one of the six conditions, with the queued consents asked after it (GM-6, GM-8).
- **Control:** the host ends the turn on its own, by a limit or an error: the iteration ends there and is not a stop of the mode; the next session's bare `goal` continues from the recorded goal (GM-3).
- **Guards tested:** GM-10; GM-6 (the closed list of six); GM-3.
- **Regression for:** the handoff line of a stage's finalization read, inside goal mode, as the end of the turn — a stop on no condition and without the report.

### T367 — A Bare `goal` With No Unfinished Goal Takes the Active Phase and Asks Nothing

- **Workflow:** `goal.md` (Argument Routing, Step 1, Step 3) with `task.md` and `run.md`
- **Synthetic State:** a workspace whose plan holds phases 3 and 4; phase 3 is decomposed with two `Todo` tasks, phase 4 is not; no goal is recorded.
- **Action:** `/magicspec goal`.
- **Expected:**
  - [ ] No argument form opens and nothing is asked; one `[DR]` line names phase 3 as the active phase taken (GM-9 item 6, GM-1).
  - [ ] The goal block records the phase goal with the one criterion `phase 3 is Done`, and the iteration runs the two tasks through `run`, as `goal phase-3` would (GM-9 item 2).
  - [ ] The mode stops at the phase's end with the one report; its `Next:` is the step the pipeline state computes.
- **Control:** a goal recorded with a criterion `open` is continued, not replaced: one line `Continuing: goal {scope} — …` and no `[DR]` that names a phase.
- **Guards tested:** GM-9 (item 6); GM-1; GM-3.
- **Regression for:** a bare `goal` that showed the argument form, where an optional argument runs its default.

### T368 — A Finished Goal Is Replaced Without a Line, and a Bare `goal` With No Phase to Take Runs Nothing

- **Workflow:** `goal.md` (Argument Routing, Step 1)
- **Synthetic State:** four states of a workspace. (a) A goal recorded with every criterion `met`, and phase 4 now the active phase. (b) A complete plan, every phase `Done (Archived)`, no goal. (c) A plan the registry has moved past (`SYNC_GAP`), no goal. (d) The active phase `Blocked`, no goal.
- **Action:** `/magicspec goal` in each state.
- **Expected:**
  - [ ] (a) takes phase 4 as the phase goal with one `[DR]` line naming it; the finished goal is replaced and no line names it.
  - [ ] (b) to (d): nothing runs, no goal is recorded and no report is printed; one line states what `Next Action` records and names its one command — none for a complete plan with nothing pending, `/magicspec plan {workspace}` for the stale plan.
- **Control:** `goal phase-5` over the finished goal of (a) replaces it without a line; over an unfinished goal it replaces it with one `[DR]` naming the replaced goal.
- **Guards tested:** GM-9 (item 6); GM-3.
- **Regression for:** a finished goal read back by every later bare `goal`, so that no phase after it was ever taken.

### T369 — `goal phase-3..5` and `goal plan` Record One Criterion Over a Fixed Set of Phases

- **Workflow:** `goal.md` (Argument Routing, Steps 1, 3 and 4)
- **Synthetic State:** a plan with phases 1 and 2 `Done (Archived)` and phases 3 to 6 open.
- **Action:** `/magicspec goal phase-3..5`; in a second run of the state, `/magicspec goal plan`; in a third, `/magicspec goal phase-5..3`.
- **Expected:**
  - [ ] The first records one criterion, `phases 3..5 are Done`, with `phase` 3 and `phaseTo` 5, runs phase 3 through its rows, then phase 4, then phase 5, and the criterion is met when all three are `Done`; no intake runs and nothing is asked (GM-9 items 3 and 4, GM-1).
  - [ ] The second records `phases 3..6 are Done`, the open phases read at that moment, and the resume line spells the scope `phase-3..6`.
  - [ ] The third answers with one line listing the plan's phases and runs nothing.
- **Control:** a replan that adds phase 7 while `goal plan` runs does not extend the goal: phase 7 is outside it and the report's `Next:` leads to it.
- **Guards tested:** GM-9 (items 3 and 4), §2 (the set of phases is fixed); GM-1.
- **Regression for:** none yet — new with the optional argument.

### T370 — The First `spec` Run of a Goal Statement Takes the Whole Brief

- **Workflow:** `goal.md` (Steps 2 to 4) with `spec.md`
- **Synthetic State:** no goal; an empty registry; the statement is a brief that names eight criteria no specification states.
- **Action:** `/magicspec goal "{the brief}"`.
- **Expected:**
  - [ ] The intake runs once; then one `spec` run takes the intent statement with all eight criteria and writes a set of specifications that passes one Post-Update Review (GM-4).
  - [ ] No further `spec` run happens for those criteria; planning and decomposition follow.
- **Control:** a later check finds a ninth uncovered criterion: it is a `spec` run of its own, with that one criterion and no survey.
- **Guards tested:** GM-4 (the first `spec` run); GM-1.
- **Regression for:** one `spec` run per uncovered criterion, so that a large brief passed as many separate reviews as it had criteria.

### T371 — A Fork the Evidence Does Not Settle Is Decided, Recorded and Reported, Never Asked

- **Workflow:** `goal.md` (Core Invariant 4 GM-11, Step 5, the Report)
- **Synthetic State:** a goal recorded and running; a task whose specification leaves open how a value is read, with two readings that would build different code; a later task whose step needs a deletion that cannot be undone.
- **Action:** the iteration reaches both tasks.
- **Expected:**
  - [ ] The first fork is decided by the Consequence Forecast and narrated as one `[DR]`; its premise is written into the specification where the work lands as an `Assumption (forecast)` and appended to the block's premises with its override; nothing is asked and the work does not wait (GM-11).
  - [ ] The deletion is queued as a consent with its reason and its dependent work is set `Blocked [!]`; the iteration goes on with the work that does not depend on it (GM-5).
  - [ ] The report lists `Assumptions: 1` with the premise and its override beside `Queued consents: 1`, and the consent is asked once, after the report (GM-8).
- **Control:** the block's bound leaves no room for a premise: the oldest premise is dropped and counted, the write is not refused, and the report says how many older ones are not kept.
- **Guards tested:** GM-11; GM-8; GM-5; GM-3.
- **Regression for:** none yet — new with the optional argument.
