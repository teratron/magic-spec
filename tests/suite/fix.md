# Workflow Test Suite — fix

Cases of the area `fix` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T300 — A Report of an Already-Fixed Defect Is Answered Without a Change

- **Workflow:** `fix.md` (Step 1)
- **Synthetic State:** a project whose export once dropped the last row; the current version exports every row. The user reports "the export drops the last row", quoting the old version's output.
- **Action:** `/magicspec fix "the export drops the last row"`.
- **Expected:**
  - [ ] The defect is checked against the current version with a named check (an export of a known file); every row is present.
  - [ ] The answer is *fixed in the current version*, with the evidence; nothing is classified, recorded as a task or changed, and nothing is asked.
  - [ ] The report line counts it in `{a} already fixed`.
- **Control:** the same report against a version where the last row is still dropped: it proceeds to Step 2.
- **Guards tested:** FX-1 re-verify first.
- **Regression for:** none yet — new with the fix command.

### T301 — A Report Too Thin to Reproduce Is Recorded as Unreproduced and Asks Nothing

- **Workflow:** `fix.md` (Step 2)
- **Synthetic State:** the report reads "it sometimes crashes" with no steps, no log and no version.
- **Action:** `/magicspec fix "it sometimes crashes"`.
- **Expected:**
  - [ ] Everything tried is listed (the commands run, the inputs used) and the defect is classified `Unreproduced`.
  - [ ] The report names the one piece of evidence that would reproduce it (for example the log of a failing run) and says the next message can supply it.
  - [ ] No file is changed, no task recorded and no question asked.
- **Control:** the report carries a log line naming the failing function: the defect is reproduced by a test of that function and proceeds.
- **Guards tested:** FX-2 reproduce before changing; DA-2 no question.
- **Regression for:** none yet — new with the fix command.

### T302 — The Reporter's Cause Is Tested, and the Confirmed Cause Is Named

- **Workflow:** `fix.md` (Step 3)
- **Synthetic State:** the report says "the date is wrong because the timezone is ignored". The defect reproduces; the trace shows the date is formatted correctly and the stored value was truncated one step earlier.
- **Action:** `/magicspec fix` with that report.
- **Expected:**
  - [ ] The stated cause is tested by tracing the failing path, any trial change made in a scratch copy and not in the product.
  - [ ] The confirmed cause (the truncation) is named, with how it was confirmed, and the report says it differs from the reported one.
  - [ ] The repair is made at the confirmed cause, not at the formatting.
- **Control:** the trace confirms the reported cause: the report names it as confirmed.
- **Guards tested:** FX-3 the reporter's cause is a hypothesis.
- **Regression for:** none yet — new with the fix command.

### T303 — An Implementation Defect Changes the Code and No Specification

- **Workflow:** `fix.md` (Steps 4 and 6 to 8)
- **Synthetic State:** a specification states that a negative quantity is refused; the product accepts it.
- **Action:** `/magicspec fix "negative quantities are accepted"`.
- **Expected:**
  - [ ] The class is *implementation defect*; the repair cites the statement it restores.
  - [ ] No specification is edited (the specification test: nothing is added or changed about observable behaviour).
  - [ ] The repair is a task with a `Verify` line equal to the reproduction; a test that fails before and passes after is left behind.
- **Control:** the specification is silent about negative quantities: the class is *specification gap* (T304).
- **Guards tested:** FX-4 implementation defect; FX-5 the specification test; FX-7; FX-8.
- **Regression for:** none yet — new with the fix command.

### T304 — A Specification Gap Gains the Statement First and Passes the Coherence Check

- **Workflow:** `fix.md` (Steps 4 and 6) with `spec.md` (Post-Update Review)
- **Synthetic State:** no specification says what happens to an empty cart at checkout; the product crashes, and the specifications' intent is that checkout of nothing is refused with a message.
- **Action:** `/magicspec fix "checkout crashes on an empty cart"`.
- **Expected:**
  - [ ] The class is *specification gap*; the specification gains the edge-case statement by the steps of the specification workflow (Amendment Rule, Post-Update Review) before the code is changed.
  - [ ] The coherence check runs first in that review and reports its result line; a contradiction with another specification would block it.
  - [ ] Then the code is fixed under the gates and a regression check is left behind.
- **Control:** the statement the gap would add contradicts a Stable specification: the amendment is blocked as in the specification workflow, and the report says so.
- **Guards tested:** FX-4 specification gap; FX-5; the coherence check on an amendment made by a fix.
- **Regression for:** none yet — new with the fix command.

### T305 — A Specification Defect Is Amended Under the Amendment Rule, With Its Cascade

