# SDD Document Set — Engine Realization (4.0)

**Version:** 1.1.2
**Status:** Stable
**Layer:** implementation
**Implements:** l1-sdd-document-set.md

## Overview

How this engine realizes the 4.0 document set: the tree of a workspace under `.magicspec/`, the scripts that check a set, compute a pack and record a build, the templates, what each workflow writes and reads, the migration of a 3.x workspace, and the order of delivery under the forward gate. The release that ships it is the major version 4.0.0 of the skill folder.

## Related Specifications

- [l1-sdd-document-set.md](l1-sdd-document-set.md) - The concept this realizes.
- [l1-engine-core.md](l1-engine-core.md) - The workflows and invariants that carry over; its workspace architecture is superseded on deployment.
- [l2-engine-automation.md](l2-engine-automation.md) - The executor and its subcommands, which gain the scripts of §5.2.
- [l2-engine-templates.md](l2-engine-templates.md) - The template inventory, replaced by §5.3.
- [l2-engine-finalization.md](l2-engine-finalization.md) - Finalization, whose state update and archival move to the memory files and the change log.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Containment of the new address forms.
- [l2-test-suite.md](l2-test-suite.md) - The harness, which gains the checker's fixtures and the forward-run record.

## 1. Motivation

The concept fixes the format; the engine has to write it, check it, read it and move existing projects onto it. The engine's present strengths — the router and one-stage pipeline, the input pass and intake survey, decision records and consequence forecasts, containment, finalization, the role gates, the graph, the diagnostics and feedback channel — carry over unchanged in what they decide; what changes is the files they write and read.

## 2. Constraints & Assumptions

- **Layer boundary.** The checker, the pack builder and the build recorder run in user projects, so they live in the skill folder's `scripts/` and require nothing from the maintenance folders; their fixtures and regression tests live in `tests/`.
- **C14.** Every change inside the skill folder runs `update-engine-meta`; the major bump to 4.0.0 is made once, by the release that ships the new tree as the default.
- **Both layouts during 4.x** (the forecast assumption of the concept, §2): a workspace whose `workspace.json` entry carries `"format": "4"` is read in the new layout; any other workspace is read as 3.x until migrated.
- **The lab's evidence is not shipped.** Only the format, its checks and their fixtures move into the engine; the runs and audits stay in the lab.
- **Assumption (forecast):** one stack per workspace in the first release, `stack/{stack}/` with a single entry; a second stack under the same neutral layer is the reuse path and comes later. Runner-up: several stacks from the start. Override: /magicspec spec amend l2-sdd-document-set-engine.md "several stacks per workspace in 4.0".
- **Assumption (forecast):** this engine's own workspace (`.magicspec/engine/`) migrates last, after the forward gate and after one consumer project has migrated, so the engine is never built from a format it has not yet proven. Runner-up: the engine workspace migrates first as the proving ground. Override: /magicspec spec amend l2-sdd-document-set-engine.md "migrate the engine workspace first".

## 3. Core Invariants (Layer 1 only)

Not applicable; see the concept's invariants I1 to I13.

## 4. Invariant Compliance (Layer 2 only)

| L1 Invariant | Implementation |
| --- | --- |
| I1 Computed pack | `run` hands a builder the output of `pack {task}` and nothing else; `pack` follows the order of concept §5.6 |
| I2 One address | the checker reports duplicate and unresolved addresses and names defined twice in a stack |
| I3 Pins behaviour only | `spec-critic` gains the lens "a sentence that pins a name or layout that changes no behaviour"; the change rules forbid pinning such names |
| I4 Decisions once | `run` writes `memory/decisions.md` at the moment of a build decision; `analyze` reports decisions whose `Moves to` is still open after the milestone |
| I5 Budget | the checker reports a pack over 10,000 tokens; `task` splits the task |
| I6 Exact seams | the checker reports produced names used before they are produced and consumed names without their defining unit |
| I7 Observable checks | the checker reports a task without `Done when … Observe:` and a milestone without `Observed by` |
| I8 Built code | `run` updates `memory/map.md` from Creates when a task is done (`mark-built`) |
| I9 Two layers | the checker reports neutral text that references a stack unit or uses the stack vocabulary; the neutral writing table ships as `templates/set/neutral-writing.md` (§5.3); `spec` runs the cross-stack review on a neutral layer before its first milestone, the table in the reviewer's hands |
| I10 Priority | the checker reports dependencies on lower priority and components traced at a lower priority than the work that requires them; `run` takes the ready task of highest priority |
| I11 Owners | the checker reports components and assets that no milestone closes and checkers named by rules that no milestone builds |
| I12 Recorded changes | `spec` on an existing set writes a change before touching any unit; `mark-built` records revisions; the checker reports stale units no task builds |
| I13 Containment | the containment rule's classes are the addresses of concept §5.2 and the set's paths; the existing scan points run unchanged |

