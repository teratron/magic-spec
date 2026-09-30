---
phase: 36
name: "Backlog Sweep — Reference Containment Cleanup, Tracked-Files Hint, Two Evidence Audits"
status: Done
subsystem: ".magic (workflow bodies, scripts, lib), dev/tests, .design (audit output)"
requires:
  - "RC-8 widened (Phase 33): this repository's own .magic/, workflows/, skills/ and rules/ are bound by the no-SDD-reference rule, which is what makes the scan below a defect list"
  - "The ventilation SDD_REFERENCE_LEAK scan (analyze.md step 6): the classes and the mention/use test the cleanup applies"
provides:
  - "Zero registered-specification filenames in shipped text (.magic, workflows, skills, rules): 36 citations in 16 files rewritten as plain-language rationale plus bare protocol labels; comment-only in every script"
  - "CHANGELOG.md free of specification filenames, task IDs and prose phase designators (41 + 2 + 3 references)"
  - "dev/tests/engine.js: a detector self-test and a scan that fails naming file:line when shipped text cites a registered specification; the tracked-files assertion now ends with the git add remedy"
  - "Two evidence audits: Status has one stale transition (blocker cleared outside /magic.task) and a template vocabulary conflict; the pause snapshot was never produced or read in 0 of 7 projects"
  - "engine 2.1.112 -> 2.1.113; harness 141 -> 143"
key_files:
  created: []
  modified:
    - ".magic/analyze.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/scripts/check-prerequisites.js"
    - ".magic/scripts/finalize.js"
    - ".magic/scripts/executor.js"
    - ".magic/scripts/create-workspace.js"
    - ".magic/scripts/update-engine-meta.js"
    - ".magic/scripts/utils.js"
    - ".magic/scripts/export-wiki.js"
    - ".magic/scripts/graph-cache.js"
    - ".magic/scripts/lib/phase-files.js"
    - ".magic/scripts/lib/phase-archiver.js"
    - ".magic/scripts/lib/diagnostics.js"
    - ".magic/scripts/lib/scan-hygiene.js"
    - ".magic/scripts/lib/commit-suggester.js"
    - "CHANGELOG.md"
    - "dev/tests/engine.js"
patterns_established:
  - "A class of leak that is mechanically decidable is pinned by a harness scan with a self-tested detector and a negative control; the judgment classes stay with the ventilation scan."
  - "When a comment cites a specification only for its reason, the reason is restated in the comment and the pointer dropped — the rationale is what stops a future edit undoing the design."
  - "A parked decision that says 'revisit on evidence' gets an audit task that produces the evidence, not a guess."
duration_minutes: ~
---

# Stage 36 Tasks — Backlog Sweep

**Phase:** 36
**Status:** Done
**Strategic Goal:** Work the Backlog in order. Three items graduate to implementation (the engine-directory reference leaks, their scripts-side inventory, the tracked-files failure hint), two become evidence audits whose result informs a decision that stays parked until it exists, and the two that need a design pass are opened so the next planning run routes them to `/magic.spec`. Two items are considered and stay parked, with the reason recorded.

## Atomic Checklist

