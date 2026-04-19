const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES (Engine Kernel)
// ═══════════════════════════════════════════════════════════════════════════

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

module.exports = {
    hashFile,
    hashFileSafe,
    getAllFiles,
    normalizePath,
    isDryRun,
    writeFileSafe,
    appendFileSafe,
    mkdirSafe,
};
