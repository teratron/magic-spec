#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC REPORT (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// What a `sync` run collects while the areas work and prints once at the end
// (SY-8): what was written (or, under `--dry-run`, would be), what was already
// in sync, every disagreement with the one command that resolves it (SY-2) and
// every stale derived file with the command that removes it (SY-5). The areas
// never print; they record here, so a preview and a real run differ only in
// the verb.

const fs = require('fs');
const path = require('path');
const { normalizePath } = require('../utils');

// ───────────────────────────────────────────────────────────────────────────
// Collecting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Creates an empty report.
 *
 * @param {{dryRun: boolean, projectRoot: string}} options
 * @returns {{
 *   dryRun: boolean,
 *   written: {area: string, file: string, what: string}[],
 *   inSync: number,
 *   disagreements: {location: string, difference: string, command: string}[],
 *   stale: {file: string, command: string}[],
 *   shown: (abs: string) => string,
 * }}
 */
function createReport({ dryRun, projectRoot }) {
    return {
        dryRun,
        written: [],
        inSync: 0,
        disagreements: [],
        stale: [],
        shown: (abs) => normalizePath(path.relative(projectRoot, abs)),
    };
}

/**
 * Writes `content` to `abs` only when it differs from what is stored (SY-3), and records the
 * write. Under `--dry-run` the record is made and nothing is written (SY-7). A file that does
 * not exist yet differs by definition.
 *
 * @param {ReturnType<typeof createReport>} report
 * @param {string} area - Area name for the record.
 * @param {string} abs - Absolute path.
 * @param {string} content - The recomputed content.
 * @param {string} what - One phrase saying what changed.
 * @returns {boolean} True when the content differed.
 */
function writeIfChanged(report, area, abs, content, what) {
    let stored = null;
    try {
        stored = fs.readFileSync(abs, 'utf8');
    } catch {
        /* absent: differs */
    }
    if (stored === content) {
        report.inSync += 1;
        return false;
    }
    if (!report.dryRun) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content, 'utf8');
    }
    report.written.push({ area, file: report.shown(abs), what });
    return true;
}

// ───────────────────────────────────────────────────────────────────────────
// Printing
// ───────────────────────────────────────────────────────────────────────────

/**
 * The first router command a recorded command names, or null.
 *
 * @param {string} command - A command text such as `/magicspec spec` or a prose instruction.
 * @returns {string|null} The `/magicspec <command>` token.
 */
function routerCommandOf(command) {
    const hit = /\/magicspec ([a-z][a-z-]*)/.exec(command);
    return hit ? hit[0] : null;
}

/**
 * Renders the report: the counts line, one line per write, disagreement and stale file, and the
 * line that names the next step. With nothing to write and nothing to report it is one line.
 *
 * @param {ReturnType<typeof createReport>} report
 * @param {string|null} nextLine - The handoff line the caller computed, or null.
 * @returns {string}
 */
function formatReport(report, nextLine) {
    const { written, disagreements, stale, inSync, dryRun } = report;
    if (written.length === 0 && disagreements.length === 0 && stale.length === 0) {
        return `[Sync] ${dryRun ? '(dry run) ' : ''}in sync — nothing to write, nothing to report.`;
    }
    const verb = dryRun ? 'would write' : 'written';
    const lines = [
        `[Sync] ${dryRun ? '(dry run) ' : ''}${written.length} ${dryRun ? 'to write' : 'written'} · ${inSync} in sync · ${disagreements.length} disagreements · ${stale.length} stale`,
    ];
    for (const item of written)
        lines.push(`  ${verb.padEnd(11)} ${item.area}: ${item.file} — ${item.what}`);
    for (const item of disagreements)
        lines.push(`  disagree    ${item.location} — ${item.difference} → ${item.command}`);
    for (const item of stale)
        lines.push(`  stale       ${item.file} — no source → ${item.command}`);
    if (nextLine) lines.push(nextLine);
    return lines.join('\n');
}

module.exports = { createReport, writeIfChanged, formatReport, routerCommandOf };
