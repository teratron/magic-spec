---
phase: 39
name: "Registry Text Contract & Question Routing Deployment"
status: Todo
subsystem: "rules, .magic (spec.md, task.md, templates), docs, dev/tests, .design (this workspace's registry and task ledger)"
requires:
  - "The registry text contract (l2-engine-templates 1.3.0 §5.2, §5.3), the question routing (l2-spec-graph-memory 1.2.0 §4.5) and their coverage (l2-test-suite 1.27.0): all Stable at registry 1.40.0"
  - "The body navigation contract (Phase 38): spec.md and task.md keep a contents list naming every ## heading and the pointer that applies context.md whole, so edits here add or remove no heading"
  - "dev/scripts/mutation-check.js (Phase 37): the driver that controls every new assertion"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 39 Tasks — Registry Text Contract & Question Routing Deployment

**Phase:** 39
**Status:** Todo
**Strategic Goal:** Deploy three amended specifications: the form of the two hand-written registry texts ([l2-engine-templates.md](../specifications/l2-engine-templates.md) 1.3.0 §5.2, §5.3), the routing of structural and content questions ([l2-spec-graph-memory.md](../specifications/l2-spec-graph-memory.md) 1.2.0 §4.5) and the coverage that holds them ([l2-test-suite.md](../specifications/l2-test-suite.md) 1.27.0). Order matters: the routing clause lands before the authoring instructions (spec §5.3, order of adoption), because a short registry cell is safe only once a content question has its own route; the registry and ledger of this workspace are rewritten last, by the rule the engine now carries.

## Atomic Checklist

- [ ] [T-39A01] `rules/magic.md` §2: a content question goes to the specification text, a structural one to the graph ([C-001])
- [ ] [T-39A02] `.magic/spec.md`: register the registry `Description` and amend it only when what or when changed
- [ ] [T-39A03] `.magic/task.md`: the ledger overview describes the ledger
- [ ] [T-39A04] Templates: the form of the hand-written text at its placeholder
- [ ] [T-39A05] Docs: one line each in `docs/spec.md` and `docs/task.md`
- [ ] [T-39B01] Validation: harness pins for the five surfaces, with mutation controls
- [ ] [T-39C01] Validation: cognitive cases for registry text and question routing
- [ ] [T-39D01] `TASKS.md` of this workspace: the overview describes the ledger
- [ ] [T-39D02] This workspace's registry: rewrite the 14 L1 `Description` cells
- [ ] [T-39D03] This workspace's registry: rewrite the 23 L2 `Description` cells
- [ ] [T-39D04] Validation: the rewritten registry meets the form and nothing else changed
- [ ] [T-39T01] Validation: harness, scans, hardlinks, docs sync; single C14 bump
- [ ] [T-39T02] Validation: run the new cognitive cases against the shipped text

## Detailed Tracking

### [T-39A01] `rules/magic.md` §2: a content question goes to the specification text, a structural one to the graph ([C-001])

- **Spec:** l2-spec-graph-memory.md §4.5; l2-engine-templates.md §5.3 (order of adoption)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** §2 Auto-Use of `rules/magic.md` no longer sends every "what covers Z" question to the graph. A structural question (what depends on X, how X relates to Y, which specifications are load-bearing, what is orphaned) keeps the graph and wiki route; a question that names a mechanic ("which specification covers M") is routed to a search of the specification text (`.design/{workspace}/specifications/`) followed by a read of the matching section; the same place states that the graph and the wiki hold structure and no specification text. The edit adds at most 4 lines (the file is always-on and 498 lines long) and names no specification file, section number, phase or task ID. The twin under `.agents/rules/` is the same file: `fsutil hardlink list rules\magic.md` lists both paths, `Get-FileHash` of the two is equal and `node dev/scripts/validate-hardlinks.js` exits 0 after the edit; a write that replaced the inode is repaired by recreating the link (**[C-001]**). No C14 bump: `rules/` is outside its tracking.
- **Handoff:** T-39A02 follows (order of adoption); T-39B01 pins the routing sentence.
- **Notes:** The highest-sensitivity text of the phase: the file is loaded in every session of every project that installed the engine, and the clause being split is the current "Before architectural / cross-module / "how does X relate to Y" / "what covers Z" questions, run build-spec-graph". Keep that for the structural half and add the content half beside it; do not weaken the CAUTION block or §9 (consumer guards stay intact, AGENTS.md §0 item 5). Both Write and Edit break the hardlink here, so edit once, then check the link.

