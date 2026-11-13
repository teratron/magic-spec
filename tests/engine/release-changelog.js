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
    loadChangelogWriter,
    createFinalizeFixture,
    commitFixture,
} = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 17. release-changelog.js — explicit opt-in CHANGELOG rotation (R11)
    // ───────────────────────────────────────────────────────────────────────────
    test('release-changelog.js handles --help and rejects unknown arguments without rotating (R11 CLI contract)', () => {
        const tempDir = createTempWorkspace();
        try {
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            const original = [
                '# Changelog',
                '',
                '## [Unreleased]',
                '',
                '### Added',
                '',
                '- Keep this entry in place.',
                '',
            ].join('\n');
            fs.writeFileSync(changelogPath, original);
            const executorPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'executor.js',
            );

            const help = execSync(`node "${executorPath}" release-changelog --help`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(
                help,
                /Usage: node skills\/magicspec\/scripts\/executor\.js release-changelog/,
            );
            assert.strictEqual(
                fs.readFileSync(changelogPath, 'utf8'),
                original,
                '--help must leave CHANGELOG.md byte-for-byte unchanged',
            );

            assert.throws(
                () =>
                    execSync(`node "${executorPath}" release-changelog --unknown`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    }),
                (error) => {
                    assert.strictEqual(error.status, 1, 'unknown arguments exit non-zero');
                    assert.match(error.stderr.toString(), /Unknown option '--unknown'/);
                    return true;
                },
            );
            assert.strictEqual(
                fs.readFileSync(changelogPath, 'utf8'),
                original,
                'an unknown argument must leave CHANGELOG.md byte-for-byte unchanged',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotates [Unreleased] into a dated version heading, defaulting version/date (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            fs.writeFileSync(
                changelogPath,
                [
                    '# Changelog',
                    '',
                    'All notable changes to this project will be documented in this file.',
                    '',
                    '## [Unreleased]',
                    '',
                    '### Added',
                    '',
                    '- Something new.',
                    '',
                ].join('\n'),
            );
            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'release-changelog.js',
            );

            const out = execSync(`node "${scriptPath}" --version=9.9.9 --date=2026-01-01`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(
                out,
                /Rotated \[Unreleased\] → \[9\.9\.9\] - 2026-01-01/,
                'confirms the rotation it performed',
            );
            const rotated = fs.readFileSync(changelogPath, 'utf8');
            assert.match(
                rotated,
                /## \[Unreleased\]\s*\n\s*## \[9\.9\.9\] - 2026-01-01/,
                'Unreleased renamed, fresh Unreleased opened above it',
            );
            assert.match(
                rotated,
                /### Added\s*\n\s*- Something new\./,
                'prior bullets survive under the newly-dated heading',
            );

            // Defaults: --version from .magicspec/.version, --date = today (UTC).
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', '.version'), '4.5.6\n');
            const out2 = execSync(`node "${scriptPath}"`, { cwd: tempDir, encoding: 'utf8' });
            const today = new Date().toISOString().slice(0, 10);
            assert.match(
                out2,
                new RegExp(`Rotated \\[Unreleased\\] → \\[4\\.5\\.6\\] - ${today}`),
                'falls back to .magicspec/.version and today when flags are omitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotation restores per-window bullet distinguishability (R11 §4.1/§4.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = requireFromFixture(
                tempDir,
                'lib',
                'changelog-writer.js',
            );
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');

            const bullet = 'Updated task plan and task index (engine)';
            const r1 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(r1.written, true, 'first cycle writes the bullet');

            // Same bullet, no rotation yet — the closed-vocabulary suppression §4.1 documents.
            const r2 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(
                r2.deduped,
                true,
                'identical bullet within the same window is correctly deduped',
            );

            const rot = releaseUnreleased(changelogPath, '1.0.0', '2026-02-01');
            assert.strictEqual(rot.written, true, 'rotation must actually write');

            // Same bullet, new window — must be writable again, not permanently suppressed.
            const r3 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(
                r3.written,
                true,
                'the same real-work bullet must be writable again after rotation',
            );

            const escaped = bullet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const occurrences = (
                fs.readFileSync(changelogPath, 'utf8').match(new RegExp(escaped, 'g')) || []
            ).length;
            assert.strictEqual(
                occurrences,
                2,
                'the bullet must appear once in the released section and once in the fresh Unreleased',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotation keeps a blank line under the renamed version heading', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = loadChangelogWriter(tempDir);
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            appendBullet(changelogPath, 'Added', 'first');
            releaseUnreleased(changelogPath, '1.0.0', '2026-02-01');
            appendBullet(changelogPath, 'Added', 'second');

            const text = fs.readFileSync(changelogPath, 'utf8');
            assert.ok(
                text.includes('## [1.0.0] - 2026-02-01\n\n### Added\n\n- first\n'),
                'the released heading must stay separated from its first sub-heading (MD022)',
            );
            assert.ok(!/\n\n\n/.test(text), 'no consecutive blank lines (MD012)');
        } finally {
            cleanup(tempDir);
        }
    });

    test('export-wiki.js pages keep blank lines around headings and lists, even for an empty workspace', () => {
        const tempDir = createTempWorkspace();
        try {
            const graph = {
                nodes: [
                    { id: 'workspace:full', type: 'workspace', label: 'full' },
                    { id: 'workspace:empty', type: 'workspace', label: 'empty' },
                    {
                        id: 'spec:full/a.md',
                        type: 'spec',
                        label: 'a.md',
                        workspace: 'full',
                        layer: 1,
                        status: 'Stable',
                        version: '1.0.0',
                    },
                ],
                edges: [{ from: 'workspace:full', to: 'spec:full/a.md', relation: 'contains' }],
                analysis: {
                    god_nodes: [{ id: 'spec:full/a.md', type: 'spec', label: 'a.md', degree: 3 }],
                    orphaned_files: ['x.js'],
                },
            };
            const graphPath = path.join(tempDir, 'graph.json');
            fs.writeFileSync(graphPath, JSON.stringify(graph));
            execSync(
                `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js')}" export-wiki --from-file graph.json --out wiki`,
                { cwd: tempDir, stdio: 'pipe' },
            );

            const wikiDir = path.join(tempDir, 'wiki');
            const pages = fs.readdirSync(wikiDir).filter((f) => f.endsWith('.md'));
            assert.ok(pages.length >= 3, 'index, both workspaces and the spec are exported');
            for (const page of pages) {
                const lines = fs.readFileSync(path.join(wikiDir, page), 'utf8').split('\n');
                lines.forEach((line, i) => {
                    const prev = lines[i - 1];
                    const next = lines[i + 1];
                    const where = `${page}:${i + 1}`;
                    if (/^#{1,6} /.test(line)) {
                        assert.ok(i === 0 || prev === '', `${where}: blank line above heading`);
                        assert.ok(next === '', `${where}: blank line below heading`);
                    }
                    if (/^- /.test(line)) {
                        assert.ok(
                            prev === '' || /^- /.test(prev),
                            `${where}: blank line above list`,
                        );
                        assert.ok(
                            next === '' || /^- /.test(next),
                            `${where}: blank line below list`,
                        );
                    }
                    assert.ok(!(line === '' && prev === ''), `${where}: consecutive blank lines`);
                });
                assert.ok(
                    !/^\*\*[^*]+\*\*$/m.test(lines.join('\n')),
                    `${page}: bold-only line reads as a heading (MD036)`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js no longer references releaseUnreleased — rotation is opt-in only (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const src = fs.readFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'finalize.js'),
                'utf8',
            );
            assert.doesNotMatch(
                src,
                /releaseUnreleased/,
                'finalize.js must not import or call releaseUnreleased',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test("finalize.js's deduped CHANGELOG row names release-changelog as the remedy (§4.5)", () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
                autoChangelog: true,
            });
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '- [ ] [T-1A01] Task',
                    '',
                ].join('\n'),
            );
            commitFixture(tempDir);

            // First run: the bullet is genuinely new — must append normally,
            // no hint. Control case for the second assertion below.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '- [x] [T-1A01] Task',
                    '',
                ].join('\n'),
            );
            const firstOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            const firstRow = firstOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(
                firstRow,
                /appended to \[Unreleased\] § Changed/,
                'first run: bullet is new, must append normally',
            );
            assert.doesNotMatch(
                firstRow,
                /release-changelog/,
                'first run: no hint when nothing was deduped',
            );

            // Second run: same shape (one /tasks/ file changed) reproduces the
            // identical bullet ("Completed task (main)") — the exact §4.1
            // vocabulary-exhaustion scenario the field report reproduced.
            commitFixture(tempDir);
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: Done',
                    '---',
                    '',
                    '- [x] [T-1A01] Task',
                    '- [x] [T-1A02] Another',
                    '',
                ].join('\n'),
            );
            const secondOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            const secondRow = secondOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(
                secondRow,
                /skipped \(duplicate/,
                'second run: identical bullet shape must dedupe exactly as §4.1 documents',
            );
            assert.match(
                secondRow,
                /release-changelog/,
                'second run: the deduped row must name the remedy (§4.5)',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
