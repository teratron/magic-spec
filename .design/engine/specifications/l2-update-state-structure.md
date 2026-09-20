# update-state.js — Structure Defects (Locating, Grouping, Creating)

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-session-continuity.md

## Overview

Defect record and required-fix contract for the ways `update-state.js` has misjudged the **shape of the file it writes into**: how it finds a section by its heading, groups a list section's wrapped entries, rebuilds the two engine-owned list sections, patches a scalar field whole, and creates what is absent (`headingRe()`/`locateSection()`, `collectEntries()`/`entryRanges()`, `wholeEntryRe()`, `ensureSection()`/`ensureField()`). Seven defects — §8, §8.5, §12, §12.1, §13, §13.1, §13.2 — with one root shape: each assumed a file that a `STATE.md` maintained by hand does not honour (a preamble that lets an insertion offset be computed, one physical line per entry, a heading and field lines that are always present and only ever at a line's start). Extracted from [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) at that register's 2.0.0 decomposition; the sections below are relocated verbatim, and the per-defect provenance narrative stays in the register's Overview.

## Related Specifications

- [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) — Register: the permanent defect numbers, the caller-side defects (§2, §4, §9, §11) and the parent chain.
- [l2-update-state-values.md](l2-update-state-values.md) — Sibling: what `update-state.js` computes and bounds — the progress recompute, replacement-string safety, the line cap.
- [l1-session-continuity.md](l1-session-continuity.md) — Parent concept: SC-1 live-memory contract, SC-1.2, SC-2.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Parent spec: pipeline contract and the §5 session-continuity step that invokes the writer.
- [l2-test-suite.md](l2-test-suite.md) — Carries the finalize-pipeline regression-coverage mandate these fixes are pinned by.

## Motivation

`STATE.md` is live memory, and a file agents maintain by hand: they trim it, re-wrap its entries, drop whole sections from it ([l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) §1 explains why a corrupted one is worse than a stale one). A writer that misjudges the shape of such a file does not fail — it drops the request, or writes it into the wrong place, and still reports `STATE.md updated`. Each defect below is a case of that, and each surfaced through a field report or an audit, never through an error the writer itself raised.

## Section Map

This file holds §8 (with §8.1–§8.5), §12 (with §12.1) and §13 (with §13.1 and §13.2). Defect numbers are permanent identifiers across the whole register ([l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md), Defect Register), so the gaps in the numbering are not omissions. A `§N` in the sections below that is not defined here resolves as: §5, §6, §6.1, §7, §10 → [l2-update-state-values.md](l2-update-state-values.md).

## 8. The Decision-Section Structural Defect (SC-2) `[ADDED]`

### 8.1 Provenance — Recorded After the Fix, Not Before

Unlike every other defect in the register, this one was fixed in code **before** it was specified: the operator reported markdownlint findings against a live `STATE.md` and asked for a direct repair, so the work bypassed the spec-first pipeline that `Required Fix` blocks exist to feed. Engine 2.1.66 → 2.1.67 carries the fix; this section is the retrospec. It is recorded in full rather than as a one-line note because the reasoning below constrains future edits to the same function, and because a defect that reached `Stable` code with no spec section is precisely the kind of gap the debt-ceiling convention is being drafted to catch.

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

### 8.5 The Same Defect, Unfixed in the Sibling Call Site `[ADDED]`

§8.3's rebuild was applied to `addDecision` only. `addConstraint` — the function immediately below it in `update-state.js`, prepending into `## Blocking Constraints` rather than `## Recent Decisions` — kept the exact insertion-offset code §8.2 diagnosed, unchanged:

```js
const afterMarker = content.indexOf('\n', idx) + 1;
let insertAt = afterMarker;
const remaining = content.slice(afterMarker);
const contentStart = remaining.search(/^[^<]/m);
if (contentStart > 0) {
    insertAt = afterMarker + contentStart;
}
```

Same regex, same reasoning failure, same result: every constraint landed immediately after the `## Blocking Constraints` heading, above its two-line MANDATORY-reading comment, instead of joining the entry list below it. Reproduced directly (temp workspace, three successive `addConstraint` calls before any edit): each new entry stacked at the top, pushing the comment block — and every previously-added constraint — further down each time, growing a pile of misplaced lines right under the heading.

