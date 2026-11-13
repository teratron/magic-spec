'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { TESTS_DIR, scriptsDir, createTempWorkspace, cleanup } = require('./lib/base');
const {
    SIM_SCRIPTS,
    SIM_ENGINE_REL,
    simEnv,
    makeSimConsumer,
    simExec,
    treeHashes,
    simPutter,
    sameTree,
} = require('./lib/sim');

module.exports = () => {
    test('the command table names every runnable script and exactly the options each one reads', () => {
        const { COMMANDS } = require(path.join(SIM_SCRIPTS, 'lib', 'commands.js'));
        const libraries = new Set(['executor', 'utils', 'graph-cache']);
        const scripts = fs
            .readdirSync(SIM_SCRIPTS)
            .filter((f) => f.endsWith('.js'))
            .map((f) => f.slice(0, -3))
            .filter((n) => !libraries.has(n))
            .sort();
        assert.deepStrictEqual(
            Object.keys(COMMANDS).sort(),
            scripts,
            'one table entry per runnable script',
        );

        // Option-shaped literals a script holds for another program, or that the executor consumes for it.
        const allowed = {
            '*': ['--workspace', '--root', '--help'],
            migrate: ['--json'],
            'export-wiki': ['--json'],
            'serve-spec-graph': ['--json'],
            'install-hooks': ['--get'],
            'update-engine-meta': ['--dir'],
        };
        for (const [name, entry] of Object.entries(COMMANDS)) {
            const source = fs.readFileSync(path.join(SIM_SCRIPTS, `${name}.js`), 'utf8');
            assert.ok(
                source.includes(`guardArgv('${name}', module)`),
                `${name}.js calls the guard as its first act`,
            );
            const declared = Object.keys(entry.options || {});
            for (const flag of declared) {
                if (flag === '--workspace' || entry.options[flag].ignored) continue;
                assert.match(
                    source,
                    new RegExp(`['"\`]${flag}[='"\`]`),
                    `${name}: '${flag}' is in the table but the script does not read it`,
                );
            }
            // Option-shaped words in comments are prose, not reads.
            const code = source
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
            const literals = new Set(
                [...code.matchAll(/['"`](--[a-z][a-z0-9-]*)(?=[='"`])/g)].map((m) => m[1]),
            );
            for (const flag of literals) {
                assert.ok(
                    declared.includes(flag) ||
                        allowed['*'].includes(flag) ||
                        (allowed[name] || []).includes(flag),
                    `${name}: the script reads '${flag}' but the table does not list it`,
                );
            }
        }
    });

    test('--help on every command prints its help and writes nothing; an unknown option, command or library name is refused first', () => {
        const dir = makeSimConsumer();
        try {
            const { COMMANDS } = require(path.join(SIM_SCRIPTS, 'lib', 'commands.js'));
            const before = treeHashes(dir);
            for (const [name, entry] of Object.entries(COMMANDS)) {
                if (!entry.ownHelp) {
                    const help = simExec(dir, [name, '--help']);
                    assert.strictEqual(help.status, 0, `${name} --help: ${help.stderr}`);
                    assert.match(
                        help.stdout,
                        new RegExp(`^${name} — `),
                        `${name}: help names the command`,
                    );
                    assert.match(help.stdout, /Usage: /, `${name}: help shows the usage`);
                }
                const bad = simExec(dir, [name, '--no-such-option']);
                assert.notStrictEqual(bad.status, 0, `${name} --no-such-option must fail`);
                assert.match(bad.stderr, /Unknown option '--no-such-option'/, name);
            }
            for (const unknown of ['nosuchcommand', 'utils', 'graph-cache']) {
                const result = simExec(dir, [unknown]);
                assert.strictEqual(result.status, 1, unknown);
                assert.match(result.stderr, new RegExp(`Unknown command '${unknown}'`), unknown);
                assert.doesNotMatch(result.stdout + result.stderr, /powershell|\.ps1/i, unknown);
            }
            assert.strictEqual(simExec(dir, ['--help']).status, 0, 'the command list');
            assert.ok(sameTree(before, treeHashes(dir)), 'help and refusals wrote nothing');
        } finally {
            cleanup(dir);
        }
    });

    test('remove deletes only on a clean request: help, a short flag, a malformed dry run and a stray argument leave the project as it was', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init', '--host=claude']).status, 0);
            const before = treeHashes(dir);
            for (const probe of [['--help'], ['-n'], ['--dry-run=true'], ['--bogus'], ['extra']]) {
                const result = simExec(dir, ['remove', ...probe]);
                assert.ok(
                    sameTree(before, treeHashes(dir)),
                    `remove ${probe.join(' ')} changed the project`,
                );
                if (probe[0] !== '--help') assert.notStrictEqual(result.status, 0, probe.join(' '));
            }
            // started by hand, the script answers the same way
            const direct = spawnSync(
                process.execPath,
                [path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts', 'remove.js'), '-n'],
                { cwd: dir, encoding: 'utf8', env: simEnv() },
            );
            assert.notStrictEqual(direct.status, 0);
            assert.ok(sameTree(before, treeHashes(dir)), 'a direct run changed the project');
        } finally {
            cleanup(dir);
        }
    });

    test('a registered workspace whose folder is missing: reading commands neither create it nor put a note on stdout; a writing command creates it and says so on stderr', () => {
        const dir = makeSimConsumer();
        try {
            fs.mkdirSync(path.join(dir, '.magicspec'), { recursive: true });
            fs.writeFileSync(
                path.join(dir, '.magicspec', 'workspace.json'),
                JSON.stringify({ default: 'ghost', workspaces: { ghost: { description: 'x' } } }),
            );
            fs.writeFileSync(path.join(dir, '.magicspec', 'INDEX.md'), '# Index\n');
            const ghost = path.join(dir, '.magicspec', 'ghost');

            const pre = simExec(dir, ['check-prerequisites', '--json']);
            assert.doesNotThrow(
                () => JSON.parse(pre.stdout),
                `stdout is one JSON document: ${pre.stdout.slice(0, 120)}`,
            );
            assert.strictEqual(simExec(dir, ['resume-state', '--workspace=ghost']).status, 0);
            assert.ok(!fs.existsSync(ghost), 'reading commands do not create the workspace folder');

            const ctx = simExec(dir, ['generate-context']);
            assert.strictEqual(ctx.status, 0, ctx.stderr);
            assert.ok(
                fs.existsSync(path.join(ghost, 'specifications')),
                'a writing command provisions the folder',
            );
            assert.match(
                ctx.stderr,
                /Provisioned missing workspace directory/,
                'the note is on stderr',
            );
            assert.doesNotMatch(ctx.stdout, /Provisioned/, 'and not on stdout');
        } finally {
            cleanup(dir);
        }
    });

    // The Path Matching Contract: one meaning for a scope entry and a reference path.
    const makeScopeProject = (scope, ref) => {
        const dir = makeSimConsumer();
        const put = simPutter(dir);
        put(
            '.magicspec/workspace.json',
            JSON.stringify({ default: 'ws', workspaces: { ws: { description: 'x', scope } } }),
        );
        put('.magicspec/INDEX.md', '# Index\n');
        put('.magicspec/ws/INDEX.md', '# Ws\n');
        put(
            '.magicspec/ws/specifications/alpha.md',
            `# Alpha\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## Canonical References\n\n| Path | Role |\n| --- | --- |\n| \`${ref}\` | code |\n`,
        );
        put('src/app.js', '// WHY: a cache avoids a slow call\nmodule.exports = 1;\n');
        put('src/lib/util.js', '// HACK: temporary\nmodule.exports = 2;\n');
        put('other/x.js', 'module.exports = 3;\n');
        return dir;
    };
    const coverageOf = (dir) => JSON.parse(simExec(dir, ['analyze-coverage', '--json']).stdout);

    test('a scope entry means the same in every spelling: src, src/, ./src, src/* and src/** all select the src files', () => {
        for (const scope of ['src', 'src/', './src', 'src/*', 'src/**']) {
            const dir = makeScopeProject([scope], 'src/app.js');
            try {
                const report = coverageOf(dir);
                const scanned = report.coverage
                    .map((c) => c.file)
                    .filter((f) => f.startsWith('src/'));
                assert.deepStrictEqual(
                    scanned.sort(),
                    ['src/app.js', 'src/lib/util.js'],
                    `scope '${scope}'`,
                );
                assert.ok(
                    !report.coverage.some((c) => c.file.startsWith('other/')),
                    `scope '${scope}' excludes other/`,
                );
                assert.deepStrictEqual(report.warnings, [], `scope '${scope}' matches`);
            } finally {
                cleanup(dir);
            }
        }
    });

    test('a pattern reference covers what it matches, and a scope entry or pattern that matches nothing is reported, never read as clean', () => {
        const pattern = makeScopeProject(['src'], 'src/**/*.js');
        const nothing = makeScopeProject(['src', 'does-not-exist'], 'nothing/here/*.js');
        try {
            const covered = coverageOf(pattern);
            const extracted = covered.coverage.filter(
                (c) => c.file.startsWith('src/') && c.confidence === 'EXTRACTED',
            );
            assert.strictEqual(extracted.length, 2, 'both src files are covered by the pattern');
            assert.deepStrictEqual(covered.shadow_specs, [], 'a matching pattern is not an orphan');

            const empty = coverageOf(nothing);
            const types = empty.warnings.map((w) => w.type).sort();
            assert.deepStrictEqual(types, ['REF_NO_MATCH', 'SCOPE_NO_MATCH']);
            assert.strictEqual(
                empty.shadow_specs.length,
                1,
                'the pattern that matches nothing is an orphaned reference',
            );

            const rationale = JSON.parse(simExec(nothing, ['extract-rationale', '--json']).stdout);
            assert.ok(
                rationale.warnings.some((w) => w.type === 'SCOPE_NO_MATCH'),
                'extract-rationale reports it too',
            );
            const globbed = makeScopeProject(['src/**'], 'src/app.js');
            try {
                const found = JSON.parse(simExec(globbed, ['extract-rationale', '--json']).stdout);
                assert.strictEqual(found.rationale.length, 2, 'a glob scope reaches the markers');
            } finally {
                cleanup(globbed);
            }
        } finally {
            cleanup(pattern);
            cleanup(nothing);
        }
    });

    test('generate-context keeps the top-level folders a scope selects, whatever its spelling', () => {
        const dir = makeScopeProject(['src/**'], 'src/app.js');
        try {
            assert.strictEqual(simExec(dir, ['generate-context']).status, 0);
            const context = fs.readFileSync(
                path.join(dir, '.magicspec', 'ws', 'CONTEXT.md'),
                'utf8',
            );
            assert.match(context, /src\//);
            assert.doesNotMatch(context, /other\//);
        } finally {
            cleanup(dir);
        }
    });

    test('the build-output names of the floor apply at the project root only: nested source folders are scanned, nested dependency folders are not', () => {
        const dir = makeScopeProject([], 'src/');
        try {
            const put = (rel) => simPutter(dir)(rel, 'module.exports = 1;\n');
            for (const rel of [
                'src/build/real.js',
                'src/env/real.js',
                'build/output.js',
                'node_modules/dep/a.js',
                'src/node_modules/dep/b.js',
            ])
                put(rel);
            const files = coverageOf(dir).coverage.map((c) => c.file);
            for (const kept of ['src/build/real.js', 'src/env/real.js'])
                assert.ok(files.includes(kept), `${kept} is source`);
            for (const skipped of [
                'build/output.js',
                'node_modules/dep/a.js',
                'src/node_modules/dep/b.js',
            ]) {
                assert.ok(!files.includes(skipped), `${skipped} is not source`);
            }
        } finally {
            cleanup(dir);
        }
    });

    test('a line-endings-only difference from the manifest is not integrity drift; a content change still is, whatever its line endings', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const engine = path.join(dir, ...SIM_ENGINE_REL.split('/'));
            // a checkout that converts line endings does this to every text file
            for (const rel of ['workflows/spec.md', 'workflows/task.md', 'CONSTITUTION.md']) {
                const file = path.join(engine, rel);
                fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r?\n/g, '\r\n'));
            }
            const pre = JSON.parse(simExec(dir, ['check-prerequisites', '--json']).stdout);
            const types = pre.warnings.map((w) => w.type);
            assert.ok(
                !types.includes('ENGINE_INTEGRITY'),
                `no drift reported: ${JSON.stringify(pre.warnings)}`,
            );
            assert.ok(types.includes('ENGINE_LINE_ENDINGS'), 'one advisory finding names it');
            assert.strictEqual(pre.ok, true);
            const check = simExec(dir, ['update-engine-meta', '--check']);
            assert.strictEqual(check.status, 0, check.stdout + check.stderr);
            assert.match(check.stdout, /only in line endings/);

            fs.appendFileSync(path.join(engine, 'workflows', 'spec.md'), '\r\nlocal tweak\r\n');
            const drift = JSON.parse(simExec(dir, ['check-prerequisites', '--json']).stdout);
            assert.ok(
                drift.warnings.some(
                    (w) => w.type === 'ENGINE_INTEGRITY' && /workflows\/spec\.md/.test(w.message),
                ),
            );
            assert.notStrictEqual(simExec(dir, ['update-engine-meta', '--check']).status, 0);
        } finally {
            cleanup(dir);
        }
    });

    test('pre-flight in human mode says so when nothing is wrong', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const result = simExec(dir, ['check-prerequisites']);
            assert.strictEqual(result.status, 0, result.stderr);
            assert.match(result.stdout, /^Pre-flight: ok — /);
        } finally {
            cleanup(dir);
        }
    });

    test('init prints the .gitignore lines for the hosts it set up and the .gitattributes line for vendoring, and records why a hook was not installed', () => {
        const dir = makeSimConsumer();
        try {
            fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
            fs.writeFileSync(
                path.join(dir, '.git', 'hooks', 'pre-commit'),
                '#!/bin/sh\necho mine\n',
                { mode: 0o755 },
            );
            const result = simExec(dir, ['init', '--host=claude']);
            assert.strictEqual(result.status, 0, result.stderr);
            for (const line of [
                `/${SIM_ENGINE_REL}/`,
                '/.claude/skills/magicspec/',
                '/.claude/rules/magicspec.md',
                '/.magicspec/graph/',
                '/.magicspec/*cache*/',
            ]) {
                assert.ok(
                    result.stdout.includes(`   ${line}\n`),
                    `the .gitignore block lists ${line}`,
                );
            }
            assert.ok(!result.stdout.includes('commands'), 'no command folder is named');
            assert.ok(result.stdout.includes(`/${SIM_ENGINE_REL}/** -text`), 'the vendoring line');
            const sink = fs.readFileSync(
                path.join(dir, '.magicspec', '.cache', 'diagnostics.jsonl'),
                'utf8',
            );
            assert.match(
                sink,
                /GIT_HOOKS_NOT_INSTALLED[^\n]*pre-commit hook that this installer did not write/,
                "the installer's own reason is recorded",
            );
        } finally {
            cleanup(dir);
        }
    });

    test('release-changelog refuses a malformed date or version before it rotates anything', () => {
        const dir = makeSimConsumer();
        try {
            const original = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Something.\n';
            fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), original);
            for (const args of [
                ['--version=9.9.9', '--date=not-a-date'],
                ['--version=9.9.9', '--date=2026-13-45'],
                ['--version=oops'],
            ]) {
                const result = simExec(dir, ['release-changelog', ...args]);
                assert.notStrictEqual(result.status, 0, args.join(' '));
                assert.strictEqual(
                    fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8'),
                    original,
                    `${args.join(' ')} rotated`,
                );
            }
            assert.strictEqual(
                simExec(dir, ['release-changelog', '--version=9.9.9', '--date=2026-10-29']).status,
                0,
            );
            assert.match(
                fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8'),
                /## \[9\.9\.9\] - 2026-10-29/,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('finalize names the accepted workflows as the rule writes them', () => {
        const dir = makeSimConsumer();
        try {
            const result = simExec(dir, ['finalize', '--workflow=bogus']);
            assert.notStrictEqual(result.status, 0);
            assert.match(result.stderr, /Expected one of: spec, plan, task, run, rule/);
        } finally {
            cleanup(dir);
        }
    });

    test('the graph server names a missing tool argument instead of searching for "undefined"', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const requests = [
                {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        clientInfo: { name: 'test', version: '0' },
                    },
                },
                {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: { name: 'get_neighbors', arguments: {} },
                },
                {
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'tools/call',
                    params: { name: 'shortest_path', arguments: { from: 'a' } },
                },
            ].map((r) => JSON.stringify(r));
            const result = simExec(dir, ['serve-spec-graph'], {
                input: `${requests.join('\n')}\n`,
            });
            const replies = result.stdout
                .split('\n')
                .filter(Boolean)
                .map((l) => JSON.parse(l));
            const text = (id) => replies.find((r) => r.id === id).result.content[0].text;
            assert.match(text(2), /Missing argument: 'id'/);
            assert.match(text(3), /Missing argument: 'to'/);
        } finally {
            cleanup(dir);
        }
    });

    test('parallel update-state writers each keep their entry: the read-modify-write of STATE.md is serialized', async () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const executor = path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts', 'executor.js');
            assert.strictEqual(
                simExec(dir, ['update-state', '--workspace=main', '--decision=seed']).status,
                0,
            );
            const writers = 4;
            const exits = await Promise.all(
                Array.from(
                    { length: writers },
                    (_, i) =>
                        new Promise((resolve) => {
                            const child = require('child_process').spawn(
                                process.execPath,
                                [
                                    executor,
                                    'update-state',
                                    '--workspace=main',
                                    `--decision=parallel entry ${i}`,
                                ],
                                { cwd: dir, env: simEnv(), stdio: 'ignore' },
                            );
                            child.on('exit', resolve);
                        }),
                ),
            );
            assert.deepStrictEqual(exits, Array(writers).fill(0));
            const state = fs.readFileSync(path.join(dir, '.magicspec', 'main', 'STATE.md'), 'utf8');
            for (let i = 0; i < writers; i++)
                assert.ok(state.includes(`parallel entry ${i}`), `entry ${i} survived`);
            assert.ok(
                !fs.existsSync(path.join(dir, '.magicspec', '.cache', 'state-main.lock')),
                'the lock is released',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('the graph page draws every node in the palette of its legend, pins its library with an integrity hash, says so when the library is missing and lays out on a narrow screen', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            assert.strictEqual(simExec(dir, ['build-spec-graph', '--html']).status, 0);
            const html = fs.readFileSync(
                path.join(dir, '.magicspec', 'graph', 'graph.html'),
                'utf8',
            );
            const script = html.match(
                /<script src="([^"]+)" integrity="(sha384-[A-Za-z0-9+/=]+)" crossorigin="anonymous"><\/script>/,
            );
            assert.ok(script, 'the library is loaded with an integrity hash');
            assert.match(script[1], /vis-network@\d+\.\d+\.\d+\//, 'and an exact version');
            assert.match(
                html,
                /improvedLayout: false/,
                'the improved layout would re-colour most nodes',
            );
            for (const shape of [
                'shape-diamond',
                'shape-dot',
                'shape-square',
                'shape-triangle',
                'shape-star',
            ]) {
                assert.ok(html.includes(`legend-dot ${shape}`), `the legend draws ${shape}`);
            }
            assert.match(html, /@media \(max-width: 700px\)/, 'a narrow-screen layout');
            assert.match(
                html,
                /<label for="search" class="sr-only">/,
                'the search box has a label',
            );
            assert.match(
                html,
                /typeof vis === 'undefined'/,
                'the page checks that its library loaded',
            );
            assert.ok(
                html.indexOf("getElementById('stats-content').innerHTML") <
                    html.indexOf("typeof vis === 'undefined'"),
                'the summary is drawn before the library is needed',
            );
            assert.doesNotMatch(
                html,
                /\$\{[A-Za-z_]+\}/,
                'no template placeholder was left in the page',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('migrate: an empty .magicspec/ beside .design/ is replaced; one that holds files stops the run with the one action that unblocks it; --host takes both spellings and is checked before anything is written; a finished run says so', () => {
        const dir = makeSimConsumer();
        try {
            const put = simPutter(dir);
            put(
                '.design/workspace.json',
                JSON.stringify({ default: 'main', workspaces: { main: { description: 'x' } } }),
            );
            put('.design/INDEX.md', '# Index\n');
            put('.design/main/INDEX.md', '# Main\n');
            fs.mkdirSync(path.join(dir, '.magicspec'));

            const before = treeHashes(dir);
            const badHost = simExec(dir, ['migrate', '--apply', '--host=bogus']);
            assert.strictEqual(badHost.status, 1);
            assert.match(badHost.stderr, /Unknown host 'bogus'/);
            assert.ok(
                sameTree(before, treeHashes(dir)),
                'an unknown host stops the run before anything is written',
            );

            const spaced = simExec(dir, ['migrate', '--host', 'qwen']);
            assert.match(spaced.stdout, /projections for: qwen,/, 'the space spelling is read');
            assert.match(spaced.stdout, /the empty \.magicspec\/ that is there is replaced/);

            const applied = simExec(dir, ['migrate', '--apply', '--host=claude']);
            assert.strictEqual(applied.status, 0, applied.stdout + applied.stderr);
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec', 'INDEX.md')),
                'the state folder was renamed over the empty one',
            );
            assert.ok(!fs.existsSync(path.join(dir, '.design')));

            const again = simExec(dir, ['migrate', '--apply']);
            assert.strictEqual(again.status, 0);
            assert.match(again.stdout, /Nothing to migrate/);

            // a project that holds work in both folders
            const dir2 = makeSimConsumer();
            try {
                const put2 = simPutter(dir2);
                put2(
                    '.design/workspace.json',
                    JSON.stringify({ default: 'main', workspaces: { main: {} } }),
                );
                put2('.design/INDEX.md', '# Index\n');
                put2('.magicspec/NOTES.md', "somebody's work\n");
                const stopped = simExec(dir2, ['migrate', '--apply']);
                assert.strictEqual(stopped.status, 1);
                assert.match(stopped.stderr, /holds 1 entry \(NOTES\.md\)/);
                assert.match(stopped.stderr, /rename it to \.magicspec-aside\//);
                assert.ok(
                    fs.existsSync(path.join(dir2, '.design', 'INDEX.md')) &&
                        fs.existsSync(path.join(dir2, '.magicspec', 'NOTES.md')),
                    'neither folder was touched',
                );
                fs.renameSync(path.join(dir2, '.magicspec'), path.join(dir2, '.magicspec-aside'));
                assert.strictEqual(
                    simExec(dir2, ['migrate', '--apply']).status,
                    0,
                    'the stated action unblocks the run',
                );
            } finally {
                cleanup(dir2);
            }
        } finally {
            cleanup(dir);
        }
    });

    test('scripts/release.js prints a plan and changes nothing unless it is given --yes; help and unknown arguments never publish', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-rel-'));
        const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-rel-remote-'));
        try {
            const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
            git(remote, 'init', '-q', '--bare');
            for (const args of [
                ['init', '-q', '-b', 'master'],
                ['config', 'user.email', 't@example.com'],
                ['config', 'user.name', 'T'],
                ['remote', 'add', 'origin', remote],
            ])
                git(dir, ...args);
            fs.mkdirSync(path.join(dir, 'scripts'));
            fs.mkdirSync(path.join(dir, 'skills', 'magicspec'), { recursive: true });
            fs.copyFileSync(
                path.resolve(TESTS_DIR, '..', 'scripts', 'release.js'),
                path.join(dir, 'scripts', 'release.js'),
            );
            // The policy check and the two modules its command-line guard loads.
            for (const file of ['check-security-policy.js', 'cli-guard.js', 'engine-path.js']) {
                fs.copyFileSync(
                    path.resolve(TESTS_DIR, '..', 'scripts', file),
                    path.join(dir, 'scripts', file),
                );
            }
            fs.mkdirSync(path.join(dir, 'skills', 'magicspec', 'scripts', 'lib'), {
                recursive: true,
            });
            fs.copyFileSync(
                path.join(scriptsDir, 'utils.js'),
                path.join(dir, 'skills', 'magicspec', 'scripts', 'utils.js'),
            );
            fs.copyFileSync(
                path.join(scriptsDir, 'lib', 'commands.js'),
                path.join(dir, 'skills', 'magicspec', 'scripts', 'lib', 'commands.js'),
            );
            fs.writeFileSync(
                path.join(dir, 'SECURITY.md'),
                '# Security\n\n| Version line | Supported |\n| --- | --- |\n| `9.9.x` | Yes |\n| `9.8.x` | No |\n',
            );
            fs.writeFileSync(path.join(dir, 'skills', 'magicspec', '.version'), '9.9.9');
            fs.writeFileSync(
                path.join(dir, 'CHANGELOG.md'),
                '# Changelog\n\n## [9.9.9] - 2026-10-29\n',
            );
            git(dir, 'add', '-A');
            git(dir, 'commit', '-q', '-m', 'init');

            const run = (...args) =>
                spawnSync(process.execPath, [path.join(dir, 'scripts', 'release.js'), ...args], {
                    cwd: dir,
                    encoding: 'utf8',
                });
            const head = () => git(dir, 'rev-parse', 'HEAD').stdout.trim();
            const pushed = () =>
                spawnSync('git', ['--git-dir', remote, 'show-ref'], {
                    encoding: 'utf8',
                }).stdout.trim();
            const start = head();

            assert.strictEqual(run('--help').status, 0);
            assert.strictEqual(run('--bogus').status, 2, 'an unknown argument is refused');
            const plan = run();
            assert.strictEqual(plan.status, 0, plan.stdout + plan.stderr);
            assert.match(plan.stdout, /nothing is changed without --yes/);
            assert.match(plan.stdout, /Ready\. Run with --yes/);
            assert.strictEqual(head(), start, 'the plan commits nothing');
            assert.strictEqual(git(dir, 'tag', '--list').stdout.trim(), '', 'and tags nothing');
            assert.strictEqual(pushed(), '', 'and pushes nothing');

            // a security policy whose table does not support the line being released blocks the plan
            fs.writeFileSync(
                path.join(dir, 'SECURITY.md'),
                '# Security\n\n| Version line | Supported |\n| --- | --- |\n| `9.8.x` | Yes |\n',
            );
            const stalePolicy = run();
            assert.strictEqual(stalePolicy.status, 1);
            assert.match(
                stalePolicy.stderr,
                /the security policy does not match this release: .*does not list the 9\.9 line/,
            );
            assert.strictEqual(run('--yes').status !== 0, true, 'and so does --yes');
            git(dir, 'checkout', '--', 'SECURITY.md');
            assert.match(
                run().stdout,
                /Ready\. Run with --yes/,
                'a matching table lets the plan through again',
            );

            // a scratch file must never ride along into a release commit
            fs.writeFileSync(path.join(dir, 'scratch-note.md'), 'not for a release\n');
            const blocked = run();
            assert.strictEqual(blocked.status, 1);
            assert.match(blocked.stderr, /working tree is not clean/);
            const refused = run('--yes');
            assert.notStrictEqual(refused.status, 0, 'a dirty tree is refused even with --yes');
            assert.strictEqual(head(), start);
            assert.strictEqual(git(dir, 'tag', '--list').stdout.trim(), '');
            assert.strictEqual(pushed(), '');
            fs.rmSync(path.join(dir, 'scratch-note.md'));

            // the QA gate runs before anything is committed: a fixture without a suite stops there
            const gated = run('--yes');
            assert.notStrictEqual(gated.status, 0);
            assert.match(gated.stderr, /Engine tests failed/);
            assert.strictEqual(head(), start);
            assert.strictEqual(git(dir, 'tag', '--list').stdout.trim(), '');
            assert.strictEqual(pushed(), '');

            // an existing tag blocks the plan
            git(dir, 'tag', 'v9.9.9');
            assert.match(run().stderr, /tag v9\.9\.9 already exists/);
        } finally {
            cleanup(dir);
            cleanup(remote);
        }
    });

    test('the security policy check passes a table that supports the release line, and names a missing line, a stale supported row, a contradiction and a missing table', () => {
        const { checkPolicy, parseSupportedVersions, minorLineOf } = require(
            path.resolve(TESTS_DIR, '..', 'scripts', 'check-security-policy.js'),
        );
        const table = (...rows) =>
            `| Version line | Supported |\n| --- | --- |\n${rows.join('\n')}\n`;
        assert.strictEqual(minorLineOf('3.0.32'), '3.0');
        assert.strictEqual(minorLineOf('latest'), null);
        assert.deepStrictEqual(
            parseSupportedVersions(table('| `3.0.x` | Yes |', '| `1.x` | no |')).map((r) => [
                r.line,
                r.supported,
            ]),
            [
                ['3.0', true],
                ['1', false],
            ],
        );

        assert.deepStrictEqual(
            checkPolicy(table('| `3.0.x` | Yes |', '| `2.1.x` | No |', '| `1.x` | No |'), '3.0.32'),
            [],
            'a matching table passes',
        );
        assert.match(
            checkPolicy(table('| `2.1.x` | No |'), '3.0.32')[0],
            /does not list the 3\.0 line/,
            'a missing line fails',
        );
        assert.match(
            checkPolicy(table('| `3.0.x` | No |'), '3.0.32')[0],
            /3\.0 line, which is being released, as not supported/,
            'a release line stated as not supported fails',
        );
        assert.match(
            checkPolicy(table('| `3.0.x` | Yes |', '| `2.1.x` | Yes |'), '3.0.32').join('|'),
            /2\.1\.x as supported, but only the latest minor line \(3\.0\)/,
            'a stale supported row fails',
        );
        assert.match(
            checkPolicy(table('| `3.0.x` | Yes |', '| `3.0.x` | No |'), '3.0.32').join('|'),
            /both supported and not supported/,
            'a contradiction fails',
        );
        assert.match(
            checkPolicy('# Security\n\nNo table here.\n', '3.0.32')[0],
            /no supported-versions table/,
            'a missing table fails',
        );
        assert.match(checkPolicy(table('| `3.0.x` | Yes |'), 'next')[0], /is not a version/);

        // As a program: exit 0 on a match, 1 with every mismatch named, and the real policy matches the real version.
        const dir = createTempWorkspace();
        try {
            fs.writeFileSync(
                path.join(dir, 'SECURITY.md'),
                table('| `3.0.x` | Yes |', '| `2.1.x` | Yes |'),
            );
            const script = path.join(dir, 'scripts', 'check-security-policy.js');
            const stale = spawnSync(process.execPath, [script, '--version', '3.0.1'], {
                cwd: dir,
                encoding: 'utf8',
            });
            assert.strictEqual(stale.status, 1);
            assert.match(stale.stderr, /\[BLOCKED\] SECURITY\.md: .*2\.1\.x as supported/);
            fs.writeFileSync(path.join(dir, 'SECURITY.md'), table('| `3.0.x` | Yes |'));
            const fresh = spawnSync(process.execPath, [script, '--version', '3.0.1'], {
                cwd: dir,
                encoding: 'utf8',
            });
            assert.strictEqual(fresh.status, 0, fresh.stderr);
            fs.rmSync(path.join(dir, 'SECURITY.md'));
            const missing = spawnSync(process.execPath, [script, '--version', '3.0.1'], {
                cwd: dir,
                encoding: 'utf8',
            });
            assert.strictEqual(missing.status, 1);
            assert.match(missing.stderr, /security policy is missing/);
        } finally {
            cleanup(dir);
        }
        const repo = path.resolve(TESTS_DIR, '..');
        const version = fs
            .readFileSync(path.join(repo, 'skills', 'magicspec', '.version'), 'utf8')
            .trim();
        assert.deepStrictEqual(
            checkPolicy(fs.readFileSync(path.join(repo, 'SECURITY.md'), 'utf8'), version),
            [],
            "this repository's policy supports the version it carries",
        );
    });

    test('the docs-specialist card gains the community-health trigger, its mirror carries it word for word, and the run gate and the audit step name it', () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const card = fs.readFileSync(
            path.join(repo, 'skills', 'magicspec', 'roles', 'docs-specialist.md'),
            'utf8',
        );
        const mirror = fs.readFileSync(
            path.join(repo, '.magicspec', 'engine', 'specifications', 'l2-role-cards-execution.md'),
            'utf8',
        );

        // The trigger, the handoff to the reviewer and the protocol step, in the card and in its mirror.
        const lines = [
            '  - workflow: run.md',
            '    gate: "A community health file must change"',
            '  - to: prompt-engineer',
            '    condition: "a community health file changed; its text is reviewed before the Done transition"',
            'Also triggered when a community health file — the security policy, the contribution guide or an issue form — must change.',
            '5. When the trigger is a community health file, change only the file the work concerns:',
            '6. Hand back to Test-engineer to finalize `Done` transition.',
        ];
        for (const line of lines) {
            assert.ok(card.includes(line), `the card carries: ${line}`);
            assert.ok(mirror.includes(line), `the mirror carries: ${line}`);
        }
        const protocol = (text) => text.split('\n').filter((line) => /^[1-6]\. /.test(line));
        const cardSteps = protocol(card.slice(card.indexOf('## Operating Protocol')));
        const mirrorSteps = protocol(mirror.slice(mirror.indexOf('## 5. Docs-specialist')));
        assert.deepStrictEqual(
            mirrorSteps.slice(0, cardSteps.length),
            cardSteps,
            'the protocol steps are identical',
        );

        // The run body names the trigger beside the first one, with the reviewer.
        const run = fs.readFileSync(
            path.join(repo, 'skills', 'magicspec', 'workflows', 'run.md'),
            'utf8',
        );
        assert.match(
            run,
            /community health file \(the security policy, the contribution guide or an issue form\) must change → activate `@role:docs-specialist`; `@role:prompt-engineer` reviews/,
        );

        // The documentation audit checks the three files, and only in the engine's own repository.
        const analyze = fs.readFileSync(
            path.join(repo, 'skills', 'magicspec', 'workflows', 'analyze.md'),
            'utf8',
        );
        const start = analyze.indexOf('10. **Documentation & Version Audit**');
        const end = analyze.indexOf('11. **Scope Blind-Spot Check**');
        const step = analyze.slice(start, end);
        assert.ok(start !== -1 && end > start);
        assert.ok(
            step.includes(
                "the engine's own repository only — skip when `scripts/generate-checksums.js` is absent",
            ),
            'the step is gated by the developer predicate',
        );
        for (const needle of [
            '`SECURITY.md` states the supported versions as a table',
            'private reporting place',
            '`CONTRIBUTING.md` keeps its five sections in the contract order',
            '`.github/ISSUE_TEMPLATE/` holds the bug report, change proposal and agent-feedback forms',
            'blank issues disabled',
            'documentation drift',
        ]) {
            assert.ok(step.includes(needle), `the audit step checks: ${needle}`);
        }
        assert.ok(
            !analyze.slice(0, start).includes('SECURITY.md') &&
                !analyze.slice(end).includes('SECURITY.md'),
            'the community-file check lives only inside the gated step',
        );

        // The sibling places that list the card's triggers agree.
        const index = fs.readFileSync(
            path.join(repo, '.magicspec', 'engine', 'specifications', 'l2-role-cards.md'),
            'utf8',
        );
        const integration = fs.readFileSync(
            path.join(repo, '.magicspec', 'engine', 'specifications', 'l2-role-integration.md'),
            'utf8',
        );
        assert.ok(index.includes('a community health file must change'));
        assert.ok(
            integration.includes(
                '| `run.md` | A community health file must change | `docs-specialist` |',
            ),
        );
    });

    test('the release workflow checks the security policy before it builds the archive', () => {
        const workflow = fs.readFileSync(
            path.resolve(TESTS_DIR, '..', '.github', 'workflows', 'release.yml'),
            'utf8',
        );
        const check = workflow.indexOf('node scripts/check-security-policy.js --version');
        const build = workflow.indexOf('- name: Build release archive');
        assert.ok(check !== -1 && build !== -1 && check < build, 'the policy check runs first');
    });

    test('the maintenance scripts answer --help and refuse an unknown option before they write, and their table names exactly what each reads', () => {
        const devRoot = path.resolve(TESTS_DIR, '..');
        const { MAINTENANCE_COMMANDS } = require(path.join(devRoot, 'scripts', 'cli-guard.js'));
        for (const [name, entry] of Object.entries(MAINTENANCE_COMMANDS)) {
            const source = fs.readFileSync(path.join(devRoot, 'scripts', name + '.js'), 'utf8');
            assert.ok(
                source.includes("guardCli('" + name + "', module)"),
                name + ' calls the guard first',
            );
            for (const flag of Object.keys(entry.options || {})) {
                assert.ok(
                    source.includes("'" + flag + "'") || source.includes("'" + flag + '='),
                    name + ": '" + flag + "' is in the table but the script does not read it",
                );
            }
        }

        const tempDir = createTempWorkspace(true);
        try {
            const before = treeHashes(tempDir);
            for (const name of Object.keys(MAINTENANCE_COMMANDS)) {
                const script = path.join(tempDir, 'scripts', name + '.js');
                const help = spawnSync(process.execPath, [script, '--help'], {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: simEnv(),
                });
                assert.strictEqual(help.status, 0, name + ' --help: ' + help.stderr);
                assert.match(help.stdout, /Usage: node scripts\//, name);
                const bad = spawnSync(process.execPath, [script, '--no-such-option'], {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: simEnv(),
                });
                assert.strictEqual(bad.status, 2, name + ' --no-such-option');
                assert.match(bad.stderr, /Unknown option '--no-such-option'/, name);
            }
            assert.ok(sameTree(before, treeHashes(tempDir)), 'help and refusals wrote nothing');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a file the engine needs that is missing is reported once, with the remedy, and not as a loader stack trace', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const scripts = path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts');
            const helper = path.join(scripts, 'lib', 'scan-hygiene.js');
            const kept = fs.readFileSync(helper);

            fs.rmSync(helper);
            const lib = simExec(dir, ['check-prerequisites', '--json']);
            assert.strictEqual(lib.status, 1);
            assert.match(
                lib.stderr,
                /HALT: The engine is damaged: \d+ file\(s\) it needs are missing — scripts\/lib\/scan-hygiene \(needed by scripts\/check-prerequisites\.js\)/,
            );
            assert.match(
                lib.stderr,
                /Restore \.agents\/skills\/magicspec\/ from the release archive/,
            );
            assert.doesNotMatch(
                lib.stderr,
                /Module\._resolveFilename|Require stack/,
                'no loader stack trace',
            );
            assert.strictEqual(
                simExec(dir, ['remove', '--dry-run']).status,
                0,
                'a command that does not need the file still runs',
            );
            fs.writeFileSync(helper, kept);

            const utils = path.join(scripts, 'utils.js');
            const keptUtils = fs.readFileSync(utils);
            fs.rmSync(utils);
            const core = simExec(dir, ['check-prerequisites']);
            assert.strictEqual(core.status, 1);
            assert.match(
                core.stderr,
                /HALT: The engine is damaged: a file it needs is missing \(Cannot find module '\.\/utils'\)/,
            );
            assert.doesNotMatch(
                core.stderr,
                /Module\._resolveFilename/,
                "the executor's own module is reported the same way",
            );
            fs.writeFileSync(utils, keptUtils);
        } finally {
            cleanup(dir);
        }
    });

    test('the executor answers help and refuses an unknown option before it looks at the project: in a project not yet migrated they are not the migration stop', () => {
        const dir = makeSimConsumer();
        try {
            fs.mkdirSync(path.join(dir, '.design'));
            fs.writeFileSync(path.join(dir, '.design', 'INDEX.md'), '# Index\n');
            const help = simExec(dir, ['check-prerequisites', '--help']);
            assert.strictEqual(help.status, 0, help.stderr);
            assert.match(help.stdout, /^check-prerequisites — /);
            const bad = simExec(dir, ['check-prerequisites', '--no-such-option']);
            assert.strictEqual(bad.status, 1);
            assert.match(bad.stderr, /Unknown option '--no-such-option'/);
            assert.doesNotMatch(
                bad.stderr,
                /2\.x layout/,
                'the migration stop comes after the argument check',
            );
            const plain = simExec(dir, ['check-prerequisites']);
            assert.match(
                plain.stderr,
                /2\.x layout/,
                'a valid request in that project is still stopped',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('update-state waits for a lock another writer holds and takes over one that is stale', async () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            assert.strictEqual(
                simExec(dir, ['update-state', '--workspace=main', '--decision=seed']).status,
                0,
            );
            const state = path.join(dir, '.magicspec', 'main', 'STATE.md');
            const lock = path.join(dir, '.magicspec', '.cache', 'state-main.lock');
            const executor = path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts', 'executor.js');

            // held: nothing is written until the holder lets go
            fs.mkdirSync(path.dirname(lock), { recursive: true });
            fs.writeFileSync(lock, '99999 held by another writer\n');
            const child = require('child_process').spawn(
                process.execPath,
                [executor, 'update-state', '--workspace=main', '--decision=waited for the lock'],
                { cwd: dir, env: simEnv(), stdio: 'ignore' },
            );
            const exited = new Promise((resolve) => child.on('exit', resolve));
            await new Promise((resolve) => setTimeout(resolve, 900));
            assert.ok(
                !fs.readFileSync(state, 'utf8').includes('waited for the lock'),
                'not written while the lock is held',
            );
            fs.unlinkSync(lock);
            assert.strictEqual(await exited, 0);
            assert.ok(
                fs.readFileSync(state, 'utf8').includes('waited for the lock'),
                'written once it was released',
            );
            assert.ok(!fs.existsSync(lock), 'and the lock is gone');

            // stale: a lock left by a killed process is taken over
            fs.writeFileSync(lock, '1 left behind\n');
            const old = new Date(Date.now() - 60000);
            fs.utimesSync(lock, old, old);
            const taken = simExec(dir, [
                'update-state',
                '--workspace=main',
                '--decision=took over a stale lock',
            ]);
            assert.strictEqual(taken.status, 0, taken.stderr);
            assert.ok(fs.readFileSync(state, 'utf8').includes('took over a stale lock'));
            assert.ok(!fs.existsSync(lock));
        } finally {
            cleanup(dir);
        }
    });

    test('export-wiki and the graph server read a graph larger than the default child-process buffer (reproduced at about 2000 specifications)', () => {
        const dir = makeSimConsumer();
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            // One specification that references five thousand files: the graph JSON on stdout passes
            // the old default limit without a thousand fixtures.
            const specs = path.join(dir, '.magicspec', 'main', 'specifications');
            fs.mkdirSync(specs, { recursive: true });
            const rows = Array.from(
                { length: 5000 },
                (_, i) => '| `src/generated/file-number-' + i + '.js` | code |',
            ).join('\n');
            fs.writeFileSync(
                path.join(specs, 'l2-bulk.md'),
                '# Bulk\n\n**Version:** 1.0.0\n**Status:** Stable\n**Layer:** implementation\n\n## Overview\n\nBulk.\n\n## Canonical References\n\n| Path | Role |\n| --- | --- |\n' +
                    rows +
                    '\n',
            );
            const graph = simExec(dir, ['build-spec-graph', '--json']);
            assert.ok(
                graph.stdout.length > 1024 * 1024,
                'precondition: the graph is larger than 1 MiB (' + graph.stdout.length + ')',
            );
            const wiki = simExec(dir, ['export-wiki']);
            assert.strictEqual(wiki.status, 0, wiki.stderr.slice(0, 300));
            assert.match(wiki.stdout, /Wiki exported/);
            const served = simExec(dir, ['serve-spec-graph'], {
                input:
                    JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'tools/call',
                        params: { name: 'get_coverage', arguments: {} },
                    }) + '\n',
            });
            assert.strictEqual(served.status, 0, served.stderr.slice(0, 300));
            assert.strictEqual(
                JSON.parse(served.stdout.split('\n').filter(Boolean)[0]).id,
                1,
                'the server answered',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('the engine prints project-relative paths with forward slashes', () => {
        const dir = makeSimConsumer();
        try {
            const init = simExec(dir, ['init']);
            assert.match(init.stdout, /✅ Created \.magicspec\/workspace\.json\n/);
            assert.match(init.stdout, /✅ Created \.magicspec\/main\/INDEX\.md\n/);
            const state = simExec(dir, ['update-state', '--workspace=main', '--decision=x']);
            assert.match(state.stdout, /STATE\.md updated: \.magicspec\/main\/STATE\.md\n/);
            const context = simExec(dir, ['generate-context']);
            assert.match(
                context.stdout,
                /Context document updated: \.magicspec\/main\/CONTEXT\.md\n/,
            );
            const wiki = simExec(dir, ['export-wiki']);
            assert.match(wiki.stdout, /Wiki exported → \.magicspec\/graph\/wiki\n/);
        } finally {
            cleanup(dir);
        }
    });

    test('finalize writes only where the project is: a version or changelog path that leaves it — absolute, with .., or through a link — is refused before anything is written', () => {
        const dir = makeSimConsumer();
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-outside-'));
        try {
            assert.strictEqual(simExec(dir, ['init']).status, 0);
            const registry = path.join(dir, '.magicspec', 'workspace.json');
            const original = JSON.parse(fs.readFileSync(registry, 'utf8'));
            const link = path.join(dir, 'escape');
            fs.symlinkSync(outside, link, 'junction');
            // a link whose target does not exist: a write through it would create the target
            const missingTarget = path.join(outside, 'not-yet');
            fs.symlinkSync(missingTarget, path.join(dir, 'dangling'), 'junction');
            const cases = [
                [
                    { changelogPath: 'dangling/CHANGELOG.md' },
                    'changelogPath',
                    path.join(missingTarget, 'CHANGELOG.md'),
                ],
                [
                    { changelogPath: '../outside-changelog.md' },
                    'changelogPath',
                    path.resolve(dir, '..', 'outside-changelog.md'),
                ],
                [
                    { versionPath: path.join(outside, 'version') },
                    'versionPath',
                    path.join(outside, 'version'),
                ],
                [
                    { changelogPath: 'escape/CHANGELOG.md' },
                    'changelogPath',
                    path.join(outside, 'CHANGELOG.md'),
                ],
            ];
            for (const [finalization, key, target] of cases) {
                fs.writeFileSync(registry, JSON.stringify({ ...original, finalization }));
                const result = simExec(dir, ['finalize', '--workflow=run']);
                assert.strictEqual(result.status, 1, key + ': ' + result.stdout + result.stderr);
                assert.match(
                    result.stderr,
                    new RegExp(
                        'finalization\\.' +
                            key +
                            ' in .+workspace\\.json must name a file inside the project',
                    ),
                );
                assert.ok(!fs.existsSync(target), key + ': nothing was written at ' + target);
            }
            // a path inside the project is accepted as before
            fs.writeFileSync(
                registry,
                JSON.stringify({
                    ...original,
                    finalization: { changelogPath: 'docs/CHANGELOG.md' },
                }),
            );
            assert.doesNotMatch(
                simExec(dir, ['finalize', '--workflow=run', '--dry-run']).stderr,
                /must name a file inside the project/,
            );
        } finally {
            for (const name of ['escape', 'dangling']) {
                try {
                    fs.rmSync(path.join(dir, name), { recursive: false, force: true });
                } catch {
                    /* the link is removed with the folder */
                }
            }
            cleanup(dir);
            cleanup(outside);
        }
    });
};
