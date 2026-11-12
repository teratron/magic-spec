'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY REFRESH (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// What `memory-index`, `memory-query` and the wiki export share: opening the index under
// a lock, bringing it up to date with the artifacts (AM-5: only the files whose fingerprint
// changed are read again) and reporting a failure the one way every caller does (AM-8:
// the workflow goes on, the finding is recorded, the caller is told to search the text).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { withFileLock } = require('./file-lock');
const { embedPending, readSetting } = require('./memory-embed');
const { openBackend } = require('./memory-sqlite');
const { listArtifacts, sectionsOf } = require('./memory-sections');

/** The finding recorded when the index cannot be built, opened or queried. */
const UNAVAILABLE_CODE = 'MEMORY_INDEX_UNAVAILABLE';

/** The finding recorded when the embeddings provider fails or is misconfigured; lexical search is unaffected. */
const EMBEDDINGS_FAILED_CODE = 'MEMORY_EMBEDDINGS_FAILED';

/**
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {string} The cache folder that holds the index files and its lock.
 */
function cacheDirOf(designAbs) {
    return path.join(designAbs, '.cache');
}

/**
 * Removes the index files so the next open builds from nothing (AM-1).
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {void}
 */
function removeIndex(designAbs) {
    for (const name of ['memory.sqlite', 'memory.json', 'memory.json.tmp']) {
        fs.rmSync(path.join(cacheDirOf(designAbs), name), { force: true });
    }
}

/**
 * Brings an open index up to date with the artifacts: a file is read again only when its
 * SHA-256 differs from the one stored, and a file that left the disk leaves the index with
 * its sections. The hash is taken from the bytes that are then sectioned, so a file edited
 * during the pass is never indexed under another file's fingerprint.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {object} backend - An open backend (see `memory-fallback.js`).
 * @returns {{files: number, indexed: number, unchanged: number, removed: number, sections: number}}
 */
function refresh(designAbs, backend) {
    const { files } = listArtifacts(designAbs);
    const stored = backend.fileHashes();
    let indexed = 0;
    let unchanged = 0;
    let removed = 0;
    for (const rel of files) {
        const bytes = fs.readFileSync(path.join(designAbs, ...rel.split('/')));
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        if (stored.get(rel) === sha256) {
            unchanged++;
            continue;
        }
        backend.replaceFile(rel, sha256, sectionsOf(rel, bytes.toString('utf8')));
        indexed++;
    }
    const present = new Set(files);
    for (const rel of stored.keys()) {
        if (!present.has(rel)) {
            backend.removeFile(rel);
            removed++;
        }
    }
    backend.save();
    return { files: files.length, indexed, unchanged, removed, sections: backend.sectionCount() };
}

/**
 * Runs a function with the index open and up to date, holding the index lock so two
 * commands never write it at once. The backend is closed afterwards; whatever `fn` wrote
 * and did not save is discarded.
 *
 * @template T
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {{rebuild?: boolean, loader?: () => object}} options - `rebuild` deletes the index first;
 *   `loader` replaces the SQLite module loader (tests).
 * @param {(backend: object, stats: ReturnType<typeof refresh>) => T} fn - Receives the fresh index.
 * @returns {T} What `fn` returns.
 * @throws {Error} When the index cannot be opened, locked, read or written; the caller reports it.
 */
function withFreshIndex(designAbs, options, fn) {
    const cacheDir = cacheDirOf(designAbs);
    return withFileLock(path.join(cacheDir, 'memory.lock'), () => {
        if (options.rebuild) removeIndex(designAbs);
        const backend = openBackend(cacheDir, { loader: options.loader });
        try {
            return fn(backend, refresh(designAbs, backend));
        } finally {
            backend.close();
        }
    });
}

/**
 * Reports that the index is unavailable, the one way every caller does (AM-8): the finding
 * is recorded, one line tells the reader to search the text instead, and the caller goes on.
 * Recording never throws.
 *
 * @param {string} source - Name of the reporting script.
 * @param {Error} err - What went wrong.
 * @param {(finding: object) => unknown} record - `diagnostics.record`.
 * @returns {string} The reason, for the caller's own output.
 */
function reportUnavailable(source, err, record) {
    const reason = String(err?.message ?? err).split('\n')[0];
    record({
        severity: 'warning',
        source,
        code: UNAVAILABLE_CODE,
        message: `The artifact index could not be used: ${reason}`,
        remedy: 'Search the text of the specifications directly; the index is rebuilt by the next successful run.',
    });
    return reason;
}

/**
 * Records that the embeddings could not be used. The index still answers lexically, so this is
 * a warning of its own and not the unavailable finding, which tells a caller to give up on the index.
 *
 * @param {string} source - Name of the reporting script.
 * @param {string} reason - What went wrong.
 * @param {(finding: object) => unknown} record - `diagnostics.record`.
 * @returns {void}
 */
function reportEmbeddingsFailed(source, reason, record) {
    record({
        severity: 'warning',
        source,
        code: EMBEDDINGS_FAILED_CODE,
        message: `The embeddings provider could not be used: ${reason}`,
        remedy: 'Check memory.embeddings in workspace.json; lexical search is unaffected and works without it.',
    });
}

/**
 * Embeds the sections that have no vector yet when a provider is configured, inside an open
 * index. With no provider it does nothing and sends nothing (AM-7); a failure is recorded and
 * leaves the lexical index as it is.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {object} backend - An open backend.
 * @param {(finding: object) => unknown} record - `diagnostics.record`.
 * @param {(setting: object, texts: string[]) => Float32Array[]} [embedFn] - The request; replaced in tests.
 * @returns {{sent: number, host: string}|{error: string}|null} Null with no provider.
 */
function embedIfConfigured(designAbs, backend, record, embedFn) {
    const { setting, error } = readSetting(designAbs);
    if (error) {
        reportEmbeddingsFailed('memory-index', error, record);
        return { error };
    }
    if (!setting) return null;
    try {
        return embedPending(backend, setting, embedFn);
    } catch (err) {
        reportEmbeddingsFailed('memory-index', err.message, record);
        return { error: err.message };
    }
}

module.exports = {
    UNAVAILABLE_CODE,
    EMBEDDINGS_FAILED_CODE,
    embedIfConfigured,
    reportEmbeddingsFailed,
    cacheDirOf,
    removeIndex,
    refresh,
    withFreshIndex,
    reportUnavailable,
};
