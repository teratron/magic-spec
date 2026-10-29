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
    // The scripts under test are the engine's own; fixtures are laid out as the developer repository is
    // (the engine at skills/magicspec, the maintenance scripts at scripts).
    const scriptsDir = path.resolve(__dirname, '..', 'skills', 'magicspec', 'scripts');
    const devScriptsDir = path.resolve(__dirname, '..', 'scripts');

    const scaffoldTempDirs = (tempDir) => {
        fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'scripts'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'templates'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'scripts'), { recursive: true });
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

        copyDirShallow(scriptsDir, path.join(tempDir, 'skills', 'magicspec', 'scripts'));
        copyDirShallow(
            path.join(scriptsDir, 'lib'),
            path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib'),
        );
        copyDirShallow(devScriptsDir, path.join(tempDir, 'scripts'));

        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', '.version'), '1.0.0');

        if (withGit) initGitFixture(tempDir);

        return tempDir;
    };

    // Engine modules read the project root once, when they load. A module loaded
    // in-process from a fixture is therefore loaded with the fixture as the root,
    // as an executor run from inside the fixture would have it.
    const requireFromFixture = (fixtureDir, ...parts) => {
        const previous = process.env.MAGIC_ROOT;
        process.env.MAGIC_ROOT = fixtureDir;
        try {
            return require(path.join(fixtureDir, 'skills', 'magicspec', 'scripts', ...parts));
        } finally {
            if (previous === undefined) delete process.env.MAGIC_ROOT;
            else process.env.MAGIC_ROOT = previous;
        }
    };

    // A maintenance script of the fixture, loaded the same way: from scripts, where it lives.
    const requireDevFromFixture = (fixtureDir, name) => {
        const previous = process.env.MAGIC_ROOT;
        process.env.MAGIC_ROOT = fixtureDir;
        try {
            return require(path.join(fixtureDir, 'scripts', name));
        } finally {
            if (previous === undefined) delete process.env.MAGIC_ROOT;
            else process.env.MAGIC_ROOT = previous;
        }
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

    // STATE.md "Blocking Constraints" body: `count` numbered anti-pattern bullets.
    const antiPatternLines = (count) =>
        Array.from(
            { length: count },
            (_, i) =>
                `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
        );

    // Runs generate-context.js in a temp workspace and returns the CONTEXT.md text.
    const generateContext = (tempDir) => {
        const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'generate-context.js');
        execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
        return fs.readFileSync(path.join(tempDir, '.magicspec', 'CONTEXT.md'), 'utf8');
    };

    // Loads the changelog writer from a temp workspace's engine copy.
    const loadChangelogWriter = (tempDir) =>
        requireFromFixture(tempDir, 'lib', 'changelog-writer.js');

    // Runs the developer-only checksum manifest builder inside a temp workspace,
    // so scripts gated on engine integrity (check-prerequisites, update-engine-meta)
    // see a consistent skills/magicspec/.checksums.
    const generateChecksums = (tempDir) => {
        const checksumScript = path.join(tempDir, 'scripts', 'generate-checksums.js');
        execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });
    };

    // Runs update-engine-meta.js --check in a temp workspace, returning
    // { failed: boolean, output: string }.
    const runEngineMetaCheck = (tempDir) => {
        const metaScript = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-engine-meta.js');
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
        const realTemplate = path.resolve(__dirname, '..', 'skills', 'magicspec', 'templates', 'state.md');
        if (fs.existsSync(realTemplate)) {
            fs.copyFileSync(realTemplate, path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'));
        }
    };

    // Copies the real global-index.md template into a temp workspace, mirroring
    // copyStateTemplate above, so init.js's Auto-Init path exercises the real
    // template instead of the empty-string fallback getTemplate() uses when a
    // template file is absent.
    const copyGlobalIndexTemplate = (tempDir) => {
        const realTemplate = path.resolve(
            __dirname,
            '..',
            'skills',
            'magicspec',
            'templates',
            'global-index.md',
        );
        if (fs.existsSync(realTemplate)) {
            fs.copyFileSync(
                realTemplate,
                path.join(tempDir, 'skills', 'magicspec', 'templates', 'global-index.md'),
            );
        }
    };

    // Creates `.magicspec/{workspace}/` inside a temp workspace.
    const makeWorkspace = (tempDir, workspace = 'engine') => {
        const wsDir = path.join(tempDir, '.magicspec', workspace);
        fs.mkdirSync(wsDir, { recursive: true });
        return wsDir;
    };

    // Creates `.magicspec/{workspace}/tasks/` inside a temp workspace, returning
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
        const designDir = path.join(tempDir, '.magicspec');
        const wsDir = makeWorkspace(tempDir, workspace);
        fs.writeFileSync(
            path.join(designDir, 'workspace.json'),
            JSON.stringify({
                default: workspace,
                finalization: {
                    enabled: true,
                    autoBump: true,
                    autoChangelog,
                    versionPath: '.magicspec/.version',
                },
            }),
        );
        fs.writeFileSync(path.join(designDir, '.version'), version);
        return {
            designDir,
            wsDir,
            versionPath: path.join(designDir, '.version'),
            finalizePath: path.join(tempDir, 'skills', 'magicspec', 'scripts', 'finalize.js'),
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
        const archiver = requireFromFixture(tempDir, 'lib', 'phase-archiver.js');
        return { archiver, ...makeWorkspaceWithTasks(tempDir) };
    };

    // Writes a minimal `l1-core.md` spec with a Canonical References entry for
    // `src/`, used by the Invariant 7 gitignore-parity fixtures.
    const writeCanonicalCoreSpec = (tempDir) => {
        const specsDir = path.join(tempDir, '.magicspec', 'specifications');
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
        const finalize = requireFromFixture(tempDir, 'finalize.js');
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
        const { updateState } = requireFromFixture(tempDir, 'update-state.js');
        return { updateState, wsDir: makeWorkspace(tempDir) };
    };

    // Same pairing, but with a tasks/ directory too — for the computeProgress
    // test that needs a phase file alongside TASKS.md.
    const requireUpdateStateWithTasks = (tempDir) => {
        const { updateState } = requireFromFixture(tempDir, 'update-state.js');
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
    // file tree rather than a full .magicspec/ workspace (§15, §18).
    const writeTreeFile = (tempDir, rel, body) => {
        const abs = path.join(tempDir, ...rel.split('/'));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body);
    };

    // Creates `.magicspec/specifications/` inside a temp workspace and returns
    // both paths — the fixture every check-prerequisites.js registry/header
    // test (§6) starts from.
    const makeSpecWorkspace = (tempDir) => {
        const designDir = path.join(tempDir, '.magicspec');
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
        const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-prerequisites.js');
        const output = execSync(`node "${scriptPath}" --json ${extraArgs.join(' ')}`.trim(), {
            cwd: tempDir,
            encoding: 'utf8',
        });
        return JSON.parse(output);
    };

    // Creates a bare `.magicspec/` directory and returns both it and the
    // INDEX.md path callers write into — the pairing every
    // update-project-meta.js test starts from before layering its own
    // INDEX.md content (that content varies per test, unlike the other
    // `.magicspec/`-bootstrap helpers below).
    const makeDesignDir = (tempDir) => {
        const designDir = path.join(tempDir, '.magicspec');
        fs.mkdirSync(designDir, { recursive: true });
        return { designDir, indexPath: path.join(designDir, 'INDEX.md') };
    };

    // Minimal `.magicspec/` bootstrap (empty specifications/, INDEX.md, RULES.md)
    // used by every DESIGN_DEBT_PENDING (SC-2.4) probe in §6b2 — none of them
    // exercise spec content, only PLAN.md/TASKS.md.
    const makeMinimalDesignDir = (tempDir) => {
        const designDir = path.join(tempDir, '.magicspec');
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
            const scriptPath = path.join(tempDir, 'scripts', 'generate-checksums.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
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
    // 1a. Architecture invariant — no volatile state caches inside skills/magicspec/
    //     (Historical: regressions used to flag ENGINE_INTEGRITY when sync sub-
    //      scripts wrote state caches into skills/magicspec/. State files now live in
    //      .magicspec/.cache/ and .cache/; skills/magicspec/ stays a clean engine kernel.)
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel must not ship volatile state caches in skills/magicspec/', () => {
        const magicRoot = path.join(__dirname, '..', 'skills', 'magicspec');
        const forbidden = ['.docs-state.json', '.project-meta-state.json', '.finalize-state.json'];
        for (const name of forbidden) {
            assert.ok(
                !fs.existsSync(path.join(magicRoot, name)),
                `${name} must not exist inside skills/magicspec/ — relocate to .cache/ or .magicspec/.cache/`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1b. Architecture invariant — the CommonJS module-scope boundary must ship
    //     Downstream projects whose root package.json declares "type":"module"
    //     would otherwise resolve skills/magicspec/scripts/*.js as ESM and die on require().
    //     The boundary only protects users if it is tracked: the release archive
    //     is built by walking a fresh CI checkout, so untracked files never ship,
    //     and update-engine-meta --check does NOT flag manifest entries whose
    //     file is absent — the omission would be silent.
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel ships a tracked CommonJS scope boundary at skills/magicspec/scripts/package.json', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const relPath = 'skills/magicspec/scripts/package.json';
        const absPath = path.join(repoRoot, relPath);

        assert.ok(
            fs.existsSync(absPath),
            `${relPath} must exist — it pins CommonJS for the engine scripts`,
        );

        const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        assert.strictEqual(pkg.type, 'commonjs', `${relPath} must declare "type":"commonjs"`);

        // Ignored → omitted from the release archive → the boundary silently vanishes. A file is
        // counted when git would commit it: tracked, or new and not ignored (the state before a commit).
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert
        const committable = execSync(`git ls-files --cached --others --exclude-standard -- "${relPath}"`, {
            cwd: repoRoot,
            encoding: 'utf8',
        })
            .split(/\r?\n/)
            .filter(Boolean);
        assert.deepStrictEqual(
            committable,
            [relPath],
            `${relPath} exists but is IGNORED or untracked — it will be missing from the release archive. Check .gitignore, then: git add ${relPath}`,
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
    test('every skills/magicspec/.checksums entry must be a git-tracked file', () => {
        const repoRoot = path.resolve(__dirname, '..');
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert

        const tracked = new Set(
            execSync('git ls-files --cached --others --exclude-standard skills/magicspec', { cwd: repoRoot, encoding: 'utf8' })
                .split(/\r?\n/)
                .filter(Boolean)
                .map((p) => p.slice('skills/magicspec/'.length)),
        );

        const checksums = JSON.parse(
            fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', '.checksums'), 'utf8'),
        );
        const untracked = Object.keys(checksums).filter((rel) => !tracked.has(rel));

        assert.deepStrictEqual(
            untracked,
            [],
            `skills/magicspec/.checksums references untracked path(s) — a release archive can never contain them, so every consumer's first commit would fail: ${untracked.join(', ')}. Run: git add ${untracked.map((rel) => 'skills/magicspec/' + rel).join(' ')}`,
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
        const repoRoot = path.resolve(__dirname, '..');
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
        for (const dir of [path.join('skills', 'magicspec')]) {
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

            const strayDir = path.join(tempDir, 'skills', 'magicspec', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile third-party cache content');

            generateChecksums(tempDir);

            const checksums = JSON.parse(
                fs.readFileSync(path.join(tempDir, 'skills', 'magicspec', '.checksums'), 'utf8'),
            );
            assert.ok(
                !Object.keys(checksums).some((rel) => rel.startsWith('.foreign-cache/')),
                'a .gitignored directory inside skills/magicspec/ must never enter the manifest',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-engine-meta.js --check does not flag a .gitignored file that newly appears inside skills/magicspec/ (Invariant 7)', () => {
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
            // skills/magicspec/ after install — exactly how `.fallow/` appeared in engine
            // v2.1.86. A consumer install has no scripts/generate-checksums.js
            // to clear resulting drift, so this must never be flagged at all.
            const strayDir = path.join(tempDir, 'skills', 'magicspec', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile');

            const after = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                after.failed,
                false,
                'a .gitignored file appearing inside skills/magicspec/ must never be reported as drift',
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
    // documented L1 contract and gitignores `skills/magicspec/` wholesale ("installed
    // from a release archive, not committed"). Before this
    // fix, the Invariant 7 exclusion applied unconditionally, so every single
    // manifested file read as "disowned" by the consumer's own .gitignore and
    // was reported missing — failing the pre-commit hook on every commit.
    test('update-engine-meta.js --check still verifies manifested files even when the consumer wholesale-gitignores skills/magicspec/ (Invariant 7 boundary)', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            // Consumer convention: skills/magicspec/ is an installed release artifact,
            // never committed — this is the documented, expected state for
            // every consumer install, not an edge case.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'skills/magicspec/\n');

            const result = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                result.failed,
                false,
                'unmodified manifested files must not be reported as missing merely because the consumer gitignores skills/magicspec/ wholesale',
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
    test('init.js should initialize .magicspec structure and workspaces', () => {
        const tempDir = createTempWorkspace();
        try {
            copyGlobalIndexTemplate(tempDir);
            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js');

            // 1. Standard init
            execSync(`node "${scriptPath}"`, {
                cwd: tempDir,
                env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec' },
            });
            assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'INDEX.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'RULES.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'main', 'INDEX.md')));

            // skills/magicspec/AGENT-RULES.md §1 step 3: Auto-Init seeds a correctly-seeded Engine
            // Version snapshot on its own, not left for /magicspec:analyze to add later
            // (field report, engine v2.1.104: fresh init produced no snapshot at all).
            const freshIndex = fs.readFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), 'utf8');
            assert.match(
                freshIndex,
                /\*\*Engine Version:\*\* 1\.0\.0/,
                'Auto-Init must seed **Engine Version:** from skills/magicspec/.version, not leave it missing',
            );

            // 2. Workspace init via MAGIC_DESIGN_DIR (as executor.js would do)
            const wsPath = path.join('.magicspec', 'test-ws');
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
            const templatesDir = path.join(tempDir, 'skills', 'magicspec', 'templates');
            if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
            fs.writeFileSync(
                path.join(templatesDir, 'contributing.md'),
                '# Contributing v{{VERSION}}\n\n## Rules\n{{rules_block}}\n\n## Registry\n{{registry_block}}',
            );

            // Setup .magicspec content
            fs.mkdirSync(path.join(tempDir, '.magicspec'));
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'RULES.md'),
                '## 1. Concept\nRule 1\n## 7. Misc\n',
            );
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'INDEX.md'),
                '## Workspaces\n| test | desc |\n## Meta\n',
            );

            // Setup docs and workflows for trigger sync test
            const docsDir = path.join(tempDir, 'docs');
            fs.mkdirSync(docsDir);
            fs.writeFileSync(
                path.join(docsDir, 'test-wf.md'),
                '# Test Workflow\n\n**Triggers:** `old-trigger`\n\n**Slash command:** `/old-command`\n\n## Sync Note\n\nSynchronized with engine workflows on 2026-01-01 (v0.0.1).\n',
            );

            const workflowsDir = path.join(tempDir, 'skills', 'magicspec', 'workflows');
            fs.mkdirSync(workflowsDir, { recursive: true });
            fs.writeFileSync(
                path.join(workflowsDir, 'test-wf.md'),
                '# Test Workflow\n\n**Triggers:** `new-trigger`, `another-trigger`',
            );

            // Second doc/workflow pair: pins the "[arg]" slash-command suffix
            // preservation branch (sync-docs.js syncSlashCommandLine), the
            // shape every multi-arg command doc actually uses.
            fs.writeFileSync(
                path.join(docsDir, 'arg-wf.md'),
                '# Arg Workflow\n\n**Slash command:** `/old-arg-command [old]`\n',
            );
            fs.writeFileSync(
                path.join(workflowsDir, 'arg-wf.md'),
                '# Arg Workflow\n',
            );

            // A doc with no matching skills/magicspec/workflows/{name}.md — pins the
            // "no source → leave doc alone" skip branch (sync-docs.js
            // syncDocsFolder's early `continue`).
            const orphanContent = '# Orphan\n\nNo matching workflow exists for this doc.\n';
            fs.writeFileSync(path.join(docsDir, 'orphan.md'), orphanContent);

            const scriptPath = path.join(tempDir, 'scripts', 'sync.js');
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
                docContent.includes('**Slash command:** `/magicspec:test-wf`'),
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
                argDocContent.includes('**Slash command:** `/magicspec:arg-wf [old]`'),
                'the [arg] suffix must be preserved, only the command name replaced',
            );

            // The orphan doc has no matching workflow source and must be
            // byte-for-byte untouched.
            assert.strictEqual(
                fs.readFileSync(path.join(docsDir, 'orphan.md'), 'utf8'),
                orphanContent,
                'a doc with no matching workflow source must be left alone',
            );

            // Idempotent second run: nothing under workflows/, .magicspec/, or
            // skills/magicspec/ changed, so every doc must come out byte-identical —
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

            const scriptPath = path.join(tempDir, 'scripts', 'update-project-meta.js');
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
            const upm = requireDevFromFixture(tempDir, 'update-project-meta.js');

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

            const scriptPath = path.join(tempDir, 'scripts', 'update-project-meta.js');
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
            fs.mkdirSync(path.join(tempDir, '.magicspec'));
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                '{"name":"fixture","version":"1.0.0"}\n',
            );
            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'generate-context.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const contextContent = fs.readFileSync(
                path.join(tempDir, '.magicspec', 'CONTEXT.md'),
                'utf8',
            );
            assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'CONTEXT.md')));
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
            // scripts/ (developer-only); tempDir has scripts/ wired up by createTempWorkspace.
            generateChecksums(tempDir);

            // Trigger drift: modify a file so update-engine-meta detects change and bumps version
            fs.appendFileSync(path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js'), '\n// drift\n');

            const executorPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');
            execSync(`node "${executorPath}" update-engine-meta`, { cwd: tempDir });

            const versionFile = path.join(tempDir, 'skills', 'magicspec', '.version');
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
            const victim = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js');
            assert.ok(fs.existsSync(victim), 'fixture precondition: init.js is present');
            fs.unlinkSync(victim);

            const missing = runEngineMetaCheck(tempDir);
            assert.ok(missing.failed, 'a manifest entry with no file on disk must fail --check');
            assert.match(missing.output, /scripts\/init\.js/, '--check must name the missing file');

            // Write mode treats the absence as an engine change: bump + regenerate.
            const metaScript = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-engine-meta.js');
            execSync(`node "${metaScript}"`, { cwd: tempDir, stdio: 'pipe' });
            assert.strictEqual(
                fs.readFileSync(path.join(tempDir, 'skills', 'magicspec', '.version'), 'utf8').trim(),
                '1.0.1',
                'a removed engine file is a change and must bump the version',
            );
            const regenerated = JSON.parse(
                fs.readFileSync(path.join(tempDir, 'skills', 'magicspec', '.checksums'), 'utf8'),
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
    //     Snapshot Sync). Reuses createTempWorkspace's existing scripts/
    //     mirroring: the dev-repo branch is the fixture default, so the
    //     consumer branch is the one that must explicitly delete the guard
    //     script — mirroring how the fixture already withholds
    //     generate-checksums.js from skills/magicspec/scripts/ for the same reason.
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
                fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
                fs.writeFileSync(
                    path.join(tempDir, '.magicspec', 'INDEX.md'),
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
                    path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js'),
                    `\n// drift ${label}\n`,
                );
            }

            // Consumer-style fixture: remove the snapshot guard script only. The
            // manifest builder stays, so the write branch still runs and the
            // per-script guard is what is under test. A true user installation
            // lacks the manifest builder and is refused before any of this
            // (see 5b-bis below).
            fs.unlinkSync(path.join(consumerDir, 'scripts', 'sync-engine-snapshot.js'));

            // `2>&1`: the consumer-branch message is `console.warn` (stderr),
            // and `execSync`'s return value is stdout only — without merging,
            // the very warning this case exists to pin is silently dropped.
            const runWrite = (tempDir) =>
                execSync(
                    `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-engine-meta.js')}" 2>&1`,
                    { cwd: tempDir, encoding: 'utf8' },
                );

            const devOut = runWrite(devRepoDir);
            const devIndex = fs.readFileSync(path.join(devRepoDir, '.magicspec', 'INDEX.md'), 'utf8');
            const devVersion = fs
                .readFileSync(path.join(devRepoDir, 'skills', 'magicspec', '.version'), 'utf8')
                .trim();
            assert.match(
                devIndex,
                new RegExp(`\\*\\*Engine Version:\\*\\* ${devVersion.replace(/\./g, '\\.')}`),
                'dev-repo: .magicspec/INDEX.md Engine Version must match the freshly-bumped skills/magicspec/.version',
            );
            assert.match(
                devOut,
                /Engine Version snapshot synced/,
                'dev-repo: sync must run and log',
            );

            const consumerOut = runWrite(consumerDir);
            const consumerIndex = fs.readFileSync(
                path.join(consumerDir, '.magicspec', 'INDEX.md'),
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
    //     A release ships `skills/magicspec/` only, so a user installation has no manifest
    //     builder. The write branch used to bump `skills/magicspec/.version` anyway, print
    //     "Engine metadata and version updated", and leave the manifest — and
    //     therefore the warning that sent the operator there — exactly as it
    //     was. Every retry moved the version again. The version is the signal
    //     Engine Upgrade Detection reads as "the engine was replaced under this
    //     project", so a local bump reads as a phantom upgrade.
    // ───────────────────────────────────────────────────────────────────────────

    // createTempWorkspace mirrors scripts by default (the dev-repo shape), so
    // the user-installation shape is that fixture with dev/ removed AFTER the
    // manifest is built — the order a release ships in. `spec.md` and `task.md`
    // are the two files the field report named: one edited, one with its line
    // endings converted (the check cannot tell the two apart, and must not have to).
    const makeDriftedEngine = (tempDir, { userInstallation }) => {
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '# spec\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'), '# task\n');
        generateChecksums(tempDir);
        if (userInstallation)
            fs.rmSync(path.join(tempDir, 'scripts'), { recursive: true, force: true });
        fs.appendFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '<!-- local note -->\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'), '# task\r\n');
    };

    // stdout and stderr merged, and a non-zero exit returned instead of thrown:
    // these cases assert on the refusal's message and status, not just success.
    const runMeta = (tempDir, script, ...args) => {
        const res = spawnSync(
            process.execPath,
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', script), ...args],
            { cwd: tempDir, encoding: 'utf8' },
        );
        return { status: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
    };

    test('update-engine-meta write mode is refused in a user installation: no version bump, no manifest rewrite, non-zero exit', () => {
        const tempDir = createTempWorkspace();
        try {
            makeDriftedEngine(tempDir, { userInstallation: true });
            const versionPath = path.join(tempDir, 'skills', 'magicspec', '.version');
            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
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
                user.map((w) => w.message.match(/'skills\/magicspec\/([^']+)'/)[1]).sort(),
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
    // 5b-bis. A manifested engine file that is gone is drift, reported by the
    //         pre-flight as the update check already reports it.
    //
    //     The two checks read the same manifest and disagreed: the pre-flight
    //     hashed only the files that exist, so a deleted one produced no finding
    //     while `--check` failed on it.
    // ───────────────────────────────────────────────────────────────────────────
    const INTEGRITY_STATES = ['untouched', 'modified', 'deleted'];

    // A layout whose manifest matches the engine, then put in one of three
    // states. `.magicspec/` is present so that `ok` reflects the integrity story
    // alone: true for the untouched layout.
    const makeIntegrityLayout = (tempDir, { userInstallation, state }) => {
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '# spec\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'), '# task\n');
        fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index\n');
        fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules\n');
        generateChecksums(tempDir);
        if (userInstallation)
            fs.rmSync(path.join(tempDir, 'scripts'), { recursive: true, force: true });
        if (state === 'modified')
            fs.appendFileSync(path.join(tempDir, 'skills', 'magicspec', 'spec.md'), '<!-- local note -->\n');
        if (state === 'deleted') fs.rmSync(path.join(tempDir, 'skills', 'magicspec', 'task.md'));
    };

    const integrityVerdicts = (tempDir) => {
        const pre = runCheckPrerequisites(tempDir);
        return {
            ok: pre.ok,
            findings: pre.warnings.filter((w) => w.type === 'ENGINE_INTEGRITY'),
            checkStatus: runMeta(tempDir, 'update-engine-meta.js', '--check').status,
        };
    };

    test('pre-flight and update-engine-meta --check agree on an untouched, a modified and a deleted layout, in a developer repository and in a user installation', () => {
        for (const userInstallation of [false, true]) {
            for (const state of INTEGRITY_STATES) {
                const tempDir = createTempWorkspace();
                try {
                    makeIntegrityLayout(tempDir, { userInstallation, state });
                    const verdict = integrityVerdicts(tempDir);
                    const label = `${userInstallation ? 'user installation' : 'developer repository'}, ${state}`;
                    if (state === 'untouched') {
                        assert.deepStrictEqual(
                            verdict.findings,
                            [],
                            `${label}: no integrity finding`,
                        );
                        assert.strictEqual(verdict.ok, true, `${label}: the pre-flight is clean`);
                        assert.strictEqual(verdict.checkStatus, 0, `${label}: --check is clean`);
                    } else {
                        assert.strictEqual(
                            verdict.findings.length,
                            1,
                            `${label}: exactly one finding`,
                        );
                        assert.strictEqual(
                            verdict.ok,
                            false,
                            `${label}: the pre-flight reports drift`,
                        );
                        assert.notStrictEqual(
                            verdict.checkStatus,
                            0,
                            `${label}: --check reports drift`,
                        );
                    }
                } finally {
                    cleanup(tempDir);
                }
            }
        }
    });

    test('pre-flight names a deleted engine file as missing, with the remedy of the installation kind, and keeps the modified-file wording', () => {
        const devDir = createTempWorkspace();
        const userDir = createTempWorkspace();
        const editedDir = createTempWorkspace();
        try {
            makeIntegrityLayout(devDir, { userInstallation: false, state: 'deleted' });
            makeIntegrityLayout(userDir, { userInstallation: true, state: 'deleted' });
            makeIntegrityLayout(editedDir, { userInstallation: false, state: 'modified' });

            const [dev] = integrityVerdicts(devDir).findings;
            assert.match(
                dev.message,
                /^'skills\/magicspec\/task\.md' is missing locally\./,
                'the file is named as missing',
            );
            assert.match(
                dev.fix,
                /update-engine-meta/,
                'developer repository: the C14 command is the remedy',
            );
            assert.doesNotMatch(
                dev.message,
                /release archive/,
                'developer repository: no restore instruction',
            );

            const [user] = integrityVerdicts(userDir).findings;
            assert.match(
                user.message,
                /^'skills\/magicspec\/task\.md' is missing locally\./,
                'the file is named as missing',
            );
            assert.match(
                user.message,
                /release archive/,
                'user installation: the remedy is a restore',
            );
            assert.strictEqual(
                user.fix,
                null,
                'user installation: there is no automated fix to suggest',
            );

            const [edited] = integrityVerdicts(editedDir).findings;
            assert.match(
                edited.message,
                /^'skills\/magicspec\/spec\.md' has been modified locally/,
                'a modified file keeps its own wording',
            );
        } finally {
            cleanup(devDir);
            cleanup(userDir);
            cleanup(editedDir);
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
            const { describeManifestDelta } = requireFromFixture(tempDir, 'utils.js');
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
                        .map((w) => [w.message.match(/'skills\/magicspec\/([^']+)'/)[1], w.message]),
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
                '---\nname: magic.example\ndescription: Does the original thing to the plan. Use when the user asks for the original thing.\n---\n\n# Example\n\nOriginal body.\n',
            );

            const metaScript = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-engine-meta.js');
            const versionPath = path.join(tempDir, 'skills', 'magicspec', '.version');
            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
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
                '--check must never write skills/magicspec/.version',
            );
            assert.strictEqual(
                fs.readFileSync(checksumsPath, 'utf8'),
                checksumsBefore,
                '--check must never write skills/magicspec/.checksums',
            );
            assert.ok(
                !fs.existsSync(skillPath),
                '--check must never trigger skill regeneration — a write side effect on a read-only surface',
            );
            assert.match(checkOut, /No changes detected in skills\/magicspec\//);
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5e. skills/ — the frontmatter contract on the shipped wrappers.
    //     A host reads `name` and `description` before anything else in a
    //     wrapper, and chooses among every installed skill from the
    //     description alone. Each shipped wrapper must meet the format's
    //     limits and say, in the third person, what it does and when to use
    //     it. The assertions are written out here rather than borrowed from the
    //     generator, so the generator is not graded by its own validator. The
    //     wording of the descriptions is not pinned — only the contract.
    // ───────────────────────────────────────────────────────────────────────────
    test('skill frontmatter: the router of each skill satisfies the contract (name grammar, description limits, Use when sentence, third person)', () => {
        const syncSkills = require(path.join(devScriptsDir, 'skill-frontmatter.js'));
        const repoRoot = path.resolve(__dirname, '..');
        // Both routers are authored; the contract is the same for the engine skill and the maintenance skill.
        const sourceNames = new Set(['magicspec', 'magicspec-dev']);
        const dirs = ['magicspec', 'magicspec-dev'].map((name) => ({
            name,
            file: path.join(repoRoot, 'skills', name, 'SKILL.md'),
        }));

        for (const dirent of dirs) {
            const text = fs.readFileSync(dirent.file, 'utf8');
            const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            assert.ok(block, `${dirent.name}: SKILL.md must open with a frontmatter block`);

            // A top-level scalar, with any indented continuation lines folded in.
            const field = (key) => {
                const lines = block[1].split(/\r?\n/);
                const at = lines.findIndex((l) => l.startsWith(`${key}:`));
                if (at === -1) return '';
                const parts = [lines[at].slice(key.length + 1).trim()];
                for (let i = at + 1; i < lines.length && /^\s/.test(lines[i]); i++) {
                    parts.push(lines[i].trim());
                }
                return parts.filter(Boolean).join(' ');
            };
            const name = field('name');
            const description = field('description');

            assert.match(
                name,
                /^[a-z0-9-]{1,64}$/,
                `${dirent.name}: name must be 1-64 characters of lowercase letters, digits and hyphens`,
            );
            assert.ok(
                syncSkills.RESERVED_NAME_WORDS.every((word) => !name.includes(word)),
                `${dirent.name}: name must not contain a word the target skill format reserves`,
            );
            assert.ok(
                sourceNames.has(name),
                `${dirent.name}: name "${name}" must be the hyphenated file name of a workflow`,
            );
            assert.strictEqual(name, dirent.name, `${dirent.name}: name must equal its directory`);

            assert.ok(description.length > 0, `${name}: description must not be blank`);
            assert.ok(
                description.length <= 1024,
                `${name}: description is ${description.length} characters, limit 1,024`,
            );
            assert.doesNotMatch(
                description,
                /[<>]/,
                `${name}: description must not contain "<" or ">"`,
            );
            assert.match(
                description,
                /(^|[.!?]\s+)Use when\b/,
                `${name}: description must carry a "Use when" sentence`,
            );
            assert.doesNotMatch(
                description,
                /\b(I|we|my|you|your)\b/i,
                `${name}: description must be third person`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5h. skills/magicspec/*.md — body navigation. A wrapper points to a body and a body to
    //     the shared modules it applies, and an agent may preview a file it
    //     reaches through such a chain instead of reading it through. A body over
    //     100 lines therefore opens with a contents list that names every `##`
    //     section, and a pointer to a shared module applies the module as a
    //     whole: a section list silently excludes each section it omits.
    // ───────────────────────────────────────────────────────────────────────────

    /** A body longer than this many lines needs a contents list, within its first CONTENTS_WINDOW lines. */
    const LONG_BODY_LINES = 100;
    const CONTENTS_WINDOW = 40;

    /** Newline-terminated lines, as `wc -l` counts them. */
    const countLines = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

    /** The `##` headings of a body outside fenced code blocks, in file order. */
    const h2Headings = (text) => {
        const found = [];
        let fence = null;
        for (const line of text.split('\n')) {
            const f = line.match(/^\s*(```+|~~~+)/);
            if (f) {
                if (fence === null) fence = f[1][0];
                else if (f[1][0] === fence) fence = null;
                continue;
            }
            if (fence) continue;
            const m = line.match(/^## (.+?)\s*$/);
            if (m) found.push(m[1]);
        }
        return found;
    };

    /** The list items within the first 40 lines, with the bullet stripped. */
    const contentsItems = (text) =>
        text
            .split('\n')
            .slice(0, CONTENTS_WINDOW)
            .filter((line) => /^\s*[-*]\s+/.test(line))
            .map((line) => line.replace(/^\s*[-*]\s+/, '').trim());

    /**
     * A body of at most 100 lines needs nothing; a longer one needs the text of
     * every `##` heading as a list item within its first 40 lines, in file order.
     * An entry may carry a trailing note after an em dash.
     */
    const contentsProblems = (text) => {
        if (countLines(text) <= LONG_BODY_LINES) return [];
        const items = contentsItems(text);
        const problems = [];
        let from = 0;
        for (const heading of h2Headings(text)) {
            const at = items.findIndex(
                (item, i) => i >= from && (item === heading || item.startsWith(`${heading} —`)),
            );
            if (at === -1) {
                problems.push(`no contents entry, in file order, for "${heading}"`);
                continue;
            }
            from = at + 1;
        }
        return problems;
    };

    /**
     * Sections the shared module itself marks as one workflow's alone — a
     * contents entry that ends with an em dash, a backticked name and "only".
     */
    const narrowerSections = (moduleText) =>
        new Set(
            h2Headings(moduleText).filter((heading) =>
                contentsItems(moduleText).some(
                    (item) => item.startsWith(`${heading} —`) && /— `[^`]+` only$/.test(item),
                ),
            ),
        );

    /**
     * Every link to the shared module in a body: with no section list after it
     * the pointer applies the module as a whole; with one, the list must carry
     * the heading text of every section the module does not mark as narrower.
     */
    const pointerProblems = (bodyText, moduleText) => {
        const problems = [];
        const required = h2Headings(moduleText).filter((h) => !narrowerSections(moduleText).has(h));
        for (const line of bodyText.split('\n')) {
            const link = line.match(/\]\((?:[./]*(?:skills\/magicspec\/)?(?:references\/)?)context\.md\)/);
            if (!link) continue;
            const listed = line.slice(link.index + link[0].length).match(/^\s*\(([^)]*)\)/);
            if (!listed) continue;
            const items = listed[1].split(',').map((s) => s.trim());
            for (const heading of required) {
                if (!items.some((item) => item === heading)) {
                    problems.push(
                        `pointer lists sections but omits "${heading}": ${line.trim().slice(0, 90)}`,
                    );
                }
            }
        }
        return problems;
    };

    // The engine bodies and shared modules of the skill folder, as repository-relative paths.
    const engineBodyPaths = (repoRoot) =>
        ['workflows', 'references'].flatMap((dir) =>
            fs
                .readdirSync(path.join(repoRoot, 'skills', 'magicspec', dir))
                .filter((f) => f.endsWith('.md'))
                .map((f) => path.join('skills', 'magicspec', dir, f)),
        );

    test('body navigation: every shipped body over 100 lines carries a contents list of its ## headings', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const bodies = engineBodyPaths(repoRoot);
        assert.ok(bodies.length >= 9, 'the engine bodies and shared modules must be found');

        let checked = 0;
        for (const rel of bodies) {
            const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
            if (countLines(text) > LONG_BODY_LINES) checked++;
            assert.deepStrictEqual(contentsProblems(text), [], rel);
        }
        assert.ok(
            checked >= 6,
            'at least the six long bodies must be subject to the contents-list rule',
        );
    });

    test('body navigation: the scans flag a body without a contents list, a list that omits a heading, a list out of order or past line 40, and a pointer that omits a section', () => {
        // A throwaway body of well over 100 lines with three sections, one of them
        // marked as another workflow's alone, and a fenced block holding a `##` line
        // that is not a section.
        const make = (contents, before = 0) => {
            const lines = ['# Title', '', 'Intro.', ''];
            for (let i = 0; i < before; i++) lines.push(`filler ${i}`);
            lines.push(...contents, '');
            for (const name of ['Alpha', 'Beta', 'Gamma']) {
                lines.push(`## ${name}`, '');
                for (let i = 0; i < 30; i++) lines.push(`${name} line ${i}`);
                if (name === 'Beta') lines.push('```', '## Not a section', '```');
            }
            return lines.join('\n') + '\n';
        };
        const full = ['**Contents:**', '', '- Alpha', '- Beta — `magic.spec` only', '- Gamma'];

        assert.ok(countLines(make(full)) > 100, 'the fixture must be over 100 lines');
        assert.deepStrictEqual(
            contentsProblems(make(full)),
            [],
            'a complete list passes, and a fenced `##` line is not a section',
        );
        assert.strictEqual(
            contentsProblems(make([])).length,
            3,
            'a body with no contents list is flagged for every heading',
        );
        assert.strictEqual(
            contentsProblems(make(['- Alpha', '- Gamma'])).length,
            1,
            'a list that omits one heading is flagged for exactly that heading',
        );
        assert.ok(
            contentsProblems(make(['- Beta', '- Alpha', '- Gamma'])).length >= 1,
            'a list out of file order is flagged',
        );
        assert.strictEqual(
            contentsProblems(make(full, 45)).length,
            3,
            'a list that starts past line 40 is not a contents list',
        );
        assert.deepStrictEqual(
            contentsProblems('# Short\n\n## One\n\nText.\n'),
            [],
            'a body of at most 100 lines needs no list',
        );

        // Pointers to the module that body describes.
        const moduleText = make(full);
        assert.deepStrictEqual(
            pointerProblems('1. Apply [context.md](context.md) as a whole.', moduleText),
            [],
        );
        assert.deepStrictEqual(
            pointerProblems('1. Apply [context.md](context.md) (Alpha, Gamma).', moduleText),
            [],
            'a list that carries every section not marked narrower passes',
        );
        assert.strictEqual(
            pointerProblems('1. Apply [context.md](context.md) (Alpha).', moduleText).length,
            1,
            'a list that omits one section is flagged for exactly that section',
        );
        assert.strictEqual(
            pointerProblems(
                '1. Apply [context.md](../../skills/magicspec/references/context.md) (Priority 1-4, Disambiguation).',
                moduleText,
            ).length,
            2,
            'a list of other names carries none of the sections',
        );
    });

    test('body navigation: every pointer to context.md applies the module as a whole', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const moduleText = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'references', 'context.md'), 'utf8');
        const sites = engineBodyPaths(repoRoot).filter((rel) => !rel.endsWith('context.md'));
        sites.push(path.join('skills', 'magicspec-dev', 'workflows', 'test.md'));

        let pointers = 0;
        for (const rel of sites) {
            const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
            pointers += text
                .split('\n')
                .filter((l) => /\]\((?:[./]*(?:skills\/magicspec\/)?(?:references\/)?)context\.md\)/.test(l)).length;
            assert.deepStrictEqual(pointerProblems(text, moduleText), [], rel);
        }
        assert.ok(
            pointers >= 10,
            `the shipped text points to context.md in at least ten places (found ${pointers})`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5i. magicspec-dev:test — the reader tier of the fresh literal reader.
    //     The reading test is only as strong as its reader: independence of
    //     context was already stated, capability was not. The workflow is
    //     instruction text with no script behind it, so the harness pins its
    //     shipped wording — in the workflow and in the skill generated from it.
    // ───────────────────────────────────────────────────────────────────────────
    test('simulation workflow: the fresh literal reader takes the lowest tier the host offers, reports the files it opened, and a lowest-tier-only divergence needs a second reader (reader tier)', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const workflow = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec-dev', 'workflows', 'test.md'),
            'utf8',
        );
        // The workflow is the one text now; the wrapper generated from it is gone.
        const skill = workflow;
        const rung = workflow.split('\n').find((line) => line.includes('*Reading test*'));
        assert.ok(rung, 'the adjudication ladder must carry the reading test');

        const statements = [
            'takes the lowest-capability tier it offers',
            'where the host exposes none, nothing more is required',
            'returns its predicted action with the engine files it opened and the line range it read of each',
            'is a **structure** finding',
            'a second fresh agent of the same tier reproduces it',
        ];
        for (const statement of statements) {
            assert.ok(rung.includes(statement), `the reading test must state: ${statement}`);
        }
        assert.ok(
            skill.includes('takes the lowest-capability tier it offers'),
            'the generated skill must carry the reader tier too',
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5j. Registry text contract and question routing.
    //     Both are instruction text with no script behind them, so the shipped
    //     prose is the implementation and can regress silently. The harness pins
    //     the concept each sentence carries, in every place it ships.
    // ───────────────────────────────────────────────────────────────────────────
    test('registry text contract: spec.md registers a Description with its form, changes it only when what or when changed, and the checklist names it', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const lines = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'spec.md'), 'utf8').split('\n');

        const register = lines.find((l) => l.includes('Register in `INDEX.md`'));
        assert.ok(register, 'the creation step must register the specification in the registry');
        assert.ok(
            register.includes('(Name, Status, Layer, Version, Description)'),
            'registration must list the Description among the fields it writes',
        );
        for (const statement of [
            'what the specification is for and when to open it',
            'at most two sentences',
            'a router, not an index of contents',
            'is answered by searching the specification text',
        ]) {
            assert.ok(
                register.includes(statement),
                `the registration step must state: ${statement}`,
            );
        }

        const sync = lines.find((l) =>
            l.includes('Update `Version`, `Status`, `Layer` in `INDEX.md`'),
        );
        assert.ok(sync, 'the Sync step must update the registry row');
        for (const statement of [
            'Change the `Description` only when',
            'rewrite the whole cell in the form above, never append to it',
            'byte-identical',
            "the amendment goes to the specification's `Document History`",
        ]) {
            assert.ok(sync.includes(statement), `the Sync step must state: ${statement}`);
        }

        const checklist = lines.find((l) => l.includes('Registry: INDEX.md updated'));
        assert.ok(
            checklist && checklist.includes('Description only if what or when changed'),
            'the checklist registry line must name the Description and its condition',
        );
    });

    test('registry text contract: task.md says the ledger overview describes the ledger and is not appended to', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const lines = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'task.md'), 'utf8').split('\n');
        const bullet = lines.find((l) => l.startsWith('- TASKS.md: master Phase Index'));
        assert.ok(bullet, 'Plan Write-back must describe TASKS.md');
        for (const statement of [
            'says what the file is and how to read it and tracks nothing',
            "the phase table's status column",
            'its phase file, the workspace changelog and the archive',
            'Nobody appends to the `Overview`',
        ]) {
            assert.ok(bullet.includes(statement), `the TASKS.md bullet must state: ${statement}`);
        }
    });

    test('registry text contract: each registry and ledger template carries its comment at the placeholder, outside any table', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const expected = [
            [
                'workspace-index.md',
                '<!-- Description: what the specification is for and when to open it',
            ],
            ['global-index.md', '<!-- Description: what the workspace is for and when to open it'],
            ['tasks.md', '<!-- Describes this file, not the plan'],
        ];
        for (const [file, comment] of expected) {
            const lines = fs
                .readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'templates', file), 'utf8')
                .split('\n');
            const at = lines.findIndex((l) => l.startsWith(comment));
            assert.ok(at >= 0, `${file} must carry the comment: ${comment}`);
            assert.ok(
                !lines[at - 1]?.startsWith('|') && !lines[at + 1]?.startsWith('|'),
                `${file}: the comment must stand outside any table row`,
            );
        }
    });

    test('question routing: skills/magicspec/AGENT-RULES.md sends a mechanic named in a question to the specification text and a structural one to the graph, in both copies', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const text = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'AGENT-RULES.md'), 'utf8');
        const start = text.indexOf('## 2. Specification Knowledge Graph');
        const end = text.indexOf('\n## 3.', start);
        assert.ok(start >= 0 && end > start, 'skills/magicspec/AGENT-RULES.md must carry the graph section');
        const bullets = text.slice(start, end).split('\n- ');

        const graphBullet = bullets.find((b) => b.includes('build-spec-graph'));
        assert.ok(graphBullet, 'a bullet must send structural questions to the graph');
        assert.ok(
            !graphBullet.includes('what covers Z'),
            'a question about what covers a mechanic must not be sent to the graph',
        );

        const contentBullet = bullets.find((b) => b.includes('hold no specification text'));
        assert.ok(
            contentBullet,
            'a bullet must say the graph and the wiki hold no specification text',
        );
        for (const statement of [
            'names a mechanic',
            '.magicspec/{workspace}/specifications/',
            'reading the matching section',
        ]) {
            assert.ok(
                contentBullet.replace(/\s+/g, ' ').includes(statement),
                `the routing bullet must state: ${statement}`,
            );
        }

        const twin = fs.readFileSync(path.join(repoRoot, '.agents', 'rules', 'magicspec.md'), 'utf8');
        assert.strictEqual(twin, text, 'the projection under .agents/rules must carry the same routing');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5k. Setting parity and the archival opt-out.
    //     A setting that a shipped file defines or names is a promise to whoever
    //     writes its value; a setting with no reader breaks it silently. The rule
    //     is decided here over a tree root, so one function judges both a
    //     throwaway fixture and the shipped tree.
    // ───────────────────────────────────────────────────────────────────────────
    const SETTING_FILE_EXTENSIONS = new Set([
        'md',
        'js',
        'json',
        'sh',
        'ps1',
        'yml',
        'yaml',
        'txt',
        'html',
        'css',
        'mjs',
        'cjs',
    ]);

    const listFilesUnder = (dir, accept) => {
        if (!fs.existsSync(dir)) return [];
        const found = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) found.push(...listFilesUnder(full, accept));
            else if (accept(full)) found.push(full);
        }
        return found;
    };

    // Splits JavaScript into the part that executes and the part that only says
    // things: comments are dropped, and the contents of string and template
    // literals are blanked, so a message that names a key cannot read as an
    // access to it. `withStrings` keeps the literals, so a bracket access by
    // name stays visible.
    const splitJavaScript = (source) => {
        let code = '';
        let withStrings = '';
        let i = 0;
        while (i < source.length) {
            const c = source[i];
            const next = source[i + 1];
            if (c === '/' && next === '/') {
                while (i < source.length && source[i] !== '\n') i++;
            } else if (c === '/' && next === '*') {
                const end = source.indexOf('*/', i + 2);
                i = end < 0 ? source.length : end + 2;
            } else if (c === '"' || c === "'" || c === '`') {
                let j = i + 1;
                while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
                const literal = source.slice(i, j + 1);
                withStrings += literal;
                code += c + ' '.repeat(Math.max(0, literal.length - 2)) + c;
                i = j + 1;
            } else {
                code += c;
                withStrings += c;
                i++;
            }
        }
        return { code, withStrings };
    };

    // The names a script reads off an object: `.name`, and `['name']`.
    const accessedNames = (source) => {
        const { code, withStrings } = splitJavaScript(source);
        const names = new Set();
        for (const m of code.matchAll(/\.\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
        for (const m of withStrings.matchAll(/\[\s*(['"])([^'"\\]+)\1\s*\]/g)) names.add(m[2]);
        return names;
    };

    // A reader is a script under `skills/magicspec/scripts/` that takes the section off the
    // parsed file and the key off the section — directly, or through a defaults
    // table merged over it. A comment, a string or a message that only names the
    // key is not a read, and a script anywhere else does not count.
    const settingReaders = (root) =>
        listFilesUnder(path.join(root, 'skills', 'magicspec', 'scripts'), (f) => f.endsWith('.js')).map((file) =>
            accessedNames(fs.readFileSync(file, 'utf8')),
        );

    const hasSettingReader = (key, readers) => {
        const segments = key.split('.');
        return readers.some((names) => segments.every((segment) => names.has(segment)));
    };

    // Every key of the workspace template outside the workspace registry.
    const templateSettings = (root) => {
        const rel = 'skills/magicspec/templates/workspace.json';
        const text = fs.readFileSync(path.join(root, rel), 'utf8');
        const lines = text.split('\n');
        const leaves = [];
        const walkValue = (value, parts) => {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                Object.keys(value).length > 0
            ) {
                for (const [k, v] of Object.entries(value)) walkValue(v, [...parts, k]);
            } else {
                leaves.push(parts);
            }
        };
        for (const [k, v] of Object.entries(JSON.parse(text))) {
            if (k === 'default' || k === 'workspaces') continue;
            walkValue(v, [k]);
        }
        return leaves.map((parts) => {
            const from = lines.findIndex((l) => l.includes(`"${parts[0]}"`));
            const at = lines.findIndex(
                (l, i) => i >= from && l.includes(`"${parts[parts.length - 1]}"`),
            );
            return { file: rel, line: at + 1, key: parts.join('.') };
        });
    };

    // Every dotted key path that a line of shipped text names together with
    // `workspace.json`. File names (`a.md`, `b.js`) are not paths.
    const textSettings = (root) => {
        const files = ['skills', 'magicspec', 'docs', 'workflows', 'rules'].flatMap((d) =>
            listFilesUnder(path.join(root, d), (f) => f.endsWith('.md')),
        );
        const readme = path.join(root, 'README.md');
        if (fs.existsSync(readme)) files.push(readme);
        const found = [];
        for (const file of files) {
            const rel = path.relative(root, file).split(path.sep).join('/');
            fs.readFileSync(file, 'utf8')
                .split('\n')
                .forEach((line, index) => {
                    if (!line.includes('workspace.json')) return;
                    const paths = line.matchAll(
                        /(?<![\w./-])([a-z][A-Za-z0-9]+(?:\.[a-zA-Z][A-Za-z0-9]+)+)(?![\w/-])/g,
                    );
                    for (const m of paths) {
                        if (SETTING_FILE_EXTENSIONS.has(m[1].split('.').pop())) continue;
                        found.push({ file: rel, line: index + 1, key: m[1] });
                    }
                });
        }
        return found;
    };

    const settingParityFindings = (root) => {
        const readers = settingReaders(root);
        return [...templateSettings(root), ...textSettings(root)].filter(
            (setting) => !hasSettingReader(setting.key, readers),
        );
    };

    const writeTreeFiles = (root, files) => {
        for (const [rel, content] of Object.entries(files)) {
            const full = path.join(root, rel);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content);
        }
    };

    const makeSettingTree = (files) => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-setting-'));
        writeTreeFiles(root, files);
        return root;
    };

    const describeFinding = (f) => `${f.file}:${f.line} → ${f.key}`;

    // A throwaway git project with one finished phase and one uncommitted change
    // to its workbook, so a `magic.run` finalize counts the change as significant.
    const makeArchivalProject = (archival, { done = true } = {}) => {
        const repoRoot = path.resolve(__dirname, '..');
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-archival-'));
        fs.cpSync(path.join(repoRoot, 'skills', 'magicspec'), path.join(dir, 'skills', 'magicspec'), { recursive: true });
        const ws = path.join(dir, '.magicspec', 'ws');
        fs.mkdirSync(path.join(ws, 'tasks'), { recursive: true });
        const config = { default: 'ws', workspaces: { ws: { description: 'fixture' } } };
        if (archival !== undefined) config.archival = archival;
        writeTreeFiles(dir, {
            '.gitignore': 'skills/magicspec/\n',
            '.magicspec/workspace.json': JSON.stringify(config, null, 2),
            '.magicspec/ws/INDEX.md': '# Index\n\n**Version:** 1.0.0\n',
            '.magicspec/ws/PLAN.md': '# Plan\n\n- Tasks: [tasks/phase-1.md](tasks/phase-1.md)\n',
            '.magicspec/ws/TASKS.md':
                '# Master Task Index\n\n| Phase | Description | Status |\n| --- | --- | --- |\n' +
                `| [Phase 1](tasks/phase-1.md) | Alpha | \`${done ? 'Done' : 'Todo'}\` |\n`,
            '.magicspec/ws/STATE.md':
                '# Project State\n\n**Workspace:** ws\n**Phase:** 1 — Alpha\n**Status:** Active\n\n' +
                '## Current Position\n\n- **Task:** none\n- **Next Action:** none\n\n' +
                '## Recent Decisions\n\n## Blockers\n\n## Blocking Constraints\n',
            '.magicspec/ws/tasks/phase-1.md':
                `---\nphase: 1\nname: "Alpha"\nstatus: ${done ? 'Done' : 'Todo'}\n---\n\n` +
                `## Atomic Checklist\n\n- [${done ? 'x' : ' '}] [T-1A01] Do it\n`,
        });
        const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
        git('init', '-b', 'master');
        git('config', 'user.email', 'test@example.com');
        git('config', 'user.name', 'Test User');
        git('add', '.');
        git('commit', '-m', 'init');
        fs.appendFileSync(path.join(ws, 'tasks', 'phase-1.md'), '\n<!-- touched -->\n');
        return { dir, ws };
    };

    const runEngine = (dir, ...args) =>
        spawnSync('node', ['skills/magicspec/scripts/executor.js', ...args], { cwd: dir, encoding: 'utf8' });

    test('archival opt-out: archival.enabled false keeps a finished phase in tasks/ and says so, while the version bump, the changelog entry and the state update still run', () => {
        const kept = makeArchivalProject({ enabled: false });
        const idle = makeArchivalProject({ enabled: false }, { done: false });
        try {
            const result = runEngine(kept.dir, 'finalize', '--workflow=run', '--workspace=ws');
            const out = result.stdout + result.stderr;
            assert.strictEqual(result.status, 0, out);
            assert.ok(
                fs.existsSync(path.join(kept.ws, 'tasks', 'phase-1.md')),
                'the workbook must stay in tasks/',
            );
            assert.ok(
                !fs.existsSync(path.join(kept.ws, 'archives', 'tasks', 'phase-1.md')),
                'nothing may be archived',
            );
            assert.ok(
                fs
                    .readFileSync(path.join(kept.ws, 'TASKS.md'), 'utf8')
                    .includes('(tasks/phase-1.md)'),
                'the TASKS.md link must stay',
            );
            assert.ok(
                fs
                    .readFileSync(path.join(kept.ws, 'PLAN.md'), 'utf8')
                    .includes('(tasks/phase-1.md)'),
                'the PLAN.md link must stay',
            );
            assert.ok(!out.includes('### Archived phases'), 'there is no archived-phases block');
            assert.strictEqual(
                out.split('\n').filter((l) => l.includes('archival.enabled')).length,
                1,
                'exactly one informational line names the setting',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(kept.dir, '.magicspec', '.version'), 'utf8').trim(),
                '0.1.1',
                'the version bump still runs',
            );
            assert.match(
                fs.readFileSync(path.join(kept.dir, 'CHANGELOG.md'), 'utf8'),
                /\[Unreleased\]/,
                'the changelog entry is still written',
            );
            assert.match(out, /STATE\.md \| updated/, 'the state update still runs');

            // Control: with no finished phase waiting, a skipped step is not announced.
            const quiet = runEngine(idle.dir, 'finalize', '--workflow=run', '--workspace=ws');
            assert.strictEqual(quiet.status, 0, quiet.stdout + quiet.stderr);
            assert.ok(
                !(quiet.stdout + quiet.stderr).includes('archival.enabled'),
                'nothing waiting means nothing to announce',
            );
        } finally {
            cleanup(kept.dir);
            cleanup(idle.dir);
        }
    });

    test('archival opt-out: archival stays on for an absent key, a section without the key, true, the string "false" and null, and the explicit archive-phases command archives with the key off', () => {
        const variants = [undefined, {}, { enabled: true }, { enabled: 'false' }, null];
        for (const archival of variants) {
            const project = makeArchivalProject(archival);
            try {
                const result = runEngine(
                    project.dir,
                    'finalize',
                    '--workflow=run',
                    '--workspace=ws',
                );
                const out = result.stdout + result.stderr;
                const label = JSON.stringify(archival) ?? 'absent';
                assert.strictEqual(result.status, 0, out);
                assert.ok(
                    fs.existsSync(path.join(project.ws, 'archives', 'tasks', 'phase-1.md')),
                    `archival must stay on for ${label}`,
                );
                assert.ok(
                    out.includes('### Archived phases'),
                    `the archived-phases block is printed for ${label}`,
                );
                assert.ok(!out.includes('archival.enabled'), `no opt-out line for ${label}`);
            } finally {
                cleanup(project.dir);
            }
        }

        const off = makeArchivalProject({ enabled: false });
        try {
            const preview = runEngine(off.dir, 'archive-phases', '--dry-run', '--workspace=ws');
            assert.strictEqual(preview.status, 0, preview.stdout + preview.stderr);
            assert.match(preview.stdout, /would archive/, 'the dry run previews as before');
            assert.ok(
                fs.existsSync(path.join(off.ws, 'tasks', 'phase-1.md')),
                'the dry run moves nothing',
            );

            const explicit = runEngine(off.dir, 'archive-phases', '--workspace=ws');
            assert.strictEqual(explicit.status, 0, explicit.stdout + explicit.stderr);
            assert.ok(
                fs.existsSync(path.join(off.ws, 'archives', 'tasks', 'phase-1.md')),
                "the explicit command is the user's own request and archives with the key off",
            );
        } finally {
            cleanup(off.dir);
        }
    });

    test('setting parity: a key read through its section (with or without a defaults table) has a reader; a key named only in a comment, a string or a message does not, nor one read outside skills/magicspec/scripts or one whose section is never read', () => {
        const root = makeSettingTree({
            'skills/magicspec/templates/workspace.json': JSON.stringify(
                {
                    default: 'main',
                    workspaces: { main: { description: 'x' } },
                    alpha: { on: true, level: 1 },
                    beta: { x: 1 },
                    gamma: { g: 1 },
                    epsilon: { enabled: true },
                },
                null,
                2,
            ),
            'skills/magicspec/scripts/reads.js':
                "'use strict';\n" +
                'const data = JSON.parse(text);\n' +
                'const defaults = { level: 1 };\n' +
                'const config = Object.assign({}, defaults, data.alpha || {});\n' +
                'if (data.alpha.on) use(config.level);\n' +
                '// data.beta.x is read somewhere else\n' +
                "const note = 'then read data.beta.x here';\n" +
                "console.log('data.beta.x is not read here');\n" +
                'if (other.enabled) use(1);\n',
            'scripts/elsewhere.js': 'const v = data.gamma.g;\n',
        });
        try {
            assert.deepStrictEqual(
                settingParityFindings(root)
                    .map((f) => f.key)
                    .sort(),
                ['beta.x', 'epsilon.enabled', 'gamma.g'],
                'the commented, quoted, out-of-tree and section-less keys are flagged, and the two read keys are not',
            );

            // A flagged key stops being flagged once a shipped script reads it.
            writeTreeFiles(root, { 'skills/magicspec/scripts/later.js': 'const v = data.beta.x;\n' });
            assert.deepStrictEqual(
                settingParityFindings(root)
                    .map((f) => f.key)
                    .sort(),
                ['epsilon.enabled', 'gamma.g'],
                'a shipped reader clears beta.x',
            );
        } finally {
            cleanup(root);
        }
    });

    test('setting parity: a dotted path that shipped text names with workspace.json needs a reader, reported with its file and line', () => {
        const root = makeSettingTree({
            'skills/magicspec/templates/workspace.json': JSON.stringify(
                { default: 'main', workspaces: { main: {} }, alpha: { on: true } },
                null,
                2,
            ),
            'skills/magicspec/scripts/reads.js': 'if (data.alpha.on) use(1);\n',
            'docs/page.md':
                'Set `alpha.on` to false in `.magicspec/workspace.json`.\n' +
                'Use `alpha.off` in `.magicspec/workspace.json`.\n' +
                'The executor.js script and `workspace.json` are unrelated to keys.\n' +
                'A key `ghost.setting` that no line ties to the file.\n',
            'README.md': 'Edit workspace.json and set `ghost.thing` there.\n',
        });
        try {
            assert.deepStrictEqual(
                settingParityFindings(root).map(describeFinding).sort(),
                ['README.md:1 → ghost.thing', 'docs/page.md:2 → alpha.off'],
                'a path with no reader is reported where it is named; file names and untied keys are not paths',
            );
        } finally {
            cleanup(root);
        }
    });

    test('setting parity: every setting of the shipped workspace.json template and every path the shipped text names with it has a reader (standing check)', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const findings = settingParityFindings(repoRoot);
        assert.deepStrictEqual(
            findings.map((f) => `PHANTOM_SETTING ${describeFinding(f)} has no reader`),
            [],
            'a setting a shipped file defines or names must be given its reader or removed in the change that finds it',
        );
        const known = templateSettings(repoRoot).map((s) => s.key);
        assert.ok(
            known.includes('archival.enabled') && known.includes('finalization.enabled'),
            'the check reads the shipped template (archival.enabled and finalization.enabled are in it)',
        );
    });

    test('shipped text: ventilation carries the setting-parity check and its checklist entry', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const lines = fs
            .readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'analyze.md'), 'utf8')
            .split('\n');

        const step = lines.find((l) => l.includes('**Setting Parity** (`PHANTOM_SETTING`)'));
        assert.ok(step, 'Mode C step 2 must carry the setting-parity check');
        for (const statement of [
            'PHANTOM_SETTING {file}:{line} → {key} has no reader',
            'a key of the `workspace.json` template outside the workspace registry',
            'this skill folder, `docs/`, `README.md`',
            'a script under `scripts/`',
            'only names the key is not a read',
            '(advisory, non-blocking)',
            'Environment variables and executor flags are outside this check',
        ]) {
            assert.ok(step.includes(statement), `the check must state: ${statement}`);
        }

        const checklistAt = lines.findIndex((l) => l.startsWith('Analysis Checklist — Mode C'));
        assert.ok(checklistAt >= 0, 'the Mode C checklist must exist');
        const entry = lines
            .slice(checklistAt)
            .find((l) => l.startsWith('  ☐ Setting Parity: PHANTOM_SETTING'));
        assert.ok(entry, 'the Mode C checklist must carry the setting-parity entry');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5l. Containment quoting boundary. The ventilation scan for SDD references is
    //     a cognitive grep whose rules are prose, so the prose is the
    //     implementation. A blanket "a quoted occurrence is a mention" ahead of the
    //     match classes hid 92 of 279 matches in measured consumer projects; the
    //     harness pins who the precondition covers and what a consumer's quoted
    //     occurrence becomes. The hook sentence is pinned beside it: the hook
    //     stays behind when the scaffold is deleted, so the text may not say it
    //     goes with it.
    // ───────────────────────────────────────────────────────────────────────────
    test("shipped text: the containment scan keeps the quoting precondition for the engine's own files only, and reports a code-quoted occurrence in a consumer's product markdown", () => {
        const repoRoot = path.resolve(__dirname, '..');
        const lines = fs
            .readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'analyze.md'), 'utf8')
            .split('\n');

        const bullet = lines.find((l) => l.includes('**Precondition (SH-1)'));
        assert.ok(bullet, 'step 6 must carry the quoting precondition');
        for (const statement of [
            "the engine's own authored files in this engine's own repository only",
            'In a consumer project the precondition does not apply',
            'an occurrence inside a code span or a fence in a markdown product file is **reported**',
            'in the contextual sub-list when the passage reads as an illustration of a forbidden form rather than a use of it',
            'A passage that stops making sense uses the reference; one that reads the same only shows what a leak looks like',
            'is never silently skipped',
            'When it is unclear which, report it',
        ]) {
            assert.ok(bullet.includes(statement), `the precondition must state: ${statement}`);
        }
        assert.ok(
            !bullet.includes('**Precondition (SH-1)**: in a markdown product file'),
            'the precondition must not be stated for every markdown product file',
        );

        // The bullet sits ahead of the match classes: whatever it says reaches them.
        const bulletAt = lines.indexOf(bullet);
        const classesAt = lines.findIndex((l) => l.includes('Match classes (unconditional)'));
        assert.ok(
            bulletAt >= 0 && classesAt > bulletAt,
            'the precondition precedes the match classes it qualifies',
        );
    });

    test('shipped text: the scaffold-removal exemption says the pre-commit hook disarms itself and never that it is removed with the scaffold, in step 6a and in the rules (both copies)', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const stepLine = fs
            .readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'analyze.md'), 'utf8')
            .split('\n')
            .find((l) => l.includes('**Exempt**: the git pre-commit hook'));
        assert.ok(stepLine, 'step 6a must exempt the hook');

        const rules = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'AGENT-RULES.md'), 'utf8');
        const start = rules.indexOf('**Exempt**: the git pre-commit hook');
        assert.ok(start >= 0, 'the rules must exempt the hook');
        const paragraph = rules.slice(start, rules.indexOf('\n\n', start)).replace(/\s+/g, ' ');

        for (const [where, text] of [
            ['step 6a', stepLine],
            ['skills/magicspec/AGENT-RULES.md', paragraph],
        ]) {
            assert.doesNotMatch(
                text,
                /removed with|goes away with/,
                `${where}: the hook does not go with the scaffold`,
            );
            assert.match(text, /it disarms itself/, `${where}: the hook disarms itself`);
            assert.match(
                text,
                /with the engine folder absent it says so once and lets the commit through/,
                `${where}: what disarming means`,
            );
            assert.match(
                text,
                /stays behind when the scaffold is deleted/,
                `${where}: why it must`,
            );
        }

        const twin = fs.readFileSync(path.join(repoRoot, '.agents', 'rules', 'magicspec.md'), 'utf8');
        assert.strictEqual(twin, rules, 'the projection under .agents/rules must carry the same text');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5m. check-bloat.js — the thresholds are advisory defaults a project may
    //     change in workspace.json, and specifications are scanned in every
    //     subdirectory of specifications/.
    // ───────────────────────────────────────────────────────────────────────────
    const makeBloatProject = (config, files) => {
        const tempDir = createTempWorkspace();
        const wsDir = path.join(tempDir, '.magicspec', 'ws');
        fs.mkdirSync(path.join(wsDir, 'specifications', 'sub'), { recursive: true });
        fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
        if (config !== null) {
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'workspace.json'),
                typeof config === 'string' ? config : JSON.stringify(config),
            );
        }
        for (const [rel, lines] of Object.entries(files)) {
            fs.writeFileSync(path.join(wsDir, rel), `${'line\n'.repeat(lines - 1)}line`);
        }
        return tempDir;
    };

    const bloatSignals = (tempDir) => {
        const result = spawnSync(
            'node',
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-bloat.js'), '--json'],
            {
                cwd: tempDir,
                encoding: 'utf8',
                env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/ws' },
            },
        );
        assert.strictEqual(result.status, 0, result.stdout + result.stderr);
        return JSON.parse(result.stdout).issues.map(
            (i) => `${i.type} ${i.file} ${i.lines}/${i.limit}`,
        );
    };

    test('check-bloat: the bloat override is honored for specifications and task files, an omitted key keeps its default, and a threshold of 0 turns off only its own tier', () => {
        const files = {
            'specifications/a.md': 25,
            'specifications/b.md': 45,
            'tasks/phase-1.md': 260,
            'tasks/phase-2.md': 60,
            'tasks/phase-3.md': 120,
        };
        const dirs = [];
        const signalsFor = (config) => {
            const dir = makeBloatProject(config, files);
            dirs.push(dir);
            return bloatSignals(dir);
        };
        try {
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 20, hard: 40 } } }),
                [
                    'SPEC_BLOAT specifications/a.md 25/20',
                    'SPEC_DECOMPOSE specifications/b.md 45/40',
                    'TASK_BLOAT tasks/phase-1.md 260/250',
                ],
                'the spec override applies; the task thresholds keep 250/400 because their keys are omitted',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { task: { soft: 50, hard: 100 } } }),
                [
                    'TASK_DECOMPOSE tasks/phase-1.md 260/100',
                    'TASK_BLOAT tasks/phase-2.md 60/50',
                    'TASK_DECOMPOSE tasks/phase-3.md 120/100',
                ],
                'the task override applies to task files',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 0, hard: 40 } } }),
                ['SPEC_DECOMPOSE specifications/b.md 45/40', 'TASK_BLOAT tasks/phase-1.md 260/250'],
                'a soft threshold of 0 turns off the soft signal and leaves the hard one',
            );
            assert.deepStrictEqual(
                signalsFor({ bloat: { spec: { soft: 20, hard: 0 } } }),
                [
                    'SPEC_BLOAT specifications/a.md 25/20',
                    'SPEC_BLOAT specifications/b.md 45/20',
                    'TASK_BLOAT tasks/phase-1.md 260/250',
                ],
                'a hard threshold of 0 turns off the hard signal and leaves the soft one',
            );

            // Control: with no override the defaults decide, so the override is read and not merely tolerated.
            assert.deepStrictEqual(
                signalsFor({ finalization: { enabled: true } }),
                ['TASK_BLOAT tasks/phase-1.md 260/250'],
                'no bloat section: the defaults 300/500 and 250/400 apply',
            );
        } finally {
            dirs.forEach(cleanup);
        }
    });

    test('check-bloat: a specification in a subdirectory of specifications/ is scanned, and a missing, unparsable or non-numeric configuration leaves the default thresholds', () => {
        const files = {
            'specifications/exactly-300.md': 300,
            'specifications/over.md': 301,
            'specifications/sub/deep.md': 501,
            'tasks/phase-1.md': 250,
            'tasks/phase-2.md': 251,
        };
        const expected = [
            'SPEC_BLOAT specifications/over.md 301/300',
            'SPEC_DECOMPOSE specifications/sub/deep.md 501/500',
            'TASK_BLOAT tasks/phase-2.md 251/250',
        ];
        const dirs = [];
        try {
            for (const config of [
                null,
                '{ not json',
                { bloat: { spec: { soft: 'ten', hard: -5 }, task: null } },
            ]) {
                const dir = makeBloatProject(config, files);
                dirs.push(dir);
                assert.deepStrictEqual(
                    bloatSignals(dir),
                    expected,
                    `defaults stand for ${typeof config === 'string' ? 'an unparsable file' : config === null ? 'no file' : 'non-numeric values'}; a file at the threshold is not flagged, a nested specification is`,
                );
            }
        } finally {
            dirs.forEach(cleanup);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6. check-prerequisites.js
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js should validate whole structure', () => {
        const tempDir = createTempWorkspace(true);
        try {
            // 1. Initial State - Success
            fs.mkdirSync(path.join(tempDir, '.magicspec'));
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules');

            // Need checksums to pass integrity check (developer-only manifest builder in scripts/)
            generateChecksums(tempDir);

            const result = runCheckPrerequisites(tempDir);
            assert.strictEqual(
                result.ok,
                true,
                'Should pass with all files present and correct checksums',
            );

            // 2. Failure Case - Missing file
            fs.unlinkSync(path.join(tempDir, '.magicspec', 'INDEX.md'));
            const resultFail = runCheckPrerequisites(tempDir);
            assert.strictEqual(resultFail.ok, false, 'Should fail if INDEX.md is missing');
            assert.ok(resultFail.missing_required.includes('INDEX.md'));

            // 3. Drift Case
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Index Restored');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Modified Rules');
            execSync('git add . && git commit -m "Fixed"', { cwd: tempDir, stdio: 'ignore' });

            // Manual edit outside workflow
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Drifted Rules');
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
    // 6b-quater. check-prerequisites.js — a stale-plan remedy names the workspace
    //            it reported on, and the audit command has one spelling
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js names the reported workspace in a stale-plan remedy and spells audit one way', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeRegistryScanWorkspace(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            // The plan omits the registered spec (orphaned) and names one the
            // registry lacks (mismatch), so both remedies are emitted.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- unquoted mention: specifications/ghost.md in prose\n',
            );

            // A second workspace directory holding the same registry.
            const wsDir = path.join(designDir, 'docs');
            fs.mkdirSync(wsDir, { recursive: true });
            fs.cpSync(specsDir, path.join(wsDir, 'specifications'), { recursive: true });
            for (const f of ['INDEX.md', 'RULES.md', 'PLAN.md']) {
                fs.copyFileSync(path.join(designDir, f), path.join(wsDir, f));
            }
            generateChecksums(tempDir);

            const remedies = (result, type) =>
                result.warnings.filter((w) => w.type === type).map((w) => w.fix);

            // Flat legacy layout: there is no workspace to name.
            const flat = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                remedies(flat, 'ORPHANED_SPEC'),
                ['/magicspec:task update'],
                'the flat layout invents no workspace',
            );
            assert.deepStrictEqual(
                remedies(flat, 'REGISTRY_MISMATCH'),
                ['/magicspec:spec audit'],
                'the audit command is spelled the way the workflows spell it',
            );

            // Workspace layout: the remedy re-plans the workspace it reported on.
            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-prerequisites.js');
            const scoped = JSON.parse(
                execSync(`node "${scriptPath}" --json --require-specs`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/docs' },
                }),
            );
            assert.deepStrictEqual(
                remedies(scoped, 'ORPHANED_SPEC'),
                ['/magicspec:task docs update'],
                'a remedy without the workspace would re-plan the default workspace instead',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-quinquies. check-prerequisites.js — the registry-vs-disk scan needs only
    //               INDEX.md, never a plan (T240)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js reports GHOST_REGISTRY and NAMING_VIOLATION before any PLAN.md exists (T240)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { designDir } = makeRegistryScanWorkspace(tempDir);
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                    '| [l1-missing.md](specifications/l1-missing.md) | y | Stable | 1 | 1.0.0 |',
                    '| [legacy.md](specifications/legacy.md) | z | Stable | 1 | 1.0.0 |',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            generateChecksums(tempDir);

            const named = (result, type) =>
                result.warnings
                    .filter((w) => w.type === type)
                    .map((w) => w.message.match(/^'([^']+)'/)[1])
                    .sort();

            // No plan yet: the state between the first spec and the first /magicspec:task.
            const noPlan = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                named(noPlan, 'GHOST_REGISTRY'),
                ['l1-missing.md', 'legacy.md'],
                'a registered spec that is missing from disk must be reported with no plan present',
            );
            assert.deepStrictEqual(
                named(noPlan, 'NAMING_VIOLATION'),
                ['legacy.md'],
                'the Layer Prefix rule needs no plan either',
            );
            assert.strictEqual(noPlan.ok, false, 'GHOST_REGISTRY is an integrity failure');
            for (const planOnly of [
                'ORPHANED_SPEC',
                'REGISTRY_MISMATCH',
                'SYNC_GAP',
                'RULE_57_VIOLATION',
            ]) {
                assert.deepStrictEqual(
                    named(noPlan, planOnly),
                    [],
                    `${planOnly} compares against the plan, so it cannot fire without one`,
                );
            }

            // Control: a plan changes nothing about what the registry-vs-disk scan reports.
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                '# Plan\n- [x] real spec ([l1-real.md](specifications/l1-real.md))\n',
            );
            const withPlan = runCheckPrerequisites(tempDir, '--require-specs');
            assert.deepStrictEqual(
                named(withPlan, 'GHOST_REGISTRY'),
                named(noPlan, 'GHOST_REGISTRY'),
            );
            assert.deepStrictEqual(
                named(withPlan, 'NAMING_VIOLATION'),
                named(noPlan, 'NAMING_VIOLATION'),
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 6b-sexies. check-prerequisites.js — CONFIG_DRIFT watches the global RULES.md
    //            beside a workspace RULES.md (T243)
    // ───────────────────────────────────────────────────────────────────────────
    test('check-prerequisites.js watches the global RULES.md beside a workspace RULES.md (T243)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const designDir = path.join(tempDir, '.magicspec');
            const wsDir = path.join(designDir, 'docs');
            fs.mkdirSync(wsDir, { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(path.join(wsDir, 'INDEX.md'), '# Index');
            fs.writeFileSync(path.join(wsDir, 'RULES.md'), '# Workspace Rules');
            generateChecksums(tempDir);
            execSync('git add -A && git commit -m "baseline"', { cwd: tempDir, stdio: 'ignore' });

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-prerequisites.js');
            const drifted = () =>
                JSON.parse(
                    execSync(`node "${scriptPath}" --json`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                        env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/docs' },
                    }),
                )
                    .warnings.filter((w) => w.type === 'CONFIG_DRIFT')
                    .map((w) => w.message.match(/^'([^']+)'/)[1])
                    .sort();

            assert.deepStrictEqual(drifted(), [], 'a committed tree has no drift');

            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules (edited by hand)');
            assert.deepStrictEqual(
                drifted(),
                ['.magicspec/RULES.md'],
                'the global constitution is monitored even when a workspace RULES.md exists',
            );

            fs.writeFileSync(path.join(wsDir, 'RULES.md'), '# Workspace Rules (edited by hand)');
            assert.deepStrictEqual(drifted(), ['.magicspec/RULES.md', '.magicspec/docs/RULES.md']);

            execSync('git checkout -- .magicspec/RULES.md', { cwd: tempDir, stdio: 'ignore' });
            assert.deepStrictEqual(
                drifted(),
                ['.magicspec/docs/RULES.md'],
                'the workspace RULES.md stays monitored on its own',
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
                '*None — plan complete. New scope enters via `/magicspec:task`.*',
            );
            assert.ok(hit, 'a plan-complete state with a non-empty Backlog must raise the signal');
            assert.match(
                hit.message,
                /2 open item/,
                'the count must reflect the actual number of Backlog bullets',
            );
            assert.match(hit.fix, /magicspec:spec/, 'the remedy must point at spec authoring');

            // Negative (load-bearing — SC-2.4 is about *distinguishing* two
            // plan-complete states, so a signal that also fires here would be
            // indistinguishable from one that works): same plan-complete
            // state, empty Backlog.
            assert.strictEqual(
                findDebtWarning('', '*None — plan complete. New scope enters via `/magicspec:task`.*'),
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
                '# Tasks\n\n## Active Phases\n\n*None — plan complete. New scope enters via `/magicspec:task`.*\n',
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
            const { stripQuoted } = requireFromFixture(tempDir, 'lib', 'scan-hygiene.js');

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
            const { stripQuoted } = requireFromFixture(tempDir, 'lib', 'scan-hygiene.js');

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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-state.js');

            // 1. Bootstrap — STATE.md should be created from template
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --status=Active --phase=1 --next-action="Run /magicspec:spec"`,
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
            assert.ok(
                /\[C-001\].*No Mocks.*Integration tests only/.test(afterConstraint),
                'Constraint entry should be auto-numbered starting at C-001 on a fresh template',
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
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-001\] \*\*No Mocks\*\*: Integration tests only/,
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
                /Agent MUST explicitly acknowledge each constraint before working\. -->\r?\n\r?\n- \[C-002\] \*\*No Sleep Loops\*\*: Use condition polling\r?\n- \[C-001\] \*\*No Mocks\*\*: Integration tests only/,
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

            // (a) Legacy inline format: open task in TASKS.md → /magicspec:run.
            fs.writeFileSync(tasksPath, '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n');
            let next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magicspec:run engine/, 'inline open task → /magicspec:run');
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
                /\/magicspec:run engine/,
                'canonical two-level: open task in phase file → /magicspec:run',
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
            assert.match(next, /\/magicspec:run/, 'registry fallback recommends /magicspec:run');

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
                /\/magicspec:task engine/,
                'plan complete after task → /magicspec:task funnel (§5)',
            );
            assert.doesNotMatch(
                next,
                /\/magicspec:spec/,
                '/magicspec:spec must never be named proactively (§5)',
            );
            assert.doesNotMatch(
                next,
                /execute the active phase/,
                'must not recommend a non-existent phase (the R6 bug)',
            );

            // (d2) Same plan-complete state reached via `run`. The recommendation
            //     is deliberately identical to (d): STATE.md `Next Action` is
            //     workflow-agnostic at read time (/magicspec:status replays it
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
                /\/magicspec:task/,
                'spec → /magicspec:task',
            );
            assert.match(
                finalize.computeNextAction('rule', 'engine', wsDir),
                /\/magicspec:task/,
                'rule → /magicspec:task',
            );

            // (f) Unreadable TASKS.md → safe planning fallback.
            const voidWs = path.join(tempDir, '.magicspec', 'void');
            assert.match(
                finalize.computeNextAction('run', 'void', voidWs),
                /\/magicspec:task/,
                'missing TASKS.md → /magicspec:task fallback',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // A complete plan with nothing waiting must say so and name no command; any
    // pending signal — or any inability to tell — keeps the /magicspec:task funnel.
    // The fixtures carry INDEX/PLAN/TASKS: the plan-complete fixture above has
    // no PLAN, so it resolves to the funnel through the cannot-evaluate path.
    test('finalize.js plan-complete Next Action names no command only when nothing is pending', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir } = requireFinalizeWorkspace(tempDir);
            const pendingWork = requireFromFixture(tempDir, 'lib', 'pending-work.js');
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const FUNNEL = /Plan complete — run \/magicspec:task engine to plan new scope/;
            const NOTHING = 'Plan complete — nothing pending';
            const indexPath = path.join(wsDir, 'INDEX.md');
            const planPath = path.join(wsDir, 'PLAN.md');
            const tasksPath = path.join(wsDir, 'TASKS.md');

            const write = ({
                registered = ['l1-a.md'],
                planned = ['l1-a.md'],
                basedOn = '1.0.0',
                backlog = '*None.*',
            } = {}) => {
                fs.rmSync(planPath, { recursive: true, force: true });
                fs.writeFileSync(
                    indexPath,
                    [
                        '# Index',
                        '',
                        '**Version:** 1.0.0',
                        '',
                        ...registered.map(
                            (f) => `| [${f}](specifications/${f}) | d | Stable | 1 | 1.0.0 |`,
                        ),
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(
                    planPath,
                    [
                        '# Plan',
                        '',
                        `**Based on:** .magicspec/engine/INDEX.md v${basedOn}`,
                        '',
                        ...planned.map((f) => `- [x] A ([${f}](specifications/${f}))`),
                        '',
                        '## Backlog',
                        '',
                        backlog,
                        '',
                    ].join('\n'),
                );
                fs.writeFileSync(tasksPath, '## Active Phases\n\n*None — plan complete.*\n');
            };

            // (1) In sync, empty Backlog → the fact, and no command at all.
            write();
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.strictEqual(next, NOTHING, 'nothing pending → a command-free statement');
            assert.doesNotMatch(next, /\/magicspec:/, 'the statement must name no /magicspec:* command');

            // (2) An open, unparked Backlog bullet → the funnel.
            write({ backlog: '- **Design item** that needs a spec pass.' });
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, FUNNEL, 'an open Backlog item is pending work → funnel');

            // (3) Control: the same bullet with the trailing Parked marker is not pending.
            write({
                backlog:
                    '- **Design item** that needs a spec pass. *(Parked — waiting on evidence)*',
            });
            assert.strictEqual(
                finalize.computeNextAction('run', 'engine', wsDir),
                NOTHING,
                'a Parked bullet is deliberately not open work',
            );

            // (4) A registered spec the plan never mentions → funnel.
            write({ registered: ['l1-a.md', 'l1-b.md'] });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'an orphaned spec is pending work → funnel',
            );

            // (5) A plan built on an older registry version → funnel.
            write({ basedOn: '0.9.0' });
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'a registry ahead of the plan is pending work → funnel',
            );

            // (6) Cannot tell (PLAN.md is a directory) → funnel, and it is recorded.
            write();
            fs.rmSync(planPath, { force: true });
            fs.mkdirSync(planPath);
            diagnostics.drain();
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                FUNNEL,
                'an unreadable plan is not evidence that nothing is pending',
            );
            assert.ok(
                diagnostics.read().some((f) => f.code === 'PENDING_WORK_UNEVALUABLE'),
                'the fall-back to the funnel must be visible as a recorded finding',
            );

            // (7) The predicate itself, so the two callers cannot disagree.
            write({ registered: ['l1-a.md', 'l1-b.md'], basedOn: '0.9.0', backlog: '- open item' });
            const found = pendingWork.findPendingWork(wsDir);
            assert.deepStrictEqual(found.orphanedSpecs, ['l1-b.md'], 'the unplanned spec is named');
            assert.deepStrictEqual(
                found.syncGap,
                { planBasedOn: '0.9.0', indexVersion: '1.0.0' },
                'the version gap is reported with both sides',
            );
            assert.strictEqual(found.planComplete, true, 'the marker reads as a complete plan');
            assert.deepStrictEqual(
                found.openBacklogItems,
                ['- open item'],
                'the open bullet is listed',
            );
            assert.ok(found.registryEvaluated && found.backlogEvaluated, 'both checks ran');

            fs.rmSync(planPath, { force: true });
            const missing = pendingWork.findPendingWork(wsDir);
            assert.strictEqual(
                missing.registryEvaluated,
                false,
                'no plan → registry check did not run',
            );
            assert.strictEqual(
                missing.backlogEvaluated,
                false,
                'no plan → backlog check did not run',
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
            // `task` branch emitting /magicspec:spec, so this sweeps the full matrix
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
                        /\/magicspec:(spec|analyze)/,
                        `${workflow} @ ${label}: reserved command leaked into Next Action → "${next}"`,
                    );
                    // §5 / DA-6: the user sees exactly ONE next step. STATE.md
                    // `Next Action` is replayed verbatim by /magicspec:status, so a
                    // second command here becomes a second user-visible option.
                    const commands = next.match(/\/magicspec:[a-z]+/g) || [];
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
                path.join(tempDir, '.magicspec', 'void'),
            );
            assert.doesNotMatch(
                voidNext,
                /\/magicspec:(spec|analyze)/,
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
                /\/magicspec:task main/,
                'SC-2.1 e2e: plan-complete next-action routes through the /magicspec:task funnel',
            );
            assert.doesNotMatch(
                state,
                /Next Action:.*\/magicspec:spec/,
                '§5: the persisted Next Action never names /magicspec:spec',
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
            const designAbs = path.join(tempDir, '.magicspec');
            const savedDesignDir = process.env.MAGIC_DESIGN_DIR;
            const savedWorkspaceEnv = process.env.MAGIC_WORKSPACE;
            try {
                // A stale MAGIC_DESIGN_DIR naming a different workspace must never
                // win over an explicit --workspace flag.
                process.env.MAGIC_DESIGN_DIR = '.magicspec/other';
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
                process.env.MAGIC_DESIGN_DIR = '.magicspec/engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.resolve(tempDir, '.magicspec/engine'),
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
                env: { ...process.env, MAGIC_DESIGN_DIR: '.magicspec/other' },
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
                /\.magicspec[\\/]main[\\/]STATE\.md/,
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
                    /\/magicspec:(spec|analyze)/,
                    `${label}: §5 reserved command leaked`,
                );
                assert.strictEqual(
                    (next.match(/\/magicspec:[a-z]+/g) || []).length,
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
            assert.doesNotMatch(next, /\/magicspec:(spec|analyze)/, 'reserved command must not leak');
            assert.strictEqual(
                (next.match(/\/magicspec:[a-z]+/g) || []).length,
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

    test('finalize.js reads a "- [!]" checklist line as an unfinished, blocked task, never as a finished phase (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, status) =>
                [
                    `### [${id}] Task ${id}`,
                    '',
                    `- **Status:** ${status}`,
                    '- **Assignment:** Agent',
                    '',
                ].join('\n');
            const phaseFile = (items, tracking) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    ...items,
                    '',
                    '## Detailed Tracking',
                    '',
                    ...tracking,
                ].join('\n');
            const phasePath = path.join(tasksDir, 'phase-1.md');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) the reported shape: every open task written `- [!]`, each
            // tracking entry `Status: Blocked`. Neither glyph was a task to the
            // old reader, so the phase read as finished and the registry row
            // alone produced "Continue Phase 1 via /magicspec:run".
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [!] [T-1A01] First task', '- [!] [T-1A02] Second task'],
                    [trackingBlock('T-1A01', 'Blocked'), trackingBlock('T-1A02', 'Blocked')],
                ),
            );
            const plan = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: plan.kind, id: plan.id },
                { kind: 'all-excluded', id: 'T-1A01' },
                'a phase holding only "- [!]" tasks has open work, none of it executable',
            );
            const next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(next, /^Continue Phase/, `registry fallback leaked → "${next}"`);
            assert.doesNotMatch(next, /^Execute T-/, `blocked task offered → "${next}"`);
            assert.doesNotMatch(next, /Plan complete/, `tasks remain → "${next}"`);
            assert.match(next, /T-1A01/, 'the terminal message should still name a task');
            assert.strictEqual(
                (next.match(/\/magicspec:[a-z]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.strictEqual(
                finalize.reconcileStatus(plan, 'Active'),
                'Blocked',
                'the checkpoint Status must agree with the Next Action it was derived with',
            );

            // (ii) the glyph alone is the declaration: a tracking entry that
            // still says Todo does not turn a `- [!]` line back into work.
            fs.writeFileSync(
                phasePath,
                phaseFile(['- [!] [T-1A01] First task'], [trackingBlock('T-1A01', 'Todo')]),
            );
            assert.strictEqual(finalize.classifyPlanState(wsDir).kind, 'all-excluded');

            // (iii) a blocked line is skipped, not fatal: the next open line in
            // the same phase is named.
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [!] [T-1A01] First task', '- [ ] [T-1A02] Second task'],
                    [trackingBlock('T-1A01', 'Blocked'), trackingBlock('T-1A02', 'Todo')],
                ),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A02/,
                'an open task behind a blocked one must still dispatch',
            );

            // (iv) ...and so is a later phase file's task.
            fs.writeFileSync(
                phasePath,
                phaseFile(['- [!] [T-1A01] First task'], [trackingBlock('T-1A01', 'Blocked')]),
            );
            fs.writeFileSync(
                path.join(tasksDir, 'phase-2.md'),
                phaseFile(['- [ ] [T-2A01] Later task'], [trackingBlock('T-2A01', 'Todo')]),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-2A01/,
                'an actionable task in a later phase file must still dispatch',
            );
            fs.rmSync(path.join(tasksDir, 'phase-2.md'));

            // (v) negative control: a `- [!]` quoted in a code span is prose,
            // not a task (SH-1) — a finished plan stays finished.
            fs.writeFileSync(tasksPath, registryTable('Done'));
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    ['- [x] [T-1A01] First task'],
                    [
                        '### [T-1A01] Task T-1A01',
                        '',
                        '- **Status:** Done',
                        '- **Notes:** a blocked line reads `- [!] [T-1A09] quoted` here.',
                        '',
                    ],
                ),
            );
            assert.strictEqual(
                finalize.classifyPlanState(wsDir).kind,
                'complete',
                'a quoted "- [!]" must not be read as a task in force',
            );

            // (vi) legacy inline layout: the same two outcomes without a phase file.
            fs.rmSync(phasePath);
            fs.writeFileSync(tasksPath, '# Tasks\n\n- [!] [T-1A01] Only task\n');
            const inlineBlocked = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: inlineBlocked.kind, id: inlineBlocked.id },
                { kind: 'all-excluded', id: 'T-1A01' },
                'an inline "- [!]" must not be recommended as executable',
            );
            fs.writeFileSync(
                tasksPath,
                '# Tasks\n\n- [!] [T-1A01] Blocked one\n- [ ] [T-1A02] Open one\n',
            );
            const inlineOpen = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                { kind: inlineOpen.kind, id: inlineOpen.id },
                { kind: 'inline-open', id: 'T-1A02' },
                'an inline open task behind a blocked one must still dispatch',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a "- [!]" checklist line holds its phase back from archival and stays in the progress total (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Done by frontmatter, but one task is unresolved → stays in tasks/.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-30.md'),
                '---\nphase: 30\nname: "Held"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-30A01] Done\n- [!] [T-30A02] Blocked\n',
            );
            // Negative control: the same glyph quoted in a code span is prose.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-31.md'),
                '---\nphase: 31\nname: "Quoting"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-31A01] Done\n\n' +
                    '## Detailed Tracking\n\n### [T-31A01]\n- **Notes:** blocked reads `- [!]` here.\n',
            );
            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                !candidates.includes('phase-30.md'),
                'a phase with a "- [!]" task is unfinished and must not be archived',
            );
            assert.ok(
                candidates.includes('phase-31.md'),
                'a quoted "- [!]" must not block archival',
            );

            // Progress: one done, one blocked, one open → 1 of 3, not 1 of 1.
            const { updateState, wsDir: stateDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(stateDir, 'TASKS.md'),
                [
                    '### Phase 1 Checklist',
                    '',
                    '- [x] [T-1A01] Done',
                    '- [!] [T-1A02] Blocked',
                    '- [ ] [T-1A03] Open',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(
                path.join(stateDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 1: [0/0] ░░░░░░░░ 0%',
                    '```',
                    '',
                ].join('\n'),
            );
            assert.match(
                autoProgressState(updateState, stateDir),
                /Phase 1: \[1\/3\]/,
                'a blocked task is unfinished work and belongs in the total',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reconciles Status between Active and Blocked at the checkpoint, and only there (SC-1.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const { updateState } = requireFromFixture(tempDir, 'update-state.js');
            const statePath = path.join(wsDir, 'STATE.md');

            const setStatus = (value) => {
                if (!fs.existsSync(statePath)) updateState(wsDir, {});
                const text = fs.readFileSync(statePath, 'utf8');
                fs.writeFileSync(
                    statePath,
                    text.replace(/^\*\*Status:\*\* .*/m, `**Status:** ${value}`),
                );
            };
            const readStatus = () =>
                fs
                    .readFileSync(statePath, 'utf8')
                    .match(/^\*\*Status:\*\* (.+)$/m)[1]
                    .trim();
            const checkpoint = () =>
                finalize.updateSessionState({ workflow: 'run', dryRun: false }, 'engine', wsDir);

            const phaseFile = (phaseStatus, trackStatus, trackAssignment) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${phaseStatus}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                    '## Detailed Tracking',
                    '',
                    '### [T-1A01] Scaffold the app',
                    '',
                    `- **Status:** ${trackStatus}`,
                    `- **Assignment:** ${trackAssignment}`,
                    '',
                ].join('\n');
            const writeLedger = (registryStatus, phase) => {
                fs.writeFileSync(tasksPath, registryTable(registryStatus));
                const phasePath = path.join(tasksDir, 'phase-1.md');
                if (phase) fs.writeFileSync(phasePath, phaseFile(...phase));
                else fs.rmSync(phasePath, { force: true });
            };

            // ledger → [start value → value after the checkpoint]. `Paused` is a
            // hand-set value outside the engine's two, so it must survive every
            // ledger state; that column is the (e) control of the reconciliation.
            const ledgers = {
                'open agent task in a healthy phase (a)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Todo', 'Agent']),
                    expect: { Active: 'Active', Blocked: 'Active', Paused: 'Paused' },
                },
                'Blocked phase with an open task (b)': {
                    build: () => writeLedger('In Progress', ['Blocked', 'Todo', 'Agent']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'every open item Blocked (c)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Blocked', 'Agent']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'every open item assigned to the user (c)': {
                    build: () => writeLedger('In Progress', ['In Progress', 'Todo', 'User']),
                    expect: { Active: 'Blocked', Blocked: 'Blocked', Paused: 'Paused' },
                },
                'plan complete (d)': {
                    build: () => writeLedger('Done', null),
                    expect: { Active: 'Active', Blocked: 'Active', Paused: 'Paused' },
                },
                'registry row not Done, no workbook to read': {
                    build: () => writeLedger('In Progress', null),
                    expect: { Active: 'Active', Blocked: 'Blocked', Paused: 'Paused' },
                },
            };

            for (const [label, ledger] of Object.entries(ledgers)) {
                for (const [start, want] of Object.entries(ledger.expect)) {
                    ledger.build();
                    setStatus(start);
                    const result = checkpoint();
                    assert.strictEqual(result.updated, true, `${label}: the checkpoint wrote`);
                    assert.strictEqual(
                        readStatus(),
                        want,
                        `${label}: Status ${start} should read ${want} after the checkpoint`,
                    );
                }
            }

            // One read, two derivations: the two fields cannot describe different plans.
            ledgers['Blocked phase with an open task (b)'].build();
            setStatus('Active');
            checkpoint();
            assert.match(
                fs.readFileSync(statePath, 'utf8'),
                /Next Action:\*\* Resolve blocker on T-1A01/,
            );
            assert.strictEqual(readStatus(), 'Blocked', 'Status and Next Action agree');

            // A preview reports the decision but writes nothing.
            setStatus('Active');
            const before = fs.readFileSync(statePath, 'utf8');
            const originalLog = console.log;
            const logged = [];
            console.log = (...args) => logged.push(args.join(' '));
            try {
                finalize.updateSessionState({ workflow: 'run', dryRun: true }, 'engine', wsDir);
            } finally {
                console.log = originalLog;
            }
            assert.strictEqual(fs.readFileSync(statePath, 'utf8'), before, 'dry-run wrote nothing');
            assert.match(logged.join('\n'), /Status=Blocked/, 'dry-run names the decision');

            // (f) The per-task call is not the reconciliation point: a task
            // transition with no --status leaves a stale Blocked alone.
            ledgers['open agent task in a healthy phase (a)'].build();
            setStatus('Blocked');
            updateState(wsDir, { task: 'T-1A01 Scaffold the app', nextAction: 'Continue' });
            assert.strictEqual(
                readStatus(),
                'Blocked',
                'a per-task update must never write Status (SC-1.1)',
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
                    '- [ ] [T-1A01] New `scripts/sync-engine-snapshot.js` (L2 snapshot writer)',
                    '',
                ].join('\n'),
            );
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /`scripts\/sync-engine-snapshot\.js`/,
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

    test('mutation-check.js reports CAUGHT, SURVIVED and REFUSED correctly and always restores the mutated file (mutation-control driver)', () => {
        const crypto = require('crypto');
        const digest = (file) =>
            crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        const driverPath = path.join(__dirname, '..', 'scripts', 'mutation-check.js');
        const driver = require(driverPath);

        const tempDir = createTempWorkspace();
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-outside-'));
        try {
            // Files a mutation must never touch, present so that only the guard refuses them.
            const outsideFile = path.join(outsideDir, 'elsewhere.js');
            fs.writeFileSync(outsideFile, 'a');
            const specFile = path.join(tempDir, '.magicspec', 'engine', 'specifications', 'l1-x.md');
            fs.mkdirSync(path.dirname(specFile), { recursive: true });
            fs.writeFileSync(specFile, 'a');

            // A throwaway project: one source file and one tiny node:test file
            // that guards its value and nothing else.
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            const source = path.join(tempDir, 'src', 'target.js');
            fs.writeFileSync(
                source,
                [
                    "'use strict';",
                    'const unguarded = 1; // no case reads this',
                    "const twin = 'x';",
                    "const twin2 = 'x';",
                    "module.exports = () => 'good';",
                    '',
                ].join('\n'),
            );
            const fixtureHarness = path.join(tempDir, 'fixture.test.js');
            fs.writeFileSync(
                fixtureHarness,
                [
                    "const { test } = require('node:test');",
                    "const assert = require('node:assert');",
                    "test('guards the value', () => {",
                    "    assert.strictEqual(require('./src/target.js')(), 'good');",
                    '});',
                    "test('an unrelated case', () => {",
                    '    assert.ok(true);',
                    '});',
                    '',
                ].join('\n'),
            );
            const original = digest(source);

            const list = [
                {
                    name: 'caught',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'guards the value',
                },
                {
                    name: 'survived',
                    file: 'src/target.js',
                    needle: 'const unguarded = 1;',
                    replacement: 'const unguarded = 2;',
                    test: 'guards the value',
                },
                {
                    name: 'needle twice',
                    file: 'src/target.js',
                    needle: "= 'x';",
                    replacement: "= 'y';",
                    test: 'guards the value',
                },
                {
                    name: 'needle absent',
                    file: 'src/target.js',
                    needle: 'not in the file',
                    replacement: 'x',
                    test: 'guards the value',
                },
                {
                    name: 'no such case',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'a case that does not exist',
                },
                {
                    name: 'outside the root',
                    file: path.relative(tempDir, outsideFile),
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                {
                    name: 'a specification',
                    file: '.magicspec/engine/specifications/l1-x.md',
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                { name: 'malformed', file: 'src/target.js' },
            ];
            const specPath = path.join(tempDir, 'mutations.json');
            fs.writeFileSync(specPath, JSON.stringify(list));

            // Through the command line, exactly as a task would use it.
            const cli = spawnSync(
                process.execPath,
                [driverPath, specPath, `--root=${tempDir}`, `--harness=${fixtureHarness}`],
                { cwd: tempDir, encoding: 'utf8' },
            );
            const verdictOf = (name) =>
                (cli.stdout.split('\n').find((line) => line.includes(` ${name}`)) || '').split(
                    /\s{2,}| — /,
                )[0];
            assert.strictEqual(cli.status, 1, 'a survivor or a refusal fails the run');
            assert.strictEqual(verdictOf('caught'), 'CAUGHT');
            assert.strictEqual(verdictOf('survived'), 'SURVIVED');
            for (const name of [
                'needle twice',
                'needle absent',
                'no such case',
                'outside the root',
                'a specification',
                'malformed',
            ]) {
                assert.strictEqual(verdictOf(name), 'REFUSED', name);
            }
            assert.match(
                cli.stdout,
                /8 mutation\(s\): 1 CAUGHT, 1 SURVIVED, 6 REFUSED, 0 RESTORE FAILED/,
            );
            assert.strictEqual(
                digest(source),
                original,
                'the file is byte-identical after the run',
            );
            assert.strictEqual(
                fs.readFileSync(outsideFile, 'utf8'),
                'a',
                'a file outside the root is untouched',
            );
            assert.strictEqual(
                fs.readFileSync(specFile, 'utf8'),
                'a',
                'a specification is untouched',
            );

            // A list in which every entry is caught exits 0.
            fs.writeFileSync(specPath, JSON.stringify([list[0]]));
            const clean = spawnSync(
                process.execPath,
                [driverPath, specPath, `--root=${tempDir}`, `--harness=${fixtureHarness}`],
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.strictEqual(clean.status, 0, clean.stdout);

            // A run that throws mid-mutation still leaves the file as it was, and
            // the replacement reached the file literally ("$&" is not a pattern).
            let seen = '';
            const lines = [];
            const results = driver.checkMutations(
                [
                    {
                        name: 'boom',
                        file: 'src/target.js',
                        needle: "'good'",
                        replacement: "'$&'",
                        test: 'x',
                    },
                ],
                {
                    root: tempDir,
                    harness: fixtureHarness,
                    log: (line) => lines.push(line),
                    run: () => {
                        seen = fs.readFileSync(source, 'utf8');
                        throw new Error('boom');
                    },
                },
            );
            assert.match(
                seen,
                /module\.exports = \(\) => '\$&';/,
                'the replacement was applied verbatim',
            );
            assert.strictEqual(results[0].verdict, 'REFUSED');
            assert.match(results[0].detail, /boom/);
            assert.strictEqual(
                digest(source),
                original,
                'a throwing run is restored byte for byte',
            );
        } finally {
            cleanup(tempDir);
            fs.rmSync(outsideDir, { recursive: true, force: true });
        }
    });

    test('finalize.js counts a RULES.md-only change as significant under magic.spec and not under magic.task (spec-side rule capture)', () => {
        // A T1–T4 capture during /magicspec:spec writes the constitution and nothing
        // else, so the spec workflow's whitelist has to see RULES.md itself.
        for (const rulesRel of ['.magicspec/RULES.md', '.magicspec/main/RULES.md']) {
            const tempDir = createTempWorkspace(true);
            try {
                const { versionPath, finalizePath } = createFinalizeFixture(tempDir, {
                    workspace: 'main',
                    autoChangelog: true,
                });
                commitFixture(tempDir);
                fs.writeFileSync(
                    path.join(tempDir, rulesRel),
                    '# Rules\n\n- A rule captured during a spec session.\n',
                );
                const run = (workflow) =>
                    execSync(`node "${finalizePath}" --workflow=${workflow} --workspace=main`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    });

                // Control: the same change is not a plan change, so it counts for no one but the rule and spec workflows.
                const asTask = run('task');
                assert.match(asTask, /No significant changes/, `${rulesRel}: task workflow`);
                assert.strictEqual(fs.readFileSync(versionPath, 'utf8').trim(), '0.1.0');

                const asSpec = run('spec');
                assert.match(asSpec, /Finalization complete/, `${rulesRel}: spec workflow`);
                assert.match(asSpec, /RULES\.md/, `${rulesRel}: the changed file is listed`);
                assert.strictEqual(
                    fs.readFileSync(versionPath, 'utf8').trim(),
                    '0.1.1',
                    `${rulesRel}: the project version is bumped`,
                );
                assert.match(
                    fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8'),
                    rulesRel === '.magicspec/RULES.md'
                        ? /Updated global project rules \(main\)/
                        : /Updated workspace rules \(main\)/,
                    `${rulesRel}: a changelog entry describing the rules is written`,
                );
            } finally {
                cleanup(tempDir);
            }
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
            fs.mkdirSync(path.join(tempDir, 'dev'), { recursive: true });
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
            const { buildChangelogBullet } = requireFromFixture(tempDir, 'lib', 'commit-suggester.js');

            // Asserted against the function's return value, not a written
            // CHANGELOG.md — only a real invocation touches that file, and this
            // generator is the only surface where the containment gates cannot
            // reach: nothing here is authored by a role or reviewed as a diff.
            const single = buildChangelogBullet('spec', 'main', [
                { path: '.magicspec/main/specifications/l1-model-runtime.md', status: 'modified' },
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
                { path: '.magicspec/main/specifications/l1-model-runtime.md', status: 'modified' },
                { path: '.magicspec/main/specifications/l2-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(multi, /model-runtime/, 'multi-spec branch must stay generic');

            // No other branch may regress into interpolating an identifier.
            const runBullet = buildChangelogBullet('run', 'main', [
                { path: '.magicspec/main/tasks/phase-7.md', status: 'modified' },
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
                'skills',
                'magicspec',
                'templates',
                'state.md',
            );
            fs.copyFileSync(realTemplate, path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'));
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

    test('a STATE.md created from the template carries no placeholder, and the writers still work on it (§18)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { updateState } = requireFromFixture(tempDir, 'update-state.js');
            const wsDir = makeWorkspace(tempDir, 'main');
            const statePath = path.join(wsDir, 'STATE.md');
            const stateText = () => fs.readFileSync(statePath, 'utf8');

            // The finalize shape: a Next Action and a progress recompute, and
            // nothing else — every other field keeps whatever the bootstrap gave it.
            warnedBy(() =>
                updateState(wsDir, { nextAction: 'Do the thing' }, { autoProgress: true }),
            );
            const fresh = stateText();
            assert.deepStrictEqual(
                fresh.split('\n').filter((line) => /\{[^}]*\}/.test(line)),
                [],
                'no line of a fresh STATE.md may still hold a template placeholder',
            );
            assert.match(fresh, /^\*\*Workspace:\*\* main$/m, 'the workspace name is filled in');
            assert.match(fresh, /^\*\*Status:\*\* Active$/m);
            assert.match(fresh, /^- \*\*Next Action:\*\* Do the thing$/m, 'the caller value wins');
            assert.doesNotMatch(fresh, /\n\n\n/, 'removing examples must not leave a double blank');

            // The decision examples are gone, so the first real decision is the only entry.
            warnedBy(() => updateState(wsDir, { decision: 'first' }, { addDecision: true }));
            assert.strictEqual(
                (stateText().match(/^- \d{4}-\d{2}-\d{2} /gm) || []).length,
                1,
                'the first decision is the only one in the section',
            );

            // The progress block is still recognised: counters land inside its fence.
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '| Phase | Description | Status |\n| --- | --- | --- |\n' +
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n',
            );
            warnedBy(() => updateState(wsDir, { phase: '1' }, { autoProgress: true }));
            assert.match(
                stateText(),
                /```\nOverall: \[1\/1\][^\n]*\n```/,
                'counters recompute into the fence',
            );

            // A root-level design directory is no workspace name.
            const rootDir = path.join(tempDir, '.magicspec');
            fs.rmSync(path.join(rootDir, 'main'), { recursive: true });
            warnedBy(() => updateState(rootDir, {}));
            assert.match(
                fs.readFileSync(path.join(rootDir, 'STATE.md'), 'utf8'),
                /^\*\*Workspace:\*\* unknown$/m,
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
                    ...antiPatternLines(95),
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
                ...antiPatternLines(95),
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
            const nextAction = `Execute T-8B04 ${evilTitle} via /magicspec:run engine`;

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
        const sink = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
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

    test('update-state no longer knows the handoff pointer: an existing line is left untouched and the flag is refused like any unknown one (SC-9(g))', () => {
        // (e) A STATE.md written before the snapshot was retired still carries
        // the line. No update rewrites, moves or removes it, and a patch key
        // for it has no writer, so it changes nothing.
        const existing = [
            ...trimmedState,
            '## Session Continuity',
            '',
            '**Handoff File:** none',
            '**Bootstrap Mode:** false',
            '',
        ];
        const before = withoutVolatile(existing.join('\n'));
        for (const patch of [
            { handoff: '.magicspec/docs/HANDOFF.json' },
            { nextAction: 'Continue' },
        ]) {
            const { after } = patchState(existing, patch);
            assert.match(after, /^\*\*Handoff File:\*\* none$/m, 'the old line survives an update');
            if (patch.handoff) {
                assert.strictEqual(
                    withoutVolatile(after),
                    before,
                    'a handoff patch key writes nothing',
                );
            }
        }

        // (d) The flag goes down the ordinary unknown-argument path: same
        // message shape and same exit as a made-up flag, and no line is created.
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { wsDir } = requireUpdateState(tempDir);
            const run = (flag) =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-state.js'),
                        `--workspace=${wsDir}`,
                        '--next-action=Continue',
                        flag,
                    ],
                    { cwd: tempDir, encoding: 'utf8' },
                );
            const retired = run('--handoff=x');
            const madeUp = run('--handoof=x');
            assert.match(retired.stderr, /Unknown argument: --handoff=x/);
            assert.strictEqual(retired.status, madeUp.status, 'the same exit as any unknown flag');
            assert.strictEqual(
                retired.stderr.replace('--handoff', '--handoof'),
                madeUp.stderr,
                'the same message as any unknown flag',
            );
            assert.doesNotMatch(
                fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8'),
                /Handoff File/,
                'the retired field is not created on a fresh file',
            );
        } finally {
            cleanup(tempDir);
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
            ...antiPatternLines(90),
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
            ...antiPatternLines(90),
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
            const executorPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');

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
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'workspace.json'),
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

            // The same guard holds for a default that arrives from the registry file
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'workspace.json'),
                JSON.stringify({ default: '../../outside', workspaces: { '../../outside': {} } }),
            );
            assert.throws(
                () =>
                    execSync(`node "${executorPath}" init`, {
                        cwd: tempDir,
                        stdio: 'pipe',
                    }),
                /Invalid default workspace name/,
                'Should reject a registry default with path separators',
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'install-hooks.js');
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
    // 9a. install-hooks.js — ownership, truthful outcome, disarm without the
    //     engine. Each case drives the installer, and the hook it writes, over a
    //     throwaway repository made with `git init`.
    // ───────────────────────────────────────────────────────────────────────────
    const HOOK_MARKER_LINE = '# Magic Spec Pre-commit Hook';
    const HOOK_CHAIN_LINE = 'node skills/magicspec/scripts/executor.js update-engine-meta --check || exit 1';

    const gitIn = (dir, ...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    const outputOf = (result) => result.stdout + result.stderr;
    const hookFileOf = (dir) => path.join(dir, '.git', 'hooks', 'pre-commit');
    const installHookIn = (dir) =>
        spawnSync('node', [path.join(scriptsDir, 'install-hooks.js')], {
            cwd: dir,
            encoding: 'utf8',
            env: { ...process.env, MAGIC_ENGINE_DIR: path.join(dir, 'skills', 'magicspec') },
        });

    const makeHookRepo = () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-hook-'));
        gitIn(dir, 'init', '-b', 'master');
        gitIn(dir, 'config', 'user.email', 'test@example.com');
        gitIn(dir, 'config', 'user.name', 'Test User');
        return dir;
    };

    // A repository that carries a copy of the engine with a manifest that matches it.
    const makeEngineHookRepo = () => {
        const dir = createTempWorkspace(true);
        generateChecksums(dir);
        return dir;
    };

    const commitIn = (dir) => {
        fs.writeFileSync(path.join(dir, 'staged.txt'), `${Date.now()}\n`);
        gitIn(dir, 'add', 'staged.txt');
        return gitIn(dir, 'commit', '-m', 'probe');
    };

    test('git hook: a fresh repository gets the hook with the marker, and a second run leaves it byte for byte', () => {
        const dir = makeHookRepo();
        try {
            const first = installHookIn(dir);
            assert.strictEqual(first.status, 0, outputOf(first));
            const written = fs.readFileSync(hookFileOf(dir));
            assert.ok(
                written.toString('utf8').split(/\r?\n/).includes(HOOK_MARKER_LINE),
                'the hook carries the marker line',
            );
            assert.match(
                outputOf(first),
                /installed successfully/,
                'the success line follows a write',
            );
            if (process.platform !== 'win32') {
                assert.ok(
                    (fs.statSync(hookFileOf(dir)).mode & 0o111) !== 0,
                    'the hook is executable where the platform has the bit',
                );
            }

            const second = installHookIn(dir);
            assert.strictEqual(second.status, 0, outputOf(second));
            assert.strictEqual(
                Buffer.compare(written, fs.readFileSync(hookFileOf(dir))),
                0,
                'a reinstall changes nothing',
            );
            assert.ok(
                !fs.existsSync(`${hookFileOf(dir)}.magic-spec.bak`),
                'a reinstall saves no copy',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('git hook: a pre-existing hook without the marker survives byte for byte, the run fails and the output carries the line that chains the check', () => {
        const dir = makeHookRepo();
        try {
            const own = '#!/bin/sh\necho "my own hook"\n';
            fs.writeFileSync(hookFileOf(dir), own);
            const result = installHookIn(dir);
            assert.notStrictEqual(
                result.status,
                0,
                'a hook the installer did not write is a failure to install',
            );
            assert.strictEqual(
                fs.readFileSync(hookFileOf(dir), 'utf8'),
                own,
                "the user's hook is untouched",
            );
            assert.ok(
                outputOf(result).includes(HOOK_CHAIN_LINE),
                'the output names the line to add',
            );
            assert.doesNotMatch(
                outputOf(result),
                /installed successfully/,
                'no success line for a hook that was not written',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('git hook: a hook that carries the marker but another body is replaced only after its bytes are saved beside it, and no earlier copy is overwritten', () => {
        const dir = makeHookRepo();
        try {
            const older = `#!/bin/sh\n${HOOK_MARKER_LINE}\necho "older engine"\n`;
            fs.writeFileSync(hookFileOf(dir), older);
            const first = installHookIn(dir);
            assert.strictEqual(first.status, 0, outputOf(first));
            const copy = `${hookFileOf(dir)}.magic-spec.bak`;
            assert.strictEqual(
                fs.readFileSync(copy, 'utf8'),
                older,
                'the copy is byte-identical to the original',
            );
            assert.notStrictEqual(
                fs.readFileSync(hookFileOf(dir), 'utf8'),
                older,
                'the hook was replaced',
            );
            assert.ok(
                outputOf(first).includes('pre-commit.magic-spec.bak'),
                'the output names the copy',
            );

            const extended = `#!/bin/sh\n${HOOK_MARKER_LINE}\necho "extended by hand"\n`;
            fs.writeFileSync(hookFileOf(dir), extended);
            const second = installHookIn(dir);
            assert.strictEqual(second.status, 0, outputOf(second));
            assert.strictEqual(
                fs.readFileSync(copy, 'utf8'),
                older,
                'the first copy is not overwritten',
            );
            assert.strictEqual(
                fs.readFileSync(`${copy}.1`, 'utf8'),
                extended,
                'the next copy takes a numbered name',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('git hook: with core.hooksPath pointing elsewhere nothing is written under .git/hooks and the run fails; a path that is .git/hooks itself installs', () => {
        const redirected = makeHookRepo();
        const same = makeHookRepo();
        try {
            gitIn(redirected, 'config', 'core.hooksPath', '../elsewhere');
            const result = installHookIn(redirected);
            assert.notStrictEqual(
                result.status,
                0,
                'a hook git never reads is not an installed hook',
            );
            assert.ok(
                !fs.existsSync(hookFileOf(redirected)),
                'nothing is written under .git/hooks',
            );
            assert.ok(
                outputOf(result).includes(HOOK_CHAIN_LINE),
                'the output names the line to add',
            );
            assert.doesNotMatch(outputOf(result), /installed successfully/, 'no success line');

            gitIn(same, 'config', 'core.hooksPath', '.git/hooks');
            const control = installHookIn(same);
            assert.strictEqual(control.status, 0, outputOf(control));
            assert.ok(
                fs.existsSync(hookFileOf(same)),
                'a hooksPath that names .git/hooks is not a redirect',
            );
        } finally {
            cleanup(redirected);
            cleanup(same);
        }
    });

    test('git hook: a symbolic-link pre-commit and a symbolic-link .git/hooks are left untouched and the run fails', (t) => {
        const linkedHook = makeHookRepo();
        const linkedDir = makeHookRepo();
        try {
            // The target carries the marker and another body, so an installer that
            // followed the link would treat it as its own old hook and write through it.
            const target = path.join(linkedHook, 'tracked-hook.sh');
            const content = `#!/bin/sh\n${HOOK_MARKER_LINE}\necho tracked\n`;
            fs.writeFileSync(target, content);
            const shared = path.join(linkedDir, 'shared-hooks');
            fs.mkdirSync(shared);
            const hooksDir = path.join(linkedDir, '.git', 'hooks');
            fs.rmSync(hooksDir, { recursive: true, force: true });
            try {
                fs.symlinkSync(target, hookFileOf(linkedHook));
                fs.symlinkSync(shared, hooksDir, 'dir');
            } catch (e) {
                t.skip(`this platform cannot create symbolic links here (${e.code})`);
                return;
            }

            const one = installHookIn(linkedHook);
            assert.notStrictEqual(one.status, 0, 'a linked hook belongs to someone else');
            assert.ok(
                fs.lstatSync(hookFileOf(linkedHook)).isSymbolicLink(),
                'the link is still a link',
            );
            assert.strictEqual(fs.readFileSync(target, 'utf8'), content, 'the target is untouched');
            assert.ok(outputOf(one).includes(HOOK_CHAIN_LINE), 'the output names the line to add');

            const two = installHookIn(linkedDir);
            assert.notStrictEqual(
                two.status,
                0,
                'a linked hooks directory belongs to someone else',
            );
            assert.deepStrictEqual(
                fs.readdirSync(shared),
                [],
                'nothing is written into the link target',
            );
        } finally {
            cleanup(linkedHook);
            cleanup(linkedDir);
        }
    });

    test('git hook: a pre-commit that is a directory makes the run fail, the exit code init.js records its finding from', () => {
        const dir = makeHookRepo();
        try {
            fs.mkdirSync(hookFileOf(dir));
            const result = installHookIn(dir);
            assert.notStrictEqual(result.status, 0, 'a write failure is a failure to install');
            assert.match(result.stderr, /Failed to install Git hook/, 'the error is reported');
            assert.doesNotMatch(outputOf(result), /installed successfully/, 'no success line');
        } finally {
            cleanup(dir);
        }
    });

    test('git hook: with no skills/magicspec/ the hook prints one line and lets the commit through; with the engine present it still blocks drift and a partly deleted engine', () => {
        const bare = makeHookRepo();
        const synced = makeEngineHookRepo();
        const drifted = makeEngineHookRepo();
        const partial = makeEngineHookRepo();
        try {
            for (const dir of [bare, synced, drifted, partial]) {
                const installed = installHookIn(dir);
                assert.strictEqual(installed.status, 0, outputOf(installed));
            }

            const lone = commitIn(bare);
            const loneText = outputOf(lone);
            assert.strictEqual(
                lone.status,
                0,
                `the commit goes through without the engine: ${loneText}`,
            );
            assert.strictEqual(
                loneText.split('\n').filter((l) => l.includes('[Magic Sync]')).length,
                1,
                'the hook prints exactly one line',
            );
            assert.match(
                loneText,
                /not installed here, so nothing was checked/,
                'the line says the engine is absent and nothing was checked',
            );
            assert.match(
                loneText,
                /Delete \.git\/hooks\/pre-commit/,
                'the line says the file can be deleted',
            );
            assert.doesNotMatch(
                loneText,
                /Engine drift detected/,
                'an absent engine is not called drift',
            );
            assert.doesNotMatch(loneText, /MODULE_NOT_FOUND|node:internal/, 'no stack trace');

            // Controls: the guard is not a blanket pass.
            const ok = commitIn(synced);
            assert.strictEqual(ok.status, 0, outputOf(ok));
            assert.match(outputOf(ok), /Engine in sync/, 'an engine in sync is checked and passes');
            assert.doesNotMatch(
                outputOf(ok),
                /not installed here/,
                'the disarm line is not printed when the engine is there',
            );

            fs.appendFileSync(path.join(drifted, 'skills', 'magicspec', 'scripts', 'check-bloat.js'), ' ');
            const drift = commitIn(drifted);
            assert.notStrictEqual(drift.status, 0, 'a modified manifested file blocks the commit');
            assert.match(
                outputOf(drift),
                /Engine drift detected in skills\/magicspec\//,
                'the drift message',
            );

            fs.rmSync(path.join(partial, 'skills', 'magicspec', 'scripts', 'executor.js'));
            const half = commitIn(partial);
            assert.notStrictEqual(
                half.status,
                0,
                'a partly deleted engine still blocks the commit',
            );
            assert.match(
                outputOf(half),
                /restore skills\/magicspec\/ from the magic-spec release archive/,
                'and still says restore',
            );
            assert.doesNotMatch(
                outputOf(half),
                /not installed here/,
                'a partly deleted engine is not an absent one',
            );
        } finally {
            for (const dir of [bare, synced, drifted, partial]) cleanup(dir);
        }
    });

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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'detect-communities.js');
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'extract-rationale.js');
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'analyze-coverage.js');
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'generate-context.js');
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

            const executorPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-state.js');
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
        const magicRoot = path.resolve(__dirname, '..', 'skills', 'magicspec');
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
        const repoRoot = path.resolve(__dirname, '..');

        // The containment scan has no code — it is a cognitive grep whose match
        // classes are stated in prose, so the prose IS the implementation. Every
        // surface that states them must state the notation-independent form:
        // pinning the bracketed checklist literal `[T-XXXX]` or the `phase-{n}`
        // file form matches only the SDD layer's internal spellings, while a
        // reference leaks precisely by being quoted out of them (bare, in prose,
        // in a test name). That narrowing let 121 leaks accumulate unreported.
        const surfaces = [
            'skills/magicspec/AGENT-RULES.md',
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'generate-context.js');
            const read = () => fs.readFileSync(path.join(tempDir, '.magicspec', 'CONTEXT.md'), 'utf8');

            // (a) No scope: gitignored .magicspec stays visible; dist/ (floor) is hidden.
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
            let context = read();
            assert.ok(
                context.includes('.magicspec/'),
                'gitignored design root must remain visible (landmark)',
            );
            assert.match(context, /skills\/\n.*magicspec\//, 'engine root must remain visible (landmark)');
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
            assert.match(context, /skills\/\n.*magicspec\//, 'engine root must survive the scope filter');
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
            assert.ok(context.includes('\n### Journal\n'), 'changelog title nests under Recent Changes');
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
            diagnostics: requireFromFixture(tempDir, 'lib', 'diagnostics.js'),
        };
    };

    test('diagnostics.js record/read/drain round-trip in append order, exactly once (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

            // Occupy .magicspec/.cache with a file so the sink's parent path
            // cannot resolve to a directory — the write itself must fail.
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', '.cache'), 'not a directory');

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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            diagnostics.record({
                severity: 'warning',
                source: 'a',
                code: 'BEFORE',
                message: 'first',
            });

            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

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
    // skills/magicspec/scripts/: echoes { warnings: JSON.parse(MAGIC_FIXTURE_WARNINGS) } and
    // increments a counter file on every invocation, so tests can assert both
    // what a recheck reports and how many times it actually ran (§4.10 step 2,
    // signature collapse).
    const writeRevalidateFixture = (tempDir) => {
        const src = [
            '#!/usr/bin/env node',
            "'use strict';",
            "const fs = require('fs');",
            "const path = require('path');",
            "const counterPath = path.join(__dirname, '..', '..', '..', '.magicspec', '.cache', 'revalidate-fixture-count.txt');",
            'try {',
            '    fs.mkdirSync(path.dirname(counterPath), { recursive: true });',
            '    const n = fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, "utf8"), 10) : 0;',
            '    fs.writeFileSync(counterPath, String(n + 1));',
            '} catch (e) { /* best-effort counter, never block the fixture output */ }',
            "console.log(JSON.stringify({ warnings: JSON.parse(process.env.MAGIC_FIXTURE_WARNINGS || '[]') }));",
            '',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', 'scripts', 'revalidate-fixture.js'), src);
    };

    // The fixture is not one of the checkers a finding may name, so the loaded module is told about it.
    const admitRevalidateFixture = (diagnostics) => {
        diagnostics.RECHECK_SCRIPTS.add('revalidate-fixture');
        diagnostics.RECHECK_ENV_KEYS.add('MAGIC_FIXTURE_WARNINGS');
        return diagnostics;
    };

    const revalidateFixtureCount = (tempDir) => {
        const counterPath = path.join(tempDir, '.magicspec', '.cache', 'revalidate-fixture-count.txt');
        return fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, 'utf8'), 10) : 0;
    };

    const testRevalidate = (findings, checkFn) => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = admitRevalidateFixture(requireFromFixture(tempDir, 'lib', 'diagnostics.js'));
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
                        env: { MAGIC_FIXTURE_WARNINGS: '[]' },
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
                        env: { MAGIC_FIXTURE_WARNINGS: JSON.stringify([{ type: 'STILL_OPEN' }]) },
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
            env: { MAGIC_FIXTURE_WARNINGS: JSON.stringify([{ type: 'A' }, { type: 'B' }]) },
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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

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
                        env: { MAGIC_FIXTURE_WARNINGS: '[]' },
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
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');

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
            // recheck-attachment change) — a missing skills/magicspec/.checksums
            // reliably yields one ENGINE_INTEGRITY finding with a recheck.
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'INDEX.md'), '# Registry\n');
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '# Rules\n');
            const cpPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'check-prerequisites.js');
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

            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
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
            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'record-diagnostic.js');
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');

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
    test('release-changelog.js handles --help and rejects unknown arguments without rotating (R11 CLI contract)', () => {
        const tempDir = createTempWorkspace();
        try {
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            const original = [
                '# Changelog',
                '',
                '## [Unreleased]',
                '',
                '### Added',
                '',
                '- Keep this entry in place.',
                '',
            ].join('\n');
            fs.writeFileSync(changelogPath, original);
            const executorPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');

            const help = execSync(`node "${executorPath}" release-changelog --help`, {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.match(help, /Usage: node skills\/magicspec\/scripts\/executor\.js release-changelog/);
            assert.strictEqual(
                fs.readFileSync(changelogPath, 'utf8'),
                original,
                '--help must leave CHANGELOG.md byte-for-byte unchanged',
            );

            assert.throws(
                () =>
                    execSync(`node "${executorPath}" release-changelog --unknown`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    }),
                (error) => {
                    assert.strictEqual(error.status, 1, 'unknown arguments exit non-zero');
                    assert.match(error.stderr.toString(), /Unknown argument '--unknown'/);
                    return true;
                },
            );
            assert.strictEqual(
                fs.readFileSync(changelogPath, 'utf8'),
                original,
                'an unknown argument must leave CHANGELOG.md byte-for-byte unchanged',
            );
        } finally {
            cleanup(tempDir);
        }
    });

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
            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'release-changelog.js');

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

            // Defaults: --version from .magicspec/.version, --date = today (UTC).
            fs.mkdirSync(path.join(tempDir, '.magicspec'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.magicspec', '.version'), '4.5.6\n');
            const out2 = execSync(`node "${scriptPath}"`, { cwd: tempDir, encoding: 'utf8' });
            const today = new Date().toISOString().slice(0, 10);
            assert.match(
                out2,
                new RegExp(`Rotated \\[Unreleased\\] → \\[4\\.5\\.6\\] - ${today}`),
                'falls back to .magicspec/.version and today when flags are omitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotation restores per-window bullet distinguishability (R11 §4.1/§4.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = requireFromFixture(tempDir, 'lib', 'changelog-writer.js');
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

    test('release-changelog.js rotation keeps a blank line under the renamed version heading', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = loadChangelogWriter(tempDir);
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');
            appendBullet(changelogPath, 'Added', 'first');
            releaseUnreleased(changelogPath, '1.0.0', '2026-02-01');
            appendBullet(changelogPath, 'Added', 'second');

            const text = fs.readFileSync(changelogPath, 'utf8');
            assert.ok(
                text.includes('## [1.0.0] - 2026-02-01\n\n### Added\n\n- first\n'),
                'the released heading must stay separated from its first sub-heading (MD022)',
            );
            assert.ok(!/\n\n\n/.test(text), 'no consecutive blank lines (MD012)');
        } finally {
            cleanup(tempDir);
        }
    });

    test('export-wiki.js pages keep blank lines around headings and lists, even for an empty workspace', () => {
        const tempDir = createTempWorkspace();
        try {
            const graph = {
                nodes: [
                    { id: 'workspace:full', type: 'workspace', label: 'full' },
                    { id: 'workspace:empty', type: 'workspace', label: 'empty' },
                    {
                        id: 'spec:full/a.md',
                        type: 'spec',
                        label: 'a.md',
                        workspace: 'full',
                        layer: 1,
                        status: 'Stable',
                        version: '1.0.0',
                    },
                ],
                edges: [{ from: 'workspace:full', to: 'spec:full/a.md', relation: 'contains' }],
                analysis: {
                    god_nodes: [{ id: 'spec:full/a.md', type: 'spec', label: 'a.md', degree: 3 }],
                    orphaned_files: ['x.js'],
                },
            };
            const graphPath = path.join(tempDir, 'graph.json');
            fs.writeFileSync(graphPath, JSON.stringify(graph));
            execSync(
                `node "${path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js')}" export-wiki --from-file graph.json --out wiki`,
                { cwd: tempDir, stdio: 'pipe' },
            );

            const wikiDir = path.join(tempDir, 'wiki');
            const pages = fs.readdirSync(wikiDir).filter((f) => f.endsWith('.md'));
            assert.ok(pages.length >= 3, 'index, both workspaces and the spec are exported');
            for (const page of pages) {
                const lines = fs.readFileSync(path.join(wikiDir, page), 'utf8').split('\n');
                lines.forEach((line, i) => {
                    const prev = lines[i - 1];
                    const next = lines[i + 1];
                    const where = `${page}:${i + 1}`;
                    if (/^#{1,6} /.test(line)) {
                        assert.ok(i === 0 || prev === '', `${where}: blank line above heading`);
                        assert.ok(next === '', `${where}: blank line below heading`);
                    }
                    if (/^- /.test(line)) {
                        assert.ok(prev === '' || /^- /.test(prev), `${where}: blank line above list`);
                        assert.ok(next === '' || /^- /.test(next), `${where}: blank line below list`);
                    }
                    assert.ok(!(line === '' && prev === ''), `${where}: consecutive blank lines`);
                });
                assert.ok(
                    !/^\*\*[^*]+\*\*$/m.test(lines.join('\n')),
                    `${page}: bold-only line reads as a heading (MD036)`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js no longer references releaseUnreleased — rotation is opt-in only (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const src = fs.readFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'finalize.js'),
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
    test('analyze-coverage.js classifies .magicspec/ bookkeeping and archived phase journals as EXEMPT', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => writeTreeFile(tempDir, rel, body);
            mk('.magicspec/PLAN.md', '# Plan\n');
            mk('.magicspec/STATE.md', '# State\n');
            mk('.magicspec/archives/tasks/phase-1.md', '# Phase 1\n');
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n');

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'analyze-coverage.js');
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
            assert.notStrictEqual(
                byFile.get('.magicspec/specifications/l1-core.md').confidence,
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

            const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'analyze-coverage.js');
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
                const r = spawnSync(process.execPath, [validatorScript, ...flags], { cwd: tempDir, encoding: 'utf8' });
                return { failed: r.status !== 0, output: String(r.stdout || '') + String(r.stderr || '') };
            };

            // Control — an intact link passes and the table actually runs.
            fs.symlinkSync(target, link, 'junction');
            const intact = run();
            assert.strictEqual(intact.failed, false, intact.output);
            assert.match(intact.output, /Validating directory links/, 'the link table must run, not be silently absent');
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
    // 17. skills/magicspec/AGENT-RULES.md §1 — Fresh-Project Snapshot Ambiguity (structural)
    //     Engine Upgrade Detection is a cognitive procedure the agent follows
    //     by reading this file — no executor subcommand implements the
    //     compare/narrate logic — so coverage is structural/textual, the same
    //     precedent as T-29T01's skills/magicspec/analyze.md cognitive-instruction case.
    // ───────────────────────────────────────────────────────────────────────────
    test('skills/magicspec/AGENT-RULES.md §1 distinguishes a fresh project from an unknown-field registry', () => {
        const repoRoot = path.resolve(__dirname, '..');
        const content = fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'AGENT-RULES.md'), 'utf8');

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
        const designDir = path.join(tempDir, '.magicspec');
        const toEol = (text) => text.replace(/\n/g, eol);
        const registry = {};
        for (const [name, def] of Object.entries(workspaces)) {
            registry[name] = { description: name, scope: ['.magicspec'] };
            const wsDir = path.join(designDir, name);
            fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                toEol(
                    resumeStateText(
                        def.status || 'Active',
                        def.nextAction || 'Execute T-1A01 Thing via /magicspec:run engine',
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
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js'), 'resume-state', ...args],
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

    test('resume-state stays silent when nothing is recorded in flight, even beside a stale handoff file or a hand-set Paused (SC-9(b), SC-9(g), H1)', () => {
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
                fs.existsSync(path.join(tempDir, '.magicspec', 'engine', 'HANDOFF.json')),
                'fixture precondition: the stale snapshot is on disk',
            );

            const quiet = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(quiet.status, 0);
            assert.strictEqual(
                quiet.stdout,
                '',
                `a leftover snapshot with nothing in flight must not trigger a resume — the file's presence is not a trigger → "${quiet.stdout}"`,
            );

            // (a) A hand-set `Status: Paused` is inert: nothing is in flight, so nothing is said.
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'engine', 'STATE.md'),
                resumeStateText('Paused', 'Pick up T-1A02'),
            );
            const paused = runResumeState(tempDir, ['--workspace=engine']);
            assert.strictEqual(paused.status, 0);
            assert.strictEqual(
                paused.stdout,
                '',
                `a hand-set Paused with nothing in flight must not trigger a resume → "${paused.stdout}"`,
            );

            // Control: the same tree with a task recorded In Progress does speak,
            // so the silence above is a decision and not a script that says nothing.
            writeResumeFixture(tempDir, {
                engine: {
                    status: 'Paused',
                    staleHandoff: true,
                    entries: [trackingEntry('T-1A02', 'Later', 'In Progress')],
                },
            });
            assert.match(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                /^▶ Resume \[engine\]: T-1A02 Later in flight — 0 dead end\(s\) recorded\. Next: /,
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
                                'Execute T-1A01 Extract `finalize.js` via /magicspec:run engine',
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
                    path.join(tempDir, '.magicspec', 'engine', 'tasks', 'phase-1.md'),
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
                'Next: Execute T-1A01 Extract `finalize.js` via /magicspec:run engine\n',
            'one line: title and Next Action with their code spans intact, the recorded dead ends, and the two product files (not the workbook)',
        );
    });

    test('resume-state names every task in flight up to three, then counts the rest, and reads a workspace with a hand-set Paused exactly as any other (SC-9(f), SC-9(g), H3, H4)', () => {
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
            const withPaused = runResumeState(tempDir, ['--workspace=engine']).stdout;
            assert.match(
                withPaused,
                /^▶ Resume \[engine\]: T-1A01 One in flight — 0 dead end\(s\) recorded\. Next: /,
                'a hand-set Paused adds no marker: the line is the plain in-flight one',
            );
            assert.doesNotMatch(withPaused, /paused|snapshot/i);
            writeResumeFixture(tempDir, {
                engine: { status: 'Active', entries: [inFlight('T-1A01', 'One')] },
            });
            assert.strictEqual(
                runResumeState(tempDir, ['--workspace=engine']).stdout,
                withPaused,
                'the line does not depend on the Status value',
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
                !fs.existsSync(path.join(tempDir, '.magicspec', '.cache')),
                'a clean run must not even create the diagnostics directory',
            );

            // A STATE.md that exists but cannot be read is the script's one non-fatal condition.
            const statePath = path.join(tempDir, '.magicspec', 'engine', 'STATE.md');
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

            const sinkPath = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
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
            delete after['.magicspec/.cache/diagnostics.jsonl'];
            delete after['.magicspec/.cache/'];
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
                    [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'resume-state.js'), ...args],
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
            assert.strictEqual(entry.next_action, 'Execute T-1A01 Thing via /magicspec:run engine');

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
        'Bootstrap Mode': 'bootstrap',
    };

    test('the STATE.md template declares only fields update-state writes, never a dead one such as Last Session Ended (SC-1.3, H8)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const template = fs.readFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'),
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

    // One --workflow=run finalize invocation against a fresh git-backed
    // fixture with a Done task (so TASKS.md alone would not force the
    // significant path — the assertions below are about STATE.md's own
    // whitelisted-hash handling, not about TASKS.md's status-flip filter).
    // `stateDirBlock: true` puts a directory where STATE.md belongs, the
    // shape that used to throw uncaught out of the significance snapshot
    // (R44, l2-engine-finalization.md §9) — `false` leaves it genuinely
    // absent, the sibling condition that must stay `null`, not `'UNREADABLE'`.
    const runFinalizeRunWithState = ({ stateDirBlock }) => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main' });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            if (stateDirBlock) fs.mkdirSync(path.join(wsDir, 'STATE.md'));
            commitFixture(tempDir);

            const result = spawnSync(
                process.execPath,
                [finalizePath, '--workflow=run', '--workspace=main'],
                { cwd: tempDir, encoding: 'utf8' },
            );
            return { result };
        } finally {
            cleanup(tempDir);
        }
    };

    test('finalize.js under --workflow=run survives an unreadable whitelisted STATE.md instead of aborting (R44, l2-engine-finalization.md §9)', () => {
        // The bug: STATE.md is in magic.run's whitelist (unlike magic.task,
        // whose own STATE.md write sits behind a separate, already-guarded
        // try/catch — see runFinalizeCheckpoint above), so a directory at its
        // path made the significance snapshot's hashFileSafe throw uncaught,
        // aborting the whole invocation before anything else ran: no version
        // bump, no archival, no CHANGELOG, no digest.
        const { result } = runFinalizeRunWithState({ stateDirBlock: true });

        assert.strictEqual(
            result.status,
            0,
            'an unreadable whitelisted file must not crash finalize',
        );
        assert.match(
            result.stdout,
            /SIGNIFICANCE_HASH_UNREADABLE/,
            'the read failure must surface as a diagnostic, not pass in silence',
        );
        assert.match(
            result.stdout,
            /STATE\.md/,
            'the diagnostic must name the file that could not be read',
        );
    });

    test('finalize.js treats a genuinely absent whitelisted file as unchanged, not UNREADABLE (control)', () => {
        // No STATE.md at all — never created (makeWorkspace only mkdirs the
        // workspace itself), not a directory either. The two conditions
        // (absent vs. unreadable) must not collapse into one code path.
        const { result } = runFinalizeRunWithState({ stateDirBlock: false });

        assert.strictEqual(result.status, 0);
        assert.doesNotMatch(
            result.stdout,
            /SIGNIFICANCE_HASH_UNREADABLE/,
            'a genuinely absent file hashes to null, not UNREADABLE — no diagnostic',
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 22. Shipped-text contracts — behavior that is prose (H10). The workflow
    //     bodies and rules are read by an agent, so what they say IS the
    //     behavior. Each contract states its detector once, proves the detector on
    //     synthetic text (it must flag what it claims to and spare what it must),
    //     and only then applies it to the shipped tree.
    // ───────────────────────────────────────────────────────────────────────────

    const shippedRoot = path.resolve(__dirname, '..');
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

    // The shipped engine bodies (`workflows/*.md` and `references/*.md`), not the templates and role cards.
    const engineBodies = () =>
        listShipped('skills/magicspec', ['.md'])
            .filter((rel) => /^skills\/magicspec\/(workflows|references)\/[^/]+$/.test(rel))
            .map((rel) => ({ rel, text: readShipped(rel) }));

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

    // The first line of `text` that carries `label`. A guard or a step bullet is one
    // line, so asserting on that line keeps a phrase elsewhere in the file from
    // satisfying a check about this bullet. A missing text yields undefined.
    const lineWith = (text, label) =>
        (text ?? '').split(/\r?\n/).find((line) => line.includes(label));

    // The Logic Guards of `run.md` (Core Invariant 4): the block its guard bullets live in.
    const runGuards = () => {
        const run = readShipped('skills/magicspec/workflows/run.md');
        return run.slice(
            run.indexOf('4. **Logic Guards**'),
            run.indexOf('5. **Zero-Prompt Automation**'),
        );
    };

    // Numbered step `label` (e.g. `'4.'`) of the `### Steps` list of `run.md`.
    const runStep = (label) => {
        const run = readShipped('skills/magicspec/workflows/run.md');
        return stepBlock(run.slice(run.indexOf('\n### Steps')), label);
    };

    // The first line of the role card `rel` that starts with `prefix` (an Operating Protocol step).
    const cardLine = (rel, prefix) =>
        readShipped(rel)
            .split(/\r?\n/)
            .find((line) => line.startsWith(prefix));

    // The own-word rule `analyze.md` states for PHANTOM_COMMAND: a `/magicspec:{cmd}`
    // token is a command mention only when nothing but whitespace, a backtick or
    // an opening quote precedes it — so a path such as `skills/magicspec:x` is never
    // one; `{cmd}` is a lowercase word (a hyphen ends it).
    const phantomCommands = (files, wrappers) => {
        const found = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                for (const match of line.matchAll(/(?<![^\s`"'“‘])\/magicspec:([a-z]+)/g)) {
                    if (wrappers.has(match[1])) continue;
                    found.push(`${rel}:${index + 1}: /magicspec:${match[1]}`);
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
                    'Run `/magicspec:pause` to stop.',
                    'Say "/magicspec:context" first.',
                    'Use /magicspec:retrospective now',
                    'See skills/magicspec:x and .agents/workflows/magic.run.md.',
                    'The `/magicspec:run`-executable flag and /magicspec:task both resolve.',
                    'Developer-facing: `/magicspec-dev:init`.',
                    '/magicspec:pause at a line start',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            phantomCommands(sample, wrappers),
            [
                'sample.md:1: /magicspec:pause',
                'sample.md:2: /magicspec:context',
                'sample.md:3: /magicspec:retrospective',
                'sample.md:7: /magicspec:pause',
            ],
            'flags a mention after a backtick, a quote, whitespace and a line start; spares paths, resolving commands, a hyphen-ended token and the maintenance commands',
        );

        // The shipped tree: `skills/magicspec/` (bodies, scripts, templates), docs, README.
        const resolved = new Set(
            fs
                .readdirSync(path.join(shippedRoot, 'skills', 'magicspec', 'workflows'))
                .map((name) => name.match(/^([a-z]+)\.md$/))
                .filter(Boolean)
                .map((match) => match[1]),
        );
        assert.ok(
            resolved.has('run') && resolved.has('task'),
            'the command set is read from the skill folder\'s workflows/',
        );
        const scanned = [
            ...listShipped('skills/magicspec', ['.md', '.js', '.json']),
            ...listShipped('docs', ['.md']),
            ...(fs.existsSync(path.join(shippedRoot, 'README.md')) ? ['README.md'] : []),
        ].map((rel) => ({ rel, text: readShipped(rel) }));
        assert.ok(
            scanned.length > 30,
            `the scan must actually see the shipped tree (saw ${scanned.length} files)`,
        );

        assert.deepStrictEqual(
            phantomCommands(scanned, resolved),
            [],
            'a /magicspec:{cmd} mention must resolve to skills/magicspec/workflows/{cmd}.md — internal modules must not be advertised as commands',
        );
        // The pause module stays a module: no shipped text names it as a command,
        // whether or not a wrapper ever appears for it.
        assert.deepStrictEqual(
            phantomCommands(scanned, new Set()).filter((hit) => hit.endsWith('/magicspec:pause')),
            [],
            '/magicspec:pause is not a command',
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

        // The shipped engine bodies: `skills/magicspec/*.md`, not only `context.md` — a
        // narrower scan passed while `task.md` still shipped its own tier table.
        const bodies = engineBodies();
        assert.ok(bodies.length >= 8, `the scan must see the engine bodies (saw ${bodies.length})`);
        assert.deepStrictEqual(
            fillTiers(bodies),
            [],
            'the agent has no reading of its own context fill: no body may key behavior to a percentage tier',
        );
    });

    test('shipped text: run.md records Task Start and all three Attempts events, in order (H10c)', () => {
        const run = readShipped('skills/magicspec/workflows/run.md');

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

    test('shipped text: skills/magicspec/AGENT-RULES.md carries the session resume check and its opt-out (H10d)', () => {
        const rules = readShipped('skills/magicspec/AGENT-RULES.md');
        assert.match(
            rules,
            /^## 10\. Session Resume Check/m,
            'skills/magicspec/AGENT-RULES.md must carry section 10',
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

    // A registered specification's file name in shipped text is a dead pointer
    // on every consumer install (the specifications do not ship) and leaks this
    // repository's own workspace into the product. The class is unconditional
    // and mechanically decidable, so it is pinned here; task IDs and phase
    // designators need a mention-versus-use judgment (format documentation is
    // legitimate) and stay with the ventilation scan.
    const specCitations = (text, registered) => {
        const re = new RegExp(`\\b(${registered.join('|')})\\.md\\b`, 'g');
        const hits = [];
        text.split(/\r?\n/).forEach((line, i) => {
            for (const m of line.matchAll(re)) hits.push({ line: i + 1, name: m[0] });
        });
        return hits;
    };

    test('shipped text: the registered-specification citation detector flags and spares correctly', () => {
        const registered = ['l1-alpha', 'l2-beta-gamma'];
        const flagged = specCitations(
            'ok\nsee `l2-beta-gamma.md` §3 and l1-alpha.md.\n',
            registered,
        );
        assert.deepStrictEqual(
            flagged.map((h) => `${h.line}:${h.name}`),
            ['2:l2-beta-gamma.md', '2:l1-alpha.md'],
            'a registered name is flagged wherever it stands, with its line',
        );
        assert.deepStrictEqual(
            specCitations(
                'an example name l1-api.md and l2-alpha-extra.md and l1-alpha.txt',
                registered,
            ),
            [],
            'an unregistered example filename, a longer name and another extension are spared',
        );
    });

    test('shipped text names no specification registered in this workspace', (t) => {
        const specsDir = path.join(shippedRoot, '.magicspec', 'engine', 'specifications');
        if (!fs.existsSync(specsDir)) {
            t.skip('no engine workspace specifications in this checkout');
            return;
        }
        const registered = fs
            .readdirSync(specsDir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => f.slice(0, -'.md'.length));
        const files = [
            ...listShipped('skills/magicspec', ['.md', '.js']),
            ...listShipped('workflows', ['.md']),
            ...listShipped('skills', ['.md']),
            ...listShipped('rules', ['.md']),
        ];
        const found = [];
        for (const rel of files) {
            for (const h of specCitations(readShipped(rel), registered))
                found.push(`${rel}:${h.line} → ${h.name}`);
        }
        assert.deepStrictEqual(
            found,
            [],
            'shipped text must not cite a specification file — restate the rationale in plain language and keep only the protocol label:\n' +
                found.join('\n'),
        );
    });

    // A script command in workflow text names the workspace it runs for: `executor.js`
    // resolves a missing `--workspace` to the default workspace, so an explicit workspace
    // argument reaches the script only through the flag.
    const bareWorkspaceCommands = (files, script) => {
        const command = new RegExp('executor\\.js ' + script + '\\b[^`\\n]*', 'g');
        const seen = [];
        const bare = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                for (const match of line.matchAll(command)) {
                    seen.push(`${rel}:${index + 1}`);
                    if (!match[0].includes('--workspace={active-workspace}')) {
                        bare.push(`${rel}:${index + 1}`);
                    }
                }
            });
        }
        return { seen, bare };
    };

    test('shipped text: every check-prerequisites command in an engine body names its workspace, and the scan flags a bare one when it is planted (T239)', () => {
        const planted = bareWorkspaceCommands(
            [
                {
                    rel: 'planted.md',
                    text: [
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.',
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json`.',
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json --require-tasks --workspace={active-workspace}`.',
                        'Prose that merely names check-prerequisites is not an invocation.',
                    ].join('\n'),
                },
            ],
            'check-prerequisites',
        );
        assert.deepStrictEqual(planted.seen, ['planted.md:1', 'planted.md:2', 'planted.md:3']);
        assert.deepStrictEqual(
            planted.bare,
            ['planted.md:2'],
            'only the command without the flag may be flagged',
        );

        const { seen, bare } = bareWorkspaceCommands(engineBodies(), 'check-prerequisites');
        assert.ok(
            seen.length >= 8,
            `the scan must see every Pre-flight command (saw ${seen.length})`,
        );
        assert.deepStrictEqual(
            bare,
            [],
            'a Pre-flight without --workspace validates the default workspace in place of the one the workflow was given:\n' +
                bare.join('\n'),
        );
    });

    test('shipped text: every finalize command names its workspace, and the scan flags a bare one when it is planted (T241)', () => {
        const planted = bareWorkspaceCommands(
            [
                {
                    rel: 'planted.md',
                    text: [
                        '1. Run `node skills/magicspec/scripts/executor.js finalize --workflow=task --workspace={active-workspace}`.',
                        '1. Run `node skills/magicspec/scripts/executor.js finalize --workflow=run`.',
                        '   node skills/magicspec/scripts/executor.js finalize --workflow=<spec|task|run|rule>',
                        'Prose that merely mentions finalize is not an invocation.',
                    ].join('\n'),
                },
            ],
            'finalize',
        );
        assert.deepStrictEqual(planted.seen, ['planted.md:1', 'planted.md:2', 'planted.md:3']);
        assert.deepStrictEqual(
            planted.bare,
            ['planted.md:2', 'planted.md:3'],
            'a command in a fenced block counts too, and only the flagged one may pass',
        );

        // Workflow bodies (each opens with the entry section that used to be a wrapper) and the ambient rule carry the command.
        const read = (rel) => ({ rel, text: readShipped(rel) });
        const { seen, bare } = bareWorkspaceCommands(
            [...engineBodies(), read('skills/magicspec/AGENT-RULES.md')],
            'finalize',
        );
        assert.ok(
            seen.length >= 8,
            `the scan must see every finalize command (saw ${seen.length})`,
        );
        assert.deepStrictEqual(
            bare,
            [],
            'finalize without --workspace computes significance and writes STATE.md for the default workspace, not the one the workflow ran for:\n' +
                bare.join('\n'),
        );
    });

    test('shipped text: task.md defines the Stable-spec branch of Pre-flight, the demoted-spec rule and the quarantine release (T242, T244)', () => {
        const task = readShipped('skills/magicspec/workflows/task.md');
        const steps = task.slice(task.indexOf('\n### Steps'));

        // Pre-flight runs `--require-specs` before Step 2 can promote anything, so the
        // script's `Stable specs` finding is the normal state of a Draft-only registry.
        const preflight = stepBlock(steps, '1.');
        assert.ok(preflight, 'Step 1 must be found');
        const branchAt = preflight.indexOf('**Stable-Spec Requirement**');
        assert.notStrictEqual(branchAt, -1, 'Pre-flight must define the Stable-Spec Requirement');
        assert.ok(
            branchAt < preflight.indexOf('**T4 Queue'),
            'it must precede the T4 Queue bullet, which covers the gates above it',
        );
        const branch = preflight.slice(branchAt, preflight.indexOf('\n', branchAt));
        for (const needle of [
            '`Stable specs`',
            'Pre-Planning Stabilization',
            'Bootstrap',
            '`Stable specs (0 specs found)`',
            '`/magicspec:spec`',
            '`/magicspec:analyze first-time`',
            '**HALT**',
        ]) {
            assert.ok(branch.includes(needle), `the branch must state ${needle}`);
        }

        // Update mode: a spec demoted after the plan was written, and the way back out.
        const sync = stepBlock(steps, '8.');
        assert.ok(sync, 'Step 8 must be found');
        const demoted = sync.slice(
            sync.indexOf('**Demoted Spec**'),
            sync.indexOf('**Quarantine Release**'),
        );
        assert.ok(demoted.length > 0, 'Step 8 must define Demoted Spec before Quarantine Release');
        for (const needle of [
            '## Backlog',
            '`Done`',
            '`Blocked [!]`',
            'Spec `{file}` is `{status}`',
        ]) {
            assert.ok(demoted.includes(needle), `Demoted Spec must state ${needle}`);
        }
        const release = sync.slice(sync.indexOf('**Quarantine Release**'));
        for (const needle of ['C12', 'Demoted Spec', '`Stable`', 'return to `Todo`']) {
            assert.ok(release.includes(needle), `Quarantine Release must state ${needle}`);
        }
        assert.ok(
            /Preserve recorded task state[^\n]*Quarantine Release/.test(task),
            'the rule that survivors keep their recorded status must name Quarantine Release among the explicit transitions',
        );
    });

    test('the collision rename spec.md prescribes keeps the layer prefix first, so check-prerequisites accepts it (T106)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const documented = spec.match(/`(l1-\{active-workspace\}-auth\.md)`/);
        assert.ok(documented, 'spec.md must show the renamed file with the layer prefix first');
        assert.ok(
            !spec.includes("'{active-workspace}-{file}'"),
            'the workspace name must not lead the file name',
        );

        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeSpecWorkspace(tempDir);
            const prescribed = documented[1].replace('{active-workspace}', 'app');
            const legacyForm = 'app-l1-auth.md';
            for (const name of [prescribed, legacyForm]) {
                fs.writeFileSync(
                    path.join(specsDir, name),
                    '# Auth\n\n**Version:** 1.0.0\n**Status:** Stable\n',
                );
            }
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    `| [${prescribed}](specifications/${prescribed}) | x | Stable | 1 | 1.0.0 |`,
                    `| [${legacyForm}](specifications/${legacyForm}) | y | Stable | 1 | 1.0.0 |`,
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                `# Plan\n- [ ] ([${prescribed}](specifications/${prescribed}), [${legacyForm}](specifications/${legacyForm}))\n`,
            );
            generateChecksums(tempDir);

            const flagged = runCheckPrerequisites(tempDir)
                .warnings.filter((w) => w.type === 'NAMING_VIOLATION')
                .map((w) => w.message.match(/^'([^']+)'/)[1]);
            assert.deepStrictEqual(
                flagged,
                [legacyForm],
                'the name the workflow prescribes passes the Layer Prefix rule; the workspace-first form it replaces does not',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('shipped text: no engine body promises a manual command it has no wrapper for, and Retro L2 names the step that fires it (T247)', () => {
        const promisesManualCommand = (text) => /\bmanual command\b/i.test(text);
        assert.ok(
            promisesManualCommand('| **L2** | Full audit | Plan Complete or manual command |'),
            'the detector must flag the retired wording',
        );
        assert.ok(
            !promisesManualCommand(
                '| **L2** | Full audit | Plan Complete (`run.md` Plan Completion) |',
            ),
            'and spare a trigger that names a step',
        );

        for (const { rel, text } of engineBodies()) {
            assert.ok(
                !promisesManualCommand(text),
                `${rel} advertises a "manual command" that no workflow wrapper provides`,
            );
        }
        const l2 = readShipped('skills/magicspec/references/retrospective.md')
            .split(/\r?\n/)
            .find((line) => line.startsWith('| **L2**'));
        assert.ok(l2, 'the Levels table must carry an L2 row');
        assert.match(
            l2,
            /Plan Complete[^|]*`run\.md` Plan Completion/,
            'the L2 trigger must name the step that fires it',
        );
    });

    test('shipped text: the Consistency Check flags a reference to a Deprecated spec as an advisory, never a HALT (T246)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const table = spec.slice(
            spec.indexOf('### Consistency Check (Pre-flight)'),
            spec.indexOf('## Finalization Protocol'),
        );
        const rows = table.split(/\r?\n/);
        const stale = rows.find((line) => line.startsWith('| **Stale References**'));
        assert.ok(stale, 'the table must carry a Stale References row');
        for (const needle of [
            '`Related Specifications`',
            '`Implements`',
            '`Deprecated`',
            '`STALE_REFERENCE`',
            'advisory',
        ]) {
            assert.ok(stale.includes(needle), `the row must state ${needle}`);
        }
        assert.ok(
            !stale.includes('**HALT**'),
            'a stale reference is reported, never a HALT — it mirrors the Deprecation Cascade report',
        );
        const layer = rows.find((line) => line.startsWith('| Layer Integrity'));
        assert.ok(
            layer?.includes('`Stable`'),
            'Layer Integrity must say the L1 parent has to be Stable, not merely valid (T25)',
        );
    });

    test('shipped text: the C12.1 stabilization exception has a data trigger — the stabilizes flag — in the planning workflow, the constitution and its template (T71)', (t) => {
        const task = readShipped('skills/magicspec/workflows/task.md');
        const steps = task.slice(task.indexOf('\n### Steps'));

        const decompose = stepBlock(steps, '7.');
        assert.ok(decompose, 'Step 7 must be found');
        const setting = decompose.slice(decompose.indexOf('**Stabilizing Tasks'));
        assert.ok(
            setting.startsWith('**Stabilizing Tasks'),
            'Step 7 must define Stabilizing Tasks',
        );
        assert.ok(
            setting.includes('`stabilizes: {spec-file}`'),
            'Step 7 must define how the flag is set',
        );
        assert.ok(
            /explicit/i.test(setting.slice(0, setting.indexOf('\n'))),
            'the flag is set only on an explicit request, never inferred from a title',
        );

        const sync = stepBlock(steps, '8.');
        assert.ok(sync, 'Step 8 must be found');
        const c12 = sync.split(/\r?\n/).find((line) => line.includes('**C12 Quarantine**'));
        assert.ok(c12, 'Step 8 must carry the C12 Quarantine bullet');
        const exception = c12.slice(c12.indexOf('**C12.1 Stabilization Exception**'));
        assert.ok(
            exception.includes('`stabilizes: {spec-file}`') &&
                exception.includes('stays quarantined'),
            'C12.1 in Step 8 must require the flag and keep every other task quarantined',
        );

        // The constitution and the template shipped to consumers state the same exception.
        const clauses = {};
        for (const rel of ['.magicspec/RULES.md', 'skills/magicspec/templates/rules.md']) {
            if (!fs.existsSync(path.join(shippedRoot, rel))) {
                t.skip(`${rel} is not part of this checkout`);
                return;
            }
            clauses[rel] = readShipped(rel)
                .split(/\r?\n/)
                .find((line) => line.startsWith('**C12.1'));
            assert.ok(
                clauses[rel]?.includes('`stabilizes: {spec-file}`'),
                `${rel} C12.1 must name the flag`,
            );
        }
        assert.strictEqual(
            clauses['.magicspec/RULES.md'],
            clauses['skills/magicspec/templates/rules.md'],
            'the constitution and the shipped template must not diverge on C12.1',
        );
    });

    test('shipped text: spec.md queues a T4 rule once, for every HALT of the Sync step (T245)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const updating = spec.slice(spec.indexOf('### Updating an Existing Specification'));
        const sync = stepBlock(updating, '3.');
        assert.ok(sync, 'the Sync step must be found');

        assert.strictEqual(
            sync.split('**T4 Queue**').length - 1,
            1,
            'one T4 Queue statement — a single source, not a copy per guard',
        );
        const queueAt = sync.indexOf('**T4 Queue**');
        assert.ok(queueAt < sync.indexOf('**Version Drift Guard**'), 'it must precede the guards');
        const queue = sync.slice(queueAt, sync.indexOf('\n', queueAt));
        for (const needle of [
            'every HALT',
            'queued pending {reason} resolution',
            '`drift`',
            '`parity`',
            '`file`',
            'RULES.md',
            'rule.md',
        ]) {
            assert.ok(queue.includes(needle), `the T4 Queue rule must state ${needle}`);
        }
        assert.ok(
            !/queued pending (drift|file) resolution/.test(sync),
            'no guard may keep its own copy of the message',
        );
    });

    test('shipped text: the stabilizes flag is honored end to end — by every run guard and role card that demands a Stable spec, and by the Guided Planning Filter (T248, T249)', () => {
        const exception = lineWith(runGuards(), '**Stabilizing exception (C12.1)**');
        assert.ok(exception, 'run.md must define the Stabilizing exception among its Logic Guards');
        for (const needle of [
            '`stabilizes: {spec-file}`',
            'Quarantine (C12)',
            'Spec Stability',
            'Spot-Check',
            'Mid-Run',
            'File-Header Parity',
            'Phantom Spec',
        ]) {
            assert.ok(exception.includes(needle), `the exception must name ${needle}`);
        }

        // The two steps that repeat a guard point back to the exception instead of contradicting it.
        const spot = lineWith(runStep('1.'), '**Spec Stability Spot-Check**');
        assert.ok(spot?.includes('`stabilizes:`'), 'the Spot-Check must except the named spec');
        const midRun = lineWith(runStep('4.'), '**Mid-Run Stability Check**');
        assert.ok(
            midRun?.includes('`stabilizes:`'),
            'the Mid-Run check must use the dispatch baseline',
        );

        const filter = lineWith(readShipped('skills/magicspec/workflows/task.md'), '**Guided Planning Filter**');
        assert.ok(filter, 'task.md must carry the Guided Planning Filter');
        for (const needle of [
            '**Stabilization interaction (C12.1)**',
            'whatever its status',
            '`stabilizes:`',
        ]) {
            assert.ok(filter.includes(needle), `the filter must state ${needle}`);
        }

        // The role cards that repeat a Stable demand follow the same exception — in
        // Parallel mode (the default) the orchestrator's re-read runs before any guard
        // above — and the cards spec carries the two lines verbatim.
        const reread = cardLine('skills/magicspec/roles/orchestrator.md', '5. Between dispatches');
        assert.ok(
            reread?.includes('`stabilizes:`'),
            'the orchestrator re-read must hold a stabilization task to its status at dispatch',
        );
        const readStep = cardLine('skills/magicspec/roles/planner.md', '1. Read all');
        assert.ok(readStep, 'the planner card must open with a Read step');
        assert.ok(
            !readStep.includes('`Stable`'),
            'the planner must read the spec a stabilization task targets, not only Stable ones',
        );
        const cardsSpec = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        for (const line of [reread, readStep]) {
            assert.ok(
                cardsSpec.includes(line),
                `the cards spec must carry the card line verbatim: ${line}`,
            );
        }
    });

    test('shipped text: a [Bootstrap] task passes every guard that demands a Stable spec — in run, in the orchestrator re-read and in the Sync step (T250, T251)', () => {
        const exception = lineWith(runGuards(), '**Bootstrap exception**');
        assert.ok(exception, 'run.md must define the Bootstrap exception among its Logic Guards');
        for (const needle of [
            '`[Bootstrap]`',
            'Task Start',
            'Quarantine (C12)',
            'Spec Stability',
            'Mid-Run',
            'orchestrator',
            'File-Header Parity',
            'Phantom Spec',
        ]) {
            assert.ok(exception.includes(needle), `the exception must name ${needle}`);
        }

        // Step 4 points back to the exception instead of demanding a spec that never was Stable.
        const midRun = lineWith(runStep('4.'), '**Mid-Run Stability Check**');
        assert.ok(
            midRun?.includes('`[Bootstrap]`'),
            'the Mid-Run check must use the Task Start baseline for a Bootstrap task',
        );

        // The orchestrator re-read runs before every guard above in Parallel mode (the default).
        const reread = cardLine('skills/magicspec/roles/orchestrator.md', '5. Between dispatches');
        assert.ok(
            reread?.includes('`[Bootstrap]`'),
            'the orchestrator re-read must hold a Bootstrap task to its status at dispatch',
        );
        const cardsSpec = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        assert.ok(
            cardsSpec.includes(reread),
            `the cards spec must carry the card line verbatim: ${reread}`,
        );

        // Planning side: the Sync step must not return a tentative plan's tasks to Backlog.
        const task = readShipped('skills/magicspec/workflows/task.md');
        const sync = stepBlock(task.slice(task.indexOf('\n### Steps')), '8.');
        const bootstrapTasks = lineWith(sync, '**Bootstrap Tasks**');
        assert.ok(
            bootstrapTasks,
            'task.md Step 8 must define Bootstrap Tasks beside C12 and Demoted Spec',
        );
        for (const needle of [
            '`[Bootstrap]`',
            'C12 Quarantine',
            'Demoted Spec',
            'while its spec is `Draft`',
            'leaves `Draft`',
        ]) {
            assert.ok(bootstrapTasks.includes(needle), `Bootstrap Tasks must state ${needle}`);
        }
        assert.ok(
            sync.indexOf('**Bootstrap Tasks**') < sync.indexOf('**Demoted Spec**'),
            'Bootstrap Tasks must come before Demoted Spec, the rule it limits',
        );
    });

    test('shipped text: /magicspec-dev:test adjudicates and fixes its findings itself — no approval gate, an evidence ladder, one outcome per finding (T252)', () => {
        // Detector: wording that makes a fix wait for the user. C9 allows a question only at its
        // closed gate list, C28 removes every other gate in this repository, and DA-9 calls a
        // proposal with a marked default redundant by construction.
        const approvalGate = /show to user|for yes\/no|after (?:user )?approval|\|approve\|/i;
        for (const gated of [
            'Show to user for Yes/No (C1).',
            'Surgical Patch: Apply precisely after approval.',
            'Changes applied only after user approval.',
            'H -->|Approve| I[C14 Enforcement Gate]',
        ]) {
            assert.ok(approvalGate.test(gated), `the detector must flag: ${gated}`);
        }
        for (const clean of [
            'No approval prompt: only a C27 whitelist entry stops the run for a question.',
            'Apply the winner in the same run.',
        ]) {
            assert.ok(!approvalGate.test(clean), `the detector must spare: ${clean}`);
        }

        const workflow = 'skills/magicspec-dev/workflows/test.md';
        const skill = 'skills/magicspec-dev/workflows/test.md';
        const docs = 'docs/simulate.md';
        for (const rel of [workflow, skill, docs]) {
            assert.ok(
                !approvalGate.test(readShipped(rel)),
                `${rel} must not make a fix wait for approval`,
            );
        }

        // The workflow and the skill generated from it state the ladder, the selection and the record.
        for (const rel of [workflow, skill]) {
            const text = readShipped(rel);
            for (const needle of [
                '**Adjudication**',
                '*Reproduction*',
                '*Dead end*',
                '*Contradiction*',
                '*Reading test*',
                '**Fix Selection**',
                'Exactly one outcome',
                '[DR] {finding}',
            ]) {
                assert.ok(text.includes(needle), `${rel} must state ${needle}`);
            }
        }
        assert.ok(
            readShipped(docs).includes('Adjudication'),
            'the docs page must describe the adjudication',
        );
    });

    test('shipped text: a fork the evidence does not settle is forecast, never asked — no surface hands the user a choice of route, workspace, scan mode or architecture (DA-10)', () => {
        // Detector: the wordings by which a workflow handed such a fork to the user. Each gate
        // now resolves by the Consequence Forecast. Consent questions (E1, E2, E4) and the idea
        // intake survey (E6) are not in the list and must stay untouched.
        const choiceGate = new RegExp(
            [
                'ask (?:the|one) (?:WI-4|multiple-choice)',
                'WI-4 three-option question',
                'HALTs? for (?:user|the) choice',
                'user picks Focused or Quick',
                'Question Only at Ambiguity Gate',
                'single specification-authoring exception',
                'Engineer Posture \\(C25\\) exception',
                'Step 0 ambiguity question',
                'only condition that pauses for user input',
                'Hard-fork ambiguities and Core-Amendment proposals',
            ].join('|'),
            'i',
        );
        for (const gated of [
            'On `ambiguous` → ask the WI-4 three-option question.',
            '>500 files: recommend Focused/Quick. HALT for user choice (C9 Depth Control gate).',
            'Hard-fork ambiguity is the only condition that pauses for user input.',
            'Re-enter the Step 0 ambiguity question (same three-option menu).',
        ]) {
            assert.ok(choiceGate.test(gated), `the detector must flag: ${gated}`);
        }
        for (const clean of [
            'On `ambiguous` → resolve it by the Consequence Forecast (DA-10); nothing is asked.',
            'Core-Amendment proposals (C27 E4) are the only exception that pauses for explicit user input.',
            'Deleting a spec (E1) asks one consent question.',
            '`/magicspec:spec {idea}` may ask before writing specs — one survey round, options from the forecast.',
        ]) {
            assert.ok(!choiceGate.test(clean), `the detector must spare: ${clean}`);
        }

        // A document's history records what used to be true; only its body is shipped behavior.
        const body = (rel) => readShipped(rel).split(/\n## (?:Document History|Sync Note)\b/)[0];
        const surfaces = [
            ...engineBodies().map(({ rel }) => rel),
            ...listShipped('skills/magicspec/roles', ['.md']),
            'skills/magicspec/templates/rules.md',
            'skills/magicspec/AGENT-RULES.md',
            ...listShipped('workflows', ['.md']),
            ...listShipped('skills', ['.md']),
            '.magicspec/RULES.md',
            ...listShipped('docs', ['.md']),
        ];
        for (const rel of surfaces) {
            const hit = body(rel)
                .split(/\r?\n/)
                .find((line) => choiceGate.test(line));
            assert.ok(!hit, `${rel} still hands a fork to the user: ${hit}`);
        }
    });

    test('shipped text: the Consequence Forecast (DA-10) is stated where those forks used to be asked — constitution and template word for word, user rules, routing, intake and scan depth', () => {
        // C27 in the project constitution and in the template every consumer project receives.
        for (const prefix of [
            '2. **Escalation Whitelist (DA-2)**',
            '8. **Consequence Forecast (DA-10)**',
        ]) {
            const project = lineWith(readShipped('.magicspec/RULES.md'), prefix);
            assert.ok(project, `RULES.md C27 must carry ${prefix}`);
            assert.strictEqual(
                lineWith(readShipped('skills/magicspec/templates/rules.md'), prefix),
                project,
                `the shipped template must mirror RULES.md word for word: ${prefix}`,
            );
        }
        const forecast = lineWith(
            readShipped('.magicspec/RULES.md'),
            '8. **Consequence Forecast (DA-10)**',
        );
        for (const needle of [
            'status quo',
            'hedge',
            'Expected',
            'Wrong premise',
            'Boundary',
            'Adversarial',
            'Change later',
            'worst-case',
            'Assumption (forecast)',
            'except at intake',
        ]) {
            assert.ok(forecast.includes(needle), `C27 DA-10 must name ${needle}`);
        }
        const whitelist = lineWith(
            readShipped('.magicspec/RULES.md'),
            '2. **Escalation Whitelist (DA-2)**',
        );
        assert.ok(/consent/.test(whitelist), 'DA-2 must ask for consent');
        assert.ok(
            whitelist.includes('at intake, through E6'),
            'DA-2 must keep the intake survey (E6)',
        );
        assert.ok(
            /E3[^.]*E5[^.]*Consequence Forecast/.test(whitelist),
            'DA-2 must send E3 and E5 to the forecast',
        );

        // C9: the hard fork and the scan-depth gate resolve by the forecast in both constitutions.
        for (const rel of ['.magicspec/RULES.md', 'skills/magicspec/templates/rules.md']) {
            for (const gate of ['3. **Architectural Hard Fork**', '7. **Depth Control Limit**']) {
                assert.ok(
                    lineWith(readShipped(rel), gate)?.includes('DA-10'),
                    `${rel} ${gate} must resolve by DA-10`,
                );
            }
        }

        // The user rules carry the procedure to watching-process agents.
        const rules = readShipped('skills/magicspec/AGENT-RULES.md');
        const start = rules.indexOf('**DA-10 (Consequence Forecast)**');
        assert.ok(start !== -1, 'skills/magicspec/AGENT-RULES.md §7 must state DA-10');
        const bullet = rules.slice(start, rules.indexOf('\n- ', start));
        for (const needle of [
            'hedge',
            'Wrong premise',
            'Adversarial',
            'worst-case',
            'Assumption (forecast)',
        ]) {
            assert.ok(bullet.includes(needle), `skills/magicspec/AGENT-RULES.md DA-10 must name ${needle}`);
        }

        // Routing, intake and scan depth now resolve by the forecast.
        assert.ok(
            lineWith(readShipped('skills/magicspec/references/context.md'), '- `ambiguous` →')?.includes(
                'Consequence Forecast',
            ),
            'context.md must route an ambiguous signal to the forecast',
        );
        // The intake survey (E6): two gates, forecast-written options with an Other, re-checked free
        // text, a convergent dialogue, delegated answers recorded as premises, the intent statement.
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const intake = spec.slice(spec.indexOf('### Step 0.5'), spec.indexOf('### Explore Mode'));
        for (const needle of [
            'Gate 1 — comprehension',
            'Gate 2 — sufficiency',
            'Consequence Forecast',
            'hedge',
            '**Other: …**',
            'goes back through Gates 1 and 2',
            'strictly smaller',
            '**Assumption (forecast):**',
            '`[Intake] Understood as:',
        ]) {
            assert.ok(intake.includes(needle), `spec.md Step 0.5 must state ${needle}`);
        }
        const e6 = rules.slice(
            rules.indexOf('**E6 (Idea Intake Gate)**'),
            rules.indexOf('### Exemptions', rules.indexOf('**E6 (Idea Intake Gate)**')),
        );
        for (const needle of [
            'may ask before writing',
            'Other',
            'you decide',
            'Assumption (forecast)',
            'never asked',
        ]) {
            assert.ok(e6.includes(needle), `skills/magicspec/AGENT-RULES.md E6 must state ${needle}`);
        }
        assert.ok(
            lineWith(readShipped('skills/magicspec/workflows/analyze.md'), '**>500 files**')?.includes(
                'Consequence Forecast',
            ),
            'analyze.md must choose the scan mode by the forecast',
        );
    });

    test('shipped text: run.md Select takes a task left In Progress by an earlier session before any Todo task, and never one a live track owns (T256)', () => {
        const select = runStep('2.');
        assert.ok(select, 'Step 2 (Select) must be found');
        const rule = select.split(/\r?\n/)[0];

        // The order is the contract: the task left in flight is named first, the Todo search is the
        // fallback, and only then do the three halting branches apply.
        const inFlightAt = rule.indexOf('reads `In Progress`');
        const todoAt = rule.indexOf('locate a `Todo` task');
        assert.notStrictEqual(
            inFlightAt,
            -1,
            'Select must name the `In Progress` task it takes first',
        );
        assert.notStrictEqual(
            todoAt,
            -1,
            'Select must keep locating a `Todo` task when nothing is in flight',
        );
        assert.ok(
            inFlightAt < todoAt,
            'the task left in flight must be taken before any `Todo` task',
        );
        assert.ok(
            rule.indexOf('*Stalled*') > todoAt,
            'the halting branches must be evaluated after the selection, not instead of it',
        );
        for (const needle of [
            'no track of this invocation is executing',
            'earlier session',
            'Task Start (2b)',
            'the scope the invocation selects',
        ]) {
            assert.ok(rule.includes(needle), `Select must state ${needle}`);
        }

        // The other half of the contract: Task Start treats an entry already `In Progress` as resumed.
        assert.match(
            runStep('2b.'),
            /already reads `In Progress`[^\n]*resumed/,
            'Task Start must treat an entry that already reads `In Progress` as a task being resumed',
        );
    });

    test('shipped text: task.md ends a phase left with only blocked tasks with the Stalled Plan report instead of a handoff to /magicspec:run (T257)', () => {
        const task = readShipped('skills/magicspec/workflows/task.md');

        // The handoff is conditional on something to run, and names the report it falls back to.
        const handoff = lineWith(task, '**Zero-Prompt handoff**');
        assert.ok(handoff, 'task.md must carry the Zero-Prompt handoff guard');
        for (const needle of ['`Todo` or `In Progress` task', '`Blocked [!]`', 'Stalled Plan']) {
            assert.ok(handoff.includes(needle), `the handoff must state ${needle}`);
        }

        // Step 8 defines the report: its trigger, the single next step, the line a spec gap ends with
        // and the one block the workflow does not lift itself.
        const sync = stepBlock(task.slice(task.indexOf('\n### Steps')), '8.');
        assert.ok(sync, 'Step 8 must be found');
        const stalled = lineWith(sync, '**Stalled Plan**');
        assert.ok(stalled, 'Step 8 must define the Stalled Plan outcome');
        assert.ok(
            sync.indexOf('**Stalled Plan**') > sync.indexOf('**Quarantine Release**'),
            'the outcome must follow the release rule: it judges what the rules above left',
        );
        for (const needle of [
            'no `Todo` or `In Progress` task',
            '≥1 `Blocked [!]`',
            '**HALT** after the plan is written',
            'no handoff to `/magicspec:run`',
            'exactly ONE next step',
            'first blocked task in checklist order',
            'requires design input',
            '`/magicspec:spec`',
            '(C12, Demoted Spec, Phantom Specs)',
            "setting its task's `Status` to `Todo`",
        ]) {
            assert.ok(stalled.includes(needle), `Stalled Plan must state ${needle}`);
        }
        assert.ok(
            task.includes('☐ Stalled Plan:'),
            'the Completion Checklist must cover the Stalled Plan outcome',
        );

        // The recommendation that sends the user here stays the single one, and the run still never
        // names the specification workflow itself.
        const run = readShipped('skills/magicspec/workflows/run.md');
        assert.ok(
            lineWith(run, '*Stalled*:')?.includes(
                'exactly ONE next step: `/magicspec:task {workspace}`',
            ),
            'run.md *Stalled* must keep recommending /magicspec:task as its one next step',
        );
        assert.ok(
            lineWith(run, '*Stalled*:')?.includes('only inside a `/magicspec:task` HALT'),
            'run.md *Stalled* must say the specification workflow surfaces only inside a /magicspec:task HALT',
        );
        assert.ok(
            !/Pre-flight only/.test(run),
            'run.md must not say a blocked spec surfaces in /magicspec:task Pre-flight only: the Stalled Plan HALT of Step 8 is a second surface',
        );
    });

    test('shipped text: a spec ambiguity found in a run takes one route — the single /magicspec:task recommendation — in the debugger card, its mirror and the run page (T258)', () => {
        const card = cardLine('skills/magicspec/roles/debugger.md', '4. For (b)');
        assert.ok(card, 'the debugger card must carry its step for a spec ambiguity');
        for (const needle of [
            '`Notes`',
            '`run.md` Step 4',
            '`/magicspec:task {workspace}`',
            'only inside a `/magicspec:task` HALT',
        ]) {
            assert.ok(card.includes(needle), `the debugger step must state ${needle}`);
        }

        // The stale wordings: a handoff of the session to the specification workflow.
        const toSpec =
            /hand off to `spec\.md`|via `magicspec:spec`|delegate to `magicspec:spec`|jumps to the Spec Workflow/;
        assert.ok(
            !toSpec.test(card),
            'the debugger card must not hand the session to the specification workflow',
        );
        for (const stale of [
            'For (b): hand off to `spec.md` workflow via `magic.spec` to resolve the ambiguity.',
            'If spec is ambiguous → **HALT** and delegate to `magicspec:spec` for update.',
            'A delegated handoff jumps to the Spec Workflow (Explore Mode) where specifications are formally updated.',
        ]) {
            assert.ok(toSpec.test(stale), `the detector must flag: ${stale}`);
        }

        // The card spec carries the deployed card word for word.
        assert.strictEqual(
            lineWith(
                readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md'),
                '4. For (b)',
            ),
            card,
            'the mirror in l2-role-cards-execution.md must match the deployed card word for word',
        );

        // The run page agrees with the workflow body: one command, never the specification workflow.
        const page = readShipped('docs/run.md');
        assert.ok(
            !toSpec.test(page),
            'docs/run.md must not route a run to the specification workflow',
        );
        assert.ok(
            lineWith(page, '- **Handoff**:')?.includes('`/magicspec:task {workspace}`'),
            'the run page must name /magicspec:task as the one handoff',
        );
    });

    test('shipped text: the post-write constitutional conflict report names the rule that is already written and one way to resolve it (T259)', () => {
        const rule = readShipped('skills/magicspec/workflows/rule.md');
        const review = rule.slice(
            rule.indexOf('**Constitutional Review (Post-Write)**'),
            rule.indexOf('## Finalization Protocol'),
        );
        assert.notStrictEqual(review, '', 'the post-write review section must be found');
        const halt = lineWith(review, 'Practical conflict found');
        assert.ok(halt, 'the post-write review must define its HALT');
        for (const needle of ['**HALT**', '(already written)', '`/magicspec:rule amend C{N}`']) {
            assert.ok(halt.includes(needle), `the post-write HALT must state ${needle}`);
        }
        assert.ok(
            !/resolve before writing/i.test(rule),
            'a review that runs after the write must not tell the agent to resolve before writing',
        );
    });


    // ═══════════════════════════════════════════════════════════════════════
    // 24. PROJECT ROOT RESOLUTION — the engine acts on the project it is run in,
    //     from any subdirectory and through a linked engine folder (SP-2, SP-8)
    // ═══════════════════════════════════════════════════════════════════════

    // A script is reached two ways: through the executor, which resolves the
    // root and hands it on, and directly, where the script resolves it itself.
    // Each case runs both, so a script that falls back to its working directory
    // is caught even though the executor would have covered for it.
    const ROOT_MODES = ['executor', 'direct'];

    const runScript = (mode, tempDir, cwd, script, args = [], { designDir = '.magicspec/engine' } = {}) => {
        if (mode === 'executor') {
            return spawnSync(
                process.execPath,
                [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js'), script, ...args],
                { cwd, encoding: 'utf8' },
            );
        }
        const env = { ...process.env };
        delete env.MAGIC_ROOT;
        if (designDir) env.MAGIC_DESIGN_DIR = designDir;
        else delete env.MAGIC_DESIGN_DIR;
        return spawnSync(
            process.execPath,
            [
                path.join(tempDir, 'skills', 'magicspec', 'scripts', `${script}.js`),
                ...args.filter((a) => !a.startsWith('--workspace=')),
            ],
            { cwd, encoding: 'utf8', env },
        );
    };

    // A git fixture holding a registry and one task in flight, plus the nested
    // directory the commands are run from.
    const makeRootFixture = () => {
        const tempDir = createTempWorkspace(true);
        writeResumeFixture(tempDir, {
            engine: { entries: [trackingEntry('T-1A01', 'Probe the root', 'In Progress')] },
        });
        // A registry entry and a source file with a rationale marker: commands that read
        // them see something only when they read the project, not the caller's directory.
        fs.writeFileSync(path.join(tempDir, '.magicspec', 'engine', 'INDEX.md'), '# Registry\n');
        fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
        fs.writeFileSync(
            path.join(tempDir, 'src', 'probe.js'),
            '// WHY: the probe needs a rationale to find\nmodule.exports = 1;\n',
        );
        commitFixture(tempDir);
        const nested = path.join(tempDir, 'a', 'b');
        fs.mkdirSync(nested, { recursive: true });
        return { tempDir, nested };
    };

    // A command run from `a/b` must leave nothing of the project there.
    const assertNoStrayProject = (nested, what) => {
        for (const name of ['.magicspec', '.git', 'skills', 'CHANGELOG.md']) {
            assert.ok(
                !fs.existsSync(path.join(nested, name)),
                `${what} must not create ${name} in the directory it was run from`,
            );
        }
    };

    test('the project root comes from the working context in a fixed order: --root, MAGIC_ROOT, the nearest state folder, the nearest .git, the working directory (SP-2)', () => {
        const { resolveProjectRoot } = require(path.join(scriptsDir, 'utils.js'));
        const base = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-root-'));
        try {
            const dir = (...parts) => {
                const full = path.join(base, ...parts);
                fs.mkdirSync(full, { recursive: true });
                return full;
            };
            dir('proj', '.magicspec');
            const deep = dir('proj', 'a', 'b');
            const gitOnly = dir('gitonly', 'x');
            fs.mkdirSync(path.join(base, 'gitonly', '.git'));
            const bare = dir('bare', 'y');
            const other = dir('other');
            // A nearer state folder wins over a farther .git.
            fs.mkdirSync(path.join(base, 'mix', '.git'), { recursive: true });
            const mixInner = dir('mix', 'inner', 'z');
            fs.mkdirSync(path.join(base, 'mix', 'inner', '.magicspec'));

            const at = (cwd, extra = {}) => resolveProjectRoot({ cwd, env: {}, ...extra });
            assert.strictEqual(at(deep), path.join(base, 'proj'), 'nearest state folder');
            assert.strictEqual(at(gitOnly), path.join(base, 'gitonly'), 'nearest .git');
            assert.strictEqual(at(bare), bare, 'the working directory when nothing marks a project');
            assert.strictEqual(
                at(mixInner),
                path.join(base, 'mix', 'inner'),
                'state folder beats a farther .git',
            );
            assert.strictEqual(
                at(deep, { env: { MAGIC_ROOT: other } }),
                other,
                'MAGIC_ROOT beats the walk',
            );
            assert.strictEqual(
                at(deep, { root: gitOnly, env: { MAGIC_ROOT: other } }),
                gitOnly,
                '--root beats MAGIC_ROOT',
            );
            assert.strictEqual(
                at(path.join(base, 'proj'), { root: '../other' }),
                other,
                'a relative --root is read from the working directory',
            );
            assert.throws(
                () => at(deep, { root: path.join(base, 'missing') }),
                /\(from --root\) is not a directory/,
                'an explicit root that is not a directory stops with one message naming its source',
            );
        } finally {
            cleanup(base);
        }
    });

    test('resume-state, diagnostics, bloat, archival and finalize act on the project from a subdirectory (SP-2)', () => {
        for (const mode of ROOT_MODES) {
            const { tempDir, nested } = makeRootFixture();
            try {
                const run = (cwd, script, args) => runScript(mode, tempDir, cwd, script, args);
                const where = (what) => `${mode}: ${what}`;

                const fromRoot = run(tempDir, 'resume-state', ['--workspace=engine']);
                const fromNested = run(nested, 'resume-state', ['--workspace=engine']);
                assert.strictEqual(fromRoot.status, 0);
                assert.ok(fromRoot.stdout.includes('T-1A01'), where('the task in flight is named'));
                assert.strictEqual(fromNested.stdout, fromRoot.stdout, where('resume-state from a subdirectory'));

                const recorded = run(nested, 'record-diagnostic', [
                    '--severity=warning',
                    '--source=agent',
                    '--code=ROOT_PROBE',
                    '--message=probe',
                ]);
                assert.strictEqual(recorded.status, 0);
                const sink = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
                assert.ok(
                    fs.existsSync(sink) && fs.readFileSync(sink, 'utf8').includes('ROOT_PROBE'),
                    where('the finding lands in the project sink, not beside the caller'),
                );

                for (const [script, args] of [
                    ['check-bloat', []],
                    ['archive-phases', ['--dry-run']],
                ]) {
                    const a = run(tempDir, script, args);
                    const b = run(nested, script, args);
                    assert.strictEqual(b.status, a.status, where(`${script}: same exit status`));
                    assert.strictEqual(b.stdout, a.stdout, where(`${script}: same output`));
                }

                const fin = run(nested, 'finalize', ['--workflow=spec', '--workspace=engine', '--dry-run']);
                assert.strictEqual(fin.status, 0, where(`finalize: ${fin.stdout}${fin.stderr}`));
                assert.ok(!/not found/.test(fin.stdout + fin.stderr), where('finalize finds the state folder'));
                assertNoStrayProject(nested, where('these commands'));
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('the graph scripts read and write the project from a subdirectory: graph, wiki, coverage, communities and rationale (SP-2)', () => {
        for (const mode of ROOT_MODES) {
            const { tempDir, nested } = makeRootFixture();
            try {
                const run = (cwd, script, args) => runScript(mode, tempDir, cwd, script, args);
                const graphOf = (cwd) => JSON.parse(run(cwd, 'build-spec-graph', ['--json']).stdout);
                assert.deepStrictEqual(
                    graphOf(nested).nodes.map((n) => n.id),
                    graphOf(tempDir).nodes.map((n) => n.id),
                    `${mode}: build-spec-graph, same nodes from a subdirectory`,
                );
                assert.ok(graphOf(nested).nodes.some((n) => n.id === 'ws:engine'));

                for (const script of ['analyze-coverage', 'detect-communities', 'extract-rationale']) {
                    const args = script === 'extract-rationale' ? ['--json', '--scope', 'src'] : ['--json'];
                    const a = run(tempDir, script, args);
                    const b = run(nested, script, args);
                    assert.strictEqual(a.status, 0, `${mode}: ${script} from the root: ${a.stderr}`);
                    assert.strictEqual(b.status, a.status, `${mode}: ${script}: same exit status`);
                    assert.deepStrictEqual(
                        JSON.parse(b.stdout),
                        JSON.parse(a.stdout),
                        `${mode}: ${script}: same result from a subdirectory`,
                    );
                    if (script === 'extract-rationale') {
                        assert.ok(
                            b.stdout.includes('probe.js'),
                            `${mode}: the rationale scan covers the project's sources, not the caller's directory`,
                        );
                    }
                }

                const wiki = run(nested, 'export-wiki', []);
                assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
                assert.ok(
                    fs.existsSync(path.join(tempDir, '.magicspec', 'graph', 'wiki', 'index.md')),
                    `${mode}: the wiki is written under the project`,
                );
                assertNoStrayProject(nested, `${mode}: the graph scripts`);
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('installers, writers and rotators put their files in the project when run from a subdirectory: hooks, workspaces, state, context, changelog (SP-2)', () => {
        for (const mode of ROOT_MODES) {
            const { tempDir, nested } = makeRootFixture();
            try {
                const run = (script, args) => runScript(mode, tempDir, nested, script, args);

                const hook = run('install-hooks', []);
                assert.strictEqual(hook.status, 0, hook.stdout + hook.stderr);
                assert.ok(
                    fs.existsSync(path.join(tempDir, '.git', 'hooks', 'pre-commit')),
                    `${mode}: the hook is installed in the repository root`,
                );

                const ws = run('create-workspace', ['--name=ws2']);
                assert.strictEqual(ws.status, 0, ws.stdout + ws.stderr);
                assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'ws2', 'specifications')), mode);

                const state = run('update-state', [
                    '--workspace=engine',
                    '--next-action=Probe from a subdirectory',
                ]);
                assert.strictEqual(state.status, 0, state.stdout + state.stderr);
                assert.ok(
                    fs
                        .readFileSync(path.join(tempDir, '.magicspec', 'engine', 'STATE.md'), 'utf8')
                        .includes('Probe from a subdirectory'),
                    `${mode}: STATE.md of the project is updated`,
                );

                const ctx = run('generate-context', ['--workspace=engine']);
                assert.strictEqual(ctx.status, 0, ctx.stdout + ctx.stderr);
                assert.ok(fs.existsSync(path.join(tempDir, '.magicspec', 'engine', 'CONTEXT.md')), mode);

                fs.writeFileSync(
                    path.join(tempDir, 'CHANGELOG.md'),
                    '# Changelog\n\n## [Unreleased]\n\n### Changed\n\n- a change\n',
                );
                fs.writeFileSync(path.join(tempDir, '.magicspec', '.version'), '0.1.0\n');
                const rel = run('release-changelog', ['--date=2026-01-02']);
                assert.strictEqual(rel.status, 0, rel.stdout + rel.stderr);
                assert.ok(
                    /## \[0\.1\.0\]/.test(fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8')),
                    `${mode}: the changelog of the project is rotated`,
                );
                assertNoStrayProject(nested, `${mode}: these commands`);
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('init in a fresh repository creates the state tree at the repository root, and the pre-flight reads the project from a subdirectory (SP-2)', () => {
        for (const mode of ROOT_MODES) {
            const fresh = createTempWorkspace(true);
            try {
                const nested = path.join(fresh, 'src', 'deep');
                fs.mkdirSync(nested, { recursive: true });
                const init = runScript(mode, fresh, nested, 'init', [], { designDir: null });
                assert.strictEqual(init.status, 0, init.stdout + init.stderr);
                assert.ok(
                    fs.existsSync(path.join(fresh, '.magicspec', 'main', 'specifications')),
                    `${mode}: init creates the state tree at the repository root`,
                );
                assertNoStrayProject(nested, `${mode}: init`);
            } finally {
                cleanup(fresh);
            }

            const { tempDir, nested } = makeRootFixture();
            try {
                const flightOf = (cwd) =>
                    JSON.parse(
                        runScript(mode, tempDir, cwd, 'check-prerequisites', [
                            '--json',
                            '--workspace=engine',
                        ]).stdout,
                    );
                const fromRoot = flightOf(tempDir);
                assert.strictEqual(fromRoot.design_dir, '.magicspec/engine');
                assert.strictEqual(
                    fromRoot.artifacts['INDEX.md'].exists,
                    true,
                    `${mode}: the registry of the project is found`,
                );
                assert.deepStrictEqual(flightOf(nested), fromRoot, `${mode}: same report from a subdirectory`);
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('an engine folder reached through a link still acts on the project it is run in, not on the folder the link leads to (SP-2)', () => {
        const engineHost = createTempWorkspace();
        const project = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-linked-'));
        try {
            // The project holds a link where the engine folder would be; Node resolves
            // the link, so a script's own directory lies in the other tree.
            fs.mkdirSync(path.join(project, 'skills'), { recursive: true });
            fs.symlinkSync(path.join(engineHost, 'skills', 'magicspec'), path.join(project, 'skills', 'magicspec'), 'junction');
            const wsDir = writeResumeFixture(project, {
                engine: { entries: [trackingEntry('T-1A01', 'Linked probe', 'In Progress')] },
            });
            fs.mkdirSync(path.join(wsDir, 'engine', 'specifications'), { recursive: true });
            fs.writeFileSync(
                path.join(wsDir, 'engine', 'specifications', 'big.md'),
                `# Big\n${'line\n'.repeat(600)}`,
            );
            fs.writeFileSync(
                path.join(wsDir, 'engine', 'tasks', 'phase-2.md'),
                '---\nphase: 2\nstatus: Done\n---\n\n## Atomic Checklist\n\n- [x] [T-2A01] Done thing\n',
            );
            const nested = path.join(project, 'a');
            fs.mkdirSync(nested);

            for (const cwd of [project, nested]) {
                const at = path.relative(project, cwd) || 'the root';
                const run = (script, args) => runScript('executor', project, cwd, script, args);

                const resume = run('resume-state', ['--workspace=engine']);
                assert.ok(resume.stdout.includes('T-1A01'), `through a link, from ${at}: resume-state names the task`);

                const fin = run('finalize', ['--workflow=spec', '--workspace=engine', '--dry-run']);
                assert.strictEqual(fin.status, 0, `finalize from ${at}: ${fin.stdout}${fin.stderr}`);
                assert.ok(!/not found/.test(fin.stdout + fin.stderr), `finalize from ${at} finds the project`);

                const archive = run('archive-phases', ['--dry-run']);
                assert.ok(archive.stdout.includes('phase-2.md'), `archive-phases from ${at} sees the project's workbook`);

                const bloat = run('check-bloat', []);
                assert.ok(bloat.stdout.includes('big.md'), `check-bloat from ${at} scans the project's specifications`);

                run('record-diagnostic', [
                    '--severity=warning',
                    '--source=agent',
                    '--code=LINKED_PROBE',
                    '--message=probe',
                ]);
                const sink = path.join(project, '.magicspec', '.cache', 'diagnostics.jsonl');
                assert.ok(
                    fs.existsSync(sink) && fs.readFileSync(sink, 'utf8').includes('LINKED_PROBE'),
                    `through a link, from ${at}: the finding lands in the project sink`,
                );
            }
            assert.ok(
                !fs.existsSync(path.join(engineHost, '.magicspec')),
                'nothing is written into the tree the link leads to',
            );
        } finally {
            try {
                fs.rmdirSync(path.join(project, 'skills', 'magicspec'));
            } catch {
                /* not a link, or already gone */
            }
            cleanup(project);
            cleanup(engineHost);
        }
    });


    test('through the executor, --root names the project and a path typed on the command line is relative to the project (SP-2)', () => {
        const { tempDir, nested } = makeRootFixture();
        const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-elsewhere-'));
        try {
            const named = runScript('executor', tempDir, elsewhere, 'resume-state', [
                '--workspace=engine',
                `--root=${tempDir}`,
            ]);
            assert.strictEqual(named.status, 0, named.stdout + named.stderr);
            assert.ok(named.stdout.includes('T-1A01'), '--root points the command at the project');

            const missing = runScript('executor', tempDir, elsewhere, 'resume-state', [
                `--root=${path.join(elsewhere, 'missing')}`,
            ]);
            assert.strictEqual(missing.status, 1, 'a --root that is not a directory stops the command');
            assert.match(missing.stderr, /HALT: .*\(from --root\) is not a directory/);

            const wiki = runScript('executor', tempDir, nested, 'export-wiki', ['--out', 'out-wiki']);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.ok(
                fs.existsSync(path.join(tempDir, 'out-wiki', 'index.md')),
                'a relative --out is relative to the project, not to the directory the caller stands in',
            );
            assert.ok(!fs.existsSync(path.join(nested, 'out-wiki')));
        } finally {
            cleanup(tempDir);
            cleanup(elsewhere);
        }
    });


    // Blanks the comments of a JavaScript source, keeping string and template
    // literals intact, so a scan can tell a path the code builds from a path a
    // comment mentions. Quotes are tracked per line: a regular-expression literal
    // holding a quote character must not swallow the lines after it.
    const withoutComments = (source) => {
        let inBlock = false;
        return source
            .split('\n')
            .map((line) => {
                let out = '';
                let quote = null;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    const next = line[i + 1];
                    if (inBlock) {
                        if (ch === '*' && next === '/') {
                            inBlock = false;
                            i++;
                        }
                    } else if (quote) {
                        out += ch;
                        if (ch === '\\') {
                            out += next ?? '';
                            i++;
                        } else if (ch === quote) {
                            quote = null;
                        }
                    } else if (ch === '/' && next === '/') {
                        break;
                    } else if (ch === '/' && next === '*') {
                        inBlock = true;
                        i++;
                    } else {
                        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
                        out += ch;
                    }
                }
                return out;
            })
            .join('\n');
    };

    test('no engine script spells the state folder: every path to it is built from the one definition (SP-8)', () => {
        const walk = (dir) =>
            fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) return walk(full);
                return entry.name.endsWith('.js') ? [full] : [];
            });

        const offenders = [];
        for (const file of walk(scriptsDir)) {
            // The definition itself is the one place the name is written.
            if (path.relative(scriptsDir, file) === 'utils.js') continue;
            const code = withoutComments(fs.readFileSync(file, 'utf8'));
            code.split('\n').forEach((line, index) => {
                if (/\.magicspec(?![A-Za-z-])/.test(line)) {
                    offenders.push(`${path.relative(scriptsDir, file)}:${index + 1}: ${line.trim()}`);
                }
            });
        }
        assert.deepStrictEqual(
            offenders,
            [],
            'build state paths from STATE_DIR_NAME or statePath(), never from the literal name',
        );

        // The scan must see a literal where one is: a comment is blanked, a string is not.
        const probe = "const a = '.magicspec/x'; // .magicspec here\n/* .magicspec */ const b = `.magicspec`;";
        assert.deepStrictEqual(
            withoutComments(probe)
                .split('\n')
                .map((l) => /\.magicspec(?![A-Za-z-])/.test(l)),
            [true, true],
            'strings are kept, comments are blanked',
        );
        assert.ok(!/\.magicspec/.test(withoutComments('// .magicspec\n/* .magicspec */')));
    });


    // ═══════════════════════════════════════════════════════════════════════
    // 25. GRAPH FOLDER — everything the graph derives lives under one folder of
    //     the state folder, its paths defined once (graph folder)
    // ═══════════════════════════════════════════════════════════════════════

    const LEGACY_GRAPH_NAMES = [
        '.graph-cache',
        'wiki',
        'spec-graph.html',
        'graph-snapshot.json',
        'graph-before.json',
    ];

    // Lays down the five artifacts as an installation before the graph folder left them.
    const writeLegacyGraph = (tempDir) => {
        const design = path.join(tempDir, '.magicspec');
        fs.mkdirSync(path.join(design, 'wiki'), { recursive: true });
        fs.writeFileSync(path.join(design, 'wiki', 'old.md'), 'stale\n');
        fs.mkdirSync(path.join(design, '.graph-cache'), { recursive: true });
        fs.writeFileSync(path.join(design, '.graph-cache', 'x.json'), '{}');
        fs.writeFileSync(path.join(design, 'spec-graph.html'), '<html>old</html>');
        fs.writeFileSync(path.join(design, 'graph-snapshot.json'), '{"which":"legacy-snapshot"}');
        fs.writeFileSync(path.join(design, 'graph-before.json'), '{"which":"legacy-before"}');
        return design;
    };

    test('the graph folder holds the cache, the wiki, the page and the snapshots, and the paths are defined once (graph folder)', () => {
        const { graphPaths } = require(path.join(scriptsDir, 'utils.js'));
        const design = path.join(path.sep, 'p', '.magicspec');
        const p = graphPaths(design);
        assert.strictEqual(p.dir, path.join(design, 'graph'));
        assert.strictEqual(p.cache, path.join(design, 'graph', '.cache'));
        assert.strictEqual(p.wiki, path.join(design, 'graph', 'wiki'));
        assert.strictEqual(p.html, path.join(design, 'graph', 'graph.html'));
        assert.strictEqual(p.snapshot, path.join(design, 'graph', 'snapshot.json'));
        assert.strictEqual(p.before, path.join(design, 'graph', 'before.json'));
        assert.deepStrictEqual(
            p.legacy.map((x) => path.basename(x)).sort(),
            [...LEGACY_GRAPH_NAMES].sort(),
            'the earlier locations are exactly the five names',
        );

        const { tempDir } = makeRootFixture();
        try {
            const specs = path.join(tempDir, '.magicspec', 'engine', 'specifications');
            fs.mkdirSync(specs, { recursive: true });
            fs.writeFileSync(
                path.join(specs, 'l1-probe.md'),
                '# Probe\n\n**Version:** 1.0.0\n**Status:** Stable\n**Layer:** concept\n\n## Overview\n\nA probe.\n',
            );
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            const page = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(page.status, 0, page.stdout + page.stderr);

            const design2 = path.join(tempDir, '.magicspec');
            assert.ok(fs.existsSync(path.join(design2, 'graph', 'wiki', 'index.md')), 'wiki index');
            assert.ok(fs.existsSync(path.join(design2, 'graph', 'graph.html')), 'page');
            assert.ok(
                fs.readdirSync(path.join(design2, 'graph', '.cache')).length > 0,
                'the extraction cache is populated',
            );
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(!fs.existsSync(path.join(design2, name)), `nothing is written at ${name}`);
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('an installation on the earlier paths ends with only the graph folder: derived files are removed, the baseline snapshots are moved, one line says so (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.match(
                wiki.stdout,
                /^Retired legacy graph artifacts: .*\.graph-cache.*wiki.*$/m,
                'one informational line names what was retired',
            );
            assert.strictEqual(
                wiki.stdout.split('\n').filter((l) => l.startsWith('Retired legacy')).length,
                1,
            );
            for (const name of ['.graph-cache', 'wiki', 'graph-snapshot.json', 'graph-before.json']) {
                assert.ok(!fs.existsSync(path.join(design, name)), `${name} is gone from the old place`);
            }
            assert.ok(fs.existsSync(path.join(design, 'graph', 'wiki', 'index.md')));
            assert.ok(
                !fs.existsSync(path.join(design, 'graph', 'wiki', 'old.md')),
                'the old wiki is not carried over',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'before.json'), 'utf8'),
                '{"which":"legacy-before"}',
                'the baseline is moved, not lost',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'snapshot.json'), 'utf8'),
                '{"which":"legacy-snapshot"}',
            );
            assert.ok(fs.existsSync(path.join(design, 'spec-graph.html')), 'the page waits for its own writer');

            const page = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(page.status, 0, page.stdout + page.stderr);
            assert.ok(!fs.existsSync(path.join(design, 'spec-graph.html')), 'the old page is retired by the new one');
            assert.ok(fs.existsSync(path.join(design, 'graph', 'graph.html')));
        } finally {
            cleanup(tempDir);
        }
    });

    test('a baseline already in the graph folder is kept: the earlier file is removed, never moved over it (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);
            fs.mkdirSync(path.join(design, 'graph'), { recursive: true });
            fs.writeFileSync(path.join(design, 'graph', 'before.json'), '{"which":"current"}');
            const wiki = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.strictEqual(wiki.status, 0, wiki.stdout + wiki.stderr);
            assert.strictEqual(
                fs.readFileSync(path.join(design, 'graph', 'before.json'), 'utf8'),
                '{"which":"current"}',
            );
            assert.ok(!fs.existsSync(path.join(design, 'graph-before.json')));
        } finally {
            cleanup(tempDir);
        }
    });

    test('the earlier files stay when the new write fails, and when the wiki goes to a path the user chose (graph folder)', () => {
        const { tempDir } = makeRootFixture();
        try {
            const design = writeLegacyGraph(tempDir);

            // A custom --out is not the graph folder: nothing is retired.
            const custom = runScript('executor', tempDir, tempDir, 'export-wiki', ['--out', 'my-wiki']);
            assert.strictEqual(custom.status, 0, custom.stdout + custom.stderr);
            assert.ok(fs.existsSync(path.join(tempDir, 'my-wiki', 'index.md')));
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(fs.existsSync(path.join(design, name)), `${name} stays after a custom --out`);
            }

            // A graph folder that cannot be created: the run fails before it retires anything.
            fs.writeFileSync(path.join(design, 'graph'), 'a file where the folder should be');
            const failed = runScript('executor', tempDir, tempDir, 'export-wiki', []);
            assert.notStrictEqual(failed.status, 0, 'the export fails');
            for (const name of LEGACY_GRAPH_NAMES) {
                assert.ok(fs.existsSync(path.join(design, name)), `${name} stays after a failed write`);
            }
            assert.ok(!/Retired legacy/.test(failed.stdout));
        } finally {
            cleanup(tempDir);
        }
    });

    test('no engine script defines a graph path outside utils.js, and no shipped text names the earlier ones (graph folder)', () => {
        const walk = (dir, ext) =>
            fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) return walk(full, ext);
                return entry.name.endsWith(ext) ? [full] : [];
            });

        const codeOffenders = [];
        for (const file of walk(scriptsDir, '.js')) {
            if (path.relative(scriptsDir, file) === 'utils.js') continue;
            withoutComments(fs.readFileSync(file, 'utf8'))
                .split('\n')
                .forEach((line, index) => {
                    if (
                        /path\.join\([^)]*['"`](wiki|\.graph-cache)['"`]|spec-graph\.html|graph-before\.json|graph-snapshot\.json/.test(
                            line,
                        )
                    ) {
                        codeOffenders.push(`${path.relative(scriptsDir, file)}:${index + 1}: ${line.trim()}`);
                    }
                });
        }
        assert.deepStrictEqual(codeOffenders, [], 'build graph paths from graphPaths()');

        const repo = path.resolve(__dirname, '..');
        const shipped = [
            ...walk(path.join(repo, 'skills', 'magicspec'), '.md').map((f) => path.relative(repo, f)),
            ...fs.readdirSync(path.join(repo, 'docs')).filter((f) => f.endsWith('.md')).map((f) => path.join('docs', f)),
            'README.md',
        ];
        const textOffenders = [];
        for (const rel of shipped) {
            fs.readFileSync(path.join(repo, rel), 'utf8')
                .split('\n')
                .forEach((line, index) => {
                    if (/\.magicspec\/wiki|spec-graph\.html|graph-before\.json|graph-snapshot\.json|\.graph-cache|\/\.magicspec\/\*graph\*/.test(line)) {
                        // The README may say which earlier entries a project can keep.
                        if (rel === 'README.md' && /earlier graph paths/.test(line)) return;
                        textOffenders.push(`${rel}:${index + 1}`);
                    }
                });
        }
        assert.deepStrictEqual(textOffenders, [], 'shipped text names the graph folder, not the earlier places');
    });


    // ═══════════════════════════════════════════════════════════════════════
    // 26. SKILL FOLDER — the engine as one folder a host installs (skill folder)
    // ═══════════════════════════════════════════════════════════════════════

    const skillSrc = path.resolve(__dirname, '..', 'skills', 'magicspec');

    // A git repository that holds nothing but what a consumer's project would.
    const makeConsumer = () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-skill-'));
        for (const args of [
            ['init', '-q', '-b', 'master'],
            ['config', 'user.email', 'test@example.com'],
            ['config', 'user.name', 'Test User'],
        ]) {
            spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
        }
        return dir;
    };

    const installSkill = (dir, rel = '.agents/skills/magicspec') => {
        const target = path.join(dir, ...rel.split('/'));
        fs.cpSync(skillSrc, target, { recursive: true });
        return target;
    };

    const skillExec = (skillDir, cwd, script, args = []) =>
        spawnSync(process.execPath, [path.join(skillDir, 'scripts', 'executor.js'), script, ...args], {
            cwd,
            encoding: 'utf8',
        });

    // Links are not followed or listed: a junction is a name, not a second copy of what it leads to.
    const walkFiles = (dir) =>
        fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((e) => !e.isSymbolicLink())
            .flatMap((e) => (e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]));

    // The commands the router lists, from its table.
    const routerRows = () =>
        fs
            .readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8')
            .split(/\r?\n/)
            .map((l) => /^\| `([a-z][a-z-]*)` \| (.+?) \| `workflows\/([a-z-]+)\.md` \|$/.exec(l))
            .filter(Boolean)
            .map((m) => ({ name: m[1], summary: m[2], file: m[3] }));

    test('the router names the skill, fits the host limits and lists exactly the workflows of the folder (skill folder)', () => {
        const syncSkills = require(path.join(devScriptsDir, 'skill-frontmatter.js'));
        const text = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
        const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        assert.ok(block, 'the router opens with a frontmatter block');

        const problems = syncSkills.checkProjection({
            name: 'magicspec',
            frontmatter: block[1],
            synthesized: false,
        });
        assert.deepStrictEqual(problems, [], 'the router meets the validity limits and the selection-signal rules');

        const description = syncSkills.readScalar(block[1], 'description').value;
        assert.ok(description.length <= 1024, `the description is ${description.length} characters, limit 1,024`);

        const rows = routerRows();
        const files = fs
            .readdirSync(path.join(skillSrc, 'workflows'))
            .filter((f) => f.endsWith('.md'))
            .map((f) => path.basename(f, '.md'))
            .sort();
        assert.deepStrictEqual(rows.map((r) => r.name).sort(), files, 'the table and the folder name the same commands');
        for (const row of rows) {
            assert.strictEqual(row.file, row.name, `${row.name}: the row points at workflows/${row.name}.md`);
            assert.ok(
                new RegExp(`\`${row.name}\``).test(description),
                `${row.name}: the description names the command`,
            );
        }
        assert.strictEqual(rows.length, 7);
        assert.ok(!fs.existsSync(path.join(skillSrc, 'workflows', 'context.md')), 'a shared module is not a command');
    });

    test('the text of the skill folder names no earlier place, resolves every link and lists every section in its contents (skill folder)', () => {
        const stripFences = (t) => t.replace(/```[\s\S]*?```/g, '');
        const problems = [];
        for (const file of walkFiles(skillSrc).filter((f) => f.endsWith('.md'))) {
            const rel = path.relative(skillSrc, file).split(path.sep).join('/');
            const text = fs.readFileSync(file, 'utf8');

            text.split('\n').forEach((line, i) => {
                if (/\.magic\/|rules\/magic\.md|workflows\/magic\.|skills\/magic-|\/magic\.(spec|task|run|rule|analyze|status|graph)\b/.test(line)) {
                    problems.push(`${rel}:${i + 1} names an earlier place`);
                }
            });

            if (!rel.startsWith('templates/')) {
                for (const m of stripFences(text).matchAll(/\]\(([^)\s]+)\)/g)) {
                    const target = m[1].split('#')[0];
                    if (!target || /^(https?:|mailto:)/.test(target)) continue;
                    if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
                        problems.push(`${rel}: link ${m[1]} does not resolve inside the folder`);
                    }
                }
            }

            const lines = text.split('\n');
            if ((rel.startsWith('workflows/') || rel.startsWith('references/')) && lines.length > 100) {
                const at = lines.findIndex((l) => l.startsWith('**Contents:**'));
                if (at < 0) {
                    problems.push(`${rel}: over 100 lines and no contents list`);
                    continue;
                }
                const items = [];
                for (let i = at + 1; i < lines.length; i++) {
                    if (lines[i].startsWith('- ')) items.push(lines[i].slice(2).trim());
                    else if (lines[i].trim() === '' && items.length === 0) continue;
                    else break;
                }
                const flat = (t) => t.replace(/[`*]/g, '');
                for (const heading of stripFences(text).split('\n').filter((l) => l.startsWith('## '))) {
                    const h = flat(heading.slice(3).trim());
                    if (!items.some((it) => h.includes(flat(it)) || flat(it).includes(h))) {
                        problems.push(`${rel}: section "${h}" is not in the contents list`);
                    }
                }
            }
        }
        assert.deepStrictEqual(problems, []);
    });

    test('the folder runs wherever a host installs it: from a nested directory, and through a link that keeps its own name (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const real = installSkill(dir);
            const link = path.join(dir, '.claude', 'skills', 'magicspec');
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.symlinkSync(real, link, 'junction');
            const nested = path.join(dir, 'src', 'deep');
            fs.mkdirSync(nested, { recursive: true });

            // init through the link, from a nested directory: the state goes to the repository root
            // and the hook names the link, which is the path this project can run.
            const init = skillExec(link, nested, 'init');
            assert.strictEqual(init.status, 0, init.stdout + init.stderr);
            assert.ok(fs.existsSync(path.join(dir, '.magicspec', 'main', 'specifications')), 'state at the root');
            assert.ok(!fs.existsSync(path.join(nested, '.magicspec')), 'nothing beside the caller');
            const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'utf8');
            assert.match(hook, /node \.claude\/skills\/magicspec\/scripts\/executor\.js update-engine-meta --check/);

            // a hint printed through the real path names the real path
            const viaReal = skillExec(real, nested, 'check-prerequisites', ['--json']);
            const report = JSON.parse(viaReal.stdout);
            const fix = JSON.stringify(report.warnings);
            assert.ok(!fix.includes('.magic/'), 'no hint names the earlier folder');
            assert.strictEqual(report.design_dir, '.magicspec/main');

            // an engine folder shared from outside the project is named by its absolute path
            const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-shared-'));
            const other = makeConsumer();
            try {
                fs.cpSync(skillSrc, path.join(shared, 'magicspec'), { recursive: true });
                const run = skillExec(path.join(shared, 'magicspec'), other, 'init');
                assert.strictEqual(run.status, 0, run.stdout + run.stderr);
                const outside = fs.readFileSync(path.join(other, '.git', 'hooks', 'pre-commit'), 'utf8');
                const executor = path.join(shared, 'magicspec', 'scripts', 'executor.js').split(path.sep).join('/');
                assert.ok(outside.includes(`node ${executor} update-engine-meta --check`), 'the hook names the shared folder by its absolute path');
            } finally {
                cleanup(shared);
                cleanup(other);
            }
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test('init --host writes the rule, the command entries and the skill link for each host, marks them, and writes nothing for an unknown host (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Mine\n\nKeep this.\n');

            const bad = skillExec(skill, dir, 'init', ['--host=claude,zed']);
            assert.strictEqual(bad.status, 1);
            assert.match(bad.stderr, /Unknown host 'zed'\. Known hosts: claude, codex, qwen\./);
            assert.ok(!fs.existsSync(path.join(dir, '.magicspec')) && !fs.existsSync(path.join(dir, '.claude')), 'nothing written');
            assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Mine\n\nKeep this.\n');

            const run = skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);

            const source = fs.readFileSync(path.join(skill, 'AGENT-RULES.md'), 'utf8');
            for (const rel of ['.claude/rules/magicspec.md', '.qwen/rules/magicspec.md']) {
                assert.strictEqual(fs.readFileSync(path.join(dir, rel), 'utf8'), source, `${rel}: a byte copy of the source`);
            }
            assert.ok(source.includes('<!-- magicspec-rule -->'), 'the source carries the marker');

            const rows = routerRows();
            for (const host of ['.claude', '.qwen']) {
                const entries = fs.readdirSync(path.join(dir, host, 'commands', 'magicspec')).sort();
                assert.deepStrictEqual(entries, rows.map((r) => `${r.name}.md`).sort(), `${host}: one entry per command`);
                const task = fs.readFileSync(path.join(dir, host, 'commands', 'magicspec', 'task.md'), 'utf8');
                assert.match(task, /<!-- magicspec-command task -->/);
                assert.match(task, host === '.claude' ? /Arguments: \$ARGUMENTS/ : /Arguments: \{\{args\}\}/);
            }
            assert.ok(!fs.existsSync(path.join(dir, '.codex')), 'Codex has no per-project command entry or folder');

            const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
            assert.ok(agents.startsWith('# Mine\n\nKeep this.\n'), 'the project text is kept');
            assert.match(agents, /<!-- magicspec:begin -->\nBefore any work in this project, read `\.agents\/skills\/magicspec\/AGENT-RULES\.md`/);

            // idempotent
            const before = walkFiles(dir).filter((f) => !f.includes(`${path.sep}.git${path.sep}`)).map((f) => [f, fs.readFileSync(f, 'utf8')]);
            const again = skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            assert.strictEqual(again.status, 0);
            for (const [f, content] of before) assert.strictEqual(fs.readFileSync(f, 'utf8'), content, `${path.relative(dir, f)} unchanged by a second run`);
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test('a file at a projection path that carries no marker is left alone, and a copy that differs from its source is reported stale (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.mkdirSync(path.join(dir, '.claude', 'rules'), { recursive: true });
            fs.mkdirSync(path.join(dir, '.claude', 'commands', 'magicspec'), { recursive: true });
            fs.writeFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'the project\'s own rule\n');
            fs.writeFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'run.md'), 'the project\'s own command\n');

            const run = skillExec(skill, dir, 'init', ['--host=claude']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.match(run.stdout, /Left alone \(not written by this engine\): \.claude\/rules\/magicspec\.md/);
            assert.strictEqual(fs.readFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'utf8'), 'the project\'s own rule\n');
            assert.strictEqual(fs.readFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'run.md'), 'utf8'), 'the project\'s own command\n');
            assert.ok(fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md')), 'the other entries are written');

            // stale: a marked copy edited, and a marked copy whose source changed
            fs.rmSync(path.join(dir, '.claude', 'rules', 'magicspec.md'));
            skillExec(skill, dir, 'init', ['--host=claude']);
            const staleOf = () =>
                JSON.parse(skillExec(skill, dir, 'check-prerequisites', ['--json']).stdout).warnings.filter(
                    (w) => w.type === 'PROJECTION_STALE',
                );
            assert.deepStrictEqual(staleOf(), [], 'a fresh projection is not stale');

            fs.appendFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'edited\n');
            let stale = staleOf();
            assert.strictEqual(stale.length, 1);
            assert.match(stale[0].message, /'\.claude\/rules\/magicspec\.md' differs from its source/);
            assert.match(stale[0].fix, /init --host=claude/);

            skillExec(skill, dir, 'init', ['--host=claude']);
            assert.deepStrictEqual(staleOf(), [], 'init writes the copy again');

            fs.appendFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md'), 'edited\n');
            stale = staleOf();
            assert.strictEqual(stale.length, 1, 'an edited command entry is stale');
            assert.match(stale[0].message, /'\.claude\/commands\/magicspec\/task\.md' differs from its source/);
            skillExec(skill, dir, 'init', ['--host=claude']);
            assert.deepStrictEqual(staleOf(), [], 'init writes the entry again');

            fs.appendFileSync(path.join(skill, 'AGENT-RULES.md'), '\nA new sentence.\n');
            stale = staleOf();
            assert.ok(stale.some((w) => /magicspec\.md/.test(w.message)), 'a changed source makes the copy stale');
        } finally {
            cleanup(dir);
        }
    });

    test('refreshProjections rewrites only the projections that fell behind their source, creates none, and leaves an unmarked file alone (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            // The engine names its own folder relative to the project root, which is read from the
            // environment of the call: refresh as the executor would run it, with the root set.
            const hosts = require(path.join(skill, 'scripts', 'lib', 'hosts.js'));
            const refresh = () => {
                const previous = process.env.MAGIC_ROOT;
                process.env.MAGIC_ROOT = dir;
                try {
                    return hosts.refreshProjections(dir);
                } finally {
                    if (previous === undefined) delete process.env.MAGIC_ROOT;
                    else process.env.MAGIC_ROOT = previous;
                }
            };

            assert.deepStrictEqual(refresh(), [], 'with no projection there is nothing to refresh');
            assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'refreshing creates no projection');

            assert.strictEqual(skillExec(skill, dir, 'init', ['--host=claude,codex']).status, 0);
            assert.deepStrictEqual(refresh(), [], 'a current projection is not rewritten');

            // Hosts whose folders are links to one folder see one file: it is one projection, not a stale one
            // for the host whose argument placeholder differs (this repository's own layout).
            fs.mkdirSync(path.join(dir, '.qwen'), { recursive: true });
            fs.symlinkSync(path.join(dir, '.claude', 'commands'), path.join(dir, '.qwen', 'commands'), 'junction');
            const viaLink = fs.readFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md'), 'utf8');
            assert.deepStrictEqual(refresh(), [], 'a second host reaching the same folder does not make it stale');
            assert.strictEqual(fs.readFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md'), 'utf8'), viaLink, 'and does not rewrite it');
            fs.rmdirSync(path.join(dir, '.qwen', 'commands'));


            // A source that moved on, an edited copy, a command that left the router, and a file that is not ours.
            fs.appendFileSync(path.join(skill, 'AGENT-RULES.md'), '\nA new sentence.\n');
            const taskEntry = path.join(dir, '.claude', 'commands', 'magicspec', 'task.md');
            fs.appendFileSync(taskEntry, 'edited\n');
            const router = path.join(skill, 'SKILL.md');
            fs.writeFileSync(router, fs.readFileSync(router, 'utf8').split('\n').filter((l) => !l.startsWith('| `graph` |')).join('\n'));
            const foreign = path.join(dir, '.claude', 'commands', 'magicspec', 'run.md');
            fs.writeFileSync(foreign, 'the project\'s own command\n');

            const rewritten = refresh().map((r) => r.path).sort();
            assert.ok(rewritten.includes('.claude/rules/magicspec.md'), 'the rule copy follows its source');
            assert.ok(rewritten.includes('.claude/commands/magicspec/task.md'), 'an edited entry is written again');
            assert.ok(rewritten.includes('.claude/commands/magicspec/graph.md'), 'an entry whose command left the router is reported');
            assert.ok(!fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec', 'graph.md')), 'and removed');
            assert.ok(!rewritten.includes('.claude/commands/magicspec/run.md'), 'a file without a marker is not ours');
            assert.strictEqual(fs.readFileSync(foreign, 'utf8'), 'the project\'s own command\n');
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'utf8'),
                fs.readFileSync(path.join(skill, 'AGENT-RULES.md'), 'utf8'),
                'the copy equals its source again',
            );
            assert.deepStrictEqual(refresh(), [], 'after a refresh nothing is left behind');
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test('remove deletes exactly what carries a marker, keeps a project\'s own files and the state, and a dry run changes nothing (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Mine\n');
            skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            fs.mkdirSync(path.join(dir, '.claude', 'rules'), { recursive: true });
            fs.writeFileSync(path.join(dir, '.claude', 'rules', 'other.md'), 'mine\n');
            fs.writeFileSync(path.join(dir, '.claude', 'commands', 'magicspec', 'extra.md'), 'mine\n');

            const snapshot = () =>
                walkFiles(dir).filter((f) => !f.includes(`${path.sep}.git${path.sep}`)).map((f) => path.relative(dir, f)).sort();
            const before = snapshot();
            const dry = skillExec(skill, dir, 'remove', ['--dry-run']);
            assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
            assert.deepStrictEqual(snapshot(), before, 'a dry run changes nothing');
            assert.match(dry.stdout, /Would remove: the managed block in AGENTS\.md/);

            const real = skillExec(skill, dir, 'remove');
            assert.strictEqual(real.status, 0, real.stdout + real.stderr);
            const left = snapshot().map((f) => f.split(path.sep).join('/'));
            assert.ok(left.includes('.claude/rules/other.md'), "the project's own rule stays");
            assert.ok(left.includes('.claude/commands/magicspec/extra.md'), "the project's own command stays");
            assert.ok(left.some((f) => f.startsWith('.magicspec/')), 'the state folder stays');
            assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').trim(), '# Mine', 'the block goes, the text stays');
            assert.ok(!left.some((f) => /magicspec\.md$/.test(f) || f.startsWith('.agents/skills/magicspec/')), 'every marked file and the folder are gone');
            assert.ok(!fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-commit')), 'the hook this engine wrote is gone');
            assert.ok(!fs.existsSync(path.join(dir, '.claude', 'skills', 'magicspec')), 'the skill link is gone');
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* already gone */
            }
            cleanup(dir);
        }
    });

    test('the developer-repository predicate needs both halves: the engine in its place and the manifest builder beside it (skill folder)', () => {
        const probe = (dir, skillRel) => {
            const skill = path.join(dir, ...skillRel.split('/'));
            const out = spawnSync(
                process.execPath,
                ['-e', `process.stdout.write(String(require(${JSON.stringify(path.join(skill, 'scripts', 'utils.js'))}).hasEngineWriteTooling()))`],
                { cwd: dir, encoding: 'utf8' },
            );
            return out.stdout;
        };
        const withBuilder = (dir) => {
            fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'scripts', 'generate-checksums.js'), '// builder\n');
        };

        const repoLike = makeConsumer();
        const installed = makeConsumer();
        const inPlaceNoBuilder = makeConsumer();
        try {
            installSkill(repoLike, 'skills/magicspec');
            withBuilder(repoLike);
            installSkill(installed, '.agents/skills/magicspec');
            withBuilder(installed); // a project with a folder of its own at the maintenance location
            installSkill(inPlaceNoBuilder, 'skills/magicspec');

            assert.strictEqual(probe(repoLike, 'skills/magicspec'), 'true', 'the engine in its place and the builder present');
            assert.strictEqual(probe(installed, '.agents/skills/magicspec'), 'false', 'a host install is not the repository, builder or not');
            assert.strictEqual(probe(inPlaceNoBuilder, 'skills/magicspec'), 'false', 'the place alone is not enough');
        } finally {
            cleanup(repoLike);
            cleanup(installed);
            cleanup(inPlaceNoBuilder);
        }
    });

    test('one manifest covers the whole folder, so an edit to any file of it is a version event (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.rmSync(path.join(skill, '.checksums'), { force: true });
            const build = spawnSync(process.execPath, [path.join(devScriptsDir, 'generate-checksums.js'), '--dir', skill], { encoding: 'utf8' });
            assert.strictEqual(build.status, 0, build.stdout + build.stderr);

            const manifest = JSON.parse(fs.readFileSync(path.join(skill, '.checksums'), 'utf8'));
            for (const rel of ['SKILL.md', 'AGENT-RULES.md', 'workflows/run.md', 'references/context.md', 'roles/coder.md', 'templates/spec.md', 'scripts/utils.js']) {
                assert.ok(rel in manifest, `${rel} is in the manifest`);
            }
            assert.ok(!('.checksums' in manifest) && !('.version' in manifest), 'the manifest and the version are outside it');

            const check = () => skillExec(skill, dir, 'update-engine-meta', ['--check']);
            assert.strictEqual(check().status, 0, 'an untouched folder passes');

            for (const rel of ['SKILL.md', 'AGENT-RULES.md', 'workflows/run.md', 'references/context.md', 'roles/coder.md', 'templates/spec.md', 'scripts/utils.js']) {
                const file = path.join(skill, ...rel.split('/'));
                const original = fs.readFileSync(file);
                fs.appendFileSync(file, '\n');
                const result = check();
                assert.notStrictEqual(result.status, 0, `an edit to ${rel} fails the check`);
                assert.ok((result.stdout + result.stderr).includes(rel), `${rel}: the check names the file`);
                fs.writeFileSync(file, original);
            }
            assert.strictEqual(check().status, 0, 'restored, it passes again');
        } finally {
            cleanup(dir);
        }
    });

    test('the hook names the engine where it is installed, disarms with a line when the folder is gone and blocks drift while it is there (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            const manifest = spawnSync(process.execPath, [path.join(devScriptsDir, 'generate-checksums.js'), '--dir', skill], { encoding: 'utf8' });
            assert.strictEqual(manifest.status, 0, manifest.stdout + manifest.stderr);
            const init = skillExec(skill, dir, 'init');
            assert.strictEqual(init.status, 0, init.stdout + init.stderr);

            const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
            const hook = fs.readFileSync(hookPath, 'utf8');
            assert.match(hook, /node \.agents\/skills\/magicspec\/scripts\/executor\.js update-engine-meta --check/);
            assert.match(hook, /statSync\('\.agents\/skills\/magicspec'\)/);
            // Only a path that does not exist counts as absent; a failure to inspect it counts as present.
            // (Not reachable portably in a fixture: Windows reports a path through a file as missing.)
            assert.match(hook, /process\.exit\(e\.code==='ENOENT'\?3:0\)/);

            const commit = () => {
                fs.writeFileSync(path.join(dir, 'file.txt'), `${Math.random()}\n`);
                spawnSync('git', ['add', 'file.txt'], { cwd: dir });
                return spawnSync('git', ['commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
            };
            const ok = commit();
            assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
            assert.match(ok.stdout + ok.stderr, /Engine in sync/);

            fs.appendFileSync(path.join(skill, 'roles', 'coder.md'), '\n');
            const drift = commit();
            assert.notStrictEqual(drift.status, 0, 'drift in any file of the folder blocks the commit');
            assert.match(drift.stdout + drift.stderr, /Engine drift detected in \.agents\/skills\/magicspec\//);

            fs.rmSync(skill, { recursive: true, force: true });
            const gone = commit();
            assert.strictEqual(gone.status, 0, 'a removed engine lets the commit through');
            const lines = (gone.stdout + gone.stderr).split('\n').filter((l) => l.includes('[Magic Sync]'));
            assert.strictEqual(lines.length, 1);
            assert.match(lines[0], /\(\.agents\/skills\/magicspec\/\) is not installed here, so nothing was checked/);
        } finally {
            cleanup(dir);
        }
    });

    test('the plugin build carries the engine version, one user-invoked skill per command, and refuses a folder that is not its own (skill folder)', () => {
        const out = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-plugin-'));
        const foreign = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-plugin-foreign-'));
        try {
            const target = path.join(out, 'plugin');
            const build = spawnSync(process.execPath, [path.join(skillSrc, 'scripts', 'executor.js'), 'build-plugin', '--out', target], { encoding: 'utf8' });
            assert.strictEqual(build.status, 0, build.stdout + build.stderr);

            const version = fs.readFileSync(path.join(skillSrc, '.version'), 'utf8').trim();
            const manifest = JSON.parse(fs.readFileSync(path.join(target, '.claude-plugin', 'plugin.json'), 'utf8'));
            assert.strictEqual(manifest.name, 'magicspec');
            assert.strictEqual(manifest.version, version, 'the plugin version is the engine version');

            for (const row of routerRows()) {
                const entry = fs.readFileSync(path.join(target, 'skills', row.name, 'SKILL.md'), 'utf8');
                assert.match(entry, new RegExp(`^name: ${row.name}$`, 'm'));
                assert.match(entry, /^disable-model-invocation: true$/m, `${row.name}: kept out of the model's list`);
                assert.match(entry, new RegExp(`workflows/${row.name}\\.md`));
            }
            assert.ok(fs.existsSync(path.join(target, 'skills', 'magicspec', 'SKILL.md')), 'the engine folder is inside the plugin');

            // a second build over its own output succeeds; a folder with other content is refused untouched
            assert.strictEqual(spawnSync(process.execPath, [path.join(skillSrc, 'scripts', 'executor.js'), 'build-plugin', '--out', target], { encoding: 'utf8' }).status, 0);
            fs.writeFileSync(path.join(foreign, 'keep.txt'), 'mine\n');
            const refused = spawnSync(process.execPath, [path.join(skillSrc, 'scripts', 'executor.js'), 'build-plugin', '--out', foreign], { encoding: 'utf8' });
            assert.notStrictEqual(refused.status, 0);
            assert.deepStrictEqual(fs.readdirSync(foreign), ['keep.txt'], 'nothing was written into it');
        } finally {
            cleanup(out);
            cleanup(foreign);
        }
    });


    // ═══════════════════════════════════════════════════════════════════════
    // 27. HARDENING — data read back from the project is data, never a command
    // ═══════════════════════════════════════════════════════════════════════

    test('a recheck takes only the engine\'s own variables: other keys are dropped when a finding is recorded and again when it is run (hardening)', () => {
        const tempDir = createTempWorkspace();
        try {
            writeRevalidateFixture(tempDir);
            const diagnostics = admitRevalidateFixture(requireFromFixture(tempDir, 'lib', 'diagnostics.js'));

            // A script that would leave a mark if a spawned node obeyed NODE_OPTIONS.
            const marker = path.join(tempDir, 'obeyed-node-options.txt');
            const preload = path.join(tempDir, 'preload.js');
            fs.writeFileSync(preload, "require('fs').writeFileSync(" + JSON.stringify(marker) + ", 'x');\n");
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
            assert.deepStrictEqual(stored[0].recheck.env, { MAGIC_FIXTURE_WARNINGS: '[]' }, 'only MAGIC_ keys are stored');

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
            assert.ok(!fs.existsSync(marker), 'a spawned node did not obey NODE_OPTIONS from a finding');
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
            assert.ok(fs.existsSync(path.join(engine, '.version')), 'the engine folder is still there');
            assert.strictEqual(revalidateFixtureCount(tempDir), 0, 'a script outside the allowlist was not spawned');

            // the checker itself still runs, but with neither MAGIC_ROOT nor a state path leaving the project
            admitRevalidateFixture(diagnostics);
            diagnostics.revalidate([
                planted('revalidate-fixture', { MAGIC_ROOT: tempDir, MAGIC_DESIGN_DIR: '../../elsewhere', MAGIC_FIXTURE_WARNINGS: '[]' }),
            ]);
            assert.strictEqual(revalidateFixtureCount(tempDir), 1, 'an admitted script still runs');
            const stored = diagnostics.RECHECK_ENV_KEYS;
            assert.ok(!stored.has('MAGIC_ROOT') && stored.has('MAGIC_DESIGN_DIR'), 'only exact names are allowed');
            diagnostics.record(planted('revalidate-fixture', { MAGIC_ROOT: 'x', MAGIC_DESIGN_DIR: '../../elsewhere', MAGIC_FIXTURE_WARNINGS: '[]' }));
            assert.deepStrictEqual(diagnostics.read()[0].recheck.env, { MAGIC_FIXTURE_WARNINGS: '[]' });
        } finally {
            cleanup(tempDir);
        }
    });

    test('git is asked about a file by argument, so a file name full of shell syntax is only a name (hardening)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const marker = 'pwned-marker';
            // Valid on every platform: spaces, &, $, parentheses, ;, quotes and %.
            const name = "weird & $(touch " + marker + "); 'q' %PATH%.md";
            fs.writeFileSync(path.join(tempDir, name), 'one\n');
            const significance = requireFromFixture(tempDir, 'lib', 'significance.js');
            const gitUtils = requireFromFixture(tempDir, 'lib', 'git-utils.js');

            assert.strictEqual(significance.gitFileStatus(tempDir, name), 'added');
            assert.strictEqual(gitUtils.fileStatus(tempDir, name), 'added');

            gitIn(tempDir, 'add', '-A');
            gitIn(tempDir, 'commit', '-m', 'add the odd file');
            fs.appendFileSync(path.join(tempDir, name), 'two\n');
            assert.strictEqual(significance.gitFileStatus(tempDir, name), 'modified');
            assert.deepStrictEqual(significance.gitFileNumstat(tempDir, name), { added: 1, deleted: 0 });
            assert.deepStrictEqual(gitUtils.fileNumstat(tempDir, name), { added: 1, deleted: 0 });
            assert.ok(significance.gitFileDiff(tempDir, name).includes('+two'), 'the diff of the odd name is read');

            assert.ok(!fs.existsSync(path.join(tempDir, marker)), 'the command inside the name was not run');
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
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'RULES.md'), '## 7. Project Conventions\n\n### C9 — ' + payload + '\n\nA probe.\n');
            const run = runScript('executor', tempDir, tempDir, 'build-spec-graph', ['--html']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            const html = fs.readFileSync(path.join(tempDir, '.magicspec', 'graph', 'graph.html'), 'utf8');

            assert.ok(!html.includes('<img src=x onerror'), 'no raw markup from a title reaches the page');
            assert.ok(html.includes('\\u003c/script\\u003e'), 'the title is in the embedded data, escaped for the script it sits in');
            assert.ok(html.includes('function esc('), 'the page escapes values before it builds markup');
            // Run the page's own escaper over a hostile string: what it returns cannot open a tag or an attribute.
            const escSource = /function esc\(v\) \{[\s\S]*?\n  \}/.exec(html);
            assert.ok(escSource, 'the escaper can be read from the page');
            // The text is the generator's own fixed source, run in an empty context with no access to the harness.
            const escaped = require('vm').runInNewContext(escSource[0] + "; esc('<img src=\"x\" onerror=\\'a\\'>&')");
            assert.strictEqual(
                escaped,
                '&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;&amp;',
                'the escaper encodes & < > " and \''
            );
            for (const site of ['esc(r.label', 'esc(g.label', 'esc(m.label', 'esc(cn ? cn.label : id)']) {
                assert.ok(html.includes(site), site + ' is escaped');
            }
            assert.strictEqual((html.match(/<\/script>/g) || []).length, (html.match(/<script/g) || []).length, 'every script tag closes once, and only where the page does');
        } finally {
            cleanup(tempDir);
        }
    });


    // ───────────────────────────────────────────────────────────────────────────
    // 28. migrate — the 2.x layout to the skill layout (l2-skill-distribution.md §5.6)
    //     The old names are spelled here, as fixtures of the layouts that exist in the field.
    // ───────────────────────────────────────────────────────────────────────────
    const OLD_STATE = '.design';
    const OLD_ENGINE = '.magic';

    // A project laid out as 2.x was: the engine in .magic/ with its manifest, wrappers in workflows/,
    // skills/ and rules/, copies under a host folder, the state in the earlier folder; the new skill installed.
    const legacyProject = ({ manifest = true, hostCopy = true, version = '2.1.100' } = {}) => {
        const dir = makeConsumer();
        const put = (rel, text) => {
            fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
            fs.writeFileSync(path.join(dir, rel), text);
        };
        const sha = (rel) => require('crypto').createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
        put(OLD_ENGINE + '/.version', version);
        put(OLD_ENGINE + '/spec.md', '# spec\n');
        put(OLD_ENGINE + '/scripts/a.js', '// a\n');
        put(OLD_ENGINE + '/templates/t.md', '# t\n');
        if (manifest) {
            const entries = { 'spec.md': sha(OLD_ENGINE + '/spec.md'), 'scripts/a.js': sha(OLD_ENGINE + '/scripts/a.js'), 'templates/t.md': sha(OLD_ENGINE + '/templates/t.md') };
            put(OLD_ENGINE + '/.checksums', JSON.stringify(entries));
        }
        put('workflows/magic.spec.md', 'wrapper\n');
        put('skills/magic-spec/SKILL.md', 'skill wrapper\n');
        put('rules/magic.md', 'old rules\n');
        if (hostCopy) {
            put('.claude/commands/magic.task.md', 'host copy\n');
            put('.claude/rules/magic.md', 'host rules\n');
        }
        put(OLD_STATE + '/workspace.json', JSON.stringify({ default: 'main', workspaces: { main: { scope: [OLD_STATE, 'src'] } } }));
        put(OLD_STATE + '/INDEX.md', '# index\n');
        put(OLD_STATE + '/main/STATE.md', '# state\n');
        put('src/app.js', 'user code\n');
        put('workflows/mine.md', 'the project\'s own workflow\n');
        put('skills/mine/SKILL.md', 'the project\'s own skill\n');
        put('rules/own.md', 'the project\'s own rule\n');
        const skill = installSkill(dir);
        return { dir, skill };
    };
    const snapshot = (dir) =>
        walkFiles(dir)
            .filter((f) => !f.includes(path.sep + '.git' + path.sep) && !f.includes(path.sep + '.agents' + path.sep + 'skills' + path.sep + 'magicspec' + path.sep))
            .sort()
            .map((f) => [path.relative(dir, f), fs.readFileSync(f, 'utf8')]);
    const cleanLink = (dir) => {
        for (const rel of ['.claude/skills/magicspec']) {
            try {
                fs.rmdirSync(path.join(dir, rel));
            } catch {
                /* not a link */
            }
        }
    };

    test('migrate prints the plan and changes nothing without --apply, and a project with nothing to migrate is told so (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const before = snapshot(dir);
            const plan = skillExec(skill, dir, 'migrate');
            assert.strictEqual(plan.status, 0, plan.stdout + plan.stderr);
            assert.match(plan.stdout, /dry run/);
            assert.match(plan.stdout, /\.magic\/spec\.md/);
            assert.match(plan.stdout, /workflows\/magic\.spec\.md/);
            assert.match(plan.stdout, /Rename \.design\/ to \.magicspec\//);
            assert.deepStrictEqual(snapshot(dir), before, 'a dry run changes no file');
            assert.ok(!fs.existsSync(path.join(dir, '.magicspec')) && !fs.existsSync(path.join(dir, 'magicspec-migration-backup-' + new Date().toISOString().slice(0, 10))));
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
        const fresh = makeConsumer();
        try {
            const skill2 = installSkill(fresh);
            const none = skillExec(skill2, fresh, 'migrate');
            assert.strictEqual(none.status, 0);
            assert.match(none.stdout, /Nothing to migrate/);
        } finally {
            cleanup(fresh);
        }
    });

    test('migrate --apply installs the new layout, renames the state, removes exactly the old engine and keeps the project\'s own files; a second run does nothing (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);

            // the state moved, with its entries
            assert.ok(!fs.existsSync(path.join(dir, OLD_STATE)), 'the old state folder is gone');
            assert.ok(fs.existsSync(path.join(dir, '.magicspec', 'main', 'STATE.md')), 'the state arrived whole');
            const ws = JSON.parse(fs.readFileSync(path.join(dir, '.magicspec', 'workspace.json'), 'utf8'));
            assert.deepStrictEqual(ws.workspaces.main.scope, ['.magicspec', 'src'], 'the entries that named the old folder follow it');

            // the old engine is gone, the project's own files are not
            assert.ok(!fs.existsSync(path.join(dir, OLD_ENGINE)), 'the old engine folder is gone');
            for (const rel of ['workflows/magic.spec.md', 'skills/magic-spec/SKILL.md', 'rules/magic.md', '.claude/commands/magic.task.md', '.claude/rules/magic.md']) {
                assert.ok(!fs.existsSync(path.join(dir, rel)), rel + ' is removed');
            }
            for (const rel of ['src/app.js', 'workflows/mine.md', 'skills/mine/SKILL.md', 'rules/own.md']) {
                assert.ok(fs.existsSync(path.join(dir, rel)), rel + ' is kept');
            }

            // the new layout is installed: the rule, the commands, the hook; the removed files are backed up
            assert.ok(fs.existsSync(path.join(dir, '.claude', 'rules', 'magicspec.md')), 'the rule projection is written for the host found');
            assert.ok(fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md')), 'the command entries are written');
            assert.match(fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'utf8'), /\.agents\/skills\/magicspec/);
            const backup = path.join(dir, 'magicspec-migration-backup-' + new Date().toISOString().slice(0, 10));
            assert.ok(fs.existsSync(path.join(backup, '.magic', 'spec.md')) && fs.existsSync(path.join(backup, 'workflows', 'magic.spec.md')), 'the removed files are in the backup');
            assert.match(run.stdout, /Pre-flight/);

            // idempotent
            const after = snapshot(dir);
            const again = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(again.status, 0);
            assert.match(again.stdout, /Nothing to migrate/);
            assert.deepStrictEqual(snapshot(dir), after, 'a second run changes nothing');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate keeps an old engine file the user changed, reports it, and removes the rest (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            fs.appendFileSync(path.join(dir, OLD_ENGINE, 'spec.md'), 'my change\n');
            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.match(run.stdout, /ENGINE_FILE_MODIFIED \.magic\/spec\.md/);
            assert.ok(fs.existsSync(path.join(dir, OLD_ENGINE, 'spec.md')), 'the changed file is kept');
            assert.strictEqual(fs.readFileSync(path.join(dir, OLD_ENGINE, 'spec.md'), 'utf8'), '# spec\nmy change\n');
            assert.ok(!fs.existsSync(path.join(dir, OLD_ENGINE, 'scripts', 'a.js')), 'an unchanged file is removed');
            assert.ok(fs.existsSync(path.join(dir, OLD_ENGINE, '.checksums')), 'the manifest stays beside the file it describes');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate never reads or removes a path an old manifest names outside the old engine folder (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const crypto = require('crypto');
            const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
            const manifestFile = path.join(dir, OLD_ENGINE, '.checksums');
            const entries = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
            // the hash is right, so only the folder boundary can keep this file alive
            entries['../src/app.js'] = sha('user code\n');
            fs.writeFileSync(manifestFile, JSON.stringify(entries));

            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.strictEqual(fs.readFileSync(path.join(dir, 'src', 'app.js'), 'utf8'), 'user code\n');
            assert.ok(!fs.existsSync(path.join(dir, OLD_ENGINE, 'scripts', 'a.js')), 'the honest entries are still removed');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate does not follow a link inside the old engine folder to a file outside it (migration)', () => {
        const { dir, skill } = legacyProject();
        const link = path.join(dir, OLD_ENGINE, 'out');
        try {
            const crypto = require('crypto');
            fs.symlinkSync(path.join(dir, 'src'), link, 'junction');
            const manifestFile = path.join(dir, OLD_ENGINE, '.checksums');
            const entries = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
            // the hash is right and the key stays under the folder by name; only the link leads out
            entries['out/app.js'] = crypto.createHash('sha256').update('user code\n').digest('hex');
            fs.writeFileSync(manifestFile, JSON.stringify(entries));

            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.strictEqual(fs.readFileSync(path.join(dir, 'src', 'app.js'), 'utf8'), 'user code\n');
            assert.ok(!fs.existsSync(path.join(dir, OLD_ENGINE, 'scripts', 'a.js')), 'the honest entries are still removed');
        } finally {
            try {
                fs.unlinkSync(link);
            } catch {
                try {
                    fs.rmdirSync(link);
                } catch {
                    /* already gone */
                }
            }
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate leaves a wrapper alone when its folder is a link that leads out of the project (migration)', () => {
        const { dir, skill } = legacyProject();
        const outside = fs.mkdtempSync(path.join(require('os').tmpdir(), 'magicspec-outside-'));
        const link = path.join(dir, '.claude', 'commands');
        try {
            fs.writeFileSync(path.join(outside, 'magic.task.md'), 'not ours\n');
            fs.rmSync(link, { recursive: true, force: true });
            fs.symlinkSync(outside, link, 'junction');

            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.strictEqual(fs.readFileSync(path.join(outside, 'magic.task.md'), 'utf8'), 'not ours\n');
        } finally {
            try {
                fs.unlinkSync(link);
            } catch {
                try {
                    fs.rmdirSync(link);
                } catch {
                    /* already gone */
                }
            }
            fs.rmSync(outside, { recursive: true, force: true });
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate resumes from the filesystem: after the rename but before the removal, and before the rename with the projections in place (migration)', () => {
        for (const stage of ['renamed', 'projected']) {
            const { dir, skill } = legacyProject();
            try {
                if (stage === 'renamed') {
                    fs.renameSync(path.join(dir, OLD_STATE), path.join(dir, '.magicspec'));
                } else {
                    // the projections of a half-done run, written by the same code
                    const hosts = require(path.join(skill, 'scripts', 'lib', 'hosts.js'));
                    const previous = process.env.MAGIC_ROOT;
                    process.env.MAGIC_ROOT = dir;
                    try {
                        hosts.projectHost('claude', dir);
                    } finally {
                        if (previous === undefined) delete process.env.MAGIC_ROOT;
                        else process.env.MAGIC_ROOT = previous;
                    }
                }
                const run = skillExec(skill, dir, 'migrate', ['--apply']);
                assert.strictEqual(run.status, 0, stage + ': ' + run.stdout + run.stderr);
                assert.ok(fs.existsSync(path.join(dir, '.magicspec', 'main', 'STATE.md')), stage + ': the state is in place');
                assert.ok(!fs.existsSync(path.join(dir, OLD_STATE)) && !fs.existsSync(path.join(dir, OLD_ENGINE)), stage + ': nothing of the old layout is left');
            } finally {
                cleanLink(dir);
                cleanup(dir);
            }
        }
    });

    test('with both state folders the engine stops with one recommended path and touches neither (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            fs.mkdirSync(path.join(dir, '.magicspec'));
            fs.writeFileSync(path.join(dir, '.magicspec', 'marker.txt'), 'new\n');
            const before = snapshot(dir);
            for (const [script, args] of [['migrate', ['--apply']], ['check-prerequisites', ['--json']], ['finalize', ['--workflow=spec']]]) {
                const r = skillExec(skill, dir, script, args);
                assert.strictEqual(r.status, 1, script + ': ' + r.stdout);
                assert.match(r.stderr, /Both \.design\/ and \.magicspec\/ exist/, script);
                assert.match(r.stderr, /migrate/, script + ': it names the way forward');
            }
            assert.deepStrictEqual(snapshot(dir), before, 'neither folder was touched');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('any other command in an unmigrated project stops and says so, and creates no second state folder (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const r = skillExec(skill, dir, 'check-prerequisites', ['--json']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /uses the 2\.x layout/);
            assert.match(r.stderr, /migrate/);
            assert.ok(!fs.existsSync(path.join(dir, '.magicspec')), 'no empty state folder appeared beside the old one');
            // a folder with that name that is not a state folder does not trigger the guard
            const other = makeConsumer();
            try {
                fs.mkdirSync(path.join(other, OLD_STATE));
                fs.writeFileSync(path.join(other, OLD_STATE, 'logo.png'), 'x');
                const skill2 = installSkill(other);
                const ok = skillExec(skill2, other, 'check-prerequisites', ['--json']);
                assert.doesNotMatch(ok.stderr, /2\.x layout/, 'design assets under that name are not a state folder');
            } finally {
                cleanup(other);
            }
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate refuses a layout older than 2.x and names the way, an unknown host stops it, and a missing manifest keeps the engine folder (migration)', () => {
        const old = legacyProject({ version: '1.5.207' });
        try {
            const before = snapshot(old.dir);
            const r = skillExec(old.skill, old.dir, 'migrate', ['--apply']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /2\.x layout only/);
            assert.deepStrictEqual(snapshot(old.dir), before, 'nothing was changed');
        } finally {
            cleanLink(old.dir);
            cleanup(old.dir);
        }

        const host = legacyProject();
        try {
            const r = skillExec(host.skill, host.dir, 'migrate', ['--apply', '--host=zed']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /Unknown host 'zed'/);
            assert.ok(fs.existsSync(path.join(host.dir, OLD_ENGINE, 'spec.md')), 'the old engine is still there: the removal comes last');
        } finally {
            cleanLink(host.dir);
            cleanup(host.dir);
        }

        const bare = legacyProject({ manifest: false });
        try {
            const r = skillExec(bare.skill, bare.dir, 'migrate', ['--apply']);
            assert.strictEqual(r.status, 0, r.stdout + r.stderr);
            assert.match(r.stdout, /ENGINE_MANIFEST_MISSING/);
            assert.ok(fs.existsSync(path.join(bare.dir, OLD_ENGINE, 'spec.md')), 'without a manifest nothing of the engine folder is removed');
            assert.ok(fs.existsSync(path.join(bare.dir, OLD_ENGINE, '.version')), 'and its version file stays too');
            assert.ok(!fs.existsSync(path.join(bare.dir, 'workflows', 'magic.spec.md')), 'the wrappers are still removed');
        } finally {
            cleanLink(bare.dir);
            cleanup(bare.dir);
        }
    });


    // ───────────────────────────────────────────────────────────────────────────
    // 29. The release archive and the packaging invariants (l2-skill-distribution.md §5.5; l1-skill-packaging.md SP-1..SP-10)
    // ───────────────────────────────────────────────────────────────────────────
    const composition = require(path.join(devScriptsDir, 'archive-composition.js'));

    test('the archive holds the skill folder, README and LICENSE and nothing else, and the smoke check refuses what lies outside or is missing (archive)', () => {
        const repo = path.resolve(__dirname, '..');
        const listed = composition.listRelease(repo);
        const inFolder = walkFiles(path.join(repo, 'skills', 'magicspec')).map((f) => path.relative(repo, f).split(path.sep).join('/'));
        const expected = [...['README.md', 'LICENSE'].filter((f) => fs.existsSync(path.join(repo, f))), ...inFolder].sort();
        assert.deepStrictEqual(listed, expected, 'the list is the folder plus the two root files');
        assert.ok(listed.every((f) => composition.isAllowed(f)), 'every listed file is allowed');

        const prefix = 'magic-spec-v9.9.9/';
        const names = listed.map((f) => prefix + f);
        const good = composition.check(names, prefix);
        assert.deepStrictEqual(good, { outside: [], missing: [] }, 'the real list passes');

        for (const stray of ['.magicspec/engine/INDEX.md', 'scripts/sync.js', 'tests/engine.js', 'package.json', 'skills/magicspec-dev/SKILL.md', '.git/config']) {
            const r = composition.check([...names, prefix + stray], prefix);
            assert.deepStrictEqual(r.outside, [prefix + stray], stray + ' is outside the composition');
        }
        assert.deepStrictEqual(composition.check([...names, 'other-v1/README.md'], prefix).outside, ['other-v1/README.md'], 'a path under another prefix is outside');
        const lacking = composition.check(names.filter((n) => !n.endsWith('/.checksums')), prefix);
        assert.deepStrictEqual(lacking.missing, ['skills/magicspec/.checksums'], 'a required file that is missing is named');

        // the command line does the same over stdin
        const cli = spawnSync(process.execPath, [path.join(devScriptsDir, 'archive-composition.js'), 'check', '--prefix', prefix], {
            input: [...names, prefix + 'scripts/sync.js'].join('\n'),
            encoding: 'utf8',
        });
        assert.strictEqual(cli.status, 1);
        assert.match(cli.stderr, /outside the composition: magic-spec-v9\.9\.9\/scripts\/sync\.js/);

        // the workflow builds from this list and runs this check, and names no earlier folder
        const yml = fs.readFileSync(path.join(repo, '.github', 'workflows', 'release.yml'), 'utf8');
        assert.match(yml, /archive-composition\.js list/);
        assert.match(yml, /archive-composition\.js check --prefix/);
        assert.doesNotMatch(yml, /\.magic\/|"workflows"|"rules"/);
    });

    test('the built archive installs, runs from any directory and through a link, projects for every host, updates without touching state, removes what it marked and migrates a 2.x project (SP-1 to SP-10)', () => {
        const repo = path.resolve(__dirname, '..');

        // "Extract" the archive: the listed files only, into a folder of their own.
        const archive = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-archive-'));
        for (const rel of composition.listRelease(repo)) {
            fs.mkdirSync(path.dirname(path.join(archive, rel)), { recursive: true });
            fs.copyFileSync(path.join(repo, rel), path.join(archive, rel));
        }
        const archived = path.join(archive, 'skills', 'magicspec');
        const dir = makeConsumer();
        try {
            // SP-1: one folder is the whole engine; installing it is a copy
            const skill = path.join(dir, '.agents', 'skills', 'magicspec');
            fs.cpSync(archived, skill, { recursive: true });
            assert.ok(fs.existsSync(path.join(skill, 'SKILL.md')) && fs.existsSync(path.join(skill, 'scripts', 'executor.js')), 'SP-1: the copy is complete');

            // SP-9: the shipped folder verifies against its own manifest
            const integrity = skillExec(skill, dir, 'update-engine-meta', ['--check']);
            assert.strictEqual(integrity.status, 0, 'SP-9: ' + integrity.stdout + integrity.stderr);

            // SP-3 and SP-4: every host is projected, and the rule is the same bytes everywhere
            const init = skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            assert.strictEqual(init.status, 0, 'SP-3: ' + init.stdout + init.stderr);
            const source = fs.readFileSync(path.join(skill, 'AGENT-RULES.md'), 'utf8');
            for (const rel of ['.claude/rules/magicspec.md', '.qwen/rules/magicspec.md']) {
                assert.strictEqual(fs.readFileSync(path.join(dir, rel), 'utf8'), source, 'SP-4: ' + rel + ' is a byte copy');
            }

            // SP-5: every router row has its body and every command entry names an existing body
            const bodies = fs.readdirSync(path.join(skill, 'workflows'));
            const rows = fs
                .readFileSync(path.join(skill, 'SKILL.md'), 'utf8')
                .split('\n')
                .map((l) => /^\| `([a-z-]+)` \| .+ \| `workflows\/([a-z-]+\.md)` \|$/.exec(l))
                .filter(Boolean);
            assert.ok(rows.length === bodies.length && rows.every((r) => bodies.includes(r[2])), 'SP-5: the table and the folder agree');
            for (const entry of fs.readdirSync(path.join(dir, '.claude', 'commands', 'magicspec'))) {
                const text = fs.readFileSync(path.join(dir, '.claude', 'commands', 'magicspec', entry), 'utf8');
                const body = /workflows\/([a-z-]+\.md)/.exec(text)[1];
                assert.ok(bodies.includes(body), 'SP-5: ' + entry + ' resolves to ' + body);
            }

            // SP-6: every generated file carries a marker
            for (const rel of ['.claude/rules/magicspec.md', '.claude/commands/magicspec/task.md']) {
                assert.match(fs.readFileSync(path.join(dir, rel), 'utf8'), /<!-- magicspec-(rule|command)/, 'SP-6: ' + rel);
            }
            assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /<!-- magicspec:begin -->/, 'SP-6: the pointer block');

            // SP-2: the same project from a nested directory and through a link
            const nested = path.join(dir, 'src', 'deep');
            fs.mkdirSync(nested, { recursive: true });
            const flight = (from, via) => JSON.parse(skillExec(via, from, 'check-prerequisites', ['--json']).stdout);
            const here = flight(dir, skill);
            assert.deepStrictEqual(flight(nested, skill).design_dir, here.design_dir, 'SP-2: a subdirectory gives the same project');
            assert.deepStrictEqual(flight(nested, path.join(dir, '.claude', 'skills', 'magicspec')).design_dir, here.design_dir, 'SP-2: a link gives the same project');
            assert.ok(!fs.existsSync(path.join(nested, '.magicspec')), 'SP-2: nothing beside the caller');

            // SP-7: an installation is not the developer repository; it cannot bless its own change
            fs.appendFileSync(path.join(skill, 'references', 'init.md'), '\nlocal edit\n');
            const write = skillExec(skill, dir, 'update-engine-meta');
            assert.notStrictEqual(write.status, 0, 'SP-7: the write branch is refused in an installation');
            fs.cpSync(archived, skill, { recursive: true });

            // SP-8: an update touches no state
            const state = (d) => walkFiles(path.join(d, '.magicspec')).map((f) => [path.relative(d, f), fs.readFileSync(f, 'utf8')]).sort();
            const before = state(dir);
            fs.cpSync(archived, skill, { recursive: true });
            assert.strictEqual(skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']).status, 0);
            assert.deepStrictEqual(state(dir), before, 'SP-8: replacing the folder and running init again leaves the state as it was');

            // SP-6 again: remove deletes the marked files and the links, keeps the state
            const removed = skillExec(skill, dir, 'remove');
            assert.strictEqual(removed.status, 0, removed.stdout + removed.stderr);
            assert.ok(!fs.existsSync(path.join(dir, '.claude', 'rules', 'magicspec.md')) && !fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec', 'task.md')), 'SP-6: the projections are gone');
            assert.deepStrictEqual(state(dir), before, 'SP-6: the state is untouched by removal');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }

        // SP-10: a 2.x project is migrated with this very folder, and has an engine at every moment
        const legacy = legacyProject();
        try {
            fs.rmSync(legacy.skill, { recursive: true, force: true });
            fs.cpSync(archived, legacy.skill, { recursive: true });
            const run = skillExec(legacy.skill, legacy.dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, 'SP-10: ' + run.stdout + run.stderr);
            assert.ok(fs.existsSync(path.join(legacy.skill, 'SKILL.md')) && fs.existsSync(path.join(legacy.dir, '.magicspec', 'main', 'STATE.md')), 'SP-10: the new engine and the state are both there when the old engine is gone');
            assert.ok(!fs.existsSync(path.join(legacy.dir, '.magic')), 'SP-10: the old engine is gone');
        } finally {
            cleanLink(legacy.dir);
            cleanup(legacy.dir);
            cleanup(archive);
        }
    });


    test('a working directory spelled with a lowercase drive letter reaches the same folders through a link: the link table and init agree (case)', { skip: process.platform !== 'win32' }, () => {
        const lower = (p) => p[0].toLowerCase() + p.slice(1);
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            const here = lower(dir);
            assert.strictEqual(skillExec(skill, here, 'init', ['--host=claude,codex']).status, 0);

            // the second run finds the link in place, not "another folder"
            const again = skillExec(lower(skill), here, 'init', ['--host=claude,codex']);
            assert.strictEqual(again.status, 0, again.stdout + again.stderr);
            assert.doesNotMatch(again.stdout + again.stderr, /conflict|another folder/i);

            // the link validator, run from the repository under that spelling, sees its links
            const repo = path.resolve(__dirname, '..');
            const out = spawnSync(process.execPath, [path.join(repo, 'scripts', 'validate-hardlinks.js')], {
                cwd: lower(repo),
                encoding: 'utf8',
            });
            assert.doesNotMatch(out.stdout + out.stderr, /Drift: \.agents/, 'a lowercase drive letter is not drift');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

});
