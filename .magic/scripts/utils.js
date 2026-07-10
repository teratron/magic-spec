#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES (Engine Kernel)
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Engine Integrity Surface (Single Source of Truth)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Files that must NOT appear in `.checksums` because they change as part of
 * normal engine operation and would produce spurious ENGINE_INTEGRITY warnings.
 *
 * Per-project state caches (sync-docs, finalize, project-meta) live outside
 * `.magic/` (in `dev/.cache/` or `.design/.cache/`) and never reach this set.
 * What remains is the engine version file, which is bumped on every release.
 *
 * Consumers:
 *   - generate-checksums.js — must skip these when building the manifest.
 *   - update-engine-meta.js — must skip these when detecting drift.
 *   - check-prerequisites.js — relies on the manifest above being clean.
 */
const VOLATILE_STATE_FILES = new Set([
    '.version',   // bumped on every engine update; drift-detector already skips it
]);

// ───────────────────────────────────────────────────────────────────────────
// Dry-Run Guard (Read-Only Invariant)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Indicates whether the current process is running under dry-run semantics.
 * Set by orchestrators (e.g. sync.js) via MAGIC_DRY_RUN=1. All filesystem
 * mutation helpers below honor this flag — callers should prefer them over
 * raw fs.* write calls to preserve the read-only invariant.
 *
 * @returns {boolean} True when MAGIC_DRY_RUN is set to a truthy value.
 */
function isDryRun() {
    const v = process.env.MAGIC_DRY_RUN;
    return v === '1' || v === 'true';
}

/**
 * Writes a file, honoring MAGIC_DRY_RUN. In dry-run mode, logs the intended
 * mutation (path + whether content would actually change) and skips the write.
 *
 * @param {string} filePath - Absolute or relative target path.
 * @param {string|Buffer} content - Data to write.
 * @returns {boolean} True when a physical write occurred; false under dry-run.
 */
function writeFileSafe(filePath, content) {
    if (isDryRun()) {
        const existed = fs.existsSync(filePath);
        const changed = !existed || fs.readFileSync(filePath, 'utf8') !== String(content);
        const rel = path.relative(process.cwd(), filePath);
        const tag = existed ? (changed ? 'would modify' : 'unchanged') : 'would create';
        console.log(`  🧪 [dry-run] ${tag}: ${rel}`);
        return false;
    }
    fs.writeFileSync(filePath, content);
    return true;
}

/**
 * Appends to a file, honoring MAGIC_DRY_RUN.
 *
 * @param {string} filePath - Absolute or relative target path.
 * @param {string|Buffer} content - Data to append.
 * @returns {boolean} True when a physical append occurred; false under dry-run.
 */
function appendFileSafe(filePath, content) {
    if (isDryRun()) {
        const rel = path.relative(process.cwd(), filePath);
        console.log(`  🧪 [dry-run] would append to: ${rel}`);
        return false;
    }
    fs.appendFileSync(filePath, content);
    return true;
}

/**
 * Creates a directory (recursive), honoring MAGIC_DRY_RUN.
 *
 * @param {string} dirPath - Absolute or relative directory path.
 * @returns {boolean} True when a physical mkdir occurred; false under dry-run.
 */
function mkdirSafe(dirPath) {
    if (fs.existsSync(dirPath)) return false;
    if (isDryRun()) {
        const rel = path.relative(process.cwd(), dirPath);
        console.log(`  🧪 [dry-run] would create dir: ${rel}`);
        return false;
    }
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
}

/**
 * Converts Windows-style backslashes to POSIX forward slashes.
 * Use when emitting paths into JSON, logs, or any cross-platform surface.
 *
 * @param {string} p - Path with any separator mix.
 * @returns {string} Path using forward slashes only.
 */
function normalizePath(p) {
    return String(p).replace(/\\/g, '/');
}

/**
 * Calculates SHA256 hash of a file.
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @returns {string} Hex-encoded SHA256 hash.
 * @throws {Error} If the file cannot be read.
 */
function hashFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Calculates SHA256 hash of a file with retry safety for race conditions.
 * Returns null if the file does not exist.
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @param {number} [retry=5] - Number of retry attempts on read failure.
 * @returns {string|null} Hex-encoded SHA256 hash, or null if file missing.
 * @throws {Error} If all retries are exhausted.
 */
