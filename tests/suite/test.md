# Workflow Test Suite — test

Cases of the area `test` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T15 — Simulate Checksums Mismatch HALT

- **Workflow:** `test.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `skills/magicspec/.checksums` exists
  - `spec.md` hash does not match stored checksum (file was modified without regeneration)
- **Action:** `/magicspec-dev:test spec`
- **Expected:**
  - [ ] check-prerequisites reports `checksums_mismatch` for `spec.md`
  - [ ] **HALT** — do NOT proceed with simulation
  - [ ] Report mismatched files to user
  - [ ] **Hint Provided**: Agent suggests `update-engine-meta` to restore integrity.
  - [ ] Options: confirm changes were intentional (sync meta) OR restore from origin.
  - [ ] Simulation resumes only after user response
- **Guards tested:** Checksums mismatch HALT (Step 0)

### T32 — Simulate Missing Test Suite (Improv Mode Fallback)

- **Workflow:** `test.md` (Improv Mode)
- **Synthetic State:**
  - `tests/suite.md` file is missing or inaccessible.
- **Action 1:** User runs `/magicspec-dev:test test`
- **Expected 1:**
  - [ ] Agent checks for `tests/suite.md` and fails to find it.
  - [ ] Agent alerts user that test suite is missing, provides hint to restore file from origin, and falls back to **Improv Mode**.
  - [ ] Agent synthesizes a complex "Crisis Scenario" (e.g., INDEX.md desync).
  - [ ] Agent runs an end-to-end simulated lifecycle (Spec → Task → Run → Retro).
  - [ ] Agent outputs a Friction Audit report with identified "Rough Edges".
- **Action 2:** User runs `/magicspec-dev:test` (without target), user requests generic "live simulation"
- **Expected 2:**
  - [ ] Agent defaults to **Improv Mode**.
  - [ ] Executes the same synthesis and lifecycle end-to-end as Expected 1.
- **Guards tested:** Fallback trigger on missing tests, Improv Mode end-to-end execution, ambiguity handling

### T35 — Simulate Regression Sweep Post-Fix

- **Workflow:** `test.md` (Verification Step)
- **Synthetic State:**
  - Logic flaw found in a workflow definition (e.g. `init.md`).
  - Surgical fix applied.
  - Test case appended to `suite.md`.
- **Action:** User explicitly approves the "Corrective Proposal" changes.
- **Expected:**
  - [ ] Agent performs a spot-check of the modified lines in `init.md`.
  - [ ] Agent explicitly utilizes the *Run regression tests* handoff from `skills/magicspec-dev/workflows/test.md` or directly triggers the `/magicspec-dev:test test` suite.
  - [ ] Full regression suite is executed sequentially to ensure core `init.md` modifications did not break adjacent workflows.
- **Guards tested:** Post-fix regression sweep enforcement.

### T40 — Simulate Improv Mode Zero-Prompt Fallback

- **Workflow:** `test.md` (Wrapper & Engine)
- **Synthetic State:** Fresh design session, all files present.
- **Action:** User prompts `"/magicspec-dev:test"` without arguments.
- **Expected:**
  - [ ] Agent reads `skills/magicspec-dev/workflows/test.md`.
  - [ ] Agent does NOT ask the user to "pick a workflow".
  - [ ] Agent explicitly engages Improv Mode (Live Simulation) through §1 Mode Selection ("Improv: Default if 0 args") and the §1a Crisis Template.
  - [ ] Agent invents a crisis scenario and proceeds autonomously.
- **Guards tested:** Zero-prompt fallback rule, prompt ambiguity block.

### T63 — Simulation Cold Start Auto-Init

- **Workflow:** `test.md` (Step 0: Pre-flight)
- **Synthetic State:** Fresh repository, `.magicspec/` (missing).
- **Action:** User runs `/magicspec-dev:test`.
- **Expected:**
  - [ ] `check-prerequisites` returns `ok: false` (missing `.magicspec/`).
  - [ ] No `ENGINE_INTEGRITY` or `checksums_mismatch` warnings (checksums are valid).
  - [ ] Auto-run `skills/magicspec/references/init.md` to create `.magicspec/` structure.
  - [ ] After init completes, simulation resumes from Mode Selection.
- **Guards tested:** Auto-Init on missing `.magicspec/`, resume after init.

### T73 — Simulation: Corrupted Suite (Partial Content)

- **Workflow:** `test.md`
- **Synthetic State:**
  - `tests/suite.md` exists but contains only the header block (no `### T{N}` test scenarios).
  - File is readable but has zero parseable test cases.
