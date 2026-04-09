---
phase: {N}
name: "{Phase Name}"
status: Todo
subsystem: "{primary-directory or module}"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage {N} Tasks — {Phase Name}

**Phase:** {N}
**Status:** {Todo | In Progress | Blocked | Done}
**Strategic Goal:** {Brief description of phase outcome}

## Atomic Checklist

- [ ] [T-{ID}] {Task Title}
- [ ] [T-{ID}] {Task Title}
- [ ] [T-{ID}.1] {Split Sub-task Title} <!-- ID Splitting: .N suffix for decomposed tasks -->

## Detailed Tracking

### [T-{ID}] {Task Title}

- **Spec:** {spec.md} §{section}
- **Status:** {Todo | In Progress | Done | Blocked | Cancelled}
- **Assignment:** {Agent | User}
- **Handoff:** {Next step / requirement}
- **Notes:** {Initial context or constraints}

### [T-{ID}T] Validation Task

- **Goal:** Verify implementation of {T-ID} against spec.
- **Method:** {e.g. run pytest, check checksums, etc.}
- **Status:** Todo
