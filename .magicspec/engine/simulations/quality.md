# Quality

Each expectation ends with a tag: `(printed)` for an outcome observed directly — a line an engine script prints, or a file's presence, absence or unchanged content — and `(composed)` for text the agent writes from a workflow body.

## S-11: A failed step travels to its repair and back

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-product-simulation.md §3 SM-7, l1-command-surface.md §5.1 Command Table and Argument Contract, l1-fix-command.md §3 FX-8
**Preconditions:** a disposable project: a scratch directory outside this repository, holding its own copy of the engine folder, initialised there, with one workspace and a small product, a command-line tool that prints the sum of its arguments. Its specification states that a negative argument is summed like any other, and a scenario file in the project's simulations folder says so in a step; the tool is faulty and prints the sum of the absolute values. The scenario's last run reads never.

**Steps:**

1. `/magicspec simulate` → expect: the failed step is recorded under that scenario's last run with its observed outcome and its mode, and the passing steps are recorded as passed (composed); the report shows one finding (composed); the invocation ends naming `/magicspec fix {workspace}` as the one next step (printed).
2. `/magicspec fix` with no argument → expect: the argument form offers that failed step among its suggestions, the recommended one first (composed).
3. Choose the step → expect: the tool is repaired so it prints the right sum, and a lasting check is left behind that fails without the repair, a test or a scenario (composed); a repair without that check is not reported as done (composed).
4. `/magicspec simulate` again → expect: the failing lines of the scenario are replaced by the new run's lines, the step passes, no finding is reported and `fix` is not named as the next step (composed).

**Variants:** a repair that leaves the step failing → the second run replaces the lines with the new observed outcome and names `/magicspec fix {workspace}` again as the one next step (printed).

**Last run:** never

## S-12: A goal runs through the stages without pausing and reports once

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-goal-mode.md §3 GM-1, l1-goal-mode.md §3 GM-4, l1-goal-mode.md §3 GM-5, l1-goal-mode.md §3 GM-6, l1-goal-mode.md §3 GM-8, l1-goal-mode.md §3 GM-10, l1-goal-mode.md §3 GM-11
**Preconditions:** a disposable project as in S-11 with one workspace, an empty registry and no product code, and no goal recorded.

**Steps:**

1. `/magicspec goal "a command-line tool that prints the sum of its arguments, with a test that checks it"` → expect: the goal passes the input pass and the idea intake once, at the start, and the only questions of the whole run come there; the goal is clear, so none is asked (composed).
2. Give no further input → expect: the stages follow one another — specification, plan, tasks, execution — each ending at its own boundary after its own finalization, and nothing asks, pauses or waits between them (composed).
3. Watch the end of a stage → expect: a stage's finalization prints its handoff line (`Next: /magicspec {command} …`) and the same turn goes on with the re-check of the criteria and the next iteration; no summary that announces the next step, no offer to continue, no list of decisions that block nothing and no pause because the turn has been long or a phase is done (composed).
4. Wait for the mode to stop → expect: it stops on one closed condition and names it: every criterion met, nothing unblocked left with consents queued, three iterations without progress, an integrity halt, a bound the goal stated, or an interruption (composed).
5. Read the report → expect: one report is printed once, at the stop, holding the stop condition, the criteria each with its state and its evidence, the work per phase with a commit suggestion, the queued consents and the one next step (composed); each criterion marked met names evidence the project bears out — the command it names prints the sum and the test it names exists and passes (composed).
6. Look for a choice the files did not settle during the run, such as how an argument that is not a number is treated → expect: it was decided and narrated as one `[DR]` line, its premise is written where the work landed, and the one report lists it under `Assumptions` with the command that overrides it; nothing was asked after the intake and the work did not wait for an answer (composed).

**Variants:** a step needs consent, such as deleting a file the goal does not own → it is not performed and not skipped in silence: it is queued with its reason, the work that does not depend on it goes on, the report counts it under the queued consents, and the question is asked once, in queue order, only after the mode has stopped (composed).

**Last run:** never

## S-14: A bare goal runs the active phase and does not read a finished goal back

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-goal-mode.md §3 GM-3, l1-goal-mode.md §3 GM-8, l1-goal-mode.md §3 GM-9
**Preconditions:** a disposable project as in S-11 with one workspace and a plan of two phases, each decomposed into tasks the engine can run, and no goal recorded.

**Steps:**

