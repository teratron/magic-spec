---
phase: 47
name: "One Command Surface, Help and Argument Intake"
status: Todo
subsystem: "skills/magicspec (router, workflows, scripts, AGENT-RULES, templates), .magicspec/RULES.md, tests, README, docs"
requires:
  - "Phase 46: the single-skill layout, the migrate subcommand and the archive composition; harness 270"
  - "The one-command decision (l1-command-surface 2.0.0, l1-decision-autonomy 2.1.0, l2-skill-wrappers 3.0.0, l2-skill-distribution 2.0.0): Stable at registry 1.61.0"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 47 Tasks — One Command Surface, Help and Argument Intake

**Phase:** 47
**Status:** Todo
**Strategic Goal:** The user's project receives no per-command wrapper: the engine is reached as `/magicspec <command> [argument]` ([l1-command-surface.md](../specifications/l1-command-surface.md) 2.0.0), a bare `/magicspec` or `/magicspec help` lists the commands and offers them in the host's form or the chat, a command missing its required argument asks for it (E7, [l1-decision-autonomy.md](../specifications/l1-decision-autonomy.md) 2.1.0), and every text the engine prints names a command in that one form.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [ ] [T-47A01] Router: one grammar, the command table with groups and the argument contract, the bare and unknown forms
- [ ] [T-47A02] The `help` body: console-style list, picker and argument form by host capability, help language
- [ ] [T-47A03] Argument intake for `spec` and `rule`: the Blank Trigger becomes the argument form
- [ ] [T-47A04] The `migrate` body and the unmigrated stop naming `/magicspec migrate`
- [ ] [T-47A05] The vocabulary sweep after a migration
- [ ] [T-47B01] E7 in the constitution, its template and the always-on rules
- [ ] [T-47C01] Command entries retired in the projection generator
- [ ] [T-47C02] The plugin channel removed
- [ ] [T-47C03] README and documentation: one form, host table, the seven-step install prompt
- [ ] [T-47V01] Host checks: typed colon form, text after `/magicspec`, the argument hint
- [ ] [T-47D01] The printed form across the repository behind a residue search
- [ ] [T-47T01] Validation: harness, mutation lists, intake scenarios, C14
- [ ] [T-47S01] Spec sync: as-built decisions and the specifications' printed form

## Detailed Tracking

### [T-47A01] Router: one grammar, the command table with groups and the argument contract, the bare and unknown forms

- **Spec:** l1-command-surface.md CS-2, CS-3, CS-9, §5.1; l2-skill-wrappers.md §2.2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/SKILL.md` states `/magicspec <command> [argument]` as the only printed form, has a command table whose every row carries a group, an argument and a when-missing value for exactly the bodies in `workflows/`, routes a bare invocation and `help` to the `help` body and an unknown first word to the help with the typed text kept (one edit away → that command first); its frontmatter declares `argument-hint: <command> [argument]`; `node --test tests/engine.js` passes with a new router case asserting the columns and the dispatch branches, and `scripts/skill-frontmatter.js` accepts the router.
- **Handoff:** T-47A02, T-47A03, T-47A04.
- **Notes:** the table lists only the bodies that exist (parity, `l2-workflow-wrappers.md` §6): the seven current commands plus `help` and `migrate`. The rows of `plan`, `fix`, `simulate` and `goal` arrive with their bodies in later phases. Groups as in §5.1.

### [T-47A02] The `help` body: console-style list, picker and argument form by host capability, help language

- **Spec:** l1-command-surface.md CS-4, CS-5, CS-10, CS-11, §5.2, §5.4; l2-skill-distribution.md §5.2 (choice forms)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/help.md` exists and renders the §5.2 layout from the router's table (no second copy of the command list); describes the picker (recommended choice first and marked, submission as confirmation, two steps — group then command — on a form of four choices, a typed command name always accepted, the chat list when the host has no form), the argument form and the cancel line; `help {command}` and `help {language}`; the router-to-folder parity case passes; `tests/suite.md` gains scenarios for a bare `/magicspec` on a four-choice host, the same on a host with no form, and `help ru`.
- **Handoff:** T-47T01.
- **Notes:** read-only body: it never finalizes and joins the drift-check exemptions of the always-on rules beside `status` (B01 writes that line).

