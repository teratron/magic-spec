// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT SET (the 4.0 workspace: checker, pack and templates)
// ═══════════════════════════════════════════════════════════════════════════
//
// Every case runs the real scripts through the executor in a disposable consumer project that
// holds one fixture set as the workspace `docs`. The fixtures are the documentation lab's four
// sets: `good` reports nothing, and `bad`, `bad3` and `bad4` report the findings of
// `golden.json`, which are the lab checker's own output on them.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TESTS_DIR, cleanup } = require('./lib/base');
const {
    SIM_SCRIPTS,
    SIM_ENGINE_REL,
    makeSimConsumer,
    simExec,
    treeHashes,
    sameTree,
} = require('./lib/sim');

const FIXTURES = path.join(TESTS_DIR, 'engine', 'fixtures', 'document-set');
const GOLDEN = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'golden.json'), 'utf8'));
const NOT_A_SET = '[check-docs] docs is not a 4.0 workspace (no "format": "4" in workspace.json).';
// The first line of every pack: the documents stay out of what the task creates.
const CONTAINMENT =
    'No address or path of these documents is written into anything this task creates; a component key is written only where the bindings use it as a name.';

/**
 * A consumer project that holds one fixture set as the workspace `docs`.
 *
 * @param {string} fixture - A folder name under `sets/`.
 * @param {{ format?: string | null }} [options] - `format: null` registers the workspace without the 4.0 format.
 * @returns {string} The project folder.
 */
const makeSetProject = (fixture, { format = '4' } = {}) => {
    const dir = makeSimConsumer();
    const registry = {
        default: 'docs',
        workspaces: {
            docs:
                format === null
                    ? {}
                    : {
                          format,
                      },
        },
    };
    fs.mkdirSync(path.join(dir, '.magicspec'), {
        recursive: true,
    });
    fs.writeFileSync(
        path.join(dir, '.magicspec', 'workspace.json'),
        `${JSON.stringify(registry, null, 2)}\n`,
    );
    fs.cpSync(path.join(FIXTURES, 'sets', fixture), path.join(dir, '.magicspec', 'docs'), {
        recursive: true,
    });
    return dir;
};

/**
 * @param {string} text - A command's output.
 * @returns {string[]} Its non-empty lines.
 */
const linesOf = (text) => text.split('\n').filter(Boolean);

// The first paragraph of every body's 4.0 section: when it is taken and what it replaces.
const SECTION_OPENING =
    'Taken when the resolved workspace\'s entry in `workspace.json` carries `"format": "4"`; the steps below replace the workflow steps above, and every other section of this body applies unchanged. On any other workspace this section is skipped.';

// What each pipeline body's 4.0 section runs, and the role it hands the work to.
const BODY_SECTIONS = [
    {
        body: 'spec',
        calls: [
            'check-docs',
        ],
        role: 'spec-critic',
    },
    {
        body: 'plan',
        calls: [
            'check-docs',
        ],
        role: 'planner',
    },
    {
        body: 'task',
        calls: [
            'check-docs',
            'pack {task}',
        ],
        role: 'planner',
    },
    {
        body: 'run',
        calls: [
            'check-docs',
            'pack {task}',
            'mark-built M{n}',
            'check-log',
        ],
        role: 'coder',
    },
];

/** A file of this repository as text. */
const repoText = (/** @type {string[]} */ ...parts) =>
    fs.readFileSync(path.join(TESTS_DIR, '..', ...parts), 'utf8');