- **Action:** User runs `/magicspec-dev:test test`
- **Expected:**
  - [ ] Agent reads `tests/suite.md` successfully (file exists).
  - [ ] Suite Integrity check detects 0 valid test scenarios (no `### T{N} —` headers found).
  - [ ] Agent reports: "Suite contains 0 valid tests. Hint: restore file from origin."
  - [ ] Agent falls back to **Improv Mode** (same as missing suite — T32).
  - [ ] Crisis scenario synthesized and walkthrough executed.
- **Guards tested:** Suite Integrity (zero-test edge case), Improv Mode fallback on corrupted suite

### T122 — Simulate C14 Enforcement Gate Blocks Report

- **Workflow:** `test.md` (§Reporting & Fixes — C14 Enforcement Gate)
- **Synthetic State:**
  - Agent ran `/magicspec-dev:test spec` and found 2 ROUGH EDGEs
  - Agent applied surgical patches to `skills/magicspec/workflows/spec.md`
  - Agent is about to report results
- **Action:** Agent reaches Reporting step
- **Expected:**
  - [ ] C14 Enforcement Gate fires: "were any `.magic/` files modified during this `/magicspec-dev:test` invocation?"
  - [ ] Answer: yes (`spec.md` patched) → `update-engine-meta` runs
  - [ ] `.version` bumped, `.checksums` regenerated
  - [ ] Only AFTER checksums match does the agent present results
  - [ ] If agent skips Gate and reports first → **FAIL**
- **Guards tested:** C14 Enforcement Gate blocking semantics

### T123 — Simulate Succession Max 2-Round Guard

- **Workflow:** `test.md` (§Succession — max iterations)
- **Synthetic State:**
  - Round 1: `/magicspec-dev:test test` finds 1 FAIL → agent patches → C14 Gate → Succession
  - Round 2: `/magicspec-dev:test test` finds 1 new FAIL (introduced by Round 1 fix) → agent patches → C14 Gate → Succession
  - Round 3 would start
- **Action:** Agent reaches 3rd Succession attempt
- **Expected:**
  - [ ] Agent detects round >2
  - [ ] Agent does NOT start a 3rd fix cycle
  - [ ] Agent reports: "Max Succession rounds (2) reached. Remaining issues: [list]."
  - [ ] Simulation completes with open issues documented
- **Guards tested:** Succession max 2-round guard, infinite loop prevention

### T124 — Simulate File-Path Argument Routing

- **Workflow:** `test.md` (§Mode Selection — file-path support)
- **Synthetic State:**
  - All engine files present and valid
- **Test A — Workflow name:**
  - **Action:** `/magicspec-dev:test spec`
  - **Expected:**
    - [ ] Direct mode: cognitive walkthrough of `spec.md`
- **Test B — File path:**
  - **Action:** `/magicspec-dev:test @/path/to/workflows/analyze.md`
  - **Expected:**
    - [ ] File path parsed: workflow name extracted as `analyze`
    - [ ] Direct mode: cognitive walkthrough of `analyze.md`
    - [ ] Same behavior as `/magicspec-dev:test analyze`
- **Guards tested:** File-path argument parsing, equivalence with workflow-name argument

### T129 — Simulate Pre-flight Blocks on Engine Integrity Failure

- **Workflow:** `test.md` (§0 Pre-flight)
- **Synthetic State:**
  - `skills/magicspec/.checksums` has been manually altered (hash mismatch)
  - `check-prerequisites --json` returns `checksums_mismatch: true`
