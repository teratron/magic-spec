#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('check-bloat', module);

const fs = require('fs');
const path = require('path');
const { resolveProjectRoot, statePath, STATE_DIR_NAME } = require('./utils');
const { PHASE_FILE_RE } = require('./lib/phase-files');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK BLOAT (Context-Economy Advisory)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scans specification files, task phase files and the working documents every
 * workflow loads (registries, plan, task ledger, constitutions) for excessive size.
 * Emits advisory signals (non-halting) to guide decomposition before token
 * overhead accumulates in agent context windows.
 *
 * Default thresholds:
 *   Spec:  > 300 lines → SPEC_BLOAT   | > 500 lines → SPEC_DECOMPOSE
 *   Task:  > 250 lines → TASK_BLOAT   | > 400 lines → TASK_DECOMPOSE
 *   Doc:   > 30 KB     → DOC_BLOAT    | > 60 KB     → DOC_DECOMPOSE
 *
 * A project may change them in `.magicspec/workspace.json`:
 *   { "bloat": { "spec": { "soft": 300, "hard": 500 }, "task": { "soft": 250, "hard": 400 },
 *                "doc": { "soft": 30, "hard": 60 } } }
 * An omitted key keeps its default, and a threshold of 0 turns that signal off.
 * Specifications are scanned in every subdirectory of `specifications/`. The doc
 * limits are kilobytes, because a document is read whole on every workflow and
 * its cost is its size, not its line count.
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
    doc: { soft: 30, hard: 60 },
};

/**
 * The working documents, and what shrinks each. Workspace documents live in the
 * active workspace folder, global ones directly under the state folder.
 */
const WORKING_DOCS = [
    {
        scope: 'workspace',
        name: 'INDEX.md',
        remedy: 'shorten the Description cells and move superseded history rows to archives/',
    },
    {
        scope: 'workspace',
        name: 'PLAN.md',
        remedy: 'move completed phases out of the plan (a Done phase belongs in archives/)',
    },
    {
        scope: 'workspace',
        name: 'TASKS.md',
        remedy: 'run /magicspec:run so finalize archives the Done phases',
    },
    {
        scope: 'workspace',
        name: 'RULES.md',
        remedy: '/magicspec:rule to consolidate overlapping conventions and trim history rows',
    },
    {
        scope: 'global',
        name: 'INDEX.md',
        remedy: 'move superseded engine-snapshot history rows to an archive',
    },
    {
        scope: 'global',
        name: 'RULES.md',
        remedy: '/magicspec:rule to consolidate overlapping conventions and trim history rows',
    },
];

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
 * @returns {{ spec: { soft: number, hard: number }, task: { soft: number, hard: number }, doc: { soft: number, hard: number } }}
 */
function loadThresholds(projectRoot) {
    const limits = {
        spec: { ...DEFAULT_THRESHOLDS.spec },
        task: { ...DEFAULT_THRESHOLDS.task },
        doc: { ...DEFAULT_THRESHOLDS.doc },
    };
    try {
        const data = JSON.parse(fs.readFileSync(statePath(projectRoot, 'workspace.json'), 'utf8'));
        const section = data.bloat;
        for (const kind of ['spec', 'task', 'doc']) {
            for (const tier of ['soft', 'hard']) {
                const value = section?.[kind]?.[tier];
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

/**
 * Records the working documents whose size passes the doc thresholds (kilobytes).
 * A threshold of 0 turns its signal off. A document that does not exist is skipped,
 * and the global folder is not scanned twice when the workspace is the state folder.
 *
 * @param {string} wsDir - Absolute path of the active workspace folder.
 * @param {string} globalDir - Absolute path of the state folder.
 * @param {string} designDir - Workspace folder as the report names it.
 * @param {Array} issues - Accumulator for found issues.
 * @param {{ soft: number, hard: number }} limits - Thresholds in kilobytes.
 */
function scanDocuments(wsDir, globalDir, designDir, issues, limits) {
    for (const doc of WORKING_DOCS) {
        if (doc.scope === 'global' && path.resolve(wsDir) === path.resolve(globalDir)) continue;
        const dir = doc.scope === 'global' ? globalDir : wsDir;
        const filePath = path.join(dir, doc.name);
        if (!fs.existsSync(filePath)) continue;

        const bytes = fs.statSync(filePath).size;
        const kb = bytes / 1024;
        const rel =
            doc.scope === 'global' ? `${STATE_DIR_NAME}/${doc.name}` : `${designDir}/${doc.name}`;
        const tier =
            limits.hard > 0 && kb > limits.hard
                ? { type: 'DOC_DECOMPOSE', limit: limits.hard }
                : limits.soft > 0 && kb > limits.soft
                  ? { type: 'DOC_BLOAT', limit: limits.soft }
                  : null;
        if (!tier) continue;
        issues.push({
            ...tier,
            file: rel,
            bytes,
            tokens: Math.round(bytes / 3.5),
            remedy: doc.remedy,
        });
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
    scanDocuments(wsDir, path.resolve(projectRoot, STATE_DIR_NAME), designDir, issues, limits.doc);

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
        if (issue.type.startsWith('DOC_')) {
            console.log(
                `  ${icon} [${issue.type}] ${issue.file} — ${(issue.bytes / 1024).toFixed(0)} KB, ~${issue.tokens} tokens per read (limit: ${issue.limit} KB)`,
            );
            console.log(`     → ${issue.remedy}`);
            continue;
        }
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
