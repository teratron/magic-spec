# Workflow Test Suite — engine-text

Cases of the area `engine-text` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T36 — Workspace Context Resolution (Zero-Prompt)

- **Workflow:** Any (`plan.md` and `task.md` used as example)
- **Synthetic State:**
  - `.magicspec/workspace.json` exists with `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - No prompt provided by user about workspaces.
- **Action 1:** Workflow triggered with no environment variables or CLI flags.
- **Expected 1:**
  - [ ] Agent reads `.magicspec/workspace.json`.
  - [ ] Agent uses `default` = `engine` without prompting and prints `Active workspace: engine.` (`context.md` Priority 3, multiple + default).
  - [ ] Agent uses `.magicspec/engine/` for all file operations (reading `INDEX.md`, `RULES.md`, etc.).
  - [ ] User is NOT prompted to select a workspace.
- **Action 2:** Workflow triggered with `MAGIC_WORKSPACE=docs`
- **Expected 2:**
  - [ ] Agent silently uses `.magicspec/docs/` (overriding default).
- **Action 3:** `.magicspec/workspace.json` is deleted. Workflow triggered.
- **Expected 3:**
  - [ ] Fallback kicks in silently.
  - [ ] Per WI-10 (`context.md` Priority 4): root `.magicspec/` is read transiently only; auto-init bootstraps `.magicspec/{default}/` and resolution re-runs at Priority 3 — no artifacts are ever written to flat root `.magicspec/`.
- **Guards tested:** Context Resolution Priority, Zero-Prompt Enforcement, Graceful Fallback.

### T134 — Context Resolution Consistency Across Workflows

- **Workflow:** All workflows (`spec.md`, `plan.md` and `task.md`, `run.md`, `analyze.md`, `init.md`, `rule.md`, `test.md`)
- **Synthetic State:**
  - `workspace.json` has 2 workspaces: `engine` (default), `docs`
  - `MAGIC_WORKSPACE` env var is set to `docs`
  - User runs `/magicspec spec` (no explicit workspace arg)
- **Expected:**
  - [ ] Agent resolves workspace using priority chain: explicit arg (none) > `MAGIC_WORKSPACE` (`docs`) → uses `docs`
  - [ ] Same resolution logic produces same result in `task.md`, `run.md`, `rule.md`, `test.md`, `init.md`
  - [ ] `analyze.md` full Workspace Resolution table produces identical result for same inputs
  - [ ] No workflow falls back to `workspace.json` default when `MAGIC_WORKSPACE` is set
- **Guards tested:** Context Resolution parity across all workflows, priority chain consistency

### T184 — Workspace Disambiguation Uses Quantified Threshold (RE-6 Regression)

- **Workflow:** Any (plan.md used as example)
- **Synthetic State:**
  - `workspace.json`: two workspaces, NO default field
    - `api` with scope: `["packages/api/", "packages/shared/"]`
    - `web` with scope: `["packages/web/", "packages/shared/"]`
  - Current directory contains 10 files: 6 in `packages/api/`, 2 in `packages/web/`, 2 in `packages/shared/`
- **Action:** `/magicspec plan` (no workspace argument, no env var)
- **Expected:**
  - [ ] Quick-scan runs: checks file overlap with each workspace's `scope` array
  - [ ] `api` scope covers 8/10 files (80%) — meets ≥50% threshold
  - [ ] `web` scope covers 4/10 files (40%) — below threshold
  - [ ] Agent selects `api` workspace and NOTIFIES user: "Found api scope match — selecting api. Proceeding..."
  - [ ] Agent does NOT halt to ask (quantified threshold met)
- **Test B — No workspace meets threshold:**
  - **Synthetic State:** Current directory has 10 files, 3 in `packages/api/` scope, 3 in `packages/web/` scope, 4 outside both
  - **Expected:**
    - [ ] `api` covers 30%, `web` covers 30% — both below ≥50%
    - [ ] The Consequence Forecast decides (`context.md` Workspace Disambiguation, step 4): every wrong pick costs the same later move and coverage ties, so the first in `workspace.json` order wins — `[DR] Selecting api — coverage tie, first in workspace.json order (DA-10). (Override: /magicspec plan web)`; nothing is asked
- **Guards tested:** Quantified disambiguation threshold (RE-6 fix); deterministic selection above the threshold, deterministic forecast below it

### T193 — Auto-Init Trigger Condition Parity (Regression)

- **Workflow:** All workflows with Auto-Init invariant
- **Synthetic State:**
  - 7 workflow files: `spec.md`, `analyze.md`, `run.md`, `plan.md`, `task.md`, `retrospective.md`, `rule.md`
  - All contain Auto-Init as a Core Invariant
- **Action:** Scan all 7 files for Auto-Init trigger wording
- **Expected:**
  - [ ] All 7 files use identical trigger: `"If .magicspec/ or system files missing"`
  - [ ] No file uses the shorter `"If .magicspec/ missing"` formulation (pre-fix divergence)
  - [ ] `rule.md` additionally includes workspace RULES.md auto-create clause (acceptable extension, not divergence)
- **Guards tested:** Auto-Init trigger parity across all workflows (simulate fix v1.5.146)

### T216 — C14 Trigger Condition Parity (Regression, sibling to T193)

- **Workflow:** All workflows with an Engine Integrity (C14) Core Invariant
- **Synthetic State:**
  - 8 files declare a C14 Engine Integrity/Versioning invariant: `retrospective.md`, `init.md`, `analyze.md`, `spec.md`, `plan.md`, `task.md`, `rule.md`, `run.md`.
- **Action:** scan all 8 files for the C14 trigger condition wording.
- **Expected:**
  - [ ] All 8 files' trigger condition covers BOTH paths — `.magic/` AND `workflows/` — substantively; exact prose may vary (e.g. `retrospective.md`'s "engine files (`.magic/` or `workflows/`)" wrapper is an acceptable restatement, not a divergence — same precedent as T193's rule.md extension).
  - [ ] No file's trigger condition names `.magic/` alone, omitting `workflows/` (pre-fix `analyze.md` divergence — a real narrowing, not a wording variant).
- **Guards tested:** C14 trigger-condition substantive parity (both paths present in every file), sibling regression to T193's Auto-Init parity check; found in Improv Mode simulation 2026-09-17.

### T220 — Cold Start With an Unrelated First Message Surfaces the Resume Line and Keeps the Request (SC-6/SC-8/SC-9)

- **Workflow:** `CONSTITUTION.md` §10 (Session Resume Check) + `resume-state` (via `executor.js`) + `run.md` Task Start
- **Synthetic State:**
  - A new session: the context holds no `STATE.md`. `.magicspec/engine/` initialized, `MAGIC_RESUME_CHECK` unset.
  - `tasks/phase-3.md`: task `T-3A02` "Extract the parser" has its tracking entry `**Status:** In Progress`; its checklist line still reads `- [ ]`. Its `Attempts` field holds two indented lines: `tried a global regex → it swallowed the next entry` and `tried a line scan → it split on CRLF`.
  - Three product files are modified in the working tree (outside `.magicspec/`).
  - `STATE.md`: `Status: Active`, `Next Action: Execute T-3A02 Extract the parser via /magicspec run engine`.
- **Action:** The first user message has nothing to do with the recorded work: `"rename the constant MAX_RETRIES to RETRY_LIMIT in src/net.js"`.
- **Expected:**
  - [ ] Before its first tool call the agent — holding no `STATE.md` — runs `node skills/magicspec/scripts/executor.js resume-state --all` once (§10), not a wider read of the design tree.
  - [ ] The printed line is relayed **verbatim**, as one informational line naming `T-3A02`, `2 dead end(s) recorded`, `3 file(s) modified` and the recorded next action — never a prompt, never a menu.
  - [ ] The user's request is executed in the same turn. The recorded `Next Action` does not override it (Memory Fence); any divergence is narrated in one line.
  - [ ] The agent does not start `T-3A02` uninvited and does not ask whether to "continue the previous work".
  - [ ] The check is not repeated on the next message of the same context.
  - [ ] When `T-3A02` is later resumed, neither recorded approach is retried unless the new `Attempts` entry carries one line `retry: {what is different this time}`.
- **Guards tested:** SC-6 cold-start sufficiency (position, dead ends and modified files come from recorded state alone); SC-9 resume predicate consumed by the session-start rule; SC-8 dead-end record honored at Task Start; Memory Fence (the request outranks the recorded action); C25 (no question); the once-per-cold-context condition.
- **Regression for:** a resume mechanism that stays silent until the user types a `/magicspec <command>` command, or one that hijacks an unrelated request.

### T221 — A Bare "continue" Executes the Recorded Next Action Without a Question, Past a Stale Snapshot (SC-9/C25)

- **Workflow:** `CONSTITUTION.md` §10 + `context.md` Post-Resolution step 4 + `run.md` Task Start (resume branch)
- **Synthetic State:**
  - The state of T220 (`T-3A02` `In Progress`, two dead ends).
  - A leftover `.magicspec/engine/HANDOFF.json` from a retired snapshot mechanism, whose `next_action` names a different task, `T-2B05`.
- **Action:** The user types only `continue`.
- **Expected:**
  - [ ] Resume detection runs **exactly once** in the turn — through the run workflow's context load, not again from the session-start rule (§10: a `/magicspec <command>` invocation performs the check itself).
  - [ ] The printed line names `T-3A02`. The leftover file is **not** a trigger: nothing reads it, so it is neither consumed nor mentioned as pending work (SC-9(b), SC-9(g)).
  - [ ] `continue` is taken as "execute the recorded `Next Action`": the agent starts the run workflow on `T-3A02` in the same turn.
  - [ ] Task Start finds the entry already `In Progress` and treats it as **resumed**: it leaves the status unchanged, and reads `Attempts` and `Handoff` before an approach is chosen.
  - [ ] The checklist line stays `- [ ]` until the task is `Done`.
  - [ ] **No question** ("which task?") and no option menu appears; the next step was computed and narrated, not asked (C25, DA-6).
- **Guards tested:** SC-9(b) file presence is not a trigger; SC-9(d) resume from the recorded `Next Action`; Task Start's resumed-versus-started distinction; C25 and DA-6.
- **Regression for:** a "continue" that asks which task, or that follows a stale snapshot into work abandoned long ago.

### T224 — Finalize With an Unwritable `STATE.md`: the Agent Never Tells the User It Is Safe to Clear (SC-6.1)

- **Workflow:** `CONSTITUTION.md` §3 (Finalization Protocol) + the `finalize.js` checkpoint claim
- **Synthetic State (Test A — update fails):**
  - `/magicspec plan engine` has just written its plan. `STATE.md` cannot be updated, so `finalize --workflow=plan` prints `⚠ STATE.md update skipped (non-blocking): …`, its summary row reads `STATE.md | skipped (warning above)`, and its digest lists `STATE_UPDATE_SKIPPED`. The words `checkpoint saved` do not appear anywhere in the output.
- **Action A:** The agent relays the output and writes its closing message; the user then asks, `can I clear the context now?`
- **Expected A:**
  - [ ] The finalize output is displayed **verbatim**, warning and digest included (§3.3).
  - [ ] The skipped update is relayed as a warning and does not block the Completion Checklist (§3.4: non-blocking).
  - [ ] The agent does **not** say that the checkpoint is saved, that the session can be cleared, or that nothing will be lost. It names the consequence in one line: the recorded position (`Next Action`, `Status`) may be stale, while the plan and workbooks on disk are unaffected.
  - [ ] The words `checkpoint saved` appear nowhere in the agent's own message.
- **Synthetic State (Test B — control):**
  - The same run with a writable `STATE.md`: the summary row reads `updated (SC-2) — checkpoint saved`.
- **Action B:** The user asks the same question.
- **Expected B:**
  - [ ] The agent may answer that ending or clearing the session loses nothing — a claim made **only** because the script printed `checkpoint saved`.
- **Guards tested:** SC-6.1 claim honesty (the guarantee is no stronger than the script's output); verbatim relay of finalize output; non-blocking semantics of a `STATE.md` failure.
- **Regression for:** a comforting "all saved, you can clear" said over a failed write, after which the next cold context resumes from stale state.

### T231 — The Status Briefing Renders "Nothing Pending" as a Statement, Never as a Recommended Command (SC-2.4 addendum)

- **Workflow:** `status.md` (Step 7 — Next)
- **Synthetic State (Test A — nothing pending):**
  - `STATE.md` reads `Next Action: Plan complete — nothing pending`, `Blockers` is empty, the plan is complete and in sync with the registry, and the Backlog holds only Parked items.
- **Action A:** `/magicspec status`
- **Expected A:**
  - [ ] The Next section reads `Next: nothing pending — Plan complete — nothing pending` (or the same statement in one clause) and recommends **no command**.
  - [ ] No `[DR] Next: /magicspec …` line is emitted, and the briefing does not fall through to the pipeline-order fallback (which would name `/magicspec task` or `/magicspec spec`).
  - [ ] The briefing stays read-only and asks no question.
- **Synthetic State (Test B — control):**
  - `Next Action: Execute T-2A01 Wire the exporter via /magicspec run engine`.
- **Expected B:**
  - [ ] The `[DR] Next: /magicspec run engine — …` form is rendered exactly as before; only a `Next Action` that names no command changes the rendering.
- **Guards tested:** the nothing-pending rendering; the fallback applies only when `Next Action` is absent; the recommendation form is untouched for every value that names a command.
- **Regression for:** the briefing replaying a command-free `Next Action` as a recommendation — reformatting the statement back into `/magicspec task …` and inviting a run that can only report no changes.

### T253 — An Unsettled Fork Is Decided by the Consequence Forecast; Only Consent and the Intake Survey Ask (DA-10, DA-2)

- **Workflow:** `l1-decision-autonomy.md` DA-10 (C27 item 8) as `spec.md` applies it to a hard fork (C9 gate 3); the deletion consent (E1)
- **Synthetic State:**
  - One workspace `web` with Stable specs for the public site; nothing in the repository says how administration is delivered.
- **Action A (hard fork):** `/magicspec spec add an admin area`.
- **Expected A:**
  - [ ] The Idea Intake Gate stays silent: who it is for (administrators of this site) and what it must do (manage what the public-site specs define) are grounded, and where the admin screens live is realization, not intent (IK-3) — so nothing reaches the intake survey.
  - [ ] A separate admin application versus a section inside the main application is a hard fork (E3) with no DA-3 tiebreaker — resolved by the forecast, never by a question.
  - [ ] Candidates: separate app (primary), section of the main app (alternative), the status quo (ask), and the hedge — the admin capabilities (who may do what) specified now, the delivery surface deferred behind a premise.
  - [ ] Worst cases across the five scenarios: either surface → re-plan (*Wrong premise*: the other one was meant); status quo → stall; hedge → multi-file revert. No Blocker anywhere → the hedge wins on the lowest worst case.
  - [ ] One `[DR]` line with the worst case and the runner-up; the spec's Constraints & Assumptions records the premise in outcome terms ("administrators work inside the main application for now"), runner-up named, one-command override.
- **Action B (consent — control):** the requester later says "remove the old notifications spec".
- **Expected B:**
  - [ ] Deleting a spec is E1: exactly one DA-5 question asks for consent — at most three options, the forecast's winner marked as the default with its one-line forecast.
- **Action C (cost scale — control):** a fork met mid-pipeline — while planning or executing, long after the idea was supplied — whose every non-question candidate has a re-plan as its worst case.
- **Expected C:**
  - [ ] The status quo (asking) does not win: a stall ranks above every reversible cost. A question wins only when every other candidate's worst case is irreversible or outward — which is what the consent entries describe.
  - [ ] Control: the same fork about intent, met at intake (Step 0.5, the requester present, nothing built) — asking costs one turn and ranks with one revert, so the intake survey opens (T210).
- **Guards tested:** DA-10 candidates (incl. the hedge), scenarios and decision order; the cost scale placing a stall between re-plan and irreversible, and the intake question beside one revert; DA-2 consent plus the intake survey; DA-5 consent format.
- **Regression for:** owner directive (2026-10-01) — six consecutive polls were each answered with the marked default, and the hard-fork and routing forks (E3, E5) still escalated as questions.

### T260 — Session Briefing Against Execution: The Commands Table Alone Separates "Where Am I" From "Do the Next Task"

- **Workflow:** the Commands table of the router `SKILL.md` (command choice from the `What it does` cells; no body is loaded)
- **Synthetic State:**
  - The host lists the `magicspec` skill by its `name` and `description` and one unrelated third-party skill whose description is about PDF files. The agent has read the router and nothing else.
- **Action:** resolve each request to exactly one command of the table, or to none, from the table alone:
  1. "Where does the project stand, and what is the recorded next step?"
  2. "Give me a resume briefing after the break."
  3. "Resume the planned work from where it stopped."
  4. "What's the next train to Berlin?"
- **Expected:**
  - [ ] (1) selects `status`; (2) selects `status` — "resume" can also read as continuing the work, but the cell of `status` names a briefing and says it is read-only.
  - [ ] (3) selects `run` — the near-miss of (2): the same verb, a request to do the work.
  - [ ] (4) selects none: "next" alone is not a cue, because both cells name an artifact (the project's standing; the planned tasks of the active phase).
  - [ ] No decision needed the body of either command.
- **Control (what-only cells):** a table whose cells said only "resume" and "execute" would leave (2) and (3) to the verb alone; a probe that resolves to two commands is an **AMBIGUITY** of the table.
- **Guards tested:** the selection signal — a cell that names the artifact or state, never a bare verb; one command per request from the table as a set.
- **Regression for:** none yet — the first selection case (the shipped trigger lists overlapped on "What's next" and "Next task"; "Continue" and "Resume briefing"), carried over from the skill-wrapper layout to the single router.

### T261 — Specification Check Against Ventilation: A Check of the Specs Themselves Is Not an Audit of the Project

- **Workflow:** the Commands table of the router `SKILL.md` (command choice from the `What it does` cells; no body is loaded)
- **Synthetic State:** as in T260 — the router and an unrelated third-party skill.
- **Action:** resolve each request from the table alone:
  1. "Check the registry entries, versions and statuses of the specifications."
  2. "Compare the code with the specifications and tell me where they drift."
  3. "Check the tires on my bicycle."
- **Expected:**
  - [ ] (1) selects `spec`: the check is of the specs themselves.
  - [ ] (2) selects `analyze` — the near-miss of (1): the same registry, but the request is the project against it.
  - [ ] (3) selects none: "check" is shared by both commands and by ordinary requests, and neither cell names a bicycle.
- **Control:** a request that names no artifact — "check everything" — resolves to **both** commands; it is reported as an **AMBIGUITY** of the request, not forced onto one.
- **Guards tested:** the discriminating rule (a bare verb is never the only cue); the overlap between the `spec` check modes ("Check specs", "Review registry") and `analyze` ventilation.
- **Regression for:** none yet — the overlap was measured in the shipped trigger lists, carried over from the skill-wrapper layout to the single router.

### T262 — Planning Against Decomposition Against Execution: "Update the Plan" Names the Plan, the Task List Is the Next Stage

- **Workflow:** the Commands table of the router `SKILL.md` (command choice from the `What it does` cells; no body is loaded)
- **Synthetic State:** as in T260.
- **Action:** resolve each request from the table alone:
  1. "Update the plan now that the registry changed."
  2. "Break the active phase into smaller tasks."
  3. "Implement a named task from the task list."
  4. "Update the plan for next week's team offsite."
  5. "Update the plan and the task list now that the registry changed."
- **Expected:**
  - [ ] (1) selects `plan`: which specifications are built in which phase and in what order is the plan's cell.
  - [ ] (2) selects `task` — the near-miss of (1): the plan stands, the request is its decomposition into tasks, verify lines and tracks.
  - [ ] (3) selects `run` — the near-miss of (2): the same task list, executed instead of written.
  - [ ] (4) selects none: "plan" alone is not a cue — the cell of `plan` names the specifications, the phases and the backlog, and an offsite plan is none of them.
  - [ ] (5) names two commands: it selects `plan` first and the answer ends by naming `task`, because a stage starts nothing after itself (PS-1); the request is not answered by running both in one invocation.
- **Guards tested:** the selection signal — the artifact in the cell is what keeps a generic noun from selecting a command; `plan`, `task` and `run` separated by order, decomposition and execution; one stage per invocation.
- **Regression for:** none yet — the overlap was measured in the shipped trigger lists ("Update tasks" and "Next task"), carried over from the skill-wrapper layout to the single router.

### T264 — Registry Description: An Amendment That Changes Nothing About Purpose Leaves the Cell Byte-Identical

- **Workflow:** `magic.spec` (Creating and Updating an Existing Specification, Sync) + the registry text contract
- **Synthetic State (Test A):**
  - A workspace registry with a row for a Stable L2 specification whose `Description` reads: "Retries and backoff for the outbound queue. Open it before changing delivery guarantees." The specification's Document History holds rows up to 1.3.0.
  - The user asks for a wording change with no change of scope.
- **Action A:** `/magicspec spec amend {spec} "tighten the wording of the backoff section; it still covers the same ground"`.
- **Expected A:**
  - [ ] The version is bumped (patch) and one row is appended to the specification's own Document History.
  - [ ] In the registry row the `Version` cell moves; the `Description` cell is **byte-identical** to before.
  - [ ] No sentence about the amendment appears anywhere in the registry row.
- **Synthetic State (Test B — control):** the same specification, and the amendment now makes it also own dead-letter handling.
- **Expected B:**
  - [ ] The whole `Description` cell is **rewritten** as a new text of at most two sentences that says what the specification is for and when to open it (it now names failed deliveries); the old sentence is gone and nothing is appended to it.
  - [ ] The Document History row still records the amendment.
- **Synthetic State (Test C — control):** a new specification is created in the same workspace.
- **Expected C:**
  - [ ] The registration writes a `Description` of at most two sentences that says what the specification is for and when to open it — no list of its sections or invariants, no version, no date.
- **Guards tested:** a registry cell is replaced, never appended to; change history belongs to the specification's own Document History; registration writes the cell in its form; the rule is not a ban on editing the cell when the purpose moved.
- **Regression for:** none yet — measured on registries: the engine's own workspace has a median description of 387 characters, a consumer project's two workspaces 1,578 and 2,086, and 46% of the cells of the larger one carry a version or a date.

### T266 — A Mechanic Named in a Question Is Searched in the Specification Text; a Structural Question Goes to the Graph

- **Workflow:** ambient rule `CONSTITUTION.md` §2 (Specification Knowledge Graph, Auto-Use)
- **Synthetic State (Test A):**
  - A workspace of 60 specifications whose registry descriptions are two sentences each. One L2 specification defines "idempotency keys" in a section of its own. The wiki and the graph exist; their nodes and articles carry layers, versions, references and edges, and no specification text.
- **Action A:** the user asks: "Which specification covers idempotency keys?"
- **Expected A:**
  - [ ] The agent searches `.magicspec/{workspace}/specifications/` for the term and reads the matching section of the specification that defines it.
  - [ ] It does not answer from the registry descriptions alone, and it does not look for the term in the graph or the wiki.
- **Synthetic State (Test B — control):** the same workspace; the user asks: "What depends on the queue specification, and which specifications are the load-bearing ones?"
- **Expected B:**
  - [ ] The agent runs `build-spec-graph` and navigates the wiki; no text search over the specifications is needed to answer it.
- **Synthetic State (Test C — control):** a fresh clone with no `.magicspec/graph/wiki/` yet.
- **Expected C:**
  - [ ] The content question is answered by the same text search; the structural question is answered with `build-spec-graph` alone, since the wiki is optional.
- **Guards tested:** the split between structural and content questions; the graph and the wiki hold no specification text; the registry description is a router, not an index of contents.
- **Regression for:** none yet — measured on a consumer project's registries: the vocabulary of the hand-written descriptions is found in the specification text for 94% of its terms and in the `Overview` plus the headings for 20%, so a text search recovers what the cell carried and a generated summary would not.

### T267 — A Code-Quoted Reference in a Consumer's Product Markdown Is Reported; Quoting Does Not Un-Ship a Token

- **Workflow:** `/magicspec analyze` Mode C step 6 (SDD Reference Containment Scan) with the ambient rule `CONSTITUTION.md` §6
- **Synthetic State (Test A):**
  - A consumer project that installed the engine; the engine directories are vendored and the project's own code and documents are product files. Its `README.md` contains the line: "Before changing the login flow, open `.magicspec/main/specifications/l1-auth.md` to see how it is specified." The path is inside an inline code span.
- **Action A:** the user runs `/magicspec analyze` and the ventilation reaches step 6.
- **Expected A:**
  - [ ] The scan does not drop the occurrence for sitting inside a code span: it reports `SDD_REFERENCE_LEAK README.md:{line} → ".magicspec/main/specifications/l1-auth.md"`.
  - [ ] The line tells the reader to open the path, which is a use of it, so the finding stands among the unconditional ones and not in the contextual sub-list.
  - [ ] The report states the remediation path `→ /magicspec plan {ws}` and edits no product file.
- **Synthetic State (Test B — control):** the same project has a contributor page `docs/contributing.md` that documents the SDD workflow itself: "Specifications live under `.magicspec/{workspace}/specifications/`; the plan is `PLAN.md`."
- **Expected B:**
  - [ ] The scan yields no finding for that page, since there the reference is the content; the finding of Test A is unchanged.
- **Synthetic State (Test C — control):** the project's `docs/style.md` shows what not to write, in a fenced block: `// Implements T-2B03`.
- **Expected C:**
  - [ ] The occurrence is reported, not skipped for being fenced, and it lands in the contextual sub-list because the passage illustrates a forbidden form instead of using it; it is not among the unconditional findings.