### [T-47A03] Argument intake for `spec` and `rule`: the Blank Trigger becomes the argument form

- **Spec:** l1-command-surface.md CS-9, CS-10; l1-decision-autonomy.md DA-9 (the required-argument exception); l1-idea-intake-gate.md 2.1.1
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `workflows/spec.md` Blank Trigger offers up to three DA-3-ranked topics as the argument form's suggestions, the winner first and marked, free text accepted, and the collected idea then passes Step 0.5; its hints and checklist name E7; `workflows/rule.md` asks for a missing rule text the same way and its checklist names E7; no workflow asks for an optional argument; a new harness case asserts the argument form in the Blank Trigger, and the existing scan for forks handed to the user (the DA-10 shipped-text case in `tests/engine.js`) still passes over the edited bodies.
- **Handoff:** T-47D01.
- **Notes:** needs B01's E7 in force before it is reviewed. `rule.md` is edited only here (its checklist line included), so B01 does not touch it.

### [T-47A04] The `migrate` body and the unmigrated stop naming `/magicspec migrate`

- **Spec:** l1-command-surface.md CS-6, CS-8, §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/workflows/migrate.md` runs the subcommand's dry run, asks one E1 consent question only when the plan removes or renames something, runs `--apply` only on a yes, and prints the finished message on a migrated project; the executor's stop on an unmigrated project names `/magicspec migrate` beside the script path; the harness case on the unmigrated stop asserts the new wording.
- **Handoff:** T-47A05.
- **Notes:** `migrate` never finalizes its dry run.

### [T-47A05] The vocabulary sweep after a migration

- **Spec:** l1-command-surface.md CS-7; l2-skill-distribution.md §5.6
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** after `migrate --apply` on the 2.x fixtures, the earlier command names and folder names are rewritten in the SDD artifacts it may edit, every rewritten specification carries a patch version and a history row, archives, history tables, retrospectives and changelogs are unchanged, a product file with the old vocabulary is reported and not edited; a second run changes nothing; the new harness cases fail with the sweep removed (`scripts/mutation-check.js`).
- **Handoff:** T-47T01.
- **Notes:** edits `migrate.js` after C01 has removed its command-entry step — same file, serialized.

### [T-47B01] E7 in the constitution, its template and the always-on rules

- **Spec:** l1-decision-autonomy.md DA-2, DA-5, §5 item 8
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magicspec/RULES.md` C27 items 2 and 5 and C13 §3 name E7, and `skills/magicspec/templates/rules.md` carries items 2 and 8 word for word (the harness mirror case passes); `skills/magicspec/AGENT-RULES.md` §7 has the E7 bullet and §8's checklist line names E7, and §1's exemptions list `help` and `migrate`; the whitelist lines in the checklists of `task.md`, `run.md` and `analyze.md` name E7; `update-engine-meta` has run.
- **Handoff:** T-47A03, T-47D01.
- **Notes:** a constitutional amendment, written through the rule workflow's logic with origin `user-stated` (the owner's decision of 2026-10-30 is the consent); the constitutional-reviewer and prompt-engineer passes still run on the wording.

### [T-47C01] Command entries retired in the projection generator

- **Spec:** l2-skill-distribution.md §5.1, §5.3, §5.6; l2-skill-wrappers.md §3.1
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** on a fresh fixture, `init --host=claude,codex,qwen` writes no file under any `commands/` folder and its printed ignore lines name no command folder; on a fixture holding marked entries from a 3.0.x install plus an unmarked file of the project's own, `init` removes exactly the marked entries (and an emptied `magicspec/` folder) and keeps the unmarked file; the pre-flight reports `PROJECTION_RETIRED` before and nothing after; `refreshProjections` removes entries and creates none; `migrate --apply` writes no entry; the cases fail under mutation.
- **Handoff:** T-47A05, T-47D01.
- **Notes:** this repository's `init` run then retires `.agents/workflows/magicspec/`; `.agents/workflows/magicspec-dev/` is written by the maintenance init and stays.

