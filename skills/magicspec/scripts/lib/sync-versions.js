#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — VERSIONS AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Writes the project version — the one finalization keeps in its version file —
// into the anchors the project declared, and nowhere else (SY-4). Nothing is
// searched for: a string that merely looks like a version is never touched. A
// JSON anchor is rewritten in place at the one `"key": "old"` pair, so the
// file's formatting survives; an anchor that cannot be written (the file or
// the key or the marker is missing, the pair is not unique) is reported with
// its place and left as it is (SY-2).

const fs = require('fs');
const path = require('path');
const { readSyncConfig } = require('./sync-config');
const { blockRange, replaceRange, markersOf } = require('./sync-markers');
const { readVersion } = require('./project-version');
const { statePath, STATE_DIR_NAME } = require('../utils');
const { writeIfChanged } = require('./sync-report');

const FIX = `edit the sync section of ${STATE_DIR_NAME}/workspace.json, or add the marker to the file`;

/**
 * The version file finalization writes: `finalization.versionPath`, else the state folder's.
 *
 * @param {string} root
 * @returns {string} Absolute path.
 */
function versionFileOf(root) {
    try {
        const data = JSON.parse(fs.readFileSync(statePath(root, 'workspace.json'), 'utf8'));
        const custom = data?.finalization?.versionPath;
        if (typeof custom === 'string' && custom.trim() !== '') return path.resolve(root, custom);
    } catch {
        /* the default */
    }
    return statePath(root, '.version');
}

/**
 * The value at a dotted key path of a parsed JSON value, or undefined.
 *
 * @param {unknown} data
 * @param {string} keyPath
 * @returns {unknown}
 */
function valueAt(data, keyPath) {
    return keyPath
        .split('.')
        .reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), data);
}

/**
 * Escapes text for use inside a regular expression.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeRe(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrites a JSON anchor's text in place. Returns the new text, or a reason it cannot be written.
 *
 * @param {string} text
 * @param {string} keyPath
 * @param {string} version
 * @returns {{text: string}|{reason: string}}
 */
function rewriteJson(text, keyPath, version) {
    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        return { reason: `the file is not valid JSON (${error.message})` };
    }
    const current = valueAt(data, keyPath);
    if (typeof current !== 'string')
        return { reason: `the key \`${keyPath}\` is not a string in the file` };
    const last = keyPath.split('.').pop();
    const pair = new RegExp(`("${escapeRe(last)}"\\s*:\\s*)"${escapeRe(current)}"`, 'g');
    const found = text.match(pair) || [];
    if (found.length !== 1)
        return {
            reason: `the pair \`"${last}": "${current}"\` occurs ${found.length} times, so it cannot be told apart`,
        };
    return { text: text.replace(pair, (_, head) => `${head}"${version}"`) };
}

/**
 * Runs the `versions` area.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, projectRoot: string}} ctx
 */
function syncVersions(ctx) {
    const { report, projectRoot } = ctx;
    const config = readSyncConfig(projectRoot);
    if (config.versions.length === 0) return;
    const versionFile = versionFileOf(projectRoot);
    const { version, exists, corrupted } = readVersion(versionFile);
    if (!exists || corrupted) {
        report.disagreements.push({
            location: report.shown(versionFile),
            difference: exists
                ? 'the version file does not hold a version'
                : 'the version file does not exist yet',
            command: 'run a workflow that finalizes, which writes the version',
        });
        return;
    }
    for (const anchor of config.versions) {
        let text;
        try {
            text = fs.readFileSync(anchor.abs, 'utf8');
        } catch {
            report.disagreements.push({
                location: anchor.file,
                difference: 'the anchor file does not exist',
                command: FIX,
            });
            continue;
        }
        let next;
        if (anchor.json !== undefined) {
            next = rewriteJson(text, anchor.json, version);
        } else {
            const range = blockRange(text, anchor.marker);
            next = range
                ? { text: replaceRange(text, range, anchor.format.replace('{version}', version)) }
                : { reason: `the marker ${markersOf(anchor.marker).open} is not in the file` };
        }
        if (next.reason) {
            report.disagreements.push({
                location: anchor.file,
                difference: next.reason,
                command: FIX,
            });
            continue;
        }
        writeIfChanged(report, 'versions', anchor.abs, next.text, `version ${version}`);
    }
}

module.exports = { syncVersions, versionFileOf };
