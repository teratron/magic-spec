---
phase: 16
name: "Documentation Parity & Scaffold Boundary"
status: Done
subsystem: ".magic, rules, dev/tests"
requires: []
provides:
  - "init.md describes what init.js actually produces, on all three claim surfaces"
  - "Cognitive suite no longer asserts the STATE.md bootstrap claim it inherited"
  - "Ventilation carries a structural coupling check, not only a token scan"
  - "Ambient agent rules state the scaffold framing and the removal test"
key_files:
  created: []
  modified:
    - .magic/init.md
    - .magic/analyze.md
    - rules/magic.md
    - dev/tests/suite.md
patterns_established:
  - "A claim about when an artifact appears is bound like a claim about whether it appears"
  - "Correcting a document means correcting the tests that assert its old wording, in the same pass"
  - "Hardlink-touching edits verify by hash, never by editor exit code"
duration_minutes: ~
---

# Stage 16 Tasks — Documentation Parity & Scaffold Boundary

**Phase:** 16
**Status:** Done
**Strategic Goal:** Every `init.md` surface that claims what `init` produces matches what `init.js` actually produces — including the three cognitive-suite scenarios that bake the false claim into their own expected outcomes — and the SDD gains a detection surface for structural coupling, the one containment failure no token scan can see.

## Atomic Checklist

- [x] [T-16A01] Correct the `STATE.md` bootstrap claim on every `init.md` surface (WI-10)
- [x] [T-16A02] Correct the same claim in the cognitive suite's expected outcomes (WI-10)
- [x] [T-16B01] Add the RC-12 scaffold-removal check to ventilation
- [x] [T-16B02] State the scaffold framing in the ambient agent rules (RC-12)
- [x] [T-16T01] Validation — C14 bump, hardlink parity, harness

## Detailed Tracking

### [T-16A01] Correct the `STATE.md` bootstrap claim on every `init.md` surface (WI-10)

- **Spec:** l1-workspace-intent-routing.md §3 WI-10 (v1.1.0)
- **Status:** Done
- **Changes:** Step 2 now lists what `init.js` writes and states that `STATE.md` is bootstrapped lazily, with the reason; Step 3's artifact count replaced by a reference to that list plus an explicit "absence is expected"; the diagram entry annotated; the WI-10 note broadened from the diagram alone to all three surfaces.
- **Assignment:** Agent
- **Track:** A (documentation parity)
- **Files:** `.magic/init.md`
- **Verify:** Satisfied — the three surviving `STATE.md` mentions all state that `init` does **not** create it. Cross-checked against the code: `init.js` has four `writeFileSync` calls (`workspace.json`, global `INDEX.md`, `RULES.md`, workspace `INDEX.md`), none of them `STATE.md`.
- **Handoff:** Gated T-16A02.
- **Notes:** The rejected alternative — making `init.js` create the file eagerly to match the old wording — was not taken: `update-state.js` already owns template instantiation, so duplicating it would recreate the exact doc/code drift mechanism this invariant exists to close, and SC-2 already guarantees the file exists by the end of the first mutating command. The Step 3 wording deliberately drops the artifact *count*: "all 6" was the brittle part, and replacing it with "all 5" would only reset the same trap.

### [T-16A02] Correct the same claim in the cognitive suite's expected outcomes (WI-10)

- **Spec:** l1-workspace-intent-routing.md §1 (v1.1.0), third field report
- **Status:** Done
- **Changes:** T01, T02, and T58 expected outcomes now name the artifacts `init` creates and state that `STATE.md` is not among them; T01's `Guards tested` line reframed from an artifact count to the parity invariant.
- **Assignment:** Agent
- **Track:** A (documentation parity)
- **Files:** `dev/tests/suite.md`
- **Verify:** Satisfied — no scenario asserts "all 6 artifacts" or "including `STATE.md`"; all three now match the corrected `init.md`.
- **Notes:** These scenarios are evaluated cognitively against the documented contract rather than by executing `init.js`, so they could never have caught the divergence — their own expected outcome encoded it. Correcting `init.md` alone would have left the suite asserting a fact its source of truth no longer supports, which is worse than the previous consistent-but-wrong state. Suite version and test count unchanged: expected-outcome text, not new scenarios.

### [T-16B01] Add the RC-12 scaffold-removal check to ventilation

- **Spec:** l1-sdd-reference-containment.md §4.4, §5 note 6 (v1.4.0)
- **Status:** Done
- **Changes:** New Mode C step 6a with the five-point inspection, consumer-only scope, pre-commit-hook exemption, and the `→ /magic.task {ws}` remediation path; `Scaffold Coupling` row added to the Findings Schema; a line added to both Completion Checklists.
- **Assignment:** Agent
- **Track:** B (scaffold boundary)
- **Files:** `.magic/analyze.md`
- **Verify:** Satisfied — `SDD_SCAFFOLD_COUPLING` appears in the step body, the Findings Schema, and both checklists; all five inspection points and both carve-outs are present in the shipped text.
- **Notes:** Numbered 6a rather than renumbering steps 7-15: the surrounding steps are cross-referenced by number elsewhere in the file, and a renumber would silently invalidate those pointers for a cosmetic gain. Modeled on the adjacent leak scan — same advisory severity, same read-only contract, same remediation owner. Severity is described as higher (coupling can stop a build; a leak only dirties an artifact) without changing who repairs it. Cognitive check, no script: the engine knows no consumer's build command, so an actual removal rehearsal cannot live inside a read-only audit.

### [T-16B02] State the scaffold framing in the ambient agent rules (RC-12)

- **Spec:** l1-sdd-reference-containment.md §5 note 6 (v1.4.0)
- **Status:** Done
- **Changes:** §6 retitled to *SDD Containment*, opening with the scaffolding framing and the two dimensions; new **Structural Rule** subsection with the forbidden integration points, the install-by-unpacking constraint, and the pre-commit-hook exemption; the existing rule retitled **Reference Rule**; Enforcement's audit-time bullet extended with the coupling check.
- **Assignment:** Agent
- **Track:** B (scaffold boundary)
- **Files:** `rules/magic.md`, `.agents/rules/magic.md`
- **Verify:** Satisfied — `Get-FileHash` returns the same digest for both paths (`20EE7942…`) and `fsutil hardlink list` reports both; `validate-hardlinks` passes with the rules group linked.
- **Notes:** [C-001] fired as expected — the edit delinked the twin, which had to be removed and re-linked, then verified by hash. A leftover duplicate `### Rule` heading from the retitling was caught on read-back and removed; this is why the post-edit verification step reads the result rather than trusting the edit. `rules/` sits outside C14 checksum tracking, so this file alone would not have bumped the engine version — T-16B01's `.magic/` edit carried it.

### [T-16T01] Validation — C14 bump, hardlink parity, harness

- **Spec:** l2-test-suite.md §Shipped-text contract coverage
- **Status:** Done
- **Changes:** Engine 2.1.63 → 2.1.64; checksums regenerated over 66 files.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** Satisfied — all four criteria: `update-engine-meta` bumped to 2.1.64; `validate-hardlinks` reports zero drift; harness 43/43, including the shipped-text assertions that read both files this phase rewrote; `update-engine-meta --check` reports no drift.
- **Notes:** The shipped-text cases were the real risk here: this phase changes no code, but those assertions read `rules/magic.md` and `.magic/analyze.md` as the implementation of a cognitive contract, so a careless rewrite could have failed a test with no code change behind it. They passed unmodified — the notation-independent patterns they pin were left intact by the restructuring.
