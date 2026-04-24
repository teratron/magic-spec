const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// SPEC GRAPH EXTRACTION CACHE
// ═══════════════════════════════════════════════════════════════════════════
//
// Per-file cache of parsed spec metadata (refs, parent, conventions).
// Keyed by SHA-256 of file *body* (YAML frontmatter stripped for .md files)
// so that metadata-only edits (Version / Last Updated / Status) do not
// invalidate cached extractions.
//
// Implements l2-spec-graph-memory.md §4.1.
//
// Storage: $designDir/.graph-cache/{hash}.json
// Value:   { refs: [...], parent: "..." | null, conventions: [14, 23] }

// ───────────────────────────────────────────────────────────────────────────
// Frontmatter Stripping (Markdown only)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Returns the body of a Markdown file with a leading YAML frontmatter block
 * removed. Non-Markdown content is returned unchanged.
 *
 * @param {Buffer} raw - Raw file bytes.
 * @param {string} suffix - File suffix (e.g. ".md").
 * @returns {Buffer}
 */
function stripFrontmatter(raw, suffix) {
    if (suffix.toLowerCase() !== '.md') return raw;
    const text = raw.toString('utf8');
    if (!text.startsWith('---')) return raw;
    const end = text.indexOf('\n---', 3);
    if (end === -1) return raw;
    // Skip over "\n---" and the trailing newline if present.
    let cut = end + 4;
    if (text[cut] === '\r') cut += 1;
    if (text[cut] === '\n') cut += 1;
    return Buffer.from(text.slice(cut), 'utf8');
}

// ───────────────────────────────────────────────────────────────────────────
// Hashing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Computes the content-body SHA-256 for a spec file, combined with the
 * workspace-relative path (so cache keys are portable across machines).
 *
 * @param {string} absPath - Absolute path to the file.
 * @param {string} rootDir - Root directory to compute the relative path from.
 * @returns {string} Hex-encoded SHA-256.
 * @throws {Error} If `absPath` is not a readable file.
 */
function fileHash(absPath, rootDir) {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) {
        throw new Error(`fileHash requires a file, got: ${absPath}`);
    }
    const raw = fs.readFileSync(absPath);
    const body = stripFrontmatter(raw, path.extname(absPath));

    const h = crypto.createHash('sha256');
    h.update(body);
    h.update(Buffer.from([0]));

    let rel;
    try {
        rel = path.relative(path.resolve(rootDir), path.resolve(absPath));
        if (rel.startsWith('..')) rel = path.resolve(absPath);
    } catch (_) {
        rel = path.resolve(absPath);
    }
    h.update(rel.split(path.sep).join('/'));

    return h.digest('hex');
}

// ───────────────────────────────────────────────────────────────────────────
// Cache Directory
// ───────────────────────────────────────────────────────────────────────────

/**
 * Returns the cache directory for a given workspace design root,
 * creating it if it does not exist.
 *
 * @param {string} designAbs - Absolute path to `.design` (or a workspace dir).
 * @returns {string} Absolute path to the cache directory.
 */
function cacheDir(designAbs) {
    const dir = path.join(designAbs, '.graph-cache');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ───────────────────────────────────────────────────────────────────────────
// Load / Save
// ───────────────────────────────────────────────────────────────────────────

/**
 * Loads a cached extraction result for a spec file, or returns null on miss.
 *
 * @param {string} absPath - Absolute path to the spec file.
 * @param {string} designAbs - Absolute design directory for cache location.
 * @param {string} [rootDir] - Root dir for path normalization (defaults to designAbs).
 * @returns {object|null} Cached extraction dict, or null if absent/corrupt.
 */
function loadCached(absPath, designAbs, rootDir = designAbs) {
    let hash;
    try { hash = fileHash(absPath, rootDir); }
    catch (_) { return null; }

    const entry = path.join(cacheDir(designAbs), `${hash}.json`);
    if (!fs.existsSync(entry)) return null;

    try { return JSON.parse(fs.readFileSync(entry, 'utf8')); }
    catch (_) { return null; }
}

/**
 * Saves an extraction result to the cache atomically (temp + rename).
 *
 * @param {string} absPath - Absolute path to the spec file.
 * @param {object} result - Extraction dict (shape per caller contract).
 * @param {string} designAbs - Absolute design directory for cache location.
 * @param {string} [rootDir] - Root dir for path normalization (defaults to designAbs).
 * @returns {void}
 */
function saveCached(absPath, result, designAbs, rootDir = designAbs) {
    let hash;
    try { hash = fileHash(absPath, rootDir); }
    catch (_) { return; }

    const entry = path.join(cacheDir(designAbs), `${hash}.json`);
    const tmp = `${entry}.tmp`;

    try {
        fs.writeFileSync(tmp, JSON.stringify(result), 'utf8');
        try { fs.renameSync(tmp, entry); }
        catch (err) {
            // Windows fallback: rename may fail (EPERM/EBUSY) on locked files.
            if (err.code === 'EPERM' || err.code === 'EBUSY') {
                fs.copyFileSync(tmp, entry);
                try { fs.unlinkSync(tmp); } catch (_) {}
            } else {
                throw err;
            }
        }
    } catch (err) {
        try { fs.unlinkSync(tmp); } catch (_) {}
        throw err;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Maintenance
// ───────────────────────────────────────────────────────────────────────────

/**
 * Deletes every cache entry under the workspace. Returns the count removed.
 *
 * @param {string} designAbs - Absolute design directory.
 * @returns {number} Number of cache files deleted.
 */
function clearCache(designAbs) {
    const dir = cacheDir(designAbs);
    let removed = 0;
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        try { fs.unlinkSync(path.join(dir, f)); removed += 1; } catch (_) {}
    }
    return removed;
}

module.exports = {
    fileHash,
    cacheDir,
    loadCached,
    saveCached,
    clearCache,
    stripFrontmatter,
};
