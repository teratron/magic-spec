---
phase: 29
name: "Concept-Only Spec Classification"
status: Done
subsystem: ".magic"
requires: []
provides:
  - "l1-engine-core.md 1.7.1: Concept-Only Classification Required Fix re-targeted from a mis-analogized analyze-coverage.js EXEMPT extension to the real mechanism — .magic/analyze.md's cognitive Bare-L1-without-L2 advisory"
  - "l2-engine-automation.md 1.12.0: reverted the 1.11.0 concept-only extension (wrong file — that section covers an unrelated file-coverage axis)"
  - ".magic/analyze.md: Advisory Report Categories, Spec Quality — Bare L1 without L2 children now skips a spec whose header declares **Concept-Only:** true"
  - "engine 2.1.84 -> 2.1.86 (2.1.85: generate-context.js trailing-newline fix, ad hoc user request; 2.1.86: this phase's analyze.md change)"
key_files:
  created: []
  modified:
    - ".design/engine/specifications/l1-engine-core.md"
    - ".design/engine/specifications/l2-engine-automation.md"
    - ".magic/analyze.md"
patterns_established:
  - "Two scripts can both be named 'coverage' and compute unrelated axes (analyze-coverage.js: project source files vs. spec references; the 'Bare L1 without L2 children' advisory: specs vs. specs, purely cognitive, no script at all) — verify which mechanism a Required Fix actually targets by reading the file, not by matching vocabulary."
  - "A marker meant to suppress an advisory that only ever fires in one branch needs no explicit 'clear' step — if the branch condition already excludes the other case, the marker is naturally consulted only where it matters."
duration_minutes: ~
---

# Stage 29 Tasks — Concept-Only Spec Classification

**Phase:** 29
**Status:** Done
**Strategic Goal:** Implement the `concept-only` marker specified in [l1-engine-core.md](../specifications/l1-engine-core.md) (§Known Process Gaps — Concept-Only Classification): a Stable L1 spec with no currently-planned L2 implementation can be excluded from the "Bare L1 without L2 children" advisory without blocking anything, so the advisory can distinguish a deliberate design-library entry from genuine neglect.

## Atomic Checklist

- [x] [T-29S01] Correct the Required Fix target discovered during Execute
- [-] [T-29A01] ~~Concept-only exclusion in analyze-coverage.js's coverage-gap advisory~~ — Cancelled, wrong file
- [-] [T-29A02] ~~Precedence guard in analyze-coverage.js~~ — Cancelled, moot under the corrected design
- [x] [T-29B01] Advisory Report gains the concept-only skip
- [x] [T-29T01] Verification
- [x] [T-29T02] C14 bump and engine integrity verification

## Detailed Tracking

### [T-29S01] Correct the Required Fix target discovered during Execute

