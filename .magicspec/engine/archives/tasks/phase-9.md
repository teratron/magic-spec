---
phase: 9
name: "DA-9 Engine Deployment (Proposal Surfaces)"
status: Done
subsystem: ".magic/ workflow bodies (spec.md, analyze.md, task.md)"
requires: []
provides:
  - "spec.md Blank Trigger / Mode Transition / Dispatch Notice carry DA-9 narrate-and-act form (no proposal-as-question wording)"
  - "analyze.md post-analyze handoff narrates [DR], pauses only on firing E3 hard-fork"
  - "task.md proposal surfaces verified DA-9-compliant with explicit cross-ref"
key_files:
  created: []
  modified:
    - ".magic/spec.md"
    - ".magic/analyze.md"
    - ".magic/task.md"
patterns_established:
  - "Firing E1-E5 gates (WI-4, T1-T3) are the only sanctioned question surfaces; all proposal/handoff steps narrate a [DR]"
  - "Deployment coverage is audit-greppable: every governed workflow body cites the invariant id (DA-9)"
duration_minutes: 15
---

# Stage 9 Tasks — DA-9 Engine Deployment (Proposal Surfaces)

**Phase:** 9
**Status:** Done
**Strategic Goal:** Deploy DA-9 (Proposal Surfaces Are Declarative, l1-decision-autonomy.md v1.1.0) into the engine workflow bodies. Rewrite the pre-C27 proposal-surface wording (Blank Trigger "propose … in the next turn … auto-pick", post-analyze "Proceed to Plan/Run? and wait for reply") into the narrate-and-act form: render the DA-3 winner as a `[DR]` the same turn, never an `AskUserQuestion` survey. Leave the legitimate firing gates (WI-4 / E5, T1-T3 / E4) intact.

## Atomic Checklist

- [x] [T-9A01] Rewrite spec.md Blank Trigger + cross-ref Mode Transition / Dispatch Notice
- [x] [T-9A02] Align analyze.md post-analyze handoff to DA-9
- [x] [T-9A03] Verify task.md proposal/handoff surfaces against DA-9
- [x] [T-9T01] Validation: C14 meta, harness, residual-wording grep, DA-9 simulation

## Detailed Tracking

### [T-9A01] Rewrite spec.md Blank Trigger + proposal cross-refs

- **Spec:** l1-decision-autonomy.md §DA-9, §5.3(b)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magic/spec.md` Blank Trigger step no longer contains "in the next turn … auto-pick" as a wait-for-input form; it instructs same-turn DA-3 `[DR]` narration. Grep `grep -nE "in the next turn|auto-pick" .magic/spec.md` returns no proposal-as-question wording (WI-4/T1-T3 gate lines unaffected). DA-9 referenced at Blank Trigger, Mode Transition, and Dispatch Notice.
- **Handoff:** T-9A02.
- **Notes:** Blank Trigger (line ~108) is the primary rewrite: "Propose 3 Creative Sparks declaratively → rank by DA-3 → narrate the winner as `[DR]` and proceed the same turn; the user's redirect is an interrupt (C25 §5), never a solicited answer; `AskUserQuestion` only for a firing E1–E5 gate." Mode Transition (~110-115) and Dispatch Notice (~144) gain a one-line DA-9 cross-ref (already C9-aligned). **PRESERVE UNCHANGED**: WI-4 three-option question (~95, E5 firing gate) and T1-T3 "Propose & Wait" + Duplication Check (~261-268, E4 firing gate). C14 after edit.
- **Changes:** spec.md Blank Trigger rewritten to same-turn DA-3 `[DR]` selection (removed "in the next turn … auto-pick" wait-form); DA-9 cross-refs added at Mode Transition and Dispatch Notice. WI-4/T1-T3 firing gates verified untouched. Residual grep `in the next turn|auto-pick` → clean.

### [T-9A02] Align analyze.md post-analyze handoff to DA-9

- **Spec:** l1-decision-autonomy.md §DA-9, §DA-6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md` Dispatch Logic step (line ~360) no longer ends with "Proceed to Plan/Run?" + "and wait for reply". Grep `grep -nE "and wait for reply|Proceed to Plan/Run\?" .magic/analyze.md` returns zero. Handoff is narrated as a `[DR]`; pause only on a genuine firing E3 hard-fork.
- **Handoff:** T-9A03.
- **Notes:** Convert the Zero-Prompt Handoff (C9) ambiguity branch to DA-6/DA-9 form: compute the next step (`/magic.task`) and narrate as `[DR]`; the sole pause condition is a firing E3 hard-fork (>1 incompatible architectural path, no objective tiebreaker), expressed as a DA-5 single-question. Auto-Dispatch surfaces (lines ~125, ~317) are already compliant — leave intact. C14 after edit.
- **Changes:** analyze.md Dispatch Logic Zero-Prompt Handoff (line 360) rewritten: removed "Proceed to Plan/Run? and wait for reply"; now narrates `[DR] Specs Stable — invoking /magic.task` and pauses only on a firing E3 hard-fork (DA-5 single question). Auto-Dispatch surfaces left intact (already compliant).

