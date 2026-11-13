// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { TESTS_DIR, scriptsDir, createTempWorkspace, cleanup } = require('./lib/base');
const { trackingEntry, writeResumeFixture, runScript, makeRootFixture } = require('./lib/sim');

module.exports = () => {
    // ═══════════════════════════════════════════════════════════════════════
    // 24. PROJECT ROOT RESOLUTION — the engine acts on the project it is run in,
    //     from any subdirectory and through a linked engine folder (SP-2, SP-8)
    // ═══════════════════════════════════════════════════════════════════════

    // A script is reached two ways: through the executor, which resolves the
    // root and hands it on, and directly, where the script resolves it itself.
    // Each case runs both, so a script that falls back to its working directory
    // is caught even though the executor would have covered for it.
    const ROOT_MODES = ['executor', 'direct'];

    // Runs `body` once per root mode on a fresh fixture, removed afterwards.
    const forEachRootFixture = (body) => {
        for (const mode of ROOT_MODES) {
            const { tempDir, nested } = makeRootFixture();
            try {
                body({
                    mode,
                    tempDir,
                    nested,
                    run: (cwd, script, args) => runScript(mode, tempDir, cwd, script, args),
                });
            } finally {
                cleanup(tempDir);
            }
        }
    };

    // A command run from `a/b` must leave nothing of the project there.
    const assertNoStrayProject = (nested, what) => {
        for (const name of ['.magicspec', '.git', 'skills', 'CHANGELOG.md']) {
            assert.ok(
                !fs.existsSync(path.join(nested, name)),
                `${what} must not create ${name} in the directory it was run from`,
            );
        }
    };

    test('the project root comes from the working context in a fixed order: --root, MAGIC_ROOT, the nearest state folder, the nearest .git, the working directory (SP-2)', () => {
        const { resolveProjectRoot } = require(path.join(scriptsDir, 'utils.js'));
        const base = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-root-'));
        try {
            const dir = (...parts) => {
                const full = path.join(base, ...parts);
                fs.mkdirSync(full, { recursive: true });
                return full;
            };
            dir('proj', '.magicspec');
            const deep = dir('proj', 'a', 'b');
            const gitOnly = dir('gitonly', 'x');
            fs.mkdirSync(path.join(base, 'gitonly', '.git'));
            const bare = dir('bare', 'y');
            const other = dir('other');
            // A nearer state folder wins over a farther .git.
            fs.mkdirSync(path.join(base, 'mix', '.git'), { recursive: true });
            const mixInner = dir('mix', 'inner', 'z');
            fs.mkdirSync(path.join(base, 'mix', 'inner', '.magicspec'));

            const at = (cwd, extra = {}) => resolveProjectRoot({ cwd, env: {}, ...extra });
            assert.strictEqual(at(deep), path.join(base, 'proj'), 'nearest state folder');
            assert.strictEqual(at(gitOnly), path.join(base, 'gitonly'), 'nearest .git');
            assert.strictEqual(
                at(bare),
                bare,
                'the working directory when nothing marks a project',
            );
            assert.strictEqual(
                at(mixInner),
                path.join(base, 'mix', 'inner'),
                'state folder beats a farther .git',
            );
            assert.strictEqual(
                at(deep, { env: { MAGIC_ROOT: other } }),
                other,
                'MAGIC_ROOT beats the walk',
            );
            assert.strictEqual(
                at(deep, { root: gitOnly, env: { MAGIC_ROOT: other } }),
                gitOnly,
                '--root beats MAGIC_ROOT',
            );
            assert.strictEqual(
                at(path.join(base, 'proj'), { root: '../other' }),
                other,
                'a relative --root is read from the working directory',
            );
            assert.throws(
                () => at(deep, { root: path.join(base, 'missing') }),
                /\(from --root\) is not a directory/,
                'an explicit root that is not a directory stops with one message naming its source',
            );
        } finally {
            cleanup(base);
        }
    });

    test('resume-state, diagnostics, bloat, archival and finalize act on the project from a subdirectory (SP-2)', () => {
        forEachRootFixture(({ mode, tempDir, nested, run }) => {
            const where = (what) => `${mode}: ${what}`;

            const fromRoot = run(tempDir, 'resume-state', ['--workspace=engine']);
            const fromNested = run(nested, 'resume-state', ['--workspace=engine']);
            assert.strictEqual(fromRoot.status, 0);
            assert.ok(fromRoot.stdout.includes('T-1A01'), where('the task in flight is named'));
            assert.strictEqual(
                fromNested.stdout,
                fromRoot.stdout,
                where('resume-state from a subdirectory'),
            );

            const recorded = run(nested, 'record-diagnostic', [
                '--severity=warning',
                '--source=agent',
                '--code=ROOT_PROBE',
                '--message=probe',
            ]);
            assert.strictEqual(recorded.status, 0);
            const sink = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
            assert.ok(
                fs.existsSync(sink) && fs.readFileSync(sink, 'utf8').includes('ROOT_PROBE'),
                where('the finding lands in the project sink, not beside the caller'),
            );

            for (const [script, args] of [
                ['check-bloat', []],
                ['archive-phases', ['--dry-run']],
            ]) {
                const a = run(tempDir, script, args);
                const b = run(nested, script, args);
                assert.strictEqual(b.status, a.status, where(`${script}: same exit status`));
                assert.strictEqual(b.stdout, a.stdout, where(`${script}: same output`));
            }

            const fin = run(nested, 'finalize', [
                '--workflow=spec',
                '--workspace=engine',
                '--dry-run',
            ]);
            assert.strictEqual(fin.status, 0, where(`finalize: ${fin.stdout}${fin.stderr}`));
            assert.ok(
                !/not found/.test(fin.stdout + fin.stderr),
                where('finalize finds the state folder'),
            );
            assertNoStrayProject(nested, where('these commands'));
        });
    });

    test('the graph scripts read and write the project from a subdirectory: graph, wiki, coverage, communities and rationale (SP-2)', () => {
        forEachRootFixture(({ mode, tempDir, nested, run }) => {
            const graphOf = (cwd) => JSON.parse(run(cwd, 'build-spec-graph', ['--json']).stdout);
            assert.deepStrictEqual(
                graphOf(nested).nodes.map((n) => n.id),
                graphOf(tempDir).nodes.map((n) => n.id),
                `${mode}: build-spec-graph, same nodes from a subdirectory`,
            );
            assert.ok(graphOf(nested).nodes.some((n) => n.id === 'ws:engine'));

            for (const script of ['analyze-coverage', 'detect-communities', 'extract-rationale']) {
                const args =
                    script === 'extract-rationale' ? ['--json', '--scope', 'src'] : ['--json'];
                const a = run(tempDir, script, args);
                const b = run(nested, script, args);
                assert.strictEqual(a.status, 0, `${mode}: ${script} from the root: ${a.stderr}`);
                assert.strictEqual(b.status, a.status, `${mode}: ${script}: same exit status`);
                assert.deepStrictEqual(
                    JSON.parse(b.stdout),
                    JSON.parse(a.stdout),
                    `${mode}: ${script}: same result from a subdirectory`,
                );
                if (script === 'extract-rationale') {
                    assert.ok(
                        b.stdout.includes('probe.js'),
                        `${mode}: the rationale scan covers the project's sources, not the caller's directory`,
                    );
                }
            }

            const wiki = run(nested, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, '.magicspec', 'graph', 'wiki', 'index.md')),
                `${mode}: the wiki is written under the project`,
            );
            assertNoStrayProject(nested, `${mode}: the graph scripts`);
        });
    });

    test('installers, writers and rotators put their files in the project when run from a subdirectory: hooks, workspaces, state, context, changelog (SP-2)', () => {
        forEachRootFixture(({ mode, tempDir, nested }) => {
            const run = (script, args) => runScript(mode, tempDir, nested, script, args);

            const hook = run('install-hooks', []);
            assert.strictEqual(hook.status, 0, hook.stdout + hook.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, '.git', 'hooks', 'pre-commit')),
                `${mode}: the hook is installed in the repository root`,
            );

            const ws = run('create-workspace', ['--name=ws2']);
            assert.strictEqual(ws.status, 0, ws.stdout + ws.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, '.magicspec', 'ws2', 'specifications')),
                mode,
            );

            const state = run('update-state', [
                '--workspace=engine',
                '--next-action=Probe from a subdirectory',
            ]);
            assert.strictEqual(state.status, 0, state.stdout + state.stderr);
            assert.ok(
                fs
                    .readFileSync(path.join(tempDir, '.magicspec', 'engine', 'STATE.md'), 'utf8')
                    .includes('Probe from a subdirectory'),
                `${mode}: STATE.md of the project is updated`,
            );

            const ctx = run('generate-context', ['--workspace=engine']);
            assert.strictEqual(ctx.status, 0, ctx.stdout + ctx.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, '.magicspec', 'engine', 'CONTEXT.md')),
                mode,
            );

            fs.writeFileSync(
                path.join(tempDir, 'CHANGELOG.md'),
                '# Changelog\n\n## [Unreleased]\n\n### Changed\n\n- a change\n',
            );
            fs.writeFileSync(path.join(tempDir, '.magicspec', '.version'), '0.1.0\n');
            const rel = run('release-changelog', ['--date=2026-01-02']);
            assert.strictEqual(rel.status, 0, rel.stdout + rel.stderr);
            assert.ok(
                /## \[0\.1\.0\]/.test(fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8')),
                `${mode}: the changelog of the project is rotated`,
            );
            assertNoStrayProject(nested, `${mode}: these commands`);
        });
    });

    test('init in a fresh repository creates the state tree at the repository root, and the pre-flight reads the project from a subdirectory (SP-2)', () => {
        for (const mode of ROOT_MODES) {
            const fresh = createTempWorkspace(true);
            try {
                const nested = path.join(fresh, 'src', 'deep');
                fs.mkdirSync(nested, { recursive: true });
                const init = runScript(mode, fresh, nested, 'init', [], { designDir: null });
                assert.strictEqual(init.status, 0, init.stdout + init.stderr);
                assert.ok(
                    fs.existsSync(path.join(fresh, '.magicspec', 'main', 'specifications')),
                    `${mode}: init creates the state tree at the repository root`,
                );
                assertNoStrayProject(nested, `${mode}: init`);
            } finally {
                cleanup(fresh);
            }

            const { tempDir, nested } = makeRootFixture();
            try {
                const flightOf = (cwd) =>
                    JSON.parse(
                        runScript(mode, tempDir, cwd, 'check-prerequisites', [
                            '--json',
                            '--workspace=engine',
                        ]).stdout,
                    );
                const fromRoot = flightOf(tempDir);
                assert.strictEqual(fromRoot.design_dir, '.magicspec/engine');
                assert.strictEqual(
                    fromRoot.artifacts['INDEX.md'].exists,
                    true,
                    `${mode}: the registry of the project is found`,
                );
                assert.deepStrictEqual(
                    flightOf(nested),
                    fromRoot,
                    `${mode}: same report from a subdirectory`,
                );
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('an engine folder reached through a link still acts on the project it is run in, not on the folder the link leads to (SP-2)', () => {
        const engineHost = createTempWorkspace();
        const project = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-linked-'));
        try {
            // The project holds a link where the engine folder would be; Node resolves
            // the link, so a script's own directory lies in the other tree.
            fs.mkdirSync(path.join(project, 'skills'), { recursive: true });
            fs.symlinkSync(
                path.join(engineHost, 'skills', 'magicspec'),
                path.join(project, 'skills', 'magicspec'),
                'junction',
            );
            const wsDir = writeResumeFixture(project, {
                engine: { entries: [trackingEntry('T-1A01', 'Linked probe', 'In Progress')] },
            });
            fs.mkdirSync(path.join(wsDir, 'engine', 'specifications'), { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'engine', 'specifications', 'big.md'),
                `# Big\n${'line\n'.repeat(600)}`,
            );
            fs.writeFileSync(
                path.join(wsDir, 'engine', 'tasks', 'phase-2.md'),
                '---\nphase: 2\nstatus: Done\n---\n\n## Atomic Checklist\n\n- [x] [T-2A01] Done thing\n',
            );
            const nested = path.join(project, 'a');
            fs.mkdirSync(nested);

            for (const cwd of [project, nested]) {
                const at = path.relative(project, cwd) || 'the root';
                const run = (script, args) => runScript('executor', project, cwd, script, args);

                const resume = run('resume-state', ['--workspace=engine']);
                assert.ok(
                    resume.stdout.includes('T-1A01'),
                    `through a link, from ${at}: resume-state names the task`,
                );

                const fin = run('finalize', ['--workflow=spec', '--workspace=engine', '--dry-run']);
                assert.strictEqual(
                    fin.status,
                    0,
                    `finalize from ${at}: ${fin.stdout}${fin.stderr}`,
                );
                assert.ok(
                    !/not found/.test(fin.stdout + fin.stderr),
                    `finalize from ${at} finds the project`,
                );

                const archive = run('archive-phases', ['--dry-run']);
                assert.ok(
                    archive.stdout.includes('phase-2.md'),
                    `archive-phases from ${at} sees the project's workbook`,
                );

                const bloat = run('check-bloat', []);
                assert.ok(
                    bloat.stdout.includes('big.md'),
                    `check-bloat from ${at} scans the project's specifications`,
                );

                run('record-diagnostic', [
                    '--severity=warning',
                    '--source=agent',
                    '--code=LINKED_PROBE',
                    '--message=probe',
                ]);
                const sink = path.join(project, '.magicspec', '.cache', 'diagnostics.jsonl');
                assert.ok(
                    fs.existsSync(sink) && fs.readFileSync(sink, 'utf8').includes('LINKED_PROBE'),
                    `through a link, from ${at}: the finding lands in the project sink`,
                );
            }
            assert.ok(
                !fs.existsSync(path.join(engineHost, '.magicspec')),
                'nothing is written into the tree the link leads to',
            );
        } finally {
            try {
                fs.rmdirSync(path.join(project, 'skills', 'magicspec'));
            } catch {
                /* not a link, or already gone */
            }
            cleanup(project);
            cleanup(engineHost);
        }
    });

    test('through the executor, --root names the project and a path typed on the command line is relative to the project (SP-2)', () => {
        const { tempDir, nested } = makeRootFixture();
        const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-elsewhere-'));
        try {
            const named = runScript('executor', tempDir, elsewhere, 'resume-state', [
                '--workspace=engine',
                `--root=${tempDir}`,
            ]);
            assert.strictEqual(named.status, 0, named.stdout + named.stderr);
            assert.ok(named.stdout.includes('T-1A01'), '--root points the command at the project');

            const missing = runScript('executor', tempDir, elsewhere, 'resume-state', [
                `--root=${path.join(elsewhere, 'missing')}`,
            ]);
            assert.strictEqual(
                missing.status,
                1,
                'a --root that is not a directory stops the command',
            );
            assert.match(missing.stderr, /HALT: .*\(from --root\) is not a directory/);

            const wiki = runScript('executor', tempDir, nested, 'export-wiki', [
                '--out',
                'out-wiki',
            ]);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, 'out-wiki', 'index.md')),
                'a relative --out is relative to the project, not to the directory the caller stands in',
            );
            assert.ok(!fs.existsSync(path.join(nested, 'out-wiki')));
        } finally {
            cleanup(tempDir);
            cleanup(elsewhere);
        }
    });

    // Blanks the comments of a JavaScript source, keeping string and template
    // literals intact, so a scan can tell a path the code builds from a path a
    // comment mentions. Quotes are tracked per line: a regular-expression literal
    // holding a quote character must not swallow the lines after it.
    const withoutComments = (source) => {
        let inBlock = false;
        return source
            .split('\n')
            .map((line) => {
                let out = '';
                let quote = null;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    const next = line[i + 1];
                    if (inBlock) {
                        if (ch === '*' && next === '/') {
                            inBlock = false;
                            i++;
                        }
                    } else if (quote) {
                        out += ch;
                        if (ch === '\\') {
                            out += next ?? '';
                            i++;
                        } else if (ch === quote) {
                            quote = null;
                        }
                    } else if (ch === '/' && next === '/') {
                        break;
                    } else if (ch === '/' && next === '*') {
                        inBlock = true;
                        i++;
                    } else {
                        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
                        out += ch;
                    }
                }
                return out;
            })
            .join('\n');
    };

    test('no engine script spells the state folder: every path to it is built from the one definition (SP-8)', () => {
        const walk = (dir) =>
            fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) return walk(full);
                return entry.name.endsWith('.js') ? [full] : [];
            });

        const offenders = [];
        for (const file of walk(scriptsDir)) {
            // The definition itself is the one place the name is written.
            if (path.relative(scriptsDir, file) === 'utils.js') continue;
            const code = withoutComments(fs.readFileSync(file, 'utf8'));
            code.split('\n').forEach((line, index) => {
                if (/\.magicspec(?![A-Za-z-])/.test(line)) {
                    offenders.push(
                        `${path.relative(scriptsDir, file)}:${index + 1}: ${line.trim()}`,
                    );
                }
            });
        }
        assert.deepStrictEqual(
            offenders,
            [],
            'build state paths from STATE_DIR_NAME or statePath(), never from the literal name',
        );

        // The scan must see a literal where one is: a comment is blanked, a string is not.
        const probe =
            "const a = '.magicspec/x'; // .magicspec here\n/* .magicspec */ const b = `.magicspec`;";
        assert.deepStrictEqual(
            withoutComments(probe)
                .split('\n')
                .map((l) => /\.magicspec(?![A-Za-z-])/.test(l)),
            [true, true],
            'strings are kept, comments are blanked',
        );
        assert.ok(!/\.magicspec/.test(withoutComments('// .magicspec\n/* .magicspec */')));
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 25. GRAPH FOLDER — everything the graph derives lives under one folder of
    //     the state folder, its paths defined once (graph folder)
    // ═══════════════════════════════════════════════════════════════════════

    const LEGACY_GRAPH_NAMES = [
        '.graph-cache',
        'wiki',
        'spec-graph.html',
        'graph-snapshot.json',
        'graph-before.json',
    ];

    // Lays down the five artifacts as an installation before the graph folder left them.
    const writeLegacyGraph = (tempDir) => {
        const design = path.join(tempDir, '.magicspec');
        fs.mkdirSync(path.join(design, 'wiki'), { recursive: true });
        fs.writeFileSync(path.join(design, 'wiki', 'old.md'), 'stale\n');
        fs.mkdirSync(path.join(design, '.graph-cache'), { recursive: true });
        fs.writeFileSync(path.join(design, '.graph-cache', 'x.json'), '{}');
        fs.writeFileSync(path.join(design, 'spec-graph.html'), '<html>old</html>');
        fs.writeFileSync(path.join(design, 'graph-snapshot.json'), '{"which":"legacy-snapshot"}');
        fs.writeFileSync(path.join(design, 'graph-before.json'), '{"which":"legacy-before"}');
        return design;
    };

    test('the graph folder holds the cache, the wiki, the page and the snapshots, and the paths are defined once (graph folder)', () => {
        const { graphPaths } = require(path.join(scriptsDir, 'utils.js'));
        const design = path.join(path.sep, 'p', '.magicspec');
        const p = graphPaths(design);
        assert.strictEqual(p.dir, path.join(design, 'graph'));
        assert.strictEqual(p.cache, path.join(design, 'graph', '.cache'));
        assert.strictEqual(p.wiki, path.join(design, 'graph', 'wiki'));
        assert.strictEqual(p.html, path.join(design, 'graph', 'graph.html'));
        assert.strictEqual(p.snapshot, path.join(design, 'graph', 'snapshot.json'));
        assert.strictEqual(p.before, path.join(design, 'graph', 'before.json'));
        assert.deepStrictEqual(
            p.legacy.map((x) => path.basename(x)).sort(),
            [...LEGACY_GRAPH_NAMES].sort(),
            'the earlier locations are exactly the five names',
        );

        const { tempDir } = makeRootFixture();
        try {
            const specs = path.join(tempDir, '.magicspec', 'engine', 'specifications');
            fs.mkdirSync(specs, { recursive: true });
            fs.writeFileSync(
                path.join(specs, 'l1-probe.md'),
                '# Probe\n\n**Version:** 1.0.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nA probe.\n',
            );
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            const page = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(page.status, 0, page.stdout + page.stderr);

            const design2 = path.join(tempDir, '.magicspec');
            assert.ok(fs.existsSync(path.join(design2, 'graph', 'wiki', 'index.md')), 'wiki index');
            assert.ok(fs.existsSync(path.join(design2, 'graph', 'graph.html')), 'page');
            assert.ok(
                fs.readdirSync(path.join(design2, 'graph', '.cache')).length > 0,
                'the extraction cache is populated',
            );
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(
                    !fs.existsSync(path.join(design2, name)),
                    `nothing is written at ${name}`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('an installation on the earlier paths ends with only the graph folder: derived files are removed, the baseline snapshots are moved, one line says so (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.match(
                wiki.stdout,
                /^Retired legacy graph artifacts: .*\.graph-cache.*wiki.*$/m,
                'one informational line names what was retired',
            );
            assert.strictEqual(
                wiki.stdout.split('\n').filter((l) => l.startsWith('Retired legacy')).length,
                1,
            );
            for (const name of [
                '.graph-cache',
                'wiki',
                'graph-snapshot.json',
                'graph-before.json',
            ]) {
                assert.ok(
                    !fs.existsSync(path.join(design, name)),
                    `${name} is gone from the old place`,
                );
            }
            assert.ok(fs.existsSync(path.join(design, 'graph', 'wiki', 'index.md')));
            assert.ok(
                !fs.existsSync(path.join(design, 'graph', 'wiki', 'old.md')),
                'the old wiki is not carried over',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'before.json'), 'utf8'),
                '{"which":"legacy-before"}',
                'the baseline is moved, not lost',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'snapshot.json'), 'utf8'),
                '{"which":"legacy-snapshot"}',
            );
            assert.ok(
                fs.existsSync(path.join(design, 'spec-graph.html')),
                'the page waits for its own writer',
            );

            const page = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(page.status, 0, page.stdout + page.stderr);
            assert.ok(
                !fs.existsSync(path.join(design, 'spec-graph.html')),
                'the old page is retired by the new one',
            );
            assert.ok(fs.existsSync(path.join(design, 'graph', 'graph.html')));
        } finally {
            cleanup(tempDir);
        }
    });

    test('build-spec-graph --json --out writes the graph to a file and prints one line, while plain --json still prints the whole graph (graph output)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const whole = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--json']);
            assert.strictEqual(whole.status, 0, whole.stdout + whole.stderr);
            const graph = JSON.parse(whole.stdout);

            const out = runScript('executor', tempDir, tempDir, 'build-spec-graph', [
                '--json',
                '--out',
            ]);
            assert.strictEqual(out.status, 0, out.stdout + out.stderr);
            assert.strictEqual(out.stdout.trim().split('\n').length, 1, 'one summary line only');
            assert.match(out.stdout, /graph[\\/]query\.json/);
            assert.deepStrictEqual(
                JSON.parse(
                    fs.readFileSync(
                        path.join(tempDir, '.magicspec', 'graph', 'query.json'),
                        'utf8',
                    ),
                ),
                graph,
                'the file holds the same graph that plain --json prints',
            );

            const named = runScript('executor', tempDir, tempDir, 'build-spec-graph', [
                '--json',
                '--out',
                'named.json',
            ]);
            assert.strictEqual(named.status, 0, named.stdout + named.stderr);
            assert.ok(fs.existsSync(path.join(tempDir, 'named.json')), 'a typed path is honored');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a baseline already in the graph folder is kept: the earlier file is removed, never moved over it (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);
            fs.mkdirSync(path.join(design, 'graph'), { recursive: true });
            fs.writeFileSync(path.join(design, 'graph', 'before.json'), '{"which":"current"}');
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'before.json'), 'utf8'),
                '{"which":"current"}',
            );
            assert.ok(!fs.existsSync(path.join(design, 'graph-before.json')));
        } finally {
            cleanup(tempDir);
        }
    });

    test('the earlier files stay when the new write fails, and when the wiki goes to a path the user chose (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);

            // A custom --out is not the graph folder: nothing is retired.
            const custom = runScript('executor', tempDir, tempDir, 'export-wiki', [
                '--out',
                'my-wiki',
            ]);
            assert.strictEqual(custom.status, 0, custom.stdout + custom.stderr);
            assert.ok(fs.existsSync(path.join(tempDir, 'my-wiki', 'index.md')));
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(
                    fs.existsSync(path.join(design, name)),
                    `${name} stays after a custom --out`,
                );
            }

            // A graph folder that cannot be created: the run fails before it retires anything.
            fs.writeFileSync(path.join(design, 'graph'), 'a file where the folder should be');
            const failed = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.notStrictEqual(failed.status, 0, 'the export fails');
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(
                    fs.existsSync(path.join(design, name)),
                    `${name} stays after a failed write`,
                );
            }
            assert.ok(!/Retired legacy/.test(failed.stdout));
        } finally {
            cleanup(tempDir);
        }
    });

    test('no engine script defines a graph path outside utils.js, and no shipped text names the earlier ones (graph folder)', () => {
        const walk = (dir, ext) =>
            fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) return walk(full, ext);
                return entry.name.endsWith(ext) ? [full] : [];
            });

        const codeOffenders = [];
        for (const file of walk(scriptsDir, '.js')) {
            if (path.relative(scriptsDir, file) === 'utils.js') continue;
            withoutComments(fs.readFileSync(file, 'utf8'))
                .split('\n')
                .forEach((line, index) => {
                    if (
                        /path\.join\([^)]*['"`](wiki|\.graph-cache)['"`]|spec-graph\.html|graph-before\.json|graph-snapshot\.json/.test(
                            line,
                        )
                    ) {
                        codeOffenders.push(
                            `${path.relative(scriptsDir, file)}:${index + 1}: ${line.trim()}`,
                        );
                    }
                });
        }
        assert.deepStrictEqual(codeOffenders, [], 'build graph paths from graphPaths()');

        const repo = path.resolve(TESTS_DIR, '..');
        const shipped = [
            ...walk(path.join(repo, 'skills', 'magicspec'), '.md').map((f) =>
                path.relative(repo, f),
            ),
            ...fs
                .readdirSync(path.join(repo, 'docs'))
                .filter((f) => f.endsWith('.md'))
                .map((f) => path.join('docs', f)),
            'README.md',
        ];
        const textOffenders = [];
        for (const rel of shipped) {
            fs.readFileSync(path.join(repo, rel), 'utf8')
                .split('\n')
                .forEach((line, index) => {
                    if (
                        /\.magicspec\/wiki|spec-graph\.html|graph-before\.json|graph-snapshot\.json|\.graph-cache|\/\.magicspec\/\*graph\*/.test(
                            line,
                        )
                    ) {
                        // The README may say which earlier entries a project can keep.
                        if (rel === 'README.md' && /earlier graph paths/.test(line)) return;
                        textOffenders.push(`${rel}:${index + 1}`);
                    }
                });
        }
        assert.deepStrictEqual(
            textOffenders,
            [],
            'shipped text names the graph folder, not the earlier places',
        );
    });
};
