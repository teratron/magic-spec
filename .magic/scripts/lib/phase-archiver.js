#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe, mkdirSafe, isDryRun } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// PHASE ARCHIVER (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses YAML frontmatter key-value pairs from Markdown content.
 *
 * @param {string} content - Full file content including frontmatter.
 * @returns {Object} Key-value map of scalar frontmatter fields.
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const result = {};
    for (const line of match[1].split('\n')) {
        const m = line.match(/^(\w+):\s*(.+)$/);
        if (m) result[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return result;
}

/**
 * Returns true when all Atomic Checklist items are checked. Per
 * l2-engine-finalization.md §6, an unchecked item is a checklist *line*
 * (`- [ ]` at line start, optional indent) — NOT a `- [ ]` sequence quoted
 * in prose, Notes, or code. Inline code-spans and fenced blocks are stripped
 * first so a phase that merely documents checkbox syntax stays archivable.
 *
 * @param {string} content - File body content.
 * @returns {boolean}
 */
function allChecked(content) {
    const stripped = content
        .replace(/```[\s\S]*?```/g, '')  // fenced code blocks
        .replace(/`[^`]*`/g, '');        // inline code-spans
    return !/^\s*- \[ \]/m.test(stripped);
}

/**
 * Scans wsDir/tasks/ for completed phase-*.md files without moving them.
 * A phase is a candidate when:
 *   - frontmatter status === 'Done'
 *   - no unchecked items (- [ ])
 *   - not already present in archives/tasks/
 *
 * @param {string} wsDir - Absolute path to the workspace design directory.
 * @returns {{ file: string, phase: string, name: string }[]} List of candidates.
 */
function findArchiveCandidates(wsDir) {
    const tasksDir = path.join(wsDir, 'tasks');
    if (!fs.existsSync(tasksDir)) return [];

    const archiveDir = path.join(wsDir, 'archives', 'tasks');
    const candidates = [];

    for (const file of fs.readdirSync(tasksDir).filter(f => /^phase-\d+\.md$/.test(f)).sort()) {
        const filePath = path.join(tasksDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const front = parseFrontmatter(content);
        const alreadyArchived = fs.existsSync(path.join(archiveDir, file));

        if (front.status === 'Done' && allChecked(content) && !alreadyArchived) {
            candidates.push({
                file,
                phase: String(front.phase || ''),
                name: String(front.name || ''),
            });
        }
    }
    return candidates;
}

// ───────────────────────────────────────────────────────────────────────────
// TASKS.md Mutation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Updates TASKS.md after archival:
 *   1. Rewrites task links from tasks/phase-N.md to archives/tasks/phase-N.md.
 *   2. Updates status on the affected table rows to `Done (Archived)`.
 *
 * @param {string} tasksIndexPath - Absolute path to TASKS.md.
 * @param {string[]} archivedFiles - Array of filenames that were archived.
 */
function updateTasksIndex(tasksIndexPath, archivedFiles) {
    if (!fs.existsSync(tasksIndexPath) || archivedFiles.length === 0) return;

    let content = fs.readFileSync(tasksIndexPath, 'utf8');
    for (const file of archivedFiles) {
        const escaped = file.replace(/\./g, '\\.');
        content = content.replace(
            new RegExp(`\\(tasks/${escaped}\\)`, 'g'),
            `(archives/tasks/${file})`
        );
        content = content.split('\n').map(line => {
            if (line.includes(`(archives/tasks/${file})`)) {
                return line.replace(/`(Done|In Progress|Blocked|Todo)`/, '`Done (Archived)`');
            }
            return line;
        }).join('\n');
    }
    writeFileSafe(tasksIndexPath, content);
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Scans wsDir/tasks/ for completed phase-*.md files, moves them to
 * wsDir/archives/tasks/, and updates TASKS.md link references.
 *
 * Safe to call multiple times (idempotent: already-archived files are skipped).
 *
 * @param {string} wsDir - Absolute path to the workspace design directory.
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{
 *   archived: { file: string, phase: string, name: string }[],
 *   skipped: string[]
 * }}
 */
function archiveCompletedPhases(wsDir, opts = {}) {
    const dryRun = opts.dryRun || isDryRun();
    const tasksDir = path.join(wsDir, 'tasks');

    if (!fs.existsSync(tasksDir)) return { archived: [], skipped: [] };

    const archiveDir = path.join(wsDir, 'archives', 'tasks');
    const archived = [];
    const skipped = [];
    const candidates = findArchiveCandidates(wsDir);

    if (candidates.length === 0) return { archived: [], skipped: [] };

    mkdirSafe(archiveDir);

    for (const { file, phase, name } of candidates) {
        const srcPath = path.join(tasksDir, file);
        const destPath = path.join(archiveDir, file);

        if (fs.existsSync(destPath)) {
            skipped.push(file);
            continue;
        }

        if (dryRun) {
            console.log(`  🧪 [dry-run] would archive: tasks/${file} → archives/tasks/${file}`);
        } else {
            fs.renameSync(srcPath, destPath);
        }
        archived.push({ file, phase, name });
    }

    if (archived.length > 0) {
        const tasksIndexPath = path.join(wsDir, 'TASKS.md');
        if (!dryRun) {
            updateTasksIndex(tasksIndexPath, archived.map(a => a.file));
        } else {
            console.log(`  🧪 [dry-run] would update TASKS.md links for: ${archived.map(a => a.file).join(', ')}`);
        }
    }

    return { archived, skipped };
}

module.exports = { findArchiveCandidates, archiveCompletedPhases };