- **Action:** `/magicspec-dev:test test` triggered
- **Expected:**
  - [ ] Pre-flight Step 0 runs `check-prerequisites --json`
  - [ ] Agent detects `checksums_mismatch` in output
  - [ ] **HALT** with report: "Engine integrity failure — resolve before simulating."
  - [ ] Agent does NOT fall through to Mode Selection or execute any test scenarios
  - [ ] No suite.md tests are evaluated
- **Guards tested:** Pre-flight engine integrity gate (Step 0), HALT-before-mode-selection enforcement

### T130 — Improv Mode Crisis Template Structural Validation

- **Workflow:** `test.md` (§1a Crisis Template)
- **Synthetic State:**
  - `workspace.json` has 2 workspaces: `engine`, `docs`
  - All engine files valid
- **Action:** `/magicspec-dev:test` (no args — Improv mode)
- **Expected:**
  - [ ] Agent synthesizes a crisis with a named scenario (CR-6)
  - [ ] Crisis header block presented before walkthrough with all CR-1 through CR-6 fields
  - [ ] CR-1: ≥2 workflows affected (listed explicitly)
  - [ ] CR-2: Full Spec→Task→Run chain traced (no link skipped)
  - [ ] CR-3: ≥2 workspaces involved (since `workspace.json` has >1)
  - [ ] CR-4: ≥3 distinct C{N} guards targeted (listed by ID)
  - [ ] CR-5: ≥1 out-of-band mutation described
  - [ ] If any CR requirement is not met and not documented as skipped → **FAIL**
- **Guards tested:** Crisis Template completeness, CR-1 through CR-6 enforcement

### T131 — Simulate Guard Resilience Reports Mechanical vs Instructional

- **Workflow:** `test.md` (§3 Cognitive Coverage Report — Guard Resilience)
- **Synthetic State:**
  - Target: `run.md`
  - Guards applicable: C12 (mechanical — INDEX.md check), C7 (instructional — no HALT keyword), C14 (mechanical — checksums), Spec Stability (instructional — explicit HALT in `run.md` Logic Guard)
- **Action:** Agent evaluates Guard Resilience metric for `run.md`
- **Expected:**
  - [ ] Each guard classified as **Mechanical** or **Instructional** before testing
  - [ ] Mechanical guards tested against script output behavior (PASS/FAIL)
  - [ ] Instructional guards tested for explicit HALT keyword presence (PASS/PARTIAL)
  - [ ] C7 scored as PARTIAL (instruction exists, no HALT keyword, relies on LLM compliance)
  - [ ] Spec Stability scored as PASS (explicit HALT in `run.md` Logic Guard: "Demoted (`Stable`→`RFC` or `Draft`) since plan generation → **HALT**")
  - [ ] Final report uses format: `"Mechanical: X/Y, Instructional: A/B (C partial)"`
  - [ ] Single combined score calculated but breakdown visible
- **Guards tested:** Guard Resilience metric decomposition, Mechanical vs Instructional classification

### T132 — Simulate Context Bleed Warning in Succession Report

- **Workflow:** `test.md` (§3 Succession — Context Bleed Warning)
- **Synthetic State:**
  - Agent ran `/magicspec-dev:test spec`, found 1 ROUGH EDGE, applied fix
  - C14 gate passed
  - Succession round 1: 0 regressions
- **Action:** Agent produces final simulation report
- **Expected:**
  - [ ] Report includes context bleed warning: `"⚠ Succession ran in-context. For unbiased verification, run /magicspec-dev:test test in a fresh session."`
  - [ ] Warning appears in final report text (not buried in checklist)
  - [ ] If warning is missing → **FAIL**
- **Guards tested:** Context Bleed Warning enforcement, wrapper-implementation sync

### T133 — Suite Integrity Timing: Test Mode Validates Before Execution

