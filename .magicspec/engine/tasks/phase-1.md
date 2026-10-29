# Phase 1 — Config Drift Detection

## [T-1A01] Add git diff drift check to executor check-prerequisites

- **Spec:** l1-config-drift-guard.md §Proposed Behavior
- **Status:** Done
- **Changes:**
  - Modified: `.magic/scripts/check-prerequisites.js` (added `checkConfigDrift()` function with git diff detection, C22-aware multi-RULES.md support)
- **Assignee:** Agent
- **Notes:** When git is available, run `git diff HEAD -- .design/RULES.md` (and workspace-specific RULES.md per C22). If changes detected, include `CONFIG_DRIFT` warning in JSON output. If git unavailable, skip silently (no new dependency). Output format: `"config_drift": { "detected": true, "files": [".design/RULES.md"], "hint": "RULES.md modified outside workflow" }`.

## [T-1A02] Document Config Drift Guard in init.md

- **Spec:** l1-config-drift-guard.md §Proposed Behavior
- **Status:** Done
- **Changes:**
  - Modified: `.magic/init.md` (added Config Drift Advisory sub-step to Step 1 with non-blocking warning and user options)
- **Assignee:** Agent

## [T-1T01] Add cognitive tests T168-T170 for config drift detection

- **Spec:** l1-config-drift-guard.md §Proposed Behavior
- **Status:** Done
- **Changes:**
  - Modified: `.magic/tests/suite.md` (added T168: drift present, T169: no git, T170: workspace-specific C22; bumped version to 1.9.51)
- **Assignee:** Agent
