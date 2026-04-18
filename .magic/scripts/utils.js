const fs = require('fs');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES (Engine Kernel)
// ═══════════════════════════════════════════════════════════════════════════

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

module.exports = { hashFile, hashFileSafe, getAllFiles, normalizePath };
