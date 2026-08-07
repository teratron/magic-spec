# Finalize Pipeline — STATE.md Accuracy

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-session-continuity.md

## Overview

Defect record and required-fix contract for every way the finalize pipeline's SC-2 state-update step has made `STATE.md` **less** accurate than it was before the update meant to refresh it. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §8/§10 at v2.0.0, when that spec crossed the `SPEC_BLOAT` threshold; this file owns the `update-state.js` correctness surface, its sibling [l2-finalize-output-contract.md](l2-finalize-output-contract.md) owns what the pipeline emits, and the parent retains the pipeline contract itself.

Seven defects, one root symptom. Six were found across field reports against engine 2.1.58-2.1.62 and are implemented; the seventh (§8) was found and fixed out of band at 2.1.67 and is recorded here retroactively.

## Related Specifications

- [l1-session-continuity.md](l1-session-continuity.md) — Parent concept: SC-1 live-memory contract, SC-1.1/SC-1.2, SC-2/SC-2.1/SC-2.2/SC-2.3.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Parent spec: pipeline contract, module inventory, §5 session-continuity integration that invokes this step.
- [l2-finalize-output-contract.md](l2-finalize-output-contract.md) — Sibling: the emitted-artifact surface (commit messages, CHANGELOG bullets, stdout listings).
- [l2-test-suite.md](l2-test-suite.md) — Carries the finalize-pipeline regression-coverage mandate these fixes are pinned by.

## 1. Motivation

`STATE.md` is live memory: SC-1 designates it the authoritative resume point, and SC-4's briefing replays its fields verbatim. An update step that degrades it is therefore worse than no update at all — a stale file is merely old, while a corrupted one actively misdirects the returning session. Every defect below shares that shape, which is why they are recorded together rather than as isolated bugs.

## 2. The Next Action Defect (SC-2.1(a))

`synthesizeNextAction()` in `finalize.js`'s tier-2 lookup (phase files, canonical two-level format) reads each `tasks/phase-{N}.md` in order and returns its first open checklist match with no awareness of phase status:

```js
for (const file of phaseFiles) {
    const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    const openTask = content.match(openTaskRe);
    if (openTask) return `Execute ${openTask[1]} ${openTask[2]} via /magic.run ${workspace}`;
}
```

A phase recorded `status: Blocked` in its own frontmatter still has an open (`- [ ]`) checklist line for the blocked task — Blocked is not Done — so this loop returns it unconditionally. Verified by direct reproduction against engine 2.1.62: a phase file with `status: Blocked` frontmatter, a `TASKS.md` registry row reading `` `Blocked` ``, and one open checklist item yields `Execute T-1A01 {title} via /magic.run {ws}` byte-for-byte, while `STATE.md`'s own `**Status:** Blocked` and `## Blockers` entry are left untouched by the same call — the file becomes internally contradictory, not just stale.

