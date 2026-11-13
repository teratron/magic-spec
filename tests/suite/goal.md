# Workflow Test Suite — goal

Cases of the area `goal` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

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
- **Control:** with no goal recorded anywhere, one line says so and the argument form asks for the scope once; a dismissed form runs nothing. A new scope given over a recorded goal replaces it with one `[DR]` naming the replaced goal.
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
