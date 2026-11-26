// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT INDEX (sectioning, the two backends, memory-index and memory-query)
// ═══════════════════════════════════════════════════════════════════════════
//
// The embeddings, the query coverage and the readers of a result are in artifact-search.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { scriptsDir, cleanup } = require('./lib/base');
const {
    simExec,
    treeHashes,
    simPutter,
    stateFolderOfRepo,
    memorySectionsPath,
    memoryFallbackPath,
    memorySqlitePath,
    needsSqlite,
    makeMemoryFixture,
    memoryQuery,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // Artifact memory index (l2-artifact-memory-store.md)
    // ───────────────────────────────────────────────────────────────────────────

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
            [
                ...rows.keys(),
            ].every((rel) => specUnits.some((u) => u.path === rel)),
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
            [
                '# T › ## A',
                '# T › ## B',
            ],
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
        const long = `# T\n\n## A\n\n${[
            paragraph,
            paragraph,
            paragraph,
            paragraph,
        ].join('\n\n')}\n`;
        const parts = memory.sectionsOf('RULES.md', long);
        assert.ok(parts.length > 1, 'a long section is split');
        assert.ok(
            parts.every(
                (u) => u.body.length <= memory.MAX_SECTION_CHARS && u.heading === '# T › ## A',
            ),
        );
        assert.strictEqual(
            parts.map((u) => u.body).join('\n\n'),
            [
                paragraph,
                paragraph,
                paragraph,
                paragraph,
            ].join('\n\n'),
        );
    });

    test('memory sections: derived files are never read — the extraction cache, the graph folder and CONTEXT.md — and a Markdown file no kind covers is reported, not indexed (AM-1)', () => {
        const memory = require(memorySectionsPath);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const put = (rel, text) => {
                fs.mkdirSync(path.dirname(path.join(tempDir, rel)), {
                    recursive: true,
                });
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
            assert.deepStrictEqual(files, [
                'INDEX.md',
                'ws/specifications/l1-a.md',
            ]);
            assert.deepStrictEqual(unkinded, [
                'ws/simulations/area.md',
            ]);
            assert.deepStrictEqual(
                memory.sectionsOf('ws/simulations/area.md', '# S\n\n## A\n\nx'),
                [],
            );
            assert.deepStrictEqual(
                memory.listArtifacts(path.join(tempDir, 'absent')),
                {
                    files: [],
                    unkinded: [],
                },
                'a missing state folder lists nothing',
            );
        } finally {
            cleanup(tempDir);
        }
    });

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
        assert.deepStrictEqual(parseQuery('check-prerequisites'), [
            [
                'check',
                'prerequisites',
            ],
        ]);
        assert.deepStrictEqual(parseQuery('lib/memory.js retry'), [
            [
                'lib',
                'memory',
                'js',
            ],
            [
                'retry',
            ],
        ]);
        assert.deepStrictEqual(parseQuery('"adjacent words" other other'), [
            [
                'adjacent',
                'words',
            ],
            [
                'other',
            ],
        ]);
        assert.deepStrictEqual(parseQuery('   '), []);

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-memory-'));
        try {
            const backend = openMemoryFallback(tempDir);
            const headings = (text) =>
                backend.query(parseQuery(text)).map((r) => r.heading.split(' › ')[1]);
            assert.deepStrictEqual(
                headings('check-prerequisites'),
                [
                    '## Alpha',
                ],
                'the phrase matches only where the two words are adjacent',
            );
            assert.deepStrictEqual(headings('prerequisites check'), [
                '## Alpha',
                '## Beta',
                '## Gamma',
            ]);
            assert.deepStrictEqual(
                headings('CHECK'),
                [
                    '## Beta',
                    '## Alpha',
                ],
                'two hits outrank one',
            );
            assert.deepStrictEqual(headings('registry'), [
                '## Gamma',
            ]);
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
            const [common] = backend.query(parseQuery('doc'), {
                limit: 1,
            });
            assert.ok(
                common.score > 0 && common.score < 1e-5,
                `a term in every row scores ~0 (${common.score})`,
            );

            // The statistics do not move with a filter: the score of one row is the same filtered or not.
            const filtered = backend.query(parseQuery('registry'), {
                kinds: [
                    'spec',
                ],
            });
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
            backend.replaceFile('a/PLAN.md', 'h1', [
                unit('a/PLAN.md', 'plan', 'a', 'retry rule'),
            ]);
            backend.replaceFile('b/PLAN.md', 'h2', [
                unit('b/PLAN.md', 'plan', 'b', 'retry rule'),
            ]);
            backend.replaceFile('a/CHANGELOG.md', 'h3', [
                unit('a/CHANGELOG.md', 'changelog', 'a', 'retry rule'),
            ]);
            backend.replaceFile('a/archives/p.md', 'h4', [
                unit('a/archives/p.md', 'archive', 'a', 'retry rule'),
            ]);
            const paths = (options) => retryPaths(backend, options);
            assert.deepStrictEqual(paths({}), [
                'a/PLAN.md',
                'b/PLAN.md',
            ]);
            assert.deepStrictEqual(
                paths({
                    workspace: 'b',
                }),
                [
                    'b/PLAN.md',
                ],
            );
            assert.deepStrictEqual(
                paths({
                    history: true,
                }),
                [
                    'a/CHANGELOG.md',
                    'a/PLAN.md',
                    'a/archives/p.md',
                    'b/PLAN.md',
                ],
            );
            assert.deepStrictEqual(
                paths({
                    kinds: [
                        'changelog',
                    ],
                }),
                [
                    'a/CHANGELOG.md',
                ],
                'a named history kind is returned',
            );
            assert.strictEqual(
                backend.query(parseQuery('retry'), {
                    history: true,
                    limit: 2,
                }).length,
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
                [
                    ...again.fileHashes(),
                ],
                [
                    [
                        'ws/specifications/l1-a.md',
                        'sha-a',
                    ],
                ],
            );
            assert.strictEqual(again.sectionCount(), 3);
            assert.strictEqual(again.getMeta('provider'), 'none');
            assert.strictEqual(again.getMeta('backend'), 'fallback');
            assert.strictEqual(again.query(parseQuery('registry')).length, 1);

            again.replaceFile('ws/specifications/l1-a.md', 'sha-b', [
                memoryCorpus()[0],
            ]);
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
                JSON.stringify({
                    meta: {
                        schema_version: '0',
                    },
                    sections: [
                        {
                            id: 1,
                        },
                    ],
                }),
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
        const requiredBy = (...parts) => {
            const source = fs.readFileSync(path.join(scriptsDir, ...parts), 'utf8');
            return [
                ...source.matchAll(/require\('([^']+)'\)/g),
            ].map((m) => m[1]);
        };
        for (const file of [
            'memory-sections.js',
            'memory-fallback.js',
            'memory-sqlite.js',
        ]) {
            const required = requiredBy('lib', file);
            assert.ok(required.length > 0);
            for (const name of required) {
                assert.ok(
                    [
                        'fs',
                        'path',
                    ].includes(name) ||
                        /^\.\/memory-[a-z]+$/.test(name) ||
                        (file === 'memory-sections.js' && name === './doc-set-state') ||
                        (file === 'memory-sqlite.js' && name === 'node:sqlite'),
                    `${file} requires only node:fs, node:path, its siblings, the move predicate and, for the SQLite backend, node:sqlite (${name})`,
                );
            }
        }
        // The predicate of a move in flight brings the shared utilities with it, which are
        // built on Node alone.
        assert.deepStrictEqual(requiredBy('lib', 'doc-set-state.js').sort(), [
            '../utils',
            'node:fs',
            'node:path',
        ]);
        assert.deepStrictEqual(
            requiredBy('utils.js').filter((name) => name.startsWith('.')),
            [],
        );
    });

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
                            return {
                                get: () => undefined,
                                run() {},
                            };
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
                assert.deepStrictEqual(
                    retry(sqlite, {
                        kinds: [
                            'plan',
                        ],
                    }),
                    [],
                );
                assert.deepStrictEqual(
                    retry(sqlite, {
                        workspace: 'other',
                    }),
                    [],
                );
                assert.deepStrictEqual(
                    retry(sqlite, {
                        workspace: 'ws',
                    }),
                    [
                        'spec',
                    ],
                );
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
                backend.replaceFile('ws/PLAN.md', 'g', [
                    unit('ws/PLAN.md', 'plan', 'retry rule'),
                ]);
                const paths = (options) => retryPaths(backend, options);
                assert.deepStrictEqual(paths({}), [
                    'ws/PLAN.md',
                ]);
                assert.deepStrictEqual(
                    paths({
                        history: true,
                    }),
                    [
                        'ws/PLAN.md',
                        'ws/archives/p.md',
                    ],
                );
                assert.deepStrictEqual(
                    paths({
                        kinds: [
                            'archive',
                        ],
                    }),
                    [
                        'ws/archives/p.md',
                    ],
                );

                // Unsaved writes are not durable: closing discards them.
                backend.close();
                const reopened = openBackend(tempDir);
                assert.strictEqual(reopened.sectionCount(), 0, 'nothing was saved');

                reopened.replaceFile('ws/PLAN.md', 'g', [
                    unit('ws/PLAN.md', 'plan', 'retry rule'),
                ]);
                reopened.setMeta('provider', 'none');
                reopened.save();
                reopened.close();
                const again = openBackend(tempDir);
                assert.deepStrictEqual(
                    [
                        ...again.fileHashes(),
                    ],
                    [
                        [
                            'ws/PLAN.md',
                            'g',
                        ],
                    ],
                );
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
        const flag = [
            '--disable-warning=ExperimentalWarning',
        ];
        assert.deepStrictEqual(
            runtimeFlags(
                {
                    usesSqlite: true,
                },
                new Set([
                    '--disable-warning',
                ]),
            ),
            flag,
        );
        assert.deepStrictEqual(
            runtimeFlags(
                {
                    usesSqlite: true,
                },
                new Set([
                    '--no-warnings',
                ]),
            ),
            [],
            'an older runtime gets no flag it would reject',
        );
        assert.deepStrictEqual(
            runtimeFlags(
                {},
                new Set([
                    '--disable-warning',
                ]),
            ),
            [],
            'a command without SQLite gets none',
        );
        assert.deepStrictEqual(
            runtimeFlags({
                summary: 'x',
            }),
            [],
            'the default reads this runtime and a command without SQLite still gets none',
        );
        const executor = fs.readFileSync(path.join(scriptsDir, 'executor.js'), 'utf8');
        assert.ok(
            /cmdArgs = \[\s*\.\.\.commands\.runtimeFlags\(commandEntry\),\s*jsPath,\s*\.\.\.args,?\s*\];/.test(
                executor,
            ),
            'the executor applies it to the script it starts',
        );
    });

    test('memory-query: it ranks sections with citations, a score, the file, the heading path and the modes line, and composes no answer (AM-3)', () => {
        const dir = makeMemoryFixture();
        try {
            const result = memoryQuery(dir, [
                'retry rule',
            ]);
            assert.strictEqual(result.status, 0, result.stderr);
            const lines = result.stdout.trimEnd().split('\n');
            assert.strictEqual(lines[0], 'modes: lexical');
            assert.match(
                lines[1],
                /^ 1\. \d+\.\d {2}\.magicspec\/ws\/specifications\/l1-a\.md:\d+-\d+ › ## Retry Rule {3}\(spec, Stable v1\.2\.0, ~\d+ tokens\)$/,
            );
            assert.match(lines[2], /^ {6}A failed call is retried/);
            assert.ok(!/answer|summary/i.test(lines[0]), 'no synthesized text');

            const json = JSON.parse(
                memoryQuery(dir, [
                    'retry rule',
                    '--json',
                ]).stdout,
            );
            assert.deepStrictEqual(json.modes, [
                'lexical',
            ]);
            const first = json.results[0];
            assert.strictEqual(first.file, '.magicspec/ws/specifications/l1-a.md');
            assert.strictEqual(first.heading, '# Alpha › ## Retry Rule');
            assert.deepStrictEqual(
                [
                    first.kind,
                    first.workspace,
                    first.status,
                    first.version,
                ],
                [
                    'spec',
                    'ws',
                    'Stable',
                    '1.2.0',
                ],
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
                JSON.parse(
                    memoryQuery(dir, [
                        text,
                        '--json',
                    ]).stdout,
                ).results.map((r) => r.file);
            assert.deepStrictEqual(files('zebra'), []);
            put(
                '.magicspec/ws/PLAN.md',
                '# Plan\n\n## Phase 1\n\nBuild the zebra wrapper first.\n',
            );
            assert.deepStrictEqual(
                files('zebra'),
                [
                    '.magicspec/ws/PLAN.md',
                ],
                'the edit is seen',
            );
            assert.deepStrictEqual(files('wrapper retry').includes('.magicspec/ws/PLAN.md'), true);
            put(
                '.magicspec/ws/specifications/l1-c.md',
                '# Gamma\n\n## Note\n\nA zebra crossing.\n',
            );
            assert.deepStrictEqual(
                files('crossing'),
                [
                    '.magicspec/ws/specifications/l1-c.md',
                ],
                'the new file is seen',
            );
            fs.rmSync(path.join(dir, '.magicspec/ws/specifications/l1-c.md'));
            assert.deepStrictEqual(files('crossing'), [], 'the deleted file is gone');

            const nothing = simExec(dir, [
                'memory-index',
            ]);
            assert.match(nothing.stdout, /\(0 indexed, \d+ unchanged, 0 removed\)/, nothing.stdout);
        } finally {
            cleanup(dir);
        }
    });

    test('memory-query: archives, history tables, retrospectives and changelogs are out of the results unless asked for, and kind, count and workspace narrow them (AM-6)', () => {
        const dir = makeMemoryFixture();
        try {
            const files = (args) =>
                JSON.parse(
                    memoryQuery(dir, [
                        ...args,
                        '--json',
                    ]).stdout,
                ).results.map((r) => r.file.replace('.magicspec/', ''));
            assert.ok(
                !files([
                    'archivedword',
                ]).length,
                'an archive is not returned by default',
            );
            assert.ok(
                !files([
                    'changeloggedword',
                ]).length,
                'a changelog is not returned by default',
            );
            assert.deepStrictEqual(
                files([
                    'archivedword',
                    '--history',
                ]),
                [
                    'ws/archives/tasks/phase-0.md',
                ],
            );
            assert.deepStrictEqual(
                files([
                    'changeloggedword',
                    '--history',
                ]),
                [
                    'ws/CHANGELOG.md',
                ],
            );
            assert.deepStrictEqual(
                files([
                    'retry',
                    '--kind=plan',
                ]),
                [
                    'ws/PLAN.md',
                ],
            );
            assert.deepStrictEqual(
                files([
                    'retry',
                    '--kind',
                    'changelog',
                ]),
                [
                    'ws/CHANGELOG.md',
                ],
                'a named history kind is returned',
            );
            assert.strictEqual(
                files([
                    'retry',
                    '--history',
                    '--k=2',
                ]).length,
                2,
            );

            const unknown = memoryQuery(dir, [
                'retry',
                '--kind=nonsense',
            ]);
            assert.strictEqual(unknown.status, 1);
            assert.match(unknown.stderr, /unknown kind 'nonsense'/);
            assert.strictEqual(
                memoryQuery(dir, [
                    'retry',
                    '--k=0',
                ]).status,
                1,
            );
            assert.strictEqual(
                memoryQuery(dir, []).status,
                1,
                'no text is a usage error, not a silent empty answer',
            );

            // The workspace the caller names narrows the search; the registry's default alone does not.
            assert.ok(
                files([
                    'retry',
                ]).some((f) => f.startsWith('other/')),
                'the default workspace does not narrow',
            );
            const named = files([
                'retry',
                '--workspace=other',
            ]);
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
            const built = simExec(dir, [
                'memory-index',
            ]);
            assert.strictEqual(built.status, 0, built.stderr);
            assert.match(
                built.stdout,
                /^\[memory-index\] (sqlite|fallback): \d+ sections in 6 files \(6 indexed, 0 unchanged, 0 removed\)\.$/m,
            );
            const after = treeHashes(dir);
            const changed = [
                ...after.keys(),
            ].filter((k) => after.get(k) !== before.get(k));
            assert.ok(
                changed.every((k) => k.startsWith('.magicspec/.cache/')),
                `only the cache changed: ${changed}`,
            );

            const answers = () =>
                memoryQuery(dir, [
                    'retry',
                    '--json',
                    '--history',
                ]).stdout;
            const first = answers();
            for (const name of [
                'memory.sqlite',
                'memory.json',
            ]) {
                fs.rmSync(path.join(dir, '.magicspec/.cache', name), {
                    force: true,
                });
            }
            assert.strictEqual(answers(), first, 'a deleted index is rebuilt with nothing lost');
            const rebuilt = simExec(dir, [
                'memory-index',
                '--rebuild',
            ]);
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
            for (const name of [
                'memory.sqlite',
                'memory.json',
            ]) {
                fs.mkdirSync(path.join(dir, '.magicspec/.cache', name), {
                    recursive: true,
                });
            }
            const index = simExec(dir, [
                'memory-index',
            ]);
            assert.strictEqual(index.status, 0, index.stderr);
            assert.match(
                index.stdout,
                /\[memory-index\] The artifact index is unavailable: .+ Search the text with grep instead\./,
            );

            const query = memoryQuery(dir, [
                'retry',
            ]);
            assert.strictEqual(query.status, 0, query.stderr);
            assert.match(
                query.stdout,
                /\[memory-query\] The artifact index is unavailable: .+ Search the text with grep instead\./,
            );
            const asJson = JSON.parse(
                memoryQuery(dir, [
                    'retry',
                    '--json',
                ]).stdout,
            );
            assert.deepStrictEqual(asJson.results, []);
            assert.ok(asJson.unavailable, 'the data form says why');

            const sink = fs
                .readFileSync(path.join(dir, '.magicspec/.cache/diagnostics.jsonl'), 'utf8')
                .trim()
                .split('\n')
                .map((l) => JSON.parse(l));
            const codes = new Set(sink.map((f) => f.code));
            assert.ok(
                codes.has('MEMORY_INDEX_UNAVAILABLE'),
                `recorded: ${[
                    ...codes,
                ]}`,
            );
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
            for (const args of [
                [
                    'memory-index',
                ],
                [
                    'memory-query',
                    'retry',
                ],
            ]) {
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
        const snippet = snippetOf(body, [
            [
                'needle',
            ],
        ]);
        assert.ok(snippet.startsWith('… ') && snippet.endsWith(' …'), snippet);
        assert.ok(snippet.includes('the needle is here and more'), 'collapsed to one line');
        assert.ok(snippet.length <= 210);
        assert.strictEqual(
            snippetOf('short text', [
                [
                    'absent',
                ],
            ]),
            'short text',
        );
    });
};
