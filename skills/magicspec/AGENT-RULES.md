# Magic Spec — Agent Rules <!-- magicspec-rule -->

Consolidated operational rules for AI agents in projects using the magic-spec engine.
Sections are independent — apply each by its own trigger. Paths are relative to the `magicspec` skill folder (the folder holding its `SKILL.md`); scripts run as `node <that folder>/scripts/executor.js`; `.magicspec/…` is relative to the project root.

> [!CAUTION]
> **The engine folder is READ-ONLY for all standard workflows.**
> Never write to the `magicspec` skill folder, or to the host copies generated from it,
> unless the task explicitly states **"Engine Improvement"**. That folder is the distributed
> SDD engine — unauthorized changes corrupt it for every user of this project.
> If you are about to edit any file in it: **STOP** and ask the user
> to confirm the task is an engine improvement.

## 1. Engine Upgrade Detection (Local ↔ Snapshot)

Engine updates ship via the project's releases page on the remote Git host (e.g., GitHub, GitLab, etc.): the user
downloads the latest release archive and manually replaces the skill
folder. Its `.version` then changes locally while
the `**Engine Version:**` snapshot in `.magicspec/INDEX.md` still points at the
previously analyzed value. This section detects that delta and offers to
re-validate the project. No network calls — purely local comparison.

### Procedure

Runs at the start of **every** `/magicspec:*` invocation except `/magicspec:analyze`
(would recurse) and `/magicspec:status` (read-only briefing — reports drift as an
informational line instead of prompting). Trigger on **any** segment
difference — `major`, `minor`, **and `patch`**; patch releases routinely
carry behavior-affecting changes.

1. Read `local_engine` from `.version`.
2. Read `snapshot_engine` from the `**Engine Version:**` field in `.magicspec/INDEX.md`.
   Missing `.magicspec/INDEX.md` → treat as `fresh` (no prior analysis exists — nothing has
   drifted from anything). File present but the `**Engine Version:**` field missing →
   treat as `unknown` (a registry exists without the snapshot).
3. If `local_engine == snapshot_engine`, or the result is `fresh` → proceed silently.
   A fresh project has no prior snapshot to revalidate against; Auto-Init creates
   `.magicspec/INDEX.md` with a correctly-seeded snapshot on its own.
4. On mismatch, or `unknown`, narrate **one informational line** and **proceed** —
   never a `[y/n]` prompt or option menu. This is a drift-revalidation offer governed by
   DA-8/DA-9 of the Autonomous Decision Protocol (one recommended path, no menu); it mirrors
   the read-only treatment `/magicspec:status` already uses (SC-4):

   > [!NOTE]
   > SDD engine drift: `{snapshot_engine}` → `{local_engine}`. Recommend `/magicspec:analyze`
   > to revalidate against the new engine — even patch releases may carry
   > workflow-affecting changes. Proceeding with the requested workflow.
   > (Override: run `/magicspec:analyze`.)

5. **Proceed** with the originally requested workflow and its original arguments. Do **not**
   block, and do **not** auto-divert into `/magicspec:analyze` — the user runs it when ready.

6. **Snapshot contract**: the `**Engine Version:**` field updates **only** when
   `/magicspec:analyze` runs (the sole writer; manual edits must not touch it) — except in this
   engine's own dev-repo, where `update-engine-meta` also patches the field directly on every
   C14 bump (detected via the developer-repository predicate `generate-checksums`/
   `sync-engine-snapshot` already use). Consumer projects are unaffected: the guard is absent there, so
   the sole-writer contract above holds exactly as written. Until a writer runs, the drift line
   re-narrates each session — that recurrence is by design (a standing recommendation), not a
   prompt.

### Exemptions

- `/magicspec:analyze` itself (would recurse).
- `/magicspec:status` — read-only briefing; renders drift as an informational engine line, never a prompt.
- Missing or unreadable `.version` → skip silently, do not block work.
- `MAGIC_DRIFT_CHECK=0` env var disables this rule entirely.

## 2. Specification Knowledge Graph

The Specification Knowledge Graph is managed by `magicspec:graph`.

### Auto-Use

- Before architectural / cross-module / "how does X relate to Y" questions, run
  `node scripts/executor.js build-spec-graph`. Read its god nodes, communities,
  coverage stats. For structured traversal add `--json --out`: it writes
  `.magicspec/graph/query.json` and prints one line, and you read only the part you
  need. Plain `--json` prints the whole graph (tens of thousands of tokens).
- If `.magicspec/graph/wiki/index.md` exists, navigate it instead of raw spec files for
  structure. The graph and the wiki hold no specification text: a question that
  names a mechanic ("what covers Z", "where is P defined") is answered by searching
  `.magicspec/{workspace}/specifications/` for it and reading the matching section.
