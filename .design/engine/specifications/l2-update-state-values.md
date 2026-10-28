# update-state.js — Value Defects (Progress, Injection, Line Cap)

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-session-continuity.md

## Overview

Defect record and required-fix contract for what `update-state.js` **computes and bounds**: the `## Progress` recompute (`computeProgress()` and the merge-not-clobber classifier), string-replacement safety at its two rewrite sites (the progress fence and the scalar-field loop), and the 100-line cap with its honesty about what it pruned. Six defects — §3, §5, §6, §6.1, §7, §10 — with one root shape: each trusted something it had not checked — a layout the canonical format does not have (§3), a label class wider than what the writer emits (§5), a replacement string it did not know it was re-scanning (§6, §6.1), a cap it reported held (§7), and a promise its own comment made (§10). Extracted from [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) at that register's 2.0.0 decomposition; the sections below are relocated verbatim, and the per-defect provenance narrative stays in the register's Overview.

## Related Specifications

- [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) — Register: the permanent defect numbers, the caller-side defects (§2, §4, §9, §11) and the parent chain.
- [l2-update-state-structure.md](l2-update-state-structure.md) — Sibling: how `update-state.js` locates, groups and creates what it writes — the primitives §13.2 gives the line-cap prune its position-based removal from.
- [l1-session-continuity.md](l1-session-continuity.md) — Parent concept: SC-1 live-memory contract, SC-1.2, SC-2/SC-2.3.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Parent spec: pipeline contract and the §5 session-continuity step that invokes the writer.
- [l2-test-suite.md](l2-test-suite.md) — Carries the finalize-pipeline regression-coverage mandate these fixes are pinned by.

## Motivation

The values `update-state.js` writes are computed from, or copied out of, text the engine does not control — task titles, hand-authored narrative, counters derived from another file's layout — and its output is bounded by a 100-line cap. A defect on that path corrupts the file's *meaning* without disturbing its shape: a counter that lies, a replacement string that re-scans its own input, a cap that reports a prune it did not make. [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) §1 explains why a corrupted `STATE.md` is worse than a stale one.

## Section Map

This file holds §3, §5, §6 (with §6.1), §7 (with §7.1–§7.2) and §10. Defect numbers are permanent identifiers across the whole register ([l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md), Defect Register), so the gaps in the numbering are not omissions. A `§N` in the sections below that is not defined here resolves as: §8, §8.5, §12, §13 → [l2-update-state-structure.md](l2-update-state-structure.md).

## 3. The Progress-Granularity Defect (SC-2.3)

`computeProgress()` in `update-state.js` derives the active phase's counter line from an inline heading inside `TASKS.md` itself:

```js
const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
if (section) { /* only path that produces a Phase-N line */ }
```

