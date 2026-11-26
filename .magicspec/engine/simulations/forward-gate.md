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

## Run 3

The record of the third run, 2026-11-25, on the same idea, stack and criteria. Detail: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-27-state\`.

- **Engine:** 3.0.172. **Concept:** 1.2.0 (the agents' copy without the record of earlier runs). **Agents:** ten fresh subagents on one model, as before: a documenter, two Go-only readers, a rewriting documenter, a stack documenter, a planner, a task writer and three builders.
- **What came out:** a set of 71 addresses with four milestones of one component each; the first milestone holds the calendar alone, narrower again than in the second run: three tasks, one source file, 15 tests, all pass, no retry and no repair; every task's check and the milestone's observation hold; the built files hold no address or path of the documents.
- **Checker:** no finding at the first check of any documenting stage.

| Criterion | Holds |
| --- | --- |
| 1. Every documenting stage ends with the checker reporting nothing | yes |
| 2. Three to five tasks, every pack within budget | yes — 915, 915 and 1,183 tokens |
| 3. Every task's own check passes after its builder, without repair | yes |
| 4. The milestone's `Observed by` holds | yes |
| 5. A second reader lists none of the first reader's leaks | yes — the second reading lists nothing (the review ended after one rewrite) |
| 6. No loss attributed to the format; at most one behaviour-changing content item per task | no — nine format items; behaviour-changing content items per task 0, 0, 0 |
| 7. A defect of a script or a template is repaired before the verdict | yes — none found |

**Earlier findings:** none of the first run's eight or the second run's twelve recurred in its stated form.

**The format findings of this run:** the stack's manifest has no owner (reported by three agents); a task that builds part of a binding unit has no address for the part; the runtime version reaches no builder; and six smaller forms or links are unstated (the empty `Realizes`, mixed visibility, whether a binding's interface section is in the pack, vocabulary matching, transitive `Needs`, runtime capabilities as external needs). None changed what was built.

**Verdict: FAIL.** Steps 3 and 4 of the realization stay closed. The concept needs the seven amendments the run's evaluation lists. For the owner of the gate: criterion 6 as written has failed all three runs (8, 12 and 9 format items), each time on new small ones; a criterion that counts only format items changing the product's behaviour or what is written into it would be a decision made before a run.

## Run 4

The record of the fourth run, 2026-11-25, on the same idea and stack; the criteria are those of the first three runs except the sixth, whose measure the owner of the gate decided before the run. Detail: `D:\Projects\src\github.com\teratron\sdd-lab\runs\run-28-state\`.

- **Engine:** 3.0.174. **Concept:** 1.3.0 (the agents' copy without the record of earlier runs). **Agents:** fourteen fresh subagents on one model, as before: a documenter, three Go-only readers and two rewriting documenters, a stack documenter, a planner, a task writer and five builders.
- **What came out:** a set of 71 addresses with one milestone, the whole product, observed by running it; five tasks, eleven built files, 147 tests (146 pass, one skipped on this machine's system), no retry and no repair; both uses of the milestone's observation hold, as do 70 own checks of the behaviour requirements; the built files hold no address or path of the documents.
- **Checker:** one finding at the first check of the spec stage (a byte value written as data read as a change address), none at any other stage.

| Criterion | Holds |
| --- | --- |
| 1. Every documenting stage ends with the checker reporting nothing | yes — one repair round, in the spec stage |
| 2. Three to five tasks, every pack within budget | yes — five tasks, packs 684 to 8,288 tokens |
| 3. Every task's own check passes after its builder, without repair | not as written ("exits 0"): one check is a product use expected to exit 1, and it does; yes on the expected status |
| 4. The milestone's `Observed by` holds | not as written, for the same reason; yes on the expected status |
| 5. A second reader lists none of the first reader's leaks | no — the second reading repeats two (a template comment on optional dependencies; arguments taken as decoded text); the third, final reading is empty |
| 6. The owner's measure: no format loss changing what was built; at most one behaviour-changing content item per task | yes — nine format items, none judged to change the product (one borderline: a first milestone cannot build a component in part); content per task 0, 0, 0, 0, 1. Earlier measure: no (nine items) |
| 7. A defect of a script or a template is repaired before the verdict | yes — none found |

**Earlier findings:** none of the first run's eight, the second run's twelve or the third run's nine recurred in its stated form; two returned in new forms (the manifest's owner, a task building part of a unit).

**The format findings of this run:** text copied from the templates and the concept into neutral documents names stack concepts; data shaped like an address has no literal form; two empty forms are unstated (external needs, `Defines`); bindings are written before the plan that names the manifest's owner and the first milestone's scope; `Produces` has no form for several consumers or a unit with no names; whether component keys are addresses in the containment line is unsaid.

**Verdict: FAIL.** Steps 3 and 4 of the realization stay closed. The concept needs the six amendments the run's evaluation lists. For the owner of the gate, before any further run: criteria 3 and 4 need wording for an observation that expects a nonzero status, and criterion 5 reads the second reading although the format's review ends at the first reading that repeats nothing.

**The owner's decision (2026-11-26), after the verdict:** criteria 3 and 4 hold when each check gives the result its `Done when` or `Observed by` states, the exit status included; criterion 5 is read on the reading that ends the review (within three rewrites, no `Open:` line), the second reading reported beside it, and a leak carried by text of the templates or the concept counts under criterion 6. Under these readings run 4 passes: criteria 3 and 4 hold (every check gave its stated result), criterion 5 holds (the third reading, which ended the review, is empty), and criterion 6 holds under the owner's measure (the two template-carried leaks are format items that changed nothing built). **Verdict under the owner's readings: PASS.** The gate is open; the six format items of this run are amended first in step 3. The readings were decided after the result.