## 5. Detailed Design

### 5.1 The workspace tree

```plaintext
.magicspec/
├── workspace.json           # workspaces, each with "format": "4" once migrated
├── INDEX.md                 # global aggregate: one row per workspace, engine snapshot
└── {workspace}/
    ├── product.md  rules.md  plan.md  changes.md
    ├── spec/{key}.md
    ├── stack/{stack}/profile.md  rules.md  deps.md
    ├── stack/{stack}/bind/{key}.md
    ├── stack/{stack}/tasks/M{n}.md
    ├── memory/state.md  decisions.md  map.md
    └── archives/            # retrospectives and simulation reports, as in 3.x
```

| 3.x | 4.0 |
| --- | --- |
| `RULES.md` (global and per workspace) | `rules.md` of the workspace; the global constitution stays at `.magicspec/RULES.md` for conventions across workspaces |
| `{ws}/INDEX.md` registry with status per specification | the set itself; the checker's report replaces the registry's health columns |
| `specifications/l1-*.md` | `spec/{key}.md` (behaviour) and `product.md` (purpose, scope, decisions, needs) |
| `specifications/l2-*.md` | `stack/{stack}/bind/{key}.md`, `profile.md`, `deps.md` |
| `PLAN.md` phases | `plan.md` milestones |
| `TASKS.md`, `tasks/phase-{n}.md` | `stack/{stack}/tasks/M{n}.md` |
| `STATE.md` | `memory/state.md` |
| Document History, amendment versions | `changes.md` and unit revisions |

### 5.2 Scripts

New executor subcommands, in `scripts/`:

- `check-docs [--workspace] [--budget N]` — the checker of concept §5.9; one finding per line on stdout and a summary line on stderr; exit 1 on findings. On a workspace that is not in the 4.0 format it prints one line and exits 0 (a 3.x workspace is not an error). A rule with no `From` line is no finding while `plan.md` defines no milestone, and one finding per rule once it defines one (concept §5.3: the plan stage writes `From`); a stack rule with `Realizes: —` is a convention only the stack has and needs no neutral rule. `[MODIFIED]`
- `pack {task} [--workspace] [--include {file}]` — the pack of concept §5.6, written to `.magicspec/.cache/packs/{workspace}/{task}.md` (one folder per workspace, so two workspaces that use the same task address do not collide), a rebuildable cache that `clean-cache` removes; prints its size against the budget and says so when the computed units exceed it, because the checker, not the pack, is the gate. **Done before this task** is read from the project: the files named in the `Creates` of the tasks the task is After, directly or not, and, for a task of a milestone that revises or extends the component it builds, that component's interface files from its row of `memory/map.md`; `--include` adds a file as built, and a file that is not inside the project is refused. On a workspace that is not in the 4.0 format it prints one line and exits 0.
- `mark-built {milestone} [--workspace]` — records a done milestone: map entries from Creates, revisions in Provides, changes to `built`, `Was` lines removed.
- `check-log` — the order of change statuses in the history of `changes.md` (open before placed before built).

Existing subcommands adapt: `check-prerequisites` on a 4.0 workspace reports the checker's findings in place of the registry findings (`SPEC_STATUS`, `ORPHANED_SPEC`, `SYNC_GAP`, header parity), which have no registry to read; `resume-state` reads `memory/state.md`; `finalize` updates `memory/state.md`, and `changes.md` is written by the workflows only, never by `finalize`; `build-spec-graph` and `export-wiki` take units and addresses as nodes; `memory-query` indexes units by address; `analyze-coverage` measures requirements with an Accept that a task observes; `archive-phases` is retired for 4.0 workspaces (done milestones stay in `plan.md`, done task files stay as written).

### 5.3 Templates

New templates in `skills/magicspec/templates/set/` (the 3.x templates stay in `templates/`, and five of the names are theirs): `product.md`, `rules.md`, `plan.md` (milestone block), `spec.md` (component behaviour), `profile.md`, `stack-rules.md`, `deps.md`, `bind.md`, `tasks.md` (milestone tasks), `state.md`, `decisions.md`, `map.md`, `changes.md`; each holds the field lines of the concept verbatim and no example content. The 3.x templates stay for 3.x workspaces until the line ends.

