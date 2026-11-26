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

## S-20: `migrate --to 4` previews, asks once and moves a 3.x workspace, or leaves it on 3.x with the findings it cannot close

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-command-surface.md §3 CS-6, l1-command-surface.md §3 CS-8, l2-sdd-document-set-engine.md §5.5 Migration, l1-skill-packaging.md §3 SP-10
**Preconditions:** a disposable project with one workspace on the 3.x layout (a registry, two specifications, a plan, a ledger with an open phase, `STATE.md`, workspace rules, an archived phase and a scenario file citing a specification), code beside it, no folder `next/`, and every file committed.

**Steps:**

1. Take a digest of every file of the project, names and contents → expect: a baseline to compare against (printed).
2. `/magicspec migrate --to 4` → expect: the dry run is shown as printed: each file of the workspace with its place, a `split by the reverse mode` line for each specification, a `scenario to rewrite` line for the scenario and `next/: absent — write it with /magicspec analyze first-time` (printed); a folder `next/` is created and the run ends naming `/magicspec analyze first-time {workspace}` with its demand, with no question (composed); the digest of every file is unchanged (printed).
3. `/magicspec analyze first-time {workspace}` → expect: the set is written into `next/` from the code, with the 3.x specifications as a source beside it; a requirement the analysis cannot observe is an `- Open:` line; no `mark-built` runs, and the report ends naming `/magicspec migrate --to 4 {workspace}` (composed); no file outside `next/` changes but the engine snapshot of the global registry (printed).
4. `/magicspec migrate --to 4` while an open question remains in `next/` → expect: the dry run reports `next/: {n} findings` with each finding (printed); nothing is asked and the workspace stays on 3.x with both trees in place (composed).
5. The question is answered, the set is brought to a clean check, and `/magicspec migrate --to 4` is run again → expect: `next/: clean` (printed), then exactly one question with the move marked as recommended and *Not now* beside it (composed).
6. Choose *Not now* → expect: nothing changes and both trees stay (printed).
7. Run the command again and say yes → expect: `[migrate] {workspace} is a 4.0 workspace.`; the 3.x files are under `archives/3x/`, the earlier archives and the scenario file are where they were, `next/` is gone, the workspace's entry in `workspace.json` carries `"format": "4"` and `check-docs` reports no finding (printed).
8. Read the report → expect: each milestone whose observation holds on the code is recorded built, the scenarios to rewrite are named, and the one next step is `/magicspec status {workspace}` (composed).
9. `/magicspec migrate --to 4` once more → expect: `[migrate] {workspace} is already a 4.0 workspace; nothing to do.` and no question (printed).

**Variants:** the apply step is interrupted after its first move → `/magicspec run` on the workspace stops with `HALT: The move of {workspace} to 4.0 was started and not finished.` naming `/magicspec migrate --to 4`, writing nothing (printed), and that command shows the move under way, asks once and finishes it in the same tree (printed). A bare `/magicspec migrate` in the same project is the move from the earlier layout and answers that there is nothing to migrate, offering no move to 4.0 (printed). With a second workspace registered as the default and the move interrupted the same way, `/magicspec graph` is built for that workspace and leaves the moving one out whole: no node of it, of its specifications or of its phases (printed); once the move is finished the graph names it again (printed), and its row of the global registry names it without a link to a registry, every other line as it was (printed).

**Last run:** never
