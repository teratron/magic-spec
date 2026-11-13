# Workflow Test Suite — context

Cases of the area `context` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T215 — Context Step 0 Scope Claim Matches Implementation

- **Workflow:** `context.md` (§Step 0 scope) vs. `plan.md`, `task.md` and `rule.md`
- **Synthetic State:** static text scan (no runtime state).
- **Action:** review `context.md` Step 0 preamble against the `plan.md`, `task.md` and `rule.md` bodies.
- **Expected:**
  - [ ] `context.md` Step 0 explicitly states it governs `magic.spec` — the sole workflow authoring new topical spec content requiring workspace-creation routing.
  - [ ] `context.md` says Step 0 runs for `/magicspec spec` alone and that every other command skips it and routes among the registered workspaces through the Resolution Chain.
  - [ ] `plan.md`, `task.md` and `rule.md` contain zero references to "Workspace Intent", "WI-", or "Step 0" (they never claim to perform detection they don't implement).
- **Guards tested:** Contract/implementation parity (regression for the Step-0 scope-claim drift found in Improv Mode simulation 2026-09-17, "The Discarded Directive").

### T222 — A Context That Begins With a Summary Is Re-grounded From Files, Never From the Summary or a Percentage (SC-7)

- **Workflow:** `context.md` §Context Budget Guard → Post-Compaction Re-grounding + `CONSTITUTION.md` §10
- **Synthetic State:**
  - The conversation was compacted: its first message is a summary stating that the current task is `T-3A02`, that the global-regex approach worked, and that no constraints apply.
  - On disk: `STATE.md` carries the Blocking Constraint `[C-004]` ("do not edit the checksum manifest by hand"); `T-3A02`'s `Attempts` records the global-regex approach as **failed**. The host supplies no usage figure.
- **Action:** The user writes `carry on`.
- **Expected:**
  - [ ] The agent treats the context as **cold**: it runs resume detection and re-reads `STATE.md` and the active task's tracking entry before making any edit.
  - [ ] Constraints, dead ends and position are taken from those files: `[C-004]` is acknowledged before the first action, and the global-regex approach is not retried (or a one-line `retry:` states what differs) — although the summary says it worked.
  - [ ] Where the summary and the files disagree, the files are followed.
  - [ ] **No fill percentage is cited or acted on** ("context at 63%") and no tier is narrated.
- **Guards tested:** SC-7 observable triggers — a visible compaction is an event, a fill percentage is not measurable; Post-Compaction Re-grounding; the retired Budget Guard tiers stay retired; SC-6 (recorded state outranks recollection).
- **Regression for:** the retired POOR auto-pause that fired on a guessed percentage, and a summary that silently drops the constraints and dead ends a resuming session most needs.

### T234 — Shipped Workflow Text Stays Structurally Sound: Section References Resolve, List Items Keep Their Own Lines, Every Ventilation Finding Code Has a Checklist Line

- **Workflow:** `context.md`, `plan.md` and `task.md`, `run.md`, `analyze.md` (static scan)
- **Synthetic State:** static text scan of `skills/magicspec/workflows/*.md` (no runtime state).
- **Action:** review named-section references, list structure and the Mode C Completion Checklist.
- **Expected:**
  - [ ] Every `§{Section}` reference names a heading that exists in the file it points to: `task.md` and `run.md` send workspace resolution to `context.md` §Workspace Resolution Chain, not to a `§Workspace Resolution` heading they do not own (`analyze.md` owns one); a list item is cited by its section and step (`context.md §Post-Resolution` step 4), never as a bare `§4` that no heading carries.
  - [ ] No list item shares a physical line with another: `context.md` Post-Resolution step 4 renders two bullets.
  - [ ] Every Mode C step that defines its own finding code has a line in the Mode C Completion Checklist — including the three that once lacked one: `PHANTOM_COMMAND` (step 2), `DOC_SYNC` (step 10), `UNSCOPED` (step 11).
- **Guards tested:** Broken Loops — a checklist that does not cover the work; dangling cross-references; list integrity.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30).

### T254 — A Workspace Route Is Forecast, Not Asked (WI-4, WI-7, C26)

- **Workflow:** `context.md` §Ambiguity Gate (WI-4) and §Workspace Fit Validation (WI-7); `spec.md` Step 0
- **Synthetic State:**
  - `workspace.json`: `engine` (default) and `docs`; `docs` owns `l1-doc-dashboard.md`, a spec about a dashboard of documentation statistics.
