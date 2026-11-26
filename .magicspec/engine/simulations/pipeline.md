# Pipeline

Each expectation ends with a tag: `(printed)` for an outcome observed directly — a line an engine script prints, or a file's presence, absence or unchanged content — and `(composed)` for text the agent writes from a workflow body.

## S-1: An idea becomes a running task, one stage per command

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-pipeline-stages.md §3 PS-1, l1-pipeline-stages.md §3 PS-7, l1-pipeline-stages.md §5.4 Handoff Line, l1-plan-command.md §3 PL-5, l2-engine-finalization.md §13 Git Probes
**Preconditions:** a disposable project: a scratch directory outside this repository, holding its own copy of the engine folder, initialised there, with one workspace, an empty registry and no product code.

**Steps:**

1. `/magicspec spec "a small command-line tool that prints the sum of the numbers given as arguments"` → expect: one specification is written and registered, and nothing is asked once the idea is given (composed); no plan and no task file exists yet (printed); the invocation ends with one handoff line `Next: /magicspec plan {workspace} — deep reasoning` (printed).
2. `/magicspec plan` → expect: the plan places the specification that step 1 wrote in a phase and states the order and its reason (composed); the task ledger holds no row for the phase and no phase workbook exists (printed); the invocation ends with `Next: /magicspec task {workspace} — standard reasoning` (printed).
3. `/magicspec task` → expect: the phase is decomposed into tasks, each citing a section of that specification and carrying a verify line, in the task ledger and a phase workbook (composed); no product file has been written (printed); the invocation ends with `Next: /magicspec run {workspace} — standard reasoning` (printed).
4. `/magicspec run` → expect: the tasks of the phase are executed as the workbook states them and each is recorded there as done or blocked (composed); nothing is asked and nothing waits at the end of the invocation (composed); the invocation ends with a handoff line that names `/magicspec run {workspace} — standard reasoning` while a task remains, and otherwise the step the recorded state computes (printed).

**Variants:** a request whose own words ask for the following stage too ("specify this and plan it") runs both stages, says in one line that the request asked for the second, and still ends after it with that stage's own handoff line, naming `task` (composed). The project is a git repository with no commit yet → the stages run the same way and no finalization prints a line of git's, neither a `fatal:` line nor a line-ending warning (printed; l2-engine-finalization.md §13).

**Last run:** never

## S-2: A stage started in a new session continues from the files

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-pipeline-stages.md §3 PS-2, l1-pipeline-stages.md §5.4 Handoff Line, l1-session-continuity.md §3 SC-6
**Preconditions:** a disposable project as in S-1, as it stands after step 2 of S-1, with one open point settled by the first stage: the idea did not say whether the tool accepts decimals, and the specification records the choice, integers only, as an assumption with its override. The specification and the plan exist, the task ledger holds no phase, and the session that wrote the plan has been closed. Each later session is a new one, with no conversation memory, started by another model.

**Steps:**

1. In the first new session type `/magicspec task` → expect: the phase the plan names is decomposed into tasks whose verify lines follow the recorded assumption, integers only, and no question asks the person to decide again what the assumption settled (composed).
2. Compare the handoff line of the invocation with the next action recorded in `STATE.md` → expect: both name the same command with the same workspace argument (printed).
3. Read the last lines of the output → expect: one line states that the checkpoint was written (printed).
4. In a second new session type `/magicspec run` → expect: the tasks are executed from the workbook alone, and the tool the run builds refuses a decimal as the recorded assumption says (composed).

**Variants:** the earlier session ended while a task of a phase was in flight: `/magicspec run` in the new session takes that task first, reads the dead ends recorded on it and does not repeat one without saying what is different this time (composed).

**Last run:** never

## S-3: A finished plan names planning, never specifying or auditing

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-plan-command.md §3 PL-5, l1-plan-command.md §3 PL-6, l1-session-continuity.md §3 SC-2
**Preconditions:** a disposable project as in S-1 whose single phase has one task left open. The specification was amended by a patch after the plan was written, so it stays `Stable` but its version is later than the one the plan records.

**Steps:**

