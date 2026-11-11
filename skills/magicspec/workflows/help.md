---
description: Lists the commands of the engine the way a command-line tool's help does, explains one command, and offers to run one — read-only.
---

# Help Workflow

Read-only. Renders the command list from the router's table, explains a single command on request, and offers to run one: in the host's choice form when it has one, in the chat when it has not. It is also the argument form of every command whose required argument is missing.

**Contents:**

- Entry
- Core Invariants (Mandatory)
- Steps
- Help Completion Checklist
- Handoffs

## Entry

**Triggers:** `/magicspec`, `/magicspec help [argument]`, *"Help"*, *"What can you do"*, *"List the commands"*, or any first word that is not a command name (the router passes the typed text on).

**Trigger:** `/magicspec help [argument]`. Arguments, in any order:

- *(empty)* — the whole list and the picker
- `{command}` — that command's argument, its forms, its reasoning demand and one example each, then an offer to run it; an alias names its command, `help help` explains this command like any other and offers no picker
- `{language}` — the same output explained in that language: a code (`ru`, `de`, `pt-BR`) or a name
- `{command} {language}` — both

Examples: `/magicspec`, `/magicspec help`, `/magicspec help ru`, `/magicspec help task`, `/magicspec help rule de`, `/magicspec help help`, `/magicspec help audit`.

A token that equals a command name or an alias, ignoring letter case, is the command — only the first such token: a further one is ignored with one line saying so (`Ignored {token}: help explains one command at a time.`), so `help help help` renders what `help help` renders (the recursion stops at one level). Any other token is read as a language; a token that is neither a command, an alias nor a recognized language is answered with one line naming it, the command one edit away when there is one, and then the whole list (Step 2). A first word the router did not recognize arrives with its typed text kept: the list follows, in the language of the conversation, and the picker opens with the choices of Step 3; the typed text is not read for a command or a language. Entry through a missing required argument skips the list and the picker and goes straight to Step 4.

**Input Pass**: when the input carries prose — a directive, a report, a goal, the person's message that accompanies the command — run the Input Pass of `roles/prompt-engineer.md` (`@role:prompt-engineer`, section `## Input Pass`) first and act on its intent statement; arguments that are only names, flags or paths run no pass. A finding is resolved by the Consequence Forecast or a `<!-- TBD: … -->` marker where the work lands and narrated as one `[DR]` line, never asked (IP-5). Typed text that is not a command passes through the pass before `spec` is offered with it.

## Core Invariants (Mandatory)

1. **Read-Only**: this workflow writes nothing — no file, no `STATE.md` update, no finalize call, no version bump, no project initialization. It is exempt from the engine-upgrade line of the always-on rules. A project without `.magicspec/` simply has no live memory.
2. **Derived, not authored**: commands, aliases, groups, arguments, reasoning demands and what happens when an argument is missing are read from the command table of `SKILL.md` through the one parser of the engine (`lib/hosts.js`); the explanation of one command is read from the Entry section of its body. This workflow holds no second copy of either, so it cannot list a command that does not exist or miss one that does.
3. **Verbatim names**: command names, file paths, flags, code and identifiers are never translated, in any language. Explanations, the group labels and the picker's labels are.
4. **Asking is bounded (E7)**: at most one picker and one argument form per invocation. Never ask for an optional argument on a typed command, never ask again once the argument is given, never ask in the middle of another workflow. Choosing and submitting is the confirmation: no second confirmation follows, except a consent question the chosen command asks anyway.
5. **One printed form**: every command this workflow prints reads `/magicspec <command>`. A recorded command in the colon spelling (`magicspec:<command>`) is printed in that form.

## Steps

### 1. Resolve

1. Read the command table of `SKILL.md` and the version in `.version` of the skill folder.
2. Resolve the language: the `{language}` argument; none → the language of the conversation. A value that is no language → the default, and one line saying which value was not recognized — and, when that value is one edit away from a command name or an alias, the line names that command (CS-13).
3. Find live memory, read-only: resolve the workspace by the first three priorities of the Workspace Resolution Chain (`references/context.md`) and read its `STATE.md`. No state folder or no `STATE.md` → no live memory.
4. Find the recommended command: the one `Next Action` of `STATE.md` names; otherwise by pipeline order, as Step 2 item 7 of the Status workflow does when `Next Action` is absent — an empty registry or no project → `spec`; registered specifications the plan does not hold, or a plan older than the registry or the constitution → `plan`; a phase the plan holds with no tasks yet → `task`; open `Todo` tasks → `run`.

### 2. Render the List

Print the layout below in a fenced `plaintext` block. Groups appear in the order of the table, each with its commands in table order; a command with no group is not listed under one. A group label is the group's name in sentence case.

