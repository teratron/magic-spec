// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');
const { scriptsDir, createTempWorkspace, cleanup, generateChecksums } = require('./lib/base');
const { gitIn } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 8. executor.js — input validation
    // ───────────────────────────────────────────────────────────────────────────
    test('executor.js should reject path-traversal in script and workspace names', () => {
        const tempDir = createTempWorkspace();
        try {
            const executorPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'executor.js',
            );

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

            const scriptPath = path.join(
                tempDir,
                'skills',
                'magicspec',
                'scripts',
                'install-hooks.js',
            );
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
    const HOOK_CHAIN_LINE =
        'node skills/magicspec/scripts/executor.js update-engine-meta --check || exit 1';
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

            fs.appendFileSync(
                path.join(drifted, 'skills', 'magicspec', 'scripts', 'check-bloat.js'),
                ' ',
            );
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
};
