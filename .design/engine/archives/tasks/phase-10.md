---
phase: 10
name: "Session-Continuity Hardening Deployment (SC-2.1 + finalize coverage)"
status: Done
subsystem: ".magic/scripts/finalize.js + dev/tests/engine.js"
requires: []
provides:
  - "computeNextAction is plan-state-aware (SC-2.1): open tasks → /magic.run, plan complete → /magic.spec, never a static empty-phase recommendation"
  - "finalize.js is requirable (module.exports behind require.main guard) — unit-testable"
  - "dev/tests/engine.js gains finalize-pipeline coverage (SC-2 skip-path patch, SC-2.1 branches, SC-3 fallback); harness 12 → 14"
key_files:
  created: []
  modified:
    - ".magic/scripts/finalize.js"
    - "dev/tests/engine.js"
patterns_established:
  - "CLI scripts intended for unit testing export their internals behind an `if (require.main === module)` guard"
  - "Session-continuity logic (SC-2/SC-2.1/SC-3) is pinned by the deterministic harness, not only the cognitive suite"
duration_minutes: 18
---

# Stage 10 Tasks — Session-Continuity Hardening Deployment

**Phase:** 10
**Status:** Done
**Strategic Goal:** Deploy SC-2.1 (l1-session-continuity.md v1.1.0) and the finalize-coverage mandate (l2-test-suite.md v1.5.0). Make `computeNextAction` plan-state-aware so STATE.md never recommends "execute the active phase" against a complete plan, and add the first regression coverage of the finalize pipeline to `dev/tests/engine.js`.

## Atomic Checklist

- [x] [T-10A01] Rewrite computeNextAction (finalize.js) plan-state-aware per SC-2.1
- [x] [T-10A02] Add finalize-pipeline regression test(s) to dev/tests/engine.js
- [x] [T-10T01] Validation: full harness, C14 meta, integrity, STATE self-correction

## Detailed Tracking

### [T-10A01] Rewrite computeNextAction plan-state-aware

- **Spec:** l1-session-continuity.md §SC-2 / SC-2.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** With a complete plan (TASKS.md has no open `- [ ]` task, Active Phases = "None — plan complete"), `node .magic/scripts/executor.js finalize --workflow=task --dry-run` previews a `Next Action` recommending `/magic.spec` (new scope), NOT "execute the active phase". With an open task present, it recommends `/magic.run`. Grep confirms the static `task: ...execute the active phase` map entry is gone.
- **Handoff:** T-10A02 (test asserts this behavior).
- **Notes:** Replace the static `spec|task|rule` map branch with a plan-state read (mirror the existing `run` branch that already parses TASKS.md): resolve open `- [ ]` tasks → `/magic.run`; plan-complete (no open tasks, no active phase) → `/magic.spec` for new scope; registered specs with no plan rows → `/magic.task`. Keep the `run` branch's existing behavior. Preserve the `try/catch` fallback. `.magic/` change → C14 applies (T-10T01).
- **Changes:** finalize.js `computeNextAction` rewritten — static `task: "execute the active phase"` map removed; spec/rule → /magic.task (replan), task/run → plan-state read (open `- [ ]` → /magic.run with task id; no open tasks → "Plan complete — author new scope via /magic.spec"); try/catch → /magic.task fallback. Verified: harness asserts both branches + doesNotMatch "execute the active phase".

### [T-10A02] Add finalize-pipeline regression test(s)

- **Spec:** l2-test-suite.md §Script-Level Regression Harness (finalize coverage mandate)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/tests/engine.js` includes new finalize test(s) and the full suite passes (count rises from 12). Test asserts: (a) SC-2 patches STATE.md on a significant path; (b) SC-2.1 plan-complete fixture yields a `/magic.spec` next-action, open-task fixture yields `/magic.run`; (c) SC-3 — significance miss + dirty tree emits a `(non-bumping)` suggestion with version unchanged.
- **Handoff:** T-10T01.
- **Notes:** Model the fixture on the existing `update-state.js` test (engine.js ~line 359): `createTempWorkspace(true)` for git; provision `.design/{ws}/` with `TASKS.md`, `STATE.md` (from template), `.design/.version`, `workspace.json`. `dev/tests/engine.js` is L2 (dev/) — editing it does NOT trigger C14. Assert via parsed stdout / STATE.md content (Evidence Capsule shape; no raw dumps in task records).
- **Changes:** Added 2 harness tests (12 → 14). (1) `computeNextAction` unit — all SC-2.1 branches (open→run, complete→spec, spec/rule→task, missing→fallback) + `doesNotMatch` the R6 bug string. (2) e2e skip-path — finalize patches STATE.md (SC-2), plan-complete next-action → /magic.spec, SC-3 suggestion emitted, version unchanged. Required making finalize.js requirable: `module.exports = { main, computeNextAction, updateSessionState }` behind `if (require.main === module)` guard (same pattern as update-state.js). finalize.js change → C14.

### [T-10T01] Validation Task

- **Goal:** Verify SC-2.1 + finalize coverage deployed and the engine is integral.
- **Method:** (1) `node .magic/scripts/executor.js update-engine-meta` — C14 bump for finalize.js + checksum regen + skill re-projection. (2) `node dev/tests/engine.js` → all pass (13+). (3) `node .magic/scripts/executor.js update-engine-meta --check` → no drift. (4) STATE self-correction: a real `finalize --workflow=task` on the current complete plan writes a `Next Action` pointing to `/magic.spec`, not "execute the active phase" (grep STATE.md). (5) `check-prerequisites --json --workspace engine` → ok, no new warnings.
- **Status:** Done
- **Changes:** C14 → engine 2.1.38 → 2.1.39 (65 files, checksums regenerated). Harness 14/14 pass (12 → 14). update-engine-meta --check: no drift. check-prerequisites: ok, 0 warnings. validate-hardlinks: all linked. STATE self-correction validated by the e2e test (plan-complete → /magic.spec); also manifests in this phase's own run-finalize once the plan closes.
