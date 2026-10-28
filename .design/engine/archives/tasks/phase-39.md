---
phase: 39
name: "Registry Text Contract & Question Routing Deployment"
status: Done
subsystem: "rules, .magic (spec.md, task.md, templates), docs, dev/tests, .design (this workspace's registry and task ledger)"
requires:
  - "The registry text contract (l2-engine-templates 1.3.0 §5.2, §5.3), the question routing (l2-spec-graph-memory 1.2.0 §4.5) and their coverage (l2-test-suite 1.27.0): all Stable at registry 1.40.0"
  - "The body navigation contract (Phase 38): spec.md and task.md keep a contents list naming every ## heading and the pointer that applies context.md whole, so edits here add or remove no heading"
  - "dev/scripts/mutation-check.js (Phase 37): the driver that controls every new assertion"
provides:
  - "The registry Description form in the engine: spec.md registers a Description (what the specification is for and when to open it, at most two sentences, no history, inventory or stale figure), amends it only when what or when changed and then rewrites the whole cell, never appends; the three registry and ledger templates carry the form as a comment at the placeholder; docs/spec.md and docs/task.md state it"
  - "The task-ledger overview rule in task.md: it describes the ledger and tracks nothing; nobody appends to it or rewrites it as the plan moves"
  - "Question routing in rules/magic.md §2: structure to the graph and the wiki, a mechanic named in a question to a search of the specification text; the twin under .agents/rules/ recreated as a hardlink"
  - "This workspace rewritten once by its own rule: 36 of 37 registry descriptions (median 387 -> 211 characters, maximum 1,448 -> 272), the ledger overview 27,260 -> 449 characters; every other registry cell byte-identical, graph unchanged"
  - "Harness 174 -> 178 (four shipped-text cases, 20 mutations all caught); cognitive suite T264-T266; engine 2.1.134 -> 2.1.136 (two C14)"
key_files:
  created: []
  modified:
    - "rules/magic.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/templates/workspace-index.md"
    - ".magic/templates/global-index.md"
    - ".magic/templates/tasks.md"
    - "docs/spec.md"
    - "docs/task.md"
    - "dev/tests/engine.js"
    - "dev/tests/suite.md"
    - ".design/engine/INDEX.md"
    - ".design/engine/TASKS.md"
patterns_established:
  - "Run the cognitive case against the text that ships, not against the specification's intent: the gaps (a dropped clause, over-specified Expected lines) show only there"
  - "A deletion of accumulated narrative is gated by two screens of different strength plus a hand check of distinctive facts; neither screen alone is evidence"
  - "A rewrite of hand-written cells is applied from one map by a script that keeps every other cell of the row byte-identical and is proved by swapping the old text back in"
  - "A hardlink pair edited in place is repaired by recreating the link and verifying hashes before anything else reads it"
duration_minutes: ~
---

# Stage 39 Tasks — Registry Text Contract & Question Routing Deployment

**Phase:** 39
**Status:** Done
**Strategic Goal:** Deploy three amended specifications: the form of the two hand-written registry texts ([l2-engine-templates.md](../specifications/l2-engine-templates.md) 1.3.0 §5.2, §5.3), the routing of structural and content questions ([l2-spec-graph-memory.md](../specifications/l2-spec-graph-memory.md) 1.2.0 §4.5) and the coverage that holds them ([l2-test-suite.md](../specifications/l2-test-suite.md) 1.27.0). Order matters: the routing clause lands before the authoring instructions (spec §5.3, order of adoption), because a short registry cell is safe only once a content question has its own route; the registry and ledger of this workspace are rewritten last, by the rule the engine now carries.

## Atomic Checklist