- **Guards tested:** quoting does not un-ship a token (the quoting precondition holds for the engine's own authored files in the engine's own repository, not in a consumer project); a use of a path and an illustration of a forbidden form are told apart by the self-containment test, not by syntax; a contributor page about the SDD workflow is exempt; an unclear occurrence is reported.
- **Regression for:** none yet — measured on five consumer projects' tracked product markdown: 92 of 279 matches sat inside code spans or fences, and in two of the five every match did, so a blanket "a quoted occurrence is a mention" made the scan report nothing there.

### T271 — An Unknown First Word Opens the Help With the Typed Text Kept, and Nothing Runs Before the Choice

- **Workflow:** the router `SKILL.md` (Dispatch step 1) and `help.md` (Step 3, item 3)
- **Synthetic State (Test A):** the router and project of T268; the host's question form holds four choices.
- **Action A:** the user types `/magicspec holiday booking feature`.
- **Expected A:**
  - [ ] `holiday` equals no command name and is no more than one edit from any, so the router does not run `spec` at once and does not guess a command: it opens the help with the typed text kept.
  - [ ] The list is printed, then the first question carries, first and marked recommended, the choice *run `/magicspec spec` with "holiday booking feature" as the idea*, and last the choice *choose a command instead*.
  - [ ] The typed text is not read for a command or a language: neither `booking` nor `feature` is taken for either.
  - [ ] Choosing the first choice reads `workflows/spec.md` with the whole text as the idea, which then passes Step 0.5; nothing was written before the choice.
