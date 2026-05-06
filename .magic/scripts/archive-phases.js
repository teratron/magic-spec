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
 * Scans the active workspace tasks/ directory for completed phase-*.md files
 * (status: Done + all checkboxes checked) and moves them to archives/tasks/.
 * Updates TASKS.md link references accordingly.
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

    const { archived, skipped } = archiveCompletedPhases(wsDir, { dryRun: opts.dryRun });

    if (archived.length === 0 && skipped.length === 0) {
        console.log('[Archive] No completed phases to archive.');
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

    return 0;
}

try {
    process.exit(main());
} catch (err) {
    console.error(`❌ archive-phases failed: ${err.message}`);
    if (process.env.MAGIC_DEBUG) console.error(err.stack);
    process.exit(1);
}