- [x] [T-36A01] Workflow bodies: replace the specification-file citations in `analyze.md`, `spec.md`, `task.md`
- [x] [T-36A02] Scripts, batch 1: `check-prerequisites.js`, `finalize.js`, `executor.js`, `create-workspace.js`
- [x] [T-36A03] Scripts, batch 2: `update-engine-meta.js`, `utils.js`, `export-wiki.js`, `graph-cache.js`
- [x] [T-36A04] Library modules: `phase-files.js`, `phase-archiver.js`, `diagnostics.js`, `scan-hygiene.js`, `commit-suggester.js`
- [x] [T-36A05] Product-file sweep: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/`
- [x] [T-36B01] Tracked-files invariant: an untracked engine file reads as a to-do
- [x] [T-36C01] Audit: every writer of the `Status` field against every state transition
- [x] [T-36C02] Audit: whether the pause snapshot has ever been produced or read
- [x] [T-36T01] Validation: a harness guard that fails when shipped text names a registered specification
- [x] [T-36T02] Validation: harness, scans, tracked-files invariant; single C14 bump

## Detailed Tracking

### [T-36A01] Workflow bodies: replace the specification-file citations in `analyze.md`, `spec.md`, `task.md`

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-8, RC-9
- **Status:** Done
- **Changes:** analyze.md (6), spec.md (2) and task.md (1): file names and section numbers dropped, protocol labels (SH-1, SH-3, IK-1..IK-9, DA-9, SC-2.4) kept, one wrapper-parity sentence restated in plain language; registered-name scan over the three files clean, no added line carries a spec file name.
- **Assignment:** Agent
- **Verify:** The scan `names=$(ls .design/engine/specifications/*.md | xargs -n1 basename | sed 's/\.md$//' | paste -sd'|'); grep -En "($names)\.md" .magic/analyze.md .magic/spec.md .magic/task.md` prints nothing. The nine planned-time hits (`analyze.md` lines citing the wrapper spec twice, the hygiene spec twice, the engine-core spec once and a table row; `spec.md` the intake-gate and decision-autonomy headers; `task.md` the design-debt line) each keep the protocol label they carried (`SH-1`, `IK-1..IK-9`, `DA-3`, `SC-2.4`, `WRAPPER_BODY_DRIFT`) and lose only the file name and section number; a sentence that leaned on the cited section for its reason restates that reason in plain language rather than losing it. `git diff -U0 -- .magic/analyze.md .magic/spec.md .magic/task.md | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md"` prints nothing.
- **Handoff:** T-36T01 pins the result for the whole shipped tree.
- **Notes:** Mention versus use (SH-1): generic example filenames such as `l1-api.md` and `l2-database.md` in `spec.md` and `task.md` illustrate a naming rule and are not registered here — the scan above keys on names actually registered in this workspace, so they never match. Task-ID and phase-designator strings in these bodies (`T-1A01`, `phase-2`) are format documentation and example arguments, verified at plan time — leave them.

### [T-36A02] Scripts, batch 1: `check-prerequisites.js`, `finalize.js`, `executor.js`, `create-workspace.js`

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-8
- **Status:** Done
- **Changes:** 11 comment citations rewritten across check-prerequisites.js (4), finalize.js (5), executor.js (1), create-workspace.js (1): file names and section numbers dropped, bare labels kept (DG-10, DG-5, SH-1/SH-4, SH-1/SH-5, SC-2.4, SC-2.1(c), WI-6, WI-9), one wrapped comment reflowed. Diff filter for non-comment lines prints nothing, node -c clean, registered-name scan over the four files empty.
- **Assignment:** Agent
- **Verify:** The same scan over these four files prints nothing; the 11 hits (comments and JSDoc — `check-prerequisites.js` lines 37, 210, 322, 413; `finalize.js` 287, 311, 352, 694, 764; `executor.js` 90; `create-workspace.js` 9) are rewritten as plain-language rationale plus, where one exists, the bare protocol label (`DG-10`, `SH-1/SH-4`, `SC-2.4`, `SC-2.1(c)`, `WI-6`, `WI-9`). No executable line changes: `git diff -U0 -- <the four files> | grep '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-]\s*(//|/?\*)'` prints nothing (only comment lines differ). `node -c` passes on each.
- **Handoff:** T-36A03.
- **Notes:** `check-prerequisites.js` and `finalize.js` are the two scripts every workflow runs — a comment-only diff is the whole reason this task is safe; the diff filter above is the proof. Two of these hits (`check-prerequisites.js:210`, `finalize.js:352`) sit in code Phase 35 touched; edit the comment, not the neighbouring code.

### [T-36A03] Scripts, batch 2: `update-engine-meta.js`, `utils.js`, `export-wiki.js`, `graph-cache.js`

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-8
- **Status:** Done
- **Changes:** 8 citations rewritten across update-engine-meta.js (5), utils.js (1), export-wiki.js (1), graph-cache.js (1): the manifest-exclusion rationale (user-customizable wrappers, partial installs) is now stated in the comments instead of pointed at; the two Implements headers became one-line descriptions. Comment lines only (diff filter empty), node -c clean, registered-name scan empty.
- **Assignment:** Agent
- **Verify:** The scan over these four files prints nothing; the 8 hits (`update-engine-meta.js` 47, 99, 194, 207, 235; `utils.js` 43; `export-wiki.js` 16; `graph-cache.js` 17) are rewritten the same way, comment lines only (same diff filter as T-36A02), `node -c` clean. The two `Implements …` file headers in `export-wiki.js` and `graph-cache.js` become a one-line plain description of what the module is (a cache layer for the spec graph; the wiki exporter), not a pointer.
- **Handoff:** T-36A04.
- **Notes:** `update-engine-meta.js` documents the deliberate exclusion of `workflows/`, `skills/` and `rules/` from the checksum manifest and cites the spec for it — keep the *reason* (user-customizable wrappers and partial installs) verbatim in the comment; that rationale is what stops a future edit "fixing" the exclusion.

### [T-36A04] Library modules: `phase-files.js`, `phase-archiver.js`, `diagnostics.js`, `scan-hygiene.js`, `commit-suggester.js`

- **Spec:** l1-sdd-reference-containment.md RC-2, RC-8
- **Status:** Done
- **Changes:** 8 citations rewritten across phase-files.js (2), phase-archiver.js (2), diagnostics.js (2), scan-hygiene.js (1), commit-suggester.js (1); comment lines only, node -c clean; the registered-name scan over the whole scripts tree (scripts/*.js and lib/*.js) is now empty. Literal phase-10.md filename examples in phase-files.js kept as recognition documentation.
- **Assignment:** Agent
- **Verify:** The scan over `.magic/scripts/lib/` prints nothing; the 8 hits (`phase-files.js` 11, 92; `phase-archiver.js` 33, 130; `diagnostics.js` 13, 214; `scan-hygiene.js` 8; `commit-suggester.js` 14) become plain-language rationale plus bare labels (`SH-2/SH-5`, `DG-1..DG-9`); comment lines only; `node -c` clean; `grep -rEn "($names)\.md" .magic/scripts` over the whole scripts tree prints nothing. The literal `phase-10.md` / `phase-10a.md` filename examples in `phase-files.js` are recognition-logic documentation (mention) and stay.
- **Handoff:** T-36A05.
- **Notes:** `commit-suggester.js` records a retired feature ("SC-3 retirement … v2.0.0") — keep the fact that the module no longer composes messages, drop the spec pointer and the version of the spec.

### [T-36A05] Product-file sweep: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/`

- **Spec:** l1-sdd-reference-containment.md RC-2 (user-facing docs are product files), RC-8 exemptions
- **Status:** Done
- **Changes:** CHANGELOG.md was the only product file with provenance leaks: 41 registered specification filenames, 2 task IDs and 3 prose phase designators, now 0. Method: parenthetical citations removed, remaining filenames replaced by plain-language names (mechanical, 24 lines changed), 5 phrases rewritten by hand. Exempt by content and left: README.md (7 hits — the .design/ layout it documents and example command arguments such as "phase-2"/"T-1A01"), .design/ paths in CHANGELOG entries that describe what the engine reads or writes (34), filename-shape examples such as phase-10b.md in entries about the engine filename rules; CONTRIBUTING.md and docs/ have 0 registered-spec-file names and document the SDD workflow itself. Fixed 46 references, exempted 3 named classes.
- **Assignment:** Agent
- **Verify:** `grep -En "($names)\.md|\.design/|T-[0-9]+[A-Z][0-9]+|[Pp]hase[- ][0-9]+" README.md CHANGELOG.md` is reviewed hit by hit and every reference to an SDD artifact is either removed or restated in plain language (a `CHANGELOG.md` line that says which behavior changed keeps saying it, without the pointer); `CONTRIBUTING.md` and `docs/` are contributor-facing pages that document the SDD workflow itself and are exempt where the reference *is* the content — each hit there is classified in `Changes` as exempt-by-content or fixed. `Changes` records the count fixed and the count exempted, with the exempt ones named.
- **Handoff:** T-36T01.
- **Notes:** This is the one task of the track that is judgment, not mechanical: the Backlog entry it comes from was scoped to `.magic/`, and no scan of these files has been run — do not assume zero. If the pass finds more than ~15 non-exempt hits, finish the task on the mechanical ones and record the rest in `Attempts` rather than rewriting release notes at length.

### [T-36B01] Tracked-files invariant: an untracked engine file reads as a to-do

- **Spec:** l2-test-suite.md (script harness); none other — a message-only change
- **Status:** Done
- **Changes:** The tracked-files assertion message now ends with Run: git add {the offending .magic/ paths}, like its sibling; only the message string changed (one line in the diff), the test still passes on the current tree.
- **Assignment:** Agent
- **Verify:** In `dev/tests/engine.js` the assertion message of `every .magic/.checksums entry must be a git-tracked file` ends with the same kind of remedy its sibling case already gives (`Run: git add …`, listing the offending paths), so an untracked new engine file reads as a step to take, not a defect. The check itself is untouched: `git diff -U0 -- dev/tests/engine.js` shows only the message string changed, and the test still passes on the current tree.
- **Handoff:** none.
- **Notes:** The hint belongs in the harness, not in `task.md`: the invariant lives only in this repository's tests and `.magic/task.md` ships to every user project, so dev-only guidance there would cross the layer boundary (recorded when the Backlog item was written). Phase 35 hit exactly this and staged the new file by hand.

### [T-36C01] Audit: every writer of the `Status` field against every state transition

- **Spec:** l2-finalize-state-accuracy.md §Known Gaps Not Closed Here (`Status` is never holistically recomputed); l1-session-continuity.md SC-1.1
- **Status:** Done
- **Changes:** AUDIT (no engine file changed). Writers of STATE.md **Status:** — update-state.js is the only script-level writer (--status flag, update-state.js:243/822; fresh-file default Active at :361); finalize.js never writes it (grep of the file: no status write); every other writer is a prose instruction an agent executes: task.md:123 (plan write → Active), run.md:33 (phase complete → Active) and :44 (Pause Propagation, no Todo left → Blocked), pause.md:62 (→ Paused) and its resume step (→ Active). Transition matrix — phase started: written by task.md; task blocked, others remain: not written, by design (SC-1.1); last Todo blocked: written by run.md:44 only if the agent runs the command (R2 fixture: phase file Blocked, Status stays Active after real update-state/finalize runs); blocker cleared via /magic.task: written (task.md:123); BLOCKER CLEARED OUTSIDE /magic.task (task returned to Todo or retried Done while the phase continues): NEVER WRITTEN — reproduced (R1: Status Blocked, open agent-actionable task, run.md's per-task update-state call leaves it Blocked; only an explicit --status=Active clears it; it stays stale until Phase Complete); phase complete: written by run.md:33; plan complete: not written, by design (R3, Active stays); session paused: written by pause.md; resumed: written by its resume step; Paused left over when work finishes without a resume (R4): stays Paused until a resume consumes it. TEMPLATE/SPEC CONFLICT found: .magic/templates/state.md:9 offers `Complete` in the Status vocabulary, while SC-1.1 says the vocabulary is Active|Blocked|Paused and no code path writes a fourth value. CONCLUSION: one stale transition with a reproduction (R1) and one template defect; the parked item is opened for /magic.spec — the design question is whether the per-task update should clear Blocked when the phase has an agent-actionable Todo, and whether the template's Complete is removed or adopted.
- **Assignment:** Agent
- **Verify:** A table recorded in this task's `Changes` (and summarized in the next retrospective) lists every code path and workflow step that writes `**Status:**` in `STATE.md` (`update-state.js --status`, `run.md` Pause Propagation and Phase Complete, `pause.md`, `finalize.js`, template defaults), against each state transition the plan can make — phase started, task blocked, last `Todo` blocked, blocker resolved by `/magic.task`, phase complete, plan complete, session paused, session resumed — and marks each cell *written by X*, *never written* or *written wrongly*, with the file and line as evidence. Every "never written" or "wrongly" cell is reproduced with a scratch fixture (real `update-state`/`finalize` runs), not inferred. The task ends with one of two recorded conclusions: no transition leaves `Status` stale (the parked item can be closed as a wontfix), or a named list of stale transitions with a reproduction each (the item is opened for `/magic.spec`). No engine file is changed by this task.
- **Handoff:** the conclusion feeds the Backlog disposition at the next planning run.
- **Notes:** Investigation only — the Backlog item is explicit that whether `Status` *should* be recomputed is a design question, and the spec says to route through `/magic.spec` only if call sites drift in practice. This task is what turns "no drift observed" from an absence of looking into a finding. One known starting fact: after the previous phase's completion `Status` still reads `Active` on a plan-complete workspace — the vocabulary excludes a completion state by design (SC-1.1), so record that cell as *by design*, not stale.

### [T-36C02] Audit: whether the pause snapshot has ever been produced or read

- **Spec:** l1-session-continuity.md §Rejected/Deferred (retiring the pause snapshot) and SC-9(b)
- **Status:** Done
- **Changes:** AUDIT (read-only; nothing modified anywhere, no project named). Commands: `git log --all --oneline -- '*HANDOFF*'`, `git log --all --oneline -S'Status:** Paused' -- '.design/**/STATE.md'`, and a working-tree search for HANDOFF.json, in this repository and in each of the 6 sibling projects that have an installed engine. Result: HANDOFF.json ever committed 0/7 projects, in a working tree 0/7, a STATE.md revision recording Status: Paused 0/7 (this repository included). The only mentions of /magic.pause or HANDOFF.json in this repository's changelog and archived phase files are the checkpoint work that retired their advertisement, not an instance of use. CONCLUSION: the optional pause snapshot has never been produced or read anywhere the engine runs (evidence for retiring it; the pending decision to retire or keep it is a specification change). The parked item is opened for /magic.spec with this count.
- **Assignment:** Agent
- **Verify:** The task records, with commands and counts in `Changes`: (1) in this repository, `git log --all --oneline -- '*HANDOFF*' '.design/**/HANDOFF.json'` and a search of every committed `STATE.md` revision for `**Status:** Paused` (`git log -p -S"Status:** Paused" -- '.design/**/STATE.md'`); (2) in each sibling project under the same parent directory that has an installed engine, the presence of any `HANDOFF.json` and the same `Paused` search over its history; (3) whether any archived phase workbook or retrospective mentions using `/magic.pause` or a snapshot. The conclusion is one of: never produced anywhere (evidence for retiring it), produced N times and read M times (evidence for keeping it), or inconclusive with the reason. Read-only: no sibling repository is modified and no engine file is changed.
- **Handoff:** the conclusion feeds the Backlog disposition at the next planning run.
- **Notes:** Downstream project names, paths and domain terms stay out of every recorded artifact — report counts and the word "consumer project" only. The backlog entry itself observed "no snapshot was ever committed"; this task extends that to the other projects the engine runs in, and to *uncommitted* use where a working tree can show it.

### [T-36T01] Validation: a harness guard that fails when shipped text names a registered specification

- **Goal:** Make T-36A01..A04 stay done: a citation reintroduced in a comment must turn a test red the same day, instead of waiting for the next ventilation.
- **Method:** In `dev/tests/engine.js` add one case beside the RC-2.1 shipped-text contract cases: it reads the file names in `.design/engine/specifications/`, scans every `.md` and `.js` file under `.magic/` (skipping `.checksums`), `workflows/`, `skills/` and `rules/`, and fails naming each `{file}:{line}` where a registered specification filename appears; the case skips itself with a stated reason when `.design/engine/specifications/` is absent, so a consumer copy of the harness cannot fail on it. Negative control: temporarily add a citation to one comment, expect red naming that file and line, remove it, verify by hash. Count before and after recorded in `Changes`.
- **Status:** Done
- **Changes:** dev/tests/engine.js: two cases in the shipped-text section — a detector self-test (flags a registered name with its line; spares an unregistered example filename, a longer name and another extension) and the scan of .magic (md and js), workflows, skills and rules for any registered specification filename, self-skipping when the workspace specifications are absent. Negative controls: a citation injected into a comment of utils.js and into the frontmatter of analyze.md each turned it red naming file:line and were restored by hash. Harness 141 to 143.
- **Notes:** Run after T-36A05. Scope is the registered-name class only — the unconditional, mechanically decidable class. Task IDs and phase designators need the mention-versus-use judgment (`T-1A01` in format documentation is legitimate) and stay with the ventilation scan.

### [T-36T02] Validation: harness, scans, tracked-files invariant; single C14 bump

- **Goal:** Prove the tree is consistent, then close the phase's one C14 bump.
- **Method:** (1) `node --test dev/tests/engine.js` → all green (previous 141 + the T-36T01 case). (2) The registered-name scan over `.magic workflows skills rules` prints nothing. (3) `git diff -U0 -- .magic | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+"` prints nothing. (4) `node dev/scripts/validate-hardlinks.js` passes. (5) `node .magic/scripts/executor.js update-engine-meta --workflow magic.analyze magic.spec magic.task` → engine 2.1.112 → 2.1.113, one C14 (three workflow bodies changed; no wrapper did, so no skill regeneration is expected). (6) Post-bump: repeat (1); `check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`; `finalize --workflow=run --dry-run` prints a `Next step` line.
- **Status:** Done
- **Changes:** Harness 143/143 before and after C14; registered-specification scan over .magic, workflows, skills and rules is empty (0 hits, from 36); no added engine line carries a spec file name or task ID; hardlinks valid; check-prerequisites ok; no new file in .magic so the tracked-files invariant is untouched. C14 once: engine 2.1.112 to 2.1.113, 74 files checksummed, snapshot synced, tagged magic.analyze magic.spec magic.task (no wrapper changed, no skill drift).
- **Notes:** Every A and B task writes `.magic/`, `docs/` or `dev/tests/` → C14 runs exactly once, here. No file is created inside `.magic/`, so the tracked-files invariant is not at risk. Tracks C1 and C2 write nothing outside this workbook's `Changes` fields and the retrospective.
