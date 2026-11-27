---
phase: 88
name: "Crash Recovery Inside an Invocation, the resume Command and Reserved Forms in the Argument Form"
status: Todo
subsystem: "skills/magicspec (scripts: checkpoint, finalize, resume-state; workflows: the ten mutating bodies, resume, help; references/context; SKILL.md; CONSTITUTION.md; templates/rules.md), .magicspec/RULES.md, docs, tests/engine, tests/suite, .magicspec/engine/simulations"
requires:
  - "Phases 32 and 70: the task checkpoints and resume-state on both formats (Done)"
  - "Phase 47: the argument form of help.md Step 4 (Done)"
  - "The specifications: l1-session-continuity 2.8.0, l2-session-checkpoint 1.2.0, l1-command-surface 2.6.0, Stable at registry 1.111.0, constitution 2.1.0, plan 1.105.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 88 Tasks — Crash Recovery Inside an Invocation, the resume Command and Reserved Forms in the Argument Form

**Phase:** 88
**Status:** Todo
**Strategic Goal:** A crash of the host or a session that runs out of tokens in the middle of a command loses neither the answers the person gave nor the position, `/magicspec resume` continues the interrupted work, and a command chosen from the host's menu offers its reserved argument forms.

**Shared names (fixed here so no two tasks choose different spellings):**

- The record: `.magicspec/.cache/invocation/{workspace}.json`, fields `workspace`, `command`, `argument`, `parent`, `session`, `started`, `updated`, `steps` (`step`, `files`, `at`), `answers` (`question`, `answer`), `decisions` (l2-session-checkpoint §5.9).
- The writer: `node scripts/executor.js checkpoint --workspace={ws} --start --command={command} [--argument="{text}"]`, `--step="{step}" [--files=a,b] [--answer="{question} => {answer}"] [--decision="{line}"]`, `--clear`.
- The line a body carries: `Checkpoint: {step}`, with the step names of §5.10 (`intake`, `dispatch`, `written`, `review`, `stabilized`, `audited`, `selected`, `reproduced`, `classified`, `repaired`, `regression`, `admitted`, `dispatched`).
- The resume line: `▶ Resume [{workspace}]: /magicspec {command} {argument} interrupted at {step} ({age} ago) — /magicspec resume`; every other variant ends with `— /magicspec resume`.
- The narration of a resume: `[Resume] /magicspec {command} {argument} — from {step} (interrupted {age} ago)`.
- The router row: `resume`, group `quality & automation`, argument *a workspace*, missing *optional — the resolved workspace, then every registered one*, demand `per step`, body `workflows/resume.md`.

**Phase notes:**

- **The version stays 4.0.0** (the Backlog's 4.0.0 release item): every C14 run bumps the patch, so `T-88T02` returns the version file to 4.0.0 after the last engine edit, runs `node scripts/sync-engine-snapshot.js` and `node scripts/generate-checksums.js`; the changes go under the `[4.0.0]` section of `CHANGELOG.md`.
- **`finalize.js` is edited again by Phase 89**, and the finalization step of the pipeline bodies too; this phase finishes first.
- **Parallel tracks**: `K` first; `R` after `K01`; `B` after `K` and `R`; `F` alone; `C` after `B02`; `D` after `B` and `F`; `S` after the others; `T` last.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-88K01] `checkpoint`: the bounded, atomic invocation-record writer
- [x] [T-88K02] `finalize` removes the record once the checkpoint is earned
- [x] [T-88R01] `resume-state` reports an interrupted invocation first, and every line names `resume`
- [x] [T-88B01] The start and the named checkpoints in the ten mutating bodies
- [x] [T-88B02] The `resume` body and its router row
- [x] [T-88F01] Reserved forms in the argument form
- [x] [T-88C01] The constitution names `resume`: C2, the template and the always-on rule
- [x] [T-88D01] Documentation of `resume`, the record and the reserved forms
- [x] [T-88T01] The cognitive cases C6 to C8 and the three scenarios
- [x] [T-88S01] The specifications as built
- [ ] [T-88T02] Validation: static checks, full harness, C14, the version back to 4.0.0

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-88K01] `checkpoint`: the bounded, atomic invocation-record writer