- **Workflow:** `test.md` (§2 Suite Integrity — timing rule)
- **Synthetic State:**
  - `tests/suite.md` exists but T14 has a malformed header: `### T14: Missing Dash` (colon instead of dash)
  - suite.md has 20 valid tests + 1 malformed
- **Action:** `/magicspec-dev:test test` triggered
- **Expected:**
  - [ ] Suite Integrity check runs **before** scenario execution (timing: `test` mode)
  - [ ] Malformed T14 detected: header uses `:` instead of `—` (dash)
  - [ ] Agent reports structural violation before PASS/FAIL table
  - [ ] Agent either skips T14 with a note or halts for repair
  - [ ] Remaining 20 valid tests proceed normally
- **Guards tested:** Suite Integrity timing (pre-execution in test mode), structural format enforcement

### T142 — Simulate HALT Includes Recovery Hint

- **Workflow:** `test.md` (Step 0: Pre-flight)
- **Synthetic State:**
  - `skills/magicspec/.checksums` exists but `run.md` checksum mismatches (file was modified)
- **Action:** `/magicspec-dev:test run`
- **Expected:**
  - [ ] `check-prerequisites` reports `checksums_mismatch` for `run.md`
  - [ ] **HALT** — no simulation proceeds
  - [ ] Report includes recovery hint: `update-engine-meta` or restore from origin
  - [ ] Agent does NOT fall through to any mode
- **Guards tested:** Simulate pre-flight HALT with actionable recovery hint

### T157 — Simulate Scope-Isolated Integrity Check (C15 Filter)

- **Workflow:** `test.md`, `init.md`
- **Synthetic State:**
  - Workspace `docs` active (`scope: docs/, package.json` — excludes `.magic`).
  - `skills/magicspec/workflows/run.md` modified locally (hash mismatch) — a file outside the active workspace's scope.
  - Every other `.magic/` file matches its checksum.
- **Action:** Run `/magicspec-dev:test`
- **Expected:**
  - [ ] check-prerequisites called with `--workspace=docs`.
  - [ ] Check returns `ok: false`, warning `ENGINE_INTEGRITY` for `skills/magicspec/workflows/run.md` (the manifest lists `.magic/` files only, so no other path can be flagged).
  - [ ] **C15 Filter** applied: agent recognizes mismatch is out-of-scope.
  - [ ] Agent logs drift but does NOT HALT.
  - [ ] Simulation proceeds to Mode Selection.
- **Guards tested:** C15 (Workspace Scope Isolation) in Pre-flight, out-of-scope drift bypass.

### T179 — Simulate Suite Corruption Fallback (RE-5 Regression)

- **Workflow:** `test.md`
- **Synthetic State:**
  - `tests/suite.md` exists but contains only metadata header (no test scenarios).
  - File size > 0 bytes, readable.
- **Action:** User runs `/magicspec-dev:test test`
- **Expected:**
  - [ ] Agent opens and reads `suite.md` — file access succeeds (no "missing" error)
  - [ ] Suite Integrity detects 0 valid `### T{N} —` headers
  - [ ] Agent does NOT attempt to execute 0 tests and report "all passed"
  - [ ] Agent falls back to Improv Mode with notification
  - [ ] Improv Mode produces a Crisis scenario and walkthrough
- **Guards tested:** Suite Integrity zero-test detection, distinct from missing-file fallback (T32)

### T186 — Simulate Pre-flight Hard Gate Enforcement

- **Workflow:** `test.md`
- **Synthetic State:**
  - `.magicspec/` initialized, engine checksums valid
  - Agent begins simulation without running `check-prerequisites`
- **Action:** Agent attempts to skip Pre-flight and jump to Mode Selection
- **Expected:**
  - [ ] Simulation is flagged as INVALID by any reviewer
  - [ ] No findings from the skipped simulation are accepted
  - [ ] Agent MUST re-run with Pre-flight output recorded verbatim in report
- **Guards tested:** Pre-flight Hard Gate (HALT), test.md §0

### T187 — Simulate Evidence-Linked Claims Validation