- [x] [T-39A01] `rules/magic.md` §2: a content question goes to the specification text, a structural one to the graph ([C-001])
- [x] [T-39A02] `.magic/spec.md`: register the registry `Description` and amend it only when what or when changed
- [x] [T-39A03] `.magic/task.md`: the ledger overview describes the ledger
- [x] [T-39A04] Templates: the form of the hand-written text at its placeholder
- [x] [T-39A05] Docs: one line each in `docs/spec.md` and `docs/task.md`
- [x] [T-39B01] Validation: harness pins for the five surfaces, with mutation controls
- [x] [T-39C01] Validation: cognitive cases for registry text and question routing
- [x] [T-39D01] `TASKS.md` of this workspace: the overview describes the ledger
- [x] [T-39D02] This workspace's registry: rewrite the 14 L1 `Description` cells
- [x] [T-39D03] This workspace's registry: rewrite the 23 L2 `Description` cells
- [x] [T-39D04] Validation: the rewritten registry meets the form and nothing else changed
- [x] [T-39T01] Validation: harness, scans, hardlinks, docs sync; single C14 bump
- [x] [T-39T02] Validation: run the new cognitive cases against the shipped text

## Detailed Tracking

### [T-39A01] `rules/magic.md` §2: a content question goes to the specification text, a structural one to the graph ([C-001])

- **Spec:** l2-spec-graph-memory.md §4.5; l2-engine-templates.md §5.3 (order of adoption)
- **Status:** Done
- **Changes:** `rules/magic.md` §2 Auto-Use: the first bullet keeps the graph route for architectural, cross-module and "how does X relate to Y" questions and drops "what covers Z" from it; the second bullet says the wiki is navigated for structure, that the graph and the wiki hold no specification text, and that a question naming a mechanic ("what covers Z", "where is P defined") is answered by searching `.design/{workspace}/specifications/` and reading the matching section. 7 lines added, 4 removed (net +3, file 498 → 501); no specification file, section, phase or task ID added (the one `.design/…` path in the diff was already in the replaced line). The twin was stale after the edit (hashes differed) and was recreated as a hardlink of `rules/magic.md`: `fsutil hardlink list` shows both paths, `Get-FileHash` equal, `validate-hardlinks.js` exit 0. No C14: `rules/` is outside it.
- **Assignment:** Agent
- **Verify:** §2 Auto-Use of `rules/magic.md` no longer sends every "what covers Z" question to the graph. A structural question (what depends on X, how X relates to Y, which specifications are load-bearing, what is orphaned) keeps the graph and wiki route; a question that names a mechanic ("which specification covers M") is routed to a search of the specification text (`.design/{workspace}/specifications/`) followed by a read of the matching section; the same place states that the graph and the wiki hold structure and no specification text. The edit adds at most 4 lines (the file is always-on and 498 lines long) and names no specification file, section number, phase or task ID. The twin under `.agents/rules/` is the same file: `fsutil hardlink list rules\magic.md` lists both paths, `Get-FileHash` of the two is equal and `node dev/scripts/validate-hardlinks.js` exits 0 after the edit; a write that replaced the inode is repaired by recreating the link (**[C-001]**). No C14 bump: `rules/` is outside its tracking.
- **Handoff:** T-39A02 follows (order of adoption); T-39B01 pins the routing sentence.
- **Notes:** The highest-sensitivity text of the phase: the file is loaded in every session of every project that installed the engine, and the clause being split is the current "Before architectural / cross-module / "how does X relate to Y" / "what covers Z" questions, run build-spec-graph". Keep that for the structural half and add the content half beside it; do not weaken the CAUTION block or §9 (consumer guards stay intact, AGENTS.md §0 item 5). Both Write and Edit break the hardlink here, so edit once, then check the link.

