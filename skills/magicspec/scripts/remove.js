#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('remove', module);

const fs = require('fs');
const path = require('path');
const {
    engineRoot,
    parseFlags,
    hasEngineWriteTooling,
    HOOK_MARKER,
    normalizePath,
    resolveProjectRoot,
} = require('./utils');
const hosts = require('./lib/hosts');

// ═══════════════════════════════════════════════════════════════════════════
// REMOVE (take the engine out of a project, leaving the project's own state)
// ═══════════════════════════════════════════════════════════════════════════
//
// Removes exactly what the engine put outside its own folder — the projections that carry
// a marker and the pre-commit hook it wrote — and then the engine folder, when that folder
// lies inside this project. The state folder, the project's files and every file that does
// not carry a marker are not touched. Nothing in a product manifest is read or written.
//
// Usage: node scripts/executor.js remove [--dry-run]

const { flags } = parseFlags(process.argv.slice(2), { boolFlags: ['--dry-run'] });
const dryRun = Boolean(flags['--dry-run']);
const projectRoot = resolveProjectRoot();
const rel = (p) => normalizePath(path.relative(projectRoot, p));

/** Whether a path lies inside the project folder. */
function insideProject(target) {
    const r = path.relative(projectRoot, target);
    return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
}

console.log(dryRun ? 'Remove (dry run — nothing is changed):' : 'Remove:');

// 1. Projections, found by their marker.
const projections = hosts.findProjections(projectRoot);
for (const item of projections) {
    const what = item.kind === 'block' ? `the managed block in ${item.path}` : item.path;
    console.log(`   ${dryRun ? 'Would remove' : 'Removing'}: ${what}`);
}
if (!dryRun) hosts.removeProjections(projectRoot);
if (projections.length === 0) console.log('   No host projections found.');

// 2. The pre-commit hook, only when it carries this engine's marker. A hook of the project's
//    own was never replaced by the installer, so there is nothing to restore.
const hookPath = path.join(projectRoot, '.git', 'hooks', 'pre-commit');
try {
    const stat = fs.lstatSync(hookPath);
    if (stat.isFile() && fs.readFileSync(hookPath, 'utf8').split(/\r?\n/).includes(HOOK_MARKER)) {
        console.log(`   ${dryRun ? 'Would remove' : 'Removing'}: ${rel(hookPath)}`);
        if (!dryRun) fs.unlinkSync(hookPath);
    }
} catch {
    /* no hook */
}

// 3. The engine folder, last.
const engineDir = fs.realpathSync.native(engineRoot());
if (hasEngineWriteTooling()) {
    console.log(`   Kept: ${rel(engineDir)}/ is the engine's own repository.`);
} else if (!insideProject(engineDir)) {
    console.log(
        `   Kept: ${normalizePath(engineDir)}/ lies outside this project (shared by others).`,
    );
} else if (dryRun) {
    console.log(`   Would remove: ${rel(engineDir)}/`);
} else {
    try {
        fs.rmSync(engineDir, { recursive: true, force: true });
        console.log(`   Removed: ${rel(engineDir)}/`);
    } catch (err) {
        // The running executor can keep its own files open on some platforms.
        console.log(
            `   Could not remove ${rel(engineDir)}/ while it runs (${err.code || err.message}).`,
        );
        console.log(`   Delete it once this command has ended: ${rel(engineDir)}`);
    }
}
console.log('The state folder and your files were not touched.');
