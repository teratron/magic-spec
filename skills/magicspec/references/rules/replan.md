# Rule Module: Post-Task Replan

Loaded on demand from `CONSTITUTION.md` (section 5). Paths are relative to the `magicspec` skill folder.

## 5. Post-Task Replan

After `/magicspec run` finishes a task or phase, drift signals may have surfaced new
gaps. The user-visible next step collapses to ONE command — `/magicspec plan`
(workspace propagated). Its Pre-Planning Stabilization auto-fixes mechanical
drift; Pre-flight HALTs once with a single `/magicspec spec` recommendation only
when specs need substantive design work. `/magicspec plan` names `/magicspec task`
itself once the plan stands; it does not start it. `/magicspec analyze` and `/magicspec spec` are
NEVER proactively offered after `/magicspec run`.

### Triggers (any one)

- **Spec ambiguity** — agent surfaced unclear / conflicting / missing spec content during execution
- **Phase complete with nothing to run next** — the finished phase leaves no `Todo` task behind it (a next phase that has one continues without a halt)
- **RULES drift** — `RULES.md` version > `TASKS.md` base detected mid-run
- **Header drift** — `STATUS_DRIFT` / `VERSION_DRIFT` reported by Pre-flight

### Procedure

1. Emit exactly one line:

   > [!NOTE]
   > Post-task drift detected. Run `/magicspec plan` to revalidate the plan.

2. Inside `/magicspec plan`, Pre-Planning Stabilization auto-fixes mechanical drift
   (promote `Draft → Stable`, normalize field names, move phantoms to Backlog).
   Pre-flight HALTs with one user-facing recommendation only on hard drift that
   needs human intent (header parity violations, missing L1 parents, structural
   conflicts):

   > Spec `{file}` requires design input: `{reason}`. Run `/magicspec spec`, then
   > re-run `/magicspec plan`.

3. Clean `/magicspec plan` completion → it names `/magicspec task` (decomposition), which names `/magicspec run`; each stage ends at its boundary and starts nothing.

### Hard rules for the agent

- NEVER recommend `/magicspec analyze` proactively after `/magicspec run` — it stays on-demand.
- NEVER recommend `/magicspec spec` proactively after `/magicspec run` — it surfaces ONLY inside `/magicspec plan` on a real HALT (or in the Stalled Plan report of `/magicspec task`).
- The user sees exactly ONE next step after a phase: `/magicspec plan` (on drift) or `/magicspec run` (clean).

### Chain

```
task Done
  → drift signal?
      yes → /magicspec plan
              → auto-fix? → yes → plan rewritten → /magicspec task → /magicspec run
                          → no  → HALT: /magicspec spec, then /magicspec plan
      no  → /magicspec run (next task)
```

### Exemptions

- Targeted task execution with no drift → `/magicspec run` next, no replan.
- Engine improvement tasks (explicit directive) — engine and spec layers are separate.
- `MAGIC_POST_TASK_REPLAN=0` env var disables this rule entirely.
