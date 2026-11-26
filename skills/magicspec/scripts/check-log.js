#!/usr/bin/env node
// @ts-check
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('check-log', module);

const fs = require('node:fs');
const path = require('node:path');
const { locateSet, notSetLine } = require('./check-docs');
const { fileVersions } = require('./lib/git-utils');
const { runMain } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK LOG (The Order of Change Statuses in the History of changes.md)
// ═══════════════════════════════════════════════════════════════════════════
//
// A change of a 4.0 workspace is open, then placed, then built (concept §5.8); a change recorded
// satisfied carries no work and takes no later status. This script reads every committed version
// of `changes.md`, oldest first, and the file as it stands, and reports a change whose statuses
// went back: a later status seen before an earlier one. It writes nothing.
//
// Usage:
//   node skills/magicspec/scripts/executor.js check-log

/** The rank of each status in a change's life; `satisfied` ends it. */
const RANK = new Map([
    [
        'open',
        0,
    ],
    [
        'placed',
        1,
    ],
    [
        'built',
        2,
    ],
    [
        'satisfied',
        3,
    ],
]);

/**
 * The status of every change in one version of `changes.md`.
 *
 * @param {string} text
 * @returns {Map<string, string>} Change address → status.
 */
function statusesIn(text) {
    const out = new Map();
    for (const block of text.split(/^(?=## C\d+ — )/m)) {
        const address = block.match(/^## (C\d+) — /)?.[1];
        const status = block.match(/^- Status: (\w+)/m)?.[1];
        if (address && status && RANK.has(status)) out.set(address, status);
    }
    return out;
}

/**
 * Each change's statuses in the order the history shows them, a status repeated in a row once.
 *
 * @param {string[]} versions - Oldest first.
 * @returns {Map<string, string[]>}
 */
function sequences(versions) {
    /** @type {Map<string, string[]>} */
    const seen = new Map();
    for (const text of versions) {
        for (const [address, status] of statusesIn(text)) {
            const list = seen.get(address) ?? [];
            if (list[list.length - 1] !== status) list.push(status);
            seen.set(address, list);
        }
    }
    return seen;
}

/**
 * Whether a change may go from one status to the next: never out of `satisfied`, never back.
 *
 * @param {string} before
 * @param {string} after
 * @returns {boolean}
 */
function mayFollow(before, after) {
    if (before === 'satisfied') return false;
    return after === 'satisfied' || (RANK.get(after) ?? 0) >= (RANK.get(before) ?? 0);
}

/**
 * The findings of a history: for each change, the first status that came before one it should follow.
 *
 * @param {string[]} versions - Oldest first.
 * @returns {{ findings: string[], changes: number }}
 */
function checkHistory(versions) {
    const seen = sequences(versions);
    const findings = [];
    for (const [address, list] of seen) {
        const at = list.findIndex((status, i) => i > 0 && !mayFollow(list[i - 1], status));
        if (at > 0) findings.push(`changes.md: ${address} was ${list[at - 1]} before ${list[at]}`);
    }
    return {
        findings,
        changes: seen.size,
    };
}

/**
 * Entry point.
 *
 * @returns {number} Exit code: 1 on a status out of order, else 0.
 */
function main() {
    const where = locateSet();
    if (!where.isSet || !where.dir) {
        console.log(notSetLine('check-log', where.name));
        return 0;
    }
    const file = path.join(where.dir, 'changes.md');
    const committed = fileVersions(where.dir, 'changes.md');
    if (!committed.length) {
        console.log('check-log: changes.md has no committed history; nothing to check.');
        return 0;
    }
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const { findings, changes } = checkHistory([
        ...committed,
        current,
    ]);
    for (const finding of findings) console.log(finding);
    if (findings.length) return 1;
    console.log(`check-log: ${changes} changes, no status out of order`);
    return 0;
}

runMain('check-log', main);
