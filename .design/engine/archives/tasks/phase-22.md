---
phase: 22
name: "Field-Report Triage — DESIGN_DEBT_PENDING Structural Predicate, Mode C Depth Control, Project-Auditor Citation"
status: Done
subsystem: ".magic (scripts, analyze.md, roles)"
requires: []
provides:
  - "check-prerequisites.js: planComplete recognizes terminal-row completion (Done/Done (Archived)/Cancelled), not only the literal '*None*' marker (l2-engine-automation.md v1.9.0, l1-session-continuity.md v1.10.0 Terminal-Row Recognition)"
  - "analyze.md: Mode C never HALTs on Depth Control (Audit Policy bypass list + Completion Checklist parity, l1-engine-core.md v1.5.0)"
  - "roles/project-auditor.md: anti-fabrication citation corrected to .design/RULES.md C13 §5 (l2-role-cards-governance.md v1.1.1)"
key_files:
  created: []
  modified:
    - ".magic/scripts/check-prerequisites.js"
    - "dev/tests/engine.js"
    - ".magic/analyze.md"
    - ".magic/roles/project-auditor.md"
patterns_established:
  - "Plan-complete predicates over Active Phases must classify by row status (terminal vs non-terminal), never by matching one literal empty-state string — the literal form is one terminal case among several, not the only one."
duration_minutes: ~
---

# Stage 22 Tasks — Field-Report Triage

**Phase:** 22
**Status:** Done
**Strategic Goal:** Close three fully-specified `Required Fix` items authored by this session's `/magic.spec` pass against three externally-submitted MAGIC-SPEC ENGINE BUG REPORTs (engine 2.1.71): `DESIGN_DEBT_PENDING`'s plan-complete predicate is structurally unreachable once any phase has ever been archived under the canonical single-table `tasks.md` template ([l2-engine-automation.md](../specifications/l2-engine-automation.md) v1.9.0 §DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate); `analyze.md`'s Mode C Ventilation mode has no textual basis to determine whether Core Invariant 6 (Depth Control) HALTs it on large repositories ([l1-engine-core.md](../specifications/l1-engine-core.md) v1.5.0 §Known Process Gaps — Mode C Depth Control Bypass Ambiguity); the Project-auditor role card cites a non-existent "anti-fabrication" invariant ([l2-role-cards-governance.md](../specifications/l2-role-cards-governance.md) v1.1.1 §2 step 5).

## Atomic Checklist

- [x] [T-22A01] `check-prerequisites.js`: recognize `## Active Phases` as complete by row status, not literal empty-marker text
- [x] [T-22B01] Regression coverage — canonical single-table `DESIGN_DEBT_PENDING` fixture
- [x] [T-22C01] `analyze.md`: add Depth Control to the Mode C bypass list + advisory checklist line
- [x] [T-22D01] `roles/project-auditor.md`: correct stale "Invariant 6" citation
- [x] [T-22T01] Full harness run + C14 sync (tagged `magic.analyze`)

## Detailed Tracking

### [T-22A01] `check-prerequisites.js`: terminal-row plan-complete predicate

- **Spec:** l2-engine-automation.md §DESIGN_DEBT_PENDING — Plan-Complete Structural Predicate; concept authority l1-session-continuity.md §Terminal-Row Recognition
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "planComplete" .magic/scripts/check-prerequisites.js` shows the predicate reading row status, not only the literal marker. Manual check: a `TASKS.md` fixture whose `## Active Phases` is a single-table with only `Done (Archived)` rows (no separate "Completed Phases" section) yields `planComplete === true`; a fixture with one `In Progress` row among otherwise-terminal rows yields `planComplete === false`; the existing literal-`*None*` fixture still yields `true` (backward compatible).
- **Handoff:** T-22B01 pins this behavior in the harness.
- **Notes:** ~line 285 today:

  ```plaintext
  BAD : const planComplete = Boolean(activePhasesMatch) && /^\*None\b/m.test(activePhasesMatch[1].trim());
  GOOD: const activeSection = activePhasesMatch ? activePhasesMatch[1].trim() : '';
        const isEmptyMarker = /^\*None\b/m.test(activeSection);
        const rows = activeSection.split(/\r?\n/).filter((l) => {
            const t = l.trim();
            return t.startsWith('|') && !/^\|\s*-+\s*\|/.test(t) && !/^\|\s*Phase\s*\|/i.test(t);
        });
        const isAllTerminal = rows.length > 0 && rows.every((l) => /`(Done|Done \(Archived\)|Cancelled)`/.test(l));
        const planComplete = Boolean(activePhasesMatch) && (isEmptyMarker || isAllTerminal);
  ```

  `rows` excludes the table header and separator lines so only data rows are tested. A section with zero table rows and no empty marker (e.g. malformed content) correctly falls through to `false` — uncertain must resolve to "cannot determine", not to "complete", per the same reasoning already governing the SH-1/SH-2 comment at this site.
- **Changes:** `planComplete` now recognizes an all-terminal-row single-table `## Active Phases` (in addition to the literal `*None*` marker) via a new row classifier (`isEmptyMarker || isAllTerminal`); the pre-fix branch was retained unmodified as one disjunct, not replaced. `.magic/scripts/check-prerequisites.js` (+15 -7 lines net). Sanity-verified with 4 fixtures (single-table all-archived, literal-marker, In-Progress-row, malformed-empty) before committing to the harness case.

### [T-22B01] Regression coverage — canonical single-table layout