### [T-39A02] `.magic/spec.md`: register the registry `Description` and amend it only when what or when changed

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** Creating a New Specification, step 2, registers the `Description` with Name, Status, Layer and Version and states its form in one or two lines: what the specification is for and when to open it, at most two sentences, no change history, no list of sections or invariants, no figure that goes stale; and that a content question is answered by searching the specification text, so the cell is not an index. Updating an Existing Specification, Sync, changes the `Description` only when what the specification is for, or when to open it, changed, leaves it byte-identical otherwise and sends the amendment to the specification's Document History. The Task Completion Checklist registry line names the `Description`. `git diff -U0 .magic/spec.md` touches only those three places; no `##` heading is added or removed, so the contents list still matches (`node --test dev/tests/engine.js --test-name-pattern "contents"` green) and `wc -l` stays at most 500. The added-line containment scan over the diff prints nothing: no specification file, section number, phase or task ID.
- **Handoff:** T-39B01 pins the three statements.
- **Notes:** An L1 file under C14 (one bump at T-39T01) and, with T-39A01, the highest blast radius of the phase: every `/magic.spec` run reads it. The new sentences must not make an existing step conditional or longer than it is; the registration step is a one-line list today. The instruction is guidance, not a gate: no HALT, no refusal (spec §2).

### [T-39A03] `.magic/task.md`: the ledger overview describes the ledger

- **Spec:** l2-engine-templates.md §5.3 rule 3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The TASKS.md bullet of Plan Write-back states that the Overview says what the file is and how to read it and tracks nothing: which phase is active is the status column of the phase table, and what a finished phase produced is recorded in its phase file, the workspace changelog and the archive; nobody appends to it and no step rewrites it as the plan moves. `git diff -U0 .magic/task.md` shows that bullet only; the contents list and the pointer to `context.md` are untouched; `wc -l` at most 500; the added-line containment scan prints nothing.
- **Handoff:** T-39B01 pins it.
- **Notes:** `task.md` already tells the planner to "write TASKS.md: master Phase Index"; the overview rule belongs beside that bullet, not in a new section. `run.md` is deliberately not edited (the specification dropped that surface).

### [T-39A04] Templates: the form of the hand-written text at its placeholder

- **Spec:** l2-engine-templates.md §5.2 (last bullet), §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `workspace-index.md` and `global-index.md` each gain one HTML comment line at the `Description` placeholder (what the subject is for and when to open it, two sentences at most, no history), and `tasks.md` gains one under `## Overview` (describes the ledger, tracks nothing). Each template differs from before by that one line, placed outside any table row. A scratch parse of each template with the same `split('|')` row reading the registry scripts use yields identical row and cell counts before and after. The placeholder sentence of the `tasks.md` Overview is unchanged. No specification file, section, phase or task ID, and nothing project-specific (spec §2).
- **Handoff:** T-39B01 pins the three comments.
- **Notes:** `.magic/templates/` files are C14 content. The existing precedent for the form is `<!-- Add your specifications here -->` in `workspace-index.md`; a comment between table rows would break a table reader, so keep each one on its own line after the table.

### [T-39A05] Docs: one line each in `docs/spec.md` and `docs/task.md`

