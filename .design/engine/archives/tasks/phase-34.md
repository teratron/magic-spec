---
phase: 34
name: "Rule Admission Gate Deployment (RA-1..RA-9)"
status: Done
subsystem: ".magic (role cards, workflow bodies), workflows, docs, dev/tests"
requires:
  - "Role cards constitutional-reviewer, spec-critic, prompt-engineer (Phases 3-4): the protocols this phase amends"
  - "rule.md Rule Wording Review gate (Phase 4) and the T4 capture surface in spec.md: the two paths the admission gate must close"
  - "sync-skills regeneration bound to workflows/ (Phase 28): the wrapper edit reaches skills/ only through the closing C14 bump"
  - "validate-hardlinks.js covers workflows/*.md pairs (Phase 28): the [C-001] check for the wrapper edit"
provides:
  - "constitutional-reviewer card: origin, Admission step (RA-2..RA-6) and the DECLINE verdict; spec-critic Regulation Necessity step; prompt-engineer no-widening anti-pattern"
  - "rule.md: Admission step ahead of Guards, review-before-write order, write reach (/magic.rule vs on behalf of /magic.spec), self-contained Admission Tests, origin record and 10-line body bound, Admission (RA) checklist line"
  - "spec.md and task.md: T1-T4 capture and the T4 queue hand the rule to rule.md's Operational Logic; the inline guard set is gone; Spec Council necessity counterweight"
  - "analyze.md: Mode A writes no rules; rule advisory only for gate-passing rung 3-4 candidates; RULE_RETIRE_CANDIDATE and RULE_BLOAT retirement findings"
  - "workflows/magic.spec.md and magic.rule.md hints (hardlink twins intact); docs/rule.md, docs/spec.md, docs/analyze.md in step; dev/tests/suite.md T225-T230 (1.9.82)"
  - "engine 2.1.110 -> 2.1.111; skills magic-spec and magic-rule regenerated; harness unchanged at 140"
key_files:
  created: []
  modified:
    - ".magic/roles/constitutional-reviewer.md"
    - ".magic/roles/spec-critic.md"
    - ".magic/roles/prompt-engineer.md"
    - ".magic/rule.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/analyze.md"
    - "workflows/magic.spec.md"
    - "workflows/magic.rule.md"
    - "docs/rule.md"
    - "docs/spec.md"
    - "docs/analyze.md"
    - "dev/tests/suite.md"
patterns_established:
  - "A gate that regulates rules is deployed in the workflow and the reviewer cards that run it, never as a constitutional convention loaded on every operation."
  - "Shipped text is self-contained: the tests a consumer's agent applies are stated in words in the workflow body, because the specification that authored them does not ship."
  - "Editing a hardlinked workflow wrapper with an in-place write (node fs.writeFileSync on the existing path) keeps the twin linked, where the Write and Edit tools replace the inode."
duration_minutes: ~
---

# Stage 34 Tasks — Rule Admission Gate Deployment (RA-1..RA-9)

**Phase:** 34
**Status:** Done
**Strategic Goal:** Deploy [l1-rule-admission-gate.md](../specifications/l1-rule-admission-gate.md) (RA-1..RA-9) and the [l2-role-cards-governance.md](../specifications/l2-role-cards-governance.md) v1.3.0 card amendments: every path that writes a regulation passes one admission gate, so an agent-originated rule needs a cited occurrence and survives a with/without comparison, a user-stated rule is written at the strength the user stated, and ventilation can propose retirements. Prose only — no script changes.

## Atomic Checklist

- [x] [T-34A01] `constitutional-reviewer.md`: origin, admission step, DECLINE verdict
- [x] [T-34A02] `spec-critic.md`: Regulation Necessity step
- [x] [T-34A03] `prompt-engineer.md`: no-widening anti-pattern
- [x] [T-34B01] `rule.md`: Admission step, review-before-write order, write reach
- [x] [T-34B01.1] `rule.md`: the Admission tests stated in words (self-contained shipped text)
- [x] [T-34B02] `rule.md`: origin record, body bound, no-widening bar, checklist line
- [x] [T-34C01] `spec.md`: T1-T4 capture delegates to the rule pipeline; trigger rows narrowed
- [x] [T-34C02] `spec.md`: necessity counterweight in the Spec Council safety lens
- [x] [T-34C03] `task.md`: T4 queue re-pointed at the rule pipeline
- [x] [T-34D01] `analyze.md`: analysis writes no rules; rule advisory only for gate-passing candidates
- [x] [T-34D02] `analyze.md`: `RULE_RETIRE_CANDIDATE` and `RULE_BLOAT` retirement findings
- [x] [T-34E01] Wrappers: `magic.spec.md` and `magic.rule.md` hints; restore the `.agents/workflows/` hardlinks
- [x] [T-34F01] `docs/rule.md`: admission gate, narrowed triggers, three stale lines
- [x] [T-34F02] `docs/spec.md` §6.5 and `docs/analyze.md`: capture path and retirement findings
- [x] [T-34T01] Validation: re-target the five cognitive scenarios that cite the removed inline guards
- [x] [T-34T02] Validation: six new cognitive scenarios T225-T230, each with a control
- [x] [T-34T03] Validation: harness, leak scan, hardlinks, cognitive pass; single C14 bump

