#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileSafe, mkdirSafe } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT META UPDATER (C14.3 Extension — Idempotent)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates project metadata in .design/INDEX.md files.
 *
 * Idempotency contract (the reason this file was rewritten):
 *   The previous implementation bumped INDEX version, rewrote `Last Updated`,
 *   and appended a history row on **every** sync run — even when the index
 *   itself had not changed. That produced churn diffs and a flood of
 *   "Automated metadata update" rows in the history table.
 *
 *   Now: we hash the index content with the volatile fields stripped
 *   (Version line, Last Updated line, history rows) and store the digest in
 *   `.magic/.project-meta-state.json`. Bump and history append happen only
 *   when the structural digest actually changes.
 *
 * Environment variables:
 *   MAGIC_AUTHOR — Author name for history table entries (default: 'Agent').
 *   MAGIC_DRY_RUN — Honored via writeFileSafe (no physical writes).
 *
 * Flags:
 *   --workspace=<name> | --workspace <name>
 *   --message <msg> | -m <msg>
 *   --force   Bypass idempotency check (force bump + history row).
 */

const projectRoot = path.join(__dirname, '..', '..');
const magicDir = path.join(projectRoot, '.magic');
const designDir = path.join(projectRoot, '.design');
const globalIndexPath = path.join(designDir, 'INDEX.md');
const workspaceJsonPath = path.join(designDir, 'workspace.json');
const rulesPath = path.join(designDir, 'RULES.md');
const stateFile = path.join(designDir, '.cache', 'project-meta-state.json');

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ───────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let workspaceName = null;
let message = 'Automated metadata update';
let force = false;

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--workspace=')) {
        workspaceName = args[i].split('=')[1];
    } else if (args[i] === '--workspace' && args[i + 1]) {
        workspaceName = args[i + 1];
        i++;
    } else if ((args[i] === '--message' || args[i] === '-m') && args[i + 1]) {
        message = args[i + 1];
        i++;
    } else if (args[i] === '--force') {
        force = true;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Idempotency: structural digest
// ───────────────────────────────────────────────────────────────────────────

/**
 * Strips volatile fields from index content so structural changes
 * (workspaces, sections, body text) drive the digest, not version stamps.
 */
function structuralDigest(content) {
    const stripped = content
        .replace(/^\*\*Version:\*\*\s+\d+\.\d+\.\d+\s*$/m, '')
        .replace(/^[-\s]*\*\*Last Updated\*\*[:|][^\n]*$/m, '')
        // Drop everything after the "## Document History" heading — those
        // rows are produced by this script and must not feed the digest.
        .replace(/##\s+Document History[\s\S]*$/m, '')
        .replace(/\s+/g, ' ')
        .trim();
    return crypto.createHash('sha256').update(stripped).digest('hex');
}

function readState() {
    if (!fs.existsSync(stateFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
        return {};
    }
}

function writeState(state) {
    mkdirSafe(path.dirname(stateFile));
    writeFileSafe(stateFile, JSON.stringify(state, null, 2) + '\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function updateProjectMeta() {
    console.log('🔍 Updating project metadata...');

    const now = new Date().toISOString().split('T')[0];
    const state = readState();
    let stateMutated = false;

    // 1. Resolve workspace from env, args, or workspace.json
    if (!workspaceName && process.env.MAGIC_WORKSPACE) {
        workspaceName = process.env.MAGIC_WORKSPACE;
    }
    if (!workspaceName && fs.existsSync(workspaceJsonPath)) {
        try {
            const wsData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
            if (wsData.default) workspaceName = wsData.default;
        } catch (e) {
            console.error(`⚠️ Error reading workspace.json: ${e.message}`);
        }
    }

    // 2. Process global INDEX.md
    if (fs.existsSync(globalIndexPath)) {
        const changed = updateFileMeta(globalIndexPath, now, message, state, 'global');
        if (changed) stateMutated = true;
    } else {
        console.error('❌ Global INDEX.md not found.');
        process.exit(1);
    }

    // 3. Process workspace INDEX.md
    if (workspaceName) {
        const workspaceIndexPath = path.join(designDir, workspaceName, 'INDEX.md');
        if (fs.existsSync(workspaceIndexPath)) {
            const changed = updateFileMeta(workspaceIndexPath, now, message, state, `workspace:${workspaceName}`);
            if (changed) stateMutated = true;
        } else {
            console.warn(`⚠️ Workspace '${workspaceName}' INDEX.md not found at ${workspaceIndexPath}. Skipping.`);
        }
    }

    if (stateMutated) writeState(state);
}

/**
 * Idempotent update of a single index file.
 * Returns true when state was mutated (i.e., a real change occurred).
 */
function updateFileMeta(filePath, date, msg, state, key) {
    const original = fs.readFileSync(filePath, 'utf8');
    const digest = structuralDigest(original);
    const prevDigest = state[key]?.digest;

    if (!force && prevDigest === digest) {
        console.log(`  ⏭️  ${path.relative(projectRoot, filePath)} — no structural change, skipping bump`);
        return false;
    }

    let content = original;
    let newVersion = null;

    // Bump version (**Version:** X.Y.Z) — only when structural change detected
    const versionRegex = /\*\*Version:\*\* (\d+)\.(\d+)\.(\d+)/;
    const match = content.match(versionRegex);
    if (match) {
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        const patch = parseInt(match[3], 10) + 1;
        newVersion = `${major}.${minor}.${patch}`;
        content = content.replace(versionRegex, `**Version:** ${newVersion}`);
    }

    // Update Last Updated date
    const dateRegex = /- \*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/;
    if (content.match(dateRegex)) {
        content = content.replace(dateRegex, `- **Last Updated**: ${date}`);
    } else {
        const altDateRegex = /\*\*Last Updated\*\* \| \d{4}-\d{2}-\d{2}/;
        content = content.replace(altDateRegex, `**Last Updated** | ${date}`);
    }

    // Append history entry — with Smart-History dedup (mirrors update-engine-meta.js)
    content = appendHistoryRow(content, newVersion, date, msg);

    if (content !== original) {
        if (writeFileSafe(filePath, content)) {
            console.log(`  ✅ ${path.relative(projectRoot, filePath)} → v${newVersion || '?'}`);
        }
    }

    state[key] = { digest, version: newVersion, date };
    return true;
}

/**
 * Appends a row to the Document History table with dedup:
 * if the previous row has the same date+message, it is replaced
 * with a version range instead of inserting a duplicate.
 */
function appendHistoryRow(content, version, date, msg) {
    const author = process.env.MAGIC_AUTHOR || 'Agent';
    const v = version || '?.?.?';

    const fourColHeader = /\| Version \| Date \| Author \| Description \|\s*\n\| :--- \| :--- \| :--- \| :--- \|/;
    const threeColHeader = /\| Version \| Date \| Description \|\s*\n\| :--- \| :--- \| :--- \|/;

    const fourCol = content.match(fourColHeader);
    const threeCol = content.match(threeColHeader);

    if (!fourCol && !threeCol) return content;

    // Slice from the matched history-table header to end of file or next
    // `## ` section. Critical: this slice MUST start at the history header
    // — not at the file start — otherwise the "first divider in lines" scan
    // below would lock onto an earlier table (e.g. Workspaces).
    const headerStart = fourCol ? fourCol.index : threeCol.index;
    const tailFromHeader = content.slice(headerStart);
    const nextSection = tailFromHeader.search(/\n##\s/);
    const sliceLen = nextSection === -1 ? tailFromHeader.length : nextSection;
    const before = content.slice(0, headerStart);
    const tableSlice = content.slice(headerStart, headerStart + sliceLen);
    const after = content.slice(headerStart + sliceLen);

    const lines = tableSlice.split(/\r?\n/);

    // Within the history-table slice, lines[0] = header row, lines[1] =
    // divider, lines[2..] = data rows (newest-first by project convention).
    let dividerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(':---') && lines[i].trim().startsWith('|')) {
            dividerIdx = i;
            break;
        }
    }

    const newRow = fourCol
        ? `| ${v} | ${date} | ${author} | ${msg} |`
        : `| ${v} | ${date} | ${msg} |`;

    if (dividerIdx === -1) {
        // No divider in this slice — defensive append at end of slice
        lines.push(newRow);
        return before + lines.join('\n') + after;
    }

    // Newest row sits right after the divider (if any rows exist at all)
    const newestRowIdx = dividerIdx + 1;
    const newestRow = (lines[newestRowIdx] || '').trim();

    if (newestRow.startsWith('|')) {
        const cols = newestRow.split('|').map(c => c.trim()).filter(Boolean);
        const lastDate = cols[1];
        const lastMsg = fourCol ? cols[3] : cols[2];

        if (lastDate === date && lastMsg === msg) {
            // Smart-History dedup: same day + same message → condense range
            const startVersion = cols[0].split(' - ').shift().trim();   // keep oldest as range start
            const condensed = fourCol
                ? `| ${startVersion} - ${v} | ${date} | ${author} | ${msg} |`
                : `| ${startVersion} - ${v} | ${date} | ${msg} |`;
            lines[newestRowIdx] = condensed;
            return before + lines.join('\n') + after;
        }
    }

    // Insert as the new "newest" row, right after the divider
    lines.splice(newestRowIdx, 0, newRow);
    return before + lines.join('\n') + after;
}

// ───────────────────────────────────────────────────────────────────────────
// Hygiene Pass (MD012 Fix)
// ───────────────────────────────────────────────────────────────────────────

function runHygiene(targetFiles) {
    console.log('🧹 Running documentation hygiene (MD012)...');
    for (const file of targetFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const cleaned = content.replace(/\n{3,}/g, '\n\n');
            if (content !== cleaned && writeFileSafe(file, cleaned)) {
                console.log(`  ✨ Cleaned: ${path.relative(projectRoot, file)}`);
            }
        }
    }
}

// Execute
try {
    updateProjectMeta();

    const docsToClean = [
        path.join(projectRoot, 'CHANGELOG.md'),
        path.join(projectRoot, 'README.md'),
        path.join(projectRoot, 'CONTRIBUTING.md'),
        globalIndexPath,
        rulesPath,
    ];
    runHygiene(docsToClean);
} catch (error) {
    console.error(`❌ Metadata update failed: ${error.message}`);
    process.exit(1);
}
