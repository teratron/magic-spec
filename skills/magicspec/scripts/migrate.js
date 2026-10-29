#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
    resolveProjectRoot,
    STATE_DIR_NAME,
    LEGACY_STATE_DIR_NAME,
    normalizePath,
    hashFileSafe,
    executorHint,
} = require('./utils');
const hosts = require('./lib/hosts');

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION FROM THE 2.x LAYOUT
// ═══════════════════════════════════════════════════════════════════════════
//
// A project on 2.x has the engine in `.magic/`, command wrappers in `workflows/`,
// `skills/magic-*` and `rules/magic.md` (and copies of them under the host folders),
// and its state in the earlier state folder. This subcommand takes it to the layout
// of the skill folder it runs from. It reads the filesystem and never a log, so it
// can be run again after any interruption, and it removes the old engine last, after
// the new one is installed and verified, so the project is never left with neither.
//
//   node <skill folder>/scripts/executor.js migrate              (the plan; nothing changes)
//   node <skill folder>/scripts/executor.js migrate --apply      (do it)
//   node <skill folder>/scripts/executor.js migrate --apply --host=claude,codex

/** The engine folder of the 2.x layout. */
const OLD_ENGINE_DIR = '.magic';

/** The commands the 2.x layout shipped wrappers for. */
const OLD_COMMANDS = ['analyze', 'graph', 'rule', 'run', 'spec', 'status', 'task'];

/** Folders (relative to the project) in which 2.x wrappers and copies of them were placed. */
const WRAPPER_BASES = ['', '.agents', '.claude', '.codex', '.qwen', '.gemini', '.cursor', '.kilocode', '.lingma'];

/** Names the command folders carried in the hosts of the 2.x layout. */
const COMMAND_FOLDERS = ['workflows', 'commands', 'prompts'];

/** Host folder (relative to the project) → host name of the host table. */
const HOST_FOLDERS = { '.claude': 'claude', '.agents': 'codex', '.codex': 'codex', '.qwen': 'qwen' };

const STEPS = [
    'detect the layout',
    'plan',
    'verify the old engine against its manifest',
    'back up the files to be removed',
    'install the projections and the hook',
    'rename the state folder',
    'remove the old engine',
    'verify the result',
];

// ───────────────────────────────────────────────────────────────────────────
// Detection
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} p - Path to probe.
 * @returns {boolean} True when it exists.
 */
const exists = (p) => fs.existsSync(p);

/**
 * Reads what the project looks like: which engine and state folders exist and which
 * files of the 2.x layout are present. Pure filesystem; no side effects.
 *
 * @param {string} root - Project root.
 * @returns {{
 *   version: string|null, oldEngine: boolean, oldState: boolean, newState: boolean,
 *   manifest: Object<string,string>|null, manifestFiles: string[], wrappers: string[], hostNames: string[]
 * }}
 */
