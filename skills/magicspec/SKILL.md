---
name: magicspec
description: Runs the Specification-Driven Development pipeline of a project, with `spec` to specify, `task` to plan, `run` to execute, and `analyze`, `rule`, `status` and `graph` to keep the project healthy. Use when the user asks to specify, plan or implement work through the SDD workflow, to record a project rule, to audit the project against its specifications, to see where the project stands, or to map the specification graph, and when the user types `magicspec` followed by a command.
---

# Magic Spec

One skill, seven commands. Every command is a workflow in `workflows/`; this file only routes to it.

**Paths.** Every path in this skill is relative to the folder that holds this file. Scripts run as `node <this folder>/scripts/executor.js <script> [args]`; templates, roles and references are read from `templates/`, `roles/` and `references/` of the same folder. Project files (`.magicspec/…`, `CHANGELOG.md`, source) are relative to the project root, which the executor finds from the working directory.

## Commands

The grammar is `magicspec <command> [args]`. The same command may arrive as `magicspec:<command>`, `/magicspec:<command>` or `$magicspec <command>`, as the host registers it; all mean the same thing. A bare `magicspec` with an idea in plain words is `spec`.

| Command | What it does | Body |
| --- | --- | --- |
| `spec` | Creates, amends and checks specifications and the registry, from a raw idea through status promotion | `workflows/spec.md` |
| `task` | Turns the Stable specifications into the plan and the atomic task list, and re-syncs them | `workflows/task.md` |
| `run` | Executes the planned tasks of the active phase, in parallel tracks when they are independent | `workflows/run.md` |
| `analyze` | Audits the project against its registry, rules and engine integrity; reverse-engineers specifications from existing code | `workflows/analyze.md` |
| `rule` | Adds, amends or removes a project convention in the constitution, global or per workspace | `workflows/rule.md` |
| `status` | Briefs a session on where the project stands, read-only | `workflows/status.md` |
| `graph` | Builds, analyzes and visualizes the specification knowledge graph | `workflows/graph.md` |

Pipeline: `spec` → `task` → `run`. `analyze`, `rule`, `status` and `graph` are used beside it.

## Dispatch

1. Take the command from the first word after `magicspec`; the rest is its argument.
2. Read `workflows/<command>.md` in full before doing anything else, and follow it.
3. The shared modules a body names (`references/context.md`, `references/init.md`, `references/retrospective.md`) are read when the body says so.
4. Automation goes through `scripts/executor.js` only. Do not invent scripts for engine operations.

## Always-on rules

The session rules (engine upgrade detection, the spec graph, finalization, archival, replan, containment, decision posture, bug reporting, the cold-context resume check) are in `AGENT-RULES.md` in this folder. A host loads a copy of that file at the start of every session. When the host did not, read the file before the first command.

