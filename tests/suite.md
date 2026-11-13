# Workflow Test Suite

**Version:** 1.9.107
**Purpose:** Regression testing for Magic SDD engine workflows.
**Trigger:** `/magicspec-dev:test test`

## How to Run

The agent reads this index and the area files it lists, simulates each test scenario against the target workflow's logic, and reports PASS/FAIL for each expected outcome. `/magicspec-dev:test test` runs every area; `/magicspec-dev:test {area}` runs one area and reads only this index, that area's file and the shipped text its cases cite. No real files are created — all state is synthetic.

### Pass Criteria

A test **passes** if the workflow logic (as written in `skills/magicspec/workflows/*.md`) would produce the expected outcome given the synthetic state. A test **fails** if:

- A required guard is missing or would not trigger.
- The workflow would produce an incorrect or undefined result.
- An edge case is silently ignored instead of flagged.

### Report Format

After all tests, present a summary table:

```
Workflow Test Suite — {date}

| ID | Workflow | Scenario | Result |
| --- | --- | --- | --- |
| T01 | init | Fresh cold start | ✅ PASS |
| T02 | init | Partial corruption | ❌ FAIL |
...

Total: {N} passed, {M} failed out of {T}
```

If any test fails, document the failure reason and propose a fix.

## Areas

The cases are kept in one file per area, by the workflow or module each case targets (its `Workflow` field). A case keeps its `T{N}` for good: no case is renumbered or moved to another identifier, and each identifier appears in exactly one file. A new case takes the identifier after `Last`, goes into the file of its area and is listed here in the same change.

| Area | File | Cases | Identifiers | Size |
| --- | --- | --- | --- | --- |
| analyze | [suite/analyze.md](suite/analyze.md) | 42 | T27–T28, T31, T38, T46–T48, T59, T65, T68, T87–T91, T96–T102, T107–T110, T113–T121, T144–T145, T180–T181, T196, T229, T239 | 41 KB |
| context | [suite/context.md](suite/context.md) | 7 | T215, T222, T234, T254, T278–T280 | 10 KB |
| engine-text | [suite/engine-text.md](suite/engine-text.md) | 32 | T36, T134, T184, T193, T216, T220–T221, T224, T231, T253, T260–T262, T264, T266–T267, T271–T272, T274, T276–T277, T281, T287–T288, T310–T311, T313, T336, T343–T344, T353, T356 | 48 KB |
| fix | [suite/fix.md](suite/fix.md) | 11 | T300–T309, T354 | 11 KB |
| goal | [suite/goal.md](suite/goal.md) | 7 | T329–T335 | 8 KB |
| help | [suite/help.md](suite/help.md) | 6 | T268–T270, T275, T289, T316 | 8 KB |
| init | [suite/init.md](suite/init.md) | 13 | T01–T02, T26, T30, T45, T58, T77, T79, T138, T162–T164, T235 | 11 KB |
| plan | [suite/plan.md](suite/plan.md) | 46 | T06–T08, T23, T44, T53, T62, T66, T69, T71, T85–T86, T125, T127, T147–T149, T161, T165–T173, T177–T178, T182–T183, T194, T200, T213–T214, T217–T218, T232, T242, T244, T249, T251, T284, T295, T323, T328 | 49 KB |
| retrospective | [suite/retrospective.md](suite/retrospective.md) | 9 | T14, T22, T37, T60, T175, T197–T199, T247 | 8 KB |
| rule | [suite/rule.md](suite/rule.md) | 16 | T12–T13, T24, T41, T70, T75, T137, T140, T143, T208, T225–T228, T230, T259 | 19 KB |
| run | [suite/run.md](suite/run.md) | 41 | T09–T11, T19–T21, T33–T34, T39, T42, T54–T57, T64, T74, T82, T104–T105, T126, T141, T146, T150–T151, T174, T195, T201, T203, T205–T207, T223, T233, T236, T248, T250, T256, T258, T299, T324, T327 | 48 KB |
| scripts | [suite/scripts.md](suite/scripts.md) | 25 | T80, T103, T190–T191, T219, T238, T240, T243, T282, T290, T312, T314, T338–T342, T345–T351, T355 | 27 KB |
| simulate | [suite/simulate.md](suite/simulate.md) | 6 | T317–T322 | 5 KB |
| spec-intake | [suite/spec-intake.md](suite/spec-intake.md) | 8 | T209–T212, T255, T273, T298, T337 | 15 KB |
| spec | [suite/spec.md](suite/spec.md) | 52 | T03–T05, T16–T18, T25, T29, T43, T49–T52, T61, T72, T76, T78, T81, T83–T84, T92–T95, T106, T111–T112, T128, T135–T136, T139, T153–T156, T158–T160, T176, T185, T202, T204, T237, T241, T245–T246, T283, T291–T294, T325 | 52 KB |
| task | [suite/task.md](suite/task.md) | 8 | T152, T257, T265, T285–T286, T296–T297, T326 | 12 KB |
| test | [suite/test.md](suite/test.md) | 28 | T15, T32, T35, T40, T63, T73, T122–T124, T129–T133, T142, T157, T179, T186–T189, T192, T252, T263, T315, T352, T357–T358 | 26 KB |

`spec-intake` holds the cases of the idea-intake gate (Step 0.5) of the `spec` workflow; `scripts` the cases whose target is a script; `engine-text` the cases whose target is the constitution, a role card, a template, a reference, or the status, graph, migrate and sync workflows.

**Test Suite Finalized** - v1.9.107 (Last: T358)
