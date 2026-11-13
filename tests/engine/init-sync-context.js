// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const {
    createTempWorkspace,
    cleanup,
    generateChecksums,
    copyGlobalIndexTemplate,
} = require('./lib/base');
const { simPutter } = require('./lib/sim');

module.exports = () => {
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

            // skills/magicspec/CONSTITUTION.md §1 step 3: Auto-Init seeds a correctly-seeded Engine
            // Version snapshot on its own, not left for /magicspec analyze to add later
            // (field report, engine v2.1.104: fresh init produced no snapshot at all).
            const freshIndex = fs.readFileSync(
                path.join(tempDir, '.magicspec', 'INDEX.md'),
                'utf8',
            );
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
            // Setup the seed of a guide that does not exist yet (a maintenance artifact beside the script)
            const templatesDir = path.join(tempDir, 'scripts', 'templates');
            fs.mkdirSync(templatesDir, { recursive: true });
            fs.writeFileSync(
                path.join(templatesDir, 'contributing.md'),
                '# Contributing <!-- generated:version --><!-- /generated:version -->\n\n## Registry\n\n<!-- generated:workspaces -->\n<!-- /generated:workspaces -->\n',
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
            fs.writeFileSync(path.join(workflowsDir, 'arg-wf.md'), '# Arg Workflow\n');

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
            assert.ok(
                contributing.includes(
                    '<!-- generated:version -->v1.0.0<!-- /generated:version -->',
                ),
            );
            assert.ok(
                !contributing.includes('Rule 1'),
                'the constitution is no longer embedded in the guide',
            );
            assert.ok(contributing.includes('| test | desc |'));

            // Verify docs sync (version and triggers)
            const docContent = fs.readFileSync(path.join(docsDir, 'test-wf.md'), 'utf8');
            assert.ok(docContent.includes('v1.0.0'), 'Doc version should be updated');
            assert.ok(docContent.includes('`new-trigger`'), 'Doc triggers should be updated');
            assert.ok(docContent.includes('`another-trigger`'), 'Doc triggers should be updated');
            assert.ok(
                docContent.includes('**Slash command:** `/magicspec test-wf`'),
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
                argDocContent.includes('**Slash command:** `/magicspec arg-wf [old]`'),
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

    test('the maintenance pipeline runs the shipped sync pass as its project-meta stage: it writes the registry count once, bumps no registry version and appends no history row, and its dry run lists the report and writes nothing (SY-9)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const put = simPutter(tempDir);
            put(
                '.magicspec/workspace.json',
                JSON.stringify({ default: 'ws', workspaces: { ws: { description: 'W' } } }),
            );
            const index = (count) =>
                `# Index\n\n**Version:** 1.0.0\n\n## Workspaces\n\n| Workspace | Description | Specs | Registry |\n| --- | --- | --- | --- |\n| ws | W | ${count} | [ws/INDEX.md](ws/INDEX.md) |\n\n## Document History\n\n| Version | Date | Author | Description |\n| --- | --- | --- | --- |\n| 1.0.0 | 2026-01-01 | Agent | First |\n`;
            put('.magicspec/INDEX.md', index(7));
            put(
                '.magicspec/ws/INDEX.md',
                '# R\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n| [l1-a.md](specifications/l1-a.md) | A | Stable | 1 | 1.0.0 |\n',
            );
            put(
                '.magicspec/ws/specifications/l1-a.md',
                '# A\n\n**Version:** 1.0.0\n**Status:** Stable\n',
            );
            put('.magicspec/RULES.md', '# Rules\n');
            const pipeline = (...flags) =>
                execFileSync(
                    process.execPath,
                    [
                        path.join(tempDir, 'scripts', 'sync.js'),
                        '--skip-meta',
                        '--skip-links',
                        '--skip-docs',
                        ...flags,
                    ],
                    {
                        cwd: tempDir,
                        encoding: 'utf8',
                        env: { ...process.env, MAGIC_ROOT: '' },
                    },
                );
            const read = () => fs.readFileSync(path.join(tempDir, '.magicspec/INDEX.md'), 'utf8');

            const preview = pipeline('--dry-run');
            assert.ok(
                preview.includes('[Sync] (dry run)') && preview.includes('would write'),
                preview,
            );
            assert.strictEqual(read(), index(7), 'a dry run of the pipeline writes nothing');

            const first = pipeline();
            assert.ok(first.includes('registry: .magicspec/INDEX.md — ws Specs 7 → 1'), first);
            assert.strictEqual(
                read(),
                index(1),
                'only the count changed: no version bump, no Last Updated stamp, no history row',
            );
            const second = pipeline();
            assert.match(second, /\[Sync\] 0 written · /, second);
            assert.ok(!second.includes('registry:'), 'the second run reports no registry write');
            assert.strictEqual(
                read(),
                index(1),
                'a second pipeline run writes nothing to the registry',
            );
            assert.ok(
                !fs.existsSync(path.join(tempDir, 'scripts', 'update-project-meta.js')),
                'the retired updater is gone',
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
            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'generate-context.js',
            );
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
            fs.appendFileSync(
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'init.js'),
                '\n// drift\n',
            );

            const executorPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'executor.js',
            );
            execSync(`node "${executorPath}" update-engine-meta`, { cwd: tempDir });

            const versionFile = path.join(tempDir, 'skills', 'magicspec', '.version');
            const newVersion = fs.readFileSync(versionFile, 'utf8').trim();
            assert.strictEqual(newVersion, '1.0.1');
        } finally {
            cleanup(tempDir);
        }
    });
};
