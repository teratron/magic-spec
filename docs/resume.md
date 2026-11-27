# Resume — Continuing Interrupted Work

This document explains the Resume workflow: the command that picks up what a session left unfinished after a crash, an exhausted token budget or an interruption.

## 1. Overview

A session can stop in the middle of a command: the host crashes, the tokens run out, you close the window. Magic Spec records enough along the way that a new session can continue instead of starting over.

**Triggers:** *"Resume"*, *"Continue where you stopped"*, *"Recover the session"*, *"Pick up after the crash"*, *"The tokens ran out, go on"*.

**Slash command:** `/magicspec resume [workspace]`

> **Full implementation:** `skills/magicspec/workflows/resume.md` — the engine reads this file before executing any steps.

## 2. What Is Recorded

Three kinds of unfinished work, and `resume` takes them in this order:

| Record | Written when | Resumed by |
| --- | --- | --- |
| **Interrupted command** | While a command that writes runs: its name and argument, the steps it completed, the files they wrote, and the answers you gave to its questions | Re-entering that command from the step after its last checkpoint |
| **Task in flight** | A task is started | Running that task |
| **Recorded goal** | `/magicspec goal` records it | Continuing the goal |

The record of a running command is a small file under `.magicspec/.cache/`, never committed. The command's own finalization removes it, so a record that is still there means the command did not finish. It holds paths and short text only — no file content and no conversation. With finalization switched off (`MAGIC_FINALIZE=0` or `finalization.enabled: false`) no record is written.

## 3. What Resuming Does

- The steps already done are not redone; if a file a step wrote is missing or has changed since, the work restarts from that step.
- Answers you already gave are used as given: you are not asked the same question again.
- A confirmation for a destructive action or a release is never carried over: it is asked again.
- A record that points at something that no longer exists is reported, removed, and nothing runs.
- With nothing to resume, it says so, names the recorded next step and runs nothing: `resume` continues work, it does not start the next stage.

## 4. You Do Not Have to Remember It

A new or cleared session checks for unfinished work before anything else and prints one line when there is some:

```plaintext
▶ Resume [main]: /magicspec spec a booking feature interrupted at intake (5 min ago) — /magicspec resume
```

Typing `/magicspec resume` is the way to act on that line.

## 5. Relationship to Other Workflows

| Workflow | Relationship |
| --- | --- |
| **Status** (`status.md`) | Reports where the project stands and the next command; changes nothing. `resume` acts on interrupted work |
| **Run** (`run.md`) | A task left in flight is resumed by running it |
| **Goal** (`goal.md`) | A recorded goal is resumed by continuing it |

## Sync Note

Synchronized with engine workflows on 2026-11-27 (v4.0.2).
