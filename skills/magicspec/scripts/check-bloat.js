#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectRoot, statePath, STATE_DIR_NAME } = require('./utils');
const { PHASE_FILE_RE } = require('./lib/phase-files');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK BLOAT (Context-Economy Advisory)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scans specification and task phase files for excessive size.
 * Emits advisory signals (non-halting) to guide decomposition before token
 * overhead accumulates in agent context windows.
 *
 * Default thresholds:
 *   Spec:  > 300 lines → SPEC_BLOAT   | > 500 lines → SPEC_DECOMPOSE
 *   Task:  > 250 lines → TASK_BLOAT   | > 400 lines → TASK_DECOMPOSE
 *
 * A project may change them in `.magicspec/workspace.json`:
 *   { "bloat": { "spec": { "soft": 300, "hard": 500 }, "task": { "soft": 250, "hard": 400 } } }
 * An omitted key keeps its default, and a threshold of 0 turns that signal off.
 * Specifications are scanned in every subdirectory of `specifications/`.
 *
 * Environment:
 *   MAGIC_DESIGN_DIR   Set by executor.js; determines the active workspace dir.
 *
 * Flags:
 *   --json   Emit JSON instead of human-readable text.
 */

const DEFAULT_THRESHOLDS = {
    spec: { soft: 300, hard: 500 },
    task: { soft: 250, hard: 400 },
};

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} filePath
 * @returns {number} Line count.
 */
function countLines(filePath) {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

/**
 * @returns {{ json: boolean }}
 */
function parseArgs() {
    return { json: process.argv.includes('--json') };
}

/**
 * Reads the thresholds: the defaults, with whatever the project's
 * `.magicspec/workspace.json` sets under `bloat`. A key that is absent, not a
 * non-negative number, or sits in a file that is missing or unreadable keeps
 * its default.
 *
 * @param {string} projectRoot - Absolute path of the project root.
 * @returns {{ spec: { soft: number, hard: number }, task: { soft: number, hard: number } }}
 */
function loadThresholds(projectRoot) {
    const limits = {
        spec: { ...DEFAULT_THRESHOLDS.spec },
        task: { ...DEFAULT_THRESHOLDS.task },
    };
    try {
        const data = JSON.parse(
            fs.readFileSync(statePath(projectRoot, 'workspace.json'), 'utf8'),
        );
        const section = data.bloat;
        for (const kind of ['spec', 'task']) {
            for (const tier of ['soft', 'hard']) {
                const value = section && section[kind] && section[kind][tier];
                if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                    limits[kind][tier] = value;
                }
            }
        }
    } catch {
        // No readable workspace.json: the defaults stand.
    }
    return limits;
}

// ───────────────────────────────────────────────────────────────────────────
// Scan
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists the files of a directory whose names match a pattern, as paths relative
 * to it, optionally descending into subdirectories.
 *
 * @param {string} dir - Directory to list.
 * @param {RegExp} pattern - Filename pattern filter.
 * @param {boolean} recursive - Whether to descend into subdirectories.
 * @returns {string[]} Relative paths with forward slashes, sorted.
 */
function listFiles(dir, pattern, recursive) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!recursive) continue;
            for (const nested of listFiles(path.join(dir, entry.name), pattern, true)) {
                found.push(`${entry.name}/${nested}`);
            }
        } else if (pattern.test(entry.name)) {
            found.push(entry.name);
        }
    }
    return found.sort();
}

/**
 * Scans a directory for files matching a pattern and records threshold violations.
 * A threshold of 0 turns its signal off.
 *
 * @param {string} dir - Directory to scan.
 * @param {RegExp} pattern - Filename pattern filter.
 * @param {'spec'|'task'} kind - Which threshold set to apply.
 * @param {string} relPrefix - Prefix for relative paths in the report.
 * @param {Array} issues - Accumulator for found issues.
 * @param {{ soft: number, hard: number }} limits - Thresholds for this kind.
 * @param {boolean} [recursive] - Whether to descend into subdirectories.
 */
function scanDir(dir, pattern, kind, relPrefix, issues, limits, recursive = false) {
    if (!fs.existsSync(dir)) return;

    for (const file of listFiles(dir, pattern, recursive)) {
        const filePath = path.join(dir, file);
        const lines = countLines(filePath);
        const relPath = `${relPrefix}/${file}`;

        if (limits.hard > 0 && lines > limits.hard) {
            issues.push({
                type: `${kind.toUpperCase()}_DECOMPOSE`,
                file: relPath,
                lines,
                limit: limits.hard,
            });
        } else if (limits.soft > 0 && lines > limits.soft) {
            issues.push({
                type: `${kind.toUpperCase()}_BLOAT`,
                file: relPath,
                lines,
                limit: limits.soft,
            });
        }
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();
    const projectRoot = resolveProjectRoot();
    const designDir = process.env.MAGIC_DESIGN_DIR || STATE_DIR_NAME;
    const wsDir = path.resolve(projectRoot, designDir);

    const issues = [];
    const limits = loadThresholds(projectRoot);

    scanDir(
        path.join(wsDir, 'specifications'),
        /\.md$/,
        'spec',
        'specifications',
        issues,
        limits.spec,
        true,
    );
    scanDir(path.join(wsDir, 'tasks'), PHASE_FILE_RE, 'task', 'tasks', issues, limits.task);

    if (opts.json) {
        process.stdout.write(JSON.stringify({ workspace: designDir, issues }, null, 2) + '\n');
        return 0;
    }

    if (issues.length === 0) {
        console.log('✅ No bloat detected. All specs and task files are within size limits.');
        return 0;
    }

    console.log(`⚠ Bloat Report — ${issues.length} issue(s) in ${designDir}:\n`);
    for (const issue of issues) {
        const icon = issue.type.endsWith('_DECOMPOSE') ? '🔴' : '🟡';
        console.log(
            `  ${icon} [${issue.type}] ${issue.file} — ${issue.lines} lines (limit: ${issue.limit})`,
        );
        if (issue.type.startsWith('SPEC_')) {
            console.log(
                `     → /magicspec:spec amend ${path.basename(issue.file, '.md')} to split into focused L2 specs`,
            );
        } else {
            console.log(
                `     → Decompose ${path.basename(issue.file)} into sub-tasks or split the phase`,
            );
        }
    }
    console.log('');

    return 0;
}

try {
    process.exit(main());
} catch (err) {
    console.error(`❌ check-bloat failed: ${err.message}`);
    if (process.env.MAGIC_DEBUG) console.error(err.stack);
    process.exit(1);
}