1. `/magicspec run` → expect: the last task is executed and the phase is complete (composed); the plan's record of the specification, now behind it, is reported as drift and is not repaired by the run (composed); exactly one next step is named, `/magicspec plan {workspace}` (printed).
2. Read the next action recorded in `STATE.md` → expect: it names that one command and names neither `/magicspec spec` nor `/magicspec analyze` (printed).
3. `/magicspec status` → expect: the briefing replays that next action and recommends the same one command (composed).

**Variants:** the person types the one command named, `/magicspec plan`, and the plan then holds the later version of the specification: if the phase it holds changed, the invocation ends naming `/magicspec task {workspace}`, otherwise it ends with the step the plan state computes (composed).

**Last run:** never

## S-15: An idea on a 4.0 workspace reaches a built first milestone

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l2-sdd-document-set-engine.md §5.4 rows `spec`, `plan`, `task`, `run`, l2-sdd-document-set-engine.md §5.2 (`check-docs`, `pack`, `mark-built`, `finalize`), l1-pipeline-stages.md §5.4 Handoff Line
**Preconditions:** a disposable project with the engine installed, one registered workspace whose entry in `workspace.json` carries `"format": "4"`, no document in it and no product code. The stages are typed one at a time.

**Steps:**

1. `/magicspec spec "a command that reads a list of dated items and prints those due on a given date, in JavaScript on Node"` → expect: `product.md`, `rules.md` without a `From` line and one `spec/{key}.md` per component with behaviour, then a reading by a reader of another stack and its rewrites, at most three (composed; `spec.md` §On a 4.0 Workspace, steps 2.1 and 2.2).
2. The same invocation writes the stack layer → expect: `stack/{stack}/` holds the profile, the stack's rules, the dependencies and one binding per component (composed; `spec.md` §On a 4.0 Workspace, step 2.3); `check-docs` prints a summary with 0 findings, and no `plan.md` and no task file exists (printed; `spec.md` §On a 4.0 Workspace, step 4); the invocation ends with `Next: /magicspec plan {workspace} — deep reasoning` (printed; l2-sdd-document-set-engine.md §5.2, `finalize`).
3. `/magicspec plan` → expect: `plan.md` holds milestones whose first is observed by running the product, and every rule gains its `From` (composed; `plan.md` §On a 4.0 Workspace, step 2); `check-docs` reports 0 findings and no task file exists (printed; step 5); the invocation ends with `Next: /magicspec task {workspace} — standard reasoning` (printed).
4. `/magicspec task` → expect: `stack/{stack}/tasks/M1.md` holds the tasks of the first milestone, every binding unit it builds in exactly one task, and a task whose `Done when` runs the use the milestone is observed by (composed; `task.md` §On a 4.0 Workspace, step 4); `pack` prints each task's pack within its budget and `check-docs` reports 0 findings (printed; steps 5 and 6); the invocation ends with `Next: /magicspec run {workspace} — standard reasoning` (printed).
5. `/magicspec run` → expect: each task is built from its pack by a builder that reads the pack file and the workspace and nothing else of the documents, and is recorded done in `memory/state.md` only once its observations hold (composed; `run.md` §On a 4.0 Workspace, steps 3 to 6).
6. The same invocation closes the milestone → expect: the milestone's `Observed by` is run on the built product (composed; step 7); `mark-built M1` prints the map rows it wrote, `memory/state.md` gains `- Done: M1`, and `memory/map.md` names for each built component its files, never a task address (printed; l2-sdd-document-set-engine.md §5.2, `mark-built`); the finalization writes the `Next` line and ends naming the stage the set waits for (printed; l2-sdd-document-set-engine.md §5.2, `finalize`).

**Variants:** an input after the first version, "an item due today is listed first": `/magicspec spec` records it in `changes.md` before editing a unit, edits the units at a new revision and sets the change `placed` (composed; `spec.md` §On a 4.0 Workspace, step 3); until the later stages run, `check-docs` reports only the change without its milestone and its stale units (printed; step 4); the invocation ends with `Next: /magicspec plan {workspace} — deep reasoning` (printed). A stack not named by the idea: no stack layer is written, the finalization names no command, and the invocation asks for the stack through `/magicspec spec` (composed; step 6).

**Last run:** never