## Detailed Tracking

### [T-34A01] `constitutional-reviewer.md`: origin, admission step, DECLINE verdict

- **Spec:** l2-role-cards-governance.md §3 (v1.3.0); l1-rule-admission-gate.md RA-2, RA-3, RA-4, RA-5, RA-6, RA-8
- **Status:** Done
- **Changes:** Card rewritten to the governance-spec text: scope, Mission, seven-step protocol with the Admission step (RA-2..RA-6) and the DECLINE verdict, two new anti-patterns, C27 line kept; role_registry clean.
- **Assignment:** Agent
- **Verify:** `.magic/roles/constitutional-reviewer.md` reproduces the §3 card text. Frontmatter `outputs[0].scope` is `admission verdict (necessity, fidelity, form) and conflict review of a proposed rule`; Mission reads `Decide whether a proposed RULES.md rule should exist, then review it before it is committed.`; the Operating Protocol has exactly seven numbered steps in the spec's order — (1) load the rule and its origin, (2) Admission naming RA-2, RA-3, RA-4, RA-5 and RA-6, (3) §1-6 contradiction → HALT, (4) practical conflict, (5) duplication against both tiers, the engine's shipped adapter rules and specification regulations, (6) scope, (7) verdict APPROVE / AMEND / DECLINE / REJECT; the two new anti-patterns are present and the deployed card's existing C27 anti-pattern line is kept. Checks: `grep -c "DECLINE" .magic/roles/constitutional-reviewer.md` ≥ 1; `grep -o "RA-[2-6]" .magic/roles/constitutional-reviewer.md | sort -u` prints RA-2 through RA-6; `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` reports `role_registry.missing: []` and `dangling_handoffs: []`.
- **Handoff:** T-34B01 activates this card at its new Admission step.
- **Notes:** Highest-blast-radius text of the phase — this card runs on every rule write. A wording slip that lets DECLINE apply to a user-stated rule recreates the self-restriction the phase exists to remove (RA-5), and one that lets a rule with no evidence through defeats it. T-34T02's controls guard both directions. The deployed card carries a line the spec text does not list (the C27 anti-pattern) — keep it.

### [T-34A02] `spec-critic.md`: Regulation Necessity step

- **Spec:** l2-role-cards-governance.md §1 (v1.3.0); l1-rule-admission-gate.md RA-1
- **Status:** Done
- **Changes:** Frontmatter scope gains ", regulation necessity"; new step 7 Regulation Necessity (RA-2/RA-3/RA-4, product invariants excluded); Sync Check and Emit renumbered 8-9; one anti-pattern added, C27 line kept.
- **Assignment:** Agent
- **Verify:** `.magic/roles/spec-critic.md` frontmatter `outputs[0].scope` ends `, regulation necessity`; the Operating Protocol is numbered 1-9 with step 7 titled Regulation Necessity (RA-1), naming RA-2, RA-3 and RA-4 and stating that product invariants are outside the step; the former steps 7 and 8 are now 8 (Sync Check) and 9 (Emit PASS or FAIL) with unchanged wording; the anti-pattern `Accepting a blocking gate justified only by a scenario that could happen.` is added and the existing C27 anti-pattern is kept. `grep -n "^[0-9]\+\." .magic/roles/spec-critic.md` lists steps 1-9 contiguous.
- **Handoff:** T-34C02 wires the same counterweight into the Spec Council lens in `spec.md`.
- **Notes:** The step is scoped to *regulations* (blocking gates, mandatory checks, required approvals or records) so it does not weaken step 2 (Invariant Completeness) for product behavior.

### [T-34A03] `prompt-engineer.md`: no-widening anti-pattern

- **Spec:** l2-role-cards-governance.md §5 (v1.3.0); l1-rule-admission-gate.md RA-9
- **Status:** Done
- **Changes:** Prompt-engineer card gains the RA-9 no-widening anti-pattern (1 insertion, 0 deletions).
- **Assignment:** Agent
- **Verify:** `.magic/roles/prompt-engineer.md` gains one anti-pattern bullet: widening an admitted regulation's scope, strength or cases through a semantic-coverage rewrite is a new admission candidate, not a wording fix (RA-9). No other line changes: `git diff --stat -- .magic/roles/prompt-engineer.md` shows 1 insertion and 0 deletions.
- **Handoff:** T-34B02 states the same bar at the Rule Wording Review gate in `rule.md`.
- **Notes:** The card's step 6 (Semantic coverage: "propose the exact text to add") is the mechanism that widens rules; do not edit it — the bar is stated as an anti-pattern and at the `rule.md` gate.

### [T-34B01] `rule.md`: Admission step, review-before-write order, write reach

