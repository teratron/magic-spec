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
            const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
            execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });

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
            const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
            execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });

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
            const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
            execSync(`node "${checksumScript}"`, { cwd: tempDir });

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
            const checksumScript = path.join(tempDir, 'dev', 'scripts', 'generate-checksums.js');
            execSync(`node "${checksumScript}"`, { cwd: tempDir });

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
    // 7. update-state.js
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js should bootstrap, patch fields and append decision/constraint', () => {
        const tempDir = createTempWorkspace();
        try {
            // Copy real state template so bootstrap path exercises template branch
            const realTemplate = path.resolve(__dirname, '..', '..', '.magic', 'templates', 'state.md');
            if (fs.existsSync(realTemplate)) {
                fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
            }

            const wsDir = path.join(tempDir, '.design', 'main');
            fs.mkdirSync(wsDir, { recursive: true });

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
            assert.ok(
                /## Recent Decisions[\s\S]*Adopt SDD workflow/.test(afterDecision),
                'Decision entry should be inserted under Recent Decisions'
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
            const wsDir = path.join(tempDir, '.design', 'engine');
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            const tasksPath = path.join(wsDir, 'TASKS.md');

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
            const wsDir = path.join(tempDir, '.design', 'engine');
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });
            const tasksPath = path.join(wsDir, 'TASKS.md');

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

    test('finalize.js patches STATE.md and suggests a commit on the skip path (SC-2/SC-3)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const realTemplate = path.resolve(__dirname, '..', '..', '.magic', 'templates', 'state.md');
            if (fs.existsSync(realTemplate)) {
                fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
            }
            const designDir = path.join(tempDir, '.design');
            const wsDir = path.join(designDir, 'main');
            fs.mkdirSync(wsDir, { recursive: true });
            fs.writeFileSync(path.join(designDir, 'workspace.json'), JSON.stringify({
                default: 'main',
                finalization: { enabled: true, autoBump: true, autoChangelog: false, suggestCommit: true, versionPath: '.design/.version' },
            }));
            fs.writeFileSync(path.join(designDir, '.version'), '0.1.0');
            fs.writeFileSync(path.join(wsDir, 'TASKS.md'), '## Active Phases\n\n*None — plan complete.*\n');
            // Commit the fixture so HEAD exists and no whitelisted file changed → skip path.
            execSync('git add -A', { cwd: tempDir, stdio: 'ignore' });
            execSync('git commit -m "fixture"', { cwd: tempDir, stdio: 'ignore' });

            const finalizePath = path.join(tempDir, '.magic', 'scripts', 'finalize.js');
            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, { cwd: tempDir, encoding: 'utf8' });

            assert.match(out, /No significant changes|Finalization complete/, 'finalize should run on the skip path');
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(fs.existsSync(statePath), 'SC-2: STATE.md created/patched even on the skip path');
            const state = fs.readFileSync(statePath, 'utf8');
            assert.match(state, /\*\*Updated:\*\*/, 'STATE.md carries an Updated timestamp');
            assert.match(state, /\/magic\.task main/, 'SC-2.1 e2e: plan-complete next-action routes through the /magic.task funnel');
            assert.doesNotMatch(state, /Next Action:.*\/magic\.spec/, '§5: the persisted Next Action never names /magic.spec');
            // STATE.md write dirties the tree → SC-3 non-bumping suggestion is emitted.
            assert.match(out, /Suggested commit message/, 'SC-3: a commit suggestion is emitted');
            assert.match(fs.readFileSync(path.join(designDir, '.version'), 'utf8'), /^0\.1\.0$/, 'skip path does not bump the version');
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
            const archiver = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'phase-archiver.js'));
            const wsDir = path.join(tempDir, '.design', 'engine');
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });

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

    // ───────────────────────────────────────────────────────────────────────────
    // 7d. phase-archiver.js — archival rewrites links in PLAN.md, not only TASKS.md
    // ───────────────────────────────────────────────────────────────────────────
    test('archiveCompletedPhases rewrites phase links in both TASKS.md and PLAN.md', () => {
        const tempDir = createTempWorkspace();
        try {
            const archiver = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'phase-archiver.js'));
            const wsDir = path.join(tempDir, '.design', 'engine');
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });

            fs.writeFileSync(path.join(tasksDir, 'phase-3.md'),
                '---\nphase: 3\nname: "Shipping"\nstatus: Done\n---\n\n' +
                '## Atomic Checklist\n\n- [x] [T-3A01] Ship it\n');

            const tasksPath = path.join(wsDir, 'TASKS.md');
            fs.writeFileSync(tasksPath, [
                '# Master Task Index',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 3](tasks/phase-3.md) | Shipping | `Done` |',
                '',
            ].join('\n'));

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

    // ───────────────────────────────────────────────────────────────────────────
    // 7e. update-state.js — autoProgress merges, never clobbers narrative (SC-2)
    // ───────────────────────────────────────────────────────────────────────────
    test('updateState autoProgress refreshes counter lines but preserves narrative in the Progress block', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState } = require(path.join(tempDir, '.magic', 'scripts', 'update-state.js'));
            const wsDir = path.join(tempDir, '.design', 'engine');
            fs.mkdirSync(wsDir, { recursive: true });

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
            const wsDir = path.join(tempDir, '.design', 'engine');
            fs.mkdirSync(wsDir, { recursive: true });

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

    // ───────────────────────────────────────────────────────────────────────────
    // 7f. phase-archiver.js — CRLF frontmatter tolerance (Windows checkouts)
    // ───────────────────────────────────────────────────────────────────────────
    test('phase-archiver findArchiveCandidates parses CRLF frontmatter (git autocrlf)', () => {
        const tempDir = createTempWorkspace();
        try {
            const archiver = require(path.join(tempDir, '.magic', 'scripts', 'lib', 'phase-archiver.js'));
            const wsDir = path.join(tempDir, '.design', 'engine');
            const tasksDir = path.join(wsDir, 'tasks');
            fs.mkdirSync(tasksDir, { recursive: true });

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
            const specsDir = path.join(tempDir, '.design', 'specifications');
            fs.mkdirSync(specsDir, { recursive: true });
            fs.writeFileSync(
                path.join(specsDir, 'l1-core.md'),
                '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n'
            );

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
            const specsDir = path.join(tempDir, '.design', 'specifications');
            fs.mkdirSync(specsDir, { recursive: true });
            fs.writeFileSync(
                path.join(specsDir, 'l1-core.md'),
                '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n'
            );

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
            assert.strictEqual(parseFlags(['--workspace=nodus'], spec).values['--workspace'], 'nodus');
            assert.strictEqual(parseFlags(['--workspace', 'nodus'], spec).values['--workspace'], 'nodus');

            // Unrecognized tokens pass through untouched (executor forwards them to the child).
            const proxied = parseFlags(['--json', '--require-tasks', '--workspace', 'nodus'], spec);
            assert.deepStrictEqual(proxied.rest, ['--require-tasks'], 'unknown tokens survive in rest');
            assert.strictEqual(proxied.flags['--json'], true, 'boolean flags are captured, not forwarded');
            assert.strictEqual(proxied.values['--workspace'], 'nodus');
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
    //      Field report: `generate-context --workspace nodus` silently wrote
    //      .design/main/CONTEXT.md while `--workspace=nodus` wrote the target.
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js routes --workspace <name> identically to --workspace=<name>', () => {
        const tempDir = createTempWorkspace();
        try {
            for (const ws of ['main', 'nodus']) {
                fs.mkdirSync(path.join(tempDir, '.design', ws), { recursive: true });
            }
            fs.writeFileSync(
                path.join(tempDir, '.design', 'workspace.json'),
                JSON.stringify({ default: 'main', workspaces: { main: {}, nodus: {} } })
            );

            const executorPath = path.join(tempDir, '.magic', 'scripts', 'executor.js');
            const contextOf = (ws) => path.join(tempDir, '.design', ws, 'CONTEXT.md');
            const clearContexts = () => {
                for (const ws of ['main', 'nodus']) {
                    if (fs.existsSync(contextOf(ws))) fs.unlinkSync(contextOf(ws));
                }
            };

            // (a) Space form must hit the requested workspace, not the default.
            clearContexts();
            execSync(`node "${executorPath}" generate-context --workspace nodus`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(contextOf('nodus')), 'space form must write the target workspace');
            assert.ok(!fs.existsSync(contextOf('main')), 'space form must not fall back to the default workspace');

            // (b) Equals form — the control that always worked.
            clearContexts();
            execSync(`node "${executorPath}" generate-context --workspace=nodus`, { cwd: tempDir, stdio: 'pipe' });
            assert.ok(fs.existsSync(contextOf('nodus')), 'equals form must write the target workspace');
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
                assert.ok(!fs.existsSync(contextOf('nodus')), `${why} — and nothing may be written`);
            };

            expectHalt('--workspace bogus', 'a typo in the space form must HALT, not silently target the default');
            expectHalt('--workspace=bogus', 'a typo in the equals form must HALT');
            expectHalt('--workspace', 'a bare --workspace must HALT, not fall back to the default');
            expectHalt('--workspace=', 'an empty --workspace value must HALT');
            expectHalt('--workspace=nodus=typo', "an embedded '=' must fail validation, not truncate to 'nodus'");

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
            const realTemplate = path.resolve(__dirname, '..', '..', '.magic', 'templates', 'state.md');
            if (fs.existsSync(realTemplate)) {
                fs.copyFileSync(realTemplate, path.join(tempDir, '.magic', 'templates', 'state.md'));
            }
            const wsDir = path.join(tempDir, '.design', 'nodus');
            fs.mkdirSync(wsDir, { recursive: true });

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'update-state.js');
            const rootState = path.join(tempDir, '.design', 'STATE.md');
            const wsState = path.join(wsDir, 'STATE.md');

            // (a) Space form targets the requested directory.
            execSync(`node "${scriptPath}" --workspace .design/nodus --status=Active`, { cwd: tempDir, stdio: 'pipe' });
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
            execSync(`node "${scriptPath}" --workspace=.design/nodus --status=Active`, { cwd: tempDir, stdio: 'pipe' });
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
});
