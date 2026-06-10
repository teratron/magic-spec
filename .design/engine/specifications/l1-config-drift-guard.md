# Config Drift Guard

**Version:** 1.0.1
**Status:** Stable
**Layer:** concept

## Overview

Detect manual (out-of-workflow) modifications to `RULES.md` during pre-flight checks and warn the user before proceeding. This prevents "silent drift" where conventions are changed without audit trail, potentially invalidating task plans or execution assumptions.

## Motivation

Current workflows read `RULES.md` at startup but do not verify whether it was modified outside the SDD lifecycle. A user (or external tool) can delete, reorder, or alter conventions (e.g., remove C3 Execution Mode) without any workflow detecting the change. This creates a class of bugs where the engine operates on stale or incomplete rules.

## Proposed Behavior

1. **Trigger**: `check-prerequisites` (called by `init.md` Step 1 at the start of every workflow).
2. **Mechanism**: If git is available, run `git diff HEAD -- .design/RULES.md` (and `.design/{workspace}/RULES.md` if it exists per C22).
3. **On drift detected**: Emit a non-blocking warning:
   - `"RULES.md was modified outside workflow. Review changes? (a) show diff, (b) proceed, (c) restore from HEAD"`
4. **On no git**: Skip silently (consistent with existing git-optional design).
5. **Scope**: Global `RULES.md` and all workspace-specific `RULES.md` files (per C15/C22).

## Constraints

- **Non-blocking by default**: Warning only, not HALT. User decides whether to act.
- **No new dependencies**: Uses git CLI already available in the executor environment.
- **No false positives**: Only triggers on uncommitted changes (staged or unstaged). Committed changes are considered intentional.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — defines `check-prerequisites` and init workflow.
- [l2-engine-automation.md](l2-engine-automation.md) — defines executor scripts.

## Canonical References

| Path | Role |
| --- | --- |
| `.design/RULES.md` | Global project constitution monitored for drift |
| `.magic/scripts/check-prerequisites.js` | Implementation of drift detection logic |
| `.magic/context.md` | Calls check-prerequisites at startup |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.1 | 2026-06-10 | Fixed broken Related Specifications links: added layer prefixes (l1-engine-core.md, l2-engine-automation.md) |
| 0.1.0 | 2026-03-25 | Initial Micro-spec from simulation RE-1 |
| 1.0.0 | 2026-03-25 | Auto-promoted to Stable (C9 Trust Mode) |
