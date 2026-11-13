// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    createFinalizeFixture,
    commitFixture,
} = require('./lib/base');
const {
    writeRevalidateFixture,
    admitRevalidateFixture,
    revalidateFixtureCount,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 16a. lib/diagnostics.js — collector contract (DG-1..DG-9)
    // ───────────────────────────────────────────────────────────────────────────

    // Plan-complete TASKS.md, committed — the skip-path baseline every
    // diagnostics-digest test below starts from before layering its own change.
    const commitPlanCompleteFixture = (tempDir, wsDir) => {
        fs.writeFileSync(
            path.join(wsDir, 'TASKS.md'),
            '## Active Phases\n\n*None — plan complete.*\n',
        );
        commitFixture(tempDir);
    };

    // Bootstraps a finalize fixture already committed at plan-complete, plus a
    // fresh diagnostics.js handle — the pairing every DG-4.1/DG-5 test below
    // starts from.
    const requireFinalizeDiagnostics = (tempDir) => {
        const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
        commitPlanCompleteFixture(tempDir, wsDir);
        return {
            wsDir,
            finalizePath,
            diagnostics: requireFromFixture(tempDir, 'lib', 'diagnostics.js'),
        };
    };

    test('diagnostics.js record/read/drain round-trip in append order, exactly once (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'a missing sink reads as empty, not an error',
            );

            const findings = [
                { severity: 'error', source: 'a', code: 'A1', message: 'first' },
                { severity: 'warning', source: 'b', code: 'B1', message: 'second' },
                { severity: 'fix', source: 'c', code: 'C1', message: 'third' },
            ];
            for (const f of findings) {
                assert.strictEqual(
                    diagnostics.record(f),
                    true,
                    `record() should succeed for ${f.code}`,
                );
            }

            const drained = diagnostics.drain();
            assert.strictEqual(drained.length, 3, 'all three findings should drain');
            assert.deepStrictEqual(
                drained.map((f) => f.code),
                ['A1', 'B1', 'C1'],
                'findings must drain in append order',
            );

            assert.deepStrictEqual(
                diagnostics.drain(),
                [],
                'a second drain must return nothing — exactly-once delivery',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.record() never throws, even when the sink cannot be written (DG-9)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            // Occupy .magicspec/.cache with a file so the sink's parent path
            // cannot resolve to a directory — the write itself must fail.
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', '.cache'), 'not a directory');

            let result;
            assert.doesNotThrow(() => {
                result = diagnostics.record({
                    severity: 'warning',
                    source: 'test',
                    code: 'X',
                    message: 'm',
                });
            }, 'record() must never throw, regardless of why the write failed');
            assert.strictEqual(
                result,
                false,
                'a failed write must report false, not silently succeed',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.read() drains every parseable line even when one is truncated (DG-9 corollary)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            diagnostics.record({
                severity: 'warning',
                source: 'a',
                code: 'BEFORE',
                message: 'first',
            });

            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
            fs.appendFileSync(sinkPath, '{"severity":"error","source":"b","code":"TRUNC","mess\n');

            diagnostics.record({ severity: 'fix', source: 'c', code: 'AFTER', message: 'third' });

            const findings = diagnostics.drain();
            const codes = findings.map((f) => f.code);
            assert.ok(
                codes.includes('BEFORE'),
                'a finding recorded before the corrupt line must survive',
            );
            assert.ok(
                codes.includes('AFTER'),
                'a finding recorded after the corrupt line must survive — the tail is not lost',
            );
            assert.ok(
                !codes.includes('TRUNC'),
                'the corrupt line itself must not appear as a finding',
            );
            assert.strictEqual(
                findings.length,
                2,
                'exactly the two valid lines should drain, no more, no fewer',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.formatDigest dedups with an occurrence count and caps with an omission line (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            assert.deepStrictEqual(
                diagnostics.formatDigest([]),
                [],
                'empty input must render nothing — not a heading with no body',
            );

            // 12 identical (severity, source, code) findings collapse to one entry.
            const repeated = Array.from({ length: 12 }, () => ({
                severity: 'warning',
                source: 'update-state',
                code: 'STATE_CAP_EXHAUSTED',
                message: 'cap exhausted',
            }));
            const repeatedDigest = diagnostics.formatDigest(repeated).join('\n');
            assert.match(
                repeatedDigest,
                /STATE_CAP_EXHAUSTED.*\(×12\)/,
                'twelve identical findings must collapse to one line with a ×12 count',
            );
            assert.strictEqual(
                (repeatedDigest.match(/STATE_CAP_EXHAUSTED/g) || []).length,
                1,
                'the code must appear exactly once, not twelve times',
            );

            // 20 distinct findings: 15 rendered, 5 reported as omitted.
            const distinct = Array.from({ length: 20 }, (_, i) => ({
                severity: 'warning',
                source: 'test',
                code: `CODE_${i}`,
                message: `finding ${i}`,
            }));
            const distinctLines = diagnostics.formatDigest(distinct);
            const bulletCount = distinctLines.filter(
                (l) => l.startsWith('- ') && !l.includes('more finding'),
            ).length;
            assert.strictEqual(bulletCount, 15, 'the render cap must stop at 15 distinct findings');
            assert.match(
                distinctLines.join('\n'),
                /\+5 more findings not listed/,
                'the omission must state how many were left out',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics dedup keeps findings apart whose source and code differ only at the field boundary (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            // ("a" + "BC") and ("aB" + "C") concatenate to the same text, so only a
            // real separator between the key's fields keeps them two findings. The
            // separator is U+0000 and has to survive being written as the `\0`
            // escape rather than as a raw byte — dropping it would merge these.
            const findings = [
                { severity: 'warning', source: 'a', code: 'BC', message: 'first finding' },
                { severity: 'warning', source: 'aB', code: 'C', message: 'second finding' },
            ];

            assert.strictEqual(
                diagnostics.summarize(findings).total,
                2,
                'distinct findings must not collapse into one',
            );
            const digest = diagnostics.formatDigest(findings).join('\n');
            assert.match(digest, /first finding/, 'the first finding must render');
            assert.match(digest, /second finding/, 'the second finding must render');
        } finally {
            cleanup(tempDir);
        }
    });

    const testRevalidate = (findings, checkFn) => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = admitRevalidateFixture(
                requireFromFixture(tempDir, 'lib', 'diagnostics.js'),
            );
            const survivors = diagnostics.revalidate(findings);
            checkFn(survivors, tempDir);
        } finally {
            cleanup(tempDir);
        }
    };

    test('revalidate() drops a finding whose recheck no longer reproduces the code (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'GONE',
                    message: 'was true at record time',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { MAGIC_FIXTURE_WARNINGS: '[]' },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    0,
                    'a finding whose recheck reports no matching code must be dropped',
                );
            },
        );
    });

    test('revalidate() keeps a finding whose recheck still reproduces the code (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'STILL_OPEN',
                    message: 'condition persists',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { MAGIC_FIXTURE_WARNINGS: JSON.stringify([{ type: 'STILL_OPEN' }]) },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    1,
                    'a finding whose recheck still reports its code must survive unchanged',
                );
                assert.strictEqual(survivors[0].code, 'STILL_OPEN');
            },
        );
    });

    test('revalidate() spawns one recheck process per distinct signature, not one per finding (DG-10)', () => {
        const sharedRecheck = {
            script: 'revalidate-fixture',
            args: ['shared'],
            env: { MAGIC_FIXTURE_WARNINGS: JSON.stringify([{ type: 'A' }, { type: 'B' }]) },
        };
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'A',
                    message: 'm',
                    recheck: sharedRecheck,
                },
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'B',
                    message: 'm',
                    recheck: sharedRecheck,
                },
            ],
            (survivors, tempDir) => {
                assert.strictEqual(
                    revalidateFixtureCount(tempDir),
                    1,
                    'two findings sharing one recheck signature must spawn exactly one process',
                );
                assert.deepStrictEqual(
                    survivors.map((f) => f.code).sort(),
                    ['A', 'B'],
                    'both findings survive — the shared recheck reproduced both codes',
                );
            },
        );
    });

    test('revalidate() leaves a finding untouched when its recheck cannot be run (DG-10 extends DG-9)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            const survivors = diagnostics.revalidate([
                {
                    severity: 'error',
                    source: 'test',
                    code: 'UNCHECKABLE',
                    message: 'recheck target does not exist',
                    recheck: { script: 'does-not-exist-xyz', args: [], env: {} },
                },
            ]);

            assert.strictEqual(
                survivors.length,
                1,
                'a recheck that cannot be spawned must fail open — the finding renders as recorded, not dropped',
            );
            assert.strictEqual(survivors[0].code, 'UNCHECKABLE');
        } finally {
            cleanup(tempDir);
        }
    });

    test('revalidate() passes a finding with no recheck field through unchanged (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'fix',
                    source: 'finalize',
                    code: 'NEXT_ACTION_SUBSTITUTED',
                    message: 'an event, not a condition',
                },
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'GONE',
                    message: 'm',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { MAGIC_FIXTURE_WARNINGS: '[]' },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    1,
                    'the event finding survives; the resolved condition finding does not — partition is per-finding, not per-batch',
                );
                assert.strictEqual(survivors[0].code, 'NEXT_ACTION_SUBSTITUTED');
            },
        );
    });

    test('record() suppresses writes under MAGIC_DIAGNOSTICS_SUPPRESS, and a live recheck spawn cannot feed its own finding back into the sink (DG-10 self-reference guard)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');

            process.env.MAGIC_DIAGNOSTICS_SUPPRESS = '1';
            const suppressed = diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'SHOULD_NOT_APPEAR',
                message: 'm',
            });
            delete process.env.MAGIC_DIAGNOSTICS_SUPPRESS;
            assert.strictEqual(suppressed, false, 'a suppressed record() must report false');
            assert.ok(!fs.existsSync(sinkPath), 'a suppressed record() must not create the sink');

            // Live integration through the real emitter (copied by
            // createTempWorkspace, including this session's own
            // recheck-attachment change) — a missing skills/magicspec/.checksums
            // reliably yields one ENGINE_INTEGRITY finding with a recheck.
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Registry\n');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules\n');
            const cpPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'check-prerequisites.js',
            );
            execSync(`node "${cpPath}" --json`, { cwd: tempDir, stdio: 'pipe' });

            const recorded = diagnostics.read();
            assert.ok(
                recorded.some((f) => f.code === 'ENGINE_INTEGRITY'),
                'sanity: the real emitter must have recorded its own finding first',
            );
            assert.ok(
                recorded.every((f) => f.recheck && f.recheck.script === 'check-prerequisites'),
                'every check-prerequisites finding must carry a recheck reference',
            );

            const survivors = diagnostics.revalidate(diagnostics.drain());
            assert.ok(
                survivors.some((f) => f.code === 'ENGINE_INTEGRITY'),
                'the condition is still real (.checksums is still missing) — it must survive its own revalidation',
            );
            assert.ok(
                !fs.existsSync(sinkPath),
                "the recheck's own warn()/record() calls must not have written a new finding back into the sink",
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js --dry-run reads the diagnostics sink without draining it (DG-4.1)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { finalizePath, diagnostics } = requireFinalizeDiagnostics(tempDir);
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'DRY_RUN_PROBE',
                message: 'should survive a preview',
            });

            const dryOut = execSync(
                `node "${finalizePath}" --workflow=task --workspace=main --dry-run`,
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.match(
                dryOut,
                /DRY_RUN_PROBE/,
                'a --dry-run invocation must still render the digest',
            );
            assert.deepStrictEqual(
                diagnostics.read().map((f) => f.code),
                ['DRY_RUN_PROBE'],
                'the finding must still be sitting in the sink after a preview — the preview must not have drained it',
            );

            // A second, real run reports the same finding and this time consumes it.
            const realOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(
                realOut,
                /DRY_RUN_PROBE/,
                'the real run must still report the finding the preview left untouched',
            );
            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'the real run must have drained the sink',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16b. finalize.js — diagnostics terminal block (DG-5/DG-6/DG-7/DG-8)
    // ───────────────────────────────────────────────────────────────────────────
    test('finalize.js terminal block orders the digest before the next step on both exit paths (DG-5)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath, diagnostics } = requireFinalizeDiagnostics(tempDir);
            const assertOrder = (out, label) => {
                const digestIdx = out.indexOf('### Engine diagnostics');
                const nextIdx = out.indexOf('### Next step');
                assert.ok(digestIdx !== -1, `${label}: digest heading must be present`);
                assert.ok(nextIdx !== -1, `${label}: next-step heading must be present`);
                assert.ok(digestIdx < nextIdx, `${label}: digest must render before the next step`);
                const afterNextStep = out.slice(nextIdx + '### Next step'.length);
                assert.doesNotMatch(
                    afterNextStep,
                    /\n### /,
                    `${label}: nothing may follow the next step section`,
                );
            };

            // Skip path: no whitelisted change, but a recorded finding exists.
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'ORDER_SKIP',
                message: 'skip path probe',
            });
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assertOrder(skipOut, 'skip path');

            // Significant path: a whitelisted change plus a recorded finding.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'ORDER_SUCCESS',
                message: 'success path probe',
            });
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assertOrder(successOut, 'significant path');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js prints the exact Next Action string persisted to STATE.md, never a second computation (DG-6)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '# Master Task Index',
                    '',
                    '## Active Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                    '',
                ].join('\n'),
            );
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
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                ].join('\n'),
            );
            commitFixture(tempDir);

            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
            const persisted = state.match(/- \*\*Next Action:\*\* (.+)/)[1].trim();

            const nextIdx = out.indexOf('### Next step');
            const printed = out
                .slice(nextIdx + '### Next step'.length)
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)[0];

            assert.strictEqual(
                printed,
                persisted,
                'the printed next step must be byte-identical to what was written to STATE.md',
            );
            assert.match(
                printed,
                /T-1A01/,
                'sanity: the computed action should reference the open task',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js omits the diagnostics digest and summary row when nothing was recorded (DG-7)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n*None — plan complete.*\n',
            );
            commitFixture(tempDir);

            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'sanity: the sink must start empty for this assertion to mean anything',
            );

            // Skip path: nothing whitelisted changed, sink is empty.
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.doesNotMatch(
                skipOut,
                /### Engine diagnostics/,
                'skip path: no digest heading when nothing was recorded',
            );
            assert.match(skipOut, /### Next step/, 'skip path: the next step must still print');

            // Significant path: a whitelisted change, still an empty sink —
            // the summary table gains rows for other fields but must not
            // gain one for diagnostics.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.doesNotMatch(
                successOut,
                /### Engine diagnostics/,
                'significant path: no digest heading when nothing was recorded',
            );
            assert.doesNotMatch(
                successOut,
                /\| Diagnostics \|/,
                'significant path: no summary-table row when nothing was recorded',
            );
            assert.match(
                successOut,
                /### Next step/,
                'significant path: the next step must still print',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('record-diagnostic always exits 0, whether the finding is valid or malformed (DG-8)', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'record-diagnostic.js',
            );
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            // Valid finding.
            const validOut = execSync(
                `node "${scriptPath}" --severity=warning --code=CLI_PROBE --message="from the agent channel"`,
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.match(
                validOut,
                /Recorded warning CLI_PROBE/,
                'a valid finding should confirm what was recorded',
            );

            // Invalid severity — must not throw or exit non-zero.
            assert.doesNotThrow(() => {
                execSync(
                    `node "${scriptPath}" --severity=bogus --code=BAD --message="should be dropped"`,
                    { cwd: tempDir, encoding: 'utf8' },
                );
            }, 'an invalid severity must not produce a non-zero exit');

            const drained = diagnostics.drain();
            assert.deepStrictEqual(
                drained.map((f) => f.code),
                ['CLI_PROBE'],
                'only the valid finding should have reached the sink',
            );
            assert.strictEqual(
                drained[0].source,
                'agent',
                '--source defaults to "agent" when omitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
