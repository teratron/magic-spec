const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// INCREMENTAL SHA256 CACHE — Shared Analysis Cache Utility
// ═══════════════════════════════════════════════════════════════════════════
//
// Provides a portable, file-based SHA256 cache for incremental analysis.
// Cache keys are relative paths (OS-agnostic); values are arbitrary objects.
// Writes are atomic: content goes to a .tmp sibling, then os.rename()-style
// replacement via fs.renameSync — safe on NTFS and ext4.
//
// Cache format (JSON):
//   {
//     "version": 1,
//     "entries": {
//       "relative/path/to/file.js": { "hash": "<sha256>", "data": { ... } }
//     }
//   }
//
// Usage:
//   const cache = require('./cache-utils');
//   const store = cache.load('.magic/.analyze-cache.json');
//   const hash  = cache.hashFile('/abs/path/to/file.js');
//   if (!cache.isStale(store, 'rel/path.js', hash)) {
//       return cache.get(store, 'rel/path.js');
//   }
//   const result = expensiveAnalysis(file);
//   cache.put(store, 'rel/path.js', hash, result);
//   cache.save('.magic/.analyze-cache.json', store);

// ═══════════════════════════════════════════════════════════════════════════
// CACHE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 1;

// ───────────────────────────────────────────────────────────────────────────
// File Hashing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Strips YAML/TOML-style frontmatter from file content before hashing
 * so that metadata changes (dates, version bumps) don't invalidate the cache.
 * Only strips the block if it starts at line 1 and is closed by a matching fence.
 *
 * @param {string} content - Raw file content.
 * @returns {string} Content with frontmatter removed.
 */
function stripFrontmatter(content) {
    if (!content.startsWith('---')) return content;
    const end = content.indexOf('\n---', 3);
    return end === -1 ? content : content.slice(end + 4);
}

/**
 * Computes the SHA256 hash of a file's content.
 * Markdown files have frontmatter stripped before hashing.
 *
 * @param {string} absPath - Absolute path to the file.
 * @returns {string|null} Hex SHA256 string, or null if the file cannot be read.
 */
function hashFile(absPath) {
    let content;
    try { content = fs.readFileSync(absPath, 'utf8'); }
    catch (_) { return null; }

    const ext = path.extname(absPath).toLowerCase();
    if (ext === '.md') content = stripFrontmatter(content);

    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// ───────────────────────────────────────────────────────────────────────────
// Cache I/O
// ───────────────────────────────────────────────────────────────────────────

/**
 * Loads a cache store from disk. Returns an empty store if the file does not
 * exist, is unreadable, or has an incompatible version.
 *
 * @param {string} cachePath - Absolute or relative path to the cache JSON file.
 * @returns {{version: number, entries: Record<string, {hash: string, data: unknown}>}}
 */
function load(cachePath) {
    try {
        const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (raw && raw.version === CACHE_VERSION && raw.entries) return raw;
    } catch (_) {
        // File missing or corrupt — start fresh
    }
    return { version: CACHE_VERSION, entries: {} };
}

/**
 * Persists a cache store to disk using an atomic write:
 * writes to a `.tmp` sibling, then renames over the target.
 * Falls back to a direct write on platforms where rename fails (e.g., cross-device).
 *
 * @param {string} cachePath - Absolute or relative path to the cache JSON file.
 * @param {{version: number, entries: object}} store - Cache store to persist.
 */
function save(cachePath, store) {
    const absPath = path.resolve(process.cwd(), cachePath);
    const tmpPath = absPath + '.tmp';
    const content = JSON.stringify(store, null, 2);

    try {
        fs.writeFileSync(tmpPath, content, 'utf8');
        fs.renameSync(tmpPath, absPath);
    } catch (_) {
        try {
            fs.writeFileSync(absPath, content, 'utf8');
        } catch (err) {
            console.error(`[cache-utils] Failed to save cache: ${err.message}`);
        }
        try { fs.unlinkSync(tmpPath); } catch (_) { }
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Cache Read / Write / Invalidation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a path key to forward slashes for OS-agnostic storage.
 *
 * @param {string} relPath - Project-relative path.
 * @returns {string}
 */
function key(relPath) {
    return relPath.replace(/\\/g, '/');
}

/**
 * Returns true when the cached entry is absent or its stored hash differs
 * from the provided current hash (i.e., the file has changed).
 *
 * @param {{entries: object}} store - Cache store.
 * @param {string} relPath - Project-relative path.
 * @param {string|null} currentHash - Current SHA256 of the file (null = always stale).
 * @returns {boolean}
 */
function isStale(store, relPath, currentHash) {
    if (!currentHash) return true;
    const entry = store.entries[key(relPath)];
    return !entry || entry.hash !== currentHash;
}

/**
 * Retrieves the cached data for a file.
 *
 * @template T
 * @param {{entries: object}} store - Cache store.
 * @param {string} relPath - Project-relative path.
 * @returns {T|undefined} Cached data, or undefined if absent.
 */
function get(store, relPath) {
    const entry = store.entries[key(relPath)];
    return entry ? entry.data : undefined;
}

/**
 * Stores analysis data for a file in the cache.
 *
 * @param {{entries: object}} store - Cache store.
 * @param {string} relPath - Project-relative path.
 * @param {string} hash - Current SHA256 of the file.
 * @param {unknown} data - Analysis result to cache.
 */
function put(store, relPath, hash, data) {
    store.entries[key(relPath)] = { hash, data };
}

/**
 * Removes entries for paths no longer present in the project (dead cache pruning).
 *
 * @param {{entries: object}} store - Cache store.
 * @param {string[]} activePaths - Project-relative paths of all currently scanned files.
 * @returns {number} Number of entries pruned.
 */
function prune(store, activePaths) {
    const active = new Set(activePaths.map(key));
    let pruned = 0;
    for (const k of Object.keys(store.entries)) {
        if (!active.has(k)) {
            delete store.entries[k];
            pruned++;
        }
    }
    return pruned;
}

/**
 * Returns cache statistics.
 *
 * @param {{entries: object}} store - Cache store.
 * @returns {{total: number, size_bytes: number}}
 */
function stats(store) {
    const total = Object.keys(store.entries).length;
    const size_bytes = Buffer.byteLength(JSON.stringify(store), 'utf8');
    return { total, size_bytes };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { hashFile, load, save, isStale, get, put, prune, stats };