The two functions are adjacent in the file and §8's own fix (2.1.67) touched only one of them; nothing then or since re-examined the sibling for the same pattern, matching the recurring shape in this codebase where a fix lands at one call site of a shared defect and the audit that would have caught the rest never runs (cf. l1-scan-input-hygiene.md's SH-1 gap across multiple scan sites). Unlike §8.2's decision case, this one carries no pruning consequence (constraints are never capped or pruned — SC-1.2, §7) — the defect here is purely positional and cumulative.

**Required fix**: the same rebuild §8.3 specifies, adapted for `addConstraint`'s two differences from `addDecision`: the comment preamble is two lines, not one, and the entry list carries no 5-entry cap (every constraint is kept, by design). Auto-numbering is scoped to entries found inside the rebuilt block, not a whole-file scan for `[C-\d{3}]` — a constraint id mentioned in passing elsewhere (e.g. a Recent Decisions note referencing one) must not inflate the next number, a stricter guarantee than the pre-fix code provided incidentally.

Regression coverage extends the existing `dev/tests/engine.js` decision-structure case (§8.4) with the parallel assertion for constraints: heading followed by a blank line, both comment lines, then entries newest-first, no consecutive-blank runs — plus a second `addConstraint` call asserting the list rebuilds correctly rather than only the first insertion. Field-observed (this engine's own session tooling, not a downstream report): reproduced directly against 2.1.82 before either the test or the fix were written.

## 12. The Multi-Line Entry Truncation Defect (SC-1.2) `[ADDED]`

Every prior defect in the register that rebuilds `## Recent Decisions` / `## Blocking Constraints` (§8, §8.5, §7/§10) assumed each entry occupies exactly one line. `addDecision` and `addConstraint` both located their capped entry window with a line-level filter:

```js
const existingLines = block.split(/\r?\n/).filter(l => /^- \d{4}-\d{2}-\d{2}/.test(l));
// … addConstraint's sibling: .filter(l => /^- \[C-\d{3}\]/.test(l))
```

A wrapped list item — a marker line followed by one or more indented continuation lines, ordinary Markdown for a decision or constraint whose text does not fit on one line — has continuation lines that match neither pattern. The filter kept only each entry's first line; every continuation line was silently absent from `existingLines`/`existingEntries`, and since the section is rebuilt from that array on every call (§8.3's deliberate full-rebuild strategy), the continuation was gone the moment the *next* decision or constraint was added — not merely misplaced, as §8/§8.5 were, but deleted.

The line-cap guard's routine prune (§7.2, §10) carries the identical assumption on its removal side: `decLines` is the same marker-only filter, and the prune deletes exactly `decLines[last] + '\n'` — one line — from `content`. When the oldest entry is itself wrapped, this removes only its marker line and leaves the continuation line behind as an orphaned fragment with no marker of its own, sitting where the pruned entry used to be.

Verified by direct reproduction against engine 2.1.93: a `STATE.md` with an existing two-line `## Recent Decisions` entry (`- 2026-01-01 **Decision:** This is a long decision that wraps` / `onto a second continuation line for readability.`) and a two-line `## Blocking Constraints` entry, followed by one `addDecision` call and one `addConstraint` call — each rebuild dropped the pre-existing entry's continuation line, keeping only its first line. Separately, driving the line-cap guard's prune path against a fixture whose oldest `## Recent Decisions` entry is wrapped removes the marker line but leaves the continuation line's text behind in the file, unattached to any entry.

**Required fix**: replace the line-level filter with an entry-level grouping. A new `collectEntries(block, startRe)` helper walks the section's lines and groups each entry-start line (matching `startRe`) together with every following non-blank line that does not itself start a new entry — precisely how a wrapped entry is shaped on disk. `addDecision`, `addConstraint`, and the line-cap guard's prune step (§7/§10) all consume `collectEntries()`'s output instead of a raw line filter; a pruned or windowed-out entry is now removed or dropped as a whole, continuation lines included, never orphaned or truncated.

