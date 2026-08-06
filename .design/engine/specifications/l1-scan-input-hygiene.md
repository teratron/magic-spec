# Scan Input Hygiene

**Version:** 1.1.0
**Status:** Stable
**Layer:** concept

## Overview

Defines how the engine's text scans must prepare their input before matching. A scan that searches markdown for a token has to separate a token that is **in force** from a token that is **under quotation** — a checklist item from a checklist item quoted in prose, a spec reference from a spec filename shown as an example, a link from a placeholder awaiting instantiation. Every scan that skips this step reports the documentation of a thing as an instance of the thing.

The rule is one line — *strip the quoting constructs, then match* — and its absence has now produced four separate defects in four unrelated subsystems.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Hosts the workflows that carry most of the affected scans.
- [l2-engine-finalization.md](l2-engine-finalization.md) - §6 fixed the first instance (archival eligibility) locally, before the pattern was recognized as general.
- [l2-engine-automation.md](l2-engine-automation.md) - Owns `check-prerequisites`, whose registry cross-reference is the open code-level instance.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Its detection surfaces scan product files for SDD tokens and are bound by SH-1; its §4.3 already carves out illustrative examples ad hoc.

## 1. Motivation

Four instances, four subsystems, one root cause. Listed in discovery order because the recurrence is the argument:

1. **Archival eligibility.** `phase-archiver.js` decided a phase was unfinished by testing `content.includes('- [ ]')` over the whole file. A phase whose Notes *discussed* checkbox detection was silently held back from archival. Fixed by stripping fenced blocks and code spans, then testing a line-anchored pattern — but the fix and its rationale were written into a single implementation spec section, as though the problem were local to that predicate.

2. **Registry cross-reference.** `check-prerequisites` extracts spec references from `PLAN.md` with `/specifications\/([^)]*\.md)/g` against raw file content. Writing a Backlog entry that *quoted* template placeholder paths produced `REGISTRY_MISMATCH` for a specification that does not and must not exist. Two defects compound here: no stripping (SH-1), and a capture bounded by `)` rather than by the filename's own grammar, so one match swallowed three comma-separated tokens at once (SH-4).

3. **Link integrity.** The ventilation link sweep reports every relative link in `.magic/templates/` as broken. It is not wrong about the filesystem — those targets genuinely do not resolve — but a template is a mold, not a document: its paths resolve only once instantiated into a user project (SH-3).

4. **Reference containment.** The containment scan searches product files for task IDs and phase designators. The engine's own test fixtures are full of literal task IDs written *as fixture data* — strings the harness writes into a temporary workspace to exercise the engine. Each audit has resolved these by hand. The containment spec carves out "illustrative examples of forbidden forms" in its own prose, which is this same rule discovered a third time and stated locally again.

The through-line: each fix was correct and each was scoped to its own site. A rule rediscovered four times is not four bugs.

## 2. Constraints & Assumptions

- Scans in this engine are of two kinds — **script scans** (a regex in a `.js` file) and **cognitive scans** (a match class stated in prose that an agent applies). This specification binds both; the prose *is* the implementation for the second kind.
- Stripping is lossy and that is intended: the stripped text is used **only** to decide matches. Reported line numbers and quoted context must come from the original text, or findings will point at the wrong place.
- Markdown quoting constructs in scope: fenced code blocks (triple-backtick and tilde), inline code spans, and — for resolution checks only — whole files that are templates.
- Not in scope: HTML comments, blockquotes, and link reference definitions. A token inside those is still asserted; only code constructs and template sources quote.

## 3. Core Invariants (Layer 1 only)

Rules that Layer 2 implementations MUST NOT violate:

