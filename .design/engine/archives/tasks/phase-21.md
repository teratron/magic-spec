---
phase: 21
name: "check-prerequisites.js Registry-Scan Hygiene & Backlog Counter"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "check-prerequisites.js: INDEX.md-side registry-scan sites (registry cross-reference, Layer Integrity parent lookup, header-parity lookup) bound to stripQuoted() + a filename-grammar-bounded pattern (SH-1/SH-4 completion, l1-scan-input-hygiene.md v1.2.0)"
  - "check-prerequisites.js: DESIGN_DEBT_PENDING's openItems count excludes Parked-marked Backlog bullets (l1-session-continuity.md v1.9.0 SC-2.4 addendum)"
key_files:
  created: []
  modified:
    - ".magic/scripts/check-prerequisites.js"
    - "dev/tests/engine.js"
patterns_established:
  - "Shared regex pattern source as a module-level string (SPEC_FILENAME_SRC), built into fresh RegExp instances per call site rather than reusing one stateful g-flagged object across matchAll() and match() sites"
duration_minutes: ~
---

# Stage 21 Tasks — check-prerequisites.js Registry-Scan Hygiene & Backlog Counter

**Phase:** 21
**Status:** Done
**Strategic Goal:** Close the two `check-prerequisites.js` gaps left fully specified by this session's `/magic.spec` pass: the SH-1/SH-4 registry-scan sites Phase 17 didn't reach ([l1-scan-input-hygiene.md](../specifications/l1-scan-input-hygiene.md) v1.2.0 §4/§6 item 6), and the `DESIGN_DEBT_PENDING` counter's missing Parked-marker exclusion ([l1-session-continuity.md](../specifications/l1-session-continuity.md) v1.9.0 SC-2.4 addendum). Both tracks write the same file — sequenced, not parallel.

## Atomic Checklist

- [x] [T-21A01] Bind the three unbounded `INDEX.md`-side registry-scan sites to `stripQuoted()` + a filename-grammar-bounded pattern
- [x] [T-21B01] `DESIGN_DEBT_PENDING`'s `openItems` filter skips Parked-marked Backlog bullets
- [x] [T-21T01] Regression coverage — registry-scan hygiene (prose `specifications/` mention produces no spurious finding)
- [x] [T-21T02] Regression coverage — Parked-marker exclusion (`openItems.length` fixture)
- [x] [T-21T03] Full harness run + C14 sync

## Detailed Tracking

### [T-21A01] Bind the three unbounded `INDEX.md`-side registry-scan sites

