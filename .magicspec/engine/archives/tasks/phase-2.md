---
phase: 2
name: "Skill Projection & Agent Surface"
status: Done
subsystem: ".magic/scripts, skills/"
requires: []
provides:
  - "sync-skills.js: projects workflows/*.md into skills/*/SKILL.md wrappers"
  - "init.js: skill directories wired into dev initialization"
  - "Skill projection parity validated by dev/tests/suite.md T190 (retrospec)"
key_files:
  created:
    - ".magic/scripts/sync-skills.js"
  modified:
    - ".magic/scripts/init.js"
patterns_established:
  - "Workflow-as-source-of-truth projection into generated Skill wrappers (l2-skill-wrappers.md §5 Invariants)"
duration_minutes: ~
---

# Phase 2 — Skill Projection & Agent Surface

## [T-2A01] Create sync-skills.js automation script

- **Spec:** l2-skill-wrappers.md §3.1
- **Status:** Done
- **Changes:**
  - New File: `.magic/scripts/sync-skills.js`
- **Assignee:** Agent
- **Notes:** Script should scan workflows and generate `skills/*/SKILL.md` with appropriate frontmatter.

## [T-2A02] Integrate skills into dev initialization

- **Spec:** l2-skill-wrappers.md §4.1
- **Status:** Done
- **Changes:**
  - Modified: `.magic/scripts/init.js`
- **Assignee:** Agent

## [T-2I01] Include skills in GitHub release archives

- **Spec:** l2-skill-wrappers.md §4.2
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Ensure the release archive includes generated `skills/` output from `sync-skills.js`, alongside `workflows/` and `rules/`. (Merged from the earlier task list `02-universal-skill-wrappers.md`, which held this task and the next one and nothing else the archive lacked.)

## [T-2M01] Update adapter path documentation

- **Spec:** l2-skill-wrappers.md §2
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Keep adapter target paths documented in `docs/distribution.md` and mirrored in the README adapter table. (Merged from the same earlier task list.)

## [T-2T01] Add validation tests for skill projection

- **Spec:** l2-skill-wrappers.md §5
- **Status:** Done
- **Changes:**
  - Retrospec (2026-08-07): the originally-targeted `.magic/tests/suite.md` path predates this project's L1/L2 split and no longer exists. The cognitive test suite now lives at `dev/tests/suite.md`, where **T190 — Skill Projection Parity** covers all three §5 Invariants directly: frontmatter `name` matches the hyphenated skill-directory convention (Naming), `SKILL.md` body verbatim-matches the source workflow (Parity), and the read-only warning comment plus Orphan Cleanup on source deletion (Read-Only + §3.1 step 4) are asserted. Verified against a live generated skill (`skills/magic-analyze/SKILL.md`) during closure — frontmatter uses `name: magic-analyze` (hyphenated), confirming T190's expectation is the actual behavior.
- **Assignee:** Agent
- **Notes:** Closed via existing coverage, not new test authorship — T190 already satisfied this task's intent under a different ID once the test suite relocated. §2.2 of `l2-skill-wrappers.md` still shows a stale `name: magic.{command}` (dot form) example that disagrees with the real hyphenated output; left unfixed here (spec correction is `/magic.spec`'s write scope, out of bounds for `/magic.run`).
