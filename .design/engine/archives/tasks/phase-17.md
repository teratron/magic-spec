---
phase: 17
name: "Scan Input Hygiene"
status: Done
subsystem: ".magic/scripts, .magic/scripts/lib, .magic"
requires: []
provides:
  - "One shared strip-before-match helper (scan-hygiene.js) backing both compliant script scans"
  - "Registry cross-reference no longer invents specifications from quoted or comma-merged prose"
  - "Link-integrity sweep excludes template sources from resolution"
  - "Reference containment scan states the mention/use boundary once, not per class"
key_files:
  created:
    - .magic/scripts/lib/scan-hygiene.js
  modified:
    - .magic/scripts/lib/phase-archiver.js
    - .magic/scripts/update-state.js
    - .magic/scripts/check-prerequisites.js
    - .magic/analyze.md
    - dev/tests/engine.js
    - .design/engine/specifications/l1-scan-input-hygiene.md
patterns_established:
  - "Fences stripped before spans: a stray backtick inside a fence must not swallow trailing content"
  - "Blank-in-place, never delete: stripping preserves line count so findings stay addressable"
  - "Exclude by file role (template source), not by heuristics on the target string"
  - "A boundary invariant states its precondition once on the class list, not once per class"
duration_minutes: ~
---

# Stage 17 Tasks — Scan Input Hygiene

**Phase:** 17
**Status:** Done
**Strategic Goal:** The strip step exists once and every scan that needs it uses that one. A token quoted in markdown stops being read as a token in force — across both script scans and both cognitive scans — and the registry cross-reference stops inventing specifications out of prose that merely mentions a path.

## Atomic Checklist

- [x] [T-17A01] Extract the strip step into one shared helper (SH-2, SH-5)
- [x] [T-17A02] Re-point both existing strip copies at the helper
- [x] [T-17B01] Bind the registry cross-reference (SH-1, SH-4)
- [x] [T-17C01] Exclude template sources from the link-integrity check (SH-3)
- [x] [T-17C02] State SH-1 once in the containment match-class preamble
- [x] [T-17T01] Harness coverage — helper contract and registry cross-reference
- [x] [T-17T02] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-17A01] Extract the strip step into one shared helper (SH-2, SH-5)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-2, SH-5), §5.1
- **Status:** Done
- **Changes:** New `.magic/scripts/lib/scan-hygiene.js` exporting `stripQuoted()` — removes fenced blocks (triple-backtick and tilde) then inline spans, blanking non-newline characters so line count is preserved.
- **Assignment:** Agent
- **Track:** A (shared helper)
- **Files:** `.magic/scripts/lib/scan-hygiene.js`
- **Verify:** Satisfied — `stripQuoted()` on a fixture with a fenced and a span-quoted checkbox returns equal line count and no surviving `- [ ]`.
- **Notes:** Char classes match the two original callers exactly (`[\s\S]*?` for fences, `[^\`]*` for spans, both newline-permissive) — a first draft narrowed inline spans to single-line and was corrected before it could silently change behavior at the two call sites depending on it. Fences are stripped before spans, matching §5.1's ordering rationale.

### [T-17A02] Re-point both existing strip copies at the helper

- **Spec:** l1-scan-input-hygiene.md §3 (SH-5), §6 note 1
- **Status:** Done
- **Changes:** `phase-archiver.js`'s `allChecked()` and `update-state.js`'s `readPhaseChecklist()` both now call `stripQuoted()`; their local regex pairs are gone.
- **Assignment:** Agent
- **Track:** A (shared helper)
- **Files:** `.magic/scripts/lib/phase-archiver.js`, `.magic/scripts/update-state.js`
- **Verify:** Satisfied — `grep -rn 'replace(/\`\`\`' .magic/scripts/` returns zero hits outside `scan-hygiene.js`; full harness 43/43 unchanged before this task's own new cases were added.
- **Notes:** Confirmed against the actual archival-eligibility fixtures (not just synthetic input) that old and new stripping agree byte-for-byte before wiring the helper in — the swap was a no-behavior-change refactor, and the pre-existing tests passing unchanged is what proved it, exactly as planned.

### [T-17B01] Bind the registry cross-reference (SH-1, SH-4)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-1, SH-4), §6 note 2
- **Status:** Done
- **Changes:** `check-prerequisites.js` now strips `PLAN.md` via the shared helper before both the `ORPHANED_SPEC` substring check and the `REGISTRY_MISMATCH` extraction, and narrows the capture to `[a-z0-9][a-z0-9-]*\.md` (the filename grammar the naming-convention check already enforces) in place of the punctuation-bounded `[^)]*\.md`.
- **Assignment:** Agent
- **Track:** B (script scan)
- **Files:** `.magic/scripts/check-prerequisites.js`
- **Verify:** Satisfied — a fixture with quoted placeholder paths and an unquoted two-file mention produces zero mismatches for the quoted tokens and two separately-bounded `REGISTRY_MISMATCH` findings (`a.md`, `b.md`) for the genuine unquoted one, none merged.
- **Handoff:** Required T-17A01. Gated T-17T01's registry case.
- **Notes:** Two independent defects compounded in one line, confirmed by construction: with only SH-1 (stripping) applied, the specific historical instance — backtick-quoted placeholders — was already fixed, since each was individually span-wrapped. SH-4 (bounded capture) matters for the case stripping does not touch: genuine unquoted, comma-separated mentions, which the old pattern would still have merged into one finding spanning multiple filenames. Both fixes are in the same commit because the spec compounds them; the harness case exercises both in one fixture rather than two, so a regression in either shows up.