module.exports = () => {
    for (const { body, calls, role } of BODY_SECTIONS) {
        test(`document set: the ${body} body takes its 4.0 section before the finalization and names its scripts and its role`, () => {
            const text = repoText('skills', 'magicspec', 'workflows', `${body}.md`);
            const parts = text.split('\n## On a 4.0 Workspace\n');
            assert.strictEqual(parts.length, 2, 'one 4.0 section');
            const [section, ...after] = parts[1].split('\n## ');
            assert.ok(
                after[0]?.startsWith('Finalization Protocol (Mandatory)\n'),
                'the section stands right before the finalization',
            );
            assert.ok(
                text.includes('\n- On a 4.0 Workspace\n- Finalization Protocol (Mandatory)\n'),
                'the contents list names it at the same place',
            );
            assert.strictEqual(linesOf(section)[0], SECTION_OPENING);
            for (const call of calls)
                assert.ok(
                    section.includes(
                        `node scripts/executor.js ${call} --workspace={active-workspace}`,
                    ),
                    `runs ${call}`,
                );
            assert.ok(section.includes(`@role:${role}`), `hands the work to ${role}`);
        });
    }

    test('document set: the three role cards that read a 4.0 workspace end their protocol with the line their specifications hold', () => {
        const cards = {
            'spec-critic': [
                'l2-role-cards-governance.md',
                'On a 4.0 workspace the review reads units and changes: the `check-docs` report first, then each unit against the form its template in `templates/set/` states, and each change against the three steps of `workflows/spec.md` (record, place, build).',
            ],
            planner: [
                'l2-role-cards-execution.md',
                "On a 4.0 workspace the plan is milestones and the decomposition is tasks: Needs justified, the first milestone observed by running the product, every task's pack within its budget.",
            ],
            coder: [
                'l2-role-cards-execution.md',
                "On a 4.0 workspace the builder reads its task's pack and the files of the workspace, and nothing of the documents beyond the pack.",
            ],
        };
        for (const [id, [spec, line]] of Object.entries(cards)) {
            const card = repoText('skills', 'magicspec', 'roles', `${id}.md`);
            assert.ok(
                card.includes(`\n\n${line}\n\n## Anti-patterns\n`),
                `the ${id} card ends its protocol with the line`,
            );
            assert.ok(
                repoText('.magicspec', 'engine', 'specifications', spec).includes(
                    `\n\n${line}\n\n**Anti-patterns:**\n`,
                ),
                `the ${id} mirror holds it`,
            );
        }
    });

    test('document set: the builder of the run body is given the pack file and the workspace, nothing else of the documents', () => {
        const run = repoText('skills', 'magicspec', 'workflows', 'run.md');
        assert.ok(
            run.includes(
                'receives the pack file the command names and the workspace, and reads nothing else of the documents.',
            ),
        );
    });

    test('document set: the good fixture has no finding and check-docs exits 0', () => {
        const dir = makeSetProject('good');
        try {
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.deepStrictEqual(linesOf(r.stdout), []);
            assert.match(r.stderr, /13 addresses, 1 tasks, largest pack \d+ tokens, 0 findings/);
        } finally {
            cleanup(dir);
        }
    });

    for (const fixture of [
        'bad',
        'bad3',
        'bad4',
    ]) {
        test(`document set: the ${fixture} fixture gives its recorded findings, verbatim, and exits 1`, () => {
            const dir = makeSetProject(fixture);
            try {
                const r = simExec(dir, [
                    'check-docs',
                ]);
                assert.strictEqual(r.status, 1, r.stderr);
                assert.deepStrictEqual(linesOf(r.stdout), GOLDEN[fixture]);
                assert.match(r.stderr, new RegExp(`${GOLDEN[fixture].length} findings`));
            } finally {
                cleanup(dir);
            }
        });
    }

    // A rule names the milestone it applies from only once there is a plan.
    const NO_FROM = (/** @type {string} */ rule) =>
        `rules.md: ${rule} has no From, while plan.md defines milestones`;

    /**
     * Rewrites one file of the set held by a project, failing if the text it replaces is not there.
     *
     * @param {string} dir - The project.
     * @param {string} rel - The path under the workspace `docs`.
     * @param {string} from
     * @param {string} to
     */
    const rewriteSet = (dir, rel, from, to) => {
        const full = path.join(dir, '.magicspec', 'docs', rel);
        const text = fs.readFileSync(full, 'utf8');
        assert.ok(text.includes(from), `${rel} holds the text to replace: ${from}`);
        fs.writeFileSync(
            full,
            text.replace(from, () => to),
        );
    };

    test('document set: a rule without From is no finding while the plan defines no milestone', () => {
        const dir = makeSetProject('good');
        try {
            rewriteSet(dir, 'rules.md', '- From: M1\n', '');
            fs.writeFileSync(path.join(dir, '.magicspec', 'docs', 'plan.md'), '# Plan\n');
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.ok(
                !r.stdout.includes('From'),
                `no From finding before there is a milestone:\n${r.stdout}`,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a rule without From beside a milestone is one finding per rule', () => {
        const dir = makeSetProject('good');
        try {
            rewriteSet(dir, 'rules.md', '- From: M1\n', '');
            fs.appendFileSync(
                path.join(dir, '.magicspec', 'docs', 'rules.md'),
                '\n## R2 — Write tests\n\nEvery behaviour has a test.\n\n- Applies to: all\n- Checked by: review\n- Why: proof\n',
            );
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(r.status, 1, r.stderr);
            assert.deepStrictEqual(linesOf(r.stdout), [
                NO_FROM('R1'),
                NO_FROM('R2'),
            ]);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: an empty library list and a profile with no stack component write "- none"', () => {
        const dir = makeSetProject('good');
        try {
            const stack = path.join(dir, '.magicspec', 'docs', 'stack', 'generic');
            fs.mkdirSync(stack, {
                recursive: true,
            });
            fs.writeFileSync(
                path.join(stack, 'profile.md'),
                '# Stack: generic\n\n## Components\n\n- none\n\n## Vocabulary\n\nzzqword\n',
            );
            const deps = path.join(stack, 'deps.md');
            fs.writeFileSync(deps, '# Libraries: generic\n\n- none\n');
            const empty = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(empty.status, 0, empty.stdout);
            assert.deepStrictEqual(linesOf(empty.stdout), []);
            // A library line in the same file is read: it names a product item that is not there.
            fs.writeFileSync(
                deps,
                '# Libraries: generic\n\n- X1 libfoo 1.0 — realizes P99 — for hello\n',
            );
            const named = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(named.status, 1, named.stderr);
            assert.match(named.stdout, /X1 realizes names P99, which is not defined/);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a stack rule with "Realizes: —" needs no neutral rule', () => {
        const dir = makeSetProject('good');
        try {
            const rules = path.join(dir, '.magicspec', 'docs', 'stack', 'generic', 'rules.md');
            fs.mkdirSync(path.dirname(rules), {
                recursive: true,
            });
            const stackRule = (/** @type {string} */ realizes) =>
                `# Stack rules: generic\n\n## S1 — Header line\n\nEvery source file starts with the header line.\n\n- Applies to: all\n- Checked by: review\n- Realizes: ${realizes}\n- Why: one form everywhere\n`;
            fs.writeFileSync(rules, stackRule('—'));
            const own = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(own.status, 0, own.stdout);
            assert.deepStrictEqual(linesOf(own.stdout), []);
            // The same rule naming a rule that is not there is reported, so the file is read.
            fs.writeFileSync(rules, stackRule('R9'));
            const missing = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(missing.status, 1, missing.stderr);
            assert.match(missing.stdout, /S1 Realizes names R9, which is not defined/);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a workspace without "format": "4" prints one line, exits 0 and changes nothing', () => {
        const dir = makeSetProject('bad', {
            format: null,
        });
        try {
            const before = treeHashes(dir);
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.strictEqual(r.stdout.trim(), NOT_A_SET);
            assert.ok(sameTree(before, treeHashes(dir)), 'the run wrote into the project');
        } finally {
            cleanup(dir);
        }
    });

    test('document set: --budget sets the budget of the computed units of a pack', () => {
        const dir = makeSetProject('good');
        try {
            const r = simExec(dir, [
                'check-docs',
                '--budget',
                '50',
            ]);
            assert.strictEqual(r.status, 1, r.stderr);
            const lines = linesOf(r.stdout);
            assert.strictEqual(lines.length, 1);
            assert.match(lines[0], /^M\d+\.T\d+: computed pack is \d+ tokens, budget 50$/);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: check-docs reads the workspace the executor resolved', () => {
        const dir = makeSetProject('good');
        try {
            const registry = {
                default: 'docs',
                workspaces: {
                    docs: {
                        format: '4',
                    },
                    api: {},
                },
            };
            fs.writeFileSync(
                path.join(dir, '.magicspec', 'workspace.json'),
                `${JSON.stringify(registry, null, 2)}\n`,
            );
            fs.mkdirSync(path.join(dir, '.magicspec', 'api'), {
                recursive: true,
            });
            const api = simExec(dir, [
                'check-docs',
                '--workspace',
                'api',
            ]);
            assert.strictEqual(api.status, 0, api.stderr);
            assert.strictEqual(
                api.stdout.trim(),
                '[check-docs] api is not a 4.0 workspace (no "format": "4" in workspace.json).',
            );
            const docs = simExec(dir, [
                'check-docs',
                '--workspace=docs',
            ]);
            assert.strictEqual(docs.status, 0, docs.stderr);
            assert.match(docs.stderr, /0 findings/);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: the scripts require nothing outside the skill folder (layer boundary)', () => {
        for (const script of [
            'check-docs.js',
            'pack.js',
            path.join('lib', 'count-tokens.js'),
        ]) {
            const source = fs.readFileSync(path.join(SIM_SCRIPTS, script), 'utf8');
            const specifiers = [
                ...source.matchAll(/require\('([^']+)'\)/g),
            ].map((m) => m[1]);
            for (const specifier of specifiers) {
                assert.ok(
                    specifier.startsWith('node:') || /^\.\.?\/(lib\/)?[\w-]+$/.test(specifier),
                    `${script} requires ${specifier}`,
                );
            }
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // pack: the computed context of one task
    // ───────────────────────────────────────────────────────────────────────

    /**
     * Writes a file of a fixture project.
     *
     * @param {string} dir - The project.
     * @param {string} rel - The path under it.
     * @param {string} text
     * @param {boolean} [append] - Add to the file instead of replacing it.
     */
    const writeIn = (dir, rel, text, append = false) => {
        const full = path.join(dir, rel);
        fs.mkdirSync(path.dirname(full), {
            recursive: true,
        });
        if (append) fs.appendFileSync(full, text);
        else fs.writeFileSync(full, text);
    };

    const PACK_FILE = path.join('.magicspec', '.cache', 'packs', 'docs');

    test('document set: pack writes the units of a task in the order of the concept and prints its size against the budget', () => {
        const dir = makeSetProject('good');
        try {
            const r = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.match(
                r.stdout,
                /^M2\.T1: pack \d+ \/ 10000 tokens \(5 units, 0 by reference\); done before 0 tokens; file \d+ tokens$/m,
            );
            assert.match(r.stdout, /written to \.magicspec\/\.cache\/packs\/docs\/M2\.T1\.md/);
            const body = fs.readFileSync(path.join(dir, PACK_FILE, 'M2.T1.md'), 'utf8');
            assert.ok(body.startsWith(`${CONTAINMENT}\n\n# Task M2.T1\n`));
            const units = [
                ...body.matchAll(/<!-- unit (\S+)/g),
            ].map((m) => m[1]);
            assert.deepStrictEqual(units, [
                'hello',
                'map:core',
                'hello.1',
                'R1',
                'D1',
            ]);
            assert.ok(body.indexOf('# Context') < body.indexOf('<!-- unit hello -->'));
            assert.ok(!body.includes('# Done before this task'));
        } finally {
            cleanup(dir);
        }
    });

    /**
     * @param {string} dir - The project.
     * @returns {string} The size of the largest computed pack, as the checker reports it.
     */
    const largestPack = (dir) => {
        const checked = simExec(dir, [
            'check-docs',
        ]);
        const largest = /1 tasks, largest pack (\d+) tokens/.exec(checked.stderr);
        assert.ok(largest, checked.stderr);
        return largest[1];
    };

    /**
     * Packs the one task of the `good` set and reads what was written.
     *
     * @param {string} dir - The project.
     * @returns {{ units: string, file: number, body: string }} The printed sizes and the pack.
     */
    const packTask = (dir) => {
        const r = simExec(dir, [
            'pack',
            'M2.T1',
        ]);
        assert.strictEqual(r.status, 0, r.stderr);
        const printed = /pack (\d+) \/ 10000 tokens .* file (\d+) tokens/.exec(r.stdout);
        assert.ok(printed, r.stdout);
        return {
            units: printed[1],
            file: Number(printed[2]),
            body: fs.readFileSync(path.join(dir, PACK_FILE, 'M2.T1.md'), 'utf8'),
        };
    };

    test('document set: every pack opens with the line that keeps the documents out of the product, outside its computed units', () => {
        const dir = makeSetProject('good');
        try {
            const largest = largestPack(dir);
            const { units, file, body } = packTask(dir);
            // The checker measures the computed units alone: the line adds to the file, not to them.
            assert.strictEqual(units, largest);
            assert.ok(file > Number(units));
            assert.deepStrictEqual(body.split('\n').slice(0, 3), [
                CONTAINMENT,
                '',
                '# Task M2.T1',
            ]);
            assert.strictEqual(body.split(CONTAINMENT).length, 2, 'the line is written once');
        } finally {
            cleanup(dir);
        }
    });

    /**
     * Moves the task file of the `good` set under a stack, where a set with a stack layer keeps it.
     *
     * @param {string} dir - The project.
     * @param {string} stack
     */
    const putTasksUnder = (dir, stack) => {
        const ws = path.join(dir, '.magicspec', 'docs');
        const tasks = path.join(ws, 'stack', stack, 'tasks');
        fs.mkdirSync(tasks, {
            recursive: true,
        });
        fs.renameSync(path.join(ws, 'tasks', 'M2.md'), path.join(tasks, 'M2.md'));
    };

    test('document set: a pack carries the tools of its stack after the first line, outside its computed units', () => {
        const dir = makeSetProject('good');
        try {
            putTasksUnder(dir, 'rust');
            const profile = '.magicspec/docs/stack/rust/profile.md';
            const rest = '## Notions\n\n- the rest of the profile\n';
            writeIn(
                dir,
                profile,
                `# Stack: rust\n\n## Tools\n\nRust 1.80 with its test runner.\n\n- a second line\n\n${rest}`,
            );
            const largest = largestPack(dir);
            const withTools = packTask(dir);
            assert.deepStrictEqual(withTools.body.split('\n').slice(0, 9), [
                CONTAINMENT,
                '',
                '# Tools of the stack',
                '',
                'Rust 1.80 with its test runner.',
                '',
                '- a second line',
                '',
                '# Task M2.T1',
            ]);
            assert.ok(!withTools.body.includes('the rest of the profile'));
            assert.strictEqual(withTools.units, largest, 'the tools are no computed unit');
            // A profile without the section gives no section and no line about it.
            writeIn(dir, profile, `# Stack: rust\n\n${rest}`);
            const without = packTask(dir);
            assert.ok(without.body.startsWith(`${CONTAINMENT}\n\n# Task M2.T1\n`));
            assert.ok(!without.body.includes('# Tools of the stack'));
            assert.strictEqual(without.units, withTools.units);
            assert.ok(without.file < withTools.file);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a pack holds the interface of the binding of the component it builds', () => {
        const dir = makeSetProject('good');
        try {
            putTasksUnder(dir, 'rust');
            writeIn(
                dir,
                '.magicspec/docs/stack/rust/bind/hello.md',
                '# hello — binding for rust\n\n## Interface\n\nThe module `hello`, exported at the root of the library.\n\n## Units\n\n### hello.b1 — a unit nothing names\n\n- Defines: unnamed_helper\n- Visibility: internal\n- Realizes: —\n- Accept: compiles\n',
            );
            const { body } = packTask(dir);
            // The preamble of the built component: its behaviour text, then its binding's.
            const preamble = body.split('<!-- unit hello -->')[1].split('<!-- unit ')[0];
            const behaviour = preamble.indexOf('## Contract');
            const binding = preamble.indexOf('exported at the root of the library');
            assert.ok(behaviour >= 0 && binding > behaviour, preamble);
            assert.ok(preamble.includes('## Interface'));
            assert.ok(!body.includes('a unit nothing names'), 'only the preamble comes with it');
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a stack word matches whole and in any letter case, and a component key never', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(
                dir,
                '.magicspec/docs/stack/rust/profile.md',
                '# Stack: rust\n\n## Vocabulary\n\ncrate, hello\n',
            );
            writeIn(
                dir,
                '.magicspec/docs/spec/hello.md',
                '\nA CRATE holds it; a crates, a supercrate and a crate-like name do not.\n',
                true,
            );
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(r.status, 1, r.stderr);
            assert.deepStrictEqual(
                linesOf(r.stdout).filter((line) => line.includes('stack vocabulary')),
                [
                    'spec/hello.md: stack vocabulary in the neutral layer — crate ×1',
                ],
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a comment left in a neutral file is one finding for that file, and none in a stack file', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(dir, '.magicspec/docs/spec/hello.md', '\n<!-- one -->\n\n<!-- two -->\n', true);
            // A comment opener written as data is no comment, and a stack file may keep its notes.
            writeIn(dir, '.magicspec/docs/plan.md', '\nThe opener `<!--` is data here.\n', true);
            writeIn(
                dir,
                '.magicspec/docs/stack/rust/profile.md',
                '# Stack: rust\n\n<!-- guidance -->\n',
            );
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(r.status, 1, r.stderr);
            assert.deepStrictEqual(linesOf(r.stdout), [
                'spec/hello.md: a template comment left in a neutral document',
            ]);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a value shaped like an address is a literal in a code span and a reference when bare', () => {
        const dir = makeSetProject('good');
        try {
            const spec = '.magicspec/docs/spec/hello.md';
            const check = () =>
                simExec(dir, [
                    'check-docs',
                ]);
            writeIn(dir, spec, '\nThe byte `C3`, the road `M1` and ``a `C9` b`` are data.\n', true);
            const literal = check();
            assert.strictEqual(literal.status, 0, literal.stdout);
            assert.deepStrictEqual(linesOf(literal.stdout), []);
            writeIn(dir, spec, '\nThe byte C3 is bare.\n', true);
            const bare = check();
            assert.strictEqual(bare.status, 1, bare.stderr);
            assert.deepStrictEqual(linesOf(bare.stdout), [
                'spec/hello.md: hello.1 mentions C3, which is not defined',
            ]);
            // A component key an Observed by names in backticks is still read.
            rewriteSet(
                dir,
                'plan.md',
                'Observed by: `cargo check` of core',
                'Observed by: `cargo check` of core and `hello`',
            );
            assert.ok(
                linesOf(check().stdout).some((line) =>
                    line.startsWith('plan.md: M1 is observed through hello, closed by M2'),
                ),
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a pack over the budget is written and says so, and the checker reports the same task', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(
                dir,
                '.magicspec/docs/memory/decisions.md',
                `\n${'filler '.repeat(6000)}\n`,
                true,
            );
            const r = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.match(r.stdout, /over the budget by \d+/);
            assert.ok(fs.existsSync(path.join(dir, PACK_FILE, 'M2.T1.md')));
            const check = simExec(dir, [
                'check-docs',
            ]);
            assert.strictEqual(check.status, 1);
            assert.match(check.stdout, /^M2\.T1: computed pack is \d+ tokens, budget 10000$/m);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: --include adds a file as built under Done before this task, and refuses a file outside the project', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(dir, 'src/hello.rs', 'fn main() {}\n');
            const r = simExec(dir, [
                'pack',
                'M2.T1',
                '--include',
                'src/hello.rs',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            const body = fs.readFileSync(path.join(dir, PACK_FILE, 'M2.T1.md'), 'utf8');
            assert.match(
                body,
                /# Done before this task\n\n## As built: `src\/hello\.rs`\n\n```rs\nfn main\(\) \{\}\n```/,
            );
            for (const bad of [
                'nope.rs',
                '../outside.rs',
            ]) {
                const refused = simExec(dir, [
                    'pack',
                    'M2.T1',
                    '--include',
                    bad,
                ]);
                assert.strictEqual(refused.status, 1, bad);
                assert.match(refused.stderr, /--include .*: not a file inside the project/);
            }
        } finally {
            cleanup(dir);
        }
    });

    test('document set: Done before this task holds the files the earlier tasks create, as built', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(
                dir,
                '.magicspec/docs/tasks/M2.md',
                [
                    '',
                    '## M2.T2 — Describe greet',
                    '',
                    '- Goal: describe the greeting',
                    '- Priority: must',
                    '- After: M2.T1',
                    '- Builds: hello',
                    '- Consumes: map:core',
                    '- Context: hello.1',
                    '- Produces: —',
                    '- Creates: docs and its test',
                    '- Done when: the text exists — Observe: unit test',
                    '',
                ].join('\n'),
                true,
            );
            const before = simExec(dir, [
                'pack',
                'M2.T2',
            ]);
            assert.strictEqual(before.status, 0, before.stderr);
            assert.match(before.stdout, /done before 0 tokens/, 'nothing is built yet');
            writeIn(dir, 'src/hello.rs', 'fn main() { println!("hello"); }\n');
            const after = simExec(dir, [
                'pack',
                'M2.T2',
            ]);
            assert.strictEqual(after.status, 0, after.stderr);
            const body = fs.readFileSync(path.join(dir, PACK_FILE, 'M2.T2.md'), 'utf8');
            assert.match(body, /## As built: `src\/hello\.rs`/);
            assert.match(body, /println!\("hello"\)/);
            const first = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.match(
                first.stdout,
                /done before 0 tokens/,
                'a task sees no file of a later one',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: a task of a milestone that revises its component also gets the component as built before it', () => {
        const dir = makeSetProject('good');
        try {
            writeIn(dir, 'src/hello.rs', 'fn main() {}\n');
            writeIn(
                dir,
                '.magicspec/docs/memory/map.md',
                '| map:hello | src/hello.rs | hello.1 |\n',
                true,
            );
            writeIn(
                dir,
                '.magicspec/docs/plan.md',
                [
                    '',
                    '## M3 — Louder greeting',
                    '',
                    '- Priority: should',
                    '- Works after it: the greeting is louder',
                    '- Observed by: a unit test of hello',
                    '- Needs: M2',
                    '- Revises: hello — the greeting is louder',
                    '',
                ].join('\n'),
                true,
            );
            writeIn(
                dir,
                '.magicspec/docs/tasks/M3.md',
                [
                    '# M3 — Louder greeting tasks',
                    '',
                    '## M3.T1 — Make greet louder',
                    '',
                    '- Goal: print the greeting louder',
                    '- Priority: should',
                    '- After: —',
                    '- Builds: hello',
                    '- Consumes: map:core',
                    '- Context: hello.1',
                    '- Produces: —',
                    '- Creates: src/hello.rs and its unit test',
                    '- Done when: the output is loud — Observe: unit test',
                    '',
                ].join('\n'),
            );
            const r = simExec(dir, [
                'pack',
                'M3.T1',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            const body = fs.readFileSync(path.join(dir, PACK_FILE, 'M3.T1.md'), 'utf8');
            assert.match(body, /# Done before this task\n\n## As built: `src\/hello\.rs`/);
            const other = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.match(
                other.stdout,
                /done before 0 tokens/,
                'a milestone that does not revise gets none',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: pack names a task that is not in the set, takes no task as a usage error, and on a 3.x workspace prints its one line', () => {
        const dir = makeSetProject('good');
        try {
            const unknown = simExec(dir, [
                'pack',
                'M9.T9',
            ]);
            assert.strictEqual(unknown.status, 1);
            assert.match(unknown.stderr, /\[pack\] Task M9\.T9 not found in docs\./);
            const none = simExec(dir, [
                'pack',
            ]);
            assert.strictEqual(none.status, 1);
            assert.match(none.stderr, /Usage: pack <task>/);
            assert.ok(!fs.existsSync(path.join(dir, PACK_FILE)), 'a failed run writes no pack');
            writeIn(
                dir,
                '.magicspec/workspace.json',
                '{"default":"docs","workspaces":{"docs":{}}}\n',
            );
            const old = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.strictEqual(old.status, 0, old.stderr);
            assert.strictEqual(
                old.stdout.trim(),
                '[pack] docs is not a 4.0 workspace (no "format": "4" in workspace.json).',
            );
            assert.ok(!fs.existsSync(path.join(dir, PACK_FILE)));
        } finally {
            cleanup(dir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // the scripts of the pipeline: mark-built, check-log, and the 4.0 branches
    // ───────────────────────────────────────────────────────────────────────

    const docsFile = (/** @type {string} */ dir, /** @type {string} */ rel) =>
        path.join(dir, '.magicspec', 'docs', rel);
    const readDocs = (/** @type {string} */ dir, /** @type {string} */ rel) =>
        fs.readFileSync(docsFile(dir, rel), 'utf8');

    test('document set: mark-built records a milestone, revisions and changes, and a second run writes nothing', () => {
        const dir = makeSetProject('good');
        try {
            rewriteSet(
                dir,
                'spec/hello.md',
                '- Accept: the output is "hello"',
                '- Accept: the output is "hello"\n- Rev: 2 — C1\n- Was (rev 1): `greet()` printed "hi".',
            );
            writeIn(
                dir,
                '.magicspec/docs/changes.md',
                '# Changes\n\n## C1 — Greet with hello\n\n- Source: owner\n- Kind: revision\n- Status: placed\n- Affects: hello.1\n- Changes: the greeting\n- Built by: M2\n- Evidence: none found\n- Why: clarity\n',
            );
            const r = simExec(dir, [
                'mark-built',
                'M2',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.strictEqual(
                r.stdout.trim(),
                'M2 built: map 1 rows, 1 changes built, 1 Was lines removed',
            );
            assert.match(readDocs(dir, 'memory/state.md'), /^- Done: M2 — the greeting prints$/m);
            assert.match(readDocs(dir, 'memory/map.md'), /^\| map:hello \| src \| hello\.1@2 \|$/m);
            assert.match(readDocs(dir, 'changes.md'), /^- Status: built$/m);
            assert.ok(!readDocs(dir, 'spec/hello.md').includes('- Was (rev 1)'));
            const before = treeHashes(dir);
            assert.strictEqual(
                simExec(dir, [
                    'mark-built',
                    'M2',
                ]).status,
                0,
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'a second run changed the set');
            const unknown = simExec(dir, [
                'mark-built',
                'M9',
            ]);
            assert.strictEqual(unknown.status, 1);
            assert.match(unknown.stderr, /M9 is not a milestone of plan\.md/);
            assert.ok(sameTree(before, treeHashes(dir)), 'an unknown milestone wrote');
        } finally {
            cleanup(dir);
        }
    });

    test('document set: the map row of mark-built names files, never the task an extends marker names', () => {
        const dir = makeSetProject('good');
        try {
            rewriteSet(
                dir,
                'tasks/M2.md',
                '- Creates: src/hello.rs',
                '- Creates: `src/hello.rs` (extends M2.T1)',
            );
            writeIn(
                dir,
                '.magicspec/docs/memory/map.md',
                '# Map\n\n| Address | Where (path) | API (interface files and manifest) | Provides (addresses) |\n| --- | --- | --- | --- |\n',
            );
            const r = simExec(dir, [
                'mark-built',
                'M2',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            assert.match(
                readDocs(dir, 'memory/map.md'),
                /^\| map:hello \| src \| hello\.rs \| hello\.1 \|$/m,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: check-log passes a change history in order and reports one that goes back', () => {
        const dir = makeSetProject('good');
        const git = (/** @type {string[]} */ ...args) =>
            require('child_process').execFileSync('git', args, {
                cwd: dir,
                stdio: [
                    'ignore',
                    'pipe',
                    'ignore',
                ],
            });
        try {
            const none = simExec(dir, [
                'check-log',
            ]);
            assert.strictEqual(none.status, 0, none.stderr);
            assert.match(none.stdout, /no committed history/);
            git('init', '-q');
            git('config', 'user.email', 'harness@example.invalid');
            git('config', 'user.name', 'harness');
            const commit = (/** @type {string} */ status) => {
                writeIn(
                    dir,
                    '.magicspec/docs/changes.md',
                    `# Changes\n\n## C1 — A change\n\n- Kind: addition\n- Status: ${status}\n- Built by: M2\n`,
                );
                git('add', '-A');
                git('commit', '-q', '-m', status);
            };
            for (const status of [
                'open',
                'placed',
                'built',
            ])
                commit(status);
            const ordered = simExec(dir, [
                'check-log',
            ]);
            assert.strictEqual(ordered.status, 0, ordered.stdout);
            assert.strictEqual(
                ordered.stdout.trim(),
                'check-log: 1 changes, no status out of order',
            );
            commit('placed');
            const back = simExec(dir, [
                'check-log',
            ]);
            assert.strictEqual(back.status, 1, back.stdout);
            assert.strictEqual(back.stdout.trim(), 'changes.md: C1 was built before placed');
        } finally {
            cleanup(dir);
        }
    });

    test('document set: check-prerequisites reports the checker in place of the registry on a 4.0 workspace', () => {
        for (const fixture of [
            'bad',
            'good',
        ]) {
            const dir = makeSetProject(fixture);
            try {
                // A registry left beside the set is not read: its Draft row would be a SPEC_STATUS finding.
                writeIn(
                    dir,
                    '.magicspec/docs/INDEX.md',
                    '# Registry\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n| [a.md](specifications/a.md) | a | Draft | 1 | 0.1.0 |\n',
                );
                const r = simExec(dir, [
                    'check-prerequisites',
                    '--json',
                    '--require-plan',
                    '--require-tasks',
                    '--verify-headers',
                ]);
                const out = JSON.parse(r.stdout);
                assert.deepStrictEqual(out.missing_required, [], fixture);
                const types = new Set(
                    out.warnings.map((/** @type {{type: string}} */ w) => w.type),
                );
                for (const registry of [
                    'SYNC_GAP',
                    'ORPHANED_SPEC',
                    'SPEC_STATUS',
                ])
                    assert.ok(!types.has(registry), `${fixture}: ${registry}`);
                const docSet = out.warnings.filter(
                    (/** @type {{type: string}} */ w) => w.type === 'DOC_SET',
                );
                assert.deepStrictEqual(
                    docSet.map((/** @type {{message: string}} */ w) => w.message),
                    GOLDEN[fixture] ?? [],
                );
            } finally {
                cleanup(dir);
            }
        }
    });

    test('document set: resume-state reads memory/state.md on a 4.0 workspace, and is silent with nothing in flight', () => {
        const dir = makeSetProject('good');
        try {
            const resume = () =>
                simExec(dir, [
                    'resume-state',
                    '--all',
                ]).stdout.trim();
            assert.strictEqual(resume(), '▶ Resume [docs]: Now M2.T1 · Next M2.T1 · Open 0');
            writeIn(
                dir,
                '.magicspec/docs/memory/state.md',
                '# State\n\n- Done: M1 — shared types compile\n- Next: M2.T1\n- Open: —\n',
            );
            assert.strictEqual(resume(), '');
        } finally {
            cleanup(dir);
        }
    });

    test('document set: finalize writes the next ready task into memory/state.md on a 4.0 workspace', () => {
        const dir = makeSetProject('good');
        try {
            const state = '.magicspec/docs/memory/state.md';
            writeIn(
                dir,
                state,
                '# State\n\n- Now: —\n- Done: M1 — shared types compile\n- Open: —\n',
            );
            const first = simExec(dir, [
                'finalize',
                '--workflow=run',
            ]);
            assert.strictEqual(first.status, 0, first.stderr);
            assert.match(readDocs(dir, 'memory/state.md'), /^- Next: M2\.T1$/m);
            assert.match(first.stdout, /^Next: \/magicspec run docs — /m);
            assert.match(first.stdout, /^\| memory\/state\.md \| updated/m);
            assert.ok(
                !fs.existsSync(docsFile(dir, 'STATE.md')),
                'a 4.0 workspace gets no STATE.md',
            );
            writeIn(dir, state, '- Done: M2.T1 — greet prints\n', true);
            simExec(dir, [
                'finalize',
                '--workflow=run',
            ]);
            assert.match(readDocs(dir, 'memory/state.md'), /^- Next: none$/m);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: finalize names the stage a 4.0 workspace waits for, never the spec command', () => {
        const dir = makeSetProject('good');
        try {
            const step = () => {
                const r = simExec(dir, [
                    'finalize',
                    '--workflow=spec',
                    '--dry-run',
                ]);
                assert.strictEqual(r.status, 0, r.stderr);
                return r.stdout.match(/### Next step\n\n(.*)\n/)?.[1];
            };
            const state = '.magicspec/docs/memory/state.md';
            writeIn(dir, state, '# State\n\n- Done: M1 — shared types compile\n');
            assert.strictEqual(step(), 'Execute M2.T1 via /magicspec run docs');
            // A placed change waits for its milestone before any task runs.
            const change = (/** @type {string} */ builtBy) =>
                writeIn(
                    dir,
                    '.magicspec/docs/changes.md',
                    `# Changes\n\n## C1 — A change\n\n- Kind: revision\n- Status: placed\n- Affects: hello.1\n- Built by: ${builtBy}\n`,
                );
            change('—');
            assert.strictEqual(
                step(),
                'Run /magicspec plan docs to add the milestones of the placed changes',
            );
            // Its milestone, once written, waits for tasks.
            writeIn(
                dir,
                '.magicspec/docs/plan.md',
                '\n## M3 — The change\n\n- Priority: must\n- Needs: M2\n- Revises: hello — the greeting\n',
                true,
            );
            change('M3');
            assert.strictEqual(step(), 'Run /magicspec task docs to write the tasks of M3');
            fs.rmSync(docsFile(dir, 'changes.md'));
            writeIn(dir, state, '- Done: M2.T1 — greet prints\n', true);
            assert.strictEqual(step(), 'Run /magicspec task docs to write the tasks of M3');
            writeIn(dir, state, '- Done: M3 — changed\n', true);
            assert.strictEqual(step(), 'Run /magicspec run docs to observe M2 and record it built');
            writeIn(dir, state, '- Done: M2 — the greeting prints\n', true);
            assert.strictEqual(step(), 'All milestones are done — nothing pending');
            // No milestone: the plan is next once the stack layer exists.
            writeIn(dir, '.magicspec/docs/plan.md', '# Plan\n');
            assert.strictEqual(step(), 'The stack layer is not written yet — nothing to plan');
            writeIn(dir, '.magicspec/docs/stack/rust/profile.md', '# Profile\n');
            assert.strictEqual(step(), 'Run /magicspec plan docs to write the milestones');
        } finally {
            cleanup(dir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // the remaining subcommands on a 4.0 workspace
    // ───────────────────────────────────────────────────────────────────────

    /** Runs a subcommand in a copy of the `good` set and returns what it printed, expecting exit 0. */
    const runGood = (/** @type {string} */ dir, /** @type {string[]} */ ...args) => {
        const r = simExec(dir, args);
        assert.strictEqual(r.status, 0, `${args.join(' ')}: ${r.stdout}${r.stderr}`);
        return r.stdout;
    };

    test('document set: build-spec-graph makes a node of every unit and an edge of every reference', () => {
        const dir = makeSetProject('good');
        try {
            // An address written in a text, and in no field, is a reference too.
            writeIn(dir, '.magicspec/docs/spec/hello.md', 'It greets as R1 says.\n', true);
            const graph = JSON.parse(runGood(dir, 'build-spec-graph', '--json'));
            const unit = graph.nodes.find((n) => n.id === 'unit:docs:hello.1');
            assert.deepStrictEqual(
                [
                    unit?.type,
                    unit?.label,
                    unit?.form,
                    unit?.layer,
                ],
                [
                    'unit',
                    'hello.1',
                    'requirement',
                    'neutral',
                ],
            );
            const edge = (
                /** @type {string} */ relation,
                /** @type {string} */ from,
                /** @type {string} */ to,
            ) => graph.edges.some((e) => e.relation === relation && e.from === from && e.to === to);
            assert.ok(edge('contains', 'ws:docs', 'unit:docs:hello.1'));
            assert.ok(edge('references', 'unit:docs:M2.T1', 'unit:docs:hello.1'), 'a field');
            assert.ok(edge('references', 'unit:docs:hello.1', 'unit:docs:R1'), 'a mention');
            assert.strictEqual(graph.analysis.summary.units, 13);
            assert.deepStrictEqual(graph.analysis.orphaned_files, [], 'a set has no coverage');
            assert.match(runGood(dir, 'build-spec-graph'), /^ {2}Units +13$/m);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: export-wiki writes an article for every document of the set', () => {
        const dir = makeSetProject('good');
        try {
            const out = runGood(dir, 'export-wiki');
            assert.match(out, /1 workspaces · 0 specs · 7 documents · 13 units · 1 index/);
            const page = (/** @type {string} */ name) =>
                fs.readFileSync(path.join(dir, '.magicspec', 'graph', 'wiki', name), 'utf8');
            assert.match(page('index.md'), /\[\[workspace__docs\|docs\]\] — 7 documents/);
            assert.match(
                page('workspace__docs.md'),
                /\[\[doc__docs__spec-hello\|spec\/hello\.md\]\] — 1 unit$/m,
            );
            const hello = page('doc__docs__spec-hello.md');
            assert.match(hello, /^## hello\.1$/m);
            assert.match(hello, /^- Referenced by: .*\[\[doc__docs__tasks-M2\|M2\.T1\]\]/m);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: memory-query cites a unit of the set by its address, with its kind', () => {
        const dir = makeSetProject('good');
        try {
            const spec = runGood(dir, 'memory-query', 'hello', '--kind', 'spec');
            assert.match(spec, /spec\/hello\.md:\d+-\d+ › ## Requirements › ### hello\.1 — Greets/);
            const plan = runGood(dir, 'memory-query', 'greeting', '--kind', 'plan');
            assert.match(plan, /plan\.md:\d+-\d+ › ## M2 — Greeting {3}\(plan,/);
            const state = runGood(dir, 'memory-query', 'shared types', '--kind', 'state');
            assert.match(state, /memory\/state\.md/);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: analyze-coverage counts the requirements a task observes', () => {
        const dir = makeSetProject('good');
        try {
            assert.strictEqual(
                runGood(dir, 'analyze-coverage').trim(),
                '1 of 1 requirements covered',
            );
            writeIn(
                dir,
                '.magicspec/docs/spec/hello.md',
                '\n### hello.2 — Silent\n\nNo other line is printed.\n\n- Accept: one line\n\n### hello.3 — Loose\n\nIt is fast.\n',
                true,
            );
            assert.strictEqual(
                runGood(dir, 'analyze-coverage').trim(),
                'hello.2: unobserved\nhello.3: unchecked\n1 of 3 requirements covered',
            );
            const { summary } = JSON.parse(runGood(dir, 'analyze-coverage', '--json'));
            assert.deepStrictEqual(summary, {
                total: 3,
                covered: 1,
                unobserved: 1,
                unchecked: 1,
            });
        } finally {
            cleanup(dir);
        }
    });

    test('document set: sync recomputes the Next line and names the stage of every finding', () => {
        const dir = makeSetProject('good');
        try {
            assert.ok(!runGood(dir, 'sync', 'registry').includes('is missing'));
            writeIn(
                dir,
                '.magicspec/docs/memory/state.md',
                '# State\n\n- Done: M1 — shared types compile\n- Next: none\n',
            );
            rewriteSet(dir, 'tasks/M2.md', ' and its unit test', '');
            rewriteSet(
                dir,
                'plan.md',
                '- Priority: must\n- Works after it: the greeting',
                '- Priority: urgent\n- Works after it: the greeting',
            );
            writeIn(dir, '.magicspec/docs/spec/hello.md', '- Open: how loud?\n', true);
            const preview = runGood(dir, 'sync', 'state', '--dry-run');
            assert.match(
                preview,
                /would write state: .*state\.md — Next line recomputed \(M2\.T1\)/,
            );
            assert.match(preview, /M2\.T1: Creates names no tests → \/magicspec task$/m);
            assert.match(preview, /plan\.md: M2 Priority is urgent → \/magicspec plan$/m);
            assert.match(preview, /which has an open question → \/magicspec spec$/m);
            assert.match(readDocs(dir, 'memory/state.md'), /^- Next: none$/m);
            runGood(dir, 'sync', 'state');
            assert.match(readDocs(dir, 'memory/state.md'), /^- Next: M2\.T1$/m);
        } finally {
            cleanup(dir);
        }
    });

    test('document set: archive-phases, update-state and generate-context write nothing on a set', () => {
        const dir = makeSetProject('good');
        try {
            const before = treeHashes(dir);
            for (const [args, line] of [
                [
                    [
                        'archive-phases',
                    ],
                    '[Archive] docs is a 4.0 workspace: done milestones stay in plan.md; nothing written.',
                ],
                [
                    [
                        'update-state',
                        '--next-action=x',
                    ],
                    '[update-state] docs is a 4.0 workspace: its state is memory/state.md; nothing written.',
                ],
                [
                    [
                        'generate-context',
                    ],
                    '[generate-context] docs is a 4.0 workspace: its documents are the set itself; nothing written.',
                ],
            ]) {
                assert.strictEqual(runGood(dir, ...args).trim(), line);
            }
            assert.strictEqual(runGood(dir, 'archive-phases', '--check').trim(), '');
            assert.ok(sameTree(before, treeHashes(dir)), 'a script wrote into the set');
        } finally {
            cleanup(dir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────
    // templates: the thirteen files a writer starts from, and the neutral writing table
    // ───────────────────────────────────────────────────────────────────────

    // The one file of the folder that is guidance for a writer and not a template of a document.
    const NEUTRAL_TABLE = 'neutral-writing.md';

    // Where each template goes in a workspace, and the field lines the checker reads from it.
    /** @type {Record<string, [string, string[]]>} */
    const TEMPLATE_PLACES = {
        'product.md': [
            'product.md',
            [],
        ],
        'rules.md': [
            'rules.md',
            [
                'Applies to',
                'From',
                'Checked by',
                'Why',
            ],
        ],
        'plan.md': [
            'plan.md',
            [
                'Priority',
                'Works after it',
                'Observed by',
                'Needs',
                'Observed after',
                'Integrates',
                'Extends',
                'Revises',
                'Closes',
            ],
        ],
        'spec.md': [
            'spec/demo.md',
            [
                'Accept',
            ],
        ],
        'profile.md': [
            'stack/generic/profile.md',
            [],
        ],
        'stack-rules.md': [
            'stack/generic/rules.md',
            [
                'Applies to',
                'Checked by',
                'Realizes',
                'Why',
            ],
        ],
        'deps.md': [
            'stack/generic/deps.md',
            [],
        ],
        'bind.md': [
            'stack/generic/bind/demo.md',
            [
                'Defines',
                'Visibility',
                'Realizes',
                'Accept',
            ],
        ],
        'tasks.md': [
            'stack/generic/tasks/M1.md',
            [
                'Goal',
                'Priority',
                'After',
                'Builds',
                'Consumes',
                'Context',
                'Produces',
                'Creates',
                'Done when',
            ],
        ],
        'state.md': [
            'memory/state.md',
            [
                'Now',
                'Done',
                'Next',
                'Open',
            ],
        ],
        'decisions.md': [
            'memory/decisions.md',
            [
                'Layer',
                'Why',
                'Affects',
                'Moves to',
            ],
        ],
        'map.md': [
            'memory/map.md',
            [],
        ],
        'changes.md': [
            'changes.md',
            [
                'Source',
                'Kind',
                'Status',
                'Affects',
                'Changes',
                'Built by',
                'Evidence',
                'Why',
            ],
        ],
    };

    test('document set: the templates hold every field line the checker reads and parse once their placeholders are filled', () => {
        const dir = makeSimConsumer();
        try {
            const templates = path.join(dir, ...SIM_ENGINE_REL.split('/'), 'templates', 'set');
            assert.deepStrictEqual(
                fs.readdirSync(templates).sort(),
                [
                    ...Object.keys(TEMPLATE_PLACES),
                    NEUTRAL_TABLE,
                ].sort(),
                'the thirteen templates of the set and the neutral writing table, and no other file',
            );
            writeIn(
                dir,
                '.magicspec/workspace.json',
                '{"default":"docs","workspaces":{"docs":{"format":"4"}}}\n',
            );
            for (const [name, [place, fields]] of Object.entries(TEMPLATE_PLACES)) {
                const text = fs.readFileSync(path.join(templates, name), 'utf8');
                for (const field of fields) {
                    assert.match(
                        text,
                        new RegExp(`^(- )?${field}: `, 'm'),
                        `${name} has a ${field} line`,
                    );
                }
                const filled = text
                    .replace(/\{n\}/g, '1')
                    .replace(/\{k\}/g, '1')
                    .replace(/\{key\}/g, 'demo')
                    .replace(/\{stack\}/g, 'generic')
                    .replace(/\{word\}/g, 'thing')
                    .replace(/\{name\}/g, 'Demo');
                writeIn(dir, path.join('.magicspec', 'docs', place), filled);
            }
            const r = simExec(dir, [
                'check-docs',
            ]);
            assert.ok(r.status === 0 || r.status === 1, r.stderr);
            const summary = /(\d+) addresses, (\d+) tasks/.exec(r.stderr);
            assert.ok(summary, `the checker ran to its summary line: ${r.stderr}`);
            assert.ok(
                Number(summary[1]) >= 12,
                `the units of the templates were read: ${summary[0]}`,
            );
            assert.strictEqual(summary[2], '1', 'the task template gave one task');
            assert.ok(
                !/does not belong here|: missing/.test(r.stdout),
                `the templates and the parser agree on the files and headings:\n${r.stdout}`,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('document set: the shipped neutral writing table is the one of the concept, word for word', () => {
        const concept = fs
            .readFileSync(
                path.join(
                    TESTS_DIR,
                    '..',
                    '.magicspec',
                    'engine',
                    'specifications',
                    'l1-sdd-document-set.md',
                ),
                'utf8',
            )
            .split('\n### 5.4 ')[0]
            .split('\n### 5.3 ')[1];
        const shipped = fs.readFileSync(
            path.join(SIM_SCRIPTS, '..', 'templates', 'set', NEUTRAL_TABLE),
            'utf8',
        );
        const linesIn = (/** @type {string} */ text) =>
            text.split('\n').map((line) => line.trimEnd());
        const rows = (/** @type {string} */ text) =>
            linesIn(text).filter((line) => line.startsWith('|'));
        assert.strictEqual(rows(shipped).length, 21, 'a header, a separator and nineteen rows');
        assert.deepStrictEqual(rows(shipped), rows(concept));
        // The paragraph that introduces the table and every paragraph after it travel with it. The
        // shipped file drops what only the specification needs: a change marker, a section pointer.
        const prose = (/** @type {string} */ text) =>
            linesIn(text).filter((line) => line && !line.startsWith('#') && !line.startsWith('|'));
        const written = (/** @type {string} */ line) =>
            line.replace(/^`\[[A-Z]+\]` /, '').replace(/ \(§[\d.]+\)(?=\.$)/, '');
        const intro = linesIn(concept)
            .find((line) => line.startsWith('**The neutral writing table.**'))
            ?.replace(/^\*\*The neutral writing table\.\*\* (?:`\[[A-Z]+\]` )?/, '');
        const lines = linesIn(concept);
        const lastRow = lines.map((line) => line.startsWith('|')).lastIndexOf(true);
        const after = prose(lines.slice(lastRow + 1).join('\n')).map(written);
        assert.strictEqual(after.length, 2, 'the review and the repeated review');
        assert.deepStrictEqual(prose(shipped), [
            intro,
            ...after,
        ]);
    });

    test('document set: the templates of the 3.x layout stay beside the set, with their own meaning', () => {
        const templates = path.join(SIM_SCRIPTS, '..', 'templates');
        for (const name of [
            'plan.md',
            'rules.md',
            'spec.md',
            'state.md',
            'tasks.md',
        ]) {
            const text = fs.readFileSync(path.join(templates, name), 'utf8');
            assert.ok(!text.includes('{key}.{n}'), `${name} is the 3.x template, not the set's`);
        }
    });

    test('document set: clean-cache lists the task packs among the rebuildable caches and removes them', () => {
        const dir = makeSetProject('good');
        try {
            assert.strictEqual(
                simExec(dir, [
                    'pack',
                    'M2.T1',
                ]).status,
                0,
            );
            const listed = simExec(dir, [
                'clean-cache',
                '--dry-run',
            ]);
            assert.strictEqual(listed.status, 0, listed.stderr);
            assert.match(listed.stdout, /\.magicspec\/\.cache\/packs\/ {2}\(1 file, /);
            assert.ok(
                fs.existsSync(path.join(dir, PACK_FILE, 'M2.T1.md')),
                'a dry run removes nothing',
            );
            const removed = simExec(dir, [
                'clean-cache',
            ]);
            assert.strictEqual(removed.status, 0, removed.stderr);
            assert.match(removed.stdout, /Removed:\n {2}\.magicspec\/\.cache\/packs\//);
            assert.ok(!fs.existsSync(path.join(dir, '.magicspec', '.cache', 'packs')));
        } finally {
            cleanup(dir);
        }
    });
};