That heading exists only in the legacy single-file task layout. The canonical two-level layout (`tasks/phase-{N}.md`, the format this engine's own workspace uses) never contains it, so `section` is always `null` and the phase-line branch never fires — for **every** project on the modern layout, not only Blocked ones. Verified by direct reproduction: a healthy, non-Blocked, 2-of-5-done phase in two-level format loses its `Phase 1: [2/5] …` counter on the very next `autoProgress` recompute, leaving only the aggregate `Overall: [0/1]` (phase-count, not task-count) line. This engine's own `.design/engine/STATE.md` carried an `Overall`-only `## Progress` block for its entire history as a silent instance of the same gap.

**Required fix** (SC-2.3): `computeProgress()`'s phase-line branch must fall back to reading `tasks/{active-phase-file}.md` directly — mirroring the file lookup `synthesizeNextAction()`'s tier-2 already performs — and count `- [x]`/`- [ ]` lines across that file, when no inline `### Phase {N} Checklist` section is found in `TASKS.md`. The two-level lookup is the common case and should not depend on locating an inline heading that layout never has.

## 5. The Progress Over-Classification Defect (SC-2)

`update-state.js`'s merge-not-clobber classifier (`counterRe`, referenced in [l2-engine-finalization.md](l2-engine-finalization.md) §5.1) was:

```js
const counterRe = /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/;
```

`[^:\n]+` accepts **any** label, but `computeProgress()` only ever emits two: `Overall` and `Phase {N}`. A hand-authored line using the same `{Label}: [n/m]` shape for a different purpose — the field report used `Specification: [3/3] complete`, `Plan: [1/1] complete`, `Implementation: [1/5] in progress — see notes below` — matches `counterRe`, is excluded from `preserved`, and is never regenerated (`computeProgress()` doesn't know those labels), so it is simply gone. Verified by direct reproduction: a `## Progress` fence with those three custom lines plus `Phase 1: […]` and `Overall: […]` was recomputed down to `Overall: […]` alone — four of five lines lost, three of them lines the "merge, never clobbers" contract explicitly promises to preserve as narrative.

**Required fix**: narrow `counterRe` to the exact label set `computeProgress()` currently produces, rather than an open label class:

```plaintext
BAD : /^[^:\n]+:\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
GOOD: /^(?:Overall|Phase (?:\d+|\{[^}]*\})):\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/
```

The placeholder alternation is needed in **both** halves, and for the same reason. The value half (`{filled}/{total}`) is the familiar one. The label half is easy to miss: the state template ships its phase counter as `Phase {N}: …`, so a label pattern of `Phase \d+` alone does not match a freshly bootstrapped `STATE.md` — the line is demoted to narrative and the placeholder survives the recompute that exists to replace it. Both forms are engine-owned; only the runtime form has a digit.

Any line whose label is not `Overall` or a phase counter in either form is narrative by definition, however counter-shaped it looks — the classifier's job is to recognize what the engine itself writes, not to guess at operator intent from formatting.

## 6. The Progress Replacement-String Injection Defect (SC-2)

The fence rewrite itself, independent of §5's classification bug, was:

```js
content = content.replace(progressRe, `$1${body}$3`);
```

`progressRe` has three capture groups (opening fence, fence body, closing fence). `.replace(regex, replacementString)` scans the **entire final replacement string** for JavaScript's special patterns (`$1`-`$9`, `` $` ``, `$'`, `$&`, `$$`) — including inside `${body}`, which is built from arbitrary, engine-uncontrolled narrative text (the preserved hand-authored lines). A narrative line containing a literal `$` followed by a digit is therefore re-interpreted as a capture-group backreference, splicing a **fragment of the surrounding STATE.md structure into the middle of the narrative**, not merely corrupting the counter it was never near.

Verified by direct reproduction against engine 2.1.62: a preserved two-line narrative note —

```plaintext
Budget check: spend is $1,200 of the
$3,000 sprint allocation — on track.
```

— recomputed to (note this block uses four backticks so the injected triple-backtick below renders as literal text, not a fence break):

````plaintext
Overall: [0/1] ░░░░░░░░ 0%
Budget check: spend is ## Progress

```
,200 of the

```,000 sprint allocation — on track.
````

`$1` was replaced with capture group 1 (`## Progress\n` + the fence opener) and `$3` with capture group 3 (the fence closer), **injecting a spurious closing fence mid-document** — the file's triple-backtick count goes from balanced (2) to unbalanced (3), so every section after the injection point is at the mercy of the renderer's fence-recovery behavior. This is more severe than the value-level defects above: they misplace or lose *values*; this one corrupts *markdown structure*, and the visible symptom — a two-line entry that reads as torn, its first line truncated mid-word — is exactly what a `$`-digit sequence anywhere in a multi-line narrative note produces, not only in a dollar-amount example.

**Required fix**: replace the string-form replacement with a function-form replacement. A function's return value is used verbatim by `.replace()` — none of `$1`/`$3`'s content is re-scanned for special patterns, because the function *receives* the captured groups as arguments instead of the engine writing them as `$`-syntax into a string the interpreter re-parses:

```plaintext
BAD : content.replace(progressRe, `$1${body}$3`);
GOOD: content.replace(progressRe, (_match, open, _oldBody, close) => `${open}${body}${close}`);
```

`changelog-writer.js` and `phase-archiver.js` are clear — their capture-group-bearing `.replace()` calls interpolate engine-controlled values only (semver strings, ISO dates, generated filenames) or use regexes with no capture groups. The original sweep's conclusion that `update-state.js` was likewise clear was **wrong**, because it looked only for `$`-*digit* backreferences: it missed that `` $` ``, `$'`, and `$&` fire with **no capture group at all**. §6.1 records the call site it wrongly exonerated.

### 6.1 The Same Defect in the Field-Patch Loop (SC-2) `[ADDED]`

`updateState()`'s `fieldMap` loop — the step that refreshes the scalar lines (`**Phase:**`, `**Status:**`, `- **Task:**`, `- **Next Action:**`, …) — used the same string-form `.replace()` §6 corrected for the `## Progress` fence:

```js
content = content.replace(re, `${prefix}${patch[key]}`);
```

`re` has no capture groups, so the original sweep waved it through. But `.replace()` with a string replacement re-scans that string for `` $` `` (everything **before** the match), `$'` (everything **after** the match), `$&` (the whole match), and `$$` — **none of which need a capture group**. And `patch[key]` is not engine-controlled here: `nextAction` is `finalize.js`'s `synthesizeNextAction()` output, which embeds an arbitrary task **title**, and `--task` carries the raw title. Task titles about shell tooling routinely contain bash ANSI-C quoting (`$'…\n…'`) or a backtick-wrapped `` $`command` ``.

Verified by direct reproduction against engine 2.1.76: a `STATE.md` patched via `updateState(wsDir, { nextAction }, { autoProgress: true })` where `nextAction` is `` Execute T-8B04 Handle `$'refund'` edge case via /magic.run demo `` — the `$'` is expanded to the **entire remainder of `STATE.md` after the `Next Action` line**, so the field is truncated at `` Handle ` `` and every section below it (Progress, Recent Decisions, Blockers, Blocking Constraints, Session Continuity) is duplicated. The duplicate `## Progress` carries the pre-recompute `Phase {N}` counter, so the file now holds two Progress fences disagreeing on the active phase's numbers — the field report's "spoiled the Next Action and the Phase {N} line in `## Progress`" is these two halves of one string-replace expansion, not two separate bugs.

**Required fix**: the §6 fix, applied to this loop too — a function-form replacement, whose return value `.replace()` uses verbatim with no re-scan:

```plaintext
BAD : content.replace(re, `${prefix}${patch[key]}`);
GOOD: const line = `${prefix}${patch[key]}`;
      content.replace(re, () => line);
```

The two loops now share one rule: **no engine-uncontrolled text is ever the second argument of a string-form `.replace()`** anywhere in `update-state.js`. This one shipped ahead of its spec (a reported field defect with a known root cause and a sibling already fixed in §6), recorded here as the retrospec — the §8 precedent.

## 7. Line-Cap Guard Defeat by Unbounded Blocking Constraints (SC-1.2)

### 7.1 The Defect

`update-state.js`'s line-count guard ran unconditionally at the end of `updateState()`:

```js
const lines = content.split('\n');
if (lines.length > 100) {
    console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruning oldest decision.`);
    // ... removes exactly one `## Recent Decisions` line, only if decLines.length > 1
}
```

This is the file's **only** line-cap enforcement, and it targets exactly one section: `## Recent Decisions`, which already has its own independent 5-entry cap enforced at insert time. `## Blocking Constraints` is structurally different — the template marks it "MANDATORY reading", every discovered anti-pattern is appended with an auto-incrementing `[C-NNN]` ID, and nothing in `update-state.js` ever removes an entry from it. The guard was written as if `## Recent Decisions` were the file's dominant growth source; `## Blocking Constraints` is the one section explicitly designed to grow monotonically over a workspace's lifetime.

