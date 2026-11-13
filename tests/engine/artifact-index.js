'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { TESTS_DIR, scriptsDir, cleanup } = require('./lib/base');
const {
    SIM_SCRIPTS,
    SIM_ENGINE_REL,
    makeSimConsumer,
    simExec,
    treeHashes,
    simPutter,
    stateFolderOfRepo,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // Artifact memory index (l2-artifact-memory-store.md)
    // ───────────────────────────────────────────────────────────────────────────

    const memorySectionsPath = path.join(scriptsDir, 'lib', 'memory-sections.js');

    /** The sorted paths a backend returns for the word `retry` under the given options. */
    const retryPaths = (backend, options) =>
        backend
            .query(require(memorySectionsPath).parseQuery('retry'), options)
            .map((r) => r.path)
            .sort();

    /** Every unit of every indexed artifact of this repository's own state folder. */
    const repoMemoryUnits = () => {
        const memory = require(memorySectionsPath);
        const { files } = memory.listArtifacts(stateFolderOfRepo);
        return files.flatMap((rel) =>
            memory.sectionsOf(rel, fs.readFileSync(path.join(stateFolderOfRepo, rel), 'utf8')),
        );
    };

    test('memory sections: a specification section carries the status and version its registry row records, and no other kind carries either (AM-2)', () => {
        const rows = new Map();
        const registry = fs.readFileSync(
            path.join(stateFolderOfRepo, 'engine', 'INDEX.md'),
            'utf8',
        );
        for (const line of registry.split('\n')) {
            const match =
                /^\| \[([^\]]+\.md)\]\(specifications\/[^)]+\) \|.*\| (\w+) \| \d+ \| ([\d.]+) \|\s*$/.exec(
                    line,
                );
            if (match) rows.set(`engine/specifications/${match[1]}`, `${match[2]} ${match[3]}`);
        }
        assert.ok(rows.size > 40, `the registry rows were read (${rows.size})`);
        const units = repoMemoryUnits();
        const specUnits = units.filter((u) => u.kind === 'spec');
        assert.ok(specUnits.length > rows.size, 'every specification yields at least one section');
        for (const unit of specUnits) {
            if (!rows.has(unit.path)) {
                // A file below specifications/ that the registry does not list (a scenario file) keeps its own header.
                assert.ok(
                    unit.path.split('/').length > 3,
                    `${unit.path}: only a nested file is unregistered`,
                );
                continue;
            }
            assert.strictEqual(
                `${unit.status} ${unit.version}`,
                rows.get(unit.path),
                `${unit.path}: the unit's status and version are the registry row's`,
            );
        }
        assert.ok(
            [...rows.keys()].every((rel) => specUnits.some((u) => u.path === rel)),
            'every registered specification yields a section',
        );
        for (const unit of units.filter((u) => u.kind !== 'spec')) {
            assert.strictEqual(
                `${unit.status}${unit.version}`,
                '',
                `${unit.path}: only a specification carries them`,
            );
        }
    });

    test('memory sections: an archived file is kind archive, a Document History heading is its own history section, and a heading inside a fenced block starts no section (AM-2, AM-6)', () => {
        const memory = require(memorySectionsPath);
        const units = repoMemoryUnits();
        const archived = units.filter((u) => u.path.includes('/archives/'));
        assert.ok(archived.length > 0, 'the repository has archived phases');
        assert.ok(
            archived.every((u) => u.kind === 'archive' || u.kind === 'history'),
            'a section under archives/ is an archive section (or a history table inside one)',
        );
        const history = units.filter((u) => /› ## Document History$/.test(u.heading));
        assert.ok(history.length > 20, `Document History tables were found (${history.length})`);
        assert.ok(
            history.every((u) => u.kind === 'history'),
            'each is a history section',
        );
        assert.ok(
            units
                .filter((u) => u.kind === 'history')
                .every((u) => /Document History$/.test(u.heading)),
            'no other section is classed as history',
        );

        const fenced = memory.sectionsOf(
            'engine/specifications/x.md',
            '# T\n\n## A\n\ntext\n\n```markdown\n## Not A Heading\n```\n\n## B\n\nmore\n',
        );
        assert.deepStrictEqual(
            fenced.map((u) => u.heading),
            ['# T › ## A', '# T › ## B'],
            'the heading in the fence is body text of A',
        );
        assert.ok(fenced[0].body.includes('## Not A Heading'));
    });

    test('memory sections: no part exceeds 2000 characters unless it is one line, every part keeps its heading path, and the units are identical across two runs (AM-1, AM-2)', () => {
        const memory = require(memorySectionsPath);
        const first = repoMemoryUnits();
        const second = repoMemoryUnits();
        assert.deepStrictEqual(first, second, 'sectioning is deterministic');
        for (const unit of first) {
            assert.ok(
                unit.heading.startsWith('# '),
                `${unit.path}: the heading path starts at the title`,
            );
            if (unit.body.length > memory.MAX_SECTION_CHARS) {
                assert.ok(
                    !unit.body.includes('\n'),
                    `${unit.path} › ${unit.heading}: an over-long part is one line`,
                );
            }
        }
        const ordinals = new Map();
        for (const unit of first) {
            const seen = ordinals.get(unit.path) ?? [];
            seen.push(unit.ordinal);
            ordinals.set(unit.path, seen);
        }
        for (const [file, list] of ordinals) {
            assert.deepStrictEqual(
                list,
                list.map((_, i) => i),
                `${file}: ordinals count up from 0`,
            );
        }

        // A long section is cut at paragraph boundaries, each part under the bound.
        const paragraph = `${'word '.repeat(150)}end`;
        const long = `# T\n\n## A\n\n${[paragraph, paragraph, paragraph, paragraph].join('\n\n')}\n`;
        const parts = memory.sectionsOf('RULES.md', long);
        assert.ok(parts.length > 1, 'a long section is split');
        assert.ok(
            parts.every(
                (u) => u.body.length <= memory.MAX_SECTION_CHARS && u.heading === '# T › ## A',
            ),
        );
        assert.strictEqual(
            parts.map((u) => u.body).join('\n\n'),
            [paragraph, paragraph, paragraph, paragraph].join('\n\n'),
        );
    });

    test('memory sections: derived files are never read — the extraction cache, the graph folder and CONTEXT.md — and a Markdown file no kind covers is reported, not indexed (AM-1)', () => {
        const memory = require(memorySectionsPath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const put = (rel, text) => {
                fs.mkdirSync(path.dirname(path.join(tempDir, rel)), { recursive: true });
                fs.writeFileSync(path.join(tempDir, rel), text);
            };
            put('INDEX.md', '# Registry\n\n## Overview\n\nroot\n');
            put('CONTEXT.md', '# Context\n\n## A\n\nderived\n');
            put('ws/CONTEXT.md', '# Context\n\n## A\n\nderived\n');
            put('graph/wiki/index.md', '# Wiki\n\n## A\n\nderived\n');
            put('.cache/notes.md', '# Cache\n\n## A\n\nderived\n');
            put(
                'ws/specifications/l1-a.md',
                '# A\n\n**Status:** Stable\n**Version:** 1.0.0\n\n## Overview\n\nbody\n',
            );
            put('ws/simulations/area.md', '# Scenarios\n\n## S1\n\nno kind covers this\n');
            const { files, unkinded } = memory.listArtifacts(tempDir);
            assert.deepStrictEqual(files, ['INDEX.md', 'ws/specifications/l1-a.md']);
            assert.deepStrictEqual(unkinded, ['ws/simulations/area.md']);
            assert.deepStrictEqual(
                memory.sectionsOf('ws/simulations/area.md', '# S\n\n## A\n\nx'),
                [],
            );
            assert.deepStrictEqual(
                memory.listArtifacts(path.join(tempDir, 'absent')),
                { files: [], unkinded: [] },
                'a missing state folder lists nothing',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    const memoryFallbackPath = path.join(scriptsDir, 'lib', 'memory-fallback.js');

    /** A fixed corpus of three sections, as `sectionsOf` would produce them. */
    const memoryCorpus = () => {
        const unit = (heading, body, extra = {}) => ({
            path: 'ws/specifications/l1-a.md',
            heading: `# Doc › ## ${heading}`,
            kind: 'spec',
            workspace: 'ws',
            status: 'Stable',
            version: '1.0.0',
            ordinal: 0,
            lineStart: 3,
            lineEnd: 5,
            body,
            ...extra,
        });
        return [
            unit('Alpha', 'check prerequisites runs before every plan'),
            unit('Beta', 'check the plan and check the tasks', {
                ordinal: 1,
                lineStart: 7,
                lineEnd: 9,
            }),
            unit('Gamma', 'prerequisites are listed in the registry', {
                ordinal: 2,
                lineStart: 11,
                lineEnd: 13,
            }),
        ];
    };

    const openMemoryFallback = (dir) => {
        const backend = require(memoryFallbackPath).open(path.join(dir, 'memory.json'));
        backend.replaceFile('ws/specifications/l1-a.md', 'sha-a', memoryCorpus());
        return backend;
    };

    test('memory fallback: the tokenizer folds case and diacritics and splits at punctuation, and a hyphenated or dotted word is queried as a phrase of adjacent tokens (AM-4)', () => {
        const { tokenize, parseQuery } = require(memorySectionsPath);
        assert.deepStrictEqual(tokenize('Café NAÏVE_résumé v1.2'), [
            'cafe',
            'naive',
            'resume',
            'v1',
            '2',
        ]);
        assert.deepStrictEqual(tokenize('  --  '), []);
        assert.deepStrictEqual(parseQuery('check-prerequisites'), [['check', 'prerequisites']]);
        assert.deepStrictEqual(parseQuery('lib/memory.js retry'), [
            ['lib', 'memory', 'js'],
            ['retry'],
        ]);
        assert.deepStrictEqual(parseQuery('"adjacent words" other other'), [
            ['adjacent', 'words'],
            ['other'],
        ]);
        assert.deepStrictEqual(parseQuery('   '), []);

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const backend = openMemoryFallback(tempDir);
            const headings = (text) =>
                backend.query(parseQuery(text)).map((r) => r.heading.split(' › ')[1]);
            assert.deepStrictEqual(
                headings('check-prerequisites'),
                ['## Alpha'],
                'the phrase matches only where the two words are adjacent',
            );
            assert.deepStrictEqual(headings('prerequisites check'), [
                '## Alpha',
                '## Beta',
                '## Gamma',
            ]);
            assert.deepStrictEqual(
                headings('CHECK'),
                ['## Beta', '## Alpha'],
                'two hits outrank one',
            );
            assert.deepStrictEqual(headings('registry'), ['## Gamma']);
            assert.deepStrictEqual(headings('absent'), []);
            assert.deepStrictEqual(headings(''), []);
        } finally {
            cleanup(tempDir);
        }
    });

    test('memory fallback: the score is Okapi BM25 exactly as FTS5 computes it, over every section whatever the filters (AM-4)', () => {
        const { parseQuery } = require(memorySectionsPath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const backend = openMemoryFallback(tempDir);
            // One hit in the third of three rows; the rows hold 8, 9 and 8 tokens (heading and body).
            const idf = Math.log((3 - 1 + 0.5) / (1 + 0.5));
            const average = (8 + 9 + 8) / 3;
            const expected =
                (idf * (1 * (1.2 + 1))) / (1 + 1.2 * (1 - 0.75 + (0.75 * 8) / average));
            const [row] = backend.query(parseQuery('registry'));
            assert.ok(Math.abs(row.score - expected) < 1e-12, `${row.score} vs ${expected}`);

            // A term in every row has a non-positive IDF, floored at a tiny positive value.
            const [common] = backend.query(parseQuery('doc'), { limit: 1 });
            assert.ok(
                common.score > 0 && common.score < 1e-5,
                `a term in every row scores ~0 (${common.score})`,
            );

            // The statistics do not move with a filter: the score of one row is the same filtered or not.
            const filtered = backend.query(parseQuery('registry'), { kinds: ['spec'] });
            assert.strictEqual(filtered[0].score, row.score);
        } finally {
            cleanup(tempDir);
        }
    });

    test('memory fallback: kind, workspace and history filters apply to the ranked rows, and history kinds are out unless asked for (AM-6)', () => {
        const { parseQuery } = require(memorySectionsPath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const backend = require(memoryFallbackPath).open(path.join(tempDir, 'memory.json'));
            const unit = (rel, kind, workspace, body) => ({
                path: rel,
                heading: `# ${rel}`,
                kind,
                workspace,
                status: '',
                version: '',
                ordinal: 0,
                lineStart: 1,
                lineEnd: 1,
                body,
            });
            backend.replaceFile('a/PLAN.md', 'h1', [unit('a/PLAN.md', 'plan', 'a', 'retry rule')]);
            backend.replaceFile('b/PLAN.md', 'h2', [unit('b/PLAN.md', 'plan', 'b', 'retry rule')]);
            backend.replaceFile('a/CHANGELOG.md', 'h3', [
                unit('a/CHANGELOG.md', 'changelog', 'a', 'retry rule'),
            ]);
            backend.replaceFile('a/archives/p.md', 'h4', [
                unit('a/archives/p.md', 'archive', 'a', 'retry rule'),
            ]);
            const paths = (options) => retryPaths(backend, options);
            assert.deepStrictEqual(paths({}), ['a/PLAN.md', 'b/PLAN.md']);
            assert.deepStrictEqual(paths({ workspace: 'b' }), ['b/PLAN.md']);
            assert.deepStrictEqual(paths({ history: true }), [
                'a/CHANGELOG.md',
                'a/PLAN.md',
                'a/archives/p.md',
                'b/PLAN.md',
            ]);
            assert.deepStrictEqual(
                paths({ kinds: ['changelog'] }),
                ['a/CHANGELOG.md'],
                'a named history kind is returned',
            );
            assert.strictEqual(
                backend.query(parseQuery('retry'), { history: true, limit: 2 }).length,
                2,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('memory fallback: a file is replaced and removed whole, the index survives a reopen, and a corrupt or other-version file is rebuilt while an unreadable one throws (AM-1, AM-8)', () => {
        const { parseQuery } = require(memorySectionsPath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        const cachePath = path.join(tempDir, 'memory.json');
        try {
            const backend = openMemoryFallback(tempDir);
            backend.setMeta('provider', 'none');
            backend.save();
            const again = require(memoryFallbackPath).open(cachePath);
            assert.deepStrictEqual(
                [...again.fileHashes()],
                [['ws/specifications/l1-a.md', 'sha-a']],
            );
            assert.strictEqual(again.sectionCount(), 3);
            assert.strictEqual(again.getMeta('provider'), 'none');
            assert.strictEqual(again.getMeta('backend'), 'fallback');
            assert.strictEqual(again.query(parseQuery('registry')).length, 1);

            again.replaceFile('ws/specifications/l1-a.md', 'sha-b', [memoryCorpus()[0]]);
            assert.strictEqual(again.sectionCount(), 1, "the file's old sections are gone");
            assert.strictEqual(again.query(parseQuery('registry')).length, 0);
            again.removeFile('ws/specifications/l1-a.md');
            assert.strictEqual(again.fileHashes().size, 0);
            assert.strictEqual(again.sectionCount(), 0);

            fs.writeFileSync(cachePath, '{ not json');
            assert.strictEqual(
                require(memoryFallbackPath).open(cachePath).sectionCount(),
                0,
                'a corrupt file is rebuilt',
            );
            fs.writeFileSync(
                cachePath,
                JSON.stringify({ meta: { schema_version: '0' }, sections: [{ id: 1 }] }),
            );
            assert.strictEqual(
                require(memoryFallbackPath).open(cachePath).sectionCount(),
                0,
                'another layout is rebuilt',
            );

            fs.rmSync(cachePath);
            fs.mkdirSync(cachePath);
            assert.throws(
                () => require(memoryFallbackPath).open(cachePath),
                'an unreadable index is an error',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('memory fallback: the module requires nothing beyond Node and its own folder, so it runs on the stated runtime floor (§2)', () => {
        for (const file of ['memory-sections.js', 'memory-fallback.js', 'memory-sqlite.js']) {
            const source = fs.readFileSync(path.join(scriptsDir, 'lib', file), 'utf8');
            const required = [...source.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
            assert.ok(required.length > 0);
            for (const name of required) {
                assert.ok(
                    ['fs', 'path'].includes(name) ||
                        /^\.\/memory-[a-z]+$/.test(name) ||
                        (file === 'memory-sqlite.js' && name === 'node:sqlite'),
                    `${file} requires only node:fs, node:path, its siblings and, for the SQLite backend, node:sqlite (${name})`,
                );
            }
        }
    });

    const memorySqlitePath = path.join(scriptsDir, 'lib', 'memory-sqlite.js');

    /** Whether this runtime can run the SQLite backend: the module loads and makes an FTS5 table. */
    const memorySqliteWorks = (() => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-probe-'));
        try {
            const backend = require(memorySqlitePath).openBackend(dir);
            const works = backend.name === 'sqlite';
            backend.close();
            return works;
        } catch {
            return false;
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    })();
    const needsSqlite = {
        skip: memorySqliteWorks ? false : 'node:sqlite with FTS5 is not available on this runtime',
    };

    const openMemorySqlite = (dir) => {
        const backend = require(memorySqlitePath).openBackend(dir);
        assert.strictEqual(backend.name, 'sqlite');
        backend.replaceFile('ws/specifications/l1-a.md', 'sha-a', memoryCorpus());
        return backend;
    };

    test('memory sqlite: the backend is chosen by loading the module and making an FTS5 table, never by a runtime version, and falls back with the reason (§2)', () => {
        const { openBackend } = require(memorySqlitePath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            // The module is absent (an older runtime): the fallback, with nothing to report.
            const absent = openBackend(path.join(tempDir, 'a'), {
                loader: () => {
                    throw Object.assign(new Error('No such built-in module: node:sqlite'), {
                        code: 'ERR_UNKNOWN_BUILTIN_MODULE',
                    });
                },
            });
            assert.strictEqual(absent.name, 'fallback');
            assert.strictEqual(absent.fallbackReason, null);
            assert.ok(
                !fs.existsSync(path.join(tempDir, 'a', 'memory.sqlite')),
                'no database file is left behind',
            );

            // The module loads but has no FTS5: the fallback, with the reason, and no stray database file.
            const noFts = openBackend(path.join(tempDir, 'b'), {
                loader: () => ({
                    DatabaseSync: class {
                        exec(sql) {
                            if (/fts5/i.test(sql)) throw new Error('no such module: fts5');
                        }
                        prepare() {
                            return { get: () => undefined, run() {} };
                        }
                        close() {}
                    },
                }),
            });
            assert.strictEqual(noFts.name, 'fallback');
            assert.match(noFts.fallbackReason, /fts5/);
            assert.ok(!fs.existsSync(path.join(tempDir, 'b', 'memory.sqlite')));
            assert.ok(
                !/process\.version|versions\.node/.test(fs.readFileSync(memorySqlitePath, 'utf8')),
                'no version table or check',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test(
        "memory sqlite: on the fixed corpus it returns the fallback's ordering for the same queries, phrase and OR included (AM-4)",
        needsSqlite,
        () => {
            const { parseQuery } = require(memorySectionsPath);
            const sqliteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            const jsonDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            try {
                const sqlite = openMemorySqlite(sqliteDir);
                const fallback = openMemoryFallback(jsonDir);
                for (const text of [
                    'check-prerequisites',
                    'check',
                    'prerequisites check',
                    'registry',
                    'plan tasks',
                    'doc',
                    '"check the" tasks',
                ]) {
                    const a = sqlite.query(parseQuery(text));
                    const b = fallback.query(parseQuery(text));
                    assert.deepStrictEqual(
                        a.map((r) => r.heading),
                        b.map((r) => r.heading),
                        `same order for: ${text}`,
                    );
                    a.forEach((row, i) => {
                        assert.ok(
                            Math.abs(row.score - b[i].score) < 1e-9,
                            `same score for: ${text} (${row.score} vs ${b[i].score})`,
                        );
                    });
                }
                // Filters.
                const retry = (backend, options) =>
                    backend.query(parseQuery('registry'), options).map((r) => r.kind);
                assert.deepStrictEqual(retry(sqlite, { kinds: ['plan'] }), []);
                assert.deepStrictEqual(retry(sqlite, { workspace: 'other' }), []);
                assert.deepStrictEqual(retry(sqlite, { workspace: 'ws' }), ['spec']);
                sqlite.close();
            } finally {
                cleanup(sqliteDir);
                cleanup(jsonDir);
            }
        },
    );

    test(
        'memory sqlite: history kinds are out unless asked for, files are replaced and removed whole, and the index survives a reopen only after save (AM-6, AM-1)',
        needsSqlite,
        () => {
            const { parseQuery } = require(memorySectionsPath);
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            try {
                const { openBackend } = require(memorySqlitePath);
                const backend = openMemorySqlite(tempDir);
                const unit = (rel, kind, body) => ({
                    path: rel,
                    heading: `# ${rel}`,
                    kind,
                    workspace: 'ws',
                    status: '',
                    version: '',
                    ordinal: 0,
                    lineStart: 1,
                    lineEnd: 1,
                    body,
                });
                backend.replaceFile('ws/archives/p.md', 'h', [
                    unit('ws/archives/p.md', 'archive', 'retry rule'),
                ]);
                backend.replaceFile('ws/PLAN.md', 'g', [unit('ws/PLAN.md', 'plan', 'retry rule')]);
                const paths = (options) => retryPaths(backend, options);
                assert.deepStrictEqual(paths({}), ['ws/PLAN.md']);
                assert.deepStrictEqual(paths({ history: true }), [
                    'ws/PLAN.md',
                    'ws/archives/p.md',
                ]);
                assert.deepStrictEqual(paths({ kinds: ['archive'] }), ['ws/archives/p.md']);

                // Unsaved writes are not durable: closing discards them.
                backend.close();
                const reopened = openBackend(tempDir);
                assert.strictEqual(reopened.sectionCount(), 0, 'nothing was saved');

                reopened.replaceFile('ws/PLAN.md', 'g', [unit('ws/PLAN.md', 'plan', 'retry rule')]);
                reopened.setMeta('provider', 'none');
                reopened.save();
                reopened.close();
                const again = openBackend(tempDir);
                assert.deepStrictEqual([...again.fileHashes()], [['ws/PLAN.md', 'g']]);
                assert.strictEqual(again.getMeta('provider'), 'none');
                assert.strictEqual(again.getMeta('backend'), 'sqlite');

                again.replaceFile('ws/PLAN.md', 'g2', [
                    unit('ws/PLAN.md', 'plan', 'something else'),
                ]);
                assert.strictEqual(
                    again.query(parseQuery('retry')).length,
                    0,
                    'the old text left the full-text index',
                );
                assert.strictEqual(again.query(parseQuery('something')).length, 1);
                again.removeFile('ws/PLAN.md');
                assert.strictEqual(again.sectionCount(), 0);
                assert.strictEqual(again.fileHashes().size, 0);
                again.close();
            } finally {
                cleanup(tempDir);
            }
        },
    );

    test(
        'memory sqlite: a database of another layout or one that is not a database is rebuilt, and one that cannot be opened is served by the fallback with the reason (AM-1, AM-8)',
        needsSqlite,
        () => {
            const { openBackend, SCHEMA_VERSION } = require(memorySqlitePath);
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            try {
                const dbPath = path.join(tempDir, 'memory.sqlite');
                const first = openMemorySqlite(tempDir);
                first.save();
                first.setMeta('schema_version', '0');
                first.save();
                first.close();
                const rebuilt = openBackend(tempDir);
                assert.strictEqual(rebuilt.name, 'sqlite');
                assert.strictEqual(rebuilt.sectionCount(), 0, 'another layout is rebuilt empty');
                assert.strictEqual(rebuilt.getMeta('schema_version'), SCHEMA_VERSION);
                rebuilt.close();

                fs.writeFileSync(dbPath, 'this is not a sqlite database, only text '.repeat(40));
                const healed = openBackend(tempDir);
                assert.strictEqual(healed.name, 'sqlite', 'a damaged file is replaced');
                assert.strictEqual(healed.sectionCount(), 0);
                healed.close();

                fs.rmSync(dbPath);
                fs.mkdirSync(dbPath);
                const blocked = openBackend(tempDir);
                assert.strictEqual(
                    blocked.name,
                    'fallback',
                    'a database that cannot be opened is served by the fallback',
                );
                assert.ok(blocked.fallbackReason, 'and the reason is reported');
            } finally {
                cleanup(tempDir);
            }
        },
    );

    test('memory sqlite: the executor passes the warning-silencing flag only to a command that uses SQLite, and only when this runtime lists it (§2)', () => {
        const { runtimeFlags } = require(path.join(scriptsDir, 'lib', 'commands.js'));
        const flag = ['--disable-warning=ExperimentalWarning'];
        assert.deepStrictEqual(
            runtimeFlags({ usesSqlite: true }, new Set(['--disable-warning'])),
            flag,
        );
        assert.deepStrictEqual(
            runtimeFlags({ usesSqlite: true }, new Set(['--no-warnings'])),
            [],
            'an older runtime gets no flag it would reject',
        );
        assert.deepStrictEqual(
            runtimeFlags({}, new Set(['--disable-warning'])),
            [],
            'a command without SQLite gets none',
        );
        assert.deepStrictEqual(
            runtimeFlags({ summary: 'x' }),
            [],
            'the default reads this runtime and a command without SQLite still gets none',
        );
        const executor = fs.readFileSync(path.join(scriptsDir, 'executor.js'), 'utf8');
        assert.ok(
            executor.includes(
                'cmdArgs = [...commands.runtimeFlags(commandEntry), jsPath, ...args];',
            ),
            'the executor applies it to the script it starts',
        );
    });

    /** A consumer project with a small state folder: two workspaces, a plan, an archive and a changelog. */
    const makeMemoryFixture = () => {
        const dir = makeSimConsumer();
        const put = simPutter(dir);
        put(
            '.magicspec/workspace.json',
            JSON.stringify({
                default: 'ws',
                workspaces: { ws: { scope: ['src'] }, other: { scope: ['lib'] } },
            }),
        );
        put('.magicspec/INDEX.md', '# Registry\n\n## Overview\n\nGlobal registry.\n');
        put(
            '.magicspec/ws/specifications/l1-a.md',
            '# Alpha\n\n**Version:** 1.2.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nThe overview.\n\n## Retry Rule\n\nA failed call is retried three times with a pause.\n',
        );
        put('.magicspec/ws/PLAN.md', '# Plan\n\n## Phase 1\n\nBuild the retry wrapper first.\n');
        put(
            '.magicspec/ws/archives/tasks/phase-0.md',
            '# Old\n\n## Tasks\n\nThe archivedword task retry.\n',
        );
        put(
            '.magicspec/ws/CHANGELOG.md',
            '# Changelog\n\n## 0.1.0\n\nchangeloggedword retry fix.\n',
        );
        put(
            '.magicspec/other/specifications/l1-b.md',
            '# Beta\n\n**Version:** 1.0.0\n**Status:** Draft\n\n## Overview\n\nOther workspace talks about retry too.\n',
        );
        return dir;
    };

    const memoryQuery = (dir, args, opts) => simExec(dir, ['memory-query', ...args], opts);

    test('memory-query: it ranks sections with citations, a score, the file, the heading path and the modes line, and composes no answer (AM-3)', () => {
        const dir = makeMemoryFixture();
        try {
            const result = memoryQuery(dir, ['retry rule']);
            assert.strictEqual(result.status, 0, result.stderr);
            const lines = result.stdout.trimEnd().split('\n');
            assert.strictEqual(lines[0], 'modes: lexical');
            assert.match(
                lines[1],
                /^ 1\. \d+\.\d {2}\.magicspec\/ws\/specifications\/l1-a\.md:\d+-\d+ › ## Retry Rule {3}\(spec, Stable v1\.2\.0, ~\d+ tokens\)$/,
            );
            assert.match(lines[2], /^ {6}A failed call is retried/);
            assert.ok(!/answer|summary/i.test(lines[0]), 'no synthesized text');

            const json = JSON.parse(memoryQuery(dir, ['retry rule', '--json']).stdout);
            assert.deepStrictEqual(json.modes, ['lexical']);
            const first = json.results[0];
            assert.strictEqual(first.file, '.magicspec/ws/specifications/l1-a.md');
            assert.strictEqual(first.heading, '# Alpha › ## Retry Rule');
            assert.deepStrictEqual(
                [first.kind, first.workspace, first.status, first.version],
                ['spec', 'ws', 'Stable', '1.2.0'],
            );
            assert.ok(first.score > 0 && typeof first.snippet === 'string');
            assert.ok(
                fs.existsSync(path.join(dir, first.file)),
                'a citation opens from the project root',
            );
            assert.ok(first.score >= json.results[json.results.length - 1].score, 'best first');
        } finally {
            cleanup(dir);
        }
    });

    test('memory-query: a file edited, added or deleted after indexing is answered from its current text before the query returns (AM-5)', () => {
        const dir = makeMemoryFixture();
        try {
            const put = simPutter(dir);
            const files = (text) =>
                JSON.parse(memoryQuery(dir, [text, '--json']).stdout).results.map((r) => r.file);
            assert.deepStrictEqual(files('zebra'), []);
            put(
                '.magicspec/ws/PLAN.md',
                '# Plan\n\n## Phase 1\n\nBuild the zebra wrapper first.\n',
            );
            assert.deepStrictEqual(files('zebra'), ['.magicspec/ws/PLAN.md'], 'the edit is seen');
            assert.deepStrictEqual(files('wrapper retry').includes('.magicspec/ws/PLAN.md'), true);
            put(
                '.magicspec/ws/specifications/l1-c.md',
                '# Gamma\n\n## Note\n\nA zebra crossing.\n',
            );
            assert.deepStrictEqual(
                files('crossing'),
                ['.magicspec/ws/specifications/l1-c.md'],
                'the new file is seen',
            );
            fs.rmSync(path.join(dir, '.magicspec/ws/specifications/l1-c.md'));
            assert.deepStrictEqual(files('crossing'), [], 'the deleted file is gone');

            const nothing = simExec(dir, ['memory-index']);
            assert.match(nothing.stdout, /\(0 indexed, \d+ unchanged, 0 removed\)/, nothing.stdout);
        } finally {
            cleanup(dir);
        }
    });

    test('memory-query: archives, history tables, retrospectives and changelogs are out of the results unless asked for, and kind, count and workspace narrow them (AM-6)', () => {
        const dir = makeMemoryFixture();
        try {
            const files = (args) =>
                JSON.parse(memoryQuery(dir, [...args, '--json']).stdout).results.map((r) =>
                    r.file.replace('.magicspec/', ''),
                );
            assert.ok(!files(['archivedword']).length, 'an archive is not returned by default');
            assert.ok(
                !files(['changeloggedword']).length,
                'a changelog is not returned by default',
            );
            assert.deepStrictEqual(files(['archivedword', '--history']), [
                'ws/archives/tasks/phase-0.md',
            ]);
            assert.deepStrictEqual(files(['changeloggedword', '--history']), ['ws/CHANGELOG.md']);
            assert.deepStrictEqual(files(['retry', '--kind=plan']), ['ws/PLAN.md']);
            assert.deepStrictEqual(
                files(['retry', '--kind', 'changelog']),
                ['ws/CHANGELOG.md'],
                'a named history kind is returned',
            );
            assert.strictEqual(files(['retry', '--history', '--k=2']).length, 2);

            const unknown = memoryQuery(dir, ['retry', '--kind=nonsense']);
            assert.strictEqual(unknown.status, 1);
            assert.match(unknown.stderr, /unknown kind 'nonsense'/);
            assert.strictEqual(memoryQuery(dir, ['retry', '--k=0']).status, 1);
            assert.strictEqual(
                memoryQuery(dir, []).status,
                1,
                'no text is a usage error, not a silent empty answer',
            );

            // The workspace the caller names narrows the search; the registry's default alone does not.
            assert.ok(
                files(['retry']).some((f) => f.startsWith('other/')),
                'the default workspace does not narrow',
            );
            const named = files(['retry', '--workspace=other']);
            assert.ok(
                named.length > 0 && named.every((f) => f.startsWith('other/')),
                `only the named workspace (${named})`,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('memory-index: it writes only under .cache, reports what it did, and a rebuild from nothing gives the same answers (AM-1)', () => {
        const dir = makeMemoryFixture();
        try {
            const before = treeHashes(dir);
            const built = simExec(dir, ['memory-index']);
            assert.strictEqual(built.status, 0, built.stderr);
            assert.match(
                built.stdout,
                /^\[memory-index\] (sqlite|fallback): \d+ sections in 6 files \(6 indexed, 0 unchanged, 0 removed\)\.$/m,
            );
            const after = treeHashes(dir);
            const changed = [...after.keys()].filter((k) => after.get(k) !== before.get(k));
            assert.ok(
                changed.every((k) => k.startsWith('.magicspec/.cache/')),
                `only the cache changed: ${changed}`,
            );

            const answers = () => memoryQuery(dir, ['retry', '--json', '--history']).stdout;
            const first = answers();
            for (const name of ['memory.sqlite', 'memory.json']) {
                fs.rmSync(path.join(dir, '.magicspec/.cache', name), { force: true });
            }
            assert.strictEqual(answers(), first, 'a deleted index is rebuilt with nothing lost');
            const rebuilt = simExec(dir, ['memory-index', '--rebuild']);
            assert.match(rebuilt.stdout, /\(6 indexed, 0 unchanged, 0 removed\)/);
            assert.strictEqual(answers(), first);
        } finally {
            cleanup(dir);
        }
    });

    test('memory-index and memory-query: a failure to build or open the index exits 0, records MEMORY_INDEX_UNAVAILABLE and tells the caller to search the text (AM-8)', () => {
        const dir = makeMemoryFixture();
        try {
            // Both index files are folders: neither backend can open its file.
            for (const name of ['memory.sqlite', 'memory.json']) {
                fs.mkdirSync(path.join(dir, '.magicspec/.cache', name), { recursive: true });
            }
            const index = simExec(dir, ['memory-index']);
            assert.strictEqual(index.status, 0, index.stderr);
            assert.match(
                index.stdout,
                /\[memory-index\] The artifact index is unavailable: .+ Search the text with grep instead\./,
            );

            const query = memoryQuery(dir, ['retry']);
            assert.strictEqual(query.status, 0, query.stderr);
            assert.match(
                query.stdout,
                /\[memory-query\] The artifact index is unavailable: .+ Search the text with grep instead\./,
            );
            const asJson = JSON.parse(memoryQuery(dir, ['retry', '--json']).stdout);
            assert.deepStrictEqual(asJson.results, []);
            assert.ok(asJson.unavailable, 'the data form says why');

            const sink = fs
                .readFileSync(path.join(dir, '.magicspec/.cache/diagnostics.jsonl'), 'utf8')
                .trim()
                .split('\n')
                .map((l) => JSON.parse(l));
            const codes = new Set(sink.map((f) => f.code));
            assert.ok(codes.has('MEMORY_INDEX_UNAVAILABLE'), `recorded: ${[...codes]}`);
            assert.ok(
                sink.every((f) => f.severity === 'warning' && f.remedy),
                'a warning with a remedy',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('memory-index and memory-query: started through the executor they print no experimental-feature warning, and both are marked as users of SQLite (§2)', () => {
        const { COMMANDS } = require(path.join(scriptsDir, 'lib', 'commands.js'));
        assert.strictEqual(COMMANDS['memory-index'].usesSqlite, true);
        assert.strictEqual(COMMANDS['memory-query'].usesSqlite, true);
        const dir = makeMemoryFixture();
        try {
            for (const args of [['memory-index'], ['memory-query', 'retry']]) {
                const result = simExec(dir, args);
                assert.strictEqual(result.status, 0, result.stderr);
                assert.doesNotMatch(
                    result.stderr,
                    /ExperimentalWarning|experimental/i,
                    `${args[0]} stderr: ${result.stderr}`,
                );
            }
        } finally {
            cleanup(dir);
        }
    });

    test('memory-query: the snippet shows the matched words in context, whitespace collapsed, with an ellipsis where it was cut', () => {
        const { snippetOf } = require(path.join(scriptsDir, 'memory-query.js'));
        const body = `${'filler '.repeat(40)}the needle is here\n\nand   more ${'tail '.repeat(60)}`;
        const snippet = snippetOf(body, [['needle']]);
        assert.ok(snippet.startsWith('… ') && snippet.endsWith(' …'), snippet);
        assert.ok(snippet.includes('the needle is here and more'), 'collapsed to one line');
        assert.ok(snippet.length <= 210);
        assert.strictEqual(snippetOf('short text', [['absent']]), 'short text');
    });

    const memoryEmbedPath = path.join(scriptsDir, 'lib', 'memory-embed.js');

    // A provider on this machine, as a separate process: the commands under test block the harness
    // while they run, so a server in the harness's own process could never answer them.
    const STUB_PROVIDER = `
const http = require('http');
const fs = require('fs');
const [logFile, modeFile] = process.argv.slice(2);
const WORDS = ['alpha', 'beta', 'gamma'];
const vectorOf = (text) => [...WORDS.map((w) => text.toLowerCase().split(w).length - 1), 1];
const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
        const json = JSON.parse(body);
        fs.appendFileSync(logFile, JSON.stringify({ auth: req.headers.authorization || null, model: json.model, input: json.input }) + '\\n');
        const mode = fs.readFileSync(modeFile, 'utf8').trim();
        if (mode === 'fail') { res.statusCode = 500; return res.end('no'); }
        const size = mode === 'wide' ? 8 : 4;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ data: json.input.map((t, i) => ({ index: i, embedding: vectorOf(t).concat(Array(size - 4).fill(0)) })).reverse() }));
    });
});
server.listen(0, '127.0.0.1', () => console.log(server.address().port));
`;
    /** The vector the stub provider gives a text: how often each of three words occurs, and a constant. */
    const stubVector = (text) => [
        ...['alpha', 'beta', 'gamma'].map((w) => text.toLowerCase().split(w).length - 1),
        1,
    ];

    const startStubProvider = async (dir) => {
        const scriptFile = path.join(dir, 'stub-provider.js');
        const logFile = path.join(dir, 'stub-requests.jsonl');
        const modeFile = path.join(dir, 'stub-mode.txt');
        fs.writeFileSync(scriptFile, STUB_PROVIDER);
        fs.writeFileSync(modeFile, 'ok');
        fs.writeFileSync(logFile, '');
        const child = require('child_process').spawn(
            process.execPath,
            [scriptFile, logFile, modeFile],
            { stdio: ['ignore', 'pipe', 'inherit'] },
        );
        const port = await new Promise((resolve, reject) => {
            child.stdout.once('data', (d) => resolve(Number(String(d).trim())));
            child.once('error', reject);
        });
        return {
            url: `http://127.0.0.1:${port}/v1/embeddings`,
            host: `127.0.0.1:${port}`,
            mode: (m) => fs.writeFileSync(modeFile, m),
            requests: () =>
                fs
                    .readFileSync(logFile, 'utf8')
                    .split('\n')
                    .filter(Boolean)
                    .map((l) => JSON.parse(l)),
            stop: () => child.kill(),
        };
    };

    const embeddingsSetting = (url, extra = {}) => ({
        memory: {
            embeddings: { url, model: 'stub-1', dimensions: 4, apiKeyEnv: 'STUB_KEY', ...extra },
        },
    });
    const setMemorySetting = (dir, setting) => {
        const file = path.join(dir, '.magicspec/workspace.json');
        const current = JSON.parse(fs.readFileSync(file, 'utf8'));
        delete current.memory;
        fs.writeFileSync(file, JSON.stringify({ ...current, ...setting }));
    };
    const VECTOR_SPEC =
        '# Vectors\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## One\n\nalpha alpha alpha here.\n\n## Two\n\nbeta only.\n\n## Three\n\ngamma gamma and more.\n';

    /** A fixture with the vector specification, a provider on this machine and the setting that points at it. */
    const makeVectorFixture = async () => {
        const dir = makeMemoryFixture();
        const stub = await startStubProvider(dir);
        simPutter(dir)('.magicspec/ws/specifications/l1-v.md', VECTOR_SPEC);
        setMemorySetting(dir, embeddingsSetting(stub.url));
        return { dir, stub };
    };

    /** The findings the engine has recorded in a fixture project. */
    const memoryFindings = (dir) => {
        const file = path.join(dir, '.magicspec/.cache/diagnostics.jsonl');
        return fs.existsSync(file)
            ? fs
                  .readFileSync(file, 'utf8')
                  .split('\n')
                  .filter(Boolean)
                  .map((l) => JSON.parse(l))
            : [];
    };

    test('memory embeddings: with no provider configured no network call is made and the query says it ran lexically (AM-4, AM-7)', () => {
        const dir = makeMemoryFixture();
        try {
            const guard = path.join(dir, 'no-network.js');
            fs.writeFileSync(
                guard,
                `const fs = require('fs');
for (const name of ['http', 'https', 'net']) {
    const mod = require(name);
    for (const fn of ['request', 'get', 'connect', 'createConnection']) {
        if (typeof mod[fn] === 'function') mod[fn] = () => { fs.writeFileSync(${JSON.stringify(path.join(dir, 'NETWORK-USED'))}, name + '.' + fn); throw new Error('network call'); };
    }
}`,
            );
            const env = { NODE_OPTIONS: `--require=${guard}`, STUB_KEY: 'secret' };
            const index = simExec(dir, ['memory-index'], { env });
            assert.strictEqual(index.status, 0, index.stderr);
            assert.doesNotMatch(index.stdout, /Sent \d+ sections/);
            const query = memoryQuery(dir, ['retry'], { env });
            assert.strictEqual(query.status, 0, query.stderr);
            assert.match(query.stdout, /^modes: lexical$/m);
            assert.ok(
                !fs.existsSync(path.join(dir, 'NETWORK-USED')),
                'no network function was called',
            );
            // An empty setting is the same as none.
            setMemorySetting(dir, { memory: { embeddings: {} } });
            assert.match(memoryQuery(dir, ['retry'], { env }).stdout, /^modes: lexical$/m);
            assert.ok(!fs.existsSync(path.join(dir, 'NETWORK-USED')));
            const sources = [];
            const walk = (d) => {
                for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                    const full = path.join(d, e.name);
                    if (e.isDirectory()) walk(full);
                    else if (e.name.endsWith('.js')) sources.push(full);
                }
            };
            walk(scriptsDir);
            const networked = sources.filter((f) =>
                /require\('(https?|net)'\)|\bfetch\(/.test(fs.readFileSync(f, 'utf8')),
            );
            assert.deepStrictEqual(
                networked.map((f) => path.basename(f)),
                ['memory-embed.js'],
                'the adapter is the only file that reaches for the network',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('memory embeddings: an indexing run sends only sections with no vector yet, names the host and the count, and a changed model sends them all again (AM-7)', async () => {
        const dir = makeMemoryFixture();
        const stub = await startStubProvider(dir);
        try {
            simPutter(dir)('.magicspec/ws/specifications/l1-v.md', VECTOR_SPEC);
            setMemorySetting(dir, embeddingsSetting(stub.url));
            const env = { STUB_KEY: 'secret-key' };
            const first = simExec(dir, ['memory-index'], { env });
            assert.strictEqual(first.status, 0, first.stderr);
            const total = Number(/: (\d+) sections in/.exec(first.stdout)[1]);
            assert.ok(
                first.stdout.includes(
                    `[memory-index] Sent ${total} sections to ${stub.host} for embedding.`,
                ),
                first.stdout,
            );
            const sent = stub.requests();
            assert.strictEqual(
                sent.flatMap((r) => r.input).length,
                total,
                'every section was sent once',
            );
            assert.ok(
                sent.every(
                    (r) =>
                        r.model === 'stub-1' &&
                        r.auth === 'Bearer secret-key' &&
                        r.input.length <= 32,
                ),
            );

            const again = simExec(dir, ['memory-index'], { env });
            assert.doesNotMatch(
                again.stdout,
                /Sent \d+ sections/,
                'nothing is sent when nothing changed',
            );
            assert.strictEqual(stub.requests().length, sent.length);

            // One section's text changes: that one section is sent again, the others are not.
            simPutter(dir)(
                '.magicspec/ws/specifications/l1-v.md',
                VECTOR_SPEC.replace('beta only.', 'beta beta only.'),
            );
            const edited = simExec(dir, ['memory-index'], { env });
            assert.match(edited.stdout, /Sent 1 sections to /, edited.stdout);
            const after = stub
                .requests()
                .slice(sent.length)
                .flatMap((r) => r.input);
            assert.strictEqual(after.length, 1);
            assert.ok(after[0].includes('beta beta only.'));

            // A different model invalidates every stored vector.
            setMemorySetting(dir, embeddingsSetting(stub.url, { model: 'stub-2' }));
            const swapped = simExec(dir, ['memory-index'], { env });
            assert.ok(
                swapped.stdout.includes(`Sent ${total} sections to ${stub.host}`),
                swapped.stdout,
            );
            // The first model's vectors were discarded, not kept beside the new ones: going back sends everything again.
            setMemorySetting(dir, embeddingsSetting(stub.url));
            const back = simExec(dir, ['memory-index'], { env });
            assert.ok(back.stdout.includes(`Sent ${total} sections to ${stub.host}`), back.stdout);
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test('memory embeddings: a query is fused from the lexical and vector rankings by Reciprocal Rank Fusion with k = 60 and says it used both (AM-4)', async () => {
        const dir = makeMemoryFixture();
        const stub = await startStubProvider(dir);
        try {
            const { sectionsOf, listArtifacts, matchesFilters } = require(memorySectionsPath);
            simPutter(dir)('.magicspec/ws/specifications/l1-v.md', VECTOR_SPEC);
            const env = { STUB_KEY: 'k' };
            const ids = (args) =>
                JSON.parse(memoryQuery(dir, [...args, '--json', '--k=6'], { env }).stdout);

            // The lexical ranking, before any provider is configured.
            const lexical = ids(['alpha beta']);
            assert.deepStrictEqual(lexical.modes, ['lexical']);

            setMemorySetting(dir, embeddingsSetting(stub.url));
            assert.strictEqual(simExec(dir, ['memory-index'], { env }).status, 0);
            const fused = ids(['alpha beta']);
            assert.deepStrictEqual(fused.modes, ['lexical', 'vector']);
            assert.strictEqual(fused.sent.host, stub.host);
            assert.match(
                memoryQuery(dir, ['alpha beta'], { env }).stdout,
                /^modes: lexical \+ vector/m,
            );

            // The expected order, by hand: every indexed section, its stub vector, cosine, then RRF.
            const design = path.join(dir, '.magicspec');
            const sections = listArtifacts(design).files.flatMap((rel) =>
                sectionsOf(rel, fs.readFileSync(path.join(design, rel), 'utf8')),
            );
            const cosineBy = (a, b) => {
                const dot = a.reduce((s, x, i) => s + x * b[i], 0);
                return dot / (Math.hypot(...a) * Math.hypot(...b));
            };
            const query = stubVector('alpha beta');
            const vectorOrder = sections
                .map((s, id) => ({
                    s,
                    id,
                    sim: cosineBy(query, stubVector(`${s.heading}\n\n${s.body}`)),
                }))
                .filter(({ s }) => matchesFilters(s, {}))
                .sort((a, b) => b.sim - a.sim || a.id - b.id)
                .map(({ s }) => `.magicspec/${s.path} ${s.heading}`);
            const lexicalFull = (() => {
                setMemorySetting(dir, {});
                const out = JSON.parse(
                    memoryQuery(dir, ['alpha beta', '--json', '--k=50'], { env }).stdout,
                );
                setMemorySetting(dir, embeddingsSetting(stub.url));
                return out.results.map((r) => `${r.file} ${r.heading}`);
            })();
            const score = new Map();
            for (const ranking of [lexicalFull, vectorOrder]) {
                ranking.slice(0, 50).forEach((key, i) => {
                    score.set(key, (score.get(key) ?? 0) + 1 / (60 + i + 1));
                });
            }
            const expected = [...score].sort((a, b) => b[1] - a[1]).slice(0, 6);
            assert.deepStrictEqual(
                fused.results.map((r) => `${r.file} ${r.heading}`).slice(0, 5),
                expected.map(([key]) => key).slice(0, 5),
                'the fused order is the RRF of the two rankings',
            );
            fused.results.slice(0, 5).forEach((r, i) => {
                assert.ok(
                    Math.abs(r.score - expected[i][1]) < 1e-12,
                    `${r.score} vs ${expected[i][1]}`,
                );
            });
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test('memory embeddings: a provider that fails, answers the wrong size or is misconfigured leaves the lexical results intact and records MEMORY_EMBEDDINGS_FAILED (AM-8)', async () => {
        const dir = makeMemoryFixture();
        const stub = await startStubProvider(dir);
        try {
            simPutter(dir)('.magicspec/ws/specifications/l1-v.md', VECTOR_SPEC);
            const env = { STUB_KEY: 'k' };
            const sink = () => memoryFindings(dir);
            const files = (out) => JSON.parse(out).results.map((r) => r.file);
            const plain = files(memoryQuery(dir, ['retry', '--json'], { env }).stdout);

            // The provider answers HTTP 500 while indexing.
            setMemorySetting(dir, embeddingsSetting(stub.url));
            stub.mode('fail');
            const failed = simExec(dir, ['memory-index'], { env });
            assert.strictEqual(failed.status, 0, failed.stderr);
            assert.match(
                failed.stdout,
                /Embeddings were not updated: the provider answered HTTP 500\. Lexical search is unaffected\./,
            );
            assert.deepStrictEqual(
                files(memoryQuery(dir, ['retry', '--json'], { env }).stdout),
                plain,
                'the lexical results are intact',
            );
            const recorded = sink().filter((f) => f.code === 'MEMORY_EMBEDDINGS_FAILED');
            assert.ok(
                recorded.length > 0 && recorded.every((f) => f.severity === 'warning' && f.remedy),
            );
            assert.ok(
                !sink().some((f) => f.code === 'MEMORY_INDEX_UNAVAILABLE'),
                'the index itself is still available',
            );

            // The provider answers vectors of another size than the setting says.
            stub.mode('wide');
            const wide = simExec(dir, ['memory-index'], { env });
            assert.match(wide.stdout, /vectors of 8 numbers; the setting says 4/);

            // A good provider whose vectors exist, then a query-time failure: lexical only.
            stub.mode('ok');
            assert.match(simExec(dir, ['memory-index'], { env }).stdout, /Sent \d+ sections/);
            stub.mode('fail');
            const degraded = JSON.parse(memoryQuery(dir, ['retry', '--json'], { env }).stdout);
            assert.deepStrictEqual(degraded.modes, ['lexical']);
            assert.deepStrictEqual(files(JSON.stringify(degraded)), plain);

            // Settings that cannot be used.
            for (const bad of [
                { url: 'ftp://host/x' },
                { dimensions: 'many' },
                { model: '' },
                { apiKeyEnv: 'not a name' },
            ]) {
                setMemorySetting(dir, embeddingsSetting(stub.url, bad));
                const out = memoryQuery(dir, ['retry', '--json'], { env });
                assert.strictEqual(out.status, 0, out.stderr);
                assert.deepStrictEqual(
                    JSON.parse(out.stdout).modes,
                    ['lexical'],
                    JSON.stringify(bad),
                );
            }
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test(
        'memory embeddings: both backends keep, return and drop vectors alike, and an unchanged section keeps its id and vector when its file is replaced (AM-1)',
        needsSqlite,
        () => {
            const sqliteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            const jsonDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            try {
                const sqlite = require(memorySqlitePath).openBackend(sqliteDir);
                const fallback = require(memoryFallbackPath).open(
                    path.join(jsonDir, 'memory.json'),
                );
                assert.strictEqual(sqlite.name, 'sqlite');
                const methods = [
                    'sectionMeta',
                    'sectionsByIds',
                    'pendingVectors',
                    'putVectors',
                    'vectors',
                    'clearVectors',
                ];
                for (const backend of [sqlite, fallback]) {
                    for (const m of methods)
                        assert.strictEqual(typeof backend[m], 'function', `${backend.name}.${m}`);
                    const unit = (heading, body, ordinal) => ({
                        path: 'ws/PLAN.md',
                        heading,
                        kind: 'plan',
                        workspace: 'ws',
                        status: '',
                        version: '',
                        ordinal,
                        lineStart: 1 + ordinal * 2,
                        lineEnd: 2 + ordinal * 2,
                        body,
                    });
                    backend.replaceFile('ws/PLAN.md', 'a', [
                        unit('# P › ## One', 'one', 0),
                        unit('# P › ## Two', 'two', 1),
                    ]);
                    const pending = backend.pendingVectors('m', 3, 10);
                    assert.deepStrictEqual(
                        pending.map((p) => p.heading),
                        ['# P › ## One', '# P › ## Two'],
                    );
                    backend.putVectors(
                        'm',
                        3,
                        pending.map((p, i) => ({
                            id: p.id,
                            vector: Float32Array.from([i, 0.5, -1]),
                        })),
                    );
                    assert.deepStrictEqual(
                        backend.pendingVectors('m', 3, 10),
                        [],
                        'nothing pending once stored',
                    );
                    assert.strictEqual(
                        backend.pendingVectors('other', 3, 10).length,
                        2,
                        'another model has none',
                    );
                    const stored = backend.vectors('m', 3);
                    assert.deepStrictEqual([...stored.get(pending[1].id)], [1, 0.5, -1]);
                    assert.strictEqual(backend.vectors('m', 4).size, 0, 'another size has none');
                    assert.strictEqual(backend.sectionMeta().get(pending[0].id).kind, 'plan');
                    assert.strictEqual(
                        backend.sectionsByIds([pending[1].id]).get(pending[1].id).body,
                        'two',
                    );

                    // Replacing the file: "One" is unchanged, "Two" changed, "Three" is new.
                    backend.replaceFile('ws/PLAN.md', 'b', [
                        unit('# P › ## One', 'one', 0),
                        unit('# P › ## Two', 'two, rewritten', 1),
                        unit('# P › ## Three', 'three', 2),
                    ]);
                    const after = backend.pendingVectors('m', 3, 10).map((p) => p.heading);
                    assert.deepStrictEqual(
                        after,
                        ['# P › ## Two', '# P › ## Three'],
                        `${backend.name}: only the changed and the new section need a vector`,
                    );
                    assert.ok(
                        backend.vectors('m', 3).has(pending[0].id),
                        'the unchanged section kept its id and vector',
                    );
                    assert.strictEqual(
                        backend.vectors('m', 3).size,
                        1,
                        'the changed section lost its vector',
                    );

                    backend.removeFile('ws/PLAN.md');
                    assert.strictEqual(backend.vectors('m', 3).size, 0);
                    backend.replaceFile('ws/PLAN.md', 'c', [unit('# P › ## One', 'one', 0)]);
                    backend.putVectors(
                        'm',
                        3,
                        backend
                            .pendingVectors('m', 3, 10)
                            .map((p) => ({ id: p.id, vector: Float32Array.from([1, 1, 1]) })),
                    );
                    backend.clearVectors();
                    assert.strictEqual(backend.vectors('m', 3).size, 0);
                    backend.save();
                    backend.close();
                }
            } finally {
                cleanup(sqliteDir);
                cleanup(jsonDir);
            }
        },
    );

    test('memory embeddings: cosine, the vector ranking and Reciprocal Rank Fusion give the hand-computed numbers (AM-4)', () => {
        const { cosine, rankByVector, fuse, RRF_K, readSetting } = require(memoryEmbedPath);
        assert.strictEqual(RRF_K, 60);
        assert.ok(
            Math.abs(cosine(Float32Array.from([1, 0]), Float32Array.from([1, 1])) - Math.SQRT1_2) <
                1e-7,
        );
        assert.strictEqual(cosine(Float32Array.from([0, 0]), Float32Array.from([1, 1])), 0);
        const vectors = new Map([
            [1, Float32Array.from([1, 0])],
            [2, Float32Array.from([0, 1])],
            [3, Float32Array.from([1, 1])],
        ]);
        assert.deepStrictEqual(
            rankByVector(Float32Array.from([1, 0]), vectors, () => true, 5).map((r) => r.id),
            [1, 3, 2],
        );
        assert.deepStrictEqual(
            rankByVector(Float32Array.from([1, 0]), vectors, (id) => id !== 1, 5).map((r) => r.id),
            [3, 2],
        );
        assert.deepStrictEqual(
            rankByVector(Float32Array.from([1, 0]), vectors, () => true, 1).map((r) => r.id),
            [1],
        );
        // Ranking A: 7, 8, 9; ranking B: 9, 7. Scores: 7 = 1/61 + 1/62, 9 = 1/63 + 1/61, 8 = 1/62.
        const fused = fuse([
            [7, 8, 9],
            [9, 7],
        ]);
        assert.deepStrictEqual(
            fused.map((f) => f.id),
            [7, 9, 8],
        );
        assert.ok(Math.abs(fused[0].score - (1 / 61 + 1 / 62)) < 1e-15);
        assert.ok(Math.abs(fused[1].score - (1 / 63 + 1 / 61)) < 1e-15);
        assert.ok(Math.abs(fused[2].score - 1 / 62) < 1e-15);

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const write = (memory) =>
                fs.writeFileSync(path.join(dir, 'workspace.json'), JSON.stringify({ memory }));
            assert.deepStrictEqual(readSetting(dir), { setting: null }, 'no file');
            write(undefined);
            assert.deepStrictEqual(readSetting(dir), { setting: null }, 'no key');
            write({
                embeddings: { url: 'https://h.example/v1/embeddings', model: 'm', dimensions: 768 },
            });
            assert.deepStrictEqual(readSetting(dir).setting, {
                url: 'https://h.example/v1/embeddings',
                model: 'm',
                dimensions: 768,
            });
            write({
                embeddings: {
                    url: 'https://h.example/x',
                    model: 'm',
                    dimensions: 3,
                    apiKeyEnv: 'KEY_NAME',
                },
            });
            assert.strictEqual(readSetting(dir).setting.apiKeyEnv, 'KEY_NAME');
            write({ embeddings: [] });
            assert.match(readSetting(dir).error, /must be an object/);
            write({ embeddings: { url: 'nope', model: 'm', dimensions: 3 } });
            assert.match(readSetting(dir).error, /not a URL/);
        } finally {
            cleanup(dir);
        }
    });

    test('export-wiki: it refreshes the artifact index last, so a specification edit is in the index with no memory-index run between (AM-5)', () => {
        const dir = makeMemoryFixture();
        try {
            const put = simPutter(dir);
            const first = simExec(dir, ['export-wiki']);
            assert.strictEqual(first.status, 0, first.stdout + first.stderr);
            assert.match(
                first.stdout,
                /^Artifact index: (sqlite|fallback): \d+ sections in 6 files \(6 indexed, 0 unchanged, 0 removed\)\.$/m,
                first.stdout,
            );
            assert.ok(
                first.stdout.indexOf('Wiki exported') < first.stdout.indexOf('Artifact index:'),
                'the index is refreshed after the wiki',
            );
            assert.doesNotMatch(first.stderr, /experimental/i);

            put(
                '.magicspec/ws/specifications/l1-a.md',
                '# Alpha\n\n**Version:** 1.2.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nThe overview.\n\n## Retry Rule\n\nA failed call is retried five times, with a zebra pause.\n',
            );
            const second = simExec(dir, ['export-wiki']);
            assert.match(
                second.stdout,
                /Artifact index: .*\(1 indexed, 5 unchanged, 0 removed\)/,
                second.stdout,
            );
            // The index already holds the edit: the indexer finds nothing left to do.
            const check = simExec(dir, ['memory-index']);
            assert.match(check.stdout, /\(0 indexed, 6 unchanged, 0 removed\)/, check.stdout);
            const hit = JSON.parse(memoryQuery(dir, ['zebra', '--json']).stdout).results;
            assert.deepStrictEqual(
                hit.map((r) => r.file),
                ['.magicspec/ws/specifications/l1-a.md'],
            );
        } finally {
            cleanup(dir);
        }
    });

    test('export-wiki: an indexer that crashes leaves the wiki written, the run at exit 0 and MEMORY_INDEX_UNAVAILABLE recorded (AM-8)', () => {
        const dir = makeMemoryFixture();
        try {
            fs.writeFileSync(
                path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts', 'memory-index.js'),
                "require('./lib/commands').guardArgv('memory-index', module);\nthrow new Error('indexer exploded');\n",
            );
            const result = simExec(dir, ['export-wiki']);
            assert.strictEqual(result.status, 0, result.stdout + result.stderr);
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec/graph/wiki/index.md')),
                'the wiki was written',
            );
            assert.match(
                result.stdout,
                /\[Index-Refresh\] The artifact index was not refreshed: .+ Search the text with grep instead\./,
            );
            const sink = fs
                .readFileSync(path.join(dir, '.magicspec/.cache/diagnostics.jsonl'), 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((l) => JSON.parse(l));
            const finding = sink.find((f) => f.code === 'MEMORY_INDEX_UNAVAILABLE');
            assert.ok(finding, `recorded: ${sink.map((f) => f.code)}`);
            assert.strictEqual(finding.source, 'export-wiki');
        } finally {
            cleanup(dir);
        }
    });

    test("export-wiki: a wiki written to another folder, or from a graph file, is not the project's refresh and leaves the index alone (§6 item 3)", () => {
        const dir = makeMemoryFixture();
        try {
            const elsewhere = path.join(dir, 'wiki-elsewhere');
            const custom = simExec(dir, ['export-wiki', '--out', elsewhere]);
            assert.strictEqual(custom.status, 0, custom.stdout + custom.stderr);
            assert.ok(fs.existsSync(path.join(elsewhere, 'index.md')));
            assert.doesNotMatch(custom.stdout, /Artifact index:/);

            const graphFile = path.join(dir, 'graph.json');
            fs.writeFileSync(graphFile, JSON.stringify({ nodes: [], edges: [], analysis: {} }));
            const fromFile = simExec(dir, ['export-wiki', '--from-file', graphFile]);
            assert.strictEqual(fromFile.status, 0, fromFile.stdout + fromFile.stderr);
            assert.doesNotMatch(fromFile.stdout, /Artifact index:/);

            for (const name of ['memory.sqlite', 'memory.json']) {
                assert.ok(
                    !fs.existsSync(path.join(dir, '.magicspec/.cache', name)),
                    `${name} was not created`,
                );
            }
        } finally {
            cleanup(dir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // Artifact memory query coverage (l2-artifact-memory-store.md §5.2, §5.4, §5.5)
    // ───────────────────────────────────────────────────────────────────────────

    const memoryQueryPath = path.join(scriptsDir, 'memory-query.js');

    /** A fixture whose specification holds `count` sections that all name `word`, plus `archived` archived mentions of it. */
    const makePagedFixture = (word, count, archived) => {
        const dir = makeMemoryFixture();
        const put = simPutter(dir);
        const sections = Array.from(
            { length: count },
            (_, i) => `## Part ${i + 1}\n\nThe ${word} rule, part ${i + 1}.\n`,
        ).join('\n');
        put(
            '.magicspec/ws/specifications/l1-paged.md',
            `# Paged\n\n**Version:** 1.0.0\n**Status:** Stable\n\n${sections}`,
        );
        for (let i = 0; i < archived; i++) {
            put(
                `.magicspec/ws/archives/tasks/phase-${i + 1}.md`,
                `# Old ${i}\n\n## Done\n\nThe ${word} mention ${i}.\n`,
            );
        }
        return dir;
    };

    test(
        'memory-query: a list that is cut counts what matched in force and in history and names the next page, the pages return every section once on both backends, and a list that holds every match prints only its modes line (AM-9)',
        needsSqlite,
        () => {
            const dir = makePagedFixture('retrywidget', 25, 3);
            try {
                const ask = (...args) => memoryQuery(dir, ['retrywidget', ...args]);
                const json = (...args) => JSON.parse(ask(...args, '--json').stdout);
                const firstLine = (...args) => ask(...args).stdout.split('\n')[0];

                assert.strictEqual(
                    firstLine('--k=10'),
                    'modes: lexical · 1-10 of 25 in force, 3 more in history — next: --offset=10 (--k up to 50), --history for history',
                );
                const page = json('--k=10');
                assert.deepStrictEqual(
                    [page.total, page.historyTotal, page.offset, page.next, page.results.length],
                    [25, 3, 0, 10, 10],
                );

                // Walk the pages: every section once, numbered from its offset, the last page names no next.
                const seen = [];
                let offset = 0;
                for (let guard = 0; guard < 5; guard++) {
                    const current = json('--k=10', `--offset=${offset}`);
                    seen.push(...current.results.map((r) => `${r.file}:${r.lines.join('-')}`));
                    if (current.next === null) {
                        assert.strictEqual(
                            firstLine('--k=10', `--offset=${offset}`),
                            `modes: lexical · ${offset + 1}-25 of 25 in force, 3 more in history — --history for history`,
                        );
                        break;
                    }
                    assert.strictEqual(current.next, offset + current.results.length);
                    offset = current.next;
                }
                assert.strictEqual(seen.length, 25, 'the pages add up to the count');
                assert.strictEqual(new Set(seen).size, 25, 'no section is returned twice');
                assert.match(
                    ask('--k=10', '--offset=10').stdout.split('\n')[1],
                    /^11\. /,
                    'ranks are numbered from the offset',
                );

                // History asked for: no history count, and the matches in history join the list.
                const withHistory = json('--k=10', '--history');
                assert.deepStrictEqual([withHistory.total, withHistory.historyTotal], [28, null]);
                assert.strictEqual(
                    firstLine('--k=10', '--history'),
                    'modes: lexical · 1-10 of 28 — next: --offset=10 (--k up to 50)',
                );
                assert.strictEqual(json('--kind=spec', '--k=10').historyTotal, null);

                // Past the end.
                const beyond = ask('--offset=500');
                assert.strictEqual(
                    beyond.stdout.split('\n').slice(0, 2).join('\n'),
                    'modes: lexical · 0 of 25 in force, 3 more in history — --history for history\nNo sections from 501; 25 matched.',
                );

                // The control: a name that fits is not annotated, even with history matches behind it.
                const put = simPutter(dir);
                put(
                    '.magicspec/ws/specifications/l1-small.md',
                    '# Small\n\n## A\n\nquokkaword here.\n\n## B\n\nquokkaword there.\n',
                );
                put(
                    '.magicspec/ws/archives/tasks/phase-9.md',
                    '# Old\n\n## Done\n\nquokkaword once.\n',
                );
                const small = memoryQuery(dir, ['quokkaword']);
                assert.strictEqual(small.stdout.split('\n')[0], 'modes: lexical');
                const smallJson = JSON.parse(memoryQuery(dir, ['quokkaword', '--json']).stdout);
                assert.deepStrictEqual(
                    [smallJson.total, smallJson.next, smallJson.historyTotal],
                    [2, null, 1],
                );
                assert.strictEqual(
                    memoryQuery(dir, ['zzznomatch']).stdout,
                    'modes: lexical\nNo sections match.\n',
                );

                // A bad offset is refused like a bad count.
                for (const bad of ['-1', 'abc', '1.5']) {
                    const refused = ask(`--offset=${bad}`);
                    assert.strictEqual(refused.status, 1, bad);
                    assert.match(refused.stderr, /--offset must be a whole number, 0 or more\./);
                }

                // Both backends count and page alike.
                const { queryProject } = require(memoryQueryPath);
                const design = path.join(dir, '.magicspec');
                const absent = () => {
                    const err = new Error('no sqlite');
                    err.code = 'ERR_UNKNOWN_BUILTIN_MODULE';
                    throw err;
                };
                const walkPages = (loader) => {
                    const pages = [];
                    let at = 0;
                    for (let guard = 0; guard < 10; guard++) {
                        const answer = queryProject(
                            dir,
                            design,
                            { text: 'retrywidget', limit: 10, offset: at, loader },
                            () => {},
                        );
                        assert.ok(answer.ok);
                        pages.push({
                            backend: answer.backend,
                            total: answer.total,
                            historyTotal: answer.historyTotal,
                            next: answer.next,
                            keys: answer.results.map((r) => `${r.file}:${r.lines.join('-')}`),
                        });
                        if (answer.next === null) break;
                        at = answer.next;
                    }
                    return pages;
                };
                const viaSqlite = walkPages(undefined);
                const viaFallback = walkPages(absent);
                assert.strictEqual(viaSqlite[0].backend, 'sqlite');
                assert.strictEqual(viaFallback[0].backend, 'fallback');
                assert.deepStrictEqual(
                    viaFallback.map(({ backend, ...rest }) => rest),
                    viaSqlite.map(({ backend, ...rest }) => rest),
                    'the fallback counts, orders and pages as SQLite does',
                );
            } finally {
                cleanup(dir);
            }
        },
    );

    test('memory-query: every result carries the lines its section occupies, each part of a cut section has its own lines, the lines read back from the file hold the section, and the size is a rounded estimate (AM-2, AM-3)', () => {
        const { sectionsOf } = require(memorySectionsPath);
        const { tokensOf, formatTokens } = require(memoryQueryPath);

        // Exact lines of a small file: the title block, a section, a nested heading and a history table.
        const small =
            '# Title\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## A\n\nzanzibar one\nzanzibar two\n\n\n## B\n\n### B1\n\nbeta\n\n## Document History\n\n| v | d |\n| --- | --- |\n| 1 | x |\n';
        const where = Object.fromEntries(
            sectionsOf('ws/specifications/l1-x.md', small).map((u) => [
                u.heading.split(' › ').pop(),
                [u.lineStart, u.lineEnd],
            ]),
        );
        assert.deepStrictEqual(where, {
            '# Title': [1, 4],
            '## A': [6, 9],
            '### B1': [14, 16],
            '## Document History': [18, 22],
        });

        // The lines hold the unit's text, line for line, on files of every shape the index reads.
        const paragraph = (k) => `Paragraph ${k} ${'word '.repeat(60)}`.trim();
        const long = Array.from({ length: 14 }, (_, k) => paragraph(k)).join('\n\n');
        const table = Array.from(
            { length: 60 },
            (_, k) => `| row ${k} | ${'cell '.repeat(8)} |`,
        ).join('\n');
        const fixtures = {
            'ws/specifications/l1-long.md': `# Long\n\n**Version:** 1.0.0\n\n## Cut\n\n${long}\n\n## After\n\nshort\n`,
            'ws/specifications/l1-table.md': `# Table\n\n## Rows\n\n${table}\n`,
            'ws/specifications/l1-fence.md':
                '# Fence\n\n## Code\n\nBefore.\n\n```text\nline one\n\nline two\n```\n\nAfter the block.\n',
            // A file with a front-matter block holds its title in the middle of its first block.
            'ws/tasks/phase-1.md':
                '---\nphase: 1\nname: "X"\n---\n\n# Stage 1\n\n**Phase:** 1\n\n## Checklist\n\n- [ ] one\n',
            'RULES.md': '\n\n# Rules\n\n\n## C1\n\n   indented first line\nsecond\n\n\n',
            'ws/STATE.md': '## No title\n\nbody only\n',
        };
        let cutParts = 0;
        for (const [rel, text] of Object.entries(fixtures)) {
            const lines = text.split('\n');
            const blank = (l) => l.trim() === '';
            const isHeading = (l) => /^#{1,3}[ \t]/.test(l);
            let previousEnd = 0;
            let previousHeading = null;
            for (const unit of sectionsOf(rel, text)) {
                assert.ok(
                    unit.lineStart >= 1 &&
                        unit.lineEnd >= unit.lineStart &&
                        unit.lineEnd <= lines.length,
                    `${rel} #${unit.ordinal}: a range inside the file`,
                );
                const slice = lines
                    .slice(unit.lineStart - 1, unit.lineEnd)
                    .filter((l) => !blank(l));
                const want = unit.body
                    .split('\n')
                    .filter((l) => !blank(l))
                    .map((l) => l.trim());
                const have = slice.map((l) => l.trim());
                const withoutOneHeading = have.some(
                    (l, i) =>
                        isHeading(l) &&
                        JSON.stringify(have.filter((_, j) => j !== i)) === JSON.stringify(want),
                );
                assert.ok(
                    JSON.stringify(have) === JSON.stringify(want) || withoutOneHeading,
                    `${rel} #${unit.ordinal}: the lines hold the section`,
                );
                if (unit.heading === previousHeading) {
                    cutParts++;
                    assert.ok(
                        unit.lineStart > previousEnd,
                        `${rel}: the parts of a section do not overlap`,
                    );
                    assert.ok(
                        !isHeading(lines[unit.lineStart - 1]),
                        `${rel}: a later part starts at its own first line, not at the heading`,
                    );
                }
                previousHeading = unit.heading;
                previousEnd = unit.lineEnd;
            }
        }
        assert.ok(cutParts >= 3, 'the fixtures cut at least three sections into parts');
        // The first part of a section starts at its heading line.
        const longUnits = sectionsOf(
            'ws/specifications/l1-long.md',
            fixtures['ws/specifications/l1-long.md'],
        );
        const cut = longUnits.filter((u) => u.heading.endsWith('## Cut'));
        assert.ok(cut.length >= 2);
        assert.strictEqual(
            fixtures['ws/specifications/l1-long.md'].split('\n')[cut[0].lineStart - 1],
            '## Cut',
        );

        // The size: a quarter of the characters, rounded up, then to two significant figures.
        assert.deepStrictEqual(
            [0, 1, 4, 5, 396, 400, 404, 1163, 3960, 3990, 4650].map(tokensOf),
            [0, 1, 1, 2, 99, 100, 100, 290, 990, 1000, 1200],
        );
        assert.deepStrictEqual([1, 99, 290, 999, 1000, 1200, 10000, 25000].map(formatTokens), [
            '1',
            '99',
            '290',
            '999',
            '1k',
            '1.2k',
            '10k',
            '25k',
        ]);

        // Through the command: the lines and the size in the text and in the data, and the file holds them.
        const dir = makeMemoryFixture();
        try {
            simPutter(dir)('.magicspec/ws/specifications/l1-x.md', small);
            const answer = JSON.parse(memoryQuery(dir, ['zanzibar', '--json']).stdout);
            const hit = answer.results.find(
                (r) => r.file.endsWith('l1-x.md') && r.heading.endsWith('## A'),
            );
            assert.ok(hit, 'the section is found');
            assert.deepStrictEqual(hit.lines, [6, 9]);
            assert.strictEqual(hit.tokens, tokensOf('zanzibar one\nzanzibar two'.length));
            const onDisk = fs
                .readFileSync(path.join(dir, hit.file), 'utf8')
                .split('\n')
                .slice(hit.lines[0] - 1, hit.lines[1])
                .join('\n');
            assert.ok(onDisk.includes('zanzibar one') && onDisk.startsWith('## A'));
            const text = memoryQuery(dir, ['zanzibar']).stdout;
            assert.match(
                text,
                new RegExp(
                    `l1-x\\.md:6-9 › ## A {3}\\(spec, Stable v1\\.0\\.0, ~${formatTokens(hit.tokens)} tokens\\)`,
                ),
            );
        } finally {
            cleanup(dir);
        }
    });

    test('memory embeddings: with vectors the pool is every lexical match and the best vector candidates whatever the page size, the first line counts both parts, and the pages return each section once (AM-4, AM-9)', async () => {
        const { dir, stub } = await makeVectorFixture();
        try {
            const env = { STUB_KEY: 'k' };
            assert.strictEqual(simExec(dir, ['memory-index'], { env }).status, 0);
            const ask = (...args) => memoryQuery(dir, ['alpha', ...args], { env });
            const json = (...args) => JSON.parse(ask(...args, '--json').stdout);

            const whole = json('--k=50');
            assert.deepStrictEqual(whole.modes, ['lexical', 'vector']);
            assert.ok(whole.byMeaning > 0, 'sections that match by meaning only join the pool');
            assert.strictEqual(whole.next, null);
            const everything = whole.results.map((r) => `${r.file}:${r.lines.join('-')}`);
            assert.strictEqual(everything.length, whole.total);
            assert.strictEqual(new Set(everything).size, whole.total);

            const small = [];
            let offset = 0;
            const totals = new Set();
            for (let guard = 0; guard < 40; guard++) {
                const page = json('--k=2', `--offset=${offset}`);
                totals.add(`${page.total}/${page.byMeaning}`);
                small.push(...page.results.map((r) => `${r.file}:${r.lines.join('-')}`));
                if (page.next === null) break;
                offset = page.next;
            }
            assert.deepStrictEqual(
                small,
                everything,
                'the pages of two return the list of fifty, in order',
            );
            assert.strictEqual(totals.size, 1, 'the pool does not depend on the page size');
            const inHistory = whole.historyTotal > 0;
            assert.strictEqual(
                ask('--k=2').stdout.split('\n')[0],
                `modes: lexical + vector · 1-2 of ${whole.total} in force (${whole.total - whole.byMeaning} lexical matches + ${whole.byMeaning} by meaning)${inHistory ? `, ${whole.historyTotal} more in history` : ''} — next: --offset=2 (--k up to 50)${inHistory ? ', --history for history' : ''}`,
            );
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test('memory embeddings: a setting that names a key this machine does not hold sends nothing from memory-index or memory-query, ranks lexically and records a warning that names the variable and never a value; with the key set the requests carry it (AM-7)', async () => {
        const { dir, stub } = await makeVectorFixture();
        try {
            for (const env of [{}, { STUB_KEY: '' }, { STUB_KEY: '   ' }]) {
                const index = simExec(dir, ['memory-index'], { env });
                assert.strictEqual(index.status, 0, index.stderr);
                assert.match(
                    index.stdout,
                    /Embeddings were not updated: the environment variable STUB_KEY, named by memory\.embeddings\.apiKeyEnv, is not set here, so nothing was sent\./,
                );
                assert.doesNotMatch(index.stdout, /Sent \d+ sections/);
                const query = JSON.parse(memoryQuery(dir, ['alpha', '--json'], { env }).stdout);
                assert.deepStrictEqual(query.modes, ['lexical']);
            }
            assert.strictEqual(stub.requests().length, 0, 'no request reached the provider');
            const recorded = memoryFindings(dir).filter(
                (f) => f.code === 'MEMORY_EMBEDDINGS_FAILED',
            );
            assert.ok(recorded.length > 0, 'the failure is recorded');
            assert.ok(
                recorded.every(
                    (f) => f.severity === 'warning' && f.message.includes('STUB_KEY') && f.remedy,
                ),
            );

            // The control: with the key held, the requests carry it and the query is fused.
            const env = { STUB_KEY: 'secret-key' };
            const index = simExec(dir, ['memory-index'], { env });
            assert.match(index.stdout, /Sent \d+ sections to /, index.stdout);
            const sent = stub.requests();
            assert.ok(sent.length > 0 && sent.every((r) => r.auth === 'Bearer secret-key'));
            assert.deepStrictEqual(
                JSON.parse(memoryQuery(dir, ['alpha', '--json'], { env }).stdout).modes,
                ['lexical', 'vector'],
            );
            // Vectors exist and the key is gone: the query sends nothing and answers lexically.
            const before = stub.requests().length;
            const gone = JSON.parse(memoryQuery(dir, ['alpha', '--json'], { env: {} }).stdout);
            assert.deepStrictEqual(gone.modes, ['lexical']);
            assert.strictEqual(stub.requests().length, before);
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test('memory embeddings: vectors are comparable only for one provider address, model and size, so a changed address alone discards them, a query before the next index run is lexical, and an unchanged setting embeds nothing (AM-7)', async () => {
        const { dir, stub } = await makeVectorFixture();
        try {
            const env = { STUB_KEY: 'k' };
            const first = simExec(dir, ['memory-index'], { env });
            const total = Number(/Sent (\d+) sections/.exec(first.stdout)?.[1]);
            assert.ok(total > 0, first.stdout);

            const moved = stub.url.replace('/v1/', '/v2/');
            setMemorySetting(dir, embeddingsSetting(moved));
            assert.deepStrictEqual(
                JSON.parse(memoryQuery(dir, ['alpha', '--json'], { env }).stdout).modes,
                ['lexical'],
                'vectors made at another address are not ranked against this query',
            );
            const requestsBefore = stub.requests().length;
            const again = simExec(dir, ['memory-index'], { env });
            assert.ok(
                again.stdout.includes(`Sent ${total} sections to ${stub.host}`),
                again.stdout,
            );
            assert.ok(stub.requests().length > requestsBefore);

            const quiet = stub.requests().length;
            assert.doesNotMatch(
                simExec(dir, ['memory-index'], { env }).stdout,
                /Sent \d+ sections/,
            );
            assert.strictEqual(
                stub.requests().length,
                quiet,
                'an unchanged setting embeds nothing',
            );
            assert.deepStrictEqual(
                JSON.parse(memoryQuery(dir, ['alpha', '--json'], { env }).stdout).modes,
                ['lexical', 'vector'],
            );
        } finally {
            stub.stop();
            cleanup(dir);
        }
    });

    test(
        'memory sqlite: an index written before the line columns is rebuilt once, and on both backends a section whose text did not change keeps its row and vector when only its lines move while its lines follow the file (AM-1, AM-2)',
        needsSqlite,
        () => {
            const { openBackend, SCHEMA_VERSION } = require(memorySqlitePath);
            const { sectionsOf } = require(memorySectionsPath);
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
            const sqliteDir = path.join(root, 'sqlite');
            const jsonDir = path.join(root, 'json');
            fs.mkdirSync(sqliteDir);
            fs.mkdirSync(jsonDir);
            try {
                // An index of the earlier layout: no line columns, schema version 1.
                const { DatabaseSync } = require('node:sqlite');
                const old = new DatabaseSync(path.join(sqliteDir, 'memory.sqlite'));
                old.exec(
                    "CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT); INSERT INTO meta VALUES ('schema_version', '1'); CREATE TABLE sections(id INTEGER PRIMARY KEY, path TEXT, heading TEXT, kind TEXT, workspace TEXT, status TEXT, version TEXT, ordinal INTEGER, body TEXT); INSERT INTO sections(path, heading, kind, workspace, status, version, ordinal, body) VALUES ('a.md', '# A', 'spec', '', '', '', 0, 'old text');",
                );
                old.close();
                const sqlite = openBackend(sqliteDir);
                assert.strictEqual(sqlite.name, 'sqlite');
                assert.strictEqual(sqlite.sectionCount(), 0, 'the earlier layout is rebuilt empty');
                assert.strictEqual(sqlite.getMeta('schema_version'), SCHEMA_VERSION);

                const fallback = require(memoryFallbackPath).open(
                    path.join(jsonDir, 'memory.json'),
                );
                const rel = 'ws/specifications/l1-x.md';
                const before = '# T\n\n## A\n\nalpha text here\n\n## B\n\nbeta text here\n';
                const after =
                    '# T\n\nadded intro line\n\nmore intro\n\n## A\n\nalpha text here\n\n## B\n\nbeta text here\n';
                for (const backend of [sqlite, fallback]) {
                    backend.replaceFile(rel, 'h1', sectionsOf(rel, before));
                    backend.save();
                    const rows = (b) => [...b.sectionsByIds([...b.sectionMeta().keys()]).values()];
                    const a = rows(backend).find((r) => r.heading.endsWith('## A'));
                    assert.deepStrictEqual([a.lineStart, a.lineEnd], [3, 5], backend.name);
                    backend.putVectors('m', 2, [{ id: a.id, vector: new Float32Array([1, 0]) }]);
                    backend.save();

                    backend.replaceFile(rel, 'h2', sectionsOf(rel, after));
                    backend.save();
                    const moved = rows(backend).find((r) => r.heading.endsWith('## A'));
                    assert.strictEqual(
                        moved.id,
                        a.id,
                        `${backend.name}: the section keeps its row`,
                    );
                    assert.deepStrictEqual(
                        [moved.lineStart, moved.lineEnd],
                        [7, 9],
                        `${backend.name}: its lines follow the file`,
                    );
                    assert.ok(backend.vectors('m', 2).has(a.id), `${backend.name}: and its vector`);
                }
                sqlite.close();
                fallback.close();
            } finally {
                cleanup(root);
            }
        },
    );

    // ───────────────────────────────────────────────────────────────────────────
    // Consumers of the artifact index (l1-artifact-memory.md §5)
    // ───────────────────────────────────────────────────────────────────────────

    const repoFile = (...parts) =>
        fs.readFileSync(path.join(path.resolve(TESTS_DIR, '..'), ...parts), 'utf8');
    const lineStartingWith = (text, start) =>
        text.split('\n').find((l) => l.trimStart().startsWith(start));

    test('the three comparison-set searches name the index query first and the text search as its fallback, and the two card mirrors carry the card text verbatim (AM-3, AM-8)', () => {
        const critic = repoFile('skills', 'magicspec', 'roles', 'spec-critic.md');
        const planner = repoFile('skills', 'magicspec', 'roles', 'planner.md');
        const analyze = repoFile('skills', 'magicspec', 'workflows', 'analyze.md');

        const comparison = lineStartingWith(critic, '- **Comparison set:**');
        assert.ok(comparison, 'the spec-critic card has the Comparison set bullet');
        const planCheck = lineStartingWith(planner, '6. **Plan check (mandatory');
        assert.ok(planCheck, 'the planner card has the plan check step');
        const mode = lineStartingWith(analyze, '7a. **Cross-Artifact Coherence');
        assert.ok(mode, 'analyze.md has step 7a');

        for (const [site, text] of [
            ['spec-critic', comparison],
            ['planner', planCheck],
            ['analyze 7a', mode],
        ]) {
            assert.ok(
                text.includes('node scripts/executor.js memory-query "{name}"'),
                `${site}: names the query`,
            );
            assert.ok(text.includes('cites each'), `${site}: the results are citations`);
            assert.ok(
                text.includes('read the cited lines, not the file, before relying on a result'),
                `${site}: cite, then read (AM-3)`,
            );
            assert.ok(
                /when the query prints that the index is unavailable, search (the text|the entries) directly/.test(
                    text,
                ),
                `${site}: falls back to a text search (AM-8)`,
            );
        }
        // The graph neighbours stay in the set, and the search is named before them.
        assert.ok(
            comparison.indexOf('memory-query') < comparison.indexOf('build-spec-graph'),
            'the query comes first, the graph neighbours stay',
        );
        assert.ok(mode.indexOf('memory-query') < mode.indexOf('Read only the matching sections'));
        assert.ok(
            mode.includes("specification graph's neighbours"),
            'analyze keeps the graph neighbours',
        );
        // The plan check compares archived phases too; the index leaves archives out unless asked.
        assert.ok(
            planCheck.includes('(add `--history` to reach archived phases)'),
            'the planner asks for archives',
        );
        assert.ok(
            !comparison.includes('--history') && !mode.includes('--history'),
            'the specification check and the audit keep archives out of the set',
        );
        // Nothing about the checks themselves moved.
        assert.ok(planCheck.includes('Print `[Coherence] {N} artifacts compared — {k} findings`'));
        assert.ok(
            planCheck.includes('an *ordering conflict*') &&
                planCheck.includes('an *interaction gap*'),
        );
        assert.ok(mode.includes('`COHERENCE {class} {file-a} §{x} ↔ {file-b} §{y}`'));
        assert.ok(comparison.includes('stop when a round adds no new specification'));

        const governance = repoFile(
            '.magicspec',
            'engine',
            'specifications',
            'l2-role-cards-governance.md',
        );
        const execution = repoFile(
            '.magicspec',
            'engine',
            'specifications',
            'l2-role-cards-execution.md',
        );
        assert.ok(
            governance.includes(comparison.trim()),
            'the spec-critic mirror holds the card line verbatim',
        );
        assert.ok(
            execution.includes(planCheck.trim()),
            'the planner mirror holds the card line verbatim',
        );
        assert.ok(
            !/\.magicspec\/engine\b/.test(critic + planner + analyze),
            'the shipped text names no workspace of this repository',
        );
    });

    test("intake investigation (IK-2) and the fix workflow's sibling-site search (FX-6) query the index first and fall back to a text search, and no gate, question or count changes (AM-3, AM-8)", () => {
        const spec = repoFile('skills', 'magicspec', 'workflows', 'spec.md');
        const fix = repoFile('skills', 'magicspec', 'workflows', 'fix.md');

        const investigate = lineStartingWith(spec, '1. **Investigate first (IK-2)**');
        assert.ok(investigate, 'spec.md has the IK-2 step');
        assert.ok(
            investigate.includes('`node scripts/executor.js memory-query "{topic}"`'),
            'the specs on the topic are found through the index',
        );
        assert.ok(
            investigate.includes('read the cited lines, not the file, before relying on a result'),
            'cite, then read',
        );
        assert.ok(
            /when the query prints that the index is unavailable, search the text directly/.test(
                investigate,
            ),
            'with a text search as the fallback',
        );
        assert.ok(
            investigate.includes('"I did not read the specs"') &&
                investigate.includes(
                    'A question is legitimate only for what cannot exist in the repository',
                ),
            'the rule of the step is unchanged',
        );
        assert.ok(
            investigate.indexOf('memory-query') < investigate.indexOf('A question is legitimate'),
        );

        const sibling = lineStartingWith(fix, '5. **Sibling sites**');
        assert.ok(sibling, 'fix.md has the sibling-site step');
        assert.ok(
            sibling.includes('`node scripts/executor.js memory-query "{mechanism}"`'),
            'the rules and specifications are found through the index',
        );
        assert.ok(
            sibling.includes('read the cited lines, not the file, before relying on a result'),
        );
        assert.ok(
            /when the query prints that the index is unavailable, search the text directly/.test(
                sibling,
            ),
        );
        assert.ok(
            sibling.includes(
                "The product's code is searched as text: the index covers the state folder only.",
            ),
            'the code stays a text search',
        );
        assert.ok(
            sibling.includes(
                'Each site found is fixed in the same repair or recorded as a separate defect; the report counts both.',
            ),
            'the count is unchanged',
        );
        for (const [name, text] of [
            ['spec.md', spec],
            ['fix.md', fix],
        ]) {
            assert.ok(
                !/\.magicspec\/engine\b/.test(text),
                `${name} names no workspace of this repository`,
            );
        }
    });

    test('the five readers of an index result say to read the cited lines, not the file, and to page or narrow a cut list before treating the set as complete, and each keeps its fallback to a text search (AM-2, AM-3, AM-9)', () => {
        const skill = (...parts) => repoFile('skills', 'magicspec', ...parts);
        const sites = [
            ['spec-critic card', skill('roles', 'spec-critic.md'), '- **Comparison set:**'],
            ['planner card', skill('roles', 'planner.md'), '6. **Plan check (mandatory'],
            [
                'analyze Mode C 7a',
                skill('workflows', 'analyze.md'),
                '7a. **Cross-Artifact Coherence',
            ],
            ['fix step 5', skill('workflows', 'fix.md'), '5. **Sibling sites**'],
            ['spec IK-2', skill('workflows', 'spec.md'), '1. **Investigate first (IK-2)**'],
        ];
        for (const [name, text, start] of sites) {
            const line = lineStartingWith(text, start);
            assert.ok(line, `${name}: the step exists`);
            assert.ok(line.includes('cites each with its lines'), `${name}: a citation has lines`);
            assert.ok(
                line.includes('read the cited lines, not the file, before relying on a result'),
                `${name}: read the lines, not the file (AM-3)`,
            );
            assert.ok(
                line.includes(
                    'When the first line counts more matches than it showed, the list was cut: take the next page it names (`--offset`) or narrow the query',
                ),
                `${name}: a cut list is paged or narrowed (AM-9)`,
            );
            assert.ok(
                /before (treating the (set|set of sites) as complete|concluding that the repository does not answer); when the query prints that the index is unavailable, search (the text|the entries) directly/.test(
                    line,
                ),
                `${name}: nothing is concluded from a cut list, and the text search stays as the fallback (AM-8)`,
            );
            assert.ok(!line.includes('read a cited section'), `${name}: the old wording is gone`);
        }
        // The cards' queries still name the same two options the text points to.
        const { COMMANDS } = require(path.join(SIM_SCRIPTS, 'lib', 'commands.js'));
        assert.strictEqual(COMMANDS['memory-query'].options['--offset'].kind, 'value');
    });
};
