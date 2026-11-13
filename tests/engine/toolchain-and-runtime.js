// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { cleanup } = require('./lib/base');
const {
    shippedRoot,
    readShipped,
    listShipped,
    makeSimConsumer,
    simExec,
    simPutter,
    stateFolderOfRepo,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // The development toolchain (l2-engine-toolchain.md §4, §5): the files that configure it and the CI jobs
    // ───────────────────────────────────────────────────────────────────────────
    const readRepo = (rel) => readShipped(rel);
    const repoJson = (rel) => JSON.parse(readRepo(rel));

    test('continuous integration is two jobs: the tools on the LTS line, then the harness alone on the stated floor and the LTS line, started with node and not with npm (§5.5)', () => {
        const workflow = readRepo('.github/workflows/test.yml');
        const jobs = [
            ...workflow.slice(workflow.indexOf('\njobs:')).matchAll(/^ {2}([a-z][\w-]*):\s*$/gm),
        ].map((m) => m[1]);
        assert.deepStrictEqual(
            jobs,
            ['toolchain', 'harness'],
            'exactly the two jobs of the specification',
        );
        const toolchain = workflow.slice(
            workflow.indexOf('\n  toolchain:'),
            workflow.indexOf('\n  harness:'),
        );
        const harness = workflow.slice(workflow.indexOf('\n  harness:'));

        // The tools, in order, on the LTS line only; the cheap checks come first.
        const steps = [
            'pnpm install --frozen-lockfile',
            'pnpm exec biome ci .',
            'pnpm run typecheck',
            'pnpm exec fallow dead-code',
        ];
        let at = -1;
        for (const step of steps) {
            const next = toolchain.indexOf('run: ' + step);
            assert.ok(next > at, 'the toolchain job runs, in order: ' + step);
            at = next;
        }
        assert.match(toolchain, /node: \[24\]/, 'the tools run on the current LTS line');
        assert.ok(!/node: \[[^\]]*18/.test(toolchain), 'the tools never run on the floor');

        // The harness: after the tools, installs nothing, no package script.
        assert.match(harness, /^ {4}needs: toolchain$/m, 'the harness waits for the tools');
        assert.ok(
            harness.includes('run: node --test tests/engine.js'),
            'it starts the harness directly',
        );
        assert.ok(
            !harness.includes('npm test') &&
                !harness.includes('pnpm') &&
                !harness.includes('install'),
            'no install and no package script, which would carry the manifest engines onto the floor',
        );
        assert.match(harness, /os: \[ubuntu-latest, windows-latest\]/);
        assert.match(
            harness,
            /continue-on-error: \$\{\{ matrix\.node == 18 \}\}/,
            'the floor entries are advisory until their first run is classified',
        );
        assert.ok(!workflow.includes('npm test'), 'the old single job is gone');
    });

    test('the floor in the workflow, the executor and the skill folder manifest is one number', () => {
        const executor = readRepo('skills/magicspec/scripts/executor.js');
        const floor = Number(/const MIN_NODE_MAJOR = (\d+);/.exec(executor)[1]);
        const engines = repoJson('skills/magicspec/scripts/package.json').engines.node;
        assert.strictEqual(
            engines,
            '>=' + floor,
            "the manifest the user installs names the executor's floor",
        );
        const harness = readRepo('.github/workflows/test.yml');
        const matrix = /node: \[(\d+), (\d+)\]/.exec(
            harness.slice(harness.indexOf('\n  harness:')),
        );
        assert.strictEqual(Number(matrix[1]), floor, 'the harness job covers the floor');
        assert.ok(Number(matrix[2]) > floor, 'and a later line');
        assert.match(
            harness,
            new RegExp('matrix\\.node == ' + floor + ' '),
            'the advisory switch names the same floor',
        );
    });

    test('the toolchain is development-only: the root manifest pins pnpm and lists the tools as development dependencies, the skill folder gains no dependency, and no toolchain file ships (SP-1, SP-7)', () => {
        const root = repoJson('package.json');
        assert.match(
            root.packageManager,
            /^pnpm@\d+\.\d+\.\d+$/,
            'the package manager is pinned exactly',
        );
        assert.strictEqual(
            root.dependencies,
            undefined,
            'nothing is a runtime dependency of the repository',
        );
        for (const tool of ['@biomejs/biome', 'fallow', 'typescript', '@types/node']) {
            assert.ok(root.devDependencies[tool], tool + ' is a development dependency');
        }
        for (const script of ['lint', 'typecheck', 'audit', 'test'])
            assert.ok(root.scripts[script], 'the script ' + script + ' exists');

        const skillManifest = repoJson('skills/magicspec/scripts/package.json');
        assert.deepStrictEqual(
            Object.keys(skillManifest).sort(),
            ['engines', 'repository', 'type'],
            "the skill folder's manifest keeps only its type, its engines and its repository",
        );

        const listed = execFileSync(
            process.execPath,
            [path.join(shippedRoot, 'scripts', 'archive-composition.js'), 'list'],
            { cwd: shippedRoot, encoding: 'utf8' },
        )
            .split('\n')
            .filter(Boolean);
        for (const file of [
            'package.json',
            'pnpm-lock.yaml',
            'tsconfig.json',
            'biome.json',
            '.fallowrc.json',
        ]) {
            assert.ok(!listed.includes(file), file + ' is not in the release archive');
        }
        assert.ok(
            listed.every(
                (file) =>
                    file === 'README.md' ||
                    file === 'LICENSE' ||
                    file.startsWith('skills/magicspec/'),
            ),
            'the archive holds the skill folder, the README and the licence only',
        );
        const inSkill = listed.filter((file) =>
            /(^|\/)(tsconfig|biome|\.fallowrc)[^/]*$/.test(file),
        );
        assert.deepStrictEqual(inSkill, [], 'no toolchain file is inside the skill folder');
    });

    test('Biome covers the code and nothing else, and no file of the harness is skipped by size; the type check is strict over the four directories; Fallow sees the skill folder through its entry points (§5.2 to §5.4)', () => {
        const biome = repoJson('biome.json');
        assert.deepStrictEqual(
            biome.files.includes,
            ['**/*.js', '**/*.cjs', '**/*.mjs', '**/*.json'],
            'Markdown and YAML are out of scope (§5.3)',
        );
        const biggest = Math.max(
            ...['tests/engine.js', 'skills/magicspec/scripts/finalize.js'].map(
                (f) => fs.statSync(path.join(shippedRoot, f)).size,
            ),
        );
        assert.ok(
            biome.files.maxSize > biggest,
            'the size limit is above the largest script, so no file is skipped silently',
        );

        const ts = repoJson('tsconfig.json');
        for (const option of ['allowJs', 'noEmit'])
            assert.strictEqual(ts.compilerOptions[option], true, option);
        // The check is not strict and covers the files that carry the pragma (§2, §5.2).
        assert.strictEqual(
            ts.compilerOptions.strict,
            false,
            'not strict: TypeScript 7 defaults strict on, so it is written',
        );
        assert.strictEqual(
            ts.compilerOptions.checkJs,
            false,
            'a file is checked by its own pragma',
        );
        const pragma = /^\/\/ @ts-check$/m;
        const checked = listShipped('skills/magicspec/scripts', ['.js']).filter((rel) =>
            pragma.test(readRepo(rel).split('\n', 4).join('\n')),
        );
        assert.ok(
            checked.length > 0,
            'the checked set is not empty: the skill folder has files that carry the pragma',
        );
        assert.ok(
            !readRepo('.github/workflows/test.yml').match(
                /- name: Type check\n\s+continue-on-error/,
            ),
            'the type check gates from its first run',
        );
        assert.deepStrictEqual(
            ts.include.map((glob) => glob.split('/**')[0]),
            ['skills/magicspec/scripts', 'skills/magicspec-dev', 'scripts', 'tests'],
            'the four directories of the specification',
        );

        const fallow = repoJson('.fallowrc.json');
        assert.strictEqual(fallow.ignorePatterns, undefined, 'the skill folder is not ignored');
        assert.strictEqual(
            fallow.ignoreExportsUsedInFile,
            true,
            'an export its own file uses is not dead code',
        );
        assert.ok(
            !readRepo('.github/workflows/test.yml').match(
                /- name: Analyze \(Fallow\)\n\s+continue-on-error/,
            ),
            'Fallow gates from its first triaged report',
        );
        assert.ok(
            fallow.entry.includes('skills/magicspec/scripts/*.js'),
            'the executor and every script the command table names are entry points',
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // One invocation, one runtime: a child is started with the runtime that started its parent
    // ───────────────────────────────────────────────────────────────────────────
    test('the executor starts the script with the runtime that started it, not the first node on PATH', () => {
        const dir = makeSimConsumer();
        const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-nopath-'));
        try {
            simPutter(dir)(
                '.magicspec/workspace.json',
                JSON.stringify({ default: 'ws', workspaces: { ws: {} } }),
            );
            // A PATH with no node on it: a child named "node" cannot be found, one started by the
            // runtime's own path can. This is also what happens when another Node is first on PATH.
            const result = simExec(dir, ['resume-state', '--workspace=ws'], {
                env: { PATH: empty, Path: empty },
            });
            assert.strictEqual(result.status, 0, 'the executor ran its script: ' + result.stderr);
            assert.ok(!/ENOENT|not found|spawn/i.test(result.stderr), result.stderr);
        } finally {
            cleanup(dir);
            cleanup(empty);
        }
    });

    test('no script starts a child Node process by the name node: the executors, the diagnostics recheck and the maintenance pipeline use the path of the running runtime', () => {
        const sources = {
            executor: readShipped('skills/magicspec/scripts/executor.js'),
            diagnostics: readShipped('skills/magicspec/scripts/lib/diagnostics.js'),
            wrapper: readShipped('scripts/executor.js'),
            pipeline: readShipped('scripts/sync.js'),
        };
        assert.ok(
            sources.executor.includes('command = process.execPath;'),
            'the executor starts a script with the runtime path',
        );
        assert.ok(!sources.executor.includes("command = 'node'"), 'and never by name');
        assert.ok(
            sources.diagnostics.includes('execFileSync(process.execPath,'),
            'the diagnostics recheck uses the runtime path',
        );
        assert.ok(!/execFileSync\('node'/.test(sources.diagnostics));
        assert.ok(
            sources.wrapper.includes('spawn(process.execPath,') &&
                !sources.wrapper.includes("spawn('node'"),
            'the maintenance executor wrapper',
        );
        assert.ok(
            sources.pipeline.includes('execFileSync(process.execPath,') &&
                !sources.pipeline.includes('execSync(' + String.fromCharCode(96) + 'node'),
            'the maintenance pipeline',
        );
    });

    // The harness never writes the index of the project it runs in: every case that reaches a writing
    // subcommand does so in a fixture, or hands it the fixture's root. The listing is taken when the
    // cases are collected, before any of them runs; the case below runs after all the others.
    const realIndexListing = () => {
        const cache = path.join(stateFolderOfRepo, '.cache');
        if (!fs.existsSync(cache)) return [];
        return fs
            .readdirSync(cache)
            .filter((name) => name.startsWith('memory.'))
            .sort()
            .map((name) => {
                const stat = fs.statSync(path.join(cache, name));
                return `${name} ${stat.size} ${stat.mtimeMs}`;
            });
    };
    const realIndexAtCollection = realIndexListing();

    test('memory: the full run leaves the index of the project it runs in exactly as it found it (fixture roots)', () => {
        assert.deepStrictEqual(realIndexListing(), realIndexAtCollection);
        assert.ok(
            !fs.existsSync(path.join(stateFolderOfRepo, '.cache', 'memory.lock')),
            'no lock is left behind',
        );
    });
};
