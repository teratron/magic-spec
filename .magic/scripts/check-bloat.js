#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK BLOAT (Context-Economy Advisory)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scans specification and task phase files for excessive size.
 * Emits advisory signals (non-halting) to guide decomposition before token
 * overhead accumulates in agent context windows.
 *
 * Thresholds:
 *   Spec:  > 300 lines → SPEC_BLOAT   | > 500 lines → SPEC_DECOMPOSE
 *   Task:  > 250 lines → TASK_BLOAT   | > 400 lines → TASK_DECOMPOSE
 *
 * Environment:
 *   MAGIC_DESIGN_DIR   Set by executor.js; determines the active workspace dir.
 *
 * Flags:
 *   --json   Emit JSON instead of human-readable text.
 */

const THRESHOLDS = {
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

// ───────────────────────────────────────────────────────────────────────────
// Scan
// ───────────────────────────────────────────────────────────────────────────

/**
 * Scans a directory for files matching a pattern and records threshold violations.
 *
 * @param {string} dir - Directory to scan.
 * @param {RegExp} pattern - Filename pattern filter.
 * @param {'spec'|'task'} kind - Which threshold set to apply.
 * @param {string} relPrefix - Prefix for relative paths in the report.
 * @param {Array} issues - Accumulator for found issues.
 */
function scanDir(dir, pattern, kind, relPrefix, issues) {
    if (!fs.existsSync(dir)) return;
    const limits = THRESHOLDS[kind];

    for (const file of fs.readdirSync(dir).filter(f => pattern.test(f)).sort()) {
        const filePath = path.join(dir, file);
        const lines = countLines(filePath);
        const relPath = `${relPrefix}/${file}`;

        if (lines > limits.hard) {
            issues.push({ type: `${kind.toUpperCase()}_DECOMPOSE`, file: relPath, lines, limit: limits.hard });
        } else if (lines > limits.soft) {
            issues.push({ type: `${kind.toUpperCase()}_BLOAT`, file: relPath, lines, limit: limits.soft });
        }
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();
    const projectRoot = path.resolve(__dirname, '..', '..');
    const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
    const wsDir = path.resolve(projectRoot, designDir);

    const issues = [];

    scanDir(path.join(wsDir, 'specifications'), /\.md$/, 'spec', 'specifications', issues);
    scanDir(path.join(wsDir, 'tasks'), /^phase-\d+\.md$/, 'task', 'tasks', issues);

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
        console.log(`  ${icon} [${issue.type}] ${issue.file} — ${issue.lines} lines (limit: ${issue.limit})`);
        if (issue.type.startsWith('SPEC_')) {
            console.log(`     → /magic.spec amend ${path.basename(issue.file, '.md')} to split into focused L2 specs`);
        } else {
            console.log(`     → Decompose ${path.basename(issue.file)} into sub-tasks or split the phase`);
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
