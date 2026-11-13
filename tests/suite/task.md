# Workflow Test Suite — task

Cases of the area `task` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T152 — Cross-Workflow Handoff Propagation with Scoped Argument

- **Workflow:** `task.md` → `run.md` (Handoff chain)
- **Synthetic State:**
  - `workspace.json`: `{"default": "engine", "workspaces": {"engine": {}, "docs": {}}}`
  - User completed `/magicspec task docs` (scoped decomposition).
  - Decomposition is done and the phase holds a `Todo` task.
- **Expected:**
  - [ ] The stage ends at its boundary (PS-1): `task.md` starts nothing
  - [ ] The handoff line names `/magicspec run docs` with its reasoning demand
  - [ ] Workspace `docs` context preserved across workflow boundary, in the named command
- **Guards tested:** Handoff Propagation (task→run), Workspace context preservation, One Stage (named, never started)

### T257 — A Phase Left With Only Blocked Tasks Ends `/magicspec task` With the Stalled Plan Report, Not a Handoff Back to `/magicspec run`

- **Workflow:** `task.md` (Handoffs, Step 6 Stalled Plan) + `run.md` (Step 2 *Stalled*) + `CONSTITUTION.md` §5
- **Synthetic State (Test A — a spec gap):**
  - A single workspace `engine`. `l1-billing.md` was amended and is `Stable` again; its L2 child `l2-billing-ledger.md` was set to `RFC` by the C12 cascade and nothing has promoted it (Pre-Planning Stabilization iterates `Draft` specs only). `l2-billing-api.md` is `Stable`.
  - Phase 2: `T-2A01` `Done`; `T-2A02` (`l2-billing-api.md`) `Blocked [!]` with the reason "Spec `l2-billing-api.md` §3 is ambiguous: the rounding rule is unstated"; `T-2B01` (`l2-billing-ledger.md`) `Blocked [!]` "Spec `l2-billing-ledger.md` is `RFC`". No `Todo` and no `In Progress` task. Every file header equals its `INDEX.md` entry.
- **Action A:** `/magicspec run engine` halts in *Stalled* and recommends exactly one command, `/magicspec plan engine`; the user runs it, then `/magicspec task engine`.
- **Expected A:**
  - [ ] Pre-flight passes; `plan` promotes nothing (no `Draft` spec) and `task` Step 6 releases nothing — `l2-billing-ledger.md` is still `RFC`, and `T-2A02`'s block is not one this workflow owns.
  - [ ] The ledger is written with every recorded status unchanged, and the run **HALTs there**: no `/magicspec run` is named, so the commands do not alternate.
  - [ ] The report lists `T-2A02` and `T-2B01` with their recorded reasons, then exactly **one** next step, the one for the first blocked task in checklist order (`T-2A02`): *"Spec `l2-billing-api.md` requires design input: `{reason}`. Run `/magicspec spec`, then re-run `/magicspec plan`."* — no option menu.
  - [ ] It states that a block the workflow does not own is lifted by setting the task's `Status` to `Todo` once its cause is resolved.
- **Synthetic State (Test B — control, something runnable):** the same phase plus one `Todo` task whose parents are all `Done`.
- **Expected B:**
  - [ ] `/magicspec run {workspace}` is named as the next command, as before; no Stalled Plan report is printed.
- **Synthetic State (Test C — control, released):** the state of Test A after `l2-billing-ledger.md` returned to `Stable`.
- **Expected C:**
  - [ ] Quarantine Release returns `T-2B01` to `Todo`; a `Todo` task exists, so `/magicspec run {workspace}` is named and the Stalled Plan report does not fire.
- **Synthetic State (Test D — control, in flight):** the phase's only open task is `In Progress` (an interrupted session).
- **Expected D:**
  - [ ] `/magicspec run {workspace}` is named (it resumes the task — T256); the report does not fire.
