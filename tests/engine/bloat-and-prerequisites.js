// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const {
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    generateChecksums,
    makeSpecWorkspace,
    makeRegistryScanWorkspace,
    runCheckPrerequisites,
    makeMinimalDesignDir,
    makeDebtWarningFinder,
} = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 5m. check-bloat.js — the thresholds are advisory defaults a project may
    //     change in workspace.json, and specifications are scanned in every
    //     subdirectory of specifications/.
    // ───────────────────────────────────────────────────────────────────────────
    const makeBloatProject = (config, files) => {
        const tempDir = createTempWorkspace();
        const wsDir = path.join(tempDir, '.magicspec', 'ws');
        fs.mkdirSync(path.join(wsDir, 'specifications', 'sub'), { recursive: true });
        fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
        if (config !== null) {
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'workspace.json'),
                typeof config === 'string' ? config : JSON.stringify(config),
            );
        }
        for (const [rel, lines] of Object.entries(files)) {
            fs.writeFileSync(path.join(wsDir, rel), `${'line\n'.repeat(lines - 1)}line`);
        }
        return tempDir;
    };

    const bloatSignals = (tempDir) => {
        const result = spawnSync(
            'node',
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-bloat.js'), '--json'],
            {
                cwd: tempDir,
                encoding: 'utf8',
                env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/ws' },
            },
        );
        assert.strictEqual(result.status, 0, result.stdout + result.stderr);
        return JSON.parse(result.stdout).issues.map(
            (i) => `${i.type} ${i.file} ${i.lines}/${i.limit}`,
        );
    };

    test('check-bloat: the bloat override is honored for specifications and task files, an omitted key keeps its default, and a threshold of 0 turns off only its own tier', () => {
        const files = {
            'specifications/a.md': 25,
            'specifications/b.md': 45,
            'tasks/phase-1.md': 260,
            'tasks/phase-2.md': 60,
            'tasks/phase-3.md': 120,
        };
        const dirs = [];
        const signalsFor = (config) => {
            const dir = makeBloatProject(config, files);
            dirs.push(dir);
            return bloatSignals(dir);
        };
        try {
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 20, hard: 40 } } }),
                [
                    'SPEC_BLOAT specifications/a.md 25/20',
                    'SPEC_DECOMPOSE specifications/b.md 45/40',
                    'TASK_BLOAT tasks/phase-1.md 260/250',
                ],
                'the spec override applies; the task thresholds keep 250/400 because their keys are omitted',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { task: { soft: 50, hard: 100 } } }),
                [
                    'TASK_DECOMPOSE tasks/phase-1.md 260/100',
                    'TASK_BLOAT tasks/phase-2.md 60/50',
                    'TASK_DECOMPOSE tasks/phase-3.md 120/100',
                ],
                'the task override applies to task files',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 0, hard: 40 } } }),
                ['SPEC_DECOMPOSE specifications/b.md 45/40', 'TASK_BLOAT tasks/phase-1.md 260/250'],
                'a soft threshold of 0 turns off the soft signal and leaves the hard one',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 20, hard: 0 } } }),
                [
                    'SPEC_BLOAT specifications/a.md 25/20',
                    'SPEC_BLOAT specifications/b.md 45/20',
                    'TASK_BLOAT tasks/phase-1.md 260/250',
                ],
                'a hard threshold of 0 turns off the hard signal and leaves the soft one',
            );

            // Control: with no override the defaults decide, so the override is read and not merely tolerated.
            assert.deepStrictEqual(
                signalsFor({ finalization: { enabled: true } }),
                ['TASK_BLOAT tasks/phase-1.md 260/250'],
                'no bloat section: the defaults 300/500 and 250/400 apply',
            );
        } finally {
            dirs.forEach(cleanup);
        }
    });

    test('check-bloat: a specification in a subdirectory of specifications/ is scanned, and a missing, unparsable or non-numeric configuration leaves the default thresholds', () => {
        const files = {
            'specifications/exactly-300.md': 300,
            'specifications/over.md': 301,
            'specifications/sub/deep.md': 501,
            'tasks/phase-1.md': 250,
            'tasks/phase-2.md': 251,
        };
        const expected = [
            'SPEC_BLOAT specifications/over.md 301/300',
            'SPEC_DECOMPOSE specifications/sub/deep.md 501/500',
            'TASK_BLOAT tasks/phase-2.md 251/250',
        ];
        const dirs = [];
        try {
            for (const config of [
                null,
                '{ not json',
                { bloat: { spec: { soft: 'ten', hard: -5 }, task: null } },
            ]) {
                const dir = makeBloatProject(config, files);
                dirs.push(dir);
                assert.deepStrictEqual(
                    bloatSignals(dir),
                    expected,
                    `defaults stand for ${typeof config === 'string' ? 'an unparsable file' : config === null ? 'no file' : 'non-numeric values'}; a file at the threshold is not flagged, a nested specification is`,
                );
            }
        } finally {
            dirs.forEach(cleanup);
        }
    });

    test('check-bloat: a working document is flagged by size in kilobytes, workspace and global alike, with the doc override honored and a threshold of 0 turning off its own tier', () => {
        // 'line\n' is 5 bytes: 7000 lines is 34 KB (soft), 14000 lines is 68 KB (hard).
        const docSignals = (config) => {
            const dir = makeBloatProject(config, {
                'PLAN.md': 7000,
                'INDEX.md': 14000,
                'RULES.md': 10,
            });
            try {
                fs.writeFileSync(path.join(dir, '.magicspec', 'INDEX.md'), 'line\n'.repeat(7000));
                const result = spawnSync(
                    'node',
                    [path.join(dir, 'skills', 'magicspec', 'scripts', 'check-bloat.js'), '--json'],
                    {
                        cwd: dir,
                        encoding: 'utf8',
                        env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/ws' },
                    },
                );
                assert.strictEqual(result.status, 0, result.stdout + result.stderr);
                return JSON.parse(result.stdout)
                    .issues.filter((i) => i.type.startsWith('DOC_'))
                    .map((i) => `${i.type} ${i.file} ${i.limit}`);
            } finally {
                cleanup(dir);
            }
        };

        assert.deepStrictEqual(
            docSignals(null),
            [
                'DOC_DECOMPOSE .magicspec/ws/INDEX.md 60',
                'DOC_BLOAT .magicspec/ws/PLAN.md 30',
                'DOC_BLOAT .magicspec/INDEX.md 30',
            ],
            'defaults 30/60 KB: the workspace registry is over the hard tier, the plan and the global registry over the soft one, the small constitution is not flagged',
        );
        assert.deepStrictEqual(
            docSignals({ bloat: { doc: { soft: 20, hard: 0 } } }),
            [
                'DOC_BLOAT .magicspec/ws/INDEX.md 20',
                'DOC_BLOAT .magicspec/ws/PLAN.md 20',
                'DOC_BLOAT .magicspec/INDEX.md 20',
            ],
            'an override replaces the soft tier and a hard threshold of 0 turns only the hard tier off',
        );
        assert.deepStrictEqual(
            docSignals({ bloat: { doc: { soft: 0, hard: 0 } } }),
            [],
            'both thresholds at 0 turn the document signal off',
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6. check-prerequisites.js
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js should validate whole structure', () => {
        const tempDir = createTempWorkspace(true);
        try {
            // 1. Initial State - Success
            fs.mkdirSync(path.join(tempDir, '.magicspec'));
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules');

            // Need checksums to pass integrity check (developer-only manifest builder in scripts/)
            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir);
            assert.strictEqual(
                result.ok,
                true,
                'Should pass with all files present and correct checksums',
            );

            // 2. Failure Case - Missing file
            fs.unlinkSync(path.join(tempDir, '.magicspec', 'INDEX.md'));
            const resultFail = runCheckPrerequisites(tempDir);
            assert.strictEqual(resultFail.ok, false, 'Should fail if INDEX.md is missing');
            assert.ok(resultFail.missing_required.includes('INDEX.md'));

            // 3. Drift Case
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index Restored');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Modified Rules');
            execSync('git add . && git commit -m "Fixed"', { cwd: tempDir, stdio: 'ignore' });

            // Manual edit outside workflow
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Drifted Rules');
            const resultDrift = runCheckPrerequisites(tempDir);
            assert.ok(
                resultDrift.warnings.some((w) => w.type === 'CONFIG_DRIFT'),
                'Should detect config drift',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6a. check-prerequisites.js --verify-headers — RE-1 absent-header drift
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js --verify-headers flags absent (not just mismatched) spec headers (RE-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeSpecWorkspace(tempDir);

            const indexRow =
                '| [auth.md](specifications/auth.md) | Auth domain | Stable | 1 | 1.0.0 |';
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                `# Index\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n${indexRow}\n`,
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            // Checksums must pass integrity so ENGINE_INTEGRITY doesn't mask the result.
            generateChecksums(tempDir);

            // Case A — spec file has NO Version/Status header (the silent-failure bug).
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n## Overview\n\nNo header here.\n',
            );
            const drift = runCheckPrerequisites(tempDir, '--verify-headers');
            assert.ok(
                drift.warnings.some((w) => w.type === 'VERSION_DRIFT' && /MISSING/.test(w.message)),
                'absent Version header must raise VERSION_DRIFT (MISSING)',
            );
            assert.ok(
                drift.warnings.some((w) => w.type === 'STATUS_DRIFT' && /MISSING/.test(w.message)),
                'absent Status header must raise STATUS_DRIFT (MISSING)',
            );
            assert.strictEqual(
                drift.ok,
                false,
                'missing headers must make ok:false, not a silent pass',
            );

            // Case B — correct headers present: no drift (guards against false positives).
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## Overview\n\nMatches registry.\n',
            );
            const clean = runCheckPrerequisites(tempDir, '--verify-headers');
            assert.ok(
                !clean.warnings.some(
                    (w) => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT',
                ),
                'matching headers must produce no drift warning',
            );

            // Case C — backward compatibility: without --verify-headers, absent header is NOT checked.
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n## Overview\n\nNo header here.\n',
            );
            const noFlag = runCheckPrerequisites(tempDir);
            assert.ok(
                !noFlag.warnings.some(
                    (w) => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT',
                ),
                'header check must remain opt-in via --verify-headers',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b. check-prerequisites.js — registry cross-reference ignores quoted
    //     mentions and bounds its capture to the filename grammar (SH-1, SH-4)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js registry cross-reference is scan-hygiene compliant (SH-1, SH-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);

            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                '# Index\n\n| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |\n',
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            // A genuine link, plus (a) a Backlog-style parenthetical quoting several
            // template placeholder paths in individual code spans — the exact shape
            // that produced a false REGISTRY_MISMATCH for a nonexistent spec — and
            // (b) a genuinely unregistered pair mentioned unquoted, comma-separated.
            // (b) must still fire: SH-1 exempts what is quoted, not what is merely
            // unbracketed. What SH-4 fixes is *how* it fires — two bounded findings
            // naming `a.md` and `b.md` individually, not one swallowing the comma,
            // the trailing prose, and every quoted token that follows on later lines.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                [
                    '# Plan',
                    '- [x] real spec ([l1-real.md](specifications/l1-real.md))',
                    '- unquoted mention: specifications/a.md, specifications/b.md in prose',
                    '- placeholder note (`main/INDEX.md`, `specifications/{spec.md}`, `other-spec.md`, `tasks/phase-{N}.md`)',
                    '',
                ].join('\n'),
            );

            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir, '--require-specs');

            const mismatches = result.warnings.filter((w) => w.type === 'REGISTRY_MISMATCH');
            assert.deepStrictEqual(
                mismatches.map((w) => w.message.match(/^'([^']+)'/)[1]).sort(),
                ['a.md', 'b.md'],
                `must report exactly the two unquoted, unregistered files — bounded individually, nothing merged or quoted → ${JSON.stringify(mismatches)}`,
            );
            assert.ok(
                !mismatches.some((w) =>
                    /spec\.md|other-spec|phase-\{N\}|main\/INDEX/.test(w.message),
                ),
                'no quoted placeholder token may appear in a finding, merged or otherwise',
            );
            assert.ok(
                !result.warnings.some((w) => w.type === 'ORPHANED_SPEC'),
                'the genuinely-linked real spec must still be recognized as covered',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-bis. check-prerequisites.js — INDEX.md-side registry-scan sites are
    //         scan-hygiene compliant (SH-1, SH-4) — the three sites Phase 17
    //         did not reach, closed by Phase 21
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js INDEX.md-side registry-scan sites are scan-hygiene compliant (SH-1, SH-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);

            // Reproduces the field-reported shape (engine 2.1.70): a Meta
            // Information bullet mentions `specifications/` bare (no markdown
            // link), followed later in the same parenthesized bullet by
            // further `.md` mentions and the bullet's closing `)`. The
            // pre-fix `/specifications\/([^)]*\.md)/g` has no newline
            // exclusion and no filename-grammar boundary, so it captured the
            // entire span as a single corrupted "filename". Also includes a
            // genuinely broken registered spec, to prove the fix bounds the
            // capture rather than blinding the check entirely.
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '| [l1-missing.md](specifications/l1-missing.md) | y | Stable | 1 | 1.0.0 |',
                    '',
                    '## Meta Information',
                    '',
                    '- **Last Updated**: see specifications/ for the layout convention; also touches l1-other.md and l2-another.md in passing)',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- [x] real spec ([l1-real.md](specifications/l1-real.md))\n',
            );

            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir, '--require-specs', '--verify-headers');

            const registryFindings = result.warnings.filter(
                (w) =>
                    w.type === 'GHOST_REGISTRY' ||
                    w.type === 'NAMING_VIOLATION' ||
                    w.type === 'ORPHANED_SPEC',
            );
            assert.ok(
                !registryFindings.some((w) =>
                    /layout convention|l2-another|l1-other/.test(w.message),
                ),
                `the bare prose mention must not surface as a finding, corrupted or otherwise → ${JSON.stringify(registryFindings)}`,
            );
            assert.ok(
                registryFindings.some(
                    (w) => w.type === 'GHOST_REGISTRY' && w.message.includes("'l1-missing.md'"),
                ),
                'a genuinely broken registered spec must still be caught — the fix bounds the capture, it does not blind the check',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-quater. check-prerequisites.js — a stale-plan remedy names the workspace
    //            it reported on, and the audit command has one spelling
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js names the reported workspace in a stale-plan remedy and spells audit one way', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeRegistryScanWorkspace(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            // The plan omits the registered spec (orphaned) and names one the
            // registry lacks (mismatch), so both remedies are emitted.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- unquoted mention: specifications/ghost.md in prose\n',
            );

            // A second workspace directory holding the same registry.
            const wsDir = path.join(designDir, 'docs');
            fs.mkdirSync(wsDir, { recursive: true });
            fs.cpSync(specsDir, path.join(wsDir, 'specifications'), { recursive: true });
            for (const f of ['INDEX.md', 'RULES.md', 'PLAN.md']) {
                fs.copyFileSync(path.join(designDir, f), path.join(wsDir, f));
            }
            generateChecksums(tempDir);

            const remedies = (result, type) =>
                result.warnings.filter((w) => w.type === type).map((w) => w.fix);

            // Flat legacy layout: there is no workspace to name.
            const flat = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                remedies(flat, 'ORPHANED_SPEC'),
                ['/magicspec plan'],
                'the flat layout invents no workspace',
            );
            assert.deepStrictEqual(
                remedies(flat, 'REGISTRY_MISMATCH'),
                ['/magicspec spec audit'],
                'the audit command is spelled the way the workflows spell it',
            );

            // Workspace layout: the remedy re-plans the workspace it reported on.
            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'check-prerequisites.js',
            );
            const scoped = JSON.parse(
                execSync(`node "${scriptPath}" --json --require-specs`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/docs' },
                }),
            );
            assert.deepStrictEqual(
                remedies(scoped, 'ORPHANED_SPEC'),
                ['/magicspec plan docs'],
                'a remedy without the workspace would re-plan the default workspace instead',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-sexies. check-prerequisites.js — the plan stage owns the plan: every hint that updates,
    //            revalidates or extends the plan names it, and a plan written against an older
    //            constitution is stale like one written against an older registry
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js sends every plan remedy and every parity report to /magicspec plan, and reports a plan written against an older constitution', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeRegistryScanWorkspace(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '**Version:** 1.2.0',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '| [l1-extra.md](specifications/l1-extra.md) | x | Stable | 1 | 1.0.0 |',
                    '',
                ].join('\n'),
            );
            // The header of a registered spec drifted from the registry, in version and in status.
            fs.writeFileSync(
                path.join(specsDir, 'l1-real.md'),
                '# Real\n\n**Version:** 1.0.1\n**Status:** Draft\n',
            );
            fs.writeFileSync(
                path.join(specsDir, 'l1-extra.md'),
                '# Extra\n\n**Version:** 1.0.0\n**Status:** Stable\n',
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules\n\n**Version:** 2.0.0\n');
            const writePlan = (extra) =>
                fs.writeFileSync(
                    path.join(designDir, 'PLAN.md'),
                    [
                        '# Plan',
                        '',
                        '**Version:** 1.0.0',
                        '**Based on:** .magicspec/INDEX.md v1.0.0',
                        ...extra,
                        '',
                        '- [ ] **Real** ([l1-real.md](specifications/l1-real.md))',
                        '',
                    ].join('\n'),
                );
            writePlan(['**Based on RULES:** .magicspec/RULES.md v1.0.0']);
            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir, '--require-specs', '--verify-headers');
            const fixes = (type) =>
                result.warnings.filter((w) => w.type === type).map((w) => w.fix);

            // The registry is ahead of the plan, the constitution is ahead of the plan, a spec is not in the plan:
            // each is the plan's to repair, in one spelling, with no "update" word.
            assert.deepStrictEqual(fixes('SYNC_GAP'), ['/magicspec plan', '/magicspec plan']);
            assert.deepStrictEqual(fixes('ORPHANED_SPEC'), ['/magicspec plan']);
            const gaps = result.warnings.filter((w) => w.type === 'SYNC_GAP').map((w) => w.message);
            assert.ok(
                gaps.some((m) =>
                    /based on INDEX\.md v1\.0\.0, but registry is at v1\.2\.0/.test(m),
                ),
                'the registry gap',
            );
            assert.ok(
                gaps.some((m) =>
                    /PLAN\.md is based on RULES\.md v1\.0\.0, but the constitution is at v2\.0\.0/.test(
                        m,
                    ),
                ),
                'the constitution gap',
            );

            // A header that disagrees with the registry is reconciled by the specification workflow and then
            // by the plan, which owns the Pre-flight that reports it.
            const parity = [...fixes('VERSION_DRIFT'), ...fixes('STATUS_DRIFT')];
            assert.ok(parity.length >= 2, 'both the version and the status drift are reported');
            for (const fix of parity) {
                assert.match(
                    fix,
                    /^Run \/magicspec spec to reconcile, then re-run \/magicspec plan$/,
                    fix,
                );
            }
            assert.ok(
                !result.warnings.some((w) => /\/magicspec task/.test(w.fix || '')),
                'no plan remedy names the task stage',
            );

            // A plan that records no constitution version is not judged against one.
            writePlan([]);
            const unjudged = runCheckPrerequisites(tempDir, '--require-specs');
            assert.strictEqual(
                unjudged.warnings.filter((w) => /RULES\.md/.test(w.message)).length,
                0,
                'a plan from before the record has nothing to compare',
            );

            // A plan that records the current constitution is clean of that finding.
            writePlan(['**Based on RULES:** .magicspec/RULES.md v2.0.0']);
            const current = runCheckPrerequisites(tempDir, '--require-specs');
            assert.strictEqual(
                current.warnings.filter((w) => /RULES\.md/.test(w.message)).length,
                0,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-quinquies. check-prerequisites.js — the registry-vs-disk scan needs only
    //               INDEX.md, never a plan (T240)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js reports GHOST_REGISTRY and NAMING_VIOLATION before any PLAN.md exists (T240)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '| [l1-missing.md](specifications/l1-missing.md) | y | Stable | 1 | 1.0.0 |',
                    '| [legacy.md](specifications/legacy.md) | z | Stable | 1 | 1.0.0 |',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            generateChecksums(tempDir);

            const named = (result, type) =>
                result.warnings
                    .filter((w) => w.type === type)
                    .map((w) => w.message.match(/^'([^']+)'/)[1])
                    .sort();

            // No plan yet: the state between the first spec and the first /magicspec plan.
            const noPlan = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                named(noPlan, 'GHOST_REGISTRY'),
                ['l1-missing.md', 'legacy.md'],
                'a registered spec that is missing from disk must be reported with no plan present',
            );
            assert.deepStrictEqual(
                named(noPlan, 'NAMING_VIOLATION'),
                ['legacy.md'],
                'the Layer Prefix rule needs no plan either',
            );
            assert.strictEqual(noPlan.ok, false, 'GHOST_REGISTRY is an integrity failure');
            for (const planOnly of [
                'ORPHANED_SPEC',
                'REGISTRY_MISMATCH',
                'SYNC_GAP',
                'RULE_57_VIOLATION',
            ]) {
                assert.deepStrictEqual(
                    named(noPlan, planOnly),
                    [],
                    `${planOnly} compares against the plan, so it cannot fire without one`,
                );
            }

            // The Plan Gate of `task` asks for the plan: its absence is a mechanical finding, not a reading.
            const gateNoPlan = runCheckPrerequisites(tempDir, '--require-specs', '--require-plan');
            assert.ok(
                gateNoPlan.missing_required.includes('PLAN.md'),
                'a missing plan is reported by --require-plan',
            );

            // Control: a plan changes nothing about what the registry-vs-disk scan reports.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- [x] real spec ([l1-real.md](specifications/l1-real.md))\n',
            );
            const gateWithPlan = runCheckPrerequisites(
                tempDir,
                '--require-specs',
                '--require-plan',
            );
            assert.ok(
                !gateWithPlan.missing_required.includes('PLAN.md'),
                'and not once the plan exists',
            );
            const withPlan = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                named(withPlan, 'GHOST_REGISTRY'),
                named(noPlan, 'GHOST_REGISTRY'),
            );
            assert.deepStrictEqual(
                named(withPlan, 'NAMING_VIOLATION'),
                named(noPlan, 'NAMING_VIOLATION'),
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-sexies. check-prerequisites.js — CONFIG_DRIFT watches the global RULES.md
    //            beside a workspace RULES.md (T243)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js watches the global RULES.md beside a workspace RULES.md (T243)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const designDir = path.join(tempDir, '.magicspec');
            const wsDir = path.join(designDir, 'docs');
            fs.mkdirSync(wsDir, { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(path.join(wsDir, 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(wsDir, 'RULES.md'), '# Workspace Rules');
            generateChecksums(tempDir);
            execSync('git add -A && git commit -m "baseline"', { cwd: tempDir, stdio: 'ignore' });

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'check-prerequisites.js',
            );
            const drifted = () =>
                JSON.parse(
                    execSync(`node "${scriptPath}" --json`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                        env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/docs' },
                    }),
                )
                    .warnings.filter((w) => w.type === 'CONFIG_DRIFT')
                    .map((w) => w.message.match(/^'([^']+)'/)[1])
                    .sort();

            assert.deepStrictEqual(drifted(), [], 'a committed tree has no drift');

            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules (edited by hand)');
            assert.deepStrictEqual(
                drifted(),
                ['.magicspec/RULES.md'],
                'the global constitution is monitored even when a workspace RULES.md exists',
            );

            fs.writeFileSync(path.join(wsDir, 'RULES.md'), '# Workspace Rules (edited by hand)');
            assert.deepStrictEqual(drifted(), ['.magicspec/RULES.md', '.magicspec/docs/RULES.md']);

            execSync('git checkout -- .magicspec/RULES.md', { cwd: tempDir, stdio: 'ignore' });
            assert.deepStrictEqual(
                drifted(),
                ['.magicspec/docs/RULES.md'],
                'the workspace RULES.md stays monitored on its own',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2. check-prerequisites.js — design-debt backlog signal (SC-2.4)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js reports DESIGN_DEBT_PENDING only when plan-complete meets an open Backlog (SC-2.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // Positive: plan complete (the engine's own empty-state marker),
            // Backlog holds two open items.
            const hit = findDebtWarning(
                '- Some open design item.\n- Another one.',
                '*None — plan complete. New scope enters via `/magicspec plan`.*',
            );
            assert.ok(hit, 'a plan-complete state with a non-empty Backlog must raise the signal');
            assert.match(
                hit.message,
                /2 open item/,
                'the count must reflect the actual number of Backlog bullets',
            );
            assert.match(hit.fix, /magicspec spec/, 'the remedy must point at spec authoring');

            // Negative (load-bearing — SC-2.4 is about *distinguishing* two
            // plan-complete states, so a signal that also fires here would be
            // indistinguishable from one that works): same plan-complete
            // state, empty Backlog.
            assert.strictEqual(
                findDebtWarning(
                    '',
                    '*None — plan complete. New scope enters via `/magicspec plan`.*',
                ),
                undefined,
                'an empty Backlog must never raise the signal, even at plan-complete',
            );

            // Negative: an active phase exists — not plan-complete at all,
            // regardless of what the Backlog holds.
            assert.strictEqual(
                findDebtWarning(
                    '- Some open design item.',
                    '| [Phase 3](tasks/phase-3.md) | Something | `In Progress` |',
                ),
                undefined,
                'an active phase must suppress the signal even with a non-empty Backlog',
            );

            // Negative: ambiguous/unrecognized Active Phases content — the
            // check must default to "cannot determine", not "must be complete".
            assert.strictEqual(
                findDebtWarning(
                    '- Some open design item.',
                    'Some unstructured note, not a table and not the marker.',
                ),
                undefined,
                'unrecognized Active Phases content must not be read as plan-complete',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-bis. check-prerequisites.js — DESIGN_DEBT_PENDING's openItems count
    //          skips Parked-marked Backlog bullets (SC-2.4 addendum, Backlog
    //          Disposition Convention, closed by Phase 21)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING excludes Parked-marked Backlog bullets (SC-2.4 addendum)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'TASKS.md'),
                '# Tasks\n\n## Active Phases\n\n*None — plan complete. New scope enters via `/magicspec plan`.*\n',
            );
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // One plain bullet, one Parked-marked bullet — only the plain one counts.
            const mixed = findDebtWarning(
                '- Some open design item.\n- Already decided, kept visible. *(Parked — no current demand signal.)*',
            );
            assert.ok(
                mixed,
                'a Backlog with at least one plain bullet must still raise the signal',
            );
            assert.match(
                mixed.message,
                /1 open item/,
                'the Parked-marked bullet must not be counted',
            );

            // Every bullet Parked — no open items at all, signal must not fire.
            assert.strictEqual(
                findDebtWarning(
                    '- First parked item. *(Parked — revisit only if X.)*\n- Second parked item. *(Parked — monitoring only.)*',
                ),
                undefined,
                'a Backlog composed entirely of Parked bullets must not raise the signal',
            );

            // A bullet that merely mentions the word "Parked" mid-sentence, not
            // as the disposition marker, must still count as open — the
            // exclusion is the specific `*(Parked` marker shape, not the bare word.
            const wordOnly = findDebtWarning(
                '- This item was previously Parked but is open again.',
            );
            assert.ok(
                wordOnly,
                'a bullet using the word "Parked" without the marker shape must still count as open',
            );
            assert.match(
                wordOnly.message,
                /1 open item/,
                'the bare-word bullet must be counted, not excluded',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-ter. check-prerequisites.js — DESIGN_DEBT_PENDING's plan-complete
    //          predicate recognizes terminal-row completion under the
    //          canonical single-table tasks.md layout (Terminal-Row
    //          Recognition, l1-session-continuity.md SC-2.4 structural
    //          addendum, closed by Phase 22)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING fires under the canonical single-table Active Phases layout (Terminal-Row Recognition)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // Positive: single-table layout (no separate "Completed Phases"
            // section — the shape the shipped tasks.md template actually
            // produces), every row already `Done (Archived)`, two open
            // Backlog bullets — reproduces the field report exactly (engine
            // 2.1.71: 24/24 phases Done, 2 open bullets, gate stayed silent).
            const archivedTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                '| [Phase 2](archives/tasks/phase-2.md) | Follow-up | `Done (Archived)` |',
            ].join('\n');
            const hit = findDebtWarning('- Some open design item.\n- Another one.', archivedTable);
            assert.ok(
                hit,
                'an all-terminal single-table Active Phases must be read as plan-complete, not only the literal empty marker',
            );
            assert.match(
                hit.message,
                /2 open item/,
                'the count must reflect the actual number of Backlog bullets',
            );

            // Negative: same shape, but one row is still non-terminal — the
            // plan is genuinely incomplete and must not be misread as done.
            const mixedTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                '| [Phase 2](tasks/phase-2.md) | Follow-up | `In Progress` |',
            ].join('\n');
            assert.strictEqual(
                findDebtWarning('- Some open design item.', mixedTable),
                undefined,
                'a non-terminal row anywhere in the table must suppress the signal — the plan is not actually complete',
            );

            // A lone `Cancelled` row is terminal too — must not block the signal.
            const cancelledTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Abandoned | `Cancelled` |',
            ].join('\n');
            const cancelledHit = findDebtWarning('- Some open design item.', cancelledTable);
            assert.ok(
                cancelledHit,
                'a table of only `Cancelled` rows is terminal and must be read as plan-complete',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-quater. check-prerequisites.js — the zero-row terminal case. Both
    //             specs already require it (l1-session-continuity.md
    //             §Terminal-Row Recognition names "a workspace whose table was
    //             manually cleared"; l2-engine-automation.md's normative line
    //             reads "section has zero rows, OR every row ... terminal"),
    //             but the implementation recognized zero rows only when the
    //             literal `*None*` marker was present.
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING fires on a vacant Active Phases section (zero-row terminal case)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);
            const openBacklog = '- Some open design item.\n- Another one.';

            // (a) Rows relocated into a separate `## Completed Phases` section,
            // leaving `## Active Phases` empty — the hand-split layout this
            // engine's own workspace carries. Terminal-Row Recognition fixed
            // the single-table shape; this is the same predicate's other end,
            // where there is no row to read a terminal status from at all.
            const vacant = findDebtWarning(
                openBacklog,
                [
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                ].join('\n'),
            );
            assert.ok(
                vacant,
                'a vacant Active Phases section is plan-complete — zero rows is a terminal case',
            );
            assert.match(vacant.message, /2 open item/, 'the count must still reflect the Backlog');

            // (b) Table scaffolding with no data rows — the same zero-row state
            // spelled with a header the author left behind.
            assert.ok(
                findDebtWarning(
                    openBacklog,
                    '| Phase | Description | Status |\n| --- | --- | --- |',
                ),
                'a header-only table carries zero phase rows and is equally terminal',
            );

            // (c) The fail-closed boundary the vacancy rule must not erode:
            // content that is present but unrecognized stays "cannot
            // determine". A gate that can raise a HALT must never fire on
            // input it could not parse — only on input it positively read as
            // empty.
            assert.strictEqual(
                findDebtWarning(
                    openBacklog,
                    'Some unstructured note, not a table and not the marker.',
                ),
                undefined,
                'unrecognized content must still suppress the signal',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6c. scan-hygiene.js — shared strip-before-match helper (SH-1, SH-2, SH-5)
    // ───────────────────────────────────────────────────────────────────────────
    test('scan-hygiene.js stripQuoted removes fenced and inline-quoted content, preserving line count', () => {
        const tempDir = createTempWorkspace();
        try {
            const { stripQuoted } = requireFromFixture(tempDir, 'lib', 'scan-hygiene.js');

            const input = [
                'a',
                '```',
                '- [ ] quoted in a fence',
                '```',
                'b `- [ ] quoted in a span` c',
                '> a blockquoted - [ ] item survives',
                '<!-- an HTML comment - [ ] also survives -->',
            ].join('\n');

            const out = stripQuoted(input);
            const outLines = out.split('\n');

            assert.strictEqual(
                outLines.length,
                input.split('\n').length,
                'line count must be preserved',
            );
            assert.doesNotMatch(outLines[2], /- \[ \]/, 'fenced content must not survive');
            assert.doesNotMatch(outLines[4], /- \[ \]/, 'inline-span content must not survive');
            assert.match(
                outLines[5],
                /blockquoted - \[ \] item survives/,
                'blockquotes are out of scope (§2) and must be untouched',
            );
            assert.match(
                outLines[6],
                /HTML comment - \[ \] also survives/,
                'HTML comments are out of scope (§2) and must be untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('scan-hygiene.js stripQuoted removes fences before spans (a stray backtick inside a fence must not swallow trailing text)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { stripQuoted } = requireFromFixture(tempDir, 'lib', 'scan-hygiene.js');

            // A fence containing a single backtick would, if spans were stripped
            // first, be read as an unterminated span delimiter and swallow every-
            // thing up to the next real backtick — including the sentinel below.
            const input = [
                '```',
                'a single ` backtick inside a fence',
                '```',
                'SENTINEL should survive `this real span`',
            ].join('\n');

            const out = stripQuoted(input);
            assert.match(
                out,
                /SENTINEL should survive/,
                'fence-first ordering must not let a stray backtick swallow trailing content',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
