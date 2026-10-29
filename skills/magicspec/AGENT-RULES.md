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
  `node scripts/executor.js build-spec-graph` (add `--json` for structured
  traversal). Read its god nodes, communities, coverage stats.
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

After `/magicspec:spec`, `/magicspec:task`, `/magicspec:run`, or `/magicspec:rule` complete their
main steps and **before** their Completion Checklist, run finalize. Skip for
`/magicspec:analyze`, `/magicspec:graph`, `/magicspec-dev:*` (read-only / system workflows).

### Procedure

1. Execute:

   ```bash
   node scripts/executor.js finalize --workflow=<spec|task|run|rule> --workspace={active-workspace}
   ```

   `--workspace` names the workspace the workflow ran for. Without it the script
   finalizes the default workspace, so an explicit workspace argument would be
   lost: significance would be judged, and `STATE.md` written, for the wrong one.

2. The script detects significant changes to whitelisted artifacts. On hit, it
   bumps `.magicspec/.version` and appends a Keep-a-Changelog entry to root `CHANGELOG.md`.
   On no hit, prints `⏭️ No significant changes detected` and exits 0.

3. **Display the entire script stdout verbatim** to the user in a fenced block.

4. If the script exits non-zero → emit a WARNING but do not block the Completion Checklist.

### Opt-Out

`MAGIC_FINALIZE=0` (env, highest precedence) · `finalization.enabled = false` in
`.magicspec/workspace.json` (project-wide) · `--dry-run` (preview) · `--no-bump`,
`--no-changelog` (per-step disable).

### Significance Whitelist

| Workflow | Paths that count |
| --- | --- |
| `magicspec:spec` | `.magicspec/{ws}/specifications/**/*.md`, `.magicspec/{ws}/INDEX.md`, `.magicspec/RULES.md`, `.magicspec/{ws}/RULES.md` |
| `magicspec:task` | `.magicspec/{ws}/PLAN.md`, `TASKS.md`, `tasks/**/*.md` |
| `magicspec:run` | `.magicspec/{ws}/TASKS.md` (status-line changes only), `STATE.md`, `archives/**`, `tasks/**/*.md` |
| `magicspec:rule` | `.magicspec/RULES.md`, `.magicspec/{ws}/RULES.md` |

### Channels

`.magicspec/{ws}/CHANGELOG.md` is `magicspec:run`'s internal phase journal (not touched
here). Root `CHANGELOG.md` is user-facing release notes — written by this protocol.

## 4. Phase Archival Automation

Completed phase files are auto-archived as part of `magicspec:run`'s finalize, to keep
active context lean.

### How it triggers

Runs **automatically** when `finalize --workflow=run` invokes `archive-phases`
internally — no extra command. Conditions: `tasks/phase-{N}.md` has `status: Done`
in YAML frontmatter **and** no remaining `- [ ]` items. The phase file is then
**moved** (rename, not copy) to `archives/tasks/phase-{N}.md`, and `TASKS.md`
link references are rewritten with the row marked `Done (Archived)`.

### Exemptions

- Any remaining `- [ ]` items, or `status` ≠ `Done` → never archived.
- Already-archived files (under `archives/tasks/`) are skipped silently.
- Project-wide disable: `archival.enabled = false` in `.magicspec/workspace.json`.

### On-demand

```bash
node scripts/executor.js archive-phases            # archive all eligible
node scripts/executor.js archive-phases --dry-run  # preview only
```

## 5. Post-Task Replan

After `/magicspec:run` finishes a task or phase, drift signals may have surfaced new
gaps. The user-visible next step collapses to ONE command — `/magicspec:task`
(workspace propagated). Its Pre-Planning Stabilization auto-fixes mechanical
drift; Pre-flight HALTs once with a single `/magicspec:spec` recommendation only
when specs need substantive design work. `/magicspec:analyze` and `/magicspec:spec` are
NEVER proactively offered after `/magicspec:run`.

### Triggers (any one)

- **Spec ambiguity** — agent surfaced unclear / conflicting / missing spec content during execution
- **Phase complete with nothing to run next** — the finished phase leaves no `Todo` task behind it (a next phase that has one continues without a halt)
- **RULES drift** — `RULES.md` version > `TASKS.md` base detected mid-run
- **Header drift** — `STATUS_DRIFT` / `VERSION_DRIFT` reported by Pre-flight

### Procedure

1. Emit exactly one line:

   > [!NOTE]
   > Post-task drift detected. Run `/magicspec:task` to revalidate the plan.