`[ADDED]` Beside them, `neutral-writing.md` holds the neutral writing table of concept §5.3 word for word, with the review sentence that follows it: guidance for whoever writes or reviews a neutral layer, no field lines, the one file of the folder that is not a template of a document. The templates carry the guidance lines of concept 1.1.0 in their comments and field lines: `rules.md` — `From` is added by the plan stage, and a rule written before the plan has none; `stack-rules.md` — `Realizes: {R addresses, or — for a convention only this stack has}`, such a rule listed in the Context of the tasks it governs; `profile.md` — the profile reaches no pack, so a convention a builder must follow is a stack rule; `plan.md` — `Closes: {component keys}`, `Needs: —` for none, a backlog with nothing waiting as `- none`; `tasks.md` — `Produces: —` for work no later task of the milestone uses, a test file a later task extends named as `{file} (extends M{n}.T{k})`, the exit status in the expected result of a command.

### 5.4 Workflows

| Command | On a 4.0 workspace |
| --- | --- |
| `spec` | **First version from an idea:** the input pass, the intake survey (E6) and the forecast as in 3.x, then `product.md`, `rules.md` and `spec/{key}.md`; the cross-stack review of the neutral layer; the stack layer when the stack is known. **An input after the first version:** the three steps of concept §5.8, the checker after every step. `amend` becomes a change. |
| `plan` | milestones from components, scope items and priorities; Needs justified; a change's milestone appended; the checker |
| `task` | the task file of the next milestone; each task's pack computed and within budget; a task whose pack holds an open unit is reported not ready |
| `run` | the next ready task of highest priority; the builder receives the pack; Done when observed; `memory/state.md`, `decisions.md` and, at a milestone's end, `mark-built` |
| `fix` | a reported defect becomes a change of kind `fix`: the code did not do what the units say, or the units were silent; the repair is its milestone and the regression check its Observe. A report the units and the code already answer is recorded `satisfied` and repairs nothing |
| `simulate` | scenarios from scope items and Accept lines; findings handed to `fix` |
| `goal` | unchanged in what it decides; its steps are the commands above, and its phase arguments name milestones (`goal M3`, `goal M3..M5`) |
| `analyze` | a 4.0 audit runs the checker and compares the map with the code; the reverse mode writes a set from existing code, the method the lab used |
| `migrate` | 3.x → 4.0 (§5.5) |
| `rule`, `status`, `graph`, `sync`, `help` | read and write the 4.0 files where they read and wrote the 3.x ones |

The roles keep their cards; `spec-critic` reviews units and changes, `planner` milestones and tasks, `coder` builds from a pack.

### 5.5 Migration

`/magicspec migrate --to 4` on a 3.x workspace: a dry run lists the mapping of every file (§5.1) and every specification whose content does not split into units without judgement; one consent question; the apply step writes the new tree beside the old and runs the checker. When it reports nothing, the step sets `"format": "4"` and moves the 3.x files to `archives/3x/`; when a finding remains that the step cannot close, it leaves the workspace on 3.x with both trees in place and prints the findings, and a second run resumes from the written tree. The split of an existing specification into product items, requirements and binding units is done by the `analyze` reverse mode against the code, not by text transformation; a requirement that has no Accept check becomes an `Open:` line.

### 5.6 Order of delivery

1. **The format and the checker** (`check-docs`, `pack`, the templates, the fixtures in `tests/`), behind `"format": "4"`.
2. **The forward gate** (concept C-3): a run, recorded under `.magicspec/engine/simulations/`, in which a clean-context agent with only a product idea writes a set by the concept's rules and the templates of step 1 until `check-docs` reports nothing, clean-context builders build every task of the first milestone from `pack` output alone, and the milestone's `Observed by` holds on what they built. The run uses the format and its scripts, not the workflows, which are rewritten only in step 3: what it measures is the format on the forward path. A failure revises the concept and step 1 before anything else is built. **Run 1 (2026-11-24) failed** (record `.magicspec/engine/simulations/forward-gate.md`: a rule's `From` before the plan, a stack-only convention and the pack, the neutral writing table's rows for text); the amendments are made in the concept's 1.1.0 and in this specification's 1.1.0. `[MODIFIED]` Step 1 is brought to them first — the templates, the checker's `From` finding and `neutral-writing.md`, each case written with the code it pins (built 2026-11-25); three of the four fixture sets of step 1 (`good`, `bad`, `bad4`) hold rules without `From` beside a plan that defines milestones, so `good` gains the line to stay clean and the recorded findings of `bad` and `bad4` gain one finding per such rule — and then run 2 repeats the gate on the same idea and the same criteria, every stage from the spec stage on, because the spec stage is the first that failed; steps 3 and 4 begin only after it passes. **Run 2 (2026-11-25) failed** (record section Run 2: criteria 5 and 6 — the cross-stack leak repeated by its rewrite, and format gaps, one of them containment reaching no pack): steps 3 and 4 do not begin.
3. **The pipeline:** `spec`, `plan`, `task`, `run` on 4.0 workspaces, with `mark-built`.
4. **The rest of the commands, the migration and the release 4.0.0;** then one consumer project migrates, then this engine's own workspace.