- **Workflow:** `fix.md` (Steps 4 and 6) with `spec.md` (Amendment Rule, C12)
- **Synthetic State:** a specification prescribes that sessions never expire; the report says users stay signed in for years and consider it wrong; two implementation specifications depend on the statement.
- **Action:** `/magicspec fix "sessions never expire"`.
- **Expected:**
  - [ ] The class is *specification defect*; the specification is amended (its status reverts to `RFC` under the Amendment Rule, then is re-reviewed) before the code.
  - [ ] The cascade is applied by the specification workflow's steps (the dependent specifications are quarantined or amended there); the report line's `{spec change}` names the amendment.
  - [ ] The code is fixed and a regression check left behind.
- **Control:** the report describes the behaviour the specification states and the person intends: the class is *not a defect* and nothing changes.
- **Guards tested:** FX-4 specification defect; the Amendment Rule; C12.
- **Regression for:** none yet — new with the fix command.

### T306 — Sibling Sites Are Searched, and Each Is Fixed or Recorded

- **Workflow:** `fix.md` (Step 5)
- **Synthetic State:** the confirmed cause is a path join that drops the last segment; the same join is used in two other files.
- **Action:** the repair of the first site.
- **Expected:**
  - [ ] The mechanism is searched everywhere it is used; both other sites are found.
  - [ ] One is fixed in the same repair; the other belongs to a separate, larger change and is recorded as a separate defect.
  - [ ] The report line reads `Sibling sites: 1 fixed, 1 recorded`.
- **Control:** no other site shares the mechanism: the line reads `Sibling sites: 0 fixed, 0 recorded`.
- **Guards tested:** FX-6 sibling sites.
- **Regression for:** none yet — new with the fix command.

### T307 — A Repair With No Lasting Check Is Not Done

- **Workflow:** `fix.md` (Step 8) with `run.md` (Step 3.5)
- **Synthetic State:** a repair is made and the reproduction works by hand, but no test or scenario was written, or one was written after the repair and never seen to fail.
- **Action:** the repair reaches Step 8.
- **Expected:**
  - [ ] The task stays `In Progress`; it is not marked `Done` and not archived.
  - [ ] The report says what is missing (a check that fails without the repair).
  - [ ] Writing the check, running it against the unrepaired state to see it fail, and passing it with the repair completes the task.
- **Control:** the check was written first and seen to fail: the task is `Done`.
- **Guards tested:** FX-8 regression left behind; FX-7 the gates.
- **Regression for:** none yet — new with the fix command.

### T308 — Several Defects With One Cause Become One Repair

- **Workflow:** `fix.md` (Steps 1 to 4a)
- **Synthetic State:** three reports ("the totals are off by one", "the last page is empty", "the count ends one early") whose confirmed cause is one off-by-one in a shared loop bound.
- **Action:** `/magicspec fix` with the three reports in one invocation.
- **Expected:**
  - [ ] Each is re-verified, reproduced and confirmed one by one.
  - [ ] They are grouped by the confirmed cause: one repair task, three reproductions among its checks.
  - [ ] The report has one line per defect and one task.
- **Control:** one of the three has another confirmed cause: two tasks.
- **Guards tested:** FX-9 batches by root cause.
- **Regression for:** none yet — new with the fix command.

### T309 — With No Active Phase a Maintenance Phase Is Opened Through the Planning Write

- **Workflow:** `fix.md` (Step 6) with `plan.md` (Plan Write-back)
- **Synthetic State:** the plan is complete and no phase is active; a defect is reproduced and classified as an implementation defect.
- **Action:** `/magicspec fix` with the report.
- **Expected:**
  - [ ] The body makes the planning write as one step of its own stage: one phase entry holding the specifications the repair touches, and the plan header; no stabilization, audit or decision about another specification runs.
  - [ ] `PLAN.md` is edited by no other route; the phase workbook and its ledger row are created from the templates and the repair task is recorded there.
  - [ ] After the repair the phase is finished and archived by the finalization.
- **Control:** a phase is active: the repair is a task of that phase and `PLAN.md` is not touched.
- **Guards tested:** PS-1 the write only another command may make; PL-1; FX-7.
- **Regression for:** none yet — new with the fix command.

### T354 — A Cited Section Is Read by Its Lines, Not by Reading the File

- **Workflow:** `workflows/fix.md` (step 5, Sibling sites) and `workflows/spec.md` (Step 0.5, Investigate first) with `scripts/memory-query.js`
- **Synthetic State:** a plan file of 228 KB and a registry of 163 KB; a query whose first result is a section of the plan that cites `{file}:{start}-{end}` and `~290 tokens`.
- **Action:** the sibling-site search of a defect in a guard; the intake investigation of an idea about the same guard.
- **Expected:**
  - [ ] The agent reads exactly the cited lines of the file (an offset and a limit, or an equivalent range read) and relies on that text; it does not read the whole plan or the whole registry.
  - [ ] When the cited lines do not settle the question, it reads the neighbouring lines it needs, still not the file.
- **Control:** a result whose snippet shows what the agent expected is still opened by its lines before it is relied on (AM-3).
- **Guards tested:** AM-2; AM-3.
- **Regression for:** none yet — new with the cited lines.
