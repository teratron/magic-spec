#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC CONFIGURATION (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// Reads and validates the `sync` section of `workspace.json`: the one place a
// project registers where its version is written (SY-4) and which blocks of
// its documentation are derived (SY-6). Nothing is searched for; what is not
// registered here is never touched.
//
//   "sync": {
//     "versions": [
//       { "file": "package.json", "json": "version" },
//       { "file": "README.md", "marker": "version", "format": "v{version}" }
//     ],
//     "docs": [
//       { "file": "docs/guide.md", "marker": "overview", "from": "docs/overview.md", "fromMarker": "overview" }
//     ]
//   }
//
// A `marker` is a neutral key (`[a-z][a-z0-9-]*`): the product file carries
// `<!-- sync:{key} -->` … `<!-- /sync:{key} -->` and nothing about the SDD.
// An entry that cannot be used becomes a problem record, never an exception:
// the report lists it and the run goes on with the rest.

const fs = require('fs');
const { resolveInsideProject, statePath, STATE_DIR_NAME } = require('../utils');

const MARKER_KEY_RE = /^[a-z][a-z0-9-]*$/;
const SECTION_KEYS = new Set(['versions', 'docs']);
const VERSION_KEYS = new Set(['file', 'json', 'marker', 'format']);
const DOC_KEYS = new Set(['file', 'marker', 'from', 'fromMarker']);
const FIX = `edit the sync section of ${STATE_DIR_NAME}/workspace.json`;

/**
 * @typedef {{location: string, difference: string, command: string}} SyncProblem
 * @typedef {{file: string, abs: string, json?: string, marker?: string, format: string, at: string}} VersionAnchor
 * @typedef {{file: string, abs: string, marker: string, from: string, fromAbs: string, fromMarker?: string, at: string}} DocBlock
 */

// ───────────────────────────────────────────────────────────────────────────
// Entry Validation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Builds a problem record for one location of the section.
 *
 * @param {string} at - Where in the section, e.g. `sync.versions[0]`.
 * @param {string} difference - What is wrong.
 * @returns {SyncProblem}
 */
function problem(at, difference) {
    return { location: `${STATE_DIR_NAME}/workspace.json ${at}`, difference, command: FIX };
}

/**
 * Names the keys of `entry` that the grammar does not know.
 *
 * @param {Object} entry
 * @param {Set<string>} known
 * @returns {string[]}
 */
function unknownKeys(entry, known) {
    return Object.keys(entry).filter((key) => !known.has(key));
}

/**
 * Checks that a list entry is an object holding only the keys its kind allows, recording a
 * problem otherwise.
 *
 * @param {unknown} entry - The entry as parsed.
 * @param {string} at - Location for the problem.
 * @param {string} shape - The message for an entry that is not an object.
 * @param {Set<string>} known - The keys the kind allows.
 * @param {SyncProblem[]} problems
 * @returns {boolean} True when the entry is an object with no unknown key.
 */