```plaintext
BAD : block.split(/\r?\n/).filter(l => /^- \d{4}-\d{2}-\d{2}/.test(l))
      // keeps one line per entry; continuation lines vanish on the next rebuild
GOOD: collectEntries(block, /^- \d{4}-\d{2}-\d{2}/)
      // groups each entry-start line with its continuation lines; the
      // array element for a wrapped entry carries its full multi-line text
```

Regression coverage: `dev/tests/engine.js` gained two cases — a pre-existing wrapped decision and wrapped constraint both survive an `addDecision`/`addConstraint` rebuild with their continuation line intact and attached to the right entry, and the line-cap guard's prune removes a wrapped oldest entry's marker **and** continuation line together, leaving no orphaned fragment; 92 → 94.

### 12.1 The Same Defect, Unfixed in the Scalar-Field Loop (SC-1.2) `[ADDED]`

§12's fix reached the three call sites that handle a list *section* — `addDecision`, `addConstraint`, and the line-cap prune — and stopped there. `updateState()`'s scalar-field loop (§6.1) carries the same one-line-per-entry assumption on a fourth. It patches nine fields — `**Workspace:**`, `**Updated:**`, `**Phase:**`, `**Status:**`, `- **Task:**`, `- **Spec:**`, `- **Next Action:**`, `**Handoff File:**`, `**Bootstrap Mode:**` — each with a single-line pattern of this shape:

```js
task: { re: /- \*\*Task:\*\* .*/, prefix: '- **Task:** ' },
// … content.replace(re, () => line)
```

`.` does not cross a line break, so the pattern matches an entry's **first physical line only**. A field value an agent has hand-wrapped — a marker line followed by indented continuation lines, the shape §12 describes — is one logical entry, but the replacement rewrites just its marker line: the new (usually shorter) text lands there and every old continuation line stays behind, orphaned under text it no longer belongs to. Nothing in the file marks the fragment as stale, so a returning session reads it as the tail of the *new* value; and since every later patch again rewrites only the marker line, it outlives them all until someone deletes it by hand.

The field report (engine 2.1.95, "observed 3 times" across ~11 `update-state` calls in one `/magic.run`) attributed this to the line-cap guard's auto-pruning. That attribution is wrong, and is recorded so the guard is not "fixed" a second time: the guard's prune path was corrected by §12 and holds — its regression case passes against 2.1.95, and a wrapped oldest entry is removed whole — while the orphans appear at any file length, far below the cap. The mechanism is the per-task `update-state --task=… --next-action=…` call. The reporter's own committed history shows it: a two-line `Next Action` (paraphrased: first line `Run /magic.task docs to update the plan — one Verify line still`, second line a wrapped clause completing the sentence) was replaced by `Run /magic.task docs to update the plan`, leaving the second line behind, and that line then survived several further `Next Action` values unchanged. Replaying that committed `STATE.md` through `updateState(wsDir, { nextAction: … })` on engine 2.1.95 reproduces the reporter's next committed `## Current Position` byte-for-byte; a wrapped `Task` or `Spec` bullet orphans identically.

**Required fix**: enforce the invariant at the loop's single exit, not per field. Before matching, each field's line pattern is widened to its whole logical entry — marker line plus the continuation lines beneath it — by `wholeEntryRe()`, so all nine fields are replaced whole by exactly one line:

```plaintext
BAD : content.replace(/- \*\*Task:\*\* .*/, () => line)
      // rewrites the marker line; continuation lines survive as orphans
GOOD: content.replace(wholeEntryRe(/- \*\*Task:\*\* .*/, true), () => line)
      // the pattern gains a continuation group: every indented, non-blank line
      // under the marker line — and, for a list-item field, every unindented one
      // that does not open a new block — is part of the entry it replaces
```

What counts as a continuation is deliberately **narrower** than `collectEntries()`'s, and depends on the field's kind. Inside an engine-owned list section (§8.3) nothing but entries can follow an entry, so "every following non-blank line" is safe there. Field lines are different: `**Phase:**` sits directly above `**Status:**` and the three `- **X:**` bullets are adjacent, with no blank line between them, so that rule would swallow the *next field* — trading an orphan defect for a data-loss one. Two rules stand in for it:

