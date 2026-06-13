---
phase: 12
name: "Wrapper-Body Parity Check Deployment (R4)"
status: Done
subsystem: ".magic/analyze.md (Mode C)"
requires: []
provides:
  - "magic.analyze Mode C verifies wrapper-body parity (WRAPPER_BODY_DRIFT) — phantom body pointers now fail the audit"
  - "Findings Schema + both Mode C checklists carry the parity check"
key_files:
  created: []
  modified:
    - ".magic/analyze.md"
patterns_established:
  - "Preventive structural checks live as cognitive Mode C steps with a Findings-schema row and checklist line (consistent with Ghost/Zombie, Link Integrity)"
duration_minutes: 10
---

# Stage 12 Tasks — Wrapper-Body Parity Check Deployment (R4)

**Phase:** 12
**Status:** Done
**Strategic Goal:** Deploy l2-workflow-wrappers.md v1.2.0 §6. Add the `WRAPPER_BODY_DRIFT` parity check to `magic.analyze` Mode C (cognitive, consistent with sibling structural checks) so phantom wrapper→body mappings fail the audit instead of surviving undetected.

## Atomic Checklist

- [x] [T-12A01] Add WRAPPER_BODY_DRIFT check to analyze.md Mode C + Findings schema + checklists
- [x] [T-12T01] Validation: C14, harness, integrity, cognitive dry-run vs current wrappers

## Detailed Tracking

### [T-12A01] Add WRAPPER_BODY_DRIFT check to Mode C

- **Spec:** l2-workflow-wrappers.md §6 / §6.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md` Mode C contains a wrapper-body parity step (for each `workflows/magic.{cmd}.md` with a `.magic/{cmd}.md` pointer, assert the body exists; self-contained wrappers skipped; bodies without wrappers allowed); the Findings Schema table has a `WRAPPER_BODY_DRIFT` row; both Mode C checklists (Ventilation steps + Task Completion) carry a parity-check line. Grep `grep -n "WRAPPER_BODY_DRIFT" .magic/analyze.md` returns ≥3 hits (step, schema, checklist).
- **Handoff:** T-12T01.
- **Notes:** Cognitive check (no new script) — consistent with existing Mode C structural checks (Ghost/Zombie, Case Sensitivity, Link Integrity). Place under the Design Registry Audit (step 2) or as a dedicated structural step; one-directional invariant per §6 (pointer→body required; no-pointer→self-contained; body-without-wrapper allowed). `.magic/` change → C14 (T-12T01).
- **Changes:** Added Wrapper-Body Parity bullet to analyze.md Mode C step 2 (Design Registry Audit, unconditional); added `Wrapper Drift` row to the Findings Schema; added a parity line to both Mode C checklists (Ventilation + Task Completion). MD038 lint avoided (no nested markdown in code-spans). grep WRAPPER_BODY_DRIFT → 4 hits. engine 2.1.40 → 2.1.41 (C14).

### [T-12T01] Validation Task

- **Goal:** Verify the parity check is deployed, integral, and correctly classifies the current wrapper set.
- **Method:** (1) `node .magic/scripts/executor.js update-engine-meta --workflow analyze` — C14 bump + checksum regen + skill re-projection. (2) `node dev/tests/engine.js` → all pass (15; no new test — cognitive check). (3) `update-engine-meta --check` → no drift. (4) Cognitive dry-run: apply the new check to the current 7 wrappers — `magic.graph` classified self-contained (no body, no finding); the other 6 map to existing `.magic/{cmd}.md` (no finding); result clean (no WRAPPER_BODY_DRIFT today, confirming the check is correct and the current tree is parity-clean). (5) `check-prerequisites --json --workspace engine` → ok.
- **Status:** Done
- **Changes:** C14 → engine 2.1.40 → 2.1.41 (65 files). Harness 15/15 (no new test — cognitive Mode C check). update-engine-meta --check: no drift. check-prerequisites: ok, 0 warnings. Dry-run vs 7 wrappers: graph self-contained (skip), 6 others → bodies exist → 0 WRAPPER_BODY_DRIFT (tree parity-clean, check correct).