- After creating or modifying any file in `.magicspec/` during this session, run
  `node scripts/executor.js export-wiki` to refresh the graph.

### On-Demand

- `/magicspec:graph` — full analysis: god nodes, orphans, missing Implements,
  community detection, advisory signal.
- `/magicspec:graph` + *"Visualize graph"* / *"Graph HTML"* → renders
  `.magicspec/graph/graph.html` (interactive vis.js).

## 3. Finalization Protocol (Post-Workflow)

After `/magicspec:spec`, `/magicspec:task`, `/magicspec:run` or `/magicspec:rule` complete their
main steps and **before** their Completion Checklist, run
`node scripts/executor.js finalize --workflow=<spec|task|run|rule> --workspace={active-workspace}`
and display its entire stdout **verbatim** in a fenced block. Skip it for `/magicspec:analyze`,
`/magicspec:graph` and `/magicspec-dev:*`. A non-zero exit is a WARNING, never a block.
Opt-outs, the significance whitelist and the channels:
[references/rules/finalization.md](references/rules/finalization.md) — read it the first time you finalize in a session.

## 4. Phase Archival Automation

`finalize --workflow=run` archives every phase with `status: Done` and no remaining `- [ ]` by itself;
there is nothing to run by hand. On-demand form and exemptions:
[references/rules/finalization.md](references/rules/finalization.md).

## 5. Post-Task Replan

After `/magicspec:run` finishes a task or phase, a drift signal leaves the user exactly ONE visible next
step: `/magicspec:task` (or `/magicspec:run` when clean). Never proactively offer `/magicspec:analyze`
or `/magicspec:spec` after a run. Triggers, the chain and exemptions:
[references/rules/replan.md](references/rules/replan.md) — read it when a run ends a task or phase.

## 6. SDD Containment (Code ↔ SDD Boundary)

The SDD is scaffolding, never a component of the product. Never write a reference to it into a product
file (task IDs, phase designators, `PLAN.md`/`TASKS.md`/`INDEX.md`/`RULES.md`, spec file names, any
`.magicspec/` path), and never wire the engine into the product's build, CI or packaging. The exact
classes, exemptions and enforcement points:
[references/rules/containment.md](references/rules/containment.md) — **read it before writing or editing any product file.**

## 7. Autonomous Decision Protocol (C27 Session Posture)

Between workflow invocations the agent keeps the engineer-decides posture — it
does not revert to host-assistant defaults at workflow boundaries.

### Rule

- **DA-6 (Session Persistence)**: when a workflow completes, the next step is
  computed (pipeline order → dependency topology → status maturity) and
  **narrated, never asked**. "Task finished — what now?" is resolved by the
  protocol, not by a question.
- **DA-4 (Decision Record grammar)**: every autonomous resolution of an
  elective fork is narrated as exactly one line:
  `[DR] {decision} — {criterion}. (Override: {command})` — the override hint
  preserves the user's control point.
- Questions are reserved for consent — destructive or irreversible actions,
  external release artifacts, and constitutional amendments — and for the
  idea intake survey (E6). A consent question is one question with at most
  three fixed options, the forecast's winner marked as the default.
- **DA-10 (Consequence Forecast)**: a fork the evidence does not settle —
  which workspace, which scan mode, which architecture, which fix — is
  decided by walking each candidate (status quo, primary, each alternative,
  and a hedge that does the shared part now and defers the rest) through
  five scenarios: Expected, Wrong premise, Boundary, Adversarial, Change
  later. A candidate that meets a dead end, a contradiction, a lost
  guarantee or a harm is dropped; then the lowest worst-case cost of being
  wrong wins — waiting for an answer counts as a stall, costlier than any
  reversible rework, except at intake (E6). The winner is narrated as a
  `[DR]`, and a premise only the requester can confirm is written into the
  spec as `Assumption (forecast)` with its override.
- **E6 (Idea Intake Gate)**: `/magicspec:spec {idea}` may ask before writing
  specs — but only after the agent has exhausted what the repository can
  answer, and only when the idea is internally contradictory, admits two
  readings that would produce materially different specifications, or
  leaves who it is for, what it must do or where it stops to be invented.
  The survey asks only for intent, in plain words: the forecast's
  candidates are the options, its winner is marked, and every question
  ends with a free-text "Other". Each round must close more questions than
  it opens or the gate ends; whatever is left open or delegated
  ("you decide"), the forecast answers and records as
  `Assumption (forecast)`. Technical realization (storage, library, schema,
  naming, algorithm) is never asked — the agent decides and records a
  `[DR]` or a `<!-- TBD: … -->` marker.

### Exemptions

- Objective integrity HALTs (checksums, drift, parity) — not elective forks;
  each states exactly one recommended resolution path.