2. Inside `/magicspec:task`, Pre-Planning Stabilization auto-fixes mechanical drift
   (promote `Draft → Stable`, normalize field names, move phantoms to Backlog).
   Pre-flight HALTs with one user-facing recommendation only on hard drift that
   needs human intent (header parity violations, missing L1 parents, structural
   conflicts):

   > Spec `{file}` requires design input: `{reason}`. Run `/magicspec:spec`, then
   > re-run `/magicspec:task`.

3. Clean `/magicspec:task` completion → handoff to `/magicspec:run`.

### Hard rules for the agent

- NEVER recommend `/magicspec:analyze` proactively after `/magicspec:run` — it stays on-demand.
- NEVER recommend `/magicspec:spec` proactively after `/magicspec:run` — it surfaces ONLY inside `/magicspec:task` on a real HALT.
- The user sees exactly ONE next step after a phase: `/magicspec:task` (on drift) or `/magicspec:run` (clean).

### Chain

```
task Done
  → drift signal?
      yes → /magicspec:task
              → auto-fix? → yes → replan → /magicspec:run
                          → no  → HALT: /magicspec:spec, then /magicspec:task
      no  → /magicspec:run (next task)
```

### Exemptions

- Targeted task execution with no drift → `/magicspec:run` next, no replan.
- Engine improvement tasks (explicit directive) — engine and spec layers are separate.
- `MAGIC_POST_TASK_REPLAN=0` env var disables this rule entirely.

## 6. SDD Containment (Code ↔ SDD Boundary)

The SDD is **scaffolding**: erected around the work, never a component of it,
removed when the work is done. The boundary has two dimensions, and both answer
the same question — *is the product still whole once the scaffold is gone?*

- **Reference containment** — products may ship releases that exclude
  `.magicspec/`, so any reference to SDD artifacts inside product files becomes
  dead content. Traceability is one-way: SDD artifacts reference code; code
  never references SDD artifacts.
- **Structural containment** — with `.magicspec/`, the skill folder and the host
  copies generated from it deleted, the product must still build, test, run, and
  package. Making the scaffold load-bearing leaves no forbidden token behind, so
  no reference rule can catch it.

### Structural Rule (Scaffold Boundary)

Never wire the engine or the SDD into the product's own lifecycle. Forbidden:
build or package manifests invoking engine scripts (`package.json` `scripts`,
`Makefile` targets, `pyproject.toml`, `Cargo.toml`, Gradle tasks); CI/CD steps
gating a build, test, or release on a `/magicspec:*` workflow or an `executor.js`
subcommand; product build or runtime code reading anything under `.magicspec/` or
the engine directories; product tests asserting on SDD artifact structure;
release artifacts (archives, images, published packages) that include those
directories; and toolchain dependencies added solely to run the engine — a Node
runtime introduced into a Python-only project is coupling even where no file
names the engine.

The engine installs by unpacking an archive and is removed by deleting
directories. It is not a package-manager dependency, and must stay removable
without editing a single product manifest.

**Exempt**: the git pre-commit hook installed during setup. It lives in
`.git/hooks/` — never committed, never packaged — and gating a *commit* is not
gating a *build*. It stays behind when the scaffold is deleted, so it disarms
itself: with the engine folder absent it says so once and lets the commit through.

### Reference Rule

Never write references to SDD artifacts into product files — source code,
comments, docstrings, identifiers, string literals, test names, build/config
files, or user-facing docs (README, CHANGELOG). Forbidden reference classes:

- Task IDs in **any** form — bracketed (`[T-1A01]`), bare (`T-22A01`), or split
  (`T-1A01.1`). The generated shape is `T-{phase}{track}{seq}` and phase numbers
  reach two digits, so match `T-\d+[A-Z]\d+(\.\d+)?`, never a fixed width. Bare
  is the form that actually leaks — checklists bracket the ID, prose and code
  do not.
- Phase designators in **any** form — the file form (`phase-{n}`,
  `phase-{n}.md`) **and** prose (`Phase 20`, `Phase 20 Track B`, `Phase 22's
  closing validation`). Match `[Pp]hase[-\s]\d+`.
- SDD system files: `PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`.
- Specification file names (e.g., `l1-*.md`, `l2-*.md`).
- Any `.magicspec/…` path.

Prose `Phase {n}` is the one class that needs judgment: many domains own the
word (handshake phases, build phases, moon phases). Disambiguate by the
self-containment test — if the sentence stops making sense once `.magicspec/` is
absent, it denotes the plan's phase and is a leak; if it reads fine, it is
domain vocabulary and is not. Every other class above is unconditional.

