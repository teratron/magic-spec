#!/usr/bin/env node
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE: MAGIC ENGINE SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Magic Engine Scripts', () => {
    const scriptsDir = path.resolve(__dirname, '..', '..', '.magic', 'scripts');
    const devScriptsDir = path.resolve(__dirname, '..', 'scripts');

    const scaffoldTempDirs = (tempDir) => {
        fs.mkdirSync(path.join(tempDir, '.magic'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'scripts'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'scripts', 'lib'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'templates'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'dev'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'dev', 'scripts'), { recursive: true });
    };

    const copyDirShallow = (src, dst) => {
        if (!fs.existsSync(src)) return;
        for (const entry of fs.readdirSync(src)) {
            const srcPath = path.join(src, entry);
            if (fs.statSync(srcPath).isFile()) {
                fs.copyFileSync(srcPath, path.join(dst, entry));
            }
        }
    };

    // Compatibility shim: tests reference dev-only scripts (sync.js,
    // sync-docs.js, validate-hardlinks.js, …) at `.magic/scripts/` even
    // though their canonical home is `dev/scripts/`. Mirror only files
    // that don't already exist in `.magic/scripts/` so the production
    // executor.js, init.js, etc., are NOT overwritten by their
    // dev-namespace counterparts (the dev executor.js intentionally
    // lacks workspace validation).
    //
    // Skip `generate-checksums.js` explicitly — it's a developer-only
    // manifest builder. Keeping it out of `tempDir/.magic/scripts/`
    // makes the fixture match the actual user-install layout, so
    // update-engine-meta's user-side fallback path is exercised
    // honestly when dev/ scripts are absent.
    const DEV_ONLY_NEVER_MIRROR = new Set(['generate-checksums.js']);

    const mirrorDevOnlyScripts = (tempDir) => {
        const productionScripts = new Set(fs.readdirSync(scriptsDir));
        for (const entry of fs.readdirSync(devScriptsDir)) {
            const src = path.join(devScriptsDir, entry);
            if (!fs.statSync(src).isFile()) continue;
            if (productionScripts.has(entry)) continue;
            if (DEV_ONLY_NEVER_MIRROR.has(entry)) continue;
            fs.copyFileSync(src, path.join(tempDir, '.magic', 'scripts', entry));
        }
    };

    const initGitFixture = (tempDir) => {
        try {
            execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
            execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
            // Initial commit with a baseline file
            fs.writeFileSync(
                path.join(tempDir, 'README.md'),
                '# Test Project\n**Active Development** (v0.0.1)\n',
            );
            execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
            execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
        } catch (e) {
            console.warn(
                'Note: Git initialization failed in test, some tests may skip drift check.',
            );
            console.error(e.message);
        }
    };

    const createTempWorkspace = (withGit = false) => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-test-'));
        scaffoldTempDirs(tempDir);

        copyDirShallow(scriptsDir, path.join(tempDir, '.magic', 'scripts'));
        copyDirShallow(
            path.join(scriptsDir, 'lib'),
            path.join(tempDir, '.magic', 'scripts', 'lib'),
        );
        copyDirShallow(devScriptsDir, path.join(tempDir, 'dev', 'scripts'));

        mirrorDevOnlyScripts(tempDir);

        fs.writeFileSync(path.join(tempDir, '.magic', '.version'), '1.0.0');

        if (withGit) initGitFixture(tempDir);

        return tempDir;
    };

    const cleanup = (dir) => {
        if (dir && fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        }
    };

    // Runs the developer-only checksum manifest builder inside a temp workspace,
    // so scripts gated on engine integrity (check-prerequisites, update-engine-meta)
    // see a consistent .magic/.checksums.
    const generateChecksums = (tempDir) => {
        const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
        execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });
    };

    // Runs update-engine-meta.js --check in a temp workspace, returning
    // { failed: boolean, output: string }.
    const runEngineMetaCheck = (tempDir) => {
        const metaScript = path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js');
        try {
            const stdout = execSync(`node "${metaScript}" --check`, {
                cwd: tempDir,
                encoding: 'utf8',
                stdio: 'pipe',
            });
            return { failed: false, output: stdout };
        } catch (e) {
            return { failed: true, output: `${e.stdout || ''}${e.stderr || ''}` };
        }
    };

    // Copies the real state.md template into a temp workspace, so bootstrap
    // paths exercise template-driven behavior instead of a from-scratch write.
    // No-op if the source template is absent (mirrors the guard every call site used).
    const copyStateTemplate = (tempDir) => {
        const realTemplate = path.resolve(__dirname, '..', '..', '.magic', 'templates', 'state.md');
        if (fs.existsSync(realTemplate)) {
            fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
        }
    };

    // Creates `.design/{workspace}/` inside a temp workspace.
    const makeWorkspace = (tempDir, workspace = 'engine') => {
        const wsDir = path.join(tempDir, '.design', workspace);
        fs.mkdirSync(wsDir, { recursive: true });
        return wsDir;
    };

    // Creates `.design/{workspace}/tasks/` inside a temp workspace, returning
    // the paths phase/task fixtures are written under.
    const makeWorkspaceWithTasks = (tempDir, workspace = 'engine') => {
        const wsDir = makeWorkspace(tempDir, workspace);
        const tasksDir = path.join(wsDir, 'tasks');
        fs.mkdirSync(tasksDir, { recursive: true });
        return { wsDir, tasksDir, tasksPath: path.join(wsDir, 'TASKS.md') };
    };

    // Builds the git-backed workspace every finalize end-to-end test needs:
    // workspace.json with finalization enabled, a starting version, and the
    // paths those tests assert against. Caller supplies the workspace content,
    // then calls commitFixture() to establish a clean baseline.
    const createFinalizeFixture = (
        tempDir,
        { workspace = 'main', version = '0.1.0', autoChangelog = false } = {},
    ) => {
        copyStateTemplate(tempDir);
        const designDir = path.join(tempDir, '.design');
        const wsDir = makeWorkspace(tempDir, workspace);
        fs.writeFileSync(
            path.join(designDir, 'workspace.json'),
            JSON.stringify({
                default: workspace,
                finalization: {
                    enabled: true,
                    autoBump: true,
                    autoChangelog,
                    versionPath: '.design/.version',
                },
            }),
        );
        fs.writeFileSync(path.join(designDir, '.version'), version);
        return {
            designDir,
            wsDir,
            versionPath: path.join(designDir, '.version'),
            finalizePath: path.join(tempDir, '.magic', 'scripts', 'finalize.js'),
        };
    };

    // Commits the fixture so HEAD exists and the working tree starts clean —
    // finalize reads the diff against HEAD, so a dirty baseline would blur
    // which change the assertion is actually about.
    const commitFixture = (tempDir) => {
        execSync('git add -A', { cwd: tempDir, stdio: 'ignore' });
        execSync('git commit -m "fixture"', { cwd: tempDir, stdio: 'ignore' });
    };

    // require()s phase-archiver.js and creates its workspace fixture in one
    // step — the pairing every phase-archiver test starts with.
    const requirePhaseArchiverWorkspace = (tempDir) => {
        const archiver = require(
            path.join(tempDir, '.magic', 'scripts', 'lib', 'phase-archiver.js'),
        );
        return { archiver, ...makeWorkspaceWithTasks(tempDir) };
    };

    // Writes a minimal `l1-core.md` spec with a Canonical References entry for
    // `src/`, used by the Invariant 7 gitignore-parity fixtures.
    const writeCanonicalCoreSpec = (tempDir) => {
        const specsDir = path.join(tempDir, '.design', 'specifications');
        fs.mkdirSync(specsDir, { recursive: true });
        fs.writeFileSync(
            path.join(specsDir, 'l1-core.md'),
            '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n',
        );
        return specsDir;
    };

    // require()s finalize.js and creates its workspace-with-tasks fixture in
    // one step — the pairing every computeNextAction test (§7b) starts with.
    const requireFinalizeWorkspace = (tempDir) => {
        const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
        return { finalize, ...makeWorkspaceWithTasks(tempDir) };
    };

    // The canonical two-level TASKS.md registry: one Phase-1 "Bootstrap" row,
    // `status` defaulting to `In Progress`. Every computeNextAction test that
    // needs the registry-table format (rather than the legacy inline-checkbox
    // format) builds it from here instead of re-typing the same array.
    const registryTable = (status = 'In Progress') =>
        [
            '# Master Task Index',
            '',
            '## Active Phases',
            '',
            '| Phase | Description | Status |',
            '| --- | --- | --- |',
            `| [Phase 1](tasks/phase-1.md) | Bootstrap | \`${status}\` |`,
            '',
        ].join('\n');

    // require()s update-state.js and creates a plain single-workspace fixture
    // in one step — the pairing every autoProgress/computeProgress test (§7e)
    // starts with.
    const requireUpdateState = (tempDir) => {
        const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
        return { updateState, wsDir: makeWorkspace(tempDir) };
    };

    // Same pairing, but with a tasks/ directory too — for the computeProgress
    // test that needs a phase file alongside TASKS.md.
    const requireUpdateStateWithTasks = (tempDir) => {
        const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
        return { updateState, ...makeWorkspaceWithTasks(tempDir) };
    };

    // Runs autoProgress and reads back STATE.md — the "recompute, then
    // inspect" tail shared by every autoProgress assertion in §7e. `patch` is
    // the field-patch object forwarded as updateState's 2nd argument, for the
    // one test that recomputes progress alongside a field write.
    const autoProgressState = (updateState, wsDir, patch = {}) => {
        updateState(wsDir, patch, { autoProgress: true });
        return fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
    };

    // Runs `fn` and returns everything it sent to stderr through console.warn —
    // the shared tail of the update-state tests that assert on what the script
    // announces (line-cap guard, section creation).
    const warnedBy = (fn) => {
        const original = console.warn;
        const messages = [];
        console.warn = (...args) => messages.push(args.join(' '));
        try {
            fn();
        } finally {
            console.warn = original;
        }
        return messages;
    };

    // Writes a file at tempDir/rel (POSIX-style relative path), creating
    // parent directories as needed. Shared by fixtures that build an ad hoc
    // file tree rather than a full .design/ workspace (§15, §18).
    const writeTreeFile = (tempDir, rel, body) => {
        const abs = path.join(tempDir, ...rel.split('/'));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body);
    };

    // Creates `.design/specifications/` inside a temp workspace and returns
    // both paths — the fixture every check-prerequisites.js registry/header
    // test (§6) starts from.
    const makeSpecWorkspace = (tempDir) => {
        const designDir = path.join(tempDir, '.design');
        const specsDir = path.join(designDir, 'specifications');
        fs.mkdirSync(specsDir, { recursive: true });
        return { designDir, specsDir };
    };

    // makeSpecWorkspace() plus a single genuine `l1-real.md` spec with a
    // matching header — the fixture both registry-scan (SH-1/SH-4) tests in
    // §6b start from before diverging on INDEX.md/PLAN.md content.
    const makeRegistryScanWorkspace = (tempDir) => {
        const { designDir, specsDir } = makeSpecWorkspace(tempDir);
        fs.writeFileSync(
            path.join(specsDir, 'l1-real.md'),
            '# Real\n\n**Version:** 1.0.0\n**Status:** Stable\n',
        );
        return { designDir, specsDir };
    };

    // Runs check-prerequisites.js against tempDir with the given flags and
    // returns the parsed --json result.
    const runCheckPrerequisites = (tempDir, ...extraArgs) => {
        const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
        const output = execSync(`node "${scriptPath}" --json ${extraArgs.join(' ')}`.trim(), {
            cwd: tempDir,
            encoding: 'utf8',
        });
        return JSON.parse(output);
    };

    // Creates a bare `.design/` directory and returns both it and the
    // INDEX.md path callers write into — the pairing every
    // update-project-meta.js test starts from before layering its own
    // INDEX.md content (that content varies per test, unlike the other
    // `.design/`-bootstrap helpers below).
    const makeDesignDir = (tempDir) => {
        const designDir = path.join(tempDir, '.design');
        fs.mkdirSync(designDir, { recursive: true });
        return { designDir, indexPath: path.join(designDir, 'INDEX.md') };
    };

    // Minimal `.design/` bootstrap (empty specifications/, INDEX.md, RULES.md)
    // used by every DESIGN_DEBT_PENDING (SC-2.4) probe in §6b2 — none of them
    // exercise spec content, only PLAN.md/TASKS.md.
    const makeMinimalDesignDir = (tempDir) => {
        const designDir = path.join(tempDir, '.design');
        fs.mkdirSync(path.join(designDir, 'specifications'), { recursive: true });
        fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n\n**Version:** 1.0.0\n');
        fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
        return designDir;
    };

    // Factory for the repeated DESIGN_DEBT_PENDING probe: writes Backlog (and
    // optionally Active Phases) content, runs check-prerequisites, and
    // returns the warning (or undefined). `tasksBody` is optional — when a
    // test's TASKS.md is fixed for the whole run, omit it and only PLAN.md is
    // rewritten per call.
    const makeDebtWarningFinder = (tempDir, designDir) => (planBody, tasksBody) => {
        fs.writeFileSync(path.join(designDir, 'PLAN.md'), `# Plan\n\n## Backlog\n\n${planBody}\n`);
        if (tasksBody !== undefined) {
            fs.writeFileSync(
                path.join(designDir, 'TASKS.md'),
                `# Tasks\n\n## Active Phases\n\n${tasksBody}\n`,
            );
        }
        return runCheckPrerequisites(tempDir).warnings.find(
            (w) => w.type === 'DESIGN_DEBT_PENDING',
        );
    };

    // ───────────────────────────────────────────────────────────────────────────
    // 1. generate-checksums.js
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-checksums.js should create .checksums file correctly', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const checksumsPath = path.join(tempDir, '.magic', '.checksums');
            assert.ok(fs.existsSync(checksumsPath), '.checksums should exist');
            const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));

            // Check if scripts are included
            assert.ok(checksums['scripts/init.js'], 'init.js should be tracked');
            // Check if history is ignored
            assert.ok(!checksums['history/init.md'], 'history should be ignored');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1a. Architecture invariant — no volatile state caches inside .magic/
    //     (Historical: regressions used to flag ENGINE_INTEGRITY when sync sub-
    //      scripts wrote state caches into .magic/. State files now live in
    //      .design/.cache/ and dev/.cache/; .magic/ stays a clean engine kernel.)
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel must not ship volatile state caches in .magic/', () => {
        const magicRoot = path.join(__dirname, '..', '..', '.magic');
        const forbidden = ['.docs-state.json', '.project-meta-state.json', '.finalize-state.json'];
        for (const name of forbidden) {
            assert.ok(
                !fs.existsSync(path.join(magicRoot, name)),
                `${name} must not exist inside .magic/ — relocate to dev/.cache/ or .design/.cache/`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1b. Architecture invariant — the CommonJS module-scope boundary must ship
    //     Downstream projects whose root package.json declares "type":"module"
    //     would otherwise resolve .magic/scripts/*.js as ESM and die on require().
    //     The boundary only protects users if it is tracked: the release archive
    //     is built by walking a fresh CI checkout, so untracked files never ship,
    //     and update-engine-meta --check does NOT flag manifest entries whose
    //     file is absent — the omission would be silent.
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel ships a tracked CommonJS scope boundary at .magic/scripts/package.json', () => {
        const repoRoot = path.resolve(__dirname, '..', '..');
        const relPath = '.magic/scripts/package.json';
        const absPath = path.join(repoRoot, relPath);

        assert.ok(
            fs.existsSync(absPath),
            `${relPath} must exist — it pins CommonJS for the engine scripts`,
        );

        const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        assert.strictEqual(pkg.type, 'commonjs', `${relPath} must declare "type":"commonjs"`);

        // Untracked → omitted from the release archive → the boundary silently vanishes.
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert
        assert.doesNotThrow(
            () =>
                execSync(`git ls-files --error-unmatch "${relPath}"`, {
                    cwd: repoRoot,
                    stdio: 'pipe',
                }),
            `${relPath} exists but is UNTRACKED — it will be missing from the release archive. Run: git add ${relPath}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1c. Architecture invariant — every .checksums entry must be git-tracked
    //     (Historical: engine ≤2.1.86 baked four `.fallow/` cache-file hashes
    //     from an unrelated third-party tool into the manifest — a release
    //     archive is built from a fresh CI checkout (.github/workflows/release.yml),
    //     so an untracked path in .checksums can never exist on a fresh install,
    //     and every consumer's very first `update-engine-meta --check` failed
    //     unconditionally, with no self-heal path on a consumer install.)
    // ───────────────────────────────────────────────────────────────────────────
    test('every .magic/.checksums entry must be a git-tracked file', () => {
        const repoRoot = path.resolve(__dirname, '..', '..');
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert

        const tracked = new Set(
            execSync('git ls-files .magic', { cwd: repoRoot, encoding: 'utf8' })
                .split(/\r?\n/)
                .filter(Boolean)
                .map((p) => p.slice('.magic/'.length)),
        );

        const checksums = JSON.parse(
            fs.readFileSync(path.join(repoRoot, '.magic', '.checksums'), 'utf8'),
        );
        const untracked = Object.keys(checksums).filter((rel) => !tracked.has(rel));

        assert.deepStrictEqual(
            untracked,
            [],
            `.magic/.checksums references untracked path(s) — a release archive can never contain them, so every consumer's first commit would fail: ${untracked.join(', ')}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1c-bis. Architecture invariant — no NUL byte anywhere in the engine kernel
    //     `lib/diagnostics.js` built its dedup key with two RAW NUL bytes as
    //     separators instead of the `\0` escape. Runtime-identical, but git
    //     classifies any file containing NUL as `-text` (so `eol=lf`
    //     normalisation never applies to it) and GNU grep answers "Binary file
    //     matches" instead of the matching lines — a core engine file hidden
    //     from grep-based review and audit tooling, this project's own included.
    // ───────────────────────────────────────────────────────────────────────────
    test('no engine kernel file contains a raw NUL byte', () => {
        const repoRoot = path.resolve(__dirname, '..', '..');
        const found = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!['history', '.git', 'node_modules'].includes(entry.name)) walk(full);
                } else {
                    const at = fs.readFileSync(full).indexOf(0);
                    if (at !== -1)
                        found.push(
                            `${path.relative(repoRoot, full).split(path.sep).join('/')}@${at}`,
                        );
                }
            }
        };
        for (const dir of ['.magic', 'workflows', 'skills', 'rules']) {
            if (fs.existsSync(path.join(repoRoot, dir))) walk(path.join(repoRoot, dir));
        }

        assert.deepStrictEqual(
            found,
            [],
            `raw NUL byte(s) (file@offset) — write the \\0 escape instead: ${found.join(', ')}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1d. generate-checksums.js / update-engine-meta.js — gitignore-aware scan
    //     (Invariant 7 parity, engine v2.1.87). `detect-communities.js` and
    //     siblings already honor .gitignore (§10/§11 below); the checksum
    //     scanners never did, which is exactly how `.fallow/`'s cache entered
    //     .checksums in the first place.
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-checksums.js excludes .gitignored directories from the manifest (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.foreign-cache/\n');

            const strayDir = path.join(tempDir, '.magic', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile third-party cache content');

            generateChecksums(tempDir);

            const checksums = JSON.parse(
                fs.readFileSync(path.join(tempDir, '.magic', '.checksums'), 'utf8'),
            );
            assert.ok(
                !Object.keys(checksums).some((rel) => rel.startsWith('.foreign-cache/')),
                'a .gitignored directory inside .magic/ must never enter the manifest',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-engine-meta.js --check does not flag a .gitignored file that newly appears inside .magic/ (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.foreign-cache/\n');
            generateChecksums(tempDir);

            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'baseline --check must be clean',
            );

            // A foreign tool (unrelated to the engine) drops a cache file inside
            // .magic/ after install — exactly how `.fallow/` appeared in engine
            // v2.1.86. A consumer install has no dev/scripts/generate-checksums.js
            // to clear resulting drift, so this must never be flagged at all.
            const strayDir = path.join(tempDir, '.magic', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile');

            const after = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                after.failed,
                false,
                'a .gitignored file appearing inside .magic/ must never be reported as drift',
            );
            assert.doesNotMatch(
                after.output,
                /Detected change/,
                'gitignored content must not surface as a detected change',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // Real-world regression: a consumer project (e.g. metaquant) follows the
    // documented L1 contract and gitignores `.magic/` wholesale ("installed
    // from a release archive, not committed" — CLAUDE.md §1.1). Before this
    // fix, the Invariant 7 exclusion applied unconditionally, so every single
    // manifested file read as "disowned" by the consumer's own .gitignore and
    // was reported missing — failing the pre-commit hook on every commit.
    test('update-engine-meta.js --check still verifies manifested files even when the consumer wholesale-gitignores .magic/ (Invariant 7 boundary)', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            // Consumer convention: .magic/ is an installed release artifact,
            // never committed — this is the documented, expected state for
            // every consumer install, not an edge case.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.magic/\n');

            const result = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                result.failed,
                false,
                'unmodified manifested files must not be reported as missing merely because the consumer gitignores .magic/ wholesale',
            );
            assert.doesNotMatch(
                result.output,
                /Missing engine file/,
                "a manifested, unmodified file must never read as missing due to the consumer's own .gitignore",
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 2. init.js
    // ───────────────────────────────────────────────────────────────────────────
    test('init.js should initialize .design structure and workspaces', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'init.js');

            // 1. Standard init
            execSync(`node "${scriptPath}"`, {
                cwd: tempDir,
                env: { ...process.env, MAGIC_DESIGN_DIR: '.design' },
            });
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'INDEX.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'RULES.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'main', 'INDEX.md')));

            // 2. Workspace init via MAGIC_DESIGN_DIR (as executor.js would do)
            const wsPath = path.join('.design', 'test-ws');
            execSync(`node "${scriptPath}"`, {
                cwd: tempDir,
                env: { ...process.env, MAGIC_DESIGN_DIR: wsPath },
            });
            assert.ok(fs.existsSync(path.join(tempDir, wsPath, 'INDEX.md')));
            assert.ok(fs.existsSync(path.join(tempDir, wsPath, 'specifications')));
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 3. sync.js
    // ───────────────────────────────────────────────────────────────────────────
    test('sync.js should propagate version and generate docs', () => {
        const tempDir = createTempWorkspace(true); // Need git for executor.js
        try {
            // Setup template
            const templatesDir = path.join(tempDir, '.magic', 'templates');
            if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
            fs.writeFileSync(
                path.join(templatesDir, 'contributing.md'),
                '# Contributing v{{VERSION}}\n\n## Rules\n{{rules_block}}\n\n## Registry\n{{registry_block}}',
            );

            // Setup .design content
            fs.mkdirSync(path.join(tempDir, '.design'));
            fs.writeFileSync(
                path.join(tempDir, '.design', 'RULES.md'),
                '## 1. Concept\nRule 1\n## 7. Misc\n',
            );
            fs.writeFileSync(
                path.join(tempDir, '.design', 'INDEX.md'),
                '## Workspaces\n| test | desc |\n## Meta\n',
            );

            // Setup docs and workflows for trigger sync test
            const docsDir = path.join(tempDir, 'docs');
            fs.mkdirSync(docsDir);
            fs.writeFileSync(
                path.join(docsDir, 'test-wf.md'),
                '# Test Workflow\n\n**Triggers:** `old-trigger`\n\n**Slash command:** `/old-command`\n\n## Sync Note\n\nSynchronized with engine workflows on 2026-01-01 (v0.0.1).\n',
            );

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir);
            fs.writeFileSync(
                path.join(workflowsDir, 'magic.test-wf.md'),
                '---\ndescription: test\n---\n**Triggers:** `new-trigger`, `another-trigger`',
            );

            // Second doc/workflow pair: pins the "[arg]" slash-command suffix
            // preservation branch (sync-docs.js syncSlashCommandLine), the
            // shape every multi-arg command doc actually uses.
            fs.writeFileSync(
                path.join(docsDir, 'arg-wf.md'),
                '# Arg Workflow\n\n**Slash command:** `/old-arg-command [old]`\n',
            );
            fs.writeFileSync(
                path.join(workflowsDir, 'magic.arg-wf.md'),
                '---\ndescription: arg test\n---\n',
            );

            // A doc with no matching workflows/magic.{name}.md — pins the
            // "no source → leave doc alone" skip branch (sync-docs.js
            // syncDocsFolder's early `continue`).
            const orphanContent = '# Orphan\n\nNo matching workflow exists for this doc.\n';
            fs.writeFileSync(path.join(docsDir, 'orphan.md'), orphanContent);

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'sync.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });

            // Verify README.md (Active Development line)
            const readme = fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8');
            assert.ok(readme.includes('**Active Development** (v1.0.0)'));

            // Verify documentation (CONTRIBUTING.md)
            const contributing = fs.readFileSync(path.join(tempDir, 'CONTRIBUTING.md'), 'utf8');
            assert.ok(contributing.includes('v1.0.0'));
            assert.ok(contributing.includes('Rule 1'));
            assert.ok(contributing.includes('| test | desc |'));

            // Verify docs sync (version and triggers)
            const docContent = fs.readFileSync(path.join(docsDir, 'test-wf.md'), 'utf8');
            assert.ok(docContent.includes('v1.0.0'), 'Doc version should be updated');
            assert.ok(docContent.includes('`new-trigger`'), 'Doc triggers should be updated');
            assert.ok(docContent.includes('`another-trigger`'), 'Doc triggers should be updated');
            assert.ok(
                docContent.includes('**Slash command:** `/magic.test-wf`'),
                'Doc slash command should be updated',
            );
            // Sync Note refreshes on a first-ever sync (state starts empty,
            // so wfChanged is unconditionally true).
            assert.match(
                docContent,
                /Synchronized with engine workflows on \d{4}-\d{2}-\d{2} \(v1\.0\.0\)\./,
                'Sync Note should refresh on first sync',
            );

            // The "[arg]" suffix must survive, only the command name changes.
            const argDocContent = fs.readFileSync(path.join(docsDir, 'arg-wf.md'), 'utf8');
            assert.ok(
                argDocContent.includes('**Slash command:** `/magic.arg-wf [old]`'),
                'the [arg] suffix must be preserved, only the command name replaced',
            );

            // The orphan doc has no matching workflow source and must be
            // byte-for-byte untouched.
            assert.strictEqual(
                fs.readFileSync(path.join(docsDir, 'orphan.md'), 'utf8'),
                orphanContent,
                'a doc with no matching workflow source must be left alone',
            );

            // Idempotent second run: nothing under workflows/, .design/, or
            // .magic/ changed, so every doc must come out byte-identical —
            // including the Sync Note, which must NOT re-stamp today's date
            // on every invocation regardless of whether anything changed.
            const beforeSecondRun = {
                'test-wf.md': docContent,
                'arg-wf.md': argDocContent,
                'CONTRIBUTING.md': contributing,
            };
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            assert.strictEqual(
                fs.readFileSync(path.join(docsDir, 'test-wf.md'), 'utf8'),
                beforeSecondRun['test-wf.md'],
                'an unchanged workflow source must not re-stamp the Sync Note on a second run',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(docsDir, 'arg-wf.md'), 'utf8'),
                beforeSecondRun['arg-wf.md'],
                'an unchanged workflow source must leave the doc byte-identical on a second run',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(tempDir, 'CONTRIBUTING.md'), 'utf8'),
                beforeSecondRun['CONTRIBUTING.md'],
                'CONTRIBUTING.md must be byte-identical when none of its sources changed',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 3b. update-project-meta.js — idempotent version bump + Smart-History dedup
    //     (exercised only as a silent no-op via the sync.js pipeline test above —
    //     this pins its own branching directly: version bump, Last Updated stamp,
    //     idempotency skip, and the Document History append/dedup logic)
    // ───────────────────────────────────────────────────────────────────────────
    test('update-project-meta.js bumps version/history only on real structural change, dedups same-day rows', () => {
        const tempDir = createTempWorkspace();
        try {
            const { indexPath } = makeDesignDir(tempDir);
            const buildIndex = (workspacesTable) =>
                [
                    '# Index',
                    '',
                    '**Version:** 1.0.0',
                    '- **Last Updated**: 2026-01-01',
                    '',
                    '## Workspaces',
                    '',
                    workspacesTable,
                    '',
                    '## Document History',
                    '',
                    '| Version | Date | Author | Description |',
                    '| :--- | :--- | :--- | :--- |',
                    '| 0.9.0 | 2025-12-01 | Agent | Initial |',
                    '',
                ].join('\n');
            fs.writeFileSync(indexPath, buildIndex('| root | seed |'));

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'update-project-meta.js');
            const run = (extraArgs = '') =>
                execSync(`node "${scriptPath}" -m "test change"${extraArgs}`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                });

            // (a) First run: structural digest is new (no state file yet) → bump + stamp + history row.
            run();
            const afterFirst = fs.readFileSync(indexPath, 'utf8');
            assert.match(
                afterFirst,
                /\*\*Version:\*\* 1\.0\.1/,
                'first run must bump the patch version',
            );
            assert.match(
                afterFirst,
                /- \*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/,
                'Last Updated must be stamped',
            );
            assert.doesNotMatch(
                afterFirst,
                /- \*\*Last Updated\*\*: 2026-01-01/,
                'the stale Last Updated date must not survive',
            );
            assert.match(
                afterFirst,
                /\| 1\.0\.1 \| \d{4}-\d{2}-\d{2} \| Agent \| test change \|/,
                'a new history row must be inserted right after the divider',
            );
            assert.match(
                afterFirst,
                /0\.9\.0 \| 2025-12-01 \| Agent \| Initial/,
                'the prior history row must survive untouched',
            );

            // (b) Second run, no structural change (only volatile fields would
            // differ, and they were already stripped when the digest was taken)
            // → idempotency must skip the bump entirely. This is the file's
            // own stated reason for existing.
            const stdout = run();
            const afterSecond = fs.readFileSync(indexPath, 'utf8');
            assert.strictEqual(
                afterSecond,
                afterFirst,
                'no structural change → file must be byte-identical after a second run',
            );
            assert.match(
                stdout,
                /no structural change, skipping bump/,
                'the skip must be reported, not silent',
            );

            // (c) A genuine structural change (new workspace row) → bump again,
            // same day, same message → Smart-History dedup must condense into
            // a version range on the existing newest row, not insert a second one.
            // Edits the file the script itself just produced (afterSecond),
            // not a fresh buildIndex() — a full rewrite would discard the
            // 1.0.1 bump and history row run (a) already wrote, making a
            // rebuilt-from-scratch fixture indistinguishable from run (a) itself.
            fs.writeFileSync(
                indexPath,
                afterSecond.replace('| root | seed |', '| root | seed |\n| extra | added |'),
            );
            run();
            const afterThird = fs.readFileSync(indexPath, 'utf8');
            assert.match(
                afterThird,
                /\*\*Version:\*\* 1\.0\.2/,
                'a genuine structural change must bump the version again',
            );
            assert.match(
                afterThird,
                /\| 1\.0\.1 - 1\.0\.2 \| \d{4}-\d{2}-\d{2} \| Agent \| test change \|/,
                'same-day + same-message must condense into a version range, not a duplicate row',
            );
            assert.strictEqual(
                (afterThird.match(/test change/g) || []).length,
                1,
                'the dedup must leave exactly one row for the condensed range',
            );

            // (d) --force bypasses the idempotency check even with zero
            // structural change — the documented escape hatch.
            const beforeForce = fs.readFileSync(indexPath, 'utf8');
            run(' --force');
            const afterForce = fs.readFileSync(indexPath, 'utf8');
            assert.notStrictEqual(
                afterForce,
                beforeForce,
                '--force must bump even without a structural change',
            );
            assert.match(
                afterForce,
                /\*\*Version:\*\* 1\.0\.3/,
                '--force must still bump the patch version',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-project-meta.js unit: bumpVersionLine/stampLastUpdated/updateFileMeta as pure functions', () => {
        const tempDir = createTempWorkspace();
        try {
            const upm = require(path.join(tempDir, '.magic', 'scripts', 'update-project-meta.js'));

            // bumpVersionLine: patch increments, non-version content untouched;
            // absent version → no-op with newVersion: null.
            const bumped = upm.bumpVersionLine('**Version:** 2.3.4\nOther text');
            assert.strictEqual(bumped.content, '**Version:** 2.3.5\nOther text');
            assert.strictEqual(bumped.newVersion, '2.3.5');
            const noVersion = upm.bumpVersionLine('No version line here');
            assert.strictEqual(noVersion.content, 'No version line here');
            assert.strictEqual(noVersion.newVersion, null);

            // stampLastUpdated: bulleted form takes priority; table-cell form
            // is the fallback when the bulleted form is absent.
            assert.strictEqual(
                upm.stampLastUpdated('- **Last Updated**: 2020-01-01', '2026-05-05'),
                '- **Last Updated**: 2026-05-05',
            );
            assert.strictEqual(
                upm.stampLastUpdated('**Last Updated** | 2020-01-01', '2026-05-05'),
                '**Last Updated** | 2026-05-05',
            );

            // updateFileMeta as a direct unit call (bypassing the CLI layer
            // entirely): first call bumps on a fresh digest, second call with
            // byte-identical content is idempotent.
            const filePath = path.join(tempDir, 'unit-index.md');
            const seed =
                '# Index\n\n**Version:** 1.0.0\n\n## Document History\n\n| Version | Date | Author | Description |\n| :--- | :--- | :--- | :--- |\n| 0.9.0 | 2025-01-01 | Agent | Seed |\n';
            fs.writeFileSync(filePath, seed);
            const state = {};
            const changed1 = upm.updateFileMeta(
                filePath,
                '2026-05-05',
                'unit test change',
                state,
                'unit',
            );
            assert.strictEqual(
                changed1,
                true,
                'a fresh digest must always be treated as a structural change',
            );
            const afterFirst = fs.readFileSync(filePath, 'utf8');
            assert.match(afterFirst, /\*\*Version:\*\* 1\.0\.1/);

            const changed2 = upm.updateFileMeta(
                filePath,
                '2026-05-06',
                'unit test change',
                state,
                'unit',
            );
            assert.strictEqual(
                changed2,
                false,
                'an unchanged structural digest must skip the bump on the second call',
            );
            assert.strictEqual(
                fs.readFileSync(filePath, 'utf8'),
                afterFirst,
                'a skipped bump must leave the file untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-project-meta.js appendHistoryRow handles the legacy 3-column history table (no Author)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { indexPath } = makeDesignDir(tempDir);
            fs.writeFileSync(
                indexPath,
                [
                    '# Index',
                    '',
                    '**Version:** 2.0.0',
                    '',
                    '## Document History',
                    '',
                    '| Version | Date | Description |',
                    '| :--- | :--- | :--- |',
                    '| 1.9.0 | 2025-12-01 | Initial |',
                    '',
                ].join('\n'),
            );

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'update-project-meta.js');
            execSync(`node "${scriptPath}" -m "legacy table"`, { cwd: tempDir, stdio: 'pipe' });

            const result = fs.readFileSync(indexPath, 'utf8');
            assert.match(
                result,
                /\*\*Version:\*\* 2\.0\.1/,
                '3-column table must still bump the version',
            );
            assert.match(
                result,
                /\| 2\.0\.1 \| \d{4}-\d{2}-\d{2} \| legacy table \|/,
                'the 3-column row must carry no Author cell',
            );
            assert.doesNotMatch(
                result,
                /Agent/,
                'a 3-column table must never gain a 4th (Author) cell',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 4. generate-context.js
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-context.js should create comprehensive CONTEXT.md', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.mkdirSync(path.join(tempDir, '.design'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                '{"name":"fixture","version":"1.0.0"}\n',
            );
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'generate-context.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const contextContent = fs.readFileSync(
                path.join(tempDir, '.design', 'CONTEXT.md'),
                'utf8',
            );
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'CONTEXT.md')));
            assert.ok(contextContent.includes('Node.js'), 'Should detect Node.js technology');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5. executor.js
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js should bump version on engine change', () => {
        const tempDir = createTempWorkspace(true);
        try {
            // update-engine-meta bails early when .checksums is missing (initializes and returns).
            // Seed checksums so the bump branch is exercised. The manifest builder lives in
            // dev/scripts/ (developer-only); tempDir has dev/scripts/ wired up by createTempWorkspace.
            generateChecksums(tempDir);

            // Trigger drift: modify a file so update-engine-meta detects change and bumps version
            fs.appendFileSync(path.join(tempDir, '.magic', 'scripts', 'init.js'), '\n// drift\n');

            const executorPath = path.join(tempDir, '.magic', 'scripts', 'executor.js');
            execSync(`node "${executorPath}" update-engine-meta`, { cwd: tempDir });

            const versionFile = path.join(tempDir, '.magic', '.version');
            const newVersion = fs.readFileSync(versionFile, 'utf8').trim();
            assert.strictEqual(newVersion, '1.0.1');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5a. update-engine-meta.js — a manifest entry whose file is gone is drift
    //     The disk→manifest walk only visits files that exist, so a deleted or
    //     never-shipped engine file was structurally invisible to --check.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta --check fails when a manifest entry has no file on disk', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            // Control — pristine tree must pass (guards against false positives).
            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'an intact engine must pass --check',
            );

            // `init.js` is tracked in the manifest and not required by update-engine-meta.
            const victim = path.join(tempDir, '.magic', 'scripts', 'init.js');
            assert.ok(fs.existsSync(victim), 'fixture precondition: init.js is present');
            fs.unlinkSync(victim);

            const missing = runEngineMetaCheck(tempDir);
            assert.ok(missing.failed, 'a manifest entry with no file on disk must fail --check');
            assert.match(missing.output, /scripts\/init\.js/, '--check must name the missing file');

            // Write mode treats the absence as an engine change: bump + regenerate.
            const metaScript = path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js');
            execSync(`node "${metaScript}"`, { cwd: tempDir, stdio: 'pipe' });
            assert.strictEqual(
                fs.readFileSync(path.join(tempDir, '.magic', '.version'), 'utf8').trim(),
                '1.0.1',
                'a removed engine file is a change and must bump the version',
            );
            const regenerated = JSON.parse(
                fs.readFileSync(path.join(tempDir, '.magic', '.checksums'), 'utf8'),
            );
            assert.ok(
                !regenerated['scripts/init.js'],
                'the regenerated manifest must drop the removed file',
            );
            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'after regeneration the engine is consistent again',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b. update-engine-meta.js — dev-repo Engine-Version snapshot sync
    //     (l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version
    //     Snapshot Sync). Reuses createTempWorkspace's existing dev/scripts/
    //     mirroring: the dev-repo branch is the fixture default, so the
    //     consumer branch is the one that must explicitly delete the guard
    //     script — mirroring how the fixture already withholds
    //     generate-checksums.js from .magic/scripts/ for the same reason.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta.js syncs the Engine Version snapshot in a dev-repo, leaves it alone in a consumer install', () => {
        const devRepoDir = createTempWorkspace();
        const consumerDir = createTempWorkspace();
        try {
            for (const [tempDir, label] of [
                [devRepoDir, 'dev-repo'],
                [consumerDir, 'consumer'],
            ]) {
                generateChecksums(tempDir);
                fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
                fs.writeFileSync(
                    path.join(tempDir, '.design', 'INDEX.md'),
                    [
                        '# Project Specification Index',
                        '',
                        '**Version:** 1.0.0',
                        '**Status:** Active',
                        '**Engine Version:** 0.0.0',
                        '',
                    ].join('\n'),
                );
                // Trigger drift so the write branch runs (same technique as
                // the "should bump version on engine change" case above).
                fs.appendFileSync(
                    path.join(tempDir, '.magic', 'scripts', 'init.js'),
                    `\n// drift ${label}\n`,
                );
            }

            // Consumer-style fixture: remove the snapshot guard script only. The
            // manifest builder stays, so the write branch still runs and the
            // per-script guard is what is under test. A true user installation
            // lacks the manifest builder and is refused before any of this
            // (see 5b-bis below).
            fs.unlinkSync(path.join(consumerDir, 'dev', 'scripts', 'sync-engine-snapshot.js'));

            // `2>&1`: the consumer-branch message is `console.warn` (stderr),
            // and `execSync`'s return value is stdout only — without merging,
            // the very warning this case exists to pin is silently dropped.
            const runWrite = (tempDir) =>
                execSync(
                    `node "${path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js')}" 2>&1`,
                    { cwd: tempDir, encoding: 'utf8' },
                );

            const devOut = runWrite(devRepoDir);
            const devIndex = fs.readFileSync(path.join(devRepoDir, '.design', 'INDEX.md'), 'utf8');
            const devVersion = fs
                .readFileSync(path.join(devRepoDir, '.magic', '.version'), 'utf8')
                .trim();
            assert.match(
                devIndex,
                new RegExp(`\\*\\*Engine Version:\\*\\* ${devVersion.replace(/\./g, '\\.')}`),
                'dev-repo: .design/INDEX.md Engine Version must match the freshly-bumped .magic/.version',
            );
            assert.match(
                devOut,
                /Engine Version snapshot synced/,
                'dev-repo: sync must run and log',
            );

            const consumerOut = runWrite(consumerDir);
            const consumerIndex = fs.readFileSync(
                path.join(consumerDir, '.design', 'INDEX.md'),
                'utf8',
            );
            assert.match(
                consumerIndex,
                /\*\*Engine Version:\*\* 0\.0\.0/,
                'consumer install: Engine Version snapshot must be untouched',
            );
            assert.match(
                consumerOut,
                /sync-engine-snapshot\.js not found/,
                'consumer install: the skip must be logged, not silent',
            );
            assert.match(
                consumerOut,
                /Engine metadata and version updated/,
                'the rest of the write branch must still complete when only the snapshot script is absent',
            );
        } finally {
            cleanup(devRepoDir);
            cleanup(consumerDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b-bis. update-engine-meta.js / check-prerequisites.js — a user
    //         installation cannot resolve engine drift, and must say so.
    //
    //     A release ships `.magic/` only, so a user installation has no manifest
    //     builder. The write branch used to bump `.magic/.version` anyway, print
    //     "Engine metadata and version updated", and leave the manifest — and
    //     therefore the warning that sent the operator there — exactly as it
    //     was. Every retry moved the version again. The version is the signal
    //     Engine Upgrade Detection reads as "the engine was replaced under this
    //     project", so a local bump reads as a phantom upgrade.
    // ───────────────────────────────────────────────────────────────────────────

    // createTempWorkspace mirrors dev/scripts by default (the dev-repo shape), so
    // the user-installation shape is that fixture with dev/ removed AFTER the
    // manifest is built — the order a release ships in. `spec.md` and `task.md`
    // are the two files the field report named: one edited, one with its line
    // endings converted (the check cannot tell the two apart, and must not have to).
    const makeDriftedEngine = (tempDir, { userInstallation }) => {
        fs.writeFileSync(path.join(tempDir, '.magic', 'spec.md'), '# spec\n');
        fs.writeFileSync(path.join(tempDir, '.magic', 'task.md'), '# task\n');
        generateChecksums(tempDir);
        if (userInstallation)
            fs.rmSync(path.join(tempDir, 'dev'), { recursive: true, force: true });
        fs.appendFileSync(path.join(tempDir, '.magic', 'spec.md'), '<!-- local note -->\n');
        fs.writeFileSync(path.join(tempDir, '.magic', 'task.md'), '# task\r\n');
    };

    // stdout and stderr merged, and a non-zero exit returned instead of thrown:
    // these cases assert on the refusal's message and status, not just success.
    const runMeta = (tempDir, script, ...args) => {
        const res = spawnSync(
            process.execPath,
            [path.join(tempDir, '.magic', 'scripts', script), ...args],
            { cwd: tempDir, encoding: 'utf8' },
        );
        return { status: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
    };

    test('update-engine-meta write mode is refused in a user installation: no version bump, no manifest rewrite, non-zero exit', () => {
        const tempDir = createTempWorkspace();
        try {
            makeDriftedEngine(tempDir, { userInstallation: true });
            const versionPath = path.join(tempDir, '.magic', '.version');
            const checksumsPath = path.join(tempDir, '.magic', '.checksums');
            const manifestBefore = fs.readFileSync(checksumsPath, 'utf8');

            // Twice on purpose: the hazard was a ratchet — each retry of the
            // suggested fix moved the version again while the drift stayed.
            for (const attempt of [1, 2]) {
                // Through the executor, as the warning's own hint invokes it.
                const run = runMeta(tempDir, 'executor.js', 'update-engine-meta');
                assert.notStrictEqual(
                    run.status,
                    0,
                    `attempt ${attempt}: drift that cannot be resolved must not exit 0`,
                );
                assert.match(
                    run.out,
                    /spec\.md/,
                    `attempt ${attempt}: the drifted files must be named`,
                );
                assert.match(
                    run.out,
                    /task\.md/,
                    `attempt ${attempt}: the drifted files must be named`,
                );
                assert.match(
                    run.out,
                    /release archive/,
                    `attempt ${attempt}: the only real remedy must be stated`,
                );
                assert.doesNotMatch(
                    run.out,
                    /Engine metadata and version updated/,
                    `attempt ${attempt}: must not claim a success that changed nothing`,
                );
            }

            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '1.0.0',
                'the engine version must not move',
            );
            assert.strictEqual(
                fs.readFileSync(checksumsPath, 'utf8'),
                manifestBefore,
                'the manifest must be left untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-engine-meta --check tells a user installation to restore from the release archive, and a dev repo to run C14', () => {
        const userDir = createTempWorkspace();
        const devDir = createTempWorkspace();
        try {
            makeDriftedEngine(userDir, { userInstallation: true });
            makeDriftedEngine(devDir, { userInstallation: false });

            const user = runMeta(userDir, 'update-engine-meta.js', '--check');
            assert.strictEqual(
                user.status,
                1,
                'drift must fail --check (the pre-commit hook relies on it)',
            );
            assert.match(user.out, /release archive/, 'user installation: the remedy is a restore');
            assert.doesNotMatch(
                user.out,
                /update-engine-meta/,
                'user installation: must not point at a command it cannot use — regenerating the manifest would mask the change',
            );

            const dev = runMeta(devDir, 'update-engine-meta.js', '--check');
            assert.strictEqual(dev.status, 1, 'dev repo: drift must fail --check');
            assert.match(
                dev.out,
                /update-engine-meta/,
                'dev repo: C14 is the remedy and must stay named',
            );
        } finally {
            cleanup(userDir);
            cleanup(devDir);
        }
    });

    test('check-prerequisites ENGINE_INTEGRITY names the release archive in a user installation, and the C14 command in a dev repo', () => {
        const userDir = createTempWorkspace();
        const devDir = createTempWorkspace();
        try {
            makeDriftedEngine(userDir, { userInstallation: true });
            makeDriftedEngine(devDir, { userInstallation: false });
            const integrity = (tempDir) =>
                runCheckPrerequisites(tempDir).warnings.filter(
                    (w) => w.type === 'ENGINE_INTEGRITY',
                );

            const user = integrity(userDir);
            assert.deepStrictEqual(
                user.map((w) => w.message.match(/'\.magic\/([^']+)'/)[1]).sort(),
                ['spec.md', 'task.md'],
                'user installation: exactly the two drifted files are reported',
            );
            for (const w of user) {
                assert.match(w.message, /release archive/, `user installation: ${w.message}`);
                assert.strictEqual(
                    w.fix,
                    null,
                    'user installation: there is no automated fix to suggest',
                );
            }

            const dev = integrity(devDir);
            assert.strictEqual(dev.length, 2, 'dev repo: the same two files are reported');
            for (const w of dev) {
                assert.match(
                    w.fix,
                    /update-engine-meta/,
                    'dev repo: the C14 command stays the suggested fix',
                );
            }
        } finally {
            cleanup(userDir);
            cleanup(devDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5b-ter. An integrity finding must say HOW a file differs, not only that it
    //         does.
    //
    //     A field report — ENGINE_INTEGRITY for two engine files that were
    //     byte-identical to the release both before and after — could not be
    //     explained afterwards: "modified locally" was printed alike for an edit,
    //     a line-ending conversion and a swapped manifest, and no hash was
    //     recorded. The finding now carries the two short hashes and names the
    //     one difference that is both common and invisible in an editor.
    // ───────────────────────────────────────────────────────────────────────────

    const sha256Hex = (text) => require('crypto').createHash('sha256').update(text).digest('hex');

    test('describeManifestDelta tells a line-endings-only difference from a content difference, in both directions', () => {
        const tempDir = createTempWorkspace();
        try {
            const { describeManifestDelta } = require(
                path.join(tempDir, '.magic', 'scripts', 'utils.js'),
            );
            const file = path.join(tempDir, 'probe.md');

            // [on disk, what the manifest recorded, expected verdict]
            const cases = [
                [
                    'a\r\nb\r\n',
                    'a\nb\n',
                    { lineEndingsOnly: true, found: 'CRLF', expectedEol: 'LF' },
                ],
                [
                    'a\nb\n',
                    'a\r\nb\r\n',
                    { lineEndingsOnly: true, found: 'LF', expectedEol: 'CRLF' },
                ],
                [
                    'a\r\nb\n',
                    'a\nb\n',
                    { lineEndingsOnly: true, found: 'mixed', expectedEol: 'LF' },
                ],
                ['a\nc\n', 'a\nb\n', { lineEndingsOnly: false, found: 'LF', expectedEol: null }],
                // Both differ: the content difference is the finding, the endings are incidental.
                [
                    'a\r\nc\r\n',
                    'a\nb\n',
                    { lineEndingsOnly: false, found: 'CRLF', expectedEol: null },
                ],
            ];
            for (const [onDisk, recorded, want] of cases) {
                fs.writeFileSync(file, onDisk);
                const got = describeManifestDelta(file, sha256Hex(recorded));
                const label = JSON.stringify({ onDisk, recorded });
                assert.strictEqual(got.actual, sha256Hex(onDisk), `actual hash for ${label}`);
                assert.strictEqual(got.expected, sha256Hex(recorded), `expected hash for ${label}`);
                assert.strictEqual(
                    got.lineEndingsOnly,
                    want.lineEndingsOnly,
                    `lineEndingsOnly for ${label}`,
                );
                assert.strictEqual(got.found, want.found, `found for ${label}`);
                assert.strictEqual(got.expectedEol, want.expectedEol, `expectedEol for ${label}`);
            }

            // The verdict must not depend on multi-byte text surviving a round trip.
            fs.writeFileSync(file, 'сводка — §1\r\n');
            assert.strictEqual(
                describeManifestDelta(file, sha256Hex('сводка — §1\n')).lineEndingsOnly,
                true,
                'non-ASCII bytes must round-trip exactly',
            );

            // A vanished file is reported, never thrown: a diagnostic must not become a second failure.
            assert.strictEqual(
                describeManifestDelta(path.join(tempDir, 'absent.md'), sha256Hex('x')),
                null,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('check-prerequisites ENGINE_INTEGRITY carries both hashes, and says when only the line endings differ', () => {
        const devDir = createTempWorkspace();
        const userDir = createTempWorkspace();
        try {
            makeDriftedEngine(devDir, { userInstallation: false });
            makeDriftedEngine(userDir, { userInstallation: true });
            const short = (text) => sha256Hex(text).slice(0, 12);

            for (const [label, tempDir] of [
                ['dev repo', devDir],
                ['user installation', userDir],
            ]) {
                const byFile = Object.fromEntries(
                    runCheckPrerequisites(tempDir)
                        .warnings.filter((w) => w.type === 'ENGINE_INTEGRITY')
                        .map((w) => [w.message.match(/'\.magic\/([^']+)'/)[1], w.message]),
                );

                // task.md: converted to CRLF, otherwise identical to what the manifest recorded.
                assert.match(
                    byFile['task.md'],
                    /only its line endings differ \(found CRLF, the release ships LF; /,
                    `${label}: an endings-only difference must be named as such`,
                );
                assert.ok(
                    byFile['task.md'].includes(
                        `sha256 expected ${short('# task\n')}, found ${short('# task\r\n')}`,
                    ),
                    `${label}: both hashes must be recorded — ${byFile['task.md']}`,
                );

                // spec.md: edited. Content difference, plain wording, still both hashes.
                assert.doesNotMatch(
                    byFile['spec.md'],
                    /line endings/,
                    `${label}: a content edit must not be blamed on line endings`,
                );
                assert.ok(
                    byFile['spec.md'].includes(
                        `sha256 expected ${short('# spec\n')}, found ${short('# spec\n<!-- local note -->\n')}`,
                    ),
                    `${label}: both hashes must be recorded — ${byFile['spec.md']}`,
                );
            }
        } finally {
            cleanup(devDir);
            cleanup(userDir);
        }
    });

    test('update-engine-meta --check names a line-endings-only difference on the file line, and leaves a content difference plain', () => {
        const tempDir = createTempWorkspace();
        try {
            makeDriftedEngine(tempDir, { userInstallation: true });
            const run = runMeta(tempDir, 'update-engine-meta.js', '--check');
            const lineFor = (name) =>
                run.out.split(/\r?\n/).find((l) => l.includes(`Detected change in: ${name}`));

            assert.match(
                lineFor('task.md'),
                /only line endings differ \(found CRLF, the release ships LF\)/,
            );
            assert.doesNotMatch(
                lineFor('spec.md'),
                /line endings/,
                'a content edit must not be blamed on line endings',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5c. update-engine-meta.js — skill regeneration is not gated on the
    //     .magic/ checksum verdict (R26). workflows/ is deliberately excluded
    //     from that manifest (l2-skill-wrappers.md §3.2), so the scan is
    //     structurally blind to a workflows/-only edit. Under the pre-fix
    //     logic, sync-skills() lived inside the `if (anyChanged)` branch —
    //     this reproduces the exact retry that shipped Phase 27's stale
    //     skill wrapper: .magic/ genuinely unchanged, workflows/ changed.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta.js regenerates skill wrappers on a workflows/-only edit, even when .magic/ itself is unchanged', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir, { recursive: true });
            const workflowPath = path.join(workflowsDir, 'magic.example.md');
            fs.writeFileSync(
                workflowPath,
                '---\ndescription: original\n---\n\n# Example\n\nOriginal body.\n',
            );

            const metaScript = path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js');
            const versionPath = path.join(tempDir, '.magic', '.version');
            const skillPath = path.join(tempDir, 'skills', 'magic-example', 'SKILL.md');

            // Control — a pristine .magic/ must not bump the version, and the
            // message must name the scope actually checked (not "engine core"
            // generically — that vagueness was itself part of the defect).
            const firstRun = execSync(`node "${metaScript}"`, { cwd: tempDir, encoding: 'utf8' });
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '1.0.0',
                'control: .magic/ unchanged, version must not bump',
            );
            assert.match(
                firstRun,
                /No changes detected in \.magic\//,
                'the message must name .magic/, not "engine core"',
            );
            assert.ok(
                fs.existsSync(skillPath),
                'the fix: skill wrapper must exist after the very first pass',
            );
            assert.match(fs.readFileSync(skillPath, 'utf8'), /Original body\./);

            // The reproduction: workflows/ changes, .magic/ does not.
            fs.writeFileSync(
                workflowPath,
                '---\ndescription: updated\n---\n\n# Example\n\nUpdated body.\n',
            );
            const secondRun = execSync(`node "${metaScript}"`, { cwd: tempDir, encoding: 'utf8' });
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '1.0.0',
                'a workflows/-only edit correctly still does not bump the version — no engine-core change occurred',
            );
            assert.match(
                secondRun,
                /No changes detected in \.magic\//,
                'the checksum-scoped verdict is genuinely correct here — .magic/ did not change',
            );
            assert.match(
                fs.readFileSync(skillPath, 'utf8'),
                /Updated body\./,
                'the fix: regeneration must not be gated on the .magic/ verdict — a pre-fix run would still read "Original body."',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5d. update-engine-meta.js --check stays strictly read-only even when
    //     workflows/ (outside its scope) has an uncommitted change. This is
    //     the boundary the write-path fix (5c) must not cross: --check is
    //     hardcoded into the user's pre-commit hook, so it must never gain a
    //     write side effect — that would turn every commit into a mutation.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-engine-meta.js --check performs no write and never regenerates skills, even with a pending workflows/ change', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir, { recursive: true });
            fs.writeFileSync(
                path.join(workflowsDir, 'magic.example.md'),
                '---\ndescription: original\n---\n\n# Example\n\nOriginal body.\n',
            );

            const metaScript = path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js');
            const versionPath = path.join(tempDir, '.magic', '.version');
            const checksumsPath = path.join(tempDir, '.magic', '.checksums');
            const skillPath = path.join(tempDir, 'skills', 'magic-example', 'SKILL.md');

            const versionBefore = fs.readFileSync(versionPath, 'utf8');
            const checksumsBefore = fs.readFileSync(checksumsPath, 'utf8');

            const checkOut = execSync(`node "${metaScript}" --check`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8'),
                versionBefore,
                '--check must never write .magic/.version',
            );
            assert.strictEqual(
                fs.readFileSync(checksumsPath, 'utf8'),
                checksumsBefore,
                '--check must never write .magic/.checksums',
            );
            assert.ok(
                !fs.existsSync(skillPath),
                '--check must never trigger skill regeneration — a write side effect on a read-only surface',
            );
            assert.match(checkOut, /No changes detected in \.magic\//);
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6. check-prerequisites.js
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js should validate whole structure', () => {
        const tempDir = createTempWorkspace(true);
        try {
            // 1. Initial State - Success
            fs.mkdirSync(path.join(tempDir, '.design'));
            fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Rules');

            // Need checksums to pass integrity check (developer-only manifest builder in dev/scripts/)
            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir);
            assert.strictEqual(
                result.ok,
                true,
                'Should pass with all files present and correct checksums',
            );

            // 2. Failure Case - Missing file
            fs.unlinkSync(path.join(tempDir, '.design', 'INDEX.md'));
            const resultFail = runCheckPrerequisites(tempDir);
            assert.strictEqual(resultFail.ok, false, 'Should fail if INDEX.md is missing');
            assert.ok(resultFail.missing_required.includes('INDEX.md'));

            // 3. Drift Case
            fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), '# Index Restored');
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Modified Rules');
            execSync('git add . && git commit -m "Fixed"', { cwd: tempDir, stdio: 'ignore' });

            // Manual edit outside workflow
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Drifted Rules');
            const resultDrift = runCheckPrerequisites(tempDir);
            assert.ok(
                resultDrift.warnings.some((w) => w.type === 'CONFIG_DRIFT'),
                'Should detect config drift',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6a. check-prerequisites.js --verify-headers — RE-1 absent-header drift
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js --verify-headers flags absent (not just mismatched) spec headers (RE-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeSpecWorkspace(tempDir);

            const indexRow =
                '| [auth.md](specifications/auth.md) | Auth domain | Stable | 1 | 1.0.0 |';
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                `# Index\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n${indexRow}\n`,
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            // Checksums must pass integrity so ENGINE_INTEGRITY doesn't mask the result.
            generateChecksums(tempDir);

            // Case A — spec file has NO Version/Status header (the silent-failure bug).
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n## Overview\n\nNo header here.\n',
            );
            const drift = runCheckPrerequisites(tempDir, '--verify-headers');
            assert.ok(
                drift.warnings.some((w) => w.type === 'VERSION_DRIFT' && /MISSING/.test(w.message)),
                'absent Version header must raise VERSION_DRIFT (MISSING)',
            );
            assert.ok(
                drift.warnings.some((w) => w.type === 'STATUS_DRIFT' && /MISSING/.test(w.message)),
                'absent Status header must raise STATUS_DRIFT (MISSING)',
            );
            assert.strictEqual(
                drift.ok,
                false,
                'missing headers must make ok:false, not a silent pass',
            );

            // Case B — correct headers present: no drift (guards against false positives).
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## Overview\n\nMatches registry.\n',
            );
            const clean = runCheckPrerequisites(tempDir, '--verify-headers');
            assert.ok(
                !clean.warnings.some(
                    (w) => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT',
                ),
                'matching headers must produce no drift warning',
            );

            // Case C — backward compatibility: without --verify-headers, absent header is NOT checked.
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n## Overview\n\nNo header here.\n',
            );
            const noFlag = runCheckPrerequisites(tempDir);
            assert.ok(
                !noFlag.warnings.some(
                    (w) => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT',
                ),
                'header check must remain opt-in via --verify-headers',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b. check-prerequisites.js — registry cross-reference ignores quoted
    //     mentions and bounds its capture to the filename grammar (SH-1, SH-4)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js registry cross-reference is scan-hygiene compliant (SH-1, SH-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);

            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                '# Index\n\n| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |\n',
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            // A genuine link, plus (a) a Backlog-style parenthetical quoting several
            // template placeholder paths in individual code spans — the exact shape
            // that produced a false REGISTRY_MISMATCH for a nonexistent spec — and
            // (b) a genuinely unregistered pair mentioned unquoted, comma-separated.
            // (b) must still fire: SH-1 exempts what is quoted, not what is merely
            // unbracketed. What SH-4 fixes is *how* it fires — two bounded findings
            // naming `a.md` and `b.md` individually, not one swallowing the comma,
            // the trailing prose, and every quoted token that follows on later lines.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                [
                    '# Plan',
                    '- [x] real spec ([l1-real.md](specifications/l1-real.md))',
                    '- unquoted mention: specifications/a.md, specifications/b.md in prose',
                    '- placeholder note (`main/INDEX.md`, `specifications/{spec.md}`, `other-spec.md`, `tasks/phase-{N}.md`)',
                    '',
                ].join('\n'),
            );

            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir, '--require-specs');

            const mismatches = result.warnings.filter((w) => w.type === 'REGISTRY_MISMATCH');
            assert.deepStrictEqual(
                mismatches.map((w) => w.message.match(/^'([^']+)'/)[1]).sort(),
                ['a.md', 'b.md'],
                `must report exactly the two unquoted, unregistered files — bounded individually, nothing merged or quoted → ${JSON.stringify(mismatches)}`,
            );
            assert.ok(
                !mismatches.some((w) =>
                    /spec\.md|other-spec|phase-\{N\}|main\/INDEX/.test(w.message),
                ),
                'no quoted placeholder token may appear in a finding, merged or otherwise',
            );
            assert.ok(
                !result.warnings.some((w) => w.type === 'ORPHANED_SPEC'),
                'the genuinely-linked real spec must still be recognized as covered',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-bis. check-prerequisites.js — INDEX.md-side registry-scan sites are
    //         scan-hygiene compliant (SH-1, SH-4) — the three sites Phase 17
    //         did not reach, closed by Phase 21
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js INDEX.md-side registry-scan sites are scan-hygiene compliant (SH-1, SH-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);

            // Reproduces the field-reported shape (engine 2.1.70): a Meta
            // Information bullet mentions `specifications/` bare (no markdown
            // link), followed later in the same parenthesized bullet by
            // further `.md` mentions and the bullet's closing `)`. The
            // pre-fix `/specifications\/([^)]*\.md)/g` has no newline
            // exclusion and no filename-grammar boundary, so it captured the
            // entire span as a single corrupted "filename". Also includes a
            // genuinely broken registered spec, to prove the fix bounds the
            // capture rather than blinding the check entirely.
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '| [l1-missing.md](specifications/l1-missing.md) | y | Stable | 1 | 1.0.0 |',
                    '',
                    '## Meta Information',
                    '',
                    '- **Last Updated**: see specifications/ for the layout convention; also touches l1-other.md and l2-another.md in passing)',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- [x] real spec ([l1-real.md](specifications/l1-real.md))\n',
            );

            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir, '--require-specs', '--verify-headers');

            const registryFindings = result.warnings.filter(
                (w) =>
                    w.type === 'GHOST_REGISTRY' ||
                    w.type === 'NAMING_VIOLATION' ||
                    w.type === 'ORPHANED_SPEC',
            );
            assert.ok(
                !registryFindings.some((w) =>
                    /layout convention|l2-another|l1-other/.test(w.message),
                ),
                `the bare prose mention must not surface as a finding, corrupted or otherwise → ${JSON.stringify(registryFindings)}`,
            );
            assert.ok(
                registryFindings.some(
                    (w) => w.type === 'GHOST_REGISTRY' && w.message.includes("'l1-missing.md'"),
                ),
                'a genuinely broken registered spec must still be caught — the fix bounds the capture, it does not blind the check',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2. check-prerequisites.js — design-debt backlog signal (SC-2.4)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js reports DESIGN_DEBT_PENDING only when plan-complete meets an open Backlog (SC-2.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // Positive: plan complete (the engine's own empty-state marker),
            // Backlog holds two open items.
            const hit = findDebtWarning(
                '- Some open design item.\n- Another one.',
                '*None — plan complete. New scope enters via `/magic.task`.*',
            );
            assert.ok(hit, 'a plan-complete state with a non-empty Backlog must raise the signal');
            assert.match(
                hit.message,
                /2 open item/,
                'the count must reflect the actual number of Backlog bullets',
            );
            assert.match(hit.fix, /magic\.spec/, 'the remedy must point at spec authoring');

            // Negative (load-bearing — SC-2.4 is about *distinguishing* two
            // plan-complete states, so a signal that also fires here would be
            // indistinguishable from one that works): same plan-complete
            // state, empty Backlog.
            assert.strictEqual(
                findDebtWarning('', '*None — plan complete. New scope enters via `/magic.task`.*'),
                undefined,
                'an empty Backlog must never raise the signal, even at plan-complete',
            );

            // Negative: an active phase exists — not plan-complete at all,
            // regardless of what the Backlog holds.
            assert.strictEqual(
                findDebtWarning(
                    '- Some open design item.',
                    '| [Phase 3](tasks/phase-3.md) | Something | `In Progress` |',
                ),
                undefined,
                'an active phase must suppress the signal even with a non-empty Backlog',
            );

            // Negative: ambiguous/unrecognized Active Phases content — the
            // check must default to "cannot determine", not "must be complete".
            assert.strictEqual(
                findDebtWarning(
                    '- Some open design item.',
                    'Some unstructured note, not a table and not the marker.',
                ),
                undefined,
                'unrecognized Active Phases content must not be read as plan-complete',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-bis. check-prerequisites.js — DESIGN_DEBT_PENDING's openItems count
    //          skips Parked-marked Backlog bullets (SC-2.4 addendum, Backlog
    //          Disposition Convention, closed by Phase 21)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING excludes Parked-marked Backlog bullets (SC-2.4 addendum)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'TASKS.md'),
                '# Tasks\n\n## Active Phases\n\n*None — plan complete. New scope enters via `/magic.task`.*\n',
            );
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // One plain bullet, one Parked-marked bullet — only the plain one counts.
            const mixed = findDebtWarning(
                '- Some open design item.\n- Already decided, kept visible. *(Parked — no current demand signal.)*',
            );
            assert.ok(
                mixed,
                'a Backlog with at least one plain bullet must still raise the signal',
            );
            assert.match(
                mixed.message,
                /1 open item/,
                'the Parked-marked bullet must not be counted',
            );

            // Every bullet Parked — no open items at all, signal must not fire.
            assert.strictEqual(
                findDebtWarning(
                    '- First parked item. *(Parked — revisit only if X.)*\n- Second parked item. *(Parked — monitoring only.)*',
                ),
                undefined,
                'a Backlog composed entirely of Parked bullets must not raise the signal',
            );

            // A bullet that merely mentions the word "Parked" mid-sentence, not
            // as the disposition marker, must still count as open — the
            // exclusion is the specific `*(Parked` marker shape, not the bare word.
            const wordOnly = findDebtWarning(
                '- This item was previously Parked but is open again.',
            );
            assert.ok(
                wordOnly,
                'a bullet using the word "Parked" without the marker shape must still count as open',
            );
            assert.match(
                wordOnly.message,
                /1 open item/,
                'the bare-word bullet must be counted, not excluded',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-ter. check-prerequisites.js — DESIGN_DEBT_PENDING's plan-complete
    //          predicate recognizes terminal-row completion under the
    //          canonical single-table tasks.md layout (Terminal-Row
    //          Recognition, l1-session-continuity.md SC-2.4 structural
    //          addendum, closed by Phase 22)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING fires under the canonical single-table Active Phases layout (Terminal-Row Recognition)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);

            // Positive: single-table layout (no separate "Completed Phases"
            // section — the shape the shipped tasks.md template actually
            // produces), every row already `Done (Archived)`, two open
            // Backlog bullets — reproduces the field report exactly (engine
            // 2.1.71: 24/24 phases Done, 2 open bullets, gate stayed silent).
            const archivedTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                '| [Phase 2](archives/tasks/phase-2.md) | Follow-up | `Done (Archived)` |',
            ].join('\n');
            const hit = findDebtWarning('- Some open design item.\n- Another one.', archivedTable);
            assert.ok(
                hit,
                'an all-terminal single-table Active Phases must be read as plan-complete, not only the literal empty marker',
            );
            assert.match(
                hit.message,
                /2 open item/,
                'the count must reflect the actual number of Backlog bullets',
            );

            // Negative: same shape, but one row is still non-terminal — the
            // plan is genuinely incomplete and must not be misread as done.
            const mixedTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                '| [Phase 2](tasks/phase-2.md) | Follow-up | `In Progress` |',
            ].join('\n');
            assert.strictEqual(
                findDebtWarning('- Some open design item.', mixedTable),
                undefined,
                'a non-terminal row anywhere in the table must suppress the signal — the plan is not actually complete',
            );

            // A lone `Cancelled` row is terminal too — must not block the signal.
            const cancelledTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Abandoned | `Cancelled` |',
            ].join('\n');
            const cancelledHit = findDebtWarning('- Some open design item.', cancelledTable);
            assert.ok(
                cancelledHit,
                'a table of only `Cancelled` rows is terminal and must be read as plan-complete',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b2-quater. check-prerequisites.js — the zero-row terminal case. Both
    //             specs already require it (l1-session-continuity.md
    //             §Terminal-Row Recognition names "a workspace whose table was
    //             manually cleared"; l2-engine-automation.md's normative line
    //             reads "section has zero rows, OR every row ... terminal"),
    //             but the implementation recognized zero rows only when the
    //             literal `*None*` marker was present.
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js DESIGN_DEBT_PENDING fires on a vacant Active Phases section (zero-row terminal case)', () => {
        const tempDir = createTempWorkspace();
        try {
            const designDir = makeMinimalDesignDir(tempDir);
            const findDebtWarning = makeDebtWarningFinder(tempDir, designDir);
            const openBacklog = '- Some open design item.\n- Another one.';

            // (a) Rows relocated into a separate `## Completed Phases` section,
            // leaving `## Active Phases` empty — the hand-split layout this
            // engine's own workspace carries. Terminal-Row Recognition fixed
            // the single-table shape; this is the same predicate's other end,
            // where there is no row to read a terminal status from at all.
            const vacant = findDebtWarning(
                openBacklog,
                [
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                ].join('\n'),
            );
            assert.ok(
                vacant,
                'a vacant Active Phases section is plan-complete — zero rows is a terminal case',
            );
            assert.match(vacant.message, /2 open item/, 'the count must still reflect the Backlog');

            // (b) Table scaffolding with no data rows — the same zero-row state
            // spelled with a header the author left behind.
            assert.ok(
                findDebtWarning(
                    openBacklog,
                    '| Phase | Description | Status |\n| --- | --- | --- |',
                ),
                'a header-only table carries zero phase rows and is equally terminal',
            );

            // (c) The fail-closed boundary the vacancy rule must not erode:
            // content that is present but unrecognized stays "cannot
            // determine". A gate that can raise a HALT must never fire on
            // input it could not parse — only on input it positively read as
            // empty.
            assert.strictEqual(
                findDebtWarning(
                    openBacklog,
                    'Some unstructured note, not a table and not the marker.',
                ),
                undefined,
                'unrecognized content must still suppress the signal',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6c. scan-hygiene.js — shared strip-before-match helper (SH-1, SH-2, SH-5)
    // ───────────────────────────────────────────────────────────────────────────
    test('scan-hygiene.js stripQuoted removes fenced and inline-quoted content, preserving line count', () => {
        const tempDir = createTempWorkspace();
        try {
            const { stripQuoted } = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'scan-hygiene.js'),
            );

            const input = [
                'a',
                '```',
                '- [ ] quoted in a fence',
                '```',
                'b `- [ ] quoted in a span` c',
                '> a blockquoted - [ ] item survives',
                '<!-- an HTML comment - [ ] also survives -->',
            ].join('\n');

            const out = stripQuoted(input);
            const outLines = out.split('\n');

            assert.strictEqual(
                outLines.length,
                input.split('\n').length,
                'line count must be preserved',
            );
            assert.doesNotMatch(outLines[2], /- \[ \]/, 'fenced content must not survive');
            assert.doesNotMatch(outLines[4], /- \[ \]/, 'inline-span content must not survive');
            assert.match(
                outLines[5],
                /blockquoted - \[ \] item survives/,
                'blockquotes are out of scope (§2) and must be untouched',
            );
            assert.match(
                outLines[6],
                /HTML comment - \[ \] also survives/,
                'HTML comments are out of scope (§2) and must be untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('scan-hygiene.js stripQuoted removes fences before spans (a stray backtick inside a fence must not swallow trailing text)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { stripQuoted } = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'scan-hygiene.js'),
            );

            // A fence containing a single backtick would, if spans were stripped
            // first, be read as an unterminated span delimiter and swallow every-
            // thing up to the next real backtick — including the sentinel below.
            const input = [
                '```',
                'a single ` backtick inside a fence',
                '```',
                'SENTINEL should survive `this real span`',
            ].join('\n');

            const out = stripQuoted(input);
            assert.match(
                out,
                /SENTINEL should survive/,
                'fence-first ordering must not let a stray backtick swallow trailing content',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7. update-state.js
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js should bootstrap, patch fields and append decision/constraint', () => {
        const tempDir = createTempWorkspace();
        try {
            // Copy real state template so bootstrap path exercises template branch
            copyStateTemplate(tempDir);

            const wsDir = makeWorkspace(tempDir, 'main');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'update-state.js');

            // 1. Bootstrap — STATE.md should be created from template
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --status=Active --phase=1 --next-action="Run /magic.spec"`,
                { cwd: tempDir },
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'STATE.md should be created from template');
            const initialState = fs.readFileSync(statePath, 'utf8');
            assert.ok(/\*\*Status:\*\*\s+Active/.test(initialState), 'Status should be patched');
            assert.ok(/\*\*Phase:\*\*\s+1/.test(initialState), 'Phase should be patched');

            // 2. Add decision — should appear under Recent Decisions with today's date
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --decision="Adopt SDD workflow"`,
                { cwd: tempDir },
            );
            const afterDecision = fs.readFileSync(statePath, 'utf8');
            // Structural assertions, not presence-only: the prior single
            // assertion here (`/## Recent Decisions[\s\S]*Adopt SDD workflow/`)
            // matches at any distance, so it passed identically whether the
            // entry landed before or after the blank-line/comment preamble —
            // structurally incapable of catching the defect this pins
            // (addDecision inserting directly after the heading, no blank
            // line, displacing the preamble below the entries — markdownlint
            // MD022/MD032/MD012).
            assert.match(
                afterDecision,
                /## Recent Decisions\r?\n\r?\n<!-- Last 3-5 locked decisions/,
                'the heading must be followed by a blank line, then the comment preamble — not an entry',
            );
            assert.match(
                afterDecision,
                /are dropped \(not archived\) — see PLAN\.md \/ CHANGELOG\.md for phase history\. -->\r?\n\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* Adopt SDD workflow/,
                'the new entry must sit after the comment preamble, not before it',
            );
            // l2-finalize-state-accuracy.md §10: the preamble previously claimed
            // an archival to PLAN.md that no code path ever performed — pin the
            // absence, not only the replacement's presence, so a future edit
            // cannot silently reintroduce the same false promise while still
            // passing the match above (a different string could satisfy the
            // "after the preamble" shape without removing the old claim if a
            // future preamble concatenated both).
            assert.doesNotMatch(
                afterDecision,
                /archived to PLAN\.md/,
                'the preamble must not claim an archival the code never performs',
            );
            assert.doesNotMatch(
                afterDecision,
                /\r?\n[ \t]*\r?\n[ \t]*\r?\n/,
                'no run of two or more consecutive blank lines may appear anywhere in STATE.md',
            );
            assert.doesNotMatch(
                afterDecision,
                /\{YYYY-MM-DD\}/,
                "the template's own placeholder decision rows must not survive alongside a real entry",
            );

            // 3. Add constraint — should be auto-numbered [C-001]
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --constraint-title="No Mocks" --constraint-desc="Integration tests only"`,
                { cwd: tempDir },
            );
            const afterConstraint = fs.readFileSync(statePath, 'utf8');
            // Template state.md already contains a [C-001] placeholder, so auto-numbering produces C-002
            assert.ok(
                /\[C-002\].*No Mocks.*Integration tests only/.test(afterConstraint),
                'Constraint entry should be auto-numbered (C-002 given template placeholder)',
            );
            // Structural assertions, not presence-only — same defect class as
            // addDecision above: addConstraint's insertion point used the
            // identical `/^[^<]/m` comment-skip search addDecision was
            // rewritten away from. A blank line's own line-terminating `\n`
            // satisfies `[^<]` at position 0, so `contentStart > 0` was
            // always false and every constraint landed directly after the
            // heading — above the MANDATORY-reading comment block — piling
            // up there across calls instead of joining the entry list below it.
            assert.match(
                afterConstraint,
                /## Blocking Constraints\r?\n\r?\n<!-- Anti-patterns discovered through real failures\. MANDATORY reading\. -->/,
                'the heading must be followed by a blank line, then the comment preamble — not an entry',
            );
            assert.match(
                afterConstraint,
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-002\] \*\*No Mocks\*\*: Integration tests only/,
                'the new entry must sit after the comment preamble, not before it',
            );
            assert.doesNotMatch(
                afterConstraint,
                /\r?\n[ \t]*\r?\n[ \t]*\r?\n/,
                'no run of two or more consecutive blank lines may appear anywhere in STATE.md',
            );

            // A second constraint must join the first newest-first, both
            // still below the comment preamble — pins that the fix rebuilds
            // the whole entry list rather than only the first insertion.
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --constraint-title="No Sleep Loops" --constraint-desc="Use condition polling"`,
                { cwd: tempDir },
            );
            const afterSecondConstraint = fs.readFileSync(statePath, 'utf8');
            assert.match(
                afterSecondConstraint,
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-003\] \*\*No Sleep Loops\*\*: Use condition polling\r?\n- \[C-002\] \*\*No Mocks\*\*: Integration tests only/,
                'a second constraint must be prepended above the first, both below the comment preamble — newest-first, list never split by the heading',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7b. finalize.js — session continuity (SC-2 / SC-2.1 / SC-3)
    // ───────────────────────────────────────────────────────────────────────────
    test('finalize.js computeNextAction is plan-state-aware (SC-2.1)', () => {
        const tempDir = createTempWorkspace();
        try {
            // require.main guard means requiring finalize.js does NOT run main().
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            // (a) Legacy inline format: open task in TASKS.md → /magic.run.
            fs.writeFileSync(tasksPath, '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n');
            let next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magic\.run engine/, 'inline open task → /magic.run');
            assert.match(next, /T-1A01/, 'should name the open task');

            // (b) Canonical two-level format: TASKS.md is a registry (table),
            //     open tasks live in tasks/phase-1.md.
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-1A01] Setup project',
                    '- [ ] [T-1A02] Implement feature',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(
                next,
                /\/magic\.run engine/,
                'canonical two-level: open task in phase file → /magic.run',
            );
            assert.match(next, /T-1A02/, 'should name the open task from phase file');

            // (c) Registry fallback: no open checkboxes anywhere, but registry
            //     shows a non-Done phase → recommend continuing that phase.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-1A01] Setup project',
                    '- [x] [T-1A02] Implement feature',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /Phase 1/, 'registry fallback: non-Done phase → Continue Phase N');
            assert.match(next, /\/magic\.run/, 'registry fallback recommends /magic.run');

            // (d) Plan complete — no open tasks, all phases Done.
            fs.writeFileSync(
                tasksPath,
                [
                    '## Active Phases',
                    '',
                    '*None — plan complete.*',
                    '',
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '',
                ].join('\n'),
            );
            // Remove phase file to be clean.
            fs.unlinkSync(path.join(tasksDir, 'phase-1.md'));
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(
                next,
                /\/magic\.task engine/,
                'plan complete after task → /magic.task funnel (§5)',
            );
            assert.doesNotMatch(
                next,
                /\/magic\.spec/,
                '/magic.spec must never be named proactively (§5)',
            );
            assert.doesNotMatch(
                next,
                /execute the active phase/,
                'must not recommend a non-existent phase (the R6 bug)',
            );

            // (d2) Same plan-complete state reached via `run`. The recommendation
            //     is deliberately identical to (d): STATE.md `Next Action` is
            //     workflow-agnostic at read time (/magic.status replays it
            //     verbatim), so a per-branch recommendation would let a line that
            //     is legal for one workflow surface under another.
            assert.strictEqual(
                finalize.computeNextAction('run', 'engine', wsDir),
                next,
                'plan-complete recommendation must not vary by originating workflow',
            );

            // (e) spec/rule → replan first (pipeline order).
            assert.match(
                finalize.computeNextAction('spec', 'engine', wsDir),
                /\/magic\.task/,
                'spec → /magic.task',
            );
            assert.match(
                finalize.computeNextAction('rule', 'engine', wsDir),
                /\/magic\.task/,
                'rule → /magic.task',
            );

            // (f) Unreadable TASKS.md → safe planning fallback.
            const voidWs = path.join(tempDir, '.design', 'void');
            assert.match(
                finalize.computeNextAction('run', 'void', voidWs),
                /\/magic\.task/,
                'missing TASKS.md → /magic.task fallback',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never names a reserved command (§5)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            // Every plan state the three-tier lookup can land in. The previous
            // regression fixed the plan-complete `run` branch only and left the
            // `task` branch emitting /magic.spec, so this sweeps the full matrix
            // rather than pinning one cell of it.
            const planStates = {
                'inline open task': '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n',
                'registry active phase': registryTable('In Progress'),
                'plan complete': [
                    '## Active Phases',
                    '',
                    '*None — plan complete.*',
                    '',
                    '## Completed Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |',
                    '',
                ].join('\n'),
                'empty registry': '# Master Task Index\n\n## Active Phases\n\n',
            };

            for (const [label, tasks] of Object.entries(planStates)) {
                fs.writeFileSync(tasksPath, tasks);
                for (const workflow of ['spec', 'task', 'run', 'rule']) {
                    const next = finalize.computeNextAction(workflow, 'engine', wsDir);
                    assert.doesNotMatch(
                        next,
                        /\/magic\.(spec|analyze)/,
                        `${workflow} @ ${label}: reserved command leaked into Next Action → "${next}"`,
                    );
                    // §5 / DA-6: the user sees exactly ONE next step. STATE.md
                    // `Next Action` is replayed verbatim by /magic.status, so a
                    // second command here becomes a second user-visible option.
                    const commands = next.match(/\/magic\.[a-z.]+/g) || [];
                    assert.strictEqual(
                        commands.length,
                        1,
                        `${workflow} @ ${label}: expected exactly one command, got ${commands.length} → "${next}"`,
                    );
                }
            }

            // Unreadable workspace — the catch-path fallback is bound too.
            const voidNext = finalize.computeNextAction(
                'run',
                'void',
                path.join(tempDir, '.design', 'void'),
            );
            assert.doesNotMatch(
                voidNext,
                /\/magic\.(spec|analyze)/,
                'catch fallback must stay §5-clean',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js patches STATE.md on the skip path (SC-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { designDir, wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n*None — plan complete.*\n',
            );
            // No whitelisted file changes after this baseline → skip path.
            commitFixture(tempDir);

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            assert.match(
                out,
                /No significant changes|Finalization complete/,
                'finalize should run on the skip path',
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(statePath),
                'SC-2: STATE.md created/patched even on the skip path',
            );
            const state = fs.readFileSync(statePath, 'utf8');
            assert.match(state, /\*\*Updated:\*\*/, 'STATE.md carries an Updated timestamp');
            assert.match(
                state,
                /\/magic\.task main/,
                'SC-2.1 e2e: plan-complete next-action routes through the /magic.task funnel',
            );
            assert.doesNotMatch(
                state,
                /Next Action:.*\/magic\.spec/,
                '§5: the persisted Next Action never names /magic.spec',
            );
            // SC-3 retirement regression pins: the STATE.md write dirties the
            // tree (previously the SC-3 fallback's trigger condition), but no
            // commit-related output is ever emitted any more.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
            assert.match(
                fs.readFileSync(path.join(designDir, '.version'), 'utf8'),
                /^0\.1\.0$/,
                'skip path does not bump the version',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js resolveWorkspaceDir: an explicit --workspace or MAGIC_WORKSPACE always outranks MAGIC_DESIGN_DIR (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize } = requireFinalizeWorkspace(tempDir);
            const designAbs = path.join(tempDir, '.design');
            const savedDesignDir = process.env.MAGIC_DESIGN_DIR;
            const savedWorkspaceEnv = process.env.MAGIC_WORKSPACE;
            try {
                // A stale MAGIC_DESIGN_DIR naming a different workspace must never
                // win over an explicit --workspace flag.
                process.env.MAGIC_DESIGN_DIR = '.design/other';
                delete process.env.MAGIC_WORKSPACE;
                assert.strictEqual(
                    finalize.resolveWorkspaceDir('engine', 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'an explicit --workspace must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Same precedence for MAGIC_WORKSPACE (no CLI flag, but the env
                // var that named `workspace` still outranks MAGIC_DESIGN_DIR).
                process.env.MAGIC_WORKSPACE = 'engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'MAGIC_WORKSPACE must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Legitimate case: neither a flag nor MAGIC_WORKSPACE was given,
                // so MAGIC_DESIGN_DIR was itself the signal resolveWorkspace()
                // used to name `workspace` — it is trusted as the literal directory.
                delete process.env.MAGIC_WORKSPACE;
                process.env.MAGIC_DESIGN_DIR = '.design/engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.resolve(tempDir, '.design/engine'),
                    'MAGIC_DESIGN_DIR is authoritative only when it is the sole naming signal',
                );
            } finally {
                if (savedDesignDir === undefined) delete process.env.MAGIC_DESIGN_DIR;
                else process.env.MAGIC_DESIGN_DIR = savedDesignDir;
                if (savedWorkspaceEnv === undefined) delete process.env.MAGIC_WORKSPACE;
                else process.env.MAGIC_WORKSPACE = savedWorkspaceEnv;
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js does not let a stale MAGIC_DESIGN_DIR redirect STATE.md away from an explicit --workspace (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [ ] [T-1A01] Todo\n',
            );

            // A second, unrelated workspace with its own STATE.md — never named
            // by this invocation's --workspace, only by a stale MAGIC_DESIGN_DIR
            // left in the environment (e.g. from an earlier command in the same
            // shell/session targeting a different workspace).
            const otherWsDir = makeWorkspace(tempDir, 'other');
            const otherStatePath = path.join(otherWsDir, 'STATE.md');
            const sentinel = [
                '# Project State',
                '',
                '**Workspace:** other',
                '**Updated:** 2020-01-01 00:00',
                '**Phase:** 1',
                '**Status:** Active',
                '',
                '## Current Position',
                '',
                '- **Task:** [T-0000] Sentinel — must never change',
                '- **Spec:** sentinel.md',
                '- **Next Action:** SENTINEL-UNTOUCHED',
                '',
            ].join('\n');
            fs.writeFileSync(otherStatePath, sentinel);
            commitFixture(tempDir);

            // An uncommitted, whitelisted change → the success path, matching
            // the shape of the real-world repro (a workflow that just landed
            // new TASKS.md content, then invoked finalize).
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
                env: { ...process.env, MAGIC_DESIGN_DIR: '.design/other' },
            });

            assert.match(
                out,
                /Finalization complete/,
                'the whitelisted TASKS.md change must still be significant',
            );
            assert.match(
                out,
                /\| Workspace \| main \|/,
                'finalize reports the explicitly-requested workspace',
            );
            assert.match(
                out,
                /\.design[\\/]main[\\/]STATE\.md/,
                'STATE.md update must target the main workspace explicitly, not one named by MAGIC_DESIGN_DIR',
            );
            const mainStatePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(mainStatePath),
                'STATE.md must have been created/patched inside the main workspace directory',
            );
            const mainState = fs.readFileSync(mainStatePath, 'utf8');
            assert.match(
                mainState,
                /- \*\*Next Action:\*\* Plan complete/,
                'main STATE.md received the real computed Next Action, not the template placeholder',
            );
            assert.doesNotMatch(
                mainState,
                /SENTINEL/,
                "main STATE.md must never carry the other workspace's sentinel content",
            );

            assert.strictEqual(
                fs.readFileSync(otherStatePath, 'utf8'),
                sentinel,
                'the unrelated workspace named only by a stale MAGIC_DESIGN_DIR must be left byte-for-byte untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never recommends executing a task in a Blocked phase (SC-2.1(a))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const phaseFile = (status) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${status}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                ].join('\n');

            // The two Blocked signals are written by different steps and are not
            // updated atomically, so each must be sufficient on its own —
            // requiring agreement would wave a half-applied transition through.
            const blockedCases = {
                'frontmatter only': { registry: 'In Progress', phase: 'Blocked' },
                'registry row only': { registry: 'Blocked', phase: 'In Progress' },
                'both signals': { registry: 'Blocked', phase: 'Blocked' },
            };

            for (const [label, state] of Object.entries(blockedCases)) {
                fs.writeFileSync(tasksPath, registryTable(state.registry));
                fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile(state.phase));

                const next = finalize.computeNextAction('run', 'engine', wsDir);
                assert.doesNotMatch(
                    next,
                    /^Execute T-/,
                    `${label}: Blocked phase must not yield an execute-style recommendation → "${next}"`,
                );
                assert.match(next, /T-1A01/, `${label}: the blocked task should still be named`);
                // The redirected value passes the same single-exit screen.
                assert.doesNotMatch(
                    next,
                    /\/magic\.(spec|analyze)/,
                    `${label}: §5 reserved command leaked`,
                );
                assert.strictEqual(
                    (next.match(/\/magic\.[a-z.]+/g) || []).length,
                    1,
                    `${label}: exactly one command expected → "${next}"`,
                );
            }

            // Control: an unblocked phase with the same open item still dispatches.
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('In Progress'));
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A01/,
                'a healthy phase must still resolve to execution — the guard must not fire on every phase',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction skips a task whose own Detailed Tracking marks it Blocked or Assignment: User (SC-2.1(c))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, title, status, assignment) =>
                [
                    `### [${id}] ${title}`,
                    '',
                    `- **Status:** ${status}`,
                    `- **Assignment:** ${assignment}`,
                    '',
                ].join('\n');

            const phaseFile = (firstStatus, firstAssignment) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', firstStatus, firstAssignment),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'Agent'),
                ].join('\n');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) first item Status: Blocked → the later actionable item is named.
            // The pre-T-23A01 code named T-1A01 unconditionally here (manually
            // confirmed against the single-match lookup during spec authoring —
            // same shape as the Phase 19 R12 negative-control pattern).
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Blocked', 'Agent'));
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'a Status: Blocked first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (ii) first item Assignment: User → the later actionable item is named.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'User'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'an Assignment: User first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (iii) every open item excluded → terminal branch: not Execute-style,
            // not the plan-complete funnel, no reserved command, exactly one
            // /magic.* command named.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', 'Blocked', 'Agent'),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'User'),
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(
                next,
                /^Execute T-/,
                'all-excluded phase must not yield an execute-style recommendation',
            );
            assert.doesNotMatch(
                next,
                /Plan complete/,
                'all-excluded phase must not be reported as plan-complete — tasks remain',
            );
            assert.doesNotMatch(next, /\/magic\.(spec|analyze)/, 'reserved command must not leak');
            assert.strictEqual(
                (next.match(/\/magic\.[a-z.]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.match(
                next,
                /T-1A01/,
                'the terminal message should still name a task for context',
            );

            // (iv) negative control — everything Todo/Agent still dispatches
            // normally, the same shape as the existing SC-2.1(a) control case.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'Agent'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A01/,
                'a fully agent-actionable phase must still dispatch its first task',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction preserves code spans in task titles while still ignoring quoted checklist lines', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) a title carrying a backticked path must survive verbatim.
            // `stripQuoted()` (SH-1) blanks matched characters rather than
            // removing them — same line count, not same character offsets —
            // so a title read from the stripped text loses the span. This
            // pins the field regression named `NEXT_ACTION_TITLE_STRIPPED`,
            // introduced by the SC-2.1(c) per-item scan itself.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] New `dev/scripts/sync-engine-snapshot.js` (L2 snapshot writer)',
                    '',
                ].join('\n'),
            );
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /`dev\/scripts\/sync-engine-snapshot\.js`/,
                `title's code span must survive verbatim → "${next}"`,
            );
            assert.doesNotMatch(
                next,
                / {2}/,
                `no double-space artifact from a blanked span → "${next}"`,
            );

            // (ii) control — the detector must still read stripped text, not
            // raw: a quoted checklist line in prose must not be picked up as
            // a real task. This is the assertion that stops a future fix
            // from reverting to raw content wholesale and reopening SH-1.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Real actionable task',
                    '',
                    '## Notes',
                    '',
                    '`- [ ] [T-9Z99] Not a real task, just documentation`',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A01/, `quoted line must not be picked up → "${next}"`);
            assert.doesNotMatch(next, /T-9Z99/, `quoted task ID must not be named → "${next}"`);
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reports every changed file, not just whitelisted ones (stdout listing completeness)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, versionPath, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            fs.writeFileSync(path.join(tempDir, 'dev', 'deliverable.js'), '// baseline\n');
            commitFixture(tempDir);

            // One whitelisted change (TASKS.md status flip) and one outside the
            // whitelist — the shape of every magic.run whose task produced real
            // source changes, since product code is never inside the whitelist.
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] Also done\n',
            );
            fs.writeFileSync(
                path.join(tempDir, 'dev', 'deliverable.js'),
                "// the task's actual output\n",
            );

            const out = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            // (a) Significance is unchanged: the whitelisted file still drives the bump.
            assert.match(
                out,
                /Finalization complete/,
                'whitelisted change must still be significant',
            );
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '0.1.1',
                'the whitelist subset alone must still decide the version bump',
            );

            // (b) The stdout listing names the non-whitelisted file alongside the whitelisted one.
            const artifacts = out.slice(
                out.indexOf('### Changed artifacts'),
                out.indexOf('### Next step'),
            );
            assert.match(
                artifacts,
                /dev\/deliverable\.js/,
                'stdout listing must name the non-whitelisted change',
            );
            assert.match(
                artifacts,
                /TASKS\.md/,
                'stdout listing must still name the whitelisted change',
            );

            // SC-3 retirement regression pin: no commit-message output at all.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('buildChangelogBullet keeps spec identifiers out of the product CHANGELOG (RC-11)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { buildChangelogBullet } = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'commit-suggester.js'),
            );

            // Asserted against the function's return value, not a written
            // CHANGELOG.md — only a real invocation touches that file, and this
            // generator is the only surface where the containment gates cannot
            // reach: nothing here is authored by a role or reviewed as a diff.
            const single = buildChangelogBullet('spec', 'main', [
                { path: '.design/main/specifications/l1-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(
                single,
                /model-runtime/,
                'single-spec branch must not embed the artifact ID',
            );
            assert.match(single, /specification/, 'the bullet must still describe what changed');
            assert.match(
                single,
                /\(main\)/,
                'the workspace stays in the bullet — it is not an SDD identifier',
            );

            // The branch that was already correct must stay correct.
            const multi = buildChangelogBullet('spec', 'main', [
                { path: '.design/main/specifications/l1-model-runtime.md', status: 'modified' },
                { path: '.design/main/specifications/l2-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(multi, /model-runtime/, 'multi-spec branch must stay generic');

            // No other branch may regress into interpolating an identifier.
            const runBullet = buildChangelogBullet('run', 'main', [
                { path: '.design/main/tasks/phase-7.md', status: 'modified' },
            ]);
            assert.doesNotMatch(
                runBullet,
                /phase-7/,
                'run branch must not embed a task-file identifier',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7c. phase-archiver.js — eligibility precision (R7 / l2-engine-finalization §6)
    // ───────────────────────────────────────────────────────────────────────────
    test('phase-archiver findArchiveCandidates matches checklist lines, not prose `- [ ]` (R7)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // (a) Done, all checklist items [x], but Notes quote `- [ ]` in prose → archivable.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-20.md'),
                '---\nphase: 20\nname: "Quoting"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-20A01] Done item\n\n' +
                    '## Detailed Tracking\n\n### [T-20A01]\n- **Notes:** detect open `- [ ]` tasks via regex.\n',
            );

            // (b) Done but a genuine unchecked checklist line → NOT archivable.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-21.md'),
                '---\nphase: 21\nname: "Open"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-21A01] Done\n- [ ] [T-21A02] Still open\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                candidates.includes('phase-20.md'),
                'prose `- [ ]` must not block archival (R7 fix)',
            );
            assert.ok(
                !candidates.includes('phase-21.md'),
                'a real unchecked checklist line must still block archival',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7c-2. phase-archiver.js — name recognition (l2-engine-finalization §6.1)
    // ───────────────────────────────────────────────────────────────────────────
    test('findArchiveCandidates recognizes track-suffixed phase files (phase-10b.md)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // A track-split workbook: Done, checklist fully checked. Before the
            // fix the name filter dropped it before its status was ever read.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-10b.md'),
                '---\nphase: 10\nname: "Track B"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-10B01] Done item\n',
            );

            // Same shape, still open → the suffix must not become a free pass.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-10a.md'),
                '---\nphase: 10\nname: "Track A"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-10A01] Done\n- [ ] [T-10A02] Open\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                candidates.includes('phase-10b.md'),
                'a track-suffixed phase file must be evaluated on status, not excluded by name',
            );
            assert.ok(
                !candidates.includes('phase-10a.md'),
                'an open checklist must still block archival for suffixed files',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('findArchiveCandidates orders phase files numerically, suffix as tiebreaker', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Lexical sort would yield phase-10* before phase-2 — the numeric
            // ordering below is what callers and the archival log rely on.
            for (const [file, phase] of [
                ['phase-10b.md', 10],
                ['phase-2.md', 2],
                ['phase-10a.md', 10],
            ]) {
                fs.writeFileSync(
                    path.join(tasksDir, file),
                    `---\nphase: ${phase}\nname: "W"\nstatus: Done\n---\n\n` +
                        '## Atomic Checklist\n\n- [x] [T-1A01] Done\n',
                );
            }

            assert.deepStrictEqual(
                archiver.findArchiveCandidates(wsDir).map((c) => c.file),
                ['phase-2.md', 'phase-10a.md', 'phase-10b.md'],
                'phase files sort by number first, then by track suffix',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('archiveCompletedPhases reports unrecognized task files instead of dropping them silently', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Not a phase workbook by any spelling — it must never be archived,
            // but the caller has to be able to say so out loud. A silent drop is
            // indistinguishable from "evaluated and found ineligible".
            fs.writeFileSync(
                path.join(tasksDir, '02-legacy-workbook.md'),
                '# Legacy\n\n- [x] done\n',
            );

            const result = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(result.archived, [], 'a non-phase file is never archived');
            assert.deepStrictEqual(
                result.unrecognized,
                ['02-legacy-workbook.md'],
                'a non-phase .md in tasks/ is surfaced, not swallowed',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // A completed, archivable Phase 3 ("Shipping") plus its TASKS.md registry
    // row — the fixed point every archival-rewrite test in this section starts
    // from before layering its own PLAN.md content.
    const makeDoneShippingPhaseFixture = (tasksDir, wsDir) => {
        fs.writeFileSync(
            path.join(tasksDir, 'phase-3.md'),
            '---\nphase: 3\nname: "Shipping"\nstatus: Done\n---\n\n' +
                '## Atomic Checklist\n\n- [x] [T-3A01] Ship it\n',
        );

        const tasksPath = path.join(wsDir, 'TASKS.md');
        fs.writeFileSync(
            tasksPath,
            [
                '# Master Task Index',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 3](tasks/phase-3.md) | Shipping | `Done` |',
                '',
            ].join('\n'),
        );
        return tasksPath;
    };

    // require()s phase-archiver.js, applies the Done-Shipping-phase fixture,
    // and returns the PLAN.md path — the pairing both archival index-rewrite
    // tests below start from before diverging on PLAN.md's own content.
    const requireShippingPhaseWithPlan = (tempDir) => {
        const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);
        const tasksPath = makeDoneShippingPhaseFixture(tasksDir, wsDir);
        return { archiver, wsDir, tasksDir, tasksPath, planPath: path.join(wsDir, 'PLAN.md') };
    };

    // ───────────────────────────────────────────────────────────────────────────
    // 7d. phase-archiver.js — archival rewrites links in PLAN.md, not only TASKS.md
    // ───────────────────────────────────────────────────────────────────────────
    test('archiveCompletedPhases rewrites phase links in both TASKS.md and PLAN.md', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir, tasksPath, planPath } =
                requireShippingPhaseWithPlan(tempDir);
            fs.writeFileSync(
                planPath,
                [
                    '# Implementation Plan',
                    '',
                    '## Phase 3 — Shipping',
                    '',
                    'Breakdown lives in [Phase 3](tasks/phase-3.md).',
                    '',
                ].join('\n'),
            );

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(
                archived.map((a) => a.file),
                ['phase-3.md'],
                'the Done phase must be archived',
            );

            assert.ok(
                fs.existsSync(path.join(wsDir, 'archives', 'tasks', 'phase-3.md')),
                'phase file must be moved into archives/tasks/',
            );
            assert.ok(
                !fs.existsSync(path.join(tasksDir, 'phase-3.md')),
                'archival is a move, not a copy',
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(
                tasks,
                /\(archives\/tasks\/phase-3\.md\)/,
                'TASKS.md link must be rewritten',
            );
            assert.match(
                tasks,
                /`Done \(Archived\)`/,
                'TASKS.md row status must become Done (Archived)',
            );

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(
                plan,
                /\(archives\/tasks\/phase-3\.md\)/,
                'PLAN.md link must be rewritten',
            );
            assert.doesNotMatch(
                plan,
                /\(tasks\/phase-3\.md\)/,
                'PLAN.md must not keep a dangling link to the moved file',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('archiveCompletedPhases rewrites a self-labelling PLAN.md link without touching prose (R10)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksPath, planPath } = requireShippingPhaseWithPlan(tempDir);

            // PLAN.md's own convention: the "Tasks:" line is self-labelling —
            // the label *is* the path — which is the form the R10 fix targets.
            // A separate Backlog line mentions the same path in plain prose,
            // describing history; that mention must survive byte-for-byte.
            fs.writeFileSync(
                planPath,
                [
                    '### Phase 3 — Shipping',
                    '',
                    '- [x] **Shipping** [L2]',
                    '  - Tasks: [tasks/phase-3.md](tasks/phase-3.md)',
                    '',
                    '## Backlog',
                    '',
                    '- Historical note: the original breakdown lived at tasks/phase-3.md before later restructuring.',
                    '',
                ].join('\n'),
            );

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(
                archived.map((a) => a.file),
                ['phase-3.md'],
            );

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(
                plan,
                /Tasks: \[archives\/tasks\/phase-3\.md\]\(archives\/tasks\/phase-3\.md\)/,
                'the self-labelling link must move both its label and its target together',
            );
            assert.doesNotMatch(
                plan,
                /\[tasks\/phase-3\.md\]/,
                'no trace of the pre-move self-label may remain',
            );
            assert.match(
                plan,
                /Historical note: the original breakdown lived at tasks\/phase-3\.md before later restructuring\./,
                'a bare prose mention of the path must survive byte-for-byte — it describes history, not a live link',
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(
                tasks,
                /\[Phase 3\]\(archives\/tasks\/phase-3\.md\)/,
                'TASKS.md label (a phase number, not a path) must be unchanged',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7e. update-state.js — autoProgress merges, never clobbers narrative (SC-2)
    // ───────────────────────────────────────────────────────────────────────────
    test('updateState autoProgress refreshes counter lines but preserves narrative in the Progress block', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '# Master Task Index',
                    '',
                    '### Phase 2 Checklist',
                    '',
                    '- [x] [T-2A01] First',
                    '- [x] [T-2A02] Second',
                    '- [ ] [T-2A03] Third',
                    '',
                    '## Registry',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '| [Phase 2](tasks/phase-2.md) | Feature | `In Progress` |',
                    '',
                ].join('\n'),
            );

            // STATE.md with stale counters AND hand-authored narrative in the fence.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** engine',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 2',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Next Action:** whatever',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 2: [0/3] ░░░░░░░░ 0%',
                    'Overall: [0/2] ░░░░░░░░ 0%',
                    'T-2A02 landed the parser rework; edge cases in Notes.',
                    '```',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(state, /Phase 2: \[2\/3\]/, 'phase counter line must be recomputed');
            assert.match(state, /Overall: \[1\/2\]/, 'overall counter line must be recomputed');
            assert.doesNotMatch(state, /\[0\/3\]/, 'stale counters must not survive');
            assert.match(
                state,
                /T-2A02 landed the parser rework/,
                'hand-authored narrative inside the Progress fence must be preserved',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('updateState autoProgress replaces template placeholder counters without duplicating them', () => {
        const tempDir = createTempWorkspace();
        try {
            const realTemplate = path.resolve(
                __dirname,
                '..',
                '..',
                '.magic',
                'templates',
                'state.md',
            );
            fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '',
                ].join('\n'),
            );

            // Bootstrap STATE.md from the real template (placeholder counters),
            // then recompute: `{filled}/{total}`-style placeholders are engine-owned
            // lines and must be replaced, not preserved as narrative.
            const state = autoProgressState(updateState, wsDir, { phase: '1' });

            assert.match(
                state,
                /Overall: \[1\/1\]/,
                'placeholder block must be recomputed from TASKS.md',
            );
            assert.doesNotMatch(
                state,
                /\{filled\}|\{done\}/,
                'template placeholder counters must not survive as narrative',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress emits a phase counter for the two-level task layout (SC-2.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir, tasksDir, tasksPath } =
                requireUpdateStateWithTasks(tempDir);

            // Registry-only TASKS.md: no inline `### Phase N Checklist` heading.
            // This is the canonical layout, so the phase line must come from the
            // phase file — deriving it from the inline heading alone produced an
            // aggregate-only block for every project on the modern format.
            fs.writeFileSync(
                tasksPath,
                [
                    '# Master Task Index',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '| [Phase 3](tasks/phase-3.md) | Feature | `In Progress` |',
                    '',
                ].join('\n'),
            );

            fs.writeFileSync(
                path.join(tasksDir, 'phase-3.md'),
                [
                    '---',
                    'phase: 3',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-3A01] One',
                    '- [x] [T-3A02] Two',
                    '- [ ] [T-3A03] Three',
                    '- [ ] [T-3A04] Four',
                    '- [ ] [T-3A05] Five',
                    '',
                    '## Detailed Tracking',
                    '',
                    '### [T-3A03] Three',
                    '',
                    '- **Notes:** the archiver looks for `- [ ]` lines; quoting one here',
                    '  must not inflate the count.',
                    '',
                ].join('\n'),
            );

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 3',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Overall: [0/2] ░░░░░░░░ 0%',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(
                state,
                /Phase 3: \[2\/5\]/,
                'phase counter must be derived from the phase file',
            );
            assert.match(state, /Overall: \[1\/2\]/, 'aggregate counter must still be recomputed');
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress preserves counter-shaped lines under labels the engine never writes (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '### Phase 1 Checklist',
                    '',
                    '- [x] [T-1A01] One',
                    '- [ ] [T-1A02] Two',
                    '',
                    '## Registry',
                    '',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                    '',
                ].join('\n'),
            );

            // `Overall` and `Phase {N}` are the only labels computeProgress emits.
            // Anything else sharing the shape is operator narrative: nothing
            // regenerates it, so matching it as engine-owned means deleting it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 1: [0/2] ░░░░░░░░ 0%',
                    'Overall: [0/1] ░░░░░░░░ 0%',
                    'Specification: [3/3] complete',
                    'Plan: [1/1] complete',
                    'Implementation: [1/5] in progress — see notes below',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(
                state,
                /Phase 1: \[1\/2\]/,
                'engine-owned phase counter must be regenerated',
            );
            assert.match(
                state,
                /Overall: \[0\/1\]/,
                'engine-owned aggregate counter must be regenerated',
            );
            assert.match(
                state,
                /Specification: \[3\/3\] complete/,
                'custom counter-shaped line must survive',
            );
            assert.match(
                state,
                /Plan: \[1\/1\] complete/,
                'custom counter-shaped line must survive',
            );
            assert.match(
                state,
                /Implementation: \[1\/5\] in progress — see notes below/,
                'custom counter-shaped line must survive verbatim, trailing prose included',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress leaves `$`-digit sequences in narrative untouched (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n',
            );

            // A string-form .replace() re-scans its own result for `$1`-`$9`,
            // so a dollar amount in preserved narrative used to splice captured
            // fence fragments into the middle of the note — corrupting the
            // document's structure, not merely a counter's value.
            const narrative = [
                'Budget check: spend is $1,200 of the',
                '$3,000 sprint allocation — on track.',
            ];
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Overall: [0/1] ░░░░░░░░ 0%',
                    ...narrative,
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const before = (
                fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8').match(/```/g) || []
            ).length;
            const state = autoProgressState(updateState, wsDir);

            for (const line of narrative) {
                assert.ok(
                    state.includes(line),
                    `narrative line must survive byte-for-byte → missing "${line}"`,
                );
            }
            assert.strictEqual(
                (state.match(/```/g) || []).length,
                before,
                'the fence count must not change — an injected fence unbalances every section below it',
            );
            assert.doesNotMatch(
                state,
                /## Progress[\s\S]*## Progress/,
                'no structural fragment may be spliced into the fence',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('the line-cap guard distinguishes a real prune from an exhausted one (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            const captureWarnings = (fn) => warnedBy(fn).join('\n');

            // Blocking Constraints grow monotonically by design and are never
            // pruned, so they can push the file past the cap on their own. Once
            // Recent Decisions is at its 1-entry floor the guard has nothing
            // left to remove — and must say so instead of reusing the message
            // that claims a prune happened.
            const buildState = (decisionCount) =>
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Recent Decisions',
                    '',
                    ...Array.from(
                        { length: decisionCount },
                        (_, i) => `- 2026-01-0${i + 1} **Decision:** entry ${i + 1}`,
                    ),
                    '',
                    '## Blocking Constraints',
                    '',
                    ...Array.from(
                        { length: 95 },
                        (_, i) =>
                            `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
                    ),
                    '',
                ].join('\n');

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(1));
            const exhausted = captureWarnings(() => updateState(wsDir, {}, {}));

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(3));
            const restored = captureWarnings(() => updateState(wsDir, {}, {}));

            assert.match(exhausted, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.match(restored, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.notStrictEqual(
                exhausted,
                restored,
                'an exhausted guard must be observably different from a successful prune',
            );
            assert.match(
                exhausted,
                /nothing was pruned/,
                'the exhausted case must say nothing was removed',
            );
            assert.match(
                exhausted,
                /Blocking Constraints/,
                'the exhausted case must name the section to review',
            );
            assert.doesNotMatch(
                restored,
                /nothing was pruned/,
                'a real prune must not claim exhaustion',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test("addDecision/addConstraint preserve existing entries' wrapped continuation lines (SC-1.2)", () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A wrapped list-item continuation line is valid, common Markdown —
            // and the section rebuild used to lose it: `existingLines` filtered
            // `block.split(/\r?\n/)` down to lines matching the entry marker
            // regex alone, so a continuation line (carrying no marker of its
            // own) was silently dropped on every subsequent rebuild.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Recent Decisions',
                    '',
                    '<!-- Last 3-5 locked decisions. -->',
                    '',
                    '- 2026-01-01 **Decision:** This is a long decision that wraps',
                    '  onto a second continuation line for readability.',
                    '- 2025-12-31 **Pattern:** A short one-line entry.',
                    '',
                    '## Blocking Constraints',
                    '',
                    '<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->',
                    '<!-- Agent MUST explicitly acknowledge each constraint before working. -->',
                    '',
                    '- [C-001] **Do not X**: because Y happened before',
                    '  and here is the continuation explaining Y.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { decision: 'A brand new decision' }, { addDecision: true });
            updateState(
                wsDir,
                { constraint: { title: 'No Z', desc: 'Because W' } },
                { addConstraint: true },
            );
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(
                state,
                /- 2026-01-01 \*\*Decision:\*\* This is a long decision that wraps\r?\n {2}onto a second continuation line for readability\./,
                'the wrapped decision continuation must survive the window rebuild, attached to its own entry',
            );
            assert.match(
                state,
                /- \[C-001\] \*\*Do not X\*\*: because Y happened before\r?\n {2}and here is the continuation explaining Y\./,
                'the wrapped constraint continuation must survive the rebuild, attached to its own entry',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('the line-cap guard prunes a whole multi-line decision entry, not just its marker line (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // `decLines` used to be filtered to marker-only lines, and the
            // prune removed just `decLines[last] + '\n'` — for a wrapped
            // oldest entry that deletes only its first line, leaving the
            // continuation as an orphaned fragment where the entry used to be.
            const state = [
                '# Project State',
                '',
                '**Phase:** 1',
                '**Status:** Active',
                '',
                '## Recent Decisions',
                '',
                '- 2026-01-05 **Decision:** entry 5',
                '- 2026-01-04 **Decision:** entry 4',
                '- 2026-01-03 **Decision:** entry 3',
                '- 2026-01-02 **Decision:** the oldest entry wraps',
                '  onto a continuation line that must be pruned along with it.',
                '',
                '## Blocking Constraints',
                '',
                ...Array.from(
                    { length: 95 },
                    (_, i) =>
                        `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
                ),
                '',
            ].join('\n');
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), state);

            updateState(wsDir, {}, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.doesNotMatch(
                after,
                /onto a continuation line that must be pruned along with it\./,
                "the oldest entry's continuation line must be pruned along with its marker line",
            );
            assert.doesNotMatch(
                after,
                /the oldest entry wraps/,
                "the oldest entry's own marker line must be pruned too",
            );
            assert.match(after, /entry 3/, 'entries within the cap must survive');
        } finally {
            cleanup(tempDir);
        }
    });

    test('scalar field patches replace a wrapped entry whole, not just its first line (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The scalar-field loop patched each field with a single-line `.*`
            // pattern, so an entry an agent had hand-wrapped onto indented
            // continuation lines lost only its marker line: the new (shorter)
            // text landed there and the old continuation lines stayed behind,
            // orphaned, under text they no longer belonged to. Every field goes
            // through the same loop, so a header field is covered as well as
            // the three `- **X:**` bullets.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 4 — A long phase name that an agent wrapped',
                    '  onto a continuation line',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-3A02] A long task title that an agent wrapped onto',
                    '  a second physical line because it exceeded the column limit,',
                    '  and then a third.',
                    '- **Spec:** l1-example.md §3, wrapped so that the',
                    '  spec pointer spills onto its own continuation line.',
                    '- **Next Action:** Run the next task; the description is long',
                    '  enough that it wraps once more onto a continuation line.',
                    '',
                    '## Recent Decisions',
                    '',
                    '- 2026-01-02 **Decision:** an entry this call must not touch',
                    '  together with its own continuation line.',
                    '',
                ].join('\n'),
            );

            updateState(
                wsDir,
                {
                    phase: '5 — Next',
                    task: '[T-3A03] Short',
                    spec: 'x.md',
                    nextAction: 'Go',
                },
                {},
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            // Whole-file equality (modulo the volatile timestamp) rather than a
            // presence check: it fails on a surviving orphan *and* on a patch
            // that swallowed a neighbouring line.
            assert.strictEqual(
                after.replace(/^\*\*Updated:\*\* .*\n/m, ''),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Phase:** 5 — Next',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-3A03] Short',
                    '- **Spec:** x.md',
                    '- **Next Action:** Go',
                    '',
                    '## Recent Decisions',
                    '',
                    '- 2026-01-02 **Decision:** an entry this call must not touch',
                    '  together with its own continuation line.',
                    '',
                ].join('\n'),
                'each patched field must occupy exactly one line, its old continuation lines gone and every other line untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a header field consumes indented continuation lines only; an unindented line under it is left alone (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // Header fields sit against one another with no list structure, so
            // unlike a `- **X:**` bullet there is nothing for a lazy (unindented)
            // continuation to attach to: an unindented line under one is as
            // likely to be its neighbour or a stray note as its wrap, and
            // guessing wrong deletes it. Indentation is the only continuation
            // signal a header field honours.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 1 — Bootstrap',
                    '  wrapped and indented',
                    '**Status:** Active',
                    'An unindented line directly under the header fields.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { phase: '2 — Build', status: 'Blocked' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                after.replace(/^\*\*Updated:\*\* .*\n/m, ''),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Phase:** 2 — Build',
                    '**Status:** Blocked',
                    'An unindented line directly under the header fields.',
                    '',
                ].join('\n'),
                'the indented wrap goes with its field; the unindented line under Status must survive',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a list-item field also consumes lazily wrapped (unindented) continuation lines (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // CommonMark lets a list item's paragraph continue on an unindented
            // line — it renders identically to the indented wrap — so an agent
            // that wraps `- **Task:**` without indenting still produces one
            // logical entry, and replacing only its marker line orphans the
            // rest. An indented sub-bullet hangs under the entry it follows.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A01] A long title that an agent wrapped',
                    'without indenting the second line, which Markdown still',
                    'reads as part of the same list item.',
                    '- **Spec:** l1-example.md §3, wrapped in two styles',
                    '  first indented',
                    'then unindented',
                    '- **Next Action:** Run the next task;',
                    'a lazy line',
                    '  - a nested sub-bullet that belongs to the entry above it',
                    '',
                    '## Progress',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { task: '[T-1A02] Short', spec: 'x.md', nextAction: 'Go' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                after,
                [
                    '# Project State',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A02] Short',
                    '- **Spec:** x.md',
                    '- **Next Action:** Go',
                    '',
                    '## Progress',
                    '',
                ].join('\n'),
                'lazy, indented and mixed continuation lines must all go with their entry, and nothing else',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a list-item field stops at a blank line and at every construct that opens a new block (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The lazy rule must never reach past its own entry. Each line below
            // can directly follow a bullet field with no blank line between them
            // and has to be left exactly where it is: dropping any one of them
            // from the engine's stop-set would delete it on the next patch.
            const blockStarts = [
                '- **Spec:** the next bullet',
                '* a star bullet',
                '+ a plus bullet',
                '1. an ordered item',
                '2) another ordered item',
                '**Handoff File:** none',
                '# a heading',
                '> a quote',
                '| a | table |',
                '<!-- a comment -->',
                '```text',
                '~~~',
                '---',
            ];
            const stateFile = path.join(wsDir, 'STATE.md');

            for (const start of blockStarts) {
                fs.writeFileSync(
                    stateFile,
                    [
                        '# Project State',
                        '',
                        '- **Task:** old task',
                        'a lazy line that is part of the entry',
                        start,
                        '',
                    ].join('\n'),
                );

                updateState(wsDir, { task: 'new task' }, {});

                assert.strictEqual(
                    fs.readFileSync(stateFile, 'utf8'),
                    ['# Project State', '', '- **Task:** new task', start, ''].join('\n'),
                    `a line opening \`${start}\` must survive the patch of the bullet above it`,
                );
            }

            fs.writeFileSync(
                stateFile,
                [
                    '# Project State',
                    '',
                    '- **Task:** old task',
                    'a lazy line that is part of the entry',
                    '',
                    'A plain paragraph after a blank line.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { task: 'new task' }, {});

            assert.strictEqual(
                fs.readFileSync(stateFile, 'utf8'),
                [
                    '# Project State',
                    '',
                    '- **Task:** new task',
                    '',
                    'A plain paragraph after a blank line.',
                    '',
                ].join('\n'),
                'a blank line must end the entry',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a wrapped field is replaced whole in a CRLF file without introducing a bare LF (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A Windows checkout under `core.autocrlf` leaves STATE.md CRLF, so
            // the continuation pattern has to span `\r\n` line breaks — and the
            // replacement must not disturb the endings of the lines around it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1 — Bootstrap',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A01] A long title that wraps',
                    '  onto an indented continuation line,',
                    'then a lazy one.',
                    '- **Next Action:** Go',
                    '',
                ].join('\r\n'),
            );

            updateState(wsDir, { task: '[T-1A02] Short' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.doesNotMatch(
                after,
                /onto an indented continuation line/,
                'the indented continuation must not survive as an orphan',
            );
            assert.doesNotMatch(
                after,
                /then a lazy one/,
                'the lazy continuation must not survive as an orphan',
            );
            assert.match(
                after,
                /- \*\*Task:\*\* \[T-1A02\] Short\r\n- \*\*Next Action:\*\* Go\r\n/,
                'the patched entry must be followed directly by the next bullet, CRLF intact',
            );
            assert.doesNotMatch(after, /[^\r]\n/, 'no bare LF may be introduced into a CRLF file');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a task-scoped update leaves the phase-level Status field alone (SC-1.1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1 — Bootstrap',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** T-1A01 Scaffold the app',
                    '- **Next Action:** whatever',
                    '',
                ].join('\n'),
            );

            // `status` is the phase-level field and its vocabulary is
            // Active | Blocked | Paused. One task finishing is not a phase
            // transition, so the per-task patch carries no status at all.
            updateState(
                wsDir,
                { task: 'T-1A02 Wire the parser', nextAction: 'Execute T-1A03' },
                {},
            );
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(
                state,
                /\*\*Status:\*\* Active/,
                'the phase-level Status must survive a task-scoped update',
            );
            assert.match(
                state,
                /- \*\*Task:\*\* T-1A02 Wire the parser/,
                'the task field must be updated',
            );
            assert.doesNotMatch(
                state,
                /\*\*Status:\*\* (Done|Cancelled|Todo)/,
                'task vocabulary must never reach the phase field',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('field patches insert `$`-bearing values verbatim, never as replacement patterns (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A string-form .replace() re-scans its replacement text for `$'`
            // (right context), `` $` `` (left context), `$&` (whole match) and
            // `$$` — none of which need a capture group to fire. finalize.js's
            // synthesizeNextAction() embeds arbitrary task titles, so a title
            // with bash ANSI-C quoting (`$'…'`) used to splice the entire tail
            // of STATE.md into the Next Action line and duplicate every section
            // below it, a second stale `## Progress` counter among them.
            const evilTitle = "Handle the $'refund' path and the $& fallback";
            const nextAction = `Execute T-8B04 ${evilTitle} via /magic.run engine`;

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 8 — Payments',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** T-8B03 Wire the webhook',
                    '- **Next Action:** whatever',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 8: [3/7] ███░░░░░ 43%',
                    'Overall: [2/5] ███░░░░░ 40%',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { nextAction, task: `T-8B04 ${evilTitle}` }, {});
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.ok(
                state.includes(`- **Next Action:** ${nextAction}`),
                'the Next Action value must be inserted byte-for-byte',
            );
            assert.ok(
                state.includes(`- **Task:** T-8B04 ${evilTitle}`),
                'the Task value must be inserted byte-for-byte',
            );
            assert.strictEqual(
                (state.match(/^## Progress$/gm) || []).length,
                1,
                "a `$'`/`$&` expansion must not duplicate a document section",
            );
            assert.strictEqual(
                (state.match(/```/g) || []).length,
                2,
                'the fence count must stay balanced',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // A STATE.md an agent has trimmed by hand keeps its header fields,
    // `## Current Position` and the `## Progress` fence, and loses the list
    // sections `update-state` writes into. Both list writers used to guard
    // their whole rebuild with `if (secStart !== -1)` and no alternative, so
    // on such a file they accepted the request, wrote nothing, and the CLI
    // still reported `STATE.md updated` (l2-finalize-state-accuracy.md §13).
    const trimmedState = [
        '# Project State',
        '',
        '**Workspace:** docs',
        '**Updated:** 2026-01-01 00:00',
        '**Phase:** 2 — Build',
        '**Status:** Active',
        '',
        '## Current Position',
        '',
        '- **Task:** [T-2A01] Wire the parser',
        '- **Spec:** l1-example.md §3',
        '- **Next Action:** Continue',
        '',
        '## Progress',
        '',
        '```',
        'Overall: [1/2] ████░░░░ 50%',
        '```',
        '',
    ];
    const decisionsPreamble =
        '<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->';
    const constraintsPreamble = [
        '<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->',
        '<!-- Agent MUST explicitly acknowledge each constraint before working. -->',
    ];
    // Whole-file view with the two volatile parts normalised — the
    // `**Updated:**` stamp is dropped and an entry's date becomes `DATE` — so a
    // test can assert equality rather than presence.
    const withoutVolatile = (state) =>
        state
            .replace(/^\*\*Updated:\*\* .*\r?\n/m, '')
            .replace(/^- \d{4}-\d{2}-\d{2} /gm, '- DATE ');
    // Codes of every finding recorded so far in a temp workspace's sink.
    const recordedCodes = (tempDir) => {
        const sink = path.join(tempDir, '.design', '.cache', 'diagnostics.jsonl');
        if (!fs.existsSync(sink)) return [];
        return fs
            .readFileSync(sink, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line).code);
    };

    test('addDecision creates a missing "## Recent Decisions" section instead of dropping the entry (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\n'));

            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'Adopt the strict parser' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            // Whole-file equality pins where the section lands, the single blank
            // line on each side and the preamble — not merely that the text exists.
            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(
                    [
                        ...trimmedState,
                        '## Recent Decisions',
                        '',
                        decisionsPreamble,
                        '',
                        '- DATE **Decision:** Adopt the strict parser',
                        '',
                    ].join('\n'),
                ),
                'the entry must be recorded in a newly created section at the end of the file',
            );
            assert.ok(
                warnings.some((w) => /Recent Decisions/.test(w) && /created/i.test(w)),
                'creating the section must be announced on stderr',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_SECTION_CREATED'],
                'creating the section must be recorded once as a diagnostic',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a section addDecision created is reused by the next call, which announces nothing (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\n'));

            updateState(wsDir, { decision: 'first' }, { addDecision: true });
            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'second' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                (after.match(/^## Recent Decisions$/gm) || []).length,
                1,
                'the second call must find the section the first created, not add another',
            );
            assert.match(
                after,
                /- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* second\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* first/,
                'entries must sit newest-first in the one section',
            );
            assert.deepStrictEqual(
                warnings,
                [],
                'a call that finds its section has nothing to announce',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_SECTION_CREATED'],
                'creation is recorded once, not once per call',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('addConstraint creates a missing "## Blocking Constraints" section at its template position (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The section's slot is set by the template order, not by where the
            // file happens to end: it goes before the earliest section that
            // follows it, and at the end of the file only when none does.
            const cases = [
                {
                    name: 'nothing follows it, so it is appended at the end of the file',
                    existing: [
                        '## Recent Decisions',
                        '',
                        '- 2026-01-02 **Decision:** an existing entry',
                        '',
                    ],
                    expected: [
                        '## Recent Decisions',
                        '',
                        '- 2026-01-02 **Decision:** an existing entry',
                        '',
                        '## Blocking Constraints',
                        '',
                        ...constraintsPreamble,
                        '',
                        '- [C-001] **No Z**: Because W',
                        '',
                    ],
                },
                {
                    name: 'Session Continuity follows it, so it is inserted before that section',
                    existing: ['## Session Continuity', '', '**Handoff File:** none', ''],
                    expected: [
                        '## Blocking Constraints',
                        '',
                        ...constraintsPreamble,
                        '',
                        '- [C-001] **No Z**: Because W',
                        '',
                        '## Session Continuity',
                        '',
                        '**Handoff File:** none',
                        '',
                    ],
                },
            ];

            for (const { name, existing, expected } of cases) {
                fs.writeFileSync(
                    path.join(wsDir, 'STATE.md'),
                    [...trimmedState, ...existing].join('\n'),
                );
                updateState(
                    wsDir,
                    { constraint: { title: 'No Z', desc: 'Because W' } },
                    { addConstraint: true },
                );
                const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

                assert.strictEqual(
                    withoutVolatile(after),
                    withoutVolatile([...trimmedState, ...expected].join('\n')),
                    `${name}: the constraint must be recorded as C-001 in a newly created section`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    // Records one decision in a STATE.md made of `trimmedState` plus `following`
    // and asserts the new section landed directly after `## Progress`, with
    // `following` — everything that used to come next — untouched below it.
    // Whole-file equality also proves the section is set off by exactly one
    // blank line on each side (no MD012/MD022 drift).
    const assertDecisionSectionCreatedAhead = (following, message) => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [...trimmedState, ...following].join('\n'),
            );

            updateState(wsDir, { decision: 'Adopt the strict parser' }, { addDecision: true });
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(
                    [
                        ...trimmedState,
                        '## Recent Decisions',
                        '',
                        decisionsPreamble,
                        '',
                        '- DATE **Decision:** Adopt the strict parser',
                        '',
                        ...following,
                    ].join('\n'),
                ),
                message,
            );
        } finally {
            cleanup(tempDir);
        }
    };

    test('addDecision places a created section before the sections that follow it in template order (SC-1)', () => {
        assertDecisionSectionCreatedAhead(
            [
                '## Blockers',
                '',
                '- [blocking] none',
                '',
                '## Blocking Constraints',
                '',
                ...constraintsPreamble,
                '',
                '- [C-001] **Do not X**: because Y',
                '',
                '## Session Continuity',
                '',
                '**Handoff File:** none',
                '',
            ],
            'the section must land between Progress and Blockers, the sections after it untouched',
        );
    });

    test('a STATE.md that only quotes the heading text is not corrupted by addDecision (SC-2)', () => {
        // The heading is absent, but its text appears mid-line in another
        // section. The old substring search took that occurrence for the
        // heading and spliced the rebuilt block into the middle of the line:
        // its tail was destroyed and a decisions section appeared inside
        // `## Blocking Constraints`.
        assertDecisionSectionCreatedAhead(
            [
                '## Blocking Constraints',
                '',
                ...constraintsPreamble,
                '',
                '- [C-001] **Heads-up**: update-state ignores ## Recent Decisions when it is absent',
                '',
                '## Session Continuity',
                '',
                '**Handoff File:** none',
                '',
            ],
            'the quoted line must survive whole and the decision must get a real section of its own',
        );
    });

    test('a CRLF STATE.md missing the section gets it created once, and both entries survive (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A Windows checkout under git autocrlf. The section rebuild has
            // always written its own block with bare LF; what matters here is
            // that the heading is found on the second call and not created again.
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\r\n'));

            updateState(wsDir, { decision: 'first' }, { addDecision: true });
            updateState(wsDir, { decision: 'second' }, { addDecision: true });
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                (after.match(/^## Recent Decisions$/gm) || []).length,
                1,
                'the heading must be created once, then found on the next call',
            );
            assert.match(
                after,
                /\*\*Decision:\*\* second\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* first/,
                'both entries must be present, newest first',
            );
            assert.deepStrictEqual(recordedCodes(tempDir), ['STATE_SECTION_CREATED']);
        } finally {
            cleanup(tempDir);
        }
    });

    test('a hand-suffixed "## Recent Decisions (last 5)" heading is still the section, not a missing one (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // Anchoring the heading to the start of a line must not demand the
            // end of it too: a heading someone suffixed by hand was found by the
            // old substring search, and a second section here would duplicate it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    ...trimmedState,
                    '## Recent Decisions (last 5)',
                    '',
                    '- 2026-01-02 **Decision:** an earlier entry',
                    '',
                ].join('\n'),
            );

            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'a later entry' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.deepStrictEqual(
                after.match(/^## Recent Decisions.*$/gm),
                ['## Recent Decisions'],
                'exactly one section, rebuilt to the canonical heading',
            );
            assert.match(
                after,
                /\*\*Decision:\*\* a later entry\r?\n- 2026-01-02 \*\*Decision:\*\* an earlier entry/,
                'the existing entry must be kept below the new one',
            );
            assert.deepStrictEqual(
                warnings,
                [],
                'an existing section must not be announced as created',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                [],
                'an existing section must not be recorded as created',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // Applies one updateState call to a STATE.md built from `lines` (joined with
    // `eol`) in a throwaway workspace and returns what it left behind: the file,
    // whatever it announced on stderr and the diagnostic codes it recorded.
    // `files` are extra workspace files (a TASKS.md for the progress cases).
    const patchState = (lines, patch, options = {}, { eol = '\n', files = {} } = {}) => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), lines.join(eol));
            for (const [name, body] of Object.entries(files))
                fs.writeFileSync(path.join(wsDir, name), body);
            const warnings = warnedBy(() => updateState(wsDir, patch, options));
            return {
                after: fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8'),
                warnings,
                codes: recordedCodes(tempDir),
            };
        } finally {
            cleanup(tempDir);
        }
    };

    // §13.1 — the scalar-field loop and the Progress recompute used to skip,
    // silently, a write whose anchor was absent, and matched their anchors
    // anywhere in a line rather than at its start.
    test('a requested header field with no line is created in template order (SC-2)', () => {
        const tail = ['## Current Position', '', '- **Task:** [T-2A01] Wire the parser', ''];
        const headerOf = (...fields) => [
            '# Project State',
            '',
            ...(fields.length ? [...fields, ''] : []),
            ...tail,
        ];
        const stamp = '**Updated:** 2026-01-01 00:00';
        const cases = [
            {
                name: 'before the earliest present field that follows it',
                existing: headerOf('**Workspace:** docs', stamp, '**Status:** Active'),
                patch: { phase: '3 — Ship' },
                expected: headerOf(
                    '**Workspace:** docs',
                    stamp,
                    '**Phase:** 3 — Ship',
                    '**Status:** Active',
                ),
            },
            {
                name: 'after the last present field when none follows it',
                existing: headerOf('**Workspace:** docs', stamp, '**Phase:** 2 — Build'),
                patch: { status: 'Blocked' },
                expected: headerOf(
                    '**Workspace:** docs',
                    stamp,
                    '**Phase:** 2 — Build',
                    '**Status:** Blocked',
                ),
            },
            {
                name: 'after the title when the header holds no field at all',
                existing: headerOf(),
                patch: { phase: '2 — Build' },
                expected: headerOf('**Phase:** 2 — Build'),
            },
        ];

        for (const { name, existing, patch, expected } of cases) {
            const { after, warnings, codes } = patchState(existing, patch);
            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(expected.join('\n')),
                `${name}: the field must be created where the template puts it, adjacent to its neighbours`,
            );
            assert.deepStrictEqual(
                codes,
                ['STATE_FIELD_CREATED'],
                `${name}: creation must be recorded once`,
            );
            assert.ok(
                warnings.some((w) => /created/i.test(w)),
                `${name}: creation must be announced on stderr`,
            );
        }
    });

    test('a requested Current Position field with no line is created, and so is the section when it is gone (SC-2)', () => {
        const header = ['# Project State', '', '**Phase:** 2 — Build', ''];
        const progress = ['## Progress', '', '```', 'Overall: [1/2] ████░░░░ 50%', '```', ''];
        const cases = [
            {
                name: 'appended after the last field of the section',
                existing: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A01] Wire the parser',
                    '',
                ],
                patch: { nextAction: 'Go' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A01] Wire the parser',
                    '- **Next Action:** Go',
                    '',
                ],
                codes: ['STATE_FIELD_CREATED'],
            },
            {
                name: 'inserted before the earliest present field that follows it',
                existing: [...header, '## Current Position', '', '- **Next Action:** Continue', ''],
                patch: { task: '[T-2A02] New task' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A02] New task',
                    '- **Next Action:** Continue',
                    '',
                ],
                codes: ['STATE_FIELD_CREATED'],
            },
            {
                name: 'with the section itself created ahead of Progress when the file has none',
                existing: [...header, ...progress],
                patch: { nextAction: 'Go' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Next Action:** Go',
                    '',
                    ...progress,
                ],
                codes: ['STATE_SECTION_CREATED', 'STATE_FIELD_CREATED'],
            },
        ];

        for (const { name, existing, patch, expected, codes } of cases) {
            const result = patchState(existing, patch);
            assert.strictEqual(
                withoutVolatile(result.after),
                withoutVolatile(expected.join('\n')),
                `${name}: position and blank-line separation must be exactly the template's`,
            );
            assert.deepStrictEqual(result.codes, codes, `${name}: every creation must be recorded`);
        }
    });

    test('--handoff on a file without Session Continuity creates the section and the field, and a quoted label is left alone (SC-2)', () => {
        // The pointer `pause.md` leaves for a later session. The second case is
        // §13's second manifestation in the field patterns: the unanchored
        // pattern took the label quoted in a decision for the field itself and
        // rewrote that entry from the label onward.
        const cases = [
            { name: 'no line and no section', entry: 'an existing entry' },
            {
                name: 'the label quoted mid-line in a decision',
                entry: 'set **Handoff File:** to none when the session ends',
            },
        ];

        for (const { name, entry } of cases) {
            const existing = [
                ...trimmedState,
                '## Recent Decisions',
                '',
                `- 2026-01-02 **Decision:** ${entry}`,
                '',
            ];
            const { after, codes } = patchState(existing, { handoff: '.design/docs/HANDOFF.json' });

            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(
                    [
                        ...existing,
                        '## Session Continuity',
                        '',
                        '**Handoff File:** .design/docs/HANDOFF.json',
                        '',
                    ].join('\n'),
                ),
                `${name}: the decision must survive whole and the pointer must land in a real section`,
            );
            assert.deepStrictEqual(codes, ['STATE_SECTION_CREATED', 'STATE_FIELD_CREATED'], name);
        }
    });

    test('Updated is refreshed where present and never created where absent (SC-2)', () => {
        // No caller requests `Updated`: updateState injects a fresh stamp into
        // every call, including one that patches nothing, so creating the line
        // would hand every hand-trimmed file a new line on its first call.
        const bare = [
            '# Project State',
            '',
            '**Phase:** 2 — Build',
            '',
            '## Current Position',
            '',
            '- **Task:** t',
            '',
        ];

        const untouched = patchState(bare, {});
        assert.strictEqual(
            untouched.after,
            bare.join('\n'),
            'a call that patches nothing must leave a stampless file byte-identical',
        );
        assert.deepStrictEqual(untouched.warnings, [], 'and must announce nothing');

        const patched = patchState(bare, { phase: '3 — Ship' });
        assert.doesNotMatch(
            patched.after,
            /Updated/,
            'a patched file without a stamp must still have none',
        );
        assert.match(
            patched.after,
            /^\*\*Phase:\*\* 3 — Ship$/m,
            'while the requested field is applied',
        );
        assert.deepStrictEqual(patched.codes, [], 'and nothing is recorded as created');
    });

    test('a field a call created is found by the next call, which announces nothing (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 2 — Build',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** t',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { status: 'Blocked' }, {});
            const warnings = warnedBy(() => updateState(wsDir, { status: 'Active' }, {}));
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.deepStrictEqual(
                after.match(/^\*\*Status:\*\*.*$/gm),
                ['**Status:** Active'],
                'one line, holding the latest value',
            );
            assert.deepStrictEqual(warnings, [], 'the second call has nothing to announce');
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_FIELD_CREATED'],
                'creation is recorded once, not per call',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a field created in a CRLF file brings no bare LF with it (SC-2)', () => {
        const { after } = patchState(
            [
                '# Project State',
                '',
                '**Phase:** 2 — Build',
                '',
                '## Current Position',
                '',
                '- **Task:** t',
                '',
            ],
            { status: 'Active' },
            {},
            { eol: '\r\n' },
        );

        assert.match(
            after,
            /\*\*Phase:\*\* 2 — Build\r\n\*\*Status:\*\* Active\r\n/,
            'the field must sit directly under its neighbour',
        );
        assert.doesNotMatch(after, /(?<!\r)\n/, 'every line break in the file must still be CRLF');
    });

    test('autoProgress creates a missing "## Progress" section holding the counters (SC-2)', () => {
        const existing = [
            '# Project State',
            '',
            '**Phase:** 1',
            '**Status:** Active',
            '',
            '## Current Position',
            '',
            '- **Next Action:** go',
            '',
        ];
        const { after, codes } = patchState(
            existing,
            {},
            { autoProgress: true },
            { files: { 'TASKS.md': '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n' } },
        );

        assert.strictEqual(
            after,
            [...existing, '## Progress', '', '```', 'Overall: [1/1] ████████ 100%', '```', ''].join(
                '\n',
            ),
            'the section must be created at the end of the file with the recomputed counter in its fence',
        );
        assert.deepStrictEqual(codes, ['STATE_SECTION_CREATED']);
    });

    test('a "## Progress" heading without a fence is left untouched, and the skip is announced (SC-2)', () => {
        // The engine cannot tell narrative from a counter block it never wrote,
        // so it must not overwrite this — but a silent skip is what §13.1 removes.
        const existing = [
            '# Project State',
            '',
            '**Phase:** 1',
            '**Status:** Active',
            '',
            '## Progress',
            '',
            'Just prose, no counters here.',
            '',
        ];
        const { after, warnings, codes } = patchState(
            existing,
            {},
            { autoProgress: true },
            { files: { 'TASKS.md': '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n' } },
        );

        assert.strictEqual(after, existing.join('\n'), 'the block must be left exactly as it was');
        assert.ok(
            warnings.some((w) => /Progress/.test(w)),
            'the skip must be announced on stderr',
        );
        assert.deepStrictEqual(codes, ['PROGRESS_BLOCK_UNRECOGNISED']);
    });

    // §13.2 — the line-cap guard located the section with a substring search,
    // required a heading to follow it, and removed the oldest entry by looking
    // its text up again in the file.
    test('the line-cap guard prunes the oldest decision when Recent Decisions is the last section (SC-1.2)', () => {
        // The Next Action line quotes the heading text before the real heading:
        // a substring search would have anchored on it.
        const lines = [
            '# Project State',
            '',
            '**Phase:** 2 — Build',
            '**Status:** Active',
            '',
            '## Current Position',
            '',
            '- **Next Action:** revisit ## Recent Decisions once the cap is hit',
            '',
            '## Blocking Constraints',
            '',
            ...Array.from(
                { length: 90 },
                (_, i) =>
                    `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
            ),
            '',
            '## Recent Decisions',
            '',
            '- 2026-01-05 **Decision:** entry 5',
            '- 2026-01-04 **Decision:** entry 4',
            '- 2026-01-03 **Decision:** entry 3',
            '- 2026-01-02 **Decision:** entry 2',
            '- 2026-01-01 **Decision:** entry 1',
        ];

        for (const { name, tail } of [
            { name: 'a trailing newline', tail: [''] },
            { name: 'no trailing newline', tail: [] },
        ]) {
            const { after, warnings, codes } = patchState([...lines, ...tail], {});

            assert.strictEqual(
                after.trimEnd(),
                lines.slice(0, -1).join('\n').trimEnd(),
                `${name}: exactly the oldest entry must go, everything else byte-for-byte`,
            );
            assert.ok(
                warnings.some((w) => /Pruned oldest decision/.test(w)),
                `${name}: the prune must be reported`,
            );
            assert.ok(
                !warnings.some((w) => /nothing was pruned/.test(w)),
                `${name}: and must not be reported as exhausted`,
            );
            assert.deepStrictEqual(codes, ['STATE_DECISION_PRUNED'], name);
        }
    });

    test('the line-cap guard prunes in a CRLF file by position, not by text (SC-1.2)', () => {
        // The text the guard used to search for is LF-joined, so it never matched
        // a CRLF file — yet `pruned` was set unconditionally and the prune was
        // reported. Decisions are not last here, so the boundary is not in play.
        const lines = [
            ...trimmedState,
            '## Recent Decisions',
            '',
            ...[5, 4, 3, 2, 1].map((n) => `- 2026-01-0${n} **Decision:** entry ${n}`),
            '',
            '## Blocking Constraints',
            '',
            ...Array.from(
                { length: 90 },
                (_, i) =>
                    `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
            ),
            '',
        ];
        const { after, warnings } = patchState(lines, {}, {}, { eol: '\r\n' });

        assert.doesNotMatch(after, /entry 1\b/, 'the oldest entry must actually be gone');
        assert.match(after, /entry 2\b/, 'the next-oldest must stay');
        assert.ok(
            warnings.some((w) => /Pruned oldest decision/.test(w)),
            'the prune must be reported',
        );
        assert.doesNotMatch(after, /(?<!\r)\n/, 'the removal must not introduce a bare LF');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7f. phase-archiver.js — CRLF frontmatter tolerance (Windows checkouts)
    // ───────────────────────────────────────────────────────────────────────────
    test('phase-archiver findArchiveCandidates parses CRLF frontmatter (git autocrlf)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // A genuinely complete phase, but with CRLF line endings as produced
            // by git autocrlf on a Windows checkout.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-16.md'),
                '---\r\nphase: 16\r\nname: "Windows"\r\nstatus: Done\r\n---\r\n\r\n' +
                    '## Atomic Checklist\r\n\r\n- [x] [T-16A01] Done\r\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir);
            assert.deepStrictEqual(
                candidates.map((c) => c.file),
                ['phase-16.md'],
                'CRLF line endings must not hide a Done phase from archival',
            );
            assert.strictEqual(
                candidates[0].phase,
                '16',
                'frontmatter values must be parsed without trailing \\r',
            );
            assert.strictEqual(
                candidates[0].name,
                'Windows',
                'quoted values must be unwrapped under CRLF',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 8. executor.js — input validation
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js should reject path-traversal in script and workspace names', () => {
        const tempDir = createTempWorkspace();
        try {
            const executorPath = path.join(tempDir, '.magic', 'scripts', 'executor.js');

            // Path traversal in script name
            assert.throws(
                () =>
                    execSync(`node "${executorPath}" "../../../etc/passwd"`, {
                        cwd: tempDir,
                        stdio: 'pipe',
                    }),
                /Invalid script name/,
                'Should reject script name with path separators',
            );

            // Path traversal in workspace name
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, '.design', 'workspace.json'),
                JSON.stringify({ default: 'main', workspaces: { main: {} } }),
            );
            assert.throws(
                () =>
                    execSync(`node "${executorPath}" init --workspace=../../../etc`, {
                        cwd: tempDir,
                        stdio: 'pipe',
                    }),
                /Invalid workspace name/,
                'Should reject workspace name with path separators',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 9. install-hooks.js
    // ───────────────────────────────────────────────────────────────────────────
    test('install-hooks.js should install functional hooks', () => {
        const tempDir = createTempWorkspace();
        try {
            const gitHooksDir = path.join(tempDir, '.git', 'hooks');
            fs.mkdirSync(gitHooksDir, { recursive: true });

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'install-hooks.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const hookPath = path.join(gitHooksDir, 'pre-commit');
            assert.ok(fs.existsSync(hookPath), 'pre-commit hook should be created');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            assert.ok(
                hookContent.includes('executor.js update-engine-meta --check'),
                'Hook should call update-engine-meta --check',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 10. detect-communities.js — gitignore-aware scan (Invariant 7 parity)
    // ───────────────────────────────────────────────────────────────────────────
    test('detect-communities.js excludes .gitignored directories from the scan (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            // Real design content (must always be scanned).
            const designDir = path.join(tempDir, '.design');
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

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'detect-communities.js');
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

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'extract-rationale.js');
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
            const { loadGitignore } = require(path.join(tempDir, '.magic', 'scripts', 'utils.js'));

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

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
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
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'buildout'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'buildout', 'artifact.bin'), 'x');
            fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=1\n');
            fs.writeFileSync(path.join(tempDir, '.env.example'), 'SECRET=\n');
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'buildout/\n.env*\n!.env.example\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'generate-context.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            const context = fs.readFileSync(path.join(tempDir, '.design', 'CONTEXT.md'), 'utf8');

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
            const { BUILD_NOISE_DIRS } = require(
                path.join(tempDir, '.magic', 'scripts', 'utils.js'),
            );

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
                ['.magic', 'scripts', 'detect-communities.js'],
                ['.magic', 'scripts', 'extract-rationale.js'],
                ['.magic', 'scripts', 'analyze-coverage.js'],
                ['.magic', 'scripts', 'generate-context.js'],
                ['dev', 'scripts', 'benchmark.js'],
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
                '.design/specifications/l1-core.md',
                '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n',
            );
            mk('src/main.rs', '// NOTE: genuine design rationale\nfn main() {}\n');
            // SDD-layer source: markers here are never user "shadow logic".
            mk('.design/tooling.js', '// NOTE: sdd helper, not product code\nvar s = 1;\n');
            // Directories below were skipped by SOME scanners before unification:
            // `build` was missing from analyze-coverage's list, `temp` from
            // extract-rationale's. No .gitignore here — only the floor acts.
            mk('build/artifact.js', '// NOTE: generated artifact\nvar a = 1;\n');
            mk('temp/scratch.js', '// NOTE: scratch file\nvar t = 1;\n');

            // analyze-coverage — `build/` no longer reaches classification.
            const coverage = JSON.parse(
                execSync(
                    `node "${path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js')}" --json`,
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
                    `node "${path.join(tempDir, '.magic', 'scripts', 'extract-rationale.js')}" --json`,
                    { cwd: tempDir, encoding: 'utf8' },
                ),
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('temp/')),
                'extract-rationale must skip temp/ via the shared floor',
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('.magic/')),
                'domain exclude: engine internals are not user shadow logic',
            );
            assert.ok(
                !rationale.rationale.some((r) => r.file.startsWith('.design/')),
                'domain exclude: the SDD layer is not user shadow logic',
            );
            assert.ok(
                rationale.rationale.some((r) => r.file === 'src/main.rs'),
                'genuine rationale must survive',
            );

            // detect-communities — same floor, OPPOSITE domain: .design/ stays in
            // the graph (it is the subject), while floor dirs never become nodes.
            mk('.design/real-a.md', '# Real A\n[Real B](./real-b.md)\n');
            mk('.design/real-b.md', '# Real B\n');
            const runGraph = () =>
                JSON.parse(
                    execSync(
                        `node "${path.join(tempDir, '.magic', 'scripts', 'detect-communities.js')}" --include-md --json`,
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
                JSON.stringify(after.communities).includes('.design/real-a.md'),
                'the .design/ subject must remain in the community graph',
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
            const { parseFlags } = require(path.join(tempDir, '.magic', 'scripts', 'utils.js'));
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
    //      .design/main/CONTEXT.md while `--workspace=docs` wrote the target.
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js routes --workspace <name> identically to --workspace=<name>', () => {
        const tempDir = createTempWorkspace();
        try {
            for (const ws of ['main', 'docs']) {
                fs.mkdirSync(path.join(tempDir, '.design', ws), { recursive: true });
            }
            fs.writeFileSync(
                path.join(tempDir, '.design', 'workspace.json'),
                JSON.stringify({ default: 'main', workspaces: { main: {}, docs: {} } }),
            );

            const executorPath = path.join(tempDir, '.magic', 'scripts', 'executor.js');
            const contextOf = (ws) => path.join(tempDir, '.design', ws, 'CONTEXT.md');
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
    //      that fell through to `.design/`, writing STATE.md into the global
    //      registry root instead of a workspace.
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js honors both flag forms and never writes STATE.md to the registry root', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const wsDir = makeWorkspace(tempDir, 'docs');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'update-state.js');
            const rootState = path.join(tempDir, '.design', 'STATE.md');
            const wsState = path.join(wsDir, 'STATE.md');

            // (a) Space form targets the requested directory.
            execSync(`node "${scriptPath}" --workspace .design/docs --status=Active`, {
                cwd: tempDir,
                stdio: 'pipe',
            });
            assert.ok(fs.existsSync(wsState), 'space form must write into the workspace');
            assert.ok(
                !fs.existsSync(rootState),
                'space form must not write into the registry root',
            );

            // (b) A bare --workspace must HALT rather than degrade to `.design/`.
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
            execSync(`node "${scriptPath}" --workspace=.design/docs --status=Active`, {
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
        const magicRoot = path.resolve(__dirname, '..', '..', '.magic');
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
        const repoRoot = path.resolve(__dirname, '..', '..');

        // The containment scan has no code — it is a cognitive grep whose match
        // classes are stated in prose, so the prose IS the implementation. Every
        // surface that states them must state the notation-independent form:
        // pinning the bracketed checklist literal `[T-XXXX]` or the `phase-{n}`
        // file form matches only the SDD layer's internal spellings, while a
        // reference leaks precisely by being quoted out of them (bare, in prose,
        // in a test name). That narrowing let 121 leaks accumulate unreported.
        const surfaces = [
            'rules/magic.md',
            '.magic/analyze.md',
            '.magic/roles/coder.md',
            '.magic/roles/code-reviewer.md',
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
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'src', 'a.js'), 'var a = 1;\n');
            fs.mkdirSync(path.join(tempDir, 'other'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'other', 'b.js'), 'var b = 1;\n');
            fs.mkdirSync(path.join(tempDir, 'dist'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'dist', 'bundle.js'), 'var d = 1;\n');
            // A user project may legitimately gitignore its design dir — the
            // map must still anchor on it.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.design/\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'generate-context.js');
            const read = () => fs.readFileSync(path.join(tempDir, '.design', 'CONTEXT.md'), 'utf8');

            // (a) No scope: gitignored .design stays visible; dist/ (floor) is hidden.
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            let context = read();
            assert.ok(
                context.includes('.design/'),
                'gitignored design root must remain visible (landmark)',
            );
            assert.ok(context.includes('.magic/'), 'engine root must remain visible (landmark)');
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
            assert.ok(context.includes('.design/'), 'design root must survive the scope filter');
            assert.ok(context.includes('.magic/'), 'engine root must survive the scope filter');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16a. lib/diagnostics.js — collector contract (DG-1..DG-9)
    // ───────────────────────────────────────────────────────────────────────────

    // Plan-complete TASKS.md, committed — the skip-path baseline every
    // diagnostics-digest test below starts from before layering its own change.
    const commitPlanCompleteFixture = (tempDir, wsDir) => {
        fs.writeFileSync(
            path.join(wsDir, 'TASKS.md'),
            '## Active Phases\n\n*None — plan complete.*\n',
        );
        commitFixture(tempDir);
    };

    // Bootstraps a finalize fixture already committed at plan-complete, plus a
    // fresh diagnostics.js handle — the pairing every DG-4.1/DG-5 test below
    // starts from.
    const requireFinalizeDiagnostics = (tempDir) => {
        const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
        commitPlanCompleteFixture(tempDir, wsDir);
        return {
            wsDir,
            finalizePath,
            diagnostics: require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js')),
        };
    };

    test('diagnostics.js record/read/drain round-trip in append order, exactly once (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'a missing sink reads as empty, not an error',
            );

            const findings = [
                { severity: 'error', source: 'a', code: 'A1', message: 'first' },
                { severity: 'warning', source: 'b', code: 'B1', message: 'second' },
                { severity: 'fix', source: 'c', code: 'C1', message: 'third' },
            ];
            for (const f of findings) {
                assert.strictEqual(
                    diagnostics.record(f),
                    true,
                    `record() should succeed for ${f.code}`,
                );
            }

            const drained = diagnostics.drain();
            assert.strictEqual(drained.length, 3, 'all three findings should drain');
            assert.deepStrictEqual(
                drained.map((f) => f.code),
                ['A1', 'B1', 'C1'],
                'findings must drain in append order',
            );

            assert.deepStrictEqual(
                diagnostics.drain(),
                [],
                'a second drain must return nothing — exactly-once delivery',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.record() never throws, even when the sink cannot be written (DG-9)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            // Occupy .design/.cache with a file so the sink's parent path
            // cannot resolve to a directory — the write itself must fail.
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.design', '.cache'), 'not a directory');

            let result;
            assert.doesNotThrow(() => {
                result = diagnostics.record({
                    severity: 'warning',
                    source: 'test',
                    code: 'X',
                    message: 'm',
                });
            }, 'record() must never throw, regardless of why the write failed');
            assert.strictEqual(
                result,
                false,
                'a failed write must report false, not silently succeed',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.read() drains every parseable line even when one is truncated (DG-9 corollary)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );
            diagnostics.record({
                severity: 'warning',
                source: 'a',
                code: 'BEFORE',
                message: 'first',
            });

            const sinkPath = path.join(tempDir, '.design', '.cache', 'diagnostics.jsonl');
            fs.appendFileSync(sinkPath, '{"severity":"error","source":"b","code":"TRUNC","mess\n');

            diagnostics.record({ severity: 'fix', source: 'c', code: 'AFTER', message: 'third' });

            const findings = diagnostics.drain();
            const codes = findings.map((f) => f.code);
            assert.ok(
                codes.includes('BEFORE'),
                'a finding recorded before the corrupt line must survive',
            );
            assert.ok(
                codes.includes('AFTER'),
                'a finding recorded after the corrupt line must survive — the tail is not lost',
            );
            assert.ok(
                !codes.includes('TRUNC'),
                'the corrupt line itself must not appear as a finding',
            );
            assert.strictEqual(
                findings.length,
                2,
                'exactly the two valid lines should drain, no more, no fewer',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.formatDigest dedups with an occurrence count and caps with an omission line (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            assert.deepStrictEqual(
                diagnostics.formatDigest([]),
                [],
                'empty input must render nothing — not a heading with no body',
            );

            // 12 identical (severity, source, code) findings collapse to one entry.
            const repeated = Array.from({ length: 12 }, () => ({
                severity: 'warning',
                source: 'update-state',
                code: 'STATE_CAP_EXHAUSTED',
                message: 'cap exhausted',
            }));
            const repeatedDigest = diagnostics.formatDigest(repeated).join('\n');
            assert.match(
                repeatedDigest,
                /STATE_CAP_EXHAUSTED.*\(×12\)/,
                'twelve identical findings must collapse to one line with a ×12 count',
            );
            assert.strictEqual(
                (repeatedDigest.match(/STATE_CAP_EXHAUSTED/g) || []).length,
                1,
                'the code must appear exactly once, not twelve times',
            );

            // 20 distinct findings: 15 rendered, 5 reported as omitted.
            const distinct = Array.from({ length: 20 }, (_, i) => ({
                severity: 'warning',
                source: 'test',
                code: `CODE_${i}`,
                message: `finding ${i}`,
            }));
            const distinctLines = diagnostics.formatDigest(distinct);
            const bulletCount = distinctLines.filter(
                (l) => l.startsWith('- ') && !l.includes('more finding'),
            ).length;
            assert.strictEqual(bulletCount, 15, 'the render cap must stop at 15 distinct findings');
            assert.match(
                distinctLines.join('\n'),
                /\+5 more findings not listed/,
                'the omission must state how many were left out',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics dedup keeps findings apart whose source and code differ only at the field boundary (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            // ("a" + "BC") and ("aB" + "C") concatenate to the same text, so only a
            // real separator between the key's fields keeps them two findings. The
            // separator is U+0000 and has to survive being written as the `\0`
            // escape rather than as a raw byte — dropping it would merge these.
            const findings = [
                { severity: 'warning', source: 'a', code: 'BC', message: 'first finding' },
                { severity: 'warning', source: 'aB', code: 'C', message: 'second finding' },
            ];

            assert.strictEqual(
                diagnostics.summarize(findings).total,
                2,
                'distinct findings must not collapse into one',
            );
            const digest = diagnostics.formatDigest(findings).join('\n');
            assert.match(digest, /first finding/, 'the first finding must render');
            assert.match(digest, /second finding/, 'the second finding must render');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16a-2. lib/diagnostics.js — revalidation before render (DG-10)
    // ───────────────────────────────────────────────────────────────────────────

    // Writes a controllable recheck target into a temp workspace's
    // .magic/scripts/: echoes { warnings: JSON.parse(FIXTURE_WARNINGS) } and
    // increments a counter file on every invocation, so tests can assert both
    // what a recheck reports and how many times it actually ran (§4.10 step 2,
    // signature collapse).
    const writeRevalidateFixture = (tempDir) => {
        const src = [
            '#!/usr/bin/env node',
            "'use strict';",
            "const fs = require('fs');",
            "const path = require('path');",
            "const counterPath = path.join(__dirname, '..', '..', '.design', '.cache', 'revalidate-fixture-count.txt');",
            'try {',
            '    fs.mkdirSync(path.dirname(counterPath), { recursive: true });',
            '    const n = fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, "utf8"), 10) : 0;',
            '    fs.writeFileSync(counterPath, String(n + 1));',
            '} catch (e) { /* best-effort counter, never block the fixture output */ }',
            "console.log(JSON.stringify({ warnings: JSON.parse(process.env.FIXTURE_WARNINGS || '[]') }));",
            '',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, '.magic', 'scripts', 'revalidate-fixture.js'), src);
    };

    const revalidateFixtureCount = (tempDir) => {
        const counterPath = path.join(tempDir, '.design', '.cache', 'revalidate-fixture-count.txt');
        return fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, 'utf8'), 10) : 0;
    };

    const testRevalidate = (findings, checkFn) => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );
            const survivors = diagnostics.revalidate(findings);
            checkFn(survivors, tempDir);
        } finally {
            cleanup(tempDir);
        }
    };

    test('revalidate() drops a finding whose recheck no longer reproduces the code (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'GONE',
                    message: 'was true at record time',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { FIXTURE_WARNINGS: '[]' },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    0,
                    'a finding whose recheck reports no matching code must be dropped',
                );
            },
        );
    });

    test('revalidate() keeps a finding whose recheck still reproduces the code (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'STILL_OPEN',
                    message: 'condition persists',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { FIXTURE_WARNINGS: JSON.stringify([{ type: 'STILL_OPEN' }]) },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    1,
                    'a finding whose recheck still reports its code must survive unchanged',
                );
                assert.strictEqual(survivors[0].code, 'STILL_OPEN');
            },
        );
    });

    test('revalidate() spawns one recheck process per distinct signature, not one per finding (DG-10)', () => {
        const sharedRecheck = {
            script: 'revalidate-fixture',
            args: ['shared'],
            env: { FIXTURE_WARNINGS: JSON.stringify([{ type: 'A' }, { type: 'B' }]) },
        };
        testRevalidate(
            [
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'A',
                    message: 'm',
                    recheck: sharedRecheck,
                },
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'B',
                    message: 'm',
                    recheck: sharedRecheck,
                },
            ],
            (survivors, tempDir) => {
                assert.strictEqual(
                    revalidateFixtureCount(tempDir),
                    1,
                    'two findings sharing one recheck signature must spawn exactly one process',
                );
                assert.deepStrictEqual(
                    survivors.map((f) => f.code).sort(),
                    ['A', 'B'],
                    'both findings survive — the shared recheck reproduced both codes',
                );
            },
        );
    });

    test('revalidate() leaves a finding untouched when its recheck cannot be run (DG-10 extends DG-9)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            const survivors = diagnostics.revalidate([
                {
                    severity: 'error',
                    source: 'test',
                    code: 'UNCHECKABLE',
                    message: 'recheck target does not exist',
                    recheck: { script: 'does-not-exist-xyz', args: [], env: {} },
                },
            ]);

            assert.strictEqual(
                survivors.length,
                1,
                'a recheck that cannot be spawned must fail open — the finding renders as recorded, not dropped',
            );
            assert.strictEqual(survivors[0].code, 'UNCHECKABLE');
        } finally {
            cleanup(tempDir);
        }
    });

    test('revalidate() passes a finding with no recheck field through unchanged (DG-10)', () => {
        testRevalidate(
            [
                {
                    severity: 'fix',
                    source: 'finalize',
                    code: 'NEXT_ACTION_SUBSTITUTED',
                    message: 'an event, not a condition',
                },
                {
                    severity: 'warning',
                    source: 'test',
                    code: 'GONE',
                    message: 'm',
                    recheck: {
                        script: 'revalidate-fixture',
                        args: [],
                        env: { FIXTURE_WARNINGS: '[]' },
                    },
                },
            ],
            (survivors) => {
                assert.strictEqual(
                    survivors.length,
                    1,
                    'the event finding survives; the resolved condition finding does not — partition is per-finding, not per-batch',
                );
                assert.strictEqual(survivors[0].code, 'NEXT_ACTION_SUBSTITUTED');
            },
        );
    });

    test('record() suppresses writes under MAGIC_DIAGNOSTICS_SUPPRESS, and a live recheck spawn cannot feed its own finding back into the sink (DG-10 self-reference guard)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );
            const sinkPath = path.join(tempDir, '.design', '.cache', 'diagnostics.jsonl');

            process.env.MAGIC_DIAGNOSTICS_SUPPRESS = '1';
            const suppressed = diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'SHOULD_NOT_APPEAR',
                message: 'm',
            });
            delete process.env.MAGIC_DIAGNOSTICS_SUPPRESS;
            assert.strictEqual(suppressed, false, 'a suppressed record() must report false');
            assert.ok(!fs.existsSync(sinkPath), 'a suppressed record() must not create the sink');

            // Live integration through the real emitter (copied by
            // createTempWorkspace, including this session's own
            // recheck-attachment change) — a missing .magic/.checksums
            // reliably yields one ENGINE_INTEGRITY finding with a recheck.
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), '# Registry\n');
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Rules\n');
            const cpPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            execSync(`node "${cpPath}" --json`, { cwd: tempDir, stdio: 'pipe' });

            const recorded = diagnostics.read();
            assert.ok(
                recorded.some((f) => f.code === 'ENGINE_INTEGRITY'),
                'sanity: the real emitter must have recorded its own finding first',
            );
            assert.ok(
                recorded.every((f) => f.recheck && f.recheck.script === 'check-prerequisites'),
                'every check-prerequisites finding must carry a recheck reference',
            );

            const survivors = diagnostics.revalidate(diagnostics.drain());
            assert.ok(
                survivors.some((f) => f.code === 'ENGINE_INTEGRITY'),
                'the condition is still real (.checksums is still missing) — it must survive its own revalidation',
            );
            assert.ok(
                !fs.existsSync(sinkPath),
                "the recheck's own warn()/record() calls must not have written a new finding back into the sink",
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js --dry-run reads the diagnostics sink without draining it (DG-4.1)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { finalizePath, diagnostics } = requireFinalizeDiagnostics(tempDir);
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'DRY_RUN_PROBE',
                message: 'should survive a preview',
            });

            const dryOut = execSync(
                `node "${finalizePath}" --workflow=task --workspace=main --dry-run`,
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.match(
                dryOut,
                /DRY_RUN_PROBE/,
                'a --dry-run invocation must still render the digest',
            );
            assert.deepStrictEqual(
                diagnostics.read().map((f) => f.code),
                ['DRY_RUN_PROBE'],
                'the finding must still be sitting in the sink after a preview — the preview must not have drained it',
            );

            // A second, real run reports the same finding and this time consumes it.
            const realOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(
                realOut,
                /DRY_RUN_PROBE/,
                'the real run must still report the finding the preview left untouched',
            );
            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'the real run must have drained the sink',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 16b. finalize.js — diagnostics terminal block (DG-5/DG-6/DG-7/DG-8)
    // ───────────────────────────────────────────────────────────────────────────
    test('finalize.js terminal block orders the digest before the next step on both exit paths (DG-5)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath, diagnostics } = requireFinalizeDiagnostics(tempDir);
            const assertOrder = (out, label) => {
                const digestIdx = out.indexOf('### Engine diagnostics');
                const nextIdx = out.indexOf('### Next step');
                assert.ok(digestIdx !== -1, `${label}: digest heading must be present`);
                assert.ok(nextIdx !== -1, `${label}: next-step heading must be present`);
                assert.ok(digestIdx < nextIdx, `${label}: digest must render before the next step`);
                const afterNextStep = out.slice(nextIdx + '### Next step'.length);
                assert.doesNotMatch(
                    afterNextStep,
                    /\n### /,
                    `${label}: nothing may follow the next step section`,
                );
            };

            // Skip path: no whitelisted change, but a recorded finding exists.
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'ORDER_SKIP',
                message: 'skip path probe',
            });
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assertOrder(skipOut, 'skip path');

            // Significant path: a whitelisted change plus a recorded finding.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            diagnostics.record({
                severity: 'warning',
                source: 'test',
                code: 'ORDER_SUCCESS',
                message: 'success path probe',
            });
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assertOrder(successOut, 'significant path');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js prints the exact Next Action string persisted to STATE.md, never a second computation (DG-6)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '# Master Task Index',
                    '',
                    '## Active Phases',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                ].join('\n'),
            );
            commitFixture(tempDir);

            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
            const persisted = state.match(/- \*\*Next Action:\*\* (.+)/)[1].trim();

            const nextIdx = out.indexOf('### Next step');
            const printed = out
                .slice(nextIdx + '### Next step'.length)
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)[0];

            assert.strictEqual(
                printed,
                persisted,
                'the printed next step must be byte-identical to what was written to STATE.md',
            );
            assert.match(
                printed,
                /T-1A01/,
                'sanity: the computed action should reference the open task',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js omits the diagnostics digest and summary row when nothing was recorded (DG-7)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n*None — plan complete.*\n',
            );
            commitFixture(tempDir);

            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );
            assert.deepStrictEqual(
                diagnostics.read(),
                [],
                'sanity: the sink must start empty for this assertion to mean anything',
            );

            // Skip path: nothing whitelisted changed, sink is empty.
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.doesNotMatch(
                skipOut,
                /### Engine diagnostics/,
                'skip path: no digest heading when nothing was recorded',
            );
            assert.match(skipOut, /### Next step/, 'skip path: the next step must still print');

            // Significant path: a whitelisted change, still an empty sink —
            // the summary table gains rows for other fields but must not
            // gain one for diagnostics.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.doesNotMatch(
                successOut,
                /### Engine diagnostics/,
                'significant path: no digest heading when nothing was recorded',
            );
            assert.doesNotMatch(
                successOut,
                /\| Diagnostics \|/,
                'significant path: no summary-table row when nothing was recorded',
            );
            assert.match(
                successOut,
                /### Next step/,
                'significant path: the next step must still print',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('record-diagnostic always exits 0, whether the finding is valid or malformed (DG-8)', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'record-diagnostic.js');
            const diagnostics = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'),
            );

            // Valid finding.
            const validOut = execSync(
                `node "${scriptPath}" --severity=warning --code=CLI_PROBE --message="from the agent channel"`,
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.match(
                validOut,
                /Recorded warning CLI_PROBE/,
                'a valid finding should confirm what was recorded',
            );

            // Invalid severity — must not throw or exit non-zero.
            assert.doesNotThrow(() => {
                execSync(
                    `node "${scriptPath}" --severity=bogus --code=BAD --message="should be dropped"`,
                    { cwd: tempDir, encoding: 'utf8' },
                );
            }, 'an invalid severity must not produce a non-zero exit');

            const drained = diagnostics.drain();
            assert.deepStrictEqual(
                drained.map((f) => f.code),
                ['CLI_PROBE'],
                'only the valid finding should have reached the sink',
            );
            assert.strictEqual(
                drained[0].source,
                'agent',
                '--source defaults to "agent" when omitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 17. release-changelog.js — explicit opt-in CHANGELOG rotation (R11)
    // ───────────────────────────────────────────────────────────────────────────
    test('release-changelog.js rotates [Unreleased] into a dated version heading, defaulting version/date (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            fs.writeFileSync(
                changelogPath,
                [
                    '# Changelog',
                    '',
                    'All notable changes to this project will be documented in this file.',
                    '',
                    '## [Unreleased]',
                    '',
                    '### Added',
                    '',
                    '- Something new.',
                    '',
                ].join('\n'),
            );
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'release-changelog.js');

            const out = execSync(`node "${scriptPath}" --version=9.9.9 --date=2026-01-01`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(
                out,
                /Rotated \[Unreleased\] → \[9\.9\.9\] - 2026-01-01/,
                'confirms the rotation it performed',
            );
            const rotated = fs.readFileSync(changelogPath, 'utf8');
            assert.match(
                rotated,
                /## \[Unreleased\]\s*\n\s*## \[9\.9\.9\] - 2026-01-01/,
                'Unreleased renamed, fresh Unreleased opened above it',
            );
            assert.match(
                rotated,
                /### Added\s*\n\s*- Something new\./,
                'prior bullets survive under the newly-dated heading',
            );

            // Defaults: --version from .design/.version, --date = today (UTC).
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.design', '.version'), '4.5.6\n');
            const out2 = execSync(`node "${scriptPath}"`, { cwd: tempDir, encoding: 'utf8' });
            const today = new Date().toISOString().slice(0, 10);
            assert.match(
                out2,
                new RegExp(`Rotated \\[Unreleased\\] → \\[4\\.5\\.6\\] - ${today}`),
                'falls back to .design/.version and today when flags are omitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotation restores per-window bullet distinguishability (R11 §4.1/§4.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = require(
                path.join(tempDir, '.magic', 'scripts', 'lib', 'changelog-writer.js'),
            );
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');

            const bullet = 'Updated task plan and task index (engine)';
            const r1 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(r1.written, true, 'first cycle writes the bullet');

            // Same bullet, no rotation yet — the closed-vocabulary suppression §4.1 documents.
            const r2 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(
                r2.deduped,
                true,
                'identical bullet within the same window is correctly deduped',
            );

            const rot = releaseUnreleased(changelogPath, '1.0.0', '2026-02-01');
            assert.strictEqual(rot.written, true, 'rotation must actually write');

            // Same bullet, new window — must be writable again, not permanently suppressed.
            const r3 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(
                r3.written,
                true,
                'the same real-work bullet must be writable again after rotation',
            );

            const escaped = bullet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const occurrences = (
                fs.readFileSync(changelogPath, 'utf8').match(new RegExp(escaped, 'g')) || []
            ).length;
            assert.strictEqual(
                occurrences,
                2,
                'the bullet must appear once in the released section and once in the fresh Unreleased',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js no longer references releaseUnreleased — rotation is opt-in only (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const src = fs.readFileSync(
                path.join(tempDir, '.magic', 'scripts', 'finalize.js'),
                'utf8',
            );
            assert.doesNotMatch(
                src,
                /releaseUnreleased/,
                'finalize.js must not import or call releaseUnreleased',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test("finalize.js's deduped CHANGELOG row names release-changelog as the remedy (§4.5)", () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
                autoChangelog: true,
            });
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '- [ ] [T-1A01] Task',
                    '',
                ].join('\n'),
            );
            commitFixture(tempDir);

            // First run: the bullet is genuinely new — must append normally,
            // no hint. Control case for the second assertion below.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '- [x] [T-1A01] Task',
                    '',
                ].join('\n'),
            );
            const firstOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            const firstRow = firstOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(
                firstRow,
                /appended to \[Unreleased\] § Changed/,
                'first run: bullet is new, must append normally',
            );
            assert.doesNotMatch(
                firstRow,
                /release-changelog/,
                'first run: no hint when nothing was deduped',
            );

            // Second run: same shape (one /tasks/ file changed) reproduces the
            // identical bullet ("Completed task (main)") — the exact §4.1
            // vocabulary-exhaustion scenario the field report reproduced.
            commitFixture(tempDir);
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: Done',
                    '---',
                    '',
                    '- [x] [T-1A01] Task',
                    '- [x] [T-1A02] Another',
                    '',
                ].join('\n'),
            );
            const secondOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            const secondRow = secondOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(
                secondRow,
                /skipped \(duplicate/,
                'second run: identical bullet shape must dedupe exactly as §4.1 documents',
            );
            assert.match(
                secondRow,
                /release-changelog/,
                'second run: the deduped row must name the remedy (§4.5)',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 18. analyze-coverage.js — EXEMPT classification (Coverage Denominator Scope)
    // ───────────────────────────────────────────────────────────────────────────
    test('analyze-coverage.js classifies .design/ bookkeeping and archived phase journals as EXEMPT', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
            mk('.design/PLAN.md', '# Plan\n');
            mk('.design/STATE.md', '# State\n');
            mk('.design/archives/tasks/phase-1.md', '# Phase 1\n');
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
            const out = JSON.parse(
                execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }),
            );
            const byFile = new Map(out.coverage.map((c) => [c.file, c]));

            assert.strictEqual(
                byFile.get('.design/PLAN.md').confidence,
                'EXEMPT',
                'PLAN.md must classify EXEMPT',
            );
            assert.strictEqual(
                byFile.get('.design/STATE.md').confidence,
                'EXEMPT',
                'STATE.md must classify EXEMPT',
            );
            assert.strictEqual(
                byFile.get('.design/archives/tasks/phase-1.md').confidence,
                'EXEMPT',
                'an archived phase journal must classify EXEMPT',
            );
            assert.notStrictEqual(
                byFile.get('.design/specifications/l1-core.md').confidence,
                'EXEMPT',
                'specifications/ itself must NOT be exempted — unaffected by this change',
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

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
            const scope = '--scope=src,orphan.js,.design';
            const before = JSON.parse(
                execSync(`node "${scriptPath}" --json ${scope}`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                }),
            );

            // Add EXEMPT-eligible bookkeeping files after the baseline read —
            // a wrongly-classified UNCOVERED would shift coverage_percent.
            mk('.design/PLAN.md', '# Plan\n');
            mk('.design/STATE.md', '# State\n');
            mk('.design/archives/tasks/phase-1.md', '# Phase 1\n');
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
    // 19. validate-hardlinks.js — table-driven pair coverage extended to
    //     workflows/ ↔ .agents/workflows/ (R25). The pre-fix validator
    //     hardcoded only two groups (AGENTS family, rules/), so a broken
    //     workflows/ pair passed vacuously — this fixture proves the new
    //     group actually detects the break rather than staying silent.
    // ───────────────────────────────────────────────────────────────────────────
    test('validate-hardlinks.js covers workflows/ ↔ .agents/workflows/ and detects a broken pair', () => {
        const tempDir = createTempWorkspace();
        try {
            // Anchor required or validateAgentsLinks() exits fatally before
            // any other group runs; siblings may be absent (soft warning only).
            fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# Agents\n');

            const workflowsDir = path.join(tempDir, 'workflows');
            const agentsWorkflowsDir = path.join(tempDir, '.agents', 'workflows');
            fs.mkdirSync(workflowsDir, { recursive: true });
            fs.mkdirSync(agentsWorkflowsDir, { recursive: true });

            const src = path.join(workflowsDir, 'magic.example.md');
            const link = path.join(agentsWorkflowsDir, 'magic.example.md');
            fs.writeFileSync(src, '# Example\n');
            fs.linkSync(src, link); // real hardlink, matching production layout

            const validatorScript = path.join(tempDir, 'dev', 'scripts', 'validate-hardlinks.js');
            const run = () => {
                try {
                    return {
                        failed: false,
                        output: execSync(`node "${validatorScript}"`, {
                            cwd: tempDir,
                            encoding: 'utf8',
                            stdio: 'pipe',
                        }),
                    };
                } catch (e) {
                    return { failed: true, output: `${e.stdout || ''}${e.stderr || ''}` };
                }
            };

            // Control — an intact pair must pass, and the workflows/ group
            // must actually run (guards against a vacuous "group skipped").
            const intact = run();
            assert.strictEqual(
                intact.failed,
                false,
                'an intact workflows/ pair must pass validation',
            );
            assert.match(
                intact.output,
                /Validating hardlinks for workflows/,
                'the workflows/ group must actually run, not be silently absent',
            );
            assert.match(intact.output, /all 1 file\(s\) linked/);

            // The reproduction: an inode-replacing edit (unlink + rewrite —
            // the same shape a write-replace editor produces; see [C-001])
            // delinks the pair. Under the pre-fix two-group validator this
            // would pass silently, since workflows/ was never scanned at all.
            fs.unlinkSync(src);
            fs.writeFileSync(src, '# Example (edited)\n');
            assert.notStrictEqual(
                fs.statSync(src).ino,
                fs.statSync(link).ino,
                'fixture precondition: the edit must actually delink the pair',
            );

            const broken = run();
            assert.strictEqual(
                broken.failed,
                true,
                'the fix: a broken workflows/ pair must fail validation',
            );
            assert.match(
                broken.output,
                /Drift.*magic\.example\.md/,
                'the specific drifted file must be named',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 17. rules/magic.md §1 — Fresh-Project Snapshot Ambiguity (structural)
    //     Engine Upgrade Detection is a cognitive procedure the agent follows
    //     by reading this file — no executor subcommand implements the
    //     compare/narrate logic — so coverage is structural/textual, the same
    //     precedent as T-29T01's .magic/analyze.md cognitive-instruction case.
    // ───────────────────────────────────────────────────────────────────────────
    test('rules/magic.md §1 distinguishes a fresh project from an unknown-field registry', () => {
        const repoRoot = path.resolve(__dirname, '..', '..');
        const content = fs.readFileSync(path.join(repoRoot, 'rules', 'magic.md'), 'utf8');

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
            /Missing `\.design\/INDEX\.md`[\s\S]*?treat as `fresh`/,
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

    // ───────────────────────────────────────────────────────────────────────────
    // 20. resume-state.js — the one shared resume predicate (SC-9), and the
    //     tracking-entry reader it shares with finalize.js (SC-8 parser safety).
    //     Every case runs the real script through executor.js, never a
    //     re-implementation of its predicate.
    // ───────────────────────────────────────────────────────────────────────────

    // A `### [T-…]` tracking entry the way a phase workbook writes it.
    const trackingEntry = (id, title, status, extra = []) =>
        [
            `### [${id}] ${title}`,
            '',
            `- **Status:** ${status}`,
            '- **Assignment:** Agent',
            ...extra,
            '',
        ].join('\n');

    const resumeStateText = (status, nextAction) =>
        [
            '# Project State',
            '',
            '**Workspace:** engine',
            '**Updated:** 2026-01-01 00:00',
            '**Phase:** 1 — Test',
            `**Status:** ${status}`,
            '',
            '## Current Position',
            '',
            '- **Task:** none',
            '- **Spec:** none',
            `- **Next Action:** ${nextAction}`,
            '',
            '## Session Continuity',
            '',
            '**Handoff File:** none',
            '**Bootstrap Mode:** false',
            '',
        ].join('\n');

    // Writes the tree resume-state.js reads: a registry plus, per workspace, a
    // STATE.md and (when given) one phase workbook of tracking entries.
    const writeResumeFixture = (
        tempDir,
        workspaces,
        { eol = '\n', defaultWorkspace = null } = {},
    ) => {
        const designDir = path.join(tempDir, '.design');
        const toEol = (text) => text.replace(/\n/g, eol);
        const registry = {};
        for (const [name, def] of Object.entries(workspaces)) {
            registry[name] = { description: name, scope: ['.design'] };
            const wsDir = path.join(designDir, name);
            fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                toEol(
                    resumeStateText(
                        def.status || 'Active',
                        def.nextAction || 'Execute T-1A01 Thing via /magic.run engine',
                    ),
                ),
            );
            if (def.entries) {
                fs.writeFileSync(
                    path.join(wsDir, 'tasks', 'phase-1.md'),
                    toEol(
                        [
                            '---',
                            'phase: 1',
                            'status: In Progress',
                            '---',
                            '',
                            '## Detailed Tracking',
                            '',
                            ...def.entries,
                        ].join('\n'),
                    ),
                );
            }
            if (def.staleHandoff)
                fs.writeFileSync(path.join(wsDir, 'HANDOFF.json'), '{"schema_version":"1.1"}');
        }
        fs.writeFileSync(
            path.join(designDir, 'workspace.json'),
            JSON.stringify({
                default: defaultWorkspace || Object.keys(workspaces)[0],
                workspaces: registry,
            }),
        );
        return designDir;
    };

    const runResumeState = (tempDir, args = []) =>
        spawnSync(
            process.execPath,
            [path.join(tempDir, '.magic', 'scripts', 'executor.js'), 'resume-state', ...args],
            { cwd: tempDir, encoding: 'utf8' },
        );

    // Path → digest of every file under `root` (`.git` excluded); a directory is
    // its own entry, so a directory turning up where a file was is visible.
    const treeDigest = (root) => {
        const crypto = require('crypto');
        const digest = {};
        const walk = (dir) => {
            for (const name of fs.readdirSync(dir).sort()) {
                if (name === '.git') continue;
                const full = path.join(dir, name);
                const rel = path.relative(root, full).split(path.sep).join('/');
                if (fs.statSync(full).isDirectory()) {
                    digest[`${rel}/`] = 'dir';
                    walk(full);
                } else {
                    digest[rel] = crypto
                        .createHash('sha256')
                        .update(fs.readFileSync(full))
                        .digest('hex');
                }
            }
        };
        walk(root);
        return digest;
    };

    test('resume-state stays silent when nothing is recorded in flight, even beside a stale handoff file (SC-9(b), H1)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: {
                    status: 'Active',
                    staleHandoff: true,
                    entries: [
                        trackingEntry('T-1A01', 'Finished', 'Done'),
                        trackingEntry('T-1A02', 'Later', 'Todo'),
                    ],
                },
            });
            assert.ok(
                fs.existsSync(path.join(tempDir, '.design', 'engine', 'HANDOFF.json')),
                'fixture precondition: the stale snapshot is on disk',
            );

            const quiet = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(quiet.status, 0);
            assert.strictEqual(
                quiet.stdout,
                '',
                `a leftover snapshot with nothing in flight must not trigger a resume — the file's presence is not a trigger → "${quiet.stdout}"`,
            );

            // Control: the same tree with `Status: Paused` does speak, so the
            // silence above is a decision and not a script that says nothing.
            fs.writeFileSync(
                path.join(tempDir, '.design', 'engine', 'STATE.md'),
                resumeStateText('Paused', 'Pick up T-1A02'),
            );
            const paused = runResumeState(tempDir, ['--workspace=engine']);
            assert.match(
                paused.stdout,
                /^▶ Resume \[engine\]: paused snapshot\. Next: Pick up T-1A02\n$/,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state names one in-flight task with its dead ends and the modified-file count, identically for LF and CRLF (SC-9(d), (e), H2, H4)', () => {
        const printed = {};
        for (const eol of ['\n', '\r\n']) {
            const tempDir = createTempWorkspace(true);
            try {
                // Both the title and the Next Action carry a code span: stripping
                // deletes those, so each must be read back from the raw line.
                writeResumeFixture(
                    tempDir,
                    {
                        engine: {
                            nextAction:
                                'Execute T-1A01 Extract `finalize.js` via /magic.run engine',
                            entries: [
                                trackingEntry('T-1A01', 'Extract `finalize.js`', 'In Progress', [
                                    '- **Attempts:**',
                                    '  - tried a global regex → it swallowed the next entry',
                                    '  - tried a line scan → it split on CRLF',
                                ]),
                                trackingEntry('T-1A02', 'Later', 'Todo'),
                            ],
                        },
                    },
                    { eol },
                );
                commitFixture(tempDir);

                // One tracked edit and one untracked file are product changes; the
                // workbook edit is bookkeeping the line already reports, so it must
                // not be counted.
                fs.appendFileSync(path.join(tempDir, 'README.md'), 'edit\n');
                fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, 'src', 'feature.js'), '// new\n');
                fs.appendFileSync(
                    path.join(tempDir, '.design', 'engine', 'tasks', 'phase-1.md'),
                    'edited\n',
                );

                const result = runResumeState(tempDir, ['--workspace=engine']);
                assert.strictEqual(result.status, 0);
                printed[eol] = result.stdout;
            } finally {
                cleanup(tempDir);
            }
        }

        assert.strictEqual(
            printed['\r\n'],
            printed['\n'],
            "the line must not depend on the workbook's line endings",
        );
        assert.strictEqual(
            printed['\n'],
            '▶ Resume [engine]: T-1A01 Extract `finalize.js` in flight — 2 dead end(s) recorded, 2 file(s) modified. ' +
                'Next: Execute T-1A01 Extract `finalize.js` via /magic.run engine\n',
            'one line: title and Next Action with their code spans intact, the recorded dead ends, and the two product files (not the workbook)',
        );
    });

    test('resume-state names every task in flight up to three, then counts the rest, and marks a paused snapshot that also has work in flight (SC-9(f), H3, H4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const inFlight = (id, title) => trackingEntry(id, title, 'In Progress');
            writeResumeFixture(tempDir, {
                engine: { entries: [inFlight('T-1A01', 'One'), inFlight('T-1B01', 'Two')] },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A01 One; T-1B01 Two in flight — 0 dead end\(s\) recorded\. Next: /,
                'two tasks in flight: both named',
            );

            writeResumeFixture(tempDir, {
                engine: {
                    entries: [
                        inFlight('T-1A01', 'One'),
                        inFlight('T-1B01', 'Two'),
                        inFlight('T-1C01', 'Three'),
                        inFlight('T-1D01', 'Four'),
                    ],
                },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A01 One; T-1B01 Two; T-1C01 Three \+1 more in flight — /,
                'four tasks in flight: three named, one counted',
            );

            writeResumeFixture(tempDir, {
                engine: { status: 'Paused', entries: [inFlight('T-1A01', 'One')] },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /T-1A01 One in flight \(paused snapshot\) — /,
                'a paused workspace that also has a task in flight says so',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state omits the file count outside a repository and before the first commit, without an error (SC-9(e), H5)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'In Progress')] },
            });

            const outside = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(outside.status, 0);
            assert.match(
                outside.stdout,
                /^▶ Resume \[engine\]: T-1A01 Only in flight — 0 dead end\(s\) recorded\. Next: /,
            );
            assert.doesNotMatch(
                outside.stdout,
                /modified/,
                'not a repository: there is nothing to count',
            );
            assert.strictEqual(
                outside.stderr,
                '',
                "git's own diagnostics must not leak into a script that is silent by default",
            );

            // A repository whose first commit has not happened yet: "changed since HEAD" has no meaning.
            execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
            const uncommitted = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(uncommitted.status, 0);
            assert.doesNotMatch(
                uncommitted.stdout,
                /modified/,
                'no commit yet: the count must be omitted, not guessed',
            );
            assert.strictEqual(
                uncommitted.stderr,
                '',
                'a repository with no commit must not print git\'s "fatal:" line',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state writes nothing on a clean run and records exactly one finding for an unreadable STATE.md (read-only, DG-1, H6)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'Done')] },
            });

            const before = treeDigest(tempDir);
            const clean = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(clean.status, 0);
            assert.strictEqual(clean.stdout, '');
            assert.deepStrictEqual(
                treeDigest(tempDir),
                before,
                'a clean run must leave every file byte-identical',
            );
            assert.ok(
                !fs.existsSync(path.join(tempDir, '.design', '.cache')),
                'a clean run must not even create the diagnostics directory',
            );

            // A STATE.md that exists but cannot be read is the script's one non-fatal condition.
            const statePath = path.join(tempDir, '.design', 'engine', 'STATE.md');
            fs.rmSync(statePath);
            fs.mkdirSync(statePath);
            const beforeFault = treeDigest(tempDir);

            const faulty = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(
                faulty.status,
                0,
                "a fault here must never become a halt in someone else's workflow",
            );
            assert.strictEqual(faulty.stdout, '');
            assert.match(
                faulty.stderr,
                /cannot be read/,
                'printed, and recorded (DG-1: the record is in addition to the print)',
            );

            const sinkPath = path.join(tempDir, '.design', '.cache', 'diagnostics.jsonl');
            const findings = fs
                .readFileSync(sinkPath, 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((line) => JSON.parse(line));
            assert.strictEqual(findings.length, 1, 'exactly one finding');
            assert.strictEqual(findings[0].code, 'RESUME_STATE_UNREADABLE');
            assert.strictEqual(findings[0].severity, 'warning');
            assert.strictEqual(findings[0].source, 'resume-state');

            const after = treeDigest(tempDir);
            delete after['.design/.cache/diagnostics.jsonl'];
            delete after['.design/.cache/'];
            assert.deepStrictEqual(
                after,
                beforeFault,
                'the finding is the only thing the run may have written',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state and computeNextAction read a tracking entry the same way: quoted labels and Attempts items change nothing (SC-8 parser safety, H7)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            writeResumeFixture(tempDir, { engine: {} });
            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            const workbook = (entries) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    ...entries,
                ].join('\n');

            const plain = [
                trackingEntry('T-1A01', 'First task', 'In Progress'),
                trackingEntry('T-1A02', 'Second task', 'Todo'),
            ];
            // The same tasks, with the labels a reader must never take for the
            // entry's own quoted twice over: as a fenced template at column 0
            // *ahead of* the real fields (a reader that skipped the SH-1 strip
            // would find these first), and inside an `Attempts` item.
            const quoting = [
                [
                    '### [T-1A01] First task',
                    '',
                    '```plaintext',
                    '- **Status:** Blocked',
                    '- **Assignment:** User',
                    '```',
                    '',
                    '- **Status:** In Progress',
                    '- **Assignment:** Agent',
                    '- **Attempts:**',
                    '  - tried `**Status:** Blocked` and **Assignment:** User → rejected',
                    '',
                ].join('\n'),
                trackingEntry('T-1A02', 'Second task', 'Todo'),
            ];

            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), workbook(plain));
            const nextPlain = finalize.computeNextAction('run', 'engine', wsDir);
            const linePlain = runResumeState(tempDir, ['--workspace=engine']).stdout;

            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), workbook(quoting));
            const nextQuoting = finalize.computeNextAction('run', 'engine', wsDir);
            const lineQuoting = runResumeState(tempDir, ['--workspace=engine']).stdout;

            assert.match(
                nextPlain,
                /^Execute T-1A01 /,
                'fixture precondition: the in-flight first task is the next action',
            );
            assert.strictEqual(
                nextQuoting,
                nextPlain,
                'quoted labels must not change which task the Next Action names',
            );
            assert.match(linePlain, /T-1A01 First task in flight — 0 dead end\(s\) recorded/);
            assert.match(
                lineQuoting,
                /T-1A01 First task in flight — 1 dead end\(s\) recorded/,
                'the entry is still read as In Progress, and its one Attempts item is counted',
            );
            assert.doesNotMatch(
                lineQuoting,
                /T-1A02/,
                'the Todo task must not be listed as in flight',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state scope: the workspace the executor resolved by default, one workspace on --workspace, every registered one only under --all (l2-session-checkpoint §5.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const inFlight = (title) => ({
                entries: [trackingEntry('T-1A01', title, 'In Progress')],
            });
            writeResumeFixture(
                tempDir,
                {
                    alpha: inFlight('Alpha task'),
                    beta: inFlight('Beta task'),
                    gamma: inFlight('Gamma task'),
                    delta: inFlight('Delta task'),
                    quiet: { entries: [trackingEntry('T-1A01', 'Quiet task', 'Done')] },
                },
                { defaultWorkspace: 'alpha' },
            );

            // executor.js consumes --workspace and substitutes the registry
            // default when it is absent, handing the result on only as
            // MAGIC_DESIGN_DIR — so "no flag" can mean "the default", never "all".
            const byDefault = runResumeState(tempDir).stdout.trim().split('\n');
            assert.strictEqual(byDefault.length, 1, 'no flag: exactly the default workspace');
            assert.match(byDefault[0], /^▶ Resume \[alpha\]: /);

            const beta = runResumeState(tempDir, ['--workspace=beta']).stdout.trim().split('\n');
            assert.strictEqual(beta.length, 1, '--workspace: exactly that workspace');
            assert.match(beta[0], /^▶ Resume \[beta\]: /);

            const all = runResumeState(tempDir, ['--all']).stdout.trim().split('\n');
            assert.strictEqual(all.length, 4, 'three workspace lines and one overflow line');
            assert.match(all[3], /^▶ Resume: \+1 more workspace\(s\) with work in flight$/);
            assert.doesNotMatch(
                all.join('\n'),
                /Quiet/,
                'a workspace with nothing in flight is not reported',
            );

            // Direct invocation (no executor): faults are silence, and an explicit
            // --workspace narrows --all.
            const direct = (args) =>
                spawnSync(
                    process.execPath,
                    [path.join(tempDir, '.magic', 'scripts', 'resume-state.js'), ...args],
                    { cwd: tempDir, encoding: 'utf8' },
                );
            for (const args of [['--workspace=nope'], ['--workspace']]) {
                const result = direct(args);
                assert.strictEqual(result.status, 0, `${args.join(' ')}: never a non-zero exit`);
                assert.strictEqual(result.stdout, '', `${args.join(' ')}: silence`);
            }
            assert.match(
                direct(['--all', '--workspace=gamma']).stdout,
                /^▶ Resume \[gamma\]: .*\n$/,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('resume-state --json returns the documented shape, and { in_flight: false } when nothing is in flight', () => {
        const tempDir = createTempWorkspace();
        try {
            writeResumeFixture(tempDir, {
                engine: {
                    entries: [
                        trackingEntry('T-1A01', 'Only', 'In Progress', [
                            '- **Attempts:**',
                            '  - tried X → failed',
                        ]),
                    ],
                },
            });
            const parsed = JSON.parse(
                runResumeState(tempDir, ['--workspace=engine', '--json']).stdout,
            );
            assert.strictEqual(parsed.in_flight, true);
            assert.strictEqual(parsed.workspaces.length, 1);
            const entry = parsed.workspaces[0];
            assert.deepStrictEqual(Object.keys(entry).sort(), [
                'changed_files',
                'next_action',
                'source',
                'tasks',
                'workspace',
            ]);
            assert.strictEqual(entry.source, 'in-progress');
            assert.deepStrictEqual(entry.tasks, [{ id: 'T-1A01', title: 'Only', attempts: 1 }]);
            assert.strictEqual(entry.changed_files, null, 'not a repository: null, not zero');
            assert.strictEqual(entry.next_action, 'Execute T-1A01 Thing via /magic.run engine');

            writeResumeFixture(tempDir, {
                engine: { entries: [trackingEntry('T-1A01', 'Only', 'Done')] },
            });
            assert.deepStrictEqual(
                JSON.parse(runResumeState(tempDir, ['--workspace=engine', '--json']).stdout),
                { in_flight: false, workspaces: [] },
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 21. Checkpoint contract — the state template's writer map (SC-1.3) and the
    //     finalize checkpoint claim (SC-6.1).
    // ───────────────────────────────────────────────────────────────────────────

    // Every field the state template declares, against the `updateState` patch
    // key that writes it. The table is the contract's statement of "no dead
    // field": a template field without a row has no writer and would go stale in
    // every consumer's STATE.md (the retired `Last Session Ended` did exactly
    // that), and a row without a template field is a writer for a line the file
    // no longer carries. `update-state.js` keeps its own field map private, so
    // the check is driven through behavior — patch each field, read the file back.
    const STATE_FIELD_WRITERS = {
        Workspace: 'workspace',
        Updated: 'updated',
        Phase: 'phase',
        Status: 'status',
        Task: 'task',
        Spec: 'spec',
        'Next Action': 'nextAction',
        'Handoff File': 'handoff',
        'Bootstrap Mode': 'bootstrap',
    };

    test('the STATE.md template declares only fields update-state writes, never a dead one such as Last Session Ended (SC-1.3, H8)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const template = fs.readFileSync(
                path.join(tempDir, '.magic', 'templates', 'state.md'),
                'utf8',
            );
            const declared = [...template.matchAll(/^(?:- )?\*\*([^*\n]+):\*\*/gm)].map(
                (match) => match[1],
            );

            assert.ok(
                !declared.includes('Last Session Ended'),
                'the retired field must not return: nothing ever wrote it after the first bootstrap',
            );
            assert.deepStrictEqual(
                [...declared].sort(),
                Object.keys(STATE_FIELD_WRITERS).sort(),
                'every template field needs a writer row here, and every row a template field',
            );

            // Each row's key must really write its own label's line.
            const { updateState, wsDir } = requireUpdateState(tempDir);
            const statePath = path.join(wsDir, 'STATE.md');
            warnedBy(() => updateState(wsDir, {}));
            for (const [label, key] of Object.entries(STATE_FIELD_WRITERS)) {
                if (key === 'updated') continue; // stamped by every call, never requested
                const value = `written-through-${key}`;
                warnedBy(() => updateState(wsDir, { [key]: value }));
                assert.match(
                    fs.readFileSync(statePath, 'utf8'),
                    new RegExp(`^(?:- )?\\*\\*${label}:\\*\\* ${value}$`, 'm'),
                    `patch key '${key}' must write the '${label}' line`,
                );
            }
            assert.match(
                fs.readFileSync(statePath, 'utf8'),
                /^\*\*Updated:\*\* \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/m,
                'Updated is stamped by every call, so the template placeholder must be gone',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // One finalize run against a fresh git-backed fixture. `change` leaves an
    // uncommitted edit to a whitelisted file (the significant path), otherwise
    // nothing changed since the baseline (the skip path). `stateBlocked` puts a
    // directory where STATE.md belongs, so the update cannot be written — under
    // `--workflow=task`, whose significance scan does not read STATE.md; the
    // `run` whitelist does, and would stop the whole run before any update.
    const runFinalizeCheckpoint = ({ change, dryRun = false, stateBlocked = false }) => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            commitFixture(tempDir);
            if (change) {
                fs.writeFileSync(
                    path.join(wsDir, 'TASKS.md'),
                    '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] More\n',
                );
            }
            const statePath = path.join(wsDir, 'STATE.md');
            if (stateBlocked) fs.mkdirSync(statePath);

            const result = spawnSync(
                process.execPath,
                [
                    finalizePath,
                    '--workflow=task',
                    '--workspace=main',
                    ...(dryRun ? ['--dry-run'] : []),
                ],
                { cwd: tempDir, encoding: 'utf8' },
            );
            return {
                result,
                stateWritten: fs.existsSync(statePath) && fs.statSync(statePath).isFile(),
            };
        } finally {
            cleanup(tempDir);
        }
    };

    test('finalize.js claims a saved checkpoint only once STATE.md was really updated, on both exit paths (SC-6.1, H9)', () => {
        const claim = /checkpoint saved/;
        const path_ = (change) => (change ? 'significant' : 'skip');

        // The claim rides the STATE.md row on the significant path...
        const significant = runFinalizeCheckpoint({ change: true });
        assert.strictEqual(significant.result.status, 0);
        assert.match(
            significant.result.stdout,
            /^\| STATE\.md \|[^\n]*checkpoint saved/m,
            'significant path: the STATE.md row carries the claim',
        );
        assert.ok(significant.stateWritten, 'the claim must be backed by a STATE.md on disk');

        // ...and is its own line on the skip path.
        const skipped = runFinalizeCheckpoint({ change: false });
        assert.strictEqual(skipped.result.status, 0);
        assert.match(
            skipped.result.stdout,
            /^\[state\] STATE\.md updated — checkpoint saved\.$/m,
            'skip path: the claim follows the update',
        );
        assert.ok(skipped.stateWritten, 'the claim must be backed by a STATE.md on disk');

        // A preview saves nothing, so it claims nothing.
        for (const change of [true, false]) {
            const preview = runFinalizeCheckpoint({ change, dryRun: true });
            assert.strictEqual(preview.result.status, 0);
            assert.doesNotMatch(
                preview.result.stdout,
                claim,
                `--dry-run (${path_(change)} path) must not claim a save`,
            );
            assert.strictEqual(
                preview.stateWritten,
                false,
                `--dry-run (${path_(change)} path) must not write STATE.md`,
            );
        }

        // A failed update is not a saved checkpoint, and does not block finalize.
        for (const change of [true, false]) {
            const failed = runFinalizeCheckpoint({ change, stateBlocked: true });
            assert.strictEqual(failed.result.status, 0, 'a STATE.md failure is non-blocking');
            assert.match(
                failed.result.stderr,
                /STATE\.md update skipped/,
                'the failure must be announced',
            );
            assert.doesNotMatch(
                failed.result.stdout + failed.result.stderr,
                claim,
                `an unwritable STATE.md (${path_(change)} path) must not be reported as a saved checkpoint`,
            );
            assert.strictEqual(
                failed.stateWritten,
                false,
                'the blocked path must not have become a file',
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 22. Shipped-text contracts — behavior that is prose (H10). The workflow
    //     bodies and rules are read by an agent, so what they say IS the
    //     behavior. Each contract states its detector once, proves the detector on
    //     synthetic text (it must flag what it claims to and spare what it must),
    //     and only then applies it to the shipped tree.
    // ───────────────────────────────────────────────────────────────────────────

    const shippedRoot = path.resolve(__dirname, '..', '..');
    const readShipped = (rel) => fs.readFileSync(path.join(shippedRoot, rel), 'utf8');

    // Repo-relative POSIX paths of the files under `dir` with one of `extensions`.
    const listShipped = (dir, extensions) => {
        const found = [];
        const walk = (current) => {
            for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                const full = path.join(current, entry.name);
                if (entry.isDirectory()) {
                    if (!['history', '.git', 'node_modules'].includes(entry.name)) walk(full);
                } else if (extensions.includes(path.extname(entry.name))) {
                    found.push(path.relative(shippedRoot, full).split(path.sep).join('/'));
                }
            }
        };
        if (fs.existsSync(path.join(shippedRoot, dir))) walk(path.join(shippedRoot, dir));
        return found.sort();
    };

    // The text of one numbered workflow step: its own line plus the indented
    // lines beneath it, up to the next step or heading.
    const stepBlock = (text, label) => {
        const lines = text.split(/\r?\n/);
        const start = lines.findIndex((line) => line.startsWith(`${label} `));
        if (start === -1) return null;
        let end = start + 1;
        while (end < lines.length && /^\s/.test(lines[end])) end++;
        return lines.slice(start, end).join('\n');
    };

    // The own-word rule `analyze.md` states for PHANTOM_COMMAND: a `/magic.{cmd}`
    // token is a command mention only when nothing but whitespace, a backtick or
    // an opening quote precedes it — so a path such as `rules/magic.md` is never
    // one; `{cmd}` is a lowercase word (a hyphen ends it); developer-facing
    // `magic.dev.*` names are exempt.
    const phantomCommands = (files, wrappers) => {
        const found = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                for (const match of line.matchAll(/(?<![^\s`"'“‘])\/magic\.([a-z]+)/g)) {
                    if (match[1] === 'dev' || wrappers.has(match[1])) continue;
                    found.push(`${rel}:${index + 1}: /magic.${match[1]}`);
                }
            });
        }
        return found;
    };

    test('shipped text advertises no phantom command, and the scan flags one when it is planted (H10a)', () => {
        // The detector, on synthetic text.
        const wrappers = new Set(['run', 'task']);
        const sample = [
            {
                rel: 'sample.md',
                text: [
                    'Run `/magic.pause` to stop.',
                    'Say "/magic.context" first.',
                    'Use /magic.retrospective now',
                    'See rules/magic.md and .agents/workflows/magic.run.md.',
                    'The `/magic.run`-executable flag and /magic.task both resolve.',
                    'Developer-facing: `/magic.dev.init`.',
                    '/magic.pause at a line start',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            phantomCommands(sample, wrappers),
            [
                'sample.md:1: /magic.pause',
                'sample.md:2: /magic.context',
                'sample.md:3: /magic.retrospective',
                'sample.md:7: /magic.pause',
            ],
            'flags a mention after a backtick, a quote, whitespace and a line start; spares paths, resolving commands, a hyphen-ended token and magic.dev.*',
        );

        // The shipped tree: `.magic/` (bodies, scripts, templates), docs, wrappers, rules, README.
        const resolved = new Set(
            fs
                .readdirSync(path.join(shippedRoot, 'workflows'))
                .map((name) => name.match(/^magic\.([a-z]+)\.md$/))
                .filter(Boolean)
                .map((match) => match[1]),
        );
        assert.ok(
            resolved.has('run') && resolved.has('task'),
            'the wrapper set is read from workflows/',
        );
        const scanned = [
            ...listShipped('.magic', ['.md', '.js', '.json']),
            ...listShipped('docs', ['.md']),
            ...listShipped('workflows', ['.md']),
            ...listShipped('rules', ['.md']),
            ...(fs.existsSync(path.join(shippedRoot, 'README.md')) ? ['README.md'] : []),
        ].map((rel) => ({ rel, text: readShipped(rel) }));
        assert.ok(
            scanned.length > 30,
            `the scan must actually see the shipped tree (saw ${scanned.length} files)`,
        );

        assert.deepStrictEqual(
            phantomCommands(scanned, resolved),
            [],
            'a /magic.{cmd} mention must resolve to workflows/magic.{cmd}.md — internal modules must not be advertised as commands',
        );
        // The pause module stays a module: no shipped text names it as a command,
        // whether or not a wrapper ever appears for it.
        assert.deepStrictEqual(
            phantomCommands(scanned, new Set()).filter((hit) => hit.endsWith('/magic.pause')),
            [],
            '/magic.pause is not a command',
        );
    });

    // A context-fill tier: a table cell holding only a percentage range,
    // threshold or open end (`0–40%`, `75%+`, `>70%`), or a narration of the form
    // `at 63%` / `at {n}%`. Percentages inside prose — a similarity threshold, a
    // coverage share — are not tiers and are spared.
    const fillTiers = (files) => {
        const cellRe = /\|\s*(?:[<>≥≤]=?\s*)?\d{1,3}\s*(?:[–—-]\s*\d{1,3}\s*)?%\+?\s*\|/;
        const narrationRe = /\bat\s+(?:\{\w+\}|\d{1,3})\s*%/i;
        const found = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                if (cellRe.test(line) || narrationRe.test(line)) found.push(`${rel}:${index + 1}`);
            });
        }
        return found;
    };

    test('shipped text carries no context-fill percentage tier or narration in any engine body (H10b)', () => {
        const retired = [
            {
                rel: 'retired.md',
                text: [
                    '| **PEAK** | 0–40% | Full files, parallel spec scans. |',
                    '| **DEGRADING** | 50-70% | Read only relevant spec sections. |',
                    '| **POOR** | 75%+ | Halt new reads. |',
                    '| **POOR** | >70% | Skip full spec reads. |',
                    'Crossing a tier → narrate one line (e.g. `[Budget] NORMAL → DEGRADED at 63%`).',
                    'Narrate `at {n}%` when a tier is crossed.',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            fillTiers(retired),
            [
                'retired.md:1',
                'retired.md:2',
                'retired.md:3',
                'retired.md:4',
                'retired.md:5',
                'retired.md:6',
            ],
            'every shape the retired tier tables used must be flagged',
        );
        const legitimate = [
            {
                rel: 'legitimate.md',
                text: [
                    '**RESCUE (AOP)**: name, title, or semantic similarity >80% → propose rename/sync.',
                    '🟢 = <5% uncovered/drift AND <3 shadow logic files.',
                    "2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30% (prefix or stem match).",
                    '| Threshold | 80% similarity | rename |',
                    'Overall: [2/3] ██░░ 66%',
                    'Look at 100 files before deciding.',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            fillTiers(legitimate),
            [],
            'thresholds and shares inside prose are not tiers',
        );

        // The shipped engine bodies: `.magic/*.md`, not only `context.md` — a
        // narrower scan passed while `task.md` still shipped its own tier table.
        const bodies = listShipped('.magic', ['.md'])
            .filter((rel) => !rel.slice('.magic/'.length).includes('/'))
            .map((rel) => ({ rel, text: readShipped(rel) }));
        assert.ok(bodies.length >= 8, `the scan must see the engine bodies (saw ${bodies.length})`);
        assert.deepStrictEqual(
            fillTiers(bodies),
            [],
            'the agent has no reading of its own context fill: no body may key behavior to a percentage tier',
        );
    });

    test('shipped text: run.md records Task Start and all three Attempts events, in order (H10c)', () => {
        const run = readShipped('.magic/run.md');

        // Step numbers repeat elsewhere in the file (another list has its own
        // "3."), so the steps are looked up inside their own section only.
        const stepsStart = run.indexOf('\n### Steps');
        const stepsEnd = run.indexOf('\n### Dead-End Record');
        assert.ok(
            stepsStart !== -1 && stepsEnd > stepsStart,
            'run.md must carry the Steps section followed by the Dead-End Record section',
        );
        const steps = run.slice(stepsStart, stepsEnd);

        // Task Start sits between Select and Execute — the record must exist
        // before the executor is activated.
        const select = steps.indexOf('\n2. **Select**');
        const start = steps.indexOf('\n2b. **Task Start**');
        const execute = steps.indexOf('\n3. **Execute**');
        assert.ok(
            select !== -1 && start !== -1 && execute !== -1,
            'run.md must carry Select, Task Start and Execute steps',
        );
        assert.ok(
            select < start && start < execute,
            'Task Start must sit between Select and Execute',
        );
        const taskStart = stepBlock(steps, '2b.');
        assert.match(taskStart, /`In Progress`/, 'Task Start records the task as in flight');
        assert.match(taskStart, /- \[ \]/, 'Task Start states that the checklist line stays open');
        assert.match(
            taskStart,
            /Attempts/,
            'Task Start reads the recorded dead ends before an approach is chosen',
        );

        // The three moments a dead end is recorded, each at its own step.
        assert.match(
            stepBlock(steps, '3.'),
            /Attempts/,
            'an approach discarded or reverted in Step 3 is recorded',
        );
        assert.match(
            stepBlock(steps, '3.4.'),
            /FAIL[^\n]*Attempts/,
            'a Diff Review return is recorded',
        );
        assert.match(
            stepBlock(steps, '3.4b.'),
            /FAIL[^\n]*Attempts/,
            'an Instruction Diff Review return is recorded',
        );
        const qa = stepBlock(steps, '3.5.');
        assert.ok(
            qa.includes('Attempts') &&
                qa.includes('Blocked [!]') &&
                qa.indexOf('Attempts') < qa.indexOf('Blocked [!]'),
            'a Verify or QA failure is recorded before the task is set Blocked',
        );

        // The closed list and the cap, stated once.
        const section = run.match(
            /^### Dead-End Record \(`Attempts`\)\n([\s\S]*?)(?=\n### |\n## |(?![\s\S]))/m,
        );
        assert.ok(section, 'run.md must carry the Dead-End Record section');
        assert.match(section[1], /^1\. .*(Verify|QA)/m, 'event 1: a Verify or QA failure');
        assert.match(
            section[1],
            /^2\. .*review/im,
            'event 2: a review verdict that returns work to Step 3',
        );
        assert.match(
            section[1],
            /^3\. .*(discard|revert)/im,
            'event 3: an approach discarded or reverted',
        );
        assert.match(
            section[1],
            /At most \*\*five\*\* entries/,
            'the dead-end list is capped at five',
        );

        assert.match(run, /☐ Task Start:/, 'the Run Completion Checklist verifies Task Start');
        assert.match(
            run,
            /☐ Dead-End Record:/,
            'the Run Completion Checklist verifies the dead-end record',
        );
    });

    test('shipped text: rules/magic.md carries the session resume check and its opt-out (H10d)', () => {
        const rules = readShipped('rules/magic.md');
        assert.match(
            rules,
            /^## 10\. Session Resume Check/m,
            'rules/magic.md must carry section 10',
        );
        assert.ok(
            rules.indexOf('\n## 9. ') < rules.indexOf('\n## 10. '),
            'section 10 follows section 9',
        );
        assert.match(
            rules,
            /executor\.js resume-state --all/,
            'the rule runs the shared predicate over every workspace',
        );
        assert.match(rules, /MAGIC_RESUME_CHECK=0/, 'the rule states its opt-out');
        assert.match(
            rules,
            /verify §1–§10 were honored/,
            'the completion protocol counts section 10',
        );
        assert.match(
            rules,
            /\*\*§10 Session Resume Check\*\*/,
            'the completion protocol carries a section 10 item',
        );
    });
});