- **SH-1 (Mention/Use Boundary)**: A scan that searches markdown for a token MUST NOT treat an occurrence inside a fenced code block or an inline code span as an instance of that token. Those constructs quote; they do not assert. This binds script scans and cognitive scans equally.
- **SH-2 (Strip Before Match)**: The exclusion MUST be applied by normalizing the input before matching, never by re-examining a match's surroundings afterwards. A match has already lost the context needed to classify it, so post-filtering can only guess; and the guess fails exactly where the stripping would have succeeded — inside nested or multi-line constructs.
- **SH-3 (Template Sources Are Molds)**: A check that resolves a reference — link targets, registry cross-references, path validity — MUST NOT evaluate template source files against the filesystem. A template's paths are placeholders that resolve at instantiation; measuring them before instantiation reports a design property as a defect. Templates remain in scope for checks that do not resolve (structure, required sections, forbidden content).
- **SH-4 (Bounded Capture)**: A token pattern MUST terminate at the token's own grammar boundary, not at an unrelated delimiter that happens to follow. A capture bounded by surrounding punctuation will, on a line containing several tokens, return one match spanning all of them — a finding that names a token nobody wrote.
- **SH-5 (One Rule, One Implementation)**: The strip step MUST have a single shared implementation per layer — one helper for script scans, one stated definition for cognitive scans. Independent copies of the same normalization drift apart, and the drift is invisible: each copy keeps passing its own tests while classifying the same input differently.

> L2 spec cannot reach RFC status until all invariants here are addressed in its "Invariant Compliance" section.

## 4. Enforcement Surfaces

| Surface | Kind | Bound by | State |
| --- | --- | --- | --- |
| Archival eligibility predicate | script | SH-1, SH-2 | Compliant — calls the shared `stripQuoted()` helper, then matches a line-anchored pattern |
| Registry cross-reference in the prerequisite check | script | SH-1, SH-2, SH-4 | Compliant — strips via the shared helper, then matches a filename-grammar-bounded capture |
| Link integrity sweep (ventilation) | cognitive | SH-3 | Compliant — `.magic/templates/` excluded from resolution by file role |
| Reference containment scan (ventilation) | cognitive | SH-1 | Compliant — the boundary is stated once as a precondition on the match-class list |
| Progress-counter classification | script | SH-4 | Compliant — the label set is closed to what the writer emits |
| Phase-checklist reader (`update-state.js`) | script | SH-1, SH-2 | Compliant — calls the shared `stripQuoted()` helper |

`stripQuoted()` (`.magic/scripts/lib/scan-hygiene.js`) is the SH-5 shared implementation for script scans; both compliant script rows above call it rather than carrying their own copy.

A surface added later is bound by default. The table records state, not scope: a scan is not exempt by omission.

Non-compliance is **advisory, never a HALT** — a scan that over-reports still runs, and blocking the audit over the audit's own precision would cost more than the false positives do. The consequence is a recorded finding routed to the normal pipeline, on the same terms as any other advisory. One exception inverts this: a scan whose false positive **suppresses an action the user requested** is a defect, not noise, and is treated at the severity of the action it blocked. Archival eligibility was that case — the finding never surfaced anywhere, so the only symptom was a phase that quietly failed to archive.

## 5. Detailed Design

### 5.1 The Normalization

```plaintext
strip(markdown) =
    remove fenced code blocks   (``` … ```  and  ~~~ … ~~~)
    then remove inline spans    (` … `)
    preserve line count         (replace with blank lines, do not delete lines)
```

Line-count preservation is what keeps findings addressable: a scan that reports `{file}:{line}` must be able to map a match in stripped text back to the original. Removing lines outright breaks that mapping silently — the scan still works, the line numbers just quietly stop being true.

Order matters. Fenced blocks are removed first because a fence may contain backtick sequences that would otherwise be read as span delimiters and swallow text past the fence.

### 5.2 Resolution Checks and Templates

```plaintext
for each reference in file:
    if file is a template source:
        skip resolution        (SH-3 — placeholders resolve at instantiation)
    else:
        resolve against filesystem
```

