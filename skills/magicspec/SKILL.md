---
name: magicspec
description: Runs the Specification-Driven Development pipeline of a project, with `spec` to specify, `task` to plan, `run` to execute, and `analyze`, `rule`, `status` and `graph` to keep the project healthy, `migrate` to move a project from the earlier layout, and `help` to list the commands. Use when the user asks to specify, plan or implement work through the SDD workflow, to record a project rule, to audit the project against its specifications, to see where the project stands, to map the specification graph, to migrate a 2.x project, or to see what the engine can do, and when the user types `magicspec` with or without a command.
argument-hint: "<command> [argument]"
---

# Magic Spec

One skill, one command: `/magicspec <command> [argument]`. Every command is a workflow in `workflows/`; this file only routes to it.

**Paths.** Every path in this skill is relative to the folder that holds this file. Scripts run as `node <this folder>/scripts/executor.js <script> [args]`; templates, roles and references are read from `templates/`, `roles/` and `references/` of the same folder. Project files (`.magicspec/…`, `CHANGELOG.md`, source) are relative to the project root, which the executor finds from the working directory.

## Commands

The grammar is `/magicspec <command> [argument]` (`$magicspec <command> [argument]` on a host that invokes skills with a dollar sign). The first word after `magicspec` is the command when it equals a command name, in any letter case; the rest is its argument. The colon spelling `magicspec:<command>`, typed as text, is read the same way and is never printed. No host receives a per-command entry: this file is the only surface.

| Command | Group | What it does | Argument | When it is missing | Body |
| --- | --- | --- | --- | --- | --- |
| `spec` | pipeline | Creates, amends and checks specifications and the registry, from a raw idea through status promotion | an idea · `amend {file} …` · `stabilize [workspace]` | **required** — up to three suggested topics, the highest-coverage gaps by DA-3; free text | `workflows/spec.md` |
| `task` | pipeline | Turns the Stable specifications into the plan and the atomic task list, and re-syncs them | a decomposition directive · a workspace | optional — decompose the active phase, planning first when the plan is stale | `workflows/task.md` |
| `run` | pipeline | Executes the planned tasks of the active phase, in parallel tracks when they are independent | a workspace · a task identifier | optional — the active phase | `workflows/run.md` |
| `analyze` | health | Audits the project against its registry, rules and engine integrity; reverse-engineers specifications from existing code | a mode · a focus directive | optional — the full audit | `workflows/analyze.md` |
| `rule` | health | Adds, amends or removes a project convention in the constitution, global or per workspace | the rule text · `amend {id}` · `remove {id}` | **required** — the rule candidates the latest audit reported, when there are any; free text | `workflows/rule.md` |
| `status` | health | Briefs a session on where the project stands, read-only | a workspace | optional — the resolved workspace | `workflows/status.md` |
| `graph` | health | Builds, analyzes and visualizes the specification knowledge graph | a mode (`visualize`) | optional — the analysis | `workflows/graph.md` |
| `migrate` | maintenance | Moves a project from the earlier layout to this skill folder: a dry run, one consent question, then the apply step | none (`--apply` only after consent) | — | `workflows/migrate.md` |
| `help` | — | Lists the commands, explains one and offers to run one, in the host's choice form or in the chat | a command · a language | optional — the whole list and the picker | `workflows/help.md` |

Pipeline: `spec` → `task` → `run`. `analyze`, `rule`, `status` and `graph` are used beside it; `migrate` is run once, on a project from an earlier layout, and `help` explains the rest. The group is the first step of the picker on a host whose choice form holds four choices.

## Dispatch

1. **Name the command.** Take the first word after `magicspec` and compare it with the command column, ignoring letter case.
   - It equals a command name → that command, and the rest of the input is its argument.
   - Nothing follows `magicspec`, or the word is `help` → the interactive help, `workflows/help.md`.
   - It is any other word → the same help with the typed text kept; its first, recommended choice runs `spec` with the whole text as the idea, unless the word is one edit away from a command name (one letter added, removed or changed), in which case that command is offered first. Nothing runs before the user has chosen.
   - Input in quotation marks is an idea for `spec` even when its first word is a command name; `spec` followed by the text says the same.
2. **Meet the argument contract.** The *When it is missing* column is binding.
   - **Required** and absent → ask for it once, through the argument form of `workflows/help.md`, and do nothing until it is given. A dismissed form runs nothing; say so in one line.
   - **Optional** and absent → run the default the column states, and say in the first line which default ran and how to pass an argument.
   - Never ask for an optional argument, never ask again once the argument is given, never ask in the middle of a workflow. These are the only questions the router asks (escalation entry E7).
3. **Check that the argument can be this command's.** Judge the text after a command name against the *Argument* column. When it cannot be that command's argument — a product idea after a command that takes only a workspace, an identifier or a directive about existing artifacts — route it to `spec` instead and narrate one `[DR]` line with the override.
4. **Read the body.** Read `workflows/<command>.md` in full before doing anything else, and follow it.
5. The shared modules a body names (`references/context.md`, `references/init.md`, `references/retrospective.md`) are read when the body says so.
6. Automation goes through `scripts/executor.js` only. Do not invent scripts for engine operations.

## Always-on rules

The session rules (engine upgrade detection, the spec graph, finalization, archival, replan, containment, decision posture, bug reporting, the cold-context resume check) are in `AGENT-RULES.md` in this folder. A host loads a copy of that file at the start of every session. When the host did not, read the file before the first command.