### [T-17C01] Exclude template sources from the link-integrity check (SH-3)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-3), §5.2, §6 note 3
- **Status:** Done
- **Changes:** `.magic/analyze.md`'s Link Integrity bullet broadened from `.design/`-only to the full shipped tree (`.design/`, `.magic/`, `workflows/`, `skills/`, `rules/`) and gained an explicit `.magic/templates/` resolution exclusion, scoped by file role and naming SH-3.
- **Assignment:** Agent
- **Track:** C (cognitive scans, prose)
- **Files:** `.magic/analyze.md`
- **Verify:** Satisfied — the bullet states both the widened scope and the exclusion with its rationale.
- **Notes:** The literal pre-existing text scoped the check to `.design/` only, which would never have reached `.magic/templates/` in the first place — the five false positives found during the prior `/magic.analyze` ventilation came from a broader ad-hoc scan performed in the spirit of a full audit, not from this documented check as literally scoped. Broadening the scope to match actual ventilation practice was necessary before the SH-3 exclusion had anything to exempt.

### [T-17C02] State SH-1 once in the containment match-class preamble

- **Spec:** l1-scan-input-hygiene.md §3 (SH-1), §5.3, §6 note 4
- **Status:** Done
- **Changes:** New precondition bullet at the top of the containment scan's match-class list in `.magic/analyze.md`, stating SH-1 for the markdown case and explicitly naming what it does NOT reach (string-literal fixture data, plain-prose examples) per §5.3, directing those to the self-containment test instead.
- **Assignment:** Agent
- **Track:** C (cognitive scans, prose)
- **Files:** `.magic/analyze.md`
- **Verify:** Satisfied — the precondition is stated once, before the match-class list, not per class; `node --test dev/tests/engine.js` keeps passing the pre-existing RC-2.1 shipped-text case, which reads this same file for unrelated patterns.
- **Notes:** There was no prior local carve-out to replace *in this file* — `l1-sdd-reference-containment.md`'s RC-9 "illustrative examples" clause is a related but distinct carve-out (about the containment spec's own BAD:/GOOD: examples, not about auditing product files) and was left untouched, correctly out of this task's scope. §5.3's boundary is stated explicitly so the addition cannot be misread as claiming the strip step resolves fixture-literal or prose-example cases, which it structurally cannot.

### [T-17T01] Harness coverage — helper contract and registry cross-reference

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l1-scan-input-hygiene.md §4
- **Status:** Done
- **Changes:** Three cases added: `stripQuoted()` line-count preservation with blockquote/HTML-comment exemption, fence-before-span ordering, and the registry cross-reference's compound SH-1/SH-4 fix.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** Satisfied — all three pass; two initial assertion mistakes (asserting zero `REGISTRY_MISMATCH` when two bounded, correct ones should fire; asserting no `- [ ]` survives anywhere in output when blockquote/comment lines are supposed to keep it) were caught by the first run and corrected in the same task — both were test-assertion defects, not implementation defects.
- **Handoff:** Required T-17A01 and T-17B01.
- **Notes:** The corrected registry case asserts three things together: the exact bounded set of genuine findings, that no quoted-placeholder fragment appears in any finding, and that the real registered spec isn't falsely orphaned — asserting only one of these would have passed even with a partial fix, the same shape as prior phases' "assert both halves" lesson.

### [T-17T02] Validation — C14 bump, full harness, meta parity

- **Spec:** l1-scan-input-hygiene.md §4
- **Status:** Done
- **Changes:** Engine 2.1.64 → 2.1.65; checksums regenerated over 67 files (new `scan-hygiene.js` included). `l1-scan-input-hygiene.md` 1.0.0 → 1.1.0: §4's enforcement-surface table updated from mixed compliance to fully Compliant, with a new row for the phase-checklist reader found during T-17A02. `INDEX.md` version synced to match.
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`, `.design/engine/specifications/l1-scan-input-hygiene.md`, `.design/engine/INDEX.md`
- **Verify:** Satisfied — all four criteria: `update-engine-meta` bumped to 2.1.65; harness 46/46; `update-engine-meta --check` no drift; `check-prerequisites --verify-headers` returns `"ok": true` with empty `warnings`.
- **Notes:** Amending the spec's own compliance table as part of this run task (rather than deferring to a future `/magic.spec` pass) was a judgment call: it is a factual-state update reflecting completed work, not a new requirement, so it did not trigger the Amendment rule's Stable→RFC reversion — the same treatment prior phases gave "verified against engine X.Y.Z" annotations. Leaving the table claiming non-compliance after the fix would have been the exact class of staleness the table exists to prevent. No `rules/` or `workflows/` file touched — [C-001] does not apply.
