// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const {
    createTempWorkspace,
    cleanup,
    copyStateTemplate,
    createFinalizeFixture,
    commitFixture,
    requireFinalizeWorkspace,
    registryTable,
    requireUpdateState,
    warnedBy,
} = require('./lib/base');
const { trackingEntry, resumeStateText, writeResumeFixture, treeDigest } = require('./lib/sim');

module.exports = () => {
    const runResumeState = (tempDir, args = []) =>
        spawnSync(
            process.execPath,
            [
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                'resume-state',
                ...args,
            ],
            { cwd: tempDir, encoding: 'utf8' },
        );

    test('resume-state stays silent when nothing is recorded in flight, even beside a stale handoff file or a hand-set Paused (SC-9(b), SC-9(g), H1)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: {
                    status: 'Active',
                    staleHandoff: true,
                    entries: [
                        trackingEntry('T-1A01', 'Finished', 'Done'),
                        trackingEntry('T-1A02', 'Later', 'Todo'),
                    ],
                },
            });
            assert.ok(
                fs.existsSync(path.join(tempDir, '.magicspec', 'engine', 'HANDOFF.json')),
                'fixture precondition: the stale snapshot is on disk',
            );

            const quiet = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(quiet.status, 0);
            assert.strictEqual(
                quiet.stdout,
                '',
                `a leftover snapshot with nothing in flight must not trigger a resume — the file's presence is not a trigger → "${quiet.stdout}"`,
            );

            // (a) A hand-set `Status: Paused` is inert: nothing is in flight, so nothing is said.
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'engine', 'STATE.md'),
                resumeStateText('Paused', 'Pick up T-1A02'),
            );
            const paused = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(paused.status, 0);
            assert.strictEqual(
                paused.stdout,
                '',
                `a hand-set Paused with nothing in flight must not trigger a resume → "${paused.stdout}"`,
            );

            // Control: the same tree with a task recorded In Progress does speak,
            // so the silence above is a decision and not a script that says nothing.
            writeResumeFixture(tempDir, {
                engine: {
                    status: 'Paused',
                    staleHandoff: true,
                    entries: [trackingEntry('T-1A02', 'Later', 'In Progress')],
                },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A02 Later in flight — 0 dead end\(s\) recorded\. Next: /,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state names one in-flight task with its dead ends and the modified-file count, identically for LF and CRLF (SC-9(d), (e), H2, H4)', () => {
        const printed = {};
        for (const eol of ['\n', '\r\n']) {
            const tempDir = createTempWorkspace(true);
            try {
                // Both the title and the Next Action carry a code span: stripping
                // deletes those, so each must be read back from the raw line.
                writeResumeFixture(
                    tempDir,
                    {
                        engine: {
                            nextAction:
                                'Execute T-1A01 Extract `finalize.js` via /magicspec run engine',
                            entries: [
                                trackingEntry('T-1A01', 'Extract `finalize.js`', 'In Progress', [
                                    '- **Attempts:**',
                                    '  - tried a global regex → it swallowed the next entry',
                                    '  - tried a line scan → it split on CRLF',
                                ]),
                                trackingEntry('T-1A02', 'Later', 'Todo'),
                            ],
                        },
                    },
                    { eol },
                );
                commitFixture(tempDir);

                // One tracked edit and one untracked file are product changes; the
                // workbook edit is bookkeeping the line already reports, so it must
                // not be counted.
                fs.appendFileSync(path.join(tempDir, 'README.md'), 'edit\n');
                fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, 'src', 'feature.js'), '// new\n');
                fs.appendFileSync(
                    path.join(tempDir, '.magicspec', 'engine', 'tasks', 'phase-1.md'),
                    'edited\n',
                );

                const result = runResumeState(tempDir, ['--workspace=engine']);
                assert.strictEqual(result.status, 0);
                printed[eol] = result.stdout;
            } finally {
                cleanup(tempDir);
            }
        }

        assert.strictEqual(
            printed['\r\n'],
            printed['\n'],
            "the line must not depend on the workbook's line endings",
        );
        assert.strictEqual(
            printed['\n'],
            '▶ Resume [engine]: T-1A01 Extract `finalize.js` in flight — 2 dead end(s) recorded, 2 file(s) modified. ' +
                'Next: Execute T-1A01 Extract `finalize.js` via /magicspec run engine\n',
            'one line: title and Next Action with their code spans intact, the recorded dead ends, and the two product files (not the workbook)',
        );
    });

    test('resume-state names every task in flight up to three, then counts the rest, and reads a workspace with a hand-set Paused exactly as any other (SC-9(f), SC-9(g), H3, H4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const inFlight = (id, title) => trackingEntry(id, title, 'In Progress');
            writeResumeFixture(tempDir, {
                engine: { entries: [inFlight('T-1A01', 'One'), inFlight('T-1B01', 'Two')] },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A01 One; T-1B01 Two in flight — 0 dead end\(s\) recorded\. Next: /,
                'two tasks in flight: both named',
            );

            writeResumeFixture(tempDir, {
                engine: {
                    entries: [
                        inFlight('T-1A01', 'One'),
                        inFlight('T-1B01', 'Two'),
                        inFlight('T-1C01', 'Three'),
                        inFlight('T-1D01', 'Four'),
                    ],
                },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A01 One; T-1B01 Two; T-1C01 Three \+1 more in flight — /,
                'four tasks in flight: three named, one counted',
            );

            writeResumeFixture(tempDir, {
                engine: { status: 'Paused', entries: [inFlight('T-1A01', 'One')] },
            });
            const withPaused = runResumeState(tempDir, ['--workspace=engine']).stdout;
            assert.match(
                withPaused,
                /^▶ Resume \[engine\]: T-1A01 One in flight — 0 dead end\(s\) recorded\. Next: /,
                'a hand-set Paused adds no marker: the line is the plain in-flight one',
            );
            assert.doesNotMatch(withPaused, /paused|snapshot/i);
            writeResumeFixture(tempDir, {
                engine: { status: 'Active', entries: [inFlight('T-1A01', 'One')] },
            });
            assert.strictEqual(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                withPaused,
                'the line does not depend on the Status value',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state omits the file count outside a repository and before the first commit, without an error (SC-9(e), H5)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'In Progress')] },
            });

            const outside = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(outside.status, 0);
            assert.match(
                outside.stdout,
                /^▶ Resume \[engine\]: T-1A01 Only in flight — 0 dead end\(s\) recorded\. Next: /,
            );
            assert.doesNotMatch(
                outside.stdout,
                /modified/,
                'not a repository: there is nothing to count',
            );
            assert.strictEqual(
                outside.stderr,
                '',
                "git's own diagnostics must not leak into a script that is silent by default",
            );

            // A repository whose first commit has not happened yet: "changed since HEAD" has no meaning.
            execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
            const uncommitted = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(uncommitted.status, 0);
            assert.doesNotMatch(
                uncommitted.stdout,
                /modified/,
                'no commit yet: the count must be omitted, not guessed',
            );
            assert.strictEqual(
                uncommitted.stderr,
                '',
                'a repository with no commit must not print git\'s "fatal:" line',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state writes nothing on a clean run and records exactly one finding for an unreadable STATE.md (read-only, DG-1, H6)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'Done')] },
            });

            const before = treeDigest(tempDir);
            const clean = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(clean.status, 0);
            assert.strictEqual(clean.stdout, '');
            assert.deepStrictEqual(
                treeDigest(tempDir),
                before,
                'a clean run must leave every file byte-identical',
            );
            assert.ok(
                !fs.existsSync(path.join(tempDir, '.magicspec', '.cache')),
                'a clean run must not even create the diagnostics directory',
            );

            // A STATE.md that exists but cannot be read is the script's one non-fatal condition.
            const statePath = path.join(tempDir, '.magicspec', 'engine', 'STATE.md');
            fs.rmSync(statePath);
            fs.mkdirSync(statePath);
            const beforeFault = treeDigest(tempDir);

            const faulty = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(
                faulty.status,
                0,
                "a fault here must never become a halt in someone else's workflow",
            );
            assert.strictEqual(faulty.stdout, '');
            assert.match(
                faulty.stderr,
                /cannot be read/,
                'printed, and recorded (DG-1: the record is in addition to the print)',
            );

            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
            const findings = fs
                .readFileSync(sinkPath, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line));
            assert.strictEqual(findings.length, 1, 'exactly one finding');
            assert.strictEqual(findings[0].code, 'RESUME_STATE_UNREADABLE');
            assert.strictEqual(findings[0].severity, 'warning');
            assert.strictEqual(findings[0].source, 'resume-state');

            const after = treeDigest(tempDir);
            delete after['.magicspec/.cache/diagnostics.jsonl'];
            delete after['.magicspec/.cache/'];
            assert.deepStrictEqual(
                after,
                beforeFault,
                'the finding is the only thing the run may have written',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state and computeNextAction read a tracking entry the same way: quoted labels and Attempts items change nothing (SC-8 parser safety, H7)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            writeResumeFixture(tempDir, { engine: {} });
            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            const workbook = (entries) =>
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
                    ...entries,
                ].join('\n');

            const plain = [
                trackingEntry('T-1A01', 'First task', 'In Progress'),
                trackingEntry('T-1A02', 'Second task', 'Todo'),
            ];
            // The same tasks, with the labels a reader must never take for the
            // entry's own quoted twice over: as a fenced template at column 0
            // *ahead of* the real fields (a reader that skipped the SH-1 strip
            // would find these first), and inside an `Attempts` item.
            const quoting = [
                [
                    '### [T-1A01] First task',
                    '',
                    '```plaintext',
                    '- **Status:** Blocked',
                    '- **Assignment:** User',
                    '```',
                    '',
                    '- **Status:** In Progress',
                    '- **Assignment:** Agent',
                    '- **Attempts:**',
                    '  - tried `**Status:** Blocked` and **Assignment:** User → rejected',
                    '',
                ].join('\n'),
                trackingEntry('T-1A02', 'Second task', 'Todo'),
            ];

            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), workbook(plain));
            const nextPlain = finalize.computeNextAction('run', 'engine', wsDir);
            const linePlain = runResumeState(tempDir, ['--workspace=engine']).stdout;

            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), workbook(quoting));
            const nextQuoting = finalize.computeNextAction('run', 'engine', wsDir);
            const lineQuoting = runResumeState(tempDir, ['--workspace=engine']).stdout;

            assert.match(
                nextPlain,
                /^Execute T-1A01 /,
                'fixture precondition: the in-flight first task is the next action',
            );
            assert.strictEqual(
                nextQuoting,
                nextPlain,
                'quoted labels must not change which task the Next Action names',
            );
            assert.match(linePlain, /T-1A01 First task in flight — 0 dead end\(s\) recorded/);
            assert.match(
                lineQuoting,
                /T-1A01 First task in flight — 1 dead end\(s\) recorded/,
                'the entry is still read as In Progress, and its one Attempts item is counted',
            );
            assert.doesNotMatch(
                lineQuoting,
                /T-1A02/,
                'the Todo task must not be listed as in flight',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state scope: the workspace the executor resolved by default, one workspace on --workspace, every registered one only under --all (l2-session-checkpoint §5.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const inFlight = (title) => ({
                entries: [trackingEntry('T-1A01', title, 'In Progress')],
            });
            writeResumeFixture(
                tempDir,
                {
                    alpha: inFlight('Alpha task'),
                    beta: inFlight('Beta task'),
                    gamma: inFlight('Gamma task'),
                    delta: inFlight('Delta task'),
                    quiet: { entries: [trackingEntry('T-1A01', 'Quiet task', 'Done')] },
                },
                { defaultWorkspace: 'alpha' },
            );

            // executor.js consumes --workspace and substitutes the registry
            // default when it is absent, handing the result on only as
            // MAGIC_DESIGN_DIR — so "no flag" can mean "the default", never "all".
            const byDefault = runResumeState(tempDir).stdout.trim().split('\n');
            assert.strictEqual(byDefault.length, 1, 'no flag: exactly the default workspace');
            assert.match(byDefault[0], /^▶ Resume \[alpha\]: /);

            const beta = runResumeState(tempDir, ['--workspace=beta']).stdout.trim().split('\n');
            assert.strictEqual(beta.length, 1, '--workspace: exactly that workspace');
            assert.match(beta[0], /^▶ Resume \[beta\]: /);

            const all = runResumeState(tempDir, ['--all']).stdout.trim().split('\n');
            assert.strictEqual(all.length, 4, 'three workspace lines and one overflow line');
            assert.match(all[3], /^▶ Resume: \+1 more workspace\(s\) with work in flight$/);
            assert.doesNotMatch(
                all.join('\n'),
                /Quiet/,
                'a workspace with nothing in flight is not reported',
            );

            // Direct invocation (no executor): faults are silence, and an explicit
            // --workspace narrows --all.
            const direct = (args) =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(tempDir, 'skills', 'magicspec', 'scripts', 'resume-state.js'),
                        ...args,
                    ],
                    { cwd: tempDir, encoding: 'utf8' },
                );
            for (const args of [['--workspace=nope'], ['--workspace']]) {
                const result = direct(args);
                assert.strictEqual(result.status, 0, `${args.join(' ')}: never a non-zero exit`);
                assert.strictEqual(result.stdout, '', `${args.join(' ')}: silence`);
            }
            assert.match(
                direct(['--all', '--workspace=gamma']).stdout,
                /^▶ Resume \[gamma\]: .*\n$/,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state --json returns the documented shape, and { in_flight: false } when nothing is in flight', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: {
                    entries: [
                        trackingEntry('T-1A01', 'Only', 'In Progress', [
                            '- **Attempts:**',
                            '  - tried X → failed',
                        ]),
                    ],
                },
            });
            const parsed = JSON.parse(
                runResumeState(tempDir, ['--workspace=engine', '--json']).stdout,
            );
            assert.strictEqual(parsed.in_flight, true);
            assert.strictEqual(parsed.workspaces.length, 1);
            const entry = parsed.workspaces[0];
            assert.deepStrictEqual(Object.keys(entry).sort(), [
                'changed_files',
                'next_action',
                'source',
                'tasks',
                'workspace',
            ]);
            assert.strictEqual(entry.source, 'in-progress');
            assert.deepStrictEqual(entry.tasks, [{ id: 'T-1A01', title: 'Only', attempts: 1 }]);
            assert.strictEqual(entry.changed_files, null, 'not a repository: null, not zero');
            assert.strictEqual(entry.next_action, 'Execute T-1A01 Thing via /magicspec run engine');

            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'Done')] },
            });
            assert.deepStrictEqual(
                JSON.parse(runResumeState(tempDir, ['--workspace=engine', '--json']).stdout),
                { in_flight: false, workspaces: [] },
            );
        } finally {
            cleanup(tempDir);
        }
    });

    const RESUME_GOAL = {
        statement: 'the import works',
        criteria: [
            { state: 'met', text: 'CSV round-trips', check: 'scenario S-1' },
            { state: 'open', text: 'JSON round-trips', check: 'scenario S-2' },
            { state: 'open', text: 'XML round-trips', check: 'scenario S-3' },
            { state: 'blocked', text: 'Excel round-trips', check: 'a decision' },
        ],
        consents: [{ action: 'delete the old importer', reason: 'a destructive action' }],
    };
    const RESUME_GOAL_COUNTS = '1 met, 2 open, 1 blocked, 1 consent(s) queued';

    test('resume-state reports a recorded goal in its one line: alone it names the goal, the criteria counts and /magicspec goal, beside a task in flight it is the same line (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Thing', 'Done')], goal: RESUME_GOAL },
            });
            const alone = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(alone.status, 0);
            assert.strictEqual(
                alone.stdout,
                `▶ Resume [engine]: goal "the import works" — ${RESUME_GOAL_COUNTS}. Next: /magicspec goal\n`,
            );

            writeResumeFixture(tempDir, {
                engine: {
                    entries: [trackingEntry('T-1A01', 'Thing', 'In Progress')],
                    goal: RESUME_GOAL,
                },
            });
            const both = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(both.stdout.trim().split('\n').length, 1, 'one line, not two');
            assert.strictEqual(
                both.stdout,
                `▶ Resume [engine]: T-1A01 Thing in flight — 0 dead end(s) recorded; goal "the import works" — ${RESUME_GOAL_COUNTS}. ` +
                    'Next: Execute T-1A01 Thing via /magicspec run engine\n',
            );

            // A phase or a task count is a goal like a statement, and names itself the way the commands spell it.
            writeResumeFixture(tempDir, {
                engine: {
                    entries: [],
                    goal: {
                        phase: 3,
                        taskLimit: 5,
                        criteria: [{ state: 'open', text: 'T-3A01 done' }],
                    },
                },
            });
            assert.strictEqual(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                '▶ Resume [engine]: goal phase-3 5 tasks — 0 met, 1 open, 0 blocked. Next: /magicspec goal\n',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state is silent for a goal section that names no goal, and its --json carries the goal only where one is recorded (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = writeResumeFixture(tempDir, { engine: { entries: [] } });
            const statePath = path.join(designDir, 'engine', 'STATE.md');
            fs.writeFileSync(
                statePath,
                fs
                    .readFileSync(statePath, 'utf8')
                    .replace(
                        '## Session Continuity',
                        '## Goal\n\n<!-- nothing recorded -->\n\n## Session Continuity',
                    ),
            );
            const empty = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(empty.status, 0);
            assert.strictEqual(empty.stdout, '', 'an empty block prints nothing');
            assert.deepStrictEqual(
                JSON.parse(runResumeState(tempDir, ['--workspace=engine', '--json']).stdout),
                {
                    in_flight: false,
                    workspaces: [],
                },
            );

            writeResumeFixture(tempDir, { engine: { entries: [], goal: RESUME_GOAL } });
            const parsed = JSON.parse(
                runResumeState(tempDir, ['--workspace=engine', '--json']).stdout,
            );
            assert.strictEqual(parsed.in_flight, false, 'in_flight still means a task in flight');
            assert.strictEqual(parsed.workspaces.length, 1);
            assert.deepStrictEqual(parsed.workspaces[0].tasks, []);
            assert.deepStrictEqual(parsed.workspaces[0].goal, {
                scope: '"the import works"',
                statement: 'the import works',
                phase: null,
                task_limit: null,
                bound: null,
                criteria: { met: 1, open: 2, blocked: 1 },
                consents: 1,
                without_progress: 0,
                tasks_done: 0,
            });

            // With no goal the entry keeps the shape it always had.
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'In Progress')] },
            });
            const plain = JSON.parse(
                runResumeState(tempDir, ['--workspace=engine', '--json']).stdout,
            );
            assert.ok(!('goal' in plain.workspaces[0]), 'no goal key where none is recorded');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 21. Checkpoint contract — the state template's writer map (SC-1.3) and the
    //     finalize checkpoint claim (SC-6.1).
    // ───────────────────────────────────────────────────────────────────────────

    // Every field the state template declares, against the `updateState` patch
    // key that writes it. The table is the contract's statement of "no dead
    // field": a template field without a row has no writer and would go stale in
    // every consumer's STATE.md (the retired `Last Session Ended` did exactly
    // that), and a row without a template field is a writer for a line the file
    // no longer carries. `update-state.js` keeps its own field map private, so
    // the check is driven through behavior — patch each field, read the file back.
    const STATE_FIELD_WRITERS = {
        Workspace: 'workspace',
        Updated: 'updated',
        Phase: 'phase',
        Status: 'status',
        Task: 'task',
        Spec: 'spec',
        'Next Action': 'nextAction',
        'Bootstrap Mode': 'bootstrap',
    };

    test('the STATE.md template declares only fields update-state writes, never a dead one such as Last Session Ended (SC-1.3, H8)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const template = fs.readFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'),
                'utf8',
            );
            const declared = [...template.matchAll(/^(?:- )?\*\*([^*\n]+):\*\*/gm)].map(
                (match) => match[1],
            );

            assert.ok(
                !declared.includes('Last Session Ended'),
                'the retired field must not return: nothing ever wrote it after the first bootstrap',
            );
            assert.deepStrictEqual(
                [...declared].sort(),
                Object.keys(STATE_FIELD_WRITERS).sort(),
                'every template field needs a writer row here, and every row a template field',
            );

            // Each row's key must really write its own label's line.
            const { updateState, wsDir } = requireUpdateState(tempDir);
            const statePath = path.join(wsDir, 'STATE.md');
            warnedBy(() => updateState(wsDir, {}));
            for (const [label, key] of Object.entries(STATE_FIELD_WRITERS)) {
                if (key === 'updated') continue; // stamped by every call, never requested
                const value = `written-through-${key}`;
                warnedBy(() => updateState(wsDir, { [key]: value }));
                assert.match(
                    fs.readFileSync(statePath, 'utf8'),
                    new RegExp(`^(?:- )?\\*\\*${label}:\\*\\* ${value}$`, 'm'),
                    `patch key '${key}' must write the '${label}' line`,
                );
            }
            assert.match(
                fs.readFileSync(statePath, 'utf8'),
                /^\*\*Updated:\*\* \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/m,
                'Updated is stamped by every call, so the template placeholder must be gone',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // One finalize run against a fresh git-backed fixture. `change` leaves an
    // uncommitted edit to a whitelisted file (the significant path), otherwise
    // nothing changed since the baseline (the skip path). `stateBlocked` puts a
    // directory where STATE.md belongs, so the update cannot be written — under
    // `--workflow=task`, whose significance scan does not read STATE.md; the
    // `run` whitelist does, and would stop the whole run before any update.
    const runFinalizeCheckpoint = ({ change, dryRun = false, stateBlocked = false }) => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            commitFixture(tempDir);
            if (change) {
                fs.writeFileSync(
                    path.join(wsDir, 'TASKS.md'),
                    '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] More\n',
                );
            }
            const statePath = path.join(wsDir, 'STATE.md');
            if (stateBlocked) fs.mkdirSync(statePath);

            const result = spawnSync(
                process.execPath,
                [
                    finalizePath,
                    '--workflow=task',
                    '--workspace=main',
                    ...(dryRun ? ['--dry-run'] : []),
                ],
                { cwd: tempDir, encoding: 'utf8' },
            );
            return {
                result,
                stateWritten: fs.existsSync(statePath) && fs.statSync(statePath).isFile(),
            };
        } finally {
            cleanup(tempDir);
        }
    };

    test('finalize.js claims a saved checkpoint only once STATE.md was really updated, on both exit paths (SC-6.1, H9)', () => {
        const claim = /checkpoint saved/;
        const path_ = (change) => (change ? 'significant' : 'skip');

        // The claim rides the STATE.md row on the significant path...
        const significant = runFinalizeCheckpoint({ change: true });
        assert.strictEqual(significant.result.status, 0);
        assert.match(
            significant.result.stdout,
            /^\| STATE\.md \|[^\n]*checkpoint saved/m,
            'significant path: the STATE.md row carries the claim',
        );
        assert.ok(significant.stateWritten, 'the claim must be backed by a STATE.md on disk');

        // ...and is its own line on the skip path.
        const skipped = runFinalizeCheckpoint({ change: false });
        assert.strictEqual(skipped.result.status, 0);
        assert.match(
            skipped.result.stdout,
            /^\[state\] STATE\.md updated — checkpoint saved\.$/m,
            'skip path: the claim follows the update',
        );
        assert.ok(skipped.stateWritten, 'the claim must be backed by a STATE.md on disk');

        // A preview saves nothing, so it claims nothing.
        for (const change of [true, false]) {
            const preview = runFinalizeCheckpoint({ change, dryRun: true });
            assert.strictEqual(preview.result.status, 0);
            assert.doesNotMatch(
                preview.result.stdout,
                claim,
                `--dry-run (${path_(change)} path) must not claim a save`,
            );
            assert.strictEqual(
                preview.stateWritten,
                false,
                `--dry-run (${path_(change)} path) must not write STATE.md`,
            );
        }

        // A failed update is not a saved checkpoint, and does not block finalize.
        for (const change of [true, false]) {
            const failed = runFinalizeCheckpoint({ change, stateBlocked: true });
            assert.strictEqual(failed.result.status, 0, 'a STATE.md failure is non-blocking');
            assert.match(
                failed.result.stderr,
                /STATE\.md update skipped/,
                'the failure must be announced',
            );
            assert.doesNotMatch(
                failed.result.stdout + failed.result.stderr,
                claim,
                `an unwritable STATE.md (${path_(change)} path) must not be reported as a saved checkpoint`,
            );
            assert.strictEqual(
                failed.stateWritten,
                false,
                'the blocked path must not have become a file',
            );
        }
    });

    // One --workflow=run finalize invocation against a fresh git-backed
    // fixture with a Done task (so TASKS.md alone would not force the
    // significant path — the assertions below are about STATE.md's own
    // whitelisted-hash handling, not about TASKS.md's status-flip filter).
    // `stateDirBlock: true` puts a directory where STATE.md belongs, the
    // shape that used to throw uncaught out of the significance snapshot
    // (R44, l2-engine-finalization.md §9) — `false` leaves it genuinely
    // absent, the sibling condition that must stay `null`, not `'UNREADABLE'`.
    const runFinalizeRunWithState = ({ stateDirBlock }) => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            if (stateDirBlock) fs.mkdirSync(path.join(wsDir, 'STATE.md'));
            commitFixture(tempDir);

            const result = spawnSync(
                process.execPath,
                [finalizePath, '--workflow=run', '--workspace=main'],
                { cwd: tempDir, encoding: 'utf8' },
            );
            return { result };
        } finally {
            cleanup(tempDir);
        }
    };

    test('finalize.js under --workflow=run survives an unreadable whitelisted STATE.md instead of aborting (R44, l2-engine-finalization.md §9)', () => {
        // The bug: STATE.md is in magic.run's whitelist (unlike magic.task,
        // whose own STATE.md write sits behind a separate, already-guarded
        // try/catch — see runFinalizeCheckpoint above), so a directory at its
        // path made the significance snapshot's hashFileSafe throw uncaught,
        // aborting the whole invocation before anything else ran: no version
        // bump, no archival, no CHANGELOG, no digest.
        const { result } = runFinalizeRunWithState({ stateDirBlock: true });

        assert.strictEqual(
            result.status,
            0,
            'an unreadable whitelisted file must not crash finalize',
        );
        assert.match(
            result.stdout,
            /SIGNIFICANCE_HASH_UNREADABLE/,
            'the read failure must surface as a diagnostic, not pass in silence',
        );
        assert.match(
            result.stdout,
            /STATE\.md/,
            'the diagnostic must name the file that could not be read',
        );
    });

    test('finalize.js treats a genuinely absent whitelisted file as unchanged, not UNREADABLE (control)', () => {
        // No STATE.md at all — never created (makeWorkspace only mkdirs the
        // workspace itself), not a directory either. The two conditions
        // (absent vs. unreadable) must not collapse into one code path.
        const { result } = runFinalizeRunWithState({ stateDirBlock: false });

        assert.strictEqual(result.status, 0);
        assert.doesNotMatch(
            result.stdout,
            /SIGNIFICANCE_HASH_UNREADABLE/,
            'a genuinely absent file hashes to null, not UNREADABLE — no diagnostic',
        );
    });
};
