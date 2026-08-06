---
phase: 17
name: "Scan Input Hygiene"
status: Todo
subsystem: ".magic/scripts, .magic/scripts/lib, .magic"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 17 Tasks — Scan Input Hygiene

**Phase:** 17
**Status:** Todo
**Strategic Goal:** The strip step exists once and every scan that needs it uses that one. A token quoted in markdown stops being read as a token in force — across both script scans and both cognitive scans — and the registry cross-reference stops inventing specifications out of prose that merely mentions a path.

## Atomic Checklist

- [ ] [T-17A01] Extract the strip step into one shared helper (SH-2, SH-5)
- [ ] [T-17A02] Re-point both existing strip copies at the helper
- [ ] [T-17B01] Bind the registry cross-reference (SH-1, SH-4)
- [ ] [T-17C01] Exclude template sources from the link-integrity check (SH-3)
- [ ] [T-17C02] State SH-1 once in the containment match-class preamble
- [ ] [T-17T01] Harness coverage — helper contract and registry cross-reference
- [ ] [T-17T02] Validation — C14 bump, full harness, meta parity

## Detailed Tracking

### [T-17A01] Extract the strip step into one shared helper (SH-2, SH-5)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-2, SH-5), §5.1
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (shared helper)
- **Files:** `.magic/scripts/lib/` (new module)
- **Verify:** `node -e "const {stripQuoted}=require('./.magic/scripts/lib/<module>');const s='a\n\`\`\`\n- [ ] x\n\`\`\`\nb \`- [ ] y\` c';const o=stripQuoted(s);console.log(o.split('\n').length===s.split('\n').length, /- \[ \]/.test(o))"` MUST print `true false` — line count preserved, no quoted checkbox survives.
- **Handoff:** Gates T-17A02 and the whole of Track B.
- **Notes:** Fenced blocks are removed **before** inline spans (§5.1): a fence can contain backtick runs that would otherwise be read as span delimiters and swallow text past the closing fence. Line-count preservation is the new behavior — replace removed lines with blank lines rather than deleting them, so a caller reporting `{file}:{line}` maps back to the original. Neither current caller needs positions, but a caller that does will not be able to add the guarantee retroactively without re-auditing both. Handle `~~~` fences alongside triple-backtick ones; §2 scopes the constructs, and blockquotes/HTML comments are explicitly **not** stripped — a token inside those is still asserted.

### [T-17A02] Re-point both existing strip copies at the helper

- **Spec:** l1-scan-input-hygiene.md §3 (SH-5), §6 note 1
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (shared helper)
- **Files:** `.magic/scripts/lib/phase-archiver.js` (`allChecked`), `.magic/scripts/update-state.js` (`readPhaseChecklist`)
- **Verify:** `grep -rn 'replace(/\`\`\`' .magic/scripts/` returns **zero** hits outside the shared module, and `node --test dev/tests/engine.js` still passes the pre-existing archival-eligibility and two-level-progress cases unchanged.
- **Handoff:** Requires T-17A01. Validates the helper against existing coverage before Track B depends on it.
- **Notes:** This is the task the invariant was written for: `update-state.js`'s copy was added during Phase 15, two phases before SH-5 named the pattern, and neither copy has drifted *yet* — which is the point, since nothing would reveal it if they had. Both callers count line-anchored patterns and are indifferent to the blank lines the helper now leaves behind; confirm that rather than assuming it, because a counter that matched an unanchored pattern would start counting blanks. No behavior change is expected from this task — the existing tests passing unchanged **is** the deliverable.