- **Indented, non-blank lines** continue the entry above them, for every field — the shape §12 and every reported file use (each wrapped line indented two spaces). An indented sub-bullet hangs under the entry it follows and is replaced with it.
- For a field written as a **list item** (`- **Task:**`, `- **Spec:**`, `- **Next Action:**`) an **unindented** line continues it as well — CommonMark's *lazy continuation*, which renders exactly like the indented wrap — unless it opens a new block: a line starting with `-`, `+` or `*` (a bullet, a `**Label:**` field, a thematic break), an ordered-list marker (`1.`, `1)`), `#`, `>`, `|`, `<` (heading, quote, table row, HTML or comment), or a code fence (three backticks or tildes). A blank line ends every entry. Header fields (`**Phase:**`, `**Status:**`, …) get **no** lazy rule: with no list structure to anchor "continues" to, an unindented line under one is as likely to be a neighbouring field or a stray note as its wrap, and it is left exactly where it is.

The stop-set errs toward stopping on purpose. A line outside it is consumed, so an incomplete set fails by deleting; a line that stops early merely leaves the orphan this section exists to remove — the milder failure, and the reason the set is closed and tested member by member rather than inferred from a wider heuristic (the naive "every non-blank line" variant was built first, as the red step, and observably swallowed the neighbouring `- **Spec:**` and `- **Next Action:**` bullets). The accepted residual: an unindented plain line placed directly under a list-item field with no blank line — a stray note rather than a wrap — is indistinguishable from a lazy wrap and is replaced with its entry. Line breaks match as `\r?\n`, so a CRLF file is handled, and the last matched line's terminator is left in place, so line endings around the replacement are undisturbed.

The lazy rule was added after the indented-only fix (1.6.0) had shipped, which recorded lazily wrapped values as a known gap. Replaying every committed `STATE.md` version of seven real projects (1025 versions) through both rules produced byte-identical output — no structural line consumed, no change in heading, fence, comment, bullet, label or table counts — so the rule is safe on real data. It is also, on that data, prophylactic rather than observed: no file wraps lazily, and all 19 versions carrying a wrapped field (the shape this section exists for) wrap with indentation.

Regression coverage: `dev/tests/engine.js` gained five cases — a wrapped header field and all three wrapped `- **X:**` bullets replaced whole, with every neighbouring line and an unrelated wrapped decision left untouched (whole-file equality, modulo the timestamp); the header boundary (an unindented line under a header field survives); the list-item lazy rule (unindented, indented and mixed continuation lines and a nested sub-bullet all go with their entry, and nothing else does); a table-driven boundary case asserting that thirteen block-opening lines — every stop-set member — survive the patch of the bullet above them, plus the blank-line stop; and the same replacement in a CRLF file, spanning an indented and a lazy line, with no bare LF introduced; 94 → 99. Each stop-set member is mutation-checked: removing any one from the pattern, making header fields lazy, or dropping the lazy rule is caught by at least one case.

## 13. The Missing-Section Silent-Drop Defect (SC-1, SC-2) `[ADDED]`

`addDecision` and `addConstraint` are the only writers of the two engine-owned list sections (§8.3). Each located its section with a substring search and wrapped the whole rebuild in a guard with no alternative branch:

```js
const secStart = content.indexOf('## Recent Decisions');
if (secStart !== -1) {
    // … rebuild the section from its existing entries plus the new one …
}
// no else: an absent section skips the write and control falls through to
// the unconditional "STATE.md updated" line
```

A `STATE.md` without the heading therefore accepts the request and does nothing with it. The CLI's closing line does not depend on whether anything was written, so a call that changed nothing reports `[update-state] STATE.md updated: {path}`; nothing is warned and no diagnostic is recorded (DG-1). The decision or constraint the caller asked to persist is lost without a signal — and `## Blocking Constraints` is the section SC-1.2 singles out as safety-critical, MANDATORY reading, the one whose entries the engine refuses to prune silently.

