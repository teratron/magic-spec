# Workflow Test Suite — rule

Cases of the area `rule` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T12 — Rule Add Duplicate Convention

- **Workflow:** `rule.md` (Adding a Convention)
- **Synthetic State:**
  - RULES.md §7 contains C5: "All dates use ISO 8601 format."
- **Action:** `"Add rule: dates must follow ISO 8601."`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] RULES.md read in full
  - [ ] **Duplication Guard**: semantic overlap with C5 detected
  - [ ] Trust Mode (C9) → Overlap reported as advisory; duplicates merged or ignored without halt
  - [ ] Actionable Outcome: summary of rule consolidation shown
- **Guards tested:** Duplication Guard (Non-blocking)

### T13 — Rule Remove with Workflow Dependency

- **Workflow:** `rule.md` (Removing a Convention)
- **Synthetic State:**
  - RULES.md §7 C3: "Parallel Task Execution Mode"
  - `run.md` references C3 via Mode Guard
- **Action:** `"Remove rule C3"`
- **Expected:**
  - [ ] Pre-flight passes
  - [ ] Target identified: C3 — Parallel Task Execution Mode
  - [ ] Removal asks one confirmation (destructive action, C9 gate 1); major version bump once confirmed
  - [ ] **Workflow Dependency Check**: C3 is referenced by `run.md` as Mode Guard
  - [ ] Warning: "This rule is used by run.md as Mode Guard. Removing it may break that workflow's logic."
  - [ ] Impact Analysis includes TASKS.md version staleness note
- **Guards tested:** Workflow Dependency Check, Impact Analysis

### T24 — Rule Amend Core Section (§1–6)

- **Workflow:** `rule.md` (Amending a Convention)
- **Synthetic State:**
  - RULES.md: §2 Status Rules contain `RFC → Stable: reviewed, approved, no open questions.`
- **Action:** `"Change rule: RFC specs can go Stable with one approval instead of full review"`
- **Expected:**
  - [ ] Agent identifies target: §2 (core section, not §7)
  - [ ] Agent informs: "This is a core section (§2). Amending requires explicit approval."
  - [ ] Constitutional implications surfaced: relaxing quality gate
  - [ ] User must explicitly confirm core amendment
  - [ ] If approved: §2 updated, RULES.md major version bump
- **Guards tested:** Core-Amendment Routing (target is in §1–6, not §7), core section amendment gate

### T41 — Rule Batch Operations and ID Assignment

- **Workflow:** `rule.md`
- **Synthetic State:**
  - `RULES.md` §7 currently has rules up to C3.
- **Action:** User prompts *"Amend C2 to say X, and add two new rules: Y and Z"*.
- **Expected:**
  - [ ] **Batch**: When the user requests multiple rule changes (add + amend, or multiple adds) in §7, group all changes into a single atomic update. In **Trust Mode (C9)**, notify the user and apply immediately without additional confirmation. Only core amendments (§1–6) or conflicting §7 rules require explicit approval.
  - [ ] New rules are accurately assigned sequential IDs by calculating highest existing (`C4` and `C5`).
  - [ ] Agent performs a single final version bump.
- **Guards tested:** Batch operations spam prevention, Dynamic ID assignment.

### T70 — Local Rule Constitutional Conflict (Hierarchy Guard)

- **Workflow:** `rule.md`
- **Synthetic State:**
  - Root `.magicspec/RULES.md` §1 contains Core C1: "English only".
  - Active workspace: `.magicspec/analytics/`.
- **Action:** User prompts in `analytics` workspace: "Add rule C8: Russian comments are allowed."
- **Expected:**
  - [ ] Agent identifies current workspace = `analytics`.
  - [ ] **Hierarchy Guard** scans ROOT RULES.md §1-6 (Constitution).
  - [ ] Agent detects that proposed C8 contradicts Root C1.
  - [ ] **HALT**: Agent refuses to add the rule.
  - [ ] Message: "Proposed local rule contradicts Global Constitution (§1 C1). Local conventions cannot override universal invariants."