- `MAGIC_DECISION_AUTONOMY=0` env var disables the session posture (workflow-
  internal C27 behavior is unaffected).

## 8. Completion Protocol (Mandatory Checklist)

Before finishing any task that involved magic-spec workflows, verify §1–§10 were honored.

- [ ] **§1 Upgrade Detection** — compared `.version` to `**Engine Version:**`
      in `.magicspec/INDEX.md` before any `/magicspec:*` (except `/magicspec:analyze`); on
      mismatch (or `unknown` snapshot) narrated exactly one informational drift line
      and proceeded — never prompted `[y/n]`, never auto-diverted into `/magicspec:analyze`.
- [ ] **§2 Spec Graph** — ran `build-spec-graph` before architectural questions;
      navigated `.magicspec/graph/wiki/index.md` (if present) instead of raw spec files;
      ran `export-wiki` after any `.magicspec/` change this session.
- [ ] **§3 Finalization** — after `/magicspec:spec|task|run|rule`, ran
      `node scripts/executor.js finalize --workflow=<...> --workspace={active-workspace}` and displayed its stdout **verbatim**.
- [ ] **§4 Phase Archival** — for `/magicspec:run`, confirmed `finalize` archived every
      phase with `status: Done` and no remaining `- [ ]`, and `TASKS.md` link
      references were rewritten to `archives/tasks/phase-{N}.md (Done (Archived))`.
- [ ] **§5 Post-Task Replan** — on any drift signal during `/magicspec:run`, the
      user-visible next step was exactly ONE command: `/magicspec:task` (with
      workspace context). NEVER proactively offered `/magicspec:spec` or
      `/magicspec:analyze` as a separate user-visible step — `/magicspec:spec` surfaces
      only inside `/magicspec:task` on a real HALT.
- [ ] **§6 Reference Containment** — no SDD-artifact references (task IDs,
      phase designators, `PLAN.md`/`TASKS.md`/`INDEX.md`/`RULES.md`, spec file
      names, `.magicspec/` paths) were written into product files; rationale
      restated in plain language where needed.
- [ ] **§7 Decision Autonomy** — elective forks resolved as `[DR]` one-liners
      (never questions); the post-workflow next step was computed and narrated
      per DA-6; unsettled forks were forecast (DA-10); questions appeared only
      for consent (E1, E2, E4) — single-question, ≤3 fixed options — or in the
      intake survey (E6).
- [ ] **§9 Bug Reporting** — if any engine-level bug, unexpected behavior, or crash was
      encountered in the engine files (the skill folder),
      did NOT attempt to self-repair the engine; generated a formatted
      `MAGIC-SPEC ENGINE BUG REPORT` block for the user to submit; also recorded the
      finding via `record-diagnostic` so it survives to the next finalize digest.
- [ ] **§10 Session Resume Check** — on a cold context (new, cleared, or after a
      compaction), ran `resume-state --all` once before the first tool call; relayed a
      printed line verbatim as one informational line and carried on with the user's
      request; said nothing when the script printed nothing.

## 9. Bug Reporting Protocol (Engine Feedback)

The engine folder is read-only for standard workflows. On an engine-level script error, template mismatch
or crash, do NOT edit it: emit the `MAGIC-SPEC ENGINE BUG REPORT` block for the user and record the
finding with `record-diagnostic`. Template and recording command:
[references/rules/bug-reporting.md](references/rules/bug-reporting.md) — read it when you meet one.

## 10. Session Resume Check (Cold Context)

A session that is new, cleared, or continuing after a compaction starts with no
memory of the work in flight. The engine records that work at events it can
observe — a task marked `In Progress`, dead ends written to `Attempts`, the
`STATE.md` update every finalize makes — so a cold context can recover it
without asking anyone. This section makes the recovery automatic: there is
nothing for the user to type.

### Procedure

Runs **once per cold context**: the first time the agent is about to make a tool
call while it holds no `STATE.md` for the workspace in its current context. A
`/magicspec:*` invocation already performs the same check in its context load
(`references/context.md` Post-Resolution, step 4) and does not repeat it.

1. Run `node scripts/executor.js resume-state --all` — no workspace is
   resolved yet, so it reads every registered workspace.
2. If it prints a line (`▶ Resume [{workspace}]: …`), relay it **verbatim** as one
   informational line — never a prompt, never a menu — and carry on with the
   user's request. The request outranks the recorded `Next Action`; narrate any
   divergence in one line (Memory Fence, `references/context.md`).
3. If it prints nothing, say nothing.

A missing or failing script counts as silence: this rule fails open and never
halts a session.

### Exemptions

- `MAGIC_RESUME_CHECK=0` env var disables this rule entirely.
- `/magicspec:status` — its briefing already renders the same information.
- A project with no `.magicspec/` — there is nothing to resume.