- **Spec:** l1-engine-core.md §Known Process Gaps — Concept-Only Classification; l2-engine-automation.md §Coverage Denominator Scope
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l1-engine-core.md`'s Required Fix names `.magic/analyze.md` §Advisory Report Categories directly, with no remaining reference to `analyze-coverage.js`/`summary.conceptOnly`. `l2-engine-automation.md` no longer contains the "Concept-only spec extension" block. Both `INDEX.md` rows match file headers; `check-prerequisites --verify-headers` clean.
- **Handoff:** Gates T-29B01 — the real fix cannot be written correctly until the spec names the right file.
- **Changes:** `l1-engine-core.md` 1.7.0 → 1.7.1 — Concept-Only Classification's Required Fix rewritten to target `.magic/analyze.md` directly; the "auto-revert" framing dropped in favor of the simpler true mechanism (the advisory never fires once a real L2 child exists, so the marker is consulted only in the one branch where it matters — no persisted state to clear). `l2-engine-automation.md` 1.11.0 → 1.12.0 — reverted the 1.11.0 addition in full; `INDEX.md` rows synced for both.
- **Notes:** Starting T-29A01, reading `analyze-coverage.js` end to end (Pre-read Requirement) surfaced that the script classifies **project source files** against spec Canonical References (EXTRACTED/INFERRED/AMBIGUOUS/UNCOVERED/EXEMPT) — an axis with no notion of "does this spec have a child spec" at all. A grep across `.magic/` for the advisory's actual wording ("Bare L1 without L2 children") found it in `.magic/analyze.md` §Advisory Report Categories — a cognitive check the agent performs by reading `INDEX.md`, never a scripted JSON field. The 1.11.0 spec text had reasoned by vocabulary analogy ("EXEMPT already exists for a coverage concept, so extend EXEMPT") rather than by reading the actual advisory's implementation — exactly the C13 Primary Source Principle violation the constitution warns against. Corrected before writing any code against the wrong target, per SDD-First (spec before code) — this is a "Specify" task ahead of the "B" implementation task, same shape as Phase 28's T-28A01/A02.

### [T-29A01] ~~Concept-only exclusion in analyze-coverage.js's coverage-gap advisory~~

- **Status:** Cancelled
- **Notes:** Based on a mis-targeted spec (see T-29S01). `analyze-coverage.js` has no "Stable L1 without L2 child" concept to extend — its `EXEMPT` classification governs an unrelated axis (source-file coverage). No code was written against this task before the error was found.

### [T-29A02] ~~Precedence guard — a resolvable L2 child always overrides a stale marker~~

- **Status:** Cancelled
- **Notes:** Moot under the corrected design, not merely wrong-file: the "Bare L1 without L2 children" advisory only ever fires in the branch where no L2 child exists, so there is no scenario where a stale marker could wrongly suppress a real gap — the advisory's own precondition already excludes that case. No separate precedence logic is needed once the mechanism is understood correctly.

### [T-29B01] Advisory Report gains the concept-only skip

- **Spec:** l1-engine-core.md §Known Process Gaps — Concept-Only Classification (corrected by T-29S01)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.magic/analyze.md` §Advisory Report Categories, Spec Quality, "Bare L1 without L2 children" line explicitly skips a spec whose header declares `**Concept-Only:** true`, cross-referencing `l1-engine-core.md` §Known Process Gaps. `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` returns `ok: true`.
- **Handoff:** Gates T-29T02 (C14 bump).
- **Changes:** `.magic/analyze.md` §Advisory Report Categories — appended to the "Bare L1 without L2 children" bullet: "Skip a spec whose header declares `**Concept-Only:** true` (`l1-engine-core.md` §Known Process Gaps — Concept-Only Classification) — a deliberate design-library entry, not a coverage gap." One-line instruction change; no script touched.
- **Notes:** Instruction Diff Review (`@role:prompt-engineer`, run.md §3.4b — `.magic/analyze.md` is a workflow body) self-checked across the six PQ dimensions: no contradiction with neighboring bullets, unambiguous marker name, consistent tone, minimal cognitive-load addition, correct cross-reference, coherent in context. PASS, no rewrites.

### [T-29T01] Verification

- **Spec:** l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** No automated harness case added — this is a cognitive advisory instruction with no scriptable output to assert against (unlike T-29A01/A02's cancelled script-level plan). Verified structurally instead: `grep` confirms the new sentence is present in `.magic/analyze.md` exactly once, the cross-referenced section (`l1-engine-core.md` §Known Process Gaps — Concept-Only Classification) exists, and `check-prerequisites --verify-headers` reports `ok: true` with no `VERSION_DRIFT`/`STATUS_DRIFT` across all three touched files.
- **Handoff:** Precedes T-29T02.
- **Notes:** Matches this repository's own precedent for prior pure-text `.magic/analyze.md` amendments (e.g. the Mode C Depth Control Bypass fix, Known Process Gaps) — a doc-only cognitive-instruction change is verified by structural/textual inspection, not a new `dev/tests/engine.js` case, since there is no deterministic script output to pin.

### [T-29T02] C14 bump and engine integrity verification

- **Spec:** RULES.md C14
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze` completes; `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` returns `ok: true`.
- **Handoff:** Phase close.
- **Changes:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze` (tagged — `.magic/analyze.md` is a workflow body) bumped engine 2.1.85 → 2.1.86, regenerated 14 skill wrappers, synced the dev-repo Engine-Version snapshot, regenerated `.magic/.checksums` over 71 files. `check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`, zero warnings.
- **Notes:** Engine was already at 2.1.85 entering this phase from an unrelated ad hoc fix earlier in the same session (`generate-context.js`'s double-trailing-newline bug, user-directed, untracked by any phase — see root `CHANGELOG.md`/git history, not this SDD layer). This task's own bump is 2.1.85 → 2.1.86, isolated to `analyze.md`.

## Validation Coverage

No `dev/tests/engine.js` case added (see T-29T01) — the shipped change is a cognitive workflow instruction with no deterministic script output. Coverage is structural (cross-reference resolution, header parity) rather than harness-based, consistent with prior doc-only `.magic/analyze.md` amendments in this workspace's history.
