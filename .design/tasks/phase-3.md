# Phase 3: CLI & Developer Experience

**Status:** Active
**Execution Mode:** Parallel
**Tracks:** A, B, C

## User Stories

### [P2] US-04 — As a user, I can run a CLI doctor command to instantly diagnose environment issues

Tasks: T-3A01, T-3B01
Parallel-safe: T-3A01 [P], T-3B01 [P]

### [P2] US-05 — As a new developer, I can run an interactive onboarding workflow to learn the SDD lifecycle

Tasks: T-3C01, T-3C02
Parallel-safe: none (sequential dependency)

---

## Track A — CLI Doctor (Node.js)

### [T-3A01] Implement CLI `--doctor` in Node.js installers [P]

  Spec:     workflow-enhancements.md §3.7
  Story:    US-04
  Priority: P2
  Phase:    3 / Track A
  Depends:  —
  Status:   Done
  Changes:  Added isDoctor parsing logic to index.js and formatted JSON output with emojis
  Assignee: Agent
  Notes:    Parse prerequisite script JSON response in `installers/node/index.js` to display visually structured validation data when running with `--doctor` or `--check`.

## Track B — CLI Doctor (Python) *(parallel with A)*

### [T-3B01] Implement CLI `--doctor` in Python installers [P]

  Spec:     workflow-enhancements.md §3.7
  Story:    US-04
  Priority: P2
  Phase:    3 / Track B
  Depends:  —
  Status:   Done
  Changes:  Handled --doctor flag in python **main**.py, executing script and printing visually structured results
  Assignee: Agent
  Notes:    Parse prerequisite script JSON response in `installers/python/magic_spec/__main__.py` to display visually structured validation data when running with `--doctor` or `--check`.

## Track C — Interactive Onboarding Workflow

### [T-3C01] Create `.magic/onboard.md` script

  Spec:     workflow-enhancements.md §3.6
  Story:    US-05
  Priority: P2
  Phase:    3 / Track C
  Depends:  —
  Status:   Done
  Changes:  Created the .magic/onboard.md interactive tutorial script following step-by-step guidance style
  Assignee: Agent
  Notes:    Create the explicit, targeted workflow command for onboarding new developers.

### [T-3C02] Create `.agent/workflows/magic.onboard.md` wrapper

  Spec:     workflow-enhancements.md §3.6
  Story:    US-05
  Priority: P2
  Phase:    3 / Track C
  Depends:  T-3C01
  Status:   Done
  Changes:  Created the wrapper inside .agent/workflows/magic.onboard.md to trigger the script
  Assignee: Agent
  Notes:    Create the entry point wrapper for the new onboard workflow, adding it to the UI.

## Phase Completion

- [x] All tasks Done
- [x] No open blockers
- [x] TASKS.md summary updated
- [x] Retrospective auto-snapshot appended to RETROSPECTIVE.md
- [x] Changelog auto-compiled to CHANGELOG.md
- [x] CONTEXT.md regenerated
- [x] Next phase unlocked: None
- [x] If all phases complete: full retrospective + changelog compile (Level 2) was run
