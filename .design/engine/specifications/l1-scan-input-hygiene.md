# Scan Input Hygiene

**Version:** 1.3.0
**Status:** Stable
**Layer:** concept

## Overview

Defines how the engine's text scans must prepare their input before matching. A scan that searches markdown for a token has to separate a token that is **in force** from a token that is **under quotation** — a checklist item from a checklist item quoted in prose, a spec reference from a spec filename shown as an example, a link from a placeholder awaiting instantiation. Every scan that skips this step reports the documentation of a thing as an instance of the thing.

The rule is one line — *strip the quoting constructs, then match* — and its absence has now produced four separate defects in four unrelated subsystems.

The rule also has an edge. It answers *is this construct in force?* — an open checkbox, a registry link, a counter — and for that question a quoted occurrence is a mention by definition. It does not answer *does this string ship?*, the question a containment scan asks, where a quoted occurrence is still in the file a reader will open. SH-6 draws the line; applying SH-1 across it made one scan blind to the notation documentation uses most.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Hosts the workflows that carry most of the affected scans.
- [l2-engine-finalization.md](l2-engine-finalization.md) - §6 fixed the first instance (archival eligibility) locally, before the pattern was recognized as general.
- [l2-engine-automation.md](l2-engine-automation.md) - Owns `check-prerequisites`, whose registry cross-reference was only half-closed: the PLAN.md-facing extraction is bound, the INDEX.md-facing extraction (and two structurally identical sibling call sites in the same file) are not.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Its detection surfaces scan product files for SDD tokens and are bound by SH-6 (SH-1 over the engine's own authored files); RC-2.2 states the consequence, and its §4.3 already carves out illustrative examples ad hoc.
- [l2-test-suite.md](l2-test-suite.md) - Coverage of the quoting boundary (shipped-text contract coverage).

## 1. Motivation

Four instances, four subsystems, one root cause. Listed in discovery order because the recurrence is the argument:

1. **Archival eligibility.** `phase-archiver.js` decided a phase was unfinished by testing `content.includes('- [ ]')` over the whole file. A phase whose Notes *discussed* checkbox detection was silently held back from archival. Fixed by stripping fenced blocks and code spans, then testing a line-anchored pattern — but the fix and its rationale were written into a single implementation spec section, as though the problem were local to that predicate.

2. **Registry cross-reference.** `check-prerequisites` extracts spec references from `PLAN.md` with `/specifications\/([^)]*\.md)/g` against raw file content. Writing a Backlog entry that *quoted* template placeholder paths produced `REGISTRY_MISMATCH` for a specification that does not and must not exist. Two defects compound here: no stripping (SH-1), and a capture bounded by `)` rather than by the filename's own grammar, so one match swallowed three comma-separated tokens at once (SH-4). The fix that landed bound only the `PLAN.md`-reading half of this check. The same file runs the identical unbounded, unstripped pattern three more times — reading `INDEX.md` to build the `GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC` set, reading a spec file's own `**Implements:**` line, and re-reading `INDEX.md` for header-parity lookups — none of which route through the bounded pattern or the shared strip helper. A field report against engine 2.1.70 hypothesized exactly this: a bare `specifications/` mention in prose, unclosed on the same token, lets `[^)]*` run forward past a newline to the next unrelated `)` in the document. §4 catalogs the three still-open sites.

3. **Link integrity.** The ventilation link sweep reports every relative link in `.magic/templates/` as broken. It is not wrong about the filesystem — those targets genuinely do not resolve — but a template is a mold, not a document: its paths resolve only once instantiated into a user project (SH-3).

4. **Reference containment.** The containment scan searches product files for task IDs and phase designators. The engine's own test fixtures are full of literal task IDs written *as fixture data* — strings the harness writes into a temporary workspace to exercise the engine. Each audit has resolved these by hand. The containment spec carves out "illustrative examples of forbidden forms" in its own prose, which is this same rule discovered a third time and stated locally again.

The through-line: each fix was correct and each was scoped to its own site. A rule rediscovered four times is not four bugs.

**The edge, found by measurement rather than by a defect report.** The fourth instance was closed in 1.1.0 by stating SH-1 as a blanket precondition of the containment scan, and the statement over-reached: the containment specification's carve-out for illustrations (RC-9, RC-3) is semantic and narrow, while SH-1 is syntactic and broad, so item 4's "the same rule" held only for the fixture half of it (the carve-out itself is the semantic judgment of §5.3). Measured on the tracked product markdown of five consumer projects (README, CHANGELOG and documentation pages; the contributor-instruction files are left out as exempt under RC-8), by four of the containment scan's unconditional match classes (`.design/` paths, task IDs, `phase-N` file forms, `PLAN.md` / `TASKS.md` names): 279 matches, 92 of them inside a code span or a fence (29 `.design/` paths, 57 `phase-N` file forms, 5 `PLAN.md` / `TASKS.md` names, 1 task ID) — one in seven (35 of 221) when the `phase-N` form, the one class that can be ordinary vocabulary, is set aside. In two of the five projects every match is quoted, so the scan as shipped reports nothing for them; in a third, three of four are. No quoted match sits on a line that carries an illustration cue (`e.g.`, `example`, `BAD`, `forbidden`, `leak`), and 75 of the 92 sit on list-item lines — the shape of a changelog entry or a pointer, not of a worked example. The count is of notation, not of confirmed leaks: it shows that the exemption is in the way, not what stands behind it. Had they been unquoted, the same matches would have been findings by the scan's own definition.

## 2. Constraints & Assumptions

- Scans in this engine are of two kinds — **script scans** (a regex in a `.js` file) and **cognitive scans** (a match class stated in prose that an agent applies). This specification binds both; the prose *is* the implementation for the second kind.
- Stripping is lossy and that is intended: the stripped text is used **only** to decide matches. Reported line numbers and quoted context must come from the original text, or findings will point at the wrong place.
- Scans also differ in what a finding asserts. A **construct-in-force** scan asks whether a thing is live in the document's own logic (an open checkbox, a registry link, a counter); a **token-presence** scan asks whether a string is in a deliverable (reference containment). SH-1..SH-5 bind the first kind; SH-6 binds the second, and SH-1 reaches it only where the file is the engine's own.
- Markdown quoting constructs in scope: fenced code blocks (triple-backtick and tilde), inline code spans, and — for resolution checks only — whole files that are templates.
- Not in scope: HTML comments, blockquotes, and link reference definitions. A token inside those is still asserted; only code constructs and template sources quote.

## 3. Core Invariants (Layer 1 only)

Rules that Layer 2 implementations MUST NOT violate:

- **SH-1 (Mention/Use Boundary)**: A scan that searches markdown for a **construct in force** MUST NOT treat an occurrence inside a fenced code block or an inline code span as an instance of that construct. Those constructs quote; they do not assert. This binds script scans and cognitive scans equally. A scan whose finding is a token's *presence in a deliverable* is bound by SH-6 instead.
- **SH-2 (Strip Before Match)**: The exclusion MUST be applied by normalizing the input before matching, never by re-examining a match's surroundings afterwards. A match has already lost the context needed to classify it, so post-filtering can only guess; and the guess fails exactly where the stripping would have succeeded — inside nested or multi-line constructs.
- **SH-3 (Template Sources Are Molds)**: A check that resolves a reference — link targets, registry cross-references, path validity — MUST NOT evaluate template source files against the filesystem. A template's paths are placeholders that resolve at instantiation; measuring them before instantiation reports a design property as a defect. Templates remain in scope for checks that do not resolve (structure, required sections, forbidden content).
- **SH-4 (Bounded Capture)**: A token pattern MUST terminate at the token's own grammar boundary, not at an unrelated delimiter that happens to follow. A capture bounded by surrounding punctuation will, on a line containing several tokens, return one match spanning all of them — a finding that names a token nobody wrote.
- **SH-5 (One Rule, One Implementation)**: The strip step MUST have a single shared implementation per layer — one helper for script scans, one stated definition for cognitive scans. Independent copies of the same normalization drift apart, and the drift is invisible: each copy keeps passing its own tests while classifying the same input differently.
- **SH-6 (Quoting Does Not Un-Ship a Token)**: A scan whose finding is that a token *ships* — it stands in a file a reader of the release will open — MUST NOT drop an occurrence for sitting inside a fenced code block or an inline code span. Documentation names a thing by quoting it: a path in backticks is the pointer a reader follows, and a command in a fence is the one a reader runs; quoting removes neither from the artifact. Such an occurrence is **reported** — in the scan's contextual sub-list when it reads as an illustration of the token rather than a use of it, judged by the self-containment test — and never silently skipped. One population is exempt: the engine's own authored files in its own repository. They are written *about* the SDD layer, so quoting there overwhelmingly means speaking about the token, and SH-1's precondition keeps its force over them (the generic paths they may legitimately name are already allowed, RC-9). Everything else, any text a consumer project authors in particular, is bound by this invariant. Ambiguity resolves toward reporting: a reported illustration costs one triage line, a skipped pointer costs a dead reference in a release, and the second is silent.

> L2 spec cannot reach RFC status until all invariants here are addressed in its "Invariant Compliance" section.

## 4. Enforcement Surfaces

| Surface | Kind | Bound by | State |
| --- | --- | --- | --- |
| Archival eligibility predicate | script | SH-1, SH-2 | Compliant — calls the shared `stripQuoted()` helper, then matches a line-anchored pattern |
| Registry cross-reference — `PLAN.md` → spec extraction | script | SH-1, SH-2, SH-4 | Compliant — strips via the shared helper, then matches a filename-grammar-bounded capture |
| Registry cross-reference — `INDEX.md` → spec extraction (`GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC`) | script | SH-1, SH-4 | Non-compliant — reads raw `indexContent` with the pre-fix `/specifications\/([^)]*\.md)/g`; `[^)]` does not exclude newlines, so a mention with no immediate closing `)` runs the capture past the paragraph it started in |
| Layer Integrity — L2 parent lookup (`RULE_57_VIOLATION`) | script | SH-1, SH-4 | Non-compliant — same unbounded pattern, applied to `INDEX.md` rows and to the child spec's `**Implements:**` field |
| Header parity — `INDEX.md` row → spec-file lookup (`VERSION_DRIFT`/`STATUS_DRIFT`) | script | SH-1, SH-4 | Non-compliant — same unbounded pattern, applied per `INDEX.md` line |
| Link integrity sweep (ventilation) | cognitive | SH-3 | Compliant — `.magic/templates/` excluded from resolution by file role |
| Reference containment scan (ventilation) | cognitive | SH-6 (SH-1 in the engine's own files only) | Non-compliant — `.magic/analyze.md` step 6 states SH-1 as a blanket precondition on the match-class list, so a code-quoted occurrence in a consumer's product markdown matches no class (§6 item 7) |
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

The converse holds as well, and is what SH-6 guards: a token can sit inside a markdown construct without being quoted in the semantic sense. A path in backticks in a README names a file the reader is meant to open; stripping it calls a use a mention. For a construct-in-force scan that error cannot occur — a checkbox inside a code span is not a checkbox. For a token-presence scan it is the whole risk, because the syntax decides nothing about what the passage does with the token. There the syntactic cases are not removed but **reclassified**: reported, with the contextual sub-list already holding the class of hits that need the self-containment test.

## 6. Implementation Notes

1. Extract the strip step into a shared helper and re-point the archival predicate at it — a refactor with existing regression coverage, so it validates the helper before anything depends on it.
2. Bind the registry cross-reference: strip, then narrow the capture to the filename grammar (SH-4). Its regression case is the one this specification was written from. *(Done for the `PLAN.md`-reading half only — see item 6.)*
3. Amend the ventilation link check to exclude template sources (SH-3) — prose, no script.
4. State SH-1 once in the containment scan's match-class preamble, replacing the local carve-out with a reference to it. *(Rescoped by item 7: the preamble now names the population SH-1 governs.)*
5. Steps 2-4 modify engine files → C14 applies at implementation time.
6. **Remaining**: bind the three `INDEX.md`-side sites in `check-prerequisites.js` (§4) to the same `stripQuoted()` + filename-grammar capture already validated on the `PLAN.md` side — hoist `specFilenameRe` to a module-level constant per SH-5 (one implementation, not four copies of the literal pattern) and re-point the registry-cross-reference, Layer Integrity, and header-parity reads at it. Regression: extend the existing `PLAN.md`-quoting test case in `[HARNESS]` with an `INDEX.md` Meta Information bullet that mentions `specifications/` in prose without a markdown link, asserting no `GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC` finding is produced from it. Modifies an engine file → C14 applies at implementation time.
7. **Rescope the containment scan's precondition (SH-6).** `.magic/analyze.md` step 6 states the SH-1 precondition for the engine's own repository only, and states for a consumer project that a code-quoted occurrence in a product markdown file is reported — in the contextual sub-list when it reads as an illustration, under the self-containment test. The containment specification's detection heuristic and RC-2.1 carry the matching text ([l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) 1.7.0); the harness pins the shipped step ([l2-test-suite.md](l2-test-suite.md), shipped-text contract coverage). Modifies an engine file → C14 applies at implementation time.

## 7. Drawbacks & Alternatives

- **Fix each site as it is found** — the status quo, rejected on evidence: it has now been done three times, and the fourth site was found by tripping over it while documenting the third. Each local fix was correct and none of them generalized.
- **Parse markdown into an AST and query nodes** — rejected. It is the technically superior answer and disproportionate here: it introduces a parser dependency into a stack-agnostic engine that currently ships with none, to serve scans whose entire logic is one regex each. The strip step captures the same distinction for these inputs at a fraction of the cost.
- **Drop the stripping and accept false positives as advisory noise** — rejected. The archival instance was not noise: it silently suppressed an action the user had asked for, and stayed invisible precisely because the finding never surfaced. A false positive that changes behavior is a defect regardless of the severity label attached to it.
- **Keep SH-1 as the one markdown rule, containment included** — the 1.1.0 position, rejected on the measurement in §1: it removes the most common notation from the scan, and does it silently. The cost of the alternative is a longer contextual sub-list; the cost of this one is a dead reference nobody is told about.
- **Report quoted occurrences everywhere, the engine's own files included** — rejected. The engine's shipped markdown is written *about* the SDD layer; there a quoted `.design/` path or a quoted task-ID pattern is the subject, RC-9 already admits the generic forms, and reporting them all would bury the occasional real hit under vocabulary. The line is drawn by who authored the text, which is a fact the scan has (it already skips the engine directories in a consumer project), not by a judgment per occurrence.
- **Parse the markdown and classify each quoted node by what its paragraph does with it** — rejected for the reason given above to the AST option: a parser dependency in a stack-agnostic engine, to settle a question the self-containment test already settles at the one place it is needed.
- **Drawback**: stripping and matching over different strings means every scan must keep both, and a scan that reports positions from the stripped copy will be wrong without failing. §5.1 makes line-count preservation mandatory for this reason, but nothing enforces it structurally — it stays a review-time concern.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ARCHIVER]` | `.magic/scripts/lib/phase-archiver.js` | Hosts the compliant strip-then-match predicate; the shared helper is extracted from here |
| `[PREREQ]` | `.magic/scripts/check-prerequisites.js` | Hosts the compliant `PLAN.md`-side extraction (line ~144) and the three still-non-compliant `INDEX.md`-side sites (SH-1, SH-4): registry cross-reference (~line 146), Layer Integrity parent lookup (~lines 208, 219), header-parity lookup (~line 310) |
| `[VENTILATION]` | `.magic/analyze.md` | Hosts the cognitive scans: link integrity (SH-3) and reference containment (SH-1) |
| `[TEMPLATES]` | `.magic/templates/` | The template source directory whose role triggers the SH-3 exclusion |
| `[HARNESS]` | `dev/tests/engine.js` | Regression home for the shared helper and each bound script scan |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.3.0 | 2026-10-11 | Agent | New **SH-6 (Quoting Does Not Un-Ship a Token)** and the **construct-in-force / token-presence** distinction it rests on. SH-1 is rescoped to the first kind of scan; the containment scan, the one token-presence scan, reports a code-quoted occurrence in a consumer's product markdown (contextual sub-list when it reads as an illustration) and keeps the SH-1 precondition only for the engine's own authored files. 1.1.0 had stated SH-1 as a blanket precondition of that scan and recorded it as compliant; measured on five consumer projects' tracked product markdown, 92 of 279 matches sit in code constructs, all of a project's matches in two of the five — so the §4 row now reads non-compliant until the shipped step is rescoped (§6 item 7). §1 gained the measurement and corrected item 4's claim that the containment carve-out and SH-1 are one rule (the carve-out is the semantic judgment of §5.3), §5.3 gained the converse of its last paragraph, §7 three rejected alternatives. Reasoning follows the rule that a suppression added to cut noise must not hide a finding of the kind it was added beside: the quoted form is reclassified, not removed. Source: a reference-mining pass over an external security scanner for agent configurations, recorded here by class only; no copy of any project's text was taken, only counts. Specification only; engine deployment is routed to `/magic.task engine`. Status reverted `Stable → RFC` (Amendment Rule, minor); Post-Update Review found two defects, fixed before promotion — SH-6 first scoped itself by "text the scanned project authors", which in the engine's own repository includes the very files it exempts (the exemption is now stated as a population, not as an authorship test), and the evidence named the scan's match classes without saying that four of them were measured — then re-promoted to `Stable` in the same invocation. |
| 1.2.0 | 2026-08-07 | Agent | Corrected an overstated 1.1.0 compliance claim (also self-contradicted by this file's own `[PREREQ]` Canonical Reference, which had continued to read "non-compliant"): the registry-cross-reference fix bound only `check-prerequisites.js`'s `PLAN.md`-reading half. Re-traced the script and found three sibling call sites still on the pre-fix unbounded `/specifications\/([^)]*\.md)/g` pattern — the `INDEX.md`-side registry extraction, the Layer Integrity parent lookup, and the header-parity lookup — none stripped (SH-1), none filename-grammar-bounded (SH-4). §4 table split into the compliant and three non-compliant rows; §1 item 2, Related Specifications, and Canonical References brought into agreement; §6 gained the remaining-work item. Prompted by a field report against engine 2.1.70 describing corrupted `GHOST_REGISTRY`/`NAMING_VIOLATION`/`ORPHANED_SPEC` messages; the report's specific symptom did not reproduce against this repository's current `INDEX.md` content (no bare `specifications/` mention exists there today), but the regex defect it hypothesized is real and confirmed by inspection. Status reverted `Stable → RFC` (Amendment Rule); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.1.0 | 2026-08-07 | Agent | §4 enforcement-surface table updated to Compliant across all rows: the shared `stripQuoted()` helper (SH-5) now backs both script scans, the link-integrity sweep excludes `.magic/templates/` (SH-3), and the containment scan states SH-1 once as a match-class precondition instead of a local carve-out. New row for the phase-checklist reader, previously undocumented as a strip-copy site. Implements Phase 17. |
| 1.0.0 | 2026-08-06 | Agent | Initial Stable. Defines SH-1..SH-5 after the same root cause produced a fourth defect in a fourth subsystem: archival eligibility (fixed locally), the registry cross-reference (open — found by writing a Backlog entry that quoted placeholder paths and watching the checker report a nonexistent spec), the ventilation link sweep against template sources (open), and the reference containment scan against fixture literals (handled ad hoc per audit). Records the enforcement-surface table with per-surface compliance state, and §5.3's boundary: stripping removes the syntactic cases so that judgment is spent only on the semantic ones. |
