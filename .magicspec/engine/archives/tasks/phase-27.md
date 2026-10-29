---
phase: 27
name: "Idea Intake Gate Deployment (E6)"
status: Done
subsystem: ".magic"
requires: []
provides:
  - ".magic/spec.md: Step 0.5 Idea Intake Gate (IK-1..IK-8) installed; Anti-Stall invariant 12 suspends only during a convergent dialogue; Ambiguity (C25) constraint carves out E6; Mode Transition cap rebound from round-count to non-convergence; Completion Checklist gains an Idea Intake line"
  - "C27 whitelist entry E6 registered in all four carriers: DA-2 table, .design/RULES.md, .magic/templates/rules.md, rules/magic.md SS7 — with an identical narrowing note in the two constitution files"
  - "l1-decision-autonomy.md 1.3.0: DA-2 row E6, closure clause E1-E5 -> E1-E6, containment paragraph proving E6 does not loosen DA-1"
  - "prompt-engineer card + l2-role-cards-governance.md 1.2.0: conditional six-row Idea Intake Gate audit, fires only when the gate actually fired"
  - "docs/spec.md SS5.0: non-specialist explanation of the gate; two stale one-round-cap statements corrected"
  - "dev/tests/suite.md T209-T212 (v1.9.76); l2-test-suite.md 1.16.0 with the count drift 206 -> 211 corrected"
  - "workflows/magic.spec.md + regenerated skills/magic-spec/SKILL.md carry the gate hint"
key_files:
  created: []
  modified:
    - ".magic/spec.md"
    - ".magic/templates/rules.md"
    - ".magic/roles/prompt-engineer.md"
    - "workflows/magic.spec.md"
    - "rules/magic.md"
    - "docs/spec.md"
    - "dev/tests/suite.md"
    - ".design/RULES.md"
    - ".design/engine/specifications/l1-decision-autonomy.md"
    - ".design/engine/specifications/l2-role-cards-governance.md"
    - ".design/engine/specifications/l2-test-suite.md"
patterns_established:
  - "A whitelist extension lands atomically across all four C27 carriers (DA-2 table, live constitution, distributed template, ambient rules); a constitution disagreeing with the engine that enforces it is a release blocker"
  - "An uncapped clarification dialogue is made finite by a strict-shrink rule on the open-question set, never by a round counter — the counter was rejected by owner choice and the shrink rule replaces it"
  - "Deploying a behavioral rule means reconciling every surface that states the opposite; grep the workflow body for contradicting clauses rather than trusting the spec's own deployment table, which missed one of three here"
  - "Editing any file under workflows/ or rules/ delinks its .agents/ twin — verify with fsutil and Get-FileHash immediately, because the edit itself always appears to succeed and sync-skills silently generates from the stale copy"
duration_minutes: ~
---

# Stage 27 Tasks — Idea Intake Gate Deployment (E6)

**Phase:** 27
**Status:** Done
**Strategic Goal:** Install the input-side clarification gate specified by [l1-idea-intake-gate.md](../specifications/l1-idea-intake-gate.md) v1.0.0 across every surface that currently states the opposite rule, and register E6 in the C27 Escalation Whitelist in all four places that carry it.

## Atomic Checklist

- [x] [T-27A01] Install the Idea Intake Gate step in the spec workflow body
- [x] [T-27A02] Reconcile the three anti-question clauses and extend the Completion Checklist
- [x] [T-27B01] Register E6 in C27 across the live constitution and its distributed template
- [x] [T-27B02] Add the E6 row to the DA-2 whitelist table
- [x] [T-27C01] Carry E6 into the ambient user-side rules and restore the hardlink pair
- [x] [T-27D01] Add the gate line to the spec workflow wrapper
- [x] [T-27E01] Extend the prompt-engineer reviewer gate with the IK check table
- [x] [T-27F01] Document the gate in the user-facing spec workflow page
- [x] [T-27T01] Cognitive suite coverage for the four gate behaviors
- [x] [T-27T02] C14 bump and engine integrity verification

## Detailed Tracking

### [T-27A01] Install the Idea Intake Gate step in the spec workflow body

