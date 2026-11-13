'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { scriptsDir, createTempWorkspace, requireFromFixture, cleanup } = require('./lib/base');
const {
    trackingEntry,
    treeDigest,
    routingRegistry,
    writeRoutingFixture,
    routingEnv,
    executorListing,
} = require('./lib/sim');

module.exports = () => {
    // Records one task as in flight in a workspace, the way a phase workbook does.
    const leaveTaskInFlight = (designDir, name) => {
        fs.mkdirSync(path.join(designDir, name, 'tasks'), { recursive: true });
        fs.writeFileSync(
            path.join(designDir, name, 'tasks', 'phase-1.md'),
            [
                '---',
                'phase: 1',
                'status: In Progress',
                '---',
                '',
                '## Detailed Tracking',
                '',
                trackingEntry('T-1A01', 'Open work', 'In Progress'),
            ].join('\n'),
        );
    };

    const touchFile = (dir, relative) => {
        fs.mkdirSync(path.dirname(path.join(dir, relative)), { recursive: true });
        fs.writeFileSync(path.join(dir, relative), 'x\n');
    };

    const runRouting = (dir, args, extraEnv = {}) =>
        spawnSync(
            process.execPath,
            [
                path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'),
                'resolve-workspace',
                ...args,
            ],
            { cwd: dir, encoding: 'utf8', env: routingEnv(extraEnv) },
        );

    const routeJson = (dir, args, extraEnv = {}) => {
        const result = runRouting(dir, [...args, '--json'], extraEnv);
        assert.strictEqual(result.status, 0, result.stderr);
        return JSON.parse(result.stdout);
    };

    test('resolve-workspace: an explicit --workspace, then MAGIC_WORKSPACE, win over a path that points elsewhere (F1, F2)', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const contrary = ['--text', 'fix apps/web/cart.js'];
            const flagged = routeJson(dir, ['--workspace=docs', ...contrary]);
            assert.strictEqual(flagged.workspace, 'docs');
            assert.strictEqual(flagged.signal, 'argument');
            const fromEnvironment = routeJson(dir, contrary, { MAGIC_WORKSPACE: 'docs' });
            assert.strictEqual(fromEnvironment.workspace, 'docs');
            assert.strictEqual(fromEnvironment.signal, 'environment');
            const both = routeJson(dir, ['--workspace=web', ...contrary], {
                MAGIC_WORKSPACE: 'docs',
            });
            assert.strictEqual(both.workspace, 'web');
            assert.strictEqual(both.signal, 'argument');
            // The signal that won is not the only one computed: the path is still reported.
            assert.deepStrictEqual(flagged.matched.web, ['apps/web/cart.js']);
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: paths matching one scope choose that workspace over the registry default, and the choice is narrated once (WI-12, WI-13, G1)', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const routed = routeJson(dir, ['--command', 'task', '--text', 'fix apps/web/cart.js']);
            assert.strictEqual(routed.workspace, 'web', 'the default is api; the path decides');
            assert.strictEqual(routed.signal, 'location');
            assert.strictEqual(
                routed.narration,
                '[Workspace] web — location: 1 of 1 paths. (Override: /magicspec task api …)',
            );
            // The most specific scope entry owns a path: packages/ui is web's, the rest of packages is api's.
            const owned = routeJson(dir, [
                '--paths',
                'packages/ui/button.js,packages/core/model.js,README.md,elsewhere/x.js',
            ]);
            assert.deepStrictEqual(owned.matched, {
                web: ['packages/ui/button.js'],
                api: ['packages/core/model.js'],
                docs: ['README.md'],
            });
            assert.deepStrictEqual(owned.unmatched, ['elsewhere/x.js']);
            const human = runRouting(dir, ['--command', 'run', '--text', 'fix apps/web/cart.js']);
            assert.strictEqual(
                human.stdout.split('\n').filter((line) => line.startsWith('Narration:')).length,
                1,
                'one narration line per invocation',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: paths split between scopes choose the one with more of them and name the other (G2)', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const routed = routeJson(dir, [
                '--command',
                'run',
                '--text',
                'apps/web/a.js apps/web/b.js and apps/api/c.js',
            ]);
            assert.strictEqual(routed.workspace, 'web');
            assert.strictEqual(routed.signal, 'location');
            assert.deepStrictEqual(routed.matched, {
                web: ['apps/web/a.js', 'apps/web/b.js'],
                api: ['apps/api/c.js'],
                docs: [],
            });
            assert.strictEqual(
                routed.narration,
                '[Workspace] web — location: 2 of 3 paths; also matched: api (1). (Override: /magicspec run api …)',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: a tie between scopes falls to the topic signal, which needs a score of 0.30 and never creates a workspace (G2, G3)', () => {
        const dir = createTempWorkspace();
        try {
            const designDir = writeRoutingFixture(dir);
            const registryFile = path.join(designDir, 'workspace.json');
            const before = treeDigest(dir);

            const tied = routeJson(dir, ['--text', 'checkout flow apps/web/a.js apps/api/b.js']);
            assert.strictEqual(tied.signal, 'topic');
            assert.strictEqual(tied.workspace, 'web');
            assert.deepStrictEqual(tied.scores, { web: 1, api: 0, docs: 0 });
            assert.deepStrictEqual([tied.matched.web.length, tied.matched.api.length], [1, 1]);

            // No paths at all: the words alone decide.
            const alone = routeJson(dir, ['--text', 'update the storefront checkout']);
            assert.strictEqual(alone.workspace, 'web');
            assert.strictEqual(alone.signal, 'topic');

            // One word in four is 0.25: below the threshold, so the registry default answers.
            const thin = routeJson(dir, ['--text', 'checkout refund policy abuse']);
            assert.strictEqual(thin.scores.web, 0.25);
            assert.strictEqual(thin.signal, 'default');
            assert.strictEqual(thin.workspace, 'api');

            // Two workspaces at the same score are no answer either: the chain moves on to the default.
            const level = routeJson(dir, ['--text', 'checkout orders']);
            assert.deepStrictEqual([level.scores.web, level.scores.api], [0.5, 0.5]);
            assert.strictEqual(level.signal, 'default');

            // A topic no workspace knows is not a reason to create one: the chain only ever routes.
            const novel = routeJson(dir, ['--text', 'add a mobile app for iOS']);
            assert.strictEqual(novel.signal, 'default');
            assert.deepStrictEqual(novel.registered, ['web', 'api', 'docs']);
            assert.strictEqual(
                fs.readFileSync(registryFile, 'utf8'),
                JSON.stringify(routingRegistry(), null, 2),
            );
            assert.deepStrictEqual(treeDigest(dir), before, 'nothing was written');
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: with no path or topic signal the workspace with work in flight wins, then the default, then the widest scope coverage, then registry order', () => {
        const dir = createTempWorkspace();
        try {
            const designDir = writeRoutingFixture(dir, routingRegistry({ default: undefined }));

            // Nothing in flight, no default: the widest coverage. api holds three of the four scoped
            // files; the filler no scope covers makes every share small, so a share rounded to two
            // decimals would call api and web level.
            for (const file of [
                'apps/api/a.js',
                'apps/api/b.js',
                'apps/api/c.js',
                'apps/web/a.js',
            ]) {
                touchFile(dir, file);
            }
            for (let n = 0; n < 600; n++) touchFile(dir, `filler/f${n}.js`);
            const widest = routeJson(dir, ['--command', 'task']);
            assert.strictEqual(widest.signal, 'coverage');
            assert.strictEqual(widest.workspace, 'api');
            assert.ok(
                widest.coverage.api > widest.coverage.web &&
                    widest.coverage.web > widest.coverage.docs,
            );

            // Equal coverage: the first workspace in the registry.
            fs.rmSync(path.join(dir, 'apps', 'api', 'b.js'));
            fs.rmSync(path.join(dir, 'apps', 'api', 'c.js'));
            const level = routeJson(dir, ['--command', 'task']);
            assert.strictEqual(level.coverage.web, level.coverage.api);
            assert.strictEqual(level.workspace, 'web');

            // Exactly one workspace with a task In Progress.
            leaveTaskInFlight(designDir, 'docs');
            const flying = routeJson(dir, ['--command', 'task']);
            assert.strictEqual(flying.signal, 'work-in-flight');
            assert.strictEqual(flying.workspace, 'docs');
            assert.deepStrictEqual(flying.in_flight, ['docs']);
            assert.strictEqual(
                flying.narration,
                '[Workspace] docs — work in flight. (Override: /magicspec task web …)',
            );

            // Two with work in flight is no answer: the chain moves on.
            leaveTaskInFlight(designDir, 'web');
            const crowded = routeJson(dir, ['--command', 'task']);
            assert.deepStrictEqual(crowded.in_flight, ['web', 'docs']);
            assert.strictEqual(crowded.signal, 'coverage');

            // A default outranks coverage, and a path outranks the default.
            fs.writeFileSync(
                path.join(designDir, 'workspace.json'),
                JSON.stringify(routingRegistry({ default: 'docs' }), null, 2),
            );
            const defaulted = routeJson(dir, ['--command', 'task']);
            assert.strictEqual(defaulted.signal, 'default');
            assert.strictEqual(defaulted.workspace, 'docs');
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: a project with one workspace routes silently, and a project with none reports that', () => {
        const dir = createTempWorkspace();
        try {
            // A registry entry that is not an object registers nothing, so it does not make a second workspace.
            const designDir = writeRoutingFixture(dir, {
                default: 'only',
                workspaces: { only: { scope: ['src'] } },
            });
            fs.writeFileSync(
                path.join(designDir, 'workspace.json'),
                JSON.stringify({
                    default: 'only',
                    workspaces: { only: { scope: ['src'] }, broken: null },
                }),
            );
            const sole = routeJson(dir, ['--command', 'run', '--text', 'fix lib/x.js']);
            assert.strictEqual(sole.workspace, 'only');
            assert.strictEqual(sole.signal, 'sole');
            assert.deepStrictEqual(sole.registered, ['only']);
            assert.strictEqual(sole.narration, null);
            const human = runRouting(dir, ['--command', 'run']);
            assert.doesNotMatch(human.stdout, /Narration:/);
        } finally {
            cleanup(dir);
        }
        const bare = createTempWorkspace();
        try {
            const none = routeJson(bare, ['--command', 'run']);
            assert.strictEqual(none.workspace, null);
            assert.strictEqual(none.signal, 'none');
            assert.deepStrictEqual(none.registered, []);
        } finally {
            cleanup(bare);
        }
    });

    test('resolve-workspace: a name the registry does not hold stops the script with the registered names, whether it comes from a flag, MAGIC_WORKSPACE or MAGIC_DESIGN_DIR', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const script = path.join(dir, 'skills', 'magicspec', 'scripts', 'resolve-workspace.js');
            const direct = (args, extraEnv = {}) =>
                spawnSync(process.execPath, [script, ...args], {
                    cwd: dir,
                    encoding: 'utf8',
                    env: routingEnv(extraEnv),
                });
            const expected = "HALT: Unknown workspace 'ghost'. Available: [web, api, docs].";
            for (const result of [
                direct(['--workspace', 'ghost']),
                direct([], { MAGIC_WORKSPACE: 'ghost' }),
                direct([], { MAGIC_DESIGN_DIR: '.magicspec/ghost' }),
            ]) {
                assert.strictEqual(result.status, 1);
                assert.strictEqual(result.stderr.trim(), expected);
                assert.strictEqual(result.stdout, '');
            }
            const malformed = direct(['--workspace', '../x']);
            assert.strictEqual(malformed.status, 1);
            assert.match(malformed.stderr, /Invalid workspace name '\.\.\/x'/);
            // A registered name on the same path is accepted.
            assert.strictEqual(direct(['--workspace', 'docs', '--json']).status, 0);
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: the same input prints the same output twice, and nothing is written', () => {
        const dir = createTempWorkspace();
        try {
            const designDir = writeRoutingFixture(dir, routingRegistry({ default: undefined }));
            leaveTaskInFlight(designDir, 'docs');
            touchFile(dir, 'apps/api/a.js');
            const before = treeDigest(dir);
            const args = [
                '--command',
                'task',
                '--text',
                'checkout flow apps/web/a.js apps/api/b.js',
                '--paths',
                'docs/x.md',
            ];
            const first = runRouting(dir, args);
            const second = runRouting(dir, args);
            assert.strictEqual(first.status, 0, first.stderr);
            assert.strictEqual(first.stdout, second.stdout);
            assert.deepStrictEqual(treeDigest(dir), before);
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: an empty --text is refused, a command typed with only a workspace runs it without --text, and every body and the context module say so', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir, routingRegistry({ default: undefined }));
            const refused = runRouting(dir, [
                '--command',
                'run',
                '--workspace',
                'docs',
                '--text',
                '',
            ]);
            assert.notStrictEqual(refused.status, 0, 'an empty value is refused');
            assert.match(refused.stderr + refused.stdout, /non-empty value/);
            const accepted = runRouting(dir, ['--command', 'run', '--workspace', 'docs']);
            assert.strictEqual(accepted.status, 0, accepted.stderr);
            assert.match(accepted.stdout, /^Workspace: docs$/m);
        } finally {
            cleanup(dir);
        }
        const engine = path.resolve(scriptsDir, '..');
        const clause = 'when it is empty `--text` is left out';
        for (const body of ['analyze', 'rule', 'run', 'spec', 'status', 'task']) {
            const text = fs.readFileSync(path.join(engine, 'workflows', `${body}.md`), 'utf8');
            assert.ok(
                text.includes(clause),
                `workflows/${body}.md says what to do with an empty request`,
            );
        }
        const context = fs.readFileSync(path.join(engine, 'references', 'context.md'), 'utf8');
        assert.ok(context.includes('leave `--text` out'), 'references/context.md says it too');
    });

    test('resolve-workspace: the words of a request that have the shape of a path are paths; URLs, versions, commands and places outside the project are not', () => {
        const dir = createTempWorkspace();
        try {
            const routing = requireFromFixture(dir, 'lib', 'workspace-routing.js');
            const text = [
                'see `apps/web/cart.js:42`, https://example.com/a/b, version 3.0.215, run /magicspec task',
                '(docs\\guide.md) e.g. README.md. also .gitignore ./apps/web/y.js apps/api/ ../up.js',
                '--paths=apps/api/z.js',
            ].join(' ');
            assert.deepStrictEqual(routing.cleanPaths(routing.extractPaths(text), dir), [
                'apps/web/cart.js',
                'docs/guide.md',
                'README.md',
                '.gitignore',
                'apps/web/y.js',
                'apps/api',
                'apps/api/z.js',
            ]);
            // An absolute path is judged against the project: inside it becomes relative, outside it is dropped.
            const inside = path.join(dir, 'apps', 'web', 'abs.js');
            const outside = path.join(os.tmpdir(), 'elsewhere', 'abs.js');
            assert.deepStrictEqual(routing.cleanPaths([inside, outside], dir), ['apps/web/abs.js']);
        } finally {
            cleanup(dir);
        }
    });

    test('resolve-workspace: the command table lists it, --help prints its usage, and an unknown option is refused before it runs', () => {
        const dir = createTempWorkspace();
        try {
            writeRoutingFixture(dir);
            const help = runRouting(dir, ['--help']);
            assert.strictEqual(help.status, 0);
            assert.match(help.stdout, /^resolve-workspace — /);
            for (const option of ['--command', '--text', '--paths', '--json']) {
                assert.ok(help.stdout.includes(option), `help names ${option}`);
            }
            assert.match(executorListing(dir), /^ {2}resolve-workspace /m);
            const refused = runRouting(dir, ['--bogus']);
            assert.strictEqual(refused.status, 1);
            assert.match(refused.stderr, /Unknown option '--bogus'/);
        } finally {
            cleanup(dir);
        }
    });
};
