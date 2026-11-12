#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — DOCS AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Rewrites the documentation blocks the project registered as derived, and
// only the content between their markers (SY-6). The content comes from a
// project file the project maintains — the whole file, or the block of the
// same neutral key kind in it — never from a search of the documentation. A
// block whose source is missing, whose markers are missing, or whose content
// would carry an SDD reference (a task identifier, a phase designator, an SDD
// system file, a specification file name, a state-folder path) is reported
// with its place and left as it is: the containment rule is checked here, in
// the one place generated text enters a product file.

const fs = require('fs');
const { readSyncConfig } = require('./sync-config');
const { STATE_DIR_NAME } = require('../utils');
const { blockRange, replaceRange, markersOf, sddReferences } = require('./sync-markers');
const { writeIfChanged } = require('./sync-report');

const FIX = `edit the sync section of ${STATE_DIR_NAME}/workspace.json, or fix the source or the markers`;

/**
 * The content a block is filled with: its source file whole, or the marked block of that file.
 *
 * @param {import('./sync-config').DocBlock} block
 * @returns {{content: string}|{reason: string}}
 */
function sourceOf(block) {
    let text;
    try {
        text = fs.readFileSync(block.fromAbs, 'utf8');
    } catch {
        return { reason: `the source \`${block.from}\` does not exist` };
    }
    if (block.fromMarker === undefined) return { content: text.trim() };
    const range = blockRange(text, block.fromMarker);
    if (!range)
        return {
            reason: `the source \`${block.from}\` has no ${markersOf(block.fromMarker).open} block`,
        };
    return { content: text.slice(range.from, range.to).trim() };
}

/**
 * Runs the `docs` area.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, projectRoot: string}} ctx
 */
function syncDocs(ctx) {
    const { report, projectRoot } = ctx;
    const config = readSyncConfig(projectRoot);
    for (const block of config.docs) {
        const source = sourceOf(block);
        if (source.reason) {
            report.disagreements.push({
                location: block.file,
                difference: source.reason,
                command: FIX,
            });
            continue;
        }
        const leaks = sddReferences(source.content);
        if (leaks.length > 0) {
            report.disagreements.push({
                location: block.file,
                difference: `the content of \`${block.from}\` carries ${leaks.join(' and ')}, which may not enter a product file; nothing was written`,
                command: FIX,
            });
            continue;
        }
        let text;
        try {
            text = fs.readFileSync(block.abs, 'utf8');
        } catch {
            report.disagreements.push({
                location: block.file,
                difference: 'the documentation file does not exist',
                command: FIX,
            });
            continue;
        }
        const range = blockRange(text, block.marker);
        if (!range) {
            report.disagreements.push({
                location: block.file,
                difference: `the marker ${markersOf(block.marker).open} is not in the file`,
                command: FIX,
            });
            continue;
        }
        const eol = text.includes('\r\n') ? '\r\n' : '\n';
        const content = `${eol}${source.content.replace(/\r?\n/g, eol)}${eol}`;
        writeIfChanged(
            report,
            'docs',
            block.abs,
            replaceRange(text, range, content),
            `block '${block.marker}' from ${block.from}`,
        );
    }
}

module.exports = { syncDocs };