- **Spec:** l1-rule-admission-gate.md RA-1, RA-5, RA-8 (write reach); §2 Origin; §4.1 flow
- **Status:** Done
- **Changes:** rule.md: new Admission step (origin test with agent tie-break, DECLINE record, write reach as /magic.rule vs on behalf of /magic.spec, admission record), Guards renumbered 5 and duplication reach widened, new Reviews step 6 before Apply 7, trailing headings unnumbered, mermaid gains Admission node with DECLINE edge; awk order check and heading check clean.
- **Assignment:** Agent
- **Verify:** In `.magic/rule.md`: (1) Operational Logic contains a step named Admission placed after Tier Routing and before Guards. It activates `@role:constitutional-reviewer` (protocol steps 1-2) and applies the origin test: user-stated when the user supplied the normative text, agent-originated when the agent composed it — the author of the text decides, not who ran the command; an origin that cannot be established counts as agent-originated, and the Decision Record's override restates the rule as the user's own. (2) Agent-originated candidates go through the tests stated by T-34B01.1; user-stated ones are recorded at their stated strength and scope (RA-5). A DECLINE ends the run with the single Decision Record of RA-8 and writes nothing; an admitted candidate is narrated as the compact admission record of RA-8 (at most seven lines). (3) Write reach (RA-8): this logic runs both as `/magic.rule` and on behalf of `/magic.spec`. Run as `/magic.rule`, a candidate whose lowest sufficient placement is rung 1 or 2 (a note or a regulation in a specification) ends as the DO NOT CREATE record naming the governing specification, with override `/magic.spec amend {spec}`, and writes nothing; run on behalf of `/magic.spec`, the note or regulation is written into the specification under edit. Rung 0 is the narration itself; rungs 3 and 4 continue to Guards. (4) Add and Amend pass Admission (Amend on its delta only, RA-1); Remove and List do not. (5) The sequence is unambiguous: Operational Logic reads Pre-flight, Read, Tier Routing, Admission, Guards, Reviews (Constitutional Review then Rule Wording Review), Apply, and the trailing headings no longer carry the numbers 5, 5a, 6, 7; no sentence says the change is written before the reviews run. `awk '/^### Operational Logic/,/^### Actions/' .magic/rule.md | grep -o '^[0-9]\+\. \*\*[^*]*\*\*'` prints the seven step names in exactly that order, and `grep -n "^### [0-9]" .magic/rule.md` prints nothing. The mermaid graph carries an Admission node with a DECLINE edge to a terminal node that has no write.
- **Handoff:** T-34B01.1 states the tests the Admission step applies; T-34B02 finishes the supporting clauses; T-34C01, T-34C03 and T-34E01 point at this step by name.
- **Notes:** **Planning-surfaced, absent from the first spec version:** rule.md's own order is contradictory — Operational Logic step 5 says *write the change immediately*, while the headings numbered 5 and 5a (Constitutional Review "Pre-Commitment", Rule Wording Review "before the rule is written") come after it and heading 6 does the write. A DECLINE that writes nothing cannot hold until review precedes write, so this task fixes the order rather than inserting a step into an ambiguous one. No file cites those headings by number (verified: only `§Finalization Protocol` and `§Rule Tier Routing` are cited, by name), so renumbering is safe. Item (3) was a spec follow-up at first planning; the spec pass that preceded this update resolved it (RA-8 write reach) — this task now implements the resolved text, and T-34T02's sixth scenario pins it.

### [T-34B01.1] `rule.md`: the Admission tests stated in words (self-contained shipped text)

- **Spec:** l1-rule-admission-gate.md RA-2, RA-3, RA-4, RA-5; §5 "Shipped text is self-contained"
- **Status:** Done
- **Changes:** Added "### Admission Tests" (evidence, without/with-rule questions and six hazards in words, placement ladder 0-4, soft/hard form, user-stated fidelity); step plus tests total 21 non-empty lines; diff has no W/H codes or spec file names.
- **Assignment:** Agent
- **Verify:** The Admission step of `.magic/rule.md` (or a subsection of the same file it points at) states in words the tests it applies — a consumer project has no access to the specification that authored them, so the RA labels alone define nothing there. (1) Evidence (RA-2): a file and line, a commit, or a failure reproduced in the session; at least two instances for a repeated pattern; a scenario that could happen is not evidence; the one evidence-free exception is harm in the irreversible class (destructive or irreversible actions, external release artifacts). (2) The without-rule questions (RA-3): does the cause persist once the cited occurrence is fixed where it happened; what already catches it (constitution §1-6, a convention, an engine rule or workflow gate, a regulation in a specification, a test or hook); is the harm reversible. (3) The six with-rule hazards, named in words (RA-3): friction (adds a question, confirmation or approval — disqualifying for an agent-originated rule), deadlock (a blocking condition the agent cannot satisfy — disqualifying for the hard form), over-reach, cascade, conflict, opened hole; the last four are resolved by rewording to the evidence scope, otherwise the candidate is declined. (4) The placement ladder, rung 0-4 (no artifact; a note in the one specification; a regulation in the specification governing the domain; a workspace convention; a global convention), a higher rung needing evidence from its wider scope, the two convention rungs coinciding in a single-workspace project; the soft-by-default form, the hard form (a halt, a blocking gate, a required confirmation) admitted only for harm in the irreversible class, after a cited violation of the soft form, or when the user stated it; MODIFY over CREATE (RA-4). (5) Fidelity to a user-stated rule (RA-5): never declined, recorded at its stated strength and scope, each unstated strengthening (blocking consequence, retroactive application, cascade to dependent artifacts, numeric threshold, enumeration, record format, extension to cases the user did not name) a separate agent-originated candidate that must pass on its own, hazards reported as an advisory beside the write and never as a question. Checks: `git diff -U0 -- .magic | grep '^+' | grep -E "\b(W[1-3]|H[1-6])\b|l[12]-[a-z0-9-]+\.md"` prints nothing (the W/H codes are specification shorthand); the step and its definitions total at most 40 non-empty lines, so the workflow stays scannable.
- **Handoff:** T-34B02 adds the origin record, the body bound and the no-widening bar in the same file; T-34C01's delegation depends on these definitions being in place.
- **Notes:** These definitions are the load-bearing shipped content of the whole phase: without them the gate reduces to labels an agent in a consumer project cannot interpret. The role card summarizes the tests (its step 2); this step is where they are stated in full.