- **Workflow:** `test.md`
- **Synthetic State:**
  - Agent produces a simulation report with 3 findings:
    - Finding A: includes `file`, `line`, `evidence` (verbatim quote), `verification` (grep command)
    - Finding B: includes `file` and `line` but no `evidence` (paraphrased instead of quoted)
    - Finding C: no `file` or `line` reference at all
- **Action:** Reviewer evaluates the report against Anti-Fabrication Rule (Invariant 6)
- **Expected:**
  - [ ] Finding A: VALID — all required fields present
  - [ ] Finding B: INVALID — missing verbatim evidence
  - [ ] Finding C: INVALID — missing file and line references
  - [ ] Report is returned for correction with specific rejection reasons
- **Guards tested:** Anti-Fabrication Rule (Invariant 6), Evidence-Linked Claims

### T188 — Simulate Null-Result Acceptance

- **Workflow:** `test.md`
- **Synthetic State:**
  - All workflow files have 0 vague terms (grep confirms)
  - No divergent duplicates (all C14/Zero-Prompt text identical across files)
  - All guards have explicit HALT conditions
  - Suite Integrity passes
- **Action:** Agent runs Improv Mode simulation
- **Expected:**
  - [ ] Agent reports `0 rough edges found` as the result
  - [ ] Agent does NOT fabricate findings to fill the report structure
  - [ ] Cognitive Coverage scores: Density 10/10, Guard Resilience max, Compliance max
  - [ ] Report explicitly states: "No rough edges found — engine is clean"
- **Guards tested:** Anti-Fabrication Rule (Invariant 6), Null-Result Acceptance

### T189 — Simulate Read-Before-Claim Gate

- **Workflow:** `test.md`
- **Synthetic State:**
  - Agent runs Improv Mode simulation
  - Agent reads 5 of 8 workflow files in Grounding Phase (skips `rule.md`, `retrospective.md`, `test.md`)
  - Agent then claims a rough edge in `rule.md` Line 42
- **Action:** Reviewer cross-references the claim against the Grounding Phase file checklist
- **Expected:**
  - [ ] Grounding Phase checklist shows `rule.md` was NOT read
  - [ ] Claim about `rule.md` is automatically INVALID per Read-Before-Claim Gate
  - [ ] Agent must re-read `rule.md` and re-evaluate the claim before it can be accepted
  - [ ] Only claims about files listed in the Grounding Phase checklist are valid
- **Guards tested:** Read-Before-Claim Gate (test.md §0 Step 3)

### T192 — Vague Term Elimination in rules.md Template

- **Workflow:** `test.md` (Logic Audit — Ambiguity C13)
- **Synthetic State:**
  - `templates/rules.md` contains quantified terms replacing former vague qualifiers
- **Action:** Scan `templates/rules.md` for vague terms from the closed list
- **Expected:**
  - [ ] "significant revision" replaced with "revision affecting ≥1 core section" (line 21)
  - [ ] "appropriate implementation" replaced with "platform-matching implementation" (line 89)
  - [ ] "significant time" replaced with ">5 minutes" quantified threshold (line 194)
  - [ ] Zero vague terms from the closed list remain in `templates/rules.md`
- **Guards tested:** C13 Ambiguity elimination, Instruction Density improvement

### T252 — A Simulation Finding Is Adjudicated and Fixed in the Same Run; No Approval Prompt

- **Workflow:** `magicspec-dev:test` (Core Invariant 3; §5 Adjudication, Fix Selection, Surgical Patch, Decision Record, Escalation)
- **Synthetic State:**
  - A `test`-mode run has read the engine bodies and reached §5 with three findings: (1) `run.md` halts a task the plan itself produced — a guard demands a `Stable` spec for a task whose purpose is to stabilize it; (2) a sentence whose literal text and whose specified intent resolve to the same action; (3) two §7 conventions conflict and resolving it would need a change to a core rule (§1–6).