- **Spec:** l2-engine-templates.md §5.3 (user-visible behavior)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `docs/spec.md` states, beside the registry-sync description, that the registry description says what a specification is for and when to open it, in plain words and at most two sentences; `docs/task.md` states that the ledger overview describes the ledger. Both are user-facing text: no specification file name, section number, phase or task ID. No heading changes. `node dev/scripts/sync-docs.js` run after the edit leaves both pages current (a second run reports every page already current).
- **Handoff:** T-39T01 re-runs the sync after the bump.
- **Notes:** Public behavior of the engine changed (what an agent writes into a user's registry), so the docs sync applies (Post-Done Docs Sync). The pages above the Sync Note are hand-written; the Sync Note itself is generated and must not be edited.

### [T-39B01] Validation: harness pins for the five surfaces, with mutation controls

- **Spec:** l2-test-suite.md (Shipped-text contract coverage, registry text contract and question routing)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains cases, placed after the body-navigation cases, that read the shipped text: (a) `spec.md` registers a `Description`, changes it only when what or when changed, leaves it byte-identical otherwise and names it in the checklist; (b) `task.md` states that the ledger overview describes the ledger and is not appended to; (c) each of `workspace-index.md`, `global-index.md` and `tasks.md` carries its comment at the placeholder, one assertion per template; (d) `rules/magic.md` §2 sends a mechanic named in a question to the specification text and a structural question to the graph and the wiki. The assertions are written out in the cases, not borrowed from a generator. Harness count rises by at least 4 and is green on the real tree. A mutation list (one entry per pinned fragment, at least 10) run with `node dev/scripts/mutation-check.js` reports every entry CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED, and the modified files are byte-identical afterwards.
- **Handoff:** T-39T01 re-runs the harness after the bump.
- **Notes:** Needs T-39A01..A04 landed. Pin the contract, not the exact wording: each assertion looks for the concept (the Description named at registration, the byte-identical clause, the routing split), so a later rewording that keeps the contract needs no test edit. `dev/tests/engine.js` is shared with no other task in this phase.

### [T-39C01] Validation: cognitive cases for registry text and question routing

- **Spec:** l2-test-suite.md (Cognitive Test Suite, registry text and question-routing coverage)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/suite.md` gains three cases after T263, each in the `### T{N} — {name}` form with `Synthetic State`, `Action`, `Expected` and `Guards tested`, and each with a control that shows the rule is not a blanket ban: (1) amending a specification without changing what it is for or when to open it leaves its registry `Description` byte-identical and adds one Document History row; control — an amendment that changes when to open it replaces the cell instead of appending to it; (2) planning a phase and finishing one leave the ledger overview untouched; control — a request to record what the phase produced puts it in the phase file and the changelog, not in the overview; (3) "which specification covers M" is answered by searching the specification text, not by reading registry cells or the wiki; control — "what depends on X" goes to the graph and the wiki. A scratch check prints every case header in the expected form, consecutively numbered, and the closing line moved to the next version with Last set to the new final case.
- **Handoff:** T-39T02 runs them.
- **Notes:** Cognitive-only by design: no script stands behind the behavior, so the harness pins the wording (T-39B01) and the suite probes the behavior. The suite's closing line is the only place its count and version are recorded (spec 1.19.0 rule); do not copy them elsewhere.

### [T-39D01] `TASKS.md` of this workspace: the overview describes the ledger

- **Spec:** l2-engine-templates.md §5.3 rule 3 (the one-time rewrite is a task of the deploying phase)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The `## Overview` section of `.design/engine/TASKS.md` is a short description of the ledger (what the file is, how to read it, where phase detail lives) with no phase name, date, version or count; the rest of the file is byte-identical (`git diff` shows changes inside the Overview only, apart from the header lines this planning pass already set). Before anything is removed, for each phase paragraph of the old Overview a search confirms its headline claim (engine version range, harness counts, outcome) appears in `PLAN.md` (Execution outcome), the workspace `CHANGELOG.md` or the archive; a claim with no home is first moved into the `PLAN.md` section of its phase, and the task's `Changes` lists what was moved. The Overview shrinks from about 27 KB to under 1 KB.
- **Handoff:** None.
- **Notes:** Until this task runs, the Overview still ends its lead paragraph with "Plan complete — nothing pending", which this plan makes false; the planning pass leaves it as it is, because under the contract no step rewrites the overview as the plan moves, and the removal here is the one-time rewrite. Run it first if the ledger is read before the phase finishes. Information-loss gate: the removed text stays recoverable from git history, but the home check above is the real guard.

### [T-39D02] This workspace's registry: rewrite the 14 L1 `Description` cells

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In `.design/engine/INDEX.md`, the `Description` cell of each of the 14 `l1-*` rows names what the specification is for and when to open it, in at most two sentences, with no change history, no list of sections or invariants, no version, date or count, and no `|` character. The source for "what" is the specification's own `Overview`. The other four cells of every row are byte-identical to before (a scratch script compares each row with its `Description` removed). `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` still reports `ok: true` with no new warning.
- **Handoff:** T-39D04 scans the result.
- **Notes:** Judgement work, one specification at a time: read the Overview, write the what, then decide the when from the specification's role (for example "open it to change X" or "open it before touching Y"). Do not carry over a clause because it was in the old cell; a content question is now answered by searching the text, so the cell loses nothing it needs. The registry's `Meta Information` journal is out of scope (parked in the Backlog).

### [T-39D03] This workspace's registry: rewrite the 23 L2 `Description` cells

- **Spec:** l2-engine-templates.md §5.3 rules 1–2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The same as T-39D02 for the 23 `l2-*` rows of `.design/engine/INDEX.md`: each `Description` says what the specification is for and when to open it in at most two sentences, with no history, inventory, figure or `|`; the other four cells of every row are byte-identical; `check-prerequisites --verify-headers` still `ok: true`.
- **Handoff:** T-39D04 scans the result.
- **Notes:** The longest cells (the test-suite row is 1,448 characters, the session-continuity row 1,203) carry the most appended history; that history belongs to each specification's Document History, which already holds it. Child specifications keep their parent link in the cell only if it is what a reader needs to choose (for example "Child of X: ..."), as one clause.

### [T-39D04] Validation: the rewritten registry meets the form and nothing else changed

- **Spec:** l2-engine-templates.md §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** A scratch scan over `.design/engine/INDEX.md` prints, for all 37 rows: the distribution of cell lengths (median and maximum), the count of cells with more than two sentences, with a version or a date token, with a `|`, and with a change-history word; each count is 0 or each flagged cell is listed and justified in `Changes`. `node .magic/scripts/executor.js build-spec-graph` reports the same node and edge totals as before the rewrite (the registry parse is unaffected), and `export-wiki` succeeds. The registry file is smaller than before by roughly the removed description text (report before and after sizes).
- **Handoff:** None.
- **Notes:** The scan is a screen, not a gate: the spec specifies no size signal, and a flagged cell is a prompt to reread it, not a failure by itself.

### [T-39T01] Validation: harness, scans, hardlinks, docs sync; single C14 bump

- **Spec:** l2-engine-templates.md §5.3 (Surfaces); l2-test-suite.md; l2-engine-automation.md §Engine Meta Update Flow
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** (1) The full harness is green before and after the bump, with the count recorded. (2) Every mutation list of this phase runs with 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED and the modified files restored byte-identical. (3) The added-line containment scan over `.magic`, `rules`, `workflows`, `skills`, `.agents`, `docs` and `dev/scripts`, and over the harness additions, prints nothing. (4) `node dev/scripts/validate-hardlinks.js` exits 0 and `fsutil hardlink list rules\magic.md` shows both paths. (5) `node dev/scripts/sync-docs.js` run twice: the second run reports every page current. (6) One `node .magic/scripts/executor.js update-engine-meta`: the engine version moves from 2.1.134 by one patch step, zero wrappers refused, the success line printed, exit 0; `update-engine-meta --check` is clean afterwards.
- **Handoff:** T-39T02 follows.
- **Notes:** One bump covers every `.magic/` edit (T-39A02, T-39A03, T-39A04); `rules/` and `docs/` are outside C14. Mid-phase harness runs on the live tree may report engine drift until this bump; that is expected, not a defect.

### [T-39T02] Validation: run the new cognitive cases against the shipped text

- **Spec:** l2-test-suite.md (Cognitive Test Suite)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The three cases of T-39C01 are run against the text as shipped after the bump: each probe resolves as its `Expected` says, with its control resolving the other way. A probe that resolves wrongly or ambiguously is adjudicated as a finding of the shipped wording (Finding Adjudication) and fixed in this phase before it is marked Done. The result records that the author read its own text unless a fresh reader was run, so the Context Bleed note applies.
- **Handoff:** None.
- **Notes:** Last, after T-39T01 and T-39C01. Run in a fresh session where possible; a fresh reader on the lowest tier the host offers is the stronger check (Retro Session 19, R55 asks the same of the Phase 38 cases, still open).
