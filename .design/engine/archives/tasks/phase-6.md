---
phase: 6
name: "SDD Reference Containment — RC gates deployment"
status: Done
subsystem: ".magic (roles, analyze) + rules/"
requires: []
provides:
  - "rules/magic.md §6 SDD Reference Containment (ambient policy, RC-1..RC-4)"
  - "Coder card authoring gate (protocol step 6 + anti-pattern)"
  - "Code-reviewer card containment check (protocol step 4 + anti-pattern)"
  - "analyze.md Mode C step 6 SDD_REFERENCE_LEAK scan (advisory)"
  - "Engine 2.1.31 (C14 bump, checksums, skill wrappers synced)"
key_files:
  created: []
  modified:
    - "rules/magic.md"
    - ".magic/roles/coder.md"
    - ".magic/roles/code-reviewer.md"
    - ".magic/analyze.md"
patterns_established:
  - "Shipped engine files must be self-contained: never reference engine-workspace spec files (R5 extension of the containment rule to the engine itself)"
duration_minutes: ~
---

# Stage 6 Tasks — SDD Reference Containment (RC gates)

**Phase:** 6
**Status:** Done
**Strategic Goal:** Deploy the SDD Reference Containment policy (`l1-sdd-reference-containment.md`) across the shipped engine surface: ambient policy section in user-side `rules/magic.md`, RC-5 authoring gate in the Coder card, RC-6 containment check in the Code-reviewer card, and the RC-7 leak scan in the ventilation workflow — so consumer products stay self-contained when releases exclude `.design/`.

> **Serialization note (planner audit):** No hard dependency on Phases 4-5 (no `Implements` relation; field-priority fix). MUST NOT execute concurrently with Phase 4 or 5 — shared files: `.magic/roles/*.md` (T-5C01), `rules/magic.md` (T-5A02). Sequential execution in any order is safe. Within the phase: T-6B01 lands first (cards reference the shipped rules section), then A-track, then C-track, then the single C14 bump (T-6D01).
>
> **Self-containment constraint (R5):** deployed engine files (`.magic/roles/*.md`, `.magic/analyze.md`, `rules/magic.md`) MUST NOT reference `l1-sdd-reference-containment.md` or any `.design/engine/...` path — that spec does not exist in consumer projects. State the policy inline; cross-reference only shipped files (`rules/magic.md`).

## Atomic Checklist

- [x] [T-6B01] Add "SDD Reference Containment" section to user-side `rules/magic.md`
- [x] [T-6A01] Add containment authoring gate to `.magic/roles/coder.md`
- [x] [T-6A02] Add containment review check to `.magic/roles/code-reviewer.md`
- [x] [T-6C01] Add SDD_REFERENCE_LEAK scan to `.magic/analyze.md` ventilation checks
- [x] [T-6D01] C14 engine meta update (single bump for all `.magic/` + `rules/` edits)
- [x] [T-6T01] Validation: containment-gate simulation (authoring + review + scan)
- [x] [T-6T02] Validation: engine test harness green

## Detailed Tracking

### [T-6B01] User-side `rules/magic.md` — ambient containment section

- **Spec:** l1-sdd-reference-containment.md §3 RC-1..RC-4, §4.1 (ambient surface), §4.3 (examples)
- **Status:** Done
- **Changes:** Added §6 "SDD Reference Containment" to `rules/magic.md` (rule, example, exemptions, enforcement); Completion Protocol renumbered §6→§7 with new §6 checklist line; broken hardlink `.agents/rules/magic.md` recreated.
- **Assignment:** Agent
- **Verify:** `grep "Reference Containment" rules/magic.md` hits; section states the one-way rule, forbidden reference classes (task IDs, phase designators, SDD system files, spec names, `.design/` paths), exemptions, and one BAD/GOOD example pair; Completion Protocol checklist in the same file gains a containment line
- **Handoff:** T-6A01, T-6A02 (cards cross-reference this shipped section)
- **Notes:** Compact operational form; the normative source is the L1 spec, but the shipped text must be fully self-contained (no `.design/engine/...` links).

### [T-6A01] Coder card — RC-5 authoring gate