Verified by direct reproduction against engine 2.1.100, the version the report names (its file and line reference match HEAD, so this report does not lag): a `STATE.md` holding only `## Current Position` and `## Progress`, with `updateState(wsDir, { decision }, { addDecision: true })`, prints the success line and the decision text appears nowhere in the file. `{ constraint }` with `{ addConstraint: true }` behaves identically. The sibling needed no second report to be found — it is the §8.5/§12.1 recurrence again: one shape, two adjacent call sites, one of them named in the report.

**How a heading goes missing.** The reporter's committed `STATE.md` history shows two removals a few hours apart, and neither is the output of any `update-state` writer: one deleted a 45-line tail in a single hunk, taking `## Blockers`, `## Blocking Constraints`, `## Session Continuity` and the older decision entries with it; the other replaced the `## Recent Decisions` heading line and the blank line after it with a new decision entry. No writer removes a heading — the rebuilds re-emit their own, the insertion code that preceded them only inserted, and the one line-removing path (the cap prune) deletes a single entry per call and only above 100 lines, which that file was not. These were whole-block hand edits, the ordinary way a file that agents maintain by hand changes. A missing heading is a state the engine has to handle, not a corruption it may assume away.

**A second manifestation of the same root.** `indexOf` is a substring test, not a heading test. With the heading absent but its text quoted mid-line elsewhere — a constraint that names the section, say — `secStart` lands inside that line, and the rebuild splices from that offset to the next level-2 heading: the tail of the quoted line is destroyed and a decisions section is created inside `## Blocking Constraints`. Reproduced directly against 2.1.100. The silent drop and the silent corruption differ only in whether the phrase happens to occur somewhere else in the file, so a fix that added a create branch on top of `indexOf` would inherit the second; whether a heading exists has to be decided by a heading test.

**Required fix**: one locator and one create-if-absent step, shared by both call sites.

- `locateSection(content, marker)` matches the heading **at the start of a line** (`^## Recent Decisions\b`, multiline) and returns the section's bounds: from the heading up to the line break that precedes the next level-2 heading, or the end of the file. A word boundary — not end-of-line — follows the marker, so a hand-suffixed heading (`## Recent Decisions (last 5)`) is still the section (rebuilt to the canonical heading, as before), while text that merely mentions the heading is not one.
- `ensureSection(content, marker, statePath)` returns the located section, or first **creates** it: a heading-only section placed before the earliest present section that follows it in the template's order (`## Current Position`, `## Progress`, `## Recent Decisions`, `## Blockers`, `## Blocking Constraints`, `## Session Continuity`), else at the end of the file, with exactly one blank line on each side. The existing deterministic rebuild (§8.3) then fills it exactly as it fills a section that was always there. The `if (secStart !== -1)` guard is gone: an absent section can no longer skip the write.
- Creation is announced, not silent: a stderr notice and one `fix`-severity `STATE_SECTION_CREATED` diagnostic (DG-1), so the finalize digest lists it. It happens once — the next call finds the section and reports nothing.

```plaintext
BAD : const secStart = content.indexOf('## Recent Decisions');
      if (secStart !== -1) { /* rebuild */ }             // absent → silent no-op; quoted → corruption
GOOD: const sec = ensureSection(content, '## Recent Decisions', statePath);
      /* rebuild the block at sec.start … sec.end */      // absent → created, announced, filled
```

Creating the section, rather than warning and skipping, is the required behaviour and not a preference: both sections are wholly engine-owned (§8.3), so there is no hand-authored content to protect, and the caller's request is unambiguous. Warn-and-skip would still drop the entry and leave every affected file needing the manual repair the reporter performed. A heading of another level (`### Recent Decisions`) is not a section the engine writes and is not recognised; the H2 section is created beside it. Scope is the write sites of those two sections; the other places `updateState()` skips a write whose anchor is absent, and the line-cap guard's own locator, are §13.1 and §13.2.

### 13.1 The Same Defect, Unfixed in the Scalar-Field Loop and the Progress Recompute (SC-2) `[ADDED]`