### [T-17B01] Bind the registry cross-reference (SH-1, SH-4)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-1, SH-4), §6 note 2
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (script scan)
- **Files:** `.magic/scripts/check-prerequisites.js` (the `PLAN.md` spec-reference extraction, ~line 161)
- **Verify:** With a `PLAN.md` containing a code-span-quoted placeholder path on one line and three comma-separated quoted filenames on another, `node .magic/scripts/executor.js check-prerequisites --json --require-specs --workspace=engine` MUST report zero `REGISTRY_MISMATCH` entries.
- **Handoff:** Requires T-17A01. Gates T-17T01's registry case.
- **Notes:** Two independent defects in one line, and fixing either alone leaves the other live. **SH-1**: the match runs against raw file content, so a path quoted in prose reads as a registered reference. **SH-4**: the capture is bounded by `)` rather than by the filename's own grammar, so a single match spans everything up to the next closing parenthesis — on a line listing several quoted paths it returned one "filename" containing three of them plus the punctuation between. Narrow the capture to what a spec filename can actually contain; do not widen the delimiter class and call it fixed.

### [T-17C01] Exclude template sources from the link-integrity check (SH-3)

- **Spec:** l1-scan-input-hygiene.md §3 (SH-3), §5.2, §6 note 3
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (cognitive scans, prose)
- **Files:** `.magic/analyze.md` (Mode C Structural Integrity — Link Integrity, ~line 170)
- **Verify:** `grep -n "Link Integrity" -A3 .magic/analyze.md` shows the exclusion stated with its scope; a ventilation dry-read over the current tree yields **0** broken links (down from 5, all of which are template placeholders).
- **Notes:** Exclude by **file role**, not by inspecting whether a target looks like a placeholder (§5.2). Placeholder syntax varies across the templates, and a heuristic on the target string both misses real placeholders and skips real broken links. State that templates stay in scope for non-resolving checks — required sections, forbidden content, structure — so the exclusion is not read as a blanket exemption for the directory.

### [T-17C02] State SH-1 once in the containment match-class preamble

- **Spec:** l1-scan-input-hygiene.md §3 (SH-1), §5.3, §6 note 4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (cognitive scans, prose)
- **Files:** `.magic/analyze.md` (Mode C containment scan match classes, ~line 180)
- **Verify:** `grep -n "Match classes (unconditional)" -B4 .magic/analyze.md` shows SH-1 stated as a precondition on the whole match-class list, and `node --test dev/tests/engine.js` keeps passing the RC-2.1 shipped-text case, which reads this same prose.
- **Notes:** State it as a precondition on the classes rather than an exemption inside each one — an exemption per class is how this became four local carve-outs. Do **not** claim the strip step resolves fixture literals or example filenames written in plain prose: §5.3 is explicit that those are semantic, not syntactic, and stay with the self-containment test. The value here is that judgment is spent only where judgment is required.

### [T-17T01] Harness coverage — helper contract and registry cross-reference

- **Spec:** l2-test-suite.md §Script-Level Regression Harness; l1-scan-input-hygiene.md §4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `dev/tests/engine.js`
- **Verify:** `node --test dev/tests/engine.js` passes with new cases: (1) the helper strips fenced and inline-quoted tokens while preserving line count, and leaves blockquote/HTML-comment content untouched; (2) fence-before-span ordering — a fence containing a stray backtick does not cause text past it to be swallowed; (3) the registry cross-reference reports nothing for a `PLAN.md` whose prose quotes placeholder paths, and still reports a genuine unregistered reference.
- **Handoff:** Requires T-17A01 and T-17B01.
- **Notes:** Case 3 must assert **both** halves. A cross-reference that reports nothing at all would pass a false-positive-only test while silently losing the check the scan exists for — the same shape as Phase 15's SC-3.1 case, where asserting only the widened listing would have passed even if significance had widened with it.

### [T-17T02] Validation — C14 bump, full harness, meta parity

- **Spec:** l1-scan-input-hygiene.md §4
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** All four MUST pass — `node .magic/scripts/executor.js update-engine-meta`; `node --test dev/tests/engine.js` green; `node .magic/scripts/executor.js update-engine-meta --check` reports no drift; `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `"ok": true` with an empty `warnings` array.
- **Notes:** C14 runs once, after Tracks A-C have landed. No `rules/` or `workflows/` file is touched, so no hardlink restore is needed — [C-001] does not apply to this phase. Update §4's enforcement-surface table in the specification to reflect the new state; leaving it claiming non-compliance after the fix is the same class of defect the table exists to prevent. Do not invoke any write-side git command.
