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
