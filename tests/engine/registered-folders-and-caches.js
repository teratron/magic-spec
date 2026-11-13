'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const {
    scriptsDir,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    copyStateTemplate,
} = require('./lib/base');
const {
    treeDigest,
    routingRegistry,
    writeRoutingFixture,
    routingEnv,
    executorListing,
} = require('./lib/sim');

module.exports = () => {
    // ═══════════════════════════════════════════════════════════════════════
    // 31. Registered folders only — nothing is written under a state-folder directory the
    //     registry does not hold (WI-14, G4). The scripts run for real; none is re-implemented.
    // ═══════════════════════════════════════════════════════════════════════

    const unknownGhost = "Unknown workspace 'ghost'. Available: [web, api, docs].";

    test('an unregistered name — in --workspace, MAGIC_WORKSPACE or the registry default — stops the executor with the registered names and writes nothing (WI-14, G4)', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const before = treeDigest(dir);
            const executor = path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js');
            const attempts = [
                { args: ['--workspace=ghost'], env: {} },
                { args: ['--workspace', 'ghost'], env: {} },
                { args: [], env: { MAGIC_WORKSPACE: 'ghost' } },
            ];
            for (const command of [
                'update-state',
                'generate-context',
                'archive-phases',
                'finalize',
                'resume-state',
            ]) {
                const extra = command === 'finalize' ? ['--workflow=run'] : [];
                for (const { args, env } of attempts) {
                    const result = spawnSync(
                        process.execPath,
                        [executor, command, ...extra, ...args],
                        {
                            cwd: dir,
                            encoding: 'utf8',
                            env: routingEnv(env),
                        },
                    );
                    const where = `${command} ${args.join(' ')} ${JSON.stringify(env)}`;
                    assert.strictEqual(result.status, 1, where);
                    assert.strictEqual(result.stderr.trim(), `HALT: ${unknownGhost}`, where);
                    assert.deepStrictEqual(
                        treeDigest(dir),
                        before,
                        `${where}: nothing was written`,
                    );
                }
            }
            // A default the registry does not hold is the same mistake, made in the file.
            writeRoutingFixture(dir, routingRegistry({ default: 'ghost' }));
            const registryBefore = treeDigest(dir);
            const defaulted = spawnSync(process.execPath, [executor, 'generate-context'], {
                cwd: dir,
                encoding: 'utf8',
                env: routingEnv(),
            });
            assert.strictEqual(defaulted.status, 1);
            assert.strictEqual(defaulted.stderr.trim(), `HALT: ${unknownGhost}`);
            assert.deepStrictEqual(treeDigest(dir), registryBefore);
        } finally {
            cleanup(dir);
        }
    });

    // A workspace folder with one finished phase, so that every writer below has something to write.
    const seedWorkspaceFolder = (dir, name) => {
        const wsDir = path.join(dir, '.magicspec', name);
        fs.mkdirSync(path.join(wsDir, 'specifications'), { recursive: true });
        fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
        fs.mkdirSync(path.join(wsDir, 'archives', 'tasks'), { recursive: true });
        fs.writeFileSync(
            path.join(wsDir, 'tasks', 'phase-1.md'),
            [
                '---',
                'phase: 1',
                'name: "Finished"',
                'status: Done',
                '---',
                '',
                '# Phase 1',
                '',
                '## Atomic Checklist',
                '',
                '- [x] [T-1A01] Done thing',
                '',
            ].join('\n'),
        );
    };

    test('every script that writes into a workspace folder writes into a registered one and refuses an unregistered one, whether or not the folder exists (WI-14)', () => {
        const writers = [
            { script: 'update-state', args: ['--decision', 'noted'] },
            { script: 'generate-context', args: [] },
            { script: 'archive-phases', args: [] },
            { script: 'finalize', args: ['--workflow=run'] },
        ];
        for (const { script, args } of writers) {
            for (const folder of ['absent', 'present']) {
                const dir = createTempWorkspace();
                try {
                    copyStateTemplate(dir);
                    writeRoutingFixture(dir);
                    seedWorkspaceFolder(dir, 'web');
                    const run = (workspace) =>
                        spawnSync(
                            process.execPath,
                            [
                                path.join(dir, 'skills', 'magicspec', 'scripts', `${script}.js`),
                                ...args,
                            ],
                            {
                                cwd: dir,
                                encoding: 'utf8',
                                env: routingEnv({ MAGIC_DESIGN_DIR: `.magicspec/${workspace}` }),
                            },
                        );
                    const where = `${script} (unregistered folder ${folder})`;

                    // The unregistered folder first, so that the registered run cannot have changed what it sees.
                    if (folder === 'present') seedWorkspaceFolder(dir, 'ghost');
                    const before = treeDigest(dir);
                    const refused = run('ghost');
                    assert.notStrictEqual(refused.status, 0, where);
                    assert.ok(refused.stderr.includes(unknownGhost), `${where}: ${refused.stderr}`);
                    assert.deepStrictEqual(
                        treeDigest(dir),
                        before,
                        `${where}: the listing is unchanged`,
                    );

                    const allowed = run('web');
                    assert.strictEqual(allowed.status, 0, `${script}: ${allowed.stderr}`);
                    assert.notDeepStrictEqual(
                        treeDigest(dir),
                        before,
                        `${script}: a registered folder is written`,
                    );
                } finally {
                    cleanup(dir);
                }
            }
        }
    });

    test('update-state refuses an unregistered design folder given as --workspace, before it takes its lock', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const before = treeDigest(dir);
            const result = spawnSync(
                process.execPath,
                [
                    path.join(dir, 'skills', 'magicspec', 'scripts', 'update-state.js'),
                    '--workspace=.magicspec/ghost',
                    '--decision=x',
                ],
                { cwd: dir, encoding: 'utf8', env: routingEnv() },
            );
            assert.strictEqual(result.status, 1);
            assert.strictEqual(result.stderr.trim(), `[update-state] HALT: ${unknownGhost}`);
            assert.deepStrictEqual(treeDigest(dir), before, 'no lock file, no folder');
            // A caller in the same process meets the same refusal as an exception.
            const { updateState } = requireFromFixture(dir, 'update-state.js');
            assert.throws(
                () =>
                    updateState(
                        path.join(dir, '.magicspec', 'ghost'),
                        { decision: 'x' },
                        { addDecision: true },
                    ),
                { message: unknownGhost },
            );
        } finally {
            cleanup(dir);
        }
    });

    test('what the registry cannot judge is not refused: the state folder, a folder with no registry beside it, and a registry without workspaces', () => {
        const dir = createTempWorkspace();
        try {
            const { unregisteredWorkspaceMessage, registeredWorkspaceNames } = requireFromFixture(
                dir,
                'utils.js',
            );
            // No registry at all: a project that is not initialized yet, or a custom design root.
            assert.strictEqual(
                unregisteredWorkspaceMessage(path.join(dir, '.magicspec', 'ghost')),
                null,
            );
            assert.strictEqual(
                unregisteredWorkspaceMessage(path.join(dir, 'custom', 'design')),
                null,
            );
            const designDir = writeRoutingFixture(dir);
            assert.strictEqual(unregisteredWorkspaceMessage(path.join(designDir, 'web')), null);
            assert.strictEqual(
                unregisteredWorkspaceMessage(path.join(designDir, 'ghost')),
                unknownGhost,
            );
            // The state folder itself and a folder elsewhere have no registry beside them.
            assert.strictEqual(unregisteredWorkspaceMessage(designDir), null);
            assert.strictEqual(
                unregisteredWorkspaceMessage(path.join(dir, 'custom', 'design')),
                null,
            );
            // An entry that is not an object registers nothing; a registry without workspaces judges nothing.
            fs.writeFileSync(
                path.join(designDir, 'workspace.json'),
                JSON.stringify({ workspaces: { web: { scope: [] }, broken: null, text: 'x' } }),
            );
            assert.deepStrictEqual(
                registeredWorkspaceNames(
                    JSON.parse(fs.readFileSync(path.join(designDir, 'workspace.json'), 'utf8')),
                ),
                ['web'],
            );
            assert.match(
                unregisteredWorkspaceMessage(path.join(designDir, 'broken')),
                /Available: \[web\]/,
            );
            fs.writeFileSync(
                path.join(designDir, 'workspace.json'),
                JSON.stringify({ default: 'web' }),
            );
            assert.strictEqual(unregisteredWorkspaceMessage(path.join(designDir, 'ghost')), null);
            fs.writeFileSync(path.join(designDir, 'workspace.json'), '{ not json');
            assert.strictEqual(unregisteredWorkspaceMessage(path.join(designDir, 'ghost')), null);
        } finally {
            cleanup(dir);
        }
    });

    test('every engine script that reads MAGIC_DESIGN_DIR is classified, and every one that writes into a workspace folder makes the registered-folder check', () => {
        const writers = [
            'archive-phases.js',
            'finalize.js',
            'generate-context.js',
            'update-state.js',
        ];
        // init creates the workspace it is given; the executor provisions only a registered folder.
        const creators = ['init.js', 'executor.js'];
        // These read the folder, or name it in a comment, and write only at the state folder's level.
        const readers = [
            'analyze-coverage.js',
            'build-spec-graph.js',
            'check-bloat.js',
            'check-prerequisites.js',
            'export-wiki.js',
            'extract-rationale.js',
            'resolve-workspace.js',
            'resume-state.js',
            'memory-query.js',
            'utils.js',
            path.join('lib', 'diagnostics.js'),
        ];
        const classified = new Set([...writers, ...creators, ...readers]);
        const found = [];
        const walk = (folder, prefix) => {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                if (entry.isDirectory())
                    walk(path.join(folder, entry.name), path.join(prefix, entry.name));
                else if (entry.name.endsWith('.js')) {
                    const text = fs.readFileSync(path.join(folder, entry.name), 'utf8');
                    if (text.includes('MAGIC_DESIGN_DIR'))
                        found.push(path.join(prefix, entry.name));
                }
            }
        };
        walk(scriptsDir, '');
        const unclassified = found.filter((file) => !classified.has(file));
        assert.deepStrictEqual(
            unclassified,
            [],
            `classify the script(s) that read MAGIC_DESIGN_DIR: ${unclassified.join(', ')}`,
        );
        const vanished = [...classified].filter((file) => !found.includes(file));
        assert.deepStrictEqual(
            vanished,
            [],
            `scripts listed here no longer read MAGIC_DESIGN_DIR: ${vanished.join(', ')}`,
        );
        for (const file of writers) {
            assert.ok(
                fs
                    .readFileSync(path.join(scriptsDir, file), 'utf8')
                    .includes('unregisteredWorkspaceMessage('),
                `${file} writes into a workspace folder and makes the registered-folder check`,
            );
        }
    });

    test('every command that acts on one workspace routes through resolve-workspace and narrates once; only spec may create a workspace (WI-11, WI-13)', () => {
        const engineFolder = path.resolve(scriptsDir, '..');
        const workflows = path.join(engineFolder, 'workflows');
        const read = (name) => fs.readFileSync(path.join(workflows, `${name}.md`), 'utf8');
        const routing =
            /^ {2}☐ Workspace Routing: .*`\[Workspace\] \{name\} — \{signal\}\. \(Override: \/magicspec \{command\} \{other\} …\)`/gm;
        // Analysis has one checklist per mode; every other body has one.
        const checklists = { spec: 1, task: 1, run: 1, rule: 1, analyze: 3, status: 1 };
        for (const [command, count] of Object.entries(checklists)) {
            const text = read(command);
            assert.ok(
                text.includes(`resolve-workspace --command ${command}`),
                `${command}.md names the call in its context step`,
            );
            assert.strictEqual(
                (text.match(routing) || []).length,
                count,
                `${command}.md: routing line in each checklist`,
            );
        }
        // The commands that do not act on one workspace say nothing of routing.
        for (const command of ['graph', 'help', 'migrate']) {
            assert.ok(
                !read(command).includes('resolve-workspace --command'),
                `${command}.md does not route`,
            );
        }
        // Creating a workspace stays with spec: no other body names the script.
        const creators = fs
            .readdirSync(workflows)
            .filter(
                (file) =>
                    file.endsWith('.md') && read(file.slice(0, -3)).includes('create-workspace'),
            );
        assert.deepStrictEqual(creators, ['spec.md']);

        const context = fs.readFileSync(
            path.join(engineFolder, 'references', 'context.md'),
            'utf8',
        );
        assert.ok(context.includes('resolve-workspace --command {command} --text "{request}"'));
        // The chain, in the order of the specification: argument, environment, then the registry's signals.
        const order = [
            '| 1 | **Explicit arg**',
            '| 2 | **`MAGIC_WORKSPACE`**',
            '| 3 | **`workspace.json`** | Single workspace',
            '**location**',
            '**topic**',
            '**work in flight**',
            "the registry's `default`",
            '**Workspace Disambiguation**',
        ].map((needle) => {
            assert.ok(context.includes(needle), `context.md holds ${needle}`);
            return context.indexOf(needle);
        });
        assert.deepStrictEqual(
            order,
            [...order].sort((a, b) => a - b),
            'the chain is stated in the specified order',
        );
        assert.ok(
            context.includes(
                '`[Workspace] {name} — {signal}. (Override: /magicspec {command} {other} …)`',
            ),
        );
        // The statement that only spec runs detection, and that task and rule skip it, is gone.
        assert.doesNotMatch(context, /`task\.md`\/`rule\.md`/);
        assert.match(context, /detects only the intent to \*\*create\*\* a workspace/);
    });

    // The name of the engine's own workspace, used as an example, is how an artifact reached a
    // state-folder directory no registry held (WI-14): shipped text writes a placeholder instead.
    const ownWorkspaceShapes = [
        /(?:magicspec (?:spec|task|run|rule|analyze|status|graph) +|Ventilate +|--workspace[= ]|\.magicspec\/|\bws:|\bspec:|\b[Ww]orkspace )[`"]?engine\b/,
        /(?<![\w-])`engine(?: [^`]*)?`(?![\w-])/,
        /"engine"|'engine'/,
        /\[engine,/,
    ];
    // This repository's own contributor guide lists its real workspaces: data, not an example.
    const ownWorkspaceExempt = /^\| engine \|/;
    const findOwnWorkspaceExamples = (text) =>
        text
            .split(/\r?\n/)
            .map((line, index) => ({ line, number: index + 1 }))
            .filter(
                ({ line }) =>
                    !ownWorkspaceExempt.test(line) &&
                    ownWorkspaceShapes.some((shape) => shape.test(line)),
            );

    test('shipped text, the documentation and the guides name no workspace of this repository as an example (WI-14)', () => {
        const repoRoot = path.resolve(scriptsDir, '..', '..', '..');
        const found = [];
        const walk = (relative) => {
            const absolute = path.join(repoRoot, relative);
            if (!fs.existsSync(absolute)) return;
            if (fs.statSync(absolute).isFile()) {
                if (relative.endsWith('.checksums')) return;
                for (const { line, number } of findOwnWorkspaceExamples(
                    fs.readFileSync(absolute, 'utf8'),
                )) {
                    found.push(`${relative}:${number}: ${line.trim().slice(0, 100)}`);
                }
                return;
            }
            for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
                if (entry.name === 'node_modules') continue;
                walk(`${relative}/${entry.name}`);
            }
        };
        for (const target of ['skills/magicspec', 'docs', 'README.md', 'CONTRIBUTING.md'])
            walk(target);
        assert.deepStrictEqual(found, [], `use {workspace} in examples:\n${found.join('\n')}`);

        // The detector fires on every shape the examples took, and spares prose that merely says "engine".
        for (const planted of [
            '/magicspec task engine',
            '/magicspec run engine "phase-1"',
            'executor.js update-state --workspace=engine',
            'executor.js update-state --workspace engine',
            'see .magicspec/engine/tasks/phase-2.md',
            '| `engine` | Matches a workspace name |',
            '| `engine "only new specs"` | First token |',
            'Force it by quoting: `/magicspec task "engine"`.',
            '"Ventilate engine"',
            'Workspace `engine` WC2 duplicates',
            'Available: [engine, docs]',
            'node id such as "ws:engine"',
        ]) {
            assert.strictEqual(
                findOwnWorkspaceExamples(planted).length,
                1,
                `the detector fires on: ${planted}`,
            );
        }
        for (const spared of [
            'The engine folder holds the workflows.',
            '/magicspec task {workspace}',
            'run update-engine-meta after a change to the engine',
            '| engine | Magic SDD core engine logic | 40 | [engine/INDEX.md](.magicspec/engine/INDEX.md) |',
        ]) {
            assert.strictEqual(
                findOwnWorkspaceExamples(spared).length,
                0,
                `the detector spares: ${spared}`,
            );
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 32. Cache retention — every cache has an owner that prunes it (Cache Retention)
    // ═══════════════════════════════════════════════════════════════════════

    const cacheSpecText = (name, extra = '') =>
        `# ${name}\n\n**Version:** 1.0.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nSpec ${name}.\n${extra}`;

    // One workspace of three specifications, so that a build leaves three extraction entries.
    const writeCacheFixture = () => {
        const dir = createTempWorkspace();
        writeRoutingFixture(dir, { default: 'main', workspaces: { main: { scope: ['src'] } } });
        const specs = path.join(dir, '.magicspec', 'main', 'specifications');
        for (const name of ['l1-a', 'l1-b', 'l1-c']) {
            fs.writeFileSync(path.join(specs, `${name}.md`), cacheSpecText(name));
        }
        return { dir, specs };
    };

    const buildGraph = (dir, args = []) =>
        spawnSync(
            process.execPath,
            [
                path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                'build-spec-graph',
                ...args,
            ],
            { cwd: dir, encoding: 'utf8', env: routingEnv() },
        );

    const extractionFolder = (dir) => path.join(dir, '.magicspec', 'graph', '.cache');
    const extractionEntries = (dir) => fs.readdirSync(extractionFolder(dir)).sort();
    // The entry a specification has in the cache, by the cache's own key.
    const extractionEntryOf = (dir, file) =>
        `${requireFromFixture(dir, 'graph-cache.js').fileHash(file, dir)}.json`;

    test('the extraction cache holds one entry per current specification after each successful build: an edited file and a deleted one leave nothing behind', () => {
        const { dir, specs } = writeCacheFixture();
        try {
            assert.strictEqual(buildGraph(dir).status, 0);
            const first = extractionEntries(dir);
            assert.strictEqual(first.length, 3);

            fs.writeFileSync(
                path.join(specs, 'l1-a.md'),
                cacheSpecText('l1-a', '\nA new paragraph.\n'),
            );
            fs.rmSync(path.join(specs, 'l1-b.md'));
            const second = buildGraph(dir);
            assert.strictEqual(second.status, 0, second.stderr);
            const expected = ['l1-a', 'l1-c']
                .map((name) => extractionEntryOf(dir, path.join(specs, `${name}.md`)))
                .sort();
            assert.deepStrictEqual(extractionEntries(dir), expected);
            assert.match(second.stdout, /Extraction cache : pruned 2 stale files/);
            assert.ok(
                first.includes(extractionEntryOf(dir, path.join(specs, 'l1-c.md'))),
                'the entry of the untouched file is the one the first build wrote',
            );

            // The machine-readable output stays one document: the line about the cache is for people.
            fs.writeFileSync(path.join(specs, 'l1-c.md'), cacheSpecText('l1-c', '\nChanged.\n'));
            const machine = buildGraph(dir, ['--json']);
            assert.strictEqual(machine.status, 0, machine.stderr);
            assert.doesNotThrow(() => JSON.parse(machine.stdout));
            assert.strictEqual(extractionEntries(dir).length, 2);
        } finally {
            cleanup(dir);
        }
    });

    test('two builds on unchanged input leave the extraction cache byte for byte the same, and say nothing about pruning', () => {
        const { dir } = writeCacheFixture();
        try {
            assert.strictEqual(buildGraph(dir).status, 0);
            const before = treeDigest(extractionFolder(dir));
            const again = buildGraph(dir);
            assert.strictEqual(again.status, 0);
            assert.deepStrictEqual(treeDigest(extractionFolder(dir)), before);
            assert.doesNotMatch(again.stdout, /pruned/);
        } finally {
            cleanup(dir);
        }
    });

    test('a build that fails before it writes its output prunes nothing, and a build that bypassed the cache does not empty it', () => {
        const { dir, specs } = writeCacheFixture();
        try {
            assert.strictEqual(buildGraph(dir).status, 0);
            const first = extractionEntries(dir);
            fs.writeFileSync(
                path.join(specs, 'l1-a.md'),
                cacheSpecText('l1-a', '\nA new paragraph.\n'),
            );
            fs.rmSync(path.join(specs, 'l1-b.md'));

            // The output folder is a file, so the write fails after the specifications were read.
            fs.writeFileSync(path.join(dir, 'blocked'), 'x');
            const failed = buildGraph(dir, [
                '--json',
                '--out',
                path.join(dir, 'blocked', 'graph.json'),
            ]);
            assert.notStrictEqual(failed.status, 0);
            const afterFailure = extractionEntries(dir);
            for (const entry of first) {
                assert.ok(
                    afterFailure.includes(entry),
                    `${entry.slice(0, 8)}… is still there after a failed build`,
                );
            }

            // Bypassing the cache reads and writes no entry, so it must not look at the folder either.
            const bypassed = buildGraph(dir, ['--no-cache']);
            assert.strictEqual(bypassed.status, 0, bypassed.stderr);
            assert.deepStrictEqual(extractionEntries(dir), afterFailure);

            // The next build that gets through prunes what the failed one left.
            assert.strictEqual(buildGraph(dir).status, 0);
            assert.strictEqual(extractionEntries(dir).length, 2);
        } finally {
            cleanup(dir);
        }
    });

    test('the extraction cache prune removes entries and the temporary files of interrupted writes, and leaves files that are not entries', () => {
        const { dir } = writeCacheFixture();
        try {
            assert.strictEqual(buildGraph(dir).status, 0);
            const folder = extractionFolder(dir);
            const unrelated = '0'.repeat(64);
            const current = extractionEntries(dir)[0].replace(/\.json$/, '');
            fs.writeFileSync(path.join(folder, `${unrelated}.json`), '{}');
            fs.writeFileSync(path.join(folder, `${unrelated}.json.tmp`), '{');
            // A temporary file is debris even when its entry is one the build uses.
            fs.writeFileSync(path.join(folder, `${current}.json.tmp`), '{');
            fs.writeFileSync(path.join(folder, 'notes.txt'), 'kept');
            assert.strictEqual(buildGraph(dir).status, 0);
            const left = extractionEntries(dir);
            assert.ok(!left.includes(`${unrelated}.json`));
            assert.ok(!left.includes(`${unrelated}.json.tmp`));
            assert.ok(!left.includes(`${current}.json.tmp`));
            assert.ok(left.includes(`${current}.json`), 'the entry itself stays');
            assert.ok(
                left.includes('notes.txt'),
                'a file that is not a cache entry is not ours to remove',
            );
            assert.strictEqual(left.length, 4);
        } finally {
            cleanup(dir);
        }
    });

    test('pruneUnused keeps what this process read or wrote and nothing else, and forgets it afterwards', () => {
        const { dir, specs } = writeCacheFixture();
        try {
            const cache = requireFromFixture(dir, 'graph-cache.js');
            const designAbs = path.join(dir, '.magicspec');
            const empty = { refs: [], parent: null, conventions: [] };
            const written = path.join(specs, 'l1-a.md');
            const read = path.join(specs, 'l1-b.md');

            cache.saveCached(read, empty, designAbs, dir); // an entry from an earlier round
            cache.pruneUnused(designAbs); // ends that round: nothing is in use any more
            cache.saveCached(written, empty, designAbs, dir); // written in this round
            assert.deepStrictEqual(cache.loadCached(read, designAbs, dir), empty); // read in this round
            fs.writeFileSync(path.join(extractionFolder(dir), `${'1'.repeat(64)}.json`), '{}');

            assert.strictEqual(
                cache.pruneUnused(designAbs),
                1,
                'only the entry nobody asked for goes',
            );
            assert.deepStrictEqual(
                extractionEntries(dir),
                [extractionEntryOf(dir, written), extractionEntryOf(dir, read)].sort(),
            );
            // Nothing was used since the last prune: both entries are stale in the next round.
            assert.strictEqual(cache.pruneUnused(designAbs), 2);
            assert.deepStrictEqual(extractionEntries(dir), []);
        } finally {
            cleanup(dir);
        }
    });

    // The caches the engine writes, with who owns each and whether it can be rebuilt. A script that
    // introduces a cache adds its row here and in the specification's inventory in the same change.
    const cacheInventory = [
        { cache: 'graph/.cache/', owner: 'graph-cache.js', mark: 'inUse', rebuildable: true },
        {
            cache: 'graph/query.json',
            owner: 'build-spec-graph.js',
            mark: 'query.json',
            rebuildable: true,
        },
        {
            cache: 'graph/graph.html',
            owner: 'build-spec-graph.js',
            mark: 'DEFAULT_HTML_PATH',
            rebuildable: true,
        },
        { cache: 'graph/wiki/', owner: 'export-wiki.js', mark: 'pruneWiki', rebuildable: true },
        {
            cache: '.cache/finalize-state.json',
            owner: 'finalize.js',
            mark: 'finalize-state.json',
            rebuildable: true,
        },
        {
            cache: '.cache/docs-state.json',
            owner: path.join('..', '..', '..', 'scripts', 'sync-docs.js'),
            mark: 'docs-state.json',
            rebuildable: true,
        },
        {
            cache: '.cache/state-{workspace}.lock',
            owner: 'update-state.js',
            mark: '.lock',
            rebuildable: true,
        },
        {
            cache: '.cache/diagnostics.jsonl',
            owner: path.join('lib', 'diagnostics.js'),
            mark: 'diagnostics.jsonl',
            rebuildable: false,
        },
        {
            cache: '.cache/feedback.json',
            owner: path.join('lib', 'feedback.js'),
            mark: 'feedback.json',
            rebuildable: false,
        },
        {
            cache: '.cache/memory.sqlite',
            owner: path.join('lib', 'memory-sqlite.js'),
            mark: 'memory.sqlite',
            rebuildable: true,
        },
        {
            cache: '.cache/memory.json',
            owner: path.join('lib', 'memory-fallback.js'),
            mark: 'memory.json',
            rebuildable: true,
        },
        {
            cache: '.cache/memory.lock',
            owner: path.join('lib', 'memory-refresh.js'),
            mark: 'memory.lock',
            rebuildable: true,
        },
    ];

    test('every script that writes a cache is in the inventory, and every row still has its writer', () => {
        const repoRoot = path.resolve(scriptsDir, '..', '..', '..');
        const owners = new Set(cacheInventory.map(({ owner }) => path.normalize(owner)));
        // Not writers of an inventoried cache: `utils.js` defines where the graph folder is, `clean-cache.js` only removes them, `lib/memory-sections.js` names `.cache` only to skip it, and `lib/sync-graph.js` copies the pages `export-wiki --out` rendered into the wiki that `export-wiki` owns and prunes (it reports a stale page and never removes one), so the wiki keeps its one owner.
        const notWriters = new Set([
            'utils.js',
            'clean-cache.js',
            path.join('lib', 'memory-sections.js'),
            path.join('lib', 'sync-graph.js'),
        ]);
        const mentions = [];
        const scan = (folder, prefix) => {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                const relative = path.join(prefix, entry.name);
                if (entry.isDirectory()) scan(path.join(folder, entry.name), relative);
                else if (entry.name.endsWith('.js')) {
                    const text = fs.readFileSync(path.join(folder, entry.name), 'utf8');
                    if (text.includes("'.cache'") || text.includes('graphPaths('))
                        mentions.push(path.normalize(relative));
                }
            }
        };
        scan(scriptsDir, '');
        // The maintenance scripts are reached from the engine folder by the same relative spelling the inventory uses.
        for (const name of fs.readdirSync(path.join(repoRoot, 'scripts'))) {
            if (!name.endsWith('.js')) continue;
            const text = fs.readFileSync(path.join(repoRoot, 'scripts', name), 'utf8');
            if (text.includes("'.cache'"))
                mentions.push(path.normalize(path.join('..', '..', '..', 'scripts', name)));
        }
        const missing = mentions.filter((file) => !owners.has(file) && !notWriters.has(file));
        assert.deepStrictEqual(
            missing,
            [],
            `add a row for the cache these scripts write: ${missing.join(', ')}`,
        );
        // graph-cache.js reaches the folder through graphPaths, so it is found by that call.
        for (const { cache, owner, mark } of cacheInventory) {
            const text = fs.readFileSync(path.resolve(scriptsDir, owner), 'utf8');
            assert.ok(text.includes(mark), `${owner} still writes ${cache} (${mark})`);
        }
    });

    test('the wiki holds the pages the current input needs after each write: a deleted specification, a new one and a leftover temporary file', () => {
        const { dir, specs } = writeCacheFixture();
        try {
            const exportWiki = () =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                        'export-wiki',
                    ],
                    { cwd: dir, encoding: 'utf8', env: routingEnv() },
                );
            const wiki = path.join(dir, '.magicspec', 'graph', 'wiki');
            assert.strictEqual(exportWiki().status, 0);
            const first = fs.readdirSync(wiki).sort();
            assert.ok(first.includes('index.md'));
            for (const name of ['l1-a', 'l1-b', 'l1-c']) {
                assert.ok(
                    first.some((file) => file.includes(`__${name}.md`)),
                    `a page for ${name}`,
                );
            }

            fs.writeFileSync(path.join(wiki, 'spec__main__l1-b.md.tmp'), 'half a page');
            fs.rmSync(path.join(specs, 'l1-b.md'));
            fs.writeFileSync(path.join(specs, 'l1-d.md'), cacheSpecText('l1-d'));
            assert.strictEqual(exportWiki().status, 0);
            const expected = first
                .filter((file) => !file.includes('__l1-b.md'))
                .concat('spec__main__l1-d.md')
                .sort();
            assert.deepStrictEqual(fs.readdirSync(wiki).sort(), expected);
        } finally {
            cleanup(dir);
        }
    });

    test('the query snapshot and the interactive page are single files that the next build replaces', () => {
        const { dir, specs } = writeCacheFixture();
        try {
            const graphFolder = path.join(dir, '.magicspec', 'graph');
            const nodeIds = () =>
                JSON.parse(fs.readFileSync(path.join(graphFolder, 'query.json'), 'utf8')).nodes.map(
                    (node) => node.id,
                );
            assert.strictEqual(buildGraph(dir, ['--json', '--out']).status, 0);
            assert.ok(nodeIds().includes('spec:main/l1-b'));
            assert.deepStrictEqual(fs.readdirSync(graphFolder).sort(), ['.cache', 'query.json']);

            fs.rmSync(path.join(specs, 'l1-b.md'));
            fs.writeFileSync(path.join(specs, 'l1-d.md'), cacheSpecText('l1-d'));
            assert.strictEqual(buildGraph(dir, ['--json', '--out']).status, 0);
            assert.ok(
                nodeIds().includes('spec:main/l1-d') && !nodeIds().includes('spec:main/l1-b'),
            );
            assert.deepStrictEqual(fs.readdirSync(graphFolder).sort(), ['.cache', 'query.json']);

            assert.strictEqual(buildGraph(dir, ['--html']).status, 0);
            fs.rmSync(path.join(specs, 'l1-c.md'));
            assert.strictEqual(buildGraph(dir, ['--html']).status, 0);
            assert.deepStrictEqual(fs.readdirSync(graphFolder).sort(), [
                '.cache',
                'graph.html',
                'query.json',
            ]);
            const page = fs.readFileSync(path.join(graphFolder, 'graph.html'), 'utf8');
            assert.ok(
                page.includes('l1-d') && !page.includes('l1-c'),
                'the page shows the current specifications',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('the finalize state is one file, rewritten by the next run with the new input', () => {
        const { dir } = writeCacheFixture();
        try {
            copyStateTemplate(dir);
            const planFile = path.join(dir, '.magicspec', 'main', 'PLAN.md');
            const stateFile = path.join(dir, '.magicspec', '.cache', 'finalize-state.json');
            const finalize = () =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                        'finalize',
                        '--workflow=run',
                    ],
                    { cwd: dir, encoding: 'utf8', env: routingEnv() },
                );
            fs.writeFileSync(planFile, '# Plan\n\nOne.\n');
            assert.strictEqual(finalize().status, 0);
            const first = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            fs.writeFileSync(planFile, '# Plan\n\nTwo.\n');
            assert.strictEqual(finalize().status, 0);
            const second = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            assert.notDeepStrictEqual(
                second.lastSnapshot,
                first.lastSnapshot,
                'the state describes the new input',
            );
            // A run with nothing significant rewrites the same file too, and says that it looked.
            assert.strictEqual(finalize().status, 0);
            const third = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            assert.ok(third.lastCheckedAt, 'the skipped run recorded its check');
            assert.deepStrictEqual(third.lastSnapshot, second.lastSnapshot);
            const cacheFolder = path.join(dir, '.magicspec', '.cache');
            assert.ok(
                fs.readdirSync(cacheFolder).filter((name) => name.startsWith('finalize')).length ===
                    1,
                'one finalize state file, however many runs',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('update-state leaves no lock file behind, and takes over one a killed process left', () => {
        const { dir } = writeCacheFixture();
        try {
            copyStateTemplate(dir);
            const cacheFolder = path.join(dir, '.magicspec', '.cache');
            const update = () =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                        'update-state',
                        '--decision',
                        'noted',
                    ],
                    { cwd: dir, encoding: 'utf8', env: routingEnv() },
                );
            const locks = () =>
                fs.existsSync(cacheFolder)
                    ? fs.readdirSync(cacheFolder).filter((name) => name.endsWith('.lock'))
                    : [];
            assert.strictEqual(update().status, 0);
            assert.deepStrictEqual(locks(), [], 'the lock is removed after use');

            // A process killed inside the critical section leaves its lock; its age says nobody holds it.
            const lock = path.join(cacheFolder, 'state-main.lock');
            fs.writeFileSync(lock, '99999 2020-01-01T00:00:00.000Z\n');
            const old = new Date(Date.now() - 120000);
            fs.utimesSync(lock, old, old);
            const taken = update();
            assert.strictEqual(taken.status, 0, taken.stderr);
            assert.deepStrictEqual(locks(), [], 'the stale lock was taken over and removed');
        } finally {
            cleanup(dir);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 33. clean-cache — the rebuildable caches removed; findings, notes, baselines and backups never touched
    // ═══════════════════════════════════════════════════════════════════════

    const runCleanCache = (dir, args = []) =>
        spawnSync(
            process.execPath,
            [
                path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                'clean-cache',
                ...args,
            ],
            { cwd: dir, encoding: 'utf8', env: routingEnv() },
        );

    // A project in which every cache exists, beside what must survive: recorded findings, a feedback
    // note, a graph baseline the person saved, and a migration backup in the project root.
    const writeCachedProject = () => {
        const { dir, specs } = writeCacheFixture();
        copyStateTemplate(dir);
        const design = path.join(dir, '.magicspec');
        assert.strictEqual(buildGraph(dir, ['--json', '--out']).status, 0);
        assert.strictEqual(buildGraph(dir, ['--html']).status, 0);
        const exportWiki = spawnSync(
            process.execPath,
            [path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'), 'export-wiki'],
            { cwd: dir, encoding: 'utf8', env: routingEnv() },
        );
        assert.strictEqual(exportWiki.status, 0);
        fs.mkdirSync(path.join(design, '.cache'), { recursive: true });
        fs.writeFileSync(
            path.join(design, '.cache', 'finalize-state.json'),
            '{"lastWorkflow":"magic.run"}',
        );
        fs.writeFileSync(path.join(design, '.cache', 'memory.json'), '{"entries":[]}');
        fs.writeFileSync(
            path.join(design, '.cache', 'memory.sqlite'),
            'not a database, only a cache',
        );
        fs.writeFileSync(path.join(design, '.cache', 'docs-state.json'), '{"workflows":{}}');
        fs.writeFileSync(path.join(design, '.cache', 'diagnostics.jsonl'), '{"code":"KEPT"}\n');
        fs.writeFileSync(
            path.join(design, '.cache', 'feedback-note.md'),
            'a note the person wrote\n',
        );
        fs.writeFileSync(path.join(design, 'graph', 'snapshot.json'), '{"baseline":true}');
        const backup = path.join(dir, 'magicspec-migration-backup-2026-01-02');
        fs.mkdirSync(backup);
        fs.writeFileSync(path.join(backup, 'old.txt'), 'the safety copy');
        return { dir, specs, design, backup };
    };

    // What the command must leave exactly as it was.
    const keptFiles = (design, backup) => [
        path.join(design, '.cache', 'diagnostics.jsonl'),
        path.join(design, '.cache', 'feedback-note.md'),
        path.join(design, 'graph', 'snapshot.json'),
        path.join(design, 'workspace.json'),
        path.join(backup, 'old.txt'),
    ];

    test('clean-cache --dry-run lists each rebuildable cache with its size, names the backups, and removes nothing', () => {
        const { dir, backup } = writeCachedProject();
        try {
            const before = treeDigest(dir);
            const listed = runCleanCache(dir, ['--dry-run']);
            assert.strictEqual(listed.status, 0, listed.stderr);
            assert.deepStrictEqual(treeDigest(dir), before, 'nothing was removed');
            assert.match(listed.stdout, /^Would remove \(dry run\):$/m);
            for (const [shown, kind] of [
                ['.magicspec/graph/.cache/', /3 files/],
                ['.magicspec/graph/query.json', /1 file,/],
                ['.magicspec/graph/graph.html', /1 file,/],
                ['.magicspec/graph/wiki/', /files/],
                ['.magicspec/.cache/finalize-state.json', /1 file,/],
                ['.magicspec/.cache/memory.json', /1 file,/],
                ['.magicspec/.cache/memory.sqlite', /1 file,/],
                ['.magicspec/.cache/docs-state.json', /1 file,/],
            ]) {
                const line = listed.stdout.split('\n').find((row) => row.trim().startsWith(shown));
                assert.ok(line, `${shown} is listed`);
                assert.match(line, kind);
                assert.match(line, /\d+(\.\d)? (B|KB|MB)\)/, 'with its size');
            }
            assert.ok(
                !/diagnostics|feedback|snapshot\.json/.test(listed.stdout.split('Kept:')[0]),
                'what is kept is not listed for removal',
            );
            const name = path.basename(backup);
            const row = listed.stdout.split('\n').find((line) => line.includes(`${name}/`));
            assert.ok(row, 'the backup is listed');
            assert.match(row, /\d+ days old/);
            assert.ok(
                row.includes(
                    process.platform === 'win32'
                        ? `Remove-Item -Recurse -Force "${name}"`
                        : `rm -r "${name}"`,
                ),
                'with the command that deletes it by hand',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('clean-cache removes exactly the rebuildable caches, asks nothing, and a second run finds nothing to remove', () => {
        const { dir, design, backup } = writeCachedProject();
        try {
            const kept = keptFiles(design, backup).map((file) => [file, fs.readFileSync(file)]);
            const removed = runCleanCache(dir);
            assert.strictEqual(removed.status, 0, removed.stderr);
            assert.match(removed.stdout, /^Removed:$/m);
            for (const gone of [
                ['graph', '.cache'],
                ['graph', 'query.json'],
                ['graph', 'graph.html'],
                ['graph', 'wiki'],
                ['.cache', 'finalize-state.json'],
                ['.cache', 'memory.json'],
                ['.cache', 'memory.sqlite'],
                ['.cache', 'docs-state.json'],
            ]) {
                assert.ok(
                    !fs.existsSync(path.join(design, ...gone)),
                    `${gone.join('/')} was removed`,
                );
            }
            for (const [file, bytes] of kept) {
                assert.ok(
                    bytes.equals(fs.readFileSync(file)),
                    `${path.relative(dir, file)} is byte for byte the same`,
                );
            }
            const again = runCleanCache(dir);
            assert.strictEqual(again.status, 0);
            assert.match(again.stdout, /^Nothing to remove: no rebuildable cache is present\.$/m);
            assert.doesNotMatch(again.stdout, /^Removed:/m);

            // What was removed comes back from the commands that own it: nothing was lost.
            assert.strictEqual(buildGraph(dir, ['--json', '--out']).status, 0);
            assert.ok(fs.existsSync(path.join(design, 'graph', 'query.json')));
        } finally {
            cleanup(dir);
        }
    });

    test('clean-cache never follows a link, and a project with no state folder gets one line and exit 0', () => {
        const { dir, design } = writeCachedProject();
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-outside-'));
        try {
            fs.writeFileSync(path.join(outside, 'precious.md'), 'not a cache');
            const wiki = path.join(design, 'graph', 'wiki');
            fs.rmSync(wiki, { recursive: true, force: true });
            fs.symlinkSync(outside, wiki, 'junction');
            const run = runCleanCache(dir);
            assert.strictEqual(run.status, 0, run.stderr);
            assert.match(run.stdout, /graph\/wiki {2}is a link: left alone/);
            assert.ok(
                fs.existsSync(path.join(outside, 'precious.md')),
                'the target of the link is untouched',
            );
        } finally {
            try {
                fs.rmSync(path.join(design, 'graph', 'wiki'), { recursive: false, force: true });
            } catch {
                /* the link goes with the folder */
            }
            cleanup(dir);
            cleanup(outside);
        }
        const bare = createTempWorkspace();
        try {
            const none = runCleanCache(bare);
            assert.strictEqual(none.status, 0, none.stderr);
            assert.strictEqual(
                none.stdout.trim(),
                'No .magicspec/ in this project: nothing to clean.',
            );
        } finally {
            cleanup(bare);
        }
    });

    test('the command table lists clean-cache, --help prints its usage, an unknown option is refused, and the documentation names it', () => {
        const dir = createTempWorkspace();
        try {
            const help = runCleanCache(dir, ['--help']);
            assert.strictEqual(help.status, 0);
            assert.match(help.stdout, /^clean-cache — /);
            assert.ok(help.stdout.includes('--dry-run'));
            assert.match(executorListing(dir), /^ {2}clean-cache /m);
            const refused = runCleanCache(dir, ['--everything']);
            assert.strictEqual(refused.status, 1);
            assert.match(refused.stderr, /Unknown option '--everything'/);
            const graphPage = fs.readFileSync(
                path.resolve(scriptsDir, '..', '..', '..', 'docs', 'graph.md'),
                'utf8',
            );
            assert.ok(
                graphPage.includes('executor.js clean-cache --dry-run'),
                'the graph page shows the dry run',
            );
            assert.ok(graphPage.includes('executor.js clean-cache '), 'and the command itself');
        } finally {
            cleanup(dir);
        }
    });

    test("the documentation sync keeps its state in the state folder's cache, reads the state the earlier location left, and retires it", () => {
        const dir = createTempWorkspace(true);
        try {
            fs.mkdirSync(path.join(dir, 'scripts', 'templates'), { recursive: true });
            fs.writeFileSync(
                path.join(dir, 'scripts', 'templates', 'contributing.md'),
                '# Contributing <!-- generated:version --><!-- /generated:version -->\n\n## Registry\n\n<!-- generated:workspaces -->\n<!-- /generated:workspaces -->\n',
            );
            fs.mkdirSync(path.join(dir, '.magicspec'));
            fs.writeFileSync(
                path.join(dir, '.magicspec', 'RULES.md'),
                '## 1. Concept\nRule 1\n## 7. Misc\n',
            );
            fs.writeFileSync(
                path.join(dir, '.magicspec', 'INDEX.md'),
                '## Workspaces\n| test | desc |\n## Meta\n',
            );
            fs.mkdirSync(path.join(dir, 'docs'));
            fs.mkdirSync(path.join(dir, 'skills', 'magicspec', 'workflows'), { recursive: true });
            const doc = path.join(dir, 'docs', 'test-wf.md');
            fs.writeFileSync(
                doc,
                '# Test Workflow\n\n**Triggers:** `old`\n\n**Slash command:** `/old`\n\n## Sync Note\n\nSynchronized with engine workflows on 2026-01-01 (v0.0.1).\n',
            );
            fs.writeFileSync(
                path.join(dir, 'skills', 'magicspec', 'workflows', 'test-wf.md'),
                '# Test Workflow\n\n**Triggers:** `new`',
            );
            const script = path.join(dir, 'scripts', 'sync-docs.js');
            const run = (env = {}) =>
                execFileSync(process.execPath, [script], {
                    cwd: dir,
                    stdio: 'pipe',
                    env: { ...process.env, ...env },
                });
            const stateFile = path.join(dir, '.magicspec', '.cache', 'docs-state.json');
            const legacyDir = path.join(dir, '.cache');
            const legacyFile = path.join(legacyDir, '.docs-state.json');

            run();
            assert.ok(fs.existsSync(stateFile), 'the state is written under the state folder');
            assert.ok(!fs.existsSync(legacyDir), 'and nothing is written at the project root');

            // The state the run wrote is read by the next: a Sync Note dated long ago is not stamped again.
            const aged = fs
                .readFileSync(doc, 'utf8')
                .replace(/on \d{4}-\d{2}-\d{2}/, 'on 2026-01-01');
            fs.writeFileSync(doc, aged);
            run();
            assert.strictEqual(fs.readFileSync(doc, 'utf8'), aged);

            // The earlier location: its state is read (the note stays as it was), the new file is written
            // and the old one removed — and the old folder with it only when nothing else is in it.
            fs.mkdirSync(legacyDir);
            fs.renameSync(stateFile, legacyFile);
            fs.writeFileSync(path.join(legacyDir, 'other.txt'), 'someone else');
            run();
            assert.strictEqual(fs.readFileSync(doc, 'utf8'), aged, 'the earlier state was honored');
            assert.ok(fs.existsSync(stateFile));
            assert.ok(!fs.existsSync(legacyFile));
            assert.ok(
                fs.existsSync(path.join(legacyDir, 'other.txt')),
                'a folder holding other files stays',
            );
            fs.rmSync(path.join(legacyDir, 'other.txt'));
            fs.renameSync(stateFile, legacyFile);
            run();
            assert.ok(!fs.existsSync(legacyDir), 'an empty earlier folder goes with its file');

            // A preview retires nothing.
            fs.mkdirSync(legacyDir);
            fs.renameSync(stateFile, legacyFile);
            run({ MAGIC_DRY_RUN: '1' });
            assert.ok(fs.existsSync(legacyFile), 'a dry run leaves the earlier state where it is');
        } finally {
            cleanup(dir);
        }
    });
};
