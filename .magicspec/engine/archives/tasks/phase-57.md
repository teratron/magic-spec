---
phase: 57
name: "Maintenance: One Runtime per Invocation"
status: Done
subsystem: "skills/magicspec/scripts (executor.js, lib/diagnostics.js), scripts (executor.js, sync.js), tests"
requires:
  - "Phase 56: the floor run of the harness on Node 18 that found the defect"
provides:
  - "Every child Node process of the executor, the diagnostics recheck, the maintenance wrapper and the maintenance pipeline starts with the runtime that started its parent (process.execPath)"
  - "Two harness cases (behavioural with no node on PATH; the four sites pinned), four mutation entries all caught; the same repair on the 2.x line (v2.1, engine 2.1.147)"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/executor.js"
    - "skills/magicspec/scripts/lib/diagnostics.js"
    - "scripts/executor.js"
    - "scripts/sync.js"
    - "tests/engine.js"
patterns_established:
  - "A child process of the engine is started with process.execPath, so one invocation runs on one runtime and the runtime flags chosen for the parent apply to the child"
duration_minutes: ~
---

# Stage 57 Tasks — Maintenance: One Runtime per Invocation

**Phase:** 57
**Status:** Done
**Strategic Goal:** A child Node process of the engine runs on the runtime that started its parent, never on whichever `node` the path search finds first.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). -->

- [x] [T-57F01] Fix: children are started with the running runtime, not by the name `node`

## Detailed Tracking

### [T-57F01] Fix: children are started with the running runtime, not by the name `node`

- **Spec:** l2-engine-automation.md §executor (the statement added as 1.32.1 — an implementer reading only the specifications would start a child by name again)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="starts the script with the runtime|no script starts a child Node" tests/engine.js` passes, and fails with each repaired line reverted (`scripts/mutation-check.js`: 4 entries CAUGHT); the executor run with a PATH that holds no `node` exits 0.
- **Notes:** Class: implementation defect (the specification did not state the rule, so it gained one sentence). Reported cause (feedback note n2) confirmed and reproduced: `spawn node ENOENT` with no `node` on PATH; under `npx node@18` on Windows the child recorded Node 24. Sibling sites searched over the shipped folder and the maintenance tooling: four, all repaired (`executor.js`, `lib/diagnostics.js`, `scripts/executor.js`, `scripts/sync.js`); the hook script runs `node` by design (it is a shell script the user's git runs). The 2.x line has the same four sites and was repaired the same way (`v2.1`, commit 6813af4, engine 2.1.147, one case; its own two unrelated failures in a fresh worktree are the generated rule file that a fresh clone lacks).
- **Changes:** `skills/magicspec/scripts/executor.js` (`command = process.execPath`, with the reason in a comment), `skills/magicspec/scripts/lib/diagnostics.js` (`execFileSync(process.execPath, …)`), `scripts/executor.js` (`spawn(process.execPath, …)`), `scripts/sync.js` (`execFileSync(process.execPath, [script, ...args])`, which also drops the hand-quoted command line); two cases in `tests/engine.js` (red before the change, green after); C14 run; `biome ci`, the type check and `fallow dead-code` clean. Harness 438 of 438 on Node 24; on Node 18.20.8 432 of 438 with the two Windows `npx` git-hook cases failing, the five cases of Phase 56's floor run that were the engine's own (the feedback note and the memory-index warning among them) now passing. Feedback note n2 discarded.
