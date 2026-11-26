// @ts-check
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadDocSet, computePack, revisionOf } = require('../check-docs');
const { engineRel, normalizePath, STATE_DIR_NAME } = require('../utils');
const { HOSTS } = require('./hosts');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET COVERAGE (which requirements of a 4.0 workspace a task observes)
// ═══════════════════════════════════════════════════════════════════════════
//
// A set has no Canonical References to classify code files against. Its coverage is of the
// behaviour requirements: one is `covered` when it has an Accept check and the pack of at
// least one task holds it, `unobserved` when it has a check and no pack holds it, and
// `unchecked` when it states no check. A withdrawn requirement is not counted. Its map is
// compared with the code: a path a row names that is not there, and a file of the workspace's
// scope no row's path holds.

/** The address of a behaviour requirement; a binding unit has a `b` before its number. */
const REQUIREMENT = /^[a-z][a-z0-9_]*\.\d+$/;

/**
 * @typedef {{ address: string, state: 'covered' | 'unobserved' | 'unchecked' }} Requirement
 */

/**
 * The state of every requirement of a set, in the order the set defines them.
 *
 * @param {string} dir - The folder of the workspace.
 * @returns {Requirement[]}
 */
function requirementsOf(dir) {
    const set = loadDocSet(dir);
    const packed = new Set(set.tasks.flatMap((t) => computePack(set, t.address)));
    return [
        ...set.units,
    ]
        .filter(
            ([address, [unit]]) => REQUIREMENT.test(address) && !revisionOf(unit.text)?.withdrawn,
        )
        .map(([address, [unit]]) => {
            if (!/^- Accept:/m.test(unit.text))
                return {
                    address,
                    state: 'unchecked',
                };
            return {
                address,
                state: packed.has(address) ? 'covered' : 'unobserved',
            };
        });
}

/**
 * The folders that hold no file of the product: the state folder, the engine folder when it lies
 * inside the project, and the folders a host reads its copies from.
 *
 * @returns {string[]} Folder paths relative to the project root, each ending in a slash.
 */
function engineFolders() {
    const hosts = Object.values(HOSTS)
        .flatMap((host) => [
            host.skills,
            host.rule.path,
            host.retired ?? '',
        ])
        .map((p) => p.split('/'))
        .filter((parts) => parts.length > 1 && parts[0].startsWith('.'))
        .map((parts) => parts[0]);
    const engine = engineRel();
    const inside =
        engine !== '.' && !path.isAbsolute(engine)
            ? [
                  engine,
              ]
            : [];
    return [
        ...new Set([
            STATE_DIR_NAME,
            ...hosts,
            ...inside,
        ]),
    ].map((folder) => `${folder}/`);
}

/**
 * The path a map row names, as the walk writes paths; an empty cell and a dash name none.
 *
 * @param {string} cell
 * @returns {string | null}
 */
function rowPath(cell) {
    const text = normalizePath(cell.replace(/`/g, '').trim())
        .replace(/^\.\//, '')
        .replace(/\/+$/, '');
    return text === '' || /^(—|-)$/.test(text) ? null : text;
}

/**
 * Compares the map of a set with the code.
 *
 * @param {string} dir - The folder of the workspace.
 * @param {string} root - The project root.
 * @param {string[]} files - The files of the workspace's scope, relative to the root.
 * @returns {{ missing: { address: string, path: string }[], unmapped: string[] } | null} `null`
 *   when the set has no map.
 */
function compareMap(dir, root, files) {
    if (!fs.existsSync(path.join(dir, 'memory', 'map.md'))) return null;
    const rows = loadDocSet(dir).mapRows.flatMap((row) => {
        const where = rowPath(row.where);
        return where === null
            ? []
            : [
                  {
                      address: row.address,
                      path: where,
                  },
              ];
    });
    const holds = (/** @type {string} */ file) =>
        rows.some((r) => r.path === '.' || file === r.path || file.startsWith(`${r.path}/`));
    const outside = engineFolders();
    const byPath = (/** @type {string} */ a, /** @type {string} */ b) =>
        a < b ? -1 : a > b ? 1 : 0;
    return {
        missing: rows
            .filter((r) => !fs.existsSync(path.join(root, r.path)))
            .sort((a, b) => byPath(a.path, b.path)),
        unmapped: files
            .filter((f) => !outside.some((folder) => f.startsWith(folder)) && !holds(f))
            .sort(byPath),
    };
}

/**
 * The report of a set's coverage.
 *
 * @param {string} dir - The folder of the workspace.
 * @param {{ root: string, files: string[] }} [code] - The project and the files of the scope; the
 *   map is compared with them when given.
 * @returns {{ requirements: Requirement[], summary: { total: number, covered: number, unobserved: number, unchecked: number }, map: ReturnType<typeof compareMap>, lines: string[] }}
 *   `lines` is one line per requirement not covered, then one per map path that is missing and per
 *   file no row holds, then the totals.
 */
function setCoverage(dir, code) {
    const requirements = requirementsOf(dir);
    const count = (/** @type {string} */ state) =>
        requirements.filter((r) => r.state === state).length;
    const summary = {
        total: requirements.length,
        covered: count('covered'),
        unobserved: count('unobserved'),
        unchecked: count('unchecked'),
    };
    const map = code ? compareMap(dir, code.root, code.files) : null;
    const total = `${summary.covered} of ${summary.total} requirements covered`;
    const lines = [
        ...requirements.filter((r) => r.state !== 'covered').map((r) => `${r.address}: ${r.state}`),
        ...(map?.missing.map((r) => `${r.address}: ${r.path} is missing`) ?? []),
        ...(map?.unmapped.map((file) => `${file}: no map row`) ?? []),
        map
            ? `${total}, ${map.missing.length} map path(s) missing, ${map.unmapped.length} file(s) with no map row`
            : total,
    ];
    return {
        requirements,
        summary,
        map,
        lines,
    };
}

module.exports = {
    setCoverage,
};
