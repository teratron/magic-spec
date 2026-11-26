// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FINALIZATION: THE SESSION STATE AND THE NEXT STEP
// ═══════════════════════════════════════════════════════════════════════════
//
// What finalization patches, reports and guards after the next step is in finalize-state.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');
const {
    TESTS_DIR,
    commitAllInFixture,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    copyStateTemplate,
    makeWorkspace,
    requireFinalizeWorkspace,
    registryTable,
    phaseWorkbook,
} = require('./lib/base');
const { readShipped, simEnv } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 7. update-state.js
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js should bootstrap, patch fields and append decision/constraint', () => {
        const tempDir = createTempWorkspace();
        try {
            // Copy real state template so bootstrap path exercises template branch
            copyStateTemplate(tempDir);

            const wsDir = makeWorkspace(tempDir, 'main');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'update-state.js',
            );

            // 1. Bootstrap — STATE.md should be created from template
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --status=Active --phase=1 --next-action="Run /magicspec spec"`,
                {
                    cwd: tempDir,
                },
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'STATE.md should be created from template');
            const initialState = fs.readFileSync(statePath, 'utf8');
            assert.ok(/\*\*Status:\*\*\s+Active/.test(initialState), 'Status should be patched');
            assert.ok(/\*\*Phase:\*\*\s+1/.test(initialState), 'Phase should be patched');

            // 2. Add decision — should appear under Recent Decisions with today's date
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --decision="Adopt SDD workflow"`,
                {
                    cwd: tempDir,
                },
            );
            const afterDecision = fs.readFileSync(statePath, 'utf8');
            // Structural assertions, not presence-only: the prior single
            // assertion here (`/## Recent Decisions[\s\S]*Adopt SDD workflow/`)
            // matches at any distance, so it passed identically whether the
            // entry landed before or after the blank-line/comment preamble —
            // structurally incapable of catching the defect this pins
            // (addDecision inserting directly after the heading, no blank
            // line, displacing the preamble below the entries — markdownlint
            // MD022/MD032/MD012).
            assert.match(
                afterDecision,
                /## Recent Decisions\r?\n\r?\n<!-- Last 3-5 locked decisions/,
                'the heading must be followed by a blank line, then the comment preamble — not an entry',
            );
            assert.match(
                afterDecision,
                /are dropped \(not archived\) — see PLAN\.md \/ CHANGELOG\.md for phase history\. -->\r?\n\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* Adopt SDD workflow/,
                'the new entry must sit after the comment preamble, not before it',
            );
            // l2-finalize-state-accuracy.md §10: the preamble previously claimed
            // an archival to PLAN.md that no code path ever performed — pin the
            // absence, not only the replacement's presence, so a future edit
            // cannot silently reintroduce the same false promise while still
            // passing the match above (a different string could satisfy the
            // "after the preamble" shape without removing the old claim if a
            // future preamble concatenated both).
            assert.doesNotMatch(
                afterDecision,
                /archived to PLAN\.md/,
                'the preamble must not claim an archival the code never performs',
            );
            assert.doesNotMatch(
                afterDecision,
                /\r?\n[ \t]*\r?\n[ \t]*\r?\n/,
                'no run of two or more consecutive blank lines may appear anywhere in STATE.md',
            );
            assert.doesNotMatch(
                afterDecision,
                /\{YYYY-MM-DD\}/,
                "the template's own placeholder decision rows must not survive alongside a real entry",
            );

            // 3. Add constraint — should be auto-numbered [C-001]
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --constraint-title="No Mocks" --constraint-desc="Integration tests only"`,
                {
                    cwd: tempDir,
                },
            );
            const afterConstraint = fs.readFileSync(statePath, 'utf8');
            assert.ok(
                /\[C-001\].*No Mocks.*Integration tests only/.test(afterConstraint),
                'Constraint entry should be auto-numbered starting at C-001 on a fresh template',
            );
            // Structural assertions, not presence-only — same defect class as
            // addDecision above: addConstraint's insertion point used the
            // identical `/^[^<]/m` comment-skip search addDecision was
            // rewritten away from. A blank line's own line-terminating `\n`
            // satisfies `[^<]` at position 0, so `contentStart > 0` was
            // always false and every constraint landed directly after the
            // heading — above the MANDATORY-reading comment block — piling
            // up there across calls instead of joining the entry list below it.
            assert.match(
                afterConstraint,
                /## Blocking Constraints\r?\n\r?\n<!-- Anti-patterns discovered through real failures\. MANDATORY reading\. -->/,
                'the heading must be followed by a blank line, then the comment preamble — not an entry',
            );
            assert.match(
                afterConstraint,
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-001\] \*\*No Mocks\*\*: Integration tests only/,
                'the new entry must sit after the comment preamble, not before it',
            );
            assert.doesNotMatch(
                afterConstraint,
                /\r?\n[ \t]*\r?\n[ \t]*\r?\n/,
                'no run of two or more consecutive blank lines may appear anywhere in STATE.md',
            );

            // A second constraint must join the first newest-first, both
            // still below the comment preamble — pins that the fix rebuilds
            // the whole entry list rather than only the first insertion.
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --constraint-title="No Sleep Loops" --constraint-desc="Use condition polling"`,
                {
                    cwd: tempDir,
                },
            );
            const afterSecondConstraint = fs.readFileSync(statePath, 'utf8');
            assert.match(
                afterSecondConstraint,
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-002\] \*\*No Sleep Loops\*\*: Use condition polling\r?\n- \[C-001\] \*\*No Mocks\*\*: Integration tests only/,
                'a second constraint must be prepended above the first, both below the comment preamble — newest-first, list never split by the heading',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7b. finalize.js — session continuity (SC-2 / SC-2.1 / SC-3)
    // ───────────────────────────────────────────────────────────────────────────
    test('finalize.js computeNextAction is plan-state-aware (SC-2.1)', () => {
        const tempDir = createTempWorkspace();
        try {
            // require.main guard means requiring finalize.js does NOT run main().
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            // (a) Legacy inline format: open task in TASKS.md → /magicspec run.
            fs.writeFileSync(tasksPath, '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n');
            let next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magicspec run engine/, 'inline open task → /magicspec run');
            assert.match(next, /T-1A01/, 'should name the open task');

            // (b) Canonical two-level format: TASKS.md is a registry (table),
            //     open tasks live in tasks/phase-1.md.
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-1A01] Setup project',
                    '- [ ] [T-1A02] Implement feature',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(
                next,
                /\/magicspec run engine/,
                'canonical two-level: open task in phase file → /magicspec run',
            );
            assert.match(next, /T-1A02/, 'should name the open task from phase file');

            // (c) Registry fallback: no open checkboxes anywhere, but registry
            //     shows a non-Done phase → recommend continuing that phase.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-1A01] Setup project',
                    '- [x] [T-1A02] Implement feature',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /Phase 1/, 'registry fallback: non-Done phase → Continue Phase N');
            assert.match(next, /\/magicspec run/, 'registry fallback recommends /magicspec run');

            // (d) Plan complete — no open tasks, all phases Done.
            fs.writeFileSync(
                tasksPath,
                [
                    '## Active Phases',
                    '',
                    '*None — plan complete.*',
                    '',
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '',
                ].join('\n'),
            );
            // Remove phase file to be clean.
            fs.unlinkSync(path.join(tasksDir, 'phase-1.md'));
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(
                next,
                /\/magicspec plan engine/,
                'plan complete after task → /magicspec plan funnel (§5)',
            );
            assert.doesNotMatch(
                next,
                /\/magicspec spec/,
                '/magicspec spec must never be named proactively (§5)',
            );
            assert.doesNotMatch(
                next,
                /execute the active phase/,
                'must not recommend a non-existent phase (the R6 bug)',
            );

            // (d2) Same plan-complete state reached via `run`. The recommendation
            //     is deliberately identical to (d): STATE.md `Next Action` is
            //     workflow-agnostic at read time (/magicspec status replays it
            //     verbatim), so a per-branch recommendation would let a line that
            //     is legal for one workflow surface under another.
            assert.strictEqual(
                finalize.computeNextAction('run', 'engine', wsDir),
                next,
                'plan-complete recommendation must not vary by originating workflow',
            );

            // (e) spec/rule → replan first (pipeline order).
            assert.match(
                finalize.computeNextAction('spec', 'engine', wsDir),
                /\/magicspec plan/,
                'spec → /magicspec plan',
            );
            assert.match(
                finalize.computeNextAction('rule', 'engine', wsDir),
                /\/magicspec plan/,
                'rule → /magicspec plan',
            );

            // (f) Unreadable TASKS.md → safe planning fallback.
            const voidWs = path.join(tempDir, '.magicspec', 'void');
            assert.match(
                finalize.computeNextAction('run', 'void', voidWs),
                /\/magicspec plan/,
                'missing TASKS.md → /magicspec plan fallback',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // A complete plan with nothing waiting must say so and name no command; any
    // pending signal — or any inability to tell — keeps the /magicspec plan funnel.
    // The fixtures carry INDEX/PLAN/TASKS: the plan-complete fixture above has
    // no PLAN, so it resolves to the funnel through the cannot-evaluate path.
    // The four stages: the next step follows spec → plan → task → run, and a finding that a decomposition
    // or a run handed back is the next step until the plan is rewritten.
    test('finalize.js names the next stage — plan after spec and rule, task after a plan that left the ledger behind, run when tasks wait — and a plan with an undecomposed phase is not complete', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const planPath = path.join(wsDir, 'PLAN.md');
            const writePlan = ({
                version = '1.0.0',
                phases = [
                    [
                        '1',
                        'First',
                        true,
                    ],
                    [
                        '2',
                        'Second',
                        false,
                    ],
                ],
            } = {}) =>
                fs.writeFileSync(
                    planPath,
                    [
                        '# Plan',
                        '',
                        `**Version:** ${version}`,
                        '',
                        '## Active Phases',
                        '',
                        ...phases.flatMap(([n, name, done]) => [
                            `### Phase ${n} — ${name}`,
                            '',
                            `- [${done ? 'x' : ' '}] **A spec**`,
                            '',
                        ]),
                        '## Backlog',
                        '',
                        '*None.*',
                        '',
                    ].join('\n'),
                );
            const writeLedger = ({
                basedOn = '1.0.0',
                rows = [
                    [
                        '1',
                        'Done',
                    ],
                ],
                tail = '',
            } = {}) =>
                fs.writeFileSync(
                    tasksPath,
                    [
                        '# Master Task Index',
                        '',
                        `**Based on PLAN:** .magicspec/engine/PLAN.md v${basedOn}`,
                        '',
                        '## Active Phases',
                        '',
                        '| Phase | Description | Status |',
                        '| --- | --- | --- |',
                        ...rows.map(
                            ([n, status]) =>
                                `| [Phase ${n}](tasks/phase-${n}.md) | d | \`${status}\` |`,
                        ),
                        '',
                        tail,
                    ].join('\n'),
                );

            // Phase 2 has an open item and no row in the ledger: the plan is not complete.
            writePlan();
            writeLedger();
            for (const workflow of [
                'task',
                'run',
            ]) {
                assert.strictEqual(
                    finalize.computeNextAction(workflow, 'engine', wsDir),
                    'Run /magicspec task engine to decompose Phase 2',
                    `${workflow}: a phase the plan holds and the ledger has no row for is waiting for its tasks`,
                );
            }

            // The shared predicate says the same, so Pre-flight cannot call such a plan complete either
            // (a backlog warning would otherwise fire against a plan that still has a phase to decompose).
            const pending = requireFromFixture(tempDir, 'lib', 'pending-work.js').findPendingWork(
                wsDir,
            );
            assert.deepStrictEqual(pending.nextUndecomposed, {
                phase: '2',
                name: 'Second',
            });
            assert.strictEqual(
                pending.planComplete,
                false,
                'a phase with no tasks yet is not a complete plan',
            );
            assert.deepStrictEqual(pending.openBacklogItems, [], 'so its backlog is not judged');

            // spec and rule come back to the plan (pipeline order).
            assert.strictEqual(
                finalize.computeNextAction('spec', 'engine', wsDir),
                'Run /magicspec plan engine to update the plan',
            );
            assert.strictEqual(
                finalize.computeNextAction('rule', 'engine', wsDir),
                'Run /magicspec plan engine to revalidate the plan against amended rules',
            );

            // After a plan that left the ledger behind: decomposition — the undecomposed phase first.
            writePlan({
                version: '1.1.0',
            });
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Run /magicspec task engine to decompose Phase 2',
            );
            // … or the re-sync of the tasks when every phase has its row and one is still open.
            writePlan({
                version: '1.1.0',
                phases: [
                    [
                        '1',
                        'First',
                        false,
                    ],
                ],
            });
            writeLedger({
                rows: [
                    [
                        '1',
                        'In Progress',
                    ],
                ],
            });
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Run /magicspec task engine to bring the tasks in line with the plan',
            );
            // A ledger whose every phase is terminal has nothing for the task command to apply (PL-5):
            // the plan state decides the step, here the funnel, since no registry is evaluated.
            writePlan({
                version: '1.1.0',
                phases: [
                    [
                        '1',
                        'First',
                        true,
                    ],
                ],
            });
            writeLedger();
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Plan complete — run /magicspec plan engine to plan new scope',
                'a plan that changed no open phase is not handed to a task re-sync',
            );

            // A plan whose ledger is in step: the step the plan state computes — execute the open task.
            fs.mkdirSync(tasksDir, {
                recursive: true,
            });
            writePlan({
                version: '1.0.0',
                phases: [
                    [
                        '1',
                        'First',
                        false,
                    ],
                ],
            });
            writeLedger({
                basedOn: '1.0.0',
                rows: [
                    [
                        '1',
                        'In Progress',
                    ],
                ],
            });
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                phaseWorkbook(
                    [
                        '- [ ] [T-1A01] Do the thing',
                    ],
                    {
                        rest: [
                            '## Detailed Tracking',
                            '',
                            '### [T-1A01] Do the thing',
                            '',
                            '- **Status:** Todo',
                            '- **Assignment:** Agent',
                            '',
                        ],
                    },
                ),
            );
            for (const workflow of [
                'plan',
                'task',
            ]) {
                assert.match(
                    finalize.computeNextAction(workflow, 'engine', wsDir),
                    /^Execute T-1A01 Do the thing via \/magicspec run engine$/,
                    workflow,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    // After a plan, a ledger behind it is re-synced by the task command — unless the plan is complete
    // and its Backlog holds an open design item. The task command's Plan Gate refuses on that item (it
    // is the planning command's finding), so that step could only send the person back; the planning
    // funnel, whose pre-flight is the door to the specification pass, is the step, as after every
    // other workflow.
    test('finalize.js after a plan: a complete plan with an open design item names the planning funnel, as for every workflow, and not a task re-sync the Plan Gate refuses', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const FUNNEL = 'Plan complete — run /magicspec plan engine to plan new scope';
            const write = (/** @type {string} */ backlog) => {
                fs.writeFileSync(
                    path.join(wsDir, 'INDEX.md'),
                    [
                        '# Index',
                        '',
                        '**Version:** 1.0.0',
                        '',
                        '| [l1-a.md](specifications/l1-a.md) | d | Stable | 1 | 1.0.0 |',
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(
                    path.join(wsDir, 'PLAN.md'),
                    [
                        '# Plan',
                        '',
                        '**Version:** 1.1.0',
                        '**Based on:** .magicspec/engine/INDEX.md v1.0.0',
                        '',
                        '## Active Phases',
                        '',
                        '### Phase 1 — First',
                        '',
                        '- [x] **A** ([l1-a.md](specifications/l1-a.md))',
                        '',
                        '## Backlog',
                        '',
                        backlog,
                        '',
                    ].join('\n'),
                );
                // The ledger was written against the plan before this revalidation, and every phase is done.
                fs.writeFileSync(
                    tasksPath,
                    [
                        '# Master Task Index',
                        '',
                        '**Based on PLAN:** .magicspec/engine/PLAN.md v1.0.0',
                        '',
                        '## Active Phases',
                        '',
                        '| Phase | Description | Status |',
                        '| --- | --- | --- |',
                        '| [Phase 1](archives/tasks/phase-1.md) | d | `Done (Archived)` |',
                        '',
                    ].join('\n'),
                );
            };

            write('- **Design item** that needs a specification pass.');
            for (const workflow of [
                'plan',
                'task',
                'run',
                'fix',
                'simulate',
            ]) {
                assert.strictEqual(
                    finalize.computeNextAction(workflow, 'engine', wsDir),
                    FUNNEL,
                    `${workflow}: an open design item behind a complete plan is the funnel's, whatever the ledger records`,
                );
            }

            // Control: the same item Parked leaves nothing pending, and a ledger whose every phase is terminal
            // has nothing for the task command to apply, so no step is named (PL-5).
            write(
                '- **Design item** that needs a specification pass. *(Parked — waiting on evidence)*',
            );
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Plan complete — nothing pending',
                'with nothing pending, a plan that left only a finished ledger behind names no step',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js turns a replan directive into the next step while the plan it was written against stands, and drops it once the plan is rewritten', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const planPath = path.join(wsDir, 'PLAN.md');
            const writePlan = (version) =>
                fs.writeFileSync(
                    planPath,
                    [
                        '# Plan',
                        '',
                        `**Version:** ${version}`,
                        '',
                        '## Active Phases',
                        '',
                        '### Phase 1 — First',
                        '',
                        '- [ ] **A spec**',
                        '',
                        '## Backlog',
                        '',
                        '*None.*',
                        '',
                    ].join('\n'),
                );
            const writeLedger = (section) => {
                fs.writeFileSync(
                    tasksPath,
                    [
                        '# Master Task Index',
                        '',
                        '**Based on PLAN:** .magicspec/engine/PLAN.md v2.0.0',
                        '',
                        '## Active Phases',
                        '',
                        '| Phase | Description | Status |',
                        '| --- | --- | --- |',
                        '| [Phase 1](tasks/phase-1.md) | d | `In Progress` |',
                        '',
                        section,
                        '## Meta Information',
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(
                    path.join(tasksDir, 'phase-1.md'),
                    phaseWorkbook(
                        [
                            '- [ ] [T-1A01] Do',
                        ],
                        {
                            rest: [
                                '## Detailed Tracking',
                                '',
                                '### [T-1A01] Do',
                                '',
                                '- **Status:** Todo',
                                '- **Assignment:** Agent',
                                '',
                            ],
                        },
                    ),
                );
            };
            const directive = [
                '## Replan Directive',
                '',
                '- **Plan version:** 2.0.0',
                '- **Directive:** Split Phase 1: the auth specification is too large for one phase,',
                '  and "login" must come before the API.',
                '',
            ].join('\n');

            // Pending: the plan's version is the one the directive records, for every workflow.
            writePlan('2.0.0');
            writeLedger(directive);
            for (const workflow of [
                'task',
                'run',
                'plan',
            ]) {
                assert.strictEqual(
                    finalize.computeNextAction(workflow, 'engine', wsDir),
                    'Run /magicspec plan engine "Split Phase 1: the auth specification is too large for one phase, and \'login\' must come before the API."',
                    `${workflow}: the directive is the next step, in one line, with the inner quotes turned`,
                );
            }

            // Retired: the plan was rewritten (a new version) — the ledger is not touched, the directive is ignored.
            writePlan('2.1.0');
            assert.match(
                finalize.computeNextAction('task', 'engine', wsDir),
                /^Execute T-1A01 Do via \/magicspec run engine$/,
            );

            // The template's example is a comment and is not a directive.
            writePlan('2.0.0');
            writeLedger(`<!-- Optional section.\n\n${directive}-->\n`);
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A01 Do via \/magicspec run engine$/,
            );

            // A section with no version or no text is not a directive.
            writeLedger('## Replan Directive\n\n- **Directive:** something\n');
            assert.match(finalize.computeNextAction('run', 'engine', wsDir), /^Execute T-1A01/);
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize --workflow=plan is accepted, judges only the plan file as significant, and writes a plan-shaped changelog bullet', () => {
        const tempDir = createTempWorkspace();
        try {
            const significance = requireFromFixture(tempDir, 'lib', 'significance.js');
            const bullets = requireFromFixture(tempDir, 'lib', 'changelog-bullets.js');
            const { patterns } = significance.resolveWhitelist('magic.plan', 'engine');
            assert.deepStrictEqual(patterns, [
                '.magicspec/engine/PLAN.md',
            ]);
            const taskPatterns = significance.resolveWhitelist('magic.task', 'engine').patterns;
            assert.ok(
                !taskPatterns.some((pattern) => pattern.endsWith('PLAN.md')),
                'the task stage no longer writes the plan',
            );
            assert.ok(taskPatterns.includes('.magicspec/engine/TASKS.md'));
            assert.strictEqual(
                bullets.buildChangelogBullet('plan', 'engine', [
                    {
                        path: '.magicspec/engine/PLAN.md',
                        status: 'modified',
                    },
                ]),
                'Updated implementation plan (engine)',
            );
            assert.strictEqual(bullets.deriveChangelogCategory('plan', []), 'Changed');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize ends with one handoff line naming the next command, its argument and its reasoning demand, read from the router through the one parser (PS-4, PS-7)', () => {
        const tempDir = createTempWorkspace();
        try {
            // A router in the fixture: seven columns, an alias, a demand per command.
            fs.writeFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'SKILL.md'),
                [
                    '| Command | Group | What it does | Argument | When it is missing | Demand | Body |',
                    '| --- | --- | --- | --- | --- | --- | --- |',
                    '| `spec` | pipeline | s | an idea | **required** | deep | `workflows/spec.md` |',
                    '| `plan` | pipeline | p | a directive | optional | deep | `workflows/plan.md` |',
                    '| `task` | pipeline | t | a workspace | optional | standard | `workflows/task.md` |',
                    '| `run` | pipeline | r | a workspace | optional | standard | `workflows/run.md` |',
                    '| `analyze` (alias `audit`) | health | a | a mode | optional | deep | `workflows/analyze.md` |',
                    '| `status` | health | s | a workspace | optional | light | `workflows/status.md` |',
                    '',
                ].join('\n'),
            );
            const finalize = requireFromFixture(tempDir, 'finalize.js');
            const line = (nextAction, workspace = 'engine') =>
                finalize.handoffLine(nextAction, workspace);

            // The four boundaries: the demand is the NEXT command's.
            assert.strictEqual(
                line('Run /magicspec plan engine to update the plan'),
                'Next: /magicspec plan engine — deep reasoning',
                'after spec',
            );
            assert.strictEqual(
                line('Run /magicspec task engine to decompose Phase 2'),
                'Next: /magicspec task engine — standard reasoning',
                'after plan',
            );
            assert.strictEqual(
                line('Execute T-1A01 Do the thing via /magicspec run engine'),
                'Next: /magicspec run engine — standard reasoning',
                'after task',
            );
            assert.strictEqual(
                line(
                    'Run /magicspec plan engine "Split Phase 1: the auth specification is too large"',
                ),
                'Next: /magicspec plan engine "Split Phase 1: the auth specification is too large" — deep reasoning',
                'a directive after a run travels with its command',
            );

            // The argument is the workspace the Next Action names — prose after the command is not an argument.
            assert.strictEqual(
                line('Run /magicspec plan to plan'),
                'Next: /magicspec plan — deep reasoning',
            );
            assert.strictEqual(
                line('Run /magicspec plan other to plan'),
                'Next: /magicspec plan — deep reasoning',
                'another word is not the workspace',
            );
            // An alias reads as its command and prints the command's own name.
            assert.strictEqual(
                line('Run /magicspec audit engine'),
                'Next: /magicspec analyze engine — deep reasoning',
            );

            // No line: no command, a command the router does not list, or a statement.
            assert.strictEqual(line('Plan complete — nothing pending'), null);
            assert.strictEqual(line('Run /magicspec goal engine'), null);
            assert.strictEqual(line(''), null);
            assert.strictEqual(line(undefined), null);

            // Printed once, after the step it summarizes, with the Next Action text untouched and carrying no demand.
            const printed = [];
            const original = process.stdout.write;
            process.stdout.write = (chunk) => {
                printed.push(String(chunk));
                return true;
            };
            try {
                finalize.emitTail({
                    nextAction: 'Run /magicspec task engine to decompose Phase 2',
                    workspace: 'engine',
                    findings: [],
                });
                finalize.emitTail({
                    nextAction: 'Plan complete — nothing pending',
                    workspace: 'engine',
                    findings: [],
                });
            } finally {
                process.stdout.write = original;
            }
            const text = printed.join('');
            assert.strictEqual(
                text.split('Next: /magicspec').length - 1,
                1,
                'one handoff line, and none for a statement',
            );
            assert.ok(
                text.includes(
                    '### Next step\n\nRun /magicspec task engine to decompose Phase 2\n\nNext: /magicspec task engine — standard reasoning',
                ),
                'the line follows the step',
            );
            assert.ok(
                !/Run \/magicspec task engine to decompose Phase 2[^\n]*reasoning/.test(text),
                'the Next Action itself carries no demand',
            );

            // An unreadable router costs the line, never the finalization.
            fs.rmSync(path.join(tempDir, 'skills', 'magicspec', 'SKILL.md'));
            assert.strictEqual(line('Run /magicspec plan engine'), null);
        } finally {
            cleanup(tempDir);
        }
    });

    test('a task title that names a command is a title, not the next step: the handoff line and the reserved-command guard read the step the composer appended', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.writeFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'SKILL.md'),
                [
                    '| Command | Group | What it does | Argument | When it is missing | Demand | Body |',
                    '| --- | --- | --- | --- | --- | --- | --- |',
                    '| `spec` | pipeline | s | an idea | **required** | deep | `workflows/spec.md` |',
                    '| `plan` | pipeline | p | a directive | optional | deep | `workflows/plan.md` |',
                    '| `rule` | health | r | a rule | **required** | standard | `workflows/rule.md` |',
                    '| `run` | pipeline | r | a workspace | optional | standard | `workflows/run.md` |',
                    '',
                ].join('\n'),
            );
            const { finalize, wsDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const run = 'Next: /magicspec run engine — standard reasoning';

            // The handoff line: the title is skipped, whichever command it names and however it is written.
            for (const title of [
                'Route it through `/magicspec rule`: C2 lists sync',
                'Say /magicspec plan first, then act',
                'Go via /magicspec plan first',
            ]) {
                assert.strictEqual(
                    finalize.handoffLine(
                        `Execute T-1A01 ${title} via /magicspec run engine`,
                        'engine',
                    ),
                    run,
                    `a title naming a command does not become the handoff: ${title}`,
                );
            }

            // The reserved-command guard: a title naming a reserved command is no violation, so the step stays.
            fs.writeFileSync(
                tasksPath,
                '## Active Phases\n\n- [ ] [T-1A01] Document `/magicspec spec` in the guide\n',
            );
            const next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.strictEqual(
                next,
                'Execute T-1A01 Document `/magicspec spec` in the guide via /magicspec run engine',
                'the step names the run and keeps the title as written',
            );

            // The guard still holds for a step that names a reserved command itself.
            assert.ok(
                finalize.RESERVED_COMMAND_RE.test(
                    'Execute T-1A01 Do it via /magicspec spec engine',
                ),
                'the step is still checked',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('shipped text: every pipeline body says the finalization output ends with the handoff line, printed once before the checklist (PS-7)', () => {
        for (const body of [
            'spec',
            'plan',
            'task',
            'run',
            'rule',
        ]) {
            const text = readShipped(`skills/magicspec/workflows/${body}.md`);
            const section = text.slice(text.indexOf('## Finalization Protocol'));
            assert.ok(
                section.includes('It ends with the handoff line'),
                `${body}.md: the finalization step names the handoff line`,
            );
            assert.ok(
                /handoff line[^\n]*(?:once|before the (?:Completion )?Checklist)/i.test(section),
                `${body}.md: printed once, before the checklist`,
            );
            assert.ok(
                /never refuses|advice|not a warning/i.test(section),
                `${body}.md: the demand is advice`,
            );
        }
    });

    test('a stage started cold from the files alone reaches the step the earlier stage recorded: plan → task → run, and a directive travelling back to plan (PS-2, PS-5, PS-6)', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-cold-'));
        try {
            fs.cpSync(
                path.join(path.resolve(TESTS_DIR, '..'), 'skills', 'magicspec'),
                path.join(dir, 'skills', 'magicspec'),
                {
                    recursive: true,
                },
            );
            const put = (rel, body) => {
                fs.mkdirSync(path.dirname(path.join(dir, rel)), {
                    recursive: true,
                });
                fs.writeFileSync(path.join(dir, rel), body);
            };
            put('.gitignore', 'skills/magicspec/\n');
            put(
                '.magicspec/workspace.json',
                JSON.stringify({
                    default: 'ws',
                    workspaces: {
                        ws: {
                            description: 'fixture',
                        },
                    },
                    finalization: {
                        enabled: true,
                        autoBump: false,
                        autoChangelog: false,
                    },
                }),
            );
            put('.magicspec/RULES.md', '# Rules\n\n**Version:** 1.0.0\n');
            put(
                '.magicspec/ws/INDEX.md',
                '# Index\n\n**Version:** 1.0.0\n\n| [l1-a.md](specifications/l1-a.md) | A | Stable | 1 | 1.0.0 |\n',
            );
            put(
                '.magicspec/ws/specifications/l1-a.md',
                '# A\n\n**Version:** 1.0.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nA.\n',
            );
            put(
                '.magicspec/ws/STATE.md',
                '# Project State\n\n**Workspace:** ws\n**Phase:** none\n**Status:** Active\n\n## Current Position\n\n- **Task:** none\n- **Next Action:** none\n\n## Recent Decisions\n\n## Blockers\n\n## Blocking Constraints\n',
            );
            const plan = (version) =>
                [
                    '# Plan',
                    '',
                    `**Version:** ${version}`,
                    '**Based on:** .magicspec/ws/INDEX.md v1.0.0',
                    '**Based on RULES:** .magicspec/RULES.md v1.0.0',
                    '',
                    '## Active Phases',
                    '',
                    '### Phase 1 — First',
                    '',
                    '- [ ] **A** ([l1-a.md](specifications/l1-a.md))',
                    '',
                    '## Backlog',
                    '',
                    '*None.*',
                    '',
                ].join('\n');
            put('.magicspec/ws/PLAN.md', plan('1.0.0'));
            commitAllInFixture(dir);

            // Every stage is a fresh process: nothing but the files in the project carries over.
            const stage = (...args) =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                        ...args,
                    ],
                    {
                        cwd: dir,
                        encoding: 'utf8',
                        env: simEnv(),
                    },
                );
            const nextAction = () =>
                /\*\*Next Action:\*\*\s*(.+)/
                    .exec(
                        fs.readFileSync(path.join(dir, '.magicspec', 'ws', 'STATE.md'), 'utf8'),
                    )?.[1]
                    .trim();
            const handoff = (result) => /^Next: .*$/m.exec(result.stdout)?.[0];

            // 1. The plan stage ends: the plan is written, and the next stage and its demand are recorded.
            put('.magicspec/ws/PLAN.md', plan('1.0.0') + '\n<!-- revalidated -->\n');
            const afterPlan = stage('finalize', '--workflow=plan', '--workspace=ws');
            assert.strictEqual(afterPlan.status, 0, afterPlan.stdout + afterPlan.stderr);
            assert.strictEqual(
                nextAction(),
                'Run /magicspec task ws to decompose Phase 1',
                'the plan names the decomposition in the live memory',
            );
            assert.strictEqual(handoff(afterPlan), 'Next: /magicspec task ws — standard reasoning');

            // 2. The task stage starts cold: the files say the plan is current (its Plan Gate passes) …
            const gate = JSON.parse(
                stage('check-prerequisites', '--json', '--require-specs', '--workspace=ws').stdout,
            );
            assert.ok(
                !gate.warnings.some((w) => w.type === 'SYNC_GAP' || w.type === 'ORPHANED_SPEC'),
                'no finding that the plan owns: ' + JSON.stringify(gate.warnings),
            );
            // … and ends having written the ledger and a workbook: the run is next.
            put(
                '.magicspec/ws/TASKS.md',
                '# Master Task Index\n\n**Based on PLAN:** .magicspec/ws/PLAN.md v1.0.0\n**Based on RULES:** .magicspec/RULES.md v1.0.0\n\n## Active Phases\n\n| Phase | Description | Status |\n| --- | --- | --- |\n| [Phase 1](tasks/phase-1.md) | First | `In Progress` |\n',
            );
            put(
                '.magicspec/ws/tasks/phase-1.md',
                '---\nphase: 1\nstatus: In Progress\n---\n\n## Atomic Checklist\n\n- [ ] [T-1A01] Do it\n\n## Detailed Tracking\n\n### [T-1A01] Do it\n\n- **Status:** Todo\n- **Assignment:** Agent\n',
            );
            const afterTask = stage('finalize', '--workflow=task', '--workspace=ws');
            assert.strictEqual(afterTask.status, 0, afterTask.stdout + afterTask.stderr);
            assert.strictEqual(nextAction(), 'Execute T-1A01 Do it via /magicspec run ws');
            assert.strictEqual(handoff(afterTask), 'Next: /magicspec run ws — standard reasoning');

            // 3. A finding goes back: the directive is in the ledger, and a stage that starts cold reads it.
            const ledger = fs.readFileSync(path.join(dir, '.magicspec', 'ws', 'TASKS.md'), 'utf8');
            put(
                '.magicspec/ws/TASKS.md',
                ledger +
                    '\n## Replan Directive\n\n- **Plan version:** 1.0.0\n- **Directive:** Split Phase 1: the specification is too large for one phase.\n',
            );
            const afterFinding = stage('finalize', '--workflow=task', '--workspace=ws');
            assert.strictEqual(
                nextAction(),
                'Run /magicspec plan ws "Split Phase 1: the specification is too large for one phase."',
            );
            assert.strictEqual(
                handoff(afterFinding),
                'Next: /magicspec plan ws "Split Phase 1: the specification is too large for one phase." — deep reasoning',
            );

            // 4. The plan is rewritten: the directive retires on its own and the ledger is not touched.
            put('.magicspec/ws/PLAN.md', plan('1.1.0'));
            const afterReplan = stage('finalize', '--workflow=plan', '--workspace=ws');
            assert.strictEqual(afterReplan.status, 0, afterReplan.stdout + afterReplan.stderr);
            assert.strictEqual(
                nextAction(),
                'Run /magicspec task ws to bring the tasks in line with the plan',
                'the retired directive no longer leads',
            );
            assert.ok(
                fs
                    .readFileSync(path.join(dir, '.magicspec', 'ws', 'TASKS.md'), 'utf8')
                    .includes('## Replan Directive'),
                'the plan stage did not write the ledger',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('finalize.js plan-complete Next Action names no command only when nothing is pending', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir } = requireFinalizeWorkspace(tempDir);
            const pendingWork = requireFromFixture(tempDir, 'lib', 'pending-work.js');
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const FUNNEL = /Plan complete — run \/magicspec plan engine to plan new scope/;
            const NOTHING = 'Plan complete — nothing pending';
            const indexPath = path.join(wsDir, 'INDEX.md');
            const planPath = path.join(wsDir, 'PLAN.md');
            const tasksPath = path.join(wsDir, 'TASKS.md');

            const write = ({
                registered = [
                    'l1-a.md',
                ],
                planned = [
                    'l1-a.md',
                ],
                basedOn = '1.0.0',
                backlog = '*None.*',
            } = {}) => {
                fs.rmSync(planPath, {
                    recursive: true,
                    force: true,
                });
                fs.writeFileSync(
                    indexPath,
                    [
                        '# Index',
                        '',
                        '**Version:** 1.0.0',
                        '',
                        ...registered.map(
                            (f) => `| [${f}](specifications/${f}) | d | Stable | 1 | 1.0.0 |`,
                        ),
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(
                    planPath,
                    [
                        '# Plan',
                        '',
                        `**Based on:** .magicspec/engine/INDEX.md v${basedOn}`,
                        '',
                        ...planned.map((f) => `- [x] A ([${f}](specifications/${f}))`),
                        '',
                        '## Backlog',
                        '',
                        backlog,
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(tasksPath, '## Active Phases\n\n*None — plan complete.*\n');
            };

            // (1) In sync, empty Backlog → the fact, and no command at all.
            write();
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.strictEqual(next, NOTHING, 'nothing pending → a command-free statement');
            assert.doesNotMatch(
                next,
                /\/magicspec /,
                'the statement must name no /magicspec <command> command',
            );

            // (2) An open, unparked Backlog bullet → the funnel.
            write({
                backlog: '- **Design item** that needs a spec pass.',
            });
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, FUNNEL, 'an open Backlog item is pending work → funnel');

            // (3) Control: the same bullet with the trailing Parked marker is not pending.
            write({
                backlog:
                    '- **Design item** that needs a spec pass. *(Parked — waiting on evidence)*',
            });
            assert.strictEqual(
                finalize.computeNextAction('run', 'engine', wsDir),
                NOTHING,
                'a Parked bullet is deliberately not open work',
            );

            // (4) A registered spec the plan never mentions → funnel.
            write({
                registered: [
                    'l1-a.md',
                    'l1-b.md',
                ],
            });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'an orphaned spec is pending work → funnel',
            );

            // (5) A plan built on an older registry version → funnel.
            write({
                basedOn: '0.9.0',
            });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'a registry ahead of the plan is pending work → funnel',
            );

            // (6) Cannot tell (PLAN.md is a directory) → funnel, and it is recorded.
            write();
            fs.rmSync(planPath, {
                force: true,
            });
            fs.mkdirSync(planPath);
            diagnostics.drain();
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'an unreadable plan is not evidence that nothing is pending',
            );
            assert.ok(
                diagnostics.read().some((f) => f.code === 'PENDING_WORK_UNEVALUABLE'),
                'the fall-back to the funnel must be visible as a recorded finding',
            );

            // (7) The predicate itself, so the two callers cannot disagree.
            write({
                registered: [
                    'l1-a.md',
                    'l1-b.md',
                ],
                basedOn: '0.9.0',
                backlog: '- open item',
            });
            const found = pendingWork.findPendingWork(wsDir);
            assert.deepStrictEqual(
                found.orphanedSpecs,
                [
                    'l1-b.md',
                ],
                'the unplanned spec is named',
            );
            assert.deepStrictEqual(
                found.syncGap,
                {
                    planBasedOn: '0.9.0',
                    indexVersion: '1.0.0',
                },
                'the version gap is reported with both sides',
            );
            assert.strictEqual(found.planComplete, true, 'the marker reads as a complete plan');
            assert.deepStrictEqual(
                found.openBacklogItems,
                [
                    '- open item',
                ],
                'the open bullet is listed',
            );
            assert.ok(found.registryEvaluated && found.backlogEvaluated, 'both checks ran');

            fs.rmSync(planPath, {
                force: true,
            });
            const missing = pendingWork.findPendingWork(wsDir);
            assert.strictEqual(
                missing.registryEvaluated,
                false,
                'no plan → registry check did not run',
            );
            assert.strictEqual(
                missing.backlogEvaluated,
                false,
                'no plan → backlog check did not run',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never names a reserved command (§5)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            // Every plan state the three-tier lookup can land in. The previous
            // regression fixed the plan-complete `run` branch only and left the
            // `task` branch emitting /magicspec spec, so this sweeps the full matrix
            // rather than pinning one cell of it.
            const planStates = {
                'inline open task': '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n',
                'registry active phase': registryTable('In Progress'),
                'plan complete': [
                    '## Active Phases',
                    '',
                    '*None — plan complete.*',
                    '',
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                    '',
                ].join('\n'),
                'empty registry': '# Master Task Index\n\n## Active Phases\n\n',
            };

            for (const [label, tasks] of Object.entries(planStates)) {
                fs.writeFileSync(tasksPath, tasks);
                for (const workflow of [
                    'spec',
                    'task',
                    'run',
                    'rule',
                ]) {
                    const next = finalize.computeNextAction(workflow, 'engine', wsDir);
                    assert.doesNotMatch(
                        next,
                        /\/magicspec (spec|analyze)/,
                        `${workflow} @ ${label}: reserved command leaked into Next Action → "${next}"`,
                    );
                    // §5 / DA-6: the user sees exactly ONE next step. STATE.md
                    // `Next Action` is replayed verbatim by /magicspec status, so a
                    // second command here becomes a second user-visible option.
                    const commands = next.match(/\/magicspec [a-z]+/g) || [];
                    assert.strictEqual(
                        commands.length,
                        1,
                        `${workflow} @ ${label}: expected exactly one command, got ${commands.length} → "${next}"`,
                    );
                }
            }

            // Unreadable workspace — the catch-path fallback is bound too.
            const voidNext = finalize.computeNextAction(
                'run',
                'void',
                path.join(tempDir, '.magicspec', 'void'),
            );
            assert.doesNotMatch(
                voidNext,
                /\/magicspec (spec|analyze)/,
                'catch fallback must stay §5-clean',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