### [T-34B02] `rule.md`: origin record, body bound, no-widening bar, checklist line

- **Spec:** l1-rule-admission-gate.md RA-6, RA-9
- **Status:** Done
- **Changes:** Apply step and Add row require the origin record and the 10-line body bound with process narration in history (RA-6); Rule Wording Review states the no-widening bar (RA-9); checklist gains one Admission (RA) line (10 to 11).
- **Assignment:** Agent
- **Verify:** In `.magic/rule.md`: (1) the Apply step and the Add and Amend rows require the Document History row of the target file to record the origin — `user-stated`, or `agent` with the evidence citation — and to create the section when the file has none (the workspace `RULES.md` template ships without one) (RA-6). (2) The Add row states the rule body is at most 10 non-empty lines and that process narration (Decision Records, duplication-check results, adoption stories) goes to the history row, never the body (RA-6). (3) Rule Wording Review states the pass may clarify an admitted rule's wording but never widen its scope, strength or cases; a widening is a new candidate for Admission (RA-9). (4) The Rule Completion Checklist gains one `Admission (RA)` line: origin recorded; an agent-originated candidate cited an occurrence and passed the with/without comparison, or was declined by one Decision Record; a user-stated rule written at its stated strength and scope; body within 10 non-empty lines. `grep -n "RA-6\|RA-9" .magic/rule.md` shows all four locations; the checklist block has exactly one more `☐` line than before.
- **Handoff:** T-34C01 (spec.md) relies on the pipeline being complete before the inline guard set is removed.
- **Notes:** Do not add an Admission line to the Core Invariants list — that list is the workflow's fixed five and the step already lives in Operational Logic.

### [T-34C01] `spec.md`: T1-T4 capture delegates to the rule pipeline; trigger rows narrowed

- **Spec:** l1-rule-admission-gate.md RA-1, RA-5, §4.2 Trigger Hygiene
- **Status:** Done
- **Changes:** spec.md updating-RULES section: T1-T3 rows narrowed and split, T4 Inline Guards block replaced by a delegation to rule.md Operational Logic (rung-1/2 written into the spec under edit), Dispatch constraint and both T4 Queue lines re-pointed, Invariant 11 sentence, checklist Admission line; no Inline Guards left, no leak tokens in the diff.
- **Assignment:** Agent
- **Verify:** In `.magic/spec.md` §Updating RULES.md: (1) the trigger table reads T1 = "always/never" wording that governs how work is done (a statement about product behavior stays in the specification), T2 = a repeated pattern with at least two cited instances, T3 = an audit finding whose class recurs after being fixed where it occurred, T4 = user rule ("remember that...", "project rule:"); approvals stay Propose & Wait for T1-T3 and Apply Immediately for T4; a sentence states that each T1-T3 proposal carries the admission record and offers "do not adopt" among its at most three options (DA-5). (2) The **T4 Inline Guards** block is replaced by a delegation statement: capture is handed to the Operational Logic of `rule.md` (Tier Routing → Admission → Guards → reviews → write) and this file does not restate its guards; a rung-1 note or rung-2 regulation (RA-4) is written into the specification under edit. (3) Every remaining reference is re-pointed: the Dispatch constraint *T4 Rule*, and both *T4 Queue* acknowledgements under Updating an Existing Specification now hand the queued rule to the Operational Logic of `rule.md`. (4) Core Invariant 11 gains one sentence: rules enter only through the admission gate (RA-1). (5) The Completion Checklist gains one `Admission (RA)` line. Checks: `grep -n "Inline Guards" .magic/spec.md` prints nothing; `git diff -U0 .magic/spec.md | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+|phase-[0-9]+"` prints nothing.
- **Handoff:** T-34E01 points the wrapper hint at `§Updating RULES.md`; T-34T01 re-targets the scenarios that cited the removed section.
- **Notes:** Until T-34B01, T-34B01.1 and T-34B02 land, deleting the inline guards would leave T4 capture with no guard at all — the order B → C is load-bearing, not cosmetic. `/magic.spec` writes only under `.design/`, and `RULES.md` is inside it, so delegation stays within its write scope. **Pre-existing, out of scope:** `spec.md` lines naming this repository's own specification files (Step 0.5 header, the DA-9 clause) are recorded as `SDD_REFERENCE_LEAK` and covered by the parked Backlog item on engine-directory containment — do not carry them into any line this task adds.