Reproduced directly (synthetic workspace, `updateState()` called in a loop with `{ addConstraint: true }`):

| Constraints added | Total lines | `## Recent Decisions` entries remaining | Guard engaged? |
| --- | --- | --- | --- |
| 20 | 74 | n/a (below threshold) | No — never crossed 100 |
| 60 | **110** | 1 (its floor — cannot go lower) | Yes, every call — but nothing left to remove |

At 60 accumulated constraints the file sits **10 lines over the documented ceiling**, `## Recent Decisions` is already pruned down to its 1-entry floor, and every further `addConstraint` call grows the file further while the guard's `console.warn` — unconditional on `lines.length > 100`, not on whether a line was actually removed — keeps printing "Pruning oldest decision" as if the cap were being restored. There is no code path that reports "cap exceeded and nothing left to prune" differently from "cap exceeded, pruned successfully".

### 7.2 Required Fix

Silently auto-pruning `## Blocking Constraints` the way `## Recent Decisions` is pruned is **not** an acceptable mirror-fix: a Decision is disposable narrative (the template already says older ones "archived to PLAN.md"), but a Blocking Constraint exists specifically because it is safety-critical — deleting the oldest one to make room could silently remove the one anti-pattern warning that prevents a future incident, with the operator never told which entry vanished or why.

