#!/usr/bin/env node
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE: MAGIC ENGINE SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Magic Engine Scripts', () => {
    const scriptsDir = path.resolve(__dirname, '..', '..', '.magic', 'scripts');
    const devScriptsDir = path.resolve(__dirname, '..', 'scripts');

    const createTempWorkspace = (withGit = false) => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-test-'));
        fs.mkdirSync(path.join(tempDir, '.magic'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'scripts'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'scripts', 'lib'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'templates'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'dev'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'dev', 'scripts'), { recursive: true });

        const copyDirShallow = (src, dst) => {
            if (!fs.existsSync(src)) return;
            for (const entry of fs.readdirSync(src)) {
                const srcPath = path.join(src, entry);
                if (fs.statSync(srcPath).isFile()) {
                    fs.copyFileSync(srcPath, path.join(dst, entry));
                }
            }
        };

        copyDirShallow(scriptsDir, path.join(tempDir, '.magic', 'scripts'));
        copyDirShallow(path.join(scriptsDir, 'lib'), path.join(tempDir, '.magic', 'scripts', 'lib'));
        copyDirShallow(devScriptsDir, path.join(tempDir, 'dev', 'scripts'));

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
        const productionScripts = new Set(fs.readdirSync(scriptsDir));
        for (const entry of fs.readdirSync(devScriptsDir)) {
            const src = path.join(devScriptsDir, entry);
            if (!fs.statSync(src).isFile()) continue;
            if (productionScripts.has(entry)) continue;
            if (DEV_ONLY_NEVER_MIRROR.has(entry)) continue;
            fs.copyFileSync(src, path.join(tempDir, '.magic', 'scripts', entry));
        }

        fs.writeFileSync(path.join(tempDir, '.magic', '.version'), '1.0.0');

        if (withGit) {
            try {
                execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
                execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
                execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
                // Initial commit with a baseline file
                fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project\n**Active Development** (v0.0.1)\n');
                execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
                execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
            } catch (e) {
                console.warn('Note: Git initialization failed in test, some tests may skip drift check.');
                console.error(e.message);
            }
        }
        return tempDir;
    };

    const cleanup = (dir) => {
        if (dir && fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            } catch (e) { /* ignore */ }
        }
    };

    // Runs the developer-only checksum manifest builder inside a temp workspace,
    // so scripts gated on engine integrity (check-prerequisites, update-engine-meta)
    // see a consistent .magic/.checksums.
    const generateChecksums = (tempDir) => {
        const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
        execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });
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
    const createFinalizeFixture = (tempDir, { workspace = 'main', version = '0.1.0', autoChangelog = false } = {}) => {
        copyStateTemplate(tempDir);
        const designDir = path.join(tempDir, '.design');
        const wsDir = makeWorkspace(tempDir, workspace);
        fs.writeFileSync(path.join(designDir, 'workspace.json'), JSON.stringify({
            default: workspace,
            finalization: {
                enabled: true, autoBump: true, autoChangelog,
                versionPath: '.design/.version',
            },
        }));
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
        const archiver = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'phase-archiver.js'));
        return { archiver, ...makeWorkspaceWithTasks(tempDir) };
    };

    // Writes a minimal `l1-core.md` spec with a Canonical References entry for
    // `src/`, used by the Invariant 7 gitignore-parity fixtures.
    const writeCanonicalCoreSpec = (tempDir) => {
        const specsDir = path.join(tempDir, '.design', 'specifications');
        fs.mkdirSync(specsDir, { recursive: true });
        fs.writeFileSync(
            path.join(specsDir, 'l1-core.md'),
            '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n'
        );
        return specsDir;
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
                `${name} must not exist inside .magic/ — relocate to dev/.cache/ or .design/.cache/`
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

        assert.ok(fs.existsSync(absPath), `${relPath} must exist — it pins CommonJS for the engine scripts`);

        const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        assert.strictEqual(pkg.type, 'commonjs', `${relPath} must declare "type":"commonjs"`);

        // Untracked → omitted from the release archive → the boundary silently vanishes.
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert
        assert.doesNotThrow(
            () => execSync(`git ls-files --error-unmatch "${relPath}"`, { cwd: repoRoot, stdio: 'pipe' }),
            `${relPath} exists but is UNTRACKED — it will be missing from the release archive. Run: git add ${relPath}`
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 2. init.js
    // ───────────────────────────────────────────────────────────────────────────
    test('init.js should initialize .design structure and workspaces', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'init.js');

            // 1. Standard init
            execSync(`node "${scriptPath}"`, { cwd: tempDir, env: { ...process.env, MAGIC_DESIGN_DIR: '.design' } });
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'INDEX.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'RULES.md')));
            assert.ok(fs.existsSync(path.join(tempDir, '.design', 'main', 'INDEX.md')));

            // 2. Workspace init via MAGIC_DESIGN_DIR (as executor.js would do)
            const wsPath = path.join('.design', 'test-ws');
            execSync(`node "${scriptPath}"`, {
                cwd: tempDir,
                env: { ...process.env, MAGIC_DESIGN_DIR: wsPath }
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
            fs.writeFileSync(path.join(templatesDir, 'contributing.md'), '# Contributing v{{VERSION}}\n\n## Rules\n{{rules_block}}\n\n## Registry\n{{registry_block}}');

            // Setup .design content
            fs.mkdirSync(path.join(tempDir, '.design'));
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '## 1. Concept\nRule 1\n## 7. Misc\n');
            fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), '## Workspaces\n| test | desc |\n## Meta\n');

            // Setup docs and workflows for trigger sync test
            const docsDir = path.join(tempDir, 'docs');
            fs.mkdirSync(docsDir);
            fs.writeFileSync(
                path.join(docsDir, 'test-wf.md'),
                '# Test Workflow\n\n**Triggers:** `old-trigger`\n\n**Slash command:** `/old-command`\n\n## Sync Note\n\nSynchronized with engine workflows on 2026-01-01 (v0.0.1).\n'
            );

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir);
            fs.writeFileSync(path.join(workflowsDir, 'magic.test-wf.md'), '---\ndescription: test\n---\n**Triggers:** `new-trigger`, `another-trigger`');

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
            assert.ok(docContent.includes('**Slash command:** `/magic.test-wf`'), 'Doc slash command should be updated');
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
            fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'generate-context.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const contextContent = fs.readFileSync(path.join(tempDir, '.design', 'CONTEXT.md'), 'utf8');
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

            const metaScript = path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js');
            const runCheck = () => {
                try {
                    const stdout = execSync(`node "${metaScript}" --check`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
                    return { failed: false, output: stdout };
                } catch (e) {
                    return { failed: true, output: `${e.stdout || ''}${e.stderr || ''}` };
                }
            };

            // Control — pristine tree must pass (guards against false positives).
            assert.strictEqual(runCheck().failed, false, 'an intact engine must pass --check');

            // `init.js` is tracked in the manifest and not required by update-engine-meta.
            const victim = path.join(tempDir, '.magic', 'scripts', 'init.js');
            assert.ok(fs.existsSync(victim), 'fixture precondition: init.js is present');
            fs.unlinkSync(victim);

            const missing = runCheck();
            assert.ok(missing.failed, 'a manifest entry with no file on disk must fail --check');
            assert.match(missing.output, /scripts\/init\.js/, '--check must name the missing file');

            // Write mode treats the absence as an engine change: bump + regenerate.
            execSync(`node "${metaScript}"`, { cwd: tempDir, stdio: 'pipe' });
            assert.strictEqual(
                fs.readFileSync(path.join(tempDir, '.magic', '.version'), 'utf8').trim(),
                '1.0.1',
                'a removed engine file is a change and must bump the version'
            );
            const regenerated = JSON.parse(fs.readFileSync(path.join(tempDir, '.magic', '.checksums'), 'utf8'));
            assert.ok(!regenerated['scripts/init.js'], 'the regenerated manifest must drop the removed file');
            assert.strictEqual(runCheck().failed, false, 'after regeneration the engine is consistent again');
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
            for (const [tempDir, label] of [[devRepoDir, 'dev-repo'], [consumerDir, 'consumer']]) {
                generateChecksums(tempDir);
                fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), [
                    '# Project Specification Index', '',
                    '**Version:** 1.0.0', '**Status:** Active', '**Engine Version:** 0.0.0', '',
                ].join('\n'));
                // Trigger drift so the write branch runs (same technique as
                // the "should bump version on engine change" case above).
                fs.appendFileSync(path.join(tempDir, '.magic', 'scripts', 'init.js'), `\n// drift ${label}\n`);
            }

            // Consumer fixture: remove the guard script — the one thing that
            // distinguishes "this checkout is the engine's own dev-repo" from
            // "this is a user installation" throughout update-engine-meta.js.
            fs.unlinkSync(path.join(consumerDir, 'dev', 'scripts', 'sync-engine-snapshot.js'));

            // `2>&1`: the consumer-branch message is `console.warn` (stderr),
            // and `execSync`'s return value is stdout only — without merging,
            // the very warning this case exists to pin is silently dropped.
            const runWrite = (tempDir) => execSync(
                `node "${path.join(tempDir, '.magic', 'scripts', 'update-engine-meta.js')}" 2>&1`,
                { cwd: tempDir, encoding: 'utf8' }
            );

            const devOut = runWrite(devRepoDir);
            const devIndex = fs.readFileSync(path.join(devRepoDir, '.design', 'INDEX.md'), 'utf8');
            const devVersion = fs.readFileSync(path.join(devRepoDir, '.magic', '.version'), 'utf8').trim();
            assert.match(
                devIndex, new RegExp(`\\*\\*Engine Version:\\*\\* ${devVersion.replace(/\./g, '\\.')}`),
                'dev-repo: .design/INDEX.md Engine Version must match the freshly-bumped .magic/.version'
            );
            assert.match(devOut, /Engine Version snapshot synced/, 'dev-repo: sync must run and log');

            const consumerOut = runWrite(consumerDir);
            const consumerIndex = fs.readFileSync(path.join(consumerDir, '.design', 'INDEX.md'), 'utf8');
            assert.match(
                consumerIndex, /\*\*Engine Version:\*\* 0\.0\.0/,
                'consumer install: Engine Version snapshot must be untouched'
            );
            assert.match(
                consumerOut, /sync-engine-snapshot\.js not found/,
                'consumer install: the skip must be logged, not silent'
            );
            assert.match(consumerOut, /Engine metadata and version updated/, 'consumer install: the bump itself must still complete');
        } finally {
            cleanup(devRepoDir);
            cleanup(consumerDir);
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

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const output = execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' });
            const result = JSON.parse(output);
            assert.strictEqual(result.ok, true, 'Should pass with all files present and correct checksums');

            // 2. Failure Case - Missing file
            fs.unlinkSync(path.join(tempDir, '.design', 'INDEX.md'));
            const outputFail = execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' });
            const resultFail = JSON.parse(outputFail);
            assert.strictEqual(resultFail.ok, false, 'Should fail if INDEX.md is missing');
            assert.ok(resultFail.missing_required.includes('INDEX.md'));

            // 3. Drift Case
            fs.writeFileSync(path.join(tempDir, '.design', 'INDEX.md'), '# Index Restored');
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Modified Rules');
            execSync('git add . && git commit -m "Fixed"', { cwd: tempDir, stdio: 'ignore' });

            // Manual edit outside workflow
            fs.writeFileSync(path.join(tempDir, '.design', 'RULES.md'), '# Drifted Rules');
            const outputDrift = execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' });
            const resultDrift = JSON.parse(outputDrift);
            assert.ok(resultDrift.warnings.some(w => w.type === 'CONFIG_DRIFT'), 'Should detect config drift');
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
            const designDir = path.join(tempDir, '.design');
            const specsDir = path.join(designDir, 'specifications');
            fs.mkdirSync(specsDir, { recursive: true });

            const indexRow = '| [auth.md](specifications/auth.md) | Auth domain | Stable | 1 | 1.0.0 |';
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                `# Index\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n${indexRow}\n`
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            // Checksums must pass integrity so ENGINE_INTEGRITY doesn't mask the result.
            generateChecksums(tempDir);

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');

            // Case A — spec file has NO Version/Status header (the silent-failure bug).
            fs.writeFileSync(path.join(specsDir, 'auth.md'), '# Auth\n\n## Overview\n\nNo header here.\n');
            const drift = JSON.parse(execSync(`node "${scriptPath}" --json --verify-headers`, { cwd: tempDir, encoding: 'utf8' }));
            assert.ok(
                drift.warnings.some(w => w.type === 'VERSION_DRIFT' && /MISSING/.test(w.message)),
                'absent Version header must raise VERSION_DRIFT (MISSING)'
            );
            assert.ok(
                drift.warnings.some(w => w.type === 'STATUS_DRIFT' && /MISSING/.test(w.message)),
                'absent Status header must raise STATUS_DRIFT (MISSING)'
            );
            assert.strictEqual(drift.ok, false, 'missing headers must make ok:false, not a silent pass');

            // Case B — correct headers present: no drift (guards against false positives).
            fs.writeFileSync(
                path.join(specsDir, 'auth.md'),
                '# Auth\n\n**Version:** 1.0.0\n**Status:** Stable\n\n## Overview\n\nMatches registry.\n'
            );
            const clean = JSON.parse(execSync(`node "${scriptPath}" --json --verify-headers`, { cwd: tempDir, encoding: 'utf8' }));
            assert.ok(
                !clean.warnings.some(w => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT'),
                'matching headers must produce no drift warning'
            );

            // Case C — backward compatibility: without --verify-headers, absent header is NOT checked.
            fs.writeFileSync(path.join(specsDir, 'auth.md'), '# Auth\n\n## Overview\n\nNo header here.\n');
            const noFlag = JSON.parse(execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }));
            assert.ok(
                !noFlag.warnings.some(w => w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT'),
                'header check must remain opt-in via --verify-headers'
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
            const designDir = path.join(tempDir, '.design');
            const specsDir = path.join(designDir, 'specifications');
            fs.mkdirSync(specsDir, { recursive: true });

            fs.writeFileSync(path.join(specsDir, 'l1-real.md'), '# Real\n\n**Version:** 1.0.0\n**Status:** Stable\n');
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                '# Index\n\n| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |\n'
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
            fs.writeFileSync(path.join(designDir, 'PLAN.md'), [
                '# Plan',
                '- [x] real spec ([l1-real.md](specifications/l1-real.md))',
                '- unquoted mention: specifications/a.md, specifications/b.md in prose',
                '- placeholder note (`main/INDEX.md`, `specifications/{spec.md}`, `other-spec.md`, `tasks/phase-{N}.md`)',
                '',
            ].join('\n'));

            generateChecksums(tempDir);

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const result = JSON.parse(
                execSync(`node "${scriptPath}" --json --require-specs`, { cwd: tempDir, encoding: 'utf8' })
            );

            const mismatches = result.warnings.filter(w => w.type === 'REGISTRY_MISMATCH');
            assert.deepStrictEqual(
                mismatches.map(w => w.message.match(/^'([^']+)'/)[1]).sort(),
                ['a.md', 'b.md'],
                `must report exactly the two unquoted, unregistered files — bounded individually, nothing merged or quoted → ${JSON.stringify(mismatches)}`
            );
            assert.ok(
                !mismatches.some(w => /spec\.md|other-spec|phase-\{N\}|main\/INDEX/.test(w.message)),
                'no quoted placeholder token may appear in a finding, merged or otherwise'
            );
            assert.ok(
                !result.warnings.some(w => w.type === 'ORPHANED_SPEC'),
                'the genuinely-linked real spec must still be recognized as covered'
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
            const designDir = path.join(tempDir, '.design');
            const specsDir = path.join(designDir, 'specifications');
            fs.mkdirSync(specsDir, { recursive: true });

            fs.writeFileSync(path.join(specsDir, 'l1-real.md'), '# Real\n\n**Version:** 1.0.0\n**Status:** Stable\n');

            // Reproduces the field-reported shape (engine 2.1.70): a Meta
            // Information bullet mentions `specifications/` bare (no markdown
            // link), followed later in the same parenthesized bullet by
            // further `.md` mentions and the bullet's closing `)`. The
            // pre-fix `/specifications\/([^)]*\.md)/g` has no newline
            // exclusion and no filename-grammar boundary, so it captured the
            // entire span as a single corrupted "filename". Also includes a
            // genuinely broken registered spec, to prove the fix bounds the
            // capture rather than blinding the check entirely.
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), [
                '# Index',
                '',
                '| [l1-real.md](specifications/l1-real.md) | x | Stable | 1 | 1.0.0 |',
                '| [l1-missing.md](specifications/l1-missing.md) | y | Stable | 1 | 1.0.0 |',
                '',
                '## Meta Information',
                '',
                '- **Last Updated**: see specifications/ for the layout convention; also touches l1-other.md and l2-another.md in passing)',
                '',
            ].join('\n'));
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(path.join(designDir, 'PLAN.md'), '# Plan\n- [x] real spec ([l1-real.md](specifications/l1-real.md))\n');

            generateChecksums(tempDir);

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const result = JSON.parse(
                execSync(`node "${scriptPath}" --json --require-specs --verify-headers`, { cwd: tempDir, encoding: 'utf8' })
            );

            const registryFindings = result.warnings.filter(
                (w) => w.type === 'GHOST_REGISTRY' || w.type === 'NAMING_VIOLATION' || w.type === 'ORPHANED_SPEC'
            );
            assert.ok(
                !registryFindings.some((w) => /layout convention|l2-another|l1-other/.test(w.message)),
                `the bare prose mention must not surface as a finding, corrupted or otherwise → ${JSON.stringify(registryFindings)}`
            );
            assert.ok(
                registryFindings.some((w) => w.type === 'GHOST_REGISTRY' && w.message.includes("'l1-missing.md'")),
                'a genuinely broken registered spec must still be caught — the fix bounds the capture, it does not blind the check'
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
            const designDir = path.join(tempDir, '.design');
            fs.mkdirSync(path.join(designDir, 'specifications'), { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n\n**Version:** 1.0.0\n');
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const findDebtWarning = (planBody, tasksBody) => {
                fs.writeFileSync(path.join(designDir, 'PLAN.md'), `# Plan\n\n## Backlog\n\n${planBody}\n`);
                fs.writeFileSync(path.join(designDir, 'TASKS.md'), `# Tasks\n\n## Active Phases\n\n${tasksBody}\n`);
                const result = JSON.parse(
                    execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' })
                );
                return result.warnings.find((w) => w.type === 'DESIGN_DEBT_PENDING');
            };

            // Positive: plan complete (the engine's own empty-state marker),
            // Backlog holds two open items.
            const hit = findDebtWarning(
                '- Some open design item.\n- Another one.',
                '*None — plan complete. New scope enters via `/magic.task`.*'
            );
            assert.ok(hit, 'a plan-complete state with a non-empty Backlog must raise the signal');
            assert.match(hit.message, /2 open item/, 'the count must reflect the actual number of Backlog bullets');
            assert.match(hit.fix, /magic\.spec/, 'the remedy must point at spec authoring');

            // Negative (load-bearing — SC-2.4 is about *distinguishing* two
            // plan-complete states, so a signal that also fires here would be
            // indistinguishable from one that works): same plan-complete
            // state, empty Backlog.
            assert.strictEqual(
                findDebtWarning('', '*None — plan complete. New scope enters via `/magic.task`.*'),
                undefined,
                'an empty Backlog must never raise the signal, even at plan-complete'
            );

            // Negative: an active phase exists — not plan-complete at all,
            // regardless of what the Backlog holds.
            assert.strictEqual(
                findDebtWarning(
                    '- Some open design item.',
                    '| [Phase 3](tasks/phase-3.md) | Something | `In Progress` |'
                ),
                undefined,
                'an active phase must suppress the signal even with a non-empty Backlog'
            );

            // Negative: ambiguous/unrecognized Active Phases content — the
            // check must default to "cannot determine", not "must be complete".
            assert.strictEqual(
                findDebtWarning('- Some open design item.', 'Some unstructured note, not a table and not the marker.'),
                undefined,
                'unrecognized Active Phases content must not be read as plan-complete'
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
            const designDir = path.join(tempDir, '.design');
            fs.mkdirSync(path.join(designDir, 'specifications'), { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n\n**Version:** 1.0.0\n');
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(
                path.join(designDir, 'TASKS.md'),
                '# Tasks\n\n## Active Phases\n\n*None — plan complete. New scope enters via `/magic.task`.*\n'
            );

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const findDebtWarning = (planBody) => {
                fs.writeFileSync(path.join(designDir, 'PLAN.md'), `# Plan\n\n## Backlog\n\n${planBody}\n`);
                const result = JSON.parse(
                    execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' })
                );
                return result.warnings.find((w) => w.type === 'DESIGN_DEBT_PENDING');
            };

            // One plain bullet, one Parked-marked bullet — only the plain one counts.
            const mixed = findDebtWarning(
                '- Some open design item.\n- Already decided, kept visible. *(Parked — no current demand signal.)*'
            );
            assert.ok(mixed, 'a Backlog with at least one plain bullet must still raise the signal');
            assert.match(mixed.message, /1 open item/, 'the Parked-marked bullet must not be counted');

            // Every bullet Parked — no open items at all, signal must not fire.
            assert.strictEqual(
                findDebtWarning(
                    '- First parked item. *(Parked — revisit only if X.)*\n- Second parked item. *(Parked — monitoring only.)*'
                ),
                undefined,
                'a Backlog composed entirely of Parked bullets must not raise the signal'
            );

            // A bullet that merely mentions the word "Parked" mid-sentence, not
            // as the disposition marker, must still count as open — the
            // exclusion is the specific `*(Parked` marker shape, not the bare word.
            const wordOnly = findDebtWarning('- This item was previously Parked but is open again.');
            assert.ok(wordOnly, 'a bullet using the word "Parked" without the marker shape must still count as open');
            assert.match(wordOnly.message, /1 open item/, 'the bare-word bullet must be counted, not excluded');
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
            const designDir = path.join(tempDir, '.design');
            fs.mkdirSync(path.join(designDir, 'specifications'), { recursive: true });
            fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n\n**Version:** 1.0.0\n');
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'check-prerequisites.js');
            const findDebtWarning = (planBody, tasksBody) => {
                fs.writeFileSync(path.join(designDir, 'PLAN.md'), `# Plan\n\n## Backlog\n\n${planBody}\n`);
                fs.writeFileSync(path.join(designDir, 'TASKS.md'), `# Tasks\n\n## Active Phases\n\n${tasksBody}\n`);
                const result = JSON.parse(
                    execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' })
                );
                return result.warnings.find((w) => w.type === 'DESIGN_DEBT_PENDING');
            };

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
            const hit = findDebtWarning(
                '- Some open design item.\n- Another one.',
                archivedTable
            );
            assert.ok(hit, 'an all-terminal single-table Active Phases must be read as plan-complete, not only the literal empty marker');
            assert.match(hit.message, /2 open item/, 'the count must reflect the actual number of Backlog bullets');

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
                'a non-terminal row anywhere in the table must suppress the signal — the plan is not actually complete'
            );

            // A lone `Cancelled` row is terminal too — must not block the signal.
            const cancelledTable = [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](archives/tasks/phase-1.md) | Abandoned | `Cancelled` |',
            ].join('\n');
            const cancelledHit = findDebtWarning('- Some open design item.', cancelledTable);
            assert.ok(cancelledHit, 'a table of only `Cancelled` rows is terminal and must be read as plan-complete');
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
            const { stripQuoted } = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'scan-hygiene.js'));

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

            assert.strictEqual(outLines.length, input.split('\n').length, 'line count must be preserved');
            assert.doesNotMatch(outLines[2], /- \[ \]/, 'fenced content must not survive');
            assert.doesNotMatch(outLines[4], /- \[ \]/, 'inline-span content must not survive');
            assert.match(outLines[5], /blockquoted - \[ \] item survives/, 'blockquotes are out of scope (§2) and must be untouched');
            assert.match(outLines[6], /HTML comment - \[ \] also survives/, 'HTML comments are out of scope (§2) and must be untouched');
        } finally {
            cleanup(tempDir);
        }
    });

    test('scan-hygiene.js stripQuoted removes fences before spans (a stray backtick inside a fence must not swallow trailing text)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { stripQuoted } = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'scan-hygiene.js'));

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
            assert.match(out, /SENTINEL should survive/, 'fence-first ordering must not let a stray backtick swallow trailing content');
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
                { cwd: tempDir }
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'STATE.md should be created from template');
            const initialState = fs.readFileSync(statePath, 'utf8');
            assert.ok(/\*\*Status:\*\*\s+Active/.test(initialState), 'Status should be patched');
            assert.ok(/\*\*Phase:\*\*\s+1/.test(initialState), 'Phase should be patched');

            // 2. Add decision — should appear under Recent Decisions with today's date
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --decision="Adopt SDD workflow"`,
                { cwd: tempDir }
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
                afterDecision, /## Recent Decisions\r?\n\r?\n<!-- Last 3-5 locked decisions/,
                'the heading must be followed by a blank line, then the comment preamble — not an entry'
            );
            assert.match(
                afterDecision,
                /are dropped \(not archived\) — see PLAN\.md \/ CHANGELOG\.md for phase history\. -->\r?\n\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* Adopt SDD workflow/,
                'the new entry must sit after the comment preamble, not before it'
            );
            // l2-finalize-state-accuracy.md §10: the preamble previously claimed
            // an archival to PLAN.md that no code path ever performed — pin the
            // absence, not only the replacement's presence, so a future edit
            // cannot silently reintroduce the same false promise while still
            // passing the match above (a different string could satisfy the
            // "after the preamble" shape without removing the old claim if a
            // future preamble concatenated both).
            assert.doesNotMatch(
                afterDecision, /archived to PLAN\.md/,
                'the preamble must not claim an archival the code never performs'
            );
            assert.doesNotMatch(
                afterDecision, /\r?\n[ \t]*\r?\n[ \t]*\r?\n/,
                'no run of two or more consecutive blank lines may appear anywhere in STATE.md'
            );
            assert.doesNotMatch(
                afterDecision, /\{YYYY-MM-DD\}/,
                "the template's own placeholder decision rows must not survive alongside a real entry"
            );

            // 3. Add constraint — should be auto-numbered [C-001]
            execSync(
                `node "${scriptPath}" --workspace=${wsDir.replace(/\\/g, '/')} --constraint-title="No Mocks" --constraint-desc="Integration tests only"`,
                { cwd: tempDir }
            );
            const afterConstraint = fs.readFileSync(statePath, 'utf8');
            // Template state.md already contains a [C-001] placeholder, so auto-numbering produces C-002
            assert.ok(
                /\[C-002\].*No Mocks.*Integration tests only/.test(afterConstraint),
                'Constraint entry should be auto-numbered (C-002 given template placeholder)'
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
            const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            // (a) Legacy inline format: open task in TASKS.md → /magic.run.
            fs.writeFileSync(tasksPath, '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n');
            let next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magic\.run engine/, 'inline open task → /magic.run');
            assert.match(next, /T-1A01/, 'should name the open task');

            // (b) Canonical two-level format: TASKS.md is a registry (table),
            //     open tasks live in tasks/phase-1.md.
            fs.writeFileSync(tasksPath, [
                '# Master Task Index',
                '',
                '## Active Phases',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                '',
            ].join('\n'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
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
            ].join('\n'));
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magic\.run engine/, 'canonical two-level: open task in phase file → /magic.run');
            assert.match(next, /T-1A02/, 'should name the open task from phase file');

            // (c) Registry fallback: no open checkboxes anywhere, but registry
            //     shows a non-Done phase → recommend continuing that phase.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
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
            ].join('\n'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /Phase 1/, 'registry fallback: non-Done phase → Continue Phase N');
            assert.match(next, /\/magic\.run/, 'registry fallback recommends /magic.run');

            // (d) Plan complete — no open tasks, all phases Done.
            fs.writeFileSync(tasksPath, [
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
            ].join('\n'));
            // Remove phase file to be clean.
            fs.unlinkSync(path.join(tasksDir, 'phase-1.md'));
            next = finalize.computeNextAction('task', 'engine', wsDir);
            assert.match(next, /\/magic\.task engine/, 'plan complete after task → /magic.task funnel (§5)');
            assert.doesNotMatch(next, /\/magic\.spec/, '/magic.spec must never be named proactively (§5)');
            assert.doesNotMatch(next, /execute the active phase/, 'must not recommend a non-existent phase (the R6 bug)');

            // (d2) Same plan-complete state reached via `run`. The recommendation
            //     is deliberately identical to (d): STATE.md `Next Action` is
            //     workflow-agnostic at read time (/magic.status replays it
            //     verbatim), so a per-branch recommendation would let a line that
            //     is legal for one workflow surface under another.
            assert.strictEqual(
                finalize.computeNextAction('run', 'engine', wsDir),
                next,
                'plan-complete recommendation must not vary by originating workflow'
            );

            // (e) spec/rule → replan first (pipeline order).
            assert.match(finalize.computeNextAction('spec', 'engine', wsDir), /\/magic\.task/, 'spec → /magic.task');
            assert.match(finalize.computeNextAction('rule', 'engine', wsDir), /\/magic\.task/, 'rule → /magic.task');

            // (f) Unreadable TASKS.md → safe planning fallback.
            const voidWs = path.join(tempDir, '.design', 'void');
            assert.match(finalize.computeNextAction('run', 'void', voidWs), /\/magic\.task/, 'missing TASKS.md → /magic.task fallback');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never names a reserved command (§5)', () => {
        const tempDir = createTempWorkspace();
        try {
            const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            // Every plan state the three-tier lookup can land in. The previous
            // regression fixed the plan-complete `run` branch only and left the
            // `task` branch emitting /magic.spec, so this sweeps the full matrix
            // rather than pinning one cell of it.
            const planStates = {
                'inline open task': '## Active Phases\n\n- [ ] [T-1A01] Do the thing\n',
                'registry active phase': [
                    '## Active Phases', '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |', '',
                ].join('\n'),
                'plan complete': [
                    '## Active Phases', '', '*None — plan complete.*', '',
                    '## Completed Phases', '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](archives/tasks/phase-1.md) | Bootstrap | `Done (Archived)` |', '',
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
                        `${workflow} @ ${label}: reserved command leaked into Next Action → "${next}"`
                    );
                    // §5 / DA-6: the user sees exactly ONE next step. STATE.md
                    // `Next Action` is replayed verbatim by /magic.status, so a
                    // second command here becomes a second user-visible option.
                    const commands = next.match(/\/magic\.[a-z.]+/g) || [];
                    assert.strictEqual(
                        commands.length, 1,
                        `${workflow} @ ${label}: expected exactly one command, got ${commands.length} → "${next}"`
                    );
                }
            }

            // Unreadable workspace — the catch-path fallback is bound too.
            const voidNext = finalize.computeNextAction('run', 'void', path.join(tempDir, '.design', 'void'));
            assert.doesNotMatch(voidNext, /\/magic\.(spec|analyze)/, 'catch fallback must stay §5-clean');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js patches STATE.md on the skip path (SC-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { designDir, wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n*None — plan complete.*\n');
            // No whitelisted file changes after this baseline → skip path.
            commitFixture(tempDir);

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });

            assert.match(out, /No significant changes|Finalization complete/, 'finalize should run on the skip path');
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'SC-2: STATE.md created/patched even on the skip path');
            const state = fs.readFileSync(statePath, 'utf8');
            assert.match(state, /\*\*Updated:\*\*/, 'STATE.md carries an Updated timestamp');
            assert.match(state, /\/magic\.task main/, 'SC-2.1 e2e: plan-complete next-action routes through the /magic.task funnel');
            assert.doesNotMatch(state, /Next Action:.*\/magic\.spec/, '§5: the persisted Next Action never names /magic.spec');
            // SC-3 retirement regression pins: the STATE.md write dirties the
            // tree (previously the SC-3 fallback's trigger condition), but no
            // commit-related output is ever emitted any more.
            assert.doesNotMatch(out, /Suggested commit message/i, 'SC-3 retired: no commit suggestion is emitted');
            assert.doesNotMatch(out, /Auto-commit/i, 'SC-3 retired: no auto-commit notice is emitted');
            assert.match(fs.readFileSync(path.join(designDir, '.version'), 'utf8'), /^0\.1\.0$/, 'skip path does not bump the version');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never recommends executing a task in a Blocked phase (SC-2.1(a))', () => {
        const tempDir = createTempWorkspace();
        try {
            const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            const registry = (status) => [
                '# Master Task Index',
                '',
                '## Active Phases',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                `| [Phase 1](tasks/phase-1.md) | Bootstrap | \`${status}\` |`,
                '',
            ].join('\n');

            const phaseFile = (status) => [
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
                fs.writeFileSync(tasksPath, registry(state.registry));
                fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile(state.phase));

                const next = finalize.computeNextAction('run', 'engine', wsDir);
                assert.doesNotMatch(
                    next, /^Execute T-/,
                    `${label}: Blocked phase must not yield an execute-style recommendation → "${next}"`
                );
                assert.match(next, /T-1A01/, `${label}: the blocked task should still be named`);
                // The redirected value passes the same single-exit screen.
                assert.doesNotMatch(next, /\/magic\.(spec|analyze)/, `${label}: §5 reserved command leaked`);
                assert.strictEqual(
                    (next.match(/\/magic\.[a-z.]+/g) || []).length, 1,
                    `${label}: exactly one command expected → "${next}"`
                );
            }

            // Control: an unblocked phase with the same open item still dispatches.
            fs.writeFileSync(tasksPath, registry('In Progress'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('In Progress'));
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir), /^Execute T-1A01/,
                'a healthy phase must still resolve to execution — the guard must not fire on every phase'
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction skips a task whose own Detailed Tracking marks it Blocked or Assignment: User (SC-2.1(c))', () => {
        const tempDir = createTempWorkspace();
        try {
            const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            const registry = () => [
                '# Master Task Index',
                '',
                '## Active Phases',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                '',
            ].join('\n');

            const trackingBlock = (id, title, status, assignment) => [
                `### [${id}] ${title}`,
                '',
                `- **Status:** ${status}`,
                `- **Assignment:** ${assignment}`,
                '',
            ].join('\n');

            const phaseFile = (firstStatus, firstAssignment) => [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '## Atomic Checklist', '',
                '- [ ] [T-1A01] First task',
                '- [ ] [T-1A02] Second task', '',
                '## Detailed Tracking', '',
                trackingBlock('T-1A01', 'First task', firstStatus, firstAssignment),
                trackingBlock('T-1A02', 'Second task', 'Todo', 'Agent'),
            ].join('\n');

            fs.writeFileSync(tasksPath, registry());

            // (i) first item Status: Blocked → the later actionable item is named.
            // The pre-T-23A01 code named T-1A01 unconditionally here (manually
            // confirmed against the single-match lookup during spec authoring —
            // same shape as the Phase 19 R12 negative-control pattern).
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Blocked', 'Agent'));
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A02/, 'a Status: Blocked first item must be skipped for the actionable second item');
            assert.doesNotMatch(next, /T-1A01/, 'the excluded task must not be named as executable');

            // (ii) first item Assignment: User → the later actionable item is named.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'User'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A02/, 'an Assignment: User first item must be skipped for the actionable second item');
            assert.doesNotMatch(next, /T-1A01/, 'the excluded task must not be named as executable');

            // (iii) every open item excluded → terminal branch: not Execute-style,
            // not the plan-complete funnel, no reserved command, exactly one
            // /magic.* command named.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '## Atomic Checklist', '',
                '- [ ] [T-1A01] First task',
                '- [ ] [T-1A02] Second task', '',
                '## Detailed Tracking', '',
                trackingBlock('T-1A01', 'First task', 'Blocked', 'Agent'),
                trackingBlock('T-1A02', 'Second task', 'Todo', 'User'),
            ].join('\n'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(next, /^Execute T-/, 'all-excluded phase must not yield an execute-style recommendation');
            assert.doesNotMatch(next, /Plan complete/, 'all-excluded phase must not be reported as plan-complete — tasks remain');
            assert.doesNotMatch(next, /\/magic\.(spec|analyze)/, 'reserved command must not leak');
            assert.strictEqual(
                (next.match(/\/magic\.[a-z.]+/g) || []).length, 1,
                `exactly one command expected → "${next}"`
            );
            assert.match(next, /T-1A01/, 'the terminal message should still name a task for context');

            // (iv) negative control — everything Todo/Agent still dispatches
            // normally, the same shape as the existing SC-2.1(a) control case.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'Agent'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A01/, 'a fully agent-actionable phase must still dispatch its first task');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction preserves code spans in task titles while still ignoring quoted checklist lines', () => {
        const tempDir = createTempWorkspace();
        try {
            const finalize = require(path.join(tempDir, '.magic', 'scripts', 'finalize.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            fs.writeFileSync(tasksPath, [
                '# Master Task Index', '', '## Active Phases', '',
                '| Phase | Description | Status |', '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |', '',
            ].join('\n'));

            // (i) a title carrying a backticked path must survive verbatim.
            // `stripQuoted()` (SH-1) blanks matched characters rather than
            // removing them — same line count, not same character offsets —
            // so a title read from the stripped text loses the span. This
            // pins the field regression named `NEXT_ACTION_TITLE_STRIPPED`,
            // introduced by the SC-2.1(c) per-item scan itself.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '## Atomic Checklist', '',
                '- [ ] [T-1A01] New `dev/scripts/sync-engine-snapshot.js` (L2 snapshot writer)', '',
            ].join('\n'));
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next, /`dev\/scripts\/sync-engine-snapshot\.js`/,
                `title's code span must survive verbatim → "${next}"`
            );
            assert.doesNotMatch(next, /  /, `no double-space artifact from a blanked span → "${next}"`);

            // (ii) control — the detector must still read stripped text, not
            // raw: a quoted checklist line in prose must not be picked up as
            // a real task. This is the assertion that stops a future fix
            // from reverting to raw content wholesale and reopening SH-1.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '## Atomic Checklist', '',
                '- [ ] [T-1A01] Real actionable task', '',
                '## Notes', '',
                '`- [ ] [T-9Z99] Not a real task, just documentation`', '',
            ].join('\n'));
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
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n- [x] [T-1A01] Done\n');
            fs.writeFileSync(path.join(tempDir, 'dev', 'deliverable.js'), '// baseline\n');
            commitFixture(tempDir);

            // One whitelisted change (TASKS.md status flip) and one outside the
            // whitelist — the shape of every magic.run whose task produced real
            // source changes, since product code is never inside the whitelist.
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] Also done\n');
            fs.writeFileSync(path.join(tempDir, 'dev', 'deliverable.js'), '// the task\'s actual output\n');

            const out = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, { cwd: tempDir, encoding: 'utf8' });

            // (a) Significance is unchanged: the whitelisted file still drives the bump.
            assert.match(out, /Finalization complete/, 'whitelisted change must still be significant');
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(), '0.1.1',
                'the whitelist subset alone must still decide the version bump'
            );

            // (b) The stdout listing names the non-whitelisted file alongside the whitelisted one.
            const artifacts = out.slice(out.indexOf('### Changed artifacts'), out.indexOf('### Next step'));
            assert.match(artifacts, /dev\/deliverable\.js/, 'stdout listing must name the non-whitelisted change');
            assert.match(artifacts, /TASKS\.md/, 'stdout listing must still name the whitelisted change');

            // SC-3 retirement regression pin: no commit-message output at all.
            assert.doesNotMatch(out, /Suggested commit message/i, 'SC-3 retired: no commit suggestion is emitted');
            assert.doesNotMatch(out, /Auto-commit/i, 'SC-3 retired: no auto-commit notice is emitted');
        } finally {
            cleanup(tempDir);
        }
    });

    test('buildChangelogBullet keeps spec identifiers out of the product CHANGELOG (RC-11)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { buildChangelogBullet } = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'commit-suggester.js'));

            // Asserted against the function's return value, not a written
            // CHANGELOG.md — only a real invocation touches that file, and this
            // generator is the only surface where the containment gates cannot
            // reach: nothing here is authored by a role or reviewed as a diff.
            const single = buildChangelogBullet('spec', 'main', [
                { path: '.design/main/specifications/l1-model-runtime.md', status: 'modified' },
            ]);
            assert.doesNotMatch(single, /model-runtime/, 'single-spec branch must not embed the artifact ID');
            assert.match(single, /specification/, 'the bullet must still describe what changed');
            assert.match(single, /\(main\)/, 'the workspace stays in the bullet — it is not an SDD identifier');

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
            assert.doesNotMatch(runBullet, /phase-7/, 'run branch must not embed a task-file identifier');
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
            fs.writeFileSync(path.join(tasksDir, 'phase-20.md'),
                '---\nphase: 20\nname: "Quoting"\nstatus: Done\n---\n\n' +
                '## Atomic Checklist\n\n- [x] [T-20A01] Done item\n\n' +
                '## Detailed Tracking\n\n### [T-20A01]\n- **Notes:** detect open `- [ ]` tasks via regex.\n');

            // (b) Done but a genuine unchecked checklist line → NOT archivable.
            fs.writeFileSync(path.join(tasksDir, 'phase-21.md'),
                '---\nphase: 21\nname: "Open"\nstatus: Done\n---\n\n' +
                '## Atomic Checklist\n\n- [x] [T-21A01] Done\n- [ ] [T-21A02] Still open\n');

            const candidates = archiver.findArchiveCandidates(wsDir).map(c => c.file);
            assert.ok(candidates.includes('phase-20.md'), 'prose `- [ ]` must not block archival (R7 fix)');
            assert.ok(!candidates.includes('phase-21.md'), 'a real unchecked checklist line must still block archival');
        } finally {
            cleanup(tempDir);
        }
    });

    // A completed, archivable Phase 3 ("Shipping") plus its TASKS.md registry
    // row — the fixed point every archival-rewrite test in this section starts
    // from before layering its own PLAN.md content.
    const makeDoneShippingPhaseFixture = (tasksDir, wsDir) => {
        fs.writeFileSync(path.join(tasksDir, 'phase-3.md'),
            '---\nphase: 3\nname: "Shipping"\nstatus: Done\n---\n\n' +
            '## Atomic Checklist\n\n- [x] [T-3A01] Ship it\n');

        const tasksPath = path.join(wsDir, 'TASKS.md');
        fs.writeFileSync(tasksPath, [
            '# Master Task Index', '',
            '| Phase | Description | Status |',
            '| --- | --- | --- |',
            '| [Phase 3](tasks/phase-3.md) | Shipping | `Done` |',
            '',
        ].join('\n'));
        return tasksPath;
    };

    // ───────────────────────────────────────────────────────────────────────────
    // 7d. phase-archiver.js — archival rewrites links in PLAN.md, not only TASKS.md
    // ───────────────────────────────────────────────────────────────────────────
    test('archiveCompletedPhases rewrites phase links in both TASKS.md and PLAN.md', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);
            const tasksPath = makeDoneShippingPhaseFixture(tasksDir, wsDir);

            const planPath = path.join(wsDir, 'PLAN.md');
            fs.writeFileSync(planPath, [
                '# Implementation Plan',
                '',
                '## Phase 3 — Shipping',
                '',
                'Breakdown lives in [Phase 3](tasks/phase-3.md).',
                '',
            ].join('\n'));

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(archived.map(a => a.file), ['phase-3.md'], 'the Done phase must be archived');

            assert.ok(
                fs.existsSync(path.join(wsDir, 'archives', 'tasks', 'phase-3.md')),
                'phase file must be moved into archives/tasks/'
            );
            assert.ok(
                !fs.existsSync(path.join(tasksDir, 'phase-3.md')),
                'archival is a move, not a copy'
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(tasks, /\(archives\/tasks\/phase-3\.md\)/, 'TASKS.md link must be rewritten');
            assert.match(tasks, /`Done \(Archived\)`/, 'TASKS.md row status must become Done (Archived)');

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(plan, /\(archives\/tasks\/phase-3\.md\)/, 'PLAN.md link must be rewritten');
            assert.doesNotMatch(plan, /\(tasks\/phase-3\.md\)/, 'PLAN.md must not keep a dangling link to the moved file');
        } finally {
            cleanup(tempDir);
        }
    });

    test('archiveCompletedPhases rewrites a self-labelling PLAN.md link without touching prose (R10)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);
            const tasksPath = makeDoneShippingPhaseFixture(tasksDir, wsDir);

            // PLAN.md's own convention: the "Tasks:" line is self-labelling —
            // the label *is* the path — which is the form the R10 fix targets.
            // A separate Backlog line mentions the same path in plain prose,
            // describing history; that mention must survive byte-for-byte.
            const planPath = path.join(wsDir, 'PLAN.md');
            fs.writeFileSync(planPath, [
                '### Phase 3 — Shipping', '',
                '- [x] **Shipping** [L2]',
                '  - Tasks: [tasks/phase-3.md](tasks/phase-3.md)', '',
                '## Backlog', '',
                '- Historical note: the original breakdown lived at tasks/phase-3.md before later restructuring.',
                '',
            ].join('\n'));

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(archived.map(a => a.file), ['phase-3.md']);

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(
                plan, /Tasks: \[archives\/tasks\/phase-3\.md\]\(archives\/tasks\/phase-3\.md\)/,
                'the self-labelling link must move both its label and its target together'
            );
            assert.doesNotMatch(
                plan, /\[tasks\/phase-3\.md\]/,
                'no trace of the pre-move self-label may remain'
            );
            assert.match(
                plan, /Historical note: the original breakdown lived at tasks\/phase-3\.md before later restructuring\./,
                'a bare prose mention of the path must survive byte-for-byte — it describes history, not a live link'
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(tasks, /\[Phase 3\]\(archives\/tasks\/phase-3\.md\)/, 'TASKS.md label (a phase number, not a path) must be unchanged');
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
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), [
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
            ].join('\n'));

            // STATE.md with stale counters AND hand-authored narrative in the fence.
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
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
            ].join('\n'));

            updateState(wsDir, {}, { autoProgress: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(state, /Phase 2: \[2\/3\]/, 'phase counter line must be recomputed');
            assert.match(state, /Overall: \[1\/2\]/, 'overall counter line must be recomputed');
            assert.doesNotMatch(state, /\[0\/3\]/, 'stale counters must not survive');
            assert.match(
                state, /T-2A02 landed the parser rework/,
                'hand-authored narrative inside the Progress fence must be preserved'
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('updateState autoProgress replaces template placeholder counters without duplicating them', () => {
        const tempDir = createTempWorkspace();
        try {
            const realTemplate = path.resolve(__dirname, '..', '..', '.magic', 'templates', 'state.md');
            fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), [
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                '',
            ].join('\n'));

            // Bootstrap STATE.md from the real template (placeholder counters),
            // then recompute: `{filled}/{total}`-style placeholders are engine-owned
            // lines and must be replaced, not preserved as narrative.
            updateState(wsDir, { phase: '1' }, { autoProgress: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(state, /Overall: \[1\/1\]/, 'placeholder block must be recomputed from TASKS.md');
            assert.doesNotMatch(state, /\{filled\}|\{done\}/, 'template placeholder counters must not survive as narrative');
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress emits a phase counter for the two-level task layout (SC-2.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const { wsDir, tasksDir, tasksPath } = makeWorkspaceWithTasks(tempDir);

            // Registry-only TASKS.md: no inline `### Phase N Checklist` heading.
            // This is the canonical layout, so the phase line must come from the
            // phase file — deriving it from the inline heading alone produced an
            // aggregate-only block for every project on the modern format.
            fs.writeFileSync(tasksPath, [
                '# Master Task Index',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                '| [Phase 3](tasks/phase-3.md) | Feature | `In Progress` |',
                '',
            ].join('\n'));

            fs.writeFileSync(path.join(tasksDir, 'phase-3.md'), [
                '---', 'phase: 3', 'status: In Progress', '---',
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
            ].join('\n'));

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
                '# Project State', '',
                '**Phase:** 3', '**Status:** Active', '',
                '## Progress', '', '```', 'Overall: [0/2] ░░░░░░░░ 0%', '```', '',
                '## Recent Decisions', '',
            ].join('\n'));

            updateState(wsDir, {}, { autoProgress: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(state, /Phase 3: \[2\/5\]/, 'phase counter must be derived from the phase file');
            assert.match(state, /Overall: \[1\/2\]/, 'aggregate counter must still be recomputed');
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress preserves counter-shaped lines under labels the engine never writes (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), [
                '### Phase 1 Checklist',
                '',
                '- [x] [T-1A01] One',
                '- [ ] [T-1A02] Two',
                '',
                '## Registry',
                '',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                '',
            ].join('\n'));

            // `Overall` and `Phase {N}` are the only labels computeProgress emits.
            // Anything else sharing the shape is operator narrative: nothing
            // regenerates it, so matching it as engine-owned means deleting it.
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
                '# Project State', '',
                '**Phase:** 1', '**Status:** Active', '',
                '## Progress', '', '```',
                'Phase 1: [0/2] ░░░░░░░░ 0%',
                'Overall: [0/1] ░░░░░░░░ 0%',
                'Specification: [3/3] complete',
                'Plan: [1/1] complete',
                'Implementation: [1/5] in progress — see notes below',
                '```', '',
                '## Recent Decisions', '',
            ].join('\n'));

            updateState(wsDir, {}, { autoProgress: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(state, /Phase 1: \[1\/2\]/, 'engine-owned phase counter must be regenerated');
            assert.match(state, /Overall: \[0\/1\]/, 'engine-owned aggregate counter must be regenerated');
            assert.match(state, /Specification: \[3\/3\] complete/, 'custom counter-shaped line must survive');
            assert.match(state, /Plan: \[1\/1\] complete/, 'custom counter-shaped line must survive');
            assert.match(
                state, /Implementation: \[1\/5\] in progress — see notes below/,
                'custom counter-shaped line must survive verbatim, trailing prose included'
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress leaves `$`-digit sequences in narrative untouched (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            fs.writeFileSync(path.join(wsDir, 'TASKS.md'),
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n');

            // A string-form .replace() re-scans its own result for `$1`-`$9`,
            // so a dollar amount in preserved narrative used to splice captured
            // fence fragments into the middle of the note — corrupting the
            // document's structure, not merely a counter's value.
            const narrative = [
                'Budget check: spend is $1,200 of the',
                '$3,000 sprint allocation — on track.',
            ];
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
                '# Project State', '',
                '**Phase:** 1', '**Status:** Active', '',
                '## Progress', '', '```',
                'Overall: [0/1] ░░░░░░░░ 0%',
                ...narrative,
                '```', '',
                '## Recent Decisions', '',
            ].join('\n'));

            const before = (fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8').match(/```/g) || []).length;
            updateState(wsDir, {}, { autoProgress: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            for (const line of narrative) {
                assert.ok(
                    state.includes(line),
                    `narrative line must survive byte-for-byte → missing "${line}"`
                );
            }
            assert.strictEqual(
                (state.match(/```/g) || []).length, before,
                'the fence count must not change — an injected fence unbalances every section below it'
            );
            assert.doesNotMatch(state, /## Progress[\s\S]*## Progress/, 'no structural fragment may be spliced into the fence');
        } finally {
            cleanup(tempDir);
        }
    });

    test('the line-cap guard distinguishes a real prune from an exhausted one (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            const captureWarnings = (fn) => {
                const original = console.warn;
                const messages = [];
                console.warn = (...args) => messages.push(args.join(' '));
                try { fn(); } finally { console.warn = original; }
                return messages.join('\n');
            };

            // Blocking Constraints grow monotonically by design and are never
            // pruned, so they can push the file past the cap on their own. Once
            // Recent Decisions is at its 1-entry floor the guard has nothing
            // left to remove — and must say so instead of reusing the message
            // that claims a prune happened.
            const buildState = (decisionCount) => [
                '# Project State', '',
                '**Phase:** 1', '**Status:** Active', '',
                '## Recent Decisions', '',
                ...Array.from({ length: decisionCount }, (_, i) => `- 2026-01-0${i + 1} **Decision:** entry ${i + 1}`),
                '',
                '## Blocking Constraints', '',
                ...Array.from({ length: 95 }, (_, i) => `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`),
                '',
            ].join('\n');

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(1));
            const exhausted = captureWarnings(() => updateState(wsDir, {}, {}));

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(3));
            const restored = captureWarnings(() => updateState(wsDir, {}, {}));

            assert.match(exhausted, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.match(restored, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.notStrictEqual(
                exhausted, restored,
                'an exhausted guard must be observably different from a successful prune'
            );
            assert.match(exhausted, /nothing was pruned/, 'the exhausted case must say nothing was removed');
            assert.match(exhausted, /Blocking Constraints/, 'the exhausted case must name the section to review');
            assert.doesNotMatch(restored, /nothing was pruned/, 'a real prune must not claim exhaustion');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a task-scoped update leaves the phase-level Status field alone (SC-1.1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
                '# Project State', '',
                '**Phase:** 1 — Bootstrap', '**Status:** Active', '',
                '## Current Position', '',
                '- **Task:** T-1A01 Scaffold the app',
                '- **Next Action:** whatever', '',
            ].join('\n'));

            // `status` is the phase-level field and its vocabulary is
            // Active | Blocked | Paused. One task finishing is not a phase
            // transition, so the per-task patch carries no status at all.
            updateState(wsDir, { task: 'T-1A02 Wire the parser', nextAction: 'Execute T-1A03' }, {});
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(state, /\*\*Status:\*\* Active/, 'the phase-level Status must survive a task-scoped update');
            assert.match(state, /- \*\*Task:\*\* T-1A02 Wire the parser/, 'the task field must be updated');
            assert.doesNotMatch(state, /\*\*Status:\*\* (Done|Cancelled|Todo)/, 'task vocabulary must never reach the phase field');
        } finally {
            cleanup(tempDir);
        }
    });

    test('field patches insert `$`-bearing values verbatim, never as replacement patterns (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = makeWorkspace(tempDir);

            // A string-form .replace() re-scans its replacement text for `$'`
            // (right context), `` $` `` (left context), `$&` (whole match) and
            // `$$` — none of which need a capture group to fire. finalize.js's
            // synthesizeNextAction() embeds arbitrary task titles, so a title
            // with bash ANSI-C quoting (`$'…'`) used to splice the entire tail
            // of STATE.md into the Next Action line and duplicate every section
            // below it, a second stale `## Progress` counter among them.
            const evilTitle = "Handle the $'refund' path and the $& fallback";
            const nextAction = `Execute T-8B04 ${evilTitle} via /magic.run engine`;

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), [
                '# Project State', '',
                '**Phase:** 8 — Payments', '**Status:** Active', '',
                '## Current Position', '',
                '- **Task:** T-8B03 Wire the webhook',
                '- **Next Action:** whatever', '',
                '## Progress', '', '```',
                'Phase 8: [3/7] ███░░░░░ 43%',
                'Overall: [2/5] ███░░░░░ 40%',
                '```', '',
                '## Recent Decisions', '',
            ].join('\n'));

            updateState(wsDir, { nextAction, task: `T-8B04 ${evilTitle}` }, {});
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.ok(
                state.includes(`- **Next Action:** ${nextAction}`),
                'the Next Action value must be inserted byte-for-byte'
            );
            assert.ok(
                state.includes(`- **Task:** T-8B04 ${evilTitle}`),
                'the Task value must be inserted byte-for-byte'
            );
            assert.strictEqual(
                (state.match(/^## Progress$/gm) || []).length, 1,
                "a `$'`/`$&` expansion must not duplicate a document section"
            );
            assert.strictEqual(
                (state.match(/```/g) || []).length, 2,
                'the fence count must stay balanced'
            );
        } finally {
            cleanup(tempDir);
        }
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
            fs.writeFileSync(path.join(tasksDir, 'phase-16.md'),
                '---\r\nphase: 16\r\nname: "Windows"\r\nstatus: Done\r\n---\r\n\r\n' +
                '## Atomic Checklist\r\n\r\n- [x] [T-16A01] Done\r\n');

            const candidates = archiver.findArchiveCandidates(wsDir);
            assert.deepStrictEqual(
                candidates.map(c => c.file), ['phase-16.md'],
                'CRLF line endings must not hide a Done phase from archival'
            );
            assert.strictEqual(candidates[0].phase, '16', 'frontmatter values must be parsed without trailing \\r');
            assert.strictEqual(candidates[0].name, 'Windows', 'quoted values must be unwrapped under CRLF');
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
                () => execSync(`node "${executorPath}" "../../../etc/passwd"`, { cwd: tempDir, stdio: 'pipe' }),
                /Invalid script name/,
                'Should reject script name with path separators'
            );

            // Path traversal in workspace name
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, '.design', 'workspace.json'),
                JSON.stringify({ default: 'main', workspaces: { main: {} } })
            );
            assert.throws(
                () => execSync(
                    `node "${executorPath}" init --workspace=../../../etc`,
                    { cwd: tempDir, stdio: 'pipe' }
                ),
                /Invalid workspace name/,
                'Should reject workspace name with path separators'
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
            assert.ok(hookContent.includes('executor.js update-engine-meta --check'), 'Hook should call update-engine-meta --check');
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
            fs.writeFileSync(path.join(designDir, 'real-a.md'), '# Real A\n[Real B](./real-b.md)\n');
            fs.writeFileSync(path.join(designDir, 'real-b.md'), '# Real B\n');

            // Fixture subtree that must vanish once `*tmp/` is gitignored.
            const tmpDir = path.join(tempDir, '.tmp');
            fs.mkdirSync(tmpDir, { recursive: true });
            fs.writeFileSync(path.join(tmpDir, 'fix-a.md'), '# Fix A\n[Fix B](./fix-b.md)\n');
            fs.writeFileSync(path.join(tmpDir, 'fix-b.md'), '# Fix B\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'detect-communities.js');
            const run = () => JSON.parse(execSync(`node "${scriptPath}" --include-md --json`, { cwd: tempDir, encoding: 'utf8' }));

            // Control — no .gitignore: SKIP_DIRS has no '.tmp', so fixtures ARE scanned.
            const before = run();

            // Fix — `.gitignore` with `*tmp/` must drop exactly the two fixture files.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '*tmp/\n');
            const after = run();

            assert.strictEqual(
                after.graph.total_files,
                before.graph.total_files - 2,
                'the two .tmp/ fixture files must be excluded once *tmp/ is gitignored'
            );
            assert.ok(
                !JSON.stringify(after.communities).includes('.tmp/'),
                'no community member may reference a gitignored .tmp/ path'
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
            const artifactDir = path.join(tempDir, 'generated', 'doc', 'type.impl', 'core', 'result');
            fs.mkdirSync(artifactDir, { recursive: true });
            fs.writeFileSync(path.join(artifactDir, 'enum.Result.js'), '// NOTE: generated artifact, not authored rationale\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'extract-rationale.js');
            const run = () => JSON.parse(execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }));

            // Control — no .gitignore: `generated` is absent from SKIP_DIRS, so the artifact IS scanned.
            const before = run();
            assert.ok(
                before.rationale.some(r => r.file.startsWith('generated/')),
                'control: without .gitignore the artifact is scanned (fixture is meaningful)'
            );

            // Fix — `.gitignore` with `generated/` must drop the artifact entirely.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'generated/\n');
            const after = run();

            assert.ok(
                !after.rationale.some(r => r.file.startsWith('generated/')),
                'no rationale marker may originate from a gitignored path'
            );
            assert.ok(
                !after.shadow_logic.some(s => s.file.startsWith('generated/')),
                'no shadow-logic entry may originate from a gitignored path'
            );
            assert.ok(
                after.rationale.some(r => r.file === 'src/main.rs'),
                'genuine source rationale must survive the gitignore filter'
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
            assert.strictEqual(loadGitignore(tempDir)('anything/at/all.js'), false, 'absent .gitignore ignores nothing');

            fs.writeFileSync(path.join(tempDir, '.gitignore'), [
                'target/',        // any depth
                '/dist',          // root-anchored only
                'node_modules',   // any depth, no trailing slash
                '*.log',          // path-aware glob
                'docs/build/',    // anchored nested path
                '.env*',          // broad match…
                '!.env.example',  // …narrowed by a later negation
                '',
                '# a comment',
            ].join('\n'));

            const isIgnored = loadGitignore(tempDir);

            assert.strictEqual(isIgnored('target/doc/a.js'), true, 'bare dir pattern matches at any depth');
            assert.strictEqual(isIgnored('nested/target/b.js'), true, 'bare dir pattern is not root-anchored');
            assert.strictEqual(isIgnored('dist/bundle.js'), true, '/dist matches at the root');
            assert.strictEqual(isIgnored('src/dist/helper.js'), false, '/dist must NOT match a nested dist/');
            assert.strictEqual(isIgnored('deep/node_modules/x.js'), true, 'slashless pattern matches any segment');
            assert.strictEqual(isIgnored('app.log'), true, '*.log matches a log file');
            assert.strictEqual(isIgnored('src/keep.log.js'), false, '* must not cross into the extension');
            assert.strictEqual(isIgnored('docs/build/out.js'), true, 'nested path pattern is anchored and matches');
            assert.strictEqual(isIgnored('docs/src/in.js'), false, 'anchored pattern must not over-match');

            // Ordering: the later `!` rule wins over the earlier broad rule.
            assert.strictEqual(isIgnored('.env'), true, '.env* ignores .env');
            assert.strictEqual(isIgnored('.env.local'), true, '.env* ignores .env.local');
            assert.strictEqual(isIgnored('.env.example'), false, 'a later negation re-includes .env.example');

            assert.strictEqual(isIgnored('src/main.rs'), false, 'unmatched paths are never ignored');
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

            const mk = (rel, body) => {
                const abs = path.join(tempDir, rel);
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, body);
            };
            // `out` is deliberately NOT in analyze-coverage's hardcoded SKIP_DIRS
            // (unlike `dist`), so these two files isolate gitignore anchoring alone.
            mk('src/main.rs', 'fn main() {}\n');
            mk('src/out/helper.rs', 'fn helper() {}\n');    // nested out/ — must survive `/out`
            mk('out/bundle.js', 'var x = 1;\n');            // root out/ — must be excluded
            mk('target/doc/artifact.js', 'var y = 2;\n');   // build tree — must be excluded

            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'target/\n/out\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
            const out = JSON.parse(execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }));
            const files = out.coverage.map(c => c.file);

            assert.ok(!files.some(f => f.startsWith('target/')), 'gitignored build tree must not be classified');
            assert.ok(!files.includes('out/bundle.js'), 'root-anchored /out must be excluded');
            assert.ok(files.includes('src/out/helper.rs'), 'a nested out/ must survive root-anchored /out');
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

            assert.ok(!context.includes('buildout'), 'a gitignored directory must not appear in the tree');
            assert.ok(!/^.*├──\s\.env$/m.test(context), '.env must be pruned by the .env* rule');
            assert.ok(context.includes('.env.example'), 'the negated .env.example must remain visible');
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
            const { BUILD_NOISE_DIRS } = require(path.join(tempDir, '.magic', 'scripts', 'utils.js'));

            assert.ok(Array.isArray(BUILD_NOISE_DIRS), 'the floor is exported as an array');
            assert.ok(Object.isFrozen(BUILD_NOISE_DIRS), 'the floor is frozen against mutation');
            for (const name of ['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.pytest_cache']) {
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
                    `${parts.join('/')} must spread the shared floor, not hardcode its own copy`
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('scanners share the build-noise floor but keep their domain excludes apart', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => {
                const abs = path.join(tempDir, ...rel.split('/'));
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, body);
            };

            mk('.design/specifications/l1-core.md',
                '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n');
            mk('src/main.rs', '// NOTE: genuine design rationale\nfn main() {}\n');
            // SDD-layer source: markers here are never user "shadow logic".
            mk('.design/tooling.js', '// NOTE: sdd helper, not product code\nvar s = 1;\n');
            // Directories below were skipped by SOME scanners before unification:
            // `build` was missing from analyze-coverage's list, `temp` from
            // extract-rationale's. No .gitignore here — only the floor acts.
            mk('build/artifact.js', '// NOTE: generated artifact\nvar a = 1;\n');
            mk('temp/scratch.js', '// NOTE: scratch file\nvar t = 1;\n');

            // analyze-coverage — `build/` no longer reaches classification.
            const coverage = JSON.parse(execSync(
                `node "${path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js')}" --json`,
                { cwd: tempDir, encoding: 'utf8' }
            ));
            const covFiles = coverage.coverage.map(c => c.file);
            assert.ok(!covFiles.some(f => f.startsWith('build/')), 'analyze-coverage must skip build/ via the shared floor');
            assert.ok(covFiles.includes('src/main.rs'), 'genuine source must still be classified');

            // extract-rationale — floor noise and domain excludes both stay out.
            const rationale = JSON.parse(execSync(
                `node "${path.join(tempDir, '.magic', 'scripts', 'extract-rationale.js')}" --json`,
                { cwd: tempDir, encoding: 'utf8' }
            ));
            assert.ok(!rationale.rationale.some(r => r.file.startsWith('temp/')), 'extract-rationale must skip temp/ via the shared floor');
            assert.ok(!rationale.rationale.some(r => r.file.startsWith('.magic/')), 'domain exclude: engine internals are not user shadow logic');
            assert.ok(!rationale.rationale.some(r => r.file.startsWith('.design/')), 'domain exclude: the SDD layer is not user shadow logic');
            assert.ok(rationale.rationale.some(r => r.file === 'src/main.rs'), 'genuine rationale must survive');

            // detect-communities — same floor, OPPOSITE domain: .design/ stays in
            // the graph (it is the subject), while floor dirs never become nodes.
            mk('.design/real-a.md', '# Real A\n[Real B](./real-b.md)\n');
            mk('.design/real-b.md', '# Real B\n');
            const runGraph = () => JSON.parse(execSync(
                `node "${path.join(tempDir, '.magic', 'scripts', 'detect-communities.js')}" --include-md --json`,
                { cwd: tempDir, encoding: 'utf8' }
            ));
            const before = runGraph();
            mk('.pytest_cache/cached.js', 'var c = 1;\n');
            mk('.pytest_cache/other.js', 'var o = 1;\n');
            const after = runGraph();
            assert.strictEqual(
                after.graph.total_files,
                before.graph.total_files,
                'floor dirs (.pytest_cache) must not add graph nodes'
            );
            assert.ok(
                JSON.stringify(after.communities).includes('.design/real-a.md'),
                'the .design/ subject must remain in the community graph'
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
            assert.strictEqual(parseFlags(['--workspace=docs'], spec).values['--workspace'], 'docs');
            assert.strictEqual(parseFlags(['--workspace', 'docs'], spec).values['--workspace'], 'docs');

            // Unrecognized tokens pass through untouched (executor forwards them to the child).
            const proxied = parseFlags(['--json', '--require-tasks', '--workspace', 'docs'], spec);
            assert.deepStrictEqual(proxied.rest, ['--require-tasks'], 'unknown tokens survive in rest');
            assert.strictEqual(proxied.flags['--json'], true, 'boolean flags are captured, not forwarded');
            assert.strictEqual(proxied.values['--workspace'], 'docs');
            assert.deepStrictEqual(proxied.errors, [], 'a well-formed argv produces no errors');

            // Fail closed — the four silent-fallback shapes.
            assert.ok(parseFlags(['--workspace'], spec).errors.length, 'bare flag at end of argv is an error');
            assert.ok(parseFlags(['--workspace', '--json'], spec).errors.length, 'a following flag is not a value');
            assert.ok(parseFlags(['--workspace='], spec).errors.length, 'an empty value is an error');
            assert.ok(parseFlags(['--json=1'], spec).errors.length, 'a boolean flag rejects a value');

            // An embedded '=' must reach the caller's validation, never be truncated to `a`.
            assert.strictEqual(
                parseFlags(['--workspace=a=b'], spec).values['--workspace'],
                'a=b',
                "split('=')[1] truncation must not resurface"
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
                JSON.stringify({ default: 'main', workspaces: { main: {}, docs: {} } })
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
            execSync(`node "${executorPath}" generate-context --workspace docs`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(contextOf('docs')), 'space form must write the target workspace');
            assert.ok(!fs.existsSync(contextOf('main')), 'space form must not fall back to the default workspace');

            // (b) Equals form — the control that always worked.
            clearContexts();
            execSync(`node "${executorPath}" generate-context --workspace=docs`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(contextOf('docs')), 'equals form must write the target workspace');
            assert.ok(!fs.existsSync(contextOf('main')), 'equals form must not touch the default workspace');

            // (c) The Unknown-workspace guard must be reachable via BOTH forms.
            //     Previously the space form bypassed it: a typo silently wrote to main.
            const expectHalt = (argv, why) => {
                clearContexts();
                assert.throws(
                    () => execSync(`node "${executorPath}" generate-context ${argv}`, { cwd: tempDir, stdio: 'pipe' }),
                    /HALT/,
                    why
                );
                assert.ok(!fs.existsSync(contextOf('main')), `${why} — and nothing may be written`);
                assert.ok(!fs.existsSync(contextOf('docs')), `${why} — and nothing may be written`);
            };

            expectHalt('--workspace bogus', 'a typo in the space form must HALT, not silently target the default');
            expectHalt('--workspace=bogus', 'a typo in the equals form must HALT');
            expectHalt('--workspace', 'a bare --workspace must HALT, not fall back to the default');
            expectHalt('--workspace=', 'an empty --workspace value must HALT');
            expectHalt('--workspace=docs=typo', "an embedded '=' must fail validation, not truncate to 'docs'");

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
            execSync(`node "${scriptPath}" --workspace .design/docs --status=Active`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(wsState), 'space form must write into the workspace');
            assert.ok(!fs.existsSync(rootState), 'space form must not write into the registry root');

            // (b) A bare --workspace must HALT rather than degrade to `.design/`.
            fs.unlinkSync(wsState);
            assert.throws(
                () => execSync(`node "${scriptPath}" --workspace --status=Active`, { cwd: tempDir, stdio: 'pipe' }),
                /HALT/,
                'a valueless --workspace must HALT'
            );
            assert.ok(!fs.existsSync(rootState), 'the HALT must leave the registry root untouched');

            // (c) Equals form still works, and a workspace directory may contain separators.
            execSync(`node "${scriptPath}" --workspace=.design/docs --status=Active`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(wsState), 'equals form must write into the workspace');
            assert.ok(!fs.existsSync(rootState), 'equals form must not write into the registry root');
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
        const bodies = fs.readdirSync(magicRoot).filter(f => f.endsWith('.md'));
        assert.ok(bodies.length > 0, 'fixture precondition: workflow bodies exist');

        for (const body of bodies) {
            const content = fs.readFileSync(path.join(magicRoot, body), 'utf8');

            // executor.js validates a bare workspace NAME; a path never matches
            // WORKSPACE_NAME_RE, so `--workspace={...-dir}` always HALTs.
            assert.doesNotMatch(
                content,
                /--workspace=\{[^}]*dir[^}]*\}/,
                `${body} passes a directory to executor's --workspace, which only accepts a bare name`
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
                `${rel} must state the notation-independent task-ID pattern (bracketed and bare, any phase width)`
            );
            assert.ok(
                content.includes('[Pp]hase[-\\s]\\d+'),
                `${rel} must state the prose phase-designator pattern, not only the phase-{n} file form`
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
            assert.ok(context.includes('.design/'), 'gitignored design root must remain visible (landmark)');
            assert.ok(context.includes('.magic/'), 'engine root must remain visible (landmark)');
            assert.ok(!context.includes('dist/'), 'build noise must be hidden from the tree via the shared floor');

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
        fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n*None — plan complete.*\n');
        commitFixture(tempDir);
    };

    test('diagnostics.js record/read/drain round-trip in append order, exactly once (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));

            assert.deepStrictEqual(diagnostics.read(), [], 'a missing sink reads as empty, not an error');

            const findings = [
                { severity: 'error', source: 'a', code: 'A1', message: 'first' },
                { severity: 'warning', source: 'b', code: 'B1', message: 'second' },
                { severity: 'fix', source: 'c', code: 'C1', message: 'third' },
            ];
            for (const f of findings) {
                assert.strictEqual(diagnostics.record(f), true, `record() should succeed for ${f.code}`);
            }

            const drained = diagnostics.drain();
            assert.strictEqual(drained.length, 3, 'all three findings should drain');
            assert.deepStrictEqual(
                drained.map((f) => f.code), ['A1', 'B1', 'C1'],
                'findings must drain in append order'
            );

            assert.deepStrictEqual(diagnostics.drain(), [], 'a second drain must return nothing — exactly-once delivery');
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.record() never throws, even when the sink cannot be written (DG-9)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));

            // Occupy .design/.cache with a file so the sink's parent path
            // cannot resolve to a directory — the write itself must fail.
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.design', '.cache'), 'not a directory');

            let result;
            assert.doesNotThrow(() => {
                result = diagnostics.record({ severity: 'warning', source: 'test', code: 'X', message: 'm' });
            }, 'record() must never throw, regardless of why the write failed');
            assert.strictEqual(result, false, 'a failed write must report false, not silently succeed');
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.read() drains every parseable line even when one is truncated (DG-9 corollary)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));
            diagnostics.record({ severity: 'warning', source: 'a', code: 'BEFORE', message: 'first' });

            const sinkPath = path.join(tempDir, '.design', '.cache', 'diagnostics.jsonl');
            fs.appendFileSync(sinkPath, '{"severity":"error","source":"b","code":"TRUNC","mess\n');

            diagnostics.record({ severity: 'fix', source: 'c', code: 'AFTER', message: 'third' });

            const findings = diagnostics.drain();
            const codes = findings.map((f) => f.code);
            assert.ok(codes.includes('BEFORE'), 'a finding recorded before the corrupt line must survive');
            assert.ok(codes.includes('AFTER'), 'a finding recorded after the corrupt line must survive — the tail is not lost');
            assert.ok(!codes.includes('TRUNC'), 'the corrupt line itself must not appear as a finding');
            assert.strictEqual(findings.length, 2, 'exactly the two valid lines should drain, no more, no fewer');
        } finally {
            cleanup(tempDir);
        }
    });

    test('diagnostics.formatDigest dedups with an occurrence count and caps with an omission line (DG-4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));

            assert.deepStrictEqual(diagnostics.formatDigest([]), [], 'empty input must render nothing — not a heading with no body');

            // 12 identical (severity, source, code) findings collapse to one entry.
            const repeated = Array.from({ length: 12 }, () => ({
                severity: 'warning', source: 'update-state', code: 'STATE_CAP_EXHAUSTED', message: 'cap exhausted',
            }));
            const repeatedDigest = diagnostics.formatDigest(repeated).join('\n');
            assert.match(repeatedDigest, /STATE_CAP_EXHAUSTED.*\(×12\)/, 'twelve identical findings must collapse to one line with a ×12 count');
            assert.strictEqual(
                (repeatedDigest.match(/STATE_CAP_EXHAUSTED/g) || []).length, 1,
                'the code must appear exactly once, not twelve times'
            );

            // 20 distinct findings: 15 rendered, 5 reported as omitted.
            const distinct = Array.from({ length: 20 }, (_, i) => ({
                severity: 'warning', source: 'test', code: `CODE_${i}`, message: `finding ${i}`,
            }));
            const distinctLines = diagnostics.formatDigest(distinct);
            const bulletCount = distinctLines.filter((l) => l.startsWith('- ') && !l.includes('more finding')).length;
            assert.strictEqual(bulletCount, 15, 'the render cap must stop at 15 distinct findings');
            assert.match(distinctLines.join('\n'), /\+5 more findings not listed/, 'the omission must state how many were left out');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js --dry-run reads the diagnostics sink without draining it (DG-4.1)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            commitPlanCompleteFixture(tempDir, wsDir);

            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));
            diagnostics.record({ severity: 'warning', source: 'test', code: 'DRY_RUN_PROBE', message: 'should survive a preview' });

            const dryOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main --dry-run`, { cwd: tempDir, encoding: 'utf8' });
            assert.match(dryOut, /DRY_RUN_PROBE/, 'a --dry-run invocation must still render the digest');
            assert.deepStrictEqual(
                diagnostics.read().map((f) => f.code), ['DRY_RUN_PROBE'],
                'the finding must still be sitting in the sink after a preview — the preview must not have drained it'
            );

            // A second, real run reports the same finding and this time consumes it.
            const realOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            assert.match(realOut, /DRY_RUN_PROBE/, 'the real run must still report the finding the preview left untouched');
            assert.deepStrictEqual(diagnostics.read(), [], 'the real run must have drained the sink');
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
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            commitPlanCompleteFixture(tempDir, wsDir);

            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));
            const assertOrder = (out, label) => {
                const digestIdx = out.indexOf('### Engine diagnostics');
                const nextIdx = out.indexOf('### Next step');
                assert.ok(digestIdx !== -1, `${label}: digest heading must be present`);
                assert.ok(nextIdx !== -1, `${label}: next-step heading must be present`);
                assert.ok(digestIdx < nextIdx, `${label}: digest must render before the next step`);
                const afterNextStep = out.slice(nextIdx + '### Next step'.length);
                assert.doesNotMatch(afterNextStep, /\n### /, `${label}: nothing may follow the next step section`);
            };

            // Skip path: no whitelisted change, but a recorded finding exists.
            diagnostics.record({ severity: 'warning', source: 'test', code: 'ORDER_SKIP', message: 'skip path probe' });
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            assertOrder(skipOut, 'skip path');

            // Significant path: a whitelisted change plus a recorded finding.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            diagnostics.record({ severity: 'warning', source: 'test', code: 'ORDER_SUCCESS', message: 'success path probe' });
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
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
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), [
                '# Master Task Index', '',
                '## Active Phases', '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |', '',
            ].join('\n'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '## Atomic Checklist', '',
                '- [ ] [T-1A01] Scaffold the app', '',
            ].join('\n'));
            commitFixture(tempDir);

            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });

            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
            const persisted = state.match(/- \*\*Next Action:\*\* (.+)/)[1].trim();

            const nextIdx = out.indexOf('### Next step');
            const printed = out.slice(nextIdx + '### Next step'.length).split('\n').map((l) => l.trim()).filter(Boolean)[0];

            assert.strictEqual(printed, persisted, 'the printed next step must be byte-identical to what was written to STATE.md');
            assert.match(printed, /T-1A01/, 'sanity: the computed action should reference the open task');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js omits the diagnostics digest and summary row when nothing was recorded (DG-7)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n*None — plan complete.*\n');
            commitFixture(tempDir);

            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));
            assert.deepStrictEqual(diagnostics.read(), [], 'sanity: the sink must start empty for this assertion to mean anything');

            // Skip path: nothing whitelisted changed, sink is empty.
            const skipOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            assert.doesNotMatch(skipOut, /### Engine diagnostics/, 'skip path: no digest heading when nothing was recorded');
            assert.match(skipOut, /### Next step/, 'skip path: the next step must still print');

            // Significant path: a whitelisted change, still an empty sink —
            // the summary table gains rows for other fields but must not
            // gain one for diagnostics.
            fs.writeFileSync(path.join(wsDir, 'PLAN.md'), '# Plan\n\nreal content\n');
            const successOut = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            assert.doesNotMatch(successOut, /### Engine diagnostics/, 'significant path: no digest heading when nothing was recorded');
            assert.doesNotMatch(successOut, /\| Diagnostics \|/, 'significant path: no summary-table row when nothing was recorded');
            assert.match(successOut, /### Next step/, 'significant path: the next step must still print');
        } finally {
            cleanup(tempDir);
        }
    });

    test('record-diagnostic always exits 0, whether the finding is valid or malformed (DG-8)', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'record-diagnostic.js');
            const diagnostics = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'diagnostics.js'));

            // Valid finding.
            const validOut = execSync(
                `node "${scriptPath}" --severity=warning --code=CLI_PROBE --message="from the agent channel"`,
                { cwd: tempDir, encoding: 'utf8' }
            );
            assert.match(validOut, /Recorded warning CLI_PROBE/, 'a valid finding should confirm what was recorded');

            // Invalid severity — must not throw or exit non-zero.
            assert.doesNotThrow(() => {
                execSync(
                    `node "${scriptPath}" --severity=bogus --code=BAD --message="should be dropped"`,
                    { cwd: tempDir, encoding: 'utf8' }
                );
            }, 'an invalid severity must not produce a non-zero exit');

            const drained = diagnostics.drain();
            assert.deepStrictEqual(drained.map((f) => f.code), ['CLI_PROBE'], 'only the valid finding should have reached the sink');
            assert.strictEqual(drained[0].source, 'agent', '--source defaults to "agent" when omitted');
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
            fs.writeFileSync(changelogPath, [
                '# Changelog', '',
                'All notable changes to this project will be documented in this file.', '',
                '## [Unreleased]', '',
                '### Added', '',
                '- Something new.', '',
            ].join('\n'));
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'release-changelog.js');

            const out = execSync(`node "${scriptPath}" --version=9.9.9 --date=2026-01-01`, { cwd: tempDir, encoding: 'utf8' });
            assert.match(out, /Rotated \[Unreleased\] → \[9\.9\.9\] - 2026-01-01/, 'confirms the rotation it performed');
            const rotated = fs.readFileSync(changelogPath, 'utf8');
            assert.match(rotated, /## \[Unreleased\]\s*\n\s*## \[9\.9\.9\] - 2026-01-01/, 'Unreleased renamed, fresh Unreleased opened above it');
            assert.match(rotated, /### Added\s*\n\s*- Something new\./, 'prior bullets survive under the newly-dated heading');

            // Defaults: --version from .design/.version, --date = today (UTC).
            fs.mkdirSync(path.join(tempDir, '.design'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, '.design', '.version'), '4.5.6\n');
            const out2 = execSync(`node "${scriptPath}"`, { cwd: tempDir, encoding: 'utf8' });
            const today = new Date().toISOString().slice(0, 10);
            assert.match(out2, new RegExp(`Rotated \\[Unreleased\\] → \\[4\\.5\\.6\\] - ${today}`), 'falls back to .design/.version and today when flags are omitted');
        } finally {
            cleanup(tempDir);
        }
    });

    test('release-changelog.js rotation restores per-window bullet distinguishability (R11 §4.1/§4.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { appendBullet, releaseUnreleased } = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'changelog-writer.js'));
            const changelogPath = path.join(tempDir, 'CHANGELOG.md');

            const bullet = 'Updated task plan and task index (engine)';
            const r1 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(r1.written, true, 'first cycle writes the bullet');

            // Same bullet, no rotation yet — the closed-vocabulary suppression §4.1 documents.
            const r2 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(r2.deduped, true, 'identical bullet within the same window is correctly deduped');

            const rot = releaseUnreleased(changelogPath, '1.0.0', '2026-02-01');
            assert.strictEqual(rot.written, true, 'rotation must actually write');

            // Same bullet, new window — must be writable again, not permanently suppressed.
            const r3 = appendBullet(changelogPath, 'Changed', bullet);
            assert.strictEqual(r3.written, true, 'the same real-work bullet must be writable again after rotation');

            const escaped = bullet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const occurrences = (fs.readFileSync(changelogPath, 'utf8').match(new RegExp(escaped, 'g')) || []).length;
            assert.strictEqual(occurrences, 2, 'the bullet must appear once in the released section and once in the fresh Unreleased');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js no longer references releaseUnreleased — rotation is opt-in only (R11 §4.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const src = fs.readFileSync(path.join(tempDir, '.magic', 'scripts', 'finalize.js'), 'utf8');
            assert.doesNotMatch(src, /releaseUnreleased/, 'finalize.js must not import or call releaseUnreleased');
        } finally {
            cleanup(tempDir);
        }
    });

    test("finalize.js's deduped CHANGELOG row names release-changelog as the remedy (§4.5)", () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, { workspace: 'main', autoChangelog: true });
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '- [ ] [T-1A01] Task', '',
            ].join('\n'));
            commitFixture(tempDir);

            // First run: the bullet is genuinely new — must append normally,
            // no hint. Control case for the second assertion below.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: In Progress', '---', '',
                '- [x] [T-1A01] Task', '',
            ].join('\n'));
            const firstOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            const firstRow = firstOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(firstRow, /appended to \[Unreleased\] § Changed/, 'first run: bullet is new, must append normally');
            assert.doesNotMatch(firstRow, /release-changelog/, 'first run: no hint when nothing was deduped');

            // Second run: same shape (one /tasks/ file changed) reproduces the
            // identical bullet ("Completed task (main)") — the exact §4.1
            // vocabulary-exhaustion scenario the field report reproduced.
            commitFixture(tempDir);
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), [
                '---', 'phase: 1', 'status: Done', '---', '',
                '- [x] [T-1A01] Task', '- [x] [T-1A02] Another', '',
            ].join('\n'));
            const secondOut = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, { cwd: tempDir, encoding: 'utf8' });
            const secondRow = secondOut.split('\n').find((l) => l.startsWith('| CHANGELOG |'));
            assert.match(secondRow, /skipped \(duplicate/, 'second run: identical bullet shape must dedupe exactly as §4.1 documents');
            assert.match(secondRow, /release-changelog/, 'second run: the deduped row must name the remedy (§4.5)');
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
            const mk = (rel, body) => {
                const abs = path.join(tempDir, ...rel.split('/'));
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, body);
            };
            mk('.design/PLAN.md', '# Plan\n');
            mk('.design/STATE.md', '# State\n');
            mk('.design/archives/tasks/phase-1.md', '# Phase 1\n');
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
            const out = JSON.parse(execSync(`node "${scriptPath}" --json`, { cwd: tempDir, encoding: 'utf8' }));
            const byFile = new Map(out.coverage.map((c) => [c.file, c]));

            assert.strictEqual(byFile.get('.design/PLAN.md').confidence, 'EXEMPT', 'PLAN.md must classify EXEMPT');
            assert.strictEqual(byFile.get('.design/STATE.md').confidence, 'EXEMPT', 'STATE.md must classify EXEMPT');
            assert.strictEqual(byFile.get('.design/archives/tasks/phase-1.md').confidence, 'EXEMPT', 'an archived phase journal must classify EXEMPT');
            assert.notStrictEqual(byFile.get('.design/specifications/l1-core.md').confidence, 'EXEMPT', 'specifications/ itself must NOT be exempted — unaffected by this change');
            assert.strictEqual(byFile.get('src/main.rs').confidence, 'EXTRACTED', 'genuine source coverage classification is unaffected');

            assert.ok(out.summary.exempt >= 3, 'summary.exempt must count at least the three exempted fixture files');
            assert.strictEqual(
                out.summary.total,
                out.summary.extracted + out.summary.inferred + out.summary.ambiguous + out.summary.uncovered,
                'total must be computed from the four non-exempt buckets only'
            );
            assert.strictEqual(
                out.coverage.length,
                out.summary.total + out.summary.exempt,
                'every scanned file must land in either the denominator or the exempt count, with no overlap'
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('analyze-coverage.js EXEMPT files do not move the reported coverage percentage', () => {
        const tempDir = createTempWorkspace();
        try {
            const mk = (rel, body) => {
                const abs = path.join(tempDir, ...rel.split('/'));
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, body);
            };
            writeCanonicalCoreSpec(tempDir);
            mk('src/main.rs', 'fn main() {}\n'); // EXTRACTED — establishes a non-zero, non-100% baseline
            mk('orphan.js', 'var x;\n');          // genuinely UNCOVERED — no spec references it

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'analyze-coverage.js');
            const scope = '--scope=src,orphan.js,.design';
            const before = JSON.parse(execSync(`node "${scriptPath}" --json ${scope}`, { cwd: tempDir, encoding: 'utf8' }));

            // Add EXEMPT-eligible bookkeeping files after the baseline read —
            // a wrongly-classified UNCOVERED would shift coverage_percent.
            mk('.design/PLAN.md', '# Plan\n');
            mk('.design/STATE.md', '# State\n');
            mk('.design/archives/tasks/phase-1.md', '# Phase 1\n');
            const after = JSON.parse(execSync(`node "${scriptPath}" --json ${scope}`, { cwd: tempDir, encoding: 'utf8' }));

            assert.strictEqual(after.summary.coverage_percent, before.summary.coverage_percent, 'adding EXEMPT files must not change coverage_percent');
            assert.strictEqual(after.summary.total, before.summary.total, 'adding EXEMPT files must not change the denominator');
            assert.strictEqual(after.summary.exempt, before.summary.exempt + 3, 'the three new bookkeeping files must be counted as exempt');
        } finally {
            cleanup(tempDir);
        }
    });
});