function isKnownEntry(entry, at, shape, known, problems) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        problems.push(problem(at, shape));
        return false;
    }
    const extra = unknownKeys(entry, known);
    if (extra.length > 0) {
        problems.push(problem(at, `unknown key ${extra.map((k) => `\`${k}\``).join(', ')}`));
        return false;
    }
    return true;
}

/**
 * Resolves a registered path, recording a problem when it names nothing inside the project.
 *
 * @param {string} root - Project root.
 * @param {unknown} rel - The path as spelled.
 * @param {string} at - Location for the problem.
 * @param {SyncProblem[]} problems
 * @returns {string|null} The absolute path, or null.
 */
function resolveRegistered(root, rel, at, problems) {
    const abs = resolveInsideProject(root, rel);
    if (!abs)
        problems.push(
            problem(
                at,
                'the path must name a file inside the project (relative, no `..` or link that leaves it)',
            ),
        );
    return abs;
}

/**
 * Validates one version anchor.
 *
 * @param {string} root
 * @param {unknown} entry
 * @param {string} at
 * @param {SyncProblem[]} problems
 * @returns {VersionAnchor|null}
 */
function readVersionAnchor(root, entry, at, problems) {
    const shape = 'an anchor is an object with a `file` and either `json` or `marker`';
    if (!isKnownEntry(entry, at, shape, VERSION_KEYS, problems)) return null;
    const abs = resolveRegistered(root, entry.file, at, problems);
    const hasJson = entry.json !== undefined;
    const hasMarker = entry.marker !== undefined;
    if (hasJson === hasMarker) {
        problems.push(
            problem(
                at,
                'an anchor names exactly one of `json` (a key path) and `marker` (a neutral key)',
            ),
        );
        return null;
    }
    if (hasJson && (typeof entry.json !== 'string' || entry.json.trim() === '')) {
        problems.push(problem(at, '`json` is a key path such as `version` or `app.version`'));
        return null;
    }
    if (hasMarker && !MARKER_KEY_RE.test(String(entry.marker))) {
        problems.push(problem(at, '`marker` is a lowercase key of letters, digits and hyphens'));
        return null;
    }
    const format = entry.format === undefined ? '{version}' : entry.format;
    if (
        typeof format !== 'string' ||
        !format.includes('{version}') ||
        (hasJson && format !== '{version}')
    ) {
        problems.push(
            problem(
                at,
                '`format` is text containing `{version}` and applies to a `marker` anchor only',
            ),
        );
        return null;
    }
    if (!abs) return null;
    return { file: entry.file, abs, json: entry.json, marker: entry.marker, format, at };
}

/**
 * Validates one registered documentation block.
 *
 * @param {string} root
 * @param {unknown} entry
 * @param {string} at
 * @param {SyncProblem[]} problems
 * @returns {DocBlock|null}
 */
function readDocBlock(root, entry, at, problems) {
    const shape = 'a block is an object with `file`, `marker` and `from`';
    if (!isKnownEntry(entry, at, shape, DOC_KEYS, problems)) return null;
    const abs = resolveRegistered(root, entry.file, at, problems);
    const fromAbs = resolveRegistered(root, entry.from, at, problems);
    for (const key of ['marker', 'fromMarker']) {
        if (entry[key] !== undefined && !MARKER_KEY_RE.test(String(entry[key]))) {
            problems.push(
                problem(at, `\`${key}\` is a lowercase key of letters, digits and hyphens`),
            );
            return null;
        }
    }
    if (entry.marker === undefined) {
        problems.push(problem(at, 'a block names its `marker`'));
        return null;
    }
    if (!abs || !fromAbs) return null;
    return {
        file: entry.file,
        abs,
        marker: entry.marker,
        from: entry.from,
        fromAbs,
        fromMarker: entry.fromMarker,
        at,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Section Reader
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads one list of the section through its entry reader.
 *
 * @param {Object} section - The parsed `sync` object.
 * @param {string} key - `versions` or `docs`.
 * @param {Function} read - The entry reader.
 * @param {string} root
 * @param {SyncProblem[]} problems
 * @returns {Object[]}
 */
function readList(section, key, read, root, problems) {
    if (section[key] === undefined) return [];
    if (!Array.isArray(section[key])) {
        problems.push(problem(`sync.${key}`, 'must be a list'));
        return [];
    }
    return section[key]
        .map((entry, i) => read(root, entry, `sync.${key}[${i}]`, problems))
        .filter(Boolean);
}

/**
 * Reads the `sync` section of the project's `workspace.json`. An absent file or section declares
 * nothing; an unreadable file is one problem. Nothing is written and nothing throws.
 *
 * @param {string} root - Project root.
 * @returns {{versions: VersionAnchor[], docs: DocBlock[], problems: SyncProblem[]}}
 */
function readSyncConfig(root) {
    const problems = [];
    const file = statePath(root, 'workspace.json');
    let data = null;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        if (error && error.code !== 'ENOENT')
            problems.push(problem('', `cannot be read: ${error.message}`));
        return { versions: [], docs: [], problems };
    }
    const section = data?.sync;
    if (section === undefined || section === null) return { versions: [], docs: [], problems };
    if (typeof section !== 'object' || Array.isArray(section)) {
        problems.push(problem('sync', 'must be an object with `versions` and `docs`'));
        return { versions: [], docs: [], problems };
    }
    for (const key of Object.keys(section)) {
        if (!SECTION_KEYS.has(key)) problems.push(problem('sync', `unknown key \`${key}\``));
    }
    return {
        versions: readList(section, 'versions', readVersionAnchor, root, problems),
        docs: readList(section, 'docs', readDocBlock, root, problems),
        problems,
    };
}

module.exports = { readSyncConfig, MARKER_KEY_RE };