function detect(root) {
    const engineDir = path.join(root, OLD_ENGINE_DIR);
    const oldEngine = exists(path.join(engineDir, '.version'));
    const version = oldEngine ? fs.readFileSync(path.join(engineDir, '.version'), 'utf8').trim() : null;

    let manifest = null;
    if (oldEngine && exists(path.join(engineDir, '.checksums'))) {
        try {
            manifest = JSON.parse(fs.readFileSync(path.join(engineDir, '.checksums'), 'utf8'));
        } catch {
            manifest = null;
        }
    }

    const wrappers = [];
    for (const base of WRAPPER_BASES) {
        for (const folder of COMMAND_FOLDERS) {
            for (const cmd of OLD_COMMANDS) {
                const rel = normalizePath(path.join(base, folder, `magic.${cmd}.md`));
                if (exists(path.join(root, rel))) wrappers.push(rel);
            }
        }
        for (const cmd of OLD_COMMANDS) {
            const rel = normalizePath(path.join(base, 'skills', `magic-${cmd}`, 'SKILL.md'));
            if (exists(path.join(root, rel))) wrappers.push(rel);
        }
        const rule = normalizePath(path.join(base, 'rules', 'magic.md'));
        if (exists(path.join(root, rule))) wrappers.push(rule);
    }

    const legacyState = path.join(root, LEGACY_STATE_DIR_NAME);
    const oldState = exists(path.join(legacyState, 'workspace.json')) || exists(path.join(legacyState, 'INDEX.md'));
    const hostNames = [
        ...new Set(
            Object.entries(HOST_FOLDERS)
                .filter(([folder]) => exists(path.join(root, folder)))
                .map(([, name]) => name),
        ),
    ];

    return {
        version,
        oldEngine,
        oldState,
        newState: exists(path.join(root, STATE_DIR_NAME)),
        manifest,
        manifestFiles: manifest
            ? Object.keys(manifest).filter((rel) => isInside(engineDir, rel) && exists(path.join(engineDir, rel)))
            : [],
        wrappers,
        hostNames,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Steps
// ───────────────────────────────────────────────────────────────────────────

/**
 * The old manifest is a file of the project being migrated, so its keys are data: a key
 * that leaves the folder it is listed under must never reach a hash or a removal.
 *
 * @param {string} base - Absolute folder the path must stay inside.
 * @param {string} rel - Path relative to `base`.
 * @returns {boolean} True when `rel` resolves to a place strictly inside `base`.
 */
function isInside(base, rel) {
    if (typeof rel !== 'string' || rel.includes('\0') || path.isAbsolute(rel)) return false;
    const inner = path.relative(base, path.resolve(base, rel));
    return inner !== '' && !inner.startsWith('..') && !path.isAbsolute(inner);
}

/**
 * Compares each file the old manifest names with the manifest. A file that differs
 * is the user's change and is kept.
 *
 * @param {string} root - Project root.
 * @param {ReturnType<typeof detect>} state - Detection result.
 * @returns {{removable: string[], modified: string[]}} Project-relative paths.
 */
function classify(root, state) {
    const removable = [];
    const modified = [];
    for (const rel of state.manifestFiles) {
        const full = path.join(root, OLD_ENGINE_DIR, rel);
        const expected = state.manifest[rel];
        if (hashFileSafe(full) === expected) removable.push(normalizePath(path.join(OLD_ENGINE_DIR, rel)));
        else modified.push(normalizePath(path.join(OLD_ENGINE_DIR, rel)));
    }
    return { removable, modified };
}

/**
 * @param {string} root - Project root.
 * @returns {string} Absolute path of today's backup folder.
 */
function backupDir(root) {
    return path.join(root, `magicspec-migration-backup-${new Date().toISOString().slice(0, 10)}`);
}

/**
 * Copies files into the backup folder, keeping their project-relative paths.
 *
 * @param {string} root - Project root.
 * @param {string[]} rels - Project-relative files.
 * @returns {number} How many were copied.
 */
function backUp(root, rels) {
    const dest = backupDir(root);
    let n = 0;
    for (const rel of rels) {
        const from = path.join(root, rel);
        if (!exists(from)) continue;
        const to = path.join(dest, rel);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        n++;
    }
    return n;
}

/**
 * Rewrites the entries of `workspace.json` that equal the old state folder name.
 *
 * @param {string} root - Project root.
 * @returns {boolean} True when the file changed.
 */
function rewriteWorkspaceJson(root) {
    const file = path.join(root, STATE_DIR_NAME, 'workspace.json');
    if (!exists(file)) return false;
    const text = fs.readFileSync(file, 'utf8');
    const next = text.split(`"${LEGACY_STATE_DIR_NAME}"`).join(`"${STATE_DIR_NAME}"`).split(`"${LEGACY_STATE_DIR_NAME}/`).join(`"${STATE_DIR_NAME}/`);
    if (next === text) return false;
    fs.writeFileSync(file, next);
    return true;
}

/**
 * Removes a file and then any parent folder it leaves empty, up to (not including) the root.
 *
 * @param {string} root - Project root.
 * @param {string} rel - Project-relative file.
 */
function removeFile(root, rel) {
    const full = path.join(root, rel);
    if (exists(full)) fs.rmSync(full);
    let dir = path.dirname(full);
    while (dir.startsWith(root) && dir !== root) {
        try {
            if (fs.readdirSync(dir).length > 0) break;
            fs.rmdirSync(dir);
        } catch {
            break;
        }
        dir = path.dirname(dir);
    }
}

/**
 * Runs one engine subcommand of this folder in the project and returns its stdout.
 *
 * @param {string} root - Project root.
 * @param {string} script - Subcommand name.
 * @param {string[]} args - Its arguments.
 * @returns {{ok: boolean, out: string}} Whether it exited 0, and its output.
 */
function runEngine(root, script, args = []) {
    try {
        const out = execFileSync(process.execPath, [path.join(__dirname, 'executor.js'), script, ...args], {
            cwd: root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, out };
    } catch (err) {
        return { ok: false, out: `${err.stdout || ''}${err.stderr || ''}` };
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Runs the migration.
 *
 * @param {string[]} argv - Arguments after the subcommand name.
 * @returns {number} Exit code.
 */
function main(argv) {
    const apply = argv.includes('--apply');
    const hostArg = argv.find((a) => a.startsWith('--host='));
    const root = resolveProjectRoot();
    const state = detect(root);
    let stepNo = 0;
    const step = (n) => {
        stepNo = n;
    };

    try {
        step(1);
        if (state.oldState && state.newState) {
            console.error(
                `HALT: Both ${LEGACY_STATE_DIR_NAME}/ and ${STATE_DIR_NAME}/ exist. A migration was started and not finished, or ${STATE_DIR_NAME}/ was created by mistake. ` +
                    `Recommended path: finish it with \`${executorHint()} migrate --apply\` once ${STATE_DIR_NAME}/ holds nothing you need; the old state folder is never deleted by this command.`,
            );
            return 1;
        }
        if (state.oldEngine && !/^2\./.test(state.version || '')) {
            console.error(
                `HALT: ${OLD_ENGINE_DIR}/.version reads ${state.version || 'nothing'}. This command migrates the 2.x layout only; bring the project to the last 2.x release first, then run it.`,
            );
            return 1;
        }
        if (!state.oldEngine && !state.oldState && state.wrappers.length === 0) {
            console.log('Nothing to migrate: no 2.x engine, wrapper or state folder was found.');
            return 0;
        }

        step(2);
        const { removable, modified } = classify(root, state);
        const wrapperFiles = state.wrappers;
        // Without a manifest nothing of the engine folder is named, so only the wrappers are listed.
        const toRemove = [...removable, ...wrapperFiles];
        const manifestless = state.oldEngine && !state.manifest;
        const hostList = hostArg ? hostArg.slice('--host='.length).split(',').filter(Boolean) : state.hostNames;

        console.log(apply ? 'Migration plan (applying):' : 'Migration plan (dry run — nothing changes without --apply):');
        console.log(`  Layout found: engine ${state.oldEngine ? state.version : 'none'}, state folder ${state.oldState ? LEGACY_STATE_DIR_NAME + '/' : state.newState ? STATE_DIR_NAME + '/ (already renamed)' : 'none'}`);
        console.log(`  1. Back up ${toRemove.length} file(s) to ${path.basename(backupDir(root))}/`);
        console.log(`  2. Install the projections for: ${hostList.length > 0 ? hostList.join(', ') : '(no host found — run init --host=<name> afterwards)'}, and the pre-commit hook`);
        console.log(`  3. ${state.oldState ? `Rename ${LEGACY_STATE_DIR_NAME}/ to ${STATE_DIR_NAME}/ and rewrite the workspace.json entries that name it` : 'State folder: nothing to rename'}`);
        console.log(`  4. Remove ${toRemove.length} file(s) of the old engine, last${manifestless ? ' (the manifest is missing: the engine folder is kept)' : ''}`);
        for (const rel of toRemove) console.log(`       - ${rel}`);
        for (const rel of modified) console.log(`     ENGINE_FILE_MODIFIED ${rel} — differs from the old manifest; kept`);
        if (!apply) {
            console.log(`Run \`${executorHint()} migrate --apply\` to execute the plan. It can be re-run after any interruption.`);
            return 0;
        }

        step(3);
        if (manifestless) console.log('ENGINE_MANIFEST_MISSING: the old manifest is gone, so no file of the engine folder is removed.');
        step(4);
        const copied = backUp(root, toRemove);
        console.log(`Backed up ${copied} file(s) to ${path.basename(backupDir(root))}/`);

        step(5);
        for (const name of hostList) {
            if (!Object.hasOwn(hosts.HOSTS, name)) {
                console.error(`HALT: Unknown host '${name}'. Known hosts: ${Object.keys(hosts.HOSTS).join(', ')}.`);
                return 1;
            }
            console.log(`  ${hosts.HOSTS[name].label}`);
            for (const row of hosts.projectHost(name, root)) console.log(`    ${row.action}: ${row.path}`);
        }
        if (exists(path.join(root, '.git'))) {
            const hook = runEngine(root, 'install-hooks');
            if (!hook.ok) console.warn(`Note: the pre-commit hook was not installed (${hook.out.trim().split('\n')[0]}).`);
        }

        step(6);
        if (state.oldState) {
            fs.renameSync(path.join(root, LEGACY_STATE_DIR_NAME), path.join(root, STATE_DIR_NAME));
            console.log(`Renamed ${LEGACY_STATE_DIR_NAME}/ to ${STATE_DIR_NAME}/`);
        }
        if (rewriteWorkspaceJson(root)) console.log('Rewrote the workspace.json entries that named the old folder.');

        step(7);
        for (const rel of toRemove) removeFile(root, rel);
        for (const rel of ['.magic/.checksums', '.magic/.version']) {
            if (!manifestless && modified.length === 0) removeFile(root, rel);
        }
        console.log(`Removed ${(toRemove).length} file(s) of the old engine.`);

        step(8);
        const check = runEngine(root, 'check-prerequisites', ['--json']);
        let ok = false;
        try {
            ok = JSON.parse(check.out).ok === true;
        } catch {
            ok = false;
        }
        console.log(ok ? 'Pre-flight: ok.' : 'Pre-flight reported findings: run check-prerequisites to read them.');
        console.log('Commands are now /magicspec:spec, /magicspec:task, /magicspec:run, /magicspec:analyze, /magicspec:rule, /magicspec:status and /magicspec:graph.');
        console.log(`Suggested commit (not executed): git add -A && git commit -m "chore: migrate to the magicspec skill layout"`);
        console.log(`Add magicspec-migration-backup-*/ to .gitignore, or delete the backup once you have checked the result.`);
        return 0;
    } catch (err) {
        console.error(`HALT: step ${stepNo} (${STEPS[stepNo - 1]}) failed: ${err.message}. Fix the cause and run the command again; it resumes from the filesystem.`);
        return 1;
    }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { detect, classify, main, OLD_ENGINE_DIR, OLD_COMMANDS };