§13 closed the two list sections and recorded, as Known Gaps, the two other writers with the same shape. The scalar-field loop (§6.1, §12.1) patches a field only when its line is found — `if (entryRe.test(content))`, nothing otherwise — and the `## Progress` recompute only when the fence is found (`if (existing)`, nothing otherwise). Neither announces the skip, and the CLI's closing line depends on neither.

The loss is not cosmetic. SC-2 makes the post-workflow update the guarantee that `Status`, the progress indicators and a recomputed `Next Action` reach `STATE.md`; SC-1 designates that `Next Action` the authoritative resume point; and `--handoff` is how `pause.md` leaves the pointer a later session resumes from. On a hand-trimmed file — the state §13 documents — each of those is accepted and dropped. Reproduced against engine 2.1.101 on a file holding only the header, `## Current Position` and `## Progress`: `--handoff` writes nothing (there is no `**Handoff File:**` line to patch); `--next-action` writes nothing once `## Current Position` is gone too; `--auto-progress` writes no counter when the fence is gone, nor when the `## Progress` heading is there with prose under it and no fence.

**§13's second manifestation, in the field patterns.** Every field pattern is unanchored — `/- \*\*Task:\*\* .*/` and its siblings match wherever the label occurs, not only at the start of a line. With the real field absent and its label quoted mid-line, the patch rewrites that line from the label onward. Verified against 2.1.101: a decision entry reading `set **Handoff File:** to none when the session ends`, patched with `--handoff`, became `set **Handoff File:** HANDOFF-X` — its tail destroyed, and the value recorded where no reader looks for it.

**Required fix**: the §13 rule, applied to the fields.

- **Anchor.** Every field pattern matches at the start of a line (`^…`, multiline), and so does the `## Progress` fence pattern. `wholeEntryRe()` takes the source and flags of the pattern it widens, so it inherits the anchor and nothing else about it changes. A field line that is indented or quoted is not a field, as a heading that is quoted is not a heading.
- **Create.** A requested field whose line is absent is created: before the earliest present field that follows it in template order within its container, else after the container's last non-blank line. The containers are the header block (`Workspace`, `Updated`, `Phase`, `Status`) — the text before the first level-2 heading — then `## Current Position` (`Task`, `Spec`, `Next Action`) and `## Session Continuity` (`Handoff File`, `Bootstrap Mode`). A container section the file lacks is created first by `ensureSection()` (§13), so `--next-action` on a file without `## Current Position` yields the section and the field. Field lines stay adjacent (no blank line appears between `**Phase:**` and `**Status:**`); a field that follows a heading or prose is set off by one blank line. The created line, and the separators around it, use the file's own line ending — unlike the list-section rebuilds, which have always written LF, this step adds no bare LF to a CRLF file, matching the scalar loop's existing CRLF discipline (§12.1).
- **`Updated` is the deliberate exception.** No caller requests it: `updateState()` injects a fresh timestamp into every call, including a call that patches nothing. It is refreshed where present and not created where absent — creating it would hand every hand-trimmed file a new line on the first call of any kind.
- **Progress.** When `computeProgress()` yields counters and the file has no `## Progress` heading, the section is created (`ensureSection()`) holding a fence with them. When the heading exists but no fence sits directly under it — the one shape §5's merge-not-clobber rule recognises — the block is left exactly as it is, since the engine cannot tell narrative from a counter block it never wrote; the skip is announced instead of silent.
- **Announce.** Fields created in one call are reported together on stderr and recorded as one `fix`-severity `STATE_FIELD_CREATED` diagnostic naming them; a `## Progress` block left alone is a `warning`-severity `PROGRESS_BLOCK_UNRECOGNISED`. Section creation keeps §13's `STATE_SECTION_CREATED`.

```plaintext
BAD : if (entryRe.test(content)) { content = content.replace(entryRe, () => line); }
      // absent → dropped; label quoted mid-line → the quoting line is rewritten
GOOD: if (entryRe.test(content)) { content = content.replace(entryRe, () => line); }
      else if (key !== 'updated') { content = ensureField(content, key, line, statePath); }
      // entryRe is line-anchored; an absent field is created at its template position
```

