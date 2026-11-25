---
phase: 72
name: "Maintenance: The Reverse Command, Experimental Refinement of Any Engine Mechanic"
status: Done
subsystem: "skills/magicspec-dev, .agents/workflows/magicspec-dev, docs, tests/engine"
requires:
  - "Phase 51: the maintenance set, its router and its fix body; Phase 57: one runtime per invocation"
  - "The specifications: l1-reverse-command 1.0.0 and l1-command-surface 2.4.0, Stable at registry 1.99.0, plan 1.86.0; constitution 1.25.0 (C11)"
provides:
  - "/magicspec-dev reverse: an area of the engine perfected by experiment (RV-1 to RV-14); router of six commands; command entry; docs; constitution C11 and its shipped template; harness 480"
key_files:
  created:
    - "skills/magicspec-dev/workflows/reverse.md"
    - ".magicspec/engine/specifications/l1-reverse-command.md"
  modified:
    - "skills/magicspec-dev/SKILL.md, skills/magicspec-dev/workflows/init.md"
    - "docs/development.md, docs/distribution.md, CHANGELOG.md"
    - ".magicspec/RULES.md, skills/magicspec/templates/rules.md"
    - "tests/engine/routing-and-constitution.js, tests/engine/input-pass.js"
patterns_established:
  - "A research method that worked once by hand is recorded as a maintenance command with its safeguards as invariants, each cited by the body and pinned by one harness case"
duration_minutes: 20
---

# Stage 72 Tasks — Maintenance: The Reverse Command

**Phase:** 72
**Status:** Done
**Strategic Goal:** `/magicspec-dev reverse` runs: a person names an area of the engine, a goal and optionally references, and the command perfects the area by experiment under the invariants RV-1 to RV-14, ending with a report and a specification input.

## Atomic Checklist

- [x] [T-72W01] The workflow body `skills/magicspec-dev/workflows/reverse.md`
- [x] [T-72W02] The router row, the command entry and the two documents
- [x] [T-72H01] The harness: the six-command set and the body's invariants
- [x] [T-72S01] The specification as built and the records
- [x] [T-72T01] Validation: harness, static checks, integrity

## Detailed Tracking

### [T-72W01] The workflow body

- **Spec:** l1-reverse-command.md §3 (RV-1 to RV-14), §5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec-dev/workflows/reverse.md` exists; it has a `**Command:**` line, one `**Input Pass**:` line before `## Arguments`, the seven stages of §5.2 in order, a section per invariant group, the study file template, the agent prompt rules, the stop list of RV-12 and a completion checklist; each of RV-1 to RV-14 is cited at least once (`grep -o "RV-[0-9]*"` lists 14 distinct)
- **Handoff:** T-72W02 and T-72H01.
- **Notes:** The body is the realization; it states the method once, in imperative steps, and names no reference product. It never writes an engine file.
- **Changes:** skills/magicspec-dev/workflows/reverse.md: command, input pass, arguments with resume, ten core invariants citing RV-1 to RV-14, the study folder and study.md, the seven stages, the agent rules, the loss table with attribution, the gate and the closed stop list, the checklist; no reference product named

### [T-72W02] The router row, the command entry and the documents

- **Spec:** l1-command-surface.md CS-15; l1-reverse-command.md §6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec-dev/SKILL.md` lists six commands in its table, its description names `reverse` and it says "six commands"; `node scripts/init/project-dev-skill.js` writes `.agents/workflows/magicspec-dev/reverse.md`; `docs/development.md` has a `reverse` row and `docs/distribution.md` lists the six
- **Handoff:** T-72H01.
- **Notes:** The projection writes only entries and the folder link; run it, not the full `init` (a bare `init` removes managed links).
- **Changes:** router: six commands, the reverse row and description (808 chars); the projection wrote .agents/workflows/magicspec-dev/reverse.md (its 'link leads elsewhere' line is a drive-letter case difference); docs/development.md row and docs/distribution.md list; the dev init body's stale 'four command entries' fixed

### [T-72H01] The harness

- **Spec:** l1-command-surface.md CS-15; l1-reverse-command.md §3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the maintenance-router case expects six commands; the C11 case and the distribution sentence expect the new set; the input-pass placement table holds `reverse.md`; a new case pins that the body states criteria before the first agent, the orchestrator never playing an agent, the held-out gate case, results saved on arrival, the closed stop list and that it changes no engine file; those cases pass
- **Handoff:** T-72T01.
- **Notes:** Pin sentences the agent obeys, as neighbouring cases do.
- **Changes:** routing-and-constitution: six-command router, C11 and distribution sentences, a new case pinning reverse.md (nine sentences, seven stages in order, 14 invariants); input-pass placement lists reverse.md; 17 related cases pass; formatted only the lines written (both files drift from the formatter at HEAD)

### [T-72S01] The specification as built and the records

- **Spec:** l1-reverse-command.md §6; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a requirement changed while building is patched in l1-reverse-command with a history row, or no change is recorded as such; `check-prerequisites --verify-headers` returns ok with no drift of headers; the root CHANGELOG `[Unreleased]` names the command
- **Handoff:** T-72T01.
- **Notes:** `l2-test-suite.md` gets a patch row for the new case.
- **Changes:** l1-reverse-command unchanged by the build (no requirement changed); l2-test-suite 1.48.7; registry 1.99.1; root CHANGELOG Added entry

### [T-72T01] Validation

- **Spec:** CLAUDE.md §3.2 and C14
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` passes in full (counters saved); biome on the changed `*.js` and `*.json` reports nothing on lines written; `fallow audit` reports no introduced issue; `update-engine-meta --check` reports no change
- **Handoff:** none.
- **Notes:** The full harness runs in the background.
- **Changes:** full harness 480 of 480; fallow audit no issues in 23 changed files; biome: only the lines written were formatted, both test files drift at HEAD; update-engine-meta --check clean
