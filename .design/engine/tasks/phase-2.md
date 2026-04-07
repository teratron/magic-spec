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

## [T-2T01] Add validation tests for skill projection

- **Spec:** l2-skill-wrappers.md §5
- **Status:** Todo
- **Changes:**
  - Modified: `.magic/tests/suite.md`
- **Assignee:** Agent
- **Notes:** Verify parity between source workflow and generated skill.