The exclusion is by **file role**, not by whether a particular path looks like a placeholder. Placeholder syntax varies (`{name}`, `<name>`, `NAME`), and a heuristic on the target string will both miss real placeholders and skip real broken links. The file's role is unambiguous and cheap to determine.

### 5.3 What Stripping Does Not Solve

A token can be quoted without any markdown construct around it — a task ID written as fixture data inside a string literal, an example filename in ordinary prose. SH-1 does not reach those, and no amount of normalization will: the distinction is semantic, not syntactic.

For those, the containing specification states its own carve-out and the audit applies judgment — which is the current practice and remains correct. The self-containment test is the tool: if the token still means something once its referent is deleted, it is not a reference. SH-1's contribution is to remove the syntactic cases entirely, so judgment is spent only where judgment is actually required.

## 6. Implementation Notes

1. Extract the strip step into a shared helper and re-point the archival predicate at it — a refactor with existing regression coverage, so it validates the helper before anything depends on it.
2. Bind the registry cross-reference: strip, then narrow the capture to the filename grammar (SH-4). Its regression case is the one this specification was written from.
3. Amend the ventilation link check to exclude template sources (SH-3) — prose, no script.
4. State SH-1 once in the containment scan's match-class preamble, replacing the local carve-out with a reference to it.
5. Steps 2-4 modify engine files → C14 applies at implementation time.

## 7. Drawbacks & Alternatives

- **Fix each site as it is found** — the status quo, rejected on evidence: it has now been done three times, and the fourth site was found by tripping over it while documenting the third. Each local fix was correct and none of them generalized.
- **Parse markdown into an AST and query nodes** — rejected. It is the technically superior answer and disproportionate here: it introduces a parser dependency into a stack-agnostic engine that currently ships with none, to serve scans whose entire logic is one regex each. The strip step captures the same distinction for these inputs at a fraction of the cost.
- **Drop the stripping and accept false positives as advisory noise** — rejected. The archival instance was not noise: it silently suppressed an action the user had asked for, and stayed invisible precisely because the finding never surfaced. A false positive that changes behavior is a defect regardless of the severity label attached to it.
- **Drawback**: stripping and matching over different strings means every scan must keep both, and a scan that reports positions from the stripped copy will be wrong without failing. §5.1 makes line-count preservation mandatory for this reason, but nothing enforces it structurally — it stays a review-time concern.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ARCHIVER]` | `.magic/scripts/lib/phase-archiver.js` | Hosts the compliant strip-then-match predicate; the shared helper is extracted from here |
| `[PREREQ]` | `.magic/scripts/check-prerequisites.js` | Hosts the non-compliant registry cross-reference (SH-1, SH-4) |
| `[VENTILATION]` | `.magic/analyze.md` | Hosts the cognitive scans: link integrity (SH-3) and reference containment (SH-1) |
| `[TEMPLATES]` | `.magic/templates/` | The template source directory whose role triggers the SH-3 exclusion |
| `[HARNESS]` | `dev/tests/engine.js` | Regression home for the shared helper and each bound script scan |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.1.0 | 2026-08-07 | Agent | §4 enforcement-surface table updated to Compliant across all rows: the shared `stripQuoted()` helper (SH-5) now backs both script scans, the link-integrity sweep excludes `.magic/templates/` (SH-3), and the containment scan states SH-1 once as a match-class precondition instead of a local carve-out. New row for the phase-checklist reader, previously undocumented as a strip-copy site. Implements Phase 17. |
| 1.0.0 | 2026-08-06 | Agent | Initial Stable. Defines SH-1..SH-5 after the same root cause produced a fourth defect in a fourth subsystem: archival eligibility (fixed locally), the registry cross-reference (open — found by writing a Backlog entry that quoted placeholder paths and watching the checker report a nonexistent spec), the ventilation link sweep against template sources (open), and the reference containment scan against fixture literals (handled ad hoc per audit). Records the enforcement-surface table with per-surface compliance state, and §5.3's boundary: stripping removes the syntactic cases so that judgment is spent only on the semantic ones. |