- **Spec:** l1-idea-intake-gate.md §5 row 1, IK-1, IK-4, §4.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "Idea Intake Gate" .magic/spec.md` returns a step heading positioned after `### Step 0: Workspace Intent Detection` and before `### Dispatching from Raw Input`; the step text names both firing conditions F1 and F2 and the IK-2 self-resolution precondition; `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` still returns `ok: true`.
- **Handoff:** Gates T-27A02, T-27D01, T-27F01, T-27T01 — every one of them asserts against the wording this task fixes.
- **Changes:** Added `### Step 0.5: Idea Intake Gate (E6)` to `.magic/spec.md` between Step 0 and Explore Mode — the IK-1 silence rule, six numbered clauses (IK-2 investigation, IK-4 F1/F2 firing test with the one-sentence-Overview materiality check, IK-3 intent-only domain, IK-5 plain-language format, IK-6 strict-shrink termination, IK-7 chat-only residency), and the IK-8 scope-containment note. Pre-flight stayed `ok: true`.
- **Notes:** Critical path. The step is a silent evaluation by IK-1: when neither F1 nor F2 holds the workflow proceeds to dispatch in the same turn with no narration, so the prose must not read as a mandatory user-visible stage. Carry the §4.1 flow and the IK-6 strict-shrink termination rule into the step body — an uncapped dialogue with no stated termination test is the one way this deployment can hang a session.

### [T-27A02] Reconcile the three anti-question clauses and extend the Completion Checklist

- **Spec:** l1-idea-intake-gate.md IK-9, IK-3, IK-8; §5 row 1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** All four checks pass against `.magic/spec.md` — (1) Core Invariant 12 carries the IK-9 suspension clause naming the IK-6 dialogue; (2) the `Dispatching from Raw Input` → `Constraints` → `Ambiguity (C25)` bullet names E6 as an exception while still routing detail-level ambiguity to `<!-- TBD: … -->`; (3) `grep -n "2nd \"are you sure" .magic/spec.md` returns nothing; (4) the Task Completion Checklist contains an `Idea Intake (E6)` line.
- **Handoff:** Track A complete — unblocks the wrapper parity and documentation tracks.
- **Changes:** All four sites reconciled. Invariant 12 gained the IK-9 suspension clause plus the explicit statement that a gate firing without an IK-4 condition is a violation, not an exemption. The Ambiguity (C25) constraint now lists Step 0.5 among permitted objective gates and adds the narrowing sentence that every ambiguity reaching dispatch is detail-level by definition. Mode Transition Auto-Transfer's one-round cap rebound to non-convergence — verified 0 remaining occurrences of the `"2nd \"are you sure?\" cycle"` wording. Completion Checklist gained a three-line `Idea Intake (E6)` entry.
- **Notes:** Three sites, not two. The spec's §5 enumerated Invariant 12 and the Ambiguity constraint; planning surfaced a third at [.magic/spec.md:116](../../../.magic/spec.md), the Mode Transition `Auto-Transfer (C9 default)` clause, whose *"Never stall on a 2nd \"are you sure?\" cycle"* is a hard one-round cap that contradicts IK-6's uncapped convergent dialogue. Auto-Transfer's substance is correct and must survive — it *is* the IK-6 termination behavior for Explore Mode — so reword the cap to bind on non-convergence ("never continue a round that did not shrink the open set") rather than on round count. Do not delete the clause.

### [T-27B01] Register E6 in C27 across the live constitution and its distributed template