- **Action A (overlap, no explicit creation):** "Spec out a dashboard of documentation page views." — class 3 signal `dashboard`, overlapping the `docs` lexicon (`doc-dashboard`) by ≥30%; no explicit creation token.
- **Expected A:**
  - [ ] `ambiguous` → forecast; the probe reads `l1-doc-dashboard.md` and finds the same subject — a real overlap, not a name collision.
  - [ ] `existing:docs` wins: moving a misrouted spec later is one rename and two registry rows, while undoing a workspace removes a directory — a deletion that needs consent (E1).
  - [ ] `[DR] Routed 'documentation page views' to 'docs' — lowest worst case (DA-10); worst case if wrong: multi-file revert; runner-up: create:dashboard. (Override: …)`; the routing premise is recorded in the dispatched spec. No menu.
- **Action B (explicit creation, no name):** "Let's add a separate workspace for this."
- **Expected B:**
  - [ ] `existing:*` contradicts the explicit request — a Blocker — so `create` wins, under a name inferred from the topic being dispatched, else `workspace-3`; the name is the recorded premise, a rename its override. No question.
- **Action C (second contour):** a request with no signal class whose fit is below 0.30 against `engine` and 0.20 against `docs`.
- **Expected C:**
  - [ ] The fit warning is narrated and the WI-4 forecast re-entered over the existing workspaces: `docs` fits no better, so `engine` stays; no creation without a creation signal; the premise is recorded. No question.
- **Guards tested:** WI-4 forecast defaults (existing by default, create on an explicit request, a name-collision probe turning D2 into D1); WI-7 re-entry of the forecast; WI-5 narration instead of a menu; the DA-10 tie-break by *Expected* between existing workspaces.
- **Regression for:** owner directive (2026-10-01) — the WI-4 three-option menu, whose marked default was the answer every time.

### T278 — Paths in the Request Choose the Workspace by Location, and the Choice Is Narrated Once

- **Workflow:** `context.md` §Workspace Resolution Chain with `resolve-workspace`, as `plan.md` and `task.md` Core Invariant 1 runs it
- **Synthetic State (Test A):** three registered workspaces — `api` (scope `src/api/`), `web` (scope `src/web/`), `docs` (scope `docs/`) — with `docs` as the registry default and no task in flight.
- **Action A:** the user types `/magicspec task "decompose the checkout flow in src/web/cart.js"`.
- **Expected A:**
  - [ ] The engine's chain chooses `web` by the location signal, although `docs` is the default.
  - [ ] One line is printed, once: `[Workspace] web — location. (Override: /magicspec task {other} …)`.
  - [ ] The tasks are written for `web` only; no other workspace folder changes.
- **Synthetic State (Test B — control):** the same request in a project with one workspace.
- **Expected B:**
  - [ ] The workspace is used silently; no `[Workspace]` line is printed.
- **Synthetic State (Test C — control):** the request names `src/web/a.js`, `src/web/b.js` and `src/api/c.js`.
- **Expected C:**
  - [ ] `web` wins by holding more of the paths, and the line names `api` as the workspace the other path matched.
- **Guards tested:** WI-11 to WI-13: one chain computed by the engine, the location signal from paths against each scope, one narration line in a multi-workspace project and none in a single-workspace one.
- **Regression for:** none yet — new with the routing of every command.

### T279 — An Explicit Workspace Wins Over a Contrary Path

- **Workflow:** `context.md` §Workspace Resolution Chain (priorities 1 and 2)
- **Synthetic State (Test A):** the three workspaces of T278.
- **Action A:** the user types `/magicspec run docs "fix src/web/cart.js"`.
- **Expected A:**
  - [ ] The workspace is `docs` by the argument signal; the path in the request is not a reason to change it.
- **Synthetic State (Test B — control):** no argument, `MAGIC_WORKSPACE=api` set, the same path in the request.
- **Expected B:**
  - [ ] The workspace is `api` by the environment signal; an argument given as well would win over the environment.
- **Guards tested:** the explicit sources are above every computed signal.
- **Regression for:** none yet — new with the routing of every command.

### T280 — A Workspace Name the Registry Does Not Hold Stops With the Registered Names

- **Workflow:** `context.md` §Workspace Resolution Chain (WI-14)
- **Synthetic State (Test A):** the three workspaces of T278.
- **Action A:** the user types `/magicspec task mobile`.
- **Expected A:**
  - [ ] It stops with `Unknown workspace 'mobile'. Available: [api, web, docs].`
  - [ ] No folder `.magicspec/mobile/` is created, and no file is written under a folder `workspace.json` does not register.
- **Synthetic State (Test B — control):** `/magicspec spec "a new mobile app for the shop"`.
- **Expected B:**
  - [ ] Only `spec` may create a workspace; it does so by its own detection (WI-1 to WI-4), never by the resolver.
- **Guards tested:** WI-14 registered folders only; one command creates workspaces.
- **Regression for:** none yet — new with the routing of every command.
