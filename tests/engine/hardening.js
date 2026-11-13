// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createTempWorkspace, requireFromFixture, cleanup } = require('./lib/base');
const {
    gitIn,
    writeRevalidateFixture,
    admitRevalidateFixture,
    revalidateFixtureCount,
    runScript,
    makeRootFixture,
} = require('./lib/sim');

module.exports = () => {
    // ═══════════════════════════════════════════════════════════════════════
    // 27. HARDENING — data read back from the project is data, never a command
    // ═══════════════════════════════════════════════════════════════════════

    test("a recheck takes only the engine's own variables: other keys are dropped when a finding is recorded and again when it is run (hardening)", () => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = admitRevalidateFixture(
                requireFromFixture(tempDir, 'lib', 'diagnostics.js'),
            );

            // A script that would leave a mark if a spawned node obeyed NODE_OPTIONS.
            const marker = path.join(tempDir, 'obeyed-node-options.txt');
            const preload = path.join(tempDir, 'preload.js');
            fs.writeFileSync(
                preload,
                "require('fs').writeFileSync(" + JSON.stringify(marker) + ", 'x');\n",
            );
            const hostile = {
                NODE_OPTIONS: '--require ' + preload.split(path.sep).join('/'),
                PATH: '/nowhere',
                MAGIC_FIXTURE_WARNINGS: '[]',
            };

            assert.ok(
                diagnostics.record({
                    severity: 'warning',
                    source: 'fixture',
                    code: 'KEPT',
                    message: 'recorded with a hostile environment',
                    recheck: { script: 'revalidate-fixture', args: [], env: hostile },
                }),
            );
            const stored = diagnostics.read();
            assert.deepStrictEqual(
                stored[0].recheck.env,
                { MAGIC_FIXTURE_WARNINGS: '[]' },
                'only MAGIC_ keys are stored',
            );

            // The same finding as it would be read from a file somebody else wrote.
            const survivors = diagnostics.revalidate([
                {
                    severity: 'warning',
                    source: 'fixture',
                    code: 'KEPT',
                    message: 'read back',
                    recheck: { script: 'revalidate-fixture', args: [], env: hostile },
                },
            ]);
            assert.ok(Array.isArray(survivors));
            assert.ok(
                !fs.existsSync(marker),
                'a spawned node did not obey NODE_OPTIONS from a finding',
            );
            assert.strictEqual(revalidateFixtureCount(tempDir), 1, 'the recheck itself still ran');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a finding read from the project cannot make revalidation run a script that is not a read-only checker, or carry MAGIC_ROOT or a state path outside the project (hardening)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const engine = path.join(tempDir, 'skills', 'magicspec');

            const planted = (script, env = {}) => ({
                severity: 'warning',
                source: 'fixture',
                code: 'PLANTED',
                message: 'planted',
                recheck: { script, args: [], env },
            });

            // `remove` would delete the engine folder if it were spawned; the fixture would count a run
            diagnostics.revalidate([planted('remove'), planted('revalidate-fixture')]);
            assert.ok(
                fs.existsSync(path.join(engine, '.version')),
                'the engine folder is still there',
            );
            assert.strictEqual(
                revalidateFixtureCount(tempDir),
                0,
                'a script outside the allowlist was not spawned',
            );

            // the checker itself still runs, but with neither MAGIC_ROOT nor a state path leaving the project
            admitRevalidateFixture(diagnostics);
            diagnostics.revalidate([
                planted('revalidate-fixture', {
                    MAGIC_ROOT: tempDir,
                    MAGIC_DESIGN_DIR: '../../elsewhere',
                    MAGIC_FIXTURE_WARNINGS: '[]',
                }),
            ]);
            assert.strictEqual(revalidateFixtureCount(tempDir), 1, 'an admitted script still runs');
            const stored = diagnostics.RECHECK_ENV_KEYS;
            assert.ok(
                !stored.has('MAGIC_ROOT') && stored.has('MAGIC_DESIGN_DIR'),
                'only exact names are allowed',
            );
            diagnostics.record(
                planted('revalidate-fixture', {
                    MAGIC_ROOT: 'x',
                    MAGIC_DESIGN_DIR: '../../elsewhere',
                    MAGIC_FIXTURE_WARNINGS: '[]',
                }),
            );
            assert.deepStrictEqual(diagnostics.read()[0].recheck.env, {
                MAGIC_FIXTURE_WARNINGS: '[]',
            });
        } finally {
            cleanup(tempDir);
        }
    });

    test('git is asked about a file by argument, so a file name full of shell syntax is only a name (hardening)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const marker = 'pwned-marker';
            // Valid on every platform: spaces, &, $, parentheses, ;, quotes and %.
            const name = 'weird & $(touch ' + marker + "); 'q' %PATH%.md";
            fs.writeFileSync(path.join(tempDir, name), 'one\n');
            const significance = requireFromFixture(tempDir, 'lib', 'significance.js');
            const gitUtils = requireFromFixture(tempDir, 'lib', 'git-utils.js');

            assert.strictEqual(significance.gitFileStatus(tempDir, name), 'added');
            assert.strictEqual(gitUtils.fileStatus(tempDir, name), 'added');

            gitIn(tempDir, 'add', '-A');
            gitIn(tempDir, 'commit', '-m', 'add the odd file');
            fs.appendFileSync(path.join(tempDir, name), 'two\n');
            assert.strictEqual(significance.gitFileStatus(tempDir, name), 'modified');
            assert.deepStrictEqual(significance.gitFileNumstat(tempDir, name), {
                added: 1,
                deleted: 0,
            });
            assert.deepStrictEqual(gitUtils.fileNumstat(tempDir, name), { added: 1, deleted: 0 });
            assert.ok(
                significance.gitFileDiff(tempDir, name).includes('+two'),
                'the diff of the odd name is read',
            );

            assert.ok(
                !fs.existsSync(path.join(tempDir, marker)),
                'the command inside the name was not run',
            );
            assert.ok(!fs.existsSync(path.join(process.cwd(), marker)));
        } finally {
            cleanup(tempDir);
        }
    });

    test('the graph page escapes what it embeds and what it shows, so a title cannot end the script or add markup (hardening)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const payload = '</script><img src=x onerror=alert(1)>';
            // A convention heading is text from the project's constitution, shown as a node.
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'RULES.md'),
                '## 7. Project Conventions\n\n### C9 — ' + payload + '\n\nA probe.\n',
            );
            const run = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            const html = fs.readFileSync(
                path.join(tempDir, '.magicspec', 'graph', 'graph.html'),
                'utf8',
            );

            assert.ok(
                !html.includes('<img src=x onerror'),
                'no raw markup from a title reaches the page',
            );
            assert.ok(
                html.includes('\\u003c/script\\u003e'),
                'the title is in the embedded data, escaped for the script it sits in',
            );
            assert.ok(
                html.includes('function esc('),
                'the page escapes values before it builds markup',
            );
            // Run the page's own escaper over a hostile string: what it returns cannot open a tag or an attribute.
            const escSource = /function esc\(v\) \{[\s\S]*?\n {2}\}/.exec(html);
            assert.ok(escSource, 'the escaper can be read from the page');
            // The text is the generator's own fixed source, run in an empty context with no access to the harness.
            const escaped = require('vm').runInNewContext(
                escSource[0] + "; esc('<img src=\"x\" onerror=\\'a\\'>&')",
            );
            assert.strictEqual(
                escaped,
                '&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;&amp;',
                'the escaper encodes & < > " and \'',
            );
            for (const site of [
                'esc(r.label',
                'esc(g.label',
                'esc(m.label',
                'esc(cn ? cn.label : id)',
            ]) {
                assert.ok(html.includes(site), site + ' is escaped');
            }
            assert.strictEqual(
                (html.match(/<\/script>/g) || []).length,
                (html.match(/<script/g) || []).length,
                'every script tag closes once, and only where the page does',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
