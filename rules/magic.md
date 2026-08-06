# Magic Spec — Agent Rules

Consolidated operational rules for AI agents in projects using the magic-spec engine.
Sections are independent — apply each by its own trigger.

> [!CAUTION]
> **Engine directories are READ-ONLY for all standard workflows.**
> Never write to `.magic/`, `workflows/`, `skills/`, or `rules/` unless the task
> explicitly states **"Engine Improvement"**. These directories form the distributed
> SDD engine — unauthorized changes corrupt it for every user of this project.
> If you are about to edit any file in these directories: **STOP** and ask the user
> to confirm the task is an engine improvement.

## 1. Engine Upgrade Detection (Local ↔ Snapshot)

Engine updates ship via the project's releases page on the remote Git host (e.g., GitHub, GitLab, etc.): the user
downloads the latest release archive and manually replaces the four engine
folders (`.magic/`, `workflows/`, `skills/`, `rules/`). `.magic/.version` then changes locally while
the `**Engine Version:**` snapshot in `.design/INDEX.md` still points at the
previously analyzed value. This section detects that delta and offers to
re-validate the project. No network calls — purely local comparison.

### Procedure

Runs at the start of **every** `/magic.*` invocation except `/magic.analyze`
(would recurse) and `/magic.status` (read-only briefing — reports drift as an
informational line instead of prompting). Trigger on **any** segment
difference — `major`, `minor`, **and `patch`**; patch releases routinely
carry behavior-affecting changes.

1. Read `local_engine` from `.magic/.version`.
2. Read `snapshot_engine` from the `**Engine Version:**` field in `.design/INDEX.md`.
   Missing file (fresh project) or missing field → treat as `unknown`.
3. If `local_engine == snapshot_engine` → proceed silently.
4. On mismatch (including `unknown`), narrate **one informational line** and **proceed** —
   never a `[y/n]` prompt or option menu. This is a drift-revalidation offer governed by
   DA-8/DA-9 of the Autonomous Decision Protocol (one recommended path, no menu); it mirrors
   the read-only treatment `/magic.status` already uses (SC-4):

   > [!NOTE]
   > SDD engine drift: `{snapshot_engine}` → `{local_engine}`. Recommend `/magic.analyze`
   > to revalidate against the new engine — even patch releases may carry
   > workflow-affecting changes. Proceeding with the requested workflow.
   > (Override: run `/magic.analyze`.)

5. **Proceed** with the originally requested workflow and its original arguments. Do **not**
   block, and do **not** auto-divert into `/magic.analyze` — the user runs it when ready.

6. **Snapshot contract**: the `**Engine Version:**` field updates **only** when
   `/magic.analyze` runs (the sole writer; manual edits must not touch it). Until then the
   drift line re-narrates each session — that recurrence is by design (a standing
   recommendation), not a prompt.

### Exemptions

- `/magic.analyze` itself (would recurse).
- `/magic.status` — read-only briefing; renders drift as an informational engine line, never a prompt.
- Missing or unreadable `.magic/.version` → skip silently, do not block work.
- `MAGIC_DRIFT_CHECK=0` env var disables this rule entirely.

## 2. Specification Knowledge Graph

The Specification Knowledge Graph is managed by `magic.graph`.

### Auto-Use

- Before architectural / cross-module / "how does X relate to Y" / "what covers Z"
  questions, run `node .magic/scripts/executor.js build-spec-graph` (add `--json`
  for structured traversal). Read its god nodes, communities, coverage stats.
- If `.design/wiki/index.md` exists, navigate it instead of raw spec files.
- After creating or modifying any file in `.design/` during this session, run
  `node .magic/scripts/executor.js export-wiki` to refresh the graph.

### On-Demand

- `/magic.graph` — full analysis: god nodes, orphans, missing Implements,
  community detection, advisory signal.
- `/magic.graph` + *"Visualize graph"* / *"Graph HTML"* → renders
  `.design/spec-graph.html` (interactive vis.js).

## 3. Finalization Protocol (Post-Workflow)

After `/magic.spec`, `/magic.task`, `/magic.run`, or `/magic.rule` complete their
main steps and **before** their Completion Checklist, run finalize. Skip for
`/magic.analyze`, `/magic.graph`, `/magic.dev.*` (read-only / system workflows).

### Procedure

1. Execute:

   ```bash
   node .magic/scripts/executor.js finalize --workflow=<spec|task|run|rule>
   ```

2. The script detects significant changes to whitelisted artifacts. On hit, it
   bumps `.design/.version`, appends a Keep-a-Changelog entry to root `CHANGELOG.md`,
   and prints a Conventional Commits message. On no hit, prints
   `⏭️ No significant changes detected` and exits 0.

3. **Display the entire script stdout verbatim** to the user in a fenced block.

4. **HARD RULE**: The agent MUST NOT call `git commit`, `git add`, or any write-side
   git operation. The commit is always the user's decision.

5. If the script exits non-zero → emit a WARNING but do not block the Completion Checklist.

### Opt-Out