- **Spec:** l1-idea-intake-gate.md IK-8, §5 row 4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "E6" .design/RULES.md .magic/templates/rules.md` shows the escalation list reading E1–E6 in both files with the same entry text; the C27 closing line ("The list is closed; extending it is itself an E4 event") is retained unchanged in both; `.design/RULES.md` version bumped in its own header and in its Document History.
- **Handoff:** Pairs with T-27B02 — E6 must exist in the DA-2 table and both constitution files before any workflow body cites it.
- **Changes:** `.design/RULES.md` 1.9.0 → 1.10.0 and `.magic/templates/rules.md` both gained E6 in the C27 DA-2 summary line plus an identical narrowing blockquote; the "Relationship to neighbors" sentence now names the intake gate as E6's source. Parity confirmed by grep across both files. Side effect handled in-task: the RULES bump created drift against `TASKS.md`'s recorded base, patched to v1.10.0 in place under a `[DR]` — the rule change is this phase's own planned output, so run.md's Sync guard (which exists for *external* rule changes) would have re-planned circularly.
- **Notes:** Parity between the two files is the invariant, not the edit itself. `.design/RULES.md` is this repository's live constitution; `.magic/templates/rules.md` is the copy consumer projects receive at init, and divergence between them ships a constitution that disagrees with the engine enforcing it. Edit both in the same task for that reason. The entry text: *E6 — intent incoherence or essence ambiguity in freshly supplied idea input (l1-idea-intake-gate.md)*. The template is checksum-tracked, so this task's write falls inside C14 scope even though it is "only a template".

### [T-27B02] Add the E6 row to the DA-2 whitelist table

- **Spec:** l1-idea-intake-gate.md IK-8; l1-decision-autonomy.md DA-2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "| E6 |" .design/engine/specifications/l1-decision-autonomy.md` returns the new row in the DA-2 table with a cross-reference to `l1-idea-intake-gate.md`; file header version reads 1.3.0; `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `ok: true` with no `VERSION_DRIFT` — the `.design/engine/INDEX.md` row must be updated to 1.3.0 in the same task.
- **Handoff:** Completes Track B.
- **Changes:** `l1-decision-autonomy.md` 1.2.0 → 1.3.0 — DA-2 table gained row E6 (F1/F2, sourced to `l1-idea-intake-gate.md`), the closure clause rescoped E1–E5 → E1–E6, and a containment paragraph was added establishing that E6 does not loosen DA-1: it recovers what no investigation can produce, excludes technical realization, and leaves Selection/Sequencing forks declarative. Reciprocal `Related Specifications` link added. `.design/engine/INDEX.md` row synced to 1.3.0; `--verify-headers` clean.
- **Notes:** Minor bump under the Amendment Rule, so the spec reverts `Stable → RFC` and is re-promoted after review within the same task. Nothing declares `Implements: l1-decision-autonomy.md`, so no C12 cascade fires — the links from other specs are soft `Related Specifications` references, which C12 does not follow. Add the reciprocal link to `l1-idea-intake-gate.md` in the DA-2 spec's own `Related Specifications` list while editing.

### [T-27C01] Carry E6 into the ambient user-side rules and restore the hardlink pair

- **Spec:** l1-idea-intake-gate.md §5 row 5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "E6" rules/magic.md` shows the entry in §7's DA-2 summary line; `fsutil hardlink list rules\magic.md` lists exactly two paths (`rules\magic.md` and `.agents\rules\magic.md`); `node dev/scripts/validate-hardlinks.js` exits 0; `Get-FileHash rules\magic.md, .agents\rules\magic.md` returns identical hashes.
- **Handoff:** Independent of every other track — may run at any point before T-27T02.
- **Changes:** `rules/magic.md` §7 gained the E6 entry (intake gate conditions, the never-ask-technical rule, plain-language and shrink requirements) and the whitelist summary line widened to name idea-intake incoherence. **[C-001] fired exactly as the plan predicted**: after the edit `fsutil hardlink list` reported one path instead of two and `Get-FileHash` showed `.agents/rules/magic.md` still holding pre-edit content. Link recreated, hashes now identical, `validate-hardlinks.js` exits 0. A pre-existing, unrelated delink (`GEMINI.md` missing from the AGENTS.md group, 3/4 linked) was found by the same validator run and recorded as diagnostic `AGENTS_HARDLINK_GEMINI_MISSING` — out of this phase's scope, not repaired here.
- **Notes:** **Carries [C-001].** `rules/magic.md` is hardlinked to `.agents/rules/magic.md`, and both `Write` and `Edit` replace the inode, silently delinking the pair and leaving `.agents/` holding stale content. The verification above is not optional bookkeeping — it is the only thing that catches the break, because the edit itself always appears to succeed. `rules/` sits outside C14 checksum tracking, so this task alone would ship without a version bump; the phase bumps anyway because other tracks write inside `.magic/`.

### [T-27D01] Add the gate line to the spec workflow wrapper

