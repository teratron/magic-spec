#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('clean-cache', module);

const fs = require('fs');
const path = require('path');
const { graphPaths, normalizePath, resolveProjectRoot, STATE_DIR_NAME } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CLEAN CACHE (Remove What the Engine Can Rebuild)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Removes the rebuildable caches of the project: what the engine derives from the specifications
 * and the plan and writes under the state folder — the graph extraction cache, the query snapshot,
 * the interactive page, the wiki, the finalize state, the documentation-sync state (which exists in
 * the engine's own repository only) and the memory index.
 * Each is rebuilt by the command that owns it, so removing one destroys no work and the command
 * asks nothing.
 *
 * It never touches what cannot be rebuilt: the diagnostics sink (recorded findings), the feedback
 * notes, the graph baselines a person saved, and the migration backups in the project root. The
 * backups are listed, with their age and the command that deletes one by hand, and left alone.
 * Nothing outside the state folder is removed, and a link is never followed.
 *
 * Usage:
 *   node skills/magicspec/scripts/executor.js clean-cache [--dry-run]
 */

const BACKUP_PREFIX = 'magicspec-migration-backup-';
const DAY_MS = 24 * 60 * 60 * 1000;

// ───────────────────────────────────────────────────────────────────────────
// What Is a Rebuildable Cache
// ───────────────────────────────────────────────────────────────────────────

/**
 * The rebuildable caches under a state folder, whether or not they exist yet.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {string[]} Absolute paths, in the order they are listed.
 */
function rebuildableCaches(designAbs) {
    const graph = graphPaths(designAbs);
    const cache = path.join(designAbs, '.cache');
    return [
        graph.cache,
        path.join(graph.dir, 'query.json'),
        graph.html,
        graph.wiki,
        path.join(cache, 'finalize-state.json'),
        path.join(cache, 'docs-state.json'),
        path.join(cache, 'memory.sqlite'),
        path.join(cache, 'memory.json'),
    ];
}

// ───────────────────────────────────────────────────────────────────────────
// Measuring
// ───────────────────────────────────────────────────────────────────────────

/**
 * Counts the files under a path and adds their sizes. A link inside is counted as itself, not followed.
 *
 * @param {string} target - Absolute path of a file or folder.
 * @returns {{files: number, bytes: number}}
 */
function measure(target) {
    const stat = fs.lstatSync(target);
    if (!stat.isDirectory()) return { files: 1, bytes: stat.size };
    let files = 0;
    let bytes = 0;
    for (const name of fs.readdirSync(target)) {
        const inner = measure(path.join(target, name));
        files += inner.files;
        bytes += inner.bytes;
    }
    return { files, bytes };
}

/**
 * @param {number} bytes - A size.
 * @returns {string} `812 B`, `41.2 KB` or `3.1 MB`.
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {number} count - A number of files.
 * @returns {string} `1 file` or `12 files`.
 */
function formatFiles(count) {
    return `${count} ${count === 1 ? 'file' : 'files'}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Backups
// ───────────────────────────────────────────────────────────────────────────

/**
 * Finds the migration backups in the project root.
 *
 * @param {string} projectRoot - Absolute project root.
 * @param {number} now - The time to measure age from, in milliseconds.
 * @returns {{name: string, days: number, bytes: number}[]} Oldest first.
 */
function findBackups(projectRoot, now) {
    let names;
    try {
        names = fs.readdirSync(projectRoot);
    } catch {
        return [];
    }
    const found = [];
    for (const name of names.sort()) {
        if (!name.startsWith(BACKUP_PREFIX)) continue;
        const full = path.join(projectRoot, name);
        let stat;
        try {
            stat = fs.lstatSync(full);
        } catch {
            continue;
        }
        if (!stat.isDirectory()) continue;
        // The date in the name is when the backup was made; the folder's own time is the fallback.
        const dated = /(\d{4}-\d{2}-\d{2})$/.exec(name);
        const madeAt = dated ? Date.parse(`${dated[1]}T00:00:00Z`) : stat.mtimeMs;
        let bytes = 0;
        try {
            bytes = measure(full).bytes;
        } catch {
            /* a backup that cannot be measured is still listed */
        }
        found.push({ name, days: Math.max(0, Math.floor((now - madeAt) / DAY_MS)), bytes });
    }
    return found;
}

/**
 * @param {string} name - A backup folder's name.
 * @returns {string} The command that deletes it by hand on this platform.
 */
function deleteCommand(name) {
    return process.platform === 'win32'
        ? `Remove-Item -Recurse -Force "${name}"`
        : `rm -r "${name}"`;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Entry point.
 *
 * @returns {number} Exit code: 1 when a cache could not be removed, else 0.
 */
function main() {
    const dryRun = process.argv.slice(2).includes('--dry-run');
    const projectRoot = resolveProjectRoot();
    const designAbs = path.join(projectRoot, STATE_DIR_NAME);
    const shown = (target) => normalizePath(path.relative(projectRoot, target));

    if (!fs.existsSync(designAbs)) {
        console.log(`No ${STATE_DIR_NAME}/ in this project: nothing to clean.`);
        return 0;
    }

    const present = [];
    for (const target of rebuildableCaches(designAbs)) {
        let stat;
        try {
            stat = fs.lstatSync(target);
        } catch {
            continue;
        }
        if (stat.isSymbolicLink()) {
            console.log(`  ${shown(target)}  is a link: left alone`);
            continue;
        }
        present.push({ target, ...measure(target), isDirectory: stat.isDirectory() });
    }

    let failed = 0;
    if (present.length === 0) {
        console.log('Nothing to remove: no rebuildable cache is present.');
    } else {
        console.log(dryRun ? 'Would remove (dry run):' : 'Removed:');
        let removedFiles = 0;
        let removedBytes = 0;
        for (const entry of present) {
            const label = `${shown(entry.target)}${entry.isDirectory ? '/' : ''}`;
            const size = `${formatFiles(entry.files)}, ${formatSize(entry.bytes)}`;
            if (dryRun) {
                console.log(`  ${label}  (${size})`);
            } else {
                try {
                    fs.rmSync(entry.target, { recursive: true, force: true });
                    console.log(`  ${label}  (${size})`);
                } catch (error) {
                    failed += 1;
                    console.log(`  ${label}  could not be removed: ${error.message}`);
                    continue;
                }
            }
            removedFiles += entry.files;
            removedBytes += entry.bytes;
        }
        console.log(
            `${dryRun ? 'Total to remove' : 'Total removed'}: ${present.length - failed} ${present.length - failed === 1 ? 'cache' : 'caches'}, ${formatFiles(removedFiles)}, ${formatSize(removedBytes)}. Each is rebuilt by the command that owns it.`,
        );
    }

    console.log(
        'Kept: the diagnostics sink, the feedback notes and the graph baselines (they cannot be rebuilt).',
    );
    const backups = findBackups(projectRoot, Date.now());
    if (backups.length > 0) {
        console.log('Migration backups (never removed by this command):');
        for (const backup of backups) {
            const age = backup.days === 0 ? 'made today' : `${backup.days} ${backup.days === 1 ? 'day' : 'days'} old`;
            console.log(`  ${backup.name}/  (${age}, ${formatSize(backup.bytes)}) — delete it by hand: ${deleteCommand(backup.name)}`);
        }
    }
    return failed > 0 ? 1 : 0;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = { rebuildableCaches, findBackups };