- **Guards tested:** Cross-Workspace Constitutional Guard, Hierarchy Integrity.

### T75 — Rule: Rules Parity Sync Offer

- **Workflow:** `rule.md`
- **Synthetic State:**
  - `RULES.md` version 1.4.0.
  - `TASKS.md` header contains `Based on RULES: 1.4.0`.
- **Action:** User adds a new rule.
- **Expected:**
  - [ ] Agent proposes `RULES.md` update (version bump to 1.5.0).
  - [ ] Agent writes `RULES.md`.
  - [ ] **Rules Parity Check**: Agent detects `TASKS.md` is now stale.
  - [ ] Agent alerts user: "`TASKS.md` is based on rules v1.4.0 but project is now v1.5.0."
  - [ ] Agent narrates exactly one next command, `/magicspec plan {workspace}`, to synchronize the plan.
- **Guards tested:** Rules Parity (Stale check), Sync Offer.

### T137 — Rule Workflow Pre-flight HALT on Checksum Mismatch

- **Workflow:** `rule.md` (§Operational Logic — Pre-flight)
- **Synthetic State:**
  - `skills/magicspec/.checksums` has been manually altered (hash mismatch)
  - `check-prerequisites --json` returns `checksums_mismatch: true`
- **Action:** `/magicspec rule add "New convention"` triggered
- **Expected:**
  1. **Check**: `node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
  - If `ok: true` → Skip silently. Return control to calling workflow.
  - If `ok: false` & contains `ENGINE_INTEGRITY` or `GHOST_REGISTRY` warnings:
    - **C15 Filter**: Cross-reference mismatched files against `workspace.json` scope for `{active-workspace}`.
    - If all mismatches are **out-of-scope** → **Proceed** silently (Log: "Integrity drift detected in out-of-scope files; ignoring per C15").
    - If any mismatch is **in-scope** → **HALT**. Report: "Engine integrity failure (In-Scope): {warning_type}. Run `node skills/magicspec/scripts/executor.js update-engine-meta` or restore from origin."
  - If `ok: false` & missing system files (no integrity warnings) → proceed to Step 2 (Init).
  - If `ok: false` & reason is unrecognized → **HALT**. Report: "Unexpected pre-flight failure: {raw output}. Investigate manually."
  - [ ] Pre-flight runs `check-prerequisites --json`
  - [ ] Agent detects `checksums_mismatch`
  - [ ] **HALT** with report: "Engine integrity failure. Run `update-engine-meta` or restore from origin."
  - [ ] No rule proposal is shown
  - [ ] No RULES.md modification occurs
- **Guards tested:** Rule pre-flight HALT condition, engine integrity gate

### T140 — Rule Remove Dependency Scan Warns on Referenced Convention

- **Workflow:** `rule.md` (Remove — Dependency Scan)
- **Synthetic State:**
  - RULES.md §7 C5: "All specs must use kebab-case filenames"
  - `analyze.md` Mode C step 3 references "kebab-case convention" with C5 check
- **Action:** `"Remove rule C5"`
- **Expected:**
  1. Run `node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.
  - `ok: true` → proceed.
  - Any other result → branch per `init.md` §1: `ENGINE_INTEGRITY` / `GHOST_REGISTRY` → **C15 Filter** (**HALT** only if in-scope); missing `.magicspec/` → auto-run `skills/magicspec/references/init.md`, then resume; unrecognized failure → **HALT**.
  - [ ] Before asking, agent scans `skills/magicspec/workflows/*.md` and `.magicspec/` for `C5` references
  - [ ] Reference found in `analyze.md`
  - [ ] The confirmation includes the dependency warning: "Convention `C5` is referenced by: [analyze.md: Mode C Structural Integrity]. Removing it may break workflow logic or spec compliance."
  - [ ] Exactly one confirmation (DA-5 single question) showing the dependency list — no separate approval step
  - [ ] If confirmed → C5 deleted, Major version bump