- **Guards tested:** the applicability condition of the handoff to `run`; one recommended next step per stop (DA-8); the claim in `run.md` that blocked specs surface only inside a `/magicspec plan` HALT or the Stalled Plan report of `/magicspec task` made true; Quarantine Release and the "other blocks are untouched" rule unchanged.
- **Regression for:** "The Stranded Child" crisis (Improv Mode 2026-10-01) — `run.md` *Stalled* sent the user to `/magicspec task` on the claim that blocked specs surface in its Pre-flight, while `task.md` had no step that read a blocked task and nothing that stopped its handoff back to `/magicspec run`: a task blocked for a specification gap, or a child spec the C12 cascade left `RFC`, cycled between the two commands with no exit.

### T265 — Task Ledger Overview: Planning a Phase and Finishing One Leave It Untouched

- **Workflow:** `task.md` (Plan Write-back) + `run.md` (Phase Completion)
- **Synthetic State (Test A):**
  - A `TASKS.md` whose `## Overview` reads: "Tactical registry of all phases and their statuses. Check individual phase files in `tasks/` for atomic checklists." Its phase table holds Phase 1 `Done` and Phase 2 `In Progress`.
- **Action A:** `/magicspec task` decomposes a Phase 3; later `/magicspec run` finishes Phase 2.
- **Expected A:**
  - [ ] The phase table gains a Phase 3 row and Phase 2's status moves to its terminal value.
  - [ ] The `## Overview` is **byte-identical** after both steps; no sentence naming a phase, a date or a count is added to it.
- **Synthetic State (Test B — control):** after Phase 2 finishes the user asks: "Record what Phase 2 produced."
- **Expected B:**
  - [ ] It is recorded where it belongs — the phase file's `provides` and the workspace changelog entry for the phase — and not in the `Overview`.
- **Synthetic State (Test C — control):** a ledger carried over from before the contract, whose `Overview` is a long narrative of earlier phases.
- **Expected C:**
  - [ ] Planning and finishing a phase neither extend that narrative nor rewrite it as a side effect; shrinking it is a deliberate one-time task, not part of an ordinary run.
- **Guards tested:** the overview describes the ledger and tracks nothing; status is the phase table's; a phase's outcome has a home elsewhere; no step rewrites the overview as the plan moves.
- **Regression for:** none yet — measured on a consumer project: one workspace's overview is 20.8 KB of per-phase narrative, the other's a 0.1 KB description of the file.

### T285 — `task` on a Stale Plan Stops and Names `plan` With the Reason; Nothing Is Written

- **Workflow:** `task.md` (Plan Gate, Handoffs)
- **Synthetic State (Test A):** `PLAN.md` records `Based on: 1.4.0` and the registry is at `1.6.0`.
- **Action A:** `/magicspec task engine`.
- **Expected A:**
  - [ ] The Plan Gate stops the run before any decomposition: `TASKS.md`, the workbooks and `PLAN.md` are byte-identical afterwards.
  - [ ] The report names why in one line (the plan was written against registry 1.4.0, the registry is 1.6.0) and ends with `/magicspec plan engine` as the one next step; it does not run planning itself.
- **Synthetic State (Test B — a Stable spec in neither a phase nor the backlog):** the versions agree, but `l2-export.md` is `Stable` and appears nowhere in `PLAN.md`.
- **Expected B:**
  - [ ] The same stop: the plan is stale, the reason names the unplaced specification.
- **Synthetic State (Test C — control):** the versions agree and every `Stable` specification is placed.
- **Expected C:**
  - [ ] Decomposition proceeds.
- **Guards tested:** PL-4 a stale plan is not decomposed and `task` never repairs it; the staleness test (recorded versions, orphans); one next step per stop (DA-8).
- **Regression for:** none yet — new with the plan stage.

### T286 — A Decomposition Finding Travels Back as a Directive, and a Later Plan Retires It

- **Workflow:** `task.md` (Findings Go Back, Plan Write-back), `plan.md` (Plan Gate of its own start), `finalize.js` (next-step computation)
- **Synthetic State (Test A):** the active phase holds `l2-billing.md`, whose three sections exceed what one phase can carry; `PLAN.md` is at version `1.2.0`.
- **Action A:** `/magicspec task engine`.
- **Expected A:**
  - [ ] `task` decomposes what the finding does not touch and changes nothing in `PLAN.md` (PL-1).
  - [ ] `TASKS.md` gains a `## Replan Directive` section with `**Plan version:** 1.2.0` and a `**Directive:**` in plain words (what, where, the suggested change).
  - [ ] The run ends with `Next: /magicspec plan engine "{directive}" — deep reasoning`.