- **Synthetic State (Test B — control):** the user types `/magicspec "plan a holiday booking feature"` (quoted).
- **Expected B:**
  - [ ] The quoted text is an idea for `spec` even though its first word is a command name: no help, no picker; the idea passes Step 0.5.
- **Synthetic State (Test C — control):** the user types `/magicspec plan a holiday booking feature` where `plan` is a command of the table and the remaining text cannot be its argument.
- **Expected C:**
  - [ ] The text is parsed as that command; judged against the *Argument* column it cannot be that command's argument, so it is routed to `spec` with one `[DR]` line carrying the override. (With a table that has no `plan` row, Test A applies.)
- **Guards tested:** the command is required, so a typo of a command name never becomes a specification unasked; the quoted form forces the idea reading; an accidental command name is routed by one `[DR]`, not a question.
- **Regression for:** none yet — new with the one-command surface.

### T272 — A Word One Edit From a Command Offers That Command First

- **Workflow:** the router `SKILL.md` (Dispatch step 1) and `help.md` (Step 3, item 3)
- **Synthetic State (Test A):** the router and project of T268.
- **Action A:** the user types `/magicspec tsk engine`.
- **Expected A:**
  - [ ] `tsk` is one letter removed from `task`: the first, marked choice is *run `/magicspec task` with "engine"*, the second *run `/magicspec spec` with "tsk engine" as the idea*, the third *choose a command instead*. Nothing runs before the user has chosen.
