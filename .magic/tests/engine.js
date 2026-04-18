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
    const scriptsDir = path.resolve(__dirname, '..', 'scripts');

    const createTempWorkspace = (withGit = false) => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-test-'));
        fs.mkdirSync(path.join(tempDir, '.magic'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'scripts'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'history'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, '.magic', 'templates'), { recursive: true });

        fs.readdirSync(scriptsDir).forEach(script => {
            const src = path.join(scriptsDir, script);
            if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, path.join(tempDir, '.magic', 'scripts', script));
            }
        });
        fs.writeFileSync(path.join(tempDir, '.magic', '.version'), '1.0.0');

        if (withGit) {
            try {
                execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
                execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
                execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
                // Initial commit with a baseline file
                fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test Project');
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
            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'generate-checksums.js');
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
            // Setup manifests
            const pkgPath = path.join(tempDir, 'package.json');
            fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '0.0.1' }, null, 2));

            const pyPath = path.join(tempDir, 'pyproject.toml');
            fs.writeFileSync(pyPath, '[project]\nversion = "0.0.1"\n');

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
            fs.writeFileSync(path.join(docsDir, 'test-wf.md'), '# Test Workflow v0.0.1\n\n### Triggers\n- Old Trigger\n');

            const workflowsDir = path.join(tempDir, 'workflows');
            fs.mkdirSync(workflowsDir);
            fs.writeFileSync(path.join(workflowsDir, 'magic.test-wf.md'), '---\ndescription: test\n---\n**Triggers**: `new-trigger`, `another-trigger`');

            const scriptPath = path.join(tempDir, '.magic', 'scripts', 'sync.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });

            // Verify manifests
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            assert.strictEqual(pkg.version, '1.0.0');
            const py = fs.readFileSync(pyPath, 'utf8');
            assert.ok(py.includes('version = "1.0.0"'));

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
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: "test" }));

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
    test('executor.js should bump version and update history', () => {
        const tempDir = createTempWorkspace(true);
        try {
            // Setup history
            const historyFile = path.join(tempDir, '.magic', 'history', 'init.md');
            fs.writeFileSync(historyFile, '# Hist\n| Version | Date | Desc |\n| :--- | :--- | :--- |\n| 1.0.0 | 2024-01-01 | Old |\n');

            // update-engine-meta bails early when .checksums is missing (initializes and returns).
            // Seed checksums so the bump branch is exercised.
            const checksumScript = path.join(tempDir, '.magic', 'scripts', 'generate-checksums.js');
            execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });

            // Trigger drift: modify a file so update-engine-meta detects change and bumps version
            fs.appendFileSync(path.join(tempDir, '.magic', 'scripts', 'init.js'), '\n// drift\n');

            const executorPath = path.join(tempDir, '.magic', 'scripts', 'executor.js');
            execSync(`node "${executorPath}" update-engine-meta --workflow init --message "Bumped"`, { cwd: tempDir });

            const versionFile = path.join(tempDir, '.magic', '.version');
            const newVersion = fs.readFileSync(versionFile, 'utf8').trim();
            assert.strictEqual(newVersion, '1.0.1');

            const updatedHistory = fs.readFileSync(historyFile, 'utf8');
            assert.ok(updatedHistory.includes('1.0.1'));
            assert.ok(updatedHistory.includes('Bumped'));
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

            // Need checksums to pass integrity check
            const checksumScript = path.join(tempDir, '.magic', 'scripts', 'generate-checksums.js');
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
    // 7. update-state.js
    // ───────────────────────────────────────────────────────────────────────────
    test('update-state.js should bootstrap, patch fields and append decision/constraint', () => {
        const tempDir = createTempWorkspace();
        try {
            // Copy real state template so bootstrap path exercises template branch
            const realTemplate = path.resolve(__dirname, '..', 'templates', 'state.md');
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
});