### [T-34C02] `spec.md`: necessity counterweight in the Spec Council safety lens

- **Spec:** l1-rule-admission-gate.md RA-2, RA-3; l2-role-cards-governance.md §1 step 7
- **Status:** Done
- **Changes:** Spec Council Safety & Boundary lens gains the one-sentence regulation-necessity counterweight (RA-2, RA-3); lens numbering 1-5 unchanged.
- **Assignment:** Agent
- **Verify:** In `.magic/spec.md` §Post-Update Review, lens 1 (Safety & Boundary) gains one sentence: for every regulation the change introduces — a blocking gate, mandatory check, required approval or record — the critic asks whether it cites an observed occurrence and what it costs the agent's autonomy (RA-2, RA-3), and a regulation justified only by a scenario that could happen is reported as `[Spec-Review] {file} §{section}: {issue}`. The other four lenses and the numbering 1-5 are unchanged. `git diff -U0 .magic/spec.md` for this task adds 1 line inside the lens list.
- **Handoff:** T-34T03's cognitive pass reads the final lens text.
- **Notes:** The Safety lens currently asks only what could break — every review lens in this workflow rewards adding a guard and none asks what could be removed, which is root cause 4 of the admission spec. Keep the sentence to one line so the lens list stays scannable.

### [T-34C03] `task.md`: T4 queue re-pointed at the rule pipeline

- **Spec:** l1-rule-admission-gate.md RA-1
- **Status:** Done
- **Changes:** task.md T4 Queue acknowledgement now says the queued rule is handed to the Operational Logic of rule.md; trigger phrases and the no-write-until-Pre-flight clause unchanged; no Inline Guards left.
- **Assignment:** Agent
- **Verify:** In `.magic/task.md` Step 1, the *T4 Queue (Cross-Workflow)* bullet no longer names `spec.md` T4 Inline Guards: its acknowledgement text says the queued rule will be handed to the Operational Logic of `rule.md` after resolution; the trigger phrases, the "Do NOT write to RULES.md until Pre-flight passes" clause and the mirror reference to `spec.md §Updating` are unchanged. `grep -n "Inline Guards" .magic/task.md` prints nothing.
- **Handoff:** T-34T01 re-targets the scenario that quotes the old acknowledgement text.
- **Notes:** One sentence changes; the queue's HALT semantics must not move.

### [T-34D01] `analyze.md`: analysis writes no rules; rule advisory only for gate-passing candidates

- **Spec:** l1-rule-admission-gate.md RA-1, RA-2, RA-8, §4.2 Trigger Hygiene
- **Status:** Done
- **Changes:** analyze.md: Mode A no longer writes rules (observed conventions go to the owning spec; Rules Matrix -> Observed Conventions; Dispatch Logic rule step removed and steps renumbered); rule advisory only for gate-passing rung 3-4 candidates; checklist line trimmed; grep for M rules/Rules Matrix/T4 protocol/uncodified is empty.
- **Assignment:** Agent
- **Verify:** In `.magic/analyze.md`: (1) Mode A step 3 no longer dispatches rules — the action-log output line drops `+ M rules`, and a sentence states that conventions observed in the code are recorded descriptively in the owning implementation-layer specification and that analysis never writes `RULES.md`. (2) Operational Logic §3 (Module & Convention Detection) sends extracted config conventions to the owning specification, not to `RULES.md §7`. (3) The Proposal Template's `Rules Matrix` becomes `Observed Conventions` (same columns, destination: owning specification) and Dispatch Logic step 2 (`apply via T4 protocol to RULES.md §7`) is removed, with the remaining steps still consistent. (4) In Action Proposals, `→ /magic.rule add "{convention}"` is emitted only for a candidate that cites an occurrence of divergence, passed the admission gate (RA-2, RA-3) and is placed at rung 3 or 4 (RA-4) — never for an "uncodified pattern" alone, and a candidate placed at rung 0-2 is not surfaced as a rule (RA-8: ventilation writes nothing). (5) The Auto-Dispatch checklist line no longer says `RULES.md §7 updated`. `grep -n "M rules\|Rules Matrix\|T4 protocol\|for uncodified patterns" .magic/analyze.md` prints nothing.
- **Handoff:** T-34D02 edits the same file (Mode C step 12, findings schema, checklist).
- **Notes:** Field evidence behind (1): a consumer project's rule set contains a convention that restates an engine rule — first-time analysis is the one path that wrote rules with no gate at all. Mode C is read-only and untouched here.

