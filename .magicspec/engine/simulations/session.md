# Session

Each expectation ends with a tag: `(printed)` for an outcome observed directly — a line an engine script prints, or a file's presence, absence or unchanged content — and `(composed)` for text the agent writes from a workflow body.

## S-7: The status briefing reads and changes nothing, and agrees with the line the last stage printed

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-session-continuity.md §3 SC-4, l1-decision-autonomy.md §3 DA-3
**Preconditions:** a disposable project: a scratch directory outside this repository, holding its own copy of the engine folder, initialised there, with one workspace, a specification, a plan and a phase of two tasks. The first task is done; the session ended while the second was in flight, and the next action recorded in `STATE.md` names one command.

**Steps:**

1. Take a digest of every file of the project, names and contents → expect: a baseline to compare against (printed).
2. `/magicspec status` → expect: a briefing shows the current position and progress, the open and next tasks, the blockers, the recent decisions, the engine-version state and exactly one recommended next command (composed).
3. Take the digest again → expect: it equals the baseline: no file was written, no version moved and no finalization output was printed (printed).
4. Compare the recommended command with the next action recorded in `STATE.md` → expect: the briefing replays that next action unchanged as its one recommendation (composed).

**Variants:** the next action in `STATE.md` has been replaced by a note in the person's own words that names no command ("waiting for the design review") → the briefing replays the note as written and adds no command of its own (composed).

**Last run:** never

## S-8: A replaced engine folder brings one drift line and the requested command still runs

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-decision-autonomy.md §3 DA-9, l1-session-continuity.md §3 SC-4
**Preconditions:** a disposable project as in S-7 with a specification and a plan and no phase decomposed. The engine folder was then replaced by a release one patch newer, so the engine version differs from the one `INDEX.md` records as analysed.

**Steps:**

1. `/magicspec task` → expect: one informational line names the earlier and the present engine version and recommends exactly one path, `/magicspec analyze` (composed); no `[y/n]`, no option menu and no question follows, and `task` runs as asked and decomposes the phase (composed).
2. `/magicspec run` without running the recommended audit → expect: the command runs as asked and is not refused because the drift was not revalidated (composed).
3. `/magicspec status` → expect: the briefing shows the same drift as one line of its content and starts no analysis (composed).

**Variants:** the person follows the recommendation and types `/magicspec analyze` → expect: the audit runs; typing it is the person's override and not the answer to a question, because no question was put to the person before it (composed).

**Last run:** never
