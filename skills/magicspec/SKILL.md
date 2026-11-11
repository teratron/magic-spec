---
name: magicspec
description: Runs the Specification-Driven Development pipeline of a project, with `spec` to specify, `plan` to plan and replan, `task` to decompose the plan into tasks, `run` to execute, `fix` to triage and repair a reported defect, and `analyze`, `rule`, `status` and `graph` to keep the project healthy, `migrate` to move a project from the earlier layout, and `help` to list the commands. Use when the user asks to specify, plan, replan, break down or implement work through the SDD workflow, to fix a reported defect, to record a project rule, to audit the project against its specifications, to see where the project stands, to map the specification graph, to migrate a 2.x project, or to see what the engine can do, and when the user types `magicspec` with or without a command.
argument-hint: "<command> [argument]"
---

# Magic Spec

One skill, one command: `/magicspec <command> [argument]`. Every command is a workflow in `workflows/`; this file only routes to it.

**Paths.** Every path in this skill is relative to the folder that holds this file. Scripts run as `node <this folder>/scripts/executor.js <script> [args]`; templates, roles and references are read from `templates/`, `roles/` and `references/` of the same folder. Project files (`.magicspec/…`, `CHANGELOG.md`, source) are relative to the project root, which the executor finds from the working directory.

## Commands

The grammar is `/magicspec <command> [argument]` (`$magicspec <command> [argument]` on a host that invokes skills with a dollar sign). The first word after `magicspec` is the command when it equals a command name, in any letter case; the rest is its argument. The colon spelling `magicspec:<command>` and the dot spelling `magicspec.<command>`, typed as text, are read as that command too — a slip in the form is not a reason to stop — and are never printed: run the command and say in one line that the form is `/magicspec <command>`. No host receives a per-command entry: this file is the only surface.

| Command | Group | What it does | Argument | When it is missing | Demand | Body |
| --- | --- | --- | --- | --- | --- | --- |
| `spec` | pipeline | Creates, amends and checks specifications and the registry, from a raw idea through status promotion | an idea · `amend {file} …` · `stabilize [workspace]` | **required** — up to three suggested topics, the highest-coverage gaps by DA-3; free text | deep | `workflows/spec.md` |
| `plan` | pipeline | Plans and replans: which specifications are built in which phase, in what order, and what waits in the backlog | an order or membership directive · a workspace | optional — revalidate the whole plan | deep | `workflows/plan.md` |
| `task` | pipeline | Turns a planned phase into atomic tasks, tracks and verify lines, and keeps their recorded state in step with the plan | a decomposition directive · a workspace | optional — decompose the active phase; a missing or stale plan ends with `/magicspec plan` as the next step | standard | `workflows/task.md` |
| `run` | pipeline | Executes the planned tasks of the active phase, in parallel tracks when they are independent | a workspace · a task identifier | optional — the active phase | standard | `workflows/run.md` |
| `fix` | quality & automation | Triages and repairs reported defects: reproduces each, classifies it against the specifications by a closed rule, repairs it with a regression check left behind | the defect: a description, a report, a finding | **required** — the open findings (the diagnostics digest, pending feedback notes, simulation findings); free text | deep | `workflows/fix.md` |
| `analyze` (alias `audit`) | health | Audits the project against its registry, rules and engine integrity; reverse-engineers specifications from existing code | a mode · a focus directive | optional — the full audit | deep | `workflows/analyze.md` |
| `rule` | health | Adds, amends or removes a project convention in the constitution, global or per workspace | the rule text · `amend {id}` · `remove {id}` | **required** — the rule candidates the latest audit reported, when there are any; free text | standard | `workflows/rule.md` |
| `status` | health | Briefs a session on where the project stands, read-only | a workspace | optional — the resolved workspace | light | `workflows/status.md` |
| `graph` | health | Builds, analyzes and visualizes the specification knowledge graph | a mode (`visualize`) | optional — the analysis | light | `workflows/graph.md` |
| `migrate` | maintenance | Moves a project from the earlier layout to this skill folder: a dry run, one consent question, then the apply step | none (`--apply` only after consent) | — | light | `workflows/migrate.md` |
| `help` | — | Lists the commands, explains one and offers to run one, in the host's choice form or in the chat | a command · a language | optional — the whole list and the picker | light | `workflows/help.md` |

Pipeline: `spec` → `plan` → `task` → `run`, one stage per invocation: a stage ends by recording what the next needs in the workspace's files and naming the next command with its demand, so the model can be switched between stages. `fix` feeds back into it, answering a reported defect with a repair and a regression check; `analyze`, `rule`, `status` and `graph` are used beside it; `migrate` is run once, on a project from an earlier layout, and `help` explains the rest. The group is the first step of the picker on a host whose choice form holds four choices.

**Demand** is advice for whoever chooses the model, never a condition of running: `deep` for a stage whose output others build on (understanding intent, ordering work, finding a cause), `standard` for a stage that applies a settled plan, `light` for a report or a mechanical pass. An **alias** in the command cell is read as its command wherever a command name is read.

## Dispatch

1. **Name the command.** Take the first word after `magicspec` and compare it with the command column, ignoring letter case.
   - It equals a command name, or an alias in its row (`audit` is `analyze`) → that command, and the rest of the input is its argument. An alias runs the command with no narration, and every text the engine prints names the command by its own name.
   - Nothing follows `magicspec`, or the word is `help` → the interactive help, `workflows/help.md`.
   - It is any other word → the same help with the typed text kept; its first, recommended choice runs `spec` with the whole text as the idea, unless the word is one edit away from a command name or an alias (one letter added, removed or changed), in which case that command is offered first. Nothing runs before the user has chosen.
   - Input in quotation marks is an idea for `spec` even when its first word is a command name; `spec` followed by the text says the same.
2. **Meet the argument contract.** The *When it is missing* column is binding.
   - **Required** and absent → ask for it once, through the argument form of `workflows/help.md`, and do nothing until it is given. A dismissed form runs nothing; say so in one line.
   - **Optional** and absent → run the default the column states, and say in the first line which default ran and how to pass an argument.
   - Never ask for an optional argument, never ask again once the argument is given, never ask in the middle of a workflow. These are the only questions the router asks (escalation entry E7).
3. **Check that the argument can be this command's.** Judge the text after a command name against the *Argument* column. When it cannot be that command's argument — a product idea after a command that takes only a workspace, an identifier or a directive about existing artifacts — route it to `spec` instead and narrate one `[DR]` line with the override.
   - **The reverse (a defect report is not an idea).** Input given to `spec` that is a defect report — an error message or stack trace, a pasted bug report, or a statement that existing behaviour is wrong ("X does not work", "Y fails when Z") with nothing new to build — runs `fix` instead, and the line is `[DR] Routed to fix — a defect report, not an idea. (Override: /magicspec spec "{text}")`. Input that both reports a defect and asks for new behaviour goes to `fix` for the defect; the new behaviour is a specification gap it records or the next step it names. A feature request or a plain idea is never a defect report, and a text that was routed once and arrives at `spec` again — the override — stays an idea and is not routed twice.
4. **Read the body.** Read `workflows/<command>.md` in full before doing anything else, and follow it.
5. The shared modules a body names (`references/context.md`, `references/init.md`, `references/retrospective.md`) are read when the body says so.
6. Automation goes through `scripts/executor.js` only. Do not invent scripts for engine operations.

## Always-on rules

The session rules (engine upgrade detection, the spec graph, finalization, archival, replan, containment, decision posture, bug reporting, the cold-context resume check) are in `AGENT-RULES.md` in this folder. A host loads a copy of that file at the start of every session. When the host did not, read the file before the first command.