### [T-39A02] `.magic/spec.md`: register the registry `Description` and amend it only when what or when changed

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Done
- **Changes:** `.magic/spec.md`, three lines: Creating a New Specification step 2 now registers `Name, Status, Layer, Version, Description` and adds one sentence on the form (what the specification is for and when to open it, at most two sentences, no change history, no list of sections or invariants, no stale figure; a router, not an index of contents, with the content question answered by searching the specification text); Updating an Existing Specification, Sync, changes the `Description` only when what or when changed, otherwise byte-identical, with the amendment going to Document History (Versioning above); the Task Completion Checklist registry line names the `Description` and its condition. `git diff -U0` shows exactly those three hunks; no heading added or removed (0 changed heading lines), `wc -l` 366; the added-line scan for task IDs, phase designators, specification file names and section signs prints nothing; the harness is 174/174 on the live tree (the contents-list and pointer cases included).
- **Assignment:** Agent
- **Verify:** Creating a New Specification, step 2, registers the `Description` with Name, Status, Layer and Version and states its form in one or two lines: what the specification is for and when to open it, at most two sentences, no change history, no list of sections or invariants, no figure that goes stale; and that a content question is answered by searching the specification text, so the cell is not an index. Updating an Existing Specification, Sync, changes the `Description` only when what the specification is for, or when to open it, changed, leaves it byte-identical otherwise and sends the amendment to the specification's Document History. The Task Completion Checklist registry line names the `Description`. `git diff -U0 .magic/spec.md` touches only those three places; no `##` heading is added or removed, so the contents list still matches (`node --test dev/tests/engine.js --test-name-pattern "contents"` green) and `wc -l` stays at most 500. The added-line containment scan over the diff prints nothing: no specification file, section number, phase or task ID.
- **Handoff:** T-39B01 pins the three statements.
- **Notes:** An L1 file under C14 (one bump at T-39T01) and, with T-39A01, the highest blast radius of the phase: every `/magic.spec` run reads it. The new sentences must not make an existing step conditional or longer than it is; the registration step is a one-line list today. The instruction is guidance, not a gate: no HALT, no refusal (spec §2).

### [T-39A03] `.magic/task.md`: the ledger overview describes the ledger