- **Action:** the run adjudicates the three findings.
- **Expected:**
  - [ ] Finding 1: rung 2 (*Dead end*) is conclusive → **DEFECT**. The candidates (no change, the smallest wording patch, a structural rule) are ranked by the fixed criteria and exactly one wins; the exact guard phrase is searched across the engine bodies, role cards, documentation pages and specifications first; the winner is applied in the same run with its regression test, the reproducing case fails before it and passes after it, and one `[DR]` line reports it. No Yes/No prompt and no "shall I apply it?".
  - [ ] Finding 2: rung 4 (*Reading test*) — the literal reading and the intended reading predict the same action → **NOT A DEFECT**: no edit, one `[DR]` line.
  - [ ] Finding 3: the fix needs an amendment of the core constitution (§1–6) → E4: reported with its one recommended wording and not applied; it is the only question-worthy item, and it is asked as a single question.
  - [ ] The report carries the Context Bleed note, and the C14 gate runs before it when `.magic/` was edited.
- **Control — no candidate passes:** every fix candidate for finding 1 fails the harness → the defect is reported with the failing evidence and the tree is left unchanged.
- **Guards tested:** Core Invariant 3 without an approval gate (C9, C28, DA-9); the first-conclusive-rung rule; the single outcome of Fix Selection; Escalation limited to E1 and E4.
- **Regression for:** owner feedback (2026-10-01) — the workflow told the agent to show each fix for approval and apply it afterwards, so findings reached the owner as proposals and every poll was answered with the marked default.

### T263 — A Mandatory Section Below the Preview Is a Structure Finding, Not a Wording Finding (Reader Tier)

- **Workflow:** `magicspec-dev:test` (the reading test, adjudication rung 4) + the contents-list rule for engine bodies
- **Synthetic State (Test A):**
  - A synthetic engine body of 150 lines with four `##` sections and no contents list. Its mandatory step — load the live-memory file and run the resume check — sits in the last section, from line 120. A shared module it points to is read through that pointer.
  - The host exposes a model choice for a run: a stronger tier and a lower one.
- **Action A:** the reading test for "the next action of a fresh session", the literal reading taken by a fresh agent.
- **Expected A:**
  - [ ] The fresh agent runs on the **lower** tier, not the session's own, and returns its predicted action together with the files it opened and the line range it read of each (here: lines 1–100).
  - [ ] The prediction omits the load. The cause is a mandatory section the agent never reached, so the finding is a **structure** finding — the fix candidate is a contents list in the body (or a pointer that applies the module as a whole) — not a wording patch.
  - [ ] The divergence was seen only at the lower tier, so it counts once a second fresh agent of that tier reproduces it; a second agent that reads past line 100 and predicts the load ends the case as **NOT A DEFECT**.
- **Synthetic State (Test B — control):** the same body with a contents list in its first 40 lines naming all four sections.
- **Expected B:**
  - [ ] The fresh agent sees that a fourth section exists, reads it, predicts the load, and no finding is raised.
- **Synthetic State (Test C — control):** the host exposes no model choice.
- **Expected C:**
  - [ ] The reading test runs on the session's own tier; nothing is required of the tier and no finding is raised on that ground.
- **Guards tested:** independence of context is not capability; the structure/wording split of a divergence; the noise filter of a second reader at the lowest tier; the contents-list rule for engine bodies.
- **Regression for:** none yet — measured on the shipped bodies: six over 100 lines with no contents list, and the Post-Resolution load of the shared module at line 114.

### T315 — The Maintenance Fix Adds Only the Engine's Steps to the Shipped Triage

- **Workflow:** `skills/magicspec-dev/workflows/fix.md`
- **Synthetic State:** a pasted `MAGIC-SPEC ENGINE BUG REPORT` about a script; the defect is also present on the 2.x release line.
- **Action:** `/magicspec-dev fix` with the report.
- **Expected:**
  - [ ] The report is treated as a work item to reproduce, not forwarded; the shipped triage is followed unchanged with the engine as the product.
  - [ ] The sibling search covers the whole shipped folder, role cards and workflow bodies included; a card and its mirror change together.
  - [ ] The lasting check is a harness case written first and seen to fail, proven by the mutation driver (`CAUGHT`); the engine metadata update runs at once after the change inside the shipped folder.
  - [ ] The repair is ported to the 2.x line through a disposable worktree without asking and nothing goes to the release branch; a repaired feedback note is discarded.
