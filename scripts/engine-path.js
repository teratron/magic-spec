'use strict';

const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE LOCATION (maintenance scripts)
// ═══════════════════════════════════════════════════════════════════════════
//
// The maintenance scripts reach the shipped engine through this module only: the
// folder's place in the repository is one constant, and the repository root is
// derived from where this file lies, never counted by a caller.

/** The engine folder of the developer repository, relative to the repository root. */
const ENGINE_DIR = path.join('skills', 'magicspec');

/** The maintenance scripts' own folder, relative to the repository root. */
const MAINTENANCE_DIR = 'scripts';

/**
 * @returns {string} Absolute path of the repository root, derived from this file's location.
 */
function repoRoot() {
    return path.resolve(__dirname, '..');
}

/**
 * @param {...string} parts - Path segments below the engine folder.
 * @returns {string} Absolute path inside the engine folder of the repository.
 */
function enginePath(...parts) {
    return path.join(repoRoot(), ENGINE_DIR, ...parts);
}

module.exports = { ENGINE_DIR, MAINTENANCE_DIR, repoRoot, enginePath };