- **Spec:** l1-idea-intake-gate.md §5 row 2; l2-workflow-wrappers.md §6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n -i "intake" workflows/magic.spec.md` returns the new hints-block line; `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` reports no `WRAPPER_BODY_DRIFT`. The regenerated `skills/magic-spec/SKILL.md` is **not** asserted here — it does not exist until T-27T02 runs `sync-skills`, and that task's own Verify covers it.
- **Handoff:** Must land before T-27T02 — see Notes.
- **Changes:** `workflows/magic.spec.md` Hints block gained the Idea Intake Gate (E6) line — firing conditions, the never-ask-technical rule, the plain-language requirement, the shrink-or-end rule, and a pointer to `.magic/spec.md §Step 0.5`; the Explore Mode line now records that Anti-Stall is suspended during an active intake dialogue. The ordering dependency this task's Notes flagged turned out to be real but insufficient — see T-27T02.
- **Notes:** Depends on T-27A01/T-27A02: the wrapper body must reflect the workflow body it fronts, and the Wrapper-Body Parity invariant fails if the wrapper describes a step whose wording has since changed. Hidden ordering dependency on the closing task: `skills/magic-spec/SKILL.md` is **generated**, not hand-edited — `update-engine-meta` regenerates it from this wrapper via `sync-skills`. Editing the wrapper after the C14 bump ships a stale skill wrapper to users. One line in the Hints block is enough; the wrapper is a shim, not a second copy of the protocol.

### [T-27E01] Extend the prompt-engineer reviewer gate with the IK check table

- **Spec:** l1-idea-intake-gate.md §4.5, §5 row 6; l2-role-cards-governance.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n "IK-" .magic/roles/prompt-engineer.md` returns all six check rows (IK-2, IK-3, IK-4, IK-5, IK-6, IK-7); `node .magic/scripts/executor.js check-prerequisites --json --workspace=engine` reports `role_registry` total 14, missing 0, dangling_handoffs 0; `l2-role-cards-governance.md` version bumped with its `.design/engine/INDEX.md` row matching.
- **Handoff:** Independent track — no ordering constraint against A, B, C, or F.
- **Changes:** `.magic/roles/prompt-engineer.md` gained the conditional **Idea Intake Gate Audit (E6)** — a six-row IK check table gated on the Step 0.5 gate having actually fired — plus an anti-pattern barring audit of a silent gate; the whitelist reference widened E1-E5 → E1-E6. `l2-role-cards-governance.md` 1.1.1 → 1.2.0 mirrors both additions; INDEX row synced. `check-prerequisites` role registry still 14/14 with 0 missing and 0 dangling handoffs.
- **Notes:** The card is the enforcement surface; the spec section is its documentation. Both move together or the registry integrity check reports a card whose content its governing spec does not describe. Scope the checks to invocations where the gate actually fired — a silent gate (the common case by IK-4) has nothing to review, and a reviewer that reports IK findings on every dispatch is noise.

### [T-27F01] Document the gate in the user-facing spec workflow page

- **Spec:** l1-idea-intake-gate.md IK-1, IK-3, IK-5; l1-documentation-system.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -n -i "intake" docs/spec.md` returns the new section; `node dev/scripts/sync-docs.js` reports no drift against the workflow body; the section states in plain terms what a user will and will not be asked.
- **Handoff:** Closes the user-visible surface.
- **Changes:** `docs/spec.md` gained §5.0 Idea Intake Gate, written for a non-specialist: the two situations that trigger a question, the explicit promise that nothing technical is ever asked, how questions are phrased, and how to end the gate at any time by answering "you decide". Two stale statements corrected while there: §5.1's Auto-Transfer bullet ("After the 2nd idea exchange") and the Core Invariants table's Anti-Stall row, both of which encoded the one-round cap IK-6 replaced.
- **Notes:** Planning-surfaced extension — the spec's §5 table did not list it. `docs/spec.md` is the user-facing explanation of `/magic.spec`, and this phase changes what a user actually experiences at the command: they may now be asked something before specs appear. A behavior change that reaches the user and is documented nowhere they read is the gap this task closes. Keep the section short and outcome-framed, matching IK-5's own plain-language mandate — the page explaining a plain-language rule should not itself require expertise to read.

### [T-27T01] Cognitive suite coverage for the four gate behaviors

- **Spec:** l1-idea-intake-gate.md §5 row 7; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -cE "^### T(209|210|211|212) " dev/tests/suite.md` returns `4`, each block following the established `Guards tested` / `Regression for` shape, covering: a coherent idea asserts zero questions; an F2 idea asserts a fired gate with IK-3-clean and IK-5-compliant wording; a "you decide" reply asserts immediate termination plus TBD markers and no second round; a technical-fork idea asserts no question. `node dev/tests/engine.js` remains green at its current count with no new case — see Notes. `l2-test-suite.md` version bumped with its `.design/engine/INDEX.md` row matching.
- **Handoff:** Precedes T-27T02 so the bump ships a tested engine.
- **Changes:** `dev/tests/suite.md` gained T209 (silent pass on a coherent idea), T210 (F2 fire with intent-only, plain-language questions), T211 (non-convergent termination — both the `"you decide"` reply and the close-one-open-two case), T212 (technical fork never reaches the user channel); suite v1.9.75 → v1.9.76. `l2-test-suite.md` 1.15.0 → 1.16.0 with the count corrected 206 → 211 (T01–T212, gap at T67) — the recorded figure was already one behind before this phase, since T208 had shipped without a spec sync, so this row closes that drift too. Script harness unchanged and green at 69/69: the gate ships no executor code path, recorded explicitly so the flat count is not later read as an omission.
- **Notes:** Coverage belongs in the cognitive suite, not the script harness: the gate is workflow prose with no executor subcommand and no code path, so `dev/tests/engine.js` has nothing to exercise. Recording that explicitly here prevents a later reader treating the absent script test as an oversight. The fourth scenario is the important one — it is the regression guard against IK-3 eroding back into technical surveys, which is the failure mode C27 was written to stop.