- **Guards tested:** Remove Dependency Scan integrated into the single Remove confirmation (no extra gate)

### T143 — Rule Core-Amendment Routing Gate

- **Workflow:** `rule.md` (Guards — Core-Amendment Routing)
- **Synthetic State:**
  - RULES.md: §3 Layer Rules contain "L2 cannot enter RFC until L1 is Stable"
- **Action:** `"Change rule: L2 can enter RFC regardless of L1 status"`
- **Expected:**
  - [ ] Agent identifies target: §3 (core section)
  - [ ] Core-Amendment Routing activates: "This targets core section §3. Core amendments require explicit approval and trigger a Major version bump."
  - [ ] User must explicitly confirm
  - [ ] If denied → abort, no changes
  - [ ] If confirmed → §3 updated, RULES.md Major version bump
- **Guards tested:** Core-Amendment Routing gate, explicit approval requirement

### T208 — Rule Batch Mixed-Type Version Precedence and Guard Failure

- **Workflow:** `rule.md` (§Operational Logic — Apply, Batch)
- **Synthetic State (Test A — version precedence):**
  - `RULES.md` §7 has C3 ("Parallel Task Execution Mode", referenced by `run.md` as Mode Guard) and C5 ("All dates use ISO 8601 format").
  - No Core-Amendment or Constitutional conflicts present.
- **Action A:** `"Remove rule C3, and add a new rule: all API responses must include a request-id header."`
- **Expected A:**
  - [ ] Dependency Scan on C3 removal surfaces the `run.md` Mode Guard reference in the Remove confirmation (per T13).
  - [ ] Batch groups both changes into a single atomic update (per existing Batch clause).
  - [ ] **Batch Version Precedence** fires: Remove = Major, Add = Minor → single bump applied is **Major** (highest precedence), not two sequential bumps and not Minor.
  - [ ] Document History records exactly one version row for the combined change.
- **Synthetic State (Test B — guard failure):**
  - `RULES.md` §7 has C4 ("No inline SQL — use query builder").
  - `RULES.md` §5 (core, Content Rules): "No implementation code — pseudo-code only."
- **Action B:** `"Remove rule C4, and add a new rule: all specs must include runnable Python code samples."`
- **Expected B:**
  - [ ] C4 removal passes Guards cleanly (no core conflict, dependency scan clean).
  - [ ] The new rule ("runnable code samples") fails the **Constitutional Guard** — contradicts core §5.
  - [ ] **Batch Guard Failure** fires: the entire atomic batch **HALTs** — C4 is NOT removed despite passing its own guards individually.
  - [ ] Report names both the blocking item (contradicts §5) and that the clean item (C4 removal) is held pending resolution, not silently applied.
  - [ ] After the user drops or revises the offending item, the full batch (including C4 removal) is re-run as one atomic update — not auto-split.
- **Guards tested:** Batch Version Precedence, Batch Guard Failure (no partial atomic application); regression for "The Recursive Quarantine" crisis (Improv Mode 2026-08-07).

### T225 — An Agent-Originated Rule With No Cited Occurrence Is Declined; With Evidence It Is Admitted Soft (RA-2/RA-8)

- **Workflow:** `rule.md` (Operational Logic → Admission)
- **Synthetic State (Test A — no evidence):**
  - `.magicspec/RULES.md` §7 holds C1–C9. During spec work the agent itself proposes a convention: "all specs must list at least three alternatives in Drawbacks". No file, commit or session failure is cited; nothing has gone wrong.
- **Action A:** `/magicspec rule add "all specs must list at least three alternatives in Drawbacks"`, composed by the agent (origin: agent-originated).
- **Expected A:**
  - [ ] Origin is classified agent-originated; the evidence test finds no cited occurrence and the candidate is not an irreversible-class harm.
  - [ ] Exactly one line is narrated: `[DR] Not codified: … — no evidence. (Override: /magicspec rule add "…")`.
  - [ ] `RULES.md` is not written, its version is not bumped, and no question is asked.