- **Spec:** l2-role-cards-execution.md §3 (Coder, protocol step 5 + anti-pattern)
- **Status:** Done
- **Changes:** Coder card: containment step inserted as protocol step 6 (deployed card has an extra auto-trigger step vs spec numbering), steps renumbered 6-8→7-9, anti-pattern added; references shipped `rules/magic.md` §6 only.
- **Assignment:** Agent
- **Verify:** coder card protocol contains the containment step (never reference SDD artifacts in code/comments/docstrings/identifiers/string literals/test names) before the handoff step; anti-pattern line present; `grep "l1-sdd-reference-containment" .magic/roles/coder.md` returns NO matches (self-containment)
- **Handoff:** T-6D01
- **Notes:** Mirror the L2 spec card text; replace the spec-file link with a reference to the `rules/magic.md` containment section.

### [T-6A02] Code-reviewer card — RC-6 containment check

- **Spec:** l2-role-cards-review.md §1 (Code-reviewer, protocol step 4 + anti-pattern)
- **Status:** Done
- **Changes:** Code-reviewer card: containment check inserted as step 4, steps renumbered 4-9→5-10, internal "signals from §5" reference updated to §6, anti-pattern added.
- **Assignment:** Agent
- **Verify:** reviewer card protocol contains the containment check (scan diff for SDD-layer references → FAIL) between the traceability and surface-correctness steps; anti-pattern line present; `grep "l1-sdd-reference-containment" .magic/roles/code-reviewer.md` returns NO matches
- **Handoff:** T-6D01
- **Notes:** Same self-containment constraint as T-6A01.

### [T-6C01] Ventilation — SDD_REFERENCE_LEAK scan

- **Spec:** l1-sdd-reference-containment.md §3 RC-7, §4.2 (detection heuristic, RC-8 exemptions)
- **Status:** Done
- **Changes:** analyze.md Mode C: new step 6 "SDD Reference Containment Scan", steps 6-13 renumbered 7-14; "SDD Leak" row added to Findings Schema; both Mode C checklists gained a Containment Scan line.
- **Assignment:** Agent
- **Verify:** `grep "SDD_REFERENCE_LEAK" .magic/analyze.md` hits; the check is listed in the ventilation checks with advisory (warning) severity; exemption set stated inline (`.design/` subtree, engine dirs, git metadata, SDD-process docs); scan is a cognitive grep procedure — no new executor script introduced (C2)
- **Handoff:** T-6D01
- **Notes:** Findings format: `SDD_REFERENCE_LEAK {file}:{line} → "{matched token}"`. Ventilation never auto-edits product files.

### [T-6D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Done
- **Changes:** Engine 2.1.30→2.1.31; checksums regenerated (63 files); skill wrappers re-projected. Detected: analyze.md, roles/coder.md, roles/code-reviewer.md.
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow analyze` exits 0; `.magic/.version` patch-bumped; `.magic/.checksums` regenerated; skill wrappers auto-synced
- **Handoff:** T-6T01
- **Notes:** Single serialized bump after ALL `.magic/` and `rules/` edits (proven Phase 4/5 pattern).

### [T-6T01] Validation: Containment-Gate Simulation

- **Goal:** Verify the deployed gates actually intercept SDD references.
- **Method:** Cognitive simulation: (a) author a sample diff containing `// implements T-9Z99, see .design/specs/foo.md` — assert the Coder card forbids writing it and the Code-reviewer protocol yields FAIL with the containment step cited; (b) run the leak-scan grep procedure over this repository — assert findings appear only inside the exempt set (`.design/`, engine dirs, SDD-process docs).
- **Verify:** simulation transcript recorded in phase Notes; both assertions pass
- **Status:** Done
- **Changes:** (a) PASS — deployed coder.md step 6 forbids the sample diff (`// implements T-9Z99, see .design/specs/foo.md` matches task-ID + `.design/` path classes); code-reviewer.md step 4 yields FAIL on the same diff. (b) PASS — leak-scan over non-exempt zones: `installers/` 0 findings; root README/CHANGELOG/CONTRIBUTING classified exempt (SDD-process docs of the engine repo itself).
- **Notes (follow-up):** shipped engine files `analyze.md`, `spec.md`, `task.md` reference `../.design/engine/specifications/l2-spec-graph-memory.md` — engine→dev-workspace links broken on consumer installs; same violation class one level up. Out of this phase's scope; needs its own task.

### [T-6T02] Validation: Engine Test Harness

- **Goal:** Verify no regression in engine cognitive/structural tests after card/workflow edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions reported
- **Status:** Done
- **Changes:** 12/12 tests pass, 0 failures (TAP: pass 12, fail 0).
