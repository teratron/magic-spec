# Routing

Each expectation ends with a tag: `(printed)` for an outcome observed directly — a line an engine script prints, or a file's presence, absence or unchanged content — and `(composed)` for text the agent writes from a workflow body.

## S-9: With two workspaces a command names the one it chose, once, and later commands find it again

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-workspace-intent-routing.md §3 WI-11, l1-workspace-intent-routing.md §3 WI-12, l1-workspace-intent-routing.md §3 WI-13
**Preconditions:** a disposable project: a scratch directory outside this repository, holding its own copy of the engine folder, initialised there, with two workspaces, `api` whose scope is `src/api` and `web` whose scope is `src/web`, `api` being the default. Each workspace has a specification and a plan, and no phase is decomposed.

**Steps:**

1. `/magicspec task "split the checkout flow in src/web/cart"` → expect: the line `[Workspace] web — {signal}. (Override: /magicspec task {other} …)` is printed once, its signal being the location of the path the request names, although `api` is the default (printed); the phase of `web` is decomposed and no file of `api` differs from before the command (printed).
2. `/magicspec run web` and end the session while the first task is in flight → expect: the line `[Workspace] web — {signal}. (Override: /magicspec run {other} …)` is printed once, its signal being the explicit argument, and the first task of `web` reads as in flight (printed).
3. In a new session type `/magicspec run` with no argument and no path → expect: the line `[Workspace] web — {signal}. (Override: /magicspec run {other} …)` is printed once, its signal being the work in flight, although `api` is the default, and the task in flight is the one taken up (printed).

**Variants:** a task is in flight in both `api` and `web` when the new session starts → the work in flight is not one workspace's, so it decides nothing and the default, `api`, is used, the line naming `api` with the default as its signal (printed).

**Last run:** never

## S-10: An unknown workspace stops the command, writes nothing, and the listed names work

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-workspace-intent-routing.md §3 WI-11, l1-workspace-intent-routing.md §3 WI-14, l1-workspace-intent-routing.md §5 G4
**Preconditions:** a disposable project as in S-9.

**Steps:**

1. Take a digest of every file of the project, names and contents, then `/magicspec task mobile` → expect: the command stops, says that the workspace `mobile` is unknown and lists the registered workspaces, `api` and `web` (printed); no folder for `mobile` exists in the state folder (printed).
2. Take the digest again → expect: it equals the first: nothing was written (printed).
3. `/magicspec task web`, one of the names the stop listed → expect: the command runs as asked and prints one routing line naming `web` (printed).

**Variants:** the same name given through the environment instead of the argument stops the same way and writes nothing (printed); the one command that may create a workspace is `/magicspec spec` — asked to open a new workspace `mobile` it creates it, and afterwards `/magicspec task mobile` is accepted (composed).

**Last run:** never

## S-16: `goal M3..M5` on a 4.0 workspace records its goal in `memory/goal.md` and stops when the milestones are built

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-goal-mode.md §3 GM-3, l1-goal-mode.md §3 GM-4, l1-goal-mode.md §3 GM-6, l1-goal-mode.md §3 GM-8, l2-sdd-document-set-engine.md §5.4 row `goal`, l1-sdd-document-set.md §5.7 Memory, l1-sdd-document-set.md §6 Implementation Notes
**Preconditions:** a disposable project with the engine installed, one registered workspace whose entry in `workspace.json` carries `"format": "4"`, holding a document set with its stack layer and a plan of five milestones, of which `M1` and `M2` are built and recorded done in `memory/state.md`, with no goal recorded.

**Steps:**

1. `/magicspec goal M3..M5` → expect: nothing is asked; the goal is recorded with the one criterion `M3..M5 are done` (composed; `goal.md` §On a 4.0 Workspace, steps 1 and 3), `update-state` prints `[update-state] memory/goal.md written` and `memory/goal.md` holds the target `3..5`; no `STATE.md` exists in the workspace (printed; l1-sdd-document-set.md §5.7).
2. End the session at a stage boundary and ask a new one where the project stands → expect: one line `▶ Resume [{workspace}]: goal M3..M5 — 0 met, 1 open, 0 blocked. Next: /magicspec goal` (printed; l1-goal-mode.md §3 GM-3); the briefing names `/magicspec goal` (composed; `status.md` §On a 4.0 Workspace, step 3).
3. `/magicspec goal` → expect: one `Continuing:` line with the scope `M3..M5`; the tasks of `M3` are written and built through the sections of `task` and `run`, each stage finalizing as itself and none waiting for input (composed; `goal.md` §On a 4.0 Workspace, steps 4 and 5); while a milestone has no task file the finalization names `/magicspec task {workspace}` (printed; l2-sdd-document-set-engine.md §5.2, `finalize`).
4. Wait for the mode to stop → expect: `memory/state.md` holds a `- Done:` line for `M3`, `M4` and `M5`, and the finalization states that nothing is pending (printed; l2-sdd-document-set-engine.md §5.2, `finalize`); one report is printed once, stopped on done, with one `Work:` line per milestone (composed; l1-goal-mode.md §3 GM-8, `goal.md` §On a 4.0 Workspace, step 6).

**Variants:** `/magicspec goal M9` names a milestone the plan lacks → one line lists the milestones, nothing runs and no `memory/goal.md` is written (composed; `goal.md` §On a 4.0 Workspace, step 1).

**Last run:** never