- **Spec:** l2-session-checkpoint.md §5.9; l1-session-continuity.md SC-10 (a), (b), (d), (e)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** new harness module `tests/engine/checkpoint.js` with H11 (start, two steps with files, answers and decisions in order, files deduplicated, a second start replaces, 51 steps fold the oldest into `earlier` with its files kept) and H14 (a directory at the record path gives one stderr warning and exit 0; a crash simulated between the temporary write and the rename leaves the previous record readable), plus the opt-out case (`MAGIC_FINALIZE=0` and `finalization.enabled: false` write nothing, exit 0) and the nesting case (a `--start` while a `goal` or `fix` record is open writes into it with the inner command prefixed and `parent` kept); `node --test tests/engine.js` filtered to the module passes; the new file starts with `// @ts-check` and passes `pnpm run typecheck`.
- **Handoff:** T-88K02 and T-88R01 read the record this task writes.
- **Notes:** L1 script (named from the shipped bodies), so it requires nothing outside `skills/magicspec/`. `session` is `CLAUDE_CODE_SESSION_ID` when set, otherwise `null`; never a key. Bounds: argument and answer 2,000 characters, decision one line, 200 files, 50 steps. The executor runs a subcommand by its file name (`executor.js` line 356), so no `executor.js` change is needed.
- **Changes:** New scripts/checkpoint.js and lib/invocation.js (bounded, atomic, locked record; nesting by an explicit --nested start, prefixing inner step names; opt-out writes nothing), a commands-table entry, checkpoint added to the executor's move-safe set; tests/engine/checkpoint.js (H11, H14, nesting, opt-out, refusals) 6/6; biome and typecheck clean.

### [T-88K02] `finalize` removes the record once the checkpoint is earned