### 13.2 The Same Defect, Unfixed in the Line-Cap Guard (SC-1.2) `[ADDED]`

The guard (§7, §10, §12) located `## Recent Decisions` with the same `indexOf` §13 retired, and carried two more assumptions that the reported file shape breaks: that a heading follows the section (`secEnd !== -1` was required), and that the oldest entry's text can be found again in the file (`content.replace(entry + '\n', '')`).

**Boundary.** A file whose decisions section is its last — how a hand-trimmed file ends — was never pruned, and was told `already at its floor — nothing was pruned` while holding many entries. The message is false, and the cap it exists to hold is not held. Reproduced against 2.1.101: a 123-line file with 30 decision entries as its last section is reported exhausted and left unchanged.

**Removal.** `collectEntries()` splits on `\r?\n` and rejoins with `\n`, so for a CRLF file its entry text is not the file's text; and the `'\n'` appended to it is not the file's terminator for a last entry with no trailing newline. `content.replace(…)` then finds nothing, while `pruned = true` is set unconditionally: the guard prints `Pruned oldest decision` and records `STATE_DECISION_PRUNED` for a prune that did not happen. Reproduced against 2.1.101: a CRLF file over the cap, with decisions not last so the boundary defect is not in play, reports the prune and keeps its oldest entry. This is the CRLF gap recorded when §12.1 was investigated, and the unconditional `pruned = true` is why it reports success. A further consequence of matching by text: an entry duplicated earlier in the file would be removed in place of the oldest.

**Required fix**: locate with `locateSection()` (§13: anchored, bounded by the end of the file) and remove by **position**, not by text. `entryRanges(block, startRe)` is the entry grouping `collectEntries()` performs, returning each entry's `{start, end}` offsets within the block; it becomes the single grouping primitive and `collectEntries()` is derived from it, so the section rebuilds and the prune cannot disagree about where an entry ends. The guard deletes exactly the last range — the oldest entry, entries being newest-first — with its continuation lines and line terminators, and reports a prune only when it removed one.

## Regression Coverage

Per the finalize-pipeline coverage mandate ([l2-test-suite.md](l2-test-suite.md)), every fix needs a harness case:

