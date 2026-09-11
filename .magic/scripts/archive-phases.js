#!/usr/bin/env node
'use strict';

const path = require('path');
const { findArchiveCandidates, archiveCompletedPhases } = require('./lib/phase-archiver');

// ═══════════════════════════════════════════════════════════════════════════
// ARCHIVE PHASES (CLI Entry Point)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CLI wrapper for phase archival.
 *
 * Scans the active workspace tasks/ directory for completed phase workbooks
 * (status: Done + all checkboxes checked) and moves them to archives/tasks/.
 * Updates TASKS.md link references accordingly.
 *
 * A workbook is recognized by name as `phase-{N}[{track}].md` (phase-files.js).
 * Markdown files in tasks/ that do not take that shape are listed on the way
 * out instead of being dropped without comment: the question this command
 * answers when it archives nothing is "why not?", and "I never looked at that
 * file" is a different answer from "I read it and it was not eligible".
 *
 * Flags:
 *   --dry-run   Preview operations without writing anything.
 *   --check     Exit 1 (with advisory message) if unarchived completed phases
 *               exist. Intended for use in pre-commit hooks — non-blocking
 *               (exits 0 even when candidates are found, only prints a notice).
 *
 * Environment:
 *   MAGIC_DESIGN_DIR   Set by executor.js; determines the active workspace dir.
 *   MAGIC_DRY_RUN=1    Alternative dry-run activation.
 */

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {{ dryRun: boolean, check: boolean }}
 */
function parseArgs() {
    const args = process.argv.slice(2);
    return {
        dryRun: args.includes('--dry-run'),
        check: args.includes('--check'),
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Reporting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Names the Markdown files in tasks/ that are not phase workbooks.
 *
 * Advisory only — these files are never archived and nothing here fails. The
 * point is that the scanner accounts for every file it saw. Deliberately not
 * emitted on the `--check` path: that runs in the pre-commit hook, whose job
 * is to nag about pending archival, not to lint naming on every commit.
 *
 * @param {string[]} unrecognized - Filenames that matched no phase shape.
 */
function reportUnrecognized(unrecognized) {
    if (!unrecognized || unrecognized.length === 0) return;
    console.log(
        "[Archive] Not phase workbooks, so not considered (expected phase-{N}[{track}].md):"
    );
    for (const file of unrecognized) {
        console.log(`  ↷ ${file}`);
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();
    if (opts.dryRun) process.env.MAGIC_DRY_RUN = '1';

    const projectRoot = path.resolve(__dirname, '..', '..');
    const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
    const wsDir = path.resolve(projectRoot, designDir);

    if (opts.check) {
        const candidates = findArchiveCandidates(wsDir);
        if (candidates.length > 0) {
            console.log(
                `[Archive] Notice: ${candidates.length} completed phase(s) pending archival: ` +
                candidates.map(c => c.file).join(', ')
            );
            console.log('[Archive] Run /magic.run or: node .magic/scripts/executor.js archive-phases');
        }
        return 0;
    }

    const { archived, skipped, unrecognized } = archiveCompletedPhases(wsDir, { dryRun: opts.dryRun });

    if (archived.length === 0 && skipped.length === 0) {
        console.log('[Archive] No completed phases to archive.');
        reportUnrecognized(unrecognized);
        return 0;
    }

    if (archived.length > 0) {
        console.log(`[Archive] Archived ${archived.length} phase(s):`);
        for (const { file, name } of archived) {
            console.log(`  ✅ ${file}${name ? ` — ${name}` : ''}`);
        }
    }

    if (skipped.length > 0) {
        console.log(`[Archive] Skipped ${skipped.length} (already in archives/):`);
        for (const file of skipped) {
            console.log(`  ⚠ ${file}`);
        }
    }

    reportUnrecognized(unrecognized);

    return 0;
}

try {
    process.exit(main());
} catch (err) {
    console.error(`❌ archive-phases failed: ${err.message}`);
    if (process.env.MAGIC_DEBUG) console.error(err.stack);
    process.exit(1);
}
