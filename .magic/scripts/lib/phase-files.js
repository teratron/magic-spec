#!/usr/bin/env node
'use strict';

const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// PHASE FILE RECOGNITION (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical phase-workbook filename shape, per l2-engine-finalization.md §6.1.
 *
 * `phase-{N}[{track}].md` — the number is the phase, the optional trailing
 * letters are a track split (`phase-10a.md`, `phase-10b.md`), the same track
 * dimension the task-ID grammar `T-{phase}{track}{seq}` already carries. The
 * suffix is matched case-insensitively because the filesystems this engine
 * runs on disagree about case, and a workbook must not become invisible
 * because it was saved as `phase-10B.md`.
 *
 * Prior spelling `/^phase-\d+\.md$/` rejected every suffixed workbook before
 * its frontmatter was read, so a `status: Done` phase reported as "nothing to
 * archive" with no diagnostic. Keep this the single source of truth: the
 * recognizer is shared precisely so archival, bloat-scanning, and next-action
 * lookup cannot drift into disagreeing about what a phase file is.
 */
const PHASE_FILE_RE = /^phase-(\d+)([a-z]*)\.md$/i;

// ───────────────────────────────────────────────────────────────────────────
// Parsing & Ordering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Parses a phase-workbook filename into its ordering components.
 *
 * @param {string} file - Bare filename (no directory part).
 * @returns {{ file: string, number: number, suffix: string }|null}
 *          Parsed descriptor, or `null` when the name is not a phase workbook.
 */
function parsePhaseFileName(file) {
    const m = PHASE_FILE_RE.exec(file);
    if (!m) return null;
    return { file, number: parseInt(m[1], 10), suffix: (m[2] || '').toLowerCase() };
}

/**
 * Returns true when `file` names a phase workbook.
 *
 * @param {string} file - Bare filename.
 * @returns {boolean}
 */
function isPhaseFile(file) {
    return PHASE_FILE_RE.test(file);
}

/**
 * Orders two parsed phase descriptors: phase number first, track suffix as
 * tiebreaker. A plain `phase-10.md` sorts ahead of `phase-10a.md` because an
 * empty suffix compares low.
 *
 * A lexical sort of the raw names is wrong once phase numbers reach two
 * digits — it puts `phase-10.md` ahead of `phase-2.md`.
 *
 * @param {{ number: number, suffix: string }} a
 * @param {{ number: number, suffix: string }} b
 * @returns {number}
 */
function comparePhaseFiles(a, b) {
    return a.number - b.number || a.suffix.localeCompare(b.suffix);
}

// ───────────────────────────────────────────────────────────────────────────
// Directory Scanning
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists the phase workbooks in a tasks directory, correctly ordered.
 *
 * @param {string} tasksDir - Absolute path to the workspace `tasks/` directory.
 * @returns {{ file: string, number: number, suffix: string }[]}
 *          Empty when the directory does not exist.
 */
function listPhaseFiles(tasksDir) {
    if (!fs.existsSync(tasksDir)) return [];
    return fs.readdirSync(tasksDir)
        .map(parsePhaseFileName)
        .filter(Boolean)
        .sort(comparePhaseFiles);
}

/**
 * Lists the Markdown files in a tasks directory that are *not* phase
 * workbooks. These are never archived — but they must be reportable, so a
 * caller can distinguish "not seen" from "seen and found ineligible". A
 * name-based exclusion that leaves no trace is the defect this exists to
 * prevent recurring (l2-engine-finalization.md §6.1).
 *
 * @param {string} tasksDir - Absolute path to the workspace `tasks/` directory.
 * @returns {string[]} Sorted filenames, empty when the directory does not exist.
 */
function listUnrecognizedTaskFiles(tasksDir) {
    if (!fs.existsSync(tasksDir)) return [];
    return fs.readdirSync(tasksDir)
        .filter(f => f.toLowerCase().endsWith('.md') && !isPhaseFile(f))
        .sort();
}

module.exports = {
    PHASE_FILE_RE,
    parsePhaseFileName,
    isPhaseFile,
    comparePhaseFiles,
    listPhaseFiles,
    listUnrecognizedTaskFiles,
};