`MAGIC_FINALIZE=0` (env, highest precedence) · `finalization.enabled = false` in
`.design/workspace.json` (project-wide) · `--dry-run` (preview) · `--no-bump`,
`--no-changelog`, `--no-commit-msg` (per-step disable).

### Significance Whitelist

| Workflow | Paths that count |
| --- | --- |
| `magic.spec` | `.design/{ws}/specifications/**/*.md`, `.design/{ws}/INDEX.md` |
| `magic.task` | `.design/{ws}/PLAN.md`, `TASKS.md`, `tasks/**/*.md` |
| `magic.run` | `.design/{ws}/TASKS.md` (status-line changes only), `STATE.md`, `archives/**`, `tasks/**/*.md` |
| `magic.rule` | `.design/RULES.md`, `.design/{ws}/RULES.md` |

### Channels

`.design/{ws}/CHANGELOG.md` is `magic.run`'s internal phase journal (not touched
here). Root `CHANGELOG.md` is user-facing release notes — written by this protocol.

## 4. Phase Archival Automation

Completed phase files are auto-archived as part of `magic.run`'s finalize, to keep
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
- Project-wide disable: `archival.enabled = false` in `.design/workspace.json`.

### On-demand

```bash
node .magic/scripts/executor.js archive-phases            # archive all eligible
node .magic/scripts/executor.js archive-phases --dry-run  # preview only
```

The pre-commit hook issues a non-blocking notice if unarchived Done phases are
detected — reminds the user to run `/magic.run` or `archive-phases` directly.

## 5. Post-Task Replan

After `/magic.run` finishes a task or phase, drift signals may have surfaced new
gaps. The user-visible next step collapses to ONE command — `/magic.task`
(workspace propagated). Its Pre-Planning Stabilization auto-fixes mechanical
drift; Pre-flight HALTs once with a single `/magic.spec` recommendation only
when specs need substantive design work. `/magic.analyze` and `/magic.spec` are
NEVER proactively offered after `/magic.run`.

### Triggers (any one)

- **Spec ambiguity** — agent surfaced unclear / conflicting / missing spec content during execution
- **Phase complete** — full phase finished (new scope or edge cases may have emerged)
- **RULES drift** — `RULES.md` version > `TASKS.md` base detected mid-run
- **Header drift** — `STATUS_DRIFT` / `VERSION_DRIFT` reported by Pre-flight

### Procedure

1. Emit exactly one line:

   > [!NOTE]
   > Post-task drift detected. Run `/magic.task` to revalidate the plan.

2. Inside `/magic.task`, Pre-Planning Stabilization auto-fixes mechanical drift
   (promote `Draft → Stable`, normalize field names, move phantoms to Backlog).
   Pre-flight HALTs with one user-facing recommendation only on hard drift that
   needs human intent (header parity violations, missing L1 parents, structural
   conflicts):

   > Spec `{file}` requires design input: `{reason}`. Run `/magic.spec`, then
   > re-run `/magic.task`.

3. Clean `/magic.task` completion → handoff to `/magic.run`.

### Hard rules for the agent

- NEVER recommend `/magic.analyze` proactively after `/magic.run` — it stays on-demand.
- NEVER recommend `/magic.spec` proactively after `/magic.run` — it surfaces ONLY inside `/magic.task` on a real HALT.
- The user sees exactly ONE next step after a phase: `/magic.task` (on drift) or `/magic.run` (clean).

### Chain

```
task Done
  → drift signal?
      yes → /magic.task
              → auto-fix? → yes → replan → /magic.run
                          → no  → HALT: /magic.spec, then /magic.task
      no  → /magic.run (next task)
```

### Exemptions

- Targeted task execution with no drift → `/magic.run` next, no replan.
- Engine improvement tasks (explicit directive) — engine and spec layers are separate.
- `MAGIC_POST_TASK_REPLAN=0` env var disables this rule entirely.

## 6. SDD Reference Containment (Code ↔ SDD Boundary)

Products built with this engine may ship releases that exclude `.design/`. Any
reference to SDD artifacts inside product files becomes dead content in such a
release. Traceability is one-way: SDD artifacts reference code; code never
references SDD artifacts.

### Rule

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
- Any `.design/…` path.

Prose `Phase {n}` is the one class that needs judgment: many domains own the
word (handshake phases, build phases, moon phases). Disambiguate by the
self-containment test — if the sentence stops making sense once `.design/` is
absent, it denotes the plan's phase and is a leak; if it reads fine, it is
domain vocabulary and is not. Every other class above is unconditional.

If design rationale matters at a code site, restate it in plain language.
Provenance ("which task produced this") lives in the SDD layer (task `Changes`
fields, phase files) and git metadata (commit messages, PR descriptions) —
both legitimate channels.

### Example

```plaintext
BAD : // Implements T-2B03 (see .design/engine/tasks/phase-2.md)
GOOD: // Reject zero-length payloads: the upstream queue treats them as poison messages.
GOOD: (commit message) feat(parser): add payload guard [T-2B03]
```

### Exemptions

- The `.design/` subtree itself and engine directories (`.magic/`, `workflows/`,
  `skills/`, `rules/`) — engine-internal cross-references are by design.