The guard must instead distinguish two states it currently reports identically:

1. **Cap restored** — `## Recent Decisions` had an entry above its floor to remove; the file is now ≤ 100 lines (or closer). Current behavior and message are correct here.
2. **Cap exhausted** — `## Recent Decisions` is already at its 1-entry floor and the file remains over 100 lines. This state MUST emit a distinct, non-silent warning (not the reused "Pruning oldest decision" line) directing the operator to manually review and archive stale `## Blocking Constraints` entries. The write still proceeds (`updateState()` must not become a HALT point over a line count), but the operator is told the cap is not actually being held, rather than being told a prune happened when none did.

```plaintext
BAD : console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruning oldest decision.`);
      // fires identically whether or not decLines.length > 1, i.e. whether or not anything was pruned
GOOD: if (decLines.length > 1) {
          console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruned oldest decision.`);
          // ... remove as today
      } else {
          console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}) and ## Recent Decisions ` +
              `is already at its floor — nothing was pruned. Review ## Blocking Constraints for entries to archive.`);
      }
```

## 10. The Recent-Decisions Archival Promise Defect (SC-1.2) `[ADDED]`

The line-cap guard's routine prune path — the "Cap restored" branch §7.2 above leaves unchanged — removes the oldest `## Recent Decisions` entry by deleting its line outright:

```js
if (decLines.length > 1) {
    content = content.replace(decLines[decLines.length - 1] + '\n', '');
    pruned = true;
}
```

No code path in `update-state.js` writes to `PLAN.md`, or to any file other than `STATE.md` itself, anywhere in this function. This contradicts the section's own template comment, re-emitted by `addDecision` on every call that adds a decision:

```plaintext
<!-- Last 3-5 locked decisions. Older entries → archived to PLAN.md -->
```

The comment is not aspirational prose in a design doc the operator never sees — it is written into the live `STATE.md` file itself, read by whoever opens the file, and it describes behavior the guard has never implemented at any point in this section's history (§7's fix corrected the guard's *signaling* when nothing could be pruned; it left the routine-prune path — where the promise is actually broken every time it fires — unexamined). An operator who takes the comment's own claim at face value ("where did the fourth decision go — it should be in PLAN.md") finds nothing there, with no diagnostic recording the loss either.

Verified by direct reproduction against engine 2.1.72: a synthetic `STATE.md` with 5 `## Recent Decisions` entries and enough `## Blocking Constraints` padding to cross the 100-line cap was passed through `updateState()`. The guard fired (`Pruned oldest decision`), the oldest entry (`Decision number 5`) was confirmed absent from `STATE.md` afterward, and no `PLAN.md` was created or written anywhere in the workspace directory at any point during the call.