- **Spec:** l2-engine-templates.md §5.3 rule 3
- **Status:** Done
- **Changes:** `.magic/task.md`, Plan Write-back: the TASKS.md bullet gains two sentences — the `Overview` says what the file is and how to read it and tracks nothing (the active phase is the phase table's status column; what a finished phase produced lives in its phase file, the workspace changelog and the archive), and nobody appends to it or rewrites it as the plan moves. One hunk (line 127); no heading added or removed; `wc -l` 191; the contents list and the pointer to `context.md` untouched; the added-line scan prints nothing. `run.md` is not edited (the specification dropped that surface).
- **Assignment:** Agent
- **Verify:** The TASKS.md bullet of Plan Write-back states that the Overview says what the file is and how to read it and tracks nothing: which phase is active is the status column of the phase table, and what a finished phase produced is recorded in its phase file, the workspace changelog and the archive; nobody appends to it and no step rewrites it as the plan moves. `git diff -U0 .magic/task.md` shows that bullet only; the contents list and the pointer to `context.md` are untouched; `wc -l` at most 500; the added-line containment scan prints nothing.
- **Handoff:** T-39B01 pins it.
- **Notes:** `task.md` already tells the planner to "write TASKS.md: master Phase Index"; the overview rule belongs beside that bullet, not in a new section. `run.md` is deliberately not edited (the specification dropped that surface).

### [T-39A04] Templates: the form of the hand-written text at its placeholder

- **Spec:** l2-engine-templates.md §5.2 (last bullet), §5.3
- **Status:** Done
- **Changes:** One HTML comment line added at the placeholder of each template: `workspace-index.md` and `global-index.md` after their existing "add here" comment (what the specification, or the workspace, is for and when to open it, two sentences at most, no change history), and `tasks.md` under the `## Overview` sentence, after a blank line (describes the file, not the plan; the phase table carries status; do not append). A scratch parse against `git show HEAD:` with the `split('|')` row reading the registry scripts use: table rows 2 → 2, 3 → 3, 3 → 3, cell counts identical in all three, no added line inside a table, no CR or U+FFFD. The `tasks.md` placeholder sentence is unchanged; the added-line scan (task IDs, phase designators, specification files, section signs, system files) prints nothing.
- **Assignment:** Agent
- **Verify:** `workspace-index.md` and `global-index.md` each gain one HTML comment line at the `Description` placeholder (what the subject is for and when to open it, two sentences at most, no history), and `tasks.md` gains one under `## Overview` (describes the ledger, tracks nothing). Each template differs from before by that one line, placed outside any table row. A scratch parse of each template with the same `split('|')` row reading the registry scripts use yields identical row and cell counts before and after. The placeholder sentence of the `tasks.md` Overview is unchanged. No specification file, section, phase or task ID, and nothing project-specific (spec §2).
- **Handoff:** T-39B01 pins the three comments.
- **Notes:** `.magic/templates/` files are C14 content. The existing precedent for the form is `<!-- Add your specifications here -->` in `workspace-index.md`; a comment between table rows would break a table reader, so keep each one on its own line after the table.

### [T-39A05] Docs: one line each in `docs/spec.md` and `docs/task.md`

- **Spec:** l2-engine-templates.md §5.3 (user-visible behavior)
- **Status:** Done
- **Changes:** `docs/spec.md`: a "Registry Entry" bullet in the dispatch feature list — a spec's `INDEX.md` row carries a short description (what the spec is for and when to open it, at most two sentences), an amendment leaves it unchanged unless that purpose changed with the history staying in the spec's own Document History, and a mechanic is found by searching the spec text. `docs/task.md`: the `TASKS.md` bullet gains "Its Overview describes the file and tracks nothing; status lives in the phase table." No heading changed; the added lines carry no task ID, phase designator, specification file name or section sign. `node dev/scripts/sync-docs.js` run twice: every page reports itself current; its only effect elsewhere is the generated date stamp in `CONTRIBUTING.md`.
- **Assignment:** Agent
- **Verify:** `docs/spec.md` states, beside the registry-sync description, that the registry description says what a specification is for and when to open it, in plain words and at most two sentences; `docs/task.md` states that the ledger overview describes the ledger. Both are user-facing text: no specification file name, section number, phase or task ID. No heading changes. `node dev/scripts/sync-docs.js` run after the edit leaves both pages current (a second run reports every page already current).
- **Handoff:** T-39T01 re-runs the sync after the bump.
- **Notes:** Public behavior of the engine changed (what an agent writes into a user's registry), so the docs sync applies (Post-Done Docs Sync). The pages above the Sync Note are hand-written; the Sync Note itself is generated and must not be edited.

### [T-39B01] Validation: harness pins for the five surfaces, with mutation controls

- **Spec:** l2-test-suite.md (Shipped-text contract coverage, registry text contract and question routing)
- **Status:** Done
- **Changes:** Four cases in `dev/tests/engine.js`, a new section 5j after the reader-tier case, each reading shipped text with its assertions written out: (a) `spec.md` — the creation step lists `Description` among the fields it registers and carries the four statements of the form (what and when, at most two sentences, a router and not an index, a content question answered by searching the text), the Sync step carries the conditional, the byte-identical clause and the Document History destination, and the checklist registry line names the `Description` and its condition; (b) `task.md` — the TASKS.md bullet states four things about the overview (describes the file and tracks nothing, state is the phase table's status column, what a phase produced is in its phase file, the changelog and the archive, nobody appends); (c) the three templates each carry their comment, one assertion per template, and none stands beside a table row; (d) `rules/magic.md` §2 — the graph bullet no longer carries "what covers Z", a second bullet says the graph and the wiki hold no specification text and routes a mechanic named in a question to a search of the specification text and a read of the matching section, and the copy under `.agents/rules/` is byte-equal to it. Harness 174 → 178, the four new cases green on the real tree. Mutation list of 19 entries (eight on `spec.md`, four on `task.md`, three on the templates, four on `rules/magic.md`): 19 CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED; the modified files byte-identical afterwards and `validate-hardlinks.js` still exit 0.
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains cases, placed after the body-navigation cases, that read the shipped text: (a) `spec.md` registers a `Description`, changes it only when what or when changed, leaves it byte-identical otherwise and names it in the checklist; (b) `task.md` states that the ledger overview describes the ledger and is not appended to; (c) each of `workspace-index.md`, `global-index.md` and `tasks.md` carries its comment at the placeholder, one assertion per template; (d) `rules/magic.md` §2 sends a mechanic named in a question to the specification text and a structural question to the graph and the wiki. The assertions are written out in the cases, not borrowed from a generator. Harness count rises by at least 4 and is green on the real tree. A mutation list (one entry per pinned fragment, at least 10) run with `node dev/scripts/mutation-check.js` reports every entry CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED, and the modified files are byte-identical afterwards.
- **Handoff:** T-39T01 re-runs the harness after the bump.
- **Notes:** Needs T-39A01..A04 landed. Pin the contract, not the exact wording: each assertion looks for the concept (the Description named at registration, the byte-identical clause, the routing split), so a later rewording that keeps the contract needs no test edit. `dev/tests/engine.js` is shared with no other task in this phase.

### [T-39C01] Validation: cognitive cases for registry text and question routing

- **Spec:** l2-test-suite.md (Cognitive Test Suite, registry text and question-routing coverage)
- **Status:** Done
- **Changes:** `dev/tests/suite.md`: three cases after T263 in the `### T{N} — {name}` form, each with `Synthetic State`, `Action`, `Expected` and `Guards tested`, and two controls apiece. T264 — an amendment that changes nothing about a specification's purpose leaves its registry `Description` byte-identical and adds a Document History row (control B: an amendment that changes when to open it replaces the cell rather than appending; control C: creating a specification registers a two-sentence cell with no section inventory). T265 — planning a phase and finishing one leave the task-ledger overview untouched (control B: a request to record what the phase produced puts it in the phase file, the changelog and the plan's outcome, not the overview; control C: a ledger with a long inherited narrative is neither extended nor rewritten as a side effect). T266 — a question naming a mechanic is answered by searching the specification text, while a structural one goes to the graph and the wiki (control B the structural question, control C a fresh clone with no wiki). The closing line moved to v1.9.96, Last T266. A scratch check: 265 case headers, none outside the expected form, numbering consecutive apart from the documented gap at T67, all required fields present in each new case, no CR, no U+FFFD, no name of another project.
- **Assignment:** Agent
- **Verify:** `dev/tests/suite.md` gains three cases after T263, each in the `### T{N} — {name}` form with `Synthetic State`, `Action`, `Expected` and `Guards tested`, and each with a control that shows the rule is not a blanket ban: (1) amending a specification without changing what it is for or when to open it leaves its registry `Description` byte-identical and adds one Document History row; control — an amendment that changes when to open it replaces the cell instead of appending to it; (2) planning a phase and finishing one leave the ledger overview untouched; control — a request to record what the phase produced puts it in the phase file and the changelog, not in the overview; (3) "which specification covers M" is answered by searching the specification text, not by reading registry cells or the wiki; control — "what depends on X" goes to the graph and the wiki. A scratch check prints every case header in the expected form, consecutively numbered, and the closing line moved to the next version with Last set to the new final case.
- **Handoff:** T-39T02 runs them.
- **Notes:** Cognitive-only by design: no script stands behind the behavior, so the harness pins the wording (T-39B01) and the suite probes the behavior. The suite's closing line is the only place its count and version are recorded (spec 1.19.0 rule); do not copy them elsewhere.

### [T-39D01] `TASKS.md` of this workspace: the overview describes the ledger

- **Spec:** l2-engine-templates.md §5.3 rule 3 (the one-time rewrite is a task of the deploying phase)
- **Status:** Done
- **Changes:** The body of `## Overview` in `.design/engine/TASKS.md` replaced by two short paragraphs describing the ledger (one row per phase with its status last; the workbook holds the checklist and tracking, in `archives/tasks/` once archived; what a phase planned and produced is in `PLAN.md`, the workbook's `provides` and the workspace changelog; the section tracks nothing): 27,260 → 449 characters, the file 39,640 → 12,831 bytes. A scratch script compared the text before the heading and after the section by hash and found both identical, so nothing outside the Overview changed. Information-loss gate, two screens over the old text against `PLAN.md`, the workspace and root changelogs, the retrospective and the archived workbooks: all 61 checkable claims (15 engine version ranges, 14 harness ranges, 18 phase completions, 8 plan-sync dates, 6 retrospective sessions) have a home; 38% of the prose has a near-verbatim home and the remainder is the same narrative reworded in `PLAN.md`'s own overview and phase sections (the plan-sync paragraphs and phase detail are there, spot-checked on seven distinctive facts). Nothing was moved into `PLAN.md`: re-homing 54 sentences would add weight to a 131 KB file for text that is already there, and the full old text stays recoverable from git history. Before the rewrite the lead paragraph read "Plan complete — nothing pending", which Phase 39's plan made false; that is gone with the rest.
- **Assignment:** Agent
- **Verify:** The `## Overview` section of `.design/engine/TASKS.md` is a short description of the ledger (what the file is, how to read it, where phase detail lives) with no phase name, date, version or count; the rest of the file is byte-identical (`git diff` shows changes inside the Overview only, apart from the header lines this planning pass already set). Before anything is removed, for each phase paragraph of the old Overview a search confirms its headline claim (engine version range, harness counts, outcome) appears in `PLAN.md` (Execution outcome), the workspace `CHANGELOG.md` or the archive; a claim with no home is first moved into the `PLAN.md` section of its phase, and the task's `Changes` lists what was moved. The Overview shrinks from about 27 KB to under 1 KB.
- **Handoff:** None.
- **Notes:** Until this task runs, the Overview still ends its lead paragraph with "Plan complete — nothing pending", which this plan makes false; the planning pass leaves it as it is, because under the contract no step rewrites the overview as the plan moves, and the removal here is the one-time rewrite. Run it first if the ledger is read before the phase finishes. Information-loss gate: the removed text stays recoverable from git history, but the home check above is the real guard.

### [T-39D02] This workspace's registry: rewrite the 14 L1 `Description` cells

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Done
- **Changes:** The `Description` cell of each of the 14 `l1-*` rows of `.design/engine/INDEX.md` rewritten as what the specification is for and when to open it, two sentences each, from the specification's own `Overview`; no history, no inventory, no version, date or count, and no `|`. A scratch script applied the cells from one JSON map, taking the last three cells of each row (status, layer, version) as the unchanged tail and refusing a text with a pipe or a newline. The registry went from 63,916 to 60,743 bytes (a pre-rewrite copy is kept in scratch for T-39D04). `check-prerequisites --verify-headers` shows no new warning (only the expected engine-drift warning until the bump).
- **Assignment:** Agent
- **Verify:** In `.design/engine/INDEX.md`, the `Description` cell of each of the 14 `l1-*` rows names what the specification is for and when to open it, in at most two sentences, with no change history, no list of sections or invariants, no version, date or count, and no `|` character. The source for "what" is the specification's own `Overview`. The other four cells of every row are byte-identical to before (a scratch script compares each row with its `Description` removed). `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` still reports `ok: true` with no new warning.
- **Handoff:** T-39D04 scans the result.
- **Notes:** Judgement work, one specification at a time: read the Overview, write the what, then decide the when from the specification's role (for example "open it to change X" or "open it before touching Y"). Do not carry over a clause because it was in the old cell; a content question is now answered by searching the text, so the cell loses nothing it needs. The registry's `Meta Information` journal is out of scope (parked in the Backlog).

### [T-39D03] This workspace's registry: rewrite the 23 L2 `Description` cells

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Done
- **Changes:** 22 of the 23 `l2-*` cells of `.design/engine/INDEX.md` rewritten as what the specification is for and when to open it, two sentences each, from each specification's `Overview` (the child specifications keep one "Child of …" clause naming their parent, as the form allows); the 23rd, `l2-engine-templates.md`, already met the form from the specification pass and was left byte-identical on purpose (rule 2). Same mechanism as T-39D02 (one JSON map, the last three cells of each row as the unchanged tail, a pipe or a newline refused); the registry went from 60,743 to 55,990 bytes. `check-prerequisites --verify-headers` shows no new warning.
- **Assignment:** Agent
- **Verify:** The same as T-39D02 for the 23 `l2-*` rows of `.design/engine/INDEX.md`: each `Description` says what the specification is for and when to open it in at most two sentences, with no history, inventory, figure or `|`; the other four cells of every row are byte-identical; `check-prerequisites --verify-headers` still `ok: true`.
- **Handoff:** T-39D04 scans the result.
- **Notes:** The longest cells (the test-suite row is 1,448 characters, the session-continuity row 1,203) carry the most appended history; that history belongs to each specification's Document History, which already holds it. Child specifications keep their parent link in the cell only if it is what a reader needs to choose (for example "Child of X: ..."), as one clause.

### [T-39D04] Validation: the rewritten registry meets the form and nothing else changed

- **Spec:** l2-engine-templates.md §5.3
- **Status:** Done
- **Changes:** A scratch scan compared the registry with the pre-rewrite copy: 37 rows, 36 descriptions changed and 1 left byte-identical (the templates row, already compliant), and 0 rows whose status, layer, version or file cell moved. Description length went from a median of 387 and a maximum of 1,448 characters to a median of 211 and a maximum of 272; the registry from 63,916 to 55,990 bytes (-7,926). One cell was flagged for a second look, `l1-workspace-intent-routing.md`, for the word "amended" in "a new or amended specification" — a description of what the specification governs, not change history, so it stands. No cell has more than two sentences, a version or date token, a pipe or a section sign. `build-spec-graph` reports the same totals (225 nodes, 483 edges) with the old registry swapped in and with the new one (the registry restored byte-identical, hashes equal), so the rewrite does not change the graph; the +4 nodes against the last retrospective baseline come from the amended specifications and this phase's own node. `export-wiki` succeeds.
- **Assignment:** Agent
- **Verify:** A scratch scan over `.design/engine/INDEX.md` prints, for all 37 rows: the distribution of cell lengths (median and maximum), the count of cells with more than two sentences, with a version or a date token, with a `|`, and with a change-history word; each count is 0 or each flagged cell is listed and justified in `Changes`. `node .magic/scripts/executor.js build-spec-graph` reports the same node and edge totals as before the rewrite (the registry parse is unaffected), and `export-wiki` succeeds. The registry file is smaller than before by roughly the removed description text (report before and after sizes).
- **Handoff:** None.
- **Notes:** The scan is a screen, not a gate: the spec specifies no size signal, and a flagged cell is a prompt to reread it, not a failure by itself.

### [T-39T01] Validation: harness, scans, hardlinks, docs sync; single C14 bump

- **Spec:** l2-engine-templates.md §5.3 (Surfaces); l2-test-suite.md; l2-engine-automation.md §Engine Meta Update Flow
- **Status:** Done
- **Changes:** (1) Harness 174 → 178 (four new cases), 178/178 before the bump and 178/178 after it. (2) The mutation list: 19 entries, 19 CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED, run before and after the bump, the modified files restored byte-identical each time. (3) The added-line scan over `.magic`, `rules`, `workflows`, `skills`, `.agents`, `docs`, `dev/scripts` and the harness additions for task IDs, phase designators and specification file names prints nothing. (4) `validate-hardlinks.js` exit 0, `fsutil hardlink list rules\magic.md` shows both paths. (5) `sync-docs.js` after the bump synced the pages for the version stamp, and a second run reports every page current. (6) One `update-engine-meta` for every `.magic/` edit of the phase: engine 2.1.134 → 2.1.135, 72 files in the manifest, the success line printed (so no wrapper refused), exit 0; `update-engine-meta --check` clean. T-39T02 then found one wording gap in `spec.md` and the fix needed a second bump (2.1.136); see its `Changes`.
- **Assignment:** Agent
- **Assignment:** Agent
- **Verify:** (1) The full harness is green before and after the bump, with the count recorded. (2) Every mutation list of this phase runs with 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED and the modified files restored byte-identical. (3) The added-line containment scan over `.magic`, `rules`, `workflows`, `skills`, `.agents`, `docs` and `dev/scripts`, and over the harness additions, prints nothing. (4) `node dev/scripts/validate-hardlinks.js` exits 0 and `fsutil hardlink list rules\magic.md` shows both paths. (5) `node dev/scripts/sync-docs.js` run twice: the second run reports every page current. (6) One `node .magic/scripts/executor.js update-engine-meta`: the engine version moves from 2.1.134 by one patch step, zero wrappers refused, the success line printed, exit 0; `update-engine-meta --check` is clean afterwards.
- **Handoff:** T-39T02 follows.
- **Notes:** One bump covers every `.magic/` edit (T-39A02, T-39A03, T-39A04); `rules/` and `docs/` are outside C14. Mid-phase harness runs on the live tree may report engine drift until this bump; that is expected, not a defect.

### [T-39T02] Validation: run the new cognitive cases against the shipped text

- **Spec:** l2-test-suite.md (Cognitive Test Suite)
- **Status:** Done
- **Changes:** T264–T266 run against the text as shipped after the first bump, literal readings taken in this session — no fresh reader on a lower tier was run (an agent spawn needs an explicit request), so the author read its own text and the Context Bleed note applies in full. T264 A passes (the Sync step leaves the cell byte-identical and sends the amendment to Document History; the Version cell moves) and C passes (the creation step carries the form). T264 B was an AMBIGUITY of the shipped wording: the Sync step said "change the Description only when…", and the two-sentence form lives only in the creation step, so a literal reader of the Updating section could append a clause rather than rewrite the cell. Fix, ranked smallest and local: `.magic/spec.md` Sync now says "then rewrite the whole cell in the form above, never append to it"; the harness pin gains that statement and the mutation list an entry (20 in all, 20 CAUGHT); a second C14 (2.1.135 → 2.1.136), harness 178/178. T265 passes in the shipped text (the overview rule sits in `task.md` and `run.md` is silent about it) but its Expected B named "the plan's execution outcome", which no shipped text asks for; the case was over-specified and was corrected to the phase file's `provides` and the changelog entry. T266 A named a behavior no shipped sentence states ("says so when the search finds nothing") and C said the structural question falls back to the registry; the shipped rule runs `build-spec-graph`, which works without the wiki. Both Expected lines were corrected to what the text says. Residual risk, for the first run on a lower tier in a fresh session: the Sync clause is one long sentence, and `run.md` states nothing about the ledger overview, so T265 relies on silence rather than on a stated rule.
- **Assignment:** Agent
- **Verify:** The three cases of T-39C01 are run against the text as shipped after the bump: each probe resolves as its `Expected` says, with its control resolving the other way. A probe that resolves wrongly or ambiguously is adjudicated as a finding of the shipped wording (Finding Adjudication) and fixed in this phase before it is marked Done. The result records that the author read its own text unless a fresh reader was run, so the Context Bleed note applies.
- **Handoff:** None.
- **Notes:** Last, after T-39T01 and T-39C01. Run in a fresh session where possible; a fresh reader on the lowest tier the host offers is the stronger check (Retro Session 19, R55 asks the same of the Phase 38 cases, still open).