- **Synthetic State (Test B — control):**
  - The same candidate, now with a cited occurrence: two Stable specs in the workspace (file and line named) were promoted with a single alternative and a downstream task was planned against the weaker one; nothing in the constitution, the shipped rules or a workflow gate catches it; the harm is reversible (an amend).
- **Action B:** the same `/magicspec rule add`.
- **Expected B:**
  - [ ] The candidate passes the without-rule questions (cause persists, uncovered, reversible) and no disqualifying hazard remains after rewording to the evidence scope.
  - [ ] It is admitted at the workspace rung as a **soft** convention; the admission record is at most seven lines.
  - [ ] It reaches the user through the E4 proposal, whose at most three options include "do not adopt".
- **Guards tested:** RA-2 evidence anchor; RA-8 one-line Decision Record; no question outside the whitelist; the gate is not a blanket refusal.
- **Regression for:** a non-conflicting rule approved only because nothing conflicts with it — the exact path that produced rules the agent later had to obey.

### T226 — A Candidate an Existing Rule Already Covers Is Declined Naming It (RA-3)

- **Workflow:** `rule.md` (Operational Logic → Admission, without-rule coverage question)
- **Synthetic State (Test A):**
  - The shipped rules already forbid writing task IDs, phase designators and spec file names into product files, and ventilation already reports `SDD_REFERENCE_LEAK`. The agent proposes a convention: "never write task IDs into source comments", citing one comment that does so.
- **Action A:** `/magicspec rule add` for that convention, agent-originated.
- **Expected A:**
  - [ ] The coverage question finds the shipped containment rule and the ventilation advisory.
  - [ ] One Decision Record: `[DR] Not codified: … — covered by {that rule}. (Override: /magicspec rule add "…")`, naming the covering rule.
  - [ ] Nothing is written; the one cited comment is a finding to fix where it occurs, not a rule.
- **Synthetic State (Test B — control):**
  - A candidate about a different concern that no shipped rule, convention, workflow gate, specification regulation, test or hook covers.
- **Expected B:**
  - [ ] The coverage question finds nothing; the candidate is not declined on that ground.
- **Guards tested:** RA-3 existing-coverage check reaching the engine's shipped rules, not only the two `RULES.md` tiers; duplication reach.
- **Regression for:** a duplicate of an engine rule registered because the check compared only the project's own tiers.

### T227 — A User-Stated Rule Is Written as Stated; Unstated Strengthenings Are Not Added (RA-5/RA-6)

- **Workflow:** `rule.md` (Operational Logic → Admission, user-stated branch) via `/magicspec spec` T4 capture
- **Synthetic State (Test A):**
  - Active workspace with a Stable spec. No convention about verification exists.
- **Action A:** `"Remember that every artifact of kind K is checked on every configuration the platform offers."`
- **Expected A:**
  - [ ] Origin is user-stated; the rule is not declined on necessity grounds.
  - [ ] It is written with scope *artifacts of kind K* and strength *checked*; the body is at most 10 non-empty lines and carries no Decision Record text.
  - [ ] Each unstated strengthening — a promotion block, a repeat for every artifact composing K, a retroactive trigger — is narrated as one "not added" Decision Record and is not written.
  - [ ] The deadlock hazard (the check needs a running platform the agent may not reach) is reported as an advisory beside the write, not as a question.
  - [ ] The Document History row records the origin `user-stated`.
- **Synthetic State (Test B — control):**
  - The user states the blocking form: `"Remember that a kind-K artifact must not be promoted until it passes on every configuration."`
- **Expected B:**
  - [ ] The blocking form is written as stated; nothing further is added or removed.
