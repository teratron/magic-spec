// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MOVE TO 4.0 (`migrate --to 4`, the stop of a move in flight, the readers of `next/`)
// ═══════════════════════════════════════════════════════════════════════════
//
// Every case runs the real scripts through the executor in a disposable consumer project that
// holds a copy of the move fixture as its state folder: a 3.x workspace `docs` whose `next/` is
// the `good` set of the document-set fixtures. The fixture is never edited in place.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TESTS_DIR, cleanup } = require('./lib/base');
const {
    SIM_SCRIPTS,
    makeSimConsumer,
    simExec,
    treeHashes,
    sameTree,
    readShipped,
    lineWith,
} = require('./lib/sim');

const FIXTURE = path.join(TESTS_DIR, 'engine', 'fixtures', 'migrate-to-4');
const FINISHED = '[migrate] docs is a 4.0 workspace.';
const ALREADY = '[migrate] docs is already a 4.0 workspace; nothing to do.';
const ABSENT = 'next/: absent — write it with /magicspec analyze first-time';
const STOPPED = 'HALT: The move of docs to 4.0 was started and not finished.';

/** A consumer project holding a copy of the fixture as its state folder, with one product file. */
const makeMoveProject = () => {
    const dir = makeSimConsumer();
    fs.cpSync(FIXTURE, path.join(dir, '.magicspec'), {
        recursive: true,
    });
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'greet.js'), "console.log('hello');\n");
    return dir;
};

/** @param {(dir: string, at: (rel: string) => string) => void} body - Runs on a fresh project. */
const onMoveProject = (body) => {
    const dir = makeMoveProject();
    try {
        body(dir, (rel) => path.join(dir, '.magicspec', ...rel.split('/')));
    } finally {
        cleanup(dir);
    }
};

const migrate = (/** @type {string} */ dir, /** @type {string[]} */ ...args) =>
    simExec(dir, [
        'migrate',
        '--to',
        '4',
        ...args,
    ]);

const linesOf = (/** @type {string} */ text) => text.split('\n').filter(Boolean);

/** A script's JSON output without the times it was made at. */
const stable = (/** @type {string} */ text) =>
    text.replace(/"(generated|generated_at|checked_at|built_at)": "[^"]*"/g, '');

/** Registers a second workspace, `web`, with a folder of its own, and changes nothing else. */
const addWeb = (
    /** @type {(rel: string) => string} */ at,
    /** @type {(registry: any) => void} */ change = () => {},
) => {
    const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
    registry.workspaces.web = {
        scope: [
            'src',
        ],
    };
    change(registry);
    fs.writeFileSync(at('workspace.json'), `${JSON.stringify(registry, null, 2)}\n`);
    fs.mkdirSync(at('web'));
};

/** What the graph, the wiki and the artifact index say about a project. */
const readerOutputs = (/** @type {string} */ dir) => {
    const run = (/** @type {string[]} */ ...args) => {
        const done = simExec(dir, args);
        assert.strictEqual(done.status, 0, `${args[0]}: ${done.stdout}${done.stderr}`);
        return stable(done.stdout);
    };
    const graph = run('build-spec-graph', '--json', '--no-cache');
    run('export-wiki');
    const wiki = path.join(dir, '.magicspec', 'graph', 'wiki');
    const { listArtifacts } = require(path.join(SIM_SCRIPTS, 'lib', 'memory-sections.js'));
    return {
        graph,
        wiki: fs
            .readdirSync(wiki)
            .sort()
            .map((name) => [
                name,
                fs.readFileSync(path.join(wiki, name), 'utf8'),
            ]),
        listed: listArtifacts(path.join(dir, '.magicspec')),
        query: run('memory-query', 'greeting', '--json'),
    };
};

/** The state folder alone: what a move changes, without the engine copy or the caches. */
const stateTree = (/** @type {string} */ dir) =>
    [
        ...treeHashes(path.join(dir, '.magicspec')),
    ].filter(([rel]) => !rel.startsWith('.cache'));

