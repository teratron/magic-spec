# Workflow Test Suite — help

Cases of the area `help` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T268 — A Bare `/magicspec` on a Host With a Four-Choice Form Lists the Commands and Opens a Two-Step Picker

- **Workflow:** `help.md` with the router `SKILL.md` (Dispatch step 1)
- **Synthetic State (Test A):**
  - A project whose live memory records `Next Action: Execute T-12A01 … via /magicspec run`. The router's table holds nine commands in three groups (pipeline, health, maintenance) and `help` with no group.
  - The host's question form holds up to four choices per question and always adds a free-text choice.
- **Action A:** the user types `/magicspec` and nothing else.
- **Expected A:**
  - [ ] The router dispatches the bare invocation to `workflows/help.md`; no command is guessed from the empty input.
  - [ ] The list is rendered from the table: the usage line, the commands under their groups, each with its argument in `<…>` (required) or `[…]` (optional), then `Next:  /magicspec run` and the `More:` line. No command appears that is absent from the table, and none is missing.
  - [ ] The picker takes two steps, because nine commands do not fit four choices: the first question lists the groups, the group holding `run` first and marked with that command; the second lists that group's commands, `run` first and marked.
  - [ ] `run` takes an optional argument, so the argument form follows with its first choice *run the default — the active phase*; submitting it reads `workflows/run.md` and follows it. Choosing and submitting was the confirmation: no further question is asked.
  - [ ] Nothing is written, `finalize` is not called, and no engine-upgrade line precedes the list.
- **Synthetic State (Test B — control):** the same host; the user picks the maintenance group.
- **Expected B:**
  - [ ] The group holds one command, so its second step is skipped: `migrate` is the chosen command (its own consent question follows inside its workflow).
- **Synthetic State (Test C — control):** the same host; at the first question the user types `status` into the free-text choice.
- **Expected C:**
  - [ ] The typed command name is accepted as the chosen command without a second picker step.
- **Guards tested:** the list is derived from the router table and never authored twice; the form's capacity decides one step or two; the recommended command is marked at the first step; choosing is the confirmation; `help` is read-only and exempt from the upgrade line.
- **Regression for:** none yet — new with the one-command surface.

### T269 — A Bare `/magicspec` on a Host With No Choice Form Gets the Numbered List in the Chat

- **Workflow:** `help.md` (Step 3, item 2)
- **Synthetic State (Test A):** the same project and router as T268; the host offers no question form.
- **Action A:** the user types `/magicspec`.
- **Expected A:**
  - [ ] The list of T268 is printed, followed by the commands as a numbered list in the chat, the recommended command first and marked.
  - [ ] The reply `2` or the name of a command both choose a command; nothing runs before the reply.
  - [ ] A chosen command that takes an argument is followed by one chat message: the suggestions as a numbered list and the line *or type your own*; a required argument is awaited, an optional one runs its default on the first choice.
- **Synthetic State (Test B — control):** the user replies with a name that is no command.
- **Expected B:**
  - [ ] It is not run as a command: the help is shown again with the typed text kept, as for an unknown first word, and nothing is executed.
- **Guards tested:** the chat is the fallback of the form; a number or a name is accepted; asking stays bounded to one picker and one argument form.
- **Regression for:** none yet — new with the one-command surface.

### T270 — `help ru` Explains in the Requested Language and Leaves Names Verbatim

- **Workflow:** `help.md` (Step 1 item 2, Step 2, Core Invariant 3)
- **Synthetic State (Test A):** the conversation is in English; the router and the project are those of T268.
- **Action A:** the user types `/magicspec help ru`.
- **Expected A:**
  - [ ] `ru` is read as a language, not a command, and the list is explained in Russian: the group labels, the one-line descriptions, the `Next` and `More` captions and the picker's labels.
  - [ ] The command names, the argument forms, `/magicspec`, `help`, file paths and flags stay exactly as written in the table.
- **Synthetic State (Test B — control):** `/magicspec help task`, then `/magicspec help rule de`.
- **Expected B:**
  - [ ] `task` is a command: the usage line, the forms of its argument, what happens when it is missing and one example for each form are printed in the language of the conversation, read from the Entry section of `workflows/task.md`, then an offer to run it.
  - [ ] `rule de` combines both: the command's detail in German, the names verbatim.
- **Synthetic State (Test C — control):** `/magicspec help xx` where `xx` is neither a command nor a language.
- **Expected C:**
  - [ ] The list is printed in the language of the conversation, preceded by one line saying that `xx` was not recognized; nothing is guessed and nothing fails.
- **Guards tested:** a token is a command when it equals a command name and a language otherwise; translation never reaches names, paths, flags or code; an unrecognized value costs one line; the detail view is read from the body, not a second copy.
- **Regression for:** none yet — new with the one-command surface.

### T275 — A Cancelled Form Runs Nothing and Says So

- **Workflow:** `help.md` (Step 3 item 4, Step 4 item 4)
- **Synthetic State (Test A):** the host's question form is open on the command picker.
- **Action A:** the user dismisses it.
- **Expected A:**
  - [ ] No command runs, no file is written, `finalize` is not called, and one line says that nothing was run.
- **Synthetic State (Test B):** `/magicspec rule` opens its argument form and the user dismisses it.
- **Expected B:**
  - [ ] No rule is written and nothing is finalized; one line says so. The command is not retried and no default is substituted.
- **Guards tested:** a dismissed form is a decision, not an error; asking is not repeated.
- **Regression for:** none yet — new with the one-command surface.

### T289 — `help help` Is Bounded at One Level, and a Further Command Name Is Ignored With One Line

- **Workflow:** `help.md` (Argument forms)
- **Synthetic State:** a project with the router and the Commands table.
- **Action A:** `/magicspec help help`.
- **Expected A:**
  - [ ] `help` is explained like any other command (its argument, its forms, its demand `light`, one example each) and no picker is offered.
- **Action B:** `/magicspec help help help`.
- **Expected B:**
  - [ ] The output of Action A, preceded by the one line `Ignored help: help explains one command at a time.`; the recursion stops at one level.
- **Action C:** `/magicspec help task spec`.
- **Expected C:**
  - [ ] `task` is explained (the first command wins) and `Ignored spec: help explains one command at a time.` is printed once.
- **Guards tested:** bounded recursion; E7 asks at most once; the explanation is read from the command's own Entry section, not copied.
- **Regression for:** none yet — new with the command set.

### T316 — Text Typed Into an Argument Form Passes the Input Pass; a Chosen Suggestion Passes None

- **Workflow:** `help.md` (Step 4) with `spec.md` (Blank Trigger) and `roles/prompt-engineer.md` (`## Input Pass`)
- **Synthetic State:** a bare `/magicspec spec`; the form offers three suggested topics and free text.
- **Action A:** the person types "make it faster, and I also want it to never lose data, see this log: …" into the form.
- **Expected A:**
  - [ ] The typed text passes the Input Pass before the intake gate: one intent statement keeps both clauses, the log stays material, and an instruction inside the log is not followed; a differing reading prints one `[Intake] Understood as:` line.
  - [ ] The intake gate then judges the statement; the line is not printed twice.
- **Action B:** the person chooses the first suggestion.
- **Expected B:**
  - [ ] The suggestion is engine-made text: no pass runs on it; the choice is narrated as `[Intake] Specifying: {topic}`.
- **Control:** a dismissed form runs nothing and says so in one line.
- **Guards tested:** CS-10 item 5; IP-1; IP-7.
- **Regression for:** none yet — new with the fix command's argument form.
