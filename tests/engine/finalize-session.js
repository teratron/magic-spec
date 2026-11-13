// @ts-check
'use strict';

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
    createFinalizeFixture,
    commitFixture,
    requirePhaseArchiverWorkspace,
    requireFinalizeWorkspace,
    registryTable,
    phaseWorkbook,
    requireFinalizePlan,
    requireUpdateState,
    autoProgressState,
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
                { cwd: tempDir },
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'STATE.md should be created from template');
            const initialState = fs.readFileSync(statePath, 'utf8');
            assert.ok(/\*\*Status:\*\*\s+Active/.test(initialState), 'Status should be patched');
            assert.ok(/\*\*Phase:\*\*\s+1/.test(initialState), 'Phase should be patched');

            // 2. Add decision — should appear under Recent Decisions with today's date
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --decision="Adopt SDD workflow"`,
                { cwd: tempDir },
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
                { cwd: tempDir },
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
                { cwd: tempDir },
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
                    ['1', 'First', true],
                    ['2', 'Second', false],
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
            const writeLedger = ({ basedOn = '1.0.0', rows = [['1', 'Done']], tail = '' } = {}) =>
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
            for (const workflow of ['task', 'run']) {
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
            assert.deepStrictEqual(pending.nextUndecomposed, { phase: '2', name: 'Second' });
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
            writePlan({ version: '1.1.0' });
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Run /magicspec task engine to decompose Phase 2',
            );
            // … or the re-sync of the tasks when every phase has its row.
            writePlan({ version: '1.1.0', phases: [['1', 'First', true]] });
            assert.strictEqual(
                finalize.computeNextAction('plan', 'engine', wsDir),
                'Run /magicspec task engine to bring the tasks in line with the plan',
            );

            // A plan whose ledger is in step: the step the plan state computes — execute the open task.
            fs.mkdirSync(tasksDir, { recursive: true });
            writePlan({ version: '1.0.0', phases: [['1', 'First', false]] });
            writeLedger({ basedOn: '1.0.0', rows: [['1', 'In Progress']] });
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                phaseWorkbook(['- [ ] [T-1A01] Do the thing'], {
                    rest: [
                        '## Detailed Tracking',
                        '',
                        '### [T-1A01] Do the thing',
                        '',
                        '- **Status:** Todo',
                        '- **Assignment:** Agent',
                        '',
                    ],
                }),
            );
            for (const workflow of ['plan', 'task']) {
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
                    phaseWorkbook(['- [ ] [T-1A01] Do'], {
                        rest: [
                            '## Detailed Tracking',
                            '',
                            '### [T-1A01] Do',
                            '',
                            '- **Status:** Todo',
                            '- **Assignment:** Agent',
                            '',
                        ],
                    }),
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
            for (const workflow of ['task', 'run', 'plan']) {
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
            assert.deepStrictEqual(patterns, ['.magicspec/engine/PLAN.md']);
            const taskPatterns = significance.resolveWhitelist('magic.task', 'engine').patterns;
            assert.ok(
                !taskPatterns.some((pattern) => pattern.endsWith('PLAN.md')),
                'the task stage no longer writes the plan',
            );
            assert.ok(taskPatterns.includes('.magicspec/engine/TASKS.md'));
            assert.strictEqual(
                bullets.buildChangelogBullet('plan', 'engine', [
                    { path: '.magicspec/engine/PLAN.md', status: 'modified' },
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
        for (const body of ['spec', 'plan', 'task', 'run', 'rule']) {
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
                { recursive: true },
            );
            const put = (rel, body) => {
                fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
                fs.writeFileSync(path.join(dir, rel), body);
            };
            put('.gitignore', 'skills/magicspec/\n');
            put(
                '.magicspec/workspace.json',
                JSON.stringify({
                    default: 'ws',
                    workspaces: { ws: { description: 'fixture' } },
                    finalization: { enabled: true, autoBump: false, autoChangelog: false },
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
                    [path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'), ...args],
                    { cwd: dir, encoding: 'utf8', env: simEnv() },
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
                registered = ['l1-a.md'],
                planned = ['l1-a.md'],
                basedOn = '1.0.0',
                backlog = '*None.*',
            } = {}) => {
                fs.rmSync(planPath, { recursive: true, force: true });
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
            write({ backlog: '- **Design item** that needs a spec pass.' });
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
            write({ registered: ['l1-a.md', 'l1-b.md'] });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'an orphaned spec is pending work → funnel',
            );

            // (5) A plan built on an older registry version → funnel.
            write({ basedOn: '0.9.0' });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'a registry ahead of the plan is pending work → funnel',
            );

            // (6) Cannot tell (PLAN.md is a directory) → funnel, and it is recorded.
            write();
            fs.rmSync(planPath, { force: true });
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
            write({ registered: ['l1-a.md', 'l1-b.md'], basedOn: '0.9.0', backlog: '- open item' });
            const found = pendingWork.findPendingWork(wsDir);
            assert.deepStrictEqual(found.orphanedSpecs, ['l1-b.md'], 'the unplanned spec is named');
            assert.deepStrictEqual(
                found.syncGap,
                { planBasedOn: '0.9.0', indexVersion: '1.0.0' },
                'the version gap is reported with both sides',
            );
            assert.strictEqual(found.planComplete, true, 'the marker reads as a complete plan');
            assert.deepStrictEqual(
                found.openBacklogItems,
                ['- open item'],
                'the open bullet is listed',
            );
            assert.ok(found.registryEvaluated && found.backlogEvaluated, 'both checks ran');

            fs.rmSync(planPath, { force: true });
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
                for (const workflow of ['spec', 'task', 'run', 'rule']) {
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

    test('finalize.js patches STATE.md on the skip path (SC-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { designDir, wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n*None — plan complete.*\n',
            );
            // No whitelisted file changes after this baseline → skip path.
            commitFixture(tempDir);

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            assert.match(
                out,
                /No significant changes|Finalization complete/,
                'finalize should run on the skip path',
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(statePath),
                'SC-2: STATE.md created/patched even on the skip path',
            );
            const state = fs.readFileSync(statePath, 'utf8');
            assert.match(state, /\*\*Updated:\*\*/, 'STATE.md carries an Updated timestamp');
            assert.match(
                state,
                /\/magicspec plan main/,
                'SC-2.1 e2e: plan-complete next-action routes through the /magicspec plan funnel',
            );
            assert.doesNotMatch(
                state,
                /Next Action:.*\/magicspec spec/,
                '§5: the persisted Next Action never names /magicspec spec',
            );
            // SC-3 retirement regression pins: the STATE.md write dirties the
            // tree (previously the SC-3 fallback's trigger condition), but no
            // commit-related output is ever emitted any more.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
            assert.match(
                fs.readFileSync(path.join(designDir, '.version'), 'utf8'),
                /^0\.1\.0$/,
                'skip path does not bump the version',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js resolveWorkspaceDir: an explicit --workspace or MAGIC_WORKSPACE always outranks MAGIC_DESIGN_DIR (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize } = requireFinalizeWorkspace(tempDir);
            const designAbs = path.join(tempDir, '.magicspec');
            const savedDesignDir = process.env.MAGIC_DESIGN_DIR;
            const savedWorkspaceEnv = process.env.MAGIC_WORKSPACE;
            try {
                // A stale MAGIC_DESIGN_DIR naming a different workspace must never
                // win over an explicit --workspace flag.
                process.env.MAGIC_DESIGN_DIR = '.magicspec/other';
                delete process.env.MAGIC_WORKSPACE;
                assert.strictEqual(
                    finalize.resolveWorkspaceDir('engine', 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'an explicit --workspace must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Same precedence for MAGIC_WORKSPACE (no CLI flag, but the env
                // var that named `workspace` still outranks MAGIC_DESIGN_DIR).
                process.env.MAGIC_WORKSPACE = 'engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'MAGIC_WORKSPACE must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Legitimate case: neither a flag nor MAGIC_WORKSPACE was given,
                // so MAGIC_DESIGN_DIR was itself the signal resolveWorkspace()
                // used to name `workspace` — it is trusted as the literal directory.
                delete process.env.MAGIC_WORKSPACE;
                process.env.MAGIC_DESIGN_DIR = '.magicspec/engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.resolve(tempDir, '.magicspec/engine'),
                    'MAGIC_DESIGN_DIR is authoritative only when it is the sole naming signal',
                );
            } finally {
                if (savedDesignDir === undefined) delete process.env.MAGIC_DESIGN_DIR;
                else process.env.MAGIC_DESIGN_DIR = savedDesignDir;
                if (savedWorkspaceEnv === undefined) delete process.env.MAGIC_WORKSPACE;
                else process.env.MAGIC_WORKSPACE = savedWorkspaceEnv;
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js does not let a stale MAGIC_DESIGN_DIR redirect STATE.md away from an explicit --workspace (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [ ] [T-1A01] Todo\n',
            );

            // A second, unrelated workspace with its own STATE.md — never named
            // by this invocation's --workspace, only by a stale MAGIC_DESIGN_DIR
            // left in the environment (e.g. from an earlier command in the same
            // shell/session targeting a different workspace).
            const otherWsDir = makeWorkspace(tempDir, 'other');
            const otherStatePath = path.join(otherWsDir, 'STATE.md');
            const sentinel = [
                '# Project State',
                '',
                '**Workspace:** other',
                '**Updated:** 2020-01-01 00:00',
                '**Phase:** 1',
                '**Status:** Active',
                '',
                '## Current Position',
                '',
                '- **Task:** [T-0000] Sentinel — must never change',
                '- **Spec:** sentinel.md',
                '- **Next Action:** SENTINEL-UNTOUCHED',
                '',
            ].join('\n');
            fs.writeFileSync(otherStatePath, sentinel);
            commitFixture(tempDir);

            // An uncommitted, whitelisted change → the success path, matching
            // the shape of the real-world repro (a workflow that just landed
            // new TASKS.md content, then invoked finalize).
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
                env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/other' },
            });

            assert.match(
                out,
                /Finalization complete/,
                'the whitelisted TASKS.md change must still be significant',
            );
            assert.match(
                out,
                /\| Workspace \| main \|/,
                'finalize reports the explicitly-requested workspace',
            );
            assert.match(
                out,
                /\.magicspec[\\/]main[\\/]STATE\.md/,
                'STATE.md update must target the main workspace explicitly, not one named by MAGIC_DESIGN_DIR',
            );
            const mainStatePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(mainStatePath),
                'STATE.md must have been created/patched inside the main workspace directory',
            );
            const mainState = fs.readFileSync(mainStatePath, 'utf8');
            assert.match(
                mainState,
                /- \*\*Next Action:\*\* Plan complete/,
                'main STATE.md received the real computed Next Action, not the template placeholder',
            );
            assert.doesNotMatch(
                mainState,
                /SENTINEL/,
                "main STATE.md must never carry the other workspace's sentinel content",
            );

            assert.strictEqual(
                fs.readFileSync(otherStatePath, 'utf8'),
                sentinel,
                'the unrelated workspace named only by a stale MAGIC_DESIGN_DIR must be left byte-for-byte untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never recommends executing a task in a Blocked phase (SC-2.1(a))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const phaseFile = (status) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${status}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                ].join('\n');

            // The two Blocked signals are written by different steps and are not
            // updated atomically, so each must be sufficient on its own —
            // requiring agreement would wave a half-applied transition through.
            const blockedCases = {
                'frontmatter only': { registry: 'In Progress', phase: 'Blocked' },
                'registry row only': { registry: 'Blocked', phase: 'In Progress' },
                'both signals': { registry: 'Blocked', phase: 'Blocked' },
            };

            for (const [label, state] of Object.entries(blockedCases)) {
                fs.writeFileSync(tasksPath, registryTable(state.registry));
                fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile(state.phase));

                const next = finalize.computeNextAction('run', 'engine', wsDir);
                assert.doesNotMatch(
                    next,
                    /^Execute T-/,
                    `${label}: Blocked phase must not yield an execute-style recommendation → "${next}"`,
                );
                assert.match(next, /T-1A01/, `${label}: the blocked task should still be named`);
                // The redirected value passes the same single-exit screen.
                assert.doesNotMatch(
                    next,
                    /\/magicspec (spec|analyze)/,
                    `${label}: §5 reserved command leaked`,
                );
                assert.strictEqual(
                    (next.match(/\/magicspec [a-z]+/g) || []).length,
                    1,
                    `${label}: exactly one command expected → "${next}"`,
                );
            }

            // Control: an unblocked phase with the same open item still dispatches.
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('In Progress'));
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A01/,
                'a healthy phase must still resolve to execution — the guard must not fire on every phase',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction skips a task whose own Detailed Tracking marks it Blocked or Assignment: User (SC-2.1(c))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, title, status, assignment) =>
                [
                    `### [${id}] ${title}`,
                    '',
                    `- **Status:** ${status}`,
                    `- **Assignment:** ${assignment}`,
                    '',
                ].join('\n');

            const phaseFile = (firstStatus, firstAssignment) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', firstStatus, firstAssignment),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'Agent'),
                ].join('\n');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) first item Status: Blocked → the later actionable item is named.
            // The pre-T-23A01 code named T-1A01 unconditionally here (manually
            // confirmed against the single-match lookup during spec authoring —
            // same shape as the Phase 19 R12 negative-control pattern).
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Blocked', 'Agent'));
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'a Status: Blocked first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (ii) first item Assignment: User → the later actionable item is named.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'User'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'an Assignment: User first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (iii) every open item excluded → terminal branch: not Execute-style,
            // not the plan-complete funnel, no reserved command, exactly one
            // /magic.* command named.
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
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', 'Blocked', 'Agent'),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'User'),
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(
                next,
                /^Execute T-/,
                'all-excluded phase must not yield an execute-style recommendation',
            );
            assert.doesNotMatch(
                next,
                /Plan complete/,
                'all-excluded phase must not be reported as plan-complete — tasks remain',
            );
            assert.doesNotMatch(
                next,
                /\/magicspec (spec|analyze)/,
                'reserved command must not leak',
            );
            assert.strictEqual(
                (next.match(/\/magicspec [a-z]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.match(
                next,
                /T-1A01/,
                'the terminal message should still name a task for context',
            );

            // (iv) negative control — everything Todo/Agent still dispatches
            // normally, the same shape as the existing SC-2.1(a) control case.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'Agent'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A01/,
                'a fully agent-actionable phase must still dispatch its first task',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reads a "- [!]" checklist line as an unfinished, blocked task, never as a finished phase (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, status) =>
                [
                    `### [${id}] Task ${id}`,
                    '',
                    `- **Status:** ${status}`,
                    '- **Assignment:** Agent',
                    '',
                ].join('\n');
            const phaseFile = (items, tracking) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    ...items,
                    '',
                    '## Detailed Tracking',
                    '',
                    ...tracking,
                ].join('\n');
            const phasePath = path.join(tasksDir, 'phase-1.md');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) the reported shape: every open task written `- [!]`, each
            // tracking entry `Status: Blocked`. Neither glyph was a task to the
            // old reader, so the phase read as finished and the registry row
            // alone produced "Continue Phase 1 via /magicspec run".
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [!] [T-1A01] First task', '- [!] [T-1A02] Second task'],
                    [trackingBlock('T-1A01', 'Blocked'), trackingBlock('T-1A02', 'Blocked')],
                ),
            );
            const plan = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: plan.kind, id: plan.id },
                { kind: 'all-excluded', id: 'T-1A01' },
                'a phase holding only "- [!]" tasks has open work, none of it executable',
            );
            const next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(next, /^Continue Phase/, `registry fallback leaked → "${next}"`);
            assert.doesNotMatch(next, /^Execute T-/, `blocked task offered → "${next}"`);
            assert.doesNotMatch(next, /Plan complete/, `tasks remain → "${next}"`);
            assert.match(next, /T-1A01/, 'the terminal message should still name a task');
            assert.strictEqual(
                (next.match(/\/magicspec [a-z]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.strictEqual(
                finalize.reconcileStatus(plan, 'Active'),
                'Blocked',
                'the checkpoint Status must agree with the Next Action it was derived with',
            );

            // (ii) the glyph alone is the declaration: a tracking entry that
            // still says Todo does not turn a `- [!]` line back into work.
            fs.writeFileSync(
                phasePath,
                phaseFile(['- [!] [T-1A01] First task'], [trackingBlock('T-1A01', 'Todo')]),
            );
            assert.strictEqual(finalize.classifyPlanState(wsDir).kind, 'all-excluded');

            // (iii) a blocked line is skipped, not fatal: the next open line in
            // the same phase is named.
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [!] [T-1A01] First task', '- [ ] [T-1A02] Second task'],
                    [trackingBlock('T-1A01', 'Blocked'), trackingBlock('T-1A02', 'Todo')],
                ),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A02/,
                'an open task behind a blocked one must still dispatch',
            );

            // (iv) ...and so is a later phase file's task.
            fs.writeFileSync(
                phasePath,
                phaseFile(['- [!] [T-1A01] First task'], [trackingBlock('T-1A01', 'Blocked')]),
            );
            fs.writeFileSync(
                path.join(tasksDir, 'phase-2.md'),
                phaseFile(['- [ ] [T-2A01] Later task'], [trackingBlock('T-2A01', 'Todo')]),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-2A01/,
                'an actionable task in a later phase file must still dispatch',
            );
            fs.rmSync(path.join(tasksDir, 'phase-2.md'));

            // (v) negative control: a `- [!]` quoted in a code span is prose,
            // not a task (SH-1) — a finished plan stays finished.
            fs.writeFileSync(tasksPath, registryTable('Done'));
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [x] [T-1A01] First task'],
                    [
                        '### [T-1A01] Task T-1A01',
                        '',
                        '- **Status:** Done',
                        '- **Notes:** a blocked line reads `- [!] [T-1A09] quoted` here.',
                        '',
                    ],
                ),
            );
            assert.strictEqual(
                finalize.classifyPlanState(wsDir).kind,
                'complete',
                'a quoted "- [!]" must not be read as a task in force',
            );

            // (vi) legacy inline layout: the same two outcomes without a phase file.
            fs.rmSync(phasePath);
            fs.writeFileSync(tasksPath, '# Tasks\n\n- [!] [T-1A01] Only task\n');
            const inlineBlocked = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: inlineBlocked.kind, id: inlineBlocked.id },
                { kind: 'all-excluded', id: 'T-1A01' },
                'an inline "- [!]" must not be recommended as executable',
            );
            fs.writeFileSync(
                tasksPath,
                '# Tasks\n\n- [!] [T-1A01] Blocked one\n- [ ] [T-1A02] Open one\n',
            );
            const inlineOpen = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: inlineOpen.kind, id: inlineOpen.id },
                { kind: 'inline-open', id: 'T-1A02' },
                'an inline open task behind a blocked one must still dispatch',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a "- [!]" checklist line holds its phase back from archival and stays in the progress total (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Done by frontmatter, but one task is unresolved → stays in tasks/.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-30.md'),
                '---\nphase: 30\nname: "Held"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-30A01] Done\n- [!] [T-30A02] Blocked\n',
            );
            // Negative control: the same glyph quoted in a code span is prose.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-31.md'),
                '---\nphase: 31\nname: "Quoting"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-31A01] Done\n\n' +
                    '## Detailed Tracking\n\n### [T-31A01]\n- **Notes:** blocked reads `- [!]` here.\n',
            );
            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                !candidates.includes('phase-30.md'),
                'a phase with a "- [!]" task is unfinished and must not be archived',
            );
            assert.ok(
                candidates.includes('phase-31.md'),
                'a quoted "- [!]" must not block archival',
            );

            // Progress: one done, one blocked, one open → 1 of 3, not 1 of 1.
            const { updateState, wsDir: stateDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(stateDir, 'TASKS.md'),
                [
                    '### Phase 1 Checklist',
                    '',
                    '- [x] [T-1A01] Done',
                    '- [!] [T-1A02] Blocked',
                    '- [ ] [T-1A03] Open',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(
                path.join(stateDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 1: [0/0] ░░░░░░░░ 0%',
                    '```',
                    '',
                ].join('\n'),
            );
            assert.match(
                autoProgressState(updateState, stateDir),
                /Phase 1: \[1\/3\]/,
                'a blocked task is unfinished work and belongs in the total',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reconciles Status between Active and Blocked at the checkpoint, and only there (SC-1.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const { updateState } = requireFromFixture(tempDir, 'update-state.js');
            const statePath = path.join(wsDir, 'STATE.md');

            const setStatus = (value) => {
                if (!fs.existsSync(statePath)) updateState(wsDir, {});
                const text = fs.readFileSync(statePath, 'utf8');
                fs.writeFileSync(
                    statePath,
                    text.replace(/^\*\*Status:\*\* .*/m, `**Status:** ${value}`),
                );
            };
            const readStatus = () =>
                fs
                    .readFileSync(statePath, 'utf8')
                    .match(/^\*\*Status:\*\* (.+)$/m)[1]
                    .trim();
            const checkpoint = () =>
                finalize.updateSessionState({ workflow: 'run', dryRun: false }, 'engine', wsDir);

            const phaseFile = (phaseStatus, trackStatus, trackAssignment) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${phaseStatus}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                    '## Detailed Tracking',
                    '',
                    '### [T-1A01] Scaffold the app',
                    '',
                    `- **Status:** ${trackStatus}`,
                    `- **Assignment:** ${trackAssignment}`,
                    '',
                ].join('\n');
            const writeLedger = (registryStatus, phase) => {
                fs.writeFileSync(tasksPath, registryTable(registryStatus));
                const phasePath = path.join(tasksDir, 'phase-1.md');
                if (phase) fs.writeFileSync(phasePath, phaseFile(...phase));
                else fs.rmSync(phasePath, { force: true });
            };

            // ledger → [start value → value after the checkpoint]. `Paused` is a
            // hand-set value outside the engine's two, so it must survive every
            // ledger state; that column is the (e) control of the reconciliation.
            const ledgers = {
                'open agent task in a healthy phase (a)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Todo', 'Agent']),
                    expect: { Active: 'Active', Blocked: 'Active', Paused: 'Paused' },
                },
                'Blocked phase with an open task (b)': {
                    build: () => writeLedger('In Progress', ['Blocked', 'Todo', 'Agent']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'every open item Blocked (c)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Blocked', 'Agent']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'every open item assigned to the user (c)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Todo', 'User']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'plan complete (d)': {
                    build: () => writeLedger('Done', null),
                    expect: { Active: 'Active', Blocked: 'Active', Paused: 'Paused' },
                },
                'registry row not Done, no workbook to read': {
                    build: () => writeLedger('In Progress', null),
                    expect: { Active: 'Active', Blocked: 'Blocked', Paused: 'Paused' },
                },
            };

            for (const [label, ledger] of Object.entries(ledgers)) {
                for (const [start, want] of Object.entries(ledger.expect)) {
                    ledger.build();
                    setStatus(start);
                    const result = checkpoint();
                    assert.strictEqual(result.updated, true, `${label}: the checkpoint wrote`);
                    assert.strictEqual(
                        readStatus(),
                        want,
                        `${label}: Status ${start} should read ${want} after the checkpoint`,
                    );
                }
            }

            // One read, two derivations: the two fields cannot describe different plans.
            ledgers['Blocked phase with an open task (b)'].build();
            setStatus('Active');
            checkpoint();
            assert.match(
                fs.readFileSync(statePath, 'utf8'),
                /Next Action:\*\* Resolve blocker on T-1A01/,
            );
            assert.strictEqual(readStatus(), 'Blocked', 'Status and Next Action agree');

            // A preview reports the decision but writes nothing.
            setStatus('Active');
            const before = fs.readFileSync(statePath, 'utf8');
            const originalLog = console.log;
            const logged = [];
            console.log = (...args) => logged.push(args.join(' '));
            try {
                finalize.updateSessionState({ workflow: 'run', dryRun: true }, 'engine', wsDir);
            } finally {
                console.log = originalLog;
            }
            assert.strictEqual(fs.readFileSync(statePath, 'utf8'), before, 'dry-run wrote nothing');
            assert.match(logged.join('\n'), /Status=Blocked/, 'dry-run names the decision');

            // (f) The per-task call is not the reconciliation point: a task
            // transition with no --status leaves a stale Blocked alone.
            ledgers['open agent task in a healthy phase (a)'].build();
            setStatus('Blocked');
            updateState(wsDir, { task: 'T-1A01 Scaffold the app', nextAction: 'Continue' });
            assert.strictEqual(
                readStatus(),
                'Blocked',
                'a per-task update must never write Status (SC-1.1)',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction preserves code spans in task titles while still ignoring quoted checklist lines', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, writePhase } = requireFinalizePlan(tempDir);

            // (i) a title carrying a backticked path must survive verbatim.
            // `stripQuoted()` (SH-1) blanks matched characters rather than
            // removing them — same line count, not same character offsets —
            // so a title read from the stripped text loses the span. This
            // pins the field regression named `NEXT_ACTION_TITLE_STRIPPED`,
            // introduced by the SC-2.1(c) per-item scan itself.
            writePhase([
                '- [ ] [T-1A01] New `scripts/sync-engine-snapshot.js` (L2 snapshot writer)',
            ]);
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /`scripts\/sync-engine-snapshot\.js`/,
                `title's code span must survive verbatim → "${next}"`,
            );
            assert.doesNotMatch(
                next,
                / {2}/,
                `no double-space artifact from a blanked span → "${next}"`,
            );

            // (ii) control — the detector must still read stripped text, not
            // raw: a quoted checklist line in prose must not be picked up as
            // a real task. This is the assertion that stops a future fix
            // from reverting to raw content wholesale and reopening SH-1.
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
                    '- [ ] [T-1A01] Real actionable task',
                    '',
                    '## Notes',
                    '',
                    '`- [ ] [T-9Z99] Not a real task, just documentation`',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A01/, `quoted line must not be picked up → "${next}"`);
            assert.doesNotMatch(next, /T-9Z99/, `quoted task ID must not be named → "${next}"`);
        } finally {
            cleanup(tempDir);
        }
    });

    test('token-audit.js sums the context each turn re-reads, counts a repeated message once, and its hook speaks only past the threshold (token audit)', () => {
        const script = path.join(TESTS_DIR, '..', 'scripts', 'token-audit.js');
        const tempDir = createTempWorkspace();
        try {
            const turn = (id, usage) =>
                JSON.stringify({ type: 'assistant', message: { id, model: 'm', usage } });
            const transcript = path.join(tempDir, 'session.jsonl');
            fs.writeFileSync(
                transcript,
                [
                    turn('a', {
                        input_tokens: 10,
                        cache_creation_input_tokens: 90,
                        output_tokens: 5,
                    }),
                    turn('a', {
                        input_tokens: 10,
                        cache_creation_input_tokens: 90,
                        output_tokens: 5,
                    }),
                    turn('b', { input_tokens: 2, cache_read_input_tokens: 150, output_tokens: 7 }),
                    'not json at all',
                ].join('\n'),
            );

            const report = spawnSync('node', [script, '--session', transcript], {
                encoding: 'utf8',
            });
            assert.strictEqual(report.status, 0, report.stdout + report.stderr);
            assert.match(report.stdout, /turns=2 firstCtx=100 maxCtx=152 cacheRead=150/);

            const hook = (limit) =>
                spawnSync('node', [script, '--hook'], {
                    encoding: 'utf8',
                    input: JSON.stringify({ transcript_path: transcript }),
                    env: { ...process.env, TOKEN_AUDIT_WARN: String(limit) },
                }).stdout;
            assert.strictEqual(hook(153), '', 'below the threshold the hook prints nothing');
            const advice = JSON.parse(hook(152));
            assert.strictEqual(advice.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
            assert.match(advice.hookSpecificOutput.additionalContext, /152 tokens/);
        } finally {
            cleanup(tempDir);
        }
    });

    test('mutation-check.js reports CAUGHT, SURVIVED and REFUSED correctly and always restores the mutated file (mutation-control driver)', () => {
        const crypto = require('crypto');
        const digest = (file) =>
            crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        const driverPath = path.join(TESTS_DIR, '..', 'scripts', 'mutation-check.js');
        const driver = require(driverPath);

        const tempDir = createTempWorkspace();
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-outside-'));
        try {
            // Files a mutation must never touch, present so that only the guard refuses them.
            const outsideFile = path.join(outsideDir, 'elsewhere.js');
            fs.writeFileSync(outsideFile, 'a');
            const specFile = path.join(
                tempDir,
                '.magicspec',
                'engine',
                'specifications',
                'l1-x.md',
            );
            fs.mkdirSync(path.dirname(specFile), { recursive: true });
            fs.writeFileSync(specFile, 'a');

            // A throwaway project: one source file and one tiny node:test file
            // that guards its value and nothing else.
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            const source = path.join(tempDir, 'src', 'target.js');
            fs.writeFileSync(
                source,
                [
                    "'use strict';",
                    'const unguarded = 1; // no case reads this',
                    "const twin = 'x';",
                    "const twin2 = 'x';",
                    "module.exports = () => 'good';",
                    '',
                ].join('\n'),
            );
            const fixtureHarness = path.join(tempDir, 'fixture.test.js');
            fs.writeFileSync(
                fixtureHarness,
                [
                    "const { test } = require('node:test');",
                    "const assert = require('node:assert');",
                    "test('guards the value', () => {",
                    "    assert.strictEqual(require('./src/target.js')(), 'good');",
                    '});',
                    "test('an unrelated case', () => {",
                    '    assert.ok(true);',
                    '});',
                    '',
                ].join('\n'),
            );
            const original = digest(source);

            const list = [
                {
                    name: 'caught',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'guards the value',
                },
                {
                    name: 'survived',
                    file: 'src/target.js',
                    needle: 'const unguarded = 1;',
                    replacement: 'const unguarded = 2;',
                    test: 'guards the value',
                },
                {
                    name: 'needle twice',
                    file: 'src/target.js',
                    needle: "= 'x';",
                    replacement: "= 'y';",
                    test: 'guards the value',
                },
                {
                    name: 'needle absent',
                    file: 'src/target.js',
                    needle: 'not in the file',
                    replacement: 'x',
                    test: 'guards the value',
                },
                {
                    name: 'no such case',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'a case that does not exist',
                },
                {
                    name: 'outside the root',
                    file: path.relative(tempDir, outsideFile),
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                {
                    name: 'a specification',
                    file: '.magicspec/engine/specifications/l1-x.md',
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                { name: 'malformed', file: 'src/target.js' },
            ];
            const specPath = path.join(tempDir, 'mutations.json');
            fs.writeFileSync(specPath, JSON.stringify(list));

            // Through the command line, exactly as a task would use it.
            const cli = spawnSync(
                process.execPath,
                [driverPath, specPath, `--root=${tempDir}`, `--harness=${fixtureHarness}`],
                { cwd: tempDir, encoding: 'utf8' },
            );
            const verdictOf = (name) =>
                (cli.stdout.split('\n').find((line) => line.includes(` ${name}`)) || '').split(
                    /\s{2,}| — /,
                )[0];
            assert.strictEqual(cli.status, 1, 'a survivor or a refusal fails the run');
            assert.strictEqual(verdictOf('caught'), 'CAUGHT');
            assert.strictEqual(verdictOf('survived'), 'SURVIVED');
            for (const name of [
                'needle twice',
                'needle absent',
                'no such case',
                'outside the root',
                'a specification',
                'malformed',
            ]) {
                assert.strictEqual(verdictOf(name), 'REFUSED', name);
            }
            assert.match(
                cli.stdout,
                /8 mutation\(s\): 1 CAUGHT, 1 SURVIVED, 6 REFUSED, 0 RESTORE FAILED/,
            );
            assert.strictEqual(
                digest(source),
                original,
                'the file is byte-identical after the run',
            );
            assert.strictEqual(
                fs.readFileSync(outsideFile, 'utf8'),
                'a',
                'a file outside the root is untouched',
            );
            assert.strictEqual(
                fs.readFileSync(specFile, 'utf8'),
                'a',
                'a specification is untouched',
            );

            // A list in which every entry is caught exits 0.
            fs.writeFileSync(specPath, JSON.stringify([list[0]]));
            const clean = spawnSync(
                process.execPath,
                [driverPath, specPath, `--root=${tempDir}`, `--harness=${fixtureHarness}`],
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.strictEqual(clean.status, 0, clean.stdout);

            // A run that throws mid-mutation still leaves the file as it was, and
            // the replacement reached the file literally ("$&" is not a pattern).
            let seen = '';
            const lines = [];
            const results = driver.checkMutations(
                [
                    {
                        name: 'boom',
                        file: 'src/target.js',
                        needle: "'good'",
                        replacement: "'$&'",
                        test: 'x',
                    },
                ],
                {
                    root: tempDir,
                    harness: fixtureHarness,
                    log: (line) => lines.push(line),
                    run: () => {
                        seen = fs.readFileSync(source, 'utf8');
                        throw new Error('boom');
                    },
                },
            );
            assert.match(
                seen,
                /module\.exports = \(\) => '\$&';/,
                'the replacement was applied verbatim',
            );
            assert.strictEqual(results[0].verdict, 'REFUSED');
            assert.match(results[0].detail, /boom/);
            assert.strictEqual(
                digest(source),
                original,
                'a throwing run is restored byte for byte',
            );
        } finally {
            cleanup(tempDir);
            fs.rmSync(outsideDir, { recursive: true, force: true });
        }
    });

    test('finalize.js counts a RULES.md-only change as significant under magic.spec and not under magic.task (spec-side rule capture)', () => {
        // A T1–T4 capture during /magicspec spec writes the constitution and nothing
        // else, so the spec workflow's whitelist has to see RULES.md itself.
        for (const rulesRel of ['.magicspec/RULES.md', '.magicspec/main/RULES.md']) {
            const tempDir = createTempWorkspace(true);
            try {
                const { versionPath, finalizePath } = createFinalizeFixture(tempDir, {
                    workspace: 'main',
                    autoChangelog: true,
                });
                commitFixture(tempDir);
                fs.writeFileSync(
                    path.join(tempDir, rulesRel),
                    '# Rules\n\n- A rule captured during a spec session.\n',
                );
                const run = (workflow) =>
                    execSync(`node "${finalizePath}" --workflow=${workflow} --workspace=main`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    });

                // Control: the same change is not a plan change, so it counts for no one but the rule and spec workflows.
                const asTask = run('task');
                assert.match(asTask, /No significant changes/, `${rulesRel}: task workflow`);
                assert.strictEqual(fs.readFileSync(versionPath, 'utf8').trim(), '0.1.0');

                const asSpec = run('spec');
                assert.match(asSpec, /Finalization complete/, `${rulesRel}: spec workflow`);
                assert.match(asSpec, /RULES\.md/, `${rulesRel}: the changed file is listed`);
                assert.strictEqual(
                    fs.readFileSync(versionPath, 'utf8').trim(),
                    '0.1.1',
                    `${rulesRel}: the project version is bumped`,
                );
                assert.match(
                    fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8'),
                    rulesRel === '.magicspec/RULES.md'
                        ? /Updated global project rules \(main\)/
                        : /Updated workspace rules \(main\)/,
                    `${rulesRel}: a changelog entry describing the rules is written`,
                );
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('finalize.js names the workflow in the printed form /magicspec <command> on both outcomes, never the retired dotted name (CS-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
                autoChangelog: true,
            });
            commitFixture(tempDir);
            const run = (workflow) =>
                execSync(`node "${finalizePath}" --workflow=${workflow} --workspace=main`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                });

            // Skip outcome: nothing changed, so the plan workflow finds nothing significant.
            const skipped = run('plan');
            assert.match(
                skipped,
                /No significant changes detected for \/magicspec plan on workspace 'main'/,
            );
            assert.doesNotMatch(skipped, /\bmagic\.plan\b/, 'the skip line names no dotted form');

            // Success outcome: a constitution change is significant for the rule workflow.
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'RULES.md'),
                '# Rules\n\n- A rule that makes the change significant.\n',
            );
            const finished = run('rule');
            assert.match(finished, /Finalization complete/);
            assert.match(finished, /\| Workflow \| \/magicspec rule \|/);
            assert.doesNotMatch(finished, /\bmagic\.rule\b/, 'the table names no dotted form');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reports every changed file, not just whitelisted ones (stdout listing completeness)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, versionPath, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            fs.mkdirSync(path.join(tempDir, 'dev'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'dev', 'deliverable.js'), '// baseline\n');
            commitFixture(tempDir);

            // One whitelisted change (TASKS.md status flip) and one outside the
            // whitelist — the shape of every magic.run whose task produced real
            // source changes, since product code is never inside the whitelist.
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] Also done\n',
            );
            fs.writeFileSync(
                path.join(tempDir, 'dev', 'deliverable.js'),
                "// the task's actual output\n",
            );

            const out = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            // (a) Significance is unchanged: the whitelisted file still drives the bump.
            assert.match(
                out,
                /Finalization complete/,
                'whitelisted change must still be significant',
            );
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '0.1.1',
                'the whitelist subset alone must still decide the version bump',
            );

            // (b) The stdout listing names the non-whitelisted file alongside the whitelisted one.
            const artifacts = out.slice(
                out.indexOf('### Changed artifacts'),
                out.indexOf('### Next step'),
            );
            assert.match(
                artifacts,
                /dev\/deliverable\.js/,
                'stdout listing must name the non-whitelisted change',
            );
            assert.match(
                artifacts,
                /TASKS\.md/,
                'stdout listing must still name the whitelisted change',
            );

            // SC-3 retirement regression pin: no commit-message output at all.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('buildChangelogBullet keeps spec identifiers out of the product CHANGELOG (RC-11)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { buildChangelogBullet } = requireFromFixture(
                tempDir,
                'lib',
                'changelog-bullets.js',
            );

            // Asserted against the function's return value, not a written
            // CHANGELOG.md — only a real invocation touches that file, and this
            // generator is the only surface where the containment gates cannot
            // reach: nothing here is authored by a role or reviewed as a diff.
            const single = buildChangelogBullet('spec', 'main', [
                { path: '.magicspec/main/specifications/l1-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(
                single,
                /model-runtime/,
                'single-spec branch must not embed the artifact ID',
            );
            assert.match(single, /specification/, 'the bullet must still describe what changed');
            assert.match(
                single,
                /\(main\)/,
                'the workspace stays in the bullet — it is not an SDD identifier',
            );

            // The branch that was already correct must stay correct.
            const multi = buildChangelogBullet('spec', 'main', [
                { path: '.magicspec/main/specifications/l1-model-runtime.md', status: 'modified' },
                { path: '.magicspec/main/specifications/l2-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(multi, /model-runtime/, 'multi-spec branch must stay generic');

            // No other branch may regress into interpolating an identifier.
            const runBullet = buildChangelogBullet('run', 'main', [
                { path: '.magicspec/main/tasks/phase-7.md', status: 'modified' },
            ]);
            assert.doesNotMatch(
                runBullet,
                /phase-7/,
                'run branch must not embed a task-file identifier',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
