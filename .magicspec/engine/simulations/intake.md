# Intake

Each expectation ends with a tag: `(printed)` for an outcome observed directly — a line an engine script prints, or a file's presence, absence or unchanged content — and `(composed)` for text the agent writes from a workflow body.

## S-4: A required argument is asked once, and a dismissed form runs nothing

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-command-surface.md §3 CS-9, l1-command-surface.md §3 CS-10, l1-command-surface.md §3 CS-11
**Preconditions:** a disposable project: a scratch directory outside this repository, holding its own copy of the engine folder, initialised there, with one workspace, an empty registry and two product source files that no specification covers.

**Steps:**

1. `/magicspec spec` with no idea → expect: one argument form asks for the idea, offers up to three suggested topics with the one covering the most first and marked as recommended, and accepts free text (composed); it is the only question asked (composed).
2. Dismiss the form → expect: one line says that nothing ran (composed); no file of the project differs from before the command (printed).
3. `/magicspec status` → expect: the briefing shows the project as it stood before the first step, with no step recorded for the dismissed command and the same single recommended command it would have named then (composed).
4. `/magicspec spec` again and enter the idea into the form's free text → expect: the form is asked once and not again after the idea is given, and the specification is written as if the idea had been typed with the command (composed).

**Variants:** in the project of step 4, once a specification exists, `/magicspec plan` with no argument (its argument is optional) runs its default, says in its first line which default ran and how to pass an argument, and asks nothing (composed).

**Last run:** never

## S-5: A command typed one letter wrong is offered first, and choosing it is the same as typing it right

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-command-surface.md §3 CS-3, l1-command-surface.md §3 CS-10
**Preconditions:** a disposable project as in S-4 with one specification written and registered and no plan.

**Steps:**

1. `/magicspec plna` → expect: the help opens with the typed text kept, its first and recommended choice is `plan`, and nothing runs before a choice is made (composed); no file of the project differs from before the command (printed).
2. Choose `plan` → expect: no second confirmation follows the choice, and the plan stage runs and ends as `/magicspec plan` typed correctly would end (composed); the plan file exists and holds the specification (printed).

**Variants:** a first word unlike any command (`/magicspec booking page for holidays`) opens the same help with the typed text kept, its first and recommended choice runs `spec` with the whole text as the idea, and nothing runs before the choice (composed); text that begins with a command name by accident (`/magicspec plan a holiday booking feature`) is read as that command, and because the rest cannot be its argument it is routed to `spec` with one line giving the override (composed).

**Last run:** never

## S-6: An error message given to the specification command is repaired, not specified

**Actor:** a developer working in a project where the engine is installed
**Verifies:** l1-fix-command.md §3 FX-11
**Preconditions:** a disposable project as in S-4 with a small product, a command-line tool that prints the sum of its arguments, which stops with the message `Error: not a number` when an argument is negative.

**Steps:**

1. `/magicspec spec "The tool crashes with 'Error: not a number' when I pass a negative argument"` → expect: one line says the text was routed to `fix` as a defect report, and gives the override that keeps it an idea (composed); no specification is written for it, no workspace is created and no question is asked about the idea (printed).
2. `/magicspec spec "The tool crashes with 'Error: not a number' when I pass a negative argument"` typed again through the override → expect: the text stays an idea and is not routed a second time (composed).

**Variants:** a text that reports a defect and also asks for new behaviour ("it crashes on a negative argument; also add a flag that prints the product") goes to `fix` for the defect, and the new behaviour is recorded as a specification gap or named as the next step (composed).

**Last run:** never
