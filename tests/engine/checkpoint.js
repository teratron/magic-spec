// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    createTempWorkspace,
    cleanup,
    createFinalizeFixture,
    commitFixture,
} = require('./lib/base');
const { writeResumeFixture, treeDigest } = require('./lib/sim');

// ───────────────────────────────────────────────────────────────────────────
// The invocation record (SC-10): what `checkpoint` writes while a command runs.
// ───────────────────────────────────────────────────────────────────────────

module.exports = () => {
    const fixture = () => {
        const tempDir = createTempWorkspace();
        writeResumeFixture(tempDir, {
            engine: {
                entries: [],
            },
        });
        return tempDir;
    };

    const run = (tempDir, args, env = {}) =>
        spawnSync(
            process.execPath,
            [
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                'checkpoint',
                '--workspace=engine',
                ...args,
            ],
            {
                cwd: tempDir,
                encoding: 'utf8',
                env: {
                    ...process.env,
                    MAGIC_FINALIZE: '',
                    CLAUDE_CODE_SESSION_ID: 'session-1',
                    ...env,
                },
            },
        );

    const recordFile = (tempDir) =>
        path.join(tempDir, '.magicspec', '.cache', 'invocation', 'engine.json');
    const record = (tempDir) => JSON.parse(fs.readFileSync(recordFile(tempDir), 'utf8'));

    test('checkpoint records a command, its steps, files, answers and decisions, and a second start replaces it (SC-10(a),(b),(d), H11)', () => {
        const tempDir = fixture();
        try {
            assert.strictEqual(
                run(tempDir, [
                    '--start',
                    '--command=spec',
                    '--argument=--to 4 an idea',
                ]).status,
                0,
            );
            run(tempDir, [
                '--step=intake',
                '--answer=Who is it for? => the owner',
                '--answer=Where does it stop? => at the report',
            ]);
            run(tempDir, [
                '--step=written',
                '--files=a.md,.magicspec\\engine\\b.md,a.md',
                '--decision=[DR] one\nline',
            ]);
            run(tempDir, [
                '--step=review',
                '--files=a.md',
            ]);

            const found = record(tempDir);
            assert.strictEqual(found.command, 'spec');
            assert.strictEqual(found.argument, '--to 4 an idea');
            assert.strictEqual(found.parent, null);
            assert.strictEqual(found.session, 'session-1');
            assert.deepStrictEqual(
                found.steps.map((s) => s.step),
                [
                    'intake',
                    'written',
                    'review',
                ],
            );
            assert.deepStrictEqual(
                found.steps.map((s) => s.files),
                [
                    [],
                    [
                        '.magicspec/engine/b.md',
                    ],
                    [
                        'a.md',
                    ],
                ],
                'a file written again belongs to the latest step, and appears once',
            );
            assert.deepStrictEqual(found.answers, [
                {
                    question: 'Who is it for?',
                    answer: 'the owner',
                },
                {
                    question: 'Where does it stop?',
                    answer: 'at the report',
                },
            ]);
            assert.deepStrictEqual(found.decisions, [
                '[DR] one line',
            ]);

            run(tempDir, [
                '--start',
                '--command=plan',
            ]);
            const next = record(tempDir);
            assert.strictEqual(next.command, 'plan');
            assert.deepStrictEqual(next.steps, [], 'the new invocation replaces the old record');

            run(tempDir, [
                '--clear',
            ]);
            assert.ok(!fs.existsSync(recordFile(tempDir)));
        } finally {
            cleanup(tempDir);
        }
    });

    test('checkpoint keeps the record bounded: old steps fold into one that keeps their files, and long text is cut (SC-10(d), H11)', () => {
        const tempDir = fixture();
        try {
            const invocation = require(
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib', 'invocation.js'),
            );
            const designAbs = path.join(tempDir, '.magicspec');
            invocation.startInvocation(designAbs, 'engine', {
                command: 'run',
                argument: 'x'.repeat(5000),
            });
            for (let i = 1; i <= 52; i++) {
                invocation.addStep(designAbs, 'engine', {
                    step: `s${i}`,
                    files: [
                        `f${i}`,
                    ],
                });
            }
            const found = record(tempDir);
            assert.strictEqual(found.argument.length, 2000);
            assert.strictEqual(found.steps.length, 50);
            assert.strictEqual(found.steps[0].step, 'earlier');
            assert.deepStrictEqual(found.steps[0].files, [
                'f1',
                'f2',
                'f3',
            ]);
            assert.strictEqual(found.steps.at(-1).step, 's52');

            invocation.addStep(designAbs, 'engine', {
                step: 'many',
                files: Array.from(
                    {
                        length: 198,
                    },
                    (_, i) => `m${i}`,
                ),
            });
            const total = record(tempDir).steps.reduce((sum, s) => sum + s.files.length, 0);
            assert.strictEqual(total, 200, 'at most 200 files, the oldest dropped first');
        } finally {
            cleanup(tempDir);
        }
    });

    test('checkpoint nests an inner command into the record of goal or fix, and keeps the outer one as what a resume re-enters (SC-10)', () => {
        const tempDir = fixture();
        try {
            run(tempDir, [
                '--start',
                '--command=goal',
                '--argument=phase-3',
            ]);
            run(tempDir, [
                '--start',
                '--command=run',
                '--nested',
            ]);
            run(tempDir, [
                '--step=T-3A01 done',
            ]);
            const found = record(tempDir);
            assert.strictEqual(found.parent, 'goal');
            assert.strictEqual(found.command, 'run');
            assert.strictEqual(found.argument, 'phase-3');
            assert.strictEqual(found.steps[0].step, 'run: T-3A01 done');
            run(tempDir, [
                '--step=run',
            ]);
            assert.strictEqual(
                record(tempDir).steps[1].step,
                'run',
                'goal names a step by its command',
            );

            // Without the flag, or with no record of an outer command, a start replaces.
            run(tempDir, [
                '--start',
                '--command=spec',
            ]);
            assert.strictEqual(record(tempDir).parent, null);
            run(tempDir, [
                '--start',
                '--command=task',
                '--nested',
            ]);
            assert.strictEqual(record(tempDir).command, 'task');
            assert.strictEqual(record(tempDir).parent, null);
        } finally {
            cleanup(tempDir);
        }
    });

    test('checkpoint writes nothing while finalization is switched off (SC-10(c))', () => {
        const tempDir = fixture();
        try {
            const off = run(
                tempDir,
                [
                    '--start',
                    '--command=spec',
                ],
                {
                    MAGIC_FINALIZE: '0',
                },
            );
            assert.strictEqual(off.status, 0);
            assert.ok(!fs.existsSync(recordFile(tempDir)));

            const registry = path.join(tempDir, '.magicspec', 'workspace.json');
            const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
            data.finalization = {
                enabled: false,
            };
            fs.writeFileSync(registry, JSON.stringify(data));
            assert.strictEqual(
                run(tempDir, [
                    '--start',
                    '--command=spec',
                ]).status,
                0,
            );
            assert.ok(!fs.existsSync(recordFile(tempDir)));
        } finally {
            cleanup(tempDir);
        }
    });

    test('checkpoint never blocks: an unwritable record is one warning and exit 0, and a write that dies keeps the previous record (SC-10(d), H14)', () => {
        const tempDir = fixture();
        try {
            // A directory where the record belongs.
            fs.mkdirSync(recordFile(tempDir), {
                recursive: true,
            });
            const blocked = run(tempDir, [
                '--start',
                '--command=spec',
            ]);
            assert.strictEqual(blocked.status, 0);
            assert.strictEqual(blocked.stderr.trim().split('\n').length, 1, blocked.stderr);
            assert.match(blocked.stderr, /^\[checkpoint\] /);
            fs.rmSync(recordFile(tempDir), {
                recursive: true,
                force: true,
            });

            const invocation = require(
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib', 'invocation.js'),
            );
            const designAbs = path.join(tempDir, '.magicspec');
            invocation.startInvocation(designAbs, 'engine', {
                command: 'spec',
            });
            const before = treeDigest(path.dirname(recordFile(tempDir)));
            const rename = fs.renameSync;
            fs.renameSync = () => {
                throw new Error('the process died here');
            };
            try {
                assert.throws(() =>
                    invocation.addStep(designAbs, 'engine', {
                        step: 'written',
                    }),
                );
            } finally {
                fs.renameSync = rename;
            }
            assert.deepStrictEqual(
                treeDigest(path.dirname(recordFile(tempDir))),
                before,
                'the previous record is intact and no temporary file stays',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // One finalize run over a workspace that holds a record owned by `owner`; returns whether the
    // record survived it.
    const survivesFinalize = ({ owner = 'task', flags = [], stateBlocked = false }) => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
            });
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n');
            commitFixture(tempDir);
            if (stateBlocked) fs.mkdirSync(path.join(wsDir, 'STATE.md'));
            const file = path.join(tempDir, '.magicspec', '.cache', 'invocation', 'main.json');
            fs.mkdirSync(path.dirname(file), {
                recursive: true,
            });
            fs.writeFileSync(
                file,
                JSON.stringify({
                    command: owner,
                    steps: [],
                }),
            );
            const result = spawnSync(
                process.execPath,
                [
                    finalizePath,
                    '--workflow=task',
                    '--workspace=main',
                    ...flags,
                ],
                {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: {
                        ...process.env,
                        MAGIC_FINALIZE: '',
                    },
                },
            );
            assert.strictEqual(result.status, 0, result.stderr);
            return fs.existsSync(file);
        } finally {
            cleanup(tempDir);
        }
    };

    test('finalize.js removes the record only with a saved checkpoint, and only the record of the command it finalizes (SC-10(c), H12)', () => {
        assert.strictEqual(survivesFinalize({}), false, 'a successful finalize removes it');
        assert.strictEqual(
            survivesFinalize({
                flags: [
                    '--dry-run',
                ],
            }),
            true,
            'a preview removes nothing',
        );
        assert.strictEqual(
            survivesFinalize({
                stateBlocked: true,
            }),
            true,
            'a failed state update keeps the record',
        );
        assert.strictEqual(
            survivesFinalize({
                owner: 'goal',
            }),
            true,
            'a step finalized inside a goal leaves the goal record',
        );
    });

    test('checkpoint refuses an unregistered workspace and a call with no mode, writing nothing (SC-10)', () => {
        const tempDir = fixture();
        try {
            const wrong = spawnSync(
                process.execPath,
                [
                    path.join(tempDir, 'skills', 'magicspec', 'scripts', 'checkpoint.js'),
                    '--workspace=nowhere',
                    '--start',
                    '--command=spec',
                ],
                {
                    cwd: tempDir,
                    encoding: 'utf8',
                },
            );
            assert.strictEqual(wrong.status, 0);
            assert.match(wrong.stderr, /nothing recorded/);
            const none = run(tempDir, []);
            assert.strictEqual(none.status, 0);
            assert.match(none.stderr, /exactly one of --start, --step or --clear/);
            assert.ok(!fs.existsSync(path.join(tempDir, '.magicspec', '.cache', 'invocation')));
        } finally {
            cleanup(tempDir);
        }
    });
};