**Required fix** (SC-2.1(a)): before returning a phase's open-task match, check that phase's `status:` frontmatter (already available in `content`) and its `TASKS.md` registry row. Either reading `Blocked` MUST redirect the return value away from an execute-style recommendation — e.g. `` `Resolve blocker on ${openTask[1]} (${workspace}) — see STATE.md ## Blockers, then run /magic.run ${workspace}` `` — rather than either silently falling through to the next phase (which would recommend a *different*, possibly out-of-order phase) or leaving the field untouched (which would go stale the next time the blocker's own detail changes). The redirected value still passes through the SC-2.2 single-exit screen unchanged.

## 3. The Progress-Granularity Defect (SC-2.3)

`computeProgress()` in `update-state.js` derives the active phase's counter line from an inline heading inside `TASKS.md` itself:

```js
const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
if (section) { /* only path that produces a Phase-N line */ }
```

That heading exists only in the legacy single-file task layout. The canonical two-level layout (`tasks/phase-{N}.md`, the format this engine's own workspace uses) never contains it, so `section` is always `null` and the phase-line branch never fires — for **every** project on the modern layout, not only Blocked ones. Verified by direct reproduction: a healthy, non-Blocked, 2-of-5-done phase in two-level format loses its `Phase 1: [2/5] …` counter on the very next `autoProgress` recompute, leaving only the aggregate `Overall: [0/1]` (phase-count, not task-count) line. This engine's own `.design/engine/STATE.md` carried an `Overall`-only `## Progress` block for its entire history as a silent instance of the same gap.

**Required fix** (SC-2.3): `computeProgress()`'s phase-line branch must fall back to reading `tasks/{active-phase-file}.md` directly — mirroring the file lookup `synthesizeNextAction()`'s tier-2 already performs — and count `- [x]`/`- [ ]` lines across that file, when no inline `### Phase {N} Checklist` section is found in `TASKS.md`. The two-level lookup is the common case and should not depend on locating an inline heading that layout never has.

## 4. The Status Field Collision (SC-1.1)

`run.md` §2.5 documented two call sites for `--status=`, and they disagreed about what the flag means:

```plaintext
# Per-task transition:
update-state --workspace={ws} --task="{T-ID} {Title}" --status={Done|Blocked} --next-action="..."

# Phase-start transition:
update-state --workspace={ws} --phase="{N+1} — {Phase Name}" --status=Active
```

`update-state.js` has exactly one `status` handler (`fieldMap.status`, mapped to the top-level `**Status:**` field) — there is no separate task-status field in the `STATE.md` schema for the first call site to target. Verified by direct reproduction against engine 2.1.62: invoking the documented per-task form (`--task="T-1A01 Scaffold the app" --status=Done`) against a `STATE.md` with `**Phase:** 1` / `**Status:** Active` produces `**Status:** Done` — a value the field's own confirmed vocabulary (`Active | Blocked | Paused`, SC-1.1) does not even contain — after exactly one task of a five-task phase completed. `run.md`'s *own* Pause Propagation logic (a different call site, firing only when the whole phase stalls) already scopes `--status=Blocked` correctly to the phase; §2.5's per-task call was the outlier.

**Required fix**: drop `--status={Done|Blocked}` from the per-task update-state invocation entirely. A single task's completion is already tracked authoritatively by its checklist line and Detailed Tracking entry in `tasks/phase-{N}.md` — `STATE.md` needs no redundant, and here actively harmful, copy of it. The per-task call becomes `update-state --workspace={ws} --task="{T-ID} {Title}" --next-action="..."`; the phase-level `Status` field changes only at its own documented transition points (phase start, Pause Propagation, phase completion).

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

No other `.replace()` call site in `update-state.js`, `changelog-writer.js`, or `phase-archiver.js` shares this vulnerability — verified by sweeping every `.replace()` call in the finalize/update-state pipeline: the other capture-group-bearing calls either interpolate engine-controlled values only (semver strings, ISO dates, generated filenames) or use regexes with no capture groups at all, so `$`-digit sequences in their inputs have no group to bind to and pass through as literal text.

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

## 8. The Decision-Section Structural Defect (SC-2) `[ADDED]`

### 8.1 Provenance — Recorded After the Fix, Not Before

Unlike every other defect in this file, this one was fixed in code **before** it was specified: the operator reported markdownlint findings against a live `STATE.md` and asked for a direct repair, so the work bypassed the spec-first pipeline that `Required Fix` blocks exist to feed. Engine 2.1.66 → 2.1.67 carries the fix; this section is the retrospec. It is recorded in full rather than as a one-line note because the reasoning below constrains future edits to the same function, and because a defect that reached `Stable` code with no spec section is precisely the kind of gap the debt-ceiling convention is being drafted to catch.

### 8.2 The Defect

`addDecision`'s insertion step located its insert point by skipping the section's blank-line-and-comment preamble:

```js
const afterMarker = content.indexOf('\n', idx) + 1;
let insertAt = afterMarker;
const remaining = content.slice(afterMarker);
const commentEnd = remaining.search(/^[^<]/m);   // "first line not starting a comment"
if (commentEnd > 0) {
    insertAt = afterMarker + commentEnd;
}
```

The intent of `/^[^<]/m` is "the first line that does not begin an HTML comment". The character class `[^<]` means *any character other than `<`* — and a **blank line's own terminating newline satisfies it**. The section's first line after the heading is blank, so the search matches at offset 0, `commentEnd > 0` is false, `insertAt` never advances, and every decision is inserted **immediately after the `## Recent Decisions` heading** — before the blank line and the `<!-- ... -->` comment, not after them.

Two consequences compound over a workspace's lifetime:

1. **Structural.** The heading is followed directly by a list item (markdownlint `MD022`, headings must be surrounded by blank lines; `MD032`, lists must be surrounded by blank lines), while the displaced blank line and comment migrate below the entries, accumulating an `MD012` run of consecutive blanks. Reproduced directly against a temp copy of the engine before any edit: three successive `addDecision` calls, each landing at the same wrong offset.
2. **Pruning.** A second reproduction showed the same step never removes the template's own `{YYYY-MM-DD} **Decision:** {What was decided and why}` placeholder rows, because the prune step filters on `/^- \d{4}-\d{2}-\d{2}/` and a literal `{YYYY-MM-DD}` does not match. A workspace bootstrapped from the template therefore carries its placeholders indefinitely, below the real entries.

### 8.3 Required Fix

Rebuild the section deterministically on every call rather than computing an insertion offset into existing bytes:

```plaintext
BAD : locate an offset past the preamble, splice the entry in at that offset
GOOD: parse the existing dated entries out of the section, prepend the new one,
      truncate to the 5-entry cap, and re-emit the whole section from a fixed
      template (heading, blank, comment, blank, entries, blank)
```

A full rebuild is legitimate **here specifically** and must not be generalized to `## Progress`: this section is entirely engine-owned, so there is no hand-authored narrative to preserve, whereas §5's merge-not-clobber contract exists precisely because `## Progress` interleaves operator content. The rebuild also self-heals drift already on disk — both the displaced preamble and the stale placeholder rows — instead of requiring a correctly-shaped preamble as a precondition for correct behavior.

### 8.4 Why Existing Coverage Could Not Catch It

The harness case exercising this path asserts only:

```js
assert.ok(/## Recent Decisions[\s\S]*Adopt SDD workflow/.test(afterDecision), …)
```

`[\s\S]*` matches any distance, so the assertion holds whether the entry lands immediately after the heading (defective) or after the preamble (correct) — verified by running it against both. A presence assertion cannot express a structural contract; the replacement must assert the section's **shape**, not merely that the entry appears somewhere beneath the heading.

## 9. Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), every fix above needs a harness case:

- `synthesizeNextAction()`/`computeNextAction()` against a Blocked two-level-format fixture must not return an execute-style recommendation naming the blocked task's ID (§2).
- `computeProgress()` against a healthy two-level-format fixture must produce a `Phase {N}: […]` line, not aggregate-only (§3).
- A per-task `update-state` call (`--task=`, no `--status=`) must leave the phase-level `Status` field unchanged (§4).
- `computeProgress()`'s merge step, given a fence containing `Specification:`/`Plan:`/`Implementation:`-style custom counter-shaped lines alongside `Overall`/`Phase {N}`, must preserve the custom lines and regenerate only `Overall`/`Phase {N}` (§5).
- `updateState()` with `autoProgress: true` against a preserved narrative line containing a literal `$1`/`$2`/`$3` sequence must leave that line byte-for-byte unchanged and must not alter the fence's triple-backtick count (§6).
- A fixture driven past 100 lines purely via repeated `addConstraint` calls, with `## Recent Decisions` pre-seeded at its 1-entry floor, must produce guard output observably different from the routine-prune case (§7).
- **Open obligation (§8):** `addDecision` has no structural coverage. A case must assert the emitted section's shape — heading followed by a blank line, the comment preamble above the entries rather than below them, no consecutive blank runs, and template placeholder rows absent after the first real entry. The existing presence-only assertion must be replaced, not supplemented: leaving it in place preserves a test that passes under the defect it is meant to exclude.

## 10. Known Gaps Not Closed Here

- **`Status` is never holistically recomputed.** [l2-engine-finalization.md](l2-engine-finalization.md) §5.1 documents that no code path in the SC-2 step recomputes `Status` — it is only ever set by explicit `--status=` calls in `task.md`/`run.md`. §4 above fixes one of those call sites (the per-task one, which should not touch `Status` at all); the broader claim that `Status` is ever holistically recomputed from plan/task state remains false, and is not addressed here — noted so it is not mistaken for closed.
- **§8's coverage obligation is open**, not merely pending: the fix shipped at 2.1.67 without it, so the defect is currently unprotected against regression.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/update-state.js` | Host of the progress recompute (§3, §5, §6), the line-cap guard (§7), and the decision-section rebuild (§8) |
| `.magic/scripts/finalize.js` | Hosts `synthesizeNextAction()`/`computeNextAction()` (§2) and the SC-2 state-update step that invokes the above |
| `.magic/templates/state.md` | Structure contract the rebuilt sections must match; source of the placeholder rows named in §8.2 |
| `.magic/run.md` | Hosts the per-task and phase-transition `update-state` call sites corrected by §4 |
| `dev/tests/engine.js` | Regression harness carrying §9's cases, including the open §8 obligation |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-08-07 | Agent | Initial Stable version. Extracted from [l2-engine-finalization.md](l2-engine-finalization.md) §8 (five STATE.md accuracy defects) and §10 (line-cap guard defeat) at that spec's v2.0.0 decomposition, which was triggered by `SPEC_BLOAT` at 367 lines against a 300 threshold. Content relocated verbatim apart from section renumbering and cross-reference retargeting. New §8 — **The Decision-Section Structural Defect**, the retrospec of a fix that shipped at engine 2.1.67 ahead of its specification: `addDecision`'s insertion-offset search used `/^[^<]/m` to skip the comment preamble, but a blank line's own newline satisfies `[^<]`, so the search matched at offset 0 and every entry was inserted directly after the heading (markdownlint MD022/MD032/MD012). Reproduced directly before the fix; a second reproduction surfaced that the same step never prunes the template's `{YYYY-MM-DD}` placeholder rows. §8.4 records that the existing harness assertion (`/## Recent Decisions[\s\S]*{entry}/`) is structurally incapable of catching the class and must be replaced rather than supplemented — that obligation is currently **open**, making §8 the one defect here shipped without regression protection. |