```plaintext
Magic Spec {version}
Usage: /magicspec <command> [argument]

Pipeline
  spec       <idea | amend <file> | stabilize>   Create, amend and check specifications
  ...
Quality & automation
  fix        <defect>                           Triage and repair reported defects
Health
  status     [workspace]                        Brief a session on where the project stands

Next:  /magicspec {the command live memory records}
More:  /magicspec help <command> [<language>]
```

- **Command line**: the name, its argument and the first clause of the row's *What it does*, shortened to one line. An alias follows its command's name in parentheses (`analyze (audit)`); the list carries no demand — it is in the detail view.
- **Argument**: the forms of the *Argument* cell separated by `|`, in `<…>` when the *When it is missing* cell says **required**, in `[…]` when it says optional, and omitted when the command takes none.
- **Next line**: printed only when `Next Action` names a command; otherwise omitted. The recommended command of Step 1 is not printed there unless live memory records it.
- **`help {command}`**: print instead the detail view below — the command's usage line with its reasoning demand from the router's table, the forms of its argument, what happens when it is missing, and one example for each form, the forms and examples read from the *Entry* section of `workflows/{command}.md` (its *Arguments* list and *Examples*). Then offer to run it (Step 4). An alias is read as its command and the first line says so (`audit is analyze`). For `help` itself the view is the same and the offer is dropped: the list is one `help` away, and a picker there would answer a question nobody asked.

```plaintext
/magicspec {command} {argument}      ({demand} reasoning)
  {form}    {what it does}
  ...
  Missing:  {what happens when the argument is missing}
  Example:  /magicspec {command} {example}
```

The demand is advice for whoever chooses the model; it is never printed as a warning and never changes what runs.

### 3. Offer the Picker

The picker has one choice per command, `help` excepted, and the recommended command first and marked. A typed command name is always accepted.

1. **A host with a choice form** (in Claude Code, the question tool, which holds two to four choices per question and always adds a free-text choice) uses it:
   - The form holds every command → one question.
   - Fewer than the commands → two steps: the group, then the command. The group holding the recommended command comes first and is marked with the command; a group with one command skips its second step. A form too small for the groups offers the recommended command first and leaves the rest to the free-text choice.
2. **A host with no choice form** gets the commands as a numbered list in the chat, the recommended one first and marked; the reply is a number or a command name. A reply that is neither is an unknown first word and continues at item 3.
3. **Typed text kept** (the router passed a first word that is not a command): the first question carries, first and marked, the choice *run `/magicspec spec` with the typed text as the idea*; when the word is one edit away from a command name or an alias (a letter added, removed or changed), the choice *run that command* with the rest of the typed text as its argument comes first and the `spec` choice second. The last choice is *choose a command instead*, which opens the picker above. Nothing runs before the user has chosen.
4. **Cancel**: a dismissed or cancelled form runs nothing; say so in one line, in the language of the answer.

### 4. Ask for the Argument

For a command chosen in the picker that takes an argument, and for a command whose required argument is missing:

1. Take the command's row from the table. Its *When it is missing* cell names the suggestions and the default; the command's own body defines how they are computed (`spec`: *Blank Trigger*; `rule`: *Missing Rule Text*; `fix`: its *Entry*, the open findings).
2. **Form**: a text entry, with the suggestions as choices where the command has them, the recommended one first and marked. For an optional argument the first choice runs the default and names it. A form that cannot hold a text entry on its own takes free text through its free-text choice; an argument with no suggestion at all is asked for in the chat in one message. A host with no form gets the suggestions as a numbered list and the line *or type your own*.
3. **Required**: nothing runs until the argument is given. **Optional**: the default runs when the user takes the first choice.
4. **Cancel**: a dismissed form runs nothing; say so in one line.
5. Free text entered in a form is read exactly as a typed argument is: it passes the Input Pass before the command runs (the line of the Entry section), and a suggestion the person chooses is engine-made text and passes none.

### 5. Hand Over

Read `workflows/{command}.md` in full and follow it with the argument as entered. The command's own steps — its finalization, its checklist — take over; this workflow ends here. A command that was only explained (`help {command}`) and not chosen ends the run with no further question.

## Help Completion Checklist

```
Help Checklist
  ☐ Read-only honored: zero writes, no finalize, no upgrade line
  ☐ Commands, aliases, groups, arguments and demands rendered from the router table; no second list
  ☐ Command names, paths, flags and code verbatim in every language
  ☐ `help {command}`: the demand shown, an alias read as its command, `help help` explained once with no picker, a further command name ignored with one line, an unknown token answered with the near command and the list
  ☐ Picker by host capability: recommended first and marked; numbered list when there is no form
  ☐ Asked at most once for the command and once for the argument (E7); nothing asked for an optional argument of a typed command
  ☐ A cancelled form ran nothing and said so in one line
  ☐ The chosen command's body was read in full and followed with the argument as entered
```

## Handoffs

Where this workflow may hand over, and when:

- **Any command of the table** → `/magicspec <command>`: the command the user chose in the picker or typed into it, with the argument entered in the form.