- **Spec:** l2-session-checkpoint.md §5.9 (`--clear` bullet), §6 H12; l1-session-continuity.md SC-10 (c)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** H12 in `tests/engine/checkpoint.js`: `finalize` after a successful state update removes the record; under `--dry-run`, and with the state update forced to fail (a directory at the `STATE.md` path), it stays; the existing H9 case (`checkpoint saved`) passes unchanged.
- **Handoff:** T-88B01 relies on it for every body that finalizes.
- **Notes:** Removal sits on the same branch that prints `checkpoint saved`, so the claim and the removal cannot disagree.
- **Changes:** finalize.js removes the record after a successful state update when its owner is the finalized workflow (a goal's record stays); H12 added; H9 unchanged and passing.

### [T-88R01] `resume-state` reports an interrupted invocation first, and every line names `resume`

- **Spec:** l2-session-checkpoint.md §5.11 (last paragraph), §6 H13; l1-session-continuity.md SC-9 (h), SC-11 (f)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** H13 in `tests/engine/resume-and-checkpoint.js`: a record and nothing in flight → the interrupted-invocation line with the age, `interrupted at start` for a record without steps, the argument cut at 60 characters; a record and a task in flight → both, the invocation first; on a 4.0 fixture the same with the `Now` line; `--json` carries the `invocation` object for a workspace with a record only; every existing variant now ends with `— /magicspec resume` and the cases that pin the old wording (in `resume-and-checkpoint.js`, `document-set.js`, `state-goal.js`) are updated, none removed; the script still writes nothing and exits 0.
- **Handoff:** T-88B02 reads `--json`; T-88C01 quotes the line in the always-on rule.
- **Notes:** Grep `tests/engine/` for the old line endings (`Next: {next action}`) before editing, so no pinned sentence is missed.
- **Changes:** resume-state reports an interrupted invocation first (command a resume re-enters, last step or start, age, argument cut at 60), closes every line with the resume command, and adds invocation to --json; the 3.x and 4.0 pinned lines updated, H13 two cases; 17/17 resume cases pass; typecheck clean.

### [T-88B01] The start and the named checkpoints in the ten mutating bodies

- **Spec:** l2-session-checkpoint.md §5.10, §5.9 (HALT bullet); l1-session-continuity.md SC-10 (a), (b), (c)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** H15 (shipped text) in `tests/engine/shipped-text-core.js`: `references/context.md` starts the record in the context load of a mutating body; each of `spec`, `plan`, `task`, `fix`, `simulate`, `rule`, `analyze`, `goal` carries exactly the `Checkpoint:` lines of §5.10, in their 3.x steps and in their *On a 4.0 Workspace* sections where the steps match; `run` and `migrate` carry the start only; every body that can end on a HALT, a refusal or a cancelled form without finalizing names `checkpoint --clear`; the full harness passes (bodies are pinned elsewhere).
- **Handoff:** T-88B02 (the `resume` body re-enters these steps); T-88S01 records the lines as built.
- **Notes:** One C14 run after the ten bodies, not one per body. The record of a body run inside `goal` or `fix` is written into the outer record (T-88K01's nesting), so neither of them starts a second one.
- **Attempts:**
  - marked done on the affected harness modules only → the full harness (exit 1) found `checkpoint.js` unclassified among the MAGIC_DESIGN_DIR readers and the invocation cache missing from the inventory; both added, with l2-engine-automation 1.34.2
- **Changes:** context.md §Post-Resolution step 5 (start after the resume check, --nested, checkpoint lines, clearing, never blocks; the resume check text names the three unfinished-work records); Checkpoint lines in the eight bodies that have steps, their 4.0 sections included; run.md and migrate.md carry the start only, and the move from the earlier layout records nothing (it would create the new state folder beside the old one); goal's own marker is not double-prefixed. H15 added and passing.

### [T-88B02] The `resume` body and its router row

- **Spec:** l2-session-checkpoint.md §5.11; l1-session-continuity.md SC-11; l1-command-surface.md CS-1, §5.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/resume.md` exists with Entry, the five steps of §5.11, an *On a 4.0 Workspace* section, a finalization note (the continued command's) and a completion checklist; `SKILL.md` has the row of the shared names; `node -e "console.log(require('./skills/magicspec/scripts/lib/hosts.js').readCommands().map(c=>c.name+':'+c.demand).join(' '))"` lists `resume:per step`; `/magicspec help` renders `resume` in `quality & automation`, which then holds four commands; H15 pins the row and the body; the harness cases over the router table (skill wrappers, frontmatter limits, the command list in `help`) pass.
- **Handoff:** T-88C01 names the command in C2; T-88D01 documents it.
- **Notes:** `resume` writes nothing itself and has no finalization of its own. A stale record (SC-11 (d)) is reported in one line and cleared with `checkpoint --clear`.
- **Changes:** New workflows/resume.md and the router row (quality & automation, per step); description under 1024 characters; the Input Pass trigger of the prompt-engineer card and its specification mirror; context.md routes resume through the workspace chain; H15 pins the row and the body; engine 4.0.1; 186/186 of the affected harness modules.

### [T-88F01] Reserved forms in the argument form

- **Spec:** l1-command-surface.md CS-10 item 2, §2 (the forecast on where reserved forms appear)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `help.md` Step 4 states that the form offers, after the suggestions, the reserved forms of the command's *Argument* cell read from its body's *Entry* (`stabilize`, `amend {file}` for `spec`; `amend {id}`, `remove {id}` for `rule`; and the forms of `graph`, `migrate`, `goal` where the form opens), a form not valid on the workspace's format left out, one follow-up step in the same form for an operand (its candidates most recently changed first, and free text), and the order when the form is too small; the help checklist gains the item; a shipped-text case pins the step; the `intake` scenario variant of T-88T01 walks it.
- **Handoff:** T-88D01 documents it.
- **Notes:** The bound of E7 is unchanged: the follow-up is the second step of the one argument form. An optional argument of a typed command is still never asked for.
- **Changes:** help.md Step 4: the reserved forms of a command follow the suggestions (another format's forms left out), one follow-up step for an operand, the order in a small form, and a checklist item; a shipped-text case pins the step; engine 4.0.2; 56/56 of the three modules.

### [T-88C01] The constitution names `resume`: C2, the template and the always-on rule

- **Spec:** l2-session-checkpoint.md §7 rows 19 and 20; l1-command-surface.md CS-1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `/magicspec rule amend C2` (origin `user-stated`: the owner's list of 2026-11-27) adds `resume` to the command set as it ships, after `status`, and `skills/magicspec/templates/rules.md` carries the same sentence word for word; `skills/magicspec/CONSTITUTION.md` §10 says the resume line names `/magicspec resume`; `node scripts/validate-hardlinks.js` passes afterwards; the harness case that compares the constitution's C2 with the router's command set passes.
- **Handoff:** T-88T02 runs C14 for the template and the always-on rule.
- **Notes:** `.magicspec/RULES.md` is outside C14; the template and `CONSTITUTION.md` are inside it. `CONSTITUTION.md` and `.agents/rules/magicspec.md` are a hardlinked pair (`[C-001]`).
- **Changes:** RULES.md 2.2.0 and the shipped template: C2 lists resume after status (user-stated; constitutional and wording review passed); CONSTITUTION.md section 10 says resume continues the recorded work (16376 of 16384 bytes); the rule projection refreshed by update-engine-meta; the broken CLAUDE.md and CODEX.md hardlinks (inherited) restored and validate-hardlinks passes; the C2 case fails only on the ledger recording the old constitution version, which task re-records after the replan.

### [T-88D01] Documentation of `resume`, the record and the reserved forms

- **Spec:** l2-session-checkpoint.md §7 row 21; l1-command-surface.md §1.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `docs/` lists `resume` wherever it lists the commands (the README's command table, `docs/distribution.md`'s workflow bodies, `docs/status.md` for the difference between the briefing and `resume`), and a session page section says what the record holds and when it is removed; `node scripts/sync-docs.js` reports nothing stale; every new line is in English (C29).
- **Handoff:** none.
- **Notes:** No page names an SDD artifact of this repository (containment).
- **Changes:** New docs/resume.md; resume in the README command table with the reserved forms, in distribution.md's bodies, status.md, run.md, document-set.md and the documentation index (its stale auxiliary-workflow count corrected to ten); sync-docs reports nothing stale.

### [T-88T01] The cognitive cases C6 to C8 and the three scenarios

- **Spec:** l2-session-checkpoint.md §6 C6 to C8; l1-product-simulation.md SM-3; the plan's scenario list of Phase 88
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `tests/suite/engine-text.md` (beside C1 to C5) gains C6 (an interrupted `spec` resumed: the survey not asked again, the written specification not rewritten), C7 (an interrupted `migrate` that had asked its consent asks it again) and C8 (`resume` with nothing recorded runs nothing); `.magicspec/engine/simulations/session.md` gains S-21 (*a specification interrupted after its intake survey is resumed with `/magicspec resume`*) and S-22 (*`resume` with nothing interrupted says so, names the recorded next step and runs nothing*), and `intake.md`'s S-4 gains the variant *a bare `/magicspec spec` offers `stabilize` and `amend {file}` after the suggested topics, and `amend` asks for the file in the same form*, each in the form of `templates/simulation.md`; the suite's closing line is updated.
- **Handoff:** T-88S01 cites the identifiers.
- **Notes:** Written by `@role:simulator-tester`. A traced run is labelled as traced.
- **Changes:** Cognitive cases T372 to T374 (C6 to C8) in tests/suite/engine-text.md, suite 1.9.111; scenarios S-21 and S-22 in session.md and the reserved-forms variant of S-4 in intake.md; suite layout cases pass. Traced or live runs not performed here.

### [T-88S01] The specifications as built

- **Spec:** l1-session-continuity.md, l2-session-checkpoint.md, l1-command-surface.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** each of the three specifications gains a patch row (Stable retained, no requirement changed) recording what was built where the build decided something the text left open — the module names, the harness modules and case names, the scenario identifiers; the registry rows follow; `check-prerequisites --verify-headers` reports no drift; `export-wiki` runs.
- **Handoff:** none.
- **Notes:** A finding that needs a requirement to change is not patched here: it becomes a replan directive for `/magicspec plan engine`.
- **Changes:** l1-session-continuity 2.8.1, l2-session-checkpoint 1.2.1 (the writer, explicit --nested start, which command removes a record, 4.0 step names, coverage ids), l1-command-surface 2.6.1, l1-pipeline-stages 1.2.1 and l2-role-cards-governance 1.4.13; registry 1.111.1, global 1.65.0; headers verified; export-wiki run. Rows 19 and 20 of the deployment table left to the constitution task.

### [T-88T02] Validation: static checks, full harness, C14, the version back to 4.0.0

- **Spec:** AGENTS.md §3.2; RULES.md C14; the Backlog's 4.0.0 release item
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every changed `.js` and `.json`, `pnpm run typecheck`, `pnpm run audit` and `pnpm exec fallow dead-code` report nothing on code written here; `node --test tests/engine.js` passes in full (count recorded); `node skills/magicspec/scripts/executor.js update-engine-meta` after the last engine edit, then the version file set back to 4.0.0, `node scripts/sync-engine-snapshot.js` and `node scripts/generate-checksums.js`, after which `update-engine-meta --check` passes and `.magicspec/INDEX.md` reads `**Engine Version:** 4.0.0`; `fsutil hardlink list AGENTS.md` lists the family the dev init was given; the changes are under `[4.0.0]` in `CHANGELOG.md`.
- **Handoff:** the phase's completion (`/magicspec run` archives it).
- **Notes:** Run the full harness in the background (about 330 s).