- **Synthetic State (Test B):** `/magicspec plan engine "{directive}"` rewrote the plan to `1.3.0`.
- **Expected B:**
  - [ ] The directive is no longer pending (its recorded plan version differs from the current one); the next-step computation names `/magicspec task engine`, not the directive.
- **Synthetic State (Test C — control):** a decomposition that completes without a finding while a stale directive stands.
- **Expected C:**
  - [ ] The stale section is removed.
- **Guards tested:** PL-8 findings go back with their reason (PS-5); a directive is pending only against the plan version it records.
- **Regression for:** none yet — new with the plan stage.

### T296 — A Names-Only Invocation Runs No Input Pass and Prints Nothing

- **Workflow:** `task.md` (Input Pass line) with `roles/prompt-engineer.md` (`## Input Pass`, item 1)
- **Synthetic State:** a registered workspace `engine` with an active phase.
- **Action:** `/magicspec task engine` and, in another session, `/magicspec status`.
- **Expected:**
  - [ ] Neither invocation carries prose: the arguments are a workspace name and nothing, so no intent statement is made and no `[Intake]` line is printed.
  - [ ] Both proceed to their own first step (workspace resolution, the Plan Gate or the briefing) exactly as before the pass existed.
- **Control:** `/magicspec task "decompose phase 2 in more detail"` carries a directive: the pass runs and, the reading agreeing with the literal text, stays silent (IP-7).
- **Guards tested:** IP-1 coverage excludes names, flags and paths; IP-7 silent by default.
- **Regression for:** none yet — new with the input pass.

### T297 — A Directive Carrying a Rule Clause Prints One `[Intake]` Line and Hands the Clause to Rule Capture

- **Workflow:** `task.md` (Input Pass line, T4 Capture) with `roles/prompt-engineer.md` (`## Input Pass`)
- **Synthetic State:** a registered workspace with an active phase.
- **Action:** `/magicspec task "make phase 3 smaller and also remember that we never touch the legacy importer"`.
- **Expected:**
  - [ ] The intent statement reads: decompose the active phase into smaller tasks; the clause "we never touch the legacy importer" is listed as set aside — a project rule — with the reason, and nothing is silently dropped.
  - [ ] Because a clause was routed elsewhere the reading differs from the literal text, so exactly one line is printed: `[Intake] Understood as: {statement}` followed by what was set aside.
  - [ ] The set-aside clause goes to the Operational Logic of `rule.md` through the T4 Capture; the decomposition proceeds on the rest of the directive.
  - [ ] No question is asked.
- **Control:** the directive is only "make phase 3 smaller": no `[Intake]` line.
- **Guards tested:** IP-2 nothing lost; IP-7 the line only when the reading differs materially; the T4 Capture of `task.md`.
- **Regression for:** none yet — new with the input pass.

### T326 — An Interface Task Starts With a Draft That Waits for Nothing and Names How It Is Looked At

- **Workflow:** `task.md` (Step 4, Interface tasks) and `run.md` (Step 3.1)
- **Synthetic State:** a new screen to build; the session has a browser tool in one run and none in another.
- **Action A:** `/magicspec task`, then `/magicspec run` with the browser tool.
- **Expected A:**
  - [ ] The first task of the track is a draft task; the build continues without waiting for a look; the `Verify` line of every interface task names the visual check.
  - [ ] The screen is rendered and compared with the interface section; the method is recorded in `Changes`.
- **Action B:** the same run with no way to render.
- **Expected B:**
  - [ ] The task says it cannot render and the check is a review against the interface section, recorded as such; nothing asks the person to look.
- **Control:** a task that changes no interface meets neither step 3.1 nor the design acceptance.
- **Guards tested:** UI-5; UI-6; UI-7; DA-2.
- **Regression for:** none yet — new with the interface design.
