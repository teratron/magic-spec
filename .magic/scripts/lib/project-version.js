const fs = require('fs');
const path = require('path');
const { writeFileSafe, isDryRun } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT VERSION (.design/.version)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User-project SemVer file. Symmetric with `.magic/.version` (engine):
 *   - `.magic/.version` = version of the SDD engine itself.
 *   - `.design/.version` = version of the user's project / specifications.
 *
 * Bumped only by `finalize.js` after a workflow that produced significant
 * changes (whitelisted artifact diffs). Patch-only bumps. Major/minor bumps
 * are manual or handled by a future release workflow.
 *
 * Initial value when the file is created: `0.1.0` (signals pre-1.0 work).
 * Creation does NOT bump — first bump moves `0.1.0` → `0.1.1`.
 */

const INITIAL_VERSION = '0.1.0';
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

// ───────────────────────────────────────────────────────────────────────────
// Read & Write
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the project version from disk.
 *
 * @param {string} versionPath - Absolute path to `.design/.version`.
 * @returns {{version: string, exists: boolean, corrupted: boolean}}
 *   `version` is the parsed value (or INITIAL_VERSION if missing/corrupted).
 *   `corrupted` flags malformed content (caller may want to backup).
 */
function readVersion(versionPath) {
    if (!fs.existsSync(versionPath)) {
        return { version: INITIAL_VERSION, exists: false, corrupted: false };
    }
    const raw = fs.readFileSync(versionPath, 'utf8').trim();
    if (!SEMVER_RE.test(raw)) {
        return { version: INITIAL_VERSION, exists: true, corrupted: true };
    }
    return { version: raw, exists: true, corrupted: false };
}

/**
 * Writes a SemVer string to disk with a trailing newline (matches `.magic/.version`).
 *
 * @param {string} versionPath - Absolute path.
 * @param {string} version - SemVer string.
 * @returns {boolean} True on physical write, false under dry-run.
 */
function writeVersion(versionPath, version) {
    if (!SEMVER_RE.test(version)) {
        throw new Error(`Refusing to write non-SemVer value: '${version}'`);
    }
    return writeFileSafe(versionPath, version + '\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Mutation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Bumps the patch component of a SemVer string.
 *
 * @param {string} version - Current SemVer.
 * @returns {string} Next patch SemVer.
 */
function bumpPatch(version) {
    const m = version.match(SEMVER_RE);
    if (!m) throw new Error(`Cannot bump non-SemVer value: '${version}'`);
    const major = parseInt(m[1], 10);
    const minor = parseInt(m[2], 10);
    const patch = parseInt(m[3], 10) + 1;
    return `${major}.${minor}.${patch}`;
}

/**
 * Backs up a corrupted version file to `<path>.backup-<timestamp>` so the
 * caller can safely overwrite with INITIAL_VERSION.
 *
 * @param {string} versionPath - Absolute path to the corrupted file.
 * @returns {string|null} Backup path on success, null under dry-run.
 */
function backupCorrupted(versionPath) {
    if (isDryRun()) return null;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${versionPath}.backup-${stamp}`;
    fs.copyFileSync(versionPath, backupPath);
    return backupPath;
}

/**
 * High-level entry: ensure file exists with INITIAL_VERSION. Does NOT bump.
 * Used on the very first `finalize` run when no version file exists yet.
 *
 * @param {string} versionPath - Absolute path to `.design/.version`.
 * @returns {{version: string, created: boolean}}
 */
function ensureInitialized(versionPath) {
    const state = readVersion(versionPath);
    if (state.exists && !state.corrupted) {
        return { version: state.version, created: false };
    }
    if (state.corrupted) {
        const backup = backupCorrupted(versionPath);
        if (backup) {
            console.warn(`⚠️  Corrupted ${path.basename(versionPath)} backed up → ${path.basename(backup)}; resetting to ${INITIAL_VERSION}.`);
        }
    }
    writeVersion(versionPath, INITIAL_VERSION);
    return { version: INITIAL_VERSION, created: true };
}

/**
 * High-level entry: bump patch and persist. Returns the version transition.
 * If the file is missing, creates it at INITIAL_VERSION first, then bumps
 * (so the very first bump goes 0.1.0 → 0.1.1).
 *
 * @param {string} versionPath - Absolute path to `.design/.version`.
 * @returns {{previous: string, next: string, created: boolean}}
 */
function bumpAndWrite(versionPath) {
    const { version: current, created } = ensureInitialized(versionPath);
    const next = bumpPatch(current);
    writeVersion(versionPath, next);
    return { previous: current, next, created };
}

module.exports = {
    INITIAL_VERSION,
    SEMVER_RE,
    readVersion,
    writeVersion,
    bumpPatch,
    backupCorrupted,
    ensureInitialized,
    bumpAndWrite,
};
