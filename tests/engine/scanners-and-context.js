// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
    TESTS_DIR,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    generateContext,
    copyStateTemplate,
    makeWorkspace,
    writeCanonicalCoreSpec,
    writeTreeFile,
} = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 10. detect-communities.js — gitignore-aware scan (Invariant 7 parity)
    // ───────────────────────────────────────────────────────────────────────────
    test('detect-communities.js excludes .gitignored directories from the scan (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            // Real design content (must always be scanned).
            const designDir = path.join(tempDir, '.magicspec');
            fs.mkdirSync(designDir, { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n');
            fs.writeFileSync(
                path.join(designDir, 'real-a.md'),
                '# Real A\n[Real B](./real-b.md)\n',
            );
            fs.writeFileSync(path.join(designDir, 'real-b.md'), '# Real B\n');

            // Fixture subtree that must vanish once `*tmp/` is gitignored.
            const tmpDir = path.join(tempDir, '.tmp');
            fs.mkdirSync(tmpDir, { recursive: true });
            fs.writeFileSync(path.join(tmpDir, 'fix-a.md'), '# Fix A\n[Fix B](./fix-b.md)\n');
            fs.writeFileSync(path.join(tmpDir, 'fix-b.md'), '# Fix B\n');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'detect-communities.js',
            );
            const run = () =>
                JSON.parse(
                    execSync(`node "${scriptPath}" --include-md --json`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    }),
                );

            // Control — no .gitignore: SKIP_DIRS has no '.tmp', so fixtures ARE scanned.
            const before = run();

            // Fix — `.gitignore` with `*tmp/` must drop exactly the two fixture files.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '*tmp/\n');
            const after = run();

            assert.strictEqual(
                after.graph.total_files,
                before.graph.total_files - 2,
                'the two .tmp/ fixture files must be excluded once *tmp/ is gitignored',
            );
            assert.ok(
                !JSON.stringify(after.communities).includes('.tmp/'),
                'no community member may reference a gitignored .tmp/ path',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 11. extract-rationale.js — gitignore-aware scan (Invariant 7 parity)
    // ───────────────────────────────────────────────────────────────────────────
    test('extract-rationale.js excludes .gitignored build artifacts from the scan (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeCanonicalCoreSpec(tempDir);

            // Real source file — must always be scanned.
            const srcDir = path.join(tempDir, 'src');
            fs.mkdirSync(srcDir, { recursive: true });
            fs.writeFileSync(path.join(srcDir, 'main.rs'), '// NOTE: genuine design rationale\n');

            // Generated artifact tree — must vanish once generated/ is gitignored.
            // `generated` is deliberately absent from the shared skip floor
            // (BUILD_NOISE_DIRS), so this fixture isolates the gitignore filter;
            // a floor name like `target` would be skipped even without .gitignore.
            const artifactDir = path.join(
                tempDir,
                'generated',
                'doc',
                'type.impl',
                'core',
                'result',
            );
            fs.mkdirSync(artifactDir, { recursive: true });
            fs.writeFileSync(
                path.join(artifactDir, 'enum.Result.js'),
                '// NOTE: generated artifact, not authored rationale\n',
            );

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'extract-rationale.js',
            );
            const run = () =>
                JSON.parse(
                    execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }),
                );

            // Control — no .gitignore: `generated` is absent from SKIP_DIRS, so the artifact IS scanned.
            const before = run();
            assert.ok(
                before.rationale.some((r) => r.file.startsWith('generated/')),
                'control: without .gitignore the artifact is scanned (fixture is meaningful)',
            );

            // Fix — `.gitignore` with `generated/` must drop the artifact entirely.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'generated/\n');
            const after = run();

            assert.ok(
                !after.rationale.some((r) => r.file.startsWith('generated/')),
                'no rationale marker may originate from a gitignored path',
            );
            assert.ok(
                !after.shadow_logic.some((s) => s.file.startsWith('generated/')),
                'no shadow-logic entry may originate from a gitignored path',
            );
            assert.ok(
                after.rationale.some((r) => r.file === 'src/main.rs'),
                'genuine source rationale must survive the gitignore filter',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 12. utils.loadGitignore — the single shared implementation (Invariant 7)
    //     Semantics are pinned against real `git check-ignore` behavior.
    // ───────────────────────────────────────────────────────────────────────────
    test('utils.loadGitignore honors ordering, negation, anchoring and path-aware globs', () => {
        const tempDir = createTempWorkspace();
        try {
            const { loadGitignore } = requireFromFixture(tempDir, 'utils.js');

            // No .gitignore → predicate must be a permissive no-op.
            assert.strictEqual(
                loadGitignore(tempDir)('anything/at/all.js'),
                false,
                'absent .gitignore ignores nothing',
            );

            fs.writeFileSync(
                path.join(tempDir, '.gitignore'),
                [
                    'target/', // any depth
                    '/dist', // root-anchored only
                    'node_modules', // any depth, no trailing slash
                    '*.log', // path-aware glob
                    'docs/build/', // anchored nested path
                    '.env*', // broad match…
                    '!.env.example', // …narrowed by a later negation
                    '',
                    '# a comment',
                ].join('\n'),
            );

            const isIgnored = loadGitignore(tempDir);

            assert.strictEqual(
                isIgnored('target/doc/a.js'),
                true,
                'bare dir pattern matches at any depth',
            );
            assert.strictEqual(
                isIgnored('nested/target/b.js'),
                true,
                'bare dir pattern is not root-anchored',
            );
            assert.strictEqual(isIgnored('dist/bundle.js'), true, '/dist matches at the root');
            assert.strictEqual(
                isIgnored('src/dist/helper.js'),
                false,
                '/dist must NOT match a nested dist/',
            );
            assert.strictEqual(
                isIgnored('deep/node_modules/x.js'),
                true,
                'slashless pattern matches any segment',
            );
            assert.strictEqual(isIgnored('app.log'), true, '*.log matches a log file');
            assert.strictEqual(
                isIgnored('src/keep.log.js'),
                false,
                '* must not cross into the extension',
            );
            assert.strictEqual(
                isIgnored('docs/build/out.js'),
                true,
                'nested path pattern is anchored and matches',
            );
            assert.strictEqual(
                isIgnored('docs/src/in.js'),
                false,
                'anchored pattern must not over-match',
            );

            // Ordering: the later `!` rule wins over the earlier broad rule.
            assert.strictEqual(isIgnored('.env'), true, '.env* ignores .env');
            assert.strictEqual(isIgnored('.env.local'), true, '.env* ignores .env.local');
            assert.strictEqual(
                isIgnored('.env.example'),
                false,
                'a later negation re-includes .env.example',
            );

            assert.strictEqual(
                isIgnored('src/main.rs'),
                false,
                'unmatched paths are never ignored',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 13. analyze-coverage.js — gitignore parity via the shared helper
    // ───────────────────────────────────────────────────────────────────────────
    test('analyze-coverage.js excludes gitignored trees and honors root anchoring (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeCanonicalCoreSpec(tempDir);

            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
            // `out` is deliberately NOT in analyze-coverage's hardcoded SKIP_DIRS
            // (unlike `dist`), so these two files isolate gitignore anchoring alone.
            mk('src/main.rs', 'fn main() {}\n');
            mk('src/out/helper.rs', 'fn helper() {}\n'); // nested out/ — must survive `/out`
            mk('out/bundle.js', 'var x = 1;\n'); // root out/ — must be excluded
            mk('target/doc/artifact.js', 'var y = 2;\n'); // build tree — must be excluded

            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'target/\n/out\n');

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
            const files = out.coverage.map((c) => c.file);

            assert.ok(
                !files.some((f) => f.startsWith('target/')),
                'gitignored build tree must not be classified',
            );
            assert.ok(!files.includes('out/bundle.js'), 'root-anchored /out must be excluded');
            assert.ok(
                files.includes('src/out/helper.rs'),
                'a nested out/ must survive root-anchored /out',
            );
            assert.ok(files.includes('src/main.rs'), 'genuine source must still be classified');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 14. generate-context.js — tree rendering respects .gitignore, negation included
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-context.js prunes gitignored entries from the tree but honors negation', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'buildout'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'buildout', 'artifact.bin'), 'x');
            fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=1\n');
            fs.writeFileSync(path.join(tempDir, '.env.example'), 'SECRET=\n');
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'buildout/\n.env*\n!.env.example\n');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'generate-context.js',
            );
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            const context = fs.readFileSync(path.join(tempDir, '.magicspec', 'CONTEXT.md'), 'utf8');

            assert.ok(
                !context.includes('buildout'),
                'a gitignored directory must not appear in the tree',
            );
            assert.ok(!/^.*├──\s\.env$/m.test(context), '.env must be pruned by the .env* rule');
            assert.ok(
                context.includes('.env.example'),
                'the negated .env.example must remain visible',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 15. utils.BUILD_NOISE_DIRS — one shared skip floor, per-scanner domain excludes
    //     The floor answers "what is never a scan target for ANY tool"; each
    //     scanner unions it with excludes encoding its own domain question.
    //     Deduplicating the floor is safe (one right answer); merging the domain
    //     excludes would be wrong (each scanner's answer differs by design).
    // ───────────────────────────────────────────────────────────────────────────
    test('utils.BUILD_NOISE_DIRS is the single hardcoded floor for every scanner', () => {
        const tempDir = createTempWorkspace();
        try {
            const { BUILD_NOISE_DIRS } = requireFromFixture(tempDir, 'utils.js');

            assert.ok(Array.isArray(BUILD_NOISE_DIRS), 'the floor is exported as an array');
            assert.ok(Object.isFrozen(BUILD_NOISE_DIRS), 'the floor is frozen against mutation');
            for (const name of [
                'node_modules',
                '.git',
                'dist',
                'build',
                'target',
                '__pycache__',
                '.pytest_cache',
            ]) {
                assert.ok(BUILD_NOISE_DIRS.includes(name), `floor must contain ${name}`);
            }

            // Regression guard: every scanner derives its skip list from the shared
            // floor instead of re-hardcoding a private copy (the pre-unification state).
            const consumers = [
                ['skills', 'magicspec', 'scripts', 'detect-communities.js'],
                ['skills', 'magicspec', 'scripts', 'extract-rationale.js'],
                ['skills', 'magicspec', 'scripts', 'analyze-coverage.js'],
                ['skills', 'magicspec', 'scripts', 'generate-context.js'],
                ['scripts', 'benchmark.js'],
            ];
            for (const parts of consumers) {
                const src = fs.readFileSync(path.join(tempDir, ...parts), 'utf8');
                assert.ok(
                    src.includes('...BUILD_NOISE_DIRS'),
                    `${parts.join('/')} must spread the shared floor, not hardcode its own copy`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('scanners share the build-noise floor but keep their domain excludes apart', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);

            mk(
                '.magicspec/specifications/l1-core.md',
                '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n',
            );
            mk('src/main.rs', '// NOTE: genuine design rationale\nfn main() {}\n');
            // SDD-layer source: markers here are never user "shadow logic".
            mk('.magicspec/tooling.js', '// NOTE: sdd helper, not product code\nvar s = 1;\n');
            // Directories below were skipped by SOME scanners before unification:
            // `build` was missing from analyze-coverage's list, `temp` from
            // extract-rationale's. No .gitignore here — only the floor acts.
            mk('build/artifact.js', '// NOTE: generated artifact\nvar a = 1;\n');
            mk('temp/scratch.js', '// NOTE: scratch file\nvar t = 1;\n');

            // analyze-coverage — `build/` no longer reaches classification.
            const coverage = JSON.parse(
                execSync(
                    `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'analyze-coverage.js')}" --json`,
                    { cwd: tempDir, encoding: 'utf8' },
                ),
            );
            const covFiles = coverage.coverage.map((c) => c.file);
            assert.ok(
                !covFiles.some((f) => f.startsWith('build/')),
                'analyze-coverage must skip build/ via the shared floor',
            );
            assert.ok(covFiles.includes('src/main.rs'), 'genuine source must still be classified');

            // extract-rationale — floor noise and domain excludes both stay out.
            const rationale = JSON.parse(
                execSync(
                    `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'extract-rationale.js')}" --json`,
                    { cwd: tempDir, encoding: 'utf8' },
                ),
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('temp/')),
                'extract-rationale must skip temp/ via the shared floor',
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('skills/magicspec/')),
                'domain exclude: engine internals are not user shadow logic',
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('.magicspec/')),
                'domain exclude: the SDD layer is not user shadow logic',
            );
            assert.ok(
                rationale.rationale.some((r) => r.file === 'src/main.rs'),
                'genuine rationale must survive',
            );

            // detect-communities — same floor, OPPOSITE domain: .magicspec/ stays in
            // the graph (it is the subject), while floor dirs never become nodes.
            mk('.magicspec/real-a.md', '# Real A\n[Real B](./real-b.md)\n');
            mk('.magicspec/real-b.md', '# Real B\n');
            const runGraph = () =>
                JSON.parse(
                    execSync(
                        `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'detect-communities.js')}" --include-md --json`,
                        { cwd: tempDir, encoding: 'utf8' },
                    ),
                );
            const before = runGraph();
            mk('.pytest_cache/cached.js', 'var c = 1;\n');
            mk('.pytest_cache/other.js', 'var o = 1;\n');
            const after = runGraph();
            assert.strictEqual(
                after.graph.total_files,
                before.graph.total_files,
                'floor dirs (.pytest_cache) must not add graph nodes',
            );
            assert.ok(
                JSON.stringify(after.communities).includes('.magicspec/real-a.md'),
                'the .magicspec/ subject must remain in the community graph',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16. utils.parseFlags — one CLI grammar for every engine entry point.
    //     `--flag=value` and `--flag value` are equivalent; a present-but-
    //     valueless flag is an error, never a silent default.
    // ───────────────────────────────────────────────────────────────────────────
    test('utils.parseFlags accepts both flag forms and fails closed on a missing value', () => {
        const tempDir = createTempWorkspace();
        try {
            const { parseFlags } = requireFromFixture(tempDir, 'utils.js');
            const spec = { valueFlags: ['--workspace', '--workflow'], boolFlags: ['--json'] };

            // Both forms yield the same value.
            assert.strictEqual(
                parseFlags(['--workspace=docs'], spec).values['--workspace'],
                'docs',
            );
            assert.strictEqual(
                parseFlags(['--workspace', 'docs'], spec).values['--workspace'],
                'docs',
            );

            // Unrecognized tokens pass through untouched (executor forwards them to the child).
            const proxied = parseFlags(['--json', '--require-tasks', '--workspace', 'docs'], spec);
            assert.deepStrictEqual(
                proxied.rest,
                ['--require-tasks'],
                'unknown tokens survive in rest',
            );
            assert.strictEqual(
                proxied.flags['--json'],
                true,
                'boolean flags are captured, not forwarded',
            );
            assert.strictEqual(proxied.values['--workspace'], 'docs');
            assert.deepStrictEqual(proxied.errors, [], 'a well-formed argv produces no errors');

            // Fail closed — the four silent-fallback shapes.
            assert.ok(
                parseFlags(['--workspace'], spec).errors.length,
                'bare flag at end of argv is an error',
            );
            assert.ok(
                parseFlags(['--workspace', '--json'], spec).errors.length,
                'a following flag is not a value',
            );
            assert.ok(
                parseFlags(['--workspace='], spec).errors.length,
                'an empty value is an error',
            );
            assert.ok(
                parseFlags(['--json=1'], spec).errors.length,
                'a boolean flag rejects a value',
            );

            // An embedded '=' must reach the caller's validation, never be truncated to `a`.
            assert.strictEqual(
                parseFlags(['--workspace=a=b'], spec).values['--workspace'],
                'a=b',
                "split('=')[1] truncation must not resurface",
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16a. executor.js — workspace routing is form-agnostic, and the
    //      Unknown-workspace guard is reachable through BOTH forms.
    //      Field report: `generate-context --workspace docs` silently wrote
    //      .magicspec/main/CONTEXT.md while `--workspace=docs` wrote the target.
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js routes --workspace <name> identically to --workspace=<name>', () => {
        const tempDir = createTempWorkspace();
        try {
            for (const ws of ['main', 'docs']) {
                fs.mkdirSync(path.join(tempDir, '.magicspec', ws), { recursive: true });
            }
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'workspace.json'),
                JSON.stringify({ default: 'main', workspaces: { main: {}, docs: {} } }),
            );

            const executorPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'executor.js',
            );
            const contextOf = (ws) => path.join(tempDir, '.magicspec', ws, 'CONTEXT.md');
            const clearContexts = () => {
                for (const ws of ['main', 'docs']) {
                    if (fs.existsSync(contextOf(ws))) fs.unlinkSync(contextOf(ws));
                }
            };

            // (a) Space form must hit the requested workspace, not the default.
            clearContexts();
            execSync(`node "${executorPath}" generate-context --workspace docs`, {
                cwd: tempDir,
                stdio: 'pipe',
            });
            assert.ok(
                fs.existsSync(contextOf('docs')),
                'space form must write the target workspace',
            );
            assert.ok(
                !fs.existsSync(contextOf('main')),
                'space form must not fall back to the default workspace',
            );

            // (b) Equals form — the control that always worked.
            clearContexts();
            execSync(`node "${executorPath}" generate-context --workspace=docs`, {
                cwd: tempDir,
                stdio: 'pipe',
            });
            assert.ok(
                fs.existsSync(contextOf('docs')),
                'equals form must write the target workspace',
            );
            assert.ok(
                !fs.existsSync(contextOf('main')),
                'equals form must not touch the default workspace',
            );

            // (c) The Unknown-workspace guard must be reachable via BOTH forms.
            //     Previously the space form bypassed it: a typo silently wrote to main.
            const expectHalt = (argv, why) => {
                clearContexts();
                assert.throws(
                    () =>
                        execSync(`node "${executorPath}" generate-context ${argv}`, {
                            cwd: tempDir,
                            stdio: 'pipe',
                        }),
                    /HALT/,
                    why,
                );
                assert.ok(!fs.existsSync(contextOf('main')), `${why} — and nothing may be written`);
                assert.ok(!fs.existsSync(contextOf('docs')), `${why} — and nothing may be written`);
            };

            expectHalt(
                '--workspace bogus',
                'a typo in the space form must HALT, not silently target the default',
            );
            expectHalt('--workspace=bogus', 'a typo in the equals form must HALT');
            expectHalt('--workspace', 'a bare --workspace must HALT, not fall back to the default');
            expectHalt('--workspace=', 'an empty --workspace value must HALT');
            expectHalt(
                '--workspace=docs=typo',
                "an embedded '=' must fail validation, not truncate to 'docs'",
            );

            // (d) Path traversal stays rejected through the space form too.
            expectHalt('--workspace ../../../etc', 'traversal via the space form must HALT');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16b. update-state.js — a bare --workspace used to yield an empty value
    //      that fell through to `.magicspec/`, writing STATE.md into the global
    //      registry root instead of a workspace.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js honors both flag forms and never writes STATE.md to the registry root', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const wsDir = makeWorkspace(tempDir, 'docs');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'update-state.js',
            );
            const rootState = path.join(tempDir, '.magicspec', 'STATE.md');
            const wsState = path.join(wsDir, 'STATE.md');

            // (a) Space form targets the requested directory.
            execSync(`node "${scriptPath}" --workspace .magicspec/docs --status=Active`, {
                cwd: tempDir,
                stdio: 'pipe',
            });
            assert.ok(fs.existsSync(wsState), 'space form must write into the workspace');
            assert.ok(
                !fs.existsSync(rootState),
                'space form must not write into the registry root',
            );

            // (b) A bare --workspace must HALT rather than degrade to `.magicspec/`.
            fs.unlinkSync(wsState);
            assert.throws(
                () =>
                    execSync(`node "${scriptPath}" --workspace --status=Active`, {
                        cwd: tempDir,
                        stdio: 'pipe',
                    }),
                /HALT/,
                'a valueless --workspace must HALT',
            );
            assert.ok(!fs.existsSync(rootState), 'the HALT must leave the registry root untouched');

            // (c) Equals form still works, and a workspace directory may contain separators.
            execSync(`node "${scriptPath}" --workspace=.magicspec/docs --status=Active`, {
                cwd: tempDir,
                stdio: 'pipe',
            });
            assert.ok(fs.existsSync(wsState), 'equals form must write into the workspace');
            assert.ok(
                !fs.existsSync(rootState),
                'equals form must not write into the registry root',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16c. Documentation parity — the shipped workflows must prescribe an
    //      invocation the executor actually understands. The field bug entered
    //      through a doc line, not through a user's improvisation.
    // ───────────────────────────────────────────────────────────────────────────
    test('shipped workflow bodies prescribe only executor-parsable --workspace forms', () => {
        const magicRoot = path.resolve(TESTS_DIR, '..', 'skills', 'magicspec');
        const bodies = fs.readdirSync(magicRoot).filter((f) => f.endsWith('.md'));
        assert.ok(bodies.length > 0, 'fixture precondition: workflow bodies exist');

        for (const body of bodies) {
            const content = fs.readFileSync(path.join(magicRoot, body), 'utf8');

            // executor.js validates a bare workspace NAME; a path never matches
            // WORKSPACE_NAME_RE, so `--workspace={...-dir}` always HALTs.
            assert.doesNotMatch(
                content,
                /--workspace=\{[^}]*dir[^}]*\}/,
                `${body} passes a directory to executor's --workspace, which only accepts a bare name`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 14b. SDD containment surfaces state notation-independent patterns (RC-2.1)
    // ───────────────────────────────────────────────────────────────────────────
    test('containment surfaces match task IDs and phases in every notation (RC-2.1)', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');

        // The containment scan has no code — it is a cognitive grep whose match
        // classes are stated in prose, so the prose IS the implementation. Every
        // surface that states them must state the notation-independent form:
        // pinning the bracketed checklist literal `[T-XXXX]` or the `phase-{n}`
        // file form matches only the SDD layer's internal spellings, while a
        // reference leaks precisely by being quoted out of them (bare, in prose,
        // in a test name). That narrowing let 121 leaks accumulate unreported.
        const surfaces = [
            'skills/magicspec/references/rules/containment.md',
            'skills/magicspec/workflows/analyze.md',
            'skills/magicspec/roles/coder.md',
            'skills/magicspec/roles/code-reviewer.md',
        ];

        for (const rel of surfaces) {
            const content = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
            assert.ok(
                content.includes('T-\\d+[A-Z]\\d+'),
                `${rel} must state the notation-independent task-ID pattern (bracketed and bare, any phase width)`,
            );
            assert.ok(
                content.includes('[Pp]hase[-\\s]\\d+'),
                `${rel} must state the prose phase-designator pattern, not only the phase-{n} file form`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 15a. generate-context.js — landmark roots are always on the map
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-context.js always shows the design and engine roots (landmarks)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'src', 'a.js'), 'var a = 1;\n');
            fs.mkdirSync(path.join(tempDir, 'other'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'other', 'b.js'), 'var b = 1;\n');
            fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'dist', 'bundle.js'), 'var d = 1;\n');
            // A user project may legitimately gitignore its design dir — the
            // map must still anchor on it.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.magicspec/\n');

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'generate-context.js',
            );
            const read = () =>
                fs.readFileSync(path.join(tempDir, '.magicspec', 'CONTEXT.md'), 'utf8');

            // (a) No scope: gitignored .magicspec stays visible; dist/ (floor) is hidden.
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            let context = read();
            assert.ok(
                context.includes('.magicspec/'),
                'gitignored design root must remain visible (landmark)',
            );
            assert.match(
                context,
                /skills\/\n.*magicspec\//,
                'engine root must remain visible (landmark)',
            );
            assert.ok(
                !context.includes('dist/'),
                'build noise must be hidden from the tree via the shared floor',
            );

            // (b) Workspace scope: out-of-scope dirs are filtered, landmarks survive.
            execSync(`node "${scriptPath}"`, {
                cwd: tempDir,
                stdio: 'pipe',
                env: { ...process.env, MAGIC_WORKSPACE_SCOPE: '["src"]' },
            });
            context = read();
            assert.ok(context.includes('src/'), 'scoped dir must be visible');
            assert.ok(!context.includes('other/'), 'out-of-scope dir must be filtered');
            assert.ok(context.includes('.magicspec/'), 'design root must survive the scope filter');
            assert.match(
                context,
                /skills\/\n.*magicspec\//,
                'engine root must survive the scope filter',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 15b. generate-context.js — embedded changelog nests under "Recent Changes"
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-context.js demotes the embedded changelog headings (single H1)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'CHANGELOG.md'),
                '# Journal\n\nIntro.\n\n## Phase 3\n\n```sh\n# not a heading\n```\n\n- item\n',
            );

            const context = generateContext(tempDir);

            let inFence = false;
            const h1 = context.split('\n').filter((l) => {
                if (l.startsWith('```')) inFence = !inFence;
                return !inFence && /^# /.test(l);
            });
            assert.deepStrictEqual(h1, ['# Project Context'], 'only the document title may be H1');
            assert.ok(
                context.includes('\n### Journal\n'),
                'changelog title nests under Recent Changes',
            );
            assert.ok(context.includes('\n#### Phase 3\n'), 'relative heading depth is preserved');
            assert.ok(context.includes('\n# not a heading\n'), 'fenced content is left untouched');

            // A changelog whose 15-line tail starts on a blank line must not
            // leave two blank lines under the section header (MD012).
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'CHANGELOG.md'),
                'line\n'.repeat(20) + '\n' + 'tail\n'.repeat(14),
            );
            const tailed = generateContext(tempDir);
            assert.ok(!/\n\n\n/.test(tailed), 'no consecutive blank lines in CONTEXT.md');
        } finally {
            cleanup(tempDir);
        }
    });
};
