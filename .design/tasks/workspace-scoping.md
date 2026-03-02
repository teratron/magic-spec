# Implementation Plan: Focused Workspace Scoping (C15)

Introduce the ability to define analysis boundaries within workspaces to optimize token usage and accuracy.

## Phase 0: Specification

- [ ] Create `workspace-scoping.md` (L1) in `.design/specifications/`
- [ ] Promoted to Stable status (v1.0.0)

## Phase 1: Engine Core Modification

- [ ] Update `executor.js` to extract `scope` and export `MAGIC_WORKSPACE_SCOPE`
- [ ] Update `analyze.md` documentation to include scoping logic in Step 25
- [ ] Update `check-prerequisites.js` to report scoped scan status (optional)

## Phase 2: Validation

- [ ] Add `T70 — Scoped Analysis Guard` to `.magic/tests/suite.md`
- [ ] Run `/magic.simulate test` to verify zero regressions
- [ ] Manual confirmation via Improv Mode simulation

## Phase 3: Meta Update

- [ ] Perform C14 Engine Meta bump (v1.4.56)