### [T-34D02] `analyze.md`: `RULE_RETIRE_CANDIDATE` and `RULE_BLOAT` retirement findings

- **Spec:** l1-rule-admission-gate.md RA-7, RA-6
- **Status:** Done
- **Changes:** analyze.md Mode C step 12 gains the Rule Retirement check (RULE_RETIRE_CANDIDATE a/b/c and RULE_BLOAT, user-stated/no-origin/engine-owned handling, read-only); schema row, Structural Improvements bullet and the phantom /magic.rule promote example replaced (now remove); checklist line added.
- **Assignment:** Agent
- **Verify:** In `.magic/analyze.md`: (1) Mode C step 12 (Rule Validation) gains a Rule Retirement check reporting read-only advisories `RULE_RETIRE_CANDIDATE {id}: {a|b|c}` — (a) the file or component named in an agent-originated rule's cited evidence no longer exists, (b) superseded: duplicated by a higher tier, an engine rule or a regulation in a specification, (c) deadlock: a Blocked task or a `STATE.md` blocker names the rule as a condition the agent cannot satisfy with the tools, access and artifacts it has (RA-3) — and `RULE_BLOAT {id}` for a rule body over 10 non-empty lines; each with `→ /magic.rule remove {id}` or, for RULE_BLOAT, `→ /magic.rule amend {id}`. User-stated rules and rules with no origin record are checked on (b), (c) and the bloat test only. Engine-owned conventions are excluded, matched by heading text against `.magic/templates/rules.md`, not by ID (a consumer's own C25-C27 collide numerically with the template's). Ventilation edits nothing (Actionable Guard). (2) The Findings Schema table gains a `Rule Retirement` row. (3) The Structural Improvements bullet "Rule consolidation … suggest promoting to global §6" is replaced by a pointer to these findings, and the Output Format example `→ /magic.rule promote "C15 scope isolation"` becomes a `→ /magic.rule remove {id}` example — `promote` is not an action `rule.md` defines. (4) The Task Completion Checklist gains one `Rule retirement (RA-7)` line. `grep -n "RULE_RETIRE_CANDIDATE\|RULE_BLOAT" .magic/analyze.md` shows step 12, the schema row and the checklist; `grep -n "magic.rule promote" .magic/analyze.md` prints nothing.
- **Handoff:** T-34F02 documents these findings in `docs/analyze.md`; T-34T02 (T229) asserts them.
- **Notes:** Cognitive check by design, like WRAPPER_BODY_DRIFT — RA-7 specifies advisories, not a script, and no engine script is touched by this phase. Do not touch line ~294 (Concept-Only clause naming a spec file) — pre-existing leak, parked.

### [T-34E01] Wrappers: `magic.spec.md` and `magic.rule.md` hints; restore the `.agents/workflows/` hardlinks

- **Spec:** l1-rule-admission-gate.md §5 row 6; l2-workflow-wrappers.md §6 (wrapper-body parity)
- **Status:** Done
- **Changes:** workflows/magic.spec.md T4 Capture hint now points at rule.md Operational Logic and §Updating RULES.md; workflows/magic.rule.md gains one Admission hint. Edited in place so both .agents/workflows twins remained linked (fsutil: 2 links each, validate-hardlinks passes, twins carry the new text). Skills regenerate at the closing C14.
- **Assignment:** Agent
- **Verify:** `workflows/magic.spec.md` T4 Capture hint reads: input contains "remember that..." / "project rule:" → the rule is handed to `rule.md`'s Operational Logic, which records a user-stated rule at the strength stated and admits an agent-originated one only on evidence (see `.magic/spec.md §Updating RULES.md`); `workflows/magic.rule.md` gains one Admission hint naming `.magic/rule.md §Operational Logic`; the "Full implementation" body pointers are unchanged. **[C-001]:** after each edit the twin under `.agents/workflows/` is recreated as a hardlink (`Remove-Item` + `New-Item -ItemType HardLink`); `node dev/scripts/validate-hardlinks.js` exits 0 with no drift and `fsutil hardlink list workflows/magic.spec.md` lists both paths (same for `magic.rule.md`). `grep -rn "Inline Guards" workflows .agents/workflows` prints nothing. `skills/` is not hand-edited.
- **Handoff:** T-34T03's C14 bump regenerates `skills/magic-spec/SKILL.md` and `skills/magic-rule/SKILL.md` from these two wrappers.
- **Notes:** Must run after T-34C01 (the anchor `§Updating RULES.md` has to describe the delegation) and before the C14 bump (skills are generated, and a stale generation is invisible — Phase 27/28). Both write tools replace the inode: the edit always reports success while `.agents/` goes stale, so the hardlink check is part of Verify, not an afterthought.

### [T-34F01] `docs/rule.md`: admission gate, narrowed triggers, three stale lines