- `addDecision`'s emitted section must be asserted by **shape**, not presence: the heading followed by a blank line, the comment preamble above the entries rather than below them, no consecutive blank runs, and template placeholder rows absent after the first real entry. The presence-only assertion this replaced must not return — leaving one in place preserves a test that passes under the defect it is meant to exclude (§8; closed by Phase 19, R12).
- `addDecision`/`addConstraint`, given an existing entry with an indented continuation line, must preserve that continuation intact and attached to its own entry across a rebuild; the line-cap guard's prune, given a wrapped oldest `## Recent Decisions` entry, must remove its continuation line along with its marker line, leaving no orphaned fragment (§12).
- `updateState()`'s scalar-field patch, given a field whose value is wrapped onto continuation lines, must replace the marker line **and** those continuation lines with the single new line — indented lines for every field, and additionally unindented (lazy) lines for the `- **Task:**` / `- **Spec:**` / `- **Next Action:**` list-item fields. The assertion must be whole-file equality (modulo the volatile `**Updated:**` timestamp), not a presence check: only equality fails on a surviving orphan *and* on a patch that swallowed a neighbouring line. Boundary cases must pin both edges: a header field leaves an unindented line under it untouched, and a list-item field stops at a blank line and at every stop-set member (bullet, ordered item, `**Label:**` field, heading, quote, table row, comment, code fence, thematic break) — a table-driven case, so that dropping any one member fails it. A CRLF fixture must be replaced whole without a bare LF appearing (§12.1).
- `addDecision` / `addConstraint`, given a `STATE.md` with no `## Recent Decisions` / `## Blocking Constraints` heading, must create the section and record the entry — asserted as whole-file equality (modulo the volatile `**Updated:**` timestamp and the entry's date), so the position, the single blank line on each side and the preamble are all pinned, not merely the entry's presence. Creation must emit the stderr notice and exactly one `STATE_SECTION_CREATED` diagnostic, and a second call must find the section it created and emit neither. Position: appended at the end of the file when nothing follows the section in template order; inserted before the earliest following section when something does. A file that only *quotes* the heading text inside another section's prose must keep that line byte-for-byte and still get a real section (§13, second manifestation). A CRLF file must get the same treatment, and a suffixed heading (`## Recent Decisions (last 5)`) must still be recognised rather than duplicated (§13).
- `updateState()`'s scalar-field patch, given a requested field with no line, must create it — asserted as whole-file equality (modulo the timestamp), so position and blank-line separation are pinned: before the earliest present following field when one exists, after the container's last line otherwise, in each of the three containers (header block, `## Current Position`, `## Session Continuity`), and with the container section itself created when the file lacks it. `Updated` must be refreshed where present and **not** created where absent. A second call must find the line it created and announce nothing. A field label quoted mid-line elsewhere must leave that line byte-for-byte and still get a real field. A CRLF file must gain the created line with no bare LF anywhere in the file (§13.1).
- `updateState()` with `autoProgress`, given counters and no `## Progress` heading, must create the section with a fence holding them; given a `## Progress` heading with no fence under it, it must leave the file untouched (modulo the timestamp) and announce the skip (§13.1).
- The line-cap guard, given a file over 100 lines, must prune the oldest `## Recent Decisions` entry — and only that entry — when the section is the file's last, with and without a trailing newline, when the heading text is also quoted earlier in the file, and when the file is CRLF; a wrapped oldest entry must go whole (§13.2). The guard must not report a prune it did not perform.

## Known Gaps Not Closed Here

None open. The register's one closure record for this file's defects is kept:

- **§8's coverage obligation is closed** `[MODIFIED]` — corrected from a prior claim that it was open. Phase 19 (R12) added the structural assertions §8.4 calls for: `dev/tests/engine.js`'s decision case now asserts the emitted section's shape (heading followed by a blank line, entries after the comment preamble, no consecutive-blank runs, no surviving `{YYYY-MM-DD}` placeholder rows), replacing the presence-only assertion that could not distinguish the defect from its fix. This entry previously read "open, not merely pending" — that was already false by the time it was written; both the fix (2.1.67) and its coverage (Phase 19) predate this correction.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/scripts/update-state.js` | Host of the decision-section rebuild and its sibling in `addConstraint` (§8, §8.5), `collectEntries()`, the entry-level grouping shared by both section rebuilds and the line-cap prune (§12), `wholeEntryRe()`, the whole-entry widening every scalar-field patch goes through (§12.1), `locateSection()`/`ensureSection()`, the line-anchored locator and create-if-absent step both list-section writers go through (§13), `ensureField()`, its counterpart for the scalar fields and the `## Progress` block (§13.1), and `entryRanges()`, the single entry-grouping primitive `collectEntries()` is derived from and the line-cap prune removes by (§13.2) |
| `.magic/templates/state.md` | Structure contract the rebuilt sections must match; source of the placeholder rows named in §8.2, and of the section order §13 creates an absent section by |
| `dev/tests/engine.js` | Regression harness carrying §12's, §12.1's, §13's, §13.1's and §13.2's cases and §8's structural assertions |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-20 | Agent | Initial Stable version. Extracted verbatim from [l2-finalize-state-accuracy.md](l2-finalize-state-accuracy.md) 1.8.0 at that register's 2.0.0 decomposition (`SPEC_DECOMPOSE`: 552 lines against the 500-line hard threshold): §8 (with §8.1–§8.5), §12 (with §12.1) and §13 (with §13.1, §13.2) under their permanent defect numbers, with the Regression Coverage bullets and the Known Gap closure record that belong to them. Per-defect history — the register's versions 1.0.0–1.8.0, in which each of these defects was found, specified and fixed — stays in the register's Document History. Reworded for the move: two place-bound phrases ("in this file" → "in the register", §8.1 and §12), and §8's Regression Coverage bullet restated as the requirement it is, its "Open obligation" label having been stale since Phase 19 (R12) closed it. Added: Overview, Motivation and Section Map, which the register carried once for all seventeen defects. `Stable` on creation via Trust Mode (C9) after Post-Update Review. |