function hashFileSafe(filePath, retry = 5) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return hashFile(filePath);
    } catch (e) {
        if (retry > 0) {
            // Synchronous delay via busy-wait (200ms)
            const end = Date.now() + 200;
            while (Date.now() < end) { /* spin */ }
            return hashFileSafe(filePath, retry - 1);
        }
        throw e;
    }
}

/**
 * Recursively collects all files in a directory.
 *
 * @param {string} dirPath - Root directory to scan.
 * @param {string[]} [ignoreDirs=['history']] - Directory names to skip.
 * @param {string[]} [arrayOfFiles=[]] - Accumulator for recursive calls.
 * @returns {string[]} Array of absolute file paths.
 */
function getAllFiles(dirPath, ignoreDirs = ['history'], arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    const path = require('path');

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (ignoreDirs.includes(file)) return;
            getAllFiles(fullPath, ignoreDirs, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

// ───────────────────────────────────────────────────────────────────────────
// Gitignore Filtering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Loads `.gitignore` patterns and compiles them into a path predicate.
 *
 * Supports the subset of gitignore syntax that matters for source scanning:
 *   - bare directory/file names (`node_modules`, `target`) — matched at any depth
 *   - wildcard basenames (`*.log`, `*.py[cod]` → treated as `*` globs)
 *   - root-anchored patterns (`/dist`) — matched only at the project root
 *   - nested path patterns (`docs/build/`) — anchored, per gitignore semantics
 *   - trailing-slash directory markers, `#` comments, blank lines
 *
 * Negation (`!`) is deliberately unsupported: re-including a path from an
 * ignored tree cannot be decided without full gitignore ordering semantics,
 * and over-scanning is a worse failure than under-scanning here.
 *
 * @param {string} [rootDir='.'] - Project root containing `.gitignore`.
 * @returns {function(string): boolean} Predicate: true when the relative path is ignored.
 */
function loadGitignore(rootDir = '.') {
    const gitignorePath = path.join(rootDir, '.gitignore');

    let content;
    try {
        content = fs.readFileSync(gitignorePath, 'utf8');
    } catch {
        return () => false;
    }

    /** @type {string[]} Root-relative prefixes (`dist`, `docs/build`). */
    const anchored = [];
    /** @type {Set<string>} Bare names matched against any path segment. */
    const segments = new Set();
    /** @type {RegExp[]} Wildcard basename matchers. */
    const globs = [];

    for (const raw of content.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || line.startsWith('!')) continue;

        const rooted = line.startsWith('/');
        const cleaned = line.replace(/^\/+/, '').replace(/\/+$/, '');
        if (!cleaned) continue;

        if (rooted || cleaned.includes('/')) {
            anchored.push(normalizePath(cleaned));
        } else if (cleaned.includes('*')) {
            const source = cleaned
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*');
            globs.push(new RegExp(`^${source}$`));
        } else {
            segments.add(cleaned);
        }
    }

    /**
     * @param {string} relPath - Path relative to `rootDir`, any separator style.
     * @returns {boolean} True when the path lies inside an ignored tree.
     */
    return function isIgnored(relPath) {
        const normalized = normalizePath(relPath);
        if (!normalized || normalized === '.') return false;

        for (const part of normalized.split('/')) {
            if (segments.has(part)) return true;
            if (globs.some(re => re.test(part))) return true;
        }

        return anchored.some(
            prefix => normalized === prefix || normalized.startsWith(`${prefix}/`),
        );
    };
}

/**
 * Resolves the root .design/ directory that contains workspace.json.
 * If MAGIC_DESIGN_DIR points to a workspace subdirectory, walks up one level.
 *
 * @param {string} rootDir - Project root (process.cwd()).
 * @returns {{designDir: string, designAbs: string}}
 */
function resolveDesignRoot(rootDir) {
    const envDir = process.env.MAGIC_DESIGN_DIR || '.design';
    const candidate = path.resolve(rootDir, envDir);
    if (fs.existsSync(path.join(candidate, 'workspace.json'))) {
        return { designDir: envDir, designAbs: candidate };
    }
    const parent = path.dirname(candidate);
    if (parent !== candidate && fs.existsSync(path.join(parent, 'workspace.json'))) {
        return { designDir: path.relative(rootDir, parent), designAbs: parent };
    }
    return { designDir: envDir, designAbs: candidate };
}

module.exports = {
    hashFile,
    hashFileSafe,
    getAllFiles,
    normalizePath,
    isDryRun,
    writeFileSafe,
    appendFileSafe,
    mkdirSafe,
    loadGitignore,
    resolveDesignRoot,
    VOLATILE_STATE_FILES,
};
