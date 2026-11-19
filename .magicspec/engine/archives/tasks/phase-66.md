---
phase: 66
name: "Maintenance: The Analysis the Specification Workflow Delegates Is Governed by analyze.md Alone"
status: Done
subsystem: "skills/magicspec/workflows (spec.md), tests/engine, tests/suite"
requires:
  - "Phase 49: the router reading analyze.md directly for /magicspec analyze"
  - "DA-2 of l1-decision-autonomy (no elective wait) and the engine-snapshot contract of the constitution §1 (analyze is the writer of the snapshot)"
provides:
  - "The Project Analysis Delegation section of workflows/spec.md names analyze.md as the one rule book of a delegated analysis: its write rules apply as written (the registry repairs and the engine snapshot included), the specification workflow adds no step and no guard and writes nothing for it; Core Invariant 2 binds Explore Mode only; the graph-refresh skip and the checklist line no longer call the delegated analysis read-only; Explore Mode states that its drafts stay out of the state folder; one harness case under ten mutation entries caught; engine 3.0.150"
key_files:
  created: []
  modified:
    - "skills/magicspec/workflows/spec.md"
    - "tests/engine/routing-and-constitution.js"
    - "tests/suite/spec.md"
patterns_established:
  - "A delegation names who governs and adds nothing of its own: a guard written beside a delegation is a second rule book, and it contradicts the first the moment the first changes"
duration_minutes: ~
---

# Stage 66 Tasks — Maintenance: The Analysis the Specification Workflow Delegates Is Governed by analyze.md Alone

**Phase:** 66
**Status:** Done
**Strategic Goal:** A delegated analysis is governed by `analyze.md` alone: the specification workflow carries no guard that forbids the writes the analysis makes, no approval wait and no effort plea, and its read-only guard names Explore Mode only.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active in the ledger: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reported by an agent** as feedback note n6 while it read the specification body against the analysis body and the decision protocol; recorded as kind `docs`.
- **Release lines.** The 2.x line (`v2.1`) carries the same section (`.magic/spec.md`), so the repair is ported there (2.1.149, local commit, no push).

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-66F01] The delegated analysis is governed by analyze.md alone

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-66F01] The delegated analysis is governed by analyze.md alone

- **Spec:** l1-decision-autonomy.md §3 DA-2 (no elective wait); the engine-snapshot contract of `CONSTITUTION.md` §1 (analyze writes the snapshot); `workflows/analyze.md` Core Invariant 3 (the registry repairs it may make)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *the analysis the specification workflow delegates is governed by analyze.md alone…* in `tests/engine/routing-and-constitution.js`, written first and seen to fail on the missing governing sentence; after the repair it passes and `scripts/mutation-check.js` reports its ten entries `CAUGHT` (the added guard, the governing sentence, the pointer to Core Invariant 3, the approval wait, the thinking-partner plea, the forbidding clause, Core Invariant 2, the refresh skip, the checklist line, the Explore Mode draft statement); the full harness run alone passes.
- **Handoff:** `finalize --workflow=fix` archives the phase when the task is `Done`; the next stage is the decomposition of Phase 65.
- **Notes:** Feedback note n6 (kind `docs`, finding `SPEC_ANALYSIS_DELEGATION_CONTRADICTION`). Reproduced by reading, with named checks: `spec.md` §Project Analysis Delegation (lines 184-193 before the repair) against `analyze.md` Core Invariant 3 and its Engine Snapshot step. Re-verified on the current tree: the text was unchanged since the first commit. Confirmed causes, each tested rather than taken from the note: (1) the guard "MUST NOT modify `INDEX.md`" contradicts "follow its workflow", because `analyze.md` repairs `INDEX.md` registry fields and writes the `**Engine Version:**` field in every mode, and the constitution makes it the sole writer of that snapshot; (2) step 4's wait for an explicit approval is an elective wait outside E1, E2 and E4, and the Mode Transition section directly below already says the transition is automatic on the first concrete input; (3) step 1 ("deeply analyze") names no deliverable and is an inert effort plea; (4) step 2's "output thoughts directly to chat" asked for the reasoning to be printed — what it meant is the brainstorm's content, which the replacement says. The note's claim that current models may decline step 2 is not tested here and not relied on. Class: implementation defect — the shipped text violates DA-2 and contradicts the analysis body, whose behaviour the specifications state; the repair restores stated behaviour and adds no statement to a specification (the specification test: no observable behaviour or contract changes).
- **Changes:** `skills/magicspec/workflows/spec.md`: the section keeps its trigger intent and one rule — `analyze.md` governs the whole invocation, its write rules apply as written, this workflow adds no step and no guard and writes nothing for it; the four numbered steps are removed; Core Invariant 2 names Explore Mode as the read-only mode and points at the delegation for the analysis; the graph-refresh skip and the checklist line say that Explore Mode is read-only and that `analyze.md` runs its own refresh after a dispatch; the safe-drafting statement of the removed step 2 moved into Explore Mode as a closing paragraph, because the suite's Explore case (T17) rests on it and no other sentence stated it. `tests/engine/routing-and-constitution.js`: the one case. `tests/suite/spec.md`: T29 states that the analysis runs under its own write rules and that the Explore case keeps its drafts out of the state folder. Sibling sites: a sweep of the shipped folder for the same class (an approval wait outside the consent entries, an effort plea, a read-only guard beside a delegation) found only this section; `rule.md`'s core-amendment approval is the E4 consent entry and stays; `analyze.md` already carries its own graph refresh; `docs/spec.md` §5.1 and the specification text on Explore Mode (`l1-decision-autonomy.md`, `l2-spec-graph-memory.md`) say nothing the repair changes. Lines: develop repaired (engine 3.0.150); v2.1 present, ported (2.1.149). Checks: full harness 458 of 458 run alone, `biome` clean on the lines written (inherited drift in the file left), `pnpm run typecheck` and `pnpm run audit` report nothing.