1. `/magicspec goal` with no argument → expect: no argument form opens and nothing is asked; one `[DR]` line names the first phase as the active phase taken (composed); the phase is run to its end through its own bodies and the one report states `Stopped: done` with no `Assumptions` line (composed).
2. `/magicspec goal` again → expect: the second phase is taken with one `[DR]` line, and the finished goal of the first run is replaced without a line that names it (composed).
3. With both phases done, `/magicspec goal` once more → expect: nothing runs and no goal is recorded; one line states what the state records and names its one command, or none when nothing is pending, and `STATE.md` is unchanged (printed).

**Variants:** a goal recorded with a criterion not yet met → a bare `goal` continues it with one `Continuing:` line and takes no phase (composed).

**Last run:** never

## S-17: A defect on a 4.0 workspace becomes a change of kind `fix`, placed and built by its milestone

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l2-sdd-document-set-engine.md §5.4 row `fix`, l1-sdd-document-set.md §5.8 Changes after the first version, l1-fix-command.md §3 FX-8, l1-sdd-document-set.md §6 Implementation Notes
**Preconditions:** a disposable project with the engine installed, one 4.0 workspace whose first two milestones are built, and no `changes.md`. A requirement of the set states what the product's command prints; the command, as built, prints nothing.

**Steps:**

1. `/magicspec fix "the greet command prints nothing"` → expect: the defect is reproduced, and `changes.md` gains one change of kind `fix` with its `Source`, an `Evidence` naming the contradicted unit and the reproduction, the component under `Affects` and the status `placed` (composed; `fix.md` §On a 4.0 Workspace, steps 2 and 3); no product file differs (printed); `check-docs` reports only that the change names no milestone and that none builds its component yet, and the finalization ends with `Next: /magicspec plan {workspace} — deep reasoning` (printed; l2-sdd-document-set-engine.md §5.2).
2. `/magicspec plan` → expect: one milestone is appended that `Revises` the component and is named under the change's `Built by`, the done milestones unchanged (composed; `plan.md` §On a 4.0 Workspace, step 3); `check-docs` reports 0 findings and the finalization names `/magicspec task {workspace}` (printed).
3. `/magicspec task` → expect: the task file of that milestone lists the change in `Context`, builds the component and observes the reproduction in its `Done when` (composed; `task.md` §On a 4.0 Workspace, step 4, `fix.md` §On a 4.0 Workspace, step 4); `check-docs` reports 0 findings and the finalization names `/magicspec run {workspace}` (printed).
4. `/magicspec run` → expect: the repair is built from the pack and the reproduction now shows the stated outcome (composed; `run.md` §On a 4.0 Workspace, steps 4 and 5); `mark-built` reports one change built, the change reads `built` and `check-docs` reports 0 findings (printed; l2-sdd-document-set-engine.md §5.2, `mark-built`).

**Variants:** the report describes what the units state and the product does → the change is recorded `satisfied` with the stating units as its `Evidence`, no product file differs and nothing is planned for it (composed; `fix.md` §On a 4.0 Workspace, step 3); `check-docs` accepts it (printed).

**Last run:** never

## S-19: An audit of a 4.0 workspace reports where the map, the code and the product disagree, and writes no document

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l2-sdd-document-set-engine.md §5.4 row `analyze`, l1-sdd-reference-containment.md §3 RC-7, l1-sdd-document-set.md §5.9 The checker
**Preconditions:** a disposable project with one 4.0 workspace whose set is built, in which since then a source file the map names has been removed, a new source file has been added in a folder no map row covers, and a product file names a task of the set in a comment.

**Steps:**

1. Take a digest of every document of the set and every product file, then `/magicspec analyze` → expect: the report holds the checker's result with the stage that owns each finding (composed; `analyze.md` §On a 4.0 Workspace, The Audit, step 2).
2. Read the map comparison → expect: `analyze-coverage` prints `map:{key}: {path} is missing` for the removed file and `{file}: no map row` for the new one, and its summary counts both; each is a finding that names `/magicspec spec {workspace}` (printed; step 3).
3. Read the containment findings → expect: the comment naming the task is reported as `SDD_REFERENCE_LEAK` with its file and line and the remediation path, and the product file is not edited (composed; step 4, `references/rules/containment.md` §On a 4.0 Workspace).
4. Take the digest again → expect: no document of the set and no product file differs from the first digest; only the engine snapshot of the global registry and the graph folder may (printed; the audit, step 6).

**Variants:** a component key written where the bindings use it as a name is no finding (composed; `references/rules/containment.md`).

**Last run:** never
