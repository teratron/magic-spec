---
phase: 84
name: "Maintenance: The Finalization's Git Probes Print Nothing of Git's"
status: Done
subsystem: "skills/magicspec/scripts/lib (significance.js, git-utils.js), tests/engine"
requires:
  - "l2-engine-finalization 3.11.0 §13"
provides:
  - "finalize prints no line of git's: the probes of significance.js take the options of git-utils.js, which also supplies the status and line-count probes; one harness case under three mutation entries; harness 520; engine 3.0.217"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/lib/significance.js"
    - "skills/magicspec/scripts/lib/git-utils.js"
    - "tests/engine/resume-and-checkpoint.js"
patterns_established:
  - "A module that probes git takes the options and the probes of git-utils.js and does not write its own"
duration_minutes: ~
---

# Stage 84 Tasks — Maintenance: The Finalization's Git Probes Print Nothing of Git's

**Phase:** 84
**Status:** Done
**Strategic Goal:** `finalize` prints only what the engine says, in a repository with no commit yet and in one git warns about line endings in.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active in the ledger: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reported by an agent** as feedback note n7 while it traced a scenario of Phase 81 in a scratch project.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-84F01] The probes of the finalization discard git's standard error

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-84F01] The probes of the finalization discard git's standard error

- **Spec:** l2-engine-finalization.md §13
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *finalize prints no line of git's in a repository with no commit yet, or one git warns about line endings in* of `tests/engine/resume-and-checkpoint.js`, written first and seen to fail on the `fatal:` lines; after the repair it passes, `scripts/mutation-check.js` reports the entries that revert the repair `CAUGHT`, and the full harness passes.
- **Handoff:** `finalize --workflow=fix` archives the phase when the task is `Done`.
- **Notes:** Feedback note n7 (kind `bug`). Re-verified on the current tree (engine 3.0.213) in a disposable project with a copy of the engine: `finalize --workflow=rule` in a repository with no commit printed 22 lines of git's on standard error, `--workflow=run --dry-run` 3, and under `core.autocrlf` both printed line-ending warnings; `check-prerequisites` and `resume-state` printed none. Confirmed cause, tested on a scratch copy of the engine: the six probes of `scripts/lib/significance.js` run git with no `stdio` option, so git's standard error is inherited; with the options of `git-utils.js` the same runs print none. Class: specification gap (§13 added before the code). Sibling sites, every git call of the shipped folder: `git-utils.js` discards it, `check-prerequisites` and `install-hooks` capture it, `vocabulary-sweep` discards it — none to repair; the maintenance `scripts/release.js` shows git's errors to the person releasing, as intended.
- **Changes:** `significance.js`: the change-set and file probes run git with `QUIET` of `git-utils.js`; its status and line-count probes, the same text once quiet (a clone the audit reported), come from `git-utils.js`, a rename still answered as `modified`. `git-utils.js` exports `QUIET`. The case written first failed on the `fatal:` lines and passes; `scripts/mutation-check.js` reports three entries `CAUGHT` (the shared options, the change-set probe, the diff probe). Scenario S-1 (`pipeline`) gained the variant of a repository with no commit; its printed outcome was observed in disposable projects. Both files were drifted from Biome and are formatted. Checks: full harness 520 of 520, `biome`, `pnpm run typecheck` and `pnpm exec fallow dead-code` clean, `pnpm run audit` with 0 duplication and two inherited complexity warnings. Lines: develop repaired (engine 3.0.217); v2.1 present, ported (2.1.150, local commit 1149ee0, no push; its harness 214 of 214).
