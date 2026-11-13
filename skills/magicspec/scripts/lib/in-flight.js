#!/usr/bin/env node
// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const { stripQuoted } = require('./scan-hygiene');
const { listPhaseFiles } = require('./phase-files');
const { listTrackingEntries } = require('./tracking-entries');

// ═══════════════════════════════════════════════════════════════════════════
// WORK IN FLIGHT (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one predicate for "work is in flight": a task whose tracking entry reads
// `Status: In Progress` in a live phase workbook (or in the legacy flat
// `TASKS.md`). Two scripts ask the question — `resume-state.js` (what would a
// session be resuming?) and `resolve-workspace.js` (which workspace has work
// open?) — and one implementation means they cannot come to disagree.

/**
 * Collects the tasks recorded as in flight in one workspace.
 *
 * Live phase workbooks are `tasks/phase-{N}[{track}].md`; archived phases live
 * elsewhere and hold no open work. The legacy flat layout keeps its entries in
 * `TASKS.md`, which the new layout leaves free of them. Read-only; an
 * unreadable file counts as holding nothing.
 *
 * @param {string} wsDir - Absolute workspace design directory.
 * @returns {{ id: string, title: string, attempts: number }[]}
 */
function collectInFlight(wsDir) {
    const sources = listPhaseFiles(path.join(wsDir, 'tasks')).map(({ file }) =>
        path.join(wsDir, 'tasks', file),
    );
    sources.push(path.join(wsDir, 'TASKS.md'));

    const inFlight = [];
    for (const source of sources) {
        let text;
        try {
            text = fs.readFileSync(source, 'utf8');
        } catch {
            continue;
        }
        const stripped = stripQuoted(text);
        for (const entry of listTrackingEntries(stripped, text)) {
            if (entry.status && /^In Progress\b/i.test(entry.status)) {
                inFlight.push({ id: entry.id, title: entry.title, attempts: entry.attempts });
            }
        }
    }
    return inFlight;
}

module.exports = { collectInFlight };