- **Synthetic State (Test B — control):** the user types `/magicspec taks engine`.
- **Expected B:**
  - [ ] Two letters swapped are more than one letter added, removed or changed, so no command is offered as a correction: the first, marked choice is *run `/magicspec spec` with "taks engine" as the idea*. Nothing runs unasked.
- **Guards tested:** the did-you-mean command comes before the `spec` reading; its argument is the rest of the typed text; the edit rule is the one the router states.
- **Regression for:** none yet — new with the one-command surface.

### T274 — `/magicspec run` Without an Argument Runs Its Default and Says Which

- **Workflow:** the router `SKILL.md` (Dispatch step 2) and `run.md`
- **Synthetic State (Test A):** a workspace with an active phase holding `Todo` tasks.
- **Action A:** the user types `/magicspec run`.
- **Expected A:**
  - [ ] No question is asked: the argument is optional, so the default (the active phase) runs.
  - [ ] The first line says which default ran and how to pass an argument (`/magicspec run engine`, `/magicspec run "T-1A01"`).
- **Synthetic State (Test B — control):** `/magicspec status` and `/magicspec analyze` without arguments.
- **Expected B:**
  - [ ] Each runs its default (the resolved workspace's briefing; the full audit) with the same first line and no question.
- **Guards tested:** an optional argument is never asked for; a default announces itself.
- **Regression for:** none yet — new with the one-command surface.

### T276 — `/magicspec migrate` Shows the Plan, Asks Once and Applies Only on a Yes

- **Workflow:** `migrate.md`
- **Synthetic State (Test A):** a 2.x project (earlier engine folder, earlier state folder) with the new skill folder installed.
- **Action A:** the user types `/magicspec migrate`.
- **Expected A:**
  - [ ] The dry run is shown verbatim before anything changes, with the plan's sweep line.
  - [ ] Exactly one consent question follows (E1), the apply choice marked recommended with its forecast; the project is not initialized and `finalize` is not called.
  - [ ] On a yes the apply step runs and its output is shown verbatim; on *Not now* nothing changes and the plan stays on screen.
- **Synthetic State (Test B — control):** the project is already migrated.
- **Expected B:**
  - [ ] The finished message, and no question.
- **Synthetic State (Test C — control):** another command is typed on the unmigrated project.
- **Expected C:**
  - [ ] It stops with the one instruction naming `/magicspec migrate` beside the script path and creates no second state folder.
- **Guards tested:** dry run first; consent only for a plan that removes or renames; the stop names the command.
- **Regression for:** none yet — new with the one-command surface.

### T277 — The Migration Rewrites the Earlier Vocabulary Only Where It May, and Reports the Rest

- **Workflow:** `migrate.md` (Step 5) with `scripts/lib/vocabulary-sweep.js`
- **Synthetic State (Test A):** a migrated 2.x project: a Stable specification that says "run the earlier spec command" in its overview and in an old Document History row, its registry row, an archived phase, a retrospective, the constitution, and a product `README` using the earlier command names.
- **Action A:** the user confirms the plan of `/magicspec migrate`.
- **Expected A:**
  - [ ] The specification's overview, the registry row's description and the plan use `/magicspec <command>` and the present folder names; the specification has a patch version and one new history row, and its registry row carries the new version.
  - [ ] The old history row, the archive, the retrospective and the changelog are byte-identical; the constitution is named as not rewritten with the pointer to `/magicspec rule`.
  - [ ] The `README` is listed with its line number and not edited.
  - [ ] Every changed file was copied to the backup folder first, and the output lists it with the revert hint.
- **Synthetic State (Test B — control):** the same command is run again.
- **Expected B:**
  - [ ] Nothing is left to migrate and nothing changes.
- **Guards tested:** history is never rewritten; a product file is the owner's; a rewritten specification is versioned and recorded; the sweep is idempotent.
- **Regression for:** none yet — new with the one-command surface.

### T281 — `clean-cache` Removes Only What the Engine Can Rebuild

- **Workflow:** `clean-cache` (`l2-engine-automation.md` §Cache Retention)
- **Synthetic State (Test A):** a project with a graph extraction cache, a wiki, the documentation-sync state file, a diagnostics findings file, an engine-feedback notes file and a migration backup folder.
- **Action A:** the agent runs `executor.js clean-cache --dry-run`, then `executor.js clean-cache`.
- **Expected A:**
  - [ ] The dry run lists each rebuildable cache with its size and removes nothing.
  - [ ] The run removes the graph extraction cache, the wiki and the state files, and nothing else.
  - [ ] The findings file, the notes file and the backup folder are byte-identical afterwards.
  - [ ] The next `build-spec-graph` rebuilds what was removed.
- **Synthetic State (Test B — control):** two successive `build-spec-graph` runs on an unchanged project.
- **Expected B:**
  - [ ] The extraction cache holds one entry per specification file after both runs — no entry of an earlier content is left behind.
- **Guards tested:** every cache has a bound; findings, notes and backups are never cleaned.
- **Regression for:** none yet — new with cache retention.

### T287 — A Stage Started Cold From the Files Reaches the Recorded Next Step

- **Workflow:** the router `SKILL.md`, `task.md` and `run.md` (Entry, context load) with `resume-state` (`CONSTITUTION.md` §10)
- **Synthetic State:** a new session after `/clear`; the previous session ended after `/magicspec plan engine`; the only memory is the workspace: `PLAN.md`, `STATE.md` with `Next Action: Decompose Phase 2 via /magicspec task engine`, the registry and the constitution.
- **Action:** the user types `/magicspec task engine` and nothing else.
- **Expected:**
  - [ ] The run reads the plan's active phase, the specifications that phase holds and the constitution — the read set of its row (PS-3) — and not the chat, not the previous stage's body, not the other phases' workbooks.
  - [ ] Decomposition of Phase 2 proceeds without a question; the recorded `Next Action` and the user's request agree, so no divergence line is printed.
  - [ ] The same holds one stage later: `/magicspec run engine` in another new session finds the workbook and the task to execute from the files alone.
- **Control:** `PLAN.md` is missing: `/magicspec task engine` stops at the Plan Gate naming `/magicspec plan engine` (T285); it does not guess a phase.
- **Guards tested:** PS-2 file-borne handoff; PS-3 bounded read set; the memory fence (the request outranks the recorded `Next Action`).
- **Regression for:** none yet — new with the four stages.

### T288 — `audit` Runs `analyze` With No Narration and Every Text Names `analyze`

- **Workflow:** the router `SKILL.md` (Dispatch step 1) and `analyze.md`
- **Synthetic State:** the router table row reads `analyze` (alias `audit`).
- **Action:** the user types `/magicspec audit` and, in another session, `/magicspec AUDIT`.
- **Expected:**
  - [ ] Both run `analyze` with its default (the full audit); the alias is read as its command and nothing is narrated about the substitution.
  - [ ] Every line the run prints that names a command names it `analyze` — the report, the handoff line and the remedies — never `audit`.
  - [ ] `/magicspec help audit` explains `analyze` and says which command it is.
- **Control:** `/magicspec audit "payments"` passes `"payments"` as the focus directive of `analyze`.
- **Guards tested:** one router parser reads the alias from the command cell; an alias is a spelling, not a second command.
- **Regression for:** none yet — new with the command set.

### T310 — A Defect Report Typed Into `spec` Is Routed to `fix`, and an Idea Is Not

- **Workflow:** `SKILL.md` (Dispatch step 3) and `spec.md` (Defect Report Test)
- **Synthetic State:** a project with specifications.
- **Action A:** `/magicspec spec "TypeError: cannot read properties of undefined (reading 'id') at checkout.js:42"`.
- **Expected A:**
  - [ ] The input is an error message with a stack trace: `fix` runs, with one line `[DR] Routed to fix — a defect report, not an idea. (Override: /magicspec spec "{text}")`; nothing is written by `spec`, no workspace created, no survey opened.
- **Action B:** `/magicspec spec "checkout fails with an empty cart, and also add gift wrapping"`.
- **Expected B:**
  - [ ] It both reports a defect and asks for new behaviour: `fix` runs for the defect; the gift wrapping is a specification gap `fix` records or the next step it names.
- **Action C:** `/magicspec spec "a holiday booking feature"` and then the override text retyped after Action A's routing.
- **Expected C:**
  - [ ] The feature request is an idea and is dispatched by `spec`; the retyped text of Action A stays an idea and is not routed twice.
- **Control:** the shipped router, `spec.md` and `fix.md` name no maintenance command.
- **Guards tested:** FX-11 a report is not an idea; the loop guard.
- **Regression for:** none yet — new with the fix command.

### T311 — A Note Is Recorded, Scrubbed and Drafted, and the Draft Carries Nothing of the Project

- **Workflow:** `references/rules/bug-reporting.md` (Feedback Notes) with `scripts/feedback.js`
- **Synthetic State:** the agent hit a script error; it records a note whose text mentions a token (`ghp_…`), a path (`C:\Users\alice\app\src\x.js`), a mention (`@octocat`), an issue reference (`#123`), an image and a fenced block of code.
- **Action:** `feedback note …` then, at the end of the workflow, `feedback draft`.
- **Expected:**
  - [ ] The note is recorded with the engine's evidence (version, workflow, finding codes, system, runtime, host); the command exits 0.
  - [ ] The draft prints the complete report in the layout of the issue form; the token, the absolute path, the mention, the reference, the image and the code block are gone; an engine file is named by its path inside the skill folder; the report says it will be public.
  - [ ] Related notes of one problem (the same file, code and workflow) share a fingerprint and one report.
- **Control:** the channel is `off`: no note is recorded and nothing is offered.
- **Guards tested:** EF-1; EF-4 scrubbed by construction; EF-6; EF-8 fingerprint.
- **Regression for:** none yet — new with the feedback channel.

### T313 — The Channel `draft` Never Publishes, and an Unrecognized Value Falls Back to It

- **Workflow:** `feedback submit` with `feedback.channel`
- **Synthetic State:** a shown draft; the setting is `draft`, then `everything`.
- **Action:** `feedback submit d1` under each.
- **Expected:**
  - [ ] Under `draft` the call is refused (`the agent cannot publish`) and the client is never run; the text and the link remain.
  - [ ] Under `everything` the effective channel is `draft` and the fallback is reported on one line; it never becomes `full`.
  - [ ] The rule module tells the agent never to submit without the person's explicit yes to the shown draft, and that an unanswered offer is listed again without asking.
- **Control:** the setting is absent: the default `full` allows the offer, still only behind the yes.
- **Guards tested:** EF-10 guidance in, switch out; EF-2.
- **Regression for:** none yet — new with the feedback channel.

### T336 — A Review's Comparison Set Comes from the Index, and from a Text Search When the Index Is Unavailable

- **Workflow:** `roles/spec-critic.md` (step 1, Comparison set), `roles/planner.md` (step 6, Plan check) and `analyze.md` (Mode C, step 7a) with `scripts/memory-query.js`
- **Synthetic State:** a specification amended to rename a term that two other specifications and one plan phase use; a built artifact index; an archived phase that mentions the old term.
- **Action:** the Post-Update Review of the amendment; then the same review with both index files replaced by folders, so that `memory-query` prints its unavailable line.
- **Expected:**
  - [ ] The review lists the names the changed sections introduce or use and runs `memory-query "{name}"` for each; it reads each cited section before it relies on the result, and adds the specification graph's neighbours.
  - [ ] The two specifications that use the old term are found and compared; the archived phase is not part of the set.
  - [ ] With the unavailable line the review searches the specification text of every registered workspace directly, finds the same sections and reports the same findings with the same `[Coherence] {N} artifacts compared — {k} findings` line; the unavailable index is not a finding of the review and stops nothing.
- **Control:** the plan check of the planner passes `--history` to reach what archived phases delivered; the specification check and the audit never do.
- **Guards tested:** AM-3; AM-8; the comparison set of the coherence check (CH-1) and its result line (CH-6).
- **Regression for:** none yet — new with the artifact index.

### T343 — Sync Writes Only Derived State, Never the Engine Snapshot, and a Second Run Writes Nothing and Says So in One Line

- **Workflow:** `workflows/sync.md` with `scripts/sync.js`
- **Synthetic State:** a project whose global registry shows a stale specification count for its one workspace, whose live memory has stale progress counters, and whose registry carries a version line, a history row and an `**Engine Version:**` snapshot.
- **Action:** `/magicspec sync`, then `/magicspec sync` again.
- **Expected:**
  - [ ] The first report lists the count and the counters as written, prints the counts line first and ends with one `Next:` line naming a command and its demand.
  - [ ] The registry's version line, history row and engine-version snapshot are exactly as they were; no project version was bumped and no changelog entry was written; `finalize` was not run.
  - [ ] The second run writes no byte and prints one line: `[Sync] in sync — nothing to write, nothing to report.`
- **Control:** restoring the stale count writes only that cell again; nothing else of the file moves.
- **Guards tested:** SY-1; SY-3; SY-8.
- **Regression for:** none yet — new with the sync command.

### T344 — An Area or a Workspace Argument Narrows the Run

- **Workflow:** `workflows/sync.md` Entry and Step 1
- **Synthetic State:** two registered workspaces, both with a stale count.
- **Action:** `/magicspec sync registry`, then `/magicspec sync {workspace}`, then `/magicspec sync nothing`.
- **Expected:**
  - [ ] `registry` runs that area only: no projection, graph, state, version or documentation line appears.
  - [ ] A workspace name limits every area to that workspace; the other workspace's row and files are untouched.
  - [ ] An unknown word exits 1 with one line listing the areas and the registered workspaces, and writes nothing.
- **Control:** with a workspace named like an area, the area wins and `--workspace {name}` reaches the workspace.
- **Guards tested:** the argument grammar of §5.2.
- **Regression for:** none yet — new with the sync command.

### T353 — A Comparison Set Built from a Cut List Takes the Next Page or Narrows the Query Before It Is Reported

- **Workflow:** `roles/spec-critic.md` (step 1, Comparison set) and `roles/planner.md` (step 6, Plan check) with `scripts/memory-query.js`
- **Synthetic State:** an amendment that renames a term used in forty sections of the specifications of two workspaces (more than one page of ten) and in three archived phases; a built artifact index.
- **Action:** the Post-Update Review of the amendment; then the plan check of a phase that uses the same term.
- **Expected:**
  - [ ] The first query's first line reads `1-10 of 40 in force, 3 more in history — next: --offset=10 …`; the review does not report a set from the ten results it was shown. It takes the next pages with `--offset`, or narrows the query with a more specific name or `--kind`, until the set is whole, and prints the one `[Coherence] {N} artifacts compared — {k} findings` line over the whole set.
  - [ ] A section that is a duplicate definition on the third page is found; it would have been missed by reading the first page only.
  - [ ] The three archived phases are not part of the set of the specification check; the plan check passes `--history` and reads the count it names.
- **Control:** a term used in four sections prints only `modes: lexical`; the review takes that list as whole and requests no further page.
- **Guards tested:** AM-9; AM-6; the comparison set of the coherence check (CH-1).
- **Regression for:** the cut list that named no remainder (found by a reference-mining pass: ten shown of seventy-nine in force).

### T356 — A List That Holds Every Match Prints Only Its Modes Line, and the Reader Does Not Page

- **Workflow:** `roles/spec-critic.md` (step 1, Comparison set) with `scripts/memory-query.js`
- **Synthetic State:** a built artifact index; a name used in four sections of the specifications, and in two archived phases.
- **Action:** the specification check searches the name; then searches a second name that matches nothing.
- **Expected:**
  - [ ] The first query prints `modes: lexical` and four results, with no count and no `--offset`; the reader takes the four as the whole set and requests no further page and no `--history` it was not asked for.
  - [ ] The second prints `modes: lexical` and `No sections match.`; the reader records that the name is not in the specifications and goes on.
- **Control:** the same first query with `--history` prints the six sections and no history count.
- **Guards tested:** AM-9 (a complete list is not annotated); AM-6.
- **Regression for:** none yet — the control of the cut-list scenario.