### [T-27T02] C14 bump and engine integrity verification

- **Spec:** RULES.md C14; l1-idea-intake-gate.md §5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.spec` completes; `node .magic/scripts/executor.js update-engine-meta --check` exits 0; `.magic/.version` incremented from 2.1.78; `skills/magic-spec/SKILL.md` regenerated and carrying the T-27D01 line; `node dev/tests/engine.js` green; `node dev/scripts/validate-hardlinks.js` exits 0.
- **Handoff:** Phase close. Next command is `/magic.run engine` for the following phase, or `/magic.task engine` if drift surfaced.
- **Changes:** C14 bump 2.1.78 → 2.1.79; checksums regenerated over 70 files; dev-repo Engine Version snapshot auto-synced (Phase 24's exemption working as designed). **The bump shipped a stale skill wrapper on its first run, and two engine defects had to be worked around to fix it.** (1) `workflows/*.md` are per-file hardlinks to `.agents/workflows/*.md`, but `validate-hardlinks.js` checks only the AGENTS family and `rules/`, and C-001 names only `rules/*.md` — so the T-27D01 edit silently delinked the pair and `sync-skills`, which reads `.agents/`, generated the wrapper from pre-edit content. (2) Re-running `update-engine-meta` reported *"No changes detected in engine core"* and skipped regeneration entirely, because its change detection reads `.magic/` checksums only and the second-round change lived in `workflows/`. Resolution: hardlink recreated (all 7 workflow pairs verified at 2 links), `sync-skills` invoked directly — the generated header's `SOURCE:` line flipped from `.agents/workflows/magic.spec.md` back to the canonical `workflows/magic.spec.md`, confirming the repair. Both defects recorded as `WORKFLOWS_HARDLINK_UNGUARDED` (error) and `C14_SKIPS_WORKFLOWS_ONLY_CHANGE` (warning). Final state: integrity `--check` exit 0, `validate-hardlinks.js` exit 0, harness 69/69, wrapper carries the gate.
- **Notes:** Must run last — every preceding track except C and B02 writes inside `.magic/` or `workflows/`, and C14 regenerates checksums plus the skill wrapper from whatever state it finds. Only `.magic/spec.md` is a workflow body, so `--workflow magic.spec` is the correct and complete tag. Re-run `validate-hardlinks.js` here even though T-27C01 already did: the checksum regeneration touches the tree between the two points, and a break detected at phase close is far cheaper than one discovered by a user.

## Validation Coverage

Track T is this phase's validation track — `T-27T01` carries the four behavioral scenarios and `T-27T02` the integrity gate. No separate validation task is registered, because the phase ships no executor code path for a script-level harness case to exercise; the deployed artifact is workflow prose, and the cognitive suite plus `/magic.dev.simulate` over the amended `.magic/spec.md` are its only meaningful verification surfaces.