## 6. Implementation Notes

1. Step 1 is a prerequisite for all others; step 2 gates steps 3 and 4.
2. **Supersession, declared**, as listed in the concept §6; each superseded specification is amended in the step that replaces its mechanic: [l2-engine-templates.md](l2-engine-templates.md) in step 1, [l1-plan-command.md](l1-plan-command.md), [l2-engine-finalization.md](l2-engine-finalization.md) and [l1-session-continuity.md](l1-session-continuity.md) in step 3, [l1-engine-core.md](l1-engine-core.md) and [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) in step 4. [l2-engine-templates.md](l2-engine-templates.md) was amended again when `neutral-writing.md` shipped beside the thirteen templates of `templates/set/` (step 1, after run 1).
3. **For step 3, from run 1** `[ADDED]` (observations the run made that are not losses of the format, kept so that the workflows are written with them): a component split across two tasks needs an internal binding unit for the seam between them, and the `task` stage may add one; Done before this task grew with whole earlier files (about 24,000 tokens before the last task of run 1, while the computed units stayed within 5,500). <!-- TBD: whether Done before this task carries whole files or only the parts a task changes is a question for concept §5.6, settled before step 3 is built; run 2 keeps whole files so that it measures the same pack as run 1. -->

## 7. Drawbacks & Alternatives

- **Two layouts during 4.x** cost a branch in every reader; the alternative, a forced migration on upgrade, risks every project at once on an unmeasured forward path.
- **Migration by reverse analysis** is slower than a mechanical conversion, but a 3.x specification mixes product, behaviour and binding in one file and a mechanical split would carry that mix into the new units.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CONCEPT]` | `.magicspec/engine/specifications/l1-sdd-document-set.md` | The format this realizes |
| `[EXECUTOR]` | `skills/magicspec/scripts/executor.js` | Where the new subcommands register |
| `[TEMPLATES]` | `skills/magicspec/templates/` | Where the new templates go |
| `[LAB-CHECKER]` | `../sdd-lab/tools/check-docs.js` | The checker to port, with `tools/fixtures/` and `tools/test-tools.js` |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.1.2 | 2026-11-25 | Agent | Recorded run 2 of the forward gate (Phase 74), Stable retained, no requirement changed: step 2 of the order of delivery states that run 2 failed and that steps 3 and 4 do not begin. |
| 1.1.1 | 2026-11-25 | Agent | As built in Phase 73, Stable retained, no requirement changed: step 1 follows the amendments — `templates/set/neutral-writing.md`, the guidance lines in five templates (`bind.md` needs none), `check-docs` reporting a rule without `From` once per rule address when the plan defines a milestone, and the fixtures with it. Run 2 is next. |
| 1.1.0 | 2026-11-25 | Agent | **Realizing the amendments of the forward gate** (concept 1.1.0, findings F1 to F8 of run 1). §4 I9 and §5.3: the neutral writing table ships as `templates/set/neutral-writing.md`, and the templates carry the concept's new guidance lines (`From` by the plan stage, `Realizes: —`, the profile reaching no pack, `Closes` keys only, `Needs: —`, the empty backlog, `Produces: —`, the extended test file, the exit status). §5.2: `check-docs` reports a rule without `From` once the plan defines a milestone. §5.6 step 2: step 1 is brought to the amendments, then run 2 repeats the gate from the spec stage on the same idea and criteria. §6 item 2: `l2-engine-templates.md` amended when the table ships; the fixtures `good`, `bad` and `bad4` follow the new finding (coherence check: their rules have no `From` beside milestones); item 3: the two observations of run 1 for step 3 (a seam unit added by the task stage, the size of Done before this task). Amendment Rule round trip: RFC, Post-Update Review with the concept, Stable. |
| 1.0.3 | 2026-11-24 | Agent | Recorded the first forward run (Phase 69), Stable retained, no requirement changed: step 2 of the order of delivery states that run 1 failed, names the record, and that the amendments and a second run come before steps 3 and 4. |
| 1.0.2 | 2026-11-24 | Agent | As built in Phase 68, Stable retained, no requirement changed: `check-docs` takes `--budget` and ends a non-4.0 workspace with one line; `pack` writes under `.cache/packs/{workspace}/`, reads Done before this task from the files the earlier tasks create and from the component's map row, and reports a pack over the budget; the thirteen templates are in `templates/set/`. |
| 1.0.0 | 2026-11-24 | Agent | Initial realization plan of the 4.0 document set |
| 1.0.1 | 2026-11-24 | Agent | Stabilized with its concept: the forward gate runs on the format and its scripts, before the workflows are rewritten (plan check); a migration that cannot close a finding leaves the workspace on 3.x; `check-prerequisites` and the goal arguments on a 4.0 workspace |
