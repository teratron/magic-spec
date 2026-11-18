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
**Verifies:** l1-goal-mode.md §3 GM-1, l1-goal-mode.md §3 GM-4, l1-goal-mode.md §3 GM-5, l1-goal-mode.md §3 GM-6, l1-goal-mode.md §3 GM-8
**Preconditions:** a disposable project as in S-11 with one workspace, an empty registry and no product code, and no goal recorded.

**Steps:**

1. `/magicspec goal "a command-line tool that prints the sum of its arguments, with a test that checks it"` → expect: the goal passes the input pass and the idea intake once, at the start, and the only questions of the whole run come there; the goal is clear, so none is asked (composed).
2. Give no further input → expect: the stages follow one another — specification, plan, tasks, execution — each ending at its own boundary after its own finalization, and nothing asks, pauses or waits between them (composed).
3. Wait for the mode to stop → expect: it stops on one closed condition and names it: every criterion met, nothing unblocked left with consents queued, three iterations without progress, an integrity halt, a bound the goal stated, or an interruption (composed).
4. Read the report → expect: one report is printed once, at the stop, holding the stop condition, the criteria each with its state and its evidence, the work per phase with a commit suggestion, the queued consents and the one next step (composed); each criterion marked met names evidence the project bears out — the command it names prints the sum and the test it names exists and passes (composed).

**Variants:** a step needs consent, such as deleting a file the goal does not own → it is not performed and not skipped in silence: it is queued with its reason, the work that does not depend on it goes on, the report counts it under the queued consents, and the question is asked once, in queue order, only after the mode has stopped (composed).

**Last run:** never