- **Control:** the shipped `fix` body names no maintenance step.
- **Guards tested:** FX-10; EF-12; the layer and branch rules of the repository.
- **Regression for:** none yet — new with the maintenance set.

### T352 — In the Engine's Repository the Maintenance Sync Runs the Shipped Pass and Bumps No Registry Version

- **Workflow:** `skills/magicspec-dev/workflows/sync.md` with `scripts/sync.js`
- **Synthetic State:** the engine's repository, whose global registry has a stale count and whose workspace registries carry version lines and history rows.
- **Action:** `/magicspec-dev sync --dry-run`, then `/magicspec-dev sync`, then again.
- **Expected:**
  - [ ] Stage 4 prints the shipped report; the dry run changes no file.
  - [ ] The real run changes the registry's count only: no registry version line moves, no `Last Updated` stamp, no history row is appended.
  - [ ] The second run writes nothing to the registries, and the plan no longer falls behind its registry through the sync.
- **Control:** the engine-only stages (engine metadata, the README anchor, the link check, the documentation) still run in their places.
- **Guards tested:** SY-9; SY-1.
- **Regression for:** none yet — new with the sync command.

### T357 — An Area Run Reads the Index, One Area and the Text Its Cases Cite, and Not the Rest of the Suite

- **Workflow:** `skills/magicspec-dev/workflows/test.md` (Area mode of the Grounding Phase and the Area bullet of Mode Selection)
- **Synthetic State:** a suite of seventeen area files and an index that lists them; the engine's `spec` workflow body; the idea-intake cases in the `spec-intake` area cite the intake step of `spec.md` and the router's defect test.
- **Action:** `/magicspec-dev:test spec-intake`; then `/magicspec-dev:test test`.
- **Expected:**
  - [ ] The first run reads the index, `tests/suite/spec-intake.md` and the shipped text its cases cite; it reads no other area file and no other workflow body, and runs the eight cases of that area.
  - [ ] The report lists the area's cases only and names the area it ran.
  - [ ] The second run reads the index and every area file and runs every case, as it ran the one file before the split.
- **Control:** `/magicspec-dev:test spec` is both an area and a workflow: it keeps the direct walkthrough of `spec.md` and adds the cases of the `spec` area; it still reads no other area.
- **Guards tested:** SL-4; the Read-Before-Claim gate of the Grounding Phase (a claim about a file not read is invalid).
- **Regression for:** none yet — new with the split suite.

### T358 — A New Case Goes to the File of Its Workflow with the Next Identifier, and the Index Is Updated in the Same Change

- **Workflow:** `skills/magicspec-dev/workflows/test.md` (Surgical Fix & Test, Core Invariant 3, and the Area bullet)
- **Synthetic State:** a finding in `plan.md` adjudicated as a defect and repaired; the index closes with `Last: T358`; a second finding whose case targets two workflows, `run.md` first and `task.md` second.
- **Action:** the same `/magicspec-dev:test` run writes the regression case for each finding.
- **Expected:**
  - [ ] The first case is written into `tests/suite/plan.md` as `### T359 — {name}`; the index row of `plan` lists T359 and its count rises by one; `Last` and the suite version are updated in the same change.
  - [ ] The second case takes T360 and is written into `tests/suite/run.md`, the file its first `Workflow` value points to; no identifier is reused, renumbered or moved.
  - [ ] The suite's layout check (each identifier once, each index row exact, `Last` the greatest) passes after the run.
- **Control:** a case written into the index file instead of an area file, or with an identifier that already exists, fails the layout check and is not accepted.
- **Guards tested:** SL-3; SL-5; Core Invariant 3 of the test workflow.
- **Regression for:** none yet — new with the split suite.