- **Goal:** Verify T-22A01 against l2-engine-automation.md's stated regression requirement.
- **Method:** `node --test dev/tests/engine.js` — new case: a fixture `TASKS.md` with a single `## Active Phases` table (no separate `## Completed Phases` section) whose only rows are `Done (Archived)` must report `DESIGN_DEBT_PENDING` when the paired `PLAN.md` Backlog has ≥1 open (non-Parked) bullet — reproducing the field report's exact shape (engine 2.1.71: 24/24 phases Done, 2 open Backlog bullets, gate silent). A second assertion: the same fixture with a `Todo` or `In Progress` row present must NOT report `DESIGN_DEBT_PENDING` (plan genuinely incomplete). The existing two-section-layout fixtures (`## Active Phases` empty + `## Completed Phases` table) must continue passing unchanged — this is an additive recognition, not a replacement.
- **Status:** Done
- **Changes:** New case `check-prerequisites.js DESIGN_DEBT_PENDING fires under the canonical single-table Active Phases layout (Terminal-Row Recognition)` in `dev/tests/engine.js` — three assertions: all-archived single-table fires with correct count, a mixed table with one non-terminal row suppresses the signal, and an all-`Cancelled` table still fires. `dev/tests/engine.js` (+58 lines, new `test()` block after the Parked-marker test, same `findDebtWarning` closure pattern).

### [T-22C01] `analyze.md`: Mode C Depth Control bypass parity

- **Spec:** l1-engine-core.md §Known Process Gaps — Mode C Depth Control Bypass Ambiguity
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "Depth Control" .magic/analyze.md` shows it listed in the Mode C "Audit Policy" bypass line (~line 156) alongside the four existing entries, and in the Mode C Completion Checklist (~lines 397-420) as a non-halting advisory line. Manual check: the checklist line's wording does not use "obeyed" (which would re-imply the HALT the resolution removes).
- **Handoff:** none — self-contained textual fix, no downstream task.
- **Notes:** Two edits, both in `.magic/analyze.md`:

  ```plaintext
  BAD  (~line 156): Bypassed HALT conditions in this mode: `checksums_mismatch`, Existence Guard, `VERSION_DRIFT`, C12 Quarantine.
  GOOD (~line 156): Bypassed HALT conditions in this mode: `checksums_mismatch`, Existence Guard, `VERSION_DRIFT`, C12 Quarantine, Depth Control (Core Invariant 6 — Mode C is read-only and never pre-scan-HALTs on file count).

  BAD  (~line 420, Mode C Checklist): (no Depth Control line)
  GOOD (~line 420, Mode C Checklist): ☐ Depth Control noted (advisory only; Mode C never HALTs on file count — size is informational, not a gate)
  ```

  Confirmed during implementation that line 117 ("Apply Depth Control (Invariant 6): count source files and HALT per thresholds before scanning") sits under `### Shared Pre-flight (Modes A & B)` only — Mode C's own step list starts fresh at "1. Self-Check" and never references Shared Pre-flight, so Depth Control was never actually wired into Mode C's execution path in the first place. The contradiction was confined to the Core Invariants framing and the Mode C Checklist parity gap; no other call site needed touching.
- **Changes:** Added `Depth Control` to the Mode C Audit Policy bypass list (line 156) and a non-halting advisory checklist line (line 398, Mode C Checklist). `.magic/analyze.md` (+2 -1 lines net).

### [T-22D01] `roles/project-auditor.md`: citation correction

- **Spec:** l2-role-cards-governance.md v1.1.1 §2 step 5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "Invariant 6" .magic/roles/project-auditor.md` returns no matches. `grep -n "C13" .magic/roles/project-auditor.md` shows the corrected citation.
- **Handoff:** none — self-contained textual fix.
- **Notes:** Line 29 today:

  ```plaintext
  BAD : 5. Verify anti-fabrication (Invariant 6 from analyze.md): is each finding grounded in a concrete file/reference, not inferred?
  GOOD: 5. Verify anti-fabrication (`.design/RULES.md` C13 §5, Anti-Hallucination Audit): is each finding grounded in a concrete file/reference, not inferred?
  ```

  Mirrors the correction already applied to the deployed card's source-of-truth spec (l2-role-cards-governance.md §2 step 5) verbatim — the two must read identically.
- **Changes:** Line 29 citation corrected from "Invariant 6 from analyze.md" to `.design/RULES.md` C13 §5. `.magic/roles/project-auditor.md` (+1 -1 lines).

### [T-22T01] Full harness run + C14 sync

- **Goal:** Confirm no regressions across the full suite and sync engine metadata.
- **Method:** `node --test dev/tests/engine.js` (expect prior count + 1 new, all passing); `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze` (Track C touches a workflow-doc body; Tracks A/B/D touch scripts/role artifacts, not dotted workflow names — one tag covers the phase per Phase 20/21 precedent); `node .magic/scripts/executor.js update-engine-meta --check` (confirm no drift after).
- **Status:** Done — harness 64 → 65 (1 new, T-22B01), all passing. Engine 2.1.71 → 2.1.72 (`analyze.md`, `roles/project-auditor.md`, `scripts/check-prerequisites.js`). Post-sync `update-engine-meta --check`: no drift. Note: the planning-time estimate of "+2 new" tests was revised to "+1" during implementation — T-22B01's three assertions were bundled into a single `test()` block, matching the established one-test-per-scenario-group pattern already used by the adjacent Parked-marker test.