- **Spec:** l1-scan-input-hygiene.md §4 (Enforcement Surfaces), §6 item 6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "specifications\\\\/(\[^)\]\*" .magic/scripts/check-prerequisites.js` returns no matches (the pre-fix unbounded pattern is gone from all four call sites, including the one Phase 17 already bound via the separate `specFilenameRe` literal). `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` against the current `.design/engine/` tree still reports `ok: true` with no new `GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC`/`RULE_57_VIOLATION`/`VERSION_DRIFT`/`STATUS_DRIFT` findings (regression-free on real data).
- **Handoff:** T-21T01 pins the specific defect this closes.
- **Notes:** Four call sites in this file currently share one root pattern, `/specifications\/([^)]*\.md)/g` or its single-match sibling `/specifications\/([^)]*\.md)/` — `[^)]` excludes `)` but not newlines, so an unclosed mention runs the capture past the paragraph it started in. One (~line 144/176, the `PLAN.md`-reading half) is already bound to the filename grammar via `specFilenameRe = /specifications\/([a-z0-9][a-z0-9-]*\.md)/g` and `stripQuoted(planContent)` — Phase 17's fix. The other three read `INDEX.md` (raw, unstripped) and are not bound:
  1. **Registry cross-reference** (~line 146): `indexContent.matchAll(/specifications\/([^)]*\.md)/g)` — feeds `indexSpecs`, which drives `GHOST_REGISTRY`, `NAMING_VIOLATION`, and `ORPHANED_SPEC`.
  2. **Layer Integrity parent lookup** (~lines 208, 219): `line.match(/specifications\/([^)]*\.md)/)` per `INDEX.md` line, and `specContent.match(/\*\*Implements:\*\*\s*(?:\[.*?\]\()?specifications\/([^)]*\.md)\)?/)` against a child spec's own content — feeds `RULE_57_VIOLATION`.
  3. **Header-parity lookup** (~line 310): `line.match(/specifications\/([^)]*\.md)/)` per `INDEX.md` line — feeds `VERSION_DRIFT`/`STATUS_DRIFT`.

  ```plaintext
  BAD : indexContent.matchAll(/specifications\/([^)]*\.md)/g)
        line.match(/specifications\/([^)]*\.md)/)               // per-line, ×3 sites
        specContent.match(/\*\*Implements:\*\*\s*(?:\[.*?\]\()?specifications\/([^)]*\.md)\)?/)
  GOOD: hoist a shared pattern source to module scope (outside any function/if-block, so
        both the `if (planExists && indexExists)` block and the separate
        `if (verifyHeaders && indexExists)` block can reach it):
            const SPEC_FILENAME_SRC = 'specifications\\/([a-z0-9][a-z0-9-]*\\.md)';
        then, near the `indexContent` read (~line 121), compute once:
            const indexContentForMatch = stripQuoted(indexContent);
        and re-point each site at the stripped content + a `RegExp` built from the shared
        source — `new RegExp(SPEC_FILENAME_SRC, 'g')` for the `matchAll` site (site 1),
        `new RegExp(SPEC_FILENAME_SRC)` for the three single-match `.match()` sites (2a,
        2b's per-line half, 3). Site 2b (the `**Implements:**` lookup) matches against
        `stripQuoted(specContent)` instead of raw `specContent`. Sites 2 and 3 already
        split `indexContent`/`indexContentForMatch` into lines before matching — swap the
        split source from `indexContent` to `indexContentForMatch` so SH-1 (stripping)
        applies there too, not only SH-4 (bounded capture).
  ```

  A single `g`-flagged `RegExp` object must not be shared across a `matchAll` call site and a `.match()` call site — `.match()` on a global regex returns all full-match strings with no capture groups, not `[full, group1]`. Building a fresh `RegExp` from the shared source string per call site (as above) sidesteps this rather than trying to reuse one stateful object.
- **Changes:** Added module-level `SPEC_FILENAME_SRC` pattern source and `indexContentForMatch` (`stripQuoted(indexContent)`, computed once). Re-pointed the registry cross-reference (`matchAll`), the Layer Integrity per-line scan and its `**Implements:**` lookup (now matched against `stripQuoted(specContent)`), and the header-parity per-line scan at the shared source + stripped content. `.magic/scripts/check-prerequisites.js` (+21 -11 lines net).

### [T-21B01] `DESIGN_DEBT_PENDING`'s `openItems` filter skips Parked-marked bullets

- **Spec:** l1-session-continuity.md SC-2.4 addendum (Backlog Disposition Convention)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "openItems" .magic/scripts/check-prerequisites.js` shows the filter excluding a `*(Parked` -marked line. Manual check: a `PLAN.md` Backlog fixture with one plain bullet and one bullet ending `*(Parked — reason)*` yields `DESIGN_DEBT_PENDING`'s reported count of 1, not 2.
- **Handoff:** T-21T02 pins this behavior in the harness.
- **Notes:** ~line 289 today:

  ```plaintext
  BAD : const openItems = backlogBody.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l));
  GOOD: const openItems = backlogBody.split(/\r?\n/).filter((l) => /^-\s+\S/.test(l) && !/\*\(Parked\b/.test(l));
  ```

  `backlogBody` is already `stripQuoted()`-processed above this line (SH-1 already applied here — no change needed to the stripping step, only to the predicate). The marker check runs on the same line the bullet test runs on, so a Parked marker anywhere in the bullet's text (not only at the literal end) is excluded — matching how the convention's own wording ("trailing marker") is meant to be read practically: the marker is the last parenthetical on the line, but nothing upstream guarantees bullets never wrap, so anchoring the regex to end-of-string is unnecessary precision for this input shape.
- **Changes:** `openItems` filter in the `DESIGN-DEBT-BACKLOG` section now excludes lines matching `/\*\(Parked\b/`; updated the stale comment that previously disclaimed any Closed/Parked distinction. `.magic/scripts/check-prerequisites.js` (+8 -6 lines net, comment + predicate).

### [T-21T01] Regression coverage — registry-scan hygiene

- **Goal:** Verify T-21A01 against l1-scan-input-hygiene.md §6 item 6's stated regression case.
- **Method:** `node --test dev/tests/engine.js` — new case: a fixture `INDEX.md` whose Meta Information section contains a prose sentence with a bare `specifications/` substring (not wrapped in a markdown link) followed later in the same bullet by further `.md` mentions and a closing `)` — reproducing the field report's exact described shape — must produce zero `GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC` findings referencing the prose span. A second assertion: the same fixture's real registered specs (in proper `[Name](specifications/file.md)` form) still produce their normal findings when actually broken (e.g. a genuinely missing file still raises `GHOST_REGISTRY`) — the fix must not blind the check, only bound its capture.
- **Status:** Done — new case `check-prerequisites.js INDEX.md-side registry-scan sites are scan-hygiene compliant (SH-1, SH-4)` (§6b-bis), both assertions pass: the prose span produces no finding, and a genuinely broken registered spec (`l1-missing.md`) still raises `GHOST_REGISTRY`.

### [T-21T02] Regression coverage — Parked-marker exclusion

- **Goal:** Verify T-21B01 against l1-session-continuity.md SC-2.4 addendum's stated regression case.
- **Method:** `node --test dev/tests/engine.js` — new case: a fixture workspace with `TASKS.md` `## Active Phases` at `*None*` and a `PLAN.md` `## Backlog` containing one plain bullet and one bullet ending `*(Parked — reason)*` must report `DESIGN_DEBT_PENDING` with `openItems.length === 1` (or no warning at all, if a second fixture drops to zero open items). A second assertion: a Backlog with only Parked-marked bullets produces no `DESIGN_DEBT_PENDING` warning at all.
- **Status:** Done — new case `check-prerequisites.js DESIGN_DEBT_PENDING excludes Parked-marked Backlog bullets (SC-2.4 addendum)` (§6b2-bis), three assertions pass: mixed plain+Parked counts only the plain bullet, all-Parked raises no warning, and a bare "Parked" word (no marker shape) still counts as open.

### [T-21T03] Full harness run + C14 sync

- **Goal:** Confirm no regressions across the full suite and sync engine metadata.
- **Method:** `node --test dev/tests/engine.js` (expect prior count + 2 new, all passing); `node .magic/scripts/executor.js update-engine-meta` (no `--workflow` — no `workflows/*.md`/`.magic/*.md` workflow body touched this phase, only `.magic/scripts/check-prerequisites.js`); `node .magic/scripts/executor.js update-engine-meta --check` (confirm no drift after).
- **Status:** Done — harness 62 → 64 (2 new: 1 from T-21T01, 1 from T-21T02), all passing. Engine 2.1.70 → 2.1.71 (`check-prerequisites.js` only). Post-sync `update-engine-meta --check`: no drift.