### [T-9A03] Verify task.md proposal/handoff surfaces

- **Spec:** l1-decision-autonomy.md §DA-9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -niE "and wait|propose.*\?|auto-pick|option menu|are you sure" .magic/task.md` returns no proposal-as-question wording. Auto-Plan (line ~42) and Execution Mode (~98) confirmed already narrate-and-act; add a one-line DA-9 cross-ref at the Auto-Plan touch-point if absent.
- **Handoff:** T-9T01.
- **Notes:** task.md is largely DA-aligned already (no "Go" confirm, no menu, DA-6 line present in checklist). This is a verification + minimal cross-ref task, not a rewrite. Do not manufacture changes if none are needed — record "already compliant" with grep evidence. C14 only if a file edit is made.
- **Changes:** task.md verified DA-9-compliant (Auto-Plan "no Go confirm; no menu", Execution Mode "do not ask", checklist DA-6 line). Added one-token DA-9 cross-ref to the Auto-Plan touch-point for uniform deployment coverage (audit-grep across all 3 bodies now hits DA-9). Residual grep `and wait|propose.*\?|auto-pick|option menu|are you sure` → clean.

### [T-9T01] Validation Task

- **Goal:** Verify DA-9 deployment across all three workflow bodies against l1-decision-autonomy.md v1.1.0.
- **Method:** (1) `node .magic/scripts/executor.js update-engine-meta` — version bump + checksum regen + skill re-projection (C14). (2) `node dev/tests/engine.js` → 12/12 pass. (3) Residual-wording grep across `.magic/spec.md`, `.magic/task.md`, `.magic/analyze.md` for proposal-as-question forms ("in the next turn … auto-pick", "and wait for reply", "Proceed to … ?") → zero outside firing E1–E5 gates. (4) DA-9 simulation (cognitive, per l1-decision-autonomy §5.6): a Blank-Trigger `/magic.spec` resolves scope via DA-3 `[DR]` auto-pick, NOT an `AskUserQuestion`; a firing E1 fork still produces a DA-5 question. (5) `node .magic/scripts/executor.js update-engine-meta --check` passes.
- **Status:** Done
- **Changes:** C14 → engine 2.1.37 → 2.1.38 (65 files, checksums regenerated, skills re-projected). Harness 12/12 pass. Residual grep clean across all 3 bodies (sole `Proceed to Plan/Run?` hit is the negation phrase in analyze.md:360, not a question). Firing gates WI-4 (spec.md:95) + T1-T3 (spec.md:261) intact. DA-9 coverage: spec.md ×3, analyze.md ×1, task.md ×1. update-engine-meta --check: no drift. validate-hardlinks: all linked.