- **Spec:** l1-documentation-system.md (docs counterpart stays in sync with its workflow); l1-rule-admission-gate.md RA-2..RA-7
- **Status:** Done
- **Changes:** docs/rule.md: new 6.1 Admission Gate summary (6 bullets), reviewer/duplication scope widened, T1-T3 narrowed and T3 added, and three stale lines corrected against rule.md (Narrate Writes, autonomous tier resolution, single narrated next step); no stale strings remain.
- **Assignment:** Agent
- **Verify:** `docs/rule.md` (1) gains a section summarizing the Admission step for a human reader — origin, evidence, the with/without comparison, form and placement, user-stated fidelity, the 10-line bound, retirement advisories, and that a rule belonging in a specification is redirected to `/magic.spec amend` instead of written — in at most 25 lines and without restating the specification; (2) §6 Constitutional Reviewer lists admission and the DECLINE verdict; (3) §8 Trigger Types matches T1-T4 as narrowed in `spec.md`; (4) §4 states the duplication check covers both tiers, the engine's shipped rules and regulations in specifications; (5) three lines that already contradict `.magic/rule.md` are corrected in the same edit — Invariant 3 "No Silent Writes: always show proposed diff before committing" → apply immediately with the diff shown inline (C25), the Two-Tier table's "Ambiguous | Engine asks: Global or workspace-scoped?" → resolved autonomously (workspace tier when a workspace is active, else global) and narrated as a Decision Record, and §7 "Offer Sync / Compliance … suggest" → exactly one narrated next command (DA-6). `grep -n "No Silent Writes\|Engine asks\|Offer Sync" docs/rule.md` prints nothing; every relative link in the file resolves.
- **Handoff:** T-34F02 keeps the `spec.md` §6.5 anchor this file links to valid.
- **Notes:** The three stale lines were verified against `.magic/rule.md` at plan time (Core Invariant 3, Rule Tier Routing → Ambiguous, Post-Write Impact → Next step). The `Sync Note` line is owned by `dev/scripts/sync-docs.js` — do not edit it.

### [T-34F02] `docs/spec.md` §6.5 and `docs/analyze.md`: capture path and retirement findings

- **Spec:** l1-documentation-system.md; l1-rule-admission-gate.md RA-1, RA-7
- **Status:** Done
- **Changes:** docs/spec.md 6.5 keeps its heading (anchor valid) and now describes handoff to the Rule workflow; docs/analyze.md Conventions row, Mode C item 7 (retirement findings) and the Rule relationship row updated; docs/rule.md T4 line aligned; no stale strings, 0 broken relative links in the three pages.
- **Assignment:** Agent
- **Verify:** `docs/spec.md` §6.5 keeps its heading text unchanged (so the anchor `#65-t4-rule-capture-with-tier-routing` that `docs/rule.md` links to still resolves) and its body now says the Spec workflow hands the captured rule to the Rule workflow's pipeline instead of applying "three inline guards"; `docs/analyze.md` (1) Mode A's Conventions row (`RULES.md proposals`) says observed conventions are recorded in the owning specification, (2) Mode C item 7 (Rule Validation) mentions the retirement findings `RULE_RETIRE_CANDIDATE` and `RULE_BLOAT`, (3) the Rule row in §8 no longer says detected conventions are proposed for `RULES.md`. `grep -n "three inline guards\|RULES.md proposals" docs/spec.md docs/analyze.md` prints nothing; every relative link in both files resolves.
- **Handoff:** T-34T03 runs the link check across `docs/`.
- **Notes:** Same `Sync Note` rule as T-34F01.

### [T-34T01] Validation: re-target the five cognitive scenarios that cite the removed inline guards

- **Goal:** Keep the existing T4 scenarios asserting the pipeline that now exists. Their outcomes are unchanged — every one of them supplies a user-stated rule — only the path they name changes.
- **Method:** In `dev/tests/suite.md`, replace the references to the removed `T4 Inline Guards` section: T16 (the Expected line naming "T4 Inline Guards run"), T153, T154 and T155 (their `Workflow:` lines) and T200 (the quoted acknowledgement text) — each now names capture through the Operational Logic of `rule.md`. Expected outcomes stay as written: T153 tier routing, T154 duplication merge, T155 constitutional HALT, T16 Apply-Immediately. Confirm by re-reading each edited scenario against the final `spec.md`/`task.md` wording, not against the old text. `grep -n "Inline Guards" dev/tests/suite.md` prints nothing.
- **Status:** Done
- **Changes:** suite.md: the T16 expectation, the Workflow lines of T153-T155 and the quoted acknowledgement of T200 now name the Operational Logic of rule.md; three Guards-tested labels renamed; expected outcomes unchanged; no Inline Guards left in the suite.
- **Notes:** T156 (T4 + Version Drift Guard) does not cite the removed section and is untouched. Run after T-34C01 and T-34C03 so the re-targeted text matches shipped wording.

### [T-34T02] Validation: six new cognitive scenarios T225-T230, each with a control

