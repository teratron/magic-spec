#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ENGINE_DIR, repoRoot } = require('./engine-path');

// ═══════════════════════════════════════════════════════════════════════════
// RELEASE ARCHIVE COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
//
// What the release archive holds is decided here and nowhere else: the builder reads
// the list this prints, and the smoke step checks the finished archive against the
// same rule, so the two cannot disagree (l2-skill-distribution.md §5.5).
//
//   node scripts/archive-composition.js list
//       prints the repository-relative files that go into the archive, one per line.
//   unzip -Z1 archive.zip | node scripts/archive-composition.js check --prefix magic-spec-v3.0.0/
//       reads archive paths from stdin; exits 1 and names every path outside the
//       composition, and every required file that is missing.

const ENGINE_POSIX = ENGINE_DIR.split(path.sep).join('/');

/** Root files that ship beside the skill folder, when present. */
const ROOT_FILES = ['README.md', 'LICENSE'];

/** Files without which the archive is not an installable skill. */
const REQUIRED = ['SKILL.md', 'AGENT-RULES.md', '.version', '.checksums', 'scripts/executor.js'].map((f) => `${ENGINE_POSIX}/${f}`);

/**
 * @param {string} rel - Archive path without the archive prefix, POSIX separators.
 * @returns {boolean} True when the composition allows it.
 */
function isAllowed(rel) {
    return ROOT_FILES.includes(rel) || rel.startsWith(`${ENGINE_POSIX}/`);
}

/**
 * Walks a folder without following links.
 *
 * @param {string} dir - Absolute folder.
 * @returns {string[]} Absolute file paths.
 */
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.isSymbolicLink()) return [];
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : [full];
    });
}

/**
 * The files the archive is built from.
 *
 * @param {string} [root] - Repository root.
 * @returns {string[]} Repository-relative POSIX paths, sorted.
 */
function listRelease(root = repoRoot()) {
    const files = ROOT_FILES.filter((f) => fs.existsSync(path.join(root, f)));
    for (const full of walk(path.join(root, ENGINE_DIR))) {
        files.push(path.relative(root, full).split(path.sep).join('/'));
    }
    return files.sort();
}

/**
 * Checks the names of a finished archive against the composition.
 *
 * @param {string[]} names - Paths as listed in the archive (directories may be included).
 * @param {string} prefix - The archive prefix, for example `magic-spec-v3.0.0/`.
 * @returns {{outside: string[], missing: string[]}} Offending paths and absent required files.
 */
function check(names, prefix) {
    const outside = [];
    const present = new Set();
    for (const name of names.filter((n) => n && !n.endsWith('/'))) {
        if (!name.startsWith(prefix)) {
            outside.push(name);
            continue;
        }
        const rel = name.slice(prefix.length);
        present.add(rel);
        if (!isAllowed(rel)) outside.push(name);
    }
    return { outside, missing: REQUIRED.filter((r) => !present.has(r)) };
}

if (require.main === module) {
    const [mode, ...rest] = process.argv.slice(2);
    if (mode === 'list') {
        process.stdout.write(listRelease().join('\n') + '\n');
    } else if (mode === 'check') {
        const at = rest.indexOf('--prefix');
        const prefix = at >= 0 ? rest[at + 1] : '';
        const names = fs.readFileSync(0, 'utf8').split(/\r?\n/);
        const { outside, missing } = check(names, prefix);
        for (const n of outside) console.error(`outside the composition: ${n}`);
        for (const m of missing) console.error(`required file missing: ${m}`);
        if (outside.length + missing.length > 0) process.exit(1);
        console.log(`Archive composition ok: ${names.filter((n) => n && !n.endsWith('/')).length} files.`);
    } else {
        console.error('Usage: archive-composition.js list | check --prefix <prefix>');
        process.exit(2);
    }
}

module.exports = { isAllowed, listRelease, check, ROOT_FILES, REQUIRED };
