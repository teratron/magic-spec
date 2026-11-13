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
    runEngineMetaCheck,
    runCheckPrerequisites,
} = require('./lib/base');
const { sha256Hex } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 5a. update-engine-meta.js — a manifest entry whose file is gone is drift
    //     The disk→manifest walk only visits files that exist, so a deleted or
    //     never-shipped engine file was structurally invisible to --check.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta --check fails when a manifest entry has no file on disk', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            // Control — pristine tree must pass (guards against false positives).
            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'an intact engine must pass --check',
            );

            // `init.js` is tracked in the manifest and not required by update-engine-meta.
            const victim = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js');
            assert.ok(fs.existsSync(victim), 'fixture precondition: init.js is present');
            fs.unlinkSync(victim);

            const missing = runEngineMetaCheck(tempDir);
            assert.ok(missing.failed, 'a manifest entry with no file on disk must fail --check');
            assert.match(missing.output, /scripts\/init\.js/, '--check must name the missing file');

            // Write mode treats the absence as an engine change: bump + regenerate.
            const metaScript = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'update-engine-meta.js',
            );
            execSync(`node "${metaScript}"`, { cwd: tempDir, stdio: 'pipe' });
            assert.strictEqual(
                fs
                    .readFileSync(path.join(tempDir, 'skills', 'magicspec', '.version'), 'utf8')
                    .trim(),
                '1.0.1',
                'a removed engine file is a change and must bump the version',
            );
            const regenerated = JSON.parse(
                fs.readFileSync(path.join(tempDir, 'skills', 'magicspec', '.checksums'), 'utf8'),
            );
            assert.ok(
                !regenerated['scripts/init.js'],
                'the regenerated manifest must drop the removed file',
            );
            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'after regeneration the engine is consistent again',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b. update-engine-meta.js — dev-repo Engine-Version snapshot sync
    //     (l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version
    //     Snapshot Sync). Reuses createTempWorkspace's existing scripts/
    //     mirroring: the dev-repo branch is the fixture default, so the
    //     consumer branch is the one that must explicitly delete the guard
    //     script — mirroring how the fixture already withholds
    //     generate-checksums.js from skills/magicspec/scripts/ for the same reason.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta.js syncs the Engine Version snapshot in a dev-repo, leaves it alone in a consumer install', () => {
        const devRepoDir = createTempWorkspace();
        const consumerDir = createTempWorkspace();
        try {
            for (const [tempDir, label] of [
                [devRepoDir, 'dev-repo'],
                [consumerDir, 'consumer'],
            ]) {
                generateChecksums(tempDir);
                fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
                fs.writeFileSync(
                    path.join(tempDir, '.magicspec', 'INDEX.md'),
                    [
                        '# Project Specification Index',
                        '',
                        '**Version:** 1.0.0',
                        '**Status:** Active',
                        '**Engine Version:** 0.0.0',
                        '',
                    ].join('\n'),
                );
                // Trigger drift so the write branch runs (same technique as
                // the "should bump version on engine change" case above).
                fs.appendFileSync(
                    path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js'),
                    `\n// drift ${label}\n`,
                );
            }

            // Consumer-style fixture: remove the snapshot guard script only. The
            // manifest builder stays, so the write branch still runs and the
            // per-script guard is what is under test. A true user installation
            // lacks the manifest builder and is refused before any of this
            // (see 5b-bis below).
            fs.unlinkSync(path.join(consumerDir, 'scripts', 'sync-engine-snapshot.js'));

            // `2>&1`: the consumer-branch message is `console.warn` (stderr),
            // and `execSync`'s return value is stdout only — without merging,
            // the very warning this case exists to pin is silently dropped.
            const runWrite = (tempDir) =>
                execSync(
                    `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-engine-meta.js')}" 2>&1`,
                    { cwd: tempDir, encoding: 'utf8' },
                );

            const devOut = runWrite(devRepoDir);
            const devIndex = fs.readFileSync(
                path.join(devRepoDir, '.magicspec', 'INDEX.md'),
                'utf8',
            );
            const devVersion = fs
                .readFileSync(path.join(devRepoDir, 'skills', 'magicspec', '.version'), 'utf8')
                .trim();
            assert.match(
                devIndex,
                new RegExp(`\\*\\*Engine Version:\\*\\* ${devVersion.replace(/\./g, '\\.')}`),
                'dev-repo: .magicspec/INDEX.md Engine Version must match the freshly-bumped skills/magicspec/.version',
            );
            assert.match(
                devOut,
                /Engine Version snapshot synced/,
                'dev-repo: sync must run and log',
            );

            const consumerOut = runWrite(consumerDir);
            const consumerIndex = fs.readFileSync(
                path.join(consumerDir, '.magicspec', 'INDEX.md'),
                'utf8',
            );
            assert.match(
                consumerIndex,
                /\*\*Engine Version:\*\* 0\.0\.0/,
                'consumer install: Engine Version snapshot must be untouched',
            );
            assert.match(
                consumerOut,
                /sync-engine-snapshot\.js not found/,
                'consumer install: the skip must be logged, not silent',
            );
            assert.match(
                consumerOut,
                /Engine metadata and version updated/,
                'the rest of the write branch must still complete when only the snapshot script is absent',
            );
        } finally {
            cleanup(devRepoDir);
            cleanup(consumerDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b-bis. update-engine-meta.js / check-prerequisites.js — a user
    //         installation cannot resolve engine drift, and must say so.
    //
    //     A release ships `skills/magicspec/` only, so a user installation has no manifest
    //     builder. The write branch used to bump `skills/magicspec/.version` anyway, print
    //     "Engine metadata and version updated", and leave the manifest — and
    //     therefore the warning that sent the operator there — exactly as it
    //     was. Every retry moved the version again. The version is the signal
    //     Engine Upgrade Detection reads as "the engine was replaced under this
    //     project", so a local bump reads as a phantom upgrade.
    // ───────────────────────────────────────────────────────────────────────────

    // createTempWorkspace mirrors scripts by default (the dev-repo shape), so
    // the user-installation shape is that fixture with dev/ removed AFTER the
    // manifest is built — the order a release ships in. `spec.md` and `task.md`
    // are the two files the field report named: one edited, one with its line
    // endings converted (the check cannot tell the two apart, and must not have to).
    // Two engine files drift after the manifest is built: spec.md gets a content edit and task.md
    // either a content edit too (the default) or only a conversion to CRLF (`taskEndingsOnly`).
    // A conversion alone is not drift: a checkout that converts line endings does it to every file.
    const makeDriftedEngine = (tempDir, { userInstallation, taskEndingsOnly = false }) => {
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '# spec\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'), '# task\n');
        generateChecksums(tempDir);
        if (userInstallation)
            fs.rmSync(path.join(tempDir, 'scripts'), { recursive: true, force: true });
        fs.appendFileSync(
            path.join(tempDir, 'skills', 'magicspec', 'spec.md'),
            '<!-- local note -->\n',
        );
        fs.writeFileSync(
            path.join(tempDir, 'skills', 'magicspec', 'task.md'),
            taskEndingsOnly ? '# task\r\n' : '# task\n<!-- local note -->\n',
        );
    };

    // stdout and stderr merged, and a non-zero exit returned instead of thrown:
    // these cases assert on the refusal's message and status, not just success.
    const runMeta = (tempDir, script, ...args) => {
        const res = spawnSync(
            process.execPath,
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', script), ...args],
            { cwd: tempDir, encoding: 'utf8' },
        );
        return { status: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
    };

    test('update-engine-meta write mode is refused in a user installation: no version bump, no manifest rewrite, non-zero exit', () => {
        const tempDir = createTempWorkspace();
        try {
            makeDriftedEngine(tempDir, { userInstallation: true });
            const versionPath = path.join(tempDir, 'skills', 'magicspec', '.version');
            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
            const manifestBefore = fs.readFileSync(checksumsPath, 'utf8');

            // Twice on purpose: the hazard was a ratchet — each retry of the
            // suggested fix moved the version again while the drift stayed.
            for (const attempt of [1, 2]) {
                // Through the executor, as the warning's own hint invokes it.
                const run = runMeta(tempDir, 'executor.js', 'update-engine-meta');
                assert.notStrictEqual(
                    run.status,
                    0,
                    `attempt ${attempt}: drift that cannot be resolved must not exit 0`,
                );
                assert.match(
                    run.out,
                    /spec\.md/,
                    `attempt ${attempt}: the drifted files must be named`,
                );
                assert.match(
                    run.out,
                    /task\.md/,
                    `attempt ${attempt}: the drifted files must be named`,
                );
                assert.match(
                    run.out,
                    /release archive/,
                    `attempt ${attempt}: the only real remedy must be stated`,
                );
                assert.doesNotMatch(
                    run.out,
                    /Engine metadata and version updated/,
                    `attempt ${attempt}: must not claim a success that changed nothing`,
                );
            }

            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '1.0.0',
                'the engine version must not move',
            );
            assert.strictEqual(
                fs.readFileSync(checksumsPath, 'utf8'),
                manifestBefore,
                'the manifest must be left untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-engine-meta --check tells a user installation to restore from the release archive, and a dev repo to run C14', () => {
        const userDir = createTempWorkspace();
        const devDir = createTempWorkspace();
        try {
            makeDriftedEngine(userDir, { userInstallation: true });
            makeDriftedEngine(devDir, { userInstallation: false });

            const user = runMeta(userDir, 'update-engine-meta.js', '--check');
            assert.strictEqual(
                user.status,
                1,
                'drift must fail --check (the pre-commit hook relies on it)',
            );
            assert.match(user.out, /release archive/, 'user installation: the remedy is a restore');
            assert.doesNotMatch(
                user.out,
                /update-engine-meta/,
                'user installation: must not point at a command it cannot use — regenerating the manifest would mask the change',
            );

            const dev = runMeta(devDir, 'update-engine-meta.js', '--check');
            assert.strictEqual(dev.status, 1, 'dev repo: drift must fail --check');
            assert.match(
                dev.out,
                /update-engine-meta/,
                'dev repo: C14 is the remedy and must stay named',
            );
        } finally {
            cleanup(userDir);
            cleanup(devDir);
        }
    });

    test('check-prerequisites ENGINE_INTEGRITY names the release archive in a user installation, and the C14 command in a dev repo', () => {
        const userDir = createTempWorkspace();
        const devDir = createTempWorkspace();
        try {
            makeDriftedEngine(userDir, { userInstallation: true });
            makeDriftedEngine(devDir, { userInstallation: false });
            const integrity = (tempDir) =>
                runCheckPrerequisites(tempDir).warnings.filter(
                    (w) => w.type === 'ENGINE_INTEGRITY',
                );

            const user = integrity(userDir);
            assert.deepStrictEqual(
                user.map((w) => w.message.match(/'skills\/magicspec\/([^']+)'/)[1]).sort(),
                ['spec.md', 'task.md'],
                'user installation: exactly the two drifted files are reported',
            );
            for (const w of user) {
                assert.match(w.message, /release archive/, `user installation: ${w.message}`);
                assert.strictEqual(
                    w.fix,
                    null,
                    'user installation: there is no automated fix to suggest',
                );
            }

            const dev = integrity(devDir);
            assert.strictEqual(dev.length, 2, 'dev repo: the same two files are reported');
            for (const w of dev) {
                assert.match(
                    w.fix,
                    /update-engine-meta/,
                    'dev repo: the C14 command stays the suggested fix',
                );
            }
        } finally {
            cleanup(userDir);
            cleanup(devDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b-bis. A manifested engine file that is gone is drift, reported by the
    //         pre-flight as the update check already reports it.
    //
    //     The two checks read the same manifest and disagreed: the pre-flight
    //     hashed only the files that exist, so a deleted one produced no finding
    //     while `--check` failed on it.
    // ───────────────────────────────────────────────────────────────────────────
    const INTEGRITY_STATES = ['untouched', 'modified', 'deleted'];

    // A layout whose manifest matches the engine, then put in one of three
    // states. `.magicspec/` is present so that `ok` reflects the integrity story
    // alone: true for the untouched layout.
    const makeIntegrityLayout = (tempDir, { userInstallation, state }) => {
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '# spec\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'), '# task\n');
        fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index\n');
        fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules\n');
        generateChecksums(tempDir);
        if (userInstallation)
            fs.rmSync(path.join(tempDir, 'scripts'), { recursive: true, force: true });
        if (state === 'modified')
            fs.appendFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'spec.md'),
                '<!-- local note -->\n',
            );
        if (state === 'deleted') fs.rmSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'));
    };

    const integrityVerdicts = (tempDir) => {
        const pre = runCheckPrerequisites(tempDir);
        return {
            ok: pre.ok,
            findings: pre.warnings.filter((w) => w.type === 'ENGINE_INTEGRITY'),
            checkStatus: runMeta(tempDir, 'update-engine-meta.js', '--check').status,
        };
    };

    test('pre-flight and update-engine-meta --check agree on an untouched, a modified and a deleted layout, in a developer repository and in a user installation', () => {
        for (const userInstallation of [false, true]) {
            for (const state of INTEGRITY_STATES) {
                const tempDir = createTempWorkspace();
                try {
                    makeIntegrityLayout(tempDir, { userInstallation, state });
                    const verdict = integrityVerdicts(tempDir);
                    const label = `${userInstallation ? 'user installation' : 'developer repository'}, ${state}`;
                    if (state === 'untouched') {
                        assert.deepStrictEqual(
                            verdict.findings,
                            [],
                            `${label}: no integrity finding`,
                        );
                        assert.strictEqual(verdict.ok, true, `${label}: the pre-flight is clean`);
                        assert.strictEqual(verdict.checkStatus, 0, `${label}: --check is clean`);
                    } else {
                        assert.strictEqual(
                            verdict.findings.length,
                            1,
                            `${label}: exactly one finding`,
                        );
                        assert.strictEqual(
                            verdict.ok,
                            false,
                            `${label}: the pre-flight reports drift`,
                        );
                        assert.notStrictEqual(
                            verdict.checkStatus,
                            0,
                            `${label}: --check reports drift`,
                        );
                    }
                } finally {
                    cleanup(tempDir);
                }
            }
        }
    });

    test('pre-flight names a deleted engine file as missing, with the remedy of the installation kind, and keeps the modified-file wording', () => {
        const devDir = createTempWorkspace();
        const userDir = createTempWorkspace();
        const editedDir = createTempWorkspace();
        try {
            makeIntegrityLayout(devDir, { userInstallation: false, state: 'deleted' });
            makeIntegrityLayout(userDir, { userInstallation: true, state: 'deleted' });
            makeIntegrityLayout(editedDir, { userInstallation: false, state: 'modified' });

            const [dev] = integrityVerdicts(devDir).findings;
            assert.match(
                dev.message,
                /^'skills\/magicspec\/task\.md' is missing locally\./,
                'the file is named as missing',
            );
            assert.match(
                dev.fix,
                /update-engine-meta/,
                'developer repository: the C14 command is the remedy',
            );
            assert.doesNotMatch(
                dev.message,
                /release archive/,
                'developer repository: no restore instruction',
            );

            const [user] = integrityVerdicts(userDir).findings;
            assert.match(
                user.message,
                /^'skills\/magicspec\/task\.md' is missing locally\./,
                'the file is named as missing',
            );
            assert.match(
                user.message,
                /release archive/,
                'user installation: the remedy is a restore',
            );
            assert.strictEqual(
                user.fix,
                null,
                'user installation: there is no automated fix to suggest',
            );

            const [edited] = integrityVerdicts(editedDir).findings;
            assert.match(
                edited.message,
                /^'skills\/magicspec\/spec\.md' has been modified locally/,
                'a modified file keeps its own wording',
            );
        } finally {
            cleanup(devDir);
            cleanup(userDir);
            cleanup(editedDir);
        }
    });

    test('describeManifestDelta tells a line-endings-only difference from a content difference, in both directions', () => {
        const tempDir = createTempWorkspace();
        try {
            const { describeManifestDelta } = requireFromFixture(tempDir, 'utils.js');
            const file = path.join(tempDir, 'probe.md');

            // [on disk, what the manifest recorded, expected verdict]
            const cases = [
                [
                    'a\r\nb\r\n',
                    'a\nb\n',
                    { lineEndingsOnly: true, found: 'CRLF', expectedEol: 'LF' },
                ],
                [
                    'a\nb\n',
                    'a\r\nb\r\n',
                    { lineEndingsOnly: true, found: 'LF', expectedEol: 'CRLF' },
                ],
                [
                    'a\r\nb\n',
                    'a\nb\n',
                    { lineEndingsOnly: true, found: 'mixed', expectedEol: 'LF' },
                ],
                ['a\nc\n', 'a\nb\n', { lineEndingsOnly: false, found: 'LF', expectedEol: null }],
                // Both differ: the content difference is the finding, the endings are incidental.
                [
                    'a\r\nc\r\n',
                    'a\nb\n',
                    { lineEndingsOnly: false, found: 'CRLF', expectedEol: null },
                ],
            ];
            for (const [onDisk, recorded, want] of cases) {
                fs.writeFileSync(file, onDisk);
                const got = describeManifestDelta(file, sha256Hex(recorded));
                const label = JSON.stringify({ onDisk, recorded });
                assert.strictEqual(got.actual, sha256Hex(onDisk), `actual hash for ${label}`);
                assert.strictEqual(got.expected, sha256Hex(recorded), `expected hash for ${label}`);
                assert.strictEqual(
                    got.lineEndingsOnly,
                    want.lineEndingsOnly,
                    `lineEndingsOnly for ${label}`,
                );
                assert.strictEqual(got.found, want.found, `found for ${label}`);
                assert.strictEqual(got.expectedEol, want.expectedEol, `expectedEol for ${label}`);
            }

            // The verdict must not depend on multi-byte text surviving a round trip.
            fs.writeFileSync(file, 'сводка — §1\r\n');
            assert.strictEqual(
                describeManifestDelta(file, sha256Hex('сводка — §1\n')).lineEndingsOnly,
                true,
                'non-ASCII bytes must round-trip exactly',
            );

            // A vanished file is reported, never thrown: a diagnostic must not become a second failure.
            assert.strictEqual(
                describeManifestDelta(path.join(tempDir, 'absent.md'), sha256Hex('x')),
                null,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('check-prerequisites ENGINE_INTEGRITY carries both hashes for a content edit, and a line-endings-only difference is one advisory finding, not drift', () => {
        const devDir = createTempWorkspace();
        const userDir = createTempWorkspace();
        try {
            makeDriftedEngine(devDir, { userInstallation: false, taskEndingsOnly: true });
            makeDriftedEngine(userDir, { userInstallation: true, taskEndingsOnly: true });
            const short = (text) => sha256Hex(text).slice(0, 12);

            for (const [label, tempDir] of [
                ['dev repo', devDir],
                ['user installation', userDir],
            ]) {
                const report = runCheckPrerequisites(tempDir);
                const byFile = Object.fromEntries(
                    report.warnings
                        .filter((w) => w.type === 'ENGINE_INTEGRITY')
                        .map((w) => [
                            w.message.match(/'skills\/magicspec\/([^']+)'/)[1],
                            w.message,
                        ]),
                );

                // task.md: converted to CRLF, otherwise identical to what the manifest recorded.
                assert.deepStrictEqual(
                    Object.keys(byFile),
                    ['spec.md'],
                    `${label}: only the content edit is drift`,
                );
                const advisory = report.warnings.filter((w) => w.type === 'ENGINE_LINE_ENDINGS');
                assert.strictEqual(advisory.length, 1, `${label}: one advisory finding`);
                assert.match(
                    advisory[0].message,
                    /1 file\(s\) of .+ differ from the release only in line endings \(found CRLF\); they are treated as unchanged/,
                    `${label}: the advisory names the cause`,
                );

                // spec.md: edited. Content difference, plain wording, still both hashes.
                assert.doesNotMatch(
                    byFile['spec.md'],
                    /line endings/,
                    `${label}: a content edit must not be blamed on line endings`,
                );
                assert.ok(
                    byFile['spec.md'].includes(
                        `sha256 expected ${short('# spec\n')}, found ${short('# spec\n<!-- local note -->\n')}`,
                    ),
                    `${label}: both hashes must be recorded — ${byFile['spec.md']}`,
                );
            }
        } finally {
            cleanup(devDir);
            cleanup(userDir);
        }
    });

    test('update-engine-meta --check reports a content edit as drift and a line-endings-only difference as one information line', () => {
        const tempDir = createTempWorkspace();
        try {
            makeDriftedEngine(tempDir, { userInstallation: true, taskEndingsOnly: true });
            const run = runMeta(tempDir, 'update-engine-meta.js', '--check');
            const lineFor = (name) =>
                run.out.split(/\r?\n/).find((l) => l.includes(`Detected change in: ${name}`));

            assert.ok(lineFor('spec.md'), 'the content edit is drift');
            assert.doesNotMatch(
                lineFor('spec.md'),
                /line endings/,
                'and is not blamed on line endings',
            );
            assert.strictEqual(lineFor('task.md'), undefined, 'a conversion alone is not drift');
            assert.match(
                run.out,
                /1 engine file\(s\) differ from the release only in line endings; they are treated as unchanged/,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5d. update-engine-meta.js --check stays strictly read-only even when
    //     workflows/ (outside its scope) has an uncommitted change. This is
    //     the boundary the write-path fix (5c) must not cross: --check is
    //     hardcoded into the user's pre-commit hook, so it must never gain a
    //     write side effect — that would turn every commit into a mutation.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta.js --check performs no write and never regenerates skills, even with a pending workflows/ change', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir, { recursive: true });
            fs.writeFileSync(
                path.join(workflowsDir, 'magic.example.md'),
                '---\nname: magic.example\ndescription: Does the original thing to the plan. Use when the user asks for the original thing.\n---\n\n# Example\n\nOriginal body.\n',
            );

            const metaScript = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'update-engine-meta.js',
            );
            const versionPath = path.join(tempDir, 'skills', 'magicspec', '.version');
            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
            const skillPath = path.join(tempDir, 'skills', 'magic-example', 'SKILL.md');

            const versionBefore = fs.readFileSync(versionPath, 'utf8');
            const checksumsBefore = fs.readFileSync(checksumsPath, 'utf8');

            const checkOut = execSync(`node "${metaScript}" --check`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8'),
                versionBefore,
                '--check must never write skills/magicspec/.version',
            );
            assert.strictEqual(
                fs.readFileSync(checksumsPath, 'utf8'),
                checksumsBefore,
                '--check must never write skills/magicspec/.checksums',
            );
            assert.ok(
                !fs.existsSync(skillPath),
                '--check must never trigger skill regeneration — a write side effect on a read-only surface',
            );
            assert.match(checkOut, /No changes detected in skills\/magicspec\//);
        } finally {
            cleanup(tempDir);
        }
    });
};