- **Goal:** Pin the gate in both directions — it must decline what has no evidence, and it must not decline or inflate what the user asked for.
- **Method:** Append to `dev/tests/suite.md`, in the file's Test A / Test B (control) form, before the closing line: **T225** — an agent-originated candidate with no cited occurrence → one `[DR] Not codified` line, no RULES.md write, no question (RA-2, RA-8); control: the same candidate with a cited, persisting, uncovered, reversible occurrence → admitted at the workspace rung as a soft convention via the E4 proposal, whose options include "do not adopt". **T226** — a candidate already covered by an engine rule (a shipped advisory or an adapter rule) → declined, the Decision Record naming the covering rule (RA-3 W2); control: a candidate no engine rule covers is not declined. **T227** — a user-stated rule ("remember that every artifact of kind K is checked on every configuration") → written as stated, body at most 10 non-empty lines, history row `user-stated`; no promotion block, no cascade to composing artifacts, no retroactive trigger, each narrated as one "not added" Decision Record; the deadlock hazard (RA-3: the check needs a running platform the agent may not reach) reported as an advisory beside the write, not a question (RA-5, RA-6); control: a user who states the blocking form gets the blocking form. **T228** — an agent-originated candidate proposing a hard form for a reversible harm → admitted soft, the hard form declined (RA-4); control: irreversible-class harm (E1) may take the hard form. **T229** — ventilation over a project whose agent-originated rule cites a file that no longer exists → `RULE_RETIRE_CANDIDATE {id}: a` with `→ /magic.rule remove {id}`, nothing edited (RA-7); controls: a user-stated rule is not flagged on (a), and an engine-owned convention is never flagged. **T230** — an agent-originated candidate with a cited, persisting, uncovered, reversible occurrence whose lowest sufficient placement is a regulation inside one specification, run through `/magic.rule` → one `[DR] Not codified … placed at rung 2` record naming the governing specification with the override `/magic.spec amend {spec}`, no `RULES.md` write, no question (RA-8 write reach; the same holds for a rung-1 note); control: the same candidate arising during `/magic.spec` work is written into the specification under edit and narrated as an admission record, `RULES.md` untouched. Update the suite header and closing line: `1.9.81` → `1.9.82`, `Last: T224` → `Last: T230`.
- **Status:** Done
- **Changes:** suite.md: appended T225-T230 (six scenarios in Test A / Test B control form, each with Guards tested and Regression for); header 1.9.81 to 1.9.82, closing line Last T224 to T230.
- **Notes:** T230 was added when the spec pass that preceded this update gave the rung-1 and rung-2 outcomes of `/magic.rule` a defined wording (RA-8 write reach) — the first planning deliberately left them unpinned. Every scenario names its `Guards tested` and `Regression for` lines like T224.

### [T-34T03] Validation: harness, leak scan, hardlinks, cognitive pass; single C14 bump

- **Goal:** Prove the tree is consistent, then close the phase's one C14 bump.
- **Method:** (1) `node --test dev/tests/engine.js` — expect 140 of 140 (no harness case is added: every change is prose, and nothing in the harness pins the removed wording). (2) Leak scan of this phase's engine edits: `git diff -U0 -- .magic workflows | grep '^+' | grep -E "l[12]-[a-z0-9-]+\.md|T-[0-9]+[A-Z][0-9]+|phase-[0-9]+|\b(W[1-3]|H[1-6])\b"` prints nothing. (3) `node dev/scripts/validate-hardlinks.js` exits 0. (4) `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`, `role_registry.missing: []`. (5) Cognitive pass: evaluate T16, T153-T156, T200 and T225-T230 against the final workflow text (`/magic.dev.simulate test`, scoped) → all PASS. (6) C14, once: `node .magic/scripts/executor.js update-engine-meta --workflow magic.rule magic.spec magic.task magic.analyze` → engine 2.1.110 → 2.1.111, dev-repo Engine Version snapshot synced, `skills/magic-spec/SKILL.md` and `skills/magic-rule/SKILL.md` regenerated from the edited wrappers (`grep -n "Operational Logic" skills/magic-spec/SKILL.md` matches). (7) Post-bump: repeat (1), (3) and (4); every relative link under `docs/` resolves.
- **Status:** Done
- **Changes:** Harness 140/140 before and after C14; leak scan of the engine diff clean; hardlinks validated; check-prerequisites ok with no role gaps; docs links 0 broken (14 files). C14 once: engine 2.1.110 to 2.1.111, 73 files checksummed, dev-repo snapshot synced, skills magic-spec and magic-rule regenerated from the edited wrappers. Cognitive pass: T16, T153-T156, T200 and T225-T230 walked against the final text — all PASS.
- **Notes:** Every task in this phase writes `.magic/`, `workflows/` or `docs/` → C14 runs exactly once, here, after the last engine edit. No file is created inside `.magic/`, so the tracked-files invariant (every `.checksums` entry must be git-tracked) that turned Phase 32's post-bump run red is not at risk. `.magic/templates/rules.md`, `.design/RULES.md` and `rules/magic.md` are deliberately NOT edited (RA-9: the gate is not a constitutional convention); if a task finds a reason to touch them, stop and record it.