### [T-47C02] The plugin channel removed

- **Spec:** l2-skill-distribution.md §2, §5.2, §5.5
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `skills/magicspec/scripts/build-plugin.js` and its executor command row are gone; `grep -rn "build-plugin" skills scripts tests docs README.md` finds only history; the harness passes without its three plugin references.
- **Handoff:** T-47D01.

### [T-47C03] README and documentation: one form, host table, the seven-step install prompt

- **Spec:** l2-skill-distribution.md §5.2, §5.3 (agent-assisted installation contract)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `README.md` and `docs/distribution.md` show `/magicspec <command>` as the only command form and no command folder in the host table or the ignore lines; the README install prompt carries the seven steps of the contract (intent only, runtime check, installed-engine detection with the 2.x route to `/magicspec migrate`, fetch commands for both shells, placement plus `update-engine-meta --check`, `init` stopping on failure, finish on `/magicspec help`); `docs/migration.md` names `/magicspec migrate`; the documentation link check passes.
- **Handoff:** T-47D01.

### [T-47V01] Host checks: typed colon form, text after `/magicspec`, the argument hint

- **Spec:** l1-command-surface.md §2 (TBD); l2-skill-distribution.md §5.2 (TBD); l2-skill-wrappers.md §2.2 (TBD)
- **Status:** Todo
- **Assignment:** User
- **Verify:** three observations recorded in this entry's `Changes`: what Claude Code does with a typed `/magicspec:task` in a project with no command entry; whether Qwen Code hands the text after `/magicspec` to the skill; whether Codex and Qwen Code load the router with an `argument-hint` field in its frontmatter.
- **Handoff:** T-47S01.
- **Notes:** does not block C01: a host that drops the argument still reaches every command through the help, which needs none. The answers decide the release notes and whether the hint is omitted for a host.

### [T-47D01] The printed form across the repository behind a residue search

- **Spec:** l1-command-surface.md CS-2, §6 item 3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** a residue search for `/magicspec:[a-z]` (plain and escaped spellings) over `skills/magicspec/`, `scripts/`, `tests/`, `docs/`, `README.md`, the templates and CI finds only the router's tolerance sentence, the migration's sweep patterns, history rows, changelogs and archives; script output (`finalize.js`, `check-prerequisites.js`, `check-bloat.js`, `archive-phases.js`, `migrate.js`) prints `/magicspec <command>`; every assertion that the old form is absent still asserts absence; `node --test tests/engine.js` passes; `update-engine-meta` has run.
- **Handoff:** T-47T01.
- **Notes:** one scripted pass with literal replacement (`split`/`join`, never a replacement string with `$` sequences); exemptions listed before the pass. The `/magicspec-dev:` maintenance names are out of scope.

### [T-47T01] Validation: harness, mutation lists, intake scenarios, C14

- **Spec:** l1-command-surface.md CS-1 to CS-11; l1-decision-autonomy.md DA-2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` reports zero failures with the new cases (router dispatch, no entries written, retired entries removed, `PROJECTION_RETIRED`, residue of the colon form, C27 mirror with E7, migration sweep); every new case is CAUGHT by `scripts/mutation-check.js`; `tests/suite.md` covers bare, `help`, `help ru`, an unknown word, a one-edit typo, `spec` without an idea, `run` without an argument running its default, a cancelled form; `update-engine-meta --check` is clean; `node scripts/validate-hardlinks.js` passes.
- **Handoff:** T-47S01.

### [T-47S01] Spec sync: as-built decisions and the specifications' printed form

- **Spec:** l1-command-surface.md; l2-skill-distribution.md; l2-skill-wrappers.md; l1-decision-autonomy.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the three TBD markers are resolved from T-47V01's observations; decisions taken while building are recorded in the four specifications with a history row each; this repository's specifications print `/magicspec <command>` (a reality-sync patch each, history exempt); the registry rows follow; `check-prerequisites --verify-headers` reports no drift.
- **Handoff:** Phase 48.
- **Notes:** specification work, done through the specification workflow.
