# Forward Gate: the 4.0 Document Set

The record of the run that gates the release of the 4.0 document set ([l1-sdd-document-set.md](../specifications/l1-sdd-document-set.md) C-3; [l2-sdd-document-set-engine.md](../specifications/l2-sdd-document-set-engine.md) §5.6 step 2). It is a run record, not a scenario file: it holds no scenario and no step line, and the scenario readers ignore it. The detail (prompts, inputs, every agent's report, the built code and the evaluation) is kept in the documentation lab's run folder, `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-25-state\`, not in this repository.

## The run

- **Date:** 2026-11-24. **Engine:** 3.0.164 (`check-docs`, `pack` and `templates/set/` of Phase 68; the lab's tools were not used).
- **Idea:** a command-line tool that reads a person's plain-text file of things to do regularly and prints, for a given date, those that are due, in file order, reporting every line it does not understand. A product the lab never documented.
- **Stack:** JavaScript on Node.js 24, CommonJS, the runtime's own test runner. The cross-stack reader knew only Go.
- **Agents:** eleven fresh subagents with clean contexts: a documenter (spec), a Go-only reader, a documenter (rewrite), a second Go-only reader, a documenter (stack), a planner, a task writer, and four builders, one per task. The orchestrator wrote none of the documents or code.
- **Criteria and verdict rule:** fixed before the run in the lab's `plan.md`; not changed afterwards.

## What came out

- A set of 82 addresses: product, three rules, three behaviour files (due, parse, cli: 24 requirements), three stack rules, four libraries, three binding files, one milestone and four tasks for it.
- A first milestone built from packs alone: three source files, four test files; 218 tests pass; every task's `Observe:` command exited 0 with no repair and no retry; the nine runs of the milestone's `Observed by` hold.
- Packs of 2,380, 5,087, 3,763 and 5,506 tokens against the budget of 10,000; the files they show as built grew to 24,134 tokens before the last task.

## Measured against the criteria

| Criterion | Holds |
| --- | --- |
| 1. Every documenting stage ends with the checker reporting nothing | no — spec, review and stack ended with three findings |
| 2. Three to five tasks, every pack within budget | yes |
| 3. Every task's own check passes after its builder, without repair | yes |
| 4. The milestone's `Observed by` holds | yes |
| 5. A second reader lists none of the first reader's leaks | no — the line-ending leak is listed again |
| 6. No loss attributed to the format; at most one behaviour-changing content item per task | no — three format findings; two tasks over the content bound |
| 7. A defect of a script or a template is repaired before the verdict | yes — none found |

**Verdict: FAIL.** The forward path works end to end, and the format is not ready for the release.

## The format findings

1. **A rule cannot be written before the plan.** A rule's `From` must resolve to a milestone, and milestones come in the plan stage, after the stage that writes rules. Three findings stayed open through three stages and vanished when the plan existed.
2. **A convention only the stack has has no place that reaches a pack.** The profile is not pulled and a stack rule must name the neutral rule it realizes; the task writer copied the facts into each task, against the one-fact-one-place invariant.
3. **The neutral writing table has no rows for text semantics.** Five classes of leak in two readings (case, digits, word boundaries, line endings, the validity of text, calendar rules); the table also is not yet carried by the engine.
4. Five minor guidance gaps in the templates: whether `Closes` may name requirement addresses, the form of an empty Backlog and of an absent `Needs`, the `Produces` of the last task, a test file two tasks extend, an exit status in a `Done when`.

Not format losses, for the workflows of Phase 70: a component split across two tasks needs an internal seam unit and the task stage must be allowed to add one; Done before this task should carry what a task changes, not whole earlier files.

## Decision

Phases 70 and 71 do not start. The concept needs three amendments (§5.3 rule `From`; stack-only rules and the pack; the neutral writing table), made through `/magicspec spec amend l1-sdd-document-set.md`, with the minor guidance in the templates; the gate is then run again on the same idea, from the stage that failed first.

## Run 2

The record of the second run, 2026-11-25, on the same idea, stack and criteria. Detail: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-26-state\`.

- **Engine:** 3.0.168. **Concept:** 1.1.0 (the agents' copy without the record of the first run; the requirements unchanged). **Agents:** ten fresh subagents (one model as in the first run): a documenter, two Go-only readers, a rewriting documenter, a stack documenter, a planner, a task writer and three builders.
- **What came out:** a set of 76 addresses with three milestones; the first milestone holds one component (dates and schedules), so the build is narrower than in the first run: three tasks, one source file, 103 tests, all pass, no retry and no repair; every task's check and the milestone's observation hold.
- **Checker:** no finding at the first check of any documenting stage; no repair round.

| Criterion | Holds |
| --- | --- |
| 1. Every documenting stage ends with the checker reporting nothing | yes |
| 2. Three to five tasks, every pack within budget | yes — 1,620, 1,884 and 2,549 tokens |
| 3. Every task's own check passes after its builder, without repair | yes |
| 4. The milestone's `Observed by` holds | yes |
| 5. A second reader lists none of the first reader's leaks | no — the rewrite of the argument rule named the mechanism it excludes, the same leak again (the other reading, a different leak on that unit, would hold) |
| 6. No loss attributed to the format; at most one behaviour-changing content item per task | no — twelve format items; behaviour-changing content items per task 0, 0, 0 |
| 7. A defect of a script or a template is repaired before the verdict | yes — none found |

**The first run's format findings:** the rule's `From` before the plan, the stack-only conventions, `Closes`, the empty backlog and absent `Needs`, `Produces` of the last task, the extended test file and the exit status did not recur; the neutral table closed every class of text semantics except the validity of text, which recurred on arguments and paths although a row covers them.

**The format findings of this run:** the containment of document addresses reaches no pack, so a task writer copied it into each task; a file a later task extends has a mark only for test files; a few forms and links are unstated (where a mark sits, other empty lists, bare names in `Defines`, Done before this task following `After` indirectly, a neutral rule listed beside its stack rule, how `Observed by` names the stack's observation, the optional-dependency comment of the product template); and the review has one rewrite although a rewrite can repeat the leak.

**Verdict: FAIL.** Steps 3 and 4 of the realization stay closed. The concept needs the six amendments the run's evaluation lists. For the owner of the gate: criterion 6 admits no format item of any size, and each run so far found new small ones; weighing items by their effect on the product would be a decision made before a run, not after it.
