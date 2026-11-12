#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('memory-index', module);

const { resolveDesignRoot, resolveProjectRoot } = require('./utils');
const diagnostics = require('./lib/diagnostics');
const { embedIfConfigured, reportUnavailable, withFreshIndex } = require('./lib/memory-refresh');

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY-INDEX (Artifact Index Builder)
// ═══════════════════════════════════════════════════════════════════════════
//
// Builds or refreshes the local index over the state folder's artifacts: one row per
// section with its file, heading path and kind. Only the files whose fingerprint changed
// are read again, so a run with nothing changed reads no file's text. The index is a
// derived cache under `.magicspec/.cache/` (AM-1): `--rebuild` deletes it and builds from
// nothing. A failure never fails the run (AM-8): the finding is recorded and the line
// printed tells the reader to search the text instead.
//
// Usage:
//   node skills/magicspec/scripts/executor.js memory-index [--rebuild]

/**
 * Builds or refreshes the index of one state folder.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {{rebuild?: boolean, loader?: () => object, embedFn?: Function}} [options] - `rebuild` starts
 *   from nothing; `loader` replaces the SQLite module loader and `embedFn` the provider request (tests).
 * @param {(finding: object) => unknown} [record] - Where a failure is recorded.
 * @returns {{ok: true, backend: string, files: number, indexed: number, unchanged: number, removed: number, sections: number, embedded: ({sent: number, host: string}|{error: string}|null)} | {ok: false, reason: string}}
 */
function indexProject(designAbs, options = {}, record = diagnostics.record) {
    try {
        return withFreshIndex(designAbs, options, (backend, stats) => ({
            ok: true,
            backend: backend.name,
            ...stats,
            embedded: embedIfConfigured(designAbs, backend, record, options.embedFn),
        }));
    } catch (err) {
        return { ok: false, reason: reportUnavailable('memory-index', err, record) };
    }
}

/**
 * Entry point: indexes the project's state folder and prints one line. Always exits 0.
 *
 * @returns {void}
 */
function runCli() {
    const rebuild = process.argv.slice(2).includes('--rebuild');
    const { designAbs } = resolveDesignRoot(resolveProjectRoot());
    const result = indexProject(designAbs, { rebuild });
    if (result.ok) {
        console.log(
            `[memory-index] ${result.backend}: ${result.sections} sections in ${result.files} files (${result.indexed} indexed, ${result.unchanged} unchanged, ${result.removed} removed).`,
        );
        const sent = result.embedded;
        if (sent?.error) {
            console.log(
                `[memory-index] Embeddings were not updated: ${sent.error}. Lexical search is unaffected.`,
            );
        } else if (sent && sent.sent > 0) {
            console.log(`[memory-index] Sent ${sent.sent} sections to ${sent.host} for embedding.`);
        }
    } else {
        console.log(
            `[memory-index] The artifact index is unavailable: ${result.reason}. Search the text with grep instead.`,
        );
    }
}

if (require.main === module) {
    runCli();
}

module.exports = { indexProject, runCli };