- Git metadata — not part of release artifacts.
- Contributor-facing process docs that document the SDD workflow itself
  (there the reference IS the content).

### Enforcement

- **Write time** — the Coder role refuses to introduce violations.
- **Review time** — the Code-reviewer role FAILs any diff adding an SDD reference.
- **Audit time** — `/magic.analyze` ventilation reports
  `SDD_REFERENCE_LEAK {file}:{line}` findings (advisory; product files are
  never auto-edited).
- **Remediation time** — detection and repair are separate duties, and audit
  owns only the first. Ventilation is read-only by contract, so a leak it finds
  is cleaned by scheduling it: the finding carries the path
  `→ /magic.task {ws}` to plan a containment-cleanup task, which `/magic.run`
  then executes under the Coder role — the same role that owns the write-time
  gate. Never treat a `SDD_REFERENCE_LEAK` report as self-resolving, and never
  edit product files from a workflow whose write scope is `.design/`.

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
- Questions are reserved for the closed escalation whitelist (destructive
  actions, external release artifacts, hard-fork ambiguity, constitutional
  amendments, workspace-routing ambiguity). One question, at most three fixed
  options, recommended default marked.

### Exemptions

- Objective integrity HALTs (checksums, drift, parity) — not elective forks;
  each states exactly one recommended resolution path.
- `MAGIC_DECISION_AUTONOMY=0` env var disables the session posture (workflow-
  internal C27 behavior is unaffected).

## 8. Completion Protocol (Mandatory Checklist)

Before finishing any task that involved magic-spec workflows, verify §1–§9 were honored.

- [ ] **§1 Upgrade Detection** — compared `.magic/.version` to `**Engine Version:**`
      in `.design/INDEX.md` before any `/magic.*` (except `/magic.analyze`); on
      mismatch (or `unknown` snapshot) narrated exactly one informational drift line
      and proceeded — never prompted `[y/n]`, never auto-diverted into `/magic.analyze`.
- [ ] **§2 Spec Graph** — ran `build-spec-graph` before architectural questions;
      navigated `.design/wiki/index.md` (if present) instead of raw spec files;
      ran `export-wiki` after any `.design/` change this session.
- [ ] **§3 Finalization** — after `/magic.spec|task|run|rule`, ran
      `node .magic/scripts/executor.js finalize --workflow=<...>` and displayed its stdout **verbatim**;
      did **not** invoke any write-side `git` operation (`add`, `commit`, etc.).
- [ ] **§4 Phase Archival** — for `/magic.run`, confirmed `finalize` archived every
      phase with `status: Done` and no remaining `- [ ]`, and `TASKS.md` link
      references were rewritten to `archives/tasks/phase-{N}.md (Done (Archived))`.
- [ ] **§5 Post-Task Replan** — on any drift signal during `/magic.run`, the
      user-visible next step was exactly ONE command: `/magic.task` (with
      workspace context). NEVER proactively offered `/magic.spec` or
      `/magic.analyze` as a separate user-visible step — `/magic.spec` surfaces
      only inside `/magic.task` on a real HALT.
- [ ] **§6 Reference Containment** — no SDD-artifact references (task IDs,
      phase designators, `PLAN.md`/`TASKS.md`/`INDEX.md`/`RULES.md`, spec file
      names, `.design/` paths) were written into product files; rationale
      restated in plain language where needed.
- [ ] **§7 Decision Autonomy** — elective forks resolved as `[DR]` one-liners
      (never questions); the post-workflow next step was computed and narrated
      per DA-6; questions appeared only at whitelist gates, single-question,
      ≤3 fixed options.
- [ ] **§9 Bug Reporting** — if any engine-level bug, unexpected behavior, or crash was
      encountered in the engine files (`.magic/`, `workflows/`, `skills/`, `rules/`),
      did NOT attempt to self-repair the engine; generated a formatted
      `MAGIC-SPEC ENGINE BUG REPORT` block for the user to submit.

## 9. Bug Reporting Protocol (Engine Feedback)

Engine directories (`.magic/`, `workflows/`, `skills/`, `rules/`) are strictly read-only for standard workflows. If you find a bug, logic mismatch, or experience a crash in any engine script or layout, do NOT attempt to edit or fix it yourself. Instead, formulate a structured report so the user can easily submit it.

### Trigger

Any engine-level script error, template mismatch, run-time crash, or logic bug detected in `.magic/`, `workflows/`, `skills/`, or `rules/`.

### Action

Output a dedicated, highly visible Markdown alert block for the user. Do not proceed to execute the task if the engine bug blocks correctness.

### Report Template

```markdown
> [!CAUTION]
> **MAGIC-SPEC ENGINE BUG REPORT**
>
> **Symptom:** {Clear description of the error / crash / unexpected behavior}
> **Engine Version:** {Local version from .magic/.version}
> **Environment Context:** {Workflow, Workspace, OS, Node version}
> **File/Line:** {Path and line number inside the engine directory if applicable}
> **Reproduction / Context:**
> - Command executed: `{command}`
> - State / Action during failure: `{action}`
> **Hypothesis / Fix:** {Your technical explanation or suggested fix, if any}
```
