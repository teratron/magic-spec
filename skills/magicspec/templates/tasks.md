# Master Task Index (Registry)

**Version:** {X.Y.Z}
**Generated:** {YYYY-MM-DD}
**Based on:** .magicspec/PLAN.md v{X.Y.Z}
**Based on RULES:** .magicspec/RULES.md v{X.Y.Z}
**Execution Mode:** {Sequential | Parallel}
**Status:** Active

## Overview

Tactical registry of all phases and their statuses. Check individual phase files in `tasks/` for atomic checklists.

<!-- Describes this file, not the plan: the phase table carries status, and what a phase produced lives in its phase file, the changelog and the archive. Do not append to this section. -->

## Active Phases

| Phase | Description | Status |
| --- | --- | --- |
| [Phase {N}](tasks/phase-{N}.md) | {Detailed phase goal} | `Todo` \| `In Progress` \| `Blocked` |

<!-- Optional section. Written by /magicspec task, or by /magicspec run, when a finding must go back to /magicspec plan. Absent means none. Pending only while PLAN.md's version equals the one recorded here; a plan rewritten since retires it, and /magicspec plan never writes this file.

## Replan Directive

- **Plan version:** {the version of PLAN.md when the finding was made}
- **Directive:** {what, where, and the change it suggests, in plain words}
-->

## Meta Information

- **Last Updated**: {YYYY-MM-DD}
- **Maintainer**: {Name}
