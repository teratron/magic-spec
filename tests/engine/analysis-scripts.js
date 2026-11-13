// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync, spawnSync } = require('child_process');
const {
    TESTS_DIR,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    writeCanonicalCoreSpec,
    registryTable,
    requireFinalizePlan,
    writeTreeFile,
} = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 18. analyze-coverage.js — EXEMPT classification (Coverage Denominator Scope)
    // ───────────────────────────────────────────────────────────────────────────
    test('analyze-coverage.js classifies .magicspec/ state files (journals, archived phases, specifications) as EXEMPT', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
            mk('.magicspec/PLAN.md', '# Plan\n');
            mk('.magicspec/STATE.md', '# State\n');
            mk('.magicspec/archives/tasks/phase-1.md', '# Phase 1\n');
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'analyze-coverage.js',
            );
            const out = JSON.parse(
                execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }),
            );
            const byFile = new Map(out.coverage.map((c) => [c.file, c]));

            assert.strictEqual(
                byFile.get('.magicspec/PLAN.md').confidence,
                'EXEMPT',
                'PLAN.md must classify EXEMPT',
            );
            assert.strictEqual(
                byFile.get('.magicspec/STATE.md').confidence,
                'EXEMPT',
                'STATE.md must classify EXEMPT',
            );
            assert.strictEqual(
                byFile.get('.magicspec/archives/tasks/phase-1.md').confidence,
                'EXEMPT',
                'an archived phase journal must classify EXEMPT',
            );
            assert.strictEqual(
                byFile.get('.magicspec/specifications/l1-core.md').confidence,
                'EXEMPT',
                'a specification is SDD state too — not a coverage subject',
            );
            assert.strictEqual(
                byFile.get('src/main.rs').confidence,
                'EXTRACTED',
                'genuine source coverage classification is unaffected',
            );

            assert.ok(
                out.summary.exempt >= 3,
                'summary.exempt must count at least the three exempted fixture files',
            );
            assert.strictEqual(
                out.summary.total,
                out.summary.extracted +
                    out.summary.inferred +
                    out.summary.ambiguous +
                    out.summary.uncovered,
                'total must be computed from the four non-exempt buckets only',
            );
            assert.strictEqual(
                out.coverage.length,
                out.summary.total + out.summary.exempt,
                'every scanned file must land in either the denominator or the exempt count, with no overlap',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('analyze-coverage.js EXEMPT files do not move the reported coverage percentage', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n'); // EXTRACTED — establishes a non-zero, non-100% baseline
            mk('orphan.js', 'var x;\n'); // genuinely UNCOVERED — no spec references it

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'analyze-coverage.js',
            );
            const scope = '--scope=src,orphan.js,.magicspec';
            const before = JSON.parse(
                execSync(`node "${scriptPath}" --json ${scope}`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                }),
            );

            // Add EXEMPT-eligible bookkeeping files after the baseline read —
            // a wrongly-classified UNCOVERED would shift coverage_percent.
            mk('.magicspec/PLAN.md', '# Plan\n');
            mk('.magicspec/STATE.md', '# State\n');
            mk('.magicspec/archives/tasks/phase-1.md', '# Phase 1\n');
            const after = JSON.parse(
                execSync(`node "${scriptPath}" --json ${scope}`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                }),
            );

            assert.strictEqual(
                after.summary.coverage_percent,
                before.summary.coverage_percent,
                'adding EXEMPT files must not change coverage_percent',
            );
            assert.strictEqual(
                after.summary.total,
                before.summary.total,
                'adding EXEMPT files must not change the denominator',
            );
            assert.strictEqual(
                after.summary.exempt,
                before.summary.exempt + 3,
                'the three new bookkeeping files must be counted as exempt',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // Field report (engine 2.1.144) — the analysis scripts read one table, one way
    // ───────────────────────────────────────────────────────────────────────────

    // A project with one workspace `main` that declares no scope, one spec whose Canonical
    // References use the template's `| Alias | Path | Purpose |` table, and a cell holding two paths.
    const writeAliasPathFixture = (tempDir) => {
        const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
        mk(
            '.magicspec/workspace.json',
            JSON.stringify({ default: 'main', workspaces: { main: { description: 'm' } } }),
        );
        mk('.magicspec/INDEX.md', '# Index\n');
        mk('.magicspec/RULES.md', '# Rules\n');
        mk('.magicspec/.version', '1.0.0\n');
        mk(
            '.magicspec/main/INDEX.md',
            [
                '# Index',
                '',
                '## Domain Specifications',
                '',
                '| File | Description | Status | Layer | Version |',
                '| --- | --- | --- | --- | --- |',
                '| [l2-game.md](specifications/l2-game.md) | Game | Stable | 2 | 1.0.0 |',
                '',
            ].join('\n'),
        );
        mk('.magicspec/main/tasks/phase-10.md', '# Phase 10\n');
        mk(
            '.magicspec/main/specifications/l2-game.md',
            [
                '# Game',
                '',
                '## Canonical References',
                '',
                '| Alias | Path | Purpose |',
                '| --- | --- | --- |',
                '| `[ENGINE]` | `src/cli_runner.rs` | Runner |',
                '| `[GAME]` | `src/tools/game.rs`, `src/tools/game/` | Game tools |',
                '',
            ].join('\n'),
        );
        mk('src/cli_runner.rs', '// SAFETY: the runner owns the handle\nfn main() {}\n');
        mk('src/tools/game.rs', 'fn g() {}\n');
        mk('src/tools/game/mod.rs', 'fn m() {}\n');
        mk('src/lonely.rs', 'fn l() {}\n');
    };

    const runFixtureScript = (tempDir, script, args = []) =>
        execFileSync(
            process.execPath,
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', script), ...args],
            {
                cwd: tempDir,
                encoding: 'utf8',
                env: {
                    ...process.env,
                    MAGIC_DESIGN_DIR: '.magicspec/main',
                    MAGIC_WORKSPACE: 'main',
                },
            },
        );

    test('extract-rationale.js finds the Path column of an Alias/Path/Purpose table and names the covering spec', () => {
        const tempDir = createTempWorkspace();
        try {
            writeAliasPathFixture(tempDir);
            const out = JSON.parse(runFixtureScript(tempDir, 'extract-rationale.js', ['--json']));
            const safety = out.rationale.find((r) => r.file === 'src/cli_runner.rs');
            assert.ok(safety, 'the SAFETY comment is found');
            assert.strictEqual(
                safety.covered,
                true,
                'the alias column must not be read as the path',
            );
            assert.strictEqual(safety.spec, 'l2-game.md');
            assert.deepStrictEqual(out.shadow_logic, []);
        } finally {
            cleanup(tempDir);
        }
    });

    test('analyze-coverage.js registers each code span of a Path cell, and both scripts reach the same verdict', () => {
        const tempDir = createTempWorkspace();
        try {
            writeAliasPathFixture(tempDir);
            const cov = JSON.parse(runFixtureScript(tempDir, 'analyze-coverage.js', ['--json']));
            assert.deepStrictEqual(cov.shadow_specs, [], 'both paths of the cell exist');
            const byFile = new Map(cov.coverage.map((c) => [c.file, c]));
            for (const file of [
                'src/tools/game.rs',
                'src/tools/game/mod.rs',
                'src/cli_runner.rs',
            ]) {
                assert.strictEqual(byFile.get(file).confidence, 'EXTRACTED', file);
            }
            assert.strictEqual(byFile.get('src/lonely.rs').confidence, 'INFERRED');

            const rationale = JSON.parse(
                runFixtureScript(tempDir, 'extract-rationale.js', ['--json']),
            );
            assert.ok(
                rationale.rationale.every(
                    (r) => r.covered === (byFile.get(r.file).confidence !== 'UNCOVERED'),
                ),
                'extract-rationale and analyze-coverage must agree on every file',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('lib/canonical-refs.js reads a Path column wherever it stands, splits cells on spans and outer commas, and falls back to the first column', () => {
        const tempDir = createTempWorkspace();
        try {
            const { parseCanonicalRefs, splitPathCell } = requireFromFixture(
                tempDir,
                'lib',
                'canonical-refs.js',
            );
            assert.deepStrictEqual(splitPathCell('`a/b.js`, `c/`'), ['a/b.js', 'c/']);
            assert.deepStrictEqual(splitPathCell('a/b.js, c/d.js'), ['a/b.js', 'c/d.js']);
            assert.deepStrictEqual(splitPathCell('src/{a,b}/*.js, x.md'), [
                'src/{a,b}/*.js',
                'x.md',
            ]);
            assert.deepStrictEqual(splitPathCell('`a.js` (main entry)'), ['a.js']);

            const doc = (table) =>
                `# S\n\n## Canonical References\n\n${table}\n\n## Next\n\n| \`ignored.js\` | x |\n`;
            assert.deepStrictEqual(
                parseCanonicalRefs(
                    doc(
                        '| Purpose | Alias | Path |\n| --- | --- | --- |\n| p | `[A]` | `x/y.js` |',
                    ),
                ),
                ['x/y.js'],
                'the Path column is found by its header, not by its position',
            );
            assert.deepStrictEqual(
                parseCanonicalRefs(
                    doc('| File | Notes |\n| :--- | :--- |\n| `lib/a.js` | n |\n| lib/b.js | n |'),
                ),
                ['lib/a.js', 'lib/b.js'],
                'a table whose header names no Path is read through its first column',
            );
            assert.deepStrictEqual(
                parseCanonicalRefs(doc('| Path | Description |\n| `lib/a.js` | n |')),
                ['lib/a.js'],
                'a header without its separator row is still the header',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('analyze-coverage.js exempts everything under .magicspec/ from the denominator and skips links', () => {
        const tempDir = createTempWorkspace();
        try {
            writeAliasPathFixture(tempDir);
            const linkTarget = path.join(tempDir, 'src', 'tools');
            const link = path.join(tempDir, 'linked-tools');
            let linked = true;
            try {
                fs.symlinkSync(linkTarget, link, 'junction');
            } catch {
                linked = false; // no permission to create a link on this host
            }
            const cov = JSON.parse(runFixtureScript(tempDir, 'analyze-coverage.js', ['--json']));
            const byFile = new Map(cov.coverage.map((c) => [c.file, c]));
            for (const file of [
                '.magicspec/INDEX.md',
                '.magicspec/RULES.md',
                '.magicspec/workspace.json',
                '.magicspec/.version',
                '.magicspec/main/INDEX.md',
                '.magicspec/main/tasks/phase-10.md',
                '.magicspec/main/specifications/l2-game.md',
            ]) {
                assert.strictEqual(byFile.get(file)?.confidence, 'EXEMPT', `${file} is SDD state`);
            }
            assert.strictEqual(
                cov.summary.total,
                cov.summary.extracted +
                    cov.summary.inferred +
                    cov.summary.ambiguous +
                    cov.summary.uncovered,
            );
            assert.ok(
                cov.coverage
                    .filter((c) => c.confidence === 'UNCOVERED')
                    .every((c) => !c.file.startsWith('.magicspec/')),
            );
            if (linked) {
                assert.ok(!byFile.has('linked-tools'), 'a linked directory is not one more file');
                assert.ok(
                    ![...byFile.keys()].some((f) => f.startsWith('linked-tools/')),
                    'a link is not followed',
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('a workspace without scope is measured against the whole project by build-spec-graph.js and detect-communities.js', () => {
        const tempDir = createTempWorkspace();
        try {
            writeAliasPathFixture(tempDir);
            const graph = runFixtureScript(tempDir, 'build-spec-graph.js');
            const row = graph.match(
                /main: (\d+) specs, (\d+) files covered \/ (\d+) scope → ([\d.]+)%/,
            );
            assert.ok(row, `the coverage line is printed:\n${graph}`);
            assert.ok(Number(row[3]) > 0, 'the whole project is the scope');
            assert.ok(Number(row[4]) > 0, 'src/ is covered by the spec');

            const detect = runFixtureScript(tempDir, 'detect-communities.js', [
                '--include-md',
                '--threshold',
                '10',
            ]);
            assert.doesNotMatch(detect, /LOW ALIGNMENT/);
            assert.doesNotMatch(detect, /Best workspace: unassigned/);
            assert.match(detect, /main: no scope/);
            const labelled = (detect.match(/⚠ OVERSIZED/g) || []).length;
            assert.ok(
                labelled > 0,
                'the fixture must hold an oversized community, or the check below proves nothing',
            );
            assert.match(
                detect,
                new RegExp(`Oversized \\(>10%\\): ${labelled}\\b`),
                'the header counts what the labels mark',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js sends a plan of blocked tasks back to /magicspec plan from either workflow, never to a /magicspec run that would only Stall', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksPath, writePhase } = requireFinalizePlan(tempDir);
            writePhase(['- [!] [T-1A01] First task'], {
                rest: [
                    '## Detailed Tracking',
                    '',
                    '### [T-1A01] First task',
                    '',
                    '- **Status:** Blocked',
                    '- **Assignment:** Agent',
                    '',
                ],
            });
            assert.strictEqual(finalize.classifyPlanState(wsDir).kind, 'all-excluded');
            for (const workflow of ['task', 'run']) {
                const next = finalize.computeNextAction(workflow, 'engine', wsDir);
                assert.match(next, /T-1A01/, workflow);
                assert.match(next, /re-run \/magicspec plan engine$/, workflow);
                assert.doesNotMatch(next, /\/magicspec run/, workflow);
            }

            // a blocked phase file takes the same exit
            fs.writeFileSync(tasksPath, registryTable('Blocked'));
            writePhase(['- [ ] [T-1A01] First task'], { status: 'Blocked' });
            assert.strictEqual(finalize.classifyPlanState(wsDir).kind, 'blocked-phase');
            for (const workflow of ['task', 'run']) {
                const next = finalize.computeNextAction(workflow, 'engine', wsDir);
                assert.match(next, /re-run \/magicspec plan engine$/, workflow);
                assert.doesNotMatch(next, /\/magicspec run/, workflow);
            }

            // control: a plan with work to do still goes to execution
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            writePhase(['- [ ] [T-1A01] First task']);
            assert.match(finalize.computeNextAction('run', 'engine', wsDir), /^Execute T-1A01/);
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js guard names the command spellings of this engine, so a reserved command can never be written as Next Action', () => {
        const tempDir = createTempWorkspace();
        try {
            const { RESERVED_COMMAND_RE } = requireFromFixture(tempDir, 'finalize.js');
            assert.ok(RESERVED_COMMAND_RE.test('Run /magicspec spec engine to amend'));
            assert.ok(RESERVED_COMMAND_RE.test('Run /magicspec analyze'));
            assert.ok(!RESERVED_COMMAND_RE.test('Run /magicspec plan engine to plan'));
            assert.ok(
                !RESERVED_COMMAND_RE.test('Run /magicspec specify'),
                'a longer word is not the command',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // validate-hardlinks.js — the link inventory: the AGENTS family (hardlinks) and
    // the directory links of the host skills folder (l2-skill-layout.md §5.6).
    // ───────────────────────────────────────────────────────────────────────────
    test('validate-hardlinks.js checks the directory link of the skill folder and detects a copy, a link elsewhere and a missing link', () => {
        const tempDir = createTempWorkspace();
        const other = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-otherskill-'));
        try {
            // Anchor required or the AGENTS group exits fatally before the link table runs.
            fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# Agents\n');
            const link = path.join(tempDir, '.agents', 'skills', 'magicspec');
            const target = path.join(tempDir, 'skills', 'magicspec');
            const devLink = path.join(tempDir, '.agents', 'skills', 'magicspec-dev');
            const devTarget = path.join(tempDir, 'skills', 'magicspec-dev');
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.mkdirSync(devTarget, { recursive: true });
            fs.symlinkSync(devTarget, devLink, 'junction');

            const validatorScript = path.join(tempDir, 'scripts', 'validate-hardlinks.js');
            const run = (...flags) => {
                const r = spawnSync(process.execPath, [validatorScript, ...flags], {
                    cwd: tempDir,
                    encoding: 'utf8',
                });
                return {
                    failed: r.status !== 0,
                    output: String(r.stdout || '') + String(r.stderr || ''),
                };
            };

            // Control — an intact link passes and the table actually runs.
            fs.symlinkSync(target, link, 'junction');
            const intact = run();
            assert.strictEqual(intact.failed, false, intact.output);
            assert.match(
                intact.output,
                /Validating directory links/,
                'the link table must run, not be silently absent',
            );
            assert.match(intact.output, /2\/2 linked/);

            // A link that leads elsewhere is drift.
            fs.rmdirSync(link);
            fs.symlinkSync(other, link, 'junction');
            const elsewhere = run();
            assert.strictEqual(elsewhere.failed, true, 'a link to another folder must fail');
            assert.match(elsewhere.output, /Drift:.*magicspec does not lead to/);

            // A copy where the link belongs is drift: editing the host's folder would not edit the engine.
            fs.rmdirSync(link);
            fs.mkdirSync(link, { recursive: true });
            fs.writeFileSync(path.join(link, 'SKILL.md'), 'copy\n');
            const copy = run();
            assert.strictEqual(copy.failed, true, 'a copy must fail');
            assert.match(copy.output, /Drift:.*is a copy, not a link/);

            // A missing link is a warning, and an error under --strict.
            fs.rmSync(link, { recursive: true, force: true });
            const missing = run();
            assert.strictEqual(missing.failed, false, 'a missing link is a warning');
            assert.match(missing.output, /Missing:.*magicspec/);
            const strict = run('--strict');
            assert.strictEqual(strict.failed, true, 'a missing link fails under --strict');
        } finally {
            for (const name of ['magicspec', 'magicspec-dev']) {
                try {
                    fs.rmdirSync(path.join(tempDir, '.agents', 'skills', name));
                } catch {
                    /* a copy or already gone */
                }
            }
            cleanup(tempDir);
            cleanup(other);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 17. skills/magicspec/CONSTITUTION.md §1 — Fresh-Project Snapshot Ambiguity (structural)
    //     Engine Upgrade Detection is a cognitive procedure the agent follows
    //     by reading this file — no executor subcommand implements the
    //     compare/narrate logic — so coverage is structural/textual, the same
    //     precedent as T-29T01's skills/magicspec/analyze.md cognitive-instruction case.
    // ───────────────────────────────────────────────────────────────────────────
    test('skills/magicspec/CONSTITUTION.md §1 distinguishes a fresh project from an unknown-field registry', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const content = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec', 'CONSTITUTION.md'),
            'utf8',
        );

        const start = content.indexOf('## 1. Engine Upgrade Detection');
        const end = content.indexOf('### Exemptions');
        assert.ok(
            start !== -1 && end !== -1 && end > start,
            'fixture precondition: §1 section must be found',
        );
        const section = content.slice(start, end);

        // The historical defect: both causes collapsed into one `unknown`
        // bucket, and step 4 fired identically on both — including on a
        // project that was never analyzed at all.
        assert.doesNotMatch(
            section,
            /Missing file \(fresh project\) or missing field[\s\S]*?treat as `unknown`/,
            'the collapsed fresh+unknown wording must not reappear — that was the defect',
        );

        // Step 2: two named, distinct outcomes.
        assert.match(
            section,
            /Missing `\.magicspec\/INDEX\.md`[\s\S]*?treat as `fresh`/,
            'step 2 must name `fresh` for a missing registry file',
        );
        assert.match(
            section,
            /field missing[\s\S]*?treat as `unknown`/,
            'step 2 must keep `unknown` for a present-but-fieldless registry',
        );

        // Step 3: `fresh` joins the silent-proceed branch, not just an exact version match.
        assert.match(
            section,
            /local_engine == snapshot_engine`, or the result is `fresh`[\s\S]*?proceed silently/,
            'step 3 must proceed silently on `fresh` too',
        );

        // Step 4: narration fires on a real mismatch or `unknown`, never on `fresh`.
        assert.match(
            section,
            /On mismatch, or `unknown`, narrate/,
            'step 4 must narrate on mismatch or `unknown`',
        );
        assert.doesNotMatch(
            section,
            /including `unknown`/,
            'the old "(including unknown)" phrasing must be gone — fresh is now excluded from narration',
        );
    });
};
