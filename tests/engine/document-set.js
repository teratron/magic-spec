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
    'No address or path of these documents is written into anything this task creates.';

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

module.exports = () => {
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

    test('document set: every pack opens with the line that keeps the documents out of the product, outside its computed units', () => {
        const dir = makeSetProject('good');
        try {
            const checked = simExec(dir, [
                'check-docs',
            ]);
            const largest = /1 tasks, largest pack (\d+) tokens/.exec(checked.stderr);
            assert.ok(largest, checked.stderr);
            const r = simExec(dir, [
                'pack',
                'M2.T1',
            ]);
            assert.strictEqual(r.status, 0, r.stderr);
            const printed = /pack (\d+) \/ 10000 tokens .* file (\d+) tokens/.exec(r.stdout);
            assert.ok(printed, r.stdout);
            // The checker measures the computed units alone: the line adds to the file, not to them.
            assert.strictEqual(printed[1], largest[1]);
            assert.ok(Number(printed[2]) > Number(printed[1]));
            const body = fs.readFileSync(path.join(dir, PACK_FILE, 'M2.T1.md'), 'utf8');
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
        assert.strictEqual(rows(shipped).length, 20, 'a header, a separator and eighteen rows');
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