**Required fix**: either (a) implement the promise — append the pruned entry to a dated log section in `PLAN.md` before removing it from `STATE.md`, in the same call, so no window exists where the decision is in neither file; or (b) if archival is deliberately out of scope for a key-value patch utility, remove the comment's specific claim and replace it with what the guard actually does (prune with no retention). Silently choosing (b) by leaving the code as-is is not an acceptable resolution here: the comment is regenerated by `addDecision` on every decision write, so doing nothing keeps re-asserting the false promise into every workspace's live `STATE.md` going forward, rather than merely leaving a stale doc uncorrected once.

Tracked as a new obligation; no existing invariant names it directly — [l1-session-continuity.md](l1-session-continuity.md) SC-1.2 governs the line-cap mechanism this defect lives inside.

## Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), every fix needs a harness case:

- `computeProgress()` against a healthy two-level-format fixture must produce a `Phase {N}: […]` line, not aggregate-only (§3).
- `computeProgress()`'s merge step, given a fence containing `Specification:`/`Plan:`/`Implementation:`-style custom counter-shaped lines alongside `Overall`/`Phase {N}`, must preserve the custom lines and regenerate only `Overall`/`Phase {N}` (§5).
- `updateState()` with `autoProgress: true` against a preserved narrative line containing a literal `$1`/`$2`/`$3` sequence must leave that line byte-for-byte unchanged and must not alter the fence's triple-backtick count (§6).
- `updateState()` given a `nextAction` / `task` value containing `$'`, `` $` ``, or `$&` must write that value into the field byte-for-byte, and must not duplicate any `##`-level section or unbalance the `## Progress` fence count (§6.1). The value-level assertion and the structural (`^## Progress$` occurrence count, fence count) assertion are both required — a string-form `.replace()` regression fails the structural one even where the field text happens to look intact.
- A fixture driven past 100 lines purely via repeated `addConstraint` calls, with `## Recent Decisions` pre-seeded at its 1-entry floor, must produce guard output observably different from the routine-prune case (§7).
- `updateState()`'s line-cap guard, given a fixture that crosses 100 lines and successfully prunes the oldest `## Recent Decisions` entry, must not claim — in the section's own comment, re-emitted on every decision write — an archival that no code path performs: archival is intentionally not implemented, and a case asserts the comment says so (§10; closed by Phase 23, resolution (b)).

## Known Gaps Not Closed Here

None recorded.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/update-state.js` | Host of the progress recompute (§3, §5, §6), the scalar-field patch loop's replacement (§6.1), and the line-cap guard incl. the unimplemented archival promise (§7, §10) |
| `.magic/templates/state.md` | Source of the `## Progress` placeholder counters the classifier must recognise (§5) and of the `## Recent Decisions` preamble comment whose archival claim §10 corrects |
| `dev/tests/engine.js` | Regression harness carrying §3's, §5's, §6's, §6.1's and §7's cases and the §10 obligation closed by Phase 23 |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-20 | Agent | Initial Stable version. Extracted verbatim from [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) 1.8.0 at that register's 2.0.0 decomposition (`SPEC_DECOMPOSE`: 552 lines against the 500-line hard threshold): §3, §5, §6 (with §6.1), §7 (with §7.1–§7.2) and §10 under their permanent defect numbers, with the Regression Coverage bullets that belong to them. Per-defect history — the register's versions 1.0.0–1.8.0, in which each of these defects was found, specified and fixed — stays in the register's Document History. Reworded for the move: §10's Regression Coverage bullet restated as the requirement it is, its "Open obligation" label having been stale since Phase 23 closed it by resolution (b) — the comment no longer makes the claim. No Known Gap travelled with these defects. Added: Overview, Motivation and Section Map, which the register carried once for all seventeen defects. `Stable` on creation via Trust Mode (C9) after Post-Update Review. |