If design rationale matters at a code site, restate it in plain language.
Provenance ("which task produced this") lives in the SDD layer (task `Changes`
fields, phase files) and git metadata (commit messages, PR descriptions) —
both legitimate channels.

### Example

```plaintext
BAD : // Implements T-2B03 (see .magicspec/engine/tasks/phase-2.md)
GOOD: // Reject zero-length payloads: the upstream queue treats them as poison messages.
GOOD: (commit message) feat(parser): add payload guard [T-2B03]
```

### Exemptions

- The `.magicspec/` subtree itself.
- The engine folder (the skill folder and the host copies generated from it) —
  **in a consumer project only**. There they are a vendored, never-authored drop, so a
  reference-containment scan over them is noise, not signal.
- Git metadata — not part of release artifacts.
- Contributor-facing process docs that document the SDD workflow itself
  (there the reference IS the content).

**In this engine's own repository, the engine-folder exemption above does
not hold.** The skill folder is the product
here — the same flip the Structural Rule above already makes for scaffold
boundary — so a task ID, phase designator, or spec file name inside a shipped
script's comment is a leak exactly as it would be in any consumer's product
file, and refusing to introduce one applies to editing the skill folder itself, not
only to editing a downstream project. A stable in-text protocol label (`C14`,
`SC-2`, `WC1`, and siblings such as `RC-n`/`DA-n`/`WI-n`) is not a reference to
a file or task and stays outside this rule either way.

### Enforcement

- **Write time** — the Coder role refuses to introduce violations.
- **Review time** — the Code-reviewer role FAILs any diff adding an SDD reference.
- **Audit time** — `/magicspec:analyze` ventilation reports
  `SDD_REFERENCE_LEAK {file}:{line}` findings (advisory; product files are
  never auto-edited), and inspects build, CI, packaging, source, and toolchain
  for structural coupling, reported as `SDD_SCAFFOLD_COUPLING {file}:{line}`.
  The two are separate checks because a token scan cannot see coupling — the
  ambient surface matters most here, since coupling usually arrives through a
  direct request ("add a lint script", "wire this into CI") rather than through
  a workflow the role cards mediate.
- **Remediation time** — detection and repair are separate duties, and audit
  owns only the first. Ventilation is read-only by contract, so a leak it finds
  is cleaned by scheduling it: the finding carries the path
  `→ /magicspec:task {ws}` to plan a containment-cleanup task, which `/magicspec:run`
  then executes under the Coder role — the same role that owns the write-time
  gate. Never treat a `SDD_REFERENCE_LEAK` report as self-resolving, and never
  edit product files from a workflow whose write scope is `.magicspec/`.

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

The engine folder (the `magicspec` skill folder) is strictly read-only for standard workflows. If you find a bug, logic mismatch, or experience a crash in any engine script or layout, do NOT attempt to edit or fix it yourself. Instead, formulate a structured report so the user can easily submit it.

### Trigger

Any engine-level script error, template mismatch, run-time crash, or logic bug detected in the skill folder.

### Action

Output a dedicated, highly visible Markdown alert block for the user. Do not proceed to execute the task if the engine bug blocks correctness.

### Recording (Diagnostics Digest)

The chat block above is a one-shot emission — in a long session it scrolls away long before the work ends, and a user reading only the final summary never sees it. Alongside it, record the finding so it also survives to the next finalize digest:

```bash
node scripts/executor.js record-diagnostic \
    --severity=error --source=agent --code=<UPPER_SNAKE_CASE> \
    --message="<one line, matches the Symptom above>" \
    [--locus=<engine file:line>] [--remedy="<suggested fix, if any>"]
```

This applies to every finding the agent records this way — not only engine bugs: a specification ambiguity hit mid-execution, a containment leak spotted while reading a product file, or a guard the agent had to work around all qualify. Use `--severity=warning` for anything that did not block the task. The command always exits 0, including when the finding is malformed — recording a complaint never itself fails. This is not a substitute for a HALT: a finding that must stop the work still stops the work; recording is for what the run survives.

### Report Template

```markdown
> [!CAUTION]
> **MAGIC-SPEC ENGINE BUG REPORT**
>
> **Symptom:** {Clear description of the error / crash / unexpected behavior}
> **Engine Version:** {Local version from .version}
> **Environment Context:** {Workflow, Workspace, OS, Node version}
> **File/Line:** {Path and line number inside the engine directory if applicable}
> **Reproduction / Context:**
> - Command executed: `{command}`
> - State / Action during failure: `{action}`
> **Hypothesis / Fix:** {Your technical explanation or suggested fix, if any}
```

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