/** The state folder of a fixture copy after one uninterrupted apply. */
const movedTree = () => {
    let tree = [];
    onMoveProject((dir) => {
        assert.strictEqual(migrate(dir, '--apply').status, 0);
        tree = stateTree(dir);
    });
    return tree;
};

/** Moves entries of the workspace by hand, as an interrupted run would have. */
const moveByHand = (
    /** @type {(rel: string) => string} */ at,
    /** @type {[string, string][]} */ moves,
) => {
    for (const [from, to] of moves) {
        fs.mkdirSync(path.dirname(at(`docs/${to}`)), {
            recursive: true,
        });
        fs.renameSync(at(`docs/${from}`), at(`docs/${to}`));
    }
};

/** Every 3.x entry of the fixture's workspace, moved where the move puts it. */
const OLD_ENTRIES = [
    'INDEX.md',
    'PLAN.md',
    'RULES.md',
    'STATE.md',
    'TASKS.md',
    'specifications',
    'tasks',
];
const allOldMoved = () =>
    OLD_ENTRIES.map(
        (name) =>
            /** @type {[string, string]} */ ([
                name,
                `archives/3x/${name}`,
            ]),
    );

module.exports = () => {
    test('migrate to 4: the dry run prints each file with its place, what the reverse mode must split, the scenarios to rewrite and the state of next/, and writes nothing', () => {
        onMoveProject((dir) => {
            const before = treeHashes(dir);
            const run = migrate(dir);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.deepStrictEqual(linesOf(run.stdout), [
                'Migration to 4.0 of docs (dry run — nothing changes without --apply):',
                '  INDEX.md → archives/3x/INDEX.md',
                '  PLAN.md → plan.md',
                '  RULES.md → rules.md',
                '  STATE.md → memory/state.md, memory/goal.md',
                '  TASKS.md → stack/{stack}/tasks/M{n}.md',
                '  simulations/greeting.md → simulations/greeting.md (stays)',
                '  specifications/l1-greeting.md → spec/{key}.md, product.md',
                '  specifications/l2-greeting-cli.md → stack/{stack}/bind/{key}.md, profile.md, deps.md',
                '  tasks/phase-2.md → stack/{stack}/tasks/M{n}.md',
                '  archives/ → archives/ (stays)',
                '  split by the reverse mode: l1-greeting.md',
                '  split by the reverse mode: l2-greeting-cli.md',
                '  scenario to rewrite: simulations/greeting.md S-1',
                'next/: clean',
            ]);
            assert.ok(sameTree(before, treeHashes(dir)), 'a dry run writes nothing');
        });
    });

    test('migrate to 4: only the value 4 is taken, --host is refused beside it, and a project with no registered workspace is told to name one', () => {
        onMoveProject((dir, at) => {
            const before = treeHashes(dir);
            for (const value of [
                '5',
                '3',
            ]) {
                const run = simExec(dir, [
                    'migrate',
                    `--to=${value}`,
                    '--apply',
                ]);
                assert.strictEqual(run.status, 1, value);
                assert.strictEqual(run.stderr.trim(), '[migrate] --to takes 4.');
            }
            const hosted = migrate(dir, '--host=claude');
            assert.strictEqual(hosted.status, 1);
            assert.match(hosted.stderr, /--host belongs to the move from the 2\.x layout/);
            assert.ok(sameTree(before, treeHashes(dir)), 'a refusal writes nothing');
            fs.writeFileSync(at('workspace.json'), '{"workspaces":{}}\n');
            const none = migrate(dir);
            assert.strictEqual(none.status, 1);
            assert.match(none.stderr, /needs a workspace registered/);
        });
    });

    test('migrate to 4: with no next/, an empty one or a finding in it the apply step prints why, changes nothing and exits 1', () => {
        /** @type {[string, (at: (rel: string) => string) => void, RegExp][]} */
        const states = [
            [
                'absent',
                (at) =>
                    fs.rmSync(at('docs/next'), {
                        recursive: true,
                    }),
                new RegExp(ABSENT),
            ],
            [
                'empty',
                (at) => {
                    fs.rmSync(at('docs/next'), {
                        recursive: true,
                    });
                    fs.mkdirSync(at('docs/next'));
                },
                /next\/: 1 findings\n {2}product\.md: missing/,
            ],
            [
                'finding',
                (at) => fs.appendFileSync(at('docs/next/plan.md'), '\n<!-- left behind -->\n'),
                /next\/: 1 findings\n {2}plan\.md: /,
            ],
        ];
        for (const [name, spoil, said] of states) {
            onMoveProject((dir, at) => {
                spoil(at);
                const before = treeHashes(dir);
                const preview = migrate(dir);
                assert.strictEqual(preview.status, 0, name);
                assert.match(preview.stdout, said, name);
                const run = migrate(dir, '--apply');
                assert.strictEqual(run.status, 1, name);
                assert.match(run.stdout, said, name);
                assert.ok(sameTree(before, treeHashes(dir)), `${name}: nothing changes`);
            });
        }
    });

    test('migrate to 4: on a clean next/ the 3.x files go to archives/3x, the set into place and the format is set last; a second run does nothing', () => {
        onMoveProject((dir, at) => {
            const run = migrate(dir, '--apply');
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.strictEqual(run.stdout.trim(), FINISHED);
            for (const name of OLD_ENTRIES)
                assert.ok(fs.existsSync(at(`docs/archives/3x/${name}`)), `${name} is kept`);
            assert.deepStrictEqual(
                fs.readdirSync(at('docs')).sort(),
                [
                    'archives',
                    'memory',
                    'plan.md',
                    'product.md',
                    'rules.md',
                    'simulations',
                    'spec',
                    'tasks',
                ],
                'the workspace holds the set and the folders that stay; next/ is gone',
            );
            assert.ok(fs.existsSync(at('docs/archives/tasks/phase-1.md')), 'the archives stay');
            const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
            assert.strictEqual(registry.workspaces.docs.format, '4');
            assert.strictEqual(registry.workspaces.docs.description, 'The greeting command.');
            const checked = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(checked.status, 0, checked.stdout);
            const after = treeHashes(dir);
            for (const again of [
                migrate(dir, '--apply'),
                migrate(dir),
            ]) {
                assert.strictEqual(again.status, 0);
                assert.strictEqual(again.stdout.trim(), ALREADY);
            }
            assert.ok(sameTree(after, treeHashes(dir)), 'a second run changes nothing');
        });
    });

    test('migrate to 4: a move stopped in either half, or before the format was set, finishes in the same tree', () => {
        const expected = movedTree();
        /** @type {[string, [string, string][]][]} */
        const stops = [
            [
                'some 3.x files moved, one folder half moved',
                [
                    [
                        'INDEX.md',
                        'archives/3x/INDEX.md',
                    ],
                    [
                        'specifications/l1-greeting.md',
                        'archives/3x/specifications/l1-greeting.md',
                    ],
                ],
            ],
            [
                'the set partly moved up',
                [
                    ...allOldMoved(),
                    [
                        'next/product.md',
                        'product.md',
                    ],
                    [
                        'next/rules.md',
                        'rules.md',
                    ],
                ],
            ],
        ];
        for (const [name, moves] of stops) {
            onMoveProject((dir, at) => {
                moveByHand(at, moves);
                const preview = migrate(dir);
                assert.match(preview.stdout, /under way|partly moved/, name);
                const run = migrate(dir, '--apply');
                assert.strictEqual(run.status, 0, `${name}: ${run.stdout}${run.stderr}`);
                assert.deepStrictEqual(stateTree(dir), expected, name);
            });
        }
        onMoveProject((dir, at) => {
            assert.strictEqual(migrate(dir, '--apply').status, 0);
            const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
            delete registry.workspaces.docs.format;
            fs.writeFileSync(at('workspace.json'), `${JSON.stringify(registry, null, 2)}\n`);
            assert.strictEqual(migrate(dir, '--apply').stdout.trim(), FINISHED);
            assert.deepStrictEqual(stateTree(dir), expected, 'only the format was left');
        });
    });

    test('migrate to 4: a file of the set that would land on a file that stays stops the move before anything is moved', () => {
        onMoveProject((dir, at) => {
            fs.mkdirSync(at('docs/next/simulations'));
            fs.writeFileSync(at('docs/next/simulations/greeting.md'), '# Another\n');
            const before = treeHashes(dir);
            const run = migrate(dir, '--apply');
            assert.strictEqual(run.status, 1);
            assert.match(run.stdout, /would write over simulations\/greeting\.md/);
            assert.ok(sameTree(before, treeHashes(dir)));
        });
    });

    test('migrate to 4: while a move is unfinished every other command on the workspace stops and names it, and writes nothing', () => {
        onMoveProject((dir, at) => {
            moveByHand(at, [
                [
                    'INDEX.md',
                    'archives/3x/INDEX.md',
                ],
            ]);
            const before = treeHashes(dir);
            for (const args of [
                [
                    'check-prerequisites',
                    '--json',
                ],
                [
                    'finalize',
                    '--workflow=run',
                ],
                [
                    'resume-state',
                ],
                [
                    'sync',
                ],
            ]) {
                const run = simExec(dir, args);
                assert.strictEqual(run.status, 1, args[0]);
                assert.strictEqual(
                    run.stderr.trim(),
                    `${STOPPED} Run \`/magicspec migrate --to 4\` (by script: \`node .agents/skills/magicspec/scripts/executor.js migrate --to 4 --apply\`) to finish it.`,
                    args[0],
                );
            }
            assert.strictEqual(migrate(dir).status, 0, 'the dry run of the move runs');
            assert.strictEqual(
                simExec(dir, [
                    'resolve-workspace',
                    '--command',
                    'migrate',
                ]).status,
                0,
                'the workspace of the move is still chosen',
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'nothing is written');
            assert.strictEqual(migrate(dir, '--apply').status, 0);
        });
        onMoveProject((dir, at) => {
            fs.mkdirSync(at('docs/archives/3x'), {
                recursive: true,
            });
            fs.writeFileSync(at('docs/archives/3x/old.md'), '# Old\n');
            assert.strictEqual(
                simExec(dir, [
                    'check-prerequisites',
                    '--json',
                ]).status,
                1,
                'a file there and no format: in flight',
            );
            const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
            registry.workspaces.docs.format = '4';
            fs.writeFileSync(at('workspace.json'), JSON.stringify(registry));
            assert.strictEqual(
                simExec(dir, [
                    'check-prerequisites',
                    '--json',
                ]).status,
                0,
                'with the format set every command runs',
            );
        });
    });

    test('migrate to 4: a workspace in flight that is not the default is named by the stop, left out of resume-state --all and never written by sync', () => {
        onMoveProject((dir, at) => {
            const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
            registry.default = 'web';
            registry.workspaces.web = {
                scope: [
                    'src',
                ],
            };
            fs.writeFileSync(at('workspace.json'), `${JSON.stringify(registry, null, 2)}\n`);
            fs.mkdirSync(at('web'));
            const state = fs.readFileSync(at('docs/STATE.md'), 'utf8');
            const ledger = fs.readFileSync(at('docs/tasks/phase-2.md'), 'utf8');
            fs.writeFileSync(
                at('docs/tasks/phase-2.md'),
                ledger.replace('**Status:** Todo', '**Status:** In Progress'),
            );
            const resumed = () =>
                simExec(dir, [
                    'resume-state',
                    '--all',
                ]).stdout;
            assert.match(resumed(), /\[docs\]/, 'before the move the workspace is reported');
            moveByHand(at, [
                [
                    'INDEX.md',
                    'archives/3x/INDEX.md',
                ],
            ]);
            assert.doesNotMatch(resumed(), /\[docs\]/);
            const named = simExec(dir, [
                'check-prerequisites',
                '--workspace',
                'docs',
            ]);
            assert.strictEqual(named.status, 1);
            assert.match(named.stderr, /`\/magicspec migrate --to 4 docs`/);
            assert.match(named.stderr, /migrate --to 4 --apply --workspace docs`/);
            const before = treeHashes(dir);
            const synced = simExec(dir, [
                'sync',
            ]);
            assert.strictEqual(synced.status, 1);
            assert.match(synced.stderr, new RegExp(STOPPED));
            assert.ok(sameTree(before, treeHashes(dir)), 'sync writes nothing');
            assert.strictEqual(fs.readFileSync(at('docs/STATE.md'), 'utf8'), state);
        });
    });

    test('migrate to 4: no 3.x reader reads next/, and a folder of that name deeper down is read as any other', () => {
        const withNext = makeMoveProject();
        const without = makeMoveProject();
        try {
            fs.rmSync(path.join(without, '.magicspec', 'docs', 'next'), {
                recursive: true,
            });
            for (const args of [
                [
                    'analyze-coverage',
                    '--json',
                ],
                [
                    'detect-communities',
                    '--include-md',
                    '--json',
                ],
                [
                    'build-spec-graph',
                    '--json',
                    '--no-cache',
                ],
                [
                    'check-bloat',
                    '--json',
                ],
                [
                    'check-prerequisites',
                    '--json',
                ],
                [
                    'memory-query',
                    'greeting',
                    '--json',
                ],
            ]) {
                const [a, b] = [
                    withNext,
                    without,
                ].map((dir) => simExec(dir, args));
                assert.strictEqual(a.status, 0, `${args[0]}: ${a.stderr}`);
                assert.strictEqual(stable(a.stdout), stable(b.stdout), args[0]);
            }
            const { listArtifacts } = require(path.join(SIM_SCRIPTS, 'lib', 'memory-sections.js'));
            const stateDir = path.join(withNext, '.magicspec');
            fs.mkdirSync(path.join(stateDir, 'docs', 'archives', 'next'));
            fs.writeFileSync(path.join(stateDir, 'docs', 'archives', 'next', 'a.md'), '# A\n');
            const listed = listArtifacts(stateDir);
            const all = [
                ...listed.files,
                ...listed.unkinded,
            ];
            assert.ok(!all.some((rel) => rel.startsWith('docs/next/')), 'next/ is not indexed');
            assert.ok(all.includes('docs/archives/next/a.md'), 'a deeper folder is');
            const coverage = simExec(withNext, [
                'analyze-coverage',
                '--json',
            ]).stdout;
            assert.ok(
                coverage.includes('docs/archives/next/a.md'),
                'the project walk reads it too',
            );
            assert.ok(!coverage.includes('docs/next/'), 'and never the tree of the move');
        } finally {
            cleanup(withNext);
            cleanup(without);
        }
    });

    test('migrate to 4: the share of the project a workspace scope covers does not count the files of next/', () => {
        const shares = (/** @type {boolean} */ keep) => {
            let coverage = null;
            onMoveProject((dir, at) => {
                if (!keep)
                    fs.rmSync(at('docs/next'), {
                        recursive: true,
                    });
                const registry = JSON.parse(fs.readFileSync(at('workspace.json'), 'utf8'));
                delete registry.default;
                registry.workspaces.web = {
                    scope: [
                        'src',
                    ],
                };
                fs.writeFileSync(at('workspace.json'), JSON.stringify(registry));
                const run = simExec(dir, [
                    'resolve-workspace',
                    '--command',
                    'run',
                    '--json',
                ]);
                assert.strictEqual(run.status, 0, run.stderr);
                coverage = JSON.parse(run.stdout).coverage;
            });
            return coverage;
        };
        const counted = shares(true);
        assert.ok(counted, 'the coverage signal is what chose');
        assert.deepStrictEqual(counted, shares(false));
    });

    test('migrate to 4: the graph, the wiki and the artifact index leave out a workspace whose move is unfinished, though they run for another one, and read it again once it is moved', () => {
        const moving = makeMoveProject();
        const without = makeMoveProject();
        try {
            const at = (/** @type {string} */ dir) => (/** @type {string} */ rel) =>
                path.join(dir, '.magicspec', ...rel.split('/'));
            addWeb(at(moving), (registry) => {
                registry.default = 'web';
            });
            moveByHand(at(moving), [
                [
                    'INDEX.md',
                    'archives/3x/INDEX.md',
                ],
            ]);
            addWeb(at(without), (registry) => {
                registry.default = 'web';
                delete registry.workspaces.docs;
            });
            fs.rmSync(at(without)('docs'), {
                recursive: true,
            });
            const left = readerOutputs(moving);
            const absent = readerOutputs(without);
            for (const reader of /** @type {const} */ ([
                'graph',
                'wiki',
                'listed',
                'query',
            ]))
                assert.deepStrictEqual(left[reader], absent[reader], reader);

            const applied = migrate(moving, '--apply', '--workspace', 'docs');
            assert.strictEqual(applied.status, 0, applied.stdout + applied.stderr);
            const moved = readerOutputs(moving);
            assert.ok(moved.graph.includes('"ws:docs"'), 'the graph reads the moved workspace');
            assert.ok(
                moved.wiki.some(([name]) => name === 'workspace__docs.md'),
                'the wiki has its page',
            );
            assert.ok(
                moved.listed.files.includes('docs/product.md'),
                'the index reads its set, the 3.x files beside it or not',
            );
            assert.ok(moved.listed.files.includes('docs/archives/3x/INDEX.md'));
        } finally {
            cleanup(moving);
            cleanup(without);
        }
    });

    test('migrate to 4: the apply step leaves the global row of the moved workspace without a link to its registry and changes no other line', () => {
        onMoveProject((dir, at) => {
            const before = fs.readFileSync(at('INDEX.md'), 'utf8').split('\n');
            const run = migrate(dir, '--apply');
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            const after = fs.readFileSync(at('INDEX.md'), 'utf8').split('\n');
            assert.deepStrictEqual(
                after,
                before.map((line) => line.replace('[docs](docs/INDEX.md)', () => 'docs')),
            );
            assert.ok(after.includes('| docs | The greeting command. | 2 |'), after.join('\n'));
        });
        onMoveProject((dir, at) => {
            fs.rmSync(at('INDEX.md'));
            assert.strictEqual(
                migrate(dir, '--apply').stdout.trim(),
                FINISHED,
                'no global registry',
            );
            assert.ok(!fs.existsSync(at('INDEX.md')), 'and none is written');
        });
    });

    test('migrate to 4: sync takes the registry links out of a 4.0 row as one write, writes nothing on a second run and leaves a 3.x row linked', () => {
        onMoveProject((dir, at) => {
            assert.strictEqual(migrate(dir, '--apply').status, 0);
            addWeb(at);
            fs.writeFileSync(at('web/INDEX.md'), '# Web\n');
            const registryOf = (/** @type {string} */ name) =>
                `[${name}/INDEX.md](${name}/INDEX.md)`;
            const web = `| [web](web/INDEX.md) | The site. | 0 | ${registryOf('web')} |`;
            const linked = [
                '## Workspaces',
                '',
                '| Workspace | Description | Specs | Registry |',
                '| --- | --- | --- | --- |',
                `| [docs](docs/INDEX.md) | The greeting command. | 2 | ${registryOf('docs')} |`,
                web,
                '',
            ].join('\r\n');
            fs.writeFileSync(at('INDEX.md'), linked);
            const sync = (/** @type {string[]} */ ...args) => {
                const run = simExec(dir, [
                    'sync',
                    'registry',
                    ...args,
                ]);
                assert.strictEqual(run.status, 0, run.stdout + run.stderr);
                return run.stdout;
            };
            const written = 'registry: .magicspec/INDEX.md — docs registry link removed';
            assert.ok(sync('--dry-run').includes(written));
            assert.strictEqual(fs.readFileSync(at('INDEX.md'), 'utf8'), linked, 'a preview');
            assert.ok(sync().includes('[Sync] 1 written'));
            const repaired = linked.replace(
                `| [docs](docs/INDEX.md) | The greeting command. | 2 | ${registryOf('docs')} |`,
                () => '| docs | The greeting command. | 2 | |',
            );
            assert.strictEqual(fs.readFileSync(at('INDEX.md'), 'utf8'), repaired);
            assert.ok(sync().includes('[Sync] in sync'));
            assert.strictEqual(fs.readFileSync(at('INDEX.md'), 'utf8'), repaired);
        });
    });

    test('migrate to 4: the router row names the argument and its default, and the command help lists it from the row', () => {
        const row = lineWith(readShipped('skills/magicspec/SKILL.md'), '| `migrate` |') ?? '';
        assert.ok(
            row.includes(
                '| `--to 4` · a workspace after it (`--apply` only after consent) | optional — the move from the earlier layout | light |',
            ),
            row,
        );
        assert.ok(row.includes('or one 3.x workspace to the 4.0 document set'), row);
        const { readCommands } = require(path.join(SIM_SCRIPTS, 'lib', 'hosts.js'));
        const migrateRow = readCommands().find(
            (/** @type {{ name: string }} */ c) => c.name === 'migrate',
        );
        assert.ok(JSON.stringify(migrateRow).includes('--to 4'), JSON.stringify(migrateRow));
        onMoveProject((dir) => {
            const help = simExec(dir, [
                'migrate',
                '--help',
            ]);
            assert.match(help.stdout, /--to <value>/);
        });
    });

    test('migrate to 4: the body runs the dry run, ends the run for a set that is not ready, asks once before the moves, applies and records the built milestones', () => {
        const body = readShipped('skills/magicspec/workflows/migrate.md');
        const section = body.slice(
            body.indexOf('## The Move to 4.0'),
            body.indexOf('## Migrate Completion Checklist'),
        );
        for (const [what, needle] of [
            [
                'the routing chain',
                'resolve-workspace --command migrate',
            ],
            [
                'the dry run',
                'migrate --to 4 --workspace={active-workspace}`',
            ],
            [
                'the mark of the move',
                'Create the folder `next/`',
            ],
            [
                'the handoff to the analysis',
                'end the run naming `/magicspec analyze first-time {workspace}`',
            ],
            [
                'one question',
                'ask the consent question of Invariant 2',
            ],
            [
                'the apply only on a yes',
                'on a yes, `node scripts/executor.js migrate --to 4 --apply',
            ],
            [
                'the apply command',
                'migrate --to 4 --apply --workspace={active-workspace}',
            ],
            [
                'the built milestones',
                'mark-built M{n} --workspace={active-workspace}',
            ],
            [
                'no 3.x file before the yes',
                'no 3.x file is moved before the yes',
            ],
            [
                'the revert restores the global row too',
                '`git restore` on the workspace folder, `workspace.json` and the global `INDEX.md`',
            ],
            [
                'the revert removes the moved copies, which would read as a move in flight',
                "then delete the workspace's `archives/3x/`",
            ],
        ]) {
            assert.ok(section.toLowerCase().includes(needle.toLowerCase()), what);
        }
        assert.ok(lineWith(body, '- The Move to 4.0'), 'the contents list names the section');
        assert.ok(
            lineWith(body, '**Trigger:**')?.includes('/magicspec migrate --to 4 [workspace]'),
            'the entry says which move takes no argument',
        );
        assert.ok(
            lineWith(body, '3. **No project context**')?.includes(
                'This invariant holds for the move from the earlier layout',
            ),
        );
    });

    test('migrate to 4: the reverse mode writes into next/ during a move, and the rule says why the move keeps the drift exemption', () => {
        const analyze = readShipped('skills/magicspec/workflows/analyze.md');
        const during = lineWith(analyze, '**During a move to 4.0**') ?? '';
        for (const needle of [
            'It writes into `next/` of that workspace',
            'with the 3.x specifications of the workspace as a source beside the code',
            'migrate --to 4 --workspace={active-workspace}`',
            'no `pack`, `analyze-coverage`, wiki refresh or `mark-built` runs there before the apply step',
        ]) {
            assert.ok(during.includes(needle), needle);
        }
        assert.ok(
            lineWith(analyze, '- `first-time` —')?.includes('(its folder holds `next/`)'),
            'the argument line sends a move to the reverse mode',
        );
        assert.ok(
            lineWith(
                readShipped('skills/magicspec/CONSTITUTION.md'),
                '- `/magicspec migrate` —',
            )?.includes('before the one-time move of `--to 4` a drift line would answer nothing'),
        );
    });
};
