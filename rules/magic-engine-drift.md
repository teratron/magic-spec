# Engine Drift Auto-Analyze Rule

When the SDD engine has been updated (any change in `.magic/.version`, including patch),
the project must be re-analyzed before continuing work to detect drift introduced by the
new engine semantics.

## Procedure

Run this check at the start of **every** `/magic.*` workflow invocation, except `/magic.analyze`
itself (avoid recursion).

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

## Granularity

Trigger on **any** version difference: `major`, `minor`, **and `patch`**. Patch releases in
this engine routinely carry behavior-affecting changes; do not skip them.

## Exemptions

- `/magic.analyze` — would recurse; the rule is bypassed when this is the entry workflow.
- Engine bootstrap when `.design/` does not yet exist — `init.md` runs first; the snapshot
  is written by the first `/magic.analyze` invocation.
- Offline / unreadable `.magic/.version` — skip silently, do not block work.

## Notes

- The snapshot is **only** updated by a successful `/magic.analyze` run. Manual edits to
  `.design/INDEX.md` should not touch this field.
- This rule is independent of [magic-version-check.md](magic-version-check.md), which
  compares the **local** engine against the **remote** GitHub release. This rule compares
  the **local** engine against the **last analyzed** state of the project.
