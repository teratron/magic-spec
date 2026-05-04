# Magic Spec — Agent Rules

Consolidated operational rules for AI agents working in a project that uses the
magic-spec engine. This file replaces the previous per-concern rule files
(`magic-version-check.md`, `magic-engine-drift.md`, `magic-graph.md`).

Sections are independent; an agent should apply each one according to its own trigger.

## 1. Engine Version Check (Local ↔ Remote)

When starting work in a project that uses magic-spec, verify the installed engine is
current with the upstream release.

### Procedure

1. Read local version from `.magic/.version`.
2. Fetch the remote version:
   `https://raw.githubusercontent.com/teratron/magic-spec/master/.magic/.version`
3. Compare. If `local < remote`, display:

   > [!TIP]
   > A newer magic-spec version is available.
   > Local: `{local_version}` | Latest: `{remote_version}`
   >
   > Download the latest release: <https://github.com/teratron/magic-spec/releases/latest>
   >
   > Manual update: replace `.magic/`, `workflows/`, `skills/`, `rules/` in your project
   > with the corresponding folders from the new release archive.

4. If versions match or the remote is unreachable, proceed silently.

### Frequency

Run once per day at the start of the first session in a project. Do not run this
check on every command invocation.

### Notes

- The remote fetch should time out gracefully (≤ 3 s) to avoid blocking offline work.
- Versions follow semantic versioning (`major.minor.patch`). A higher numeric value
  in any segment (left to right) means a newer release.

## 2. Engine Drift Auto-Analyze (Local ↔ Snapshot)

When the SDD engine has been updated (any change in `.magic/.version`, including patch),
the project must be re-analyzed before continuing work to detect drift introduced by
the new engine semantics.

This complements §1: §1 compares the **local** engine against the **remote** GitHub
release; §2 compares the **local** engine against the **last analyzed** state of the
project.

### Procedure

Run this check at the start of **every** `/magic.*` workflow invocation, except
`/magic.analyze` itself (avoid recursion).

1. Read `local_engine` from `.magic/.version`.
2. Read `snapshot_engine` from the `**Engine Version:**` field in `.design/INDEX.md`.
   - If the field is missing → treat snapshot as `unknown` and trigger analysis.
3. Compare:
   - `local_engine == snapshot_engine` → proceed silently.
   - `local_engine != snapshot_engine` (any segment differs) → **drift detected**.
4. On drift, emit this notice **before** running anything else:

   > [!WARNING]
   > SDD engine version changed: `{snapshot_engine}` → `{local_engine}`.
   > Running `/magic.analyze` first to revalidate the project against the new engine.
   > **Strongly recommended after any engine update** — even patch releases may carry
   > workflow-affecting changes.
   > Interrupt now (Ctrl+C / cancel) if you must skip, then resume the original command.

5. Auto-execute `/magic.analyze` (full scope, no arguments).
6. After analysis completes successfully, the analyze workflow updates the
   `**Engine Version:**` snapshot in `.design/INDEX.md` to `local_engine`.
7. Resume the originally requested workflow with its original arguments.

### Granularity

Trigger on **any** version difference: `major`, `minor`, **and `patch`**. Patch
releases in this engine routinely carry behavior-affecting changes; do not skip them.

### Exemptions

- `/magic.analyze` — would recurse; the rule is bypassed when this is the entry workflow.
- Engine bootstrap when `.design/` does not yet exist — `init.md` runs first; the
  snapshot is written by the first `/magic.analyze` invocation.
- Offline / unreadable `.magic/.version` — skip silently, do not block work.

### Notes

- The snapshot is **only** updated by a successful `/magic.analyze` run. Manual edits
  to `.design/INDEX.md` should not touch this field.

## 3. Specification Knowledge Graph

This project has a Specification Knowledge Graph managed by `magic.graph`.

### Auto-Use

- Before answering architecture, cross-module, or design questions, run
  `node .magic/scripts/executor.js build-spec-graph` and read its output for god
  nodes, community structure, and coverage stats.
- If `.design/wiki/index.md` exists, navigate it instead of reading raw spec files.
- For "how does X relate to Y" or "what covers Z" questions, prefer
  `node .magic/scripts/executor.js build-spec-graph --json` over grep — it traverses
  Implements links and canonical references.
- After modifying or creating files in `.design/` in this session, run
  `node .magic/scripts/executor.js export-wiki` to keep the graph current.

### On-Demand

- `/magic.graph` — full analysis: god nodes, orphaned files, missing Implements,
  community detection, advisory signal.
- `/magic.graph` + *"Visualize graph"* / *"Graph HTML"* — generates
  `.design/spec-graph.html` (interactive vis.js visualization).

### Completion Protocol (Mandatory Checklist)

Before finishing any task, the agent MUST verify the following:

- [ ] **Engine Version**: Verified local `.magic/.version` against remote release (once per day/first session).
- [ ] **Engine Drift**: Checked for drift and ran `/magic.analyze` if local engine version differed from `.design/INDEX.md` snapshot.
- [ ] **Graph**: verify the spec graph is current:
  - **Context**: ran `build-spec-graph` before answering architecture questions.
  - **Navigation**: used `wiki/index.md` (if exists) instead of raw spec files.
  - **Updated**: ran `export-wiki` if `.design/` files were modified.