- **Guards tested:** RA-5 fidelity; RA-6 body bound and history origin; advisory instead of question.
- **Regression for:** a one-sentence operator rule inflated into a fail-closed gate with an enumeration, a cascade and a retroactive trigger.

### T228 — A Hard Form for Reversible Harm Is Admitted Soft (RA-4)

- **Workflow:** `rule.md` (Operational Logic → Admission, form and placement)
- **Synthetic State (Test A):**
  - The agent proposes a convention with a cited, persisting, uncovered occurrence whose harm is reversible (a mis-formatted table caught and fixed in the next commit), and drafts it as a blocking gate: "no task may be marked Done until every table passes a formatter".
- **Action A:** `/magicspec rule add` for the blocking gate, agent-originated.
- **Expected A:**
  - [ ] The harm class is reversible, the soft form has never been violated, and the user did not state the hard form: the hard form is not admissible.
  - [ ] The rule is admitted only as a **soft** convention (a violation is an advisory finding); the blocking condition is dropped, and the deadlock hazard is named as the reason.
- **Synthetic State (Test B — control):**
  - The harm is in the irreversible class (a release artifact published with a wrong file).
- **Expected B:**
  - [ ] The hard form may be admitted for that class.
- **Guards tested:** RA-4 soft-by-default form; the three conditions that admit the hard form.
- **Regression for:** blocking gates written for problems a later commit fixes, which then stop the agent's own work.

### T230 — A Specification-Placed Outcome From `/magicspec rule` Is Redirected, Not Written (RA-8)

- **Workflow:** `rule.md` (Operational Logic → Admission, write reach) as `/magicspec rule` and on behalf of `/magicspec spec`
- **Synthetic State (Test A):**
  - An agent-originated candidate with a cited, persisting, uncovered, reversible occurrence whose lowest sufficient placement is a regulation inside one specification (it binds only work on that specification).
- **Action A:** `/magicspec rule add …` for it.
- **Expected A:**
  - [ ] One Decision Record: `[DR] Not codified: … — placed at rung 2. (Override: /magicspec spec amend {spec})`, naming the governing specification.
  - [ ] `RULES.md` is not written; no question is asked. The same holds for a rung-1 note.
- **Synthetic State (Test B — control):**
  - The same candidate arises while `/magicspec spec` edits that specification.
- **Expected B:**
  - [ ] The regulation is written into the specification under edit and narrated as an admission record; `RULES.md` is untouched.
- **Guards tested:** RA-8 write reach; the rule workflow never exceeds its write scope.
- **Regression for:** a spec-scoped regulation promoted into the global constitution because the rule workflow could not place it anywhere else.

### T259 — The Post-Write Constitutional Conflict Report Names the Rule That Is Already Written and One Way to Resolve It

- **Workflow:** `rule.md` (Post-Write Impact → Constitutional Review (Post-Write))
- **Synthetic State (Test A):**
  - `/magicspec rule add "…"` passed admission and both pre-commitment reviews and was written: `RULES.md` holds the new convention `C7` and its version is bumped. The post-write review then finds that `C7` and `C3` would give the agent contradictory instructions at `run.md` Select.
- **Action A:** the post-write review reaches its HALT.
- **Expected A:**
  - [ ] **HALT** before the user is told the next step.
  - [ ] The report says the rule is **already written**, names the conflicting convention and the step, and gives exactly one way to resolve it, `/magicspec rule amend C7` — no "resolve before writing", no silent undo of the write, no option menu.
- **Synthetic State (Test B — control):** the conflict is found by the pre-commitment review (Operational Logic step 6), before anything is written.
- **Expected B:**
  - [ ] The proposal returns to its author and nothing is written, so there is nothing to amend.
- **Guards tested:** one resolution path per HALT (DA-8); the post-write review's report agreeing with its position after the write.
- **Regression for:** "The Stranded Child" crisis (Improv Mode 2026-10-01) — the post-write HALT told the agent to "resolve before writing" a rule the file already held and named no way to resolve it.
